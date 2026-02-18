/**
 * Citation Resolver - Unified resolution with caching
 * @module citations/resolver
 *
 * Provides a unified interface for resolving citations from any input.
 * Implements offline-first with API fallback chain.
 */

import type {
  Citation,
  CitationInputType,
  CitationResolutionResult,
  CitationSource,
  PaperSearchResult,
} from './types'
import {
  detectCitationType,
  extractDOI,
  extractArxivId,
  parseBibTeX,
  parseRIS,
} from './parser'
import {
  cacheCitation,
  getCachedByDOI,
  getCachedByArxivId,
  searchCachedCitations,
} from './cache'
import { resolveDOI, searchWorks as searchCrossRef } from './apis/crossref'
import { getPaper as getArxivPaper, searchPapers as searchArxiv } from './apis/arxiv'

/**
 * Resolution options
 */
export interface ResolveOptions {
  /** Skip cache lookup */
  skipCache?: boolean
  /** Timeout in milliseconds */
  timeout?: number
  /** Preferred source to try first */
  preferredSource?: CitationSource
}

/**
 * Resolve any citation input to a Citation object
 *
 * Handles DOI, arXiv ID, URL, BibTeX, RIS, and raw text.
 * Uses cache first, then tries APIs with fallback chain.
 *
 * @example
 * const result = await resolveCitation('10.1038/nature12373')
 * const result = await resolveCitation('arxiv:2301.00001')
 * const result = await resolveCitation('https://arxiv.org/abs/2301.00001')
 */
export async function resolveCitation(
  input: string,
  options: ResolveOptions = {}
): Promise<CitationResolutionResult> {
  const startTime = Date.now()
  const { skipCache = false, timeout = 10000 } = options

  // Detect input type
  const inputType = detectCitationType(input)

  // Handle BibTeX/RIS offline
  if (inputType === 'bibtex') {
    const citations = parseBibTeX(input)
    if (citations.length > 0) {
      // Cache all parsed citations
      for (const c of citations) {
        await cacheCitation(c)
      }
      return {
        success: true,
        citation: citations[0],
        source: 'bibtex-import',
        fromCache: false,
        latency: Date.now() - startTime,
      }
    }
    return {
      success: false,
      error: 'Failed to parse BibTeX',
      latency: Date.now() - startTime,
    }
  }

  if (inputType === 'ris') {
    const citations = parseRIS(input)
    if (citations.length > 0) {
      for (const c of citations) {
        await cacheCitation(c)
      }
      return {
        success: true,
        citation: citations[0],
        source: 'bibtex-import',
        fromCache: false,
        latency: Date.now() - startTime,
      }
    }
    return {
      success: false,
      error: 'Failed to parse RIS',
      latency: Date.now() - startTime,
    }
  }

  // Extract identifiers
  const doi = extractDOI(input)
  const arxivId = extractArxivId(input)

  // Try cache first
  if (!skipCache) {
    let cached: Citation | null = null

    if (doi) {
      cached = await getCachedByDOI(doi)
    } else if (arxivId) {
      cached = await getCachedByArxivId(arxivId)
    }

    if (cached) {
      return {
        success: true,
        citation: cached,
        source: cached.source,
        fromCache: true,
        latency: Date.now() - startTime,
      }
    }
  }

  // Check if offline
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    // Try to find in cache by search
    const cachedResults = await searchCachedCitations(input)
    if (cachedResults.length > 0) {
      return {
        success: true,
        citation: cachedResults[0],
        source: cachedResults[0].source,
        fromCache: true,
        latency: Date.now() - startTime,
      }
    }

    return {
      success: false,
      error: 'Offline and not found in cache',
      fromCache: false,
      latency: Date.now() - startTime,
    }
  }

  // Resolve via APIs with timeout
  try {
    const result = await Promise.race([
      resolveViaAPIs(doi, arxivId, inputType, input),
      new Promise<CitationResolutionResult>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), timeout)
      ),
    ])

    // Cache successful result
    if (result.success && result.citation) {
      await cacheCitation(result.citation)
    }

    return {
      ...result,
      latency: Date.now() - startTime,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return {
      success: false,
      error: errorMessage,
      latency: Date.now() - startTime,
    }
  }
}

/**
 * Resolve via API chain
 */
