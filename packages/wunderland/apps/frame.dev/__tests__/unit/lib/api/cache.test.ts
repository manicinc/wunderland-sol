/**
 * API Cache Tests
 * @module __tests__/unit/lib/api/cache.test
 *
 * Tests for the two-tier API caching system.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  generateCacheKey,
  entityCacheKey,
  getFromCache,
  setInCache,
  hasInCache,
  deleteFromCache,
  invalidateByPrefix,
  clearCache,
  getCacheStats,
  withCache,
  cached,
  getCacheControlHeader,
  CacheTTL,
  CachePrefix,
  HttpCachePresets,
  type CacheOptions,
  type CacheStats,
  type CacheEntry,
} from '@/lib/api/cache'

describe('API Cache', () => {
  beforeEach(() => {
    clearCache()
  })

  // ============================================================================
  // CacheOptions type
  // ============================================================================

  describe('CacheOptions type', () => {
    it('creates minimal options', () => {
      const options: CacheOptions = {}
      expect(options.ttl).toBeUndefined()
      expect(options.maxItems).toBeUndefined()
    })

    it('creates full options', () => {
      const options: CacheOptions = {
        ttl: 60000,
        maxItems: 100,
      }
      expect(options.ttl).toBe(60000)
      expect(options.maxItems).toBe(100)
    })
  })

  // ============================================================================
  // CacheStats type
  // ============================================================================

  describe('CacheStats type', () => {
    it('creates stats object', () => {
      const stats: CacheStats = {
        hits: 10,
        misses: 5,
        size: 15,
        maxSize: 500,
        hitRate: '66.67%',
      }
      expect(stats.hits).toBe(10)
      expect(stats.hitRate).toBe('66.67%')
    })
  })

  // ============================================================================
  // CacheEntry type
  // ============================================================================

  describe('CacheEntry type', () => {
    it('creates entry with data', () => {
      const entry: CacheEntry<string> = {
        data: 'test data',
        cachedAt: Date.now(),
        ttl: 60000,
      }
      expect(entry.data).toBe('test data')
      expect(entry.ttl).toBe(60000)
    })

    it('creates entry with object data', () => {
      const entry: CacheEntry<{ name: string; value: number }> = {
        data: { name: 'test', value: 42 },
        cachedAt: Date.now(),
        ttl: 30000,
      }
      expect(entry.data.name).toBe('test')
      expect(entry.data.value).toBe(42)
    })
  })

  // ============================================================================
  // CacheTTL constants
  // ============================================================================

  describe('CacheTTL', () => {
    it('SHORT is 30 seconds', () => {
      expect(CacheTTL.SHORT).toBe(30 * 1000)
    })

    it('MEDIUM is 5 minutes', () => {
      expect(CacheTTL.MEDIUM).toBe(5 * 60 * 1000)
    })

    it('LONG is 30 minutes', () => {
      expect(CacheTTL.LONG).toBe(30 * 60 * 1000)
    })

    it('EXTENDED is 2 hours', () => {
      expect(CacheTTL.EXTENDED).toBe(2 * 60 * 60 * 1000)
    })

    it('PERSISTENT is 24 hours', () => {
      expect(CacheTTL.PERSISTENT).toBe(24 * 60 * 60 * 1000)
    })

    it('values are in ascending order', () => {
      expect(CacheTTL.SHORT).toBeLessThan(CacheTTL.MEDIUM)
      expect(CacheTTL.MEDIUM).toBeLessThan(CacheTTL.LONG)
      expect(CacheTTL.LONG).toBeLessThan(CacheTTL.EXTENDED)
      expect(CacheTTL.EXTENDED).toBeLessThan(CacheTTL.PERSISTENT)
    })
  })

  // ============================================================================
  // CachePrefix constants
  // ============================================================================

  describe('CachePrefix', () => {
    it('has WEAVES prefix', () => {
      expect(CachePrefix.WEAVES).toBe('weaves')
    })

    it('has LOOMS prefix', () => {
      expect(CachePrefix.LOOMS).toBe('looms')
    })

    it('has STRANDS prefix', () => {
      expect(CachePrefix.STRANDS).toBe('strands')
    })

    it('has SEARCH prefix', () => {
      expect(CachePrefix.SEARCH).toBe('search')
    })

    it('has PROFILE prefix', () => {
      expect(CachePrefix.PROFILE).toBe('profile')
    })

    it('has STATS prefix', () => {
      expect(CachePrefix.STATS).toBe('stats')
    })

    it('has SYSTEM prefix', () => {
      expect(CachePrefix.SYSTEM).toBe('system')
    })

    it('all prefixes are lowercase strings', () => {
      Object.values(CachePrefix).forEach((prefix) => {
        expect(typeof prefix).toBe('string')
        expect(prefix).toBe(prefix.toLowerCase())
      })
    })
  })

  // ============================================================================
  // generateCacheKey
  // ============================================================================

  describe('generateCacheKey', () => {
    it('generates key with prefix and empty params', () => {
      const key = generateCacheKey('test')
      expect(key.startsWith('test:')).toBe(true)
    })

    it('generates key with params', () => {
      const key = generateCacheKey('search', { query: 'hello', limit: 10 })
      expect(key.startsWith('search:')).toBe(true)
      expect(key.length).toBeGreaterThan('search:'.length)
    })

    it('generates same key for same params', () => {
      const key1 = generateCacheKey('test', { a: 1, b: 2 })
      const key2 = generateCacheKey('test', { a: 1, b: 2 })
      expect(key1).toBe(key2)
    })

    it('generates same key regardless of param order', () => {
      const key1 = generateCacheKey('test', { a: 1, b: 2 })
      const key2 = generateCacheKey('test', { b: 2, a: 1 })
      expect(key1).toBe(key2)
    })

    it('generates different keys for different params', () => {
      const key1 = generateCacheKey('test', { a: 1 })
      const key2 = generateCacheKey('test', { a: 2 })
      expect(key1).not.toBe(key2)
    })

    it('ignores undefined values', () => {
      const key1 = generateCacheKey('test', { a: 1 })
      const key2 = generateCacheKey('test', { a: 1, b: undefined })
      expect(key1).toBe(key2)
    })

    it('ignores null values', () => {
      const key1 = generateCacheKey('test', { a: 1 })
      const key2 = generateCacheKey('test', { a: 1, b: null })
      expect(key1).toBe(key2)
    })

    it('ignores empty string values', () => {
      const key1 = generateCacheKey('test', { a: 1 })
      const key2 = generateCacheKey('test', { a: 1, b: '' })
      expect(key1).toBe(key2)
    })

    it('includes 0 values', () => {
      const key1 = generateCacheKey('test', { a: 1 })
      const key2 = generateCacheKey('test', { a: 1, b: 0 })
      expect(key1).not.toBe(key2)
    })

    it('includes false values', () => {
      const key1 = generateCacheKey('test', { a: 1 })
      const key2 = generateCacheKey('test', { a: 1, b: false })
      expect(key1).not.toBe(key2)
    })

    it('generates 16 character hash suffix', () => {
      const key = generateCacheKey('test', { x: 'value' })
      const hashPart = key.split(':')[1]
      expect(hashPart).toHaveLength(16)
    })
  })

  // ============================================================================
  // entityCacheKey
  // ============================================================================

  describe('entityCacheKey', () => {
    it('generates key with type and id', () => {
      const key = entityCacheKey('strand', 'strand-123')
      expect(key).toBe('strand:strand-123')
    })

    it('works with different types', () => {
      expect(entityCacheKey('weave', 'w1')).toBe('weave:w1')
      expect(entityCacheKey('loom', 'l1')).toBe('loom:l1')
      expect(entityCacheKey('profile', 'p1')).toBe('profile:p1')
    })

    it('handles UUID-style IDs', () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000'
      const key = entityCacheKey('strand', uuid)
      expect(key).toBe(`strand:${uuid}`)
    })
  })

  // ============================================================================
  // Basic cache operations
  // ============================================================================

  describe('setInCache and getFromCache', () => {
    it('stores and retrieves string value', () => {
      setInCache('key1', 'value1')
      expect(getFromCache<string>('key1')).toBe('value1')
    })

    it('stores and retrieves object value', () => {
      const obj = { name: 'test', count: 5 }
      setInCache('key2', obj)
      expect(getFromCache<typeof obj>('key2')).toEqual(obj)
    })

    it('stores and retrieves array value', () => {
      const arr = [1, 2, 3, 4, 5]
      setInCache('key3', arr)
      expect(getFromCache<typeof arr>('key3')).toEqual(arr)
    })

    it('returns undefined for non-existent key', () => {
      expect(getFromCache('nonexistent')).toBeUndefined()
    })

    it('overwrites existing value', () => {
      setInCache('key4', 'first')
      setInCache('key4', 'second')
      expect(getFromCache<string>('key4')).toBe('second')
    })

    it('accepts custom TTL', () => {
      setInCache('key5', 'value', 10000)
      expect(getFromCache<string>('key5')).toBe('value')
    })
  })

  // ============================================================================
  // hasInCache
  // ============================================================================

  describe('hasInCache', () => {
    it('returns true for existing key', () => {
      setInCache('exists', 'value')
      expect(hasInCache('exists')).toBe(true)
    })

    it('returns false for non-existent key', () => {
      expect(hasInCache('notexists')).toBe(false)
    })
  })

  // ============================================================================
  // deleteFromCache
  // ============================================================================

  describe('deleteFromCache', () => {
    it('deletes existing key', () => {
      setInCache('todelete', 'value')
      expect(hasInCache('todelete')).toBe(true)

      const result = deleteFromCache('todelete')

      expect(result).toBe(true)
      expect(hasInCache('todelete')).toBe(false)
    })

    it('returns false for non-existent key', () => {
      const result = deleteFromCache('nonexistent')
      expect(result).toBe(false)
    })
  })

  // ============================================================================
  // invalidateByPrefix
  // ============================================================================

  describe('invalidateByPrefix', () => {
    it('deletes all keys with matching prefix', () => {
      setInCache('search:query1', 'result1')
      setInCache('search:query2', 'result2')
      setInCache('search:query3', 'result3')
      setInCache('other:key', 'value')

      const count = invalidateByPrefix('search')

      expect(count).toBe(3)
      expect(hasInCache('search:query1')).toBe(false)
      expect(hasInCache('search:query2')).toBe(false)
      expect(hasInCache('search:query3')).toBe(false)
      expect(hasInCache('other:key')).toBe(true)
    })

    it('returns 0 when no keys match', () => {
      setInCache('key1', 'value1')
      const count = invalidateByPrefix('nonexistent')
      expect(count).toBe(0)
    })

    it('handles empty cache', () => {
      clearCache()
      const count = invalidateByPrefix('any')
      expect(count).toBe(0)
    })
  })

  // ============================================================================
  // clearCache
  // ============================================================================

  describe('clearCache', () => {
    it('removes all items from cache', () => {
      setInCache('key1', 'value1')
      setInCache('key2', 'value2')
      setInCache('key3', 'value3')

      clearCache()

      expect(hasInCache('key1')).toBe(false)
      expect(hasInCache('key2')).toBe(false)
      expect(hasInCache('key3')).toBe(false)
    })

    it('resets cache statistics', () => {
      // Generate some stats
      setInCache('key', 'value')
      getFromCache('key')
      getFromCache('nonexistent')

      clearCache()

      const stats = getCacheStats()
      expect(stats.hits).toBe(0)
      expect(stats.misses).toBe(0)
    })
  })

  // ============================================================================
  // getCacheStats
  // ============================================================================

  describe('getCacheStats', () => {
    it('returns initial stats', () => {
      const stats = getCacheStats()
      expect(stats.hits).toBe(0)
      expect(stats.misses).toBe(0)
      expect(stats.size).toBe(0)
      expect(stats.maxSize).toBe(500)
      expect(stats.hitRate).toBe('0.00%')
    })

    it('tracks cache hits', () => {
      setInCache('key', 'value')
      getFromCache('key')
      getFromCache('key')
      getFromCache('key')

      const stats = getCacheStats()
      expect(stats.hits).toBe(3)
    })

    it('tracks cache misses', () => {
      getFromCache('miss1')
      getFromCache('miss2')

      const stats = getCacheStats()
      expect(stats.misses).toBe(2)
    })

    it('calculates hit rate correctly', () => {
      setInCache('key', 'value')
      getFromCache('key') // hit
      getFromCache('key') // hit
      getFromCache('miss') // miss

      const stats = getCacheStats()
      expect(stats.hitRate).toBe('66.67%')
    })

    it('tracks cache size', () => {
      setInCache('key1', 'value1')
      setInCache('key2', 'value2')
      setInCache('key3', 'value3')

      const stats = getCacheStats()
      expect(stats.size).toBe(3)
    })
  })

  // ============================================================================
  // withCache
  // ============================================================================

  describe('withCache', () => {
    it('executes function and caches result', async () => {
      const fn = vi.fn().mockResolvedValue('result')

      const result = await withCache('key', fn)

      expect(result).toBe('result')
      expect(fn).toHaveBeenCalledTimes(1)
    })

    it('returns cached result on subsequent calls', async () => {
      const fn = vi.fn().mockResolvedValue('result')

      await withCache('key', fn)
      const result = await withCache('key', fn)

      expect(result).toBe('result')
      expect(fn).toHaveBeenCalledTimes(1)
    })

    it('uses custom TTL', async () => {
      const fn = vi.fn().mockResolvedValue('result')

      await withCache('key', fn, 10000)

      expect(hasInCache('key')).toBe(true)
    })

    it('handles async errors', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('failed'))

      await expect(withCache('key', fn)).rejects.toThrow('failed')
    })
  })

  // ============================================================================
  // cached decorator
  // ============================================================================

  describe('cached', () => {
    it('creates cached wrapper function', async () => {
      const originalFn = vi.fn().mockResolvedValue('result')
      const keyGenerator = () => 'testkey'

      const cachedFn = cached(keyGenerator)(originalFn)
      const result = await cachedFn()

      expect(result).toBe('result')
      expect(originalFn).toHaveBeenCalledTimes(1)
    })

    it('returns cached result on subsequent calls', async () => {
      const originalFn = vi.fn().mockResolvedValue('result')
      const keyGenerator = () => 'testkey2'

      const cachedFn = cached(keyGenerator)(originalFn)

      await cachedFn()
      await cachedFn()
      await cachedFn()

      expect(originalFn).toHaveBeenCalledTimes(1)
    })

    it('uses key generator with arguments', async () => {
      const originalFn = vi.fn().mockImplementation((id: string) => Promise.resolve(`result-${id}`))
      const keyGenerator = (id: string) => `entity:${id}`

      const cachedFn = cached(keyGenerator)(originalFn)

      const result1 = await cachedFn('a')
      const result2 = await cachedFn('b')

      expect(result1).toBe('result-a')
      expect(result2).toBe('result-b')
      expect(originalFn).toHaveBeenCalledTimes(2)
    })

    it('respects custom TTL', async () => {
      const originalFn = vi.fn().mockResolvedValue('result')
      const keyGenerator = () => 'testkey3'

      const cachedFn = cached(keyGenerator, 5000)(originalFn)
      await cachedFn()

      expect(hasInCache('testkey3')).toBe(true)
    })
  })

  // ============================================================================
  // getCacheControlHeader
  // ============================================================================

  describe('getCacheControlHeader', () => {
    it('includes max-age directive', () => {
      const header = getCacheControlHeader(60000)
      expect(header).toContain('max-age=60')
    })

    it('returns no-store header when noStore is true', () => {
      const header = getCacheControlHeader(60000, { noStore: true })
      expect(header).toBe('no-store, no-cache, must-revalidate')
    })

    it('includes public directive', () => {
      const header = getCacheControlHeader(60000, { public: true })
      expect(header).toContain('public')
    })

    it('includes private directive', () => {
      const header = getCacheControlHeader(60000, { private: true })
      expect(header).toContain('private')
    })

    it('includes must-revalidate directive', () => {
      const header = getCacheControlHeader(60000, { mustRevalidate: true })
      expect(header).toContain('must-revalidate')
    })

    it('includes stale-while-revalidate directive', () => {
      const header = getCacheControlHeader(60000, { staleWhileRevalidate: 30000 })
      expect(header).toContain('stale-while-revalidate=30')
    })

    it('combines multiple directives', () => {
      const header = getCacheControlHeader(300000, {
        private: true,
        mustRevalidate: true,
        staleWhileRevalidate: 60000,
      })
      expect(header).toContain('private')
      expect(header).toContain('max-age=300')
      expect(header).toContain('must-revalidate')
      expect(header).toContain('stale-while-revalidate=60')
    })

    it('converts milliseconds to seconds', () => {
      const header = getCacheControlHeader(120000) // 2 minutes in ms
      expect(header).toContain('max-age=120')
    })
  })

  // ============================================================================
  // HttpCachePresets
  // ============================================================================

  describe('HttpCachePresets', () => {
    it('NO_CACHE is no-store directive', () => {
      expect(HttpCachePresets.NO_CACHE).toBe('no-store, no-cache, must-revalidate')
    })

    it('SEARCH has private and must-revalidate', () => {
      expect(HttpCachePresets.SEARCH).toContain('private')
      expect(HttpCachePresets.SEARCH).toContain('must-revalidate')
      expect(HttpCachePresets.SEARCH).toContain('max-age=60')
    })

    it('LIST has private and stale-while-revalidate', () => {
      expect(HttpCachePresets.LIST).toContain('private')
      expect(HttpCachePresets.LIST).toContain('max-age=300')
      expect(HttpCachePresets.LIST).toContain('stale-while-revalidate')
    })

    it('CONTENT has 30 minute max-age', () => {
      expect(HttpCachePresets.CONTENT).toContain('max-age=1800')
    })

    it('STATIC is public', () => {
      expect(HttpCachePresets.STATIC).toContain('public')
      expect(HttpCachePresets.STATIC).toContain('max-age=3600')
    })
  })

  // ============================================================================
  // Integration scenarios
  // ============================================================================

  describe('integration scenarios', () => {
    it('full cache lifecycle', () => {
      // Store items
      setInCache('item1', { data: 'value1' })
      setInCache('item2', { data: 'value2' })

      // Retrieve items
      expect(getFromCache('item1')).toEqual({ data: 'value1' })
      expect(getFromCache('item2')).toEqual({ data: 'value2' })

      // Check stats
      let stats = getCacheStats()
      expect(stats.hits).toBe(2)
      expect(stats.size).toBe(2)

      // Delete one item
      deleteFromCache('item1')
      expect(hasInCache('item1')).toBe(false)
      expect(hasInCache('item2')).toBe(true)

      // Clear all
      clearCache()
      expect(hasInCache('item2')).toBe(false)

      stats = getCacheStats()
      expect(stats.size).toBe(0)
    })

    it('prefix-based cache invalidation', () => {
      // Store items with different prefixes
      setInCache(generateCacheKey(CachePrefix.SEARCH, { q: 'test1' }), 'result1')
      setInCache(generateCacheKey(CachePrefix.SEARCH, { q: 'test2' }), 'result2')
      setInCache(generateCacheKey(CachePrefix.STRANDS, { id: '1' }), 'strand1')
      setInCache(entityCacheKey(CachePrefix.PROFILE, 'user1'), 'profile1')

      const stats = getCacheStats()
      expect(stats.size).toBe(4)

      // Invalidate all search cache
      invalidateByPrefix(CachePrefix.SEARCH)

      const newStats = getCacheStats()
      expect(newStats.size).toBe(2)
    })

    it('async caching with withCache', async () => {
      const fetchData = vi.fn().mockImplementation(async (id: string) => {
        return { id, name: `Item ${id}`, timestamp: Date.now() }
      })

      // First call - should execute function
      const key1 = entityCacheKey('item', '123')
      const result1 = await withCache(key1, () => fetchData('123'))
      expect(fetchData).toHaveBeenCalledTimes(1)

      // Second call - should return cached
      const result2 = await withCache(key1, () => fetchData('123'))
      expect(fetchData).toHaveBeenCalledTimes(1)
      expect(result2).toEqual(result1)

      // Different key - should execute function again
      const key2 = entityCacheKey('item', '456')
      await withCache(key2, () => fetchData('456'))
      expect(fetchData).toHaveBeenCalledTimes(2)
    })
  })
})
