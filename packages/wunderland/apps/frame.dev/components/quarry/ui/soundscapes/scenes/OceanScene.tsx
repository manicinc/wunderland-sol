/**
 * OceanScene
 * @module components/quarry/ui/soundscapes/scenes/OceanScene
 *
 * Beach ocean scene with animated waves, foam, sun/moon, seagulls,
 * and water sparkles. Audio-reactive wave intensity.
 */

'use client'

import React, { useMemo, useEffect, useState } from 'react'
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

const WAVE_LAYERS = 5
const FOAM_PATCHES = 12
const SEAGULL_COUNT = 4
const SPARKLE_COUNT = 25

// ============================================================================
// TYPES
// ============================================================================

interface WaveLayer {
  id: number
  baseY: number
  amplitude: number
  frequency: number
  speed: number
  color: string
  opacity: number
}

interface FoamPatch {
  id: number
  x: number
  y: number
  width: number
  opacity: number
  delay: number
}

interface Seagull {
  id: number
  startX: number
  y: number
  size: number
  speed: number
  direction: 1 | -1
}

interface Sparkle {
  id: number
  x: number
  y: number
  size: number
  delay: number
  duration: number
}

// ============================================================================
// GENERATORS
// ============================================================================

function generateWaveLayers(count: number, height: number): WaveLayer[] {
  const colors = [
    'rgba(14, 165, 233, 0.9)',   // sky-500
    'rgba(56, 189, 248, 0.8)',   // sky-400
    'rgba(125, 211, 252, 0.7)',  // sky-300
    'rgba(186, 230, 253, 0.6)',  // sky-200
    'rgba(224, 242, 254, 0.5)',  // sky-100
  ]

  return Array.from({ length: count }, (_, i) => ({
    id: i,
    baseY: height * (0.5 + i * 0.08),
    amplitude: 8 + i * 3,
    frequency: 0.02 - i * 0.002,
    speed: 3 + i * 0.5,
    color: colors[i] || colors[colors.length - 1],
    opacity: 1 - i * 0.1,
  }))
}

function generateFoamPatches(count: number, width: number, height: number): FoamPatch[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: (i / count) * width + Math.random() * (width / count),
    y: height * (0.7 + Math.random() * 0.15),
    width: 15 + Math.random() * 25,
    opacity: 0.5 + Math.random() * 0.5,
    delay: Math.random() * 3,
  }))
}

function generateSeagulls(count: number, width: number): Seagull[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    startX: Math.random() * width,
    y: 30 + Math.random() * 60,
    size: 8 + Math.random() * 8,
    speed: 15 + Math.random() * 10,
    direction: Math.random() > 0.5 ? 1 : -1,
  }))
}

function generateSparkles(count: number): Sparkle[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: 0.1 + Math.random() * 0.8,
    y: 0.35 + Math.random() * 0.35,
    size: 2 + Math.random() * 3,
    delay: Math.random() * 4,
    duration: 0.5 + Math.random() * 1,
  }))
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/**
 * Sky gradient with sun
 */
