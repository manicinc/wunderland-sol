/**
 * Research Types Tests
 * @module __tests__/unit/lib/research/types.test
 *
 * Tests for web search types and provider configurations.
 */

import { describe, it, expect } from 'vitest'
import {
  SEARCH_PROVIDERS,
  type SearchProvider,
  type SearchProviderConfig,
  type WebSearchResult,
  type WebSearchResponse,
  type SearchOptions,
  type ResearchSession,
  type SessionLinkType,
} from '@/lib/research/types'

// ============================================================================
// SEARCH_PROVIDERS
// ============================================================================

describe('SEARCH_PROVIDERS', () => {
  it('is defined', () => {
    expect(SEARCH_PROVIDERS).toBeDefined()
  })

  it('contains all expected providers', () => {
    const expectedProviders: SearchProvider[] = [
      'duckduckgo',
      'searxng',
      'brave',
      'serper',
      'searchapi',
      'google-cse',
      'semanticscholar',
      'none',
    ]
    expectedProviders.forEach((provider) => {
      expect(SEARCH_PROVIDERS).toHaveProperty(provider)
    })
  })

  describe('provider configurations', () => {
    Object.entries(SEARCH_PROVIDERS).forEach(([id, config]) => {
      describe(`${id}`, () => {
        it('has correct id', () => {
          expect(config.id).toBe(id)
        })

        it('has name', () => {
          expect(config.name).toBeDefined()
          expect(typeof config.name).toBe('string')
          expect(config.name.length).toBeGreaterThan(0)
        })

        it('has requiresKey boolean', () => {
          expect(typeof config.requiresKey).toBe('boolean')
        })

        it('has baseUrl string', () => {
          expect(typeof config.baseUrl).toBe('string')
        })

        it('has description', () => {
          expect(config.description).toBeDefined()
          expect(typeof config.description).toBe('string')
        })
      })
    })
  })

  describe('free providers', () => {
    it('duckduckgo does not require key', () => {
      expect(SEARCH_PROVIDERS.duckduckgo.requiresKey).toBe(false)
    })

    it('searxng does not require key', () => {
      expect(SEARCH_PROVIDERS.searxng.requiresKey).toBe(false)
    })

    it('semanticscholar does not require key', () => {
      expect(SEARCH_PROVIDERS.semanticscholar.requiresKey).toBe(false)
    })
  })

  describe('paid providers', () => {
    it('brave requires key', () => {
      expect(SEARCH_PROVIDERS.brave.requiresKey).toBe(true)
    })

    it('serper requires key', () => {
      expect(SEARCH_PROVIDERS.serper.requiresKey).toBe(true)
    })

    it('searchapi requires key', () => {
      expect(SEARCH_PROVIDERS.searchapi.requiresKey).toBe(true)
    })

    it('google-cse requires key', () => {
      expect(SEARCH_PROVIDERS['google-cse'].requiresKey).toBe(true)
    })
  })

  describe('base URLs', () => {
    it('duckduckgo has correct URL', () => {
      expect(SEARCH_PROVIDERS.duckduckgo.baseUrl).toBe('https://api.duckduckgo.com')
    })

    it('brave has correct URL', () => {
      expect(SEARCH_PROVIDERS.brave.baseUrl).toBe('https://api.search.brave.com/res/v1')
    })

    it('serper has correct URL', () => {
      expect(SEARCH_PROVIDERS.serper.baseUrl).toBe('https://google.serper.dev')
    })

    it('semanticscholar has correct URL', () => {
      expect(SEARCH_PROVIDERS.semanticscholar.baseUrl).toBe(
        'https://api.semanticscholar.org/graph/v1'
      )
    })

    it('none provider has empty URL', () => {
      expect(SEARCH_PROVIDERS.none.baseUrl).toBe('')
    })
  })

  describe('rate limits', () => {
    it('brave has rate limit info', () => {
      expect(SEARCH_PROVIDERS.brave.rateLimit).toBe('1 req/sec')
    })

    it('serper has rate limit info', () => {
      expect(SEARCH_PROVIDERS.serper.rateLimit).toBe('50 req/sec')
    })

    it('semanticscholar has rate limit info', () => {
      expect(SEARCH_PROVIDERS.semanticscholar.rateLimit).toBe('100 req/5min')
    })
  })

  describe('free tier info', () => {
    it('duckduckgo has free tier info', () => {
      expect(SEARCH_PROVIDERS.duckduckgo.freeTier).toBe('Free, no signup')
    })

    it('brave has free tier info', () => {
      expect(SEARCH_PROVIDERS.brave.freeTier).toBe('2,000 queries/month free')
    })

    it('serper has free tier info', () => {
      expect(SEARCH_PROVIDERS.serper.freeTier).toBe('2,500 queries free')
    })

    it('google-cse has free tier info', () => {
      expect(SEARCH_PROVIDERS['google-cse'].freeTier).toBe('100 queries/day free')
    })
  })
})

