/**
 * CrossRef API Integration
 * @module citations/apis/crossref
 *
 * Free DOI resolution and metadata retrieval from CrossRef.
 * No API key required - generous rate limits.
 *
 * @see https://www.crossref.org/documentation/retrieve-metadata/rest-api/
 */

import type { Citation, Author, CitationType, PaperSearchResult } from '../types'

const CROSSREF_API_BASE = 'https://api.crossref.org'

// Polite pool: include email for better rate limits
const CROSSREF_EMAIL = 'codex@frame.dev'

/**
 * CrossRef work item from API
 */
interface CrossRefWork {
  DOI: string
  type: string
  title?: string[]
  author?: Array<{
    given?: string
    family?: string
    sequence?: string
    affiliation?: Array<{ name: string }>
    ORCID?: string
  }>
  issued?: {
    'date-parts'?: Array<[number, number?, number?]>
  }
  published?: {
    'date-parts'?: Array<[number, number?, number?]>
  }
  'container-title'?: string[]
  'short-container-title'?: string[]
  volume?: string
  issue?: string
  page?: string
  publisher?: string
  abstract?: string
  URL?: string
  link?: Array<{
    URL: string
    'content-type': string
    'intended-application': string
  }>
  'is-referenced-by-count'?: number
  'references-count'?: number
  ISBN?: string[]
  ISSN?: string[]
  subject?: string[]
  license?: Array<{
    URL: string
    'content-version': string
  }>
}

/**
 * CrossRef API response
 */
interface CrossRefResponse {
  status: string
  'message-type': string
  message: CrossRefWork | { items: CrossRefWork[]; 'total-results': number }
}

/**
 * Map CrossRef type to our CitationType
 */
function mapCrossRefType(crossRefType: string): CitationType {
  const typeMap: Record<string, CitationType> = {
    'journal-article': 'article-journal',
    'proceedings-article': 'paper-conference',
    'book-chapter': 'chapter',
    book: 'book',
    'edited-book': 'book',
    'reference-book': 'book',
    monograph: 'book',
    report: 'report',
    'report-series': 'report',
    dissertation: 'thesis',
    dataset: 'dataset',
    'posted-content': 'preprint',
    'peer-review': 'article',
    other: 'other',
  }

  return typeMap[crossRefType] || 'article'
}

/**
 * Convert CrossRef work to Citation
 */
function crossRefToCitation(work: CrossRefWork): Citation {
  // Extract year
  const dateParts = work.issued?.['date-parts']?.[0] || work.published?.['date-parts']?.[0]
  const year = dateParts?.[0] || new Date().getFullYear()
  const month = dateParts?.[1]

  // Convert authors
  const authors: Author[] = (work.author || []).map((a) => ({
    given: a.given,
    family: a.family || 'Unknown',
    orcid: a.ORCID?.replace('http://orcid.org/', ''),
    affiliation: a.affiliation?.[0]?.name,
    sequence: a.sequence as 'first' | 'additional' | undefined,
  }))

  // Find PDF link if available
  const pdfLink = work.link?.find(
    (l) =>
      l['content-type'] === 'application/pdf' ||
      l['intended-application'] === 'text-mining'
  )

  // Check for open access license
  const isOpenAccess = work.license?.some((l) =>
    l.URL.includes('creativecommons.org')
  )

  return {
    id: work.DOI,
    type: mapCrossRefType(work.type),
    title: work.title?.[0] || 'Untitled',
    authors,
    year,
    month,
    doi: work.DOI,
    url: work.URL || `https://doi.org/${work.DOI}`,
    pdfUrl: pdfLink?.URL,
    abstract: cleanAbstract(work.abstract),
    venue: work['container-title']?.[0],
    venueShort: work['short-container-title']?.[0],
    volume: work.volume,
    issue: work.issue,
    pages: work.page,
    publisher: work.publisher,
    isbn: work.ISBN?.[0],
    issn: work.ISSN?.[0],
    citationCount: work['is-referenced-by-count'],
    referenceCount: work['references-count'],
    isOpenAccess,
    keywords: work.subject,
    source: 'crossref',
    cachedAt: Date.now(),
    raw: work,
  }
}

/**
 * Clean abstract text (remove JATS/HTML tags)
 */
function cleanAbstract(abstract?: string): string | undefined {
  if (!abstract) return undefined

  return abstract
    .replace(/<[^>]+>/g, '') // Remove HTML tags
    .replace(/\s+/g, ' ')     // Normalize whitespace
    .trim()
}

/**
 * Resolve a DOI to full citation data
 *
 * @example
 * const citation = await resolveDOI('10.1038/nature12373')
 */
