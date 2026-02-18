/**
 * FireplaceScene
 * @module components/quarry/ui/soundscapes/scenes/FireplaceScene
 *
 * Cozy fireplace with animated flames, floating embers, glowing logs,
 * and warm ambient lighting. Audio-reactive flame intensity.
 */

'use client'

import React, { useMemo, useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import SoundscapeContainer from '../shared/SoundscapeContainer'
import { useAudioReactivity } from '../hooks/useAudioReactivity'
import {
  SoundscapeSceneProps,
  DEFAULT_SCENE_DIMENSIONS,
  getSoundscapePalette,
  audioLerp,
  createParticles,
  Particle,
} from '../types'

// ============================================================================
// CONSTANTS
// ============================================================================

const EMBER_COUNT = 40
const FLAME_LAYERS = 6
const LOG_COUNT = 3
const SPARK_COUNT = 15

// ============================================================================
// TYPES
// ============================================================================

interface Ember extends Particle {
  startX: number
  wobbleAmplitude: number
  wobbleSpeed: number
}

interface Spark {
  id: number
  x: number
  y: number
  size: number
  duration: number
  delay: number
}

// ============================================================================
// PARTICLE GENERATORS
// ============================================================================

/**
 * Generate ember particles
 */
function generateEmbers(count: number, width: number, height: number): Ember[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `ember-${i}`,
    x: 0.3 + Math.random() * 0.4, // Center-ish
    y: 0.5 + Math.random() * 0.5, // Lower half (fire area)
    startX: 0.3 + Math.random() * 0.4,
    size: 1 + Math.random() * 3,
    opacity: 0.6 + Math.random() * 0.4,
    delay: Math.random() * 5,
    duration: 3 + Math.random() * 4,
    wobbleAmplitude: 10 + Math.random() * 20,
    wobbleSpeed: 1 + Math.random() * 2,
  }))
}

/**
 * Generate spark bursts
 */
function generateSparks(count: number): Spark[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: 0.35 + Math.random() * 0.3,
    y: 0.55 + Math.random() * 0.2,
    size: 1 + Math.random() * 2,
    duration: 0.3 + Math.random() * 0.5,
    delay: Math.random() * 8,
  }))
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/**
 * Dark room background with warm ambient glow
 */
function RoomBackground({
  width,
  height,
  glowIntensity,
}: {
  width: number
  height: number
  glowIntensity: number
}) {
  const glowRadius = Math.max(width, height) * (0.6 + glowIntensity * 0.3)
  const glowOpacity = 0.3 + glowIntensity * 0.4

  return (
    <svg width={width} height={height} className="absolute inset-0">
      <defs>
        {/* Warm radial glow from fireplace */}
        <radialGradient id="fire-glow" cx="50%" cy="85%" r="80%">
          <stop offset="0%" stopColor={`rgba(249, 115, 22, ${glowOpacity})`} />
          <stop offset="30%" stopColor={`rgba(234, 88, 12, ${glowOpacity * 0.5})`} />
          <stop offset="60%" stopColor={`rgba(154, 52, 18, ${glowOpacity * 0.2})`} />
          <stop offset="100%" stopColor="rgba(0, 0, 0, 0)" />
        </radialGradient>

        {/* Wall texture gradient */}
        <linearGradient id="wall-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#1c1917" />
          <stop offset="100%" stopColor="#0c0a09" />
        </linearGradient>
      </defs>

      {/* Dark room wall */}
      <rect width={width} height={height} fill="url(#wall-gradient)" />

      {/* Flickering warm glow on walls */}
      <motion.ellipse
        cx={width / 2}
        cy={height * 0.85}
        rx={glowRadius}
        ry={glowRadius * 0.7}
        fill="url(#fire-glow)"
        animate={{
          rx: [glowRadius, glowRadius * 1.05, glowRadius * 0.95, glowRadius],
          ry: [glowRadius * 0.7, glowRadius * 0.75, glowRadius * 0.65, glowRadius * 0.7],
        }}
        transition={{
          duration: 0.5,
          repeat: Infinity,
          repeatType: 'mirror',
          ease: 'easeInOut',
        }}
      />
    </svg>
  )
}

/**
 * Brick fireplace hearth
 */
