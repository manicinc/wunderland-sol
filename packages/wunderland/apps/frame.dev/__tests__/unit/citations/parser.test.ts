/**
 * Tests for Citation Parser
 * @module tests/unit/citations/parser
 */

import { describe, it, expect } from 'vitest'
import {
  detectCitationType,
  extractDOI,
  extractArxivId,
  extractPmid,
  parseBibTeX,
  parseRIS,
  formatCitation,
  toBibTeX,
} from '@/lib/citations/parser'
import type { Citation, CitationInputType } from '@/lib/citations/types'

// Test fixtures
const SAMPLE_BIBTEX = `
@article{smith2021example,
  title={An Example Article Title},
  author={Smith, John and Doe, Jane},
  journal={Journal of Examples},
  year={2021},
  volume={10},
  number={2},
  pages={100-110},
  doi={10.1234/example.2021}
}
`

const SAMPLE_RIS = `
TY  - JOUR
AU  - Smith, John
AU  - Doe, Jane
TI  - An Example Article Title
JO  - Journal of Examples
VL  - 10
IS  - 2
SP  - 100
EP  - 110
PY  - 2021
DO  - 10.1234/example.2021
ER  -
`

// Mock citation for formatting tests
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
  volume: '10',
  issue: '2',
  pages: '100-110',
  source: 'crossref',
  cachedAt: Date.now(),
}

describe('detectCitationType', () => {
  describe('DOI detection', () => {
    it('should detect DOI URL format', () => {
      expect(detectCitationType('https://doi.org/10.1234/example')).toBe('doi')
      expect(detectCitationType('http://dx.doi.org/10.1234/example')).toBe('doi')
    })

    it('should detect raw DOI format', () => {
      expect(detectCitationType('10.1234/example.2021')).toBe('doi')
      expect(detectCitationType('doi:10.1234/example')).toBe('doi')
    })
  })

  describe('arXiv detection', () => {
    it('should detect arXiv URL format', () => {
      expect(detectCitationType('https://arxiv.org/abs/2301.00001')).toBe('arxiv')
      expect(detectCitationType('https://arxiv.org/pdf/2301.00001.pdf')).toBe('arxiv')
    })

    it('should detect arXiv ID format', () => {
      expect(detectCitationType('2301.00001')).toBe('arxiv')
      expect(detectCitationType('arxiv:2301.00001')).toBe('arxiv')
    })
  })

  describe('PubMed detection', () => {
    it('should detect PMID format', () => {
      expect(detectCitationType('PMID:12345678')).toBe('pmid')
      expect(detectCitationType('pmid:12345678')).toBe('pmid')
    })
  })

  describe('BibTeX detection', () => {
    it('should detect BibTeX format', () => {
      expect(detectCitationType('@article{key, title={Test}}')).toBe('bibtex')
      expect(detectCitationType('@book{key, title={Test}}')).toBe('bibtex')
      expect(detectCitationType(SAMPLE_BIBTEX)).toBe('bibtex')
    })
  })

  describe('RIS detection', () => {
    it('should detect RIS format', () => {
      expect(detectCitationType('TY  - JOUR\nAU  - Smith\nER  -')).toBe('ris')
      expect(detectCitationType(SAMPLE_RIS)).toBe('ris')
    })
  })

  describe('URL detection', () => {
    it('should detect generic URLs', () => {
      expect(detectCitationType('https://example.com/paper')).toBe('url')
      expect(detectCitationType('http://www.example.org')).toBe('url')
    })
  })

  describe('text fallback', () => {
    it('should fallback to text for unknown formats', () => {
      expect(detectCitationType('Some random text')).toBe('text')
      expect(detectCitationType('Title of a paper by Author')).toBe('text')
    })
  })
})

describe('extractDOI', () => {
  it('should extract DOI from doi.org URL', () => {
    expect(extractDOI('https://doi.org/10.1234/example.2021')).toBe('10.1234/example.2021')
  })

  it('should extract DOI from dx.doi.org URL', () => {
    expect(extractDOI('http://dx.doi.org/10.1038/nature12345')).toBe('10.1038/nature12345')
  })

  it('should extract raw DOI', () => {
    expect(extractDOI('10.1234/example')).toBe('10.1234/example')
  })

  it('should extract DOI with prefix', () => {
    expect(extractDOI('doi:10.1234/example')).toBe('10.1234/example')
  })

  it('should return null for non-DOI input', () => {
    expect(extractDOI('not a doi')).toBe(null)
    expect(extractDOI('https://example.com')).toBe(null)
  })
})

