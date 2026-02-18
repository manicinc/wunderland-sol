/**
 * Responsive hook for tree component
 * Handles device detection, orientation, and adaptive sizing
 * @module codex/tree/hooks/useResponsiveTree
 */

'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'

/**
 * Device type detection
 */
export type DeviceType = 'mobile' | 'tablet' | 'desktop'

/**
 * Orientation type
 */
export type OrientationType = 'portrait' | 'landscape'

/**
 * Platform detection
 */
export type PlatformType = 'ios' | 'android' | 'web'

/**
 * Screen size breakpoints
 */
export interface ScreenBreakpoints {
  /** Extra small screens (< 480px) */
  xs: boolean
  /** Small screens (480-640px) */
  sm: boolean
  /** Medium screens (640-768px) */
  md: boolean
  /** Large screens (768-1024px) */
  lg: boolean
  /** Extra large screens (1024-1280px) */
  xl: boolean
  /** 2XL screens (> 1280px) */
  '2xl': boolean
}

/**
 * Touch capabilities
 */
export interface TouchCapabilities {
  /** Device supports touch */
  hasTouch: boolean
  /** Device supports multi-touch */
  hasMultiTouch: boolean
  /** Device supports pointer events */
  hasPointer: boolean
  /** Primary input is touch */
  primaryInputTouch: boolean
  /** Supports hover interactions */
  supportsHover: boolean
}

/**
 * Safe area insets for notches/home bars
 */
export interface SafeAreaInsets {
  top: number
  right: number
  bottom: number
  left: number
}

/**
 * Responsive tree configuration
 */
export interface ResponsiveTreeConfig {
  /** Row height in pixels */
  rowHeight: number
  /** Indentation per level */
  indent: number
  /** Touch target minimum size */
  minTouchTarget: number
  /** Font size scale */
  fontSize: 'xs' | 'sm' | 'base' | 'lg'
  /** Icon size class */
  iconSize: string
  /** Gap between elements */
  gap: string
  /** Padding scale */
  padding: string
  /** Enable drag-and-drop (disabled on touch-primary devices) */
  enableDragDrop: boolean
  /** Show inline action buttons */
  showInlineActions: boolean
  /** Show swipe actions (mobile) */
  showSwipeActions: boolean
  /** Action button size */
  actionButtonSize: 'sm' | 'md' | 'lg'
  /** Tree container height calculation */
  containerHeight: string
  /** Maximum visible depth (collapse deeper on small screens) */
  maxVisibleDepth: number
}

/**
 * Responsive state
 */
export interface ResponsiveState {
  /** Detected device type */
  device: DeviceType
  /** Current orientation */
  orientation: OrientationType
  /** Detected platform */
  platform: PlatformType
  /** Screen breakpoints */
  breakpoints: ScreenBreakpoints
  /** Touch capabilities */
  touch: TouchCapabilities
  /** Safe area insets */
  safeArea: SafeAreaInsets
  /** Viewport dimensions */
  viewport: { width: number; height: number }
  /** Pixel ratio */
  pixelRatio: number
  /** Is standalone/PWA mode */
  isStandalone: boolean
  /** Computed tree configuration */
  config: ResponsiveTreeConfig
}

/**
 * Detect platform (iOS, Android, Web)
 */
function detectPlatform(): PlatformType {
  if (typeof navigator === 'undefined') return 'web'
  
  const ua = navigator.userAgent.toLowerCase()
  
  // iOS detection
  if (/iphone|ipad|ipod/.test(ua) || 
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) {
    return 'ios'
  }
  
  // Android detection
  if (/android/.test(ua)) {
    return 'android'
  }
  
  return 'web'
}

/**
 * Detect device type based on screen size and touch
 */
function detectDevice(width: number, hasTouch: boolean): DeviceType {
  // Mobile: < 640px or touch-primary small screen
  if (width < 640 || (hasTouch && width < 768)) {
    return 'mobile'
  }
  
  // Tablet: 640-1024px with touch, or iPad-like dimensions
  if ((width >= 640 && width < 1024 && hasTouch) || 
      (width >= 768 && width < 1280 && hasTouch)) {
    return 'tablet'
  }
  
  return 'desktop'
}

/**
 * Detect orientation
 */
function detectOrientation(width: number, height: number): OrientationType {
  return width > height ? 'landscape' : 'portrait'
}

/**
 * Detect touch capabilities
 */
function detectTouchCapabilities(): TouchCapabilities {
  if (typeof window === 'undefined') {
    return {
      hasTouch: false,
      hasMultiTouch: false,
      hasPointer: false,
      primaryInputTouch: false,
      supportsHover: true,
    }
  }
  
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0
  const hasPointer = 'PointerEvent' in window
  
  // Check if hover is supported (not on touch-primary devices)
  const supportsHover = window.matchMedia('(hover: hover)').matches
  // Check if a precise pointer (mouse/trackpad) is available - allows drag-and-drop on
  // laptops with touchscreens when using mouse/trackpad
  const hasPrecisePointer = window.matchMedia('(any-pointer: fine)').matches
  const primaryInputTouch = window.matchMedia('(pointer: coarse)').matches && !hasPrecisePointer
  
  return {
    hasTouch,
    hasMultiTouch: navigator.maxTouchPoints > 1,
    hasPointer,
    primaryInputTouch,
    supportsHover,
  }
}

