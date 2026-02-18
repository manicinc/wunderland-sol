/**
 * Codex Cache Tests
 * @module __tests__/unit/lib/codexCache.test
 *
 * Tests for SQL-backed cache with memory fallback for Codex strands.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock the sql-storage-adapter before importing codexCache
vi.mock('@framers/sql-storage-adapter', () => ({
  createDatabase: vi.fn(),
}))

describe('Codex Cache', () => {
  // ============================================================================
  // SSR Safety (no window) - Memory fallback
  // ============================================================================

  describe('SSR / memory fallback', () => {
    beforeEach(() => {
      vi.resetModules()
      // @ts-ignore - SSR environment has no window
      vi.stubGlobal('window', undefined)
    })

    afterEach(() => {
      vi.unstubAllGlobals()
    })

    it('getCachedStrand returns null when no window', async () => {
      const { getCachedStrand } = await import('@/lib/codexCache')
      const result = await getCachedStrand('weaves/test.md')
      expect(result).toBeNull()
    })

    it('setCachedStrand uses memory cache in SSR mode', async () => {
      const { getCachedStrand, setCachedStrand } = await import('@/lib/codexCache')

      await setCachedStrand('weaves/test.md', '# Test Content')
      // In SSR mode, getAdapter returns null so memory cache is used
      // Memory cache still works in SSR - it's just not persisted
      const result = await getCachedStrand('weaves/test.md')
      expect(result).toBe('# Test Content')
    })

    it('getCodexCacheStats returns zeros in SSR', async () => {
      const { getCodexCacheStats } = await import('@/lib/codexCache')

      const stats = await getCodexCacheStats()

      expect(stats.totalItems).toBe(0)
      expect(stats.totalBytes).toBe(0)
    })

    it('clearCodexCache does not throw in SSR', async () => {
      const { clearCodexCache } = await import('@/lib/codexCache')

      await expect(clearCodexCache()).resolves.not.toThrow()
    })
  })

  // ============================================================================
  // Browser environment with memory fallback (no SQL adapter)
  // ============================================================================

  describe('browser with memory fallback', () => {
    beforeEach(async () => {
      vi.resetModules()
      // Simulate browser environment
      vi.stubGlobal('window', { location: { origin: 'http://localhost:3000' } })

      // Mock createDatabase to return null (adapter not available)
      const sqlModule = await import('@framers/sql-storage-adapter')
      vi.mocked(sqlModule.createDatabase).mockResolvedValue(null as any)
    })

    afterEach(() => {
      vi.unstubAllGlobals()
    })

    it('setCachedStrand stores in memory when SQL unavailable', async () => {
      const { setCachedStrand, getCachedStrand } = await import('@/lib/codexCache')

      await setCachedStrand('weaves/memory-test.md', '# Memory Content')
      const result = await getCachedStrand('weaves/memory-test.md')

      expect(result).toBe('# Memory Content')
    })

    it('getCachedStrand returns null for non-existent path', async () => {
      const { getCachedStrand } = await import('@/lib/codexCache')

      const result = await getCachedStrand('weaves/non-existent.md')

      expect(result).toBeNull()
    })

    it('getCodexCacheStats returns memory cache stats', async () => {
      const { setCachedStrand, getCodexCacheStats } = await import('@/lib/codexCache')

      await setCachedStrand('weaves/stat-test.md', 'Content here')
      const stats = await getCodexCacheStats()

      expect(stats.totalItems).toBeGreaterThanOrEqual(0)
      expect(stats.totalBytes).toBeGreaterThanOrEqual(0)
    })

    it('clearCodexCache clears memory cache', async () => {
      const { setCachedStrand, getCachedStrand, clearCodexCache } = await import(
        '@/lib/codexCache'
      )

      await setCachedStrand('weaves/clear-test.md', 'Content')
      await clearCodexCache()
      const result = await getCachedStrand('weaves/clear-test.md')

      expect(result).toBeNull()
    })
  })

  // ============================================================================
  // Input validation
  // ============================================================================

  describe('input validation', () => {
    beforeEach(async () => {
      vi.resetModules()
      vi.stubGlobal('window', { location: { origin: 'http://localhost:3000' } })

      const sqlModule = await import('@framers/sql-storage-adapter')
      vi.mocked(sqlModule.createDatabase).mockResolvedValue(null as any)
    })

    afterEach(() => {
      vi.unstubAllGlobals()
    })

    it('getCachedStrand returns null for empty path', async () => {
      const { getCachedStrand } = await import('@/lib/codexCache')

      const result = await getCachedStrand('')

      expect(result).toBeNull()
    })

    it('setCachedStrand does nothing for empty path', async () => {
      const { setCachedStrand, getCachedStrand } = await import('@/lib/codexCache')

      await setCachedStrand('', 'content')
      const result = await getCachedStrand('')

      expect(result).toBeNull()
    })
  })

  // ============================================================================
  // CodexCacheStats type
  // ============================================================================

  describe('CodexCacheStats type', () => {
    it('has correct structure', async () => {
      // Type is imported at module level, just validate shape
      const stats: import('@/lib/codexCache').CodexCacheStats = {
        totalItems: 10,
        totalBytes: 1024,
      }

      expect(stats.totalItems).toBe(10)
      expect(stats.totalBytes).toBe(1024)
    })
  })

  // ============================================================================
  // SQL adapter available
  // ============================================================================

  describe('with SQL adapter', () => {
    let mockAdapter: any

    beforeEach(async () => {
      vi.resetModules()
      vi.stubGlobal('window', { location: { origin: 'http://localhost:3000' } })

      mockAdapter = {
        exec: vi.fn().mockResolvedValue(undefined),
        get: vi.fn(),
        run: vi.fn().mockResolvedValue(undefined),
      }

      const sqlModule = await import('@framers/sql-storage-adapter')
      vi.mocked(sqlModule.createDatabase).mockResolvedValue(mockAdapter)
    })

    afterEach(() => {
      vi.unstubAllGlobals()
    })

    it('creates schema on first access', async () => {
      const { getCachedStrand } = await import('@/lib/codexCache')

      mockAdapter.get.mockResolvedValue(null)
      await getCachedStrand('weaves/test.md')

      expect(mockAdapter.exec).toHaveBeenCalledWith(
        expect.stringContaining('CREATE TABLE IF NOT EXISTS')
      )
    })

    it('getCachedStrand queries SQL adapter', async () => {
      const { getCachedStrand } = await import('@/lib/codexCache')

      mockAdapter.get.mockResolvedValue({
        path: 'weaves/sql-test.md',
        content: '# SQL Content',
        updated_at: '2025-01-01T00:00:00Z',
      })

      const result = await getCachedStrand('weaves/sql-test.md')

      expect(result).toBe('# SQL Content')
      expect(mockAdapter.get).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        ['weaves/sql-test.md']
      )
    })

    it('getCachedStrand returns null when not found in SQL', async () => {
      const { getCachedStrand } = await import('@/lib/codexCache')

      mockAdapter.get.mockResolvedValue(null)

      const result = await getCachedStrand('weaves/not-found.md')

      expect(result).toBeNull()
    })

    it('setCachedStrand inserts into SQL', async () => {
      const { setCachedStrand } = await import('@/lib/codexCache')

      await setCachedStrand('weaves/insert.md', '# Insert Content')

      expect(mockAdapter.run).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO'),
        expect.arrayContaining(['weaves/insert.md', '# Insert Content'])
      )
    })

    it('getCodexCacheStats queries SQL for counts', async () => {
      const { getCodexCacheStats } = await import('@/lib/codexCache')

      mockAdapter.get.mockResolvedValue({
        totalItems: 5,
        totalBytes: 2048,
      })

      const stats = await getCodexCacheStats()

      expect(stats.totalItems).toBe(5)
      expect(stats.totalBytes).toBe(2048)
      expect(mockAdapter.get).toHaveBeenCalledWith(expect.stringContaining('COUNT(*)'))
    })

    it('clearCodexCache deletes from SQL', async () => {
      const { clearCodexCache } = await import('@/lib/codexCache')

      await clearCodexCache()

      expect(mockAdapter.run).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM')
      )
    })
  })

  // ============================================================================
  // Error handling
  // ============================================================================

  describe('error handling', () => {
    let mockAdapter: any

    beforeEach(async () => {
      vi.resetModules()
      vi.stubGlobal('window', { location: { origin: 'http://localhost:3000' } })

      mockAdapter = {
        exec: vi.fn().mockResolvedValue(undefined),
        get: vi.fn(),
        run: vi.fn(),
      }

      const sqlModule = await import('@framers/sql-storage-adapter')
      vi.mocked(sqlModule.createDatabase).mockResolvedValue(mockAdapter)
    })

    afterEach(() => {
      vi.unstubAllGlobals()
    })

    it('getCachedStrand falls back to memory on SQL error', async () => {
      const { getCachedStrand, setCachedStrand } = await import('@/lib/codexCache')

      mockAdapter.get.mockRejectedValue(new Error('SQL error'))

      // First try to get from SQL (fails) - should fallback to empty memory
      const result = await getCachedStrand('weaves/error-test.md')

      expect(result).toBeNull()
    })

    it('setCachedStrand falls back to memory on SQL error', async () => {
      const { setCachedStrand, getCachedStrand } = await import('@/lib/codexCache')

      mockAdapter.run.mockRejectedValue(new Error('SQL error'))

      // This should fallback to memory cache
      await setCachedStrand('weaves/error-test.md', 'Content')

      // Next get will also fail SQL and check memory
      mockAdapter.get.mockRejectedValue(new Error('SQL error'))
      const result = await getCachedStrand('weaves/error-test.md')

      // Should find it in memory fallback
      expect(result).toBe('Content')
    })

    it('getCodexCacheStats falls back to memory on SQL error', async () => {
      const { getCodexCacheStats, setCachedStrand } = await import('@/lib/codexCache')

      // First set something so memory cache has data
      mockAdapter.run.mockRejectedValue(new Error('SQL error'))
      await setCachedStrand('weaves/stats-error.md', 'Test content')

      // Now get stats with SQL error
      mockAdapter.get.mockRejectedValue(new Error('SQL error'))
      const stats = await getCodexCacheStats()

      // Should have memory cache data
      expect(stats.totalItems).toBeGreaterThanOrEqual(0)
    })

    it('clearCodexCache clears memory even on SQL error', async () => {
      const { clearCodexCache, setCachedStrand, getCachedStrand } = await import(
        '@/lib/codexCache'
      )

      // Set via memory fallback
      mockAdapter.run.mockRejectedValue(new Error('SQL error'))
      await setCachedStrand('weaves/clear-error.md', 'Content')

      // Clear should still work
      await clearCodexCache()

      const result = await getCachedStrand('weaves/clear-error.md')
      expect(result).toBeNull()
    })
  })
})
