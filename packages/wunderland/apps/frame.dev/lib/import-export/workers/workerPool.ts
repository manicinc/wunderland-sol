/**
 * Worker Pool Manager
 * @module lib/import-export/workers/workerPool
 *
 * Manages a pool of Web Workers for parallel conversion tasks.
 * Handles task queuing, worker lifecycle, and result aggregation.
 */

import type {
  ConversionTask,
  ConversionTaskProgress,
  ConversionTaskResult,
  WorkerMessage,
  WorkerResponse,
} from '../core/types'

// ============================================================================
// WORKER POOL
// ============================================================================

export interface WorkerPoolOptions {
  /** Maximum number of workers */
  maxWorkers?: number
  /** Worker script path */
  workerPath?: string
  /** Idle timeout (ms) before terminating workers */
  idleTimeout?: number
}

export class WorkerPool {
  /** Maximum number of workers */
  private maxWorkers: number

  /** Worker script path */
  private workerPath: string

  /** Idle timeout */
  private idleTimeout: number

  /** Active workers */
  private workers: Worker[] = []

  /** Available workers (not processing) */
  private availableWorkers: Worker[] = []

  /** Task queue */
  private taskQueue: {
    task: ConversionTask
    onProgress: (progress: ConversionTaskProgress) => void
    onComplete: (result: ConversionTaskResult) => void
    onError: (error: string) => void
  }[] = []

  /** Task map (taskId -> callbacks) */
  private taskMap = new Map<
    string,
    {
      worker: Worker
      onProgress: (progress: ConversionTaskProgress) => void
      onComplete: (result: ConversionTaskResult) => void
      onError: (error: string) => void
    }
  >()

  /** Idle timers */
  private idleTimers = new Map<Worker, NodeJS.Timeout>()

  /**
   * Create a new worker pool
   */
  constructor(options: WorkerPoolOptions = {}) {
    this.maxWorkers = options.maxWorkers || navigator.hardwareConcurrency || 4
    this.workerPath = options.workerPath || '/workers/conversion.worker.js'
    this.idleTimeout = options.idleTimeout || 60000 // 1 minute
  }

  // ==========================================================================
  // TASK EXECUTION
  // ==========================================================================

  /**
   * Execute a conversion task
   */
  async execute(
    task: ConversionTask,
    onProgress?: (progress: ConversionTaskProgress) => void
  ): Promise<ConversionTaskResult> {
    return new Promise((resolve, reject) => {
      this.taskQueue.push({
        task,
        onProgress: onProgress || (() => {}),
        onComplete: resolve,
        onError: reject,
      })

      this.processQueue()
    })
  }

  /**
   * Cancel a task
   */
  cancel(taskId: string): boolean {
    const taskInfo = this.taskMap.get(taskId)

    if (taskInfo) {
      // Send cancel message to worker
      const message: WorkerMessage = { type: 'cancel', taskId }
      taskInfo.worker.postMessage(message)

      // Remove from task map
      this.taskMap.delete(taskId)

      // Return worker to pool
      this.returnWorker(taskInfo.worker)

      return true
    }

    // Remove from queue if not yet started
    const queueIndex = this.taskQueue.findIndex(item => item.task.id === taskId)
    if (queueIndex !== -1) {
      this.taskQueue.splice(queueIndex, 1)
      return true
    }

    return false
  }

  // ==========================================================================
  // WORKER MANAGEMENT
  // ==========================================================================

  /**
   * Get an available worker or create new one
   */
  private async getWorker(): Promise<Worker> {
    // Try to get existing available worker
    const worker = this.availableWorkers.pop()
    if (worker) {
      this.clearIdleTimer(worker)
      return worker
    }

    // Create new worker if under limit
    if (this.workers.length < this.maxWorkers) {
      const newWorker = this.createWorker()
      this.workers.push(newWorker)
      return newWorker
    }

    // Wait for a worker to become available
    return new Promise(resolve => {
      const checkInterval = setInterval(() => {
        const availableWorker = this.availableWorkers.pop()
        if (availableWorker) {
          clearInterval(checkInterval)
          this.clearIdleTimer(availableWorker)
          resolve(availableWorker)
        }
      }, 100)
    })
  }

  /**
   * Create a new worker
   */
  private createWorker(): Worker {
    const worker = new Worker(this.workerPath, { type: 'module' })

    worker.addEventListener('message', (event: MessageEvent<WorkerResponse>) => {
      this.handleWorkerMessage(worker, event.data)
    })

    worker.addEventListener('error', (event: ErrorEvent) => {
      console.error('[WorkerPool] Worker error:', event.message)
      this.handleWorkerError(worker, event.message)
    })

    return worker
  }

