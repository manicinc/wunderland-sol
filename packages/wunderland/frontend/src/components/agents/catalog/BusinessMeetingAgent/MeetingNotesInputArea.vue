<template>
  <div class="meeting-notes-input-area-v2">
    <div class="input-header-v2">
      <DocumentTextIcon class="w-5 h-5 text-[var(--meeting-accent-color)]" />
      <h3 class="input-title-v2">{{ agentDisplayName }} - New Summary Input</h3>
      <span class="text-xs text-[var(--color-text-muted)] ml-auto">
        Paste or type your meeting notes below.
      </span>
    </div>
    <textarea
      ref="textareaRef"
      v-model="localNotes"
      placeholder="Enter your raw meeting notes, transcript, or a brief overview here... The more context, the better the summary and action items!"
      class="notes-textarea-v2"
      :disabled="isLoading"
      aria-label="Meeting notes input area"
    ></textarea>
    <div class="input-footer-v2">
      <div class="quick-actions-v2">
        <button @click="insertTemplate('standard_meeting')" class="btn-futuristic-outline btn-xxs" :disabled="isLoading">Standard Template</button>
        <button @click="insertTemplate('decision_focused')" class="btn-futuristic-outline btn-xxs" :disabled="isLoading">Decision Focus</button>
        <button @click="handlePasteFromClipboard" class="btn-futuristic-outline btn-xxs" :disabled="isLoading">
          <ClipboardDocumentIcon class="w-3 h-3 mr-1"/> Paste
        </button>
      </div>
      <button
        @click="submitNotes"
        class="btn-futuristic-primary btn-sm main-submit-btn"
        :disabled="isLoading || localNotes.trim().length < 20"
        title="Submit notes for processing (min 20 characters)"
      >
        <PaperAirplaneIcon class="btn-icon-sm" />
        {{ isLoading ? 'Processing...' : 'Generate Summary' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, type PropType } from 'vue';
import { DocumentTextIcon, PaperAirplaneIcon, ClipboardDocumentIcon } from '@heroicons/vue/24/outline'; // Changed to outline for consistency
import type { ToastService } from '@/services/services'; // Assuming ToastService might be injected or used globally
import { inject } from 'vue';


const props = defineProps({
  isLoading: { type: Boolean, default: false },
  agentDisplayName: { type: String, default: 'Meeting Scribe' },
  notes: { type: String, default: '' }, // Prop for v-model
});

const emit = defineEmits<{
  (e: 'update:notes', value: string): void; // For v-model
  (e: 'submit-notes', payload: { notes: string; suggestedTitle?: string; autoExtractEntities?: boolean }): void;
}>();

const localNotes = ref(props.notes);
const textareaRef = ref<HTMLTextAreaElement | null>(null);
const toast = inject<ToastService>('toast');


watch(() => props.notes, (newVal) => {
  if (newVal !== localNotes.value) {
    localNotes.value = newVal;
  }
});

watch(localNotes, (newVal) => {
  emit('update:notes', newVal);
});

const submitNotes = () => {
  if (localNotes.value.trim().length >= 20) {
    emit('submit-notes', { notes: localNotes.value, autoExtractEntities: true });
  } else {
    toast?.add({ type: 'warning', title: 'Input Too Short', message: 'Please provide at least 20 characters of notes for an effective summary.'})
  }
};

const insertTemplate = (templateType: 'standard_meeting' | 'decision_focused') => {
  let template = '';
  if (templateType === 'standard_meeting') {
    template = `**Meeting Title:** [Enter Title Here]\n**Date:** ${new Date().toLocaleDateString()}\n**Attendees:** [Name1], [Name2]\n\n**Agenda Items:**\n1. [Item 1]\n2. [Item 2]\n\n**Key Discussion Points:**\n- Point A discussed...\n- Point B led to...\n\n**Decisions Made:**\n- Decision 1: ...\n\n**Action Items:**\n- (Assignee) Task: [Description] - Due: [Date]\n\n**Other Notes:**\n- ...`;
  } else if (templateType === 'decision_focused') {
    template = `**Meeting Objective:** [Focus on decisions]\n**Date:** ${new Date().toLocaleDateString()}\n\n**Proposals Discussed:**\n- Proposal X: ...\n\n**Key Arguments For/Against:**\n- Argument for X: ...\n- Argument against X: ...\n\n**Final Decisions & Rationale:**\n1. Decision on Proposal X: [APPROVED/REJECTED/DEFERRED] - Rationale: ...\n\n**Next Steps for Decisions:**\n- ...`;
  }
  localNotes.value = localNotes.value ? `${localNotes.value}\n\n---\n\n${template}` : template;
  textareaRef.value?.focus();
};

const handlePasteFromClipboard = async () => {
  try {
    const text = await navigator.clipboard.readText();
    if (text) {
      localNotes.value = localNotes.value ? `${localNotes.value}\n${text}` : text;
      toast?.add({type: 'success', title: 'Pasted from Clipboard', message: 'Content successfully pasted into notes.'});
    } else {
      toast?.add({type: 'info', title: 'Clipboard Empty', message: 'Nothing to paste from clipboard.'});
    }
  } catch (err) {
    console.error('Failed to read clipboard contents: ', err);
    toast?.add({type: 'error', title: 'Paste Error', message: 'Could not paste from clipboard. Check browser permissions.'});
  }
};

</script>

<style lang="scss" scoped>
// CORRECTED: Changed @import to @use and aliased
@use '@/styles/abstracts/variables' as var;
@use '@/styles/abstracts/mixins' as mixins;

.meeting-notes-input-area-v2 {
  @apply flex flex-col h-full p-3 gap-2;
  // Define meeting-specific CSS variables if needed, or rely on global theme
  --meeting-accent-color: hsl(var(--color-accent-interactive-h), var(--color-accent-interactive-s), var(--color-accent-interactive-l));
  background-color: hsl(var(--color-bg-primary-h), var(--color-bg-primary-s), calc(var(--color-bg-primary-l) - 1%));
}

.input-header-v2 {
  @apply flex items-center gap-2 pb-2 border-b shrink-0;
  border-bottom-color: hsla(var(--color-border-primary-h), var(--color-border-primary-s), var(--color-border-primary-l), 0.2);
  .input-title-v2 {
    @apply font-semibold text-sm;
    color: hsl(var(--color-text-primary-h), var(--color-text-primary-s), var(--color-text-primary-l));
  }
}

.notes-textarea-v2 {
  @apply flex-grow w-full p-2.5 rounded-md border text-sm leading-relaxed resize-none;
  // Assuming form-input-futuristic provides base styling, then we override
  background-color: hsla(var(--color-bg-secondary-h), var(--color-bg-secondary-s), var(--color-bg-secondary-l), 0.7);
  border-color: hsla(var(--color-border-primary-h), var(--color-border-primary-s), var(--color-border-primary-l), 0.3);
  color: hsl(var(--color-text-primary-h), var(--color-text-primary-s), var(--color-text-primary-l));
  box-shadow: inset 0 1px 3px hsla(var(--shadow-color-h), var(--shadow-color-s), var(--shadow-color-l), 0.08);

  &:focus {
    outline: none;
    border-color: hsla(var(--meeting-accent-h, var.$default-color-accent-interactive-h), var(--meeting-accent-s, var.$default-color-accent-interactive-s), var(--meeting-accent-l, var.$default-color-accent-interactive-l), 0.7);
    background-color: hsla(var(--color-bg-secondary-h), var(--color-bg-secondary-s), calc(var(--color-bg-secondary-l) + 2%), 0.9);
    box-shadow: var.$shadow-depth-sm, 0 0 0 2px hsla(var(--meeting-accent-h, var.$default-color-accent-interactive-h), var(--meeting-accent-s, var.$default-color-accent-interactive-s), var(--meeting-accent-l, var.$default-color-accent-interactive-l), 0.3);
  }
  // CORRECTED: Use the updated mixin name and SASS module syntax
  @include mixins.custom-scrollbar-for-themed-panel('--meeting');
}

.input-footer-v2 {
  @apply flex items-center justify-between pt-2 border-t shrink-0;
  border-top-color: hsla(var(--color-border-primary-h), var(--color-border-primary-s), var(--color-border-primary-l), 0.2);
  .quick-actions-v2 {
    @apply flex items-center gap-1.5;
  }
  .btn-futuristic-outline.btn-xxs { // Custom styling for smaller outline buttons
    @apply px-2 py-0.5 text-xxs; // .text-xxs is now defined
    // ensure btn-xxs or similar provides base font-size correctly if used this way
  }
  .main-submit-btn.btn-sm { // Ensure btn-sm provides appropriate sizing
    min-width: 160px; // Give the main button some presence
  }
}
</style>