/**
 * Cache Metadata Service
 * @module lib/generation/cacheMetadataService
 *
 * Provides unified cache metadata tracking across all content generation types:
 * - Flashcards, Quiz, Glossary, Mindmap, Teach Mode
 *
 * Features:
 * - Generation metadata (date, method, source count, duration)
 * - Freshness tracking (stale detection based on source changes)
 * - Load vs regenerate status tracking
 * - Statistics and analytics
 *
 * This service complements existing type-specific caches (flashcardCache, etc.)
 * by providing a unified metadata layer.
 */

import { getDatabase } from '../codexDatabase'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Types of generated content
 */
export type ContentType = 'flashcards' | 'quiz' | 'glossary' | 'mindmap' | 'teach'

/**
 * Generation method used
 */
export type GenerationMethod = 'nlp' | 'llm' | 'hybrid' | 'static' | 'cached'

/**
 * Cache state for UI display
 */
export type CacheState = 
  | 'fresh'        // Loaded from cache, content unchanged
  | 'stale'        // Loaded from cache, but source may have changed
  | 'generating'   // Currently generating new content
  | 'regenerating' // Regenerating (had cache, generating new)
  | 'empty'        // No cache exists
  | 'error'        // Error during cache operation

/**
 * Complete cache metadata record
 */
export interface CacheMetadata {
  /** Unique cache key */
  cacheKey: string
  /** Content type (flashcards, quiz, etc.) */
  contentType: ContentType
  /** Method used for generation */
  generationMethod: GenerationMethod
  /** When the cache was created */
  createdAt: string
  /** When the cache was last accessed */
  lastAccessedAt: string
  /** Duration of generation in ms */
  generationDurationMs: number
  /** Number of source strands used */
  sourceCount: number
  /** IDs of source strands (for staleness check) */
  sourceIds: string[]
  /** Hash of source content at generation time */
  sourceContentHash: string
  /** Number of items generated (cards, questions, etc.) */
  itemCount: number
  /** Expiration date (if TTL set) */
  expiresAt?: string
  /** Whether the cache was loaded from storage */
  loadedFromCache: boolean
  /** Schema version for migrations */
  version: number
  /** Optional user notes */
  notes?: string
  /** Metadata for display */
  displayMeta: {
    /** Friendly name for the selection */
    selectionName: string
    /** Total word count of sources */
    totalWords: number
    /** Whether LLM was available at generation */
    llmAvailable: boolean
  }
}

/**
 * Summary statistics for cache
 */
export interface CacheStats {
  /** Total entries by content type */
  byType: Record<ContentType, number>
  /** Total entries by generation method */
  byMethod: Record<GenerationMethod, number>
  /** Total items across all caches */
  totalItems: number
  /** Total cache entries */
  totalEntries: number
  /** Cache hit/miss stats */
  hits: number
  misses: number
  hitRate: number
  /** Storage size estimate (bytes) */
  estimatedSize: number
  /** Oldest entry date */
  oldestEntry?: string
  /** Newest entry date */
  newestEntry?: string
  /** Number of stale entries */
  staleCount: number
}

/**
 * Options for cache operations
 */
export interface CacheOptions {
  /** Time-to-live in days */
  ttlDays?: number
  /** Force regeneration even if cache exists */
  forceRegenerate?: boolean
  /** Skip cache lookup */
  skipCache?: boolean
  /** User notes to attach */
  notes?: string
}

/* ═══════════════════════════════════════════════════════════════════════════
   CONSTANTS
═══════════════════════════════════════════════════════════════════════════ */

const CACHE_VERSION = 2
const DEFAULT_TTL_DAYS = 30
const CACHE_TABLE = 'content_cache_metadata'

// In-memory stats tracking
let cacheHits = 0
let cacheMisses = 0

/* ═══════════════════════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Hash content using DJB2 algorithm
 */
