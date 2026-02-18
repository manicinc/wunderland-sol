/**
 * Soundscape Scene Types
 * @module components/quarry/ui/soundscapes/types
 *
 * Shared types and interfaces for audio-reactive animated SVG soundscape scenes.
 */

import type { SoundscapeType } from '@/lib/audio/ambienceSounds'
import type { ThemeName } from '@/types/theme'
import { isDarkTheme, isTerminalTheme, isSepiaTheme, isOceanicTheme } from '@/types/theme'

// ============================================================================
// SCENE PROPS
// ============================================================================

/**
 * Props for all soundscape scene components
 */
export interface SoundscapeSceneProps {
  /** Web Audio API AnalyserNode for audio reactivity */
  analyser: AnalyserNode | null
  /** Whether audio is currently playing */
  isPlaying: boolean
  /** Scene width in pixels */
  width?: number
  /** Scene height in pixels */
  height?: number
  /** Dark mode (deprecated - use theme instead) */
  isDark?: boolean
  /** Full theme name for theme-aware styling */
  theme?: ThemeName
  /** Additional class names */
  className?: string
  /** Reduced motion preference */
  reducedMotion?: boolean
}

// ============================================================================
// AUDIO DATA
// ============================================================================

/**
 * Processed audio frequency data for reactive animations
 */
export interface AudioReactiveData {
  /** Overall amplitude (0-1) */
  amplitude: number
  /** Bass frequencies 0-10% (0-1) */
  bass: number
  /** Mid frequencies 10-50% (0-1) */
  mid: number
  /** High frequencies 50-100% (0-1) */
  high: number
  /** Raw frequency data array */
  frequencyData: Uint8Array | null
}

/**
 * Default audio reactive data when no audio is playing
 */
export const DEFAULT_AUDIO_DATA: AudioReactiveData = {
  amplitude: 0,
  bass: 0,
  mid: 0,
  high: 0,
  frequencyData: null,
}

// ============================================================================
// PARTICLE SYSTEM
// ============================================================================

/**
 * Base particle for particle systems (rain drops, embers, leaves, etc.)
 */
export interface Particle {
  /** Unique identifier */
  id: string | number
  /** X position (0-1 normalized or pixels) */
  x: number
  /** Y position (0-1 normalized or pixels) */
  y: number
  /** Size/scale */
  size: number
  /** Opacity (0-1) */
  opacity: number
  /** Animation delay in seconds */
  delay: number
  /** Animation duration in seconds */
  duration: number
}

/**
 * Extended particle with velocity
 */
export interface MovingParticle extends Particle {
  /** Velocity X */
  vx: number
  /** Velocity Y */
  vy: number
  /** Rotation in degrees */
  rotation?: number
  /** Rotation velocity */
  rotationVelocity?: number
}

// ============================================================================
// ANIMATION PRESETS
// ============================================================================

/**
 * CSS easing functions for consistent animations
 */
export const EASING = {
  /** Standard ease */
  ease: 'cubic-bezier(0.4, 0, 0.2, 1)',
  /** Ease in */
  easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
  /** Ease out */
  easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
  /** Ease in-out */
  easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  /** Linear */
  linear: 'linear',
  /** Bounce */
  bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  /** Smooth wave-like */
  wave: 'cubic-bezier(0.45, 0.05, 0.55, 0.95)',
} as const

/**
 * Default animation durations in seconds
 */
export const DURATIONS = {
  /** Fast micro-interactions */
  fast: 0.15,
  /** Normal transitions */
  normal: 0.3,
  /** Slow, ambient animations */
  slow: 0.6,
  /** Very slow, background animations */
  verySlow: 1.2,
  /** Continuous loop base */
  loop: 2,
} as const

// ============================================================================
// COLOR PALETTES
// ============================================================================

/**
 * Color palette for each soundscape type
 */
