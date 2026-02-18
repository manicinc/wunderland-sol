<script setup lang="ts">
import { computed, inject, onMounted, onUnmounted, PropType, toRef, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAgentStore } from '@/store/agent.store';
import { useChatStore } from '@/store/chat.store';
import type { IAgentDefinition } from '@/services/agent.service';
import type { ToastService } from '@/services/services';
import CompactMessageRenderer from '@/components/layouts/CompactMessageRenderer/CompactMessageRenderer.vue';
import { CpuChipIcon, SparklesIcon } from '@heroicons/vue/24/outline';
import { useVAgent } from './useVAgent';

const props = defineProps({
  agentId: { type: String as PropType<IAgentDefinition['id']>, required: true },
  agentConfig: { type: Object as PropType<IAgentDefinition>, required: true }
});

const emit = defineEmits<{
  (e: 'agent-event', event: { type: 'view_mounted' | 'setProcessingState', agentId: string, label?: string, payload?: any }): void;
}>();

const agentStore = useAgentStore();
const chatStore = useChatStore();
const toast = inject<ToastService>('toast');
const { t } = useI18n();

const agentConfigAsRef = toRef(props, 'agentConfig');

const {
  isLoadingResponse,
  agentDisplayName,
  mainContentToDisplay,
  initialize,
  cleanup,
  handleNewUserInput,
  renderMarkdown,
} = useVAgent(agentConfigAsRef, toast);

// Watch isLoadingResponse and emit setProcessingState event to parent
// This is critical for VAgent since it has handlesOwnInput: true
let hasInitialized = false;
watch(isLoadingResponse, (newValue, oldValue) => {
  // Skip the initial undefined -> false transition on mount
  if (!hasInitialized && oldValue === undefined && newValue === false) {
    hasInitialized = true;
    console.log(`[VAgentView] Skipping initial isLoadingResponse false on mount`);
    return;
  }
  hasInitialized = true;

  console.log(`[VAgentView] isLoadingResponse changed from ${oldValue} to ${newValue}. Emitting setProcessingState event.`);
  emit('agent-event', {
    type: 'setProcessingState',
    agentId: props.agentId,
    label: agentDisplayName.value,
    payload: { isProcessing: newValue }
  });
});

onMounted(async () => {
  await initialize();
  emit('agent-event', { type: 'view_mounted', agentId: props.agentId, label: agentDisplayName.value });

  const currentContent = mainContentToDisplay.value;
  if (!currentContent?.data || currentContent?.title === `${agentDisplayName.value} Ready`) {
    const welcomeMarkdown = `
<div class="v-welcome-container">
  <div class="v-icon-wrapper">
    <CpuChipIcon class="v-main-icon" />
  </div>
  <h2 class="v-welcome-title">${t('vAgent.online', { name: t('vAgent.name') })}</h2>
  <p class="v-welcome-subtitle">${t('vAgent.description')}</p>
  <p class="v-welcome-prompt">${t('vAgent.placeholder')}</p>
</div>`;
    chatStore.updateMainContent({
      agentId: props.agentId,
      type: 'markdown',
      data: welcomeMarkdown,
      title: `${agentDisplayName.value} Ready`,
      timestamp: Date.now(),
    });
  }
});

onUnmounted(() => {
  if (cleanup) cleanup();
});

defineExpose({ handleNewUserInput });

</script>

