/**
 * Audio Device Enumerator
 * @module lib/audio/deviceEnumerator
 *
 * @description
 * Enumerate available audio input/output devices.
 * Handles permission requests, device hot-plug events, and default detection.
 */

import type { AudioDevice } from './types'
import { AudioError, AudioErrorType } from './types'

/* ═══════════════════════════════════════════════════════════════════════════
   STATE
═══════════════════════════════════════════════════════════════════════════ */

/** Cached devices */
let cachedDevices: AudioDevice[] | null = null

/** Device change listeners */
const deviceChangeListeners = new Set<() => void>()

/** Permission state */
let hasPermission = false

/* ═══════════════════════════════════════════════════════════════════════════
   PERMISSION HANDLING
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Request microphone permission
 * This is required before device labels are accessible
 */
export async function requestMicrophonePermission(): Promise<boolean> {
  if (hasPermission) return true

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    // Stop tracks immediately - we just needed permission
    stream.getTracks().forEach(track => track.stop())
    hasPermission = true
    // Clear cache to get proper labels
    cachedDevices = null
    return true
  } catch (error) {
    if (error instanceof DOMException) {
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        throw new AudioError(
          AudioErrorType.PERMISSION_DENIED,
          'Microphone permission denied'
        )
      }
      if (error.name === 'NotFoundError') {
        throw new AudioError(
          AudioErrorType.DEVICE_NOT_FOUND,
          'No microphone found'
        )
      }
    }
    throw error
  }
}

/**
 * Check if we have microphone permission (without prompting)
 */
export async function checkMicrophonePermission(): Promise<boolean> {
  if (hasPermission) return true

  try {
    const result = await navigator.permissions.query({
      name: 'microphone' as PermissionName
    })
    hasPermission = result.state === 'granted'
    return hasPermission
  } catch {
    // permissions.query not supported, we'll find out when we enumerate
    return false
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   DEVICE ENUMERATION
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Enumerate all audio devices
 * Returns both inputs (microphones) and outputs (speakers)
 */
export async function enumerateAudioDevices(
  forceRefresh = false
): Promise<AudioDevice[]> {
  if (cachedDevices && !forceRefresh) {
    return cachedDevices
  }

  if (!navigator.mediaDevices?.enumerateDevices) {
    throw new AudioError(
      AudioErrorType.NOT_SUPPORTED,
      'Device enumeration not supported'
    )
  }

  const devices = await navigator.mediaDevices.enumerateDevices()

  cachedDevices = devices
    .filter(d => d.kind === 'audioinput' || d.kind === 'audiooutput')
    .map((device, index) => ({
      deviceId: device.deviceId,
      label: device.label || `${device.kind === 'audioinput' ? 'Microphone' : 'Speaker'} ${index + 1}`,
      kind: device.kind as 'audioinput' | 'audiooutput',
      isDefault: device.deviceId === 'default' ||
        device.label.toLowerCase().includes('default'),
      groupId: device.groupId,
    }))

  return cachedDevices
}

/**
 * Enumerate microphones only
 */
export async function enumerateMicrophones(
  forceRefresh = false
): Promise<AudioDevice[]> {
  const devices = await enumerateAudioDevices(forceRefresh)
  return devices.filter(d => d.kind === 'audioinput')
}

/**
 * Enumerate speakers/outputs only
 */
export async function enumerateSpeakers(
  forceRefresh = false
): Promise<AudioDevice[]> {
  const devices = await enumerateAudioDevices(forceRefresh)
  return devices.filter(d => d.kind === 'audiooutput')
}

/**
 * Get the default microphone
 */
export async function getDefaultMicrophone(): Promise<AudioDevice | null> {
  const microphones = await enumerateMicrophones()

  // Try to find the explicit default
  const defaultMic = microphones.find(m => m.isDefault)
  if (defaultMic) return defaultMic

  // Otherwise return the first one
  return microphones[0] || null
}

/**
 * Get a specific device by ID
 */
export async function getDeviceById(
  deviceId: string
): Promise<AudioDevice | null> {
  const devices = await enumerateAudioDevices()
  return devices.find(d => d.deviceId === deviceId) || null
}

/**
 * Check if a device is still available
 */
export async function isDeviceAvailable(deviceId: string): Promise<boolean> {
  const devices = await enumerateAudioDevices(true)
  return devices.some(d => d.deviceId === deviceId)
}

/* ═══════════════════════════════════════════════════════════════════════════
   DEVICE CHANGE DETECTION
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Subscribe to device change events
 * Returns an unsubscribe function
 */
export function onDeviceChange(callback: () => void): () => void {
  deviceChangeListeners.add(callback)

  // Setup native listener if first subscriber
  if (deviceChangeListeners.size === 1) {
    navigator.mediaDevices?.addEventListener('devicechange', handleDeviceChange)
  }

  // Return unsubscribe function
  return () => {
    deviceChangeListeners.delete(callback)
    if (deviceChangeListeners.size === 0) {
      navigator.mediaDevices?.removeEventListener('devicechange', handleDeviceChange)
    }
  }
}

/**
 * Handle native device change event
 */
function handleDeviceChange(): void {
  // Clear cache
  cachedDevices = null

  // Notify all listeners
  deviceChangeListeners.forEach(callback => {
    try {
      callback()
    } catch (error) {
      console.error('[DeviceEnumerator] Listener error:', error)
    }
  })
}

/* ═══════════════════════════════════════════════════════════════════════════
   STREAM CREATION
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Get a microphone stream from a specific device
 */
export async function getMicrophoneStream(
  deviceId?: string,
  options?: MediaTrackConstraints
): Promise<MediaStream> {
  const constraints: MediaStreamConstraints = {
    audio: {
      deviceId: deviceId ? { exact: deviceId } : undefined,
      ...options,
    },
  }

  try {
    return await navigator.mediaDevices.getUserMedia(constraints)
  } catch (error) {
    if (error instanceof DOMException) {
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        throw new AudioError(
          AudioErrorType.PERMISSION_DENIED,
          'Microphone permission denied',
          deviceId
        )
      }
      if (error.name === 'NotFoundError' || error.name === 'OverconstrainedError') {
        throw new AudioError(
          AudioErrorType.DEVICE_NOT_FOUND,
          deviceId ? `Microphone ${deviceId} not found` : 'No microphone found',
          deviceId
        )
      }
    }
    throw error
  }
}

/**
 * Test if a specific device works
 * Creates a brief stream and immediately stops it
 */
export async function testDevice(deviceId: string): Promise<boolean> {
  try {
    const stream = await getMicrophoneStream(deviceId)
    stream.getTracks().forEach(track => track.stop())
    return true
  } catch {
    return false
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   UTILITIES
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Clear the device cache
 * Useful when you know devices have changed
 */
export function clearDeviceCache(): void {
  cachedDevices = null
}

/**
 * Get a friendly name for a device
 * Cleans up common prefixes/suffixes from device labels
 */
export function getDeviceDisplayName(device: AudioDevice): string {
  let name = device.label

  // Remove common prefixes
  name = name.replace(/^(Default - |Communications - )/, '')

  // Remove parenthetical identifiers often added by browsers
  name = name.replace(/\s*\([^)]*\)\s*$/, '')

  // Truncate if too long
  if (name.length > 40) {
    name = name.substring(0, 37) + '...'
  }

  return name || (device.kind === 'audioinput' ? 'Microphone' : 'Speaker')
}
