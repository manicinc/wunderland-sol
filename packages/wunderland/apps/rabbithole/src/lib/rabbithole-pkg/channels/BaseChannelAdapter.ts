/**
 * @fileoverview Base Channel Adapter with common functionality
 * @module @framers/rabbithole/channels/BaseChannelAdapter
 *
 * Abstract base class for channel adapters providing:
 * - Handler registration
 * - Status management
 * - Approval request formatting
 * - Reconnection logic
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  IChannelAdapter,
  ChannelPlatform,
  ChannelStatus,
  ChannelAdapterConfig,
  InboundChannelMessage,
  OutboundChannelMessage,
  ChannelUserAction,
  DeliveryStatus,
  ApprovalRequestConfig,
  ChannelInfo,
  MessageFormatting,
  InteractiveElement,
} from './IChannelAdapter.js';

/**
 * Abstract base class for channel adapters.
 *
 * Provides common functionality:
 * - Event handler registration
 * - Status management
 * - Approval request formatting
 * - Reconnection logic
 *
 * @example
 * ```typescript
 * class MyChannelAdapter extends BaseChannelAdapter {
 *   readonly platform = 'slack' as const;
 *
 *   async connect() {
 *     this.setStatus('connecting');
 *     // ... connect logic
 *     this.setStatus('connected');
 *   }
 *
 *   // ... implement other abstract methods
 * }
 * ```
 */
export abstract class BaseChannelAdapter implements IChannelAdapter {
  abstract readonly platform: ChannelPlatform;

  readonly adapterId: string;
  readonly tenantId: string;

  protected _status: ChannelStatus = 'disconnected';
  protected readonly config: ChannelAdapterConfig;
  protected readonly debug: boolean;

  protected messageHandlers: Array<(msg: InboundChannelMessage) => Promise<void>> = [];
  protected actionHandlers: Array<(action: ChannelUserAction) => Promise<void>> = [];
  protected statusHandlers: Array<(status: ChannelStatus) => void> = [];
  protected errorHandlers: Array<(error: Error) => void> = [];

  protected reconnectAttempts = 0;
  protected reconnectTimer?: ReturnType<typeof setTimeout>;

  get status(): ChannelStatus {
    return this._status;
  }

  constructor(config: ChannelAdapterConfig) {
    this.config = config;
    this.tenantId = config.tenantId;
    this.adapterId = `${config.platform}-${config.tenantId}-${uuidv4().substring(0, 8)}`;
    this.debug = config.debug ?? false;
  }

  // ============================================================================
  // Abstract Methods (must be implemented by subclasses)
  // ============================================================================

  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract sendMessage(message: OutboundChannelMessage): Promise<DeliveryStatus>;
  abstract updateMessage(
    channelId: string,
    messageId: string,
    content: string,
    formatting?: MessageFormatting
  ): Promise<void>;
  abstract deleteMessage(channelId: string, messageId: string): Promise<void>;
  abstract getChannelInfo(channelId: string): Promise<ChannelInfo>;

  // ============================================================================
  // Handler Registration
  // ============================================================================

  onMessage(handler: (message: InboundChannelMessage) => Promise<void>): void {
    this.messageHandlers.push(handler);
  }

  onUserAction(handler: (action: ChannelUserAction) => Promise<void>): void {
    this.actionHandlers.push(handler);
  }

  onStatusChange(handler: (status: ChannelStatus) => void): void {
    this.statusHandlers.push(handler);
  }

  onError(handler: (error: Error) => void): void {
    this.errorHandlers.push(handler);
  }

  // ============================================================================
  // Event Emission
  // ============================================================================

  protected async emitMessage(message: InboundChannelMessage): Promise<void> {
    if (this.debug) {
      this.log('Received message:', {
        platform: message.platform,
        userId: message.userId,
        content: message.content.substring(0, 100),
      });
    }

    for (const handler of this.messageHandlers) {
      try {
        await handler(message);
      } catch (error) {
        this.emitError(new Error(`Message handler error: ${error}`));
      }
    }
  }

  protected async emitAction(action: ChannelUserAction): Promise<void> {
    if (this.debug) {
      this.log('Received action:', {
        actionId: action.actionId,
        userId: action.userId,
        value: action.value,
      });
    }

    for (const handler of this.actionHandlers) {
      try {
        await handler(action);
      } catch (error) {
        this.emitError(new Error(`Action handler error: ${error}`));
      }
    }
  }

  protected setStatus(status: ChannelStatus): void {
    const previousStatus = this._status;
    this._status = status;

    if (status !== previousStatus) {
      if (this.debug) {
        this.log('Status changed:', { from: previousStatus, to: status });
      }

      for (const handler of this.statusHandlers) {
        try {
          handler(status);
        } catch (error) {
          console.error(`[${this.adapterId}] Status handler error:`, error);
        }
      }
    }
  }

  protected emitError(error: Error): void {
    if (this.debug) {
      console.error(`[${this.adapterId}] Error:`, error);
    }

    for (const handler of this.errorHandlers) {
      try {
        handler(error);
      } catch (err) {
        console.error(`[${this.adapterId}] Error handler error:`, err);
      }
    }
  }

