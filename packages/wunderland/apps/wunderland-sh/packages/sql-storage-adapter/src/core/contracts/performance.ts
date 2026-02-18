/**
 * Performance Configuration Types for SQL Storage Adapter
 * 
 * This module defines the performance tier system, caching configuration,
 * and optimization options that enable cost/accuracy tradeoffs across
 * all adapter implementations.
 * 
 * @packageDocumentation
 * @module @framers/sql-storage-adapter/performance
 * 
 * @remarks
 * The performance system is designed to be:
 * - **Platform-agnostic**: Same API across browser, mobile, desktop, cloud
 * - **Extensible**: Hooks and metadata support for custom extensions
 * - **Configurable**: Sensible defaults with full override capability
 * - **Observable**: Built-in metrics and slow query logging
 * 
 * @example Basic usage with tier presets
 * ```typescript
 * import { createDatabase } from '@framers/sql-storage-adapter';
 * 
 * // Development: prioritize speed
 * const devDb = await createDatabase({
 *   performance: { tier: 'fast' }
 * });
 * 
 * // Production analytics: prioritize accuracy
 * const analyticsDb = await createDatabase({
 *   performance: { tier: 'accurate', trackMetrics: true }
 * });
 * ```
 */

// ============================================================================
// Performance Tiers
// ============================================================================

/**
 * Performance tier presets for common use cases.
 * 
 * Each tier provides sensible defaults that can be individually overridden.
 * The tier affects caching, batching, validation, and query optimization.
 * 
 * | Tier | Use Case | Caching | Batching | Validation |
 * |------|----------|---------|----------|------------|
 * | `fast` | Development, testing | Aggressive | Yes | Minimal |
 * | `balanced` | General production | Moderate | No | Standard |
 * | `accurate` | Analytics, reporting | Disabled | No | Full |
 * | `efficient` | Mobile, battery-constrained | Moderate | Yes | Minimal |
 * | `custom` | Full manual control | Manual | Manual | Manual |
 * 
 * @example
 * ```typescript
 * // Mobile app with battery optimization
 * const db = await createDatabase({
 *   performance: { tier: 'efficient' }
 * });
 * ```
 */
export type PerformanceTier = 
  | 'fast'      // Prioritize speed over accuracy (dev/testing)
  | 'balanced'  // Default - good for most production apps
  | 'accurate'  // Prioritize accuracy over speed (analytics, reporting)
  | 'efficient' // Prioritize battery/bandwidth (mobile, IoT)
  | 'custom';   // Fully custom configuration

/**
 * Default settings for each performance tier.
 * 
 * @internal
 */
export const TIER_DEFAULTS: Record<Exclude<PerformanceTier, 'custom'>, Readonly<PerformanceSettings>> = {
  fast: {
    cacheEnabled: true,
    cacheTtlMs: 30000,
    cacheMaxEntries: 500,
    batchWrites: true,
    batchFlushIntervalMs: 50,
    batchMaxSize: 100,
    validateSql: false,
    trackMetrics: false,
    slowQueryThresholdMs: 500,
    retryOnError: false,
    maxRetries: 1,
    retryDelayMs: 100,
  },
  balanced: {
    cacheEnabled: true,
    cacheTtlMs: 5000,
    cacheMaxEntries: 1000,
    batchWrites: false,
    batchFlushIntervalMs: 100,
    batchMaxSize: 50,
    validateSql: true,
    trackMetrics: true,
    slowQueryThresholdMs: 100,
    retryOnError: true,
    maxRetries: 3,
    retryDelayMs: 100,
  },
  accurate: {
    cacheEnabled: false,
    cacheTtlMs: 0,
    cacheMaxEntries: 0,
    batchWrites: false,
    batchFlushIntervalMs: 0,
    batchMaxSize: 1,
    validateSql: true,
    trackMetrics: true,
    slowQueryThresholdMs: 50,
    retryOnError: true,
    maxRetries: 5,
    retryDelayMs: 200,
  },
  efficient: {
    cacheEnabled: true,
    cacheTtlMs: 60000,
    cacheMaxEntries: 200,
    batchWrites: true,
    batchFlushIntervalMs: 500,
    batchMaxSize: 20,
    validateSql: false,
    trackMetrics: false,
    slowQueryThresholdMs: 200,
    retryOnError: true,
    maxRetries: 3,
    retryDelayMs: 500,
  },
} as const;

// ============================================================================
// Performance Settings
// ============================================================================

/**
 * Individual performance settings (all fields required).
 * 
 * @internal
 * Used internally after merging tier defaults with user overrides.
 */
export interface PerformanceSettings {
  /** Enable query result caching */
  readonly cacheEnabled: boolean;
  
  /** Cache TTL in milliseconds */
  readonly cacheTtlMs: number;
  
