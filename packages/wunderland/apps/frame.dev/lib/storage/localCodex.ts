/**
 * Local Codex Storage Module
 *
 * Provides persistent local storage for Codex content using sql-storage-adapter.
 * Works across platforms:
 * - Browser: IndexedDB with sql.js
 * - Electron: better-sqlite3
 * - Mobile: Capacitor SQLite
 *
 * @module lib/storage/localCodex
 */

import { createDatabase, type StorageAdapter } from '@framers/sql-storage-adapter'
import { isElectron, isCapacitor, getPlatform } from '../electron'

// Lazy import to avoid circular dependencies
let semanticSearchModule: typeof import('../search/semanticSearch') | null = null
async function getSemanticSearchModule() {
  if (!semanticSearchModule) {
    semanticSearchModule = await import('../search/semanticSearch')
  }
  return semanticSearchModule
}

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Local strand/document metadata
 */
export interface LocalStrand {
  id: string
  path: string
  title: string
  content: string
  contentHash: string
  frontmatter?: string
  createdAt: string
  updatedAt: string
  indexedAt?: string
  tags?: string
  summary?: string
}

/**
 * Local strand note
 */
export interface LocalNote {
  id: string
  strandId: string
  content: string
  author?: string
  createdAt: string
  updatedAt: string
}

/**
 * Local bookmark
 */
export interface LocalBookmark {
  id: string
  strandId: string
  position?: string
  label?: string
  addedBy?: string
  createdAt: string
}

/**
 * Search result from local index
 */
export interface LocalSearchResult {
  id: string
  path: string
  title: string
  snippet: string
  score: number
}

/**
 * Local glossary term with source tracking
 */
export interface LocalGlossaryTerm {
  id: string
  term: string
  definition: string
  category: string
  sourceStrandId?: string
  sourceStrandPath?: string
  sourceStrandTitle?: string
  confidence?: number
  createdAt: string
  updatedAt: string
  tags?: string
}

/**
 * User rating for a strand (local storage version)
 */
export interface LocalStrandRating {
  id: string
  strandId: string
  strandPath: string
  rating: number
  dimension?: string | null
  notes?: string
  createdAt: string
  updatedAt: string
}

/**
 * LLM-generated rating (local storage version)
 */
export interface LocalLLMStrandRating {
  id: string
  strandId: string
  strandPath: string
  overallScore: number
  qualityScore?: number
  completenessScore?: number
  accuracyScore?: number
  clarityScore?: number
  relevanceScore?: number
  depthScore?: number
  reasoning?: string
  suggestions?: string[]
  comparedTo?: string[]
  modelUsed?: string
  createdAt: string
  updatedAt: string
}

/* ═══════════════════════════════════════════════════════════════════════════
   DATABASE SINGLETON
═══════════════════════════════════════════════════════════════════════════ */

let db: StorageAdapter | null = null
let dbPromise: Promise<StorageAdapter> | null = null

/**
 * Database schema version for migrations
 * v2: Removed FTS5 (not supported by sql.js), using LIKE queries instead
 */
const SCHEMA_VERSION = 2

/**
 * SQL schema for local codex storage
 */
const SCHEMA = `
  -- Schema version tracking
  CREATE TABLE IF NOT EXISTS schema_version (
    version INTEGER PRIMARY KEY,
    applied_at TEXT NOT NULL
  );

  -- Strands (markdown documents)
  CREATE TABLE IF NOT EXISTS strands (
    id TEXT PRIMARY KEY,
    path TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    content_hash TEXT NOT NULL,
    frontmatter TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    indexed_at TEXT,
    tags TEXT,
    summary TEXT
  );

  -- Index for faster text search (LIKE queries)
  CREATE INDEX IF NOT EXISTS idx_strands_title ON strands(title);
  CREATE INDEX IF NOT EXISTS idx_strands_tags ON strands(tags);
  CREATE INDEX IF NOT EXISTS idx_strands_path ON strands(path);

  -- Notes attached to strands
  CREATE TABLE IF NOT EXISTS notes (
    id TEXT PRIMARY KEY,
    strand_id TEXT NOT NULL,
    content TEXT NOT NULL,
    author TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (strand_id) REFERENCES strands(id) ON DELETE CASCADE
  );

  -- Bookmarks for quick access
  CREATE TABLE IF NOT EXISTS bookmarks (
    id TEXT PRIMARY KEY,
    strand_id TEXT NOT NULL,
    position TEXT,
    label TEXT,
    added_by TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (strand_id) REFERENCES strands(id) ON DELETE CASCADE
  );

  -- Indexes for common queries
  CREATE INDEX IF NOT EXISTS idx_strands_path ON strands(path);
  CREATE INDEX IF NOT EXISTS idx_strands_updated ON strands(updated_at);
  CREATE INDEX IF NOT EXISTS idx_notes_strand ON notes(strand_id);
  CREATE INDEX IF NOT EXISTS idx_bookmarks_strand ON bookmarks(strand_id);

  -- Global glossary terms with source tracking
  CREATE TABLE IF NOT EXISTS glossary_terms (
    id TEXT PRIMARY KEY,
    term TEXT NOT NULL,
    definition TEXT,
    category TEXT NOT NULL,
    source_strand_id TEXT,
    source_strand_path TEXT,
    source_strand_title TEXT,
    confidence REAL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    tags TEXT,
    FOREIGN KEY (source_strand_id) REFERENCES strands(id) ON DELETE SET NULL
  );

  -- Indexes for glossary queries
  CREATE INDEX IF NOT EXISTS idx_glossary_term ON glossary_terms(term);
  CREATE INDEX IF NOT EXISTS idx_glossary_category ON glossary_terms(category);
  CREATE INDEX IF NOT EXISTS idx_glossary_source ON glossary_terms(source_strand_id);
  CREATE INDEX IF NOT EXISTS idx_glossary_updated ON glossary_terms(updated_at);

  -- User ratings for strands (10-point scale)
  CREATE TABLE IF NOT EXISTS strand_ratings (
    id TEXT PRIMARY KEY,
    strand_id TEXT NOT NULL,
    strand_path TEXT NOT NULL,
    rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 10),
    dimension TEXT,
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (strand_id) REFERENCES strands(id) ON DELETE CASCADE
  );

  -- LLM-generated ratings with dimension breakdown
  CREATE TABLE IF NOT EXISTS llm_strand_ratings (
    id TEXT PRIMARY KEY,
    strand_id TEXT NOT NULL,
    strand_path TEXT NOT NULL,
    overall_score REAL NOT NULL,
    quality_score REAL,
    completeness_score REAL,
    accuracy_score REAL,
    clarity_score REAL,
    relevance_score REAL,
    depth_score REAL,
    reasoning TEXT,
    suggestions TEXT,
    compared_to TEXT,
    model_used TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (strand_id) REFERENCES strands(id) ON DELETE CASCADE
  );

  -- Indexes for rating queries
  CREATE INDEX IF NOT EXISTS idx_strand_ratings_strand ON strand_ratings(strand_id);
  CREATE INDEX IF NOT EXISTS idx_strand_ratings_path ON strand_ratings(strand_path);
  CREATE INDEX IF NOT EXISTS idx_strand_ratings_dimension ON strand_ratings(dimension);
  CREATE INDEX IF NOT EXISTS idx_llm_ratings_strand ON llm_strand_ratings(strand_id);
  CREATE INDEX IF NOT EXISTS idx_llm_ratings_path ON llm_strand_ratings(strand_path);

  -- Background jobs queue
  CREATE TABLE IF NOT EXISTS jobs (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    progress INTEGER NOT NULL DEFAULT 0,
    message TEXT NOT NULL DEFAULT '',
    payload TEXT NOT NULL,
    result TEXT,
    error TEXT,
    created_at TEXT NOT NULL,
    started_at TEXT,
    completed_at TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
  CREATE INDEX IF NOT EXISTS idx_jobs_type ON jobs(type);
  CREATE INDEX IF NOT EXISTS idx_jobs_created ON jobs(created_at);
`

