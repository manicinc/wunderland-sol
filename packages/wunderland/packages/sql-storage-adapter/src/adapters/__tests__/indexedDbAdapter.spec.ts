import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { IndexedDbAdapter } from '../indexedDbAdapter';

// Mock IndexedDB for Node.js tests
const setupIndexedDbMock = () => {
  const stores: Map<string, Map<string, unknown>> = new Map();
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (global as any).indexedDB = {
    open: (_name: string, _version: number) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const req: any = {
        result: {
          objectStoreNames: { contains: () => false },
          createObjectStore: (_storeName: string) => {
            stores.set(_storeName, new Map());
          },
          transaction: (_storeName: string, _mode: string) => ({
            objectStore: (name: string) => {
              const store = stores.get(name) || new Map();
              return {
                get: (key: string) => ({
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  onsuccess: null as any,
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  onerror: null as any,
                  result: store.get(key),
                }),
                put: (value: unknown, key: string) => {
                  store.set(key, value);
                  return {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    onsuccess: null as any,
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    onerror: null as any,
                  };
                },
              };
            },
          }),
          close: () => {},
        },
      };
      setTimeout(() => {
        if (req.onupgradeneeded) req.onupgradeneeded();
        if (req.onsuccess) req.onsuccess();
      }, 0);
      return req;
    },
  };
};

describe('IndexedDbAdapter', () => {
  let adapter: IndexedDbAdapter;

  beforeEach(async () => {
    setupIndexedDbMock();
    adapter = new IndexedDbAdapter({
      dbName: 'test-db',
      autoSave: false, // Disable for tests
    });
  });

  afterEach(async () => {
    if (adapter) {
      await adapter.close();
    }
  });

  it('should initialize with correct capabilities', () => {
    expect(adapter.kind).toBe('indexeddb');
    expect(adapter.capabilities.has('transactions')).toBe(true);
    expect(adapter.capabilities.has('persistence')).toBe(true);
  });

  it('should open database successfully', async () => {
    await adapter.open();
    // No error means success
    expect(true).toBe(true);
  });

  it('should create table and insert data', async () => {
    await adapter.open();
    await adapter.run('CREATE TABLE test (id INTEGER PRIMARY KEY, name TEXT)');
    const result = await adapter.run('INSERT INTO test (name) VALUES (?)', ['Alice']);
    
    expect(result.changes).toBe(1);
    expect(result.lastInsertRowid).toBeDefined();
  });

  it('should retrieve inserted data', async () => {
    await adapter.open();
    await adapter.run('CREATE TABLE test (id INTEGER PRIMARY KEY, name TEXT)');
    await adapter.run('INSERT INTO test (name) VALUES (?)', ['Bob']);
    
    const row = await adapter.get<{ id: number; name: string }>('SELECT * FROM test WHERE name = ?', ['Bob']);
    expect(row).toBeDefined();
    expect(row?.name).toBe('Bob');
  });

  it('should return all rows', async () => {
    await adapter.open();
    await adapter.run('CREATE TABLE test (id INTEGER PRIMARY KEY, name TEXT)');
    await adapter.run('INSERT INTO test (name) VALUES (?)', ['Alice']);
    await adapter.run('INSERT INTO test (name) VALUES (?)', ['Bob']);
    
    const rows = await adapter.all<{ id: number; name: string }>('SELECT * FROM test');
    expect(rows.length).toBe(2);
    expect(rows.map(r => r.name)).toContain('Alice');
    expect(rows.map(r => r.name)).toContain('Bob');
  });

  it('should support transactions', async () => {
    await adapter.open();
    await adapter.run('CREATE TABLE test (id INTEGER PRIMARY KEY, value INTEGER)');
    
    await adapter.beginTransaction();
    await adapter.run('INSERT INTO test (value) VALUES (?)', [100]);
    await adapter.run('INSERT INTO test (value) VALUES (?)', [200]);
    await adapter.commit();
    
    const rows = await adapter.all<{ value: number }>('SELECT value FROM test');
    expect(rows.length).toBe(2);
    expect(rows.map(r => r.value)).toEqual([100, 200]);
  });

  it('should rollback transactions', async () => {
    await adapter.open();
    await adapter.run('CREATE TABLE test (id INTEGER PRIMARY KEY, value INTEGER)');
    
    await adapter.beginTransaction();
    await adapter.run('INSERT INTO test (value) VALUES (?)', [100]);
    await adapter.rollback();
    
    const rows = await adapter.all('SELECT * FROM test');
    expect(rows.length).toBe(0);
  });

  it('should export and import database', async () => {
    await adapter.open();
    await adapter.run('CREATE TABLE test (id INTEGER PRIMARY KEY, name TEXT)');
    await adapter.run('INSERT INTO test (name) VALUES (?)', ['Export Test']);
    
    const exported = adapter.exportDatabase();
    expect(exported).toBeInstanceOf(Uint8Array);
    expect(exported.length).toBeGreaterThan(0);
    
    // Create new adapter and import
    const adapter2 = new IndexedDbAdapter({ dbName: 'test-db-2', autoSave: false });
    await adapter2.open();
    await adapter2.importDatabase(exported);
    
    const row = await adapter2.get<{ name: string }>('SELECT * FROM test WHERE name = ?', ['Export Test']);
    expect(row?.name).toBe('Export Test');
    
    await adapter2.close();
  });
});

