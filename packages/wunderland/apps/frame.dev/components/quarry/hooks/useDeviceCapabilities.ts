'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'

// Performance tiers
export type PerformanceTier = 'high' | 'medium' | 'low' | 'minimal'

// Feature flags that can be toggled based on capabilities
export type FeatureFlag = 
  | 'complexAnimations'
  | 'backgroundEffects'
  | 'blurEffects'
  | 'graphPhysics'
  | 'd3PhysicsSimulation'
  | 'semanticSearch'
  | 'realtimeSearch'
  | 'syntaxHighlighting'
  | 'imagePreloading'
  | 'aiFeatures'
  | 'offlineSupport'

// Device capabilities
export interface DeviceCapabilities {
  // Hardware
  cpuCores: number
  deviceMemory: number | null // GB, null if not available
  
  // Display
  screenWidth: number
  screenHeight: number
  devicePixelRatio: number
  prefersReducedMotion: boolean
  
  // Network
  effectiveConnectionType: 'slow-2g' | '2g' | '3g' | '4g' | 'unknown'
  connectionType: 'slow-2g' | '2g' | '3g' | '4g' | 'unknown' // alias
  saveData: boolean
  
  // Browser
  supportsWebGL: boolean
  supportsWebGPU: boolean
  supportsOffscreenCanvas: boolean
  supportsWebWorker: boolean
  supportsServiceWorker: boolean
  
  // Input
  isTouchDevice: boolean
  
  // Accessibility
  isReducedMotion: boolean // alias for prefersReducedMotion
}

// Viewport breakpoints
export interface ViewportState {
  isMobile: boolean      // < 768px
  isTablet: boolean      // 768px - 1024px
  isDesktop: boolean     // 1024px - 1600px
  isUltraWide: boolean   // > 1600px
  width: number
  height: number
}

interface UseDeviceCapabilitiesReturn {
  capabilities: DeviceCapabilities
  tier: PerformanceTier
  viewport: ViewportState
  isDetecting: boolean
  shouldEnable: (feature: FeatureFlag) => boolean
  setManualTier: (tier: PerformanceTier | null) => void
  manualTier: PerformanceTier | null
  // Aliases for backwards compatibility
  tierOverride: PerformanceTier | null
  setTierOverride: (tier: PerformanceTier | null) => void
}

// Storage key for manual override
const MANUAL_TIER_KEY = 'codex-performance-tier'

// Feature requirements by tier
const FEATURE_REQUIREMENTS: Record<FeatureFlag, PerformanceTier[]> = {
  complexAnimations: ['high', 'medium'],
  backgroundEffects: ['high', 'medium'],
  blurEffects: ['high', 'medium'],
  graphPhysics: ['high'],
  d3PhysicsSimulation: ['high'],
  semanticSearch: ['high', 'medium', 'low'],
  realtimeSearch: ['high', 'medium'],
  syntaxHighlighting: ['high', 'medium', 'low'],
  imagePreloading: ['high', 'medium'],
  aiFeatures: ['high', 'medium'],
  offlineSupport: ['high', 'medium', 'low']
}

/**
 * Hook for detecting device capabilities and determining feature availability
 * 
 * Separates LAYOUT (viewport-based) from FEATURES (capability-based):
 * - A flagship phone gets full features in mobile layout
 * - A weak laptop gets reduced effects in desktop layout
 */
