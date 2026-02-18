/**
 * Cross-Platform Sync Entry Point.
 *
 * Main API for synchronizing data across Electron, Capacitor,
 * browser, and server platforms.
 *
 * @packageDocumentation
 */

import type { StorageAdapter } from '../../core/contracts';
import type { VectorClockData } from './protocol/vectorClock';
import { mergeClocks, generateDeviceId } from './protocol/vectorClock';
import type {
  SyncMessage,
  DeltaPush,
  DeltaPullResponse,
  ChangeRecord,
  PresenceMessage,
  DeviceInfo as ProtocolDeviceInfo,
} from './protocol/messages';
import {
  createHandshakeRequest,
  createDeltaPushMessage,
  createDeltaPullRequest,
  createPresenceMessage,
  createChangeRecord,
} from './protocol/messages';
import type { SyncTransport, TransportOptions } from './transport/transport';
import { WebSocketTransport } from './transport/websocketTransport';
import { HttpTransport } from './transport/httpTransport';
import type { SyncConflict, ConflictResolution, ConflictStrategy, ConflictUIHooks, FieldMerger } from './conflicts/conflictResolver';
import { ConflictResolver } from './conflicts/conflictResolver';
import type { DeviceInfo, DeviceType, DeviceCapabilities } from './devices/deviceManager';
import { DeviceManager } from './devices/deviceManager';
import type { DeviceType as ProtocolDeviceType } from './protocol/messages';
import { SyncLogManager } from './tables/syncLogManager';

/**
 * Table sync configuration.
 */
export interface TableSyncConfig {
  /** Sync priority (higher = synced first) */
  priority?: 'critical' | 'high' | 'normal' | 'low';

  /** Conflict resolution strategy for this table */
  conflictStrategy?: ConflictStrategy;

  /** Maximum records to sync per batch */
  maxRecords?: number;

  /** Custom field mergers for merge strategy */
  fieldMergers?: Record<string, FieldMerger>;

  /** Whether to track deletes */
  trackDeletes?: boolean;

  /** Primary key column (default: 'id') */
  primaryKey?: string;
}

/**
 * Cross-platform sync options.
 */
export interface CrossPlatformSyncOptions {
  /** Local storage adapter */
  localAdapter: StorageAdapter;

  /** Sync server endpoint */
  endpoint: string;

  /** Authentication token */
  authToken?: string;

  /** Device information */
  device?: {
    name?: string;
    type?: DeviceType;
  };

  /** Tables to sync with their configuration */
  tables: Record<string, TableSyncConfig>;

  /** Transport type preference */
  transport?: 'websocket' | 'http' | 'auto';

  /** Transport options */
  transportOptions?: Partial<TransportOptions>;

  /** Default conflict strategy */
  defaultConflictStrategy?: ConflictStrategy;

  /** Conflict resolution UI hooks */
  hooks?: CrossPlatformSyncHooks;

  /** Sync interval in milliseconds (0 = manual only) */
  syncInterval?: number;

  /** Enable real-time sync (push changes immediately) */
  realTime?: boolean;

  /** Batch size for sync operations */
  batchSize?: number;

  /** Enable compression for sync payloads */
  compression?: boolean;
}

/**
 * Hooks for sync events and conflict resolution.
 */
export interface CrossPlatformSyncHooks extends ConflictUIHooks {
  /** Called before sync starts */
  onSyncStart?: () => void;

  /** Called after sync completes */
  onSyncComplete?: (result: SyncResult) => void;

  /** Called when sync fails */
  onSyncError?: (error: Error) => void;

  /** Called when a change is pushed */
  onChangePushed?: (change: ChangeRecord) => void;

  /** Called when a change is pulled */
  onChangePulled?: (change: ChangeRecord) => void;

  /** Called when connection state changes */
  onConnectionStateChange?: (connected: boolean) => void;

  /** Called when a peer device is discovered */
  onPeerDiscovered?: (peer: DeviceInfo) => void;
}

/**
 * Sync operation result.
 */
export interface SyncResult {
  /** Whether sync was successful */
  success: boolean;

  /** Number of records pushed */
  pushed: number;

  /** Number of records pulled */
  pulled: number;

  /** Number of conflicts detected */
  conflicts: number;

  /** Number of conflicts resolved */
  conflictsResolved: number;

  /** Duration in milliseconds */
  duration: number;

  /** Errors encountered */
  errors: Error[];

