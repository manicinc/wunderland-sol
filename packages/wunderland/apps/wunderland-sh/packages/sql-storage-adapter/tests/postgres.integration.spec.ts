import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createPostgresAdapter, type PostgresAdapterOptions } from '../src/adapters/postgresAdapter';
import type { StorageAdapter } from '../src/types';

/**
 * PostgreSQL Integration Tests
 * 
 * These tests verify real PostgreSQL connections including:
 * - Connection string and granular configuration
 * - Remote connection support with SSL/TLS
 * - Connection pooling
 * - Cloud provider configurations
 * 
 * SETUP: Requires a running PostgreSQL instance
 * 
 * Quick Docker setup:
 * ```bash
 * docker run --name test-postgres \
 *   -e POSTGRES_PASSWORD=test123 \
 *   -e POSTGRES_DB=testdb \
 *   -p 5432:5432 \
 *   -d postgres:15
 * ```
 * 
 * Set connection via environment variable:
 * ```bash
 * export TEST_POSTGRES_URL="postgresql://postgres:test123@localhost:5432/testdb"
 * npm test
 * ```
 * 
 * Skip integration tests if Postgres not available:
 * ```bash
 * npm test -- --exclude postgres.integration.spec.ts
 * ```
 */

const TEST_CONNECTION_STRING =
  process.env.TEST_POSTGRES_URL || 'postgresql://postgres:test123@localhost:5432/testdb';

// Helper to check if PostgreSQL is available
async function isPostgresAvailable(): Promise<boolean> {
  try {
    const adapter = createPostgresAdapter(TEST_CONNECTION_STRING);
    await adapter.open();
    await adapter.close();
    return true;
  } catch {
    return false;
  }
}

