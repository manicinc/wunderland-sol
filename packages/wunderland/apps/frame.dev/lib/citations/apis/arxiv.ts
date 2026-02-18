/**
 * arXiv API Integration
 * @module citations/apis/arxiv
 *
 * Free access to 2.4M+ papers in physics, math, CS, biology, etc.
 * No API key required.
 *
 * @see https://info.arxiv.org/help/api/index.html
 */

import type { Citation, Author, PaperSearchResult } from '../types'

const ARXIV_API_BASE = 'https://export.arxiv.org/api/query'

/**
 * arXiv category mapping to human-readable names
 */
const ARXIV_CATEGORIES: Record<string, string> = {
  'cs.AI': 'Artificial Intelligence',
  'cs.CL': 'Computation and Language',
  'cs.CV': 'Computer Vision',
  'cs.LG': 'Machine Learning',
  'cs.NE': 'Neural and Evolutionary Computing',
  'cs.RO': 'Robotics',
  'cs.SE': 'Software Engineering',
  'stat.ML': 'Machine Learning (Statistics)',
  'math.NA': 'Numerical Analysis',
  'physics.comp-ph': 'Computational Physics',
  'q-bio': 'Quantitative Biology',
  'q-fin': 'Quantitative Finance',
  'eess': 'Electrical Engineering',
}

/**
 * Parse arXiv Atom XML response
 */
function parseArxivXML(xml: string): ArxivEntry[] {
  const entries: ArxivEntry[] = []

  // Simple XML parsing without external dependencies
  const entryMatches = xml.match(/<entry>[\s\S]*?<\/entry>/g) || []

  for (const entryXml of entryMatches) {
    const entry = parseEntry(entryXml)
    if (entry) {
      entries.push(entry)
    }
  }

  return entries
}

interface ArxivEntry {
  id: string
  arxivId: string
  title: string
  abstract: string
  authors: Array<{ name: string; affiliation?: string }>
  published: string
  updated: string
  categories: string[]
  primaryCategory: string
  doi?: string
  pdfUrl: string
  comment?: string
  journalRef?: string
}

/**
 * Parse a single arXiv entry
 */
function parseEntry(xml: string): ArxivEntry | null {
  const getText = (tag: string): string => {
    const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`))
    return match ? decodeXMLEntities(match[1].trim()) : ''
  }

  const getAttr = (tag: string, attr: string): string => {
    const match = xml.match(new RegExp(`<${tag}[^>]*${attr}="([^"]*)"[^>]*>`))
    return match ? match[1] : ''
  }

  const id = getText('id')
  if (!id) return null

  // Extract arXiv ID from full URL
  const arxivIdMatch = id.match(/arxiv\.org\/abs\/(.+)$/)
  const arxivId = arxivIdMatch ? arxivIdMatch[1] : id

  // Extract authors
  const authorMatches = xml.match(/<author>[\s\S]*?<\/author>/g) || []
  const authors = authorMatches.map((authorXml) => {
    const nameMatch = authorXml.match(/<name>([^<]+)<\/name>/)
    const affMatch = authorXml.match(/<arxiv:affiliation>([^<]+)<\/arxiv:affiliation>/)
    return {
      name: nameMatch ? decodeXMLEntities(nameMatch[1]) : 'Unknown',
      affiliation: affMatch ? decodeXMLEntities(affMatch[1]) : undefined,
    }
  })

  // Extract categories
  const categoryMatches = xml.match(/<category[^>]*term="([^"]+)"[^>]*>/g) || []
  const categories = categoryMatches.map((c) => {
    const match = c.match(/term="([^"]+)"/)
    return match ? match[1] : ''
  }).filter(Boolean)

  // Get primary category
  const primaryCategory = getAttr('arxiv:primary_category', 'term') || categories[0] || ''

  // Get PDF link
  const pdfLinkMatch = xml.match(/<link[^>]*href="([^"]*)"[^>]*title="pdf"[^>]*>/)
  const pdfUrl = pdfLinkMatch ? pdfLinkMatch[1] : `https://arxiv.org/pdf/${arxivId}.pdf`

  // Get DOI if available
  const doiMatch = xml.match(/<arxiv:doi>([^<]+)<\/arxiv:doi>/)
  const doi = doiMatch ? doiMatch[1] : undefined

  return {
    id,
    arxivId,
    title: getText('title').replace(/\s+/g, ' '),
    abstract: getText('summary').replace(/\s+/g, ' '),
    authors,
    published: getText('published'),
    updated: getText('updated'),
    categories,
    primaryCategory,
    doi,
    pdfUrl,
    comment: getText('arxiv:comment') || undefined,
    journalRef: getText('arxiv:journal_ref') || undefined,
  }
}

