// File: frontend/src/components/header/VoiceControlsDropdown.vue
/**
 * @file VoiceControlsDropdown.vue
 * @description Dropdown component for managing voice input/output settings,
 * including audio input mode, STT preference, global TTS mute, and future selection of specific TTS voices.
 * It adheres to the "Ephemeral Harmony" design system, utilizing shared dropdown styles.
 *
 * @component VoiceControlsDropdown
 * @props None. Reads and updates settings directly via `voiceSettingsManager`.
 * @emits None.
 *
 * @example
 * <VoiceControlsDropdown />
 * @version 1.1.1 - Corrected TypeScript errors, removed unused imports based on template usage.
 */
<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, inject, type Ref, type Component as VueComponentType } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import {
  voiceSettingsManager,
  type AudioInputMode,
  type VoiceApplicationSettings,
  type STTPreference,
  type TTSProvider,
  type VoiceOption,
} from '@/services/voice.settings.service';
import { useI18n } from 'vue-i18n';
import type { ToastService } from '@/services/services';

// Icons - Only importing icons actively used in the template.
import {
  AdjustmentsHorizontalIcon,
  ChevronDownIcon,
  MicrophoneIcon as PTTModeIcon,
  SpeakerWaveIcon as ContinuousModeIcon,
  CpuChipIcon as VADModeIcon,
  SpeakerWaveIcon as TTSUnmutedIcon,
  SpeakerXMarkIcon as TTSMutedIcon,
  CloudIcon as WhisperIcon,
  ComputerDesktopIcon as BrowserSTTIcon,
  ChatBubbleLeftRightIcon as OpenAIVoicesIcon,
  ServerStackIcon as BrowserVoicesIcon,
  CheckIcon as SelectedOptionIcon, // Outline CheckIcon is used for selected options
  MicrophoneIcon,
  SpeakerWaveIcon,
} from '@heroicons/vue/24/outline';

/** @interface AudioModeOption - Defines structure for audio input mode selection options. */
interface AudioModeOption {
  label: string;
  value: AudioInputMode;
  icon: VueComponentType;
  description: string;
}

/** @interface STTOption - Defines structure for STT preference selection options. */
interface STTOption {
  label: string;
  value: STTPreference;
  icon: VueComponentType;
  description: string;
}

/** @interface TTSOption - Defines structure for TTS provider selection options. */
interface TTSOption {
  label: string;
  value: TTSProvider;
  icon: VueComponentType;
  description: string;
}

/** @type {VoiceApplicationSettings} settings - Reactive global voice settings object. */
const settings: VoiceApplicationSettings = voiceSettingsManager.settings;
const route = useRoute();
const { t } = useI18n();
const toast = inject<ToastService>('toast');

/** @ref {Ref<boolean>} isOpen - Controls dropdown visibility. */
const isOpen: Ref<boolean> = ref(false);
/** @ref {Ref<HTMLElement | null>} dropdownRef - Template ref for click-outside detection. */
const dropdownRef: Ref<HTMLElement | null> = ref(null);

// Audio device states from voiceSettingsManager
const audioInputDevices = computed(() => voiceSettingsManager.audioInputDevices.value);
const audioOutputDevices = computed(() => voiceSettingsManager.audioOutputDevices.value);
const devicesLoaded = computed(() => voiceSettingsManager.audioInputDevicesLoaded.value && voiceSettingsManager.audioOutputDevicesLoaded.value);

const selectedInputDeviceId = computed<string>({
  get: () => settings.selectedAudioInputDeviceId || 'default',
  set: (val: string) => voiceSettingsManager.updateSetting('selectedAudioInputDeviceId', val === 'default' ? null : val),
});

const selectedOutputDeviceId = computed<string>({
  get: () => settings.selectedAudioOutputDeviceId || 'default',
  set: (val: string) => voiceSettingsManager.updateSetting('selectedAudioOutputDeviceId', val === 'default' ? null : val),
});

