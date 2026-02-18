// File: frontend/src/services/voice.settings.service.ts
/**
 * @file VoiceSettingsService.ts
 * @description Manages all voice-related and core application operational settings.
 * Persists settings to localStorage and provides reactive access.
 * @version 1.5.1
 * @updated 2025-06-05 - Added uiSoundVolume, enableUiSounds, and showStartupHint to settings.
 */

import { reactive, watch, computed, ref, type Ref, type ComputedRef, readonly } from 'vue';
import { useStorage } from '@vueuse/core';
import { ttsService as browserTtsService, type SpeakOptions as BrowserSpeakOptions } from './tts.service';
import { ttsAPI, speechAPI, type TTSVoiceFE, type TTSRequestPayloadFE, type CreditSnapshotFE } from '../utils/api'; // Ensure utils/api path is correct
import type { AgentId } from './agent.service'; // Ensure agent.service path is correct

/**
 * Represents a selectable voice option in the UI, combining browser and API voices.
 */
export interface VoiceOption {
  /** Unique composite ID (e.g., 'browser_voiceURI' or 'openai_voiceModelId'). */
  id: string;
  /** Display name of the voice. */
  name: string;
  /** Language code (BCP 47) of the voice. */
  lang: string;
  /** Provider of the voice ('browser' or 'openai'). */
  provider: 'browser' | 'openai';
  /** The actual ID used by the underlying provider's API (e.g., voiceURI or OpenAI model ID). */
  providerVoiceId: string;
  /** Indicates if this is a default voice for its language/provider. */
  isDefault?: boolean;
  /** Gender of the voice, if specified. */
  gender?: string;
  /** Additional description of the voice, if available. */
  description?: string;
}

/** Defines available audio input modes. */
export type AudioInputMode = 'push-to-talk' | 'continuous' | 'voice-activation';
/** Defines available tutor difficulty levels. */
export type TutorLevel = 'beginner' | 'intermediate' | 'expert';
/** Defines available Speech-to-Text (STT) engine preferences. */
export type STTPreference = 'browser_webspeech_api' | 'whisper_api';
/** Defines available Text-to-Speech (TTS) provider preferences. */
export type TTSProvider = 'browser_tts' | 'openai_tts';

interface TtsLanguageFallbackInfo {
  requestedLang: string;
  resolvedLang: string;
  resolvedVoiceName: string;
  provider: TTSProvider;
}

/**
 * Defines the structure for all application voice and operational settings.
 */
export interface VoiceApplicationSettings {
  // Agent & Interaction Settings
  currentAppMode: AgentId;
  vadWakeWordsBrowserSTT?: readonly string[];
  vadCommandTimeoutMs: number;
  showLiveTranscription?: boolean;
  alwaysShowVoiceVisualization?: boolean;
  preferredCodingLanguage: string;
  defaultMode: AgentId;
  defaultLanguage: string;
  generateDiagrams: boolean;

  // Chat Behavior & Memory
  autoClearChat: boolean;
  useAdvancedMemory: boolean;

  // Language Settings
  responseLanguageMode?: 'auto' | 'fixed' | 'follow-stt'; // How to determine response language
  fixedResponseLanguage?: string; // If mode is 'fixed', which language to use
  sttAutoDetectLanguage?: boolean; // Enable auto language detection for STT
  /** Tracks whether the user manually locked language preferences (prevents auto overrides). */
  languagePreferenceLocked?: boolean;

  // Conversation Context Settings
  conversationContextMode?: 'full' | 'smart' | 'minimal'; // How much context to include
  maxHistoryMessages?: number; // Maximum number of messages to keep in history
  preventRepetition?: boolean; // Actively prevent repeating previous answers

  // Ephemeral Chat Log specific settings
  ephemeralLogMaxCompact: number;
  ephemeralLogMaxExpanded: number;

  // STT (Speech-to-Text) Settings
  sttPreference: STTPreference;
  selectedAudioInputDeviceId: string | null;
  selectedAudioOutputDeviceId?: string | null; // Audio output device for TTS
  speechLanguage: string;
  sttOptions?: {
    prompt?: string;
    temperature?: number;
  };

  // Audio Input & VAD Settings
  audioInputMode: AudioInputMode;
  vadThreshold: number;
  vadSilenceTimeoutMs: number;
  continuousModePauseTimeoutMs: number;
  continuousModeAutoSend: boolean;
  continuousModeListenDuringResponse: boolean; // New setting to control if continuous mode keeps listening while LLM responds
  vadCommandRecognizedPauseMs: number;
  vadSensitivityDb?: number;
  continuousModeSilenceSendDelayMs?: number;
  minWhisperSegmentDurationS?: number;
  maxSegmentDurationS?: number;

  // TTS (Text-to-Speech) Settings
  ttsProvider: TTSProvider;
  selectedTtsVoiceId: string | null;
  ttsVolume: number;
  ttsRate: number;
  ttsPitch: number;
  autoPlayTts: boolean;

  // Application Operational Settings
  costLimit: number;
  defaultTutorLevel?: TutorLevel;

  // Added UI related settings
  /** Volume for UI sound effects (0.0 to 1.0). Optional. */
  uiSoundVolume?: number;
  /** Whether UI sound effects are enabled. Optional. */
  enableUiSounds?: boolean;
  /** Whether to show an initial hint about the current voice mode on startup. Optional. */
  showStartupHint?: boolean;
}

