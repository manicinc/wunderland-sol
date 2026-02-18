// File: frontend/src/components/voice-input/handlers/WhisperSpeechHandler.vue
/**
 * @file WhisperSpeechHandler.vue
 * @module WhisperSpeechHandler
 * @description Implements an STT (Speech-to-Text) handler using an external Whisper API.
 * This component records audio segments and sends them for transcription. It supports
 * Push-to-Talk (PTT) and a "Continuous" mode that segments audio based on silence
 * or maximum duration. True wake-word VAD is not natively supported by this handler;
 * 'voice-activation' mode behaves like 'continuous'.
 * Conforms to the SttHandlerInstance interface for integration with SttManager.
 *
 * @version 3.3.2
 * @updated 2025-06-05 - Conditionally accessed `responseData.language` with JSDoc note.
 * - Removed unused `vadSensitivityDb`. Marked `_forVADCommandIgnored` unused.
 */
<template>
  </template>

<script setup lang="ts">
import {
  ref,
  computed,
  watch,
  inject,
  nextTick,
  onMounted,
  onBeforeUnmount,
  type Ref,
  readonly,
} from 'vue';
import { speechAPI, type TranscriptionResponseFE, type CreditSnapshotFE } from '@/utils/api';
import {
  voiceSettingsManager,
  type AudioInputMode,
  type VoiceApplicationSettings,
} from '@/services/voice.settings.service';
import type { ToastService } from '@/services/services';
import type {
  SttHandlerInstance,
  MicPermissionStatusType,
  TranscriptionData,
  SttHandlerErrorPayload
} from '../types';

// Constants
const MIN_AUDIO_BLOB_SIZE_BYTES = 200;
const PREFERRED_MIME_TYPE_BASE = 'audio/webm';
const DEFAULT_CONTINUOUS_PAUSE_TIMEOUT_MS = 6500;
const DEFAULT_CONTINUOUS_SILENCE_SEND_DELAY_MS = 2500;
const DEFAULT_MIN_WHISPER_SEGMENT_S = 0.75;
const DEFAULT_MAX_SEGMENT_DURATION_S = 28;
const PTT_MAX_DURATION_S = 120;
const MIN_CONTINUOUS_PAUSE_TIMEOUT_MS = 4500;
const MIN_CONTINUOUS_SILENCE_SEND_DELAY_MS = 1500;
const CONTINUOUS_SILENCE_RMS_THRESHOLD = 0.06;
const CONTINUOUS_SILENCE_ENERGY_THRESHOLD = 14;
const CONTINUOUS_SILENCE_CHECK_INTERVAL_MS = 250;
const CONTINUOUS_SILENCE_STABILITY_MS = 1200;

interface WhisperSpeechHandlerProps {
  settings: VoiceApplicationSettings;
  audioInputMode: AudioInputMode;
  activeStream: MediaStream | null;
  analyser: AnalyserNode | null;
  parentIsProcessingLLM: boolean;
  currentMicPermission: MicPermissionStatusType;
}

const props = withDefaults(defineProps<WhisperSpeechHandlerProps>(), {
  activeStream: null,
  analyser: null,
  parentIsProcessingLLM: false,
});

const emit = defineEmits<{
  (e: 'handler-ready', handlerId: 'whisper', api: SttHandlerInstance): void;
  (e: 'handler-unmounted', handlerId: 'whisper'): void;
  (e: 'transcription', data: TranscriptionData): void;
  (e: 'processing-audio', isProcessingAudio: boolean): void;
  (e: 'is-listening-for-wake-word', isListening: boolean): void;
  (e: 'wake-word-detected'): void;
  (e: 'error', payload: SttHandlerErrorPayload): void;
}>();

const toast = inject<ToastService>('toast');

const _isMediaRecorderActive = ref(false);
const _isTranscribingSegment = ref(false);
const _recordingSegmentSeconds = ref(0);
const _audioChunks: Ref<Blob[]> = ref([]);
const _localMicPermission = ref<MicPermissionStatusType>(props.currentMicPermission);

const _speechOccurredInSegment = ref(false);
const _isSilencePauseDetected = ref(false);
const _silencePauseCountdownMs = ref(0);

const _isAbortingOperation = ref(false);

let mediaRecorderInstance: MediaRecorder | null = null;
let recordingSegmentTimerId: ReturnType<typeof setInterval> | null = null;
let continuousSilenceMonitorId: ReturnType<typeof setInterval> | null = null;
let silencePauseCountdownTimerId: ReturnType<typeof setTimeout> | null = null;

