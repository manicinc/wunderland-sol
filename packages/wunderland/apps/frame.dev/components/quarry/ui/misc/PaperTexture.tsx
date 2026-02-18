/**
 * PaperTexture - Paper/Page visual wrapper for writing mode
 * @module components/quarry/ui/PaperTexture
 *
 * Provides a paper-like visual with:
 * - Subtle noise texture (theme-appropriate)
 * - Page margins
 * - Drop shadows
 * - Theme-specific aesthetics (parchment, terminal, oceanic)
 */

'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import type { ThemeName } from '@/types/theme'

export interface PaperTextureProps {
  /** Content to render inside the paper */
  children: React.ReactNode
  /** Current theme */
  theme?: ThemeName
  /** Show margin indicators */
  showMargins?: boolean
  /** Show drop shadow */
  showShadow?: boolean
  /** Enable texture overlay */
  showTexture?: boolean
  /** Show ruled/lined paper effect */
  showRuledLines?: boolean
  /** Show page curl corner effect */
  showPageCurl?: boolean
  /** Max width constraint */
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  /** Additional class name */
  className?: string
}

// SVG-based noise textures (inline data URIs for performance)
const TEXTURES = {
  // Subtle paper grain for light themes
  light: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E")`,

  // Dark matte texture
  dark: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.6' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.02'/%3E%3C/svg%3E")`,

  // Aged parchment for sepia themes
  sepia: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.5' numOctaves='5' stitchTiles='stitch'/%3E%3CfeColorMatrix type='matrix' values='1 0.1 0 0 0 0 0.9 0 0 0 0 0 0.7 0 0 0 0 0 1 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E")`,

  // CRT phosphor texture for terminal themes
  terminal: `url("data:image/svg+xml,%3Csvg viewBox='0 0 4 4' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='1' height='4' fill='%23000' opacity='0.1'/%3E%3Crect x='2' width='1' height='4' fill='%23000' opacity='0.05'/%3E%3C/svg%3E")`,

  // Subtle wave pattern for oceanic
  oceanic: `url("data:image/svg+xml,%3Csvg viewBox='0 0 100 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 10 Q 25 0, 50 10 T 100 10' fill='none' stroke='%2322D3EE' stroke-opacity='0.03' stroke-width='0.5'/%3E%3C/svg%3E")`,
}

// Theme-specific configurations
const THEME_CONFIG: Record<
  string,
  {
    texture: keyof typeof TEXTURES
    bg: string
    shadow: string
    marginColor: string
  }
> = {
  light: {
    texture: 'light',
    bg: 'bg-white',
    shadow: 'shadow-[0_1px_3px_rgba(0,0,0,0.05),0_10px_40px_rgba(0,0,0,0.08)]',
    marginColor: 'bg-rose-200/20',
  },
  dark: {
    texture: 'dark',
    bg: 'bg-zinc-900',
    shadow: 'shadow-[0_1px_3px_rgba(0,0,0,0.2),0_10px_40px_rgba(0,0,0,0.3)]',
    marginColor: 'bg-zinc-700/20',
  },
  'sepia-light': {
    texture: 'sepia',
    bg: 'bg-[#FCF9F2]',
    shadow: 'shadow-[0_2px_6px_rgba(139,90,43,0.1),0_10px_40px_rgba(139,90,43,0.15)]',
    marginColor: 'bg-amber-600/10',
  },
  'sepia-dark': {
    texture: 'sepia',
    bg: 'bg-[#0E0704]',
    shadow: 'shadow-[0_2px_6px_rgba(0,0,0,0.3),0_10px_40px_rgba(0,0,0,0.4)]',
    marginColor: 'bg-amber-900/20',
  },
  'terminal-light': {
    texture: 'terminal',
    bg: 'bg-[#0a0805]',
    shadow: 'shadow-[0_0_20px_rgba(232,184,74,0.1)]',
    marginColor: 'bg-amber-500/10',
  },
  'terminal-dark': {
    texture: 'terminal',
    bg: 'bg-[#050a08]',
    shadow: 'shadow-[0_0_20px_rgba(72,208,128,0.1)]',
    marginColor: 'bg-green-500/10',
  },
  'oceanic-light': {
    texture: 'oceanic',
    bg: 'bg-[#F0FDFA]',
    shadow: 'shadow-[0_1px_3px_rgba(6,182,212,0.1),0_10px_40px_rgba(6,182,212,0.15)]',
    marginColor: 'bg-cyan-400/10',
  },
  'oceanic-dark': {
    texture: 'oceanic',
    bg: 'bg-[#010408]',
    shadow: 'shadow-[0_1px_3px_rgba(94,234,212,0.2),0_10px_40px_rgba(94,234,212,0.1)]',
    marginColor: 'bg-cyan-600/10',
  },
}