const MIN_CONTINUOUS_MODE_PAUSE_TIMEOUT_MS = 4500;
const MAX_CONTINUOUS_MODE_PAUSE_TIMEOUT_MS = 20000;
const MIN_CONTINUOUS_MODE_SILENCE_SEND_DELAY_MS = 1500;
const MAX_CONTINUOUS_MODE_SILENCE_SEND_DELAY_MS = 7000;
const DEFAULT_CONTINUOUS_MODE_PAUSE_TIMEOUT_MS = 6500;
const DEFAULT_CONTINUOUS_MODE_SILENCE_SEND_DELAY_MS = 2500;

const initialDefaultSettings: Readonly<VoiceApplicationSettings> = Object.freeze({ // Ensured Object.freeze for true readonly
  currentAppMode: 'v_agent' as AgentId,
  preferredCodingLanguage: 'python',
  vadCommandTimeoutMs: 4000,
  showLiveTranscription: true,
  alwaysShowVoiceVisualization: true,
  defaultMode: 'v_agent' as AgentId,
  defaultLanguage: typeof navigator !== 'undefined' ? navigator.language : 'en-US',
  autoClearChat: false,
  generateDiagrams: true,
  useAdvancedMemory: true,

  // Language Settings
  responseLanguageMode: 'auto', // Auto-detect by default
  fixedResponseLanguage: 'en-US',
  sttAutoDetectLanguage: false, // Keep false for now to maintain stability
  languagePreferenceLocked: false,

  // Conversation Context Settings
  conversationContextMode: 'smart',
  maxHistoryMessages: 12, // Reduced from implicit 20
  preventRepetition: true, // Enable by default

  ephemeralLogMaxCompact: 3,
  ephemeralLogMaxExpanded: 20,
  sttPreference: 'whisper_api',
  selectedAudioInputDeviceId: null,
  selectedAudioOutputDeviceId: null,
  speechLanguage: typeof navigator !== 'undefined' ? navigator.language : 'en-US',
  sttOptions: {
    prompt: '',
  },
  audioInputMode: 'push-to-talk',
  vadThreshold: 0.15,
  vadSilenceTimeoutMs: 3000,
  continuousModePauseTimeoutMs: DEFAULT_CONTINUOUS_MODE_PAUSE_TIMEOUT_MS,
  continuousModeAutoSend: true,
  continuousModeListenDuringResponse: false, // Default to false - stop listening while assistant responds
  vadCommandRecognizedPauseMs: 1500,
  vadWakeWordsBrowserSTT: Object.freeze(['v', 'vee', 'victoria', 'hey v']),
  vadSensitivityDb: -50,
  continuousModeSilenceSendDelayMs: DEFAULT_CONTINUOUS_MODE_SILENCE_SEND_DELAY_MS,
  minWhisperSegmentDurationS: 0.5,
  maxSegmentDurationS: 28,
  ttsProvider: 'openai_tts',
  selectedTtsVoiceId: null,
  ttsVolume: 0.9,
  ttsRate: 1.2,
  ttsPitch: 1.0,
  autoPlayTts: true,
  costLimit: 20.00,
  defaultTutorLevel: 'intermediate',
  // Defaults for newly added UI settings
  uiSoundVolume: 0.7,
  enableUiSounds: true,
  showStartupHint: true,
});

interface CollectedVoiceTemp {
  rawProviderId: string;
  name: string;
  lang: string;
  provider: 'browser' | 'openai';
  isDefault?: boolean;
  gender?: string;
  description?: string;
}

class VoiceSettingsManager {
  private static readonly STORAGE_KEY_SETTINGS = 'vcaUserAppSettings_v1.5.1'; // Version bump for new settings
  public readonly defaultSettings: Readonly<VoiceApplicationSettings>;
  public readonly settings: VoiceApplicationSettings;

  public readonly availableTtsVoices: Ref<Readonly<VoiceOption[]>>;
  public readonly ttsVoicesLoaded: Ref<boolean>;
  public readonly ttsLanguageFallback: Ref<TtsLanguageFallbackInfo | null>;
  public readonly audioInputDevices: Ref<Readonly<MediaDeviceInfo[]>>;
  public readonly audioInputDevicesLoaded: Ref<boolean>;
  public readonly audioOutputDevices: Ref<Readonly<MediaDeviceInfo[]>>;
  public readonly audioOutputDevicesLoaded: Ref<boolean>;
  private readonly _creditsSnapshot: Ref<CreditSnapshotFE | null>;
  public readonly creditsSnapshot: Readonly<Ref<CreditSnapshotFE | null>>;
  private readonly _isSpeaking: Ref<boolean>;
  public readonly isSpeaking: Readonly<Ref<boolean>>;
  public readonly speechCreditsExhausted: ComputedRef<boolean>;
  public readonly languagePreferenceLocked: ComputedRef<boolean>;
  private readonly _detectedSpeechLanguage: Ref<string | null> = ref(null);
  private readonly _detectedResponseLanguage: Ref<string | null> = ref(null);
  public readonly detectedSpeechLanguage = readonly(this._detectedSpeechLanguage);
  public readonly detectedResponseLanguage = readonly(this._detectedResponseLanguage);

