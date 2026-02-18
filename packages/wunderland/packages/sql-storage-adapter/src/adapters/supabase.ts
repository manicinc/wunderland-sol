/**
 * Supabase Postgres Storage Adapter
 * Provides full Postgres capabilities with Supabase's managed infrastructure
 */

import type { Pool } from 'pg';
import type {
  StorageAdapter,
  StorageCapability,
  StorageOpenOptions,
  StorageParameters,
  StorageRunResult,
  BatchResult
} from '../core/contracts';
import type {
  StorageAdapterExtensions,
  ExtendedBatchOperation,
  Migration,
  PerformanceMetrics,
  StreamOptions
} from '../core/contracts/extensions';

export interface SupabaseAdapterOptions extends StorageOpenOptions {
  connectionString?: string;
  poolConfig?: {
    max?: number;
    min?: number;
    idleTimeoutMillis?: number;
    connectionTimeoutMillis?: number;
  };
  ssl?: boolean | { rejectUnauthorized: boolean };
}

export class SupabaseAdapter implements StorageAdapter, StorageAdapterExtensions {
  readonly kind = 'supabase-postgres';
  readonly capabilities: ReadonlySet<StorageCapability> = new Set<StorageCapability>([
    'transactions',
    'persistence',
    'locks',
    'streaming',
    'batch'
  ]);

  private pool?: Pool;
  private options?: SupabaseAdapterOptions;
  private metrics: PerformanceMetrics = {
    totalQueries: 0,
    totalDuration: 0,
    averageDuration: 0,
    slowQueries: [],
    cacheHits: 0,
    cacheMisses: 0
  };
  private profilingEnabled = false;
  private queryCache = new Map<string, unknown>();
  private cacheEnabled = false;
  private maxCacheSize = 100;

