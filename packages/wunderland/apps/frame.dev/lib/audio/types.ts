/**
 * Audio System Type Definitions
 * @module lib/audio/types
 *
 * @description
 * Shared types for system audio capture, device enumeration, and mixing.
 * Supports both Web API (getDisplayMedia) and Electron (desktopCapturer).
 */

/* ═══════════════════════════════════════════════════════════════════════════
   SOURCE TYPES
═══════════════════════════════════════════════════════════════════════════ */

/** Audio source types */
export type AudioSourceType = 'microphone' | 'tab' | 'screen' | 'system'

/** Audio capture mode for UI */
export type AudioCaptureMode = 'mic' | 'mic+tab' | 'mic+screen' | 'mic+system'

/** Audio source configuration */
export interface AudioSource {
  /** Source type */
  type: AudioSourceType
  /** Device ID for microphone selection */
  deviceId?: string
  /** Active media stream */
  stream?: MediaStream
  /** Human-readable label */
  label: string
  /** Whether this source is available */
  available: boolean
  /** Reason if unavailable */
  unavailableReason?: string
}

/* ═══════════════════════════════════════════════════════════════════════════
   DEVICE TYPES
═══════════════════════════════════════════════════════════════════════════ */

/** Audio device info from enumerateDevices */
export interface AudioDevice {
  /** Unique device identifier */
  deviceId: string
  /** Human-readable device name */
  label: string
  /** Device type */
  kind: 'audioinput' | 'audiooutput'
  /** Whether this is the system default */
  isDefault: boolean
  /** Group ID for paired devices */
  groupId?: string
}

/** Desktop capturer source (Electron) */
export interface DesktopAudioSource {
  /** Source ID for capture constraints */
  id: string
  /** Source name (window/app title) */
  name: string
  /** Base64 thumbnail image */
  thumbnail?: string
  /** Base64 app icon */
  appIcon?: string
}

/* ═══════════════════════════════════════════════════════════════════════════
   MIXER TYPES
═══════════════════════════════════════════════════════════════════════════ */

/** Audio mixer configuration */
export interface MixerConfig {
  /** Microphone gain (0-2, 1 = unity) */
  micGain: number
  /** System audio gain (0-2, 1 = unity) */
  systemGain: number
  /** Output sample rate in Hz */
  outputSampleRate: number
}

/** Default mixer configuration */
export const DEFAULT_MIXER_CONFIG: MixerConfig = {
  micGain: 1.0,
  systemGain: 0.8,
  outputSampleRate: 48000,
}

/** Individual source in the mixer */
export interface MixerSource {
  /** Source identifier */
  id: string
  /** Source type */
  type: AudioSourceType
  /** Current gain level */
  gain: number
  /** Whether source is muted */
  muted: boolean
  /** Current audio level (0-1) for VU meter */
  level: number
}

/* ═══════════════════════════════════════════════════════════════════════════
   RECORDING TYPES
═══════════════════════════════════════════════════════════════════════════ */

/** Recording session state */
export interface RecordingSession {
  /** Unique session ID */
  id: string
  /** Session start time */
  startTime: Date
  /** Active audio sources */
  sources: AudioSourceType[]
  /** Recording duration in seconds */
  duration: number
  /** Whether currently recording */
  isRecording: boolean
  /** Whether paused */
  isPaused: boolean
  /** Recording title (for meetings) */
  title?: string
}

/** Recording result */
export interface RecordingResult {
  /** Audio blob */
  blob: Blob
  /** Object URL for playback */
  url: string
  /** Duration in seconds */
  duration: number
  /** Recording timestamp */
  timestamp: Date
  /** Transcript if available */
  transcript?: string
  /** Sources used */
  sources: AudioSourceType[]
}

/* ═══════════════════════════════════════════════════════════════════════════
   CAPTURE TYPES
═══════════════════════════════════════════════════════════════════════════ */

/** Options for system audio capture */
export interface SystemAudioCaptureOptions {
  /** Include video track (required by some browsers, will be discarded) */
  includeVideo?: boolean
  /** Audio processing options */
  audio?: {
    echoCancellation?: boolean
    noiseSuppression?: boolean
    autoGainControl?: boolean
  }
}

/** Default capture options */
export const DEFAULT_CAPTURE_OPTIONS: SystemAudioCaptureOptions = {
  includeVideo: true,
  audio: {
    echoCancellation: false,
    noiseSuppression: false,
    autoGainControl: false,
  },
}

/** Capture constraints for Electron desktopCapturer */
export interface DesktopCaptureConstraints {
  audio: {
    mandatory: {
      chromeMediaSource: 'desktop'
      chromeMediaSourceId: string
    }
  }
  video: {
    mandatory: {
      chromeMediaSource: 'desktop'
      chromeMediaSourceId: string
    }
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   CAPABILITY TYPES
═══════════════════════════════════════════════════════════════════════════ */

/** Platform audio capabilities */
export interface AudioCapabilities {
  /** Microphone capture available */
  microphone: boolean
  /** Tab audio capture (getDisplayMedia with audio) */
  tabAudio: boolean
  /** Screen audio capture */
  screenAudio: boolean
  /** System-wide audio (Electron only) */
  systemAudio: boolean
  /** Device enumeration available */
  deviceEnumeration: boolean
  /** Running in Electron */
  isElectron: boolean
}

/** Check current platform capabilities */
export function getAudioCapabilities(): AudioCapabilities {
  const isElectron = typeof window !== 'undefined' &&
    !!(window as unknown as { electronAudio?: unknown }).electronAudio

  const hasGetUserMedia = typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia

  const hasGetDisplayMedia = typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices?.getDisplayMedia

  const hasEnumerateDevices = typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices?.enumerateDevices

  return {
    microphone: hasGetUserMedia,
    tabAudio: hasGetDisplayMedia,
    screenAudio: hasGetDisplayMedia,
    systemAudio: isElectron,
    deviceEnumeration: hasEnumerateDevices,
    isElectron,
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   ERROR TYPES
═══════════════════════════════════════════════════════════════════════════ */

/** Audio capture error types */
export enum AudioErrorType {
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  NOT_SUPPORTED = 'NOT_SUPPORTED',
  NO_AUDIO_TRACK = 'NO_AUDIO_TRACK',
  DEVICE_NOT_FOUND = 'DEVICE_NOT_FOUND',
  DEVICE_DISCONNECTED = 'DEVICE_DISCONNECTED',
  MIXER_ERROR = 'MIXER_ERROR',
  CAPTURE_FAILED = 'CAPTURE_FAILED',
}

/** Custom error class for audio operations */
export class AudioError extends Error {
  constructor(
    public type: AudioErrorType,
    message: string,
    public deviceId?: string
  ) {
    super(message)
    this.name = 'AudioError'
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   ELECTRON IPC TYPES
═══════════════════════════════════════════════════════════════════════════ */

/** Electron audio API exposed via preload */
export interface ElectronAudioAPI {
  /** Get available desktop capture sources */
  getSources: () => Promise<DesktopAudioSource[]>
  /** Get capture constraints for a source */
  getCaptureConstraints: (sourceId: string) => Promise<DesktopCaptureConstraints>
  /** Check if Electron audio is available */
  isAvailable: () => boolean
}

/** Augment window with electron audio API */
declare global {
  interface Window {
    electronAudio?: ElectronAudioAPI
  }
}