/**
 * Get safe area insets from CSS env()
 */
function getSafeAreaInsets(): SafeAreaInsets {
  if (typeof window === 'undefined' || typeof getComputedStyle === 'undefined') {
    return { top: 0, right: 0, bottom: 0, left: 0 }
  }
  
  const style = getComputedStyle(document.documentElement)
  
  const parseEnv = (prop: string): number => {
    const value = style.getPropertyValue(prop)
    return parseInt(value, 10) || 0
  }
  
  return {
    top: parseEnv('--sat') || parseEnv('env(safe-area-inset-top)') || 0,
    right: parseEnv('--sar') || parseEnv('env(safe-area-inset-right)') || 0,
    bottom: parseEnv('--sab') || parseEnv('env(safe-area-inset-bottom)') || 0,
    left: parseEnv('--sal') || parseEnv('env(safe-area-inset-left)') || 0,
  }
}

/**
 * Calculate screen breakpoints
 */
function calculateBreakpoints(width: number): ScreenBreakpoints {
  return {
    xs: width < 480,
    sm: width >= 480 && width < 640,
    md: width >= 640 && width < 768,
    lg: width >= 768 && width < 1024,
    xl: width >= 1024 && width < 1280,
    '2xl': width >= 1280,
  }
}

/**
 * Calculate responsive tree configuration
 */
function calculateTreeConfig(
  device: DeviceType,
  orientation: OrientationType,
  breakpoints: ScreenBreakpoints,
  touch: TouchCapabilities,
  viewportHeight: number
): ResponsiveTreeConfig {
  // Base configuration - Premium touch-optimized defaults
  const base: ResponsiveTreeConfig = {
    rowHeight: 36, // Increased from 32 for better touch accessibility
    indent: 10, // Reduced from 16 for tighter tree layout
    minTouchTarget: 44,
    fontSize: 'sm',
    iconSize: 'w-4 h-4',
    gap: 'gap-2',
    padding: 'px-2.5 py-1.5', // Slightly more padding
    enableDragDrop: true,
    showInlineActions: true,
    showSwipeActions: false,
    actionButtonSize: 'md',
    containerHeight: 'calc(100vh - 200px)',
    maxVisibleDepth: 10,
  }
  
  // Mobile configuration - optimized for density while keeping touch targets
  if (device === 'mobile') {
    // Extra small screens (< 480px) get more compact rows
    const isExtraSmall = breakpoints.xs
    return {
      ...base,
      rowHeight: isExtraSmall
        ? (touch.primaryInputTouch ? 40 : 36) // Tighter on xs
        : (touch.primaryInputTouch ? 44 : 40), // Normal mobile
      indent: isExtraSmall ? 6 : 8, // Tighter indent on xs
      minTouchTarget: 44, // Maintain accessibility
      fontSize: isExtraSmall ? 'xs' : 'sm',
      iconSize: isExtraSmall ? 'w-4 h-4' : 'w-5 h-5',
      gap: isExtraSmall ? 'gap-1.5' : 'gap-2',
      padding: isExtraSmall ? 'px-2 py-1' : 'px-2.5 py-1.5',
      enableDragDrop: false, // Disable on mobile, use swipe/tap actions
      showInlineActions: false, // Show on long-press instead
      showSwipeActions: true,
      actionButtonSize: isExtraSmall ? 'md' : 'lg',
      containerHeight: orientation === 'landscape'
        ? 'calc(100vh - 100px)'
        : 'calc(100vh - 140px)', // More content visible
      maxVisibleDepth: 5,
    }
  }
  
  // Tablet configuration - tighter in portrait for more content
  if (device === 'tablet') {
    const isPortrait = orientation === 'portrait'
    return {
      ...base,
      rowHeight: isPortrait
        ? (touch.primaryInputTouch ? 40 : 34) // Tighter in portrait
        : (touch.primaryInputTouch ? 44 : 36),
      indent: isPortrait ? 8 : 10,
      minTouchTarget: 44,
      fontSize: 'sm',
      iconSize: 'w-4 h-4',
      gap: isPortrait ? 'gap-1.5' : 'gap-2',
      padding: isPortrait ? 'px-2 py-1' : 'px-2.5 py-1.5',
      enableDragDrop: !isPortrait, // Only in landscape
      showInlineActions: true,
      showSwipeActions: isPortrait,
      actionButtonSize: 'md',
      containerHeight: isPortrait
        ? 'calc(100vh - 160px)' // More content visible
        : 'calc(100vh - 140px)',
      maxVisibleDepth: 7,
    }
  }
  
  // Desktop configuration (with touch support check) - Premium sizing
  return {
    ...base,
    rowHeight: touch.hasTouch ? 44 : 36, // Increased for better accessibility
    indent: 10,
    minTouchTarget: touch.hasTouch ? 44 : 36,
    fontSize: breakpoints['2xl'] ? 'base' : 'sm',
    iconSize: breakpoints['2xl'] ? 'w-4.5 h-4.5' : 'w-4 h-4',
    gap: 'gap-2',
    padding: 'px-2.5 py-1.5', // Slightly more comfortable padding
    enableDragDrop: true,
    showInlineActions: true,
    showSwipeActions: false,
    actionButtonSize: 'sm',
    containerHeight: `calc(100vh - 180px)`,
    maxVisibleDepth: 10,
  }
}