  /** Resulting vector clock */
  vectorClock: VectorClockData;
}

/**
 * Sync status information.
 */
export interface SyncStatus {
  /** Current sync state */
  state: 'idle' | 'syncing' | 'error' | 'offline';

  /** Whether connected to sync server */
  connected: boolean;

  /** Last successful sync time */
  lastSyncAt?: number;

  /** Last sync result */
  lastResult?: SyncResult;

  /** Pending changes count */
  pendingChanges: number;

  /** Pending conflicts count */
  pendingConflicts: number;

  /** Current device info */
  device?: DeviceInfo;

  /** Known peer devices */
  peers: DeviceInfo[];
}

/**
 * Convert DeviceType from deviceManager to protocol DeviceType.
 * Maps 'unknown' to 'browser' as a fallback.
 */
function toProtocolDeviceType(deviceType: DeviceType): ProtocolDeviceType {
  if (deviceType === 'unknown') {
    return 'browser';
  }
  return deviceType;
}

/**
 * Convert DeviceCapabilities object to string array for handshake.
 */
function capabilitiesToArray(capabilities: DeviceCapabilities): string[] {
  const result: string[] = [];
  if (capabilities.realTimeSync) result.push('realtime');
  if (capabilities.backgroundSync) result.push('background');
  if (capabilities.pushNotifications) result.push('push');
  if (capabilities.offlineMode) result.push('offline');
  result.push('gzip', 'delta'); // Default capabilities
  return result;
}

/**
 * Cross-platform sync manager.
 *
 * Orchestrates synchronization between local database and remote
 * sync server across all platforms.
 *
 * @example
 * ```typescript
 * const sync = await createCrossPlatformSync({
 *   localAdapter: db,
 *   endpoint: 'wss://sync.example.com',
 *   authToken: 'token',
 *   device: { name: 'MacBook Pro', type: 'electron' },
 *   tables: {
 *     notes: { priority: 'high', conflictStrategy: 'merge' },
 *     settings: { priority: 'critical', conflictStrategy: 'local-wins' },
 *   },
 *   hooks: {
 *     onConflictNeedsResolution: (conflict) => showConflictDialog(conflict),
 *     onSyncComplete: (result) => console.log('Synced:', result),
 *   },
 * });
 *
 * await sync.sync();
 * ```
 */
export class CrossPlatformSync {
  private _adapter: StorageAdapter;
  private _transport: SyncTransport | null = null;
  private _conflictResolver: ConflictResolver;
  private _deviceManager: DeviceManager;
  private _syncLogManager: SyncLogManager;
  private _options: Required<CrossPlatformSyncOptions>;
  private _syncTimer: ReturnType<typeof setInterval> | null = null;
  private _status: SyncStatus;
  private _isSyncing = false;
  private _disposed = false;
  private _deviceId: string;

  constructor(options: CrossPlatformSyncOptions) {
    this._adapter = options.localAdapter;
    this._deviceId = generateDeviceId();

    this._options = {
      localAdapter: options.localAdapter,
      endpoint: options.endpoint,
      authToken: options.authToken ?? '',
      device: options.device ?? {},
      tables: options.tables,
      transport: options.transport ?? 'auto',
      transportOptions: options.transportOptions ?? {},
      defaultConflictStrategy: options.defaultConflictStrategy ?? 'last-write-wins',
      hooks: options.hooks ?? {},
      syncInterval: options.syncInterval ?? 0,
      realTime: options.realTime ?? true,
      batchSize: options.batchSize ?? 100,
      compression: options.compression ?? true,
    };

    // Initialize managers
    this._deviceManager = new DeviceManager({
      adapter: this._adapter,
      deviceName: options.device?.name,
      autoDetect: true,
    });

    this._syncLogManager = new SyncLogManager(this._adapter, this._deviceId);

    this._conflictResolver = new ConflictResolver({
      defaultStrategy: this._options.defaultConflictStrategy,
      tableStrategies: this._buildTableStrategies(),
      fieldMergers: this._buildFieldMergers(),
      hooks: {
        onConflictDetected: this._options.hooks.onConflictDetected,
        onConflictNeedsResolution: this._options.hooks.onConflictNeedsResolution,
        onConflictResolved: this._options.hooks.onConflictResolved,
        onMergeFailed: this._options.hooks.onMergeFailed,
      },
    });

    this._status = {
      state: 'idle',
      connected: false,
      pendingChanges: 0,
      pendingConflicts: 0,
      peers: [],
    };
  }

