/**
 * Retro Jukebox
 * @module components/quarry/ui/RetroJukebox
 *
 * A detailed animated SVG jukebox with classic 1950s styling.
 * Features bubble tubes, spinning vinyl, neon glow, and equalizer bars.
 */

'use client'

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { motion, AnimatePresence, useAnimation } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { SoundscapeType } from '@/lib/audio/ambienceSounds'

// ============================================================================
// TYPES
// ============================================================================

export interface RetroJukeboxProps {
  /** Current soundscape/song name */
  nowPlaying?: string
  /** Whether audio is playing */
  isPlaying?: boolean
  /** Audio analyser for equalizer */
  analyser?: AnalyserNode | null
  /** Volume level 0-1 */
  volume?: number
  /** Current soundscape type */
  currentSoundscape?: SoundscapeType
  /** Callback when play/pause clicked */
  onTogglePlay?: () => void
  /** Callback when volume changed */
  onVolumeChange?: (volume: number) => void
  /** Callback when soundscape selected */
  onSelectSoundscape?: (soundscape: SoundscapeType) => void
  /** Whether scene visualization is shown */
  showScene?: boolean
  /** Callback when scene toggle clicked */
  onToggleScene?: () => void
  /** Compact mode for sidebar */
  compact?: boolean
  /** Minimal mode - reduces animations to just equalizer bars */
  minimal?: boolean
  /** Dark theme */
  isDark?: boolean
  /** Additional class names */
  className?: string
}

// Map selection buttons to soundscapes with descriptions
const SOUNDSCAPE_BUTTONS: {
  label: string
  soundscape: SoundscapeType
  icon: string
  name: string
  description: string
}[] = [
  { label: 'A1', soundscape: 'rain', icon: '🌧️', name: 'Rain', description: 'Gentle rainfall with distant thunder' },
  { label: 'A2', soundscape: 'cafe', icon: '☕', name: 'Café', description: 'Cozy coffee shop ambience' },
  { label: 'A3', soundscape: 'forest', icon: '🌲', name: 'Forest', description: 'Birds chirping, leaves rustling' },
  { label: 'B1', soundscape: 'ocean', icon: '🌊', name: 'Ocean', description: 'Waves crashing on the shore' },
  { label: 'B2', soundscape: 'fireplace', icon: '🔥', name: 'Fireplace', description: 'Crackling fire warmth' },
  { label: 'B3', soundscape: 'lofi', icon: '🎵', name: 'Lo-fi', description: 'Chill beats to focus to' },
  { label: 'C1', soundscape: 'white-noise', icon: '📻', name: 'White Noise', description: 'Static for deep focus' },
]

// ============================================================================
// CONSTANTS
// ============================================================================

const BUBBLE_COLORS = [
  '#FF6B6B', // Red
  '#4ECDC4', // Teal
  '#FFE66D', // Yellow
  '#95E1D3', // Mint
  '#F38181', // Coral
  '#AA96DA', // Lavender
  '#FCBAD3', // Pink
  '#A8D8EA', // Sky
]

const NEON_COLORS = {
  primary: '#FF00FF',    // Magenta
  secondary: '#00FFFF',  // Cyan
  accent: '#FFFF00',     // Yellow
  warm: '#FF6B35',       // Orange
}

// ============================================================================
// BUBBLE COMPONENT
// ============================================================================

interface BubbleProps {
  tubeX: number
  tubeWidth: number
  tubeHeight: number
  tubeTop: number
  delay: number
  color: string
  size: number
}

function Bubble({ tubeX, tubeWidth, tubeHeight, tubeTop, delay, color, size }: BubbleProps) {
  const startX = tubeX + tubeWidth * 0.2 + Math.random() * tubeWidth * 0.6
  const duration = 3 + Math.random() * 2

  return (
    <motion.circle
      cx={startX}
      cy={tubeTop + tubeHeight}
      r={size}
      fill={color}
      opacity={0.7}
      filter="url(#bubbleGlow)"
      initial={{ cy: tubeTop + tubeHeight, opacity: 0 }}
      animate={{
        cy: [tubeTop + tubeHeight, tubeTop + 10],
        opacity: [0, 0.8, 0.8, 0],
        cx: [startX, startX + (Math.random() - 0.5) * 10],
      }}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        ease: 'easeOut',
      }}
    />
  )
}

// ============================================================================
// EQUALIZER BAR COMPONENT
// ============================================================================

interface EqualizerBarProps {
  x: number
  baseY: number
  width: number
  maxHeight: number
  index: number
  isPlaying: boolean
  analyserData?: Uint8Array
}