  private _isInitialized: Ref<boolean> = ref(false);
  private activePreviewAudio: HTMLAudioElement | null = null;
  private speakDebounceTimer: number | null = null;
  private speakPendingText: string | null = null;
  private speakPendingResolvers: Array<(value: void) => void> = [];
  private speakPendingRejectors: Array<(reason?: any) => void> = [];
  private lastSpokenText: string | null = null;
  private lastSpokenAt = 0;
  private readonly SPEAK_DEBOUNCE_WINDOW_MS = 350;
  private activeTtsAbortController: AbortController | null = null;

  constructor() {
    this.defaultSettings = initialDefaultSettings;
    const storedSettingsRef = useStorage(
      VoiceSettingsManager.STORAGE_KEY_SETTINGS,
      { ...this.defaultSettings }, // Ensure a copy is used for defaults
      localStorage,
      { mergeDefaults: (storageValue, defaults) => this._mergeDefaults(storageValue, defaults as VoiceApplicationSettings) }
    );
    this.settings = reactive(storedSettingsRef.value) as VoiceApplicationSettings;

    this.availableTtsVoices = ref(Object.freeze([]));
    this.ttsVoicesLoaded = ref(false);
    this.ttsLanguageFallback = ref(null);
    this.audioInputDevices = ref(Object.freeze([]));
    this.audioInputDevicesLoaded = ref(false);
    this.audioOutputDevices = ref(Object.freeze([]));
    this.audioOutputDevicesLoaded = ref(false);
    this._creditsSnapshot = ref<CreditSnapshotFE | null>(null);
    this.creditsSnapshot = readonly(this._creditsSnapshot);
    this._isSpeaking = ref(false);
    this.isSpeaking = readonly(this._isSpeaking);
    this.speechCreditsExhausted = computed(() => {
      const snapshot = this._creditsSnapshot.value;
      if (!snapshot || snapshot.speech.isUnlimited) return false;
      const remaining = snapshot.speech.remainingUsd ?? 0;
      return remaining <= 0;
    });
    this.languagePreferenceLocked = computed(() => Boolean(this.settings.languagePreferenceLocked));

    watch(() => this.settings.ttsProvider, async (newProvider, oldProvider) => {
      if (!this._isInitialized.value || newProvider === oldProvider) return;
      console.log(`[VSM] TTS Provider changed: ${oldProvider} -> ${newProvider}. Reloading voices.`);
      await this.loadAllTtsVoices();
    });

    watch(() => this.settings.speechLanguage, async (newLang, oldLang) => {
      if (!this._isInitialized.value || newLang === oldLang) return;
      console.log(`[VSM] Speech Language changed: ${oldLang} -> ${newLang}. Ensuring default TTS voice.`);
      await this._ensureDefaultTtsVoiceSelected();
    });
  }

  private _mergeDefaults(storageValue: any, defaults: VoiceApplicationSettings): VoiceApplicationSettings {
    const merged = { ...defaults, ...storageValue };
    if (storageValue.sttOptions || defaults.sttOptions) {
        merged.sttOptions = {
            ...(defaults.sttOptions || {}),
            ...(storageValue.sttOptions || {}),
        };
    }
    // Ensure all default keys defined in the LATEST initialDefaultSettings are present
    for (const key of Object.keys(this.defaultSettings) as Array<keyof VoiceApplicationSettings>) {
        if (merged[key] === undefined && this.defaultSettings[key] !== undefined) {
            merged[key] = this.defaultSettings[key]!; // Use non-null assertion as we know it's in defaults
        }
    }
    const pauseTimeout = Number(merged.continuousModePauseTimeoutMs);
    if (!Number.isFinite(pauseTimeout)) {
      merged.continuousModePauseTimeoutMs = DEFAULT_CONTINUOUS_MODE_PAUSE_TIMEOUT_MS;
    } else {
      merged.continuousModePauseTimeoutMs = Math.min(
        MAX_CONTINUOUS_MODE_PAUSE_TIMEOUT_MS,
        Math.max(MIN_CONTINUOUS_MODE_PAUSE_TIMEOUT_MS, pauseTimeout),
      );
    }

    const silenceDelayRaw = Number(merged.continuousModeSilenceSendDelayMs);
    if (!Number.isFinite(silenceDelayRaw)) {
      merged.continuousModeSilenceSendDelayMs = DEFAULT_CONTINUOUS_MODE_SILENCE_SEND_DELAY_MS;
    } else {
      merged.continuousModeSilenceSendDelayMs = Math.min(
        MAX_CONTINUOUS_MODE_SILENCE_SEND_DELAY_MS,
        Math.max(MIN_CONTINUOUS_MODE_SILENCE_SEND_DELAY_MS, silenceDelayRaw),
      );
    }

    return merged;
  }

  public async initialize(): Promise<void> {
    if (this._isInitialized.value) return;
    console.log('[VSM] Initializing...');
    // At this point, mergeDefaults in useStorage constructor should have already handled applying new defaults.
    // We can log the settings object to confirm.
    console.log('[VSM] Settings after useStorage mergeDefaults:', JSON.parse(JSON.stringify(this.settings)));

    await this.loadAllTtsVoices();
    // Don't force permission request on initial load - pass false to only enumerate devices
    await this.loadAudioInputDevices(false);
    this._isInitialized.value = true;
    console.log('[VSM] Initialized successfully.');
    void this.refreshCreditsSnapshot();
  }

  public get isInitialized(): Readonly<Ref<boolean>> {
    return readonly(this._isInitialized);
  }

