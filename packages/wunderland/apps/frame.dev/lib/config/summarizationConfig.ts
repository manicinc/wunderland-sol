/**
 * Summarization Configuration
 * @module lib/config/summarizationConfig
 *
 * Configuration for extractive and abstractive summarization.
 * Controls algorithm selection, auto-summarization, and caching.
 *
 * Environment Variables (for GitHub Secrets):
 * - NEXT_PUBLIC_SUMMARIZATION_ALGORITHM: 'bert' | 'tfidf' | 'lead-first' (default: 'bert')
 * - NEXT_PUBLIC_AUTO_SUMMARIZE_ON_PUBLISH: 'true' | 'false' (default: 'true')
 * - NEXT_PUBLIC_SUMMARIZATION_CACHING: 'true' | 'false' (default: 'true')
 */

// ============================================================================
// TYPES
// ============================================================================

/**
 * Summarization algorithm type
 * - bert: BERT embeddings + TextRank (default, highest quality, requires model load)
 * - tfidf: TF-IDF + TextRank (fast, no ML model, works offline immediately)
 * - lead-first: Extract lead sentences (fastest, no processing needed)
 */
export type SummarizationAlgorithm = 'bert' | 'tfidf' | 'lead-first'

/**
 * Summarization configuration interface
 */
export interface SummarizationConfig {
  /** Algorithm for extractive summarization */
  algorithm: SummarizationAlgorithm
  /** Auto-generate summaries when publishing strands */
  autoSummarizeOnPublish: boolean
  /** Enable caching of generated summaries */
  enableCaching: boolean
  /** Maximum summary length in characters */
  maxLength: number
  /** Maximum summary length per block */
  maxLengthPerBlock: number
}

// ============================================================================
// DEFAULTS
// ============================================================================

/**
 * Default summarization configuration
 */
export const DEFAULT_SUMMARIZATION_CONFIG: SummarizationConfig = {
  algorithm: 'bert',
  autoSummarizeOnPublish: true,
  enableCaching: true,
  maxLength: 200,
  maxLengthPerBlock: 150,
}

// ============================================================================
// ENVIRONMENT-BASED GETTERS
// ============================================================================

/**
 * Get summarization algorithm from environment
 * Controlled via NEXT_PUBLIC_SUMMARIZATION_ALGORITHM or GitHub secrets
 */
export function getSummarizationAlgorithm(): SummarizationAlgorithm {
  const algo = process.env.NEXT_PUBLIC_SUMMARIZATION_ALGORITHM
  if (algo === 'tfidf' || algo === 'lead-first') return algo
  return 'bert' // Default to BERT
}

/**
 * Check if auto-summarization on publish is enabled
 */
export function isAutoSummarizeEnabled(): boolean {
  const enabled = process.env.NEXT_PUBLIC_AUTO_SUMMARIZE_ON_PUBLISH
  return enabled !== 'false' // Default to true
}

/**
 * Check if summarization caching is enabled
 */
export function isSummarizationCachingEnabled(): boolean {
  const enabled = process.env.NEXT_PUBLIC_SUMMARIZATION_CACHING
  return enabled !== 'false' // Default to true
}

/**
 * Get full summarization config from environment
 */
export function getSummarizationConfig(): SummarizationConfig {
  return {
    algorithm: getSummarizationAlgorithm(),
    autoSummarizeOnPublish: isAutoSummarizeEnabled(),
    enableCaching: isSummarizationCachingEnabled(),
    maxLength: DEFAULT_SUMMARIZATION_CONFIG.maxLength,
    maxLengthPerBlock: DEFAULT_SUMMARIZATION_CONFIG.maxLengthPerBlock,
  }
}

// ============================================================================
// ALGORITHM DESCRIPTIONS
// ============================================================================

/**
 * Human-readable descriptions for each algorithm
 */
export const ALGORITHM_DESCRIPTIONS: Record<SummarizationAlgorithm, {
  name: string
  description: string
  tradeoffs: string
}> = {
  bert: {
    name: 'BERT + TextRank',
    description: 'Uses BERT embeddings for semantic similarity in TextRank graph',
    tradeoffs: 'Highest quality, ~2-5s first load (model download), then instant',
  },
  tfidf: {
    name: 'TF-IDF + TextRank',
    description: 'Uses TF-IDF vectors for word-frequency based similarity',
    tradeoffs: 'Fast, no model needed, slightly lower quality for complex text',
  },
  'lead-first': {
    name: 'Lead Sentences',
    description: 'Extracts first sentences up to max length',
    tradeoffs: 'Instant, no processing, works well for news-style content',
  },
}

/**
 * Check if BERT is available (client-side only)
 */
export function isBertAvailable(): boolean {
  if (typeof window === 'undefined') return false
  // Check if Transformers.js is loaded
  return typeof (window as any).Transformers !== 'undefined' ||
         typeof (window as any).transformers !== 'undefined'
}
