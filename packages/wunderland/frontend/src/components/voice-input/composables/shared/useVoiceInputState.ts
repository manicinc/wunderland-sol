// File: frontend/src/components/voice-input/composables/shared/useVoiceInputState.ts
/**
 * @file useVoiceInputState.ts
 * @description Shared state management for the entire VoiceInput module.
 * Provides a central store for state that needs to be accessed across multiple composables.
 *
 * @version 1.3.0
 * @updated 2025-06-04 - Changed audioMode parameter type to ComputedRef<AudioInputMode>.
 * Ensured AudioInputMode is imported directly from voice.settings.service.ts
 * to prevent type conflicts.
 */
import { ref, computed } from 'vue';
import type { Ref, ComputedRef } from 'vue';
// Correctly import AudioInputMode from its source of truth
import type { AudioInputMode } from '@/services/voice.settings.service';

/**
 * @interface VoiceInputSharedState
 * @description Defines the structure of the shared state for the VoiceInput module.
 */
export interface VoiceInputSharedState {
  /** HTML string representing the current recording status or feedback. */
  currentRecordingStatusHtml: Ref<string>;
  /** Indicates if the main VoiceInput component is mounted. */
  isComponentMounted: Ref<boolean>;
  /** Timestamp of the last transcription emission, used for throttling or timing. */
  lastTranscriptionEmitTime: Ref<number>;
  /** Current pending or interim transcript text. */
  pendingTranscript: Ref<string>;
  /** True if an STT handler is actively processing audio (listening, recognizing). */
  isProcessingAudio: Ref<boolean>;
  /** True if in VAD mode and specifically listening for a wake word. */
  isListeningForWakeWord: Ref<boolean>;
  /** Controls the visibility of the input toolbar. */
  showInputToolbar: Ref<boolean>;
  /** The current text value in the main text input area. */
  textInput: Ref<string>;
  /**
   * @property {ComputedRef<boolean>} isInputEffectivelyDisabled
   * @description Determines if the main text input should be considered disabled due to
   * factors like continuous listening mode, microphone permission issues, or LLM processing.
   */
  isInputEffectivelyDisabled: ComputedRef<boolean>;
}

let sharedStateInstance: VoiceInputSharedState | null = null;

/**
 * @function useVoiceInputState
 * @description Provides access to the singleton shared state for the VoiceInput module.
 * If the state hasn't been initialized, it creates it.
 * @param {ComputedRef<AudioInputMode>} audioModeRef - Reactive computed reference to the current audio input mode.
 * It's a ComputedRef because it's derived from settings and not directly mutable by this state.
 * @param {Ref<boolean> | ComputedRef<boolean>} isProcessingLLMRef - Reactive reference indicating if the LLM is processing.
 * @param {Ref<string>} micPermissionStatusRef - Reactive reference to microphone permission status.
 * @returns {VoiceInputSharedState} The shared state instance.
 */
export function useVoiceInputState(
  audioModeRef: ComputedRef<AudioInputMode>, // Changed to ComputedRef
  isProcessingLLMRef: Ref<boolean> | ComputedRef<boolean>,
  micPermissionStatusRef: Ref<string>
): VoiceInputSharedState {
  if (sharedStateInstance) {
    // If the instance exists, we could potentially update its internal refs if they were
    // passed in again, but for a singleton, it's usually initialized once with stable refs.
    // For this scenario, we assume the refs provided on first call are the ones to use throughout.
    // A more robust singleton might re-evaluate dependencies if they change, but that adds complexity.
    // For now, if the refs are truly dynamic and need to update the computed's dependencies,
    // this singleton pattern might need adjustment or the computed needs to be recreated/updated.
    // However, typically, these refs (audioModeRef, isProcessingLLMRef, micPermissionStatusRef)
    // are stable refs passed from the main component setup.
    return sharedStateInstance;
  }

  const currentRecordingStatusHtml = ref<string>('');
  const isComponentMounted = ref<boolean>(false);
  const lastTranscriptionEmitTime = ref<number>(0);
  const pendingTranscript = ref<string>('');
  const isProcessingAudio = ref<boolean>(false);
  const isListeningForWakeWord = ref<boolean>(false);
  const showInputToolbar = ref<boolean>(false);
  const textInput = ref<string>('');

  const isInputEffectivelyDisabled = computed<boolean>(() => {
    return (
      isProcessingLLMRef.value ||
      (audioModeRef.value === 'continuous' && (isProcessingAudio.value || isListeningForWakeWord.value)) ||
      micPermissionStatusRef.value === 'denied' ||
      micPermissionStatusRef.value === 'error'
    );
  });

  sharedStateInstance = {
    currentRecordingStatusHtml,
    isComponentMounted,
    lastTranscriptionEmitTime,
    pendingTranscript,
    isProcessingAudio,
    isListeningForWakeWord,
    showInputToolbar,
    textInput,
    isInputEffectivelyDisabled,
  };

  return sharedStateInstance;
}

/**
 * @function resetVoiceInputState
 * @description Resets the singleton shared state instance to null.
 * Call this when the VoiceInput component is unmounted.
 */
export function resetVoiceInputState(): void {
  sharedStateInstance = null;
  console.log('[useVoiceInputState] Shared state has been reset.');
}
