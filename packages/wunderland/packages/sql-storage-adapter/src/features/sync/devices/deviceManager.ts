/**
 * Device Registry and Presence Management.
 *
 * Manages device registration, presence tracking, and peer discovery
 * for cross-platform sync.
 *
 * @packageDocumentation
 */

import type { StorageAdapter } from '../../../core/contracts';
import type { VectorClock } from '../protocol/vectorClock';
import { generateDeviceId, createVectorClock } from '../protocol/vectorClock';

/**
 * Device types supported for sync.
 */
export type DeviceType = 'electron' | 'capacitor' | 'browser' | 'server' | 'unknown';

/**
 * Device presence status.
 */
export type PresenceStatus = 'online' | 'away' | 'offline' | 'syncing';

/**
 * Information about a registered device.
 */
export interface DeviceInfo {
  /** Unique device identifier */
  deviceId: string;

  /** Device type/platform */
  deviceType: DeviceType;

  /** Human-readable device name */
  deviceName: string;

  /** Device's current vector clock */
  vectorClock: VectorClock;

  /** When the device was first registered */
  createdAt: number;

  /** When the device was last seen */
  lastSeenAt: number;

  /** Current presence status */
  presence: PresenceStatus;

  /** Device capabilities */
  capabilities: DeviceCapabilities;

  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Capabilities a device supports.
 */
export interface DeviceCapabilities {
  /** Supports real-time sync */
  realTimeSync: boolean;

  /** Supports background sync */
  backgroundSync: boolean;

  /** Supports push notifications */
  pushNotifications: boolean;

  /** Supports offline mode */
  offlineMode: boolean;

  /** Maximum batch size */
  maxBatchSize: number;
}

/**
 * Device registration options.
 */
export interface DeviceRegistrationOptions {
  /** Device name (auto-generated if not provided) */
  name?: string;

  /** Device type (auto-detected if not provided) */
  type?: DeviceType;

  /** Device capabilities */
  capabilities?: Partial<DeviceCapabilities>;

  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Device presence event.
 */
export interface PresenceEvent {
  deviceId: string;
  previousStatus: PresenceStatus;
  currentStatus: PresenceStatus;
  timestamp: number;
}

/**
 * Device manager event types.
 */
export type DeviceManagerEventType =
  | 'deviceRegistered'
  | 'deviceUpdated'
  | 'deviceRemoved'
  | 'presenceChanged'
  | 'peerDiscovered'
  | 'peerLost';

/**
 * Device manager event payloads.
 */
export interface DeviceManagerEvents {
  deviceRegistered: DeviceInfo;
  deviceUpdated: { device: DeviceInfo; changes: Partial<DeviceInfo> };
  deviceRemoved: { deviceId: string; reason: string };
  presenceChanged: PresenceEvent;
  peerDiscovered: DeviceInfo;
  peerLost: { deviceId: string; lastSeenAt: number };
}

/**
 * Device manager configuration.
 */
export interface DeviceManagerOptions {
  /** Storage adapter for persisting device registry */
  adapter: StorageAdapter;

  /** Presence timeout in milliseconds (default: 60000) */
  presenceTimeout?: number;

  /** Heartbeat interval in milliseconds (default: 30000) */
  heartbeatInterval?: number;

  /** Auto-detect device info */
  autoDetect?: boolean;

