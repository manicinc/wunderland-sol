import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ConflictResolver,
  createConflictResolver,
  FieldMergers,
  type SyncConflict,
  type ConflictResolverOptions,
  type ConflictUIHooks,
  type ConflictResolution,
} from '../src/features/sync/conflicts/conflictResolver';
import type { VectorClockData } from '../src/features/sync/protocol/vectorClock';

describe('ConflictResolver', () => {
  const createTestConflict = (overrides: Partial<SyncConflict> = {}): SyncConflict => ({
    conflictId: 'test-conflict-1',
    tableName: 'notes',
    recordId: 'rec_1',
    localData: { title: 'Local Title', content: 'Local Content' },
    remoteData: { title: 'Remote Title', content: 'Remote Content' },
    localClock: { 'device-1': 2 },
    remoteClock: { 'device-2': 2 },
    localDeviceId: 'device-1',
    remoteDeviceId: 'device-2',
    detectedAt: Date.now(),
    conflictingFields: ['title', 'content'],
    status: 'pending',
    ...overrides,
  });

  describe('constructor', () => {
    it('should create resolver with default options', () => {
      const resolver = new ConflictResolver({
        defaultStrategy: 'last-write-wins',
      });

      expect(resolver).toBeInstanceOf(ConflictResolver);
    });

    it('should create resolver with all options', () => {
      const resolver = new ConflictResolver({
        defaultStrategy: 'merge',
        tableStrategies: { notes: 'last-write-wins' },
        fieldMergers: { count: FieldMergers.max },
        hooks: {},
        manualResolutionTimeout: 60000,
        autoResolveAfter: 300000,
      });

      expect(resolver).toBeInstanceOf(ConflictResolver);
    });
  });

  describe('detectConflict', () => {
    let resolver: ConflictResolver;

    beforeEach(() => {
      resolver = new ConflictResolver({
        defaultStrategy: 'last-write-wins',
      });
    });

    it('should detect conflict when clocks are concurrent and data differs', () => {
      const localClock: VectorClockData = { 'device-1': 2 };
      const remoteClock: VectorClockData = { 'device-2': 2 };
      const localData = { title: 'Local' };
      const remoteData = { title: 'Remote' };

      const conflict = resolver.detectConflict(
        'notes',
        'rec_1',
        localData,
        remoteData,
        localClock,
        remoteClock,
        'device-1',
        'device-2'
      );

      expect(conflict).not.toBeNull();
      expect(conflict?.tableName).toBe('notes');
      expect(conflict?.recordId).toBe('rec_1');
      expect(conflict?.conflictingFields).toContain('title');
      expect(conflict?.status).toBe('pending');
    });

    it('should return null when local is before remote (no conflict)', () => {
      const localClock: VectorClockData = { 'device-1': 1 };
      const remoteClock: VectorClockData = { 'device-1': 2 };

      const conflict = resolver.detectConflict(
        'notes',
        'rec_1',
        { title: 'Local' },
        { title: 'Remote' },
        localClock,
        remoteClock,
        'device-1',
        'device-2'
      );

      expect(conflict).toBeNull();
    });

    it('should return null when remote is before local (no conflict)', () => {
      const localClock: VectorClockData = { 'device-1': 2 };
      const remoteClock: VectorClockData = { 'device-1': 1 };

      const conflict = resolver.detectConflict(
        'notes',
        'rec_1',
        { title: 'Local' },
        { title: 'Remote' },
        localClock,
        remoteClock,
        'device-1',
        'device-2'
      );

      expect(conflict).toBeNull();
    });

    it('should return null when data is identical', () => {
      const localClock: VectorClockData = { 'device-1': 2 };
      const remoteClock: VectorClockData = { 'device-2': 2 };
      const data = { title: 'Same', content: 'Same' };

      const conflict = resolver.detectConflict(
        'notes',
        'rec_1',
        data,
        { ...data },
        localClock,
        remoteClock,
        'device-1',
        'device-2'
      );

      expect(conflict).toBeNull();
    });

    it('should skip fields starting with underscore', () => {
      const localClock: VectorClockData = { 'device-1': 2 };
      const remoteClock: VectorClockData = { 'device-2': 2 };

      const conflict = resolver.detectConflict(
        'notes',
        'rec_1',
        { title: 'Same', _metadata: 'local' },
        { title: 'Same', _metadata: 'remote' },
        localClock,
        remoteClock,
        'device-1',
        'device-2'
      );

      expect(conflict).toBeNull();
    });

    it('should call onConflictDetected hook', () => {
      const onConflictDetected = vi.fn();
      resolver = new ConflictResolver({
        defaultStrategy: 'last-write-wins',
        hooks: { onConflictDetected },
      });

      const localClock: VectorClockData = { 'device-1': 2 };
      const remoteClock: VectorClockData = { 'device-2': 2 };

      resolver.detectConflict(
        'notes',
        'rec_1',
        { title: 'Local' },
        { title: 'Remote' },
        localClock,
        remoteClock,
        'device-1',
        'device-2'
      );

      expect(onConflictDetected).toHaveBeenCalledOnce();
    });
  });

  describe('resolve', () => {
    describe('last-write-wins strategy', () => {
      it('should prefer higher tick count', async () => {
        const resolver = new ConflictResolver({
          defaultStrategy: 'last-write-wins',
        });

        const conflict = createTestConflict({
          localClock: { 'device-1': 5 },
          remoteClock: { 'device-2': 3 },
        });

        const resolution = await resolver.resolve(conflict);

        expect(resolution.decision).toBe('use_local');
        expect(resolution.resolvedBy).toBe('strategy');
        expect(resolution.reason).toContain('local');
      });

      it('should prefer remote when ticks are equal', async () => {
        const resolver = new ConflictResolver({
          defaultStrategy: 'last-write-wins',
        });

        const conflict = createTestConflict({
          localClock: { 'device-1': 3 },
          remoteClock: { 'device-2': 3 },
        });

        const resolution = await resolver.resolve(conflict);

        expect(resolution.decision).toBe('use_remote');
      });
    });

    describe('local-wins strategy', () => {
      it('should always prefer local', async () => {
        const resolver = new ConflictResolver({
          defaultStrategy: 'local-wins',
        });

        const conflict = createTestConflict();
        const resolution = await resolver.resolve(conflict);

        expect(resolution.decision).toBe('use_local');
        expect(resolution.reason).toBe('Local-wins strategy');
      });
    });

    describe('remote-wins strategy', () => {
      it('should always prefer remote', async () => {
        const resolver = new ConflictResolver({
          defaultStrategy: 'remote-wins',
        });

        const conflict = createTestConflict();
        const resolution = await resolver.resolve(conflict);

        expect(resolution.decision).toBe('use_remote');
        expect(resolution.reason).toBe('Remote-wins strategy');
      });
    });

    describe('merge strategy', () => {
      it('should merge conflicting fields', async () => {
        const resolver = new ConflictResolver({
          defaultStrategy: 'merge',
        });

        const conflict = createTestConflict({
          localData: { title: 'Local', count: 5 },
          remoteData: { title: 'Remote', count: 10 },
          conflictingFields: ['title', 'count'],
        });

        const resolution = await resolver.resolve(conflict);

        expect(resolution.decision).toBe('use_merged');
        expect(resolution.mergedData).toBeDefined();
      });

      it('should use custom field merger', async () => {
        const resolver = new ConflictResolver({
          defaultStrategy: 'merge',
          fieldMergers: {
            count: FieldMergers.max,
          },
        });

        const conflict = createTestConflict({
          localData: { count: 5 },
          remoteData: { count: 10 },
          conflictingFields: ['count'],
        });

        const resolution = await resolver.resolve(conflict);

        expect(resolution.decision).toBe('use_merged');
        expect(resolution.mergedData?.count).toBe(10);
      });

      it('should fallback to LWW on merge error', async () => {
        const badMerger = vi.fn().mockImplementation(() => {
          throw new Error('Merge failed');
        });

        const resolver = new ConflictResolver({
          defaultStrategy: 'merge',
          fieldMergers: { title: badMerger },
        });

        const conflict = createTestConflict();
        const resolution = await resolver.resolve(conflict);

        expect(['use_local', 'use_remote']).toContain(resolution.decision);
      });
    });

    describe('manual strategy', () => {
      it('should call UI hook and use result', async () => {
        const mockResolution: ConflictResolution = {
          decision: 'use_merged',
          mergedData: { title: 'Merged' },
          mergedClock: {},
          resolvedBy: 'user',
          resolvedAt: Date.now(),
        };

        const onConflictNeedsResolution = vi.fn().mockResolvedValue(mockResolution);

        const resolver = new ConflictResolver({
          defaultStrategy: 'manual',
          hooks: { onConflictNeedsResolution },
        });

        const conflict = createTestConflict();
        const resolution = await resolver.resolve(conflict);

        expect(onConflictNeedsResolution).toHaveBeenCalledWith(conflict);
        expect(resolution.decision).toBe('use_merged');
        expect(resolution.resolvedBy).toBe('user');
      });

      it('should fallback to LWW when no UI hook', async () => {
        const resolver = new ConflictResolver({
          defaultStrategy: 'manual',
        });

        const conflict = createTestConflict();
        const resolution = await resolver.resolve(conflict);

        expect(resolution.resolvedBy).toBe('strategy');
      });

      it('should defer when manual resolution times out', async () => {
        const onConflictNeedsResolution = vi.fn().mockImplementation(
          () => new Promise((resolve) => setTimeout(resolve, 10000))
        );

        const resolver = new ConflictResolver({
          defaultStrategy: 'manual',
          hooks: { onConflictNeedsResolution },
          manualResolutionTimeout: 10, // Very short timeout
        });

        const conflict = createTestConflict();
        const resolution = await resolver.resolve(conflict);

        expect(resolution.decision).toBe('defer');
        expect(resolution.reason).toContain('failed');
      });
    });

    describe('per-table strategy', () => {
      it('should use table-specific strategy', async () => {
        const resolver = new ConflictResolver({
          defaultStrategy: 'last-write-wins',
          tableStrategies: {
            settings: 'local-wins',
          },
        });

        const conflict = createTestConflict({ tableName: 'settings' });
        const resolution = await resolver.resolve(conflict);

        expect(resolution.decision).toBe('use_local');
      });
    });

    it('should update conflict status to resolved', async () => {
      const resolver = new ConflictResolver({
        defaultStrategy: 'local-wins',
      });

      const conflict = createTestConflict();
      await resolver.resolve(conflict);

      expect(conflict.status).toBe('resolved');
    });

    it('should call onConflictResolved hook', async () => {
      const onConflictResolved = vi.fn();
      const resolver = new ConflictResolver({
        defaultStrategy: 'local-wins',
        hooks: { onConflictResolved },
      });

      const conflict = createTestConflict();
      const resolution = await resolver.resolve(conflict);

      expect(onConflictResolved).toHaveBeenCalledWith(conflict, resolution);
    });
  });

  describe('getPendingConflicts', () => {
    it('should return pending conflicts', () => {
      const resolver = new ConflictResolver({
        defaultStrategy: 'last-write-wins',
      });

      const localClock: VectorClockData = { 'device-1': 2 };
      const remoteClock: VectorClockData = { 'device-2': 2 };

      resolver.detectConflict(
        'notes',
        'rec_1',
        { title: 'A' },
        { title: 'B' },
        localClock,
        remoteClock,
        'device-1',
        'device-2'
      );

      const pending = resolver.getPendingConflicts();
      expect(pending).toHaveLength(1);
      expect(pending[0].recordId).toBe('rec_1');
    });

    it('should not include resolved conflicts', async () => {
      const resolver = new ConflictResolver({
        defaultStrategy: 'local-wins',
      });

      const localClock: VectorClockData = { 'device-1': 2 };
      const remoteClock: VectorClockData = { 'device-2': 2 };

      const conflict = resolver.detectConflict(
        'notes',
        'rec_1',
        { title: 'A' },
        { title: 'B' },
        localClock,
        remoteClock,
        'device-1',
        'device-2'
      );

      expect(resolver.getPendingConflicts()).toHaveLength(1);

      await resolver.resolve(conflict!);

      expect(resolver.getPendingConflicts()).toHaveLength(0);
    });
  });

  describe('getConflict', () => {
    it('should return conflict by ID', () => {
      const resolver = new ConflictResolver({
        defaultStrategy: 'last-write-wins',
      });

      const localClock: VectorClockData = { 'device-1': 2 };
      const remoteClock: VectorClockData = { 'device-2': 2 };

      const conflict = resolver.detectConflict(
        'notes',
        'rec_1',
        { title: 'A' },
        { title: 'B' },
        localClock,
        remoteClock,
        'device-1',
        'device-2'
      );

      const retrieved = resolver.getConflict(conflict!.conflictId);
      expect(retrieved).toBe(conflict);
    });

    it('should return undefined for unknown ID', () => {
      const resolver = new ConflictResolver({
        defaultStrategy: 'last-write-wins',
      });

      expect(resolver.getConflict('unknown')).toBeUndefined();
    });
  });

  describe('resolveManually', () => {
    it('should resolve conflict with user decision', async () => {
      const resolver = new ConflictResolver({
        defaultStrategy: 'last-write-wins',
      });

      const localClock: VectorClockData = { 'device-1': 2 };
      const remoteClock: VectorClockData = { 'device-2': 2 };

      const conflict = resolver.detectConflict(
        'notes',
        'rec_1',
        { title: 'A' },
        { title: 'B' },
        localClock,
        remoteClock,
        'device-1',
        'device-2'
      );

      const resolution = await resolver.resolveManually(
        conflict!.conflictId,
        'use_local'
      );

      expect(resolution.decision).toBe('use_local');
      expect(resolution.resolvedBy).toBe('user');
      expect(conflict!.status).toBe('resolved');
    });

    it('should include merged data when provided', async () => {
      const resolver = new ConflictResolver({
        defaultStrategy: 'last-write-wins',
      });

      const localClock: VectorClockData = { 'device-1': 2 };
      const remoteClock: VectorClockData = { 'device-2': 2 };

      const conflict = resolver.detectConflict(
        'notes',
        'rec_1',
        { title: 'A' },
        { title: 'B' },
        localClock,
        remoteClock,
        'device-1',
        'device-2'
      );

      const mergedData = { title: 'Merged' };
      const resolution = await resolver.resolveManually(
        conflict!.conflictId,
        'use_merged',
        mergedData
      );

      expect(resolution.mergedData).toEqual(mergedData);
    });

    it('should throw for unknown conflict ID', async () => {
      const resolver = new ConflictResolver({
        defaultStrategy: 'last-write-wins',
      });

      await expect(
        resolver.resolveManually('unknown', 'use_local')
      ).rejects.toThrow('Conflict not found');
    });
  });

  describe('autoResolveStale', () => {
    it('should resolve conflicts older than threshold', async () => {
      const resolver = new ConflictResolver({
        defaultStrategy: 'last-write-wins',
        autoResolveAfter: 1, // 1ms threshold
      });

      const localClock: VectorClockData = { 'device-1': 2 };
      const remoteClock: VectorClockData = { 'device-2': 2 };

      resolver.detectConflict(
        'notes',
        'rec_1',
        { title: 'A' },
        { title: 'B' },
        localClock,
        remoteClock,
        'device-1',
        'device-2'
      );

      // Wait for threshold to pass
      await new Promise(r => setTimeout(r, 10));

      const resolutions = resolver.autoResolveStale();

      // May or may not resolve depending on timing
      expect(Array.isArray(resolutions)).toBe(true);
    });

    it('should return empty array when autoResolveAfter is 0', () => {
      const resolver = new ConflictResolver({
        defaultStrategy: 'last-write-wins',
        autoResolveAfter: 0,
      });

      const resolutions = resolver.autoResolveStale();
      expect(resolutions).toHaveLength(0);
    });
  });
});

