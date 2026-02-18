/**
 * LofiScene
 * @module components/quarry/ui/soundscapes/scenes/LofiScene
 *
 * Cozy lo-fi room with turntable, animated vinyl, equalizer bars,
 * city window view, plants, and warm ambient lighting.
 */

'use client'

import React, { useMemo, useRef, useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
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

const EQUALIZER_BARS = 24
const CITY_BUILDING_COUNT = 10
const STAR_COUNT = 15
const PLANT_COUNT = 2

// ============================================================================
// TYPES
// ============================================================================

interface Building {
  id: number
  x: number
  width: number
  height: number
  windows: { x: number; y: number; lit: boolean }[]
}

interface Star {
  id: number
  x: number
  y: number
  size: number
  twinkleDelay: number
}

// ============================================================================
// GENERATORS
// ============================================================================

function generateBuildings(count: number, width: number, height: number): Building[] {
  const windowHeight = height * 0.4

  return Array.from({ length: count }, (_, i) => {
    const buildingWidth = width / count * 0.9
    const buildingHeight = 30 + Math.random() * (windowHeight * 0.8)
    const windowRows = Math.floor(buildingHeight / 12)
    const windowCols = Math.floor(buildingWidth / 10)

    const windows: { x: number; y: number; lit: boolean }[] = []
    for (let row = 0; row < windowRows; row++) {
      for (let col = 0; col < windowCols; col++) {
        windows.push({
          x: col * 10 + 3,
          y: row * 12 + 5,
          lit: Math.random() > 0.4,
        })
      }
    }

    return {
      id: i,
      x: (i / count) * width,
      width: buildingWidth,
      height: buildingHeight,
      windows,
    }
  })
}

function generateStars(count: number, width: number, height: number): Star[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * width,
    y: Math.random() * height * 0.3,
    size: 1 + Math.random() * 2,
    twinkleDelay: Math.random() * 3,
  }))
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/**
 * Room background with warm purple tones
 */
function RoomBackground({
  width,
  height,
}: {
  width: number
  height: number
}) {
  return (
    <svg width={width} height={height} className="absolute inset-0">
      <defs>
        <linearGradient id="lofi-room" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#1e1b4b" />
          <stop offset="50%" stopColor="#312e81" />
          <stop offset="100%" stopColor="#1e1b4b" />
        </linearGradient>

        {/* Ambient glow from window */}
        <radialGradient id="window-glow" cx="50%" cy="30%" r="60%">
          <stop offset="0%" stopColor="rgba(168, 85, 247, 0.15)" />
          <stop offset="100%" stopColor="rgba(0, 0, 0, 0)" />
        </radialGradient>
      </defs>

      <rect width={width} height={height} fill="url(#lofi-room)" />
      <rect width={width} height={height} fill="url(#window-glow)" />
    </svg>
  )
}

/**
 * Night city window view
 */