async function resolveViaAPIs(
  doi: string | null,
  arxivId: string | null,
  inputType: CitationInputType,
  input: string
): Promise<CitationResolutionResult> {
  // DOI resolution chain: CrossRef → OpenAlex → Semantic Scholar
  if (doi) {
    try {
      const citation = await resolveDOI(doi)
      if (citation) {
        return {
          success: true,
          citation,
          source: 'crossref',
          fromCache: false,
        }
      }
    } catch (error) {
      console.warn('[resolver] CrossRef failed for DOI:', doi, error)
    }

    // TODO: Add OpenAlex and Semantic Scholar fallback here
  }

  // arXiv resolution
  if (arxivId) {
    try {
      const citation = await getArxivPaper(arxivId)
      if (citation) {
        return {
          success: true,
          citation,
          source: 'arxiv',
          fromCache: false,
        }
      }
    } catch (error) {
      console.warn('[resolver] arXiv failed for ID:', arxivId, error)
    }
  }

  // URL handling - try to extract and resolve
  if (inputType === 'url') {
    // arXiv URL
    if (input.includes('arxiv.org')) {
      const id = extractArxivId(input)
      if (id) {
        try {
          const citation = await getArxivPaper(id)
          if (citation) {
            return {
              success: true,
              citation,
              source: 'arxiv',
              fromCache: false,
            }
          }
        } catch (error) {
          console.warn('[resolver] arXiv URL failed:', error)
        }
      }
    }

    // DOI URL
    if (input.includes('doi.org')) {
      const extractedDoi = extractDOI(input)
      if (extractedDoi) {
        try {
          const citation = await resolveDOI(extractedDoi)
          if (citation) {
            return {
              success: true,
              citation,
              source: 'crossref',
              fromCache: false,
            }
          }
        } catch (error) {
          console.warn('[resolver] DOI URL failed:', error)
        }
      }
    }
  }

  // Text search fallback
  if (inputType === 'text' && input.length > 10) {
    try {
      const results = await searchCrossRef(input, { rows: 1 })
      if (results.results.length > 0) {
        return {
          success: true,
          citation: results.results[0],
          source: 'crossref',
          fromCache: false,
        }
      }
    } catch (error) {
      console.warn('[resolver] Text search failed:', error)
    }
  }

  return {
    success: false,
    error: 'Could not resolve citation',
    fromCache: false,
  }
}

/**
 * Batch resolve multiple citations
 */
export async function resolveCitations(
  inputs: string[],
  options: ResolveOptions = {}
): Promise<CitationResolutionResult[]> {
  // Process in parallel with concurrency limit
  const concurrency = 5
  const results: CitationResolutionResult[] = []

  for (let i = 0; i < inputs.length; i += concurrency) {
    const batch = inputs.slice(i, i + concurrency)
    const batchResults = await Promise.all(
      batch.map((input) => resolveCitation(input, options))
    )
    results.push(...batchResults)
  }

  return results
}

/**
 * Search for papers across sources
 *
 * Searches multiple APIs and merges results.
 */
export async function searchPapers(
  query: string,
  options: {
    maxResults?: number
    sources?: ('crossref' | 'arxiv' | 'cache')[]
    category?: string
  } = {}
): Promise<PaperSearchResult> {
  const {
    maxResults = 10,
    sources = ['cache', 'crossref', 'arxiv'],
  } = options

  const allResults: Citation[] = []
  const seenIds = new Set<string>()

  // Search cache first (offline-capable)
  if (sources.includes('cache')) {
    const cachedResults = await searchCachedCitations(query)
    for (const c of cachedResults) {
      if (!seenIds.has(c.id)) {
        seenIds.add(c.id)
        allResults.push(c)
      }
    }
  }

  // Check if online
  const isOnline = typeof navigator === 'undefined' || navigator.onLine

  if (isOnline) {
    // Search CrossRef
    if (sources.includes('crossref')) {
      try {
        const crossRefResults = await searchCrossRef(query, { rows: maxResults })
        for (const c of crossRefResults.results) {
          if (!seenIds.has(c.id)) {
            seenIds.add(c.id)
            allResults.push(c)
            // Cache for future offline use
            cacheCitation(c).catch(console.error)
          }
        }
      } catch (error) {
        console.warn('[resolver] CrossRef search failed:', error)
      }
    }

    // Search arXiv
    if (sources.includes('arxiv')) {
      try {
        const arxivResults = await searchArxiv(query, {
          maxResults,
          category: options.category,
        })
        for (const c of arxivResults.results) {
          if (!seenIds.has(c.id)) {
            seenIds.add(c.id)
            allResults.push(c)
            cacheCitation(c).catch(console.error)
          }
        }
      } catch (error) {
        console.warn('[resolver] arXiv search failed:', error)
      }
    }
  }

  // Sort by citation count (if available) then by year
  allResults.sort((a, b) => {
    if (a.citationCount !== undefined && b.citationCount !== undefined) {
      return b.citationCount - a.citationCount
    }
    return b.year - a.year
  })

  return {
    total: allResults.length,
    page: 1,
    perPage: maxResults,
    results: allResults.slice(0, maxResults),
    query,
    source: 'crossref', // Primary source
  }
}

/**
 * Quick DOI check - returns true if looks like a valid DOI
 */
export function isValidDOI(input: string): boolean {
  return extractDOI(input) !== null
}

/**
 * Quick arXiv check - returns true if looks like a valid arXiv ID
 */
export function isValidArxivId(input: string): boolean {
  return extractArxivId(input) !== null
}

/**
 * Export all functions for convenience
 */
export {
  detectCitationType,
  extractDOI,
  extractArxivId,
  parseBibTeX,
  parseRIS,
} from './parser'

export { formatCitation, formatBibliography, toBibTeX, toBibTeXFile } from './parser'

export {
  cacheCitation,
  getCachedCitation,
  getCachedByDOI,
  getCachedByArxivId,
  searchCachedCitations,
  getAllCachedCitations,
  clearCache,
  getCacheStats,
} from './cache'
