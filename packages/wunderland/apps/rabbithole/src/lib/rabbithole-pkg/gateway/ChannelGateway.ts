/**
 * @fileoverview Channel Gateway for RabbitHole
 * @module @framers/rabbithole/gateway/ChannelGateway
 *
 * Multi-tenant gateway for routing messages between external channels
 * and Wunderland agents.
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  IChannelAdapter,
  ChannelPlatform,
  InboundChannelMessage,
  OutboundChannelMessage,
  ChannelUserAction,
  DeliveryStatus,
} from '../channels/IChannelAdapter.js';
import type {
  TenantConfig,
  RoutingRule,
  RoutingConditions,
  GatewayMessage,
  GatewayResponse,
  GatewayEvent,
  GatewayEventType,
  GatewayEventHandler,
  GatewayStatistics,
  GatewayConfig,
} from './types.js';

/**
 * Message handler callback type.
 */
export type MessageHandler = (message: GatewayMessage) => Promise<void>;

/**
 * Action handler callback type.
 */
export type ActionHandler = (
  action: ChannelUserAction,
  tenantId: string
) => Promise<void>;

/**
 * Channel Gateway for multi-tenant message routing.
 *
 * The gateway:
 * - Manages multiple channel adapters across tenants
 * - Routes messages to appropriate agents based on rules
 * - Applies PII redaction before forwarding
 * - Handles responses back to channels
 * - Provides event hooks for monitoring
 *
 * @example
 * ```typescript
 * const gateway = new ChannelGateway({
 *   enablePIIRedaction: true,
 *   enableStatistics: true,
 * });
 *
 * // Register a tenant
 * gateway.registerTenant({
 *   tenantId: 'acme-corp',
 *   defaultAgentId: 'main-agent',
 *   isActive: true,
 * });
 *
 * // Register a channel adapter
 * const slack = new SlackAdapter({ ... });
 * gateway.registerAdapter('acme-corp', slack);
 *
 * // Handle routed messages
 * gateway.onMessage(async (msg) => {
 *   // Forward to agent
 *   const response = await agent.process(msg.processedContent);
 *   await gateway.sendResponse({
 *     inResponseTo: msg.messageId,
 *     tenantId: msg.tenantId,
 *     platform: msg.platform,
 *     channelId: msg.originalMessage.channelId,
 *     content: response,
 *   });
 * });
 *
 * // Start the gateway
 * await gateway.start();
 * ```
 */
export class ChannelGateway {
  private readonly config: GatewayConfig;
  private readonly gatewayId: string;

  // Adapter management
  private readonly adapters = new Map<string, IChannelAdapter>(); // key: tenantId:platform
  private readonly tenants = new Map<string, TenantConfig>();
  private readonly routingRules: RoutingRule[] = [];

  // Handlers
  private messageHandlers: MessageHandler[] = [];
  private actionHandlers: ActionHandler[] = [];
  private eventHandlers: GatewayEventHandler[] = [];

  // PII redactor (injected)
  private piiRedactor?: {
    redact: (content: string, context: { tenantId: string; userId?: string; channelId?: string }) =>
      Promise<{ maskedContent: string; containsPII: boolean; redactionId?: string; detections: unknown[] }>;
  };

  // Statistics
  private stats: GatewayStatistics;
  private startTime: Date;

  // Approval tracking
  private readonly pendingApprovals = new Map<string, {
    tenantId: string;
    platform: ChannelPlatform;
    channelId: string;
    messageId: string;
    requestedAt: Date;
  }>();

  constructor(config: GatewayConfig = {}) {
    this.config = {
      gatewayId: config.gatewayId ?? `gateway-${uuidv4().substring(0, 8)}`,
      enablePIIRedaction: config.enablePIIRedaction ?? false,
      enableEventLogging: config.enableEventLogging ?? false,
      enableStatistics: config.enableStatistics ?? true,
      maxQueueSize: config.maxQueueSize ?? 1000,
      processingTimeoutMs: config.processingTimeoutMs ?? 30000,
      ...config,
    };

    this.gatewayId = this.config.gatewayId!;
    this.startTime = new Date();

    // Initialize statistics
    this.stats = this.createEmptyStats();

    // Add default routing rules
    if (config.defaultRoutingRules) {
      this.routingRules.push(...config.defaultRoutingRules);
      this.sortRoutingRules();
    }
  }

