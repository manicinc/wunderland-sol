/**
 * Citation Formatter Tests
 * @module __tests__/unit/lib/research/citationFormatter.test
 *
 * Tests for citation formatting in various academic styles.
 */

import { describe, it, expect } from 'vitest'
import {
  formatCitation,
  exportCitations,
  getCitationStyles,
  type CitationSource,
  type CitationStyle,
} from '@/lib/research/citationFormatter'

// ============================================================================
// TEST DATA
// ============================================================================

const basicSource: CitationSource = {
  title: 'Introduction to Machine Learning',
  url: 'https://example.com/ml-intro',
  authors: ['John Smith'],
  publishedDate: '2024-03-15',
  accessedDate: '2024-12-01',
}

const journalSource: CitationSource = {
  title: 'Deep Learning in Healthcare',
  url: 'https://journal.example.com/article/123',
  authors: ['Jane Doe', 'Bob Wilson', 'Alice Chen'],
  publishedDate: '2023-06-20',
  accessedDate: '2024-11-15',
  journal: 'Nature Machine Intelligence',
  volume: '5',
  issue: '3',
  pages: '145-162',
  doi: '10.1234/nmi.2023.001',
  type: 'article',
}

const bookSource: CitationSource = {
  title: 'Artificial Intelligence: A Modern Approach',
  url: 'https://aima.cs.berkeley.edu/',
  authors: ['Stuart Russell', 'Peter Norvig'],
  publishedDate: '2020-01-01',
  publisher: 'Pearson',
  type: 'book',
}

const noAuthorSource: CitationSource = {
  title: 'API Documentation',
  url: 'https://docs.example.com/api',
}

// ============================================================================
// FORMAT CITATION - MARKDOWN
// ============================================================================

describe('formatCitation - markdown', () => {
  it('formats as markdown link', () => {
    const result = formatCitation(basicSource, 'markdown')
    expect(result).toBe('[Introduction to Machine Learning](https://example.com/ml-intro)')
  })

  it('handles special characters in title', () => {
    const source = { ...basicSource, title: 'Test & More' }
    const result = formatCitation(source, 'markdown')
    expect(result).toBe('[Test & More](https://example.com/ml-intro)')
  })
})

// ============================================================================
// FORMAT CITATION - PLAINTEXT
// ============================================================================

describe('formatCitation - plaintext', () => {
  it('formats as simple text', () => {
    const result = formatCitation(basicSource, 'plaintext')
    expect(result).toBe('Introduction to Machine Learning. https://example.com/ml-intro')
  })
})

// ============================================================================
// FORMAT CITATION - BIBTEX
// ============================================================================

