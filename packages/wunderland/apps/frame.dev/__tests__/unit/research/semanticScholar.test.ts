/**
 * Tests for Semantic Scholar API Client
 * @module tests/unit/research/semanticScholar
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  getPaperByDOI,
  getPaperByArXiv,
  getPaperById,
  searchPapers,
  getRecommendations,
  getCitations,
  getReferences,
  s2PaperToSearchResult,
  extractS2PaperId,
  resolveToPaperId,
  type S2Paper,
} from '@/lib/research/semanticScholar'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

// Sample paper fixture
const mockPaper: S2Paper = {
  paperId: 'abc123def456789012345678901234567890abcd',
  title: 'Test Paper Title',
  abstract: 'This is a test abstract for the paper. It describes the research methodology and findings.',
  year: 2023,
  authors: [
    { authorId: 'auth1', name: 'John Smith' },
    { authorId: 'auth2', name: 'Jane Doe' },
  ],
  venue: 'NeurIPS',
  url: 'https://www.semanticscholar.org/paper/Test-Paper/abc123def456789012345678901234567890abcd',
  citationCount: 42,
  influentialCitationCount: 10,
  isOpenAccess: true,
  openAccessPdf: { url: 'https://arxiv.org/pdf/2301.00001.pdf' },
  fieldsOfStudy: ['Computer Science', 'Machine Learning'],
  externalIds: {
    DOI: '10.1234/test.2023',
    ArXiv: '2301.00001',
  },
}

const mockPaper2: S2Paper = {
  ...mockPaper,
  paperId: 'def456abc789012345678901234567890abcd12',
  title: 'Related Paper Title',
  citationCount: 100,
}

describe('Semantic Scholar API Client', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Paper Lookup', () => {
    describe('getPaperByDOI', () => {
      it('should fetch paper by DOI', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockPaper,
        })

        const result = await getPaperByDOI('10.1234/test.2023')

        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/paper/DOI:10.1234%2Ftest.2023'),
          expect.any(Object)
        )
        expect(result).toEqual(mockPaper)
      })

      it('should return null on 404', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 404,
        })

        const result = await getPaperByDOI('10.1234/nonexistent')

        expect(result).toBeNull()
      })

      it('should return null on rate limit (429)', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 429,
        })

        const result = await getPaperByDOI('10.1234/test')

        expect(result).toBeNull()
      })
    })

    describe('getPaperByArXiv', () => {
      it('should fetch paper by arXiv ID', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockPaper,
        })

        const result = await getPaperByArXiv('2301.00001')

        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/paper/ARXIV:2301.00001'),
          expect.any(Object)
        )
        expect(result).toEqual(mockPaper)
      })
    })

    describe('getPaperById', () => {
      it('should fetch paper by Semantic Scholar ID', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockPaper,
        })

        const result = await getPaperById(mockPaper.paperId)

        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining(`/paper/${mockPaper.paperId}`),
          expect.any(Object)
        )
        expect(result).toEqual(mockPaper)
      })
    })

    describe('searchPapers', () => {
      it('should search for papers by query', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ data: [mockPaper, mockPaper2] }),
        })

        const result = await searchPapers('machine learning')

        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/paper/search?query=machine%20learning'),
          expect.any(Object)
        )
        expect(result).toHaveLength(2)
        expect(result[0]).toEqual(mockPaper)
      })

      it('should respect limit option', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ data: [mockPaper] }),
        })

        await searchPapers('test', { limit: 5 })

        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('limit=5'),
          expect.any(Object)
        )
      })

      it('should return empty array on error', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 500,
        })

        const result = await searchPapers('test')

        expect(result).toEqual([])
      })
    })
  })

  describe('Recommendations', () => {
    describe('getRecommendations', () => {
      it('should return empty array for empty input', async () => {
        const result = await getRecommendations([])

        expect(mockFetch).not.toHaveBeenCalled()
        expect(result).toEqual([])
      })

      it('should use single paper endpoint for one paper', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ recommendedPapers: [mockPaper2] }),
        })

        const result = await getRecommendations([mockPaper.paperId])

        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining(`/recommendations/v1/papers/forpaper/${mockPaper.paperId}`),
          expect.any(Object)
        )
        expect(result).toHaveLength(1)
      })

      it('should use POST endpoint for multiple papers', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ recommendedPapers: [mockPaper2] }),
        })

        const paperIds = [mockPaper.paperId, mockPaper2.paperId]
        await getRecommendations(paperIds)

        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/recommendations/v1/papers'),
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({ positivePaperIds: paperIds }),
          })
        )
      })

      it('should respect limit option', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ recommendedPapers: [] }),
        })

        await getRecommendations([mockPaper.paperId], { limit: 20 })

        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('limit=20'),
          expect.any(Object)
        )
      })

      it('should return empty array on error', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 500,
        })

        const result = await getRecommendations([mockPaper.paperId, mockPaper2.paperId])

        expect(result).toEqual([])
      })
    })

    describe('getCitations', () => {
      it('should fetch papers that cite the given paper', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            data: [{ citingPaper: mockPaper2 }],
          }),
        })

        const result = await getCitations(mockPaper.paperId)

        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining(`/paper/${mockPaper.paperId}/citations`),
          expect.any(Object)
        )
        expect(result).toHaveLength(1)
        expect(result[0]).toEqual(mockPaper2)
      })

      it('should return empty array when no citations', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ data: [] }),
        })

        const result = await getCitations('new-paper-id')

        expect(result).toEqual([])
      })
    })

    describe('getReferences', () => {
      it('should fetch papers referenced by the given paper', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            data: [{ citedPaper: mockPaper2 }],
          }),
        })

        const result = await getReferences(mockPaper.paperId)

        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining(`/paper/${mockPaper.paperId}/references`),
          expect.any(Object)
        )
        expect(result).toHaveLength(1)
        expect(result[0]).toEqual(mockPaper2)
      })
    })
  })

  describe('Conversion Helpers', () => {
    describe('s2PaperToSearchResult', () => {
      it('should convert S2 paper to WebSearchResult format', () => {
        const result = s2PaperToSearchResult(mockPaper, 0)

        expect(result.id).toBe(`s2_${mockPaper.paperId}`)
        expect(result.title).toBe(mockPaper.title)
        expect(result.url).toBe(mockPaper.url)
        expect(result.domain).toBe('semanticscholar.org')
        expect(result.position).toBe(0)
      })

      it('should include author names in snippet', () => {
        const result = s2PaperToSearchResult(mockPaper, 0)

        expect(result.snippet).toContain('John Smith')
        expect(result.snippet).toContain('Jane Doe')
      })

      it('should include year in snippet', () => {
        const result = s2PaperToSearchResult(mockPaper, 0)

        expect(result.snippet).toContain('2023')
        expect(result.publishedDate).toBe('2023')
      })

      it('should include citation count in snippet', () => {
        const result = s2PaperToSearchResult(mockPaper, 0)

        expect(result.snippet).toContain('42 citations')
      })

      it('should truncate long abstracts', () => {
        const longAbstract = 'A'.repeat(300)
        const paperWithLongAbstract = { ...mockPaper, abstract: longAbstract }

        const result = s2PaperToSearchResult(paperWithLongAbstract, 0)

        expect(result.snippet.length).toBeLessThan(longAbstract.length + 100)
        expect(result.snippet).toContain('...')
      })

      it('should handle paper without abstract', () => {
        const paperNoAbstract = { ...mockPaper, abstract: null }

        const result = s2PaperToSearchResult(paperNoAbstract, 0)

        expect(result.snippet).toContain('John Smith')
        expect(result.snippet).not.toContain('...')
      })

      it('should generate fallback URL for paper without url', () => {
        const paperNoUrl = { ...mockPaper, url: '' }

        const result = s2PaperToSearchResult(paperNoUrl, 0)

        expect(result.url).toContain('semanticscholar.org/paper/')
        expect(result.url).toContain(mockPaper.paperId)
      })
    })

    describe('extractS2PaperId', () => {
      it('should extract paper ID from Semantic Scholar URL', () => {
        const url = 'https://www.semanticscholar.org/paper/Test-Paper-Title/abc123def456789012345678901234567890abcd'

        const result = extractS2PaperId(url)

        expect(result).toBe('abc123def456789012345678901234567890abcd')
      })

      it('should return null for non-S2 URL', () => {
        const url = 'https://arxiv.org/abs/2301.00001'

        const result = extractS2PaperId(url)

        expect(result).toBeNull()
      })

      it('should return null for invalid S2 URL format', () => {
        const url = 'https://www.semanticscholar.org/author/John-Smith/12345'

        const result = extractS2PaperId(url)

        expect(result).toBeNull()
      })
    })

    describe('resolveToPaperId', () => {
      it('should resolve DOI to paper ID', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockPaper,
        })

        const result = await resolveToPaperId({ type: 'doi', id: '10.1234/test' })

        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/paper/DOI:'),
          expect.any(Object)
        )
        expect(result).toBe(mockPaper.paperId)
      })

      it('should resolve arXiv ID to paper ID', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockPaper,
        })

        const result = await resolveToPaperId({ type: 'arxiv', id: '2301.00001' })

        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/paper/ARXIV:'),
          expect.any(Object)
        )
        expect(result).toBe(mockPaper.paperId)
      })

      it('should resolve S2 URL to paper ID', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockPaper,
        })

        const url = `https://www.semanticscholar.org/paper/Test/${mockPaper.paperId}`
        const result = await resolveToPaperId({ type: 'url', id: url })

        expect(result).toBe(mockPaper.paperId)
      })

      it('should return null for URL without S2 paper ID', async () => {
        const result = await resolveToPaperId({ type: 'url', id: 'https://example.com' })

        expect(result).toBeNull()
      })

      it('should resolve PMID to paper ID', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ paperId: mockPaper.paperId }),
        })

        const result = await resolveToPaperId({ type: 'pmid', id: '12345678' })

        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/paper/PMID:12345678'),
          expect.any(Object)
        )
        expect(result).toBe(mockPaper.paperId)
      })

      it('should return null when paper not found', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 404,
        })

        const result = await resolveToPaperId({ type: 'doi', id: '10.1234/nonexistent' })

        expect(result).toBeNull()
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await getPaperByDOI('10.1234/test')

      expect(result).toBeNull()
    })

    it('should rethrow AbortError', async () => {
      const abortError = new Error('Aborted')
      abortError.name = 'AbortError'
      mockFetch.mockRejectedValueOnce(abortError)

      await expect(getPaperByDOI('10.1234/test')).rejects.toThrow('Aborted')
    })

    it('should support AbortSignal for cancellation', async () => {
      const controller = new AbortController()
      const abortError = new Error('Aborted')
      abortError.name = 'AbortError'

      mockFetch.mockImplementationOnce(() => {
        return new Promise((_, reject) => {
          controller.signal.addEventListener('abort', () => reject(abortError))
        })
      })

      const promise = getPaperByDOI('10.1234/test', controller.signal)
      controller.abort()

      await expect(promise).rejects.toThrow('Aborted')
    })
  })
})
