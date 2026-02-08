/**
 * SQLite storage for stimulus feed data (tips + news articles).
 *
 * Uses better-sqlite3 for synchronous SQLite operations.
 * Data is stored locally on the server, not decentralized.
 */

import Database from 'better-sqlite3';
import path from 'path';
import { existsSync, mkdirSync } from 'fs';

// ============================================================================
// Types
// ============================================================================

export interface StimulusItem {
  id: string;
  type: 'tip' | 'news';
  source: string; // e.g., 'hackernews', 'arxiv', 'user_tip'
  title: string;
  content: string;
  url?: string;
  contentHash: string;
  priority: 'low' | 'normal' | 'high' | 'breaking';
  categories: string[];
  metadata: Record<string, unknown>;
  createdAt: string;
  publishedAt?: string;
}

export interface StimulusQuery {
  type?: 'tip' | 'news';
  source?: string;
  priority?: string;
  limit?: number;
  offset?: number;
  since?: string; // ISO date string
}

// ============================================================================
// Database singleton
// ============================================================================

let db: Database.Database | null = null;

function getDbPath(): string {
  // Store in app data directory
  const dataDir = process.env.STIMULUS_DB_PATH || path.join(process.cwd(), 'data');
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true });
  }
  return path.join(dataDir, 'stimulus.sqlite');
}

export function getDb(): Database.Database {
  if (!db) {
    const dbPath = getDbPath();
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    initSchema(db);
  }
  return db;
}

function initSchema(database: Database.Database): void {
  database.exec(`
    -- Stimulus items (tips + news articles)
    CREATE TABLE IF NOT EXISTS stimulus_items (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL CHECK(type IN ('tip', 'news')),
      source TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      url TEXT,
      content_hash TEXT NOT NULL UNIQUE,
      priority TEXT NOT NULL DEFAULT 'normal' CHECK(priority IN ('low', 'normal', 'high', 'breaking')),
      categories TEXT NOT NULL DEFAULT '[]',
      metadata TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      published_at TEXT
    );

    -- Index for common queries
    CREATE INDEX IF NOT EXISTS idx_stimulus_type ON stimulus_items(type);
    CREATE INDEX IF NOT EXISTS idx_stimulus_source ON stimulus_items(source);
    CREATE INDEX IF NOT EXISTS idx_stimulus_created ON stimulus_items(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_stimulus_priority ON stimulus_items(priority);
    CREATE INDEX IF NOT EXISTS idx_stimulus_hash ON stimulus_items(content_hash);

    -- Ingestion state (track last poll times)
    CREATE TABLE IF NOT EXISTS ingestion_state (
      source TEXT PRIMARY KEY,
      last_poll_at TEXT NOT NULL,
      last_item_id TEXT,
      poll_count INTEGER NOT NULL DEFAULT 0,
      error_count INTEGER NOT NULL DEFAULT 0,
      last_error TEXT
    );

    -- Config for polling intervals (can be modified at runtime)
    CREATE TABLE IF NOT EXISTS stimulus_config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Insert default config if not exists
  const insertConfig = database.prepare(`
    INSERT OR IGNORE INTO stimulus_config (key, value) VALUES (?, ?)
  `);

  insertConfig.run('poll_interval_ms', process.env.STIMULUS_POLL_INTERVAL_MS || '900000'); // 15 min default
  insertConfig.run('hackernews_enabled', 'true');
  insertConfig.run('arxiv_enabled', 'true');
  insertConfig.run('max_items_per_poll', '25');
}

// ============================================================================
// CRUD Operations
// ============================================================================

export function insertStimulusItem(item: Omit<StimulusItem, 'createdAt'>): StimulusItem | null {
  const db = getDb();

  // Check for duplicate
  const existing = db.prepare('SELECT id FROM stimulus_items WHERE content_hash = ?').get(item.contentHash);
  if (existing) {
    return null; // Duplicate
  }

  const id = item.id || `stim-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const createdAt = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO stimulus_items (id, type, source, title, content, url, content_hash, priority, categories, metadata, created_at, published_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    item.type,
    item.source,
    item.title,
    item.content,
    item.url || null,
    item.contentHash,
    item.priority,
    JSON.stringify(item.categories),
    JSON.stringify(item.metadata),
    createdAt,
    item.publishedAt || null
  );

  return { ...item, id, createdAt };
}

export function getStimulusItems(query: StimulusQuery = {}): StimulusItem[] {
  const db = getDb();

  let sql = 'SELECT * FROM stimulus_items WHERE 1=1';
  const params: unknown[] = [];

  if (query.type) {
    sql += ' AND type = ?';
    params.push(query.type);
  }

  if (query.source) {
    sql += ' AND source = ?';
    params.push(query.source);
  }

  if (query.priority) {
    sql += ' AND priority = ?';
    params.push(query.priority);
  }

  if (query.since) {
    sql += ' AND created_at > ?';
    params.push(query.since);
  }

  sql += ' ORDER BY created_at DESC';

  if (query.limit) {
    sql += ' LIMIT ?';
    params.push(query.limit);
  }

  if (query.offset) {
    sql += ' OFFSET ?';
    params.push(query.offset);
  }

  const rows = db.prepare(sql).all(...params) as Array<{
    id: string;
    type: 'tip' | 'news';
    source: string;
    title: string;
    content: string;
    url: string | null;
    content_hash: string;
    priority: 'low' | 'normal' | 'high' | 'breaking';
    categories: string;
    metadata: string;
    created_at: string;
    published_at: string | null;
  }>;

  return rows.map((row) => ({
    id: row.id,
    type: row.type,
    source: row.source,
    title: row.title,
    content: row.content,
    url: row.url || undefined,
    contentHash: row.content_hash,
    priority: row.priority,
    categories: JSON.parse(row.categories),
    metadata: JSON.parse(row.metadata),
    createdAt: row.created_at,
    publishedAt: row.published_at || undefined,
  }));
}

export function getStimulusItemCount(query: StimulusQuery = {}): number {
  const db = getDb();

  let sql = 'SELECT COUNT(*) as count FROM stimulus_items WHERE 1=1';
  const params: unknown[] = [];

  if (query.type) {
    sql += ' AND type = ?';
    params.push(query.type);
  }

  if (query.source) {
    sql += ' AND source = ?';
    params.push(query.source);
  }

  const result = db.prepare(sql).get(...params) as { count: number };
  return result.count;
}

// ============================================================================
// Ingestion State
// ============================================================================

export function updateIngestionState(source: string, lastItemId?: string, error?: string): void {
  const db = getDb();

  if (error) {
    db.prepare(`
      INSERT INTO ingestion_state (source, last_poll_at, last_item_id, poll_count, error_count, last_error)
      VALUES (?, datetime('now'), ?, 1, 1, ?)
      ON CONFLICT(source) DO UPDATE SET
        last_poll_at = datetime('now'),
        poll_count = poll_count + 1,
        error_count = error_count + 1,
        last_error = ?
    `).run(source, lastItemId || null, error, error);
  } else {
    db.prepare(`
      INSERT INTO ingestion_state (source, last_poll_at, last_item_id, poll_count, error_count)
      VALUES (?, datetime('now'), ?, 1, 0)
      ON CONFLICT(source) DO UPDATE SET
        last_poll_at = datetime('now'),
        last_item_id = COALESCE(?, last_item_id),
        poll_count = poll_count + 1,
        last_error = NULL
    `).run(source, lastItemId || null, lastItemId || null);
  }
}

export function getIngestionState(source: string): { lastPollAt: string; lastItemId?: string; pollCount: number } | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM ingestion_state WHERE source = ?').get(source) as {
    last_poll_at: string;
    last_item_id: string | null;
    poll_count: number;
  } | undefined;

  if (!row) return null;

  return {
    lastPollAt: row.last_poll_at,
    lastItemId: row.last_item_id || undefined,
    pollCount: row.poll_count,
  };
}

