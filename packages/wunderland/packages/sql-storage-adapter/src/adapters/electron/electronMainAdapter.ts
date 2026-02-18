/**
 * Electron Main Process Storage Adapter.
 *
 * Wraps BetterSqliteAdapter for use in Electron's main process.
 * Handles IPC communication, WAL management, crash recovery,
 * and multi-window coordination.
 *
 * ## Architecture
 * This adapter runs in the main process and owns the actual database connection.
 * Renderer processes communicate with it via IPC using ElectronRendererAdapter.
 *
 * ## Features
 * - WAL mode with configurable checkpointing
 * - Integrity checking and auto-repair
 * - Multi-window change broadcasting
 * - Cloud backup scheduling
 * - Auto-migration on app updates
 *
 * @example
 * ```typescript
 * import { createElectronMainAdapter } from '@framers/sql-storage-adapter/electron';
 * import { app } from 'electron';
 * import path from 'path';
 *
 * const db = await createElectronMainAdapter({
 *   filePath: path.join(app.getPath('userData'), 'app.db'),
 *   wal: { enabled: true, checkpointInterval: 300000 },
 *   recovery: { enabled: true, checkOnOpen: true },
 * });
 *
 * await db.open();
 * ```
 */

import path from 'path';
import { BrowserWindow, app } from 'electron';
import { BetterSqliteAdapter, createBetterSqliteAdapter } from '../betterSqliteAdapter';
import { initializeIpcProtocol, disposeIpcProtocol } from './ipc/protocol';
import { BROADCAST_CHANNELS } from './ipc/channels';
import type {
  StorageAdapter,
  StorageCapability,
  StorageOpenOptions,
  StorageParameters,
  StorageRunResult,
  BatchOperation,
  BatchResult,
  PreparedStatement,
} from '../../core/contracts';

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * WAL (Write-Ahead Logging) configuration.
 */
export interface WalConfig {
  /** Enable WAL mode (default: true) */
  enabled?: boolean;
  /** Checkpoint interval in milliseconds (default: 300000 = 5 minutes) */
  checkpointInterval?: number;
  /** Auto-checkpoint threshold in pages (default: 1000) */
  autoCheckpointPages?: number;
  /** Synchronous mode: OFF, NORMAL, FULL, EXTRA (default: NORMAL) */
  synchronous?: 'OFF' | 'NORMAL' | 'FULL' | 'EXTRA';
}

/**
 * Recovery and integrity check configuration.
 */
export interface RecoveryConfig {
  /** Enable recovery features (default: true) */
  enabled?: boolean;
  /** Run integrity check on open (default: true) */
  checkOnOpen?: boolean;
  /** Attempt auto-repair on corruption (default: true) */
  autoRepair?: boolean;
  /** Maximum time for integrity check in ms (default: 30000) */
  integrityCheckTimeout?: number;
}

/**
 * Auto-migration configuration.
 */
export interface MigrationConfig {
  /** Enable auto-migration (default: false) */
  enabled?: boolean;
  /** Path to migrations directory */
  migrationsPath?: string;
  /** Run migrations on app version change (default: true) */
  runOnVersionChange?: boolean;
}

/**
 * Cloud backup configuration.
 */
export interface BackupConfig {
  /** Enable cloud backups (default: false) */
  enabled?: boolean;
  /** Backup interval in milliseconds (default: 3600000 = 1 hour) */
  interval?: number;
  /** Maximum backups to keep (default: 7) */
  maxBackups?: number;
  /** Backup provider (implement your own) */
  provider?: CloudBackupProvider;
}

/**
 * Cloud backup provider interface.
 */
export interface CloudBackupProvider {
  upload(localPath: string, remotePath: string): Promise<void>;
  download(remotePath: string, localPath: string): Promise<void>;
  list(): Promise<{ path: string; createdAt: Date; size: number }[]>;
  delete(remotePath: string): Promise<void>;
}

/**
 * Multi-window coordination configuration.
 */
export interface MultiWindowConfig {
  /** Enable multi-window support (default: true) */
  enabled?: boolean;
  /** Broadcast changes to other windows (default: true) */
  broadcastChanges?: boolean;
}

/**
 * Full configuration for ElectronMainAdapter.
 */
export interface ElectronMainAdapterOptions {
  /** Path to SQLite database file */
  filePath: string;
  /** WAL configuration */
  wal?: WalConfig;
  /** Recovery configuration */
  recovery?: RecoveryConfig;
  /** Migration configuration */
  migration?: MigrationConfig;
  /** Backup configuration */
  backup?: BackupConfig;
  /** Multi-window configuration */
  multiWindow?: MultiWindowConfig;
  /** Enable verbose logging (default: false) */
  verbose?: boolean;
}

