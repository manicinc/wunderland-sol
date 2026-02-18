// File: frontend/src/components/EphemeralChatLog.vue
/**
 * @file EphemeralChatLog.vue
 * @description Displays a dynamic and themeable log of recent chat messages.
 * Features a compact "holographic ghost" state by default, which becomes more opaque on hover
 * and can be expanded to a more detailed history view. Supports configurable message counts
 * and remembers scroll position across state changes.
 *
 * @component EphemeralChatLog
 * @props None. Relies on `agentStore`, `chatStore`, and `voiceSettingsManager`.
 * @emits None.
 *
 * @version 2.1.1 - Corrected function calls for scrolling and removed unused icon imports.
 */
<script setup lang="ts">
import { computed, watch, ref, nextTick, onMounted, onUnmounted, onUpdated, type Ref } from 'vue'; // Added onUnmounted
import { useChatStore, type ChatMessage } from '@/store/chat.store';
import { useAgentStore } from '@/store/agent.store';
import { voiceSettingsManager } from '@/services/voice.settings.service';
import { marked } from 'marked';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/vue/24/outline'; // Removed EyeIcon, EyeSlashIcon

/** Access the chat store for messages. */
const chatStore = useChatStore();
/** Access the agent store for agent-specific capabilities like showing the log. */
const agentStore = useAgentStore();

/** @ref {Ref<HTMLElement | null>} scrollAreaRef - Template ref for the scrollable content div. */
const scrollAreaRef: Ref<HTMLElement | null> = ref(null);
/** @ref {Ref<HTMLElement | null>} logContainerRef - Template ref for the main container of the log. */
const logContainerRef: Ref<HTMLElement | null> = ref(null);

/** @ref {Ref<boolean>} isExpanded - Controls the expanded (detailed history) or collapsed (compact ghost) state of the log. */
const isExpanded: Ref<boolean> = ref(false);
/** @ref {Ref<number | null>} scrollTopBeforeCollapse - Stores the scroll position before collapsing the log. */
const scrollTopBeforeCollapse: Ref<number | null> = ref(null);

/** @ref {Ref<boolean>} isHovering - True if the mouse is currently hovering over the log container. */
const isHovering: Ref<boolean> = ref(false);
/** @ref {Ref<boolean>} isSustainedHover - True if hover has been sustained for a certain duration, triggering max opacity. */
const isSustainedHover: Ref<boolean> = ref(false);
/** @ref {Ref<boolean>} hasBeenInteractedRecently - True if the log was recently hovered or expanded, maintaining a slightly higher base opacity. */
const hasBeenInteractedRecently: Ref<boolean> = ref(false);

/** @type {number | null} hoverSustainTimer - Timer ID for detecting sustained hover. */
let hoverSustainTimer: number | null = null;
/** @type {number | null} recentInteractionTimer - Timer ID for resetting `hasBeenInteractedRecently`. */
let recentInteractionTimer: number | null = null;

/** @const {number} SUSTAINED_HOVER_DURATION_MS - Duration (ms) to consider hover as sustained. */
const SUSTAINED_HOVER_DURATION_MS = 300; // Reduced from 1500ms for quicker response
/** @const {number} RECENT_INTERACTION_TIMEOUT_MS - Duration (ms) to keep log slightly more opaque after interaction. */
const RECENT_INTERACTION_TIMEOUT_MS = 2000; // Reduced from 5000ms for snappier feel

/**
 * @computed {number} maxMessagesCompact
 * @description Retrieves the maximum number of messages for the compact log view from settings.
 */
const maxMessagesCompact = computed(() => voiceSettingsManager.settings.ephemeralLogMaxCompact);

/**
 * @computed {number} maxMessagesExpanded
 * @description Retrieves the maximum number of messages for the expanded log view from settings.
 */
const maxMessagesExpanded = computed(() => voiceSettingsManager.settings.ephemeralLogMaxExpanded);

/**
 * @computed showLog
 * @description Determines if the ephemeral log should be shown based on agent capabilities.
 * @returns {boolean}
 */
const showLog = computed<boolean>(() => {
  return agentStore.activeAgent?.capabilities?.showEphemeralChatLog ?? true;
});

/**
 * @computed messagesToDisplay
 * @description Filters and slices messages based on current agent, AI streaming state, and log expansion state.
 * @returns {ChatMessage[]}
 */
const messagesToDisplay = computed<ChatMessage[]>(() => {
  if (!showLog.value || !agentStore.activeAgentId) return [];
  const allAgentMessages = chatStore.getMessagesForAgent(agentStore.activeAgentId);
  if (allAgentMessages.length === 0) return [];
  const maxMessages = isExpanded.value ? maxMessagesExpanded.value : maxMessagesCompact.value;
  if (chatStore.isMainContentStreaming) {
    if (allAgentMessages.length <= 1) return [];
    return allAgentMessages.slice(0, -1).slice(-maxMessages);
  }
  return allAgentMessages.slice(-maxMessages);
});

/**
 * @function renderMarkdown
 * @description Parses markdown content to HTML.
 * @param {string | null} content - Markdown string.
 * @returns {string} HTML string.
 */
const renderMarkdown = (content: string | null): string => {
  return content ? marked.parse(content, { breaks: true, gfm: true, async: false }) as string : '';
};

/**
 * @function scrollToRelevantPosition
 * @description Scrolls the log appropriately based on its state (compact/expanded) and content changes.
 * This function IS USED by watchers and lifecycle hooks.
 * @async
 */
