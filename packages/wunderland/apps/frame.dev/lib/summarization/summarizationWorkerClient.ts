/**
 * Summarization Worker Client
 * @module lib/summarization/summarizationWorkerClient
 *
 * Client-side interface for spawning and communicating with the summarization worker.
 * Handles worker lifecycle, message passing, and result handling.
 *
 * Usage:
 * ```typescript
 * const result = await summarizeWithWorker(content, {
 *   algorithm: 'bert', // default
 *   maxLength: 200,
 *   onProgress: (progress, message) => console.log(progress, message),
 * })
 * ```
 */

import { v4 as uuidv4 } from 'uuid'
import type {
  SummarizationWorkerMessage,
  SummarizationWorkerResponse,
  SummarizationTask,
  SummarizationResult,
  SummarizationAlgorithm,
  SummarizationBlock,
  SummarizationFeatureFlags,
} from './workerTypes'
import { DEFAULT_SUMMARIZATION_FLAGS } from './workerTypes'
import type { TextRankConfig } from '@/lib/nlp/textrank'

// ============================================================================
// TYPES
// ============================================================================

export interface SummarizationOptions {
  /** Algorithm to use (default: from feature flag) */
  algorithm?: SummarizationAlgorithm
  /** Maximum summary length in characters (default: 200) */
  maxLength?: number
  /** Blocks for block-level summarization */
  blocks?: SummarizationBlock[]
  /** TextRank config overrides */
  config?: Partial<TextRankConfig>
  /** Cache key for result caching */
  cacheKey?: string
  /** Strand path for context */
  strandPath?: string
  /** Progress callback */
  onProgress?: (progress: number, message: string) => void
  /** Timeout in milliseconds (default: 2 minutes) */
  timeoutMs?: number
}

// ============================================================================
// SINGLETON WORKER POOL
// ============================================================================

let workerInstance: Worker | null = null
let modelPreloaded = false

/**
 * Get or create the summarization worker
 */
function getWorker(): Worker {
  if (!workerInstance) {
    workerInstance = new Worker('/workers/summarization.worker.js', { type: 'module' })

    // Auto-cleanup on page unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        workerInstance?.terminate()
        workerInstance = null
      })
    }
  }
  return workerInstance
}

/**
 * Preload the BERT model in the background
 * Call this early (e.g., on app init) to reduce first-summarization latency
 */
export function preloadSummarizationModel(): void {
  if (modelPreloaded || typeof window === 'undefined') return

  const worker = getWorker()
  const message: SummarizationWorkerMessage = { type: 'preload_model' }
  worker.postMessage(message)
  modelPreloaded = true
}

/**
 * Clear the worker's summary cache
 */
export function clearSummarizationCache(): Promise<void> {
  return new Promise((resolve) => {
    const worker = getWorker()

    const handler = (event: MessageEvent<SummarizationWorkerResponse>) => {
      if (event.data.type === 'cache_cleared') {
        worker.removeEventListener('message', handler)
        resolve()
      }
    }

    worker.addEventListener('message', handler)

    const message: SummarizationWorkerMessage = { type: 'clear_cache' }
    worker.postMessage(message)

    // Timeout after 1 second
    setTimeout(() => {
      worker.removeEventListener('message', handler)
      resolve()
    }, 1000)
  })
}

// ============================================================================
// FEATURE FLAGS
// ============================================================================

let featureFlags: SummarizationFeatureFlags = { ...DEFAULT_SUMMARIZATION_FLAGS }

/**
 * Update summarization feature flags
 */
export function updateSummarizationFlags(flags: Partial<SummarizationFeatureFlags>): void {
  featureFlags = { ...featureFlags, ...flags }
}

/**
 * Get current feature flags
 */
export function getSummarizationFlags(): SummarizationFeatureFlags {
  return { ...featureFlags }
}

/**
 * Get the algorithm based on feature flags
 */
export function getDefaultAlgorithm(): SummarizationAlgorithm {
  return featureFlags.useBertEmbeddings ? 'bert' : 'tfidf'
}

// ============================================================================
// MAIN API
// ============================================================================

/**
 * Summarize content using the web worker
 * Non-blocking - runs processing off main thread
 */
