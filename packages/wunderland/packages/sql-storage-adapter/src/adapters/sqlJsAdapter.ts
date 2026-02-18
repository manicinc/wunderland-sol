import initSqlJs from 'sql.js';
import type { SqlJsStatic, SqlJsConfig, Database as SqlJsDatabase } from 'sql.js';
import fs from 'fs';
import path from 'path';
import type { StorageAdapter, StorageCapability, StorageOpenOptions, StorageParameters, StorageRunResult } from '../core/contracts';
import { normaliseParameters } from '../shared/parameterUtils';

type SqlJsAdapterOptions = SqlJsConfig;

const expandNamedParameters = (named: Record<string, unknown>): Record<string, unknown> => {
  const expanded: Record<string, unknown> = { ...named };
  for (const [rawKey, value] of Object.entries(named)) {
    if (!rawKey) continue;
    const key = rawKey.replace(/^[:@$]/, '');
    if (!key) continue;
    // sql.js expects keys to match the placeholder format (":id", "@id", "$id").
    // Other adapters (better-sqlite3) accept bare keys ("id") for "@id" placeholders.
    // Expand all variants so the same query payload works across adapters.
    if (!(key in expanded)) expanded[key] = value;
    if (!(`:${key}` in expanded)) expanded[`:${key}`] = value;
    if (!(`@${key}` in expanded)) expanded[`@${key}`] = value;
    if (!(`$${key}` in expanded)) expanded[`$${key}`] = value;
  }
  return expanded;
};

const normaliseRowId = (value: unknown): string | number | null => {
  if (typeof value === 'number' || typeof value === 'string') {
    return value;
  }
  if (typeof value === 'bigint') {
    return value.toString();
  }
  return null;
};

const hasFsAccess = (): boolean => {
  try {
    return typeof fs.accessSync === 'function';
  } catch {
    return false;
  }
};

/**
 * Storage adapter backed by sql.js (WebAssembly) for environments without native SQLite bindings.
 */
export class SqlJsAdapter implements StorageAdapter {
  public readonly kind = 'sqljs';
  public readonly capabilities: ReadonlySet<StorageCapability>;

  private SQL: SqlJsStatic | null = null;
  private db: SqlJsDatabase | null = null;
  private filePath?: string;

  constructor(private readonly adapterOptions: SqlJsAdapterOptions = {}) {
    const caps: StorageCapability[] = ['transactions', 'json', 'prepared'];
    if (hasFsAccess()) {
      caps.push('persistence');
    }
    this.capabilities = new Set(caps);
  }

  public async open(options?: StorageOpenOptions): Promise<void> {
    if (this.db) {
      return;
    }

    this.SQL = await initSqlJs(this.adapterOptions);
    this.filePath = options?.filePath;

    if (this.filePath && hasFsAccess() && fs.existsSync(this.filePath)) {
      const buffer = fs.readFileSync(this.filePath);
      this.db = new this.SQL.Database(buffer);
    } else {
      this.db = new this.SQL.Database();
    }
  }

  public async run(statement: string, parameters?: StorageParameters): Promise<StorageRunResult> {
    const stmt = this.prepareInternal(statement);
    try {
      const { named, positional } = normaliseParameters(parameters);
      if (named) {
        stmt.bind(expandNamedParameters(named));
      } else if (positional) {
        stmt.bind(positional);
      }
      stmt.step();
      const rowIdResult = this.db!.exec('SELECT last_insert_rowid() AS id');
      const rawRowId = rowIdResult[0]?.values?.[0]?.[0];
      return {
        changes: this.db!.getRowsModified(),
        lastInsertRowid: normaliseRowId(rawRowId)
      };
    } finally {
      stmt.free();
      await this.persistIfNeeded();
    }
  }

  public async get<T>(statement: string, parameters?: StorageParameters): Promise<T | null> {
    const rows = await this.all<T>(statement, parameters);
    return rows.length > 0 ? rows[0] : null;
  }

  public async all<T>(statement: string, parameters?: StorageParameters): Promise<T[]> {
    const stmt = this.prepareInternal(statement);
    try {
      const { named, positional } = normaliseParameters(parameters);
      if (named) {
        stmt.bind(expandNamedParameters(named));
      } else if (positional) {
        stmt.bind(positional);
      }

      const results: T[] = [];
      while (stmt.step()) {
        const row: Record<string, unknown> = {};
        stmt.getColumnNames().forEach((column: string, index: number) => {
          row[column] = stmt.get()[index];
        });
        results.push(row as T);
      }
      return results;
    } finally {
      stmt.free();
    }
  }

  public async exec(script: string): Promise<void> {
    this.ensureOpen();
    this.db!.run(script);
    await this.persistIfNeeded();
  }

  public async transaction<T>(fn: (trx: StorageAdapter) => Promise<T>): Promise<T> {
    this.ensureOpen();
    this.db!.run('BEGIN TRANSACTION;');
    try {
      const result = await fn(this);
      this.db!.run('COMMIT;');
      await this.persistIfNeeded();
      return result;
    } catch (error) {
      this.db!.run('ROLLBACK;');
      throw error;
    }
  }

  public async close(): Promise<void> {
    if (this.db) {
      await this.persistIfNeeded();
      this.db.close();
      this.db = null;
    }
  }

  private prepareInternal(statement: string) {
    this.ensureOpen();
    return this.db!.prepare(statement);
  }

  private ensureOpen(): void {
    if (!this.db) {
      throw new Error('Storage adapter not opened. Call open() first.');
    }
  }

  private async persistIfNeeded(): Promise<void> {
    if (!this.filePath || !hasFsAccess()) {
      return;
    }
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const data = this.db!.export();
    fs.writeFileSync(this.filePath, Buffer.from(data));
  }
}

export const createSqlJsAdapter = (options?: SqlJsAdapterOptions): StorageAdapter => new SqlJsAdapter(options);
