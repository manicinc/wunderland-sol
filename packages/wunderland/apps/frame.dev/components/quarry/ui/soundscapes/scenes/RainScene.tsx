/**
 * RainScene
 * @module components/quarry/ui/soundscapes/scenes/RainScene
 *
 * Rainy window scene with falling drops, puddle ripples, clouds,
 * window frame, and condensation effects. Audio-reactive rain intensity.
 */

'use client'

import React, { useMemo, useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import SoundscapeContainer from '../shared/SoundscapeContainer'
import { useAudioReactivity } from '../hooks/useAudioReactivity'
import {
  SoundscapeSceneProps,
  DEFAULT_SCENE_DIMENSIONS,
  getSoundscapePalette,
  audioLerp,
  Particle,
} from '../types'

// ============================================================================
// CONSTANTS
// ============================================================================

const RAIN_DROP_COUNT = 100
const PUDDLE_COUNT = 4
const CLOUD_COUNT = 5
const CONDENSATION_DROPS = 30
const LIGHTNING_CHANCE = 0.002

// ============================================================================
// TYPES
// ============================================================================

interface RainDrop extends Particle {
  length: number
  speed: number
  angle: number
}

interface Puddle {
  id: number
  x: number
  y: number
  width: number
  height: number
}

interface Ripple {
  id: number
  x: number
  y: number
  startTime: number
}

interface Cloud {
  id: number
  x: number
  y: number
  width: number
  height: number
  opacity: number
  speed: number
}

interface CondensationDrop {
  id: number
  x: number
  y: number
  size: number
  opacity: number
}

// ============================================================================
// GENERATORS
// ============================================================================

function generateRainDrops(count: number): RainDrop[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `drop-${i}`,
    x: Math.random(),
    y: Math.random(),
    size: 1 + Math.random() * 2,
    length: 10 + Math.random() * 20,
    speed: 0.8 + Math.random() * 0.4,
    angle: 10 + Math.random() * 10, // Slight angle
    opacity: 0.3 + Math.random() * 0.5,
    delay: Math.random() * 2,
    duration: 0.4 + Math.random() * 0.3,
  }))
}

function generatePuddles(count: number, width: number, height: number): Puddle[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: width * (0.1 + (i / count) * 0.7 + Math.random() * 0.1),
    y: height * (0.85 + Math.random() * 0.1),
    width: width * (0.1 + Math.random() * 0.15),
    height: width * (0.02 + Math.random() * 0.02),
  }))
}

function generateClouds(count: number, width: number): Cloud[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: (i / count) * width - width * 0.2,
    y: 10 + Math.random() * 40,
    width: 80 + Math.random() * 100,
    height: 30 + Math.random() * 30,
    opacity: 0.4 + Math.random() * 0.4,
    speed: 5 + Math.random() * 10,
  }))
}

function generateCondensation(count: number): CondensationDrop[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random(),
    y: Math.random() * 0.7,
    size: 2 + Math.random() * 6,
    opacity: 0.1 + Math.random() * 0.3,
  }))
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/**
 * Sky gradient background
 */
function SkyBackground({
  width,
  height,
  lightningFlash,
}: {
  width: number
  height: number
  lightningFlash: boolean
}) {
  return (
    <svg width={width} height={height} className="absolute inset-0">
      <defs>
        <linearGradient id="rain-sky" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#374151" />
          <stop offset="40%" stopColor="#4b5563" />
          <stop offset="100%" stopColor="#6b7280" />
        </linearGradient>
      </defs>

      <rect width={width} height={height} fill="url(#rain-sky)" />

      {/* Lightning flash overlay */}
      <AnimatePresence>
        {lightningFlash && (
          <motion.rect
            width={width}
            height={height}
            fill="white"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.8, 0.3, 0.6, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          />
        )}
      </AnimatePresence>
    </svg>
  )
}

/**
 * Animated clouds layer
 */
