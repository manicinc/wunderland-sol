/**
 * Quarry Codex Database
 *
 * Centralized SQL database for all Codex client-side data:
 * - Embeddings (semantic search - offline capable!)
 * - Search history
 * - Reading progress
 * - Drafts
 * - User preferences
 * - Cached content
 * - Audit logging & undo/redo
 *
 * Uses @framers/sql-storage-adapter with IndexedDB for persistence.
 * Falls back gracefully to memory for SSR/unsupported browsers.
 *
 * @module lib/codexDatabase
 */

import type { StorageAdapter } from '@framers/sql-storage-adapter'
import { initAuditSchema } from './audit/auditDatabase'

// ============================================================================
// TYPES
// ============================================================================

export interface EmbeddingRecord {
  id: string
  path: string
  title: string
  content: string
  contentType: 'strand' | 'section' | 'paragraph' | 'code'
  embedding: number[] // 384-dim vector
  weave?: string
  loom?: string
  tags?: string[]
  lastModified?: string
  createdAt: string
}

export interface SearchHistoryRecord {
  id: string
  query: string
  resultCount: number
  clickedPath?: string
  timestamp: string
}

export interface ReadingProgressRecord {
  path: string
  scrollPosition: number
  readPercentage: number
  lastReadAt: string
  totalReadTime: number // seconds
  completed: boolean
}

export interface DraftRecord {
  id: string
  type: 'strand' | 'weave' | 'loom'
  path: string
  title: string
  content: string
  metadata: string // JSON
  createdAt: string
  updatedAt: string
  autoSaved: boolean
}

export interface BookmarkRecord {
  id: string
  path: string
  title: string
  excerpt?: string
  tags?: string[]
  createdAt: string
}

// ============================================================================
// CONTENT STORAGE TYPES (Full SQLite Backend)
// ============================================================================

export interface FabricRecord {
  id: string
  name: string
  description?: string
  githubOwner?: string
  githubRepo?: string
  githubBranch?: string
  lastSyncAt?: string
  syncHash?: string
  createdAt: string
  updatedAt: string
}

export interface WeaveRecord {
  id: string
  fabricId: string
  slug: string
  name: string
  description?: string
  path: string
  strandCount: number
  loomCount: number
  sortOrder: number
  /** Cover image URL or data URL */
  coverImage?: string
  /** Generated pattern type (geometric, waves, mesh, etc.) */
  coverPattern?: string
  /** Primary color for generated covers */
  coverColor?: string
  /** Icon emoji */
  emoji?: string
  /** UI accent color */
  accentColor?: string
  /** Visibility setting */
  visibility?: 'private' | 'shared' | 'public'
  /** Whether marked as favorite */
  isFavorite?: boolean
  createdAt: string
  updatedAt: string
}

export interface LoomRecord {
  id: string
  weaveId: string
  parentLoomId?: string
  slug: string
  name: string
  description?: string
  path: string
  depth: number
  strandCount: number
  sortOrder: number
  /** Cover image URL or data URL */
  coverImage?: string
  /** Generated pattern type (geometric, waves, mesh, etc.) */
  coverPattern?: string
  /** Primary color for generated covers */
  coverColor?: string
  /** Icon emoji */
  emoji?: string
  /** UI accent color */
  accentColor?: string
  createdAt: string
  updatedAt: string
}

export interface StrandRecord {
  id: string
  weaveId: string
  loomId?: string
  slug: string
  title: string
  path: string
  content: string
  contentHash?: string
  wordCount: number
  frontmatter?: Record<string, unknown>
  version?: string
  difficulty?: string
  status: 'draft' | 'published' | 'archived'
  subjects?: string[]
  topics?: string[]
  tags?: string[]
  prerequisites?: string[]
  references?: string[]
  summary?: string
  githubSha?: string
  githubUrl?: string
  createdAt: string
  updatedAt: string
  lastIndexedAt?: string
}

export interface SyncStatusRecord {
  id: string
  lastFullSync?: string
  lastIncrementalSync?: string
  remoteTreeSha?: string
  localVersion: number
  pendingChanges: number
  syncErrors?: string[]
  createdAt: string
  updatedAt: string
}

// ============================================================================
// ZETTELKASTEN RELATIONSHIP TYPES
// ============================================================================

/**
 * Semantic relationship types for link context
 */
export type StrandRelationType =
  | 'extends'
  | 'contrasts'
  | 'supports'
  | 'example-of'
  | 'implements'
  | 'questions'
  | 'refines'
  | 'applies'
  | 'summarizes'
  | 'prerequisite'
  | 'related'
  | 'follows'
  | 'references'
  | 'contradicts'
  | 'updates'
  | 'custom'

/**
 * Record for strand-to-strand typed relationship with context
 */
export interface StrandRelationshipRecord {
  id: string
  sourceStrandPath: string
  sourceStrandId?: string
  targetStrandPath: string
  targetStrandId?: string
  relationType: StrandRelationType
  context?: string
  sourceBlockId?: string
  bidirectional?: boolean
  strength?: number
  autoDetected?: boolean
  createdAt: string
  updatedAt: string
}

export interface DatabaseStats {
  embeddings: number
  searchHistory: number
  readingProgress: number
  drafts: number
  bookmarks: number
  totalSizeKB: number
}

// ============================================================================
// DATABASE SINGLETON
// ============================================================================

const isBrowser = typeof window !== 'undefined'
const isNode = typeof process !== 'undefined' && !!process.versions?.node && !isBrowser

// Browser database (IndexedDB)
let db: StorageAdapter | null = null
let dbPromise: Promise<StorageAdapter | null> | null = null
let schemaInitialized = false

// Server database (SQLite via better-sqlite3)
let serverDb: StorageAdapter | null = null
let serverDbPromise: Promise<StorageAdapter | null> | null = null
let serverSchemaInitialized = false

/**
 * Get the database path for server-side use
 */
function getServerDatabasePath(): string | null {
  // Check for explicit DATABASE_PATH environment variable
  if (process.env.DATABASE_PATH) return process.env.DATABASE_PATH
  // Default for development/testing
  if (process.env.NODE_ENV !== 'production') return './data/quarry-api.db'
  // In production, require explicit configuration
  return null
}

/**
 * Get or create the database instance
 *
 * Exported for use by content management layer.
 * Automatically selects browser (IndexedDB) or server (SQLite) based on environment.
 */
export async function getDatabase(): Promise<StorageAdapter | null> {
  // Browser environment: use IndexedDB
  if (isBrowser) {
    if (db) return db
    if (!dbPromise) {
      dbPromise = initDatabase()
    }
    return dbPromise
  }

  // Node.js server environment: use SQLite
  if (isNode) {
    if (serverDb) return serverDb
    if (!serverDbPromise) {
      serverDbPromise = initServerDatabase()
    }
    return serverDbPromise
  }

  // Unknown environment
  return null
}

/**
 * Initialize database with all tables
 */
async function initDatabase(): Promise<StorageAdapter | null> {
  try {
    const { createDatabase } = await import('@framers/sql-storage-adapter')
    
    db = await createDatabase({
      priority: ['indexeddb', 'sqljs'],
      indexedDb: {
        dbName: 'fabric_codex_db',
        autoSave: true,
        saveIntervalMs: 3000,
        sqlJsConfig: {
          locateFile: (file: string) => {
            // Use absolute URL to avoid path resolution issues on nested routes like /quarry/some-page
            const origin = typeof window !== 'undefined' ? window.location.origin : ''
            return `${origin}/wasm/${file}`
          },
        },
      },
    })
    
    if (!schemaInitialized) {
      await initSchema()
      await ensureDefaultContent()
      schemaInitialized = true

      // Auto-queue stale strands for background NLP processing (non-blocking)
      // This runs after a short delay to allow the UI to become responsive first
      // Respects user settings - can be disabled via ML Auto-Trigger Settings
      setTimeout(async () => {
        try {
          const { getMLAutoTriggerSettings } = await import('./settings/mlAutoTriggerSettings')
          const settings = getMLAutoTriggerSettings()

          // Only run if automatic processing is enabled
          if (!settings.enabled) {
            return
          }

          const { queueStaleStrandsForProcessing } = await import('./jobs/batchBlockProcessing')
          const { jobQueue } = await import('./jobs/jobQueue')
          const { registerReindexProcessors } = await import('./jobs/reindexStrand')

          // Ensure job queue and processors are initialized
          await jobQueue.initialize()
          registerReindexProcessors()

          const result = await queueStaleStrandsForProcessing({ limit: 50 })
          if (result.queued > 0) {
            console.log(`[CodexDB] Auto-queued ${result.queued} stale strands for NLP processing`)
          }
        } catch (error) {
          console.warn('[CodexDB] Failed to auto-queue stale strands:', error)
        }
      }, 2000)
    }

    console.log('[CodexDB] ✅ Database initialized with IndexedDB persistence')
    return db
  } catch (error) {
    console.warn('[CodexDB] Failed to initialize, using memory fallback:', error)
    return null
  }
}

/**
 * Initialize server-side SQLite database
 * Uses better-sqlite3 via @framers/sql-storage-adapter
 */
async function initServerDatabase(): Promise<StorageAdapter | null> {
  const dbPath = getServerDatabasePath()
  if (!dbPath) {
    console.warn('[CodexDB] No DATABASE_PATH configured for server-side database')
    return null
  }

  try {
    // Ensure the directory exists
    const path = await import('path')
    const fs = await import('fs')
    const dir = path.dirname(dbPath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
      console.log(`[CodexDB] Created database directory: ${dir}`)
    }

    const { createDatabase } = await import('@framers/sql-storage-adapter')

    serverDb = await createDatabase({
      file: dbPath,
      priority: ['better-sqlite3'],
    })

    if (!serverSchemaInitialized) {
      await initSchema(serverDb)
      await ensureDefaultContent(serverDb)
      serverSchemaInitialized = true
    }

    console.log(`[CodexDB] ✅ Server database initialized: ${dbPath}`)
    return serverDb
  } catch (error) {
    console.error('[CodexDB] Failed to initialize server database:', error)
    serverDbPromise = null
    return null
  }
}

/**
 * Close server database connection (for graceful shutdown)
 */
export async function closeServerDatabase(): Promise<void> {
  if (serverDb) {
    try {
      // The StorageAdapter may have a close method
      if ('close' in serverDb && typeof serverDb.close === 'function') {
        await serverDb.close()
      }
      console.log('[CodexDB] Server database connection closed')
    } catch (error) {
      console.error('[CodexDB] Error closing server database:', error)
    }
    serverDb = null
    serverDbPromise = null
    serverSchemaInitialized = false
  }
}

/**
 * Safely add a column to a table if it doesn't already exist
 * (Used for schema migrations)
 */