const MAX_WIDTHS = {
  sm: 'max-w-xl',
  md: 'max-w-2xl',
  lg: 'max-w-3xl',
  xl: 'max-w-4xl',
  full: 'max-w-full',
}

// Ruled notebook lines pattern
const RULED_LINES = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='28'%3E%3Cline x1='0' y1='27' x2='100' y2='27' stroke='%23CBD5E1' stroke-width='0.5' opacity='0.25'/%3E%3C/svg%3E")`
const RULED_LINES_DARK = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='28'%3E%3Cline x1='0' y1='27' x2='100' y2='27' stroke='%2352525b' stroke-width='0.5' opacity='0.3'/%3E%3C/svg%3E")`

/**
 * PaperTexture component
 *
 * Wraps content in a paper-like visual container with
 * theme-appropriate textures, shadows, and margins.
 */
export default function PaperTexture({
  children,
  theme = 'light',
  showMargins = false,
  showShadow = true,
  showTexture = true,
  showRuledLines = false,
  showPageCurl = false,
  maxWidth = 'lg',
  className,
}: PaperTextureProps) {
  const config = THEME_CONFIG[theme] || THEME_CONFIG.light
  const texture = TEXTURES[config.texture]

  return (
    <div
      className={cn(
        'relative mx-auto rounded-sm',
        MAX_WIDTHS[maxWidth],
        config.bg,
        showShadow && config.shadow,
        className
      )}
    >
      {/* Paper texture overlay */}
      {showTexture && (
        <div
          className="absolute inset-0 pointer-events-none rounded-sm"
          style={{
            backgroundImage: texture,
            backgroundRepeat: 'repeat',
            mixBlendMode: theme.includes('dark') ? 'overlay' : 'multiply',
          }}
          aria-hidden="true"
        />
      )}

      {/* Margin indicators */}
      {showMargins && (
        <>
          {/* Left margin line */}
          <div
            className={cn(
              'absolute top-0 bottom-0 w-px left-12',
              config.marginColor
            )}
            aria-hidden="true"
          />
          {/* Right margin line */}
          <div
            className={cn(
              'absolute top-0 bottom-0 w-px right-12',
              config.marginColor
            )}
            aria-hidden="true"
          />
        </>
      )}

      {/* Ruled notebook lines */}
      {showRuledLines && (
        <div
          className="absolute inset-0 pointer-events-none rounded-sm"
          style={{
            backgroundImage: theme.includes('dark') ? RULED_LINES_DARK : RULED_LINES,
            backgroundSize: '100% 28px',
            backgroundPosition: '0 12px',
          }}
          aria-hidden="true"
        />
      )}

      {/* Page curl corner effect */}
      {showPageCurl && (
        <div
          className="absolute bottom-0 right-0 w-12 h-12 overflow-hidden pointer-events-none"
          aria-hidden="true"
        >
          <div
            className="absolute bottom-0 right-0 w-16 h-16 rotate-45 translate-x-8 translate-y-8"
            style={{
              background: theme.includes('dark')
                ? 'linear-gradient(135deg, transparent 50%, rgba(255,255,255,0.03) 50%)'
                : 'linear-gradient(135deg, transparent 50%, rgba(0,0,0,0.04) 50%)',
              boxShadow: theme.includes('dark')
                ? '-2px -2px 4px rgba(0,0,0,0.2)'
                : '-2px -2px 4px rgba(0,0,0,0.08)',
            }}
          />
        </div>
      )}

      {/* Content */}
      <div className="relative z-10">{children}</div>
    </div>
  )
}

/**
 * PaperPage - Full page variant with proper padding
 */
export function PaperPage({
  children,
  theme = 'light',
  showMargins = true,
  showShadow = true,
  showTexture = true,
  className,
}: Omit<PaperTextureProps, 'maxWidth'>) {
  return (
    <PaperTexture
      theme={theme}
      showMargins={showMargins}
      showShadow={showShadow}
      showTexture={showTexture}
      maxWidth="lg"
      className={cn('px-16 py-12 min-h-[60vh]', className)}
    >
      {children}
    </PaperTexture>
  )
}

/**
 * Hook to get paper texture config for a theme
 */
export function usePaperConfig(theme: ThemeName) {
  const config = THEME_CONFIG[theme] || THEME_CONFIG.light
  return {
    ...config,
    textureUrl: TEXTURES[config.texture],
  }
}