const isPttMode = computed<boolean>(() => props.audioInputMode === 'push-to-talk');
const isEffectiveContinuous = computed<boolean>(
  () => props.audioInputMode === 'continuous' || props.audioInputMode === 'voice-activation'
);

const isActivelyProcessing = computed<boolean>(
  () => _isMediaRecorderActive.value || _isTranscribingSegment.value
);

const preferredMimeType = computed<string>(() => {
  if (typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported) {
    return PREFERRED_MIME_TYPE_BASE;
  }
  const typesToCheck = [
    `${PREFERRED_MIME_TYPE_BASE};codecs=opus`, 'audio/ogg;codecs=opus',
    `${PREFERRED_MIME_TYPE_BASE};codecs=pcm`, 'audio/wav',
    PREFERRED_MIME_TYPE_BASE, 'audio/mp4',
  ];
  for (const type of typesToCheck) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return PREFERRED_MIME_TYPE_BASE;
});

watch(isActivelyProcessing, (newVal) => {
  emit('processing-audio', newVal);
});
watch(_localMicPermission, (newVal) => {
    if (newVal === 'granted' && isEffectiveContinuous.value && !isActivelyProcessing.value && !props.parentIsProcessingLLM) {
        console.log('[WSH] Mic permission granted and conditions met for continuous mode, attempting to start.');
        api.startListening(false); // False for forVadCommandIgnored
    } else if (newVal !== 'granted' && isActivelyProcessing.value) {
        console.warn('[WSH] Mic permission lost. Stopping active Whisper handler operations.');
        api.stopAll(true);
    }
});

const _clearRecordingSegmentTimer = (): void => {
  if (recordingSegmentTimerId) clearInterval(recordingSegmentTimerId);
  recordingSegmentTimerId = null;
  _recordingSegmentSeconds.value = 0;
};

const _stopContinuousSilenceMonitor = (): void => {
  if (continuousSilenceMonitorId) clearInterval(continuousSilenceMonitorId);
  continuousSilenceMonitorId = null;
  if (silencePauseCountdownTimerId) clearTimeout(silencePauseCountdownTimerId);
  silencePauseCountdownTimerId = null;
  _isSilencePauseDetected.value = false;
  _silencePauseCountdownMs.value = 0;
};