export function useDeviceCapabilities(): UseDeviceCapabilitiesReturn {
  const [isDetecting, setIsDetecting] = useState(true)
  const [manualTier, setManualTierState] = useState<PerformanceTier | null>(null)
  const [capabilities, setCapabilities] = useState<DeviceCapabilities>({
    cpuCores: 4,
    deviceMemory: null,
    screenWidth: typeof window !== 'undefined' ? window.innerWidth : 1024,
    screenHeight: typeof window !== 'undefined' ? window.innerHeight : 768,
    devicePixelRatio: typeof window !== 'undefined' ? window.devicePixelRatio : 1,
    prefersReducedMotion: false,
    effectiveConnectionType: 'unknown',
    connectionType: 'unknown',
    saveData: false,
    supportsWebGL: false,
    supportsWebGPU: false,
    supportsOffscreenCanvas: false,
    supportsWebWorker: false,
    supportsServiceWorker: false,
    isTouchDevice: false,
    isReducedMotion: false
  })

  // Detect capabilities on mount
  useEffect(() => {
    if (typeof window === 'undefined') return

    const detect = async () => {
      // Load manual tier from storage
      try {
        const stored = localStorage.getItem(MANUAL_TIER_KEY)
        if (stored && ['high', 'medium', 'low', 'minimal'].includes(stored)) {
          setManualTierState(stored as PerformanceTier)
        }
      } catch {}

      // CPU cores
      const cpuCores = navigator.hardwareConcurrency || 4

      // Device memory (Chrome only)
      const deviceMemory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory || null

      // Display
      const screenWidth = window.innerWidth
      const screenHeight = window.innerHeight
      const devicePixelRatio = window.devicePixelRatio || 1
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

      // Network
      const connection = (navigator as Navigator & { connection?: { effectiveType?: string; saveData?: boolean } }).connection
      const effectiveConnectionType = (connection?.effectiveType as DeviceCapabilities['effectiveConnectionType']) || 'unknown'
      const saveData = connection?.saveData || false

      // WebGL support
      let supportsWebGL = false
      try {
        const canvas = document.createElement('canvas')
        supportsWebGL = !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
      } catch {}

      // WebGPU support
      const supportsWebGPU = 'gpu' in navigator

      // OffscreenCanvas support
      const supportsOffscreenCanvas = 'OffscreenCanvas' in window

      // WebWorker support
      const supportsWebWorker = 'Worker' in window

      setCapabilities({
        cpuCores,
        deviceMemory,
        screenWidth,
        screenHeight,
        devicePixelRatio,
        prefersReducedMotion,
        effectiveConnectionType,
        connectionType: effectiveConnectionType, // alias
        saveData,
        supportsWebGL,
        supportsWebGPU,
        supportsOffscreenCanvas,
        supportsWebWorker,
        supportsServiceWorker: 'serviceWorker' in navigator,
        isTouchDevice: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
        isReducedMotion: prefersReducedMotion
      })

      setIsDetecting(false)
    }

    detect()

    // Update screen dimensions on resize
    const handleResize = () => {
      setCapabilities(prev => ({
        ...prev,
        screenWidth: window.innerWidth,
        screenHeight: window.innerHeight
      }))
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Calculate performance tier from capabilities
  const calculatedTier = useMemo((): PerformanceTier => {
    const { cpuCores, deviceMemory, prefersReducedMotion, effectiveConnectionType, saveData, supportsWebGL } = capabilities

    // User prefers reduced motion = minimal tier
    if (prefersReducedMotion) return 'minimal'

    // Save data mode = low tier
    if (saveData) return 'low'

    // Slow connection = reduce tier
    if (effectiveConnectionType === 'slow-2g' || effectiveConnectionType === '2g') return 'low'

    // Calculate score based on hardware
    let score = 0

    // CPU cores (max 4 points)
    if (cpuCores >= 8) score += 4
    else if (cpuCores >= 4) score += 3
    else if (cpuCores >= 2) score += 2
    else score += 1

    // Memory (max 4 points)
    if (deviceMemory !== null) {
      if (deviceMemory >= 8) score += 4
      else if (deviceMemory >= 4) score += 3
      else if (deviceMemory >= 2) score += 2
      else score += 1
    } else {
      score += 2 // Assume medium if unknown
    }

    // WebGL (2 points)
    if (supportsWebGL) score += 2

    // Determine tier
    if (score >= 8) return 'high'
    if (score >= 5) return 'medium'
    if (score >= 3) return 'low'
    return 'minimal'
  }, [capabilities])

  // Use manual tier if set, otherwise calculated
  const tier = manualTier || calculatedTier

  // Viewport state (purely layout-based)
  const viewport = useMemo((): ViewportState => {
    const { screenWidth, screenHeight } = capabilities
    return {
      isMobile: screenWidth < 768,
      isTablet: screenWidth >= 768 && screenWidth < 1024,
      isDesktop: screenWidth >= 1024 && screenWidth < 1600,
      isUltraWide: screenWidth >= 1600,
      width: screenWidth,
      height: screenHeight
    }
  }, [capabilities])

  // Check if a feature should be enabled
  const shouldEnable = useCallback((feature: FeatureFlag): boolean => {
    const allowedTiers = FEATURE_REQUIREMENTS[feature]
    return allowedTiers.includes(tier)
  }, [tier])

  // Set manual tier override
  const setManualTier = useCallback((newTier: PerformanceTier | null) => {
    setManualTierState(newTier)
    try {
      if (newTier) {
        localStorage.setItem(MANUAL_TIER_KEY, newTier)
      } else {
        localStorage.removeItem(MANUAL_TIER_KEY)
      }
    } catch {}
  }, [])

  return {
    capabilities,
    tier,
    viewport,
    isDetecting,
    shouldEnable,
    setManualTier,
    manualTier,
    // Aliases for backwards compatibility
    tierOverride: manualTier,
    setTierOverride: setManualTier,
  }
}

export default useDeviceCapabilities
