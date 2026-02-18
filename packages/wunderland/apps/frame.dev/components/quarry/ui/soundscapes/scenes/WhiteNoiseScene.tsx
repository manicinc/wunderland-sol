/**
 * WhiteNoiseScene
 * @module components/quarry/ui/soundscapes/scenes/WhiteNoiseScene
 *
 * CRT TV static effect with scan lines, glitch effects, and audio-reactive noise.
 * Inspired by analog television static and VHS aesthetics.
 */

'use client'

import React, { useEffect, useRef, useMemo, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import SoundscapeContainer from '../shared/SoundscapeContainer'
import { useAudioReactivity } from '../hooks/useAudioReactivity'
import {
  SoundscapeSceneProps,
  DEFAULT_SCENE_DIMENSIONS,
  getSoundscapePalette,
  audioLerp,
} from '../types'

// ============================================================================
// CONSTANTS
// ============================================================================

const SCAN_LINE_COUNT = 100
const STATIC_CELL_SIZE = 4
const GLITCH_PROBABILITY = 0.02
const MAX_GLITCH_BARS = 8

// ============================================================================
// TYPES
// ============================================================================

interface GlitchBar {
  id: number
  y: number
  height: number
  offset: number
  opacity: number
}

interface StaticNoise {
  seed: number
  density: number
}

// ============================================================================
// CANVAS NOISE RENDERER
// ============================================================================

/**
 * Canvas-based static noise renderer for performance
 */
function useStaticNoise(
  canvasRef: React.RefObject<HTMLCanvasElement>,
  width: number,
  height: number,
  density: number,
  isPlaying: boolean,
  reducedMotion: boolean
) {
  const rafRef = useRef<number | null>(null)
  const noiseImageData = useRef<ImageData | null>(null)

  const renderNoise = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const cellSize = STATIC_CELL_SIZE
    const cols = Math.ceil(width / cellSize)
    const rows = Math.ceil(height / cellSize)

    // Create or reuse image data
    if (!noiseImageData.current ||
        noiseImageData.current.width !== width ||
        noiseImageData.current.height !== height) {
      noiseImageData.current = ctx.createImageData(width, height)
    }

    const data = noiseImageData.current.data
    const adjustedDensity = density * 0.8 + 0.2 // Always some baseline noise

    // Generate noise pattern
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const value = Math.random() < adjustedDensity
          ? Math.floor(Math.random() * 256)
          : 0

        // Fill cell
        for (let py = 0; py < cellSize && row * cellSize + py < height; py++) {
          for (let px = 0; px < cellSize && col * cellSize + px < width; px++) {
            const x = col * cellSize + px
            const y = row * cellSize + py
            const i = (y * width + x) * 4

            data[i] = value       // R
            data[i + 1] = value   // G
            data[i + 2] = value   // B
            data[i + 3] = 255     // A
          }
        }
      }
    }

    ctx.putImageData(noiseImageData.current, 0, 0)
  }, [canvasRef, width, height, density])

  useEffect(() => {
    if (!isPlaying || reducedMotion) {
      // Render once for static display
      renderNoise()
      return
    }

    let running = true
    const animate = () => {
      if (!running) return
      renderNoise()
      rafRef.current = requestAnimationFrame(animate)
    }

    // Throttle to ~30fps for performance
    const interval = setInterval(() => {
      if (running) animate()
    }, 33)

    return () => {
      running = false
      clearInterval(interval)
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
      }
    }
  }, [isPlaying, reducedMotion, renderNoise])
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/**
 * CRT TV frame with beveled edges
 */