<template>
  <div class="general-agent-view v-agent-view">
    <div class="v-header">
      <div class="v-header-title-group">
        <component :is="props.agentConfig.iconComponent || CpuChipIcon" class="v-header-icon" :class="props.agentConfig.iconClass" />
        <span class="v-header-title">{{ agentDisplayName }}</span>
      </div>
    </div>
    
    <div v-if="isLoadingResponse && !chatStore.isMainContentStreaming && !(mainContentToDisplay && mainContentToDisplay.data)" class="v-loading-overlay">
      <div class="v-spinner-container"><div class="v-spinner"></div></div>
      <p class="v-loading-text">{{ agentDisplayName }} is processing...</p>
    </div>
    
    <div class="v-main-content-area">
      <template v-if="mainContentToDisplay?.data">
        <CompactMessageRenderer
          v-if="props.agentConfig.capabilities?.usesCompactRenderer && (mainContentToDisplay.type === 'compact-message-renderer-data' || mainContentToDisplay.type === 'loading' || (mainContentToDisplay.type === 'markdown' && !chatStore.isMainContentStreaming && mainContentToDisplay.data.includes('---SLIDE_BREAK---')))"
          :content="chatStore.isMainContentStreaming && agentStore.activeAgentId === props.agentId 
                        ? chatStore.streamingMainContentText 
                        : mainContentToDisplay.data as string"
          :mode="props.agentConfig.id"
          class="v-compact-renderer" 
        />
        <div v-else-if="mainContentToDisplay.type === 'markdown' || mainContentToDisplay.type === 'welcome' || mainContentToDisplay.type === 'loading'"
             class="prose-v-styled v-prose-content"
             v-html="chatStore.isMainContentStreaming && agentStore.activeAgentId === props.agentId 
                      ? renderMarkdown(chatStore.streamingMainContentText + '<span class=\'streaming-cursor-v\'>▋</span>') 
                      : renderMarkdown(mainContentToDisplay.data as string)"
        ></div>
        <div v-else class="v-placeholder">
          {{ agentDisplayName }} is active. Main content type: {{ mainContentToDisplay.type }}.
        </div>
      </template>
      <div v-else-if="!isLoadingResponse" class="v-empty-state">
          <SparklesIcon class="v-empty-icon"/>
          <p class="v-empty-text">{{ props.agentConfig.inputPlaceholder || `Initiate query with ${agentDisplayName}.` }}</p>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use 'sass:math';
@use '@/styles/abstracts/variables' as var; 
@use '@/styles/abstracts/mixins' as mixins;

.v-agent-view {
  // Theme-aware CSS variables with sophisticated fallbacks
  --v-accent-h: var(--theme-v-accent-h, var(--accent-hue-cyan, 180));
  --v-accent-s: var(--theme-v-accent-s, var(--accent-saturation-vibrant, 90%));
  --v-accent-l: var(--theme-v-accent-l, var(--accent-lightness-bright, 60%));
  --v-accent-a: var(--theme-v-accent-a, 1);

  --v-bg-h: var(--theme-v-bg-h, var(--color-bg-primary-h, 220));
  --v-bg-s: var(--theme-v-bg-s, var(--color-bg-primary-s, 25%));
  --v-bg-l: var(--theme-v-bg-l, calc(var(--color-bg-primary-l, 16%) - 8%));
  --v-bg-a: var(--theme-v-bg-a, 1);

  --v-text-primary-h: var(--theme-v-text-primary-h, var(--color-text-primary-h, 200));
  --v-text-primary-s: var(--theme-v-text-primary-s, var(--color-text-primary-s, 30%));
  --v-text-primary-l: var(--theme-v-text-primary-l, var(--color-text-primary-l, 95%));

  --v-text-secondary-h: var(--theme-v-text-secondary-h, var(--color-text-secondary-h, 200));
  --v-text-secondary-s: var(--theme-v-text-secondary-s, var(--color-text-secondary-s, 20%));
  --v-text-secondary-l: var(--theme-v-text-secondary-l, var(--color-text-secondary-l, 85%));
  
  --v-glow-l-factor: var(--theme-v-glow-l-factor, 75%);
  --v-glow-opacity: var(--theme-v-glow-opacity, 0.7);

  @apply flex flex-col h-full w-full overflow-hidden;
  background-color: hsla(var(--v-bg-h), var(--v-bg-s), var(--v-bg-l), var(--v-bg-a));
  background-image: 
    radial-gradient(ellipse at 20% 25%, hsla(var(--v-accent-h), var(--v-accent-s), var(--v-accent-l), 0.15) 0%, transparent 50%),
    radial-gradient(ellipse at 80% 70%, hsla(var(--v-accent-h), calc(var(--v-accent-s) - 15%), calc(var(--v-accent-l) + 5%), 0.1) 0%, transparent 50%),
    var(--bg-plexus-texture-darker,
      linear-gradient(45deg, hsla(var(--v-accent-h),30%,30%,0.02) 25%, transparent 25%, transparent 75%, hsla(var(--v-accent-h),30%,30%,0.02) 75%, hsla(var(--v-accent-h),30%,30%,0.02)),
      linear-gradient(45deg, hsla(var(--v-accent-h),30%,30%,0.02) 25%, transparent 25%, transparent 75%, hsla(var(--v-accent-h),30%,30%,0.02) 75%, hsla(var(--v-accent-h),30%,30%,0.02))
    );
  background-size: cover, cover, 60px 60px;
  background-position: 0 0, 0 0, 0 0, 30px 30px;
  background-blend-mode: screen, screen, normal;
  color: hsl(var(--v-text-primary-h), var(--v-text-primary-s), var(--v-text-primary-l));
  border: 1px solid hsla(var(--v-accent-h), var(--v-accent-s), var(--v-accent-l), 0.3);
  box-shadow: inset 0 0 60px hsla(var(--v-bg-h), var(--v-bg-s), calc(var(--v-bg-l) - 15%), 0.7),
              0 0 20px hsla(var(--v-accent-h), var(--v-accent-s), var(--v-accent-l), 0.1);
}

