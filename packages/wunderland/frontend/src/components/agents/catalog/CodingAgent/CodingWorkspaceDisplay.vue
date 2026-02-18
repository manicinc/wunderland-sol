<template>
  <div class="coding-workspace-panel">
    <div
      v-if="props.isLoading && !props.isStreaming && !props.mainContent.trim()"
      class="loading-overlay-futuristic"
    >
      <div class="spinner-futuristic large"></div>
      <p class="loading-text-futuristic">{{ props.agentDisplayName }} is thinking...</p>
    </div>

    <CompactMessageRenderer
        v-if="props.mainContent.trim()"
        :key="rendererKey"
        :content="props.mainContent"
        :mode="props.agentConfig.id"
        :language="props.currentLanguage"
        class="main-display-area"
        :class="{ 'streaming-content': props.isStreaming && !props.isLoading }"
        @rendered="handleContentRendered"
        @interaction="handleRendererInteraction"
    />

    <div
      v-else-if="!props.isLoading && !props.mainContent.trim()"
      class="welcome-workspace"
    >
      <div class="welcome-content">
        <div class="welcome-icon-wrapper">
          <CodeBracketSquareIcon class="welcome-icon" />
        </div>
        <h2 class="welcome-title">{{ props.agentDisplayName }}</h2>
        <p class="welcome-subtitle">{{ props.agentConfig.description || 'Your expert AI pair programmer.' }}</p>
        <p class="welcome-prompt">{{ props.agentConfig.inputPlaceholder || 'Ask a coding question or describe the task.' }}</p>
         <div class="example-prompts-grid-ephemeral mt-4" v-if="props.agentConfig.examplePrompts && props.agentConfig.examplePrompts.length > 0">
            <button
              v-for="(prompt, index) in props.agentConfig.examplePrompts.slice(0, 4)"
              :key="`agent-prompt-${props.agentConfig.id}-${index}`"
              class="prompt-tag-ephemeral btn"
              @click="emit('example-prompt-clicked', prompt)"
              :title="`Use prompt: ${prompt}`"
            >
              {{ prompt }}
            </button>
          </div>
      </div>
    </div>

    <div
      v-if="shouldShowMinimalActionBar"
      class="workspace-action-bar"
    >
      <button
        v-if="props.hasCurrentWork && !props.activeSession && !props.isLoading"
        @click="$emit('save-current-work')"
        class="btn-futuristic-primary btn-sm"
        title="Save current work as a session"
        :disabled="props.isLoading"
      >
        <PlusCircleIcon class="btn-icon-sm" />
        Save Work
      </button>
      </div>

  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, type PropType } from 'vue';
import type { CodingSession } from './CodingAgentTypes';
import type { IAgentDefinition } from '@/services/agent.service';
import CompactMessageRenderer from '@/components/layouts/CompactMessageRenderer/CompactMessageRenderer.vue'; // Primary renderer

import {
  CodeBracketSquareIcon, PlusCircleIcon,
  // Other icons might be used by CompactMessageRenderer internally or if more actions are added here
} from '@heroicons/vue/24/solid';

const props = defineProps<{
  mainContent: string; // This will be Markdown intended for CompactMessageRenderer
  isLoading: boolean;
  isStreaming: boolean;
  currentTitle: string; // Might be used by parent to set document.title or as context
  currentCode: string | null; // Composable still holds this, but mainContent is primary for display
  currentExplanation: string | null; // Same as currentCode
  currentLanguage: string;
  activeSession: CodingSession | null;
  hasCurrentWork: boolean;
  agentDisplayName: string;
  agentConfig: IAgentDefinition;
}>();

const emit = defineEmits<{
  (e: 'save-current-work', titlePrompt?: string): void;
  (e: 'copy-content', text: string | null, type: 'Code' | 'Explanation'): void; // May become obsolete if renderer handles copy
  (e: 'code-action', action: string, data?: any): void; // For actions like "run", "optimize"
  (e: 'example-prompt-clicked', promptText: string): void;
}>();

