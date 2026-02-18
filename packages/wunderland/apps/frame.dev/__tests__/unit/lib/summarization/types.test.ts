/**
 * Summarization Types Tests
 * @module __tests__/unit/lib/summarization/types.test
 *
 * Tests for summarization type constants and helper functions.
 */

import { describe, it, expect } from 'vitest'
import {
  SUMMARY_TYPE_CONFIG,
  SUMMARY_LENGTH_CONFIG,
  resultToSource,
  resultsToSources,
  type SummaryType,
  type SummaryLength,
} from '@/lib/summarization/types'
import type { WebSearchResult } from '@/lib/research/types'

// ============================================================================
// SUMMARY_TYPE_CONFIG
// ============================================================================

describe('SUMMARY_TYPE_CONFIG', () => {
  const summaryTypes: SummaryType[] = ['digest', 'abstract', 'key-points', 'comparison', 'executive']

  it('has config for all summary types', () => {
    for (const type of summaryTypes) {
      expect(SUMMARY_TYPE_CONFIG[type]).toBeDefined()
    }
  })

  describe('digest', () => {
    it('has label "Digest"', () => {
      expect(SUMMARY_TYPE_CONFIG.digest.label).toBe('Digest')
    })

    it('has description', () => {
      expect(SUMMARY_TYPE_CONFIG.digest.description).toContain('overview')
    })

    it('has icon', () => {
      expect(SUMMARY_TYPE_CONFIG.digest.icon).toBe('📰')
    })

    it('requires minimum 1 source', () => {
      expect(SUMMARY_TYPE_CONFIG.digest.minSources).toBe(1)
    })
  })

  describe('abstract', () => {
    it('has label "Abstract"', () => {
      expect(SUMMARY_TYPE_CONFIG.abstract.label).toBe('Abstract')
    })

    it('has description mentioning academic', () => {
      expect(SUMMARY_TYPE_CONFIG.abstract.description.toLowerCase()).toContain('academic')
    })

    it('has icon', () => {
      expect(SUMMARY_TYPE_CONFIG.abstract.icon).toBe('📝')
    })

    it('requires minimum 1 source', () => {
      expect(SUMMARY_TYPE_CONFIG.abstract.minSources).toBe(1)
    })
  })

  describe('key-points', () => {
    it('has label "Key Points"', () => {
      expect(SUMMARY_TYPE_CONFIG['key-points'].label).toBe('Key Points')
    })

    it('has description mentioning bullet points', () => {
      expect(SUMMARY_TYPE_CONFIG['key-points'].description.toLowerCase()).toContain('bullet')
    })

    it('has icon', () => {
      expect(SUMMARY_TYPE_CONFIG['key-points'].icon).toBe('🔑')
    })

    it('requires minimum 1 source', () => {
      expect(SUMMARY_TYPE_CONFIG['key-points'].minSources).toBe(1)
    })
  })

  describe('comparison', () => {
    it('has label "Comparison"', () => {
      expect(SUMMARY_TYPE_CONFIG.comparison.label).toBe('Comparison')
    })

    it('has description mentioning compare', () => {
      expect(SUMMARY_TYPE_CONFIG.comparison.description.toLowerCase()).toContain('compare')
    })

    it('has icon', () => {
      expect(SUMMARY_TYPE_CONFIG.comparison.icon).toBe('⚖️')
    })

    it('requires minimum 2 sources for comparison', () => {
      expect(SUMMARY_TYPE_CONFIG.comparison.minSources).toBe(2)
    })
  })

  describe('executive', () => {
    it('has label "Executive Summary"', () => {
      expect(SUMMARY_TYPE_CONFIG.executive.label).toBe('Executive Summary')
    })

    it('has description mentioning decision makers', () => {
      expect(SUMMARY_TYPE_CONFIG.executive.description.toLowerCase()).toContain('decision')
    })

    it('has icon', () => {
      expect(SUMMARY_TYPE_CONFIG.executive.icon).toBe('📊')
    })

    it('requires minimum 1 source', () => {
      expect(SUMMARY_TYPE_CONFIG.executive.minSources).toBe(1)
    })
  })

  it('all configs have required fields', () => {
    for (const type of summaryTypes) {
      const config = SUMMARY_TYPE_CONFIG[type]
      expect(typeof config.label).toBe('string')
      expect(config.label.length).toBeGreaterThan(0)
      expect(typeof config.description).toBe('string')
      expect(config.description.length).toBeGreaterThan(0)
      expect(typeof config.icon).toBe('string')
      expect(typeof config.minSources).toBe('number')
      expect(config.minSources).toBeGreaterThanOrEqual(1)
    }
  })

  it('only comparison requires multiple sources', () => {
    for (const type of summaryTypes) {
      if (type === 'comparison') {
        expect(SUMMARY_TYPE_CONFIG[type].minSources).toBeGreaterThan(1)
      } else {
        expect(SUMMARY_TYPE_CONFIG[type].minSources).toBe(1)
      }
    }
  })
})