  /**
   * Initialize the sync manager.
   */
  async initialize(): Promise<void> {
    // Initialize components
    await this._deviceManager.initialize();
    await this._syncLogManager.initialize();

    // Set up transport
    await this._initializeTransport();

    // Set up event listeners
    this._setupDeviceManagerListeners();

    // Update status
    this._status.device = this._deviceManager.getCurrentDevice() ?? undefined;
    this._status.peers = await this._deviceManager.getPeers();

    // Start sync timer if configured
    if (this._options.syncInterval > 0) {
      this._startSyncTimer();
    }
  }

  /**
   * Perform a sync operation.
   */
  async sync(): Promise<SyncResult> {
    if (this._isSyncing) {
      throw new Error('Sync already in progress');
    }

    if (this._disposed) {
      throw new Error('Sync manager has been disposed');
    }

    this._isSyncing = true;
    this._status.state = 'syncing';
    const startTime = Date.now();

    this._options.hooks.onSyncStart?.();

    const result: SyncResult = {
      success: false,
      pushed: 0,
      pulled: 0,
      conflicts: 0,
      conflictsResolved: 0,
      duration: 0,
      errors: [],
      vectorClock: this._syncLogManager.getVectorClockData(),
    };

    try {
      // Ensure connected
      if (!this._transport?.isConnected) {
        await this._transport?.connect();
      }

      // Push local changes
      const pushResult = await this._pushChanges();
      result.pushed = pushResult.pushed;
      result.conflicts += pushResult.conflicts;

      // Pull remote changes
      const pullResult = await this._pullChanges();
      result.pulled = pullResult.pulled;
      result.conflicts += pullResult.conflicts;

      // Resolve conflicts
      const resolveResult = await this._resolveConflicts();
      result.conflictsResolved = resolveResult.resolved;

      // Update vector clock
      result.vectorClock = this._syncLogManager.getVectorClockData();

      result.success = true;
      this._status.lastSyncAt = Date.now();

    } catch (error) {
      result.errors.push(error as Error);
      this._status.state = 'error';
      this._options.hooks.onSyncError?.(error as Error);
    }

    result.duration = Date.now() - startTime;
    this._isSyncing = false;
    this._status.state = result.success ? 'idle' : 'error';
    this._status.lastResult = result;
    this._status.pendingChanges = await this._getPendingChangesCount();
    this._status.pendingConflicts = this._conflictResolver.getPendingConflicts().length;

    this._options.hooks.onSyncComplete?.(result);

    return result;
  }

  /**
   * Push a single change immediately (for real-time sync).
   */
  async pushChange(
    tableName: string,
    recordId: string,
    operation: 'INSERT' | 'UPDATE' | 'DELETE',
    data: Record<string, unknown>
  ): Promise<void> {
    if (!this._options.realTime) return;
    if (!this._transport?.isConnected) return;

    const device = this._deviceManager.getCurrentDevice();
    if (!device) return;

    // Log the change
    const loggedChange = await this._syncLogManager.logChange({
      table: tableName,
      recordId,
      operation,
      oldData: operation === 'DELETE' ? data : undefined,
      newData: operation !== 'DELETE' ? data : undefined,
    });

    // Send push message
    const vectorClock = this._syncLogManager.getVectorClockData();
    const message = createDeltaPushMessage(device.deviceId, [loggedChange], vectorClock);
    await this._transport.send(message);

    this._options.hooks.onChangePushed?.(loggedChange);
  }

  /**
   * Get current sync status.
   */
  getStatus(): SyncStatus {
    return { ...this._status };
  }

  /**
   * Get pending conflicts.
   */
  getPendingConflicts(): SyncConflict[] {
    return this._conflictResolver.getPendingConflicts();
  }

  /**
   * Resolve a conflict manually.
   */
  async resolveConflict(
    conflictId: string,
    decision: 'use_local' | 'use_remote' | 'use_merged' | 'keep_both' | 'defer',
    mergedData?: Record<string, unknown>
  ): Promise<ConflictResolution> {
    return this._conflictResolver.resolveManually(conflictId, decision, mergedData);
  }

  /**
   * Connect to sync server.
   */
  async connect(): Promise<void> {
    await this._transport?.connect();
  }

  /**
   * Disconnect from sync server.
   */
  async disconnect(): Promise<void> {
    await this._transport?.disconnect();
  }

