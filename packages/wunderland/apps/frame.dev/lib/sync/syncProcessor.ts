/**
 * Sync Processor
 * @module lib/sync/syncProcessor
 *
 * Processes pending sync operations when back online.
 * Handles retries, conflict resolution, and progress tracking.
 */

import { getSyncQueue, type SyncQueue } from './syncQueue'
import type { SyncOperation, SyncEvent } from './types'
import * as plannerDb from '@/lib/planner/database'

// ============================================================================
// TYPES
// ============================================================================

export interface SyncProgress {
  total: number
  completed: number
  failed: number
  current?: SyncOperation
}

export interface SyncResult {
  success: boolean
  processed: number
  failed: number
  errors: Array<{ operationId: string; error: string }>
}

export type SyncProgressCallback = (progress: SyncProgress) => void

// ============================================================================
// SYNC PROCESSOR
// ============================================================================

/**
 * Process all pending sync operations
 */
export async function processPendingSync(
  onProgress?: SyncProgressCallback,
  signal?: AbortSignal
): Promise<SyncResult> {
  const queue = await getSyncQueue()
  const pending = await queue.getPendingOperations()

  if (pending.length === 0) {
    return { success: true, processed: 0, failed: 0, errors: [] }
  }

  let completed = 0
  let failed = 0
  const errors: Array<{ operationId: string; error: string }> = []

  // Report initial progress
  onProgress?.({
    total: pending.length,
    completed: 0,
    failed: 0,
  })

  for (const operation of pending) {
    // Check for abort
    if (signal?.aborted) {
      break
    }

    // Report current operation
    onProgress?.({
      total: pending.length,
      completed,
      failed,
      current: operation,
    })

    try {
      await queue.markInProgress(operation.id)
      await processOperation(operation)
      await queue.markCompleted(operation.id)
      completed++
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      await queue.markFailed(operation.id, errorMessage)
      failed++
      errors.push({ operationId: operation.id, error: errorMessage })
    }

    // Report progress after each operation
    onProgress?.({
      total: pending.length,
      completed,
      failed,
    })
  }

  return {
    success: failed === 0,
    processed: completed,
    failed,
    errors,
  }
}

/**
 * Check if operation type is a standard CRUD operation
 */
function isCrudOperation(type: string): type is 'create' | 'update' | 'delete' {
  return type === 'create' || type === 'update' || type === 'delete'
}

/**
 * Process a single sync operation
 */
async function processOperation(operation: SyncOperation): Promise<void> {
  const { type, resourceType, resourceId, payload } = operation

  // Only process standard CRUD operations for now
  // Other types (ai-request, transcription, etc.) are handled by specialized services
  if (!isCrudOperation(type)) {
    console.log(`[SyncProcessor] Skipping non-CRUD operation: ${type} for ${resourceType}/${resourceId}`)
    return
  }

  switch (resourceType) {
    case 'task':
      await processTaskOperation(type, resourceId, payload)
      break
    case 'event':
      await processEventOperation(type, resourceId, payload)
      break
    case 'strand':
      await processStrandOperation(type, resourceId, payload)
      break
    default:
      console.warn(`[SyncProcessor] Unknown resource type: ${resourceType}`)
  }
}

/**
 * Process task operations
 */
async function processTaskOperation(
  type: 'create' | 'update' | 'delete',
  resourceId: string,
  payload: unknown
): Promise<void> {
  switch (type) {
    case 'create':
      // Task was created offline - check if it was already synced
      const existingTask = await plannerDb.getTask(resourceId)
      if (!existingTask) {
        // This shouldn't happen normally, but handle gracefully
        console.warn(`[SyncProcessor] Task ${resourceId} not found for create sync`)
      }
      // Mark as synced
      await plannerDb.updateTask(resourceId, { syncStatus: 'synced' } as any)
      break

    case 'update':
      // Apply the update
      if (payload && typeof payload === 'object') {
        await plannerDb.updateTask(resourceId, payload as any)
      }
      break

    case 'delete':
      // Permanently delete if soft-deleted
      await plannerDb.deleteTask(resourceId, true)
      break
  }
}

/**
 * Process event operations
 */
async function processEventOperation(
  type: 'create' | 'update' | 'delete',
  resourceId: string,
  payload: unknown
): Promise<void> {
  switch (type) {
    case 'create':
      // Event was created offline - verify exists
      const existingEvent = await plannerDb.getEvent(resourceId)
      if (!existingEvent) {
        console.warn(`[SyncProcessor] Event ${resourceId} not found for create sync`)
      }
      break

    case 'update':
      if (payload && typeof payload === 'object') {
        await plannerDb.updateEvent(resourceId, payload as any)
      }
      break

    case 'delete':
      await plannerDb.deleteEvent(resourceId, true)
      break
  }
}

/**
 * Process strand operations
 */
async function processStrandOperation(
  type: 'create' | 'update' | 'delete',
  resourceId: string,
  payload: unknown
): Promise<void> {
  // Strand sync will be handled by the strand sync service
  // For now, just log the operation
  console.log(`[SyncProcessor] Strand operation: ${type} ${resourceId}`, payload)
}

/**
 * Retry failed operations
 */
export async function retryFailedOperations(
  onProgress?: SyncProgressCallback
): Promise<SyncResult> {
  const queue = await getSyncQueue()
  const retryCount = await queue.retryFailed()

  if (retryCount === 0) {
    return { success: true, processed: 0, failed: 0, errors: [] }
  }

  console.log(`[SyncProcessor] Retrying ${retryCount} failed operations`)
  return processPendingSync(onProgress)
}

/**
 * Clear all failed operations
 */
export async function clearFailedOperations(): Promise<number> {
  const queue = await getSyncQueue()
  return queue.clearFailed()
}

/**
 * Get sync processor status
 */
export async function getSyncStatus(): Promise<{
  hasPending: boolean
  pendingCount: number
  failedCount: number
  isProcessing: boolean
}> {
  const queue = await getSyncQueue()
  const stats = await queue.getStats()

  return {
    hasPending: stats.pending > 0,
    pendingCount: stats.pending,
    failedCount: stats.failed,
    isProcessing: stats.inProgress > 0,
  }
}