const _startContinuousSilenceMonitor = (): void => {
  if (!props.analyser || !props.activeStream?.active || !_isMediaRecorderActive.value || !isEffectiveContinuous.value) {
    return;
  }
  _stopContinuousSilenceMonitor();
  _speechOccurredInSegment.value = false;

  const analyser = props.analyser;
  const continuousPauseTimeoutSetting = props.settings.continuousModePauseTimeoutMs ?? DEFAULT_CONTINUOUS_PAUSE_TIMEOUT_MS;
  const silenceSendDelaySetting = props.settings.continuousModeSilenceSendDelayMs ?? DEFAULT_CONTINUOUS_SILENCE_SEND_DELAY_MS;

  const continuousPauseTimeout = Math.max(continuousPauseTimeoutSetting, MIN_CONTINUOUS_PAUSE_TIMEOUT_MS);
  const silenceSendDelay = Math.max(silenceSendDelaySetting, MIN_CONTINUOUS_SILENCE_SEND_DELAY_MS);

  const frequencyData = new Uint8Array(analyser.frequencyBinCount);
  const timeDomainDataLength = Math.max(analyser.fftSize, analyser.frequencyBinCount * 2, 32);
  const timeDomainData = new Uint8Array(timeDomainDataLength);

  let lastSpeechDetectedAt = Date.now();
  let countdownStartedAt: number | null = null;
  let silenceBelowThresholdSince: number | null = null;

  continuousSilenceMonitorId = setInterval(() => {
    if (!props.analyser || !_isMediaRecorderActive.value || !isEffectiveContinuous.value) {
      _stopContinuousSilenceMonitor();
      return;
    }

    analyser.getByteTimeDomainData(timeDomainData);
    let sumSquares = 0;
    for (let i = 0; i < timeDomainData.length; i += 1) {
      const centered = (timeDomainData[i] - 128) / 128;
      sumSquares += centered * centered;
    }
    const rms = Math.sqrt(sumSquares / timeDomainData.length);

    analyser.getByteFrequencyData(frequencyData);
    let energyTotal = 0;
    for (let i = 0; i < frequencyData.length; i += 1) {
      energyTotal += frequencyData[i];
    }
    const avgEnergy = energyTotal / (frequencyData.length || 1);

    const speechDetected = rms >= CONTINUOUS_SILENCE_RMS_THRESHOLD || avgEnergy >= CONTINUOUS_SILENCE_ENERGY_THRESHOLD;
    const now = Date.now();

    if (speechDetected) {
      _speechOccurredInSegment.value = true;
      lastSpeechDetectedAt = now;
      silenceBelowThresholdSince = null;
      if (_isSilencePauseDetected.value) {
        if (silencePauseCountdownTimerId) clearTimeout(silencePauseCountdownTimerId);
        silencePauseCountdownTimerId = null;
        _isSilencePauseDetected.value = false;
        _silencePauseCountdownMs.value = 0;
        countdownStartedAt = null;
        console.log('[WSH] Speech resumed during silence countdown. Countdown cancelled.');
      }
      return;
    }

    if (!_speechOccurredInSegment.value) {
      return;
    }

    if (silenceBelowThresholdSince === null) {
      silenceBelowThresholdSince = now;
    }

    const silenceStableForMs = now - silenceBelowThresholdSince;
    if (silenceStableForMs < CONTINUOUS_SILENCE_STABILITY_MS) {
      return;
    }

    const silentForMs = now - lastSpeechDetectedAt;

    if (_isSilencePauseDetected.value) {
      if (countdownStartedAt !== null) {
        const remaining = Math.max(0, silenceSendDelay - (now - countdownStartedAt));
        _silencePauseCountdownMs.value = remaining;
      }
      return;
    }

    if (silentForMs >= continuousPauseTimeout) {
      _isSilencePauseDetected.value = true;
      countdownStartedAt = now;
      _silencePauseCountdownMs.value = silenceSendDelay;
      silenceBelowThresholdSince = now;
      console.log(`[WSH] Silence detected. Sending segment in ${silenceSendDelay / 1000}s.`);
      if (silencePauseCountdownTimerId) clearTimeout(silencePauseCountdownTimerId);
      silencePauseCountdownTimerId = setTimeout(() => {
        if (_isSilencePauseDetected.value) {
          console.log('[WSH] Silence countdown finished. Finalizing segment.');
          _stopMediaRecorderAndFinalize();
        }
        _isSilencePauseDetected.value = false;
        _silencePauseCountdownMs.value = 0;
        countdownStartedAt = null;
        silencePauseCountdownTimerId = null;
        silenceBelowThresholdSince = null;
      }, silenceSendDelay);
    }
  }, CONTINUOUS_SILENCE_CHECK_INTERVAL_MS);
};

const _stopMediaRecorderAndFinalize = (): void => {
  if (mediaRecorderInstance && _isMediaRecorderActive.value) {
    console.log('[WSH] Stopping MediaRecorder to finalize segment.');
    mediaRecorderInstance.stop();
  } else {
    console.log('[WSH] _stopMediaRecorderAndFinalize called but MediaRecorder not active or not instance.');
    _clearRecordingSegmentTimer();
    if (isEffectiveContinuous.value) _stopContinuousSilenceMonitor();
  }
};