  /**
   * Dispose of the sync manager.
   */
  async dispose(): Promise<void> {
    if (this._disposed) return;
    this._disposed = true;

    if (this._syncTimer) {
      clearInterval(this._syncTimer);
      this._syncTimer = null;
    }

    await this._transport?.dispose();
    await this._deviceManager.dispose();
  }

  /**
   * Initialize the transport layer.
   */
  private async _initializeTransport(): Promise<void> {
    const transportType = this._options.transport;
    const baseOptions: TransportOptions = {
      endpoint: this._options.endpoint,
      authToken: this._options.authToken,
      compression: this._options.compression,
      ...this._options.transportOptions,
    };

    if (transportType === 'websocket' || transportType === 'auto') {
      // Try WebSocket first
      try {
        this._transport = new WebSocketTransport(baseOptions);
        await this._transport.connect();
        this._setupTransportListeners();
        return;
      } catch (error) {
        if (transportType === 'websocket') {
          throw error;
        }
        console.warn('[CrossPlatformSync] WebSocket failed, falling back to HTTP');
      }
    }

    // Use HTTP transport
    this._transport = new HttpTransport(baseOptions);
    this._setupTransportListeners();
  }

  /**
   * Set up transport event listeners.
   */
  private _setupTransportListeners(): void {
    if (!this._transport) return;

    this._transport.on('connected', () => {
      this._status.connected = true;
      this._status.state = 'idle';
      this._options.hooks.onConnectionStateChange?.(true);

      // Send handshake
      this._sendHandshake().catch((error) => {
        console.error('[CrossPlatformSync] Handshake failed:', error);
      });
    });

    this._transport.on('disconnected', () => {
      this._status.connected = false;
      this._status.state = 'offline';
      this._options.hooks.onConnectionStateChange?.(false);
    });

    this._transport.on('message', ({ message }) => {
      this._handleIncomingMessage(message).catch((error) => {
        console.error('[CrossPlatformSync] Message handling error:', error);
      });
    });

    this._transport.on('error', ({ error }) => {
      console.error('[CrossPlatformSync] Transport error:', error);
      this._status.state = 'error';
    });
  }

  /**
   * Set up device manager listeners.
   */
  private _setupDeviceManagerListeners(): void {
    this._deviceManager.on('peerDiscovered', (peer) => {
      this._status.peers.push(peer);
      this._options.hooks.onPeerDiscovered?.(peer);
    });

    this._deviceManager.on('presenceChanged', async (event) => {
      // Update local peers list
      const peer = this._status.peers.find((p) => p.deviceId === event.deviceId);
      if (peer) {
        peer.presence = event.currentStatus;
      }

      // Notify server of our presence changes
      const currentDevice = this._deviceManager.getCurrentDevice();
      if (event.deviceId === currentDevice?.deviceId) {
        if (this._transport?.isConnected && currentDevice) {
          const deviceInfo: ProtocolDeviceInfo = {
            deviceId: currentDevice.deviceId,
            deviceType: toProtocolDeviceType(currentDevice.deviceType),
            deviceName: currentDevice.deviceName,
          };
          const message = createPresenceMessage(deviceInfo, event.currentStatus);
          await this._transport.send(message);
        }
      }
    });
  }

  /**
   * Send handshake to server.
   */
  private async _sendHandshake(): Promise<void> {
    const device = this._deviceManager.getCurrentDevice();
    if (!device || !this._transport) return;

    const deviceInfo: ProtocolDeviceInfo = {
      deviceId: device.deviceId,
      deviceType: toProtocolDeviceType(device.deviceType),
      deviceName: device.deviceName,
    };

    const vectorClock = this._syncLogManager.getVectorClockData();

    const request = createHandshakeRequest(
      deviceInfo,
      vectorClock,
      Object.keys(this._options.tables),
      capabilitiesToArray(device.capabilities)
    );

    const response = await this._transport.request(request, 30000);

    // Process handshake response
    if (response.type === 'handshake_response') {
      const responseData = response as { vectorClock?: VectorClockData };
      if (responseData.vectorClock) {
        this._syncLogManager.mergeVectorClock(responseData.vectorClock);
      }
    }
  }

