/**
 * Conflict Detection and Resolution.
 *
 * Provides conflict detection using vector clocks and
 * configurable resolution strategies with UI hooks.
 *
 * @packageDocumentation
 */

import type { VectorClockData } from '../protocol/vectorClock';
import { compareClocks } from '../protocol/vectorClock';

/**
 * Conflict resolution strategy.
 */
export type ConflictStrategy =
  | 'last-write-wins'  // Use most recent timestamp
  | 'local-wins'       // Always prefer local changes
  | 'remote-wins'      // Always prefer remote changes
  | 'merge'            // Attempt field-level merge
  | 'manual';          // Defer to UI for resolution

/**
 * Resolution decision for a conflict.
 */
export type ResolutionDecision =
  | 'use_local'
  | 'use_remote'
  | 'use_merged'
  | 'keep_both'
  | 'defer';

/**
 * Represents a sync conflict between local and remote data.
 */
export interface SyncConflict {
  /** Unique conflict identifier */
  conflictId: string;

  /** Table where conflict occurred */
  tableName: string;

  /** Primary key of the conflicting record */
  recordId: string;

  /** Local version of the data */
  localData: Record<string, unknown>;

  /** Remote version of the data */
  remoteData: Record<string, unknown>;

  /** Local vector clock */
  localClock: VectorClockData;

  /** Remote vector clock */
  remoteClock: VectorClockData;

  /** Local device ID */
  localDeviceId: string;

  /** Remote device ID */
  remoteDeviceId: string;

  /** When the conflict was detected */
  detectedAt: number;

  /** Fields that differ between versions */
  conflictingFields: string[];

  /** Conflict status */
  status: 'pending' | 'resolved' | 'deferred';
}

/**
 * Resolution result after conflict is resolved.
 */
export interface ConflictResolution {
  /** How the conflict was resolved */
  decision: ResolutionDecision;

  /** Merged data if decision is 'use_merged' */
  mergedData?: Record<string, unknown>;

  /** Merged vector clock */
  mergedClock: VectorClockData;

  /** Who/what resolved the conflict */
  resolvedBy: 'auto' | 'user' | 'strategy';

  /** Resolution timestamp */
  resolvedAt: number;

  /** Optional reason for the resolution */
  reason?: string;
}

/**
 * UI hooks for conflict resolution.
 */
export interface ConflictUIHooks {
  /**
   * Called when a conflict requires manual resolution.
   * Return the resolution decision from the UI.
   */
  onConflictNeedsResolution?: (conflict: SyncConflict) => Promise<ConflictResolution>;

  /**
   * Called when a conflict is detected (before auto-resolution).
   */
  onConflictDetected?: (conflict: SyncConflict) => void;

  /**
   * Called after a conflict is resolved.
   */
  onConflictResolved?: (conflict: SyncConflict, resolution: ConflictResolution) => void;

  /**
   * Called when auto-merge fails and manual intervention is needed.
   */
  onMergeFailed?: (conflict: SyncConflict, error: Error) => void;
}

/**
 * Configuration for the conflict resolver.
 */
export interface ConflictResolverOptions {
  /** Default resolution strategy */
  defaultStrategy: ConflictStrategy;

  /** Per-table strategy overrides */
  tableStrategies?: Record<string, ConflictStrategy>;

  /** Per-field merge functions for 'merge' strategy */
  fieldMergers?: Record<string, FieldMerger>;

  /** UI hooks for manual resolution */
  hooks?: ConflictUIHooks;

  /** Maximum time to wait for manual resolution (ms) */
  manualResolutionTimeout?: number;

  /** Auto-resolve conflicts older than this (ms) */
  autoResolveAfter?: number;
}

/**
 * Function to merge a single field.
 */
export type FieldMerger = (
  fieldName: string,
  localValue: unknown,
  remoteValue: unknown,
  localTimestamp: number,
  remoteTimestamp: number
) => unknown;

/**
 * Built-in field mergers.
 */
