// File: frontend/src/components/voice-input/composables/useSttManager.ts
/**
 * @file useSttManager.ts
 * @description Unified manager for Speech-to-Text (STT) functionality.
 * Manages STT handlers (Browser, Whisper) and input modes (PTT, Continuous, VAD).
 * It orchestrates the interaction between the selected STT engine, the chosen input mode,
 * and the UI, providing a consistent STT experience.
 *
 * @version 2.4.2
 * @updated 2025-06-05
 * - Added `isExplicitlyStoppedByUser` to `SttManagerInstance` interface.
 * - Ensured readonly refs are correctly typed for context and return.
 */

import { ref, computed, watch, shallowRef, effectScope, onScopeDispose, readonly, shallowReadonly } from 'vue';
import type { Ref, ShallowRef, ComputedRef, EffectScope } from 'vue';
import type { VoiceApplicationSettings, AudioInputMode } from '@/services/voice.settings.service';
import type { ToastService } from '@/services/services';
import { PttMode } from './modes/usePttMode';
import { ContinuousMode } from './modes/useContinuousMode';
import { VadMode } from './modes/useVadMode';
import { BaseSttMode, type SttModeContext } from './modes/BaseSttMode';
import type { SttHandlerInstance, SttHandlerErrorPayload } from '../types';
import type { VoiceInputSharedState } from '../composables/shared/useVoiceInputState';
import { createScopedSttLogger } from '@/utils/debug';

/**
 * @typedef SttInternalHandlerType
 * @description Defines the internal keys used to manage STT handler instances within the SttManager.
 */
type SttInternalHandlerType = 'browser' | 'whisper';

const debugLog = createScopedSttLogger('SttManager');


export interface UseSttManagerOptions {
  audioMode: Readonly<Ref<AudioInputMode>>;
  settings: Readonly<Ref<VoiceApplicationSettings>>;
  sharedState: VoiceInputSharedState;
  micPermissionStatus: Readonly<Ref<string>>;
  isProcessingLLM: Readonly<Ref<boolean>>;
  audioFeedback: import('./shared/useAudioFeedback').AudioFeedbackInstance;
  transcriptionDisplay: ReturnType<typeof import('./shared/useTranscriptionDisplay').useTranscriptionDisplay>;
  emit: (event: string, ...args: any[]) => void;
  toast?: ToastService;
  t?: (key: string, params?: any) => string; // i18n translator function
}

export interface SttManagerInstance {
  currentModeInstance: Readonly<ShallowRef<BaseSttMode | null>>;
  isActive: ComputedRef<boolean>;
  canStart: ComputedRef<boolean>;
  statusText: ComputedRef<string>;
  placeholderText: ComputedRef<string>;
  activeHandlerApi: Readonly<ShallowRef<SttHandlerInstance | null>>;
  isProcessingAudio: ComputedRef<boolean>;
  isListeningForWakeWord: ComputedRef<boolean>;
  isAwaitingVadCommandResult: Readonly<Ref<boolean>>; // Expose this
  isExplicitlyStoppedByUser: Readonly<Ref<boolean>>; // ADDED
  handleMicButtonClick: () => Promise<void>;
  startPtt: () => Promise<void>; // Added for direct PTT control
  stopPtt: () => Promise<void>; // Added for direct PTT control
  registerHandler: (type: SttInternalHandlerType, api: SttHandlerInstance) => void;
  unregisterHandler: (type: SttInternalHandlerType) => Promise<void>;
  cleanup: () => Promise<void>;
  handleTranscriptionFromHandler: (text: string, isFinal: boolean) => void;
  handleWakeWordDetectedFromHandler: () => Promise<void>;
  handleErrorFromHandler: (errorPayload: SttHandlerErrorPayload) => void;
  handleTranscriptionDismissedByUser: () => Promise<void>;
  handleProcessingAudioChange: (_isProcessing: boolean) => void;
  handleListeningForWakeWordChange: (_isListening: boolean) => void;
}

