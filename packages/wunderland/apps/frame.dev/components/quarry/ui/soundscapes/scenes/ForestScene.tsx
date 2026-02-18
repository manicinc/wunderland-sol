/**
 * ForestScene
 * @module components/quarry/ui/soundscapes/scenes/ForestScene
 *
 * Peaceful forest scene with layered trees, sunlight rays, floating leaves,
 * birds, and forest floor details. Audio-reactive tree sway and leaf activity.
 */

'use client'

import React, { useMemo } from 'react'
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

const TREE_LAYERS = 4
const SUNRAY_COUNT = 6
const LEAF_COUNT = 25
const BIRD_COUNT = 3
const FERN_COUNT = 8

// ============================================================================
// TYPES
// ============================================================================

interface Tree {
  id: number
  x: number
  width: number
  height: number
  color: string
  trunkColor: string
}

interface Sunray {
  id: number
  x: number
  width: number
  angle: number
  opacity: number
}

interface Leaf {
  id: number
  startX: number
  startY: number
  size: number
  rotation: number
  color: string
  duration: number
  delay: number
}

interface Bird {
  id: number
  startX: number
  y: number
  size: number
  speed: number
  direction: 1 | -1
}

interface Fern {
  id: number
  x: number
  height: number
  flip: boolean
}

// ============================================================================
// GENERATORS
// ============================================================================

function generateTrees(layer: number, width: number, height: number): Tree[] {
  const count = 5 + layer * 2
  const layerOpacity = 1 - layer * 0.2
  const baseGreen = layer === 0 ? '#166534' : layer === 1 ? '#15803d' : layer === 2 ? '#22c55e' : '#4ade80'
  const baseHeight = height * (0.4 + layer * 0.12)

  return Array.from({ length: count }, (_, i) => ({
    id: layer * 100 + i,
    x: (i / count) * width + (Math.random() - 0.5) * (width / count) * 0.8,
    width: 40 + Math.random() * 60 - layer * 10,
    height: baseHeight + Math.random() * height * 0.15,
    color: baseGreen,
    trunkColor: layer === 0 ? '#3f2b1c' : '#5a3d2b',
  }))
}

function generateSunrays(count: number, width: number): Sunray[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: width * 0.3 + (i / count) * width * 0.5,
    width: 30 + Math.random() * 50,
    angle: -30 + Math.random() * 20,
    opacity: 0.1 + Math.random() * 0.2,
  }))
}

function generateLeaves(count: number): Leaf[] {
  const colors = ['#22c55e', '#4ade80', '#86efac', '#fbbf24', '#f97316']

  return Array.from({ length: count }, (_, i) => ({
    id: i,
    startX: Math.random(),
    startY: -0.1 - Math.random() * 0.2,
    size: 6 + Math.random() * 10,
    rotation: Math.random() * 360,
    color: colors[Math.floor(Math.random() * colors.length)],
    duration: 8 + Math.random() * 6,
    delay: Math.random() * 10,
  }))
}

function generateBirds(count: number, width: number): Bird[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    startX: Math.random() * width,
    y: 40 + Math.random() * 80,
    size: 6 + Math.random() * 6,
    speed: 12 + Math.random() * 8,
    direction: Math.random() > 0.5 ? 1 : -1,
  }))
}

function generateFerns(count: number, width: number): Fern[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: (i / count) * width + Math.random() * (width / count) * 0.5,
    height: 15 + Math.random() * 20,
    flip: Math.random() > 0.5,
  }))
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/**
 * Sky gradient through trees
 */
function SkyBackground({
  width,
  height,
}: {
  width: number
  height: number
}) {
  return (
    <svg width={width} height={height} className="absolute inset-0">
      <defs>
        <linearGradient id="forest-sky" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#7dd3fc" />
          <stop offset="30%" stopColor="#bae6fd" />
          <stop offset="60%" stopColor="#bbf7d0" />
          <stop offset="100%" stopColor="#86efac" />
        </linearGradient>
      </defs>
      <rect width={width} height={height} fill="url(#forest-sky)" />
    </svg>
  )
}

/**
 * Sunlight rays streaming through canopy
 */