export const FieldMergers = {
  /**
   * Use the most recent value based on timestamp.
   */
  lastWriteWins: ((
    _fieldName: string,
    localValue: unknown,
    remoteValue: unknown,
    localTimestamp: number,
    remoteTimestamp: number
  ): unknown => {
    return localTimestamp >= remoteTimestamp ? localValue : remoteValue;
  }) as FieldMerger,

  /**
   * For numeric fields, take the maximum value.
   */
  max: ((
    _fieldName: string,
    localValue: unknown,
    remoteValue: unknown
  ): unknown => {
    const local = Number(localValue) || 0;
    const remote = Number(remoteValue) || 0;
    return Math.max(local, remote);
  }) as FieldMerger,

  /**
   * For numeric fields, sum the values.
   */
  sum: ((
    _fieldName: string,
    localValue: unknown,
    remoteValue: unknown
  ): unknown => {
    const local = Number(localValue) || 0;
    const remote = Number(remoteValue) || 0;
    return local + remote;
  }) as FieldMerger,

  /**
   * For arrays, union the values.
   */
  union: ((
    _fieldName: string,
    localValue: unknown,
    remoteValue: unknown
  ): unknown => {
    const local = Array.isArray(localValue) ? localValue : [];
    const remote = Array.isArray(remoteValue) ? remoteValue : [];
    return [...new Set([...local, ...remote])];
  }) as FieldMerger,

  /**
   * For strings, concatenate with separator.
   */
  concat: ((
    _fieldName: string,
    localValue: unknown,
    remoteValue: unknown
  ): unknown => {
    const local = String(localValue ?? '');
    const remote = String(remoteValue ?? '');
    if (!local) return remote;
    if (!remote) return local;
    if (local === remote) return local;
    return `${local}\n---\n${remote}`;
  }) as FieldMerger,
};

/**
 * Merge two vector clocks by taking max of each device's counter.
 */
function mergeVectorClocks(a: VectorClockData, b: VectorClockData): VectorClockData {
  const merged: VectorClockData = { ...a };
  for (const [deviceId, value] of Object.entries(b)) {
    merged[deviceId] = Math.max(merged[deviceId] ?? 0, value);
  }
  return merged;
}

/**
 * Get total tick count from a vector clock.
 */
function getTotalTicks(clock: VectorClockData): number {
  return Object.values(clock).reduce((sum, val) => sum + val, 0);
}

/**
 * Conflict resolver for cross-platform sync.
 *
 * Detects conflicts using vector clock comparison and resolves
 * them using configurable strategies or UI hooks.
 *
 * @example
 * ```typescript
 * const resolver = new ConflictResolver({
 *   defaultStrategy: 'last-write-wins',
 *   tableStrategies: {
 *     notes: 'merge',
 *     settings: 'local-wins',
 *   },
 *   hooks: {
 *     onConflictNeedsResolution: async (conflict) => {
 *       return showConflictDialog(conflict);
 *     },
 *   },
 * });
 *
 * const resolution = await resolver.resolve(conflict);
 * ```
 */
export class ConflictResolver {
  private _options: Required<ConflictResolverOptions>;
  private _pendingConflicts: Map<string, SyncConflict> = new Map();
  private _resolvedConflicts: Map<string, ConflictResolution> = new Map();

  constructor(options: ConflictResolverOptions) {
    this._options = {
      defaultStrategy: options.defaultStrategy,
      tableStrategies: options.tableStrategies ?? {},
      fieldMergers: options.fieldMergers ?? {},
      hooks: options.hooks ?? {},
      manualResolutionTimeout: options.manualResolutionTimeout ?? 300000, // 5 minutes
      autoResolveAfter: options.autoResolveAfter ?? 0, // Disabled by default
    };
  }

  /**
   * Detect if there is a conflict between local and remote data.
   */
  detectConflict(
    tableName: string,
    recordId: string,
    localData: Record<string, unknown>,
    remoteData: Record<string, unknown>,
    localClock: VectorClockData,
    remoteClock: VectorClockData,
    localDeviceId: string,
    remoteDeviceId: string
  ): SyncConflict | null {
    // Compare vector clocks
    const comparison = compareClocks(localClock, remoteClock);

    // No conflict if one is clearly before the other
    if (comparison === 'before' || comparison === 'after') {
      return null;
    }

    // Concurrent changes - potential conflict
    // Check if data actually differs
    const conflictingFields = this._findConflictingFields(localData, remoteData);

    if (conflictingFields.length === 0) {
      // Same data, no conflict
      return null;
    }

    const conflict: SyncConflict = {
      conflictId: `${tableName}:${recordId}:${Date.now()}`,
      tableName,
      recordId,
      localData,
      remoteData,
      localClock,
      remoteClock,
      localDeviceId,
      remoteDeviceId,
      detectedAt: Date.now(),
      conflictingFields,
      status: 'pending',
    };

    this._pendingConflicts.set(conflict.conflictId, conflict);
    this._options.hooks.onConflictDetected?.(conflict);

    return conflict;
  }

