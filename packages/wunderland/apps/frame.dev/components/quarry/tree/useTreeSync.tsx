/**
 * Tree Sync Service with Auto-Save and Publishing
 * @module codex/tree/useTreeSync
 * 
 * @remarks
 * Provides smooth UX for tree modifications:
 * - Auto-saves changes locally
 * - Queues changes for publishing
 * - Shows processing/loading states
 * - Toast notifications for feedback
 * - Backend sync with retry logic
 */

'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import type { CodexTreeNode } from './types'

// ==================== Types ====================

export type TreeChangeType = 'move' | 'rename' | 'delete' | 'create'

export interface TreeChange {
  id: string
  type: TreeChangeType
  timestamp: number
  data: {
    nodePath: string
    nodeType: 'weave' | 'loom' | 'strand' | 'folder'
    oldParentPath?: string
    newParentPath?: string
    oldName?: string
    newName?: string
    content?: string
  }
  status: 'pending' | 'processing' | 'synced' | 'failed'
  retryCount: number
}

export interface SyncStatus {
  pendingChanges: number
  isSyncing: boolean
  lastSyncedAt: Date | null
  syncError: string | null
  isProcessingBackend: boolean
}

interface TreeSyncCallbacks {
  onShowToast: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void
  onShowActionToast: (options: {
    message: string
    type: 'action'
    actions: { label: string; onClick: () => void; variant?: 'primary' | 'secondary' }[]
    persistent?: boolean
  }) => string
  onDismissToast: (id: string) => void
  onLocalSave?: (changes: TreeChange[]) => void
  onPublish?: (changes: TreeChange[]) => Promise<{ success: boolean; error?: string }>
  onBackendProcess?: (changes: TreeChange[]) => Promise<{ success: boolean; processingId?: string; error?: string }>
}

// ==================== Constants ====================

const AUTO_SAVE_DELAY = 2000 // 2 seconds debounce
const PUBLISH_REMINDER_DELAY = 10000 // 10 seconds after changes
const LOCAL_STORAGE_KEY = 'codex-tree-pending-changes'
const MAX_RETRY_COUNT = 3

// ==================== Hook ====================

