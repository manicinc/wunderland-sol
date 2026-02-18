/**
 * SQL schema for Quarry Codex highlights, bookmarks, and groupings
 * @module codex/lib/highlightsSchema
 *
 * @remarks
 * - Supports IndexedDB, sql.js, and better-sqlite3 adapters
 * - Uses FTS5 for full-text search (falls back gracefully if unavailable)
 * - All timestamps stored as ISO 8601 strings
 */

export const HIGHLIGHTS_SCHEMA = `
  -- =====================================================
  -- Main highlights table
  -- =====================================================
  CREATE TABLE IF NOT EXISTS highlights (
    id TEXT PRIMARY KEY,
    file_path TEXT NOT NULL,
    content TEXT NOT NULL,
    selection_type TEXT CHECK(selection_type IN ('text', 'block')) NOT NULL,
    start_offset INTEGER,
    end_offset INTEGER,
    block_id TEXT,
    color TEXT DEFAULT 'yellow',
    category_tag TEXT,
    user_notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    group_id TEXT,
    FOREIGN KEY (group_id) REFERENCES highlight_groups(id) ON DELETE SET NULL
  );

  -- =====================================================
  -- Bookmarks table (migrated from localStorage)
  -- =====================================================
  CREATE TABLE IF NOT EXISTS bookmarks (
    id TEXT PRIMARY KEY,
    path TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    notes TEXT,
    added_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    group_id TEXT,
    FOREIGN KEY (group_id) REFERENCES highlight_groups(id) ON DELETE SET NULL
  );

  -- =====================================================
  -- Reading history table (migrated from localStorage)
  -- =====================================================
  CREATE TABLE IF NOT EXISTS history (
    id TEXT PRIMARY KEY,
    path TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    view_count INTEGER DEFAULT 1,
    viewed_at TEXT NOT NULL,
    first_viewed_at TEXT NOT NULL
  );

  -- =====================================================
  -- Groupings table (supports both highlights and bookmarks)
  -- =====================================================
  CREATE TABLE IF NOT EXISTS highlight_groups (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    type TEXT CHECK(type IN ('default', 'custom')) NOT NULL,
    weave_path TEXT,
    loom_path TEXT,
    color TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    is_editable INTEGER DEFAULT 1,
    display_order INTEGER DEFAULT 0
  );

  -- =====================================================
  -- Highlight connections/links table
  -- =====================================================
  CREATE TABLE IF NOT EXISTS highlight_connections (
    id TEXT PRIMARY KEY,
    source_highlight_id TEXT NOT NULL,
    target_highlight_id TEXT NOT NULL,
    connection_type TEXT CHECK(connection_type IN ('auto', 'manual')) NOT NULL,
    similarity_score REAL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (source_highlight_id) REFERENCES highlights(id) ON DELETE CASCADE,
    FOREIGN KEY (target_highlight_id) REFERENCES highlights(id) ON DELETE CASCADE,
    UNIQUE(source_highlight_id, target_highlight_id)
  );

  -- =====================================================
  -- Performance indexes
  -- =====================================================

  -- Highlights indexes
  CREATE INDEX IF NOT EXISTS idx_highlights_file_path ON highlights(file_path);
  CREATE INDEX IF NOT EXISTS idx_highlights_group_id ON highlights(group_id);
  CREATE INDEX IF NOT EXISTS idx_highlights_created_at ON highlights(created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_highlights_color ON highlights(color);
  CREATE INDEX IF NOT EXISTS idx_highlights_category ON highlights(category_tag);
  CREATE INDEX IF NOT EXISTS idx_highlights_selection_type ON highlights(selection_type);

  -- Bookmarks indexes
  CREATE INDEX IF NOT EXISTS idx_bookmarks_group_id ON bookmarks(group_id);
  CREATE INDEX IF NOT EXISTS idx_bookmarks_added_at ON bookmarks(added_at DESC);
  CREATE INDEX IF NOT EXISTS idx_bookmarks_path ON bookmarks(path);

  -- History indexes
  CREATE INDEX IF NOT EXISTS idx_history_viewed_at ON history(viewed_at DESC);
  CREATE INDEX IF NOT EXISTS idx_history_view_count ON history(view_count DESC);

  -- Groups indexes
  CREATE INDEX IF NOT EXISTS idx_groups_type ON highlight_groups(type);
  CREATE INDEX IF NOT EXISTS idx_groups_weave ON highlight_groups(weave_path);
  CREATE INDEX IF NOT EXISTS idx_groups_loom ON highlight_groups(loom_path);
  CREATE INDEX IF NOT EXISTS idx_groups_display_order ON highlight_groups(display_order);

  -- Connections indexes
  CREATE INDEX IF NOT EXISTS idx_connections_source ON highlight_connections(source_highlight_id);
  CREATE INDEX IF NOT EXISTS idx_connections_target ON highlight_connections(target_highlight_id);
  CREATE INDEX IF NOT EXISTS idx_connections_type ON highlight_connections(connection_type);
`;

/**
 * FTS5 full-text search schema
 * This is applied separately to gracefully handle adapters without FTS5 support
 */
export const FTS_SCHEMA = `
  -- =====================================================
  -- Full-text search virtual tables (FTS5)
  -- =====================================================

  -- Highlights full-text search
  CREATE VIRTUAL TABLE IF NOT EXISTS highlights_fts USING fts5(
    id UNINDEXED,
    content,
    user_notes,
    category_tag,
    tokenize = 'porter unicode61'
  );

  -- Bookmarks full-text search
  CREATE VIRTUAL TABLE IF NOT EXISTS bookmarks_fts USING fts5(
    id UNINDEXED,
    title,
    notes,
    tokenize = 'porter unicode61'
  );

  -- =====================================================
  -- Triggers to keep FTS tables in sync
  -- =====================================================

  -- Highlight FTS triggers
  CREATE TRIGGER IF NOT EXISTS highlights_fts_insert AFTER INSERT ON highlights BEGIN
    INSERT INTO highlights_fts(id, content, user_notes, category_tag)
    VALUES (new.id, new.content, new.user_notes, new.category_tag);
  END;

  CREATE TRIGGER IF NOT EXISTS highlights_fts_update AFTER UPDATE ON highlights BEGIN
    UPDATE highlights_fts
    SET content = new.content,
        user_notes = new.user_notes,
        category_tag = new.category_tag
    WHERE id = new.id;
  END;

  CREATE TRIGGER IF NOT EXISTS highlights_fts_delete AFTER DELETE ON highlights BEGIN
    DELETE FROM highlights_fts WHERE id = old.id;
  END;

  -- Bookmark FTS triggers
  CREATE TRIGGER IF NOT EXISTS bookmarks_fts_insert AFTER INSERT ON bookmarks BEGIN
    INSERT INTO bookmarks_fts(id, title, notes)
    VALUES (new.id, new.title, new.notes);
  END;

  CREATE TRIGGER IF NOT EXISTS bookmarks_fts_update AFTER UPDATE ON bookmarks BEGIN
    UPDATE bookmarks_fts
    SET title = new.title,
        notes = new.notes
    WHERE id = new.id;
  END;

  CREATE TRIGGER IF NOT EXISTS bookmarks_fts_delete AFTER DELETE ON bookmarks BEGIN
    DELETE FROM bookmarks_fts WHERE id = old.id;
  END;
`;

/**
 * Metadata table for tracking schema version and migration status
 */
export const METADATA_SCHEMA = `
  CREATE TABLE IF NOT EXISTS highlights_metadata (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`;

export const SCHEMA_VERSION = '1.0.0';
