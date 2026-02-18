/**
 * @fileoverview IndexedDB Storage Adapter
 * @description Browser-native SQL storage using sql.js (WASM) for SQL execution and IndexedDB for persistence.
 * 
 * **Architecture:**
 * - **SQL Execution**: Uses sql.js (SQLite compiled to WebAssembly) for full SQL support
 * - **Persistence**: Stores the SQLite database file (as binary blob) in IndexedDB
 * - **Workflow**: Load DB from IndexedDB → Execute SQL in memory (sql.js) → Save back to IndexedDB
 * 
 * **Why this approach?**
 * - IndexedDB is NOT SQL - it's a NoSQL key-value store
 * - sql.js provides full SQLite compatibility (transactions, joins, etc.)
 * - IndexedDB provides durable browser-native persistence
 * - Together: Full SQL capabilities + browser persistence = best of both worlds
 * 
 * **Use cases:**
 * - Fully client-side applications (no backend needed)
 * - Progressive Web Apps (PWAs)
 * - Offline-capable web apps
 * - Privacy-first applications (data never leaves browser)
 * 
 * **Performance:**
 * - Fast reads (in-memory SQL via sql.js)
 * - Moderate writes (IndexedDB persistence adds ~10-50ms)
 * - Auto-save batching reduces IDB overhead
 * 
 * @example
 * ```typescript
 * import { IndexedDbAdapter } from '@framers/sql-storage-adapter/adapters/indexedDbAdapter';
 * 
 * const adapter = new IndexedDbAdapter({
 *   dbName: 'my-app-db',
 *   autoSave: true,
 *   saveIntervalMs: 5000,
 * });
 * 
 * await adapter.open();
 * await adapter.run('CREATE TABLE sessions (id TEXT PRIMARY KEY, data TEXT)');
 * await adapter.run('INSERT INTO sessions VALUES (?, ?)', ['session-1', '{"events": []}']);
 * 
 * const session = await adapter.get('SELECT * FROM sessions WHERE id = ?', ['session-1']);
 * console.log(session);
 * ```
 */

import initSqlJs from 'sql.js';
import type { SqlJsStatic, Database as SqlJsDatabase } from 'sql.js';
import type {
  StorageAdapter,
  StorageCapability,
  StorageOpenOptions,
  StorageParameters,
  StorageRunResult,
} from '../core/contracts';
import { normaliseParameters } from '../shared/parameterUtils';

// ============================================================================
// GLOBAL SQL.JS SINGLETON
// ============================================================================
// Prevents race conditions when multiple IndexedDbAdapter instances initialize
// simultaneously by ensuring sql.js WASM is loaded only once.

let globalSQL: SqlJsStatic | null = null;
let globalSQLPromise: Promise<SqlJsStatic> | null = null;

/**
 * Get or initialize the global sql.js instance.
 * Uses a singleton pattern to prevent race conditions when multiple
 * adapters initialize simultaneously.
 */
async function getGlobalSQL(config?: Parameters<typeof initSqlJs>[0]): Promise<SqlJsStatic> {
  if (globalSQL) {
    return globalSQL;
  }

  if (globalSQLPromise) {
    return globalSQLPromise;
  }

  globalSQLPromise = initSqlJs(config).then((sql: SqlJsStatic) => {
    globalSQL = sql;
    return sql;
  });

  return globalSQLPromise;
}

/**
 * Configuration for IndexedDB adapter.
 */
export interface IndexedDbAdapterOptions {
  /** IndexedDB database name (default: 'app-db') */
  dbName?: string;
  /** IndexedDB object store name (default: 'sqliteDb') */
  storeName?: string;
  /** Auto-save to IndexedDB after each write (default: true) */
  autoSave?: boolean;
  /** Save interval in milliseconds for batched writes (default: 5000) */
  saveIntervalMs?: number;
  /** sql.js configuration (e.g., locateFile for wasm) */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sqlJsConfig?: any;
}

const DB_VERSION = 1;