function Clouds({
  clouds,
  width,
  height,
  reducedMotion,
}: {
  clouds: Cloud[]
  width: number
  height: number
  reducedMotion: boolean
}) {
  return (
    <svg width={width} height={height} className="absolute inset-0">
      <defs>
        <filter id="cloud-blur" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="8" />
        </filter>
      </defs>

      {clouds.map((cloud) => (
        <motion.g
          key={cloud.id}
          animate={reducedMotion ? undefined : {
            x: [cloud.x, cloud.x + width * 1.4],
          }}
          transition={{
            duration: cloud.speed + 30,
            repeat: Infinity,
            ease: 'linear',
          }}
        >
          {/* Cloud shape - multiple ellipses */}
          <ellipse
            cx={0}
            cy={cloud.y}
            rx={cloud.width / 2}
            ry={cloud.height / 2}
            fill={`rgba(100, 116, 139, ${cloud.opacity})`}
            filter="url(#cloud-blur)"
          />
          <ellipse
            cx={cloud.width / 3}
            cy={cloud.y - cloud.height / 4}
            rx={cloud.width / 3}
            ry={cloud.height / 2.5}
            fill={`rgba(100, 116, 139, ${cloud.opacity * 0.8})`}
            filter="url(#cloud-blur)"
          />
          <ellipse
            cx={-cloud.width / 4}
            cy={cloud.y + cloud.height / 6}
            rx={cloud.width / 3.5}
            ry={cloud.height / 3}
            fill={`rgba(100, 116, 139, ${cloud.opacity * 0.9})`}
            filter="url(#cloud-blur)"
          />
        </motion.g>
      ))}
    </svg>
  )
}

/**
 * Window frame overlay
 */
function WindowFrame({
  width,
  height,
}: {
  width: number
  height: number
}) {
  const frameWidth = 12
  const dividerWidth = 8

  return (
    <svg width={width} height={height} className="absolute inset-0 pointer-events-none">
      <defs>
        <linearGradient id="frame-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#374151" />
          <stop offset="50%" stopColor="#1f2937" />
          <stop offset="100%" stopColor="#111827" />
        </linearGradient>
      </defs>

      {/* Outer frame */}
      <rect x={0} y={0} width={frameWidth} height={height} fill="url(#frame-gradient)" />
      <rect x={width - frameWidth} y={0} width={frameWidth} height={height} fill="url(#frame-gradient)" />
      <rect x={0} y={0} width={width} height={frameWidth} fill="url(#frame-gradient)" />
      <rect x={0} y={height - frameWidth} width={width} height={frameWidth} fill="url(#frame-gradient)" />

      {/* Cross dividers */}
      <rect x={width / 2 - dividerWidth / 2} y={0} width={dividerWidth} height={height} fill="url(#frame-gradient)" />
      <rect x={0} y={height / 2 - dividerWidth / 2} width={width} height={dividerWidth} fill="url(#frame-gradient)" />

      {/* Inner shadows */}
      <rect x={frameWidth} y={frameWidth} width={2} height={height - frameWidth * 2} fill="rgba(0,0,0,0.3)" />
      <rect x={frameWidth} y={frameWidth} width={width - frameWidth * 2} height={2} fill="rgba(0,0,0,0.3)" />
    </svg>
  )
}

/**
 * Falling rain drops
 */
function RainDrops({
  drops,
  width,
  height,
  intensity,
  reducedMotion,
}: {
  drops: RainDrop[]
  width: number
  height: number
  intensity: number
  reducedMotion: boolean
}) {
  const activeCount = Math.floor(drops.length * (0.3 + intensity * 0.7))

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {drops.slice(0, activeCount).map((drop) => {
        const startX = drop.x * width
        const dropLength = drop.length * (0.8 + intensity * 0.4)

        return (
          <motion.div
            key={drop.id}
            className="absolute"
            style={{
              left: startX,
              top: -dropLength,
              width: drop.size,
              height: dropLength,
              background: `linear-gradient(to bottom,
                rgba(148, 163, 184, 0) 0%,
                rgba(148, 163, 184, ${drop.opacity}) 40%,
                rgba(203, 213, 225, ${drop.opacity}) 100%
              )`,
              borderRadius: drop.size,
              transform: `rotate(${drop.angle}deg)`,
            }}
            animate={reducedMotion ? undefined : {
              y: [0, height + dropLength * 2],
            }}
            transition={{
              duration: drop.duration / drop.speed / intensity,
              repeat: Infinity,
              delay: drop.delay,
              ease: 'linear',
            }}
          />
        )
      })}
    </div>
  )
}

/**
 * Puddles with animated ripples
 */
