import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { importData, importFromJSON, importFromSQL, importFromCSV } from '../src/features/migrations/dataImport';
import { exportData, exportAsJSON, exportAsSQL } from '../src/features/migrations/dataExport';
import { createBetterSqliteAdapter } from '../src/adapters/betterSqliteAdapter';
import { createSqlJsAdapter } from '../src/adapters/sqlJsAdapter';
import type { StorageAdapter } from '../src/types';
import type { ExportedData } from '../src/features/migrations/dataExport';

describe('Data Import', () => {
  let sourceAdapter: StorageAdapter;
  let targetAdapter: StorageAdapter;

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
    sourceAdapter = await createTestAdapter();
    targetAdapter = await createTestAdapter();

    // Create and populate source database
    await sourceAdapter.exec(`
      CREATE TABLE users (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT
      )
    `);

    await sourceAdapter.run('INSERT INTO users (id, name, email) VALUES (?, ?, ?)', [
      1,
      'Alice',
      'alice@example.com',
    ]);
    await sourceAdapter.run('INSERT INTO users (id, name, email) VALUES (?, ?, ?)', [
      2,
      'Bob',
      'bob@example.com',
    ]);
  });

  it('should import data from exported format', async () => {
    const exported = await exportData(sourceAdapter);
    const result = await importData(targetAdapter, exported);

    expect(result.success).toBe(true);
    expect(result.tablesImported).toBeGreaterThan(0);
    expect(result.rowsImported).toBe(2);
    expect(result.errors).toBeUndefined();

    const users = await targetAdapter.all('SELECT * FROM users ORDER BY id');
    expect(users).toHaveLength(2);
    expect(users[0]).toMatchObject({ id: 1, name: 'Alice' });
  });

  it('should import from JSON string', async () => {
    const json = await exportAsJSON(sourceAdapter);
    const result = await importFromJSON(targetAdapter, json);

    expect(result.success).toBe(true);
    expect(result.rowsImported).toBe(2);

    const users = await targetAdapter.all('SELECT * FROM users');
    expect(users).toHaveLength(2);
  });

  it('should import specific tables only', async () => {
    await sourceAdapter.exec('CREATE TABLE posts (id INTEGER, title TEXT)');
    await sourceAdapter.run('INSERT INTO posts (id, title) VALUES (?, ?)', [1, 'Post 1']);

    const exported = await exportData(sourceAdapter);
    const result = await importData(targetAdapter, exported, { tables: ['users'] });

    expect(result.success).toBe(true);

    const users = await targetAdapter.all('SELECT * FROM users');
    expect(users).toHaveLength(2);

    // Posts table should not exist
    await expect(targetAdapter.all('SELECT * FROM posts')).rejects.toThrow();
  });

  it('should skip schema import when requested', async () => {
    // Pre-create table in target
    await targetAdapter.exec('CREATE TABLE users (id INTEGER, name TEXT, email TEXT)');

    const exported = await exportData(sourceAdapter);
    const result = await importData(targetAdapter, exported, { skipSchema: true });

    expect(result.success).toBe(true);
    expect(result.rowsImported).toBe(2);
  });

  it('should skip data import when requested', async () => {
    const exported = await exportData(sourceAdapter);
    const result = await importData(targetAdapter, exported, { skipData: true });

    expect(result.success).toBe(true);
    expect(result.rowsImported).toBe(0);

    // Table should exist but be empty
    const users = await targetAdapter.all('SELECT * FROM users');
    expect(users).toHaveLength(0);
  });

  it('should drop tables when requested', async () => {
    // Create table with existing data in target
    await targetAdapter.exec('CREATE TABLE users (id INTEGER, name TEXT)');
    await targetAdapter.run('INSERT INTO users (id, name) VALUES (?, ?)', [99, 'Old User']);

    const exported = await exportData(sourceAdapter);
    const result = await importData(targetAdapter, exported, { dropTables: true });

    expect(result.success).toBe(true);

    const users = await targetAdapter.all('SELECT * FROM users');
    expect(users).toHaveLength(2);
    expect(users.find((u: any) => u.name === 'Old User')).toBeUndefined();
  });

  it('should handle onConflict: ignore', async () => {
    await targetAdapter.exec('CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, email TEXT)');
    await targetAdapter.run('INSERT INTO users (id, name, email) VALUES (?, ?, ?)', [
      1,
      'Existing',
      'existing@example.com',
    ]);

    const exported = await exportData(sourceAdapter);
    const result = await importData(targetAdapter, exported, {
      skipSchema: true,
      onConflict: 'ignore',
    });

    expect(result.success).toBe(true);

    const users = await targetAdapter.all<any>('SELECT * FROM users ORDER BY id');
    // Should have user 1 (existing) and user 2 (imported)
    expect(users).toHaveLength(2);
    expect(users[0]?.name).toBe('Existing'); // Original remains
  });

  it('should import from SQL dump', async () => {
    const sql = await exportAsSQL(sourceAdapter);
    const result = await importFromSQL(targetAdapter, sql);

    expect(result.success).toBe(true);

    const users = await targetAdapter.all('SELECT * FROM users');
    expect(users).toHaveLength(2);
  });

  it('should import from CSV', async () => {
    const csv = `id,name,email
1,Alice,alice@example.com
2,Bob,bob@example.com`;

    await targetAdapter.exec('CREATE TABLE users (id INTEGER, name TEXT, email TEXT)');

    const result = await importFromCSV(targetAdapter, 'users', csv);

    expect(result.success).toBe(true);
    expect(result.rowsImported).toBe(2);

    const users = await targetAdapter.all('SELECT * FROM users');
    expect(users).toHaveLength(2);
  });

  it('should handle CSV with quoted values', async () => {
    const csv = `id,name,email
1,"Alice, Jr.","alice@example.com"
2,"Bob ""The Builder""","bob@example.com"`;

    await targetAdapter.exec('CREATE TABLE users (id INTEGER, name TEXT, email TEXT)');

    const result = await importFromCSV(targetAdapter, 'users', csv);

    expect(result.success).toBe(true);

    const users = await targetAdapter.all<any>('SELECT * FROM users');
    expect(users[0]?.name).toBe('Alice, Jr.');
    expect(users[1]?.name).toBe('Bob "The Builder"');
  });

  it('should handle import errors gracefully', async () => {
    const invalidData: ExportedData = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      adapter: 'test',
      schema: [
        {
          name: 'invalid_table',
          columns: [], // No columns - should fail
        },
      ],
      data: {},
    };

    const result = await importData(targetAdapter, invalidData);

    expect(result.success).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors!.length).toBeGreaterThan(0);
  });

  it('should handle malformed JSON', async () => {
    const result = await importFromJSON(targetAdapter, 'not valid json');

    expect(result.success).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors![0]).toContain('JSON parse error');
  });

  it('should batch large imports', async () => {
    // Insert many rows
    for (let i = 3; i <= 1000; i++) {
      await sourceAdapter.run('INSERT INTO users (id, name, email) VALUES (?, ?, ?)', [
        i,
        `User${i}`,
        `user${i}@example.com`,
      ]);
    }

    const exported = await exportData(sourceAdapter);
    const result = await importData(targetAdapter, exported, { batchSize: 50 });

    expect(result.success).toBe(true);
    expect(result.rowsImported).toBe(1000);

    const count = await targetAdapter.get<{ count: number }>('SELECT COUNT(*) as count FROM users');
    expect(count?.count).toBe(1000);
  });

  it('should preserve NULL values during import', async () => {
    await sourceAdapter.run('INSERT INTO users (id, name, email) VALUES (?, ?, ?)', [3, 'Charlie', null]);

    const exported = await exportData(sourceAdapter);
    const result = await importData(targetAdapter, exported);

    expect(result.success).toBe(true);

    const charlie = await targetAdapter.get<{ email: string | null }>(
      'SELECT email FROM users WHERE name = ?',
      ['Charlie']
    );
    expect(charlie?.email).toBeNull();
  });

  afterEach(async () => {
    await sourceAdapter.close();
    await targetAdapter.close();
  });
});