  /** Maximum cache entries */
  readonly cacheMaxEntries: number;
  
  /** Enable write batching */
  readonly batchWrites: boolean;
  
  /** Batch flush interval in ms */
  readonly batchFlushIntervalMs: number;
  
  /** Maximum batch size before auto-flush */
  readonly batchMaxSize: number;
  
  /** Validate SQL before execution */
  readonly validateSql: boolean;
  
  /** Track performance metrics */
  readonly trackMetrics: boolean;
  
  /** Log slow queries above this threshold in ms */
  readonly slowQueryThresholdMs: number;
  
  /** Retry transient errors */
  readonly retryOnError: boolean;
  
  /** Maximum retry attempts */
  readonly maxRetries: number;
  
  /** Retry delay in ms */
  readonly retryDelayMs: number;
}

/**
 * Performance configuration options provided by users.
 * 
 * All fields are optional; unspecified fields use tier defaults.
 * 
 * @example Override specific settings while using a tier
 * ```typescript
 * const db = await createDatabase({
 *   performance: {
 *     tier: 'balanced',
 *     cacheTtlMs: 30000,     // Override: longer cache
 *     trackMetrics: true,    // Override: enable metrics
 *   }
 * });
 * ```
 */
export interface PerformanceConfig {
  /**
   * Performance tier preset.
   * 
   * @defaultValue 'balanced'
   */
  tier?: PerformanceTier;
  
  /**
   * Enable query result caching.
   * 
   * When enabled, identical SELECT queries return cached results
   * until the cache TTL expires or cache is invalidated.
   * 
   * @remarks
   * - Caching is per-adapter instance (not shared)
   * - Cache is invalidated on any write operation to affected tables
   * - Use `accurate` tier for systems where stale data is unacceptable
   * 
   * @defaultValue tier-dependent
   */
  cacheEnabled?: boolean;
  
  /**
   * Cache time-to-live in milliseconds.
   * 
   * After this duration, cached query results are considered stale
   * and will be re-fetched on next access.
   * 
   * @defaultValue 5000 for balanced tier
   */
  cacheTtlMs?: number;
  
  /**
   * Maximum number of cached query results.
   * 
   * When exceeded, least-recently-used entries are evicted.
   * 
   * @defaultValue 1000 for balanced tier
   */
  cacheMaxEntries?: number;
  
  /**
   * Enable write batching.
   * 
   * When enabled, write operations (INSERT, UPDATE, DELETE) are
   * collected and executed in batches to reduce I/O operations.
   * 
   * @remarks
   * - Recommended for mobile/browser environments
   * - Not recommended for systems requiring immediate consistency
   * - Batch is flushed on `batchFlushIntervalMs` or `batchMaxSize`
   * 
   * @defaultValue false for balanced tier, true for efficient tier
   */
  batchWrites?: boolean;
  
  /**
   * Batch flush interval in milliseconds.
   * 
   * Accumulated writes are flushed after this interval.
   * 
   * @defaultValue 100 for balanced tier
   */
  batchFlushIntervalMs?: number;
  
  /**
   * Maximum batch size before auto-flush.
   * 
   * When batch reaches this size, it is immediately flushed
   * regardless of the flush interval.
   * 
   * @defaultValue 50 for balanced tier
   */
  batchMaxSize?: number;
  
  /**
   * Validate SQL statements before execution.
   * 
   * Performs basic syntax and injection checks.
   * 
   * @defaultValue true for balanced tier
   */
  validateSql?: boolean;
  
  /**
   * Track performance metrics.
   * 
   * When enabled, the adapter tracks:
   * - Total queries/mutations/transactions
   * - Average query duration
   * - Error counts
   * - Uptime
   * 
   * Retrieve metrics via `adapter.getMetrics()`.
   * 
   * @defaultValue true for balanced tier
   */
  trackMetrics?: boolean;
  
  /**
   * Slow query logging threshold in milliseconds.
   * 
   * Queries exceeding this duration are logged at warn level.
   * 
   * @defaultValue 100 for balanced tier
   */
  slowQueryThresholdMs?: number;
  
  /**
   * Retry operations on transient errors.
   * 
   * Transient errors include network timeouts, connection resets,
   * and deadlocks.
   * 
   * @defaultValue true for balanced tier
   */
  retryOnError?: boolean;
  
  /**
   * Maximum retry attempts.
   * 
   * @defaultValue 3 for balanced tier
   */
  maxRetries?: number;
  
  /**
   * Delay between retry attempts in milliseconds.
   * 
   * Uses exponential backoff: delay * 2^attempt.
   * 
   * @defaultValue 100 for balanced tier
   */
  retryDelayMs?: number;
}

// ============================================================================
// Cache Types
// ============================================================================

