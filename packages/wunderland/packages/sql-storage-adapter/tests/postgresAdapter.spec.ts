import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPostgresAdapter } from '../src/adapters/postgresAdapter.js';
import { type StorageAdapter } from '../src/types.js';

vi.mock('pg', () => {
  const queries: Array<{ source: 'pool' | 'client'; text: string; values?: unknown[] }> = [];

  class FakeClient {
    async query(text: string, values?: unknown[]) {
      queries.push({ source: 'client', text, values });
      if (/SELECT/.test(text)) {
        return { rowCount: 1, rows: [{ id: 321, text, values }] };
      }
      return { rowCount: 1, rows: [] };
    }

    release(): void {}
  }

  class FakePool {
    async connect() {
      queries.push({ source: 'pool', text: 'CONNECT' });
      return new FakeClient();
    }

    async query(text: string, values?: unknown[]) {
      queries.push({ source: 'pool', text, values });
      if (/SELECT/.test(text)) {
        return { rowCount: 1, rows: [{ id: 123, text, values }] };
      }
      return { rowCount: 1, rows: [] };
    }

    async end(): Promise<void> {
      queries.push({ source: 'pool', text: 'END' });
    }
  }

  return { Pool: FakePool, __queries: queries };
});

const getQueries = async () => {
  const mod: any = await import('pg');
  return mod.__queries as Array<{ source: 'pool' | 'client'; text: string; values?: unknown[] }>;
};

describe('PostgresAdapter', () => {
  beforeEach(async () => {
    const queries = await getQueries();
    queries.length = 0;
  });

  const CONNECTION = 'postgres://user:pass@localhost:5432/test_db';

  const withAdapter = async (fn: (adapter: StorageAdapter) => Promise<void>) => {
    const adapter = createPostgresAdapter(CONNECTION);
    await adapter.open();
    try {
      await fn(adapter);
    } finally {
      await adapter.close();
    }
  };

  it('binds named parameters in order', async () => {
    await withAdapter(async (adapter) => {
      await adapter.run(
        'INSERT INTO example (foo, bar) VALUES (@foo, @bar)',
        { foo: 'named', bar: 99 }
      );
      const queries = await getQueries();
      const insert = queries.find((entry) => entry.text.startsWith('INSERT INTO example'));
      expect(insert).toBeDefined();
      expect(insert?.values).toEqual(['named', 99]);
      expect(insert?.text).toContain('$1');
      expect(insert?.text).toContain('$2');
    });
  });

  it('supports positional parameters', async () => {
    await withAdapter(async (adapter) => {
      const row = await adapter.get<{ id: number }>('SELECT * FROM example WHERE id = ?', [42]);
      const queries = await getQueries();
      const select = queries.find((entry) => entry.text.startsWith('SELECT * FROM example'));
      expect(select).toBeDefined();
      expect(select?.values).toEqual([42]);
      expect(select?.text).toBe('SELECT * FROM example WHERE id = $1');
      expect(row?.id).toBe(123);
    });
  });

  it('wraps statements in explicit transactions', async () => {
    await withAdapter(async (adapter) => {
      await adapter.transaction(async (trx) => {
        await trx.run('UPDATE example SET foo = @foo WHERE id = @id', { foo: 'updated', id: 7 });
      });
      const queries = await getQueries();
      const beginIndex = queries.findIndex((entry) => entry.text === 'BEGIN');
      const updateIndex = queries.findIndex((entry) => entry.text.startsWith('UPDATE example'));
      const commitIndex = queries.findIndex((entry) => entry.text === 'COMMIT');
      expect(beginIndex).toBeGreaterThan(-1);
      expect(updateIndex).toBeGreaterThan(beginIndex);
      expect(commitIndex).toBeGreaterThan(updateIndex);
      const update = queries[updateIndex];
      expect(update.values).toEqual(['updated', 7]);
    });
  });
});
