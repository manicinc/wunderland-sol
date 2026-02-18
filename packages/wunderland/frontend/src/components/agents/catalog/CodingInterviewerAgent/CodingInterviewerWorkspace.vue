<template>
  <div class="interview-workspace-panel">
    <div class="interview-content-area">
      <CompactMessageRenderer
        v-if="activeDisplayMarkdown"
        :key="activeDisplayMarkdown.substring(0, 50) + interviewStage" :content="activeDisplayMarkdown"
        :mode="agentIdForRenderer"
        class="h-full w-full"
      />
      <div v-else-if="!isLoadingLlm" class="flex items-center justify-center h-full text-center">
        <SparklesIcon class="w-12 h-12 text-text-muted opacity-40 mb-2"/>
        <p class="text-sm" style="color: var(--color-text-muted);">
          {{ interviewStage === 'initial' ? 'Click "Start New Interview" to begin.' : 'Waiting for interviewer action...' }}
        </p>
      </div>
       <div v-if="isLoadingLlm && !activeDisplayMarkdown" class="loading-placeholder">
          <div class="interviewer-spinner large"></div>
          <p class="mt-2 text-sm text-gray-500">Processing...</p>
      </div>
    </div>

    <div v-if="interviewStage === 'solution_input' || (interviewStage === 'problem_presented' && currentProblem)" class="solution-input-section">
      <h3 class="solution-input-header">
        Your Solution ({{ currentProblem?.language || 'code' }}):
        <button @click="$emit('request-hint')" class="btn-futuristic-link btn-xs ml-2" title="Request a hint">
            <LightBulbIcon class="w-3 h-3 mr-0.5"/> Get Hint
        </button>
      </h3>
      <textarea
        ref="solutionTextareaRef"
        :value="userSolution"
        @input="$emit('update:user-solution', ($event.target as HTMLTextAreaElement).value)"
        placeholder="Enter your code solution here... (Ctrl+Enter or Cmd+Enter to submit)"
        class="solution-textarea"
        rows="12"
        @keydown.ctrl.enter.prevent="$emit('submit-solution')"
        @keydown.meta.enter.prevent="$emit('submit-solution')"
        :disabled="isLoadingLlm"
      ></textarea>
      <div class="solution-actions">
        <button @click="$emit('submit-solution')" class="btn-futuristic-primary btn-sm" :disabled="!userSolution.trim() || isLoadingLlm">
          <PaperAirplaneIcon class="btn-icon-sm rotate-[-45deg]"/> Submit Solution
        </button>
      </div>
    </div>
     <div v-if="interviewStage === 'problem_presented' || interviewStage === 'feedback_displayed'" class="clarification-input-section">
        <input
            type="text"
            v-model="clarificationInput"
            @keyup.enter="sendClarification"
            placeholder="Ask a clarifying question or discuss feedback..."
            class="form-input-futuristic small w-full"
            :disabled="isLoadingLlm"
        />
        <button @click="sendClarification" class="btn-futuristic-secondary btn-sm" :disabled="!clarificationInput.trim() || isLoadingLlm">
            Send
        </button>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, type PropType } from 'vue';
import type { InterviewStage, InterviewProblem } from './CodingInterviewerAgentTypes'; // Adjusted path
import CompactMessageRenderer from '@/components/layouts/CompactMessageRenderer/CompactMessageRenderer.vue';
import { SparklesIcon, PaperAirplaneIcon, LightBulbIcon } from '@heroicons/vue/24/solid';
import { useAgentStore } from '@/store/agent.store';


const props = defineProps({
  activeDisplayMarkdown: { type: String, required: true },
  interviewStage: { type: String as PropType<InterviewStage>, required: true },
  currentProblem: { type: Object as PropType<InterviewProblem | null>, default: null },
  isLoadingLlm: { type: Boolean, default: false },
  userSolution: { type: String, required: true },
});

const emit = defineEmits<{
  (e: 'update:user-solution', value: string): void;
  (e: 'submit-solution'): void;
  (e: 'request-hint'): void;
  (e: 'request-input'): void; // To notify parent to focus global input for clarification
  (e: 'send-clarification', text: string): void;
}>();

const solutionTextareaRef = ref<HTMLTextAreaElement | null>(null);
const clarificationInput = ref('');

