import type {
  StorageAdapter,
  StorageCapability,
  StorageOpenOptions,
  StorageParameters,
  StorageRunResult
} from '../core/contracts';
import { normaliseParameters } from '../shared/parameterUtils';

import type { CapacitorSQLitePlugin, SQLiteDBConnection } from '@capacitor-community/sqlite';

export interface CapacitorAdapterOptions {
  /**
   * Database name. Defaults to `app`.
   */
  database?: string;
  /**
   * Whether to enable WAL when platform supports it.
   */
  enableWal?: boolean;
}

const isCapacitorPlugin = (value: unknown): value is CapacitorSQLitePlugin => {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const candidate = value as { createConnection?: unknown };
  return typeof candidate.createConnection === 'function';
};

const loadCapacitorSqlite = async (): Promise<CapacitorSQLitePlugin | null> => {
  try {
    const mod: unknown = await import('@capacitor-community/sqlite');

    if (isCapacitorPlugin(mod)) {
      return mod;
    }

    if (mod && typeof mod === 'object') {
      const { default: defaultExport, CapacitorSQLite } = mod as {
        default?: unknown;
        CapacitorSQLite?: unknown;
      };

      if (isCapacitorPlugin(defaultExport)) {
        return defaultExport;
      }
      if (isCapacitorPlugin(CapacitorSQLite)) {
        return CapacitorSQLite;
      }
    }

    return null;
  } catch (error) {
    console.warn('[StorageAdapter] @capacitor-community/sqlite module not available.', error);
    return null;
  }
};

/**
 * Adapter using @capacitor-community/sqlite for native mobile targets.
 */
export class CapacitorSqliteAdapter implements StorageAdapter {
  public readonly kind = 'capacitor-sqlite';
  public readonly capabilities: ReadonlySet<StorageCapability> = new Set<StorageCapability>([
    'transactions',
    'wal',
    'locks',
    'persistence'
  ]);

  private plugin: CapacitorSQLitePlugin | null = null;
  private connection: SQLiteDBConnection | null = null;
  private dbName: string;

  constructor(private readonly options: CapacitorAdapterOptions = {}) {
    this.dbName = options.database ?? 'app';
  }

  public async open(options?: StorageOpenOptions): Promise<void> {
    if (this.connection) {
      return;
    }

    this.plugin = await loadCapacitorSqlite();
    if (!this.plugin) {
      throw new Error('@capacitor-community/sqlite is unavailable. Install the plugin or choose a different adapter.');
    }

    const adapterOptions = options?.adapterOptions as { database?: unknown } | undefined;
    const requestedName = typeof adapterOptions?.database === 'string' ? adapterOptions.database : undefined;
    const configuredName = this.options.database;
    const resolvedDbName = requestedName ?? configuredName ?? this.dbName;

    this.connection = await this.plugin.createConnection(resolvedDbName, false, 'no-encryption', 1, false);
    await this.connection.open();

    if (this.options.enableWal ?? true) {
      try {
        await this.connection.execute('PRAGMA journal_mode = WAL;');
      } catch (error) {
        console.warn('[StorageAdapter] Failed to enable WAL on Capacitor SQLite.', error);
      }
    }
  }

  public async run(statement: string, parameters?: StorageParameters): Promise<StorageRunResult> {
    const conn = this.ensureConnection();
    const { positional } = normaliseParameters(parameters);
    const result = await conn.run(statement, positional ?? []);
    return { changes: result.changes ?? 0, lastInsertRowid: result.lastId ?? null };
  }

  public async get<T>(statement: string, parameters?: StorageParameters): Promise<T | null> {
    const rows = await this.all<T>(statement, parameters);
    return rows.length > 0 ? rows[0] : null;
  }

  public async all<T>(statement: string, parameters?: StorageParameters): Promise<T[]> {
    const conn = this.ensureConnection();
    const { positional } = normaliseParameters(parameters);
    const result = await conn.query(statement, positional ?? []);
    return (result.values ?? []) as T[];
  }

  public async exec(script: string): Promise<void> {
    const conn = this.ensureConnection();
    await conn.execute(script);
  }

  public async transaction<T>(fn: (trx: StorageAdapter) => Promise<T>): Promise<T> {
    const conn = this.ensureConnection();
    await conn.execute('BEGIN TRANSACTION;');
    try {
      const result = await fn(this);
      await conn.execute('COMMIT;');
      return result;
    } catch (error) {
      await conn.execute('ROLLBACK;');
      throw error;
    }
  }

  public async close(): Promise<void> {
    if (this.connection) {
      await this.connection.close();
      this.connection = null;
    }
  }

  private ensureConnection(): SQLiteDBConnection {
    if (!this.connection) {
      throw new Error('Storage adapter not opened. Call open() before executing statements.');
    }
    return this.connection;
  }
}

export const createCapacitorSqliteAdapter = (options?: CapacitorAdapterOptions): StorageAdapter =>
  new CapacitorSqliteAdapter(options);