// ============================================================================
// Config
// ============================================================================

export function getConfig(key: string): string | null {
  // Allow environment variables to override DB-stored config for simple deploy toggles.
  // DB remains the canonical runtime store; env overrides are primarily for ops/E2E.
  const envOverride = (() => {
    switch (key) {
      case 'poll_interval_ms':
        return process.env.STIMULUS_POLL_INTERVAL_MS;
      case 'max_items_per_poll':
        return process.env.STIMULUS_MAX_ITEMS_PER_POLL;
      case 'hackernews_enabled':
        return process.env.STIMULUS_HACKERNEWS_ENABLED;
      case 'arxiv_enabled':
        return process.env.STIMULUS_ARXIV_ENABLED;
      default:
        return undefined;
    }
  })();

  if (typeof envOverride === 'string' && envOverride.trim() !== '') {
    return envOverride.trim();
  }

  const db = getDb();
  const row = db.prepare('SELECT value FROM stimulus_config WHERE key = ?').get(key) as { value: string } | undefined;
  return row?.value || null;
}

export function setConfig(key: string, value: string): void {
  const db = getDb();
  db.prepare(`
    INSERT INTO stimulus_config (key, value, updated_at)
    VALUES (?, ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = datetime('now')
  `).run(key, value, value);
}

export function getAllConfig(): Record<string, string> {
  const db = getDb();
  const rows = db.prepare('SELECT key, value FROM stimulus_config').all() as Array<{ key: string; value: string }>;
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}