/**
 * Get or initialize the local codex database
 */
export async function getLocalCodexDb(): Promise<StorageAdapter> {
  if (db) return db

  if (dbPromise) return dbPromise

  dbPromise = initializeDatabase()
  db = await dbPromise
  return db
}

/**
 * Alias for getLocalCodexDb for backward compatibility
 */
export const getDb = getLocalCodexDb

/**
 * Initialize the database with platform-appropriate settings
 */
async function initializeDatabase(): Promise<StorageAdapter> {
  const platform = getPlatform()

  // Configure based on platform
  const options: Parameters<typeof createDatabase>[0] = {}

  if (platform === 'electron' || isElectron()) {
    // Electron: Use better-sqlite3 for performance
    options.priority = ['better-sqlite3', 'sqljs']
    options.file = 'codex-local.db'
  } else if (isCapacitor()) {
    // Mobile: Use Capacitor SQLite
    options.priority = ['capacitor']
    options.mobile = {
      database: 'codex-local',
    }
  } else {
    // Browser: Use IndexedDB with sql.js
    options.priority = ['indexeddb', 'sqljs']
    options.indexedDb = {
      dbName: 'quarry-codex-local',
      autoSave: true,
      saveIntervalMs: 3000,
      sqlJsConfig: {
        locateFile: (file: string) => {
          // Use absolute URL to avoid path resolution issues on nested routes like /quarry/some-page
          const origin = typeof window !== 'undefined' ? window.location.origin : ''
          return `${origin}/wasm/${file}`
        },
      },
    }
  }

  const adapter = await createDatabase(options)

  // Initialize schema
  await initializeSchema(adapter)

  return adapter
}

/**
 * Initialize or migrate the database schema
 */
async function initializeSchema(adapter: StorageAdapter): Promise<void> {
  // Check current version
  let currentVersion = 0
  try {
    const version = await adapter.get<{ version: number }>(
      'SELECT version FROM schema_version ORDER BY version DESC LIMIT 1'
    )

    if (version && version.version >= SCHEMA_VERSION) {
      return // Schema is up to date
    }
    currentVersion = version?.version || 0
  } catch {
    // Table doesn't exist yet, continue with initialization
  }

  // Migration: v1 -> v2: Remove FTS5 tables and triggers (not supported in sql.js)
  if (currentVersion >= 1 && currentVersion < 2) {
    try {
      // Drop FTS5 related objects (they may fail if they don't exist, which is fine)
      await adapter.exec('DROP TRIGGER IF EXISTS strands_ai')
      await adapter.exec('DROP TRIGGER IF EXISTS strands_ad')
      await adapter.exec('DROP TRIGGER IF EXISTS strands_au')
      await adapter.exec('DROP TABLE IF EXISTS strands_fts')
    } catch (e) {
      // Ignore errors - FTS5 tables may not exist
      console.warn('[LocalCodex] Migration cleanup (safe to ignore):', e)
    }
  }

  // Apply schema (includes all tables - strands, notes, bookmarks, glossary_terms)
  await adapter.exec(SCHEMA)

  // Record version
  await adapter.run(
    'INSERT OR REPLACE INTO schema_version (version, applied_at) VALUES (?, ?)',
    [SCHEMA_VERSION, new Date().toISOString()]
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   STRAND OPERATIONS
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Generate a simple content hash for change detection
 */
function hashContent(content: string): string {
  let hash = 5381
  for (let i = 0; i < content.length; i++) {
    hash = ((hash << 5) + hash) ^ content.charCodeAt(i)
  }
  return (hash >>> 0).toString(16)
}

/**
 * Generate a unique ID
 */
function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`
}

/**
 * Save or update a strand in local storage
 */
export async function saveStrand(strand: Omit<LocalStrand, 'id' | 'contentHash' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<LocalStrand> {
  const db = await getLocalCodexDb()
  const now = new Date().toISOString()
  const contentHash = hashContent(strand.content)

  // Check if strand exists by path
  const existing = await db.get<{ id: string; created_at: string }>(
    'SELECT id, created_at FROM strands WHERE path = ?',
    [strand.path]
  )

  const id = strand.id || existing?.id || generateId()
  const createdAt = existing?.created_at || now

  await db.run(
    `INSERT OR REPLACE INTO strands
     (id, path, title, content, content_hash, frontmatter, created_at, updated_at, indexed_at, tags, summary)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      strand.path,
      strand.title,
      strand.content,
      contentHash,
      strand.frontmatter || null,
      createdAt,
      now,
      strand.indexedAt || null,
      strand.tags || null,
      strand.summary || null,
    ]
  )

  const savedStrand = {
    id,
    path: strand.path,
    title: strand.title,
    content: strand.content,
    contentHash,
    frontmatter: strand.frontmatter,
    createdAt,
    updatedAt: now,
    indexedAt: strand.indexedAt,
    tags: strand.tags,
    summary: strand.summary,
  }

  // Trigger semantic indexing in background (non-blocking)
  // This generates embeddings for semantic search
  getSemanticSearchModule().then(module => {
    module.indexStrandForSearch(savedStrand.path, savedStrand.content, {
      title: savedStrand.title,
      tags: savedStrand.tags?.split(',').map(t => t.trim()),
    }).catch(err => {
      console.warn('[LocalCodex] Failed to index strand for search:', err)
    })
  }).catch(() => {
    // Ignore errors from lazy loading the module
  })

  // Trigger NLP block processing in background (non-blocking)
  // This queues the strand for automatic tag generation and worthiness scoring
  // Respects user settings - can be disabled via ML Auto-Trigger Settings
  Promise.all([
    import('../jobs/batchBlockProcessing'),
    import('../settings/mlAutoTriggerSettings'),
  ]).then(([batchModule, settingsModule]) => {
    const settings = settingsModule.getMLAutoTriggerSettings()
    if (settings.enabled && settings.triggerOnSave) {
      batchModule.queueStaleStrandsForProcessing({
        paths: [savedStrand.path],
        limit: 1,
      }).catch(err => {
        console.warn('[LocalCodex] Failed to queue strand for NLP processing:', err)
      })
    }
  }).catch(() => {
    // Ignore errors from lazy loading the modules
  })

  return savedStrand
}

/**
 * Get a strand by path
 */
