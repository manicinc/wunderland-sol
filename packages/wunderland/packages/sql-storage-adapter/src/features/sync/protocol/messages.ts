/**
 * Cross-Platform Sync Protocol Messages.
 *
 * Defines the message format for device-to-device synchronization.
 * Messages are exchanged over WebSocket or HTTP transport.
 *
 * @packageDocumentation
 */

import type { VectorClockData } from './vectorClock';

// ============================================================================
// Device Types
// ============================================================================

/**
 * Type of device in the sync network.
 */
export type DeviceType = 'electron' | 'capacitor' | 'browser' | 'server';

/**
 * Device information.
 */
export interface DeviceInfo {
  /** Unique device identifier */
  deviceId: string;
  /** Device type */
  deviceType: DeviceType;
  /** Human-readable device name */
  deviceName?: string;
  /** App version running on device */
  appVersion?: string;
  /** Platform info (e.g., "macOS 14.0", "iOS 17.0") */
  platform?: string;
  /** When device was first seen */
  firstSeen?: number;
  /** When device was last active */
  lastSeen?: number;
}

// ============================================================================
// Change Types
// ============================================================================

/**
 * Type of database operation.
 */
export type ChangeOperation = 'INSERT' | 'UPDATE' | 'DELETE';

/**
 * A single database change record.
 */
export interface ChangeRecord {
  /** Unique change ID (UUID) */
  changeId: string;
  /** Table name */
  table: string;
  /** Record primary key */
  recordId: string;
  /** Type of operation */
  operation: ChangeOperation;
  /** Vector clock at time of change */
  vectorClock: VectorClockData;
  /** Device that made the change */
  deviceId: string;
  /** Record data before change (for UPDATE/DELETE) */
  oldData?: Record<string, unknown>;
  /** Record data after change (for INSERT/UPDATE) */
  newData?: Record<string, unknown>;
  /** When change was made (local timestamp) */
  timestamp: number;
  /** Whether change has been synced */
  synced?: boolean;
}

/**
 * Batch of changes for efficient transfer.
 */
export interface ChangeBatch {
  /** Changes in this batch */
  changes: ChangeRecord[];
  /** Batch sequence number */
  sequence: number;
  /** Total batches in this sync */
  totalBatches: number;
  /** Compressed (gzip/brotli) if true */
  compressed?: boolean;
}

// ============================================================================
// Sync Status
// ============================================================================

/**
 * Current sync status.
 */
export type SyncStatus =
  | 'idle'
  | 'connecting'
  | 'handshaking'
  | 'syncing'
  | 'resolving'
  | 'error'
  | 'disconnected';

/**
 * Sync progress information.
 */
export interface SyncProgress {
  status: SyncStatus;
  /** Records pushed to remote */
  pushed: number;
  /** Records pulled from remote */
  pulled: number;
  /** Conflicts detected */
  conflicts: number;
  /** Current table being synced */
  currentTable?: string;
  /** Progress percentage (0-100) */
  percent: number;
}

// ============================================================================
// Message Types
// ============================================================================

/**
 * Base message structure.
 */
export interface BaseMessage {
  /** Message type discriminator */
  type: string;
  /** Unique message ID for acknowledgment */
  messageId: string;
  /** Sender device ID */
  deviceId: string;
  /** Message timestamp */
  timestamp: number;
}

/**
 * Handshake request - initiates connection.
 */
export interface HandshakeRequest extends BaseMessage {
  type: 'handshake_request';
  /** Sender device info */
  device: DeviceInfo;
  /** Current vector clock */
  vectorClock: VectorClockData;
  /** Supported protocol version */
  protocolVersion: number;
  /** Capabilities (e.g., compression, encryption) */
  capabilities: string[];
  /** Tables to sync */
  tables: string[];
}

/**
 * Handshake response - confirms connection.
 */
export interface HandshakeResponse extends BaseMessage {
  type: 'handshake_response';
  /** Whether handshake accepted */
  accepted: boolean;
  /** Rejection reason if not accepted */
  rejectionReason?: string;
  /** Server device info */
  device: DeviceInfo;
  /** Server's vector clock */
  vectorClock: VectorClockData;
  /** Negotiated protocol version */
  protocolVersion: number;
  /** Negotiated capabilities */
  capabilities: string[];
  /** Session ID for this connection */
  sessionId: string;
}

/**
 * Delta push - send local changes to remote.
 */
export interface DeltaPush extends BaseMessage {
  type: 'delta_push';
  /** Batch of changes */
  batch: ChangeBatch;
  /** Current vector clock after changes */
  vectorClock: VectorClockData;
}

