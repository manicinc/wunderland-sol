// File: frontend/src/components/voice-input/handlers/BrowserSpeechHandler.vue
<template>
  <!-- This component does not render any DOM elements itself. -->
  <!-- Its purpose is to manage the browser's SpeechRecognition API -->
  <!-- and communicate with its parent via events and the exposed API. -->
</template>

<script setup lang="ts">
/**
 * @file BrowserSpeechHandler.vue
 * @module BrowserSpeechHandler
 * @description Implements an STT (Speech-to-Text) handler using the browser's native
 * Web Speech API (SpeechRecognition). It supports various audio input modes like
 * Push-to-Talk, Continuous listening, and Voice Activity Detection (VAD) for wake words.
 * This component conforms to the SttHandlerInstance interface for integration with SttManager.
 *
 * @version 7.3.3
 * @updated 2025-06-05 - Fixed VAD command accumulation bug and continuous mode immediate stop issue
 */
import { ref, computed, onMounted, onBeforeUnmount, watch, readonly } from 'vue';
import type { VoiceApplicationSettings, AudioInputMode } from '@/services/voice.settings.service';
import type {
  SttHandlerInstance,
  MicPermissionStatusType,
  TranscriptionData,
  SttHandlerErrorPayload
} from '../types';
import { createScopedSttLogger } from '@/utils/debug';

// TypeScript: declare SpeechRecognition types if not present (for browser compatibility)
declare global {
  // @ts-ignore - Allow redefining existing window properties if necessary for global types
  var webkitSpeechRecognition: {
    prototype: SpeechRecognition;
    new (): SpeechRecognition;
  };
  // @ts-ignore
  var SpeechRecognition: {
    prototype: SpeechRecognition;
    new (): SpeechRecognition;
  };

  interface SpeechRecognition extends EventTarget {
    grammars: SpeechGrammarList;
    lang: string;
    continuous: boolean;
    interimResults: boolean;
    maxAlternatives: number;
    serviceURI?: string;

    start(): void;
    stop(): void;
    abort(): void;

    onaudiostart: ((this: SpeechRecognition, ev: Event) => any) | null;
    onaudioend: ((this: SpeechRecognition, ev: Event) => any) | null;
    onend: ((this: SpeechRecognition, ev: Event) => any) | null;
    onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
    onnomatch: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
    onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
    onsoundstart: ((this: SpeechRecognition, ev: Event) => any) | null;
    onsoundend: ((this: SpeechRecognition, ev: Event) => any) | null;
    onspeechstart: ((this: SpeechRecognition, ev: Event) => any) | null;
    onspeechend: ((this: SpeechRecognition, ev: Event) => any) | null;
    onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  }

  interface SpeechRecognitionEvent extends Event {
    readonly resultIndex: number;
    readonly results: SpeechRecognitionResultList;
    readonly emma?: Document | null;
    readonly interpretation?: any;
  }

  interface SpeechRecognitionResultList {
    readonly length: number;
    item(index: number): SpeechRecognitionResult;
    [index: number]: SpeechRecognitionResult;
  }

  interface SpeechRecognitionResult {
    readonly length: number;
    readonly isFinal: boolean;
    item(index: number): SpeechRecognitionAlternative;
    [index: number]: SpeechRecognitionAlternative;
  }

  interface SpeechRecognitionAlternative {
    readonly transcript: string;
    readonly confidence: number;
  }

  interface SpeechRecognitionErrorEvent extends Event {
    readonly error: string; // e.g., 'no-speech', 'audio-capture', 'not-allowed'
    readonly message: string;
  }

  // Minimal SpeechGrammarList for completeness
  interface SpeechGrammarList {
    readonly length: number;
    item(index: number): SpeechGrammar;
    addFromString(string: string, weight?: number): void;
    addFromURI(src: string, weight?: number): void;
  }

  interface SpeechGrammar {
    src: string;
    weight: number;
  }
}

interface BrowserSpeechHandlerProps {
  settings: VoiceApplicationSettings;
  audioInputMode: AudioInputMode;
  parentIsProcessingLLM: boolean;
  currentMicPermission: MicPermissionStatusType;
  isExplicitlyStoppedByModeManager: boolean;
}

const props = defineProps<BrowserSpeechHandlerProps>();

const debugLog = createScopedSttLogger('BSH');

const emit = defineEmits<{
  (e: 'handler-ready', handlerId: 'browser', api: SttHandlerInstance): void;
  (e: 'handler-unmounted', handlerId: 'browser'): void;
  (e: 'transcription', data: TranscriptionData): void;
  (e: 'processing-audio', isProcessing: boolean): void;
  (e: 'listening-for-wake-word', isListening: boolean): void;
  (e: 'error', payload: SttHandlerErrorPayload): void;
  (e: 'wake-word-detected'): void;
  (e: 'ptt-audio-ready', data: { transcript: string; duration: number; blob?: Blob }): void;
}>();

const recognizer = ref<SpeechRecognition | null>(null);
const isRecognizerAPISupported = ref(true);
const _isRecognizerActiveInternal = ref(false);

type ListeningMode = 'idle' | 'vad-wake' | 'vad-command' | 'main';
const currentListeningMode = ref<ListeningMode>('idle');

// Public reactive state exposed via the API
const isActive = ref(false);
const isListeningForWakeWord = ref(false);
const pendingTranscript = ref('');
const hasPendingTranscriptInternal = computed(() => !!pendingTranscript.value.trim());

// Internal state variables
let recognizerStartTimeMs = 0;
let accumulatedTranscriptForPtt = '';
let pttFinalTranscriptForEmit = ''; // Store final transcript for emit on stop
let pttLastInterimTranscript = ''; // Track last interim transcript
let pttLastTranscriptTime = 0; // Track when we last received a transcript
let pttSilenceTimer: number | null = null; // Timer to detect silence
let pttDebounceTimer: number | null = null; // Debounce timer for PTT updates
let lastKnownVadCommandTranscript = ''; // FIXED: Track the last known full transcript