  /** Initial device name */
  deviceName?: string;
}

/**
 * Detects the current device type.
 */
const detectDeviceType = (): DeviceType => {
  // Check for Electron
  if (typeof process !== 'undefined' && process.versions?.electron) {
    return 'electron';
  }

  // Check for Capacitor
  if (typeof window !== 'undefined') {
    const win = window as Window & { Capacitor?: { isNativePlatform?: () => boolean } };
    if (win.Capacitor?.isNativePlatform?.()) {
      return 'capacitor';
    }
  }

  // Check for Node.js server
  if (typeof process !== 'undefined' && process.versions?.node && typeof window === 'undefined') {
    return 'server';
  }

  // Browser
  if (typeof window !== 'undefined') {
    return 'browser';
  }

  return 'unknown';
};

/**
 * Generates a default device name.
 */
const generateDeviceName = (type: DeviceType): string => {
  const timestamp = Date.now().toString(36).slice(-4);

  switch (type) {
    case 'electron':
      return `Desktop-${timestamp}`;
    case 'capacitor':
      return `Mobile-${timestamp}`;
    case 'browser':
      return `Browser-${timestamp}`;
    case 'server':
      return `Server-${timestamp}`;
    default:
      return `Device-${timestamp}`;
  }
};

/**
 * Default device capabilities by type.
 */
const getDefaultCapabilities = (type: DeviceType): DeviceCapabilities => {
  switch (type) {
    case 'electron':
      return {
        realTimeSync: true,
        backgroundSync: true,
        pushNotifications: true,
        offlineMode: true,
        maxBatchSize: 1000,
      };
    case 'capacitor':
      return {
        realTimeSync: true,
        backgroundSync: true,
        pushNotifications: true,
        offlineMode: true,
        maxBatchSize: 500,
      };
    case 'browser':
      return {
        realTimeSync: true,
        backgroundSync: false,
        pushNotifications: false,
        offlineMode: true,
        maxBatchSize: 500,
      };
    case 'server':
      return {
        realTimeSync: true,
        backgroundSync: true,
        pushNotifications: false,
        offlineMode: false,
        maxBatchSize: 10000,
      };
    default:
      return {
        realTimeSync: false,
        backgroundSync: false,
        pushNotifications: false,
        offlineMode: false,
        maxBatchSize: 100,
      };
  }
};

/**
 * Device registry and presence manager.
 *
 * Manages device registration, presence tracking, and peer discovery
 * across all connected devices in a sync cluster.
 *
 * @example
 * ```typescript
 * const manager = new DeviceManager({
 *   adapter: db,
 *   deviceName: 'MacBook Pro',
 * });
 *
 * await manager.initialize();
 *
 * // Get current device
 * const thisDevice = manager.getCurrentDevice();
 *
 * // Get all known peers
 * const peers = await manager.getPeers();
 *
 * // Listen for presence changes
 * manager.on('presenceChanged', (event) => {
 *   console.log(`${event.deviceId} is now ${event.currentStatus}`);
 * });
 * ```
 */
export class DeviceManager {
  private _adapter: StorageAdapter;
  private _options: Required<DeviceManagerOptions>;
  private _currentDevice: DeviceInfo | null = null;
  private _peers: Map<string, DeviceInfo> = new Map();
  private _heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private _listeners: Map<DeviceManagerEventType, Set<(event: unknown) => void>> = new Map();
  private _initialized = false;

  constructor(options: DeviceManagerOptions) {
    this._adapter = options.adapter;
    this._options = {
      adapter: options.adapter,
      presenceTimeout: options.presenceTimeout ?? 60000,
      heartbeatInterval: options.heartbeatInterval ?? 30000,
      autoDetect: options.autoDetect ?? true,
      deviceName: options.deviceName ?? '',
    };
  }

  /**
   * Initialize the device manager.
   */
  async initialize(): Promise<void> {
    if (this._initialized) return;

    // Create tables if needed
    await this._ensureTables();

    // Register or load current device
    await this._initializeCurrentDevice();

    // Load known peers
    await this._loadPeers();

    // Start heartbeat
    this._startHeartbeat();

    this._initialized = true;
  }

  /**
   * Get the current device.
   */
  getCurrentDevice(): DeviceInfo | null {
    return this._currentDevice;
  }

  /**
   * Get all known peer devices.
   */
  async getPeers(): Promise<DeviceInfo[]> {
    return Array.from(this._peers.values());
  }

  /**
   * Get online peers only.
   */
  async getOnlinePeers(): Promise<DeviceInfo[]> {
    const now = Date.now();
    const timeout = this._options.presenceTimeout;

    return Array.from(this._peers.values()).filter((peer) => {
      return (now - peer.lastSeenAt) < timeout;
    });
  }

  /**
   * Get a specific device by ID.
   */
  async getDevice(deviceId: string): Promise<DeviceInfo | null> {
    if (deviceId === this._currentDevice?.deviceId) {
      return this._currentDevice;
    }
    return this._peers.get(deviceId) ?? null;
  }

  /**
   * Update the current device's presence.
   */
  async updatePresence(status: PresenceStatus): Promise<void> {
    if (!this._currentDevice) return;

    const previous = this._currentDevice.presence;
    this._currentDevice.presence = status;
    this._currentDevice.lastSeenAt = Date.now();

    await this._saveDevice(this._currentDevice);

    this._emit('presenceChanged', {
      deviceId: this._currentDevice.deviceId,
      previousStatus: previous,
      currentStatus: status,
      timestamp: Date.now(),
    });
  }

  /**
   * Update the current device's vector clock.
   */
  async updateVectorClock(clock: VectorClock): Promise<void> {
    if (!this._currentDevice) return;

    this._currentDevice.vectorClock = clock;
    this._currentDevice.lastSeenAt = Date.now();

    await this._saveDevice(this._currentDevice);
  }