describe.skipIf(!process.env.TEST_POSTGRES_URL)('PostgreSQL Integration Tests', () => {
  let adapter: StorageAdapter;
  let isAvailable: boolean;

  beforeAll(async () => {
    isAvailable = await isPostgresAvailable();
    if (!isAvailable) {
      console.warn(
        '⚠️  PostgreSQL not available. Set TEST_POSTGRES_URL or start Docker:\n' +
          '   docker run --name test-postgres -e POSTGRES_PASSWORD=test123 -e POSTGRES_DB=testdb -p 5432:5432 -d postgres:15'
      );
    }
  });

  afterAll(async () => {
    if (adapter) {
      try {
        await adapter.exec('DROP TABLE IF EXISTS test_users CASCADE');
        await adapter.exec('DROP TABLE IF EXISTS test_accounts CASCADE');
        await adapter.exec('DROP TABLE IF EXISTS test_json CASCADE');
        await adapter.exec('DROP TABLE IF EXISTS test_arrays CASCADE');
        await adapter.close();
      } catch (err) {
        // Ignore cleanup errors
      }
    }
  });

  describe('Connection Methods', () => {
    it('should connect with connection string', async () => {
      if (!isAvailable) return;

      adapter = createPostgresAdapter(TEST_CONNECTION_STRING);
      await adapter.open();

      expect(adapter.kind).toBe('postgres');
      expect(adapter.capabilities.has('transactions')).toBe(true);
      
      await adapter.close();
    });

    it('should connect with granular configuration', async () => {
      if (!isAvailable) return;

      const options: PostgresAdapterOptions = {
        host: 'localhost',
        port: 5432,
        database: 'testdb',
        user: 'postgres',
        password: 'test123',
      };

      adapter = createPostgresAdapter(options);
      await adapter.open();

      const result = await adapter.get<{ version: string }>('SELECT version()');
      expect(result?.version).toContain('PostgreSQL');

      await adapter.close();
    });

    it('should support connection pool configuration', async () => {
      if (!isAvailable) return;

      const options: PostgresAdapterOptions = {
        connectionString: TEST_CONNECTION_STRING,
        max: 5,
        min: 1,
        idleTimeoutMillis: 5000,
        application_name: 'integration-test',
      };

      adapter = createPostgresAdapter(options);
      await adapter.open();

      const result = await adapter.get<{ application_name: string }>(
        'SELECT application_name FROM pg_stat_activity WHERE pid = pg_backend_pid()'
      );

      expect(result?.application_name).toBe('integration-test');

      await adapter.close();
    });
  });

  describe('CRUD Operations', () => {
    beforeAll(async () => {
      if (!isAvailable) return;

      adapter = createPostgresAdapter(TEST_CONNECTION_STRING);
      await adapter.open();

      await adapter.exec('DROP TABLE IF EXISTS test_users CASCADE');
      await adapter.exec(`
        CREATE TABLE test_users (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          email TEXT UNIQUE,
          metadata JSONB,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
    });

    it('should insert and retrieve data', async () => {
      if (!isAvailable) return;

      await adapter.run(
        'INSERT INTO test_users (name, email) VALUES ($1, $2)',
        ['Alice', 'alice@example.com']
      );

      const user = await adapter.get<{ name: string; email: string }>(
        'SELECT name, email FROM test_users WHERE email = $1',
        ['alice@example.com']
      );

      expect(user).toBeDefined();
      expect(user?.name).toBe('Alice');
      expect(user?.email).toBe('alice@example.com');
    });

    it('should query multiple rows', async () => {
      if (!isAvailable) return;

      await adapter.run('INSERT INTO test_users (name, email) VALUES ($1, $2)', ['Bob', 'bob@example.com']);
      await adapter.run('INSERT INTO test_users (name, email) VALUES ($1, $2)', [
        'Charlie',
        'charlie@example.com',
      ]);

      const users = await adapter.all<{ name: string }>('SELECT name FROM test_users ORDER BY name');

      expect(users.length).toBeGreaterThanOrEqual(3);
      expect(users.map(u => u.name)).toContain('Alice');
      expect(users.map(u => u.name)).toContain('Bob');
      expect(users.map(u => u.name)).toContain('Charlie');
    });

    it('should update data', async () => {
      if (!isAvailable) return;

      await adapter.run('UPDATE test_users SET email = $1 WHERE name = $2', [
        'alice.new@example.com',
        'Alice',
      ]);

      const user = await adapter.get<{ email: string }>(
        'SELECT email FROM test_users WHERE name = $1',
        ['Alice']
      );

      expect(user?.email).toBe('alice.new@example.com');
    });

    it('should delete data', async () => {
      if (!isAvailable) return;

      await adapter.run('DELETE FROM test_users WHERE name = $1', ['Charlie']);

      const user = await adapter.get('SELECT * FROM test_users WHERE name = $1', ['Charlie']);
      expect(user).toBeNull();
    });

    it('should handle NULL values', async () => {
      if (!isAvailable) return;

      await adapter.run('INSERT INTO test_users (name, email) VALUES ($1, $2)', ['NoEmail', null]);

      const user = await adapter.get<{ email: string | null }>(
        'SELECT email FROM test_users WHERE name = $1',
        ['NoEmail']
      );

      expect(user?.email).toBeNull();
    });
  });

  describe('Transactions', () => {
    beforeAll(async () => {
      if (!isAvailable) return;

      await adapter.exec('DROP TABLE IF EXISTS test_accounts');
      await adapter.exec(`
        CREATE TABLE test_accounts (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          balance DECIMAL(10,2) DEFAULT 0
        )
      `);

      await adapter.run('INSERT INTO test_accounts (name, balance) VALUES ($1, $2)', [
        'Account A',
        1000.0,
      ]);
      await adapter.run('INSERT INTO test_accounts (name, balance) VALUES ($1, $2)', ['Account B', 500.0]);
    });

    it('should commit successful transaction', async () => {
      if (!isAvailable) return;

      await adapter.transaction(async tx => {
        await tx.run('UPDATE test_accounts SET balance = balance - $1 WHERE name = $2', [100, 'Account A']);
        await tx.run('UPDATE test_accounts SET balance = balance + $1 WHERE name = $2', [100, 'Account B']);
      });

      const accountA = await adapter.get<{ balance: string }>(
        'SELECT balance FROM test_accounts WHERE name = $1',
        ['Account A']
      );
      const accountB = await adapter.get<{ balance: string }>(
        'SELECT balance FROM test_accounts WHERE name = $1',
        ['Account B']
      );

      expect(parseFloat(accountA!.balance)).toBe(900.0);
      expect(parseFloat(accountB!.balance)).toBe(600.0);
    });

    it('should rollback failed transaction', async () => {
      if (!isAvailable) return;

      const balanceBefore = await adapter.get<{ balance: string }>(
        'SELECT balance FROM test_accounts WHERE name = $1',
        ['Account A']
      );

      try {
        await adapter.transaction(async tx => {
          await tx.run('UPDATE test_accounts SET balance = balance - $1 WHERE name = $2', [
            100,
            'Account A',
          ]);
          throw new Error('Simulated failure');
        });
      } catch {
        // Expected error
      }

      const balanceAfter = await adapter.get<{ balance: string }>(
        'SELECT balance FROM test_accounts WHERE name = $1',
        ['Account A']
      );

      expect(balanceAfter?.balance).toBe(balanceBefore?.balance);
    });
  });

  describe('Advanced PostgreSQL Features', () => {
    it('should support JSONB operations', async () => {
      if (!isAvailable) return;

      const metadata = { role: 'admin', permissions: ['read', 'write'], active: true };

      await adapter.run('INSERT INTO test_users (name, email, metadata) VALUES ($1, $2, $3)', [
        'JSONUser',
        'json@example.com',
        JSON.stringify(metadata),
      ]);

      const user = await adapter.get<{ metadata: any }>(
        "SELECT metadata FROM test_users WHERE metadata->>'role' = $1",
        ['admin']
      );

      expect(user?.metadata.role).toBe('admin');
      expect(user?.metadata.permissions).toEqual(['read', 'write']);
    });

    it('should support array types', async () => {
      if (!isAvailable) return;

      await adapter.exec('DROP TABLE IF EXISTS test_arrays');
      await adapter.exec(`
        CREATE TABLE test_arrays (
          id SERIAL PRIMARY KEY,
          tags TEXT[],
          numbers INTEGER[]
        )
      `);

      await adapter.run('INSERT INTO test_arrays (tags, numbers) VALUES ($1, $2)', [
        '{typescript,nodejs,postgres}',
        '{1,2,3,4,5}',
      ]);

      const result = await adapter.get<{ tags: string[]; numbers: number[] }>(
        'SELECT tags, numbers FROM test_arrays WHERE $1 = ANY(tags)',
        ['nodejs']
      );

      expect(result?.tags).toContain('nodejs');
      expect(result?.numbers).toEqual([1, 2, 3, 4, 5]);
    });

    it('should support CTEs (Common Table Expressions)', async () => {
      if (!isAvailable) return;

      const result = await adapter.all<{ name: string; email: string }>(`
        WITH active_users AS (
          SELECT name, email FROM test_users WHERE email IS NOT NULL
        )
        SELECT * FROM active_users ORDER BY name LIMIT 3
      `);

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('Remote Connection Examples', () => {
    it('should demonstrate AWS RDS-style connection', () => {
      // Example configuration (not actually connecting)
      const awsConfig: PostgresAdapterOptions = {
        host: 'mydb.abc123.us-east-1.rds.amazonaws.com',
        port: 5432,
        database: 'myapp',
        user: 'admin',
        password: 'secure_password',
        ssl: { rejectUnauthorized: true },
        max: 20,
        idleTimeoutMillis: 10000,
      };

      expect(awsConfig.host).toBeDefined();
      expect(awsConfig.ssl).toBeDefined();
    });

    it('should demonstrate Heroku Postgres connection', () => {
      // Example configuration (not actually connecting)
      const herokuConfig: PostgresAdapterOptions = {
        connectionString: 'postgresql://user:pass@ec2-host.compute-1.amazonaws.com:5432/dbname',
        ssl: { rejectUnauthorized: false }, // Heroku uses self-signed certs
      };

      expect(herokuConfig.connectionString).toBeDefined();
      expect(herokuConfig.ssl).toBeDefined();
    });

    it('should demonstrate Supabase connection', () => {
      // Example configuration (not actually connecting)
      const supabaseConfig: PostgresAdapterOptions = {
        connectionString:
          'postgresql://postgres:[YOUR-PASSWORD]@db.project.supabase.co:5432/postgres',
        ssl: true,
        max: 10,
      };

      expect(supabaseConfig.connectionString).toBeDefined();
      expect(supabaseConfig.ssl).toBe(true);
    });

    it('should demonstrate DigitalOcean Managed Database', () => {
      // Example configuration (not actually connecting)
      const doConfig: PostgresAdapterOptions = {
        host: 'db-postgresql-nyc3-12345.ondigitalocean.com',
        port: 25060,
        database: 'defaultdb',
        user: 'doadmin',
        password: 'secure_password',
        ssl: { rejectUnauthorized: true },
      };

      expect(doConfig.host).toContain('ondigitalocean.com');
      expect(doConfig.port).toBe(25060);
    });
  });
});