export const SOUNDSCAPE_PALETTES: Record<SoundscapeType, {
  primary: string
  secondary: string
  accent: string
  background: string
  glow: string
}> = {
  rain: {
    primary: '#64748b',
    secondary: '#94a3b8',
    accent: '#60a5fa',
    background: '#1e293b',
    glow: 'rgba(96, 165, 250, 0.3)',
  },
  cafe: {
    primary: '#d97706',
    secondary: '#fbbf24',
    accent: '#f59e0b',
    background: '#451a03',
    glow: 'rgba(251, 191, 36, 0.3)',
  },
  forest: {
    primary: '#22c55e',
    secondary: '#86efac',
    accent: '#4ade80',
    background: '#14532d',
    glow: 'rgba(74, 222, 128, 0.3)',
  },
  ocean: {
    primary: '#0ea5e9',
    secondary: '#7dd3fc',
    accent: '#38bdf8',
    background: '#0c4a6e',
    glow: 'rgba(56, 189, 248, 0.3)',
  },
  fireplace: {
    primary: '#f97316',
    secondary: '#fdba74',
    accent: '#fb923c',
    background: '#1c1917',
    glow: 'rgba(249, 115, 22, 0.4)',
  },
  lofi: {
    primary: '#a855f7',
    secondary: '#c4b5fd',
    accent: '#8b5cf6',
    background: '#1e1b4b',
    glow: 'rgba(168, 85, 247, 0.3)',
  },
  'white-noise': {
    primary: '#71717a',
    secondary: '#a1a1aa',
    accent: '#d4d4d8',
    background: '#18181b',
    glow: 'rgba(161, 161, 170, 0.2)',
  },
  none: {
    primary: '#52525b',
    secondary: '#71717a',
    accent: '#a1a1aa',
    background: '#27272a',
    glow: 'rgba(113, 113, 122, 0.2)',
  },
}

/**
 * Color palette type for soundscapes
 */
export interface SoundscapePalette {
  primary: string
  secondary: string
  accent: string
  background: string
  glow: string
}

/**
 * Theme-aware color palettes for all 8 themes
 * Each soundscape has customized colors for each theme category
 */
