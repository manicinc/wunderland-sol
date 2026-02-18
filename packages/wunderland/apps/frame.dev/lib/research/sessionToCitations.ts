/**
 * Session to Citations Converter
 * @module lib/research/sessionToCitations
 *
 * Converts research session results to formatted citations.
 * Supports enrichment via Semantic Scholar for academic sources.
 */

import type { WebSearchResult, ResearchSession } from './types'
import { type CitationSource, type CitationStyle, formatCitation } from './citationFormatter'
import { isAcademicResult, extractCitationId } from './academicDetector'
import { getPaperById, getPaperByDOI, getPaperByArXiv, type S2Paper } from './semanticScholar'

// ============================================================================
// TYPES
// ============================================================================

export interface ConvertedCitation {
  /** Original result ID */
  resultId: string
  /** Citation source data */
  source: CitationSource
  /** Whether this is an academic source */
  isAcademic: boolean
  /** Formatted citation in specified style */
  formatted?: string
  /** Whether enrichment was successful */
  enriched: boolean
}

export interface SessionCitationsResult {
  /** Converted citations */
  citations: ConvertedCitation[]
  /** Citation style used */
  style: CitationStyle
  /** Number of citations enriched with metadata */
  enrichedCount: number
  /** Number that failed enrichment */
  failedEnrichmentCount: number
}

export interface BatchCitationOptions {
  /** Citation style to use */
  style: CitationStyle
  /** Whether to auto-enrich academic sources */
  autoEnrich?: boolean
  /** Abort signal for cancellation */
  signal?: AbortSignal
}

// ============================================================================
// CONVERSION FUNCTIONS
// ============================================================================

/**
 * Convert a single WebSearchResult to CitationSource
 */
export function resultToCitationSource(result: WebSearchResult): CitationSource {
  const isAcademic = isAcademicResult(result)

  return {
    title: result.title,
    url: result.url,
    authors: result.authors,
    publishedDate: result.publishedDate,
    accessedDate: new Date().toISOString(),
    publisher: result.domain,
    type: isAcademic ? 'paper' : 'webpage',
    abstract: result.snippet,
  }
}

/**
 * Enrich a citation source with Semantic Scholar data
 */
export async function enrichCitationSource(
  source: CitationSource,
  resultUrl: string,
  signal?: AbortSignal
): Promise<CitationSource> {
  // Try to extract paper ID from URL
  const paperId = extractCitationId(resultUrl)
  if (!paperId) {
    return source
  }

  try {
    // Fetch paper based on citation type
    let paper: S2Paper | null = null
    switch (paperId.type) {
      case 'doi':
        paper = await getPaperByDOI(paperId.id, signal)
        break
      case 'arxiv':
        paper = await getPaperByArXiv(paperId.id, signal)
        break
      case 'pmid':
        paper = await getPaperById(`PMID:${paperId.id}`, signal)
        break
      case 'url':
        // URL type not directly supported, skip enrichment
        return source
    }
    if (!paper) {
      return source
    }

    // Merge S2 data with existing source
    return {
      ...source,
      title: paper.title || source.title,
      authors: paper.authors?.map(a => a.name) || source.authors,
      publishedDate: paper.year ? `${paper.year}` : source.publishedDate,
      journal: paper.venue || source.journal,
      doi: paper.externalIds?.DOI || source.doi,
      abstract: paper.abstract || source.abstract,
      type: 'paper',
    }
  } catch (error) {
    console.warn('[enrichCitationSource] Failed to enrich:', error)
    return source
  }
}

/**
 * Convert a single result to a ConvertedCitation
 */
export async function convertResult(
  result: WebSearchResult,
  style: CitationStyle,
  options: { autoEnrich?: boolean; signal?: AbortSignal } = {}
): Promise<ConvertedCitation> {
  const isAcademic = isAcademicResult(result)
  let source = resultToCitationSource(result)
  let enriched = false

  // Attempt enrichment for academic sources
  if (isAcademic && options.autoEnrich !== false) {
    const enrichedSource = await enrichCitationSource(source, result.url, options.signal)
    if (enrichedSource !== source) {
      source = enrichedSource
      enriched = true
    }
  }

  // Format the citation
  const formatted = formatCitation(source, style)

  return {
    resultId: result.id,
    source,
    isAcademic,
    formatted,
    enriched,
  }
}

