<script setup lang="ts">
import { onMounted, onUnmounted, watch, nextTick, PropType, toRef, type Ref } from 'vue'; // Added onUnmounted, toRef, Ref
import { useAgentStore } from '@/store/agent.store';
import { useChatStore } from '@/store/chat.store'; // Removed unused MainContent type
import type { IAgentDefinition } from '@/services/agent.service';

import CompactMessageRenderer from '@/components/layouts/CompactMessageRenderer/CompactMessageRenderer.vue';
import { CodeBracketSquareIcon, LightBulbIcon, ChevronLeftIcon, ChevronRightIcon, ArrowPathIcon as RefreshIcon, ChatBubbleLeftRightIcon } from '@heroicons/vue/24/outline';
import { useSystemsDesignAgent } from './useSystemsDesign'; // Adjusted path
import { marked } from 'marked';

declare var mermaid: any;

const props = defineProps<{
  agentId: IAgentDefinition['id'];
  agentConfig: IAgentDefinition;
}>();

const emit = defineEmits<{
  (e: 'agent-event', event: { type: 'view_mounted' | string; agentId: string; label?: string }): void;
}>();

const agentStore = useAgentStore();
const chatStore = useChatStore();

// Pass props.agentConfig as a Ref to the composable
const agentConfigAsRef = toRef(props, 'agentConfig');

import type { ToastService } from '@/services/services';
import {
  inject,
} from 'vue';
const toast = inject<ToastService>('toast');

const {
  isLoadingResponse,
  // currentDiagramMermaidCode, // Not directly used in template; isDiagramExplainable covers its check
  nfrInputText,
  isDiagramExplainable,
  agentDisplayName,
  mainContentToDisplay,
  canShowPreviousDiagram,
  canShowNextDiagram,
  diagramHistory, // Destructured for template v-if check
  currentHistoryDiagramIndex, // Destructured for template display logic

  initialize,
  cleanup, // Make sure cleanup is called
  handleNewUserInput,
  explainCurrentDiagram,
  showPreviousDiagram,
  showNextDiagram,
  showLatestDiagram,
  updateNfrInput,
} = useSystemsDesignAgent(agentConfigAsRef, toast);

onMounted(async () => {
  await initialize(props.agentConfig); // Pass the raw prop value
  emit('agent-event', { type: 'view_mounted', agentId: props.agentId, label: agentDisplayName.value });
});

onUnmounted(() => {
    cleanup(); // Call cleanup when component is unmounted
});

watch(mainContentToDisplay, (newContent) => {
  if (newContent?.data && (newContent.type === 'markdown' || newContent.type === 'compact-message-renderer-data')) {
    nextTick(() => {
      const displayArea = document.getElementById(`${props.agentId}-main-display`);
      if (displayArea && typeof mermaid !== 'undefined' && (newContent.data as string).includes('```mermaid')) {
        try {
          const mermaidElements = displayArea.querySelectorAll('.mermaid');
          const nodesToRun: Element[] = [];
          mermaidElements.forEach(el => {
            // Check if it was already processed by a previous run of this watcher for this specific diagram
            // This check needs to be robust if content updates rapidly or mermaid.run is slow
            if (!(el as HTMLElement).dataset.mermaidProcessedForContent || (el as HTMLElement).dataset.mermaidProcessedForContent !== newContent.timestamp.toString()) {
                if(!el.id) el.id = `mermaid-runtime-${props.agentId}-${Math.random().toString(36).substring(2,9)}`;
                (el as HTMLElement).dataset.mermaidProcessedForContent = newContent.timestamp.toString(); // Mark with content timestamp
                nodesToRun.push(el);
            }
          });
          if (nodesToRun.length > 0) {
            mermaid.run({ nodes: nodesToRun });
          }
        } catch (e) {
          console.error("Mermaid rendering error in SystemsDesignAgentView watcher:", e);
           document.querySelectorAll(`#${props.agentId}-main-display .mermaid:not([data-mermaid-processed-for-content])`).forEach(el => {
             if (el.innerHTML.includes("Error rendering diagram")) return; // Avoid multiple error messages
             el.innerHTML = "<p style='color:red; text-align:center;'>Error rendering diagram.</p>";
           });
        }
      }
    });
  }
}, { deep: true, immediate: true });

