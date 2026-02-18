/**
 * CafeScene
 * @module components/quarry/ui/soundscapes/scenes/CafeScene
 *
 * Cozy cafe interior with warm lighting, coffee cups with steam,
 * people silhouettes, pendant lights, and bokeh effects.
 */

'use client'

import React, { useMemo, useState, useEffect } from 'react'
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

const PENDANT_LIGHT_COUNT = 3
const BOKEH_COUNT = 15
const PERSON_COUNT = 4
const STEAM_PARTICLE_COUNT = 8

// ============================================================================
// TYPES
// ============================================================================

interface PendantLight {
  id: number
  x: number
  y: number
  size: number
  warmth: number
}

interface Bokeh {
  id: number
  x: number
  y: number
  size: number
  opacity: number
  color: string
}

interface PersonSilhouette {
  id: number
  x: number
  y: number
  scale: number
  type: 'sitting' | 'standing'
}

interface SteamParticle {
  id: number
  delay: number
  duration: number
}

// ============================================================================
// GENERATORS
// ============================================================================

function generatePendantLights(count: number, width: number): PendantLight[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: width * (0.2 + (i / (count - 1)) * 0.6),
    y: 30 + Math.random() * 20,
    size: 25 + Math.random() * 15,
    warmth: 0.7 + Math.random() * 0.3,
  }))
}

function generateBokeh(count: number, width: number, height: number): Bokeh[] {
  const colors = ['#fbbf24', '#f59e0b', '#fcd34d', '#fef3c7', '#fdba74']

  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * width,
    y: Math.random() * height * 0.7,
    size: 10 + Math.random() * 40,
    opacity: 0.1 + Math.random() * 0.3,
    color: colors[Math.floor(Math.random() * colors.length)],
  }))
}

function generatePeople(count: number, width: number, height: number): PersonSilhouette[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: width * (0.1 + (i / (count - 1)) * 0.75),
    y: height * 0.65,
    scale: 0.7 + Math.random() * 0.4,
    type: Math.random() > 0.5 ? 'sitting' : 'standing',
  }))
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/**
 * Warm cafe interior background
 */