const rendererKey = ref(0); // Used to force re-render of CompactMessageRenderer if needed

// This computed property decides if a minimal action bar should be shown here,
// separate from actions within CompactMessageRenderer.
const shouldShowMinimalActionBar = computed(() => {
  return props.hasCurrentWork && !props.activeSession && !props.isLoading;
});


watch(() => props.mainContent, () => {
    // When main content changes significantly (e.g., new query response vs welcome message),
    // we can increment the key to ensure CompactMessageRenderer re-initializes properly if necessary.
    // This is useful if CompactMessageRenderer has internal state that needs resetting.
    rendererKey.value++;
}, { deep: false });


const handleContentRendered = () => {
    // console.log('[CodingWorkspaceDisplay] CompactMessageRenderer finished rendering.');
    // Potential future use: scroll to a specific part, focus, etc.
};

const handleRendererInteraction = (payload: { type: string; data?: any }) => {
    // console.log('[CodingWorkspaceDisplay] Interaction from CompactMessageRenderer:', payload);
    if (payload.type === 'toast') {
        // If toast service is injected or globally available, show toast
        // Example: toast?.add(payload.data)
    } else if (payload.type === 'copy-all-code' || payload.type.startsWith('export-')) {
        // These actions are handled by the renderer, just logging here for now
    }
    // Relay other specific interactions if needed by emitting them
    // emit('code-action', payload.type, payload.data);
};

</script>

<style lang="scss" scoped>
@use '@/styles/abstracts/variables' as var;
@use '@/styles/abstracts/mixins' as mixins;

.coding-workspace-panel {
  @apply flex-grow relative min-h-0 flex flex-col overflow-hidden;
  background-color: hsl(var(--coding-bg-h), var(--coding-bg-s), var(--coding-bg-l));
}

.main-display-area {
  @apply flex-grow overflow-y-auto h-full; // Ensure it takes full height to allow internal scrolling
   @include mixins.custom-scrollbar-for-themed-panel('--coding');
  &.streaming-content {
    // Subtle indication that content is live/updating.
    // CompactMessageRenderer might have its own internal streaming indicators.
    // border: 1px solid hsla(var(--coding-accent-h), var(--coding-accent-s), var(--coding-accent-l), 0.1);
  }
}

.loading-overlay-futuristic {
  @apply absolute inset-0 flex-grow flex flex-col items-center justify-center p-8 z-10;
  background-color: hsla(var(--coding-bg-h), var(--coding-bg-s), calc(var(--coding-bg-l) + 2%), 0.8);
  backdrop-filter: blur(3px);
  .spinner-futuristic.large { /* Ensure these classes are defined */
    @apply w-16 h-16 border-[5px];
     border-color: hsla(var(--coding-accent-h), var(--coding-accent-s), var(--coding-accent-l), 0.2);
     border-top-color: hsl(var(--coding-accent-h), var(--coding-accent-s), var(--coding-accent-l));
     animation: spin 1s linear infinite; // Ensure spin animation is defined
  }
  .loading-text-futuristic {
    @apply text-base mt-4;
    color: var(--color-text-secondary);
  }
}
@keyframes spin { to { transform: rotate(360deg); } }


.welcome-workspace {
  @apply flex-grow flex items-center justify-center p-6 text-center;
  .welcome-content { @apply max-w-lg; }
  .welcome-icon-wrapper {
    @apply p-4 rounded-full mb-5 mx-auto w-fit shadow-lg;
    background: radial-gradient(circle, hsla(var(--coding-accent-h), var(--coding-accent-s), var(--coding-accent-l), 0.12) 0%, transparent 60%);
  }
  .welcome-icon {
    @apply w-16 h-16 mx-auto;
    color: hsl(var(--coding-accent-h), var(--coding-accent-s), var(--coding-accent-l));
    filter: drop-shadow(0 0 12px hsla(var(--coding-accent-h), var(--coding-accent-s), var(--coding-accent-l), 0.6));
  }
  .welcome-title { @apply text-2xl font-bold mb-2; color: var(--color-text-primary); }
  .welcome-subtitle { @apply text-base mb-3 opacity-90; color: var(--color-text-secondary); }
  .welcome-prompt { @apply text-sm italic; color: var(--color-text-muted); }
}

