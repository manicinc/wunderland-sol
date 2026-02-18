/**
 * @packageDocumentation
 * Core type definitions for the SQL storage adapter abstraction.
 *
 * This package provides a unified interface for SQL storage across multiple platforms,
 * with automatic fallback mechanisms and runtime detection.
 */

/**
 * Supported storage capability flags.
 *
 * These flags indicate what features are available for each adapter implementation.
 * Consumers should check these capabilities before attempting operations that may
 * not be universally supported.
 */
export type StorageCapability =
  | 'sync'         // Adapter exposes synchronous execution (only better-sqlite3)
  | 'transactions' // Adapter guarantees proper ACID transaction support
  | 'wal'          // Adapter can enable Write-Ahead Logging for better concurrency (SQLite only)
  | 'locks'        // Adapter honours OS-level file locking semantics (prevents corruption)
  | 'persistence'  // Data survives process restarts (false for in-memory databases)
  | 'streaming'    // Adapter supports streaming large result sets without loading all into memory
  | 'batch'        // Adapter supports efficient batch insert/update operations
  | 'prepared'     // Adapter supports prepared statements for better performance
  | 'concurrent'   // Adapter supports concurrent connections/queries (connection pooling)
  | 'json'         // Adapter has native JSON/JSONB support
  | 'arrays'       // Adapter supports array data types natively;

/**
 * Parameter payload accepted by storage statements.
 *
 * Parameters can be provided in multiple formats:
 * - Named parameters: `{ name: 'John', age: 30 }` for statements like `WHERE name = @name`
 * - Positional parameters: `['John', 30]` for statements like `WHERE name = ? AND age = ?`
 * - No parameters: `undefined` or `null` for parameterless queries
 */
export type StorageParameters =
  | undefined
  | null
  | Record<string, unknown>
  | Array<string | number | null | Uint8Array | unknown>;

/**
 * Result metadata for mutation statements (INSERT, UPDATE, DELETE).
 */
export interface StorageRunResult {
  /** Number of rows affected by the statement. */
  changes: number;
  /** Row identifier (if available) returned by the underlying engine. */
  lastInsertRowid?: string | number | null;
}

/**
 * Batch operation descriptor for bulk operations.
 */
export interface BatchOperation {
  /** SQL statement to execute */
  statement: string;
  /** Parameters for this specific operation */
  parameters?: StorageParameters;
}

/**
 * Result of a batch operation execution.
 */
export interface BatchResult {
  /** Number of successfully executed operations */
  successful: number;
  /** Number of failed operations */
  failed: number;
  /** Individual results for each operation (if adapter supports it) */
  results?: StorageRunResult[];
  /** Errors for failed operations (if any) */
  errors?: Array<{ index: number; error: Error }>;
}

/**
 * Options accepted when opening a storage adapter.
 */
export interface StorageOpenOptions {
  /** Absolute path to the primary database file (when applicable). */
  filePath?: string;
  /** Connection string (PostgreSQL, etc.). */
  connectionString?: string;
  /** Optional flag to force read-only mode. */
  readOnly?: boolean;
  /** Arbitrary adapter-specific options bag. */
  adapterOptions?: Record<string, unknown>;
}

/**
 * Core SQL storage adapter interface.
 *
 * Every adapter implementation must fulfill this contract to ensure
 * compatibility across different SQL backends. Check the `capabilities`
 * property to determine which optional features are supported.
 *
 * ## Error Handling
 * All methods should throw meaningful errors when operations fail.
 * Adapters should not silently fail or return undefined on errors.
 *
 * ## Thread Safety
 * Adapters should document their thread-safety guarantees. SQLite adapters
 * typically don't support concurrent writes, while PostgreSQL does.
 */
export interface StorageAdapter {
  /** Identifier for logging/diagnostics (e.g., 'better-sqlite3', 'postgres'). */
  readonly kind: string;

  /** Capability flags indicating supported features. */
  readonly capabilities: ReadonlySet<StorageCapability>;

  /**
   * Opens the underlying connection or initializes the backing store.
   *
   * @throws {Error} If connection cannot be established
   * @example
   * await adapter.open({ filePath: '/path/to/db.sqlite3' });
   */
  open(options?: StorageOpenOptions): Promise<void>;

  /**
   * Executes a mutation statement (INSERT, UPDATE, DELETE).
   *
   * @param statement - SQL statement to execute
   * @param parameters - Optional parameters for the statement
   * @returns Metadata about affected rows
   * @throws {Error} If statement execution fails
   * @example
   * const result = await adapter.run('INSERT INTO users (name) VALUES (?)', ['John']);
   * console.log(`Inserted with ID: ${result.lastInsertRowid}`);
   */
  run(statement: string, parameters?: StorageParameters): Promise<StorageRunResult>;

