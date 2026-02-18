// File: frontend/src/components/Message.vue
/**
 * @file Message.vue
 * @description Component to render an individual chat message.
 * Features role-based styling, avatars, Markdown rendering, code highlighting,
 * text animation for assistant messages, and a hover-activated copy toolbar.
 * Adheres to the "Ephemeral Harmony" design system.
 *
 * @component Message
 * @props {ChatMessageFE} message - The chat message object.
 * @props {string | null} [previousMessageSender=null] - Role of the previous sender for grouping.
 * @props {boolean} [isLastMessageInGroup=true] - True if last in a sender's group.
 *
 * @emits copy-error - On clipboard copy failure.
 * @emits copy-success - On successful clipboard copy.
 *
 * @version 4.2.2 - Removed invalid ALLOWED_CLASSES from DOMPurify config.
 */
<script setup lang="ts">
import { computed, inject, ref, type PropType, type Component as VueComponentType, watch, nextTick, onBeforeUnmount } from 'vue';
import { type ChatMessageFE, type ILlmToolCallFE } from '@/utils/api';
import { useUiStore } from '@/store/ui.store';
import { marked, Renderer as MarkedRenderer } from 'marked';
import DOMPurify from 'dompurify';
import hljs from 'highlight.js';
import type { ToastService } from '@/services/services';
import { useTextAnimation, type TextRevealConfig } from '@/composables/useTextAnimation';

import {
  UserCircleIcon as UserAvatarIcon,
  CpuChipIcon as AssistantAvatarIcon,
  WrenchScrewdriverIcon as ToolAvatarIcon,
  InformationCircleIcon as SystemAvatarIcon,
  ExclamationTriangleIcon as ErrorAvatarIcon,
  ClipboardDocumentIcon,
} from '@heroicons/vue/24/outline';

const props = defineProps({
  message: { type: Object as PropType<ChatMessageFE>, required: true },
  previousMessageSender: { type: String as PropType<string | null>, default: null },
  isLastMessageInGroup: { type: Boolean as PropType<boolean>, default: true },
});

const emit = defineEmits<{
  (e: 'copy-error', error: Error): void;
  (e: 'copy-success', copiedText: string): void;
}>();

const uiStore = useUiStore();
const toast = inject<ToastService>('toast');
const showMessageToolbar = ref(false);

const { animatedUnits, animateText, resetAnimation, isAnimating } = useTextAnimation();

const isSystemOrError = computed<boolean>(() => props.message.role === 'system' || props.message.role === 'error');

const avatarIcon = computed<VueComponentType>(() => {
  switch (props.message.role) {
    case 'user': return UserAvatarIcon;
    case 'assistant': return AssistantAvatarIcon;
    case 'tool': return ToolAvatarIcon;
    case 'system': return SystemAvatarIcon;
    case 'error': return ErrorAvatarIcon;
    default: return SystemAvatarIcon;
  }
});

const avatarRoleClass = computed<string>(() => `avatar-${props.message.role}`);

const senderName = computed<string>(() => {
  switch (props.message.role) {
    case 'user': return 'You';
    case 'assistant': return props.message.agentId || 'Assistant';
    case 'tool': return `Tool (${props.message.name || 'System Tool'})`;
    case 'system': return 'System';
    case 'error': return 'Error Notification';
    default:
      const _exhaustiveCheck: never = props.message.role;
      return 'Unknown Sender';
  }
});