function TVFrame({ width, height, children }: {
  width: number
  height: number
  children: React.ReactNode
}) {
  const bezelWidth = Math.min(width, height) * 0.04
  const cornerRadius = Math.min(width, height) * 0.02
  const screenCornerRadius = cornerRadius * 1.5

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <defs>
        {/* Bezel gradient */}
        <linearGradient id="tv-bezel" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3f3f46" />
          <stop offset="50%" stopColor="#27272a" />
          <stop offset="100%" stopColor="#18181b" />
        </linearGradient>

        {/* Screen reflection */}
        <linearGradient id="tv-reflection" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.1)" />
          <stop offset="50%" stopColor="rgba(255,255,255,0)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.05)" />
        </linearGradient>

        {/* CRT curve mask */}
        <mask id="tv-screen-mask">
          <rect
            x={bezelWidth}
            y={bezelWidth}
            width={width - bezelWidth * 2}
            height={height - bezelWidth * 2}
            rx={screenCornerRadius}
            fill="white"
          />
        </mask>
      </defs>

      {/* Outer bezel */}
      <rect
        x={0}
        y={0}
        width={width}
        height={height}
        rx={cornerRadius}
        fill="url(#tv-bezel)"
      />

      {/* Inner screen area */}
      <rect
        x={bezelWidth}
        y={bezelWidth}
        width={width - bezelWidth * 2}
        height={height - bezelWidth * 2}
        rx={screenCornerRadius}
        fill="#0a0a0a"
      />

      {/* Screen content (foreignObject for canvas/children) */}
      <foreignObject
        x={bezelWidth}
        y={bezelWidth}
        width={width - bezelWidth * 2}
        height={height - bezelWidth * 2}
        mask="url(#tv-screen-mask)"
      >
        <div
          style={{
            width: width - bezelWidth * 2,
            height: height - bezelWidth * 2,
            borderRadius: screenCornerRadius,
            overflow: 'hidden',
          }}
        >
          {children}
        </div>
      </foreignObject>

      {/* Screen reflection overlay */}
      <rect
        x={bezelWidth}
        y={bezelWidth}
        width={width - bezelWidth * 2}
        height={height - bezelWidth * 2}
        rx={screenCornerRadius}
        fill="url(#tv-reflection)"
        style={{ pointerEvents: 'none' }}
      />

      {/* CRT vignette */}
      <rect
        x={bezelWidth}
        y={bezelWidth}
        width={width - bezelWidth * 2}
        height={height - bezelWidth * 2}
        rx={screenCornerRadius}
        fill="none"
        stroke="rgba(0,0,0,0.5)"
        strokeWidth={bezelWidth * 0.5}
        style={{ pointerEvents: 'none' }}
      />
    </svg>
  )
}

/**
 * Animated scan lines overlay
 */
function ScanLines({
  width,
  height,
  intensity,
  animate,
}: {
  width: number
  height: number
  intensity: number
  animate: boolean
}) {
  const lineHeight = height / SCAN_LINE_COUNT
  const opacity = 0.1 + intensity * 0.15

  return (
    <motion.div
      className="absolute inset-0 pointer-events-none"
      style={{
        background: `repeating-linear-gradient(
          0deg,
          transparent,
          transparent ${lineHeight}px,
          rgba(0, 0, 0, ${opacity}) ${lineHeight}px,
          rgba(0, 0, 0, ${opacity}) ${lineHeight * 2}px
        )`,
      }}
      animate={animate ? {
        backgroundPositionY: [0, lineHeight * 2],
      } : undefined}
      transition={{
        duration: 0.1,
        repeat: Infinity,
        ease: 'linear',
      }}
    />
  )
}

/**
 * Horizontal glitch bars
 */