// ============================================================================
// Default Configurations
// ============================================================================

const DEFAULT_WAL_CONFIG: Required<WalConfig> = {
  enabled: true,
  checkpointInterval: 300000, // 5 minutes
  autoCheckpointPages: 1000,
  synchronous: 'NORMAL',
};

const DEFAULT_RECOVERY_CONFIG: Required<RecoveryConfig> = {
  enabled: true,
  checkOnOpen: true,
  autoRepair: true,
  integrityCheckTimeout: 30000,
};

const DEFAULT_MULTI_WINDOW_CONFIG: Required<MultiWindowConfig> = {
  enabled: true,
  broadcastChanges: true,
};

// ============================================================================
// Electron Main Adapter
// ============================================================================

/**
 * Electron Main Process Storage Adapter.
 *
 * This adapter is designed to run exclusively in Electron's main process.
 * It wraps BetterSqliteAdapter and adds Electron-specific features like
 * IPC handling, multi-window coordination, and crash recovery.
 */
export class ElectronMainAdapter implements StorageAdapter {
  public readonly kind = 'electron-main';
  public readonly capabilities: ReadonlySet<StorageCapability>;

  private innerAdapter: StorageAdapter;
  private isInitialized = false;
  private walCheckpointTimer: NodeJS.Timeout | null = null;
  private backupTimer: NodeJS.Timeout | null = null;

  private readonly options: ElectronMainAdapterOptions;
  private readonly walConfig: Required<WalConfig>;
  private readonly recoveryConfig: Required<RecoveryConfig>;
  private readonly multiWindowConfig: Required<MultiWindowConfig>;

  constructor(options: ElectronMainAdapterOptions) {
    this.options = options;

    // Merge configs with defaults
    this.walConfig = { ...DEFAULT_WAL_CONFIG, ...options.wal };
    this.recoveryConfig = { ...DEFAULT_RECOVERY_CONFIG, ...options.recovery };
    this.multiWindowConfig = { ...DEFAULT_MULTI_WINDOW_CONFIG, ...options.multiWindow };

    // Create inner adapter
    this.innerAdapter = createBetterSqliteAdapter(options.filePath);

    // Add electron-specific capabilities
    const baseCapabilities = new Set(this.innerAdapter.capabilities);
    baseCapabilities.add('batch');
    this.capabilities = baseCapabilities;
  }

  // ============================================================================
  // Lifecycle Methods
  // ============================================================================

  /**
   * Open the database and initialize all subsystems.
   */
  public async open(openOptions?: StorageOpenOptions): Promise<void> {
    if (this.isInitialized) {
      this.log('Already initialized, skipping open()');
      return;
    }

    try {
      // Open the underlying database
      await this.innerAdapter.open(openOptions);

      // Run integrity check if enabled
      if (this.recoveryConfig.enabled && this.recoveryConfig.checkOnOpen) {
        await this.runIntegrityCheck();
      }

      // Configure WAL mode
      if (this.walConfig.enabled) {
        await this.configureWalMode();
        this.startWalCheckpointTimer();
      }

      // Initialize IPC protocol for renderer communication
      initializeIpcProtocol(this);

      // Start backup scheduler if enabled
      if (this.options.backup?.enabled && this.options.backup.provider) {
        this.startBackupScheduler();
      }

      this.isInitialized = true;
      this.log('Electron Main Adapter initialized successfully');
    } catch (error) {
      this.log(`Failed to initialize: ${error}`);
      throw error;
    }
  }

  /**
   * Close the database and cleanup all subsystems.
   */
  public async close(): Promise<void> {
    if (!this.isInitialized) {
      return;
    }

    try {
      // Stop timers
      if (this.walCheckpointTimer) {
        clearInterval(this.walCheckpointTimer);
        this.walCheckpointTimer = null;
      }

      if (this.backupTimer) {
        clearInterval(this.backupTimer);
        this.backupTimer = null;
      }

      // Final WAL checkpoint before closing
      if (this.walConfig.enabled) {
        await this.runWalCheckpoint();
      }

      // Dispose IPC handlers
      disposeIpcProtocol();

      // Close inner adapter
      await this.innerAdapter.close();

      this.isInitialized = false;
      this.log('Electron Main Adapter closed');
    } catch (error) {
      this.log(`Error during close: ${error}`);
      throw error;
    }
  }

  // ============================================================================
  // Storage Adapter Interface
  // ============================================================================

