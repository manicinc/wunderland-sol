/**
 * Responsive Breakpoint Hook
 * @module hooks/useBreakpoint
 */

'use client'

import { useState, useEffect } from 'react'

const breakpoints = {
  mobile: 640,
  tablet: 1024,
  desktop: 1280,
} as const

export function useBreakpoint() {
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1280
  )

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth)
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return {
    isMobile: windowWidth < breakpoints.mobile,
    isTablet: windowWidth >= breakpoints.mobile && windowWidth < breakpoints.tablet,
    isDesktop: windowWidth >= breakpoints.desktop,
    windowWidth,
  }
}
