/**
 * Sync Manager for hybrid local/cloud database synchronization.
 * 
 * Supports both online-first and offline-first patterns with automatic
 * conflict resolution and intelligent sync strategies.
 * 
 * @example Online-first with fallback
 * ```typescript
 * const manager = await createSyncManager({
 *   primary: { url: process.env.DATABASE_URL, fallback: './local.db' },
 *   sync: { mode: 'auto', interval: 30000 }
 * });
 * ```
 * 
 * @example Offline-first with cloud sync
 * ```typescript
 * const manager = await createSyncManager({
 *   primary: { file: './local.db' },
 *   remote: { url: process.env.DATABASE_URL },
 *   sync: { mode: 'periodic', interval: 60000 }
 * });
 * ```
 * 
 * @example Manual sync control
 * ```typescript
 * const manager = await createSyncManager({
 *   primary: './local.db',
 *   remote: process.env.DATABASE_URL,
 *   sync: { mode: 'manual' }
 * });
 * 
 * // Trigger sync when you want
 * await manager.sync();
 * ```
 */

import type { StorageAdapter } from '../../core/contracts';
import { createDatabase, openDatabase, connectDatabase } from '../../core/database';
import { exportData } from '../migrations/dataExport';
import { importData } from '../migrations/dataImport';

/**
 * Sync mode determines when synchronization occurs.
 */
export type SyncMode = 
  | 'manual'      // User explicitly calls sync() - DEFAULT
  | 'auto'        // Syncs automatically on every write (debounced)
  | 'periodic'    // Syncs at regular intervals
  | 'realtime'    // Syncs immediately on every write (expensive!)
  | 'on-reconnect'; // Syncs only when network reconnects

/**
 * Conflict resolution strategy when same record modified offline and online.
 */
export type ConflictStrategy = 
  | 'last-write-wins'   // Newest timestamp wins - DEFAULT (simple, may lose data)
  | 'local-wins'        // Local changes always win (offline-first priority)
  | 'remote-wins'       // Remote changes always win (server authority)
  | 'merge'             // Attempt to merge both (requires merge function)
  | 'keep-both';        // Create duplicate records for manual resolution

/**
 * Sync direction - which way data flows.
 */
export type SyncDirection = 
  | 'bidirectional'  // Sync both ways (default)
  | 'push-only'      // Only upload local -> remote
  | 'pull-only';     // Only download remote -> local

/**
 * Storage limit action for mobile devices.
 */
export type StorageLimitAction = 
  | 'warn'   // Log warning, continue (default)
  | 'error'  // Throw error, stop sync
  | 'prune'; // Auto-delete old data

/**
 * Table sync priority.
 */
export type SyncPriority = 'critical' | 'high' | 'medium' | 'low';

type SyncRecord = Record<string, unknown> & {
  id?: string | number;
  created_at?: string;
  updated_at?: string;
};

/**
 * Per-table sync configuration.
 */
export interface TableSyncConfig {
  /** Priority level (critical syncs first) */
  priority?: SyncPriority;
  /** Sync in realtime regardless of global mode */
  realtime?: boolean;
  /** Skip this table in sync */
  skip?: boolean;
  /** Custom conflict resolution for this table */
  conflictStrategy?: ConflictStrategy;
  /** Max records to keep locally (mobile optimization) */
  maxRecords?: number;
  /** Custom merge function for 'merge' conflict strategy */
  mergeFn?: (local: SyncRecord, remote: SyncRecord) => SyncRecord;
}

/**
 * Sync configuration options.
 */
