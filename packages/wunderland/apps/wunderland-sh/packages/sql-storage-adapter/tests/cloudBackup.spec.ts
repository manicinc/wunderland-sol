/**
 * Tests for cloud backup functionality.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createDatabase } from '../src/core/database';
import { createSqlJsAdapter } from '../src/adapters/sqlJsAdapter';
import { CloudBackupManager, S3StorageProvider, type CloudStorageProvider } from '../src/features/backup/cloudBackup';

/**
 * Mock storage provider for testing.
 */
class MockStorageProvider implements CloudStorageProvider {
  private storage = new Map<string, string | Buffer>();

  async upload(key: string, data: string | Buffer): Promise<void> {
    this.storage.set(key, data);
  }

  async download(key: string): Promise<string | Buffer> {
    const data = this.storage.get(key);
    if (!data) throw new Error(`Key not found: ${key}`);
    return data;
  }

  async list(prefix?: string): Promise<string[]> {
    const keys = Array.from(this.storage.keys());
    return prefix ? keys.filter(k => k.startsWith(prefix)) : keys;
  }

  async delete(key: string): Promise<void> {
    this.storage.delete(key);
  }

  clear() {
    this.storage.clear();
  }
}

describe('CloudBackupManager', () => {
  let db: Awaited<ReturnType<typeof createDatabase>>;
  let storage: MockStorageProvider;

  const createTestDatabase = async () => {
    try {
      return await createDatabase({ priority: ['sqljs'] });
    } catch (error) {
      // In CI we deliberately fall back to sql.js whenever native bindings are unavailable.
      const adapter = createSqlJsAdapter();
      await adapter.open();
      return adapter;
    }
  };

  beforeEach(async () => {
    db = await createTestDatabase();
    await db.exec('DROP TABLE IF EXISTS users; DROP TABLE IF EXISTS posts;');
    await db.exec('CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)');
    await db.run('INSERT INTO users (name) VALUES (?)', ['Alice']);
    await db.run('INSERT INTO users (name) VALUES (?)', ['Bob']);
    
    storage = new MockStorageProvider();
  });

  afterEach(async () => {
    if (db) {
      await db.close();
    }
  });

  describe('Manual Backups', () => {
    it('should create JSON backup', async () => {
      const manager = new CloudBackupManager(db, storage, { interval: 0 });
      
      const key = await manager.backup({ format: 'json' });
      
      expect(key).toContain('backup');
      expect(key).toContain('.json');
      
      const backups = await storage.list();
      expect(backups).toHaveLength(1);
    });

    it('should create SQL backup', async () => {
      const manager = new CloudBackupManager(db, storage, { interval: 0 });
      
      const key = await manager.backup({ format: 'sql' });
      
      expect(key).toContain('.sql');
      
      const data = await storage.download(key);
      expect(data).toContain('CREATE TABLE');
      expect(data).toContain('INSERT INTO');
    });

    it('should include timestamp in key by default', async () => {
      const manager = new CloudBackupManager(db, storage, { interval: 0 });
      
      const key = await manager.backup();
      
      expect(key).toMatch(/backup-\d{4}-\d{2}-\d{2}/);
    });

    it('should exclude timestamp when configured', async () => {
      const manager = new CloudBackupManager(db, storage, { interval: 0 });
      
      const key = await manager.backup({ includeTimestamp: false });
      
      expect(key).toBe('backups/backup.json');
    });

    it('should use custom prefix', async () => {
      const manager = new CloudBackupManager(db, storage, { 
        interval: 0,
        options: { prefix: 'production/' }
      });
      
      const key = await manager.backup();
      
      expect(key).toMatch(/^production\//);
    });

    it('should backup specific tables only', async () => {
      await db.exec('CREATE TABLE posts (id INTEGER PRIMARY KEY, title TEXT)');
      await db.run('INSERT INTO posts (title) VALUES (?)', ['Post 1']);
      
      const manager = new CloudBackupManager(db, storage, { interval: 0 });
      
      const key = await manager.backup({ 
        format: 'json',
        tables: ['users'] 
      });
      
      const data = await storage.download(key);
      const json = JSON.parse(data.toString());
      
      expect(json.data).toHaveProperty('users');
      expect(json.data).not.toHaveProperty('posts');
    });
  });

  describe('Compression', () => {
    it('should compress with gzip', async () => {
      const manager = new CloudBackupManager(db, storage, { interval: 0 });
      
      const key = await manager.backup({ compression: 'gzip' });
      
      expect(key).toMatch(/\.json\.gz$/);
      
      const compressed = await storage.download(key);
      expect(Buffer.isBuffer(compressed)).toBe(true);
    });

    it('should decompress on restore', async () => {
      const manager = new CloudBackupManager(db, storage, { interval: 0 });
      
      // Create compressed backup
      const key = await manager.backup({ compression: 'gzip' });
      
      // Clear database
      await db.run('DELETE FROM users');
      const before = await db.all('SELECT * FROM users');
      expect(before).toHaveLength(0);
      
      // Restore from compressed backup
      await manager.restore(key);
      
      const after = await db.all('SELECT * FROM users');
      expect(after).toHaveLength(2);
    });
  });

  describe('Restore', () => {
    it('should restore from JSON backup', async () => {
      const manager = new CloudBackupManager(db, storage, { interval: 0 });
      
      const key = await manager.backup({ format: 'json' });
      
      // Clear data
      await db.run('DELETE FROM users');
      expect(await db.all('SELECT * FROM users')).toHaveLength(0);
      
      // Restore
      await manager.restore(key);
      
      const users = await db.all('SELECT * FROM users');
      expect(users).toHaveLength(2);
    });

    it('should restore from SQL backup', async () => {
      const manager = new CloudBackupManager(db, storage, { interval: 0 });
      
      const key = await manager.backup({ format: 'sql' });
      
      // Clear data
      await db.run('DELETE FROM users');
      
      // Restore
      await manager.restore(key);
      
      const users = await db.all('SELECT * FROM users');
      expect(users).toHaveLength(2);
    });
  });

  describe('List Backups', () => {
    it('should list all backups', async () => {
      const manager = new CloudBackupManager(db, storage, { interval: 0 });
      
      await manager.backup();
      // Small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));
      await manager.backup();
      await new Promise(resolve => setTimeout(resolve, 10));
      await manager.backup();
      
      const backups = await manager.listBackups();
      expect(backups).toHaveLength(3);
    });

    it('should filter by prefix', async () => {
      const manager = new CloudBackupManager(db, storage, { interval: 0 });
      
      await manager.backup({ prefix: 'prod/' });
      await new Promise(resolve => setTimeout(resolve, 10));
      await manager.backup({ prefix: 'dev/' });
      await new Promise(resolve => setTimeout(resolve, 10));
      await manager.backup({ prefix: 'prod/' });
      
      const prodBackups = await manager.listBackups('prod/');
      expect(prodBackups).toHaveLength(2);
      
      const devBackups = await manager.listBackups('dev/');
      expect(devBackups).toHaveLength(1);
    });
  });

  describe('Automatic Cleanup', () => {
    it('should delete old backups when maxBackups is set', async () => {
      const manager = new CloudBackupManager(db, storage, { 
        interval: 0,
        maxBackups: 3
      });
      
      // Create 5 backups
      for (let i = 0; i < 5; i++) {
        await manager.backup({ includeTimestamp: true });
        // Small delay to ensure different timestamps
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      
      const backups = await manager.listBackups();
      expect(backups).toHaveLength(3); // Only keeps last 3
    });

    it('should keep all backups when maxBackups is not set', async () => {
      const manager = new CloudBackupManager(db, storage, { interval: 0 });
      
      await manager.backup();
      await new Promise(resolve => setTimeout(resolve, 10));
      await manager.backup();
      await new Promise(resolve => setTimeout(resolve, 10));
      await manager.backup();
      await new Promise(resolve => setTimeout(resolve, 10));
      await manager.backup();
      
      const backups = await manager.listBackups();
      expect(backups).toHaveLength(4);
    });
  });

  describe('Scheduled Backups', () => {
    it('should start and stop scheduled backups', async () => {
      vi.useFakeTimers();
      const onSuccess = vi.fn();
      const manager = new CloudBackupManager(db, storage, {
        interval: 100,
        onSuccess
      });

      try {
        manager.start();

        // Advance time to trigger multiple scheduled backups deterministically
        await vi.advanceTimersByTimeAsync(300);
        await Promise.resolve();
      } finally {
        manager.stop();
        vi.useRealTimers();
      }

      expect(onSuccess).toHaveBeenCalled();
      expect(onSuccess.mock.calls.length).toBeGreaterThanOrEqual(2);
    });

    it('should call onError when backup fails', async () => {
      const onError = vi.fn();
      const failingStorage = new MockStorageProvider();
      failingStorage.upload = async () => { throw new Error('Upload failed'); };
      
      const manager = new CloudBackupManager(db, failingStorage, {
        interval: 50,
        onError
      });
      
      manager.start();
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      manager.stop();
      
      expect(onError).toHaveBeenCalled();
      expect(onError.mock.calls[0][0].message).toContain('Upload failed');
    });

    it('should throw if started twice', async () => {
      const manager = new CloudBackupManager(db, storage, { interval: 100 });
      
      manager.start();
      
      expect(() => manager.start()).toThrow('already started');
      
      manager.stop();
    });
  });

  describe('backupNow', () => {
    it('should perform immediate backup', async () => {
      const manager = new CloudBackupManager(db, storage, { interval: 0 });
      
      const key = await manager.backupNow();
      
      expect(key).toBeDefined();
      const backups = await manager.listBackups();
      expect(backups).toHaveLength(1);
    });

    it('should accept custom options', async () => {
      const manager = new CloudBackupManager(db, storage, { 
        interval: 0,
        options: { format: 'sql' }
      });
      
      const key = await manager.backupNow({ format: 'json', prefix: 'manual/' });
      
      expect(key).toContain('.json');
      expect(key).toMatch(/^manual\//);
    });
  });
});

describe('S3StorageProvider', () => {
  it.skip('should work with mock S3 client', async () => {
    const mockStorage = new Map<string, Buffer>();
    
    const mockS3 = {
      send: async (command: any) => {
        if (command.constructor.name === 'PutObjectCommand') {
          mockStorage.set(command.input.Key, Buffer.from(command.input.Body));
          return {};
        }
        if (command.constructor.name === 'GetObjectCommand') {
          return {
            Body: {
              transformToString: async () => mockStorage.get(command.input.Key)?.toString() || ''
            }
          };
        }
        if (command.constructor.name === 'ListObjectsV2Command') {
          return {
            Contents: Array.from(mockStorage.keys())
              .filter(k => !command.input.Prefix || k.startsWith(command.input.Prefix))
              .map(Key => ({ Key }))
          };
        }
        if (command.constructor.name === 'DeleteObjectCommand') {
          mockStorage.delete(command.input.Key);
          return {};
        }
        return {};
      }
    };
    
    const provider = new S3StorageProvider(mockS3, 'test-bucket');
    
    await provider.upload('test.txt', 'Hello World');
    const data = await provider.download('test.txt');
    expect(data).toBe('Hello World');
    
    const keys = await provider.list();
    expect(keys).toEqual(['test.txt']);
    
    await provider.delete('test.txt');
    const remaining = await provider.list();
    expect(remaining).toEqual([]);
  });
});
