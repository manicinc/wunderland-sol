/**
 * Semantic Scholar API Client
 * @module lib/research/semanticScholar
 *
 * Fetches paper recommendations and related papers from Semantic Scholar.
 * Free API with rate limits: 100 requests per 5 minutes.
 *
 * API Docs: https://api.semanticscholar.org/api-docs/
 */

import type { WebSearchResult } from './types'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Semantic Scholar paper fields we request
 */
const PAPER_FIELDS = [
  'paperId',
  'title',
  'abstract',
  'year',
  'authors',
  'venue',
  'url',
  'citationCount',
  'influentialCitationCount',
  'isOpenAccess',
  'openAccessPdf',
  'fieldsOfStudy',
  'externalIds',
].join(',')

/**
 * Semantic Scholar author
 */
export interface S2Author {
  authorId: string
  name: string
}

/**
 * Semantic Scholar external IDs
 */
export interface S2ExternalIds {
  DOI?: string
  ArXiv?: string
  PubMed?: string
  DBLP?: string
  MAG?: string
  CorpusId?: number
}

/**
 * Semantic Scholar paper
 */
export interface S2Paper {
  paperId: string
  title: string
  abstract: string | null
  year: number | null
  authors: S2Author[]
  venue: string | null
  url: string
  citationCount: number
  influentialCitationCount: number
  isOpenAccess: boolean
  openAccessPdf?: { url: string } | null
  fieldsOfStudy: string[] | null
  externalIds: S2ExternalIds | null
}

/**
 * Semantic Scholar recommendation
 */
export interface S2Recommendation {
  paper: S2Paper
  score?: number
}

/**
 * Options for recommendation queries
 */
export interface RecommendationOptions {
  /** Maximum number of recommendations */
  limit?: number
  /** Fields of study to filter by */
  fieldsOfStudy?: string[]
  /** AbortSignal for cancellation */
  signal?: AbortSignal
}

// ============================================================================
// API CLIENT
// ============================================================================

const API_BASE = 'https://api.semanticscholar.org/graph/v1'

/**
 * Check if we're in a static/CORS-blocked environment
 */
let corsBlocked = false

/**
 * Check if Semantic Scholar API is available (not CORS blocked)
 */
export function isS2Available(): boolean {
  return !corsBlocked
}

/**
 * API request helper with rate limit handling
 * Note: Semantic Scholar API requires server-side proxy for browser access.
 * On static deployments (GitHub Pages), requests will fail with CORS errors.
 */
async function s2Request<T>(
  endpoint: string,
  options?: { signal?: AbortSignal }
): Promise<T | null> {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      headers: {
        'Accept': 'application/json',
      },
      signal: options?.signal,
    })

    if (response.status === 429) {
      console.warn('[S2] Rate limited, try again later')
      return null
    }

    if (!response.ok) {
      console.warn(`[S2] Request failed: ${response.status}`)
      return null
    }

    return await response.json()
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      throw error
    }
    // Detect CORS/network errors (common on static deployments)
    if (error instanceof TypeError && (error.message.includes('Failed to fetch') || error.message.includes('NetworkError'))) {
      corsBlocked = true
      console.warn('[S2] API blocked (CORS) - academic enrichment requires full app deployment')
    } else {
      console.error('[S2] Request error:', error)
    }
    return null
  }
}

// ============================================================================
// PAPER LOOKUP
// ============================================================================

/**
 * Get a paper by DOI
 */
export async function getPaperByDOI(
  doi: string,
  signal?: AbortSignal
): Promise<S2Paper | null> {
  return s2Request<S2Paper>(`/paper/DOI:${encodeURIComponent(doi)}?fields=${PAPER_FIELDS}`, { signal })
}

/**
 * Get a paper by arXiv ID
 */
export async function getPaperByArXiv(
  arxivId: string,
  signal?: AbortSignal
): Promise<S2Paper | null> {
  return s2Request<S2Paper>(`/paper/ARXIV:${encodeURIComponent(arxivId)}?fields=${PAPER_FIELDS}`, { signal })
}

/**
 * Get a paper by Semantic Scholar paper ID
 */
export async function getPaperById(
  paperId: string,
  signal?: AbortSignal
): Promise<S2Paper | null> {
  return s2Request<S2Paper>(`/paper/${encodeURIComponent(paperId)}?fields=${PAPER_FIELDS}`, { signal })
}

/**
 * Search for papers
 */
export async function searchPapers(
  query: string,
  options?: { limit?: number; signal?: AbortSignal }
): Promise<S2Paper[]> {
  const limit = options?.limit ?? 10
  const result = await s2Request<{ data: S2Paper[] }>(
    `/paper/search?query=${encodeURIComponent(query)}&fields=${PAPER_FIELDS}&limit=${limit}`,
    { signal: options?.signal }
  )
  return result?.data ?? []
}

