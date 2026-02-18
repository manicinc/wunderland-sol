/**
 * Quiz Cache Service
 *
 * Provides persistent caching for generated quiz questions with:
 * - Content-based hashing for cache keys
 * - TTL support for automatic expiration
 * - Generation method tracking (static/llm/hybrid)
 * - Cache statistics for debugging
 *
 * @module lib/generation/quizCache
 */

import { getDatabase } from '../codexDatabase'

// Local types that match the hook's QuizQuestion type
export type QuizQuestionType = 'multiple_choice' | 'true_false' | 'fill_blank'
export type QuizDifficulty = 'easy' | 'medium' | 'hard'
export type GenerationSource = 'static' | 'llm' | 'hybrid' | 'multi-strand'

/** Source information for multi-strand quiz generation */
export interface QuizQuestionSource {
  strandId: string
  strandPath: string
  strandTitle: string
}

export interface CachedQuizQuestion {
  id: string
  type: QuizQuestionType
  question: string
  options?: string[]
  answer: string
  explanation?: string
  difficulty: QuizDifficulty
  sourceText?: string
  confidence?: number
  /** Source strand information (for multi-strand generation) */
  source?: QuizQuestionSource
}

// ============================================================================
// TYPES
// ============================================================================

export interface CachedQuiz {
  questions: CachedQuizQuestion[]
  generationMethod: GenerationSource
  createdAt: string
  version: number
}

export interface QuizCacheEntry {
  contentHash: string
  quizData: CachedQuiz
  generationMethod: GenerationSource
  questionCount: number
  createdAt: string
  expiresAt: string | null
  version: number
}