// Watch for changes in agentConfig if the component might be reused for different agents
watch(() => props.agentConfig, (newConfig, oldConfig) => {
    if (newConfig && newConfig.id !== oldConfig?.id) {
        initialize(newConfig);
    }
}, { deep: true });

defineExpose({ handleNewUserInput });

</script>

<template>
  <div class="system-designer-view architectron-view flex flex-col h-full w-full overflow-hidden">
    <div class="agent-header-controls architectron-header p-2 px-3 border-b flex items-center justify-between gap-2 text-sm">
      <div class="flex items-center gap-2">
        <CodeBracketSquareIcon class="w-6 h-6 shrink-0 architectron-icon" :class="props.agentConfig.iconClass" />
        <span class="font-semibold text-lg architectron-title">{{ agentDisplayName }}</span>
      </div>
      <div class="flex items-center gap-1.5">
        <button
          v-if="isDiagramExplainable"
          @click="explainCurrentDiagram"
          class="btn-futuristic-toggle btn-xs"
          title="Explain current diagram">
          <ChatBubbleLeftRightIcon class="w-4 h-4 mr-1"/> Explain Diagram
        </button>
      </div>
    </div>

    <div class="architectron-main-area flex-grow flex flex-col md:flex-row overflow-hidden">
      <div class="flex-grow relative min-h-0 architectron-scrollbar overflow-y-auto md:w-2/3 lg:w-3/4" :id="`${props.agentId}-main-display`">
        <div v-if="isLoadingResponse && !chatStore.isMainContentStreaming && !(mainContentToDisplay && mainContentToDisplay.data)" class="loading-overlay-designer architectron-loading-overlay">
          <div class="architectron-spinner-container"><div class="architectron-spinner"></div></div>
          <p class="mt-2 text-sm architectron-loading-text">Architectron is crafting the design...</p>
        </div>

        <template v-if="mainContentToDisplay?.data">
          <CompactMessageRenderer
            v-if="props.agentConfig.capabilities?.usesCompactRenderer &&
                  (mainContentToDisplay.type === 'compact-message-renderer-data' ||
                   mainContentToDisplay.type === 'loading' ||
                   (mainContentToDisplay.type === 'markdown' && !chatStore.isMainContentStreaming))"
            :content="chatStore.isMainContentStreaming && agentStore.activeAgentId === props.agentId
                        ? chatStore.streamingMainContentText
                        : mainContentToDisplay.data as string"
            :mode="props.agentConfig.id"
            class="p-1 h-full architectron-compact-renderer"
          />
          <div v-else-if="mainContentToDisplay.type === 'markdown' || mainContentToDisplay.type === 'welcome' || mainContentToDisplay.type === 'loading'"
               class="prose prose-sm sm:prose-base dark:prose-invert max-w-none p-4 md:p-6 h-full architectron-prose-content"
               :class="{'flex flex-col items-center justify-center text-center': mainContentToDisplay.type === 'welcome' && mainContentToDisplay.data && !mainContentToDisplay.data.includes('###')}"
               v-html="chatStore.isMainContentStreaming && agentStore.activeAgentId === props.agentId
                        ? marked.parse(chatStore.streamingMainContentText + '▋')
                        : marked.parse(mainContentToDisplay.data as string)"
          >
          </div>
          <div v-else class="p-4 text-slate-400 dark:text-slate-500 italic h-full flex items-center justify-center architectron-placeholder">
            {{ agentDisplayName }} is ready. (Content Type: {{ mainContentToDisplay.type }})
          </div>
        </template>
        <div v-else-if="!isLoadingResponse" class="flex-grow flex flex-col items-center justify-center h-full p-4 text-center architectron-empty-state">
          <LightBulbIcon class="w-12 h-12 mx-auto mb-3 text-[var(--agent-architectron-accent-color-muted)] opacity-60"/>
          <p class="text-slate-400 dark:text-slate-500">{{ props.agentConfig.inputPlaceholder || 'Describe the system you want to design.' }}</p>
        </div>
      </div>

      <div class="architectron-sidebar md:w-1/3 lg:w-1/4 p-3 border-t md:border-t-0 md:border-l architectron-scrollbar overflow-y-auto bg-[var(--color-bg-secondary-dark,theme('colors.slate.800'))]">
        <div class="nfr-section mb-4">
          <h3 class="text-sm font-semibold mb-1.5 text-[var(--agent-architectron-accent-color)]">Non-Functional Requirements</h3>
          <textarea
            :value="nfrInputText"
            @input="updateNfrInput(($event.target as HTMLTextAreaElement).value)"
            rows="4"
            placeholder="e.g., High scalability, sub-200ms latency, HIPAA compliant, cost-effective..."
            class="w-full p-2 text-xs rounded-md border bg-[var(--color-bg-tertiary-dark,theme('colors.slate.700'))] border-[var(--color-border-input-dark,theme('colors.slate.600'))] focus:border-[var(--agent-architectron-accent-color)] focus:ring-1 focus:ring-[var(--agent-architectron-accent-color)] placeholder:text-slate-500"
          ></textarea>
        </div>

        <div class="diagram-history-section">
          <h3 class="text-sm font-semibold mb-1.5 text-[var(--agent-architectron-accent-color)]">Diagram History</h3>
          <div v-if="diagramHistory.length > 0 || currentHistoryDiagramIndex !== -1" class="flex items-center justify-between gap-2">
            <button @click="showPreviousDiagram" :disabled="!canShowPreviousDiagram"
                    class="btn-futuristic-outline btn-xs p-1.5" title="Previous Diagram Version">
              <ChevronLeftIcon class="w-4 h-4"/>
            </button>
            <span class="text-xs text-slate-400">
              {{ currentHistoryDiagramIndex === -1 ? 'Latest' : `Version ${diagramHistory.length - currentHistoryDiagramIndex}` }} / {{ diagramHistory.length > 0 ? diagramHistory.length : 'Live' }}
            </span>
            <button @click="showNextDiagram" :disabled="!canShowNextDiagram"
                    class="btn-futuristic-outline btn-xs p-1.5" title="Next Diagram Version (in history)">
              <ChevronRightIcon class="w-4 h-4"/>
            </button>
            <button v-if="currentHistoryDiagramIndex !== -1" @click="showLatestDiagram"
                    class="btn-futuristic-outline btn-xs p-1.5" title="Show Latest Diagram">
              <RefreshIcon class="w-4 h-4"/> </button>
          </div>
          <p v-else class="text-xs text-slate-500 italic">No diagram history recorded for this session.</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="postcss">
