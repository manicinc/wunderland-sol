/**
 * Glossary Job Processor
 * @module lib/jobs/processors/glossary
 *
 * Processes glossary generation jobs using Web Worker for background execution.
 * Integrates with the job queue for persistence and progress tracking.
 */

import type { Job, JobResult } from '../types'
import type { JobProcessor } from '../jobQueue'
import type {
  GlossaryWorkerMessage,
  GlossaryWorkerResponse,
  GlossaryTask,
  GlossaryProgress,
  GlossaryWorkerResult,
  GlossaryGenerationPayload,
  GlossaryGenerationResult,
} from '@/lib/glossary/workerTypes'
import {
  getFromCache,
  saveToCache,
  hashContent,
  type CachedGlossary,
} from '@/lib/glossary/glossaryCache'
import { v4 as uuidv4 } from 'uuid'

/**
 * Glossary generation processor
 *
 * Workflow:
 * 1. Check cache for existing glossary (fast, before worker spawn)
 * 2. Spawn Web Worker with content + settings
 * 3. Stream progress updates to job queue
 * 4. Save result to cache
 * 5. Return generated terms
 */
export const glossaryProcessor: JobProcessor = async (
  job: Job,
  onProgress: (progress: number, message: string) => void
): Promise<JobResult> => {
  const payload = job.payload as GlossaryGenerationPayload
  const {
    content,
    method = 'nlp',
    maxTerms = 50,
    forceRegenerate = false,
    fastMode,
  } = payload

  onProgress(0, 'Initializing glossary generation...')

  // Generate content hash for caching
  const contentHash = `${method}_${hashContent(content)}`

  // Check cache first (unless force regenerate)
  if (!forceRegenerate) {
    onProgress(5, 'Checking cache...')
    try {
      const cached = await getFromCache(contentHash)
      if (cached) {
        onProgress(100, 'Loaded from cache')
        const result: GlossaryGenerationResult = {
          terms: cached.terms,
          method: cached.generationMethod,
          cached: true,
          generationTimeMs: 0,
          count: cached.terms.length,
        }
        return result
      }
    } catch (error) {
      console.warn('[GlossaryProcessor] Cache check failed:', error)
    }
  }

  onProgress(10, 'Starting background generation...')

  // Spawn Web Worker
  const worker = new Worker('/workers/glossary.worker.js', { type: 'module' })

  const result = await new Promise<GlossaryWorkerResult>((resolve, reject) => {
    let progressTimeout: NodeJS.Timeout

    // Handle worker messages
    worker.addEventListener('message', (event: MessageEvent<GlossaryWorkerResponse>) => {
      const response = event.data

      switch (response.type) {
        case 'progress': {
          const progress = response.data as GlossaryProgress
          // Map 10-90% to worker progress
          const mappedProgress = 10 + Math.round(progress.progress * 0.8)
          onProgress(
            mappedProgress,
            progress.message || `Processing: ${progress.stage}...`
          )
          break
        }

        case 'complete': {
          const workerResult = response.data as GlossaryWorkerResult
          clearTimeout(progressTimeout)
          worker.terminate()
          resolve(workerResult)
          break
        }

        case 'error': {
          clearTimeout(progressTimeout)
          worker.terminate()
          reject(new Error(response.error))
          break
        }
      }
    })

    worker.addEventListener('error', (event: ErrorEvent) => {
      clearTimeout(progressTimeout)
      worker.terminate()
      reject(new Error(`Worker error: ${event.message}`))
    })

    // Send task to worker
    const task: GlossaryTask = {
      id: job.id,
      content,
      method,
      maxTerms,
      fastMode: fastMode ?? content.length > 10000,
      semanticDedup: true,
    }

    const message: GlossaryWorkerMessage = {
      type: 'generate',
      task,
    }

    worker.postMessage(message)

    // Timeout after 5 minutes
    progressTimeout = setTimeout(() => {
      worker.terminate()
      reject(new Error('Glossary generation timed out after 5 minutes'))
    }, 5 * 60 * 1000)
  })

  onProgress(92, 'Saving to cache...')

  // Save to cache
  try {
    const cachedGlossary: CachedGlossary = {
      terms: result.terms,
      generationMethod: result.method,
      createdAt: new Date().toISOString(),
      version: 1,
    }
    await saveToCache(contentHash, cachedGlossary, 30) // 30 day TTL
  } catch (error) {
    console.warn('[GlossaryProcessor] Failed to save to cache:', error)
  }

  onProgress(100, 'Glossary generation complete')

  // Return job result
  const jobResult: GlossaryGenerationResult = {
    terms: result.terms,
    method: result.method,
    cached: false,
    generationTimeMs: result.generationTimeMs,
    count: result.terms.length,
  }

  return jobResult
}

/**
 * Generate glossary directly without job queue
 * Useful for simpler use cases or when job queue isn't needed
 */
export async function generateGlossaryWithWorker(
  content: string,
  options: {
    method?: 'nlp' | 'llm' | 'hybrid'
    maxTerms?: number
    forceRegenerate?: boolean
    fastMode?: boolean
    onProgress?: (progress: number, message: string) => void
  } = {}
): Promise<GlossaryGenerationResult> {
  const {
    method = 'nlp',
    maxTerms = 50,
    forceRegenerate = false,
    fastMode,
    onProgress = () => {},
  } = options

  // Create a mock job for the processor
  const mockJob: Job = {
    id: uuidv4(),
    type: 'glossary_generation',
    status: 'running',
    progress: 0,
    message: '',
    payload: {
      strandPath: '',
      content,
      method,
      maxTerms,
      forceRegenerate,
      fastMode,
    } as GlossaryGenerationPayload,
    createdAt: new Date().toISOString(),
  }

  return glossaryProcessor(mockJob, onProgress) as Promise<GlossaryGenerationResult>
}