  public updateCreditsSnapshot(snapshot: CreditSnapshotFE | null): void {
    if (snapshot) {
      this._creditsSnapshot.value = {
        allocationKey: snapshot.allocationKey,
        llm: { ...snapshot.llm },
        speech: { ...snapshot.speech },
      };
    } else {
      this._creditsSnapshot.value = null;
    }
  }

  public async refreshCreditsSnapshot(): Promise<void> {
    try {
      const response = await speechAPI.getStats();
      if (response.data?.credits) {
        this.updateCreditsSnapshot(response.data.credits);
      }
    } catch (error: any) {
      console.warn('[VSM] Failed to refresh speech credits snapshot:', error?.message ?? error);
    }
  }

  private _canonicalizeLanguage(lang: string): string {
    const trimmed = lang.trim();
    if (!trimmed) return 'en-US';
    const segments = trimmed.split(/[-_]/)
      .map((segment, index) => (index === 0 ? segment.toLowerCase() : segment.toUpperCase()));
    if (segments.length === 1) {
      const primary = segments[0];
      return primary.length === 2 ? `${primary}-${primary.toUpperCase()}` : primary;
    }
    return segments.join('-');
  }

  public setManualLanguagePreference(lang: string | null, options?: { mode?: 'fixed' | 'follow-stt' }): void {
    if (!lang) {
      this.settings.languagePreferenceLocked = false;
      return;
    }
    const normalized = this._canonicalizeLanguage(lang);
    this.settings.languagePreferenceLocked = true;
    this.settings.speechLanguage = normalized;
    const targetMode = options?.mode ?? 'fixed';
    this.settings.responseLanguageMode = targetMode;
    if (targetMode === 'fixed') {
      this.settings.fixedResponseLanguage = normalized;
    }
  }

  public clearManualLanguagePreference(): void {
    this.settings.languagePreferenceLocked = false;
  }

  public applyInterfaceLocale(locale: string): void {
    if (this.settings.languagePreferenceLocked) return;
    const normalized = this._canonicalizeLanguage(locale);
    this.settings.speechLanguage = normalized;
    this.settings.responseLanguageMode = 'follow-stt';
    this.settings.fixedResponseLanguage = normalized;
  }

  public handleDetectedSpeechLanguage(lang: string | undefined | null): void {
    if (!lang) return;
    const normalized = this._canonicalizeLanguage(lang);
    this._detectedSpeechLanguage.value = normalized;
    if (this.settings.languagePreferenceLocked) return;
    if (this.settings.speechLanguage !== normalized) {
      this.settings.speechLanguage = normalized;
    }
    if (this.settings.responseLanguageMode === 'auto' || this.settings.responseLanguageMode === 'follow-stt') {
      this.settings.responseLanguageMode = 'follow-stt';
      this.settings.fixedResponseLanguage = normalized;
    }
  }

  public handleDetectedResponseLanguage(lang: string | undefined | null): void {
    if (!lang) return;
    const normalized = this._canonicalizeLanguage(lang);
    this._detectedResponseLanguage.value = normalized;
    if (this.settings.languagePreferenceLocked) return;
    if (this.settings.responseLanguageMode === 'auto') {
      this.settings.responseLanguageMode = 'fixed';
      this.settings.fixedResponseLanguage = normalized;
    }
  }

  public async loadAllTtsVoices(): Promise<void> {
    this.ttsVoicesLoaded.value = false;
    const collectedVoices: CollectedVoiceTemp[] = [];

    if (typeof window !== 'undefined' && browserTtsService.isSupported()) { // Check window for browser env
      try {
        const browserVoicesRaw = await browserTtsService.getVoices();
        browserVoicesRaw.forEach((v: SpeechSynthesisVoice) => {
          collectedVoices.push({
            rawProviderId: v.voiceURI, name: v.name, lang: v.lang,
            provider: 'browser', isDefault: v.default,
          });
        });
      } catch (error) {
        console.error("[VSM] Error loading browser TTS voices:", error);
      }
    }

    try {
      const response = await ttsAPI.getAvailableVoices();
      if (response.data?.voices) {
        const backendApiVoices = response.data.voices as TTSVoiceFE[];
        backendApiVoices.forEach(v_api => {
          collectedVoices.push({
            rawProviderId: v_api.id, name: v_api.name, lang: v_api.lang || 'en',
            provider: (v_api.provider as 'openai' | 'browser') || 'openai',
            isDefault: v_api.isDefault || false,
            gender: v_api.gender, description: v_api.description,
          });
        });
      } else {
        console.warn("[VSM] No voices in backend TTS API response or unexpected format.");
      }
    } catch (error) {
      console.error("[VSM] Error loading backend TTS voices:", error);
    }

    const uniqueVoicesMap = new Map<string, VoiceOption>();
    collectedVoices.forEach(cv => {
      const sanitizedRawId = cv.provider === 'browser'
        ? cv.rawProviderId.replace(/[^a-zA-Z0-9_.:=/-]/g, '_')
        : cv.rawProviderId;
      const uniqueId = `${cv.provider}_${sanitizedRawId}`;
      if (!uniqueVoicesMap.has(uniqueId)) {
        uniqueVoicesMap.set(uniqueId, Object.freeze({
          id: uniqueId, providerVoiceId: cv.rawProviderId,
          name: cv.name, lang: cv.lang, provider: cv.provider,
          isDefault: cv.isDefault, gender: cv.gender, description: cv.description,
        }));
      }
    });
    this.availableTtsVoices.value = Object.freeze(
        Array.from(uniqueVoicesMap.values())
        .sort((a, b) => `${a.provider}-${a.lang}-${a.name}`.localeCompare(`${b.provider}-${b.lang}-${b.name}`))
    );
    this.ttsVoicesLoaded.value = true;
    console.log(`[VSM] Total unique TTS voices loaded: ${this.availableTtsVoices.value.length}`);
    await this._ensureDefaultTtsVoiceSelected();
  }

