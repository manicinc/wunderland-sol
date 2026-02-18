/**
 * Sync Queue - IndexedDB-based offline operation queue
 * @module lib/sync/syncQueue
 *
 * Queues operations when offline and processes them when back online.
 */

import {
  type SyncOperation,
  type SyncOperationType,
  type SyncPriority,
  type SyncOperationStatus,
  type SyncQueueStats,
  type SyncEvent,
  type SyncEventListener,
} from './types'

const DB_NAME = 'frame-sync-queue'
const DB_VERSION = 1
const STORE_OPERATIONS = 'operations'

/**
 * Priority weights for sorting
 */
const PRIORITY_WEIGHTS: Record<SyncPriority, number> = {
  critical: 4,
  high: 3,
  normal: 2,
  low: 1,
}

/**
 * Maximum retry attempts before marking as failed
 */
const MAX_RETRY_ATTEMPTS = 3

/**
 * Sync Queue class
 */
export class SyncQueue {
  private db: IDBDatabase | null = null
  private initPromise: Promise<void> | null = null
  private listeners: Set<SyncEventListener> = new Set()
  private isProcessing = false

  /**
   * Initialize the database
   */
  async init(): Promise<void> {
    if (this.db) return
    if (this.initPromise) return this.initPromise

    this.initPromise = new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        console.warn('[SyncQueue] IndexedDB not available')
        resolve()
        return
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => {
        console.error('[SyncQueue] Failed to open database:', request.error)
        reject(request.error)
      }

      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        if (!db.objectStoreNames.contains(STORE_OPERATIONS)) {
          const store = db.createObjectStore(STORE_OPERATIONS, { keyPath: 'id' })
          store.createIndex('status', 'status', { unique: false })
          store.createIndex('priority', 'priority', { unique: false })
          store.createIndex('type', 'type', { unique: false })
          store.createIndex('createdAt', 'createdAt', { unique: false })
          store.createIndex('resourceId', 'resourceId', { unique: false })
        }
      }
    })

    await this.initPromise
  }

  /**
   * Generate a unique operation ID
   */
  private generateId(): string {
    return `sync-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  }

  /**
   * Add an operation to the queue
   */
  async enqueue(
    type: SyncOperationType,
    resourceType: string,
    resourceId: string,
    payload: unknown,
    priority: SyncPriority = 'normal'
  ): Promise<SyncOperation> {
    await this.init()
    if (!this.db) throw new Error('Database not available')

    const operation: SyncOperation = {
      id: this.generateId(),
      type,
      priority,
      status: 'pending',
      resourceType,
      resourceId,
      payload,
      createdAt: new Date().toISOString(),
      attemptCount: 0,
    }

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_OPERATIONS, 'readwrite')
      const store = tx.objectStore(STORE_OPERATIONS)
      const request = store.add(operation)

      request.onsuccess = () => {
        this.emit({ type: 'operation-queued', operation, timestamp: operation.createdAt })
        resolve(operation)
      }
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Get all pending operations, sorted by priority and age
   */
  async getPendingOperations(): Promise<SyncOperation[]> {
    await this.init()
    if (!this.db) return []

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_OPERATIONS, 'readonly')
      const store = tx.objectStore(STORE_OPERATIONS)
      const index = store.index('status')
      const request = index.getAll('pending')

      request.onsuccess = () => {
        const operations: SyncOperation[] = request.result || []
        // Sort by priority (high first) then by age (oldest first)
        operations.sort((a: SyncOperation, b: SyncOperation) => {
          const priorityDiff = PRIORITY_WEIGHTS[b.priority] - PRIORITY_WEIGHTS[a.priority]
          if (priorityDiff !== 0) return priorityDiff
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        })
        resolve(operations)
      }
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Get operations by status
   */
  async getOperationsByStatus(status: SyncOperationStatus): Promise<SyncOperation[]> {
    await this.init()
    if (!this.db) return []

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_OPERATIONS, 'readonly')
      const store = tx.objectStore(STORE_OPERATIONS)
      const index = store.index('status')
      const request = index.getAll(status)

      request.onsuccess = () => resolve(request.result || [])
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Get operations for a specific resource
   */
  async getOperationsForResource(resourceId: string): Promise<SyncOperation[]> {
    await this.init()
    if (!this.db) return []

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_OPERATIONS, 'readonly')
      const store = tx.objectStore(STORE_OPERATIONS)
      const index = store.index('resourceId')
      const request = index.getAll(resourceId)

      request.onsuccess = () => resolve(request.result || [])
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Update an operation
   */
  async updateOperation(operation: SyncOperation): Promise<void> {
    await this.init()
    if (!this.db) return

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_OPERATIONS, 'readwrite')
      const store = tx.objectStore(STORE_OPERATIONS)
      const request = store.put(operation)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Mark operation as in-progress
   */
  async markInProgress(operationId: string): Promise<void> {
    const operation = await this.getOperation(operationId)
    if (!operation) return

    operation.status = 'in-progress'
    operation.lastAttemptAt = new Date().toISOString()
    operation.attemptCount += 1

    await this.updateOperation(operation)
    this.emit({ type: 'operation-started', operation, timestamp: operation.lastAttemptAt })
  }

  /**
   * Mark operation as completed and remove from queue
   */
  async markCompleted(operationId: string): Promise<void> {
    const operation = await this.getOperation(operationId)
    if (!operation) return

    operation.status = 'completed'
    const timestamp = new Date().toISOString()

    await this.removeOperation(operationId)
    this.emit({ type: 'operation-completed', operation, timestamp })
  }

  /**
   * Mark operation as failed
   */
  async markFailed(operationId: string, errorMessage: string): Promise<void> {
    const operation = await this.getOperation(operationId)
    if (!operation) return

    operation.errorMessage = errorMessage

    if (operation.attemptCount >= MAX_RETRY_ATTEMPTS) {
      operation.status = 'failed'
    } else {
      operation.status = 'pending' // Will be retried
    }

    await this.updateOperation(operation)
    this.emit({
      type: 'operation-failed',
      operation,
      timestamp: new Date().toISOString(),
      details: { errorMessage },
    })
  }

  /**
   * Mark operation as having a conflict
   */
  async markConflict(
    operationId: string,
    localState: unknown,
    serverState: unknown,
    conflictFields: string[]
  ): Promise<void> {
    const operation = await this.getOperation(operationId)
    if (!operation) return

    operation.status = 'conflict'
    operation.conflictData = {
      localState,
      serverState,
      conflictFields,
      autoResolvable: conflictFields.length === 0,
    }

    await this.updateOperation(operation)
    this.emit({
      type: 'conflict-detected',
      operation,
      timestamp: new Date().toISOString(),
    })
  }

  /**
   * Get a single operation by ID
   */
  async getOperation(operationId: string): Promise<SyncOperation | null> {
    await this.init()
    if (!this.db) return null

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_OPERATIONS, 'readonly')
      const store = tx.objectStore(STORE_OPERATIONS)
      const request = store.get(operationId)

      request.onsuccess = () => resolve(request.result || null)
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Remove an operation from the queue
   */
  async removeOperation(operationId: string): Promise<void> {
    await this.init()
    if (!this.db) return

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_OPERATIONS, 'readwrite')
      const store = tx.objectStore(STORE_OPERATIONS)
      const request = store.delete(operationId)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Get queue statistics
   */
  async getStats(): Promise<SyncQueueStats> {
    await this.init()
    if (!this.db) {
      return { pending: 0, inProgress: 0, failed: 0, conflicts: 0, total: 0 }
    }

    const [pending, inProgress, failed, conflicts] = await Promise.all([
      this.getOperationsByStatus('pending'),
      this.getOperationsByStatus('in-progress'),
      this.getOperationsByStatus('failed'),
      this.getOperationsByStatus('conflict'),
    ])

    const allPending = pending.sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    )

    return {
      pending: pending.length,
      inProgress: inProgress.length,
      failed: failed.length,
      conflicts: conflicts.length,
      total: pending.length + inProgress.length + failed.length + conflicts.length,
      oldestPending: allPending[0]?.createdAt,
    }
  }

  /**
   * Clear all completed operations
   */
  async clearCompleted(): Promise<number> {
    const completed = await this.getOperationsByStatus('completed')
    for (const op of completed) {
      await this.removeOperation(op.id)
    }
    return completed.length
  }

  /**
   * Clear all failed operations
   */
  async clearFailed(): Promise<number> {
    const failed = await this.getOperationsByStatus('failed')
    for (const op of failed) {
      await this.removeOperation(op.id)
    }
    return failed.length
  }

  /**
   * Retry all failed operations
   */
  async retryFailed(): Promise<number> {
    const failed = await this.getOperationsByStatus('failed')
    for (const op of failed) {
      op.status = 'pending'
      op.attemptCount = 0
      op.errorMessage = undefined
      await this.updateOperation(op)
    }
    return failed.length
  }

  /**
   * Add event listener
   */
  addEventListener(listener: SyncEventListener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /**
   * Emit event to all listeners
   */
  private emit(event: SyncEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event)
      } catch (e) {
        console.error('[SyncQueue] Listener error:', e)
      }
    }
  }

  /**
   * Close database connection
   */
  close(): void {
    if (this.db) {
      this.db.close()
      this.db = null
      this.initPromise = null
    }
  }
}

// Singleton instance
let queueInstance: SyncQueue | null = null

/**
 * Get the singleton SyncQueue instance
 */
export async function getSyncQueue(): Promise<SyncQueue> {
  if (!queueInstance) {
    queueInstance = new SyncQueue()
    await queueInstance.init()
  }
  return queueInstance
}