/**
 * Delta pull request - request changes since clock.
 */
export interface DeltaPullRequest extends BaseMessage {
  type: 'delta_pull_request';
  /** Vector clock to sync from */
  sinceVectorClock: VectorClockData;
  /** Tables to pull */
  tables?: string[];
  /** Maximum records to return */
  limit?: number;
}

/**
 * Delta pull response - changes from remote.
 */
export interface DeltaPullResponse extends BaseMessage {
  type: 'delta_pull_response';
  /** Batch of changes */
  batch: ChangeBatch;
  /** Server's current vector clock */
  vectorClock: VectorClockData;
  /** Whether more changes available */
  hasMore: boolean;
}

/**
 * Acknowledgment message.
 */
export interface AckMessage extends BaseMessage {
  type: 'ack';
  /** ID of message being acknowledged */
  ackMessageId: string;
  /** Success status */
  success: boolean;
  /** Error message if failed */
  error?: string;
}

/**
 * Conflict notification.
 */
export interface ConflictMessage extends BaseMessage {
  type: 'conflict';
  /** Table with conflict */
  table: string;
  /** Record ID with conflict */
  recordId: string;
  /** Local version */
  localData: Record<string, unknown>;
  /** Remote version */
  remoteData: Record<string, unknown>;
  /** Local vector clock */
  localClock: VectorClockData;
  /** Remote vector clock */
  remoteClock: VectorClockData;
  /** Suggested resolution */
  suggestedResolution?: 'use_local' | 'use_remote' | 'merge';
}

/**
 * Conflict resolution.
 */
export interface ConflictResolution extends BaseMessage {
  type: 'conflict_resolution';
  /** Original conflict message ID */
  conflictMessageId: string;
  /** Resolution strategy */
  resolution: 'use_local' | 'use_remote' | 'use_merged' | 'keep_both' | 'defer';
  /** Merged data if using 'use_merged' */
  mergedData?: Record<string, unknown>;
}

/**
 * Device presence update.
 */
export interface PresenceMessage extends BaseMessage {
  type: 'presence';
  /** Presence status */
  status: 'online' | 'offline' | 'away' | 'syncing';
  /** Device info */
  device: DeviceInfo;
  /** Current vector clock */
  vectorClock?: VectorClockData;
}

/**
 * Heartbeat for connection keep-alive.
 */
export interface HeartbeatMessage extends BaseMessage {
  type: 'heartbeat';
  /** Sequence number */
  sequence: number;
}

/**
 * Heartbeat acknowledgment.
 */
export interface HeartbeatAck extends BaseMessage {
  type: 'heartbeat_ack';
  /** Echo sequence number */
  sequence: number;
  /** Round-trip time if measurable */
  rtt?: number;
}

/**
 * Error message.
 */
export interface ErrorMessage extends BaseMessage {
  type: 'error';
  /** Error code */
  code: string;
  /** Human-readable message */
  message: string;
  /** Whether error is recoverable */
  recoverable: boolean;
  /** Related message ID if applicable */
  relatedMessageId?: string;
}

// ============================================================================
// Union Types
// ============================================================================

/**
 * All possible sync messages.
 */
export type SyncMessage =
  | HandshakeRequest
  | HandshakeResponse
  | DeltaPush
  | DeltaPullRequest
  | DeltaPullResponse
  | AckMessage
  | ConflictMessage
  | ConflictResolution
  | PresenceMessage
  | HeartbeatMessage
  | HeartbeatAck
  | ErrorMessage;

/**
 * Message type discriminator values.
 */
export type SyncMessageType = SyncMessage['type'];

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Generate a unique message ID.
 */
export function generateMessageId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `msg_${timestamp}_${random}`;
}

/**
 * Create a base message with common fields.
 */
export function createBaseMessage(
  type: string,
  deviceId: string
): Omit<BaseMessage, 'type'> & { type: string } {
  return {
    type,
    messageId: generateMessageId(),
    deviceId,
    timestamp: Date.now(),
  };
}

/**
 * Create a handshake request message.
 */
export function createHandshakeRequest(
  device: DeviceInfo,
  vectorClock: VectorClockData,
  tables: string[],
  capabilities: string[] = ['gzip', 'delta']
): HandshakeRequest {
  return {
    ...createBaseMessage('handshake_request', device.deviceId),
    type: 'handshake_request',
    device,
    vectorClock,
    protocolVersion: 1,
    capabilities,
    tables,
  };
}

/**
 * Create an acknowledgment message.
 */
