/**
 * Abstract base class for SQL storage adapters.
 * 
 * Provides common functionality and enforces consistent behavior across all adapters.
 * Follows the Template Method pattern - subclasses implement adapter-specific logic
 * while the base class handles cross-cutting concerns.
 * 
 * ## Responsibilities
 * - Parameter validation and sanitization
 * - Error handling and standardization
 * - Lifecycle management (open/close state tracking)
 * - Performance monitoring with configurable tiers
 * - Query result caching (optional)
 * - Lifecycle hooks for RAG integration
 * - Logging and diagnostics
 * 
 * @example Implementing a new adapter
 * ```typescript
 * export class MyAdapter extends BaseStorageAdapter {
 *   protected async doOpen(options?: StorageOpenOptions): Promise<void> {
 *     // Adapter-specific connection logic
 *   }
 * 
 *   protected async doRun(statement: string, parameters?: StorageParameters): Promise<StorageRunResult> {
 *     // Adapter-specific mutation logic
 *   }
 * 
 *   // ... implement other abstract methods
 * }
 * ```
 * 
 * @example Using with performance tiers and hooks
 * ```typescript
 * const adapter = new MyAdapter({
 *   performance: { tier: 'balanced', trackMetrics: true },
 *   hooks: {
 *     onBeforeWrite: async (ctx) => {
 *       // Generate embedding for RAG
 *       ctx.metadata = { embedding: await embed(ctx.parameters?.[0]) };
 *       return ctx;
 *     }
 *   }
 * });
 * ```
 */

import type {
  StorageAdapter,
  StorageCapability,
  StorageOpenOptions,
  StorageParameters,
  StorageRunResult,
  BatchOperation,
  BatchResult,
  PreparedStatement
} from '../core/contracts';

import type {
  PerformanceConfig,
  PerformanceSettings,
  CacheEntry,
  CacheStats,
  MutableCacheStats,
} from '../core/contracts/performance';

import {
  resolvePerformanceConfig,
  isTransientError,
} from '../core/contracts/performance';

import type {
  StorageHooks,
  QueryContext,
  WriteContext,
  TransactionContext,
  OperationContext,
} from '../core/contracts/hooks';

import { generateOperationId } from '../core/contracts/hooks';

/**
 * Base state for all adapters.
 */
enum AdapterState {
  CLOSED = 'closed',
  OPENING = 'opening',
  OPEN = 'open',
  CLOSING = 'closing',
  ERROR = 'error'
}

/**
 * Options for BaseStorageAdapter configuration.
 * 
 * @example Basic options
 * ```typescript
 * const adapter = new MyAdapter({ verbose: true });
 * ```
 * 
 * @example With performance tier
 * ```typescript
 * const adapter = new MyAdapter({
 *   performance: { tier: 'fast' }
 * });
 * ```
 * 
 * @example With hooks for RAG
 * ```typescript
 * const adapter = new MyAdapter({
 *   hooks: {
 *     onAfterWrite: async (ctx, result) => {
 *       await updateVectorIndex(result.lastInsertRowid, ctx.metadata?.embedding);
 *     }
 *   }
 * });
 * ```
 */
export interface BaseAdapterOptions {
  /** Enable detailed logging (default: false) */
  verbose?: boolean;
  
  /** 
   * Enable performance tracking and metrics collection.
   * @defaultValue true when tier is 'balanced' or 'accurate'
   */
  trackPerformance?: boolean;
  
  /** 
   * Performance tier configuration.
   * Controls caching, batching, validation, and retry behavior.
   * @defaultValue { tier: 'balanced' }
   */
  performance?: PerformanceConfig;
  
  /**
   * Lifecycle hooks for extending adapter behavior.
   * Useful for RAG integration, logging, analytics, and auditing.
   */
  hooks?: StorageHooks;
  
  /**
   * Validate SQL statements before execution.
   * Convenience option that overrides performance.validateSql.
   * @defaultValue true
   */
  validateSQL?: boolean;
}