async function addColumnIfNotExists(
  database: StorageAdapter,
  tableName: string,
  columnName: string,
  columnDef: string
): Promise<void> {
  try {
    // Check if column exists by querying table info
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const columns = await database.all(
      `PRAGMA table_info(${tableName})`
    ) as Array<{ name: string }> | null
    
    const exists = columns?.some(col => col.name === columnName)
    if (!exists) {
      await database.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDef}`)
    }
  } catch {
    // Column might already exist or table might not exist yet - both are ok
  }
}

/**
 * Initialize all database tables
 */
async function initSchema(targetDb?: StorageAdapter): Promise<void> {
  const database = targetDb || db
  if (!database) return

  // Embeddings table for semantic search
  await database.exec(`
    CREATE TABLE IF NOT EXISTS embeddings (
      id TEXT PRIMARY KEY,
      path TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      content_type TEXT NOT NULL,
      embedding TEXT NOT NULL,
      weave TEXT,
      loom TEXT,
      tags TEXT,
      last_modified TEXT,
      created_at TEXT NOT NULL
    )
  `)
  
  // Create index for path lookups
  await database.exec(`
    CREATE INDEX IF NOT EXISTS idx_embeddings_path ON embeddings(path)
  `)
  
  // Search history table
  await database.exec(`
    CREATE TABLE IF NOT EXISTS search_history (
      id TEXT PRIMARY KEY,
      query TEXT NOT NULL,
      result_count INTEGER NOT NULL,
      clicked_path TEXT,
      timestamp TEXT NOT NULL
    )
  `)
  
  // Reading progress table
  await database.exec(`
    CREATE TABLE IF NOT EXISTS reading_progress (
      path TEXT PRIMARY KEY,
      scroll_position REAL NOT NULL,
      read_percentage REAL NOT NULL,
      last_read_at TEXT NOT NULL,
      total_read_time INTEGER NOT NULL,
      completed INTEGER NOT NULL
    )
  `)
  
  // Drafts table
  await database.exec(`
    CREATE TABLE IF NOT EXISTS drafts (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      path TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      metadata TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      auto_saved INTEGER NOT NULL
    )
  `)
  
  // Bookmarks table
  await database.exec(`
    CREATE TABLE IF NOT EXISTS bookmarks (
      id TEXT PRIMARY KEY,
      path TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      excerpt TEXT,
      tags TEXT,
      created_at TEXT NOT NULL
    )
  `)

  // ========================================================================
  // CONTENT STORAGE TABLES (Full SQLite Backend)
  // ========================================================================

  // Metadata table (key-value store for schema versioning, settings, etc.)
  await database.exec(`
    CREATE TABLE IF NOT EXISTS metadata (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at TEXT NOT NULL
    )
  `)

  // Fabrics table (entire knowledge repository)
  await database.exec(`
    CREATE TABLE IF NOT EXISTS fabrics (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      github_owner TEXT,
      github_repo TEXT,
      github_branch TEXT DEFAULT 'main',
      last_sync_at TEXT,
      sync_hash TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `)

  // Weaves table (top-level knowledge universes)
  await database.exec(`
    CREATE TABLE IF NOT EXISTS weaves (
      id TEXT PRIMARY KEY,
      fabric_id TEXT NOT NULL,
      slug TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      path TEXT NOT NULL UNIQUE,
      strand_count INTEGER DEFAULT 0,
      loom_count INTEGER DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (fabric_id) REFERENCES fabrics(id) ON DELETE CASCADE
    )
  `)
  await database.exec(`CREATE INDEX IF NOT EXISTS idx_weaves_fabric ON weaves(fabric_id)`)
  await database.exec(`CREATE INDEX IF NOT EXISTS idx_weaves_path ON weaves(path)`)

  // Add cover columns to weaves (migration for existing databases)
  await addColumnIfNotExists(database, 'weaves', 'cover_image', 'TEXT')
  await addColumnIfNotExists(database, 'weaves', 'cover_pattern', 'TEXT')
  await addColumnIfNotExists(database, 'weaves', 'cover_color', 'TEXT')
  await addColumnIfNotExists(database, 'weaves', 'emoji', 'TEXT')
  await addColumnIfNotExists(database, 'weaves', 'accent_color', 'TEXT')
  await addColumnIfNotExists(database, 'weaves', 'visibility', 'TEXT DEFAULT \'private\'')
  await addColumnIfNotExists(database, 'weaves', 'is_favorite', 'INTEGER DEFAULT 0')

  // Looms table (subdirectories within weaves)
  await database.exec(`
    CREATE TABLE IF NOT EXISTS looms (
      id TEXT PRIMARY KEY,
      weave_id TEXT NOT NULL,
      parent_loom_id TEXT,
      slug TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      path TEXT NOT NULL UNIQUE,
      depth INTEGER NOT NULL DEFAULT 1,
      strand_count INTEGER DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (weave_id) REFERENCES weaves(id) ON DELETE CASCADE,
      FOREIGN KEY (parent_loom_id) REFERENCES looms(id) ON DELETE CASCADE
    )
  `)
  await database.exec(`CREATE INDEX IF NOT EXISTS idx_looms_weave ON looms(weave_id)`)
  await database.exec(`CREATE INDEX IF NOT EXISTS idx_looms_parent ON looms(parent_loom_id)`)
  await database.exec(`CREATE INDEX IF NOT EXISTS idx_looms_path ON looms(path)`)

  // Add cover columns to looms (migration for existing databases)
  await addColumnIfNotExists(database, 'looms', 'cover_image', 'TEXT')
  await addColumnIfNotExists(database, 'looms', 'cover_pattern', 'TEXT')
  await addColumnIfNotExists(database, 'looms', 'cover_color', 'TEXT')
  await addColumnIfNotExists(database, 'looms', 'emoji', 'TEXT')
  await addColumnIfNotExists(database, 'looms', 'accent_color', 'TEXT')

  // Strands table (individual markdown documents)
  await database.exec(`
    CREATE TABLE IF NOT EXISTS strands (
      id TEXT PRIMARY KEY,
      weave_id TEXT NOT NULL,
      loom_id TEXT,
      slug TEXT NOT NULL,
      title TEXT NOT NULL,
      path TEXT NOT NULL UNIQUE,
      content TEXT NOT NULL,
      content_hash TEXT,
      word_count INTEGER DEFAULT 0,
      frontmatter TEXT,
      version TEXT,
      difficulty TEXT,
      status TEXT DEFAULT 'published',
      subjects TEXT,
      topics TEXT,
      tags TEXT,
      prerequisites TEXT,
      strand_references TEXT,
      summary TEXT,
      github_sha TEXT,
      github_url TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      last_indexed_at TEXT,
      FOREIGN KEY (weave_id) REFERENCES weaves(id) ON DELETE CASCADE,
      FOREIGN KEY (loom_id) REFERENCES looms(id) ON DELETE SET NULL
    )
  `)
  await database.exec(`CREATE INDEX IF NOT EXISTS idx_strands_weave ON strands(weave_id)`)
  await database.exec(`CREATE INDEX IF NOT EXISTS idx_strands_loom ON strands(loom_id)`)
  await database.exec(`CREATE INDEX IF NOT EXISTS idx_strands_path ON strands(path)`)
  await database.exec(`CREATE INDEX IF NOT EXISTS idx_strands_status ON strands(status)`)

  // Sync status table
  await database.exec(`
    CREATE TABLE IF NOT EXISTS sync_status (
      id TEXT PRIMARY KEY DEFAULT 'main',
      last_full_sync TEXT,
      last_incremental_sync TEXT,
      remote_tree_sha TEXT,
      local_version INTEGER DEFAULT 1,
      pending_changes INTEGER DEFAULT 0,
      sync_errors TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `)

  // Settings table (key-value store for app settings like license)
  await database.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `)

  // Glossary cache table (cached NLP/LLM-generated glossaries)
  await database.exec(`
    CREATE TABLE IF NOT EXISTS glossary_cache (
      content_hash TEXT PRIMARY KEY,
      glossary_data TEXT NOT NULL,
      generation_method TEXT NOT NULL,
      created_at TEXT NOT NULL,
      expires_at TEXT,
      version INTEGER DEFAULT 1
    )
  `)
  await database.exec(`CREATE INDEX IF NOT EXISTS idx_glossary_cache_expires ON glossary_cache(expires_at)`)

  // Flashcard generation cache (cached NLP/LLM-generated flashcards)
  await database.exec(`
    CREATE TABLE IF NOT EXISTS flashcard_cache (
      content_hash TEXT PRIMARY KEY,
      strand_slug TEXT NOT NULL,
      flashcard_data TEXT NOT NULL,
      generation_method TEXT NOT NULL,
      card_count INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      expires_at TEXT,
      version INTEGER DEFAULT 1
    )
  `)
  await database.exec(`CREATE INDEX IF NOT EXISTS idx_flashcard_cache_expires ON flashcard_cache(expires_at)`)
  await database.exec(`CREATE INDEX IF NOT EXISTS idx_flashcard_cache_strand ON flashcard_cache(strand_slug)`)

  // Quiz generation cache (cached NLP/LLM-generated quiz questions)
  await database.exec(`
    CREATE TABLE IF NOT EXISTS quiz_cache (
      content_hash TEXT PRIMARY KEY,
      quiz_data TEXT NOT NULL,
      generation_method TEXT NOT NULL,
      question_count INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      expires_at TEXT,
      version INTEGER DEFAULT 1
    )
  `)
  await database.exec(`CREATE INDEX IF NOT EXISTS idx_quiz_cache_expires ON quiz_cache(expires_at)`)

  // ========================================================================
  // USER EDITS TABLES (for inline editing of generated content)
  // ========================================================================

  // Glossary user edits (stores user modifications to auto-generated glossary terms)
  await database.exec(`
    CREATE TABLE IF NOT EXISTS codex_glossary_edits (
      id TEXT PRIMARY KEY,
      content_hash TEXT NOT NULL,
      strand_slug TEXT,
      original_term TEXT NOT NULL,
      edited_term TEXT,
      edited_definition TEXT,
      is_deleted INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(content_hash, strand_slug)
    )
  `)
  await database.exec(`CREATE INDEX IF NOT EXISTS idx_glossary_edits_strand ON codex_glossary_edits(strand_slug)`)
  await database.exec(`CREATE INDEX IF NOT EXISTS idx_glossary_edits_hash ON codex_glossary_edits(content_hash)`)
  await database.exec(`CREATE INDEX IF NOT EXISTS idx_glossary_edits_deleted ON codex_glossary_edits(is_deleted)`)

  // Quiz user edits (stores user modifications to auto-generated quiz questions)
  await database.exec(`
    CREATE TABLE IF NOT EXISTS codex_quiz_edits (
      id TEXT PRIMARY KEY,
      original_question_id TEXT NOT NULL UNIQUE,
      cache_key TEXT,
      edited_question TEXT,
      edited_answer TEXT,
      edited_options TEXT,
      edited_explanation TEXT,
      is_deleted INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `)
  await database.exec(`CREATE INDEX IF NOT EXISTS idx_quiz_edits_question ON codex_quiz_edits(original_question_id)`)
  await database.exec(`CREATE INDEX IF NOT EXISTS idx_quiz_edits_cache ON codex_quiz_edits(cache_key)`)
  await database.exec(`CREATE INDEX IF NOT EXISTS idx_quiz_edits_deleted ON codex_quiz_edits(is_deleted)`)

  // ========================================================================
  // BLOCK-LEVEL TAGGING TABLES (Phase 9)
  // ========================================================================

  // Strand blocks table (individual blocks within strands with tags and metadata)
  await database.exec(`
    CREATE TABLE IF NOT EXISTS strand_blocks (
      id TEXT PRIMARY KEY,
      strand_id TEXT NOT NULL,
      strand_path TEXT NOT NULL,
      block_id TEXT NOT NULL,
      block_type TEXT NOT NULL,
      heading_level INTEGER,
      heading_slug TEXT,
      start_line INTEGER NOT NULL,
      end_line INTEGER NOT NULL,
      raw_content TEXT,
      extractive_summary TEXT,
      tags TEXT,
      suggested_tags TEXT,
      worthiness_score REAL,
      worthiness_signals TEXT,
      warrants_illustration INTEGER DEFAULT 0,
      source_file TEXT,
      source_url TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (strand_id) REFERENCES strands(id) ON DELETE CASCADE,
      UNIQUE(strand_path, block_id)
    )
  `)
  await database.exec(`CREATE INDEX IF NOT EXISTS idx_strand_blocks_strand ON strand_blocks(strand_id)`)
  await database.exec(`CREATE INDEX IF NOT EXISTS idx_strand_blocks_path ON strand_blocks(strand_path)`)
  await database.exec(`CREATE INDEX IF NOT EXISTS idx_strand_blocks_type ON strand_blocks(block_type)`)
  await database.exec(`CREATE INDEX IF NOT EXISTS idx_strand_blocks_tags ON strand_blocks(tags)`)

  // Block references for transclusion (Phase 9 Extension)
  await database.exec(`
    CREATE TABLE IF NOT EXISTS block_references (
      id TEXT PRIMARY KEY,
      source_block_id TEXT NOT NULL,
      source_strand_path TEXT NOT NULL,
      target_strand_path TEXT NOT NULL,
      target_position INTEGER NOT NULL,
      reference_type TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (source_block_id) REFERENCES strand_blocks(id) ON DELETE CASCADE
    )
  `)
  await database.exec(`CREATE INDEX IF NOT EXISTS idx_block_refs_source ON block_references(source_block_id)`)
  await database.exec(`CREATE INDEX IF NOT EXISTS idx_block_refs_target ON block_references(target_strand_path)`)

  // Block backlinks (auto-computed for transclusion)
  await database.exec(`
    CREATE TABLE IF NOT EXISTS block_backlinks (
      id TEXT PRIMARY KEY,
      block_id TEXT NOT NULL,
      referencing_strand_path TEXT NOT NULL,
      referencing_block_id TEXT,
      context_snippet TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (block_id) REFERENCES strand_blocks(id) ON DELETE CASCADE
    )
  `)
  await database.exec(`CREATE INDEX IF NOT EXISTS idx_backlinks_block ON block_backlinks(block_id)`)

  // ========================================================================
  // STRAND RELATIONSHIPS TABLE (Zettelkasten Link Context)
  // ========================================================================

  // Typed relationships between strands with context (link context syntax)
  await database.exec(`
    CREATE TABLE IF NOT EXISTS strand_relationships (
      id TEXT PRIMARY KEY,
      source_strand_path TEXT NOT NULL,
      source_strand_id TEXT,
      target_strand_path TEXT NOT NULL,
      target_strand_id TEXT,
      relation_type TEXT NOT NULL,
      context TEXT,
      source_block_id TEXT,
      bidirectional INTEGER DEFAULT 0,
      strength REAL DEFAULT 1.0,
      auto_detected INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (source_strand_id) REFERENCES strands(id) ON DELETE CASCADE,
      FOREIGN KEY (target_strand_id) REFERENCES strands(id) ON DELETE CASCADE
    )
  `)
  await database.exec(`CREATE INDEX IF NOT EXISTS idx_strand_rels_source ON strand_relationships(source_strand_path)`)
  await database.exec(`CREATE INDEX IF NOT EXISTS idx_strand_rels_target ON strand_relationships(target_strand_path)`)
  await database.exec(`CREATE INDEX IF NOT EXISTS idx_strand_rels_type ON strand_relationships(relation_type)`)
  await database.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_strand_rels_unique ON strand_relationships(source_strand_path, target_strand_path, relation_type)`)

  // Supertag schemas (Phase 9 Extension)
  await database.exec(`
    CREATE TABLE IF NOT EXISTS supertag_schemas (
      id TEXT PRIMARY KEY,
      tag_name TEXT NOT NULL UNIQUE,
      display_name TEXT NOT NULL,
      icon TEXT,
      color TEXT,
      description TEXT,
      fields TEXT NOT NULL,
      extends TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `)

  // Supertag field values (Phase 9 Extension)
  await database.exec(`
    CREATE TABLE IF NOT EXISTS supertag_field_values (
      id TEXT PRIMARY KEY,
      block_id TEXT NOT NULL,
      supertag_id TEXT NOT NULL,
      field_name TEXT NOT NULL,
      field_value TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (block_id) REFERENCES strand_blocks(id) ON DELETE CASCADE,
      FOREIGN KEY (supertag_id) REFERENCES supertag_schemas(id) ON DELETE CASCADE,
      UNIQUE(block_id, supertag_id, field_name)
    )
  `)
  await database.exec(`CREATE INDEX IF NOT EXISTS idx_field_values_block ON supertag_field_values(block_id)`)
  await database.exec(`CREATE INDEX IF NOT EXISTS idx_field_values_supertag ON supertag_field_values(supertag_id)`)
  await database.exec(`CREATE INDEX IF NOT EXISTS idx_field_values_field ON supertag_field_values(field_name)`)

  // Saved queries (Phase 9 Extension)
  await database.exec(`
    CREATE TABLE IF NOT EXISTS saved_queries (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      query_json TEXT NOT NULL,
      is_pinned INTEGER DEFAULT 0,
      folder TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `)

  // ========================================================================
  // TEACH MODE TABLES (Feynman Technique)
  // ========================================================================

  // Teach sessions - complete teaching conversations
  await database.exec(`
    CREATE TABLE IF NOT EXISTS teach_sessions (
      id TEXT PRIMARY KEY,
      strand_slug TEXT NOT NULL,
      persona TEXT NOT NULL,
      transcript TEXT,
      gap_report TEXT,
      coverage_score REAL DEFAULT 0,
      duration_seconds INTEGER DEFAULT 0,
      xp_earned INTEGER DEFAULT 0,
      flashcards_generated TEXT,
      created_at TEXT NOT NULL,
      completed_at TEXT
    )
  `)
  await database.exec(`CREATE INDEX IF NOT EXISTS idx_teach_sessions_strand ON teach_sessions(strand_slug)`)
  await database.exec(`CREATE INDEX IF NOT EXISTS idx_teach_sessions_persona ON teach_sessions(persona)`)
  await database.exec(`CREATE INDEX IF NOT EXISTS idx_teach_sessions_created ON teach_sessions(created_at)`)

  // Teach messages - individual messages in a teaching conversation
  await database.exec(`
    CREATE TABLE IF NOT EXISTS teach_messages (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      is_voice INTEGER DEFAULT 0,
      gaps TEXT,
      timestamp TEXT NOT NULL,
      FOREIGN KEY (session_id) REFERENCES teach_sessions(id) ON DELETE CASCADE
    )
  `)
  await database.exec(`CREATE INDEX IF NOT EXISTS idx_teach_messages_session ON teach_messages(session_id)`)
  await database.exec(`CREATE INDEX IF NOT EXISTS idx_teach_messages_role ON teach_messages(role)`)

  // ========================================================================
  // PLANNER TABLES (Calendar, Tasks, Google Calendar Sync)
  // ========================================================================

  // Planner tasks - standalone, linked, and embedded tasks
  await database.exec(`
    CREATE TABLE IF NOT EXISTS planner_tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      task_type TEXT NOT NULL DEFAULT 'standalone',
      strand_path TEXT,
      source_line_number INTEGER,
      checkbox_text TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      priority TEXT DEFAULT 'medium',
      due_date TEXT,
      due_time TEXT,
      duration INTEGER,
      reminder_at TEXT,
      completed_at TEXT,
      recurrence_rule TEXT,
      recurrence_end_date TEXT,
      parent_task_id TEXT,
      tags TEXT,
      project TEXT,
      google_event_id TEXT UNIQUE,
      google_calendar_id TEXT,
      sync_status TEXT DEFAULT 'local',
      local_version INTEGER DEFAULT 1,
      remote_version INTEGER DEFAULT 0,
      last_synced_at TEXT,
      etag TEXT,
      is_deleted INTEGER DEFAULT 0,
      deleted_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (strand_path) REFERENCES strands(path) ON DELETE SET NULL,
      FOREIGN KEY (parent_task_id) REFERENCES planner_tasks(id) ON DELETE CASCADE
    )
  `)
  await database.exec(`CREATE INDEX IF NOT EXISTS idx_planner_tasks_status ON planner_tasks(status)`)
  await database.exec(`CREATE INDEX IF NOT EXISTS idx_planner_tasks_due_date ON planner_tasks(due_date)`)
  await database.exec(`CREATE INDEX IF NOT EXISTS idx_planner_tasks_strand ON planner_tasks(strand_path)`)
  await database.exec(`CREATE INDEX IF NOT EXISTS idx_planner_tasks_google ON planner_tasks(google_event_id)`)
  await database.exec(`CREATE INDEX IF NOT EXISTS idx_planner_tasks_sync ON planner_tasks(sync_status)`)
  await database.exec(`CREATE INDEX IF NOT EXISTS idx_planner_tasks_type ON planner_tasks(task_type)`)
  await database.exec(`CREATE INDEX IF NOT EXISTS idx_planner_tasks_deleted ON planner_tasks(is_deleted)`)

  // Migration: Add duration column if it doesn't exist (for existing databases)
  try {
    await database.exec(`ALTER TABLE planner_tasks ADD COLUMN duration INTEGER`)
  } catch {
    // Column already exists, ignore error
  }

  // Migration: Add timer tracking columns
  try {
    await database.exec(`ALTER TABLE planner_tasks ADD COLUMN actual_duration INTEGER`)
  } catch {
    // Column already exists
  }
  try {
    await database.exec(`ALTER TABLE planner_tasks ADD COLUMN timer_started_at TEXT`)
  } catch {
    // Column already exists
  }
  try {
    await database.exec(`ALTER TABLE planner_tasks ADD COLUMN timer_accumulated_ms INTEGER`)
  } catch {
    // Column already exists
  }

  // Planner subtasks - nested checklist items within tasks
  await database.exec(`
    CREATE TABLE IF NOT EXISTS planner_subtasks (
      id TEXT PRIMARY KEY,
      parent_task_id TEXT NOT NULL,
      title TEXT NOT NULL,
      completed INTEGER DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (parent_task_id) REFERENCES planner_tasks(id) ON DELETE CASCADE
    )
  `)
  await database.exec(`CREATE INDEX IF NOT EXISTS idx_planner_subtasks_parent ON planner_subtasks(parent_task_id)`)
  await database.exec(`CREATE INDEX IF NOT EXISTS idx_planner_subtasks_order ON planner_subtasks(parent_task_id, sort_order)`)

  // Migration: Add completed_at column to subtasks for accomplishment tracking
  try {
    await database.exec(`ALTER TABLE planner_subtasks ADD COLUMN completed_at TEXT`)
  } catch {
    // Column already exists
  }
  await database.exec(`CREATE INDEX IF NOT EXISTS idx_planner_subtasks_completed_at ON planner_subtasks(completed_at)`)

  // Planner events - calendar events with time blocks
  await database.exec(`
    CREATE TABLE IF NOT EXISTS planner_events (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      location TEXT,
      start_datetime TEXT NOT NULL,
      end_datetime TEXT NOT NULL,
      all_day INTEGER DEFAULT 0,
      timezone TEXT DEFAULT 'local',
      recurrence_rule TEXT,
      recurrence_end_date TEXT,
      parent_event_id TEXT,
      attendees TEXT,
      color TEXT,
      linked_task_id TEXT,
      strand_path TEXT,
      google_event_id TEXT UNIQUE,
      google_calendar_id TEXT,
      sync_status TEXT DEFAULT 'local',
      local_version INTEGER DEFAULT 1,
      remote_version INTEGER DEFAULT 0,
      last_synced_at TEXT,
      etag TEXT,
      is_deleted INTEGER DEFAULT 0,
      deleted_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (linked_task_id) REFERENCES planner_tasks(id) ON DELETE SET NULL,
      FOREIGN KEY (strand_path) REFERENCES strands(path) ON DELETE SET NULL,
      FOREIGN KEY (parent_event_id) REFERENCES planner_events(id) ON DELETE CASCADE
    )
  `)
  await database.exec(`CREATE INDEX IF NOT EXISTS idx_planner_events_start ON planner_events(start_datetime)`)
  await database.exec(`CREATE INDEX IF NOT EXISTS idx_planner_events_end ON planner_events(end_datetime)`)
  await database.exec(`CREATE INDEX IF NOT EXISTS idx_planner_events_google ON planner_events(google_event_id)`)
  await database.exec(`CREATE INDEX IF NOT EXISTS idx_planner_events_sync ON planner_events(sync_status)`)
  await database.exec(`CREATE INDEX IF NOT EXISTS idx_planner_events_deleted ON planner_events(is_deleted)`)

  // Planner sync state - tracks Google Calendar sync progress
  await database.exec(`
    CREATE TABLE IF NOT EXISTS planner_sync_state (
      id TEXT PRIMARY KEY DEFAULT 'main',
      google_sync_token TEXT,
      last_full_sync_at TEXT,
      last_incremental_sync_at TEXT,
      sync_cursor TEXT,
      pending_conflicts INTEGER DEFAULT 0,
      last_conflict_at TEXT,
      total_syncs INTEGER DEFAULT 0,
      successful_syncs INTEGER DEFAULT 0,
      failed_syncs INTEGER DEFAULT 0,
      last_error TEXT,
      last_error_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `)

  // Planner change log - tracks offline changes for sync
  await database.exec(`
    CREATE TABLE IF NOT EXISTS planner_change_log (
      id TEXT PRIMARY KEY,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      operation TEXT NOT NULL,
      field_changes TEXT,
      sync_status TEXT DEFAULT 'pending',
      sync_attempts INTEGER DEFAULT 0,
      last_sync_attempt_at TEXT,
      sync_error TEXT,
      sequence_number INTEGER,
      created_at TEXT NOT NULL
    )
  `)
  await database.exec(`CREATE INDEX IF NOT EXISTS idx_change_log_entity ON planner_change_log(entity_type, entity_id)`)
  await database.exec(`CREATE INDEX IF NOT EXISTS idx_change_log_status ON planner_change_log(sync_status)`)
  await database.exec(`CREATE INDEX IF NOT EXISTS idx_change_log_sequence ON planner_change_log(sequence_number)`)

  // Planner OAuth tokens - encrypted Google Calendar tokens
  await database.exec(`
    CREATE TABLE IF NOT EXISTS planner_oauth_tokens (
      id TEXT PRIMARY KEY DEFAULT 'google_calendar',
      provider TEXT NOT NULL,
      encrypted_access_token TEXT,
      encrypted_refresh_token TEXT,
      expires_at INTEGER,
      scope TEXT,
      token_type TEXT DEFAULT 'Bearer',
      user_email TEXT,
      user_id TEXT,
      selected_calendars TEXT,
      primary_calendar_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      last_used_at TEXT
    )
  `)

  // Planner calendars - cached Google Calendar list
  await database.exec(`
    CREATE TABLE IF NOT EXISTS planner_calendars (
      id TEXT PRIMARY KEY,
      google_calendar_id TEXT UNIQUE,
      name TEXT NOT NULL,
      description TEXT,
      color TEXT,
      is_primary INTEGER DEFAULT 0,
      is_selected INTEGER DEFAULT 0,
      access_role TEXT,
      last_synced_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `)
  await database.exec(`CREATE INDEX IF NOT EXISTS idx_calendars_google ON planner_calendars(google_calendar_id)`)
  await database.exec(`CREATE INDEX IF NOT EXISTS idx_calendars_selected ON planner_calendars(is_selected)`)

  // Habit streaks - tracks per-habit streak data for gamification
  await database.exec(`
    CREATE TABLE IF NOT EXISTS habit_streaks (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL UNIQUE,
      current_streak INTEGER DEFAULT 0,
      longest_streak INTEGER DEFAULT 0,
      last_completed_date TEXT,
      completion_history TEXT,
      streak_freezes_remaining INTEGER DEFAULT 1,
      freeze_active_until TEXT,
      total_completions INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (task_id) REFERENCES planner_tasks(id) ON DELETE CASCADE
    )
  `)
  await database.exec(`CREATE INDEX IF NOT EXISTS idx_habit_streaks_task ON habit_streaks(task_id)`)
  await database.exec(`CREATE INDEX IF NOT EXISTS idx_habit_streaks_streak ON habit_streaks(current_streak)`)

  // Planner preferences - user settings for planner
  await database.exec(`
    CREATE TABLE IF NOT EXISTS planner_preferences (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `)

  // Event reminders - multiple reminders per event
  await database.exec(`
    CREATE TABLE IF NOT EXISTS event_reminders (
      id TEXT PRIMARY KEY,
      event_id TEXT,
      task_id TEXT,
      remind_at TEXT NOT NULL,
      reminder_type TEXT DEFAULT 'notification',
      minutes_before INTEGER DEFAULT 15,
      is_sent INTEGER DEFAULT 0,
      sent_at TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (event_id) REFERENCES planner_events(id) ON DELETE CASCADE,
      FOREIGN KEY (task_id) REFERENCES planner_tasks(id) ON DELETE CASCADE
    )
  `)
  await database.exec(`CREATE INDEX IF NOT EXISTS idx_reminders_event ON event_reminders(event_id)`)
  await database.exec(`CREATE INDEX IF NOT EXISTS idx_reminders_task ON event_reminders(task_id)`)
  await database.exec(`CREATE INDEX IF NOT EXISTS idx_reminders_time ON event_reminders(remind_at)`)
  await database.exec(`CREATE INDEX IF NOT EXISTS idx_reminders_pending ON event_reminders(is_sent, remind_at)`)

  // ========================================================================
  // DAILY NOTES TABLES (Tana-style /today feature)
  // ========================================================================

  // Daily notes - tracks daily journal entries
  await database.exec(`
    CREATE TABLE IF NOT EXISTS daily_notes (
      date TEXT PRIMARY KEY,
      strand_path TEXT NOT NULL,
      title TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `)
  await database.exec(`CREATE INDEX IF NOT EXISTS idx_daily_notes_path ON daily_notes(strand_path)`)

  // Mentions table - tracks @mentions across content
  await database.exec(`
    CREATE TABLE IF NOT EXISTS mentions (
      id TEXT PRIMARY KEY,
      source_block_id TEXT,
      source_strand_path TEXT NOT NULL,
      mention_text TEXT NOT NULL,
      entity_id TEXT,
      entity_type TEXT,
      context_snippet TEXT,
      line_number INTEGER,
      created_at TEXT NOT NULL
    )
  `)
  await database.exec(`CREATE INDEX IF NOT EXISTS idx_mentions_source ON mentions(source_strand_path)`)
  await database.exec(`CREATE INDEX IF NOT EXISTS idx_mentions_entity ON mentions(entity_id)`)
  await database.exec(`CREATE INDEX IF NOT EXISTS idx_mentions_text ON mentions(mention_text)`)

  // ========================================================================
  // EMBARK-STYLE MENTIONABLE ENTITIES (Dynamic Documents Integration)
  // ========================================================================

  // Mentionable entities - structured entities that can be @-mentioned
  // Supports: places, dates, people, strands, events, projects, teams, concepts, tags
  await database.exec(`
    CREATE TABLE IF NOT EXISTS mentionable_entities (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      label TEXT NOT NULL,
      description TEXT,
      icon TEXT,
      color TEXT,
      source_strand_path TEXT,
      properties TEXT DEFAULT '{}',
      created_at TEXT NOT NULL,
      updated_at TEXT
    )
  `)
  await database.exec(`CREATE INDEX IF NOT EXISTS idx_mentionable_entities_type ON mentionable_entities(type)`)
  await database.exec(`CREATE INDEX IF NOT EXISTS idx_mentionable_entities_label ON mentionable_entities(label)`)
  await database.exec(`CREATE INDEX IF NOT EXISTS idx_mentionable_entities_source ON mentionable_entities(source_strand_path)`)

  // Mention references - tracks where entities are mentioned in documents
  await database.exec(`
    CREATE TABLE IF NOT EXISTS mention_references (
      id TEXT PRIMARY KEY,
      mention_syntax TEXT NOT NULL,
      entity_id TEXT,
      entity_type TEXT NOT NULL,
      source_strand_path TEXT NOT NULL,
      source_block_id TEXT,
      position_start INTEGER NOT NULL,
      position_end INTEGER NOT NULL,
      position_line INTEGER NOT NULL,
      position_column INTEGER NOT NULL,
      context_snippet TEXT,
      auto_resolved INTEGER DEFAULT 1,
      resolution_confidence REAL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (entity_id) REFERENCES mentionable_entities(id)
    )
  `)
  await database.exec(`CREATE INDEX IF NOT EXISTS idx_mention_refs_entity ON mention_references(entity_id)`)
  await database.exec(`CREATE INDEX IF NOT EXISTS idx_mention_refs_strand ON mention_references(source_strand_path)`)

  // View configurations - stores table/kanban view settings per query
  await database.exec(`
    CREATE TABLE IF NOT EXISTS view_configs (
      id TEXT PRIMARY KEY,
      query_hash TEXT,
      view_type TEXT NOT NULL,
      config TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `)
  await database.exec(`CREATE INDEX IF NOT EXISTS idx_view_configs_query ON view_configs(query_hash)`)

  // ========================================================================
  // BATCH PUBLISHER TABLES (GitHub Sync)
  // ========================================================================

  // Publish batches - tracks batch publish operations
  await database.exec(`
    CREATE TABLE IF NOT EXISTS publish_batches (
      id TEXT PRIMARY KEY,
      status TEXT NOT NULL DEFAULT 'pending',
      strategy TEXT NOT NULL,
      content_types TEXT NOT NULL,
      item_count INTEGER NOT NULL DEFAULT 0,
      items_synced INTEGER NOT NULL DEFAULT 0,
      items_failed INTEGER NOT NULL DEFAULT 0,
      pr_number INTEGER,
      pr_url TEXT,
      pr_state TEXT,
      commit_sha TEXT,
      branch_name TEXT,
      started_at TEXT,
      completed_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      error TEXT,
      metadata TEXT
    )
  `)
  await database.exec(`CREATE INDEX IF NOT EXISTS idx_publish_batches_status ON publish_batches(status)`)
  await database.exec(`CREATE INDEX IF NOT EXISTS idx_publish_batches_created ON publish_batches(created_at)`)

  // Publish history - audit trail of published items
  await database.exec(`
    CREATE TABLE IF NOT EXISTS publish_history (
      id TEXT PRIMARY KEY,
      batch_id TEXT,
      content_type TEXT NOT NULL,
      content_id TEXT NOT NULL,
      content_path TEXT NOT NULL,
      action TEXT NOT NULL,
      previous_content_hash TEXT,
      new_content_hash TEXT,
      commit_sha TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (batch_id) REFERENCES publish_batches(id) ON DELETE SET NULL
    )
  `)
  await database.exec(`CREATE INDEX IF NOT EXISTS idx_publish_history_content ON publish_history(content_type, content_id)`)
  await database.exec(`CREATE INDEX IF NOT EXISTS idx_publish_history_batch ON publish_history(batch_id)`)

  // Migration: Add sync_status columns to strands table
  try {
    await database.exec(`ALTER TABLE strands ADD COLUMN sync_status TEXT DEFAULT 'local'`)
  } catch {
    // Column already exists
  }
  try {
    await database.exec(`ALTER TABLE strands ADD COLUMN published_at TEXT`)
  } catch {
    // Column already exists
  }
  try {
    await database.exec(`ALTER TABLE strands ADD COLUMN published_content_hash TEXT`)
  } catch {
    // Column already exists
  }
  try {
    await database.exec(`ALTER TABLE strands ADD COLUMN last_sync_attempt TEXT`)
  } catch {
    // Column already exists
  }
  try {
    await database.exec(`ALTER TABLE strands ADD COLUMN sync_error TEXT`)
  } catch {
    // Column already exists
  }
  try {
    await database.exec(`ALTER TABLE strands ADD COLUMN publish_batch_id TEXT`)
  } catch {
    // Column already exists
  }
  await database.exec(`CREATE INDEX IF NOT EXISTS idx_strands_sync_status ON strands(sync_status)`)

  // Migration: Add Zettelkasten workflow columns to strands table
  try {
    await database.exec(`ALTER TABLE strands ADD COLUMN strand_type TEXT DEFAULT 'file'`)
  } catch {
    // Column already exists
  }
  try {
    await database.exec(`ALTER TABLE strands ADD COLUMN maturity_status TEXT`)
  } catch {
    // Column already exists
  }
  try {
    await database.exec(`ALTER TABLE strands ADD COLUMN maturity_last_refined TEXT`)
  } catch {
    // Column already exists
  }
  try {
    await database.exec(`ALTER TABLE strands ADD COLUMN maturity_refinement_count INTEGER DEFAULT 0`)
  } catch {
    // Column already exists
  }
  try {
    await database.exec(`ALTER TABLE strands ADD COLUMN maturity_future_value TEXT`)
  } catch {
    // Column already exists
  }
  try {
    await database.exec(`ALTER TABLE strands ADD COLUMN is_moc INTEGER DEFAULT 0`)
  } catch {
    // Column already exists
  }
  try {
    await database.exec(`ALTER TABLE strands ADD COLUMN moc_topic TEXT`)
  } catch {
    // Column already exists
  }
  try {
    await database.exec(`ALTER TABLE strands ADD COLUMN moc_scope TEXT`)
  } catch {
    // Column already exists
  }
  try {
    await database.exec(`ALTER TABLE strands ADD COLUMN quality_has_context INTEGER`)
  } catch {
    // Column already exists
  }
  try {
    await database.exec(`ALTER TABLE strands ADD COLUMN quality_has_connections INTEGER`)
  } catch {
    // Column already exists
  }
  try {
    await database.exec(`ALTER TABLE strands ADD COLUMN quality_is_atomic INTEGER`)
  } catch {
    // Column already exists
  }
  try {
    await database.exec(`ALTER TABLE strands ADD COLUMN quality_is_self_contained INTEGER`)
  } catch {
    // Column already exists
  }
  await database.exec(`CREATE INDEX IF NOT EXISTS idx_strands_type ON strands(strand_type)`)
  await database.exec(`CREATE INDEX IF NOT EXISTS idx_strands_maturity ON strands(maturity_status)`)
  await database.exec(`CREATE INDEX IF NOT EXISTS idx_strands_moc ON strands(is_moc)`)

  // ========================================================================
  // AUDIT LOGGING & UNDO/REDO TABLES
  // ========================================================================
  await initAuditSchema(database)

  console.log('[CodexDB] Schema initialized (including content tables, teach mode, and audit)')
}

// ============================================================================
// DEFAULT CONTENT INITIALIZATION
// ============================================================================

/** Default fabric ID - abstract container for all weaves */
export const DEFAULT_FABRIC_ID = 'default'
export const DEFAULT_FABRIC_NAME = 'Personal Knowledge'

/** Default weave IDs - use these to link pages to specific weaves */
export const WEAVE_IDS = {
  WIKI: 'wiki',
  KNOWLEDGE: 'knowledge',
  WRITINGS: 'writings',
  REFLECTIONS: 'reflections',
  NOTES: 'notes',
} as const

/** Default weave definitions - exported for cache invalidation hashing */
export const DEFAULT_WEAVES = [
  {
    id: 'wiki',
    slug: 'wiki',
    name: 'Wiki',
    description: 'Knowledge base - contains Frame documentation and reference material',
    sortOrder: 0,
    emoji: '📚',
  },
  {
    id: 'knowledge',
    slug: 'knowledge',
    name: 'Knowledge',
    description: 'General knowledge - technical topics, learning materials, and references',
    sortOrder: 1,
    emoji: '🧠',
  },
  {
    id: 'writings',
    slug: 'writings',
    name: 'Writings',
    description: 'Writing workspace - drafts from writing mode',
    sortOrder: 2,
    emoji: '✍️',
  },
  {
    id: 'reflections',
    slug: 'reflections',
    name: 'Reflections',
    description: 'Personal reflections - journal and thoughts',
    sortOrder: 3,
    emoji: '💭',
  },
  {
    id: 'notes',
    slug: 'notes',
    name: 'Notes',
    description: 'Quick notes and supernotes',
    sortOrder: 4,
    emoji: '📝',
  },
] as const

/** Default looms to create under Wiki weave - exported for cache invalidation hashing */
export const DEFAULT_WIKI_LOOMS = [
  {
    id: 'loom-frame',
    slug: 'frame',
    name: 'Frame',
    description: 'Frame application documentation and guides',
    sortOrder: 0,
    emoji: '🖼️',
  },
  {
    id: 'loom-openstrand',
    slug: 'openstrand',
    name: 'OpenStrand',
    description: 'OpenStrand specification and schema documentation',
    sortOrder: 1,
    emoji: '🧬',
  },
] as const

/**
 * Ensure default fabric and weaves exist
 * Creates: default fabric, wiki/writings/reflections/notes weaves
 * Also creates Frame and OpenStrand looms under Wiki weave
 */
async function ensureDefaultContent(targetDb?: StorageAdapter): Promise<void> {
  const database = targetDb || db
  if (!database) return

  const now = new Date().toISOString()

  try {
    // 1. Check if default fabric exists
    const existingFabrics = await database.all(
      'SELECT id FROM fabrics WHERE id = ?',
      [DEFAULT_FABRIC_ID]
    ) as Array<{ id: string }> | null

    if (!existingFabrics || existingFabrics.length === 0) {
      // Create default fabric
      await database.run(`
        INSERT INTO fabrics (id, name, description, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `, [
        DEFAULT_FABRIC_ID,
        DEFAULT_FABRIC_NAME,
        'Your personal knowledge base - contains all weaves',
        now,
        now,
      ])
      console.log('[CodexDB] Created default fabric:', DEFAULT_FABRIC_NAME)
    }

    // 2. Create default weaves if they don't exist
    for (const weave of DEFAULT_WEAVES) {
      const existingWeave = await database.all(
        'SELECT id FROM weaves WHERE id = ?',
        [weave.id]
      ) as Array<{ id: string }> | null

      if (!existingWeave || existingWeave.length === 0) {
        await database.run(`
          INSERT INTO weaves (id, fabric_id, slug, name, description, path, sort_order, emoji, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          weave.id,
          DEFAULT_FABRIC_ID,
          weave.slug,
          weave.name,
          weave.description,
          weave.slug, // path = slug for top-level weaves
          weave.sortOrder,
          weave.emoji,
          now,
          now,
        ])
        console.log(`[CodexDB] Created default weave: ${weave.name}`)
      }
    }

    // 3. Create default looms under Wiki weave (Frame and OpenStrand)
    for (const loom of DEFAULT_WIKI_LOOMS) {
      const existingLoom = await database.all(
        `SELECT id FROM looms WHERE id = ? OR (slug = ? AND weave_id = 'wiki')`,
        [loom.id, loom.slug]
      ) as Array<{ id: string }> | null

      if (!existingLoom || existingLoom.length === 0) {
        await database.run(`
          INSERT INTO looms (id, weave_id, slug, name, description, path, depth, sort_order, emoji, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          loom.id,
          'wiki', // Wiki weave is the parent
          loom.slug,
          loom.name,
          loom.description,
          `wiki/${loom.slug}`, // path = weave/loom
          1, // depth 1 = direct child of weave
          loom.sortOrder,
          loom.emoji,
          now,
          now,
        ])
        console.log(`[CodexDB] Created default loom: ${loom.name} (under Wiki)`)
      }
    }

    // 4. Migration: Check for existing "Frame" or "knowledge" weave and consolidate
    const legacyWeaves = await database.all(
      `SELECT id, slug, name, description FROM weaves WHERE slug IN ('frame', 'knowledge') AND id NOT IN ('wiki', 'writings', 'reflections', 'notes')`
    ) as Array<{ id: string; slug: string; name: string; description?: string }> | null

    if (legacyWeaves && legacyWeaves.length > 0) {
      for (const legacyWeave of legacyWeaves) {
        // Move strands to Wiki weave
        await database.run(`
          UPDATE strands
          SET weave_id = 'wiki', path = 'wiki/' || slug, updated_at = ?
          WHERE weave_id = ?
        `, [now, legacyWeave.id])
        console.log(`[CodexDB] Migrated strands from ${legacyWeave.name} weave to Wiki`)

        // Delete the legacy weave
        await database.run('DELETE FROM weaves WHERE id = ?', [legacyWeave.id])
        console.log(`[CodexDB] Removed legacy weave: ${legacyWeave.name}`)
      }
    }

    console.log('[CodexDB] Default content initialization complete')
  } catch (error) {
    console.warn('[CodexDB] Failed to ensure default content:', error)
    // Non-fatal - app can still work without default content
  }
}

// ============================================================================
// EMBEDDINGS API (for offline semantic search)
// ============================================================================

/**
 * Store an embedding for semantic search
 */
export async function storeEmbedding(record: EmbeddingRecord): Promise<boolean> {
  const database = await getDatabase()
  if (!database) return false
  
  try {
    await database.run(
      `INSERT INTO embeddings (id, path, title, content, content_type, embedding, weave, loom, tags, last_modified, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         path = excluded.path,
         title = excluded.title,
         content = excluded.content,
         content_type = excluded.content_type,
         embedding = excluded.embedding,
         weave = excluded.weave,
         loom = excluded.loom,
         tags = excluded.tags,
         last_modified = excluded.last_modified`,
      [
        record.id,
        record.path,
        record.title,
        record.content,
        record.contentType,
        JSON.stringify(record.embedding),
        record.weave || null,
        record.loom || null,
        record.tags ? JSON.stringify(record.tags) : null,
        record.lastModified || null,
        record.createdAt
      ]
    )
    return true
  } catch (error) {
    console.error('[CodexDB] Failed to store embedding:', error)
    return false
  }
}

/**
 * Get all embeddings for semantic search
 */
export async function getAllEmbeddings(): Promise<EmbeddingRecord[]> {
  const database = await getDatabase()
  if (!database) return []
  
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = await database.all('SELECT * FROM embeddings') as any[] | null
    
    return (rows || []).map((row: {
      id: string
      path: string
      title: string
      content: string
      content_type: string
      embedding: string
      weave: string | null
      loom: string | null
      tags: string | null
      last_modified: string | null
      created_at: string
    }) => ({
      id: row.id,
      path: row.path,
      title: row.title,
      content: row.content,
      contentType: row.content_type as EmbeddingRecord['contentType'],
      embedding: JSON.parse(row.embedding),
      weave: row.weave || undefined,
      loom: row.loom || undefined,
      tags: row.tags ? JSON.parse(row.tags) : undefined,
      lastModified: row.last_modified || undefined,
      createdAt: row.created_at
    }))
  } catch (error) {
    console.error('[CodexDB] Failed to get embeddings:', error)
    return []
  }
}

/**
 * Get embedding count
 */
export async function getEmbeddingCount(): Promise<number> {
  const database = await getDatabase()
  if (!database) return 0
  
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = await database.all('SELECT COUNT(*) as count FROM embeddings') as any[]
    return rows?.[0]?.count || 0
  } catch {
    return 0
  }
}

/**
 * Clear all embeddings (for re-indexing)
 */
export async function clearEmbeddings(): Promise<boolean> {
  const database = await getDatabase()
  if (!database) return false
  
  try {
    await database.run('DELETE FROM embeddings')
    return true
  } catch (error) {
    console.error('[CodexDB] Failed to clear embeddings:', error)
    return false
  }
}

// ============================================================================
// SEARCH HISTORY API
// ============================================================================

/**
 * Record a search query
 */
export async function recordSearch(query: string, resultCount: number): Promise<string | null> {
  const database = await getDatabase()
  if (!database) return null
  
  const id = `search_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  
  try {
    await database.run(
      `INSERT INTO search_history (id, query, result_count, timestamp)
       VALUES (?, ?, ?, ?)`,
      [id, query, resultCount, new Date().toISOString()]
    )
    
    // Keep only last 100 searches
    await database.run(
      `DELETE FROM search_history WHERE id NOT IN (
        SELECT id FROM search_history ORDER BY timestamp DESC LIMIT 100
      )`
    )
    
    return id
  } catch (error) {
    console.error('[CodexDB] Failed to record search:', error)
    return null
  }
}

/**
 * Record which result was clicked
 */
export async function recordSearchClick(searchId: string, clickedPath: string): Promise<boolean> {
  const database = await getDatabase()
  if (!database) return false
  
  try {
    await database.run(
      'UPDATE search_history SET clicked_path = ? WHERE id = ?',
      [clickedPath, searchId]
    )
    return true
  } catch {
    return false
  }
}

/**
 * Get recent searches
 */
export async function getRecentSearches(limit: number = 10): Promise<SearchHistoryRecord[]> {
  const database = await getDatabase()
  if (!database) return []
  
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = await database.all(
      'SELECT * FROM search_history ORDER BY timestamp DESC LIMIT ?',
      [limit]
    ) as any[]
    
    return (rows || []).map(row => ({
      id: row.id,
      query: row.query,
      resultCount: row.result_count,
      clickedPath: row.clicked_path || undefined,
      timestamp: row.timestamp
    }))
  } catch {
    return []
  }
}

/**
 * Get popular searches (by frequency)
 */
export async function getPopularSearches(limit: number = 5): Promise<Array<{ query: string; count: number }>> {
  const database = await getDatabase()
  if (!database) return []
  
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = await database.all(
      `SELECT query, COUNT(*) as count 
       FROM search_history 
       GROUP BY query 
       ORDER BY count DESC 
       LIMIT ?`,
      [limit]
    ) as any[]
    return rows || []
  } catch {
    return []
  }
}

// ============================================================================
// READING PROGRESS API
// ============================================================================

/**
 * Save reading progress for a strand
 */
export async function saveReadingProgress(progress: ReadingProgressRecord): Promise<boolean> {
  const database = await getDatabase()
  if (!database) return false
  
  try {
    await database.run(
      `INSERT INTO reading_progress (path, scroll_position, read_percentage, last_read_at, total_read_time, completed)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(path) DO UPDATE SET
         scroll_position = excluded.scroll_position,
         read_percentage = excluded.read_percentage,
         last_read_at = excluded.last_read_at,
         total_read_time = reading_progress.total_read_time + excluded.total_read_time,
         completed = excluded.completed`,
      [
        progress.path,
        progress.scrollPosition,
        progress.readPercentage,
        progress.lastReadAt,
        progress.totalReadTime,
        progress.completed ? 1 : 0
      ]
    )
    return true
  } catch (error) {
    console.error('[CodexDB] Failed to save reading progress:', error)
    return false
  }
}

/**
 * Get reading progress for a strand
 */
export async function getReadingProgress(path: string): Promise<ReadingProgressRecord | null> {
  const database = await getDatabase()
  if (!database) return null
  
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = await database.all(
      'SELECT * FROM reading_progress WHERE path = ?',
      [path]
    ) as any[]
    
    if (!rows || rows.length === 0) return null
    
    const row = rows[0]
    return {
      path: row.path,
      scrollPosition: row.scroll_position,
      readPercentage: row.read_percentage,
      lastReadAt: row.last_read_at,
      totalReadTime: row.total_read_time,
      completed: row.completed === 1
    }
  } catch {
    return null
  }
}

/**
 * Get recently read strands
 */
export async function getRecentlyRead(limit: number = 10): Promise<ReadingProgressRecord[]> {
  const database = await getDatabase()
  if (!database) return []
  
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = await database.all(
      'SELECT * FROM reading_progress ORDER BY last_read_at DESC LIMIT ?',
      [limit]
    ) as any[]
    
    return (rows || []).map(row => ({
      path: row.path,
      scrollPosition: row.scroll_position,
      readPercentage: row.read_percentage,
      lastReadAt: row.last_read_at,
      totalReadTime: row.total_read_time,
      completed: row.completed === 1
    }))
  } catch {
    return []
  }
}

// ============================================================================
// DRAFTS API
// ============================================================================

/**
 * Save a draft
 */
export async function saveDraft(draft: Omit<DraftRecord, 'createdAt' | 'updatedAt'>): Promise<boolean> {
  const database = await getDatabase()
  if (!database) return false
  
  const now = new Date().toISOString()
  
  try {
    await database.run(
      `INSERT INTO drafts (id, type, path, title, content, metadata, created_at, updated_at, auto_saved)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         type = excluded.type,
         path = excluded.path,
         title = excluded.title,
         content = excluded.content,
         metadata = excluded.metadata,
         updated_at = excluded.updated_at,
         auto_saved = excluded.auto_saved`,
      [
        draft.id,
        draft.type,
        draft.path,
        draft.title,
        draft.content,
        draft.metadata,
        now,
        now,
        draft.autoSaved ? 1 : 0
      ]
    )
    return true
  } catch (error) {
    console.error('[CodexDB] Failed to save draft:', error)
    return false
  }
}

/**
 * Get a draft by ID
 */
export async function getDraft(id: string): Promise<DraftRecord | null> {
  const database = await getDatabase()
  if (!database) return null
  
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = await database.all(
      'SELECT * FROM drafts WHERE id = ?',
      [id]
    ) as any[]
    
    if (!rows || rows.length === 0) return null
    
    const row = rows[0]
    return {
      id: row.id,
      type: row.type as DraftRecord['type'],
      path: row.path,
      title: row.title,
      content: row.content,
      metadata: row.metadata,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      autoSaved: row.auto_saved === 1
    }
  } catch {
    return null
  }
}

/**
 * Get all drafts
 */
export async function getAllDrafts(): Promise<DraftRecord[]> {
  const database = await getDatabase()
  if (!database) return []
  
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = await database.all(
      'SELECT * FROM drafts ORDER BY updated_at DESC'
    ) as any[]
    
    return (rows || []).map(row => ({
      id: row.id,
      type: row.type as DraftRecord['type'],
      path: row.path,
      title: row.title,
      content: row.content,
      metadata: row.metadata,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      autoSaved: row.auto_saved === 1
    }))
  } catch {
    return []
  }
}

/**
 * Delete a draft
 */
export async function deleteDraft(id: string): Promise<boolean> {
  const database = await getDatabase()
  if (!database) return false
  
  try {
    await database.run('DELETE FROM drafts WHERE id = ?', [id])
    return true
  } catch {
    return false
  }
}

// ============================================================================
// BOOKMARKS API
// ============================================================================

/**
 * Add a bookmark
 */
export async function addBookmark(bookmark: Omit<BookmarkRecord, 'id' | 'createdAt'>): Promise<string | null> {
  const database = await getDatabase()
  if (!database) return null
  
  const id = `bm_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  
  try {
    await database.run(
      `INSERT INTO bookmarks (id, path, title, excerpt, tags, created_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(path) DO UPDATE SET
         title = excluded.title,
         excerpt = excluded.excerpt,
         tags = excluded.tags`,
      [
        id,
        bookmark.path,
        bookmark.title,
        bookmark.excerpt || null,
        bookmark.tags ? JSON.stringify(bookmark.tags) : null,
        new Date().toISOString()
      ]
    )
    return id
  } catch (error) {
    console.error('[CodexDB] Failed to add bookmark:', error)
    return null
  }
}

/**
 * Remove a bookmark
 */
export async function removeBookmark(path: string): Promise<boolean> {
  const database = await getDatabase()
  if (!database) return false
  
  try {
    await database.run('DELETE FROM bookmarks WHERE path = ?', [path])
    return true
  } catch {
    return false
  }
}

/**
 * Check if path is bookmarked
 */
export async function isBookmarked(path: string): Promise<boolean> {
  const database = await getDatabase()
  if (!database) return false
  
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = await database.all(
      'SELECT COUNT(*) as count FROM bookmarks WHERE path = ?',
      [path]
    ) as any[]
    return (rows?.[0]?.count || 0) > 0
  } catch {
    return false
  }
}

/**
 * Get all bookmarks
 */
export async function getAllBookmarks(): Promise<BookmarkRecord[]> {
  const database = await getDatabase()
  if (!database) return []
  
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = await database.all(
      'SELECT * FROM bookmarks ORDER BY created_at DESC'
    ) as any[]
    
    return (rows || []).map(row => ({
      id: row.id,
      path: row.path,
      title: row.title,
      excerpt: row.excerpt || undefined,
      tags: row.tags ? JSON.parse(row.tags) : undefined,
      createdAt: row.created_at
    }))
  } catch {
    return []
  }
}

// ============================================================================
// DATABASE UTILITIES
// ============================================================================

/**
 * Get database statistics
 */
export async function getDatabaseStats(): Promise<DatabaseStats> {
  const database = await getDatabase()
  if (!database) {
    return {
      embeddings: 0,
      searchHistory: 0,
      readingProgress: 0,
      drafts: 0,
      bookmarks: 0,
      totalSizeKB: 0
    }
  }
  
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [embeddings, searches, progress, drafts, bookmarks] = await Promise.all([
      database.all('SELECT COUNT(*) as count FROM embeddings') as Promise<any[]>,
      database.all('SELECT COUNT(*) as count FROM search_history') as Promise<any[]>,
      database.all('SELECT COUNT(*) as count FROM reading_progress') as Promise<any[]>,
      database.all('SELECT COUNT(*) as count FROM drafts') as Promise<any[]>,
      database.all('SELECT COUNT(*) as count FROM bookmarks') as Promise<any[]>,
    ])
    
    // Estimate size (rough)
    const allEmbeddings = await getAllEmbeddings()
    const embeddingSize = JSON.stringify(allEmbeddings).length / 1024
    
    return {
      embeddings: embeddings?.[0]?.count || 0,
      searchHistory: searches?.[0]?.count || 0,
      readingProgress: progress?.[0]?.count || 0,
      drafts: drafts?.[0]?.count || 0,
      bookmarks: bookmarks?.[0]?.count || 0,
      totalSizeKB: Math.round(embeddingSize)
    }
  } catch {
    return {
      embeddings: 0,
      searchHistory: 0,
      readingProgress: 0,
      drafts: 0,
      bookmarks: 0,
      totalSizeKB: 0
    }
  }
}

/**
 * Clear all database data
 */
export async function clearAllData(): Promise<boolean> {
  const database = await getDatabase()
  if (!database) return false
  
  try {
    await database.run('DELETE FROM embeddings')
    await database.run('DELETE FROM search_history')
    await database.run('DELETE FROM reading_progress')
    await database.run('DELETE FROM drafts')
    await database.run('DELETE FROM bookmarks')
    console.log('[CodexDB] All data cleared')
    return true
  } catch (error) {
    console.error('[CodexDB] Failed to clear data:', error)
    return false
  }
}

// ============================================================================
// APP SETTINGS API (for vault configuration, first-launch, etc.)
// ============================================================================

/**
 * Get a setting value by key
 */
export async function getSetting(key: string): Promise<string | null> {
  const database = await getDatabase()
  if (!database) return null

  try {
    const rows = await database.all(
      'SELECT value FROM settings WHERE key = ?',
      [key]
    ) as Array<{ value: string }> | null

    return rows?.[0]?.value ?? null
  } catch {
    return null
  }
}

/**
 * Set a setting value
 */
export async function setSetting(key: string, value: string): Promise<boolean> {
  const database = await getDatabase()
  if (!database) return false

  try {
    await database.run(
      `INSERT INTO settings (key, value, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET
         value = excluded.value,
         updated_at = excluded.updated_at`,
      [key, value, new Date().toISOString()]
    )
    return true
  } catch (error) {
    console.error('[CodexDB] Failed to set setting:', error)
    return false
  }
}

/**
 * Delete a setting
 */
export async function deleteSetting(key: string): Promise<boolean> {
  const database = await getDatabase()
  if (!database) return false

  try {
    await database.run('DELETE FROM settings WHERE key = ?', [key])
    return true
  } catch {
    return false
  }
}

/**
 * Check if first-launch setup has been completed
 */
export async function isFirstLaunchCompleted(): Promise<boolean> {
  const value = await getSetting('firstLaunchCompleted')
  return value === 'true'
}

/**
 * Mark first-launch setup as completed
 */
export async function setFirstLaunchCompleted(completed: boolean): Promise<boolean> {
  return setSetting('firstLaunchCompleted', completed ? 'true' : 'false')
}

/**
 * Get the stored vault path (display only, not for file access)
 */
export async function getVaultPath(): Promise<string | null> {
  return getSetting('vaultPath')
}

/**
 * Set the vault path (display only)
 */
export async function setVaultPath(path: string): Promise<boolean> {
  return setSetting('vaultPath', path)
}

/**
 * Get the vault name
 */
export async function getVaultName(): Promise<string | null> {
  return getSetting('vaultName')
}

/**
 * Set the vault name
 */
export async function setVaultName(name: string): Promise<boolean> {
  return setSetting('vaultName', name)
}

// ============================================================================
// DATABASE EXPORT/IMPORT
// ============================================================================

/**
 * Export all database data
 */
export async function exportDatabase(): Promise<{
  version: number
  exportedAt: string
  embeddings: EmbeddingRecord[]
  searchHistory: SearchHistoryRecord[]
  readingProgress: ReadingProgressRecord[]
  drafts: DraftRecord[]
  bookmarks: BookmarkRecord[]
}> {
  const [embeddings, searchHistory, readingProgress, drafts, bookmarks] = await Promise.all([
    getAllEmbeddings(),
    getRecentSearches(1000),
    getRecentlyRead(1000),
    getAllDrafts(),
    getAllBookmarks()
  ])
  
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    embeddings,
    searchHistory,
    readingProgress,
    drafts,
    bookmarks
  }
}

// ============================================================================
// STRAND RELATIONSHIPS API (Zettelkasten Link Context)
// ============================================================================

/**
 * Create or update a strand relationship
 */
export async function upsertStrandRelationship(
  relationship: Omit<StrandRelationshipRecord, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string | null> {
  const database = await getDatabase()
  if (!database) return null

  const id = `rel_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  const now = new Date().toISOString()

  try {
    await database.run(
      `INSERT INTO strand_relationships (
        id, source_strand_path, source_strand_id, target_strand_path, target_strand_id,
        relation_type, context, source_block_id, bidirectional, strength, auto_detected,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(source_strand_path, target_strand_path, relation_type) DO UPDATE SET
        context = excluded.context,
        source_block_id = excluded.source_block_id,
        bidirectional = excluded.bidirectional,
        strength = excluded.strength,
        auto_detected = excluded.auto_detected,
        updated_at = excluded.updated_at`,
      [
        id,
        relationship.sourceStrandPath,
        relationship.sourceStrandId || null,
        relationship.targetStrandPath,
        relationship.targetStrandId || null,
        relationship.relationType,
        relationship.context || null,
        relationship.sourceBlockId || null,
        relationship.bidirectional ? 1 : 0,
        relationship.strength ?? 1.0,
        relationship.autoDetected ? 1 : 0,
        now,
        now
      ]
    )
    return id
  } catch (error) {
    console.error('[CodexDB] Failed to upsert strand relationship:', error)
    return null
  }
}

/**
 * Get all relationships for a strand (outgoing)
 */
export async function getStrandRelationships(strandPath: string): Promise<StrandRelationshipRecord[]> {
  const database = await getDatabase()
  if (!database) return []

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = await database.all(
      'SELECT * FROM strand_relationships WHERE source_strand_path = ? ORDER BY relation_type, created_at DESC',
      [strandPath]
    ) as any[]

    return (rows || []).map(row => ({
      id: row.id,
      sourceStrandPath: row.source_strand_path,
      sourceStrandId: row.source_strand_id || undefined,
      targetStrandPath: row.target_strand_path,
      targetStrandId: row.target_strand_id || undefined,
      relationType: row.relation_type as StrandRelationType,
      context: row.context || undefined,
      sourceBlockId: row.source_block_id || undefined,
      bidirectional: row.bidirectional === 1,
      strength: row.strength,
      autoDetected: row.auto_detected === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }))
  } catch (error) {
    console.error('[CodexDB] Failed to get strand relationships:', error)
    return []
  }
}

/**
 * Get all backlinks (incoming relationships) for a strand
 */
export async function getStrandBacklinks(strandPath: string): Promise<StrandRelationshipRecord[]> {
  const database = await getDatabase()
  if (!database) return []

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = await database.all(
      'SELECT * FROM strand_relationships WHERE target_strand_path = ? ORDER BY relation_type, created_at DESC',
      [strandPath]
    ) as any[]

    return (rows || []).map(row => ({
      id: row.id,
      sourceStrandPath: row.source_strand_path,
      sourceStrandId: row.source_strand_id || undefined,
      targetStrandPath: row.target_strand_path,
      targetStrandId: row.target_strand_id || undefined,
      relationType: row.relation_type as StrandRelationType,
      context: row.context || undefined,
      sourceBlockId: row.source_block_id || undefined,
      bidirectional: row.bidirectional === 1,
      strength: row.strength,
      autoDetected: row.auto_detected === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }))
  } catch (error) {
    console.error('[CodexDB] Failed to get strand backlinks:', error)
    return []
  }
}

/**
 * Get relationships by type
 */
export async function getRelationshipsByType(relationType: StrandRelationType): Promise<StrandRelationshipRecord[]> {
  const database = await getDatabase()
  if (!database) return []

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = await database.all(
      'SELECT * FROM strand_relationships WHERE relation_type = ? ORDER BY created_at DESC',
      [relationType]
    ) as any[]

    return (rows || []).map(row => ({
      id: row.id,
      sourceStrandPath: row.source_strand_path,
      sourceStrandId: row.source_strand_id || undefined,
      targetStrandPath: row.target_strand_path,
      targetStrandId: row.target_strand_id || undefined,
      relationType: row.relation_type as StrandRelationType,
      context: row.context || undefined,
      sourceBlockId: row.source_block_id || undefined,
      bidirectional: row.bidirectional === 1,
      strength: row.strength,
      autoDetected: row.auto_detected === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }))
  } catch (error) {
    console.error('[CodexDB] Failed to get relationships by type:', error)
    return []
  }
}

/**
 * Delete a strand relationship
 */
export async function deleteStrandRelationship(id: string): Promise<boolean> {
  const database = await getDatabase()
  if (!database) return false

  try {
    await database.run('DELETE FROM strand_relationships WHERE id = ?', [id])
    return true
  } catch (error) {
    console.error('[CodexDB] Failed to delete strand relationship:', error)
    return false
  }
}

/**
 * Delete all relationships for a strand
 */
export async function deleteStrandRelationships(strandPath: string): Promise<boolean> {
  const database = await getDatabase()
  if (!database) return false

  try {
    await database.run(
      'DELETE FROM strand_relationships WHERE source_strand_path = ? OR target_strand_path = ?',
      [strandPath, strandPath]
    )
    return true
  } catch (error) {
    console.error('[CodexDB] Failed to delete strand relationships:', error)
    return false
  }
}

/**
 * Get relationship graph data for visualization
 */
export async function getRelationshipGraph(): Promise<{
  nodes: Array<{ id: string; path: string }>
  edges: Array<{ source: string; target: string; type: StrandRelationType; context?: string }>
}> {
  const database = await getDatabase()
  if (!database) return { nodes: [], edges: [] }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = await database.all('SELECT * FROM strand_relationships') as any[]

    const nodeSet = new Set<string>()
    const edges: Array<{ source: string; target: string; type: StrandRelationType; context?: string }> = []

    for (const row of rows || []) {
      nodeSet.add(row.source_strand_path)
      nodeSet.add(row.target_strand_path)
      edges.push({
        source: row.source_strand_path,
        target: row.target_strand_path,
        type: row.relation_type as StrandRelationType,
        context: row.context || undefined
      })
    }

    const nodes = Array.from(nodeSet).map(path => ({
      id: path,
      path
    }))

    return { nodes, edges }
  } catch (error) {
    console.error('[CodexDB] Failed to get relationship graph:', error)
    return { nodes: [], edges: [] }
  }
}

// ============================================================================
// WEAVE AND LOOM MANAGEMENT API
// ============================================================================

/**
 * Get all weaves
 */
export async function getAllWeaves(): Promise<WeaveRecord[]> {
  const database = await getDatabase()
  if (!database) return []

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = await database.all(
      'SELECT * FROM weaves ORDER BY sort_order, name'
    ) as any[]

    return (rows || []).map(row => ({
      id: row.id,
      fabricId: row.fabric_id,
      slug: row.slug,
      name: row.name,
      description: row.description || undefined,
      path: row.path,
      strandCount: row.strand_count || 0,
      loomCount: row.loom_count || 0,
      sortOrder: row.sort_order || 0,
      coverImage: row.cover_image || undefined,
      coverPattern: row.cover_pattern || undefined,
      coverColor: row.cover_color || undefined,
      emoji: row.emoji || undefined,
      accentColor: row.accent_color || undefined,
      visibility: row.visibility || 'private',
      isFavorite: row.is_favorite === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }))
  } catch (error) {
    console.error('[CodexDB] Failed to get weaves:', error)
    return []
  }
}

/**
 * Get a weave by ID
 */
export async function getWeaveById(id: string): Promise<WeaveRecord | null> {
  const database = await getDatabase()
  if (!database) return null

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = await database.all(
      'SELECT * FROM weaves WHERE id = ?',
      [id]
    ) as any[]

    if (!rows || rows.length === 0) return null
    const row = rows[0]

    return {
      id: row.id,
      fabricId: row.fabric_id,
      slug: row.slug,
      name: row.name,
      description: row.description || undefined,
      path: row.path,
      strandCount: row.strand_count || 0,
      loomCount: row.loom_count || 0,
      sortOrder: row.sort_order || 0,
      coverImage: row.cover_image || undefined,
      coverPattern: row.cover_pattern || undefined,
      coverColor: row.cover_color || undefined,
      emoji: row.emoji || undefined,
      accentColor: row.accent_color || undefined,
      visibility: row.visibility || 'private',
      isFavorite: row.is_favorite === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  } catch (error) {
    console.error('[CodexDB] Failed to get weave:', error)
    return null
  }
}

/**
 * Update a weave record
 */
export async function updateWeave(id: string, updates: Partial<WeaveRecord>): Promise<boolean> {
  const database = await getDatabase()
  if (!database) return false

  const now = new Date().toISOString()
  
  // Build dynamic update query
  const fields: string[] = []
  const values: unknown[] = []

  if (updates.name !== undefined) { fields.push('name = ?'); values.push(updates.name) }
  if (updates.slug !== undefined) { fields.push('slug = ?'); values.push(updates.slug) }
  if (updates.description !== undefined) { fields.push('description = ?'); values.push(updates.description) }
  if (updates.path !== undefined) { fields.push('path = ?'); values.push(updates.path) }
  if (updates.strandCount !== undefined) { fields.push('strand_count = ?'); values.push(updates.strandCount) }
  if (updates.loomCount !== undefined) { fields.push('loom_count = ?'); values.push(updates.loomCount) }
  if (updates.sortOrder !== undefined) { fields.push('sort_order = ?'); values.push(updates.sortOrder) }
  if (updates.coverImage !== undefined) { fields.push('cover_image = ?'); values.push(updates.coverImage) }
  if (updates.coverPattern !== undefined) { fields.push('cover_pattern = ?'); values.push(updates.coverPattern) }
  if (updates.coverColor !== undefined) { fields.push('cover_color = ?'); values.push(updates.coverColor) }
  if (updates.emoji !== undefined) { fields.push('emoji = ?'); values.push(updates.emoji) }
  if (updates.accentColor !== undefined) { fields.push('accent_color = ?'); values.push(updates.accentColor) }
  if (updates.visibility !== undefined) { fields.push('visibility = ?'); values.push(updates.visibility) }
  if (updates.isFavorite !== undefined) { fields.push('is_favorite = ?'); values.push(updates.isFavorite ? 1 : 0) }
  
  // Always update timestamp
  fields.push('updated_at = ?')
  values.push(now)
  values.push(id)

  if (fields.length === 1) return true // Only timestamp update, nothing to do

  try {
    await database.run(
      `UPDATE weaves SET ${fields.join(', ')} WHERE id = ?`,
      values
    )
    return true
  } catch (error) {
    console.error('[CodexDB] Failed to update weave:', error)
    return false
  }
}

/**
 * Get all looms for a weave
 */
export async function getLoomsByWeaveId(weaveId: string): Promise<LoomRecord[]> {
  const database = await getDatabase()
  if (!database) return []

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = await database.all(
      'SELECT * FROM looms WHERE weave_id = ? ORDER BY depth, sort_order, name',
      [weaveId]
    ) as any[]

    return (rows || []).map(row => ({
      id: row.id,
      weaveId: row.weave_id,
      parentLoomId: row.parent_loom_id || undefined,
      slug: row.slug,
      name: row.name,
      description: row.description || undefined,
      path: row.path,
      depth: row.depth || 0,
      strandCount: row.strand_count || 0,
      sortOrder: row.sort_order || 0,
      coverImage: row.cover_image || undefined,
      coverPattern: row.cover_pattern || undefined,
      coverColor: row.cover_color || undefined,
      emoji: row.emoji || undefined,
      accentColor: row.accent_color || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }))
  } catch (error) {
    console.error('[CodexDB] Failed to get looms:', error)
    return []
  }
}