  /**
   * Handle message from worker
   */
  private handleWorkerMessage(worker: Worker, response: WorkerResponse): void {
    switch (response.type) {
      case 'progress': {
        const taskInfo = this.taskMap.get(response.data.taskId)
        if (taskInfo) {
          taskInfo.onProgress(response.data)
        }
        break
      }

      case 'complete': {
        const taskInfo = this.taskMap.get(response.data.taskId)
        if (taskInfo) {
          taskInfo.onComplete(response.data)
          this.taskMap.delete(response.data.taskId)
          this.returnWorker(worker)
        }
        break
      }

      case 'error': {
        const taskInfo = this.taskMap.get(response.taskId)
        if (taskInfo) {
          taskInfo.onError(response.error)
          this.taskMap.delete(response.taskId)
          this.returnWorker(worker)
        }
        break
      }
    }
  }

  /**
   * Handle worker error
   */
  private handleWorkerError(worker: Worker, error: string): void {
    // Find all tasks assigned to this worker
    const tasksToFail: string[] = []

    for (const [taskId, taskInfo] of this.taskMap.entries()) {
      if (taskInfo.worker === worker) {
        tasksToFail.push(taskId)
        taskInfo.onError(`Worker error: ${error}`)
      }
    }

    // Remove failed tasks from map
    for (const taskId of tasksToFail) {
      this.taskMap.delete(taskId)
    }

    // Terminate and remove worker
    this.terminateWorker(worker)
  }

  /**
   * Return worker to pool
   */
  private returnWorker(worker: Worker): void {
    this.availableWorkers.push(worker)

    // Set idle timer
    const timeout = setTimeout(() => {
      this.terminateWorker(worker)
    }, this.idleTimeout)

    this.idleTimers.set(worker, timeout)

    // Process next task in queue
    this.processQueue()
  }

  /**
   * Clear idle timer for worker
   */
  private clearIdleTimer(worker: Worker): void {
    const timeout = this.idleTimers.get(worker)
    if (timeout) {
      clearTimeout(timeout)
      this.idleTimers.delete(worker)
    }
  }

  /**
   * Terminate a worker
   */
  private terminateWorker(worker: Worker): void {
    worker.terminate()

    const workerIndex = this.workers.indexOf(worker)
    if (workerIndex !== -1) {
      this.workers.splice(workerIndex, 1)
    }

    const availableIndex = this.availableWorkers.indexOf(worker)
    if (availableIndex !== -1) {
      this.availableWorkers.splice(availableIndex, 1)
    }

    this.clearIdleTimer(worker)
  }

  // ==========================================================================
  // QUEUE PROCESSING
  // ==========================================================================

  /**
   * Process task queue
   */
  private async processQueue(): Promise<void> {
    while (this.taskQueue.length > 0) {
      const queueItem = this.taskQueue.shift()
      if (!queueItem) break

      try {
        const worker = await this.getWorker()

        // Store task info
        this.taskMap.set(queueItem.task.id, {
          worker,
          onProgress: queueItem.onProgress,
          onComplete: queueItem.onComplete,
          onError: queueItem.onError,
        })

        // Send task to worker
        const message: WorkerMessage = {
          type: 'convert',
          task: queueItem.task,
        }
        worker.postMessage(message)
      } catch (error) {
        queueItem.onError(
          error instanceof Error ? error.message : 'Failed to get worker'
        )
      }
    }
  }

  // ==========================================================================
  // LIFECYCLE
  // ==========================================================================

  /**
   * Terminate all workers
   */
  terminate(): void {
    for (const worker of this.workers) {
      this.terminateWorker(worker)
    }

    this.workers = []
    this.availableWorkers = []
    this.taskQueue = []
    this.taskMap.clear()
  }

  /**
   * Get pool statistics
   */
  getStats(): {
    totalWorkers: number
    availableWorkers: number
    activeTasks: number
    queuedTasks: number
  } {
    return {
      totalWorkers: this.workers.length,
      availableWorkers: this.availableWorkers.length,
      activeTasks: this.taskMap.size,
      queuedTasks: this.taskQueue.length,
    }
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let workerPoolInstance: WorkerPool | null = null

/**
 * Get singleton WorkerPool instance
 */
export function getWorkerPool(options?: WorkerPoolOptions): WorkerPool {
  if (!workerPoolInstance) {
    workerPoolInstance = new WorkerPool(options)
  }
  return workerPoolInstance
}

/**
 * Reset WorkerPool instance (for testing)
 */
export function resetWorkerPool(): void {
  if (workerPoolInstance) {
    workerPoolInstance.terminate()
    workerPoolInstance = null
  }
}
