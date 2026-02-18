// File: frontend/src/components/common/PersonaToolbar.vue
<script setup lang="ts">
import { computed, inject, ref, watch, onMounted, onUnmounted, type Component } from 'vue';
import type { ToastService } from '@/services/services';
import type { AgentId, IAgentDefinition } from '@/services/agent.service';
import { useChatStore } from '@/store/chat.store';
import UsageStatusBadge from '@/components/common/UsageStatusBadge.vue';
import { voiceSettingsManager } from '@/services/voice.settings.service';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { XMarkIcon } from '@heroicons/vue/24/solid';
import {
  GlobeAltIcon,
  ChevronDownIcon,
  SparklesIcon,
  MicrophoneIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
  AdjustmentsHorizontalIcon,
  LanguageIcon,
  CloudIcon,
  CheckIcon,
  PlayIcon,
} from '@heroicons/vue/24/outline';
import { chatAPI } from '@/utils/api';
import { useCostStore } from '@/store/cost.store';

type PersonaModalView = 'editor' | 'library';

interface PersonaPreset {
  id: string;
  label: string;
  summary: string;
  persona: string;
}

type CompactSectionId = 'persona' | 'speech' | 'session';

interface CompactStatusItem {
  id: 'mode' | 'stt' | 'tts' | 'speech' | 'credits' | 'session';
  label: string;
  subLabel?: string;
  badge?: string;
  icon: Component;
  theme?: 'neutral' | 'accent' | 'info' | 'primary' | 'warning' | 'muted';
}

interface CompactSectionButton {
  id: CompactSectionId;
  label: string;
  icon: Component;
}

const PERSONA_PRESETS_PER_PAGE = 4;
const usdFormatter = new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
const compactNumberFormatter = new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 });
const minuteFormatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });

const props = withDefaults(defineProps<{
  agent: Readonly<IAgentDefinition> | undefined | null;
  showUsageBadge?: boolean;
  tokensTotal?: number | null;
  tokensUsed?: number | null;
  persistPersona?: boolean;
  variant?: 'default' | 'compact';
}>(), {
  showUsageBadge: false,
  tokensTotal: null,
  tokensUsed: null,
  persistPersona: true,
  variant: 'default',
});

const chatStore = useChatStore();
const costStore = useCostStore();
const {
  totalSessionCost,
  sessionEntryCount,
  sessionCostThreshold,
  isThresholdReached,
  isLoadingCost,
} = storeToRefs(costStore);
const toast = inject<ToastService>('toast');
const { locale } = useI18n();
const router = useRouter();

const languageMenuOpen = ref(false);
const languageMenuRef = ref<HTMLElement | null>(null);
const languageTriggerRef = ref<HTMLElement | null>(null);
const manualLanguageSelection = ref('');
const voiceMenuOpen = ref(false);
const voiceMenuLoading = ref(false);
const voiceMenuRef = ref<HTMLElement | null>(null);
const voiceMenuTriggerRef = ref<HTMLElement | null>(null);

const currentAgent = computed(() => props.agent ?? undefined);
const currentAgentId = computed<AgentId | null>(() => currentAgent.value?.id ?? null);
const activePersona = computed(() => currentAgentId.value ? chatStore.getPersonaForAgent(currentAgentId.value) : null);

const speechLanguage = computed(() => voiceSettingsManager.settings.speechLanguage);
const responseLanguageMode = computed(() => voiceSettingsManager.settings.responseLanguageMode ?? 'auto');
const detectedSpeechLanguage = voiceSettingsManager.detectedSpeechLanguage;
const detectedResponseLanguage = voiceSettingsManager.detectedResponseLanguage;
const languagePreferenceLocked = voiceSettingsManager.languagePreferenceLocked;
const sttAutoDetectEnabled = computed(() => Boolean(voiceSettingsManager.settings.sttAutoDetectLanguage));
const interfaceLanguage = computed(() => locale.value);

const formatLanguageName = (code?: string | null): string => {
  if (!code) return 'Unknown';
  try {
    return new Intl.DisplayNames([code.split('-')[0]], { type: 'language' }).of(code) || code;
  } catch {
    return code;
  }
};

const describeLanguage = (code?: string | null): string => {
  if (!code) return 'Unknown';
  const normalized = code.toLowerCase();
  if (normalized.startsWith('en-us')) return 'American English';
  if (normalized.startsWith('en')) return 'English';
  return formatLanguageName(code);
};

const availableLanguageOptions = computed(() => {
  const set = new Set<string>();
  voiceSettingsManager.availableTtsVoices.value.forEach((voice) => {
    if (voice.lang) set.add(voice.lang);
  });
  [speechLanguage.value, interfaceLanguage.value, detectedSpeechLanguage.value ?? undefined, detectedResponseLanguage.value ?? undefined]
    .filter(Boolean)
    .forEach((code) => set.add(code as string));
  return Array.from(set)
    .sort((a, b) => formatLanguageName(a).localeCompare(formatLanguageName(b)))
    .map((code) => ({ code, label: formatLanguageName(code) }));
});

const isCompactVariant = computed(() => props.variant === 'compact');
const compactActiveSection = ref<CompactSectionId>('persona');

const compactSectionButtons: CompactSectionButton[] = [
  { id: 'persona', label: 'Persona', icon: SparklesIcon },
  { id: 'speech', label: 'Audio', icon: SpeakerWaveIcon },
  { id: 'session', label: 'Session', icon: LanguageIcon },
];

const compactExpanded = ref(false);

const toggleCompactExpansion = (): void => {
  compactExpanded.value = !compactExpanded.value;
  if (!compactExpanded.value) {
    voiceMenuOpen.value = false;
    languageMenuOpen.value = false;
  }
};

const openCompactSection = (section: CompactSectionId): void => {
  if (!compactExpanded.value) {
    compactExpanded.value = true;
  }
  compactActiveSection.value = section;
  if (section !== 'session') {
    languageMenuOpen.value = false;
  }
};

const isSectionActive = (section: CompactSectionId): boolean =>
  compactActiveSection.value === section;

const handlePersonaChipClick = (): void => {
  if (personaButtonDisabled.value) {
    openPersonaModal();
    return;
  }
  openCompactSection('persona');
};

const handleSpeechChipClick = (): void => {
  openCompactSection('speech');
};

const handleSessionChipClick = (): void => {
  openCompactSection('session');
};

const languageSummaryLabel = computed(() => {
  let label: string;
  if (languagePreferenceLocked.value) {
    label = `Language: ${formatLanguageName(speechLanguage.value)} (locked)`;
  } else if (sttAutoDetectEnabled.value) {
    const detected = detectedSpeechLanguage.value || detectedResponseLanguage.value;
    label = detected ? `Language: Auto (${formatLanguageName(detected)})` : 'Language: Auto';
  } else if (responseLanguageMode.value === 'fixed') {
    label = `Language: ${formatLanguageName(voiceSettingsManager.settings.fixedResponseLanguage || speechLanguage.value)}`;
  } else if (responseLanguageMode.value === 'follow-stt') {
    label = `Language: Follow STT (${formatLanguageName(speechLanguage.value)})`;
  } else {
    label = `Language: ${formatLanguageName(speechLanguage.value)}`;
  }

  if (voiceFallbackInfo.value) {
    label += ` · Speaking: ${describeLanguage(voiceFallbackInfo.value.resolvedLang)}`;
  }

  return label;
});

const audioInputModeSetting = computed(() => voiceSettingsManager.settings.audioInputMode);
const sttPreferenceSetting = computed(() => voiceSettingsManager.settings.sttPreference);
const ttsProviderSetting = computed(() => voiceSettingsManager.settings.ttsProvider);
const autoPlaySpeechSetting = computed(() => voiceSettingsManager.settings.autoPlayTts);

watch(() => props.variant, (variant) => {
  if (variant !== 'compact') {
    compactActiveSection.value = 'persona';
    languageMenuOpen.value = false;
    voiceMenuOpen.value = false;
    compactExpanded.value = false;
  }
});

watch(ttsProviderSetting, () => {
  voiceMenuOpen.value = false;
  voiceMenuLoading.value = false;
  voiceMenuError.value = null;
});

watch(compactActiveSection, (section) => {
  if (section !== 'speech') {
    voiceMenuOpen.value = false;
  }
});

watch(voiceMenuOpen, (isOpen) => {
  if (!isOpen) {
    voiceMenuLoading.value = false;
    voiceMenuError.value = null;
    voicePreviewing.value = null;
  }
});

watch(compactExpanded, (expanded) => {
  if (!expanded) {
    voiceMenuOpen.value = false;
    languageMenuOpen.value = false;
  }
});

const currentVoiceOption = computed(() => voiceSettingsManager.getCurrentTtsVoice());
const currentVoiceShort = computed(() => {
  const voice = currentVoiceOption.value;
  if (!voice) {
    return ttsProviderSetting.value === 'openai_tts' ? 'OpenAI Default' : 'System Voice';
  }
  const voiceName = voice.name?.split('(')[0]?.trim() || voice.name || 'Custom Voice';
  const languageCode = voice.lang ? voice.lang.replace('_', '-').toUpperCase() : null;
  const languageShort = languageCode ? languageCode.split('-').slice(0, 2).join('-') : null;
  return languageShort ? `${voiceName} · ${languageShort}` : voiceName;
});
const currentVoiceProviderLabel = computed(() =>
  ttsProviderSetting.value === 'openai_tts' ? 'OpenAI voice' : 'Browser voice',
);
const currentVoiceId = computed(() => voiceSettingsManager.settings.selectedTtsVoiceId ?? null);
const ttsVoicesLoaded = computed(() => voiceSettingsManager.ttsVoicesLoaded.value);
const voiceFallbackInfo = computed(() => voiceSettingsManager.ttsLanguageFallback.value);
const voiceFallbackMessage = computed(() => {
  const info = voiceFallbackInfo.value;
  if (!info) return null;
  const requested = describeLanguage(info.requestedLang);
  const resolved = describeLanguage(info.resolvedLang);
  const providerLabel = info.provider === 'openai_tts' ? 'OpenAI voice' : 'browser voice';
  return `${providerLabel} does not support ${requested}. Speaking in ${resolved} (${info.resolvedVoiceName}). The * marker denotes a fallback voice.`;
});
const currentVoiceDisplay = computed(() =>
  voiceFallbackInfo.value ? `${currentVoiceShort.value}*` : currentVoiceShort.value,
);
const currentVoiceProviderDisplay = computed(() =>
  voiceFallbackInfo.value ? `Fallback · ${currentVoiceProviderLabel.value}` : currentVoiceProviderLabel.value,
);
const voiceOptions = voiceSettingsManager.ttsVoicesForCurrentProvider;
const voicePreviewing = ref<string | null>(null);
const voiceMenuError = ref<string | null>(null);

const compactStatusItems = computed<CompactStatusItem[]>(() => {
  const items: CompactStatusItem[] = [];
  const audioMode = audioInputModeSetting.value;
  if (audioMode === 'continuous') {
    items.push({
      id: 'mode',
      label: 'Continuous',
      badge: 'Mode',
      subLabel: 'Always on',
      icon: MicrophoneIcon,
      theme: 'accent',
    });
  } else if (audioMode === 'voice-activation') {
    items.push({
      id: 'mode',
      label: 'Wake',
      badge: 'Mode',
      subLabel: 'Voice trigger',
      icon: MicrophoneIcon,
      theme: 'accent',
    });
  } else {
    items.push({
      id: 'mode',
      label: 'Push-to-talk',
      badge: 'Mode',
      subLabel: 'Press & speak',
      icon: MicrophoneIcon,
      theme: 'accent',
    });
  }

  if (sttPreferenceSetting.value === 'whisper_api') {
    items.push({
      id: 'stt',
      label: 'Whisper',
      badge: 'STT',
      subLabel: 'OpenAI',
      icon: CloudIcon,
      theme: 'primary',
    });
  } else {
    items.push({
      id: 'stt',
      label: 'Web Speech',
      badge: 'STT',
      subLabel: 'Browser',
      icon: GlobeAltIcon,
      theme: 'info',
    });
  }

  const ttsTheme = voiceFallbackInfo.value
    ? 'warning'
    : ttsProviderSetting.value === 'openai_tts'
      ? 'primary'
      : 'neutral';
  items.push({
    id: 'tts',
    label: currentVoiceDisplay.value,
    badge: 'TTS',
    subLabel: currentVoiceProviderDisplay.value,
    icon: ttsProviderSetting.value === 'openai_tts' ? SparklesIcon : SpeakerWaveIcon,
    theme: ttsTheme,
  });

  items.push({
    id: 'speech',
    label: autoPlaySpeechSetting.value ? 'Auto' : 'Manual',
    badge: 'Playback',
    subLabel: 'Speech',
    icon: autoPlaySpeechSetting.value ? SpeakerWaveIcon : SpeakerXMarkIcon,
    theme: autoPlaySpeechSetting.value ? 'accent' : 'muted',
  });

  items.push({
    id: 'credits',
    label: speechCreditsShort.value,
    badge: 'Credits',
    subLabel: 'Speech',
    icon: SparklesIcon,
    theme: 'info',
  });

  items.push({
    id: 'session',
    label: sessionCostShort.value,
    badge: 'Usage',
    subLabel: 'Session',
    icon: AdjustmentsHorizontalIcon,
    theme: 'neutral',
  });

  return items;
});