const _processRecordedSegment = async (): Promise<void> => {
  _isMediaRecorderActive.value = false;

  if (_isAbortingOperation.value) {
    _isAbortingOperation.value = false;
    _audioChunks.value = [];
    _clearRecordingSegmentTimer();
    if (isEffectiveContinuous.value) _stopContinuousSilenceMonitor();
    console.log('[WSH] Segment processing aborted.');
    return;
  }

  const localSpeechOccurred = _speechOccurredInSegment.value;
  const segmentDurationS = _recordingSegmentSeconds.value;

  _clearRecordingSegmentTimer();
  if (isEffectiveContinuous.value) _stopContinuousSilenceMonitor();

  const currentAudioDataChunks = [..._audioChunks.value];
  _audioChunks.value = [];

  if (currentAudioDataChunks.length > 0) {
    const audioBlob = new Blob(currentAudioDataChunks, { type: mediaRecorderInstance?.mimeType || preferredMimeType.value });
    const minSegmentDurationS = props.settings.minWhisperSegmentDurationS ?? DEFAULT_MIN_WHISPER_SEGMENT_S;
    const shouldTranscribe = isPttMode.value || (isEffectiveContinuous.value && localSpeechOccurred);

    if (shouldTranscribe && audioBlob.size > MIN_AUDIO_BLOB_SIZE_BYTES && segmentDurationS >= minSegmentDurationS) {
      _isTranscribingSegment.value = true;
      await _transcribeSegmentWithWhisper(audioBlob, segmentDurationS);
    } else {
      console.log(`[WSH] Segment not transcribed. Speech Occurred: ${localSpeechOccurred}, Blob Size: ${audioBlob.size}, Duration: ${segmentDurationS}s`);
      _isTranscribingSegment.value = false;
    }
  } else {
    console.log('[WSH] No audio chunks to process for transcription.');
    _isTranscribingSegment.value = false;
  }

  if (isEffectiveContinuous.value && _localMicPermission.value === 'granted' && !props.parentIsProcessingLLM && !_isMediaRecorderActive.value && !_isTranscribingSegment.value) {
    console.log('[WSH] Conditions met for restarting continuous mode after segment processing.');
    await nextTick();
    api.startListening(false); // Pass false for _forVADCommandIgnored
  } else if (isEffectiveContinuous.value && _localMicPermission.value !== 'granted') {
    console.warn("[WSH] Cannot restart continuous mode: microphone permission not granted.");
  } else if (isEffectiveContinuous.value && props.parentIsProcessingLLM) {
    console.log("[WSH] Continuous mode restart deferred: LLM is processing.");
  }
};

const startListeningInternal = async (_forVADCommandIgnored: boolean = false): Promise<boolean> => {
  if (_isMediaRecorderActive.value) {
    console.log('[WSH] startListening called but MediaRecorder already active.');
    return true;
  }
  if (_localMicPermission.value !== 'granted' || !props.activeStream) {
    const message = _localMicPermission.value !== 'granted'
      ? 'Microphone permission not granted.'
      : 'No active audio stream available.';
    emit('error', { type: 'permission', message, fatal: true });
    return false;
  }
  if (props.parentIsProcessingLLM && !isPttMode.value) {
    console.log('[WSH] Start listening deferred: LLM is processing and not in PTT mode.');
    return false;
  }

  _isAbortingOperation.value = false;
  _audioChunks.value = [];
  _speechOccurredInSegment.value = false;

  try {
    mediaRecorderInstance = new MediaRecorder(props.activeStream, { mimeType: preferredMimeType.value });
    console.log(`[WSH] MediaRecorder instance created with MIME type: ${mediaRecorderInstance.mimeType}`);
  } catch (e: any) {
    emit('error', { type: 'recorder', message: `Failed to create MediaRecorder: ${e.message}. Attempted MIME: ${preferredMimeType.value}`, code: e.name, fatal: true });
    return false;
  }

  mediaRecorderInstance.ondataavailable = (event: BlobEvent) => {
    if (event.data.size > 0) _audioChunks.value.push(event.data);
  };

  mediaRecorderInstance.onstop = async () => {
    _isMediaRecorderActive.value = false;
    console.log('[WSH] MediaRecorder stopped. Processing segment...');
    await _processRecordedSegment();
  };

  mediaRecorderInstance.onerror = (event: Event) => {
    const error = (event as any).error || new Error('Unknown MediaRecorder error');
    console.error(`[WSH] MediaRecorder error: ${error.name} - ${error.message}`);
    emit('error', { type: 'recorder', message: `MediaRecorder error: ${error.name} - ${error.message}`, code: error.name, fatal: true });
    _isMediaRecorderActive.value = false;
    _clearRecordingSegmentTimer();
    if (isEffectiveContinuous.value) _stopContinuousSilenceMonitor();
  };

  try {
    const timeslice = isEffectiveContinuous.value ? 250 : undefined;
    mediaRecorderInstance.start(timeslice);
    _isMediaRecorderActive.value = true;
    console.log(`[WSH] MediaRecorder started. Mode: ${props.audioInputMode}. Timeslice: ${timeslice || 'none'}`);
    _startRecordingSegmentTimer();
    if (isEffectiveContinuous.value) _startContinuousSilenceMonitor();
    return true;
  } catch (e: any) {
     console.error(`[WSH] Error starting MediaRecorder: ${e.name} - ${e.message}`);
     emit('error', { type: 'recorder', message: `Error starting MediaRecorder: ${e.message}`, code: e.name, fatal: true });
     _isMediaRecorderActive.value = false;
     return false;
  }
};

