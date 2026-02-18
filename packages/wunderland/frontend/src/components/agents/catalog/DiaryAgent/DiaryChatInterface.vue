<template>
  <div class="diary-chat-interface-v2">
    <div ref="chatLogContainerRef" class="chat-log-v2">
      <TransitionGroup name="chat-message-anim" tag="div">
        <div
          v-for="(message, index) in messages"
          :key="message.timestamp ?? message.role + '-' + index"
          class="chat-message-wrapper-v2"
          :class="`role-${message.role}`"
        >
          <div class="message-bubble-v2">
            <div v-if="message.role === 'assistant' && message.tool_calls && message.tool_calls.length > 0" class="tool-call-display-v2">
                <p class="font-medium text-xs mb-1">Echo wants to use a tool: <span class="font-mono text-blue-400">{{message.tool_calls[0].function.name}}</span></p>
                <pre class="text-xxs bg-black/20 p-1.5 rounded overflow-x-auto">{{message.tool_calls[0].function.arguments}}</pre>
                <p v-if="message.content" class="mt-1 text-xs italic">{{message.content}}</p>
                 </div>
            <div v-else v-html="renderMarkdown(message.content || '')"></div>
            <div class="message-timestamp-v2">{{ formatTimestamp(message.timestamp ?? 0) }}</div>
          </div>
        </div>
      </TransitionGroup>
      <div v-if="isLoadingLlm && messages.length > 0" class="loading-dots-v2">
        <span></span><span></span><span></span>
      </div>
    </div>
    <div class="chat-input-area-v2">
      <textarea
        ref="chatInputRef"
        v-model="userInput"
        @keydown.enter.exact.prevent="handleSend"
        @keydown.enter.shift.prevent="userInput += '\n'"
        placeholder="Chat with Echo or add to your entry..."
        class="chat-textarea-v2"
        rows="1"
        :disabled="isLoadingLlm"
      ></textarea>
      <button @click="handleSend" class="send-button-v2" :disabled="!userInput.trim() || isLoadingLlm">
        <PaperAirplaneIcon class="w-5 h-5" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, type PropType } from 'vue';
import type { ChatMessageFE } from '@/utils/api';
import { marked } from 'marked';
import { PaperAirplaneIcon } from '@heroicons/vue/24/solid';

const props = defineProps({
  messages: { type: Array as PropType<ChatMessageFE[]>, required: true },
  isLoadingLlm: { type: Boolean, default: false },
  agentDisplayName: { type: String, default: 'Echo' },
});

const emit = defineEmits<{
  (e: 'send-message', text: string): void;
}>();

const userInput = ref('');
const chatInputRef = ref<HTMLTextAreaElement | null>(null);
const chatLogContainerRef = ref<HTMLElement | null>(null);

const renderMarkdown = (md: string) => marked.parse(md, { breaks: true, gfm: true }); // Note: sanitize option removed, handle sanitization separately if needed

const formatTimestamp = (ts: number) => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const handleSend = () => {
  if (userInput.value.trim()) {
    emit('send-message', userInput.value.trim());
    userInput.value = '';
    nextTick(adjustTextareaHeight);
  }
};

const scrollToBottom = () => {
  nextTick(() => {
    chatLogContainerRef.value?.scrollTo({ top: chatLogContainerRef.value.scrollHeight, behavior: 'smooth' });
  });
};

const adjustTextareaHeight = () => {
    if(chatInputRef.value){
        chatInputRef.value.style.height = 'auto';
        const maxHeight = 120; // Max height for 5-6 lines approx
        chatInputRef.value.style.height = `${Math.min(chatInputRef.value.scrollHeight, maxHeight)}px`;
    }
};

watch(() => props.messages, () => {
  scrollToBottom();
}, { deep: true });

watch(userInput, adjustTextareaHeight);

</script>

<style lang="scss" scoped>
@use '@/styles/abstracts/variables' as var;
@use '@/styles/abstracts/mixins' as mixins;

.diary-chat-interface-v2 {
  @apply flex flex-col h-full overflow-hidden;
  background-color: hsl(var(--diary-bg-h), var(--diary-bg-s), calc(var(--diary-bg-l) + 1%));
}

