// File: frontend/src/components/voice-input/components/AudioModeDropdown.vue
/**
 * @file AudioModeDropdown.vue
 * @description A dropdown component for selecting the audio input mode.
 * It displays the current mode and allows switching between available modes.
 *
 * Revisions:
 * - Aligned internal AudioModeOption interface's `description` to be optional, matching `types.ts`.
 * - Changed the emitted event name from `@select` to `@select-mode` for consistency with VoiceInput.vue.
 * - Ensured all props are correctly typed and used.
 * - Added comprehensive JSDoc comments.
 * - Imported VoiceInputMode from types.ts for prop typing.
 */
<template>
  <div
    class="audio-mode-dropdown-wrapper"
    :class="{ 'is-compact': isCompact }"
    ref="dropdownRef"
  >
    <button
      @click="toggleDropdown"
      :class="['audio-mode-button', { 'audio-mode-button--compact': isCompact }]"
      :disabled="disabled"
      aria-haspopup="true"
      :aria-expanded="isOpen"
      :title="`Current mode: ${currentModeLabel}. Click to change.`"
    >
      <component :is="currentModeIcon" class="icon-sm" aria-hidden="true" />
      <span :class="['mode-label', { 'sr-only': isCompact }]">{{ currentModeLabel }}</span>
      <span v-if="isCompact" class="mode-chip" aria-hidden="true">{{ currentModeBadge }}</span>
      <span
        class="mode-info-icon"
        @click.stop="toggleInfoPopover"
        role="button"
        tabindex="0"
        aria-label="Audio mode information"
      >ⓘ</span>
      <ChevronDownIcon
        class="chevron-icon"
        :class="{ 'rotate-180': isOpen }"
        aria-hidden="true"
      />
    </button>

    <Transition name="dropdown-transition">
      <div v-if="isOpen" class="dropdown-menu" role="listbox" aria-label="Audio input modes">
        <div class="dropdown-header">Select Audio Mode</div>
        <button
          v-for="option in options"
          :key="option.value"
          @click="selectModeHandler(option.value)"
          class="dropdown-item"
          :class="{ active: currentMode === option.value }"
          role="option"
          :aria-selected="currentMode === option.value"
        >
          <component :is="getModeIcon(option.value)" class="icon-sm" aria-hidden="true" />
          <div class="option-content">
            <span class="option-label">{{ option.label }}</span>
            <span v-if="option.description" class="option-description">{{ option.description }}</span>
          </div>
          <CheckIcon v-if="currentMode === option.value" class="check-icon" aria-hidden="true" />
        </button>
      </div>
    </Transition>

    <!-- Info Popover -->
    <Transition name="popover-transition">
      <div v-if="isInfoPopoverOpen" class="info-popover" ref="popoverRef">
        <div class="popover-header">
          <span class="popover-title">{{ t('voice.audioInputModes') }}</span>
          <button @click="closeInfoPopover" class="popover-close" :aria-label="t('common.close')">
            <XMarkIcon class="icon-xs" />
          </button>
        </div>
        <div class="popover-content">
          <div v-for="option in options" :key="option.value" class="mode-info-item">
            <div class="mode-info-header">
              <component :is="getModeIcon(option.value)" class="icon-sm mode-icon" />
              <span class="mode-info-label">{{ option.label }}</span>
            </div>
            <p class="mode-info-description">{{ getModeDetailedDescription(option.value) }}</p>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
/**
 * @script AudioModeDropdown
 * @description Logic for the AudioModeDropdown component.
 */
import { ref, computed, onMounted, onUnmounted, withDefaults, type Component } from 'vue';
import { useI18n } from 'vue-i18n';
import {
  ChevronDownIcon,
  MicrophoneIcon as SolidMicrophoneIcon,
  SpeakerWaveIcon,
  CpuChipIcon,
  CheckIcon,
  XMarkIcon,
} from '@heroicons/vue/20/solid';

// Import VoiceInputMode for stronger typing of props and emits
import type { VoiceInputMode } from '../types';

/**
 * @interface AudioModeOptionLocal
 * @description Defines the structure for an audio mode option displayed in the dropdown.
 * Note: `description` is now optional to align with potential shared types.
 */
