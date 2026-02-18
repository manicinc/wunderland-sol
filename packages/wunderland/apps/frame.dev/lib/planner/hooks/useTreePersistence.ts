/**
 * useTreePersistence Hook
 *
 * Manages persistence for drag-and-drop tree operations.
 * Handles auto-save to SQLite, vault sync, and publish flow.
 *
 * @module lib/planner/hooks/useTreePersistence
 */

'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { getContentStore } from '@/lib/content/sqliteStore'
import { checkVaultStatus, batchMoveVaultItems, getStoredVaultHandle } from '@/lib/vault'
import type { MoveOperation } from '@/components/quarry/tree/types'

// ============================================================================
// TYPES
// ============================================================================

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'
export type PublishTarget = 'github' | 'vault' | 'sqlite'

export interface TreePersistenceState {
  /** Pending move operations not yet published */
  pendingMoves: MoveOperation[]
  /** Whether there are unsaved changes */
  isDirty: boolean
  /** Last successful save timestamp */
  lastSaved: Date | null
  /** Current save status */
  saveStatus: SaveStatus
  /** Detected publish target */
  publishTarget: PublishTarget
  /** Last error message if any */
  lastError: string | null
}

export interface UseTreePersistenceOptions {
  /** Strand slug for context */
  strandSlug?: string
  /** Auto-save delay in ms (default: 0 for immediate) */
  autoSaveDelay?: number
  /** Callback when save completes */
  onSaveComplete?: (success: boolean) => void
  /** Callback when publish completes */
  onPublishComplete?: (success: boolean, target: PublishTarget) => void
}