const toggleDropdown = async (): Promise<void> => {
  isOpen.value = !isOpen.value;
  if (isOpen.value) {
    await ensureVoicesLoaded();
  }
};
const closeDropdown = (): void => { isOpen.value = false; };

const handleClickOutside = (event: MouseEvent): void => {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target as Node)) {
    closeDropdown();
  }
};

onMounted(async () => {
  document.addEventListener('mousedown', handleClickOutside, true);
  // Load devices if not already loaded
  if (!voiceSettingsManager.audioInputDevicesLoaded.value) {
    await voiceSettingsManager.loadAudioInputDevices();
  }
});

onUnmounted(() => {
  document.removeEventListener('mousedown', handleClickOutside, true);
});

const audioModeOptions = computed<AudioModeOption[]>(() => [
  { label: 'Push-to-Talk', value: 'push-to-talk', icon: PTTModeIcon, description: "Hold microphone button to speak." },
  { label: 'Continuous', value: 'continuous', icon: ContinuousModeIcon, description: "Microphone stays on, actively listening." },
  { label: 'Voice Activate ("V")', value: 'voice-activation', icon: VADModeIcon, description: "Say 'V' to activate, then speak command." },
]);

const selectedAudioMode = computed<AudioInputMode>({
  get: () => settings.audioInputMode,
  set: (val: AudioInputMode) => voiceSettingsManager.updateSetting('audioInputMode', val),
});

const sttOptions = computed<STTOption[]>(() => [
  { label: 'Browser STT', value: 'browser_webspeech_api', icon: BrowserSTTIcon, description: "Fast, uses browser's built-in engine. Quality varies." },
  { label: 'Whisper API', value: 'whisper_api', icon: WhisperIcon, description: "High accuracy, uses OpenAI. May incur costs." },
]);

const selectedSTTPreference = computed<STTPreference>({
  get: () => settings.sttPreference,
  set: (val: STTPreference) => voiceSettingsManager.updateSetting('sttPreference', val),
});

const ttsOptions = computed<TTSOption[]>(() => [
  {
    label: 'Browser Playback',
    value: 'browser_tts',
    icon: BrowserVoicesIcon,
    description: 'Uses built-in OS voices. No credits required.',
  },
  {
    label: 'OpenAI Playback',
    value: 'openai_tts',
    icon: OpenAIVoicesIcon,
    description: 'Neural cloud voices with higher fidelity.',
  },
]);

const selectedTtsProvider = computed<TTSProvider>({
  get: () => settings.ttsProvider ?? 'browser_tts',
  set: (val: TTSProvider) => voiceSettingsManager.updateSetting('ttsProvider', val),
});

const isGlobalMuteActive = computed<boolean>({
  get: () => !settings.autoPlayTts,
  set: (isMuted: boolean) => voiceSettingsManager.updateSetting('autoPlayTts', !isMuted),
});

const toggleGlobalMute = (): void => { isGlobalMuteActive.value = !isGlobalMuteActive.value; };

const selectedTtsVoiceId = computed<string | null>(() => settings.selectedTtsVoiceId ?? null);
const voicesLoading = computed<boolean>(() => !voiceSettingsManager.ttsVoicesLoaded.value);
const availableVoices = computed<ReadonlyArray<VoiceOption>>(
  () => voiceSettingsManager.availableTtsVoices.value,
);
const openaiVoices = computed(() =>
  availableVoices.value.filter((voice) => voice.provider === 'openai'),
);
const browserVoices = computed(() =>
  availableVoices.value.filter((voice) => voice.provider === 'browser'),
);