/* Styles from previous response... (ensure they are consistent) */
.architectron-view {
  --agent-architectron-accent-hue: var(--accent-hue-indigo, 240);
  --agent-architectron-accent-saturation: 60%;
  --agent-architectron-accent-lightness: 65%;
  --agent-architectron-accent-color: hsl(var(--agent-architectron-accent-hue), var(--agent-architectron-accent-saturation), var(--agent-architectron-accent-lightness));
  --agent-architectron-accent-color-muted: hsla(var(--agent-architectron-accent-hue), var(--agent-architectron-accent-saturation), var(--agent-architectron-accent-lightness), 0.7);
  --agent-architectron-accent-color-darker: hsl(var(--agent-architectron-accent-hue), var(--agent-architectron-accent-saturation), calc(var(--agent-architectron-accent-lightness) - 15%));

  --bg-agent-view-dark-hsl-values: var(--color-bg-primary-h, 220), var(--color-bg-primary-s, 20%), var(--color-bg-primary-l, 10%);
  --bg-header-dark-hsl-values: var(--color-bg-secondary-h, 220), var(--color-bg-secondary-s, 20%), var(--color-bg-secondary-l, 12%);
  --bg-sidebar-dark-hsl-values: var(--color-bg-secondary-h, 220), var(--color-bg-secondary-s, 18%), var(--color-bg-secondary-l, 14%);
  --bg-tertiary-dark-hsl-values: var(--color-bg-tertiary-h, 220), var(--color-bg-tertiary-s, 15%), var(--color-bg-tertiary-l, 18%);
  --border-input-dark-hsl-values: var(--color-border-primary-h, 220), var(--color-border-primary-s, 15%), var(--color-border-primary-l, 25%);

  background-color: hsl(var(--bg-agent-view-dark-hsl-values));
  color: var(--color-text-primary-on-dark, hsl(210, 15%, 90%));

  position: relative;
   &::before {
    content: '';
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(hsla(var(--agent-architectron-accent-hue), 50%, 30%, 0.05) 0.5px, transparent 0.5px),
      linear-gradient(90deg, hsla(var(--agent-architectron-accent-hue), 50%, 30%, 0.05) 0.5px, transparent 0.5px);
    background-size: 18px 18px;
    opacity: 0.7;
    pointer-events: none;
    z-index: 0;
  }
  > * { position: relative; z-index: 1; }
}

