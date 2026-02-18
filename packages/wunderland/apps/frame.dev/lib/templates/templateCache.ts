/**
 * Template Cache - IndexedDB Persistence
 * @module lib/templates/templateCache
 *
 * @description
 * IndexedDB-based caching for remote templates with:
 * - LRU eviction when cache is full
 * - TTL-based expiration
 * - Stale-while-revalidate support for offline access
 */

import type {
  CachedTemplateEntry,
  CachedRegistryEntry,
  RemoteTemplate,
  RemoteTemplateRegistry,
  TemplateCategory,
} from './types'
import { CACHE_TTL, CACHE_LIMITS } from './types'

/* ═══════════════════════════════════════════════════════════════════════════
   DATABASE CONFIGURATION
═══════════════════════════════════════════════════════════════════════════ */

const DB_NAME = 'quarry-templates'
const DB_VERSION = 1

const STORES = {
  REGISTRIES: 'registries',
  TEMPLATES: 'templates',
  METADATA: 'metadata',
} as const

/* ═══════════════════════════════════════════════════════════════════════════
   DATABASE INITIALIZATION
═══════════════════════════════════════════════════════════════════════════ */

let dbInstance: IDBDatabase | null = null
let dbPromise: Promise<IDBDatabase> | null = null

/**
 * Open or get existing database connection
 */
async function getDB(): Promise<IDBDatabase> {
  if (dbInstance) {
    return dbInstance
  }

  if (dbPromise) {
    return dbPromise
  }

  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB not available'))
      return
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => {
      console.error('[TemplateCache] Error opening database:', request.error)
      reject(request.error)
    }

    request.onsuccess = () => {
      dbInstance = request.result
      resolve(request.result)
    }

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result

      // Registries store
      if (!db.objectStoreNames.contains(STORES.REGISTRIES)) {
        const registriesStore = db.createObjectStore(STORES.REGISTRIES, { keyPath: 'id' })
        registriesStore.createIndex('cachedAt', 'cachedAt', { unique: false })
      }

      // Templates store
      if (!db.objectStoreNames.contains(STORES.TEMPLATES)) {
        const templatesStore = db.createObjectStore(STORES.TEMPLATES, { keyPath: 'id' })
        templatesStore.createIndex('sourceId', 'template.sourceId', { unique: false })
        templatesStore.createIndex('category', 'template.category', { unique: false })
        templatesStore.createIndex('cachedAt', 'cachedAt', { unique: false })
        templatesStore.createIndex('lastAccessed', 'lastAccessed', { unique: false })
      }

      // Metadata store (key-value)
      if (!db.objectStoreNames.contains(STORES.METADATA)) {
        db.createObjectStore(STORES.METADATA, { keyPath: 'key' })
      }
    }
  })

  return dbPromise
}

/**
 * Execute a transaction and return result
 */
async function withTransaction<T>(
  storeName: string,
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  const db = await getDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, mode)
    const store = transaction.objectStore(storeName)
    const request = operation(store)

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

/* ═══════════════════════════════════════════════════════════════════════════
   REGISTRY CACHE OPERATIONS
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Get cached registry by repository ID
 */
export async function getCachedRegistry(repoId: string): Promise<CachedRegistryEntry | null> {
  try {
    const entry = await withTransaction<CachedRegistryEntry | undefined>(
      STORES.REGISTRIES,
      'readonly',
      (store) => store.get(repoId)
    )
    return entry || null
  } catch (error) {
    console.error('[TemplateCache] Error getting cached registry:', error)
    return null
  }
}

/**
 * Store registry in cache
 */
export async function setCachedRegistry(
  repoId: string,
  registry: RemoteTemplateRegistry,
  etag?: string
): Promise<void> {
  const entry: CachedRegistryEntry = {
    id: repoId,
    registry,
    cachedAt: Date.now(),
    expiresAt: Date.now() + CACHE_TTL.REGISTRY,
    etag,
  }

  try {
    await withTransaction(STORES.REGISTRIES, 'readwrite', (store) => store.put(entry))
  } catch (error) {
    console.error('[TemplateCache] Error caching registry:', error)
  }
}

