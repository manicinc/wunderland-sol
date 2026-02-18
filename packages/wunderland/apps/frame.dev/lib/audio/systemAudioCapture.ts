/**
 * System Audio Capture
 * @module lib/audio/systemAudioCapture
 *
 * @description
 * Capture system/tab/screen audio using Web API (getDisplayMedia)
 * and Electron (desktopCapturer) with automatic fallback.
 */

import type {
  AudioSourceType,
  DesktopAudioSource,
  SystemAudioCaptureOptions,
} from './types'
import {
  AudioError,
  AudioErrorType,
  DEFAULT_CAPTURE_OPTIONS,
  getAudioCapabilities,
} from './types'

/* ═══════════════════════════════════════════════════════════════════════════
   WEB API CAPTURE (getDisplayMedia)
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Capture tab/screen audio using Web API
 * Note: Requires user to select a tab/screen with audio
 */
export async function captureDisplayAudio(
  options: SystemAudioCaptureOptions = DEFAULT_CAPTURE_OPTIONS
): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getDisplayMedia) {
    throw new AudioError(
      AudioErrorType.NOT_SUPPORTED,
      'getDisplayMedia not supported in this browser'
    )
  }

  try {
    // Request display media with audio
    // Video is required by the API but we'll discard it
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: options.includeVideo ?? true,
      audio: options.audio ?? {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
    })

    // Check if we got an audio track
    const audioTracks = stream.getAudioTracks()
    if (audioTracks.length === 0) {
      // Stop video track if any
      stream.getVideoTracks().forEach(track => track.stop())
      throw new AudioError(
        AudioErrorType.NO_AUDIO_TRACK,
        'No audio track in screen share. Make sure to check "Share audio" when selecting a tab.'
      )
    }

    // Stop video track - we only need audio
    stream.getVideoTracks().forEach(track => track.stop())

    // Return audio-only stream
    return new MediaStream(audioTracks)
  } catch (error) {
    if (error instanceof AudioError) throw error

    if (error instanceof DOMException) {
      if (error.name === 'NotAllowedError') {
        throw new AudioError(
          AudioErrorType.PERMISSION_DENIED,
          'Screen share permission denied'
        )
      }
      if (error.name === 'AbortError') {
        throw new AudioError(
          AudioErrorType.PERMISSION_DENIED,
          'Screen share cancelled by user'
        )
      }
    }

    throw new AudioError(
      AudioErrorType.CAPTURE_FAILED,
      `Failed to capture display audio: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   ELECTRON CAPTURE (desktopCapturer)
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Get available desktop capture sources (Electron only)
 */
export async function getDesktopSources(): Promise<DesktopAudioSource[]> {
  if (!window.electronAudio?.getSources) {
    return []
  }

  try {
    return await window.electronAudio.getSources()
  } catch (error) {
    console.error('[SystemAudioCapture] Failed to get desktop sources:', error)
    return []
  }
}

/**
 * Capture system audio from a desktop source (Electron only)
 */
export async function captureDesktopAudio(
  sourceId: string
): Promise<MediaStream> {
  if (!window.electronAudio?.getCaptureConstraints) {
    throw new AudioError(
      AudioErrorType.NOT_SUPPORTED,
      'Desktop capture not available - not running in Electron'
    )
  }

  try {
    // Get constraints from Electron main process
    const constraints = await window.electronAudio.getCaptureConstraints(sourceId)

    // Use navigator.mediaDevices.getUserMedia with desktop constraints
    // This is how Electron's desktopCapturer works in the renderer
    const stream = await navigator.mediaDevices.getUserMedia(constraints as MediaStreamConstraints)

    // Extract audio track
    const audioTracks = stream.getAudioTracks()
    if (audioTracks.length === 0) {
      stream.getVideoTracks().forEach(track => track.stop())
      throw new AudioError(
        AudioErrorType.NO_AUDIO_TRACK,
        'No audio track from desktop source'
      )
    }

    // Stop video track
    stream.getVideoTracks().forEach(track => track.stop())

    return new MediaStream(audioTracks)
  } catch (error) {
    if (error instanceof AudioError) throw error

    throw new AudioError(
      AudioErrorType.CAPTURE_FAILED,
      `Failed to capture desktop audio: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

/**
 * Capture the entire system audio (Electron only, uses first screen source)
 */
export async function captureSystemAudio(): Promise<MediaStream> {
  const sources = await getDesktopSources()

  // Find a screen source (not a window)
  const screenSource = sources.find(s =>
    s.name.toLowerCase().includes('screen') ||
    s.name.toLowerCase().includes('entire screen') ||
    s.name.toLowerCase().includes('display')
  )

  if (!screenSource) {
    throw new AudioError(
      AudioErrorType.NOT_SUPPORTED,
      'No screen capture source found'
    )
  }

  return captureDesktopAudio(screenSource.id)
}

/* ═══════════════════════════════════════════════════════════════════════════
   UNIFIED API
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Get system audio using the best available method
 * Tries Electron native first, then falls back to Web API
 */
export async function getSystemAudio(
  type: 'tab' | 'screen' | 'system' = 'tab'
): Promise<MediaStream> {
  const capabilities = getAudioCapabilities()

  // For system-wide audio, must use Electron
  if (type === 'system') {
    if (!capabilities.isElectron) {
      throw new AudioError(
        AudioErrorType.NOT_SUPPORTED,
        'System-wide audio capture requires the desktop app'
      )
    }
    return captureSystemAudio()
  }

  // For tab/screen, prefer Electron if available, otherwise use Web API
  if (capabilities.isElectron) {
    try {
      return await captureSystemAudio()
    } catch {
      // Fall through to Web API
    }
  }

  // Use Web API
  if (!capabilities.tabAudio) {
    throw new AudioError(
      AudioErrorType.NOT_SUPPORTED,
      'Tab/screen audio capture not supported in this browser'
    )
  }

  return captureDisplayAudio()
}

/* ═══════════════════════════════════════════════════════════════════════════
   AVAILABILITY CHECKS
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Check if system audio capture is available
 */
export function isSystemAudioAvailable(): boolean {
  const capabilities = getAudioCapabilities()
  return capabilities.systemAudio || capabilities.tabAudio
}

/**
 * Get the best available audio source type
 */
export function getBestAvailableSourceType(): AudioSourceType | null {
  const capabilities = getAudioCapabilities()

  if (capabilities.systemAudio) return 'system'
  if (capabilities.tabAudio) return 'tab'
  if (capabilities.screenAudio) return 'screen'

  return null
}

/**
 * Get a user-friendly description of available capture methods
 */
export function getAvailableCaptureDescription(): string {
  const capabilities = getAudioCapabilities()

  if (capabilities.systemAudio) {
    return 'System-wide audio capture available (desktop app)'
  }

  if (capabilities.tabAudio) {
    return 'Tab audio capture available (select a browser tab to record)'
  }

  if (capabilities.screenAudio) {
    return 'Screen audio capture available (may require selecting a specific window)'
  }

  return 'System audio capture not available in this browser'
}

/* ═══════════════════════════════════════════════════════════════════════════
   STREAM UTILITIES
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Stop all tracks in a stream
 */
export function stopStream(stream: MediaStream): void {
  stream.getTracks().forEach(track => track.stop())
}

/**
 * Check if a stream is still active
 */
export function isStreamActive(stream: MediaStream): boolean {
  return stream.getTracks().some(track => track.readyState === 'live')
}

/**
 * Listen for stream ending
 */
export function onStreamEnded(
  stream: MediaStream,
  callback: () => void
): () => void {
  const handleEnded = () => {
    if (!isStreamActive(stream)) {
      callback()
    }
  }

  // Listen to all tracks
  stream.getTracks().forEach(track => {
    track.addEventListener('ended', handleEnded)
  })

  // Return cleanup function
  return () => {
    stream.getTracks().forEach(track => {
      track.removeEventListener('ended', handleEnded)
    })
  }
}
