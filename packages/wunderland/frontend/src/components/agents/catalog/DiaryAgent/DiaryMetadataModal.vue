<template>
  <Transition name="modal-fade-futuristic">
    <div class="modal-backdrop-futuristic" @click.self="$emit('cancel')">
      <div class="modal-content-futuristic diary-metadata-modal-v2">
        <div class="modal-header-futuristic">
          <h3 class="modal-title-futuristic">
            <TagIcon class="w-5 h-5 mr-2 opacity-80"/> Finalize Entry Details
          </h3>
          <button @click="$emit('cancel')" class="btn-modal-close-futuristic">&times;</button>
        </div>
        <div class="modal-body-futuristic">
          <p class="text-xs mb-3 italic" style="color: var(--color-text-muted);">
            Echo has suggested the following details based on your entry. Feel free to adjust them.
          </p>
          <div class="form-grid-v2">
            <div>
              <label for="entryTitle" class="form-label-v2">Title:</label>
              <input id="entryTitle" type="text" v-model="editableTitle" class="form-input-futuristic" />
            </div>
            <div>
              <label for="entryTags" class="form-label-v2">Tags (comma-separated):</label>
              <input id="entryTags" type="text" v-model="editableTags" class="form-input-futuristic" />
            </div>
            <div>
              <label for="entryMood" class="form-label-v2">Mood:</label>
              <input id="entryMood" type="text" v-model="editableMood" list="commonMoodsModal" class="form-input-futuristic" />
              <datalist id="commonMoodsModal">
                 <option v-for="m in defaultMoods" :key="m" :value="m"></option>
              </datalist>
            </div>
             <div>
              <label class="form-label-v2">AI Summary (for reference):</label>
              <p class="summary-preview-v2">{{ suggestedSummary }}</p>
            </div>
          </div>
        </div>
        <div class="modal-footer-futuristic">
          <button @click="$emit('cancel')" class="btn-futuristic-secondary btn-sm">Keep Editing Entry</button>
          <button @click="handleConfirm" class="btn-futuristic-primary btn-sm">
            <CheckCircleIcon class="btn-icon-sm"/> Confirm & Save Entry
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, watch, type PropType } from 'vue';
import { TagIcon, CheckCircleIcon } from '@heroicons/vue/24/solid';
import { DEFAULT_DIARY_AGENT_CONFIG } from './DiaryAgentTypes';


const props = defineProps({
  suggestedTitle: { type: String, required: true },
  suggestedTags: { type: Array as PropType<string[]>, required: true },
  suggestedMood: { type: String, default: '' },
  suggestedSummary: { type: String, required: true },
});

const emit = defineEmits<{
  (e: 'confirm', metadata: { title: string; tags: string[]; mood?: string; summary: string }): void;
  (e: 'cancel'): void;
}>();

const editableTitle = ref(props.suggestedTitle);
const editableTags = ref(props.suggestedTags.join(', '));
const editableMood = ref(props.suggestedMood);
const defaultMoods = DEFAULT_DIARY_AGENT_CONFIG.defaultMoods;


watch(() => props.suggestedTitle, (newVal) => editableTitle.value = newVal);
watch(() => props.suggestedTags, (newVal) => editableTags.value = newVal.join(', '));
watch(() => props.suggestedMood, (newVal) => editableMood.value = newVal || '');

const handleConfirm = () => {
  emit('confirm', {
    title: editableTitle.value.trim() || 'Untitled Entry',
    tags: editableTags.value.split(',').map(t => t.trim()).filter(t => t),
    mood: editableMood.value.trim() || undefined,
    summary: props.suggestedSummary, // Summary is not editable by user here, it's from LLM
  });
};
</script>

<style lang="scss" scoped>
@use '@/styles/abstracts/variables' as var;
@use '@/styles/abstracts/mixins' as mixins;

.diary-metadata-modal-v2 {
  max-width: 520px; // Slightly wider for form
}
.form-grid-v2 {
  @apply space-y-3;
}
.form-label-v2 {
  @apply block text-xs font-medium mb-1;
  color: var(--color-text-secondary);
}
.summary-preview-v2 {
    @apply text-xs p-2 rounded border bg-opacity-50;
    background-color: hsla(var(--diary-bg-h), var(--diary-bg-s), calc(var(--diary-bg-l) + 2%), 0.5);
    border-color: hsla(var(--diary-accent-h), var(--diary-accent-s), var(--diary-accent-l), 0.15);
    color: var(--color-text-muted);
    max-height: 80px;
    overflow-y: auto;
    @include mixins.custom-scrollbar-for-themed-panel('--diary');
}

/* Assuming modal styles and form input styles are globally defined or imported */
.modal-backdrop-futuristic, .modal-content-futuristic, .modal-header-futuristic,
.modal-title-futuristic, .btn-modal-close-futuristic, .modal-body-futuristic, .modal-footer-futuristic,
.form-input-futuristic, .btn-futuristic-primary, .btn-futuristic-secondary, .btn-sm, .btn-icon-sm {
  /* Ensure these are styled as per your design system */
}
.modal-fade-futuristic-enter-active, .modal-fade-futuristic-leave-active { /* ... */ }
.modal-fade-futuristic-enter-from, .modal-fade-futuristic-leave-to { /* ... */ }
</style>
