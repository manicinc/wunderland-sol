/**
 * Sync Log Manager - Tracks database changes for delta synchronization.
 *
 * Maintains a change log with vector clocks for each modification,
 * enabling efficient delta sync between devices.
 *
 * @example
 * ```typescript
 * const syncLog = new SyncLogManager(adapter, 'device-123');
 * await syncLog.initialize();
 *
 * // Log a change
 * await syncLog.logChange({
 *   table: 'users',
 *   recordId: 'user-1',
 *   operation: 'UPDATE',
 *   oldData: { name: 'Old' },
 *   newData: { name: 'New' },
 * });
 *
 * // Get changes since a clock
 * const changes = await syncLog.getChangesSince(remoteVectorClock);
 * ```
 */

import type { StorageAdapter } from '../../../core/contracts';
import type { VectorClockData } from '../protocol/vectorClock';
import { VectorClock, generateDeviceId } from '../protocol/vectorClock';
import type { ChangeRecord, ChangeOperation, DeviceInfo, DeviceType } from '../protocol/messages';

// ============================================================================
// Types
// ============================================================================

/**
 * Change log entry as stored in database.
 */
export interface ChangeLogEntry {
  logId: number;
  changeId: string;
  tableName: string;
  recordId: string;
  operation: ChangeOperation;
  vectorClock: string; // JSON serialized
  deviceId: string;
  oldData: string | null; // JSON serialized
  newData: string | null; // JSON serialized
  createdAt: number;
  syncedAt: number | null;
}

/**
 * Device registry entry.
 */
export interface DeviceEntry {
  deviceId: string;
  deviceType: DeviceType;
  deviceName: string | null;
  vectorClock: string; // JSON serialized
  lastSeenAt: number;
  createdAt: number;
}

/**
 * Conflict entry.
 */
export interface ConflictEntry {
  conflictId: string;
  tableName: string;
  recordId: string;
  localData: string; // JSON serialized
  remoteData: string; // JSON serialized
  localClock: string; // JSON serialized
  remoteClock: string; // JSON serialized
  status: 'pending' | 'resolved' | 'deferred';
  resolution: string | null;
  createdAt: number;
  resolvedAt: number | null;
}

/**
 * Sync log manager configuration.
 */
export interface SyncLogManagerConfig {
  /** Maximum log entries to keep (auto-prune) */
  maxLogEntries?: number;
  /** Auto-prune synced entries after N days */
  pruneSyncedAfterDays?: number;
  /** Tables to track (undefined = all) */
  includeTables?: string[];
  /** Tables to exclude from tracking */
  excludeTables?: string[];
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_CONFIG: Required<SyncLogManagerConfig> = {
  maxLogEntries: 10000,
  pruneSyncedAfterDays: 30,
  includeTables: [],
  excludeTables: ['_sync_log', '_sync_devices', '_sync_conflicts'],
};

// ============================================================================
// Sync Log Manager
// ============================================================================

/**
 * Manages the sync change log and device registry.
 */
export class SyncLogManager {
  private readonly config: Required<SyncLogManagerConfig>;
  private vectorClock: VectorClock;
  private isInitialized = false;

  constructor(
    private readonly adapter: StorageAdapter,
    private readonly deviceId: string = generateDeviceId(),
    config: SyncLogManagerConfig = {}
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.vectorClock = new VectorClock(deviceId);
  }

  // ============================================================================
  // Initialization
  // ============================================================================