function Puddles({
  puddles,
  width,
  height,
  intensity,
  isPlaying,
  reducedMotion,
}: {
  puddles: Puddle[]
  width: number
  height: number
  intensity: number
  isPlaying: boolean
  reducedMotion: boolean
}) {
  const [ripples, setRipples] = useState<Ripple[]>([])
  const rippleIdRef = useRef(0)

  // Generate ripples at random intervals
  useEffect(() => {
    if (reducedMotion || !isPlaying) {
      setRipples([])
      return
    }

    const interval = setInterval(() => {
      // Random puddle gets a ripple
      if (!puddles || puddles.length === 0) return
      const puddle = puddles[Math.floor(Math.random() * puddles.length)]
      if (!puddle) return

      const newRipple: Ripple = {
        id: rippleIdRef.current++,
        x: puddle.x + (Math.random() - 0.5) * puddle.width * 0.8,
        y: puddle.y,
        startTime: Date.now(),
      }

      setRipples(prev => [...prev.slice(-20), newRipple])
    }, 200 / (0.5 + intensity * 0.5))

    return () => clearInterval(interval)
  }, [isPlaying, reducedMotion, puddles, intensity])

  return (
    <svg width={width} height={height} className="absolute inset-0">
      <defs>
        {/* Puddle reflection gradient */}
        <linearGradient id="puddle-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="rgba(100, 116, 139, 0.3)" />
          <stop offset="100%" stopColor="rgba(71, 85, 105, 0.5)" />
        </linearGradient>
      </defs>

      {/* Puddle shapes */}
      {puddles.map((puddle) => (
        <ellipse
          key={puddle.id}
          cx={puddle.x}
          cy={puddle.y}
          rx={puddle.width / 2}
          ry={puddle.height / 2}
          fill="url(#puddle-gradient)"
        />
      ))}

      {/* Ripples */}
      <AnimatePresence>
        {ripples.map((ripple) => (
          <motion.ellipse
            key={ripple.id}
            cx={ripple.x}
            cy={ripple.y}
            fill="none"
            stroke="rgba(148, 163, 184, 0.6)"
            strokeWidth={1}
            initial={{ rx: 2, ry: 1, opacity: 0.8 }}
            animate={{
              rx: [2, 20],
              ry: [1, 8],
              opacity: [0.8, 0],
              strokeWidth: [1, 0.5],
            }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 1,
              ease: 'easeOut',
            }}
          />
        ))}
      </AnimatePresence>
    </svg>
  )
}

/**
 * Condensation drops on window glass
 */
function Condensation({
  drops,
  width,
  height,
}: {
  drops: CondensationDrop[]
  width: number
  height: number
}) {
  return (
    <svg width={width} height={height} className="absolute inset-0 pointer-events-none">
      <defs>
        <filter id="condensation-blur" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1" />
        </filter>
        <radialGradient id="drop-gradient">
          <stop offset="0%" stopColor="rgba(255, 255, 255, 0.4)" />
          <stop offset="70%" stopColor="rgba(255, 255, 255, 0.2)" />
          <stop offset="100%" stopColor="rgba(255, 255, 255, 0)" />
        </radialGradient>
      </defs>

      {drops.map((drop) => (
        <g key={drop.id}>
          {/* Drop body */}
          <ellipse
            cx={drop.x * width}
            cy={drop.y * height}
            rx={drop.size}
            ry={drop.size * 1.2}
            fill={`rgba(255, 255, 255, ${drop.opacity})`}
            filter="url(#condensation-blur)"
          />
          {/* Highlight */}
          <ellipse
            cx={drop.x * width - drop.size * 0.2}
            cy={drop.y * height - drop.size * 0.3}
            rx={drop.size * 0.3}
            ry={drop.size * 0.3}
            fill={`rgba(255, 255, 255, ${drop.opacity * 0.5})`}
          />
        </g>
      ))}
    </svg>
  )
}

/**
 * Glass reflection overlay
 */
function GlassOverlay({
  width,
  height,
}: {
  width: number
  height: number
}) {
  return (
    <svg width={width} height={height} className="absolute inset-0 pointer-events-none">
      <defs>
        <linearGradient id="glass-reflection" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.05)" />
          <stop offset="30%" stopColor="rgba(255,255,255,0)" />
          <stop offset="70%" stopColor="rgba(255,255,255,0)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.03)" />
        </linearGradient>
      </defs>

      <rect width={width} height={height} fill="url(#glass-reflection)" />

      {/* Subtle mist/fog at bottom */}
      <rect
        x={0}
        y={height * 0.7}
        width={width}
        height={height * 0.3}
        fill="url(#glass-mist)"
        opacity={0.3}
      />
    </svg>
  )
}

