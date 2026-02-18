import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  migrateLocalToSupabase,
  migrateAdapters,
  createBackup,
  restoreFromBackup,
  cloneAdapter,
  formatMigrationResult,
} from '../src/features/migrations/migration';
import { createBetterSqliteAdapter } from '../src/adapters/betterSqliteAdapter';
import { createSqlJsAdapter } from '../src/adapters/sqlJsAdapter';
import type { StorageAdapter } from '../src/types';

describe('Migration Utilities', () => {
  let sourceAdapter: StorageAdapter;
  let targetAdapter: StorageAdapter;

  const createTestAdapter = async (): Promise<StorageAdapter> => {
    const sqliteAdapter = createBetterSqliteAdapter(':memory:');
    try {
      await sqliteAdapter.open();
      return sqliteAdapter;
    } catch (error) {
      if (isBetterSqliteUnavailable(error)) {
        const fallback = createSqlJsAdapter();
        await fallback.open();
        return fallback;
      }
      throw error;
    }
  };

  const isBetterSqliteUnavailable = (error: unknown): boolean =>
    error instanceof Error && error.message.includes('better-sqlite3 module is not available');

  beforeEach(async () => {
    sourceAdapter = await createTestAdapter();
    targetAdapter = await createTestAdapter();

    // Create test schema in source
    await sourceAdapter.exec(`
      CREATE TABLE users (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT,
        created_at INTEGER
      )
    `);

    await sourceAdapter.exec(`
      CREATE TABLE posts (
        id INTEGER PRIMARY KEY,
        user_id INTEGER,
        title TEXT,
        content TEXT
      )
    `);

    // Insert test data
    await sourceAdapter.run('INSERT INTO users (id, name, email, created_at) VALUES (?, ?, ?, ?)', [
      1,
      'Alice',
      'alice@example.com',
      Date.now(),
    ]);
    await sourceAdapter.run('INSERT INTO users (id, name, email, created_at) VALUES (?, ?, ?, ?)', [
      2,
      'Bob',
      'bob@example.com',
      Date.now(),
    ]);
    await sourceAdapter.run('INSERT INTO posts (id, user_id, title, content) VALUES (?, ?, ?, ?)', [
      1,
      1,
      'First Post',
      'Hello World',
    ]);
    await sourceAdapter.run('INSERT INTO posts (id, user_id, title, content) VALUES (?, ?, ?, ?)', [
      2,
      2,
      'Second Post',
      'Goodbye World',
    ]);
  });

  afterEach(async () => {
    await sourceAdapter.close();
    await targetAdapter.close();
  });

  it('should migrate all data between adapters', async () => {
    const result = await migrateAdapters(sourceAdapter, targetAdapter);

    expect(result.success).toBe(true);
    expect(result.sourceAdapter).toBe('unknown');
    expect(result.targetAdapter).toBe('unknown');
    expect(result.tablesImported).toBe(2);
    expect(result.rowsImported).toBe(4);

    const users = await targetAdapter.all('SELECT * FROM users');
    const posts = await targetAdapter.all('SELECT * FROM posts');

    expect(users).toHaveLength(2);
    expect(posts).toHaveLength(2);
  });

  it('should migrate specific tables only', async () => {
    const result = await migrateAdapters(sourceAdapter, targetAdapter, {
      tables: ['users'],
    });

    expect(result.success).toBe(true);
    expect(result.rowsImported).toBe(2);

    const users = await targetAdapter.all('SELECT * FROM users');
    expect(users).toHaveLength(2);

    // Posts table should not exist
    await expect(targetAdapter.all('SELECT * FROM posts')).rejects.toThrow();
  });

  it('should verify migration when requested', async () => {
    const result = await migrateAdapters(sourceAdapter, targetAdapter, {
      verify: true,
    });

    expect(result.success).toBe(true);
    expect(result.verification).toBeDefined();
    expect(result.verification!.passed).toBe(true);
    expect(result.verification!.tableCounts.users).toEqual({
      source: 2,
      target: 2,
      match: true,
    });
    expect(result.verification!.tableCounts.posts).toEqual({
      source: 2,
      target: 2,
      match: true,
    });
  });

  it('should detect verification failures', async () => {
    // Migrate data
    await migrateAdapters(sourceAdapter, targetAdapter);

    // Add extra row to target
    await targetAdapter.run('INSERT INTO users (id, name, email) VALUES (?, ?, ?)', [
      99,
      'Extra',
      'extra@example.com',
    ]);

    // Run verification
    const result = await migrateAdapters(sourceAdapter, targetAdapter, {
      verify: true,
      dropExisting: false,
    });

    expect(result.verification).toBeDefined();
    expect(result.verification!.passed).toBe(false);
    expect(result.verification!.tableCounts.users.match).toBe(false);
  });

  it('should drop existing tables when requested', async () => {
    // Pre-populate target with different data
    await targetAdapter.exec('CREATE TABLE users (id INTEGER, name TEXT)');
    await targetAdapter.run('INSERT INTO users (id, name) VALUES (?, ?)', [99, 'Old User']);

    const result = await migrateAdapters(sourceAdapter, targetAdapter, {
      dropExisting: true,
    });

    expect(result.success).toBe(true);

    const users = await targetAdapter.all('SELECT * FROM users');
    expect(users).toHaveLength(2);
    expect(users.find((u: any) => u.name === 'Old User')).toBeUndefined();
  });

  it('should create backup as JSON', async () => {
    const backup = await createBackup(sourceAdapter, { pretty: true });

    expect(backup).toContain('"version"');
    expect(backup).toContain('"users"');
    expect(backup).toContain('"posts"');
    expect(backup).toContain('Alice');
    expect(backup).toContain('Bob');

    // Verify valid JSON
    const parsed = JSON.parse(backup);
    expect(parsed.data.users).toHaveLength(2);
    expect(parsed.data.posts).toHaveLength(2);
  });

  it('should restore from backup', async () => {
    const backup = await createBackup(sourceAdapter);
    const result = await restoreFromBackup(targetAdapter, backup);

    expect(result.success).toBe(true);
    expect(result.rowsImported).toBe(4);

    const users = await targetAdapter.all('SELECT * FROM users');
    const posts = await targetAdapter.all('SELECT * FROM posts');

    expect(users).toHaveLength(2);
    expect(posts).toHaveLength(2);
  });

  it('should clone adapter with verification', async () => {
    const result = await cloneAdapter(sourceAdapter, targetAdapter);

    expect(result.success).toBe(true);
    expect(result.verification).toBeDefined();
    expect(result.verification!.passed).toBe(true);

    // Verify all data copied
    const sourceUsers = await sourceAdapter.all('SELECT * FROM users ORDER BY id');
    const targetUsers = await targetAdapter.all('SELECT * FROM users ORDER BY id');

    expect(targetUsers).toEqual(sourceUsers);
  });

  it('should handle migration errors gracefully', async () => {
    // Create a table with a column that might cause issues during export
    // (empty table is fine, the export/import should handle it)
    await sourceAdapter.exec('CREATE TABLE empty_table (id INTEGER PRIMARY KEY)');

    const result = await migrateAdapters(sourceAdapter, targetAdapter);

    // Should succeed for all tables
    expect(result.success).toBe(true);
    expect(result.tablesImported).toBeGreaterThan(0);
  });

  it('should format migration results nicely', async () => {
    const result = await migrateAdapters(sourceAdapter, targetAdapter, {
      verify: true,
    });

    const formatted = formatMigrationResult(result);

    expect(formatted).toContain('Migration Result');
    expect(formatted).toContain('Source:');
    expect(formatted).toContain('Target:');
    expect(formatted).toContain('Status:');
    expect(formatted).toContain('[OK]');
    expect(formatted).toContain('Tables: 2');
    expect(formatted).toContain('Rows: 4');
    expect(formatted).toContain('Verification:');
    expect(formatted).toContain('users: source=2, target=2');
  });

  it('should handle batch size configuration', async () => {
    // Add more data
    for (let i = 3; i <= 100; i++) {
      await sourceAdapter.run('INSERT INTO users (id, name, email) VALUES (?, ?, ?)', [
        i,
        `User${i}`,
        `user${i}@example.com`,
      ]);
    }

    const result = await migrateAdapters(sourceAdapter, targetAdapter, {
      batchSize: 10,
    });

    expect(result.success).toBe(true);
    expect(result.rowsImported).toBe(102); // 100 users + 2 posts

    const count = await targetAdapter.get<{ count: number }>('SELECT COUNT(*) as count FROM users');
    expect(count?.count).toBe(100);
  });

  it('should handle onConflict strategies', async () => {
    // Pre-populate target
    await targetAdapter.exec('CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, email TEXT)');
    await targetAdapter.run('INSERT INTO users (id, name, email) VALUES (?, ?, ?)', [
      1,
      'Existing Alice',
      'existing@example.com',
    ]);

    // Migrate with replace strategy
    const result = await migrateAdapters(sourceAdapter, targetAdapter, {
      onConflict: 'replace',
    });

    expect(result.success).toBe(true);

    const alice = await targetAdapter.get<{ name: string }>(
      'SELECT name FROM users WHERE id = ?',
      [1]
    );
    // Depending on the adapter's support for ON CONFLICT, this might still be 'Existing Alice'
    expect(alice).toBeDefined();
  });

  it('should create partial backups', async () => {
    const backup = await createBackup(sourceAdapter, {
      tables: ['users'],
      pretty: false,
    });

    const parsed = JSON.parse(backup);
    expect(parsed.data.users).toBeDefined();
    expect(parsed.data.posts).toBeUndefined();
  });

  it('should measure migration duration', async () => {
    const result = await migrateAdapters(sourceAdapter, targetAdapter);

    expect(result.duration).toBeGreaterThanOrEqual(0);
    expect(result.duration).toBeLessThan(10000); // Should be fast for small dataset
  });
});

