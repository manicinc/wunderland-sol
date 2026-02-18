/**
 * Citation Parser - citation-js wrapper
 * @module citations/parser
 *
 * Provides offline-capable citation parsing and formatting.
 * Uses citation-js for BibTeX/RIS parsing and CSL formatting.
 */

import Cite from 'citation-js'
import '@citation-js/plugin-csl'
import type {
  Citation,
  CitationType,
  CitationInputType,
  CitationStyle,
  FormattedCitation,
  Author,
} from './types'
import { CITATION_PATTERNS } from './types'

// Re-export patterns for convenience
export { CITATION_PATTERNS }

/**
 * Detect the type of citation input
 */
export function detectCitationType(input: string): CitationInputType {
  const trimmed = input.trim()

  // Check for BibTeX format
  if (CITATION_PATTERNS.bibtex.test(trimmed)) {
    return 'bibtex'
  }

  // Check for RIS format
  if (CITATION_PATTERNS.ris.test(trimmed)) {
    return 'ris'
  }

  // Check for DOI URL
  const doiUrlMatch = trimmed.match(CITATION_PATTERNS.doiUrl)
  if (doiUrlMatch) {
    return 'doi'
  }

  // Check for arXiv URL
  const arxivUrlMatch = trimmed.match(CITATION_PATTERNS.arxivUrl)
  if (arxivUrlMatch) {
    return 'arxiv'
  }

  // Check for DOI pattern
  if (CITATION_PATTERNS.doi.test(trimmed)) {
    return 'doi'
  }

  // Check for arXiv pattern
  if (CITATION_PATTERNS.arxiv.test(trimmed)) {
    return 'arxiv'
  }

  // Check for PubMed ID
  if (CITATION_PATTERNS.pmid.test(trimmed)) {
    return 'pmid'
  }

  // Check if it's a URL
  if (/^https?:\/\//i.test(trimmed)) {
    return 'url'
  }

  // Default to raw text
  return 'text'
}

/**
 * Extract DOI from various formats
 */
export function extractDOI(input: string): string | null {
  // Try DOI URL first
  const doiUrlMatch = input.match(CITATION_PATTERNS.doiUrl)
  if (doiUrlMatch) {
    return doiUrlMatch[1]
  }

  // Try raw DOI pattern
  const doiMatch = input.match(CITATION_PATTERNS.doi)
  if (doiMatch) {
    return doiMatch[1]
  }

  return null
}

/**
 * Extract arXiv ID from various formats
 */
export function extractArxivId(input: string): string | null {
  // Try arXiv URL first
  const arxivUrlMatch = input.match(CITATION_PATTERNS.arxivUrl)
  if (arxivUrlMatch) {
    return arxivUrlMatch[1]
  }

  // Try arxiv: prefix or raw ID
  const arxivMatch = input.match(CITATION_PATTERNS.arxiv)
  if (arxivMatch) {
    return arxivMatch[1]
  }

  return null
}

/**
 * Extract PubMed ID
 */
export function extractPmid(input: string): string | null {
  const match = input.match(CITATION_PATTERNS.pmid)
  return match ? match[1] : null
}

/**
 * Parse BibTeX string to Citation objects
 * Works offline using citation-js
 */
export function parseBibTeX(bibtex: string): Citation[] {
  try {
    const cite = new Cite(bibtex)
    const data = cite.data as CSLItem[]

    return data.map(cslToCitation)
  } catch (error) {
    console.error('[citations/parser] BibTeX parse error:', error)
    return []
  }
}

/**
 * Parse RIS string to Citation objects
 * Works offline using citation-js
 */
export function parseRIS(ris: string): Citation[] {
  try {
    const cite = new Cite(ris)
    const data = cite.data as CSLItem[]

    return data.map(cslToCitation)
  } catch (error) {
    console.error('[citations/parser] RIS parse error:', error)
    return []
  }
}

/**
 * CSL-JSON item type (from citation-js)
 */
interface CSLItem {
  id?: string
  type?: string
  title?: string
  author?: Array<{
    given?: string
    family?: string
    literal?: string
  }>
  issued?: {
    'date-parts'?: Array<[number, number?, number?]>
    literal?: string
  }
  DOI?: string
  URL?: string
  abstract?: string
  'container-title'?: string
  'container-title-short'?: string
  volume?: string
  issue?: string
  page?: string
  publisher?: string
  ISBN?: string
  ISSN?: string
  keyword?: string
}