/**
 * Cache entry for query results.
 * 
 * @internal
 */
export interface CacheEntry<T = unknown> {
  /** Cached result data */
  readonly data: T;
  
  /** Timestamp when entry was created (ms since epoch) */
  readonly createdAt: number;
  
  /** Timestamp when entry expires (ms since epoch) */
  readonly expiresAt: number;
  
  /** Tables affected by this query (for invalidation) */
  readonly affectedTables: ReadonlyArray<string>;
  
  /** Cache hit count for LRU tracking */
  hits: number;
  
  /** Last access timestamp for LRU tracking */
  lastAccessedAt: number;
}

/**
 * Cache statistics for monitoring (public API is readonly).
 */
export interface CacheStats {
  /** Total cache hits */
  readonly hits: number;
  
  /** Total cache misses */
  readonly misses: number;
  
  /** Hit ratio (hits / (hits + misses)) */
  readonly hitRatio: number;
  
  /** Current number of entries */
  readonly size: number;
  
  /** Total bytes used (approximate) */
  readonly bytesUsed: number;
  
  /** Number of evictions */
  readonly evictions: number;
  
  /** Number of invalidations */
  readonly invalidations: number;
}

/**
 * Mutable version of CacheStats for internal use.
 */
export type MutableCacheStats = {
  -readonly [K in keyof CacheStats]: CacheStats[K];
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Resolves performance configuration by merging tier defaults with user overrides.
 * 
 * @param config - User-provided performance configuration
 * @returns Fully resolved performance settings
 * 
 * @example
 * ```typescript
 * const settings = resolvePerformanceConfig({ tier: 'fast', cacheTtlMs: 10000 });
 * // Returns fast tier defaults with cacheTtlMs overridden to 10000
 * ```
 */
export function resolvePerformanceConfig(config: PerformanceConfig = {}): PerformanceSettings {
  const tier = config.tier ?? 'balanced';
  
  if (tier === 'custom') {
    // Custom tier requires all fields to be specified
    return {
      cacheEnabled: config.cacheEnabled ?? false,
      cacheTtlMs: config.cacheTtlMs ?? 0,
      cacheMaxEntries: config.cacheMaxEntries ?? 0,
      batchWrites: config.batchWrites ?? false,
      batchFlushIntervalMs: config.batchFlushIntervalMs ?? 0,
      batchMaxSize: config.batchMaxSize ?? 1,
      validateSql: config.validateSql ?? true,
      trackMetrics: config.trackMetrics ?? false,
      slowQueryThresholdMs: config.slowQueryThresholdMs ?? 100,
      retryOnError: config.retryOnError ?? false,
      maxRetries: config.maxRetries ?? 1,
      retryDelayMs: config.retryDelayMs ?? 100,
    };
  }
  
  const defaults = TIER_DEFAULTS[tier];
  
  return {
    cacheEnabled: config.cacheEnabled ?? defaults.cacheEnabled,
    cacheTtlMs: config.cacheTtlMs ?? defaults.cacheTtlMs,
    cacheMaxEntries: config.cacheMaxEntries ?? defaults.cacheMaxEntries,
    batchWrites: config.batchWrites ?? defaults.batchWrites,
    batchFlushIntervalMs: config.batchFlushIntervalMs ?? defaults.batchFlushIntervalMs,
    batchMaxSize: config.batchMaxSize ?? defaults.batchMaxSize,
    validateSql: config.validateSql ?? defaults.validateSql,
    trackMetrics: config.trackMetrics ?? defaults.trackMetrics,
    slowQueryThresholdMs: config.slowQueryThresholdMs ?? defaults.slowQueryThresholdMs,
    retryOnError: config.retryOnError ?? defaults.retryOnError,
    maxRetries: config.maxRetries ?? defaults.maxRetries,
    retryDelayMs: config.retryDelayMs ?? defaults.retryDelayMs,
  };
}

/**
 * Checks if an error is transient and should be retried.
 * 
 * @param error - The error to check
 * @returns true if the error is transient
 * 
 * @example
 * ```typescript
 * try {
 *   await db.run('INSERT INTO users (name) VALUES (?)', ['Alice']);
 * } catch (error) {
 *   if (isTransientError(error)) {
 *     // Retry the operation
 *   }
 * }
 * ```
 */
export function isTransientError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  
  const message = error.message.toLowerCase();
  
  // Common transient error patterns
  const transientPatterns = [
    'timeout',
    'connection reset',
    'connection refused',
    'econnreset',
    'econnrefused',
    'etimedout',
    'network',
    'deadlock',
    'lock wait timeout',
    'too many connections',
    'connection pool',
    'busy',
    'temporarily unavailable',
  ];
  
  return transientPatterns.some(pattern => message.includes(pattern));
}



