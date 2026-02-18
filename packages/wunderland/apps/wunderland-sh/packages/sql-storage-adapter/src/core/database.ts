/**
 * High-level, user-friendly API for SQL storage.
 * 
 * This module provides simple functions like:
 * - createDatabase() - Automatically picks the best database for your environment
 * - connectDatabase() - Explicit connection with clear options
 * - openDatabase() - Simple file-based database
 */

import type { StorageAdapter } from './contracts';
import { resolveStorageAdapter, type StorageResolutionOptions, type AdapterKind } from './resolver';
import type { PostgresAdapterOptions } from '../adapters/postgresAdapter';
import type { CapacitorAdapterOptions } from '../adapters/capacitorSqliteAdapter';
import type { IndexedDbAdapterOptions } from '../adapters/indexedDbAdapter';

/**
 * Database connection options.
 */
export interface DatabaseOptions {
  /** 
   * Database URL (e.g., postgresql://user:pass@host/db).
   * If provided, PostgreSQL will be used.
   */
  url?: string;
  
  /** 
   * File path for SQLite database.
   * Used for local/offline storage.
   */
  file?: string;
  
  /**
   * PostgreSQL-specific configuration.
   * Automatically uses PostgreSQL when provided.
   */
  postgres?: PostgresAdapterOptions;
  
  /**
   * Mobile (Capacitor) configuration.
   * Automatically detected on mobile platforms.
   */
  mobile?: CapacitorAdapterOptions;

  /**
   * IndexedDB configuration for browser-native persistence.
   * Uses sql.js (WASM) for SQL execution + IndexedDB for storage.
   *
   * @example
   * ```typescript
   * const db = await createDatabase({
   *   priority: ['indexeddb', 'sqljs'],
   *   indexedDb: {
   *     dbName: 'my-app-db',
   *     sqlJsConfig: {
   *       locateFile: (file) => `/wasm/${file}`
   *     }
   *   }
   * });
   * ```
   */
  indexedDb?: IndexedDbAdapterOptions;

  /**
   * Force a specific database type.
   * Leave empty to auto-detect.
   */
  type?: 'postgres' | 'sqlite' | 'browser' | 'mobile' | 'memory';
  
  /**
   * Custom priority order for adapter selection.
   * Advanced: Only use if you need fine-grained control.
   */
  priority?: AdapterKind[];
}

/**
 * Create a database connection.
 * Automatically picks the best database for your environment.
 * 
 * @example
 * ```typescript
 * // Auto-detect (PostgreSQL in prod, SQLite locally)
 * const db = await createDatabase();
 * 
 * // Specify database URL
 * const db = await createDatabase({
 *   url: process.env.DATABASE_URL
 * });
 * 
 * // Specify file path
 * const db = await createDatabase({
 *   file: './my-app.db'
 * });
 * 
 * // Full PostgreSQL config
 * const db = await createDatabase({
 *   postgres: {
 *     host: 'db.example.com',
 *     database: 'myapp',
 *     user: 'dbuser',
 *     password: process.env.DB_PASSWORD,
 *     ssl: true
 *   }
 * });
 * ```
 */
/**
 * Create (or auto-resolve) the most appropriate database adapter for the current
 * runtime environment. Priority selection logic:
 *
 * 1. Explicit `options.priority` (caller-specified) wins entirely.
 * 2. Explicit `options.type` is mapped to a single adapter priority.
 * 3. Otherwise we auto-detect environment:
 *    - Browser / Deno: ['sqljs']
 *    - Node.js: ['better-sqlite3', 'sqljs'] (native first, wasm fallback)
 *
 * The function never throws solely due to a native adapter absence; it falls
 * back to next candidates. Only when no candidate can open will it bubble an error.
 */
export async function createDatabase(options: DatabaseOptions = {}): Promise<StorageAdapter> {
  const resolverOptions: StorageResolutionOptions = {};

  const isBrowser = typeof window !== 'undefined' && typeof window.document !== 'undefined';
  const isNode = typeof process !== 'undefined' && !!process.versions?.node;
  // Use globalThis to avoid TS error when DOM lib not present
  // (declare loosely to prevent dependency on @types/deno)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const isDeno = typeof (globalThis as any).Deno !== 'undefined';

  // Handle URL (PostgreSQL)
  if (options.url) {
    resolverOptions.postgres = { connectionString: options.url };
  }

  // Handle PostgreSQL config
  if (options.postgres) {
    resolverOptions.postgres = options.postgres;
  }

  // Handle file path
  if (options.file) {
    resolverOptions.filePath = options.file;
  }

  // Handle mobile config
  if (options.mobile) {
    resolverOptions.capacitor = options.mobile;
  }

  // Handle IndexedDB config (browser persistence)
  if (options.indexedDb) {
    resolverOptions.indexedDb = options.indexedDb;
  }

  // Handle explicit type (maps to a canonical adapter kind)
  if (options.type) {
    const typeMap: Record<NonNullable<DatabaseOptions['type']>, AdapterKind> = {
      postgres: 'postgres',
      sqlite: 'better-sqlite3',
      browser: 'sqljs',
      mobile: 'capacitor',
      memory: 'better-sqlite3'
    };
    resolverOptions.priority = [typeMap[options.type]];
    if (options.type === 'memory') {
      resolverOptions.filePath = ':memory:';
    }
  }
  
  // Handle custom priority (highest precedence - override previous)
  if (options.priority) {
    resolverOptions.priority = options.priority;
  }

  // Auto-detect environment ONLY if no priority already set
  if (!resolverOptions.priority || resolverOptions.priority.length === 0) {
    if (isBrowser || isDeno) {
      resolverOptions.priority = ['sqljs'];
    } else if (isNode) {
      resolverOptions.priority = ['better-sqlite3', 'sqljs'];
    } else {
      // Extremely unusual runtime - be explicit and fail loudly so caller can decide
      throw new Error('[StorageAdapter] Unsupported runtime environment for automatic adapter selection.');
    }
  }

  const adapter = await resolveStorageAdapter(resolverOptions);
  await adapter.open(resolverOptions.openOptions);
  return adapter;
}

/**
 * Connect to a remote database.
 * 
 * @example
 * ```typescript
 * // Simple connection string
 * const db = await connectDatabase('postgresql://user:pass@host/db');
 * 
 * // With full config
 * const db = await connectDatabase({
 *   host: 'db.example.com',
 *   database: 'myapp',
 *   user: 'dbuser',
 *   password: process.env.DB_PASSWORD,
 *   ssl: true
 * });
 * ```
 */
export async function connectDatabase(
  config: string | PostgresAdapterOptions
): Promise<StorageAdapter> {
  if (typeof config === 'string') {
    return createDatabase({ url: config });
  }
  return createDatabase({ postgres: config });
}

/**
 * Open a local database file.
 * 
 * @example
 * ```typescript
 * // SQLite file
 * const db = await openDatabase('./my-app.db');
 * 
 * // In-memory database
 * const db = await openDatabase(':memory:');
 * ```
 */
export async function openDatabase(filePath: string): Promise<StorageAdapter> {
  return createDatabase({ file: filePath });
}

/**
 * Create an in-memory database.
 * Perfect for testing or temporary storage.
 * 
 * @example
 * ```typescript
 * const db = await createMemoryDatabase();
 * await db.exec('CREATE TABLE users (id INTEGER, name TEXT)');
 * ```
 */
export async function createMemoryDatabase(): Promise<StorageAdapter> {
  return openDatabase(':memory:');
}

// Re-export for backwards compatibility
export { resolveStorageAdapter } from './resolver';
