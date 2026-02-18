/**
 * Lifecycle Hooks for SQL Storage Adapter
 * 
 * This module defines the hook system that enables extending adapter behavior
 * without modifying core implementations. Hooks are particularly useful for:
 * 
 * - **Analytics**: Query logging, performance monitoring
 * - **Auditing**: Write logging, compliance tracking
 * - **Caching**: Custom cache strategies, invalidation
 * - **Transformation**: Query/result modification
 * - **Extensions**: Build higher-level abstractions on top
 * 
 * @packageDocumentation
 * @module @framers/sql-storage-adapter/hooks
 * 
 * @remarks
 * Hooks are executed in a predictable order:
 * 1. `onBeforeQuery`/`onBeforeWrite` - Before operation execution
 * 2. Operation executes
 * 3. `onAfterQuery`/`onAfterWrite` - After successful execution
 * 4. `onError` - If an error occurred
 * 
 * @example Audit logging hook
 * ```typescript
 * import { createDatabase, type StorageHooks } from '@framers/sql-storage-adapter';
 * 
 * const auditHooks: StorageHooks = {
 *   onBeforeWrite: async (context) => {
 *     console.log(`[AUDIT] ${context.operation}: ${context.statement}`);
 *     return context;
 *   }
 * };
 * 
 * const db = await createDatabase({ hooks: auditHooks });
 * ```
 */

import type { StorageParameters, StorageRunResult } from './index';

// ============================================================================
// Context Types
// ============================================================================

/**
 * Base context for all operations.
 * 
 * Provides common information available to all hooks.
 */
export interface OperationContext {
  /**
   * Unique identifier for this operation (UUID v4).
   * 
   * Use for correlation in logs and traces.
   */
  readonly operationId: string;
  
  /**
   * Operation type being performed.
   */
  readonly operation: 'get' | 'all' | 'exec' | 'run' | 'batch' | 'transaction';
  
  /**
   * Timestamp when operation started (ms since epoch).
   */
  readonly startTime: number;
  
  /**
   * Adapter kind (e.g., 'better-sqlite3', 'indexeddb', 'postgres').
   */
  readonly adapterKind: string;
  
  /**
   * Custom metadata attached to this operation.
   * 
   * Hooks can read and modify this to pass data between hooks
   * or to the calling code.
   * 
   * @example Marking a query for special handling
   * ```typescript
   * const results = await db.all(
   *   'SELECT * FROM users WHERE id = ?',
   *   [userId],
   *   { metadata: { skipCache: true, auditLevel: 'high' } }
   * );
   * ```
   */
  metadata?: Record<string, unknown>;
}

/**
 * Context for query operations (get, all, exec).
 * 
 * @example
 * ```typescript
 * const hooks: StorageHooks = {
 *   onBeforeQuery: async (context) => {
 *     console.log(`Executing: ${context.statement}`);
 *     return context; // or modified context
 *   }
 * };
 * ```
 */
export interface QueryContext extends OperationContext {
  /**
   * Operation type (query operations only).
   */
  readonly operation: 'get' | 'all' | 'exec';
  
  /**
   * SQL statement being executed.
   * 
   * Hooks can modify this to transform queries.
   */
  statement: string;
  
  /**
   * Parameters for parameterized queries.
   * 
   * Hooks can modify this to transform parameters.
   */
  parameters?: StorageParameters;
  
  /**
   * Tables referenced in this query (if detected).
   * 
   * Used for cache invalidation and tracking.
   */
  affectedTables?: string[];
}

/**
 * Context for write operations (run, batch).
 * 
 * @example
 * ```typescript
 * const hooks: StorageHooks = {
 *   onBeforeWrite: async (context) => {
 *     // Add timestamp to all inserts
 *     if (context.statement.toUpperCase().startsWith('INSERT')) {
 *       context.metadata = { ...context.metadata, insertedAt: Date.now() };
 *     }
 *     return context;
 *   }
 * };
 * ```
 */
export interface WriteContext extends OperationContext {
  /**
   * Operation type (write operations only).
   */
  readonly operation: 'run' | 'batch';
  
  /**
   * SQL statement being executed.
   * 
   * Hooks can modify this to transform mutations.
   */
  statement: string;
  
  /**
   * Parameters for parameterized statements.
   * 
   * Hooks can modify this to transform parameters.
   */
  parameters?: StorageParameters;
  
  /**
   * Tables being modified by this write.
   * 
   * Used for cache invalidation and tracking.
   */
  affectedTables?: string[];
  