function EqualizerBar({ x, baseY, width, maxHeight, index, isPlaying, analyserData }: EqualizerBarProps) {
  const height = useMemo(() => {
    if (!isPlaying) return 4
    if (analyserData && analyserData.length > 0) {
      const binIndex = Math.floor((index / 16) * analyserData.length)
      return Math.max(4, (analyserData[binIndex] / 255) * maxHeight)
    }
    return 4 + Math.random() * maxHeight * 0.8
  }, [isPlaying, analyserData, index, maxHeight])

  const barColors = ['#FF6B6B', '#FFE66D', '#4ECDC4', '#AA96DA']
  const color = barColors[index % barColors.length]

  return (
    <motion.rect
      x={x}
      y={baseY - height}
      width={width}
      height={height}
      rx={2}
      fill={`url(#eqGradient${index % 4})`}
      filter="url(#eqGlow)"
      animate={isPlaying ? {
        height: [height, height * 0.3, height * 0.8, height],
        y: [baseY - height, baseY - height * 0.3, baseY - height * 0.8, baseY - height],
      } : {
        height: 4,
        y: baseY - 4,
      }}
      transition={{
        duration: 0.8 + Math.random() * 0.4,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    />
  )
}

// ============================================================================
// SELECTION BUTTON COMPONENT
// ============================================================================

interface SelectionButtonProps {
  x: number
  y: number
  label: string
  name?: string
  description?: string
  isSelected?: boolean
  onClick?: () => void
}

function SelectionButton({ x, y, label, name, description, isSelected, onClick }: SelectionButtonProps) {
  const tooltip = name ? `${name}${description ? `: ${description}` : ''}` : undefined

  return (
    <g
      onClick={onClick}
      style={{ cursor: 'pointer' }}
      role="button"
      aria-label={name || label}
      aria-pressed={isSelected}
      tabIndex={0}
    >
      {/* Tooltip title */}
      {tooltip && <title>{tooltip}</title>}
      {/* Button base */}
      <rect
        x={x}
        y={y}
        width={24}
        height={18}
        rx={4}
        fill={isSelected ? '#FFE66D' : '#2A2A2A'}
        stroke="#4A4A4A"
        strokeWidth={1}
      />
      {/* Button highlight */}
      <rect
        x={x + 2}
        y={y + 2}
        width={20}
        height={6}
        rx={2}
        fill={isSelected ? '#FFF3B0' : '#3A3A3A'}
        opacity={0.5}
      />
      {/* Label */}
      <text
        x={x + 12}
        y={y + 13}
        textAnchor="middle"
        fontSize={8}
        fontFamily="monospace"
        fontWeight="bold"
        fill={isSelected ? '#1A1A1A' : '#8A8A8A'}
      >
        {label}
      </text>
    </g>
  )
}

// ============================================================================
// VINYL RECORD COMPONENT
// ============================================================================

interface VinylRecordProps {
  cx: number
  cy: number
  radius: number
  isPlaying: boolean
}

function VinylRecord({ cx, cy, radius, isPlaying }: VinylRecordProps) {
  return (
    <g>
      {/* Record base */}
      <motion.g
        animate={isPlaying ? { rotate: 360 } : { rotate: 0 }}
        transition={isPlaying ? {
          duration: 3,
          repeat: Infinity,
          ease: 'linear',
        } : { duration: 0.5 }}
        style={{ transformOrigin: `${cx}px ${cy}px` }}
      >
        {/* Outer rim */}
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="#1A1A1A"
          stroke="#2A2A2A"
          strokeWidth={2}
        />

        {/* Grooves - concentric circles */}
        {Array.from({ length: 12 }).map((_, i) => (
          <circle
            key={`groove-${i}`}
            cx={cx}
            cy={cy}
            r={radius * 0.3 + (radius * 0.6 * i / 12)}
            fill="none"
            stroke="#252525"
            strokeWidth={0.5}
            opacity={0.5}
          />
        ))}

        {/* Label area */}
        <circle
          cx={cx}
          cy={cy}
          r={radius * 0.3}
          fill="url(#labelGradient)"
        />

        {/* Center hole */}
        <circle
          cx={cx}
          cy={cy}
          r={radius * 0.05}
          fill="#0A0A0A"
        />

        {/* Label decoration */}
        <circle
          cx={cx}
          cy={cy}
          r={radius * 0.2}
          fill="none"
          stroke="#FFE66D"
          strokeWidth={1}
          opacity={0.5}
        />

        {/* Shine effect */}
        <ellipse
          cx={cx - radius * 0.3}
          cy={cy - radius * 0.3}
          rx={radius * 0.4}
          ry={radius * 0.15}
          fill="white"
          opacity={0.05}
          transform={`rotate(-45 ${cx} ${cy})`}
        />
      </motion.g>

      {/* Tonearm (stationary) */}
      <g>
        {/* Arm base */}
        <circle
          cx={cx + radius + 15}
          cy={cy - radius + 10}
          r={8}
          fill="#3A3A3A"
          stroke="#4A4A4A"
          strokeWidth={2}
        />

        {/* Arm */}
        <motion.g
          animate={isPlaying ? { rotate: -5 } : { rotate: 15 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          style={{ transformOrigin: `${cx + radius + 15}px ${cy - radius + 10}px` }}
        >
          <line
            x1={cx + radius + 15}
            y1={cy - radius + 10}
            x2={cx + radius * 0.7}
            y2={cy}
            stroke="#5A5A5A"
            strokeWidth={3}
            strokeLinecap="round"
          />
          {/* Cartridge */}
          <rect
            x={cx + radius * 0.65}
            y={cy - 4}
            width={12}
            height={8}
            rx={2}
            fill="#4A4A4A"
          />
          {/* Needle */}
          <line
            x1={cx + radius * 0.65 + 6}
            y1={cy + 4}
            x2={cx + radius * 0.65 + 6}
            y2={cy + 8}
            stroke="#8A8A8A"
            strokeWidth={1}
          />
        </motion.g>
      </g>
    </g>
  )
}

// ============================================================================
// NOW PLAYING MARQUEE
// ============================================================================

interface MarqueeProps {
  x: number
  y: number
  width: number
  height: number
  text: string
  isPlaying: boolean
}

function Marquee({ x, y, width, height, text, isPlaying }: MarqueeProps) {
  const displayText = isPlaying ? text : 'INSERT COIN'

  return (
    <g>
      {/* Display background */}
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={4}
        fill="#0A0A0A"
        stroke="#2A2A2A"
        strokeWidth={2}
      />

      {/* LED grid effect */}
      <defs>
        <pattern id="ledGrid" width="4" height="4" patternUnits="userSpaceOnUse">
          <rect width="3" height="3" fill="#0F0F0F" />
          <rect width="2" height="2" fill="#151515" />
        </pattern>
      </defs>
      <rect
        x={x + 2}
        y={y + 2}
        width={width - 4}
        height={height - 4}
        fill="url(#ledGrid)"
        opacity={0.5}
      />

      {/* Scrolling text container */}
      <clipPath id="marqueeClip">
        <rect x={x + 4} y={y + 2} width={width - 8} height={height - 4} />
      </clipPath>

      <g clipPath="url(#marqueeClip)">
        <motion.text
          x={x + width / 2}
          y={y + height / 2 + 5}
          textAnchor="middle"
          fontSize={14}
          fontFamily="'Courier New', monospace"
          fontWeight="bold"
          fill={isPlaying ? '#00FF00' : '#FF6B6B'}
          filter="url(#textGlow)"
          animate={isPlaying ? {
            x: [x + width + 50, x - 100],
          } : {
            opacity: [1, 0.5, 1],
          }}
          transition={isPlaying ? {
            duration: 8,
            repeat: Infinity,
            ease: 'linear',
          } : {
            duration: 1,
            repeat: Infinity,
          }}
        >
          {displayText.toUpperCase()}
        </motion.text>
      </g>

      {/* "NOW PLAYING" label */}
      {isPlaying && (
        <motion.text
          x={x + width / 2}
          y={y - 5}
          textAnchor="middle"
          fontSize={8}
          fontFamily="sans-serif"
          fontWeight="bold"
          fill="#FF00FF"
          filter="url(#textGlow)"
          animate={{ opacity: [1, 0.6, 1] }}
          transition={{ duration: 0.5, repeat: Infinity }}
        >
          NOW PLAYING
        </motion.text>
      )}
    </g>
  )
}

// ============================================================================
// SPEAKER GRILLE COMPONENT
// ============================================================================

interface SpeakerGrilleProps {
  x: number
  y: number
  width: number
  height: number
  isPlaying: boolean
}

function SpeakerGrille({ x, y, width, height, isPlaying }: SpeakerGrilleProps) {
  const rows = Math.floor(height / 8)
  const cols = Math.floor(width / 8)

  return (
    <g>
      {/* Grille frame */}
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={8}
        fill="#1A1A1A"
        stroke="#2A2A2A"
        strokeWidth={2}
      />

      {/* Grille holes */}
      {Array.from({ length: rows }).map((_, row) => (
        Array.from({ length: cols }).map((_, col) => (
          <motion.circle
            key={`hole-${row}-${col}`}
            cx={x + 6 + col * 8}
            cy={y + 6 + row * 8}
            r={2}
            fill="#0A0A0A"
            animate={isPlaying ? {
              opacity: [0.4, 0.6, 0.4],
            } : {
              opacity: 0.3,
            }}
            transition={{
              duration: 3,
              delay: (row + col) * 0.02,
              repeat: Infinity,
            }}
          />
        ))
      ))}

      {/* Inner glow when playing */}
      {isPlaying && (
        <motion.rect
          x={x + 4}
          y={y + 4}
          width={width - 8}
          height={height - 8}
          rx={6}
          fill="none"
          stroke="#FF00FF"
          strokeWidth={1}
          opacity={0.3}
          animate={{ opacity: [0.15, 0.25, 0.15] }}
          transition={{ duration: 1, repeat: Infinity }}
        />
      )}
    </g>
  )
}

// ============================================================================
// COIN SLOT COMPONENT
// ============================================================================

interface CoinSlotProps {
  x: number
  y: number
}

function CoinSlot({ x, y }: CoinSlotProps) {
  return (
    <g>
      {/* Slot plate */}
      <rect
        x={x}
        y={y}
        width={40}
        height={50}
        rx={4}
        fill="url(#chromeGradient)"
        stroke="#6A6A6A"
        strokeWidth={1}
      />

      {/* Slot opening */}
      <rect
        x={x + 12}
        y={y + 10}
        width={16}
        height={4}
        rx={2}
        fill="#0A0A0A"
      />

      {/* Coin return button */}
      <circle
        cx={x + 20}
        cy={y + 35}
        r={8}
        fill="url(#chromeGradient)"
        stroke="#5A5A5A"
        strokeWidth={1}
      />
      <circle
        cx={x + 20}
        cy={y + 35}
        r={5}
        fill="#3A3A3A"
      />

      {/* Label */}
      <text
        x={x + 20}
        y={y + 48}
        textAnchor="middle"
        fontSize={5}
        fontFamily="sans-serif"
        fill="#8A8A8A"
      >
        COIN
      </text>
    </g>
  )
}

// ============================================================================
// VOLUME KNOB COMPONENT
// ============================================================================

interface VolumeKnobProps {
  cx: number
  cy: number
  radius: number
  value: number
  onChange?: (value: number) => void
}

function VolumeKnob({ cx, cy, radius, value, onChange }: VolumeKnobProps) {
  const rotation = -135 + value * 270 // -135 to 135 degrees
  const volumePercent = Math.round(value * 100)

  return (
    <g
      role="slider"
      aria-label="Volume control"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={volumePercent}
      aria-valuetext={`Volume ${volumePercent}%`}
    >
      {/* Tooltip */}
      <title>Volume: {volumePercent}%</title>
      {/* Knob base */}
      <circle
        cx={cx}
        cy={cy}
        r={radius + 4}
        fill="#1A1A1A"
        stroke="#3A3A3A"
        strokeWidth={2}
      />

      {/* Knob body */}
      <circle
        cx={cx}
        cy={cy}
        r={radius}
        fill="url(#knobGradient)"
        stroke="#5A5A5A"
        strokeWidth={1}
      />

      {/* Indicator line */}
      <motion.line
        x1={cx}
        y1={cy - radius + 3}
        x2={cx}
        y2={cy - radius * 0.4}
        stroke="#FF6B6B"
        strokeWidth={2}
        strokeLinecap="round"
        style={{ transformOrigin: `${cx}px ${cy}px` }}
        animate={{ rotate: rotation }}
      />

      {/* Scale marks */}
      {Array.from({ length: 11 }).map((_, i) => {
        const angle = (-135 + i * 27) * (Math.PI / 180)
        const x1 = cx + Math.cos(angle) * (radius + 8)
        const y1 = cy + Math.sin(angle) * (radius + 8)
        const x2 = cx + Math.cos(angle) * (radius + 12)
        const y2 = cy + Math.sin(angle) * (radius + 12)
        return (
          <line
            key={`mark-${i}`}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="#5A5A5A"
            strokeWidth={i % 5 === 0 ? 2 : 1}
          />
        )
      })}

      {/* Label */}
      <text
        x={cx}
        y={cy + radius + 20}
        textAnchor="middle"
        fontSize={8}
        fontFamily="sans-serif"
        fontWeight="bold"
        fill="#8A8A8A"
      >
        VOLUME
      </text>
    </g>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function RetroJukebox({
  nowPlaying = 'Select a Track',
  isPlaying = false,
  analyser,
  volume = 0.5,
  currentSoundscape = 'rain',
  onTogglePlay,
  onVolumeChange,
  onSelectSoundscape,
  showScene = false,
  onToggleScene,
  compact = false,
  minimal = false,
  isDark = true,
  className,
}: RetroJukeboxProps) {
  const [bubbles, setBubbles] = useState<Array<{ id: number; color: string; delay: number; size: number }>>([])
  const [analyserData, setAnalyserData] = useState<Uint8Array | null>(null)
  const animationRef = useRef<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(0)

  // Measure container width for responsive sizing
  useEffect(() => {
    if (!containerRef.current) return

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry) {
        setContainerWidth(entry.contentRect.width)
      }
    })

    observer.observe(containerRef.current)
    // Set initial width
    setContainerWidth(containerRef.current.offsetWidth)

    return () => observer.disconnect()
  }, [])

  // Generate bubbles
  useEffect(() => {
    const newBubbles = Array.from({ length: 30 }).map((_, i) => ({
      id: i,
      color: BUBBLE_COLORS[Math.floor(Math.random() * BUBBLE_COLORS.length)],
      delay: Math.random() * 5,
      size: 3 + Math.random() * 5,
    }))
    setBubbles(newBubbles)
  }, [])

  // Analyser animation loop
  useEffect(() => {
    if (!analyser || !isPlaying) {
      setAnalyserData(null)
      return
    }

    const dataArray = new Uint8Array(analyser.frequencyBinCount)

    const updateData = () => {
      analyser.getByteFrequencyData(dataArray)
      setAnalyserData(new Uint8Array(dataArray))
      animationRef.current = requestAnimationFrame(updateData)
    }

    updateData()

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [analyser, isPlaying])

  // Responsive dimensions - scale based on container width
  const baseWidth = compact ? 200 : 400
  const baseHeight = compact ? 280 : 560
  const responsiveScale = containerWidth > 0 ? Math.min(1, (containerWidth - 8) / baseWidth) : 1
  const width = Math.floor(baseWidth * responsiveScale)
  const height = Math.floor(baseHeight * responsiveScale)
  const viewBoxScale = compact ? 0.5 : 1

  return (
    <div ref={containerRef} className={cn('relative w-full flex justify-center', className)}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${baseWidth / viewBoxScale} ${baseHeight / viewBoxScale}`}
        className="drop-shadow-2xl max-w-full"
        style={{ maxWidth: '100%', height: 'auto' }}
      >
        {/* Definitions */}
        <defs>
          {/* Chrome gradient */}
          <linearGradient id="chromeGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#C0C0C0" />
            <stop offset="20%" stopColor="#E8E8E8" />
            <stop offset="50%" stopColor="#A0A0A0" />
            <stop offset="80%" stopColor="#E8E8E8" />
            <stop offset="100%" stopColor="#909090" />
          </linearGradient>

          {/* Body gradient */}
          <linearGradient id="bodyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#4A1A1A" />
            <stop offset="30%" stopColor="#8B0000" />
            <stop offset="70%" stopColor="#660000" />
            <stop offset="100%" stopColor="#3A0A0A" />
          </linearGradient>

          {/* Frame gradient */}
          <linearGradient id="frameGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#D4AF37" />
            <stop offset="25%" stopColor="#FFD700" />
            <stop offset="50%" stopColor="#D4AF37" />
            <stop offset="75%" stopColor="#FFD700" />
            <stop offset="100%" stopColor="#B8860B" />
          </linearGradient>

          {/* Glass gradient */}
          <linearGradient id="glassGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1A1A2E" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#0A0A1A" stopOpacity="0.95" />
          </linearGradient>

          {/* Bubble tube gradient */}
          <linearGradient id="tubeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#2A2A4A" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#1A1A3A" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#2A2A4A" stopOpacity="0.8" />
          </linearGradient>

          {/* Knob gradient */}
          <radialGradient id="knobGradient" cx="30%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#5A5A5A" />
            <stop offset="100%" stopColor="#2A2A2A" />
          </radialGradient>

          {/* Record label gradient */}
          <radialGradient id="labelGradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFD700" />
            <stop offset="50%" stopColor="#FF6B35" />
            <stop offset="100%" stopColor="#8B0000" />
          </radialGradient>

          {/* Equalizer gradients */}
          <linearGradient id="eqGradient0" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#FF6B6B" />
            <stop offset="100%" stopColor="#FF8E8E" />
          </linearGradient>
          <linearGradient id="eqGradient1" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#FFE66D" />
            <stop offset="100%" stopColor="#FFF3B0" />
          </linearGradient>
          <linearGradient id="eqGradient2" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#4ECDC4" />
            <stop offset="100%" stopColor="#7EDDD6" />
          </linearGradient>
          <linearGradient id="eqGradient3" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#AA96DA" />
            <stop offset="100%" stopColor="#C4B5E8" />
          </linearGradient>

          {/* Neon glow filter */}
          <filter id="neonGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
            <feFlood floodColor="#FF00FF" floodOpacity="0.5" result="color" />
            <feComposite in="color" in2="blur" operator="in" result="shadow" />
            <feMerge>
              <feMergeNode in="shadow" />
              <feMergeNode in="shadow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Bubble glow filter */}
          <filter id="bubbleGlow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Text glow filter */}
          <filter id="textGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* EQ glow filter */}
          <filter id="eqGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="1" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Inner shadow for depth */}
          <filter id="innerShadow" x="-50%" y="-50%" width="200%" height="200%">
            <feComponentTransfer in="SourceAlpha">
              <feFuncA type="table" tableValues="1 0" />
            </feComponentTransfer>
            <feGaussianBlur stdDeviation="3" />
            <feOffset dx="2" dy="2" result="offsetblur" />
            <feFlood floodColor="#000000" floodOpacity="0.5" result="color" />
            <feComposite in2="offsetblur" operator="in" />
            <feComposite in2="SourceAlpha" operator="in" />
            <feMerge>
              <feMergeNode in="SourceGraphic" />
              <feMergeNode />
            </feMerge>
          </filter>
        </defs>

        {/* ============================================ */}
        {/* MAIN BODY */}
        {/* ============================================ */}

        {/* Outer frame shadow */}
        <rect
          x={15}
          y={15}
          width={370}
          height={535}
          rx={30}
          fill="#000000"
          opacity={0.5}
        />

        {/* Main body */}
        <rect
          x={10}
          y={10}
          width={380}
          height={540}
          rx={30}
          fill="url(#bodyGradient)"
          stroke="url(#frameGradient)"
          strokeWidth={6}
        />

        {/* Top arch decoration */}
        <path
          d="M 50 10 Q 200 -30 350 10"
          fill="none"
          stroke="url(#frameGradient)"
          strokeWidth={8}
          strokeLinecap="round"
        />

        {/* Decorative chrome strips */}
        <rect x={30} y={50} width={340} height={4} rx={2} fill="url(#chromeGradient)" />
        <rect x={30} y={510} width={340} height={4} rx={2} fill="url(#chromeGradient)" />

        {/* ============================================ */}
        {/* TOP SECTION - BUBBLE TUBES & DISPLAY */}
        {/* ============================================ */}

        {/* Glass panel background */}
        <rect
          x={40}
          y={70}
          width={320}
          height={200}
          rx={15}
          fill="url(#glassGradient)"
          stroke="#4A4A4A"
          strokeWidth={2}
        />

        {/* Left bubble tube */}
        <rect
          x={50}
          y={80}
          width={30}
          height={180}
          rx={15}
          fill="url(#tubeGradient)"
          stroke="#3A3A5A"
          strokeWidth={1}
        />
        {!minimal && isPlaying && bubbles.slice(0, 10).map((bubble) => (
          <Bubble
            key={`left-${bubble.id}`}
            tubeX={50}
            tubeWidth={30}
            tubeHeight={180}
            tubeTop={80}
            delay={bubble.delay}
            color={bubble.color}
            size={bubble.size}
          />
        ))}

        {/* Right bubble tube */}
        <rect
          x={320}
          y={80}
          width={30}
          height={180}
          rx={15}
          fill="url(#tubeGradient)"
          stroke="#3A3A5A"
          strokeWidth={1}
        />
        {!minimal && isPlaying && bubbles.slice(10, 20).map((bubble) => (
          <Bubble
            key={`right-${bubble.id}`}
            tubeX={320}
            tubeWidth={30}
            tubeHeight={180}
            tubeTop={80}
            delay={bubble.delay}
            color={bubble.color}
            size={bubble.size}
          />
        ))}

        {/* Center display area */}
        <rect
          x={90}
          y={85}
          width={220}
          height={170}
          rx={10}
          fill="#0A0A1A"
          stroke="#2A2A3A"
          strokeWidth={2}
        />

        {/* Vinyl record */}
        <VinylRecord
          cx={200}
          cy={145}
          radius={50}
          isPlaying={!minimal && isPlaying}
        />

        {/* Now playing marquee */}
        <Marquee
          x={100}
          y={215}
          width={200}
          height={30}
          text={nowPlaying}
          isPlaying={!minimal && isPlaying}
        />

        {/* ============================================ */}
        {/* MIDDLE SECTION - SELECTION BUTTONS */}
        {/* ============================================ */}

        {/* Selection panel background */}
        <rect
          x={40}
          y={285}
          width={320}
          height={70}
          rx={10}
          fill="#1A1A1A"
          stroke="#3A3A3A"
          strokeWidth={2}
        />

        {/* Chrome trim */}
        <rect x={50} y={290} width={300} height={3} rx={1} fill="url(#chromeGradient)" />
        <rect x={50} y={347} width={300} height={3} rx={1} fill="url(#chromeGradient)" />

        {/* Selection buttons grid - soundscape selectors */}
        <g role="group" aria-label="Soundscape selection">
          {SOUNDSCAPE_BUTTONS.map((btn, i) => (
            <SelectionButton
              key={btn.label}
              x={58 + (i % 5) * 58}
              y={300 + Math.floor(i / 5) * 25}
              label={btn.icon}
              name={btn.name}
              description={btn.description}
              isSelected={currentSoundscape === btn.soundscape}
              onClick={() => onSelectSoundscape?.(btn.soundscape)}
            />
          ))}
        </g>

        {/* ============================================ */}
        {/* BOTTOM SECTION - EQUALIZER & SPEAKERS */}
        {/* ============================================ */}

        {/* Equalizer panel */}
        <rect
          x={40}
          y={365}
          width={320}
          height={60}
          rx={8}
          fill="#0A0A0A"
          stroke="#2A2A2A"
          strokeWidth={2}
        />

        {/* Equalizer bars */}
        {Array.from({ length: 16 }).map((_, i) => (
          <EqualizerBar
            key={`eq-${i}`}
            x={55 + i * 18}
            baseY={415}
            width={12}
            maxHeight={40}
            index={i}
            isPlaying={isPlaying}
            analyserData={analyserData || undefined}
          />
        ))}

        {/* Left speaker */}
        <SpeakerGrille
          x={45}
          y={435}
          width={100}
          height={60}
          isPlaying={!minimal && isPlaying}
        />

        {/* Right speaker */}
        <SpeakerGrille
          x={255}
          y={435}
          width={100}
          height={60}
          isPlaying={!minimal && isPlaying}
        />

        {/* Volume knob */}
        <VolumeKnob
          cx={200}
          cy={470}
          radius={18}
          value={volume}
          onChange={onVolumeChange}
        />

        {/* Scene Toggle Button - styled as retro TV/picture button */}
        {onToggleScene && (
          <g
            onClick={onToggleScene}
            style={{ cursor: 'pointer' }}
            role="button"
            aria-label={showScene ? 'Hide animated visualization' : 'Show animated visualization'}
            aria-pressed={showScene}
            tabIndex={0}
          >
            {/* Tooltip */}
            <title>{showScene ? 'Hide Scene: Turn off animated visualization' : 'Show Scene: Display animated soundscape visualization'}</title>
            {/* First-time hint pulse - only shows when scene is off */}
            {!showScene && (
              <motion.circle
                cx={98}
                cy={458}
                r={22}
                fill="none"
                stroke="#4ECDC4"
                strokeWidth={2}
                opacity={0}
                animate={{ opacity: [0, 0.4, 0], scale: [0.8, 1.2, 0.8] }}
                transition={{ duration: 2, repeat: 3, delay: 1 }}
              />
            )}
            {/* Button base */}
            <rect
              x={80}
              y={440}
              width={36}
              height={36}
              rx={6}
              fill={showScene ? '#4ECDC4' : '#2A2A2A'}
              stroke={showScene ? '#7EDDD6' : '#4A4A4A'}
              strokeWidth={2}
            />
            {/* Button highlight */}
            <rect
              x={83}
              y={443}
              width={30}
              height={10}
              rx={3}
              fill={showScene ? '#7EDDD6' : '#3A3A3A'}
              opacity={0.5}
            />
            {/* TV/Picture icon */}
            <rect
              x={90}
              y={450}
              width={16}
              height={12}
              rx={2}
              fill="none"
              stroke={showScene ? '#1A1A1A' : '#8A8A8A'}
              strokeWidth={1.5}
            />
            {/* Screen lines */}
            <line x1={93} y1={454} x2={103} y2={454} stroke={showScene ? '#1A1A1A' : '#6A6A6A'} strokeWidth={1} />
            <line x1={93} y1={457} x2={100} y2={457} stroke={showScene ? '#1A1A1A' : '#6A6A6A'} strokeWidth={1} />
            {/* Antenna/stand */}
            <line x1={98} y1={462} x2={98} y2={466} stroke={showScene ? '#1A1A1A' : '#8A8A8A'} strokeWidth={1.5} />
            {/* Active glow */}
            {showScene && (
              <motion.rect
                x={78}
                y={438}
                width={40}
                height={40}
                rx={8}
                fill="none"
                stroke="#4ECDC4"
                strokeWidth={1}
                opacity={0.5}
                filter="url(#neonGlow)"
                animate={{ opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
            )}
            {/* Label */}
            <text
              x={98}
              y={485}
              textAnchor="middle"
              fontSize={6}
              fontFamily="sans-serif"
              fill={showScene ? '#4ECDC4' : '#6A6A6A'}
            >
              SCENE
            </text>
          </g>
        )}

        {/* Coin slot */}
        <CoinSlot x={160} y={500} />

        {/* ============================================ */}
        {/* NEON TRIM */}
        {/* ============================================ */}

        {/* Outer neon glow - animated when playing (disabled in minimal mode) */}
        <motion.rect
          x={15}
          y={15}
          width={370}
          height={530}
          rx={28}
          fill="none"
          stroke="#FF00FF"
          strokeWidth={2}
          opacity={0.5}
          filter="url(#neonGlow)"
          animate={!minimal && isPlaying ? {
            opacity: [0.35, 0.5, 0.35],
            strokeWidth: [2, 3, 2],
          } : {
            opacity: 0.2,
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />

        {/* Secondary neon accent (disabled in minimal mode) */}
        <motion.rect
          x={35}
          y={65}
          width={330}
          height={210}
          rx={18}
          fill="none"
          stroke="#00FFFF"
          strokeWidth={1}
          opacity={0.3}
          filter="url(#neonGlow)"
          animate={!minimal && isPlaying ? {
            opacity: [0.25, 0.35, 0.25],
          } : {
            opacity: 0.1,
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: 0.5,
          }}
        />

        {/* ============================================ */}
        {/* PLAY/PAUSE BUTTON OVERLAY */}
        {/* ============================================ */}

        {/* Invisible click area for play/pause */}
        <g
          role="button"
          aria-label={isPlaying ? 'Pause ambience' : 'Play ambience'}
          aria-pressed={isPlaying}
          tabIndex={0}
          onClick={onTogglePlay}
          style={{ cursor: 'pointer' }}
        >
          <title>{isPlaying ? 'Click to pause' : 'Click vinyl to play'}</title>
          <rect
            x={150}
            y={120}
            width={100}
            height={100}
            fill="transparent"
          />
        </g>

        {/* ============================================ */}
        {/* BRAND LOGO */}
        {/* ============================================ */}

        <text
          x={200}
          y={35}
          textAnchor="middle"
          fontSize={18}
          fontFamily="'Times New Roman', serif"
          fontWeight="bold"
          fontStyle="italic"
          fill="url(#frameGradient)"
          filter="url(#textGlow)"
        >
          QUARRY MUSIC
        </text>

        {/* Decorative stars */}
        <text x={100} y={35} fontSize={12} fill="#FFD700">&#9733;</text>
        <text x={290} y={35} fontSize={12} fill="#FFD700">&#9733;</text>

        {/* ============================================ */}
        {/* REFLECTIONS & HIGHLIGHTS */}
        {/* ============================================ */}

        {/* Glass reflection on top panel */}
        <ellipse
          cx={200}
          cy={100}
          rx={140}
          ry={15}
          fill="white"
          opacity={0.05}
        />

        {/* Chrome highlight on frame */}
        <rect
          x={12}
          y={12}
          width={376}
          height={80}
          rx={28}
          fill="url(#chromeGradient)"
          opacity={0.1}
        />

        {/* Bottom shadow for depth */}
        <rect
          x={20}
          y={520}
          width={360}
          height={30}
          rx={15}
          fill="black"
          opacity={0.3}
        />
      </svg>

      {/* Status indicator outside SVG */}
      <div className={cn(
        'absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-2',
        compact ? 'text-[10px]' : 'text-xs'
      )}>
        {isPlaying && (
          <motion.div
            className="flex items-center gap-1.5"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className={isDark ? 'text-zinc-400' : 'text-zinc-600'}>
              Playing
            </span>
          </motion.div>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// COMPACT JUKEBOX
// ============================================================================

export function CompactJukebox(props: Omit<RetroJukeboxProps, 'compact'>) {
  // Default to minimal mode for compact view, but allow override
  // Note: showScene and onToggleScene are passed through for jukebox scene button
  return <RetroJukebox minimal {...props} compact />
}

// ============================================================================
// MINI JUKEBOX ICON
// ============================================================================

export interface MiniJukeboxIconProps {
  isPlaying?: boolean
  size?: number
  className?: string
}

export function MiniJukeboxIcon({
  isPlaying = false,
  size = 24,
  className,
}: MiniJukeboxIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
    >
      {/* Simple jukebox silhouette */}
      <rect
        x={4}
        y={2}
        width={16}
        height={20}
        rx={3}
        fill="currentColor"
        opacity={0.8}
      />
      {/* Display window */}
      <rect
        x={6}
        y={4}
        width={12}
        height={8}
        rx={2}
        fill="currentColor"
        opacity={0.3}
      />
      {/* Record */}
      <motion.circle
        cx={12}
        cy={8}
        r={3}
        fill="currentColor"
        animate={isPlaying ? { rotate: 360 } : { rotate: 0 }}
        transition={isPlaying ? {
          duration: 4,
          repeat: Infinity,
          ease: 'linear',
        } : {}}
        style={{ transformOrigin: '12px 8px' }}
      />
      {/* Speaker grille lines */}
      <line x1={7} y1={15} x2={17} y2={15} stroke="currentColor" strokeWidth={1} opacity={0.5} />
      <line x1={7} y1={17} x2={17} y2={17} stroke="currentColor" strokeWidth={1} opacity={0.5} />
      <line x1={7} y1={19} x2={17} y2={19} stroke="currentColor" strokeWidth={1} opacity={0.5} />
    </svg>
  )
}