export async function getStrandByPath(path: string): Promise<LocalStrand | null> {
  const db = await getLocalCodexDb()
  const row = await db.get<{
    id: string
    path: string
    title: string
    content: string
    content_hash: string
    frontmatter: string | null
    created_at: string
    updated_at: string
    indexed_at: string | null
    tags: string | null
    summary: string | null
  }>('SELECT * FROM strands WHERE path = ?', [path])

  if (!row) return null

  return {
    id: row.id,
    path: row.path,
    title: row.title,
    content: row.content,
    contentHash: row.content_hash,
    frontmatter: row.frontmatter || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    indexedAt: row.indexed_at || undefined,
    tags: row.tags || undefined,
    summary: row.summary || undefined,
  }
}

/**
 * Get a strand by ID
 */
export async function getStrandById(id: string): Promise<LocalStrand | null> {
  const db = await getLocalCodexDb()
  const row = await db.get<{
    id: string
    path: string
    title: string
    content: string
    content_hash: string
    frontmatter: string | null
    created_at: string
    updated_at: string
    indexed_at: string | null
    tags: string | null
    summary: string | null
  }>('SELECT * FROM strands WHERE id = ?', [id])

  if (!row) return null

  return {
    id: row.id,
    path: row.path,
    title: row.title,
    content: row.content,
    contentHash: row.content_hash,
    frontmatter: row.frontmatter || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    indexedAt: row.indexed_at || undefined,
    tags: row.tags || undefined,
    summary: row.summary || undefined,
  }
}

/**
 * List all strands with optional pagination
 */
export async function listStrands(options?: {
  limit?: number
  offset?: number
  orderBy?: 'updated_at' | 'created_at' | 'title'
  order?: 'asc' | 'desc'
}): Promise<LocalStrand[]> {
  const db = await getLocalCodexDb()
  const limit = options?.limit || 100
  const offset = options?.offset || 0
  const orderBy = options?.orderBy || 'updated_at'
  const order = options?.order || 'desc'

  const rows = await db.all<{
    id: string
    path: string
    title: string
    content: string
    content_hash: string
    frontmatter: string | null
    created_at: string
    updated_at: string
    indexed_at: string | null
    tags: string | null
    summary: string | null
  }>(`SELECT * FROM strands ORDER BY ${orderBy} ${order.toUpperCase()} LIMIT ? OFFSET ?`, [limit, offset])

  return rows.map((row) => ({
    id: row.id,
    path: row.path,
    title: row.title,
    content: row.content,
    contentHash: row.content_hash,
    frontmatter: row.frontmatter || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    indexedAt: row.indexed_at || undefined,
    tags: row.tags || undefined,
    summary: row.summary || undefined,
  }))
}

/**
 * Delete a strand by path
 */
export async function deleteStrand(path: string): Promise<boolean> {
  const db = await getLocalCodexDb()
  const result = await db.run('DELETE FROM strands WHERE path = ?', [path])

  // Remove from semantic search index (non-blocking)
  if (result.changes > 0) {
    getSemanticSearchModule().then(module => {
      module.removeStrandFromSearch(path).catch(err => {
        console.warn('[LocalCodex] Failed to remove strand from search:', err)
      })
    }).catch(() => {
      // Ignore errors from lazy loading the module
    })
  }

  return result.changes > 0
}

/**
 * Search strands using LIKE queries (cross-platform compatible)
 * Uses simple text matching since FTS5 isn't available in all sql.js builds
 */
export async function searchStrands(query: string, limit = 20): Promise<LocalSearchResult[]> {
  const db = await getLocalCodexDb()

  // Escape special characters and prepare for LIKE
  const searchTerm = `%${query.replace(/[%_]/g, '\\$&')}%`
  
  // Search in title, content, tags, and summary using LIKE
  // Score by match location (title matches score higher)
  const rows = await db.all<{
    id: string
    path: string
    title: string
    content: string
    tags: string | null
    title_match: number
    tags_match: number
    content_match: number
  }>(
    `SELECT
       id,
       path,
       title,
       SUBSTR(content, 1, 200) as content,
       tags,
       CASE WHEN title LIKE ? ESCAPE '\\' THEN 3 ELSE 0 END as title_match,
       CASE WHEN tags LIKE ? ESCAPE '\\' THEN 2 ELSE 0 END as tags_match,
       CASE WHEN content LIKE ? ESCAPE '\\' THEN 1 ELSE 0 END as content_match
     FROM strands
     WHERE title LIKE ? ESCAPE '\\'
        OR tags LIKE ? ESCAPE '\\'
        OR content LIKE ? ESCAPE '\\'
        OR summary LIKE ? ESCAPE '\\'
     ORDER BY (title_match + tags_match + content_match) DESC, title ASC
     LIMIT ?`,
    [searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, limit]
  )

  return rows.map((row) => {
    // Generate a simple snippet from content
    const contentLower = row.content?.toLowerCase() || ''
    const queryLower = query.toLowerCase()
    const matchIndex = contentLower.indexOf(queryLower)
    let snippet = ''
    
    if (matchIndex >= 0) {
      const start = Math.max(0, matchIndex - 40)
      const end = Math.min(row.content.length, matchIndex + query.length + 40)
      snippet = (start > 0 ? '...' : '') + 
                row.content.slice(start, end).replace(
                  new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'),
                  '<mark>$1</mark>'
                ) +
                (end < row.content.length ? '...' : '')
    } else {
      snippet = row.content?.slice(0, 100) + (row.content?.length > 100 ? '...' : '')
    }
    
    return {
      id: row.id,
      path: row.path,
      title: row.title,
      snippet,
      score: row.title_match + row.tags_match + row.content_match,
    }
  })
}

/* ═══════════════════════════════════════════════════════════════════════════
   NOTE OPERATIONS
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Add a note to a strand
 */
export async function addNote(strandId: string, content: string, author?: string): Promise<LocalNote> {
  const db = await getLocalCodexDb()
  const id = generateId()
  const now = new Date().toISOString()

  await db.run(
    'INSERT INTO notes (id, strand_id, content, author, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    [id, strandId, content, author || null, now, now]
  )

  return { id, strandId, content, author, createdAt: now, updatedAt: now }
}

/**
 * Get notes for a strand
 */
export async function getNotesForStrand(strandId: string): Promise<LocalNote[]> {
  const db = await getLocalCodexDb()
  const rows = await db.all<{
    id: string
    strand_id: string
    content: string
    author: string | null
    created_at: string
    updated_at: string
  }>('SELECT * FROM notes WHERE strand_id = ? ORDER BY created_at DESC', [strandId])

  return rows.map((row) => ({
    id: row.id,
    strandId: row.strand_id,
    content: row.content,
    author: row.author || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }))
}

/**
 * Update a note
 */
export async function updateNote(id: string, content: string): Promise<boolean> {
  const db = await getLocalCodexDb()
  const result = await db.run(
    'UPDATE notes SET content = ?, updated_at = ? WHERE id = ?',
    [content, new Date().toISOString(), id]
  )
  return result.changes > 0
}

/**
 * Delete a note
 */
export async function deleteNote(id: string): Promise<boolean> {
  const db = await getLocalCodexDb()
  const result = await db.run('DELETE FROM notes WHERE id = ?', [id])
  return result.changes > 0
}