const scrollToRelevantPosition = async (): Promise<void> => { // This function is now correctly named and used
  await nextTick();
  if (scrollAreaRef.value) {
    if (isExpanded.value) {
      if (scrollTopBeforeCollapse.value !== null && messagesToDisplay.value.length >= maxMessagesExpanded.value) {
        scrollAreaRef.value.scrollTop = scrollTopBeforeCollapse.value;
      } else {
        scrollAreaRef.value.scrollTop = scrollAreaRef.value.scrollHeight;
      }
    } else {
      scrollAreaRef.value.scrollTop = 0;
    }
  }
};

const handleMouseEnter = () => {
  isHovering.value = true;
  hasBeenInteractedRecently.value = true;
  // Immediately set sustained hover for instant full visibility
  isSustainedHover.value = true;
  if (recentInteractionTimer) clearTimeout(recentInteractionTimer);
};

const handleMouseLeave = () => {
  isHovering.value = false;
  isSustainedHover.value = false;
  if (recentInteractionTimer) clearTimeout(recentInteractionTimer);
  recentInteractionTimer = window.setTimeout(() => {
    hasBeenInteractedRecently.value = false;
  }, RECENT_INTERACTION_TIMEOUT_MS);
};

const toggleExpandCollapse = (): void => {
  if (scrollAreaRef.value && isExpanded.value) {
    scrollTopBeforeCollapse.value = scrollAreaRef.value.scrollTop;
  }
  isExpanded.value = !isExpanded.value;
  hasBeenInteractedRecently.value = true;
  if (recentInteractionTimer) clearTimeout(recentInteractionTimer);
   recentInteractionTimer = window.setTimeout(() => {
    hasBeenInteractedRecently.value = false;
  }, RECENT_INTERACTION_TIMEOUT_MS);
  // Scroll adjustment will be handled by the watcher after isExpanded changes
};

const containerClasses = computed(() => ({
  'is-expanded': isExpanded.value,
  'is-compact': !isExpanded.value,
  'is-hovering': isHovering.value,
  'is-sustained-hover': isSustainedHover.value,
  'has-been-interacted': hasBeenInteractedRecently.value,
}));

// CORRECTED: Watcher now calls the correctly named function
watch([messagesToDisplay, isExpanded], scrollToRelevantPosition, { deep: true, flush: 'post' });

onMounted(() => {
  scrollToRelevantPosition(); // CORRECTED
  if (logContainerRef.value) {
    logContainerRef.value.addEventListener('mouseenter', handleMouseEnter);
    logContainerRef.value.addEventListener('mouseleave', handleMouseLeave);
  }
});

onUnmounted(() => { // Added onUnmounted for cleanup
  if (logContainerRef.value) {
    logContainerRef.value.removeEventListener('mouseenter', handleMouseEnter);
    logContainerRef.value.removeEventListener('mouseleave', handleMouseLeave);
  }
  if (hoverSustainTimer) clearTimeout(hoverSustainTimer);
  if (recentInteractionTimer) clearTimeout(recentInteractionTimer);
});

onUpdated(() => { // CORRECTED: Ensure scroll happens on update too
    scrollToRelevantPosition();
});

</script>

<template>
  <div
    v-if="showLog && messagesToDisplay.length > 0"
    ref="logContainerRef"
    class="ephemeral-chat-log-container"
    :class="containerClasses"
    :style="{ '--max-ephemeral-messages': isExpanded ? maxMessagesExpanded : maxMessagesCompact }"
    aria-live="polite"
    aria-atomic="false"
    aria-relevant="additions"
    role="log"
    tabindex="-1"
  >
    <div class="ephemeral-chat-log-header">
      <span class="log-title" :aria-label="isExpanded ? 'Showing recent chat history' : 'Showing prior context glance'">
        {{ isExpanded ? 'Recent History' : 'Prior Context' }}
      </span>
      <button
        @click="toggleExpandCollapse"
        class="ephemeral-log-toggle-btn btn btn-icon-ephemeral btn-ghost-ephemeral"
        :title="isExpanded ? 'Collapse Log View' : 'Expand Log View'"
        :aria-expanded="isExpanded"
        aria-controls="ephemeral-log-scroller-content"
      >
        <component :is="isExpanded ? ChevronUpIcon : ChevronDownIcon" class="toggle-icon" />
        <span class="sr-only">{{ isExpanded ? 'Collapse chat history log' : 'Expand chat history log' }}</span>
      </button>
    </div>

    <div class="ephemeral-chat-log-scroller" ref="scrollAreaRef" id="ephemeral-log-scroller-content" tabindex="0">
      <div class="ephemeral-chat-log-content">
        <TransitionGroup name="ephemeral-message-list" tag="ul" role="list">
          <li
            v-for="(message, index) in messagesToDisplay"
            :key="message.id || `eph-msg-${index}`"
            class="ephemeral-message-item"
            :class="[`message-role-${message.role}`]"
            role="listitem"
            :style="{
              '--message-index-from-newest': messagesToDisplay.length - 1 - index,
              '--message-total-in-log': messagesToDisplay.length,
              '--message-index': index
            }"
          >
            <div
              class="message-content prose prose-sm max-w-none"
              v-if="message.content"
              v-html="renderMarkdown(message.content)"
            ></div>
            <div v-else-if="message.tool_calls && message.tool_calls.length > 0" class="message-content tool-call-summary">
              <span class="italic opacity-70">[Assistant initiated tool actions]</span>
            </div>
          </li>
        </TransitionGroup>
      </div>
    </div>
    <div class="ephemeral-chat-log-fade-overlay--top" aria-hidden="true"></div>
    <div class="ephemeral-chat-log-fade-overlay--bottom" aria-hidden="true"></div>
  </div>
</template>

<style lang="scss">

</style>