/**
 * Get all looms
 */
export async function getAllLooms(): Promise<LoomRecord[]> {
  const database = await getDatabase()
  if (!database) return []

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = await database.all(
      'SELECT * FROM looms ORDER BY path'
    ) as any[]

    return (rows || []).map(row => ({
      id: row.id,
      weaveId: row.weave_id,
      parentLoomId: row.parent_loom_id || undefined,
      slug: row.slug,
      name: row.name,
      description: row.description || undefined,
      path: row.path,
      depth: row.depth || 0,
      strandCount: row.strand_count || 0,
      sortOrder: row.sort_order || 0,
      coverImage: row.cover_image || undefined,
      coverPattern: row.cover_pattern || undefined,
      coverColor: row.cover_color || undefined,
      emoji: row.emoji || undefined,
      accentColor: row.accent_color || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }))
  } catch (error) {
    console.error('[CodexDB] Failed to get all looms:', error)
    return []
  }
}

/**
 * Get a loom by ID
 */
export async function getLoomById(id: string): Promise<LoomRecord | null> {
  const database = await getDatabase()
  if (!database) return null

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = await database.all(
      'SELECT * FROM looms WHERE id = ?',
      [id]
    ) as any[]

    if (!rows || rows.length === 0) return null
    const row = rows[0]

    return {
      id: row.id,
      weaveId: row.weave_id,
      parentLoomId: row.parent_loom_id || undefined,
      slug: row.slug,
      name: row.name,
      description: row.description || undefined,
      path: row.path,
      depth: row.depth || 0,
      strandCount: row.strand_count || 0,
      sortOrder: row.sort_order || 0,
      coverImage: row.cover_image || undefined,
      coverPattern: row.cover_pattern || undefined,
      coverColor: row.cover_color || undefined,
      emoji: row.emoji || undefined,
      accentColor: row.accent_color || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  } catch (error) {
    console.error('[CodexDB] Failed to get loom:', error)
    return null
  }
}

