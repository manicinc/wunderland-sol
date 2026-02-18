/**
 * useResponsiveLayout - Intelligent responsive layout management
 * @module codex/hooks/useResponsiveLayout
 * 
 * Provides layout presets and breakpoint detection for optimal
 * viewing experience across all screen sizes from mobile portrait
 * to ultrawide 4K displays.
 */

'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'

// ==================== Types ====================

export type ScreenSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4k'
export type Orientation = 'portrait' | 'landscape'
export type DeviceType = 'mobile' | 'tablet' | 'desktop' | 'ultrawide'

export interface LayoutPreset {
  /** Screen size category */
  size: ScreenSize
  /** Portrait or landscape */
  orientation: Orientation
  /** Device type */
  device: DeviceType
  /** Left sidebar default width (px) */
  sidebarWidth: number
  /** Right panel default width (px) */
  rightPanelWidth: number
  /** Whether left sidebar should be visible by default */
  sidebarDefaultOpen: boolean
  /** Whether right panel should be visible by default */
  rightPanelDefaultOpen: boolean
  /** Content max width (px or 'full') */
  contentMaxWidth: number | 'full'
  /** Font scale multiplier */
  fontScale: number
  /** Can show both sidebars at once */
  canShowBothPanels: boolean
  /** Show editor preview side-by-side */
  editorSplitView: boolean
}

export interface LayoutState {
  /** Current screen width */
  width: number
  /** Current screen height */
  height: number
  /** Screen size category */
  screenSize: ScreenSize
  /** Orientation */
  orientation: Orientation
  /** Device type */
  deviceType: DeviceType
  /** Current layout preset */
  preset: LayoutPreset
  /** Is mobile (< 768px) */
  isMobile: boolean
  /** Is tablet (768px - 1024px) */
  isTablet: boolean
  /** Is desktop (>= 1024px) */
  isDesktop: boolean
  /** Is ultrawide (>= 2560px) */
  isUltrawide: boolean
  /** Has touch capability */
  hasTouch: boolean
}

// ==================== Breakpoints ====================

export const BREAKPOINTS = {
  xs: 0,      // Mobile portrait
  sm: 480,    // Mobile landscape / large phone
  md: 768,    // Tablet portrait
  lg: 1024,   // Tablet landscape / small desktop
  xl: 1280,   // Desktop
  '2xl': 1536, // Large desktop
  '3xl': 1920, // Full HD
  '4k': 2560,  // 4K / Ultrawide
}

// ==================== Presets ====================

const LAYOUT_PRESETS: Record<string, LayoutPreset> = {
  // Mobile portrait (< 480px)
  'xs-portrait': {
    size: 'xs',
    orientation: 'portrait',
    device: 'mobile',
    sidebarWidth: 300,
    rightPanelWidth: 340,
    sidebarDefaultOpen: false,
    rightPanelDefaultOpen: false,
    contentMaxWidth: 'full',
    fontScale: 0.9,
    canShowBothPanels: false,
    editorSplitView: false,
  },
  // Mobile landscape (480-768px)
  'sm-landscape': {
    size: 'sm',
    orientation: 'landscape',
    device: 'mobile',
    sidebarWidth: 280,
    rightPanelWidth: 320,
    sidebarDefaultOpen: false,
    rightPanelDefaultOpen: false,
    contentMaxWidth: 'full',
    fontScale: 0.95,
    canShowBothPanels: false,
    editorSplitView: false,
  },
  // Tablet portrait (768-1024px)
  'md-portrait': {
    size: 'md',
    orientation: 'portrait',
    device: 'tablet',
    sidebarWidth: 300,
    rightPanelWidth: 340,
    sidebarDefaultOpen: false,
    rightPanelDefaultOpen: false,
    contentMaxWidth: 'full',
    fontScale: 1,
    canShowBothPanels: false,
    editorSplitView: false,
  },
  // Tablet landscape (768-1024px landscape)
  'md-landscape': {
    size: 'md',
    orientation: 'landscape',
    device: 'tablet',
    sidebarWidth: 280,
    rightPanelWidth: 300,
    sidebarDefaultOpen: true,
    rightPanelDefaultOpen: false,
    contentMaxWidth: 'full',
    fontScale: 1,
    canShowBothPanels: true,
    editorSplitView: false,
  },
  // Small desktop (1024-1280px)
  'lg-landscape': {
    size: 'lg',
    orientation: 'landscape',
    device: 'desktop',
    sidebarWidth: 300,
    rightPanelWidth: 320,
    sidebarDefaultOpen: true,
    rightPanelDefaultOpen: true,
    contentMaxWidth: 'full',
    fontScale: 1,
    canShowBothPanels: true,
    editorSplitView: false,
  },
  // Desktop (1280-1536px)
  'xl-landscape': {
    size: 'xl',
    orientation: 'landscape',
    device: 'desktop',
    sidebarWidth: 320,
    rightPanelWidth: 340,
    sidebarDefaultOpen: true,
    rightPanelDefaultOpen: true,
    contentMaxWidth: 900,
    fontScale: 1,
    canShowBothPanels: true,
    editorSplitView: true,
  },
  // Large desktop (1536-1920px)
  '2xl-landscape': {
    size: '2xl',
    orientation: 'landscape',
    device: 'desktop',
    sidebarWidth: 340,
    rightPanelWidth: 380,
    sidebarDefaultOpen: true,
    rightPanelDefaultOpen: true,
    contentMaxWidth: 1000,
    fontScale: 1.05,
    canShowBothPanels: true,
    editorSplitView: true,
  },
  // Full HD (1920-2560px)
  '3xl-landscape': {
    size: '3xl',
    orientation: 'landscape',
    device: 'desktop',
    sidebarWidth: 360,
    rightPanelWidth: 420,
    sidebarDefaultOpen: true,
    rightPanelDefaultOpen: true,
    contentMaxWidth: 1100,
    fontScale: 1.1,
    canShowBothPanels: true,
    editorSplitView: true,
  },
  // 4K / Ultrawide (>= 2560px)
  '4k-landscape': {
    size: '4k',
    orientation: 'landscape',
    device: 'ultrawide',
    sidebarWidth: 400,
    rightPanelWidth: 470,
    sidebarDefaultOpen: true,
    rightPanelDefaultOpen: true,
    contentMaxWidth: 1200,
    fontScale: 1.15,
    canShowBothPanels: true,
    editorSplitView: true,
  },
}