/**
 * Performance metrics tracked by the base adapter.
 */
export interface AdapterMetrics {
  /** Total number of queries executed */
  totalQueries: number;
  /** Total number of mutations (INSERT/UPDATE/DELETE) */
  totalMutations: number;
  /** Total number of transactions */
  totalTransactions: number;
  /** Total number of errors */
  totalErrors: number;
  /** Average query duration in milliseconds */
  averageQueryDuration: number;
  /** Time when adapter was opened */
  openedAt: Date | null;
  /** Cache statistics (if caching enabled) */
  cache?: CacheStats;
  /** Slow query count */
  slowQueries: number;
  /** Retry count */
  retries: number;
}

/**
 * Abstract base class for SQL storage adapters.
 * 
 * Implements common functionality shared by all adapters:
 * - State management (open/close tracking)
 * - Parameter validation
 * - Error handling and wrapping
 * - Performance metrics with configurable tiers
 * - Query result caching (tier-dependent)
 * - Lifecycle hooks for RAG and analytics
 * - Logging and diagnostics
 */
export abstract class BaseStorageAdapter implements StorageAdapter {
  // Required interface properties (subclasses must set these)
  public abstract readonly kind: string;
  public abstract readonly capabilities: ReadonlySet<StorageCapability>;

  // State management
  private state: AdapterState = AdapterState.CLOSED;
  
  // Configuration
  protected readonly options: BaseAdapterOptions;
  protected readonly performanceSettings: PerformanceSettings;
  protected readonly hooks: StorageHooks;
  
  // Metrics
  private metrics: AdapterMetrics = {
    totalQueries: 0,
    totalMutations: 0,
    totalTransactions: 0,
    totalErrors: 0,
    averageQueryDuration: 0,
    openedAt: null,
    slowQueries: 0,
    retries: 0,
  };
  
  // Cache
  private queryCache: Map<string, CacheEntry> = new Map();
  private cacheStats: MutableCacheStats = {
    hits: 0,
    misses: 0,
    hitRatio: 0,
    size: 0,
    bytesUsed: 0,
    evictions: 0,
    invalidations: 0,
  };
  
  // Performance tracking
  private queryDurations: number[] = [];
  private readonly MAX_DURATION_SAMPLES = 100; // Keep last 100 for rolling average

  /**
   * Creates a new adapter instance.
   * 
   * @param options - Configuration options for the adapter
   * 
   * @example Default balanced tier
   * ```typescript
   * const adapter = new MyAdapter();
   * ```
   * 
   * @example Fast tier for development
   * ```typescript
   * const adapter = new MyAdapter({
   *   performance: { tier: 'fast' },
   *   verbose: true
   * });
   * ```
   * 
   * @example With RAG hooks
   * ```typescript
   * const adapter = new MyAdapter({
   *   hooks: {
   *     onBeforeWrite: async (ctx) => {
   *       ctx.metadata = { embedding: await embed(ctx.parameters) };
   *       return ctx;
   *     }
   *   }
   * });
   * ```
   */
  constructor(options: BaseAdapterOptions = {}) {
    this.options = options;
    
    // Resolve performance config, allowing top-level validateSQL to override
    const perfConfig = options.performance ?? {};
    const resolvedSettings = resolvePerformanceConfig(perfConfig);
    
    // Allow top-level validateSQL to override performance.validateSql
    if (options.validateSQL !== undefined) {
      this.performanceSettings = {
        ...resolvedSettings,
        validateSql: options.validateSQL,
      };
    } else {
      this.performanceSettings = resolvedSettings;
    }
    
    this.hooks = options.hooks ?? {};
  }

  // ============================================================================
  // Public Interface (Template Methods)
  // ============================================================================