export interface UseTreePersistenceReturn {
  /** Current persistence state */
  state: TreePersistenceState
  /** Add move operations to pending queue */
  addMoves: (operations: MoveOperation[]) => void
  /** Save pending moves to local storage (SQLite) */
  saveLocally: () => Promise<boolean>
  /** Publish changes to target (vault or GitHub) */
  publish: () => Promise<boolean>
  /** Clear all pending moves */
  clearPending: () => void
  /** Check if there are pending moves */
  hasPendingMoves: boolean
  /** Get count of pending moves */
  pendingCount: number
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

/**
 * Hook for managing tree persistence with auto-save and publish flow
 */
export function useTreePersistence(
  options: UseTreePersistenceOptions = {}
): UseTreePersistenceReturn {
  const { autoSaveDelay = 0, onSaveComplete, onPublishComplete } = options

  // State
  const [pendingMoves, setPendingMoves] = useState<MoveOperation[]>([])
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [publishTarget, setPublishTarget] = useState<PublishTarget>('sqlite')
  const [lastError, setLastError] = useState<string | null>(null)

  // Refs for debouncing
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isMounted = useRef(true)

  // Detect publish target on mount
  useEffect(() => {
    isMounted.current = true

    const detectTarget = async () => {
      // Check for GitHub PAT first
      const githubPAT = localStorage.getItem('openstrand_github_pat')
      if (githubPAT) {
        setPublishTarget('github')
        return
      }

      // Check for vault
      try {
        const vaultStatus = await checkVaultStatus()
        if (vaultStatus.status === 'ready') {
          setPublishTarget('vault')
          return
        }
      } catch {
        // Vault not available
      }

      // Default to SQLite only
      setPublishTarget('sqlite')
    }

    detectTarget()

    return () => {
      isMounted.current = false
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

  // Add move operations to pending queue
  const addMoves = useCallback((operations: MoveOperation[]) => {
    setPendingMoves(prev => [...prev, ...operations])
    setLastError(null)

    // Trigger auto-save if configured
    if (autoSaveDelay >= 0) {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }

      if (autoSaveDelay === 0) {
        // Immediate save
        void saveLocally()
      } else {
        // Debounced save
        saveTimeoutRef.current = setTimeout(() => {
          void saveLocally()
        }, autoSaveDelay)
      }
    }
  }, [autoSaveDelay])

  // Save pending moves to SQLite
  const saveLocally = useCallback(async (): Promise<boolean> => {
    if (pendingMoves.length === 0) {
      return true
    }

    setSaveStatus('saving')
    setLastError(null)

    try {
      const store = getContentStore()
      await store.initialize()

      const result = await store.batchUpdatePaths(pendingMoves)

      if (!isMounted.current) return false

      if (result.success) {
        setSaveStatus('saved')
        setLastSaved(new Date())

        // Auto-reset status after 2 seconds
        setTimeout(() => {
          if (isMounted.current) {
            setSaveStatus('idle')
          }
        }, 2000)

        onSaveComplete?.(true)
        return true
      } else {
        setSaveStatus('error')
        setLastError(result.errors.join(', '))
        onSaveComplete?.(false)
        return false
      }
    } catch (error) {
      if (!isMounted.current) return false

      const errorMsg = error instanceof Error ? error.message : 'Save failed'
      setSaveStatus('error')
      setLastError(errorMsg)
      onSaveComplete?.(false)
      return false
    }
  }, [pendingMoves, onSaveComplete])

  // Publish changes to target
  const publish = useCallback(async (): Promise<boolean> => {
    if (pendingMoves.length === 0) {
      return true
    }

    setSaveStatus('saving')
    setLastError(null)

    try {
      switch (publishTarget) {
        case 'github': {
          // GitHub publish is handled by MovePublishModal
          // Just return true to signal ready for modal
          setSaveStatus('idle')
          return true
        }

        case 'vault': {
          // Move files in vault
          const vaultHandle = await getStoredVaultHandle()
          if (!vaultHandle) {
            throw new Error('Vault not available')
          }

          const result = await batchMoveVaultItems(vaultHandle, pendingMoves)

          if (!isMounted.current) return false

          if (result.success) {
            // Clear pending after successful vault publish
            setPendingMoves([])
            setSaveStatus('saved')
            setLastSaved(new Date())

            setTimeout(() => {
              if (isMounted.current) {
                setSaveStatus('idle')
              }
            }, 2000)

            onPublishComplete?.(true, 'vault')
            return true
          } else {
            setSaveStatus('error')
            setLastError(result.errors.join(', '))
            onPublishComplete?.(false, 'vault')
            return false
          }
        }

        case 'sqlite':
        default: {
          // SQLite-only mode - save is already done
          const success = await saveLocally()
          if (success) {
            setPendingMoves([])
            onPublishComplete?.(true, 'sqlite')
          } else {
            onPublishComplete?.(false, 'sqlite')
          }
          return success
        }
      }
    } catch (error) {
      if (!isMounted.current) return false

      const errorMsg = error instanceof Error ? error.message : 'Publish failed'
      setSaveStatus('error')
      setLastError(errorMsg)
      onPublishComplete?.(false, publishTarget)
      return false
    }
  }, [pendingMoves, publishTarget, saveLocally, onPublishComplete])

  // Clear pending moves
  const clearPending = useCallback(() => {
    setPendingMoves([])
    setLastError(null)
    setSaveStatus('idle')
  }, [])

  // Computed state
  const isDirty = pendingMoves.length > 0
  const hasPendingMoves = pendingMoves.length > 0
  const pendingCount = pendingMoves.length

  return {
    state: {
      pendingMoves,
      isDirty,
      lastSaved,
      saveStatus,
      publishTarget,
      lastError,
    },
    addMoves,
    saveLocally,
    publish,
    clearPending,
    hasPendingMoves,
    pendingCount,
  }
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Format a publish target for display
 */
export function formatPublishTarget(target: PublishTarget): string {
  switch (target) {
    case 'github':
      return 'GitHub'
    case 'vault':
      return 'Local Vault'
    case 'sqlite':
      return 'Local Database'
  }
}

/**
 * Get icon name for publish target
 */
export function getPublishTargetIcon(target: PublishTarget): string {
  switch (target) {
    case 'github':
      return 'github'
    case 'vault':
      return 'folder'
    case 'sqlite':
      return 'database'
  }
}