/**
 * Storage adapter using IndexedDB + sql.js for client-side SQL persistence.
 * 
 * **The Key Difference: Automatic Persistence**
 * 
 * **sql.js adapter alone:**
 * - In-memory SQLite database (lost on page refresh)
 * - You must manually call `db.export()` and save it yourself
 * - No automatic persistence in browsers
 * - Good for: Edge functions, temporary calculations, prototyping
 * 
 * **IndexedDB adapter (this):**
 * - Same sql.js SQL engine, but automatically saves to IndexedDB
 * - Data survives page refreshes automatically
 * - Auto-save batching reduces overhead
 * - Good for: Production PWAs, offline-first apps, persistent client-side storage
 * 
 * **Is This Necessary?**
 * 
 * **✅ YES** if you need:
 * - Data to survive page refreshes (production apps)
 * - Offline-first functionality (PWAs)
 * - Privacy-first apps (data never leaves browser)
 * - Zero manual save logic (just works)
 * 
 * **❌ NO** if you:
 * - Only need temporary/in-memory data (edge functions)
 * - Are prototyping and don't care about persistence
 * - Want to manually control when data is saved
 * - Don't need data to survive refreshes
 * 
 * **Alternative:** You could use sql.js directly and manually save to IndexedDB yourself, but you'd lose:
 * - Automatic batched saves (performance optimization)
 * - Reliable persistence (easy to forget manual saves = data loss)
 * - Consistent API across platforms
 * - Production-ready defaults
 * 
 * **Bottom line:** This adapter is **necessary for production web apps** that need persistence. For prototypes or edge functions, sql.js alone is fine.
 * 
 * **How It Works:**
 * 1. IndexedDB stores the SQLite database file (binary blob) - this is just storage
 * 2. sql.js (WASM) loads the database into memory and executes SQL - this provides SQL capabilities
 * 3. After writes, the updated database is automatically saved back to IndexedDB
 * 
 * **Why IndexedDB + sql.js?**
 * - IndexedDB alone: NoSQL key-value store, no SQL support
 * - sql.js alone: In-memory SQL, but **no automatic persistence** (you must manually save)
 * - Combined: Full SQL + **automatic browser-native persistence** = production-ready solution
 * 
 * **Capabilities:**
 * - ✅ Transactions (via sql.js)
 * - ✅ Persistence (via IndexedDB - automatic!)
 * - ✅ Full SQL support (via sql.js)
 * - ✅ Export/import
 * - ❌ Concurrent writes (single-threaded)
 * - ❌ Server-side (browser only)
 * 
 * **Performance:**
 * - Fast reads (in-memory SQL)
 * - Moderate writes (IndexedDB persistence)
 * - Auto-save batching reduces IDB overhead
 * 
 * @example Client-side application
 * ```typescript
 * const adapter = new IndexedDbAdapter({ dbName: 'my-app-db' });
 * await adapter.open();
 * await adapter.run('CREATE TABLE sessions (id TEXT PRIMARY KEY, data TEXT)');
 * ```
 */
export class IndexedDbAdapter implements StorageAdapter {
  public readonly kind = 'indexeddb';
  public readonly capabilities: ReadonlySet<StorageCapability> = new Set(['transactions', 'persistence', 'json', 'prepared']);

  private SQL: SqlJsStatic | null = null;
  private db: SqlJsDatabase | null = null;
  private idb: IDBDatabase | null = null;
  private saveTimer: NodeJS.Timeout | null = null;
  private dirty = false;

  private readonly dbName: string;
  private readonly storeName: string;
  private readonly autoSave: boolean;
  private readonly saveIntervalMs: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private readonly sqlJsConfig: any;

  constructor(options: IndexedDbAdapterOptions = {}) {
    this.dbName = options.dbName || 'app-db';
    this.storeName = options.storeName || 'sqliteDb';
    this.autoSave = options.autoSave ?? true;
    this.saveIntervalMs = options.saveIntervalMs || 5000;
    this.sqlJsConfig = options.sqlJsConfig || {};
  }

  /**
   * Opens IndexedDB and initializes sql.js database.
   * Loads existing database from IndexedDB if present.
   *
   * Uses a global sql.js singleton to prevent race conditions when
   * multiple adapters (e.g., fabric_codex_db and quarry-codex-local)
   * are initialized simultaneously.
   */
  public async open(_options?: StorageOpenOptions): Promise<void> {
    if (this.db) {
      return; // Already open
    }

    // Initialize sql.js using global singleton (prevents race conditions)
    this.SQL = await getGlobalSQL(this.sqlJsConfig);

    // Open IndexedDB with retry logic for race conditions
    this.idb = await this.openIndexedDbWithRetry();

    // Load existing database from IndexedDB or create new
    const existingData = await this.loadFromIndexedDb();
    if (existingData) {
      this.db = new this.SQL.Database(existingData);
    } else {
      this.db = new this.SQL.Database();
    }

    // Start auto-save interval
    if (this.autoSave) {
      this.startAutoSave();
    }
  }

