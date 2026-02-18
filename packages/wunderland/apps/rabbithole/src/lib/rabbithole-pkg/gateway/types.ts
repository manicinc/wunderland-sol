/**
 * @fileoverview Gateway types for RabbitHole
 * @module @framers/rabbithole/gateway/types
 */

import type {
  ChannelPlatform,
  InboundChannelMessage,
} from '../channels/IChannelAdapter.js';
export type { ChannelUserAction } from '../channels/IChannelAdapter.js';

// ============================================================================
// Tenant Configuration
// ============================================================================

/**
 * Tenant configuration for the gateway.
 */
export interface TenantConfig {
  /** Unique tenant identifier */
  tenantId: string;

  /** Project ID (optional subdivision of tenant) */
  projectId?: string;

  /** Display name for the tenant */
  displayName?: string;

  /** Default agent ID to route messages to */
  defaultAgentId: string;

  /** Channel-specific agent mappings */
  channelAgentMappings?: Record<string, string>;

  /** PII redaction settings */
  piiRedaction?: {
    enabled: boolean;
    redactPatterns?: string[];
    customPatterns?: Array<{ name: string; pattern: string }>;
  };

  /** Rate limits for this tenant */
  rateLimits?: {
    requestsPerMinute: number;
    tokensPerMinute?: number;
  };

  /** Whether this tenant is active */
  isActive: boolean;

  /** Tenant metadata */
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Routing Rules
// ============================================================================

/**
 * Routing rule for message dispatch.
 */
export interface RoutingRule {
  /** Rule identifier */
  ruleId: string;

  /** Rule priority (higher = checked first) */
  priority: number;

  /** Match conditions */
  conditions: RoutingConditions;

  /** Action to take when matched */
  action: RoutingAction;

  /** Whether rule is enabled */
  enabled: boolean;

  /** Rule description */
  description?: string;
}

/**
 * Conditions for matching messages.
 */
export interface RoutingConditions {
  /** Match specific platform */
  platform?: ChannelPlatform;

  /** Match channel ID pattern (regex) */
  channelPattern?: string;

  /** Match user ID pattern (regex) */
  userPattern?: string;

  /** Match message content pattern (regex) */
  contentPattern?: string;

  /** Match if bot is mentioned */
  botMentioned?: boolean;

  /** Match if direct message */
  isDirectMessage?: boolean;

  /** Custom condition function name */
  customCondition?: string;
}

/**
 * Action to take when a rule matches.
 */
export interface RoutingAction {
  /** Action type */
  type: 'route_to_agent' | 'route_to_queue' | 'reject' | 'transform' | 'broadcast';

  /** Target agent ID (for route_to_agent) */
  agentId?: string;

  /** Target queue ID (for route_to_queue) */
  queueId?: string;

  /** Rejection message (for reject) */
  rejectionMessage?: string;

  /** Transform function name (for transform) */
  transformFn?: string;

  /** Broadcast targets (for broadcast) */
  broadcastTargets?: string[];
}

// ============================================================================
// Gateway Messages
// ============================================================================

/**
 * Internal message format used by the gateway.
 */
export interface GatewayMessage {
  /** Unique message ID */
  messageId: string;

  /** Source tenant */
  tenantId: string;

  /** Source platform */
  platform: ChannelPlatform;

  /** Target agent ID */
  targetAgentId: string;

  /** Original inbound message */
  originalMessage: InboundChannelMessage;

  /** Processed content (after PII redaction, etc.) */
  processedContent: string;

  /** Routing metadata */
  routing: {
    matchedRuleId?: string;
    routingReason: string;
    timestamp: Date;
  };

  /** PII redaction info */
  piiRedaction?: {
    applied: boolean;
    redactedFields: number;
    redactionId?: string;
  };

  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Gateway response to be sent back to channel.
 */
export interface GatewayResponse {
  /** Original message ID this responds to */
  inResponseTo: string;

  /** Tenant ID */
  tenantId: string;

  /** Target platform */
  platform: ChannelPlatform;

  /** Target channel ID */
  channelId: string;

  /** Thread ID (for threaded replies) */
  threadId?: string;

  /** Response content */
  content: string;

  /** Interactive elements */
  interactiveElements?: Array<{
    type: 'button' | 'select';
    actionId: string;
    label: string;
    style?: 'primary' | 'danger' | 'secondary';
  }>;

  /** Response metadata */
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Gateway Events
// ============================================================================

/**
 * Event types emitted by the gateway.
 */
export type GatewayEventType =
  | 'message_received'
  | 'message_routed'
  | 'message_rejected'
  | 'action_received'
  | 'response_sent'
  | 'error'
  | 'tenant_registered'
  | 'tenant_removed'
  | 'adapter_connected'
  | 'adapter_disconnected';

/**
 * Gateway event payload.
 */
export interface GatewayEvent {
  /** Event type */
  type: GatewayEventType;

  /** Event timestamp */
  timestamp: Date;

  /** Tenant ID (if applicable) */
  tenantId?: string;

  /** Platform (if applicable) */
  platform?: ChannelPlatform;