function CafeBackground({
  width,
  height,
  glowIntensity,
}: {
  width: number
  height: number
  glowIntensity: number
}) {
  return (
    <svg width={width} height={height} className="absolute inset-0">
      <defs>
        {/* Warm wall gradient */}
        <linearGradient id="cafe-wall" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#451a03" />
          <stop offset="50%" stopColor="#78350f" />
          <stop offset="100%" stopColor="#451a03" />
        </linearGradient>

        {/* Ambient warm glow */}
        <radialGradient id="cafe-glow" cx="50%" cy="30%" r="70%">
          <stop offset="0%" stopColor={`rgba(251, 191, 36, ${0.2 + glowIntensity * 0.15})`} />
          <stop offset="50%" stopColor={`rgba(217, 119, 6, ${0.1 + glowIntensity * 0.1})`} />
          <stop offset="100%" stopColor="rgba(0, 0, 0, 0)" />
        </radialGradient>

        {/* Brick pattern */}
        <pattern id="brick-pattern" x="0" y="0" width="40" height="20" patternUnits="userSpaceOnUse">
          <rect width="40" height="20" fill="#78350f" />
          <rect x="0" y="0" width="18" height="8" fill="#92400e" rx="1" />
          <rect x="20" y="0" width="18" height="8" fill="#92400e" rx="1" />
          <rect x="10" y="10" width="18" height="8" fill="#92400e" rx="1" />
          <rect x="30" y="10" width="8" height="8" fill="#92400e" rx="1" />
          <rect x="-10" y="10" width="8" height="8" fill="#92400e" rx="1" />
        </pattern>
      </defs>

      {/* Base wall */}
      <rect width={width} height={height} fill="url(#cafe-wall)" />

      {/* Brick texture */}
      <rect width={width} height={height * 0.5} fill="url(#brick-pattern)" opacity={0.3} />

      {/* Warm ambient glow */}
      <motion.rect
        width={width}
        height={height}
        fill="url(#cafe-glow)"
        animate={{
          opacity: [0.8, 1, 0.8],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
    </svg>
  )
}

/**
 * Pendant lights with warm glow
 */
function PendantLights({
  lights,
  width,
  height,
  intensity,
  reducedMotion,
}: {
  lights: PendantLight[]
  width: number
  height: number
  intensity: number
  reducedMotion: boolean
}) {
  return (
    <svg width={width} height={height} className="absolute inset-0" style={{ zIndex: 20 }}>
      <defs>
        <filter id="light-glow" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="15" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {lights.map((light) => (
        <g key={light.id}>
          {/* Cord */}
          <line
            x1={light.x}
            y1={0}
            x2={light.x}
            y2={light.y - light.size / 2}
            stroke="#1c1917"
            strokeWidth={2}
          />

          {/* Lamp shade */}
          <path
            d={`
              M ${light.x - light.size / 2} ${light.y}
              L ${light.x - light.size / 3} ${light.y - light.size / 2}
              L ${light.x + light.size / 3} ${light.y - light.size / 2}
              L ${light.x + light.size / 2} ${light.y}
              Z
            `}
            fill="#292524"
            stroke="#3f3f46"
            strokeWidth={1}
          />

          {/* Light glow */}
          <motion.ellipse
            cx={light.x}
            cy={light.y + light.size * 0.3}
            rx={light.size * (0.8 + intensity * 0.3)}
            ry={light.size * (0.6 + intensity * 0.2)}
            fill={`rgba(251, 191, 36, ${light.warmth * (0.3 + intensity * 0.2)})`}
            filter="url(#light-glow)"
            animate={reducedMotion ? undefined : {
              rx: [
                light.size * 0.8,
                light.size * (0.85 + intensity * 0.3),
                light.size * 0.8,
              ],
              opacity: [0.6, 0.8, 0.6],
            }}
            transition={{
              duration: 2 + light.id * 0.5,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />

          {/* Bulb */}
          <circle
            cx={light.x}
            cy={light.y}
            r={4}
            fill="#fef3c7"
          />
        </g>
      ))}
    </svg>
  )
}

/**
 * Coffee cup with animated steam
 */
function CoffeeCup({
  x,
  y,
  width,
  height,
  steamIntensity,
  reducedMotion,
}: {
  x: number
  y: number
  width: number
  height: number
  steamIntensity: number
  reducedMotion: boolean
}) {
  const cupWidth = 50
  const cupHeight = 40

  const steamParticles = useMemo(() =>
    Array.from({ length: STEAM_PARTICLE_COUNT }, (_, i) => ({
      id: i,
      delay: i * 0.3,
      duration: 2 + Math.random(),
    })),
    []
  )

  return (
    <g transform={`translate(${x - cupWidth / 2}, ${y - cupHeight})`}>
      {/* Saucer */}
      <ellipse
        cx={cupWidth / 2}
        cy={cupHeight}
        rx={cupWidth * 0.6}
        ry={8}
        fill="#78350f"
      />
      <ellipse
        cx={cupWidth / 2}
        cy={cupHeight - 3}
        rx={cupWidth * 0.5}
        ry={6}
        fill="#92400e"
      />

      {/* Cup body */}
      <path
        d={`
          M 5 ${cupHeight - 10}
          Q 0 ${cupHeight / 2} 8 10
          L ${cupWidth - 8} 10
          Q ${cupWidth} ${cupHeight / 2} ${cupWidth - 5} ${cupHeight - 10}
          Z
        `}
        fill="#fef3c7"
        stroke="#d4d4d8"
        strokeWidth={1}
      />

      {/* Coffee inside */}
      <ellipse
        cx={cupWidth / 2}
        cy={15}
        rx={cupWidth / 2 - 8}
        ry={5}
        fill="#78350f"
      />

      {/* Handle */}
      <path
        d={`
          M ${cupWidth - 5} 15
          Q ${cupWidth + 15} 20 ${cupWidth + 15} ${cupHeight / 2}
          Q ${cupWidth + 15} ${cupHeight - 15} ${cupWidth - 5} ${cupHeight - 15}
        `}
        fill="none"
        stroke="#fef3c7"
        strokeWidth={5}
        strokeLinecap="round"
      />

      {/* Steam */}
      {steamParticles.map((particle) => (
        <motion.path
          key={particle.id}
          d={`
            M ${cupWidth / 2 - 5 + particle.id * 3} 5
            Q ${cupWidth / 2 + 10 + particle.id * 2} ${-20 - steamIntensity * 15}
              ${cupWidth / 2 - 5 + particle.id * 4} ${-40 - steamIntensity * 20}
          `}
          fill="none"
          stroke="rgba(255, 255, 255, 0.3)"
          strokeWidth={2}
          strokeLinecap="round"
          animate={reducedMotion ? undefined : {
            opacity: [0, 0.4 * steamIntensity, 0],
            y: [0, -20],
            x: [0, (Math.random() - 0.5) * 10],
          }}
          transition={{
            duration: particle.duration,
            repeat: Infinity,
            delay: particle.delay,
            ease: 'easeOut',
          }}
        />
      ))}
    </g>
  )
}

/**
 * Person silhouettes
 */
function People({
  people,
  width,
  height,
  breathingIntensity,
  reducedMotion,
}: {
  people: PersonSilhouette[]
  width: number
  height: number
  breathingIntensity: number
  reducedMotion: boolean
}) {
  return (
    <svg width={width} height={height} className="absolute inset-0" style={{ zIndex: 15 }}>
      {people.map((person) => (
        <motion.g
          key={person.id}
          transform={`translate(${person.x}, ${person.y}) scale(${person.scale})`}
          animate={reducedMotion ? undefined : {
            scaleY: [1, 1 + breathingIntensity * 0.02, 1],
          }}
          transition={{
            duration: 3 + person.id * 0.5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          {person.type === 'sitting' ? (
            // Sitting person
            <>
              {/* Body */}
              <ellipse cx={0} cy={-30} rx={15} ry={20} fill="#1c1917" />
              {/* Head */}
              <circle cx={0} cy={-60} r={12} fill="#1c1917" />
              {/* Legs */}
              <rect x={-12} y={-15} width={24} height={25} fill="#1c1917" rx={5} />
            </>
          ) : (
            // Standing person
            <>
              {/* Body */}
              <ellipse cx={0} cy={-45} rx={12} ry={25} fill="#1c1917" />
              {/* Head */}
              <circle cx={0} cy={-80} r={10} fill="#1c1917" />
              {/* Legs */}
              <rect x={-8} y={-22} width={6} height={30} fill="#1c1917" rx={3} />
              <rect x={2} y={-22} width={6} height={30} fill="#1c1917" rx={3} />
            </>
          )}
        </motion.g>
      ))}
    </svg>
  )
}

/**
 * Bokeh blur circles
 */
function BokehEffects({
  bokeh,
  intensity,
  reducedMotion,
}: {
  bokeh: Bokeh[]
  intensity: number
  reducedMotion: boolean
}) {
  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 5 }}>
      {bokeh.map((circle) => (
        <motion.div
          key={circle.id}
          className="absolute rounded-full"
          style={{
            left: circle.x,
            top: circle.y,
            width: circle.size,
            height: circle.size,
            backgroundColor: circle.color,
            opacity: circle.opacity * (0.5 + intensity * 0.5),
            filter: `blur(${circle.size / 4}px)`,
          }}
          animate={reducedMotion ? undefined : {
            scale: [1, 1.1, 1],
            opacity: [
              circle.opacity * 0.5,
              circle.opacity * (0.5 + intensity * 0.5),
              circle.opacity * 0.5,
            ],
          }}
          transition={{
            duration: 3 + circle.id * 0.3,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  )
}

/**
 * Counter/bar area
 */
function CafeCounter({
  width,
  height,
}: {
  width: number
  height: number
}) {
  const counterY = height * 0.75
  const counterHeight = height * 0.1

  return (
    <svg width={width} height={height} className="absolute inset-0" style={{ zIndex: 10 }}>
      <defs>
        <linearGradient id="counter-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#78350f" />
          <stop offset="50%" stopColor="#451a03" />
          <stop offset="100%" stopColor="#1c0a00" />
        </linearGradient>
      </defs>

      {/* Counter top */}
      <rect
        x={0}
        y={counterY}
        width={width}
        height={counterHeight}
        fill="url(#counter-gradient)"
      />

      {/* Counter edge highlight */}
      <rect
        x={0}
        y={counterY}
        width={width}
        height={4}
        fill="#92400e"
      />

      {/* Pastry case hint */}
      <rect
        x={width * 0.6}
        y={counterY - 40}
        width={80}
        height={40}
        fill="rgba(255, 255, 255, 0.1)"
        stroke="rgba(255, 255, 255, 0.2)"
        strokeWidth={1}
        rx={3}
      />
    </svg>
  )
}

/**
 * Floor area
 */
function CafeFloor({
  width,
  height,
}: {
  width: number
  height: number
}) {
  const floorY = height * 0.85

  return (
    <svg width={width} height={height} className="absolute inset-0" style={{ zIndex: 8 }}>
      <defs>
        <linearGradient id="floor-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#292524" />
          <stop offset="100%" stopColor="#1c1917" />
        </linearGradient>
      </defs>

      <rect
        x={0}
        y={floorY}
        width={width}
        height={height - floorY}
        fill="url(#floor-gradient)"
      />

      {/* Floor reflection */}
      <rect
        x={0}
        y={floorY}
        width={width}
        height={5}
        fill="rgba(251, 191, 36, 0.1)"
      />
    </svg>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * CafeScene - Cozy cafe with warm lighting
 */
export default function CafeScene({
  analyser,
  isPlaying,
  width = DEFAULT_SCENE_DIMENSIONS.width,
  height = DEFAULT_SCENE_DIMENSIONS.height,
  isDark = true,
  theme,
  className = '',
  reducedMotion = false,
}: SoundscapeSceneProps) {
  const palette = getSoundscapePalette('cafe', theme)

  // Audio reactivity
  const { amplitude, mid, bass } = useAudioReactivity(analyser, isPlaying, {
    smoothing: 0.2,
  })

  // Calculate intensities
  const glowIntensity = audioLerp(0.3, 0.8, amplitude, 1)
  const steamIntensity = audioLerp(0.4, 1, amplitude + mid * 0.2, 1)
  const bustleIntensity = audioLerp(0.2, 0.8, mid, 1)

  // Generate scene elements
  const pendantLights = useMemo(() => generatePendantLights(PENDANT_LIGHT_COUNT, width), [width])
  const bokeh = useMemo(() => generateBokeh(BOKEH_COUNT, width, height), [width, height])
  const people = useMemo(() => generatePeople(PERSON_COUNT, width, height), [width, height])

  return (
    <SoundscapeContainer
      soundscapeType="cafe"
      width={width}
      height={height}
      isDark={isDark}
      theme={theme}
      isPlaying={isPlaying}
      className={className}
      reducedMotion={reducedMotion}
    >
      {/* Warm background */}
      <CafeBackground
        width={width}
        height={height}
        glowIntensity={glowIntensity}
      />

      {/* Bokeh blur effects */}
      <BokehEffects
        bokeh={bokeh}
        intensity={glowIntensity}
        reducedMotion={reducedMotion}
      />

      {/* Floor */}
      <CafeFloor width={width} height={height} />

      {/* Counter */}
      <CafeCounter width={width} height={height} />

      {/* People silhouettes */}
      <People
        people={people}
        width={width}
        height={height}
        breathingIntensity={bustleIntensity}
        reducedMotion={reducedMotion}
      />

      {/* Coffee cup with steam */}
      <svg width={width} height={height} className="absolute inset-0" style={{ zIndex: 25 }}>
        <CoffeeCup
          x={width * 0.15}
          y={height * 0.76}
          width={width}
          height={height}
          steamIntensity={steamIntensity}
          reducedMotion={reducedMotion}
        />
      </svg>

      {/* Pendant lights */}
      <PendantLights
        lights={pendantLights}
        width={width}
        height={height}
        intensity={glowIntensity}
        reducedMotion={reducedMotion}
      />

      {/* Warm vignette overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at center,
            transparent 30%,
            rgba(69, 26, 3, 0.5) 100%
          )`,
          zIndex: 30,
        }}
      />
    </SoundscapeContainer>
  )
}

// ============================================================================
// EXPORTS
// ============================================================================

export { CafeScene }