.v-header {
  @apply p-3 px-4 border-b flex items-center justify-between gap-2 text-sm shadow-xl backdrop-blur-lg;
  background-color: hsla(var(--v-bg-h), var(--v-bg-s), calc(var(--v-bg-l) + 5%), 0.8);
  border-bottom-color: hsla(var(--v-accent-h), var(--v-accent-s), var(--v-accent-l), 0.5);
  
  .v-header-title-group { @apply flex items-center gap-3; }
  .v-header-icon {
    @apply w-7 h-7 shrink-0;
    color: hsl(var(--v-accent-h), var(--v-accent-s), var(--v-accent-l));
    filter: drop-shadow(0 0 12px hsla(var(--v-accent-h), var(--v-accent-s), var(--v-accent-l), var(--v-glow-opacity)));
    animation: v-icon-pulse 3s infinite ease-in-out;
  }
  .v-header-title {
    @apply font-bold text-xl tracking-wide;
    color: hsl(var(--v-text-primary-h), var(--v-text-primary-s), var(--v-text-primary-l));
    text-shadow: 0 0 10px hsla(var(--v-accent-h), var(--v-accent-s), var(--v-accent-l), calc(var(--v-glow-opacity) * 0.5)),
                 0 0 20px hsla(var(--v-accent-h), var(--v-accent-s), var(--v-accent-l), calc(var(--v-glow-opacity) * 0.3));
  }
}

.v-main-content-area {
  @apply flex-grow relative min-h-0 overflow-y-auto;
  @include mixins.custom-scrollbar(
    $thumb-color-var-prefix: '--v-accent',
    $thumb-base-alpha: 0.65, $thumb-hover-alpha: 0.85,
    $track-color-var-prefix: '--v-bg', $track-alpha: 0.35, $width: 8px,
    $fb-thumb-h: 180, $fb-thumb-s: 90%, $fb-thumb-l: 60%,
    $fb-track-h: 220, $fb-track-s: 25%, $fb-track-l: calc(16% - 10%) 
  );
}

.v-loading-overlay {
  @apply absolute inset-0 flex flex-col items-center justify-center z-10;
  background-color: hsla(var(--v-bg-h), var(--v-bg-s), calc(var(--v-bg-l) + 2%), 0.85);
  backdrop-filter: blur(4px);
}

.v-spinner-container { @apply relative w-12 h-12 mb-3.5; }
.v-spinner {
  @apply w-full h-full rounded-full;
  border: 4px solid hsla(var(--v-accent-h), var(--v-accent-s), var(--v-accent-l), 0.2);
  border-left-color: hsl(var(--v-accent-h), var(--v-accent-s), var(--v-accent-l));
  border-right-color: hsl(var(--v-accent-h), var(--v-accent-s), var(--v-accent-l));
  animation: v-spin 0.8s infinite cubic-bezier(0.5, 0, 0.5, 1);
  box-shadow: 0 0 15px hsla(var(--v-accent-h), var(--v-accent-s), var(--v-accent-l), 0.4);
}
.v-loading-text {
  color: hsl(var(--v-accent-h), var(--v-accent-s), calc(var(--v-accent-l) + 25%));
  @apply font-medium text-base tracking-wider;
}

.v-compact-renderer { @apply p-0 sm:p-0 h-full; }

