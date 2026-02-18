/**
 * useUnsavedChangesWarning Hook
 * @module codex/hooks/useUnsavedChangesWarning
 *
 * @description
 * Provides browser-level warning when user attempts to leave
 * with unsaved changes. Shows native browser dialog on page unload.
 */

import { useEffect, useCallback, useRef, useState } from 'react'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

export interface UseUnsavedChangesWarningOptions {
  /** Whether there are unsaved changes */
  hasUnsavedChanges: boolean
  /** Custom message (note: most browsers ignore this and show their own message) */
  message?: string
  /** Callback to run before showing warning (optional) */
  onBeforeUnload?: () => void
}

export interface UseUnsavedChangesWarningReturn {
  /** Manually trigger the warning check */
  checkForChanges: () => boolean
  /** Mark changes as saved (clears warning) */
  markAsSaved: () => void
  /** Force enable warning regardless of hasUnsavedChanges */
  forceWarning: () => void
}

/* ═══════════════════════════════════════════════════════════════════════════
   HOOK: Browser Unload Warning
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Hook to warn users about unsaved changes before leaving the page
 *
 * @example
 * ```tsx
 * const { markAsSaved } = useUnsavedChangesWarning({
 *   hasUnsavedChanges: isDirty,
 *   message: 'You have unsaved changes. Are you sure you want to leave?'
 * })
 *
 * const handleSave = async () => {
 *   await saveData()
 *   markAsSaved()
 * }
 * ```
 */
export function useUnsavedChangesWarning({
  hasUnsavedChanges,
  message = 'You have unsaved changes. Are you sure you want to leave?',
  onBeforeUnload,
}: UseUnsavedChangesWarningOptions): UseUnsavedChangesWarningReturn {
  const forceWarningRef = useRef(false)
  const savedRef = useRef(false)

  // Handle beforeunload event
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Check if we should show warning
      const shouldWarn = (hasUnsavedChanges || forceWarningRef.current) && !savedRef.current

      if (shouldWarn) {
        // Run callback if provided
        onBeforeUnload?.()

        // Prevent default browser behavior
        e.preventDefault()
        // For older browsers, set returnValue
        e.returnValue = message
        // Return message (though modern browsers typically ignore this)
        return message
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [hasUnsavedChanges, message, onBeforeUnload])

  // Reset saved state when hasUnsavedChanges changes
  useEffect(() => {
    if (hasUnsavedChanges) {
      savedRef.current = false
    }
  }, [hasUnsavedChanges])

  // Manually check for changes
  const checkForChanges = useCallback((): boolean => {
    return (hasUnsavedChanges || forceWarningRef.current) && !savedRef.current
  }, [hasUnsavedChanges])

  // Mark changes as saved
  const markAsSaved = useCallback(() => {
    savedRef.current = true
    forceWarningRef.current = false
  }, [])

  // Force enable warning
  const forceWarning = useCallback(() => {
    forceWarningRef.current = true
    savedRef.current = false
  }, [])

  return {
    checkForChanges,
    markAsSaved,
    forceWarning,
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   HOOK: Modal Close Warning
═══════════════════════════════════════════════════════════════════════════ */

export interface UseModalCloseWarningOptions {
  /** Whether there are unsaved changes */
  hasUnsavedChanges: boolean
  /** Callback when user confirms they want to close */
  onConfirmClose: () => void
  /** Custom confirmation message */
  message?: string
}

export interface UseModalCloseWarningReturn {
  /** Handler for close button that checks for unsaved changes */
  handleClose: () => void
  /** Whether confirmation dialog should be shown */
  showConfirmation: boolean
  /** Confirm closing (user chose to discard changes) */
  confirmClose: () => void
  /** Cancel closing (user chose to keep editing) */
  cancelClose: () => void
}

/**
 * Hook to warn users when closing a modal with unsaved changes
 *
 * @example
 * ```tsx
 * const { handleClose, showConfirmation, confirmClose, cancelClose } = useModalCloseWarning({
 *   hasUnsavedChanges: isDirty,
 *   onConfirmClose: onClose,
 * })
 *
 * return (
 *   <>
 *     <button onClick={handleClose}>Close</button>
 *     {showConfirmation && (
 *       <ConfirmDialog
 *         onConfirm={confirmClose}
 *         onCancel={cancelClose}
 *       />
 *     )}
 *   </>
 * )
 * ```
 */
export function useModalCloseWarning({
  hasUnsavedChanges,
  onConfirmClose,
}: UseModalCloseWarningOptions): UseModalCloseWarningReturn {
  const [showConfirmation, setShowConfirmation] = useState(false)

  const handleClose = useCallback(() => {
    if (hasUnsavedChanges) {
      setShowConfirmation(true)
    } else {
      onConfirmClose()
    }
  }, [hasUnsavedChanges, onConfirmClose])

  const confirmClose = useCallback(() => {
    setShowConfirmation(false)
    onConfirmClose()
  }, [onConfirmClose])

  const cancelClose = useCallback(() => {
    setShowConfirmation(false)
  }, [])

  return {
    handleClose,
    showConfirmation,
    confirmClose,
    cancelClose,
  }
}

export default useUnsavedChangesWarning
