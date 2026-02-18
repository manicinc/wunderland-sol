/**
 * Cache Reset Utility
 * @module lib/utils/cacheReset
 *
 * Utility functions to clear all caches and trigger re-indexing with BERT.
 * Can be called from browser console or admin UI.
 *
 * Usage from browser console:
 * ```
 * import('/lib/utils/cacheReset.js').then(m => m.resetAllCachesAndReindex())
 * ```
 *
 * Or use the global helper (added to window in development):
 * ```
 * window.quarryResetCache()
 * ```
 */

import { clearCodexCache } from '@/lib/codexCache'
import { clearSummarizationCache } from '@/lib/summarization/cache'
import { DEFAULT_WEAVES, DEFAULT_WIKI_LOOMS } from '@/lib/codexDatabase'

/* ═══════════════════════════════════════════════════════════════════════════
   AUTO CACHE INVALIDATION - Hash-based structure detection
═══════════════════════════════════════════════════════════════════════════ */

const CACHE_STRUCTURE_KEY = 'quarry-structure-hash'

/**
 * Simple hash of object for cache invalidation
 * Uses djb2 algorithm - fast and produces good distribution
 */
function hashConfig(obj: unknown): string {
  const str = JSON.stringify(obj)
  let hash = 5381
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i)
  }
  return (hash >>> 0).toString(36)
}

/**
 * Get current structure hash from DEFAULT_WEAVES + DEFAULT_WIKI_LOOMS
 * When these change, hash changes automatically - no manual version bumping
 */
export function getStructureHash(): string {
  return hashConfig({ weaves: DEFAULT_WEAVES, looms: DEFAULT_WIKI_LOOMS })
}

/**
 * Check if cache needs invalidation due to structure change
 * Called on app load - if hash mismatch, clears cache automatically
 * @returns true if cache was cleared
 */
export async function checkAndInvalidateCache(): Promise<boolean> {
  if (typeof window === 'undefined') return false

  const storedHash = localStorage.getItem(CACHE_STRUCTURE_KEY)
  const currentHash = getStructureHash()

  if (storedHash === currentHash) {
    return false // Cache matches current structure
  }

  console.log(`[CacheReset] Structure changed: ${storedHash ?? 'none'} → ${currentHash}`)

  // Clear all caches
  await resetAllCachesAndReindex(false) // Don't auto-reload, caller handles it

  // Store new hash
  localStorage.setItem(CACHE_STRUCTURE_KEY, currentHash)

  return true
}

export interface ResetResult {
  success: boolean
  codexCacheCleared: boolean
  summarizationCacheCleared: boolean
  indexedDBCleared: boolean
  workerCacheCleared: boolean
  error?: string
}

export interface FullCacheResetOptions {
  /** Keep user data like ratings, bookmarks (default: false) */
  preserveUserData?: boolean
  /** Start rebuild after clear (default: false) */
  triggerReindex?: boolean
}

export interface CacheResetResult {
  cleared: string[]
  failed: Array<{ name: string; error: unknown }>
  totalBytes: number
  timestamp: string
}

/**
 * Clear all IndexedDB databases used by Quarry
 */
async function clearAllIndexedDB(): Promise<boolean> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return false
  }

  const dbNames = [
    'fabric_codex',           // Main codex cache
    'quarry-summarization-cache', // Summarization cache
    'quarry-embeddings',      // Embedding vectors
    'quarry-search-index',    // Search index
  ]

  let allCleared = true

  for (const dbName of dbNames) {
    try {
      await new Promise<void>((resolve, reject) => {
        const request = window.indexedDB.deleteDatabase(dbName)
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
        request.onblocked = () => {
          console.warn(`[CacheReset] Database ${dbName} is blocked, closing connections...`)
          resolve()
        }
      })
      console.log(`[CacheReset] Cleared IndexedDB: ${dbName}`)
    } catch (error) {
      console.warn(`[CacheReset] Failed to clear ${dbName}:`, error)
      allCleared = false
    }
  }

  return allCleared
}

/**
 * Clear Web Worker caches
 */
async function clearWorkerCaches(): Promise<boolean> {
  if (typeof window === 'undefined') return false

  try {
    // Post message to summarization worker to clear its in-memory cache
    if (window.navigator?.serviceWorker?.controller) {
      window.navigator.serviceWorker.controller.postMessage({
        type: 'CLEAR_CACHE',
      })
    }

    // Clear Cache Storage (service worker caches)
    if ('caches' in window) {
      const cacheNames = await caches.keys()
      await Promise.all(
        cacheNames.map(name => caches.delete(name))
      )
      console.log(`[CacheReset] Cleared ${cacheNames.length} Cache Storage entries`)
    }

    return true
  } catch (error) {
    console.warn('[CacheReset] Failed to clear worker caches:', error)
    return false
  }
}

