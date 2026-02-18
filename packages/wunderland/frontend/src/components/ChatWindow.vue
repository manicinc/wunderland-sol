// File: frontend/src/components/ChatWindow.vue
/**
 * @file ChatWindow.vue
 * @description Main component for displaying the flow of chat messages.
 * Dynamically personalizes welcome messages and loading indicators based on the active AI agent.
 * Handles rendering individual messages, welcome placeholder, loading state, and auto-scrolling.
 * Styled according to the "Ephemeral Harmony" theme.
 *
 * @component ChatWindow
 * @props None. Relies on Pinia stores (`chatStore`, `agentStore`, `uiStore`) for data.
 * @emits focus-voice-input - Emitted to suggest focusing the voice input field.
 * @emits set-input-text - Emitted with prompt text when an example prompt is clicked.
 *
 * @version 3.2.6 - Corrected missing imports for AssistantAvatarIcon and uiStore.
 */
<script setup lang="ts">
import { computed, watch, ref, nextTick, onMounted, onUpdated, type Ref, type Component as VueComponentType, type FunctionalComponent, type DefineComponent } from 'vue';
import { useI18n } from 'vue-i18n';
import { useChatStore } from '@/store/chat.store';
import { useAgentStore } from '@/store/agent.store';
import { useUiStore } from '@/store/ui.store'; // Import uiStore
import { type ChatMessageFE } from '@/utils/api';
import type { IAgentDefinition } from '@/services/agent.service';
import Message from './Message.vue';
import { SparklesIcon, CpuChipIcon as AssistantAvatarIcon } from '@heroicons/vue/24/outline'; // Import AssistantAvatarIcon

const chatStore = useChatStore();
const agentStore = useAgentStore();
const uiStore = useUiStore(); // Instantiate uiStore
const { t } = useI18n();

const chatWindowContainerRef: Ref<HTMLElement | null> = ref(null);
const messagesWrapperRef: Ref<HTMLElement | null> = ref(null);

const emit = defineEmits<{
  (e: 'focus-voice-input'): void;
  (e: 'set-input-text', text: string): void;
}>();

const activeAgent = computed<IAgentDefinition | undefined>(() => agentStore.activeAgent);

const currentMessages = computed<ChatMessageFE[]>(() => {
  if (!activeAgent.value?.id) return [];
  return chatStore.getMessagesForAgent(activeAgent.value.id) as ChatMessageFE[];
});

const isMainContentLoading = computed<boolean>(() => {
  return chatStore.isMainContentStreaming;
});

const showWelcomePlaceholder = computed<boolean>(() => {
  return currentMessages.value.length === 0 && !isMainContentLoading.value;
});

const welcomeTitle = computed<string>(() => {
  const agentName = activeAgent.value?.label || t('agent.defaultName');
  return t('agent.ready', { name: agentName });
});

const welcomeSubtitle = computed<string>(() => {
  return activeAgent.value?.inputPlaceholder || t('agent.defaultPlaceholder');
});

const welcomeLogoComponent = computed<VueComponentType | FunctionalComponent | DefineComponent>(() => {
  const icon = activeAgent.value?.iconComponent;
  if (icon && (typeof icon === 'object' || typeof icon === 'function')) {
    return icon;
  }
  return SparklesIcon;
});

const loadingText = computed<string>(() => {
  const agentName = activeAgent.value?.label || t('agent.defaultName');
  return t('agent.typing', { name: agentName });
});

const scrollToBottom = async (behavior: ScrollBehavior = 'auto'): Promise<void> => {
  await nextTick();
  if (messagesWrapperRef.value) {
    const el = messagesWrapperRef.value;
    const scrollThreshold = el.clientHeight * 0.75;
    const userHasScrolledSignificantlyUp = (el.scrollHeight - el.scrollTop - el.clientHeight) > scrollThreshold;

    if (behavior === 'smooth' || !userHasScrolledSignificantlyUp || el.scrollTop === 0) {
      el.scrollTo({
        top: el.scrollHeight,
        behavior: behavior
      });
    }
  }
};

const handleExamplePromptClick = (promptText: string): void => {
  emit('set-input-text', promptText);
  emit('focus-voice-input');
};

watch(currentMessages, (newMessages, oldMessages) => {
  const newMessagesArrived = newMessages.length > (oldMessages?.length || 0);
  if (newMessagesArrived) {
    const lastMessage = newMessages[newMessages.length - 1];
    if (lastMessage?.role === 'user' || lastMessage?.role === 'assistant') {
      scrollToBottom('smooth');
    }
  }
}, { deep: true });

