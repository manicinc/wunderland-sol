/**
 * Pull to Refresh Hook
 * @module components/quarry/hooks/usePullToRefresh
 * 
 * @description
 * Touch-optimized pull-to-refresh gesture for mobile devices.
 * 
 * Features:
 * - Configurable pull threshold
 * - Visual feedback during pull
 * - Loading state management
 * - Haptic feedback support
 * - Works with any scrollable container
 * 
 * @example
 * ```tsx
 * const { ref, isPulling, pullProgress, isRefreshing } = usePullToRefresh({
 *   onRefresh: async () => {
 *     await regenerateContent()
 *   },
 *   threshold: 80,
 * })
 * 
 * return (
 *   <div ref={ref} className="overflow-y-auto">
 *     {isPulling && <PullIndicator progress={pullProgress} />}
 *     <Content />
 *   </div>
 * )
 * ```
 */

'use client'

import React, { useRef, useState, useCallback, useEffect } from 'react'

// ============================================================================
// TYPES
// ============================================================================

export interface PullToRefreshOptions {
  /** Callback when refresh is triggered */
  onRefresh: () => Promise<void> | void
  /** Distance in pixels to trigger refresh (default: 80) */
  threshold?: number
  /** Maximum pull distance in pixels (default: 150) */
  maxPullDistance?: number
  /** Enable haptic feedback (default: true) */
  hapticFeedback?: boolean
  /** Disable the hook */
  disabled?: boolean
  /** Optional element ref to attach to (otherwise returns a ref) */
  elementRef?: React.RefObject<HTMLElement | null>
}

export interface PullToRefreshState {
  /** Whether user is currently pulling */
  isPulling: boolean
  /** Current pull distance (0-1 normalized) */
  pullProgress: number
  /** Raw pull distance in pixels */
  pullDistance: number
  /** Whether refresh is in progress */
  isRefreshing: boolean
  /** Whether threshold has been reached */
  thresholdReached: boolean
}

export interface UsePullToRefreshReturn extends PullToRefreshState {
  /** Ref to attach to scrollable container */
  ref: React.RefObject<HTMLDivElement>
  /** Manually trigger refresh */
  refresh: () => Promise<void>
  /** Reset state */
  reset: () => void
}

// ============================================================================
// UTILITIES
// ============================================================================

function triggerHaptic(type: 'light' | 'medium' | 'heavy' = 'medium') {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    const patterns: Record<string, number> = {
      light: 10,
      medium: 25,
      heavy: 50,
    }
    navigator.vibrate(patterns[type])
  }
}

// ============================================================================
// HOOK
// ============================================================================

