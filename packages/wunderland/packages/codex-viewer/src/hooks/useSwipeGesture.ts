/**
 * Hook for mobile swipe gesture detection
 * @module codex/hooks/useSwipeGesture
 * 
 * @remarks
 * - Detects left/right/up/down swipes
 * - Configurable threshold and velocity
 * - Touch-only (no mouse events)
 * - Prevents default scroll on horizontal swipes
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   useSwipeGesture({
 *     onSwipeLeft: () => console.log('Swiped left'),
 *     onSwipeRight: () => console.log('Swiped right'),
 *     threshold: 100, // minimum distance in pixels
 *   })
 *   
 *   return <div>Swipeable content</div>
 * }
 * ```
 */

import { useEffect, useRef } from 'react'

interface SwipeGestureOptions {
  /** Callback for left swipe */
  onSwipeLeft?: () => void
  /** Callback for right swipe */
  onSwipeRight?: () => void
  /** Callback for up swipe */
  onSwipeUp?: () => void
  /** Callback for down swipe */
  onSwipeDown?: () => void
  /** Minimum swipe distance in pixels (default: 50) */
  threshold?: number
  /** Minimum swipe velocity (default: 0.3) */
  velocity?: number
  /** Element to attach listeners to (default: document) */
  element?: HTMLElement | null
}

interface TouchState {
  startX: number
  startY: number
  startTime: number
  currentX: number
  currentY: number
}

/**
 * Detect swipe gestures on mobile devices
 * 
 * @param options - Swipe gesture configuration
 * 
 * @remarks
 * Attaches touch event listeners to detect swipe gestures.
 * Automatically prevents default scroll behavior on horizontal swipes.
 * Only activates on touch devices (not mouse).
 * 
 * @example
 * ```tsx
 * function Sidebar() {
 *   useSwipeGesture({
 *     onSwipeLeft: () => setSidebarOpen(false),
 *     onSwipeRight: () => setSidebarOpen(true),
 *     threshold: 100,
 *   })
 *   
 *   return <div>Sidebar content</div>
 * }
 * ```
 */
export function useSwipeGesture({
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  threshold = 50,
  velocity = 0.3,
  element,
}: SwipeGestureOptions): void {
  const touchState = useRef<TouchState | null>(null)

  useEffect(() => {
    const target = element || document

    const handleTouchStart = (e: Event) => {
      const touchEvent = e as unknown as TouchEvent
      const touch = touchEvent.touches[0]
      touchState.current = {
        startX: touch.clientX,
        startY: touch.clientY,
        startTime: Date.now(),
        currentX: touch.clientX,
        currentY: touch.clientY,
      }
    }

    const handleTouchMove = (e: Event) => {
      if (!touchState.current) return

      const touchEvent = e as unknown as TouchEvent
      const touch = touchEvent.touches[0]
      touchState.current.currentX = touch.clientX
      touchState.current.currentY = touch.clientY

      // Prevent default scroll on horizontal swipes
      const deltaX = Math.abs(touch.clientX - touchState.current.startX)
      const deltaY = Math.abs(touch.clientY - touchState.current.startY)

      if (deltaX > deltaY && deltaX > 10) {
        e.preventDefault()
      }
    }

    const handleTouchEnd = () => {
      if (!touchState.current) return

      const { startX, startY, startTime, currentX, currentY } = touchState.current
      const deltaX = currentX - startX
      const deltaY = currentY - startY
      const duration = Date.now() - startTime
      const absX = Math.abs(deltaX)
      const absY = Math.abs(deltaY)

      // Calculate velocity (pixels per millisecond)
      const velocityX = absX / duration
      const velocityY = absY / duration

      // Determine if it's a valid swipe
      const isHorizontalSwipe = absX > absY && absX > threshold && velocityX > velocity
      const isVerticalSwipe = absY > absX && absY > threshold && velocityY > velocity

      if (isHorizontalSwipe) {
        if (deltaX > 0) {
          onSwipeRight?.()
        } else {
          onSwipeLeft?.()
        }
      } else if (isVerticalSwipe) {
        if (deltaY > 0) {
          onSwipeDown?.()
        } else {
          onSwipeUp?.()
        }
      }

      touchState.current = null
    }

    target.addEventListener('touchstart', handleTouchStart, { passive: true })
    target.addEventListener('touchmove', handleTouchMove, { passive: false })
    target.addEventListener('touchend', handleTouchEnd, { passive: true })
    target.addEventListener('touchcancel', handleTouchEnd, { passive: true })

    return () => {
      target.removeEventListener('touchstart', handleTouchStart)
      target.removeEventListener('touchmove', handleTouchMove)
      target.removeEventListener('touchend', handleTouchEnd)
      target.removeEventListener('touchcancel', handleTouchEnd)
    }
  }, [onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, threshold, velocity, element])
}

