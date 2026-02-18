/**
 * Electron Storage Adapter Module.
 *
 * Provides database access for Electron applications with:
 * - Main process adapter (owns the database connection)
 * - Renderer process adapter (IPC proxy to main)
 * - Preload script for secure IPC bridge
 * - WAL management and crash recovery
 * - Multi-window change broadcasting
 *
 * ## Quick Start
 *
 * ### Main Process (main.ts)
 * ```typescript
 * import { createElectronMainAdapter } from '@framers/sql-storage-adapter/electron';
 * import { app } from 'electron';
 * import path from 'path';
 *
 * const db = createElectronMainAdapter({
 *   filePath: path.join(app.getPath('userData'), 'app.db'),
 *   wal: { enabled: true },
 *   recovery: { checkOnOpen: true },
 * });
 *
 * app.whenReady().then(async () => {
 *   await db.open();
 *   // Database ready for use
 * });
 * ```
 *
 * ### BrowserWindow Configuration
 * ```typescript
 * new BrowserWindow({
 *   webPreferences: {
 *     preload: path.join(__dirname, 'preload.js'),
 *     contextIsolation: true,
 *     nodeIntegration: false,
 *   }
 * });
 * ```
 *
 * ### Preload Script (preload.ts)
 * ```typescript
 * // Just import the preload module - it auto-registers
 * import '@framers/sql-storage-adapter/electron/preload';
 * ```
 *
 * ### Renderer Process
 * ```typescript
 * import { createElectronRendererAdapter } from '@framers/sql-storage-adapter/electron';
 *
 * const db = createElectronRendererAdapter({
 *   onDatabaseChange: (change) => {
 *     console.log('Database changed:', change);
 *   },
 * });
 *
 * await db.open();
 * const users = await db.all('SELECT * FROM users');
 * ```
 *
 * @packageDocumentation
 */

// ============================================================================
// Main Process Exports
// ============================================================================

export {
  ElectronMainAdapter,
  createElectronMainAdapter,
  type ElectronMainAdapterOptions,
  type WalConfig,
  type RecoveryConfig,
  type MigrationConfig,
  type BackupConfig,
  type CloudBackupProvider,
  type MultiWindowConfig,
} from './electronMainAdapter';

// ============================================================================
// Renderer Process Exports
// ============================================================================

export {
  ElectronRendererAdapter,
  createElectronRendererAdapter,
  isElectronRenderer,
  isPreloadApiAvailable,
  type ElectronRendererAdapterOptions,
} from './electronRendererAdapter';

// ============================================================================
// Preload Script Exports
// ============================================================================

export {
  sqlStorageApi,
  type SqlStorageApi,
} from './preload';

// ============================================================================
// IPC Types & Channels
// ============================================================================

export {
  IPC_CHANNELS,
  DB_CHANNELS,
  TRANSACTION_CHANNELS,
  SYNC_CHANNELS,
  BACKUP_CHANNELS,
  RECOVERY_CHANNELS,
  MIGRATION_CHANNELS,
  BROADCAST_CHANNELS,
  type IpcChannel,
} from './ipc/channels';

export type {
  IpcRequest,
  IpcResponse,
  IpcError,
  SqlOperationPayload,
  ExecPayload,
  BatchPayload,
  OpenPayload,
  TransactionContext,
  TransactionOperationPayload,
  SyncStatus,
  BackupInfo,
  DbChangeEvent,
  ConnectionStateEvent,
  IntegrityCheckResult,
  WalCheckpointResult,
  MigrationStatus,
} from './ipc/types';

// ============================================================================
// Protocol (Main Process Only)
// ============================================================================

export {
  IpcProtocolManager,
  protocolManager,
  initializeIpcProtocol,
  disposeIpcProtocol,
} from './ipc/protocol';

// ============================================================================
// Recovery Module
// ============================================================================

export {
  WalCheckpointManager,
  createWalCheckpointManager,
  type WalCheckpointConfig,
  type CheckpointStrategy,
  type CheckpointResult,
  type WalStatus,
  CorruptionDetector,
  createCorruptionDetector,
  type CorruptionDetectorConfig,
  type IntegrityCheckLevel,
  type IntegrityCheckResult as RecoveryIntegrityCheckResult,
  type CorruptionIssue,
  type RepairStrategy,
  type RepairResult,
} from './recovery';

// ============================================================================
// Migration Module
// ============================================================================

export {
  AutoMigrator,
  createAutoMigrator,
  type AutoMigratorConfig,
  type MigrationFile,
  type AppliedMigration,
  type MigrationResult,
} from './migration';

// ============================================================================
// Window Management Module
// ============================================================================

export {
  WindowManager,
  createWindowManager,
  type WindowManagerConfig,
  type WindowManagerCallbacks,
  type RegisteredWindow,
} from './window';

// ============================================================================
// Re-export Core Types for Convenience
// ============================================================================

export type {
  StorageAdapter,
  StorageCapability,
  StorageOpenOptions,
  StorageParameters,
  StorageRunResult,
  BatchOperation,
  BatchResult,
} from '../../core/contracts';