function GlitchBars({
  bars,
  width,
}: {
  bars: GlitchBar[]
  width: number
}) {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      <AnimatePresence>
        {bars.map((bar) => (
          <motion.div
            key={bar.id}
            className="absolute left-0 right-0"
            style={{
              top: bar.y,
              height: bar.height,
              transform: `translateX(${bar.offset}px)`,
            }}
            initial={{ opacity: 0, scaleX: 0.5 }}
            animate={{
              opacity: bar.opacity,
              scaleX: 1,
            }}
            exit={{
              opacity: 0,
              scaleX: 0.5,
            }}
            transition={{ duration: 0.05 }}
          >
            {/* RGB separation effect */}
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(90deg,
                  rgba(255,0,0,0.3) 0%,
                  rgba(255,255,255,0.8) 20%,
                  rgba(255,255,255,0.8) 80%,
                  rgba(0,255,255,0.3) 100%
                )`,
                mixBlendMode: 'screen',
              }}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

/**
 * Color separation / chromatic aberration
 */
function ChromaticAberration({
  intensity,
  children,
}: {
  intensity: number
  children: React.ReactNode
}) {
  const offset = Math.round(intensity * 3)

  if (offset < 1) return <>{children}</>

  return (
    <div className="relative">
      {/* Red channel */}
      <div
        className="absolute inset-0"
        style={{
          transform: `translateX(-${offset}px)`,
          filter: 'url(#red-channel)',
          mixBlendMode: 'lighten',
          opacity: 0.5,
        }}
      >
        {children}
      </div>
      {/* Cyan channel */}
      <div
        className="absolute inset-0"
        style={{
          transform: `translateX(${offset}px)`,
          filter: 'url(#cyan-channel)',
          mixBlendMode: 'lighten',
          opacity: 0.5,
        }}
      >
        {children}
      </div>
      {/* Main */}
      {children}
    </div>
  )
}

/**
 * Flicker effect
 */
function FlickerOverlay({
  intensity,
  isActive,
}: {
  intensity: number
  isActive: boolean
}) {
  const [flicker, setFlicker] = useState(1)

  useEffect(() => {
    if (!isActive) {
      setFlicker(1)
      return
    }

    const interval = setInterval(() => {
      // Random brightness flicker
      const base = 0.9
      const variance = intensity * 0.2
      setFlicker(base + Math.random() * variance)
    }, 50 + Math.random() * 100)

    return () => clearInterval(interval)
  }, [isActive, intensity])

  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        backgroundColor: `rgba(0, 0, 0, ${1 - flicker})`,
        transition: 'background-color 0.05s',
      }}
    />
  )
}

/**
 * "No Signal" text that appears randomly
 */
function NoSignalText({
  show,
  width,
  height,
}: {
  show: boolean
  width: number
  height: number
}) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.1 }}
        >
          <div
            className="px-4 py-2 font-mono text-sm font-bold tracking-wider"
            style={{
              color: '#ffffff',
              textShadow: '2px 2px 0 #ff0000, -2px -2px 0 #00ffff',
              fontSize: Math.max(12, width * 0.04),
            }}
          >
            NO SIGNAL
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * WhiteNoiseScene - CRT TV static with glitch effects
 */
export default function WhiteNoiseScene({
  analyser,
  isPlaying,
  width = DEFAULT_SCENE_DIMENSIONS.width,
  height = DEFAULT_SCENE_DIMENSIONS.height,
  isDark = true,
  theme,
  className = '',
  reducedMotion = false,
}: SoundscapeSceneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const palette = getSoundscapePalette('white-noise', theme)

  // Audio reactivity
  const { amplitude, bass, high } = useAudioReactivity(analyser, isPlaying, {
    smoothing: 0.1,
  })

  // Calculate screen dimensions (inside TV frame)
  const bezelWidth = Math.min(width, height) * 0.04
  const screenWidth = width - bezelWidth * 2
  const screenHeight = height - bezelWidth * 2

  // Static noise density based on audio
  const noiseDensity = audioLerp(0.3, 0.8, amplitude, 1.5)

  // Render canvas noise
  useStaticNoise(
    canvasRef,
    Math.floor(screenWidth),
    Math.floor(screenHeight),
    noiseDensity,
    isPlaying,
    reducedMotion
  )

  // Glitch bars state
  const [glitchBars, setGlitchBars] = useState<GlitchBar[]>([])
  const glitchIdRef = useRef(0)

  // Generate random glitch bars based on audio
  useEffect(() => {
    if (reducedMotion || !isPlaying) {
      setGlitchBars([])
      return
    }

    const interval = setInterval(() => {
      const glitchChance = GLITCH_PROBABILITY + high * 0.1

      if (Math.random() < glitchChance) {
        const newBar: GlitchBar = {
          id: glitchIdRef.current++,
          y: Math.random() * screenHeight,
          height: 2 + Math.random() * 10 * (1 + bass),
          offset: (Math.random() - 0.5) * 20 * (1 + amplitude),
          opacity: 0.5 + Math.random() * 0.5,
        }

        setGlitchBars(prev => {
          const updated = [...prev, newBar].slice(-MAX_GLITCH_BARS)
          return updated
        })

        // Remove after short duration
        setTimeout(() => {
          setGlitchBars(prev => prev.filter(b => b.id !== newBar.id))
        }, 50 + Math.random() * 100)
      }
    }, 30)

    return () => clearInterval(interval)
  }, [isPlaying, reducedMotion, screenHeight, bass, high, amplitude])

  // "No Signal" text state
  const [showNoSignal, setShowNoSignal] = useState(false)

  useEffect(() => {
    if (reducedMotion || !isPlaying) {
      setShowNoSignal(false)
      return
    }

    const interval = setInterval(() => {
      // Rare chance to show "NO SIGNAL"
      if (Math.random() < 0.005 * (1 + amplitude)) {
        setShowNoSignal(true)
        setTimeout(() => setShowNoSignal(false), 200 + Math.random() * 300)
      }
    }, 500)

    return () => clearInterval(interval)
  }, [isPlaying, reducedMotion, amplitude])

  return (
    <SoundscapeContainer
      soundscapeType="white-noise"
      width={width}
      height={height}
      isDark={isDark}
      theme={theme}
      isPlaying={isPlaying}
      className={className}
      reducedMotion={reducedMotion}
      showGlow={false}
    >
      <svg width={0} height={0} className="absolute">
        <defs>
          {/* Color channel filters */}
          <filter id="red-channel">
            <feColorMatrix
              type="matrix"
              values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"
            />
          </filter>
          <filter id="cyan-channel">
            <feColorMatrix
              type="matrix"
              values="0 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0"
            />
          </filter>
        </defs>
      </svg>

      {/* TV Frame with screen content */}
      <div className="absolute inset-0">
        <TVFrame width={width} height={height}>
          <div
            className="relative w-full h-full overflow-hidden"
            style={{ backgroundColor: '#0a0a0a' }}
          >
            {/* Canvas noise layer */}
            <canvas
              ref={canvasRef}
              width={Math.floor(screenWidth)}
              height={Math.floor(screenHeight)}
              className="absolute inset-0 w-full h-full"
              style={{ imageRendering: 'pixelated' }}
            />

            {/* Scan lines */}
            <ScanLines
              width={screenWidth}
              height={screenHeight}
              intensity={amplitude}
              animate={isPlaying && !reducedMotion}
            />

            {/* Glitch bars */}
            <GlitchBars bars={glitchBars} width={screenWidth} />

            {/* Flicker effect */}
            <FlickerOverlay
              intensity={amplitude}
              isActive={isPlaying && !reducedMotion}
            />

            {/* "No Signal" text */}
            <NoSignalText
              show={showNoSignal}
              width={screenWidth}
              height={screenHeight}
            />

            {/* CRT phosphor glow */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: `radial-gradient(ellipse at center,
                  rgba(100, 100, 120, ${0.05 + amplitude * 0.1}) 0%,
                  transparent 70%
                )`,
                mixBlendMode: 'screen',
              }}
            />

            {/* CRT curvature shadow */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                boxShadow: `
                  inset 0 0 ${screenWidth * 0.1}px rgba(0,0,0,0.3),
                  inset 0 0 ${screenWidth * 0.05}px rgba(0,0,0,0.2)
                `,
              }}
            />
          </div>
        </TVFrame>
      </div>

      {/* Ambient glow around TV */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          boxShadow: `0 0 ${40 + amplitude * 30}px ${palette.glow}`,
          opacity: isPlaying ? 0.5 + amplitude * 0.3 : 0.2,
          transition: 'opacity 0.3s, box-shadow 0.3s',
        }}
      />
    </SoundscapeContainer>
  )
}

// ============================================================================
// EXPORTS
// ============================================================================

export { WhiteNoiseScene }