export const THEMED_SOUNDSCAPE_PALETTES: Record<SoundscapeType, Record<ThemeName, SoundscapePalette>> = {
  rain: {
    light: { primary: '#475569', secondary: '#64748b', accent: '#3b82f6', background: '#f1f5f9', glow: 'rgba(59, 130, 246, 0.2)' },
    dark: { primary: '#64748b', secondary: '#94a3b8', accent: '#60a5fa', background: '#1e293b', glow: 'rgba(96, 165, 250, 0.3)' },
    'sepia-light': { primary: '#8b7355', secondary: '#a89070', accent: '#b8860b', background: '#f5f0e8', glow: 'rgba(184, 134, 11, 0.2)' },
    'sepia-dark': { primary: '#a89070', secondary: '#c4a882', accent: '#d4a574', background: '#2a2520', glow: 'rgba(212, 165, 116, 0.25)' },
    'terminal-light': { primary: '#d49a30', secondary: '#e6b84a', accent: '#ffb000', background: '#1a1408', glow: 'rgba(255, 176, 0, 0.3)' },
    'terminal-dark': { primary: '#30b868', secondary: '#50d080', accent: '#00ff00', background: '#0a140a', glow: 'rgba(0, 255, 0, 0.25)' },
    'oceanic-light': { primary: '#0e7490', secondary: '#0891b2', accent: '#06b6d4', background: '#ecfeff', glow: 'rgba(6, 182, 212, 0.2)' },
    'oceanic-dark': { primary: '#22d3ee', secondary: '#67e8f9', accent: '#a5f3fc', background: '#0c4a6e', glow: 'rgba(34, 211, 238, 0.3)' },
  },
  cafe: {
    light: { primary: '#b45309', secondary: '#d97706', accent: '#f59e0b', background: '#fffbeb', glow: 'rgba(245, 158, 11, 0.2)' },
    dark: { primary: '#d97706', secondary: '#fbbf24', accent: '#f59e0b', background: '#451a03', glow: 'rgba(251, 191, 36, 0.3)' },
    'sepia-light': { primary: '#92400e', secondary: '#b45309', accent: '#d4a574', background: '#fef3e2', glow: 'rgba(212, 165, 116, 0.25)' },
    'sepia-dark': { primary: '#c9a870', secondary: '#ddb886', accent: '#e8c99a', background: '#1f1a14', glow: 'rgba(201, 168, 112, 0.3)' },
    'terminal-light': { primary: '#cc8800', secondary: '#e6a030', accent: '#ffb000', background: '#140d00', glow: 'rgba(255, 176, 0, 0.35)' },
    'terminal-dark': { primary: '#40c070', secondary: '#60d890', accent: '#00ff00', background: '#081408', glow: 'rgba(0, 255, 0, 0.25)' },
    'oceanic-light': { primary: '#0d9488', secondary: '#14b8a6', accent: '#2dd4bf', background: '#f0fdfa', glow: 'rgba(45, 212, 191, 0.2)' },
    'oceanic-dark': { primary: '#f59e0b', secondary: '#fbbf24', accent: '#fcd34d', background: '#0c4a6e', glow: 'rgba(251, 191, 36, 0.3)' },
  },
  forest: {
    light: { primary: '#15803d', secondary: '#22c55e', accent: '#4ade80', background: '#f0fdf4', glow: 'rgba(74, 222, 128, 0.2)' },
    dark: { primary: '#22c55e', secondary: '#86efac', accent: '#4ade80', background: '#14532d', glow: 'rgba(74, 222, 128, 0.3)' },
    'sepia-light': { primary: '#4d7c0f', secondary: '#65a30d', accent: '#84cc16', background: '#fefce8', glow: 'rgba(132, 204, 22, 0.2)' },
    'sepia-dark': { primary: '#9ca870', secondary: '#b0bc86', accent: '#c4d09c', background: '#1a1d14', glow: 'rgba(156, 168, 112, 0.25)' },
    'terminal-light': { primary: '#b8a030', secondary: '#d0b848', accent: '#ffb000', background: '#0f0d04', glow: 'rgba(255, 176, 0, 0.3)' },
    'terminal-dark': { primary: '#00cc44', secondary: '#20e864', accent: '#00ff00', background: '#041408', glow: 'rgba(0, 255, 0, 0.35)' },
    'oceanic-light': { primary: '#059669', secondary: '#10b981', accent: '#34d399', background: '#ecfdf5', glow: 'rgba(52, 211, 153, 0.2)' },
    'oceanic-dark': { primary: '#34d399', secondary: '#6ee7b7', accent: '#a7f3d0', background: '#064e3b', glow: 'rgba(52, 211, 153, 0.3)' },
  },
  ocean: {
    light: { primary: '#0284c7', secondary: '#0ea5e9', accent: '#38bdf8', background: '#f0f9ff', glow: 'rgba(56, 189, 248, 0.2)' },
    dark: { primary: '#0ea5e9', secondary: '#7dd3fc', accent: '#38bdf8', background: '#0c4a6e', glow: 'rgba(56, 189, 248, 0.3)' },
    'sepia-light': { primary: '#5b7c99', secondary: '#7094b0', accent: '#88aac4', background: '#f8f5f0', glow: 'rgba(136, 170, 196, 0.2)' },
    'sepia-dark': { primary: '#8099b0', secondary: '#98afc4', accent: '#b0c5d8', background: '#1a1e22', glow: 'rgba(128, 153, 176, 0.25)' },
    'terminal-light': { primary: '#c09030', secondary: '#d8a848', accent: '#ffb000', background: '#0a0804', glow: 'rgba(255, 176, 0, 0.3)' },
    'terminal-dark': { primary: '#30a878', secondary: '#48c090', accent: '#00ff00', background: '#040a08', glow: 'rgba(0, 255, 0, 0.3)' },
    'oceanic-light': { primary: '#0891b2', secondary: '#06b6d4', accent: '#22d3ee', background: '#cffafe', glow: 'rgba(34, 211, 238, 0.25)' },
    'oceanic-dark': { primary: '#06b6d4', secondary: '#22d3ee', accent: '#67e8f9', background: '#083344', glow: 'rgba(34, 211, 238, 0.35)' },
  },
  fireplace: {
    light: { primary: '#c2410c', secondary: '#ea580c', accent: '#f97316', background: '#fff7ed', glow: 'rgba(249, 115, 22, 0.25)' },
    dark: { primary: '#f97316', secondary: '#fdba74', accent: '#fb923c', background: '#1c1917', glow: 'rgba(249, 115, 22, 0.4)' },
    'sepia-light': { primary: '#b84c00', secondary: '#d46000', accent: '#f07800', background: '#fef6e8', glow: 'rgba(240, 120, 0, 0.25)' },
    'sepia-dark': { primary: '#e07830', secondary: '#f08c48', accent: '#ffa060', background: '#1c1610', glow: 'rgba(224, 120, 48, 0.35)' },
    'terminal-light': { primary: '#e09020', secondary: '#f0a838', accent: '#ffb000', background: '#120c04', glow: 'rgba(255, 176, 0, 0.4)' },
    'terminal-dark': { primary: '#50c860', secondary: '#70e080', accent: '#00ff00', background: '#0c1408', glow: 'rgba(0, 255, 0, 0.3)' },
    'oceanic-light': { primary: '#ea580c', secondary: '#f97316', accent: '#fb923c', background: '#ffedd5', glow: 'rgba(249, 115, 22, 0.25)' },
    'oceanic-dark': { primary: '#fb923c', secondary: '#fdba74', accent: '#fed7aa', background: '#1c1917', glow: 'rgba(251, 146, 60, 0.35)' },
  },
  lofi: {
    light: { primary: '#7c3aed', secondary: '#8b5cf6', accent: '#a78bfa', background: '#faf5ff', glow: 'rgba(167, 139, 250, 0.2)' },
    dark: { primary: '#a855f7', secondary: '#c4b5fd', accent: '#8b5cf6', background: '#1e1b4b', glow: 'rgba(168, 85, 247, 0.3)' },
    'sepia-light': { primary: '#7c5c9c', secondary: '#9474b4', accent: '#ac8ccc', background: '#f8f4fa', glow: 'rgba(172, 140, 204, 0.2)' },
    'sepia-dark': { primary: '#a888c8', secondary: '#bca0dc', accent: '#d0b8f0', background: '#1c1820', glow: 'rgba(168, 136, 200, 0.3)' },
    'terminal-light': { primary: '#cc9020', secondary: '#e4a838', accent: '#ffb000', background: '#0c0808', glow: 'rgba(255, 176, 0, 0.35)' },
    'terminal-dark': { primary: '#40b870', secondary: '#60d088', accent: '#00ff00', background: '#08100c', glow: 'rgba(0, 255, 0, 0.3)' },
    'oceanic-light': { primary: '#7c3aed', secondary: '#8b5cf6', accent: '#a78bfa', background: '#f5f3ff', glow: 'rgba(167, 139, 250, 0.2)' },
    'oceanic-dark': { primary: '#a78bfa', secondary: '#c4b5fd', accent: '#ddd6fe', background: '#1e1b4b', glow: 'rgba(167, 139, 250, 0.35)' },
  },
  'white-noise': {
    light: { primary: '#52525b', secondary: '#71717a', accent: '#a1a1aa', background: '#fafafa', glow: 'rgba(113, 113, 122, 0.15)' },
    dark: { primary: '#71717a', secondary: '#a1a1aa', accent: '#d4d4d8', background: '#18181b', glow: 'rgba(161, 161, 170, 0.2)' },
    'sepia-light': { primary: '#78716c', secondary: '#a8a29e', accent: '#d6d3d1', background: '#fafaf9', glow: 'rgba(168, 162, 158, 0.15)' },
    'sepia-dark': { primary: '#a8a29e', secondary: '#d6d3d1', accent: '#e7e5e4', background: '#1c1917', glow: 'rgba(168, 162, 158, 0.2)' },
    'terminal-light': { primary: '#b89830', secondary: '#d0b048', accent: '#ffb000', background: '#0a0804', glow: 'rgba(255, 176, 0, 0.25)' },
    'terminal-dark': { primary: '#40a858', secondary: '#58c070', accent: '#00ff00', background: '#080c08', glow: 'rgba(0, 255, 0, 0.2)' },
    'oceanic-light': { primary: '#64748b', secondary: '#94a3b8', accent: '#cbd5e1', background: '#f8fafc', glow: 'rgba(148, 163, 184, 0.15)' },
    'oceanic-dark': { primary: '#94a3b8', secondary: '#cbd5e1', accent: '#e2e8f0', background: '#0f172a', glow: 'rgba(148, 163, 184, 0.2)' },
  },
  none: {
    light: { primary: '#71717a', secondary: '#a1a1aa', accent: '#d4d4d8', background: '#fafafa', glow: 'rgba(113, 113, 122, 0.1)' },
    dark: { primary: '#52525b', secondary: '#71717a', accent: '#a1a1aa', background: '#27272a', glow: 'rgba(113, 113, 122, 0.2)' },
    'sepia-light': { primary: '#78716c', secondary: '#a8a29e', accent: '#d6d3d1', background: '#fafaf9', glow: 'rgba(120, 113, 108, 0.1)' },
    'sepia-dark': { primary: '#57534e', secondary: '#78716c', accent: '#a8a29e', background: '#1c1917', glow: 'rgba(120, 113, 108, 0.15)' },
    'terminal-light': { primary: '#a88820', secondary: '#c0a038', accent: '#ffb000', background: '#080604', glow: 'rgba(255, 176, 0, 0.15)' },
    'terminal-dark': { primary: '#309848', secondary: '#48b060', accent: '#00ff00', background: '#060a06', glow: 'rgba(0, 255, 0, 0.15)' },
    'oceanic-light': { primary: '#64748b', secondary: '#94a3b8', accent: '#cbd5e1', background: '#f8fafc', glow: 'rgba(100, 116, 139, 0.1)' },
    'oceanic-dark': { primary: '#475569', secondary: '#64748b', accent: '#94a3b8', background: '#0f172a', glow: 'rgba(71, 85, 105, 0.15)' },
  },
}

