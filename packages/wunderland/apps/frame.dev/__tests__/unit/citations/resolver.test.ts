/**
 * Tests for Citation Resolver
 * @module tests/unit/citations/resolver
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  resolveCitation,
  resolveCitations,
  searchPapers,
  isValidDOI,
  isValidArxivId,
} from '@/lib/citations/resolver'
import type { Citation, CitationResolutionResult } from '@/lib/citations/types'

// Mock parser module
vi.mock('@/lib/citations/parser', () => ({
  detectCitationType: vi.fn(),
  extractDOI: vi.fn(),
  extractArxivId: vi.fn(),
  parseBibTeX: vi.fn(),
  parseRIS: vi.fn(),
  formatCitation: vi.fn(),
  formatBibliography: vi.fn(),
  toBibTeX: vi.fn(),
  toBibTeXFile: vi.fn(),
}))

// Mock cache module
vi.mock('@/lib/citations/cache', () => ({
  cacheCitation: vi.fn(),
  getCachedCitation: vi.fn(),
  getCachedByDOI: vi.fn(),
  getCachedByArxivId: vi.fn(),
  searchCachedCitations: vi.fn(),
  getAllCachedCitations: vi.fn(),
  clearCache: vi.fn(),
  getCacheStats: vi.fn(),
}))

// Mock APIs
vi.mock('@/lib/citations/apis/crossref', () => ({
  resolveDOI: vi.fn(),
  searchWorks: vi.fn(),
}))

vi.mock('@/lib/citations/apis/arxiv', () => ({
  getPaper: vi.fn(),
  searchPapers: vi.fn(),
}))

// Import mocked functions
import {
  detectCitationType,
  extractDOI,
  extractArxivId,
  parseBibTeX,
  parseRIS,
} from '@/lib/citations/parser'
import {
  cacheCitation,
  getCachedByDOI,
  getCachedByArxivId,
  searchCachedCitations,
} from '@/lib/citations/cache'
import { resolveDOI, searchWorks } from '@/lib/citations/apis/crossref'
import { getPaper, searchPapers as searchArxiv } from '@/lib/citations/apis/arxiv'

// Sample citation fixtures
const mockCitation: Citation = {
  id: 'smith2021test',
  type: 'article-journal',
  title: 'Test Article Title',
  authors: [
    { given: 'John', family: 'Smith' },
    { given: 'Jane', family: 'Doe' },
  ],
  year: 2021,
  doi: '10.1234/test.2021',
  venue: 'Test Journal',
  source: 'crossref',
  cachedAt: Date.now(),
}

const mockArxivCitation: Citation = {
  id: '2301.00001',
  type: 'article',
  title: 'arXiv Paper Title',
  authors: [{ given: 'Alice', family: 'Johnson' }],
  year: 2023,
  arxivId: '2301.00001',
  venue: 'arXiv',
  source: 'arxiv',
  cachedAt: Date.now(),
}

describe('Citation Resolver', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default mock implementations
    vi.mocked(detectCitationType).mockReturnValue('text')
    vi.mocked(extractDOI).mockReturnValue(null)
    vi.mocked(extractArxivId).mockReturnValue(null)
    vi.mocked(parseBibTeX).mockReturnValue([])
    vi.mocked(parseRIS).mockReturnValue([])
    vi.mocked(cacheCitation).mockResolvedValue(undefined)
    vi.mocked(getCachedByDOI).mockResolvedValue(null)
    vi.mocked(getCachedByArxivId).mockResolvedValue(null)
    vi.mocked(searchCachedCitations).mockResolvedValue([])
    vi.mocked(resolveDOI).mockResolvedValue(null)
    vi.mocked(getPaper).mockResolvedValue(null)
    vi.mocked(searchWorks).mockResolvedValue({ results: [], total: 0, page: 1, perPage: 10, query: '', source: 'crossref' })
    vi.mocked(searchArxiv).mockResolvedValue({ results: [], total: 0, page: 1, perPage: 10, query: '', source: 'arxiv' })

    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      value: true,
      writable: true,
      configurable: true,
    })
  })

  describe('resolveCitation', () => {
    describe('BibTeX input', () => {
      it('should parse and return BibTeX citation', async () => {
        vi.mocked(detectCitationType).mockReturnValue('bibtex')
        vi.mocked(parseBibTeX).mockReturnValue([mockCitation])

        const result = await resolveCitation('@article{test, title={Test}}')

        expect(result.success).toBe(true)
        expect(result.citation).toEqual(mockCitation)
        expect(result.source).toBe('bibtex-import')
        expect(result.fromCache).toBe(false)
        expect(cacheCitation).toHaveBeenCalledWith(mockCitation)
      })

      it('should return error for invalid BibTeX', async () => {
        vi.mocked(detectCitationType).mockReturnValue('bibtex')
        vi.mocked(parseBibTeX).mockReturnValue([])

        const result = await resolveCitation('@invalid')

        expect(result.success).toBe(false)
        expect(result.error).toBe('Failed to parse BibTeX')
      })
    })

    describe('RIS input', () => {
      it('should parse and return RIS citation', async () => {
        vi.mocked(detectCitationType).mockReturnValue('ris')
        vi.mocked(parseRIS).mockReturnValue([mockCitation])

        const result = await resolveCitation('TY  - JOUR\nER  -')

        expect(result.success).toBe(true)
        expect(result.citation).toEqual(mockCitation)
        expect(result.source).toBe('bibtex-import')
      })

      it('should return error for invalid RIS', async () => {
        vi.mocked(detectCitationType).mockReturnValue('ris')
        vi.mocked(parseRIS).mockReturnValue([])

        const result = await resolveCitation('invalid ris')

        expect(result.success).toBe(false)
        expect(result.error).toBe('Failed to parse RIS')
      })
    })

    describe('DOI input', () => {
      it('should return cached DOI citation', async () => {
        vi.mocked(extractDOI).mockReturnValue('10.1234/test')
        vi.mocked(getCachedByDOI).mockResolvedValue(mockCitation)

        const result = await resolveCitation('10.1234/test')

        expect(result.success).toBe(true)
        expect(result.citation).toEqual(mockCitation)
        expect(result.fromCache).toBe(true)
        expect(resolveDOI).not.toHaveBeenCalled()
      })

      it('should resolve DOI via CrossRef when not cached', async () => {
        vi.mocked(extractDOI).mockReturnValue('10.1234/test')
        vi.mocked(getCachedByDOI).mockResolvedValue(null)
        vi.mocked(resolveDOI).mockResolvedValue(mockCitation)

        const result = await resolveCitation('10.1234/test')

        expect(result.success).toBe(true)
        expect(result.citation).toEqual(mockCitation)
        expect(result.source).toBe('crossref')
        expect(result.fromCache).toBe(false)
        expect(cacheCitation).toHaveBeenCalledWith(mockCitation)
      })

      it('should skip cache when skipCache option is set', async () => {
        vi.mocked(extractDOI).mockReturnValue('10.1234/test')
        vi.mocked(resolveDOI).mockResolvedValue(mockCitation)

        const result = await resolveCitation('10.1234/test', { skipCache: true })

        expect(getCachedByDOI).not.toHaveBeenCalled()
        expect(resolveDOI).toHaveBeenCalled()
        expect(result.success).toBe(true)
      })
    })

    describe('arXiv input', () => {
      it('should return cached arXiv citation', async () => {
        vi.mocked(extractArxivId).mockReturnValue('2301.00001')
        vi.mocked(getCachedByArxivId).mockResolvedValue(mockArxivCitation)

        const result = await resolveCitation('2301.00001')

        expect(result.success).toBe(true)
        expect(result.citation).toEqual(mockArxivCitation)
        expect(result.fromCache).toBe(true)
      })

      it('should resolve arXiv via API when not cached', async () => {
        vi.mocked(extractArxivId).mockReturnValue('2301.00001')
        vi.mocked(getCachedByArxivId).mockResolvedValue(null)
        vi.mocked(getPaper).mockResolvedValue(mockArxivCitation)

        const result = await resolveCitation('2301.00001')

        expect(result.success).toBe(true)
        expect(result.citation).toEqual(mockArxivCitation)
        expect(result.source).toBe('arxiv')
      })
    })

    describe('URL input', () => {
      it('should handle arXiv URL', async () => {
        vi.mocked(detectCitationType).mockReturnValue('url')
        vi.mocked(extractArxivId).mockReturnValue('2301.00001')
        vi.mocked(getPaper).mockResolvedValue(mockArxivCitation)

        const result = await resolveCitation('https://arxiv.org/abs/2301.00001')

        expect(result.success).toBe(true)
        expect(result.source).toBe('arxiv')
      })

      it('should handle DOI URL', async () => {
        vi.mocked(detectCitationType).mockReturnValue('url')
        vi.mocked(extractDOI).mockReturnValue('10.1234/test')
        vi.mocked(resolveDOI).mockResolvedValue(mockCitation)

        const result = await resolveCitation('https://doi.org/10.1234/test')

        expect(result.success).toBe(true)
        expect(result.source).toBe('crossref')
      })
    })

    describe('text input', () => {
      it('should search CrossRef for text input', async () => {
        vi.mocked(detectCitationType).mockReturnValue('text')
        vi.mocked(searchWorks).mockResolvedValue({
          results: [mockCitation],
          total: 1,
          page: 1,
          perPage: 10,
          query: 'test',
          source: 'crossref',
        })

        const result = await resolveCitation('Some research paper title by authors')

        expect(result.success).toBe(true)
        expect(result.citation).toEqual(mockCitation)
        expect(result.source).toBe('crossref')
      })

      it('should not search for short text input', async () => {
        vi.mocked(detectCitationType).mockReturnValue('text')

        const result = await resolveCitation('short')

        expect(searchWorks).not.toHaveBeenCalled()
        expect(result.success).toBe(false)
      })
    })

    describe('offline handling', () => {
      it('should return cached result when offline', async () => {
        Object.defineProperty(navigator, 'onLine', { value: false })
        vi.mocked(searchCachedCitations).mockResolvedValue([mockCitation])

        const result = await resolveCitation('test query')

        expect(result.success).toBe(true)
        expect(result.citation).toEqual(mockCitation)
        expect(result.fromCache).toBe(true)
      })

      it('should return error when offline and not in cache', async () => {
        Object.defineProperty(navigator, 'onLine', { value: false })
        vi.mocked(searchCachedCitations).mockResolvedValue([])

        const result = await resolveCitation('test query')

        expect(result.success).toBe(false)
        expect(result.error).toBe('Offline and not found in cache')
      })
    })

    describe('timeout handling', () => {
      it('should timeout after specified duration', async () => {
        vi.mocked(detectCitationType).mockReturnValue('text')
        vi.mocked(extractDOI).mockReturnValue(null)
        vi.mocked(extractArxivId).mockReturnValue(null)
        // Create a slow promise that won't resolve within timeout
        vi.mocked(searchWorks).mockImplementation(
          () => new Promise((resolve) => setTimeout(() => resolve({
            results: [mockCitation],
            total: 1,
            page: 1,
            perPage: 10,
            query: 'test',
            source: 'crossref' as const,
          }), 5000))
        )

        // Use a long enough query (>10 chars) to trigger text search
        const result = await resolveCitation('A long research paper title for testing timeouts', { timeout: 50 })

        expect(result.success).toBe(false)
        expect(result.error).toBe('Timeout')
      })
    })

    describe('latency tracking', () => {
      it('should include latency in result', async () => {
        vi.mocked(detectCitationType).mockReturnValue('bibtex')
        vi.mocked(parseBibTeX).mockReturnValue([mockCitation])

        const result = await resolveCitation('@article{test}')

        expect(result.latency).toBeDefined()
        expect(typeof result.latency).toBe('number')
        expect(result.latency).toBeGreaterThanOrEqual(0)
      })
    })
  })

  describe('resolveCitations', () => {
    it('should resolve multiple citations', async () => {
      vi.mocked(detectCitationType).mockReturnValue('bibtex')
      vi.mocked(parseBibTeX).mockReturnValue([mockCitation])

      const results = await resolveCitations([
        '@article{one}',
        '@article{two}',
        '@article{three}',
      ])

      expect(results).toHaveLength(3)
      expect(results.every((r) => r.success)).toBe(true)
    })

    it('should process in batches for concurrency control', async () => {
      vi.mocked(detectCitationType).mockReturnValue('bibtex')
      vi.mocked(parseBibTeX).mockReturnValue([mockCitation])

      const inputs = Array(12).fill('@article{test}')
      const results = await resolveCitations(inputs)

      expect(results).toHaveLength(12)
    })
  })

  describe('searchPapers', () => {
    it('should search cache first', async () => {
      vi.mocked(searchCachedCitations).mockResolvedValue([mockCitation])

      const result = await searchPapers('test query', { sources: ['cache'] })

      expect(searchCachedCitations).toHaveBeenCalledWith('test query')
      expect(result.results).toContain(mockCitation)
    })

    it('should search CrossRef when online', async () => {
      vi.mocked(searchWorks).mockResolvedValue({
        results: [mockCitation],
        total: 1,
        page: 1,
        perPage: 10,
        query: 'test',
        source: 'crossref',
      })

      const result = await searchPapers('test query', { sources: ['crossref'] })

      expect(searchWorks).toHaveBeenCalled()
      expect(result.results).toContain(mockCitation)
    })

    it('should search arXiv when online', async () => {
      vi.mocked(searchArxiv).mockResolvedValue({
        results: [mockArxivCitation],
        total: 1,
        page: 1,
        perPage: 10,
        query: 'test',
        source: 'arxiv',
      })

      const result = await searchPapers('test query', { sources: ['arxiv'] })

      expect(searchArxiv).toHaveBeenCalled()
      expect(result.results).toContain(mockArxivCitation)
    })

    it('should deduplicate results by ID', async () => {
      vi.mocked(searchCachedCitations).mockResolvedValue([mockCitation])
      vi.mocked(searchWorks).mockResolvedValue({
        results: [mockCitation], // Same citation
        total: 1,
        page: 1,
        perPage: 10,
        query: 'test',
        source: 'crossref',
      })

      const result = await searchPapers('test query')

      // Should only have one instance despite being in both cache and CrossRef
      const matchingCitations = result.results.filter((c) => c.id === mockCitation.id)
      expect(matchingCitations).toHaveLength(1)
    })

    it('should sort by citation count then year', async () => {
      const cited1: Citation = { ...mockCitation, id: 'c1', citationCount: 100, year: 2020 }
      const cited2: Citation = { ...mockCitation, id: 'c2', citationCount: 50, year: 2022 }
      const cited3: Citation = { ...mockCitation, id: 'c3', year: 2021 } // No citation count

      vi.mocked(searchCachedCitations).mockResolvedValue([cited2, cited1, cited3])

      const result = await searchPapers('test', { sources: ['cache'] })

      expect(result.results[0].id).toBe('c1') // Highest citation count
      expect(result.results[1].id).toBe('c2') // Second highest
    })

    it('should limit results to maxResults', async () => {
      const citations = Array(20).fill(0).map((_, i) => ({
        ...mockCitation,
        id: `citation-${i}`,
      }))
      vi.mocked(searchCachedCitations).mockResolvedValue(citations)

      const result = await searchPapers('test', { sources: ['cache'], maxResults: 5 })

      expect(result.results).toHaveLength(5)
    })

    it('should pass category to arXiv search', async () => {
      vi.mocked(searchArxiv).mockResolvedValue({
        results: [],
        total: 0,
        page: 1,
        perPage: 10,
        query: 'test',
        source: 'arxiv',
      })

      await searchPapers('test', { sources: ['arxiv'], category: 'cs.AI' })

      expect(searchArxiv).toHaveBeenCalledWith(
        'test',
        expect.objectContaining({ category: 'cs.AI' })
      )
    })
  })

  describe('isValidDOI', () => {
    it('should return true for valid DOI', () => {
      vi.mocked(extractDOI).mockReturnValue('10.1234/test')
      expect(isValidDOI('10.1234/test')).toBe(true)
    })

    it('should return false for invalid DOI', () => {
      vi.mocked(extractDOI).mockReturnValue(null)
      expect(isValidDOI('not a doi')).toBe(false)
    })
  })

  describe('isValidArxivId', () => {
    it('should return true for valid arXiv ID', () => {
      vi.mocked(extractArxivId).mockReturnValue('2301.00001')
      expect(isValidArxivId('2301.00001')).toBe(true)
    })

    it('should return false for invalid arXiv ID', () => {
      vi.mocked(extractArxivId).mockReturnValue(null)
      expect(isValidArxivId('not an arxiv id')).toBe(false)
    })
  })
})
