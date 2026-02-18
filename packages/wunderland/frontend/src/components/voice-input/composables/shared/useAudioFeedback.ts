// File: frontend/src/components/voice-input/composables/shared/useAudioFeedback.ts
/**
 * @file useAudioFeedback.ts
 * @description Manages audio feedback (beeps) for voice input interactions.
 * Handles loading, playing, and cleanup of audio resources.
 *
 * @version 1.2.1
 * @updated 2025-06-05 - Added beepNeutralSound with actual asset path.
 * - Confirmed reactive handling of volume/enabled options.
 */

import { ref, onUnmounted, readonly, watch, isRef } from 'vue';
import type { Ref, WatchSource, DeepReadonly } from 'vue'; // Changed Readonly to DeepReadonly for refs for stricter typing

import beepInSmoothUrl from '@/assets/sounds/beep_in_smooth.mp3';
import beepOutSmoothUrl from '@/assets/sounds/beep_out_smooth.mp3';
import beepNeutralSmoothUrl from '@/assets/sounds/beep_neutral_smooth.mp3'; // User provided path

export interface AudioFeedbackOptions {
  volume?: number | Ref<number | undefined>;
  enabled?: boolean | Ref<boolean | undefined>;
}

export interface AudioFeedbackInstance {
  beepInSound: DeepReadonly<Ref<AudioBuffer | null>>;
  beepOutSound: DeepReadonly<Ref<AudioBuffer | null>>;
  beepNeutralSound: DeepReadonly<Ref<AudioBuffer | null>>;
  audioContext: DeepReadonly<Ref<AudioContext | null>>;
  isLoading: DeepReadonly<Ref<boolean>>;
  loadError: DeepReadonly<Ref<string | null>>;
  loadSounds: () => Promise<void>;
  playSound: (buffer: AudioBuffer | null, volumeOverride?: number) => void;
  setVolume: (newVolume: number) => void;
  setEnabled: (newEnabledState: boolean) => void;
  cleanup: () => void;
}

