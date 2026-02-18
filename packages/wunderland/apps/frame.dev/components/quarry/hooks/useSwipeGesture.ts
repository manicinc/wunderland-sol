/**
 * Swipe Gesture Hook
 * @module components/quarry/hooks/useSwipeGesture
 * 
 * @description
 * Provides touch swipe detection for mobile-friendly interactions.
 * Supports horizontal and vertical swipes with customizable thresholds.
 * 
 * @example
 * ```tsx
 * const { ref, swipeDirection } = useSwipeGesture({
 *   onSwipeLeft: () => nextCard(),
 *   onSwipeRight: () => prevCard(),
 *   onSwipeUp: () => rateCard('easy'),
 *   onSwipeDown: () => flipCard(),
 * })
 * 
 * return <div ref={ref} className="card">...</div>
 * ```
 */

import { useRef, useCallback, useEffect, useState } from 'react'

// ============================================================================
// TYPES
// ============================================================================

export type SwipeDirection = 'left' | 'right' | 'up' | 'down' | null

export interface SwipeGestureOptions {
  /** Called when user swipes left */
  onSwipeLeft?: () => void
  /** Called when user swipes right */
  onSwipeRight?: () => void
  /** Called when user swipes up */
  onSwipeUp?: () => void
  /** Called when user swipes down */
  onSwipeDown?: () => void
  /** Called with any swipe direction */
  onSwipe?: (direction: SwipeDirection) => void
  /** Minimum distance to trigger swipe (px) */
  threshold?: number
  /** Maximum time for swipe (ms) */
  timeout?: number
  /** Prevent default touch behavior */
  preventDefault?: boolean
  /** Enable haptic feedback (if available) */
  hapticFeedback?: boolean
  /** External ref to use instead of creating a new one */
  elementRef?: React.RefObject<HTMLElement | null>
}

export interface SwipeState {
  /** Current detected swipe direction */
  direction: SwipeDirection
  /** Distance swiped (px) */
  distance: { x: number; y: number }
  /** Whether a swipe is in progress */
  swiping: boolean
  /** Velocity of swipe */
  velocity: { x: number; y: number }
}

export interface UseSwipeGestureReturn {
  /** Ref to attach to the element */
  ref: React.RefObject<HTMLDivElement>
  /** Current swipe direction */
  swipeDirection: SwipeDirection
  /** Current swipe state */
  swipeState: SwipeState
  /** Reset swipe state */
  reset: () => void
}

// ============================================================================
// HAPTIC FEEDBACK
// ============================================================================

function triggerHaptic(type: 'light' | 'medium' | 'heavy' = 'light') {
  if ('vibrate' in navigator) {
    const patterns: Record<string, number[]> = {
      light: [10],
      medium: [25],
      heavy: [50],
    }
    navigator.vibrate(patterns[type])
  }
}

// ============================================================================
// HOOK
// ============================================================================

export function useSwipeGesture(options: SwipeGestureOptions = {}): UseSwipeGestureReturn {
  const {
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    onSwipe,
    threshold = 50,
    timeout = 300,
    preventDefault = true,
    hapticFeedback = true,
    elementRef,
  } = options

  const internalRef = useRef<HTMLDivElement>(null)
  // Use external ref if provided, otherwise use internal ref
  const ref = (elementRef as React.RefObject<HTMLDivElement>) || internalRef
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null)
  const [swipeState, setSwipeState] = useState<SwipeState>({
    direction: null,
    distance: { x: 0, y: 0 },
    swiping: false,
    velocity: { x: 0, y: 0 },
  })

  const reset = useCallback(() => {
    setSwipeState({
      direction: null,
      distance: { x: 0, y: 0 },
      swiping: false,
      velocity: { x: 0, y: 0 },
    })
    touchStartRef.current = null
  }, [])

  const handleTouchStart = useCallback((e: TouchEvent) => {
    const touch = e.touches[0]
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    }
    setSwipeState(prev => ({ ...prev, swiping: true }))
  }, [])

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!touchStartRef.current) return

    const touch = e.touches[0]
    const deltaX = touch.clientX - touchStartRef.current.x
    const deltaY = touch.clientY - touchStartRef.current.y

    setSwipeState(prev => ({
      ...prev,
      distance: { x: deltaX, y: deltaY },
    }))

    // Prevent scrolling if horizontal swipe
    if (preventDefault && Math.abs(deltaX) > Math.abs(deltaY)) {
      e.preventDefault()
    }
  }, [preventDefault])

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (!touchStartRef.current) return

    const touch = e.changedTouches[0]
    const deltaX = touch.clientX - touchStartRef.current.x
    const deltaY = touch.clientY - touchStartRef.current.y
    const elapsed = Date.now() - touchStartRef.current.time

    // Calculate velocity
    const velocityX = Math.abs(deltaX) / elapsed
    const velocityY = Math.abs(deltaY) / elapsed

    // Determine swipe direction
    let direction: SwipeDirection = null

    if (elapsed <= timeout) {
      const absX = Math.abs(deltaX)
      const absY = Math.abs(deltaY)

      if (absX >= threshold || absY >= threshold) {
        if (absX > absY) {
          direction = deltaX > 0 ? 'right' : 'left'
        } else {
          direction = deltaY > 0 ? 'down' : 'up'
        }
      }
    }

    // Update state
    setSwipeState({
      direction,
      distance: { x: deltaX, y: deltaY },
      swiping: false,
      velocity: { x: velocityX, y: velocityY },
    })

    // Trigger callbacks
    if (direction) {
      if (hapticFeedback) {
        triggerHaptic('medium')
      }

      onSwipe?.(direction)

      switch (direction) {
        case 'left':
          onSwipeLeft?.()
          break
        case 'right':
          onSwipeRight?.()
          break
        case 'up':
          onSwipeUp?.()
          break
        case 'down':
          onSwipeDown?.()
          break
      }
    }

    touchStartRef.current = null
  }, [threshold, timeout, hapticFeedback, onSwipe, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown])

  const handleTouchCancel = useCallback(() => {
    reset()
  }, [reset])

  // Attach event listeners
  useEffect(() => {
    const element = ref.current
    if (!element) return

    element.addEventListener('touchstart', handleTouchStart, { passive: true })
    element.addEventListener('touchmove', handleTouchMove, { passive: !preventDefault })
    element.addEventListener('touchend', handleTouchEnd, { passive: true })
    element.addEventListener('touchcancel', handleTouchCancel, { passive: true })

    return () => {
      element.removeEventListener('touchstart', handleTouchStart)
      element.removeEventListener('touchmove', handleTouchMove)
      element.removeEventListener('touchend', handleTouchEnd)
      element.removeEventListener('touchcancel', handleTouchCancel)
    }
  }, [handleTouchStart, handleTouchMove, handleTouchEnd, handleTouchCancel, preventDefault])

  return {
    ref,
    swipeDirection: swipeState.direction,
    swipeState,
    reset,
  }
}

export default useSwipeGesture
