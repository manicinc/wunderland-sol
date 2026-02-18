/**
 * @file AgentChatLog.vue
 * @description Displays the conversational chat history for the active agent.
 * @version 1.0.3 - Corrected onMounted import and moved styles to SCSS.
 */
<script setup lang="ts">
import { computed, watch, nextTick, PropType, ref as vueRef, onMounted } from 'vue'; // <-- ADDED onMounted HERE
import { useChatStore } from '@/store/chat.store';
import Message from '@/components/Message.vue';
import type { AgentId } from '@/services/agent.service';
import type { ChatMessage as StoreChatMessage } from '@/store/chat.store';

const chatStore = useChatStore();

const props = defineProps<{
    agentId: AgentId;
}>();

// Define the type for the message objects to be displayed
interface DisplayableMessage {
    id: string;
    role: 'user' | 'assistant' | 'system' | 'error' | 'tool';
    content: string;
    timestamp: number;
    isError?: boolean;
    tool_calls?: any[];
    tool_call_id?: string;
    name?: string;
}
const displayableMessages = computed<DisplayableMessage[]>(() => {
    return chatStore.getMessagesForAgent(props.agentId)
        .filter(msg => msg.role === 'user' || msg.role === 'assistant' || msg.role === 'error' || msg.role === 'tool')
        .map((msg: StoreChatMessage): DisplayableMessage => ({
            id: msg.id, // ID is crucial for MessageData
            role: msg.role as DisplayableMessage['role'],
            content: msg.content ?? '',
            timestamp: msg.timestamp,
            isError: msg.isError,
            tool_calls: msg.tool_calls,
            tool_call_id: msg.tool_call_id,
            name: msg.name,
        }));
});

// Reference to the chat log container
let chatLogRef = vueRef<HTMLElement | null>(null);

const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    nextTick(() => {
        if (chatLogRef.value) {
            chatLogRef.value.scrollTo({
                top: chatLogRef.value.scrollHeight,
                behavior: behavior
            });
        }
    });
};

watch(displayableMessages, () => {
    scrollToBottom('auto');
}, { deep: true, immediate: true });

onMounted(() => {
  nextTick(scrollToBottom);
    //  set chatLogRef 
    chatLogRef = vueRef(document.querySelector('.agent-chat-log') as HTMLElement | null);
    if (chatLogRef.value) {
        chatLogRef.value.scrollTo({
            top: chatLogRef.value.scrollHeight,
            behavior: 'auto'
        });
    }
});

defineExpose({
  scrollToBottom
});
</script>

<template>
    <div ref="chatLogRef" class="agent-chat-log flex-grow p-3 md:p-4 space-y-3 overflow-y-auto">
        <transition-group name="chat-message-fade" tag="div">
            <Message
                v-for="(message, index) in displayableMessages"
                :key="message.id ?? `msg-fallback-${message.timestamp}-${index}`" 
                :message="message"
                class="chat-message-item"
            />
        </transition-group>
        <div v-if="displayableMessages.length === 0" class="empty-chat-placeholder">
            Chat log is empty for {{ agentId }}. Start a conversation!
        </div>
    </div>
</template>