  public async run(statement: string, parameters?: StorageParameters): Promise<StorageRunResult> {
    const result = await this.innerAdapter.run(statement, parameters);

    // Broadcast change to all windows
    if (this.multiWindowConfig.enabled && this.multiWindowConfig.broadcastChanges) {
      this.broadcastChange({
        type: this.detectMutationType(statement),
        tables: this.extractTables(statement),
        changes: result.changes,
        timestamp: Date.now(),
      });
    }

    return result;
  }

  public async get<T = unknown>(statement: string, parameters?: StorageParameters): Promise<T | null> {
    return this.innerAdapter.get<T>(statement, parameters);
  }

  public async all<T = unknown>(statement: string, parameters?: StorageParameters): Promise<T[]> {
    return this.innerAdapter.all<T>(statement, parameters);
  }

  public async exec(script: string): Promise<void> {
    await this.innerAdapter.exec(script);

    // Broadcast change for exec operations
    if (this.multiWindowConfig.enabled && this.multiWindowConfig.broadcastChanges) {
      this.broadcastChange({
        type: 'transaction',
        tables: [],
        changes: 0,
        timestamp: Date.now(),
      });
    }
  }

  public async transaction<T>(fn: (trx: StorageAdapter) => Promise<T>): Promise<T> {
    const result = await this.innerAdapter.transaction(fn);

    // Broadcast change after transaction
    if (this.multiWindowConfig.enabled && this.multiWindowConfig.broadcastChanges) {
      this.broadcastChange({
        type: 'transaction',
        tables: [],
        changes: 0,
        timestamp: Date.now(),
      });
    }

    return result;
  }

  public async batch(operations: BatchOperation[]): Promise<BatchResult> {
    if (!this.innerAdapter.batch) {
      throw new Error('Batch operations not supported');
    }

    const result = await this.innerAdapter.batch(operations);

    // Broadcast change
    if (this.multiWindowConfig.enabled && this.multiWindowConfig.broadcastChanges) {
      this.broadcastChange({
        type: 'transaction',
        tables: operations.flatMap(op => this.extractTables(op.statement)),
        changes: result.successful,
        timestamp: Date.now(),
      });
    }

    return result;
  }

  public prepare?<T = unknown>(statement: string): PreparedStatement<T> {
    if (!this.innerAdapter.prepare) {
      throw new Error('Prepared statements not supported');
    }
    return this.innerAdapter.prepare<T>(statement);
  }

  // ============================================================================
  // WAL Management
  // ============================================================================