/**
 * Invalidate registry cache
 */
export async function invalidateRegistry(repoId: string): Promise<void> {
  try {
    await withTransaction(STORES.REGISTRIES, 'readwrite', (store) => store.delete(repoId))
  } catch (error) {
    console.error('[TemplateCache] Error invalidating registry:', error)
  }
}

/**
 * Check if registry is fresh (not expired)
 */
export function isRegistryFresh(entry: CachedRegistryEntry): boolean {
  return Date.now() < entry.expiresAt
}

/**
 * Check if registry is stale but still usable offline
 */
export function isRegistryUsable(entry: CachedRegistryEntry): boolean {
  return Date.now() < entry.cachedAt + CACHE_TTL.STALE_WHILE_REVALIDATE
}

/* ═══════════════════════════════════════════════════════════════════════════
   TEMPLATE CACHE OPERATIONS
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Generate composite cache key for template
 */
export function getTemplateCacheKey(sourceId: string, templateId: string): string {
  return `${sourceId}:${templateId}`
}

/**
 * Get cached template by composite ID
 */
export async function getCachedTemplate(compositeId: string): Promise<CachedTemplateEntry | null> {
  try {
    const entry = await withTransaction<CachedTemplateEntry | undefined>(
      STORES.TEMPLATES,
      'readonly',
      (store) => store.get(compositeId)
    )

    if (entry) {
      // Update access tracking
      await updateTemplateAccess(compositeId)
    }

    return entry || null
  } catch (error) {
    console.error('[TemplateCache] Error getting cached template:', error)
    return null
  }
}

/**
 * Store template in cache
 */
export async function setCachedTemplate(
  template: RemoteTemplate
): Promise<void> {
  const compositeId = getTemplateCacheKey(template.sourceId, template.id)

  const entry: CachedTemplateEntry = {
    id: compositeId,
    template,
    cachedAt: Date.now(),
    expiresAt: Date.now() + CACHE_TTL.TEMPLATE,
    accessCount: 1,
    lastAccessed: Date.now(),
  }

  try {
    // Check cache size and evict if necessary
    await ensureCacheSpace()
    await withTransaction(STORES.TEMPLATES, 'readwrite', (store) => store.put(entry))
  } catch (error) {
    console.error('[TemplateCache] Error caching template:', error)
  }
}

/**
 * Update template access tracking (for LRU)
 */
async function updateTemplateAccess(compositeId: string): Promise<void> {
  try {
    const db = await getDB()
    const transaction = db.transaction(STORES.TEMPLATES, 'readwrite')
    const store = transaction.objectStore(STORES.TEMPLATES)

    const request = store.get(compositeId)
    request.onsuccess = () => {
      const entry = request.result as CachedTemplateEntry | undefined
      if (entry) {
        entry.accessCount++
        entry.lastAccessed = Date.now()
        store.put(entry)
      }
    }
  } catch (error) {
    // Non-critical error, just log
    console.warn('[TemplateCache] Error updating access tracking:', error)
  }
}

/**
 * Get all cached templates for a repository
 */
export async function getCachedTemplatesByRepo(repoId: string): Promise<CachedTemplateEntry[]> {
  try {
    const db = await getDB()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.TEMPLATES, 'readonly')
      const store = transaction.objectStore(STORES.TEMPLATES)
      const index = store.index('sourceId')
      const request = index.getAll(repoId)

      request.onsuccess = () => resolve(request.result || [])
      request.onerror = () => reject(request.error)
    })
  } catch (error) {
    console.error('[TemplateCache] Error getting templates by repo:', error)
    return []
  }
}

/**
 * Get all cached templates for a category
 */
export async function getCachedTemplatesByCategory(
  category: TemplateCategory
): Promise<CachedTemplateEntry[]> {
  try {
    const db = await getDB()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.TEMPLATES, 'readonly')
      const store = transaction.objectStore(STORES.TEMPLATES)
      const index = store.index('category')
      const request = index.getAll(category)

      request.onsuccess = () => resolve(request.result || [])
      request.onerror = () => reject(request.error)
    })
  } catch (error) {
    console.error('[TemplateCache] Error getting templates by category:', error)
    return []
  }
}

