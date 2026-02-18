/**
 * Local Storage Adapter
 * @module lib/storage/adapters/LocalStorageAdapter
 *
 * Primary storage adapter using @framers/sql-storage-adapter.
 * Supports SQLite (Electron), IndexedDB (browser), and memory (testing).
 *
 * Features:
 * - Full SQL support via sql.js or better-sqlite3
 * - Automatic adapter selection based on environment
 * - Schema migrations
 * - Transactional operations
 */

import type {
    StorageAdapter,
    StorableStrand,
    StorableCollection,
    StorableDraft,
    StorableBookmark,
    StorablePreferences,
    StorableBlockTagsCache,
    StorableEntity,
    EntitySyncStatus,
    LocalStorageConfig,
} from '../types'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Database instance type from sql-storage-adapter
 * We use a loose type to avoid import issues in static builds
 */
interface DatabaseInstance {
    exec(sql: string): Promise<void>
    run(sql: string, params?: unknown[]): Promise<{ changes: number; lastInsertRowid?: number }>
    all<T = unknown>(sql: string, params?: unknown[]): Promise<T[]>
    get<T = unknown>(sql: string, params?: unknown[]): Promise<T | undefined>
    close(): Promise<void>
}

// ============================================================================
// SCHEMA
// ============================================================================

const SCHEMA_VERSION = 2

const CREATE_TABLES_SQL = `
-- Strands table
CREATE TABLE IF NOT EXISTS strands (
  id TEXT PRIMARY KEY,
  path TEXT UNIQUE NOT NULL,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  frontmatter TEXT,
  weave TEXT NOT NULL,
  loom TEXT,
  word_count INTEGER,
  summary TEXT,
  github_url TEXT,
  github_sha TEXT,
  sync_status TEXT DEFAULT 'local-only',
  content_hash TEXT,
  version INTEGER DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_strands_weave ON strands(weave);
CREATE INDEX IF NOT EXISTS idx_strands_loom ON strands(loom);
CREATE INDEX IF NOT EXISTS idx_strands_sync_status ON strands(sync_status);

-- Collections table
CREATE TABLE IF NOT EXISTS collections (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  color TEXT,
  strand_paths TEXT,
  view_mode TEXT DEFAULT 'cards',
  pinned INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  positions TEXT,
  sync_status TEXT DEFAULT 'local-only',
  content_hash TEXT,
  version INTEGER DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_collections_pinned ON collections(pinned);

-- Drafts table
CREATE TABLE IF NOT EXISTS drafts (
  id TEXT PRIMARY KEY,
  strand_path TEXT,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  frontmatter TEXT,
  is_new INTEGER DEFAULT 1,
  target_weave TEXT,
  target_loom TEXT,
  parent_version TEXT,
  last_auto_save TEXT,
  sync_status TEXT DEFAULT 'local-only',
  content_hash TEXT,
  version INTEGER DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Bookmarks table
CREATE TABLE IF NOT EXISTS bookmarks (
  id TEXT PRIMARY KEY,
  strand_path TEXT UNIQUE NOT NULL,
  note TEXT,
  tags TEXT,
  scroll_position INTEGER,
  sync_status TEXT DEFAULT 'local-only',
  content_hash TEXT,
  version INTEGER DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Preferences table (single row)
CREATE TABLE IF NOT EXISTS preferences (
  id TEXT PRIMARY KEY DEFAULT 'user-preferences',
  theme TEXT,
  sidebar_collapsed INTEGER,
  right_panel_collapsed INTEGER,
  font_size INTEGER,
  last_strand_path TEXT,
  recent_strands TEXT,
  custom TEXT,
  sync_status TEXT DEFAULT 'local-only',
  content_hash TEXT,
  version INTEGER DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Block tags cache table
CREATE TABLE IF NOT EXISTS block_tags_cache (
  id TEXT PRIMARY KEY,
  strand_path TEXT UNIQUE NOT NULL,
  blocks TEXT NOT NULL,
  strand_content_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  sync_status TEXT DEFAULT 'local-only',
  content_hash TEXT,
  version INTEGER DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_block_tags_cache_strand ON block_tags_cache(strand_path);
CREATE INDEX IF NOT EXISTS idx_block_tags_cache_expires ON block_tags_cache(expires_at);

-- Schema version
CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER PRIMARY KEY
);

INSERT OR IGNORE INTO schema_version (version) VALUES (${SCHEMA_VERSION});
`

