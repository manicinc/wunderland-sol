// File: frontend/src/components/agents/catalog/NerfAgent/NerfAgentView.vue

<script setup lang="ts">
import { computed, inject, onMounted, onUnmounted, PropType, toRef, watch } from 'vue'; // Added watch
import { useAgentStore } from '@/store/agent.store';
import { useChatStore } from '@/store/chat.store';
import type { IAgentDefinition } from '@/services/agent.service';
import type { ToastService } from '@/services/services';
import { ChatBubbleLeftEllipsisIcon, SparklesIcon } from '@heroicons/vue/24/outline';
import { useNerfAgent } from './useNerfAgent';

const props = defineProps({
  agentId: { type: String as PropType<IAgentDefinition['id']>, required: true },
  agentConfig: { type: Object as PropType<IAgentDefinition>, required: true }
});

/**
 * @emits agent-event - Emits events to the parent component (PrivateHome.vue).
 * - `view_mounted`: When the agent view is mounted.
 * - `setProcessingState`: To update the global LLM processing state.
 */
const emit = defineEmits<{
  (e: 'agent-event', event: { type: 'view_mounted', agentId: string, label?: string }): void;
  (e: 'agent-event', event: { type: 'setProcessingState', payload: { isProcessing: boolean } }): void; // Added this line
}>();

const agentStore = useAgentStore();
const chatStore = useChatStore();
const toast = inject<ToastService>('toast');

const agentConfigAsRef = toRef(props, 'agentConfig');

const {
  isLoadingResponse, // This is the ref from useNerfAgent
  agentDisplayName,
  mainContentToDisplay,
  initialize,
  cleanup,
  handleNewUserInput,
  renderMarkdown,
  animatedUnits,
  isTextAnimating,
} = useNerfAgent(agentConfigAsRef, toast);