// ============================================================================
// SUMMARY_LENGTH_CONFIG
// ============================================================================

describe('SUMMARY_LENGTH_CONFIG', () => {
  const lengths: SummaryLength[] = ['brief', 'standard', 'detailed']

  it('has config for all length options', () => {
    for (const length of lengths) {
      expect(SUMMARY_LENGTH_CONFIG[length]).toBeDefined()
    }
  })

  describe('brief', () => {
    it('has label "Brief"', () => {
      expect(SUMMARY_LENGTH_CONFIG.brief.label).toBe('Brief')
    })

    it('has 256 max tokens', () => {
      expect(SUMMARY_LENGTH_CONFIG.brief.maxTokens).toBe(256)
    })

    it('targets 50-100 words', () => {
      expect(SUMMARY_LENGTH_CONFIG.brief.targetWords).toContain('50')
      expect(SUMMARY_LENGTH_CONFIG.brief.targetWords).toContain('100')
    })
  })

  describe('standard', () => {
    it('has label "Standard"', () => {
      expect(SUMMARY_LENGTH_CONFIG.standard.label).toBe('Standard')
    })

    it('has 512 max tokens', () => {
      expect(SUMMARY_LENGTH_CONFIG.standard.maxTokens).toBe(512)
    })

    it('targets 150-250 words', () => {
      expect(SUMMARY_LENGTH_CONFIG.standard.targetWords).toContain('150')
      expect(SUMMARY_LENGTH_CONFIG.standard.targetWords).toContain('250')
    })
  })

  describe('detailed', () => {
    it('has label "Detailed"', () => {
      expect(SUMMARY_LENGTH_CONFIG.detailed.label).toBe('Detailed')
    })

    it('has 1024 max tokens', () => {
      expect(SUMMARY_LENGTH_CONFIG.detailed.maxTokens).toBe(1024)
    })

    it('targets 300-500 words', () => {
      expect(SUMMARY_LENGTH_CONFIG.detailed.targetWords).toContain('300')
      expect(SUMMARY_LENGTH_CONFIG.detailed.targetWords).toContain('500')
    })
  })

  it('all configs have required fields', () => {
    for (const length of lengths) {
      const config = SUMMARY_LENGTH_CONFIG[length]
      expect(typeof config.label).toBe('string')
      expect(config.label.length).toBeGreaterThan(0)
      expect(typeof config.description).toBe('string')
      expect(config.description.length).toBeGreaterThan(0)
      expect(typeof config.maxTokens).toBe('number')
      expect(config.maxTokens).toBeGreaterThan(0)
      expect(typeof config.targetWords).toBe('string')
    }
  })

  it('maxTokens increases with detail level', () => {
    expect(SUMMARY_LENGTH_CONFIG.brief.maxTokens).toBeLessThan(
      SUMMARY_LENGTH_CONFIG.standard.maxTokens
    )
    expect(SUMMARY_LENGTH_CONFIG.standard.maxTokens).toBeLessThan(
      SUMMARY_LENGTH_CONFIG.detailed.maxTokens
    )
  })

  it('maxTokens doubles between levels', () => {
    expect(SUMMARY_LENGTH_CONFIG.standard.maxTokens).toBe(
      SUMMARY_LENGTH_CONFIG.brief.maxTokens * 2
    )
    expect(SUMMARY_LENGTH_CONFIG.detailed.maxTokens).toBe(
      SUMMARY_LENGTH_CONFIG.standard.maxTokens * 2
    )
  })
})

// ============================================================================
// resultToSource
// ============================================================================

