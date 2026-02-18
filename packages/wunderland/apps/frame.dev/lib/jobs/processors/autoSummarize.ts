/**
 * Auto-Summarization for Strand Publishing
 * @module lib/jobs/processors/autoSummarize
 *
 * Provides automatic extractive summarization when strands are published.
 * Uses TextRank with optional BERT embeddings based on feature flags.
 *
 * This module is designed to be called from publishStrand or as a separate job.
 */

import { isAutoSummarizeEnabled, getSummarizationAlgorithm } from '@/lib/config/summarizationConfig'

// ============================================================================
// TYPES
// ============================================================================

export interface AutoSummarizeOptions {
  /** Strand path for caching */
  strandPath: string
  /** Content to summarize */
  content: string
  /** Override the feature flag algorithm */
  algorithm?: 'bert' | 'tfidf' | 'lead-first'
  /** Maximum summary length */
  maxLength?: number
  /** Progress callback */
  onProgress?: (progress: number, message: string) => void
}

export interface AutoSummarizeResult {
  /** Generated summary (null if disabled or failed) */
  summary: string | null
  /** Algorithm used */
  algorithm: 'bert' | 'tfidf' | 'lead-first'
  /** Whether summarization was skipped */
  skipped: boolean
  /** Skip reason if skipped */
  skipReason?: string
  /** Duration in milliseconds */
  durationMs: number
  /** Whether it was cached */
  cached: boolean
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Auto-summarize strand content if enabled
 *
 * Checks feature flags and generates extractive summary using
 * the configured algorithm.
 */
export async function autoSummarizeStrand(
  options: AutoSummarizeOptions
): Promise<AutoSummarizeResult> {
  const startTime = Date.now()
  const {
    strandPath,
    content,
    algorithm = getSummarizationAlgorithm(),
    maxLength = 200,
    onProgress = () => {},
  } = options

  // Check if auto-summarization is enabled
  if (!isAutoSummarizeEnabled()) {
    return {
      summary: null,
      algorithm,
      skipped: true,
      skipReason: 'Auto-summarization disabled via feature flag',
      durationMs: Date.now() - startTime,
      cached: false,
    }
  }

  // Skip if content is too short
  if (content.length < 100) {
    return {
      summary: null,
      algorithm,
      skipped: true,
      skipReason: 'Content too short to summarize',
      durationMs: Date.now() - startTime,
      cached: false,
    }
  }

  onProgress(10, 'Generating extractive summary...')

  try {
    // Use client-side summarization if in browser
    if (typeof window !== 'undefined') {
      const { summarizeStrand } = await import('@/lib/summarization')

      const result = await summarizeStrand(strandPath, content, {
        algorithm,
        maxLength,
        onProgress: (p, m) => onProgress(10 + p * 0.8, m),
      })

      onProgress(90, 'Summary generated')

      return {
        summary: result.summary,
        algorithm: result.algorithm,
        skipped: false,
        durationMs: result.durationMs,
        cached: result.cached,
      }
    }

    // For server-side or worker context, use direct TextRank
    const { extractSummary, getEmbeddingFn } = await import('@/lib/nlp/textrank')

    // Get embedding function if BERT is enabled
    let embeddingFn: ((text: string) => Promise<Float32Array | null>) | undefined
    if (algorithm === 'bert') {
      try {
        embeddingFn = await getEmbeddingFn()
      } catch {
        // BERT unavailable, will fallback to TF-IDF
      }
    }

    const result = await extractSummary(
      content,
      {
        maxLength,
        useBertEmbeddings: algorithm === 'bert',
      },
      embeddingFn
    )

    onProgress(90, 'Summary generated')

    return {
      summary: result.summary,
      algorithm: result.method,
      skipped: false,
      durationMs: Date.now() - startTime,
      cached: false,
    }
  } catch (error) {
    console.warn('[AutoSummarize] Failed to generate summary:', error)
    return {
      summary: null,
      algorithm,
      skipped: true,
      skipReason: `Error: ${error instanceof Error ? error.message : 'Unknown'}`,
      durationMs: Date.now() - startTime,
      cached: false,
    }
  }
}

/**
 * Quick check if auto-summarization would run
 * Use this before triggering a job to avoid unnecessary work
 */
export function shouldAutoSummarize(contentLength: number): boolean {
  return isAutoSummarizeEnabled() && contentLength >= 100
}
