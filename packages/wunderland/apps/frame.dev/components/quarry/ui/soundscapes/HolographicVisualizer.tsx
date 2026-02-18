/**
 * HolographicVisualizer - External tablet-like visualizer popover
 * @module components/quarry/ui/soundscapes/HolographicVisualizer
 *
 * A translucent, holographic-style popover that displays the soundscape
 * visualization outside the sidebar, connected like an external display.
 */

'use client'

import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence, useDragControls, PanInfo } from 'framer-motion'
import { cn } from '@/lib/utils'
import { X, Maximize2, Minimize2, Signal, GripVertical } from 'lucide-react'
import { getSoundscapeScene, SoundscapeContainer } from '.'
import type { SoundscapeType } from '@/lib/audio/ambienceSounds'
import { SOUNDSCAPE_INFO } from '@/lib/audio/ambienceSounds'

// ============================================================================
// TYPES
// ============================================================================

export interface HolographicVisualizerProps {
  /** Whether the visualizer is visible */
  isOpen: boolean
  /** Close callback */
  onClose: () => void
  /** Current soundscape type */
  soundscape: SoundscapeType
  /** Whether audio is playing */
  isPlaying: boolean
  /** Audio analyser for visualization */
  analyser: AnalyserNode | null
  /** Dark theme */
  isDark?: boolean
  /** Position relative to parent (right edge of sidebar) - used for connector */
  anchorRight?: number
  /** Expanded view */
  expanded?: boolean
  /** Toggle expanded */
  onToggleExpanded?: () => void
  /** Jukebox element ref for connector arrow */
  jukeboxRef?: React.RefObject<HTMLElement>
  /** Initial position override */
  initialPosition?: { x: number; y: number }
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function HolographicVisualizer({
  isOpen,
  onClose,
  soundscape,
  isPlaying,
  analyser,
  isDark = true,
  anchorRight = 320,
  expanded = false,
  onToggleExpanded,
  jukeboxRef,
  initialPosition,
}: HolographicVisualizerProps) {
  const SceneComponent = getSoundscapeScene(soundscape)
  const soundscapeInfo = SOUNDSCAPE_INFO[soundscape]
  const dragControls = useDragControls()
  const containerRef = useRef<HTMLDivElement>(null)
  
  // Track position for connector arrow
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null)
  const [jukeboxPosition, setJukeboxPosition] = useState<{ x: number; y: number; width: number; height: number } | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  // Calculate dimensions based on expanded state
  const dimensions = useMemo(() => ({
    width: expanded ? 480 : 320,
    height: expanded ? 320 : 220,
  }), [expanded])

  // Get default position (bottom center of viewport)
  const getDefaultPosition = useCallback(() => {
    if (typeof window === 'undefined') return { x: 0, y: 0 }
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    return {
      x: (viewportWidth - dimensions.width) / 2,
      y: viewportHeight - dimensions.height - 140, // 140px from bottom (above bottom nav)
    }
  }, [dimensions.width, dimensions.height])

  // Update jukebox position for connector
  useEffect(() => {
    if (!jukeboxRef?.current) return
    
    const updateJukeboxPos = () => {
      const rect = jukeboxRef.current?.getBoundingClientRect()
      if (rect) {
        setJukeboxPosition({
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
          width: rect.width,
          height: rect.height,
        })
      }
    }
    
    updateJukeboxPos()
    window.addEventListener('resize', updateJukeboxPos)
    window.addEventListener('scroll', updateJukeboxPos)
    
    return () => {
      window.removeEventListener('resize', updateJukeboxPos)
      window.removeEventListener('scroll', updateJukeboxPos)
    }
  }, [jukeboxRef, isOpen])

  // Update container position for connector
  useEffect(() => {
    if (!containerRef.current || !isOpen) return
    
    const updatePos = () => {
      const rect = containerRef.current?.getBoundingClientRect()
      if (rect) {
        setPosition({
          x: rect.left + rect.width / 2,
          y: rect.top,
        })
      }
    }
    
    // Initial position after mount
    const timer = setTimeout(updatePos, 100)
    return () => clearTimeout(timer)
  }, [isOpen, isDragging])

