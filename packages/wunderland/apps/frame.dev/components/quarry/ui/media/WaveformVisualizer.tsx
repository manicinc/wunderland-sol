/**
 * Waveform Visualizer
 * @module components/quarry/ui/WaveformVisualizer
 *
 * Animated audio visualizer using Web Audio API AnalyserNode.
 * Displays frequency bars that respond to ambient soundscape audio.
 */

'use client'

import React, { useEffect, useRef, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { useReducedMotion } from '@/lib/hooks/useReducedMotion'

// ============================================================================
// TYPES
// ============================================================================

export type VisualizerStyle = 'bars' | 'wave' | 'circle'

export interface WaveformVisualizerProps {
  /** AnalyserNode from audio source */
  analyser: AnalyserNode | null
  /** Visual style */
  style?: VisualizerStyle
  /** Width in pixels */
  width?: number
  /** Height in pixels */
  height?: number
  /** Bar color (CSS color) */
  color?: string
  /** Secondary color for gradient */
  secondaryColor?: string
  /** Background color */
  backgroundColor?: string
  /** Number of bars (for 'bars' style) */
  barCount?: number
  /** Gap between bars (for 'bars' style) */
  barGap?: number
  /** Whether audio is playing */
  isPlaying?: boolean
  /** Dark mode */
  isDark?: boolean
  /** Whether a beat was just detected - triggers pulse effect */
  beatDetected?: boolean
  /** Noise floor for normalization (0-1) */
  noiseFloor?: number
  /** Additional class names */
  className?: string
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function WaveformVisualizer({
  analyser,
  style = 'bars',
  width = 200,
  height = 40,
  color,
  secondaryColor,
  backgroundColor,
  barCount = 32,
  barGap = 2,
  isPlaying = false,
  isDark = true,
  beatDetected = false,
  noiseFloor = 0,
  className,
}: WaveformVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number | null>(null)
  const { prefersReducedMotion } = useReducedMotion()

  // Default colors based on theme
  const primaryColor = color || (isDark ? '#A855F7' : '#9333EA')
  const gradientColor = secondaryColor || (isDark ? '#EC4899' : '#DB2777')
  const bgColor = backgroundColor || (isDark ? 'rgba(39, 39, 42, 0.5)' : 'rgba(244, 244, 245, 0.5)')

  // Beat pulse multiplier - 15% boost when beat detected (disabled for reduced motion)
  const beatMultiplier = (beatDetected && !prefersReducedMotion) ? 1.15 : 1.0

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear canvas
    ctx.fillStyle = bgColor
    ctx.fillRect(0, 0, width, height)

    if (!analyser || !isPlaying) {
      // Draw idle state - small static bars
      const idleBarCount = barCount
      const barWidth = (width - (idleBarCount - 1) * barGap) / idleBarCount

      ctx.fillStyle = isDark ? 'rgba(113, 113, 122, 0.3)' : 'rgba(161, 161, 170, 0.3)'

      for (let i = 0; i < idleBarCount; i++) {
        const x = i * (barWidth + barGap)
        const barHeight = 2 + Math.random() * 4
        const y = (height - barHeight) / 2
        ctx.fillRect(x, y, barWidth, barHeight)
      }

      animationRef.current = requestAnimationFrame(draw)
      return
    }

    // Get frequency data
    const bufferLength = analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)
    analyser.getByteFrequencyData(dataArray)

    if (style === 'bars') {
      drawBars(ctx, dataArray, bufferLength)
    } else if (style === 'wave') {
      drawWave(ctx, dataArray, bufferLength)
    } else if (style === 'circle') {
      drawCircle(ctx, dataArray, bufferLength)
    }

    animationRef.current = requestAnimationFrame(draw)
  }, [analyser, isPlaying, style, width, height, barCount, barGap, bgColor, isDark, primaryColor, gradientColor, beatDetected, beatMultiplier, noiseFloor])

  const drawBars = useCallback((
    ctx: CanvasRenderingContext2D,
    dataArray: Uint8Array,
    bufferLength: number
  ) => {
    const barWidth = (width - (barCount - 1) * barGap) / barCount
    const step = Math.floor(bufferLength / barCount)

    // Apply beat glow effect (disabled for reduced motion)
    if (beatDetected && !prefersReducedMotion) {
      ctx.shadowColor = primaryColor
      ctx.shadowBlur = 8
    } else {
      ctx.shadowBlur = 0
    }

    // Create gradient
    const gradient = ctx.createLinearGradient(0, 0, width, 0)
    gradient.addColorStop(0, primaryColor)
    gradient.addColorStop(1, gradientColor)
    ctx.fillStyle = gradient

    // Noise floor value for normalization
    const noiseFloorValue = noiseFloor * 255
    const scale = noiseFloor > 0 ? 255 / (255 - noiseFloorValue) : 1

    for (let i = 0; i < barCount; i++) {
      // Average several frequency bins for smoother visualization
      let sum = 0
      for (let j = 0; j < step; j++) {
        sum += dataArray[i * step + j]
      }
      let value = sum / step

      // Apply noise floor normalization
      if (noiseFloor > 0) {
        value = Math.max(0, value - noiseFloorValue) * scale
      }

      // Apply beat multiplier for pulse effect
      const barHeight = Math.max(2, (value / 255) * height * 0.9 * beatMultiplier)
      const x = i * (barWidth + barGap)
      const y = (height - barHeight) / 2

      // Draw bar with rounded corners
      const radius = Math.min(barWidth / 2, 2)
      ctx.beginPath()
      ctx.roundRect(x, y, barWidth, barHeight, radius)
      ctx.fill()
    }

    // Reset shadow
    ctx.shadowBlur = 0
  }, [width, height, barCount, barGap, primaryColor, gradientColor, beatDetected, beatMultiplier, noiseFloor, prefersReducedMotion])

  const drawWave = useCallback((
    ctx: CanvasRenderingContext2D,
    dataArray: Uint8Array,
    bufferLength: number
  ) => {
    const sliceWidth = width / bufferLength

    // Create gradient
    const gradient = ctx.createLinearGradient(0, 0, width, 0)
    gradient.addColorStop(0, primaryColor)
    gradient.addColorStop(1, gradientColor)

    ctx.lineWidth = 2
    ctx.strokeStyle = gradient
    ctx.beginPath()

    let x = 0
    for (let i = 0; i < bufferLength; i++) {
      const value = dataArray[i] / 255
      const y = height / 2 + (value - 0.5) * height * 0.8

      if (i === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }

      x += sliceWidth
    }

    ctx.lineTo(width, height / 2)
    ctx.stroke()

    // Add glow effect (disabled for reduced motion)
    if (!prefersReducedMotion) {
      ctx.shadowColor = primaryColor
      ctx.shadowBlur = 4
      ctx.stroke()
      ctx.shadowBlur = 0
    }
  }, [width, height, primaryColor, gradientColor, prefersReducedMotion])

  const drawCircle = useCallback((
    ctx: CanvasRenderingContext2D,
    dataArray: Uint8Array,
    bufferLength: number
  ) => {
    const centerX = width / 2
    const centerY = height / 2
    const minRadius = Math.min(width, height) * 0.15
    const maxRadius = Math.min(width, height) * 0.45

    // Create gradient
    const gradient = ctx.createRadialGradient(
      centerX, centerY, minRadius,
      centerX, centerY, maxRadius
    )
    gradient.addColorStop(0, primaryColor)
    gradient.addColorStop(1, gradientColor)

    ctx.strokeStyle = gradient
    ctx.lineWidth = 2
    ctx.beginPath()

    const step = Math.floor(bufferLength / 64)
    for (let i = 0; i < 64; i++) {
      const value = dataArray[i * step] / 255
      const radius = minRadius + value * (maxRadius - minRadius)
      const angle = (i / 64) * Math.PI * 2 - Math.PI / 2

      const x = centerX + Math.cos(angle) * radius
      const y = centerY + Math.sin(angle) * radius

      if (i === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    }

    ctx.closePath()
    ctx.stroke()

    // Add glow (disabled for reduced motion)
    if (!prefersReducedMotion) {
      ctx.shadowColor = primaryColor
      ctx.shadowBlur = 6
      ctx.stroke()
      ctx.shadowBlur = 0
    }
  }, [width, height, primaryColor, gradientColor, prefersReducedMotion])

  // Start/stop animation
  useEffect(() => {
    draw()

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [draw])

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className={cn(
        'rounded-lg',
        className
      )}
      style={{
        width: `${width}px`,
        height: `${height}px`,
      }}
    />
  )
}

// ============================================================================
// MINI VISUALIZER - Compact version for inline use
// ============================================================================

export interface MiniVisualizerProps {
  analyser: AnalyserNode | null
  isPlaying?: boolean
  isDark?: boolean
  beatDetected?: boolean
  noiseFloor?: number
  /** Primary color for bars/lines */
  color?: string
  /** Secondary color for gradient end */
  secondaryColor?: string
  className?: string
}

export function MiniVisualizer({
  analyser,
  isPlaying = false,
  isDark = true,
  beatDetected = false,
  noiseFloor = 0,
  color,
  secondaryColor,
  className,
}: MiniVisualizerProps) {
  return (
    <WaveformVisualizer
      analyser={analyser}
      isPlaying={isPlaying}
      isDark={isDark}
      beatDetected={beatDetected}
      noiseFloor={noiseFloor}
      color={color}
      secondaryColor={secondaryColor}
      width={80}
      height={24}
      barCount={12}
      barGap={2}
      className={className}
    />
  )
}