  /**
   * Opens the adapter connection.
   * Handles state management and delegates to subclass implementation.
   */
  public async open(options?: StorageOpenOptions): Promise<void> {
    if (this.state === AdapterState.OPEN) {
      this.log('Adapter already open, skipping open()');
      return;
    }

    if (this.state === AdapterState.OPENING) {
      throw new Error(`[${this.kind}] Adapter is already opening`);
    }

    this.state = AdapterState.OPENING;
    
    try {
      await this.performOpen(options);
      this.state = AdapterState.OPEN;
      this.metrics.openedAt = new Date();
      this.log('Adapter opened successfully');
    } catch (error) {
      this.state = AdapterState.ERROR;
      this.metrics.totalErrors++;
      throw this.wrapError('Failed to open adapter', error);
    }
  }

  /**
   * Executes a mutation statement (INSERT, UPDATE, DELETE).
   * 
   * Invokes `onBeforeWrite` and `onAfterWrite` hooks if configured.
   * Supports retry on transient errors based on performance tier.
   */
  public async run(statement: string, parameters?: StorageParameters): Promise<StorageRunResult> {
    this.assertOpen();
    this.validateStatement(statement);
    
    const startTime = Date.now();
    const operationId = generateOperationId();
    
    // Build write context for hooks
    let context: WriteContext = {
      operationId,
      operation: 'run',
      startTime,
      adapterKind: this.kind,
      statement,
      parameters,
      affectedTables: this.extractTables(statement),
    };
    
    try {
      // Execute onBeforeWrite hook
      if (this.hooks.onBeforeWrite) {
        const hookResult = await this.hooks.onBeforeWrite(context);
        if (hookResult === undefined) {
          // Hook aborted the operation
          return { changes: 0 };
        }
        context = hookResult;
      }
      
      // Execute with retry logic
      const result = await this.executeWithRetry(
        () => this.performRun(context.statement, context.parameters),
        context
      );
      
      const duration = Date.now() - startTime;
      this.metrics.totalMutations++;
      this.trackDuration(duration);
      this.checkSlowQuery(duration, context.statement);
      
      // Invalidate cache for affected tables
      if (this.performanceSettings.cacheEnabled && context.affectedTables) {
        this.invalidateCache(context.affectedTables);
      }
      
      this.log(`Mutation executed: ${statement.substring(0, 50)}... (${result.changes} rows affected)`);
      
      // Execute onAfterWrite hook
      if (this.hooks.onAfterWrite) {
        await this.hooks.onAfterWrite(context, result);
      }
      
      return result;
    } catch (error) {
      this.metrics.totalErrors++;
      const wrappedError = this.wrapError(`Failed to execute mutation: ${statement}`, error);
      
      // Execute onError hook
      if (this.hooks.onError) {
        const hookResult = await this.hooks.onError(wrappedError, context);
        if (hookResult === undefined) {
          // Hook suppressed the error
          return { changes: 0 };
        }
        throw hookResult;
      }
      
      throw wrappedError;
    }
  }