// Continuous mode silence detection variables
let continuousModeAccumulatedTranscript = '';
let continuousModeSilenceTimer: number | null = null;
let continuousModeLastTranscriptTime = 0;
let continuousModeLastInterimTranscript = '';
let continuousModeIsRestarting = false; // Flag to prevent conflicting restarts
let vadCommandPauseTimerId: number | null = null;
let vadCommandMaxDurationTimerId: number | null = null;
let autoRestartTimerId: number | null = null;
let continuousModeStartDelayTimer: number | null = null; // NEW: Delay timer for continuous mode
let isTransitioningStates = false;
let consecutiveErrorCount = 0;
let lastErrorTimestamp = 0;
let speechDetectedInVadCommandPhase = false;
// PTT mode tracking
let pttRecordingStartTime = 0;
let pttHasReceivedAudio = false;

const wakeWordDetectionBuffer: Array<{ text: string; timestamp: number }> = [];

// Configuration constants
const RESTART_DELAY_MS = 250;
const CONTINUOUS_MODE_START_DELAY_MS = 300; // NEW: Delay before starting continuous mode
const WARM_UP_PERIOD_MS = 300;
const MIN_TRANSCRIPT_LENGTH_FOR_EMIT = 1;
const WAKE_WORD_BUFFER_MAX_AGE_MS = 2500;
const MAX_CONSECUTIVE_ERRORS_ALLOWED = 5;
const ERROR_COUNT_RESET_WINDOW_MS = 10000;
const CONTINUOUS_MODE_SILENCE_TIMEOUT_MS = 2000; // 2 seconds of silence before sending in continuous mode
const CONTINUOUS_MODE_MIN_TRANSCRIPT_LENGTH = 3; // Minimum characters for continuous mode

const SpeechRecognitionAPIConstructor = computed(() => {
    if (typeof window !== 'undefined') {
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (typeof SR === 'function') return SR;
    }
    return null;
});

function _clearAllTimers(): void {
  if (vadCommandPauseTimerId) clearTimeout(vadCommandPauseTimerId);
  vadCommandPauseTimerId = null;
  if (vadCommandMaxDurationTimerId) clearTimeout(vadCommandMaxDurationTimerId);
  vadCommandMaxDurationTimerId = null;
  if (autoRestartTimerId) clearTimeout(autoRestartTimerId);
  autoRestartTimerId = null;
  if (continuousModeStartDelayTimer) clearTimeout(continuousModeStartDelayTimer);
  continuousModeStartDelayTimer = null;
  if (pttDebounceTimer) clearTimeout(pttDebounceTimer);
  pttDebounceTimer = null;
  if (continuousModeSilenceTimer) clearTimeout(continuousModeSilenceTimer);
  continuousModeSilenceTimer = null;
}

function _resetTranscriptStates(): void {
  accumulatedTranscriptForPtt = '';
  pttFinalTranscriptForEmit = '';
  pttLastInterimTranscript = '';
  pttLastTranscriptTime = 0;
  if (pttSilenceTimer) {
    clearTimeout(pttSilenceTimer);
    pttSilenceTimer = null;
  }

  // Reset continuous mode state
  continuousModeAccumulatedTranscript = '';
  continuousModeLastTranscriptTime = 0;
  continuousModeLastInterimTranscript = '';
  continuousModeIsRestarting = false; // Clear restart flag
  if (continuousModeSilenceTimer) {
    clearTimeout(continuousModeSilenceTimer);
    continuousModeSilenceTimer = null;
  }

  lastKnownVadCommandTranscript = ''; // FIXED: Reset VAD command tracking
  pendingTranscript.value = '';
  wakeWordDetectionBuffer.length = 0;
  speechDetectedInVadCommandPhase = false;
  pttHasReceivedAudio = false;
}

function _updatePublicStates(): void {
  const newIsActiveState = currentListeningMode.value === 'main' || currentListeningMode.value === 'vad-command';
  const newIsListeningForWakeWordState = currentListeningMode.value === 'vad-wake';

  if (isActive.value !== newIsActiveState) {
    isActive.value = newIsActiveState;
    debugLog(`[BSH] Public isActive state changed to: ${newIsActiveState} (Mode: ${currentListeningMode.value})`);
    emit('processing-audio', newIsActiveState);
  }

  if (isListeningForWakeWord.value !== newIsListeningForWakeWordState) {
    isListeningForWakeWord.value = newIsListeningForWakeWordState;
    debugLog(`[BSH] Public isListeningForWakeWord state changed to: ${newIsListeningForWakeWordState}`);
    emit('listening-for-wake-word', newIsListeningForWakeWordState);
  }
}

function _isValidTranscript(text: string): boolean {
  if (!text || text.trim().length < MIN_TRANSCRIPT_LENGTH_FOR_EMIT) return false;
  const cleanedText = text.trim().toLowerCase();
  const commonNoisePatterns = ['[ __ ]', 'hmm', 'uh', 'um', 'uhh', 'umm', 'huh'];
  return !commonNoisePatterns.some(noise => cleanedText.includes(noise)) && !/^[^\w\s]+$/.test(cleanedText);
}

function _checkForWakeWord(transcriptPart: string): string | null {
  if (!transcriptPart && wakeWordDetectionBuffer.length === 0) return null;

  const wakeWords = props.settings.vadWakeWordsBrowserSTT?.map(w => w.toLowerCase().trim()).filter(w => w) || [];
  if (wakeWords.length === 0) return null;

  const currentTime = Date.now();

  if (transcriptPart.trim()) {
    wakeWordDetectionBuffer.push({ text: transcriptPart.toLowerCase(), timestamp: currentTime });
  }

  // Prune old entries from buffer
  while (wakeWordDetectionBuffer.length > 0 && currentTime - wakeWordDetectionBuffer[0].timestamp > WAKE_WORD_BUFFER_MAX_AGE_MS) {
    wakeWordDetectionBuffer.shift();
  }

  const combinedRecentText = wakeWordDetectionBuffer.map(entry => entry.text).join(' ');

  for (const wakeWord of wakeWords) {
    const wakeWordRegex = new RegExp(`\\b${wakeWord}\\b`, 'i');
    if (wakeWordRegex.test(combinedRecentText)) {
      debugLog(`[BSH] Wake word "${wakeWord}" detected in buffered text: "${combinedRecentText}"`);
      wakeWordDetectionBuffer.length = 0;
      return wakeWord;
    }
  }
  return null;
}