/**
 * Get the color palette for a soundscape based on the current theme
 * Falls back to dark/light palettes if theme is not specified
 */
export function getSoundscapePalette(
  soundscape: SoundscapeType,
  theme?: ThemeName | null
): SoundscapePalette {
  // No theme - use default palettes
  if (!theme) {
    return SOUNDSCAPE_PALETTES[soundscape] ?? SOUNDSCAPE_PALETTES.none
  }

  // Get themed palette with fallback
  const themedPalette = THEMED_SOUNDSCAPE_PALETTES[soundscape]?.[theme]
  if (themedPalette) {
    return themedPalette
  }

  // Fallback to default soundscape palette
  return SOUNDSCAPE_PALETTES[soundscape] ?? SOUNDSCAPE_PALETTES.none
}

/**
 * Theme style utilities for scene components
 */
export interface ThemeStyleConfig {
  isTerminal: boolean
  isSepia: boolean
  isOceanic: boolean
  isDark: boolean
  phosphorColor: string
  glowIntensity: number
}

/**
 * Get theme-specific styling configuration
 */
export function getThemeStyleConfig(theme?: ThemeName | null): ThemeStyleConfig {
  if (!theme) {
    return {
      isTerminal: false,
      isSepia: false,
      isOceanic: false,
      isDark: true,
      phosphorColor: 'transparent',
      glowIntensity: 1,
    }
  }

  const isTerminal = isTerminalTheme(theme)
  const isSepia = isSepiaTheme(theme)
  const isOceanic = isOceanicTheme(theme)
  const isDark = isDarkTheme(theme)

  // Terminal themes get phosphor glow
  const phosphorColor = isTerminal
    ? theme === 'terminal-dark'
      ? 'rgba(0, 255, 0, 0.15)'
      : 'rgba(255, 176, 0, 0.15)'
    : 'transparent'

  // Sepia themes get reduced glow
  const glowIntensity = isSepia ? 0.7 : isTerminal ? 1.2 : 1

  return {
    isTerminal,
    isSepia,
    isOceanic,
    isDark,
    phosphorColor,
    glowIntensity,
  }
}

