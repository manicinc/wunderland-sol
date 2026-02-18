// File: frontend/src/components/voice-input/types.ts
/**
 * @file types.ts
 * @description Defines shared TypeScript interfaces and types for the VoiceInput module.
 * @version 2.0.0
 * @updated 2025-06-04 - Aligned SttEngineOption with SttEngineType.
 * Ensured TranscriptionData is the standard for transcription events.
 * Clarified MicPermissionStatusType.
 * Removed SttHandlerType as SttEngineType (from voice.settings.service) should be the standard.
 */

import type { Ref, ComputedRef } from 'vue';
// AudioInputMode is imported from voice.settings.service to ensure it's the single source of truth.
import type { AudioInputMode, STTPreference as SttEngineType } from '@/services/voice.settings.service';
export type { SttEngineType }; // Re-export for convenience

/**
 * @interface SttHandlerInstance
 * @description Defines the API contract that STT handler components (BrowserSpeechHandler, WhisperSpeechHandler) must expose.
 * This interface ensures that the SttManager can interact with any STT handler in a standardized way.
 */
export interface SttHandlerInstance {
  /**
   * @property {Ref<boolean>} isActive
   * @description Reactive state indicating if the STT handler is currently active (e.g., listening, processing audio).
   * This does not include time spent waiting for a wake word.
   */
  isActive: Readonly<Ref<boolean>>;

  /**
   * @property {Ref<boolean>} isListeningForWakeWord
   * @description Reactive state indicating if the STT handler is specifically in a wake-word detection mode.
   * Relevant for VAD (Voice Activity Detection) modes.
   */
  isListeningForWakeWord: Readonly<Ref<boolean>>;

  /**
   * @property {ComputedRef<boolean>} hasPendingTranscript
   * @description Reactive computed property indicating if there's a non-empty pending or interim transcript.
   */
  hasPendingTranscript: ComputedRef<boolean>;

  /**
   * @property {Ref<string>} pendingTranscript
   * @description Reactive state holding the current interim or pending transcript text.
   * This is often updated rapidly during speech before a final transcription is settled.
   */
  pendingTranscript: Readonly<Ref<string>>;

  /**
   * @method startListening
   * @description Initiates the STT process.
   * For VAD modes, this might mean starting to listen for a wake word, or if `forVadCommandCapture` is true,
   * it transitions to listening for a command after a wake word has been detected.
   * For PTT or Continuous modes, it starts capturing and processing audio immediately.
   * @param {boolean} [forVadCommandCapture=false] - If true and in VAD mode, signifies that a wake word was detected
   * and the handler should now listen for the actual command.
   * @returns {Promise<boolean>} True if listening started successfully, false otherwise.
   */
  startListening: (forVadCommandCapture?: boolean) => Promise<boolean>;

  /**
   * @method stopListening
   * @description Stops the STT process.
   * This could be due to user action (e.g., releasing PTT, clicking stop) or an internal timeout.
   * @param {boolean} [abort=false] - If true, try to abort any ongoing recognition immediately without finalizing the current speech.
   * If false, allow the handler to attempt to finalize the current utterance.
   * @returns {Promise<void>}
   */
  stopListening: (abort?: boolean) => Promise<void>;

  /**
   * @method reinitialize
   * @description Reinitializes the STT handler. This might be necessary after certain errors,
   * configuration changes (like language), or to reset its internal state.
   * It should stop any current activity before reinitializing.
   * @returns {Promise<void>}
   */
  reinitialize: () => Promise<void>;

  /**
   * @method stopAll
   * @description Immediately stops all STT activity, including any pending operations or restarts.
   * This is a more forceful stop than `stopListening`.
   * @param {boolean} [abort=true] - If true (default), aborts ongoing recognition immediately.
   * @returns {Promise<void>}
   */
  stopAll: (abort?: boolean) => Promise<void>;

  /**
   * @method clearPendingTranscript
   * @description Clears any current interim or pending transcript text held by the handler.
   */
  clearPendingTranscript: () => void;
}