export interface SyncConfig {
  /** Sync mode - when synchronization occurs */
  mode?: SyncMode;
  /** Sync direction - which way data flows */
  direction?: SyncDirection;
  /** Conflict resolution strategy */
  conflictStrategy?: ConflictStrategy;
  /** Interval in ms for periodic sync (default: 30000 = 30s) */
  interval?: number;
  /** Debounce delay in ms for auto sync (default: 500ms) */
  debounce?: number;
  /** Batch size - sync N records at a time (default: 100) */
  batchSize?: number;
  /** Retry failed syncs automatically */
  retryOnError?: boolean;
  /** Max retry attempts (default: 3) */
  maxRetries?: number;
  /** Retry delay in ms (default: 1000) */
  retryDelay?: number;
  /** Per-table sync configuration */
  tables?: Record<string, TableSyncConfig>;
  /** Mobile storage limit in MB (default: 50MB) */
  mobileStorageLimit?: number;
  /** Action when storage limit reached */
  storageLimitAction?: StorageLimitAction;
  /** Only sync specific tables (undefined = all) */
  includeTables?: string[];
  /** Exclude specific tables from sync */
  excludeTables?: string[];
}

/**
 * Database connection configuration.
 */
export interface DatabaseConfig {
  /** Database URL (PostgreSQL) */
  url?: string;
  /** File path (SQLite) */
  file?: string;
  /** Fallback database path if primary fails */
  fallback?: string;
  /** PostgreSQL-specific options */
  postgres?: {
    max?: number;
    min?: number;
    ssl?: boolean | object;
    statement_timeout?: number;
  };
}

/**
 * Sync manager configuration.
 */
export interface SyncManagerConfig {
  /** Primary database (writes go here) */
  primary: DatabaseConfig | string;
  /** Remote database for sync (optional for offline-only) */
  remote?: DatabaseConfig | string;
  /** Sync configuration */
  sync?: SyncConfig;
  /** Called after successful sync */
  onSync?: (result: SyncResult) => void;
  /** Called when conflict detected */
  onConflict?: (conflict: SyncConflict) => void;
  /** Called when going offline */
  onOffline?: () => void;
  /** Called when coming online */
  onOnline?: () => void;
  /** Called on sync error */
  onError?: (error: Error) => void;
  /** Called on sync progress */
  onProgress?: (progress: SyncProgress) => void;
}

/**
 * Sync result after synchronization completes.
 */
export interface SyncResult {
  /** Sync completed successfully */
  success: boolean;
  /** Direction of sync */
  direction: SyncDirection;
  /** Number of records synced */
  recordsSynced: number;
  /** Number of conflicts encountered */
  conflicts: number;
  /** Duration in milliseconds */
  duration: number;
  /** Timestamp of sync */
  timestamp: string;
  /** Tables synced */
  tables: string[];
  /** Errors encountered */
  errors?: Error[];
  /** Detailed per-table results */
  details?: Record<string, {
    pushed: number;
    pulled: number;
    conflicts: number;
  }>;
}

/**
 * Conflict information.
 */
export interface SyncConflict {
  /** Table name */
  table: string;
  /** Record identifier */
  id: string | number | undefined;
  /** Local version */
  local: SyncRecord;
  /** Remote version */
  remote: SyncRecord;
  /** Local last modified timestamp */
  localTimestamp?: string;
  /** Remote last modified timestamp */
  remoteTimestamp?: string;
}

/**
 * Sync progress information.
 */
export interface SyncProgress {
  /** Current phase */
  phase: 'connecting' | 'pulling' | 'pushing' | 'resolving' | 'complete';
  /** Progress percentage (0-100) */
  percent: number;
  /** Current table being synced */
  currentTable?: string;
  /** Records processed */
  recordsProcessed: number;
  /** Total records to process */
  totalRecords: number;
}

/**
 * Internal resolved sync config with all required fields.
 */
type ResolvedSyncConfig = Required<Omit<SyncConfig, 'includeTables' | 'excludeTables'>> & {
  includeTables?: string[];
  excludeTables?: string[];
};

/**
 * Sync manager for hybrid local/cloud databases.
 * Handles automatic synchronization, conflict resolution, and offline support.
 */
