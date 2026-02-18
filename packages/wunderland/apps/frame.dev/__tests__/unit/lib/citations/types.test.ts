/**
 * Citations Types Tests
 * @module __tests__/unit/lib/citations/types.test
 *
 * Tests for citation type constants and patterns.
 */

import { describe, it, expect } from 'vitest'
import {
  CITATION_PATTERNS,
  DEFAULT_CITATION_STYLE,
  CITATION_CACHE_DURATION,
} from '@/lib/citations/types'

// ============================================================================
// CITATION_PATTERNS
// ============================================================================

describe('CITATION_PATTERNS', () => {
  describe('doi pattern', () => {
    it('matches standard DOI', () => {
      const doi = '10.1038/nature12373'
      expect(CITATION_PATTERNS.doi.test(doi)).toBe(true)
    })

    it('matches DOI with complex suffix', () => {
      const doi = '10.1000/xyz123'
      expect(CITATION_PATTERNS.doi.test(doi)).toBe(true)
    })

    it('matches DOI with multiple dots', () => {
      const doi = '10.1234.5678/abc.def.123'
      expect(CITATION_PATTERNS.doi.test(doi)).toBe(true)
    })

    it('matches DOI with slashes in suffix', () => {
      const doi = '10.1016/j.cell.2020.01.001'
      expect(CITATION_PATTERNS.doi.test(doi)).toBe(true)
    })

    it('does not match non-DOI text', () => {
      expect(CITATION_PATTERNS.doi.test('hello world')).toBe(false)
      expect(CITATION_PATTERNS.doi.test('11.1234/test')).toBe(false) // wrong prefix
    })

    it('extracts DOI from text', () => {
      const text = 'See the paper at 10.1038/nature12373 for details'
      const match = text.match(CITATION_PATTERNS.doi)
      expect(match).not.toBeNull()
      expect(match?.[1]).toBe('10.1038/nature12373')
    })
  })

  describe('arxiv pattern', () => {
    it('matches arxiv ID with prefix', () => {
      expect(CITATION_PATTERNS.arxiv.test('arxiv:2301.12345')).toBe(true)
      expect(CITATION_PATTERNS.arxiv.test('arXiv:2301.12345')).toBe(true)
    })

    it('matches arxiv ID without prefix', () => {
      expect(CITATION_PATTERNS.arxiv.test('2301.12345')).toBe(true)
    })

    it('matches arxiv ID with version', () => {
      expect(CITATION_PATTERNS.arxiv.test('2301.12345v2')).toBe(true)
      expect(CITATION_PATTERNS.arxiv.test('arxiv:2301.12345v3')).toBe(true)
    })

    it('matches 5-digit suffix', () => {
      expect(CITATION_PATTERNS.arxiv.test('2301.12345')).toBe(true)
    })

    it('does not match invalid format', () => {
      expect(CITATION_PATTERNS.arxiv.test('230.12345')).toBe(false) // wrong month format
      expect(CITATION_PATTERNS.arxiv.test('2301.123')).toBe(false) // suffix too short
    })

    it('extracts arxiv ID from text', () => {
      const text = 'Check out arxiv:2301.12345v2 for the preprint'
      const match = text.match(CITATION_PATTERNS.arxiv)
      expect(match).not.toBeNull()
      expect(match?.[1]).toBe('2301.12345v2')
    })
  })

  describe('arxivUrl pattern', () => {
    it('matches abs URL', () => {
      const url = 'https://arxiv.org/abs/2301.12345'
      expect(CITATION_PATTERNS.arxivUrl.test(url)).toBe(true)
    })

    it('matches pdf URL', () => {
      const url = 'https://arxiv.org/pdf/2301.12345'
      expect(CITATION_PATTERNS.arxivUrl.test(url)).toBe(true)
    })

    it('matches URL with version', () => {
      const url = 'https://arxiv.org/abs/2301.12345v3'
      expect(CITATION_PATTERNS.arxivUrl.test(url)).toBe(true)
    })

    it('extracts ID from URL', () => {
      const url = 'https://arxiv.org/abs/2301.12345'
      const match = url.match(CITATION_PATTERNS.arxivUrl)
      expect(match?.[1]).toBe('2301.12345')
    })
  })

  describe('doiUrl pattern', () => {
    it('matches doi.org URL', () => {
      const url = 'https://doi.org/10.1038/nature12373'
      expect(CITATION_PATTERNS.doiUrl.test(url)).toBe(true)
    })

    it('matches dx.doi.org URL', () => {
      const url = 'https://dx.doi.org/10.1038/nature12373'
      expect(CITATION_PATTERNS.doiUrl.test(url)).toBe(true)
    })

    it('extracts DOI from URL', () => {
      const url = 'https://doi.org/10.1038/nature12373'
      const match = url.match(CITATION_PATTERNS.doiUrl)
      expect(match?.[1]).toBe('10.1038/nature12373')
    })
  })

  describe('pmid pattern', () => {
    it('matches PMID with prefix', () => {
      expect(CITATION_PATTERNS.pmid.test('PMID: 12345678')).toBe(true)
      expect(CITATION_PATTERNS.pmid.test('PMID:12345678')).toBe(true)
    })

    it('extracts PMID number', () => {
      const text = 'See PMID: 12345678 for reference'
      const match = text.match(CITATION_PATTERNS.pmid)
      expect(match?.[1]).toBe('12345678')
    })

    it('case insensitive', () => {
      expect(CITATION_PATTERNS.pmid.test('pmid:12345')).toBe(true)
      expect(CITATION_PATTERNS.pmid.test('Pmid: 12345')).toBe(true)
    })
  })

  describe('bibtex pattern', () => {
    it('matches bibtex entry start', () => {
      const bibtex = '@article{smith2023,'
      expect(CITATION_PATTERNS.bibtex.test(bibtex)).toBe(true)
    })

    it('matches various entry types', () => {
      expect(CITATION_PATTERNS.bibtex.test('@book{doe2022,')).toBe(true)
      expect(CITATION_PATTERNS.bibtex.test('@inproceedings{conference2021,')).toBe(true)
      expect(CITATION_PATTERNS.bibtex.test('@misc{misc2020,')).toBe(true)
    })

    it('does not match partial bibtex', () => {
      expect(CITATION_PATTERNS.bibtex.test('@article')).toBe(false)
      expect(CITATION_PATTERNS.bibtex.test('@article{}')).toBe(false)
    })
  })

  describe('ris pattern', () => {
    it('matches RIS type line', () => {
      const ris = 'TY  - JOUR'
      expect(CITATION_PATTERNS.ris.test(ris)).toBe(true)
    })

    it('matches various RIS types', () => {
      expect(CITATION_PATTERNS.ris.test('TY  - BOOK')).toBe(true)
      expect(CITATION_PATTERNS.ris.test('TY  - CONF')).toBe(true)
      expect(CITATION_PATTERNS.ris.test('TY  - THES')).toBe(true)
    })

    it('does not match non-RIS text', () => {
      expect(CITATION_PATTERNS.ris.test('TYPE - JOUR')).toBe(false)
      expect(CITATION_PATTERNS.ris.test('XY  - JOUR')).toBe(false) // wrong tag
    })

    it('matches flexible spacing', () => {
      // Pattern uses \s+ so matches 1 or more spaces
      expect(CITATION_PATTERNS.ris.test('TY - JOUR')).toBe(true) // single space ok
      expect(CITATION_PATTERNS.ris.test('TY   -   JOUR')).toBe(true) // extra spaces ok
    })
  })

  describe('pattern completeness', () => {
    it('has all 7 patterns', () => {
      const patternKeys = Object.keys(CITATION_PATTERNS)
      expect(patternKeys).toContain('doi')
      expect(patternKeys).toContain('arxiv')
      expect(patternKeys).toContain('arxivUrl')
      expect(patternKeys).toContain('doiUrl')
      expect(patternKeys).toContain('pmid')
      expect(patternKeys).toContain('bibtex')
      expect(patternKeys).toContain('ris')
      expect(patternKeys).toHaveLength(7)
    })

    it('all patterns are RegExp instances', () => {
      for (const pattern of Object.values(CITATION_PATTERNS)) {
        expect(pattern).toBeInstanceOf(RegExp)
      }
    })
  })
})