/**
 * Distant cityscape silhouette
 */
function CitySilhouette({
  width,
  height,
}: {
  width: number
  height: number
}) {
  const baseY = height * 0.75
  const buildings = useMemo(() => {
    const count = 12
    return Array.from({ length: count }, (_, i) => ({
      x: (i / count) * width,
      width: width / count * 0.9,
      height: 20 + Math.random() * 60,
    }))
  }, [width])

  return (
    <svg width={width} height={height} className="absolute inset-0">
      <defs>
        <linearGradient id="building-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#374151" />
          <stop offset="100%" stopColor="#1f2937" />
        </linearGradient>
      </defs>

      {buildings.map((building, i) => (
        <rect
          key={i}
          x={building.x}
          y={baseY - building.height}
          width={building.width}
          height={building.height}
          fill="url(#building-gradient)"
          opacity={0.6}
        />
      ))}

      {/* Ground line */}
      <rect
        x={0}
        y={baseY}
        width={width}
        height={height - baseY}
        fill="#1f2937"
      />
    </svg>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * RainScene - Rainy window with falling drops and puddles
 */
export default function RainScene({
  analyser,
  isPlaying,
  width = DEFAULT_SCENE_DIMENSIONS.width,
  height = DEFAULT_SCENE_DIMENSIONS.height,
  isDark = true,
  theme,
  className = '',
  reducedMotion = false,
}: SoundscapeSceneProps) {
  const palette = getSoundscapePalette('rain', theme)

  // Audio reactivity
  const { amplitude, bass, high } = useAudioReactivity(analyser, isPlaying, {
    smoothing: 0.2,
  })

  // Calculate intensity
  const rainIntensity = audioLerp(0.4, 1, amplitude + bass * 0.2, 1)

  // Generate scene elements
  const rainDrops = useMemo(() => generateRainDrops(RAIN_DROP_COUNT), [])
  const puddles = useMemo(() => generatePuddles(PUDDLE_COUNT, width, height), [width, height])
  const clouds = useMemo(() => generateClouds(CLOUD_COUNT, width), [width])
  const condensation = useMemo(() => generateCondensation(CONDENSATION_DROPS), [])

  // Lightning state
  const [lightningFlash, setLightningFlash] = useState(false)

  useEffect(() => {
    if (reducedMotion || !isPlaying) return

    const interval = setInterval(() => {
      // Random chance for lightning, higher with more bass
      if (Math.random() < LIGHTNING_CHANCE * (1 + bass * 2)) {
        setLightningFlash(true)
        setTimeout(() => setLightningFlash(false), 300)
      }
    }, 100)

    return () => clearInterval(interval)
  }, [isPlaying, reducedMotion, bass])

  return (
    <SoundscapeContainer
      soundscapeType="rain"
      width={width}
      height={height}
      isDark={isDark}
      theme={theme}
      isPlaying={isPlaying}
      className={className}
      reducedMotion={reducedMotion}
    >
      {/* Sky background */}
      <SkyBackground
        width={width}
        height={height}
        lightningFlash={lightningFlash}
      />

      {/* Clouds */}
      <Clouds
        clouds={clouds}
        width={width}
        height={height}
        reducedMotion={reducedMotion}
      />

      {/* City silhouette */}
      <CitySilhouette width={width} height={height} />

      {/* Puddles and ripples */}
      <Puddles
        puddles={puddles}
        width={width}
        height={height}
        intensity={rainIntensity}
        isPlaying={isPlaying}
        reducedMotion={reducedMotion}
      />

      {/* Rain drops */}
      <RainDrops
        drops={rainDrops}
        width={width}
        height={height}
        intensity={rainIntensity}
        reducedMotion={reducedMotion}
      />

      {/* Condensation on glass */}
      <Condensation
        drops={condensation}
        width={width}
        height={height}
      />

      {/* Glass overlay */}
      <GlassOverlay width={width} height={height} />

      {/* Window frame */}
      <WindowFrame width={width} height={height} />

      {/* Ambient mist */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `linear-gradient(to top,
            rgba(100, 116, 139, ${0.1 + amplitude * 0.1}) 0%,
            transparent 30%
          )`,
        }}
      />
    </SoundscapeContainer>
  )
}

// ============================================================================
// EXPORTS
// ============================================================================

export { RainScene }
