/**
 * Tests for SearXNG Search Provider
 * @module tests/unit/research/searxng
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock performance.now
vi.spyOn(performance, 'now').mockReturnValue(0)

// Sample SearXNG response
const mockSearXNGResponse = {
  query: 'test query',
  results: [
    {
      url: 'https://example.com/page1',
      title: 'Example Page 1',
      content: 'This is the first search result',
      engine: 'google',
      publishedDate: '2024-01-15',
    },
    {
      url: 'https://example.org/page2',
      title: 'Example Page 2',
      content: 'This is the second search result',
      engine: 'bing',
    },
    {
      url: 'https://test.com/page3',
      title: 'Test Page 3',
      content: 'This is the third search result',
      engine: 'duckduckgo',
      thumbnail: 'https://test.com/thumb.jpg',
    },
  ],
  suggestions: ['related search 1', 'related search 2'],
  number_of_results: 3,
}

describe('SearXNG Search Provider', () => {
  // Reset modules before each test to clear internal module state (workingInstance cache)
  beforeEach(async () => {
    vi.clearAllMocks()
    vi.resetModules()
    // Setup default successful mock
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockSearXNGResponse),
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  // Helper to get fresh module import
  async function getSearXNGModule() {
    return await import('@/lib/research/apis/searxng')
  }

  describe('searchSearXNG', () => {
    it('should return formatted search results', async () => {
      const { searchSearXNG } = await getSearXNGModule()
      const result = await searchSearXNG('test query')

      expect(result.query).toBe('test query')
      expect(result.results).toHaveLength(3)
      expect(result.source).toBe('searxng')
      expect(result.fromCache).toBe(false)
    })

    it('should correctly format result fields', async () => {
      const { searchSearXNG } = await getSearXNGModule()
      const result = await searchSearXNG('test query')

      expect(result.results[0]).toMatchObject({
        title: 'Example Page 1',
        url: 'https://example.com/page1',
        snippet: 'This is the first search result',
        domain: 'example.com',
        source: 'searxng',
        position: 1,
        publishedDate: '2024-01-15',
      })
    })

    it('should extract domain from URL', async () => {
      const { searchSearXNG } = await getSearXNGModule()
      const result = await searchSearXNG('test query')

      expect(result.results[0].domain).toBe('example.com')
      expect(result.results[1].domain).toBe('example.org')
      expect(result.results[2].domain).toBe('test.com')
    })

    it('should include thumbnail when available', async () => {
      const { searchSearXNG } = await getSearXNGModule()
      const result = await searchSearXNG('test query')

      expect(result.results[2].thumbnail).toBe('https://test.com/thumb.jpg')
    })

    it('should include related searches from suggestions', async () => {
      const { searchSearXNG } = await getSearXNGModule()
      const result = await searchSearXNG('test query')

      expect(result.relatedSearches).toHaveLength(2)
      expect(result.relatedSearches[0].query).toBe('related search 1')
      expect(result.relatedSearches[1].query).toBe('related search 2')
    })

    it('should respect maxResults option', async () => {
      const { searchSearXNG } = await getSearXNGModule()
      const result = await searchSearXNG('test query', { maxResults: 2 })

      expect(result.results).toHaveLength(2)
    })

    it('should handle timeRange option', async () => {
      const { searchSearXNG } = await getSearXNGModule()
      await searchSearXNG('test query', { timeRange: 'week' })

      expect(mockFetch).toHaveBeenCalled()
      const fetchUrl = mockFetch.mock.calls[mockFetch.mock.calls.length - 1][0]
      expect(fetchUrl).toContain('time_range=week')
    })

    it('should throw on network error', async () => {
      // All instances fail
      mockFetch.mockRejectedValue(new Error('Network error'))

      const { searchSearXNG } = await getSearXNGModule()
      await expect(searchSearXNG('test query')).rejects.toThrow('Web search unavailable')
    })

    it('should throw on HTTP error response when all instances fail', async () => {
      // All instances return HTTP errors
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
      })

      const { searchSearXNG } = await getSearXNGModule()
      await expect(searchSearXNG('test query')).rejects.toThrow('Web search unavailable')
    })

    it('should throw SearXNG error after instance is cached', async () => {
      const { searchSearXNG } = await getSearXNGModule()

      // First call succeeds and caches the instance
      await searchSearXNG('test query')

      // Second call fails with HTTP error (instance already cached)
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
      })

      await expect(searchSearXNG('test query 2')).rejects.toThrow('SearXNG error: 500')
    })

    it('should handle AbortError', async () => {
      const abortError = new Error('Aborted')
      abortError.name = 'AbortError'
      mockFetch.mockRejectedValue(abortError)

      const { searchSearXNG } = await getSearXNGModule()
      await expect(searchSearXNG('test query')).rejects.toThrow('Web search unavailable')
    })

    it('should handle empty results', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          query: 'test query',
          results: [],
          suggestions: [],
        }),
      })

      const { searchSearXNG } = await getSearXNGModule()
      const result = await searchSearXNG('test query')

      expect(result.results).toHaveLength(0)
      expect(result.relatedSearches).toHaveLength(0)
    })

    it('should filter out results without title or URL', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          query: 'test query',
          results: [
            { url: 'https://example.com', title: 'Valid Result', content: 'Content' },
            { url: '', title: 'No URL', content: 'Content' },
            { url: 'https://example.com', title: '', content: 'Content' },
          ],
        }),
      })

      const { searchSearXNG } = await getSearXNGModule()
      const result = await searchSearXNG('test query')

      expect(result.results).toHaveLength(1)
      expect(result.results[0].title).toBe('Valid Result')
    })
  })

  describe('isSearXNGAvailable', () => {
    it('should return true when an instance is available', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ query: 'test', results: [] }),
      })

      const { isSearXNGAvailable } = await getSearXNGModule()
      const available = await isSearXNGAvailable()

      expect(available).toBe(true)
    })

    it('should return false when all instances fail', async () => {
      mockFetch.mockRejectedValue(new Error('Connection failed'))

      const { isSearXNGAvailable } = await getSearXNGModule()
      const available = await isSearXNGAvailable()

      expect(available).toBe(false)
    })

    it('should return false when instances return errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 503,
      })

      const { isSearXNGAvailable } = await getSearXNGModule()
      const available = await isSearXNGAvailable()

      expect(available).toBe(false)
    })
  })

  describe('instance rotation', () => {
    it('should try multiple instances on failure', async () => {
      // First call fails, second succeeds
      mockFetch
        .mockRejectedValueOnce(new Error('First instance failed'))
        .mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(mockSearXNGResponse),
        })

      const { searchSearXNG } = await getSearXNGModule()
      const result = await searchSearXNG('test query')

      expect(result.results).toHaveLength(3)
      // At least 2 calls: 1 failing + 1 succeeding for instance check + actual search
      expect(mockFetch.mock.calls.length).toBeGreaterThanOrEqual(2)
    })

    it('should cache working instance for subsequent calls', async () => {
      const { searchSearXNG } = await getSearXNGModule()

      // First call - finds and caches instance
      await searchSearXNG('query 1')
      const firstCallCount = mockFetch.mock.calls.length

      // Second call - uses cached instance
      await searchSearXNG('query 2')
      const secondCallCount = mockFetch.mock.calls.length

      // Second call should only make 1 additional fetch (for the search, not instance discovery)
      expect(secondCallCount - firstCallCount).toBe(1)
    })
  })
})
