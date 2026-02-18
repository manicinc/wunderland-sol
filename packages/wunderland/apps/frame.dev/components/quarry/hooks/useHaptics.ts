/**
 * Hook for haptic feedback on touch devices
 * @module codex/hooks/useHaptics
 *
 * @remarks
 * Provides tactile feedback using the Vibration API.
 * Falls back gracefully on devices without vibration support.
 *
 * Patterns:
 * - `light`: 10ms - subtle feedback for button taps
 * - `medium`: 50ms - standard interaction feedback
 * - `heavy`: 100ms - confirmation or warning feedback
 * - `success`: [50, 30, 50] - double pulse for success
 * - `error`: [100, 50, 100, 50, 100] - triple pulse for errors
 * - `selection`: 30ms - menu item selection
 *
 * @example
 * ```tsx
 * function MyButton() {
 *   const { haptic, canVibrate } = useHaptics()
 *
 *   return (
 *     <button onClick={() => {
 *       haptic('medium')
 *       // do something
 *     }}>
 *       Click me
 *     </button>
 *   )
 * }
 * ```
 */

'use client'

import { useCallback, useMemo } from 'react'

/** Available haptic feedback patterns */
export type HapticPattern =
  | 'light'
  | 'medium'
  | 'heavy'
  | 'success'
  | 'error'
  | 'selection'
  | 'longPress'

/** Vibration durations in milliseconds */
const HAPTIC_PATTERNS: Record<HapticPattern, number | number[]> = {
  light: 10,
  medium: 50,
  heavy: 100,
  success: [50, 30, 50],
  error: [100, 50, 100, 50, 100],
  selection: 30,
  longPress: 80,
}

interface UseHapticsResult {
  /** Trigger haptic feedback with specified pattern */
  haptic: (pattern: HapticPattern) => void
  /** Trigger custom vibration pattern (array of ms) */
  vibrate: (pattern: number | number[]) => void
  /** Whether the device supports vibration */
  canVibrate: boolean
  /** Whether haptics are enabled in user preferences */
  isEnabled: boolean
}

/**
 * Provide haptic feedback on touch devices
 *
 * @param enabled - Override to disable haptics (default: true)
 * @returns Object with haptic control functions
 *
 * @remarks
 * Uses the Vibration API (navigator.vibrate) which is supported on:
 * - Android Chrome, Firefox, Edge
 * - NOT supported on iOS Safari (fallback is no-op)
 *
 * @example
 * ```tsx
 * function SwipeAction() {
 *   const { haptic } = useHaptics()
 *
 *   const handleSwipe = () => {
 *     haptic('success')
 *     // perform action
 *   }
 *
 *   return <div onTouchEnd={handleSwipe}>Swipe me</div>
 * }
 * ```
 */
export function useHaptics(enabled = true): UseHapticsResult {
  const canVibrate = useMemo(() => {
    if (typeof navigator === 'undefined') return false
    return 'vibrate' in navigator
  }, [])

  const vibrate = useCallback(
    (pattern: number | number[]) => {
      if (!enabled || !canVibrate) return
      try {
        navigator.vibrate(pattern)
      } catch {
        // Silently fail if vibration is blocked
      }
    },
    [enabled, canVibrate]
  )

  const haptic = useCallback(
    (pattern: HapticPattern) => {
      const vibrationPattern = HAPTIC_PATTERNS[pattern]
      vibrate(vibrationPattern)
    },
    [vibrate]
  )

  return {
    haptic,
    vibrate,
    canVibrate,
    isEnabled: enabled && canVibrate,
  }
}

/**
 * Standalone haptic trigger (for use outside React components)
 *
 * @example
 * ```ts
 * import { triggerHaptic } from './useHaptics'
 *
 * // In an event handler
 * triggerHaptic('medium')
 * ```
 */
export function triggerHaptic(pattern: HapticPattern): void {
  if (typeof navigator === 'undefined' || !('vibrate' in navigator)) return
  const vibrationPattern = HAPTIC_PATTERNS[pattern]
  try {
    navigator.vibrate(vibrationPattern)
  } catch {
    // Silently fail
  }
}

export default useHaptics