  /**
   * Initialize sync tables.
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    await this.createSyncTables();
    await this.loadVectorClock();

    this.isInitialized = true;
  }

  /**
   * Create sync tracking tables.
   */
  private async createSyncTables(): Promise<void> {
    // Change log table
    await this.adapter.exec(`
      CREATE TABLE IF NOT EXISTS _sync_log (
        log_id INTEGER PRIMARY KEY AUTOINCREMENT,
        change_id TEXT NOT NULL UNIQUE,
        table_name TEXT NOT NULL,
        record_id TEXT NOT NULL,
        operation TEXT NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
        vector_clock TEXT NOT NULL,
        device_id TEXT NOT NULL,
        old_data TEXT,
        new_data TEXT,
        created_at INTEGER NOT NULL,
        synced_at INTEGER
      )
    `);

    // Indexes for efficient queries
    await this.adapter.exec(`
      CREATE INDEX IF NOT EXISTS idx_sync_log_table ON _sync_log(table_name)
    `);
    await this.adapter.exec(`
      CREATE INDEX IF NOT EXISTS idx_sync_log_synced ON _sync_log(synced_at)
    `);
    await this.adapter.exec(`
      CREATE INDEX IF NOT EXISTS idx_sync_log_device ON _sync_log(device_id)
    `);

    // Device registry table
    await this.adapter.exec(`
      CREATE TABLE IF NOT EXISTS _sync_devices (
        device_id TEXT PRIMARY KEY,
        device_type TEXT NOT NULL,
        device_name TEXT,
        vector_clock TEXT NOT NULL,
        last_seen_at INTEGER NOT NULL,
        created_at INTEGER NOT NULL
      )
    `);

    // Conflicts table
    await this.adapter.exec(`
      CREATE TABLE IF NOT EXISTS _sync_conflicts (
        conflict_id TEXT PRIMARY KEY,
        table_name TEXT NOT NULL,
        record_id TEXT NOT NULL,
        local_data TEXT NOT NULL,
        remote_data TEXT NOT NULL,
        local_clock TEXT NOT NULL,
        remote_clock TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'deferred')),
        resolution TEXT,
        created_at INTEGER NOT NULL,
        resolved_at INTEGER
      )
    `);

    await this.adapter.exec(`
      CREATE INDEX IF NOT EXISTS idx_sync_conflicts_status ON _sync_conflicts(status)
    `);
  }

  /**
   * Load vector clock from database or create new one.
   */
  private async loadVectorClock(): Promise<void> {
    const device = await this.adapter.get<DeviceEntry>(
      'SELECT * FROM _sync_devices WHERE device_id = ?',
      [this.deviceId]
    );

    if (device) {
      const clockData = JSON.parse(device.vectorClock) as VectorClockData;
      this.vectorClock = new VectorClock(this.deviceId);
      this.vectorClock.observe(clockData);
    } else {
      // Register this device
      await this.registerDevice({
        deviceId: this.deviceId,
        deviceType: this.detectDeviceType(),
        deviceName: this.getDeviceName(),
      });
    }
  }

  // ============================================================================
  // Change Logging
  // ============================================================================

