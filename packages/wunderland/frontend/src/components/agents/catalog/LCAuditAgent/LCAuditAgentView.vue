<script setup lang="ts">
import { ref, computed, inject, watch, onMounted, onUnmounted, nextTick, PropType, toRef } from 'vue';
import { useAgentStore } from '@/store/agent.store'; // Keep if used in template via agentStore.activeAgentId
import { useChatStore } from '@/store/chat.store';
import type { IAgentDefinition, AgentId } from '@/services/agent.service';
// import { voiceSettingsManager } from '@/services/voice.settings.service'; // Not directly used in this view
// import { chatAPI, type ChatMessagePayloadFE, type TextResponseDataFE, promptAPI } from '@/utils/api'; // API calls are in composable
import type { ToastService } from '@/services/services';
import CompactMessageRenderer from '@/components/layouts/CompactMessageRenderer/CompactMessageRenderer.vue';
// Corrected import path for CompactMessageRendererPublicMethods
import type { CompactMessageRendererPublicMethods } from '@/components/layouts/CompactMessageRenderer/CompactMessageRendererTypes';
import { DocumentMagnifyingGlassIcon, PlayIcon as PlaySolidIcon, PauseIcon as PauseSolidIcon, ArrowPathIcon, InformationCircleIcon } from '@heroicons/vue/24/solid';
import { marked } from 'marked';
// Corrected import path for composable
import { useLCAuditAgent } from './useLCAuditAgent';

const props = defineProps({
  agentId: { type: String as PropType<AgentId>, required: true },
  agentConfig: { type: Object as PropType<IAgentDefinition>, required: true }
});

const emit = defineEmits<{
  (e: 'agent-event', event: { type: 'view_mounted', agentId: string, label?: string }): void;
}>();

const agentStore = useAgentStore(); // Used for agentStore.activeAgentId in template conditions
const chatStore = useChatStore();
const toast = inject<ToastService>('toast'); // Correctly inject toast

const agentConfigAsRef = toRef(props, 'agentConfig');

const {
  isLoadingResponse,
  // currentSystemPrompt, // Internal to composable
  currentSlideshowFullMarkdown,
  currentProblemTitleForDisplay,
  // slideDurationsMs, // Internal
  currentAppSlideIndex,
  totalAppSlidesCount,
  // autoplayTimerId, // Internal
  isAutoplayGloballyActive,
  isCurrentSlidePlaying,
  compactMessageRendererRef, // This is the ref from composable to be assigned

  agentDisplayName,
  contentDisplayAreaId,

  initialize,
  cleanup,
  processProblemContext,
  toggleMasterAutoplay,
  handleSlideChangedInRenderer,
} = useLCAuditAgent(agentConfigAsRef, toast);

const localCompactMessageRendererRef = ref<InstanceType<typeof CompactMessageRenderer> | null>(null);

watch(localCompactMessageRendererRef, (newVal) => {
    if (newVal) {
        // Assign the local ref instance to the composable's ref
        // Type assertion needed if defineExpose wasn't generic enough or if methods differ slightly
        compactMessageRendererRef.value = newVal as unknown as CompactMessageRendererPublicMethods;
    }
});

const renderMarkdownForWelcomeOrError = (content: string | null): string => {
  if (content === null || content === undefined) return '<p class="text-muted italic p-6">No content available.</p>';
  try {
    return marked.parse(content, { breaks: true, gfm: true });
  } catch (e) {
    console.error("Markdown rendering error:", e);
    return `<p class="text-error-default p-6">Content rendering error.</p>`;
  }
};

onMounted(async () => {
  // Initialize now receives the direct prop, not a ref to it from store.
  await initialize(props.agentConfig);
  emit('agent-event', { type: 'view_mounted', agentId: props.agentId, label: agentDisplayName.value });
});

onUnmounted(() => {
  cleanup();
});

const mainContentForView = computed(() => chatStore.getMainContentForAgent(props.agentId));

// Watch agentConfig prop for changes if the component instance might be reused
watch(() => props.agentConfig, (newConfig, oldConfig) => {
    if (newConfig && oldConfig && newConfig.id !== oldConfig.id) {
        initialize(newConfig);
    }
}, {deep: true});

defineExpose({ processProblemContext });

</script>