// ============================================================================
// LOCAL STORAGE ADAPTER
// ============================================================================

export class LocalStorageAdapter implements StorageAdapter {
    readonly name = 'LocalStorage'
    readonly canWrite = true

    private db: DatabaseInstance | null = null
    private config: LocalStorageConfig
    private initialized = false

    constructor(config: LocalStorageConfig = {}) {
        this.config = {
            dbName: config.dbName || 'quarry-storage',
            autoSaveInterval: config.autoSaveInterval || 5000,
            performanceTier: config.performanceTier || 'balanced',
        }
    }

    // ==========================================================================
    // LIFECYCLE
    // ==========================================================================

    async initialize(): Promise<void> {
        if (this.initialized) return

        try {
            // Dynamic import to avoid issues with static builds
            const { createDatabase } = await import('@framers/sql-storage-adapter')

            this.db = await createDatabase({
                priority: ['indexeddb', 'sqljs'],
            }) as DatabaseInstance

            // Create schema
            await this.db.exec(CREATE_TABLES_SQL)

            this.initialized = true
            console.log('[LocalStorageAdapter] Initialized with', this.config.dbName)
        } catch (error) {
            console.error('[LocalStorageAdapter] Failed to initialize:', error)
            throw error
        }
    }

    async close(): Promise<void> {
        if (this.db) {
            await this.db.close()
            this.db = null
            this.initialized = false
        }
    }

    private ensureDb(): DatabaseInstance {
        if (!this.db) {
            throw new Error('LocalStorageAdapter not initialized. Call initialize() first.')
        }
        return this.db
    }

    // ==========================================================================
    // STRAND OPERATIONS
    // ==========================================================================

    async getStrand(path: string): Promise<StorableStrand | null> {
        const db = this.ensureDb()
        const row = await db.get<Record<string, unknown>>(
            'SELECT * FROM strands WHERE path = ?',
            [path]
        )
        return row ? this.rowToStrand(row) : null
    }

    async getAllStrands(): Promise<StorableStrand[]> {
        const db = this.ensureDb()
        const rows = await db.all<Record<string, unknown>>('SELECT * FROM strands ORDER BY title')
        return rows.map(r => this.rowToStrand(r))
    }

    async getStrandsByWeave(weave: string): Promise<StorableStrand[]> {
        const db = this.ensureDb()
        const rows = await db.all<Record<string, unknown>>(
            'SELECT * FROM strands WHERE weave = ? ORDER BY title',
            [weave]
        )
        return rows.map(r => this.rowToStrand(r))
    }

    async getStrandsByLoom(loom: string): Promise<StorableStrand[]> {
        const db = this.ensureDb()
        const rows = await db.all<Record<string, unknown>>(
            'SELECT * FROM strands WHERE loom = ? ORDER BY title',
            [loom]
        )
        return rows.map(r => this.rowToStrand(r))
    }