/**
 * Convert all saved results from a session to citations
 */
export async function convertSessionToCitations(
  session: ResearchSession,
  options: BatchCitationOptions
): Promise<SessionCitationsResult> {
  const { style, autoEnrich = true, signal } = options
  const citations: ConvertedCitation[] = []
  let enrichedCount = 0
  let failedEnrichmentCount = 0

  for (const result of session.savedResults) {
    if (signal?.aborted) break

    try {
      const citation = await convertResult(result, style, { autoEnrich, signal })
      citations.push(citation)

      if (citation.isAcademic) {
        if (citation.enriched) {
          enrichedCount++
        } else {
          failedEnrichmentCount++
        }
      }
    } catch (error) {
      console.warn('[convertSessionToCitations] Failed to convert result:', result.id, error)

      // Add non-enriched citation on error
      citations.push({
        resultId: result.id,
        source: resultToCitationSource(result),
        isAcademic: isAcademicResult(result),
        formatted: formatCitation(resultToCitationSource(result), style),
        enriched: false,
      })
      failedEnrichmentCount++
    }
  }

  return {
    citations,
    style,
    enrichedCount,
    failedEnrichmentCount,
  }
}

/**
 * Convert results array to citations (for one-off conversions)
 */
export async function convertResultsToCitations(
  results: WebSearchResult[],
  options: BatchCitationOptions
): Promise<SessionCitationsResult> {
  // Create a temporary session-like object
  const pseudoSession: ResearchSession = {
    id: 'temp',
    topic: '',
    query: '',
    queries: [],
    notes: '',
    savedResults: results,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }

  return convertSessionToCitations(pseudoSession, options)
}

/**
 * Format all citations as a bibliography string
 */
export function formatBibliography(
  citations: ConvertedCitation[],
  style: CitationStyle,
  options: { numbered?: boolean; separator?: string } = {}
): string {
  const { numbered = false, separator = '\n\n' } = options

  const formatted = citations.map((c, i) => {
    const text = c.formatted || formatCitation(c.source, style)
    if (numbered) {
      return `[${i + 1}] ${text}`
    }
    return text
  })

  return formatted.join(separator)
}

/**
 * Export bibliography to different formats
 */
export function exportBibliography(
  citations: ConvertedCitation[],
  style: CitationStyle,
  format: 'text' | 'markdown' | 'html' | 'bibtex'
): string {
  switch (format) {
    case 'bibtex':
      // Re-format all citations as BibTeX
      return citations
        .map(c => formatCitation(c.source, 'bibtex'))
        .join('\n\n')

    case 'html':
      const htmlItems = citations.map((c, i) => {
        const text = c.formatted || formatCitation(c.source, style)
        return `<p class="citation" data-index="${i + 1}">${text}</p>`
      })
      return `<div class="bibliography">\n${htmlItems.join('\n')}\n</div>`

    case 'markdown':
      return citations.map((c, i) => {
        const text = c.formatted || formatCitation(c.source, style)
        return `${i + 1}. ${text}`
      }).join('\n')

    case 'text':
    default:
      return formatBibliography(citations, style, { numbered: true })
  }
}

/**
 * Generate an in-text citation for a result
 */
export function generateInTextCitation(
  source: CitationSource,
  style: CitationStyle
): string {
  const year = source.publishedDate
    ? new Date(source.publishedDate).getFullYear()
    : 'n.d.'

  const firstAuthor = source.authors?.[0]
    ? source.authors[0].split(' ').pop() // Get last name
    : source.publisher || 'Unknown'

  switch (style) {
    case 'apa':
      return `(${firstAuthor}, ${year})`

    case 'mla':
      return `(${firstAuthor})`

    case 'chicago':
      return `(${firstAuthor} ${year})`

    case 'ieee':
      return '[#]' // Placeholder - needs reference number

    case 'harvard':
      return `(${firstAuthor} ${year})`

    case 'vancouver':
      return '[#]' // Placeholder - needs reference number

    default:
      return `(${firstAuthor}, ${year})`
  }
}
