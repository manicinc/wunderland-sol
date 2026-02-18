/**
 * Type definitions for IPC messages in Electron SQL Storage Adapter.
 *
 * Provides type-safe request/response patterns for IPC communication
 * between main and renderer processes.
 */

import type {
  StorageParameters,
  StorageRunResult,
  StorageOpenOptions,
  StorageCapability,
  BatchOperation,
  BatchResult,
} from '../../../core/contracts';

// ============================================================================
// Base Message Types
// ============================================================================

/**
 * Base request structure with correlation ID for request tracking.
 */
export interface IpcRequest<T = unknown> {
  /** Unique identifier for correlating request/response pairs */
  messageId: string;
  /** Request payload */
  payload: T;
  /** Timestamp when request was created */
  timestamp: number;
}

/**
 * Base response structure with success/error handling.
 */
export interface IpcResponse<T = unknown> {
  /** Correlation ID matching the request */
  messageId: string;
  /** Whether the operation succeeded */
  success: boolean;
  /** Response data (if successful) */
  data?: T;
  /** Error information (if failed) */
  error?: IpcError;
  /** Operation duration in milliseconds */
  duration?: number;
}

/**
 * Error structure for IPC responses.
 */
export interface IpcError {
  /** Error code for programmatic handling */
  code: string;
  /** Human-readable error message */
  message: string;
  /** Optional stack trace (development only) */
  stack?: string;
  /** Original error details */
  cause?: unknown;
}

// ============================================================================
// Database Operation Payloads
// ============================================================================

/**
 * Payload for run/get/all operations.
 */
export interface SqlOperationPayload {
  statement: string;
  parameters?: StorageParameters;
}

/**
 * Payload for exec operations.
 */
export interface ExecPayload {
  script: string;
}

/**
 * Payload for batch operations.
 */
export interface BatchPayload {
  operations: BatchOperation[];
}

/**
 * Payload for open operations.
 */
export interface OpenPayload {
  options?: StorageOpenOptions;
}

// ============================================================================
// Transaction Payloads
// ============================================================================

/**
 * Transaction context for multi-step transactions.
 */
export interface TransactionContext {
  /** Unique transaction ID */
  transactionId: string;
  /** Whether the transaction is active */
  active: boolean;
  /** Timestamp when transaction started */
  startedAt: number;
}

/**
 * Payload for transaction operations.
 */
export interface TransactionOperationPayload {
  transactionId: string;
  operation: SqlOperationPayload;
}

// ============================================================================
// Sync/Backup Payloads
// ============================================================================

/**
 * Sync status information.
 */
export interface SyncStatus {
  /** Whether sync is currently running */
  isSyncing: boolean;
  /** Last sync timestamp */
  lastSyncAt: number | null;
  /** Number of pending changes */
  pendingChanges: number;
  /** Connected device count */
  connectedDevices: number;
  /** Current sync progress (0-100) */
  progress?: number;
}

/**
 * Backup information.
 */
export interface BackupInfo {
  id: string;
  createdAt: number;
  size: number;
  provider: string;
  path?: string;
}

// ============================================================================
// Broadcast Event Payloads
// ============================================================================

/**
 * Database change notification payload.
 */
export interface DbChangeEvent {
  /** Type of change */
  type: 'insert' | 'update' | 'delete' | 'transaction';
  /** Affected table(s) */
  tables: string[];
  /** Number of affected rows */
  changes: number;
  /** Timestamp of change */
  timestamp: number;
  /** Source window ID (if applicable) */
  sourceWindowId?: number;
}

/**
 * Connection state change payload.
 */
export interface ConnectionStateEvent {
  /** New connection state */
  state: 'open' | 'closed' | 'error';
  /** Timestamp of state change */
  timestamp: number;
  /** Error details (if state is 'error') */
  error?: IpcError;
}

// ============================================================================
// Recovery/Migration Payloads
// ============================================================================

/**
 * Integrity check result.
 */
