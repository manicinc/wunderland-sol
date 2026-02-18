import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import type {
  StorageAdapter,
  StorageParameters,
  StorageRunResult,
  StorageResolutionOptions,
  StorageCapability,
} from '@framers/sql-storage-adapter';

const loadAppDatabaseModule = async () => import('../core/database/appDatabase.js');

class MockAdapter implements StorageAdapter {
  public readonly execCalls: string[] = [];
  public readonly runCalls: Array<{ statement: string; parameters?: StorageParameters }> = [];
  public readonly allCalls: string[] = [];
  private readonly capabilitySet: ReadonlySet<StorageCapability>;

  public constructor(
    public readonly kind: string,
    private readonly options: { persistent: boolean; wal?: boolean; columns?: Record<string, string[]> } = {
      persistent: false,
    },
  ) {
    const flags: StorageCapability[] = [];
    if (this.options.persistent) {
      flags.push('persistence' as StorageCapability);
    }
    if (this.options.wal) {
      flags.push('wal' as StorageCapability);
    }
    this.capabilitySet = new Set(flags);
  }

  public get capabilities(): ReadonlySet<StorageCapability> {
    return this.capabilitySet;
  }

  public async open(): Promise<void> {
    // no-op for tests
  }

  public async close(): Promise<void> {
    // no-op for tests
  }

  public async run(statement: string, parameters?: StorageParameters): Promise<StorageRunResult> {
    this.runCalls.push({ statement, parameters });
    return { changes: 0, lastInsertRowid: null };
  }

  public async get(): Promise<null> {
    return null;
  }

  public async all<T = unknown>(statement: string): Promise<T[]> {
    this.allCalls.push(statement);
    const pragmaMatch = statement.match(/PRAGMA\s+table_info\(([^)]+)\);?/i);
    if (pragmaMatch) {
      const table = pragmaMatch[1];
      const columns = this.options.columns?.[table] ?? [];
      return columns.map((name) => ({ name })) as T[];
    }
    return [] as T[];
  }

  public async exec(script: string): Promise<void> {
    this.execCalls.push(script.trim());
  }

  public async transaction<T>(fn: (trx: StorageAdapter) => Promise<T>): Promise<T> {
    return fn(this);
  }
}

afterEach(async () => {
  const { closeAppDatabase, __setAppDatabaseAdapterResolverForTests } = await loadAppDatabaseModule();
  await closeAppDatabase();
  __setAppDatabaseAdapterResolverForTests();
});

test('getAppDatabase throws before initialization', async () => {
  const { getAppDatabase, closeAppDatabase } = await loadAppDatabaseModule();
  await closeAppDatabase();
  assert.throws(() => getAppDatabase(), /has not been initialised/i);
});

test('initializeAppDatabase uses persistent adapter when resolver succeeds', async () => {
  const adapter = new MockAdapter('better-sqlite3', {
    persistent: true,
    wal: true,
    columns: {
      app_users: ['id', 'email', 'password_hash', 'supabase_user_id', 'subscription_plan_id'],
    },
  });

  const {
    initializeAppDatabase,
    getAppDatabase,
    isInMemoryAppDatabase,
    __setAppDatabaseAdapterResolverForTests,
  } = await loadAppDatabaseModule();

  __setAppDatabaseAdapterResolverForTests(async (): Promise<StorageAdapter> => adapter);

  await initializeAppDatabase();

  assert.equal(isInMemoryAppDatabase(), false);
  assert.equal(getAppDatabase(), adapter);
  assert.ok(
    adapter.execCalls.some((statement) => statement.includes('CREATE TABLE IF NOT EXISTS app_meta')),
    'runs bootstrap schema statements',
  );
});

test('initializeAppDatabase falls back to in-memory adapter when resolver throws', async () => {
  const fallbackAdapter = new MockAdapter('sqljs', { persistent: false });
  let callCount = 0;

  const {
    initializeAppDatabase,
    getAppDatabase,
    isInMemoryAppDatabase,
    __setAppDatabaseAdapterResolverForTests,
  } = await loadAppDatabaseModule();

  __setAppDatabaseAdapterResolverForTests(async (options?: StorageResolutionOptions): Promise<StorageAdapter> => {
    callCount += 1;
    if (callCount === 1) {
      throw new Error('primary adapter unavailable');
    }
    assert.deepEqual(options?.priority, ['sqljs']);
    return fallbackAdapter;
  });

  await initializeAppDatabase();

  assert.equal(callCount, 2, 'resolver called twice (primary + fallback)');
  assert.equal(isInMemoryAppDatabase(), true);
  assert.equal(getAppDatabase(), fallbackAdapter);
});