// ============================================================================
// RECOMMENDATIONS
// ============================================================================

/**
 * Get paper recommendations based on a positive paper set
 * Uses Semantic Scholar's recommendation API
 */
export async function getRecommendations(
  paperIds: string[],
  options?: RecommendationOptions
): Promise<S2Paper[]> {
  if (paperIds.length === 0) return []

  const limit = options?.limit ?? 10

  // For single paper, use the simpler endpoint
  if (paperIds.length === 1) {
    const result = await s2Request<{ recommendedPapers: S2Paper[] }>(
      `/recommendations/v1/papers/forpaper/${paperIds[0]}?fields=${PAPER_FIELDS}&limit=${limit}`,
      { signal: options?.signal }
    )
    return result?.recommendedPapers ?? []
  }

  // For multiple papers, use POST endpoint
  try {
    const response = await fetch(`${API_BASE}/recommendations/v1/papers?fields=${PAPER_FIELDS}&limit=${limit}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        positivePaperIds: paperIds,
      }),
      signal: options?.signal,
    })

    if (!response.ok) {
      console.warn(`[S2] Recommendations request failed: ${response.status}`)
      return []
    }

    const result = await response.json()
    return result?.recommendedPapers ?? []
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      throw error
    }
    console.error('[S2] Recommendations error:', error)
    return []
  }
}

/**
 * Get papers that cite this paper
 */
export async function getCitations(
  paperId: string,
  options?: { limit?: number; signal?: AbortSignal }
): Promise<S2Paper[]> {
  const limit = options?.limit ?? 10
  const result = await s2Request<{ data: Array<{ citingPaper: S2Paper }> }>(
    `/paper/${encodeURIComponent(paperId)}/citations?fields=${PAPER_FIELDS}&limit=${limit}`,
    { signal: options?.signal }
  )
  return result?.data?.map(d => d.citingPaper) ?? []
}

/**
 * Get papers referenced by this paper
 */
export async function getReferences(
  paperId: string,
  options?: { limit?: number; signal?: AbortSignal }
): Promise<S2Paper[]> {
  const limit = options?.limit ?? 10
  const result = await s2Request<{ data: Array<{ citedPaper: S2Paper }> }>(
    `/paper/${encodeURIComponent(paperId)}/references?fields=${PAPER_FIELDS}&limit=${limit}`,
    { signal: options?.signal }
  )
  return result?.data?.map(d => d.citedPaper) ?? []
}

// ============================================================================
// CONVERSION HELPERS
// ============================================================================

/**
 * Convert S2 paper to WebSearchResult format
 */
export function s2PaperToSearchResult(paper: S2Paper, position: number = 0): WebSearchResult {
  const authors = paper.authors?.map(a => a.name).join(', ') || ''
  const year = paper.year ? ` (${paper.year})` : ''
  const citations = paper.citationCount > 0 ? ` • ${paper.citationCount} citations` : ''

  return {
    id: `s2_${paper.paperId}`,
    title: paper.title,
    url: paper.url || `https://www.semanticscholar.org/paper/${paper.paperId}`,
    snippet: paper.abstract
      ? `${authors}${year}${citations}\n${paper.abstract.slice(0, 200)}${paper.abstract.length > 200 ? '...' : ''}`
      : `${authors}${year}${citations}`,
    domain: 'semanticscholar.org',
    publishedDate: paper.year ? `${paper.year}` : undefined,
    position,
    source: 'brave', // Using existing provider type as placeholder
  }
}

/**
 * Extract Semantic Scholar paper ID from URL
 */
export function extractS2PaperId(url: string): string | null {
  const match = url.match(/semanticscholar\.org\/paper\/[^/]+\/([a-f0-9]{40})/i)
  return match ? match[1] : null
}

/**
 * Get paper ID from DOI or arXiv
 */
export async function resolveToPaperId(
  identifier: { type: 'doi' | 'arxiv' | 'pmid' | 'url'; id: string }
): Promise<string | null> {
  let paper: S2Paper | null = null

  switch (identifier.type) {
    case 'doi':
      paper = await getPaperByDOI(identifier.id)
      break
    case 'arxiv':
      paper = await getPaperByArXiv(identifier.id)
      break
    case 'url':
      const s2Id = extractS2PaperId(identifier.id)
      if (s2Id) {
        paper = await getPaperById(s2Id)
      }
      break
    case 'pmid':
      // Semantic Scholar supports PubMed IDs
      paper = await s2Request<S2Paper>(
        `/paper/PMID:${identifier.id}?fields=paperId`,
        {}
      )
      break
  }

  return paper?.paperId ?? null
}
