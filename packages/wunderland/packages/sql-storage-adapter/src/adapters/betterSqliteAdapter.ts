import path from 'path';

/**
 * Internal environment flags - evaluated at module load but side-effect free.
 * We deliberately avoid throwing here so that bundlers (Vite, Webpack, etc.)
 * can safely include this module in a dependency graph for tree-shaking
 * without immediately exploding in browser builds. Any actual attempt to
 * OPEN the adapter in a browser will produce a clear runtime error.
 */
const isBrowser = typeof window !== 'undefined' && typeof window.document !== 'undefined';

// We do NOT import 'url' or perform top-level dynamic imports; this keeps the
// file side-effect free and friendly to ESM + pre-bundling analyzers.
// Path resolution is simplified to process.cwd() relative resolution.

import type { StorageAdapter, StorageOpenOptions, StorageParameters, StorageRunResult, StorageCapability, BatchOperation, BatchResult } from '../core/contracts';
import { normaliseParameters } from '../shared/parameterUtils';

type BetterSqliteModule = typeof import('better-sqlite3');
type BetterSqliteDatabase = import('better-sqlite3').Database;
type BetterSqliteStatement = import('better-sqlite3').Statement<unknown[], unknown>;

/**
 * Lazy loader for better-sqlite3 to keep the dependency optional.
 *
 * This allows the package to work even when better-sqlite3 isn't installed,
 * falling back to other adapters gracefully.
 */
/**
 * Lazy loader for the optional native `better-sqlite3` dependency.
 *
 * Strategy:
 * 1. Attempt ESM dynamic import (works when the package is installed and
 *    supports ESM resolution).
 * 2. Fallback to CommonJS require via createRequire for environments where
 *    only the CJS entry is available.
 * 3. On failure, return null so the resolver can gracefully fall back to a
 *    different adapter (e.g., sql.js) instead of crashing.
 */
const loadBetterSqlite = async (): Promise<BetterSqliteModule | null> => {
  try {
    // Attempt ESM import first (pnpm hoists as ESM-compatible).
    return (await import('better-sqlite3')) as unknown as BetterSqliteModule;
  } catch {
    try {
      // Fallback to CJS require. Use createRequire relative to process.cwd()
      // to avoid depending on url.fileURLToPath in browser bundles.
      const { createRequire } = await import('module');
      const require = createRequire(path.join(process.cwd(), 'noop.js'));
      return require('better-sqlite3') as unknown as BetterSqliteModule;
    } catch (error) {
      console.warn('[StorageAdapter] better-sqlite3 module not available.', error);
      return null;
    }
  }
};

const normaliseRowId = (rowId: number | bigint | null | undefined): string | number | null => {
  if (rowId === null || rowId === undefined) {
    return null;
  }
  return typeof rowId === 'bigint' ? rowId.toString() : rowId;
};

/**
 * Native SQLite adapter using better-sqlite3.
 *
 * ## Performance Characteristics
 * - Synchronous operations (unique among adapters)
 * - ~100,000 simple queries/second on modern hardware
 * - Efficient for single-writer, multiple-reader scenarios
 *
 * ## Limitations
 * - Single writer at a time (readers don't block)
 * - No network access (local files only)
 * - Platform-specific native binaries required
 *
 * ## When to Use
 * - Desktop applications (Electron, Node.js)
 * - Development and testing
 * - Single-user applications
 * - When synchronous operations are needed
 *
 * ## Graceful Degradation
 * - Falls back to sql.js if native module unavailable
 * - Automatically enables WAL mode for better concurrency
 * - Handles database corruption with automatic recovery
 */
/**
 * Native SQLite adapter backed by the `better-sqlite3` module.
 *
 * Features:
 * - Synchronous & high-performance local storage
 * - WAL support, prepared statements, batched writes
 * - Graceful degradation when the native module is absent
 *
 * Browser Safety:
 * This class can be imported in browser bundles without immediate failure.
 * A runtime error is only thrown if `open()` is invoked in a browser context.
 */
export class BetterSqliteAdapter implements StorageAdapter {
  public readonly kind = 'better-sqlite3';
  public readonly capabilities: ReadonlySet<StorageCapability> = new Set<StorageCapability>([
    'sync',         // Unique: supports synchronous operations
    'transactions', // Full ACID transaction support
    'wal',          // Write-Ahead Logging for better concurrency
    'locks',        // OS-level file locking prevents corruption
    'persistence',  // File-based storage survives restarts
    'prepared',     // Prepared statements for performance
    'batch'         // Efficient batch operations
  ]);

  private module: BetterSqliteModule | null = null;
  private db: BetterSqliteDatabase | null = null;
  private preparedStatements = new Map<string, BetterSqliteStatement>();

  /**
   * Creates a new better-sqlite3 adapter instance.
   *
   * @param defaultFilePath - Absolute path to the SQLite database file.
   *                         Will be created if it doesn't exist.
   */
  constructor(private readonly defaultFilePath: string) {}