    async saveStrand(strand: StorableStrand): Promise<void> {
        const db = this.ensureDb()
        await db.run(`
      INSERT OR REPLACE INTO strands (
        id, path, slug, title, content, frontmatter, weave, loom,
        word_count, summary, github_url, github_sha,
        sync_status, content_hash, version, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
            strand.id,
            strand.path,
            strand.slug,
            strand.title,
            strand.content,
            JSON.stringify(strand.frontmatter),
            strand.weave,
            strand.loom || null,
            strand.wordCount || null,
            strand.summary || null,
            strand.githubUrl || null,
            strand.githubSha || null,
            strand.syncStatus,
            strand.contentHash || null,
            strand.version || 1,
            strand.createdAt,
            strand.updatedAt,
        ])
    }

    async deleteStrand(path: string): Promise<void> {
        const db = this.ensureDb()
        await db.run('DELETE FROM strands WHERE path = ?', [path])
    }

    private rowToStrand(row: Record<string, unknown>): StorableStrand {
        return {
            type: 'strand',
            id: row.id as string,
            path: row.path as string,
            slug: row.slug as string,
            title: row.title as string,
            content: row.content as string,
            frontmatter: row.frontmatter ? JSON.parse(row.frontmatter as string) : {},
            weave: row.weave as string,
            loom: row.loom as string | undefined,
            wordCount: row.word_count as number | undefined,
            summary: row.summary as string | undefined,
            githubUrl: row.github_url as string | undefined,
            githubSha: row.github_sha as string | undefined,
            syncStatus: row.sync_status as EntitySyncStatus,
            contentHash: row.content_hash as string | undefined,
            version: row.version as number | undefined,
            createdAt: row.created_at as string,
            updatedAt: row.updated_at as string,
        }
    }

    // ==========================================================================
    // COLLECTION OPERATIONS
    // ==========================================================================

    async getCollection(id: string): Promise<StorableCollection | null> {
        const db = this.ensureDb()
        const row = await db.get<Record<string, unknown>>(
            'SELECT * FROM collections WHERE id = ?',
            [id]
        )
        return row ? this.rowToCollection(row) : null
    }

    async getAllCollections(): Promise<StorableCollection[]> {
        const db = this.ensureDb()
        const rows = await db.all<Record<string, unknown>>(
            'SELECT * FROM collections ORDER BY pinned DESC, sort_order ASC, title ASC'
        )
        return rows.map(r => this.rowToCollection(r))
    }

    async saveCollection(collection: StorableCollection): Promise<void> {
        const db = this.ensureDb()
        await db.run(`
      INSERT OR REPLACE INTO collections (
        id, title, description, icon, color, strand_paths, view_mode,
        pinned, sort_order, positions, sync_status, content_hash,
        version, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
            collection.id,
            collection.title,
            collection.description || null,
            collection.icon || null,
            collection.color || null,
            JSON.stringify(collection.strandPaths),
            collection.viewMode || 'cards',
            collection.pinned ? 1 : 0,
            collection.sortOrder || 0,
            collection.positions ? JSON.stringify(collection.positions) : null,
            collection.syncStatus,
            collection.contentHash || null,
            collection.version || 1,
            collection.createdAt,
            collection.updatedAt,
        ])
    }

    async deleteCollection(id: string): Promise<void> {
        const db = this.ensureDb()
        await db.run('DELETE FROM collections WHERE id = ?', [id])
    }

    private rowToCollection(row: Record<string, unknown>): StorableCollection {
        return {
            type: 'collection',
            id: row.id as string,
            title: row.title as string,
            description: row.description as string | undefined,
            icon: row.icon as string | undefined,
            color: row.color as string | undefined,
            strandPaths: row.strand_paths ? JSON.parse(row.strand_paths as string) : [],
            viewMode: row.view_mode as 'cards' | 'grid' | 'timeline' | 'graph' | 'freeform' | undefined,
            pinned: row.pinned === 1,
            sortOrder: row.sort_order as number | undefined,
            positions: row.positions ? JSON.parse(row.positions as string) : undefined,
            syncStatus: row.sync_status as EntitySyncStatus,
            contentHash: row.content_hash as string | undefined,
            version: row.version as number | undefined,
            createdAt: row.created_at as string,
            updatedAt: row.updated_at as string,
        }
    }

