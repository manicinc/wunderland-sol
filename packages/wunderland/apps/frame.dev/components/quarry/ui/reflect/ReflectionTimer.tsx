/**
 * ReflectionTimer - Radial dial timer for focus sessions
 * @module components/quarry/ui/ReflectionTimer
 *
 * A beautiful circular timer with radial dial preset selector.
 * Drag/spin the dial to select preset durations (5-90 minutes).
 * Features gradient progress ring and smooth animations.
 */

'use client'

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { motion, useMotionValue, useSpring } from 'framer-motion'
import { Play, Pause, RotateCcw, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ReflectionTimerProps {
  /** Default duration in minutes */
  defaultMinutes?: number
  /** Maximum duration in minutes */
  maxMinutes?: number
  /** Callback when timer completes */
  onComplete?: () => void
  /** Callback when timer starts */
  onStart?: () => void
  /** Whether the timer is in compact mode */
  compact?: boolean
  /** Theme */
  isDark?: boolean
  /** Class name */
  className?: string
}

// Preset durations in minutes
const PRESETS = [5, 10, 15, 25, 45, 60, 90]

// Calculate preset positions around the dial
interface PresetPosition {
  minutes: number
  angle: number // degrees from top (0 = top, clockwise positive)
  x: number
  y: number
  labelX: number
  labelY: number
}

function calculatePresetPositions(
  presets: number[],
  centerX: number,
  centerY: number,
  dialRadius: number,
  labelRadius: number
): PresetPosition[] {
  return presets.map((minutes, index) => {
    // Distribute evenly around the dial, starting from top
    const angle = (index * 360) / presets.length
    const radians = ((angle - 90) * Math.PI) / 180 // -90 to start from top

    return {
      minutes,
      angle,
      x: centerX + dialRadius * Math.cos(radians),
      y: centerY + dialRadius * Math.sin(radians),
      labelX: centerX + labelRadius * Math.cos(radians),
      labelY: centerY + labelRadius * Math.sin(radians),
    }
  })
}

/**
 * Format seconds to MM:SS
 */
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

/**
 * Find closest preset to given angle
 */
function findClosestPreset(angle: number, presets: PresetPosition[]): PresetPosition {
  let closest = presets[0]
  let minDiff = Infinity

  presets.forEach((preset) => {
    // Normalize both angles to 0-360
    const normalizedAngle = ((angle % 360) + 360) % 360
    const normalizedPreset = ((preset.angle % 360) + 360) % 360

    // Calculate shortest angular distance
    let diff = Math.abs(normalizedAngle - normalizedPreset)
    if (diff > 180) diff = 360 - diff

    if (diff < minDiff) {
      minDiff = diff
      closest = preset
    }
  })

  return closest
}

/**
 * ReflectionTimer with radial dial preset selector
 */
export default function ReflectionTimer({
  defaultMinutes = 5,
  maxMinutes = 90,
  onComplete,
  onStart,
  compact = false,
  isDark = false,
  className = '',
}: ReflectionTimerProps) {
  // Filter presets based on maxMinutes
  const availablePresets = useMemo(
    () => PRESETS.filter((p) => p <= maxMinutes),
    [maxMinutes]
  )

  const [duration, setDuration] = useState(defaultMinutes * 60)
  const [timeLeft, setTimeLeft] = useState(defaultMinutes * 60)
  const [isRunning, setIsRunning] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [selectedPresetIndex, setSelectedPresetIndex] = useState(
    availablePresets.findIndex((p) => p === defaultMinutes) || 0
  )

  const containerRef = useRef<HTMLDivElement>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Dial rotation (motion value for smooth animation)
  const dialRotation = useMotionValue(0)
  // Spring animation applied when setting dial position
  useSpring(dialRotation, {
    stiffness: 300,
    damping: 30,
  })

  // SVG dimensions
  const size = compact ? 160 : 240
  const center = size / 2
  const progressRadius = compact ? 50 : 75
  const dialRadius = compact ? 65 : 95
  const labelRadius = compact ? 72 : 108
  const strokeWidth = compact ? 6 : 8
  const circumference = 2 * Math.PI * progressRadius

  // Calculate preset positions
  const presetPositions = useMemo(
    () => calculatePresetPositions(availablePresets, center, center, dialRadius, labelRadius),
    [availablePresets, center, dialRadius, labelRadius]
  )

  // Progress (0 to 1)
  const progress = duration > 0 ? 1 - timeLeft / duration : 0

  // Gradient colors based on progress
  const getGradientColors = useCallback(() => {
    if (isComplete) return { start: '#22c55e', end: '#10b981' }
    if (progress < 0.5) return { start: '#0ea5e9', end: '#06b6d4' }
    if (progress < 0.8) return { start: '#f59e0b', end: '#f97316' }
    return { start: '#ef4444', end: '#f43f5e' }
  }, [isComplete, progress])

  const gradientColors = getGradientColors()

  // Timer cleanup
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  // Timer logic
  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsRunning(false)
            setIsComplete(true)
            onComplete?.()
            try {
              audioRef.current = new Audio('/sounds/chime.mp3')
              audioRef.current.volume = 0.5
              audioRef.current.play().catch(() => {})
            } catch { /* Audio playback not critical */ }
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isRunning, timeLeft, onComplete])

  // Dial interaction handlers
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (isRunning) return
      e.currentTarget.setPointerCapture(e.pointerId)
      setIsDragging(true)
    },
    [isRunning]
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging || isRunning || !containerRef.current) return

      const rect = containerRef.current.getBoundingClientRect()
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2

      // Calculate angle from center to pointer
      const dx = e.clientX - centerX
      const dy = e.clientY - centerY
      let angle = Math.atan2(dy, dx) * (180 / Math.PI)
      angle = (angle + 90 + 360) % 360 // Normalize to 0 = top

      // Find closest preset and update
      const closest = findClosestPreset(angle, presetPositions)
      const presetIndex = availablePresets.indexOf(closest.minutes)

      if (presetIndex !== selectedPresetIndex) {
        setSelectedPresetIndex(presetIndex)
        const newDuration = closest.minutes * 60
        setDuration(newDuration)
        setTimeLeft(newDuration)
        setIsComplete(false)

        // Animate dial rotation to snap to preset
        dialRotation.set(closest.angle)
      }
    },
    [isDragging, isRunning, presetPositions, selectedPresetIndex, dialRotation, availablePresets]
  )

  const handlePointerUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  // Select preset directly
  const selectPreset = useCallback(
    (minutes: number, index: number) => {
      if (isRunning) return
      setSelectedPresetIndex(index)
      const newDuration = minutes * 60
      setDuration(newDuration)
      setTimeLeft(newDuration)
      setIsComplete(false)
      dialRotation.set(presetPositions[index].angle)
    },
    [isRunning, presetPositions, dialRotation]
  )

  // Controls
  const toggleTimer = useCallback(() => {
    if (!isRunning && timeLeft === 0) {
      setTimeLeft(duration)
      setIsComplete(false)
    }
    if (!isRunning) onStart?.()
    setIsRunning(!isRunning)
  }, [isRunning, timeLeft, duration, onStart])

  const resetTimer = useCallback(() => {
    setIsRunning(false)
    setTimeLeft(duration)
    setIsComplete(false)
  }, [duration])

  // Sync dial rotation to selected preset on mount and when preset changes
  useEffect(() => {
    if (presetPositions[selectedPresetIndex]) {
      dialRotation.set(presetPositions[selectedPresetIndex].angle)
    }
  }, [dialRotation, presetPositions, selectedPresetIndex])

  return (
    <div className={cn('flex flex-col items-center', className)}>
      {/* Timer with Dial */}
      <div
        ref={containerRef}
        className={cn(
          'relative touch-none select-none',
          !isRunning && 'cursor-grab',
          isDragging && 'cursor-grabbing'
        )}
        style={{ width: size, height: size }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="absolute inset-0"
        >
          <defs>
            <linearGradient id="timer-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={gradientColors.start} />
              <stop offset="100%" stopColor={gradientColors.end} />
            </linearGradient>
            <filter id="timer-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="dial-shadow" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="1" stdDeviation="2" floodOpacity="0.3" />
            </filter>
          </defs>

          {/* Outer dial ring (track) */}
          <circle
            cx={center}
            cy={center}
            r={dialRadius}
            fill="none"
            stroke={isDark ? '#27272a' : '#e4e4e7'}
            strokeWidth={2}
            strokeDasharray="4 8"
            opacity={0.5}
          />

          {/* Preset markers around the dial */}
          {presetPositions.map((preset, index) => {
            const isSelected = index === selectedPresetIndex
            const tickLength = isSelected ? 12 : 8
            const radians = ((preset.angle - 90) * Math.PI) / 180
            const innerR = dialRadius - tickLength
            const outerR = dialRadius

            return (
              <g key={preset.minutes}>
                {/* Tick mark */}
                <line
                  x1={center + innerR * Math.cos(radians)}
                  y1={center + innerR * Math.sin(radians)}
                  x2={center + outerR * Math.cos(radians)}
                  y2={center + outerR * Math.sin(radians)}
                  stroke={
                    isSelected
                      ? gradientColors.start
                      : isDark
                      ? '#52525b'
                      : '#a1a1aa'
                  }
                  strokeWidth={isSelected ? 3 : 2}
                  strokeLinecap="round"
                />
                {/* Label */}
                <text
                  x={preset.labelX}
                  y={preset.labelY}
                  textAnchor="middle"
                  dominantBaseline="central"
                  className={cn(
                    'text-[10px] font-medium select-none pointer-events-none',
                    isSelected
                      ? 'fill-current'
                      : isDark
                      ? 'fill-zinc-500'
                      : 'fill-zinc-400'
                  )}
                  style={{
                    fill: isSelected ? gradientColors.start : undefined,
                  }}
                >
                  {preset.minutes}
                </text>
              </g>
            )
          })}

          {/* Selection indicator (knob on dial) */}
          <motion.circle
            cx={
              center +
              (dialRadius - 4) *
                Math.cos(((presetPositions[selectedPresetIndex]?.angle || 0) - 90) * Math.PI / 180)
            }
            cy={
              center +
              (dialRadius - 4) *
                Math.sin(((presetPositions[selectedPresetIndex]?.angle || 0) - 90) * Math.PI / 180)
            }
            r={compact ? 6 : 8}
            fill={gradientColors.start}
            filter="url(#dial-shadow)"
            className="transition-all duration-200"
          />

          {/* Background ring for progress */}
          <circle
            cx={center}
            cy={center}
            r={progressRadius}
            fill="none"
            stroke={isDark ? '#27272a' : '#e4e4e7'}
            strokeWidth={strokeWidth}
          />

          {/* Progress arc */}
          <motion.circle
            cx={center}
            cy={center}
            r={progressRadius}
            fill="none"
            stroke="url(#timer-gradient)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - progress)}
            transform={`rotate(-90 ${center} ${center})`}
            filter={isRunning ? 'url(#timer-glow)' : undefined}
            initial={false}
            animate={{ strokeDashoffset: circumference * (1 - progress) }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </svg>

        {/* Center Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          {/* Time Display */}
          <motion.div
            key={timeLeft}
            initial={{ scale: 1.05, opacity: 0.8 }}
            animate={{ scale: 1, opacity: 1 }}
            className={cn(
              'font-mono font-bold tabular-nums',
              compact ? 'text-2xl' : 'text-4xl',
              isDark ? 'text-zinc-100' : 'text-zinc-900',
              isComplete && 'text-green-500'
            )}
          >
            {formatTime(timeLeft)}
          </motion.div>

          {/* Duration indicator */}
          {!isRunning && (
            <div
              className={cn(
                'text-xs mt-1',
                isDark ? 'text-zinc-400' : 'text-zinc-500'
              )}
            >
              {Math.floor(duration / 60)} min
            </div>
          )}

          {/* Status */}
          {isRunning && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={cn(
                'text-[10px] uppercase tracking-wide font-medium mt-1',
                isDark ? 'text-zinc-400' : 'text-zinc-500'
              )}
            >
              reflecting...
            </motion.div>
          )}

          {isComplete && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xs text-green-500 font-medium mt-1"
            >
              Complete!
            </motion.div>
          )}

          {/* Drag hint */}
          {!isRunning && !isDragging && !compact && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              transition={{ delay: 1 }}
              className={cn(
                'absolute bottom-8 text-[9px] uppercase tracking-wide',
                isDark ? 'text-zinc-500' : 'text-zinc-400'
              )}
            >
              drag to select
            </motion.div>
          )}
        </div>

        {/* Clickable preset areas (invisible hit zones) */}
        {!isRunning &&
          presetPositions.map((preset, index) => (
            <button
              key={preset.minutes}
              className="absolute w-8 h-8 rounded-full opacity-0 hover:opacity-10 hover:bg-white transition-opacity"
              style={{
                left: preset.labelX - 16,
                top: preset.labelY - 16,
              }}
              onClick={() => selectPreset(preset.minutes, index)}
              aria-label={`Set timer to ${preset.minutes} minutes`}
            />
          ))}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2 mt-4">
        <motion.button
          onClick={toggleTimer}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          title={isRunning ? 'Pause timer' : 'Start timer'}
          aria-label={isRunning ? 'Pause timer' : 'Start timer'}
          className={cn(
            'flex items-center justify-center rounded-full transition-colors',
            compact ? 'w-10 h-10' : 'w-12 h-12',
            isRunning
              ? 'bg-amber-500 hover:bg-amber-600 text-white'
              : 'bg-sky-500 hover:bg-sky-600 text-white'
          )}
        >
          {isRunning ? (
            <Pause className={compact ? 'w-4 h-4' : 'w-5 h-5'} />
          ) : (
            <Play className={cn(compact ? 'w-4 h-4' : 'w-5 h-5', 'ml-0.5')} />
          )}
        </motion.button>

        {(isRunning || timeLeft < duration) && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={resetTimer}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title="Reset timer"
            aria-label="Reset timer"
            className={cn(
              'flex items-center justify-center rounded-full transition-colors',
              compact ? 'w-8 h-8' : 'w-10 h-10',
              isDark
                ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                : 'bg-zinc-200 hover:bg-zinc-300 text-zinc-700'
            )}
          >
            <RotateCcw className={compact ? 'w-3 h-3' : 'w-4 h-4'} />
          </motion.button>
        )}
      </div>

      {/* Timer label with hint */}
      {!compact && (
        <div
          className={cn(
            'flex flex-col items-center gap-1 mt-3 text-xs',
            isDark ? 'text-zinc-500' : 'text-zinc-400'
          )}
        >
          <div className="flex items-center gap-1.5">
            <Clock className="w-3 h-3" />
            <span>Focus Timer</span>
          </div>
          {!isRunning && timeLeft === duration && (
            <span className="text-[10px] opacity-70">
              Click presets or drag dial to set time
            </span>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Compact timer for sidebar/inline use
 */
export function CompactReflectionTimer(props: Omit<ReflectionTimerProps, 'compact'>) {
  return <ReflectionTimer {...props} compact />
}