/**
 * Reset all caches and trigger re-indexing
 *
 * This will:
 * 1. Clear the Codex strand cache (SQLite/IndexedDB)
 * 2. Clear the summarization cache (IndexedDB)
 * 3. Clear all IndexedDB databases
 * 4. Clear service worker caches
 * 5. Reload the page to trigger fresh indexing with BERT
 *
 * @param autoReload - Whether to automatically reload the page after clearing
 * @returns Result object with status of each operation
 */
export async function resetAllCachesAndReindex(autoReload = true): Promise<ResetResult> {
  console.log('[CacheReset] Starting full cache reset...')

  const result: ResetResult = {
    success: false,
    codexCacheCleared: false,
    summarizationCacheCleared: false,
    indexedDBCleared: false,
    workerCacheCleared: false,
  }

  try {
    // 1. Clear Codex cache
    try {
      await clearCodexCache()
      result.codexCacheCleared = true
      console.log('[CacheReset] ✓ Codex cache cleared')
    } catch (error) {
      console.warn('[CacheReset] ✗ Failed to clear Codex cache:', error)
    }

    // 2. Clear Summarization cache
    try {
      await clearSummarizationCache()
      result.summarizationCacheCleared = true
      console.log('[CacheReset] ✓ Summarization cache cleared')
    } catch (error) {
      console.warn('[CacheReset] ✗ Failed to clear summarization cache:', error)
    }

    // 3. Clear all IndexedDB databases
    result.indexedDBCleared = await clearAllIndexedDB()
    if (result.indexedDBCleared) {
      console.log('[CacheReset] ✓ All IndexedDB databases cleared')
    }

    // 4. Clear worker caches
    result.workerCacheCleared = await clearWorkerCaches()
    if (result.workerCacheCleared) {
      console.log('[CacheReset] ✓ Worker caches cleared')
    }

    // Mark as successful if at least the main caches were cleared
    result.success = result.codexCacheCleared || result.summarizationCacheCleared || result.indexedDBCleared

    console.log('[CacheReset] Cache reset complete:', result)

    // 5. Reload to trigger fresh indexing with BERT
    if (autoReload && result.success) {
      console.log('[CacheReset] Reloading page to trigger fresh indexing with BERT...')
      setTimeout(() => {
        window.location.reload()
      }, 500)
    }

    return result
  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error)
    console.error('[CacheReset] Reset failed:', error)
    return result
  }
}

/**
 * Quick cache stats for debugging
 */
export async function getCacheInfo(): Promise<{
  indexedDBDatabases: string[]
  cacheStorageEntries: number
  localStorageKeys: number
}> {
  const info = {
    indexedDBDatabases: [] as string[],
    cacheStorageEntries: 0,
    localStorageKeys: 0,
  }

  if (typeof window === 'undefined') return info

  // Check IndexedDB databases
  if ('databases' in indexedDB) {
    try {
      const dbs = await indexedDB.databases()
      info.indexedDBDatabases = dbs.map(db => db.name || 'unknown')
    } catch {
      info.indexedDBDatabases = ['(enumeration not supported)']
    }
  }

  // Check Cache Storage
  if ('caches' in window) {
    try {
      const names = await caches.keys()
      info.cacheStorageEntries = names.length
    } catch {
      // Ignore
    }
  }

  // Check localStorage
  try {
    info.localStorageKeys = localStorage.length
  } catch {
    // Ignore
  }

  return info
}

/* ═══════════════════════════════════════════════════════════════════════════
   FULL CACHE RESET (Nuclear Option)
═══════════════════════════════════════════════════════════════════════════ */

/**
 * All IndexedDB databases used by Quarry
 */
const ALL_INDEXEDDB_DATABASES = [
  'fabric_codex',               // Main codex cache
  'quarry-summarization-cache', // Summarization cache
  'quarry-citations',           // Citation cache
  'quarry-codex-local',         // Local codex data
  'quarry-kv-store',            // Key-value store for dynamic docs
  'openstrand_db',              // OpenStrand database
  'quarry-embeddings',          // Embedding vectors
  'quarry-search-index',        // Search index
]

/**
 * localStorage prefixes to clear
 */
const LOCALSTORAGE_PREFIXES = [
  'quarry-',
  'codex-',
  'fabric-',
  'strand-',
]

