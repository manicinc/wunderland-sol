/**
 * useAudioReactivity Hook
 * @module components/quarry/ui/soundscapes/hooks/useAudioReactivity
 *
 * React hook for processing Web Audio API AnalyserNode data into
 * usable values for audio-reactive animations.
 */

'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { AudioReactiveData, DEFAULT_AUDIO_DATA, smoothValue } from '../types'

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * FFT size for frequency analysis (must be power of 2)
 * Higher = more frequency detail, lower = better performance
 */
const FFT_SIZE = 256

/**
 * Smoothing factor for value transitions (0-1)
 * Higher = smoother but more delayed
 */
const SMOOTHING_FACTOR = 0.15

/**
 * Minimum amplitude threshold to prevent noise
 */
const AMPLITUDE_THRESHOLD = 0.01

// ============================================================================
// HOOK OPTIONS
// ============================================================================

export interface UseAudioReactivityOptions {
  /** Enable/disable the hook */
  enabled?: boolean
  /** Custom smoothing factor (0-1) */
  smoothing?: number
  /** Update rate in ms (default 16ms = ~60fps) */
  updateRate?: number
  /** Bass frequency range as percentage (0-1) */
  bassRange?: [number, number]
  /** Mid frequency range as percentage (0-1) */
  midRange?: [number, number]
  /** High frequency range as percentage (0-1) */
  highRange?: [number, number]
}

const DEFAULT_OPTIONS: Required<UseAudioReactivityOptions> = {
  enabled: true,
  smoothing: SMOOTHING_FACTOR,
  updateRate: 16,
  bassRange: [0, 0.1],
  midRange: [0.1, 0.5],
  highRange: [0.5, 1.0],
}

// ============================================================================
// HOOK RETURN TYPE
// ============================================================================

export interface UseAudioReactivityReturn extends AudioReactiveData {
  /** Whether the hook is currently processing audio */
  isProcessing: boolean
  /** Get normalized frequency value at specific index */
  getFrequencyAt: (normalizedIndex: number) => number
  /** Get average of a frequency range */
  getFrequencyRange: (start: number, end: number) => number
  /** Reset to default values */
  reset: () => void
}

// ============================================================================
// MAIN HOOK
// ============================================================================

/**
 * Hook for processing audio analyser data into reactive animation values
 *
 * @param analyser - Web Audio API AnalyserNode
 * @param isPlaying - Whether audio is currently playing
 * @param options - Configuration options
 * @returns AudioReactiveData with processed frequency bands
 *
 * @example
 * ```tsx
 * const { amplitude, bass, mid, high } = useAudioReactivity(analyserNode, isPlaying)
 *
 * // Use in animations
 * <circle r={10 + bass * 20} />
 * ```
 */