  /**
   * Retrieves a single row.
   * 
   * Supports caching based on performance tier and invokes query hooks.
   */
  public async get<T = unknown>(statement: string, parameters?: StorageParameters): Promise<T | null> {
    this.assertOpen();
    this.validateStatement(statement);
    
    const startTime = Date.now();
    const operationId = generateOperationId();
    const cacheKey = this.getCacheKey('get', statement, parameters);
    
    // Check cache first
    if (this.performanceSettings.cacheEnabled) {
      const cached = this.getFromCache<T | null>(cacheKey);
      if (cached !== undefined) {
        return cached;
      }
    }
    
    // Build query context for hooks
    let context: QueryContext = {
      operationId,
      operation: 'get',
      startTime,
      adapterKind: this.kind,
      statement,
      parameters,
      affectedTables: this.extractTables(statement),
    };
    
    try {
      // Execute onBeforeQuery hook
      if (this.hooks.onBeforeQuery) {
        const hookResult = await this.hooks.onBeforeQuery(context);
        if (hookResult === undefined) {
          return null; // Hook aborted
        }
        context = hookResult;
      }
      
      // Execute with retry
      let result = await this.executeWithRetry(
        () => this.performGet<T>(context.statement, context.parameters),
        context
      );
      
      const duration = Date.now() - startTime;
      this.metrics.totalQueries++;
      this.trackDuration(duration);
      this.checkSlowQuery(duration, context.statement);
      
      this.log(`Query executed: ${statement.substring(0, 50)}... (${result ? '1 row' : 'no rows'})`);
      
      // Execute onAfterQuery hook
      if (this.hooks.onAfterQuery) {
        const hookResult = await this.hooks.onAfterQuery(context, result);
        if (hookResult !== undefined) {
          result = hookResult as Awaited<T> | null;
        }
      }
      
      // Cache the result
      if (this.performanceSettings.cacheEnabled) {
        this.setCache(cacheKey, result, context.affectedTables);
      }
      
      return result;
    } catch (error) {
      this.metrics.totalErrors++;
      const wrappedError = this.wrapError(`Failed to execute query: ${statement}`, error);
      
      if (this.hooks.onError) {
        const hookResult = await this.hooks.onError(wrappedError, context);
        if (hookResult === undefined) {
          return null;
        }
        throw hookResult;
      }
      
      throw wrappedError;
    }
  }

  /**
   * Retrieves all rows.
   * 
   * Supports caching based on performance tier and invokes query hooks.
   */
  public async all<T = unknown>(statement: string, parameters?: StorageParameters): Promise<T[]> {
    this.assertOpen();
    this.validateStatement(statement);
    
    const startTime = Date.now();
    const operationId = generateOperationId();
    const cacheKey = this.getCacheKey('all', statement, parameters);
    
    // Check cache first
    if (this.performanceSettings.cacheEnabled) {
      const cached = this.getFromCache<T[]>(cacheKey);
      if (cached !== undefined) {
        return cached;
      }
    }
    
    // Build query context for hooks
    let context: QueryContext = {
      operationId,
      operation: 'all',
      startTime,
      adapterKind: this.kind,
      statement,
      parameters,
      affectedTables: this.extractTables(statement),
    };
    
    try {
      // Execute onBeforeQuery hook
      if (this.hooks.onBeforeQuery) {
        const hookResult = await this.hooks.onBeforeQuery(context);
        if (hookResult === undefined) {
          return []; // Hook aborted
        }
        context = hookResult;
      }
      
      // Execute with retry
      let results = await this.executeWithRetry(
        () => this.performAll<T>(context.statement, context.parameters),
        context
      );
      
      const duration = Date.now() - startTime;
      this.metrics.totalQueries++;
      this.trackDuration(duration);
      this.checkSlowQuery(duration, context.statement);
      
      this.log(`Query executed: ${statement.substring(0, 50)}... (${results.length} rows)`);
      
      // Execute onAfterQuery hook
      if (this.hooks.onAfterQuery) {
        const hookResult = await this.hooks.onAfterQuery(context, results);
        if (hookResult !== undefined) {
          results = hookResult as T[];
        }
      }
      
      // Cache the result
      if (this.performanceSettings.cacheEnabled) {
        this.setCache(cacheKey, results, context.affectedTables);
      }
      
      return results;
    } catch (error) {
      this.metrics.totalErrors++;
      const wrappedError = this.wrapError(`Failed to execute query: ${statement}`, error);
      
      if (this.hooks.onError) {
        const hookResult = await this.hooks.onError(wrappedError, context);
        if (hookResult === undefined) {
          return [];
        }
        throw hookResult;
      }
      
      throw wrappedError;
    }
  }