const toggleSpeechAutoPlay = (): void => {
  voiceSettingsManager.updateSetting('autoPlayTts', !autoPlaySpeechSetting.value);
};

const ensureVoicesLoaded = async (): Promise<void> => {
  if (ttsVoicesLoaded.value) return;
  await voiceSettingsManager.loadAllTtsVoices();
};

const toggleVoiceMenu = async (): Promise<void> => {
  if (voiceMenuOpen.value) {
    voiceMenuOpen.value = false;
    return;
  }
  voiceMenuError.value = null;
  voiceMenuLoading.value = true;
  try {
    await ensureVoicesLoaded();
  } catch (error: any) {
    const message =
      error?.message ??
      (typeof error === 'string' ? error : 'Failed to load available voices. Please try again.');
    voiceMenuError.value = message;
    console.error('[PersonaToolbar] Unable to load voices for quick switcher:', error);
    toast?.add?.({
      type: 'error',
      title: 'Voice list unavailable',
      message,
      duration: 4200,
    });
  } finally {
    voiceMenuLoading.value = false;
    voiceMenuOpen.value = true;
  }
};

const reloadVoiceOptions = async (): Promise<void> => {
  voiceMenuError.value = null;
  voiceMenuLoading.value = true;
  try {
    await voiceSettingsManager.loadAllTtsVoices();
    toast?.add?.({
      type: 'success',
      title: 'Voices refreshed',
      message: 'Fetched the latest voice catalog.',
      duration: 3200,
    });
  } catch (error: any) {
    const message =
      error?.message ??
      (typeof error === 'string' ? error : 'Could not refresh voice catalog.');
    voiceMenuError.value = message;
    console.error('[PersonaToolbar] Voice catalog refresh failed:', error);
    toast?.add?.({
      type: 'error',
      title: 'Refresh failed',
      message,
      duration: 3600,
    });
  } finally {
    voiceMenuLoading.value = false;
  }
};

const selectVoice = (voiceId: string): void => {
  if (currentVoiceId.value === voiceId) {
    voiceMenuOpen.value = false;
    return;
  }
  voiceSettingsManager.updateSetting('selectedTtsVoiceId', voiceId);
  voiceMenuOpen.value = false;
  const selectedVoice = voiceOptions.value.find((voice) => voice.id === voiceId);
  if (selectedVoice) {
    toast?.add?.({
      type: 'success',
      title: 'Voice updated',
      message: `Responses will play with ${selectedVoice.name}.`,
      duration: 3400,
    });
  }
};

const previewVoice = async (voiceId: string): Promise<void> => {
  voicePreviewing.value = voiceId;
  try {
    await voiceSettingsManager.previewVoice(voiceId);
  } catch (error: any) {
    console.error('[PersonaToolbar] Voice preview failed:', error);
    toast?.add?.({
      type: 'error',
      title: 'Preview failed',
      message: 'Could not play the preview audio. Please try again shortly.',
      duration: 3600,
    });
  } finally {
    if (voicePreviewing.value === voiceId) {
      voicePreviewing.value = null;
    }
  }
};

const openVoiceSettings = (): void => {
  try {
    void router.push({ name: 'Settings', hash: '#voice' });
  } catch (error) {
    console.warn('[PersonaToolbar] Failed to open voice settings route:', error);
  }
};

const isAutoModeActive = computed(() => sttAutoDetectEnabled.value && !languagePreferenceLocked.value);
const isInterfaceModeActive = computed(() => !languagePreferenceLocked.value && !sttAutoDetectEnabled.value && formatLanguageName(speechLanguage.value) === formatLanguageName(interfaceLanguage.value));
const manualModeActive = computed(() => languagePreferenceLocked.value && !sttAutoDetectEnabled.value);
const hasDetectedLanguage = computed(() => Boolean(detectedSpeechLanguage.value || detectedResponseLanguage.value));

watch(speechLanguage, (newLang) => {
  if (!languageMenuOpen.value) {
    manualLanguageSelection.value = newLang;
  }
});

watch(languageMenuOpen, (isOpen) => {
  if (isOpen) {
    manualLanguageSelection.value = speechLanguage.value;
  }
});

const isPersonaModalOpen = ref(false);
const personaDraft = ref('');
const personaModalView = ref<PersonaModalView>('editor');
const personaPresetPage = ref(1);

const personaHasCustom = computed(() => !!activePersona.value?.trim());
const personaButtonLabel = computed(() => personaHasCustom.value ? 'Tone & Persona: Custom' : 'Tone & Persona');
const personaButtonDisabled = computed(() => !currentAgentId.value);

const personaTooltipText = computed(() => {
  const agentName = currentAgent.value?.label || 'this assistant';
  return personaHasCustom.value
    ? `${agentName} is using your custom persona settings. Click to adjust or clear them.`
    : `Add a persona overlay to tune tone or personality. ${agentName}'s core role stays the same.`;
});

const personaSummaryText = computed(() => {
  const value = activePersona.value?.trim();
  if (!value) return '';
  return value.length <= 160 ? value : `${value.slice(0, 160)}...`;
});

const personaChipTitle = computed(() => (personaHasCustom.value ? 'Custom persona' : 'Default persona'));
const personaChipSubtitle = computed(() => {
  if (personaHasCustom.value && personaSummaryText.value) {
    return personaSummaryText.value;
  }
  const agentName = currentAgent.value?.label || 'Assistant';
  return `Natural responses from ${agentName}`;
});

const personaDraftHasContent = computed(() => personaDraft.value.trim().length > 0);

const personaPresets: PersonaPreset[] = [
  {
    id: 'mentor',
    label: 'Calm Mentor',
    summary: 'Warm, patient explanations.',
    persona: `You are a calm senior mentor. Speak warmly, break solutions into numbered steps, explain trade-offs, and end with a concise recap plus the next step the user should take.`,
  },
  {
    id: 'pair-partner',
    label: 'Pair Partner',
    summary: 'Collaborative pair programmer.',
    persona: `You act as an enthusiastic pair-programming partner. Think out loud, ask brief confirmation questions, highlight alternative approaches, and keep the conversation collaborative.`,
  },
  {
    id: 'architect',
    label: 'System Architect',
    summary: 'Structured architecture insights.',
    persona: `You are a pragmatic system architect. Start with assumptions, outline architecture layers, mention scaling considerations, and suggest diagrams or models when helpful.`,
  },
  {
    id: 'debugging-buddy',
    label: 'Debugging Buddy',
    summary: 'Methodical debugging partner.',
    persona: `You are a methodical debugging partner. Form hypotheses, list likely root causes, suggest focused experiments, and interpret possible outcomes to converge on a fix.`,
  },
  {
    id: 'product-bridge',
    label: 'Product Translator',
    summary: 'Connects tech to user impact.',
    persona: `You translate technical decisions into product impact. Use plain language, emphasize user outcomes, note risks, and propose lightweight validation ideas.`,
  },
  {
    id: 'coach',
    label: 'Encouraging Coach',
    summary: 'Short study partner motivator.',
    persona: `You are an encouraging exam coach. Provide concise explanations, suggest memory aids, recommend spaced-repetition prompts, and motivate the user with positive reinforcement.`,
  },
];

const personaPresetTotalPages = computed(() => Math.max(1, Math.ceil(personaPresets.length / PERSONA_PRESETS_PER_PAGE)));
const personaPresetsForCurrentPage = computed(() => {
  const startIndex = (personaPresetPage.value - 1) * PERSONA_PRESETS_PER_PAGE;
  return personaPresets.slice(startIndex, startIndex + PERSONA_PRESETS_PER_PAGE);
});

const toggleLanguageMenu = (): void => {
  languageMenuOpen.value = !languageMenuOpen.value;
  if (languageMenuOpen.value) {
    manualLanguageSelection.value = speechLanguage.value;
  }
};

const closeLanguageMenu = (): void => {
  languageMenuOpen.value = false;
};

const applyAutoLanguage = (): void => {
  voiceSettingsManager.clearManualLanguagePreference();
  voiceSettingsManager.settings.sttAutoDetectLanguage = true;
  voiceSettingsManager.settings.responseLanguageMode = 'follow-stt';
  closeLanguageMenu();
};

const applyInterfaceLanguage = (): void => {
  voiceSettingsManager.clearManualLanguagePreference();
  voiceSettingsManager.applyInterfaceLocale(interfaceLanguage.value);
  voiceSettingsManager.settings.sttAutoDetectLanguage = false;
  closeLanguageMenu();
};

const applyDetectedLanguage = (): void => {
  const candidate = detectedSpeechLanguage.value || detectedResponseLanguage.value;
  if (!candidate) return;
  voiceSettingsManager.setManualLanguagePreference(candidate, { mode: 'follow-stt' });
  voiceSettingsManager.settings.sttAutoDetectLanguage = true;
  closeLanguageMenu();
};

const applyManualLanguage = (): void => {
  if (!manualLanguageSelection.value) return;
  voiceSettingsManager.setManualLanguagePreference(manualLanguageSelection.value, { mode: 'fixed' });
  voiceSettingsManager.settings.sttAutoDetectLanguage = false;
  closeLanguageMenu();
};

const handleVoiceMenuClickOutside = (event: MouseEvent): void => {
  if (!voiceMenuOpen.value) return;
  const target = event.target as Node;
  if (
    voiceMenuRef.value &&
    !voiceMenuRef.value.contains(target) &&
    voiceMenuTriggerRef.value &&
    !voiceMenuTriggerRef.value.contains(target)
  ) {
    voiceMenuOpen.value = false;
  }
};

const handleLanguageMenuClickOutside = (event: MouseEvent): void => {
  if (!languageMenuOpen.value) return;
  const target = event.target as Node;
  if (
    languageMenuRef.value &&
    !languageMenuRef.value.contains(target) &&
    languageTriggerRef.value &&
    !languageTriggerRef.value.contains(target)
  ) {
    closeLanguageMenu();
  }
};

const persistPersonaSetting = computed(() => Boolean(props.persistPersona));
const usageBadgeVisible = computed(() =>
  props.showUsageBadge &&
  typeof props.tokensTotal === 'number' &&
  typeof props.tokensUsed === 'number',
);

const speechCredits = computed(() => voiceSettingsManager.creditsSnapshot.value?.speech ?? null);
const speechCreditsPercent = computed<number | null>(() => {
  const speech = speechCredits.value;
  if (!speech || speech.isUnlimited) return null;
  const total = speech.totalUsd ?? null;
  const remaining = speech.remainingUsd ?? null;
  if (total === null || remaining === null || total <= 0) return null;
  const percent = (remaining / total) * 100;
  return Math.round(Math.min(100, Math.max(0, percent)));
});

const speechCreditsSummary = computed(() => {
  const speech = speechCredits.value;
  if (!speech) return 'Speech credits syncing…';
  if (speech.isUnlimited) return 'Unlimited speech coverage';
  const minutes = speech.approxWhisperMinutesRemaining ?? null;
  const characters = speech.approxTtsCharactersRemaining ?? null;
  const remainingUsd = speech.remainingUsd ?? null;

  const segments: string[] = [];
  if (typeof minutes === 'number' && minutes >= 0) {
    segments.push(`${minuteFormatter.format(Math.max(0, Math.floor(minutes)))} min`);
  }
  if (typeof characters === 'number' && characters > 0) {
    segments.push(`${compactNumberFormatter.format(characters)} chars`);
  }
  if (segments.length > 0) {
    return `${segments.join(' • ')} left`;
  }
  if (typeof remainingUsd === 'number') {
    return `${usdFormatter.format(Math.max(0, remainingUsd))} remaining`;
  }
  return 'Speech credits active';
});
const speechCreditsState = computed<'loading' | 'ok' | 'warning' | 'critical'>(() => {
  const speech = speechCredits.value;
  if (!speech) return 'loading';
  if (speech.isUnlimited) return 'ok';
  const percent = speechCreditsPercent.value;
  if (percent === null) {
    const remaining = speech.remainingUsd ?? null;
    if (remaining !== null && remaining <= 0) return 'critical';
    return 'ok';
  }
  if (percent <= 5) return 'critical';
  if (percent <= 20) return 'warning';
  return 'ok';
});