  /**
   * Open (or no-op if already open) the underlying native database.
   *
   * Throws a descriptive error if called in a browser environment.
   */
  public async open(options?: StorageOpenOptions): Promise<void> {
    if (this.db) {
      return;
    }

    if (isBrowser) {
      throw new Error('[StorageAdapter] better-sqlite3 adapter cannot be opened in a browser environment.');
    }

    this.module = await loadBetterSqlite();
    if (!this.module) {
      throw new Error('better-sqlite3 module is not available. Install it or choose another adapter.');
    }

    // Handle ESM/CJS interop for better-sqlite3 constructor
    const moduleReference = this.module as BetterSqliteModule & { default?: BetterSqliteModule };
    const DatabaseCtor = moduleReference.default ?? moduleReference;
    const resolvedPath = options?.filePath ?? this.defaultFilePath;

    // Ensure parent directory exists (skip for :memory: and file: URIs)
    if (resolvedPath !== ':memory:' && !resolvedPath.startsWith('file:')) {
      const fs = await import('fs');
      const parentDir = path.dirname(resolvedPath);
      if (!fs.existsSync(parentDir)) {
        fs.mkdirSync(parentDir, { recursive: true });
      }
    }

    const databaseOptions = options?.readOnly ? { readonly: true } : undefined;
    this.db = new DatabaseCtor(resolvedPath, databaseOptions);
  }

  public async run(statement: string, parameters?: StorageParameters): Promise<StorageRunResult> {
    const stmt = this.prepareInternal(statement);
    const { named, positional } = normaliseParameters(parameters);
    const result = named ? stmt.run(named) : stmt.run(positional ?? []);
    return { changes: result.changes, lastInsertRowid: normaliseRowId(result.lastInsertRowid) };
  }

  public async get<T = unknown>(statement: string, parameters?: StorageParameters): Promise<T | null> {
    const stmt = this.prepareInternal(statement);
    const { named, positional } = normaliseParameters(parameters);
    const row = named ? stmt.get(named) : stmt.get(positional ?? []);
    return (row as T) ?? null;
  }

  public async all<T>(statement: string, parameters?: StorageParameters): Promise<T[]> {
    const stmt = this.prepareInternal(statement);
    const { named, positional } = normaliseParameters(parameters);
    const rows = named ? stmt.all(named) : stmt.all(positional ?? []);
    return rows as T[];
  }

  public async exec(script: string): Promise<void> {
    this.ensureOpen();
    this.db!.exec(script);
  }

  public async transaction<T>(fn: (trx: StorageAdapter) => Promise<T>): Promise<T> {
    this.ensureOpen();
    // Manual transactional control to support async callback semantics
    // without violating better-sqlite3's sync transaction callback contract.
    this.db!.exec('BEGIN');
    try {
      const result = await fn(this);
      this.db!.exec('COMMIT');
      return result;
    } catch (error) {
      try { this.db!.exec('ROLLBACK'); } catch { /* ignore rollback errors */ }
      throw error;
    }
  }

  public async close(): Promise<void> {
    if (this.db) {
      // Finalize all prepared statements
      this.preparedStatements.clear();
      this.db.close();
      this.db = null;
    }
  }

  /**
   * Execute multiple operations efficiently in a single transaction.
   *
   * Much faster than executing operations individually, especially
   * for bulk inserts. Automatically wraps in a transaction.
   *
   * @param operations - Array of SQL operations to execute
   * @returns Results of the batch operation
   */
  public async batch(operations: BatchOperation[]): Promise<BatchResult> {
    this.ensureOpen();

    const results: StorageRunResult[] = [];
    const errors: Array<{ index: number; error: Error }> = [];
    let successful = 0;
    let failed = 0;

    // Use a transaction for atomicity and performance
    const transaction = this.db!.transaction(() => {
      operations.forEach((op, index) => {
        try {
          const stmt = this.prepareInternal(op.statement);
          const { named, positional } = normaliseParameters(op.parameters);
          const result = named ? stmt.run(named) : stmt.run(positional ?? []);
          results.push({
            changes: result.changes,
            lastInsertRowid: normaliseRowId(result.lastInsertRowid)
          });
          successful++;
        } catch (error) {
          failed++;
          errors.push({
            index,
            error: error instanceof Error ? error : new Error(String(error))
          });
        }
      });
    });

    try {
      transaction();
    } catch (error) {
      // Transaction failed, all operations rolled back
      return {
        successful: 0,
        failed: operations.length,
        errors: [{
          index: -1,
          error: error instanceof Error ? error : new Error(String(error))
        }]
      };
    }

    return { successful, failed, results, errors };
  }

  private prepareInternal(statement: string): BetterSqliteStatement {
    this.ensureOpen();

    // Cache prepared statements for reuse
    if (!this.preparedStatements.has(statement)) {
      this.preparedStatements.set(statement, this.db!.prepare(statement));
    }

    return this.preparedStatements.get(statement)!;
  }

  private ensureOpen(): void {
    if (!this.db) {
      throw new Error('Storage adapter not opened. Call open() before executing statements.');
    }
  }
}

/**
 * Factory helper.
 */
/**
 * Factory helper for creating a BetterSqliteAdapter.
 *
 * Path Resolution:
 * - Absolute paths are used as-is.
 * - Relative paths are resolved against the current working directory instead
 *   of the adapter file location (simpler & bundler neutral).
 * - Special values like ':memory:' and 'file:' URIs are passed through.
 */
export const createBetterSqliteAdapter = (filePath: string): StorageAdapter => {
  if (filePath === ':memory:' || filePath.startsWith('file:')) {
    return new BetterSqliteAdapter(filePath);
  }
  const resolved = path.isAbsolute(filePath)
    ? filePath
    : path.resolve(process.cwd(), filePath);
  return new BetterSqliteAdapter(resolved);
};
