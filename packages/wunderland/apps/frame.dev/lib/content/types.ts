/**
 * Content Management Types
 *
 * Defines the interfaces for the content layer that abstracts between
 * SQLite (offline) and GitHub API (online) content sources.
 *
 * @module lib/content/types
 */

// ============================================================================
// CONTENT SOURCE TYPES
// ============================================================================

/**
 * Content source configuration
 */
export interface ContentSource {
  type: 'sqlite' | 'github' | 'hybrid' | 'filesystem' | 'bundled'
  isOnline: boolean
  lastSync: Date | null
  pendingChanges: number
  /** Optional: Only present for local sources */
  strandCount?: number
  /** Optional: Display path for filesystem sources */
  displayPath?: string
}

/**
 * Sync options for content synchronization
 */
export interface SyncOptions {
  /** Force full sync even if up to date */
  force?: boolean
  /** Only sync specific weaves */
  weaves?: string[]
  /** Progress callback */
  onProgress?: (progress: SyncProgress) => void
}

/**
 * Sync progress information
 */
export interface SyncProgress {
  phase: 'preparing' | 'fetching' | 'processing' | 'storing' | 'indexing' | 'complete'
  current: number
  total: number
  currentItem?: string
  bytesProcessed?: number
  estimatedTotalBytes?: number
}

/**
 * Sync result
 */
export interface SyncResult {
  success: boolean
  strandsAdded: number
  strandsUpdated: number
  strandsRemoved: number
  duration: number
  errors?: string[]
}

// ============================================================================
// KNOWLEDGE TREE TYPES
// ============================================================================

/**
 * Node type in the knowledge tree
 */
export type KnowledgeNodeType = 'fabric' | 'weave' | 'loom' | 'strand'

/**
 * Knowledge tree node (for sidebar/navigation)
 */
export interface KnowledgeTreeNode {
  id: string
  type: KnowledgeNodeType
  slug: string
  name: string
  path: string
  description?: string
  children?: KnowledgeTreeNode[]
  strandCount?: number
  metadata?: {
    difficulty?: string
    status?: string
    tags?: string[]
  }
}

// ============================================================================
// STRAND CONTENT TYPES
// ============================================================================

/**
 * Note maturity status for Zettelkasten workflow
 */
export type NoteMaturityStatus = 'fleeting' | 'literature' | 'permanent' | 'evergreen'

/**
 * Note maturity tracking (Zettelkasten workflow)
 */
export interface NoteMaturity {
  status: NoteMaturityStatus
  lastRefinedAt?: string
  refinementCount?: number
  futureValue?: 'low' | 'medium' | 'high' | 'core'
}

/**
 * Quality checks for atomic notes
 */
export interface QualityChecks {
  hasContext?: boolean
  hasConnections?: boolean
  isAtomic?: boolean
  isSelfContained?: boolean
}

/**
 * MOC (Map of Content) configuration
 */
export interface MOCConfig {
  topic: string
  scope: 'subject' | 'topic' | 'project' | 'custom'
  autoUpdate?: boolean
  sections?: string[]
  strandOrder?: string[]
}

/**
 * Strand relationship types (Zettelkasten semantic links)
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
  | 'parallels'
  | 'synthesizes'
  | 'custom'

/**
 * Strand metadata from frontmatter
 *
 * Note: This type supports both the simple format (subject/topic strings)
 * and the extended format (subjects/topics arrays) used in components.
 */
export interface StrandMetadata {
  id?: string
  slug?: string
  title?: string
  version?: string
  contentType?: string
  summary?: string
  skills?: string[]
  notes?: string | string[]
  difficulty?: string | number | {
    overall?: string | number
    cognitive?: number
    prerequisites?: number
    conceptual?: number
  }
  taxonomy?: {
    subject?: string
    topic?: string
    subtopic?: string
    subjects?: string[]
    topics?: string[]
    concepts?: Array<{ name: string; weight: number }>
  }
  relationships?: {
    prerequisites?: string[]
    references?: string[]
    seeAlso?: string[]
  } | Array<{
    type: StrandRelationType
    target: string
    bidirectional?: boolean
    context?: string
  }>
  publishing?: {
    status?: 'draft' | 'review' | 'published' | 'archived'
    license?: string
    lastUpdated?: string
  }
  seo?: {
    index?: boolean
    follow?: boolean
    metaDescription?: string
    canonicalUrl?: string
    sitemapPriority?: number
  }
  readerSettings?: {
    illustrationMode?: 'per-block' | 'persistent' | 'none'
  }
  tags?: string | string[]
  
