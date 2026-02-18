/**
 * Academic Citations Module
 * @module citations
 *
 * Unified exports for the citation system.
 * Provides DOI/arXiv resolution, caching, and formatting.
 *
 * @example
 * import {
 *   resolveCitation,
 *   formatCitation,
 *   searchPapers,
 * } from '@/lib/citations'
 *
 * // Resolve a DOI
 * const result = await resolveCitation('10.1038/nature12373')
 * if (result.success) {
 *   const apa = formatCitation(result.citation, 'apa')
 *   console.log(apa.text)
 * }
 *
 * // Search for papers
 * const papers = await searchPapers('attention is all you need')
 */

// Types
export type {
  Citation,
  CitationInputType,
  CitationType,
  CitationSource,
  CitationStyle,
  CitationResolutionResult,
  FormattedCitation,
  PaperSearchResult,
  Author,
  BibliographyEntry,
  CitationCacheEntry,
} from './types'

export {
  CITATION_PATTERNS,
  DEFAULT_CITATION_STYLE,
  CITATION_CACHE_DURATION,
} from './types'

// Parser (offline-capable)
export {
  detectCitationType,
  extractDOI,
  extractArxivId,
  extractPmid,
  parseBibTeX,
  parseRIS,
  formatCitation,
  formatBibliography,
  toBibTeX,
  toBibTeXFile,
} from './parser'

// Cache (IndexedDB)
export {
  cacheCitation,
  getCachedCitation,
  getCachedByDOI,
  getCachedByArxivId,
  searchCachedCitations,
  getAllCachedCitations,
  clearCache,
  getCacheStats,
  cleanupOldEntries,
} from './cache'

// Resolver (unified API)
export {
  resolveCitation,
  resolveCitations,
  searchPapers,
  isValidDOI,
  isValidArxivId,
} from './resolver'

export type { ResolveOptions } from './resolver'

// Individual APIs (for direct access)
export * as crossref from './apis/crossref'
export * as arxiv from './apis/arxiv'