function _createAndConfigureRecognizer(modeToConfigureFor: ListeningMode): boolean {
  const Constructor = SpeechRecognitionAPIConstructor.value;
  if (!Constructor) {
    if (isRecognizerAPISupported.value) {
      console.error('[BSH] Web Speech API (SpeechRecognition) is not available in this browser.');
      emit('error', {
        type: 'init',
        message: 'Web Speech API is not supported by this browser. Try Chrome, Edge, or Safari.',
        code: 'api-not-available',
        fatal: true
      });
      isRecognizerAPISupported.value = false;
    }
    return false;
  }
  isRecognizerAPISupported.value = true;

  if (recognizer.value && _isRecognizerActiveInternal.value) {
    console.warn('[BSH] Attempted to create recognizer while one is already active. Aborting old one first.');
    try { recognizer.value.abort(); } catch(e) { /* ignore if abort fails */ }
  }

  try {
    recognizer.value = new Constructor();
  } catch (e: any) {
    console.error('[BSH] Failed to instantiate SpeechRecognition:', e.message);
    emit('error', { type: 'init', message: `Failed to create speech recognizer: ${e.message}`, code: 'init-failed', fatal: true });
    return false;
  }

  // Support auto-detection or use specified language
  if (props.settings.sttAutoDetectLanguage) {
    // Leave empty for browser to auto-detect (not all browsers support this)
    recognizer.value.lang = '';
    debugLog('[BSH] STT auto-detection enabled, language left unspecified for browser to detect');
  } else {
    recognizer.value.lang = props.settings.speechLanguage || navigator.language || 'en-US';
  }
  recognizer.value.maxAlternatives = 1;

  switch (modeToConfigureFor) {
    case 'vad-wake':
      recognizer.value.continuous = true;
      recognizer.value.interimResults = true;
      break;
    case 'vad-command':
      recognizer.value.continuous = true;
      recognizer.value.interimResults = true;
      break;
    case 'main':
      // For PTT mode, use continuous=true to keep listening while button is held
      recognizer.value.continuous = props.audioInputMode === 'continuous' || props.audioInputMode === 'push-to-talk';
      recognizer.value.interimResults = true;
      break;
    default:
      recognizer.value.continuous = false;
      recognizer.value.interimResults = false;
  }
  debugLog(`[BSH] Recognizer configured for mode '${modeToConfigureFor}': continuous=${recognizer.value.continuous}, interimResults=${recognizer.value.interimResults}, lang=${recognizer.value.lang}`);

  _setupRecognizerEventHandlers();
  return true;
}