interface AudioModeOptionLocal {
  value: VoiceInputMode; // Use the imported type
  label: string;
  description?: string; // Made optional
  // 'icon' prop was in types.ts AudioModeOption, but not used here directly for rendering
  // The getModeIcon function handles icon selection based on 'value'.
}

/**
 * @interface Props
 * @description Props for the AudioModeDropdown component.
 */
const props = withDefaults(defineProps<{
  /** The currently selected audio input mode value. */
  currentMode: VoiceInputMode;
  /** Array of available audio mode options. */
  options: AudioModeOptionLocal[]; // Uses the local (now aligned) interface
  /** Whether the dropdown is disabled. */
  disabled?: boolean;
  /** Whether to render in compact (icon-first) mode. */
  compact?: boolean;
}>(), {
  compact: false,
});

/**
 * @emits Emits
 * @description Events emitted by the AudioModeDropdown component.
 */
const emit = defineEmits<{
  /**
   * Emitted when an audio mode is selected.
   * @param {VoiceInputMode} mode - The value of the selected audio mode.
   */
  (e: 'select-mode', mode: VoiceInputMode): void; // Changed from 'select'
}>();

const { t } = useI18n();

const MODE_BADGES: Record<VoiceInputMode, string> = {
  'push-to-talk': 'PTT',
  'voice-activation': 'VOX',
  'continuous': 'LIVE',
};

const isCompact = computed(() => Boolean(props.compact));

const dropdownRef = ref<HTMLElement | null>(null);
const popoverRef = ref<HTMLElement | null>(null);
const isOpen = ref(false);
const isInfoPopoverOpen = ref(false);

/**
 * @computed currentModeLabel
 * @description Gets the label of the currently selected audio mode.
 */
const currentModeLabel = computed<string>(() => {
  const option = props.options.find(o => o.value === props.currentMode);
  return option?.label || 'Mode';
});

const currentModeBadge = computed(() => MODE_BADGES[props.currentMode] ?? 'MODE');

/**
 * @computed currentModeDescription
 * @description Gets the description of the currently selected audio mode.
 */
const currentModeDescription = computed<string>(() => {
  const option = props.options.find(o => o.value === props.currentMode);
  return option?.description || '';
});

/**
 * @computed currentModeIcon
 * @description Gets the icon component for the currently selected audio mode.
 */
const currentModeIcon = computed<Component>(() => getModeIcon(props.currentMode));

/**
 * @function getModeIcon
 * @description Returns the appropriate icon component based on the mode value.
 * @param {VoiceInputMode | string} mode - The audio mode value.
 */
function getModeIcon(mode: VoiceInputMode | string): Component {
  switch (mode) {
    case 'push-to-talk': return SolidMicrophoneIcon;
    case 'continuous': return SpeakerWaveIcon;
    case 'voice-activation': return CpuChipIcon;
    default: return SolidMicrophoneIcon;
  }
}

/**
 * @function toggleDropdown
 * @description Toggles the visibility of the dropdown menu.
 */
function toggleDropdown(): void {
  if (props.disabled) return;
  isOpen.value = !isOpen.value;
  // Close popover when opening dropdown
  if (isOpen.value) {
    isInfoPopoverOpen.value = false;
  }
}

/**
 * @function toggleInfoPopover
 * @description Toggles the visibility of the info popover.
 */
function toggleInfoPopover(): void {
  if (props.disabled) return;
  isInfoPopoverOpen.value = !isInfoPopoverOpen.value;
  // Close dropdown when opening popover
  if (isInfoPopoverOpen.value) {
    isOpen.value = false;
  }
}

/**
 * @function closeInfoPopover
 * @description Closes the info popover.
 */
function closeInfoPopover(): void {
  isInfoPopoverOpen.value = false;
}

/**
 * @function getModeDetailedDescription
 * @description Returns a detailed description for each audio mode.
 * @param {VoiceInputMode | string} mode - The audio mode value.
 */
function getModeDetailedDescription(mode: VoiceInputMode | string): string {
  switch (mode) {
    case 'push-to-talk':
      return t('voice.pushToTalkDescription');
    case 'continuous':
      return t('voice.continuousDescription');
    case 'voice-activation':
      return t('voice.voiceActivationDescription');
    default:
      return t('voice.selectAudioModeDescription');
  }
}