const ensureVoicesLoaded = async (): Promise<void> => {
  if (voiceSettingsManager.ttsVoicesLoaded.value) return;
  try {
    await voiceSettingsManager.loadAllTtsVoices();
  } catch (error: any) {
    console.error('[VoiceControlsDropdown] Failed to load voices:', error);
    const message =
      error?.message ??
      (typeof error === 'string' ? error : 'Unable to load the voice catalog right now.');
    toast?.add?.({
      type: 'error',
      title: 'Voice catalog unavailable',
      message,
      duration: 3200,
    });
  }
};

watch(() => settings.audioInputMode, (newVal) => {
  if (selectedAudioMode.value !== newVal) selectedAudioMode.value = newVal;
});
watch(() => settings.sttPreference, (newVal) => {
  if (selectedSTTPreference.value !== newVal) selectedSTTPreference.value = newVal;
});

watch(() => settings.ttsProvider, () => {
  if (isOpen.value) {
    void ensureVoicesLoaded();
  }
});
watch(() => settings.autoPlayTts, (newVal) => {
  if (isGlobalMuteActive.value === newVal) isGlobalMuteActive.value = !newVal;
});
watch(() => settings.ttsProvider, () => {
  if (isOpen.value) {
    void ensureVoicesLoaded();
  }
});
watch(isOpen, (open) => {
  if (open) {
    void ensureVoicesLoaded();
  }
});
const selectVoice = (voiceId: string | null) => {
  voiceSettingsManager.updateSetting('selectedTtsVoiceId', voiceId);
};

</script>