const agentStore = useAgentStore();
const agentIdForRenderer = computed(() => agentStore.activeAgentId);


watch(() => props.interviewStage, (newStage) => {
  if (newStage === 'solution_input') {
    nextTick(() => solutionTextareaRef.value?.focus());
  }
});

const sendClarification = () => {
    if(clarificationInput.value.trim()){
        emit('send-clarification', clarificationInput.value.trim());
        clarificationInput.value = '';
    }
};

</script>

<style lang="scss" scoped>
@use '@/styles/abstracts/variables' as var;
@use '@/styles/abstracts/mixins' as mixins;

.interview-workspace-panel {
  @apply flex-grow relative min-h-0 flex flex-col overflow-hidden;
  // background-color: hsl(var(--interviewer-bg-h), var(--interviewer-bg-s), var(--interviewer-bg-l));
}

.interview-content-area {
  @apply flex-grow p-3 md:p-5 overflow-y-auto relative; // Added relative for loading placeholder
   background-color: hsl(var(--interviewer-bg-h), var(--interviewer-bg-s), calc(var(--interviewer-bg-l) + 1%)); // Slightly different from panel bg
  @include mixins.custom-scrollbar-for-themed-panel('--interviewer');
}
.loading-placeholder {
    @apply absolute inset-0 flex flex-col items-center justify-center z-10;
    background-color: hsla(var(--interviewer-bg-h), var(--interviewer-bg-s), var(--interviewer-bg-l), 0.7);
    backdrop-filter: blur(2px);
}


.solution-input-section {
  @apply p-3 border-t shrink-0 space-y-2;
  background-color: hsla(var(--interviewer-bg-h), var(--interviewer-bg-s), calc(var(--interviewer-bg-l) + 4%), 0.95);
  border-top-color: hsla(var(--interviewer-accent-h), var(--interviewer-accent-s), var(--interviewer-accent-l), 0.2);
  box-shadow: 0 -2px 10px hsla(var(--interviewer-bg-h), var(--interviewer-bg-s), calc(var(--interviewer-bg-l) - 10%), 0.1);
}
.solution-input-header {
    @apply text-xs font-semibold mb-1 flex justify-between items-center;
    color: var(--color-text-muted);
}
.solution-textarea {
  @apply w-full p-2.5 rounded-md text-sm font-mono resize-none border-2;
  background-color: hsla(var(--interviewer-bg-h), var(--interviewer-bg-s), calc(var(--interviewer-bg-l) - 2%), 0.9);
  color: var(--color-text-primary);
  border-color: hsla(var(--interviewer-accent-h), var(--interviewer-accent-s), var(--interviewer-accent-l), 0.3);
  min-height: 150px;
  max-height: 50vh; // Increased max height
  @include mixins.custom-scrollbar-for-themed-panel('--interviewer');
  &:focus {
    outline: none;
    border-color: hsl(var(--interviewer-accent-h), var(--interviewer-accent-s), var(--interviewer-accent-l));
    box-shadow: 0 0 0 2.5px hsla(var(--interviewer-accent-h), var(--interviewer-accent-s), var(--interviewer-accent-l), 0.35);
  }
}
.solution-actions { @apply mt-1.5 flex justify-end; }

.clarification-input-section {
    @apply p-2 border-t shrink-0 flex items-center gap-2;
    background-color: hsla(var(--interviewer-bg-h), var(--interviewer-bg-s), calc(var(--interviewer-bg-l) + 3%), 0.9);
    border-top-color: hsla(var(--interviewer-accent-h), var(--interviewer-accent-s), var(--interviewer-accent-l), 0.15);
    .form-input-futuristic.small {
        flex-grow: 1;
    }
}


/* Assuming btn-futuristic-* and form-input-futuristic are globally available */
.btn-futuristic-primary.btn-sm { /* Ensure definition */ }
.btn-icon-sm { /* Ensure definition */ }
.btn-futuristic-link.btn-xs {
    @apply text-xs;
    color: hsl(var(--interviewer-accent-h), var(--interviewer-accent-s), var(--interviewer-accent-l));
    &:hover { text-decoration: underline; }
}
.interviewer-spinner.large { /* Ensure defined */ }

</style>