function _setupRecognizerEventHandlers(): void {
  if (!recognizer.value) return;

  recognizer.value.onstart = () => {
    debugLog(`[BSH] SpeechRecognition started. Current mode: ${currentListeningMode.value}`);
    _isRecognizerActiveInternal.value = true;
    recognizerStartTimeMs = Date.now();
    if (currentListeningMode.value !== 'vad-command') {
        _resetTranscriptStates();
    }
    if (consecutiveErrorCount > 0) {
        debugLog('[BSH] Recognizer started successfully, resetting consecutive error count.');
        consecutiveErrorCount = 0;
    }
    // Track PTT recording start time and reset accumulated transcript
    if (currentListeningMode.value === 'main' && props.audioInputMode === 'push-to-talk') {
        pttRecordingStartTime = Date.now();
        pttHasReceivedAudio = false;
        accumulatedTranscriptForPtt = '';
        pttFinalTranscriptForEmit = '';
        pttLastInterimTranscript = '';
        pttLastTranscriptTime = 0;
        if (pttSilenceTimer) {
          clearTimeout(pttSilenceTimer);
          pttSilenceTimer = null;
        }
        debugLog('[BSH] PTT recording tracking started, accumulated transcript cleared');
    }
    isTransitioningStates = false;
  };

  recognizer.value.onresult = (event: SpeechRecognitionEvent) => {
    if (!_isRecognizerActiveInternal.value) return;

    // Ignore results after we've stopped PTT mode
    if (currentListeningMode.value === 'idle' && props.audioInputMode === 'push-to-talk') {
        debugLog('[BSH] Ignoring result after PTT stop');
        return;
    }

    const timeSinceStart = Date.now() - recognizerStartTimeMs;
    if (currentListeningMode.value === 'vad-wake' && timeSinceStart < WARM_UP_PERIOD_MS) {
      return;
    }

    // Track that PTT has received audio
    if (currentListeningMode.value === 'main' && props.audioInputMode === 'push-to-talk') {
        pttHasReceivedAudio = true;
        debugLog('[BSH] PTT has received audio result');
    }

    let fullTranscriptThisEvent = '';
    let isChunkFinalByRecognizer = false;

    // Build the complete transcript from ALL results (not just new ones)
    // This ensures PTT mode gets the full accumulated text
    for (let i = 0; i < event.results.length; ++i) {
      fullTranscriptThisEvent += event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        isChunkFinalByRecognizer = true;
      }
    }

    // FIXED: For non-VAD-command modes, update pending transcript normally
    if (currentListeningMode.value !== 'vad-command') {
        pendingTranscript.value = fullTranscriptThisEvent.trim();
    }

    switch (currentListeningMode.value) {
      case 'vad-wake':
        _handleVadWakeResult(fullTranscriptThisEvent);
        break;
      case 'vad-command':
        _handleVadCommandResult(fullTranscriptThisEvent, isChunkFinalByRecognizer);
        break;
      case 'main':
        _handleMainResult(fullTranscriptThisEvent, isChunkFinalByRecognizer);
        break;
    }
  };

  recognizer.value.onerror = (event: SpeechRecognitionErrorEvent) => {
    console.error(`[BSH] SpeechRecognition error: ${event.error}, Message: ${event.message}. Mode: ${currentListeningMode.value}`);
    const wasActiveInternal = _isRecognizerActiveInternal.value;
    _isRecognizerActiveInternal.value = false;

    const now = Date.now();
    if (now - lastErrorTimestamp > ERROR_COUNT_RESET_WINDOW_MS) {
      consecutiveErrorCount = 0;
    }
    consecutiveErrorCount++;
    lastErrorTimestamp = now;

    if (event.error === 'aborted' && isTransitioningStates) {
      debugLog('[BSH] Expected "aborted" error during state transition. Ignoring.');
      return;
    }
    if (event.error === 'no-speech') {
      if (currentListeningMode.value === 'vad-wake') {
        debugLog('[BSH] "no-speech" error in VAD wake mode. Usually auto-restarts.');
        return;
      } else if (currentListeningMode.value === 'vad-command') {
         debugLog('[BSH] "no-speech" error in VAD command mode. This signifies command timeout or no input.');
         emit('error', {
            type: 'recognition',
            message: 'No command speech detected after wake word (no-speech error).',
            code: 'vad-command-no-speech',
            fatal: false
         });
         return;
      }
    }
    _handleGenericRecognitionError(event.error, event.message);
  };

  // Add speech detection handlers for better debugging
  recognizer.value.onspeechstart = () => {
    debugLog('[BSH] Speech detected (onspeechstart)');
    // Mark that PTT has detected speech
    if (currentListeningMode.value === 'main' && props.audioInputMode === 'push-to-talk') {
      pttHasReceivedAudio = true;
      debugLog('[BSH] PTT has detected speech start');
    }
  };

  recognizer.value.onspeechend = () => {
    debugLog('[BSH] Speech ended (onspeechend)');
  };

  recognizer.value.onaudiostart = () => {
    debugLog('[BSH] Audio capture started (onaudiostart)');
  };

  recognizer.value.onaudioend = () => {
    debugLog('[BSH] Audio capture ended (onaudioend)');
  };

  recognizer.value.onend = () => {
    debugLog(`[BSH] SpeechRecognition ended. Mode was: ${currentListeningMode.value}, Internally Active: ${_isRecognizerActiveInternal.value}, Transitioning: ${isTransitioningStates}`);
    debugLog(`[BSH] Audio input mode: ${props.audioInputMode}`);

    // Check if this is PTT mode that needs finalization
    const isPttFinalization = currentListeningMode.value === 'main' && props.audioInputMode === 'push-to-talk';
    debugLog(`[BSH] isPttFinalization: ${isPttFinalization}, mode: ${currentListeningMode.value}, audioInputMode: ${props.audioInputMode}`);

    _isRecognizerActiveInternal.value = false;

    // Finalize PTT transcript if applicable
    if (isPttFinalization) {
      // Clear silence timer
      if (pttSilenceTimer) {
        clearTimeout(pttSilenceTimer);
        pttSilenceTimer = null;
      }

      // Use the saved transcript from before stop was called (to avoid late-arriving results)
      const finalPttTranscript = (pttFinalTranscriptForEmit || accumulatedTranscriptForPtt).trim();
      debugLog(`[BSH] PTT finalization - Final transcript: "${finalPttTranscript}"`);

      if (finalPttTranscript && _isValidTranscript(finalPttTranscript)) {
        debugLog(`[BSH] Emitting final PTT transcript from onend: "${finalPttTranscript}"`);
        emit('transcription', { text: finalPttTranscript, isFinal: true, timestamp: Date.now() });
      } else {
        debugLog(`[BSH] No valid PTT transcript to emit on end.`);
      }
      _resetTranscriptStates();
      currentListeningMode.value = 'idle';
      _updatePublicStates();
    }

    // Handle continuous mode restart specially
    if (continuousModeIsRestarting) {
      debugLog('[BSH] OnEnd during continuous mode restart, will be handled by restart logic');
      // The restart logic in _handleMainResult will handle restarting
      return;
    }

    if (isTransitioningStates) {
      debugLog('[BSH] OnEnd during transition, assuming new state will be handled by control flow.');
    } else if (props.currentMicPermission === 'granted' && !props.parentIsProcessingLLM) {
      const shouldAutoRestart =
        (currentListeningMode.value === 'vad-wake' && props.audioInputMode === 'voice-activation') ||
        (currentListeningMode.value === 'main' && props.audioInputMode === 'continuous') ||
        (currentListeningMode.value === 'main' && props.audioInputMode === 'push-to-talk' && isListeningRef.value);

      if (shouldAutoRestart) {
        if (consecutiveErrorCount < MAX_CONSECUTIVE_ERRORS_ALLOWED) {
          debugLog(`[BSH] Scheduling auto-restart for mode: ${currentListeningMode.value}, PTT still active: ${props.audioInputMode === 'push-to-talk' && isListeningRef.value}`);
          _scheduleAutoRestart();
        } else {
          console.error(`[BSH] Max consecutive errors (${consecutiveErrorCount}) reached. Halting auto-restart for ${currentListeningMode.value}.`);
          emit('error', { type: 'recognition', message: 'Speech recognition stopped due to repeated errors.', code: 'max-errors-reached', fatal: true });
          currentListeningMode.value = 'idle';
          _updatePublicStates();
        }
      } else {
        currentListeningMode.value = 'idle';
        _updatePublicStates();
      }
    } else {
      currentListeningMode.value = 'idle';
      _updatePublicStates();
    }
  };
}

function _handleVadWakeResult(transcript: string): void {
  const detectedWakeWord = _checkForWakeWord(transcript);
  if (detectedWakeWord) {
    debugLog(`[BSH] Wake word "${detectedWakeWord}" confirmed by _handleVadWakeResult! Emitting event.`);
    emit('wake-word-detected');
  }
}