// ============================================================================
// Type Definition Tests
// ============================================================================

describe('SearchProvider type', () => {
  it('includes all provider types', () => {
    const providers: SearchProvider[] = [
      'duckduckgo',
      'searxng',
      'brave',
      'serper',
      'searchapi',
      'google-cse',
      'semanticscholar',
      'none',
    ]
    expect(providers).toHaveLength(8)
  })
})

describe('WebSearchResult structure', () => {
  it('can represent a valid search result', () => {
    const result: WebSearchResult = {
      id: 'result-1',
      title: 'Test Result',
      url: 'https://example.com',
      snippet: 'This is a test snippet',
      domain: 'example.com',
      position: 1,
      source: 'brave',
    }
    expect(result.id).toBe('result-1')
    expect(result.source).toBe('brave')
  })

  it('supports optional fields', () => {
    const result: WebSearchResult = {
      id: 'result-2',
      title: 'Academic Result',
      url: 'https://scholar.example.com',
      snippet: 'An academic paper',
      domain: 'scholar.example.com',
      position: 1,
      source: 'semanticscholar',
      thumbnail: 'https://example.com/thumb.jpg',
      publishedDate: '2024-01-15',
      favicon: 'https://example.com/favicon.ico',
      authors: ['John Doe', 'Jane Smith'],
    }
    expect(result.authors).toEqual(['John Doe', 'Jane Smith'])
    expect(result.publishedDate).toBe('2024-01-15')
  })
})

describe('WebSearchResponse structure', () => {
  it('can represent a complete search response', () => {
    const response: WebSearchResponse = {
      query: 'test query',
      results: [],
      relatedSearches: [],
      latency: 150,
      source: 'brave',
      fromCache: false,
    }
    expect(response.query).toBe('test query')
    expect(response.latency).toBe(150)
    expect(response.fromCache).toBe(false)
  })

  it('supports knowledge panel', () => {
    const response: WebSearchResponse = {
      query: 'what is typescript',
      results: [],
      relatedSearches: [{ query: 'typescript tutorial' }],
      knowledgePanel: {
        title: 'TypeScript',
        description: 'A typed superset of JavaScript',
        image: 'https://example.com/ts.png',
        url: 'https://typescriptlang.org',
        facts: [
          { label: 'Developer', value: 'Microsoft' },
          { label: 'First appeared', value: '2012' },
        ],
      },
      latency: 200,
      source: 'brave',
      fromCache: true,
    }
    expect(response.knowledgePanel?.title).toBe('TypeScript')
    expect(response.knowledgePanel?.facts).toHaveLength(2)
  })
})

describe('SearchOptions structure', () => {
  it('supports all option fields', () => {
    const options: SearchOptions = {
      maxResults: 10,
      safeSearch: 'moderate',
      country: 'us',
      language: 'en',
      timeRange: 'month',
      preferredProvider: 'brave',
      skipCache: true,
      searxngUrl: 'https://my-searxng.example.com',
    }
    expect(options.maxResults).toBe(10)
    expect(options.safeSearch).toBe('moderate')
    expect(options.timeRange).toBe('month')
  })

  it('safeSearch supports all values', () => {
    const values: SearchOptions['safeSearch'][] = ['off', 'moderate', 'strict']
    expect(values).toHaveLength(3)
  })

  it('timeRange supports all values', () => {
    const values: SearchOptions['timeRange'][] = ['day', 'week', 'month', 'year', 'all']
    expect(values).toHaveLength(5)
  })
})

describe('ResearchSession structure', () => {
  it('can represent a research session', () => {
    const session: ResearchSession = {
      id: 'session-1',
      topic: 'TypeScript Best Practices',
      query: 'typescript best practices 2024',
      queries: ['typescript best practices', 'ts coding standards'],
      savedResults: [],
      notes: 'Research notes here',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    expect(session.topic).toBe('TypeScript Best Practices')
    expect(session.queries).toHaveLength(2)
  })

  it('supports optional fields', () => {
    const session: ResearchSession = {
      id: 'session-2',
      topic: 'React Hooks',
      query: 'react hooks tutorial',
      queries: ['react hooks'],
      savedResults: [],
      notes: '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      tags: ['react', 'frontend'],
      linkedSessions: ['session-1'],
      parentSessionId: 'parent-session',
    }
    expect(session.tags).toEqual(['react', 'frontend'])
    expect(session.linkedSessions).toHaveLength(1)
  })
})

describe('SessionLinkType', () => {
  it('supports all link types', () => {
    const linkTypes: SessionLinkType[] = ['related', 'continuation', 'subtopic', 'merged']
    expect(linkTypes).toHaveLength(4)
  })
})