  /**
   * Configure WAL mode on the database.
   */
  private async configureWalMode(): Promise<void> {
    await this.innerAdapter.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA synchronous = ${this.walConfig.synchronous};
      PRAGMA wal_autocheckpoint = ${this.walConfig.autoCheckpointPages};
    `);
    this.log('WAL mode configured');
  }

  /**
   * Start the WAL checkpoint timer.
   */
  private startWalCheckpointTimer(): void {
    if (this.walCheckpointTimer) {
      clearInterval(this.walCheckpointTimer);
    }

    this.walCheckpointTimer = setInterval(
      () => this.runWalCheckpoint().catch(err => this.log(`WAL checkpoint error: ${err}`)),
      this.walConfig.checkpointInterval
    );
  }

  /**
   * Run a WAL checkpoint.
   */
  public async runWalCheckpoint(): Promise<{ framesCheckpointed: number; totalFrames: number }> {
    const result = await this.innerAdapter.get<{
      busy: number;
      log: number;
      checkpointed: number;
    }>('PRAGMA wal_checkpoint(PASSIVE)');

    const checkpointResult = {
      framesCheckpointed: result?.checkpointed ?? 0,
      totalFrames: result?.log ?? 0,
    };

    this.log(`WAL checkpoint: ${checkpointResult.framesCheckpointed}/${checkpointResult.totalFrames} frames`);
    return checkpointResult;
  }

  // ============================================================================
  // Integrity Check & Recovery
  // ============================================================================

  /**
   * Run an integrity check on the database.
   */
  public async runIntegrityCheck(): Promise<{ ok: boolean; issues: string[] }> {
    const results = await this.innerAdapter.all<{ integrity_check: string }>('PRAGMA integrity_check');

    const issues = results
      .map(r => r.integrity_check)
      .filter(msg => msg !== 'ok');

    const ok = issues.length === 0;

    if (!ok) {
      this.log(`Integrity check found ${issues.length} issues`);
      if (this.recoveryConfig.autoRepair) {
        await this.attemptRepair();
      }
    } else {
      this.log('Integrity check passed');
    }

    return { ok, issues };
  }

  /**
   * Attempt to repair the database.
   */
  private async attemptRepair(): Promise<void> {
    this.log('Attempting database repair...');

    try {
      // Try VACUUM to rebuild the database
      await this.innerAdapter.exec('VACUUM');
      this.log('VACUUM completed successfully');
    } catch (error) {
      this.log(`Repair failed: ${error}`);
      throw new Error(`Database repair failed: ${error}`);
    }
  }

  // ============================================================================
  // Backup Management
  // ============================================================================

  /**
   * Start the backup scheduler.
   */
  private startBackupScheduler(): void {
    const interval = this.options.backup?.interval ?? 3600000;

    this.backupTimer = setInterval(
      () => this.runBackup().catch(err => this.log(`Backup error: ${err}`)),
      interval
    );
  }

  /**
   * Run a backup.
   */
  public async runBackup(): Promise<void> {
    if (!this.options.backup?.provider) {
      throw new Error('No backup provider configured');
    }

    const backupPath = `${this.options.filePath}.backup`;
    const remotePath = `backups/${path.basename(this.options.filePath)}_${Date.now()}.db`;

    // Create a backup using VACUUM INTO
    await this.innerAdapter.exec(`VACUUM INTO '${backupPath}'`);

    // Upload to cloud
    await this.options.backup.provider.upload(backupPath, remotePath);

    // Cleanup old backups
    await this.cleanupOldBackups();

    this.log(`Backup completed: ${remotePath}`);
  }

  /**
   * Cleanup old backups beyond the retention limit.
   */
  private async cleanupOldBackups(): Promise<void> {
    if (!this.options.backup?.provider) return;

    const maxBackups = this.options.backup.maxBackups ?? 7;
    const backups = await this.options.backup.provider.list();

    if (backups.length > maxBackups) {
      // Sort by date, oldest first
      backups.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

      // Delete oldest backups
      const toDelete = backups.slice(0, backups.length - maxBackups);
      for (const backup of toDelete) {
        await this.options.backup.provider.delete(backup.path);
        this.log(`Deleted old backup: ${backup.path}`);
      }
    }
  }

  // ============================================================================
  // Multi-Window Broadcasting
  // ============================================================================

  /**
   * Broadcast a database change to all windows.
   */
  private broadcastChange(change: {
    type: 'insert' | 'update' | 'delete' | 'transaction';
    tables: string[];
    changes: number;
    timestamp: number;
  }): void {
    const allWindows = BrowserWindow.getAllWindows();

    for (const win of allWindows) {
      if (!win.isDestroyed()) {
        win.webContents.send(BROADCAST_CHANNELS.DB_CHANGE, change);
      }
    }
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Detect mutation type from SQL statement.
   */
  private detectMutationType(statement: string): 'insert' | 'update' | 'delete' | 'transaction' {
    const upper = statement.trim().toUpperCase();
    if (upper.startsWith('INSERT')) return 'insert';
    if (upper.startsWith('UPDATE')) return 'update';
    if (upper.startsWith('DELETE')) return 'delete';
    return 'transaction';
  }

  /**
   * Extract table names from SQL statement.
   */
  private extractTables(statement: string): string[] {
    const tables: string[] = [];
    const patterns = [
      /FROM\s+([^\s,;(]+)/gi,
      /INSERT\s+INTO\s+([^\s(]+)/i,
      /UPDATE\s+([^\s]+)/i,
      /DELETE\s+FROM\s+([^\s]+)/i,
    ];

    for (const pattern of patterns) {
      const matches = statement.matchAll(pattern);
      for (const match of matches) {
        if (match[1]) {
          tables.push(match[1].toLowerCase().replace(/["`[\]]/g, ''));
        }
      }
    }

    return [...new Set(tables)];
  }

  /**
   * Log a message if verbose mode is enabled.
   */
  private log(message: string): void {
    if (this.options.verbose) {
      console.log(`[ElectronMainAdapter] ${message}`);
    }
  }

  // ============================================================================
  // Public Utilities
  // ============================================================================

  /**
   * Check if the adapter is initialized.
   */
  public isOpen(): boolean {
    return this.isInitialized;
  }

  /**
   * Get the database file path.
   */
  public getFilePath(): string {
    return this.options.filePath;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create an Electron Main Process Storage Adapter.
 *
 * @param options - Adapter configuration
 * @returns ElectronMainAdapter instance
 *
 * @example
 * ```typescript
 * const db = createElectronMainAdapter({
 *   filePath: path.join(app.getPath('userData'), 'app.db'),
 *   wal: { enabled: true },
 *   recovery: { checkOnOpen: true },
 * });
 *
 * await db.open();
 * ```
 */
export function createElectronMainAdapter(options: ElectronMainAdapterOptions): ElectronMainAdapter {
  return new ElectronMainAdapter(options);
}