/**
 * Get all cached templates
 */
export async function getAllCachedTemplates(): Promise<CachedTemplateEntry[]> {
  try {
    const db = await getDB()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.TEMPLATES, 'readonly')
      const store = transaction.objectStore(STORES.TEMPLATES)
      const request = store.getAll()

      request.onsuccess = () => resolve(request.result || [])
      request.onerror = () => reject(request.error)
    })
  } catch (error) {
    console.error('[TemplateCache] Error getting all templates:', error)
    return []
  }
}

/**
 * Check if template is fresh (not expired)
 */
export function isTemplateFresh(entry: CachedTemplateEntry): boolean {
  return Date.now() < entry.expiresAt
}

/**
 * Check if template is stale but still usable offline
 */
export function isTemplateUsable(entry: CachedTemplateEntry): boolean {
  return Date.now() < entry.cachedAt + CACHE_TTL.STALE_WHILE_REVALIDATE
}

/* ═══════════════════════════════════════════════════════════════════════════
   CACHE MANAGEMENT
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Ensure there's space in the cache, evict LRU entries if needed
 */
async function ensureCacheSpace(): Promise<void> {
  try {
    const db = await getDB()
    const transaction = db.transaction(STORES.TEMPLATES, 'readwrite')
    const store = transaction.objectStore(STORES.TEMPLATES)

    // Count entries
    const countRequest = store.count()

    return new Promise((resolve) => {
      countRequest.onsuccess = () => {
        const count = countRequest.result

        if (count >= CACHE_LIMITS.MAX_TEMPLATES) {
          // Need to evict - get oldest accessed entries
          const index = store.index('lastAccessed')
          const toEvict = Math.ceil(CACHE_LIMITS.MAX_TEMPLATES * 0.1) // Evict 10%

          const cursorRequest = index.openCursor()
          let evicted = 0

          cursorRequest.onsuccess = (event) => {
            const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result
            if (cursor && evicted < toEvict) {
              cursor.delete()
              evicted++
              cursor.continue()
            } else {
              resolve()
            }
          }

          cursorRequest.onerror = () => resolve()
        } else {
          resolve()
        }
      }

      countRequest.onerror = () => resolve()
    })
  } catch (error) {
    console.warn('[TemplateCache] Error ensuring cache space:', error)
  }
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
  registryCount: number
  templateCount: number
  totalBytes: number
  oldestEntry: Date | null
  lastCleared?: number
}> {
  try {
    const db = await getDB()

    const registryCount = await new Promise<number>((resolve) => {
      const transaction = db.transaction(STORES.REGISTRIES, 'readonly')
      const request = transaction.objectStore(STORES.REGISTRIES).count()
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => resolve(0)
    })

    const templateCount = await new Promise<number>((resolve) => {
      const transaction = db.transaction(STORES.TEMPLATES, 'readonly')
      const request = transaction.objectStore(STORES.TEMPLATES).count()
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => resolve(0)
    })

    // Estimate total bytes by summing template content sizes
    const totalBytes = await new Promise<number>((resolve) => {
      const transaction = db.transaction(STORES.TEMPLATES, 'readonly')
      const store = transaction.objectStore(STORES.TEMPLATES)
      const request = store.getAll()

      request.onsuccess = () => {
        const entries = request.result as CachedTemplateEntry[]
        let bytes = 0
        for (const entry of entries) {
          // Estimate size based on template content
          const templateJson = JSON.stringify(entry.template)
          bytes += templateJson.length * 2 // UTF-16 estimate
        }
        resolve(bytes)
      }
      request.onerror = () => resolve(0)
    })

    const oldestEntry = await new Promise<Date | null>((resolve) => {
      const transaction = db.transaction(STORES.TEMPLATES, 'readonly')
      const index = transaction.objectStore(STORES.TEMPLATES).index('cachedAt')
      const request = index.openCursor()

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result
        if (cursor) {
          const entry = cursor.value as CachedTemplateEntry
          resolve(new Date(entry.cachedAt))
        } else {
          resolve(null)
        }
      }
      request.onerror = () => resolve(null)
    })

    // Get last cleared timestamp from metadata
    const lastCleared = await getMetadata<number>('lastCleared')

    return { registryCount, templateCount, totalBytes, oldestEntry, lastCleared: lastCleared ?? undefined }
  } catch (error) {
    console.error('[TemplateCache] Error getting cache stats:', error)
    return { registryCount: 0, templateCount: 0, totalBytes: 0, oldestEntry: null }
  }
}