const stopListeningInternal = async (abort: boolean = false): Promise<void> => {
  console.log(`[WSH] stopListeningInternal called. Abort: ${abort}`);
  if (abort) {
    _isAbortingOperation.value = true;
  }
  _stopMediaRecorderAndFinalize();
};

const _transcribeSegmentWithWhisper = async (audioBlob: Blob, durationS: number): Promise<void> => {
  if (props.parentIsProcessingLLM && !isPttMode.value) {
    console.log('[WSH] Transcription skipped: LLM is processing (and not PTT mode).');
    _isTranscribingSegment.value = false;
    if (isEffectiveContinuous.value && _localMicPermission.value === 'granted' && !_isMediaRecorderActive.value) {
      await nextTick(); api.startListening(false); // Pass false for _forVADCommandIgnored
    }
    return;
  }

  console.log(`[WSH] Transcribing segment of ${durationS.toFixed(1)}s, size: ${(audioBlob.size / 1024).toFixed(1)}KB`);
  _isTranscribingSegment.value = true;

  try {
    const formData = new FormData();
    const fileName = `audio-${Date.now()}.${(mediaRecorderInstance?.mimeType || preferredMimeType.value).split('/')[1]?.split(';')[0] || 'webm'}`;
    formData.append('audio', audioBlob, fileName);
    if (props.settings.speechLanguage) {
      formData.append('language', props.settings.speechLanguage.substring(0, 2));
    }
    if (props.settings.sttOptions?.prompt) {
      formData.append('prompt', props.settings.sttOptions.prompt);
    }
    if (typeof props.settings.sttOptions?.temperature === 'number') {
        formData.append('temperature', props.settings.sttOptions.temperature.toString());
    }

    const response = await speechAPI.transcribe(formData);
    /**
     * @remark The `TranscriptionResponseFE` type from `utils/api.ts` should ideally define an optional `language` field
     * if the backend API for speech transcription can return the detected language.
     * Example: `interface TranscriptionResponseFE { transcription: string; language?: string; ... }`
     */
    const responseData = response.data as Partial<TranscriptionResponseFE & { message?: string; language?: string }>;

    if (responseData?.credits) {
      voiceSettingsManager.updateCreditsSnapshot(responseData.credits);
    }


    if (responseData && typeof responseData.transcription === 'string') {
      const detectedLanguage = responseData.language || props.settings.speechLanguage;
      voiceSettingsManager.handleDetectedSpeechLanguage(detectedLanguage);
      if (responseData.transcription.trim()) {
        emit('transcription', {
          text: responseData.transcription.trim(),
          isFinal: true,
          timestamp: Date.now(),
          durationMs: Math.round(durationS * 1000),
          lang: detectedLanguage
        });
      } else if (isPttMode.value) {
        toast?.add({ type: 'info', title: 'No Speech Detected', message: 'Whisper API found no speech in the audio.', duration: 3000 });
      }
       console.log(`[WSH] Transcription received: "${responseData.transcription.trim()}" Language: ${detectedLanguage}`);
    } else {
      throw new Error(responseData?.message || 'Whisper API returned invalid or empty data.');
    }
  } catch (error: any) {
    if (error?.response?.data?.credits) {
      voiceSettingsManager.updateCreditsSnapshot(error.response.data.credits as CreditSnapshotFE);
    }
    if (error?.response?.data?.error === 'SPEECH_CREDITS_EXHAUSTED') {
      console.warn('[WSH] Speech credits exhausted. Switching to browser STT.');
      voiceSettingsManager.updateSetting('sttPreference', 'browser_webspeech_api');
      emit('error', {
        type: 'api',
        message: error.response.data?.message || 'Speech recognition credits exhausted. Using browser STT.',
        code: 'SPEECH_CREDITS_EXHAUSTED',
        fatal: false,
      });
    } else {
      let errorMessage = 'Transcription API error.';
      let errorCode = 'API_ERROR';
      if (error.response) {
        errorMessage = error.response.data?.error?.message || error.response.data?.message || error.message;
        errorCode = error.response.status?.toString() || 'API_RESPONSE_ERROR';
      } else if (error.message) {
        errorMessage = error.message;
        errorCode = error.code || 'NETWORK_ERROR';
      }
      console.error(`[WSH] Whisper API error: ${errorCode} - ${errorMessage}`);
      emit('error', {
        type: 'api',
        message: errorMessage,
        code: errorCode,
        fatal: false,
      });
    }
  } finally {
    _isTranscribingSegment.value = false;
  }
};