  private _updateTtsLanguageFallback(): void {
    const requestedLang = this.settings.speechLanguage || 'en-US';
    const requestedShort = requestedLang.split('-')[0].toLowerCase();
    const currentVoice = this.getCurrentTtsVoice();

    if (!currentVoice) {
      this.ttsLanguageFallback.value = {
        requestedLang,
        resolvedLang: 'en-US',
        resolvedVoiceName: 'American English',
        provider: this.settings.ttsProvider,
      };
      return;
    }

    const voiceLang = (currentVoice.lang || 'en-US').toLowerCase();
    if (!voiceLang.startsWith(requestedShort)) {
      this.ttsLanguageFallback.value = {
        requestedLang,
        resolvedLang: currentVoice.lang || 'en-US',
        resolvedVoiceName: currentVoice.name,
        provider: this.settings.ttsProvider,
      };
    } else {
      this.ttsLanguageFallback.value = null;
    }
  }

  private async _ensureDefaultTtsVoiceSelected(): Promise<void> {
    if (!this.ttsVoicesLoaded.value || this.availableTtsVoices.value.length === 0) {
      if (this.settings.selectedTtsVoiceId && !this.availableTtsVoices.value.some(v => v.id === this.settings.selectedTtsVoiceId)) {
        this.updateSetting('selectedTtsVoiceId', null);
      }
      this._updateTtsLanguageFallback();
      return;
    }
    const currentProviderType = this.settings.ttsProvider === 'browser_tts' ? 'browser' : 'openai';
    const voicesForProvider = this.availableTtsVoices.value.filter(v => v.provider === currentProviderType);
    const currentSelectionIsValid = this.settings.selectedTtsVoiceId &&
                                  voicesForProvider.some(v => v.id === this.settings.selectedTtsVoiceId);

    if (!currentSelectionIsValid && voicesForProvider.length > 0) {
      const preferredLang = this.settings.speechLanguage || (typeof navigator !== 'undefined' ? navigator.language : 'en-US');
      const langShort = preferredLang.split('-')[0].toLowerCase();
      let defaultVoice = voicesForProvider.find(v => v.isDefault && v.lang.toLowerCase().startsWith(langShort));
      if (!defaultVoice) defaultVoice = voicesForProvider.find(v => v.isDefault);
      if (!defaultVoice) defaultVoice = voicesForProvider.find(v => v.lang.toLowerCase().startsWith(langShort));
      if (!defaultVoice) defaultVoice = voicesForProvider.find(v => v.lang.toLowerCase().startsWith('en-us'));
      if (!defaultVoice) defaultVoice = voicesForProvider.find(v => v.lang.toLowerCase().startsWith('en'));
      if (!defaultVoice) defaultVoice = voicesForProvider[0];
      this.updateSetting('selectedTtsVoiceId', defaultVoice.id);
      console.log(`[VSM] Default TTS voice auto-selected for ${currentProviderType}: ${defaultVoice.name}`);
    } else if (voicesForProvider.length === 0 && this.settings.selectedTtsVoiceId) {
      console.warn(`[VSM] No voices for provider ${currentProviderType}. Clearing selected TTS voice.`);
      this.updateSetting('selectedTtsVoiceId', null);
    }

    this._updateTtsLanguageFallback();
  }

  public async loadAudioInputDevices(forcePermissionRequest: boolean = false): Promise<void> {
    this.audioInputDevicesLoaded.value = false;
    this.audioOutputDevicesLoaded.value = false;
    if (typeof navigator?.mediaDevices?.enumerateDevices !== 'function') {
      console.warn('[VSM] enumerateDevices API not supported.');
      this.audioInputDevices.value = Object.freeze([]);
      this.audioOutputDevices.value = Object.freeze([]);
      this.audioInputDevicesLoaded.value = true;
      this.audioOutputDevicesLoaded.value = true;
      return;
    }
    try {
      // Only request mic permission if explicitly forced
      // Don't auto-request on initial load just because we haven't loaded devices yet
      if (forcePermissionRequest) {
        if (typeof navigator?.mediaDevices?.getUserMedia === 'function') {
          console.log('[VSM] Forcing microphone permission request for device enumeration.');
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
          stream.getTracks().forEach(track => track.stop());
        } else {
          console.warn("[VSM] getUserMedia API not supported for forcing permission.");
        }
      }
      const devices = await navigator.mediaDevices.enumerateDevices();

      // Load input devices
      this.audioInputDevices.value = Object.freeze(devices.filter(device => device.kind === 'audioinput'));
      this.audioInputDevicesLoaded.value = true;
      console.log(`[VSM] Audio input devices loaded: ${this.audioInputDevices.value.length}`);

      // Load output devices
      this.audioOutputDevices.value = Object.freeze(devices.filter(device => device.kind === 'audiooutput'));
      this.audioOutputDevicesLoaded.value = true;
      console.log(`[VSM] Audio output devices loaded: ${this.audioOutputDevices.value.length}`);

      // Check if selected input device still exists
      if (this.settings.selectedAudioInputDeviceId && !this.audioInputDevices.value.some(d => d.deviceId === this.settings.selectedAudioInputDeviceId)) {
        this.updateSetting('selectedAudioInputDeviceId', null);
        console.log('[VSM] Previously selected audio input device not found; selection reset.');
      }

      // Check if selected output device still exists
      if (this.settings.selectedAudioOutputDeviceId && !this.audioOutputDevices.value.some(d => d.deviceId === this.settings.selectedAudioOutputDeviceId)) {
        this.updateSetting('selectedAudioOutputDeviceId', null);
        console.log('[VSM] Previously selected audio output device not found; selection reset.');
      }
    } catch (error: any) {
      console.error('[VSM] Error loading audio devices:', error.name, error.message);
      this.audioInputDevices.value = Object.freeze([]);
      this.audioOutputDevices.value = Object.freeze([]);
      this.audioInputDevicesLoaded.value = true;
      this.audioOutputDevicesLoaded.value = true;
    }
  }