describe('resultToSource', () => {
  const mockResult: WebSearchResult = {
    title: 'Test Article',
    url: 'https://example.com/article',
    snippet: 'This is a test snippet about the article.',
    domain: 'example.com',
    authors: ['John Doe', 'Jane Smith'],
    source: 'web',
    rank: 1,
  }

  it('converts title', () => {
    const source = resultToSource(mockResult)
    expect(source.title).toBe('Test Article')
  })

  it('converts url', () => {
    const source = resultToSource(mockResult)
    expect(source.url).toBe('https://example.com/article')
  })

  it('converts snippet to content', () => {
    const source = resultToSource(mockResult)
    expect(source.content).toBe('This is a test snippet about the article.')
  })

  it('converts domain', () => {
    const source = resultToSource(mockResult)
    expect(source.domain).toBe('example.com')
  })

  it('converts authors', () => {
    const source = resultToSource(mockResult)
    expect(source.authors).toEqual(['John Doe', 'Jane Smith'])
  })

  it('marks arxiv URLs as academic', () => {
    const arxivResult: WebSearchResult = {
      ...mockResult,
      url: 'https://arxiv.org/abs/2301.12345',
    }
    const source = resultToSource(arxivResult)
    expect(source.isAcademic).toBe(true)
  })

  it('marks scholar.google URLs as academic', () => {
    const scholarResult: WebSearchResult = {
      ...mockResult,
      url: 'https://scholar.google.com/citations?user=xxx',
    }
    const source = resultToSource(scholarResult)
    expect(source.isAcademic).toBe(true)
  })

  it('marks semanticscholar URLs as academic', () => {
    const semanticResult: WebSearchResult = {
      ...mockResult,
      url: 'https://www.semanticscholar.org/paper/xxx',
    }
    const source = resultToSource(semanticResult)
    expect(source.isAcademic).toBe(true)
  })

  it('marks regular URLs as non-academic', () => {
    const source = resultToSource(mockResult)
    expect(source.isAcademic).toBe(false)
  })

  it('handles result without authors', () => {
    const resultNoAuthors: WebSearchResult = {
      title: 'No Author Article',
      url: 'https://example.com/no-author',
      snippet: 'Snippet',
      source: 'web',
      rank: 1,
    }
    const source = resultToSource(resultNoAuthors)
    expect(source.authors).toBeUndefined()
  })

  it('handles result without domain', () => {
    const resultNoDomain: WebSearchResult = {
      title: 'No Domain Article',
      url: 'https://example.com/no-domain',
      snippet: 'Snippet',
      source: 'web',
      rank: 1,
    }
    const source = resultToSource(resultNoDomain)
    expect(source.domain).toBeUndefined()
  })
})

// ============================================================================
// resultsToSources
// ============================================================================

describe('resultsToSources', () => {
  it('converts empty array', () => {
    const sources = resultsToSources([])
    expect(sources).toEqual([])
  })

  it('converts single result', () => {
    const results: WebSearchResult[] = [{
      title: 'Article 1',
      url: 'https://example.com/1',
      snippet: 'Snippet 1',
      source: 'web',
      rank: 1,
    }]

    const sources = resultsToSources(results)
    expect(sources.length).toBe(1)
    expect(sources[0].title).toBe('Article 1')
  })

  it('converts multiple results', () => {
    const results: WebSearchResult[] = [
      {
        title: 'Article 1',
        url: 'https://example.com/1',
        snippet: 'Snippet 1',
        source: 'web',
        rank: 1,
      },
      {
        title: 'Article 2',
        url: 'https://example.com/2',
        snippet: 'Snippet 2',
        source: 'web',
        rank: 2,
      },
      {
        title: 'Article 3',
        url: 'https://arxiv.org/abs/123',
        snippet: 'Snippet 3',
        source: 'arxiv',
        rank: 3,
      },
    ]

    const sources = resultsToSources(results)
    expect(sources.length).toBe(3)
    expect(sources[0].title).toBe('Article 1')
    expect(sources[1].title).toBe('Article 2')
    expect(sources[2].title).toBe('Article 3')
    expect(sources[2].isAcademic).toBe(true)
  })

  it('preserves order', () => {
    const results: WebSearchResult[] = [
      { title: 'First', url: 'https://a.com', snippet: 'A', source: 'web', rank: 1 },
      { title: 'Second', url: 'https://b.com', snippet: 'B', source: 'web', rank: 2 },
      { title: 'Third', url: 'https://c.com', snippet: 'C', source: 'web', rank: 3 },
    ]

    const sources = resultsToSources(results)
    expect(sources[0].title).toBe('First')
    expect(sources[1].title).toBe('Second')
    expect(sources[2].title).toBe('Third')
  })

  it('correctly identifies academic sources in batch', () => {
    const results: WebSearchResult[] = [
      { title: 'Regular', url: 'https://blog.example.com', snippet: 'A', source: 'web', rank: 1 },
      { title: 'ArXiv', url: 'https://arxiv.org/paper', snippet: 'B', source: 'arxiv', rank: 2 },
      { title: 'Scholar', url: 'https://scholar.google.com/x', snippet: 'C', source: 'web', rank: 3 },
    ]

    const sources = resultsToSources(results)
    expect(sources[0].isAcademic).toBe(false)
    expect(sources[1].isAcademic).toBe(true)
    expect(sources[2].isAcademic).toBe(true)
  })
})