function CityWindow({
  buildings,
  stars,
  width,
  height,
  reducedMotion,
}: {
  buildings: Building[]
  stars: Star[]
  width: number
  height: number
  reducedMotion: boolean
}) {
  const windowX = width * 0.3
  const windowY = 20
  const windowWidth = width * 0.4
  const windowHeight = height * 0.45

  return (
    <g>
      {/* Window frame */}
      <rect
        x={windowX - 5}
        y={windowY - 5}
        width={windowWidth + 10}
        height={windowHeight + 10}
        fill="#1c1917"
        rx={4}
      />

      {/* Window glass */}
      <clipPath id="window-clip">
        <rect x={windowX} y={windowY} width={windowWidth} height={windowHeight} rx={2} />
      </clipPath>

      <g clipPath="url(#window-clip)">
        {/* Night sky */}
        <rect
          x={windowX}
          y={windowY}
          width={windowWidth}
          height={windowHeight}
          fill="#0f172a"
        />

        {/* Stars */}
        {stars.map((star) => (
          <motion.circle
            key={star.id}
            cx={windowX + (star.x / width) * windowWidth}
            cy={windowY + (star.y / height) * windowHeight * 0.5}
            r={star.size}
            fill="white"
            animate={reducedMotion ? undefined : {
              opacity: [0.3, 1, 0.3],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: star.twinkleDelay,
              ease: 'easeInOut',
            }}
          />
        ))}

        {/* City skyline */}
        {buildings.map((building) => {
          const bx = windowX + (building.x / width) * windowWidth
          const by = windowY + windowHeight - building.height
          const bw = (building.width / width) * windowWidth

          return (
            <g key={building.id}>
              {/* Building */}
              <rect
                x={bx}
                y={by}
                width={bw}
                height={building.height}
                fill="#1e293b"
              />
              {/* Windows */}
              {building.windows.map((win, i) => (
                <motion.rect
                  key={i}
                  x={bx + (win.x / building.width) * bw}
                  y={by + win.y}
                  width={3}
                  height={4}
                  fill={win.lit ? '#fef08a' : '#334155'}
                  animate={reducedMotion || !win.lit ? undefined : {
                    opacity: [0.8, 1, 0.8],
                  }}
                  transition={{
                    duration: 5 + Math.random() * 5,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                />
              ))}
            </g>
          )
        })}
      </g>

      {/* Window divider */}
      <line
        x1={windowX + windowWidth / 2}
        y1={windowY}
        x2={windowX + windowWidth / 2}
        y2={windowY + windowHeight}
        stroke="#292524"
        strokeWidth={4}
      />

      {/* Curtain hints */}
      <rect
        x={windowX - 15}
        y={windowY - 5}
        width={15}
        height={windowHeight + 20}
        fill="#4c1d95"
        opacity={0.5}
      />
      <rect
        x={windowX + windowWidth}
        y={windowY - 5}
        width={15}
        height={windowHeight + 20}
        fill="#4c1d95"
        opacity={0.5}
      />
    </g>
  )
}

/**
 * Turntable with spinning vinyl
 */
function Turntable({
  x,
  y,
  size,
  isPlaying,
  reducedMotion,
}: {
  x: number
  y: number
  size: number
  isPlaying: boolean
  reducedMotion: boolean
}) {
  const plateSize = size * 0.7
  const vinylSize = size * 0.55
  const armLength = size * 0.5

  return (
    <g transform={`translate(${x}, ${y})`}>
      {/* Base */}
      <rect
        x={-size / 2}
        y={-size / 3}
        width={size}
        height={size * 0.6}
        fill="#292524"
        rx={5}
      />

      {/* Platter */}
      <circle cx={0} cy={0} r={plateSize / 2} fill="#1c1917" />
      <circle cx={0} cy={0} r={plateSize / 2 - 3} fill="#3f3f46" stroke="#52525b" strokeWidth={1} />

      {/* Vinyl record */}
      <motion.g
        animate={isPlaying && !reducedMotion ? { rotate: 360 } : undefined}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'linear',
        }}
      >
        {/* Record body */}
        <circle cx={0} cy={0} r={vinylSize / 2} fill="#18181b" />

        {/* Grooves */}
        {Array.from({ length: 8 }, (_, i) => (
          <circle
            key={i}
            cx={0}
            cy={0}
            r={vinylSize / 2 - 5 - i * 4}
            fill="none"
            stroke="#27272a"
            strokeWidth={0.5}
          />
        ))}

        {/* Label */}
        <circle cx={0} cy={0} r={vinylSize / 5} fill="#a855f7" />
        <circle cx={0} cy={0} r={vinylSize / 8} fill="#7c3aed" />

        {/* Spindle hole */}
        <circle cx={0} cy={0} r={3} fill="#1c1917" />
      </motion.g>

      {/* Tonearm */}
      <g transform={`translate(${size * 0.35}, ${-size * 0.2})`}>
        {/* Arm base */}
        <circle cx={0} cy={0} r={8} fill="#52525b" />

        {/* Arm */}
        <motion.g
          style={{ transformOrigin: '0px 0px' }}
          animate={isPlaying && !reducedMotion ? { rotate: -25 } : { rotate: 0 }}
          transition={{ duration: 0.5 }}
        >
          <line
            x1={0}
            y1={0}
            x2={-armLength}
            y2={armLength * 0.3}
            stroke="#71717a"
            strokeWidth={4}
            strokeLinecap="round"
          />
          {/* Headshell */}
          <rect
            x={-armLength - 8}
            y={armLength * 0.3 - 3}
            width={12}
            height={6}
            fill="#a1a1aa"
            rx={2}
          />
        </motion.g>
      </g>

      {/* Power light */}
      <motion.circle
        cx={size * 0.35}
        cy={size * 0.15}
        r={3}
        fill={isPlaying ? '#22c55e' : '#52525b'}
        animate={isPlaying && !reducedMotion ? { opacity: [0.7, 1, 0.7] } : undefined}
        transition={{
          duration: 1,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
    </g>
  )
}

/**
 * Audio-reactive equalizer bars
 */
function Equalizer({
  x,
  y,
  width,
  height,
  barCount,
  audioData,
  getFrequencyAt,
  reducedMotion,
}: {
  x: number
  y: number
  width: number
  height: number
  barCount: number
  audioData: { amplitude: number; bass: number; mid: number; high: number }
  getFrequencyAt: (index: number) => number
  reducedMotion: boolean
}) {
  const barWidth = (width / barCount) * 0.7
  const barGap = (width / barCount) * 0.3

  return (
    <g transform={`translate(${x}, ${y})`}>
      {/* Equalizer frame */}
      <rect
        x={-5}
        y={-height - 10}
        width={width + 10}
        height={height + 15}
        fill="#1c1917"
        rx={3}
      />

      {/* Bars */}
      {Array.from({ length: barCount }, (_, i) => {
        const frequency = getFrequencyAt(i / barCount)
        const barHeight = Math.max(4, frequency * height * (reducedMotion ? 0.5 : 1))

        // Color gradient based on position
        const hue = 270 + (i / barCount) * 60 // Purple to pink

        return (
          <motion.rect
            key={i}
            x={i * (barWidth + barGap)}
            y={-barHeight}
            width={barWidth}
            height={barHeight}
            fill={`hsl(${hue}, 70%, 60%)`}
            rx={2}
            animate={reducedMotion ? undefined : {
              height: barHeight,
              y: -barHeight,
            }}
            transition={{
              duration: 0.05,
              ease: 'linear',
            }}
          />
        )
      })}
    </g>
  )
}

/**
 * Decorative plants
 */
function Plants({
  width,
  height,
  swayIntensity,
  reducedMotion,
}: {
  width: number
  height: number
  swayIntensity: number
  reducedMotion: boolean
}) {
  const plants = [
    { x: width * 0.08, y: height * 0.85, size: 60 },
    { x: width * 0.9, y: height * 0.82, size: 50 },
  ]

  return (
    <svg width={width} height={height} className="absolute inset-0" style={{ zIndex: 15 }}>
      {plants.map((plant, i) => (
        <g key={i} transform={`translate(${plant.x}, ${plant.y})`}>
          {/* Pot */}
          <path
            d={`
              M ${-plant.size * 0.25} 0
              L ${-plant.size * 0.2} ${plant.size * 0.3}
              L ${plant.size * 0.2} ${plant.size * 0.3}
              L ${plant.size * 0.25} 0
              Z
            `}
            fill="#78350f"
          />

          {/* Leaves */}
          {Array.from({ length: 5 }, (_, j) => {
            const angle = -40 + j * 20
            const leafHeight = plant.size * (0.4 + j * 0.1)

            return (
              <motion.path
                key={j}
                d={`
                  M 0 0
                  Q ${Math.sin((angle * Math.PI) / 180) * leafHeight * 0.5} ${-leafHeight * 0.5}
                    ${Math.sin((angle * Math.PI) / 180) * leafHeight * 0.3} ${-leafHeight}
                `}
                fill="none"
                stroke="#22c55e"
                strokeWidth={6}
                strokeLinecap="round"
                transform={`rotate(${angle})`}
                style={{ transformOrigin: '0px 0px' }}
                animate={reducedMotion ? undefined : {
                  rotate: [angle - swayIntensity, angle + swayIntensity, angle - swayIntensity],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: j * 0.2,
                }}
              />
            )
          })}
        </g>
      ))}
    </svg>
  )
}

/**
 * Headphones decoration
 */
function Headphones({
  x,
  y,
  size,
}: {
  x: number
  y: number
  size: number
}) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      {/* Headband */}
      <path
        d={`
          M ${-size * 0.4} ${size * 0.3}
          Q ${-size * 0.4} ${-size * 0.3} 0 ${-size * 0.4}
          Q ${size * 0.4} ${-size * 0.3} ${size * 0.4} ${size * 0.3}
        `}
        fill="none"
        stroke="#1c1917"
        strokeWidth={8}
        strokeLinecap="round"
      />

      {/* Left ear cup */}
      <ellipse cx={-size * 0.35} cy={size * 0.3} rx={12} ry={15} fill="#292524" />
      <ellipse cx={-size * 0.35} cy={size * 0.3} rx={8} ry={10} fill="#a855f7" />

      {/* Right ear cup */}
      <ellipse cx={size * 0.35} cy={size * 0.3} rx={12} ry={15} fill="#292524" />
      <ellipse cx={size * 0.35} cy={size * 0.3} rx={8} ry={10} fill="#a855f7" />
    </g>
  )
}

