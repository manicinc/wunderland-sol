// File: frontend/src/components/voice-input/components/InputToolbar.vue
/**
 * @file InputToolbar.vue
 * @description Toolbar for additional input options like file upload, STT engine switching,
 * and toggling live transcription.
 *
 * Revisions:
 * - Added props: `sttEngineOptions`, `currentSttEngineProp` (renamed to avoid conflict with local ref if any), `liveTranscriptionEnabledProp`.
 * - Emits `@file-upload` with payload: `{ type: 'text' | 'pdf' | 'image'; file: File }`.
 * - Emits `@stt-engine-change` with `engine: SttEngineType`.
 * - Emits `@toggle-live-transcription` with `(enabled: boolean)`.
 * - Local `showLiveTranscription` ref now uses prop and emits changes.
 * - `currentSttEngine` is now a prop.
 * - Added JSDoc.
 */
<template>
  <div class="input-toolbar-holographic" :class="{ expanded: isExpanded }">
    <div class="toolbar-backdrop"></div>

    <div class="toolbar-content">
      <div v-if="!isExpanded" class="toolbar-compact">
        <button
          @click="isExpanded = true"
          class="expand-button"
          title="Show input options"
          aria-label="Show input options"
          aria-expanded="false"
        >
          <PlusCircleIcon class="icon" aria-hidden="true"/>
        </button>
      </div>

      <div v-else class="toolbar-expanded">
        <div class="toolbar-header">
          <span class="toolbar-title">Input Options</span>
          <button @click="closeToolbarAndEmit" class="close-button" aria-label="Close input options">
            <XMarkIcon class="icon-sm" aria-hidden="true"/>
          </button>
        </div>

        <div class="toolbar-options">
          <div class="option-group">
            <label class="option-label" :id="fileUploadLabelId">Upload Files</label>
            <div class="file-upload-buttons" role="group" :aria-labelledby="fileUploadLabelId">
              <button
                @click="triggerFileUpload('text')"
                class="upload-button"
                :disabled="!features.textUpload"
                title="Upload text or PDF"
              >
                <DocumentTextIcon class="icon" aria-hidden="true"/>
                <span>Text/PDF</span>
              </button>

              <button
                @click="triggerFileUpload('image')"
                class="upload-button"
                :disabled="!features.imageUpload"
                title="Upload image"
              >
                <PhotoIcon class="icon" aria-hidden="true"/>
                <span>Image</span>
              </button>
            </div>
            <input
              ref="fileInputRef"
              type="file"
              :accept="currentAcceptTypes"
              @change="handleFileSelect"
              style="display: none"
              aria-hidden="true"
            />
          </div>

          <div class="option-group">
            <label class="option-label" :id="sttEngineLabelId">Speech Engine</label>
            <div class="engine-toggle" role="radiogroup" :aria-labelledby="sttEngineLabelId">
               <button
                v-for="engineOpt in sttEngineOptions"
                :key="engineOpt.value"
                @click="selectEngineHandler(engineOpt.value)"
                class="engine-option"
                :class="{ active: currentSttEngineProp === engineOpt.value }"
                role="radio"
                :aria-checked="currentSttEngineProp === engineOpt.value"
                :title="engineOpt.description || engineOpt.label"
              >
                <GlobeAltIcon v-if="engineOpt.value === 'browser_webspeech_api'" class="icon-sm" aria-hidden="true"/>
                <CloudIcon v-else-if="engineOpt.value === 'whisper_api'" class="icon-sm" aria-hidden="true"/>
                <span>{{ engineOpt.label }}</span>
              </button>
            </div>
          </div>

          <div class="option-group">
            <label class="option-label option-label-checkbox" :for="liveTranscriptionCheckboxId">
              <input
                type="checkbox"
                :id="liveTranscriptionCheckboxId"
                :checked="liveTranscriptionEnabledProp"
                @change="toggleLiveTranscriptionHandler"
                class="option-checkbox"
              />
              Show live transcription
            </label>
          </div>
        </div>
      </div>
    </div>

    <div v-if="isExpanded" class="holographic-glow"></div>
  </div>
</template>