describe('extractArxivId', () => {
  it('should extract arXiv ID from abs URL', () => {
    expect(extractArxivId('https://arxiv.org/abs/2301.00001')).toBe('2301.00001')
  })

  it('should extract arXiv ID from pdf URL', () => {
    expect(extractArxivId('https://arxiv.org/pdf/2301.00001.pdf')).toBe('2301.00001')
  })

  it('should extract arXiv ID with version', () => {
    expect(extractArxivId('https://arxiv.org/abs/2301.00001v2')).toBe('2301.00001v2')
  })

  it('should extract raw arXiv ID', () => {
    expect(extractArxivId('2301.00001')).toBe('2301.00001')
  })

  it('should extract arXiv ID with prefix', () => {
    expect(extractArxivId('arxiv:2301.00001')).toBe('2301.00001')
  })

  it('should return null for non-arXiv input', () => {
    expect(extractArxivId('not an arxiv id')).toBe(null)
    expect(extractArxivId('10.1234/example')).toBe(null)
  })
})

describe('extractPmid', () => {
  it('should extract PMID with prefix', () => {
    expect(extractPmid('PMID:12345678')).toBe('12345678')
    expect(extractPmid('pmid:12345678')).toBe('12345678')
  })

  it('should return null for non-PMID input', () => {
    expect(extractPmid('not a pmid')).toBe(null)
    expect(extractPmid('12345678')).toBe(null) // No prefix
  })
})

describe('parseBibTeX', () => {
  it('should parse valid BibTeX', () => {
    const citations = parseBibTeX(SAMPLE_BIBTEX)

    expect(citations).toHaveLength(1)
    expect(citations[0].title).toBe('An Example Article Title')
    expect(citations[0].year).toBe(2021)
    expect(citations[0].authors).toHaveLength(2)
    expect(citations[0].authors[0].family).toBe('Smith')
    expect(citations[0].doi).toBe('10.1234/example.2021')
  })

  it('should return empty array for invalid BibTeX', () => {
    const citations = parseBibTeX('not valid bibtex')
    expect(citations).toHaveLength(0)
  })

  it('should parse multiple entries', () => {
    const multiBibtex = `
      @article{first, title={First}, author={One, Author}, year={2021}}
      @article{second, title={Second}, author={Two, Author}, year={2022}}
    `
    const citations = parseBibTeX(multiBibtex)
    expect(citations).toHaveLength(2)
  })
})

describe('parseRIS', () => {
  it('should parse valid RIS', () => {
    const citations = parseRIS(SAMPLE_RIS)

    expect(citations).toHaveLength(1)
    expect(citations[0].title).toBe('An Example Article Title')
    expect(citations[0].year).toBe(2021)
    expect(citations[0].authors).toHaveLength(2)
  })

  it('should return empty array for invalid RIS', () => {
    const citations = parseRIS('not valid ris')
    expect(citations).toHaveLength(0)
  })
})

describe('formatCitation', () => {
  it('should format citation in APA style', () => {
    const formatted = formatCitation(mockCitation, 'apa')

    expect(formatted.id).toBe('smith2021test')
    expect(formatted.style).toBe('apa')
    expect(formatted.html).toBeTruthy()
    expect(formatted.text).toBeTruthy()
    expect(formatted.inText).toContain('Smith')
    expect(formatted.inText).toContain('2021')
  })

  it('should generate correct in-text citation for single author', () => {
    const singleAuthor: Citation = {
      ...mockCitation,
      authors: [{ given: 'John', family: 'Smith' }],
    }

    const formatted = formatCitation(singleAuthor, 'apa')
    expect(formatted.inText).toBe('(Smith, 2021)')
  })

  it('should generate correct in-text citation for two authors', () => {
    const formatted = formatCitation(mockCitation, 'apa')
    expect(formatted.inText).toBe('(Smith & Doe, 2021)')
  })

  it('should generate et al. for three or more authors', () => {
    const manyAuthors: Citation = {
      ...mockCitation,
      authors: [
        { given: 'John', family: 'Smith' },
        { given: 'Jane', family: 'Doe' },
        { given: 'Bob', family: 'Johnson' },
      ],
    }

    const formatted = formatCitation(manyAuthors, 'apa')
    expect(formatted.inText).toBe('(Smith et al., 2021)')
  })

  it('should format BibTeX correctly', () => {
    const formatted = formatCitation(mockCitation, 'bibtex')

    expect(formatted.style).toBe('bibtex')
    expect(formatted.bibtex).toBeTruthy()
    expect(formatted.text).toContain('@')
  })
})

describe('toBibTeX', () => {
  it('should convert citation to BibTeX format', () => {
    const bibtex = toBibTeX(mockCitation)

    expect(bibtex).toContain('@')
    // BibTeX wraps capitalized words in braces for preservation
    expect(bibtex).toContain('title')
    expect(bibtex).toContain('Article')
    expect(bibtex).toContain('2021')
    expect(bibtex).toContain('Smith')
  })
})