/**
 * Decode XML entities
 */
function decodeXMLEntities(text: string): string {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num, 10)))
}

/**
 * Convert arXiv entry to Citation
 */
function arxivToCitation(entry: ArxivEntry): Citation {
  // Parse date
  const pubDate = new Date(entry.published)
  const year = pubDate.getFullYear()
  const month = pubDate.getMonth() + 1

  // Parse authors (split "First Last" into given/family)
  const authors: Author[] = entry.authors.map((a) => {
    const parts = a.name.trim().split(/\s+/)
    const family = parts.pop() || 'Unknown'
    const given = parts.join(' ') || undefined
    return {
      given,
      family,
      affiliation: a.affiliation,
    }
  })

  // Determine venue from journal ref or category
  const venue = entry.journalRef || ARXIV_CATEGORIES[entry.primaryCategory] || 'arXiv'

  return {
    id: `arxiv:${entry.arxivId}`,
    type: 'preprint',
    title: entry.title,
    authors,
    year,
    month,
    doi: entry.doi,
    arxivId: entry.arxivId,
    url: `https://arxiv.org/abs/${entry.arxivId}`,
    pdfUrl: entry.pdfUrl,
    abstract: entry.abstract,
    venue,
    keywords: entry.categories,
    isOpenAccess: true, // All arXiv papers are open access
    source: 'arxiv',
    cachedAt: Date.now(),
    raw: entry,
  }
}

/**
 * Get a paper by arXiv ID
 *
 * @example
 * const paper = await getPaper('2301.00001')
 * const paper = await getPaper('arxiv:2301.00001')
 */
export async function getPaper(arxivId: string): Promise<Citation | null> {
  // Normalize arXiv ID
  const normalizedId = arxivId
    .replace(/^arxiv:/i, '')
    .replace(/^https?:\/\/arxiv\.org\/abs\//i, '')
    .replace(/^https?:\/\/arxiv\.org\/pdf\//i, '')
    .replace(/\.pdf$/i, '')
    .trim()

  try {
    const url = new URL(ARXIV_API_BASE)
    url.searchParams.set('id_list', normalizedId)
    url.searchParams.set('max_results', '1')

    const response = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'Quarry-Codex/1.0 (mailto:codex@frame.dev)',
      },
    })

    if (!response.ok) {
      throw new Error(`arXiv API error: ${response.status}`)
    }

    const xml = await response.text()
    const entries = parseArxivXML(xml)

    if (entries.length === 0) {
      console.warn(`[arxiv] Paper not found: ${normalizedId}`)
      return null
    }

    return arxivToCitation(entries[0])
  } catch (error) {
    console.error('[arxiv] Error fetching paper:', error)
    throw error
  }
}

/**
 * Search arXiv for papers
 *
 * @example
 * const results = await searchPapers('attention is all you need', {
 *   maxResults: 10,
 *   sortBy: 'relevance'
 * })
 */