  /**
   * Register or update a peer device.
   */
  async registerPeer(peerInfo: DeviceInfo): Promise<void> {
    const existing = this._peers.get(peerInfo.deviceId);

    if (existing) {
      // Update existing peer
      const changes: Partial<DeviceInfo> = {};

      if (peerInfo.lastSeenAt > existing.lastSeenAt) {
        Object.assign(existing, peerInfo);
        this._emit('deviceUpdated', { device: existing, changes: peerInfo });
      }
    } else {
      // New peer discovered
      this._peers.set(peerInfo.deviceId, peerInfo);
      await this._saveDevice(peerInfo);

      this._emit('peerDiscovered', peerInfo);
    }
  }

  /**
   * Remove a device from the registry.
   */
  async removeDevice(deviceId: string, reason = 'removed'): Promise<void> {
    if (deviceId === this._currentDevice?.deviceId) {
      throw new Error('Cannot remove current device');
    }

    const device = this._peers.get(deviceId);
    if (!device) return;

    this._peers.delete(deviceId);

    await this._adapter.run(
      'DELETE FROM _sync_devices WHERE device_id = ?',
      [deviceId]
    );

    this._emit('deviceRemoved', { deviceId, reason });
  }

  /**
   * Check for stale peers and update their presence.
   */
  async checkStaleDevices(): Promise<void> {
    const now = Date.now();
    const timeout = this._options.presenceTimeout;

    for (const peer of this._peers.values()) {
      if (peer.presence !== 'offline' && (now - peer.lastSeenAt) > timeout) {
        const previousStatus = peer.presence;
        peer.presence = 'offline';

        this._emit('presenceChanged', {
          deviceId: peer.deviceId,
          previousStatus,
          currentStatus: 'offline',
          timestamp: now,
        });

        this._emit('peerLost', {
          deviceId: peer.deviceId,
          lastSeenAt: peer.lastSeenAt,
        });
      }
    }
  }

  /**
   * Listen for device manager events.
   */
  on<T extends DeviceManagerEventType>(
    event: T,
    listener: (data: DeviceManagerEvents[T]) => void
  ): () => void {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }

    const listeners = this._listeners.get(event)!;
    listeners.add(listener as (event: unknown) => void);

    return () => {
      listeners.delete(listener as (event: unknown) => void);
    };
  }

  /**
   * Dispose of the device manager.
   */
  async dispose(): Promise<void> {
    if (this._heartbeatTimer) {
      clearInterval(this._heartbeatTimer);
      this._heartbeatTimer = null;
    }

    // Mark as offline before disposing
    if (this._currentDevice) {
      await this.updatePresence('offline');
    }

    this._listeners.clear();
    this._peers.clear();
    this._currentDevice = null;
    this._initialized = false;
  }

  /**
   * Emit an event to listeners.
   */
  private _emit<T extends DeviceManagerEventType>(
    event: T,
    data: DeviceManagerEvents[T]
  ): void {
    const listeners = this._listeners.get(event);
    if (!listeners) return;

    for (const listener of listeners) {
      try {
        listener(data);
      } catch (error) {
        console.error(`[DeviceManager] Error in ${event} listener:`, error);
      }
    }
  }

  /**
   * Ensure device tables exist.
   */
  private async _ensureTables(): Promise<void> {
    await this._adapter.exec(`
      CREATE TABLE IF NOT EXISTS _sync_devices (
        device_id TEXT PRIMARY KEY,
        device_type TEXT NOT NULL,
        device_name TEXT NOT NULL,
        vector_clock TEXT NOT NULL,
        capabilities TEXT NOT NULL,
        metadata TEXT,
        presence TEXT DEFAULT 'offline',
        created_at INTEGER NOT NULL,
        last_seen_at INTEGER NOT NULL
      )
    `);
  }

  /**
   * Initialize the current device.
   */
  private async _initializeCurrentDevice(): Promise<void> {
    // Try to load existing device ID from storage
    const storedId = await this._loadStoredDeviceId();

    if (storedId) {
      // Load existing device
      const device = await this._loadDevice(storedId);
      if (device) {
        device.presence = 'online';
        device.lastSeenAt = Date.now();
        await this._saveDevice(device);
        this._currentDevice = device;
        return;
      }
    }

    // Register new device
    const deviceType = this._options.autoDetect ? detectDeviceType() : 'unknown';
    const deviceName = this._options.deviceName || generateDeviceName(deviceType);
    const deviceId = generateDeviceId();

    const device: DeviceInfo = {
      deviceId,
      deviceType,
      deviceName,
      vectorClock: createVectorClock(deviceId),
      createdAt: Date.now(),
      lastSeenAt: Date.now(),
      presence: 'online',
      capabilities: getDefaultCapabilities(deviceType),
    };

    await this._saveDevice(device);
    await this._storeDeviceId(deviceId);

    this._currentDevice = device;

    this._emit('deviceRegistered', device);
  }

