// File: frontend/src/components/agents/catalog/NerfAgent/useNerfAgent.ts
/**
 * @file useNerfAgent.ts
 * @description Composable logic for "Nerf" - the General AI Assistant.
 * This composable manages the agent's state, system prompt, user input handling,
 * interaction with the chat API for streaming responses, and text animation.
 *
 * @version 1.3.2
 * @updated 2025-06-04
 * - STRICT `isLoadingResponse` logic: It's now set to `true` ONLY immediately before the LLM API call
 * and set to `false` upon completion or error. This prevents premature STT termination.
 * - Added more robust console logging for tracing `isLoadingResponse` state.
 */
import { ref, computed, watch, type Ref, readonly } from 'vue';
import { useAgentStore } from '@/store/agent.store';
import { useChatStore, type MainContent } from '@/store/chat.store';
import type { IAgentDefinition, IAgentCapability } from '@/services/agent.service';
import { voiceSettingsManager } from '@/services/voice.settings.service';
import { chatAPI, type ChatMessagePayloadFE, type ChatMessageFE, api } from '@/utils/api';
import type { ToastService } from '@/services/services';
import { marked } from 'marked';
import { type AdvancedHistoryConfig, DEFAULT_NERF_HISTORY_CONFIG, type NerfAgentComposable } from './NerfAgentTypes';
import { useTextAnimation, type TextRevealConfig } from '@/composables/useTextAnimation';

/**
 * Composable function for the Nerf agent.
 *
 * @param {Ref<IAgentDefinition>} agentConfigRef - Reactive reference to the agent's definition.
 * @param {ToastService} [toastInstance] - Optional toast service for notifications.
 * @returns {NerfAgentComposable} Object containing reactive properties and methods for the Nerf agent.
 */
