import { describe, it, expect } from 'vitest';
import {
  generateMessageId,
  createBaseMessage,
  createHandshakeRequest,
  createAck,
  createHeartbeat,
  createError,
  createDeltaPushMessage,
  createDeltaPullRequest,
  createPresenceMessage,
  createHeartbeatMessage,
  createAckMessage,
  createChangeRecord,
  generateChangeId,
  isHandshakeRequest,
  isDeltaPush,
  isConflict,
  isError,
  isSyncMessage,
  type DeviceInfo,
  type VectorClockData,
  type SyncMessage,
  type ChangeRecord,
} from '../src/features/sync/protocol/messages';

describe('generateMessageId', () => {
  it('should generate unique message IDs', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      ids.add(generateMessageId());
    }
    expect(ids.size).toBe(100);
  });

  it('should generate IDs starting with "msg_"', () => {
    const id = generateMessageId();
    expect(id.startsWith('msg_')).toBe(true);
  });

  it('should generate IDs with timestamp and random parts', () => {
    const id = generateMessageId();
    const parts = id.split('_');
    expect(parts).toHaveLength(3);
    expect(parts[0]).toBe('msg');
  });
});

describe('generateChangeId', () => {
  it('should generate unique change IDs', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      ids.add(generateChangeId());
    }
    expect(ids.size).toBe(100);
  });

  it('should generate IDs starting with "chg_"', () => {
    const id = generateChangeId();
    expect(id.startsWith('chg_')).toBe(true);
  });
});

describe('createBaseMessage', () => {
  it('should create base message with required fields', () => {
    const msg = createBaseMessage('test_type', 'device-1');

    expect(msg.type).toBe('test_type');
    expect(msg.deviceId).toBe('device-1');
    expect(msg.messageId).toBeDefined();
    expect(msg.messageId.startsWith('msg_')).toBe(true);
    expect(typeof msg.timestamp).toBe('number');
    expect(msg.timestamp).toBeGreaterThan(0);
  });
});

describe('createHandshakeRequest', () => {
  it('should create a handshake request message', () => {
    const device: DeviceInfo = {
      deviceId: 'device-1',
      deviceType: 'electron',
      deviceName: 'Test Device',
    };
    const vectorClock: VectorClockData = { 'device-1': 5 };
    const tables = ['notes', 'settings'];

    const msg = createHandshakeRequest(device, vectorClock, tables);

    expect(msg.type).toBe('handshake_request');
    expect(msg.device).toEqual(device);
    expect(msg.vectorClock).toEqual(vectorClock);
    expect(msg.tables).toEqual(tables);
    expect(msg.protocolVersion).toBe(1);
    expect(msg.capabilities).toContain('gzip');
    expect(msg.capabilities).toContain('delta');
  });

  it('should allow custom capabilities', () => {
    const device: DeviceInfo = { deviceId: 'device-1', deviceType: 'browser' };
    const vectorClock: VectorClockData = {};
    const tables = ['data'];
    const capabilities = ['custom', 'caps'];

    const msg = createHandshakeRequest(device, vectorClock, tables, capabilities);

    expect(msg.capabilities).toEqual(['custom', 'caps']);
  });
});

describe('createAck', () => {
  it('should create an ack message for success', () => {
    const msg = createAck('device-1', 'msg_123', true);

    expect(msg.type).toBe('ack');
    expect(msg.deviceId).toBe('device-1');
    expect(msg.ackMessageId).toBe('msg_123');
    expect(msg.success).toBe(true);
    expect(msg.error).toBeUndefined();
  });

  it('should create an ack message for failure', () => {
    const msg = createAck('device-1', 'msg_123', false, 'Something went wrong');

    expect(msg.type).toBe('ack');
    expect(msg.success).toBe(false);
    expect(msg.error).toBe('Something went wrong');
  });
});

describe('createAckMessage', () => {
  it('should create ack message with defaults', () => {
    const msg = createAckMessage('device-1', 'msg_456');

    expect(msg.type).toBe('ack');
    expect(msg.ackMessageId).toBe('msg_456');
    expect(msg.success).toBe(true);
    expect(msg.error).toBeUndefined();
  });

  it('should create ack message with error', () => {
    const msg = createAckMessage('device-1', 'msg_456', false, 'Error!');

    expect(msg.success).toBe(false);
    expect(msg.error).toBe('Error!');
  });
});

describe('createHeartbeat', () => {
  it('should create a heartbeat message', () => {
    const msg = createHeartbeat('device-1', 42);

    expect(msg.type).toBe('heartbeat');
    expect(msg.deviceId).toBe('device-1');
    expect(msg.sequence).toBe(42);
  });
});

describe('createHeartbeatMessage', () => {
  it('should create heartbeat with default sequence', () => {
    const msg = createHeartbeatMessage('device-1');

    expect(msg.type).toBe('heartbeat');
    expect(msg.sequence).toBe(0);
  });

  it('should create heartbeat with custom sequence', () => {
    const msg = createHeartbeatMessage('device-1', 99);

    expect(msg.sequence).toBe(99);
  });
});

