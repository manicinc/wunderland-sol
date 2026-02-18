/**
 * Vector Clock Implementation for Causality Tracking.
 *
 * Vector clocks track the causal ordering of events across distributed
 * systems. Each device maintains a counter, and comparing clocks reveals
 * whether events happened-before, happened-after, or are concurrent.
 *
 * @example
 * ```typescript
 * const clock = new VectorClock('device-1');
 *
 * // Local write - increment our counter
 * clock.tick();
 *
 * // Received remote update - merge clocks
 * clock.merge(remoteClockData);
 *
 * // Compare causality
 * const relation = clock.compare(otherClock);
 * if (relation === 'concurrent') {
 *   // Conflict detected!
 * }
 * ```
 */

// ============================================================================
// Types
// ============================================================================

/**
 * Vector clock data structure.
 * Maps device IDs to their logical clock values.
 */
export type VectorClockData = Record<string, number>;

/**
 * Causal relationship between two vector clocks.
 */
export type CausalRelation =
  | 'before'      // This clock happened before the other
  | 'after'       // This clock happened after the other
  | 'concurrent'  // Events are concurrent (potential conflict)
  | 'equal';      // Clocks are identical

/**
 * Serialized vector clock for transmission.
 */
export interface SerializedVectorClock {
  /** Device ID that owns this clock */
  deviceId: string;
  /** Clock values for all known devices */
  values: VectorClockData;
  /** Timestamp when clock was last updated */
  updatedAt: number;
}

// ============================================================================
// Vector Clock
// ============================================================================

/**
 * Vector Clock for distributed causality tracking.
 *
 * Implements Lamport's vector clock algorithm for determining
 * causal ordering of events across multiple devices.
 */
export class VectorClock {
  private values: VectorClockData = {};
  private lastUpdated: number = Date.now();

  constructor(private readonly deviceId: string) {
    // Initialize our own counter
    this.values[deviceId] = 0;
  }

  // ============================================================================
  // Core Operations
  // ============================================================================

  /**
   * Increment this device's clock (local event occurred).
   * Call this before sending a message or making a local change.
   *
   * @returns The new clock value for this device
   */
  public tick(): number {
    this.values[this.deviceId] = (this.values[this.deviceId] ?? 0) + 1;
    this.lastUpdated = Date.now();
    return this.values[this.deviceId];
  }

  /**
   * Merge another clock into this one (received remote event).
   * Takes the maximum of each device's counter.
   *
   * @param other - The remote clock to merge
   */
  public merge(other: VectorClockData | VectorClock): void {
    const otherValues = other instanceof VectorClock ? other.values : other;

    for (const [deviceId, value] of Object.entries(otherValues)) {
      this.values[deviceId] = Math.max(this.values[deviceId] ?? 0, value);
    }

    // Increment our own clock after receiving
    this.tick();
  }

  /**
   * Update from received clock without incrementing local counter.
   * Used when just observing, not participating in the event.
   *
   * @param other - The remote clock to observe
   */
  public observe(other: VectorClockData | VectorClock): void {
    const otherValues = other instanceof VectorClock ? other.values : other;

    for (const [deviceId, value] of Object.entries(otherValues)) {
      this.values[deviceId] = Math.max(this.values[deviceId] ?? 0, value);
    }
    this.lastUpdated = Date.now();
  }

  // ============================================================================
  // Comparison
  // ============================================================================

  /**
   * Compare this clock to another to determine causal relationship.
   *
   * @param other - The clock to compare against
   * @returns The causal relationship
   */
  public compare(other: VectorClockData | VectorClock): CausalRelation {
    const otherValues = other instanceof VectorClock ? other.values : other;

    let thisGreater = false;
    let otherGreater = false;

    // Get all device IDs from both clocks
    const allDevices = new Set([
      ...Object.keys(this.values),
      ...Object.keys(otherValues),
    ]);

    for (const deviceId of allDevices) {
      const thisValue = this.values[deviceId] ?? 0;
      const otherValue = otherValues[deviceId] ?? 0;

      if (thisValue > otherValue) {
        thisGreater = true;
      } else if (otherValue > thisValue) {
        otherGreater = true;
      }
    }

    if (thisGreater && otherGreater) {
      return 'concurrent'; // Conflict!
    } else if (thisGreater) {
      return 'after';
    } else if (otherGreater) {
      return 'before';
    } else {
      return 'equal';
    }
  }

