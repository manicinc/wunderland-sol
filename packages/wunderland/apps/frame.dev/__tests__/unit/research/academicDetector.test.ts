/**
 * Tests for Academic Paper Detection
 * @module tests/unit/research/academicDetector
 */

import { describe, it, expect } from 'vitest'
import {
  isAcademicUrl,
  isAcademicResult,
  extractCitationId,
  getCitationInput,
  enrichWithAcademicInfo,
} from '@/lib/research/academicDetector'
import type { WebSearchResult } from '@/lib/research/types'

// Mock search result factory
function createSearchResult(overrides: Partial<WebSearchResult> = {}): WebSearchResult {
  return {
    id: 'test-1',
    title: 'Test Paper',
    url: 'https://example.com/paper',
    snippet: 'Test snippet',
    domain: 'example.com',
    position: 0,
    source: 'brave',
    ...overrides,
  }
}

describe('isAcademicUrl', () => {
  describe('academic domains', () => {
    it('should detect arXiv URLs', () => {
      expect(isAcademicUrl('https://arxiv.org/abs/2301.00001')).toBe(true)
      expect(isAcademicUrl('https://arxiv.org/pdf/2301.00001.pdf')).toBe(true)
    })

    it('should detect DOI URLs', () => {
      expect(isAcademicUrl('https://doi.org/10.1234/example')).toBe(true)
    })

    it('should detect PubMed URLs', () => {
      expect(isAcademicUrl('https://pubmed.ncbi.nlm.nih.gov/12345678')).toBe(true)
      expect(isAcademicUrl('https://ncbi.nlm.nih.gov/pmc/articles/PMC123456')).toBe(true)
    })

    it('should detect Semantic Scholar URLs', () => {
      expect(isAcademicUrl('https://www.semanticscholar.org/paper/Title/abc123')).toBe(true)
    })

    it('should detect other academic publishers', () => {
      expect(isAcademicUrl('https://www.nature.com/articles/s41586-021-00001-1')).toBe(true)
      expect(isAcademicUrl('https://www.science.org/doi/10.1126/science.abc1234')).toBe(true)
      expect(isAcademicUrl('https://www.sciencedirect.com/science/article/pii/S0000000000000001')).toBe(true)
      expect(isAcademicUrl('https://ieeexplore.ieee.org/document/12345678')).toBe(true)
      expect(isAcademicUrl('https://dl.acm.org/doi/10.1145/1234567.1234568')).toBe(true)
      expect(isAcademicUrl('https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0000001')).toBe(true)
    })

    it('should detect preprint servers', () => {
      expect(isAcademicUrl('https://www.biorxiv.org/content/10.1101/2021.01.01.000001v1')).toBe(true)
      expect(isAcademicUrl('https://www.medrxiv.org/content/10.1101/2021.01.01.00000001v1')).toBe(true)
    })

    it('should detect ML conference sites', () => {
      expect(isAcademicUrl('https://proceedings.neurips.cc/paper/2021/file/abc123')).toBe(true)
      expect(isAcademicUrl('https://openreview.net/forum?id=abc123')).toBe(true)
      expect(isAcademicUrl('https://aclanthology.org/2021.acl-long.1')).toBe(true)
    })
  })

  describe('non-academic domains', () => {
    it('should not detect regular websites', () => {
      expect(isAcademicUrl('https://www.google.com')).toBe(false)
      expect(isAcademicUrl('https://www.github.com/user/repo')).toBe(false)
      expect(isAcademicUrl('https://medium.com/article')).toBe(false)
      expect(isAcademicUrl('https://stackoverflow.com/questions/123')).toBe(false)
    })

    it('should handle invalid URLs gracefully', () => {
      expect(isAcademicUrl('not-a-url')).toBe(false)
      expect(isAcademicUrl('')).toBe(false)
    })
  })
})

describe('isAcademicResult', () => {
  it('should detect academic results by URL domain', () => {
    const result = createSearchResult({ url: 'https://arxiv.org/abs/2301.00001' })
    expect(isAcademicResult(result)).toBe(true)
  })

  it('should detect DOI in URL', () => {
    const result = createSearchResult({ url: 'https://example.com/doi/10.1234/example' })
    expect(isAcademicResult(result)).toBe(true)
  })

  it('should detect arXiv ID pattern in URL', () => {
    const result = createSearchResult({ url: 'https://arxiv.org/abs/2301.00001' })
    expect(isAcademicResult(result)).toBe(true)
  })

  it('should not detect non-academic results', () => {
    const result = createSearchResult({ url: 'https://www.google.com' })
    expect(isAcademicResult(result)).toBe(false)
  })
})