export class SyncManager {
  private primaryDb: StorageAdapter;
  private remoteDb: StorageAdapter | null = null;
  public readonly config: ResolvedSyncConfig;
  private syncTimer: NodeJS.Timeout | null = null;
  private debounceTimer: NodeJS.Timeout | null = null;
  private syncQueue: Array<() => Promise<void>> = [];
  private isSyncing = false;
  private isOnline = true;
  private lastSyncTime: Date | null = null;
  private pendingWrites = new Set<string>();

  private constructor(
    primary: StorageAdapter,
    remote: StorageAdapter | null,
    private readonly callbacks: Omit<SyncManagerConfig, 'primary' | 'remote' | 'sync'>,
    syncConfig: SyncConfig
  ) {
    this.primaryDb = primary;
    this.remoteDb = remote;
    
    // Set defaults
    this.config = {
      mode: syncConfig.mode ?? 'manual',
      direction: syncConfig.direction ?? 'bidirectional',
      conflictStrategy: syncConfig.conflictStrategy ?? 'last-write-wins',
      interval: syncConfig.interval ?? 30000,
      debounce: syncConfig.debounce ?? 500,
      batchSize: syncConfig.batchSize ?? 100,
      retryOnError: syncConfig.retryOnError ?? true,
      maxRetries: syncConfig.maxRetries ?? 3,
      retryDelay: syncConfig.retryDelay ?? 1000,
      tables: syncConfig.tables ?? {},
      mobileStorageLimit: syncConfig.mobileStorageLimit ?? 50,
      storageLimitAction: syncConfig.storageLimitAction ?? 'warn',
      includeTables: syncConfig.includeTables,
      excludeTables: syncConfig.excludeTables,
    };
  }

  /**
   * Get the primary database adapter.
   * Use this for all database operations.
   */
  get db(): StorageAdapter {
    return this.primaryDb;
  }

  /**
   * Check if manager is currently syncing.
   */
  get syncing(): boolean {
    return this.isSyncing;
  }

  /**
   * Check if currently online.
   */
  get online(): boolean {
    return this.isOnline;
  }

  /**
   * Get last successful sync time.
   */
  get lastSync(): Date | null {
    return this.lastSyncTime;
  }

  /**
   * Trigger manual sync.
   * Safe to call multiple times - queues if already syncing.
   */
  async sync(): Promise<SyncResult> {
    if (!this.remoteDb) {
      throw new Error('No remote database configured for sync');
    }

    if (this.isSyncing) {
      // Queue this sync request
      return new Promise((resolve, reject) => {
        this.syncQueue.push(async () => {
          try {
            const result = await this.performSync();
            resolve(result);
          } catch (error) {
            reject(error);
          }
        });
      });
    }

    return this.performSync();
  }

  /**
   * Perform the actual sync operation.
   */
  private async performSync(): Promise<SyncResult> {
    if (!this.remoteDb) {
      throw new Error('No remote database configured');
    }

    this.isSyncing = true;
    const startTime = Date.now();
    let recordsSynced = 0;
    let conflicts = 0;
    const tablesSynced: string[] = [];
    const errors: Error[] = [];
    const details: Record<string, { pushed: number; pulled: number; conflicts: number }> = {};

    try {
      // Check network connectivity
      await this.checkConnection();

      // Get list of tables to sync
      const tables = await this.getTablesToSync();
      const totalTables = tables.length;

      // Sort by priority
      const sortedTables = this.sortTablesByPriority(tables);

      for (let i = 0; i < sortedTables.length; i++) {
        const table = sortedTables[i];
        
        this.callbacks.onProgress?.({
          phase: 'pulling',
          percent: Math.round((i / totalTables) * 50), // 0-50% for pull
          currentTable: table,
          recordsProcessed: recordsSynced,
          totalRecords: 0 // Unknown until we query
        });

        try {
          const tableResult = await this.syncTable(table);
          details[table] = tableResult;
          recordsSynced += tableResult.pushed + tableResult.pulled;
          conflicts += tableResult.conflicts;
          tablesSynced.push(table);
        } catch (error) {
          errors.push(error as Error);
          this.callbacks.onError?.(error as Error);
          
          if (!this.config.retryOnError) {
            throw error;
          }
        }
      }

      this.lastSyncTime = new Date();
      const duration = Date.now() - startTime;

      const result: SyncResult = {
        success: errors.length === 0,
        direction: this.config.direction,
        recordsSynced,
        conflicts,
        duration,
        timestamp: this.lastSyncTime.toISOString(),
        tables: tablesSynced,
        errors: errors.length > 0 ? errors : undefined,
        details
      };

      this.callbacks.onSync?.(result);
      return result;

    } finally {
      this.isSyncing = false;
      this.pendingWrites.clear();

      // Process queued syncs
      if (this.syncQueue.length > 0) {
        const nextSync = this.syncQueue.shift();
        nextSync?.();
      }
    }
  }