  /**
   * Executes a SQL statement that doesn't return rows (INSERT, UPDATE, DELETE, CREATE, etc.).
   * @param statement SQL statement with ? or :name placeholders
   * @param parameters Positional array or named object
   * @returns Result with changes count and last insert row ID
   */
  public async run(statement: string, parameters?: StorageParameters): Promise<StorageRunResult> {
    this.ensureOpen();
    const stmt = this.db!.prepare(statement);
    try {
      const { named, positional } = normaliseParameters(parameters);
      if (named) {
        stmt.bind(named);
      } else if (positional) {
        stmt.bind(positional);
      }
      stmt.step();
      
      const rowIdResult = this.db!.exec('SELECT last_insert_rowid() AS id');
      const rawRowId = rowIdResult[0]?.values?.[0]?.[0];
      const lastInsertRowid = this.normaliseRowId(rawRowId);
      
      this.dirty = true;
      await this.persistIfNeeded();
      
      return {
        changes: this.db!.getRowsModified(),
        lastInsertRowid,
      };
    } finally {
      stmt.free();
    }
  }

  /**
   * Executes a SQL query and returns the first row.
   * @param statement SELECT statement
   * @param parameters Query parameters
   * @returns First row as object or null if no results
   */
  public async get<T>(statement: string, parameters?: StorageParameters): Promise<T | null> {
    const rows = await this.all<T>(statement, parameters);
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * Executes a SQL query and returns all matching rows.
   * @param statement SELECT statement
   * @param parameters Query parameters
   * @returns Array of result rows as objects
   */
  public async all<T>(statement: string, parameters?: StorageParameters): Promise<T[]> {
    this.ensureOpen();
    const stmt = this.db!.prepare(statement);
    try {
      const { named, positional } = normaliseParameters(parameters);
      if (named) {
        stmt.bind(named);
      } else if (positional) {
        stmt.bind(positional);
      }

      const results: T[] = [];
      const columnNames = stmt.getColumnNames();

      while (stmt.step()) {
        const row = stmt.get();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const obj: any = {};
        columnNames.forEach((col: string, idx: number) => {
          obj[col] = row[idx];
        });
        results.push(obj as T);
      }

      return results;
    } finally {
      stmt.free();
    }
  }

  /**
   * Executes a script containing multiple SQL statements.
   */
  public async exec(script: string): Promise<void> {
    this.ensureOpen();
    this.db!.exec(script);
    this.dirty = true;
    await this.persistIfNeeded();
  }

  /**
   * Executes a callback within a database transaction.
   */
  public async transaction<T>(fn: (trx: StorageAdapter) => Promise<T>): Promise<T> {
    this.ensureOpen();
    await this.run('BEGIN TRANSACTION');
    try {
      const result = await fn(this);
      await this.run('COMMIT');
      this.dirty = true;
      await this.persistIfNeeded();
      return result;
    } catch (error) {
      await this.run('ROLLBACK');
      throw error;
    }
  }

  /**
   * Begins a transaction. sql.js executes all statements in implicit transactions,
   * so this is a no-op for compatibility.
   */
  public async beginTransaction(): Promise<void> {
    // sql.js uses auto-commit; explicit BEGIN is optional
    await this.run('BEGIN');
  }

  /**
   * Commits the current transaction.
   */
  public async commit(): Promise<void> {
    await this.run('COMMIT');
    this.dirty = true;
    await this.persistIfNeeded();
  }

  /**
   * Rolls back the current transaction.
   */
  public async rollback(): Promise<void> {
    await this.run('ROLLBACK');
  }

  /**
   * Closes the database and persists final state to IndexedDB.
   */
  public async close(): Promise<void> {
    if (this.saveTimer) {
      clearInterval(this.saveTimer);
      this.saveTimer = null;
    }

    if (this.dirty) {
      await this.saveToIndexedDb();
    }

    if (this.db) {
      this.db.close();
      this.db = null;
    }

    if (this.idb) {
      this.idb.close();
      this.idb = null;
    }
  }

  /**
   * Exports the database as a Uint8Array (SQLite file format).
   * Can be downloaded or stored externally.
   * @returns SQLite database file as binary
   */
  public exportDatabase(): Uint8Array {
    this.ensureOpen();
    return this.db!.export();
  }

  /**
   * Imports a database from a Uint8Array (SQLite file).
   * Replaces the current database.
   * @param data SQLite database file
   */
  public async importDatabase(data: Uint8Array): Promise<void> {
    this.ensureOpen();
    this.db!.close();
    this.db = new this.SQL!.Database(data);
    this.dirty = true;
    await this.saveToIndexedDb();
  }

  /**
   * Opens or creates the IndexedDB database.
   */
  private openIndexedDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(this.dbName, DB_VERSION);

      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName);
        }
      };

      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Opens IndexedDB with retry logic and exponential backoff.
   * Handles race conditions when multiple adapters initialize simultaneously.
   *
   * The "NotFoundError" for object stores typically occurs when:
   * 1. Two adapters try to open/upgrade simultaneously
   * 2. One adapter opens the DB while another is still upgrading
   * 3. Schema version mismatch during concurrent initialization
   *
   * @param maxRetries Maximum number of retry attempts (default: 3)
   * @param baseDelayMs Base delay in milliseconds (default: 100)
   */
  private async openIndexedDbWithRetry(maxRetries = 3, baseDelayMs = 100): Promise<IDBDatabase> {
    let lastError: unknown;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await this.openIndexedDb();
      } catch (error) {
        lastError = error;

        // Check if this is a retryable error
        const isNotFoundError = error instanceof DOMException && error.name === 'NotFoundError';
        const isVersionError = error instanceof DOMException && error.name === 'VersionError';
        const isRetryable = isNotFoundError || isVersionError;

        if (!isRetryable || attempt === maxRetries) {
          break;
        }

        // Exponential backoff: 100ms, 200ms, 400ms, ...
        const delay = baseDelayMs * Math.pow(2, attempt);
        console.warn(
          `[IndexedDbAdapter] Retrying IndexedDB open for "${this.dbName}" ` +
          `(attempt ${attempt + 1}/${maxRetries + 1}, delay: ${delay}ms)`,
          error
        );

        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }

  /**
   * Loads the SQLite database from IndexedDB.
   * @returns Binary database or null if not found
   */
  private async loadFromIndexedDb(): Promise<Uint8Array | null> {
    if (!this.idb) return null;

    return this.withTransactionRetry(async () => {
      return new Promise((resolve, reject) => {
        const tx = this.idb!.transaction(this.storeName, 'readonly');
        const store = tx.objectStore(this.storeName);
        const req = store.get('db');

        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      });
    });
  }

  /**
   * Saves the SQLite database to IndexedDB.
   */
  private async saveToIndexedDb(): Promise<void> {
    if (!this.idb || !this.db) return;

    const data = this.db.export();

    return this.withTransactionRetry(async () => {
      return new Promise((resolve, reject) => {
        const tx = this.idb!.transaction(this.storeName, 'readwrite');
        const store = tx.objectStore(this.storeName);
        const req = store.put(data, 'db');

        req.onsuccess = () => {
          this.dirty = false;
          resolve();
        };
        req.onerror = () => reject(req.error);
      });
    });
  }

  /**
   * Wraps a transaction operation with retry logic.
   * Handles "NotFoundError" by reopening IndexedDB connection.
   */
  private async withTransactionRetry<T>(
    operation: () => Promise<T>,
    maxRetries = 2
  ): Promise<T> {
    let lastError: unknown;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;

        // Check if this is a "store not found" error that can be fixed by reopening
        const isNotFoundError = error instanceof DOMException && error.name === 'NotFoundError';

        if (!isNotFoundError || attempt === maxRetries) {
          break;
        }

        // Try to reopen the IndexedDB connection
        console.warn(
          `[IndexedDbAdapter] Transaction failed for "${this.dbName}", ` +
          `reopening connection (attempt ${attempt + 1}/${maxRetries + 1})`,
          error
        );

        try {
          if (this.idb) {
            this.idb.close();
          }
          this.idb = await this.openIndexedDbWithRetry();
        } catch (reopenError) {
          console.error('[IndexedDbAdapter] Failed to reopen IndexedDB:', reopenError);
          throw lastError; // Throw original error
        }
      }
    }

    throw lastError;
  }

  /**
   * Persists to IndexedDB if auto-save is enabled.
   */
  private async persistIfNeeded(): Promise<void> {
    if (this.autoSave && !this.saveTimer) {
      // Immediate save on first write, then batched
      await this.saveToIndexedDb();
    }
  }

  /**
   * Starts auto-save interval.
   */
  private startAutoSave(): void {
    this.saveTimer = setInterval(async () => {
      if (this.dirty) {
        await this.saveToIndexedDb();
      }
    }, this.saveIntervalMs);
  }

  /**
   * Ensures the database is open.
   */
  private ensureOpen(): void {
    if (!this.db) {
      throw new Error('IndexedDbAdapter: Database not open. Call open() first.');
    }
  }

  /**
   * Normalizes last insert row ID to string or number.
   */
  private normaliseRowId(value: unknown): string | number | null {
    if (typeof value === 'number' || typeof value === 'string') {
      return value;
    }
    if (typeof value === 'bigint') {
      return value.toString();
    }
    return null;
  }

  /**
   * Prepares a SQL statement for execution.
   */
  private prepareInternal(statement: string) {
    this.ensureOpen();
    return this.db!.prepare(statement);
  }
}