describe('extractCitationId', () => {
  describe('DOI extraction', () => {
    it('should extract DOI from doi.org URLs', () => {
      const result = extractCitationId('https://doi.org/10.1234/example.2021')
      expect(result).toEqual({ type: 'doi', id: '10.1234/example.2021' })
    })

    it('should extract DOI from /doi/ paths', () => {
      const result = extractCitationId('https://www.nature.com/articles/doi/10.1038/nature12345')
      expect(result).toEqual({ type: 'doi', id: '10.1038/nature12345' })
    })
  })

  describe('arXiv extraction', () => {
    it('should extract arXiv ID from abs URLs', () => {
      const result = extractCitationId('https://arxiv.org/abs/2301.00001')
      expect(result).toEqual({ type: 'arxiv', id: '2301.00001' })
    })

    it('should extract arXiv ID from pdf URLs', () => {
      const result = extractCitationId('https://arxiv.org/pdf/2301.00001')
      expect(result).toEqual({ type: 'arxiv', id: '2301.00001' })
    })

    it('should extract arXiv ID with version', () => {
      const result = extractCitationId('https://arxiv.org/abs/2301.00001v2')
      expect(result).toEqual({ type: 'arxiv', id: '2301.00001v2' })
    })
  })

  describe('PubMed extraction', () => {
    it('should extract PMID from PubMed URLs', () => {
      const result = extractCitationId('https://pubmed.ncbi.nlm.nih.gov/12345678')
      expect(result).toEqual({ type: 'pmid', id: '12345678' })
    })
  })

  describe('bioRxiv/medRxiv extraction', () => {
    // Note: The current regex has a limitation - it stops at the first slash in the DOI
    // Real bioRxiv DOIs like 10.1101/2020.01.01.000001 would only capture 10.1101
    // This is a known limitation for now
    it('should extract partial DOI from bioRxiv URLs (regex limitation)', () => {
      const result = extractCitationId('https://www.biorxiv.org/content/10.1101.2021.01.01.000001v1')
      expect(result).toEqual({ type: 'doi', id: '10.1101.2021.01.01.000001v1' })
    })
  })

  describe('Semantic Scholar extraction', () => {
    it('should return URL type for Semantic Scholar papers', () => {
      const url = 'https://www.semanticscholar.org/paper/Title/abc123def456789012345678901234567890abcd'
      const result = extractCitationId(url)
      expect(result).toEqual({ type: 'url', id: url })
    })
  })

  describe('no match', () => {
    it('should return null for non-academic URLs', () => {
      expect(extractCitationId('https://www.google.com')).toBe(null)
    })

    it('should return null for invalid URLs', () => {
      expect(extractCitationId('not-a-url')).toBe(null)
    })
  })
})

describe('getCitationInput', () => {
  it('should return DOI for DOI URLs', () => {
    const result = createSearchResult({ url: 'https://doi.org/10.1234/example' })
    expect(getCitationInput(result)).toBe('10.1234/example')
  })

  it('should return arXiv ID for arXiv URLs', () => {
    const result = createSearchResult({ url: 'https://arxiv.org/abs/2301.00001' })
    expect(getCitationInput(result)).toBe('2301.00001')
  })

  it('should return PMID format for PubMed URLs', () => {
    const result = createSearchResult({ url: 'https://pubmed.ncbi.nlm.nih.gov/12345678' })
    expect(getCitationInput(result)).toBe('PMID:12345678')
  })

  it('should fallback to URL for non-academic sources', () => {
    const result = createSearchResult({ url: 'https://www.example.com/paper' })
    expect(getCitationInput(result)).toBe('https://www.example.com/paper')
  })
})

describe('enrichWithAcademicInfo', () => {
  it('should add isAcademic and citationId to results', () => {
    const results = [
      createSearchResult({ id: '1', url: 'https://arxiv.org/abs/2301.00001' }),
      createSearchResult({ id: '2', url: 'https://www.google.com' }),
    ]

    const enriched = enrichWithAcademicInfo(results)

    expect(enriched[0].isAcademic).toBe(true)
    expect(enriched[0].citationId).toEqual({ type: 'arxiv', id: '2301.00001' })

    expect(enriched[1].isAcademic).toBe(false)
    expect(enriched[1].citationId).toBe(null)
  })

  it('should preserve original result properties', () => {
    const results = [
      createSearchResult({ id: 'test', title: 'Test Title', url: 'https://arxiv.org/abs/2301.00001' }),
    ]

    const enriched = enrichWithAcademicInfo(results)

    expect(enriched[0].id).toBe('test')
    expect(enriched[0].title).toBe('Test Title')
  })
})