export async function searchPapers(
  query: string,
  options: {
    maxResults?: number
    start?: number
    sortBy?: 'relevance' | 'lastUpdatedDate' | 'submittedDate'
    sortOrder?: 'ascending' | 'descending'
    category?: string
  } = {}
): Promise<PaperSearchResult> {
  const {
    maxResults = 10,
    start = 0,
    sortBy = 'relevance',
    sortOrder = 'descending',
    category,
  } = options

  try {
    // Build search query
    let searchQuery = `all:${query}`

    // Add category filter if specified
    if (category) {
      searchQuery = `cat:${category} AND (${searchQuery})`
    }

    const url = new URL(ARXIV_API_BASE)
    url.searchParams.set('search_query', searchQuery)
    url.searchParams.set('start', start.toString())
    url.searchParams.set('max_results', maxResults.toString())
    url.searchParams.set('sortBy', sortBy)
    url.searchParams.set('sortOrder', sortOrder)

    const response = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'Quarry-Codex/1.0 (mailto:codex@frame.dev)',
      },
    })

    if (!response.ok) {
      throw new Error(`arXiv search error: ${response.status}`)
    }

    const xml = await response.text()

    // Extract total results from opensearch:totalResults
    const totalMatch = xml.match(/<opensearch:totalResults[^>]*>(\d+)<\/opensearch:totalResults>/)
    const total = totalMatch ? parseInt(totalMatch[1], 10) : 0

    const entries = parseArxivXML(xml)

    return {
      total,
      page: Math.floor(start / maxResults) + 1,
      perPage: maxResults,
      results: entries.map(arxivToCitation),
      query,
      source: 'arxiv',
    }
  } catch (error) {
    console.error('[arxiv] Search error:', error)
    throw error
  }
}

/**
 * Get papers by author name
 */
export async function getAuthorPapers(
  authorName: string,
  options: { maxResults?: number; start?: number } = {}
): Promise<PaperSearchResult> {
  const { maxResults = 20, start = 0 } = options

  try {
    const url = new URL(ARXIV_API_BASE)
    url.searchParams.set('search_query', `au:${authorName}`)
    url.searchParams.set('start', start.toString())
    url.searchParams.set('max_results', maxResults.toString())
    url.searchParams.set('sortBy', 'submittedDate')
    url.searchParams.set('sortOrder', 'descending')

    const response = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'Quarry-Codex/1.0 (mailto:codex@frame.dev)',
      },
    })

    if (!response.ok) {
      throw new Error(`arXiv author search error: ${response.status}`)
    }

    const xml = await response.text()

    const totalMatch = xml.match(/<opensearch:totalResults[^>]*>(\d+)<\/opensearch:totalResults>/)
    const total = totalMatch ? parseInt(totalMatch[1], 10) : 0

    const entries = parseArxivXML(xml)

    return {
      total,
      page: Math.floor(start / maxResults) + 1,
      perPage: maxResults,
      results: entries.map(arxivToCitation),
      query: `au:${authorName}`,
      source: 'arxiv',
    }
  } catch (error) {
    console.error('[arxiv] Author search error:', error)
    throw error
  }
}

/**
 * Get papers in a specific category
 */
export async function getCategoryPapers(
  category: string,
  options: { maxResults?: number; start?: number } = {}
): Promise<PaperSearchResult> {
  const { maxResults = 20, start = 0 } = options

  try {
    const url = new URL(ARXIV_API_BASE)
    url.searchParams.set('search_query', `cat:${category}`)
    url.searchParams.set('start', start.toString())
    url.searchParams.set('max_results', maxResults.toString())
    url.searchParams.set('sortBy', 'submittedDate')
    url.searchParams.set('sortOrder', 'descending')

    const response = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'Quarry-Codex/1.0 (mailto:codex@frame.dev)',
      },
    })

    if (!response.ok) {
      throw new Error(`arXiv category search error: ${response.status}`)
    }

    const xml = await response.text()

    const totalMatch = xml.match(/<opensearch:totalResults[^>]*>(\d+)<\/opensearch:totalResults>/)
    const total = totalMatch ? parseInt(totalMatch[1], 10) : 0

    const entries = parseArxivXML(xml)

    return {
      total,
      page: Math.floor(start / maxResults) + 1,
      perPage: maxResults,
      results: entries.map(arxivToCitation),
      query: `cat:${category}`,
      source: 'arxiv',
    }
  } catch (error) {
    console.error('[arxiv] Category search error:', error)
    throw error
  }
}