  async open(options?: SupabaseAdapterOptions): Promise<void> {
    this.options = options;

    // Dynamic import to avoid bundling pg when not needed
    const pg = await import('pg');
    const { Pool } = pg;

    // Browser-safe process.env access
    const getEnv = (key: string): string | undefined => {
      if (typeof process !== 'undefined' && process.env) {
        return process.env[key];
      }
      return undefined;
    };

    const connectionString = options?.connectionString || getEnv('DATABASE_URL');
    if (!connectionString) {
      throw new Error('Supabase connection string required (DATABASE_URL or connectionString option)');
    }

    this.pool = new Pool({
      connectionString,
      max: options?.poolConfig?.max || 20,
      min: options?.poolConfig?.min || 2,
      idleTimeoutMillis: options?.poolConfig?.idleTimeoutMillis || 30000,
      connectionTimeoutMillis: options?.poolConfig?.connectionTimeoutMillis || 5000,
      ssl: options?.ssl !== false ? { rejectUnauthorized: false } : undefined
    });

    // Test connection
    try {
      const client = await this.pool.connect();
      client.release();
    } catch (error) {
      throw new Error(`Failed to connect to Supabase: ${error}`);
    }
  }

  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = undefined;
    }
    this.clearCache();
  }

  private trackQuery(query: string, startTime: number): void {
    if (!this.profilingEnabled) return;

    const duration = Date.now() - startTime;
    this.metrics.totalQueries++;
    this.metrics.totalDuration += duration;
    this.metrics.averageDuration = this.metrics.totalDuration / this.metrics.totalQueries;

    if (duration > 100) {
      if (!this.metrics.slowQueries) {
        this.metrics.slowQueries = [];
      }
      this.metrics.slowQueries.push({
        query: query.substring(0, 200),
        duration,
        timestamp: new Date(Date.now())
      });
      // Keep only last 100 slow queries
      if (this.metrics.slowQueries.length > 100) {
        this.metrics.slowQueries.shift();
      }
    }
  }

  private getCacheKey(query: string, params?: unknown): string {
    return `${query}::${JSON.stringify(params || {})}`;
  }

  async run(statement: string, parameters?: StorageParameters): Promise<StorageRunResult> {
    if (!this.pool) throw new Error('Storage adapter not opened');

    const startTime = Date.now();
    try {
      const result = await this.pool.query(statement, Array.isArray(parameters) ? parameters : undefined);
      this.trackQuery(statement, startTime);

      return {
        changes: result.rowCount || 0,
        lastInsertRowid: result.rows[0]?.id || 0
      };
    } catch (error) {
      throw new Error(`Query failed: ${error}`);
    }
  }

  async get<T = unknown>(statement: string, parameters?: StorageParameters): Promise<T | null> {
    if (!this.pool) throw new Error('Storage adapter not opened');

    // Check cache
    if (this.cacheEnabled) {
      const cacheKey = this.getCacheKey(statement, parameters);
      if (this.queryCache.has(cacheKey)) {
        if (this.metrics.cacheHits !== undefined) {
          this.metrics.cacheHits++;
        }
        const cached = this.queryCache.get(cacheKey) as T | null | undefined;
        return cached ?? null;
      }
      if (this.metrics.cacheMisses !== undefined) {
        this.metrics.cacheMisses++;
      }
    }

    const startTime = Date.now();
    try {
      const result = await this.pool.query(statement, Array.isArray(parameters) ? parameters : undefined);
      this.trackQuery(statement, startTime);

      const value = result.rows[0] || null;

      // Update cache
      if (this.cacheEnabled && value !== null) {
        const cacheKey = this.getCacheKey(statement, parameters);
        this.queryCache.set(cacheKey, value);

        // Enforce cache size limit
        if (this.queryCache.size > this.maxCacheSize) {
          const firstKey = this.queryCache.keys().next().value;
          if (firstKey !== undefined) {
            this.queryCache.delete(firstKey);
          }
        }
      }

      return value as T;
    } catch (error) {
      throw new Error(`Query failed: ${error}`);
    }
  }

  async all<T = unknown>(statement: string, parameters?: StorageParameters): Promise<T[]> {
    if (!this.pool) throw new Error('Storage adapter not opened');

    // Check cache
    if (this.cacheEnabled) {
      const cacheKey = this.getCacheKey(statement, parameters);
      if (this.queryCache.has(cacheKey)) {
        if (this.metrics.cacheHits !== undefined) {
          this.metrics.cacheHits++;
        }
        const cached = this.queryCache.get(cacheKey) as T[] | undefined;
        if (cached) {
          return cached;
        }
      }
      if (this.metrics.cacheMisses !== undefined) {
        this.metrics.cacheMisses++;
      }
    }

    const startTime = Date.now();
    try {
      const result = await this.pool.query(statement, Array.isArray(parameters) ? parameters : undefined);
      this.trackQuery(statement, startTime);

      const rows = result.rows;

      // Update cache
      if (this.cacheEnabled) {
        const cacheKey = this.getCacheKey(statement, parameters);
        this.queryCache.set(cacheKey, rows);

        // Enforce cache size limit
        if (this.queryCache.size > this.maxCacheSize) {
          const firstKey = this.queryCache.keys().next().value;
          if (firstKey !== undefined) {
            this.queryCache.delete(firstKey);
          }
        }
      }

      return rows as T[];
    } catch (error) {
      throw new Error(`Query failed: ${error}`);
    }
  }

  async exec(script: string): Promise<void> {
    if (!this.pool) throw new Error('Storage adapter not opened');

    const startTime = Date.now();
    try {
      await this.pool.query(script);
      this.trackQuery(script, startTime);
    } catch (error) {
      throw new Error(`Script execution failed: ${error}`);
    }
  }

  async transaction<T>(fn: (trx: StorageAdapter) => Promise<T>): Promise<T> {
    if (!this.pool) throw new Error('Storage adapter not opened');

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Create a transaction-scoped adapter
      const trxAdapter: StorageAdapter = {
        kind: this.kind,
        capabilities: this.capabilities,
        open: async () => {},
        close: async () => {},
        run: async (stmt, params) => {
          const result = await client.query(stmt, Array.isArray(params) ? params : undefined);
          return { changes: result.rowCount || 0, lastInsertRowid: 0 };
        },
        get: async (stmt, params) => {
          const result = await client.query(stmt, Array.isArray(params) ? params : undefined);
          return result.rows[0] || null;
        },
        all: async (stmt, params) => {
          const result = await client.query(stmt, Array.isArray(params) ? params : undefined);
          return result.rows;
        },
        exec: async (script) => {
          await client.query(script);
        },
        transaction: async (fn) => fn(trxAdapter)
      };

      const result = await fn(trxAdapter);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Extension methods
  async *stream<T = unknown>(
    query: string,
    parameters?: unknown,
    options?: StreamOptions
  ): AsyncIterableIterator<T> {
    if (!this.pool) throw new Error('Storage adapter not opened');

    const batchSize = options?.batchSize || 100;
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const paginatedQuery = `${query} LIMIT ${batchSize} OFFSET ${offset}`;
      const rows = await this.all<T>(paginatedQuery, parameters as StorageParameters | undefined);

      if (rows.length < batchSize) {
        hasMore = false;
      }

      for (const row of rows) {
        yield row;
      }

      offset += batchSize;
    }
  }

  async batchWrite(operations: ExtendedBatchOperation[]): Promise<BatchResult> {
    return this.transaction(async (trx) => {
      let successful = 0;
      let failed = 0;
      const errors: Array<{ index: number; error: Error }> = [];

      for (let index = 0; index < operations.length; index++) {
        const op = operations[index];
        try {
          switch (op.type) {
            case 'insert': {
              const keys = Object.keys(op.values || {});
              const values = Object.values(op.values || {});
              const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
              const query = `INSERT INTO ${op.table} (${keys.join(', ')}) VALUES (${placeholders})`;
              await trx.run(query, values);
              successful++;
              break;
            }
            case 'update': {
              const sets = Object.keys(op.values || {}).map((k, i) => `${k} = $${i + 1}`).join(', ');
              const whereClause = Object.keys(op.where || {})
                .map((k, i) => `${k} = $${i + Object.keys(op.values || {}).length + 1}`)
                .join(' AND ');
              const query = `UPDATE ${op.table} SET ${sets} WHERE ${whereClause}`;
              const params = [...Object.values(op.values || {}), ...Object.values(op.where || {})];
              await trx.run(query, params);
              successful++;
              break;
            }
            case 'delete': {
              const whereClause = Object.keys(op.where || {})
                .map((k, i) => `${k} = $${i + 1}`)
                .join(' AND ');
              const query = `DELETE FROM ${op.table} WHERE ${whereClause}`;
              await trx.run(query, Object.values(op.where || {}));
              successful++;
              break;
            }
          }
        } catch (error: unknown) {
          failed++;
          errors.push({ 
            index,
            error: error instanceof Error ? error : new Error(String(error))
          });
        }
      }

      return { successful, failed, errors: errors.length > 0 ? errors : undefined };
    });
  }

  async migrate(migrations: Migration[]): Promise<void> {
    // Create migrations table if it doesn't exist
    await this.exec(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id TEXT PRIMARY KEY,
        version INTEGER NOT NULL,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Get applied migrations
    const applied = await this.all<{ id: string; version: number }>('SELECT id, version FROM _migrations');
    const appliedSet = new Set(applied.map(m => m.id));

    // Apply pending migrations
    for (const migration of migrations) {
      if (!appliedSet.has(migration.id)) {
        await this.transaction(async (trx) => {
          await trx.exec(migration.up);
          await trx.run(
            'INSERT INTO _migrations (id, version) VALUES ($1, $2)',
            [migration.id, migration.version]
          );
        });
      }
    }
  }

  async getMigrationStatus(): Promise<Migration[]> {
    const applied = await this.all<{ id: string; version: number; applied_at: string }>(
      'SELECT * FROM _migrations ORDER BY version'
    );
    return applied.map(m => ({
      id: m.id,
      version: m.version,
      up: '',
      down: '',
      timestamp: new Date(m.applied_at).getTime()
    }));
  }

  async backup(_destination: string): Promise<void> {
    // For Supabase, we can use pg_dump via command line or API
    throw new Error('Backup not implemented for Supabase adapter. Use Supabase dashboard or pg_dump.');
  }

  async restore(_source: string): Promise<void> {
    // For Supabase, we can use pg_restore via command line or API
    throw new Error('Restore not implemented for Supabase adapter. Use Supabase dashboard or pg_restore.');
  }

  enableProfiling(): void {
    this.profilingEnabled = true;
  }

  disableProfiling(): void {
    this.profilingEnabled = false;
  }

  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  clearMetrics(): void {
    this.metrics = {
      totalQueries: 0,
      totalDuration: 0,
      averageDuration: 0,
      slowQueries: [],
      cacheHits: 0,
      cacheMisses: 0
    };
  }

  enableCache(maxSize: number = 100): void {
    this.cacheEnabled = true;
    this.maxCacheSize = maxSize;
  }

  disableCache(): void {
    this.cacheEnabled = false;
    this.clearCache();
  }

  clearCache(): void {
    this.queryCache.clear();
  }

  getPoolStatus(): { active: number; idle: number; waiting: number; max: number } {
    if (!this.pool) {
      return { active: 0, idle: 0, waiting: 0, max: 0 };
    }
    return {
      active: this.pool.totalCount,
      idle: this.pool.idleCount,
      waiting: this.pool.waitingCount,
      max: this.pool.options?.max ?? 0
    };
  }
}
