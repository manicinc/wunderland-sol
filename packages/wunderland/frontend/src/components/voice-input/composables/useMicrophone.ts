// File: frontend/src/components/voice-input/composables/useMicrophone.ts
/**
 * @file useMicrophone.ts
 * @description Composable for managing microphone access, MediaStream, AudioContext,
 * and a basic AnalyserNode for activity detection.
 * It handles permissions, device selection, and resource cleanup.
 *
 * @module composables/useMicrophone
 * @version 1.2.1 - Enhanced permission checks, stream re-acquisition logic, logging, and onUnmounted cleanup.
 */

import { ref, computed, shallowRef, type Ref, type ShallowRef, readonly, onUnmounted } from 'vue';
import type { ToastService } from '../../../services/services';
import type { VoiceApplicationSettings } from '@/services/voice.settings.service';

declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext;
  }
  // PermissionName is defined in the TypeScript DOM library; no need to redefine it here.
}


export interface UseMicrophoneOptions {
  settings: Readonly<Ref<VoiceApplicationSettings>>;
  toast?: ToastService;
  onPermissionUpdateGlobally: (
    status: 'prompt' | 'granted' | 'denied' | 'error'
  ) => void;
}

export interface UseMicrophoneReturn {
  activeStream: Readonly<ShallowRef<MediaStream | null>>;
  audioContext: Readonly<ShallowRef<AudioContext | null>>;
  analyser: Readonly<ShallowRef<AnalyserNode | null>>;
  permissionStatus: Readonly<Ref<'prompt' | 'granted' | 'denied' | 'error' | ''>>;
  permissionMessage: Readonly<Ref<string>>;
  micAccessInitiallyChecked: Readonly<Ref<boolean>>;
  checkCurrentPermission: () => Promise<'prompt' | 'granted' | 'denied' | 'error'>;
  requestMicrophonePermissionsAndGetStream: (attemptCloseExisting?: boolean) => Promise<MediaStream | null>;
  ensureMicrophoneAccessAndStream: () => Promise<boolean>;
  releaseAllMicrophoneResources: () => Promise<void>;
}

const ACTIVITY_ANALYSER_FFT_SIZE = 256;
const ACTIVITY_ANALYSER_SMOOTHING = 0.7;