export async function summarizeWithWorker(
  content: string,
  options: SummarizationOptions = {}
): Promise<SummarizationResult> {
  const {
    algorithm = getDefaultAlgorithm(),
    maxLength = 200,
    blocks,
    config,
    cacheKey,
    strandPath,
    onProgress = () => {},
    timeoutMs = 2 * 60 * 1000, // 2 minutes
  } = options

  const taskId = uuidv4()

  return new Promise((resolve, reject) => {
    const worker = getWorker()
    let timeoutHandle: ReturnType<typeof setTimeout>

    const cleanup = () => {
      worker.removeEventListener('message', handler)
      clearTimeout(timeoutHandle)
    }

    const handler = (event: MessageEvent<SummarizationWorkerResponse>) => {
      const response = event.data

      switch (response.type) {
        case 'progress': {
          const progress = response.data
          if (progress.taskId === taskId) {
            onProgress(progress.progress, progress.message)
          }
          break
        }

        case 'complete': {
          const result = response.data
          if (result.taskId === taskId) {
            cleanup()
            resolve(result)
          }
          break
        }

        case 'error': {
          if (response.taskId === taskId) {
            cleanup()
            reject(new Error(response.error))
          }
          break
        }

        case 'model_ready': {
          // Model loaded, can continue
          console.log(`[Summarization] BERT model ready: ${response.modelName}`)
          break
        }
      }
    }

    worker.addEventListener('message', handler)

    // Build and send task
    const task: SummarizationTask = {
      id: taskId,
      content,
      blocks,
      algorithm,
      maxLength,
      config,
      cacheKey,
      strandPath,
    }

    const message: SummarizationWorkerMessage = {
      type: 'summarize',
      task,
    }

    worker.postMessage(message)

    // Timeout handling
    timeoutHandle = setTimeout(() => {
      cleanup()

      // Try to cancel the task
      const cancelMessage: SummarizationWorkerMessage = {
        type: 'cancel',
        taskId,
      }
      worker.postMessage(cancelMessage)

      reject(new Error('Summarization timed out'))
    }, timeoutMs)
  })
}

/**
 * Cancel a running summarization task
 */
export function cancelSummarization(taskId: string): void {
  const worker = getWorker()
  const message: SummarizationWorkerMessage = {
    type: 'cancel',
    taskId,
  }
  worker.postMessage(message)
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Summarize a strand's content with caching
 */
export async function summarizeStrand(
  strandPath: string,
  content: string,
  options?: Omit<SummarizationOptions, 'strandPath' | 'cacheKey'>
): Promise<SummarizationResult> {
  const cacheKey = `strand:${strandPath}:${hashContent(content)}`

  return summarizeWithWorker(content, {
    ...options,
    strandPath,
    cacheKey,
  })
}

/**
 * Summarize blocks from a parsed document
 */
export async function summarizeBlocks(
  blocks: SummarizationBlock[],
  options?: Omit<SummarizationOptions, 'blocks'>
): Promise<SummarizationResult> {
  const content = blocks.map(b => b.content).join('\n\n')

  return summarizeWithWorker(content, {
    ...options,
    blocks,
  })
}

/**
 * Quick summarization with lead-first algorithm (no model loading)
 */
export async function quickSummarize(
  content: string,
  maxLength = 200
): Promise<string> {
  const result = await summarizeWithWorker(content, {
    algorithm: 'lead-first',
    maxLength,
  })
  return result.summary
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Simple content hash for cache keys
 */
function hashContent(content: string): string {
  let hash = 0
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36)
}

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initialize summarization based on environment variables
 */
export function initializeSummarization(): void {
  if (typeof window === 'undefined') return

  // Check for feature flag environment variables
  const envUseBert = process.env.NEXT_PUBLIC_SUMMARIZATION_USE_BERT
  const envAutoSummarize = process.env.NEXT_PUBLIC_AUTO_SUMMARIZE_ON_PUBLISH

  if (envUseBert !== undefined) {
    featureFlags.useBertEmbeddings = envUseBert !== 'false'
  }

  if (envAutoSummarize !== undefined) {
    featureFlags.autoSummarizeOnPublish = envAutoSummarize !== 'false'
  }

  // Preload model if BERT is enabled
  if (featureFlags.useBertEmbeddings) {
    // Delay preloading to not block initial render
    setTimeout(() => {
      preloadSummarizationModel()
    }, 3000)
  }
}

// Auto-initialize on import (client-side only)
if (typeof window !== 'undefined') {
  // Use requestIdleCallback if available, otherwise setTimeout
  if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(() => initializeSummarization())
  } else {
    setTimeout(initializeSummarization, 1000)
  }
}
