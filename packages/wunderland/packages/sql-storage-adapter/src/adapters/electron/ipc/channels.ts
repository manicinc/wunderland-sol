/**
 * IPC Channel Constants for Electron SQL Storage Adapter.
 *
 * All IPC communication between main and renderer processes
 * uses these standardized channel names to ensure type safety
 * and prevent channel name collisions.
 *
 * Channel naming convention: `sql-storage:{category}:{action}`
 */

/**
 * Database operation channels.
 */
export const DB_CHANNELS = {
  /** Execute a mutation (INSERT/UPDATE/DELETE) */
  RUN: 'sql-storage:db:run',
  /** Get a single row */
  GET: 'sql-storage:db:get',
  /** Get all matching rows */
  ALL: 'sql-storage:db:all',
  /** Execute a SQL script */
  EXEC: 'sql-storage:db:exec',
  /** Execute batch operations */
  BATCH: 'sql-storage:db:batch',
  /** Open database connection */
  OPEN: 'sql-storage:db:open',
  /** Close database connection */
  CLOSE: 'sql-storage:db:close',
  /** Check if database is open */
  IS_OPEN: 'sql-storage:db:is-open',
  /** Get adapter capabilities */
  CAPABILITIES: 'sql-storage:db:capabilities',
} as const;

/**
 * Transaction channels.
 */
export const TRANSACTION_CHANNELS = {
  /** Begin a transaction */
  BEGIN: 'sql-storage:transaction:begin',
  /** Commit current transaction */
  COMMIT: 'sql-storage:transaction:commit',
  /** Rollback current transaction */
  ROLLBACK: 'sql-storage:transaction:rollback',
  /** Execute operation within transaction context */
  EXECUTE: 'sql-storage:transaction:execute',
} as const;

/**
 * Sync operation channels.
 */
export const SYNC_CHANNELS = {
  /** Get sync status */
  STATUS: 'sql-storage:sync:status',
  /** Trigger manual sync */
  TRIGGER: 'sql-storage:sync:trigger',
  /** Sync progress updates (main -> renderer) */
  PROGRESS: 'sql-storage:sync:progress',
  /** Sync completed (main -> renderer) */
  COMPLETE: 'sql-storage:sync:complete',
  /** Sync error (main -> renderer) */
  ERROR: 'sql-storage:sync:error',
} as const;

/**
 * Backup operation channels.
 */
export const BACKUP_CHANNELS = {
  /** Trigger cloud backup */
  TRIGGER: 'sql-storage:backup:trigger',
  /** Backup progress (main -> renderer) */
  PROGRESS: 'sql-storage:backup:progress',
  /** Backup completed (main -> renderer) */
  COMPLETE: 'sql-storage:backup:complete',
  /** Restore from backup */
  RESTORE: 'sql-storage:backup:restore',
  /** List available backups */
  LIST: 'sql-storage:backup:list',
} as const;

/**
 * Recovery operation channels.
 */
export const RECOVERY_CHANNELS = {
  /** Run integrity check */
  CHECK_INTEGRITY: 'sql-storage:recovery:check-integrity',
  /** Trigger WAL checkpoint */
  WAL_CHECKPOINT: 'sql-storage:recovery:wal-checkpoint',
  /** Repair database */
  REPAIR: 'sql-storage:recovery:repair',
} as const;

/**
 * Migration channels.
 */
export const MIGRATION_CHANNELS = {
  /** Run pending migrations */
  RUN: 'sql-storage:migration:run',
  /** Get migration status */
  STATUS: 'sql-storage:migration:status',
  /** Rollback last migration */
  ROLLBACK: 'sql-storage:migration:rollback',
} as const;

/**
 * Broadcast channels (main -> all renderers).
 */
export const BROADCAST_CHANNELS = {
  /** Database change notification */
  DB_CHANGE: 'sql-storage:broadcast:db-change',
  /** Connection state change */
  CONNECTION_STATE: 'sql-storage:broadcast:connection-state',
  /** Error notification */
  ERROR: 'sql-storage:broadcast:error',
} as const;

/**
 * All IPC channels grouped by category.
 */
export const IPC_CHANNELS = {
  db: DB_CHANNELS,
  transaction: TRANSACTION_CHANNELS,
  sync: SYNC_CHANNELS,
  backup: BACKUP_CHANNELS,
  recovery: RECOVERY_CHANNELS,
  migration: MIGRATION_CHANNELS,
  broadcast: BROADCAST_CHANNELS,
} as const;

/**
 * Union type of all channel values for type checking.
 */
export type IpcChannel =
  | (typeof DB_CHANNELS)[keyof typeof DB_CHANNELS]
  | (typeof TRANSACTION_CHANNELS)[keyof typeof TRANSACTION_CHANNELS]
  | (typeof SYNC_CHANNELS)[keyof typeof SYNC_CHANNELS]
  | (typeof BACKUP_CHANNELS)[keyof typeof BACKUP_CHANNELS]
  | (typeof RECOVERY_CHANNELS)[keyof typeof RECOVERY_CHANNELS]
  | (typeof MIGRATION_CHANNELS)[keyof typeof MIGRATION_CHANNELS]
  | (typeof BROADCAST_CHANNELS)[keyof typeof BROADCAST_CHANNELS];