export interface QuizCacheStats {
  totalEntries: number
  totalQuestions: number
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
 * Generate cache key from content and generation options
 */
export function generateCacheKey(
  content: string,
  difficulty: string,
  useLLM: boolean
): string {
  const contentHash = hashContent(content)
  const method = useLLM ? 'llm' : 'static'
  return `quiz_${difficulty}_${method}_${contentHash}`
}

// ============================================================================
// CORE CACHE OPERATIONS
// ============================================================================

/**
 * Get cached quiz for content
 */
export async function getFromCache(
  contentHash: string
): Promise<CachedQuiz | null> {
  const db = await getDatabase()
  if (!db) {
    cacheMisses++
    return null
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = (await db.all(
      `SELECT quiz_data, generation_method, created_at, version, expires_at
       FROM quiz_cache
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
        await db.run('DELETE FROM quiz_cache WHERE content_hash = ?', [
          contentHash,
        ])
        cacheMisses++
        return null
      }
    }

    cacheHits++

    const quizData = JSON.parse(row.quiz_data) as CachedQuiz
    return {
      ...quizData,
      generationMethod: row.generation_method as GenerationSource,
      createdAt: row.created_at,
      version: row.version,
    }
  } catch (error) {
    console.error('[QuizCache] Error reading from cache:', error)
    cacheMisses++
    return null
  }
}

/**
 * Save quiz to cache
 */
export async function saveToCache(
  contentHash: string,
  data: CachedQuiz,
  ttlDays: number = DEFAULT_TTL_DAYS
): Promise<boolean> {
  const db = await getDatabase()
  if (!db) return false

  try {
    const now = new Date()
    const expiresAt = new Date(now.getTime() + ttlDays * 24 * 60 * 60 * 1000)

    await db.run(
      `INSERT INTO quiz_cache (content_hash, quiz_data, generation_method, question_count, created_at, expires_at, version)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(content_hash) DO UPDATE SET
         quiz_data = excluded.quiz_data,
         generation_method = excluded.generation_method,
         question_count = excluded.question_count,
         expires_at = excluded.expires_at,
         version = excluded.version`,
      [
        contentHash,
        JSON.stringify(data),
        data.generationMethod,
        data.questions.length,
        now.toISOString(),
        expiresAt.toISOString(),
        CACHE_VERSION,
      ]
    )

    console.log(`[QuizCache] Saved ${data.questions.length} questions: ${contentHash}`)
    return true
  } catch (error) {
    console.error('[QuizCache] Error saving to cache:', error)
    return false
  }
}

/**
 * Invalidate cache entry or all entries
 */
export async function invalidateCache(
  contentHash?: string
): Promise<{ deleted: number }> {
  const db = await getDatabase()
  if (!db) return { deleted: 0 }

  try {
    if (contentHash) {
      await db.run('DELETE FROM quiz_cache WHERE content_hash = ?', [
        contentHash,
      ])
      console.log(`[QuizCache] Invalidated: ${contentHash}`)
      return { deleted: 1 }
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const countRows = (await db.all(
        'SELECT COUNT(*) as count FROM quiz_cache'
      )) as any[]
      const count = countRows?.[0]?.count || 0

      await db.run('DELETE FROM quiz_cache')
      console.log(`[QuizCache] Cleared all entries: ${count}`)
      return { deleted: count }
    }
  } catch (error) {
    console.error('[QuizCache] Error invalidating cache:', error)
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
      'SELECT COUNT(*) as count FROM quiz_cache WHERE expires_at < ?',
      [now]
    )) as any[]
    const count = countRows?.[0]?.count || 0

    await db.run('DELETE FROM quiz_cache WHERE expires_at < ?', [now])
    console.log(`[QuizCache] Cleaned up ${count} expired entries`)
    return { deleted: count }
  } catch (error) {
    console.error('[QuizCache] Error cleaning up expired:', error)
    return { deleted: 0 }
  }
}

// ============================================================================
// CACHE STATISTICS
// ============================================================================

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<QuizCacheStats> {
  const db = await getDatabase()
  if (!db) {
    return {
      totalEntries: 0,
      totalQuestions: 0,
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
      'SELECT COUNT(*) as count, SUM(question_count) as total_questions FROM quiz_cache'
    )) as any[]
    const totalEntries = countRows?.[0]?.count || 0
    const totalQuestions = countRows?.[0]?.total_questions || 0

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const oldestRows = (await db.all(
      'SELECT created_at FROM quiz_cache ORDER BY created_at ASC LIMIT 1'
    )) as any[]

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const newestRows = (await db.all(
      'SELECT created_at FROM quiz_cache ORDER BY created_at DESC LIMIT 1'
    )) as any[]

    const totalRequests = cacheHits + cacheMisses
    const hitRate = totalRequests > 0 ? cacheHits / totalRequests : 0

    return {
      totalEntries,
      totalQuestions,
      hitCount: cacheHits,
      missCount: cacheMisses,
      hitRate,
      oldestEntry: oldestRows?.[0]?.created_at || null,
      newestEntry: newestRows?.[0]?.created_at || null,
    }
  } catch (error) {
    console.error('[QuizCache] Error getting stats:', error)
    return {
      totalEntries: 0,
      totalQuestions: 0,
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

// ============================================================================
// EXPORT HELPERS
// ============================================================================

export interface ExportableCachedQuiz {
  cacheKey: string
  questions: CachedQuizQuestion[]
  generationMethod: GenerationSource
  createdAt: string
  version: number
}

/**
 * Get all cached quizzes (for export)
 */
export async function getAllCachedQuizzes(): Promise<ExportableCachedQuiz[]> {
  const db = await getDatabase()
  if (!db) return []

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = (await db.all(
      `SELECT content_hash, quiz_data, generation_method, created_at, version
       FROM quiz_cache
       ORDER BY created_at DESC`
    )) as any[] | null

    if (!rows || rows.length === 0) {
      return []
    }

    return rows.map((row) => {
      const data = JSON.parse(row.quiz_data) as CachedQuiz
      return {
        cacheKey: row.content_hash,
        questions: data.questions,
        generationMethod: row.generation_method as GenerationSource,
        createdAt: row.created_at,
        version: row.version,
      }
    })
  } catch (error) {
    console.error('[QuizCache] Error getting all cached:', error)
    return []
  }
}