    // ==========================================================================
    // DRAFT OPERATIONS
    // ==========================================================================

    async getDraft(id: string): Promise<StorableDraft | null> {
        const db = this.ensureDb()
        const row = await db.get<Record<string, unknown>>(
            'SELECT * FROM drafts WHERE id = ?',
            [id]
        )
        return row ? this.rowToDraft(row) : null
    }

    async getAllDrafts(): Promise<StorableDraft[]> {
        const db = this.ensureDb()
        const rows = await db.all<Record<string, unknown>>(
            'SELECT * FROM drafts ORDER BY updated_at DESC'
        )
        return rows.map(r => this.rowToDraft(r))
    }

    async saveDraft(draft: StorableDraft): Promise<void> {
        const db = this.ensureDb()
        await db.run(`
      INSERT OR REPLACE INTO drafts (
        id, strand_path, title, content, frontmatter, is_new,
        target_weave, target_loom, parent_version, last_auto_save,
        sync_status, content_hash, version, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
            draft.id,
            draft.strandPath || null,
            draft.title,
            draft.content,
            JSON.stringify(draft.frontmatter),
            draft.isNew ? 1 : 0,
            draft.targetWeave || null,
            draft.targetLoom || null,
            draft.parentVersion || null,
            draft.lastAutoSave || null,
            draft.syncStatus,
            draft.contentHash || null,
            draft.version || 1,
            draft.createdAt,
            draft.updatedAt,
        ])
    }

    async deleteDraft(id: string): Promise<void> {
        const db = this.ensureDb()
        await db.run('DELETE FROM drafts WHERE id = ?', [id])
    }

    private rowToDraft(row: Record<string, unknown>): StorableDraft {
        return {
            type: 'draft',
            id: row.id as string,
            strandPath: row.strand_path as string | undefined,
            title: row.title as string,
            content: row.content as string,
            frontmatter: row.frontmatter ? JSON.parse(row.frontmatter as string) : {},
            isNew: row.is_new === 1,
            targetWeave: row.target_weave as string | undefined,
            targetLoom: row.target_loom as string | undefined,
            parentVersion: row.parent_version as string | undefined,
            lastAutoSave: row.last_auto_save as string | undefined,
            syncStatus: row.sync_status as EntitySyncStatus,
            contentHash: row.content_hash as string | undefined,
            version: row.version as number | undefined,
            createdAt: row.created_at as string,
            updatedAt: row.updated_at as string,
        }
    }

    // ==========================================================================
    // BOOKMARK OPERATIONS
    // ==========================================================================

    async getBookmark(strandPath: string): Promise<StorableBookmark | null> {
        const db = this.ensureDb()
        const row = await db.get<Record<string, unknown>>(
            'SELECT * FROM bookmarks WHERE strand_path = ?',
            [strandPath]
        )
        return row ? this.rowToBookmark(row) : null
    }

    async getAllBookmarks(): Promise<StorableBookmark[]> {
        const db = this.ensureDb()
        const rows = await db.all<Record<string, unknown>>(
            'SELECT * FROM bookmarks ORDER BY created_at DESC'
        )
        return rows.map(r => this.rowToBookmark(r))
    }

    async saveBookmark(bookmark: StorableBookmark): Promise<void> {
        const db = this.ensureDb()
        await db.run(`
      INSERT OR REPLACE INTO bookmarks (
        id, strand_path, note, tags, scroll_position,
        sync_status, content_hash, version, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
            bookmark.id,
            bookmark.strandPath,
            bookmark.note || null,
            bookmark.tags ? JSON.stringify(bookmark.tags) : null,
            bookmark.scrollPosition || null,
            bookmark.syncStatus,
            bookmark.contentHash || null,
            bookmark.version || 1,
            bookmark.createdAt,
            bookmark.updatedAt,
        ])
    }

    async deleteBookmark(strandPath: string): Promise<void> {
        const db = this.ensureDb()
        await db.run('DELETE FROM bookmarks WHERE strand_path = ?', [strandPath])
    }