export function useAudioReactivity(
  analyser: AnalyserNode | null,
  isPlaying: boolean,
  options: UseAudioReactivityOptions = {}
): UseAudioReactivityReturn {
  const opts = { ...DEFAULT_OPTIONS, ...options }

  // State for processed audio data
  const [audioData, setAudioData] = useState<AudioReactiveData>(DEFAULT_AUDIO_DATA)
  const [isProcessing, setIsProcessing] = useState(false)

  // Refs for animation frame and smoothed values
  const rafRef = useRef<number | null>(null)
  const smoothedRef = useRef<AudioReactiveData>(DEFAULT_AUDIO_DATA)
  const frequencyDataRef = useRef<Uint8Array<ArrayBuffer> | null>(null)
  const lastUpdateRef = useRef<number>(0)

  /**
   * Calculate average of frequency data in a range
   */
  const calculateBandAverage = useCallback((
    data: Uint8Array,
    startPercent: number,
    endPercent: number
  ): number => {
    const start = Math.floor(data.length * startPercent)
    const end = Math.floor(data.length * endPercent)
    if (start >= end) return 0

    let sum = 0
    for (let i = start; i < end; i++) {
      sum += data[i]
    }
    // Normalize to 0-1 (data values are 0-255)
    return (sum / (end - start)) / 255
  }, [])

  /**
   * Process analyser data and update state
   */
  const processAudio = useCallback(() => {
    if (!analyser || !isPlaying || !opts.enabled) {
      // Smoothly fade to zero when not playing
      smoothedRef.current = {
        amplitude: smoothValue(smoothedRef.current.amplitude, 0, opts.smoothing),
        bass: smoothValue(smoothedRef.current.bass, 0, opts.smoothing),
        mid: smoothValue(smoothedRef.current.mid, 0, opts.smoothing),
        high: smoothValue(smoothedRef.current.high, 0, opts.smoothing),
        frequencyData: null,
      }

      // Only update state if values have changed significantly
      if (smoothedRef.current.amplitude > AMPLITUDE_THRESHOLD) {
        setAudioData({ ...smoothedRef.current })
      } else if (audioData.amplitude > 0) {
        setAudioData(DEFAULT_AUDIO_DATA)
      }
      return
    }

    // Get frequency data
    const bufferLength = analyser.frequencyBinCount
    if (!frequencyDataRef.current || frequencyDataRef.current.length !== bufferLength) {
      frequencyDataRef.current = new Uint8Array(bufferLength)
    }
    analyser.getByteFrequencyData(frequencyDataRef.current)

    // Calculate band averages
    const rawBass = calculateBandAverage(
      frequencyDataRef.current,
      opts.bassRange[0],
      opts.bassRange[1]
    )
    const rawMid = calculateBandAverage(
      frequencyDataRef.current,
      opts.midRange[0],
      opts.midRange[1]
    )
    const rawHigh = calculateBandAverage(
      frequencyDataRef.current,
      opts.highRange[0],
      opts.highRange[1]
    )

    // Calculate overall amplitude (weighted average)
    const rawAmplitude = rawBass * 0.4 + rawMid * 0.4 + rawHigh * 0.2

    // Apply smoothing
    smoothedRef.current = {
      amplitude: smoothValue(smoothedRef.current.amplitude, rawAmplitude, opts.smoothing),
      bass: smoothValue(smoothedRef.current.bass, rawBass, opts.smoothing),
      mid: smoothValue(smoothedRef.current.mid, rawMid, opts.smoothing),
      high: smoothValue(smoothedRef.current.high, rawHigh, opts.smoothing),
      frequencyData: frequencyDataRef.current,
    }

    // Update state
    setAudioData({ ...smoothedRef.current })
  }, [analyser, isPlaying, opts, calculateBandAverage, audioData.amplitude])

  /**
   * Animation loop
   */
  useEffect(() => {
    if (!opts.enabled) {
      setIsProcessing(false)
      return
    }

    let running = true
    setIsProcessing(true)

    const animate = (timestamp: number) => {
      if (!running) return

      // Throttle updates based on updateRate
      if (timestamp - lastUpdateRef.current >= opts.updateRate) {
        processAudio()
        lastUpdateRef.current = timestamp
      }

      rafRef.current = requestAnimationFrame(animate)
    }

    rafRef.current = requestAnimationFrame(animate)

    return () => {
      running = false
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
      setIsProcessing(false)
    }
  }, [opts.enabled, opts.updateRate, processAudio])

  /**
   * Get normalized frequency value at specific index
   */
  const getFrequencyAt = useCallback((normalizedIndex: number): number => {
    if (!frequencyDataRef.current) return 0
    const index = Math.floor(normalizedIndex * frequencyDataRef.current.length)
    return (frequencyDataRef.current[index] || 0) / 255
  }, [])

  /**
   * Get average of a frequency range
   */
  const getFrequencyRange = useCallback((start: number, end: number): number => {
    if (!frequencyDataRef.current) return 0
    return calculateBandAverage(frequencyDataRef.current, start, end)
  }, [calculateBandAverage])

  /**
   * Reset to default values
   */
  const reset = useCallback(() => {
    smoothedRef.current = DEFAULT_AUDIO_DATA
    setAudioData(DEFAULT_AUDIO_DATA)
  }, [])

  return {
    ...audioData,
    isProcessing,
    getFrequencyAt,
    getFrequencyRange,
    reset,
  }
}

// ============================================================================
// UTILITY HOOKS
// ============================================================================

/**
 * Simplified hook that just returns basic amplitude
 */
export function useSimpleAmplitude(
  analyser: AnalyserNode | null,
  isPlaying: boolean
): number {
  const { amplitude } = useAudioReactivity(analyser, isPlaying, {
    smoothing: 0.2,
    updateRate: 32,
  })
  return amplitude
}

/**
 * Hook for beat detection
 */
export function useBeatDetection(
  analyser: AnalyserNode | null,
  isPlaying: boolean,
  threshold: number = 0.6
): boolean {
  const [isBeat, setIsBeat] = useState(false)
  const lastBassRef = useRef(0)
  const cooldownRef = useRef(false)

  const { bass } = useAudioReactivity(analyser, isPlaying, {
    smoothing: 0.05, // Less smoothing for beat detection
    updateRate: 16,
  })

  useEffect(() => {
    // Detect beat as sudden bass increase
    const delta = bass - lastBassRef.current
    lastBassRef.current = bass

    if (delta > threshold && bass > 0.3 && !cooldownRef.current) {
      setIsBeat(true)
      cooldownRef.current = true

      // Cooldown to prevent rapid fire
      setTimeout(() => {
        cooldownRef.current = false
      }, 100)

      // Reset beat state
      setTimeout(() => {
        setIsBeat(false)
      }, 50)
    }
  }, [bass, threshold])

  return isBeat
}

/**
 * Hook for creating audio-reactive style values
 */
export function useAudioStyles(
  analyser: AnalyserNode | null,
  isPlaying: boolean,
  styles: {
    property: string
    min: number | string
    max: number | string
    band?: 'amplitude' | 'bass' | 'mid' | 'high'
    unit?: string
  }[]
): Record<string, string> {
  const audioData = useAudioReactivity(analyser, isPlaying)

  const result: Record<string, string> = {}

  for (const style of styles) {
    const band = style.band || 'amplitude'
    const value = audioData[band]
    const unit = style.unit || ''

    if (typeof style.min === 'number' && typeof style.max === 'number') {
      const interpolated = style.min + (style.max - style.min) * value
      result[style.property] = `${interpolated}${unit}`
    } else {
      // For non-numeric values, threshold at 0.5
      result[style.property] = value > 0.5 ? String(style.max) : String(style.min)
    }
  }

  return result
}

export default useAudioReactivity