  /**
   * Handle incoming sync message.
   */
  private async _handleIncomingMessage(message: SyncMessage): Promise<void> {
    switch (message.type) {
      case 'delta_push': {
        // Server pushing changes to us
        const pushMessage = message as DeltaPush;
        await this._applyRemoteChanges(pushMessage.batch.changes);
        break;
      }

      case 'conflict': {
        // Server detected a conflict
        // Already handled by push/pull logic
        break;
      }

      case 'presence': {
        // Peer presence update
        const presenceMsg = message as PresenceMessage;
        const peer = this._status.peers.find((p) => p.deviceId === presenceMsg.device.deviceId);
        if (peer) {
          peer.presence = presenceMsg.status;
        }
        break;
      }
    }
  }

  /**
   * Push local changes to server.
   */
  private async _pushChanges(): Promise<{ pushed: number; conflicts: number }> {
    const device = this._deviceManager.getCurrentDevice();
    if (!device || !this._transport?.isConnected) {
      return { pushed: 0, conflicts: 0 };
    }

    // Get unsynced changes
    const vectorClock = this._syncLogManager.getVectorClockData();
    const changes = await this._syncLogManager.getChangesSince(
      vectorClock,
      { limit: this._options.batchSize }
    );

    if (changes.length === 0) {
      return { pushed: 0, conflicts: 0 };
    }

    // Send push message
    const pushMessage = createDeltaPushMessage(device.deviceId, changes, vectorClock);
    const response = await this._transport.request(pushMessage, 30000);

    let conflicts = 0;

    if (response.type === 'ack') {
      // Mark as synced
      const changeIds = changes.map((c) => c.changeId);
      await this._syncLogManager.markSynced(changeIds);

      for (const change of changes) {
        this._options.hooks.onChangePushed?.(change);
      }
    } else if (response.type === 'conflict') {
      conflicts = 1;
    }

    return { pushed: changes.length, conflicts };
  }

  /**
   * Pull remote changes from server.
   */
  private async _pullChanges(): Promise<{ pulled: number; conflicts: number }> {
    const device = this._deviceManager.getCurrentDevice();
    if (!device || !this._transport?.isConnected) {
      return { pulled: 0, conflicts: 0 };
    }

    // Request changes since our clock
    const vectorClock = this._syncLogManager.getVectorClockData();
    const request = createDeltaPullRequest(
      device.deviceId,
      vectorClock,
      Object.keys(this._options.tables),
      this._options.batchSize
    );

    const response = await this._transport.request(request, 30000) as DeltaPullResponse;

    if (response.type !== 'delta_pull_response') {
      return { pulled: 0, conflicts: 0 };
    }

    // Apply remote changes
    const { applied, conflicts } = await this._applyRemoteChanges(response.batch.changes);

    // Update our clock
    if (response.vectorClock) {
      this._syncLogManager.mergeVectorClock(response.vectorClock);
    }

    return { pulled: applied, conflicts };
  }

  /**
   * Apply remote changes to local database.
   */
  private async _applyRemoteChanges(
    changes: ChangeRecord[]
  ): Promise<{ applied: number; conflicts: number }> {
    let applied = 0;
    let conflicts = 0;
    const device = this._deviceManager.getCurrentDevice();
    const localClock = this._syncLogManager.getVectorClockData();

    for (const change of changes) {
      try {
        // Check for conflicts
        const localData = await this._getLocalRecord(change.table, change.recordId);

        if (localData && device) {
          const conflict = this._conflictResolver.detectConflict(
            change.table,
            change.recordId,
            localData,
            change.newData ?? {},
            localClock,
            change.vectorClock,
            device.deviceId,
            change.deviceId
          );

          if (conflict) {
            conflicts++;
            continue;
          }
        }

        // Apply change
        await this._applyChange(change);
        applied++;

        this._options.hooks.onChangePulled?.(change);

      } catch (error) {
        console.error('[CrossPlatformSync] Failed to apply change:', error);
      }
    }

    return { applied, conflicts };
  }

  /**
   * Apply a single change to local database.
   */
  private async _applyChange(change: ChangeRecord): Promise<void> {
    const tableConfig = this._options.tables[change.table];
    const primaryKey = tableConfig?.primaryKey ?? 'id';
    const data = change.newData ?? change.oldData ?? {};

    switch (change.operation) {
      case 'INSERT': {
        const columns = Object.keys(data);
        const placeholders = columns.map(() => '?').join(', ');
        const values = columns.map((col) => data[col]);

        await this._adapter.run(
          `INSERT OR REPLACE INTO ${change.table} (${columns.join(', ')}) VALUES (${placeholders})`,
          values
        );
        break;
      }

      case 'UPDATE': {
        const columns = Object.keys(data).filter((c) => c !== primaryKey);
        const setClause = columns.map((col) => `${col} = ?`).join(', ');
        const values = columns.map((col) => data[col]);
        values.push(change.recordId);

        await this._adapter.run(
          `UPDATE ${change.table} SET ${setClause} WHERE ${primaryKey} = ?`,
          values
        );
        break;
      }

      case 'DELETE': {
        await this._adapter.run(
          `DELETE FROM ${change.table} WHERE ${primaryKey} = ?`,
          [change.recordId]
        );
        break;
      }
    }
  }