  // ============================================================================
  // Approval Requests
  // ============================================================================

  async sendApprovalRequest(
    channelId: string,
    approval: ApprovalRequestConfig
  ): Promise<DeliveryStatus> {
    const severityEmoji = {
      critical: '🚨',
      high: '⚠️',
      medium: '📋',
      low: 'ℹ️',
    };

    const buttons = this.buildApprovalButtons(approval);
    const content = this.formatApprovalContent(approval, severityEmoji[approval.severity]);

    return this.sendMessage({
      channelId,
      content,
      interactiveElements: buttons,
    });
  }

  protected buildApprovalButtons(approval: ApprovalRequestConfig): InteractiveElement[] {
    const buttons: InteractiveElement[] = [
      {
        type: 'button',
        actionId: `approve_${approval.requestId}`,
        label: approval.approveLabel || 'Approve',
        style: 'primary',
      },
      {
        type: 'button',
        actionId: `reject_${approval.requestId}`,
        label: approval.rejectLabel || 'Reject',
        style: 'danger',
      },
    ];

    if (approval.alternatives) {
      for (const alt of approval.alternatives) {
        buttons.push({
          type: 'button',
          actionId: `alternative_${approval.requestId}_${alt.id}`,
          label: alt.label,
          style: 'secondary',
        });
      }
    }

    return buttons;
  }

  protected formatApprovalContent(approval: ApprovalRequestConfig, emoji: string): string {
    let content = `${emoji} **${approval.title}**\n\n${approval.description}`;

    if (approval.context && Object.keys(approval.context).length > 0) {
      content += '\n\n**Context:**';
      for (const [key, value] of Object.entries(approval.context)) {
        content += `\n• ${key}: ${typeof value === 'object' ? JSON.stringify(value) : value}`;
      }
    }

    if (approval.timeoutMs) {
      const timeoutMins = Math.round(approval.timeoutMs / 60000);
      content += `\n\n_Expires in ${timeoutMins} minutes_`;
    }

    return content;
  }

  // ============================================================================
  // Reconnection Logic
  // ============================================================================

  protected async attemptReconnect(): Promise<void> {
    if (!this.config.reconnection?.enabled) {
      return;
    }

    const maxAttempts = this.config.reconnection.maxAttempts ?? 5;
    const baseDelay = this.config.reconnection.baseDelayMs ?? 1000;

    if (this.reconnectAttempts >= maxAttempts) {
      this.setStatus('error');
      this.emitError(new Error(`Max reconnection attempts (${maxAttempts}) reached`));
      return;
    }

    this.setStatus('reconnecting');
    this.reconnectAttempts++;

    // Exponential backoff
    const delay = baseDelay * Math.pow(2, this.reconnectAttempts - 1);

    this.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${maxAttempts})`);

    this.reconnectTimer = setTimeout(async () => {
      try {
        await this.connect();
        this.reconnectAttempts = 0; // Reset on success
      } catch (error) {
        this.emitError(error instanceof Error ? error : new Error(String(error)));
        await this.attemptReconnect(); // Try again
      }
    }, delay);
  }

  protected cancelReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
    this.reconnectAttempts = 0;
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  protected log(message: string, data?: Record<string, unknown>): void {
    if (this.debug) {
      console.log(`[${this.adapterId}] ${message}`, data ?? '');
    }
  }

  protected createDeliveryStatus(
    status: DeliveryStatus['status'],
    messageId?: string,
    error?: string
  ): DeliveryStatus {
    return {
      status,
      messageId,
      error,
      timestamp: new Date(),
    };
  }

  /**
   * Parses action ID to extract request ID and action type.
   */
  protected parseActionId(actionId: string): {
    type: 'approve' | 'reject' | 'alternative';
    requestId: string;
    alternativeId?: string;
  } | null {
    if (actionId.startsWith('approve_')) {
      return {
        type: 'approve',
        requestId: actionId.replace('approve_', ''),
      };
    }

    if (actionId.startsWith('reject_')) {
      return {
        type: 'reject',
        requestId: actionId.replace('reject_', ''),
      };
    }

    if (actionId.startsWith('alternative_')) {
      const parts = actionId.replace('alternative_', '').split('_');
      if (parts.length >= 2) {
        return {
          type: 'alternative',
          requestId: parts[0],
          alternativeId: parts.slice(1).join('_'),
        };
      }
    }

    return null;
  }

  /**
   * Sanitizes content for the target platform.
   * Override in subclasses for platform-specific sanitization.
   */
  protected sanitizeContent(content: string): string {
    // Basic sanitization - remove potential control characters
    return content.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
  }

  /**
   * Truncates content to platform limits.
   * Override in subclasses for platform-specific limits.
   */
  protected truncateContent(content: string, maxLength: number): string {
    if (content.length <= maxLength) {
      return content;
    }
    return content.substring(0, maxLength - 3) + '...';
  }
}
