<template>
  <div class="voice-panel">
    <div class="voice-panel__controls">
      <label class="voice-panel__search">
        <MagnifyingGlassIcon class="voice-panel__search-icon" aria-hidden="true" />
        <input
          v-model="searchQuery"
          type="search"
          class="voice-panel__search-input"
          placeholder="Search voices by name, language, or description"
          aria-label="Search voices"
        />
      </label>
      <div class="voice-panel__filters">
        <div class="voice-panel__filter-group" role="radiogroup" aria-label="Voice provider filter">
          <button
            v-for="option in providerOptions"
            :key="option.value"
            type="button"
            class="voice-panel__filter-btn"
            :class="{ 'voice-panel__filter-btn--active': providerFilter === option.value }"
            @click="providerFilter = option.value"
            :aria-pressed="providerFilter === option.value"
          >
            <component :is="option.icon" class="voice-panel__filter-icon" aria-hidden="true" />
            <span>{{ option.label }}</span>
          </button>
        </div>
        <label class="voice-panel__language">
          <span class="voice-panel__language-label">Language</span>
          <select v-model="languageFilter" class="voice-panel__language-select" aria-label="Filter voices by language">
            <option value="all">All languages</option>
            <option v-for="lang in languageOptions" :key="lang.code" :value="lang.code">
              {{ lang.label }}
            </option>
          </select>
        </label>
      </div>
    </div>

    <div v-if="isEmpty" class="voice-panel__empty">
      <SpeakerXMarkIcon class="voice-panel__empty-icon" aria-hidden="true" />
      <p class="voice-panel__empty-text">
        {{ emptyMessage }}
      </p>
      <button type="button" class="btn btn-secondary-outline-ephemeral btn-sm" @click="emit('refresh')">
        <ArrowPathIcon class="icon-xs mr-1" aria-hidden="true" /> Refresh voice list
      </button>
    </div>

    <ul v-else class="voice-panel__list" role="listbox" aria-label="Available voices">
      <li
        v-for="voice in filteredVoices"
        :key="voice.id"
        class="voice-panel__item"
        :class="{ 'voice-panel__item--selected': voice.id === selectedVoiceId }"
        role="option"
        :aria-selected="voice.id === selectedVoiceId"
      >
        <button class="voice-panel__select" type="button" @click="selectVoice(voice.id)">
          <div class="voice-panel__primary">
            <span class="voice-panel__name">{{ voice.name }}</span>
            <span class="voice-panel__meta">
              <component
                :is="voice.provider === 'openai' ? SparklesIcon : GlobeAltIcon"
                class="voice-panel__meta-icon"
                aria-hidden="true"
              />
              <span class="voice-panel__provider">{{ providerLabel(voice.provider) }}</span>
              <span class="voice-panel__divider">•</span>
              <span class="voice-panel__language-tag">{{ voice.lang }}</span>
              <span
                v-if="voice.isDefault"
                class="voice-panel__badge"
              >
                Default
              </span>
            </span>
          </div>
          <p v-if="voice.description" class="voice-panel__description">
            {{ voice.description }}
          </p>
        </button>
        <div class="voice-panel__actions">
          <button
            type="button"
            class="btn btn-secondary-ephemeral btn-xs"
            @click="emit('preview', voice.id)"
          >
            Preview
          </button>
          <button
            v-if="voice.id === selectedVoiceId"
            type="button"
            class="btn btn-link-ephemeral btn-xs"
            @click="emit('update:selectedVoiceId', null)"
          >
            Clear
          </button>
        </div>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { MagnifyingGlassIcon, ArrowPathIcon, GlobeAltIcon, SparklesIcon, SpeakerXMarkIcon, SpeakerWaveIcon } from '@heroicons/vue/24/outline';
import type { VoiceOption } from '@/services/voice.settings.service';

type ProviderFilter = 'all' | 'browser' | 'openai';

