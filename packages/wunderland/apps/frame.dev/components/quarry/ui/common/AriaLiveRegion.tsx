/**
 * Aria Live Region Component
 * @module components/quarry/ui/common/AriaLiveRegion
 * 
 * @description
 * Accessible live region for announcing dynamic content changes to screen readers.
 * 
 * Features:
 * - Polite and assertive announcement modes
 * - Auto-clear after announcement
 * - Queue system for multiple announcements
 * - Context provider for app-wide announcements
 * 
 * @example
 * ```tsx
 * // Using the hook
 * const { announce } = useAriaAnnounce()
 * announce('Form saved successfully')
 * 
 * // Using the component directly
 * <AriaLiveRegion message="Loading complete" />
 * ```
 */

'use client'

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react'

// ============================================================================
// TYPES
// ============================================================================

type AriaLiveMode = 'polite' | 'assertive' | 'off'

interface Announcement {
  id: string
  message: string
  mode: AriaLiveMode
  timestamp: number
}

interface AriaLiveContextValue {
  /** Announce a message to screen readers */
  announce: (message: string, mode?: AriaLiveMode) => void
  /** Current announcements queue */
  announcements: Announcement[]
  /** Clear all announcements */
  clear: () => void
}

export interface AriaLiveRegionProps {
  /** Message to announce */
  message?: string
  /** Live region mode */
  mode?: AriaLiveMode
  /** Auto-clear after this many ms (0 = never) */
  clearAfter?: number
  /** Additional aria-atomic setting */
  atomic?: boolean
  /** Additional aria-relevant setting */
  relevant?: 'additions' | 'removals' | 'text' | 'all'
}

// ============================================================================
// CONTEXT
// ============================================================================

const AriaLiveContext = createContext<AriaLiveContextValue | null>(null)

// ============================================================================
// PROVIDER
// ============================================================================

export function AriaLiveProvider({ children }: { children: React.ReactNode }) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const clearTimers = useRef<Map<string, NodeJS.Timeout>>(new Map())

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      clearTimers.current.forEach(timer => clearTimeout(timer))
    }
  }, [])

  const announce = useCallback((message: string, mode: AriaLiveMode = 'polite') => {
    const id = `announce-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    const announcement: Announcement = {
      id,
      message,
      mode,
      timestamp: Date.now(),
    }

    setAnnouncements(prev => [...prev, announcement])

    // Auto-clear after 5 seconds
    const timer = setTimeout(() => {
      setAnnouncements(prev => prev.filter(a => a.id !== id))
      clearTimers.current.delete(id)
    }, 5000)

    clearTimers.current.set(id, timer)
  }, [])

  const clear = useCallback(() => {
    clearTimers.current.forEach(timer => clearTimeout(timer))
    clearTimers.current.clear()
    setAnnouncements([])
  }, [])

  return (
    <AriaLiveContext.Provider value={{ announce, announcements, clear }}>
      {children}
      {/* Global live regions */}
      <AriaLiveOutput announcements={announcements} mode="polite" />
      <AriaLiveOutput announcements={announcements} mode="assertive" />
    </AriaLiveContext.Provider>
  )
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * Hook to access the aria-live announcement system
 */
export function useAriaAnnounce() {
  const context = useContext(AriaLiveContext)
  
  if (!context) {
    // Return no-op functions if outside provider (SSR safe)
    return {
      announce: () => {},
      announcements: [],
      clear: () => {},
    }
  }
  
  return context
}

// ============================================================================
// INTERNAL OUTPUT COMPONENT
// ============================================================================

interface AriaLiveOutputProps {
  announcements: Announcement[]
  mode: AriaLiveMode
}

function AriaLiveOutput({ announcements, mode }: AriaLiveOutputProps) {
  const filtered = announcements.filter(a => a.mode === mode)
  const latestMessage = filtered[filtered.length - 1]?.message || ''

  return (
    <div
      role="status"
      aria-live={mode}
      aria-atomic="true"
      className="sr-only"
    >
      {latestMessage}
    </div>
  )
}

// ============================================================================
// STANDALONE COMPONENT
// ============================================================================

/**
 * Standalone aria-live region for local announcements
 */
export function AriaLiveRegion({
  message,
  mode = 'polite',
  clearAfter = 5000,
  atomic = true,
  relevant = 'additions',
}: AriaLiveRegionProps) {
  const [currentMessage, setCurrentMessage] = useState(message || '')

  useEffect(() => {
    if (message) {
      setCurrentMessage(message)

      if (clearAfter > 0) {
        const timer = setTimeout(() => {
          setCurrentMessage('')
        }, clearAfter)
        return () => clearTimeout(timer)
      }
    }
  }, [message, clearAfter])

  return (
    <div
      role="status"
      aria-live={mode}
      aria-atomic={atomic}
      aria-relevant={relevant}
      className="sr-only"
    >
      {currentMessage}
    </div>
  )
}

// ============================================================================
// UTILITY HOOKS
// ============================================================================

/**
 * Hook to announce when a loading state changes
 */
export function useLoadingAnnouncement(
  isLoading: boolean,
  loadingMessage = 'Loading...',
  completeMessage = 'Loading complete'
) {
  const { announce } = useAriaAnnounce()
  const wasLoading = useRef(false)

  useEffect(() => {
    if (isLoading && !wasLoading.current) {
      announce(loadingMessage, 'polite')
    } else if (!isLoading && wasLoading.current) {
      announce(completeMessage, 'polite')
    }
    wasLoading.current = isLoading
  }, [isLoading, loadingMessage, completeMessage, announce])
}

/**
 * Hook to announce form validation errors
 */
export function useErrorAnnouncement() {
  const { announce } = useAriaAnnounce()

  const announceError = useCallback((error: string) => {
    announce(`Error: ${error}`, 'assertive')
  }, [announce])

  const announceErrors = useCallback((errors: string[]) => {
    if (errors.length === 1) {
      announceError(errors[0])
    } else if (errors.length > 1) {
      announce(`${errors.length} errors: ${errors.join(', ')}`, 'assertive')
    }
  }, [announce, announceError])

  return { announceError, announceErrors }
}

/**
 * Hook to announce successful actions
 */
export function useSuccessAnnouncement() {
  const { announce } = useAriaAnnounce()

  const announceSuccess = useCallback((message: string) => {
    announce(message, 'polite')
  }, [announce])

  return { announceSuccess }
}

export default AriaLiveRegion

