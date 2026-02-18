/**
 * Summarization Types
 * @module lib/summarization/types
 */

import type { WebSearchResult } from '@/lib/research/types'

// ============================================================================
// SUMMARY TYPES
// ============================================================================

/**
 * Type of summary to generate
 */
export type SummaryType = 'digest' | 'abstract' | 'key-points' | 'comparison' | 'executive'

/**
 * Length of the summary
 */
export type SummaryLength = 'brief' | 'standard' | 'detailed'

// ============================================================================
// REQUEST/RESPONSE
// ============================================================================

/**
 * Request for summarization
 */
export interface SummarizationRequest {
  /** Content to summarize (can be multiple sources) */
  sources: SummarizationSource[]
  /** Type of summary */
  type: SummaryType
  /** Desired length */
  length: SummaryLength
  /** Optional focus area */
  focus?: string
  /** Include source citations */
  includeCitations?: boolean
  /** Target audience (affects language) */
  audience?: 'general' | 'academic' | 'technical' | 'executive'
  /** Abort signal */
  signal?: AbortSignal
}

/**
 * Source to summarize
 */
export interface SummarizationSource {
  /** Title of the source */
  title: string
  /** URL of the source */
  url: string
  /** Content/snippet */
  content: string
  /** Whether this is an academic source */
  isAcademic?: boolean
  /** Authors if known */
  authors?: string[]
  /** Domain */
  domain?: string
}

/**
 * Progress during summarization
 */
export interface SummarizationProgress {
  /** Current status */
  status: 'initializing' | 'fetching' | 'summarizing' | 'complete' | 'error'
  /** Partial or complete summary */
  content: string
  /** LLM provider used */
  provider?: string
  /** Error message if status is 'error' */
  error?: string
  /** Percentage complete (0-100) */
  progress?: number
}

/**
 * Final summarization result
 */
export interface SummarizationResult {
  /** The generated summary */
  summary: string
  /** Type of summary generated */
  type: SummaryType
  /** Number of sources summarized */
  sourceCount: number
  /** LLM provider used */
  provider: string
  /** Tokens used */
  tokensUsed?: number
  /** Cache key for this result */
  cacheKey?: string
  /** Whether result was from cache */
  fromCache?: boolean
}

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Configuration for summary types
 */
export const SUMMARY_TYPE_CONFIG: Record<SummaryType, {
  label: string
  description: string
  icon: string
  minSources: number
}> = {
  digest: {
    label: 'Digest',
    description: 'A comprehensive overview combining all sources',
    icon: '📰',
    minSources: 1,
  },
  abstract: {
    label: 'Abstract',
    description: 'Academic-style abstract summarizing key findings',
    icon: '📝',
    minSources: 1,
  },
  'key-points': {
    label: 'Key Points',
    description: 'Bullet-point list of main takeaways',
    icon: '🔑',
    minSources: 1,
  },
  comparison: {
    label: 'Comparison',
    description: 'Compare and contrast multiple sources',
    icon: '⚖️',
    minSources: 2,
  },
  executive: {
    label: 'Executive Summary',
    description: 'Brief high-level summary for decision makers',
    icon: '📊',
    minSources: 1,
  },
}

/**
 * Configuration for summary lengths
 */
export const SUMMARY_LENGTH_CONFIG: Record<SummaryLength, {
  label: string
  description: string
  maxTokens: number
  targetWords: string
}> = {
  brief: {
    label: 'Brief',
    description: 'Quick overview',
    maxTokens: 256,
    targetWords: '50-100 words',
  },
  standard: {
    label: 'Standard',
    description: 'Balanced detail',
    maxTokens: 512,
    targetWords: '150-250 words',
  },
  detailed: {
    label: 'Detailed',
    description: 'Comprehensive coverage',
    maxTokens: 1024,
    targetWords: '300-500 words',
  },
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Convert WebSearchResult to SummarizationSource
 */
export function resultToSource(result: WebSearchResult): SummarizationSource {
  return {
    title: result.title,
    url: result.url,
    content: result.snippet,
    domain: result.domain,
    authors: result.authors,
    isAcademic: result.url.includes('arxiv.org') ||
               result.url.includes('scholar.google') ||
               result.url.includes('semanticscholar.org'),
  }
}

/**
 * Convert multiple results to sources
 */
export function resultsToSources(results: WebSearchResult[]): SummarizationSource[] {
  return results.map(resultToSource)
}
