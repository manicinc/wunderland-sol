/**
 * SQLite Integration for FABRIC Mobile
 * Uses @capacitor-community/sqlite for native SQLite access
 */

import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';
import { Capacitor } from '@capacitor/core';

const DB_NAME = 'fabric_data';

let sqliteConnection: SQLiteConnection | null = null;
let db: SQLiteDBConnection | null = null;

/**
 * Initialize SQLite database connection
 */
export async function initializeSqlite(): Promise<void> {
  const platform = Capacitor.getPlatform();

  sqliteConnection = new SQLiteConnection(CapacitorSQLite);

  // For web platform, we need to use web worker
  if (platform === 'web') {
    await sqliteConnection.initWebStore();
  }

  // Check if database exists
  const dbExists = await sqliteConnection.isDatabase(DB_NAME);

  // Create or open database
  db = await sqliteConnection.createConnection(
    DB_NAME,
    false,
    'no-encryption',
    1,
    false
  );

  await db.open();

  // Run migrations if new database
  if (!dbExists.result) {
    await runMigrations(db);
  }

  console.log('[SQLite] Database initialized');
}

/**
 * Run database migrations
 */
async function runMigrations(database: SQLiteDBConnection): Promise<void> {
  const migrations = `
    -- Strands table (atomic knowledge units)
    CREATE TABLE IF NOT EXISTS strands (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      loom_id TEXT,
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER DEFAULT (strftime('%s', 'now')),
      embedding BLOB,
      metadata TEXT
    );

    -- Looms table (collections of strands)
    CREATE TABLE IF NOT EXISTS looms (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      weave_id TEXT,
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER DEFAULT (strftime('%s', 'now'))
    );

    -- Weaves table (domains)
    CREATE TABLE IF NOT EXISTS weaves (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      created_at INTEGER DEFAULT (strftime('%s', 'now'))
    );

    -- Bookmarks
    CREATE TABLE IF NOT EXISTS bookmarks (
      id TEXT PRIMARY KEY,
      strand_id TEXT NOT NULL,
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      FOREIGN KEY (strand_id) REFERENCES strands(id) ON DELETE CASCADE
    );

    -- Learning progress
    CREATE TABLE IF NOT EXISTS progress (
      strand_id TEXT PRIMARY KEY,
      mastery_level REAL DEFAULT 0,
      last_reviewed INTEGER,
      review_count INTEGER DEFAULT 0,
      next_review INTEGER,
      FOREIGN KEY (strand_id) REFERENCES strands(id) ON DELETE CASCADE
    );

    -- ML model cache
    CREATE TABLE IF NOT EXISTS model_cache (
      id TEXT PRIMARY KEY,
      model_name TEXT NOT NULL,
      data BLOB NOT NULL,
      created_at INTEGER DEFAULT (strftime('%s', 'now'))
    );

    -- Sync metadata
    CREATE TABLE IF NOT EXISTS sync_meta (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_strands_loom ON strands(loom_id);
    CREATE INDEX IF NOT EXISTS idx_looms_weave ON looms(weave_id);
    CREATE INDEX IF NOT EXISTS idx_bookmarks_strand ON bookmarks(strand_id);
    CREATE INDEX IF NOT EXISTS idx_progress_next_review ON progress(next_review);
  `;

  await database.execute(migrations);
  console.log('[SQLite] Migrations complete');
}

/**
 * Get database connection
 */
export function getDatabase(): SQLiteDBConnection | null {
  return db;
}

/**
 * Execute a query and return results
 */
export async function query<T = any>(sql: string, values?: any[]): Promise<T[]> {
  if (!db) throw new Error('Database not initialized');
  const result = await db.query(sql, values);
  return (result.values || []) as T[];
}

/**
 * Execute a statement (INSERT, UPDATE, DELETE)
 */
export async function execute(sql: string, values?: any[]): Promise<{ changes: number; lastId: number }> {
  if (!db) throw new Error('Database not initialized');
  const result = await db.run(sql, values);
  return {
    changes: result.changes?.changes || 0,
    lastId: result.changes?.lastId || 0,
  };
}

/**
 * Close database connection
 */
export async function closeSqlite(): Promise<void> {
  if (db) {
    await db.close();
    db = null;
  }
  if (sqliteConnection) {
    await sqliteConnection.closeConnection(DB_NAME, false);
    sqliteConnection = null;
  }
}

/**
 * Save sync timestamp
 */
export async function setSyncTimestamp(key: string, timestamp: number): Promise<void> {
  await execute(
    'INSERT OR REPLACE INTO sync_meta (key, value) VALUES (?, ?)',
    [key, timestamp.toString()]
  );
}

/**
 * Get sync timestamp
 */
export async function getSyncTimestamp(key: string): Promise<number | null> {
  const result = await query<{ value: string }>('SELECT value FROM sync_meta WHERE key = ?', [key]);
  return result.length > 0 ? parseInt(result[0].value, 10) : null;
}
