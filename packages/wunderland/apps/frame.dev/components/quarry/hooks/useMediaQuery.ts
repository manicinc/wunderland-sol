/**
 * useMediaQuery - Responsive media query hook
 * @module codex/hooks/useMediaQuery
 *
 * Provides reactive media query matching for responsive UIs.
 * SSR-safe with proper hydration handling.
 */

'use client'

import { useState, useEffect } from 'react'

/**
 * Hook to track a CSS media query match state
 */
export function useMediaQuery(query: string): boolean {
  // SSR-safe: default to false during SSR
  const [matches, setMatches] = useState(false)

  // Ensure query is a valid string - check type before accessing any properties
  let safeQuery: string | null = null
  if (typeof query === 'string' && query !== '') {
    safeQuery = query
  }

  useEffect(() => {
    // Skip if invalid query or SSR
    if (!safeQuery || typeof window === 'undefined') return

    const mediaQuery = window.matchMedia(safeQuery)

    // Set initial value
    setMatches(mediaQuery.matches)

    // Create listener
    const handler = (event: MediaQueryListEvent) => {
      setMatches(event.matches)
    }

    // Add listener (modern API)
    mediaQuery.addEventListener('change', handler)

    // Cleanup
    return () => {
      mediaQuery.removeEventListener('change', handler)
    }
  }, [safeQuery])

  return matches
}

/**
 * Predefined breakpoint queries matching Tailwind defaults
 */
export const breakpoints = {
  sm: '(min-width: 640px)',
  md: '(min-width: 768px)',
  lg: '(min-width: 1024px)',
  xl: '(min-width: 1280px)',
  '2xl': '(min-width: 1536px)',
} as const

/**
 * Hook for common responsive checks
 * IMPORTANT: All useMediaQuery calls must be unconditional to follow Rules of Hooks
 */
export function useResponsive() {
  // Call ALL hooks unconditionally first
  const isSm = useMediaQuery(breakpoints.sm)
  const isMd = useMediaQuery(breakpoints.md)
  const isLg = useMediaQuery(breakpoints.lg)
  const isXl = useMediaQuery(breakpoints.xl)

  // Then derive values from the results
  const isMobile = !isMd
  const isTablet = isMd && !isLg
  const isDesktop = isLg
  const isSmallScreen = !isSm
  const isLargeScreen = isXl

  return {
    isMobile,
    isTablet,
    isDesktop,
    isSmallScreen,
    isLargeScreen,
  }
}

/**
 * Hook for device orientation detection
 */
export function useOrientation() {
  const isLandscape = useMediaQuery('(orientation: landscape)')
  const isPortrait = useMediaQuery('(orientation: portrait)')

  return {
    isLandscape,
    isPortrait,
  }
}

/**
 * Hook for touch device detection
 */
export function useTouchDevice() {
  const [isTouch, setIsTouch] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    // Check for touch capability
    const hasTouch =
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      // @ts-expect-error - msMaxTouchPoints is IE-specific
      navigator.msMaxTouchPoints > 0

    setIsTouch(hasTouch)
  }, [])

  return isTouch
}

/**
 * Combined hook for all responsive needs
 */
export function useDeviceInfo() {
  const responsive = useResponsive()
  const orientation = useOrientation()
  const isTouch = useTouchDevice()

  return {
    ...responsive,
    ...orientation,
    isTouch,
  }
}

export default useMediaQuery