/**
 * Full cache reset - clears ALL Quarry caches completely
 *
 * This is the "nuclear option" for cache management:
 * - Clears all IndexedDB databases
 * - Clears localStorage items with Quarry prefixes
 * - Clears service worker caches
 * - Optionally preserves user data (ratings, bookmarks)
 * - Optionally triggers full reindex
 *
 * @param options - Configuration for the reset
 * @returns Result with details of what was cleared/failed
 */
export async function fullCacheReset(
  options: FullCacheResetOptions = {}
): Promise<CacheResetResult> {
  const { preserveUserData = false, triggerReindex = false } = options

  console.log('[FullCacheReset] Starting nuclear cache reset...')
  console.log(`[FullCacheReset] Options: preserveUserData=${preserveUserData}, triggerReindex=${triggerReindex}`)

  const results: CacheResetResult = {
    cleared: [],
    failed: [],
    totalBytes: 0,
    timestamp: new Date().toISOString(),
  }

  // 1. Clear all IndexedDB databases
  if (typeof window !== 'undefined' && window.indexedDB) {
    for (const dbName of ALL_INDEXEDDB_DATABASES) {
      try {
        await new Promise<void>((resolve, reject) => {
          const request = window.indexedDB.deleteDatabase(dbName)
          request.onsuccess = () => resolve()
          request.onerror = () => reject(request.error)
          request.onblocked = () => {
            console.warn(`[FullCacheReset] Database ${dbName} is blocked, attempting to close...`)
            // Give connections time to close
            setTimeout(resolve, 100)
          }
        })
        results.cleared.push(`idb:${dbName}`)
        console.log(`[FullCacheReset] ✓ Cleared IndexedDB: ${dbName}`)
      } catch (error) {
        results.failed.push({ name: `idb:${dbName}`, error })
        console.warn(`[FullCacheReset] ✗ Failed to clear ${dbName}:`, error)
      }
    }
  }

  // 2. Clear application caches (Codex, Summarization)
  try {
    await clearCodexCache()
    results.cleared.push('codex-cache')
    console.log('[FullCacheReset] ✓ Cleared Codex cache')
  } catch (error) {
    results.failed.push({ name: 'codex-cache', error })
    console.warn('[FullCacheReset] ✗ Failed to clear Codex cache:', error)
  }

  try {
    await clearSummarizationCache()
    results.cleared.push('summarization-cache')
    console.log('[FullCacheReset] ✓ Cleared Summarization cache')
  } catch (error) {
    results.failed.push({ name: 'summarization-cache', error })
    console.warn('[FullCacheReset] ✗ Failed to clear Summarization cache:', error)
  }

  // 3. Clear service worker caches
  if (typeof window !== 'undefined' && 'caches' in window) {
    try {
      const cacheNames = await caches.keys()
      for (const name of cacheNames) {
        await caches.delete(name)
        results.cleared.push(`sw:${name}`)
      }
      console.log(`[FullCacheReset] ✓ Cleared ${cacheNames.length} service worker caches`)
    } catch (error) {
      results.failed.push({ name: 'service-worker-caches', error })
      console.warn('[FullCacheReset] ✗ Failed to clear service worker caches:', error)
    }
  }

  // 4. Clear localStorage items with Quarry prefixes
  if (typeof window !== 'undefined' && window.localStorage) {
    const keysToRemove: string[] = []

    // Collect keys to remove
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key) {
        for (const prefix of LOCALSTORAGE_PREFIXES) {
          if (key.startsWith(prefix)) {
            keysToRemove.push(key)
            break
          }
        }
      }
    }

    // Remove keys (unless preserving user data)
    const userDataKeys = ['quarry-bookmarks', 'quarry-ratings', 'quarry-preferences']
    for (const key of keysToRemove) {
      if (preserveUserData && userDataKeys.some(udk => key.includes(udk))) {
        console.log(`[FullCacheReset] ⊘ Preserved user data: ${key}`)
        continue
      }
      try {
        localStorage.removeItem(key)
        results.cleared.push(`ls:${key}`)
      } catch (error) {
        results.failed.push({ name: `ls:${key}`, error })
      }
    }
    console.log(`[FullCacheReset] ✓ Cleared ${results.cleared.filter(c => c.startsWith('ls:')).length} localStorage items`)
  }

  // 5. Clear sessionStorage items
  if (typeof window !== 'undefined' && window.sessionStorage) {
    try {
      const keysToRemove: string[] = []
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i)
        if (key) {
          for (const prefix of LOCALSTORAGE_PREFIXES) {
            if (key.startsWith(prefix)) {
              keysToRemove.push(key)
              break
            }
          }
        }
      }
      for (const key of keysToRemove) {
        sessionStorage.removeItem(key)
        results.cleared.push(`ss:${key}`)
      }
      console.log(`[FullCacheReset] ✓ Cleared ${keysToRemove.length} sessionStorage items`)
    } catch (error) {
      results.failed.push({ name: 'session-storage', error })
    }
  }

  // 6. Notify service worker to clear in-memory caches
  if (typeof window !== 'undefined' && window.navigator?.serviceWorker?.controller) {
    try {
      window.navigator.serviceWorker.controller.postMessage({
        type: 'CLEAR_ALL_CACHES',
      })
      results.cleared.push('sw-memory-cache')
      console.log('[FullCacheReset] ✓ Notified service worker to clear memory caches')
    } catch (error) {
      results.failed.push({ name: 'sw-memory-cache', error })
    }
  }

  // Summary
  console.log('═'.repeat(60))
  console.log('[FullCacheReset] RESET COMPLETE')
  console.log(`[FullCacheReset] Cleared: ${results.cleared.length} items`)
  console.log(`[FullCacheReset] Failed: ${results.failed.length} items`)
  console.log('═'.repeat(60))

  // 7. Trigger reindex if requested
  if (triggerReindex && typeof window !== 'undefined') {
    console.log('[FullCacheReset] Triggering full reindex...')
    // Emit a custom event that the app can listen for
    window.dispatchEvent(new CustomEvent('quarry:fullReindex', {
      detail: { timestamp: results.timestamp, cleared: results.cleared.length }
    }))

    // Reload after short delay to allow event handlers to run
    setTimeout(() => {
      console.log('[FullCacheReset] Reloading page to trigger fresh indexing...')
      window.location.reload()
    }, 500)
  }

  return results
}