/* ═══════════════════════════════════════════════════════════════════════════
   BOOKMARK OPERATIONS
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Add a bookmark
 */
export async function addLocalBookmark(
  strandId: string,
  options?: { position?: string; label?: string; addedBy?: string }
): Promise<LocalBookmark> {
  const db = await getLocalCodexDb()
  const id = generateId()
  const now = new Date().toISOString()

  await db.run(
    'INSERT INTO bookmarks (id, strand_id, position, label, added_by, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    [id, strandId, options?.position || null, options?.label || null, options?.addedBy || null, now]
  )

  return {
    id,
    strandId,
    position: options?.position,
    label: options?.label,
    addedBy: options?.addedBy,
    createdAt: now,
  }
}

/**
 * Get all bookmarks
 */
export async function getLocalBookmarks(): Promise<LocalBookmark[]> {
  const db = await getLocalCodexDb()
  const rows = await db.all<{
    id: string
    strand_id: string
    position: string | null
    label: string | null
    added_by: string | null
    created_at: string
  }>('SELECT * FROM bookmarks ORDER BY created_at DESC')

  return rows.map((row) => ({
    id: row.id,
    strandId: row.strand_id,
    position: row.position || undefined,
    label: row.label || undefined,
    addedBy: row.added_by || undefined,
    createdAt: row.created_at,
  }))
}

/**
 * Delete a bookmark
 */
export async function deleteLocalBookmark(id: string): Promise<boolean> {
  const db = await getLocalCodexDb()
  const result = await db.run('DELETE FROM bookmarks WHERE id = ?', [id])
  return result.changes > 0
}

/* ═══════════════════════════════════════════════════════════════════════════
   GLOSSARY TERM OPERATIONS
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Save or update a glossary term
 */
export async function saveGlossaryTerm(
  term: Omit<LocalGlossaryTerm, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
): Promise<LocalGlossaryTerm> {
  const db = await getLocalCodexDb()
  const now = new Date().toISOString()

  // Check if term exists by id or by term+source combo
  const existing = term.id
    ? await db.get<{ id: string; created_at: string }>(
        'SELECT id, created_at FROM glossary_terms WHERE id = ?',
        [term.id]
      )
    : await db.get<{ id: string; created_at: string }>(
        'SELECT id, created_at FROM glossary_terms WHERE term = ? AND source_strand_id = ?',
        [term.term, term.sourceStrandId || null]
      )

  const id = term.id || existing?.id || generateId()
  const createdAt = existing?.created_at || now

  await db.run(
    `INSERT OR REPLACE INTO glossary_terms
     (id, term, definition, category, source_strand_id, source_strand_path, source_strand_title, confidence, created_at, updated_at, tags)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      term.term,
      term.definition || null,
      term.category,
      term.sourceStrandId || null,
      term.sourceStrandPath || null,
      term.sourceStrandTitle || null,
      term.confidence ?? null,
      createdAt,
      now,
      term.tags || null,
    ]
  )

  return {
    id,
    term: term.term,
    definition: term.definition,
    category: term.category,
    sourceStrandId: term.sourceStrandId,
    sourceStrandPath: term.sourceStrandPath,
    sourceStrandTitle: term.sourceStrandTitle,
    confidence: term.confidence,
    createdAt,
    updatedAt: now,
    tags: term.tags,
  }
}

/**
 * Save multiple glossary terms in a batch
 */
export async function saveGlossaryTermsBatch(
  terms: Array<Omit<LocalGlossaryTerm, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<LocalGlossaryTerm[]> {
  const results: LocalGlossaryTerm[] = []
  for (const term of terms) {
    results.push(await saveGlossaryTerm(term))
  }
  return results
}

/**
 * Get a glossary term by ID
 */
export async function getGlossaryTermById(id: string): Promise<LocalGlossaryTerm | null> {
  const db = await getLocalCodexDb()
  const row = await db.get<{
    id: string
    term: string
    definition: string | null
    category: string
    source_strand_id: string | null
    source_strand_path: string | null
    source_strand_title: string | null
    confidence: number | null
    created_at: string
    updated_at: string
    tags: string | null
  }>('SELECT * FROM glossary_terms WHERE id = ?', [id])

  if (!row) return null

  return {
    id: row.id,
    term: row.term,
    definition: row.definition || '',
    category: row.category,
    sourceStrandId: row.source_strand_id || undefined,
    sourceStrandPath: row.source_strand_path || undefined,
    sourceStrandTitle: row.source_strand_title || undefined,
    confidence: row.confidence ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    tags: row.tags || undefined,
  }
}

/**
 * List glossary terms with filtering and pagination
 */
export async function listGlossaryTerms(options?: {
  limit?: number
  offset?: number
  category?: string
  sourceStrandId?: string
  search?: string
  tags?: string[]
  orderBy?: 'term' | 'updated_at' | 'created_at' | 'category'
  order?: 'asc' | 'desc'
}): Promise<LocalGlossaryTerm[]> {
  const db = await getLocalCodexDb()
  const limit = options?.limit || 100
  const offset = options?.offset || 0
  const orderBy = options?.orderBy || 'term'
  const order = options?.order || 'asc'

  let query = 'SELECT * FROM glossary_terms WHERE 1=1'
  const params: unknown[] = []

  if (options?.category) {
    query += ' AND category = ?'
    params.push(options.category)
  }

  if (options?.sourceStrandId) {
    query += ' AND source_strand_id = ?'
    params.push(options.sourceStrandId)
  }

  if (options?.search) {
    query += ' AND (term LIKE ? OR definition LIKE ?)'
    const searchPattern = `%${options.search}%`
    params.push(searchPattern, searchPattern)
  }

  if (options?.tags && options.tags.length > 0) {
    // Match any of the provided tags
    const tagConditions = options.tags.map(() => 'tags LIKE ?').join(' OR ')
    query += ` AND (${tagConditions})`
    params.push(...options.tags.map((tag) => `%${tag}%`))
  }

  query += ` ORDER BY ${orderBy} ${order.toUpperCase()} LIMIT ? OFFSET ?`
  params.push(limit, offset)

  const rows = await db.all<{
    id: string
    term: string
    definition: string | null
    category: string
    source_strand_id: string | null
    source_strand_path: string | null
    source_strand_title: string | null
    confidence: number | null
    created_at: string
    updated_at: string
    tags: string | null
  }>(query, params)

  return rows.map((row) => ({
    id: row.id,
    term: row.term,
    definition: row.definition || '',
    category: row.category,
    sourceStrandId: row.source_strand_id || undefined,
    sourceStrandPath: row.source_strand_path || undefined,
    sourceStrandTitle: row.source_strand_title || undefined,
    confidence: row.confidence ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    tags: row.tags || undefined,
  }))
}

/**
 * Get glossary terms by source strand
 */
export async function getGlossaryTermsByStrand(strandId: string): Promise<LocalGlossaryTerm[]> {
  return listGlossaryTerms({ sourceStrandId: strandId, limit: 1000 })
}

/**
 * Get all unique categories from glossary terms
 */
export async function getGlossaryCategories(): Promise<string[]> {
  const db = await getLocalCodexDb()
  const rows = await db.all<{ category: string }>(
    'SELECT DISTINCT category FROM glossary_terms ORDER BY category'
  )
  return rows.map((row) => row.category)
}

/**
 * Get glossary statistics
 */
export async function getGlossaryStats(): Promise<{
  totalTerms: number
  byCategory: Record<string, number>
  bySource: Record<string, { count: number; title: string }>
}> {
  const db = await getLocalCodexDb()

  const total = await db.get<{ count: number }>('SELECT COUNT(*) as count FROM glossary_terms')

  const categoryRows = await db.all<{ category: string; count: number }>(
    'SELECT category, COUNT(*) as count FROM glossary_terms GROUP BY category'
  )

  const sourceRows = await db.all<{ source_strand_id: string; source_strand_title: string; count: number }>(
    `SELECT source_strand_id, source_strand_title, COUNT(*) as count
     FROM glossary_terms
     WHERE source_strand_id IS NOT NULL
     GROUP BY source_strand_id`
  )

  const byCategory: Record<string, number> = {}
  for (const row of categoryRows) {
    byCategory[row.category] = row.count
  }

  const bySource: Record<string, { count: number; title: string }> = {}
  for (const row of sourceRows) {
    if (row.source_strand_id) {
      bySource[row.source_strand_id] = {
        count: row.count,
        title: row.source_strand_title || 'Unknown',
      }
    }
  }

  return {
    totalTerms: total?.count || 0,
    byCategory,
    bySource,
  }
}

/**
 * Delete a glossary term by ID
 */
export async function deleteGlossaryTerm(id: string): Promise<boolean> {
  const db = await getLocalCodexDb()
  const result = await db.run('DELETE FROM glossary_terms WHERE id = ?', [id])
  return result.changes > 0
}

/**
 * Delete all glossary terms for a specific strand
 */
export async function deleteGlossaryTermsByStrand(strandId: string): Promise<number> {
  const db = await getLocalCodexDb()
  const result = await db.run('DELETE FROM glossary_terms WHERE source_strand_id = ?', [strandId])
  return result.changes
}

/**
 * Clear all glossary terms
 */
export async function clearGlossaryTerms(): Promise<void> {
  const db = await getLocalCodexDb()
  await db.run('DELETE FROM glossary_terms')
}

/* ═══════════════════════════════════════════════════════════════════════════
   USER STRAND RATING OPERATIONS
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Generate a unique ID
 */
function generateRatingId(): string {
  return `rating-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`
}

/**
 * Save or update a user rating for a strand
 */
export async function saveStrandRating(
  rating: Omit<LocalStrandRating, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
): Promise<LocalStrandRating> {
  const db = await getLocalCodexDb()
  const now = new Date().toISOString()

  // Check if rating exists by id or by strand+dimension combo
  const existing = rating.id
    ? await db.get<{ id: string; created_at: string }>(
        'SELECT id, created_at FROM strand_ratings WHERE id = ?',
        [rating.id]
      )
    : await db.get<{ id: string; created_at: string }>(
        'SELECT id, created_at FROM strand_ratings WHERE strand_id = ? AND (dimension = ? OR (dimension IS NULL AND ? IS NULL))',
        [rating.strandId, rating.dimension || null, rating.dimension || null]
      )

  const id = rating.id || existing?.id || generateRatingId()
  const createdAt = existing?.created_at || now

  await db.run(
    `INSERT OR REPLACE INTO strand_ratings
     (id, strand_id, strand_path, rating, dimension, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      rating.strandId,
      rating.strandPath,
      rating.rating,
      rating.dimension || null,
      rating.notes || null,
      createdAt,
      now,
    ]
  )

  return {
    id,
    strandId: rating.strandId,
    strandPath: rating.strandPath,
    rating: rating.rating,
    dimension: rating.dimension,
    notes: rating.notes,
    createdAt,
    updatedAt: now,
  }
}