function Hearth({
  width,
  height,
}: {
  width: number
  height: number
}) {
  const hearthTop = height * 0.45
  const hearthHeight = height * 0.55
  const hearthWidth = width * 0.7
  const hearthLeft = (width - hearthWidth) / 2
  const brickHeight = hearthHeight / 8
  const archHeight = hearthHeight * 0.15

  return (
    <svg width={width} height={height} className="absolute inset-0">
      <defs>
        {/* Brick gradient */}
        <linearGradient id="brick-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#44403c" />
          <stop offset="50%" stopColor="#292524" />
          <stop offset="100%" stopColor="#1c1917" />
        </linearGradient>

        {/* Inner shadow */}
        <linearGradient id="hearth-shadow" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="rgba(0,0,0,0.8)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.4)" />
        </linearGradient>

        {/* Firebox gradient */}
        <linearGradient id="firebox-bg" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#0c0a09" />
          <stop offset="100%" stopColor="#1c1917" />
        </linearGradient>
      </defs>

      {/* Main hearth frame */}
      <rect
        x={hearthLeft}
        y={hearthTop}
        width={hearthWidth}
        height={hearthHeight}
        fill="url(#brick-gradient)"
        rx={4}
      />

      {/* Brick pattern */}
      {Array.from({ length: 8 }, (_, row) => {
        const offset = row % 2 === 0 ? 0 : hearthWidth / 10
        return Array.from({ length: 6 }, (_, col) => (
          <rect
            key={`brick-${row}-${col}`}
            x={hearthLeft + offset + col * (hearthWidth / 5)}
            y={hearthTop + row * brickHeight}
            width={hearthWidth / 5 - 2}
            height={brickHeight - 2}
            fill="none"
            stroke="rgba(0,0,0,0.3)"
            strokeWidth={1}
            rx={1}
          />
        ))
      })}

      {/* Firebox opening (arch shape) */}
      <path
        d={`
          M ${hearthLeft + hearthWidth * 0.15} ${hearthTop + hearthHeight}
          L ${hearthLeft + hearthWidth * 0.15} ${hearthTop + hearthHeight * 0.3}
          Q ${hearthLeft + hearthWidth * 0.15} ${hearthTop + hearthHeight * 0.15}
            ${hearthLeft + hearthWidth * 0.5} ${hearthTop + hearthHeight * 0.15}
          Q ${hearthLeft + hearthWidth * 0.85} ${hearthTop + hearthHeight * 0.15}
            ${hearthLeft + hearthWidth * 0.85} ${hearthTop + hearthHeight * 0.3}
          L ${hearthLeft + hearthWidth * 0.85} ${hearthTop + hearthHeight}
          Z
        `}
        fill="url(#firebox-bg)"
      />

      {/* Inner arch shadow */}
      <path
        d={`
          M ${hearthLeft + hearthWidth * 0.15} ${hearthTop + hearthHeight * 0.35}
          Q ${hearthLeft + hearthWidth * 0.15} ${hearthTop + hearthHeight * 0.15}
            ${hearthLeft + hearthWidth * 0.5} ${hearthTop + hearthHeight * 0.15}
          Q ${hearthLeft + hearthWidth * 0.85} ${hearthTop + hearthHeight * 0.15}
            ${hearthLeft + hearthWidth * 0.85} ${hearthTop + hearthHeight * 0.35}
        `}
        fill="none"
        stroke="rgba(0,0,0,0.5)"
        strokeWidth={8}
      />

      {/* Mantle */}
      <rect
        x={hearthLeft - 10}
        y={hearthTop - 15}
        width={hearthWidth + 20}
        height={20}
        fill="#292524"
        rx={3}
      />
      <rect
        x={hearthLeft - 5}
        y={hearthTop - 10}
        width={hearthWidth + 10}
        height={3}
        fill="#3f3f46"
      />
    </svg>
  )
}

/**
 * Animated logs with glow
 */