.workspace-action-bar {
  @apply absolute bottom-3 right-3 md:bottom-4 md:right-4 z-20 flex items-center gap-2 p-1.5 rounded-lg shadow-xl;
  background-color: hsla(var(--coding-bg-h), var(--coding-bg-s), calc(var(--coding-bg-l) + 12%), 0.92);
  backdrop-filter: blur(6px);
  border: 1px solid hsla(var(--coding-accent-h), var(--coding-accent-s), var(--coding-accent-l), 0.2);
}

/* Minimal Futuristic Button Styles (if not globally available or for overrides) */
.btn-futuristic-primary {
  @apply px-3 py-1.5 rounded-md font-medium transition-all duration-200 ease-out flex items-center;
  background: linear-gradient(135deg,
    hsl(var(--coding-accent-h), var(--coding-accent-s), var(--coding-accent-l)),
    hsl(var(--coding-accent-h), var(--coding-accent-s), calc(var(--coding-accent-l) - 10%))
  );
  color: var(--color-text-on-accent, white);
  border: 1px solid hsla(var(--coding-accent-h), var(--coding-accent-s), calc(var(--coding-accent-l) - 15%), 0.4);
  box-shadow: 0 2px 6px hsla(var(--coding-accent-h), var(--coding-accent-s), var(--coding-accent-l), 0.2);
  &:hover:not(:disabled) {
    background: linear-gradient(135deg,
      hsl(var(--coding-accent-h), var(--coding-accent-s), calc(var(--coding-accent-l) + 5%)),
      hsl(var(--coding-accent-h), var(--coding-accent-s), calc(var(--coding-accent-l) - 5%))
    );
    transform: translateY(-1px);
    box-shadow: 0 4px 10px hsla(var(--coding-accent-h), var(--coding-accent-s), var(--coding-accent-l), 0.25);
  }
  &:disabled { @apply opacity-60 cursor-not-allowed; }
}
.btn-sm { @apply py-1.5 px-2.5 text-xs; }
.btn-icon-sm { @apply w-4 h-4 mr-1.5; }

/* Ephemeral prompt tags copied from ChatWindow for consistency in welcome state */
.example-prompts-grid-ephemeral {
  @apply grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3;
  max-width: 480px;
  margin-left: auto;
  margin-right: auto;
}
.prompt-tag-ephemeral {
  @apply w-full text-xs text-left font-medium p-2.5 rounded-lg border transition-all duration-150 ease-out;
  background-color: hsla(var(--coding-bg-h), var(--coding-bg-s), calc(var(--coding-bg-l) + 5%), 0.7);
  color: var(--color-text-secondary);
  border-color: hsla(var(--coding-accent-h), var(--coding-accent-s), var(--coding-accent-l), 0.2);
  box-shadow: 0 1px 2px hsla(var(--coding-bg-h), var(--coding-bg-s), var(--coding-bg-l), 0.1);
  &:hover {
    background-color: hsla(var(--coding-accent-h), var(--coding-accent-s), var(--coding-accent-l), 0.1);
    color: hsl(var(--coding-accent-h), var(--coding-accent-s), calc(var(--coding-accent-l) + 10%));
    border-color: hsla(var(--coding-accent-h), var(--coding-accent-s), var(--coding-accent-l), 0.4);
    transform: translateY(-1px);
    box-shadow: 0 2px 6px hsla(var(--coding-accent-h), var(--coding-accent-s), var(--coding-accent-l), 0.1);
  }
}

</style>