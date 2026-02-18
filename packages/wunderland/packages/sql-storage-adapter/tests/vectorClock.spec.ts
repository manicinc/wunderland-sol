import { describe, it, expect, beforeEach } from 'vitest';
import {
  VectorClock,
  createVectorClock,
  compareClocks,
  mergeClocks,
  dominates,
  generateDeviceId,
  type VectorClockData,
  type CausalRelation,
} from '../src/features/sync/protocol/vectorClock';

describe('VectorClock', () => {
  describe('constructor', () => {
    it('should initialize with device ID', () => {
      const clock = new VectorClock('device-1');
      expect(clock.getDeviceId()).toBe('device-1');
      expect(clock.getValue()).toBe(0);
    });

    it('should initialize own counter to 0', () => {
      const clock = new VectorClock('test-device');
      expect(clock.getValueFor('test-device')).toBe(0);
    });
  });

  describe('tick', () => {
    it('should increment local counter', () => {
      const clock = new VectorClock('device-1');
      const value = clock.tick();
      expect(value).toBe(1);
      expect(clock.getValue()).toBe(1);
    });

    it('should increment counter multiple times', () => {
      const clock = new VectorClock('device-1');
      clock.tick();
      clock.tick();
      clock.tick();
      expect(clock.getValue()).toBe(3);
    });

    it('should return the new value', () => {
      const clock = new VectorClock('device-1');
      expect(clock.tick()).toBe(1);
      expect(clock.tick()).toBe(2);
      expect(clock.tick()).toBe(3);
    });
  });

  describe('merge', () => {
    it('should merge another VectorClock instance', () => {
      const clock1 = new VectorClock('device-1');
      const clock2 = new VectorClock('device-2');
      clock1.tick(); // device-1: 1
      clock2.tick(); // device-2: 1
      clock2.tick(); // device-2: 2

      clock1.merge(clock2);

      // After merge, should have max of each + 1 for local tick
      expect(clock1.getValueFor('device-1')).toBe(2); // 1 + 1 tick after merge
      expect(clock1.getValueFor('device-2')).toBe(2);
    });

    it('should merge VectorClockData object', () => {
      const clock = new VectorClock('device-1');
      clock.tick();

      const data: VectorClockData = {
        'device-2': 5,
        'device-3': 3,
      };

      clock.merge(data);

      expect(clock.getValueFor('device-2')).toBe(5);
      expect(clock.getValueFor('device-3')).toBe(3);
      expect(clock.getValueFor('device-1')).toBe(2); // original 1 + tick after merge
    });

    it('should take max when merging overlapping clocks', () => {
      const clock1 = new VectorClock('device-1');
      clock1.tick();
      clock1.tick();
      clock1.tick(); // device-1: 3

      const data: VectorClockData = {
        'device-1': 1, // Lower than current
        'device-2': 5,
      };

      clock1.merge(data);

      expect(clock1.getValueFor('device-1')).toBe(4); // max(3, 1) = 3 + 1 tick
      expect(clock1.getValueFor('device-2')).toBe(5);
    });
  });

  describe('observe', () => {
    it('should update values without incrementing local counter', () => {
      const clock = new VectorClock('device-1');
      clock.tick(); // device-1: 1

      const data: VectorClockData = {
        'device-2': 5,
      };

      clock.observe(data);

      expect(clock.getValueFor('device-1')).toBe(1); // Not incremented
      expect(clock.getValueFor('device-2')).toBe(5);
    });

    it('should observe VectorClock instance', () => {
      const clock1 = new VectorClock('device-1');
      const clock2 = new VectorClock('device-2');
      clock2.tick();
      clock2.tick();

      clock1.observe(clock2);

      expect(clock1.getValueFor('device-1')).toBe(0); // Not incremented
      expect(clock1.getValueFor('device-2')).toBe(2);
    });
  });

  describe('compare', () => {
    it('should return "equal" for identical clocks', () => {
      const clock1 = new VectorClock('device-1');
      const clock2 = new VectorClock('device-1');
      clock1.tick();
      clock2.tick();

      expect(clock1.compare(clock2)).toBe('equal');
    });

    it('should return "before" when this clock is behind', () => {
      const clock1 = new VectorClock('device-1');
      const clock2 = new VectorClock('device-1');
      clock1.tick();
      clock2.tick();
      clock2.tick();

      expect(clock1.compare(clock2)).toBe('before');
    });

    it('should return "after" when this clock is ahead', () => {
      const clock1 = new VectorClock('device-1');
      const clock2 = new VectorClock('device-1');
      clock1.tick();
      clock1.tick();
      clock2.tick();

      expect(clock1.compare(clock2)).toBe('after');
    });

    it('should return "concurrent" for divergent clocks', () => {
      const clock1 = new VectorClock('device-1');
      const clock2 = new VectorClock('device-2');
      clock1.tick(); // device-1: 1
      clock2.tick(); // device-2: 1

      expect(clock1.compare(clock2)).toBe('concurrent');
    });

    it('should compare against VectorClockData', () => {
      const clock = new VectorClock('device-1');
      clock.tick();

      const data: VectorClockData = { 'device-2': 1 };
      expect(clock.compare(data)).toBe('concurrent');
    });

    it('should handle empty device entries as 0', () => {
      const clock = new VectorClock('device-1');
      clock.tick();

      const data: VectorClockData = { 'device-1': 1, 'device-2': 0 };
      expect(clock.compare(data)).toBe('equal');
    });
  });

  describe('convenience comparison methods', () => {
    let clock1: VectorClock;
    let clock2: VectorClock;

    beforeEach(() => {
      clock1 = new VectorClock('device-1');
      clock2 = new VectorClock('device-1');
    });

    describe('happenedBefore', () => {
      it('should return true when clock is before', () => {
        clock1.tick();
        clock2.tick();
        clock2.tick();
        expect(clock1.happenedBefore(clock2)).toBe(true);
      });

      it('should return false when clock is not before', () => {
        clock1.tick();
        clock1.tick();
        clock2.tick();
        expect(clock1.happenedBefore(clock2)).toBe(false);
      });
    });

    describe('happenedAfter', () => {
      it('should return true when clock is after', () => {
        clock1.tick();
        clock1.tick();
        clock2.tick();
        expect(clock1.happenedAfter(clock2)).toBe(true);
      });

      it('should return false when clock is not after', () => {
        clock1.tick();
        clock2.tick();
        clock2.tick();
        expect(clock1.happenedAfter(clock2)).toBe(false);
      });
    });

    describe('isConcurrent', () => {
      it('should return true for concurrent clocks', () => {
        const clockA = new VectorClock('device-a');
        const clockB = new VectorClock('device-b');
        clockA.tick();
        clockB.tick();
        expect(clockA.isConcurrent(clockB)).toBe(true);
      });

      it('should return false for non-concurrent clocks', () => {
        clock1.tick();
        clock2.tick();
        clock2.tick();
        expect(clock1.isConcurrent(clock2)).toBe(false);
      });
    });
  });

  describe('accessors', () => {
    it('getDeviceId should return the device ID', () => {
      const clock = new VectorClock('my-device');
      expect(clock.getDeviceId()).toBe('my-device');
    });

    it('getValue should return current device counter', () => {
      const clock = new VectorClock('device-1');
      expect(clock.getValue()).toBe(0);
      clock.tick();
      expect(clock.getValue()).toBe(1);
    });

    it('getValueFor should return counter for specific device', () => {
      const clock = new VectorClock('device-1');
      clock.observe({ 'device-2': 10, 'device-3': 20 });
      expect(clock.getValueFor('device-1')).toBe(0);
      expect(clock.getValueFor('device-2')).toBe(10);
      expect(clock.getValueFor('device-3')).toBe(20);
      expect(clock.getValueFor('unknown')).toBe(0);
    });

    it('getValues should return copy of all values', () => {
      const clock = new VectorClock('device-1');
      clock.tick();
      clock.observe({ 'device-2': 5 });

      const values = clock.getValues();
      expect(values).toEqual({ 'device-1': 1, 'device-2': 5 });

      // Should be a copy, not the original
      values['device-1'] = 999;
      expect(clock.getValue()).toBe(1);
    });

    it('getKnownDevices should return all device IDs', () => {
      const clock = new VectorClock('device-1');
      clock.observe({ 'device-2': 1, 'device-3': 2 });

      const devices = clock.getKnownDevices();
      expect(devices).toContain('device-1');
      expect(devices).toContain('device-2');
      expect(devices).toContain('device-3');
      expect(devices).toHaveLength(3);
    });

    it('getLastUpdated should return timestamp', () => {
      const before = Date.now();
      const clock = new VectorClock('device-1');
      const after = Date.now();

      const lastUpdated = clock.getLastUpdated();
      expect(lastUpdated).toBeGreaterThanOrEqual(before);
      expect(lastUpdated).toBeLessThanOrEqual(after);
    });
  });

  describe('serialization', () => {
    describe('serialize', () => {
      it('should serialize to SerializedVectorClock', () => {
        const clock = new VectorClock('device-1');
        clock.tick();
        clock.observe({ 'device-2': 5 });

        const serialized = clock.serialize();

        expect(serialized.deviceId).toBe('device-1');
        expect(serialized.values).toEqual({ 'device-1': 1, 'device-2': 5 });
        expect(typeof serialized.updatedAt).toBe('number');
      });
    });

    describe('deserialize', () => {
      it('should create VectorClock from serialized data', () => {
        const data = {
          deviceId: 'device-1',
          values: { 'device-1': 5, 'device-2': 10 },
          updatedAt: Date.now(),
        };

        const clock = VectorClock.deserialize(data);

        expect(clock.getDeviceId()).toBe('device-1');
        expect(clock.getValue()).toBe(5);
        expect(clock.getValueFor('device-2')).toBe(10);
      });
    });

    describe('clone', () => {
      it('should create an independent copy', () => {
        const original = new VectorClock('device-1');
        original.tick();
        original.tick();

        const clone = original.clone();

        expect(clone.getValue()).toBe(2);
        expect(clone.getDeviceId()).toBe('device-1');

        // Changes to clone should not affect original
        clone.tick();
        expect(clone.getValue()).toBe(3);
        expect(original.getValue()).toBe(2);
      });
    });

    describe('toJSON and fromJSON', () => {
      it('should serialize to JSON string', () => {
        const clock = new VectorClock('device-1');
        clock.tick();

        const json = clock.toJSON();
        expect(typeof json).toBe('string');

        const parsed = JSON.parse(json);
        expect(parsed.deviceId).toBe('device-1');
        expect(parsed.values['device-1']).toBe(1);
      });

      it('should deserialize from JSON string', () => {
        const original = new VectorClock('device-1');
        original.tick();
        original.tick();

        const json = original.toJSON();
        const restored = VectorClock.fromJSON(json);

        expect(restored.getDeviceId()).toBe('device-1');
        expect(restored.getValue()).toBe(2);
      });
    });
  });
});