function Logs({
  width,
  height,
  glowIntensity,
}: {
  width: number
  height: number
  glowIntensity: number
}) {
  const logY = height * 0.78
  const logWidth = width * 0.12
  const logHeight = width * 0.04

  const logs = useMemo(() => [
    { x: width * 0.35, rotation: -15, scale: 1 },
    { x: width * 0.5, rotation: 5, scale: 1.1 },
    { x: width * 0.62, rotation: 12, scale: 0.95 },
  ], [width])

  return (
    <svg width={width} height={height} className="absolute inset-0">
      <defs>
        {/* Log wood texture gradient */}
        <linearGradient id="log-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#78350f" />
          <stop offset="40%" stopColor="#451a03" />
          <stop offset="100%" stopColor="#1c0a00" />
        </linearGradient>

        {/* Ember glow filter */}
        <filter id="ember-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {logs.map((log, i) => (
        <g key={i} transform={`translate(${log.x}, ${logY}) rotate(${log.rotation})`}>
          {/* Log body */}
          <ellipse
            cx={0}
            cy={0}
            rx={logWidth * log.scale / 2}
            ry={logHeight * log.scale / 2}
            fill="url(#log-gradient)"
          />

          {/* Log end ring */}
          <ellipse
            cx={-logWidth * log.scale / 2 + 5}
            cy={0}
            rx={5}
            ry={logHeight * log.scale / 2 - 2}
            fill="#1c0a00"
            stroke="#451a03"
            strokeWidth={1}
          />

          {/* Bark texture lines */}
          {Array.from({ length: 4 }, (_, j) => (
            <line
              key={j}
              x1={-logWidth * log.scale / 3}
              y1={-logHeight * log.scale / 3 + j * (logHeight * log.scale / 4)}
              x2={logWidth * log.scale / 3}
              y2={-logHeight * log.scale / 3 + j * (logHeight * log.scale / 4)}
              stroke="rgba(0,0,0,0.3)"
              strokeWidth={1}
            />
          ))}

          {/* Glowing ember spots */}
          <motion.ellipse
            cx={logWidth * log.scale * 0.2}
            cy={-logHeight * log.scale * 0.2}
            rx={3 + glowIntensity * 2}
            ry={2 + glowIntensity}
            fill="#f97316"
            filter="url(#ember-glow)"
            animate={{
              opacity: [0.6, 1, 0.7, 0.9, 0.6],
              rx: [3, 4, 3, 5, 3],
            }}
            transition={{
              duration: 0.8 + i * 0.2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        </g>
      ))}
    </svg>
  )
}

/**
 * Animated flame layers
 */