  /**
   * Retrieves a single row (or null if none found).
   *
   * @param statement - SQL SELECT statement
   * @param parameters - Optional parameters for the statement
   * @returns First row or null if no results
   * @throws {Error} If query execution fails
   * @example
   * const user = await adapter.get<User>('SELECT * FROM users WHERE id = ?', [123]);
   */
  get<T = unknown>(statement: string, parameters?: StorageParameters): Promise<T | null>;

  /**
   * Retrieves all rows returned by the statement.
   *
   * WARNING: For large result sets, this loads everything into memory.
   * Consider using streaming (if supported) for large queries.
   *
   * @param statement - SQL SELECT statement
   * @param parameters - Optional parameters for the statement
   * @returns Array of all matching rows (empty array if none)
   * @throws {Error} If query execution fails
   * @example
   * const users = await adapter.all<User>('SELECT * FROM users WHERE age > ?', [18]);
   */
  all<T = unknown>(statement: string, parameters?: StorageParameters): Promise<T[]>;

  /**
   * Executes a script containing multiple SQL statements.
   *
   * Statements are typically delimited by semicolons. This is useful for
   * running migrations or initialization scripts. No results are returned.
   *
   * @param script - SQL script with multiple statements
   * @throws {Error} If any statement in the script fails
   * @example
   * await adapter.exec(`
   *   CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT);
   *   CREATE INDEX idx_users_name ON users(name);
   * `);
   */
  exec(script: string): Promise<void>;

  /**
   * Executes a callback within a database transaction.
   *
   * The transaction is automatically committed on success or rolled back
   * on error. Nested transactions may not be supported by all adapters.
   *
   * @param fn - Async callback to execute within the transaction
   * @returns Result of the callback function
   * @throws {Error} Transaction is rolled back and error is re-thrown
   * @example
   * const result = await adapter.transaction(async (trx) => {
   *   await trx.run('INSERT INTO accounts (balance) VALUES (?)', [100]);
   *   await trx.run('INSERT INTO logs (action) VALUES (?)', ['account_created']);
   *   return { success: true };
   * });
   */
  transaction<T>(fn: (trx: StorageAdapter) => Promise<T>): Promise<T>;

  /**
   * Closes the underlying connection and releases resources.
   *
   * After calling close(), the adapter should not be used again.
   * Always close adapters when done to prevent resource leaks.
   *
   * @example
   * try {
   *   await adapter.open();
   *   // ... use adapter ...
   * } finally {
   *   await adapter.close();
   * }
   */
  close(): Promise<void>;

  /**
   * Executes multiple operations in a batch (if supported).
   *
   * This is more efficient than executing operations individually,
   * especially for bulk inserts. Check if 'batch' capability is present.
   *
   * @param operations - Array of operations to execute
   * @returns Batch execution results
   * @throws {Error} If adapter doesn't support batch operations
   * @example
   * if (adapter.capabilities.has('batch')) {
   *   const result = await adapter.batch([
   *     { statement: 'INSERT INTO users (name) VALUES (?)', parameters: ['Alice'] },
   *     { statement: 'INSERT INTO users (name) VALUES (?)', parameters: ['Bob'] }
   *   ]);
   * }
   */
  batch?(operations: BatchOperation[]): Promise<BatchResult>;

  /**
   * Returns a prepared statement for repeated execution (if supported).
   *
   * Prepared statements improve performance for frequently executed queries
   * and provide better protection against SQL injection. Check if 'prepared'
   * capability is present.
   *
   * @param statement - SQL statement to prepare
   * @returns Prepared statement handle
   * @throws {Error} If adapter doesn't support prepared statements
   */
  prepare?<T = unknown>(statement: string): PreparedStatement<T>;
}

/**
 * Prepared statement interface for repeated query execution.
 */
export interface PreparedStatement<T = unknown> {
  run(parameters?: StorageParameters): Promise<StorageRunResult>;
  get(parameters?: StorageParameters): Promise<T | null>;
  all(parameters?: StorageParameters): Promise<T[]>;
  finalize(): Promise<void>;
}

/**
 * Shape of adapter factories returned by resolver modules.
 */
export type StorageAdapterFactory = () => Promise<StorageAdapter>;

/**
 * Error thrown when no adapter can be resolved.
 */
export class StorageResolutionError extends Error {
  constructor(message: string, readonly causes: unknown[] = []) {
    super(message);
    this.name = 'StorageResolutionError';
  }
}

// ============================================================================
// Re-export Performance and Hooks Types
// ============================================================================

/**
 * Performance configuration types for cost/accuracy optimization.
 * See `OPTIMIZATION_GUIDE.md` for detailed usage documentation.
 */
export * from './performance';

/**
 * Lifecycle hooks for extending adapter behavior.
 * Designed for RAG integration, analytics, and auditing.
 */
export * from './hooks';

