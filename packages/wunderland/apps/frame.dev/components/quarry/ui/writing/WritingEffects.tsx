/**
 * WritingEffects - React wrapper for canvas-based writing effects
 * @module components/quarry/ui/WritingEffects
 *
 * Provides ink splatter, dust motes, and flourishes as an overlay.
 * Respects user preferences for reduced motion.
 */

'use client'

import React, { useRef, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react'
import { WritingEffectsEngine, DEFAULT_WRITING_EFFECTS_CONFIG, type WritingEffectsConfig } from '@/lib/write/writingEffects'
import type { ThemeName } from '@/types/theme'

export interface WritingEffectsProps {
  /** Whether effects are enabled */
  enabled?: boolean
  /** Current theme */
  theme?: ThemeName
  /** Configuration options */
  config?: Partial<WritingEffectsConfig>
  /** Children to render (effects overlay on top) */
  children?: React.ReactNode
  /** Additional class name */
  className?: string
}

export interface WritingEffectsRef {
  /** Spawn ink splatter at position */
  spawnInk: (x: number, y: number) => void
  /** Spawn flourish for punctuation */
  spawnFlourish: (x: number, y: number, char: string) => void
  /** Clear all particles */
  clear: () => void
}

/**
 * Check if user prefers reduced motion
 */
function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)

    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches)
    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [])

  return prefersReducedMotion
}

/**
 * WritingEffects component
 *
 * Renders a canvas overlay for particle effects.
 * Use the ref to trigger effects on keystrokes.
 */
const WritingEffects = forwardRef<WritingEffectsRef, WritingEffectsProps>(
  function WritingEffects(
    {
      enabled = true,
      theme = 'dark',
      config = DEFAULT_WRITING_EFFECTS_CONFIG,
      children,
      className,
    },
    ref
  ) {
    const containerRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const engineRef = useRef<WritingEffectsEngine | null>(null)
    const prefersReducedMotion = usePrefersReducedMotion()

    // Should we render effects?
    const shouldRender = enabled && !prefersReducedMotion && (
      config.inkEnabled || config.dustEnabled || config.flourishEnabled
    )

    // Initialize engine
    useEffect(() => {
      if (!shouldRender || !canvasRef.current) return

      engineRef.current = new WritingEffectsEngine(canvasRef.current, config)
      engineRef.current.setTheme(theme)
      engineRef.current.start()

      return () => {
        engineRef.current?.dispose()
        engineRef.current = null
      }
    }, [shouldRender]) // Only recreate engine when render state changes

    // Update theme when it changes
    useEffect(() => {
      engineRef.current?.setTheme(theme)
    }, [theme])

    // Update config when it changes
    useEffect(() => {
      engineRef.current?.setConfig(config)
    }, [config])

    // Handle resize
    useEffect(() => {
      if (!shouldRender || !containerRef.current || !engineRef.current) return

      const handleResize = () => {
        if (containerRef.current && engineRef.current) {
          const rect = containerRef.current.getBoundingClientRect()
          engineRef.current.resize(rect.width, rect.height)
        }
      }

      // Initial size
      handleResize()

      // Observe container size changes
      const resizeObserver = new ResizeObserver(handleResize)
      resizeObserver.observe(containerRef.current)

      return () => resizeObserver.disconnect()
    }, [shouldRender])

    // Expose methods via ref
    const spawnInk = useCallback((x: number, y: number) => {
      engineRef.current?.spawnInkSplatter(x, y)
    }, [])

    const spawnFlourish = useCallback((x: number, y: number, char: string) => {
      engineRef.current?.spawnFlourish(x, y, char)
    }, [])

    const clear = useCallback(() => {
      engineRef.current?.clear()
    }, [])

    useImperativeHandle(ref, () => ({
      spawnInk,
      spawnFlourish,
      clear,
    }), [spawnInk, spawnFlourish, clear])

    return (
      <div ref={containerRef} className={`relative ${className || ''}`}>
        {children}
        {shouldRender && (
          <canvas
            ref={canvasRef}
            className="absolute inset-0 pointer-events-none z-20"
            style={{ mixBlendMode: theme.includes('dark') ? 'screen' : 'multiply' }}
            aria-hidden="true"
          />
        )}
      </div>
    )
  }
)

export default WritingEffects

/**
 * Hook to create a keystroke handler that triggers effects
 */
export function useWritingEffectsKeyHandler(
  effectsRef: React.RefObject<WritingEffectsRef>,
  getPosition: () => { x: number; y: number } | null
) {
  return useCallback(
    (e: React.KeyboardEvent | KeyboardEvent) => {
      if (!effectsRef.current) return

      const pos = getPosition()
      if (!pos) return

      // Spawn ink on character keys
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        effectsRef.current.spawnInk(pos.x, pos.y)

        // Check for punctuation flourishes
        if ('.!?;:'.includes(e.key)) {
          effectsRef.current.spawnFlourish(pos.x, pos.y, e.key)
        }
      }
    },
    [effectsRef, getPosition]
  )
}