const _startRecordingSegmentTimer = (): void => {
  _clearRecordingSegmentTimer();
  _recordingSegmentSeconds.value = 0;
  const maxDurationS = isPttMode.value
    ? PTT_MAX_DURATION_S
    : (props.settings.maxSegmentDurationS ?? DEFAULT_MAX_SEGMENT_DURATION_S);

  recordingSegmentTimerId = setInterval(() => {
    _recordingSegmentSeconds.value += 0.1;
    if (_isMediaRecorderActive.value) {
      if (_recordingSegmentSeconds.value >= maxDurationS) {
        console.log(`[WSH] Max recording duration (${maxDurationS}s) reached for mode: ${props.audioInputMode}. Stopping recorder.`);
        if (isPttMode.value) {
            toast?.add({ type: 'info', title: 'Max Recording Time', message: `Push-to-Talk limit (${maxDurationS}s) reached.` });
        }
        _stopMediaRecorderAndFinalize();
      }
    } else {
      _clearRecordingSegmentTimer();
    }
  }, 100);
};

const api: SttHandlerInstance = {
  isActive: readonly(isActivelyProcessing),
  isListeningForWakeWord: readonly(ref(false)),
  hasPendingTranscript: computed(() => false),
  pendingTranscript: readonly(ref('')),
  startListening: async (_forVADCommandIgnored: boolean = false) => {
    return startListeningInternal(_forVADCommandIgnored);
  },
  stopListening: async (abort: boolean = false) => {
    return stopListeningInternal(abort);
  },
  reinitialize: async () => {
    console.log('[WSH] Reinitializing Whisper handler...');
    await api.stopAll(true);
    await nextTick();
    console.log('[WSH] Whisper handler reinitialized.');
  },
  stopAll: async (abort: boolean = true) => {
    console.log(`[WSH] stopAll called. Abort: ${abort}`);
    _isAbortingOperation.value = abort;
    if (mediaRecorderInstance && _isMediaRecorderActive.value) {
      mediaRecorderInstance.stop();
    } else if (abort) {
      _audioChunks.value = [];
      _isTranscribingSegment.value = false;
    }
    _clearRecordingSegmentTimer();
    _stopContinuousSilenceMonitor();
  },
  clearPendingTranscript: () => { /* No-op */ },
};

onMounted(() => {
  _localMicPermission.value = props.currentMicPermission;
  emit('handler-ready', 'whisper', api);
  emit('is-listening-for-wake-word', false);

  if (isEffectiveContinuous.value && _localMicPermission.value === 'granted' && !props.parentIsProcessingLLM) {
    console.log('[WSH] Component mounted. Auto-starting continuous mode.');
    api.startListening(false); // Pass false for _forVADCommandIgnored
  }
});

onBeforeUnmount(async () => {
  console.log('[WSH] WhisperSpeechHandler unmounting. Stopping all activity.');
  await api.stopAll(true);
  mediaRecorderInstance = null;
  emit('handler-unmounted', 'whisper');
});

watch(() => props.currentMicPermission, (newStatus) => {
  if (_localMicPermission.value !== newStatus) {
    console.log(`[WSH] Mic permission changed externally to: ${newStatus}`);
    _localMicPermission.value = newStatus;
  }
});

watch(() => props.parentIsProcessingLLM, async (isLLMProcessing) => {
  if (!isLLMProcessing && isEffectiveContinuous.value && _localMicPermission.value === 'granted' && !isActivelyProcessing.value) {
    console.log('[WSH] LLM finished processing. Attempting to restart continuous listening.');
    await nextTick();
    api.startListening(false); // Pass false for _forVADCommandIgnored
  } else if (isLLMProcessing && isActivelyProcessing.value && !isPttMode.value) {
    console.log('[WSH] LLM started processing. Stopping continuous Whisper recording.');
    await api.stopListening(false);
  }
});

watch(() => props.activeStream, async (newStream, oldStream) => {
  if (newStream !== oldStream) {
    console.log(`[WSH] Active audio stream changed. Old: ${oldStream?.id}, New: ${newStream?.id}. Reinitializing.`);
    await api.reinitialize();
  }
}, { immediate: false });

watch(() => props.audioInputMode, async (newMode, oldMode) => {
  if (newMode !== oldMode) {
    console.log(`[WSH] Audio input mode changed from ${oldMode} to ${newMode}. Reinitializing.`);
    await api.reinitialize();
  }
});

</script>