// ============================================================================
// DEFAULT_CITATION_STYLE
// ============================================================================

describe('DEFAULT_CITATION_STYLE', () => {
  it('is set to apa', () => {
    expect(DEFAULT_CITATION_STYLE).toBe('apa')
  })

  it('is a string', () => {
    expect(typeof DEFAULT_CITATION_STYLE).toBe('string')
  })
})

// ============================================================================
// CITATION_CACHE_DURATION
// ============================================================================

describe('CITATION_CACHE_DURATION', () => {
  it('is 30 days in milliseconds', () => {
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000
    expect(CITATION_CACHE_DURATION).toBe(thirtyDaysMs)
  })

  it('is a positive number', () => {
    expect(CITATION_CACHE_DURATION).toBeGreaterThan(0)
  })

  it('is at least 24 hours', () => {
    const oneDayMs = 24 * 60 * 60 * 1000
    expect(CITATION_CACHE_DURATION).toBeGreaterThanOrEqual(oneDayMs)
  })

  it('equals 2592000000 milliseconds', () => {
    expect(CITATION_CACHE_DURATION).toBe(2592000000)
  })
})

// ============================================================================
// Integration Tests
// ============================================================================

describe('citation patterns integration', () => {
  it('can detect DOI in mixed text', () => {
    const text = `
      This paper (10.1038/nature12373) explores quantum computing.
      See also arxiv:2301.12345 for related work.
    `

    expect(CITATION_PATTERNS.doi.test(text)).toBe(true)
    expect(CITATION_PATTERNS.arxiv.test(text)).toBe(true)
  })

  it('DOI and DOI URL patterns are consistent', () => {
    const doi = '10.1038/nature12373'
    const url = `https://doi.org/${doi}`

    const directMatch = doi.match(CITATION_PATTERNS.doi)
    const urlMatch = url.match(CITATION_PATTERNS.doiUrl)

    expect(directMatch?.[1]).toBe(doi)
    expect(urlMatch?.[1]).toBe(doi)
  })

  it('arxiv and arxiv URL patterns are consistent', () => {
    const arxivId = '2301.12345'
    const url = `https://arxiv.org/abs/${arxivId}`

    const directMatch = arxivId.match(CITATION_PATTERNS.arxiv)
    const urlMatch = url.match(CITATION_PATTERNS.arxivUrl)

    expect(directMatch?.[1]).toBe(arxivId)
    expect(urlMatch?.[1]).toBe(arxivId)
  })

  it('bibtex and ris patterns do not overlap', () => {
    const bibtex = '@article{test2023, author={Test}}'
    const ris = 'TY  - JOUR\nAU  - Test'

    expect(CITATION_PATTERNS.bibtex.test(bibtex)).toBe(true)
    expect(CITATION_PATTERNS.ris.test(bibtex)).toBe(false)

    expect(CITATION_PATTERNS.ris.test(ris)).toBe(true)
    expect(CITATION_PATTERNS.bibtex.test(ris)).toBe(false)
  })
})