/**
 * Get user rating for a strand by strand ID (optionally filtered by dimension)
 */
export async function getStrandRating(
  strandId: string,
  dimension?: string | null
): Promise<LocalStrandRating | null> {
  const db = await getLocalCodexDb()
  const row = await db.get<{
    id: string
    strand_id: string
    strand_path: string
    rating: number
    dimension: string | null
    notes: string | null
    created_at: string
    updated_at: string
  }>(
    dimension === undefined
      ? 'SELECT * FROM strand_ratings WHERE strand_id = ? AND dimension IS NULL'
      : 'SELECT * FROM strand_ratings WHERE strand_id = ? AND dimension = ?',
    dimension === undefined ? [strandId] : [strandId, dimension]
  )

  if (!row) return null

  return {
    id: row.id,
    strandId: row.strand_id,
    strandPath: row.strand_path,
    rating: row.rating,
    dimension: row.dimension,
    notes: row.notes || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

/**
 * Get all user ratings for a strand
 */
export async function getStrandRatings(strandId: string): Promise<LocalStrandRating[]> {
  const db = await getLocalCodexDb()
  const rows = await db.all<{
    id: string
    strand_id: string
    strand_path: string
    rating: number
    dimension: string | null
    notes: string | null
    created_at: string
    updated_at: string
  }>('SELECT * FROM strand_ratings WHERE strand_id = ? ORDER BY created_at DESC', [strandId])

  return rows.map((row) => ({
    id: row.id,
    strandId: row.strand_id,
    strandPath: row.strand_path,
    rating: row.rating,
    dimension: row.dimension,
    notes: row.notes || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }))
}

/**
 * Get all strand ratings (for all strands)
 */
export async function listStrandRatings(options?: {
  limit?: number
  offset?: number
  dimension?: string
  orderBy?: 'rating' | 'created_at' | 'updated_at'
  order?: 'asc' | 'desc'
}): Promise<LocalStrandRating[]> {
  const db = await getLocalCodexDb()
  const limit = options?.limit || 100
  const offset = options?.offset || 0
  const orderBy = options?.orderBy || 'updated_at'
  const order = options?.order || 'desc'

  let query = 'SELECT * FROM strand_ratings WHERE 1=1'
  const params: unknown[] = []

  if (options?.dimension !== undefined) {
    if (options.dimension === null) {
      query += ' AND dimension IS NULL'
    } else {
      query += ' AND dimension = ?'
      params.push(options.dimension)
    }
  }

  query += ` ORDER BY ${orderBy} ${order.toUpperCase()} LIMIT ? OFFSET ?`
  params.push(limit, offset)

  const rows = await db.all<{
    id: string
    strand_id: string
    strand_path: string
    rating: number
    dimension: string | null
    notes: string | null
    created_at: string
    updated_at: string
  }>(query, params)

  return rows.map((row) => ({
    id: row.id,
    strandId: row.strand_id,
    strandPath: row.strand_path,
    rating: row.rating,
    dimension: row.dimension,
    notes: row.notes || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }))
}

/**
 * Delete a user rating
 */
export async function deleteStrandRating(id: string): Promise<boolean> {
  const db = await getLocalCodexDb()
  const result = await db.run('DELETE FROM strand_ratings WHERE id = ?', [id])
  return result.changes > 0
}

/**
 * Delete all ratings for a strand
 */
export async function deleteStrandRatingsByStrand(strandId: string): Promise<number> {
  const db = await getLocalCodexDb()
  const result = await db.run('DELETE FROM strand_ratings WHERE strand_id = ?', [strandId])
  return result.changes
}

/* ═══════════════════════════════════════════════════════════════════════════
   LLM STRAND RATING OPERATIONS
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Save or update an LLM rating for a strand
 */
export async function saveLLMStrandRating(
  rating: Omit<LocalLLMStrandRating, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
): Promise<LocalLLMStrandRating> {
  const db = await getLocalCodexDb()
  const now = new Date().toISOString()

  // Check if LLM rating exists for this strand
  const existing = rating.id
    ? await db.get<{ id: string; created_at: string }>(
        'SELECT id, created_at FROM llm_strand_ratings WHERE id = ?',
        [rating.id]
      )
    : await db.get<{ id: string; created_at: string }>(
        'SELECT id, created_at FROM llm_strand_ratings WHERE strand_id = ?',
        [rating.strandId]
      )

  const id = rating.id || existing?.id || `llm-${generateRatingId()}`
  const createdAt = existing?.created_at || now

  // Serialize arrays to JSON
  const suggestionsJson = rating.suggestions ? JSON.stringify(rating.suggestions) : null
  const comparedToJson = rating.comparedTo ? JSON.stringify(rating.comparedTo) : null

  await db.run(
    `INSERT OR REPLACE INTO llm_strand_ratings
     (id, strand_id, strand_path, overall_score, quality_score, completeness_score, accuracy_score,
      clarity_score, relevance_score, depth_score, reasoning, suggestions, compared_to, model_used,
      created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      rating.strandId,
      rating.strandPath,
      rating.overallScore,
      rating.qualityScore ?? null,
      rating.completenessScore ?? null,
      rating.accuracyScore ?? null,
      rating.clarityScore ?? null,
      rating.relevanceScore ?? null,
      rating.depthScore ?? null,
      rating.reasoning || null,
      suggestionsJson,
      comparedToJson,
      rating.modelUsed || null,
      createdAt,
      now,
    ]
  )

  return {
    id,
    strandId: rating.strandId,
    strandPath: rating.strandPath,
    overallScore: rating.overallScore,
    qualityScore: rating.qualityScore,
    completenessScore: rating.completenessScore,
    accuracyScore: rating.accuracyScore,
    clarityScore: rating.clarityScore,
    relevanceScore: rating.relevanceScore,
    depthScore: rating.depthScore,
    reasoning: rating.reasoning,
    suggestions: rating.suggestions,
    comparedTo: rating.comparedTo,
    modelUsed: rating.modelUsed,
    createdAt,
    updatedAt: now,
  }
}

/**
 * Get LLM rating for a strand
 */
export async function getLLMStrandRating(strandId: string): Promise<LocalLLMStrandRating | null> {
  const db = await getLocalCodexDb()
  const row = await db.get<{
    id: string
    strand_id: string
    strand_path: string
    overall_score: number
    quality_score: number | null
    completeness_score: number | null
    accuracy_score: number | null
    clarity_score: number | null
    relevance_score: number | null
    depth_score: number | null
    reasoning: string | null
    suggestions: string | null
    compared_to: string | null
    model_used: string | null
    created_at: string
    updated_at: string
  }>('SELECT * FROM llm_strand_ratings WHERE strand_id = ?', [strandId])

  if (!row) return null

  // Parse JSON arrays
  let suggestions: string[] | undefined
  let comparedTo: string[] | undefined
  try {
    suggestions = row.suggestions ? JSON.parse(row.suggestions) : undefined
    comparedTo = row.compared_to ? JSON.parse(row.compared_to) : undefined
  } catch {
    // Ignore parse errors
  }

  return {
    id: row.id,
    strandId: row.strand_id,
    strandPath: row.strand_path,
    overallScore: row.overall_score,
    qualityScore: row.quality_score ?? undefined,
    completenessScore: row.completeness_score ?? undefined,
    accuracyScore: row.accuracy_score ?? undefined,
    clarityScore: row.clarity_score ?? undefined,
    relevanceScore: row.relevance_score ?? undefined,
    depthScore: row.depth_score ?? undefined,
    reasoning: row.reasoning || undefined,
    suggestions,
    comparedTo,
    modelUsed: row.model_used || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

/**
 * Get LLM rating by strand path
 */
export async function getLLMStrandRatingByPath(strandPath: string): Promise<LocalLLMStrandRating | null> {
  const db = await getLocalCodexDb()
  const row = await db.get<{
    id: string
    strand_id: string
    strand_path: string
    overall_score: number
    quality_score: number | null
    completeness_score: number | null
    accuracy_score: number | null
    clarity_score: number | null
    relevance_score: number | null
    depth_score: number | null
    reasoning: string | null
    suggestions: string | null
    compared_to: string | null
    model_used: string | null
    created_at: string
    updated_at: string
  }>('SELECT * FROM llm_strand_ratings WHERE strand_path = ?', [strandPath])

  if (!row) return null

  // Parse JSON arrays
  let suggestions: string[] | undefined
  let comparedTo: string[] | undefined
  try {
    suggestions = row.suggestions ? JSON.parse(row.suggestions) : undefined
    comparedTo = row.compared_to ? JSON.parse(row.compared_to) : undefined
  } catch {
    // Ignore parse errors
  }

  return {
    id: row.id,
    strandId: row.strand_id,
    strandPath: row.strand_path,
    overallScore: row.overall_score,
    qualityScore: row.quality_score ?? undefined,
    completenessScore: row.completeness_score ?? undefined,
    accuracyScore: row.accuracy_score ?? undefined,
    clarityScore: row.clarity_score ?? undefined,
    relevanceScore: row.relevance_score ?? undefined,
    depthScore: row.depth_score ?? undefined,
    reasoning: row.reasoning || undefined,
    suggestions,
    comparedTo,
    modelUsed: row.model_used || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

/**
 * List all LLM ratings
 */
export async function listLLMStrandRatings(options?: {
  limit?: number
  offset?: number
  minScore?: number
  maxScore?: number
  orderBy?: 'overall_score' | 'created_at' | 'updated_at'
  order?: 'asc' | 'desc'
}): Promise<LocalLLMStrandRating[]> {
  const db = await getLocalCodexDb()
  const limit = options?.limit || 100
  const offset = options?.offset || 0
  const orderBy = options?.orderBy || 'updated_at'
  const order = options?.order || 'desc'

  let query = 'SELECT * FROM llm_strand_ratings WHERE 1=1'
  const params: unknown[] = []

  if (options?.minScore !== undefined) {
    query += ' AND overall_score >= ?'
    params.push(options.minScore)
  }

  if (options?.maxScore !== undefined) {
    query += ' AND overall_score <= ?'
    params.push(options.maxScore)
  }

  query += ` ORDER BY ${orderBy} ${order.toUpperCase()} LIMIT ? OFFSET ?`
  params.push(limit, offset)

  const rows = await db.all<{
    id: string
    strand_id: string
    strand_path: string
    overall_score: number
    quality_score: number | null
    completeness_score: number | null
    accuracy_score: number | null
    clarity_score: number | null
    relevance_score: number | null
    depth_score: number | null
    reasoning: string | null
    suggestions: string | null
    compared_to: string | null
    model_used: string | null
    created_at: string
    updated_at: string
  }>(query, params)

  return rows.map((row) => {
    // Parse JSON arrays
    let suggestions: string[] | undefined
    let comparedTo: string[] | undefined
    try {
      suggestions = row.suggestions ? JSON.parse(row.suggestions) : undefined
      comparedTo = row.compared_to ? JSON.parse(row.compared_to) : undefined
    } catch {
      // Ignore parse errors
    }

    return {
      id: row.id,
      strandId: row.strand_id,
      strandPath: row.strand_path,
      overallScore: row.overall_score,
      qualityScore: row.quality_score ?? undefined,
      completenessScore: row.completeness_score ?? undefined,
      accuracyScore: row.accuracy_score ?? undefined,
      clarityScore: row.clarity_score ?? undefined,
      relevanceScore: row.relevance_score ?? undefined,
      depthScore: row.depth_score ?? undefined,
      reasoning: row.reasoning || undefined,
      suggestions,
      comparedTo,
      modelUsed: row.model_used || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  })
}

/**
 * Delete an LLM rating
 */
export async function deleteLLMStrandRating(id: string): Promise<boolean> {
  const db = await getLocalCodexDb()
  const result = await db.run('DELETE FROM llm_strand_ratings WHERE id = ?', [id])
  return result.changes > 0
}

/**
 * Delete LLM rating for a strand
 */
export async function deleteLLMStrandRatingByStrand(strandId: string): Promise<boolean> {
  const db = await getLocalCodexDb()
  const result = await db.run('DELETE FROM llm_strand_ratings WHERE strand_id = ?', [strandId])
  return result.changes > 0
}

/**
 * Get rating statistics
 */
export async function getRatingStats(): Promise<{
  userRatingsCount: number
  llmRatingsCount: number
  averageUserRating: number | null
  averageLLMScore: number | null
  ratedStrandsCount: number
}> {
  const db = await getLocalCodexDb()

  const [userStats, llmStats, ratedStrands] = await Promise.all([
    db.get<{ count: number; avg: number | null }>(
      'SELECT COUNT(*) as count, AVG(rating) as avg FROM strand_ratings WHERE dimension IS NULL'
    ),
    db.get<{ count: number; avg: number | null }>(
      'SELECT COUNT(*) as count, AVG(overall_score) as avg FROM llm_strand_ratings'
    ),
    db.get<{ count: number }>(
      `SELECT COUNT(DISTINCT strand_id) as count FROM (
        SELECT strand_id FROM strand_ratings
        UNION
        SELECT strand_id FROM llm_strand_ratings
      )`
    ),
  ])

  return {
    userRatingsCount: userStats?.count || 0,
    llmRatingsCount: llmStats?.count || 0,
    averageUserRating: userStats?.avg || null,
    averageLLMScore: llmStats?.avg || null,
    ratedStrandsCount: ratedStrands?.count || 0,
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   UTILITY FUNCTIONS
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Get storage statistics
 */
export async function getStorageStats(): Promise<{
  strandCount: number
  noteCount: number
  bookmarkCount: number
  glossaryTermCount: number
  userRatingCount: number
  llmRatingCount: number
  platform: string
}> {
  const db = await getLocalCodexDb()

  const [strands, notes, bookmarks, glossaryTerms, userRatings, llmRatings] = await Promise.all([
    db.get<{ count: number }>('SELECT COUNT(*) as count FROM strands'),
    db.get<{ count: number }>('SELECT COUNT(*) as count FROM notes'),
    db.get<{ count: number }>('SELECT COUNT(*) as count FROM bookmarks'),
    db.get<{ count: number }>('SELECT COUNT(*) as count FROM glossary_terms'),
    db.get<{ count: number }>('SELECT COUNT(*) as count FROM strand_ratings'),
    db.get<{ count: number }>('SELECT COUNT(*) as count FROM llm_strand_ratings'),
  ])

  return {
    strandCount: strands?.count || 0,
    noteCount: notes?.count || 0,
    bookmarkCount: bookmarks?.count || 0,
    glossaryTermCount: glossaryTerms?.count || 0,
    userRatingCount: userRatings?.count || 0,
    llmRatingCount: llmRatings?.count || 0,
    platform: getPlatform(),
  }
}

/**
 * Close the database connection
 */
export async function closeLocalCodexDb(): Promise<void> {
  if (db) {
    await db.close()
    db = null
    dbPromise = null
  }
}

/**
 * Clear all local data (use with caution)
 */
export async function clearLocalCodex(): Promise<void> {
  const database = await getLocalCodexDb()
  await database.exec(`
    DELETE FROM jobs;
    DELETE FROM llm_strand_ratings;
    DELETE FROM strand_ratings;
    DELETE FROM glossary_terms;
    DELETE FROM bookmarks;
    DELETE FROM notes;
    DELETE FROM strands;
  `)
}

/* ═══════════════════════════════════════════════════════════════════════════
   BACKGROUND JOB OPERATIONS
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Stored job row from database
 */
export interface StoredJob {
  id: string
  type: string
  status: string
  progress: number
  message: string
  payload: string
  result?: string
  error?: string
  created_at: string
  started_at?: string
  completed_at?: string
}

/**
 * Save or update a job
 */
export async function saveJob(job: StoredJob): Promise<StoredJob> {
  const db = await getLocalCodexDb()
  
  await db.run(
    `INSERT OR REPLACE INTO jobs
     (id, type, status, progress, message, payload, result, error, created_at, started_at, completed_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      job.id,
      job.type,
      job.status,
      job.progress,
      job.message,
      job.payload,
      job.result || null,
      job.error || null,
      job.created_at,
      job.started_at || null,
      job.completed_at || null,
    ]
  )
  
  return job
}

/**
 * Get a job by ID
 */
export async function getJob(id: string): Promise<StoredJob | null> {
  const db = await getLocalCodexDb()
  const row = await db.get<StoredJob>('SELECT * FROM jobs WHERE id = ?', [id])
  return row || null
}

/**
 * List jobs with optional filters
 */
export async function listJobs(options?: {
  status?: string | string[]
  type?: string | string[]
  limit?: number
  offset?: number
  orderBy?: 'created_at' | 'started_at' | 'completed_at'
  order?: 'asc' | 'desc'
}): Promise<StoredJob[]> {
  const db = await getLocalCodexDb()
  const limit = options?.limit || 100
  const offset = options?.offset || 0
  const orderBy = options?.orderBy || 'created_at'
  const order = options?.order || 'desc'
  
  let query = 'SELECT * FROM jobs WHERE 1=1'
  const params: unknown[] = []
  
  if (options?.status) {
    if (Array.isArray(options.status)) {
      query += ` AND status IN (${options.status.map(() => '?').join(',')})`
      params.push(...options.status)
    } else {
      query += ' AND status = ?'
      params.push(options.status)
    }
  }
  
  if (options?.type) {
    if (Array.isArray(options.type)) {
      query += ` AND type IN (${options.type.map(() => '?').join(',')})`
      params.push(...options.type)
    } else {
      query += ' AND type = ?'
      params.push(options.type)
    }
  }
  
  query += ` ORDER BY ${orderBy} ${order.toUpperCase()} LIMIT ? OFFSET ?`
  params.push(limit, offset)
  
  const rows = await db.all<StoredJob>(query, params)
  return rows || []
}

/**
 * Update job progress
 */
export async function updateJobProgress(
  id: string,
  progress: number,
  message: string
): Promise<boolean> {
  const db = await getLocalCodexDb()
  const result = await db.run(
    'UPDATE jobs SET progress = ?, message = ? WHERE id = ?',
    [progress, message, id]
  )
  return result.changes > 0
}

/**
 * Update job status
 */
export async function updateJobStatus(
  id: string,
  status: string,
  updates?: {
    progress?: number
    message?: string
    result?: string
    error?: string
    started_at?: string
    completed_at?: string
  }
): Promise<boolean> {
  const db = await getLocalCodexDb()
  
  let query = 'UPDATE jobs SET status = ?'
  const params: unknown[] = [status]
  
  if (updates?.progress !== undefined) {
    query += ', progress = ?'
    params.push(updates.progress)
  }
  if (updates?.message !== undefined) {
    query += ', message = ?'
    params.push(updates.message)
  }
  if (updates?.result !== undefined) {
    query += ', result = ?'
    params.push(updates.result)
  }
  if (updates?.error !== undefined) {
    query += ', error = ?'
    params.push(updates.error)
  }
  if (updates?.started_at !== undefined) {
    query += ', started_at = ?'
    params.push(updates.started_at)
  }
  if (updates?.completed_at !== undefined) {
    query += ', completed_at = ?'
    params.push(updates.completed_at)
  }
  
  query += ' WHERE id = ?'
  params.push(id)
  
  const result = await db.run(query, params)
  return result.changes > 0
}

/**
 * Delete a job
 */
export async function deleteJob(id: string): Promise<boolean> {
  const db = await getLocalCodexDb()
  const result = await db.run('DELETE FROM jobs WHERE id = ?', [id])
  return result.changes > 0
}

/**
 * Delete completed/failed jobs older than a certain time
 */
export async function cleanupOldJobs(olderThanMs: number = 24 * 60 * 60 * 1000): Promise<number> {
  const db = await getLocalCodexDb()
  const cutoff = new Date(Date.now() - olderThanMs).toISOString()
  
  const result = await db.run(
    `DELETE FROM jobs 
     WHERE status IN ('completed', 'failed', 'cancelled') 
     AND created_at < ?`,
    [cutoff]
  )
  return result.changes
}

/**
 * Get pending jobs (for resuming on startup)
 */
export async function getPendingJobs(): Promise<StoredJob[]> {
  return listJobs({ status: ['pending', 'running'], orderBy: 'created_at', order: 'asc' })
}

/**
 * Get job counts by status
 */
export async function getJobStats(): Promise<Record<string, number>> {
  const db = await getLocalCodexDb()
  const rows = await db.all<{ status: string; count: number }>(
    'SELECT status, COUNT(*) as count FROM jobs GROUP BY status'
  )
  
  const stats: Record<string, number> = {
    pending: 0,
    running: 0,
    completed: 0,
    failed: 0,
    cancelled: 0,
  }
  
  for (const row of rows || []) {
    stats[row.status] = row.count
  }
  
  return stats
}

/* ═══════════════════════════════════════════════════════════════════════════
   SIMPLE KEY-VALUE STORAGE (IndexedDB wrapper)
═══════════════════════════════════════════════════════════════════════════ */

const KV_DB_NAME = 'quarry-kv-store'
const KV_STORE_NAME = 'keyvalue'
const KV_DB_VERSION = 1

/**
 * Get or create the IndexedDB for key-value storage
 */
async function getKVDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB not available'))
      return
    }

    const request = indexedDB.open(KV_DB_NAME, KV_DB_VERSION)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(KV_STORE_NAME)) {
        db.createObjectStore(KV_STORE_NAME)
      }
    }
  })
}