  public updateSetting<K extends keyof VoiceApplicationSettings>(key: K, value: VoiceApplicationSettings[K]): void {
    if (this.settings[key] !== value) {
      // Vue's reactivity system handles updates to this.settings directly.
      // The useStorage composable ensures this change is persisted.
      const oldSetting = this.settings[key];
      (this.settings as any)[key] = value;
      console.log(`[VSM] Setting updated - ${key}: ${JSON.stringify(oldSetting)} -> ${JSON.stringify(value)}`);
      if (key === 'selectedTtsVoiceId' || key === 'speechLanguage' || key === 'ttsProvider') {
        this._updateTtsLanguageFallback();
        if (key === 'speechLanguage' || key === 'ttsProvider') {
          void this._ensureDefaultTtsVoiceSelected();
        }
      }
    }
  }

  public updateSettings(newSettings: Partial<VoiceApplicationSettings>): void {
    let settingsChanged = false; let ttsRelatedChanged = false;
    for (const key in newSettings) {
      const K = key as keyof VoiceApplicationSettings;
      // Check if property exists in newSettings and is different or new
      if (newSettings[K] !== undefined && this.settings[K] !== newSettings[K]) {
        (this.settings as any)[K] = newSettings[K]!;
        settingsChanged = true;
        if (K === 'ttsProvider' || K === 'speechLanguage' || K === 'selectedTtsVoiceId') ttsRelatedChanged = true;
      }
    }
    if (settingsChanged) {
      console.log("[VSM] Settings batch updated:", newSettings);
      if (ttsRelatedChanged) this._ensureDefaultTtsVoiceSelected();
    }
  }

  public resetToDefaults(): void {
    console.log("[VSM] Resetting settings to defaults.");
    const defaultsToApply = { ...this.defaultSettings }; // Use the class's defaultSettings
    // Iterate over defaultSettings keys to ensure all are reset
    Object.keys(defaultsToApply).forEach(keyStr => {
        const key = keyStr as keyof VoiceApplicationSettings;
        (this.settings as any)[key] = defaultsToApply[key];
    });
    this.loadAllTtsVoices(); // Re-trigger dependent loads
    this.loadAudioInputDevices();
    console.log("[VSM] Settings reset to defaults complete.");
  }


  public getCurrentTtsVoice(): Readonly<VoiceOption> | null {
    if (!this.settings.selectedTtsVoiceId) return null;
    return this.availableTtsVoices.value.find(v => v.id === this.settings.selectedTtsVoiceId) || null;
  }

  public get ttsVoicesForCurrentProvider(): ComputedRef<Readonly<VoiceOption[]>> {
    return computed(() => {
      if (!this.ttsVoicesLoaded.value) return Object.freeze([]);
      const currentProviderType = this.settings.ttsProvider === 'browser_tts' ? 'browser' : 'openai';
      return Object.freeze(this.availableTtsVoices.value.filter(v => v.provider === currentProviderType));
    });
  }

  private async playWithBrowserFallback(
    text: string,
    overrides: Partial<BrowserSpeakOptions> = {},
    trackSpeaking: boolean = true
  ): Promise<void> {
    if (typeof window === 'undefined' || !browserTtsService.isSupported()) {
      console.warn('[VSM] Browser TTS fallback unavailable on this platform.');
      return;
    }

    const fallbackVoice =
      this.availableTtsVoices.value.find(
        (voice) =>
          voice.provider === 'browser' &&
          (voice.id === this.settings.selectedTtsVoiceId || voice.isDefault)
      ) ?? null;

    const {
      onStart: overrideOnStart,
      onEnd: overrideOnEnd,
      onError: overrideOnError,
      ...voiceOverrides
    } = overrides;

    const speakOptions: BrowserSpeakOptions = {
      lang: voiceOverrides.lang ?? this.settings.speechLanguage,
      rate: voiceOverrides.rate ?? this.settings.ttsRate,
      pitch: voiceOverrides.pitch ?? this.settings.ttsPitch,
      volume: voiceOverrides.volume ?? this.settings.ttsVolume,
      voiceURI: voiceOverrides.voiceURI ?? fallbackVoice?.providerVoiceId ?? undefined,
      onStart: () => {
        if (trackSpeaking) this._isSpeaking.value = true;
        overrideOnStart?.();
      },
      onEnd: () => {
        if (trackSpeaking) this._isSpeaking.value = false;
        overrideOnEnd?.();
      },
      onError: (event: SpeechSynthesisErrorEvent) => {
        if (trackSpeaking) this._isSpeaking.value = false;
        overrideOnError?.(event);
      },
    };

    try {
      await browserTtsService.speak(text, speakOptions);
    } catch (fallbackError) {
      if (trackSpeaking) this._isSpeaking.value = false;
      console.error('[VSM] Browser TTS fallback failed:', fallbackError);
    }
  }