const props = defineProps<{
  voices: Readonly<VoiceOption[]>;
  selectedVoiceId: string | null;
  currentProvider: 'browser_tts' | 'openai_tts';
  loading?: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:selectedVoiceId', value: string | null): void;
  (e: 'preview', voiceId: string): void;
  (e: 'refresh'): void;
}>();

const searchQuery = ref('');
const providerFilter = ref<ProviderFilter>('all');
const languageFilter = ref<'all' | string>('all');

watch(
  () => props.currentProvider,
  (provider) => {
    providerFilter.value = provider === 'browser_tts' ? 'browser' : provider === 'openai_tts' ? 'openai' : 'all';
  },
  { immediate: true },
);

watch(providerFilter, () => {
  languageFilter.value = 'all';
});

const providerOptions = computed(() => [
  { value: 'all' as ProviderFilter, label: 'All voices', icon: SpeakerWaveIcon },
  { value: 'openai' as ProviderFilter, label: 'OpenAI Voices', icon: SparklesIcon },
  { value: 'browser' as ProviderFilter, label: 'Browser Voices', icon: GlobeAltIcon },
]);

const languageOptions = computed(() => {
  const map = new Map<string, number>();
  props.voices.forEach((voice) => {
    const lang = voice.lang || 'en';
    map.set(lang, (map.get(lang) ?? 0) + 1);
  });

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([code, count]) => ({
      code,
      label: `${code} (${count})`,
    }));
});

const filteredVoices = computed(() => {
  const query = searchQuery.value.trim().toLowerCase();
  return props.voices.filter((voice) => {
    if (providerFilter.value !== 'all' && voice.provider !== providerFilter.value) {
      return false;
    }
    if (languageFilter.value !== 'all' && voice.lang !== languageFilter.value) {
      return false;
    }
    if (!query) return true;
    const haystack = `${voice.name} ${voice.description ?? ''} ${voice.lang}`.toLowerCase();
    return haystack.includes(query);
  });
});

const isEmpty = computed(() => !props.loading && filteredVoices.value.length === 0);
const emptyMessage = computed(() => {
  if (props.loading) return 'Loading voices…';
  if (props.voices.length === 0) return 'No voices available for the selected provider.';
  return 'No voices match your filters. Try adjusting the search or filters.';
});

function selectVoice(voiceId: string) {
  if (voiceId !== props.selectedVoiceId) {
    emit('update:selectedVoiceId', voiceId);
  }
}

function providerLabel(provider: VoiceOption['provider']): string {
  return provider === 'openai' ? 'OpenAI' : 'Browser';
}
</script>

<style scoped lang="scss">
.voice-panel {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.voice-panel__controls {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;

  @media (min-width: 640px) {
    flex-direction: row;
    align-items: flex-start;
    justify-content: space-between;
  }
}

.voice-panel__search {
  position: relative;
  flex: 1 1 auto;
}

.voice-panel__search-icon {
  position: absolute;
  inset: 50% auto auto 0.85rem;
  transform: translateY(-50%);
  width: 1rem;
  height: 1rem;
  color: rgba(148, 163, 184, 0.8);
}

.voice-panel__search-input {
  width: 100%;
  padding: 0.55rem 0.85rem 0.55rem 2.4rem;
  border-radius: 0.75rem;
  border: 1px solid rgba(148, 163, 184, 0.35);
  background: hsla(var(--color-surface-primary-h), var(--color-surface-primary-s), var(--color-surface-primary-l), 0.9);
  color: var(--color-text-primary);
  transition: border-color 0.18s ease, box-shadow 0.18s ease;

  &:focus {
    outline: none;
    border-color: rgba(99, 102, 241, 0.55);
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.18);
  }
}

.voice-panel__filters {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;

  @media (min-width: 640px) {
    flex-direction: row;
    align-items: center;
    gap: 0.75rem;
  }
}

.voice-panel__filter-group {
  display: flex;
  gap: 0.35rem;
}

