/**
 * Flashcard Cache Service
 *
 * Provides persistent caching for generated flashcards with:
 * - Content-based hashing for cache keys
 * - TTL support for automatic expiration
 * - Generation method tracking (static/llm/hybrid)
 * - Cache statistics for debugging
 *
 * @module lib/generation/flashcardCache
 */

import { getDatabase } from '../codexDatabase'

// Use types that match the openstrand types
export type FlashcardType = 'basic' | 'cloze' | 'reversed'
export type FlashcardSource = 'manual' | 'static' | 'llm'
export type GenerationSource = 'static' | 'llm' | 'hybrid' | 'multi-strand'

export interface CachedFlashcardItem {
  id: string
  type: FlashcardType
  front: string
  back: string
  hints?: string[]
  tags: string[]
  source: FlashcardSource
  confidence: number
  sourceText?: string
}

// ============================================================================
// TYPES
// ============================================================================

export interface CachedFlashcards {
  cards: CachedFlashcardItem[]
  generationMethod: GenerationSource
  strandSlug: string
  createdAt: string
  version: number
}

export interface FlashcardCacheEntry {
  contentHash: string
  strandSlug: string
  flashcardData: CachedFlashcards
  generationMethod: GenerationSource
  cardCount: number
  createdAt: string
  expiresAt: string | null
  version: number
}

export interface FlashcardCacheStats {
  totalEntries: number
  totalCards: number
  hitCount: number
  missCount: number
  hitRate: number
  oldestEntry: string | null
  newestEntry: string | null
}

// ============================================================================
// CACHE CONFIG
// ============================================================================

const DEFAULT_TTL_DAYS = 30
const CACHE_VERSION = 1

// In-memory stats (reset on page reload)
let cacheHits = 0
let cacheMisses = 0

// ============================================================================
// HASHING
// ============================================================================

/**
 * Generate a fast content hash using DJB2 algorithm
 */
export function hashContent(content: string): string {
  let hash = 5381
  for (let i = 0; i < content.length; i++) {
    hash = ((hash << 5) + hash) ^ content.charCodeAt(i)
  }
  // Convert to unsigned 32-bit and then to hex
  return (hash >>> 0).toString(16).padStart(8, '0')
}

/**
 * Generate cache key from content, strand, and method
 */
export function generateCacheKey(
  content: string,
  strandSlug: string,
  useLLM: boolean
): string {
  const contentHash = hashContent(content)
  const method = useLLM ? 'llm' : 'static'
  return `fc_${strandSlug}_${method}_${contentHash}`
}

// ============================================================================
// CORE CACHE OPERATIONS
// ============================================================================

/**
 * Get cached flashcards for content
 */
export async function getFromCache(
  contentHash: string
): Promise<CachedFlashcards | null> {
  const db = await getDatabase()
  if (!db) {
    cacheMisses++
    return null
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = (await db.all(
      `SELECT flashcard_data, generation_method, strand_slug, created_at, version, expires_at
       FROM flashcard_cache
       WHERE content_hash = ?`,
      [contentHash]
    )) as any[] | null

    if (!rows || rows.length === 0) {
      cacheMisses++
      return null
    }

    const row = rows[0]

    // Check expiration
    if (row.expires_at) {
      const expiresAt = new Date(row.expires_at)
      if (expiresAt < new Date()) {
        // Expired - delete and return null
        await db.run('DELETE FROM flashcard_cache WHERE content_hash = ?', [
          contentHash,
        ])
        cacheMisses++
        return null
      }
    }

    cacheHits++

    const flashcardData = JSON.parse(row.flashcard_data) as CachedFlashcards
    return {
      ...flashcardData,
      generationMethod: row.generation_method as GenerationSource,
      strandSlug: row.strand_slug,
      createdAt: row.created_at,
      version: row.version,
    }
  } catch (error) {
    console.error('[FlashcardCache] Error reading from cache:', error)
    cacheMisses++
    return null
  }
}

/**
 * Save flashcards to cache
 */