function _handleVadCommandResult(transcriptChunk: string, isChunkFinalByRecognizer: boolean): void {
  // FIXED: The transcript chunk contains the FULL transcript up to this point
  // NOT just the incremental part. So we should replace, not append.

  if (transcriptChunk.trim()) {
    // Update to the latest full transcript
    lastKnownVadCommandTranscript = transcriptChunk.trim();
    speechDetectedInVadCommandPhase = true;
    pendingTranscript.value = lastKnownVadCommandTranscript;

    // Emit interim results for VAD command to show live transcription
    debugLog(`[BSH-VADCmd] Updated transcript: "${lastKnownVadCommandTranscript}" (FinalByRec: ${isChunkFinalByRecognizer})`);
    emit('transcription', { text: lastKnownVadCommandTranscript, isFinal: false, timestamp: Date.now() });
  }

  if (speechDetectedInVadCommandPhase) {
    _clearAllTimers();
    vadCommandPauseTimerId = window.setTimeout(() => {
      debugLog('[BSH-VADCmd] Pause detected after speech. Finalizing VAD command from pause timer.');
      _finalizeVadCommand('pause_detected');
    }, props.settings.vadCommandRecognizedPauseMs ?? 1500);
  }

  if (isChunkFinalByRecognizer && _isValidTranscript(lastKnownVadCommandTranscript)) {
    debugLog('[BSH-VADCmd] Recognizer marked chunk as final and transcript is valid. Finalizing.');
    _finalizeVadCommand('chunk_final_and_valid');
  } else if (isChunkFinalByRecognizer && !lastKnownVadCommandTranscript.trim()) {
    debugLog('[BSH-VADCmd] Recognizer marked chunk as final but no valid command accumulated.');
  }
}

function _finalizeVadCommand(reason: string): void {
  if (currentListeningMode.value !== 'vad-command') {
    return;
  }
  _clearAllTimers();

  const finalCommand = lastKnownVadCommandTranscript.trim();
  debugLog(`[BSH-VADCmd] Finalizing command: "${finalCommand}". Reason: ${reason}`);

  if (_isValidTranscript(finalCommand)) {
    emit('transcription', { text: finalCommand, isFinal: true, timestamp: Date.now() });
  } else {
    if (reason !== 'max_duration_timeout') {
         emit('error', {
            type: 'recognition',
            message: `No valid command speech detected after wake word. (Reason: ${reason})`,
            code: 'vad-command-no-valid-speech',
            fatal: false
         });
    }
  }
  _stopListeningInternal(false);
}