<template>
  <div class="relative header-control-item" ref="dropdownRef">
    <button
      @click="toggleDropdown"
      id="voice-controls-trigger-button"
      class="btn btn-ghost-ephemeral btn-icon-ephemeral direct-header-button"
      aria-label="Open Voice and Audio Controls"
      :aria-expanded="isOpen"
      aria-controls="voice-controls-panel"
      title="Voice & Audio Settings"
    >
      <AdjustmentsHorizontalIcon class="icon-base icon-trigger" />
      <ChevronDownIcon class="icon-xs chevron-indicator ml-0.5 transition-transform duration-200" :class="{'rotate-180': isOpen}"/>
    </button>

    <Transition name="dropdown-float-enhanced">
      <div
        v-if="isOpen"
        id="voice-controls-panel"
        class="dropdown-panel-ephemeral absolute right-0 mt-2 w-72 md:w-80 origin-top-right"
        role="menu"
        aria-orientation="vertical"
        aria-labelledby="voice-controls-trigger-button"
      >
        <div class="dropdown-header-ephemeral">
          <h3 class="dropdown-title">Voice & Audio Controls</h3>
        </div>

        <div class="dropdown-content-ephemeral custom-scrollbar-thin">
          <button
            @click="toggleGlobalMute"
            class="dropdown-item-ephemeral group w-full"
            role="menuitemcheckbox"
            :aria-checked="!isGlobalMuteActive"
            title="Toggle Text-to-Speech playback"
          >
            <component :is="isGlobalMuteActive ? TTSMutedIcon : TTSUnmutedIcon" class="dropdown-item-icon" aria-hidden="true"/>
            <span>{{ isGlobalMuteActive ? 'Unmute Speech Output' : 'Mute Speech Output' }}</span>
            <span class="status-dot-indicator ml-auto w-2.5 h-2.5 rounded-full transition-colors"
                  :class="isGlobalMuteActive ? 'bg-[hsl(var(--color-error-h),var(--color-error-s),var(--color-error-l))]' : 'bg-[hsl(var(--color-success-h),var(--color-success-s),var(--color-success-l))]'"
                  :title="isGlobalMuteActive ? 'Speech Output Muted' : 'Speech Output Active'">
            </span>
          </button>

          <div class="dropdown-divider-ephemeral"></div>

          <!-- Microphone Selection -->
          <div class="setting-group-in-dropdown px-1.5 py-1">
            <label class="dropdown-section-title-ephemeral !mb-1.5 !mt-0 flex items-center">
              <MicrophoneIcon class="section-title-icon-ephemeral" aria-hidden="true" />
              {{ t('voice.microphoneInput', 'Microphone Input') }}
            </label>
            <select
              v-model="selectedInputDeviceId"
              class="device-select-dropdown w-full"
              :disabled="!devicesLoaded || audioInputDevices.length === 0"
            >
              <option value="default">{{ t('voice.defaultDevice', 'System Default') }}</option>
              <option
                v-for="device in audioInputDevices"
                :key="device.deviceId"
                :value="device.deviceId"
              >
                {{ device.label || `Microphone ${audioInputDevices.indexOf(device) + 1}` }}
              </option>
            </select>
          </div>

          <!-- Speaker/Output Selection -->
          <div class="setting-group-in-dropdown px-1.5 py-1">
            <label class="dropdown-section-title-ephemeral !mb-1.5 !mt-0 flex items-center">
              <SpeakerWaveIcon class="section-title-icon-ephemeral" aria-hidden="true" />
              {{ t('voice.audioOutput', 'Audio Output') }}
            </label>
            <select
              v-model="selectedOutputDeviceId"
              class="device-select-dropdown w-full"
              :disabled="!devicesLoaded || audioOutputDevices.length === 0"
            >
              <option value="default">{{ t('voice.defaultDevice', 'System Default') }}</option>
              <option
                v-for="device in audioOutputDevices"
                :key="device.deviceId"
                :value="device.deviceId"
              >
                {{ device.label || `Speaker ${audioOutputDevices.indexOf(device) + 1}` }}
              </option>
            </select>
          </div>

          <div class="dropdown-divider-ephemeral"></div>

          <div class="setting-group-in-dropdown px-1.5 py-1">
            <label class="dropdown-section-title-ephemeral !mb-1.5 !mt-0">{{ t('voice.audioInputMode', 'Audio Input Mode') }}</label>
            <div class="options-grid-dropdown grid grid-cols-3 gap-1.5">
              <button
                v-for="mode in audioModeOptions" :key="mode.value"
                @click="selectedAudioMode = mode.value"
                class="option-button-dropdown group"
                :class="{'active': selectedAudioMode === mode.value}"
                :title="mode.description"
                role="menuitemradio"
                :aria-checked="selectedAudioMode === mode.value"
              >
                <component :is="mode.icon" class="option-icon-dropdown" aria-hidden="true"/>
                <span class="option-label-dropdown">{{ mode.label }}</span>
              </button>
            </div>
          </div>

          <div class="dropdown-divider-ephemeral"></div>

          <div class="setting-group-in-dropdown px-1.5 py-1">
            <label class="dropdown-section-title-ephemeral !mb-1.5 !mt-0">{{ t('voice.speechRecognition', 'Speech Recognition (STT)') }}</label>
            <div class="options-grid-dropdown grid grid-cols-2 gap-1.5">
              <button
                v-for="stt in sttOptions" :key="stt.value"
                @click="selectedSTTPreference = stt.value"
                class="option-button-dropdown group"
                :class="{'active': selectedSTTPreference === stt.value}"
                :title="stt.description"
                role="menuitemradio"
                :aria-checked="selectedSTTPreference === stt.value"
              >
                <component :is="stt.icon" class="option-icon-dropdown" aria-hidden="true"/>
                <span class="option-label-dropdown">{{ stt.label }}</span>
              </button>
            </div>
          </div>

          <div class="setting-group-in-dropdown px-1.5 py-1">
            <label class="dropdown-section-title-ephemeral !mb-1.5 !mt-0">{{ t('voice.speechPlayback', 'Speech Playback (TTS)') }}</label>
            <div class="options-grid-dropdown grid grid-cols-2 gap-1.5">
              <button
                v-for="tts in ttsOptions" :key="tts.value"
                @click="selectedTtsProvider = tts.value"
                class="option-button-dropdown group"
                :class="{ 'active': selectedTtsProvider === tts.value }"
                :title="tts.description"
                role="menuitemradio"
                :aria-checked="selectedTtsProvider === tts.value"
              >
                <component :is="tts.icon" class="option-icon-dropdown" aria-hidden="true"/>
                <span class="option-label-dropdown">{{ tts.label }}</span>
              </button>
            </div>
            <p class="dropdown-hint">
              <span v-if="selectedTtsProvider === 'openai_tts'">
                {{ t('voice.ttsHintOpenai', 'Cloud voices auto-play and use your speech credits.') }}
              </span>
              <span v-else>
                {{ t('voice.ttsHintBrowser', 'Browser voices run locally—no credits and no network required.') }}
              </span>
            </p>
          </div>

          <div v-if="settings.ttsProvider === 'openai_tts' || openaiVoices.length">
            <div class="dropdown-divider-ephemeral"></div>
            <div class="setting-group-in-dropdown px-1.5 py-1">
              <label class="dropdown-section-title-ephemeral !mb-1.5 !mt-0 flex items-center">
                <OpenAIVoicesIcon class="section-title-icon-ephemeral" aria-hidden="true" /> OpenAI Voices
              </label>
              <div class="voice-list-placeholder">
                <template v-if="voicesLoading">
                  <p class="voice-list-placeholder__empty">Loading OpenAI voices…</p>
                </template>
                <template v-else-if="openaiVoices.length === 0">
                  <p class="voice-list-placeholder__empty">No OpenAI voices available. Refresh from Settings.</p>
                </template>
                <template v-else>
                  <button
                    v-for="voice in openaiVoices"
                    :key="voice.id"
                    @click="selectVoice(voice.id)"
                    class="dropdown-item-ephemeral !text-xs !py-1.5 !px-2 voice-list-placeholder__option"
                    :class="{'active font-semibold': selectedTtsVoiceId === voice.id}"
                    role="menuitemradio"
                    :aria-checked="selectedTtsVoiceId === voice.id"
                  >
                    <span class="voice-list-placeholder__label">{{ voice.name }}</span>
                    <span class="voice-list-placeholder__meta">
                      {{ voice.lang ? voice.lang.toUpperCase() : '—' }}
                      <span v-if="voice.isDefault" class="voice-list-placeholder__badge">Default</span>
                    </span>
                    <SelectedOptionIcon
                      v-if="selectedTtsVoiceId === voice.id"
                      class="dropdown-item-icon icon-xs !ml-auto !mr-0"
                    />
                  </button>
                </template>
              </div>
            </div>
          </div>

           <div v-if="settings.ttsProvider === 'browser_tts' || browserVoices.length">
            <div class="dropdown-divider-ephemeral"></div>
            <div class="setting-group-in-dropdown px-1.5 py-1">
              <label class="dropdown-section-title-ephemeral !mb-1.5 !mt-0 flex items-center">
                <BrowserVoicesIcon class="section-title-icon-ephemeral" aria-hidden="true" /> Browser Voices
              </label>
              <div class="voice-list-placeholder">
                <template v-if="voicesLoading">
                  <p class="voice-list-placeholder__empty">Loading browser voices…</p>
                </template>
                <template v-else-if="browserVoices.length === 0">
                  <p class="voice-list-placeholder__empty">No browser voices detected. Check system voice settings.</p>
                </template>
                <template v-else>
                  <button
                    v-for="voice in browserVoices"
                    :key="voice.id"
                    @click="selectVoice(voice.id)"
                    class="dropdown-item-ephemeral !text-xs !py-1.5 !px-2 voice-list-placeholder__option"
                    :class="{'active font-semibold': selectedTtsVoiceId === voice.id}"
                    role="menuitemradio"
                    :aria-checked="selectedTtsVoiceId === voice.id"
                  >
                    <span class="voice-list-placeholder__label">{{ voice.name }}</span>
                    <span class="voice-list-placeholder__meta">
                      {{ voice.lang ? voice.lang.toUpperCase() : '—' }}
                      <span v-if="voice.isDefault" class="voice-list-placeholder__badge">Default</span>
                    </span>
                    <SelectedOptionIcon
                      v-if="selectedTtsVoiceId === voice.id"
                      class="dropdown-item-icon icon-xs !ml-auto !mr-0"
                    />
                  </button>
                </template>
              </div>
            </div>
          </div>
            <div class="dropdown-divider-ephemeral"></div>
             <RouterLink :to="`/${$route.params.locale || 'en-US'}/settings#audio-voice-settings`" @click="closeDropdown" role="menuitem" class="dropdown-item-ephemeral group">
                <AdjustmentsHorizontalIcon class="dropdown-item-icon" aria-hidden="true"/>
                <span>All Voice Settings</span>
            </RouterLink>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/abstracts/variables' as var;