/**
 * Desk surface
 */
function Desk({
  width,
  height,
}: {
  width: number
  height: number
}) {
  const deskY = height * 0.65

  return (
    <svg width={width} height={height} className="absolute inset-0" style={{ zIndex: 5 }}>
      <defs>
        <linearGradient id="desk-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#292524" />
          <stop offset="100%" stopColor="#1c1917" />
        </linearGradient>
      </defs>

      <rect
        x={0}
        y={deskY}
        width={width}
        height={height - deskY}
        fill="url(#desk-gradient)"
      />

      {/* Desk edge */}
      <rect
        x={0}
        y={deskY}
        width={width}
        height={5}
        fill="#3f3f46"
      />
    </svg>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * LofiScene - Cozy room with turntable and equalizer
 */
export default function LofiScene({
  analyser,
  isPlaying,
  width = DEFAULT_SCENE_DIMENSIONS.width,
  height = DEFAULT_SCENE_DIMENSIONS.height,
  isDark = true,
  theme,
  className = '',
  reducedMotion = false,
}: SoundscapeSceneProps) {
  const palette = getSoundscapePalette('lofi', theme)

  // Audio reactivity
  const audioData = useAudioReactivity(analyser, isPlaying, {
    smoothing: 0.1,
  })

  const { amplitude, mid, getFrequencyAt } = audioData

  // Calculate intensities
  const swayIntensity = audioLerp(1, 4, amplitude + mid * 0.2, 1)

  // Generate scene elements
  const buildings = useMemo(() => generateBuildings(CITY_BUILDING_COUNT, width, height), [width, height])
  const stars = useMemo(() => generateStars(STAR_COUNT, width, height), [width, height])

  return (
    <SoundscapeContainer
      soundscapeType="lofi"
      width={width}
      height={height}
      isDark={isDark}
      theme={theme}
      isPlaying={isPlaying}
      className={className}
      reducedMotion={reducedMotion}
    >
      {/* Room background */}
      <RoomBackground width={width} height={height} />

      {/* City window */}
      <svg width={width} height={height} className="absolute inset-0" style={{ zIndex: 2 }}>
        <CityWindow
          buildings={buildings}
          stars={stars}
          width={width}
          height={height}
          reducedMotion={reducedMotion}
        />
      </svg>

      {/* Desk */}
      <Desk width={width} height={height} />

      {/* Plants */}
      <Plants
        width={width}
        height={height}
        swayIntensity={swayIntensity}
        reducedMotion={reducedMotion}
      />

      {/* Turntable */}
      <svg width={width} height={height} className="absolute inset-0" style={{ zIndex: 10 }}>
        <Turntable
          x={width * 0.25}
          y={height * 0.72}
          size={100}
          isPlaying={isPlaying}
          reducedMotion={reducedMotion}
        />
      </svg>

      {/* Equalizer */}
      <svg width={width} height={height} className="absolute inset-0" style={{ zIndex: 10 }}>
        <Equalizer
          x={width * 0.55}
          y={height * 0.65}
          width={width * 0.35}
          height={50}
          barCount={EQUALIZER_BARS}
          audioData={audioData}
          getFrequencyAt={getFrequencyAt}
          reducedMotion={reducedMotion}
        />
      </svg>

      {/* Headphones */}
      <svg width={width} height={height} className="absolute inset-0" style={{ zIndex: 12 }}>
        <Headphones
          x={width * 0.78}
          y={height * 0.58}
          size={50}
        />
      </svg>

      {/* Ambient purple glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at 50% 30%,
            rgba(168, 85, 247, ${0.05 + amplitude * 0.1}) 0%,
            transparent 60%
          )`,
          zIndex: 20,
        }}
      />

      {/* Vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.4) 100%)',
          zIndex: 25,
        }}
      />
    </SoundscapeContainer>
  )
}

// ============================================================================
// EXPORTS
// ============================================================================

export { LofiScene }
