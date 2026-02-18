/**
 * Cache Reset Tests
 * @module __tests__/unit/lib/utils/cacheReset.test
 *
 * Tests for cache reset utility functions.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock dependencies
vi.mock('@/lib/codexCache', () => ({
  clearCodexCache: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/summarization/cache', () => ({
  clearSummarizationCache: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/codexDatabase', () => ({
  DEFAULT_WEAVES: [
    { id: 'wiki', slug: 'wiki', name: 'Wiki' },
    { id: 'notes', slug: 'notes', name: 'Notes' },
  ],
  DEFAULT_WIKI_LOOMS: [
    { id: 'loom-frame', slug: 'frame', name: 'Frame' },
  ],
}))

describe('cacheReset module', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ============================================================================
  // ResetResult type
  // ============================================================================

  describe('ResetResult type', () => {
    it('has correct structure', async () => {
      const { resetAllCachesAndReindex } = await import('@/lib/utils/cacheReset')

      // Call with autoReload=false to avoid reload attempt
      const result = await resetAllCachesAndReindex(false)

      expect(result).toHaveProperty('success')
      expect(result).toHaveProperty('codexCacheCleared')
      expect(result).toHaveProperty('summarizationCacheCleared')
      expect(result).toHaveProperty('indexedDBCleared')
      expect(result).toHaveProperty('workerCacheCleared')
      expect(typeof result.success).toBe('boolean')
    })
  })

  // ============================================================================
  // resetAllCachesAndReindex
  // ============================================================================

  describe('resetAllCachesAndReindex', () => {
    it('clears codex cache', async () => {
      const { clearCodexCache } = await import('@/lib/codexCache')
      const { resetAllCachesAndReindex } = await import('@/lib/utils/cacheReset')

      const result = await resetAllCachesAndReindex(false)

      expect(clearCodexCache).toHaveBeenCalled()
      expect(result.codexCacheCleared).toBe(true)
    })

    it('clears summarization cache', async () => {
      const { clearSummarizationCache } = await import('@/lib/summarization/cache')
      const { resetAllCachesAndReindex } = await import('@/lib/utils/cacheReset')

      const result = await resetAllCachesAndReindex(false)

      expect(clearSummarizationCache).toHaveBeenCalled()
      expect(result.summarizationCacheCleared).toBe(true)
    })

    it('returns success when caches cleared', async () => {
      const { resetAllCachesAndReindex } = await import('@/lib/utils/cacheReset')

      const result = await resetAllCachesAndReindex(false)

      expect(result.success).toBe(true)
    })

    it('handles codex cache failure gracefully', async () => {
      const { clearCodexCache } = await import('@/lib/codexCache')
      vi.mocked(clearCodexCache).mockRejectedValueOnce(new Error('Cache error'))

      const { resetAllCachesAndReindex } = await import('@/lib/utils/cacheReset')

      const result = await resetAllCachesAndReindex(false)

      expect(result.codexCacheCleared).toBe(false)
      // Should still succeed if other caches work
      expect(result.summarizationCacheCleared).toBe(true)
    })

    it('handles summarization cache failure gracefully', async () => {
      const { clearSummarizationCache } = await import('@/lib/summarization/cache')
      vi.mocked(clearSummarizationCache).mockRejectedValueOnce(new Error('Cache error'))

      const { resetAllCachesAndReindex } = await import('@/lib/utils/cacheReset')

      const result = await resetAllCachesAndReindex(false)

      expect(result.summarizationCacheCleared).toBe(false)
      expect(result.codexCacheCleared).toBe(true)
    })

    it('does not reload when autoReload is false', async () => {
      const mockReload = vi.fn()
      vi.stubGlobal('window', {
        location: { reload: mockReload },
      })

      const { resetAllCachesAndReindex } = await import('@/lib/utils/cacheReset')

      await resetAllCachesAndReindex(false)

      // Give timeout a chance to run if it was set
      await new Promise(resolve => setTimeout(resolve, 600))
      expect(mockReload).not.toHaveBeenCalled()

      vi.unstubAllGlobals()
    })
  })

  // ============================================================================
  // getCacheInfo
  // ============================================================================

  describe('getCacheInfo', () => {
    it('returns cache info structure', async () => {
      const { getCacheInfo } = await import('@/lib/utils/cacheReset')

      const info = await getCacheInfo()

      expect(info).toHaveProperty('indexedDBDatabases')
      expect(info).toHaveProperty('cacheStorageEntries')
      expect(info).toHaveProperty('localStorageKeys')
      expect(Array.isArray(info.indexedDBDatabases)).toBe(true)
      expect(typeof info.cacheStorageEntries).toBe('number')
      expect(typeof info.localStorageKeys).toBe('number')
    })

    it('returns empty arrays when window undefined', async () => {
      // In Node test environment, window is undefined
      const { getCacheInfo } = await import('@/lib/utils/cacheReset')

      const info = await getCacheInfo()

      expect(info.indexedDBDatabases).toEqual([])
      expect(info.cacheStorageEntries).toBe(0)
      expect(info.localStorageKeys).toBe(0)
    })

    it('handles IndexedDB enumeration', async () => {
      const mockDatabases = vi.fn().mockResolvedValue([
        { name: 'test-db-1' },
        { name: 'test-db-2' },
      ])

      vi.stubGlobal('window', {})
      vi.stubGlobal('indexedDB', {
        databases: mockDatabases,
      })
      vi.stubGlobal('caches', {
        keys: vi.fn().mockResolvedValue([]),
      })
      vi.stubGlobal('localStorage', { length: 0 })

      vi.resetModules()
      const { getCacheInfo } = await import('@/lib/utils/cacheReset')

      const info = await getCacheInfo()

      expect(info.indexedDBDatabases).toContain('test-db-1')
      expect(info.indexedDBDatabases).toContain('test-db-2')

      vi.unstubAllGlobals()
    })

    it('handles IndexedDB without databases support', async () => {
      vi.stubGlobal('window', {})
      vi.stubGlobal('indexedDB', {}) // No databases method
      vi.stubGlobal('caches', {
        keys: vi.fn().mockResolvedValue([]),
      })
      vi.stubGlobal('localStorage', { length: 5 })

      vi.resetModules()
      const { getCacheInfo } = await import('@/lib/utils/cacheReset')

      const info = await getCacheInfo()

      expect(info.indexedDBDatabases).toEqual([])
      expect(info.localStorageKeys).toBe(5)

      vi.unstubAllGlobals()
    })

    it('counts cache storage entries', async () => {
      const mockCaches = {
        keys: vi.fn().mockResolvedValue(['cache-1', 'cache-2', 'cache-3']),
      }
      vi.stubGlobal('window', { caches: mockCaches })
      vi.stubGlobal('indexedDB', {})
      vi.stubGlobal('caches', mockCaches)
      vi.stubGlobal('localStorage', { length: 0 })

      vi.resetModules()
      const { getCacheInfo } = await import('@/lib/utils/cacheReset')

      const info = await getCacheInfo()

      expect(info.cacheStorageEntries).toBe(3)

      vi.unstubAllGlobals()
    })

    it('counts localStorage keys', async () => {
      vi.stubGlobal('window', {})
      vi.stubGlobal('indexedDB', {})
      vi.stubGlobal('caches', {
        keys: vi.fn().mockResolvedValue([]),
      })
      vi.stubGlobal('localStorage', { length: 10 })

      vi.resetModules()
      const { getCacheInfo } = await import('@/lib/utils/cacheReset')

      const info = await getCacheInfo()

      expect(info.localStorageKeys).toBe(10)

      vi.unstubAllGlobals()
    })
  })

  // ============================================================================
  // getStructureHash - Auto cache invalidation
  // ============================================================================

  describe('getStructureHash', () => {
    it('returns a hash string', async () => {
      const { getStructureHash } = await import('@/lib/utils/cacheReset')

      const hash = getStructureHash()

      expect(typeof hash).toBe('string')
      expect(hash.length).toBeGreaterThan(0)
    })

    it('returns consistent hash for same config', async () => {
      const { getStructureHash } = await import('@/lib/utils/cacheReset')

      const hash1 = getStructureHash()
      const hash2 = getStructureHash()

      expect(hash1).toBe(hash2)
    })

    it('returns different hash when config changes', async () => {
      const { getStructureHash } = await import('@/lib/utils/cacheReset')
      const hash1 = getStructureHash()

      // Re-mock with different config
      vi.doMock('@/lib/codexDatabase', () => ({
        DEFAULT_WEAVES: [
          { id: 'wiki', slug: 'wiki', name: 'Wiki CHANGED' },
        ],
        DEFAULT_WIKI_LOOMS: [],
      }))

      vi.resetModules()
      const { getStructureHash: getStructureHash2 } = await import('@/lib/utils/cacheReset')
      const hash2 = getStructureHash2()

      expect(hash1).not.toBe(hash2)
    })
  })

  // ============================================================================
  // checkAndInvalidateCache - Auto cache invalidation
  // ============================================================================

  describe('checkAndInvalidateCache', () => {
    it('returns false when no window', async () => {
      // In Node environment, window is undefined
      const { checkAndInvalidateCache } = await import('@/lib/utils/cacheReset')

      const result = await checkAndInvalidateCache()

      expect(result).toBe(false)
    })

    it('returns false when hash matches stored hash', async () => {
      const { getStructureHash, checkAndInvalidateCache } = await import('@/lib/utils/cacheReset')
      const currentHash = getStructureHash()

      const mockLocalStorage = {
        getItem: vi.fn().mockReturnValue(currentHash),
        setItem: vi.fn(),
        length: 0,
      }
      vi.stubGlobal('window', { localStorage: mockLocalStorage })
      vi.stubGlobal('localStorage', mockLocalStorage)

      vi.resetModules()
      const mod = await import('@/lib/utils/cacheReset')
      const result = await mod.checkAndInvalidateCache()

      expect(result).toBe(false)

      vi.unstubAllGlobals()
    })

    it('returns true and clears cache when hash differs', async () => {
      const mockLocalStorage = {
        getItem: vi.fn().mockReturnValue('old-hash-value'),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        length: 0,
        key: vi.fn(),
      }
      // Create a mock that immediately triggers onsuccess
      const createMockDeleteRequest = () => {
        const req = { onsuccess: null as (() => void) | null, onerror: null, onblocked: null }
        setTimeout(() => req.onsuccess?.(), 0)
        return req
      }
      const mockIndexedDB = {
        deleteDatabase: vi.fn().mockImplementation(createMockDeleteRequest),
      }

      vi.stubGlobal('window', {
        localStorage: mockLocalStorage,
        indexedDB: mockIndexedDB,
        navigator: {},
      })
      vi.stubGlobal('localStorage', mockLocalStorage)
      vi.stubGlobal('sessionStorage', { length: 0, key: vi.fn() })
      vi.stubGlobal('indexedDB', mockIndexedDB)
      vi.stubGlobal('caches', { keys: vi.fn().mockResolvedValue([]) })

      vi.resetModules()
      const { checkAndInvalidateCache } = await import('@/lib/utils/cacheReset')

      const result = await checkAndInvalidateCache()

      expect(result).toBe(true)
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'quarry-structure-hash',
        expect.any(String)
      )

      vi.unstubAllGlobals()
    })

    it('stores new hash after clearing cache', async () => {
      const mockLocalStorage = {
        getItem: vi.fn().mockReturnValue(null), // No stored hash (first visit)
        setItem: vi.fn(),
        removeItem: vi.fn(),
        length: 0,
        key: vi.fn(),
      }
      // Create a mock that immediately triggers onsuccess
      const createMockDeleteRequest = () => {
        const req = { onsuccess: null as (() => void) | null, onerror: null, onblocked: null }
        setTimeout(() => req.onsuccess?.(), 0)
        return req
      }

      vi.stubGlobal('window', {
        localStorage: mockLocalStorage,
        indexedDB: { deleteDatabase: vi.fn().mockImplementation(createMockDeleteRequest) },
        navigator: {},
      })
      vi.stubGlobal('localStorage', mockLocalStorage)
      vi.stubGlobal('sessionStorage', { length: 0, key: vi.fn() })
      vi.stubGlobal('indexedDB', { deleteDatabase: vi.fn().mockImplementation(createMockDeleteRequest) })
      vi.stubGlobal('caches', { keys: vi.fn().mockResolvedValue([]) })

      vi.resetModules()
      const { checkAndInvalidateCache, getStructureHash } = await import('@/lib/utils/cacheReset')

      await checkAndInvalidateCache()

      const expectedHash = getStructureHash()
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'quarry-structure-hash',
        expectedHash
      )

      vi.unstubAllGlobals()
    })
  })
})
