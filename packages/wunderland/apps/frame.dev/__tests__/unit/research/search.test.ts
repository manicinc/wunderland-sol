/**
 * Tests for Web Search Module
 * @module tests/unit/research/search
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  webSearch,
  quickSearch,
  deepSearch,
  saveSearchProviderKey,
  removeSearchProviderKey,
  getConfiguredSearchProviders,
} from '@/lib/research/search'
import type { WebSearchResponse } from '@/lib/research/types'

// Mock the API modules
vi.mock('@/lib/research/apis/duckduckgo', () => ({
  searchDuckDuckGo: vi.fn(),
}))

vi.mock('@/lib/research/apis/brave', () => ({
  searchBrave: vi.fn(),
}))

vi.mock('@/lib/research/apis/serper', () => ({
  searchSerper: vi.fn(),
}))

vi.mock('@/lib/research/apis/searxng', () => ({
  searchSearXNG: vi.fn(),
}))

// Import mocked functions
import { searchDuckDuckGo } from '@/lib/research/apis/duckduckgo'
import { searchBrave } from '@/lib/research/apis/brave'
import { searchSerper } from '@/lib/research/apis/serper'
import { searchSearXNG } from '@/lib/research/apis/searxng'

// Mock localStorage
const mockLocalStorage: Record<string, string> = {}
const localStorageMock = {
  getItem: vi.fn((key: string) => mockLocalStorage[key] || null),
  setItem: vi.fn((key: string, value: string) => {
    mockLocalStorage[key] = value
  }),
  removeItem: vi.fn((key: string) => {
    delete mockLocalStorage[key]
  }),
  clear: vi.fn(() => {
    Object.keys(mockLocalStorage).forEach(key => delete mockLocalStorage[key])
  }),
}

// Mock window
const dispatchEventMock = vi.fn()

// Setup globals
Object.defineProperty(global, 'localStorage', { value: localStorageMock })
Object.defineProperty(global, 'window', {
  value: {
    localStorage: localStorageMock,
    dispatchEvent: dispatchEventMock,
  },
  writable: true,
})

// Sample responses
const mockDuckDuckGoResponse: WebSearchResponse = {
  results: [
    {
      id: 'ddg-1',
      title: 'DuckDuckGo Result',
      url: 'https://example.com/ddg',
      snippet: 'A DuckDuckGo search result',
      domain: 'example.com',
      position: 0,
      source: 'duckduckgo',
    },
  ],
  query: 'test query',
  source: 'duckduckgo',
  totalResults: 1,
  latency: 100,
  relatedSearches: [],
  fromCache: false,
}

const mockBraveResponse: WebSearchResponse = {
  results: [
    {
      id: 'brave-1',
      title: 'Brave Result',
      url: 'https://example.com/brave',
      snippet: 'A Brave search result',
      domain: 'example.com',
      position: 0,
      source: 'brave',
    },
  ],
  query: 'test query',
  source: 'brave',
  totalResults: 1,
  latency: 50,
  relatedSearches: [],
  fromCache: false,
}

const mockSerperResponse: WebSearchResponse = {
  results: [
    {
      id: 'serper-1',
      title: 'Serper Result',
      url: 'https://example.com/serper',
      snippet: 'A Serper search result',
      domain: 'example.com',
      position: 0,
      source: 'serper',
    },
  ],
  query: 'test query',
  source: 'serper',
  totalResults: 1,
  latency: 75,
  relatedSearches: [],
  fromCache: false,
}

const mockSearXNGResponse: WebSearchResponse = {
  results: [
    {
      id: 'searxng-1',
      title: 'SearXNG Result',
      url: 'https://example.com/searxng',
      snippet: 'A SearXNG search result',
      domain: 'example.com',
      position: 1,
      source: 'searxng',
    },
  ],
  query: 'test query',
  source: 'searxng',
  totalResults: 1,
  latency: 200,
  relatedSearches: [],
  fromCache: false,
}

describe('Search Module', () => {
  beforeEach(() => {
    // Clear mocks before each test
    vi.clearAllMocks()
    localStorageMock.clear()

    // Reset mock implementations
    vi.mocked(searchDuckDuckGo).mockResolvedValue(mockDuckDuckGoResponse)
    vi.mocked(searchBrave).mockResolvedValue(mockBraveResponse)
    vi.mocked(searchSerper).mockResolvedValue(mockSerperResponse)
    vi.mocked(searchSearXNG).mockResolvedValue(mockSearXNGResponse)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Provider Key Management', () => {
    describe('saveSearchProviderKey', () => {
      it('should save API key to localStorage', async () => {
        await saveSearchProviderKey('brave', 'test-api-key')

        expect(localStorageMock.setItem).toHaveBeenCalledWith(
          'quarry-search-brave-key',
          'test-api-key'
        )
      })

      it('should dispatch custom event on key save', async () => {
        await saveSearchProviderKey('serper', 'test-key')

        expect(dispatchEventMock).toHaveBeenCalled()
        const event = dispatchEventMock.mock.calls[0][0]
        expect(event.type).toBe('search-keys-changed')
        expect(event.detail).toEqual({ provider: 'serper' })
      })
    })

    describe('removeSearchProviderKey', () => {
      it('should remove API key from localStorage', async () => {
        await removeSearchProviderKey('brave')

        expect(localStorageMock.removeItem).toHaveBeenCalledWith('quarry-search-brave-key')
      })

      it('should dispatch custom event on key removal', async () => {
        await removeSearchProviderKey('brave')

        expect(dispatchEventMock).toHaveBeenCalled()
        const event = dispatchEventMock.mock.calls[0][0]
        expect(event.type).toBe('search-keys-changed')
      })
    })

    describe('getConfiguredSearchProviders', () => {
      it('should always include searxng and duckduckgo as free providers', async () => {
        const providers = await getConfiguredSearchProviders()
        expect(providers).toContain('searxng')
        expect(providers).toContain('duckduckgo')
      })

      it('should include brave when key is configured', async () => {
        mockLocalStorage['quarry-search-brave-key'] = 'test-key'

        const providers = await getConfiguredSearchProviders()
        expect(providers).toContain('brave')
      })

      it('should include serper when key is configured', async () => {
        mockLocalStorage['quarry-search-serper-key'] = 'test-key'

        const providers = await getConfiguredSearchProviders()
        expect(providers).toContain('serper')
      })

      it('should include all configured providers', async () => {
        mockLocalStorage['quarry-search-brave-key'] = 'brave-key'
        mockLocalStorage['quarry-search-serper-key'] = 'serper-key'

        const providers = await getConfiguredSearchProviders()
        expect(providers).toContain('searxng')
        expect(providers).toContain('brave')
        expect(providers).toContain('serper')
        expect(providers).toContain('duckduckgo')
      })
    })
  })

  describe('webSearch', () => {
    describe('provider fallback chain', () => {
      it('should use SearXNG as primary free provider', async () => {
        const result = await webSearch('test query', { skipCache: true })

        expect(searchSearXNG).toHaveBeenCalledWith('test query', expect.any(Object))
        expect(result.source).toBe('searxng')
      })

      it('should prefer Brave when API key is set', async () => {
        mockLocalStorage['quarry-search-brave-key'] = 'brave-api-key'

        const result = await webSearch('test query', { skipCache: true })

        expect(searchBrave).toHaveBeenCalledWith(
          'test query',
          'brave-api-key',
          expect.any(Object)
        )
        expect(result.source).toBe('brave')
      })

      it('should prefer Serper when API key is set and Brave unavailable', async () => {
        mockLocalStorage['quarry-search-serper-key'] = 'serper-api-key'

        const result = await webSearch('test query', { skipCache: true })

        expect(searchSerper).toHaveBeenCalledWith(
          'test query',
          'serper-api-key',
          expect.any(Object)
        )
        expect(result.source).toBe('serper')
      })

      it('should use preferred provider when specified', async () => {
        mockLocalStorage['quarry-search-brave-key'] = 'brave-key'
        mockLocalStorage['quarry-search-serper-key'] = 'serper-key'

        const result = await webSearch('test query', {
          skipCache: true,
          preferredProvider: 'serper',
        })

        expect(searchSerper).toHaveBeenCalled()
        expect(result.source).toBe('serper')
      })

      it('should fallback from Brave to SearXNG on failure', async () => {
        mockLocalStorage['quarry-search-brave-key'] = 'brave-key'
        vi.mocked(searchBrave).mockRejectedValue(new Error('Brave API error'))

        const result = await webSearch('test query', { skipCache: true })

        expect(searchBrave).toHaveBeenCalled()
        expect(searchSearXNG).toHaveBeenCalled()
        expect(result.source).toBe('searxng')
      })

      it('should fallback from SearXNG to DuckDuckGo on failure', async () => {
        vi.mocked(searchSearXNG).mockRejectedValue(new Error('SearXNG failed'))

        const result = await webSearch('test query', { skipCache: true })

        expect(searchSearXNG).toHaveBeenCalled()
        expect(searchDuckDuckGo).toHaveBeenCalled()
        expect(result.source).toBe('duckduckgo')
      })

      it('should return empty response with error when all providers fail', async () => {
        vi.mocked(searchSearXNG).mockRejectedValue(new Error('SearXNG failed'))
        vi.mocked(searchDuckDuckGo).mockRejectedValue(new Error('DDG failed'))

        const result = await webSearch('test query', { skipCache: true })

        expect(result.results).toHaveLength(0)
        expect(result.source).toBe('none')
        expect(result.error).toBeDefined()
      })

      it('should fallback when provider returns no results', async () => {
        vi.mocked(searchSearXNG).mockResolvedValue({
          ...mockSearXNGResponse,
          results: [],
        })

        const result = await webSearch('test query', { skipCache: true })

        expect(searchSearXNG).toHaveBeenCalled()
        expect(searchDuckDuckGo).toHaveBeenCalled()
        expect(result.source).toBe('duckduckgo')
      })
    })

    describe('caching', () => {
      it('should return cached results for same query', async () => {
        // First call - should hit the API
        const result1 = await webSearch('unique-cache-test-1')
        expect(searchSearXNG).toHaveBeenCalledTimes(1)

        // Second call - should return from cache
        const result2 = await webSearch('unique-cache-test-1')
        expect(searchSearXNG).toHaveBeenCalledTimes(1) // Not called again
        expect(result2.fromCache).toBe(true)
      })

      it('should skip cache when skipCache option is set', async () => {
        // First call
        await webSearch('unique-skip-cache-test')

        // Second call with skipCache
        await webSearch('unique-skip-cache-test', { skipCache: true })

        expect(searchSearXNG).toHaveBeenCalledTimes(2)
      })

      it('should use different cache keys for different options', async () => {
        await webSearch('unique-options-test', { maxResults: 5 })
        await webSearch('unique-options-test', { maxResults: 10 })

        expect(searchSearXNG).toHaveBeenCalledTimes(2)
      })

      it('should use different cache keys for different time ranges', async () => {
        await webSearch('unique-timerange-test', { timeRange: 'day' })
        await webSearch('unique-timerange-test', { timeRange: 'week' })

        expect(searchSearXNG).toHaveBeenCalledTimes(2)
      })
    })

    describe('options handling', () => {
      it('should pass maxResults to provider', async () => {
        mockLocalStorage['quarry-search-brave-key'] = 'key'

        await webSearch('test', { skipCache: true, maxResults: 15 })

        expect(searchBrave).toHaveBeenCalledWith(
          'test',
          'key',
          expect.objectContaining({ maxResults: 15 })
        )
      })

      it('should pass timeRange to provider', async () => {
        mockLocalStorage['quarry-search-serper-key'] = 'key'

        await webSearch('test', { skipCache: true, timeRange: 'month' })

        expect(searchSerper).toHaveBeenCalledWith(
          'test',
          'key',
          expect.objectContaining({ timeRange: 'month' })
        )
      })

      it('should pass signal to SearXNG', async () => {
        const controller = new AbortController()

        await webSearch('test', { skipCache: true, signal: controller.signal })

        expect(searchSearXNG).toHaveBeenCalledWith(
          'test',
          expect.objectContaining({ signal: controller.signal })
        )
      })

      it('should pass signal to DuckDuckGo on fallback', async () => {
        vi.mocked(searchSearXNG).mockRejectedValue(new Error('SearXNG failed'))
        const controller = new AbortController()

        await webSearch('test', { skipCache: true, signal: controller.signal })

        expect(searchDuckDuckGo).toHaveBeenCalledWith(
          'test',
          expect.objectContaining({ signal: controller.signal })
        )
      })
    })
  })

  describe('quickSearch', () => {
    it('should call webSearch with maxResults of 5', async () => {
      const result = await quickSearch('quick test', { skipCache: true })

      expect(searchSearXNG).toHaveBeenCalled()
      expect(result).toBeDefined()
    })

    it('should pass through other options', async () => {
      mockLocalStorage['quarry-search-brave-key'] = 'key'

      await quickSearch('test', { skipCache: true, preferredProvider: 'brave' })

      expect(searchBrave).toHaveBeenCalledWith(
        'test',
        'key',
        expect.objectContaining({ maxResults: 5 })
      )
    })
  })

  describe('deepSearch', () => {
    it('should call webSearch with maxResults of 20', async () => {
      const result = await deepSearch('deep test', { skipCache: true })

      expect(searchSearXNG).toHaveBeenCalled()
      expect(result).toBeDefined()
    })

    it('should pass through other options', async () => {
      mockLocalStorage['quarry-search-serper-key'] = 'key'

      await deepSearch('test', { skipCache: true, preferredProvider: 'serper' })

      expect(searchSerper).toHaveBeenCalledWith(
        'test',
        'key',
        expect.objectContaining({ maxResults: 20 })
      )
    })
  })
})