  /**
   * Executes a SQL script.
   */
  public async exec(script: string): Promise<void> {
    this.assertOpen();
    
    if (!script || !script.trim()) {
      throw new Error('SQL script cannot be empty');
    }
    
    const startTime = Date.now();
    
    try {
      await this.performExec(script);
      
      this.trackDuration(Date.now() - startTime);
      this.log(`Script executed successfully`);
    } catch (error) {
      this.metrics.totalErrors++;
      throw this.wrapError('Failed to execute script', error);
    }
  }

  /**
   * Executes a transaction.
   * 
   * Invokes transaction hooks and invalidates cache on completion.
   */
  public async transaction<T>(fn: (trx: StorageAdapter) => Promise<T>): Promise<T> {
    this.assertOpen();
    
    const startTime = Date.now();
    const operationId = generateOperationId();
    
    // Build transaction context
    let context: TransactionContext = {
      operationId,
      operation: 'transaction',
      startTime,
      adapterKind: this.kind,
    };
    
    try {
      // Execute onBeforeTransaction hook
      if (this.hooks.onBeforeTransaction) {
        const hookResult = await this.hooks.onBeforeTransaction(context);
        if (hookResult === undefined) {
          throw new Error('Transaction aborted by hook');
        }
        context = hookResult;
      }
      
      const result = await this.performTransaction(fn);
      
      context.outcome = 'committed';
      this.metrics.totalTransactions++;
      this.trackDuration(Date.now() - startTime);
      this.log('Transaction committed successfully');
      
      // Invalidate all cache on transaction commit (conservative approach)
      if (this.performanceSettings.cacheEnabled) {
        this.clearCache();
      }
      
      // Execute onAfterTransaction hook
      if (this.hooks.onAfterTransaction) {
        await this.hooks.onAfterTransaction(context);
      }
      
      return result;
    } catch (error) {
      context.outcome = 'rolled_back';
      this.metrics.totalErrors++;
      const wrappedError = this.wrapError('Transaction failed', error);
      
      // Execute hooks
      if (this.hooks.onAfterTransaction) {
        await this.hooks.onAfterTransaction(context);
      }
      
      if (this.hooks.onError) {
        const hookResult = await this.hooks.onError(wrappedError, context);
        if (hookResult === undefined) {
          throw new Error('Transaction rolled back');
        }
        throw hookResult;
      }
      
      throw wrappedError;
    }
  }

  /**
   * Closes the adapter connection.
   */
  public async close(): Promise<void> {
    if (this.state === AdapterState.CLOSED) {
      this.log('Adapter already closed, skipping close()');
      return;
    }

    if (this.state === AdapterState.CLOSING) {
      throw new Error(`[${this.kind}] Adapter is already closing`);
    }

    this.state = AdapterState.CLOSING;
    
    try {
      await this.performClose();
      this.state = AdapterState.CLOSED;
      this.log('Adapter closed successfully');
    } catch (error) {
      this.state = AdapterState.ERROR;
      throw this.wrapError('Failed to close adapter', error);
    }
  }

  /**
   * Executes a batch of operations (optional).
   */
  public async batch(operations: BatchOperation[]): Promise<BatchResult> {
    this.assertOpen();
    
    if (!this.capabilities.has('batch')) {
      throw new Error(`[${this.kind}] Batch operations are not supported`);
    }
    
    if (!this.performBatch) {
      throw new Error(`[${this.kind}] Batch operations not implemented`);
    }
    
    if (!operations || operations.length === 0) {
      throw new Error('Batch operations cannot be empty');
    }
    
    const startTime = Date.now();
    
    try {
      const result = await this.performBatch(operations);
      
      this.trackDuration(Date.now() - startTime);
      this.log(`Batch executed: ${result.successful} successful, ${result.failed} failed`);
      
      return result;
    } catch (error) {
      this.metrics.totalErrors++;
      throw this.wrapError('Batch execution failed', error);
    }
  }