  /**
   * Resolve a conflict using the configured strategy.
   */
  async resolve(conflict: SyncConflict): Promise<ConflictResolution> {
    const strategy = this._getStrategy(conflict.tableName);

    let resolution: ConflictResolution;

    switch (strategy) {
      case 'last-write-wins':
        resolution = this._resolveLastWriteWins(conflict);
        break;

      case 'local-wins':
        resolution = this._resolveLocalWins(conflict);
        break;

      case 'remote-wins':
        resolution = this._resolveRemoteWins(conflict);
        break;

      case 'merge':
        resolution = this._resolveMerge(conflict);
        break;

      case 'manual':
        resolution = await this._resolveManual(conflict);
        break;

      default:
        resolution = this._resolveLastWriteWins(conflict);
    }

    // Update conflict status
    conflict.status = resolution.decision === 'defer' ? 'deferred' : 'resolved';

    // Store resolution
    this._resolvedConflicts.set(conflict.conflictId, resolution);
    this._pendingConflicts.delete(conflict.conflictId);

    // Notify hooks
    this._options.hooks.onConflictResolved?.(conflict, resolution);

    return resolution;
  }

  /**
   * Get pending conflicts.
   */
  getPendingConflicts(): SyncConflict[] {
    return Array.from(this._pendingConflicts.values());
  }

  /**
   * Get a specific pending conflict.
   */
  getConflict(conflictId: string): SyncConflict | undefined {
    return this._pendingConflicts.get(conflictId);
  }

  /**
   * Manually resolve a conflict with a user decision.
   */
  async resolveManually(
    conflictId: string,
    decision: ResolutionDecision,
    mergedData?: Record<string, unknown>
  ): Promise<ConflictResolution> {
    const conflict = this._pendingConflicts.get(conflictId);
    if (!conflict) {
      throw new Error(`Conflict not found: ${conflictId}`);
    }

    const resolution: ConflictResolution = {
      decision,
      mergedData,
      mergedClock: mergeVectorClocks(conflict.localClock, conflict.remoteClock),
      resolvedBy: 'user',
      resolvedAt: Date.now(),
    };

    conflict.status = 'resolved';
    this._resolvedConflicts.set(conflictId, resolution);
    this._pendingConflicts.delete(conflictId);

    this._options.hooks.onConflictResolved?.(conflict, resolution);

    return resolution;
  }

  /**
   * Auto-resolve old conflicts that have been pending too long.
   */
  autoResolveStale(): ConflictResolution[] {
    if (this._options.autoResolveAfter <= 0) {
      return [];
    }

    const now = Date.now();
    const staleThreshold = now - this._options.autoResolveAfter;
    const resolutions: ConflictResolution[] = [];

    for (const conflict of this._pendingConflicts.values()) {
      if (conflict.detectedAt < staleThreshold) {
        // Auto-resolve with last-write-wins
        const resolution = this._resolveLastWriteWins(conflict);
        resolution.reason = 'Auto-resolved due to timeout';

        conflict.status = 'resolved';
        this._resolvedConflicts.set(conflict.conflictId, resolution);
        this._pendingConflicts.delete(conflict.conflictId);

        resolutions.push(resolution);
        this._options.hooks.onConflictResolved?.(conflict, resolution);
      }
    }

    return resolutions;
  }

  /**
   * Get the resolution strategy for a table.
   */
  private _getStrategy(tableName: string): ConflictStrategy {
    return this._options.tableStrategies[tableName] ?? this._options.defaultStrategy;
  }

  /**
   * Find fields that differ between local and remote data.
   */
  private _findConflictingFields(
    localData: Record<string, unknown>,
    remoteData: Record<string, unknown>
  ): string[] {
    const allKeys = new Set([
      ...Object.keys(localData),
      ...Object.keys(remoteData),
    ]);

    const conflicting: string[] = [];

    for (const key of allKeys) {
      // Skip metadata fields
      if (key.startsWith('_')) continue;

      const localValue = localData[key];
      const remoteValue = remoteData[key];

      if (!this._valuesEqual(localValue, remoteValue)) {
        conflicting.push(key);
      }
    }

    return conflicting;
  }

  /**
   * Check if two values are equal (deep comparison for objects/arrays).
   */
  private _valuesEqual(a: unknown, b: unknown): boolean {
    if (a === b) return true;
    if (a === null || b === null) return false;
    if (typeof a !== typeof b) return false;

    if (typeof a === 'object') {
      return JSON.stringify(a) === JSON.stringify(b);
    }

    return false;
  }