.prose-v-styled {
  @apply p-4 md:p-6;
  font-size: var(--font-size-base);
  line-height: calc(var(--line-height-base) + 0.1);

  :deep(h1), :deep(h2), :deep(h3), :deep(h4) {
    @apply font-bold tracking-tight border-b pb-2.5 mb-5;
    color: hsl(var(--v-text-primary-h), var(--v-text-primary-s), var(--v-text-primary-l));
    border-bottom-color: hsla(var(--v-accent-h), var(--v-accent-s), var(--v-accent-l), 0.5);
    text-shadow: 0 0 8px hsla(var(--v-accent-h), var(--v-accent-s), var(--v-glow-l-factor), calc(var(--v-glow-opacity)*0.3));
  }
  :deep(h1) { @apply text-2xl sm:text-3xl; } 
  :deep(h2) { @apply text-xl sm:text-2xl; } 
  :deep(h3) { @apply text-lg sm:text-xl; }
  :deep(h4) { @apply text-base sm:text-lg; }

  :deep(p), :deep(li) { 
    color: hsl(var(--v-text-secondary-h), var(--v-text-secondary-s), var(--v-text-secondary-l));
    @apply my-3.5 leading-relaxed; 
  }
  :deep(a) {
    color: hsl(var(--v-accent-h), var(--v-accent-s), var(--v-accent-l));
    @apply hover:underline font-medium;
    text-decoration-thickness: 1.5px;
    transition: color var.$duration-quick ease-in-out, text-shadow var.$duration-quick ease-in-out;
    &:hover {
      color: hsl(var(--v-accent-h), var(--v-accent-s), calc(var(--v-accent-l) + 10%));
      text-shadow: 0 0 10px hsla(var(--v-accent-h), var(--v-accent-s), var(--v-glow-l-factor), var(--v-glow-opacity));
    }
  }
  :deep(strong) { 
    color: hsl(var(--v-text-primary-h), var(--v-text-primary-s), var(--v-text-primary-l)); 
    font-weight: 700;
  }
  :deep(code:not(pre code)) {
    @apply px-2 py-1 rounded text-sm;
    background-color: hsla(var(--v-accent-h), var(--v-accent-s), var(--v-accent-l), 0.15);
    color: hsl(var(--v-accent-h), var(--v-accent-s), calc(var(--v-accent-l) + 20%));
    border: 1px solid hsla(var(--v-accent-h), var(--v-accent-s), var(--v-accent-l), 0.35);
    text-shadow: 0 0 3px hsla(var(--v-accent-h), var(--v-accent-s), var(--v-accent-l), 0.2);
  }
  :deep(pre) {
    @apply border text-sm my-5 p-4 rounded-lg shadow-lg overflow-x-auto;
    background-color: hsla(var(--v-bg-h), var(--v-bg-s), calc(var(--v-bg-l) - 8%), 0.98);
    border-color: hsla(var(--v-accent-h), var(--v-accent-s), var(--v-accent-l), 0.4);
    @include mixins.custom-scrollbar(
      $thumb-color-var-prefix: '--v-accent', $thumb-base-alpha: 0.5, $thumb-hover-alpha: 0.75,
      $track-color-var-prefix: '--v-bg', $track-alpha: 0.2, $width: 7px,
      $fb-thumb-h: 180, $fb-thumb-s: 90%, $fb-thumb-l: 60%,
      $fb-track-h: 220, $fb-track-s: 25%, $fb-track-l: calc(16% - 12%)
    );
    code.hljs {
      color: hsl(var(--v-text-secondary-h), var(--v-text-secondary-s), calc(var(--v-text-secondary-l) + 5%));
    }
  }
  :deep(blockquote) {
    @apply border-l-4 pl-5 py-3 italic my-5 text-base;
    color: hsl(var(--v-text-secondary-h), var(--v-text-secondary-s), calc(var(--v-text-secondary-l) - 5%));
    border-left-color: hsl(var(--v-accent-h), var(--v-accent-s), var(--v-accent-l));
    background-color: hsla(var(--v-accent-h), var(--v-accent-s), var(--v-accent-l), 0.05);
    border-radius: 0 var.$radius-lg var.$radius-lg 0;
    box-shadow: inset 3px 0 8px hsla(var(--v-accent-h), var(--v-accent-s), var(--v-accent-l), 0.05);
  }
}