const speechCreditsStateClass = computed(() => `persona-voice-toolbar__stat--${speechCreditsState.value}`);
const speechCreditsMeterWidth = computed<string | null>(() => {
  const percent = speechCreditsPercent.value;
  if (percent === null) return null;
  return `${Math.max(6, percent)}%`;
});

const speechCreditsShort = computed(() => {
  const speech = speechCredits.value;
  if (!speech) return 'Syncing';
  if (speech.isUnlimited) return '8';
  const percent = speechCreditsPercent.value;
  if (percent !== null) {
    return `${Math.max(0, Math.round(percent))}% left`;
  }
  const remainingUsd = speech.remainingUsd ?? null;
  if (remainingUsd !== null) {
    return `$${remainingUsd.toFixed(2)} left`;
  }
  return 'Active';
});

const speechChipTitle = computed(() => speechCreditsShort.value || 'Speech credits');
const speechChipSubtitle = computed(() => speechCreditsSummary.value);

const sessionCostValue = computed(() => totalSessionCost.value ?? 0);
const sessionEntries = computed(() => sessionEntryCount.value ?? 0);
const sessionThreshold = computed(() => sessionCostThreshold.value ?? null);
const sessionPercent = computed<number | null>(() => {
  const threshold = sessionThreshold.value;
  if (!threshold || threshold <= 0) return null;
  const percent = (sessionCostValue.value / threshold) * 100;
  return Math.min(100, Math.max(0, percent));
});

const sessionCostSummary = computed(() => {
  if (isLoadingCost.value) return 'Loading usage…';
  const costPart = usdFormatter.format(sessionCostValue.value);
  const thresholdPart = sessionThreshold.value && sessionThreshold.value > 0
    ? ` / ${usdFormatter.format(sessionThreshold.value)}`
    : '';
  const turnCount = sessionEntries.value;
  const entriesPart = `${turnCount} ${turnCount === 1 ? 'turn' : 'turns'}`;
  return `${costPart}${thresholdPart} • ${entriesPart}`;
});
const sessionCostState = computed<'loading' | 'ok' | 'info' | 'warning' | 'critical'>(() => {
  if (isLoadingCost.value) return 'loading';
  const threshold = sessionThreshold.value;
  if (threshold && threshold > 0) {
    if (isThresholdReached.value || sessionCostValue.value >= threshold) {
      return 'critical';
    }
    const percent = sessionPercent.value ?? 0;
    if (percent >= 75) {
      return 'warning';
    }
  }
  if (sessionCostValue.value >= 25) {
    return 'info';
  }
  return 'ok';
});

const sessionCostStateClass = computed(() => `persona-voice-toolbar__stat--${sessionCostState.value}`);
const sessionMeterWidth = computed<string | null>(() => {
  const percent = sessionPercent.value;
  if (percent === null) return null;
  return `${Math.max(6, percent)}%`;
});

const sessionCostShort = computed(() => {
  if (isLoadingCost.value) return 'Syncing';
  const cost = sessionCostValue.value;
  const threshold = sessionThreshold.value;
  if (threshold && threshold > 0) {
    return `${usdFormatter.format(cost)} / ${usdFormatter.format(threshold)}`;
  }
  return usdFormatter.format(cost);
});

const sessionChipTitle = computed(() => usdFormatter.format(sessionCostValue.value));
const sessionChipSubtitle = computed(() => {
  const parts: string[] = [];
  const turns = sessionEntries.value;
  parts.push(`${turns} ${turns === 1 ? 'turn' : 'turns'}`);
  if (sessionThreshold.value && sessionThreshold.value > 0) {
    parts.push(`limit ${usdFormatter.format(sessionThreshold.value)}`);
  }
  return parts.join(' · ');
});

const openPersonaModal = (): void => {
  if (personaButtonDisabled.value) {
    toast?.add?.({
      type: 'warning',
      title: 'Select an Assistant',
      message: 'Pick an assistant before adjusting persona tone.',
    });
    return;
  }
  personaDraft.value = activePersona.value ?? '';
  personaModalView.value = 'editor';
  personaPresetPage.value = 1;
  isPersonaModalOpen.value = true;
};

const closePersonaModal = (): void => {
  isPersonaModalOpen.value = false;
};

const applyPersonaPreset = (preset: PersonaPreset): void => {
  personaDraft.value = preset.persona;
  personaModalView.value = 'editor';
};

const goToNextPersonaPresetPage = (): void => {
  if (personaPresetTotalPages.value <= 1) return;
  personaPresetPage.value = personaPresetPage.value >= personaPresetTotalPages.value ? 1 : personaPresetPage.value + 1;
};

const goToPreviousPersonaPresetPage = (): void => {
  if (personaPresetTotalPages.value <= 1) return;
  personaPresetPage.value = personaPresetPage.value <= 1 ? personaPresetTotalPages.value : personaPresetPage.value - 1;
};

const resetPersonaToDefault = async (): Promise<void> => {
  if (!currentAgentId.value) return;
  personaDraft.value = '';
  const success = await updatePersona(null, {
    successTitle: 'Default Persona Restored',
    successMessage: 'Cleared tone adjustments for this assistant.',
  });
  if (success) {
    isPersonaModalOpen.value = false;
  }
};

const updatePersona = async (
  persona: string | null,
  messages: { successTitle: string; successMessage: string },
): Promise<boolean> => {
  if (!currentAgentId.value) return false;
  const trimmed = personaDraft.value.trim();
  const personaToSave = persona ?? (trimmed ? trimmed : null);

  if (!personaToSave && persona !== null) {
    toast?.add?.({
      type: 'warning',
      title: 'Persona Required',
      message: 'Add some persona guidance or use the default persona.',
    });
    return false;
  }

  const agentId = currentAgentId.value;
  const previousPersona = chatStore.getPersonaForAgent(agentId);

  chatStore.setPersonaForAgent(agentId, personaToSave);
  personaDraft.value = personaToSave ?? '';

  try {
    if (persistPersonaSetting.value) {
      const conversationId = chatStore.getCurrentConversationId(agentId);
      await chatAPI.updatePersona({
        agentId,
        conversationId,
        persona: personaToSave,
      });
    }
    toast?.add?.({
      type: 'success',
      title: messages.successTitle,
      message: messages.successMessage,
    });
    return true;
  } catch (error) {
    chatStore.setPersonaForAgent(agentId, previousPersona ?? null);
    personaDraft.value = previousPersona ?? '';
    console.error('[PersonaToolbar] Failed to persist persona:', error);
    toast?.add?.({
      type: 'error',
      title: 'Failed to Save Persona',
      message: 'We could not update the persona. Please try again.',
    });
    return false;
  }
};

const savePersonaFromModal = async (): Promise<void> => {
  const success = await updatePersona(null, {
    successTitle: 'Persona Updated',
    successMessage: 'Tone adjustments saved for this assistant.',
  });
  if (success) {
    isPersonaModalOpen.value = false;
  }
};

watch(activePersona, (newPersona) => {
  if (!isPersonaModalOpen.value) {
    personaDraft.value = newPersona ?? '';
  }
});

watch(isPersonaModalOpen, (isOpen) => {
  if (!isOpen) {
    personaDraft.value = '';
  }
});

watch(currentAgentId, () => {
  personaPresetPage.value = 1;
  if (!isPersonaModalOpen.value) {
    personaDraft.value = activePersona.value ?? '';
  }
});

onMounted(() => {
  document.addEventListener('mousedown', handleLanguageMenuClickOutside, true);
  document.addEventListener('mousedown', handleVoiceMenuClickOutside, true);

  void ensureVoicesLoaded().catch((error) => {
    console.warn('[PersonaToolbar] Unable to pre-load voice catalog:', error);
  });

  if (!voiceSettingsManager.creditsSnapshot.value) {
    void voiceSettingsManager.refreshCreditsSnapshot().catch((error) => {
      console.warn('[PersonaToolbar] Failed to refresh speech credits snapshot:', error);
    });
  }

  if (!isLoadingCost.value && !sessionEntryCount.value && totalSessionCost.value === 0) {
    void costStore.fetchSessionCost().catch((error) => {
      console.warn('[PersonaToolbar] Failed to refresh session cost:', error);
    });
  }
});

onUnmounted(() => {
  document.removeEventListener('mousedown', handleLanguageMenuClickOutside, true);
  document.removeEventListener('mousedown', handleVoiceMenuClickOutside, true);
});
</script>