describe('formatCitation - bibtex', () => {
  it('generates valid BibTeX entry', () => {
    const result = formatCitation(basicSource, 'bibtex')
    expect(result).toContain('@misc{')
    expect(result).toContain('title = {Introduction to Machine Learning}')
    expect(result).toContain('author = {John Smith}')
    expect(result).toContain('year = {2024}')
    expect(result).toContain('url = {https://example.com/ml-intro}')
  })

  it('generates article type for journal sources', () => {
    const result = formatCitation(journalSource, 'bibtex')
    expect(result).toContain('@article{')
    expect(result).toContain('journal = {Nature Machine Intelligence}')
    expect(result).toContain('volume = {5}')
    expect(result).toContain('number = {3}')
    expect(result).toContain('pages = {145-162}')
    expect(result).toContain('doi = {10.1234/nmi.2023.001}')
  })

  it('generates book type for book sources', () => {
    const result = formatCitation(bookSource, 'bibtex')
    expect(result).toContain('@book{')
    expect(result).toContain('publisher = {Pearson}')
  })

  it('generates unique key from author and title', () => {
    const result = formatCitation(basicSource, 'bibtex')
    // Key should be authorYearFirstWord format
    expect(result).toMatch(/@misc\{smith2024introduction/)
  })

  it('handles multiple authors with "and"', () => {
    const result = formatCitation(journalSource, 'bibtex')
    expect(result).toContain('author = {Jane Doe and Bob Wilson and Alice Chen}')
  })
})

// ============================================================================
// FORMAT CITATION - APA
// ============================================================================

describe('formatCitation - apa', () => {
  it('formats single author correctly', () => {
    const result = formatCitation(basicSource, 'apa')
    expect(result).toContain('Smith, John')
    expect(result).toContain('(2024)')
    expect(result).toContain('*Introduction to Machine Learning*')
  })

  it('formats two authors with ampersand', () => {
    const source = { ...basicSource, authors: ['John Smith', 'Jane Doe'] }
    const result = formatCitation(source, 'apa')
    expect(result).toContain('Smith, John & Doe, Jane')
  })

  it('formats three+ authors with et al.', () => {
    const result = formatCitation(journalSource, 'apa')
    expect(result).toContain('Doe, Jane et al.')
  })

  it('uses (n.d.) when no date', () => {
    const result = formatCitation(noAuthorSource, 'apa')
    expect(result).toContain('(n.d.)')
  })

  it('includes Retrieved from URL', () => {
    const result = formatCitation(basicSource, 'apa')
    expect(result).toContain('Retrieved')
    expect(result).toContain('from https://example.com/ml-intro')
  })

  it('formats journal article with volume/issue/pages', () => {
    const result = formatCitation(journalSource, 'apa')
    expect(result).toContain('*Nature Machine Intelligence*')
    // Volume and issue may have spaces in implementation
    expect(result).toContain('5')
    expect(result).toContain('(3)')
    expect(result).toContain('145-162')
  })
})

// ============================================================================
// FORMAT CITATION - MLA
// ============================================================================

describe('formatCitation - mla', () => {
  it('formats single author last-first', () => {
    const result = formatCitation(basicSource, 'mla')
    expect(result).toContain('Smith, John.')
  })

  it('formats two authors correctly', () => {
    const source = { ...basicSource, authors: ['John Smith', 'Jane Doe'] }
    const result = formatCitation(source, 'mla')
    expect(result).toContain('Smith, John, and Jane Doe.')
  })

  it('uses et al. for 3+ authors', () => {
    const result = formatCitation(journalSource, 'mla')
    expect(result).toContain('Doe, Jane, et al.')
  })

  it('puts article titles in quotes', () => {
    const result = formatCitation(journalSource, 'mla')
    expect(result).toContain('"Deep Learning in Healthcare."')
  })

  it('italicizes book/webpage titles', () => {
    const result = formatCitation(basicSource, 'mla')
    expect(result).toContain('*Introduction to Machine Learning*')
  })

  it('includes Accessed date', () => {
    const result = formatCitation(basicSource, 'mla')
    expect(result).toContain('Accessed')
  })
})

// ============================================================================
// FORMAT CITATION - CHICAGO
// ============================================================================

describe('formatCitation - chicago', () => {
  it('formats author correctly', () => {
    const result = formatCitation(basicSource, 'chicago')
    expect(result).toContain('Smith, John.')
  })

  it('includes all authors for multiple', () => {
    const result = formatCitation(journalSource, 'chicago')
    expect(result).toContain('Doe, Jane')
    expect(result).toContain('Bob Wilson')
    expect(result).toContain('Alice Chen')
  })

  it('formats journal with volume and issue', () => {
    const result = formatCitation(journalSource, 'chicago')
    expect(result).toContain('*Nature Machine Intelligence*')
    expect(result).toContain('5')
    expect(result).toContain('no. 3')
  })
})

// ============================================================================
// FORMAT CITATION - HARVARD
// ============================================================================

describe('formatCitation - harvard', () => {
  it('formats with year in parentheses', () => {
    const result = formatCitation(basicSource, 'harvard')
    expect(result).toContain('(2024)')
  })

  it('puts title in single quotes', () => {
    const result = formatCitation(basicSource, 'harvard')
    expect(result).toContain("'Introduction to Machine Learning'")
  })

  it('includes Available at: URL', () => {
    const result = formatCitation(basicSource, 'harvard')
    expect(result).toContain('Available at: https://example.com/ml-intro')
  })

  it('includes Accessed date in brackets', () => {
    const result = formatCitation(basicSource, 'harvard')
    expect(result).toContain('[Accessed')
  })
})

// ============================================================================
// FORMAT CITATION - IEEE
// ============================================================================

describe('formatCitation - ieee', () => {
  it('formats author with initials first', () => {
    const source = { ...basicSource, authors: ['John Smith'] }
    const result = formatCitation(source, 'ieee')
    expect(result).toContain('J. Smith')
  })

  it('puts title in quotes', () => {
    const result = formatCitation(basicSource, 'ieee')
    expect(result).toContain('"Introduction to Machine Learning,"')
  })

  it('includes [Online]. Available:', () => {
    const result = formatCitation(basicSource, 'ieee')
    expect(result).toContain('[Online]. Available:')
  })

  it('includes [Accessed: date]', () => {
    const result = formatCitation(basicSource, 'ieee')
    expect(result).toContain('[Accessed:')
  })
})

// ============================================================================
// FORMAT CITATION - VANCOUVER
// ============================================================================

describe('formatCitation - vancouver', () => {
  it('formats author surname first with initials', () => {
    const result = formatCitation(basicSource, 'vancouver')
    expect(result).toContain('Smith J.')
  })

  it('limits to 6 authors then et al.', () => {
    const source = {
      ...basicSource,
      authors: ['A One', 'B Two', 'C Three', 'D Four', 'E Five', 'F Six', 'G Seven']
    }
    const result = formatCitation(source, 'vancouver')
    expect(result).toContain('et al.')
  })

  it('includes Available from:', () => {
    const result = formatCitation(basicSource, 'vancouver')
    expect(result).toContain('Available from:')
  })
})

// ============================================================================
// EXPORT CITATIONS
// ============================================================================

describe('exportCitations', () => {
  it('exports multiple BibTeX entries', () => {
    const sources = [basicSource, journalSource]
    const result = exportCitations(sources, 'bibtex')

    expect(result).toContain('@misc{')
    expect(result).toContain('@article{')
    // Entries should be separated by double newlines
    expect(result.split('\n\n').length).toBeGreaterThan(1)
  })

  it('numbers non-BibTeX citations', () => {
    const sources = [basicSource, journalSource]
    const result = exportCitations(sources, 'apa')

    expect(result).toContain('[1]')
    expect(result).toContain('[2]')
  })

  it('handles empty array', () => {
    const result = exportCitations([], 'apa')
    expect(result).toBe('')
  })
})

// ============================================================================
// GET CITATION STYLES
// ============================================================================

describe('getCitationStyles', () => {
  it('returns all supported styles', () => {
    const styles = getCitationStyles()

    const styleIds = styles.map(s => s.id)
    expect(styleIds).toContain('apa')
    expect(styleIds).toContain('mla')
    expect(styleIds).toContain('chicago')
    expect(styleIds).toContain('harvard')
    expect(styleIds).toContain('ieee')
    expect(styleIds).toContain('vancouver')
    expect(styleIds).toContain('bibtex')
    expect(styleIds).toContain('markdown')
    expect(styleIds).toContain('plaintext')
  })

  it('each style has label and description', () => {
    const styles = getCitationStyles()

    styles.forEach(style => {
      expect(style.id).toBeDefined()
      expect(style.label).toBeDefined()
      expect(style.description).toBeDefined()
      expect(style.label.length).toBeGreaterThan(0)
      expect(style.description.length).toBeGreaterThan(0)
    })
  })

  it('returns 9 styles', () => {
    const styles = getCitationStyles()
    expect(styles).toHaveLength(9)
  })
})

// ============================================================================
// EDGE CASES
// ============================================================================

describe('Edge Cases', () => {
  it('handles missing authors', () => {
    const styles: CitationStyle[] = ['apa', 'mla', 'chicago', 'harvard', 'ieee', 'vancouver', 'bibtex']

    styles.forEach(style => {
      const result = formatCitation(noAuthorSource, style)
      expect(result).toBeDefined()
      expect(result.length).toBeGreaterThan(0)
    })
  })

  it('handles missing date', () => {
    const source = { ...basicSource, publishedDate: undefined }

    const apaResult = formatCitation(source, 'apa')
    expect(apaResult).toContain('(n.d.)')
  })

  it('handles single-name authors', () => {
    const source = { ...basicSource, authors: ['Madonna'] }

    const result = formatCitation(source, 'apa')
    expect(result).toContain('Madonna')
  })

  it('handles empty title', () => {
    const source = { ...basicSource, title: '' }

    const result = formatCitation(source, 'markdown')
    expect(result).toContain('[]')
  })

  it('handles all styles for journal article', () => {
    const styles: CitationStyle[] = ['apa', 'mla', 'chicago', 'harvard', 'ieee', 'vancouver', 'bibtex', 'markdown', 'plaintext']

    styles.forEach(style => {
      const result = formatCitation(journalSource, style)
      expect(result).toBeDefined()
      expect(result.length).toBeGreaterThan(0)
    })
  })

  it('handles invalid date string', () => {
    const source = { ...basicSource, publishedDate: 'not-a-date' }

    // Should not throw
    const result = formatCitation(source, 'apa')
    expect(result).toBeDefined()
  })

  it('handles Date object for publishedDate', () => {
    const source = { ...basicSource, publishedDate: new Date('2024-06-15') }

    const result = formatCitation(source, 'apa')
    expect(result).toContain('2024')
  })
})