  // Handle drag end - update position for connector
  const handleDragEnd = useCallback((event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    setIsDragging(false)
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      setPosition({
        x: rect.left + rect.width / 2,
        y: rect.top,
      })
    }
  }, [])

  if (soundscape === 'none') return null

  const defaultPos = initialPosition || getDefaultPosition()

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Connector Arrow SVG - rendered in a portal-like fixed layer */}
          {jukeboxPosition && position && (
            <svg
              className="fixed inset-0 pointer-events-none z-[89]"
              style={{ width: '100vw', height: '100vh' }}
            >
              <defs>
                <linearGradient id="connectorGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={isDark ? 'rgba(168,85,247,0.6)' : 'rgba(168,85,247,0.4)'} />
                  <stop offset="100%" stopColor={isDark ? 'rgba(34,197,94,0.6)' : 'rgba(34,197,94,0.4)'} />
                </linearGradient>
                <filter id="connectorGlow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              
              {/* Curved connector path from visualizer to jukebox */}
              <motion.path
                d={`M ${position.x} ${position.y} 
                    Q ${(position.x + jukeboxPosition.x) / 2} ${Math.min(position.y, jukeboxPosition.y) - 40},
                      ${jukeboxPosition.x} ${jukeboxPosition.y}`}
                fill="none"
                stroke="url(#connectorGradient)"
                strokeWidth={isDragging ? 3 : 2}
                strokeLinecap="round"
                strokeDasharray={isPlaying ? "none" : "8 4"}
                filter="url(#connectorGlow)"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: isDragging ? 0.8 : 0.5 }}
                exit={{ pathLength: 0, opacity: 0 }}
                transition={{ duration: 0.5 }}
              />
              
              {/* Animated data flow dots when playing */}
              {isPlaying && (
                <motion.circle
                  r={4}
                  fill={isDark ? '#a855f7' : '#9333ea'}
                  filter="url(#connectorGlow)"
                  animate={{
                    offsetDistance: ['0%', '100%'],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: 'linear',
                  }}
                  style={{
                    offsetPath: `path('M ${position.x} ${position.y} Q ${(position.x + jukeboxPosition.x) / 2} ${Math.min(position.y, jukeboxPosition.y) - 40}, ${jukeboxPosition.x} ${jukeboxPosition.y}')`,
                  }}
                />
              )}
              
              {/* Connection point at jukebox */}
              <circle
                cx={jukeboxPosition.x}
                cy={jukeboxPosition.y}
                r={6}
                fill={isPlaying ? '#22c55e' : (isDark ? '#52525b' : '#a1a1aa')}
                filter="url(#connectorGlow)"
              />
            </svg>
          )}

          {/* Draggable visualizer panel */}
          <motion.div
            ref={containerRef}
            drag
            dragControls={dragControls}
            dragMomentum={false}
            dragElastic={0.1}
            onDragStart={() => setIsDragging(true)}
            onDragEnd={handleDragEnd}
            onDrag={() => {
              if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect()
                setPosition({
                  x: rect.left + rect.width / 2,
                  y: rect.top,
                })
              }
            }}
            initial={{ opacity: 0, scale: 0.9, x: defaultPos.x, y: defaultPos.y }}
            animate={{ opacity: 1, scale: 1, x: defaultPos.x, y: defaultPos.y }}
            exit={{ opacity: 0, scale: 0.9 }}
            whileDrag={{ scale: 1.02, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}
            transition={{
              type: 'spring',
              stiffness: 300,
              damping: 30,
            }}
            className="fixed z-[90] cursor-grab active:cursor-grabbing"
            style={{ touchAction: 'none' }}
          >
          {/* Main holographic panel */}
          <div
            className={cn(
              'relative rounded-2xl overflow-hidden',
              // Holographic glass effect
              'backdrop-blur-xl',
              // Border glow
              isDark
                ? 'border border-purple-500/30 shadow-[0_0_30px_rgba(168,85,247,0.15)]'
                : 'border border-purple-300/50 shadow-[0_0_30px_rgba(168,85,247,0.1)]',
              // Semi-transparent background
              isDark
                ? 'bg-zinc-900/70'
                : 'bg-white/70'
            )}
            style={{
              width: dimensions.width,
              height: dimensions.height + 60, // Extra for header
            }}
          >
            {/* Holographic scan lines effect */}
            <div
              className="absolute inset-0 pointer-events-none opacity-[0.03]"
              style={{
                backgroundImage: `repeating-linear-gradient(
                  0deg,
                  transparent,
                  transparent 2px,
                  ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'} 2px,
                  ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'} 4px
                )`,
              }}
            />

            {/* Header - also serves as drag handle */}
            <div
              onPointerDown={(e) => dragControls.start(e)}
              className={cn(
                'flex items-center justify-between px-3 py-2 border-b cursor-grab active:cursor-grabbing',
                isDark ? 'border-purple-500/20' : 'border-purple-300/30'
              )}
            >
              <div className="flex items-center gap-2">
                {/* Drag handle indicator */}
                <GripVertical
                  className={cn(
                    'w-4 h-4 opacity-50',
                    isDark ? 'text-zinc-400' : 'text-zinc-500'
                  )}
                />
                {/* Connection indicator */}
                <div className="relative">
                  <Signal
                    className={cn(
                      'w-4 h-4',
                      isPlaying ? 'text-green-400' : 'text-zinc-500'
                    )}
                  />
                  {isPlaying && (
                    <motion.div
                      className="absolute inset-0 rounded-full bg-green-500/30"
                      animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    />
                  )}
                </div>
                <span
                  className={cn(
                    'text-sm font-medium select-none',
                    isDark ? 'text-zinc-200' : 'text-zinc-800'
                  )}
                >
                  {soundscapeInfo.name}
                </span>
                {isPlaying && (
                  <span className="px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider rounded bg-green-500/20 text-green-400">
                    Live
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1">
                {onToggleExpanded && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onToggleExpanded(); }}
                    className={cn(
                      'p-1.5 rounded-lg transition-colors',
                      isDark
                        ? 'text-zinc-400 hover:text-zinc-200 hover:bg-purple-500/20'
                        : 'text-zinc-600 hover:text-zinc-800 hover:bg-purple-100'
                    )}
                    title={expanded ? 'Minimize' : 'Expand'}
                  >
                    {expanded ? (
                      <Minimize2 className="w-4 h-4" />
                    ) : (
                      <Maximize2 className="w-4 h-4" />
                    )}
                  </button>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); onClose(); }}
                  className={cn(
                    'p-1.5 rounded-lg transition-colors',
                    isDark
                      ? 'text-zinc-400 hover:text-zinc-200 hover:bg-purple-500/20'
                      : 'text-zinc-600 hover:text-zinc-800 hover:bg-purple-100'
                  )}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Scene content */}
            <div className="p-3">
              <div className="relative rounded-xl overflow-hidden">
                {/* Outer glow */}
                <div
                  className="absolute -inset-1 rounded-xl opacity-50"
                  style={{
                    background: isPlaying
                      ? `radial-gradient(ellipse at center, ${isDark ? 'rgba(168,85,247,0.2)' : 'rgba(168,85,247,0.1)'} 0%, transparent 70%)`
                      : 'none',
                  }}
                />

                <SoundscapeContainer
                  soundscapeType={soundscape}
                  isPlaying={isPlaying}
                  isDark={isDark}
                  width={dimensions.width - 24}
                  height={dimensions.height - 24}
                  showGlow={false}
                  className="rounded-lg"
                >
                  {SceneComponent && (
                    <SceneComponent
                      analyser={analyser}
                      isPlaying={isPlaying}
                      width={dimensions.width - 24}
                      height={dimensions.height - 24}
                      isDark={isDark}
                    />
                  )}
                </SoundscapeContainer>
              </div>
            </div>

            {/* Status bar */}
            <div
              className={cn(
                'absolute bottom-0 left-0 right-0 px-3 py-1.5 flex items-center justify-between text-[10px] select-none',
                isDark ? 'bg-zinc-900/50 text-zinc-500' : 'bg-white/50 text-zinc-400'
              )}
            >
              <span className="flex items-center gap-1">
                <GripVertical className="w-3 h-3 opacity-50" />
                Drag to move
              </span>
              <span className="flex items-center gap-1">
                <span
                  className={cn(
                    'w-1.5 h-1.5 rounded-full',
                    isPlaying ? 'bg-green-500' : 'bg-zinc-500'
                  )}
                />
                {isPlaying ? 'Connected to Jukebox' : 'Standby'}
              </span>
            </div>
          </div>
        </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// ============================================================================
// EXPORTS
// ============================================================================

export { HolographicVisualizer }
