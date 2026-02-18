/**
 * Summarization Worker Types
 * @module lib/summarization/workerTypes
 *
 * Type definitions for the summarization web worker.
 * Defines message protocols for main thread ↔ worker communication.
 */

import type { TextRankConfig } from '@/lib/nlp/textrank'

// ============================================================================
// ALGORITHM TYPES
// ============================================================================

/**
 * Summarization algorithm to use
 * - 'bert': BERT embeddings + TextRank (default, highest quality)
 * - 'tfidf': TF-IDF + TextRank (fallback, no ML model needed)
 * - 'lead-first': Simple lead sentences extraction (fastest)
 */
export type SummarizationAlgorithm = 'bert' | 'tfidf' | 'lead-first'

/**
 * Stages of summarization processing
 */
export type SummarizationStage =
  | 'initializing'
  | 'loading_model'
  | 'tokenizing'
  | 'computing_embeddings'
  | 'building_graph'
  | 'ranking'
  | 'selecting'
  | 'complete'

// ============================================================================
// TASK TYPES
// ============================================================================

/**
 * A block to be summarized
 */
export interface SummarizationBlock {
  id: string
  type: 'paragraph' | 'heading' | 'code' | 'list' | 'blockquote' | 'table' | 'unknown'
  content: string
  index: number
}

/**
 * Summarization task to be processed by the worker
 */
export interface SummarizationTask {
  /** Unique task identifier */
  id: string
  /** Content to summarize (either full text or blocks) */
  content: string
  /** Optional blocks for block-level summarization */
  blocks?: SummarizationBlock[]
  /** Algorithm to use (defaults to 'bert') */
  algorithm?: SummarizationAlgorithm
  /** Maximum summary length in characters */
  maxLength?: number
  /** TextRank configuration overrides */
  config?: Partial<TextRankConfig>
  /** Whether to cache the result */
  cacheKey?: string
  /** Strand path for context */
  strandPath?: string
}

/**
 * Result from summarization
 */
export interface SummarizationResult {
  /** Task ID this result belongs to */
  taskId: string
  /** Generated summary */
  summary: string
  /** Algorithm that was used */
  algorithm: SummarizationAlgorithm
  /** Per-block summaries if blocks were provided */
  blockSummaries?: Array<{
    blockId: string
    summary: string | null
    score: number
  }>
  /** Time taken in milliseconds */
  durationMs: number
  /** Whether the result was from cache */
  cached: boolean
  /** Model load time if applicable */
  modelLoadTimeMs?: number
}

/**
 * Progress update during summarization
 */
export interface SummarizationProgress {
  taskId: string
  progress: number // 0-100
  stage: SummarizationStage
  message: string
  blocksProcessed?: number
  totalBlocks?: number
}

// ============================================================================
// WORKER MESSAGES
// ============================================================================

/**
 * Messages sent TO the worker
 */
export type SummarizationWorkerMessage =
  | {
      type: 'summarize'
      task: SummarizationTask
    }
  | {
      type: 'cancel'
      taskId: string
    }
  | {
      type: 'preload_model'
    }
  | {
      type: 'clear_cache'
    }

/**
 * Messages sent FROM the worker
 */
export type SummarizationWorkerResponse =
  | {
      type: 'progress'
      data: SummarizationProgress
    }
  | {
      type: 'complete'
      data: SummarizationResult
    }
  | {
      type: 'error'
      taskId: string
      error: string
    }
  | {
      type: 'model_ready'
      modelName: string
      loadTimeMs: number
    }
  | {
      type: 'cache_cleared'
    }

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Feature flag configuration for summarization
 */
export interface SummarizationFeatureFlags {
  /** Whether to use BERT embeddings (default: true) */
  useBertEmbeddings: boolean
  /** Whether to enable auto-summarization on publish (default: true) */
  autoSummarizeOnPublish: boolean
  /** Whether to enable caching (default: true) */
  enableCache: boolean
  /** Maximum cached summaries (default: 1000) */
  maxCacheSize: number
  /** Cache TTL in milliseconds (default: 7 days) */
  cacheTtlMs: number
}

/**
 * Default feature flags
 */
export const DEFAULT_SUMMARIZATION_FLAGS: SummarizationFeatureFlags = {
  useBertEmbeddings: true,
  autoSummarizeOnPublish: true,
  enableCache: true,
  maxCacheSize: 1000,
  cacheTtlMs: 7 * 24 * 60 * 60 * 1000, // 7 days
}
