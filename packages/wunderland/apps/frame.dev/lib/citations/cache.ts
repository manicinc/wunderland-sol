/**
 * Citation Cache - IndexedDB persistence
 * @module citations/cache
 *
 * Offline-first citation caching using IndexedDB.
 * Provides 30-day cache with LRU eviction.
 */

import type {
  Citation,
  CitationCacheEntry,
} from './types'
import { CITATION_CACHE_DURATION } from './types'

const DB_NAME = 'quarry-citations'
const DB_VERSION = 1
const STORE_NAME = 'citations'

// Use the exported cache duration constant
const CACHE_DURATION = CITATION_CACHE_DURATION

// Max cache entries (LRU eviction after this)
const MAX_CACHE_ENTRIES = 1000

/**
 * Open the IndexedDB database
 */
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB not available'))
      return
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => {
      console.error('[citations/cache] Failed to open database:', request.error)
      reject(request.error)
    }

    request.onsuccess = () => {
      resolve(request.result)
    }

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result

      // Create citations store
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'citation.id' })

        // Index by cache time for LRU eviction
        store.createIndex('cachedAt', 'cachedAt', { unique: false })

        // Index by last accessed for LRU
        store.createIndex('lastAccessed', 'lastAccessed', { unique: false })

        // Index by DOI for lookup
        store.createIndex('doi', 'citation.doi', { unique: false })

        // Index by arXiv ID for lookup
        store.createIndex('arxivId', 'citation.arxivId', { unique: false })
      }
    }
  })
}

/**
 * Cache a citation
 */
export async function cacheCitation(citation: Citation): Promise<void> {
  try {
    const db = await openDatabase()
    const now = Date.now()

    const entry: CitationCacheEntry = {
      citation,
      cachedAt: now,
      expiresAt: now + CACHE_DURATION,
      accessCount: 1,
      lastAccessed: now,
    }

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite')
      const store = transaction.objectStore(STORE_NAME)

      const request = store.put(entry)

      request.onerror = () => {
        console.error('[citations/cache] Failed to cache citation:', request.error)
        reject(request.error)
      }

      request.onsuccess = () => {
        resolve()
      }

      transaction.oncomplete = () => {
        db.close()
        // Trigger LRU cleanup in background
        cleanupOldEntries().catch(console.error)
      }
    })
  } catch (error) {
    console.error('[citations/cache] Cache error:', error)
  }
}

/**
 * Get a cached citation by ID
 */
export async function getCachedCitation(id: string): Promise<Citation | null> {
  try {
    const db = await openDatabase()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite')
      const store = transaction.objectStore(STORE_NAME)

      const request = store.get(id)

      request.onerror = () => {
        reject(request.error)
      }

      request.onsuccess = () => {
        const entry = request.result as CitationCacheEntry | undefined

        if (!entry) {
          resolve(null)
          return
        }

        const now = Date.now()

        // Check if expired
        if (entry.expiresAt < now) {
          // Delete expired entry
          store.delete(id)
          resolve(null)
          return
        }

        // Update access stats
        entry.accessCount++
        entry.lastAccessed = now
        store.put(entry)

        resolve(entry.citation)
      }

      transaction.oncomplete = () => {
        db.close()
      }
    })
  } catch (error) {
    console.error('[citations/cache] Get error:', error)
    return null
  }
}

/**
 * Get cached citation by DOI
 */
export async function getCachedByDOI(doi: string): Promise<Citation | null> {
  try {
    const db = await openDatabase()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly')
      const store = transaction.objectStore(STORE_NAME)
      const index = store.index('doi')

      const request = index.get(doi)

      request.onerror = () => {
        reject(request.error)
      }

      request.onsuccess = () => {
        const entry = request.result as CitationCacheEntry | undefined

        if (!entry || entry.expiresAt < Date.now()) {
          resolve(null)
          return
        }

        resolve(entry.citation)
      }

      transaction.oncomplete = () => {
        db.close()
      }
    })
  } catch (error) {
    console.error('[citations/cache] DOI lookup error:', error)
    return null
  }
}

/**
 * Get cached citation by arXiv ID
 */
export async function getCachedByArxivId(arxivId: string): Promise<Citation | null> {
  const normalizedId = arxivId.replace(/^arxiv:/i, '')

  try {
    const db = await openDatabase()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly')
      const store = transaction.objectStore(STORE_NAME)
      const index = store.index('arxivId')

      const request = index.get(normalizedId)

      request.onerror = () => {
        reject(request.error)
      }

      request.onsuccess = () => {
        const entry = request.result as CitationCacheEntry | undefined

        if (!entry || entry.expiresAt < Date.now()) {
          resolve(null)
          return
        }

        resolve(entry.citation)
      }

      transaction.oncomplete = () => {
        db.close()
      }
    })
  } catch (error) {
    console.error('[citations/cache] arXiv lookup error:', error)
    return null
  }
}

/**
 * Search cached citations by text
 */