<template>
  <div class="lc-audit-agent-view">
    <div class="lc-audit-header">
      <div class="header-title-group">
        <DocumentMagnifyingGlassIcon class="header-icon" />
        <span class="header-title" :title="agentDisplayName">{{ agentDisplayName }}</span>
        <span v-if="currentProblemTitleForDisplay && !currentProblemTitleForDisplay.includes('Awaiting Problem') && !currentProblemTitleForDisplay.toLowerCase().includes('problem analysis') && !currentProblemTitleForDisplay.toLowerCase().includes('analyzing')"
              class="header-subtitle truncate" :title="currentProblemTitleForDisplay.replace(`${agentDisplayName}: `, '').replace('Analysis', '').trim()">
          | {{ currentProblemTitleForDisplay.replace(`${agentDisplayName}: `, '').replace('Analysis', '').trim() }}
        </span>
      </div>
      <div class="header-actions" v-if="totalAppSlidesCount > 0 && currentSlideshowFullMarkdown">
        <button @click="toggleMasterAutoplay"
          class="btn-futuristic-toggle btn-sm"
          :disabled="totalAppSlidesCount === 0 || (currentAppSlideIndex >= totalAppSlidesCount - 1 && !isAutoplayGloballyActive)"
          :title="isAutoplayGloballyActive && isCurrentSlidePlaying ? 'Pause Autoplay' : (currentAppSlideIndex >= totalAppSlidesCount - 1 && totalAppSlidesCount > 0 ? 'Slideshow Ended (Click to Replay)' : 'Start/Resume Autoplay')">
          <PauseSolidIcon v-if="isAutoplayGloballyActive && isCurrentSlidePlaying" class="btn-icon"/>
          <PlaySolidIcon v-else-if="!(currentAppSlideIndex >= totalAppSlidesCount - 1 && totalAppSlidesCount > 0)" class="btn-icon"/>
          <ArrowPathIcon v-else class="btn-icon"/> <span class="ml-1.5">{{ isAutoplayGloballyActive && isCurrentSlidePlaying ? 'Pause' : (currentAppSlideIndex >= totalAppSlidesCount - 1 && totalAppSlidesCount > 0 ? 'Replay' : 'Play') }}</span>
        </button>
      </div>
    </div>

    <div :id="contentDisplayAreaId" class="lc-audit-main-content-area">
      <div v-if="isLoadingResponse && !currentSlideshowFullMarkdown && mainContentForView?.type === 'loading'"
           class="loading-overlay-futuristic">
        <div class="spinner-futuristic large"></div>
        <p class="loading-text-futuristic">{{ agentDisplayName }} is Initializing Analysis...</p>
      </div>

      <template v-if="currentSlideshowFullMarkdown && mainContentForView?.type === 'compact-message-renderer-data'">
        <CompactMessageRenderer
          ref="localCompactMessageRendererRef"
          :content="currentSlideshowFullMarkdown"
          :mode="props.agentConfig?.id || 'lc-audit'"
          :initial-slide-index="0"
          :disable-internal-autoplay="true"
          @slide-changed="handleSlideChangedInRenderer"
          class="lc-audit-compact-renderer"
        />
      </template>
      <template v-else-if="mainContentForView?.data && (mainContentForView.type === 'welcome' || mainContentForView.type === 'error' || mainContentForView.type === 'markdown')">
        <div
          class="prose-futuristic lc-audit-prose-content"
          v-html="renderMarkdownForWelcomeOrError(mainContentForView.data as string)">
        </div>
      </template>
      <div v-else-if="!isLoadingResponse && !currentSlideshowFullMarkdown && !mainContentForView?.data"
           class="lc-audit-empty-state">
           <InformationCircleIcon class="empty-state-icon"/>
        {{ agentDisplayName }} is ready. Please provide a problem context via voice or text input.
      </div>

      <div v-if="isLoadingResponse && currentSlideshowFullMarkdown"
           class="loading-overlay-futuristic is-processing-update">
        <div class="spinner-futuristic"></div>
        <p class="loading-text-futuristic">{{ agentDisplayName }} is updating analysis...</p>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/abstracts/variables' as var;
@use '@/styles/abstracts/mixins' as mixins;

