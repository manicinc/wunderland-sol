/**
 * Audio Types Tests
 * @module __tests__/unit/lib/audio/types.test
 *
 * Tests for audio system type constants, enum, error class, and capability detection.
 */

import { describe, it, expect } from 'vitest'
import {
  DEFAULT_MIXER_CONFIG,
  DEFAULT_CAPTURE_OPTIONS,
  AudioErrorType,
  AudioError,
  getAudioCapabilities,
} from '@/lib/audio/types'

// ============================================================================
// DEFAULT_MIXER_CONFIG
// ============================================================================

describe('DEFAULT_MIXER_CONFIG', () => {
  it('is defined', () => {
    expect(DEFAULT_MIXER_CONFIG).toBeDefined()
  })

  it('has micGain at unity', () => {
    expect(DEFAULT_MIXER_CONFIG.micGain).toBe(1.0)
  })

  it('has systemGain slightly reduced', () => {
    expect(DEFAULT_MIXER_CONFIG.systemGain).toBe(0.8)
  })

  it('has standard output sample rate', () => {
    expect(DEFAULT_MIXER_CONFIG.outputSampleRate).toBe(48000)
  })

  it('has all required properties', () => {
    expect(DEFAULT_MIXER_CONFIG).toHaveProperty('micGain')
    expect(DEFAULT_MIXER_CONFIG).toHaveProperty('systemGain')
    expect(DEFAULT_MIXER_CONFIG).toHaveProperty('outputSampleRate')
  })

  it('gain values are in valid range', () => {
    expect(DEFAULT_MIXER_CONFIG.micGain).toBeGreaterThanOrEqual(0)
    expect(DEFAULT_MIXER_CONFIG.micGain).toBeLessThanOrEqual(2)
    expect(DEFAULT_MIXER_CONFIG.systemGain).toBeGreaterThanOrEqual(0)
    expect(DEFAULT_MIXER_CONFIG.systemGain).toBeLessThanOrEqual(2)
  })

  it('sample rate is a valid audio rate', () => {
    const validRates = [8000, 11025, 16000, 22050, 44100, 48000, 96000]
    expect(validRates).toContain(DEFAULT_MIXER_CONFIG.outputSampleRate)
  })
})

// ============================================================================
// DEFAULT_CAPTURE_OPTIONS
// ============================================================================

describe('DEFAULT_CAPTURE_OPTIONS', () => {
  it('is defined', () => {
    expect(DEFAULT_CAPTURE_OPTIONS).toBeDefined()
  })

  it('includes video by default', () => {
    expect(DEFAULT_CAPTURE_OPTIONS.includeVideo).toBe(true)
  })

  it('has audio processing options', () => {
    expect(DEFAULT_CAPTURE_OPTIONS.audio).toBeDefined()
  })

  it('disables echo cancellation', () => {
    expect(DEFAULT_CAPTURE_OPTIONS.audio?.echoCancellation).toBe(false)
  })

  it('disables noise suppression', () => {
    expect(DEFAULT_CAPTURE_OPTIONS.audio?.noiseSuppression).toBe(false)
  })

  it('disables auto gain control', () => {
    expect(DEFAULT_CAPTURE_OPTIONS.audio?.autoGainControl).toBe(false)
  })

  it('has all audio processing options defined', () => {
    expect(DEFAULT_CAPTURE_OPTIONS.audio).toHaveProperty('echoCancellation')
    expect(DEFAULT_CAPTURE_OPTIONS.audio).toHaveProperty('noiseSuppression')
    expect(DEFAULT_CAPTURE_OPTIONS.audio).toHaveProperty('autoGainControl')
  })
})

// ============================================================================
// AudioErrorType
// ============================================================================

describe('AudioErrorType', () => {
  it('has PERMISSION_DENIED', () => {
    expect(AudioErrorType.PERMISSION_DENIED).toBe('PERMISSION_DENIED')
  })

  it('has NOT_SUPPORTED', () => {
    expect(AudioErrorType.NOT_SUPPORTED).toBe('NOT_SUPPORTED')
  })

  it('has NO_AUDIO_TRACK', () => {
    expect(AudioErrorType.NO_AUDIO_TRACK).toBe('NO_AUDIO_TRACK')
  })

  it('has DEVICE_NOT_FOUND', () => {
    expect(AudioErrorType.DEVICE_NOT_FOUND).toBe('DEVICE_NOT_FOUND')
  })

  it('has DEVICE_DISCONNECTED', () => {
    expect(AudioErrorType.DEVICE_DISCONNECTED).toBe('DEVICE_DISCONNECTED')
  })

  it('has MIXER_ERROR', () => {
    expect(AudioErrorType.MIXER_ERROR).toBe('MIXER_ERROR')
  })

  it('has CAPTURE_FAILED', () => {
    expect(AudioErrorType.CAPTURE_FAILED).toBe('CAPTURE_FAILED')
  })

  it('has exactly 7 error types', () => {
    const errorTypes = Object.values(AudioErrorType)
    expect(errorTypes).toHaveLength(7)
  })

  it('all values are unique', () => {
    const errorTypes = Object.values(AudioErrorType)
    const uniqueTypes = new Set(errorTypes)
    expect(uniqueTypes.size).toBe(7)
  })
})

// ============================================================================
// AudioError
// ============================================================================