function hashContent(content: string): string {
  let hash = 5381
  for (let i = 0; i < content.length; i++) {
    hash = ((hash << 5) + hash) ^ content.charCodeAt(i)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

/**
 * Generate cache key from selection and type
 */
export function generateCacheKey(
  sourceIds: string[],
  contentType: ContentType,
  method: GenerationMethod
): string {
  const sorted = [...sourceIds].sort()
  const idsHash = hashContent(sorted.join('|'))
  const prefix = sourceIds.length > 1 ? 'multi' : 'single'
  return `${contentType}_${method}_${prefix}_${idsHash}`
}

/**
 * Calculate freshness based on source content hash
 */
export function calculateFreshness(
  stored: CacheMetadata,
  currentSourceHash: string
): CacheState {
  if (stored.sourceContentHash !== currentSourceHash) {
    return 'stale'
  }

  if (stored.expiresAt) {
    const expires = new Date(stored.expiresAt)
    if (expires < new Date()) {
      return 'stale'
    }
  }

  return 'fresh'
}

/**
 * Get friendly name for selection
 */
function getSelectionName(sourceIds: string[], count: number): string {
  if (count === 0) return 'No selection'
  if (count === 1) return sourceIds[0]?.split('/').pop() || 'Single strand'
  return `${count} strands`
}

/* ═══════════════════════════════════════════════════════════════════════════
   DATABASE SCHEMA
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Initialize cache metadata table
 */
export async function initCacheMetadataTable(): Promise<void> {
  const db = await getDatabase()
  if (!db) return

  try {
    await db.exec(`
      CREATE TABLE IF NOT EXISTS ${CACHE_TABLE} (
        cache_key TEXT PRIMARY KEY,
        content_type TEXT NOT NULL,
        generation_method TEXT NOT NULL,
        created_at TEXT NOT NULL,
        last_accessed_at TEXT NOT NULL,
        generation_duration_ms INTEGER DEFAULT 0,
        source_count INTEGER DEFAULT 1,
        source_ids TEXT NOT NULL,
        source_content_hash TEXT NOT NULL,
        item_count INTEGER DEFAULT 0,
        expires_at TEXT,
        loaded_from_cache INTEGER DEFAULT 0,
        version INTEGER DEFAULT ${CACHE_VERSION},
        notes TEXT,
        selection_name TEXT,
        total_words INTEGER DEFAULT 0,
        llm_available INTEGER DEFAULT 0
      );

      CREATE INDEX IF NOT EXISTS idx_cache_meta_type ON ${CACHE_TABLE}(content_type);
      CREATE INDEX IF NOT EXISTS idx_cache_meta_created ON ${CACHE_TABLE}(created_at);
      CREATE INDEX IF NOT EXISTS idx_cache_meta_expires ON ${CACHE_TABLE}(expires_at);
    `)
  } catch (error) {
    console.error('[CacheMetadata] Error initializing table:', error)
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   CORE OPERATIONS
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Get cache metadata for a key
 */
export async function getCacheMetadata(
  cacheKey: string
): Promise<CacheMetadata | null> {
  const db = await getDatabase()
  if (!db) {
    cacheMisses++
    return null
  }

  try {
    const rows = await db.all(
      `SELECT * FROM ${CACHE_TABLE} WHERE cache_key = ?`,
      [cacheKey]
    ) as any[] | null

    if (!rows || rows.length === 0) {
      cacheMisses++
      return null
    }

    const row = rows[0]
    cacheHits++

    // Update last accessed
    await db.run(
      `UPDATE ${CACHE_TABLE} SET last_accessed_at = ? WHERE cache_key = ?`,
      [new Date().toISOString(), cacheKey]
    )

    return {
      cacheKey: row.cache_key,
      contentType: row.content_type,
      generationMethod: row.generation_method,
      createdAt: row.created_at,
      lastAccessedAt: row.last_accessed_at,
      generationDurationMs: row.generation_duration_ms,
      sourceCount: row.source_count,
      sourceIds: JSON.parse(row.source_ids),
      sourceContentHash: row.source_content_hash,
      itemCount: row.item_count,
      expiresAt: row.expires_at,
      loadedFromCache: Boolean(row.loaded_from_cache),
      version: row.version,
      notes: row.notes,
      displayMeta: {
        selectionName: row.selection_name || getSelectionName(JSON.parse(row.source_ids), row.source_count),
        totalWords: row.total_words || 0,
        llmAvailable: Boolean(row.llm_available),
      },
    }
  } catch (error) {
    console.error('[CacheMetadata] Error reading metadata:', error)
    cacheMisses++
    return null
  }
}

/**
 * Save cache metadata
 */
export async function saveCacheMetadata(
  metadata: Omit<CacheMetadata, 'lastAccessedAt' | 'loadedFromCache' | 'version'>,
  options: CacheOptions = {}
): Promise<boolean> {
  const db = await getDatabase()
  if (!db) return false

  try {
    const now = new Date()
    const ttlDays = options.ttlDays ?? DEFAULT_TTL_DAYS
    const expiresAt = new Date(now.getTime() + ttlDays * 24 * 60 * 60 * 1000)

    await db.run(
      `INSERT INTO ${CACHE_TABLE} (
        cache_key, content_type, generation_method, created_at, last_accessed_at,
        generation_duration_ms, source_count, source_ids, source_content_hash,
        item_count, expires_at, loaded_from_cache, version, notes,
        selection_name, total_words, llm_available
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(cache_key) DO UPDATE SET
        generation_method = excluded.generation_method,
        created_at = excluded.created_at,
        last_accessed_at = excluded.last_accessed_at,
        generation_duration_ms = excluded.generation_duration_ms,
        source_count = excluded.source_count,
        source_ids = excluded.source_ids,
        source_content_hash = excluded.source_content_hash,
        item_count = excluded.item_count,
        expires_at = excluded.expires_at,
        loaded_from_cache = excluded.loaded_from_cache,
        version = excluded.version,
        notes = excluded.notes,
        selection_name = excluded.selection_name,
        total_words = excluded.total_words,
        llm_available = excluded.llm_available`,
      [
        metadata.cacheKey,
        metadata.contentType,
        metadata.generationMethod,
        metadata.createdAt,
        now.toISOString(),
        metadata.generationDurationMs,
        metadata.sourceCount,
        JSON.stringify(metadata.sourceIds),
        metadata.sourceContentHash,
        metadata.itemCount,
        expiresAt.toISOString(),
        0, // loadedFromCache = false (we're saving new)
        CACHE_VERSION,
        options.notes || metadata.notes || null,
        metadata.displayMeta.selectionName,
        metadata.displayMeta.totalWords,
        metadata.displayMeta.llmAvailable ? 1 : 0,
      ]
    )

    console.log(`[CacheMetadata] Saved: ${metadata.cacheKey}`)
    return true
  } catch (error) {
    console.error('[CacheMetadata] Error saving metadata:', error)
    return false
  }
}

/**
 * Mark metadata as loaded from cache
 */
export async function markAsLoadedFromCache(cacheKey: string): Promise<void> {
  const db = await getDatabase()
  if (!db) return

  try {
    await db.run(
      `UPDATE ${CACHE_TABLE} SET loaded_from_cache = 1, last_accessed_at = ? WHERE cache_key = ?`,
      [new Date().toISOString(), cacheKey]
    )
  } catch (error) {
    console.error('[CacheMetadata] Error marking as loaded:', error)
  }
}

/**
 * Delete cache metadata
 */
export async function deleteCacheMetadata(cacheKey: string): Promise<boolean> {
  const db = await getDatabase()
  if (!db) return false

  try {
    await db.run(`DELETE FROM ${CACHE_TABLE} WHERE cache_key = ?`, [cacheKey])
    return true
  } catch (error) {
    console.error('[CacheMetadata] Error deleting metadata:', error)
    return false
  }
}

/**
 * Delete all metadata for a content type
 */
export async function deleteCacheMetadataByType(
  contentType: ContentType
): Promise<{ deleted: number }> {
  const db = await getDatabase()
  if (!db) return { deleted: 0 }

  try {
    const countRows = await db.all(
      `SELECT COUNT(*) as count FROM ${CACHE_TABLE} WHERE content_type = ?`,
      [contentType]
    ) as any[]
    const count = countRows?.[0]?.count || 0

    await db.run(`DELETE FROM ${CACHE_TABLE} WHERE content_type = ?`, [contentType])
    return { deleted: count }
  } catch (error) {
    console.error('[CacheMetadata] Error deleting by type:', error)
    return { deleted: 0 }
  }
}

/**
 * Clean up expired metadata
 */
export async function cleanupExpiredMetadata(): Promise<{ deleted: number }> {
  const db = await getDatabase()
  if (!db) return { deleted: 0 }

  try {
    const now = new Date().toISOString()

    const countRows = await db.all(
      `SELECT COUNT(*) as count FROM ${CACHE_TABLE} WHERE expires_at < ?`,
      [now]
    ) as any[]
    const count = countRows?.[0]?.count || 0

    await db.run(`DELETE FROM ${CACHE_TABLE} WHERE expires_at < ?`, [now])
    return { deleted: count }
  } catch (error) {
    console.error('[CacheMetadata] Error cleaning up expired:', error)
    return { deleted: 0 }
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   QUERY OPERATIONS
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Get all metadata for a content type
 */
export async function getCacheMetadataByType(
  contentType: ContentType
): Promise<CacheMetadata[]> {
  const db = await getDatabase()
  if (!db) return []

  try {
    const rows = await db.all(
      `SELECT * FROM ${CACHE_TABLE} WHERE content_type = ? ORDER BY created_at DESC`,
      [contentType]
    ) as any[]

    return rows.map((row) => ({
      cacheKey: row.cache_key,
      contentType: row.content_type,
      generationMethod: row.generation_method,
      createdAt: row.created_at,
      lastAccessedAt: row.last_accessed_at,
      generationDurationMs: row.generation_duration_ms,
      sourceCount: row.source_count,
      sourceIds: JSON.parse(row.source_ids),
      sourceContentHash: row.source_content_hash,
      itemCount: row.item_count,
      expiresAt: row.expires_at,
      loadedFromCache: Boolean(row.loaded_from_cache),
      version: row.version,
      notes: row.notes,
      displayMeta: {
        selectionName: row.selection_name,
        totalWords: row.total_words,
        llmAvailable: Boolean(row.llm_available),
      },
    }))
  } catch (error) {
    console.error('[CacheMetadata] Error querying by type:', error)
    return []
  }
}

/**
 * Get recent cache entries
 */
export async function getRecentCacheEntries(
  limit: number = 10
): Promise<CacheMetadata[]> {
  const db = await getDatabase()
  if (!db) return []

  try {
    const rows = await db.all(
      `SELECT * FROM ${CACHE_TABLE} ORDER BY last_accessed_at DESC LIMIT ?`,
      [limit]
    ) as any[]

    return rows.map((row) => ({
      cacheKey: row.cache_key,
      contentType: row.content_type,
      generationMethod: row.generation_method,
      createdAt: row.created_at,
      lastAccessedAt: row.last_accessed_at,
      generationDurationMs: row.generation_duration_ms,
      sourceCount: row.source_count,
      sourceIds: JSON.parse(row.source_ids),
      sourceContentHash: row.source_content_hash,
      itemCount: row.item_count,
      expiresAt: row.expires_at,
      loadedFromCache: Boolean(row.loaded_from_cache),
      version: row.version,
      notes: row.notes,
      displayMeta: {
        selectionName: row.selection_name,
        totalWords: row.total_words,
        llmAvailable: Boolean(row.llm_available),
      },
    }))
  } catch (error) {
    console.error('[CacheMetadata] Error getting recent entries:', error)
    return []
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   STATISTICS
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Get comprehensive cache statistics
 */
export async function getCacheStats(): Promise<CacheStats> {
  const db = await getDatabase()
  
  const defaultStats: CacheStats = {
    byType: { flashcards: 0, quiz: 0, glossary: 0, mindmap: 0, teach: 0 },
    byMethod: { nlp: 0, llm: 0, hybrid: 0, static: 0, cached: 0 },
    totalItems: 0,
    totalEntries: 0,
    hits: cacheHits,
    misses: cacheMisses,
    hitRate: cacheHits + cacheMisses > 0 ? cacheHits / (cacheHits + cacheMisses) : 0,
    estimatedSize: 0,
    staleCount: 0,
  }

  if (!db) return defaultStats

  try {
    // Count by type
    const typeRows = await db.all(
      `SELECT content_type, COUNT(*) as count, SUM(item_count) as items
       FROM ${CACHE_TABLE} GROUP BY content_type`
    ) as any[]

    const byType = { ...defaultStats.byType }
    let totalItems = 0
    let totalEntries = 0

    for (const row of typeRows) {
      byType[row.content_type as ContentType] = row.count
      totalItems += row.items || 0
      totalEntries += row.count
    }

    // Count by method
    const methodRows = await db.all(
      `SELECT generation_method, COUNT(*) as count
       FROM ${CACHE_TABLE} GROUP BY generation_method`
    ) as any[]

    const byMethod = { ...defaultStats.byMethod }
    for (const row of methodRows) {
      byMethod[row.generation_method as GenerationMethod] = row.count
    }

    // Get date range
    const dateRows = await db.all(
      `SELECT MIN(created_at) as oldest, MAX(created_at) as newest FROM ${CACHE_TABLE}`
    ) as any[]

    // Count stale entries
    const now = new Date().toISOString()
    const staleRows = await db.all(
      `SELECT COUNT(*) as count FROM ${CACHE_TABLE} WHERE expires_at < ?`,
      [now]
    ) as any[]

    return {
      byType,
      byMethod,
      totalItems,
      totalEntries,
      hits: cacheHits,
      misses: cacheMisses,
      hitRate: cacheHits + cacheMisses > 0 ? cacheHits / (cacheHits + cacheMisses) : 0,
      estimatedSize: totalEntries * 2048, // Rough estimate: 2KB per entry
      oldestEntry: dateRows?.[0]?.oldest || undefined,
      newestEntry: dateRows?.[0]?.newest || undefined,
      staleCount: staleRows?.[0]?.count || 0,
    }
  } catch (error) {
    console.error('[CacheMetadata] Error getting stats:', error)
    return defaultStats
  }
}

/**
 * Reset hit/miss counters
 */
export function resetCacheCounters(): void {
  cacheHits = 0
  cacheMisses = 0
}

/* ═══════════════════════════════════════════════════════════════════════════
   UTILITY EXPORTS
═══════════════════════════════════════════════════════════════════════════ */

export { hashContent }