const MIN_TIME_BETWEEN_REINITS_MS = 2000;
const LLM_STATE_DEBOUNCE_MS = 300;
const VAD_COMMAND_RESULT_TIMEOUT_MS = 7000;

export function useSttManager(options: UseSttManagerOptions): SttManagerInstance {
  const {
    settings,
    sharedState,
    micPermissionStatus,
    isProcessingLLM,
    audioFeedback,
    transcriptionDisplay,
    emit,
    toast,
    t, // i18n translator
  } = options;

  const scope: EffectScope = effectScope();
  const handlers = new Map<SttInternalHandlerType, SttHandlerInstance>();
  const _activeHandlerApi = shallowRef<SttHandlerInstance | null>(null);

  const _getHandlerTypeForApi = (api: SttHandlerInstance | null): SttInternalHandlerType | null => {
    if (!api) return null;
    for (const [key, value] of handlers.entries()) {
      if (value === api) return key;
    }
    return null;
  };
  const _currentModeInstance = shallowRef<BaseSttMode | null>(null);

  const isReinitializing = ref(false);
  const _isAwaitingVadCommandResult = ref(false); // Internal ref
  const lastReinitializeTime = ref(0);
  let vadCommandResultTimeoutId: number | null = null;
  let llmDebounceTimer: number | null = null;
  const _isExplicitlyStoppedByUser = ref(false); // Internal ref

  const targetInternalHandlerType = computed<SttInternalHandlerType>(() => {
    return settings.value.sttPreference === 'browser_webspeech_api' ? 'browser' : 'whisper';
  });

  const isActive = computed<boolean>(() => {
    const active = _currentModeInstance.value?.isActive.value ?? false;
    const modeName = _currentModeInstance.value ? _currentModeInstance.value.constructor.name : 'none';
    debugLog('[SttManager] isActive computed:', active, 'mode:', modeName);
    return active;
  });
  const canStart = computed<boolean>(() => _currentModeInstance.value?.canStart.value ?? false);
  const isProcessingAudio = computed<boolean>(() => _activeHandlerApi.value?.isActive?.value ?? false);
  const isListeningForWakeWord = computed<boolean>(() => _activeHandlerApi.value?.isListeningForWakeWord?.value ?? false);

  const statusText = computed<string>(() => {
    if (sharedState.currentRecordingStatusHtml.value.includes('mode-hint-feedback')) {
      return sharedState.currentRecordingStatusHtml.value;
    }
    const status = _currentModeInstance.value?.statusText.value ?? 'Initializing STT...';
    debugLog('[SttManager] statusText computed:', status);
    return status;
  });

  const placeholderText = computed<string>(() => _currentModeInstance.value?.placeholderText.value ?? 'Please wait, voice input loading...');

  const isContinuousModeActive = computed<boolean>(() => options.audioMode.value === 'continuous');
  const isVoiceActivationModeActive = computed<boolean>(() => options.audioMode.value === 'voice-activation');

  const _createModeContext = (): SttModeContext => ({
    isProcessingLLM: options.isProcessingLLM,
    micPermissionGranted: computed(() => micPermissionStatus.value === 'granted'),
    activeHandlerApi: shallowReadonly(_activeHandlerApi),
    settings: options.settings,
    sharedState,
    transcriptionDisplay,
    audioFeedback,
    toast,
    emit,
    audioMode: options.audioMode,
    playSound: (buffer: AudioBuffer | null, volume?: number) => audioFeedback.playSound(buffer, volume),
    isAwaitingVadCommandResult: readonly(_isAwaitingVadCommandResult),
    clearVadCommandTimeout: () => _clearVadCommandTimeout(),
    isExplicitlyStoppedByUser: readonly(_isExplicitlyStoppedByUser),
    setExplicitlyStoppedByUser: (value: boolean) => { _isExplicitlyStoppedByUser.value = value; },
    t: t || ((key: string) => key), // Pass translator or fallback
  });

  const _createMode = (modeValue: AudioInputMode): BaseSttMode | null => {
    const context = _createModeContext();
    // debugLog(`[SttManager] Creating mode instance for: ${modeValue}`); // Reduced verbosity
    switch (modeValue) {
      case 'push-to-talk': return new PttMode(context);
      case 'continuous': return new ContinuousMode(context);
      case 'voice-activation': return new VadMode(context);
      default:
        console.error(`[SttManager] Unknown audio mode specified: ${modeValue}`);
        toast?.add({ type: 'error', title: 'Internal Mode Error', message: `Unsupported audio mode: ${modeValue}` });
        return null;
    }
  };

  const _shouldAutoStartListening = (): boolean => {
    if (isReinitializing.value || !_activeHandlerApi.value || _isExplicitlyStoppedByUser.value) {
      debugLog('[SttManager] _shouldAutoStartListening: false - reinit/no handler/explicitly stopped');
      return false;
    }
    if (isProcessingLLM.value && !_isAwaitingVadCommandResult.value) {
      debugLog('[SttManager] _shouldAutoStartListening: false - LLM processing');
      return false;
    }
    if (micPermissionStatus.value !== 'granted') {
      debugLog('[SttManager] _shouldAutoStartListening: false - no mic permission');
      return false;
    }

    const autoStartModeEnabled = isContinuousModeActive.value || isVoiceActivationModeActive.value;
    const notCurrentlyActive = !isProcessingAudio.value && !isListeningForWakeWord.value && !_currentModeInstance.value?.isActive.value;
    const shouldStart = autoStartModeEnabled && notCurrentlyActive;
    debugLog(`[SttManager] _shouldAutoStartListening: ${shouldStart} (autoStartMode: ${autoStartModeEnabled}, notActive: ${notCurrentlyActive})`);
    return shouldStart;
  };

  const _clearVadCommandTimeout = () => {
    if (vadCommandResultTimeoutId) {
      clearTimeout(vadCommandResultTimeoutId);
      vadCommandResultTimeoutId = null;
    }
    if (_isAwaitingVadCommandResult.value) {
      _isAwaitingVadCommandResult.value = false;
    }
  };

  const _switchMode = async (newModeValue: AudioInputMode): Promise<void> => {
    debugLog(`[SttManager] Attempting to switch mode to: ${newModeValue}`);
    // Remember if user had explicitly stopped before switching
    const wasExplicitlyStopped = _isExplicitlyStoppedByUser.value;

    const oldModeInstance = _currentModeInstance.value;
    if (oldModeInstance) {
      debugLog(`[SttManager] Cleaning up old mode: ${oldModeInstance.constructor.name}`);
      await oldModeInstance.stop();
      oldModeInstance.cleanup();
    }
    _currentModeInstance.value = _createMode(newModeValue);
    if (_currentModeInstance.value) {
      debugLog(`[SttManager] Successfully switched to new mode: ${_currentModeInstance.value.constructor.name}`);

      // Don't auto-start if user had explicitly stopped the previous mode
      // This prevents unexpected auto-start when user switches modes
      if (!wasExplicitlyStopped && _shouldAutoStartListening()) {
        debugLog(`[SttManager] Auto-starting STT for mode '${newModeValue}' after mode switch.`);
        _isExplicitlyStoppedByUser.value = false;
        await _currentModeInstance.value.start();
      } else if (wasExplicitlyStopped) {
        debugLog(`[SttManager] Not auto-starting - user had explicitly stopped. Click mic to start.`);
        // Keep the explicitly stopped flag so user needs to click mic to start
      } else {
        debugLog(`[SttManager] Not auto-starting. shouldAutoStart conditions not met.`);
        _isExplicitlyStoppedByUser.value = false;
      }
    }
  };

  const registerHandler = (type: SttInternalHandlerType, api: SttHandlerInstance): void => {
    debugLog(`[SttManager] Registering STT handler: ${type}`); // Enable for debugging
    handlers.set(type, api);
    if (targetInternalHandlerType.value === type && !_activeHandlerApi.value) {
      _activeHandlerApi.value = api;
      debugLog(`[SttManager] Active handler set to: ${type}`);

      // Don't auto-start continuous mode after handler registration
      // User should explicitly click mic button to start
      if (options.audioMode.value === 'continuous') {
        debugLog(`[SttManager] Continuous mode - not auto-starting after handler registration. User must click mic to start.`);
        return;
      }

      // Check if mode is already active or starting before auto-starting
      const modeInstance = _currentModeInstance.value;
      if (modeInstance && _shouldAutoStartListening() && !modeInstance.isActive.value) {
         debugLog(`[SttManager] Auto-starting after handler registration (mode not already active)`);
         modeInstance.start();
      } else if (modeInstance?.isActive.value) {
         debugLog(`[SttManager] Skipping auto-start - mode already active`);
      }
    }
  };

  const unregisterHandler = async (type: SttInternalHandlerType): Promise<void> => {
    // debugLog(`[SttManager] Unregistering STT handler: ${type}`); // Reduced verbosity
    const handlerApiToUnregister = handlers.get(type);
    if (handlerApiToUnregister) {
      await handlerApiToUnregister.stopAll(true);
      handlers.delete(type);
    }
    if (_activeHandlerApi.value === handlerApiToUnregister) {
      _activeHandlerApi.value = null;
      const modeInstance = _currentModeInstance.value;
      if (modeInstance?.isActive.value) {
        _isExplicitlyStoppedByUser.value = true;
        await modeInstance.stop();
      }
    }
  };

  const _reinitializeActiveHandler = async (forceRestart: boolean = false): Promise<void> => {
    // ... (Implementation unchanged from previous version 2.4.1) ...
    const now = Date.now();
    if (!forceRestart && now - lastReinitializeTime.value < MIN_TIME_BETWEEN_REINITS_MS) {
      console.warn(`[SttManager] Reinitialization attempt blocked: too soon (last was ${now - lastReinitializeTime.value}ms ago).`);
      return;
    }
    if (isReinitializing.value) {
      console.warn('[SttManager] Reinitialization attempt blocked: already in progress.');
      return;
    }
    if (!_activeHandlerApi.value) {
      console.warn('[SttManager] Reinitialization attempt blocked: no active handler.');
      return;
    }
    isReinitializing.value = true;
    lastReinitializeTime.value = now;
    _clearVadCommandTimeout();
    debugLog('[SttManager] Reinitializing active STT handler...');
    try {
      await _activeHandlerApi.value.reinitialize();
      await new Promise(resolve => setTimeout(resolve, 150));
    } catch (error: any) {
      console.error('[SttManager] Error during STT handler reinitialization:', error.message);
      emit('voice-input-error', { type: 'handler_command', message: 'Failed to reinitialize STT handler.' } as SttHandlerErrorPayload);
    } finally {
      isReinitializing.value = false;
    }
    await new Promise(resolve => setTimeout(resolve, 250));

    // Don't auto-start continuous mode after reinitialization
    // User should explicitly click mic button to start
    if (options.audioMode.value === 'continuous') {
      debugLog('[SttManager] Continuous mode - not auto-starting after reinit. User must click mic to start.');
      return;
    }

    if (_shouldAutoStartListening()) {
      // debugLog('[SttManager] Auto-starting STT after reinitialization.'); // Reduced verbosity
      const modeInstance = _currentModeInstance.value;
      if (modeInstance && !modeInstance.isActive.value) {
        debugLog('[SttManager] Auto-starting STT after reinitialization (mode not already active)');
        await modeInstance.start();
      } else if (modeInstance?.isActive.value) {
        debugLog('[SttManager] Skipping auto-start after reinit - mode already active');
      }
    }
  };

  const handleTranscriptionDismissedByUser = async (): Promise<void> => {
    debugLog('[SttManager] Transcription confirmation dismissed by user.');
    sharedState.pendingTranscript.value = '';
    transcriptionDisplay.clearTranscription();
    _currentModeInstance.value?.handleUserDismissedTranscript();

    if (!_isExplicitlyStoppedByUser.value && _shouldAutoStartListening()) {
      const modeInstance = _currentModeInstance.value;
      if (modeInstance && !modeInstance.isActive.value) {
        try {
          await modeInstance.start();
        } catch (error: any) {
          console.warn('[SttManager] Failed to auto-start mode after dismissal:', error?.message || error);
        }
      }
    }
  };

  let isProcessingMicClick = false;
  const handleMicButtonClick = async (): Promise<void> => {
    // Prevent rapid clicks
    if (isProcessingMicClick) {
      debugLog('[SttManager] Ignoring mic button click - still processing previous click');
      return;
    }
    isProcessingMicClick = true;

    // ... (Implementation unchanged from previous version 2.4.1) ...
    const currentMode = _currentModeInstance.value;
    debugLog(`[SttManager] Mic button clicked. Mode: ${currentMode?.constructor.name}, isActive: ${currentMode?.isActive.value}, canStart: ${currentMode?.canStart.value}`);

    if (!currentMode) {
      console.error('[SttManager] Microphone button clicked, but no STT mode instance is active.');
      toast?.add({ type: 'error', title: 'Mode Error', message: 'No voice input mode selected or initialized.' });
      isProcessingMicClick = false;
      return;
    }
    if (currentMode.requiresHandler && !_activeHandlerApi.value) {
      toast?.add({ type: 'warning', title: 'STT Service Unavailable', message: 'The speech recognition service is not ready.' });
      isProcessingMicClick = false;
      return;
    }

    try {
      // Special handling for VAD mode when listening for wake word
      if (options.audioMode.value === 'voice-activation' && isListeningForWakeWord.value) {
        debugLog('[SttManager] VAD mode listening for wake word - toggling VAD mode off/on');
        // User wants to turn off VAD mode while it's listening for wake word
        _isExplicitlyStoppedByUser.value = true;
        await currentMode.stop();
      } else if (currentMode.isActive.value) {
        debugLog('[SttManager] Mic button: User requested STOP. Setting explicitly stopped = true. Mode:', options.audioMode.value);
        _isExplicitlyStoppedByUser.value = true;
        await currentMode.stop();
        debugLog('[SttManager] Stop completed for mode:', options.audioMode.value);
      } else if (currentMode.canStart.value) {
        debugLog('[SttManager] Mic button: User requested START. Setting explicitly stopped = false. Mode:', options.audioMode.value);
        _isExplicitlyStoppedByUser.value = false;
        await currentMode.start();
        debugLog('[SttManager] Start completed for mode:', options.audioMode.value);
      } else {
      // console.warn('[SttManager] Mic button clicked, but current mode cannot start.'); // Reduced verbosity

      // If the user clicked while explicitly stopped, clear the flag and try to start
      if (_isExplicitlyStoppedByUser.value && !currentMode.isActive.value) {
        debugLog('[SttManager] Mic button: Clearing explicitly stopped flag and attempting to start.');
        _isExplicitlyStoppedByUser.value = false;
        // Try to start after clearing the flag
        if (currentMode.canStart.value) {
          await currentMode.start();
          debugLog('[SttManager] Start completed after clearing explicitly stopped flag.');
          isProcessingMicClick = false;
          return;
        }
      }

      if (micPermissionStatus.value !== 'granted') {
        toast?.add({ type: 'error', title: 'Microphone Permission', message: 'Microphone access is required.' });
      } else if (isProcessingLLM.value && !_isAwaitingVadCommandResult.value) {
        toast?.add({ type: 'info', title: 'Assistant Busy', message: 'Assistant is currently processing.' });
      } else if (_isExplicitlyStoppedByUser.value) {
        toast?.add({ type: 'info', title: t ? t('voice.voiceInputOff') : 'Voice Input Off', message: t ? t('voice.clickMicToStartListening') : 'Click mic to start listening.'});
      } else {
        toast?.add({ type: 'info', title: 'Voice Input Not Ready', message: 'Cannot start voice input now.' });
      }
    }
    } finally {
      // Reset the flag after a short delay to prevent race conditions
      setTimeout(() => {
        isProcessingMicClick = false;
      }, 200);
    }
  };

  // PTT-specific methods
  const startPtt = async (): Promise<void> => {
    debugLog('[SttManager] startPtt called');
    const currentMode = _currentModeInstance.value;
    if (!currentMode) {
      console.error('[SttManager] startPtt: No current mode instance.');
      return;
    }

    // Check if current mode is PTT by checking the current mode setting
    // Don't rely on constructor.name which gets minified in production
    if (options.audioMode.value === 'push-to-talk') {
      _isExplicitlyStoppedByUser.value = false;
      await currentMode.start();
    } else {
      console.warn('[SttManager] startPtt called but current mode is not PTT:', options.audioMode.value);
    }
  };

  const stopPtt = async (): Promise<void> => {
    debugLog('[SttManager] stopPtt called');
    const currentMode = _currentModeInstance.value;
    if (!currentMode) {
      console.error('[SttManager] stopPtt: No current mode instance.');
      return;
    }

    // Check if current mode is PTT by checking the current mode setting
    // Don't rely on constructor.name which gets minified in production
    if (options.audioMode.value === 'push-to-talk' && currentMode.isActive.value) {
      await currentMode.stop();
    } else if (options.audioMode.value !== 'push-to-talk') {
      console.warn('[SttManager] stopPtt called but current mode is not PTT:', options.audioMode.value);
    }
  };

  const handleTranscriptionFromHandler = (text: string, isFinal: boolean): void => {
    const currentMode = _currentModeInstance.value;
    if (!currentMode) return;
    if (isFinal) {
      currentMode.handleTranscription(text);
    } else {
      const interimHandler = (currentMode as any).handleInterimTranscript;
      if (typeof interimHandler === 'function') interimHandler.call(currentMode, text);
      else sharedState.pendingTranscript.value = text;
    }
  };

  const handleWakeWordDetectedFromHandler = async (): Promise<void> => {
    // ... (Implementation unchanged from previous version 2.4.1) ...
    if (options.audioMode.value === 'voice-activation' && _currentModeInstance.value instanceof VadMode) {
      // Allow wake word detection even when LLM is processing - VAD should work independently
      // if (isProcessingLLM.value) {
      //   console.warn('[SttManager] Wake word detected, but LLM is processing. Ignoring.');
      //   return;
      // }
      _isAwaitingVadCommandResult.value = true;
      // debugLog(`[SttManager] VAD wake word detected. Setting VAD command timeout (${VAD_COMMAND_RESULT_TIMEOUT_MS}ms).`); // Reduced verbosity
      if (vadCommandResultTimeoutId) clearTimeout(vadCommandResultTimeoutId);
      vadCommandResultTimeoutId = window.setTimeout(() => {
        console.warn('[SttManager] VAD command result timeout.');
        const wasAwaiting = _isAwaitingVadCommandResult.value;
        _clearVadCommandTimeout();
        if (wasAwaiting && _currentModeInstance.value instanceof VadMode) {
            _currentModeInstance.value.handleError({
                type: 'recognition', code: 'vad-command-timeout-internal',
                message: 'No command speech detected after wake word (manager timeout).', fatal: false,
            });
        }
      }, VAD_COMMAND_RESULT_TIMEOUT_MS);
      await (_currentModeInstance.value as VadMode).handleWakeWordDetected();
    }
  };

  const handleErrorFromHandler = (errorPayload: SttHandlerErrorPayload): void => {
    // ... (Implementation unchanged from previous version 2.4.1) ...
    // console.error('[SttManager] Error from STT handler:', JSON.stringify(errorPayload)); // Reduced verbosity
    if (_isAwaitingVadCommandResult.value && errorPayload.code !== 'vad-command-timeout-internal') {
      _clearVadCommandTimeout();
    }
    const mode = _currentModeInstance.value;
    if (mode) mode.handleError(errorPayload);
    else {
      emit('voice-input-error', errorPayload);
      toast?.add({ type: 'error', title: `STT Error: ${errorPayload.type}`, message: errorPayload.message });
    }
  };

  const handleProcessingAudioChange = (_isProcessing: boolean): void => {};
  const handleListeningForWakeWordChange = (_isListening: boolean): void => {};

  const cleanup = async (): Promise<void> => {
    // ... (Implementation unchanged from previous version 2.4.1) ...
    // debugLog('[SttManager] Cleanup process initiated...'); // Reduced verbosity
    if (llmDebounceTimer) clearTimeout(llmDebounceTimer);
    _clearVadCommandTimeout();
    const modeToCleanup = _currentModeInstance.value;
    _currentModeInstance.value = null;
    if (modeToCleanup) {
      try { await modeToCleanup.stop(); modeToCleanup.cleanup(); } catch (e: any) { /* ... */ }
    }
    for (const [, handler] of handlers) { try { await handler.stopAll(true); } catch (e: any) { /* ... */ } }
    handlers.clear();
    _activeHandlerApi.value = null;
    _isExplicitlyStoppedByUser.value = false;
    // debugLog('[SttManager] Cleanup process complete.'); // Reduced verbosity
  };

  scope.run(() => {
    watch(options.audioMode, (newMode, oldMode) => { if (newMode !== oldMode) _switchMode(newMode); }, { immediate: true });
    watch(targetInternalHandlerType, async (newInternalType, oldInternalType) => {
      if (newInternalType === oldInternalType) {
        if (newInternalType) {
          debugLog(`[SttManager] STT handler preference remains '${newInternalType}'.`);
        }
        return;
      }

      const activeType = _getHandlerTypeForApi(_activeHandlerApi.value);
      debugLog(`[SttManager] Target STT handler type changed: \ -> ${newInternalType}. Active handler before switch: \.`);

      const desiredHandler = handlers.get(newInternalType);
      if (!desiredHandler) {
        console.warn(`[SttManager] Handler for type '${newInternalType}' not registered yet. Waiting for registration.`);
        return;
      }

      if (_activeHandlerApi.value !== desiredHandler) {
        if (_currentModeInstance.value?.isActive.value) {
          debugLog('[SttManager] Stopping current mode before switching STT handler.');
          await _currentModeInstance.value.stop();
        }

        _activeHandlerApi.value = desiredHandler;
        debugLog(`[SttManager] Active handler set to '${newInternalType}'. Reinitializing to apply preference.`);
        await _reinitializeActiveHandler(true);
      } else {
        debugLog('[SttManager] Desired handler already active; reinitializing to ensure fresh state.');
        await _reinitializeActiveHandler(true);
      }

      if (!_isExplicitlyStoppedByUser.value && _shouldAutoStartListening()) {
        const modeInstance = _currentModeInstance.value;
        if (modeInstance && !modeInstance.isActive.value) {
          debugLog('[SttManager] Auto-starting mode after handler preference change.');
          await modeInstance.start();
        }
      }
    }, { immediate: true });
    watch(isProcessingLLM, async (isLLMNowProcessing, wasLLMProcessing) => {
      // ... (Implementation unchanged from previous version 2.4.1) ...
      if (isLLMNowProcessing === wasLLMProcessing) return;
      debugLog(`[SttManager] LLM processing state changed to: ${isLLMNowProcessing}`);
      if (llmDebounceTimer) clearTimeout(llmDebounceTimer);
      if (isLLMNowProcessing) {
        // Check if continuous mode should stop based on the continuousModeListenDuringResponse setting
        const continuousModeShouldStop = options.audioMode.value === 'continuous' &&
          !settings.value.continuousModeListenDuringResponse;

        const shouldStopStt = _currentModeInstance.value?.isActive.value &&
          (continuousModeShouldStop ||
           (options.audioMode.value !== 'continuous' &&
            !(isVoiceActivationModeActive.value && (isListeningForWakeWord.value || _isAwaitingVadCommandResult.value))));

        debugLog(`[SttManager] LLM processing=true. Should stop STT check:
          Mode: ${_currentModeInstance.value?.constructor.name}
          isActive: ${_currentModeInstance.value?.isActive.value}
          isVAD: ${isVoiceActivationModeActive.value}
          isListeningWake: ${isListeningForWakeWord.value}
          isAwaitingCmd: ${_isAwaitingVadCommandResult.value}
          isContinuous: ${options.audioMode.value === 'continuous'}
          continuousModeListenDuringResponse: ${settings.value.continuousModeListenDuringResponse}
          shouldStop: ${shouldStopStt}`);

        if (shouldStopStt && _currentModeInstance.value) {
          debugLog('[SttManager] WARNING: Stopping STT due to LLM processing');
          await _currentModeInstance.value.stop();
        }
      } else {
        _clearVadCommandTimeout();
        llmDebounceTimer = window.setTimeout(async () => {
          llmDebounceTimer = null;
          // If continuous mode was stopped due to LLM processing and should restart
          const shouldRestartContinuous = options.audioMode.value === 'continuous' &&
            !settings.value.continuousModeListenDuringResponse &&
            !_isExplicitlyStoppedByUser.value &&
            !_currentModeInstance.value?.isActive.value;

          if (shouldRestartContinuous && _currentModeInstance.value) {
            debugLog('[SttManager] Restarting continuous mode after LLM processing ended');
            await _currentModeInstance.value.start();
          } else if (!isProcessingLLM.value && !_isExplicitlyStoppedByUser.value && _shouldAutoStartListening()) {
            await _reinitializeActiveHandler();
          }
        }, LLM_STATE_DEBOUNCE_MS);
      }
    });
    watch(micPermissionStatus, async (newStatus, oldStatus) => {
      // ... (Implementation unchanged from previous version 2.4.1) ...
      if (newStatus === oldStatus) return;
      // debugLog(`[SttManager] Mic permission: ${oldStatus || 'initial'} -> ${newStatus}`); // Reduced verbosity
      if (newStatus !== 'granted') {
        if (_currentModeInstance.value?.isActive.value) {
          _isExplicitlyStoppedByUser.value = true;
          await _currentModeInstance.value.stop();
          toast?.add({ type: 'error', title: 'Mic Access Issue', message: 'Mic access lost. Voice input stopped.' });
        }
      } else if (oldStatus !== 'granted' && !_isExplicitlyStoppedByUser.value && _shouldAutoStartListening()) {
        await _reinitializeActiveHandler(true);
      }
    });
  }); 

  onScopeDispose(async () => {
    // debugLog('[SttManager] Scope disposing. Cleanup...'); // Reduced verbosity
    await cleanup();
    if (scope) scope.stop();
  });

  return {
    currentModeInstance: shallowReadonly(_currentModeInstance),
    isActive,
    canStart,
    statusText,
    placeholderText,
    activeHandlerApi: shallowReadonly(_activeHandlerApi),
    isProcessingAudio,
    isListeningForWakeWord,
    isAwaitingVadCommandResult: readonly(_isAwaitingVadCommandResult), // Expose readonly version
    isExplicitlyStoppedByUser: readonly(_isExplicitlyStoppedByUser), // Expose readonly version
    handleMicButtonClick,
    startPtt, // Added for direct PTT control
    stopPtt, // Added for direct PTT control
    registerHandler,
    unregisterHandler,
    cleanup,
    handleTranscriptionFromHandler,
    handleWakeWordDetectedFromHandler,
    handleErrorFromHandler,
    handleTranscriptionDismissedByUser,
    handleProcessingAudioChange,
    handleListeningForWakeWordChange,
  };
}

