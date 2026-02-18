/**
 * useReducedMotion Hook
 * @module lib/hooks/useReducedMotion
 * 
 * @description
 * Detects and manages user preference for reduced motion.
 * Respects the prefers-reduced-motion media query for accessibility.
 * Supports manual override with three-way toggle (System / Reduced / Full).
 * 
 * @example
 * ```tsx
 * // Simple usage (boolean)
 * const prefersReducedMotion = useReducedMotion()
 * 
 * // Advanced usage (object with manual override)
 * const { 
 *   prefersReducedMotion, 
 *   manualOverride, 
 *   isSystemPreference,
 *   cycleMotionPreference 
 * } = useReducedMotion()
 * ```
 */

'use client'

import { useState, useEffect, useCallback } from 'react'

// Storage key for manual preference
const MOTION_PREFERENCE_KEY = 'frame-motion-preference'

/**
 * Return type for the advanced useReducedMotion hook
 */
export interface ReducedMotionState {
  /** Whether reduced motion is currently active (from system or manual) */
  prefersReducedMotion: boolean
  /** Manual override: true = reduced, false = full, null = system */
  manualOverride: boolean | null
  /** Whether we're following system preference */
  isSystemPreference: boolean
  /** Cycle through preferences: System -> Reduced -> Full -> System */
  cycleMotionPreference: () => void
}

/**
 * Hook to detect if user prefers reduced motion
 * 
 * @returns Object with motion preference state and controls
 */
export function useReducedMotion(): ReducedMotionState {
  const [systemPreference, setSystemPreference] = useState(false)
  const [manualOverride, setManualOverride] = useState<boolean | null>(null)

  // Load saved preference on mount
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    const saved = localStorage.getItem(MOTION_PREFERENCE_KEY)
    if (saved !== null) {
      setManualOverride(saved === 'reduced' ? true : saved === 'full' ? false : null)
    }
  }, [])

  // Listen to system preference
  useEffect(() => {
    if (typeof window === 'undefined') return

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setSystemPreference(mediaQuery.matches)

    const handleChange = (event: MediaQueryListEvent) => {
      setSystemPreference(event.matches)
    }

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    } else {
      mediaQuery.addListener(handleChange)
      return () => mediaQuery.removeListener(handleChange)
    }
  }, [])

  // Cycle through preferences: null (system) -> true (reduced) -> false (full) -> null
  const cycleMotionPreference = useCallback(() => {
    setManualOverride(current => {
      let next: boolean | null
      if (current === null) {
        next = true // system -> reduced
      } else if (current === true) {
        next = false // reduced -> full
      } else {
        next = null // full -> system
      }
      
      // Save to localStorage
      if (typeof window !== 'undefined') {
        if (next === null) {
          localStorage.removeItem(MOTION_PREFERENCE_KEY)
        } else {
          localStorage.setItem(MOTION_PREFERENCE_KEY, next ? 'reduced' : 'full')
        }
      }
      
      return next
    })
  }, [])

  // Calculate effective preference
  const isSystemPreference = manualOverride === null
  const prefersReducedMotion = isSystemPreference ? systemPreference : manualOverride

  return {
    prefersReducedMotion,
    manualOverride,
    isSystemPreference,
    cycleMotionPreference,
  }
}

/**
 * Get animation settings based on reduced motion preference
 * 
 * @param prefersReducedMotion - Whether user prefers reduced motion
 * @returns Framer Motion compatible transition settings
 */
export function getMotionSettings(prefersReducedMotion: boolean) {
  if (prefersReducedMotion) {
    return {
      transition: { duration: 0 },
      variants: {
        hidden: { opacity: 1 },
        visible: { opacity: 1 },
        exit: { opacity: 1 },
      },
    }
  }

  return {
    transition: { 
      duration: 0.2, 
      type: 'spring', 
      stiffness: 300, 
      damping: 30 
    },
    variants: {
      hidden: { opacity: 0, scale: 0.95 },
      visible: { opacity: 1, scale: 1 },
      exit: { opacity: 0, scale: 0.95 },
    },
  }
}

/**
 * Hook to get motion-safe animation props
 * 
 * @returns Object with motion settings that respect reduced motion preference
 */
export function useMotionSafeAnimation() {
  const { prefersReducedMotion } = useReducedMotion()
  return getMotionSettings(prefersReducedMotion)
}

/**
 * Simple hook for just the boolean value (for backward compatibility)
 * 
 * @returns boolean indicating if reduced motion is preferred
 */
export function useReducedMotionSimple(): boolean {
  const { prefersReducedMotion } = useReducedMotion()
  return prefersReducedMotion
}

export default useReducedMotion
