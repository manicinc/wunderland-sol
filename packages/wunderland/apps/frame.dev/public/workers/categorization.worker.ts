/**
 * Categorization Web Worker
 * @module public/workers/categorization.worker
 *
 * Background worker for categorizing inbox strands without blocking the UI.
 * Processes batches of files and reports progress.
 */

import type {
  CategorizationWorkerMessage,
  CategorizationWorkerResponse,
  CategorizationTask,
  CategorizationTaskProgress,
  CategorizationTaskResult,
  CategoryResult,
} from '@/lib/categorization/types'

// Import algorithm functions (will be bundled by build process)
import { categorizeStrand } from '@/lib/categorization/algorithm'

// ============================================================================
// WORKER STATE
// ============================================================================

/** Currently processing task ID (for cancellation) */
let currentTaskId: string | null = null

/** Cancellation flag */
let cancelled = false

// ============================================================================
// MESSAGE HANDLER
// ============================================================================

self.addEventListener('message', async (event: MessageEvent<CategorizationWorkerMessage>) => {
  const message = event.data

  switch (message.type) {
    case 'categorize':
      await handleCategorizationTask(message.task)
      break

    case 'cancel':
      handleCancellation(message.taskId)
      break

    default:
      console.warn('[CategorizationWorker] Unknown message type:', message)
  }
})

// ============================================================================
// TASK HANDLERS
// ============================================================================

/**
 * Handle categorization task
 */
async function handleCategorizationTask(task: CategorizationTask): Promise<void> {
  currentTaskId = task.id
  cancelled = false

  const results: CategoryResult[] = []
  const errors: Array<{ file: string; error: string }> = []
  const total = task.inputs.length

  let autoApplied = 0
  let needsReview = 0
  let needsTriage = 0

  try {
    // Process files in batches
    for (let i = 0; i < task.inputs.length; i++) {
      // Check for cancellation
      if (cancelled) {
        postError(task.id, 'Task cancelled by user')
        return
      }

      const input = task.inputs[i]

      try {
        // Categorize single strand
        const result = await categorizeStrand(input)
        results.push(result)

        // Update statistics
        switch (result.action) {
          case 'auto-apply':
            autoApplied++
            break
          case 'suggest':
            needsReview++
            break
          case 'needs-triage':
            needsTriage++
            break
        }

        // Report progress
        const progress = Math.round(((i + 1) / total) * 100)
        postProgress({
          taskId: task.id,
          progress,
          message: `Categorized ${i + 1} of ${total} files`,
          currentFile: input.path,
          processed: i + 1,
          total,
        })

        // Small delay to prevent blocking (every 10 files)
        if (i > 0 && i % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 10))
        }
      } catch (error) {
        // Record error but continue processing
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        errors.push({ file: input.path, error: errorMessage })
        console.error(`[CategorizationWorker] Failed to categorize ${input.path}:`, error)
      }
    }

    // Send completion
    postComplete({
      taskId: task.id,
      success: true,
      results,
      errors: errors.length > 0 ? errors : undefined,
      statistics: {
        filesProcessed: results.length,
        autoApplied,
        needsReview,
        needsTriage,
      },
    })
  } catch (error) {
    // Fatal error - abort task
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    postError(task.id, `Categorization task failed: ${errorMessage}`)
  } finally {
    currentTaskId = null
  }
}

/**
 * Handle task cancellation
 */
function handleCancellation(taskId: string): void {
  if (currentTaskId === taskId) {
    cancelled = true
  }
}

// ============================================================================
// MESSAGE SENDERS
// ============================================================================

/**
 * Post progress update
 */
function postProgress(data: CategorizationTaskProgress): void {
  const message: CategorizationWorkerResponse = {
    type: 'progress',
    data,
  }
  self.postMessage(message)
}

/**
 * Post completion message
 */
function postComplete(data: CategorizationTaskResult): void {
  const message: CategorizationWorkerResponse = {
    type: 'complete',
    data,
  }
  self.postMessage(message)
}

/**
 * Post error message
 */
function postError(taskId: string, error: string): void {
  const message: CategorizationWorkerResponse = {
    type: 'error',
    taskId,
    error,
  }
  self.postMessage(message)
}

// ============================================================================
// WORKER INITIALIZATION
// ============================================================================

console.log('[CategorizationWorker] Initialized and ready')