function Flames({
  width,
  height,
  intensity,
  reducedMotion,
}: {
  width: number
  height: number
  intensity: number
  reducedMotion: boolean
}) {
  const baseY = height * 0.82
  const flameWidth = width * 0.35
  const flameHeight = height * 0.3 * (0.7 + intensity * 0.5)

  const flameColors = [
    { color: '#fef3c7', opacity: 0.9 },  // Bright yellow core
    { color: '#fcd34d', opacity: 0.85 }, // Yellow
    { color: '#f97316', opacity: 0.8 },  // Orange
    { color: '#ea580c', opacity: 0.75 }, // Dark orange
    { color: '#dc2626', opacity: 0.6 },  // Red
    { color: '#991b1b', opacity: 0.4 },  // Dark red outer
  ]

  return (
    <svg width={width} height={height} className="absolute inset-0">
      <defs>
        {/* Flame turbulence filter */}
        <filter id="flame-turbulence" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.02"
            numOctaves="3"
            result="noise"
          >
            {!reducedMotion && (
              <animate
                attributeName="baseFrequency"
                values="0.02;0.025;0.02"
                dur="2s"
                repeatCount="indefinite"
              />
            )}
          </feTurbulence>
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale={15 + intensity * 10}
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>

        {/* Flame glow */}
        <filter id="flame-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="8" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Flame layers from outer to inner */}
      {flameColors.map((flame, i) => {
        const layerScale = 1 - i * 0.12
        const layerHeight = flameHeight * layerScale
        const layerWidth = flameWidth * layerScale

        return (
          <motion.path
            key={i}
            d={`
              M ${width / 2 - layerWidth / 2} ${baseY}
              Q ${width / 2 - layerWidth / 3} ${baseY - layerHeight * 0.5}
                ${width / 2 - layerWidth / 6} ${baseY - layerHeight * 0.7}
              Q ${width / 2} ${baseY - layerHeight}
                ${width / 2 + layerWidth / 6} ${baseY - layerHeight * 0.7}
              Q ${width / 2 + layerWidth / 3} ${baseY - layerHeight * 0.5}
                ${width / 2 + layerWidth / 2} ${baseY}
              Z
            `}
            fill={flame.color}
            opacity={flame.opacity}
            filter={i < 2 ? 'url(#flame-glow)' : 'url(#flame-turbulence)'}
            animate={reducedMotion ? undefined : {
              d: [
                `M ${width / 2 - layerWidth / 2} ${baseY}
                 Q ${width / 2 - layerWidth / 3} ${baseY - layerHeight * 0.5}
                   ${width / 2 - layerWidth / 6} ${baseY - layerHeight * 0.7}
                 Q ${width / 2} ${baseY - layerHeight}
                   ${width / 2 + layerWidth / 6} ${baseY - layerHeight * 0.7}
                 Q ${width / 2 + layerWidth / 3} ${baseY - layerHeight * 0.5}
                   ${width / 2 + layerWidth / 2} ${baseY}
                 Z`,
                `M ${width / 2 - layerWidth / 2} ${baseY}
                 Q ${width / 2 - layerWidth / 2.5} ${baseY - layerHeight * 0.55}
                   ${width / 2 - layerWidth / 8} ${baseY - layerHeight * 0.75}
                 Q ${width / 2 + layerWidth / 20} ${baseY - layerHeight * 1.05}
                   ${width / 2 + layerWidth / 5} ${baseY - layerHeight * 0.72}
                 Q ${width / 2 + layerWidth / 2.8} ${baseY - layerHeight * 0.48}
                   ${width / 2 + layerWidth / 2} ${baseY}
                 Z`,
                `M ${width / 2 - layerWidth / 2} ${baseY}
                 Q ${width / 2 - layerWidth / 3} ${baseY - layerHeight * 0.5}
                   ${width / 2 - layerWidth / 6} ${baseY - layerHeight * 0.7}
                 Q ${width / 2} ${baseY - layerHeight}
                   ${width / 2 + layerWidth / 6} ${baseY - layerHeight * 0.7}
                 Q ${width / 2 + layerWidth / 3} ${baseY - layerHeight * 0.5}
                   ${width / 2 + layerWidth / 2} ${baseY}
                 Z`,
              ],
            }}
            transition={{
              duration: 0.4 + i * 0.1,
              repeat: Infinity,
              repeatType: 'mirror',
              ease: 'easeInOut',
              delay: i * 0.05,
            }}
          />
        )
      })}
    </svg>
  )
}

/**
 * Rising ember particles
 */
function Embers({
  embers,
  width,
  height,
  intensity,
  reducedMotion,
}: {
  embers: Ember[]
  width: number
  height: number
  intensity: number
  reducedMotion: boolean
}) {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {embers.map((ember) => {
        const startX = ember.startX * width
        const startY = ember.y * height

        return (
          <motion.div
            key={ember.id}
            className="absolute rounded-full"
            style={{
              width: ember.size * (1 + intensity * 0.5),
              height: ember.size * (1 + intensity * 0.5),
              backgroundColor: '#fbbf24',
              boxShadow: `0 0 ${ember.size * 2}px #f97316`,
              left: startX,
              top: startY,
            }}
            animate={reducedMotion ? undefined : {
              y: [0, -height * 0.6],
              x: [
                0,
                Math.sin(ember.wobbleSpeed) * ember.wobbleAmplitude,
                -Math.sin(ember.wobbleSpeed) * ember.wobbleAmplitude * 0.5,
                Math.sin(ember.wobbleSpeed) * ember.wobbleAmplitude * 0.3,
                0,
              ],
              opacity: [0, ember.opacity, ember.opacity, ember.opacity * 0.5, 0],
              scale: [0.5, 1, 1, 0.8, 0.3],
            }}
            transition={{
              duration: ember.duration,
              repeat: Infinity,
              delay: ember.delay,
              ease: 'easeOut',
            }}
          />
        )
      })}
    </div>
  )
}

/**
 * Spark bursts (occasional bright flashes)
 */