  /**
   * Get a local record by table and ID.
   */
  private async _getLocalRecord(
    tableName: string,
    recordId: string
  ): Promise<Record<string, unknown> | null> {
    const tableConfig = this._options.tables[tableName];
    const primaryKey = tableConfig?.primaryKey ?? 'id';

    const row = await this._adapter.get<Record<string, unknown>>(
      `SELECT * FROM ${tableName} WHERE ${primaryKey} = ?`,
      [recordId]
    );

    return row ?? null;
  }

  /**
   * Resolve pending conflicts.
   */
  private async _resolveConflicts(): Promise<{ resolved: number }> {
    const pending = this._conflictResolver.getPendingConflicts();
    let resolved = 0;

    for (const conflict of pending) {
      try {
        const resolution = await this._conflictResolver.resolve(conflict);

        // Apply resolution
        if (resolution.decision === 'use_local' || resolution.decision === 'use_remote') {
          const data = resolution.decision === 'use_local'
            ? conflict.localData
            : conflict.remoteData;

          const changeRecord = createChangeRecord(
            conflict.tableName,
            conflict.recordId,
            'UPDATE',
            conflict.localDeviceId,
            resolution.mergedClock,
            data
          );
          await this._applyChange(changeRecord);
        } else if (resolution.decision === 'use_merged' && resolution.mergedData) {
          const changeRecord = createChangeRecord(
            conflict.tableName,
            conflict.recordId,
            'UPDATE',
            conflict.localDeviceId,
            resolution.mergedClock,
            resolution.mergedData
          );
          await this._applyChange(changeRecord);
        }

        // Mark conflict as resolved in sync log
        await this._syncLogManager.resolveConflict(conflict.conflictId, resolution.decision);

        resolved++;

      } catch (error) {
        console.error('[CrossPlatformSync] Failed to resolve conflict:', error);
      }
    }

    return { resolved };
  }

  /**
   * Get count of pending changes.
   */
  private async _getPendingChangesCount(): Promise<number> {
    return this._syncLogManager.getUnsyncedCount();
  }

  /**
   * Start sync timer.
   */
  private _startSyncTimer(): void {
    if (this._syncTimer) return;

    this._syncTimer = setInterval(async () => {
      if (!this._isSyncing && this._status.connected) {
        await this.sync().catch((error) => {
          console.error('[CrossPlatformSync] Scheduled sync failed:', error);
        });
      }
    }, this._options.syncInterval);
  }

  /**
   * Build table strategies map.
   */
  private _buildTableStrategies(): Record<string, ConflictStrategy> {
    const strategies: Record<string, ConflictStrategy> = {};

    for (const [table, config] of Object.entries(this._options.tables)) {
      if (config.conflictStrategy) {
        strategies[table] = config.conflictStrategy;
      }
    }

    return strategies;
  }

  /**
   * Build field mergers map.
   */
  private _buildFieldMergers(): Record<string, FieldMerger> {
    const mergers: Record<string, FieldMerger> = {};

    for (const [_table, config] of Object.entries(this._options.tables)) {
      if (config.fieldMergers) {
        Object.assign(mergers, config.fieldMergers);
      }
    }

    return mergers;
  }
}

/**
 * Create a cross-platform sync instance.
 *
 * @example
 * ```typescript
 * const sync = await createCrossPlatformSync({
 *   localAdapter: db,
 *   endpoint: 'wss://sync.example.com',
 *   tables: {
 *     notes: { priority: 'high', conflictStrategy: 'merge' },
 *     settings: { priority: 'critical', conflictStrategy: 'local-wins' },
 *   },
 * });
 *
 * await sync.sync();
 * ```
 */
export const createCrossPlatformSync = async (
  options: CrossPlatformSyncOptions
): Promise<CrossPlatformSync> => {
  const sync = new CrossPlatformSync(options);
  await sync.initialize();
  return sync;
};