.header-control-item {
  position: relative;
}

.chevron-indicator {
  opacity: 0.7;
}

.setting-group-in-dropdown {
  padding: var.$spacing-xs var.$spacing-xs;
}

.options-grid-dropdown {
  gap: calc(var.$spacing-xs * 0.75);
}

.option-button-dropdown {
  display: flex; // Ensure flex properties apply for alignment
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var.$spacing-xs;
  border-radius: var.$radius-lg;
  text-align: center;
  background-color: hsla(var(--color-bg-tertiary-h), var(--color-bg-tertiary-s), var(--color-bg-tertiary-l), 0.4);
  border: 1px solid hsla(var(--color-border-secondary-h), var(--color-border-secondary-s), var(--color-border-secondary-l), 0.25);
  color: hsl(var(--color-text-secondary-h), var(--color-text-secondary-s), var(--color-text-secondary-l));
  transition: all var.$duration-quick var.$ease-out-quad;
  min-height: 60px;
  cursor: pointer;

  .option-icon-dropdown {
    width: 1.4rem;
    height: 1.4rem;
    margin-bottom: calc(var.$spacing-xs * 0.3);
    opacity: 0.75;
  }
  .option-label-dropdown {
    font-weight: 500;
    font-size: calc(var.$font-size-xs * 0.9);
    line-height: 1.2;
    margin-top: auto;
  }

  &:hover {
    background-color: hsla(var(--color-accent-interactive-h), var(--color-accent-interactive-s), var(--color-accent-interactive-l), 0.12);
    border-color: hsla(var(--color-accent-interactive-h), var(--color-accent-interactive-s), var(--color-accent-interactive-l), 0.4);
    color: hsl(var(--color-accent-interactive-h), var(--color-accent-interactive-s), var(--color-accent-interactive-l));
    transform: translateY(-2px);
    box-shadow: var(--shadow-depth-sm);
    .option-icon-dropdown { opacity: 1; }
  }

  &.active {
    background-color: hsla(var(--color-accent-interactive-h), var(--color-accent-interactive-s), var(--color-accent-interactive-l), 0.25) !important;
    border-color: hsla(var(--color-accent-interactive-h), var(--color-accent-interactive-s), var(--color-accent-interactive-l), 0.65) !important;
    color: hsl(var(--color-accent-interactive-h), var(--color-accent-interactive-s), var(--color-accent-interactive-l)) !important;
    font-weight: 600;
    box-shadow: inset 0 1px 3px hsla(var(--color-accent-interactive-h), var(--color-accent-interactive-s), calc(var(--color-accent-interactive-l) - 10%), 0.3),
                var(--shadow-depth-xs);
    .option-icon-dropdown { opacity: 1; transform: scale(1.05); }
  }
}
.voice-list-placeholder {
  display: flex;
  flex-direction: column;
  gap: calc(var.$spacing-xs * 0.35);
}

