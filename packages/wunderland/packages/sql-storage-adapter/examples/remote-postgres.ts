/**
 * Remote PostgreSQL Connection Example
 * 
 * This example demonstrates connecting to a remote PostgreSQL database
 * with the same API as local SQLite databases.
 */

import { createDatabase, connectDatabase, openDatabase } from '@framers/sql-storage-adapter';
import type { StorageAdapter } from '@framers/sql-storage-adapter';

// Environment configuration
const DATABASE_URL = process.env.DATABASE_URL || 
  'postgresql://postgres:postgres@localhost:5432/postgres';

/**
 * Example 1: Basic Remote Connection
 */
async function basicConnection() {
  console.log('\n=== Example 1: Basic Remote Connection ===\n');

  // Connect to remote PostgreSQL - auto-detects from DATABASE_URL
  const db = await createDatabase();
  await db.open();

  console.log('✅ Connected to PostgreSQL');
  console.log('Adapter:', db.kind);
  console.log('Capabilities:', Array.from(db.capabilities));

  // Test query
  const result = await db.get<{ version: string }>('SELECT version() as version');
  console.log('\nPostgreSQL version:', result?.version.split('\n')[0]);

  await db.close();
  console.log('✅ Connection closed');
}

/**
 * Example 2: Cloud Provider Connection (Supabase, AWS RDS, etc.)
 */
async function cloudProviderConnection() {
  console.log('\n=== Example 2: Cloud Provider Connection ===\n');

  const db = await createDatabase({
    // These would come from your cloud provider dashboard
    postgres: {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'postgres',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      
      // Security for production
      ssl: process.env.NODE_ENV === 'production',
      
      // Performance tuning
      max: 20,                      // Connection pool size
      idleTimeoutMillis: 10000,
      statement_timeout: 30000,     // 30 second query timeout
      
      // Monitoring
      application_name: 'my-app-v1.0'
    }
  });

  await db.open();
  console.log('✅ Connected to cloud database');

  // Create and query data
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.run(
    'INSERT INTO users (name, email) VALUES ($1, $2) ON CONFLICT (email) DO NOTHING',
    ['Alice', 'alice@example.com']
  );

  const users = await db.all<{ id: number; name: string; email: string }>(
    'SELECT id, name, email FROM users LIMIT 5'
  );
  
  console.log('\nUsers:', users);

  await db.close();
}

/**
 * Example 3: Same Code, Different Databases
 * Demonstrates the power of the adapter pattern
 */
async function sameCodeDifferentDatabases() {
  console.log('\n=== Example 3: Same Code, Different Databases ===\n');

  // This function works with ANY adapter
  async function getUserCount(db: StorageAdapter): Promise<number> {
    // Ensure table exists
    await db.exec(`
      CREATE TABLE IF NOT EXISTS app_users (
        id INTEGER PRIMARY KEY ${db.kind === 'postgres' ? 'GENERATED ALWAYS AS IDENTITY' : 'AUTOINCREMENT'},
        username TEXT NOT NULL
      )
    `);

    const result = await db.get<{ count: number }>(
      'SELECT COUNT(*) as count FROM app_users'
    );
    
    return result?.count || 0;
  }

  // Test with local SQLite (in-memory)
  console.log('Testing with local SQLite...');
  const localDb = await createDatabase({ type: 'memory' });
  await localDb.open();
  const localCount = await getUserCount(localDb);
  console.log(`Local SQLite user count: ${localCount}`);
  await localDb.close();

  // Test with remote PostgreSQL
  console.log('\nTesting with remote PostgreSQL...');
  const remoteDb = await createDatabase({ url: DATABASE_URL });
  await remoteDb.open();
  const remoteCount = await getUserCount(remoteDb);
  console.log(`Remote PostgreSQL user count: ${remoteCount}`);
  await remoteDb.close();

  console.log('\n✅ Same code works everywhere!');
}