  /**
   * Creates a prepared statement (optional).
   */
  public prepare<T = unknown>(statement: string): PreparedStatement<T> {
    this.assertOpen();
    
    if (!this.capabilities.has('prepared')) {
      throw new Error(`[${this.kind}] Prepared statements are not supported`);
    }
    
    if (!this.performPrepare) {
      throw new Error(`[${this.kind}] Prepared statements not implemented`);
    }
    
    this.validateStatement(statement);
    return this.performPrepare<T>(statement);
  }

  // ============================================================================
  // Protected Abstract Methods (Subclasses MUST implement)
  // ============================================================================

  /**
   * Adapter-specific open logic.
   * Called by base class after state validation.
   */
  protected abstract performOpen(options?: StorageOpenOptions): Promise<void>;

  /**
   * Adapter-specific mutation logic.
   */
  protected abstract performRun(statement: string, parameters?: StorageParameters): Promise<StorageRunResult>;

  /**
   * Adapter-specific single-row query logic.
   */
  protected abstract performGet<T>(statement: string, parameters?: StorageParameters): Promise<T | null>;

  /**
   * Adapter-specific multi-row query logic.
   */
  protected abstract performAll<T>(statement: string, parameters?: StorageParameters): Promise<T[]>;

  /**
   * Adapter-specific script execution logic.
   */
  protected abstract performExec(script: string): Promise<void>;

  /**
   * Adapter-specific transaction logic.
   */
  protected abstract performTransaction<T>(fn: (trx: StorageAdapter) => Promise<T>): Promise<T>;

  /**
   * Adapter-specific close logic.
   */
  protected abstract performClose(): Promise<void>;

  /**
   * Adapter-specific batch logic (optional).
   * Only called if adapter declares 'batch' capability.
   */
  protected performBatch?(operations: BatchOperation[]): Promise<BatchResult>;

  /**
   * Adapter-specific prepared statement logic (optional).
   * Only called if adapter declares 'prepared' capability.
   */
  protected performPrepare?<T>(statement: string): PreparedStatement<T>;

  // ============================================================================
  // Protected Helper Methods (Available to subclasses)
  // ============================================================================

  /**
   * Asserts that adapter is in open state.
   * @throws {Error} If adapter is not open
   */
  protected assertOpen(): void {
    if (this.state !== AdapterState.OPEN) {
      throw new Error(`[${this.kind}] Adapter is not open (current state: ${this.state})`);
    }
  }

  /**
   * Validates SQL statement.
   * @throws {Error} If statement is invalid
   */
  protected validateStatement(statement: string): void {
    if (!this.performanceSettings.validateSql) {
      return;
    }

    if (!statement || !statement.trim()) {
      throw new Error('SQL statement cannot be empty');
    }

    // Basic SQL injection protection (parameters should be used instead)
    if (statement.includes('--') && !statement.includes('-- ')) {
      this.log('Warning: SQL comment detected in statement');
    }
  }
  
  // ============================================================================
  // Cache Management
  // ============================================================================
  
  /**
   * Generates a cache key for a query.
   * Includes operation type to prevent get/all cache collisions.
   */
  private getCacheKey(operation: 'get' | 'all', statement: string, parameters?: StorageParameters): string {
    const paramStr = parameters ? JSON.stringify(parameters) : '';
    return `${operation}::${statement}::${paramStr}`;
  }
  
  /**
   * Gets a value from cache if valid.
   */
  private getFromCache<T>(key: string): T | undefined {
    const entry = this.queryCache.get(key);
    
    if (!entry) {
      this.cacheStats.misses++;
      this.updateCacheHitRatio();
      return undefined;
    }
    
    // Check expiration
    if (Date.now() > entry.expiresAt) {
      this.queryCache.delete(key);
      this.cacheStats.misses++;
      this.updateCacheHitRatio();
      return undefined;
    }
    
    // Update LRU tracking
    entry.hits++;
    entry.lastAccessedAt = Date.now();
    
    this.cacheStats.hits++;
    this.updateCacheHitRatio();
    
    return entry.data as T;
  }
  