.voice-list-placeholder__empty {
  font-size: var.$font-size-xs;
  text-align: center;
  color: hsl(var(--color-text-muted-h), var(--color-text-muted-s), var(--color-text-muted-l));
  padding: calc(var.$spacing-xs * 0.75) calc(var.$spacing-xs * 0.5);
  border-radius: var.$radius-md;
  background-color: hsla(var(--color-bg-tertiary-h), var(--color-bg-tertiary-s), var(--color-bg-tertiary-l), 0.35);
  border: 1px dashed hsla(var(--color-border-secondary-h), var(--color-border-secondary-s), var(--color-border-secondary-l), 0.3);
}

.voice-list-placeholder__option {
  display: flex !important;
  align-items: center;
  gap: calc(var.$spacing-xs * 0.5);
  padding-top: calc(var.$spacing-xs / 2) !important;
  padding-bottom: calc(var.$spacing-xs / 2) !important;
  font-size: var.$font-size-xs !important;
  font-weight: 400 !important;

  &.active {
    font-weight: 600 !important;
    background-color: hsla(var(--color-accent-interactive-h), var(--color-accent-interactive-s), var(--color-accent-interactive-l), 0.2) !important;
    border-color: hsla(var(--color-accent-interactive-h), var(--color-accent-interactive-s), var(--color-accent-interactive-l), 0.45) !important;
  }
}