export function useAudioFeedback(
  options: AudioFeedbackOptions = {}
): AudioFeedbackInstance {
  const _audioContext = ref<AudioContext | null>(null);
  const _beepInSound = ref<AudioBuffer | null>(null);
  const _beepOutSound = ref<AudioBuffer | null>(null);
  const _beepNeutralSound = ref<AudioBuffer | null>(null);

  const _currentVolumeSourceIsRef = isRef(options.volume);
  const _isEnabledSourceIsRef = isRef(options.enabled);

  const _currentVolume = ref(isRef(options.volume) ? (options.volume.value ?? 0.7) : (options.volume ?? 0.7));
  const _isEnabled = ref(isRef(options.enabled) ? (options.enabled.value ?? true) : (options.enabled ?? true));


  const _isLoading = ref(false);
  const _loadError = ref<string | null>(null);

  const _getAudioContext = async (): Promise<AudioContext | null> => {
    if (typeof window === 'undefined' || !(window.AudioContext || (window as any).webkitAudioContext)) {
      console.warn('[AudioFeedback] AudioContext not supported.');
      _loadError.value = 'AudioContext not supported.';
      return null;
    }
    const AudioContextConstructor = window.AudioContext || (window as any).webkitAudioContext;
    if (!_audioContext.value || _audioContext.value.state === 'closed') {
      try {
        _audioContext.value = new AudioContextConstructor();
         console.log('[AudioFeedback] New AudioContext created.');
      } catch (e: any) {
        console.error('[AudioFeedback] Failed to create AudioContext:', e.message);
        _loadError.value = `Failed to create AudioContext: ${e.message}`;
        return null;
      }
    }
    if (_audioContext.value.state === 'suspended') {
      try {
        await _audioContext.value.resume();
        console.log('[AudioFeedback] AudioContext resumed.');
      } catch (e: any) {
         console.warn('[AudioFeedback] Failed to resume suspended AudioContext:', e.message);
      }
    }
    return _audioContext.value;
  };

  const _loadSoundFile = async (url: string, soundName: string): Promise<AudioBuffer | null> => {
    const ctx = await _getAudioContext();
    if (!ctx) {
      _loadError.value = _loadError.value || `Cannot load "${soundName}": AudioContext unavailable.`;
      return null;
    }
    try {
      console.log(`[AudioFeedback] Loading sound "${soundName}" from: ${url}`);
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Failed to fetch "${soundName}": HTTP ${response.status} ${response.statusText}`);
      const arrayBuffer = await response.arrayBuffer();
      if (arrayBuffer.byteLength < 100) throw new Error(`File "${soundName}" seems too small or empty (${arrayBuffer.byteLength} bytes).`);
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
      console.log(`[AudioFeedback] Sound "${soundName}" loaded successfully.`);
      return audioBuffer;
    } catch (error: any) {
      console.error(`[AudioFeedback] Error loading sound "${soundName}":`, error.message);
      _loadError.value = _loadError.value || `Error loading ${soundName}: ${error.message}`; // Append if multiple errors
      return null;
    }
  };

  const loadSounds = async (): Promise<void> => {
    if (_isLoading.value) {
        console.log('[AudioFeedback] Sound loading already in progress.');
        return;
    }
    _isLoading.value = true;
    _loadError.value = null;
    await _getAudioContext();
    if (!_audioContext.value) {
      console.error("[AudioFeedback] Cannot load sounds, AudioContext failed to initialize.");
      _isLoading.value = false; return;
    }
    const [beepIn, beepOut, beepNeutral] = await Promise.all([
      _loadSoundFile(beepInSmoothUrl, 'beepInSmooth'),
      _loadSoundFile(beepOutSmoothUrl, 'beepOutSmooth'),
      _loadSoundFile(beepNeutralSmoothUrl, 'beepNeutralSmooth'),
    ]);
    _beepInSound.value = beepIn;
    _beepOutSound.value = beepOut;
    _beepNeutralSound.value = beepNeutral;
    if (!beepIn || !beepOut || !beepNeutral) {
      console.warn('[AudioFeedback] One or more sounds failed to load. Check loadError for details.');
    } else {
      console.log('[AudioFeedback] All sounds loaded successfully.');
    }
    _isLoading.value = false;
  };

  const playSound = (buffer: AudioBuffer | null, volumeOverride?: number): void => {
    if (!_isEnabled.value || !buffer || !_audioContext.value ) {
      return;
    }
     if (_audioContext.value.state !== 'running') {
        if (_audioContext.value.state === 'suspended') {
            _audioContext.value.resume().catch(e => console.warn('[AudioFeedback] Could not resume context for playback:', e));
        }
        console.warn(`[AudioFeedback] AudioContext not running (state: ${_audioContext.value.state}). Playback may be affected.`);
        // Do not return here, attempt to play anyway if context becomes running
    }

    try {
      const source = _audioContext.value.createBufferSource();
      const gainNode = _audioContext.value.createGain();
      source.buffer = buffer;
      source.connect(gainNode);
      gainNode.connect(_audioContext.value.destination);
      const playVolume = volumeOverride !== undefined ? volumeOverride : (_currentVolume.value ?? 0.7);
      gainNode.gain.setValueAtTime(Math.max(0, Math.min(1, playVolume)), _audioContext.value.currentTime);
      source.start(0);
      source.onended = () => { source.disconnect(); gainNode.disconnect(); };
    } catch (error: any) {
      console.error('[AudioFeedback] Error playing sound:', error.message);
    }
  };

  const setVolume = (newVolume: number): void => {
    if (_currentVolumeSourceIsRef) {
      console.warn("[AudioFeedback] Volume was provided as a Ref. Update the original Ref directly instead of calling setVolume.");
    } else {
      _currentVolume.value = Math.max(0, Math.min(1, newVolume));
    }
  };

  const setEnabled = (newEnabledState: boolean): void => {
     if (_isEnabledSourceIsRef) {
      console.warn("[AudioFeedback] Enabled state was provided as a Ref. Update the original Ref directly instead of calling setEnabled.");
    } else {
      _isEnabled.value = newEnabledState;
    }
  };

  const cleanup = (): void => {
    console.log('[AudioFeedback] Cleaning up audio resources...');
    if (_audioContext.value && _audioContext.value.state !== 'closed') {
      _audioContext.value.close().catch(e => console.error('[AudioFeedback] Error closing AudioContext:', e.message));
    }
    _audioContext.value = null;
    _beepInSound.value = null;
    _beepOutSound.value = null;
    _beepNeutralSound.value = null;
  };

  onUnmounted(cleanup);

  if (_currentVolumeSourceIsRef) {
    watch(options.volume as WatchSource<number | undefined>, (newVol) => {
      _currentVolume.value = newVol ?? 0.7;
       console.log(`[AudioFeedback] Volume reactively updated to: ${_currentVolume.value}`);
    }, { immediate: true });
  }
  if (_isEnabledSourceIsRef) {
    watch(options.enabled as WatchSource<boolean | undefined>, (newEnabled) => {
      _isEnabled.value = newEnabled ?? true;
       console.log(`[AudioFeedback] Enabled state reactively updated to: ${_isEnabled.value}`);
    }, { immediate: true });
  }

  return {
    beepInSound: readonly(_beepInSound),
    beepOutSound: readonly(_beepOutSound),
    beepNeutralSound: readonly(_beepNeutralSound),
    audioContext: readonly(_audioContext),
    isLoading: readonly(_isLoading),
    loadError: readonly(_loadError),
    loadSounds,
    playSound,
    setVolume,
    setEnabled,
    cleanup,
  };
}