function Sunrays({
  rays,
  width,
  height,
  intensity,
  reducedMotion,
}: {
  rays: Sunray[]
  width: number
  height: number
  intensity: number
  reducedMotion: boolean
}) {
  return (
    <svg width={width} height={height} className="absolute inset-0 pointer-events-none">
      <defs>
        <linearGradient id="sunray-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="rgba(254, 240, 138, 0.6)" />
          <stop offset="100%" stopColor="rgba(254, 240, 138, 0)" />
        </linearGradient>
        <filter id="sunray-blur" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="10" />
        </filter>
      </defs>

      {rays.map((ray) => (
        <motion.rect
          key={ray.id}
          x={ray.x}
          y={-50}
          width={ray.width * (0.8 + intensity * 0.4)}
          height={height * 1.2}
          fill="url(#sunray-gradient)"
          opacity={ray.opacity * (0.7 + intensity * 0.5)}
          filter="url(#sunray-blur)"
          transform={`rotate(${ray.angle} ${ray.x + ray.width / 2} ${height / 2})`}
          animate={reducedMotion ? undefined : {
            opacity: [
              ray.opacity * 0.5,
              ray.opacity * (0.7 + intensity * 0.5),
              ray.opacity * 0.6,
              ray.opacity * (0.7 + intensity * 0.5),
              ray.opacity * 0.5,
            ],
          }}
          transition={{
            duration: 4 + ray.id,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
    </svg>
  )
}

/**
 * Tree layers with sway animation
 */
function TreeLayers({
  layer,
  trees,
  width,
  height,
  swayIntensity,
  reducedMotion,
}: {
  layer: number
  trees: Tree[]
  width: number
  height: number
  swayIntensity: number
  reducedMotion: boolean
}) {
  const layerY = height * (0.3 + layer * 0.15)

  return (
    <svg
      width={width}
      height={height}
      className="absolute inset-0"
      style={{ zIndex: 10 + layer }}
    >
      <defs>
        {/* Tree foliage gradient */}
        <radialGradient id={`tree-foliage-${layer}`} cx="50%" cy="30%" r="60%">
          <stop offset="0%" stopColor={trees[0]?.color || '#22c55e'} />
          <stop offset="100%" stopColor={layer < 2 ? '#14532d' : '#166534'} />
        </radialGradient>
      </defs>

      {trees.map((tree) => {
        const treeTop = layerY - tree.height
        const trunkHeight = tree.height * 0.3
        const canopyHeight = tree.height * 0.8

        return (
          <motion.g
            key={tree.id}
            style={{ transformOrigin: `${tree.x}px ${layerY}px` }}
            animate={reducedMotion ? undefined : {
              rotate: [
                -swayIntensity * (layer + 1) * 0.3,
                swayIntensity * (layer + 1) * 0.3,
                -swayIntensity * (layer + 1) * 0.3,
              ],
            }}
            transition={{
              duration: 3 + layer,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            {/* Trunk */}
            <rect
              x={tree.x - tree.width * 0.08}
              y={layerY - trunkHeight}
              width={tree.width * 0.16}
              height={trunkHeight}
              fill={tree.trunkColor}
            />

            {/* Canopy - multiple overlapping ellipses */}
            <ellipse
              cx={tree.x}
              cy={treeTop + canopyHeight * 0.4}
              rx={tree.width / 2}
              ry={canopyHeight * 0.4}
              fill={`url(#tree-foliage-${layer})`}
            />
            <ellipse
              cx={tree.x - tree.width * 0.2}
              cy={treeTop + canopyHeight * 0.35}
              rx={tree.width * 0.35}
              ry={canopyHeight * 0.3}
              fill={tree.color}
              opacity={0.9}
            />
            <ellipse
              cx={tree.x + tree.width * 0.2}
              cy={treeTop + canopyHeight * 0.3}
              rx={tree.width * 0.3}
              ry={canopyHeight * 0.25}
              fill={tree.color}
              opacity={0.85}
            />
            {/* Top tuft */}
            <ellipse
              cx={tree.x}
              cy={treeTop + canopyHeight * 0.15}
              rx={tree.width * 0.25}
              ry={canopyHeight * 0.2}
              fill={tree.color}
            />
          </motion.g>
        )
      })}
    </svg>
  )
}

/**
 * Floating leaves
 */
function FloatingLeaves({
  leaves,
  width,
  height,
  intensity,
  reducedMotion,
}: {
  leaves: Leaf[]
  width: number
  height: number
  intensity: number
  reducedMotion: boolean
}) {
  const activeCount = Math.floor(leaves.length * (0.4 + intensity * 0.6))

  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 50 }}>
      {leaves.slice(0, activeCount).map((leaf) => {
        const startX = leaf.startX * width
        const endX = startX + (Math.random() - 0.5) * width * 0.5

        return (
          <motion.div
            key={leaf.id}
            className="absolute"
            style={{
              left: startX,
              top: leaf.startY * height,
            }}
            animate={reducedMotion ? undefined : {
              x: [0, endX - startX],
              y: [0, height * 1.2],
              rotate: [leaf.rotation, leaf.rotation + 720],
            }}
            transition={{
              duration: leaf.duration,
              repeat: Infinity,
              delay: leaf.delay,
              ease: 'linear',
            }}
          >
            {/* Leaf SVG */}
            <svg width={leaf.size} height={leaf.size} viewBox="0 0 20 20">
              <path
                d="M10 0 Q15 5 15 10 Q15 18 10 20 Q5 18 5 10 Q5 5 10 0"
                fill={leaf.color}
              />
              <path
                d="M10 2 L10 18"
                stroke={leaf.color}
                strokeWidth={0.5}
                opacity={0.5}
              />
            </svg>
          </motion.div>
        )
      })}
    </div>
  )
}

/**
 * Flying birds
 */
function Birds({
  birds,
  width,
  height,
  reducedMotion,
}: {
  birds: Bird[]
  width: number
  height: number
  reducedMotion: boolean
}) {
  return (
    <svg width={width} height={height} className="absolute inset-0 pointer-events-none" style={{ zIndex: 45 }}>
      {birds.map((bird) => (
        <motion.g
          key={bird.id}
          animate={reducedMotion ? undefined : {
            x: bird.direction > 0
              ? [bird.startX - width * 0.2, bird.startX + width * 1.3]
              : [bird.startX + width * 0.2, bird.startX - width * 1.3],
            y: [bird.y, bird.y - 30, bird.y + 15, bird.y - 10, bird.y],
          }}
          transition={{
            x: { duration: bird.speed, repeat: Infinity, ease: 'linear' },
            y: { duration: 4, repeat: Infinity, ease: 'easeInOut' },
          }}
        >
          <motion.path
            d={`
              M 0 0
              Q ${-bird.size / 2} ${-bird.size / 3} ${-bird.size} ${bird.size / 4}
              M 0 0
              Q ${bird.size / 2} ${-bird.size / 3} ${bird.size} ${bird.size / 4}
            `}
            fill="none"
            stroke="#1e293b"
            strokeWidth={1.5}
            strokeLinecap="round"
            transform={`scale(${bird.direction}, 1)`}
            animate={reducedMotion ? undefined : {
              d: [
                `M 0 0 Q ${-bird.size / 2} ${-bird.size / 3} ${-bird.size} ${bird.size / 4}
                 M 0 0 Q ${bird.size / 2} ${-bird.size / 3} ${bird.size} ${bird.size / 4}`,
                `M 0 0 Q ${-bird.size / 2} ${-bird.size / 2} ${-bird.size} 0
                 M 0 0 Q ${bird.size / 2} ${-bird.size / 2} ${bird.size} 0`,
                `M 0 0 Q ${-bird.size / 2} ${-bird.size / 3} ${-bird.size} ${bird.size / 4}
                 M 0 0 Q ${bird.size / 2} ${-bird.size / 3} ${bird.size} ${bird.size / 4}`,
              ],
            }}
            transition={{
              duration: 0.3,
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
 * Forest floor with ferns and mushrooms
 */
function ForestFloor({
  ferns,
  width,
  height,
  swayIntensity,
  reducedMotion,
}: {
  ferns: Fern[]
  width: number
  height: number
  swayIntensity: number
  reducedMotion: boolean
}) {
  const floorY = height * 0.88

  // Stable mushroom positions (don't use Math.random in render)
  const mushrooms = useMemo(() => [
    { x: 0.15, offset: 5, scale: 1 },
    { x: 0.45, offset: -8, scale: 0.85 },
    { x: 0.75, offset: 12, scale: 1.1 },
  ], [])

  return (
    <svg width={width} height={height} className="absolute inset-0" style={{ zIndex: 60 }}>
      <defs>
        <linearGradient id="floor-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#365314" />
          <stop offset="100%" stopColor="#1a2e05" />
        </linearGradient>
      </defs>

      {/* Ground */}
      <rect
        x={0}
        y={floorY}
        width={width}
        height={height - floorY}
        fill="url(#floor-gradient)"
      />

      {/* Ferns - smooth wind-like sway */}
      {ferns.map((fern) => (
        <motion.g
          key={fern.id}
          transform={`translate(${fern.x}, ${floorY}) ${fern.flip ? 'scale(-1, 1)' : ''}`}
          style={{ transformOrigin: `${fern.x}px ${floorY}px` }}
          animate={reducedMotion ? undefined : {
            rotate: [
              -swayIntensity * 0.8,
              swayIntensity * 1.2,
              -swayIntensity * 0.5,
              swayIntensity * 0.9,
              -swayIntensity * 0.8,
            ],
          }}
          transition={{
            duration: 4 + fern.id * 0.5,
            repeat: Infinity,
            ease: [0.37, 0, 0.63, 1], // Custom ease for natural motion
            times: [0, 0.25, 0.5, 0.75, 1],
          }}
        >
          {/* Fern fronds */}
          {Array.from({ length: 5 }, (_, i) => (
            <path
              key={i}
              d={`M 0 0 Q ${5 + i * 3} ${-fern.height * 0.3} ${10 + i * 4} ${-fern.height * (0.5 + i * 0.1)}`}
              fill="none"
              stroke="#22c55e"
              strokeWidth={2}
              strokeLinecap="round"
              transform={`rotate(${-20 + i * 10})`}
            />
          ))}
        </motion.g>
      ))}

      {/* Mushrooms - gentle swaying in breeze */}
      {mushrooms.map((mushroom, i) => (
        <motion.g
          key={i}
          style={{
            transformOrigin: `${width * mushroom.x + mushroom.offset}px ${floorY}px`,
          }}
          animate={reducedMotion ? undefined : {
            rotate: [0, -1.5, 0, 1.5, 0],
            y: [0, -0.5, 0, -0.3, 0],
          }}
          transition={{
            duration: 5 + i * 1.5,
            repeat: Infinity,
            ease: 'easeInOut',
            times: [0, 0.25, 0.5, 0.75, 1],
          }}
        >
          <g transform={`translate(${width * mushroom.x + mushroom.offset}, ${floorY - 5}) scale(${mushroom.scale})`}>
            {/* Stem base */}
            <ellipse cx={0} cy={0} rx={6} ry={3} fill="#fef3c7" />
            {/* Stem */}
            <rect x={-2} y={0} width={4} height={8} fill="#fef3c7" rx={1} />
            {/* Cap */}
            <ellipse cx={0} cy={-3} rx={8} ry={5} fill="#dc2626" />
            {/* Cap spots */}
            <circle cx={-3} cy={-4} r={1.5} fill="white" opacity={0.9} />
            <circle cx={2} cy={-2} r={1} fill="white" opacity={0.9} />
            <circle cx={4} cy={-4} r={0.8} fill="white" opacity={0.7} />
          </g>
        </motion.g>
      ))}
    </svg>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * ForestScene - Peaceful forest with trees and wildlife
 */
export default function ForestScene({
  analyser,
  isPlaying,
  width = DEFAULT_SCENE_DIMENSIONS.width,
  height = DEFAULT_SCENE_DIMENSIONS.height,
  isDark = false,
  theme,
  className = '',
  reducedMotion = false,
}: SoundscapeSceneProps) {
  const palette = getSoundscapePalette('forest', theme)

  // Audio reactivity
  const { amplitude, mid, high } = useAudioReactivity(analyser, isPlaying, {
    smoothing: 0.2,
  })

  // Calculate sway intensity
  const swayIntensity = audioLerp(0.5, 2, amplitude + mid * 0.3, 1)
  const leafIntensity = audioLerp(0.3, 1, high + amplitude * 0.2, 1)

  // Generate scene elements (memoized)
  const treeLayers = useMemo(() =>
    Array.from({ length: TREE_LAYERS }, (_, i) => ({
      layer: i,
      trees: generateTrees(i, width, height),
    })),
    [width, height]
  )

  const sunrays = useMemo(() => generateSunrays(SUNRAY_COUNT, width), [width])
  const leaves = useMemo(() => generateLeaves(LEAF_COUNT), [])
  const birds = useMemo(() => generateBirds(BIRD_COUNT, width), [width])
  const ferns = useMemo(() => generateFerns(FERN_COUNT, width), [width])

  return (
    <SoundscapeContainer
      soundscapeType="forest"
      width={width}
      height={height}
      isDark={isDark}
      theme={theme}
      isPlaying={isPlaying}
      className={className}
      reducedMotion={reducedMotion}
    >
      {/* Sky */}
      <SkyBackground width={width} height={height} />

      {/* Sunrays */}
      <Sunrays
        rays={sunrays}
        width={width}
        height={height}
        intensity={amplitude}
        reducedMotion={reducedMotion}
      />

      {/* Tree layers (back to front) */}
      {treeLayers.map(({ layer, trees }) => (
        <TreeLayers
          key={layer}
          layer={layer}
          trees={trees}
          width={width}
          height={height}
          swayIntensity={swayIntensity}
          reducedMotion={reducedMotion}
        />
      ))}

      {/* Birds */}
      <Birds
        birds={birds}
        width={width}
        height={height}
        reducedMotion={reducedMotion}
      />

      {/* Floating leaves */}
      <FloatingLeaves
        leaves={leaves}
        width={width}
        height={height}
        intensity={leafIntensity}
        reducedMotion={reducedMotion}
      />

      {/* Forest floor */}
      <ForestFloor
        ferns={ferns}
        width={width}
        height={height}
        swayIntensity={swayIntensity}
        reducedMotion={reducedMotion}
      />

      {/* Atmospheric haze */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `linear-gradient(to bottom,
            rgba(187, 247, 208, 0.1) 0%,
            transparent 30%,
            transparent 70%,
            rgba(20, 83, 45, 0.2) 100%
          )`,
          zIndex: 70,
        }}
      />
    </SoundscapeContainer>
  )
}

// ============================================================================
// EXPORTS
// ============================================================================

export { ForestScene }
