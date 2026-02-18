/**
 * Glossary Worker Client
 * @module lib/glossary/processors/glossaryWorkerClient
 *
 * Client-side interface for spawning and communicating with the glossary worker.
 * Handles worker lifecycle, message passing, and result handling.
 */

import type {
  GlossaryWorkerMessage,
  GlossaryWorkerResponse,
  GlossaryTask,
  GlossaryProgress,
  GlossaryWorkerResult,
  GlossaryGenerationResult,
} from '../workerTypes'
import type { GenerationMethod } from '../glossaryCache'
import { v4 as uuidv4 } from 'uuid'

export interface WorkerGenerationOptions {
  method?: GenerationMethod
  maxTerms?: number
  forceRegenerate?: boolean
  fastMode?: boolean
  onProgress?: (progress: number, message: string) => void
}

/**
 * Generate glossary using Web Worker
 * Non-blocking - runs NLP processing off main thread
 */
export async function generateGlossaryWithWorker(
  content: string,
  options: WorkerGenerationOptions = {}
): Promise<GlossaryGenerationResult> {
  const {
    method = 'nlp',
    maxTerms = 50,
    fastMode,
    onProgress = () => {},
  } = options

  const taskId = uuidv4()

  return new Promise((resolve, reject) => {
    let worker: Worker | null = null
    let progressTimeout: ReturnType<typeof setTimeout>

    try {
      // Spawn worker
      worker = new Worker('/workers/glossary.worker.js', { type: 'module' })

      // Handle worker messages
      worker.addEventListener('message', (event: MessageEvent<GlossaryWorkerResponse>) => {
        const response = event.data

        switch (response.type) {
          case 'progress': {
            const progress = response.data as GlossaryProgress
            onProgress(progress.progress, progress.message)
            break
          }

          case 'complete': {
            const result = response.data as GlossaryWorkerResult
            clearTimeout(progressTimeout)
            worker?.terminate()
            worker = null

            resolve({
              terms: result.terms,
              method: result.method,
              cached: false,
              generationTimeMs: result.generationTimeMs,
              count: result.terms.length,
            })
            break
          }

          case 'error': {
            clearTimeout(progressTimeout)
            worker?.terminate()
            worker = null
            reject(new Error(response.error))
            break
          }
        }
      })

      // Handle worker errors
      worker.addEventListener('error', (event: ErrorEvent) => {
        clearTimeout(progressTimeout)
        worker?.terminate()
        worker = null
        reject(new Error(`Worker error: ${event.message}`))
      })

      // Send task to worker
      const task: GlossaryTask = {
        id: taskId,
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
        worker?.terminate()
        worker = null
        reject(new Error('Glossary generation timed out after 5 minutes'))
      }, 5 * 60 * 1000)

    } catch (error) {
      worker?.terminate()
      reject(error)
    }
  })
}

/**
 * Cancel a running glossary generation task
 */
export function cancelGlossaryGeneration(worker: Worker, taskId: string): void {
  const message: GlossaryWorkerMessage = {
    type: 'cancel',
    taskId,
  }
  worker.postMessage(message)
}