.voice-list-placeholder__label {
  flex: 1 1 auto;
  text-align: left;
}

.voice-list-placeholder__meta {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  gap: calc(var.$spacing-xs * 0.25);
  font-size: calc(var.$font-size-xs * 0.95);
  color: hsl(var(--color-text-muted-h), var(--color-text-muted-s), var(--color-text-muted-l));
}

.voice-list-placeholder__badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 calc(var.$spacing-xs * 0.35);
  border-radius: 999px;
  background-color: hsla(var(--color-accent-interactive-h), var(--color-accent-interactive-s), var(--color-accent-interactive-l), 0.18);
  color: hsl(var(--color-accent-interactive-h), var(--color-accent-interactive-s), var(--color-accent-interactive-l));
  font-size: calc(var.$font-size-xs * 0.85);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.section-title-icon-ephemeral {
    width: 0.9em;
    height: 0.9em;
    opacity: 0.7;
    margin-right: calc(var.$spacing-xs * 0.5);
}

.device-select-dropdown {
  width: 100%;
  padding: var.$spacing-xs;
  border-radius: var.$radius-md;
  background-color: hsla(var(--color-bg-tertiary-h), var(--color-bg-tertiary-s), var(--color-bg-tertiary-l), 0.6);
  border: 1px solid hsla(var(--color-border-secondary-h), var(--color-border-secondary-s), var(--color-border-secondary-l), 0.3);
  color: hsl(var(--color-text-primary-h), var(--color-text-primary-s), var(--color-text-primary-l));
  font-size: var.$font-size-xs;
  transition: all var.$duration-quick var.$ease-out-quad;
  cursor: pointer;

  &:hover:not(:disabled) {
    background-color: hsla(var(--color-bg-tertiary-h), var(--color-bg-tertiary-s), var(--color-bg-tertiary-l), 0.8);
    border-color: hsla(var(--color-accent-interactive-h), var(--color-accent-interactive-s), var(--color-accent-interactive-l), 0.4);
  }

  &:focus {
    outline: none;
    border-color: hsla(var(--color-accent-interactive-h), var(--color-accent-interactive-s), var(--color-accent-interactive-l), 0.6);
    box-shadow: 0 0 0 2px hsla(var(--color-accent-interactive-h), var(--color-accent-interactive-s), var(--color-accent-interactive-l), 0.15);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  option {
    background-color: hsl(var(--color-bg-primary-h), var(--color-bg-primary-s), var(--color-bg-primary-l));
    color: hsl(var(--color-text-primary-h), var(--color-text-primary-s), var(--color-text-primary-l));
  }
}
// Removed empty .status-dot-indicator rule as it's styled via Tailwind in template
</style>