function SkyBackground({
  width,
  height,
  isDark,
}: {
  width: number
  height: number
  isDark: boolean
}) {
  const sunY = height * 0.25
  const sunSize = Math.min(width, height) * 0.12

  return (
    <svg width={width} height={height} className="absolute inset-0">
      <defs>
        {/* Day sky gradient */}
        <linearGradient id="ocean-sky" x1="0%" y1="0%" x2="0%" y2="100%">
          {isDark ? (
            <>
              <stop offset="0%" stopColor="#0f172a" />
              <stop offset="50%" stopColor="#1e3a5f" />
              <stop offset="100%" stopColor="#164e63" />
            </>
          ) : (
            <>
              <stop offset="0%" stopColor="#0369a1" />
              <stop offset="40%" stopColor="#0ea5e9" />
              <stop offset="100%" stopColor="#7dd3fc" />
            </>
          )}
        </linearGradient>

        {/* Sun/moon glow */}
        <radialGradient id="sun-glow" cx="50%" cy="50%" r="50%">
          {isDark ? (
            <>
              <stop offset="0%" stopColor="rgba(255, 255, 255, 1)" />
              <stop offset="30%" stopColor="rgba(226, 232, 240, 0.8)" />
              <stop offset="100%" stopColor="rgba(226, 232, 240, 0)" />
            </>
          ) : (
            <>
              <stop offset="0%" stopColor="rgba(254, 240, 138, 1)" />
              <stop offset="30%" stopColor="rgba(253, 224, 71, 0.8)" />
              <stop offset="100%" stopColor="rgba(253, 224, 71, 0)" />
            </>
          )}
        </radialGradient>

        {/* Sun rays filter */}
        <filter id="sun-blur" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
      </defs>

      {/* Sky */}
      <rect width={width} height={height} fill="url(#ocean-sky)" />

      {/* Sun/Moon */}
      <g>
        {/* Glow */}
        <circle
          cx={width * 0.7}
          cy={sunY}
          r={sunSize * 2}
          fill="url(#sun-glow)"
          filter="url(#sun-blur)"
        />
        {/* Body */}
        <circle
          cx={width * 0.7}
          cy={sunY}
          r={sunSize}
          fill={isDark ? '#e2e8f0' : '#fef08a'}
        />
        {/* Reflection line on water */}
        <motion.ellipse
          cx={width * 0.7}
          cy={height * 0.55}
          rx={sunSize * 0.5}
          ry={3}
          fill={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(254,240,138,0.4)'}
          animate={{
            rx: [sunSize * 0.5, sunSize * 0.8, sunSize * 0.5],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      </g>
    </svg>
  )
}

/**
 * Animated wave layers
 */
function Waves({
  layers,
  width,
  height,
  intensity,
  reducedMotion,
}: {
  layers: WaveLayer[]
  width: number
  height: number
  intensity: number
  reducedMotion: boolean
}) {
  return (
    <svg width={width} height={height} className="absolute inset-0">
      {layers.map((layer, index) => {
        const points = 50
        const adjustedAmplitude = layer.amplitude * (0.7 + intensity * 0.5)

        // Generate wave path
        const generateWavePath = (offset: number) => {
          let path = `M 0 ${height}`

          for (let i = 0; i <= points; i++) {
            const x = (i / points) * width
            const y = layer.baseY +
              Math.sin((i / points) * Math.PI * 4 + offset) * adjustedAmplitude +
              Math.sin((i / points) * Math.PI * 2 + offset * 0.5) * (adjustedAmplitude * 0.5)
            path += ` L ${x} ${y}`
          }

          path += ` L ${width} ${height} Z`
          return path
        }

        return (
          <motion.path
            key={layer.id}
            fill={layer.color}
            opacity={layer.opacity}
            animate={reducedMotion ? undefined : {
              d: [
                generateWavePath(0),
                generateWavePath(Math.PI),
                generateWavePath(Math.PI * 2),
              ],
            }}
            transition={{
              duration: layer.speed / intensity,
              repeat: Infinity,
              ease: 'linear',
            }}
            style={{
              filter: index < 2 ? 'none' : 'blur(1px)',
            }}
          />
        )
      })}
    </svg>
  )
}

/**
 * Sandy beach
 */
function Beach({
  width,
  height,
}: {
  width: number
  height: number
}) {
  const beachTop = height * 0.82

  return (
    <svg width={width} height={height} className="absolute inset-0">
      <defs>
        <linearGradient id="sand-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#fcd34d" />
          <stop offset="50%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>

        {/* Sand texture pattern */}
        <pattern id="sand-texture" x="0" y="0" width="4" height="4" patternUnits="userSpaceOnUse">
          <rect width="4" height="4" fill="#f59e0b" />
          <circle cx="1" cy="1" r="0.5" fill="#fbbf24" opacity="0.5" />
          <circle cx="3" cy="3" r="0.3" fill="#d97706" opacity="0.3" />
        </pattern>
      </defs>

      {/* Beach curve */}
      <path
        d={`
          M 0 ${beachTop + 10}
          Q ${width * 0.25} ${beachTop}
            ${width * 0.5} ${beachTop + 5}
          Q ${width * 0.75} ${beachTop + 12}
            ${width} ${beachTop + 8}
          L ${width} ${height}
          L 0 ${height}
          Z
        `}
        fill="url(#sand-gradient)"
      />

      {/* Texture overlay */}
      <path
        d={`
          M 0 ${beachTop + 10}
          Q ${width * 0.25} ${beachTop}
            ${width * 0.5} ${beachTop + 5}
          Q ${width * 0.75} ${beachTop + 12}
            ${width} ${beachTop + 8}
          L ${width} ${height}
          L 0 ${height}
          Z
        `}
        fill="url(#sand-texture)"
        opacity={0.3}
      />

      {/* Wet sand line */}
      <path
        d={`
          M 0 ${beachTop + 8}
          Q ${width * 0.25} ${beachTop - 2}
            ${width * 0.5} ${beachTop + 3}
          Q ${width * 0.75} ${beachTop + 10}
            ${width} ${beachTop + 6}
        `}
        fill="none"
        stroke="rgba(120, 53, 15, 0.4)"
        strokeWidth={8}
      />
    </svg>
  )
}

/**
 * Animated foam patches
 */
function Foam({
  patches,
  width,
  height,
  intensity,
  reducedMotion,
}: {
  patches: FoamPatch[]
  width: number
  height: number
  intensity: number
  reducedMotion: boolean
}) {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {patches.map((patch) => (
        <motion.div
          key={patch.id}
          className="absolute rounded-full"
          style={{
            left: patch.x,
            top: patch.y,
            width: patch.width * (0.8 + intensity * 0.4),
            height: patch.width * 0.3,
            background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0) 70%)',
          }}
          animate={reducedMotion ? undefined : {
            opacity: [patch.opacity * 0.3, patch.opacity, patch.opacity * 0.3],
            scale: [0.8, 1, 0.8],
            x: [-5, 5, -5],
          }}
          transition={{
            duration: 2 + patch.delay,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: patch.delay,
          }}
        />
      ))}
    </div>
  )
}