describe('createError', () => {
  it('should create an error message', () => {
    const msg = createError('device-1', 'ERR_001', 'An error occurred');

    expect(msg.type).toBe('error');
    expect(msg.deviceId).toBe('device-1');
    expect(msg.code).toBe('ERR_001');
    expect(msg.message).toBe('An error occurred');
    expect(msg.recoverable).toBe(true);
  });

  it('should create non-recoverable error', () => {
    const msg = createError('device-1', 'FATAL', 'Critical error', false);

    expect(msg.recoverable).toBe(false);
  });

  it('should include related message ID', () => {
    const msg = createError('device-1', 'ERR', 'Error', true, 'msg_related');

    expect(msg.relatedMessageId).toBe('msg_related');
  });
});

describe('createDeltaPushMessage', () => {
  it('should create a delta push message', () => {
    const changes: ChangeRecord[] = [
      {
        changeId: 'chg_1',
        table: 'notes',
        recordId: 'rec_1',
        operation: 'INSERT',
        vectorClock: { 'device-1': 1 },
        deviceId: 'device-1',
        newData: { title: 'Test' },
        timestamp: Date.now(),
      },
    ];
    const vectorClock: VectorClockData = { 'device-1': 1 };

    const msg = createDeltaPushMessage('device-1', changes, vectorClock);

    expect(msg.type).toBe('delta_push');
    expect(msg.batch.changes).toEqual(changes);
    expect(msg.batch.sequence).toBe(1);
    expect(msg.batch.totalBatches).toBe(1);
    expect(msg.vectorClock).toEqual(vectorClock);
  });

  it('should allow custom sequence and totalBatches', () => {
    const msg = createDeltaPushMessage('device-1', [], {}, 3, 10);

    expect(msg.batch.sequence).toBe(3);
    expect(msg.batch.totalBatches).toBe(10);
  });
});

describe('createDeltaPullRequest', () => {
  it('should create a delta pull request', () => {
    const sinceVectorClock: VectorClockData = { 'device-1': 5 };

    const msg = createDeltaPullRequest('device-1', sinceVectorClock);

    expect(msg.type).toBe('delta_pull_request');
    expect(msg.sinceVectorClock).toEqual(sinceVectorClock);
    expect(msg.tables).toBeUndefined();
    expect(msg.limit).toBeUndefined();
  });

  it('should accept optional tables and limit', () => {
    const sinceVectorClock: VectorClockData = {};
    const tables = ['notes', 'tags'];
    const limit = 100;

    const msg = createDeltaPullRequest('device-1', sinceVectorClock, tables, limit);

    expect(msg.tables).toEqual(tables);
    expect(msg.limit).toBe(limit);
  });
});

describe('createPresenceMessage', () => {
  it('should create a presence message', () => {
    const device: DeviceInfo = {
      deviceId: 'device-1',
      deviceType: 'electron',
    };

    const msg = createPresenceMessage(device, 'online');

    expect(msg.type).toBe('presence');
    expect(msg.device).toEqual(device);
    expect(msg.status).toBe('online');
    expect(msg.vectorClock).toBeUndefined();
  });

  it('should include vector clock when provided', () => {
    const device: DeviceInfo = { deviceId: 'device-1', deviceType: 'browser' };
    const vectorClock: VectorClockData = { 'device-1': 10 };

    const msg = createPresenceMessage(device, 'syncing', vectorClock);

    expect(msg.vectorClock).toEqual(vectorClock);
    expect(msg.status).toBe('syncing');
  });

  it('should support all status values', () => {
    const device: DeviceInfo = { deviceId: 'device-1', deviceType: 'capacitor' };

    expect(createPresenceMessage(device, 'online').status).toBe('online');
    expect(createPresenceMessage(device, 'offline').status).toBe('offline');
    expect(createPresenceMessage(device, 'away').status).toBe('away');
    expect(createPresenceMessage(device, 'syncing').status).toBe('syncing');
  });
});

describe('createChangeRecord', () => {
  it('should create a change record for INSERT', () => {
    const vectorClock: VectorClockData = { 'device-1': 1 };
    const newData = { title: 'New Note', content: 'Hello' };

    const record = createChangeRecord(
      'notes',
      'rec_1',
      'INSERT',
      'device-1',
      vectorClock,
      newData
    );

    expect(record.changeId).toBeDefined();
    expect(record.changeId.startsWith('chg_')).toBe(true);
    expect(record.table).toBe('notes');
    expect(record.recordId).toBe('rec_1');
    expect(record.operation).toBe('INSERT');
    expect(record.deviceId).toBe('device-1');
    expect(record.vectorClock).toEqual(vectorClock);
    expect(record.newData).toEqual(newData);
    expect(record.oldData).toBeUndefined();
    expect(typeof record.timestamp).toBe('number');
    expect(record.synced).toBe(false);
  });

  it('should create a change record for UPDATE', () => {
    const vectorClock: VectorClockData = { 'device-1': 2 };
    const oldData = { title: 'Old Title' };
    const newData = { title: 'New Title' };

    const record = createChangeRecord(
      'notes',
      'rec_1',
      'UPDATE',
      'device-1',
      vectorClock,
      newData,
      oldData
    );

    expect(record.operation).toBe('UPDATE');
    expect(record.oldData).toEqual(oldData);
    expect(record.newData).toEqual(newData);
  });

  it('should create a change record for DELETE', () => {
    const vectorClock: VectorClockData = { 'device-1': 3 };
    const oldData = { title: 'Deleted Note' };

    const record = createChangeRecord(
      'notes',
      'rec_1',
      'DELETE',
      'device-1',
      vectorClock,
      undefined,
      oldData
    );

    expect(record.operation).toBe('DELETE');
    expect(record.oldData).toEqual(oldData);
    expect(record.newData).toBeUndefined();
  });
});