// ============================================================================
// SCENE DIMENSIONS
// ============================================================================

/**
 * Default scene dimensions
 */
export const DEFAULT_SCENE_DIMENSIONS = {
  width: 400,
  height: 300,
} as const

/**
 * Aspect ratio for scenes
 */
export const SCENE_ASPECT_RATIO = 4 / 3

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Scene component type
 */
export type SoundscapeSceneComponent = React.FC<SoundscapeSceneProps>

/**
 * Map of soundscape types to their scene components
 */
export type SoundscapeSceneMap = Partial<Record<SoundscapeType, SoundscapeSceneComponent>>

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Generate a unique particle ID
 */
export function generateParticleId(prefix: string, index: number): string {
  return `${prefix}-${index}-${Date.now()}`
}

/**
 * Create particles with randomized properties
 */
export function createParticles(
  count: number,
  prefix: string,
  config: {
    minSize?: number
    maxSize?: number
    minDuration?: number
    maxDuration?: number
    minOpacity?: number
    maxOpacity?: number
  } = {}
): Particle[] {
  const {
    minSize = 1,
    maxSize = 3,
    minDuration = 1,
    maxDuration = 3,
    minOpacity = 0.3,
    maxOpacity = 1,
  } = config

  return Array.from({ length: count }, (_, i) => ({
    id: generateParticleId(prefix, i),
    x: Math.random(),
    y: Math.random(),
    size: minSize + Math.random() * (maxSize - minSize),
    opacity: minOpacity + Math.random() * (maxOpacity - minOpacity),
    delay: Math.random() * maxDuration,
    duration: minDuration + Math.random() * (maxDuration - minDuration),
  }))
}

/**
 * Interpolate between two values based on audio amplitude
 */
export function audioLerp(
  min: number,
  max: number,
  audioValue: number,
  sensitivity: number = 1
): number {
  const clamped = Math.max(0, Math.min(1, audioValue * sensitivity))
  return min + (max - min) * clamped
}

/**
 * Smooth value changes for less jittery animations
 */
export function smoothValue(
  current: number,
  target: number,
  smoothing: number = 0.1
): number {
  return current + (target - current) * smoothing
}