/**
 * Convert CSL-JSON item to our Citation type
 */
function cslToCitation(csl: CSLItem): Citation {
  // Extract year from issued date
  let year = new Date().getFullYear()
  let month: number | undefined

  if (csl.issued?.['date-parts']?.[0]) {
    const [y, m] = csl.issued['date-parts'][0]
    year = y
    month = m
  }

  // Convert authors
  const authors: Author[] = (csl.author || []).map((a) => ({
    given: a.given,
    family: a.family || a.literal || 'Unknown',
  }))

  // Map CSL type to our type
  const typeMap: Record<string, CitationType> = {
    'article-journal': 'article-journal',
    article: 'article',
    book: 'book',
    chapter: 'chapter',
    'paper-conference': 'paper-conference',
    thesis: 'thesis',
    report: 'report',
    dataset: 'dataset',
    software: 'software',
    webpage: 'webpage',
  }

  return {
    id: csl.DOI || csl.id || generateCitationId(authors, year),
    type: typeMap[csl.type || ''] || 'article',
    title: csl.title || 'Untitled',
    authors,
    year,
    month,
    doi: csl.DOI,
    url: csl.URL,
    abstract: csl.abstract,
    venue: csl['container-title'],
    venueShort: csl['container-title-short'],
    volume: csl.volume,
    issue: csl.issue,
    pages: csl.page,
    publisher: csl.publisher,
    isbn: csl.ISBN,
    issn: csl.ISSN,
    keywords: csl.keyword?.split(/[,;]\s*/) || [],
    source: 'bibtex-import',
    cachedAt: Date.now(),
    raw: csl,
  }
}

/**
 * Generate a citation ID from authors and year
 */
function generateCitationId(authors: Author[], year: number): string {
  const firstAuthor = authors[0]?.family?.toLowerCase().replace(/\s+/g, '') || 'unknown'
  const suffix = Math.random().toString(36).slice(2, 6)
  return `${firstAuthor}${year}-${suffix}`
}

/**
 * Convert Citation to CSL-JSON for formatting
 */
function citationToCSL(citation: Citation): CSLItem {
  return {
    id: citation.id,
    type: citation.type === 'article' ? 'article-journal' : citation.type,
    title: citation.title,
    author: citation.authors.map((a) => ({
      given: a.given,
      family: a.family,
    })),
    issued: {
      'date-parts': [[citation.year, citation.month || 1]],
    },
    DOI: citation.doi,
    URL: citation.url,
    abstract: citation.abstract,
    'container-title': citation.venue,
    'container-title-short': citation.venueShort,
    volume: citation.volume,
    issue: citation.issue,
    page: citation.pages,
    publisher: citation.publisher,
    ISBN: citation.isbn,
    ISSN: citation.issn,
    keyword: citation.keywords?.join(', '),
  }
}

/**
 * CSL style templates
 */
const CSL_TEMPLATES: Record<CitationStyle, string> = {
  apa: 'apa',
  mla: 'modern-language-association',
  chicago: 'chicago-author-date',
  harvard: 'harvard-cite-them-right',
  ieee: 'ieee',
  vancouver: 'vancouver',
  bibtex: 'bibtex', // Special handling
}

/**
 * Format a citation in a specific style
 * Works offline using citation-js CSL plugin
 */
export function formatCitation(
  citation: Citation,
  style: CitationStyle = 'apa'
): FormattedCitation {
  try {
    const csl = citationToCSL(citation)
    const cite = new Cite([csl])

    // For BibTeX, use special format
    if (style === 'bibtex') {
      const bibtex = cite.format('bibtex')
      return {
        id: citation.id,
        style,
        html: `<pre><code>${escapeHtml(bibtex)}</code></pre>`,
        text: bibtex,
        inText: generateCiteKey(citation),
        bibtex,
      }
    }

    // Get CSL template name
    const template = CSL_TEMPLATES[style] || 'apa'

    // Format bibliography entry
    const html = cite.format('bibliography', {
      format: 'html',
      template,
      lang: 'en-US',
    })

    const text = cite.format('bibliography', {
      format: 'text',
      template,
      lang: 'en-US',
    })

    // Generate in-text citation
    const inText = generateInTextCitation(citation, style)

    return {
      id: citation.id,
      style,
      html: html.trim(),
      text: text.trim(),
      inText,
    }
  } catch (error) {
    console.error('[citations/parser] Format error:', error)

    // Fallback to basic formatting
    return {
      id: citation.id,
      style,
      html: generateFallbackHtml(citation),
      text: generateFallbackText(citation),
      inText: `(${citation.authors[0]?.family || 'Author'}, ${citation.year})`,
    }
  }
}

