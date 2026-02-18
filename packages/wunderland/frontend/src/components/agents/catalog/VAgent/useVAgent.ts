// File: frontend/src/components/agents/catalog/VAgent/useVAgent.ts
/**
 * @file useVAgent.ts
 * @description Composable logic for "V" - the Advanced General AI Assistant.
 * @version 1.2.4 - STRICT `isLoadingResponse` logic tied only to this agent's LLM calls.
 */
import { ref, computed, watch, type Ref, readonly } from 'vue'; // Added readonly
import { useAgentStore } from '@/store/agent.store';
import { useChatStore, type MainContent } from '@/store/chat.store';
import type { IAgentDefinition } from '@/services/agent.service';
import { voiceSettingsManager } from '@/services/voice.settings.service';
import { chatAPI, type ChatMessagePayloadFE, type ChatMessageFE, api } from '@/utils/api';
import type { ToastService } from '@/services/services';
import { marked } from 'marked';
import { type AdvancedHistoryConfig, DEFAULT_V_HISTORY_CONFIG, type VAgentComposable } from './VAgentTypes';
// Assuming V doesn't use useTextAnimation for now, or it would be imported.

export function useVAgent(
  agentConfigRef: Ref<IAgentDefinition>,
  toastInstance?: ToastService,
): VAgentComposable {
  const agentStore = useAgentStore();
  const chatStore = useChatStore();
  const toast = toastInstance;
  const agentId = computed(() => agentConfigRef.value.id);

  /**
   * @type {Ref<boolean>}
   * @description Reactive flag indicating if THIS AGENT is currently waiting for a response from the LLM.
   * This should ONLY be true during THIS AGENT'S actual asynchronous API call.
   * This state is watched by VAgentView to emit 'setProcessingState' to PrivateHome.
   */
  const isLoadingResponse = ref(false);
  const currentSystemPrompt = ref('');
  const agentDisplayName = computed(() => agentConfigRef.value?.label || "V");

  const mainContentToDisplay = computed<MainContent | null>(() => chatStore.getMainContentForAgent(agentId.value));

  const fetchSystemPrompt = async (): Promise<void> => {
    const promptKey = agentConfigRef.value.systemPromptKey;
    const agentLabel = agentDisplayName.value;
    console.log(`[${agentLabel} useVAgent] Fetching system prompt with key: ${promptKey}.md`);
    if (promptKey) {
      try {
        const response = await api.get(`/prompts/${promptKey}.md`);
        currentSystemPrompt.value = response.data as string;
        if (!currentSystemPrompt.value.trim()) {
           console.warn(`[${agentLabel} useVAgent] Fetched prompt for key '${promptKey}' is empty. Using fallback.`);
           currentSystemPrompt.value = "You are V, a sophisticated AI assistant. Your primary directive is to provide insightful, articulate, and comprehensive responses. Generate detailed explanations, code, and diagrams (using Mermaid syntax when appropriate and `{{GENERATE_DIAGRAM}}` is true) to assist the user effectively.";
        }
      } catch (e) {
        console.error(`[${agentLabel} useVAgent}] Error loading prompt '${promptKey}.md':`, e);
        currentSystemPrompt.value = "You are V, a sophisticated AI assistant. Your primary directive is to provide insightful, articulate, and comprehensive responses. Generate detailed explanations, code, and diagrams (using Mermaid syntax when appropriate and `{{GENERATE_DIAGRAM}}` is true) to assist the user effectively.";
        toast?.add({ type: 'warning', title: 'Prompt Load Error', message: `Could not load custom instructions for ${agentDisplayName.value}. Using robust fallback.`});
      }
    } else {
      console.error(`[${agentLabel} useVAgent}] No systemPromptKey defined for agent. Using robust fallback.`);
      currentSystemPrompt.value = "You are V, a sophisticated AI assistant. Your primary directive is to provide insightful, articulate, and comprehensive responses. Generate detailed explanations, code, and diagrams (using Mermaid syntax when appropriate and `{{GENERATE_DIAGRAM}}` is true) to assist the user effectively.";
    }
  };

  const initialize = async () => {
    console.log(`[${agentDisplayName.value} useVAgent] Initializing...`);
    await fetchSystemPrompt();
    if (isLoadingResponse.value) {
        console.warn(`[${agentDisplayName.value} useVAgent] Initialize: isLoadingResponse was true, resetting.`);
        isLoadingResponse.value = false;
    }
  };

  const cleanup = () => {
    console.log(`[${agentDisplayName.value} useVAgent] Cleanup performed.`);
    if (isLoadingResponse.value) {
        console.warn(`[${agentDisplayName.value} useVAgent] Cleanup: isLoadingResponse was true, resetting.`);
        isLoadingResponse.value = false;
    }
  };

  const handleNewUserInput = async (text: string) => {
    const agentLabel = agentDisplayName.value;
    console.log(`[${agentLabel} useVAgent}] handleNewUserInput called. Current isLoadingResponse (agent-local): ${isLoadingResponse.value}`);

    if (!text.trim()) return;
    if (isLoadingResponse.value) { // Check THIS AGENT's loading state
      console.warn(`[${agentLabel} useVAgent}] This agent is already processing a response. Input ignored.`);
      toast?.add({ type: 'info', title: 'Processing', message: `${agentLabel} is currently busy. Please wait.` });
      return;
    }

    const currentAgentIdStr = agentId.value;
    chatStore.addMessage({ role: 'user', content: text, agentId: currentAgentIdStr, timestamp: Date.now() });
    
    // --- Critical: Set isLoadingResponse for THIS AGENT's LLM call ---
    console.log(`[${agentLabel} useVAgent}] Preparing to call LLM API. Setting agent-local isLoadingResponse to true.`);
    isLoadingResponse.value = true;

    const thinkingMessage = `### ${agentDisplayName.value} is contemplating: "${text.substring(0, 40)}..."\n\n<div class="v-spinner-container mx-auto my-4"><div class="v-spinner"></div></div>\n\nAccessing knowledge streams...`;
    chatStore.updateMainContent({ agentId: currentAgentIdStr, type: 'markdown', data: thinkingMessage, title: `${agentDisplayName.value} is processing: ${text.substring(0, 30)}...`, timestamp: Date.now() });

    try {
      if (!currentSystemPrompt.value || !currentSystemPrompt.value.trim()) {
        await fetchSystemPrompt();
        if (!currentSystemPrompt.value || !currentSystemPrompt.value.trim()) {
           throw new Error("Critical: System prompt for V agent could not be established.");
        }
      }

      const personaOverride = chatStore.getPersonaForAgent(currentAgentIdStr);
      const personaInstructions = personaOverride ? `## CUSTOM PERSONA CONTEXT:\n${personaOverride.trim()}` : '';

      let finalSystemPrompt = currentSystemPrompt.value
        .replace(/{{LANGUAGE}}/g, voiceSettingsManager.settings.preferredCodingLanguage || 'english')
        .replace(/{{USER_QUERY}}/g, text)
        .replace(/{{MODE}}/g, agentConfigRef.value.id)
        .replace(/{{GENERATE_DIAGRAM}}/g, ((agentConfigRef.value.capabilities?.canGenerateDiagrams && voiceSettingsManager.settings.generateDiagrams) ?? false).toString())
        .replace(/{{AGENT_CONTEXT_JSON}}/g, JSON.stringify(agentStore.getAgentContext(currentAgentIdStr) || {}))
        .replace(/{{ADDITIONAL_INSTRUCTIONS}}/g, personaInstructions);

      const historyConfig: AdvancedHistoryConfig = {
          ...DEFAULT_V_HISTORY_CONFIG,
          maxContextTokens: agentConfigRef.value.capabilities?.maxChatHistory ? agentConfigRef.value.capabilities.maxChatHistory * 150 : DEFAULT_V_HISTORY_CONFIG.maxContextTokens,
          simpleRecencyMessageCount: agentConfigRef.value.capabilities?.maxChatHistory || DEFAULT_V_HISTORY_CONFIG.numRecentMessagesToPrioritize,
      };
      
      const messagesForLlm: ChatMessageFE[] = [];
      messagesForLlm.push({ role: 'system', content: finalSystemPrompt });
      const processedHistory = await chatStore.getHistoryForApi( currentAgentIdStr, text, finalSystemPrompt, historyConfig );
      messagesForLlm.push(...processedHistory.map(m => ({...m, role: m.role as ChatMessageFE['role']})));
      if (messagesForLlm[messagesForLlm.length-1]?.content !== text || messagesForLlm[messagesForLlm.length-1]?.role !== 'user') {
          messagesForLlm.push({ role: 'user', content: text, timestamp: Date.now() });
      }
      
      const basePayload: ChatMessagePayloadFE = {
        messages: messagesForLlm,
        mode: agentConfigRef.value.systemPromptKey || agentConfigRef.value.id,
        language: voiceSettingsManager.settings.preferredCodingLanguage,
        generateDiagram: agentConfigRef.value.capabilities?.canGenerateDiagrams && voiceSettingsManager.settings.generateDiagrams,
        userId: `frontend_user_v_${currentAgentIdStr}`,
        conversationId: chatStore.getCurrentConversationId(currentAgentIdStr),
        stream: true,
      };
      const payload = chatStore.attachPersonaToPayload(currentAgentIdStr, basePayload);
      console.log(`[${agentDisplayName.value} useVAgent}] Sending payload with mode: ${payload.mode}.`);

      let accumulatedContent = "";
      chatStore.updateMainContent({ agentId: currentAgentIdStr, type: 'markdown', data: '', title: `${agentDisplayName.value}'s insight on: "${text.substring(0, 30)}..."`, timestamp: Date.now() });
      chatStore.setMainContentStreaming(true, ''); // V also uses streaming text

      const finalResponse = await chatAPI.sendMessageStream(
        payload,
        async (chunk: string) => { // onChunkReceived
          if (chunk) {
            accumulatedContent += chunk;
            chatStore.setMainContentStreaming(true, accumulatedContent); // Update store for reactive display
          }
        },
        async () => { // onStreamEnd
          // isLoadingResponse will be set to false in the finally block.
          chatStore.setMainContentStreaming(false);
          const finalContent = accumulatedContent.trim();
          if (!finalContent) {
            // ... (handle empty response) ...
            return;
          }
          chatStore.addMessage({ role: 'assistant', content: finalContent, timestamp: Date.now(), agentId: currentAgentIdStr });
          chatStore.updateMainContent({ agentId: currentAgentIdStr, type: agentConfigRef.value.capabilities?.usesCompactRenderer ? 'compact-message-renderer-data' : 'markdown', data: finalContent, title: `${agentDisplayName.value}'s insight on: "${text.substring(0, 30)}..."`, timestamp: Date.now() });
        },
        async (error: Error) => { // onStreamError
          console.error(`[${agentDisplayName.value} useVAgent}] Chat stream error:`, error);
          // ... (handle error) ...
          chatStore.setMainContentStreaming(false);
          // isLoadingResponse will be set to false in the finally block.
        }
      );
      chatStore.syncPersonaFromResponse(currentAgentIdStr, finalResponse);
    } catch (error: any) {
      console.error(`[${agentDisplayName.value} useVAgent}] Chat API setup error:`, error);
      // ... (handle error) ...
      chatStore.setMainContentStreaming(false);
      // isLoadingResponse will be set to false in the finally block.
    } finally {
      // --- Critical: Reset isLoadingResponse for THIS AGENT's LLM call ---
      console.log(`[${agentLabel} useVAgent}] LLM API call finished or errored. Setting agent-local isLoadingResponse to false.`);
      isLoadingResponse.value = false; // This will trigger the watch in VAgentView.vue
      if (chatStore.isMainContentStreaming) {
        chatStore.setMainContentStreaming(false);
      }
    }
  };

  const renderMarkdown = (content: string | null): string => { /* ... as before ... */ if (content === null) return ''; try { return marked.parse(content, { breaks: true, gfm: true }); } catch (e) { console.error(`[${agentDisplayName.value} useVAgent}] Markdown parsing error:`, e); return `<p style="color: var(--color-error-text);">Error rendering content.</p>`; } };
  watch(() => agentConfigRef.value?.systemPromptKey, async (newKey, oldKey) => { /* ... as before ... */ if(newKey && newKey !== oldKey) { await fetchSystemPrompt(); } else if (newKey && !currentSystemPrompt.value.trim()) { await fetchSystemPrompt(); } }, { immediate: true });
  watch(() => agentStore.activeAgentId, (newAgentId, oldAgentId) => { if (newAgentId !== oldAgentId && newAgentId === agentId.value) { if(!currentSystemPrompt.value.trim()) fetchSystemPrompt(); } else if (newAgentId !== oldAgentId && oldAgentId === agentId.value) { if (isLoadingResponse.value) isLoadingResponse.value = false; } });

  // Add dummy/default implementations for animatedUnits and isTextAnimating if V doesn't use them
  const animatedUnits = ref([]);
  const isTextAnimating = ref(false);

  return {
    isLoadingResponse: readonly(isLoadingResponse), // Expose as readonly
    currentSystemPrompt: readonly(currentSystemPrompt),
    agentDisplayName,
    mainContentToDisplay,
    initialize,
    cleanup,
    handleNewUserInput,
    renderMarkdown,
    animatedUnits, // Provide if VAgentComposable expects it
    isTextAnimating: readonly(isTextAnimating), // Provide if VAgentComposable expects it
  };
}

