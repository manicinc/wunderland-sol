// File: frontend/src/components/voice-input/composables/modes/BaseSttMode.ts
/**
 * @file BaseSttMode.ts
 * @description Abstract base class for STT modes (PTT, Continuous, VAD).
 * Defines the common contract, state structure, and shared utilities for all modes.
 * Modes should extend this class to ensure consistent behavior and API.
 *
 * @version 1.5.0
 * @updated 2025-06-05
 * - Added `isExplicitlyStoppedByUser` and `setExplicitlyStoppedByUser` to SttModeContext.
 * - Ensured all `Readonly<Ref<T>>` types are correctly defined.
 */
import type { Ref, ComputedRef, ShallowRef } from 'vue'; // Vue's Readonly is a function, for types use TypeScript's Readonly<T>
import type { VoiceApplicationSettings, AudioInputMode } from '@/services/voice.settings.service';
import type { SttHandlerInstance, SttHandlerErrorPayload } from '../../types';
import type { VoiceInputSharedState } from '../shared/useVoiceInputState';
import type { AudioFeedbackInstance } from '../shared/useAudioFeedback';
import type { useTranscriptionDisplay } from '../shared/useTranscriptionDisplay';
import type { ToastService } from '@/services/services';

/**
 * @interface SttModeContext
 * @description Context object provided to STT mode constructors.
 * Contains dependencies and shared state needed by the modes to operate.
 */
export interface SttModeContext {
  /** Indicates if the Language Model is currently processing, potentially blocking STT operations. */
  isProcessingLLM: Readonly<Ref<boolean>>;
  /** Indicates if microphone permission has been granted by the user. */
  micPermissionGranted: ComputedRef<boolean>;
  /** Reactive reference to the API of the currently active STT handler (e.g., Browser or Whisper). Null if no handler is active. */
  activeHandlerApi: Readonly<ShallowRef<SttHandlerInstance | null>>; // Changed from Ref to ShallowRef
  /** Vue component emit function for the mode to send events upwards (e.g., final transcription). */
  emit: (event: string, ...args: any[]) => void;
  /**
   * @method playSound
   * @description Function to play audio feedback sounds (beeps, etc.).
   * @param {AudioBuffer | null} buffer - The audio buffer to play. Can be null if sound failed to load or is not needed.
   * @param {number} [volume] - Optional volume override for this specific sound playback (0.0 to 1.0).
   */
  playSound: (buffer: AudioBuffer | null, volume?: number) => void;
  /** Global voice application settings, reactive. */
  settings: Readonly<Ref<VoiceApplicationSettings>>;
  /** Shared reactive state object for the entire voice input module. */
  sharedState: VoiceInputSharedState;
  /** Instance for managing the display of transcriptions and feedback messages in the UI. */
  transcriptionDisplay: ReturnType<typeof useTranscriptionDisplay>;
  /** Instance for playing various audio cues and feedback sounds. */
  audioFeedback: AudioFeedbackInstance;
  /** Reactive reference to the current audio input mode selected by the user (e.g., 'push-to-talk'). */
  audioMode: Readonly<Ref<AudioInputMode>>;
  /** Optional toast notification service for displaying non-critical messages to the user. */
  toast?: ToastService;
  /**
   * @property {Readonly<Ref<boolean>>} isAwaitingVadCommandResult
   * @description Indicates if the system is currently waiting for a voice command after a wake word has been detected in VAD mode.
   */
  isAwaitingVadCommandResult: Readonly<Ref<boolean>>;
  /**
   * @method clearVadCommandTimeout
   * @description Function to manually clear any active timeout waiting for a VAD command.
   */
  clearVadCommandTimeout: () => void;
  /**
   * @property {Readonly<Ref<boolean>>} isExplicitlyStoppedByUser
   * @description Indicates if the current STT operation was explicitly stopped by a user action (e.g., clicking the mic button while active).
   * This helps differentiate between manual stops and stops due to errors or LLM processing.
   */
  isExplicitlyStoppedByUser: Readonly<Ref<boolean>>;
  /**
   * @method setExplicitlyStoppedByUser
   * @description Allows the SttManager or modes to set the `isExplicitlyStoppedByUser` flag.
   * @param {boolean} value - The new value for the flag.
   */
  setExplicitlyStoppedByUser: (value: boolean) => void;
  /**
   * @property {Function} t
   * @description i18n translation function for localized text
   * @param {string} key - Translation key
   * @param {any} params - Optional parameters for interpolation
   */
  t?: (key: string, params?: any) => string;
}

/**
 * @interface SttModePublicState
 * @description Defines the reactive state properties that each STT input mode must expose publicly.
 * This allows the SttManager and UI components to react to changes in the mode's state.
 */
