/**
 * Modal Accessibility Hook
 * @module codex/hooks/useModalAccessibility
 * 
 * @description
 * Provides accessibility features for modals:
 * - Click outside to close
 * - Escape key to close
 * - Focus trap within modal
 * - Body scroll lock
 * - ARIA attributes management
 */

import { useEffect, useRef, useCallback } from 'react'

interface UseModalAccessibilityOptions {
  /** Whether the modal is open */
  isOpen: boolean
  /** Callback to close the modal */
  onClose: () => void
  /** Whether clicking outside should close (default: true) */
  closeOnClickOutside?: boolean
  /** Whether escape key should close (default: true) */
  closeOnEscape?: boolean
  /** Whether to trap focus within modal (default: true) */
  trapFocus?: boolean
  /** Whether to lock body scroll (default: true) */
  lockScroll?: boolean
  /** ID of the modal for ARIA (auto-generated if not provided) */
  modalId?: string
}

interface UseModalAccessibilityReturn {
  /** Ref to attach to modal backdrop/overlay */
  backdropRef: React.RefObject<HTMLDivElement>
  /** Ref to attach to modal content container */
  contentRef: React.RefObject<HTMLDivElement>
  /** Props to spread on modal content for accessibility */
  modalProps: {
    role: 'dialog'
    'aria-modal': true
    'aria-labelledby'?: string
    tabIndex: -1
  }
  /** Handler for backdrop click (call on backdrop onClick) */
  handleBackdropClick: (e: React.MouseEvent) => void
}

/**
 * Hook for modal accessibility features
 * 
 * @example
 * ```tsx
 * function MyModal({ isOpen, onClose }) {
 *   const { backdropRef, contentRef, modalProps, handleBackdropClick } = useModalAccessibility({
 *     isOpen,
 *     onClose,
 *   })
 *   
 *   if (!isOpen) return null
 *   
 *   return (
 *     <div ref={backdropRef} onClick={handleBackdropClick} className="modal-backdrop">
 *       <div ref={contentRef} {...modalProps} className="modal-content">
 *         <h2 id="modal-title">Modal Title</h2>
 *         <button onClick={onClose}>Close</button>
 *       </div>
 *     </div>
 *   )
 * }
 * ```
 */
export function useModalAccessibility({
  isOpen,
  onClose,
  closeOnClickOutside = true,
  closeOnEscape = true,
  trapFocus = true,
  lockScroll = true,
  modalId,
}: UseModalAccessibilityOptions): UseModalAccessibilityReturn {
  const backdropRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const previousActiveElement = useRef<HTMLElement | null>(null)
  const generatedId = useRef(`modal-${Math.random().toString(36).substr(2, 9)}`)
  
  const effectiveModalId = modalId || generatedId.current

  // Handle escape key
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown, true)
    return () => document.removeEventListener('keydown', handleKeyDown, true)
  }, [isOpen, closeOnEscape, onClose])

  // Handle body scroll lock
  useEffect(() => {
    if (!isOpen || !lockScroll) return

    const originalOverflow = document.body.style.overflow
    const originalPaddingRight = document.body.style.paddingRight
    
    // Calculate scrollbar width to prevent layout shift
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
    
    document.body.style.overflow = 'hidden'
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`
    }

    return () => {
      document.body.style.overflow = originalOverflow
      document.body.style.paddingRight = originalPaddingRight
    }
  }, [isOpen, lockScroll])

  // Handle focus management
  useEffect(() => {
    if (!isOpen) return

    // Store the previously focused element
    previousActiveElement.current = document.activeElement as HTMLElement

    // Focus the modal content
    const focusTimer = setTimeout(() => {
      if (contentRef.current) {
        // Try to focus the first focusable element
        const focusable = contentRef.current.querySelector<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        if (focusable) {
          focusable.focus()
        } else {
          contentRef.current.focus()
        }
      }
    }, 50)

    return () => {
      clearTimeout(focusTimer)
      // Restore focus when modal closes
      if (previousActiveElement.current && typeof previousActiveElement.current.focus === 'function') {
        previousActiveElement.current.focus()
      }
    }
  }, [isOpen])

  // Handle focus trap
  useEffect(() => {
    if (!isOpen || !trapFocus || !contentRef.current) return

    const modal = contentRef.current

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return

      const focusableElements = modal.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )

      if (focusableElements.length === 0) return

      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]

      if (e.shiftKey) {
        // Shift + Tab: going backwards
        if (document.activeElement === firstElement) {
          e.preventDefault()
          lastElement.focus()
        }
      } else {
        // Tab: going forwards
        if (document.activeElement === lastElement) {
          e.preventDefault()
          firstElement.focus()
        }
      }
    }

    document.addEventListener('keydown', handleTabKey)
    return () => document.removeEventListener('keydown', handleTabKey)
  }, [isOpen, trapFocus])

  // Handle click outside
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (!closeOnClickOutside) return
      
      // Only close if clicking the backdrop itself, not the content
      if (e.target === backdropRef.current || e.target === e.currentTarget) {
        e.preventDefault()
        e.stopPropagation()
        onClose()
      }
    },
    [closeOnClickOutside, onClose]
  )

  return {
    backdropRef,
    contentRef,
    modalProps: {
      role: 'dialog',
      'aria-modal': true,
      'aria-labelledby': `${effectiveModalId}-title`,
      tabIndex: -1,
    },
    handleBackdropClick,
  }
}

export default useModalAccessibility