  // ============================================================================
  // Tenant Management
  // ============================================================================

  /**
   * Registers a tenant with the gateway.
   */
  registerTenant(tenant: TenantConfig): void {
    this.tenants.set(tenant.tenantId, tenant);
    this.stats.registeredTenants = this.tenants.size;

    this.emitEvent('tenant_registered', {
      tenantId: tenant.tenantId,
      displayName: tenant.displayName,
    });
  }

  /**
   * Updates a tenant configuration.
   */
  updateTenant(tenantId: string, updates: Partial<TenantConfig>): boolean {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) return false;

    Object.assign(tenant, updates);
    return true;
  }

  /**
   * Removes a tenant and disconnects all its adapters.
   */
  async removeTenant(tenantId: string): Promise<boolean> {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) return false;

    // Disconnect all adapters for this tenant
    for (const [key, adapter] of this.adapters.entries()) {
      if (key.startsWith(`${tenantId}:`)) {
        await adapter.disconnect();
        this.adapters.delete(key);
      }
    }

    this.tenants.delete(tenantId);
    this.stats.registeredTenants = this.tenants.size;

    this.emitEvent('tenant_removed', { tenantId });
    return true;
  }

  /**
   * Gets a tenant configuration.
   */
  getTenant(tenantId: string): TenantConfig | undefined {
    return this.tenants.get(tenantId);
  }

  /**
   * Gets all registered tenants.
   */
  getAllTenants(): TenantConfig[] {
    return [...this.tenants.values()];
  }

  // ============================================================================
  // Adapter Management
  // ============================================================================

  /**
   * Registers a channel adapter for a tenant.
   */
  registerAdapter(tenantId: string, adapter: IChannelAdapter): void {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) {
      throw new Error(`Tenant ${tenantId} not found. Register tenant first.`);
    }

    const key = `${tenantId}:${adapter.platform}`;

    // Wire up message handling
    adapter.onMessage(async (message) => {
      await this.handleInboundMessage(tenantId, message);
    });

    adapter.onUserAction(async (action) => {
      await this.handleUserAction(tenantId, action);
    });

    adapter.onStatusChange?.((status) => {
      if (status === 'connected') {
        this.stats.connectedAdapters++;
        this.emitEvent('adapter_connected', { tenantId, platform: adapter.platform });
      } else if (status === 'disconnected' || status === 'error') {
        this.stats.connectedAdapters = Math.max(0, this.stats.connectedAdapters - 1);
        this.emitEvent('adapter_disconnected', { tenantId, platform: adapter.platform, status });
      }
    });

    adapter.onError?.((error) => {
      this.stats.errorCount++;
      this.emitEvent('error', { tenantId, platform: adapter.platform, error: error.message });
    });

    this.adapters.set(key, adapter);
  }

  /**
   * Gets an adapter for a tenant and platform.
   */
  getAdapter(tenantId: string, platform: ChannelPlatform): IChannelAdapter | undefined {
    return this.adapters.get(`${tenantId}:${platform}`);
  }

  /**
   * Gets all adapters for a tenant.
   */
  getAdaptersForTenant(tenantId: string): IChannelAdapter[] {
    const adapters: IChannelAdapter[] = [];
    for (const [key, adapter] of this.adapters.entries()) {
      if (key.startsWith(`${tenantId}:`)) {
        adapters.push(adapter);
      }
    }
    return adapters;
  }

  // ============================================================================
  // Routing Rules
  // ============================================================================

  /**
   * Adds a routing rule.
   */
  addRoutingRule(rule: RoutingRule): void {
    this.routingRules.push(rule);
    this.sortRoutingRules();
  }

  /**
   * Removes a routing rule.
   */
  removeRoutingRule(ruleId: string): boolean {
    const index = this.routingRules.findIndex((r) => r.ruleId === ruleId);
    if (index >= 0) {
      this.routingRules.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Gets all routing rules.
   */
  getRoutingRules(): readonly RoutingRule[] {
    return this.routingRules;
  }

  private sortRoutingRules(): void {
    this.routingRules.sort((a, b) => b.priority - a.priority);
  }

  // ============================================================================
  // Message Handling
  // ============================================================================

  /**
   * Handles an inbound message from a channel.
   */
  private async handleInboundMessage(
    tenantId: string,
    message: InboundChannelMessage
  ): Promise<void> {
    const tenant = this.tenants.get(tenantId);
    if (!tenant || !tenant.isActive) {
      return; // Silently drop messages for inactive tenants
    }

    this.stats.totalMessagesProcessed++;
    this.stats.messagesByPlatform[message.platform] =
      (this.stats.messagesByPlatform[message.platform] ?? 0) + 1;
    this.stats.messagesByTenant[tenantId] =
      (this.stats.messagesByTenant[tenantId] ?? 0) + 1;

    this.emitEvent('message_received', {
      tenantId,
      platform: message.platform,
      channelId: message.channelId,
      userId: message.userId,
    });

    // Apply PII redaction if enabled
    let processedContent = message.content;
    let piiInfo: GatewayMessage['piiRedaction'];

    if (this.config.enablePIIRedaction && tenant.piiRedaction?.enabled && this.piiRedactor) {
      try {
        const result = await this.piiRedactor.redact(message.content, {
          tenantId,
          userId: message.userId,
          channelId: message.channelId,
        });

        processedContent = result.maskedContent;
        piiInfo = {
          applied: true,
          redactedFields: result.detections.length,
          redactionId: result.redactionId,
        };
      } catch (error) {
        // Log but continue without redaction
        this.emitEvent('error', {
          tenantId,
          error: `PII redaction failed: ${error}`,
        });
      }
    }

    // Apply routing rules
    const matchedRule = this.matchRoutingRule(message);

    // Handle rejection
    if (matchedRule?.action.type === 'reject') {
      this.emitEvent('message_rejected', {
        tenantId,
        ruleId: matchedRule.ruleId,
        reason: matchedRule.action.rejectionMessage,
      });
      return;
    }

    // Determine target agent
    const targetAgentId =
      matchedRule?.action.agentId ??
      tenant.channelAgentMappings?.[message.channelId] ??
      tenant.defaultAgentId;

    // Build gateway message
    const gatewayMessage: GatewayMessage = {
      messageId: uuidv4(),
      tenantId,
      platform: message.platform,
      targetAgentId,
      originalMessage: message,
      processedContent,
      routing: {
        matchedRuleId: matchedRule?.ruleId,
        routingReason: matchedRule
          ? `Matched rule: ${matchedRule.description ?? matchedRule.ruleId}`
          : 'Default routing',
        timestamp: new Date(),
      },
      piiRedaction: piiInfo,
    };

    this.emitEvent('message_routed', {
      tenantId,
      messageId: gatewayMessage.messageId,
      targetAgentId,
      platform: message.platform,
    });

    // Dispatch to handlers
    for (const handler of this.messageHandlers) {
      try {
        await handler(gatewayMessage);
      } catch (error) {
        this.stats.errorCount++;
        this.emitEvent('error', {
          tenantId,
          error: `Message handler error: ${error}`,
        });
      }
    }
  }

  /**
   * Handles a user action (button click, etc.) from a channel.
   */
  private async handleUserAction(
    tenantId: string,
    action: ChannelUserAction
  ): Promise<void> {
    const tenant = this.tenants.get(tenantId);
    if (!tenant || !tenant.isActive) {
      return;
    }

    this.stats.totalActionsProcessed++;

    this.emitEvent('action_received', {
      tenantId,
      actionId: action.actionId,
      userId: action.userId,
    });

    // Check if this is an approval action
    const approvalInfo = this.parseApprovalAction(action.actionId);
    if (approvalInfo) {
      // Track for potential follow-up
      this.pendingApprovals.set(approvalInfo.requestId, {
        tenantId,
        platform: 'slack', // Would come from action context
        channelId: action.channelId,
        messageId: action.messageId,
        requestedAt: new Date(),
      });
    }

    // Dispatch to handlers
    for (const handler of this.actionHandlers) {
      try {
        await handler(action, tenantId);
      } catch (error) {
        this.stats.errorCount++;
        this.emitEvent('error', {
          tenantId,
          error: `Action handler error: ${error}`,
        });
      }
    }
  }

  /**
   * Matches a message against routing rules.
   */
  private matchRoutingRule(message: InboundChannelMessage): RoutingRule | undefined {
    for (const rule of this.routingRules) {
      if (!rule.enabled) continue;
      if (this.ruleMatches(rule.conditions, message)) {
        return rule;
      }
    }
    return undefined;
  }

  /**
   * Checks if a message matches routing conditions.
   */
  private ruleMatches(conditions: RoutingConditions, message: InboundChannelMessage): boolean {
    if (conditions.platform && conditions.platform !== message.platform) {
      return false;
    }

    if (conditions.channelPattern && !new RegExp(conditions.channelPattern).test(message.channelId)) {
      return false;
    }

    if (conditions.userPattern && !new RegExp(conditions.userPattern).test(message.userId)) {
      return false;
    }

    if (conditions.contentPattern && !new RegExp(conditions.contentPattern).test(message.content)) {
      return false;
    }

    if (conditions.botMentioned !== undefined && conditions.botMentioned !== message.botMentioned) {
      return false;
    }

    if (conditions.isDirectMessage !== undefined && conditions.isDirectMessage !== message.isDirectMessage) {
      return false;
    }

    return true;
  }

  /**
   * Parses an approval action ID.
   */
  private parseApprovalAction(actionId: string): { type: string; requestId: string } | null {
    if (actionId.startsWith('approve_')) {
      return { type: 'approve', requestId: actionId.replace('approve_', '') };
    }
    if (actionId.startsWith('reject_')) {
      return { type: 'reject', requestId: actionId.replace('reject_', '') };
    }
    if (actionId.startsWith('alternative_')) {
      const parts = actionId.split('_');
      if (parts.length >= 2) {
        return { type: 'alternative', requestId: parts[1] };
      }
    }
    return null;
  }

  // ============================================================================
  // Response Handling
  // ============================================================================

  /**
   * Sends a response back to a channel.
   */
  async sendResponse(response: GatewayResponse): Promise<DeliveryStatus> {
    const adapter = this.getAdapter(response.tenantId, response.platform);
    if (!adapter) {
      return {
        status: 'failed',
        error: `No adapter for tenant ${response.tenantId} platform ${response.platform}`,
        timestamp: new Date(),
      };
    }

    const outbound: OutboundChannelMessage = {
      channelId: response.channelId,
      threadId: response.threadId,
      content: response.content,
      interactiveElements: response.interactiveElements,
    };

    try {
      const result = await adapter.sendMessage(outbound);

      if (result.status === 'delivered') {
        this.stats.totalResponsesSent++;
        this.emitEvent('response_sent', {
          tenantId: response.tenantId,
          platform: response.platform,
          channelId: response.channelId,
          messageId: result.messageId,
        });
      }

      return result;
    } catch (error) {
      this.stats.errorCount++;
      return {
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date(),
      };
    }
  }

  /**
   * Sends a response to a specific channel (convenience method).
   */
  async sendToChannel(
    tenantId: string,
    platform: ChannelPlatform,
    channelId: string,
    content: string,
    options?: {
      threadId?: string;
      interactiveElements?: GatewayResponse['interactiveElements'];
    }
  ): Promise<DeliveryStatus> {
    return this.sendResponse({
      inResponseTo: '',
      tenantId,
      platform,
      channelId,
      content,
      threadId: options?.threadId,
      interactiveElements: options?.interactiveElements,
    });
  }

  // ============================================================================
  // Handler Registration
  // ============================================================================

  /**
   * Registers a message handler.
   */
  onMessage(handler: MessageHandler): void {
    this.messageHandlers.push(handler);
  }

  /**
   * Registers an action handler.
   */
  onAction(handler: ActionHandler): void {
    this.actionHandlers.push(handler);
  }

  /**
   * Registers an event handler.
   */
  onEvent(handler: GatewayEventHandler): void {
    this.eventHandlers.push(handler);
  }

  // ============================================================================
  // PII Redactor Integration
  // ============================================================================

  /**
   * Sets the PII redactor instance.
   */
  setPIIRedactor(redactor: typeof this.piiRedactor): void {
    this.piiRedactor = redactor;
  }

  // ============================================================================
  // Lifecycle
  // ============================================================================

  /**
   * Starts the gateway and connects all adapters.
   */
  async start(): Promise<void> {
    this.startTime = new Date();

    const connectPromises: Promise<void>[] = [];

    for (const adapter of this.adapters.values()) {
      connectPromises.push(
        adapter.connect().catch((error) => {
          this.stats.errorCount++;
          this.emitEvent('error', {
            platform: adapter.platform,
            tenantId: adapter.tenantId,
            error: `Failed to connect: ${error.message}`,
          });
        })
      );
    }

    await Promise.all(connectPromises);
  }

  /**
   * Stops the gateway and disconnects all adapters.
   */
  async stop(): Promise<void> {
    const disconnectPromises: Promise<void>[] = [];

    for (const adapter of this.adapters.values()) {
      disconnectPromises.push(
        adapter.disconnect().catch((error) => {
          console.error(`Failed to disconnect adapter: ${error}`);
        })
      );
    }

    await Promise.all(disconnectPromises);
  }

  // ============================================================================
  // Statistics & Events
  // ============================================================================

  /**
   * Gets gateway statistics.
   */
  getStatistics(): GatewayStatistics {
    return {
      ...this.stats,
      uptimeMs: Date.now() - this.startTime.getTime(),
    };
  }

  /**
   * Resets statistics.
   */
  resetStatistics(): void {
    const connectedAdapters = this.stats.connectedAdapters;
    const registeredTenants = this.stats.registeredTenants;

    this.stats = this.createEmptyStats();
    this.stats.connectedAdapters = connectedAdapters;
    this.stats.registeredTenants = registeredTenants;
  }

  private createEmptyStats(): GatewayStatistics {
    return {
      totalMessagesProcessed: 0,
      messagesByPlatform: {} as Record<ChannelPlatform, number>,
      messagesByTenant: {},
      totalActionsProcessed: 0,
      totalResponsesSent: 0,
      errorCount: 0,
      connectedAdapters: 0,
      registeredTenants: 0,
      uptimeMs: 0,
    };
  }

  private emitEvent(type: GatewayEventType, data: Record<string, unknown>): void {
    if (!this.config.enableEventLogging && this.eventHandlers.length === 0) {
      return;
    }

    const event: GatewayEvent = {
      type,
      timestamp: new Date(),
      tenantId: data.tenantId as string | undefined,
      platform: data.platform as ChannelPlatform | undefined,
      data,
    };

    if (this.config.enableEventLogging) {
      console.log(`[Gateway:${this.gatewayId}] ${type}:`, data);
    }

    for (const handler of this.eventHandlers) {
      try {
        const result = handler(event);
        if (result instanceof Promise) {
          result.catch((error) => {
            console.error(`Event handler error: ${error}`);
          });
        }
      } catch (error) {
        console.error(`Event handler error: ${error}`);
      }
    }
  }

  /**
   * Gets the gateway ID.
   */
  getGatewayId(): string {
    return this.gatewayId;
  }
}