  /**
   * Log a database change.
   */
  public async logChange(change: {
    table: string;
    recordId: string;
    operation: ChangeOperation;
    oldData?: Record<string, unknown>;
    newData?: Record<string, unknown>;
  }): Promise<ChangeRecord> {
    // Check if table should be tracked
    if (!this.shouldTrackTable(change.table)) {
      throw new Error(`Table ${change.table} is not tracked`);
    }

    // Increment vector clock
    this.vectorClock.tick();

    const changeId = this.generateChangeId();
    const clockData = this.vectorClock.getValues();

    const record: ChangeRecord = {
      changeId,
      table: change.table,
      recordId: change.recordId,
      operation: change.operation,
      vectorClock: clockData,
      deviceId: this.deviceId,
      oldData: change.oldData,
      newData: change.newData,
      timestamp: Date.now(),
    };

    // Insert into log
    await this.adapter.run(
      `INSERT INTO _sync_log
       (change_id, table_name, record_id, operation, vector_clock, device_id, old_data, new_data, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        changeId,
        change.table,
        change.recordId,
        change.operation,
        JSON.stringify(clockData),
        this.deviceId,
        change.oldData ? JSON.stringify(change.oldData) : null,
        change.newData ? JSON.stringify(change.newData) : null,
        Date.now(),
      ]
    );

    // Update device's vector clock
    await this.updateDeviceClock();

    // Auto-prune if needed
    await this.pruneIfNeeded();

    return record;
  }

  /**
   * Get changes since a vector clock.
   */
  public async getChangesSince(
    sinceClock: VectorClockData,
    options: { tables?: string[]; limit?: number } = {}
  ): Promise<ChangeRecord[]> {
    const { tables, limit = 1000 } = options;

    let query = `
      SELECT * FROM _sync_log
      WHERE synced_at IS NULL
    `;
    const params: unknown[] = [];

    if (tables && tables.length > 0) {
      query += ` AND table_name IN (${tables.map(() => '?').join(', ')})`;
      params.push(...tables);
    }

    query += ` ORDER BY log_id ASC LIMIT ?`;
    params.push(limit);

    const entries = await this.adapter.all<ChangeLogEntry>(query, params);

    // Filter by vector clock comparison
    const changes: ChangeRecord[] = [];
    for (const entry of entries) {
      const entryClock = JSON.parse(entry.vectorClock) as VectorClockData;

      // Include if entry's clock is after the since clock
      if (this.isClockAfter(entryClock, sinceClock)) {
        changes.push({
          changeId: entry.changeId,
          table: entry.tableName,
          recordId: entry.recordId,
          operation: entry.operation as ChangeOperation,
          vectorClock: entryClock,
          deviceId: entry.deviceId,
          oldData: entry.oldData ? JSON.parse(entry.oldData) : undefined,
          newData: entry.newData ? JSON.parse(entry.newData) : undefined,
          timestamp: entry.createdAt,
        });
      }
    }

    return changes;
  }

  /**
   * Mark changes as synced.
   */
  public async markSynced(changeIds: string[]): Promise<void> {
    if (changeIds.length === 0) return;

    const placeholders = changeIds.map(() => '?').join(', ');
    await this.adapter.run(
      `UPDATE _sync_log SET synced_at = ? WHERE change_id IN (${placeholders})`,
      [Date.now(), ...changeIds]
    );
  }

  /**
   * Get unsynced change count.
   */
  public async getUnsyncedCount(): Promise<number> {
    const result = await this.adapter.get<{ count: number }>(
      'SELECT COUNT(*) as count FROM _sync_log WHERE synced_at IS NULL'
    );
    return result?.count ?? 0;
  }

  // ============================================================================
  // Device Registry
  // ============================================================================

  /**
   * Register a device.
   */
  public async registerDevice(device: DeviceInfo): Promise<void> {
    const existing = await this.adapter.get<DeviceEntry>(
      'SELECT * FROM _sync_devices WHERE device_id = ?',
      [device.deviceId]
    );

    const clockData = this.vectorClock.getValues();
    const now = Date.now();

    if (existing) {
      await this.adapter.run(
        `UPDATE _sync_devices
         SET device_type = ?, device_name = ?, vector_clock = ?, last_seen_at = ?
         WHERE device_id = ?`,
        [device.deviceType, device.deviceName ?? null, JSON.stringify(clockData), now, device.deviceId]
      );
    } else {
      await this.adapter.run(
        `INSERT INTO _sync_devices (device_id, device_type, device_name, vector_clock, last_seen_at, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [device.deviceId, device.deviceType, device.deviceName ?? null, JSON.stringify(clockData), now, now]
      );
    }
  }

  /**
   * Get all registered devices.
   */
  public async getDevices(): Promise<DeviceInfo[]> {
    const entries = await this.adapter.all<DeviceEntry>(
      'SELECT * FROM _sync_devices ORDER BY last_seen_at DESC'
    );

    return entries.map(entry => ({
      deviceId: entry.deviceId,
      deviceType: entry.deviceType as DeviceType,
      deviceName: entry.deviceName ?? undefined,
      lastSeen: entry.lastSeenAt,
      firstSeen: entry.createdAt,
    }));
  }

  /**
   * Update a device's vector clock.
   */
  public async updateDeviceClockFor(deviceId: string, clock: VectorClockData): Promise<void> {
    await this.adapter.run(
      'UPDATE _sync_devices SET vector_clock = ?, last_seen_at = ? WHERE device_id = ?',
      [JSON.stringify(clock), Date.now(), deviceId]
    );

    // Merge into our clock
    this.vectorClock.observe(clock);
  }

  // ============================================================================
  // Conflicts
  // ============================================================================