  /**
   * Whether this write is part of a transaction.
   */
  readonly inTransaction?: boolean;
}

/**
 * Context for transaction operations.
 * 
 * @example
 * ```typescript
 * const hooks: StorageHooks = {
 *   onBeforeTransaction: async (context) => {
 *     console.log(`Starting transaction ${context.operationId}`);
 *     return context;
 *   },
 *   onAfterTransaction: async (context) => {
 *     console.log(`Transaction ${context.operationId} committed`);
 *   }
 * };
 * ```
 */
export interface TransactionContext extends OperationContext {
  /**
   * Operation type (transaction only).
   */
  readonly operation: 'transaction';
  
  /**
   * Number of operations in this transaction (after completion).
   */
  operationCount?: number;
  
  /**
   * Whether transaction was committed or rolled back.
   */
  outcome?: 'committed' | 'rolled_back';
}

// ============================================================================
// Hook Result Types
// ============================================================================

/**
 * Result type for query hooks that can transform results.
 */
export type QueryHookResult<T = unknown> = T | undefined | void;

/**
 * Result type for write hooks that can abort operations.
 */
export type WriteHookResult = WriteContext | undefined | void;

/**
 * Result type for error hooks that can transform or suppress errors.
 */
export type ErrorHookResult = Error | undefined | void;

// ============================================================================
// Storage Hooks Interface
// ============================================================================

/**
 * Lifecycle hooks for extending adapter behavior.
 * 
 * All hooks are optional and async. Hooks can:
 * - Observe operations (logging, analytics)
 * - Transform inputs (queries, parameters)
 * - Transform outputs (results, errors)
 * - Abort operations (return undefined to skip)
 * 
 * @remarks
 * **Hook Execution Order:**
 * 1. `onBeforeQuery`/`onBeforeWrite` - Can modify context
 * 2. Operation executes
 * 3. `onAfterQuery`/`onAfterWrite` - Can modify result
 * 4. `onError` - Only on failure, can modify/suppress error
 * 
 * **Thread Safety:**
 * Hooks execute sequentially per operation but may run
 * concurrently across different operations.
 * 
 * @example Complete hook setup for logging and metrics
 * ```typescript
 * const hooks: StorageHooks = {
 *   // Log all queries
 *   onBeforeQuery: async (ctx) => {
 *     logger.debug('Query', { sql: ctx.statement, op: ctx.operationId });
 *     return ctx;
 *   },
 *   
 *   // Track query duration
 *   onAfterQuery: async (ctx, result) => {
 *     const duration = Date.now() - ctx.startTime;
 *     metrics.recordHistogram('query_duration', duration);
 *     return result;
 *   },
 *   
 *   // Audit write operations
 *   onBeforeWrite: async (ctx) => {
 *     console.log(`[AUDIT] ${ctx.operation}: ${ctx.statement}`);
 *     ctx.metadata = { ...ctx.metadata, auditedAt: Date.now() };
 *     return ctx;
 *   },
 *   
 *   // Track writes
 *   onAfterWrite: async (ctx, result) => {
 *     if (result.changes > 0) {
 *       metrics.increment('db.writes', result.changes);
 *     }
 *   },
 *   
 *   // Log and transform errors
 *   onError: async (error, ctx) => {
 *     logger.error('Database error', { error, operation: ctx.operationId });
 *     return new DatabaseError(error.message, { cause: error });
 *   }
 * };
 * ```
 */
export interface StorageHooks {
  /**
   * Called before any query execution (get, all, exec).
   * 
   * Use for:
   * - Query transformation/rewriting
   * - Logging/tracing
   * - Cache checks
   * - Permission validation
   * 
   * @param context - Query context (mutable)
   * @returns Modified context, original context, or undefined to skip
   * 
   * @example Query transformation
   * ```typescript
   * onBeforeQuery: async (ctx) => {
   *   // Add tenant filter to all queries
   *   if (!ctx.statement.includes('tenant_id')) {
   *     ctx.statement = ctx.statement.replace(
   *       'WHERE',
   *       `WHERE tenant_id = '${tenantId}' AND`
   *     );
   *   }
   *   return ctx;
   * }
   * ```
   */
  onBeforeQuery?: (context: QueryContext) => Promise<QueryContext | void>;
  