export function useMicrophone(options: UseMicrophoneOptions): UseMicrophoneReturn {
  const { settings, toast, onPermissionUpdateGlobally } = options;

  const _activeStream = shallowRef<MediaStream | null>(null);
  const _audioContext = shallowRef<AudioContext | null>(null);
  const _analyser = shallowRef<AnalyserNode | null>(null);
  const _microphoneSourceNode = shallowRef<MediaStreamAudioSourceNode | null>(null);

  const _permissionStatus = ref<'prompt' | 'granted' | 'denied' | 'error' | ''>('');
  const _permissionMessage = ref<string>('');
  const _micAccessInitiallyChecked = ref<boolean>(false);

  const selectedAudioDeviceId = computed<string | null>(() => settings.value.selectedAudioInputDeviceId);

  const _updatePermissionState = (status: 'prompt' | 'granted' | 'denied' | 'error', message: string = '') => {
    if (_permissionStatus.value !== status) {
        _permissionStatus.value = status;
        onPermissionUpdateGlobally(status); // Call the global update callback
    }
    _permissionMessage.value = message;
    if (status === 'granted') {
        console.log('[useMicrophone] Permission status updated to GRANTED.');
    } else if (status !== 'prompt') {
        console.warn(`[useMicrophone] Permission status updated to ${status.toUpperCase()}. Message: ${message}`);
    }
  };

  const _closeExistingAudioResources = async (preserveContext: boolean = false): Promise<void> => {
    console.log('[useMicrophone] Closing existing audio stream resources...');
    if (_activeStream.value) {
      _activeStream.value.getTracks().forEach(track => {
        track.stop();
        console.log(`[useMicrophone] Stopped track: ${track.label} (ID: ${track.id})`);
      });
      _activeStream.value = null;
    }
    if (_microphoneSourceNode.value) {
      try { _microphoneSourceNode.value.disconnect(); } catch (e) { console.warn('[useMicrophone] Error disconnecting microphone source node:', e); }
      _microphoneSourceNode.value = null;
    }
    if (_analyser.value) {
      try { _analyser.value.disconnect(); } catch (e) { console.warn('[useMicrophone] Error disconnecting analyser node:', e); }
      _analyser.value = null;
    }

    if (!preserveContext && _audioContext.value && _audioContext.value.state !== 'closed') {
      try {
        await _audioContext.value.close();
        console.log('[useMicrophone] AudioContext closed.');
      } catch (e) {
        console.warn('[useMicrophone] Error closing previous AudioContext:', e);
      }
      _audioContext.value = null;
    } else if (preserveContext) {
        console.log('[useMicrophone] AudioContext preserved.');
    }
    console.log('[useMicrophone] Audio stream resources (tracks, source, analyser) processed for closure.');
  };

  const checkCurrentPermission = async (): Promise<'prompt' | 'granted' | 'denied' | 'error'> => {
    if (typeof navigator === 'undefined' || !navigator.permissions?.query) {
        _updatePermissionState('error', 'Permissions API not supported by this browser.');
        return 'error';
    }
    try {
        // Ensure 'microphone' is cast to PermissionName if TypeScript is strict
        const permissionQueryResult = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        _micAccessInitiallyChecked.value = true; // Mark that we have checked

        switch (permissionQueryResult.state) {
            case 'granted':
                _updatePermissionState('granted');
                return 'granted';
            case 'prompt':
                _updatePermissionState('prompt', 'Microphone access needs to be granted.');
                return 'prompt';
            case 'denied':
                _updatePermissionState('denied', 'Microphone access was denied. Please enable in browser settings.');
                return 'denied';
            default:
                 // This case should ideally not be reached if typings are correct.
                _updatePermissionState('error', `Unknown microphone permission state: ${permissionQueryResult.state}`);
                return 'error';
        }
    } catch (err) {
        console.error('[useMicrophone] Error querying microphone permission:', err);
        _updatePermissionState('error', 'Error checking microphone permission status.');
        return 'error';
    }
  };

  const requestMicrophonePermissionsAndGetStream = async (
    attemptCloseExisting: boolean = true
  ): Promise<MediaStream | null> => {
    console.log('[useMicrophone] Requesting microphone permission and stream...');
    // Don't set to 'prompt' immediately, let checkCurrentPermission do it if necessary
    // _updatePermissionState('prompt', 'Requesting microphone access...');

    if (attemptCloseExisting) {
      await _closeExistingAudioResources(true); // Close stream resources, preserve context if possible
    }

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      console.error("[useMicrophone] navigator.mediaDevices.getUserMedia is not available.");
      _updatePermissionState('error', 'Media devices API not supported by this browser.');
      toast?.add({ type: 'error', title: 'Browser Incompatible', message: _permissionMessage.value });
      _micAccessInitiallyChecked.value = true;
      return null;
    }

    try {
      const currentPerm = await checkCurrentPermission();
      if (currentPerm === 'denied') {
        toast?.add({ type: 'error', title: 'Mic Access Denied', message: 'Please enable microphone permissions in your browser site settings to use voice input.', duration: 7000 });
        return null; // Don't proceed if already denied
      }
      // If 'prompt', getUserMedia will trigger the prompt. If 'granted', it will proceed.

      const constraints: MediaStreamConstraints = {
        audio: selectedAudioDeviceId.value
          ? { deviceId: { exact: selectedAudioDeviceId.value }, echoCancellation: true, noiseSuppression: true, autoGainControl: true }
          : { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      };
      console.log('[useMicrophone] Attempting to get user media with constraints:', JSON.stringify(constraints.audio));
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      _activeStream.value = stream;

      const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
      if (!_audioContext.value || _audioContext.value.state === 'closed') {
        if (!AudioContextConstructor) {
          throw new Error("AudioContext is not supported in this browser.");
        }
        _audioContext.value = new AudioContextConstructor();
        console.log('[useMicrophone] New AudioContext created.');
      } else if (_audioContext.value.state === 'suspended') {
        // Attempt to resume existing context if it was suspended
        try {
            await _audioContext.value.resume();
            console.log('[useMicrophone] AudioContext resumed.');
        } catch (resumeError) {
            console.warn('[useMicrophone] Failed to resume existing AudioContext, creating new one.', resumeError);
            if (AudioContextConstructor) _audioContext.value = new AudioContextConstructor(); else throw new Error("AudioContext is not supported.");
        }
      }


      _microphoneSourceNode.value = _audioContext.value.createMediaStreamSource(stream);
      
      const newAnalyser = _audioContext.value.createAnalyser();
      newAnalyser.fftSize = ACTIVITY_ANALYSER_FFT_SIZE;
      newAnalyser.smoothingTimeConstant = ACTIVITY_ANALYSER_SMOOTHING;
      newAnalyser.minDecibels = -100; newAnalyser.maxDecibels = 0;
      _analyser.value = newAnalyser;

      _microphoneSourceNode.value.connect(_analyser.value);

      _updatePermissionState('granted', 'Microphone access granted.');
      console.log('[useMicrophone] Microphone access GRANTED. Stream and audio nodes initialized.');
      toast?.add({ type: 'success', title: 'Microphone Ready', message: 'Audio input connected.', duration: 3000 });

      setTimeout(() => { if (_permissionStatus.value === 'granted') _permissionMessage.value = ''; }, 2500);

    } catch (err: any) {
      console.error('[useMicrophone] getUserMedia error:', err.name, err.message, err);
      let specificErrorType: 'denied' | 'error' = 'error';
      let userMessage = `Mic error: ${err.name || 'Unknown'}.`;

      switch(err.name) {
        case 'NotAllowedError': case 'PermissionDeniedError':
          userMessage = 'Microphone access was denied. Please enable it in your browser settings.'; specificErrorType = 'denied'; break;
        case 'NotFoundError': case 'DevicesNotFoundError':
          userMessage = 'No microphone found. Please connect an audio input device.'; break;
        case 'NotReadableError': case 'TrackStartError':
          userMessage = 'Microphone is busy or cannot be read. Another app might be using it, or check hardware.'; break;
        case 'OverconstrainedError': case 'ConstraintNotSatisfiedError':
          userMessage = `Selected microphone doesn't support requested settings. Try default device.`; break;
        case 'SecurityError':
            userMessage = 'Microphone access denied due to security policy (e.g. page not HTTPS, or iframe restrictions).'; specificErrorType = 'denied'; break;
        case 'TypeError': // Often if constraints are malformed, less likely with current setup.
            userMessage = 'Error with microphone configuration (TypeError). Please report this issue.'; break;
        default: userMessage = `An unexpected microphone error occurred: ${err.name || 'Unknown error'}.`;
      }
      _updatePermissionState(specificErrorType, userMessage);
      toast?.add({ type: 'error', title: 'Microphone Access Failed', message: userMessage, duration: 7000 });
      
      await _closeExistingAudioResources(true); // Preserve context if it was created, only stream part failed
      return null;
    } finally {
      _micAccessInitiallyChecked.value = true;
    }
    return _activeStream.value;
  };

  const ensureMicrophoneAccessAndStream = async (): Promise<boolean> => {
    console.log('[useMicrophone] Ensuring microphone access and stream...');
    const currentPerm = await checkCurrentPermission();

    if (currentPerm === 'granted') {
        // If permission is granted, ensure AudioContext is running (browsers might suspend it)
        if (_audioContext.value && _audioContext.value.state === 'suspended') {
            try {
                await _audioContext.value.resume();
                console.log('[useMicrophone] AudioContext resumed during ensure call.');
            } catch (e) {
                console.warn('[useMicrophone] Failed to resume AudioContext:', e);
                // May need to re-create if resume fails persistently
            }
        }

        if (_activeStream.value?.active) {
            const currentTrackSettings = _activeStream.value.getAudioTracks()[0]?.getSettings();
            const currentDeviceId = currentTrackSettings?.deviceId;
            const targetDeviceId = selectedAudioDeviceId.value;
            const deviceMatches = targetDeviceId ? currentDeviceId === targetDeviceId : !currentDeviceId;

            if (deviceMatches) {
                console.log('[useMicrophone] Access and stream already active with correct device.');
                return true;
            }
            console.log(`[useMicrophone] Device mismatch or stream inactive. Current Device: ${currentDeviceId}, Target: ${targetDeviceId}. Re-acquiring stream.`);
        }
    } else if (currentPerm === 'denied' || currentPerm === 'error') {
        console.warn(`[useMicrophone] Cannot ensure stream, permission is ${currentPerm}`);
        if (currentPerm === 'denied') {
             toast?.add({ type: 'error', title: 'Mic Access Denied', message: 'Please enable microphone permissions in your browser site settings.', duration: 7000 });
        }
        return false;
    }
    // If 'prompt', not granted, or stream needs re-acquisition:
    console.log(`[useMicrophone] Attempting to request/re-acquire stream. Current permission: ${currentPerm}`);
    const stream = await requestMicrophonePermissionsAndGetStream(true); // true to close existing stream resources first
    return !!(stream && stream.active);
  };

  const releaseAllMicrophoneResources = async (): Promise<void> => {
    await _closeExistingAudioResources(false); // false to ensure AudioContext is also closed
    // _permissionStatus.value = ''; // Don't reset permission, it's a browser state. Re-check if needed.
    // _micAccessInitiallyChecked.value = false; // Let this persist for the session.
    console.log('[useMicrophone] All microphone resources (including AudioContext) released on demand.');
  };

  // Cleanup on unmount if the composable instance is tied to a component lifecycle
  onUnmounted(async () => {
    console.log('[useMicrophone] useMicrophone composable unmounted. Releasing all resources.');
    await releaseAllMicrophoneResources();
  });

  return {
    activeStream: readonly(_activeStream),
    audioContext: readonly(_audioContext),
    analyser: readonly(_analyser),
    permissionStatus: readonly(_permissionStatus),
    permissionMessage: readonly(_permissionMessage),
    micAccessInitiallyChecked: readonly(_micAccessInitiallyChecked),
    checkCurrentPermission,
    requestMicrophonePermissionsAndGetStream,
    ensureMicrophoneAccessAndStream,
    releaseAllMicrophoneResources,
  };
}