  /**
   * Sets a value in cache.
   */
  private setCache<T>(key: string, data: T, affectedTables?: string[]): void {
    // Enforce max entries
    if (this.queryCache.size >= this.performanceSettings.cacheMaxEntries) {
      this.evictLRU();
    }
    
    const now = Date.now();
    const entry: CacheEntry<T> = {
      data,
      createdAt: now,
      expiresAt: now + this.performanceSettings.cacheTtlMs,
      affectedTables: affectedTables ?? [],
      hits: 0,
      lastAccessedAt: now,
    };
    
    this.queryCache.set(key, entry);
    this.cacheStats.size = this.queryCache.size;
  }
  
  /**
   * Invalidates cache entries for specific tables.
   */
  private invalidateCache(tables: string[]): void {
    const tableSet = new Set(tables.map(t => t.toLowerCase()));
    
    for (const [key, entry] of this.queryCache.entries()) {
      const hasAffectedTable = entry.affectedTables.some(t => 
        tableSet.has(t.toLowerCase())
      );
      
      if (hasAffectedTable) {
        this.queryCache.delete(key);
        this.cacheStats.invalidations++;
      }
    }
    
    this.cacheStats.size = this.queryCache.size;
  }
  
  /**
   * Clears entire cache.
   */
  private clearCache(): void {
    this.queryCache.clear();
    this.cacheStats.size = 0;
  }
  
  /**
   * Evicts least recently used cache entry.
   */
  private evictLRU(): void {
    let oldest: { key: string; time: number } | null = null;
    
    for (const [key, entry] of this.queryCache.entries()) {
      if (!oldest || entry.lastAccessedAt < oldest.time) {
        oldest = { key, time: entry.lastAccessedAt };
      }
    }
    
    if (oldest) {
      this.queryCache.delete(oldest.key);
      this.cacheStats.evictions++;
    }
  }
  
  /**
   * Updates cache hit ratio.
   */
  private updateCacheHitRatio(): void {
    const total = this.cacheStats.hits + this.cacheStats.misses;
    this.cacheStats.hitRatio = total > 0 ? this.cacheStats.hits / total : 0;
  }
  
  // ============================================================================
  // Retry Logic
  // ============================================================================
  