/**
 * Hook for responsive tree behavior
 */
export function useResponsiveTree(): ResponsiveState {
  const [state, setState] = useState<ResponsiveState>(() => {
    // SSR-safe initial state
    const defaultState: ResponsiveState = {
      device: 'desktop',
      orientation: 'landscape',
      platform: 'web',
      breakpoints: { xs: false, sm: false, md: false, lg: false, xl: true, '2xl': false },
      touch: {
        hasTouch: false,
        hasMultiTouch: false,
        hasPointer: true,
        primaryInputTouch: false,
        supportsHover: true,
      },
      safeArea: { top: 0, right: 0, bottom: 0, left: 0 },
      viewport: { width: 1024, height: 768 },
      pixelRatio: 1,
      isStandalone: false,
      config: calculateTreeConfig(
        'desktop',
        'landscape',
        { xs: false, sm: false, md: false, lg: false, xl: true, '2xl': false },
        { hasTouch: false, hasMultiTouch: false, hasPointer: true, primaryInputTouch: false, supportsHover: true },
        768
      ),
    }
    return defaultState
  })
  
  const updateState = useCallback(() => {
    if (typeof window === 'undefined') return
    
    const width = window.innerWidth
    const height = window.innerHeight
    const touch = detectTouchCapabilities()
    const platform = detectPlatform()
    const device = detectDevice(width, touch.primaryInputTouch)
    const orientation = detectOrientation(width, height)
    const breakpoints = calculateBreakpoints(width)
    const safeArea = getSafeAreaInsets()
    const pixelRatio = window.devicePixelRatio || 1
    
    // Check if running as PWA/standalone
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true
    
    const config = calculateTreeConfig(device, orientation, breakpoints, touch, height)
    
    setState({
      device,
      orientation,
      platform,
      breakpoints,
      touch,
      safeArea,
      viewport: { width, height },
      pixelRatio,
      isStandalone,
      config,
    })
  }, [])
  
  useEffect(() => {
    // Initial update
    updateState()
    
    // Listen for resize
    window.addEventListener('resize', updateState)
    
    // Listen for orientation change
    window.addEventListener('orientationchange', updateState)
    
    // Listen for media query changes (for hover/pointer)
    const hoverQuery = window.matchMedia('(hover: hover)')
    const pointerQuery = window.matchMedia('(pointer: coarse)')
    
    const handleMediaChange = () => updateState()
    hoverQuery.addEventListener('change', handleMediaChange)
    pointerQuery.addEventListener('change', handleMediaChange)
    
    return () => {
      window.removeEventListener('resize', updateState)
      window.removeEventListener('orientationchange', updateState)
      hoverQuery.removeEventListener('change', handleMediaChange)
      pointerQuery.removeEventListener('change', handleMediaChange)
    }
  }, [updateState])
  
  return state
}

/**
 * Hook for detecting specific device features
 */
export function useDeviceFeatures() {
  const { device, platform, touch, breakpoints, orientation } = useResponsiveTree()
  
  return useMemo(() => ({
    isMobile: device === 'mobile',
    isTablet: device === 'tablet',
    isDesktop: device === 'desktop',
    isIOS: platform === 'ios',
    isAndroid: platform === 'android',
    isWeb: platform === 'web',
    isTouchDevice: touch.primaryInputTouch,
    supportsHover: touch.supportsHover,
    isSmallScreen: breakpoints.xs || breakpoints.sm,
    isMediumScreen: breakpoints.md || breakpoints.lg,
    isLargeScreen: breakpoints.xl || breakpoints['2xl'],
    isPortrait: orientation === 'portrait',
    isLandscape: orientation === 'landscape',
  }), [device, platform, touch, breakpoints, orientation])
}

/**
 * Get responsive class names for tree elements
 */
export function getResponsiveClasses(config: ResponsiveTreeConfig) {
  return {
    container: `
      ${config.containerHeight}
      overflow-hidden
      overscroll-contain
      touch-pan-y
    `,
    row: `
      ${config.padding}
      ${config.gap}
      min-h-[${config.minTouchTarget}px]
      active:bg-zinc-100 dark:active:bg-zinc-800
      transition-colors duration-150
    `,
    icon: config.iconSize,
    text: `text-${config.fontSize}`,
    actionButton: `
      ${config.actionButtonSize === 'lg' ? 'p-2.5' : config.actionButtonSize === 'md' ? 'p-1.5' : 'p-1'}
      ${config.actionButtonSize === 'lg' ? 'min-w-[44px] min-h-[44px]' : ''}
      rounded-lg
      active:scale-95
      transition-transform
    `,
  }
}

export default useResponsiveTree





