/**
 * SoundscapeContainer
 * @module components/quarry/ui/soundscapes/shared/SoundscapeContainer
 *
 * Base container component for all soundscape scenes.
 * Provides consistent sizing, aspect ratio, and accessibility features.
 */

'use client'

import React, { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import {
  DEFAULT_SCENE_DIMENSIONS,
  SCENE_ASPECT_RATIO,
  SOUNDSCAPE_PALETTES,
  getSoundscapePalette,
  getThemeStyleConfig,
} from '../types'
import type { SoundscapeType } from '@/lib/audio/ambienceSounds'
import type { ThemeName } from '@/types/theme'

// ============================================================================
// TYPES
// ============================================================================

export interface SoundscapeContainerProps {
  /** Soundscape type for theming */
  soundscapeType: SoundscapeType
  /** Scene content */
  children: React.ReactNode
  /** Container width */
  width?: number
  /** Container height */
  height?: number
  /** Dark mode (deprecated - use theme instead) */
  isDark?: boolean
  /** Full theme name for theme-aware styling */
  theme?: ThemeName | null
  /** Whether audio is playing (for visual feedback) */
  isPlaying?: boolean
  /** Additional class names */
  className?: string
  /** Reduced motion preference */
  reducedMotion?: boolean
  /** Show border glow when playing */
  showGlow?: boolean
  /** Corner radius */
  borderRadius?: number
  /** Overlay content (badges, controls) */
  overlay?: React.ReactNode
  /** Click handler */
  onClick?: () => void
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * SoundscapeContainer - Base wrapper for all soundscape scenes
 *
 * Features:
 * - Consistent aspect ratio (4:3)
 * - Theme-aware backgrounds and borders
 * - Optional glow effect when playing
 * - Reduced motion support
 * - Overlay slot for controls/badges
 */
export default function SoundscapeContainer({
  soundscapeType,
  children,
  width = DEFAULT_SCENE_DIMENSIONS.width,
  height,
  isDark = true,
  theme,
  isPlaying = false,
  className = '',
  reducedMotion = false,
  showGlow = true,
  borderRadius = 12,
  overlay,
  onClick,
}: SoundscapeContainerProps) {
  // Calculate height from aspect ratio if not provided
  const computedHeight = height ?? Math.round(width / SCENE_ASPECT_RATIO)

  // Get theme-aware palette for this soundscape
  const palette = getSoundscapePalette(soundscapeType, theme)

  // Get theme-specific style config
  const themeConfig = getThemeStyleConfig(theme)

  // Terminal themes use square corners
  const computedBorderRadius = themeConfig.isTerminal ? 0 : borderRadius

  // Container styles with theme-aware CSS variables
  const containerStyle = useMemo(() => ({
    width,
    height: computedHeight,
    borderRadius: computedBorderRadius,
    backgroundColor: palette.background,
    '--soundscape-primary': palette.primary,
    '--soundscape-secondary': palette.secondary,
    '--soundscape-accent': palette.accent,
    '--soundscape-glow': palette.glow,
    '--theme-phosphor': themeConfig.phosphorColor,
    '--theme-glow-intensity': themeConfig.glowIntensity,
  } as React.CSSProperties), [width, computedHeight, computedBorderRadius, palette, themeConfig])

  // Glow animation
  const glowVariants = {
    inactive: {
      boxShadow: `0 0 0 0 ${palette.glow}`,
    },
    active: {
      boxShadow: [
        `0 0 20px 0 ${palette.glow}`,
        `0 0 30px 5px ${palette.glow}`,
        `0 0 20px 0 ${palette.glow}`,
      ],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: 'easeInOut',
      },
    },
  }

  return (
    <motion.div
      className={cn(
        'relative overflow-hidden',
        'border border-white/10',
        onClick && 'cursor-pointer',
        className
      )}
      style={containerStyle}
      initial="inactive"
      animate={isPlaying && showGlow && !reducedMotion ? 'active' : 'inactive'}
      variants={glowVariants}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault()
          onClick()
        }
      }}
    >
      {/* Scene Content */}
      <div className="absolute inset-0">
        {children}
      </div>

      {/* Playing indicator pulse */}
      <AnimatePresence>
        {isPlaying && !reducedMotion && (
          <motion.div
            className="absolute top-3 right-3 flex items-center gap-1.5"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
          >
            <motion.div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: palette.accent }}
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.8, 1, 0.8],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
            <span
              className="text-[10px] font-medium uppercase tracking-wider"
              style={{ color: palette.secondary }}
            >
              Playing
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Overlay slot */}
      {overlay && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="pointer-events-auto">
            {overlay}
          </div>
        </div>
      )}

      {/* Vignette overlay for depth */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at center, transparent 50%, ${palette.background}80 100%)`,
        }}
      />

      {/* Terminal theme phosphor glow overlay */}
      {themeConfig.isTerminal && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: themeConfig.phosphorColor,
            mixBlendMode: 'screen',
          }}
        />
      )}

      {/* Sepia theme warm filter */}
      {themeConfig.isSepia && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'rgba(180, 140, 100, 0.05)',
            mixBlendMode: 'multiply',
          }}
        />
      )}
    </motion.div>
  )
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/**
 * Scene loading placeholder
 */
export function SoundscapeLoading({
  width = DEFAULT_SCENE_DIMENSIONS.width,
  height,
  isDark = true,
  theme,
}: {
  width?: number
  height?: number
  isDark?: boolean
  theme?: ThemeName | null
}) {
  const computedHeight = height ?? Math.round(width / SCENE_ASPECT_RATIO)
  const themeConfig = getThemeStyleConfig(theme)
  const effectiveIsDark = theme ? themeConfig.isDark : isDark

  return (
    <div
      className={cn(
        'relative overflow-hidden',
        themeConfig.isTerminal ? 'rounded-none' : 'rounded-xl',
        effectiveIsDark ? 'bg-zinc-900' : 'bg-zinc-200'
      )}
      style={{ width, height: computedHeight }}
    >
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          className={cn(
            'w-8 h-8 border-2 border-t-transparent',
            themeConfig.isTerminal ? 'rounded-none' : 'rounded-full',
            effectiveIsDark ? 'border-zinc-600' : 'border-zinc-400'
          )}
          style={themeConfig.isTerminal ? {
            borderColor: themeConfig.phosphorColor.replace('0.15', '0.5'),
          } : undefined}
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        />
      </div>
    </div>
  )
}

/**
 * Scene error state
 */
export function SoundscapeError({
  width = DEFAULT_SCENE_DIMENSIONS.width,
  height,
  isDark = true,
  theme,
  message = 'Failed to load scene',
}: {
  width?: number
  height?: number
  isDark?: boolean
  theme?: ThemeName | null
  message?: string
}) {
  const computedHeight = height ?? Math.round(width / SCENE_ASPECT_RATIO)
  const themeConfig = getThemeStyleConfig(theme)
  const effectiveIsDark = theme ? themeConfig.isDark : isDark

  return (
    <div
      className={cn(
        'relative overflow-hidden',
        themeConfig.isTerminal ? 'rounded-none' : 'rounded-xl',
        effectiveIsDark ? 'bg-zinc-900' : 'bg-zinc-200'
      )}
      style={{ width, height: computedHeight }}
    >
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4">
        <svg
          className={cn('w-8 h-8', effectiveIsDark ? 'text-zinc-600' : 'text-zinc-400')}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        <span
          className={cn(
            'text-xs text-center',
            effectiveIsDark ? 'text-zinc-500' : 'text-zinc-600'
          )}
        >
          {message}
        </span>
      </div>
    </div>
  )
}

/**
 * Placeholder for scenes that haven't been implemented yet
 */
export function SoundscapePlaceholder({
  soundscapeType,
  width = DEFAULT_SCENE_DIMENSIONS.width,
  height,
  isDark = true,
  theme,
  label,
}: {
  soundscapeType: SoundscapeType
  width?: number
  height?: number
  isDark?: boolean
  theme?: ThemeName | null
  label?: string
}) {
  const palette = getSoundscapePalette(soundscapeType, theme)
  const themeConfig = getThemeStyleConfig(theme)

  return (
    <SoundscapeContainer
      soundscapeType={soundscapeType}
      width={width}
      height={height}
      isDark={isDark}
      theme={theme}
      isPlaying={false}
      showGlow={false}
    >
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
        {/* Animated placeholder icon */}
        <motion.div
          className={cn(
            'w-16 h-16 flex items-center justify-center',
            themeConfig.isTerminal ? 'rounded-none' : 'rounded-full'
          )}
          style={{ backgroundColor: `${palette.primary}20` }}
          animate={{
            scale: [1, 1.05, 1],
            opacity: [0.6, 0.8, 0.6],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          <svg
            className="w-8 h-8"
            style={{ color: palette.primary }}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
            />
          </svg>
        </motion.div>

        {/* Label */}
        <span
          className={cn(
            'text-sm font-medium capitalize',
            themeConfig.isTerminal && 'font-mono'
          )}
          style={{ color: palette.secondary }}
        >
          {label ?? soundscapeType.replace('-', ' ')}
        </span>
      </div>
    </SoundscapeContainer>
  )
}

// ============================================================================
// EXPORTS
// ============================================================================

export { SoundscapeContainer }