/**
 * @function selectModeHandler
 * @description Handles the selection of an audio mode. Emits event and closes dropdown.
 * @param {VoiceInputMode} mode - The value of the selected audio mode.
 */
function selectModeHandler(mode: VoiceInputMode): void {
  emit('select-mode', mode); // Emitting 'select-mode'
  isOpen.value = false;
}

/**
 * @function handleClickOutside
 * @description Closes the dropdown or popover if a click occurs outside of them.
 */
function handleClickOutside(event: MouseEvent): void {
  const target = event.target as Node;

  // Close dropdown if clicking outside
  if (dropdownRef.value && !dropdownRef.value.contains(target)) {
    isOpen.value = false;
  }

  // Close popover if clicking outside (but not on the info icon itself)
  if (isInfoPopoverOpen.value && popoverRef.value && !popoverRef.value.contains(target)) {
    const infoIcon = dropdownRef.value?.querySelector('.mode-info-icon');
    if (!infoIcon?.contains(target)) {
      isInfoPopoverOpen.value = false;
    }
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside, true);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside, true);
});
</script>

<style scoped lang="scss">
/* Styles are from your provided file. Transition name changed for consistency if needed. */
.audio-mode-dropdown-wrapper {
  position: relative;

  &.is-compact {
    .mode-info-icon {
      font-size: 0.75rem;
    }

    .chevron-icon {
      width: 0.85rem;
      height: 0.85rem;
    }
  }
}

.audio-mode-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: var(--vi-control-bg);
  border: 1px solid var(--vi-panel-border);
  border-radius: 0.5rem;
  color: var(--vi-label-strong-color);
  font-size: 0.875rem;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    background: hsla(var(--color-accent-primary-h), var(--color-accent-primary-s), var(--color-accent-primary-l), 0.18);
    border-color: hsl(var(--color-accent-interactive-h), var(--color-accent-interactive-s), var(--color-accent-interactive-l));
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.audio-mode-button--compact {
  padding: 0.45rem 0.6rem;
  gap: 0.4rem;
}

.icon-sm { /* Ensure this class is defined if used or use direct icon components */
  width: 1.25rem; /* 20px */
  height: 1.25rem; /* 20px */
}


.chevron-icon {
  width: 1rem;
  height: 1rem;
  transition: transform 0.2s ease;

  &.rotate-180 {
    transform: rotate(180deg);
  }
}

.mode-chip {
  display: none;
  align-items: center;
  justify-content: center;
  padding: 0.18rem 0.45rem;
  border-radius: 999px;
  background: hsla(var(--color-bg-secondary-h), var(--color-bg-secondary-s), var(--color-bg-secondary-l), 0.65);
  color: var(--vi-label-strong-color);
  font-size: 0.6rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.audio-mode-dropdown-wrapper.is-compact .mode-chip {
  display: inline-flex;
}

.dropdown-menu {
  position: absolute;
  bottom: calc(100% + 0.5rem);
  right: 0;
  min-width: 250px;
  background: var(--vi-control-bg);
  border: 1px solid var(--vi-panel-border);
  border-radius: 0.75rem;
  box-shadow: 0 10px 50px hsla(var(--color-shadow-h), var(--color-shadow-s), var(--color-shadow-l), 0.2);
  overflow: hidden;
  z-index: 100;
}

.dropdown-header {
  padding: 0.75rem 1rem;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--vi-muted-color);
  border-bottom: 1px solid var(--vi-panel-border);
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  padding: 0.75rem 1rem;
  background: transparent;
  border: none;
  color: var(--vi-label-strong-color);
  text-align: left;
  transition: all 0.15s ease;
  cursor: pointer;

  &:hover {
    background: hsla(var(--color-accent-primary-h), var(--color-accent-primary-s), var(--color-accent-primary-l), 0.1);
  }

  &.active {
    background: hsla(var(--color-accent-primary-h), var(--color-accent-primary-s), var(--color-accent-primary-l), 0.15);
    color: var(--vi-label-strong-color);
  }
}