/**
 * Update a loom record
 */
export async function updateLoom(id: string, updates: Partial<LoomRecord>): Promise<boolean> {
  const database = await getDatabase()
  if (!database) return false

  const now = new Date().toISOString()
  
  // Build dynamic update query
  const fields: string[] = []
  const values: unknown[] = []

  if (updates.name !== undefined) { fields.push('name = ?'); values.push(updates.name) }
  if (updates.slug !== undefined) { fields.push('slug = ?'); values.push(updates.slug) }
  if (updates.description !== undefined) { fields.push('description = ?'); values.push(updates.description) }
  if (updates.path !== undefined) { fields.push('path = ?'); values.push(updates.path) }
  if (updates.parentLoomId !== undefined) { fields.push('parent_loom_id = ?'); values.push(updates.parentLoomId) }
  if (updates.depth !== undefined) { fields.push('depth = ?'); values.push(updates.depth) }
  if (updates.strandCount !== undefined) { fields.push('strand_count = ?'); values.push(updates.strandCount) }
  if (updates.sortOrder !== undefined) { fields.push('sort_order = ?'); values.push(updates.sortOrder) }
  if (updates.coverImage !== undefined) { fields.push('cover_image = ?'); values.push(updates.coverImage) }
  if (updates.coverPattern !== undefined) { fields.push('cover_pattern = ?'); values.push(updates.coverPattern) }
  if (updates.coverColor !== undefined) { fields.push('cover_color = ?'); values.push(updates.coverColor) }
  if (updates.emoji !== undefined) { fields.push('emoji = ?'); values.push(updates.emoji) }
  if (updates.accentColor !== undefined) { fields.push('accent_color = ?'); values.push(updates.accentColor) }
  
  // Always update timestamp
  fields.push('updated_at = ?')
  values.push(now)
  values.push(id)

  if (fields.length === 1) return true // Only timestamp update, nothing to do

  try {
    await database.run(
      `UPDATE looms SET ${fields.join(', ')} WHERE id = ?`,
      values
    )
    return true
  } catch (error) {
    console.error('[CodexDB] Failed to update loom:', error)
    return false
  }
}