  public async speakText(text: string): Promise<void> {
    const sanitized = text?.trim();
    if (!this._isInitialized.value || !this.settings.autoPlayTts || !sanitized) {
      if (this._isInitialized.value && !this.settings.autoPlayTts) {
        console.log("[VSM] TTS auto-play disabled.");
      }
      return;
    }

    if (typeof window === 'undefined') {
      await this.executeSpeak(sanitized);
      return;
    }

    await this.enqueueSpeak(sanitized);
  }

  private enqueueSpeak(text: string): Promise<void> {
    if (this.lastSpokenText === text && Date.now() - this.lastSpokenAt < this.SPEAK_DEBOUNCE_WINDOW_MS) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      this.speakPendingText = text;
      this.speakPendingResolvers.push(resolve);
      this.speakPendingRejectors.push(reject);

      if (this.speakDebounceTimer !== null) {
        window.clearTimeout(this.speakDebounceTimer);
      }

      this.speakDebounceTimer = window.setTimeout(async () => {
        const textToSpeak = this.speakPendingText ?? text;
        this.speakPendingText = null;
        this.speakDebounceTimer = null;

        const resolvers = this.speakPendingResolvers.slice();
        const rejectors = this.speakPendingRejectors.slice();
        this.speakPendingResolvers = [];
        this.speakPendingRejectors = [];

        if (!this._isInitialized.value || !this.settings.autoPlayTts) {
          resolvers.forEach((fn) => fn());
          return;
        }

        if (this.lastSpokenText === textToSpeak && Date.now() - this.lastSpokenAt < this.SPEAK_DEBOUNCE_WINDOW_MS) {
          resolvers.forEach((fn) => fn());
          return;
        }

        try {
          await this.executeSpeak(textToSpeak);
          this.markLastSpoken(textToSpeak);
          resolvers.forEach((fn) => fn());
        } catch (error) {
          rejectors.forEach((fn) => fn(error));
        }
      }, this.SPEAK_DEBOUNCE_WINDOW_MS);
    });
  }

  private async executeSpeak(text: string): Promise<void> {
    this.cancelSpeech();
    this._isSpeaking.value = false;

    const currentVoice = this.getCurrentTtsVoice();
    const { ttsVolume: volume, ttsRate: rate, ttsPitch: pitch, speechLanguage, ttsProvider } = this.settings;

    if (ttsProvider === 'openai_tts' && this.speechCreditsExhausted.value) {
      console.info('[VSM] Speech credits exhausted. Using browser fallback for TTS.');
      await this.playWithBrowserFallback(text, {
        lang: currentVoice?.lang || speechLanguage,
        rate,
        pitch,
        volume,
      }, true);
      this.markLastSpoken(text);
      return;
    }

    if (ttsProvider === 'browser_tts' && typeof window !== 'undefined' && browserTtsService.isSupported()) {
      try {
        await this.playWithBrowserFallback(text, {
          lang: currentVoice?.lang || speechLanguage,
          voiceURI: currentVoice?.providerVoiceId ?? undefined,
          rate,
          pitch,
          volume,
        }, true);
        this.markLastSpoken(text);
      } catch (error) {
        this._isSpeaking.value = false;
        console.error("[VSM] Error speaking with browser TTS:", error);
      }
      return;
    }

    if (ttsProvider === 'openai_tts') {
      if (!currentVoice || currentVoice.provider !== 'openai') {
        console.error("[VSM] OpenAI TTS selected but no valid OpenAI voice configured. Falling back to browser speech.");
        await this.playWithBrowserFallback(text, {
          lang: speechLanguage,
          rate,
          pitch,
          volume,
        }, true);
        this.markLastSpoken(text);
        return;
      }
      try {
        const payload: TTSRequestPayloadFE = { text, voice: currentVoice.providerVoiceId, speed: rate };
        const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
        if (controller) {
          this.activeTtsAbortController = controller;
        }
        const response = await ttsAPI.synthesize(payload, controller?.signal);
        this.activeTtsAbortController = null;
        void this.refreshCreditsSnapshot();
        const audioUrl = URL.createObjectURL(response.data);
        this.activePreviewAudio = new Audio(audioUrl);
        this.activePreviewAudio.volume = volume;
        const audioToPlay = this.activePreviewAudio;
        this._isSpeaking.value = true;
        audioToPlay.onended = () => {
          URL.revokeObjectURL(audioUrl);
          if (this.activePreviewAudio === audioToPlay) this.activePreviewAudio = null;
          this._isSpeaking.value = false;
        };
        audioToPlay.onerror = (e) => {
          console.error("[VSM] Error playing OpenAI audio.", e);
          URL.revokeObjectURL(audioUrl);
          if (this.activePreviewAudio === audioToPlay) this.activePreviewAudio = null;
          this._isSpeaking.value = false;
        };
        await audioToPlay.play();
        this.markLastSpoken(text);
      } catch (error: any) {
        this.activeTtsAbortController = null;
        if (error?.name === 'AbortError') {
          console.info('[VSM] OpenAI TTS request aborted.');
          return;
        }
        this._isSpeaking.value = false;
        console.error("[VSM] Error with OpenAI TTS:", error.response?.data || error.message);
        if (error?.response?.data?.credits) {
          this.updateCreditsSnapshot(error.response.data.credits as CreditSnapshotFE);
        }
        if (error?.response?.data?.error === 'SPEECH_CREDITS_EXHAUSTED') {
          console.warn('[VSM] Speech credits exhausted during OpenAI TTS request. Switching to browser provider.');
          this.updateSetting('ttsProvider', 'browser_tts');
        }
        if (this.activePreviewAudio?.src?.startsWith('blob:')) {
          URL.revokeObjectURL(this.activePreviewAudio.src);
        }
        this.activePreviewAudio = null;
        await this.playWithBrowserFallback(text, {
          lang: currentVoice?.lang || speechLanguage,
          rate,
          pitch,
          volume,
        }, true);
        this.markLastSpoken(text);
      }
      return;
    }

    console.warn(`[VSM] TTS provider "${ttsProvider}" not supported or no voice available. Falling back to browser speech.`);
    await this.playWithBrowserFallback(text, {
      lang: speechLanguage,
      rate,
      pitch,
      volume,
    }, true);
    this.markLastSpoken(text);
  }

  private markLastSpoken(text: string): void {
    this.lastSpokenText = text;
    this.lastSpokenAt = Date.now();
  }

  public cancelSpeech(): void {
    this._isSpeaking.value = false;
    if (this.activeTtsAbortController) {
      this.activeTtsAbortController.abort();
      this.activeTtsAbortController = null;
    }
    if (typeof window !== 'undefined' && browserTtsService.isSupported() && browserTtsService.isSpeaking()) {
      browserTtsService.cancel();
    }
    if (this.activePreviewAudio) {
      this.activePreviewAudio.pause(); this.activePreviewAudio.currentTime = 0;
      if (this.activePreviewAudio.src?.startsWith('blob:')) {
        const oldSrc = this.activePreviewAudio.src;
        setTimeout(() => URL.revokeObjectURL(oldSrc), 100);
      }
      this.activePreviewAudio.onended = null; this.activePreviewAudio.onerror = null;
      this.activePreviewAudio.removeAttribute('src');
      try { this.activePreviewAudio.load(); } catch(e) {/*ignore*/}
      this.activePreviewAudio = null;
    }
  }

  public async previewVoice(voiceId: string, text?: string): Promise<void> {
    if (!this._isInitialized.value) { console.warn("[VSM] Cannot preview, service not init."); return;}
    const voiceToPreview = this.availableTtsVoices.value.find(v => v.id === voiceId);
    if (!voiceToPreview) { console.error(`[VSM] Voice ${voiceId} not found for preview.`); return; }

    const previewText = text || `This is a preview of the voice: ${voiceToPreview.name}.`;
    this.cancelSpeech();
    const { ttsVolume: volume, ttsRate: rate, ttsPitch: pitch } = this.settings;

    if (voiceToPreview.provider === 'browser' && typeof window !== 'undefined' && browserTtsService.isSupported()) {
      try {
        await browserTtsService.speak(previewText, {
          voiceURI: voiceToPreview.providerVoiceId, lang: voiceToPreview.lang,
          volume, rate, pitch,
        } as BrowserSpeakOptions);
      } catch (error) { console.error("[VSM] Error previewing browser voice:", error); }
    } else if (voiceToPreview.provider === 'openai') {
      try {
        const payload: TTSRequestPayloadFE = { text: previewText, voice: voiceToPreview.providerVoiceId, speed: rate };
        const response = await ttsAPI.synthesize(payload);
        const audioUrl = URL.createObjectURL(response.data);
        this.activePreviewAudio = new Audio(audioUrl);
        this.activePreviewAudio.volume = volume;
        const audioToPlay = this.activePreviewAudio;
        audioToPlay.onended = () => { URL.revokeObjectURL(audioUrl); if (this.activePreviewAudio === audioToPlay) this.activePreviewAudio = null; };
        audioToPlay.onerror = (e) => { console.error("[VSM] Error playing preview OpenAI audio.", e); URL.revokeObjectURL(audioUrl); if (this.activePreviewAudio === audioToPlay) this.activePreviewAudio = null; };
        await audioToPlay.play();
      } catch (error: any) {
        console.error("[VSM] Error previewing OpenAI voice:", error.response?.data || error.message);
        if (this.activePreviewAudio?.src?.startsWith('blob:')) URL.revokeObjectURL(this.activePreviewAudio.src);
        this.activePreviewAudio = null;
        await this.playWithBrowserFallback(previewText, { lang: voiceToPreview.lang, rate, pitch, volume }, false);
      }
    } else {
      console.warn(`[VSM] Provider for voice ${voiceId} not supported for preview.`);
    }
  }
}

export const voiceSettingsManager = new VoiceSettingsManager();