describe('createVectorClock', () => {
  it('should create a new VectorClock instance', () => {
    const clock = createVectorClock('my-device');
    expect(clock).toBeInstanceOf(VectorClock);
    expect(clock.getDeviceId()).toBe('my-device');
  });
});

describe('compareClocks', () => {
  it('should compare two VectorClockData objects', () => {
    const a: VectorClockData = { 'device-1': 1 };
    const b: VectorClockData = { 'device-1': 2 };

    expect(compareClocks(a, b)).toBe('before');
    expect(compareClocks(b, a)).toBe('after');
  });

  it('should return equal for identical data', () => {
    const a: VectorClockData = { 'device-1': 5, 'device-2': 3 };
    const b: VectorClockData = { 'device-1': 5, 'device-2': 3 };

    expect(compareClocks(a, b)).toBe('equal');
  });

  it('should return concurrent for divergent data', () => {
    const a: VectorClockData = { 'device-1': 2, 'device-2': 1 };
    const b: VectorClockData = { 'device-1': 1, 'device-2': 2 };

    expect(compareClocks(a, b)).toBe('concurrent');
  });

  it('should handle missing device entries', () => {
    const a: VectorClockData = { 'device-1': 1 };
    const b: VectorClockData = { 'device-2': 1 };

    expect(compareClocks(a, b)).toBe('concurrent');
  });
});