// ==================== Utilities ====================

function getScreenSize(width: number): ScreenSize {
  if (width >= BREAKPOINTS['4k']) return '4k'
  if (width >= BREAKPOINTS['3xl']) return '3xl'
  if (width >= BREAKPOINTS['2xl']) return '2xl'
  if (width >= BREAKPOINTS.xl) return 'xl'
  if (width >= BREAKPOINTS.lg) return 'lg'
  if (width >= BREAKPOINTS.md) return 'md'
  if (width >= BREAKPOINTS.sm) return 'sm'
  return 'xs'
}

function getOrientation(width: number, height: number): Orientation {
  return width >= height ? 'landscape' : 'portrait'
}

function getDeviceType(width: number): DeviceType {
  if (width >= BREAKPOINTS['4k']) return 'ultrawide'
  if (width >= BREAKPOINTS.lg) return 'desktop'
  if (width >= BREAKPOINTS.md) return 'tablet'
  return 'mobile'
}

function getPreset(size: ScreenSize, orientation: Orientation): LayoutPreset {
  // Try exact match first
  const key = `${size}-${orientation}`
  if (LAYOUT_PRESETS[key]) return LAYOUT_PRESETS[key]
  
  // Fall back to landscape preset for larger screens
  const landscapeKey = `${size}-landscape`
  if (LAYOUT_PRESETS[landscapeKey]) return LAYOUT_PRESETS[landscapeKey]
  
  // Fall back to portrait preset for smaller screens
  const portraitKey = `${size}-portrait`
  if (LAYOUT_PRESETS[portraitKey]) return LAYOUT_PRESETS[portraitKey]
  
  // Ultimate fallback
  return LAYOUT_PRESETS['md-portrait']
}

// ==================== Hook ====================

interface UseResponsiveLayoutOptions {
  /** Callback when layout changes */
  onLayoutChange?: (layout: LayoutState) => void
}

export function useResponsiveLayout(options: UseResponsiveLayoutOptions = {}): LayoutState {
  const { onLayoutChange } = options
  
  // Initialize with safe defaults for SSR
  const [state, setState] = useState<LayoutState>(() => ({
    width: typeof window !== 'undefined' ? window.innerWidth : 1024,
    height: typeof window !== 'undefined' ? window.innerHeight : 768,
    screenSize: 'lg',
    orientation: 'landscape',
    deviceType: 'desktop',
    preset: LAYOUT_PRESETS['lg-landscape'],
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    isUltrawide: false,
    hasTouch: false,
  }))
  
  const updateLayout = useCallback(() => {
    if (typeof window === 'undefined') return
    
    const width = window.innerWidth
    const height = window.innerHeight
    const screenSize = getScreenSize(width)
    const orientation = getOrientation(width, height)
    const deviceType = getDeviceType(width)
    const preset = getPreset(screenSize, orientation)
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0
    
    const newState: LayoutState = {
      width,
      height,
      screenSize,
      orientation,
      deviceType,
      preset,
      isMobile: deviceType === 'mobile',
      isTablet: deviceType === 'tablet',
      isDesktop: deviceType === 'desktop' || deviceType === 'ultrawide',
      isUltrawide: deviceType === 'ultrawide',
      hasTouch,
    }
    
    setState(prev => {
      // Only update if something changed
      if (
        prev.width !== newState.width ||
        prev.height !== newState.height ||
        prev.screenSize !== newState.screenSize ||
        prev.orientation !== newState.orientation
      ) {
        onLayoutChange?.(newState)
        return newState
      }
      return prev
    })
  }, [onLayoutChange])
  
  useEffect(() => {
    // Initial layout calculation
    updateLayout()
    
    // Listen for resize events
    const handleResize = () => {
      // Debounce resize events
      requestAnimationFrame(updateLayout)
    }
    
    window.addEventListener('resize', handleResize)
    window.addEventListener('orientationchange', handleResize)
    
    // Also update on visibility change (handles returning from other apps on mobile)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        updateLayout()
      }
    })
    
    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('orientationchange', handleResize)
    }
  }, [updateLayout])
  
  return state
}

// ==================== CSS Variables Generator ====================

export function getLayoutCSSVariables(layout: LayoutState): Record<string, string> {
  const { preset } = layout
  
  return {
    '--sidebar-width': `${preset.sidebarWidth}px`,
    '--right-panel-width': `${preset.rightPanelWidth}px`,
    '--content-max-width': preset.contentMaxWidth === 'full' ? '100%' : `${preset.contentMaxWidth}px`,
    '--font-scale': String(preset.fontScale),
    '--base-font-size': `${14 * preset.fontScale}px`,
    '--sm-font-size': `${12 * preset.fontScale}px`,
    '--xs-font-size': `${10 * preset.fontScale}px`,
  }
}

// ==================== Z-Index System ====================
// Re-export from constants for backward compatibility
export { Z_INDEX } from '../constants'