watch(() => chatStore.isMainContentStreaming, (isStreaming, wasStreaming) => {
  if (isStreaming && !wasStreaming) {
    scrollToBottom('smooth');
  } else if (!isStreaming && wasStreaming) {
    scrollToBottom('smooth');
  }
});

onMounted(() => {
  if (currentMessages.value.length > 0) {
    scrollToBottom('auto');
  }
});

onUpdated(() => {
  // Consider if this is still needed or if watchers are sufficient.
  // Can cause too frequent scrolling if not careful.
  // if (currentMessages.value.length > 0 && !chatStore.isMainContentStreaming) {
  //   scrollToBottom('auto');
  // }
});

const getMessageKey = (msg: ChatMessageFE, index: number): string => {
  return `msg-${msg.role}-${msg.timestamp || 'no-ts'}-${index}`;
};

</script>

<template>
  <div class="chat-window-container-ephemeral" ref="chatWindowContainerRef" role="log" aria-live="polite" tabindex="-1">
    <div class="chat-messages-wrapper-ephemeral" ref="messagesWrapperRef">
      <div v-if="showWelcomePlaceholder" class="welcome-placeholder-ephemeral" aria-labelledby="welcome-title" aria-describedby="welcome-subtitle">
        <component :is="welcomeLogoComponent" class="welcome-logo-ephemeral" :class="activeAgent?.iconClass" aria-hidden="true" />
        <h2 id="welcome-title" class="welcome-title-ephemeral">
          {{ welcomeTitle }}
        </h2>
        <p id="welcome-subtitle" class="welcome-subtitle-ephemeral">
          {{ welcomeSubtitle }}
        </p>
        <div v-if="activeAgent?.examplePrompts && activeAgent.examplePrompts.length > 0" class="example-prompts-grid-ephemeral">
          <button
            v-for="(prompt, idx) in activeAgent.examplePrompts.slice(0, 4)"
            :key="`prompt-${activeAgent.id || 'agent'}-${idx}`"
            class="prompt-tag-ephemeral btn btn-outline-ephemeral"
            @click="handleExamplePromptClick(prompt)" :title="`Use prompt: ${prompt}`"
          >
            {{ prompt }}
          </button>
        </div>
      </div>

      <template v-else-if="currentMessages.length > 0">
        <Message
          v-for="(msg, index) in currentMessages"
          :key="getMessageKey(msg, index)"
          :message="msg"
          :previous-message-sender="index > 0 ? currentMessages[index - 1].role : null"
          :is-last-message-in-group="index === currentMessages.length - 1 || (index < currentMessages.length - 1 && currentMessages[index+1].role !== msg.role)"
        />
      </template>

      <div v-if="isMainContentLoading" class="loading-indicator-chat-ephemeral" aria-label="Assistant is generating response">
        <div class="message-wrapper-ephemeral assistant-message-wrapper loading-message-wrapper">
          <div v-if="activeAgent" class="avatar-wrapper-ephemeral avatar-assistant" aria-hidden="true" >
            <component :is="activeAgent.iconComponent || AssistantAvatarIcon" class="avatar-svg-ephemeral" />
          </div>
          <div class="message-container-ephemeral assistant-bubble-ephemeral is-last-in-group">
             <div class="message-header-ephemeral">
                <span class="sender-name-ephemeral">{{ activeAgent?.label || 'Assistant' }}</span>
             </div>
            <div class="message-content-area-ephemeral prose-ephemeral" :class="{'prose-invert': uiStore.isCurrentThemeDark }">
                <div class="spinner-dots-ephemeral" role="status" aria-hidden="true">
                  <div class="dot-ephemeral dot-1"></div>
                  <div class="dot-ephemeral dot-2"></div>
                  <div class="dot-ephemeral dot-3"></div>
                </div>
                <p v-if="!chatStore.streamingMainContentText" class="loading-text-ephemeral-inline">{{ loadingText }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss">
// Styles for ChatWindow.vue are primarily in frontend/src/styles/components/_chat-window.scss

.loading-text-ephemeral-inline {
  display: inline-block;
  margin-left: var.$spacing-xs;
  font-style: italic;
  color: hsl(var(--color-text-muted-h), var(--color-text-muted-s), var(--color-text-muted-l));
}
</style>