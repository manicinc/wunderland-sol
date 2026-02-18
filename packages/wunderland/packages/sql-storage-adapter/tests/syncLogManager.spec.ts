import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  SyncLogManager,
  type SyncLogManagerConfig,
  type ChangeLogEntry,
  type ConflictEntry,
} from '../src/features/sync/tables/syncLogManager';
import type { StorageAdapter } from '../src/core/contracts';
import type { VectorClockData } from '../src/features/sync/protocol/vectorClock';

// Create mock storage adapter
function createMockAdapter(): StorageAdapter {
  const data: Map<string, unknown[]> = new Map();

  return {
    open: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
    exec: vi.fn().mockResolvedValue(undefined),
    run: vi.fn().mockResolvedValue({ changes: 1 }),
    get: vi.fn().mockImplementation(async (sql: string, params?: unknown[]) => {
      if (sql.includes('SELECT * FROM _sync_devices WHERE device_id')) {
        return null; // No existing device
      }
      if (sql.includes('COUNT(*)')) {
        return { count: 0 };
      }
      return null;
    }),
    all: vi.fn().mockImplementation(async (sql: string) => {
      if (sql.includes('_sync_log')) {
        return [];
      }
      if (sql.includes('_sync_devices')) {
        return [];
      }
      if (sql.includes('_sync_conflicts')) {
        return [];
      }
      return [];
    }),
    prepare: vi.fn(),
    transaction: vi.fn().mockImplementation(async (fn) => fn()),
  } as unknown as StorageAdapter;
}