.voice-panel__filter-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.35);
  background: hsla(var(--color-surface-secondary-h), var(--color-surface-secondary-s), var(--color-surface-secondary-l), 0.9);
  color: var(--color-text-primary);
  padding: 0.35rem 0.75rem;
  font-size: 0.82rem;
  font-weight: 600;
  transition: transform 0.16s ease, border-color 0.16s ease, background 0.16s ease;

  &:hover {
    border-color: rgba(99, 102, 241, 0.5);
  }

  &--active {
    background: linear-gradient(135deg, rgba(99, 102, 241, 0.85), rgba(139, 92, 246, 0.85));
    color: white;
    border-color: transparent;
    transform: translateY(-1px);
  }
}

.voice-panel__filter-icon {
  width: 1rem;
  height: 1rem;
}

.voice-panel__language {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 180px;
}

.voice-panel__language-label {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: rgba(148, 163, 184, 0.85);
}

.voice-panel__language-select {
  border-radius: 0.65rem;
  border: 1px solid rgba(148, 163, 184, 0.35);
  padding: 0.45rem 0.75rem;
  background: hsla(var(--color-surface-secondary-h), var(--color-surface-secondary-s), var(--color-surface-secondary-l), 0.9);
  color: var(--color-text-primary);
  font-size: 0.85rem;
}

.voice-panel__list {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  padding: 0;
  margin: 0;
  list-style: none;
  max-height: 18rem;
  overflow-y: auto;
}

.voice-panel__item {
  border-radius: 0.95rem;
  border: 1px solid rgba(148, 163, 184, 0.25);
  background: hsla(var(--color-surface-secondary-h), var(--color-surface-secondary-s), var(--color-surface-secondary-l), 0.92);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
  padding: 0.75rem 0.85rem;
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  transition: border-color 0.18s ease, transform 0.18s ease;

  &:hover {
    border-color: rgba(99, 102, 241, 0.45);
    transform: translateY(-1px);
  }

  &--selected {
    border-color: rgba(99, 102, 241, 0.85);
    box-shadow: 0 6px 20px rgba(99, 102, 241, 0.25);
  }
}

.voice-panel__select {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.5rem;
  width: 100%;
  text-align: left;
}

.voice-panel__primary {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.voice-panel__name {
  font-weight: 700;
  font-size: 0.95rem;
}

.voice-panel__meta {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.78rem;
  color: rgba(148, 163, 184, 0.95);
}

.voice-panel__meta-icon {
  width: 0.9rem;
  height: 0.9rem;
}

.voice-panel__provider {
  font-weight: 600;
}

.voice-panel__divider {
  opacity: 0.6;
}

.voice-panel__language-tag {
  padding: 0.1rem 0.45rem;
  border-radius: 999px;
  background: rgba(59, 130, 246, 0.12);
  color: rgba(37, 99, 235, 0.92);
  font-weight: 600;
}

.voice-panel__badge {
  padding: 0.1rem 0.45rem;
  border-radius: 999px;
  background: rgba(16, 185, 129, 0.18);
  color: rgba(5, 150, 105, 0.92);
  font-weight: 600;
}

.voice-panel__description {
  font-size: 0.82rem;
  color: rgba(226, 232, 240, 0.82);
  margin: 0;
}

.voice-panel__actions {
  display: flex;
  gap: 0.35rem;
  flex-wrap: wrap;
}

.voice-panel__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  text-align: center;
  padding: 1.5rem;
  border-radius: 1rem;
  border: 1px dashed rgba(148, 163, 184, 0.3);
  background: hsla(var(--color-surface-secondary-h), var(--color-surface-secondary-s), var(--color-surface-secondary-l), 0.6);
}

.voice-panel__empty-icon {
  width: 2.4rem;
  height: 2.4rem;
  color: rgba(148, 163, 184, 0.85);
}

.voice-panel__empty-text {
  font-size: 0.9rem;
  color: rgba(148, 163, 184, 0.9);
  margin: 0;
  max-width: 320px;
}

@media (max-width: 480px) {
  .voice-panel__list {
    max-height: none;
  }
}
</style>