.v-placeholder {
  color: var(--color-text-muted-on-dark, hsl(200, 15%, 70%));
  @apply italic text-center p-8 flex flex-col items-center justify-center h-full opacity-80;
}

.v-empty-state {
  color: var(--color-text-muted-on-dark, hsl(200, 15%, 70%));
  @apply italic text-center p-8 flex flex-col items-center justify-center h-full opacity-80;
}
.v-empty-icon {
  @apply w-14 h-14 mb-4 opacity-50;
  color: hsl(var(--v-accent-h), var(--v-accent-s), var(--v-accent-l));
  filter: drop-shadow(0 0 10px hsla(var(--v-accent-h), var(--v-accent-s), var(--v-accent-l), 0.5));
}
.v-empty-text { @apply text-sm; }

.v-welcome-container {
  @apply text-center p-8 flex flex-col items-center justify-center h-full;
  .v-icon-wrapper {
    @apply p-3.5 rounded-xl mb-6 shadow-2xl;
    background: radial-gradient(circle, hsla(var(--v-accent-h), var(--v-accent-s), var(--v-accent-l), 0.2) 0%, transparent 70%);
    border: 1px solid hsla(var(--v-accent-h), var(--v-accent-s), var(--v-accent-l), 0.25);
  }
  .v-main-icon {
    @apply w-24 h-24 mx-auto;
    color: hsl(var(--v-accent-h), var(--v-accent-s), var(--v-accent-l));
    filter: drop-shadow(0 0 25px hsla(var(--v-accent-h), var(--v-accent-s), var(--v-glow-l-factor), var(--v-glow-opacity)));
    animation: subtlePulseV 2.5s infinite ease-in-out;
  }
  .v-welcome-title {
    @apply text-4xl sm:text-5xl font-black mt-2 mb-3 tracking-tight;
    color: hsl(var(--v-text-primary-h), var(--v-text-primary-s), var(--v-text-primary-l));
    text-shadow: 0 2px 5px hsla(var(--v-bg-h), var(--v-bg-s), calc(var(--v-bg-l) - 30%), 0.7),
                 0 0 15px hsla(var(--v-accent-h), var(--v-accent-s), var(--v-glow-l-factor), calc(var(--v-glow-opacity)*0.4));
  }
  .v-welcome-subtitle {
    @apply text-xl sm:text-2xl mb-6 max-w-xl opacity-95;
    color: hsl(var(--v-text-secondary-h), var(--v-text-secondary-s), var(--v-text-secondary-l));
  }
  .v-welcome-prompt {
    @apply text-lg italic;
    color: hsl(var(--v-text-secondary-h), var(--v-text-secondary-s), calc(var(--v-text-secondary-l) - 10%));
  }
}

// Streaming cursor styles
:deep(.streaming-cursor-v) {
  display: inline-block;
  animation: terminalCursorBlink 0.9s step-end infinite;
  background-color: hsl(var(--v-accent-h), var(--v-accent-s), var(--v-accent-l));
  box-shadow: 0 0 8px hsla(var(--v-accent-h), var(--v-accent-s), var(--v-accent-l), 0.7);
  width: 0.6em;
  margin-left: 0.1em;
  height: 1.1em; 
  vertical-align: middle;
  border-radius: 1px;
}

@keyframes v-icon-pulse {
  0%, 100% { 
    transform: scale(1); 
    opacity: 0.8; 
    filter: drop-shadow(0 0 8px hsla(var(--v-accent-h), var(--v-accent-s), var(--v-accent-l), 0.7)); 
  }
  50% { 
    transform: scale(1.1); 
    opacity: 1; 
    filter: drop-shadow(0 0 14px hsla(var(--v-accent-h), var(--v-accent-s), var(--v-accent-l), 0.9)); 
  }
}

@keyframes v-spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@keyframes subtlePulseV {
  0%, 100% { 
    opacity: 0.9; 
    transform: scale(1) rotate(0deg); 
    filter: drop-shadow(0 0 15px hsla(var(--v-accent-h), var(--v-accent-s), var(--v-accent-l), 0.6));
  }
  50% { 
    opacity: 1; 
    transform: scale(1.05) rotate(2deg); 
    filter: drop-shadow(0 0 25px hsla(var(--v-accent-h), var(--v-accent-s), var(--v-accent-l), 0.8));
  }
}

@keyframes terminalCursorBlink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}
</style>