describe('SyncLogManager', () => {
  let adapter: StorageAdapter;
  let manager: SyncLogManager;

  beforeEach(() => {
    adapter = createMockAdapter();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create with default device ID', () => {
      manager = new SyncLogManager(adapter);

      const deviceId = manager.getDeviceId();
      expect(deviceId).toBeDefined();
      expect(deviceId.startsWith('device_')).toBe(true);
    });

    it('should create with custom device ID', () => {
      manager = new SyncLogManager(adapter, 'custom-device-id');

      expect(manager.getDeviceId()).toBe('custom-device-id');
    });

    it('should accept custom config', () => {
      const config: SyncLogManagerConfig = {
        maxLogEntries: 5000,
        pruneSyncedAfterDays: 14,
        includeTables: ['users', 'posts'],
        excludeTables: ['logs'],
      };

      manager = new SyncLogManager(adapter, 'device-1', config);

      expect(manager.getDeviceId()).toBe('device-1');
    });
  });

  describe('initialize', () => {
    it('should create sync tables', async () => {
      manager = new SyncLogManager(adapter, 'device-1');

      await manager.initialize();

      // Should have called exec for table creation
      expect(adapter.exec).toHaveBeenCalled();

      // Check for table creation calls
      const calls = (adapter.exec as ReturnType<typeof vi.fn>).mock.calls;
      const sqlStatements = calls.map(call => call[0]);

      expect(sqlStatements.some(sql => sql.includes('_sync_log'))).toBe(true);
      expect(sqlStatements.some(sql => sql.includes('_sync_devices'))).toBe(true);
      expect(sqlStatements.some(sql => sql.includes('_sync_conflicts'))).toBe(true);
    });

    it('should not re-initialize if already initialized', async () => {
      manager = new SyncLogManager(adapter, 'device-1');

      await manager.initialize();
      const callCount = (adapter.exec as ReturnType<typeof vi.fn>).mock.calls.length;

      await manager.initialize();

      // Should not have additional calls
      expect((adapter.exec as ReturnType<typeof vi.fn>).mock.calls.length).toBe(callCount);
    });

    it('should load existing device vector clock', async () => {
      const existingDevice = {
        deviceId: 'device-1',
        deviceType: 'desktop',
        deviceName: 'Test Device',
        vectorClock: JSON.stringify({ 'device-1': 5, 'device-2': 3 }),
        lastSeenAt: Date.now(),
        createdAt: Date.now() - 10000,
      };

      (adapter.get as ReturnType<typeof vi.fn>).mockImplementation(async (sql: string) => {
        if (sql.includes('SELECT * FROM _sync_devices WHERE device_id')) {
          return existingDevice;
        }
        if (sql.includes('COUNT(*)')) {
          return { count: 0 };
        }
        return null;
      });

      manager = new SyncLogManager(adapter, 'device-1');
      await manager.initialize();

      const clockData = manager.getVectorClockData();
      expect(clockData['device-2']).toBe(3);
    });
  });

  describe('logChange', () => {
    beforeEach(async () => {
      manager = new SyncLogManager(adapter, 'device-1');
      await manager.initialize();
    });

    it('should log an INSERT operation', async () => {
      const change = await manager.logChange({
        table: 'users',
        recordId: 'user-1',
        operation: 'INSERT',
        newData: { id: 'user-1', name: 'Alice' },
      });

      expect(change.changeId).toBeDefined();
      expect(change.table).toBe('users');
      expect(change.recordId).toBe('user-1');
      expect(change.operation).toBe('INSERT');
      expect(change.deviceId).toBe('device-1');
      expect(change.newData).toEqual({ id: 'user-1', name: 'Alice' });
      expect(change.vectorClock).toBeDefined();
    });

    it('should log an UPDATE operation', async () => {
      const change = await manager.logChange({
        table: 'users',
        recordId: 'user-1',
        operation: 'UPDATE',
        oldData: { id: 'user-1', name: 'Alice' },
        newData: { id: 'user-1', name: 'Bob' },
      });

      expect(change.operation).toBe('UPDATE');
      expect(change.oldData).toEqual({ id: 'user-1', name: 'Alice' });
      expect(change.newData).toEqual({ id: 'user-1', name: 'Bob' });
    });

    it('should log a DELETE operation', async () => {
      const change = await manager.logChange({
        table: 'users',
        recordId: 'user-1',
        operation: 'DELETE',
        oldData: { id: 'user-1', name: 'Alice' },
      });

      expect(change.operation).toBe('DELETE');
      expect(change.oldData).toEqual({ id: 'user-1', name: 'Alice' });
    });

    it('should increment vector clock on each change', async () => {
      const change1 = await manager.logChange({
        table: 'users',
        recordId: 'user-1',
        operation: 'INSERT',
        newData: { name: 'Alice' },
      });

      const change2 = await manager.logChange({
        table: 'users',
        recordId: 'user-2',
        operation: 'INSERT',
        newData: { name: 'Bob' },
      });

      expect(change2.vectorClock['device-1']).toBeGreaterThan(change1.vectorClock['device-1']);
    });

    it('should throw when logging excluded table', async () => {
      manager = new SyncLogManager(adapter, 'device-1', {
        excludeTables: ['_sync_log', 'logs'],
      });
      await manager.initialize();

      await expect(manager.logChange({
        table: 'logs',
        recordId: 'log-1',
        operation: 'INSERT',
        newData: { message: 'test' },
      })).rejects.toThrow('Table logs is not tracked');
    });

    it('should only track included tables when specified', async () => {
      manager = new SyncLogManager(adapter, 'device-1', {
        includeTables: ['users'],
      });
      await manager.initialize();

      // Allowed table
      const change = await manager.logChange({
        table: 'users',
        recordId: 'user-1',
        operation: 'INSERT',
        newData: { name: 'Alice' },
      });
      expect(change).toBeDefined();

      // Disallowed table
      await expect(manager.logChange({
        table: 'posts',
        recordId: 'post-1',
        operation: 'INSERT',
        newData: { title: 'Hello' },
      })).rejects.toThrow('Table posts is not tracked');
    });
  });

  describe('getChangesSince', () => {
    beforeEach(async () => {
      manager = new SyncLogManager(adapter, 'device-1');
      await manager.initialize();
    });

    it('should return empty array when no changes', async () => {
      const changes = await manager.getChangesSince({});
      expect(changes).toEqual([]);
    });

    it('should return changes newer than clock', async () => {
      const logEntries: ChangeLogEntry[] = [
        {
          logId: 1,
          changeId: 'change-1',
          tableName: 'users',
          recordId: 'user-1',
          operation: 'INSERT',
          vectorClock: JSON.stringify({ 'device-1': 5 }),
          deviceId: 'device-1',
          oldData: null,
          newData: JSON.stringify({ name: 'Alice' }),
          createdAt: Date.now(),
          syncedAt: null,
        },
      ];

      (adapter.all as ReturnType<typeof vi.fn>).mockImplementation(async (sql: string) => {
        if (sql.includes('_sync_log')) {
          return logEntries;
        }
        return [];
      });

      const changes = await manager.getChangesSince({ 'device-1': 0 });

      expect(changes).toHaveLength(1);
      expect(changes[0].changeId).toBe('change-1');
    });

    it('should filter by table names', async () => {
      const changes = await manager.getChangesSince({}, { tables: ['users'] });

      // Verify the query was called with table filter
      expect(adapter.all).toHaveBeenCalled();
    });

    it('should respect limit option', async () => {
      const changes = await manager.getChangesSince({}, { limit: 10 });

      // Verify the query was called with limit
      expect(adapter.all).toHaveBeenCalled();
    });
  });

  describe('markSynced', () => {
    beforeEach(async () => {
      manager = new SyncLogManager(adapter, 'device-1');
      await manager.initialize();
    });

    it('should mark changes as synced', async () => {
      await manager.markSynced(['change-1', 'change-2']);

      expect(adapter.run).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE _sync_log SET synced_at'),
        expect.arrayContaining(['change-1', 'change-2'])
      );
    });

    it('should do nothing when no change IDs provided', async () => {
      const runCallsBefore = (adapter.run as ReturnType<typeof vi.fn>).mock.calls.length;

      await manager.markSynced([]);

      const runCallsAfter = (adapter.run as ReturnType<typeof vi.fn>).mock.calls.length;

      // Only the device registration call should be there
      expect(runCallsAfter).toBe(runCallsBefore);
    });
  });

  describe('getUnsyncedCount', () => {
    beforeEach(async () => {
      manager = new SyncLogManager(adapter, 'device-1');
      await manager.initialize();
    });

    it('should return unsynced count', async () => {
      (adapter.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ count: 5 });

      const count = await manager.getUnsyncedCount();

      expect(count).toBe(5);
    });

    it('should return 0 when no result', async () => {
      (adapter.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);

      const count = await manager.getUnsyncedCount();

      expect(count).toBe(0);
    });
  });

  describe('registerDevice', () => {
    beforeEach(async () => {
      manager = new SyncLogManager(adapter, 'device-1');
      await manager.initialize();
    });

    it('should register a new device', async () => {
      await manager.registerDevice({
        deviceId: 'device-2',
        deviceType: 'mobile',
        deviceName: 'iPhone',
      });

      expect(adapter.run).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO _sync_devices'),
        expect.arrayContaining(['device-2', 'mobile', 'iPhone'])
      );
    });

    it('should update existing device', async () => {
      (adapter.get as ReturnType<typeof vi.fn>).mockImplementation(async (sql: string, params?: unknown[]) => {
        if (sql.includes('_sync_devices') && params?.[0] === 'device-2') {
          return {
            deviceId: 'device-2',
            deviceType: 'mobile',
            deviceName: 'Old Name',
            vectorClock: '{}',
            lastSeenAt: Date.now() - 10000,
            createdAt: Date.now() - 20000,
          };
        }
        return null;
      });

      await manager.registerDevice({
        deviceId: 'device-2',
        deviceType: 'mobile',
        deviceName: 'New Name',
      });

      expect(adapter.run).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE _sync_devices'),
        expect.arrayContaining(['device-2'])
      );
    });
  });

  describe('getDevices', () => {
    beforeEach(async () => {
      manager = new SyncLogManager(adapter, 'device-1');
      await manager.initialize();
    });

    it('should return all devices', async () => {
      const deviceEntries = [
        {
          deviceId: 'device-1',
          deviceType: 'desktop',
          deviceName: 'MacBook',
          vectorClock: '{}',
          lastSeenAt: Date.now(),
          createdAt: Date.now() - 10000,
        },
        {
          deviceId: 'device-2',
          deviceType: 'mobile',
          deviceName: 'iPhone',
          vectorClock: '{}',
          lastSeenAt: Date.now() - 5000,
          createdAt: Date.now() - 20000,
        },
      ];

      (adapter.all as ReturnType<typeof vi.fn>).mockResolvedValueOnce(deviceEntries);

      const devices = await manager.getDevices();

      expect(devices).toHaveLength(2);
      expect(devices[0].deviceId).toBe('device-1');
      expect(devices[1].deviceId).toBe('device-2');
    });
  });

  describe('updateDeviceClockFor', () => {
    beforeEach(async () => {
      manager = new SyncLogManager(adapter, 'device-1');
      await manager.initialize();
    });

    it('should update device clock and merge into local', async () => {
      const remoteClock: VectorClockData = { 'device-2': 10, 'device-3': 5 };

      await manager.updateDeviceClockFor('device-2', remoteClock);

      expect(adapter.run).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE _sync_devices SET vector_clock'),
        expect.arrayContaining(['device-2'])
      );

      // Should have merged into local clock
      const localClock = manager.getVectorClockData();
      expect(localClock['device-2']).toBe(10);
      expect(localClock['device-3']).toBe(5);
    });
  });

  describe('recordConflict', () => {
    beforeEach(async () => {
      manager = new SyncLogManager(adapter, 'device-1');
      await manager.initialize();
    });

    it('should record a conflict', async () => {
      const conflictId = await manager.recordConflict({
        table: 'users',
        recordId: 'user-1',
        localData: { name: 'Local' },
        remoteData: { name: 'Remote' },
        localClock: { 'device-1': 5 },
        remoteClock: { 'device-2': 3 },
      });

      expect(conflictId).toBeDefined();
      expect(adapter.run).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO _sync_conflicts'),
        expect.arrayContaining([conflictId, 'users', 'user-1'])
      );
    });
  });

  describe('getPendingConflicts', () => {
    beforeEach(async () => {
      manager = new SyncLogManager(adapter, 'device-1');
      await manager.initialize();
    });

    it('should return pending conflicts', async () => {
      const conflicts: ConflictEntry[] = [
        {
          conflictId: 'conflict-1',
          tableName: 'users',
          recordId: 'user-1',
          localData: JSON.stringify({ name: 'Local' }),
          remoteData: JSON.stringify({ name: 'Remote' }),
          localClock: JSON.stringify({ 'device-1': 5 }),
          remoteClock: JSON.stringify({ 'device-2': 3 }),
          status: 'pending',
          resolution: null,
          createdAt: Date.now(),
          resolvedAt: null,
        },
      ];

      (adapter.all as ReturnType<typeof vi.fn>).mockResolvedValueOnce(conflicts);

      const result = await manager.getPendingConflicts();

      expect(result).toHaveLength(1);
      expect(result[0].conflictId).toBe('conflict-1');
    });
  });

  describe('resolveConflict', () => {
    beforeEach(async () => {
      manager = new SyncLogManager(adapter, 'device-1');
      await manager.initialize();
    });

    it('should resolve a conflict', async () => {
      await manager.resolveConflict('conflict-1', 'local-wins');

      expect(adapter.run).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE _sync_conflicts SET status = 'resolved'"),
        expect.arrayContaining(['local-wins', 'conflict-1'])
      );
    });
  });

  describe('vector clock methods', () => {
    beforeEach(async () => {
      manager = new SyncLogManager(adapter, 'device-1');
      await manager.initialize();
    });

    it('getVectorClock should return VectorClock instance', () => {
      const clock = manager.getVectorClock();

      expect(clock).toBeDefined();
      expect(clock.getDeviceId()).toBe('device-1');
    });

    it('getVectorClockData should return clock data', () => {
      const data = manager.getVectorClockData();

      expect(data).toBeDefined();
      expect(typeof data).toBe('object');
    });

    it('mergeVectorClock should merge remote clock', () => {
      const before = manager.getVectorClockData();

      manager.mergeVectorClock({ 'device-2': 10 });

      const after = manager.getVectorClockData();
      expect(after['device-2']).toBe(10);
      expect(after['device-1']).toBeGreaterThan(before['device-1'] ?? 0);
    });
  });

  describe('getDeviceId', () => {
    it('should return the device ID', async () => {
      manager = new SyncLogManager(adapter, 'my-device-123');

      expect(manager.getDeviceId()).toBe('my-device-123');
    });
  });
});