function _handleMainResult(transcript: string, isFinal: boolean): void {
  pendingTranscript.value = transcript;

  if (props.audioInputMode === 'continuous') {
    const now = Date.now();

    // Update accumulated transcript
    continuousModeAccumulatedTranscript = transcript.trim();

    // Emit interim results for live transcription display
    if (transcript && !isFinal) {
      debugLog(`[BSH] Continuous mode interim transcript: "${transcript}"`);
      emit('transcription', { text: transcript.trim(), isFinal: false, timestamp: Date.now() });
      continuousModeLastInterimTranscript = transcript.trim();
      continuousModeLastTranscriptTime = now;
    }

    // Clear any existing silence timer when we get new speech
    if (continuousModeSilenceTimer && transcript !== continuousModeLastInterimTranscript) {
      clearTimeout(continuousModeSilenceTimer);
      continuousModeSilenceTimer = null;
    }

    // When we get a final result, start the silence timer
    if (isFinal && _isValidTranscript(transcript)) {
      debugLog(`[BSH] Continuous mode got final transcript: "${transcript}", starting silence timer`);
      continuousModeLastTranscriptTime = now;

      // Clear existing timer if any
      if (continuousModeSilenceTimer) {
        clearTimeout(continuousModeSilenceTimer);
      }

      // Start new silence timer
      continuousModeSilenceTimer = window.setTimeout(() => {
        // Only send if we have meaningful content
        if (continuousModeAccumulatedTranscript &&
            continuousModeAccumulatedTranscript.length >= CONTINUOUS_MODE_MIN_TRANSCRIPT_LENGTH) {
          debugLog(`[BSH] Continuous mode silence timeout reached. Sending: "${continuousModeAccumulatedTranscript}"`);
          emit('transcription', { text: continuousModeAccumulatedTranscript, isFinal: true, timestamp: Date.now() });

          // Reset state after sending
          continuousModeAccumulatedTranscript = '';
          pendingTranscript.value = '';
          continuousModeLastInterimTranscript = '';

          // Restart recognizer to clear accumulated results
          if (currentListeningMode.value === 'main' && props.audioInputMode === 'continuous') {
            debugLog('[BSH] Restarting recognizer to clear accumulated results in continuous mode');
            continuousModeIsRestarting = true; // Set flag to prevent auto-restart conflicts

            // Stop and destroy the current recognizer completely
            if (recognizer.value) {
              try {
                // Remove all event handlers first to prevent spurious events
                recognizer.value.onstart = null;
                recognizer.value.onresult = null;
                recognizer.value.onerror = null;
                recognizer.value.onend = null;
                recognizer.value.onspeechstart = null;
                recognizer.value.onspeechend = null;
                recognizer.value.onaudiostart = null;
                recognizer.value.onaudioend = null;

                if (_isRecognizerActiveInternal.value) {
                  recognizer.value.abort();
                  debugLog('[BSH] Recognizer aborted for restart');
                }
                recognizer.value = null; // Clear the reference completely
              } catch (e: any) {
                console.error('[BSH] Failed to cleanup recognizer for restart:', e.message);
              }
            }

            // Mark as not active
            _isRecognizerActiveInternal.value = false;

            // Schedule restart with a delay to ensure clean state
            setTimeout(async () => {
              if (currentListeningMode.value === 'main' && props.audioInputMode === 'continuous') {
                debugLog('[BSH] Creating fresh recognizer for continuous mode');

                // Clear any pending auto-restart timer
                if (autoRestartTimerId) {
                  clearTimeout(autoRestartTimerId);
                  autoRestartTimerId = null;
                }

                // Reset transcript states before recreating
                continuousModeAccumulatedTranscript = '';
                pendingTranscript.value = '';
                continuousModeLastInterimTranscript = '';

                // Create completely fresh recognizer
                if (_createAndConfigureRecognizer('main')) {
                  try {
                    recognizer.value?.start();
                    debugLog('[BSH] Fresh recognizer started successfully for continuous mode');
                  } catch (e: any) {
                    console.error('[BSH] Failed to start fresh recognizer:', e.message);
                    // Try to recover by starting listening again
                    await _startListeningInternal(true);
                  }
                } else {
                  console.error('[BSH] Failed to create fresh recognizer');
                  // Try to recover
                  await _startListeningInternal(true);
                }

                // Clear the restarting flag after everything is done
                continuousModeIsRestarting = false;
              } else {
                // Mode changed, clear flag
                continuousModeIsRestarting = false;
                debugLog('[BSH] Mode changed during restart, cancelling');
              }
            }, 500); // Slightly longer delay for complete cleanup
          }
        } else {
          debugLog(`[BSH] Continuous mode silence timeout but transcript too short (${continuousModeAccumulatedTranscript?.length || 0} chars), discarding`);
          continuousModeAccumulatedTranscript = '';
          pendingTranscript.value = '';
        }
        continuousModeSilenceTimer = null;
      }, CONTINUOUS_MODE_SILENCE_TIMEOUT_MS);
    }
  } else if (props.audioInputMode === 'push-to-talk') {
    if (transcript) {
        pendingTranscript.value = transcript;
        const now = Date.now();

        // Update the accumulated transcript
        accumulatedTranscriptForPtt = transcript.trim();

        if (isFinal && _isValidTranscript(transcript)) {
            // Final result from recognizer
            debugLog(`[BSH] PTT final transcript (cumulative): "${accumulatedTranscriptForPtt}"`);
            pttLastInterimTranscript = '';

            // Emit immediately for final results
            emit('transcription', { text: accumulatedTranscriptForPtt, isFinal: false, timestamp: Date.now() });
        } else {
            // Interim result - debounce the updates to reduce UI flicker
            pttLastInterimTranscript = transcript;
            pttLastTranscriptTime = now;

            // Only log every 5th interim to reduce console spam
            if (Math.random() < 0.2) {
                debugLog(`[BSH] PTT interim transcript: "${accumulatedTranscriptForPtt}"`);
            }

            // Debounce the emission of interim results to reduce UI updates
            if (pttDebounceTimer) {
                clearTimeout(pttDebounceTimer);
            }

            pttDebounceTimer = window.setTimeout(() => {
                if (accumulatedTranscriptForPtt) {
                    emit('transcription', { text: accumulatedTranscriptForPtt, isFinal: false, timestamp: Date.now() });
                }
            }, 100); // 100ms debounce
        }
    }
  } else if (props.audioInputMode === 'voice-activation') {
    // Emit interim results for VAD mode to show live transcription
    if (transcript && !isFinal) {
      debugLog(`[BSH] VAD mode interim transcript: "${transcript}"`);
      emit('transcription', { text: transcript.trim(), isFinal: false, timestamp: Date.now() });
    }
    if (isFinal && _isValidTranscript(transcript)) {
      debugLog(`[BSH] VAD mode transcript (final): "${transcript}"`);
      emit('transcription', { text: transcript.trim(), isFinal: true, timestamp: Date.now() });
      pendingTranscript.value = '';
    }
  }
}

function _handleGenericRecognitionError(errorName: string, errorMessage: string): void {
  let type: SttHandlerErrorPayload['type'] = 'recognition';
  let fatal = false;

  switch (errorName) {
    case 'not-allowed':
    case 'service-not-allowed':
      type = 'permission';
      fatal = true;
      break;
    case 'network':
      type = 'network';
      fatal = false;
      break;
    case 'audio-capture':
      type = 'recorder';
      fatal = true;
      break;
    case 'language-not-supported':
      type = 'init';
      fatal = true;
      break;
    case 'aborted':
      if (!isTransitioningStates) {
        type = 'unknown';
        console.warn('[BSH] Recognition aborted unexpectedly.');
      } else {
        return;
      }
      break;
    case 'no-speech':
      type = 'recognition';
      fatal = false;
      break;
    default:
      type = 'unknown';
      console.warn(`[BSH] Unhandled error type: ${errorName}`);
  }

  if (!fatal && consecutiveErrorCount >= MAX_CONSECUTIVE_ERRORS_ALLOWED) {
    console.warn(`[BSH] Max consecutive non-fatal errors (${consecutiveErrorCount}) for '${errorName}'. Promoting to fatal.`);
    fatal = true;
    errorMessage = `Speech recognition failed repeatedly: ${errorMessage || errorName}`;
  }

  emit('error', { type, message: `${errorName}: ${errorMessage}`, code: errorName, fatal });

  if (fatal) {
    currentListeningMode.value = 'idle';
    _updatePublicStates();
    _clearAllTimers();
  }
}

function _scheduleAutoRestart(): void {
  _clearAllTimers();
  debugLog(`[BSH] Scheduling auto-restart of recognizer in ${RESTART_DELAY_MS}ms for mode ${currentListeningMode.value}.`);
  isTransitioningStates = true;
  autoRestartTimerId = window.setTimeout(() => {
    if (props.currentMicPermission === 'granted' && !props.parentIsProcessingLLM) {
      debugLog('[BSH] Auto-restarting listener now.');
      // Restart in the appropriate mode
      if (currentListeningMode.value === 'vad-wake' || props.audioInputMode === 'voice-activation') {
        _startListeningInternal(false); // VAD wake mode
      } else if (props.audioInputMode === 'continuous') {
        _startListeningInternal(false); // Continuous mode
      } else if (props.audioInputMode === 'push-to-talk' && isListeningRef.value) {
        debugLog('[BSH] Auto-restarting PTT mode as button is still held.');
        _startListeningInternal(true); // PTT mode - main listening
      }
    } else {
      debugLog('[BSH] Auto-restart conditions no longer met. Staying idle.');
      currentListeningMode.value = 'idle';
      _updatePublicStates();
      isTransitioningStates = false;
    }
  }, RESTART_DELAY_MS);
}