<script setup lang="ts">
/**
 * @script InputToolbar
 * @description Logic for the InputToolbar component.
 */
import { ref, computed, type PropType } from 'vue';
// Removed voiceSettingsManager import, settings should come via props
import {
  PlusCircleIcon, XMarkIcon, DocumentTextIcon, PhotoIcon,
  GlobeAltIcon, CloudIcon,
} from '@heroicons/vue/24/outline';
// Import shared types
import type { SttEngineType, SttEngineOption } from '../types';

/**
 * @interface Features
 * @description Defines feature flags for enabling/disabling toolbar options.
 */
interface FeatureFlags {
  textUpload: boolean;
  imageUpload: boolean;
}

/**
 * @interface Props
 * @description Props for the InputToolbar component.
 */
const props = defineProps({
  /** Array of STT engine options to display. */
  sttEngineOptions: {
    type: Array as PropType<SttEngineOption[]>,
    required: true,
  },
  /** The currently selected STT engine. Renamed to avoid conflict. */
  currentSttEngineProp: {
    type: String as PropType<SttEngineType>,
    required: true,
  },
  /** Whether live transcription is currently enabled. Renamed to avoid conflict. */
  liveTranscriptionEnabledProp: {
    type: Boolean,
    required: true,
  },
  /** Optional feature flags to control available options. */
  features: {
    type: Object as PropType<Partial<FeatureFlags>>,
    default: () => ({ textUpload: true, imageUpload: false }),
  },
});

/**
 * @emits Emits
 * @description Events emitted by the InputToolbar component.
 */
const emit = defineEmits<{
  (e: 'close-toolbar'): void; // Changed from 'close'
  (e: 'file-upload', payload: { type: 'text' | 'pdf' | 'image'; file: File }): void; // Corrected payload
  (e: 'stt-engine-change', engine: SttEngineType): void; // Corrected type
  (e: 'toggle-live-transcription', enabled: boolean): void; // Added this emit
}>();

const isExpanded = ref(false); // Internal expansion state
const fileInputRef = ref<HTMLInputElement | null>(null);
const currentUploadType = ref<'text' | 'pdf' | 'image'>('text'); // To manage accept types

// Unique IDs for ARIA attributes
const fileUploadLabelId = 'file-upload-label-' + Math.random().toString(36).substring(2,7);
const sttEngineLabelId = 'stt-engine-label-' + Math.random().toString(36).substring(2,7);
const liveTranscriptionCheckboxId = 'live-transcription-checkbox-' + Math.random().toString(36).substring(2,7);

/**
 * @computed currentAcceptTypes
 * @description Determines file types for the input based on currentUploadType.
 */
const currentAcceptTypes = computed<string>(() => {
  if (currentUploadType.value === 'image') return 'image/*';
  // For 'text' or 'pdf' (assuming combined button functionality)
  return '.txt,.pdf,.md,text/plain,application/pdf,text/markdown';
});

/**
 * @function closeToolbarAndEmit
 * @description Sets internal state to close and emits 'close-toolbar'.
 */
function closeToolbarAndEmit(): void {
  isExpanded.value = false;
  emit('close-toolbar');
}

/**
 * @function triggerFileUpload
 * @description Sets the current upload type and triggers the file input click.
 * @param {'text' | 'image'} type - The type of file intended for upload. 'pdf' is handled under 'text'.
 */
function triggerFileUpload(type: 'text' | 'image'): void {
  currentUploadType.value = type; // 'text' will cover .txt, .pdf, .md based on accept types
  fileInputRef.value?.click();
}

/**
 * @function handleFileSelect
 * @description Processes the selected file and emits it with its type.
 * @param {Event} event - The file input change event.
 */
function handleFileSelect(event: Event): void {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];

  if (file) {
    let determinedType: 'text' | 'pdf' | 'image' = currentUploadType.value;
    // More specific type determination if needed
    if ((currentUploadType.value === 'text') && file.type === 'application/pdf') {
      determinedType = 'pdf';
    }
    emit('file-upload', { type: determinedType, file });
    if (input) input.value = ''; // Reset input
  }
}

/**
 * @function selectEngineHandler
 * @description Emits the selected STT engine if it's different from the current one.
 * @param {SttEngineType} engine - The chosen STT engine.
 */
