/**
 * Delete Confirmation Hook for Quarry Codex
 * @module components/quarry/hooks/useDeleteConfirm
 * 
 * @description
 * Manages the state and logic for two-step delete confirmation.
 * Can be used with tree view, file list, or any deletable content.
 */

import { useState, useCallback } from 'react'
import type { DeleteTarget } from '../ui/common/DeleteConfirmModal'

export interface UseDeleteConfirmResult {
  /** Whether the confirmation modal is open */
  isOpen: boolean
  /** The target to be deleted (null if not deleting) */
  target: DeleteTarget | null
  /** Request deletion (shows the modal) */
  requestDelete: (target: DeleteTarget) => void
  /** Close the modal without deleting */
  cancelDelete: () => void
  /** Execute the deletion (called after confirmation) */
  confirmDelete: () => void
  /** Reset the state */
  reset: () => void
}

export interface UseDeleteConfirmOptions {
  /** Callback when deletion is confirmed */
  onDelete: (path: string) => void
  /** Callback after deletion is complete */
  onDeleteComplete?: (path: string) => void
}

/**
 * Hook for managing two-step delete confirmation
 */
export function useDeleteConfirm({
  onDelete,
  onDeleteComplete,
}: UseDeleteConfirmOptions): UseDeleteConfirmResult {
  const [isOpen, setIsOpen] = useState(false)
  const [target, setTarget] = useState<DeleteTarget | null>(null)
  
  const requestDelete = useCallback((newTarget: DeleteTarget) => {
    setTarget(newTarget)
    setIsOpen(true)
  }, [])
  
  const cancelDelete = useCallback(() => {
    setIsOpen(false)
    // Keep target for exit animation, then clear
    setTimeout(() => setTarget(null), 200)
  }, [])
  
  const confirmDelete = useCallback(() => {
    if (target) {
      onDelete(target.path)
      onDeleteComplete?.(target.path)
    }
    setIsOpen(false)
    setTimeout(() => setTarget(null), 200)
  }, [target, onDelete, onDeleteComplete])
  
  const reset = useCallback(() => {
    setIsOpen(false)
    setTarget(null)
  }, [])
  
  return {
    isOpen,
    target,
    requestDelete,
    cancelDelete,
    confirmDelete,
    reset,
  }
}

/**
 * Helper to create a DeleteTarget from a tree node
 */
export function createDeleteTarget(
  path: string,
  name: string,
  type: 'strand' | 'loom' | 'weave' | 'folder' | 'file',
  childCount?: number
): DeleteTarget {
  return {
    path,
    name,
    type,
    childCount,
  }
}