async function _stopRecognizerInstance(forceAbort: boolean = false): Promise<void> {
  if (recognizer.value && _isRecognizerActiveInternal.value) {
    debugLog('[BSH] Attempting to stop/abort active SpeechRecognition instance...');
    try {
      // For PTT mode, use stop() to get the final transcript
      // For other modes or when forceAbort is true, use abort()
      if (props.audioInputMode === 'push-to-talk' && !forceAbort) {
        recognizer.value.stop();
        debugLog('[BSH] SpeechRecognition instance stop() called (PTT mode).');
      } else {
        recognizer.value.abort();
        debugLog('[BSH] SpeechRecognition instance abort() called.');
      }
    } catch (e: any) {
      console.warn('[BSH] Error while trying to stop/abort recognizer:', e.message);
      recognizer.value = null;
    }
  }
}

async function _stopListeningInternal(abort: boolean = false): Promise<void> {
  if (currentListeningMode.value === 'idle' && !isTransitioningStates && !_isRecognizerActiveInternal.value && !continuousModeStartDelayTimer) {
    return;
  }

  debugLog(`[BSH] Stopping listening. Abort: ${abort}. Current mode: ${currentListeningMode.value}. Transitioning: ${isTransitioningStates}`);

  isTransitioningStates = true;

  // Clear the continuous mode delay timer if it's running
  if (continuousModeStartDelayTimer) {
    clearTimeout(continuousModeStartDelayTimer);
    continuousModeStartDelayTimer = null;
    debugLog('[BSH] Cancelled continuous mode start delay timer.');
  }

  // If stopping continuous mode, send any accumulated transcript first
  if (props.audioInputMode === 'continuous' && continuousModeAccumulatedTranscript &&
      continuousModeAccumulatedTranscript.length >= CONTINUOUS_MODE_MIN_TRANSCRIPT_LENGTH) {
    debugLog(`[BSH] Sending accumulated continuous transcript before stop: "${continuousModeAccumulatedTranscript}"`);
    emit('transcription', { text: continuousModeAccumulatedTranscript, isFinal: true, timestamp: Date.now() });

    // Clear the accumulated transcript after sending
    continuousModeAccumulatedTranscript = '';
    pendingTranscript.value = '';
    continuousModeLastInterimTranscript = '';
  }

  _clearAllTimers();

  // Store the mode before stopping to check in onend handler
  const modeBeforeStop = currentListeningMode.value;
  const isPttMode = props.audioInputMode === 'push-to-talk' && modeBeforeStop === 'main';

  // Save the current accumulated transcript before stopping for PTT
  if (isPttMode && !abort) {
    pttFinalTranscriptForEmit = accumulatedTranscriptForPtt;
    debugLog(`[BSH] Saved PTT transcript before stop: "${pttFinalTranscriptForEmit}"`);
  }

  await _stopRecognizerInstance(abort);

  // For PTT mode with stop() (not abort), don't reset state yet - let onend handler do it
  if (!isPttMode || abort) {
    _resetTranscriptStates();
    currentListeningMode.value = 'idle';
    _updatePublicStates();
  }

  if (!autoRestartTimerId) {
      isTransitioningStates = false;
  }
  debugLog('[BSH] Listening explicitly stopped, transitioned to idle (or awaiting restart).');
}

