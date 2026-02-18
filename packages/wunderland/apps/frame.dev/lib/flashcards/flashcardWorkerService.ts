/**
 * Flashcard Worker Service
 * @module lib/flashcards/flashcardWorkerService
 *
 * Service for interacting with the flashcard generation web worker.
 * Handles worker lifecycle, message passing, and progress tracking.
 */

import type {
  FlashcardWorkerMessage,
  FlashcardWorkerResponse,
  FlashcardTask,
  FlashcardResult,
  FlashcardProgress,
  FlashcardAlgorithm,
  GeneratedFlashcard,
} from './workerTypes'

// ============================================================================
// TYPES
// ============================================================================

export interface GenerateWithWorkerOptions {
  /** Content to generate flashcards from */
  content: string
  /** Optional title */
  title?: string
  /** Algorithm to use */
  algorithm?: FlashcardAlgorithm
  /** Maximum cards to generate */
  maxCards?: number
  /** Difficulty distribution */
  difficulty?: 'easy' | 'medium' | 'hard' | 'mixed'
  /** Focus topics */
  topics?: string[]
  /** Include tags */
  includeTags?: boolean
  /** Cache key for result caching */
  cacheKey?: string
  /** Strand path for context */
  strandPath?: string
  /** Progress callback */
  onProgress?: (progress: FlashcardProgress) => void
  /** Abort signal for cancellation */
  signal?: AbortSignal
}

export interface WorkerStatus {
  isReady: boolean
  isLoading: boolean
  modelLoaded: boolean
  error: string | null
}

// ============================================================================
// WORKER SERVICE
// ============================================================================

class FlashcardWorkerService {
  private worker: Worker | null = null
  private pendingTasks: Map<
    string,
    {
      resolve: (result: FlashcardResult) => void
      reject: (error: Error) => void
      onProgress?: (progress: FlashcardProgress) => void
    }
  > = new Map()
  private modelReady = false
  private modelLoading = false
  private initError: string | null = null

  /**
   * Get or create the worker instance
   */
  private getWorker(): Worker {
    if (this.worker) return this.worker

    if (typeof window === 'undefined') {
      throw new Error('Worker can only be used in browser environment')
    }

    this.worker = new Worker(
      new URL('/workers/flashcard.worker.ts', window.location.origin),
      { type: 'module' }
    )

    this.worker.addEventListener('message', this.handleMessage.bind(this))
    this.worker.addEventListener('error', this.handleError.bind(this))

    return this.worker
  }

  /**
   * Handle messages from the worker
   */
  private handleMessage(event: MessageEvent<FlashcardWorkerResponse>): void {
    const message = event.data

    switch (message.type) {
      case 'progress': {
        const pending = this.pendingTasks.get(message.data.taskId)
        if (pending?.onProgress) {
          pending.onProgress(message.data)
        }
        break
      }

      case 'complete': {
        const pending = this.pendingTasks.get(message.data.taskId)
        if (pending) {
          pending.resolve(message.data)
          this.pendingTasks.delete(message.data.taskId)
        }
        break
      }

      case 'error': {
        const pending = this.pendingTasks.get(message.taskId)
        if (pending) {
          pending.reject(new Error(message.error))
          this.pendingTasks.delete(message.taskId)
        }
        break
      }

      case 'model_ready': {
        this.modelReady = true
        this.modelLoading = false
        console.log(
          `[FlashcardWorkerService] Model ${message.modelName} loaded in ${message.loadTimeMs}ms`
        )
        break
      }

      case 'cache_cleared': {
        console.log('[FlashcardWorkerService] Cache cleared')
        break
      }
    }
  }

  /**
   * Handle worker errors
   */
  private handleError(event: ErrorEvent): void {
    console.error('[FlashcardWorkerService] Worker error:', event.message)
    this.initError = event.message

    // Reject all pending tasks
    for (const [taskId, pending] of this.pendingTasks) {
      pending.reject(new Error(`Worker error: ${event.message}`))
      this.pendingTasks.delete(taskId)
    }
  }

  /**
   * Generate a unique task ID
   */
  private generateTaskId(): string {
    return `fc-task-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  }

  /**
   * Preload the BERT model
   */
  async preloadModel(): Promise<void> {
    if (this.modelReady || this.modelLoading) return

    this.modelLoading = true
    const worker = this.getWorker()

    return new Promise((resolve) => {
      const handler = (event: MessageEvent<FlashcardWorkerResponse>) => {
        if (event.data.type === 'model_ready') {
          this.modelReady = true
          this.modelLoading = false
          worker.removeEventListener('message', handler)
          resolve()
        }
      }

      worker.addEventListener('message', handler)
      worker.postMessage({ type: 'preload_model' } as FlashcardWorkerMessage)

      // Timeout after 60 seconds
      setTimeout(() => {
        this.modelLoading = false
        worker.removeEventListener('message', handler)
        resolve()
      }, 60000)
    })
  }

  /**
   * Generate flashcards using the worker
   */
  async generate(options: GenerateWithWorkerOptions): Promise<GeneratedFlashcard[]> {
    const worker = this.getWorker()
    const taskId = this.generateTaskId()

    const task: FlashcardTask = {
      id: taskId,
      content: options.content,
      title: options.title,
      algorithm: options.algorithm || 'bert',
      maxCards: options.maxCards || 10,
      difficulty: options.difficulty || 'mixed',
      topics: options.topics,
      includeTags: options.includeTags ?? true,
      cacheKey: options.cacheKey,
      strandPath: options.strandPath,
    }

    // Set up abort handling
    if (options.signal) {
      options.signal.addEventListener('abort', () => {
        this.cancel(taskId)
      })
    }

    return new Promise((resolve, reject) => {
      this.pendingTasks.set(taskId, {
        resolve: (result) => resolve(result.cards),
        reject,
        onProgress: options.onProgress,
      })

      worker.postMessage({ type: 'generate', task } as FlashcardWorkerMessage)
    })
  }

  /**
   * Cancel a pending task
   */
  cancel(taskId: string): void {
    if (this.worker && this.pendingTasks.has(taskId)) {
      this.worker.postMessage({ type: 'cancel', taskId } as FlashcardWorkerMessage)
    }
  }

  /**
   * Clear the worker cache
   */
  clearCache(): void {
    if (this.worker) {
      this.worker.postMessage({ type: 'clear_cache' } as FlashcardWorkerMessage)
    }
  }

  /**
   * Get worker status
   */
  getStatus(): WorkerStatus {
    return {
      isReady: this.worker !== null,
      isLoading: this.modelLoading,
      modelLoaded: this.modelReady,
      error: this.initError,
    }
  }

  /**
   * Terminate the worker
   */
  terminate(): void {
    if (this.worker) {
      this.worker.terminate()
      this.worker = null
      this.modelReady = false
      this.modelLoading = false
    }
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let instance: FlashcardWorkerService | null = null

export function getFlashcardWorkerService(): FlashcardWorkerService {
  if (!instance) {
    instance = new FlashcardWorkerService()
  }
  return instance
}

/**
 * Convenience function to generate flashcards using the worker
 */
export async function generateFlashcardsWithWorker(
  options: GenerateWithWorkerOptions
): Promise<GeneratedFlashcard[]> {
  const service = getFlashcardWorkerService()
  return service.generate(options)
}

/**
 * Preload the BERT model for faster first generation
 */
export async function preloadFlashcardModel(): Promise<void> {
  const service = getFlashcardWorkerService()
  return service.preloadModel()
}

export { FlashcardWorkerService }