export async function resolveDOI(doi: string): Promise<Citation | null> {
  // Normalize DOI (remove URL prefix if present)
  const normalizedDOI = doi
    .replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, '')
    .trim()

  try {
    const url = new URL(`${CROSSREF_API_BASE}/works/${encodeURIComponent(normalizedDOI)}`)
    url.searchParams.set('mailto', CROSSREF_EMAIL)

    const response = await fetch(url.toString(), {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Quarry-Codex/1.0 (mailto:codex@frame.dev)',
      },
    })

    if (!response.ok) {
      if (response.status === 404) {
        console.warn(`[crossref] DOI not found: ${normalizedDOI}`)
        return null
      }
      throw new Error(`CrossRef API error: ${response.status}`)
    }

    const data: CrossRefResponse = await response.json()

    if (data.status !== 'ok') {
      console.error('[crossref] API returned non-ok status:', data)
      return null
    }

    const work = data.message as CrossRefWork
    return crossRefToCitation(work)
  } catch (error) {
    console.error('[crossref] Error resolving DOI:', error)
    throw error
  }
}

/**
 * Search CrossRef for papers
 *
 * @example
 * const results = await searchWorks('attention is all you need', { rows: 10 })
 */
export async function searchWorks(
  query: string,
  options: {
    rows?: number
    offset?: number
    filter?: {
      type?: string
      fromPubDate?: string
      untilPubDate?: string
    }
    sort?: 'relevance' | 'published' | 'cited'
  } = {}
): Promise<PaperSearchResult> {
  const { rows = 10, offset = 0, filter, sort = 'relevance' } = options

  try {
    const url = new URL(`${CROSSREF_API_BASE}/works`)
    url.searchParams.set('query', query)
    url.searchParams.set('rows', rows.toString())
    url.searchParams.set('offset', offset.toString())
    url.searchParams.set('mailto', CROSSREF_EMAIL)

    // Add sorting
    if (sort === 'published') {
      url.searchParams.set('sort', 'published')
      url.searchParams.set('order', 'desc')
    } else if (sort === 'cited') {
      url.searchParams.set('sort', 'is-referenced-by-count')
      url.searchParams.set('order', 'desc')
    }

    // Add filters
    const filters: string[] = []
    if (filter?.type) {
      filters.push(`type:${filter.type}`)
    }
    if (filter?.fromPubDate) {
      filters.push(`from-pub-date:${filter.fromPubDate}`)
    }
    if (filter?.untilPubDate) {
      filters.push(`until-pub-date:${filter.untilPubDate}`)
    }
    if (filters.length > 0) {
      url.searchParams.set('filter', filters.join(','))
    }

    const response = await fetch(url.toString(), {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Quarry-Codex/1.0 (mailto:codex@frame.dev)',
      },
    })

    if (!response.ok) {
      throw new Error(`CrossRef search error: ${response.status}`)
    }

    const data: CrossRefResponse = await response.json()
    const message = data.message as { items: CrossRefWork[]; 'total-results': number }

    return {
      total: message['total-results'],
      page: Math.floor(offset / rows) + 1,
      perPage: rows,
      results: message.items.map(crossRefToCitation),
      query,
      source: 'crossref',
    }
  } catch (error) {
    console.error('[crossref] Search error:', error)
    throw error
  }
}

/**
 * Get works by author (using ORCID)
 */
export async function getAuthorWorks(
  orcid: string,
  options: { rows?: number; offset?: number } = {}
): Promise<PaperSearchResult> {
  const { rows = 20, offset = 0 } = options

  // Normalize ORCID
  const normalizedOrcid = orcid
    .replace(/^https?:\/\/orcid\.org\//i, '')
    .trim()

  try {
    const url = new URL(`${CROSSREF_API_BASE}/works`)
    url.searchParams.set('filter', `orcid:${normalizedOrcid}`)
    url.searchParams.set('rows', rows.toString())
    url.searchParams.set('offset', offset.toString())
    url.searchParams.set('sort', 'published')
    url.searchParams.set('order', 'desc')
    url.searchParams.set('mailto', CROSSREF_EMAIL)

    const response = await fetch(url.toString(), {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Quarry-Codex/1.0 (mailto:codex@frame.dev)',
      },
    })

    if (!response.ok) {
      throw new Error(`CrossRef author works error: ${response.status}`)
    }

    const data: CrossRefResponse = await response.json()
    const message = data.message as { items: CrossRefWork[]; 'total-results': number }

    return {
      total: message['total-results'],
      page: Math.floor(offset / rows) + 1,
      perPage: rows,
      results: message.items.map(crossRefToCitation),
      query: `orcid:${normalizedOrcid}`,
      source: 'crossref',
    }
  } catch (error) {
    console.error('[crossref] Author works error:', error)
    throw error
  }
}