    private rowToBookmark(row: Record<string, unknown>): StorableBookmark {
        return {
            type: 'bookmark',
            id: row.id as string,
            strandPath: row.strand_path as string,
            note: row.note as string | undefined,
            tags: row.tags ? JSON.parse(row.tags as string) : undefined,
            scrollPosition: row.scroll_position as number | undefined,
            syncStatus: row.sync_status as EntitySyncStatus,
            contentHash: row.content_hash as string | undefined,
            version: row.version as number | undefined,
            createdAt: row.created_at as string,
            updatedAt: row.updated_at as string,
        }
    }

    // ==========================================================================
    // PREFERENCES OPERATIONS
    // ==========================================================================

    async getPreferences(): Promise<StorablePreferences | null> {
        const db = this.ensureDb()
        const row = await db.get<Record<string, unknown>>(
            "SELECT * FROM preferences WHERE id = 'user-preferences'"
        )
        return row ? this.rowToPreferences(row) : null
    }

    async savePreferences(prefs: StorablePreferences): Promise<void> {
        const db = this.ensureDb()
        await db.run(`
      INSERT OR REPLACE INTO preferences (
        id, theme, sidebar_collapsed, right_panel_collapsed, font_size,
        last_strand_path, recent_strands, custom,
        sync_status, content_hash, version, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
            'user-preferences',
            prefs.theme || null,
            prefs.sidebarCollapsed ? 1 : 0,
            prefs.rightPanelCollapsed ? 1 : 0,
            prefs.fontSize || null,
            prefs.lastStrandPath || null,
            prefs.recentStrands ? JSON.stringify(prefs.recentStrands) : null,
            prefs.custom ? JSON.stringify(prefs.custom) : null,
            prefs.syncStatus,
            prefs.contentHash || null,
            prefs.version || 1,
            prefs.createdAt,
            prefs.updatedAt,
        ])
    }

    private rowToPreferences(row: Record<string, unknown>): StorablePreferences {
        return {
            type: 'preferences',
            id: row.id as string,
            theme: row.theme as string | undefined,
            sidebarCollapsed: row.sidebar_collapsed === 1,
            rightPanelCollapsed: row.right_panel_collapsed === 1,
            fontSize: row.font_size as number | undefined,
            lastStrandPath: row.last_strand_path as string | undefined,
            recentStrands: row.recent_strands ? JSON.parse(row.recent_strands as string) : undefined,
            custom: row.custom ? JSON.parse(row.custom as string) : undefined,
            syncStatus: row.sync_status as EntitySyncStatus,
            contentHash: row.content_hash as string | undefined,
            version: row.version as number | undefined,
            createdAt: row.created_at as string,
            updatedAt: row.updated_at as string,
        }
    }

    // ==========================================================================
    // BLOCK TAGS CACHE OPERATIONS
    // ==========================================================================

    async getBlockTagsCache(strandPath: string): Promise<StorableBlockTagsCache | null> {
        const db = this.ensureDb()
        const row = await db.get<Record<string, unknown>>(
            'SELECT * FROM block_tags_cache WHERE strand_path = ?',
            [strandPath]
        )
        if (!row) return null

        const cache = this.rowToBlockTagsCache(row)

        // Check if expired
        if (new Date(cache.expiresAt) < new Date()) {
            // Delete expired cache
            await this.deleteBlockTagsCache(strandPath)
            return null
        }

        return cache
    }

    async saveBlockTagsCache(cache: StorableBlockTagsCache): Promise<void> {
        const db = this.ensureDb()
        await db.run(`
      INSERT OR REPLACE INTO block_tags_cache (
        id, strand_path, blocks, strand_content_hash, expires_at,
        sync_status, content_hash, version, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
            cache.id,
            cache.strandPath,
            JSON.stringify(cache.blocks),
            cache.strandContentHash,
            cache.expiresAt,
            cache.syncStatus,
            cache.contentHash || null,
            cache.version || 1,
            cache.createdAt,
            cache.updatedAt,
        ])
    }