<template>
  <div
    class="persona-voice-toolbar"
    :class="[
      `persona-voice-toolbar--${props.variant ?? 'default'}`,
      { 'persona-voice-toolbar--disabled': personaButtonDisabled }
    ]"
  >
    <template v-if="isCompactVariant">
      <div class="voice-dock" :class="{ 'is-expanded': compactExpanded }">
        <div class="voice-dock__bar">
          <button
            type="button"
            class="voice-dock__toggle"
            :aria-expanded="compactExpanded"
            @click="toggleCompactExpansion"
          >
            <ChevronDownIcon class="voice-dock__toggle-icon" :class="{ 'is-open': compactExpanded }" aria-hidden="true" />
            <span class="voice-dock__toggle-label">Voice controls</span>
          </button>
          <div class="voice-dock__chips">
            <button type="button" class="voice-chip" :aria-label="personaChipTitle" @click="handlePersonaChipClick">
              <SparklesIcon class="voice-chip__icon" aria-hidden="true" />
              <div class="voice-chip__text">
                <span class="voice-chip__title">{{ personaChipTitle }}</span>
                <span class="voice-chip__subtitle">{{ personaChipSubtitle }}</span>
              </div>
            </button>
            <button type="button" class="voice-chip" aria-label="Speech credits" @click="handleSpeechChipClick">
              <SpeakerWaveIcon class="voice-chip__icon" aria-hidden="true" />
              <div class="voice-chip__text">
                <span class="voice-chip__title">{{ speechChipTitle }}</span>
                <span class="voice-chip__subtitle">{{ speechChipSubtitle }}</span>
              </div>
            </button>
            <button type="button" class="voice-chip" aria-label="Session usage" @click="handleSessionChipClick">
              <AdjustmentsHorizontalIcon class="voice-chip__icon" aria-hidden="true" />
              <div class="voice-chip__text">
                <span class="voice-chip__title">{{ sessionChipTitle }}</span>
                <span class="voice-chip__subtitle">{{ sessionChipSubtitle }}</span>
              </div>
            </button>
          </div>
        </div>

        <transition name="voice-dock-slide">
          <div v-if="compactExpanded" class="voice-dock__drawer">
            <div class="voice-dock__status" role="list">
              <div
                v-for="item in compactStatusItems"
                :key="item.id"
                class="voice-dock-status"
                :data-theme="item.theme || 'neutral'"
                role="listitem"
              >
                <span class="voice-dock-status__icon" aria-hidden="true">
                  <component :is="item.icon" />
                </span>
                <div class="voice-dock-status__text">
                  <span class="voice-dock-status__label">
                    <span v-if="item.badge" class="voice-dock-status__badge">{{ item.badge }}</span>
                    {{ item.label }}
                  </span>
                  <span v-if="item.subLabel" class="voice-dock-status__sublabel">{{ item.subLabel }}</span>
                </div>
              </div>
            </div>

            <div class="voice-dock__tabs">
              <button
                v-for="button in compactSectionButtons"
                :key="button.id"
                type="button"
                class="voice-dock-tab"
                :class="{ 'is-active': isSectionActive(button.id) }"
                @click="openCompactSection(button.id)"
              >
                <component :is="button.icon" class="voice-dock-tab__icon" aria-hidden="true" />
                <span class="voice-dock-tab__label">{{ button.label }}</span>
              </button>
            </div>

            <div class="voice-dock__panel">
              <section
                v-if="compactActiveSection === 'persona'"
                class="persona-compact-panel"
                aria-label="Tone and persona controls"
              >
                <UsageStatusBadge
                  v-if="usageBadgeVisible"
                  class="persona-compact-panel__badge"
                  :tokens-total="tokensTotal ?? undefined"
                  :tokens-used="tokensUsed ?? undefined"
                />
                <div class="persona-compact-panel__summary">
                  <h4 class="persona-compact-panel__summary-label">{{ personaButtonLabel }}</h4>
                  <p
                    v-if="!personaButtonDisabled && personaHasCustom && personaSummaryText"
                    class="persona-compact-panel__summary-text"
                  >
                    {{ personaSummaryText }}
                  </p>
                  <p v-else class="persona-compact-panel__summary-text persona-compact-panel__summary-text--muted">
                    Personalise how this assistant responds by layering tone guidance.
                  </p>
                </div>
                <div class="persona-compact-panel__actions">
                  <button
                    type="button"
                    class="persona-compact-panel__primary"
                    :disabled="personaButtonDisabled"
                    @click="openPersonaModal"
                  >
                    <SparklesIcon class="persona-compact-panel__button-icon" aria-hidden="true" />
                    <span>Adjust persona</span>
                  </button>
                  <button
                    v-if="!personaButtonDisabled && personaHasCustom"
                    type="button"
                    class="persona-compact-panel__ghost"
                    @click="resetPersonaToDefault"
                  >
                    <XMarkIcon class="persona-compact-panel__button-icon" aria-hidden="true" />
                    <span>Clear persona</span>
                  </button>
                </div>
              </section>

              <section
                v-else-if="compactActiveSection === 'speech'"
                class="persona-compact-panel"
                aria-label="Speech status"
              >
                <div
                  class="persona-voice-toolbar__stat persona-compact-panel__stat"
                  :class="speechCreditsStateClass"
                  role="status"
                  aria-live="polite"
                >
                  <span class="persona-voice-toolbar__stat-label">Speech Credits</span>
                  <span class="persona-voice-toolbar__stat-value">{{ speechCreditsSummary }}</span>
                  <span v-if="speechCreditsMeterWidth" class="persona-voice-toolbar__stat-meter" aria-hidden="true">
                    <span class="persona-voice-toolbar__stat-meter-bar" :style="{ width: speechCreditsMeterWidth }"></span>
                  </span>
                </div>
                <div class="persona-compact-panel__controls">
                  <div class="persona-voice-picker">
                    <button
                      ref="voiceMenuTriggerRef"
                      type="button"
                      class="persona-voice-picker__trigger"
                      :aria-expanded="voiceMenuOpen"
                      @click="toggleVoiceMenu"
                      :title="voiceFallbackMessage || currentVoiceDisplay"
                    >
                      <SparklesIcon class="persona-voice-picker__trigger-icon" aria-hidden="true" />
                      <span class="persona-voice-picker__trigger-label">{{ currentVoiceDisplay }}</span>
                      <ChevronDownIcon
                        class="persona-voice-picker__trigger-chevron"
                        :class="{ 'is-open': voiceMenuOpen }"
                        aria-hidden="true"
                      />
                    </button>
                    <transition name="fade">
                      <div
                        v-if="voiceMenuOpen"
                        ref="voiceMenuRef"
                        class="persona-voice-picker__menu"
                        role="menu"
                        aria-label="Select voice"
                      >
                        <div v-if="voiceMenuLoading" class="persona-voice-picker__empty">Loading voices...</div>
                        <div v-else-if="voiceMenuError" class="persona-voice-picker__empty persona-voice-picker__empty--error">
                          {{ voiceMenuError }}
                          <button type="button" class="persona-voice-picker__refresh" @click="reloadVoiceOptions">
                            Retry
                          </button>
                        </div>
                        <div v-else-if="voiceOptions.length === 0" class="persona-voice-picker__empty">
                          No voices available for this provider.
                          <button type="button" class="persona-voice-picker__refresh" @click="reloadVoiceOptions">
                            Refresh catalog
                          </button>
                        </div>
                        <ul v-else class="persona-voice-picker__list">
                          <li
                            v-for="voice in voiceOptions"
                            :key="voice.id"
                            class="persona-voice-picker__item"
                          >
                            <button
                              type="button"
                              class="persona-voice-picker__option"
                              :class="{ 'is-active': currentVoiceId === voice.id }"
                              @click="selectVoice(voice.id)"
                            >
                              <div class="persona-voice-picker__option-text">
                                <span class="persona-voice-picker__option-label">{{ voice.name }}</span>
                                <span class="persona-voice-picker__option-meta">
                                  {{ voice.lang ? describeLanguage(voice.lang) : (voice.provider === 'openai' ? 'OpenAI' : 'Browser') }}
                                </span>
                              </div>
                              <CheckIcon v-if="currentVoiceId === voice.id" class="persona-voice-picker__check" aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              class="persona-voice-picker__preview"
                              :disabled="voicePreviewing === voice.id"
                              @click.stop="previewVoice(voice.id)"
                              aria-label="Preview voice"
                            >
                              <span v-if="voicePreviewing === voice.id" class="persona-voice-picker__preview-spinner" aria-hidden="true"></span>
                              <PlayIcon v-else class="persona-voice-picker__preview-icon" aria-hidden="true" />
                            </button>
                          </li>
                        </ul>
                      </div>
                    </transition>
                  </div>
                  <p class="persona-compact-panel__hint">
                    {{ autoPlaySpeechSetting ? 'Auto-play responses when ready.' : 'Keep speech manual until you tap play.' }}
                  </p>
                  <p v-if="voiceFallbackMessage" class="persona-voice-picker__fallback">
                    {{ voiceFallbackMessage }}
                  </p>
                  <div class="persona-compact-panel__buttons">
                    <button type="button" class="persona-compact-panel__primary" @click="toggleSpeechAutoPlay">
                      <component
                        :is="autoPlaySpeechSetting ? SpeakerWaveIcon : SpeakerXMarkIcon"
                        class="persona-compact-panel__button-icon"
                        aria-hidden="true"
                      />
                      <span>{{ autoPlaySpeechSetting ? 'Disable autoplay' : 'Enable autoplay' }}</span>
                    </button>
                    <button
                      type="button"
                      class="persona-compact-panel__ghost persona-compact-panel__ghost--link"
                      @click="openVoiceSettings"
                    >
                      <AdjustmentsHorizontalIcon class="persona-compact-panel__button-icon" aria-hidden="true" />
                      <span>Manage voices</span>
                    </button>
                  </div>
                </div>
              </section>

              <section
                v-else
                class="persona-compact-panel persona-compact-panel--session"
                aria-label="Session usage and language"
              >
                <div
                  class="persona-voice-toolbar__stat persona-compact-panel__stat"
                  :class="sessionCostStateClass"
                  role="status"
                  aria-live="polite"
                >
                  <span class="persona-voice-toolbar__stat-label">Session Usage</span>
                  <span class="persona-voice-toolbar__stat-value">{{ sessionCostSummary }}</span>
                  <span v-if="sessionMeterWidth" class="persona-voice-toolbar__stat-meter" aria-hidden="true">
                    <span class="persona-voice-toolbar__stat-meter-bar" :style="{ width: sessionMeterWidth }"></span>
                  </span>
                </div>
                <div class="persona-compact-panel__language">
                  <button
                    ref="languageTriggerRef"
                    type="button"
                    class="persona-language-button"
                    :class="{ 'is-open': languageMenuOpen }"
                    @click="toggleLanguageMenu"
                  >
                    <GlobeAltIcon class="persona-language-button__icon" aria-hidden="true" />
                    <span class="persona-language-button__label">{{ languageSummaryLabel }}</span>
                    <ChevronDownIcon class="persona-language-button__chevron" aria-hidden="true" />
                  </button>

                  <transition name="fade">
                    <div
                      v-if="languageMenuOpen"
                      ref="languageMenuRef"
                      class="persona-language-menu"
                      role="menu"
                      aria-label="Language preferences"
                    >
                      <div class="persona-language-menu__section persona-language-menu__section--options">
                        <h4>Quick Options</h4>
                        <button
                          type="button"
                          class="persona-language-menu__option"
                          :class="{ 'is-active': isAutoModeActive }"
                          @click="applyAutoLanguage"
                        >
                          <SparklesIcon class="persona-language-menu__option-icon" aria-hidden="true" />
                          <span>
                            Auto detect (recommended)
                            <small v-if="hasDetectedLanguage">
                              Latest: {{ formatLanguageName(detectedSpeechLanguage || detectedResponseLanguage) }}
                            </small>
                          </span>
                        </button>
                        <button
                          type="button"
                          class="persona-language-menu__option"
                          :class="{ 'is-active': isInterfaceModeActive }"
                          @click="applyInterfaceLanguage"
                        >
                          <GlobeAltIcon class="persona-language-menu__option-icon" aria-hidden="true" />
                          <span>Follow interface language ({{ formatLanguageName(interfaceLanguage) }})</span>
                        </button>
                        <button
                          v-if="hasDetectedLanguage"
                          type="button"
                          class="persona-language-menu__option"
                          @click="applyDetectedLanguage"
                        >
                          <SparklesIcon class="persona-language-menu__option-icon" aria-hidden="true" />
                          <span>Use detected language ({{ formatLanguageName(detectedSpeechLanguage || detectedResponseLanguage) }})</span>
                        </button>
                      </div>

                      <div class="persona-language-menu__section persona-language-menu__section--manual">
                        <h4>Manual selection</h4>
                        <label class="persona-language-menu__label" for="persona-compact-manual-language">Choose language</label>
                        <select
                          id="persona-compact-manual-language"
                          class="persona-language-menu__select"
                          v-model="manualLanguageSelection"
                        >
                          <option
                            v-for="option in availableLanguageOptions"
                            :key="option.code"
                            :value="option.code"
                          >
                            {{ option.label }}
                          </option>
                        </select>
                        <div class="persona-language-menu__manual-actions">
                          <button type="button" class="persona-language-menu__apply" @click="applyManualLanguage">Apply</button>
                          <button type="button" class="persona-language-menu__reset" @click="applyAutoLanguage">Reset to auto</button>
                        </div>
                        <p class="persona-language-menu__note" v-if="languagePreferenceLocked">
                          Manual selection keeps this language until you switch back to auto.
                        </p>
                      </div>

                      <div class="persona-language-menu__footer">
                        <span>Speech detection: {{ formatLanguageName(detectedSpeechLanguage) }}</span>
                        <span>Response detection: {{ formatLanguageName(detectedResponseLanguage) }}</span>
                      </div>
                    </div>
                  </transition>
                </div>
              </section>
            </div>
          </div>
        </transition>
      </div>
    </template>

    <template v-else>
      <div class="persona-voice-toolbar__left">
        <UsageStatusBadge
          v-if="usageBadgeVisible"
          class="persona-voice-toolbar__badge"
          :tokens-total="tokensTotal ?? undefined"
          :tokens-used="tokensUsed ?? undefined"
        />
        <button
          type="button"
          class="persona-voice-toolbar__button"
          :title="personaTooltipText"
          :disabled="personaButtonDisabled"
          @click="openPersonaModal"
        >
          {{ personaButtonLabel }}
        </button>
        <span
          v-if="!personaButtonDisabled && personaHasCustom && personaSummaryText"
          class="persona-voice-toolbar__summary"
          :title="personaSummaryText"
        >
          {{ personaSummaryText }}
        </span>
        <button
          v-if="!personaButtonDisabled && personaHasCustom"
          type="button"
          class="persona-voice-toolbar__clear"
          @click="resetPersonaToDefault"
        >
          Clear
        </button>
      </div>

      <div class="persona-voice-toolbar__right">
        <div class="persona-voice-toolbar__stats">
          <div
            class="persona-voice-toolbar__stat"
            :class="speechCreditsStateClass"
            role="status"
            aria-live="polite"
          >
            <span class="persona-voice-toolbar__stat-label">Speech</span>
            <span class="persona-voice-toolbar__stat-value">{{ speechCreditsSummary }}</span>
            <span v-if="speechCreditsMeterWidth" class="persona-voice-toolbar__stat-meter" aria-hidden="true">
              <span class="persona-voice-toolbar__stat-meter-bar" :style="{ width: speechCreditsMeterWidth }"></span>
            </span>
          </div>
          <div
            class="persona-voice-toolbar__stat"
            :class="sessionCostStateClass"
            role="status"
            aria-live="polite"
          >
            <span class="persona-voice-toolbar__stat-label">Session</span>
            <span class="persona-voice-toolbar__stat-value">{{ sessionCostSummary }}</span>
            <span v-if="sessionMeterWidth" class="persona-voice-toolbar__stat-meter" aria-hidden="true">
              <span class="persona-voice-toolbar__stat-meter-bar" :style="{ width: sessionMeterWidth }"></span>
            </span>
          </div>
        </div>
        <button
          ref="languageTriggerRef"
          type="button"
          class="persona-language-button"
          :class="{ 'is-open': languageMenuOpen }"
          @click="toggleLanguageMenu"
        >
          <GlobeAltIcon class="persona-language-button__icon" aria-hidden="true" />
          <span class="persona-language-button__label">{{ languageSummaryLabel }}</span>
          <ChevronDownIcon class="persona-language-button__chevron" aria-hidden="true" />
        </button>

        <transition name="fade">
          <div
            v-if="languageMenuOpen"
            ref="languageMenuRef"
            class="persona-language-menu"
            role="menu"
            aria-label="Language preferences"
          >
            <div class="persona-language-menu__section persona-language-menu__section--options">
              <h4>Quick Options</h4>
              <button
                type="button"
                class="persona-language-menu__option"
                :class="{ 'is-active': isAutoModeActive }"
                @click="applyAutoLanguage"
              >
                <SparklesIcon class="persona-language-menu__option-icon" aria-hidden="true" />
                <span>
                  Auto detect (recommended)
                  <small v-if="hasDetectedLanguage">Latest: {{ formatLanguageName(detectedSpeechLanguage || detectedResponseLanguage) }}</small>
                </span>
              </button>
              <button
                type="button"
                class="persona-language-menu__option"
                :class="{ 'is-active': isInterfaceModeActive }"
                @click="applyInterfaceLanguage"
              >
                <GlobeAltIcon class="persona-language-menu__option-icon" aria-hidden="true" />
                <span>Follow interface language ({{ formatLanguageName(interfaceLanguage) }})</span>
              </button>
              <button
                v-if="hasDetectedLanguage"
                type="button"
                class="persona-language-menu__option"
                @click="applyDetectedLanguage"
              >
                <SparklesIcon class="persona-language-menu__option-icon" aria-hidden="true" />
                <span>Use detected language ({{ formatLanguageName(detectedSpeechLanguage || detectedResponseLanguage) }})</span>
              </button>
            </div>

            <div class="persona-language-menu__section persona-language-menu__section--manual">
              <h4>Manual selection</h4>
              <label class="persona-language-menu__label" for="manual-language-select">Choose language</label>
              <select
                id="manual-language-select"
                class="persona-language-menu__select"
                v-model="manualLanguageSelection"
              >
                <option
                  v-for="option in availableLanguageOptions"
                  :key="option.code"
                  :value="option.code"
                >
                  {{ option.label }}
                </option>
              </select>
              <div class="persona-language-menu__manual-actions">
                <button type="button" class="persona-language-menu__apply" @click="applyManualLanguage">Apply</button>
                <button type="button" class="persona-language-menu__reset" @click="applyAutoLanguage">Reset to auto</button>
              </div>
              <p class="persona-language-menu__note" v-if="languagePreferenceLocked">
                Manual selection keeps this language until you switch back to auto.
              </p>
            </div>

            <div class="persona-language-menu__footer">
              <span>Speech detection: {{ formatLanguageName(detectedSpeechLanguage) }}</span>
              <span>Response detection: {{ formatLanguageName(detectedResponseLanguage) }}</span>
            </div>
          </div>
        </transition>
      </div>
    </template>
  </div>

  <transition name="fade">
    <div v-if="isPersonaModalOpen" class="persona-modal" role="dialog" aria-modal="true">
      <div class="persona-modal__backdrop" @click="closePersonaModal"></div>
      <div class="persona-modal__content">
        <div class="persona-modal__header">
          <h3>Adjust Persona Overlay</h3>
          <button class="persona-modal__close" type="button" @click="closePersonaModal">
            <XMarkIcon class="persona-modal__close-icon" />
          </button>
        </div>

        <p class="persona-modal__note">
          Persona overlays tweak tone and personality only; the assistant's core capabilities never change.
        </p>

        <div class="persona-modal__switcher" role="tablist" aria-label="Tone editor mode">
          <button
            type="button"
            class="persona-modal__tab"
            :class="{ 'persona-modal__tab--active': personaModalView === 'editor' }"
            @click="personaModalView = 'editor'"
          >
            Persona Editor
          </button>
          <button
            type="button"
            class="persona-modal__tab"
            :class="{ 'persona-modal__tab--active': personaModalView === 'library' }"
            @click="personaModalView = 'library'"
          >
            Persona Presets
          </button>
        </div>

        <div v-if="personaModalView === 'editor'" class="persona-modal__editor">
          <p class="persona-modal__hint">
            Describe the persona tone or emphasis you want layered on top of this assistant's role.
          </p>
          <textarea
            v-model="personaDraft"
            class="persona-modal__textarea"
            rows="6"
            placeholder="e.g. Calm, concise explanations with short follow-up questions."
          ></textarea>
        </div>

        <div v-else class="persona-library">
          <p class="persona-library__intro">
            Pick a persona preset to populate the editor instantly.
          </p>
          <div class="persona-library__grid">
            <article
              v-for="preset in personaPresetsForCurrentPage"
              :key="preset.id"
              class="persona-preset-card"
              :class="{ 'persona-preset-card--active': personaDraft.trim() === preset.persona.trim() }"
              @click="applyPersonaPreset(preset)"
            >
              <header>
                <h4>{{ preset.label }}</h4>
                <span>{{ preset.summary }}</span>
              </header>
              <p>{{ preset.persona }}</p>
            </article>
          </div>
          <div class="persona-library__pagination">
            <button type="button" @click="goToPreviousPersonaPresetPage" class="persona-library__page-button">
              â€¹ Prev
            </button>
            <span class="persona-library__page-indicator">
              Page {{ personaPresetPage }} / {{ personaPresetTotalPages }}
            </span>
            <button type="button" @click="goToNextPersonaPresetPage" class="persona-library__page-button">
              Next â€º
            </button>
          </div>
        </div>

        <div class="persona-modal__actions">
          <button
            type="button"
            class="persona-modal__button persona-modal__button--ghost"
            :disabled="!personaHasCustom"
            @click="resetPersonaToDefault"
          >
            Use default persona
          </button>
          <div class="persona-modal__actions-right">
            <button type="button" class="persona-modal__button" @click="closePersonaModal">
              Cancel
            </button>
            <button
              type="button"
              class="persona-modal__button persona-modal__button--primary"
              :disabled="!personaDraftHasContent"
              @click="savePersonaFromModal"
            >
              Save persona
            </button>
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>