export function usePullToRefresh(options: PullToRefreshOptions): UsePullToRefreshReturn {
  const {
    onRefresh,
    threshold = 80,
    maxPullDistance = 150,
    hapticFeedback = true,
    disabled = false,
    elementRef,
  } = options

  const internalRef = useRef<HTMLDivElement>(null)
  const ref = (elementRef as React.RefObject<HTMLDivElement>) || internalRef

  const [state, setState] = useState<PullToRefreshState>({
    isPulling: false,
    pullProgress: 0,
    pullDistance: 0,
    isRefreshing: false,
    thresholdReached: false,
  })

  const touchStartY = useRef<number | null>(null)
  const hasTriggeredHaptic = useRef(false)

  const reset = useCallback(() => {
    setState({
      isPulling: false,
      pullProgress: 0,
      pullDistance: 0,
      isRefreshing: false,
      thresholdReached: false,
    })
    touchStartY.current = null
    hasTriggeredHaptic.current = false
  }, [])

  const refresh = useCallback(async () => {
    if (state.isRefreshing) return

    setState(prev => ({ ...prev, isRefreshing: true }))

    try {
      await onRefresh()
    } finally {
      // Small delay for visual feedback
      setTimeout(() => {
        reset()
      }, 300)
    }
  }, [onRefresh, state.isRefreshing, reset])

  // Touch handlers
  useEffect(() => {
    const element = ref.current
    if (!element || disabled) return

    const handleTouchStart = (e: TouchEvent) => {
      // Only start pull if at top of scroll
      if (element.scrollTop > 0) return

      touchStartY.current = e.touches[0].clientY
      hasTriggeredHaptic.current = false
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (touchStartY.current === null) return
      if (state.isRefreshing) return

      // Only allow pull if at top of scroll
      if (element.scrollTop > 0) {
        touchStartY.current = null
        setState(prev => ({ ...prev, isPulling: false, pullDistance: 0, pullProgress: 0 }))
        return
      }

      const currentY = e.touches[0].clientY
      const deltaY = currentY - touchStartY.current

      // Only track downward pulls
      if (deltaY <= 0) {
        setState(prev => ({ ...prev, isPulling: false, pullDistance: 0, pullProgress: 0 }))
        return
      }

      // Prevent overscroll
      if (deltaY > 0) {
        e.preventDefault()
      }

      // Apply resistance (exponential decay)
      const resistance = 0.5
      const resistedDistance = Math.min(
        deltaY * resistance,
        maxPullDistance
      )

      const progress = Math.min(resistedDistance / threshold, 1)
      const thresholdReached = resistedDistance >= threshold

      // Trigger haptic when threshold is first reached
      if (thresholdReached && !hasTriggeredHaptic.current && hapticFeedback) {
        triggerHaptic('medium')
        hasTriggeredHaptic.current = true
      }

      setState({
        isPulling: true,
        pullProgress: progress,
        pullDistance: resistedDistance,
        isRefreshing: false,
        thresholdReached,
      })
    }

    const handleTouchEnd = () => {
      if (touchStartY.current === null) return

      if (state.thresholdReached && !state.isRefreshing) {
        // Trigger refresh
        if (hapticFeedback) {
          triggerHaptic('heavy')
        }
        refresh()
      } else {
        // Reset without refresh
        reset()
      }

      touchStartY.current = null
    }

    const handleTouchCancel = () => {
      reset()
    }

    element.addEventListener('touchstart', handleTouchStart, { passive: true })
    element.addEventListener('touchmove', handleTouchMove, { passive: false })
    element.addEventListener('touchend', handleTouchEnd, { passive: true })
    element.addEventListener('touchcancel', handleTouchCancel, { passive: true })

    return () => {
      element.removeEventListener('touchstart', handleTouchStart)
      element.removeEventListener('touchmove', handleTouchMove)
      element.removeEventListener('touchend', handleTouchEnd)
      element.removeEventListener('touchcancel', handleTouchCancel)
    }
  }, [ref, disabled, threshold, maxPullDistance, hapticFeedback, state.thresholdReached, state.isRefreshing, refresh, reset])

  return {
    ref,
    ...state,
    refresh,
    reset,
  }
}

// ============================================================================
// VISUAL INDICATOR COMPONENT
// ============================================================================

export interface PullToRefreshIndicatorProps {
  /** Current pull progress (0-1) */
  progress: number
  /** Whether refresh is in progress */
  isRefreshing: boolean
  /** Whether threshold has been reached */
  thresholdReached: boolean
  /** Dark mode */
  isDark?: boolean
  /** Custom refresh text */
  refreshText?: string
  /** Custom pull text */
  pullText?: string
}

export function PullToRefreshIndicator({
  progress,
  isRefreshing,
  thresholdReached,
  isDark = false,
  refreshText = 'Refreshing...',
  pullText = 'Pull to refresh',
}: PullToRefreshIndicatorProps) {
  const height = Math.max(0, progress * 60)
  
  return (
    <div 
      className="flex items-center justify-center overflow-hidden transition-all"
      style={{ height: isRefreshing ? 60 : height }}
    >
      <div className="flex items-center gap-2">
        {isRefreshing ? (
          <svg 
            className={`w-5 h-5 animate-spin ${isDark ? 'text-blue-400' : 'text-blue-600'}`}
            fill="none" 
            viewBox="0 0 24 24"
          >
            <circle 
              className="opacity-25" 
              cx="12" 
              cy="12" 
              r="10" 
              stroke="currentColor" 
              strokeWidth="4"
            />
            <path 
              className="opacity-75" 
              fill="currentColor" 
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        ) : (
          <svg 
            className={`w-5 h-5 transition-transform ${thresholdReached ? 'rotate-180' : ''} ${isDark ? 'text-gray-400' : 'text-gray-500'}`}
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M19 14l-7 7m0 0l-7-7m7 7V3" 
            />
          </svg>
        )}
        <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          {isRefreshing 
            ? refreshText 
            : thresholdReached 
              ? 'Release to refresh' 
              : pullText
          }
        </span>
      </div>
    </div>
  )
}

export default usePullToRefresh