  /**
   * Record a conflict.
   */
  public async recordConflict(conflict: {
    table: string;
    recordId: string;
    localData: Record<string, unknown>;
    remoteData: Record<string, unknown>;
    localClock: VectorClockData;
    remoteClock: VectorClockData;
  }): Promise<string> {
    const conflictId = this.generateConflictId();

    await this.adapter.run(
      `INSERT INTO _sync_conflicts
       (conflict_id, table_name, record_id, local_data, remote_data, local_clock, remote_clock, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        conflictId,
        conflict.table,
        conflict.recordId,
        JSON.stringify(conflict.localData),
        JSON.stringify(conflict.remoteData),
        JSON.stringify(conflict.localClock),
        JSON.stringify(conflict.remoteClock),
        Date.now(),
      ]
    );

    return conflictId;
  }

  /**
   * Get pending conflicts.
   */
  public async getPendingConflicts(): Promise<ConflictEntry[]> {
    return this.adapter.all<ConflictEntry>(
      "SELECT * FROM _sync_conflicts WHERE status = 'pending' ORDER BY created_at ASC"
    );
  }

  /**
   * Resolve a conflict.
   */
  public async resolveConflict(conflictId: string, resolution: string): Promise<void> {
    await this.adapter.run(
      "UPDATE _sync_conflicts SET status = 'resolved', resolution = ?, resolved_at = ? WHERE conflict_id = ?",
      [resolution, Date.now(), conflictId]
    );
  }

  // ============================================================================
  // Vector Clock
  // ============================================================================

  /**
   * Get current vector clock.
   */
  public getVectorClock(): VectorClock {
    return this.vectorClock;
  }

  /**
   * Get vector clock data.
   */
  public getVectorClockData(): VectorClockData {
    return this.vectorClock.getValues();
  }

  /**
   * Merge a remote clock into ours.
   */
  public mergeVectorClock(remoteClock: VectorClockData): void {
    this.vectorClock.merge(remoteClock);
  }

  // ============================================================================
  // Utilities
  // ============================================================================

  /**
   * Get device ID.
   */
  public getDeviceId(): string {
    return this.deviceId;
  }

  /**
   * Update this device's clock in database.
   */
  private async updateDeviceClock(): Promise<void> {
    await this.adapter.run(
      'UPDATE _sync_devices SET vector_clock = ?, last_seen_at = ? WHERE device_id = ?',
      [JSON.stringify(this.vectorClock.getValues()), Date.now(), this.deviceId]
    );
  }

  /**
   * Check if table should be tracked.
   */
  private shouldTrackTable(table: string): boolean {
    // Exclude sync tables
    if (this.config.excludeTables.includes(table)) {
      return false;
    }

    // If include list is specified, only track those
    if (this.config.includeTables.length > 0) {
      return this.config.includeTables.includes(table);
    }

    return true;
  }

  /**
   * Check if clock A is after clock B.
   */
  private isClockAfter(a: VectorClockData, b: VectorClockData): boolean {
    let aGreater = false;
    let bGreater = false;

    const allDevices = new Set([...Object.keys(a), ...Object.keys(b)]);

    for (const deviceId of allDevices) {
      const aValue = a[deviceId] ?? 0;
      const bValue = b[deviceId] ?? 0;

      if (aValue > bValue) aGreater = true;
      if (bValue > aValue) bGreater = true;
    }

    return aGreater && !bGreater;
  }

  /**
   * Generate unique change ID.
   */
  private generateChangeId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `chg_${timestamp}_${random}`;
  }

  /**
   * Generate unique conflict ID.
   */
  private generateConflictId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `cnf_${timestamp}_${random}`;
  }

  /**
   * Detect device type from environment.
   */
  private detectDeviceType(): DeviceType {
    // Check for Electron
    if (typeof process !== 'undefined' && process.versions?.electron) {
      return 'electron';
    }

    // Check for Capacitor
    if (typeof window !== 'undefined' && (window as unknown as { Capacitor?: unknown }).Capacitor) {
      return 'capacitor';
    }

    // Check for browser
    if (typeof window !== 'undefined') {
      return 'browser';
    }

    return 'server';
  }

  /**
   * Get device name.
   */
  private getDeviceName(): string | undefined {
    if (typeof navigator !== 'undefined') {
      return navigator.userAgent.split('/')[0];
    }
    if (typeof process !== 'undefined') {
      return process.platform;
    }
    return undefined;
  }

  /**
   * Prune old synced entries if over limit.
   */
  private async pruneIfNeeded(): Promise<void> {
    const count = await this.adapter.get<{ count: number }>(
      'SELECT COUNT(*) as count FROM _sync_log'
    );

    if ((count?.count ?? 0) > this.config.maxLogEntries) {
      // Delete oldest synced entries
      const deleteCount = (count?.count ?? 0) - this.config.maxLogEntries + 100;
      await this.adapter.run(
        `DELETE FROM _sync_log WHERE log_id IN (
          SELECT log_id FROM _sync_log
          WHERE synced_at IS NOT NULL
          ORDER BY log_id ASC
          LIMIT ?
        )`,
        [deleteCount]
      );
    }
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a sync log manager.
 */
export function createSyncLogManager(
  adapter: StorageAdapter,
  deviceId?: string,
  config?: SyncLogManagerConfig
): SyncLogManager {
  return new SyncLogManager(adapter, deviceId, config);
}