/**
 * Example 4: Connection Pooling & Concurrency
 */
async function connectionPoolingExample() {
  console.log('\n=== Example 4: Connection Pooling & Concurrency ===\n');

  const db = await createDatabase({
    url: DATABASE_URL,
    postgres: {
      max: 10,  // Allow up to 10 concurrent connections
      min: 2    // Keep 2 connections warm
    }
  });

  await db.open();

  // Create test table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      price DECIMAL(10, 2)
    )
  `);

  console.log('Running 20 concurrent inserts...');

  // Run multiple queries concurrently
  // Connection pool automatically manages connections
  const startTime = Date.now();
  
  const promises = [];
  for (let i = 1; i <= 20; i++) {
    promises.push(
      db.run(
        'INSERT INTO products (name, price) VALUES ($1, $2)',
        [`Product ${i}`, (Math.random() * 100).toFixed(2)]
      )
    );
  }

  await Promise.all(promises);
  
  const duration = Date.now() - startTime;
  console.log(`✅ Completed 20 inserts in ${duration}ms`);

  const count = await db.get<{ count: number }>('SELECT COUNT(*) as count FROM products');
  console.log(`Total products: ${count?.count}`);

  // Clean up
  await db.run('DELETE FROM products');
  await db.close();
}

/**
 * Example 5: Error Handling & Retries
 */
async function errorHandlingExample() {
  console.log('\n=== Example 5: Error Handling & Retries ===\n');

  async function connectWithRetry(maxRetries = 3): Promise<StorageAdapter> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Attempt ${attempt} to connect...`);
        const db = await createDatabase({ url: DATABASE_URL });
        await db.open();
        console.log('✅ Connected successfully');
        return db;
      } catch (error) {
        console.error(`❌ Attempt ${attempt} failed:`, (error as Error).message);

        if (attempt === maxRetries) {
          throw new Error('Failed to connect after max retries');
        }

        // Exponential backoff
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw new Error('Connection failed');
  }

  try {
    const db = await connectWithRetry();

    // Use database...
    const result = await db.get<{ one: number }>('SELECT 1 as one');
    console.log('Query result:', result);

    await db.close();
  } catch (error) {
    console.error('Fatal connection error:', error);
  }
}

/**
 * Example 6: Health Monitoring
 */
async function healthMonitoringExample() {
  console.log('\n=== Example 6: Health Monitoring ===\n');

  const db = await createDatabase({
    url: DATABASE_URL,
    postgres: {
      application_name: 'health-check-example',
      statement_timeout: 5000  // 5 second timeout
    }
  });

  await db.open();

  // Health check function
  async function checkHealth(): Promise<{
    status: string;
    latency: number;
    timestamp: string;
  }> {
    const start = Date.now();
    
    try {
      const result = await db.get<{ now: string }>('SELECT NOW() as now');
      const latency = Date.now() - start;

      return {
        status: 'healthy',
        latency,
        timestamp: result?.now || new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        latency: Date.now() - start,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Run health check
  const health = await checkHealth();
  console.log('Database health:', health);
  console.log(`Latency: ${health.latency}ms`);

  await db.close();
}

/**
 * Main function - run all examples
 */
async function main() {
  console.log('🚀 Remote PostgreSQL Connection Examples');
  console.log('========================================');
  
  console.log('\nUsing DATABASE_URL:', DATABASE_URL.replace(/:[^:@]+@/, ':****@'));

  try {
    await basicConnection();
    await cloudProviderConnection();
    await sameCodeDifferentDatabases();
    await connectionPoolingExample();
    await errorHandlingExample();
    await healthMonitoringExample();

    console.log('\n✅ All examples completed successfully!\n');
  } catch (error) {
    console.error('\n❌ Error running examples:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

// Export for use in other files
export {
  basicConnection,
  cloudProviderConnection,
  sameCodeDifferentDatabases,
  connectionPoolingExample,
  errorHandlingExample,
  healthMonitoringExample
};