  /** Event data */
  data: Record<string, unknown>;
}

/**
 * Gateway event handler.
 */
export type GatewayEventHandler = (event: GatewayEvent) => void | Promise<void>;

// ============================================================================
// Gateway Statistics
// ============================================================================

/**
 * Gateway statistics.
 */
export interface GatewayStatistics {
  /** Total messages processed */
  totalMessagesProcessed: number;

  /** Messages by platform */
  messagesByPlatform: Record<ChannelPlatform, number>;

  /** Messages by tenant */
  messagesByTenant: Record<string, number>;

  /** Total actions processed */
  totalActionsProcessed: number;

  /** Total responses sent */
  totalResponsesSent: number;

  /** Error count */
  errorCount: number;

  /** Connected adapters */
  connectedAdapters: number;

  /** Registered tenants */
  registeredTenants: number;

  /** Uptime in milliseconds */
  uptimeMs: number;
}

// ============================================================================
// Gateway Configuration
// ============================================================================

/**
 * Gateway configuration.
 */
export interface GatewayConfig {
  /** Gateway instance ID */
  gatewayId?: string;

  /** Default routing rules */
  defaultRoutingRules?: RoutingRule[];

  /** Enable PII redaction globally */
  enablePIIRedaction?: boolean;

  /** Enable event logging */
  enableEventLogging?: boolean;

  /** Max message queue size per tenant */
  maxQueueSize?: number;

  /** Message processing timeout (ms) */
  processingTimeoutMs?: number;

  /** Enable statistics collection */
  enableStatistics?: boolean;
}

// ============================================================================
// WebSocket Protocol Types
// ============================================================================

/** Current WebSocket protocol version */
export const WS_PROTOCOL_VERSION = 1;

/**
 * Base frame structure for WebSocket messages.
 */
export interface BaseFrame {
  /** Unique frame identifier */
  id?: string;
  /** Sequence number for ordering */
  seq?: number;
}

/**
 * Request frame sent from client to server.
 */
export interface RequestFrame extends BaseFrame {
  /** JSON-RPC style method name */
  method: string;
  /** Method parameters */
  params?: unknown;
}

/**
 * Response frame sent from server to client.
 */
export interface ResponseFrame extends BaseFrame {
  /** Request ID this response is for */
  id: string;
  /** Result payload (on success) */
  result?: unknown;
  /** Error payload (on failure) */
  error?: WsErrorShape;
}

/**
 * Event frame for server-initiated notifications.
 */
export interface EventFrame extends BaseFrame {
  /** Event type */
  event: string;
  /** Event payload */
  data?: unknown;
}

/** Standard WebSocket error codes */
export const WsErrorCodes = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
  UNAUTHORIZED: 4001,
  FORBIDDEN: 4003,
  NOT_FOUND: 4004,
  RATE_LIMITED: 4029,
  SESSION_EXPIRED: 4401,
} as const;

export type WsErrorCode = (typeof WsErrorCodes)[keyof typeof WsErrorCodes];

/**
 * WebSocket error shape.
 */
export interface WsErrorShape {
  code: WsErrorCode | number;
  message: string;
  data?: unknown;
}

/**
 * Connection parameters sent during handshake.
 */
export interface WsConnectParams {
  version: number;
  token?: string;
  clientId?: string;
  clientName?: string;
  platform?: string;
  resumeSessionId?: string;
}

/**
 * Successful hello response.
 */
export interface WsHelloOk {
  version: number;
  sessionId: string;
  serverTime: string;
  features?: string[];
  user?: { id: string; email?: string; name?: string };
}

/**
 * WebSocket server options.
 */
export interface WsServerOptions {
  port?: number;
  host?: string;
  path?: string;
  maxPayloadBytes?: number;
  heartbeatIntervalMs?: number;
  connectionTimeoutMs?: number;
  validateToken?: (token: string) => Promise<{ userId: string; email?: string; name?: string } | null>;
  onClientConnect?: (sessionId: string, userId: string | null) => void;
  onClientDisconnect?: (sessionId: string, code: number, reason: string) => void;
}

/**
 * WebSocket client options.
 */
export interface WsClientOptions {
  url: string;
  token?: string;
  clientId?: string;
  clientName?: string;
  autoReconnect?: boolean;
  maxReconnectAttempts?: number;
  reconnectBackoffMs?: number;
  requestTimeoutMs?: number;
  onConnect?: (hello: WsHelloOk) => void;
  onDisconnect?: (code: number, reason: string) => void;
  onError?: (error: Error) => void;
  onEvent?: (event: string, data: unknown) => void;
}

// WebSocket constants
export const WS_DEFAULT_PORT = 18789;
export const WS_DEFAULT_HEARTBEAT_MS = 30_000;
export const WS_DEFAULT_TIMEOUT_MS = 10_000;
export const WS_DEFAULT_REQUEST_TIMEOUT_MS = 30_000;
export const WS_DEFAULT_RECONNECT_BACKOFF_MS = 1_000;
export const WS_DEFAULT_MAX_RECONNECT_ATTEMPTS = 10;
export const WS_DEFAULT_MAX_PAYLOAD_BYTES = 1024 * 1024;