onMounted(async () => {
  await initialize();
  emit('agent-event', { type: 'view_mounted', agentId: props.agentId, label: agentDisplayName.value });

  const currentContent = mainContentToDisplay.value;
  // Ensure initial welcome message or existing content is displayed correctly.
  if (!currentContent?.data || currentContent?.title === `${agentDisplayName.value} Ready`) {
    const welcomeMarkdown = `
<div class="nerf-welcome-container">
  <div class="nerf-icon-wrapper">
    <ChatBubbleLeftEllipsisIcon class="nerf-main-icon" />
  </div>
  <h2 class="nerf-welcome-title">Hi, I'm ${agentDisplayName.value}!</h2>
  <p class="nerf-welcome-subtitle">${props.agentConfig.description || 'Your friendly general assistant.'}</p>
  <p class="nerf-welcome-prompt">${props.agentConfig.inputPlaceholder || 'What can I help you with?'}</p>
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
  // Ensure processing state is false if view is unmounted while loading
  if (isLoadingResponse.value) {
    emit('agent-event', { type: 'setProcessingState', payload: { isProcessing: false } });
  }
});

defineExpose({ handleNewUserInput });

// True if backend is processing AND no text animation has started yet, AND there's no existing data to show
const showInitialLoadingIndicator = computed(() => {
  // This uses the local isLoadingResponse from useNerfAgent
  return isLoadingResponse.value && !isTextAnimating.value && !(mainContentToDisplay.value?.data && mainContentToDisplay.value.type !== 'loading');
});

const showAnimatedText = computed(() => {
  return isTextAnimating.value || (chatStore.isMainContentStreaming && agentStore.activeAgentId === props.agentId && animatedUnits.value.length > 0);
});

// For final settled markdown content (not loading, not welcome placeholder, not animated)
const showFinalMarkdownContent = computed(() => {
    return !isTextAnimating.value &&
           !chatStore.isMainContentStreaming && // Ensure streaming from store is also considered if it drives this
           mainContentToDisplay.value?.data &&
           (mainContentToDisplay.value.type === 'markdown') &&
           mainContentToDisplay.value.title !== `${agentDisplayName.value} Ready`;
});

// For the "Nerf is processing..." type of messages that might appear via 'loading' type in mainContentToDisplay
const showInlineLoadingMessage = computed(() => {
    return !isTextAnimating.value &&
           !showFinalMarkdownContent.value &&
           mainContentToDisplay.value?.type === 'loading' &&
           mainContentToDisplay.value?.data;
});

// For the initial welcome message specifically
const showWelcomeMessage = computed(() => {
    return !isTextAnimating.value &&
           !isLoadingResponse.value && // Not actively loading a new response
           mainContentToDisplay.value?.type === 'markdown' &&
           mainContentToDisplay.value?.title === `${agentDisplayName.value} Ready`;
});


/**
 * @watch isLoadingResponse
 * @description Watches the local `isLoadingResponse` from the `useNerfAgent` composable.
 * When it changes, emits a `setProcessingState` event to `PrivateHome.vue`
 * to update the global processing state, which in turn controls `VoiceInput.vue`.
 */
watch(isLoadingResponse, (newIsProcessing) => {
  console.log(`[NerfAgentView] isLoadingResponse changed to: ${newIsProcessing}. Emitting setProcessingState.`);
  emit('agent-event', { type: 'setProcessingState', payload: { isProcessing: newIsProcessing } });
});

</script>

<template>
  <div class="general-agent-view nerf-agent-view">
    <div class="nerf-header">
      <div class="nerf-header-title-group">
        <ChatBubbleLeftEllipsisIcon class="nerf-header-icon" :class="props.agentConfig.iconClass" />
        <span class="nerf-header-title">{{ agentDisplayName }}</span>
      </div>
    </div>
    
    <div class="nerf-main-content-area">
      <div v-if="showInitialLoadingIndicator" class="nerf-initial-loading-inline">
        <div class="nerf-spinner-container"><div class="nerf-spinner"></div></div>
        <p class="nerf-loading-text">{{ agentDisplayName }} is thinking...</p>
      </div>

      <div v-else-if="showAnimatedText" class="prose-futuristic nerf-prose-content nerf-prose-content--streaming">
        <template v-for="unit in animatedUnits" :key="unit.key">
          <template v-if="unit.content.includes('\n')">
            <template v-for="(line, lineIndex) in unit.content.split('\n')" :key="`${unit.key}-line-${lineIndex}`">
              <span :class="unit.classes" :style="unit.style">{{ line }}</span>
              <br v-if="lineIndex < unit.content.split('\n').length - 1" />
            </template>
          </template>
          <span v-else :class="unit.classes" :style="unit.style">
            {{ unit.content }}
          </span>
        </template>
        <span v-if="isTextAnimating" class="streaming-cursor-ephemeral">▋</span>
      </div>

      <div v-else-if="showFinalMarkdownContent"
           class="prose-futuristic nerf-prose-content"
           v-html="renderMarkdown(mainContentToDisplay!.data as string)">
      </div>

      <div v-else-if="showWelcomeMessage"
           class="prose-futuristic nerf-prose-content"
           v-html="renderMarkdown(mainContentToDisplay!.data as string)">
      </div>
      
      <div v-else-if="showInlineLoadingMessage"
           class="prose-futuristic nerf-prose-content nerf-inline-loading-message"
           v-html="renderMarkdown(mainContentToDisplay!.data as string + (chatStore.isMainContentStreaming ? '<span class=\'streaming-cursor-ephemeral\'>▋</span>' : ''))">
      </div>
      
      <div v-else-if="!isLoadingResponse && !isTextAnimating" class="nerf-empty-state">
          <SparklesIcon class="nerf-empty-icon"/>
        <p class="nerf-empty-text">{{ props.agentConfig.inputPlaceholder || `Ask ${agentDisplayName} anything!` }}</p>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use 'sass:math';
@use '@/styles/abstracts/variables' as var;
@use '@/styles/abstracts/mixins' as mixins;

.nerf-agent-view {
  --nerf-accent-h: var(--theme-nerf-accent-h, var(--color-accent-secondary-h, #{var.$default-color-accent-secondary-h}));
  --nerf-accent-s: var(--theme-nerf-accent-s, var(--color-accent-secondary-s, #{var.$default-color-accent-secondary-s}));
  --nerf-accent-l: var(--theme-nerf-accent-l, var(--color-accent-secondary-l, #{var.$default-color-accent-secondary-l}));

  --nerf-bg-h: var(--theme-nerf-bg-h, var(--color-bg-primary-h, #{var.$default-color-bg-primary-h}));
  --nerf-bg-s: var(--theme-nerf-bg-s, var(--color-bg-primary-s, #{var.$default-color-bg-primary-s}));
  --nerf-bg-l: var(--theme-nerf-bg-l, calc(var(--color-bg-primary-l, #{var.$default-color-bg-primary-l}) - 2%));

  @apply flex flex-col h-full w-full overflow-hidden;
  background-color: hsl(var(--nerf-bg-h), var(--nerf-bg-s), var(--nerf-bg-l));
  background-image: 
    radial-gradient(ellipse at 80% 10%, hsla(var(--nerf-accent-h), var(--nerf-accent-s), var(--nerf-accent-l), 0.12) 0%, transparent 55%),
    radial-gradient(ellipse at 20% 90%, hsla(var(--nerf-accent-h), calc(var(--nerf-accent-s) - 10%), calc(var(--nerf-accent-l) - 5%), 0.08) 0%, transparent 50%),
    var(--bg-grid-texture-subtle, linear-gradient(hsla(0,0%,100%,0.02) 1px, transparent 1px), linear-gradient(90deg, hsla(0,0%,100%,0.02) 1px, transparent 1px));
  background-size: cover, cover, var(--bg-grid-size, 50px) var(--bg-grid-size, 50px);
  color: var(--color-text-primary);
  border: 1px solid hsla(var(--nerf-accent-h), var(--nerf-accent-s), var(--nerf-accent-l), 0.1);
  box-shadow: inset 0 0 30px hsla(var(--nerf-bg-h), var(--nerf-bg-s), calc(var(--nerf-bg-l) - 10%), 0.5);
}

.nerf-header {
  @apply p-3 px-4 border-b flex items-center justify-between gap-2 text-sm shadow-md backdrop-blur-sm;
  background-color: hsla(var(--nerf-bg-h), var(--nerf-bg-s), calc(var(--nerf-bg-l) + 4%), 0.85);
  border-bottom-color: hsla(var(--nerf-accent-h), var(--nerf-accent-s), var(--nerf-accent-l), 0.25);
  
  .nerf-header-title-group { @apply flex items-center gap-2.5; }
  .nerf-header-icon {
    @apply w-6 h-6 shrink-0;
    color: hsl(var(--nerf-accent-h), var(--nerf-accent-s), var(--nerf-accent-l));
    filter: drop-shadow(0 0 6px hsla(var(--nerf-accent-h), var(--nerf-accent-s), var(--nerf-accent-l), 0.7));
  }
  .nerf-header-title {
    @apply font-semibold text-lg tracking-wide;
    color: var(--color-text-primary);
    text-shadow: 0 0 5px hsla(var(--nerf-accent-h), var(--nerf-accent-s), var(--nerf-accent-l), 0.2);
  }
}

.nerf-main-content-area {
  @apply flex-grow relative min-h-0 overflow-y-auto flex flex-col; /* Added flex flex-col for centering inline loader */
   @include mixins.custom-scrollbar(
    $thumb-color-var-prefix: '--nerf-accent',
    $thumb-base-alpha: 0.5,
    $thumb-hover-alpha: 0.7,
    $track-color-var-prefix: '--nerf-bg',
    $track_alpha: 0.3,
    $fb-thumb-h: var.$default-color-accent-secondary-h, 
    $fb-thumb-s: var.$default-color-accent-secondary-s,
    $fb-thumb-l: var.$default-color-accent-secondary-l,
    $fb-track-h: var.$default-color-bg-primary-h, 
    $fb-track-s: var.$default-color-bg-primary-s,
    $fb-track-l: calc(#{var.$default-color-bg-primary-l} - 2%)
  );
}

/* NEW: Inline loading indicator styles */
.nerf-initial-loading-inline {
  @apply flex flex-col items-center justify-center text-center p-8 flex-grow;
  color: hsl(var(--nerf-accent-h), var(--nerf-accent-s), calc(var(--nerf-accent-l) + 10%));
}
.nerf-spinner-container { @apply relative w-10 h-10 mb-2.5; }
.nerf-spinner {
  @apply w-full h-full border-[5px] rounded-full animate-spin;
  border-color: hsla(var(--nerf-accent-h), var(--nerf-accent-s), calc(var(--nerf-accent-l) + 10%), 0.25);
  border-top-color: hsl(var(--nerf-accent-h), var(--nerf-accent-s), var(--nerf-accent-l));
  box-shadow: 0 0 10px hsla(var(--nerf-accent-h), var(--nerf-accent-s), var(--nerf-accent-l), 0.3);
}
.nerf-loading-text {
  color: hsl(var(--nerf-accent-h), var(--nerf-accent-s), calc(var(--nerf-accent-l) + 15%));
  @apply font-medium text-sm tracking-wider;
}

.prose-futuristic.nerf-prose-content {
  @apply p-4 md:p-6;
  font-size: var(--font-size-base);
  line-height: var(--line-height-base);

  &.nerf-prose-content--streaming {
    white-space: pre-wrap;
    word-break: break-word;
    span[class*="animate-text-"] { display: inline; }
    span.text-unit-line { display: block; }
    br { content: ""; display: block; margin-bottom: 1em; }
  }
  &.nerf-inline-loading-message {
     @apply text-center italic;
    color: hsl(var(--nerf-accent-h), var(--nerf-accent-s), calc(var(--nerf-accent-l) + 5%));
    .nerf-spinner-container { // If we embed spinner in markdown for loading messages
      @apply w-6 h-6 inline-block align-middle mr-1.5;
      .nerf-spinner { border-width: 3px; }
    }
  }

  :deep(h1), :deep(h2), :deep(h3) {
    @apply font-semibold tracking-tight border-b pb-1.5 mb-3;
    color: hsl(var(--nerf-accent-h), var(--nerf-accent-s), calc(var(--nerf-accent-l) + 10%));
    border-bottom-color: hsla(var(--nerf-accent-h), var(--nerf-accent-s), var(--nerf-accent-l), 0.35);
  }
  :deep(h1) { @apply text-xl; } :deep(h2) { @apply text-lg; } :deep(h3) { @apply text-base; }

  :deep(p), :deep(li) { 
    color: var(--color-text-secondary);
    @apply my-2.5 leading-relaxed; 
  }
  :deep(a) {
    color: hsl(var(--nerf-accent-h), var(--nerf-accent-s), var(--nerf-accent-l));
    @apply hover:underline hover:brightness-125 font-medium;
    text-decoration-thickness: 1.5px;
  }
  :deep(strong) { color: var(--color-text-primary); font-weight: 600; }
  :deep(code:not(pre code)) {
    @apply px-1.5 py-1 rounded-sm text-xs;
    background-color: hsla(var(--nerf-accent-h), var(--nerf-accent-s), var(--nerf-accent-l), 0.15);
    color: hsl(var(--nerf-accent-h), var(--nerf-accent-s), calc(var(--nerf-accent-l) + 20%));
    border: 1px solid hsla(var(--nerf-accent-h), var(--nerf-accent-s), var(--nerf-accent-l), 0.2);
  }
  :deep(pre) {
    @apply border text-sm my-3 p-3.5 rounded-md shadow-inner;
    background-color: hsla(var(--nerf-bg-h), var(--nerf-bg-s), calc(var(--nerf-bg-l) - 3%), 0.95);
    border-color: hsla(var(--nerf-accent-h), var(--nerf-accent-s), var(--nerf-accent-l), 0.25);
    @include mixins.custom-scrollbar(
      $thumb-color-var-prefix: '--nerf-accent', $thumb-base-alpha: 0.4, $thumb-hover-alpha: 0.6,
      $track-color-var-prefix: '--nerf-bg', $track-alpha: 0.1, $width: 6px,
      $fb-thumb-h: var.$default-color-accent-secondary-h, $fb-thumb-s: var.$default-color-accent-secondary-s, $fb-thumb-l: var.$default-color-accent-secondary-l,
      $fb-track-h: var.$default-color-bg-primary-h, $fb-track-s: var.$default-color-bg-primary-s, $fb-track-l: calc(#{var.$default-color-bg-primary-l} - 3%)
    );
  }
   :deep(blockquote) {
    @apply border-l-4 pl-4 italic my-4;
    color: var(--color-text-muted);
    border-left-color: hsl(var(--nerf-accent-h), var(--nerf-accent-s), var(--nerf-accent-l));
    background-color: hsla(var(--nerf-accent-h), var(--nerf-accent-s), var(--nerf-accent-l), 0.05);
    padding-top: var.$spacing-sm; 
    padding-bottom: var.$spacing-sm;
    border-radius: 0 var.$radius-md var.$radius-md 0;
  }
}

.nerf-empty-state {
  @apply flex-grow; /* Allow empty state to fill space */
  color: var(--color-text-muted);
  @apply italic text-center p-6 flex flex-col items-center justify-center h-full opacity-75;
}
.nerf-empty-icon {
  @apply w-12 h-12 mb-3.5 opacity-40;
  color: hsl(var(--nerf-accent-h), var(--nerf-accent-s), var(--nerf-accent-l));
  filter: drop-shadow(0 0 8px hsla(var(--nerf-accent-h), var(--nerf-accent-s), var(--nerf-accent-l), 0.4));
}
.nerf-empty-text { @apply text-sm; }

.nerf-welcome-container {
  @apply text-center p-6 flex flex-col items-center justify-center h-full;
  .nerf-icon-wrapper {
    @apply p-2.5 rounded-full mb-4 shadow-xl;
    background: radial-gradient(circle, hsla(var(--nerf-accent-h), var(--nerf-accent-s), var(--nerf-accent-l), 0.2) 0%, transparent 60%);
  }
  .nerf-main-icon {
    @apply w-16 h-16 mx-auto;
    color: hsl(var(--nerf-accent-h), var(--nerf-accent-s), var(--nerf-accent-l));
    filter: drop-shadow(0 0 15px hsla(var(--nerf-accent-h), var(--nerf-accent-s), var(--nerf-accent-l), 0.6));
    animation: subtlePulseNerf 3s infinite ease-in-out;
  }
  .nerf-welcome-title {
    @apply text-2xl sm:text-3xl font-bold mt-2 mb-1.5 tracking-wide;
    color: var(--color-text-primary);
    text-shadow: 0 1px 2px hsla(var(--nerf-bg-h), var(--nerf-bg-s), calc(var(--nerf-bg-l) - 20%), 0.5);
  }
  .nerf-welcome-subtitle {
    @apply text-base sm:text-lg mb-4 max-w-md opacity-90;
    color: var(--color-text-secondary);
  }
  .nerf-welcome-prompt {
    @apply text-sm italic;
    color: var(--color-text-muted);
  }
}

@keyframes subtlePulseNerf {
  0%, 100% { opacity: 1; transform: scale(1) rotate(1deg); }
  50% { opacity: 0.85; transform: scale(1.04) rotate(-1deg); }
}

.streaming-cursor-ephemeral {
    display: inline-block;
    animation: terminalCursorBlink 1s step-end infinite;
    background-color: hsl(var(--nerf-accent-h), var(--nerf-accent-s), var(--nerf-accent-l));
    width: 0.5em;
    margin-left: 0.1em;
    height: 1em; 
    vertical-align: middle;
}
</style>