.option-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.option-label {
  font-weight: 500;
  font-size: 0.875rem;
}

.option-description {
  font-size: 0.75rem;
  color: var(--vi-muted-color);
}

.check-icon {
  width: 1rem;
  height: 1rem;
  color: hsl(var(--color-accent-primary-h), var(--color-accent-primary-s), var(--color-accent-primary-l));
}

/* Renamed transition for consistency */
.dropdown-transition-enter-active,
.dropdown-transition-leave-active {
  transition: all 0.2s ease;
}

.dropdown-transition-enter-from,
.dropdown-transition-leave-to {
  opacity: 0;
  transform: translateY(10px) scale(0.95);
}

/* Info Popover Styles */
.info-popover {
  position: absolute;
  bottom: calc(100% + 0.75rem);
  right: 0;
  width: 320px;
  max-width: 90vw;
  background: var(--vi-control-bg);
  border: 1px solid var(--vi-panel-border);
  border-radius: 0.75rem;
  box-shadow: 0 20px 60px hsla(var(--color-shadow-h), var(--color-shadow-s), var(--color-shadow-l), 0.3);
  z-index: 101;
  overflow: hidden;
}

.popover-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  background: hsla(var(--color-bg-secondary-h), var(--color-bg-secondary-s), var(--color-bg-secondary-l), 0.45);
  border-bottom: 1px solid var(--vi-panel-border);
}

.popover-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--vi-label-strong-color);
}

.popover-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  padding: 0;
  background: transparent;
  border: none;
  border-radius: 0.375rem;
  color: var(--vi-muted-color);
  transition: all 0.15s ease;
  cursor: pointer;

  &:hover {
    background: hsla(var(--color-bg-tertiary-h), var(--color-bg-tertiary-s), var(--color-bg-tertiary-l), 0.7);
    color: var(--vi-label-strong-color);
  }
}

.icon-xs {
  width: 1rem;
  height: 1rem;
}

.popover-content {
  padding: 1rem;
  max-height: 400px;
  overflow-y: auto;
}

.mode-info-item {
  padding: 1rem;
  background: hsla(var(--color-bg-secondary-h), var(--color-bg-secondary-s), var(--color-bg-secondary-l), 0.32);
  border: 1px solid var(--vi-panel-border);
  border-radius: 0.5rem;

  & + .mode-info-item {
    margin-top: 0.75rem;
  }
}

.mode-info-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.mode-icon {
  color: hsl(var(--color-accent-primary-h), var(--color-accent-primary-s), var(--color-accent-primary-l));
}

.mode-info-label {
  font-weight: 600;
  font-size: 0.925rem;
  color: var(--vi-label-strong-color);
}

.mode-info-description {
  margin: 0;
  font-size: 0.825rem;
  line-height: 1.5;
  color: var(--vi-muted-color);
}

/* Popover transition */
.popover-transition-enter-active,
.popover-transition-leave-active {
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.popover-transition-enter-from {
  opacity: 0;
  transform: translateY(8px) scale(0.92);
}

.popover-transition-leave-to {
  opacity: 0;
  transform: translateY(4px) scale(0.96);
}

/* Update mode-info-icon to indicate it's clickable */
.mode-info-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.25rem;
  height: 1.25rem;
  font-size: 0.9rem;
  font-weight: bold;
  background: hsla(var(--color-accent-primary-h), var(--color-accent-primary-s), var(--color-accent-primary-l), 0.15);
  color: hsl(var(--color-accent-primary-h), var(--color-accent-primary-s), var(--color-accent-primary-l));
  border: 1px solid hsla(var(--color-accent-primary-h), var(--color-accent-primary-s), var(--color-accent-primary-l), 0.3);
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-left: 0.25rem;
  user-select: none;

  &:hover {
    background: hsla(var(--color-accent-primary-h), var(--color-accent-primary-s), var(--color-accent-primary-l), 0.25);
    transform: scale(1.15);
    box-shadow: 0 0 0 2px hsla(var(--color-accent-primary-h), var(--color-accent-primary-s), var(--color-accent-primary-l), 0.2);
  }

  &:active {
    transform: scale(1.05);
  }
}
</style>
