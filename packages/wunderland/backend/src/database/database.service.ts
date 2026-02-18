/**
 * @file database.service.ts
 * @description Injectable service that wraps the existing appDatabase.ts
 * StorageAdapter, providing typed access to the application database.
 */

import { Injectable } from '@nestjs/common';
import { getAppDatabase, generateId, isInMemoryAppDatabase } from '../core/database/appDatabase.js';
import type {
  StorageAdapter,
  StorageRunResult,
  StorageParameters,
} from '@framers/sql-storage-adapter';

@Injectable()
export class DatabaseService {
  /**
   * Returns the initialized StorageAdapter (SQLite or Postgres).
   * @throws If the database has not been initialized yet.
   */
  getAdapter(): StorageAdapter {
    return getAppDatabase();
  }

  /** Generate a unique ID (UUIDv4). */
  generateId(): string {
    return generateId();
  }

  /** Whether the database is running in-memory (no persistence). */
  isInMemory(): boolean {
    return isInMemoryAppDatabase();
  }

  /**
   * Execute a raw SQL query.
   * @param sql SQL statement.
   * @param params Bind parameters.
   */
  async exec(sql: string, params?: StorageParameters): Promise<void> {
    const db = this.getAdapter();
    if (params === undefined || params === null) return db.exec(sql);
    await db.run(sql, params);
  }

  /**
   * Run a SQL statement that modifies data.
   * @returns Run result with lastInsertRowid and changes count.
   */
  async run(sql: string, params?: StorageParameters): Promise<StorageRunResult> {
    const db = this.getAdapter();
    return db.run(sql, params);
  }

  /**
   * Query a single row.
   */
  async get<T>(sql: string, params?: StorageParameters): Promise<T | undefined> {
    const db = this.getAdapter();
    return (await db.get<T>(sql, params)) ?? undefined;
  }

  /**
   * Query multiple rows.
   */
  async all<T>(sql: string, params?: StorageParameters): Promise<T[]> {
    const db = this.getAdapter();
    return db.all<T>(sql, params);
  }

  /**
   * Execute a callback within a database transaction.
   */
  async transaction<T>(fn: (trx: StorageAdapter) => Promise<T>): Promise<T> {
    const db = this.getAdapter();
    return db.transaction(fn);
  }
}