export async function searchCachedCitations(query: string): Promise<Citation[]> {
  const queryLower = query.toLowerCase()

  try {
    const db = await openDatabase()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly')
      const store = transaction.objectStore(STORE_NAME)

      const request = store.getAll()

      request.onerror = () => {
        reject(request.error)
      }

      request.onsuccess = () => {
        const entries = request.result as CitationCacheEntry[]
        const now = Date.now()

        const results = entries
          .filter((e) => e.expiresAt > now)
          .filter((e) => {
            const c = e.citation
            return (
              c.title.toLowerCase().includes(queryLower) ||
              c.abstract?.toLowerCase().includes(queryLower) ||
              c.authors.some((a) =>
                a.family.toLowerCase().includes(queryLower) ||
                a.given?.toLowerCase().includes(queryLower)
              ) ||
              c.venue?.toLowerCase().includes(queryLower) ||
              c.keywords?.some((k) => k.toLowerCase().includes(queryLower))
            )
          })
          .sort((a, b) => b.accessCount - a.accessCount)
          .slice(0, 20)
          .map((e) => e.citation)

        resolve(results)
      }

      transaction.oncomplete = () => {
        db.close()
      }
    })
  } catch (error) {
    console.error('[citations/cache] Search error:', error)
    return []
  }
}

/**
 * Get all cached citations (for export)
 */
export async function getAllCachedCitations(): Promise<Citation[]> {
  try {
    const db = await openDatabase()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly')
      const store = transaction.objectStore(STORE_NAME)

      const request = store.getAll()

      request.onerror = () => {
        reject(request.error)
      }

      request.onsuccess = () => {
        const entries = request.result as CitationCacheEntry[]
        const now = Date.now()

        const results = entries
          .filter((e) => e.expiresAt > now)
          .map((e) => e.citation)

        resolve(results)
      }

      transaction.oncomplete = () => {
        db.close()
      }
    })
  } catch (error) {
    console.error('[citations/cache] Get all error:', error)
    return []
  }
}

/**
 * Remove old/expired entries (LRU cleanup)
 */
export async function cleanupOldEntries(): Promise<number> {
  try {
    const db = await openDatabase()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite')
      const store = transaction.objectStore(STORE_NAME)

      const request = store.getAll()
      let deletedCount = 0

      request.onerror = () => {
        reject(request.error)
      }

      request.onsuccess = () => {
        const entries = request.result as CitationCacheEntry[]
        const now = Date.now()

        // Delete expired entries
        const expiredIds = entries
          .filter((e) => e.expiresAt < now)
          .map((e) => e.citation.id)

        for (const id of expiredIds) {
          store.delete(id)
          deletedCount++
        }

        // If still over limit, delete least accessed
        const validEntries = entries.filter((e) => e.expiresAt >= now)

        if (validEntries.length > MAX_CACHE_ENTRIES) {
          const sortedByAccess = validEntries.sort(
            (a, b) => a.lastAccessed - b.lastAccessed
          )

          const toDelete = sortedByAccess.slice(0, validEntries.length - MAX_CACHE_ENTRIES)

          for (const entry of toDelete) {
            store.delete(entry.citation.id)
            deletedCount++
          }
        }
      }

      transaction.oncomplete = () => {
        db.close()
        resolve(deletedCount)
      }
    })
  } catch (error) {
    console.error('[citations/cache] Cleanup error:', error)
    return 0
  }
}

/**
 * Clear all cached citations
 */
export async function clearCache(): Promise<void> {
  try {
    const db = await openDatabase()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite')
      const store = transaction.objectStore(STORE_NAME)

      const request = store.clear()

      request.onerror = () => {
        reject(request.error)
      }

      request.onsuccess = () => {
        resolve()
      }

      transaction.oncomplete = () => {
        db.close()
      }
    })
  } catch (error) {
    console.error('[citations/cache] Clear error:', error)
  }
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
  count: number
  oldestEntry: Date | null
  newestEntry: Date | null
  totalAccesses: number
}> {
  try {
    const db = await openDatabase()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly')
      const store = transaction.objectStore(STORE_NAME)

      const request = store.getAll()

      request.onerror = () => {
        reject(request.error)
      }

      request.onsuccess = () => {
        const entries = request.result as CitationCacheEntry[]

        if (entries.length === 0) {
          resolve({
            count: 0,
            oldestEntry: null,
            newestEntry: null,
            totalAccesses: 0,
          })
          return
        }

        const sortedByCache = entries.sort((a, b) => a.cachedAt - b.cachedAt)
        const totalAccesses = entries.reduce((sum, e) => sum + e.accessCount, 0)

        resolve({
          count: entries.length,
          oldestEntry: new Date(sortedByCache[0].cachedAt),
          newestEntry: new Date(sortedByCache[sortedByCache.length - 1].cachedAt),
          totalAccesses,
        })
      }

      transaction.oncomplete = () => {
        db.close()
      }
    })
  } catch (error) {
    console.error('[citations/cache] Stats error:', error)
    return {
      count: 0,
      oldestEntry: null,
      newestEntry: null,
      totalAccesses: 0,
    }
  }
}
