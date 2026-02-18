/**
 * Summarization Cache
 * @module lib/summarization/cache
 *
 * IndexedDB cache for summarization results.
 * Uses content-based hashing for cache keys.
 */

import type { SummarizationRequest, SummarizationResult } from './types'

// ============================================================================
// CONFIGURATION
// ============================================================================

const DB_NAME = 'quarry-summarization-cache'
const DB_VERSION = 1
const STORE_NAME = 'summaries'
const DEFAULT_TTL = 24 * 60 * 60 * 1000 // 24 hours

// ============================================================================
// DATABASE
// ============================================================================

interface CachedSummary {
  key: string
  result: SummarizationResult
  createdAt: number
  expiresAt: number
}

let dbPromise: Promise<IDBDatabase> | null = null

/**
 * Get or initialize the cache database
 */
function getDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise

  dbPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not available'))
      return
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'key' })
        store.createIndex('expiresAt', 'expiresAt', { unique: false })
      }
    }
  })

  return dbPromise
}

// ============================================================================
// HASHING
// ============================================================================

/**
 * Generate a cache key from request parameters
 */
export function generateCacheKey(request: SummarizationRequest): string {
  // Create a deterministic representation of the request
  const keyData = {
    sources: request.sources.map(s => ({
      url: s.url,
      content: s.content.substring(0, 500), // First 500 chars for uniqueness
    })),
    type: request.type,
    length: request.length,
    focus: request.focus || '',
    audience: request.audience || 'general',
    citations: request.includeCitations || false,
  }

  // Simple hash function
  const str = JSON.stringify(keyData)
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }

  return `sum_${Math.abs(hash).toString(36)}_${request.type}_${request.length}`
}

// ============================================================================
// CACHE OPERATIONS
// ============================================================================

/**
 * Get a cached summary
 */
export async function getCachedSummary(key: string): Promise<SummarizationResult | null> {
  try {
    const db = await getDB()

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const request = store.get(key)

      request.onsuccess = () => {
        const cached = request.result as CachedSummary | undefined

        if (!cached) {
          resolve(null)
          return
        }

        // Check expiration
        if (cached.expiresAt < Date.now()) {
          // Clean up expired entry
          deleteCachedSummary(key).catch(console.warn)
          resolve(null)
          return
        }

        resolve({
          ...cached.result,
          cacheKey: key,
          fromCache: true,
        })
      }

      request.onerror = () => reject(request.error)
    })
  } catch (error) {
    console.warn('[SummarizationCache] Get failed:', error)
    return null
  }
}

/**
 * Cache a summary result
 */
export async function cacheSummary(
  key: string,
  result: SummarizationResult,
  ttl: number = DEFAULT_TTL
): Promise<void> {
  try {
    const db = await getDB()
    const now = Date.now()

    const cached: CachedSummary = {
      key,
      result: { ...result, cacheKey: key },
      createdAt: now,
      expiresAt: now + ttl,
    }

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const request = store.put(cached)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  } catch (error) {
    console.warn('[SummarizationCache] Put failed:', error)
  }
}

/**
 * Delete a cached summary
 */
export async function deleteCachedSummary(key: string): Promise<void> {
  try {
    const db = await getDB()

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const request = store.delete(key)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  } catch (error) {
    console.warn('[SummarizationCache] Delete failed:', error)
  }
}

/**
 * Clear all cached summaries
 */
export async function clearSummarizationCache(): Promise<void> {
  try {
    const db = await getDB()

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const request = store.clear()

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  } catch (error) {
    console.warn('[SummarizationCache] Clear failed:', error)
  }
}

/**
 * Clean up expired entries
 */
export async function cleanupExpiredSummaries(): Promise<number> {
  try {
    const db = await getDB()
    const now = Date.now()
    let deleted = 0

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const index = store.index('expiresAt')
      const range = IDBKeyRange.upperBound(now)
      const request = index.openCursor(range)

      request.onsuccess = () => {
        const cursor = request.result
        if (cursor) {
          cursor.delete()
          deleted++
          cursor.continue()
        } else {
          resolve(deleted)
        }
      }

      request.onerror = () => reject(request.error)
    })
  } catch (error) {
    console.warn('[SummarizationCache] Cleanup failed:', error)
    return 0
  }
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
  count: number
  oldestEntry: number | null
  newestEntry: number | null
}> {
  try {
    const db = await getDB()

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const countReq = store.count()
      const allReq = store.getAll()

      tx.oncomplete = () => {
        const entries = allReq.result as CachedSummary[]
        resolve({
          count: countReq.result,
          oldestEntry: entries.length > 0
            ? Math.min(...entries.map(e => e.createdAt))
            : null,
          newestEntry: entries.length > 0
            ? Math.max(...entries.map(e => e.createdAt))
            : null,
        })
      }

      tx.onerror = () => reject(tx.error)
    })
  } catch (error) {
    console.warn('[SummarizationCache] Stats failed:', error)
    return { count: 0, oldestEntry: null, newestEntry: null }
  }
}