/**
 * Get detailed cache statistics for all caches
 */
export async function getFullCacheStats(): Promise<{
  indexedDB: Array<{ name: string; exists: boolean }>
  localStorage: { count: number; quarryPrefixed: number }
  sessionStorage: { count: number; quarryPrefixed: number }
  serviceWorker: { cacheCount: number; cacheNames: string[] }
}> {
  const stats = {
    indexedDB: [] as Array<{ name: string; exists: boolean }>,
    localStorage: { count: 0, quarryPrefixed: 0 },
    sessionStorage: { count: 0, quarryPrefixed: 0 },
    serviceWorker: { cacheCount: 0, cacheNames: [] as string[] },
  }

  if (typeof window === 'undefined') return stats

  // Check IndexedDB databases
  for (const dbName of ALL_INDEXEDDB_DATABASES) {
    try {
      const exists = await new Promise<boolean>((resolve) => {
        const request = indexedDB.open(dbName)
        request.onsuccess = () => {
          const db = request.result
          const hasStores = db.objectStoreNames.length > 0
          db.close()
          resolve(hasStores)
        }
        request.onerror = () => resolve(false)
      })
      stats.indexedDB.push({ name: dbName, exists })
    } catch {
      stats.indexedDB.push({ name: dbName, exists: false })
    }
  }

  // Check localStorage
  try {
    stats.localStorage.count = localStorage.length
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && LOCALSTORAGE_PREFIXES.some(p => key.startsWith(p))) {
        stats.localStorage.quarryPrefixed++
      }
    }
  } catch {
    // Ignore
  }

  // Check sessionStorage
  try {
    stats.sessionStorage.count = sessionStorage.length
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i)
      if (key && LOCALSTORAGE_PREFIXES.some(p => key.startsWith(p))) {
        stats.sessionStorage.quarryPrefixed++
      }
    }
  } catch {
    // Ignore
  }

  // Check service worker caches
  if ('caches' in window) {
    try {
      const names = await caches.keys()
      stats.serviceWorker.cacheCount = names.length
      stats.serviceWorker.cacheNames = names
    } catch {
      // Ignore
    }
  }

  return stats
}

// Expose to window in development for easy console access
if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
  (window as any).quarryResetCache = resetAllCachesAndReindex;
  (window as any).quarryCacheInfo = getCacheInfo;
  (window as any).quarryFullReset = fullCacheReset;
  (window as any).quarryFullCacheStats = getFullCacheStats;
  console.log('[CacheReset] Debug helpers available: window.quarryResetCache(), window.quarryCacheInfo(), window.quarryFullReset(), window.quarryFullCacheStats()')
}