export function useTreeSync(callbacks: TreeSyncCallbacks) {
  const [changes, setChanges] = useState<TreeChange[]>([])
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    pendingChanges: 0,
    isSyncing: false,
    lastSyncedAt: null,
    syncError: null,
    isProcessingBackend: false,
  })
  
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reminderTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reminderToastIdRef = useRef<string | null>(null)
  const processingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  
  // Load pending changes from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved) as TreeChange[]
        // Only load pending changes
        const pending = parsed.filter(c => c.status === 'pending')
        if (pending.length > 0) {
          setChanges(pending)
          setSyncStatus(prev => ({ ...prev, pendingChanges: pending.length }))
          
          // Show toast about pending changes
          callbacks.onShowToast(
            `${pending.length} unpublished change${pending.length > 1 ? 's' : ''} restored`,
            'info'
          )
        }
      }
    } catch (e) {
      console.warn('Failed to load pending changes:', e)
    }
  }, [])
  
  // Save to localStorage whenever changes update
  useEffect(() => {
    const pending = changes.filter(c => c.status === 'pending')
    if (pending.length > 0) {
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(pending))
      } catch (e) {
        console.warn('Failed to save pending changes:', e)
      }
    } else {
      localStorage.removeItem(LOCAL_STORAGE_KEY)
    }
    
    setSyncStatus(prev => ({ ...prev, pendingChanges: pending.length }))
  }, [changes])
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
      if (reminderTimeoutRef.current) clearTimeout(reminderTimeoutRef.current)
      if (processingIntervalRef.current) clearInterval(processingIntervalRef.current)
    }
  }, [])
  
  /**
   * Add a change to the queue
   */
  const queueChange = useCallback((
    type: TreeChangeType,
    data: TreeChange['data']
  ) => {
    const change: TreeChange = {
      id: `change-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      type,
      timestamp: Date.now(),
      data,
      status: 'pending',
      retryCount: 0,
    }
    
    setChanges(prev => [...prev, change])
    
    // Show immediate feedback
    const actionLabels = {
      move: 'moved',
      rename: 'renamed',
      delete: 'deleted',
      create: 'created',
    }
    callbacks.onShowToast(
      `Item ${actionLabels[type]} • Auto-saved locally`,
      'success'
    )
    
    // Debounced local save callback
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(() => {
      if (callbacks.onLocalSave) {
        callbacks.onLocalSave(changes.filter(c => c.status === 'pending'))
      }
    }, AUTO_SAVE_DELAY)
    
    // Clear any existing reminder toast
    if (reminderToastIdRef.current) {
      callbacks.onDismissToast(reminderToastIdRef.current)
    }
    
    // Schedule publish reminder
    if (reminderTimeoutRef.current) clearTimeout(reminderTimeoutRef.current)
    reminderTimeoutRef.current = setTimeout(() => {
      const pendingCount = changes.filter(c => c.status === 'pending').length + 1
      reminderToastIdRef.current = callbacks.onShowActionToast({
        message: pendingCount === 1 
          ? 'You have an unpublished change' 
          : `You have ${pendingCount} unpublished changes`,
        type: 'action',
        actions: [
          {
            label: 'Publish Now',
            onClick: () => publish(),
            variant: 'primary',
          },
          {
            label: 'Later',
            onClick: () => {}, // Just dismiss
            variant: 'secondary',
          },
        ],
        persistent: false,
      })
    }, PUBLISH_REMINDER_DELAY)
    
    return change.id
  }, [changes, callbacks])
  
  /**
   * Publish all pending changes
   */
  const publish = useCallback(async () => {
    const pending = changes.filter(c => c.status === 'pending')
    if (pending.length === 0) {
      callbacks.onShowToast('No changes to publish', 'info')
      return { success: true }
    }
    
    // Clear reminder toast
    if (reminderToastIdRef.current) {
      callbacks.onDismissToast(reminderToastIdRef.current)
      reminderToastIdRef.current = null
    }
    
    setSyncStatus(prev => ({ ...prev, isSyncing: true, syncError: null }))
    
    // Mark changes as processing
    setChanges(prev => prev.map(c => 
      c.status === 'pending' ? { ...c, status: 'processing' as const } : c
    ))
    
    // Show processing toast
    const processingToastId = callbacks.onShowActionToast({
      message: `Publishing ${pending.length} change${pending.length > 1 ? 's' : ''}...`,
      type: 'action',
      actions: [],
      persistent: true,
    })
    
    try {
      // Step 1: Publish to repository/storage
      if (callbacks.onPublish) {
        const result = await callbacks.onPublish(pending)
        if (!result.success) {
          throw new Error(result.error || 'Publish failed')
        }
      }
      
      // Step 2: Trigger backend processing
      if (callbacks.onBackendProcess) {
        callbacks.onDismissToast(processingToastId)
        
        const backendToastId = callbacks.onShowActionToast({
          message: 'Processing updates... Tags and entities will refresh shortly',
          type: 'action',
          actions: [],
          persistent: true,
        })
        
        setSyncStatus(prev => ({ ...prev, isProcessingBackend: true }))
        
        const backendResult = await callbacks.onBackendProcess(pending)
        
        callbacks.onDismissToast(backendToastId)
        
        if (!backendResult.success) {
          callbacks.onShowToast(
            'Changes published, but indexing delayed. Will retry.',
            'warning'
          )
        } else {
          callbacks.onShowToast(
            'Published successfully! Codex is updating...',
            'success'
          )
        }
        
        setSyncStatus(prev => ({ ...prev, isProcessingBackend: false }))
      } else {
        callbacks.onDismissToast(processingToastId)
        callbacks.onShowToast('Published successfully!', 'success')
      }
      
      // Mark changes as synced
      setChanges(prev => prev.map(c => 
        c.status === 'processing' ? { ...c, status: 'synced' as const } : c
      ))
      
      // Clear synced changes after a delay
      setTimeout(() => {
        setChanges(prev => prev.filter(c => c.status !== 'synced'))
      }, 5000)
      
      setSyncStatus(prev => ({
        ...prev,
        isSyncing: false,
        lastSyncedAt: new Date(),
      }))
      
      return { success: true }
      
    } catch (error) {
      console.error('Publish failed:', error)
      
      callbacks.onDismissToast(processingToastId)
      
      // Mark changes as failed
      setChanges(prev => prev.map(c => 
        c.status === 'processing' 
          ? { ...c, status: 'failed' as const, retryCount: c.retryCount + 1 } 
          : c
      ))
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      callbacks.onShowToast(
        `Publish failed: ${errorMessage}. Changes saved locally.`,
        'error'
      )
      
      setSyncStatus(prev => ({
        ...prev,
        isSyncing: false,
        syncError: errorMessage,
      }))
      
      return { success: false, error: errorMessage }
    }
  }, [changes, callbacks])
  
  /**
   * Retry failed changes
   */
  const retryFailed = useCallback(async () => {
    const failed = changes.filter(c => c.status === 'failed' && c.retryCount < MAX_RETRY_COUNT)
    if (failed.length === 0) return { success: true }
    
    // Reset failed to pending
    setChanges(prev => prev.map(c => 
      c.status === 'failed' ? { ...c, status: 'pending' as const } : c
    ))
    
    // Then publish
    return publish()
  }, [changes, publish])
  
  /**
   * Discard pending changes
   */
  const discardChanges = useCallback(() => {
    const pending = changes.filter(c => c.status === 'pending')
    if (pending.length === 0) return
    
    setChanges(prev => prev.filter(c => c.status !== 'pending'))
    localStorage.removeItem(LOCAL_STORAGE_KEY)
    
    callbacks.onShowToast(`Discarded ${pending.length} unpublished change${pending.length > 1 ? 's' : ''}`, 'info')
  }, [changes, callbacks])
  
  /**
   * Get change summary for UI
   */
  const getChangeSummary = useCallback(() => {
    const pending = changes.filter(c => c.status === 'pending')
    const failed = changes.filter(c => c.status === 'failed')
    
    return {
      pending: pending.length,
      failed: failed.length,
      canRetry: failed.some(c => c.retryCount < MAX_RETRY_COUNT),
      changesByType: {
        move: pending.filter(c => c.type === 'move').length,
        rename: pending.filter(c => c.type === 'rename').length,
        delete: pending.filter(c => c.type === 'delete').length,
        create: pending.filter(c => c.type === 'create').length,
      },
    }
  }, [changes])
  
  return {
    // State
    changes,
    syncStatus,
    
    // Actions
    queueChange,
    publish,
    retryFailed,
    discardChanges,
    
    // Helpers
    getChangeSummary,
    
    // Convenience methods for tree operations
    queueMove: useCallback((nodePath: string, oldParentPath: string, newParentPath: string, nodeType: TreeChange['data']['nodeType']) => {
      return queueChange('move', { nodePath, oldParentPath, newParentPath, nodeType })
    }, [queueChange]),
    
    queueRename: useCallback((nodePath: string, oldName: string, newName: string, nodeType: TreeChange['data']['nodeType']) => {
      return queueChange('rename', { nodePath, oldName, newName, nodeType })
    }, [queueChange]),
    
    queueDelete: useCallback((nodePath: string, nodeType: TreeChange['data']['nodeType']) => {
      return queueChange('delete', { nodePath, nodeType })
    }, [queueChange]),
    
    queueCreate: useCallback((nodePath: string, nodeType: TreeChange['data']['nodeType'], content?: string) => {
      return queueChange('create', { nodePath, nodeType, content })
    }, [queueChange]),
  }
}

// ==================== Publish Status Indicator Component ====================

interface PublishStatusProps {
  syncStatus: SyncStatus
  changeSummary: ReturnType<ReturnType<typeof useTreeSync>['getChangeSummary']>
  onPublish: () => void
  onRetry: () => void
  onDiscard: () => void
  isDark?: boolean
}

export function PublishStatusIndicator({
  syncStatus,
  changeSummary,
  onPublish,
  onRetry,
  onDiscard,
  isDark = false,
}: PublishStatusProps) {
  if (changeSummary.pending === 0 && changeSummary.failed === 0 && !syncStatus.isSyncing) {
    return null
  }
  
  return (
    <div className={`
      flex items-center gap-2 px-3 py-2 rounded-lg border text-sm
      ${syncStatus.isSyncing 
        ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800' 
        : changeSummary.failed > 0 
          ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
          : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
      }
    `}>
      {/* Status icon */}
      {syncStatus.isSyncing ? (
        <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      ) : changeSummary.failed > 0 ? (
        <div className="w-4 h-4 rounded-full bg-red-500 flex items-center justify-center text-white text-xs">!</div>
      ) : (
        <div className="w-4 h-4 rounded-full bg-amber-500 flex items-center justify-center text-white text-xs">
          {changeSummary.pending}
        </div>
      )}
      
      {/* Status text */}
      <span className={`text-xs font-medium ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
        {syncStatus.isSyncing 
          ? syncStatus.isProcessingBackend 
            ? 'Updating Codex...' 
            : 'Publishing...'
          : changeSummary.failed > 0
            ? `${changeSummary.failed} failed`
            : `${changeSummary.pending} unpublished`
        }
      </span>
      
      {/* Actions */}
      {!syncStatus.isSyncing && (
        <div className="flex items-center gap-1 ml-auto">
          {changeSummary.failed > 0 && changeSummary.canRetry && (
            <button
              onClick={onRetry}
              className="px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
            >
              Retry
            </button>
          )}
          {changeSummary.pending > 0 && (
            <>
              <button
                onClick={onDiscard}
                className="px-2 py-1 text-xs font-medium text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded"
              >
                Discard
              </button>
              <button
                onClick={onPublish}
                className="px-2 py-1 text-xs font-medium text-white bg-indigo-500 hover:bg-indigo-600 rounded"
              >
                Publish
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}




















