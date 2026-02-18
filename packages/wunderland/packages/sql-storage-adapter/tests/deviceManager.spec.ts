import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  DeviceManager,
  createDeviceManager,
  type DeviceInfo,
  type DeviceManagerOptions,
  type PresenceStatus,
} from '../src/features/sync/devices/deviceManager';
import type { StorageAdapter } from '../src/core/contracts';
import { createVectorClock } from '../src/features/sync/protocol/vectorClock';

const createMockAdapter = (): StorageAdapter => {
  const storage = new Map<string, unknown[]>();

  return {
    exec: vi.fn().mockResolvedValue(undefined),
    run: vi.fn().mockImplementation(async (sql: string, params?: unknown[]) => {
      if (sql.includes('INSERT') || sql.includes('REPLACE')) {
        // Store in mock storage
        const table = sql.match(/INTO\s+(\w+)/)?.[1] || 'default';
        if (!storage.has(table)) storage.set(table, []);
        storage.get(table)!.push(params);
      } else if (sql.includes('DELETE')) {
        // Clear from mock storage
      }
      return { changes: 1, lastInsertRowid: 1 };
    }),
    get: vi.fn().mockResolvedValue(null),
    all: vi.fn().mockResolvedValue([]),
    close: vi.fn().mockResolvedValue(undefined),
  } as unknown as StorageAdapter;
};