async function _startListeningInternal(forVadCommandCapture: boolean = false): Promise<boolean> {
  if (isTransitioningStates && !_isRecognizerActiveInternal.value) {
    console.warn('[BSH] Attempt to start listening while already transitioning states. Request ignored.');
    return false;
  }
  isTransitioningStates = true;

  // Clear continuous mode restart flag if it's stuck
  if (continuousModeIsRestarting && props.audioInputMode === 'continuous') {
    debugLog('[BSH] Clearing stuck continuous mode restart flag');
    continuousModeIsRestarting = false;
  }

  // For continuous mode, ensure we have a clean recognizer
  if (props.audioInputMode === 'continuous' && recognizer.value) {
    debugLog('[BSH] Continuous mode: Destroying old recognizer for fresh start');
    try {
      // Remove all event handlers
      recognizer.value.onstart = null;
      recognizer.value.onresult = null;
      recognizer.value.onerror = null;
      recognizer.value.onend = null;
      recognizer.value.onspeechstart = null;
      recognizer.value.onspeechend = null;
      recognizer.value.onaudiostart = null;
      recognizer.value.onaudioend = null;

      if (_isRecognizerActiveInternal.value) {
        try {
          recognizer.value.abort();
        } catch(e) {
          // Ignore abort errors
        }
      }
      recognizer.value = null;
      _isRecognizerActiveInternal.value = false;
    } catch (e) {
      console.error('[BSH] Error cleaning up old recognizer:', e);
    }
  }

  debugLog(`[BSH] Attempting to start listening. For VAD command: ${forVadCommandCapture}, Current Audio Mode: ${props.audioInputMode}`);

  if (props.currentMicPermission !== 'granted') {
    emit('error', { type: 'permission', message: 'Microphone permission not granted.', code: 'mic-permission-denied', fatal: true });
    isTransitioningStates = false;
    return false;
  }

  let targetMode: ListeningMode;
  if (props.audioInputMode === 'voice-activation') {
    targetMode = forVadCommandCapture ? 'vad-command' : 'vad-wake';
  } else {
    targetMode = 'main';
  }

  if (recognizer.value && _isRecognizerActiveInternal.value) {
      debugLog('[BSH] Active recognizer found before start. Stopping it first.');
      await _stopRecognizerInstance(true); // Force abort when cleaning up before start
      await new Promise(resolve => setTimeout(resolve, 100));
  }

  _clearAllTimers();

  if (targetMode === 'vad-command') {
    lastKnownVadCommandTranscript = ''; // FIXED: Reset for new command
    speechDetectedInVadCommandPhase = false;
    debugLog('[BSH] Preparing for VAD command capture.');
  } else {
    _resetTranscriptStates();
  }

  currentListeningMode.value = targetMode;
  _updatePublicStates();

  if (!_createAndConfigureRecognizer(targetMode)) {
    console.error('[BSH] Failed to create or configure recognizer for new session.');
    currentListeningMode.value = 'idle';
    _updatePublicStates();
    isTransitioningStates = false;
    return false;
  }

  // For continuous mode ONLY (not PTT), add a delay to prevent immediate stop
  if (targetMode === 'main' && props.audioInputMode === 'continuous') {
    debugLog('[BSH] Delaying continuous mode start to avoid immediate stop...');
    await new Promise(resolve => {
      continuousModeStartDelayTimer = window.setTimeout(resolve, CONTINUOUS_MODE_START_DELAY_MS);
    });

    // Check if we should still start after the delay
    if (currentListeningMode.value !== targetMode) {
      debugLog('[BSH] Continuous mode start cancelled during delay. Current mode:', currentListeningMode.value);
      currentListeningMode.value = 'idle';
      _updatePublicStates();
      isTransitioningStates = false;
      return false;
    }
  }

  try {
    debugLog(`[BSH] Calling recognizer.start() for mode: ${targetMode}`);
    recognizer.value!.start();

    if (targetMode === 'vad-command') {
      const maxCmdDuration = props.settings.vadCommandTimeoutMs ?? 5000;
      vadCommandMaxDurationTimerId = window.setTimeout(() => {
          console.warn(`[BSH-VADCmd] Max duration (${maxCmdDuration}ms) EXPIRED for command capture.`);
          emit('error', {
            type: 'recognition',
            message: 'VAD Command capture timed out (max duration).',
            code: 'vad-command-max-timeout',
            fatal: false
          });
          _finalizeVadCommand('max_duration_timeout');
      }, maxCmdDuration);
    }
  } catch (e: any) {
    console.error(`[BSH] Error calling recognizer.start(): ${e.name} - ${e.message}`);
    _handleGenericRecognitionError(e.name || 'start-error', e.message || 'Unknown error during start.');
    currentListeningMode.value = 'idle';
    _updatePublicStates();
    isTransitioningStates = false;
    return false;
  }
  return true;
}

// API exposed to parent component (SttModeManager)
const api: SttHandlerInstance = {
  startListening: async (forVadCommandCapture: boolean = false) => {
    return _startListeningInternal(forVadCommandCapture);
  },
  stopListening: async (abort: boolean = false) => {
    return _stopListeningInternal(abort);
  },
  reinitialize: async () => {
    debugLog('[BSH] Reinitializing handler...');
    isTransitioningStates = true;
    await _stopListeningInternal(true);

    // Completely destroy the recognizer to ensure clean state
    if (recognizer.value) {
      try {
        // Remove all event handlers
        recognizer.value.onstart = null;
        recognizer.value.onresult = null;
        recognizer.value.onerror = null;
        recognizer.value.onend = null;
        recognizer.value.onspeechstart = null;
        recognizer.value.onspeechend = null;
        recognizer.value.onaudiostart = null;
        recognizer.value.onaudioend = null;
        recognizer.value = null;
        debugLog('[BSH] Recognizer destroyed during reinitialize');
      } catch (e) {
        console.error('[BSH] Error destroying recognizer during reinitialize:', e);
      }
    }

    consecutiveErrorCount = 0;
    lastErrorTimestamp = 0;
    wakeWordDetectionBuffer.length = 0;
    _resetTranscriptStates();
    continuousModeIsRestarting = false; // Clear any stuck restart flag

    isTransitioningStates = false;
    debugLog('[BSH] Reinitialization complete. Ready to (re)start if needed.');
  },
  stopAll: async (abort: boolean = true) => {
    debugLog(`[BSH] stopAll called. Abort: ${abort}`);
    await _stopListeningInternal(abort);
  },
  isActive: readonly(isActive),
  isListeningForWakeWord: readonly(isListeningForWakeWord),
  hasPendingTranscript: hasPendingTranscriptInternal,
  pendingTranscript: readonly(pendingTranscript),
  clearPendingTranscript: () => {
    pendingTranscript.value = '';
    if (props.audioInputMode === 'push-to-talk') {
        accumulatedTranscriptForPtt = '';
    }
    if (currentListeningMode.value === 'vad-command') {
        lastKnownVadCommandTranscript = '';
    }
  },
};

onMounted(() => {
  if (!SpeechRecognitionAPIConstructor.value) {
    console.error('[BSH] Web Speech API (SpeechRecognition) is not available on mount.');
    isRecognizerAPISupported.value = false;
    emit('error', { type: 'init', message: 'Web Speech API not supported on this browser.', code: 'api-not-found-on-mount', fatal: true });
  } else {
    isRecognizerAPISupported.value = true;
  }
  emit('handler-ready', 'browser', api);
  debugLog('[BSH] BrowserSpeechHandler mounted and API emitted.');
});

onBeforeUnmount(async () => {
  debugLog('[BSH] BrowserSpeechHandler unmounting. Stopping all activity.');
  _clearAllTimers();
  await api.stopAll(true);
  recognizer.value = null;
  emit('handler-unmounted', 'browser');
});

watch(() => props.settings.speechLanguage, async (newLang, oldLang) => {
  if (newLang && oldLang && newLang !== oldLang) {
    debugLog(`[BSH] Speech language changed from ${oldLang} to ${newLang}. Triggering reinitialization.`);
    await api.reinitialize();
  }
});

watch(() => props.settings.vadWakeWordsBrowserSTT, () => {
    debugLog('[BSH] VAD wake words changed. Clearing detection buffer.');
    wakeWordDetectionBuffer.length = 0;
}, { deep: true });

</script>


