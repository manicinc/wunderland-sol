'use client'

import { useState, useCallback, useRef } from 'react'

// Types for tree sync operations
export type SyncAction = 
  | { type: 'move'; sourcePath: string; targetPath: string }
  | { type: 'rename'; path: string; newName: string }
  | { type: 'delete'; path: string }
  | { type: 'create'; path: string; nodeType: 'weave' | 'loom' | 'strand'; content?: string }

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error'

interface SyncQueueItem {
  id: string
  action: SyncAction
  status: SyncStatus
  error?: string
  timestamp: number
}

interface UseTreeSyncOptions {
  /** GitHub owner */
  owner: string
  /** GitHub repo */
  repo: string
  /** Branch to sync to */
  branch: string
  /** Callback when sync completes */
  onSyncComplete?: (action: SyncAction, success: boolean) => void
  /** Callback when tree needs refresh */
  onTreeRefresh?: () => void
}

interface UseTreeSyncReturn {
  /** Queue of pending/processing sync actions */
  syncQueue: SyncQueueItem[]
  /** Overall sync status */
  isSyncing: boolean
  /** Queue a move action */
  queueMove: (sourcePath: string, targetPath: string) => string
  /** Queue a rename action */
  queueRename: (path: string, newName: string) => string
  /** Queue a delete action */
  queueDelete: (path: string) => string
  /** Queue a create action */
  queueCreate: (path: string, nodeType: 'weave' | 'loom' | 'strand', content?: string) => string
  /** Process all queued actions */
  processQueue: () => Promise<void>
  /** Clear completed/failed items from queue */
  clearCompleted: () => void
  /** Retry a failed action */
  retryAction: (id: string) => void
}

/**
 * Hook for syncing tree changes to GitHub
 * 
 * Provides optimistic updates with background sync:
 * - Local tree updates immediately
 * - Changes queue for GitHub sync
 * - Progressive feedback to user
 */
export function useTreeSync(options: UseTreeSyncOptions): UseTreeSyncReturn {
  const { owner, repo, branch, onSyncComplete, onTreeRefresh } = options
  
  const [syncQueue, setSyncQueue] = useState<SyncQueueItem[]>([])
  const [isSyncing, setIsSyncing] = useState(false)
  const processingRef = useRef(false)

  // Generate unique ID for queue items
  const generateId = () => `sync-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

  // Add action to queue
  const addToQueue = useCallback((action: SyncAction): string => {
    const id = generateId()
    const item: SyncQueueItem = {
      id,
      action,
      status: 'idle',
      timestamp: Date.now()
    }
    setSyncQueue(prev => [...prev, item])
    return id
  }, [])

  // Queue a move action
  const queueMove = useCallback((sourcePath: string, targetPath: string): string => {
    return addToQueue({ type: 'move', sourcePath, targetPath })
  }, [addToQueue])

  // Queue a rename action
  const queueRename = useCallback((path: string, newName: string): string => {
    return addToQueue({ type: 'rename', path, newName })
  }, [addToQueue])

  // Queue a delete action
  const queueDelete = useCallback((path: string): string => {
    return addToQueue({ type: 'delete', path })
  }, [addToQueue])

  // Queue a create action
  const queueCreate = useCallback((path: string, nodeType: 'weave' | 'loom' | 'strand', content?: string): string => {
    return addToQueue({ type: 'create', path, nodeType, content })
  }, [addToQueue])

  // Update item status in queue
  const updateItemStatus = useCallback((id: string, status: SyncStatus, error?: string) => {
    setSyncQueue(prev => prev.map(item => 
      item.id === id ? { ...item, status, error } : item
    ))
  }, [])

  // Process a single sync action
  const processSyncAction = useCallback(async (item: SyncQueueItem): Promise<boolean> => {
    const { action } = item
    
    try {
      updateItemStatus(item.id, 'syncing')

      // Call the appropriate GitHub API based on action type
      const response = await fetch('/api/github/tree-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner,
          repo,
          branch,
          action
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Sync failed')
      }

      updateItemStatus(item.id, 'success')
      onSyncComplete?.(action, true)
      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      updateItemStatus(item.id, 'error', errorMessage)
      onSyncComplete?.(action, false)
      return false
    }
  }, [owner, repo, branch, updateItemStatus, onSyncComplete])

  // Process all pending items in queue
  const processQueue = useCallback(async () => {
    if (processingRef.current) return
    processingRef.current = true
    setIsSyncing(true)

    try {
      const pendingItems = syncQueue.filter(item => item.status === 'idle')
      
      for (const item of pendingItems) {
        await processSyncAction(item)
      }

      // Refresh tree after all actions complete
      if (pendingItems.length > 0) {
        onTreeRefresh?.()
      }
    } finally {
      processingRef.current = false
      setIsSyncing(false)
    }
  }, [syncQueue, processSyncAction, onTreeRefresh])

  // Clear completed/failed items
  const clearCompleted = useCallback(() => {
    setSyncQueue(prev => prev.filter(item => item.status === 'idle' || item.status === 'syncing'))
  }, [])

  // Retry a failed action
  const retryAction = useCallback((id: string) => {
    setSyncQueue(prev => prev.map(item =>
      item.id === id ? { ...item, status: 'idle', error: undefined } : item
    ))
  }, [])

  return {
    syncQueue,
    isSyncing,
    queueMove,
    queueRename,
    queueDelete,
    queueCreate,
    processQueue,
    clearCompleted,
    retryAction
  }
}

export default useTreeSync