<style scoped>
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.persona-voice-toolbar--compact {
  width: 100%;
}

.voice-dock {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 0.75rem 0.85rem;
  border-radius: 16px;
  border: 1px solid hsla(var(--color-border-glass-h), var(--color-border-glass-s), var(--color-border-glass-l), 0.35);
  background: hsla(var(--color-bg-primary-h), var(--color-bg-primary-s), var(--color-bg-primary-l), 0.72);
  box-shadow: 0 14px 35px hsla(var(--color-shadow-h), var(--color-shadow-s), var(--color-shadow-l), 0.28);
  backdrop-filter: blur(14px) saturate(120%);
  width: 100%;
  box-sizing: border-box;
  overflow: visible;
  z-index: 5;
}

.voice-dock__bar {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.voice-dock__toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  border: none;
  background: hsla(var(--color-bg-secondary-h), var(--color-bg-secondary-s), var(--color-bg-secondary-l), 0.6);
  color: var(--color-text-primary);
  border-radius: 999px;
  padding: 0.4rem 0.8rem;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease;
}

.voice-dock__toggle:hover {
  background: hsla(var(--color-bg-secondary-h), var(--color-bg-secondary-s), var(--color-bg-secondary-l), 0.75);
}

.voice-dock__toggle-icon {
  width: 1rem;
  height: 1rem;
  transition: transform 0.2s ease;
}

.voice-dock__toggle-icon.is-open {
  transform: rotate(180deg);
}

.voice-dock__toggle-label {
  white-space: nowrap;
}

.voice-dock__chips {
  display: flex;
  gap: 0.5rem;
  flex: 1 1 auto;
  min-width: 0;
}

.voice-chip {
  flex: 1 1 0;
  min-width: 140px;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.45rem 0.65rem;
  border-radius: 12px;
  border: 1px solid hsla(var(--color-border-glass-h), var(--color-border-glass-s), var(--color-border-glass-l), 0.28);
  background: hsla(var(--color-bg-secondary-h), var(--color-bg-secondary-s), var(--color-bg-secondary-l), 0.55);
  color: var(--color-text-primary);
  cursor: pointer;
  transition: border-color 0.2s ease, background 0.2s ease, transform 0.2s ease;
  text-align: left;
}

.voice-chip:hover {
  transform: translateY(-1px);
  border-color: hsla(var(--color-accent-interactive-h), var(--color-accent-interactive-s), var(--color-accent-interactive-l), 0.45);
  background: hsla(var(--color-bg-secondary-h), var(--color-bg-secondary-s), var(--color-bg-secondary-l), 0.75);
}

.voice-chip__icon {
  width: 1rem;
  height: 1rem;
  color: hsl(var(--color-accent-interactive-h), var(--color-accent-interactive-s), calc(var(--color-accent-interactive-l) + 10%));
  flex-shrink: 0;
}

.voice-chip__text {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  min-width: 0;
}

