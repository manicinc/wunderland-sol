/**
 * Microphone Audio React Hook
 * @module lib/audio/useMicrophoneAudio
 *
 * React hook for microphone audio visualization with calibration and beat detection.
 */

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  getMicrophoneAudioService,
  MicrophoneAudioService,
  type MicrophoneStatus,
  type MicrophoneAudioState,
} from './microphoneAudio'

export interface UseMicrophoneAudioOptions {
  /** Auto-start calibration after permission granted */
  autoCalibrate?: boolean
  /** Callback when calibration completes */
  onCalibrationComplete?: (noiseFloor: number) => void
  /** Callback when permission is denied */
  onPermissionDenied?: () => void
}

export interface UseMicrophoneAudioReturn {
  // State
  status: MicrophoneStatus
  isCalibrated: boolean
  noiseFloor: number
  isActive: boolean
  errorMessage?: string
  isSupported: boolean
  calibrationProgress: number

  // Actions
  requestPermission: () => Promise<boolean>
  startCalibration: () => Promise<void>
  recalibrate: () => Promise<void>
  start: () => Promise<void>
  stop: () => void

  // Audio data
  getAnalyser: () => AnalyserNode | null
  getFrequencyData: () => Uint8Array<ArrayBuffer> | null
  getNormalizedData: () => Uint8Array<ArrayBuffer> | null
  getFrequencyBands: () => { bass: number; mid: number; high: number }

  // Beat detection
  beatDetected: boolean
  beatSensitivity: number
  setBeatSensitivity: (value: number) => void
}

/**
 * React hook for microphone audio input with visualization support
 */
export function useMicrophoneAudio(
  options: UseMicrophoneAudioOptions = {}
): UseMicrophoneAudioReturn {
  const { autoCalibrate = true, onCalibrationComplete, onPermissionDenied } = options

  const serviceRef = useRef<MicrophoneAudioService | null>(null)
  const animationFrameRef = useRef<number | null>(null)

  // State
  const [status, setStatus] = useState<MicrophoneStatus>('idle')
  const [isCalibrated, setIsCalibrated] = useState(false)
  const [noiseFloor, setNoiseFloor] = useState(0)
  const [errorMessage, setErrorMessage] = useState<string | undefined>()
  const [calibrationProgress, setCalibrationProgress] = useState(0)
  const [beatDetected, setBeatDetected] = useState(false)
  const [beatSensitivity, setBeatSensitivityState] = useState(0.5)

  // Initialize service
  useEffect(() => {
    serviceRef.current = getMicrophoneAudioService()

    // Sync initial state
    const state = serviceRef.current.getState()
    setStatus(state.status)
    setIsCalibrated(state.isCalibrated)
    setNoiseFloor(state.noiseFloor)
    setErrorMessage(state.errorMessage)
    setBeatSensitivityState(serviceRef.current.getBeatSensitivity())

    // Subscribe to state changes
    serviceRef.current.setOnStateChange((newState: MicrophoneAudioState) => {
      setStatus(newState.status)
      setIsCalibrated(newState.isCalibrated)
      setNoiseFloor(newState.noiseFloor)
      setErrorMessage(newState.errorMessage)

      if (newState.status === 'denied' && onPermissionDenied) {
        onPermissionDenied()
      }
    })

    return () => {
      // Don't stop the service on unmount - it might be used elsewhere
      // Just clear the callback
      serviceRef.current?.setOnStateChange(() => {})
    }
  }, [onPermissionDenied])

  // Beat detection loop
  useEffect(() => {
    if (status !== 'active') {
      setBeatDetected(false)
      return
    }

    let lastBeatTime = 0

    const detectBeats = () => {
      if (serviceRef.current?.detectBeat()) {
        setBeatDetected(true)
        lastBeatTime = Date.now()
      } else if (Date.now() - lastBeatTime > 50) {
        // Reset beat after 50ms
        setBeatDetected(false)
      }

      animationFrameRef.current = requestAnimationFrame(detectBeats)
    }

    animationFrameRef.current = requestAnimationFrame(detectBeats)

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [status])

  // Request permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!serviceRef.current) return false

    const granted = await serviceRef.current.requestPermission()

    if (granted && autoCalibrate && !serviceRef.current.isCalibrated) {
      // Auto-start calibration
      await startCalibrationInternal()
    }

    return granted
  }, [autoCalibrate])

  // Internal calibration with progress tracking
  const startCalibrationInternal = useCallback(async () => {
    if (!serviceRef.current) return

    setCalibrationProgress(0)

    // Animate progress during calibration
    const duration = 3000
    const startTime = Date.now()

    const updateProgress = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      setCalibrationProgress(progress)

      if (progress < 1) {
        requestAnimationFrame(updateProgress)
      }
    }
    requestAnimationFrame(updateProgress)

    const noiseFloorResult = await serviceRef.current.startCalibration()

    setCalibrationProgress(1)
    onCalibrationComplete?.(noiseFloorResult)
  }, [onCalibrationComplete])

  // Public calibration method
  const startCalibration = useCallback(async () => {
    if (!serviceRef.current) return

    if (serviceRef.current.status !== 'active') {
      const granted = await serviceRef.current.requestPermission()
      if (!granted) return
    }

    await startCalibrationInternal()
  }, [startCalibrationInternal])

  // Recalibrate (clear and redo)
  const recalibrate = useCallback(async () => {
    if (!serviceRef.current) return

    serviceRef.current.clearCalibration()
    await startCalibration()
  }, [startCalibration])

  // Start mic (request + calibrate if needed)
  const start = useCallback(async () => {
    if (!serviceRef.current) return

    if (serviceRef.current.status !== 'active') {
      await requestPermission()
    }
  }, [requestPermission])

  // Stop mic
  const stop = useCallback(() => {
    serviceRef.current?.stop()
    setBeatDetected(false)
  }, [])

  // Set beat sensitivity
  const setBeatSensitivity = useCallback((value: number) => {
    serviceRef.current?.setBeatSensitivity(value)
    setBeatSensitivityState(value)
  }, [])

  // Get analyser
  const getAnalyser = useCallback((): AnalyserNode | null => {
    return serviceRef.current?.getAnalyser() ?? null
  }, [])

  // Get raw frequency data
  const getFrequencyData = useCallback((): Uint8Array<ArrayBuffer> | null => {
    return serviceRef.current?.getFrequencyData() ?? null
  }, [])

  // Get normalized frequency data
  const getNormalizedData = useCallback((): Uint8Array<ArrayBuffer> | null => {
    return serviceRef.current?.getNormalizedFrequencyData() ?? null
  }, [])

  // Get frequency bands
  const getFrequencyBands = useCallback(() => {
    return serviceRef.current?.getFrequencyBands() ?? { bass: 0, mid: 0, high: 0 }
  }, [])

  return {
    // State
    status,
    isCalibrated,
    noiseFloor,
    isActive: status === 'active',
    errorMessage,
    isSupported: MicrophoneAudioService.isSupported(),
    calibrationProgress,

    // Actions
    requestPermission,
    startCalibration,
    recalibrate,
    start,
    stop,

    // Audio data
    getAnalyser,
    getFrequencyData,
    getNormalizedData,
    getFrequencyBands,

    // Beat detection
    beatDetected,
    beatSensitivity,
    setBeatSensitivity,
  }
}

export default useMicrophoneAudio