describe('AudioError', () => {
  it('extends Error', () => {
    const error = new AudioError(AudioErrorType.PERMISSION_DENIED, 'Test error')
    expect(error).toBeInstanceOf(Error)
  })

  it('has correct name', () => {
    const error = new AudioError(AudioErrorType.PERMISSION_DENIED, 'Test error')
    expect(error.name).toBe('AudioError')
  })

  it('stores type', () => {
    const error = new AudioError(AudioErrorType.DEVICE_NOT_FOUND, 'Device not found')
    expect(error.type).toBe(AudioErrorType.DEVICE_NOT_FOUND)
  })

  it('stores message', () => {
    const error = new AudioError(AudioErrorType.PERMISSION_DENIED, 'User denied permission')
    expect(error.message).toBe('User denied permission')
  })

  it('stores optional deviceId', () => {
    const error = new AudioError(
      AudioErrorType.DEVICE_DISCONNECTED,
      'Device disconnected',
      'device-123'
    )
    expect(error.deviceId).toBe('device-123')
  })

  it('deviceId is undefined by default', () => {
    const error = new AudioError(AudioErrorType.NOT_SUPPORTED, 'Not supported')
    expect(error.deviceId).toBeUndefined()
  })

  it('can be thrown and caught', () => {
    expect(() => {
      throw new AudioError(AudioErrorType.CAPTURE_FAILED, 'Capture failed')
    }).toThrow(AudioError)
  })

  it('can be caught with type check', () => {
    try {
      throw new AudioError(AudioErrorType.MIXER_ERROR, 'Mixer error')
    } catch (e) {
      if (e instanceof AudioError) {
        expect(e.type).toBe(AudioErrorType.MIXER_ERROR)
      } else {
        throw new Error('Expected AudioError')
      }
    }
  })

  describe('common error scenarios', () => {
    it('creates permission denied error', () => {
      const error = new AudioError(
        AudioErrorType.PERMISSION_DENIED,
        'Microphone permission denied'
      )
      expect(error.type).toBe(AudioErrorType.PERMISSION_DENIED)
      expect(error.message).toContain('permission')
    })

    it('creates device not found error with deviceId', () => {
      const error = new AudioError(
        AudioErrorType.DEVICE_NOT_FOUND,
        'Microphone not found',
        'mic-abc123'
      )
      expect(error.type).toBe(AudioErrorType.DEVICE_NOT_FOUND)
      expect(error.deviceId).toBe('mic-abc123')
    })

    it('creates not supported error', () => {
      const error = new AudioError(
        AudioErrorType.NOT_SUPPORTED,
        'getDisplayMedia not supported in this browser'
      )
      expect(error.type).toBe(AudioErrorType.NOT_SUPPORTED)
    })
  })
})

// ============================================================================
// getAudioCapabilities
// ============================================================================

describe('getAudioCapabilities', () => {
  it('returns an object', () => {
    const capabilities = getAudioCapabilities()
    expect(typeof capabilities).toBe('object')
  })

  it('has all required properties', () => {
    const capabilities = getAudioCapabilities()
    expect(capabilities).toHaveProperty('microphone')
    expect(capabilities).toHaveProperty('tabAudio')
    expect(capabilities).toHaveProperty('screenAudio')
    expect(capabilities).toHaveProperty('systemAudio')
    expect(capabilities).toHaveProperty('deviceEnumeration')
    expect(capabilities).toHaveProperty('isElectron')
  })

  it('all properties are booleans', () => {
    const capabilities = getAudioCapabilities()
    expect(typeof capabilities.microphone).toBe('boolean')
    expect(typeof capabilities.tabAudio).toBe('boolean')
    expect(typeof capabilities.screenAudio).toBe('boolean')
    expect(typeof capabilities.systemAudio).toBe('boolean')
    expect(typeof capabilities.deviceEnumeration).toBe('boolean')
    expect(typeof capabilities.isElectron).toBe('boolean')
  })

  it('isElectron is false in test environment', () => {
    const capabilities = getAudioCapabilities()
    expect(capabilities.isElectron).toBe(false)
  })

  it('systemAudio is false when not Electron', () => {
    const capabilities = getAudioCapabilities()
    expect(capabilities.systemAudio).toBe(false)
  })

  it('systemAudio matches isElectron', () => {
    const capabilities = getAudioCapabilities()
    // systemAudio is only true when running in Electron
    expect(capabilities.systemAudio).toBe(capabilities.isElectron)
  })
})

// ============================================================================
// Integration Tests
// ============================================================================

describe('audio types integration', () => {
  it('all AudioErrorType values can be used in AudioError', () => {
    const errorTypes = Object.values(AudioErrorType)

    errorTypes.forEach((type) => {
      const error = new AudioError(type, `Test error for ${type}`)
      expect(error.type).toBe(type)
      expect(error.name).toBe('AudioError')
    })
  })

  it('DEFAULT_MIXER_CONFIG produces good audio balance', () => {
    // Mic at unity, system slightly lower = good voice call balance
    const config = DEFAULT_MIXER_CONFIG
    expect(config.micGain).toBeGreaterThanOrEqual(config.systemGain)
  })

  it('DEFAULT_CAPTURE_OPTIONS are suitable for recording', () => {
    // For recording, we typically want raw audio without processing
    const options = DEFAULT_CAPTURE_OPTIONS
    expect(options.audio?.echoCancellation).toBe(false)
    expect(options.audio?.noiseSuppression).toBe(false)
    expect(options.audio?.autoGainControl).toBe(false)
  })
})