.voice-chip__title {
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--color-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.voice-chip__subtitle {
  font-size: 0.65rem;
  color: var(--color-text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.voice-dock__drawer {
  position: absolute;
  left: 0;
  bottom: calc(100% + 0.85rem);
  width: 100%;
  border-radius: 14px;
  border: 1px solid hsla(var(--color-border-glass-h), var(--color-border-glass-s), var(--color-border-glass-l), 0.28);
  background: hsla(var(--color-bg-secondary-h), var(--color-bg-secondary-s), var(--color-bg-secondary-l), 0.72);
  padding: 0.9rem 1rem;
  box-shadow:
    0 18px 38px hsla(var(--color-shadow-h), var(--color-shadow-s), var(--color-shadow-l), 0.28),
    0 4px 14px hsla(var(--color-shadow-h), var(--color-shadow-s), var(--color-shadow-l), 0.18);
  backdrop-filter: blur(16px) saturate(130%);
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  max-height: min(70vh, 520px);
  overflow-y: auto;
  overscroll-behavior: contain;
  z-index: 12;
  will-change: transform, opacity;
}

.voice-dock__status {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.voice-dock-status {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.35rem 0.6rem;
  border-radius: 10px;
  background: hsla(var(--color-bg-primary-h), var(--color-bg-primary-s), var(--color-bg-primary-l), 0.55);
  border: 1px solid hsla(var(--color-border-glass-h), var(--color-border-glass-s), var(--color-border-glass-l), 0.25);
}

.voice-dock-status__icon {
  width: 0.85rem;
  height: 0.85rem;
  display: inline-flex;
  align-items: center;
  color: hsl(var(--color-accent-interactive-h), var(--color-accent-interactive-s), calc(var(--color-accent-interactive-l) + 10%));
}

.voice-dock-status__text {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}

.voice-dock-status__label {
  font-size: 0.65rem;
  color: var(--color-text-primary);
}

.voice-dock-status__badge {
  font-size: 0.55rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-right: 0.25rem;
  color: hsl(var(--color-accent-interactive-h), var(--color-accent-interactive-s), var(--color-accent-interactive-l));
}

.voice-dock-status__sublabel {
  font-size: 0.6rem;
  color: var(--color-text-secondary);
}

.voice-dock__tabs {
  display: flex;
  gap: 0.45rem;
  flex-wrap: wrap;
}

.voice-dock-tab {
  flex: 1 1 0;
  min-width: 120px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  padding: 0.45rem 0.7rem;
  border-radius: 10px;
  border: 1px solid hsla(var(--color-border-glass-h), var(--color-border-glass-s), var(--color-border-glass-l), 0.25);
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 0.68rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease;
}

.voice-dock-tab.is-active {
  background: hsla(var(--color-accent-interactive-h), var(--color-accent-interactive-s), var(--color-accent-interactive-l), 0.18);
  border-color: hsla(var(--color-accent-interactive-h), var(--color-accent-interactive-s), var(--color-accent-interactive-l), 0.35);
  color: var(--color-text-primary);
}

.voice-dock-tab__icon {
  width: 0.9rem;
  height: 0.9rem;
}

.voice-dock__panel {
  border-radius: 12px;
  border: 1px solid hsla(var(--color-border-glass-h), var(--color-border-glass-s), var(--color-border-glass-l), 0.22);
  background: hsla(var(--color-bg-primary-h), var(--color-bg-primary-s), var(--color-bg-primary-l), 0.55);
  padding: 0.85rem 0.95rem;
}

.voice-dock-slide-enter-active,
.voice-dock-slide-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.voice-dock-slide-enter-from,
.voice-dock-slide-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

@media (max-width: 768px) {
  .voice-dock__bar {
    flex-direction: column;
    align-items: stretch;
    gap: 0.6rem;
  }

  .voice-dock__chips {
    flex-direction: column;
  }

  .voice-dock__drawer {
    bottom: auto;
    top: calc(100% + 0.75rem);
    max-height: min(60vh, 460px);
  }

  .voice-chip {
    min-width: 100%;
  }
}

.persona-compact {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
  width: 100%;
  padding: 0.85rem 1rem 1.05rem;
  border-radius: 18px;
  border: 1px solid hsla(var(--color-border-glass-h), var(--color-border-glass-s), var(--color-border-glass-l), 0.38);
  background: hsla(var(--color-bg-primary-h), var(--color-bg-primary-s), var(--color-bg-primary-l), 0.76);
  box-shadow: 0 18px 45px hsla(var(--color-shadow-h), var(--color-shadow-s), var(--color-shadow-l), 0.32);
  backdrop-filter: blur(18px) saturate(120%);
  overflow: hidden;
}

.persona-compact::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 18px;
  background: radial-gradient(circle at top left, hsla(var(--color-accent-interactive-h), var(--color-accent-interactive-s), calc(var(--color-accent-interactive-l) + 12%), 0.25) 0%, transparent 55%),
    radial-gradient(circle at bottom right, hsla(var(--color-accent-interactive-h), var(--color-accent-interactive-s), calc(var(--color-accent-interactive-l) - 6%), 0.22) 0%, transparent 60%);
  pointer-events: none;
  z-index: 0;
  opacity: 0.65;
}

.persona-compact::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 18px;
  border: 1px solid hsla(var(--color-border-glass-h), var(--color-border-glass-s), var(--color-border-glass-l), 0.28);
  mix-blend-mode: screen;
  pointer-events: none;
  z-index: 0;
}

.persona-compact > * {
  position: relative;
  z-index: 1;
}

.persona-compact__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.85rem;
}

.persona-compact__legend {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.persona-compact__legend-label {
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--color-text-secondary);
}

.persona-compact__legend-sub {
  font-size: 0.62rem;
  color: var(--color-text-muted);
}

.persona-compact__status-row {
  display: flex;
  align-items: stretch;
  gap: 0.55rem;
  flex: 1;
  overflow-x: auto;
  padding-bottom: 0.2rem;
}

.persona-compact__status-row::-webkit-scrollbar {
  height: 6px;
}

.persona-compact__status-row::-webkit-scrollbar-thumb {
  background: hsla(var(--color-border-glass-h), var(--color-border-glass-s), var(--color-border-glass-l), 0.35);
  border-radius: 999px;
}

.persona-compact-status {
  --status-bg: hsla(var(--color-bg-secondary-h), var(--color-bg-secondary-s), var(--color-bg-secondary-l), 0.55);
  --status-border: hsla(var(--color-border-glass-h), var(--color-border-glass-s), var(--color-border-glass-l), 0.32);
  --status-icon-color: hsl(var(--color-accent-interactive-h), var(--color-accent-interactive-s), var(--color-accent-interactive-l));
  --status-text-color: var(--color-text-primary);
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.4rem 0.7rem;
  border-radius: 12px;
  background: var(--status-bg);
  border: 1px solid var(--status-border);
  color: var(--status-text-color);
  min-width: 0;
  box-shadow: inset 0 0 0 1px hsla(var(--color-border-glass-h), var(--color-border-glass-s), var(--color-border-glass-l), 0.1),
    0 10px 25px hsla(var(--color-shadow-h), var(--color-shadow-s), var(--color-shadow-l), 0.18);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  z-index: 1;
}

.persona-compact-status:hover {
  border-color: hsla(var(--color-accent-interactive-h), var(--color-accent-interactive-s), var(--color-accent-interactive-l), 0.45);
  box-shadow: inset 0 0 0 1px hsla(var(--color-accent-interactive-h), var(--color-accent-interactive-s), var(--color-accent-interactive-l), 0.25),
    0 14px 28px hsla(var(--color-shadow-h), var(--color-shadow-s), var(--color-shadow-l), 0.22);
}

.persona-compact-status[data-theme='accent'] {
  --status-bg: linear-gradient(
    135deg,
    hsla(var(--color-accent-interactive-h), var(--color-accent-interactive-s), calc(var(--color-accent-interactive-l) + 8%), 0.22) 0%,
    hsla(var(--color-accent-interactive-h), var(--color-accent-interactive-s), calc(var(--color-accent-interactive-l) - 6%), 0.14) 100%
  );
  --status-border: hsla(var(--color-accent-interactive-h), var(--color-accent-interactive-s), var(--color-accent-interactive-l), 0.45);
  --status-icon-color: hsl(var(--color-accent-interactive-h), var(--color-accent-interactive-s), calc(var(--color-accent-interactive-l) + 14%));
}

.persona-compact-status[data-theme='primary'] {
  --status-bg: linear-gradient(
    135deg,
    hsla(var(--color-accent-primary-h, var(--color-accent-interactive-h)), var(--color-accent-primary-s, var(--color-accent-interactive-s)), calc(var(--color-accent-primary-l, var(--color-accent-interactive-l)) + 6%), 0.22) 0%,
    hsla(var(--color-accent-primary-h, var(--color-accent-interactive-h)), var(--color-accent-primary-s, var(--color-accent-interactive-s)), calc(var(--color-accent-primary-l, var(--color-accent-interactive-l)) - 6%), 0.15) 100%
  );
  --status-border: hsla(var(--color-accent-primary-h, var(--color-accent-interactive-h)), var(--color-accent-primary-s, var(--color-accent-interactive-s)), var(--color-accent-primary-l, var(--color-accent-interactive-l)), 0.45);
  --status-icon-color: hsl(var(--color-accent-primary-h, var(--color-accent-interactive-h)), var(--color-accent-primary-s, var(--color-accent-interactive-s)), calc(var(--color-accent-primary-l, var(--color-accent-interactive-l)) + 10%));
}

.persona-compact-status[data-theme='info'] {
  --status-bg: linear-gradient(
    135deg,
    hsla(var(--color-accent-secondary-h, var(--color-accent-interactive-h)), var(--color-accent-secondary-s, var(--color-accent-interactive-s)), calc(var(--color-accent-secondary-l, var(--color-accent-interactive-l)) + 10%), 0.18) 0%,
    hsla(var(--color-accent-secondary-h, var(--color-accent-interactive-h)), var(--color-accent-secondary-s, var(--color-accent-interactive-s)), calc(var(--color-accent-secondary-l, var(--color-accent-interactive-l)) - 4%), 0.12) 100%
  );
  --status-border: hsla(var(--color-accent-secondary-h, var(--color-accent-interactive-h)), var(--color-accent-secondary-s, var(--color-accent-interactive-s)), var(--color-accent-secondary-l, var(--color-accent-interactive-l)), 0.42);
  --status-icon-color: hsl(var(--color-accent-secondary-h, var(--color-accent-interactive-h)), var(--color-accent-secondary-s, var(--color-accent-interactive-s)), calc(var(--color-accent-secondary-l, var(--color-accent-interactive-l)) + 12%));
}

.persona-compact-status[data-theme='muted'] {
  --status-bg: hsla(var(--color-bg-tertiary-h, var(--color-bg-secondary-h)), var(--color-bg-tertiary-s, var(--color-bg-secondary-s)), var(--color-bg-tertiary-l, var(--color-bg-secondary-l)), 0.6);
  --status-border: hsla(var(--color-border-glass-h), var(--color-border-glass-s), var(--color-border-glass-l), 0.28);
  --status-icon-color: hsl(var(--color-text-muted-h, 210), var(--color-text-muted-s, 6%), calc(var(--color-text-muted-l, 56%) + 6%));
  --status-text-color: var(--color-text-secondary);
}

.persona-compact-status[data-theme='warning'] {
  --status-bg: hsla(var(--color-warning-h), var(--color-warning-s), var(--color-warning-l), 0.18);
  --status-border: hsla(var(--color-warning-h), var(--color-warning-s), var(--color-warning-l), 0.45);
  --status-icon-color: hsl(var(--color-warning-h), var(--color-warning-s), calc(var(--color-warning-l) + 10%));
  --status-text-color: hsl(var(--color-warning-text-h, var(--color-warning-h)), var(--color-warning-text-s, 85%), var(--color-warning-text-l, 20%));
}

.persona-compact-status__icon-wrap {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.65rem;
  height: 1.65rem;
  border-radius: 50%;
  background: linear-gradient(135deg, hsla(var(--color-accent-interactive-h), var(--color-accent-interactive-s), calc(var(--color-accent-interactive-l) + 10%), 0.28) 0%, hsla(var(--color-accent-interactive-h), var(--color-accent-interactive-s), calc(var(--color-accent-interactive-l) - 4%), 0.16) 100%);
  box-shadow: 0 4px 12px hsla(var(--color-shadow-h), var(--color-shadow-s), var(--color-shadow-l), 0.18), inset 0 0 0 1px hsla(var(--color-border-glass-h), var(--color-border-glass-s), var(--color-border-glass-l), 0.32);
}

.persona-compact-status[data-theme='muted'] .persona-compact-status__icon-wrap {
  background: linear-gradient(135deg, hsla(var(--color-bg-secondary-h), var(--color-bg-secondary-s), calc(var(--color-bg-secondary-l) + 6%), 0.32) 0%, hsla(var(--color-bg-secondary-h), var(--color-bg-secondary-s), calc(var(--color-bg-secondary-l) - 4%), 0.18) 100%);
}

.persona-compact-status__icon {
  width: 1.05rem;
  height: 1.05rem;
  color: var(--status-icon-color);
}

.persona-compact-status__labels {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  min-width: 0;
}

.persona-compact-status__label {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--status-text-color);
  white-space: nowrap;
}

.persona-compact-status__badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.05rem 0.35rem;
  border-radius: 999px;
  font-size: 0.56rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  background: hsla(var(--color-border-glass-h), var(--color-border-glass-s), var(--color-border-glass-l), 0.3);
  color: var(--status-text-color);
}

.persona-compact-status__sublabel {
  font-size: 0.65rem;
  color: var(--color-text-muted);
  white-space: nowrap;
}