  /**
   * Resolve using last-write-wins strategy.
   */
  private _resolveLastWriteWins(conflict: SyncConflict): ConflictResolution {
    // Use the clock's total ticks as a proxy for recency
    const localTicks = getTotalTicks(conflict.localClock);
    const remoteTicks = getTotalTicks(conflict.remoteClock);

    // If clocks are equal, prefer remote (server-side typically more authoritative)
    const useLocal = localTicks > remoteTicks;

    return {
      decision: useLocal ? 'use_local' : 'use_remote',
      mergedClock: mergeVectorClocks(conflict.localClock, conflict.remoteClock),
      resolvedBy: 'strategy',
      resolvedAt: Date.now(),
      reason: `Last-write-wins: ${useLocal ? 'local' : 'remote'} had higher clock (${useLocal ? localTicks : remoteTicks} ticks)`,
    };
  }

  /**
   * Resolve using local-wins strategy.
   */
  private _resolveLocalWins(conflict: SyncConflict): ConflictResolution {
    return {
      decision: 'use_local',
      mergedClock: mergeVectorClocks(conflict.localClock, conflict.remoteClock),
      resolvedBy: 'strategy',
      resolvedAt: Date.now(),
      reason: 'Local-wins strategy',
    };
  }

  /**
   * Resolve using remote-wins strategy.
   */
  private _resolveRemoteWins(conflict: SyncConflict): ConflictResolution {
    return {
      decision: 'use_remote',
      mergedClock: mergeVectorClocks(conflict.localClock, conflict.remoteClock),
      resolvedBy: 'strategy',
      resolvedAt: Date.now(),
      reason: 'Remote-wins strategy',
    };
  }

  /**
   * Resolve using field-level merge strategy.
   */
  private _resolveMerge(conflict: SyncConflict): ConflictResolution {
    try {
      const mergedData: Record<string, unknown> = { ...conflict.localData };

      // Use current timestamp for LWW fallback
      const now = Date.now();

      for (const field of conflict.conflictingFields) {
        const merger = this._options.fieldMergers[field] ?? FieldMergers.lastWriteWins;

        mergedData[field] = merger(
          field,
          conflict.localData[field],
          conflict.remoteData[field],
          now,
          now
        );
      }

      return {
        decision: 'use_merged',
        mergedData,
        mergedClock: mergeVectorClocks(conflict.localClock, conflict.remoteClock),
        resolvedBy: 'strategy',
        resolvedAt: Date.now(),
        reason: `Merged ${conflict.conflictingFields.length} conflicting fields`,
      };
    } catch (error) {
      this._options.hooks.onMergeFailed?.(conflict, error as Error);

      // Fallback to last-write-wins
      return this._resolveLastWriteWins(conflict);
    }
  }

  /**
   * Resolve using manual/UI strategy.
   */
  private async _resolveManual(conflict: SyncConflict): Promise<ConflictResolution> {
    const hook = this._options.hooks.onConflictNeedsResolution;

    if (!hook) {
      // No UI hook, fall back to last-write-wins
      console.warn('[ConflictResolver] No UI hook for manual resolution, falling back to LWW');
      return this._resolveLastWriteWins(conflict);
    }

    // Create a timeout promise
    const timeout = new Promise<ConflictResolution>((_, reject) => {
      setTimeout(() => {
        reject(new Error('Manual resolution timed out'));
      }, this._options.manualResolutionTimeout);
    });

    try {
      // Race between user resolution and timeout
      const resolution = await Promise.race([
        hook(conflict),
        timeout,
      ]);

      return {
        ...resolution,
        mergedClock: mergeVectorClocks(conflict.localClock, conflict.remoteClock),
        resolvedBy: 'user',
        resolvedAt: Date.now(),
      };
    } catch (error) {
      console.warn('[ConflictResolver] Manual resolution failed:', error);

      // Defer the conflict for later
      return {
        decision: 'defer',
        mergedClock: conflict.localClock, // Keep local for now
        resolvedBy: 'auto',
        resolvedAt: Date.now(),
        reason: `Manual resolution failed: ${(error as Error).message}`,
      };
    }
  }
}

/**
 * Create a conflict resolver instance.
 */
export const createConflictResolver = (
  options: ConflictResolverOptions
): ConflictResolver => {
  return new ConflictResolver(options);
};