  /**
   * Executes an operation with retry logic.
   */
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    context: OperationContext
  ): Promise<T> {
    if (!this.performanceSettings.retryOnError) {
      return operation();
    }
    
    let lastError: Error | undefined;
    
    for (let attempt = 0; attempt <= this.performanceSettings.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (!isTransientError(lastError) || attempt >= this.performanceSettings.maxRetries) {
          throw lastError;
        }
        
        this.metrics.retries++;
        const delay = this.performanceSettings.retryDelayMs * Math.pow(2, attempt);
        this.log(`Retrying operation ${context.operationId} in ${delay}ms (attempt ${attempt + 1})`);
        
        await this.sleep(delay);
      }
    }
    
    throw lastError;
  }
  
  /**
   * Sleep utility for retry delays.
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  // ============================================================================
  // SQL Parsing Utilities
  // ============================================================================
  
  /**
   * Extracts table names from a SQL statement.
   * 
   * @remarks
   * Simple regex-based extraction. For complex queries, consider
   * using a proper SQL parser.
   */
  private extractTables(statement: string): string[] {
    const tables: string[] = [];
    const upperStatement = statement.toUpperCase();
    
    // Match FROM table_name
    const fromMatch = upperStatement.match(/FROM\s+([^\s,;(]+)/gi);
    if (fromMatch) {
      fromMatch.forEach(match => {
        const table = match.replace(/^FROM\s+/i, '').trim();
        if (table && !table.startsWith('(')) {
          tables.push(table.toLowerCase());
        }
      });
    }
    
    // Match INSERT INTO table_name
    const insertMatch = statement.match(/INSERT\s+INTO\s+([^\s(]+)/i);
    if (insertMatch?.[1]) {
      tables.push(insertMatch[1].toLowerCase());
    }
    
    // Match UPDATE table_name
    const updateMatch = statement.match(/UPDATE\s+([^\s]+)/i);
    if (updateMatch?.[1]) {
      tables.push(updateMatch[1].toLowerCase());
    }
    
    // Match DELETE FROM table_name
    const deleteMatch = statement.match(/DELETE\s+FROM\s+([^\s]+)/i);
    if (deleteMatch?.[1]) {
      tables.push(deleteMatch[1].toLowerCase());
    }
    
    // Match JOIN table_name
    const joinMatches = statement.match(/JOIN\s+([^\s]+)/gi);
    if (joinMatches) {
      joinMatches.forEach(match => {
        const table = match.replace(/^JOIN\s+/i, '').trim();
        tables.push(table.toLowerCase());
      });
    }
    
    return [...new Set(tables)]; // Deduplicate
  }
  
  /**
   * Checks if query duration exceeds slow query threshold.
   */
  private checkSlowQuery(duration: number, statement: string): void {
    if (duration > this.performanceSettings.slowQueryThresholdMs) {
      this.metrics.slowQueries++;
      this.log(`SLOW QUERY (${duration}ms): ${statement.substring(0, 100)}...`);
    }
  }

  /**
   * Wraps an error with adapter context.
   */
  protected wrapError(message: string, error: unknown): Error {
    const originalMessage = error instanceof Error ? error.message : String(error);
    const wrappedError = new Error(`[${this.kind}] ${message}: ${originalMessage}`);
    
    // Preserve stack trace
    if (error instanceof Error && error.stack) {
      wrappedError.stack = error.stack;
    }
    
    return wrappedError;
  }

  /**
   * Logs a message if verbose mode is enabled.
   */
  protected log(message: string): void {
    if (this.options.verbose) {
      console.log(`[${this.kind}] ${message}`);
    }
  }
  
  /**
   * Logs a warning message (always outputs regardless of verbose).
   */
  protected logWarn(message: string): void {
    console.warn(`[${this.kind}] ${message}`);
  }

  /**
   * Tracks query duration for performance metrics.
   */
  private trackDuration(duration: number): void {
    if (!this.options.trackPerformance) {
      return;
    }

    this.queryDurations.push(duration);
    
    // Keep only last N samples
    if (this.queryDurations.length > this.MAX_DURATION_SAMPLES) {
      this.queryDurations.shift();
    }
    
    // Update average
    const sum = this.queryDurations.reduce((a, b) => a + b, 0);
    this.metrics.averageQueryDuration = sum / this.queryDurations.length;
  }

  // ============================================================================
  // Public Utility Methods
  // ============================================================================

  /**
   * Gets current adapter state.
   */
  public getState(): string {
    return this.state;
  }

  /**
   * Gets performance metrics.
   */
  public getMetrics(): Readonly<AdapterMetrics> {
    return { 
      ...this.metrics,
      cache: this.performanceSettings.cacheEnabled ? { ...this.cacheStats } : undefined,
    };
  }
  
  /**
   * Gets cache statistics.
   */
  public getCacheStats(): Readonly<CacheStats> | null {
    if (!this.performanceSettings.cacheEnabled) {
      return null;
    }
    return { ...this.cacheStats };
  }
  
  /**
   * Gets current performance settings.
   */
  public getPerformanceSettings(): Readonly<PerformanceSettings> {
    return { ...this.performanceSettings };
  }

  /**
   * Checks if adapter is open.
   */
  public isOpen(): boolean {
    return this.state === AdapterState.OPEN;
  }

  /**
   * Checks if adapter is closed.
   */
  public isClosed(): boolean {
    return this.state === AdapterState.CLOSED;
  }

  /**
   * Gets uptime in milliseconds.
   */
  public getUptime(): number {
    if (!this.metrics.openedAt) {
      return 0;
    }
    return Date.now() - this.metrics.openedAt.getTime();
  }
}