/**
 * Batch update covers for multiple weaves
 */
export async function batchUpdateWeaveCovers(
  updates: Array<{ id: string; coverImage?: string; coverPattern?: string; coverColor?: string }>
): Promise<number> {
  const database = await getDatabase()
  if (!database) return 0

  let updated = 0
  const now = new Date().toISOString()

  try {
    for (const update of updates) {
      const fields: string[] = []
      const values: unknown[] = []

      if (update.coverImage !== undefined) { fields.push('cover_image = ?'); values.push(update.coverImage) }
      if (update.coverPattern !== undefined) { fields.push('cover_pattern = ?'); values.push(update.coverPattern) }
      if (update.coverColor !== undefined) { fields.push('cover_color = ?'); values.push(update.coverColor) }
      
      if (fields.length === 0) continue

      fields.push('updated_at = ?')
      values.push(now)
      values.push(update.id)

      await database.run(
        `UPDATE weaves SET ${fields.join(', ')} WHERE id = ?`,
        values
      )
      updated++
    }
    return updated
  } catch (error) {
    console.error('[CodexDB] Failed to batch update weave covers:', error)
    return updated
  }
}

/**
 * Batch update covers for multiple looms
 */
export async function batchUpdateLoomCovers(
  updates: Array<{ id: string; coverImage?: string; coverPattern?: string; coverColor?: string }>
): Promise<number> {
  const database = await getDatabase()
  if (!database) return 0

  let updated = 0
  const now = new Date().toISOString()

  try {
    for (const update of updates) {
      const fields: string[] = []
      const values: unknown[] = []

      if (update.coverImage !== undefined) { fields.push('cover_image = ?'); values.push(update.coverImage) }
      if (update.coverPattern !== undefined) { fields.push('cover_pattern = ?'); values.push(update.coverPattern) }
      if (update.coverColor !== undefined) { fields.push('cover_color = ?'); values.push(update.coverColor) }
      
      if (fields.length === 0) continue

      fields.push('updated_at = ?')
      values.push(now)
      values.push(update.id)

      await database.run(
        `UPDATE looms SET ${fields.join(', ')} WHERE id = ?`,
        values
      )
      updated++
    }
    return updated
  } catch (error) {
    console.error('[CodexDB] Failed to batch update loom covers:', error)
    return updated
  }
}