  /**
   * Check if this clock happened before another.
   */
  public happenedBefore(other: VectorClockData | VectorClock): boolean {
    return this.compare(other) === 'before';
  }

  /**
   * Check if this clock happened after another.
   */
  public happenedAfter(other: VectorClockData | VectorClock): boolean {
    return this.compare(other) === 'after';
  }

  /**
   * Check if this clock is concurrent with another (conflict).
   */
  public isConcurrent(other: VectorClockData | VectorClock): boolean {
    return this.compare(other) === 'concurrent';
  }

  // ============================================================================
  // Accessors
  // ============================================================================

  /**
   * Get this device's ID.
   */
  public getDeviceId(): string {
    return this.deviceId;
  }

  /**
   * Get this device's current clock value.
   */
  public getValue(): number {
    return this.values[this.deviceId] ?? 0;
  }

  /**
   * Get clock value for a specific device.
   */
  public getValueFor(deviceId: string): number {
    return this.values[deviceId] ?? 0;
  }

  /**
   * Get all clock values.
   */
  public getValues(): VectorClockData {
    return { ...this.values };
  }

  /**
   * Get list of known device IDs.
   */
  public getKnownDevices(): string[] {
    return Object.keys(this.values);
  }

  /**
   * Get when the clock was last updated.
   */
  public getLastUpdated(): number {
    return this.lastUpdated;
  }

  // ============================================================================
  // Serialization
  // ============================================================================

  /**
   * Serialize clock for transmission.
   */
  public serialize(): SerializedVectorClock {
    return {
      deviceId: this.deviceId,
      values: { ...this.values },
      updatedAt: this.lastUpdated,
    };
  }

  /**
   * Create a clock from serialized data.
   */
  public static deserialize(data: SerializedVectorClock): VectorClock {
    const clock = new VectorClock(data.deviceId);
    clock.values = { ...data.values };
    clock.lastUpdated = data.updatedAt;
    return clock;
  }

  /**
   * Create a copy of this clock.
   */
  public clone(): VectorClock {
    return VectorClock.deserialize(this.serialize());
  }

  /**
   * Convert to JSON string.
   */
  public toJSON(): string {
    return JSON.stringify(this.serialize());
  }

  /**
   * Create from JSON string.
   */
  public static fromJSON(json: string): VectorClock {
    return VectorClock.deserialize(JSON.parse(json));
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a new vector clock for a device.
 *
 * @param deviceId - Unique identifier for this device
 * @returns New VectorClock instance
 */
export function createVectorClock(deviceId: string): VectorClock {
  return new VectorClock(deviceId);
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Compare two clock data objects without creating instances.
 */
export function compareClocks(
  a: VectorClockData,
  b: VectorClockData
): CausalRelation {
  let aGreater = false;
  let bGreater = false;

  const allDevices = new Set([...Object.keys(a), ...Object.keys(b)]);

  for (const deviceId of allDevices) {
    const aValue = a[deviceId] ?? 0;
    const bValue = b[deviceId] ?? 0;

    if (aValue > bValue) {
      aGreater = true;
    } else if (bValue > aValue) {
      bGreater = true;
    }
  }

  if (aGreater && bGreater) return 'concurrent';
  if (aGreater) return 'after';
  if (bGreater) return 'before';
  return 'equal';
}

/**
 * Merge multiple clocks into a new clock.
 */
export function mergeClocks(
  deviceId: string,
  ...clocks: VectorClockData[]
): VectorClock {
  const result = new VectorClock(deviceId);

  for (const clock of clocks) {
    result.observe(clock);
  }

  return result;
}

/**
 * Check if a clock dominates another (happened strictly after).
 */
export function dominates(a: VectorClockData, b: VectorClockData): boolean {
  return compareClocks(a, b) === 'after';
}

/**
 * Generate a unique device ID.
 */
export function generateDeviceId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `device_${timestamp}_${random}`;
}
