/**
 * Audio Module
 * @module lib/audio
 *
 * @description
 * Audio capture, mixing, and device enumeration utilities.
 * Supports both Web API and Electron native audio capture.
 */

// Types
export type {
  AudioSourceType,
  AudioCaptureMode,
  AudioSource,
  AudioDevice,
  DesktopAudioSource,
  MixerConfig,
  MixerSource,
  RecordingSession,
  RecordingResult,
  SystemAudioCaptureOptions,
  DesktopCaptureConstraints,
  AudioCapabilities,
  ElectronAudioAPI,
} from './types'

export {
  DEFAULT_MIXER_CONFIG,
  DEFAULT_CAPTURE_OPTIONS,
  AudioErrorType,
  AudioError,
  getAudioCapabilities,
} from './types'

// Device Enumeration
export {
  requestMicrophonePermission,
  checkMicrophonePermission,
  enumerateAudioDevices,
  enumerateMicrophones,
  enumerateSpeakers,
  getDefaultMicrophone,
  getDeviceById,
  isDeviceAvailable,
  onDeviceChange,
  clearDeviceCache,
  getMicrophoneStream,
  testDevice,
  getDeviceDisplayName,
} from './deviceEnumerator'

// System Audio Capture
export {
  captureDisplayAudio,
  getDesktopSources,
  captureDesktopAudio,
  captureSystemAudio,
  getSystemAudio,
  isSystemAudioAvailable,
  getBestAvailableSourceType,
  getAvailableCaptureDescription,
  stopStream,
  isStreamActive,
  onStreamEnded,
} from './systemAudioCapture'

// Audio Mixer
export {
  AudioMixer,
  createMixedRecordingSetup,
  createSingleSourceMixer,
} from './audioMixer'