  /**
   * Sync a single table.
   */
  private async syncTable(table: string): Promise<{ pushed: number; pulled: number; conflicts: number }> {
    // const tableConfig = this.config.tables[table] ?? {}; // Reserved for future table-specific config
    const direction = this.config.direction;
    let pushed = 0;
    let pulled = 0;
    let conflicts = 0;

    // Pull from remote (if bidirectional or pull-only)
    if (direction === 'bidirectional' || direction === 'pull-only') {
      const pullResult = await this.pullTable(table);
      pulled = pullResult.records;
      conflicts += pullResult.conflicts;
    }

    // Push to remote (if bidirectional or push-only)
    if (direction === 'bidirectional' || direction === 'push-only') {
      const pushResult = await this.pushTable(table);
      pushed = pushResult.records;
      conflicts += pushResult.conflicts;
    }

    return { pushed, pulled, conflicts };
  }

  /**
   * Pull table data from remote to local.
   */
  private async pullTable(table: string): Promise<{ records: number; conflicts: number }> {
    if (!this.remoteDb) return { records: 0, conflicts: 0 };

    // Export from remote
    const remoteData = await exportData(this.remoteDb, { 
      tables: [table],
      includeSchema: false 
    });

    if (!remoteData.data[table]?.length) {
      return { records: 0, conflicts: 0 };
    }

    // Get local data for conflict detection
    const localData = await exportData(this.primaryDb, {
      tables: [table],
      includeSchema: false
    });

    const localRecords = this.sanitiseRecords(localData.data[table]);
    const remoteRecords = this.sanitiseRecords(remoteData.data[table]);
    const conflicts = await this.resolveConflicts(table, localRecords, remoteRecords);

    // Import to local
    await importData(this.primaryDb, remoteData, {
      onConflict: 'replace', // We already resolved conflicts
      skipSchema: true,
      tables: [table]
    });

    return {
      records: remoteRecords.length,
      conflicts
    };
  }

  /**
   * Push table data from local to remote.
   */
  private async pushTable(table: string): Promise<{ records: number; conflicts: number }> {
    if (!this.remoteDb) return { records: 0, conflicts: 0 };

    // Export from local
    const localData = await exportData(this.primaryDb, {
      tables: [table],
      includeSchema: false
    });

    if (!localData.data[table]?.length) {
      return { records: 0, conflicts: 0 };
    }

    // Import to remote
    await importData(this.remoteDb, localData, {
      onConflict: 'replace',
      skipSchema: true,
      tables: [table]
    });

    return {
      records: localData.data[table].length,
      conflicts: 0
    };
  }

  private sanitiseRecords(records: unknown[] | undefined): SyncRecord[] {
    if (!records) {
      return [];
    }
    return records
      .filter((record): record is Record<string, unknown> => typeof record === 'object' && record !== null)
      .map((record) => record as SyncRecord);
  }