/* Styles from previous response should be here */
.lc-audit-agent-view {
  --lc-accent-h: var(--color-accent-interactive-h, #{var.$default-color-accent-interactive-h});
  --lc-accent-s: var(--color-accent-interactive-s, #{var.$default-color-accent-interactive-s});
  --lc-accent-l: var(--color-accent-interactive-l, #{var.$default-color-accent-interactive-l});
  --lc-bg-h: var(--color-bg-primary-h, #{var.$default-color-bg-primary-h});
  --lc-bg-s: var(--color-bg-primary-s, #{var.$default-color-bg-primary-s});
  --lc-bg-l: calc(var(--color-bg-primary-l, #{var.$default-color-bg-primary-l}) - 4%);

 @apply flex flex-col h-full w-full overflow-hidden;
  background-color: hsl(var(--lc-bg-h), var(--lc-bg-s), var(--lc-bg-l));
  background-image:
    linear-gradient(hsla(var(--lc-accent-h), var(--lc-accent-s), var(--lc-accent-l), 0.05) 1px, transparent 1px),
    linear-gradient(90deg, hsla(var(--lc-accent-h), var(--lc-accent-s), var(--lc-accent-l), 0.05) 1px, transparent 1px);
  background-size: 35px 35px;
  border: 1px solid hsla(var(--lc-accent-h), var(--lc-accent-s), var(--lc-accent-l), 0.15);
  box-shadow: inset 0 0 50px hsla(var(--lc-bg-h), var(--lc-bg-s), calc(var(--lc-bg-l) - 10%), 0.6);
}

.lc-audit-header {
 @apply p-3 px-4 border-b flex items-center justify-between gap-3 text-sm shadow-md backdrop-blur-sm;
  background-color: hsla(var(--lc-bg-h), var(--lc-bg-s), calc(var(--lc-bg-l) + 2%), 0.8);
  border-bottom-color: hsla(var(--lc-accent-h), var(--lc-accent-s), var(--lc-accent-l), 0.25);

  .header-title-group { @apply flex items-center gap-2.5 min-w-0 flex-shrink; }
  .header-icon {
   @apply w-7 h-7 shrink-0;
    color: hsl(var(--lc-accent-h), var(--lc-accent-s), var(--lc-accent-l));
    filter: drop-shadow(0 0 7px hsla(var(--lc-accent-h), var(--lc-accent-s), var(--lc-accent-l), 0.7));
  }
  .header-title {
   @apply font-semibold text-lg tracking-wide truncate;
    color: var(--color-text-primary);
    text-shadow: 0 0 6px hsla(var(--lc-accent-h), var(--lc-accent-s), var(--lc-accent-l), 0.2);
  }
  .header-subtitle {
   @apply text-sm ml-2 hidden md:inline truncate;
    color: var(--color-text-muted);
  }
  .header-actions { @apply flex items-center gap-2 flex-shrink-0; }
}

.lc-audit-main-content-area {
  @apply flex-grow relative min-h-0 overflow-y-auto;
   @include mixins.custom-scrollbar(
    $thumb-color-var-prefix: '--lc-accent',
    $thumb-base-alpha: 0.55,
    $thumb-hover-alpha: 0.75,
    $track-color-var-prefix: '--lc-bg',
    $track_alpha: 0.2,
    $fb-thumb-h: var.$default-color-accent-interactive-h,
    $fb-thumb-s: var.$default-color-accent-interactive-s,
    $fb-thumb-l: var.$default-color-accent-interactive-l,
    $fb-track-h: var.$default-color-bg-primary-h,
    $fb-track-s: var.$default-color-bg-primary-s,
    $fb-track-l: calc(#{var.$default-color-bg-primary-l} - 4%)
  );
}


.loading-overlay-futuristic {
 @apply absolute inset-0 flex flex-col items-center justify-center z-20;
  background-color: hsla(var(--lc-bg-h), var(--lc-bg-s), var(--lc-bg-l), 0.75);
  backdrop-filter: blur(4px);
  &.is-processing-update {
    background-color: hsla(var(--lc-bg-h), var(--lc-bg-s), calc(var(--lc-bg-l) + 5%), 0.6);
  }
}
.spinner-futuristic {
 @apply w-10 h-10 border-4 rounded-full animate-spin;
  border-color: hsla(var(--lc-accent-h), var(--lc-accent-s), var(--lc-accent-l), 0.2);
  border-top-color: hsl(var(--lc-accent-h), var(--lc-accent-s), var(--lc-accent-l));
  box-shadow: 0 0 12px hsla(var(--lc-accent-h), var(--lc-accent-s), var(--lc-accent-l), 0.3);
  &.large { @apply w-12 h-12 border-[5px]; }
}
.loading-text-futuristic {
 @apply mt-3 text-sm font-medium tracking-wide;
  color: hsl(var(--lc-accent-h), var(--lc-accent-s), calc(var(--lc-accent-l) + 15%));
}

.lc-audit-compact-renderer {
 @apply p-0 md:p-1 h-full w-full;
}

.lc-audit-prose-content {
 @apply p-4 md:p-6 lg:p-8 h-full;
  font-size: var(--font-size-base, var.$font-size-base-default);
  line-height: var(--line-height-base, var.$line-height-base-default);

  :deep(h1), :deep(h2), :deep(h3) {
   @apply font-bold tracking-tight border-b pb-2.5 mb-5;
    color: hsl(var(--lc-accent-h), var(--lc-accent-s), calc(var(--lc-accent-l) + 10%));
    border-bottom-color: hsla(var(--lc-accent-h), var(--lc-accent-s), var(--lc-accent-l), 0.35);
    text-shadow: 0 0 8px hsla(var(--lc-accent-h), var(--lc-accent-s), var(--lc-accent-l), 0.2);
  }
   :deep(h1) { @apply text-xl sm:text-2xl; }
   :deep(h2) { @apply text-lg sm:text-xl; }
   :deep(h3) { @apply text-base sm:text-lg; }

  :deep(p), :deep(li) {
    color: var(--color-text-secondary, hsl(var.$default-color-text-secondary-h, var.$default-color-text-secondary-s, var.$default-color-text-secondary-l));
    @apply my-3.5 leading-relaxed text-[0.9rem] sm:text-[0.95rem];
  }
  :deep(a) {
    color: hsl(var(--lc-accent-h), var(--lc-accent-s), var(--lc-accent-l));
   @apply hover:underline hover:brightness-125 font-medium;
  }
  :deep(strong) {
    color: var(--color-text-primary, hsl(var.$default-color-text-primary-h, var.$default-color-text-primary-s, var.$default-color-text-primary-l));
    font-weight: 600;
  }
}

.lc-audit-empty-state, .lc-audit-welcome-container {
 @apply text-muted italic text-center p-6 sm:p-10 flex flex-col items-center justify-center h-full opacity-85;
}
.empty-state-icon, .lc-audit-main-icon {
 @apply w-12 h-12 sm:w-16 sm:h-16 mb-4 opacity-50;
  color: hsl(var(--lc-accent-h), var(--lc-accent-s), var(--lc-accent-l));
  filter: drop-shadow(0 0 10px hsla(var(--lc-accent-h), var(--lc-accent-s), var(--lc-accent-l), 0.5));
}
.lc-audit-main-icon {
  animation: subtlePulseWelcome 2.8s infinite ease-in-out alternate;
}

.lc-audit-welcome-title {
 @apply text-xl sm:text-2xl font-bold mt-2 mb-1.5 tracking-wide;
  color: var(--color-text-primary, hsl(var.$default-color-text-primary-h, var.$default-color-text-primary-s, var.$default-color-text-primary-l));
}
.lc-audit-welcome-subtitle {
 @apply text-sm sm:text-base mb-4 max-w-md opacity-90;
 color: var(--color-text-secondary, hsl(var.$default-color-text-secondary-h, var.$default-color-text-secondary-s, var.$default-color-text-secondary-l));
}
.lc-audit-welcome-prompt {
 @apply text-xs sm:text-sm italic;
 color: var(--color-text-muted, hsl(var.$default-color-text-muted-h, var.$default-color-text-muted-s, var.$default-color-text-muted-l));
}

.btn-futuristic-toggle {
 @apply py-1.5 px-3 text-xs flex items-center gap-1.5 rounded-md transition-colors duration-150;
  background-color: hsla(var(--lc-accent-h), var(--lc-accent-s), var(--lc-accent-l), 0.1);
  border: 1px solid hsla(var(--lc-accent-h), var(--lc-accent-s), var(--lc-accent-l), 0.3);
  color: hsl(var(--lc-accent-h), var(--lc-accent-s), calc(var(--lc-accent-l) + 20%));
  &:hover:not(:disabled) {
    background-color: hsla(var(--lc-accent-h), var(--lc-accent-s), var(--lc-accent-l), 0.2);
    border-color: hsl(var(--lc-accent-h), var(--lc-accent-s), calc(var(--lc-accent-l) + 10%));
  }
   &:disabled { opacity: 0.5; cursor: not-allowed; }
  .btn-icon { @apply w-4 h-4; }
}

@keyframes subtlePulseWelcome {
  from { transform: scale(1) rotate(-2deg); opacity: 0.7; }
  to { transform: scale(1.03) rotate(2deg); opacity: 1; }
}
</style>