export function createAck(
  deviceId: string,
  ackMessageId: string,
  success: boolean,
  error?: string
): AckMessage {
  return {
    ...createBaseMessage('ack', deviceId),
    type: 'ack',
    ackMessageId,
    success,
    error,
  };
}

/**
 * Create a heartbeat message.
 */
export function createHeartbeat(
  deviceId: string,
  sequence: number
): HeartbeatMessage {
  return {
    ...createBaseMessage('heartbeat', deviceId),
    type: 'heartbeat',
    sequence,
  };
}

/**
 * Create an error message.
 */
export function createError(
  deviceId: string,
  code: string,
  message: string,
  recoverable: boolean = true,
  relatedMessageId?: string
): ErrorMessage {
  return {
    ...createBaseMessage('error', deviceId),
    type: 'error',
    code,
    message,
    recoverable,
    relatedMessageId,
  };
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if message is a handshake request.
 */
export function isHandshakeRequest(msg: SyncMessage): msg is HandshakeRequest {
  return msg.type === 'handshake_request';
}

/**
 * Check if message is a delta push.
 */
export function isDeltaPush(msg: SyncMessage): msg is DeltaPush {
  return msg.type === 'delta_push';
}

/**
 * Check if message is a conflict.
 */
export function isConflict(msg: SyncMessage): msg is ConflictMessage {
  return msg.type === 'conflict';
}

/**
 * Check if message is an error.
 */
export function isError(msg: SyncMessage): msg is ErrorMessage {
  return msg.type === 'error';
}

/**
 * Type guard to check if an unknown value is a valid SyncMessage.
 */
export function isSyncMessage(value: unknown): value is SyncMessage {
  if (!value || typeof value !== 'object') return false;
  const msg = value as Record<string, unknown>;
  if (typeof msg.type !== 'string') return false;
  if (typeof msg.messageId !== 'string') return false;
  if (typeof msg.deviceId !== 'string') return false;
  if (typeof msg.timestamp !== 'number') return false;

  const validTypes = [
    'handshake_request', 'handshake_response',
    'delta_push', 'delta_pull_request', 'delta_pull_response',
    'ack', 'conflict', 'conflict_resolution',
    'presence', 'heartbeat', 'heartbeat_ack', 'error',
  ];
  return validTypes.includes(msg.type);
}

/**
 * Create a delta push message.
 */
export function createDeltaPushMessage(
  deviceId: string,
  changes: ChangeRecord[],
  vectorClock: VectorClockData,
  sequence = 1,
  totalBatches = 1
): DeltaPush {
  return {
    ...createBaseMessage('delta_push', deviceId),
    type: 'delta_push',
    batch: {
      changes,
      sequence,
      totalBatches,
    },
    vectorClock,
  };
}

/**
 * Create a delta pull request message.
 */
export function createDeltaPullRequest(
  deviceId: string,
  sinceVectorClock: VectorClockData,
  tables?: string[],
  limit?: number
): DeltaPullRequest {
  return {
    ...createBaseMessage('delta_pull_request', deviceId),
    type: 'delta_pull_request',
    sinceVectorClock,
    tables,
    limit,
  };
}

/**
 * Create a presence message.
 */
export function createPresenceMessage(
  device: DeviceInfo,
  status: 'online' | 'offline' | 'away' | 'syncing',
  vectorClock?: VectorClockData
): PresenceMessage {
  return {
    ...createBaseMessage('presence', device.deviceId),
    type: 'presence',
    status,
    device,
    vectorClock,
  };
}

/**
 * Create a heartbeat message.
 */
export function createHeartbeatMessage(deviceId: string, sequence = 0): HeartbeatMessage {
  return {
    ...createBaseMessage('heartbeat', deviceId),
    type: 'heartbeat',
    sequence,
  };
}

/**
 * Create an ack message.
 */
export function createAckMessage(
  deviceId: string,
  ackMessageId: string,
  success = true,
  error?: string
): AckMessage {
  return {
    ...createBaseMessage('ack', deviceId),
    type: 'ack',
    ackMessageId,
    success,
    error,
  };
}

/**
 * Generate a unique change ID.
 */
export function generateChangeId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `chg_${timestamp}_${random}`;
}

/**
 * Create a change record.
 */
export function createChangeRecord(
  table: string,
  recordId: string,
  operation: ChangeOperation,
  deviceId: string,
  vectorClock: VectorClockData,
  newData?: Record<string, unknown>,
  oldData?: Record<string, unknown>
): ChangeRecord {
  return {
    changeId: generateChangeId(),
    table,
    recordId,
    operation,
    deviceId,
    vectorClock,
    newData,
    oldData,
    timestamp: Date.now(),
    synced: false,
  };
}