.persona-compact__body {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.persona-compact__actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.persona-compact-action {
  flex: 1 1 0;
  min-width: 140px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  padding: 0.5rem 0.75rem;
  border-radius: 12px;
  border: 1px solid hsla(var(--color-border-glass-h), var(--color-border-glass-s), var(--color-border-glass-l), 0.28);
  background: hsla(var(--color-bg-secondary-h), var(--color-bg-secondary-s), var(--color-bg-secondary-l), 0.45);
  color: var(--color-text-secondary);
  font-size: 0.7rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease, transform 0.2s ease;
}

.persona-compact-action:hover {
  transform: translateY(-1px);
  background: hsla(var(--color-bg-secondary-h), var(--color-bg-secondary-s), var(--color-bg-secondary-l), 0.65);
  color: var(--color-text-primary);
  border-color: hsla(var(--color-accent-interactive-h), var(--color-accent-interactive-s), var(--color-accent-interactive-l), 0.35);
}

.persona-compact-action.is-active {
  background: hsla(var(--color-accent-interactive-h), var(--color-accent-interactive-s), var(--color-accent-interactive-l), 0.22);
  border-color: hsla(var(--color-accent-interactive-h), var(--color-accent-interactive-s), var(--color-accent-interactive-l), 0.45);
  color: var(--color-text-primary);
  box-shadow: inset 0 0 0 1px hsla(var(--color-accent-interactive-h), var(--color-accent-interactive-s), var(--color-accent-interactive-l), 0.35);
}

.persona-compact-action__icon {
  width: 1rem;
  height: 1rem;
}

.persona-compact__panel {
  border-radius: 16px;
  border: 1px solid hsla(var(--color-border-glass-h), var(--color-border-glass-s), var(--color-border-glass-l), 0.28);
  background: hsla(var(--color-bg-secondary-h), var(--color-bg-secondary-s), var(--color-bg-secondary-l), 0.45);
  padding: 0.85rem 1rem;
  box-shadow: inset 0 0 0 1px hsla(var(--color-border-glass-h), var(--color-border-glass-s), var(--color-border-glass-l), 0.12);
}

.persona-compact-panel {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.persona-compact-panel__badge {
  align-self: flex-start;
}

.persona-compact-panel__summary-label {
  margin: 0;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-text-primary);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.persona-compact-panel__summary-text {
  margin: 0;
  font-size: 0.7rem;
  line-height: 1.45;
  color: var(--color-text-secondary);
}

.persona-compact-panel__summary-text--muted {
  color: var(--color-text-muted);
}

.persona-compact-panel__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
}

.persona-compact-panel__primary,
.persona-compact-panel__ghost {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  border-radius: 999px;
  padding: 0.45rem 0.95rem;
  font-size: 0.7rem;
  font-weight: 600;
  transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease;
}

.persona-compact-panel__primary {
  border: none;
  background: hsla(var(--color-accent-interactive-h), var(--color-accent-interactive-s), var(--color-accent-interactive-l), 0.85);
  color: var(--color-text-on-accent, #0c1116);
  cursor: pointer;
}

.persona-compact-panel__primary:hover:not(:disabled) {
  background: hsla(var(--color-accent-interactive-h), var(--color-accent-interactive-s), var(--color-accent-interactive-l), 1);
}

.persona-compact-panel__primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.persona-compact-panel__ghost {
  border: 1px solid hsla(var(--color-border-glass-h), var(--color-border-glass-s), var(--color-border-glass-l), 0.4);
  background: transparent;
  color: var(--color-text-primary);
  cursor: pointer;
}

.persona-compact-panel__ghost:hover {
  border-color: hsla(var(--color-accent-interactive-h), var(--color-accent-interactive-s), var(--color-accent-interactive-l), 0.45);
  color: var(--color-text-primary);
}

.persona-compact-panel__ghost--link {
  color: hsl(var(--color-accent-interactive-h), var(--color-accent-interactive-s), var(--color-accent-interactive-l));
  border-color: hsla(var(--color-accent-interactive-h), var(--color-accent-interactive-s), var(--color-accent-interactive-l), 0.35);
}

.persona-compact-panel__ghost--link:hover {
  border-color: hsla(var(--color-accent-interactive-h), var(--color-accent-interactive-s), var(--color-accent-interactive-l), 0.55);
  color: hsl(var(--color-accent-interactive-h), var(--color-accent-interactive-s), calc(var(--color-accent-interactive-l) + 10%));
}

.persona-compact-panel__button-icon {
  width: 1rem;
  height: 1rem;
}

.persona-compact-panel__controls {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}
.persona-compact-panel__buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
}

.persona-voice-picker {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  width: 100%;
}

.persona-voice-picker__trigger {
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.45rem;
  width: 100%;
  padding: 0.45rem 0.75rem;
  border-radius: 999px;
  border: 1px solid hsla(var(--color-border-glass-h), var(--color-border-glass-s), var(--color-border-glass-l), 0.35);
  background: hsla(var(--color-bg-secondary-h), var(--color-bg-secondary-s), var(--color-bg-secondary-l), 0.6);
  color: var(--color-text-primary);
  font-size: 0.72rem;
  font-weight: 600;
  text-align: left;
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease;
}

.persona-voice-picker__trigger:hover {
  border-color: hsla(var(--color-accent-interactive-h), var(--color-accent-interactive-s), var(--color-accent-interactive-l), 0.45);
  color: var(--color-text-primary);
}

.persona-voice-picker__trigger-icon {
  width: 1rem;
  height: 1rem;
  color: hsl(var(--color-accent-interactive-h), var(--color-accent-interactive-s), calc(var(--color-accent-interactive-l) + 12%));
}

.persona-voice-picker__trigger-label {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.persona-voice-picker__trigger-chevron {
  width: 0.9rem;
  height: 0.9rem;
  transition: transform 0.2s ease;
}

.persona-voice-picker__trigger-chevron.is-open {
  transform: rotate(180deg);
}

.persona-voice-picker__menu {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  width: min(320px, 100%);
  background: hsla(var(--color-bg-primary-h), var(--color-bg-primary-s), var(--color-bg-primary-l), 0.92);
  border-radius: 14px;
  border: 1px solid hsla(var(--color-border-glass-h), var(--color-border-glass-s), var(--color-border-glass-l), 0.28);
  box-shadow: 0 18px 35px hsla(var(--color-shadow-h), var(--color-shadow-s), var(--color-shadow-l), 0.35);
  backdrop-filter: blur(14px) saturate(120%);
  padding: 0.65rem;
  z-index: 85;
}

.persona-voice-picker__empty {
  font-size: 0.7rem;
  color: var(--color-text-secondary);
  text-align: center;
  padding: 0.4rem 0.25rem;
}

.persona-voice-picker__empty--error {
  color: hsl(var(--color-danger-h), var(--color-danger-s), var(--color-danger-l));
}

.persona-voice-picker__fallback {
  font-size: 0.66rem;
  color: hsla(var(--color-text-secondary-h), var(--color-text-secondary-s), var(--color-text-secondary-l), 0.85);
  margin: 0;
  line-height: 1.4;
}

.persona-voice-picker__refresh {
  margin-top: 0.6rem;
  border: none;
  background: hsla(var(--color-accent-interactive-h), var(--color-accent-interactive-s), var(--color-accent-interactive-l), 0.16);
  color: hsl(var(--color-accent-interactive-h), var(--color-accent-interactive-s), calc(var(--color-accent-interactive-l) + 12%));
  padding: 0.35rem 0.75rem;
  border-radius: 999px;
  font-size: 0.68rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease;
}

.persona-voice-picker__refresh:hover {
  background: hsla(var(--color-accent-interactive-h), var(--color-accent-interactive-s), var(--color-accent-interactive-l), 0.26);
}

.persona-voice-picker__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  max-height: 220px;
  overflow-y: auto;
}

.persona-voice-picker__item {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.persona-voice-picker__option {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.45rem 0.6rem;
  border-radius: 10px;
  border: 1px solid transparent;
  background: hsla(var(--color-bg-secondary-h), var(--color-bg-secondary-s), var(--color-bg-secondary-l), 0.4);
  color: var(--color-text-primary);
  text-align: left;
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease, transform 0.2s ease;
}

.persona-voice-picker__option:hover {
  transform: translateY(-1px);
  border-color: hsla(var(--color-accent-interactive-h), var(--color-accent-interactive-s), var(--color-accent-interactive-l), 0.45);
}

.persona-voice-picker__option.is-active {
  border-color: hsla(var(--color-accent-interactive-h), var(--color-accent-interactive-s), var(--color-accent-interactive-l), 0.55);
  background: hsla(var(--color-accent-interactive-h), var(--color-accent-interactive-s), var(--color-accent-interactive-l), 0.2);
}

.persona-voice-picker__option-text {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  min-width: 0;
}

.persona-voice-picker__option-label {
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--color-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.persona-voice-picker__option-meta {
  font-size: 0.62rem;
  color: var(--color-text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.persona-voice-picker__check {
  width: 1rem;
  height: 1rem;
  color: hsl(var(--color-accent-interactive-h), var(--color-accent-interactive-s), calc(var(--color-accent-interactive-l) + 14%));
}

.persona-voice-picker__preview {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 10px;
  border: 1px solid hsla(var(--color-border-glass-h), var(--color-border-glass-s), var(--color-border-glass-l), 0.35);
  background: hsla(var(--color-bg-secondary-h), var(--color-bg-secondary-s), var(--color-bg-secondary-l), 0.45);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease;
}

.persona-voice-picker__preview:hover:not(:disabled) {
  border-color: hsla(var(--color-accent-interactive-h), var(--color-accent-interactive-s), var(--color-accent-interactive-l), 0.4);
  color: var(--color-text-primary);
}

.persona-voice-picker__preview:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.persona-voice-picker__preview-icon {
  width: 1rem;
  height: 1rem;
}

.persona-voice-picker__preview-spinner {
  width: 1rem;
  height: 1rem;
  border-radius: 999px;
  border: 2px solid hsla(var(--color-border-glass-h), var(--color-border-glass-s), var(--color-border-glass-l), 0.4);
  border-top-color: hsl(var(--color-accent-interactive-h), var(--color-accent-interactive-s), calc(var(--color-accent-interactive-l) + 10%));
  animation: persona-spin 0.8s linear infinite;
}

@keyframes persona-spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
.persona-compact-panel__hint {
  font-size: 0.68rem;
  color: var(--color-text-muted);
}

.persona-compact-panel__language {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.persona-compact-panel__stat {
  width: 100%;
}

.persona-compact-expand-enter-active,
.persona-compact-expand-leave-active {
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.persona-compact-expand-enter-from,
.persona-compact-expand-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

.persona-voice-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 0 0 10px;
  flex-wrap: wrap;
}

.persona-voice-toolbar__left {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.persona-voice-toolbar__right {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

.persona-voice-toolbar__badge {
  margin-right: 4px;
}

.persona-voice-toolbar__stats {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.persona-voice-toolbar__stat {
  min-width: 140px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 6px 10px;
  border-radius: 10px;
  border: 1px solid hsla(var(--color-border-glass-h), var(--color-border-glass-s), var(--color-border-glass-l), 0.35);
  background: hsla(var(--color-bg-secondary-h), var(--color-bg-secondary-s), var(--color-bg-secondary-l), 0.55);
  color: var(--color-text-secondary);
  transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease;
}

.persona-voice-toolbar__stat-label {
  font-size: 0.65rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: hsla(var(--color-text-secondary-h), var(--color-text-secondary-s), var(--color-text-secondary-l), 0.85);
}

.persona-voice-toolbar__stat-value {
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--color-text-primary);
  white-space: nowrap;
}

.persona-voice-toolbar__stat-meter {
  position: relative;
  display: block;
  width: 100%;
  height: 3px;
  border-radius: 999px;
  background: hsla(var(--color-border-glass-h), var(--color-border-glass-s), var(--color-border-glass-l), 0.25);
  overflow: hidden;
}

.persona-voice-toolbar__stat-meter-bar {
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  border-radius: inherit;
  background: linear-gradient(90deg,
    hsla(var(--color-accent-primary-h), var(--color-accent-primary-s), var(--color-accent-primary-l), 0.85),
    hsla(var(--color-accent-secondary-h), var(--color-accent-secondary-s), var(--color-accent-secondary-l), 0.9)
  );
}

.persona-voice-toolbar__stat--loading {
  opacity: 0.7;
}

.persona-voice-toolbar__stat--ok {
  border-color: hsla(var(--color-success-h), var(--color-success-s), var(--color-success-l), 0.3);
  background: hsla(var(--color-success-h), var(--color-success-s), var(--color-success-l), 0.12);
}

.persona-voice-toolbar__stat--info {
  border-color: hsla(var(--color-accent-secondary-h), var(--color-accent-secondary-s), var(--color-accent-secondary-l), 0.35);
  background: hsla(var(--color-accent-secondary-h), var(--color-accent-secondary-s), var(--color-accent-secondary-l), 0.18);
}

.persona-voice-toolbar__stat--warning {
  border-color: hsla(var(--color-warning-h), var(--color-warning-s), var(--color-warning-l), 0.45);
  background: hsla(var(--color-warning-h), var(--color-warning-s), var(--color-warning-l), 0.2);
  color: hsl(var(--color-warning-text-h, var(--color-warning-h)), var(--color-warning-text-s, 85%), var(--color-warning-text-l, 25%));
}

.persona-voice-toolbar__stat--critical {
  border-color: hsla(var(--color-danger-h), var(--color-danger-s), var(--color-danger-l), 0.5);
  background: hsla(var(--color-danger-h), var(--color-danger-s), var(--color-danger-l), 0.22);
  color: hsl(var(--color-danger-h), var(--color-danger-s), calc(var(--color-danger-l) + 25%));
}

.persona-voice-toolbar__stat--loading .persona-voice-toolbar__stat-meter-bar,
.persona-voice-toolbar__stat--loading .persona-voice-toolbar__stat-value {
  opacity: 0.75;
}

.persona-voice-toolbar__stat--info .persona-voice-toolbar__stat-meter-bar {
  background: linear-gradient(90deg,
    hsla(var(--color-accent-secondary-h), var(--color-accent-secondary-s), var(--color-accent-secondary-l), 0.85),
    hsla(var(--color-accent-primary-h), var(--color-accent-primary-s), var(--color-accent-primary-l), 0.9)
  );
}

.persona-voice-toolbar__stat--warning .persona-voice-toolbar__stat-meter-bar {
  background: linear-gradient(90deg,
    hsla(var(--color-warning-h), var(--color-warning-s), var(--color-warning-l), 0.85),
    hsla(var(--color-warning-h), var(--color-warning-s), calc(var(--color-warning-l) - 10%), 0.9)
  );
}

.persona-voice-toolbar__stat--critical .persona-voice-toolbar__stat-meter-bar {
  background: linear-gradient(90deg,
    hsla(var(--color-danger-h), var(--color-danger-s), var(--color-danger-l), 0.95),
    hsla(var(--color-danger-h), var(--color-danger-s), calc(var(--color-danger-l) - 10%), 0.95)
  );
}

.persona-voice-toolbar__button {
  border: 1px solid hsla(var(--color-border-glass-h), var(--color-border-glass-s), var(--color-border-glass-l), 0.35);
  background: hsla(var(--color-bg-secondary-h), var(--color-bg-secondary-s), var(--color-bg-secondary-l), 0.65);
  color: var(--color-text-secondary);
  font-size: 0.72rem;
  font-weight: 600;
  padding: 5px 12px;
  border-radius: 999px;
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease;
}

.persona-voice-toolbar__button:hover {
  background: hsla(var(--color-accent-interactive-h), var(--color-accent-interactive-s), var(--color-accent-interactive-l), 0.25);
  border-color: hsla(var(--color-accent-interactive-h), var(--color-accent-interactive-s), var(--color-accent-interactive-l), 0.45);
  color: var(--color-text-primary);
}

.persona-voice-toolbar--disabled .persona-voice-toolbar__button {
  opacity: 0.65;
  cursor: not-allowed;
}

.persona-voice-toolbar__summary {
  color: var(--color-text-muted);
  font-size: 0.7rem;
  max-width: 240px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.persona-voice-toolbar__clear {
  border: none;
  background: transparent;
  color: var(--color-text-muted);
  font-size: 0.75rem;
  cursor: pointer;
  transition: color 0.2s ease;
}

.persona-voice-toolbar__clear:hover {
  color: var(--color-text-primary);
}

.persona-language-button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border-radius: 999px;
  border: 1px solid hsla(var(--color-border-glass-h), var(--color-border-glass-s), var(--color-border-glass-l), 0.35);
  background: hsla(var(--color-bg-secondary-h), var(--color-bg-secondary-s), var(--color-bg-secondary-l), 0.65);
  padding: 5px 12px;
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease;
}

.persona-language-button:hover,
.persona-language-button.is-open {
  background: hsla(var(--color-accent-interactive-h), var(--color-accent-interactive-s), var(--color-accent-interactive-l), 0.22);
  border-color: hsla(var(--color-accent-interactive-h), var(--color-accent-interactive-s), var(--color-accent-interactive-l), 0.4);
  color: var(--color-text-primary);
}

.persona-language-button__icon {
  width: 0.9rem;
  height: 0.9rem;
}

.persona-language-button__label {
  white-space: nowrap;
}

.persona-language-button__chevron {
  width: 0.85rem;
  height: 0.85rem;
  transition: transform 0.2s ease;
}

.persona-language-button.is-open .persona-language-button__chevron {
  transform: rotate(180deg);
}

.persona-language-menu {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  width: min(280px, 80vw);
  background: hsla(var(--color-bg-primary-h), var(--color-bg-primary-s), var(--color-bg-primary-l), 0.98);
  border-radius: 14px;
  box-shadow: 0 18px 40px hsla(var(--color-shadow-h), var(--color-shadow-s), var(--color-shadow-l), 0.35);
  border: 1px solid hsla(var(--color-border-glass-h), var(--color-border-glass-s), var(--color-border-glass-l), 0.25);
  padding: 0.9rem;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  z-index: 75;
}

.persona-language-menu__section {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.persona-language-menu__section h4 {
  font-size: 0.72rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-text-muted);
  margin: 0;
}

.persona-language-menu__option {
  display: inline-flex;
  align-items: flex-start;
  gap: 0.5rem;
  border: 1px solid transparent;
  border-radius: 12px;
  padding: 0.45rem 0.55rem;
  background: hsla(var(--color-bg-secondary-h), var(--color-bg-secondary-s), var(--color-bg-secondary-l), 0.4);
  color: var(--color-text-secondary);
  font-size: 0.72rem;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.2s ease, background 0.2s ease, color 0.2s ease;
}

.persona-language-menu__option small {
  display: block;
  font-weight: 500;
  color: var(--color-text-muted);
}

.persona-language-menu__option:hover,
.persona-language-menu__option.is-active {
  border-color: hsla(var(--color-accent-interactive-h), var(--color-accent-interactive-s), var(--color-accent-interactive-l), 0.45);
  background: hsla(var(--color-accent-interactive-h), var(--color-accent-interactive-s), var(--color-accent-interactive-l), 0.18);
  color: var(--color-text-primary);
}

.persona-language-menu__option-icon {
  width: 0.85rem;
  height: 0.85rem;
  margin-top: 0.1rem;
}

.persona-language-menu__label {
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--color-text-muted);
}

.persona-language-menu__select {
  width: 100%;
  border-radius: 10px;
  border: 1px solid hsla(var(--color-border-glass-h), var(--color-border-glass-s), var(--color-border-glass-l), 0.4);
  background: hsla(var(--color-bg-secondary-h), var(--color-bg-secondary-s), var(--color-bg-secondary-l), 0.55);
  color: var(--color-text-primary);
  padding: 0.35rem 0.5rem;
  font-size: 0.72rem;
}

.persona-language-menu__manual-actions {
  display: flex;
  gap: 0.4rem;
}

.persona-language-menu__apply,
.persona-language-menu__reset {
  flex: 1;
  border: none;
  border-radius: 10px;
  padding: 0.35rem 0.5rem;
  font-size: 0.7rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease;
}

.persona-language-menu__apply {
  background: hsla(var(--color-accent-interactive-h), var(--color-accent-interactive-s), var(--color-accent-interactive-l), 0.24);
  color: var(--color-text-primary);
}

.persona-language-menu__apply:hover {
  background: hsla(var(--color-accent-interactive-h), var(--color-accent-interactive-s), var(--color-accent-interactive-l), 0.34);
}

.persona-language-menu__reset {
  background: transparent;
  color: var(--color-text-secondary);
  border: 1px solid hsla(var(--color-border-glass-h), var(--color-border-glass-s), var(--color-border-glass-l), 0.35);
}

.persona-language-menu__reset:hover {
  color: var(--color-text-primary);
  border-color: hsla(var(--color-accent-interactive-h), var(--color-accent-interactive-s), var(--color-accent-interactive-l), 0.45);
}

.persona-language-menu__note {
  font-size: 0.68rem;
  color: var(--color-text-muted);
  margin: 0;
}

.persona-language-menu__footer {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.65rem;
  color: var(--color-text-muted);
}

.persona-language-menu__footer span {
  display: block;
}

.persona-modal {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2.5rem 1rem;
  z-index: 70;
}

.persona-modal__backdrop {
  position: absolute;
  inset: 0;
  background: hsla(var(--color-bg-backdrop-h, 220), var(--color-bg-backdrop-s, 26%), var(--color-bg-backdrop-l, 5%), 0.55);
  backdrop-filter: blur(6px);
}

.persona-modal__content {
  position: relative;
  width: min(680px, 100%);
  max-height: calc(100vh - 4rem);
  background: hsla(var(--color-bg-primary-h), var(--color-bg-primary-s), var(--color-bg-primary-l), 0.96);
  border-radius: 20px;
  padding: 1.75rem;
  box-shadow: 0 25px 70px hsla(var(--color-shadow-h), var(--color-shadow-s), var(--color-shadow-l), 0.35);
  overflow-y: auto;
}

.persona-modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.9rem;
}

.persona-modal__close {
  border: none;
  background: transparent;
  cursor: pointer;
  color: var(--color-text-muted);
  padding: 0.35rem;
  border-radius: 999px;
  transition: background 0.2s ease, color 0.2s ease;
}

.persona-modal__close:hover {
  color: var(--color-text-primary);
  background: hsla(var(--color-border-glass-h), var(--color-border-glass-s), var(--color-border-glass-l), 0.2);
}

.persona-modal__close-icon {
  width: 1.1rem;
  height: 1.1rem;
}

.persona-modal__note {
  margin: 0 0 8px;
  font-size: 0.78rem;
  color: var(--color-text-muted);
}

.persona-modal__switcher {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.persona-modal__tab {
  border: none;
  background: transparent;
  color: var(--color-text-muted);
  font-size: 0.82rem;
  font-weight: 600;
  padding: 0.6rem 1rem;
  border-radius: 999px;
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease;
}

.persona-modal__tab--active {
  background: hsla(var(--color-accent-interactive-h), var(--color-accent-interactive-s), var(--color-accent-interactive-l), 0.22);
  color: var(--color-text-primary);
}

.persona-modal__editor {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.persona-modal__hint {
  font-size: 0.8rem;
  color: var(--color-text-muted);
  margin: 0;
}

.persona-modal__textarea {
  width: 100%;
  border-radius: 12px;
  border: 1px solid hsla(var(--color-border-primary-h), var(--color-border-primary-s), var(--color-border-primary-l), 0.35);
  background: hsla(var(--color-bg-secondary-h), var(--color-bg-secondary-s), var(--color-bg-secondary-l), 0.65);
  color: var(--color-text-primary);
  padding: 0.9rem 1rem;
  resize: vertical;
  min-height: 150px;
  font-size: 0.95rem;
  transition: border-color 0.2s ease, background 0.2s ease;
}

.persona-modal__textarea:focus {
  outline: none;
  border-color: hsla(var(--color-accent-interactive-h), var(--color-accent-interactive-s), var(--color-accent-interactive-l), 0.5);
  background: hsla(var(--color-bg-secondary-h), var(--color-bg-secondary-s), var(--color-bg-secondary-l), 0.85);
}

.persona-library {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.persona-library__intro {
  font-size: 0.82rem;
  color: var(--color-text-muted);
  margin: 0;
}

.persona-library__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
  gap: 0.75rem;
}

.persona-preset-card {
  padding: 0.95rem;
  border-radius: 14px;
  border: 1px solid hsla(var(--color-border-glass-h), var(--color-border-glass-s), var(--color-border-glass-l), 0.25);
  background: hsla(var(--color-bg-secondary-h), var(--color-bg-secondary-s), var(--color-bg-secondary-l), 0.55);
  cursor: pointer;
  transition: transform 0.2s ease, border-color 0.2s ease, background 0.2s ease;
}

.persona-preset-card header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

.persona-preset-card h4 {
  font-size: 0.95rem;
  margin: 0;
  color: var(--color-text-primary);
}

.persona-preset-card span {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.persona-preset-card p {
  margin: 0;
  font-size: 0.82rem;
  color: var(--color-text-secondary);
}

.persona-preset-card:hover {
  transform: translateY(-2px);
  border-color: hsla(var(--color-accent-interactive-h), var(--color-accent-interactive-s), var(--color-accent-interactive-l), 0.45);
}

.persona-preset-card--active {
  border-color: hsla(var(--color-accent-interactive-h), var(--color-accent-interactive-s), var(--color-accent-interactive-l), 0.65);
  background: hsla(var(--color-accent-interactive-h), var(--color-accent-interactive-s), var(--color-accent-interactive-l), 0.18);
}

.persona-library__pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 0.5rem;
  font-size: 0.8rem;
  color: var(--color-text-muted);
}

.persona-library__page-button {
  border: none;
  background: transparent;
  color: var(--color-text-muted);
  cursor: pointer;
  padding: 0.25rem 0.6rem;
  border-radius: 8px;
  transition: background 0.2s ease, color 0.2s ease;
}

.persona-library__page-button:hover {
  background: hsla(var(--color-border-glass-h), var(--color-border-glass-s), var(--color-border-glass-l), 0.2);
  color: var(--color-text-primary);
}

.persona-modal__actions {
  margin-top: 1.25rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.persona-modal__button {
  border-radius: 999px;
  padding: 0.6rem 1.2rem;
  font-size: 0.85rem;
  font-weight: 600;
  background: hsla(var(--color-bg-secondary-h), var(--color-bg-secondary-s), var(--color-bg-secondary-l), 0.65);
  border: 1px solid hsla(var(--color-border-primary-h), var(--color-border-primary-s), var(--color-border-primary-l), 0.35);
  color: var(--color-text-primary);
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease;
}

.persona-modal__button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.persona-modal__button--ghost {
  background: transparent;
}

.persona-modal__button--ghost:hover:not(:disabled) {
  color: var(--color-text-primary);
  border-color: hsla(var(--color-accent-interactive-h), var(--color-accent-interactive-s), var(--color-accent-interactive-l), 0.4);
}

.persona-modal__button--primary {
  background: hsla(var(--color-accent-interactive-h), var(--color-accent-interactive-s), var(--color-accent-interactive-l), 0.8);
  color: var(--color-text-on-accent, #0c1116);
  border: none;
}

.persona-modal__button--primary:hover:not(:disabled) {
  background: hsla(var(--color-accent-interactive-h), var(--color-accent-interactive-s), var(--color-accent-interactive-l), 1);
  color: var(--color-text-primary);
}

.persona-modal__actions-right {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

@media (max-width: 600px) {
  .persona-modal {
    padding: 1.5rem 0.75rem;
    align-items: flex-end;
  }

  .persona-modal__content {
    width: 100%;
    border-radius: 16px 16px 0 0;
    max-height: 90vh;
  }

  .persona-modal__actions {
    flex-direction: column;
    align-items: stretch;
  }

  .persona-modal__actions-right {
    width: 100%;
    justify-content: space-between;
  }
}

@media (max-width: 720px) {
  .persona-voice-toolbar--compact .persona-compact {
    padding: 0.7rem 0.75rem 0.85rem;
    gap: 0.75rem;
  }

  .persona-voice-toolbar--compact .persona-compact__actions {
    flex-direction: column;
  }

  .persona-voice-toolbar--compact .persona-compact-action {
    width: 100%;
  }

  .persona-voice-picker__menu {
    width: 100%;
  }

  .persona-compact-panel__buttons {
    flex-direction: column;
    align-items: stretch;
  }

  .persona-voice-toolbar {
    flex-direction: column;
    align-items: stretch;
    gap: 14px;
  }

  .persona-voice-toolbar__left {
    justify-content: space-between;
  }

  .persona-voice-toolbar__right {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }

  .persona-voice-toolbar__stats {
    width: 100%;
    flex-direction: column;
  }

  .persona-voice-toolbar__stat {
    width: 100%;
  }
}
</style>