  // Zettelkasten workflow fields
  /** Note maturity tracking (fleeting → literature → permanent → evergreen) */
  maturity?: NoteMaturity
  /** Quality checks for atomic notes */
  qualityChecks?: QualityChecks
  /** Whether this strand is a Map of Content */
  isMOC?: boolean
  /** MOC configuration (if isMOC is true) */
  mocConfig?: MOCConfig
  
  [key: string]: unknown
}

/**
 * Full strand content with parsed data
 */
export interface StrandContent {
  id: string
  path: string
  slug: string
  title: string
  content: string
  frontmatter: StrandMetadata
  weave: string
  loom?: string
  wordCount: number
  summary?: string
  lastModified: string
  githubUrl?: string
}

// ============================================================================
// SEARCH TYPES
// ============================================================================

/**
 * Search options
 */
export interface SearchOptions {
  /** Maximum results to return */
  limit?: number
  /** Offset for pagination */
  offset?: number
  /** Filter by weave */
  weave?: string
  /** Filter by loom */
  loom?: string
  /** Filter by difficulty */
  difficulty?: string
  /** Filter by status */
  status?: 'draft' | 'published' | 'archived'
  /** Filter by tags */
  tags?: string[]
  /** Include content in results */
  includeContent?: boolean
}

/**
 * Semantic search options
 */
export interface SemanticSearchOptions extends SearchOptions {
  /** Minimum similarity score (0-1) */
  minScore?: number
  /** Use hybrid ranking (semantic + lexical) */
  hybrid?: boolean
  /** Weight for semantic vs lexical (0-1, 1 = all semantic) */
  semanticWeight?: number
}

/**
 * Search result
 */
export interface SearchResult {
  docId: string
  path: string
  title: string
  summary?: string
  excerpt?: string
  weave?: string
  loom?: string
  tags?: string[]
  /** Vocabulary-classified skills (e.g., react, python, docker) */
  skills?: string[]
  /** Vocabulary-classified subjects (e.g., technology, science) */
  subjects?: string[]
  /** Vocabulary-classified topics (e.g., architecture, troubleshooting) */
  topics?: string[]
  /** BM25/lexical score */
  bm25Score?: number
  /** Semantic similarity score */
  semanticScore?: number
  /** Combined ranking score */
  combinedScore: number
}

// ============================================================================
// CONTENT MANAGER INTERFACE
// ============================================================================

/**
 * Content manager interface
 *
 * Abstracts content operations between SQLite and GitHub sources.
 * Implementations:
 * - SQLiteContentStore: Full offline support with local SQLite
 * - GitHubContentSource: Online-only, fetches from GitHub API
 * - HybridContentManager: Combines both with sync capability
 */
export interface ContentManager {
  // ========================================================================
  // Source Information
  // ========================================================================

  /** Get current content source info */
  getSource(): ContentSource

  /** Check if offline mode is active */
  isOffline(): boolean

  /** Check if online and can sync */
  canSync(): boolean

  // ========================================================================
  // Content Retrieval
  // ========================================================================

  /** Get the full knowledge tree for navigation */
  getKnowledgeTree(): Promise<KnowledgeTreeNode[]>

  /** Get a single strand by path */
  getStrand(path: string): Promise<StrandContent | null>

  /** Get multiple strands by paths */
  getStrands(paths: string[]): Promise<StrandContent[]>

  /** Get all strands in a weave */
  getWeaveStrands(weaveSlug: string): Promise<StrandContent[]>

  /** Get all strands in a loom */
  getLoomStrands(loomPath: string): Promise<StrandContent[]>

  /** Get weave info */
  getWeave(slug: string): Promise<KnowledgeTreeNode | null>

