/**
 * Tests for Session to Citations Converter
 * @module tests/unit/research/sessionToCitations
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { WebSearchResult, ResearchSession } from '@/lib/research/types'

// Mock fixtures
const mockWebResult: WebSearchResult = {
  id: 'web-1',
  title: 'Introduction to Machine Learning',
  url: 'https://example.com/ml-intro',
  snippet: 'A comprehensive guide to machine learning fundamentals.',
  domain: 'example.com',
  position: 0,
  source: 'duckduckgo',
  authors: ['John Smith', 'Jane Doe'],
  publishedDate: '2024-03-15',
}

const mockAcademicResult: WebSearchResult = {
  id: 'academic-1',
  title: 'Attention Is All You Need',
  url: 'https://arxiv.org/abs/1706.03762',
  snippet: 'The dominant sequence transduction models are based on complex recurrent or convolutional neural networks.',
  domain: 'arxiv.org',
  position: 1,
  source: 'semanticscholar',
  authors: ['Ashish Vaswani', 'Noam Shazeer'],
  publishedDate: '2017-06-12',
}

const mockSession: ResearchSession = {
  id: 'session_123',
  topic: 'Machine Learning Research',
  query: 'machine learning transformers',
  queries: ['machine learning transformers', 'attention mechanism'],
  savedResults: [mockWebResult, mockAcademicResult],
  notes: 'Research notes here',
  createdAt: Date.now(),
  updatedAt: Date.now(),
  tags: ['ml', 'research'],
  linkedSessions: [],
}

// Mock the academic detector
vi.mock('@/lib/research/academicDetector', () => ({
  isAcademicResult: vi.fn((result: WebSearchResult) => {
    const academicDomains = ['arxiv.org', 'doi.org', 'pubmed.ncbi.nlm.nih.gov']
    return academicDomains.some(domain => result.url.includes(domain))
  }),
  extractCitationId: vi.fn((url: string) => {
    if (url.includes('arxiv.org')) {
      const match = url.match(/arxiv\.org\/abs\/(\d+\.\d+)/)
      return match ? match[1] : null
    }
    return null
  }),
}))

// Mock the citation formatter
vi.mock('@/lib/research/citationFormatter', () => ({
  formatCitation: vi.fn((source, style) => {
    const authors = source.authors?.join(', ') || source.publisher || 'Unknown'
    const year = source.publishedDate
      ? new Date(source.publishedDate).getFullYear()
      : 'n.d.'

    switch (style) {
      case 'apa':
        return `${authors} (${year}). ${source.title}. ${source.url}`
      case 'mla':
        return `${authors}. "${source.title}." Web. ${year}.`
      case 'chicago':
        return `${authors}. "${source.title}." Accessed ${year}. ${source.url}`
      case 'bibtex':
        return `@misc{${source.title?.toLowerCase().replace(/\s+/g, '_')},\n  title = {${source.title}},\n  url = {${source.url}}\n}`
      default:
        return `${authors} (${year}). ${source.title}.`
    }
  }),
}))

// Mock Semantic Scholar (return null for simplicity in tests)
vi.mock('@/lib/research/semanticScholar', () => ({
  getPaperDetails: vi.fn().mockResolvedValue(null),
}))

import {
  resultToCitationSource,
  convertResult,
  convertSessionToCitations,
  formatBibliography,
  exportBibliography,
  generateInTextCitation,
} from '@/lib/research/sessionToCitations'

describe('Session to Citations Converter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('resultToCitationSource', () => {
    it('should convert web result to citation source', () => {
      const source = resultToCitationSource(mockWebResult)

      expect(source.title).toBe('Introduction to Machine Learning')
      expect(source.url).toBe('https://example.com/ml-intro')
      expect(source.authors).toEqual(['John Smith', 'Jane Doe'])
      expect(source.publishedDate).toBe('2024-03-15')
      expect(source.publisher).toBe('example.com')
      expect(source.type).toBe('webpage')
      expect(source.abstract).toBe(mockWebResult.snippet)
    })

    it('should mark academic result with paper type', () => {
      const source = resultToCitationSource(mockAcademicResult)

      expect(source.type).toBe('paper')
      expect(source.title).toBe('Attention Is All You Need')
    })

    it('should set accessedDate to current date', () => {
      const before = new Date().toISOString().split('T')[0]
      const source = resultToCitationSource(mockWebResult)
      const accessedDate = source.accessedDate?.split('T')[0]

      expect(accessedDate).toBe(before)
    })
  })

  describe('convertResult', () => {
    it('should convert result to ConvertedCitation', async () => {
      const citation = await convertResult(mockWebResult, 'apa', { autoEnrich: false })

      expect(citation.resultId).toBe('web-1')
      expect(citation.isAcademic).toBe(false)
      expect(citation.enriched).toBe(false)
      expect(citation.formatted).toBeDefined()
      expect(citation.source.title).toBe('Introduction to Machine Learning')
    })

    it('should mark academic results correctly', async () => {
      const citation = await convertResult(mockAcademicResult, 'apa', { autoEnrich: false })

      expect(citation.isAcademic).toBe(true)
    })

    it('should format citation in specified style', async () => {
      const apaCitation = await convertResult(mockWebResult, 'apa', { autoEnrich: false })
      const mlaCitation = await convertResult(mockWebResult, 'mla', { autoEnrich: false })

      expect(apaCitation.formatted).toContain('(2024)')
      expect(mlaCitation.formatted).toContain('"Introduction to Machine Learning."')
    })
  })

  describe('convertSessionToCitations', () => {
    it('should convert all session results to citations', async () => {
      const result = await convertSessionToCitations(mockSession, {
        style: 'apa',
        autoEnrich: false,
      })

      expect(result.citations).toHaveLength(2)
      expect(result.style).toBe('apa')
    })

    it('should count enrichment statistics', async () => {
      const result = await convertSessionToCitations(mockSession, {
        style: 'apa',
        autoEnrich: false,
      })

      // With autoEnrich false, no enrichment should happen
      expect(result.enrichedCount).toBe(0)
    })

    it('should handle empty session', async () => {
      const emptySession: ResearchSession = {
        ...mockSession,
        savedResults: [],
      }

      const result = await convertSessionToCitations(emptySession, { style: 'apa' })

      expect(result.citations).toHaveLength(0)
      expect(result.enrichedCount).toBe(0)
    })

    it('should respect abort signal', async () => {
      const controller = new AbortController()
      controller.abort()

      const result = await convertSessionToCitations(mockSession, {
        style: 'apa',
        signal: controller.signal,
      })

      // Should stop early due to abort
      expect(result.citations.length).toBeLessThanOrEqual(mockSession.savedResults.length)
    })
  })

  describe('formatBibliography', () => {
    it('should format citations as bibliography', async () => {
      const result = await convertSessionToCitations(mockSession, {
        style: 'apa',
        autoEnrich: false,
      })

      const bibliography = formatBibliography(result.citations, 'apa')

      expect(bibliography).toContain('Introduction to Machine Learning')
      expect(bibliography).toContain('Attention Is All You Need')
    })

    it('should number citations when requested', async () => {
      const result = await convertSessionToCitations(mockSession, {
        style: 'apa',
        autoEnrich: false,
      })

      const bibliography = formatBibliography(result.citations, 'apa', { numbered: true })

      expect(bibliography).toContain('[1]')
      expect(bibliography).toContain('[2]')
    })

    it('should use custom separator', async () => {
      const result = await convertSessionToCitations(mockSession, {
        style: 'apa',
        autoEnrich: false,
      })

      const bibliography = formatBibliography(result.citations, 'apa', { separator: '\n---\n' })

      expect(bibliography).toContain('\n---\n')
    })
  })

  describe('exportBibliography', () => {
    it('should export as plain text', async () => {
      const result = await convertSessionToCitations(mockSession, {
        style: 'apa',
        autoEnrich: false,
      })

      const exported = exportBibliography(result.citations, 'apa', 'text')

      expect(exported).toContain('[1]')
      expect(exported).toContain('[2]')
    })

    it('should export as markdown', async () => {
      const result = await convertSessionToCitations(mockSession, {
        style: 'apa',
        autoEnrich: false,
      })

      const exported = exportBibliography(result.citations, 'apa', 'markdown')

      expect(exported).toContain('1.')
      expect(exported).toContain('2.')
    })

    it('should export as HTML', async () => {
      const result = await convertSessionToCitations(mockSession, {
        style: 'apa',
        autoEnrich: false,
      })

      const exported = exportBibliography(result.citations, 'apa', 'html')

      expect(exported).toContain('<div class="bibliography">')
      expect(exported).toContain('<p class="citation"')
      expect(exported).toContain('data-index="1"')
    })

    it('should export as BibTeX', async () => {
      const result = await convertSessionToCitations(mockSession, {
        style: 'apa',
        autoEnrich: false,
      })

      const exported = exportBibliography(result.citations, 'apa', 'bibtex')

      expect(exported).toContain('@misc{')
      expect(exported).toContain('title = {')
    })
  })

  describe('generateInTextCitation', () => {
    it('should generate APA in-text citation', () => {
      const source = resultToCitationSource(mockWebResult)
      const citation = generateInTextCitation(source, 'apa')

      // Uses last name of first author (John Smith -> Smith)
      expect(citation).toBe('(Smith, 2024)')
    })

    it('should generate MLA in-text citation', () => {
      const source = resultToCitationSource(mockWebResult)
      const citation = generateInTextCitation(source, 'mla')

      expect(citation).toBe('(Smith)')
    })

    it('should generate Chicago in-text citation', () => {
      const source = resultToCitationSource(mockWebResult)
      const citation = generateInTextCitation(source, 'chicago')

      expect(citation).toBe('(Smith 2024)')
    })

    it('should generate IEEE placeholder citation', () => {
      const source = resultToCitationSource(mockWebResult)
      const citation = generateInTextCitation(source, 'ieee')

      expect(citation).toBe('[#]')
    })

    it('should use publisher when no authors', () => {
      const resultWithoutAuthors: WebSearchResult = {
        ...mockWebResult,
        authors: undefined,
      }
      const source = resultToCitationSource(resultWithoutAuthors)
      const citation = generateInTextCitation(source, 'apa')

      expect(citation).toContain('example.com')
    })

    it('should use n.d. when no date', () => {
      const resultWithoutDate: WebSearchResult = {
        ...mockWebResult,
        publishedDate: undefined,
      }
      const source = resultToCitationSource(resultWithoutDate)
      const citation = generateInTextCitation(source, 'apa')

      expect(citation).toContain('n.d.')
    })
  })
})