function selectEngineHandler(engine: SttEngineType): void {
  if (props.currentSttEngineProp !== engine) {
    emit('stt-engine-change', engine);
  }
}

/**
 * @function toggleLiveTranscriptionHandler
 * @description Emits the new state of the live transcription toggle.
 * @param {Event} event - The checkbox change event.
 */
function toggleLiveTranscriptionHandler(event: Event): void {
  const target = event.target as HTMLInputElement;
  emit('toggle-live-transcription', target.checked);
}
</script>

<style scoped lang="scss">
/* Styles from your provided file. Ensure theme variables are available. */
.input-toolbar-holographic {
  position: absolute; /* This needs to be managed by parent or a wrapper */
  bottom: calc(100% + 1rem); /* Example positioning */
  right: 0;
  z-index: 100;
  transition: all 0.3s ease;
  transform-origin: bottom right; /* For scale animations */

  &.expanded {
    .toolbar-backdrop {
      opacity: 1;
      transform: scale(1);
    }
    .holographic-glow {
      opacity: 1;
      animation: holoPulse 4s ease-in-out infinite;
    }
  }
}

.toolbar-backdrop {
  position: absolute;
  inset: -2px;
  background: linear-gradient(
    135deg,
    hsla(var(--color-bg-primary-h, 220), var(--color-bg-primary-s, 15%), calc(var(--color-bg-primary-l, 15%) * 0.95), 0.9),
    hsla(var(--color-bg-secondary-h, 220), var(--color-bg-secondary-s, 15%), calc(var(--color-bg-secondary-l, 20%) * 0.95), 0.85)
  );
  backdrop-filter: blur(20px) saturate(1.5);
  border-radius: 1rem;
  border: 1px solid hsla(var(--color-border-primary-h, 220), var(--color-border-primary-s, 10%), var(--color-border-primary-l, 30%), 0.2);
  opacity: 0;
  transform: scale(0.9);
  transition: all 0.3s ease;
  pointer-events: none;
}

.toolbar-content {
  position: relative;
  z-index: 2;
  padding: 0.75rem;
  min-width: 280px;
}

.toolbar-compact {
  display: flex;
  justify-content: center;
  min-width: auto; /* Override min-width for compact */
  padding: 0; /* No padding when compact */
}

.expand-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: hsla(var(--color-accent-primary-h, 210), var(--color-accent-primary-s, 100%), calc(var(--color-accent-primary-l, 50%) * 0.2), 0.1);
  border: 1px solid hsla(var(--color-accent-primary-h, 210), var(--color-accent-primary-s, 100%), var(--color-accent-primary-l, 50%), 0.3);
  border-radius: 50%;
  color: hsl(var(--color-accent-primary-h, 210), var(--color-accent-primary-s, 100%), var(--color-accent-primary-l, 50%));
  transition: all 0.2s ease;
  cursor: pointer;

  &:hover {
    background: hsla(var(--color-accent-primary-h, 210), var(--color-accent-primary-s, 100%), calc(var(--color-accent-primary-l, 50%) * 0.3), 0.2);
    transform: scale(1.1);
  }

  .icon { width: 24px; height: 24px; }
}

.toolbar-expanded {
  animation: expandIn 0.3s ease forwards;
}

@keyframes expandIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.toolbar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid hsla(var(--color-border-primary-h, 220), var(--color-border-primary-s, 10%), var(--color-border-primary-l, 30%), 0.1);
}

.toolbar-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: hsl(var(--color-text-primary-h, 220), var(--color-text-primary-s, 10%), var(--color-text-primary-l, 90%));
}

.close-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background: transparent;
  border: none;
  color: hsl(var(--color-text-muted-h, 220), var(--color-text-muted-s, 10%), var(--color-text-muted-l, 60%));
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    color: hsl(var(--color-text-primary-h, 220), var(--color-text-primary-s, 10%), var(--color-text-primary-l, 90%));
  }
}

.toolbar-options { display: flex; flex-direction: column; gap: 1rem; }
.option-group { display: flex; flex-direction: column; gap: 0.5rem; }