/**
 * Animated seagulls
 */
function Seagulls({
  seagulls,
  width,
  height,
  reducedMotion,
}: {
  seagulls: Seagull[]
  width: number
  height: number
  reducedMotion: boolean
}) {
  return (
    <svg width={width} height={height} className="absolute inset-0 pointer-events-none">
      {seagulls.map((gull) => (
        <motion.g
          key={gull.id}
          animate={reducedMotion ? undefined : {
            x: gull.direction > 0
              ? [gull.startX, gull.startX + width * 1.5]
              : [gull.startX, gull.startX - width * 1.5],
            y: [gull.y, gull.y - 20, gull.y + 10, gull.y],
          }}
          transition={{
            x: {
              duration: gull.speed,
              repeat: Infinity,
              ease: 'linear',
            },
            y: {
              duration: 3,
              repeat: Infinity,
              ease: 'easeInOut',
            },
          }}
        >
          {/* Simple bird silhouette */}
          <motion.path
            d={`
              M 0 0
              Q ${-gull.size / 2} ${-gull.size / 3}
                ${-gull.size} ${gull.size / 4}
              M 0 0
              Q ${gull.size / 2} ${-gull.size / 3}
                ${gull.size} ${gull.size / 4}
            `}
            fill="none"
            stroke="#1e293b"
            strokeWidth={1.5}
            strokeLinecap="round"
            transform={`scale(${gull.direction}, 1)`}
            animate={reducedMotion ? undefined : {
              d: [
                `M 0 0 Q ${-gull.size / 2} ${-gull.size / 3} ${-gull.size} ${gull.size / 4}
                 M 0 0 Q ${gull.size / 2} ${-gull.size / 3} ${gull.size} ${gull.size / 4}`,
                `M 0 0 Q ${-gull.size / 2} ${-gull.size / 2} ${-gull.size} 0
                 M 0 0 Q ${gull.size / 2} ${-gull.size / 2} ${gull.size} 0`,
                `M 0 0 Q ${-gull.size / 2} ${-gull.size / 3} ${-gull.size} ${gull.size / 4}
                 M 0 0 Q ${gull.size / 2} ${-gull.size / 3} ${gull.size} ${gull.size / 4}`,
              ],
            }}
            transition={{
              duration: 0.4,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        </motion.g>
      ))}
    </svg>
  )
}

/**
 * Water sparkles/glints
 */
function Sparkles({
  sparkles,
  width,
  height,
  intensity,
  reducedMotion,
}: {
  sparkles: Sparkle[]
  width: number
  height: number
  intensity: number
  reducedMotion: boolean
}) {
  const activeCount = Math.floor(sparkles.length * (0.3 + intensity * 0.7))

  return (
    <div className="absolute inset-0 pointer-events-none">
      {sparkles.slice(0, activeCount).map((sparkle) => (
        <motion.div
          key={sparkle.id}
          className="absolute rounded-full"
          style={{
            left: sparkle.x * width,
            top: sparkle.y * height,
            width: sparkle.size,
            height: sparkle.size,
            backgroundColor: 'white',
            boxShadow: '0 0 4px white',
          }}
          animate={reducedMotion ? undefined : {
            opacity: [0, 1, 0],
            scale: [0.5, 1, 0.5],
          }}
          transition={{
            duration: sparkle.duration,
            repeat: Infinity,
            delay: sparkle.delay,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * OceanScene - Beach with animated waves
 */
export default function OceanScene({
  analyser,
  isPlaying,
  width = DEFAULT_SCENE_DIMENSIONS.width,
  height = DEFAULT_SCENE_DIMENSIONS.height,
  isDark = false,
  theme,
  className = '',
  reducedMotion = false,
}: SoundscapeSceneProps) {
  const palette = getSoundscapePalette('ocean', theme)

  // Audio reactivity
  const { amplitude, bass, mid } = useAudioReactivity(analyser, isPlaying, {
    smoothing: 0.25,
  })

  // Calculate wave intensity
  const waveIntensity = audioLerp(0.5, 1.2, amplitude + bass * 0.3, 1)

  // Generate scene elements
  const waveLayers = useMemo(() => generateWaveLayers(WAVE_LAYERS, height), [height])
  const foamPatches = useMemo(() => generateFoamPatches(FOAM_PATCHES, width, height), [width, height])
  const seagulls = useMemo(() => generateSeagulls(SEAGULL_COUNT, width), [width])
  const sparkles = useMemo(() => generateSparkles(SPARKLE_COUNT), [])

  return (
    <SoundscapeContainer
      soundscapeType="ocean"
      width={width}
      height={height}
      isDark={isDark}
      theme={theme}
      isPlaying={isPlaying}
      className={className}
      reducedMotion={reducedMotion}
    >
      {/* Sky with sun/moon */}
      <SkyBackground
        width={width}
        height={height}
        isDark={isDark}
      />

      {/* Seagulls */}
      <Seagulls
        seagulls={seagulls}
        width={width}
        height={height}
        reducedMotion={reducedMotion}
      />

      {/* Waves */}
      <Waves
        layers={waveLayers}
        width={width}
        height={height}
        intensity={waveIntensity}
        reducedMotion={reducedMotion}
      />

      {/* Water sparkles */}
      <Sparkles
        sparkles={sparkles}
        width={width}
        height={height}
        intensity={amplitude}
        reducedMotion={reducedMotion}
      />

      {/* Foam patches */}
      <Foam
        patches={foamPatches}
        width={width}
        height={height}
        intensity={waveIntensity}
        reducedMotion={reducedMotion}
      />

      {/* Beach */}
      <Beach width={width} height={height} />

      {/* Ambient haze */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `linear-gradient(to bottom,
            rgba(186, 230, 253, ${isDark ? 0 : 0.1}) 0%,
            transparent 30%,
            transparent 70%,
            rgba(253, 224, 71, ${isDark ? 0 : 0.05}) 100%
          )`,
        }}
      />
    </SoundscapeContainer>
  )
}

// ============================================================================
// EXPORTS
// ============================================================================

export { OceanScene }