export async function saveToCache(
  contentHash: string,
  strandSlug: string,
  data: CachedFlashcards,
  ttlDays: number = DEFAULT_TTL_DAYS
): Promise<boolean> {
  const db = await getDatabase()
  if (!db) return false

  try {
    const now = new Date()
    const expiresAt = new Date(now.getTime() + ttlDays * 24 * 60 * 60 * 1000)

    await db.run(
      `INSERT INTO flashcard_cache (content_hash, strand_slug, flashcard_data, generation_method, card_count, created_at, expires_at, version)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(content_hash) DO UPDATE SET
         flashcard_data = excluded.flashcard_data,
         generation_method = excluded.generation_method,
         card_count = excluded.card_count,
         expires_at = excluded.expires_at,
         version = excluded.version`,
      [
        contentHash,
        strandSlug,
        JSON.stringify(data),
        data.generationMethod,
        data.cards.length,
        now.toISOString(),
        expiresAt.toISOString(),
        CACHE_VERSION,
      ]
    )

    console.log(`[FlashcardCache] Saved ${data.cards.length} cards: ${contentHash}`)
    return true
  } catch (error) {
    console.error('[FlashcardCache] Error saving to cache:', error)
    return false
  }
}

/**
 * Invalidate cache entry or all entries
 */
export async function invalidateCache(
  contentHash?: string,
  strandSlug?: string
): Promise<{ deleted: number }> {
  const db = await getDatabase()
  if (!db) return { deleted: 0 }

  try {
    if (contentHash) {
      await db.run('DELETE FROM flashcard_cache WHERE content_hash = ?', [
        contentHash,
      ])
      console.log(`[FlashcardCache] Invalidated: ${contentHash}`)
      return { deleted: 1 }
    } else if (strandSlug) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const countRows = (await db.all(
        'SELECT COUNT(*) as count FROM flashcard_cache WHERE strand_slug = ?',
        [strandSlug]
      )) as any[]
      const count = countRows?.[0]?.count || 0

      await db.run('DELETE FROM flashcard_cache WHERE strand_slug = ?', [strandSlug])
      console.log(`[FlashcardCache] Cleared strand ${strandSlug}: ${count} entries`)
      return { deleted: count }
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const countRows = (await db.all(
        'SELECT COUNT(*) as count FROM flashcard_cache'
      )) as any[]
      const count = countRows?.[0]?.count || 0

      await db.run('DELETE FROM flashcard_cache')
      console.log(`[FlashcardCache] Cleared all entries: ${count}`)
      return { deleted: count }
    }
  } catch (error) {
    console.error('[FlashcardCache] Error invalidating cache:', error)
    return { deleted: 0 }
  }
}

/**
 * Clean up expired entries
 */
export async function cleanupExpired(): Promise<{ deleted: number }> {
  const db = await getDatabase()
  if (!db) return { deleted: 0 }

  try {
    const now = new Date().toISOString()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const countRows = (await db.all(
      'SELECT COUNT(*) as count FROM flashcard_cache WHERE expires_at < ?',
      [now]
    )) as any[]
    const count = countRows?.[0]?.count || 0

    await db.run('DELETE FROM flashcard_cache WHERE expires_at < ?', [now])
    console.log(`[FlashcardCache] Cleaned up ${count} expired entries`)
    return { deleted: count }
  } catch (error) {
    console.error('[FlashcardCache] Error cleaning up expired:', error)
    return { deleted: 0 }
  }
}