.option-label {
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: hsl(var(--color-text-muted-h, 220), var(--color-text-muted-s, 10%), var(--color-text-muted-l, 60%));
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: default;

  &.option-label-checkbox { /* For labels wrapping checkboxes */
    cursor: pointer;
    text-transform: none;
    letter-spacing: normal;
    font-weight: normal;
     color: hsl(var(--color-text-primary-h, 220), var(--color-text-primary-s, 10%), var(--color-text-primary-l, 90%));
    &:hover {
      color: hsl(var(--color-accent-primary-h, 210), var(--color-accent-primary-s, 100%), var(--color-accent-primary-l, 50%));
    }
  }
}

.file-upload-buttons { display: flex; gap: 0.5rem; }

.upload-button {
  flex: 1; display: flex; flex-direction: column; align-items: center; gap: 0.25rem;
  padding: 0.75rem 0.5rem;
  background: hsla(var(--color-bg-tertiary-h, 220), var(--color-bg-tertiary-s, 10%), calc(var(--color-bg-tertiary-l, 25%) * 0.5), 0.5);
  border: 1px solid hsla(var(--color-border-secondary-h, 220), var(--color-border-secondary-s, 10%), var(--color-border-secondary-l, 40%), 0.3);
  border-radius: 0.5rem;
  color: hsl(var(--color-text-primary-h, 220), var(--color-text-primary-s, 10%), var(--color-text-primary-l, 90%));
  font-size: 0.75rem; cursor: pointer; transition: all 0.2s ease;

  &:hover:not(:disabled) {
    background: hsla(var(--color-bg-tertiary-h, 220), var(--color-bg-tertiary-s, 10%), calc(var(--color-bg-tertiary-l, 25%) * 1.1), 0.7);
    border-color: hsl(var(--color-accent-interactive-h, 200), var(--color-accent-interactive-s, 90%), var(--color-accent-interactive-l, 60%));
  }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
  .icon { width: 20px; height: 20px; }
}

.engine-toggle {
  display: flex; gap: 0.25rem;
  background: hsla(var(--color-bg-primary-h, 220), var(--color-bg-primary-s, 15%), var(--color-bg-primary-l, 15%), 0.5);
  padding: 0.25rem; border-radius: 0.5rem;
}

.engine-option {
  flex: 1; display: flex; align-items: center; justify-content: center; gap: 0.25rem;
  padding: 0.5rem 0.75rem; background: transparent; border: none; border-radius: 0.375rem;
  color: hsl(var(--color-text-secondary-h, 220), var(--color-text-secondary-s, 10%), var(--color-text-secondary-l, 70%));
  font-size: 0.813rem; cursor: pointer; transition: all 0.2s ease;

  &:hover { background: hsla(var(--color-bg-tertiary-h, 220), var(--color-bg-tertiary-s, 10%), var(--color-bg-tertiary-l, 25%), 0.5); }
  &.active {
    background: hsla(var(--color-accent-primary-h, 210), var(--color-accent-primary-s, 100%), var(--color-accent-primary-l, 50%), 0.2);
    color: hsl(var(--color-accent-primary-h, 210), var(--color-accent-primary-s, 100%), var(--color-accent-primary-l, 50%));
  }
}

.option-checkbox {
  width: 1rem; height: 1rem;
  accent-color: hsl(var(--color-accent-primary-h, 210), var(--color-accent-primary-s, 100%), var(--color-accent-primary-l, 50%));
  margin-right: 0.5rem; /* Space between checkbox and label text */
}

.holographic-glow {
  position: absolute; inset: -20px;
  background: radial-gradient( ellipse at center,
    hsla(var(--color-accent-primary-h, 210), var(--color-accent-primary-s, 100%), calc(var(--color-accent-primary-l, 50%) * 0.2), 0.1) 0%,
    transparent 70%
  );
  opacity: 0; transition: opacity 0.3s ease; pointer-events: none; z-index: 0;
}
@keyframes holoPulse {
  0%, 100% { transform: scale(1); opacity: 0.7; }
  50% { transform: scale(1.1); opacity: 1; }
}

.icon { width: 1.5rem; height: 1.5rem; }
.icon-sm { width: 1rem; height: 1rem; }
</style>