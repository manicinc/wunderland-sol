/**
 * Touch Device Detection Hook
 * Detects if the current device supports touch input
 * @module codex/hooks/useIsTouchDevice
 */

'use client'

import { useState, useEffect } from 'react'

/**
 * Detect if device supports touch input
 *
 * @remarks
 * Uses multiple detection methods:
 * - `ontouchstart` in window
 * - `navigator.maxTouchPoints`
 * - `navigator.msMaxTouchPoints` (legacy IE)
 * - First touch event listener
 *
 * @returns boolean indicating if touch is supported
 *
 * @example
 * ```tsx
 * const isTouch = useIsTouchDevice()
 *
 * return (
 *   <button className={isTouch ? 'min-h-[48px]' : 'min-h-[36px]'}>
 *     Click me
 *   </button>
 * )
 * ```
 */
export function useIsTouchDevice(): boolean {
  const [isTouch, setIsTouch] = useState(false)

  useEffect(() => {
    const checkTouch = () => {
      setIsTouch(
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        // @ts-ignore - legacy IE support
        navigator.msMaxTouchPoints > 0
      )
    }
    checkTouch()

    // Also listen for first touch event to catch hybrid devices
    const handleTouch = () => {
      setIsTouch(true)
      window.removeEventListener('touchstart', handleTouch)
    }
    window.addEventListener('touchstart', handleTouch, { passive: true })

    return () => window.removeEventListener('touchstart', handleTouch)
  }, [])

  return isTouch
}

/**
 * Detect if device is a tablet
 * Uses screen size and touch capability
 *
 * @remarks
 * Tablets typically have:
 * - Touch capability
 * - Screen width between 768px and 1024px (portrait) or up to 1366px (landscape)
 * - Not a phone (min-width >= 768px)
 *
 * @returns boolean indicating if device appears to be a tablet
 */
export function useIsTablet(): boolean {
  const isTouch = useIsTouchDevice()
  const [isTablet, setIsTablet] = useState(false)

  useEffect(() => {
    const checkTablet = () => {
      const width = window.innerWidth
      const height = window.innerHeight
      const minDimension = Math.min(width, height)
      const maxDimension = Math.max(width, height)

      // Tablet: touch device with min dimension >= 600px and max <= 1366px
      // This covers most tablets in both orientations
      setIsTablet(
        isTouch &&
        minDimension >= 600 &&
        maxDimension <= 1366
      )
    }

    checkTablet()
    window.addEventListener('resize', checkTablet)
    return () => window.removeEventListener('resize', checkTablet)
  }, [isTouch])

  return isTablet
}

/**
 * Get optimal touch target size based on device
 *
 * @remarks
 * - Touch devices: 44-48px minimum (iOS/Android guidelines)
 * - Desktop: 32-36px minimum
 *
 * @returns Object with recommended sizes
 */
export function useTouchTargetSize(): {
  minHeight: number
  minWidth: number
  padding: string
  iconSize: number
} {
  const isTouch = useIsTouchDevice()

  return {
    minHeight: isTouch ? 44 : 36,
    minWidth: isTouch ? 44 : 36,
    padding: isTouch ? 'p-2.5' : 'p-2',
    iconSize: isTouch ? 20 : 16,
  }
}

export default useIsTouchDevice