function Sparks({
  width,
  height,
  intensity,
  isPlaying,
  reducedMotion,
}: {
  width: number
  height: number
  intensity: number
  isPlaying: boolean
  reducedMotion: boolean
}) {
  const [sparks, setSparks] = useState<Spark[]>([])
  const sparkIdRef = React.useRef(0)

  useEffect(() => {
    if (reducedMotion || !isPlaying) {
      setSparks([])
      return
    }

    const interval = setInterval(() => {
      // Random chance to create spark burst
      if (Math.random() < 0.1 * (1 + intensity)) {
        const count = 3 + Math.floor(Math.random() * 5 * intensity)
        const newSparks = Array.from({ length: count }, () => ({
          id: sparkIdRef.current++,
          x: width * (0.4 + Math.random() * 0.2),
          y: height * (0.65 + Math.random() * 0.15),
          size: 1 + Math.random() * 2,
          duration: 0.3 + Math.random() * 0.3,
          delay: 0,
        }))

        setSparks(prev => [...prev, ...newSparks])

        // Clean up after animation
        setTimeout(() => {
          setSparks(prev => prev.filter(s => !newSparks.includes(s)))
        }, 800)
      }
    }, 500)

    return () => clearInterval(interval)
  }, [isPlaying, reducedMotion, intensity, width, height])

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      <AnimatePresence>
        {sparks.map((spark) => (
          <motion.div
            key={spark.id}
            className="absolute rounded-full"
            style={{
              width: spark.size,
              height: spark.size,
              backgroundColor: '#fef3c7',
              boxShadow: '0 0 4px #fbbf24',
              left: spark.x,
              top: spark.y,
            }}
            initial={{ opacity: 0, scale: 0 }}
            animate={{
              opacity: [0, 1, 0],
              scale: [0, 1, 0.5],
              x: (Math.random() - 0.5) * 40,
              y: -20 - Math.random() * 30,
            }}
            exit={{ opacity: 0 }}
            transition={{
              duration: spark.duration,
              ease: 'easeOut',
            }}
          />
        ))}
      </AnimatePresence>
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * FireplaceScene - Cozy fireplace with flames and embers
 */
export default function FireplaceScene({
  analyser,
  isPlaying,
  width = DEFAULT_SCENE_DIMENSIONS.width,
  height = DEFAULT_SCENE_DIMENSIONS.height,
  isDark = true,
  theme,
  className = '',
  reducedMotion = false,
}: SoundscapeSceneProps) {
  const palette = getSoundscapePalette('fireplace', theme)

  // Audio reactivity
  const { amplitude, bass, mid } = useAudioReactivity(analyser, isPlaying, {
    smoothing: 0.15,
  })

  // Calculate intensity from audio
  const flameIntensity = audioLerp(0.5, 1, amplitude + bass * 0.3, 1.2)
  const glowIntensity = audioLerp(0.3, 0.8, amplitude, 1)

  // Generate embers once
  const embers = useMemo(
    () => generateEmbers(EMBER_COUNT, width, height),
    [width, height]
  )

  return (
    <SoundscapeContainer
      soundscapeType="fireplace"
      width={width}
      height={height}
      isDark={isDark}
      theme={theme}
      isPlaying={isPlaying}
      className={className}
      reducedMotion={reducedMotion}
    >
      {/* Dark room with warm glow */}
      <RoomBackground
        width={width}
        height={height}
        glowIntensity={glowIntensity}
      />

      {/* Brick hearth */}
      <Hearth width={width} height={height} />

      {/* Logs */}
      <Logs
        width={width}
        height={height}
        glowIntensity={glowIntensity}
      />

      {/* Flames */}
      <Flames
        width={width}
        height={height}
        intensity={flameIntensity}
        reducedMotion={reducedMotion}
      />

      {/* Rising embers */}
      <Embers
        embers={embers}
        width={width}
        height={height}
        intensity={flameIntensity}
        reducedMotion={reducedMotion}
      />

      {/* Spark bursts */}
      <Sparks
        width={width}
        height={height}
        intensity={bass}
        isPlaying={isPlaying}
        reducedMotion={reducedMotion}
      />

      {/* Warm overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at 50% 80%,
            rgba(249, 115, 22, ${0.1 + glowIntensity * 0.1}) 0%,
            transparent 60%
          )`,
          mixBlendMode: 'overlay',
        }}
      />
    </SoundscapeContainer>
  )
}

// ============================================================================
// EXPORTS
// ============================================================================

export { FireplaceScene }