export interface IntegrityCheckResult {
  /** Whether the database is healthy */
  ok: boolean;
  /** List of issues found */
  issues: string[];
  /** Timestamp of check */
  checkedAt: number;
}

/**
 * WAL checkpoint result.
 */
export interface WalCheckpointResult {
  /** Number of frames checkpointed */
  framesCheckpointed: number;
  /** Total frames in WAL */
  totalFrames: number;
  /** Whether checkpoint was successful */
  success: boolean;
}

/**
 * Migration status.
 */
export interface MigrationStatus {
  /** Current database version */
  currentVersion: number;
  /** Latest available version */
  latestVersion: number;
  /** List of pending migrations */
  pending: string[];
  /** List of applied migrations */
  applied: string[];
}

// ============================================================================
// Type-Safe Request/Response Maps
// ============================================================================

/**
 * Map of channel to request payload types.
 */
export interface IpcRequestPayloads {
  'sql-storage:db:run': SqlOperationPayload;
  'sql-storage:db:get': SqlOperationPayload;
  'sql-storage:db:all': SqlOperationPayload;
  'sql-storage:db:exec': ExecPayload;
  'sql-storage:db:batch': BatchPayload;
  'sql-storage:db:open': OpenPayload;
  'sql-storage:db:close': void;
  'sql-storage:db:is-open': void;
  'sql-storage:db:capabilities': void;
  'sql-storage:transaction:begin': void;
  'sql-storage:transaction:commit': { transactionId: string };
  'sql-storage:transaction:rollback': { transactionId: string };
  'sql-storage:transaction:execute': TransactionOperationPayload;
  'sql-storage:sync:status': void;
  'sql-storage:sync:trigger': void;
  'sql-storage:backup:trigger': void;
  'sql-storage:backup:list': void;
  'sql-storage:backup:restore': { backupId: string };
  'sql-storage:recovery:check-integrity': void;
  'sql-storage:recovery:wal-checkpoint': void;
  'sql-storage:recovery:repair': void;
  'sql-storage:migration:run': void;
  'sql-storage:migration:status': void;
  'sql-storage:migration:rollback': void;
}

/**
 * Map of channel to response data types.
 */
export interface IpcResponseData {
  'sql-storage:db:run': StorageRunResult;
  'sql-storage:db:get': unknown;
  'sql-storage:db:all': unknown[];
  'sql-storage:db:exec': void;
  'sql-storage:db:batch': BatchResult;
  'sql-storage:db:open': void;
  'sql-storage:db:close': void;
  'sql-storage:db:is-open': boolean;
  'sql-storage:db:capabilities': StorageCapability[];
  'sql-storage:transaction:begin': TransactionContext;
  'sql-storage:transaction:commit': void;
  'sql-storage:transaction:rollback': void;
  'sql-storage:transaction:execute': StorageRunResult | unknown;
  'sql-storage:sync:status': SyncStatus;
  'sql-storage:sync:trigger': void;
  'sql-storage:backup:trigger': void;
  'sql-storage:backup:list': BackupInfo[];
  'sql-storage:backup:restore': void;
  'sql-storage:recovery:check-integrity': IntegrityCheckResult;
  'sql-storage:recovery:wal-checkpoint': WalCheckpointResult;
  'sql-storage:recovery:repair': void;
  'sql-storage:migration:run': void;
  'sql-storage:migration:status': MigrationStatus;
  'sql-storage:migration:rollback': void;
}

/**
 * Helper type for typed invoke calls.
 */
export type TypedIpcInvoke = <K extends keyof IpcRequestPayloads>(
  channel: K,
  payload: IpcRequestPayloads[K]
) => Promise<IpcResponseData[K]>;

/**
 * Helper type for typed handle registration.
 */
export type TypedIpcHandle = <K extends keyof IpcRequestPayloads>(
  channel: K,
  handler: (
    event: Electron.IpcMainInvokeEvent,
    request: IpcRequest<IpcRequestPayloads[K]>
  ) => Promise<IpcResponse<IpcResponseData[K]>>
) => void;