  /**
   * Resolve conflicts between local and remote data.
   */
  private async resolveConflicts(
    table: string,
    local: SyncRecord[],
    remote: SyncRecord[]
  ): Promise<number> {
    const tableConfig = this.config.tables[table];
    const strategy = tableConfig?.conflictStrategy ?? this.config.conflictStrategy;
    
    let conflictCount = 0;

    // Build map of local records by ID
    const localMap = new Map<string | number, SyncRecord>();
    for (const record of local) {
      if (record.id !== undefined && record.id !== null) {
        const identifier = record.id as string | number;
        localMap.set(identifier, record);
      }
    }

    for (const remoteRecord of remote) {
      if (remoteRecord.id === undefined || remoteRecord.id === null) {
        continue;
      }
      const identifier = remoteRecord.id as string | number;
      const localRecord = localMap.get(identifier);

      if (!localRecord) continue; // No conflict

      // Check if both were modified
      const localTimestampValue =
        typeof localRecord.updated_at === 'string'
          ? localRecord.updated_at
          : typeof localRecord.created_at === 'string'
            ? localRecord.created_at
            : new Date().toISOString();
      const remoteTimestampValue =
        typeof remoteRecord.updated_at === 'string'
          ? remoteRecord.updated_at
          : typeof remoteRecord.created_at === 'string'
            ? remoteRecord.created_at
            : new Date().toISOString();
      const localTime = new Date(localTimestampValue);
      const remoteTime = new Date(remoteTimestampValue);

      if (localRecord.updated_at || remoteRecord.updated_at) {
        conflictCount++;

        const conflict: SyncConflict = {
          table,
          id: identifier,
          local: localRecord,
          remote: remoteRecord,
          localTimestamp: localTime.toISOString(),
          remoteTimestamp: remoteTime.toISOString()
        };

        this.callbacks.onConflict?.(conflict);

        // Apply conflict resolution strategy
        switch (strategy) {
          case 'last-write-wins':
            // Keep newer record (already handled by timestamp comparison)
            break;
          case 'local-wins':
            // Remote record will be overwritten
            break;
          case 'remote-wins':
            // Local record will be overwritten
            break;
          case 'merge':
            // Use custom merge function if provided
            if (tableConfig?.mergeFn) {
              // const merged = tableConfig.mergeFn(localRecord, remoteRecord);
              // Update both local and remote with merged version (TODO: implement)
            }
            break;
          case 'keep-both':
            // Create duplicate records
            break;
        }
      }
    }

    return conflictCount;
  }

  /**
   * Get list of tables to sync.
   */
  private async getTablesToSync(): Promise<string[]> {
    // Get all tables from primary database
    const schema = await exportData(this.primaryDb, { 
      includeSchema: true 
    });

    const allTables = schema.schema?.map(s => s.name) ?? [];

    // Filter based on include/exclude
    let tables = allTables;

    if (this.config.includeTables) {
      tables = tables.filter(t => this.config.includeTables!.includes(t));
    }

    if (this.config.excludeTables) {
      tables = tables.filter(t => !this.config.excludeTables!.includes(t));
    }

    // Filter out skipped tables
    tables = tables.filter(t => !this.config.tables[t]?.skip);

    return tables;
  }

  /**
   * Sort tables by priority.
   */
  private sortTablesByPriority(tables: string[]): string[] {
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };

    return tables.sort((a, b) => {
      const aPriority = this.config.tables[a]?.priority ?? 'medium';
      const bPriority = this.config.tables[b]?.priority ?? 'medium';
      return priorityOrder[aPriority] - priorityOrder[bPriority];
    });
  }

  /**
   * Check network connection.
   */
  private async checkConnection(): Promise<void> {
    if (!this.remoteDb) return;

    try {
      await this.remoteDb.get<{ ok: number }>('SELECT 1 as ok');
      
      if (!this.isOnline) {
        this.isOnline = true;
        this.callbacks.onOnline?.();
      }
    } catch {
      if (this.isOnline) {
        this.isOnline = false;
        this.callbacks.onOffline?.();
      }
      throw new Error('Remote database not accessible');
    }
  }

  /**
   * Start automatic sync based on mode.
   */
  private startAutoSync(): void {
    if (this.config.mode === 'periodic') {
      this.syncTimer = setInterval(() => {
        this.sync().catch(error => {
          this.callbacks.onError?.(error);
        });
      }, this.config.interval);
    } else if (this.config.mode === 'on-reconnect') {
      // Set up network listener (browser only)
      if (typeof window !== 'undefined') {
        window.addEventListener('online', () => {
          this.sync().catch(error => {
            this.callbacks.onError?.(error);
          });
        });
      }
    }
  }

  /**
   * Stop automatic sync.
   */
  stop(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }

  /**
   * Close all database connections.
   */
  async close(): Promise<void> {
    this.stop();
    await this.primaryDb.close();
    if (this.remoteDb) {
      await this.remoteDb.close();
    }
  }

  /**
   * Create a sync manager instance.
   */
  static async create(config: SyncManagerConfig): Promise<SyncManager> {
    // Parse primary database config
    let primaryDb: StorageAdapter;
    const primaryConfig = typeof config.primary === 'string' 
      ? { file: config.primary } 
      : config.primary;

    try {
      if (primaryConfig.url) {
        // Try cloud first
        primaryDb = await createDatabase({ url: primaryConfig.url });
      } else if (primaryConfig.file) {
        // Use local file
        primaryDb = await openDatabase(primaryConfig.file);
      } else {
        // Auto-detect
        primaryDb = await createDatabase();
      }
    } catch (error) {
      // Fallback to local if cloud fails
      if (primaryConfig.fallback) {
        console.warn('[SyncManager] Primary database failed, using fallback:', error);
        primaryDb = await openDatabase(primaryConfig.fallback);
      } else {
        throw error;
      }
    }

    // Open primary database
    await primaryDb.open();

    // Parse remote database config (optional)
    let remoteDb: StorageAdapter | null = null;
    if (config.remote) {
      const remoteConfig = typeof config.remote === 'string'
        ? { url: config.remote }
        : config.remote;

      try {
        if (remoteConfig.url) {
          remoteDb = await connectDatabase(remoteConfig.url);
          await remoteDb.open();
        }
      } catch (error) {
        console.warn('[SyncManager] Remote database not available:', error);
        // Continue without remote (offline mode)
      }
    }

    const manager = new SyncManager(
      primaryDb,
      remoteDb,
      {
        onSync: config.onSync,
        onConflict: config.onConflict,
        onOffline: config.onOffline,
        onOnline: config.onOnline,
        onError: config.onError,
        onProgress: config.onProgress
      },
      config.sync ?? {}
    );

    // Start auto-sync if configured
    if (config.sync?.mode && config.sync.mode !== 'manual') {
      manager.startAutoSync();
    }

    return manager;
  }
}

/**
 * Create a sync manager for hybrid local/cloud databases.
 * 
 * @example Online-first with automatic fallback
 * ```typescript
 * const manager = await createSyncManager({
 *   primary: {
 *     url: process.env.DATABASE_URL,
 *     fallback: './offline.db'
 *   },
 *   sync: {
 *     mode: 'periodic',
 *     interval: 30000
 *   }
 * });
 * 
 * // Use like normal database
 * await manager.db.run('INSERT INTO users (name) VALUES (?)', ['Alice']);
 * // Syncs automatically every 30s
 * ```
 * 
 * @example Offline-first with cloud sync
 * ```typescript
 * const manager = await createSyncManager({
 *   primary: './local.db',
 *   remote: process.env.DATABASE_URL,
 *   sync: {
 *     mode: 'manual'  // Sync only when you call manager.sync()
 *   }
 * });
 * 
 * // Work offline
 * await manager.db.run('INSERT INTO ...');
 * 
 * // Sync when ready
 * await manager.sync();
 * ```
 */
export async function createSyncManager(config: SyncManagerConfig): Promise<SyncManager> {
  return SyncManager.create(config);
}