.architectron-header {
  border-bottom-color: hsla(var(--agent-architectron-accent-hue), var(--agent-architectron-accent-saturation), var(--agent-architectron-accent-lightness), 0.3);
  background-color: hsl(var(--bg-header-dark-hsl-values));
}

.architectron-icon {
  color: var(--agent-architectron-accent-color);
  filter: drop-shadow(0 0 5px hsla(var(--agent-architectron-accent-hue), var(--agent-architectron-accent-saturation), var(--agent-architectron-accent-lightness), 0.5));
}
.architectron-title {
  color: var(--color-text-primary-on-dark, hsl(210, 20%, 95%));
}

.architectron-sidebar {
  background-color: hsl(var(--bg-sidebar-dark-hsl-values));
  border-color: hsla(var(--agent-architectron-accent-hue), var(--agent-architectron-accent-saturation), var(--agent-architectron-accent-lightness), 0.15);
}

.architectron-sidebar textarea {
  background-color: hsl(var(--bg-tertiary-dark-hsl-values));
  border-color: hsl(var(--border-input-dark-hsl-values));
  color: var(--color-text-secondary-on-dark, hsl(210, 15%, 80%));
  &::placeholder {
    color: hsla(var(--color-text-muted-h, 210), var(--color-text-muted-s, 10%), var(--color-text-muted-l, 55%), 0.7);
  }
  &:focus {
    border-color: var(--agent-architectron-accent-color);
    box-shadow: 0 0 0 1px var(--agent-architectron-accent-color);
  }
}

.btn-futuristic-toggle, .btn-futuristic-outline {
  @apply border rounded-md px-2 py-1 text-xs transition-colors duration-150 flex items-center justify-center;
  border-color: hsla(var(--agent-architectron-accent-hue), var(--agent-architectron-accent-saturation), var(--agent-architectron-accent-lightness), 0.5);
  color: hsla(var(--agent-architectron-accent-hue), var(--agent-architectron-accent-saturation), calc(var(--agent-architectron-accent-lightness) + 10%), 0.9);
  background-color: hsla(var(--agent-architectron-accent-hue), var(--agent-architectron-accent-saturation), var(--agent-architectron-accent-lightness), 0.1);

  &:hover:not(:disabled) {
    border-color: var(--agent-architectron-accent-color);
    background-color: hsla(var(--agent-architectron-accent-hue), var(--agent-architectron-accent-saturation), var(--agent-architectron-accent-lightness), 0.2);
    color: var(--agent-architectron-accent-color);
  }
  &:disabled {
    @apply opacity-40 cursor-not-allowed;
  }
}