/**
 * Format multiple citations as a bibliography
 */
export function formatBibliography(
  citations: Citation[],
  style: CitationStyle = 'apa'
): string {
  try {
    const cslItems = citations.map(citationToCSL)
    const cite = new Cite(cslItems)

    if (style === 'bibtex') {
      return cite.format('bibtex')
    }

    const template = CSL_TEMPLATES[style] || 'apa'

    return cite.format('bibliography', {
      format: 'html',
      template,
      lang: 'en-US',
    })
  } catch (error) {
    console.error('[citations/parser] Bibliography format error:', error)
    return citations.map((c) => formatCitation(c, style).html).join('\n')
  }
}

/**
 * Generate in-text citation
 */
function generateInTextCitation(citation: Citation, style: CitationStyle): string {
  const firstAuthor = citation.authors[0]?.family || 'Author'
  const year = citation.year

  switch (style) {
    case 'apa':
    case 'harvard':
      if (citation.authors.length === 1) {
        return `(${firstAuthor}, ${year})`
      } else if (citation.authors.length === 2) {
        return `(${firstAuthor} & ${citation.authors[1].family}, ${year})`
      } else {
        return `(${firstAuthor} et al., ${year})`
      }

    case 'mla':
      if (citation.authors.length === 1) {
        return `(${firstAuthor})`
      } else if (citation.authors.length === 2) {
        return `(${firstAuthor} and ${citation.authors[1].family})`
      } else {
        return `(${firstAuthor} et al.)`
      }

    case 'chicago':
      return `(${firstAuthor} ${year})`

    case 'ieee':
    case 'vancouver':
      return '[1]' // Numbered style

    default:
      return `(${firstAuthor}, ${year})`
  }
}

/**
 * Generate BibTeX cite key
 */
function generateCiteKey(citation: Citation): string {
  const firstAuthor = citation.authors[0]?.family?.toLowerCase().replace(/\s+/g, '') || 'unknown'
  return `${firstAuthor}${citation.year}`
}

/**
 * Escape HTML characters
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/**
 * Fallback HTML formatting when CSL fails
 */
function generateFallbackHtml(citation: Citation): string {
  const authors = citation.authors
    .map((a) => `${a.family}, ${a.given?.charAt(0) || ''}.`)
    .join(', ')

  let html = `${authors} (${citation.year}). <em>${citation.title}</em>.`

  if (citation.venue) {
    html += ` <em>${citation.venue}</em>`
    if (citation.volume) html += `, ${citation.volume}`
    if (citation.issue) html += `(${citation.issue})`
    if (citation.pages) html += `, ${citation.pages}`
    html += '.'
  }

  if (citation.doi) {
    html += ` <a href="https://doi.org/${citation.doi}">https://doi.org/${citation.doi}</a>`
  }

  return html
}

/**
 * Fallback text formatting when CSL fails
 */
function generateFallbackText(citation: Citation): string {
  const authors = citation.authors
    .map((a) => `${a.family}, ${a.given?.charAt(0) || ''}.`)
    .join(', ')

  let text = `${authors} (${citation.year}). ${citation.title}.`

  if (citation.venue) {
    text += ` ${citation.venue}`
    if (citation.volume) text += `, ${citation.volume}`
    if (citation.issue) text += `(${citation.issue})`
    if (citation.pages) text += `, ${citation.pages}`
    text += '.'
  }

  if (citation.doi) {
    text += ` https://doi.org/${citation.doi}`
  }

  return text
}

/**
 * Export citation as BibTeX
 */
export function toBibTeX(citation: Citation): string {
  const csl = citationToCSL(citation)
  const cite = new Cite([csl])
  return cite.format('bibtex')
}

/**
 * Export citations as BibTeX file content
 */
export function toBibTeXFile(citations: Citation[]): string {
  const cslItems = citations.map(citationToCSL)
  const cite = new Cite(cslItems)
  return cite.format('bibtex')
}