/**
 * Save a value to IndexedDB key-value store
 */
export async function saveToIndexedDB<T>(key: string, value: T): Promise<void> {
  try {
    const db = await getKVDatabase()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(KV_STORE_NAME, 'readwrite')
      const store = transaction.objectStore(KV_STORE_NAME)
      const request = store.put(value, key)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
      transaction.oncomplete = () => db.close()
    })
  } catch (error) {
    console.warn('[LocalCodex] saveToIndexedDB failed:', error)
  }
}

/**
 * Get a value from IndexedDB key-value store
 */
export async function getFromIndexedDB<T>(key: string): Promise<T | null> {
  try {
    const db = await getKVDatabase()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(KV_STORE_NAME, 'readonly')
      const store = transaction.objectStore(KV_STORE_NAME)
      const request = store.get(key)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result ?? null)
      transaction.oncomplete = () => db.close()
    })
  } catch (error) {
    console.warn('[LocalCodex] getFromIndexedDB failed:', error)
    return null
  }
}

/**
 * Delete a value from IndexedDB key-value store
 */
export async function deleteFromIndexedDB(key: string): Promise<void> {
  try {
    const db = await getKVDatabase()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(KV_STORE_NAME, 'readwrite')
      const store = transaction.objectStore(KV_STORE_NAME)
      const request = store.delete(key)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
      transaction.oncomplete = () => db.close()
    })
  } catch (error) {
    console.warn('[LocalCodex] deleteFromIndexedDB failed:', error)
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   EXPORTS
═══════════════════════════════════════════════════════════════════════════ */

export default {
  // Database
  getLocalCodexDb,
  closeLocalCodexDb,
  clearLocalCodex,
  getStorageStats,
  // Strands
  saveStrand,
  getStrandByPath,
  getStrandById,
  listStrands,
  deleteStrand,
  searchStrands,
  // Notes
  addNote,
  getNotesForStrand,
  updateNote,
  deleteNote,
  // Bookmarks
  addLocalBookmark,
  getLocalBookmarks,
  deleteLocalBookmark,
  // Glossary Terms
  saveGlossaryTerm,
  saveGlossaryTermsBatch,
  getGlossaryTermById,
  listGlossaryTerms,
  getGlossaryTermsByStrand,
  getGlossaryCategories,
  getGlossaryStats,
  deleteGlossaryTerm,
  deleteGlossaryTermsByStrand,
  clearGlossaryTerms,
  // User Strand Ratings
  saveStrandRating,
  getStrandRating,
  getStrandRatings,
  listStrandRatings,
  deleteStrandRating,
  deleteStrandRatingsByStrand,
  // LLM Strand Ratings
  saveLLMStrandRating,
  getLLMStrandRating,
  getLLMStrandRatingByPath,
  listLLMStrandRatings,
  deleteLLMStrandRating,
  deleteLLMStrandRatingByStrand,
  getRatingStats,
  // Background Jobs
  saveJob,
  getJob,
  listJobs,
  updateJobProgress,
  updateJobStatus,
  deleteJob,
  cleanupOldJobs,
  getPendingJobs,
  getJobStats,
  // Key-Value Store
  saveToIndexedDB,
  getFromIndexedDB,
  deleteFromIndexedDB,
}