  /**
   * Called after successful query execution.
   * 
   * Use for:
   * - Result transformation
   * - Caching
   * - Metrics recording
   * - Post-processing (e.g., decryption)
   * 
   * @param context - Query context (read-only)
   * @param result - Query result
   * @returns Modified result, original result, or undefined
   * 
   * @example Add computed fields to results
   * ```typescript
   * onAfterQuery: async (ctx, result) => {
   *   if (Array.isArray(result)) {
   *     return result.map(row => ({
   *       ...row,
   *       fullName: `${row.firstName} ${row.lastName}`
   *     }));
   *   }
   *   return result;
   * }
   * ```
   */
  onAfterQuery?: <T = unknown>(context: QueryContext, result: T) => Promise<QueryHookResult<T>>;
  
  /**
   * Called before any write operation (run, batch).
   * 
   * Use for:
   * - Validation
   * - Audit logging
   * - Timestamp injection
   * - Encryption
   * - Custom transformations
   * 
   * @param context - Write context (mutable)
   * @returns Modified context, original context, or undefined to skip
   * 
   * @example Automatic timestamp injection
   * ```typescript
   * onBeforeWrite: async (ctx) => {
   *   if (ctx.statement.includes('INSERT INTO')) {
   *     ctx.metadata = { 
   *       ...ctx.metadata, 
   *       insertedAt: Date.now() 
   *     };
   *   }
   *   return ctx;
   * }
   * ```
   */
  onBeforeWrite?: (context: WriteContext) => Promise<WriteHookResult>;
  
  /**
   * Called after successful write operation.
   * 
   * Use for:
   * - Cache invalidation
   * - Sync triggers
   * - Notification dispatch
   * - Audit completion
   * - External service updates
   * 
   * @param context - Write context (read-only)
   * @param result - Write result
   * 
   * @example Trigger sync after write
   * ```typescript
   * onAfterWrite: async (ctx, result) => {
   *   if (result.changes > 0) {
   *     await syncService.markDirty(ctx.affectedTables);
   *     console.log(`Updated ${result.changes} rows`);
   *   }
   * }
   * ```
   */
  onAfterWrite?: (context: WriteContext, result: StorageRunResult) => Promise<void>;
  
  /**
   * Called before transaction starts.
   * 
   * Use for:
   * - Transaction logging
   * - Distributed transaction coordination
   * - Savepoint creation
   * 
   * @param context - Transaction context
   * @returns Modified context or undefined to skip
   */
  onBeforeTransaction?: (context: TransactionContext) => Promise<TransactionContext | void>;
  
  /**
   * Called after transaction completes (commit or rollback).
   * 
   * Use for:
   * - Transaction logging
   * - Cleanup
   * - Cache invalidation
   * 
   * @param context - Transaction context with outcome
   */
  onAfterTransaction?: (context: TransactionContext) => Promise<void>;
  
  /**
   * Called when any operation fails.
   * 
   * Use for:
   * - Error logging
   * - Error transformation
   * - Error suppression (return undefined)
   * - Alerting
   * - Retry decision
   * 
   * @param error - The error that occurred
   * @param context - Operation context
   * @returns Transformed error, original error, or undefined to suppress
   * 
   * @example Error transformation and logging
   * ```typescript
   * onError: async (error, ctx) => {
   *   // Log with full context
   *   logger.error('Database operation failed', {
   *     error: error.message,
   *     operation: ctx.operation,
   *     operationId: ctx.operationId,
   *     duration: Date.now() - ctx.startTime,
   *   });
   *   
   *   // Transform to application-specific error
   *   if (error.message.includes('unique constraint')) {
   *     return new DuplicateEntryError('Record already exists');
   *   }
   *   
   *   return error;
   * }
   * ```
   */
  onError?: (error: Error, context: OperationContext) => Promise<ErrorHookResult>;
}

// ============================================================================
// Hook Utilities
// ============================================================================

/**
 * Combines multiple hook objects into a single hook object.
 * 
 * When multiple hooks are combined, they execute in order.
 * For transformation hooks (onBefore*, onAfter*), each hook
 * receives the result of the previous hook.
 * 
 * @param hooks - Hook objects to combine
 * @returns Combined hook object
 * 
 * @example
 * ```typescript
 * const loggingHooks: StorageHooks = {
 *   onBeforeQuery: async (ctx) => {
 *     console.log('Query:', ctx.statement);
 *     return ctx;
 *   }
 * };
 * 
 * const metricsHooks: StorageHooks = {
 *   onAfterQuery: async (ctx, result) => {
 *     metrics.record('query', Date.now() - ctx.startTime);
 *     return result;
 *   }
 * };
 * 
 * const combinedHooks = combineHooks(loggingHooks, metricsHooks);
 * ```
 */