    async deleteBlockTagsCache(strandPath: string): Promise<void> {
        const db = this.ensureDb()
        await db.run('DELETE FROM block_tags_cache WHERE strand_path = ?', [strandPath])
    }

    async clearExpiredBlockTagsCache(): Promise<number> {
        const db = this.ensureDb()
        const now = new Date().toISOString()
        const result = await db.run(
            'DELETE FROM block_tags_cache WHERE expires_at < ?',
            [now]
        )
        return result.changes
    }

    private rowToBlockTagsCache(row: Record<string, unknown>): StorableBlockTagsCache {
        return {
            type: 'block-tags-cache',
            id: row.id as string,
            strandPath: row.strand_path as string,
            blocks: row.blocks ? JSON.parse(row.blocks as string) : [],
            strandContentHash: row.strand_content_hash as string,
            expiresAt: row.expires_at as string,
            syncStatus: row.sync_status as EntitySyncStatus,
            contentHash: row.content_hash as string | undefined,
            version: row.version as number | undefined,
            createdAt: row.created_at as string,
            updatedAt: row.updated_at as string,
        }
    }

    // ==========================================================================
    // BULK OPERATIONS
    // ==========================================================================

    async getPendingEntities(): Promise<StorableEntity[]> {
        const db = this.ensureDb()
        const pending: StorableEntity[] = []

        // Get pending strands
        const strands = await db.all<Record<string, unknown>>(
            "SELECT * FROM strands WHERE sync_status = 'pending'"
        )
        pending.push(...strands.map(r => this.rowToStrand(r)))

        // Get pending collections
        const collections = await db.all<Record<string, unknown>>(
            "SELECT * FROM collections WHERE sync_status = 'pending'"
        )
        pending.push(...collections.map(r => this.rowToCollection(r)))

        // Get pending drafts
        const drafts = await db.all<Record<string, unknown>>(
            "SELECT * FROM drafts WHERE sync_status = 'pending'"
        )
        pending.push(...drafts.map(r => this.rowToDraft(r)))

        // Get pending bookmarks
        const bookmarks = await db.all<Record<string, unknown>>(
            "SELECT * FROM bookmarks WHERE sync_status = 'pending'"
        )
        pending.push(...bookmarks.map(r => this.rowToBookmark(r)))

        return pending
    }

    async updateSyncStatus(ids: string[], status: EntitySyncStatus): Promise<void> {
        if (ids.length === 0) return

        const db = this.ensureDb()
        const placeholders = ids.map(() => '?').join(',')
        const now = new Date().toISOString()

        // Update all tables (IDs are unique across entity types)
        await db.run(
            `UPDATE strands SET sync_status = ?, updated_at = ? WHERE id IN (${placeholders})`,
            [status, now, ...ids]
        )
        await db.run(
            `UPDATE collections SET sync_status = ?, updated_at = ? WHERE id IN (${placeholders})`,
            [status, now, ...ids]
        )
        await db.run(
            `UPDATE drafts SET sync_status = ?, updated_at = ? WHERE id IN (${placeholders})`,
            [status, now, ...ids]
        )
        await db.run(
            `UPDATE bookmarks SET sync_status = ?, updated_at = ? WHERE id IN (${placeholders})`,
            [status, now, ...ids]
        )
    }

    async clearAll(): Promise<void> {
        const db = this.ensureDb()
        await db.exec(`
      DELETE FROM strands;
      DELETE FROM collections;
      DELETE FROM drafts;
      DELETE FROM bookmarks;
      DELETE FROM preferences;
      DELETE FROM block_tags_cache;
    `)
        console.log('[LocalStorageAdapter] All data cleared')
    }
}
