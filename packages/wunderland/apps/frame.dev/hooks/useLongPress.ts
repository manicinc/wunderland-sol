/**
 * Long Press Hook
 * @module hooks/useLongPress
 *
 * Detects long press (touch and hold) gestures for mobile interactions.
 */

import { useCallback, useRef } from 'react'

export interface UseLongPressOptions {
  /** Duration in ms to trigger long press (default: 500) */
  delay?: number
  /** Called when long press is triggered */
  onLongPress: () => void
  /** Called when touch starts (optional) */
  onTouchStart?: () => void
  /** Called when touch ends without triggering long press (optional) */
  onTouchEnd?: () => void
  /** Called when long press is cancelled (e.g., by movement) */
  onCancel?: () => void
}

export interface UseLongPressReturn {
  /** Handlers to spread on the target element */
  handlers: {
    onTouchStart: (e: React.TouchEvent) => void
    onTouchEnd: (e: React.TouchEvent) => void
    onTouchMove: (e: React.TouchEvent) => void
    onMouseDown: (e: React.MouseEvent) => void
    onMouseUp: (e: React.MouseEvent) => void
    onMouseLeave: (e: React.MouseEvent) => void
  }
  /** Whether long press is currently active */
  isPressed: boolean
}

/**
 * Hook for detecting long press gestures
 */
export function useLongPress({
  delay = 500,
  onLongPress,
  onTouchStart,
  onTouchEnd,
  onCancel,
}: UseLongPressOptions): UseLongPressReturn {
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const isLongPressRef = useRef(false)
  const isPressedRef = useRef(false)

  const start = useCallback(() => {
    isPressedRef.current = true
    isLongPressRef.current = false
    
    onTouchStart?.()

    timerRef.current = setTimeout(() => {
      isLongPressRef.current = true
      onLongPress()
    }, delay)
  }, [delay, onLongPress, onTouchStart])

  const clear = useCallback((shouldTriggerEnd = true) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }

    if (isPressedRef.current && !isLongPressRef.current && shouldTriggerEnd) {
      onTouchEnd?.()
    }

    isPressedRef.current = false
  }, [onTouchEnd])

  const cancel = useCallback(() => {
    clear(false)
    onCancel?.()
  }, [clear, onCancel])

  const handlers = {
    onTouchStart: (e: React.TouchEvent) => {
      start()
    },
    onTouchEnd: (e: React.TouchEvent) => {
      if (isLongPressRef.current) {
        e.preventDefault() // Prevent click if long press was triggered
      }
      clear()
    },
    onTouchMove: (e: React.TouchEvent) => {
      // Cancel if finger moves too much
      cancel()
    },
    onMouseDown: (e: React.MouseEvent) => {
      start()
    },
    onMouseUp: (e: React.MouseEvent) => {
      clear()
    },
    onMouseLeave: (e: React.MouseEvent) => {
      cancel()
    },
  }

  return {
    handlers,
    isPressed: isPressedRef.current,
  }
}

export default useLongPress