export function combineHooks(...hooks: StorageHooks[]): StorageHooks {
  return {
    onBeforeQuery: async (context) => {
      let ctx = context;
      for (const hook of hooks) {
        if (hook.onBeforeQuery) {
          const result = await hook.onBeforeQuery(ctx);
          if (result === undefined) {
            return undefined; // Early abort
          }
          ctx = result;
        }
      }
      return ctx;
    },
    
    onAfterQuery: async (context, result) => {
      let res = result;
      for (const hook of hooks) {
        if (hook.onAfterQuery) {
          const transformed = await hook.onAfterQuery(context, res);
          if (transformed !== undefined) {
            res = transformed;
          }
        }
      }
      return res;
    },
    
    onBeforeWrite: async (context) => {
      let ctx = context;
      for (const hook of hooks) {
        if (hook.onBeforeWrite) {
          const result = await hook.onBeforeWrite(ctx);
          if (result === undefined) {
            return undefined; // Early abort
          }
          ctx = result;
        }
      }
      return ctx;
    },
    
    onAfterWrite: async (context, result) => {
      for (const hook of hooks) {
        if (hook.onAfterWrite) {
          await hook.onAfterWrite(context, result);
        }
      }
    },
    
    onBeforeTransaction: async (context) => {
      let ctx = context;
      for (const hook of hooks) {
        if (hook.onBeforeTransaction) {
          const result = await hook.onBeforeTransaction(ctx);
          if (result === undefined) {
            return undefined;
          }
          ctx = result;
        }
      }
      return ctx;
    },
    
    onAfterTransaction: async (context) => {
      for (const hook of hooks) {
        if (hook.onAfterTransaction) {
          await hook.onAfterTransaction(context);
        }
      }
    },
    
    onError: async (error, context) => {
      let err: Error | undefined = error;
      for (const hook of hooks) {
        if (hook.onError && err) {
          const result = await hook.onError(err, context);
          if (result === undefined) {
            return undefined; // Error suppressed
          }
          err = result;
        }
      }
      return err;
    },
  };
}

/**
 * Creates a hook that only runs for specific operations.
 * 
 * @param operations - Operations to filter for
 * @param hooks - Hooks to apply
 * @returns Filtered hooks
 * 
 * @example Only log write operations
 * ```typescript
 * const writeOnlyHooks = filterHooks(['run', 'batch'], {
 *   onBeforeWrite: async (ctx) => {
 *     console.log('Write:', ctx.statement);
 *     return ctx;
 *   }
 * });
 * ```
 */
export function filterHooks(
  operations: OperationContext['operation'][],
  hooks: StorageHooks
): StorageHooks {
  const operationSet = new Set(operations);
  
  return {
    onBeforeQuery: hooks.onBeforeQuery 
      ? async (ctx) => operationSet.has(ctx.operation) ? hooks.onBeforeQuery!(ctx) : ctx
      : undefined,
    
    onAfterQuery: hooks.onAfterQuery
      ? async (ctx, result) => operationSet.has(ctx.operation) ? hooks.onAfterQuery!(ctx, result) : result
      : undefined,
    
    onBeforeWrite: hooks.onBeforeWrite
      ? async (ctx) => operationSet.has(ctx.operation) ? hooks.onBeforeWrite!(ctx) : ctx
      : undefined,
    
    onAfterWrite: hooks.onAfterWrite
      ? async (ctx, result) => { if (operationSet.has(ctx.operation)) await hooks.onAfterWrite!(ctx, result); }
      : undefined,
    
    onBeforeTransaction: hooks.onBeforeTransaction
      ? async (ctx) => operationSet.has(ctx.operation) ? hooks.onBeforeTransaction!(ctx) : ctx
      : undefined,
    
    onAfterTransaction: hooks.onAfterTransaction
      ? async (ctx) => { if (operationSet.has(ctx.operation)) await hooks.onAfterTransaction!(ctx); }
      : undefined,
    
    onError: hooks.onError
      ? async (err, ctx) => operationSet.has(ctx.operation) ? hooks.onError!(err, ctx) : err
      : undefined,
  };
}

/**
 * Generates a unique operation ID.
 * 
 * @returns UUID v4 string
 * 
 * @internal
 */
export function generateOperationId(): string {
  // Use crypto.randomUUID if available, otherwise fallback
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  
  // Fallback UUID v4 generation
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}