export interface SttModePublicState {
  /** ComputedRef<boolean>: True if the mode is currently active (e.g., listening, processing audio for STT). */
  isActive: ComputedRef<boolean>;
  /** ComputedRef<boolean>: True if the mode can currently be started (e.g., permissions granted, not already active, LLM not busy). */
  canStart: ComputedRef<boolean>;
  /** ComputedRef<string>: User-facing status text describing the current state or action of the mode (e.g., "Listening...", "Say wake word..."). */
  statusText: ComputedRef<string>;
  /** ComputedRef<string>: Placeholder text for the main text input field, relevant to the current mode and its state. */
  placeholderText: ComputedRef<string>;
}

/**
 * @abstract
 * @class BaseSttMode
 * @implements {SttModePublicState}
 * @description Abstract base class for all STT (Speech-to-Text) input modes.
 * It provides a common structure, defines a shared contract (methods and properties),
 * and ensures that all concrete mode implementations (like Push-to-Talk, Continuous, VAD)
 * adhere to a consistent API for interaction with the SttManager.
 */
export abstract class BaseSttMode implements SttModePublicState {
  /** Context object containing dependencies, shared state, and utility functions. Available to all derived modes. */
  protected readonly context: SttModeContext;

  // --- Implementing SttModePublicState ---
  /** {@inheritDoc SttModePublicState.isActive} */
  public abstract readonly isActive: ComputedRef<boolean>;
  /** {@inheritDoc SttModePublicState.canStart} */
  public abstract readonly canStart: ComputedRef<boolean>;
  /** {@inheritDoc SttModePublicState.statusText} */
  public abstract readonly statusText: ComputedRef<string>;
  /** {@inheritDoc SttModePublicState.placeholderText} */
  public abstract readonly placeholderText: ComputedRef<string>;

  /**
   * @property {boolean} requiresHandler
   * @description Indicates whether this STT mode requires an active STT handler (like Browser or Whisper)
   * to function. Most modes do. This must be implemented by concrete mode classes.
   * For PTT, Continuous, and VAD modes, this should be `true`.
   */
  public abstract readonly requiresHandler: boolean;

  /**
   * @constructor
   * @param {SttModeContext} context - The context object providing dependencies and shared state to the mode.
   */
  constructor(context: SttModeContext) {
    this.context = context;
  }

  /**
   * @abstract
   * @method start
   * @description Initiates the STT mode's operation (e.g., starts listening for voice input).
   * @returns {Promise<boolean>} A promise that resolves to true if the mode started successfully, false otherwise.
   */
  abstract start(): Promise<boolean>;

  /**
   * @abstract
   * @method stop
   * @description Stops the STT mode's operation (e.g., stops listening, finalizes any pending transcription).
   * @returns {Promise<void>} A promise that resolves when the mode has stopped.
   */
  abstract stop(): Promise<void>;

  /**
   * @abstract
   * @method handleTranscription
   * @description Processes a final transcription string received from the STT handler.
   * @param {string} text - The final transcribed text.
   */
  abstract handleTranscription(text: string): void;

  /**
   * @abstract
   * @method handleError
   * @description Handles an error that occurred during STT processing, either within the mode itself or propagated from an STT handler.
   * @param {Error | SttHandlerErrorPayload} error - The error object or a structured error payload from an STT handler.
   */
  abstract handleError(error: Error | SttHandlerErrorPayload): void;

  /**
   * @abstract
   * @method cleanup
   * @description Performs any necessary cleanup when the mode is being deactivated or destroyed
   * (e.g., clearing timers, releasing resources specific to the mode).
   */
  abstract cleanup(): void;

  /**
   * @protected
   * @method isBlocked
   * @description Common utility method for modes to check if they are currently blocked from starting or operating.
   * This checks general blocking conditions. Modes can add their own specific conditions.
   * @returns {boolean} True if the mode is currently blocked by common factors, false otherwise.
   */
  protected isBlocked(): boolean {
    if (this.context.isExplicitlyStoppedByUser.value) { // Check this first
        // console.debug(`[BaseSttMode] Blocked: Explicitly stopped by user.`);
        return true;
    }
    if (this.context.isProcessingLLM.value && !this.context.isAwaitingVadCommandResult.value) { // Allow if VAD is awaiting command
      // console.debug(`[BaseSttMode] Blocked: LLM is processing.`);
      return true;
    }
    if (!this.context.micPermissionGranted.value) {
      // console.debug(`[BaseSttMode] Blocked: Microphone permission not granted.`);
      return true;
    }
    if (this.requiresHandler && !this.context.activeHandlerApi.value) {
      // console.debug(`[BaseSttMode] Blocked: Active STT handler required but not available.`);
      return true;
    }
    return false;
  }

  /**
   * @protected
   * @method emitTranscription
   * @description Helper method for modes to emit a processed transcription string to the parent component.
   * @param {string} text - The transcribed text to emit.
   */
  protected emitTranscription(text: string): void {
    const trimmedText = text.trim();
    if (trimmedText) {
      // Ensure this event name matches what VoiceInput.vue expects from SttManager
      this.context.emit('transcription-ready', trimmedText);
      this.context.transcriptionDisplay.showSent(trimmedText);
    }
  }

  public handleUserDismissedTranscript(): void {
    // Optional hook for modes to respond when the user cancels transcript confirmation.
  }
}