/**
 * Clean up expired entries
 */
export async function cleanupExpiredEntries(): Promise<number> {
  let removed = 0
  const now = Date.now()

  try {
    const db = await getDB()

    // Clean registries
    const registryTx = db.transaction(STORES.REGISTRIES, 'readwrite')
    const registryStore = registryTx.objectStore(STORES.REGISTRIES)

    await new Promise<void>((resolve) => {
      const request = registryStore.openCursor()
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result
        if (cursor) {
          const entry = cursor.value as CachedRegistryEntry
          if (now > entry.cachedAt + CACHE_TTL.STALE_WHILE_REVALIDATE) {
            cursor.delete()
            removed++
          }
          cursor.continue()
        } else {
          resolve()
        }
      }
      request.onerror = () => resolve()
    })

    // Clean templates
    const templateTx = db.transaction(STORES.TEMPLATES, 'readwrite')
    const templateStore = templateTx.objectStore(STORES.TEMPLATES)

    await new Promise<void>((resolve) => {
      const request = templateStore.openCursor()
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result
        if (cursor) {
          const entry = cursor.value as CachedTemplateEntry
          if (now > entry.cachedAt + CACHE_TTL.STALE_WHILE_REVALIDATE) {
            cursor.delete()
            removed++
          }
          cursor.continue()
        } else {
          resolve()
        }
      }
      request.onerror = () => resolve()
    })
  } catch (error) {
    console.error('[TemplateCache] Error cleaning up expired entries:', error)
  }

  return removed
}

/**
 * Clear all cached data
 */
export async function clearAllCache(): Promise<void> {
  try {
    const db = await getDB()

    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(
        [STORES.REGISTRIES, STORES.TEMPLATES],
        'readwrite'
      )

      transaction.objectStore(STORES.REGISTRIES).clear()
      transaction.objectStore(STORES.TEMPLATES).clear()

      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
    })

    // Record the clear timestamp (don't clear metadata)
    await setMetadata('lastCleared', Date.now())
  } catch (error) {
    console.error('[TemplateCache] Error clearing cache:', error)
    throw error
  }
}

/**
 * Clear cache for a specific repository
 */
export async function clearRepoCache(repoId: string): Promise<void> {
  try {
    // Clear registry
    await invalidateRegistry(repoId)

    // Clear templates
    const db = await getDB()
    const transaction = db.transaction(STORES.TEMPLATES, 'readwrite')
    const store = transaction.objectStore(STORES.TEMPLATES)
    const index = store.index('sourceId')

    await new Promise<void>((resolve) => {
      const request = index.openCursor(repoId)
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result
        if (cursor) {
          cursor.delete()
          cursor.continue()
        } else {
          resolve()
        }
      }
      request.onerror = () => resolve()
    })
  } catch (error) {
    console.error('[TemplateCache] Error clearing repo cache:', error)
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   METADATA OPERATIONS
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Get metadata value
 */
export async function getMetadata<T>(key: string): Promise<T | null> {
  try {
    const result = await withTransaction<{ key: string; value: T } | undefined>(
      STORES.METADATA,
      'readonly',
      (store) => store.get(key)
    )
    return result?.value ?? null
  } catch (error) {
    console.error('[TemplateCache] Error getting metadata:', error)
    return null
  }
}

/**
 * Set metadata value
 */
export async function setMetadata<T>(key: string, value: T): Promise<void> {
  try {
    await withTransaction(STORES.METADATA, 'readwrite', (store) =>
      store.put({ key, value })
    )
  } catch (error) {
    console.error('[TemplateCache] Error setting metadata:', error)
  }
}

/**
 * Close database connection (for cleanup)
 */
export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.close()
    dbInstance = null
    dbPromise = null
  }
}