describe('mergeClocks', () => {
  it('should merge multiple clocks into a new clock', () => {
    const clock1: VectorClockData = { 'device-1': 5 };
    const clock2: VectorClockData = { 'device-2': 3 };
    const clock3: VectorClockData = { 'device-1': 2, 'device-3': 7 };

    const merged = mergeClocks('device-4', clock1, clock2, clock3);

    expect(merged.getValueFor('device-1')).toBe(5); // max(5, 2)
    expect(merged.getValueFor('device-2')).toBe(3);
    expect(merged.getValueFor('device-3')).toBe(7);
    expect(merged.getDeviceId()).toBe('device-4');
  });

  it('should return empty clock when no clocks provided', () => {
    const merged = mergeClocks('device-1');
    expect(merged.getDeviceId()).toBe('device-1');
    expect(merged.getValue()).toBe(0);
  });
});

describe('dominates', () => {
  it('should return true when a strictly dominates b', () => {
    const a: VectorClockData = { 'device-1': 5 };
    const b: VectorClockData = { 'device-1': 3 };

    expect(dominates(a, b)).toBe(true);
  });

  it('should return false when a does not dominate b', () => {
    const a: VectorClockData = { 'device-1': 3 };
    const b: VectorClockData = { 'device-1': 5 };

    expect(dominates(a, b)).toBe(false);
  });

  it('should return false for equal clocks', () => {
    const a: VectorClockData = { 'device-1': 5 };
    const b: VectorClockData = { 'device-1': 5 };

    expect(dominates(a, b)).toBe(false);
  });

  it('should return false for concurrent clocks', () => {
    const a: VectorClockData = { 'device-1': 2, 'device-2': 1 };
    const b: VectorClockData = { 'device-1': 1, 'device-2': 2 };

    expect(dominates(a, b)).toBe(false);
  });
});

describe('generateDeviceId', () => {
  it('should generate unique device IDs', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      ids.add(generateDeviceId());
    }
    expect(ids.size).toBe(100);
  });

  it('should generate IDs starting with "device_"', () => {
    const id = generateDeviceId();
    expect(id.startsWith('device_')).toBe(true);
  });

  it('should generate IDs with timestamp and random components', () => {
    const id = generateDeviceId();
    const parts = id.split('_');
    expect(parts).toHaveLength(3);
    expect(parts[0]).toBe('device');
  });
});
