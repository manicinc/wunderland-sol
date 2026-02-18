import { describe, expect, it, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Check if better-sqlite3 native bindings are available
const checkBetterSqliteAvailable = (): boolean => {
  try {
    // Check if the binding file exists in any of the expected locations
    const betterSqlitePath = require.resolve('better-sqlite3');
    const betterSqliteDir = path.dirname(betterSqlitePath);
    const possibleBindings = [
      path.join(betterSqliteDir, '..', 'build', 'Release', 'better_sqlite3.node'),
      path.join(betterSqliteDir, '..', 'build', 'better_sqlite3.node'),
      path.join(betterSqliteDir, '..', 'prebuilds'),
    ];
    return possibleBindings.some(p => fs.existsSync(p));
  } catch {
    return false;
  }
};

const betterSqliteAvailable = checkBetterSqliteAvailable();

describe.skipIf(!betterSqliteAvailable)('BetterSqliteAdapter', () => {
  // Dynamic import to avoid loading the native module during collection
  let createBetterSqliteAdapter: typeof import('../src/index.js').createBetterSqliteAdapter;

  const testDirs: string[] = [];

  afterEach(() => {
    // Clean up test directories
    for (const dir of testDirs) {
      try {
        fs.rmSync(dir, { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors
      }
    }
    testDirs.length = 0;
  });

  describe('directory creation', () => {
    it('should create parent directory if it does not exist', async () => {
      const { createBetterSqliteAdapter } = await import('../src/index.js');

      const tempDir = path.join(os.tmpdir(), `sql-adapter-test-${Date.now()}`);
      const dbPath = path.join(tempDir, 'nested', 'db.sqlite');
      testDirs.push(tempDir);

      // Ensure directory doesn't exist
      expect(fs.existsSync(tempDir)).toBe(false);

      const adapter = createBetterSqliteAdapter(dbPath);
      await adapter.open();

      // Verify directory was created
      expect(fs.existsSync(path.dirname(dbPath))).toBe(true);
      expect(fs.existsSync(dbPath)).toBe(true);

      await adapter.close();
    });

    it('should work with existing directory', async () => {
      const { createBetterSqliteAdapter } = await import('../src/index.js');

      const tempDir = path.join(os.tmpdir(), `sql-adapter-test-${Date.now()}`);
      const dbPath = path.join(tempDir, 'db.sqlite');
      testDirs.push(tempDir);

      // Create directory first
      fs.mkdirSync(tempDir, { recursive: true });
      expect(fs.existsSync(tempDir)).toBe(true);

      const adapter = createBetterSqliteAdapter(dbPath);
      await adapter.open();

      expect(fs.existsSync(dbPath)).toBe(true);

      await adapter.close();
    });

    it('should not attempt directory creation for :memory: database', async () => {
      const { createBetterSqliteAdapter } = await import('../src/index.js');

      const adapter = createBetterSqliteAdapter(':memory:');
      await adapter.open();

      // Should open successfully without any directory creation
      await adapter.exec('CREATE TABLE test (id INTEGER PRIMARY KEY)');
      await adapter.run('INSERT INTO test (id) VALUES (1)');
      const result = await adapter.get<{ id: number }>('SELECT id FROM test WHERE id = 1');
      expect(result?.id).toBe(1);

      await adapter.close();
    });
  });
});