describe('DeviceManager', () => {
  let adapter: StorageAdapter;
  let manager: DeviceManager;

  beforeEach(() => {
    vi.useFakeTimers();
    adapter = createMockAdapter();
  });

  afterEach(async () => {
    if (manager) {
      await manager.dispose();
    }
    vi.useRealTimers();
  });

  describe('constructor', () => {
    it('should create manager with default options', () => {
      manager = new DeviceManager({ adapter });
      expect(manager).toBeInstanceOf(DeviceManager);
    });

    it('should create manager with custom options', () => {
      manager = new DeviceManager({
        adapter,
        presenceTimeout: 120000,
        heartbeatInterval: 60000,
        autoDetect: false,
        deviceName: 'Test Device',
      });
      expect(manager).toBeInstanceOf(DeviceManager);
    });
  });

  describe('initialize', () => {
    it('should create tables on initialization', async () => {
      manager = new DeviceManager({ adapter });
      await manager.initialize();

      expect(adapter.exec).toHaveBeenCalled();
      const execCall = (adapter.exec as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(execCall).toContain('CREATE TABLE IF NOT EXISTS _sync_devices');
    });

    it('should register current device', async () => {
      manager = new DeviceManager({ adapter, deviceName: 'Test Device' });
      await manager.initialize();

      const currentDevice = manager.getCurrentDevice();
      expect(currentDevice).not.toBeNull();
      expect(currentDevice?.deviceName).toBe('Test Device');
      expect(currentDevice?.presence).toBe('online');
    });

    it('should not re-initialize if already initialized', async () => {
      manager = new DeviceManager({ adapter });
      await manager.initialize();

      // Track how many exec calls after first init
      const execCallsAfterFirstInit = (adapter.exec as ReturnType<typeof vi.fn>).mock.calls.length;

      await manager.initialize();

      // Re-initializing should not add more exec calls
      const execCallsAfterSecondInit = (adapter.exec as ReturnType<typeof vi.fn>).mock.calls.length;
      expect(execCallsAfterSecondInit).toBe(execCallsAfterFirstInit);
    });

    it('should emit deviceRegistered event', async () => {
      manager = new DeviceManager({ adapter });
      const listener = vi.fn();
      manager.on('deviceRegistered', listener);

      await manager.initialize();

      expect(listener).toHaveBeenCalledOnce();
      expect(listener.mock.calls[0][0].deviceId).toBeDefined();
    });

    it('should load existing device from storage', async () => {
      const existingDeviceId = 'existing-device-123';
      const existingVectorClock = createVectorClock(existingDeviceId);

      // Mock localStorage
      const localStorageMock = {
        getItem: vi.fn().mockReturnValue(existingDeviceId),
        setItem: vi.fn(),
      };
      vi.stubGlobal('localStorage', localStorageMock);

      // Mock adapter to return existing device
      (adapter.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        device_id: existingDeviceId,
        device_type: 'electron',
        device_name: 'Existing Device',
        vector_clock: JSON.stringify(existingVectorClock.serialize()),
        capabilities: JSON.stringify({ realTimeSync: true, backgroundSync: true, pushNotifications: false, offlineMode: true, maxBatchSize: 1000 }),
        metadata: null,
        presence: 'offline',
        created_at: Date.now() - 86400000,
        last_seen_at: Date.now() - 3600000,
      });

      manager = new DeviceManager({ adapter });
      await manager.initialize();

      const currentDevice = manager.getCurrentDevice();
      expect(currentDevice?.deviceId).toBe(existingDeviceId);
      expect(currentDevice?.presence).toBe('online'); // Should be updated to online

      vi.unstubAllGlobals();
    });
  });

  describe('getCurrentDevice', () => {
    it('should return null before initialization', () => {
      manager = new DeviceManager({ adapter });
      expect(manager.getCurrentDevice()).toBeNull();
    });

    it('should return device after initialization', async () => {
      manager = new DeviceManager({ adapter });
      await manager.initialize();

      const device = manager.getCurrentDevice();
      expect(device).not.toBeNull();
      expect(device?.deviceId).toBeDefined();
      expect(device?.vectorClock).toBeDefined();
    });
  });

  describe('getPeers', () => {
    it('should return empty array initially', async () => {
      manager = new DeviceManager({ adapter });
      await manager.initialize();

      const peers = await manager.getPeers();
      expect(peers).toEqual([]);
    });

    it('should return registered peers', async () => {
      manager = new DeviceManager({ adapter });
      await manager.initialize();

      const peerInfo: DeviceInfo = {
        deviceId: 'peer-1',
        deviceType: 'browser',
        deviceName: 'Peer Device',
        vectorClock: createVectorClock('peer-1'),
        createdAt: Date.now(),
        lastSeenAt: Date.now(),
        presence: 'online',
        capabilities: {
          realTimeSync: true,
          backgroundSync: false,
          pushNotifications: false,
          offlineMode: true,
          maxBatchSize: 500,
        },
      };

      await manager.registerPeer(peerInfo);
      const peers = await manager.getPeers();

      expect(peers).toHaveLength(1);
      expect(peers[0].deviceId).toBe('peer-1');
    });
  });

  describe('getOnlinePeers', () => {
    it('should filter out stale peers', async () => {
      manager = new DeviceManager({ adapter, presenceTimeout: 60000 });
      await manager.initialize();

      const onlinePeer: DeviceInfo = {
        deviceId: 'peer-online',
        deviceType: 'browser',
        deviceName: 'Online Peer',
        vectorClock: createVectorClock('peer-online'),
        createdAt: Date.now(),
        lastSeenAt: Date.now(),
        presence: 'online',
        capabilities: { realTimeSync: true, backgroundSync: false, pushNotifications: false, offlineMode: true, maxBatchSize: 500 },
      };

      const stalePeer: DeviceInfo = {
        deviceId: 'peer-stale',
        deviceType: 'browser',
        deviceName: 'Stale Peer',
        vectorClock: createVectorClock('peer-stale'),
        createdAt: Date.now() - 120000,
        lastSeenAt: Date.now() - 120000, // Over timeout
        presence: 'online',
        capabilities: { realTimeSync: true, backgroundSync: false, pushNotifications: false, offlineMode: true, maxBatchSize: 500 },
      };

      await manager.registerPeer(onlinePeer);
      await manager.registerPeer(stalePeer);

      const onlinePeers = await manager.getOnlinePeers();
      expect(onlinePeers).toHaveLength(1);
      expect(onlinePeers[0].deviceId).toBe('peer-online');
    });
  });

  describe('getDevice', () => {
    it('should return current device by ID', async () => {
      manager = new DeviceManager({ adapter });
      await manager.initialize();

      const currentDevice = manager.getCurrentDevice()!;
      const device = await manager.getDevice(currentDevice.deviceId);

      expect(device).toBe(currentDevice);
    });

    it('should return peer by ID', async () => {
      manager = new DeviceManager({ adapter });
      await manager.initialize();

      const peerInfo: DeviceInfo = {
        deviceId: 'peer-1',
        deviceType: 'browser',
        deviceName: 'Peer',
        vectorClock: createVectorClock('peer-1'),
        createdAt: Date.now(),
        lastSeenAt: Date.now(),
        presence: 'online',
        capabilities: { realTimeSync: true, backgroundSync: false, pushNotifications: false, offlineMode: true, maxBatchSize: 500 },
      };

      await manager.registerPeer(peerInfo);
      const device = await manager.getDevice('peer-1');

      expect(device?.deviceId).toBe('peer-1');
    });

    it('should return null for unknown device', async () => {
      manager = new DeviceManager({ adapter });
      await manager.initialize();

      const device = await manager.getDevice('unknown-device');
      expect(device).toBeNull();
    });
  });

  describe('updatePresence', () => {
    it('should update current device presence', async () => {
      manager = new DeviceManager({ adapter });
      await manager.initialize();

      await manager.updatePresence('syncing');

      const device = manager.getCurrentDevice();
      expect(device?.presence).toBe('syncing');
    });

    it('should emit presenceChanged event', async () => {
      manager = new DeviceManager({ adapter });
      await manager.initialize();

      const listener = vi.fn();
      manager.on('presenceChanged', listener);

      await manager.updatePresence('away');

      expect(listener).toHaveBeenCalledOnce();
      expect(listener.mock.calls[0][0].previousStatus).toBe('online');
      expect(listener.mock.calls[0][0].currentStatus).toBe('away');
    });

    it('should do nothing if not initialized', async () => {
      manager = new DeviceManager({ adapter });

      await manager.updatePresence('offline');

      // Should not throw
      expect(manager.getCurrentDevice()).toBeNull();
    });
  });

  describe('updateVectorClock', () => {
    it('should update current device vector clock', async () => {
      manager = new DeviceManager({ adapter });
      await manager.initialize();

      const newClock = createVectorClock('device-1');
      newClock.tick();
      newClock.tick();

      await manager.updateVectorClock(newClock);

      const device = manager.getCurrentDevice();
      expect(device?.vectorClock).toBe(newClock);
    });
  });

  describe('registerPeer', () => {
    it('should add new peer', async () => {
      manager = new DeviceManager({ adapter });
      await manager.initialize();

      const listener = vi.fn();
      manager.on('peerDiscovered', listener);

      const peerInfo: DeviceInfo = {
        deviceId: 'new-peer',
        deviceType: 'capacitor',
        deviceName: 'Mobile Device',
        vectorClock: createVectorClock('new-peer'),
        createdAt: Date.now(),
        lastSeenAt: Date.now(),
        presence: 'online',
        capabilities: { realTimeSync: true, backgroundSync: true, pushNotifications: true, offlineMode: true, maxBatchSize: 500 },
      };

      await manager.registerPeer(peerInfo);

      expect(listener).toHaveBeenCalledWith(peerInfo);
    });

    it('should update existing peer', async () => {
      manager = new DeviceManager({ adapter });
      await manager.initialize();

      const listener = vi.fn();
      manager.on('deviceUpdated', listener);

      const peerInfo: DeviceInfo = {
        deviceId: 'peer-1',
        deviceType: 'browser',
        deviceName: 'Peer',
        vectorClock: createVectorClock('peer-1'),
        createdAt: Date.now(),
        lastSeenAt: Date.now(),
        presence: 'online',
        capabilities: { realTimeSync: true, backgroundSync: false, pushNotifications: false, offlineMode: true, maxBatchSize: 500 },
      };

      await manager.registerPeer(peerInfo);

      // Update with newer timestamp
      const updatedPeer: DeviceInfo = {
        ...peerInfo,
        lastSeenAt: Date.now() + 1000,
        presence: 'syncing',
      };

      await manager.registerPeer(updatedPeer);

      expect(listener).toHaveBeenCalled();
    });
  });

  describe('removeDevice', () => {
    it('should remove peer device', async () => {
      manager = new DeviceManager({ adapter });
      await manager.initialize();

      const peerInfo: DeviceInfo = {
        deviceId: 'peer-to-remove',
        deviceType: 'browser',
        deviceName: 'Peer',
        vectorClock: createVectorClock('peer-to-remove'),
        createdAt: Date.now(),
        lastSeenAt: Date.now(),
        presence: 'online',
        capabilities: { realTimeSync: true, backgroundSync: false, pushNotifications: false, offlineMode: true, maxBatchSize: 500 },
      };

      await manager.registerPeer(peerInfo);
      let peers = await manager.getPeers();
      expect(peers).toHaveLength(1);

      await manager.removeDevice('peer-to-remove', 'test');

      peers = await manager.getPeers();
      expect(peers).toHaveLength(0);
    });

    it('should emit deviceRemoved event', async () => {
      manager = new DeviceManager({ adapter });
      await manager.initialize();

      const listener = vi.fn();
      manager.on('deviceRemoved', listener);

      const peerInfo: DeviceInfo = {
        deviceId: 'peer-1',
        deviceType: 'browser',
        deviceName: 'Peer',
        vectorClock: createVectorClock('peer-1'),
        createdAt: Date.now(),
        lastSeenAt: Date.now(),
        presence: 'online',
        capabilities: { realTimeSync: true, backgroundSync: false, pushNotifications: false, offlineMode: true, maxBatchSize: 500 },
      };

      await manager.registerPeer(peerInfo);
      await manager.removeDevice('peer-1', 'user requested');

      expect(listener).toHaveBeenCalledWith({
        deviceId: 'peer-1',
        reason: 'user requested',
      });
    });

    it('should throw when removing current device', async () => {
      manager = new DeviceManager({ adapter });
      await manager.initialize();

      const currentDevice = manager.getCurrentDevice()!;

      await expect(
        manager.removeDevice(currentDevice.deviceId)
      ).rejects.toThrow('Cannot remove current device');
    });
  });

  describe('checkStaleDevices', () => {
    it('should mark stale peers as offline', async () => {
      manager = new DeviceManager({ adapter, presenceTimeout: 1000 });
      await manager.initialize();

      const peerInfo: DeviceInfo = {
        deviceId: 'stale-peer',
        deviceType: 'browser',
        deviceName: 'Stale Peer',
        vectorClock: createVectorClock('stale-peer'),
        createdAt: Date.now(),
        lastSeenAt: Date.now(),
        presence: 'online',
        capabilities: { realTimeSync: true, backgroundSync: false, pushNotifications: false, offlineMode: true, maxBatchSize: 500 },
      };

      await manager.registerPeer(peerInfo);

      // Advance time beyond timeout
      vi.advanceTimersByTime(2000);

      const presenceListener = vi.fn();
      const peerLostListener = vi.fn();
      manager.on('presenceChanged', presenceListener);
      manager.on('peerLost', peerLostListener);

      await manager.checkStaleDevices();

      expect(presenceListener).toHaveBeenCalled();
      expect(peerLostListener).toHaveBeenCalledWith({
        deviceId: 'stale-peer',
        lastSeenAt: expect.any(Number),
      });
    });
  });

  describe('on', () => {
    it('should register event listener', async () => {
      manager = new DeviceManager({ adapter });
      const listener = vi.fn();

      manager.on('presenceChanged', listener);
      await manager.initialize();
      await manager.updatePresence('away');

      expect(listener).toHaveBeenCalled();
    });

    it('should return unsubscribe function', async () => {
      manager = new DeviceManager({ adapter });
      const listener = vi.fn();

      const unsubscribe = manager.on('presenceChanged', listener);
      await manager.initialize();

      unsubscribe();
      await manager.updatePresence('away');

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('dispose', () => {
    it('should stop heartbeat timer', async () => {
      manager = new DeviceManager({ adapter, heartbeatInterval: 1000 });
      await manager.initialize();

      await manager.dispose();

      // Advance time - no errors should occur
      vi.advanceTimersByTime(5000);
    });

    it('should mark device as offline', async () => {
      manager = new DeviceManager({ adapter });
      await manager.initialize();

      const listener = vi.fn();
      manager.on('presenceChanged', listener);

      await manager.dispose();

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          currentStatus: 'offline',
        })
      );
    });

    it('should clear all state', async () => {
      manager = new DeviceManager({ adapter });
      await manager.initialize();

      await manager.dispose();

      expect(manager.getCurrentDevice()).toBeNull();
    });
  });
});

describe('createDeviceManager', () => {
  it('should create a DeviceManager instance', () => {
    const adapter = createMockAdapter();
    const manager = createDeviceManager({ adapter });

    expect(manager).toBeInstanceOf(DeviceManager);
  });
});
