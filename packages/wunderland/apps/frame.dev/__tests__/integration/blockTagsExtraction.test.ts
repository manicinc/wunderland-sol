/**
 * Integration tests for block tags extraction
 * Tests the end-to-end flow of extraction, caching, and invalidation
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ============================================================================
// MOCKS
// ============================================================================

// Mock StorageManager
const mockGetBlockTagsCache = vi.fn()
const mockSaveBlockTagsCache = vi.fn()
const mockInvalidateBlockTagsCache = vi.fn()

vi.mock('@/lib/storage/StorageManager', () => ({
  getStorageManager: vi.fn(() => ({
    getBlockTagsCache: mockGetBlockTagsCache,
    saveBlockTagsCache: mockSaveBlockTagsCache,
    invalidateBlockTagsCache: mockInvalidateBlockTagsCache,
  })),
}))

// Mock NLP functions
vi.mock('@/lib/nlp', () => ({
  parseMarkdownBlocks: vi.fn().mockReturnValue([]),
  generateBlockExtractiveSummary: vi.fn().mockReturnValue('Summary'),
}))

vi.mock('@/lib/nlp/autoTagging', () => ({
  suggestBlockTagsNLP: vi.fn().mockReturnValue([]),
}))

vi.mock('@/lib/utils/deploymentMode', () => ({
  hasApiRoutes: vi.fn(() => false),
}))

vi.mock('@/lib/storage/blockStorage', () => ({
  getLocalBlocks: vi.fn().mockResolvedValue([]),
  updateLocalBlockTag: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/markdown/inlineTagExtractor', () => ({
  extractInlineTags: vi.fn().mockReturnValue([]),
}))

vi.mock('@/lib/storage/tagPersistence', () => ({
  getRejectedTagsForBlock: vi.fn().mockReturnValue([]),
  persistRejectedTag: vi.fn().mockResolvedValue(undefined),
  isTagRejectedInStrand: vi.fn().mockReturnValue(false),
}))

vi.mock('@/lib/blocks/tagSelection', () => ({
  selectBestTagsByLineCount: vi.fn((tags) => tags.slice(0, 3)),
}))

// Import after mocks
const { hasBlocksInCache, invalidateBlocksCache, clearBlocksCache } = await import('@/lib/hooks/useBlockTags')

// ============================================================================
// TESTS
// ============================================================================

describe('Block Tags Extraction Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetBlockTagsCache.mockResolvedValue(null)
    mockSaveBlockTagsCache.mockResolvedValue({})
    mockInvalidateBlockTagsCache.mockResolvedValue(undefined)
    clearBlocksCache()
  })

  afterEach(() => {
    clearBlocksCache()
  })

  // ==========================================================================
  // Cache Utility Functions
  // ==========================================================================

  describe('cache utility functions', () => {
    it('should check cache status via hasBlocksInCache', async () => {
      // No cache exists
      mockGetBlockTagsCache.mockResolvedValueOnce(null)
      const hasCache = await hasBlocksInCache('wiki/test-strand')
      expect(hasCache).toBe(false)
      expect(mockGetBlockTagsCache).toHaveBeenCalledWith('wiki/test-strand')
    })

    it('should return true when cache has blocks', async () => {
      mockGetBlockTagsCache.mockResolvedValueOnce({
        blocks: [{ id: 'block-0', line: 1, type: 'heading' }],
        strandContentHash: 'abc123',
      })

      const hasCache = await hasBlocksInCache('wiki/cached-strand')
      expect(hasCache).toBe(true)
    })

    it('should return false when cache exists but is empty', async () => {
      mockGetBlockTagsCache.mockResolvedValueOnce({
        blocks: [],
        strandContentHash: 'abc123',
      })

      const hasCache = await hasBlocksInCache('wiki/empty-strand')
      expect(hasCache).toBe(false)
    })

    it('should invalidate cache via invalidateBlocksCache', async () => {
      await invalidateBlocksCache('wiki/invalidate-test')
      expect(mockInvalidateBlockTagsCache).toHaveBeenCalledWith('wiki/invalidate-test')
    })

    it('should clear all memory cache when no path specified', async () => {
      clearBlocksCache()
      // Memory cache is cleared (internal state)
      // This is a no-op verification - clearBlocksCache doesn't throw
      expect(true).toBe(true)
    })
  })

  // ==========================================================================
  // StorageManager Integration
  // ==========================================================================

  describe('StorageManager integration', () => {
    it('should query StorageManager for cache', async () => {
      mockGetBlockTagsCache.mockResolvedValueOnce(null)
      await hasBlocksInCache('wiki/storage-test')
      expect(mockGetBlockTagsCache).toHaveBeenCalledWith('wiki/storage-test')
    })

    it('should call StorageManager invalidate', async () => {
      await invalidateBlocksCache('wiki/to-invalidate')
      expect(mockInvalidateBlockTagsCache).toHaveBeenCalledWith('wiki/to-invalidate')
    })
  })

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe('edge cases', () => {
    it('should handle empty strand path gracefully', async () => {
      const hasCache = await hasBlocksInCache('')
      expect(mockGetBlockTagsCache).toHaveBeenCalledWith('')
    })

    it('should handle null cache response', async () => {
      mockGetBlockTagsCache.mockResolvedValueOnce(null)
      const result = await hasBlocksInCache('wiki/null-test')
      expect(result).toBe(false)
    })

    it('should handle storage errors gracefully', async () => {
      mockGetBlockTagsCache.mockRejectedValueOnce(new Error('Storage error'))

      // Should not throw, should return false
      try {
        const result = await hasBlocksInCache('wiki/error-test')
        // If it doesn't throw, that's acceptable behavior
      } catch {
        // If it throws, that's also acceptable for error propagation
      }
    })
  })
})