export function useNerfAgent(
  agentConfigRef: Ref<IAgentDefinition>,
  toastInstance?: ToastService,
): NerfAgentComposable {
  const agentStore = useAgentStore();
  const chatStore = useChatStore();
  const toast = toastInstance;

  /** @type {ComputedRef<IAgentDefinition['id']>} The ID of the current agent. */
  const agentId = computed(() => agentConfigRef.value.id);

  /**
   * @type {Ref<boolean>}
   * @description Reactive flag indicating if THIS AGENT is currently waiting for a response from the LLM.
   * This should ONLY be true during THIS AGENT'S actual asynchronous API call.
   * This state is watched by NerfAgentView to emit 'setProcessingState' to PrivateHome.
   */
  const isLoadingResponse = ref(false);

  /** @type {Ref<string>} The current system prompt for the agent. */
  const currentSystemPrompt = ref('');

  /** @type {ComputedRef<string>} The display name of the agent. */
  const agentDisplayName = computed(() => agentConfigRef.value?.label || "Nerf");

  /** @type {ComputedRef<MainContent | null>} The main content to be displayed for this agent from the chat store. */
  const mainContentToDisplay = computed<MainContent | null>(() => chatStore.getMainContentForAgent(agentId.value));

  /** @type {ComputedRef<IAgentCapability>} The capabilities of this Nerf agent instance. */
  const agentCapabilities = computed(() => agentConfigRef.value.capabilities as IAgentCapability);

  const {
    animatedUnits,
    animateText,
    resetAnimation: resetTextAnimation,
    isAnimating: isTextAnimating,
  } = useTextAnimation({
    mode: agentCapabilities.value?.textAnimationConfig?.mode || 'word',
    // unitDelay: agentCapabilities.value?.textAnimationConfig?.unitDelay || 30,
    staggerDelay: agentCapabilities.value?.textAnimationConfig?.staggerDelay || 15,
    animationStyle: agentCapabilities.value?.textAnimationConfig?.animationStyle || 'terminal',
  });

  const fetchSystemPrompt = async (): Promise<void> => {
    const key = agentConfigRef.value.systemPromptKey || 'nerf_chat';
    const agentLabel = agentDisplayName.value;
    console.log(`[${agentLabel} useNerfAgent] Fetching system prompt with key: ${key}.md`);
    if (key) {
      try {
        const response = await api.get(`/prompts/${key}.md`);
        currentSystemPrompt.value = response.data as string;
        if (!currentSystemPrompt.value.trim()) {
           console.warn(`[${agentLabel} useNerfAgent] Fetched system prompt for key '${key}' is empty. Using fallback.`);
           currentSystemPrompt.value = `You are ${agentLabel}, a friendly and concise general AI assistant. Help users with their questions efficiently.`;
        }
      } catch (e) {
        console.error(`[${agentLabel} useNerfAgent] Failed to load system prompt: ${key}.md`, e);
        currentSystemPrompt.value = `You are ${agentLabel}, a friendly and concise general AI assistant. Help users with their questions efficiently.`;
        toast?.add({type: 'error', title: 'Prompt Load Error', message: `Could not load instructions for ${agentLabel}.`});
      }
    } else {
      console.warn(`[${agentLabel} useNerfAgent] No systemPromptKey defined. Using fallback prompt.`);
      currentSystemPrompt.value = `You are ${agentLabel}, a friendly and concise general AI assistant. Help users with their questions efficiently.`;
    }
  };

  const initialize = async (): Promise<void> => {
    console.log(`[${agentDisplayName.value} useNerfAgent] Initializing...`);
    await fetchSystemPrompt();
    resetTextAnimation();
    // Ensure isLoadingResponse is false on initialization for this agent instance
    if (isLoadingResponse.value) {
        console.warn(`[${agentDisplayName.value} useNerfAgent] Initialize: isLoadingResponse was true, resetting.`);
        isLoadingResponse.value = false;
    }
  };

  const cleanup = (): void => {
    console.log(`[${agentDisplayName.value} useNerfAgent}] Cleanup performed.`);
    resetTextAnimation();
    // Ensure isLoadingResponse is false on cleanup for this agent instance
    // This is critical if the view is unmounted while this agent was processing.
    if (isLoadingResponse.value) {
        console.warn(`[${agentDisplayName.value} useNerfAgent] Cleanup: isLoadingResponse was true, resetting.`);
        isLoadingResponse.value = false;
    }
  };

  const handleNewUserInput = async (text: string): Promise<void> => {
    const agentLabel = agentDisplayName.value;
    console.log(`[${agentLabel} useNerfAgent}] handleNewUserInput called with text: "${text.substring(0, 50)}...". Current isLoadingResponse (agent-local): ${isLoadingResponse.value}`);

    if (!text.trim()) {
      console.log(`[${agentLabel} useNerfAgent}] Input text is empty. Aborting.`);
      return;
    }
    if (isLoadingResponse.value) { // Check THIS AGENT's loading state
      console.warn(`[${agentLabel} useNerfAgent}] This agent is already processing a response. Input ignored.`);
      toast?.add({ type: 'info', title: 'Processing', message: `${agentLabel} is currently busy. Please wait.` });
      return;
    }

    const currentAgentIdStr = agentId.value;
    chatStore.addMessage({ role: 'user', content: text, agentId: currentAgentIdStr, timestamp: Date.now() });
    resetTextAnimation();

    const thinkingMessage = `### ${agentLabel} is processing: "${text.substring(0, 40)}..."\n\n<div class="nerf-spinner-container mx-auto my-4"><div class="nerf-spinner"></div></div>\n\nChecking the knowledge circuits...`;
    chatStore.updateMainContent({ agentId: currentAgentIdStr, type: 'markdown', data: thinkingMessage, title: `${agentLabel} is on it: ${text.substring(0, 30)}...`, timestamp: Date.now() });

    // --- Critical: Set isLoadingResponse for THIS AGENT's LLM call ---
    console.log(`[${agentLabel} useNerfAgent}] Preparing to call LLM API. Setting agent-local isLoadingResponse to true.`);
    isLoadingResponse.value = true; // This will trigger the watch in NerfAgentView.vue to emit 'setProcessingState'

    try {
      if (!currentSystemPrompt.value.trim()) {
        console.warn(`[${agentLabel} useNerfAgent}] System prompt was empty before API call. Fetching again.`);
        await fetchSystemPrompt();
        if (!currentSystemPrompt.value.trim()) {
          toast?.add({type: 'error', title: 'Critical Error', message: `System prompt for ${agentLabel} could not be established.`});
          throw new Error(`System prompt for ${agentLabel} could not be established.`);
        }
      }

      const personaOverride = chatStore.getPersonaForAgent(currentAgentIdStr);
      const personaInstructions = personaOverride ? `## CUSTOM PERSONA CONTEXT:\n${personaOverride.trim()}` : '';

      let finalSystemPrompt = currentSystemPrompt.value
        .replace(/{{LANGUAGE}}/g, voiceSettingsManager.settings.preferredCodingLanguage || 'english')
        .replace(/{{USER_QUERY}}/g, text)
        .replace(/{{MODE}}/g, agentConfigRef.value.id)
        .replace(/{{GENERATE_DIAGRAM}}/g, ((agentCapabilities.value?.canGenerateDiagrams && voiceSettingsManager.settings.generateDiagrams) ?? false).toString())
        .replace(/{{AGENT_CONTEXT_JSON}}/g, JSON.stringify(agentStore.getAgentContext(currentAgentIdStr) || {}))
        .replace(/{{ADDITIONAL_INSTRUCTIONS}}/g, personaInstructions);

      const historyConfig: AdvancedHistoryConfig = {
          ...DEFAULT_NERF_HISTORY_CONFIG,
          maxContextTokens: agentCapabilities.value?.maxChatHistory ? agentCapabilities.value.maxChatHistory * 120 : DEFAULT_NERF_HISTORY_CONFIG.maxContextTokens,
          simpleRecencyMessageCount: agentCapabilities.value?.maxChatHistory || DEFAULT_NERF_HISTORY_CONFIG.simpleRecencyMessageCount,
          numRecentMessagesToPrioritize: agentCapabilities.value?.maxChatHistory || DEFAULT_NERF_HISTORY_CONFIG.numRecentMessagesToPrioritize,
      };

      const messagesForLlm: ChatMessageFE[] = [];
      messagesForLlm.push({ role: 'system', content: finalSystemPrompt });
      const processedHistory = await chatStore.getHistoryForApi( currentAgentIdStr, text, finalSystemPrompt, historyConfig );
      messagesForLlm.push(...processedHistory.map(m => ({...m, role: m.role as ChatMessageFE['role']})));
      if (messagesForLlm.length === 0 || messagesForLlm[messagesForLlm.length-1]?.content !== text || messagesForLlm[messagesForLlm.length-1]?.role !== 'user') {
          messagesForLlm.push({ role: 'user', content: text, timestamp: Date.now() });
      }

      const basePayload: ChatMessagePayloadFE = {
        messages: messagesForLlm,
        mode: agentConfigRef.value.systemPromptKey || agentConfigRef.value.id,
        language: voiceSettingsManager.settings.preferredCodingLanguage,
        generateDiagram: agentCapabilities.value?.canGenerateDiagrams && voiceSettingsManager.settings.generateDiagrams,
        userId: `frontend_user_nerf_${currentAgentIdStr}`,
        conversationId: chatStore.getCurrentConversationId(currentAgentIdStr),
        stream: true,
      };
      const payload = chatStore.attachPersonaToPayload(currentAgentIdStr, basePayload);

      let accumulatedContent = "";
      chatStore.updateMainContent({ agentId: currentAgentIdStr, type: 'markdown', data: '', title: `${agentLabel}'s response to: "${text.substring(0, 30)}..."`, timestamp: Date.now() });
      chatStore.setMainContentStreaming(true, '');

      const currentAnimConfig: Partial<TextRevealConfig> = { /* ... animation config ... */ };

      const finalResponse = await chatAPI.sendMessageStream(
        payload,
        async (chunk: string) => { // onChunkReceived
          if (chunk) {
            accumulatedContent += chunk;
            await animateText(accumulatedContent, currentAnimConfig);
          }
        },
        async () => { // onStreamEnd
          // Wait for text animation, then finalize content.
          // isLoadingResponse will be set to false in the finally block.
          // ... (animation timing and content finalization logic as before) ...
          chatStore.setMainContentStreaming(false);
          const finalContent = accumulatedContent.trim();
          if(!finalContent) {
              // ... (handle empty response as before) ...
              return;
          }
          chatStore.addMessage({ role: 'assistant', content: finalContent, timestamp: Date.now(), agentId: currentAgentIdStr });
          chatStore.updateMainContent({ agentId: currentAgentIdStr, type: 'markdown', data: finalContent, title: `${agentLabel}'s response to: "${text.substring(0, 30)}..."`, timestamp: Date.now() });
        },
        async (error: Error) => { // onStreamError
          console.error(`[${agentLabel} useNerfAgent}] Chat stream error:`, error);
          // ... (error handling as before) ...
          chatStore.setMainContentStreaming(false);
          resetTextAnimation();
          // isLoadingResponse will be set to false in the finally block.
        }
      );
      chatStore.syncPersonaFromResponse(currentAgentIdStr, finalResponse);
    } catch (error: any) {
      console.error(`[${agentLabel} useNerfAgent}] Chat API setup error:`, error);
      // ... (error handling as before) ...
      chatStore.setMainContentStreaming(false);
      resetTextAnimation();
      // isLoadingResponse will be set to false in the finally block.
    } finally {
      // --- Critical: Reset isLoadingResponse for THIS AGENT's LLM call ---
      console.log(`[${agentLabel} useNerfAgent}] LLM API call finished or errored. Setting agent-local isLoadingResponse to false.`);
      isLoadingResponse.value = false; // This will trigger the watch in NerfAgentView.vue
      if (chatStore.isMainContentStreaming) {
        chatStore.setMainContentStreaming(false);
      }
      if (isTextAnimating.value) {
        // Let animation finish or call resetTextAnimation() if abrupt stop is desired.
        // For now, assume animation timeout handles it.
      }
    }
  };

  const renderMarkdown = (content: string | null): string => { /* ... as before ... */ if (content === null) return ''; try { return marked.parse(content, { breaks: true, gfm: true }); } catch (e) { console.error(`[${agentDisplayName.value} useNerfAgent}] Markdown parsing error:`, e); return `<p style="color: var(--color-error-text);">Error rendering content.</p>`; } };

  watch(() => agentConfigRef.value?.systemPromptKey, (newKey, oldKey) => { /* ... as before ... */ if(newKey && newKey !== oldKey) { fetchSystemPrompt(); } else if (newKey && (!currentSystemPrompt.value || !currentSystemPrompt.value.trim())) { fetchSystemPrompt(); } }, { immediate: true });
  watch(() => agentStore.activeAgentId, (newActiveAgentId, oldActiveAgentId) => { if (newActiveAgentId !== oldActiveAgentId && oldActiveAgentId === agentId.value) { resetTextAnimation(); if (isLoadingResponse.value) { isLoadingResponse.value = false; } } else if (newActiveAgentId === agentId.value && oldActiveAgentId !== agentId.value) { if (!currentSystemPrompt.value.trim()) { fetchSystemPrompt(); } } });

  return {
    isLoadingResponse: readonly(isLoadingResponse), // Expose as readonly to the view
    currentSystemPrompt: readonly(currentSystemPrompt),
    agentDisplayName,
    mainContentToDisplay,
    initialize,
    cleanup,
    handleNewUserInput,
    renderMarkdown,
    animatedUnits,
    isTextAnimating: readonly(isTextAnimating),
  };
}
