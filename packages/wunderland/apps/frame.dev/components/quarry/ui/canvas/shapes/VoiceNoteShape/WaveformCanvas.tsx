/**
 * Waveform Canvas - Audio waveform visualization
 * @module codex/ui/canvas/shapes/VoiceNoteShape/WaveformCanvas
 *
 * Renders an interactive waveform visualization with:
 * - Smooth bar rendering
 * - Progress overlay
 * - Click-to-seek support
 */

'use client'

import React, { useRef, useEffect, useCallback, memo } from 'react'

interface WaveformCanvasProps {
  /** Normalized waveform data (0-1 values) */
  data: number[]
  /** Current playback progress (0-100) */
  progress: number
  /** Callback when user clicks to seek */
  onSeek?: (percentage: number) => void
  /** Accent color for played portion */
  accentColor: string
  /** Background color for unplayed portion */
  backgroundColor: string
  /** Whether shape is in editing mode */
  isEditing?: boolean
}

/**
 * Canvas-based waveform visualization
 */
export const WaveformCanvas = memo(function WaveformCanvas({
  data,
  progress,
  onSeek,
  accentColor,
  backgroundColor,
  isEditing = false,
}: WaveformCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Draw waveform
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Get dimensions
    const rect = canvas.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)

    const width = rect.width
    const height = rect.height

    // Clear canvas
    ctx.clearRect(0, 0, width, height)

    // If no data, draw placeholder bars
    const waveformData = data.length > 0 ? data : generatePlaceholderWaveform(50)
    const barCount = waveformData.length
    const barWidth = width / barCount
    const barGap = Math.max(1, barWidth * 0.2)
    const effectiveBarWidth = barWidth - barGap
    const maxBarHeight = height * 0.8
    const minBarHeight = 2

    // Calculate progress position
    const progressX = (progress / 100) * width

    // Draw bars
    waveformData.forEach((value, i) => {
      const x = i * barWidth + barGap / 2
      const barHeight = Math.max(minBarHeight, value * maxBarHeight)
      const y = (height - barHeight) / 2

      // Choose color based on progress
      if (x + effectiveBarWidth < progressX) {
        // Fully played
        ctx.fillStyle = accentColor
      } else if (x < progressX) {
        // Partially played - gradient effect
        ctx.fillStyle = accentColor
      } else {
        // Not played
        ctx.fillStyle = backgroundColor
      }

      // Draw rounded bar
      const radius = Math.min(effectiveBarWidth / 2, 2)
      roundedRect(ctx, x, y, effectiveBarWidth, barHeight, radius)
      ctx.fill()
    })
  }, [data, progress, accentColor, backgroundColor])

  // Handle resize
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const resizeObserver = new ResizeObserver(() => {
      // Trigger redraw by updating canvas size
      const canvas = canvasRef.current
      if (canvas) {
        canvas.style.width = '100%'
        canvas.style.height = '100%'
      }
    })

    resizeObserver.observe(container)
    return () => resizeObserver.disconnect()
  }, [])

  // Handle click to seek
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!onSeek || !isEditing) return

      const canvas = canvasRef.current
      if (!canvas) return

      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const percentage = (x / rect.width) * 100
      onSeek(Math.max(0, Math.min(100, percentage)))
    },
    [onSeek, isEditing]
  )

  // Handle mouse move for hover effect
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isEditing) return

      const canvas = canvasRef.current
      if (canvas) {
        canvas.style.cursor = 'pointer'
      }
    },
    [isEditing]
  )

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative"
      style={{ minHeight: 40 }}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        style={{
          cursor: isEditing ? 'pointer' : 'default',
        }}
      />

      {/* Progress indicator line */}
      <div
        className="absolute top-0 bottom-0 w-0.5 pointer-events-none"
        style={{
          left: `${progress}%`,
          backgroundColor: accentColor,
          boxShadow: `0 0 4px ${accentColor}`,
          opacity: progress > 0 ? 1 : 0,
          transition: 'left 0.1s linear',
        }}
      />
    </div>
  )
})

/**
 * Draw a rounded rectangle
 */
function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.lineTo(x + width - radius, y)
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius)
  ctx.lineTo(x + width, y + height - radius)
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
  ctx.lineTo(x + radius, y + height)
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius)
  ctx.lineTo(x, y + radius)
  ctx.quadraticCurveTo(x, y, x + radius, y)
  ctx.closePath()
}

/**
 * Generate placeholder waveform for empty state
 */
function generatePlaceholderWaveform(count: number): number[] {
  const waveform: number[] = []
  for (let i = 0; i < count; i++) {
    // Create a smooth wave pattern
    const t = i / count
    const value = 0.3 + 0.2 * Math.sin(t * Math.PI * 4) + 0.1 * Math.sin(t * Math.PI * 8)
    waveform.push(value)
  }
  return waveform
}

/**
 * Generate waveform data from audio buffer
 */
export async function generateWaveformFromAudio(
  audioBlob: Blob,
  samples = 100
): Promise<number[]> {
  try {
    const audioContext = new AudioContext()
    const arrayBuffer = await audioBlob.arrayBuffer()
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
    const channelData = audioBuffer.getChannelData(0)

    const blockSize = Math.floor(channelData.length / samples)
    const waveform: number[] = []

    for (let i = 0; i < samples; i++) {
      const start = i * blockSize
      let sum = 0
      for (let j = 0; j < blockSize; j++) {
        sum += Math.abs(channelData[start + j])
      }
      waveform.push(sum / blockSize)
    }

    // Normalize to 0-1
    const max = Math.max(...waveform)
    if (max > 0) {
      return waveform.map((v) => v / max)
    }
    return waveform
  } catch (error) {
    console.error('Failed to generate waveform:', error)
    return generatePlaceholderWaveform(samples)
  }
}
