import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { exportData, exportAsJSON, exportAsSQL, exportAsCSV } from '../src/features/migrations/dataExport';
import { createBetterSqliteAdapter } from '../src/adapters/betterSqliteAdapter';
import { createSqlJsAdapter } from '../src/adapters/sqlJsAdapter';
import type { StorageAdapter } from '../src/types';

describe('Data Export', () => {
  let adapter: StorageAdapter;

  const createTestAdapter = async (): Promise<StorageAdapter> => {
    const sqliteAdapter = createBetterSqliteAdapter(':memory:');
    try {
      await sqliteAdapter.open();
      return sqliteAdapter;
    } catch (error) {
      if (error instanceof Error && error.message.includes('better-sqlite3 module is not available')) {
        const fallback = createSqlJsAdapter();
        await fallback.open();
        return fallback;
      }
      throw error;
    }
  };

  beforeEach(async () => {
    adapter = await createTestAdapter();

    // Create test schema
    await adapter.exec(`
      CREATE TABLE users (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT,
        created_at INTEGER
      )
    `);

    await adapter.exec(`
      CREATE TABLE posts (
        id INTEGER PRIMARY KEY,
        user_id INTEGER,
        title TEXT,
        content TEXT
      )
    `);

    // Insert test data
    await adapter.run('INSERT INTO users (id, name, email, created_at) VALUES (?, ?, ?, ?)', [
      1,
      'Alice',
      'alice@example.com',
      Date.now(),
    ]);
    await adapter.run('INSERT INTO users (id, name, email, created_at) VALUES (?, ?, ?, ?)', [
      2,
      'Bob',
      'bob@example.com',
      Date.now(),
    ]);
    await adapter.run('INSERT INTO posts (id, user_id, title, content) VALUES (?, ?, ?, ?)', [
      1,
      1,
      'First Post',
      'Hello World',
    ]);
  });

  it('should export all data with schema', async () => {
    const exported = await exportData(adapter, { includeSchema: true });

    expect(exported.version).toBe('1.0.0');
    expect(exported.adapter).toBe('sql-storage-adapter');
    expect(exported.exportedAt).toBeDefined();
    expect(exported.schema).toBeDefined();
    expect(exported.schema?.length).toBeGreaterThan(0);
    expect(exported.data.users).toHaveLength(2);
    expect(exported.data.posts).toHaveLength(1);
  });

  it('should export specific tables only', async () => {
    const exported = await exportData(adapter, { tables: ['users'] });

    expect(exported.data.users).toHaveLength(2);
    expect(exported.data.posts).toBeUndefined();
  });

  it('should export without schema', async () => {
    const exported = await exportData(adapter, { includeSchema: false });

    expect(exported.schema).toBeUndefined();
    expect(exported.data.users).toHaveLength(2);
  });

  it('should export as JSON', async () => {
    const json = await exportAsJSON(adapter, { pretty: true });

    expect(json).toContain('"version"');
    expect(json).toContain('"users"');
    expect(json).toContain('Alice');
    expect(json).toContain('Bob');

    // Verify it's valid JSON
    const parsed = JSON.parse(json);
    expect(parsed.data.users).toHaveLength(2);
  });

  it('should export as SQL', async () => {
    const sql = await exportAsSQL(adapter, { includeSchema: true });

    expect(sql).toContain('CREATE TABLE');
    expect(sql).toContain('INSERT INTO');
    expect(sql).toContain('users');
    expect(sql).toContain('Alice');
    expect(sql).toContain('Bob');
  });

  it('should export as CSV', async () => {
    const csvFiles = await exportAsCSV(adapter);

    expect(csvFiles.users).toBeDefined();
    expect(csvFiles.posts).toBeDefined();

    const usersCSV = csvFiles.users;
    expect(usersCSV).toContain('id');
    expect(usersCSV).toContain('name');
    expect(usersCSV).toContain('Alice');
    expect(usersCSV).toContain('Bob');

    // Count rows (header + 2 data rows)
    const lines = usersCSV.split('\n');
    expect(lines.length).toBe(3);
  });

  it('should handle empty tables', async () => {
    await adapter.exec('CREATE TABLE empty_table (id INTEGER, value TEXT)');

    const exported = await exportData(adapter, { tables: ['empty_table'] });

    expect(exported.data.empty_table).toHaveLength(0);
  });

  it('should escape special characters in CSV', async () => {
    await adapter.run('INSERT INTO users (id, name, email) VALUES (?, ?, ?)', [
      3,
      'Charlie, Jr.',
      'charlie"test"@example.com',
    ]);

    const csvFiles = await exportAsCSV(adapter, { tables: ['users'] });
    const csv = csvFiles.users;

    expect(csv).toContain('"Charlie, Jr."');
    expect(csv).toContain('"charlie""test""@example.com"');
  });

  it('should handle NULL values', async () => {
    await adapter.run('INSERT INTO users (id, name, email) VALUES (?, ?, ?)', [3, 'Dave', null]);

    const exported = await exportData(adapter, { tables: ['users'] });
    const dave = exported.data.users.find((u: any) => u.name === 'Dave') as any;

    expect(dave).toBeDefined();
    expect(dave?.email).toBeNull();
  });

  it('should export with batching for large datasets', async () => {
    // Insert many rows
    for (let i = 10; i < 1000; i++) {
      await adapter.run('INSERT INTO users (id, name, email) VALUES (?, ?, ?)', [
        i,
        `User${i}`,
        `user${i}@example.com`,
      ]);
    }

    const exported = await exportData(adapter, { batchSize: 100 });

    expect(exported.data.users.length).toBeGreaterThan(100);
  });

  afterEach(async () => {
    await adapter.close();
  });
});