const formattedTimestamp = computed<string>(() => {
  if (!props.message.timestamp) return '';
  return new Date(props.message.timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
});

const renderer = new MarkedRenderer();
renderer.code = (code: string, languageString: string | undefined): string => {
  const language = (languageString || 'plaintext').toLowerCase().split(/[\s{]/)[0];
  const validLanguage = hljs.getLanguage(language) ? language : 'plaintext';
  const highlightedCode = hljs.highlight(code, { language: validLanguage, ignoreIllegals: true }).value;
  const lines = highlightedCode.split('\n');
  const numberedCode = lines.map((lineContent, index) =>
    `<span class="line-number" aria-hidden="true">${index + 1}</span><span class="line-content">${lineContent || '&nbsp;'}</span>`
  ).join('\n');

  const copyIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" /></svg>`;
  const copiedIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4 text-[hsl(var(--color-success-h),var(--color-success-s),var(--color-success-l))]"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.06 0l4.002-5.5a.75.75 0 00-.326-1.075z" clip-rule="evenodd" /></svg>`;

  return `
    <div class="code-block-wrapper" data-language="${validLanguage}">
      <div class="code-header-ephemeral">
        <span class="code-language-label">${validLanguage}</span>
        <button class="copy-code-button btn btn-xs-ephemeral btn-ghost-ephemeral" title="Copy Code Snippet" aria-label="Copy code snippet">
          <span class="copy-icon-placeholder">${copyIconSvg}</span>
          <span class="copied-icon-placeholder" style="display:none;">${copiedIconSvg}</span>
        </button>
      </div>
      <pre><code class="hljs ${validLanguage} line-numbered">${numberedCode}</code></pre>
    </div>`;
};
marked.setOptions({
  renderer: renderer,
  gfm: true,
  breaks: true,
});

const renderedContent = computed<string>(() => {
  if (props.message.content) {
    const rawHtml = marked.parse(props.message.content) as string;
    // Corrected DOMPurify configuration: removed invalid ALLOWED_CLASSES
    return DOMPurify.sanitize(rawHtml, {
      USE_PROFILES: { html: true },
      ADD_ATTR: ['target', 'start'], // Allow target for links, start for ol
      ADD_TAGS: ['span'],           // Allow span for line numbers/content used by custom renderer + hljs
      // Class attributes on allowed tags (like <span>) are generally preserved by default.
      // If specific filtering of classes is needed, DOMPurify hooks would be the advanced approach.
    });
  }
  if (props.message.tool_calls && props.message.tool_calls.length > 0) {
    const toolNames = props.message.tool_calls.map((tc: ILlmToolCallFE) => tc.function.name).join(', ');
    return `<em class="tool-call-summary-text">Assistant initiated tool call${props.message.tool_calls.length > 1 ? 's' : ''}: ${toolNames}.</em>`;
  }
  return '<em class="opacity-70">[Empty message content]</em>';
});

const messageWrapperClasses = computed(() => ({
  'message-wrapper-ephemeral': true,
  [`${props.message.role}-message-wrapper`]: true,
}));

const messageBubbleClasses = computed(() => ({
  'message-container-ephemeral': true,
  [`${props.message.role}-bubble-ephemeral`]: true,
  'system-error-bubble-ephemeral': isSystemOrError.value,
  'user-message-for-tail': props.message.role === 'user',
  'assistant-message-for-tail': props.message.role === 'assistant',
  'is-last-in-group': props.isLastMessageInGroup,
}));

const copyMessageContent = async (): Promise<void> => {
  const contentToCopy = props.message.content ||
                        (props.message.tool_calls ? `[Tool call: ${props.message.tool_calls.map((tc: ILlmToolCallFE) => tc.function.name).join(', ')}]` : '');

  if (!contentToCopy.trim()) {
    toast?.add({ type: 'warning', title: 'Nothing to Copy', message: 'This message has no text content.', duration: 3000 });
    return;
  }
  try {
    await navigator.clipboard.writeText(contentToCopy.trim());
    toast?.add({ type: 'success', title: 'Message Copied!', duration: 2000 });
    emit('copy-success', contentToCopy.trim());
  } catch (err) {
    console.error('Failed to copy message content: ', err);
    toast?.add({ type: 'error', title: 'Copy Failed', message: 'Could not copy content to clipboard.', duration: 3000 });
    emit('copy-error', err as Error);
  }
};

const handleCodeCopy = async (event: Event) => {
  const button = (event.target as HTMLElement).closest('.copy-code-button');
  if (!button) return;

  const pre = button.closest('.code-block-wrapper')?.querySelector('pre code');
  if (!pre) return;

  const codeToCopy = Array.from(pre.querySelectorAll('.line-content'))
                      .map(line => line.textContent || '')
                      .join('\n')
                      .trim();

  if (!codeToCopy) {
    toast?.add({ type: 'warning', title: 'Nothing to Copy', message: 'Code block is empty.', duration: 3000 });
    return;
  }
  try {
    await navigator.clipboard.writeText(codeToCopy);
    toast?.add({ type: 'success', title: 'Code Copied!', duration: 2000 });
    const copyIconEl = button.querySelector('.copy-icon-placeholder');
    const copiedIconEl = button.querySelector('.copied-icon-placeholder');
    if (copyIconEl && copiedIconEl) {
      (copyIconEl as HTMLElement).style.display = 'none';
      (copiedIconEl as HTMLElement).style.display = 'inline-block';
      setTimeout(() => {
        (copyIconEl as HTMLElement).style.display = 'inline-block';
        (copiedIconEl as HTMLElement).style.display = 'none';
      }, 2000);
    }
  } catch (err) {
    console.error('Failed to copy code: ', err);
    toast?.add({ type: 'error', title: 'Copy Failed', message: 'Could not copy code.', duration: 3000 });
  }
};

const shouldAnimateContent = computed(() => {
  return props.message.role === 'assistant' && props.message.content && props.message.content.trim() !== '';
});

watch(() => props.message, async (newMessage, oldMessage) => {
  const isNewMessageInstance = newMessage !== oldMessage;
  const contentActuallyChanged = newMessage.content !== oldMessage?.content;
  // Ensure newMessage.content is a string before passing to animateText
  const isValidAssistantMessageForAnimation = newMessage.role === 'assistant' && typeof newMessage.content === 'string' && newMessage.content.trim() !== '';

  if (isValidAssistantMessageForAnimation) {
    if (isNewMessageInstance || contentActuallyChanged) {
      resetAnimation();
      await nextTick();
      const animationConfig: Partial<TextRevealConfig> = {
        mode: 'word',
        // durationPerUnit: uiStore.isReducedMotionPreferred ? 5 : 40,
        staggerDelay: uiStore.isReducedMotionPreferred ? 2 : 20,
        animationStyle: 'organic',
      };
      // newMessage.content is guaranteed to be a string here due to isValidAssistantMessageForAnimation check
      animateText(newMessage.content!, animationConfig);
    }
  } else {
    if (isAnimating.value || animatedUnits.value.length > 0) {
      resetAnimation();
    }
  }
}, { immediate: true, deep: true });

onBeforeUnmount(() => {
  resetAnimation();
});

</script>

<template>
  <div :class="messageWrapperClasses" role="listitem">
    <div
      v-if="!isSystemOrError"
      class="avatar-wrapper-ephemeral"
      :class="avatarRoleClass"
      aria-hidden="true"
    >
      <component :is="avatarIcon" class="avatar-svg-ephemeral" />
    </div>

    <div
      class="message-container-ephemeral"
      :class="messageBubbleClasses"
      @mouseenter="showMessageToolbar = true"
      @mouseleave="showMessageToolbar = false"
      tabindex="0"
      :aria-label="`Message from ${senderName} at ${formattedTimestamp}. Content: ${message.content ? message.content.substring(0, 100) + '...' : (message.tool_calls ? 'Tool actions requested.' : 'No text content.')}`"
    >
      <div class="message-header-ephemeral" v-if="!isSystemOrError">
        <span class="sender-name-ephemeral">{{ senderName }}</span>
        <span class="timestamp-ephemeral">{{ formattedTimestamp }}</span>
      </div>

      <div
        v-if="shouldAnimateContent && (isAnimating || (animatedUnits.length > 0 && message.content && animatedUnits[0]?.content?.startsWith(message.content.substring(0,1))))"
        class="message-content-area-ephemeral animated-text-container prose-ephemeral"
        :class="{'prose-invert': uiStore.isCurrentThemeDark && props.message.role !== 'user' && props.message.role !== 'tool'}"
        @click.capture="handleCodeCopy"
      >
        <span
          v-for="unit in animatedUnits"
          :key="unit.key"
          :style="unit.style"
          :class="[
            ...unit.classes,
            (unit.type === 'word' && unit.content.includes('\n')) || (unit.type === 'char' && unit.content === '\n') ? 'whitespace-pre-wrap' : ''
          ]"
        >{{ unit.content }}</span>
      </div>
      <div
        v-else
        class="message-content-area-ephemeral prose-ephemeral"
        :class="{'prose-invert': uiStore.isCurrentThemeDark && props.message.role !== 'user' && props.message.role !== 'tool'}"
        v-html="renderedContent"
        @click.capture="handleCodeCopy"
      ></div>

      <Transition name="fade-in-toolbar">
        <div v-if="showMessageToolbar && (message.content || message.tool_calls) && !isSystemOrError" class="message-toolbar-ephemeral">
          <button
            @click.stop="copyMessageContent"
            class="btn btn-xs-ephemeral btn-ghost-ephemeral btn-icon-ephemeral message-action-button"
            title="Copy message text"
            aria-label="Copy message text to clipboard"
          >
            <ClipboardDocumentIcon class="icon-xs" />
          </button>
        </div>
      </Transition>

    </div>
  </div>
</template>

<style lang="scss">
// Styles for Message.vue are primarily in frontend/src/styles/components/_message.scss

.fade-in-toolbar-enter-active,
.fade-in-toolbar-leave-active {
  transition: opacity 0.2s var.$ease-out-quad, transform 0.2s var.$ease-out-quad;
}
.fade-in-toolbar-enter-from,
.fade-in-toolbar-leave-to {
  opacity: 0;
  transform: translateY(3px) scale(0.95);
}

.message-toolbar-ephemeral {
  position: absolute;
  top: var.$spacing-xs;
  right: var.$spacing-xs; // Default for LTR, adjust in _message.scss for user messages
  display: flex;
  gap: var.$spacing-xs;
  background-color: hsla(var(--color-bg-tertiary-h), var(--color-bg-tertiary-s), var(--color-bg-tertiary-l), 0.65);
  padding: calc(var.$spacing-xs / 1.8);
  border-radius: var.$radius-md;
  backdrop-filter: blur(4px);
  box-shadow: var(--shadow-depth-sm);
  z-index: 3;
}

.message-action-button {
  color: hsl(var(--color-text-muted-h), var(--color-text-muted-s), calc(var(--color-text-muted-l) + 15%));
  .icon-xs { width: 0.95rem; height: 0.95rem; }

  &:hover {
    color: hsl(var(--color-accent-interactive-h), var(--color-accent-interactive-s), var(--color-accent-interactive-l));
    background-color: hsla(var(--color-accent-interactive-h), var(--color-accent-interactive-s), var(--color-accent-interactive-l), 0.1) !important;
  }
}

.whitespace-pre-wrap {
  white-space: pre-wrap;
}
.animated-text-container {
  span {
    display: inline-block;
    &.whitespace-pre-wrap { // More specific handling for newlines if they are single char units
      display: block;
      height: 0;
      content: ''; // Ensure it doesn't add visual artifacts if it's just a newline character
    }
  }
  // Apply prose styling if this replaces a prose div
  &.prose-ephemeral {
    // Standard prose styles from _typography.scss or global styles will apply to spans.
    // For example, if prose sets p { margin-bottom: ... }, it won't directly apply to spans here.
    // You might need to add specific typography styles to animated units if they need to mimic block elements.
    // For now, word/character animations are best for flowing text.
  }
}
</style>