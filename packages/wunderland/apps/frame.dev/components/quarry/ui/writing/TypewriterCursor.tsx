/**
 * TypewriterCursor - Animated typewriter-style cursor
 * @module components/quarry/ui/TypewriterCursor
 *
 * Features:
 * - Animated blinking (CSS step-end for authentic feel)
 * - Bounce/pulse on keystroke (Framer Motion spring)
 * - Theme-aware glow effect
 * - Configurable size and style
 */

'use client'

import React, { useEffect, useState } from 'react'
import { motion, useAnimation } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { ThemeName } from '@/types/theme'

export interface TypewriterCursorProps {
  /** Current theme */
  theme?: ThemeName
  /** Whether cursor is visible (editor focused) */
  isActive?: boolean
  /** Trigger bounce animation (call on each keystroke) */
  bounce?: boolean
  /** Enable glow effect */
  showGlow?: boolean
  /** Cursor style */
  style?: 'line' | 'block' | 'underscore'
  /** Cursor height (relative to line height) */
  height?: 'sm' | 'md' | 'lg'
  /** Position (absolute positioning within parent) */
  position?: { x: number; y: number }
  /** Additional class name */
  className?: string
}

// Theme-aware cursor colors
const CURSOR_COLORS: Record<string, { color: string; glow: string }> = {
  // Standard themes - Purple
  light: { color: '#8b5cf6', glow: 'rgba(139, 92, 246, 0.4)' },
  dark: { color: '#a855f7', glow: 'rgba(168, 85, 247, 0.4)' },

  // Sepia themes - Amber
  'sepia-light': { color: '#D97706', glow: 'rgba(217, 119, 6, 0.4)' },
  'sepia-dark': { color: '#F59E0B', glow: 'rgba(245, 158, 11, 0.4)' },

  // Terminal themes - Green/Amber phosphor
  'terminal-light': { color: '#F5B800', glow: 'rgba(245, 184, 0, 0.5)' },
  'terminal-dark': { color: '#48D080', glow: 'rgba(72, 208, 128, 0.5)' },

  // Oceanic themes - Cyan
  'oceanic-light': { color: '#0891B2', glow: 'rgba(8, 145, 178, 0.4)' },
  'oceanic-dark': { color: '#22D3EE', glow: 'rgba(34, 211, 238, 0.4)' },
}

const CURSOR_HEIGHTS = {
  sm: 'h-4',
  md: 'h-5',
  lg: 'h-6',
}

/**
 * TypewriterCursor component
 *
 * An animated cursor that provides visual feedback for typing.
 * Position it absolutely within a relative parent container.
 */
export default function TypewriterCursor({
  theme = 'dark',
  isActive = true,
  bounce = false,
  showGlow = true,
  style = 'line',
  height = 'md',
  position,
  className,
}: TypewriterCursorProps) {
  const controls = useAnimation()
  const colors = CURSOR_COLORS[theme] || CURSOR_COLORS.dark

  // Handle bounce animation on keystroke
  useEffect(() => {
    if (bounce) {
      controls.start({
        scale: [1, 1.3, 1],
        transition: { duration: 0.15, type: 'spring', stiffness: 500 },
      })
    }
  }, [bounce, controls])

  // Cursor shape styles
  const cursorShape = {
    line: 'w-0.5 rounded-full',
    block: 'w-2.5 rounded-sm',
    underscore: 'w-3 h-0.5 rounded-full self-end',
  }

  return (
    <motion.div
      className={cn(
        'pointer-events-none',
        position ? 'absolute' : 'inline-block',
        cursorShape[style],
        style !== 'underscore' && CURSOR_HEIGHTS[height],
        className
      )}
      style={{
        backgroundColor: colors.color,
        boxShadow: showGlow ? `0 0 8px ${colors.glow}, 0 0 16px ${colors.glow}` : 'none',
        ...(position && {
          left: position.x,
          top: position.y,
          transform: 'translateY(-50%)',
        }),
      }}
      initial={{ opacity: 1 }}
      animate={
        isActive
          ? {
              opacity: [1, 0],
              ...controls,
            }
          : { opacity: 0.3 }
      }
      transition={{
        opacity: {
          duration: 0.53,
          repeat: Infinity,
          repeatType: 'reverse',
          ease: 'steps(1)',
        },
      }}
      aria-hidden="true"
    />
  )
}

/**
 * Hook to manage cursor bounce state
 * Returns a bounce trigger that auto-resets
 */
export function useCursorBounce() {
  const [bounce, setBounce] = useState(false)

  const triggerBounce = () => {
    setBounce(true)
    // Reset after animation completes
    setTimeout(() => setBounce(false), 150)
  }

  return { bounce, triggerBounce }
}

/**
 * InlineCursor - For use inline with text (no positioning needed)
 */
export function InlineCursor({
  theme = 'dark',
  isActive = true,
  showGlow = true,
}: Pick<TypewriterCursorProps, 'theme' | 'isActive' | 'showGlow'>) {
  return (
    <TypewriterCursor
      theme={theme}
      isActive={isActive}
      showGlow={showGlow}
      style="line"
      height="md"
    />
  )
}

/**
 * BlockCursor - Terminal-style block cursor
 */
export function BlockCursor({
  theme = 'terminal-dark',
  isActive = true,
  bounce = false,
}: Pick<TypewriterCursorProps, 'theme' | 'isActive' | 'bounce'>) {
  return (
    <TypewriterCursor
      theme={theme}
      isActive={isActive}
      bounce={bounce}
      showGlow={true}
      style="block"
      height="md"
    />
  )
}

/**
 * CSS-only cursor styles (for textarea caret-color)
 */
export function getCursorColor(theme: ThemeName): string {
  return CURSOR_COLORS[theme]?.color || CURSOR_COLORS.dark.color
}

/**
 * CSS keyframes for blinking cursor (use in global styles)
 */
export const cursorBlinkKeyframes = `
  @keyframes cursor-blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0; }
  }

  @keyframes cursor-bounce {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.2); }
  }

  .cursor-blink {
    animation: cursor-blink 1s step-end infinite;
  }

  .cursor-bounce {
    animation: cursor-bounce 0.15s ease-out;
  }
`