describe('Type Guards', () => {
  describe('isHandshakeRequest', () => {
    it('should return true for handshake request', () => {
      const device: DeviceInfo = { deviceId: 'device-1', deviceType: 'electron' };
      const msg = createHandshakeRequest(device, {}, []);

      expect(isHandshakeRequest(msg)).toBe(true);
    });

    it('should return false for other message types', () => {
      const msg = createHeartbeat('device-1', 1);
      expect(isHandshakeRequest(msg as SyncMessage)).toBe(false);
    });
  });

  describe('isDeltaPush', () => {
    it('should return true for delta push', () => {
      const msg = createDeltaPushMessage('device-1', [], {});

      expect(isDeltaPush(msg)).toBe(true);
    });

    it('should return false for other message types', () => {
      const msg = createHeartbeat('device-1', 1);
      expect(isDeltaPush(msg as SyncMessage)).toBe(false);
    });
  });

  describe('isConflict', () => {
    it('should return true for conflict message', () => {
      const msg: SyncMessage = {
        type: 'conflict',
        messageId: 'msg_1',
        deviceId: 'device-1',
        timestamp: Date.now(),
        table: 'notes',
        recordId: 'rec_1',
        localData: {},
        remoteData: {},
        localClock: {},
        remoteClock: {},
      };

      expect(isConflict(msg)).toBe(true);
    });

    it('should return false for other message types', () => {
      const msg = createHeartbeat('device-1', 1);
      expect(isConflict(msg as SyncMessage)).toBe(false);
    });
  });

  describe('isError', () => {
    it('should return true for error message', () => {
      const msg = createError('device-1', 'ERR', 'Error');

      expect(isError(msg)).toBe(true);
    });

    it('should return false for other message types', () => {
      const msg = createHeartbeat('device-1', 1);
      expect(isError(msg as SyncMessage)).toBe(false);
    });
  });

  describe('isSyncMessage', () => {
    it('should return true for valid sync messages', () => {
      const validMessages = [
        createHeartbeat('device-1', 1),
        createError('device-1', 'ERR', 'Error'),
        createAck('device-1', 'msg_1', true),
        createDeltaPushMessage('device-1', [], {}),
        createDeltaPullRequest('device-1', {}),
        createPresenceMessage({ deviceId: 'device-1', deviceType: 'electron' }, 'online'),
      ];

      for (const msg of validMessages) {
        expect(isSyncMessage(msg)).toBe(true);
      }
    });

    it('should return false for null', () => {
      expect(isSyncMessage(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isSyncMessage(undefined)).toBe(false);
    });

    it('should return false for non-object', () => {
      expect(isSyncMessage('string')).toBe(false);
      expect(isSyncMessage(123)).toBe(false);
      expect(isSyncMessage(true)).toBe(false);
    });

    it('should return false for object with missing type', () => {
      expect(isSyncMessage({ messageId: 'msg_1', deviceId: 'd1', timestamp: 123 })).toBe(false);
    });

    it('should return false for object with missing messageId', () => {
      expect(isSyncMessage({ type: 'heartbeat', deviceId: 'd1', timestamp: 123 })).toBe(false);
    });

    it('should return false for object with missing deviceId', () => {
      expect(isSyncMessage({ type: 'heartbeat', messageId: 'msg_1', timestamp: 123 })).toBe(false);
    });

    it('should return false for object with missing timestamp', () => {
      expect(isSyncMessage({ type: 'heartbeat', messageId: 'msg_1', deviceId: 'd1' })).toBe(false);
    });

    it('should return false for object with invalid type', () => {
      expect(isSyncMessage({
        type: 'invalid_type',
        messageId: 'msg_1',
        deviceId: 'd1',
        timestamp: 123
      })).toBe(false);
    });

    it('should return false for object with non-string type', () => {
      expect(isSyncMessage({
        type: 123,
        messageId: 'msg_1',
        deviceId: 'd1',
        timestamp: 123
      })).toBe(false);
    });

    it('should return false for object with non-number timestamp', () => {
      expect(isSyncMessage({
        type: 'heartbeat',
        messageId: 'msg_1',
        deviceId: 'd1',
        timestamp: '123'
      })).toBe(false);
    });
  });
});