  /**
   * Load stored device ID.
   */
  private async _loadStoredDeviceId(): Promise<string | null> {
    try {
      // Try localStorage for browser/Electron renderer
      if (typeof localStorage !== 'undefined') {
        return localStorage.getItem('_sync_device_id');
      }

      // For other environments, use a settings table
      const result = await this._adapter.get<{ value: string }>(
        'SELECT value FROM _sync_settings WHERE key = ?',
        ['device_id']
      );

      return result?.value ?? null;
    } catch {
      return null;
    }
  }

  /**
   * Store device ID for persistence.
   */
  private async _storeDeviceId(deviceId: string): Promise<void> {
    try {
      // Use localStorage for browser/Electron renderer
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('_sync_device_id', deviceId);
        return;
      }

      // For other environments, use a settings table
      await this._adapter.exec(`
        CREATE TABLE IF NOT EXISTS _sync_settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        )
      `);

      await this._adapter.run(
        'INSERT OR REPLACE INTO _sync_settings (key, value) VALUES (?, ?)',
        ['device_id', deviceId]
      );
    } catch (error) {
      console.warn('[DeviceManager] Failed to persist device ID:', error);
    }
  }

  /**
   * Load a device from the database.
   */
  private async _loadDevice(deviceId: string): Promise<DeviceInfo | null> {
    const row = await this._adapter.get<{
      device_id: string;
      device_type: string;
      device_name: string;
      vector_clock: string;
      capabilities: string;
      metadata: string | null;
      presence: string;
      created_at: number;
      last_seen_at: number;
    }>(
      'SELECT * FROM _sync_devices WHERE device_id = ?',
      [deviceId]
    );

    if (!row) return null;

    return {
      deviceId: row.device_id,
      deviceType: row.device_type as DeviceType,
      deviceName: row.device_name,
      vectorClock: JSON.parse(row.vector_clock),
      capabilities: JSON.parse(row.capabilities),
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      presence: row.presence as PresenceStatus,
      createdAt: row.created_at,
      lastSeenAt: row.last_seen_at,
    };
  }

  /**
   * Save a device to the database.
   */
  private async _saveDevice(device: DeviceInfo): Promise<void> {
    await this._adapter.run(
      `INSERT OR REPLACE INTO _sync_devices
       (device_id, device_type, device_name, vector_clock, capabilities, metadata, presence, created_at, last_seen_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        device.deviceId,
        device.deviceType,
        device.deviceName,
        JSON.stringify(device.vectorClock),
        JSON.stringify(device.capabilities),
        device.metadata ? JSON.stringify(device.metadata) : null,
        device.presence,
        device.createdAt,
        device.lastSeenAt,
      ]
    );
  }

  /**
   * Load all peer devices.
   */
  private async _loadPeers(): Promise<void> {
    const rows = await this._adapter.all<{
      device_id: string;
      device_type: string;
      device_name: string;
      vector_clock: string;
      capabilities: string;
      metadata: string | null;
      presence: string;
      created_at: number;
      last_seen_at: number;
    }>(
      'SELECT * FROM _sync_devices WHERE device_id != ?',
      [this._currentDevice?.deviceId ?? '']
    );

    for (const row of rows) {
      const device: DeviceInfo = {
        deviceId: row.device_id,
        deviceType: row.device_type as DeviceType,
        deviceName: row.device_name,
        vectorClock: JSON.parse(row.vector_clock),
        capabilities: JSON.parse(row.capabilities),
        metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
        presence: row.presence as PresenceStatus,
        createdAt: row.created_at,
        lastSeenAt: row.last_seen_at,
      };

      this._peers.set(device.deviceId, device);
    }
  }

  /**
   * Start heartbeat timer.
   */
  private _startHeartbeat(): void {
    if (this._heartbeatTimer) return;

    this._heartbeatTimer = setInterval(async () => {
      // Update own presence
      if (this._currentDevice) {
        this._currentDevice.lastSeenAt = Date.now();
        await this._saveDevice(this._currentDevice);
      }

      // Check for stale devices
      await this.checkStaleDevices();
    }, this._options.heartbeatInterval);
  }
}

/**
 * Create a device manager instance.
 */
export const createDeviceManager = (
  options: DeviceManagerOptions
): DeviceManager => {
  return new DeviceManager(options);
};