// ============================================================================
// Pattern Usage Examples
// ============================================================================

describe('citation pattern usage examples', () => {
  describe('extracting citation identifiers', () => {
    it('extracts all DOIs from text', () => {
      const text = `
        References:
        1. 10.1038/nature12373
        2. 10.1016/j.cell.2020.01.001
        3. 10.1126/science.1234567
      `
      const matches = text.match(new RegExp(CITATION_PATTERNS.doi, 'gi'))
      expect(matches).toHaveLength(3)
    })

    it('validates DOI before API call', () => {
      const possibleDoi = '10.1038/nature12373'
      const isValidDoi = CITATION_PATTERNS.doi.test(possibleDoi)
      expect(isValidDoi).toBe(true)
    })

    it('validates arxiv ID before API call', () => {
      const possibleArxiv = '2301.12345v2'
      const isValidArxiv = CITATION_PATTERNS.arxiv.test(possibleArxiv)
      expect(isValidArxiv).toBe(true)
    })
  })

  describe('detecting citation format', () => {
    const detectFormat = (input: string): string => {
      if (CITATION_PATTERNS.bibtex.test(input)) return 'bibtex'
      if (CITATION_PATTERNS.ris.test(input)) return 'ris'
      if (CITATION_PATTERNS.doi.test(input)) return 'doi'
      if (CITATION_PATTERNS.arxiv.test(input)) return 'arxiv'
      if (CITATION_PATTERNS.pmid.test(input)) return 'pmid'
      return 'unknown'
    }

    it('detects bibtex format', () => {
      expect(detectFormat('@article{smith2023,')).toBe('bibtex')
    })

    it('detects ris format', () => {
      expect(detectFormat('TY  - JOUR\nAU  - Smith')).toBe('ris')
    })

    it('detects doi format', () => {
      expect(detectFormat('10.1038/nature12373')).toBe('doi')
    })

    it('detects arxiv format', () => {
      expect(detectFormat('arxiv:2301.12345')).toBe('arxiv')
    })

    it('detects pmid format', () => {
      expect(detectFormat('PMID: 12345678')).toBe('pmid')
    })

    it('returns unknown for unrecognized format', () => {
      expect(detectFormat('This is just plain text')).toBe('unknown')
    })
  })
})