.loading-overlay-designer {
  @apply absolute inset-0 flex flex-col items-center justify-center z-10;
  background-color: hsla(var(--bg-agent-view-dark-hsl-values), 0.7);
  backdrop-filter: blur(2.5px);
}
.architectron-spinner-container { @apply relative w-10 h-10; }
.architectron-spinner {
  @apply w-full h-full border-4 rounded-full animate-spin;
  border-color: hsla(var(--agent-architectron-accent-hue), var(--agent-architectron-accent-saturation), var(--agent-architectron-accent-lightness), 0.25);
  border-top-color: var(--agent-architectron-accent-color);
}
.architectron-loading-text {
  color: var(--agent-architectron-accent-color-muted);
  font-weight: 500;
}

.architectron-scrollbar {
  &::-webkit-scrollbar { width: 6px; height: 6px; }
  &::-webkit-scrollbar-track {
    background-color: hsla(var(--agent-architectron-accent-hue), 20%, 20%, 0.1);
    border-radius: 3px;
  }
  &::-webkit-scrollbar-thumb {
    background-color: hsla(var(--agent-architectron-accent-hue), var(--agent-architectron-accent-saturation), var(--agent-architectron-accent-lightness), 0.4);
    border-radius: 3px;
    &:hover {
      background-color: hsla(var(--agent-architectron-accent-hue), var(--agent-architectron-accent-saturation), var(--agent-architectron-accent-lightness), 0.6);
    }
  }
  scrollbar-width: thin;
  scrollbar-color: hsla(var(--agent-architectron-accent-hue), var(--agent-architectron-accent-saturation), var(--agent-architectron-accent-lightness), 0.4) hsla(var(--agent-architectron-accent-hue), 20%, 20%, 0.1);
}

.architectron-prose-content, .architectron-compact-renderer :deep(.prose) {
  :deep(h1), :deep(h2), :deep(h3), :deep(h4) {
    border-bottom-color: hsla(var(--agent-architectron-accent-hue), var(--agent-architectron-accent-saturation), var(--agent-architectron-accent-lightness), 0.3);
    color: hsl(var(--agent-architectron-accent-hue), var(--agent-architectron-accent-saturation), calc(var(--agent-architectron-accent-lightness) + 15%));
  }
  :deep(p), :deep(li) { color: var(--color-text-secondary-on-dark, hsl(210, 12%, 75%)); }
  :deep(a) { color: var(--agent-architectron-accent-color); }
  :deep(strong) { color: hsl(var(--agent-architectron-accent-hue), var(--agent-architectron-accent-saturation), calc(var(--agent-architectron-accent-lightness) + 10%)); }
  :deep(code:not(pre code)) {
    background-color: hsla(var(--agent-architectron-accent-hue), 25%, 20%, 0.3);
    color: hsl(var(--agent-architectron-accent-hue), 40%, calc(var(--agent-architectron-accent-lightness) + 10%));
    border-color: hsla(var(--agent-architectron-accent-hue), 25%, 25%, 0.4);
  }
  :deep(pre) {
    background-color: hsla(var(--color-bg-code-block-h, 220), var(--color-bg-code-block-s, 15%), var(--color-bg-code-block-l, 8%), 0.9);
    border-color: hsla(var(--agent-architectron-accent-hue), var(--agent-architectron-accent-saturation), var(--agent-architectron-accent-lightness), 0.2);
  }
  :deep(div.mermaid) {
    svg {
      /* Example: attempt to force text color in mermaid */
      text { fill: var(--color-text-primary-on-dark, hsl(210, 15%, 90%)) !important; }
      /* More specific selectors may be needed depending on mermaid version and theme */
      .edgeLabel, .label, .actor { fill: var(--color-text-primary-on-dark, hsl(210, 15%, 90%)) !important; }
      path, line, rect, circle, ellipse, polygon {
        stroke: var(--agent-architectron-accent-color-muted) !important;
      }
      .node rect, .node circle, .node ellipse {
         fill: hsl(var(--bg-tertiary-dark-hsl-values), 0.7) !important; /* Slightly transparent node fill */
         stroke: var(--agent-architectron-accent-color) !important;
      }
    }
  }
}

.architectron-welcome-container {} /* Retain for structure */
.architectron-icon-glow {}
@keyframes subtlePulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: var(--opacity-pulse, 0.9); transform: scale(var(--scale-pulse, 1.04)); } }
</style>