.chat-log-v2 {
  @apply flex-grow p-3 space-y-2.5 overflow-y-auto;
  @include mixins.custom-scrollbar-for-themed-panel('--diary');
}
.chat-message-wrapper-v2 {
  @apply flex;
  &.role-user { @apply justify-end; }
  &.role-assistant, &.role-system, &.role-error { @apply justify-start; }

  .message-bubble-v2 {
    @apply p-2.5 rounded-xl max-w-[80%] sm:max-w-[70%] text-sm shadow-md break-words;
    border: 1px solid transparent;
    position: relative;

    :deep(p) { @apply mb-1 last:mb-0; }
    :deep(ul), :deep(ol) { @apply pl-4 my-1; }
    :deep(pre) { @apply my-1.5 text-xs; } // Handled by CompactMessageRenderer if used, or global prose
  }
  &.role-user .message-bubble-v2 {
    background-color: hsl(var(--diary-secondary-accent-h), var(--diary-secondary-accent-s), calc(var(--diary-secondary-accent-l) - 10%));
    color: var(--color-text-on-accent); // Ensure good contrast
    border-color: hsla(var(--diary-secondary-accent-h), var(--diary-secondary-accent-s), var(--diary-secondary-accent-l), 0.5);
  }
  &.role-assistant .message-bubble-v2 {
    background-color: hsla(var(--diary-bg-h), var(--diary-bg-s), calc(var(--diary-bg-l) + 8%), 0.9);
    border-color: hsla(var(--diary-accent-h), var(--diary-accent-s), var(--diary-accent-l), 0.2);
    color: var(--color-text-secondary);
  }
   &.role-error .message-bubble-v2 {
    background-color: hsla(var(--color-error-h), var(--color-error-s), var(--color-error-l), 0.15);
    border-color: hsla(var(--color-error-h), var(--color-error-s), var(--color-error-l), 0.3);
    color: var(--color-error-text);
  }
}
.message-timestamp-v2 {
  @apply text-xxs opacity-60 mt-1 text-right;
  &.role-user .message-bubble-v2 & { color: hsla(var(--diary-secondary-accent-h), var(--diary-secondary-accent-s), calc(var(--diary-secondary-accent-l) + 30%), 0.8); }
  &.role-assistant .message-bubble-v2 & { color: var(--color-text-muted); }
}
.tool-call-display-v2 {
    @apply border-l-2 pl-2 text-xs;
    border-color: hsl(var(--diary-accent-h), var(--diary-accent-s), var(--diary-accent-l));
}


.loading-dots-v2 {
  @apply flex items-center gap-1 p-2 ml-2 w-fit;
  span {
    @apply w-1.5 h-1.5 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce;
    &:nth-child(1) { animation-delay: -0.3s; }
    &:nth-child(2) { animation-delay: -0.15s; }
  }
}
@keyframes bounce { 0%, 80%, 100% { transform: scale(0); } 40% { transform: scale(1.0); } }

.chat-input-area-v2 {
  @apply flex items-end p-2 border-t shrink-0 gap-2;
  background-color: hsla(var(--diary-bg-h), var(--diary-bg-s), calc(var(--diary-bg-l) + 5%), 0.95);
  border-top-color: hsla(var(--diary-accent-h), var(--diary-accent-s), var(--diary-accent-l), 0.15);
}
.chat-textarea-v2 {
  @apply flex-grow p-2 rounded-lg text-sm resize-none border bg-transparent;
  border-color: hsla(var(--diary-accent-h), var(--diary-accent-s), var(--diary-accent-l), 0.3);
  color: var(--color-text-primary);
  min-height: 40px; // Approx 1 line
  max-height: 120px; // Approx 5-6 lines
  @include mixins.custom-scrollbar-for-themed-panel('--diary');
  &:focus {
    outline: none;
    border-color: hsl(var(--diary-accent-h), var(--diary-accent-s), var(--diary-accent-l));
    box-shadow: 0 0 0 2px hsla(var(--diary-accent-h), var(--diary-accent-s), var(--diary-accent-l), 0.2);
  }
}
.send-button-v2 {
  @apply p-2 rounded-lg transition-colors shrink-0;
  background-color: hsl(var(--diary-accent-h), var(--diary-accent-s), var(--diary-accent-l));
  color: var(--color-text-on-accent, white);
  &:hover:not(:disabled) {
    background-color: hsl(var(--diary-accent-h), var(--diary-accent-s), calc(var(--diary-accent-l) - 8%));
  }
  &:disabled { @apply opacity-50 cursor-not-allowed; }
}

.chat-message-anim-enter-active, .chat-message-anim-leave-active {
  transition: all 0.3s ease-out;
}
.chat-message-anim-enter-from {
  opacity: 0;
  transform: translateY(15px) scale(0.98);
}
.chat-message-anim-leave-to {
  opacity: 0;
  transform: translateY(-10px) scale(0.95);
}

</style>