// ============================================================================
// CACHE STATISTICS
// ============================================================================

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<FlashcardCacheStats> {
  const db = await getDatabase()
  if (!db) {
    return {
      totalEntries: 0,
      totalCards: 0,
      hitCount: cacheHits,
      missCount: cacheMisses,
      hitRate: 0,
      oldestEntry: null,
      newestEntry: null,
    }
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const countRows = (await db.all(
      'SELECT COUNT(*) as count, SUM(card_count) as total_cards FROM flashcard_cache'
    )) as any[]
    const totalEntries = countRows?.[0]?.count || 0
    const totalCards = countRows?.[0]?.total_cards || 0

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const oldestRows = (await db.all(
      'SELECT created_at FROM flashcard_cache ORDER BY created_at ASC LIMIT 1'
    )) as any[]

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const newestRows = (await db.all(
      'SELECT created_at FROM flashcard_cache ORDER BY created_at DESC LIMIT 1'
    )) as any[]

    const totalRequests = cacheHits + cacheMisses
    const hitRate = totalRequests > 0 ? cacheHits / totalRequests : 0

    return {
      totalEntries,
      totalCards,
      hitCount: cacheHits,
      missCount: cacheMisses,
      hitRate,
      oldestEntry: oldestRows?.[0]?.created_at || null,
      newestEntry: newestRows?.[0]?.created_at || null,
    }
  } catch (error) {
    console.error('[FlashcardCache] Error getting stats:', error)
    return {
      totalEntries: 0,
      totalCards: 0,
      hitCount: cacheHits,
      missCount: cacheMisses,
      hitRate: 0,
      oldestEntry: null,
      newestEntry: null,
    }
  }
}

/**
 * Reset in-memory statistics
 */
export function resetStats(): void {
  cacheHits = 0
  cacheMisses = 0
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if content is cached
 */
export async function isCached(contentHash: string): Promise<boolean> {
  const cached = await getFromCache(contentHash)
  return cached !== null
}

/**
 * Get cache entry age in days
 */
export function getCacheAge(createdAt: string): number {
  const created = new Date(createdAt)
  const now = new Date()
  const diffMs = now.getTime() - created.getTime()
  return Math.floor(diffMs / (24 * 60 * 60 * 1000))
}

/**
 * Get cached flashcards for a specific strand
 */
export async function getCachedForStrand(
  strandSlug: string
): Promise<CachedFlashcards[]> {
  const db = await getDatabase()
  if (!db) return []

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = (await db.all(
      `SELECT flashcard_data, generation_method, strand_slug, created_at, version
       FROM flashcard_cache
       WHERE strand_slug = ?
       ORDER BY created_at DESC`,
      [strandSlug]
    )) as any[] | null

    if (!rows || rows.length === 0) {
      return []
    }

    return rows.map((row) => {
      const data = JSON.parse(row.flashcard_data) as CachedFlashcards
      return {
        ...data,
        generationMethod: row.generation_method as GenerationSource,
        strandSlug: row.strand_slug,
        createdAt: row.created_at,
        version: row.version,
      }
    })
  } catch (error) {
    console.error('[FlashcardCache] Error getting strand cache:', error)
    return []
  }
}

/**
 * Clear cache entries for a specific strand
 */
export async function clearCacheForStrand(
  strandSlug: string
): Promise<{ deleted: number }> {
  const db = await getDatabase()
  if (!db) return { deleted: 0 }

  try {
    const result = await db.run(
      'DELETE FROM flashcard_cache WHERE strand_slug = ?',
      [strandSlug]
    )
    console.log(`[FlashcardCache] Cleared ${result.changes} entries for strand: ${strandSlug}`)
    return { deleted: result.changes || 0 }
  } catch (error) {
    console.error('[FlashcardCache] Error clearing cache for strand:', error)
    return { deleted: 0 }
  }
}

/**
 * Get all cached flashcards (for export)
 */
export async function getAllCachedFlashcards(): Promise<CachedFlashcards[]> {
  const db = await getDatabase()
  if (!db) return []

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = (await db.all(
      `SELECT flashcard_data, generation_method, strand_slug, created_at, version
       FROM flashcard_cache
       ORDER BY created_at DESC`
    )) as any[] | null

    if (!rows || rows.length === 0) {
      return []
    }

    return rows.map((row) => {
      const data = JSON.parse(row.flashcard_data) as CachedFlashcards
      return {
        ...data,
        generationMethod: row.generation_method as GenerationSource,
        strandSlug: row.strand_slug,
        createdAt: row.created_at,
        version: row.version,
      }
    })
  } catch (error) {
    console.error('[FlashcardCache] Error getting all cached:', error)
    return []
  }
}
