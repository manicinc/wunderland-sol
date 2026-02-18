/**
 * Responsive Configuration
 * 
 * Separates LAYOUT (viewport) from FEATURES (capability):
 * - Layout = where things go based on screen size
 * - Features = what effects/animations based on device power
 */

import type { PerformanceTier } from '../hooks/useDeviceCapabilities'

// Layout configuration based on viewport width
export interface LayoutConfig {
  sidebar: {
    mode: 'permanent' | 'collapsible' | 'overlay'
    width: number | 'auto'
    defaultVisible: boolean
  }
  rightPanel: {
    mode: 'permanent' | 'collapsible' | 'overlay'
    width: number | 'auto'
    defaultVisible: boolean
    bottomSheetFallback: boolean
  }
  navigation: {
    position: 'top' | 'bottom' | 'none'
    bottomNav: boolean
  }
  content: {
    maxWidth: string
    padding: string
  }
}

// Get layout config based on screen width (not capability)
export function getLayoutConfig(screenWidth: number): LayoutConfig {
  // Ultra-wide: 3-panel permanent layout
  if (screenWidth >= 1600) {
    return {
      sidebar: { mode: 'permanent', width: 320, defaultVisible: true },
      rightPanel: { mode: 'permanent', width: 340, defaultVisible: true, bottomSheetFallback: false },
      navigation: { position: 'top', bottomNav: false },
      content: { maxWidth: '75ch', padding: '3rem' }
    }
  }

  // Desktop: 2-panel with collapsible right
  if (screenWidth >= 1024) {
    return {
      sidebar: { mode: 'permanent', width: 300, defaultVisible: true },
      rightPanel: { mode: 'collapsible', width: 320, defaultVisible: false, bottomSheetFallback: false },
      navigation: { position: 'top', bottomNav: false },
      content: { maxWidth: '70ch', padding: '2rem' }
    }
  }

  // Tablet: 1-panel with overlay sidebar
  if (screenWidth >= 768) {
    return {
      sidebar: { mode: 'overlay', width: 320, defaultVisible: false },
      rightPanel: { mode: 'overlay', width: 320, defaultVisible: false, bottomSheetFallback: true },
      navigation: { position: 'top', bottomNav: false },
      content: { maxWidth: '65ch', padding: '1.5rem' }
    }
  }

  // Mobile: full-screen content with bottom nav
  return {
    sidebar: { mode: 'overlay', width: 300, defaultVisible: false },
    rightPanel: { mode: 'overlay', width: 'auto', defaultVisible: false, bottomSheetFallback: true },
    navigation: { position: 'bottom', bottomNav: true },
    content: { maxWidth: '100%', padding: '1rem' }
  }
}

// Animation variants based on capability tier
export interface AnimationVariants {
  spring: { type: 'spring'; stiffness: number; damping: number } | { duration: number }
  fade: { duration: number }
  scale: { scale: number; opacity: number }
}

export function getAnimationVariants(tier: PerformanceTier): AnimationVariants {
  switch (tier) {
    case 'high':
      return {
        spring: { type: 'spring', stiffness: 300, damping: 30 },
        fade: { duration: 0.3 },
        scale: { scale: 0.95, opacity: 0 }
      }
    case 'medium':
      return {
        spring: { type: 'spring', stiffness: 400, damping: 35 },
        fade: { duration: 0.2 },
        scale: { scale: 0.98, opacity: 0 }
      }
    case 'low':
      return {
        spring: { duration: 0.15 },
        fade: { duration: 0.15 },
        scale: { scale: 1, opacity: 0 }
      }
    case 'minimal':
    default:
      return {
        spring: { duration: 0 },
        fade: { duration: 0 },
        scale: { scale: 1, opacity: 0 }
      }
  }
}

// CSS effect classes based on capability tier
export interface EffectClasses {
  blur: string
  shadow: string
  transition: string
  transform: string
}

export function getEffectClasses(tier: PerformanceTier): EffectClasses {
  switch (tier) {
    case 'high':
      return {
        blur: 'backdrop-blur-xl',
        shadow: 'shadow-2xl',
        transition: 'transition-all duration-300',
        transform: 'hover:scale-105'
      }
    case 'medium':
      return {
        blur: 'backdrop-blur-md',
        shadow: 'shadow-lg',
        transition: 'transition-all duration-200',
        transform: 'hover:scale-102'
      }
    case 'low':
      return {
        blur: 'backdrop-blur-sm',
        shadow: 'shadow-md',
        transition: 'transition-colors duration-150',
        transform: ''
      }
    case 'minimal':
    default:
      return {
        blur: '',
        shadow: 'shadow',
        transition: '',
        transform: ''
      }
  }
}

// Breakpoint utilities
export const BREAKPOINTS = {
  mobile: 0,
  tablet: 768,
  desktop: 1024,
  ultraWide: 1600
} as const

export type Breakpoint = keyof typeof BREAKPOINTS

export function getCurrentBreakpoint(width: number): Breakpoint {
  if (width >= BREAKPOINTS.ultraWide) return 'ultraWide'
  if (width >= BREAKPOINTS.desktop) return 'desktop'
  if (width >= BREAKPOINTS.tablet) return 'tablet'
  return 'mobile'
}

// Feature configuration per tier
export interface TierFeatureConfig {
  animations: boolean
  blurEffects: boolean
  shadowEffects: boolean
  graphPhysics: boolean
  semanticSearch: boolean
  syntaxHighlighting: boolean
  imagePreloading: boolean
  transitions: boolean
}

export const TIER_FEATURE_CONFIG: Record<PerformanceTier, TierFeatureConfig> = {
  high: {
    animations: true,
    blurEffects: true,
    shadowEffects: true,
    graphPhysics: true,
    semanticSearch: true,
    syntaxHighlighting: true,
    imagePreloading: true,
    transitions: true,
  },
  medium: {
    animations: true,
    blurEffects: true,
    shadowEffects: true,
    graphPhysics: false,
    semanticSearch: true,
    syntaxHighlighting: true,
    imagePreloading: true,
    transitions: true,
  },
  low: {
    animations: false,
    blurEffects: false,
    shadowEffects: true,
    graphPhysics: false,
    semanticSearch: true,
    syntaxHighlighting: true,
    imagePreloading: false,
    transitions: true,
  },
  minimal: {
    animations: false,
    blurEffects: false,
    shadowEffects: false,
    graphPhysics: false,
    semanticSearch: false,
    syntaxHighlighting: false,
    imagePreloading: false,
    transitions: false,
  },
}