  /** Get loom info */
  getLoom(path: string): Promise<KnowledgeTreeNode | null>

  // ========================================================================
  // Search
  // ========================================================================

  /** Full-text search using FTS5 or GitHub search */
  searchStrands(query: string, options?: SearchOptions): Promise<SearchResult[]>

  /** Semantic search using embeddings */
  semanticSearch(query: string, options?: SemanticSearchOptions): Promise<SearchResult[]>

  /** Hybrid search (combines FTS and semantic) */
  hybridSearch(query: string, options?: SemanticSearchOptions): Promise<SearchResult[]>

  // ========================================================================
  // Sync Operations
  // ========================================================================

  /** Sync content from remote source */
  sync(options?: SyncOptions): Promise<SyncResult>

  /** Check for available updates */
  checkForUpdates(): Promise<{ available: boolean; changes: number }>

  /** Get sync status */
  getSyncStatus(): Promise<{
    lastSync: Date | null
    pendingChanges: number
    remoteVersion: string | null
  }>

  // ========================================================================
  // Lifecycle
  // ========================================================================

  /** Initialize the content manager */
  initialize(): Promise<void>

  /** Close connections and cleanup */
  close(): Promise<void>
}

// ============================================================================
// CONTENT STORE INTERFACE (SQLite-specific)
// ============================================================================

/**
 * SQLite content store interface
 *
 * Extends ContentManager with write operations for offline mode.
 */
export interface ContentStore extends ContentManager {
  // ========================================================================
  // Write Operations
  // ========================================================================

  /** Insert or update a fabric */
  upsertFabric(fabric: {
    id: string
    name: string
    description?: string
    githubOwner?: string
    githubRepo?: string
    githubBranch?: string
  }): Promise<void>

  /** Insert or update a weave */
  upsertWeave(weave: {
    id: string
    fabricId: string
    slug: string
    name: string
    description?: string
    path: string
    sortOrder?: number
  }): Promise<void>

  /** Insert or update a loom */
  upsertLoom(loom: {
    id: string
    weaveId: string
    parentLoomId?: string
    slug: string
    name: string
    description?: string
    path: string
    depth: number
    sortOrder?: number
  }): Promise<void>

  /** Insert or update a strand */
  upsertStrand(strand: {
    id: string
    weaveId: string
    loomId?: string
    slug: string
    title: string
    path: string
    content: string
    frontmatter?: StrandMetadata
    summary?: string
    githubSha?: string
    githubUrl?: string
  }): Promise<void>

  /** Delete a strand */
  deleteStrand(path: string): Promise<void>

  /** Update sync status */
  updateSyncStatus(status: {
    lastFullSync?: string
    lastIncrementalSync?: string
    remoteTreeSha?: string
    pendingChanges?: number
  }): Promise<void>

  // ========================================================================
  // Embedding Operations
  // ========================================================================

  /** Store an embedding for a strand/chunk */
  storeEmbedding(
    id: string,
    strandId: string,
    embedding: Float32Array,
    chunkType?: 'strand' | 'section' | 'paragraph'
  ): Promise<void>

  /** Get all embeddings for semantic search */
  getAllEmbeddings(): Promise<Array<{
    id: string
    strandId: string
    embedding: Float32Array
  }>>

  /** Clear all embeddings */
  clearEmbeddings(): Promise<void>

  // ========================================================================
  // Bulk Operations
  // ========================================================================

  /** Import multiple strands in a transaction */
  bulkImportStrands(strands: Array<Parameters<ContentStore['upsertStrand']>[0]>): Promise<void>

  /** Clear all content (for full re-sync) */
  clearAllContent(): Promise<void>

  /** Rebuild full-text search index */
  rebuildSearchIndex(): Promise<void>
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Content change event for sync
 */
export interface ContentChange {
  type: 'add' | 'update' | 'delete'
  path: string
  sha?: string
  timestamp: string
}

/**
 * Content statistics
 */
export interface ContentStats {
  fabrics: number
  weaves: number
  looms: number
  strands: number
  totalWordCount: number
  embeddings: number
  lastSync: Date | null
}