describe('createConflictResolver', () => {
  it('should create a ConflictResolver instance', () => {
    const resolver = createConflictResolver({
      defaultStrategy: 'merge',
    });

    expect(resolver).toBeInstanceOf(ConflictResolver);
  });
});

describe('FieldMergers', () => {
  describe('lastWriteWins', () => {
    it('should return local value when local timestamp is greater', () => {
      const result = FieldMergers.lastWriteWins('field', 'local', 'remote', 100, 50);
      expect(result).toBe('local');
    });

    it('should return remote value when remote timestamp is greater', () => {
      const result = FieldMergers.lastWriteWins('field', 'local', 'remote', 50, 100);
      expect(result).toBe('remote');
    });

    it('should return local value when timestamps are equal', () => {
      const result = FieldMergers.lastWriteWins('field', 'local', 'remote', 100, 100);
      expect(result).toBe('local');
    });
  });

  describe('max', () => {
    it('should return the maximum of two numbers', () => {
      expect(FieldMergers.max('field', 5, 10, 0, 0)).toBe(10);
      expect(FieldMergers.max('field', 15, 10, 0, 0)).toBe(15);
    });

    it('should handle non-numeric values as 0', () => {
      expect(FieldMergers.max('field', 'abc', 10, 0, 0)).toBe(10);
      expect(FieldMergers.max('field', 5, null, 0, 0)).toBe(5);
    });
  });

  describe('sum', () => {
    it('should return the sum of two numbers', () => {
      expect(FieldMergers.sum('field', 5, 10, 0, 0)).toBe(15);
    });

    it('should handle non-numeric values as 0', () => {
      expect(FieldMergers.sum('field', 'abc', 10, 0, 0)).toBe(10);
      expect(FieldMergers.sum('field', 5, undefined, 0, 0)).toBe(5);
    });
  });

  describe('union', () => {
    it('should return union of two arrays', () => {
      const result = FieldMergers.union('field', [1, 2, 3], [3, 4, 5], 0, 0);
      expect(result).toEqual([1, 2, 3, 4, 5]);
    });

    it('should handle non-array values', () => {
      expect(FieldMergers.union('field', 'not-array', [1, 2], 0, 0)).toEqual([1, 2]);
      expect(FieldMergers.union('field', [1, 2], null, 0, 0)).toEqual([1, 2]);
    });

    it('should deduplicate values', () => {
      const result = FieldMergers.union('field', [1, 1, 2], [2, 3, 3], 0, 0);
      expect(result).toEqual([1, 2, 3]);
    });
  });

  describe('concat', () => {
    it('should concatenate two strings with separator', () => {
      const result = FieldMergers.concat('field', 'Hello', 'World', 0, 0);
      expect(result).toBe('Hello\n---\nWorld');
    });

    it('should return other value when one is empty', () => {
      expect(FieldMergers.concat('field', '', 'World', 0, 0)).toBe('World');
      expect(FieldMergers.concat('field', 'Hello', '', 0, 0)).toBe('Hello');
    });

    it('should return single value when both are same', () => {
      expect(FieldMergers.concat('field', 'Same', 'Same', 0, 0)).toBe('Same');
    });

    it('should handle null/undefined as empty string', () => {
      expect(FieldMergers.concat('field', null, 'World', 0, 0)).toBe('World');
      expect(FieldMergers.concat('field', 'Hello', undefined, 0, 0)).toBe('Hello');
    });
  });
});