/**
 * @type VoiceInputMode
 * @description Alias for AudioInputMode, representing the different ways voice input can be captured.
 * Examples: 'push-to-talk', 'continuous', 'voice-activation'.
 */
export type VoiceInputMode = AudioInputMode;

/**
 * @type MicPermissionStatusType
 * @description Defines the possible states for microphone permission, crucial for UI feedback and functionality.
 * - `''`: Initial state, permission status is unknown.
 * - `'prompt'`: Permission prompt is active, or the browser will show a prompt on the next request.
 * - `'granted'`: User has granted permission to use the microphone.
 * - `'denied'`: User has explicitly denied microphone access. UI should guide to browser settings.
 * - `'error'`: An error occurred while trying to ascertain permission or access the microphone.
 */
export type MicPermissionStatusType =
  | ''
  | 'prompt'
  | 'granted'
  | 'denied'
  | 'error';

/**
 * @interface AudioModeOption
 * @description Represents a selectable option in the audio mode UI (e.g., dropdown).
 */
export interface AudioModeOption {
  /** The user-facing label for the audio mode (e.g., "Push to Talk"). */
  label: string;
  /** The internal value corresponding to the audio mode. */
  value: VoiceInputMode;
  /** Optional: Path or name of an icon to display next to the mode. */
  icon?: string;
  /** Optional: A brief explanation of the mode, potentially shown as a tooltip. */
  description?: string;
}

/**
 * @interface SttEngineOption
 * @description Represents an option for STT engine selection in the UI.
 * Aligns with `STTPreference` from `voice.settings.service.ts`.
 */
export interface SttEngineOption {
  /** The user-facing label for the STT engine (e.g., "Browser STT", "Whisper API"). */
  label: string;
  /** The internal value identifying the STT engine. */
  value: SttEngineType; // Uses the SttEngineType (STTPreference)
  /** Optional: A brief description of the engine or its characteristics. */
  description?: string;
}

/**
 * @interface TranscriptionData
 * @description Standardized payload for transcription events emitted by STT Handlers.
 * This structure ensures consistency regardless of the underlying STT engine.
 */
export interface TranscriptionData {
  /** The transcribed text content. */
  text: string;
  /** Indicates if this transcription is the final result for an utterance or a segment. */
  isFinal: boolean;
  /** Optional: Confidence score of the transcription, typically ranging from 0.0 to 1.0. Not all engines provide this. */
  confidence?: number;
  /** Optional: Timestamp (e.g., `Date.now()`) when the transcription was generated or received. */
  timestamp?: number;
  /** Optional: Duration of the audio segment that resulted in this transcription, in milliseconds. */
  durationMs?: number;
  /** Optional: The language detected or used for this transcription (BCP 47 code). */
  lang?: string;
}

/**
 * @interface SttHandlerErrorPayload
 * @description Standardized payload for error events emitted by STT Handlers.
 * This allows for consistent error handling and reporting.
 */
export interface SttHandlerErrorPayload {
  /**
   * @property {'permission' | 'network' | 'api' | 'recognition' | 'recorder' | 'init' | 'unknown'} type
   * @description A categorized type for the error, aiding in targeted error handling.
   * - `permission`: Issues related to microphone access.
   * - `network`: Network connectivity problems affecting API calls.
   * - `api`: Errors returned by the STT service API (e.g., Whisper API).
   * - `recognition`: Errors from the speech recognition engine itself (e.g., no speech detected, audio too long).
   * - `recorder`: Issues with the `MediaRecorder` or audio capture.
   * - `init`: Errors during the initialization of the handler.
   * - `unknown`: Uncategorized errors.
   */
  type: 'permission' | 'network' | 'api' | 'recognition' | 'recorder' | 'init' | 'unknown' | string; // Allow custom types
  /** A human-readable error message describing the issue. */
  message: string;
  /** An optional error code, often from the underlying STT engine or a system error code. */
  code?: string;
  /**
   * @property {boolean} [fatal=false]
   * @description If true, indicates that the error is critical and the STT handler might be in an unusable state,
   * potentially requiring reinitialization or user intervention.
   */
  fatal?: boolean;
}