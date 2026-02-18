// File: frontend/src/components/agents/catalog/LCAuditAgent/LCAudit/useLCAuditAgent.ts
/**
 * @file useLCAuditAgent.ts
 * @description Composable logic for the LC-Audit Agent.
 * @version 1.0.1 - Corrected imports and unused variable cleanup.
 */
import { ref, computed, watch, onMounted, onUnmounted, nextTick, type Ref } from 'vue';
import { useAgentStore } from '@/store/agent.store'; // agentStore is used if we read context
import { useChatStore, type MainContent } from '@/store/chat.store';
import type { IAgentDefinition, AgentId } from '@/services/agent.service';
import { voiceSettingsManager } from '@/services/voice.settings.service';
import { chatAPI, type ChatMessagePayloadFE, type TextResponseDataFE, promptAPI } from '@/utils/api';
import type { ToastService } from '@/services/services';
// Corrected import path
import type { CompactMessageRendererPublicMethods } from '@/components/layouts/CompactMessageRenderer/CompactMessageRendererTypes';

import {
  type LlmAuditResponse,
  // type UpdateStrategy, // Used internally in LlmAuditResponse
  // type LCAuditAgentState, // Used for defining Composable
  // type LCAuditAgentComputeds, // Used for defining Composable
  // type LCAuditAgentActions, // Used for defining Composable
  type LCAuditAgentComposable,
} from './LCAuditAgentTypes';

export function useLCAuditAgent(
  agentConfigRef: Ref<IAgentDefinition>,
  toastInstance?: ToastService,
): LCAuditAgentComposable {
  // const agentStore = useAgentStore(); // Only needed if reading specific agent context
  const chatStore = useChatStore();
  const toast = toastInstance;
  const agentId = computed<AgentId>(() => agentConfigRef.value.id);

  const isLoadingResponse = ref<boolean>(false);
  const currentSystemPrompt = ref<string>("");
  const currentSlideshowFullMarkdown = ref<string>("");
  const currentProblemTitleForDisplay = ref<string>("Problem Analysis");
  const slideDurationsMs = ref<number[]>([]);
  const currentAppSlideIndex = ref<number>(0);
  const totalAppSlidesCount = ref<number>(0);
  const autoplayTimerId = ref<ReturnType<typeof setTimeout> | null>(null);
  const isAutoplayGloballyActive = ref<boolean>(true);
  const isCurrentSlidePlaying = ref<boolean>(false);
  const compactMessageRendererRef = ref<CompactMessageRendererPublicMethods | null>(null);
  const hasNewSlideshowContentLoaded = ref<boolean>(false);

  const agentDisplayName = computed<string>(() => agentConfigRef.value?.label || "LC-Audit");
  const contentDisplayAreaId = computed<string>(() => `${agentId.value}-main-content-area-lcaudit`);

  const clearCurrentAutoplayTimer = () => {
    if (autoplayTimerId.value) clearTimeout(autoplayTimerId.value);
    autoplayTimerId.value = null;
    isCurrentSlidePlaying.value = false;
  };

  const determineSlideDurations = (numSlides: number): number[] => {
    if (numSlides <= 0) return [];
    const durations: number[] = [];
    durations.push(numSlides > 0 ? 12000 : Infinity);
    durations.push(numSlides > 1 ? 18000 : Infinity);
    for (let i = 2; i < numSlides - 1 ; i++) durations.push(25000);
    if (numSlides > 0) {
      durations[numSlides - 1] = (numSlides === 1 && durations[0] !== Infinity) ? durations[0] : Infinity;
    }
    return durations.slice(0, numSlides);
  };

  const setupSlideshowState = (markdownSlideshowContent: string, problemTitle?: string) => {
    currentSlideshowFullMarkdown.value = markdownSlideshowContent;
    currentProblemTitleForDisplay.value = problemTitle || currentProblemTitleForDisplay.value || "LC Problem Analysis";
    const slidesArray = markdownSlideshowContent.split('---SLIDE_BREAK---');
    totalAppSlidesCount.value = slidesArray.length;
    slideDurationsMs.value = determineSlideDurations(totalAppSlidesCount.value);
    chatStore.updateMainContent({
      agentId: agentId.value, type: 'compact-message-renderer-data',
      data: currentSlideshowFullMarkdown.value, title: currentProblemTitleForDisplay.value,
      timestamp: Date.now(),
    });
  };

  const scheduleNextSlide = () => {
    clearCurrentAutoplayTimer();
    if (!isAutoplayGloballyActive.value || currentAppSlideIndex.value >= totalAppSlidesCount.value - 1 || totalAppSlidesCount.value === 0) {
      isCurrentSlidePlaying.value = false; return;
    }
    const duration = slideDurationsMs.value[currentAppSlideIndex.value];
    if (duration !== undefined && duration !== Infinity) {
      isCurrentSlidePlaying.value = true;
      autoplayTimerId.value = setTimeout(() => {
        if (isAutoplayGloballyActive.value && isCurrentSlidePlaying.value) {
          compactMessageRendererRef.value?.next();
        }
      }, duration);
    } else {
      isCurrentSlidePlaying.value = false;
    }
  };

  const handleLlmAuditResponse = (llmResponseString: string) => {
    clearCurrentAutoplayTimer();
    const agentLabel = agentDisplayName.value;
    let cleanedResponseString = llmResponseString.trim();
    if (cleanedResponseString.startsWith('```json')) {
      cleanedResponseString = cleanedResponseString.substring('```json'.length).trim();
      if (cleanedResponseString.endsWith('```')) {
        cleanedResponseString = cleanedResponseString.substring(0, cleanedResponseString.length - '```'.length).trim();
      }
    } else if (cleanedResponseString.startsWith('```')) {
        cleanedResponseString = cleanedResponseString.substring('```'.length).trim();
        if (cleanedResponseString.endsWith('```')) {
            cleanedResponseString = cleanedResponseString.substring(0, cleanedResponseString.length - '```'.length).trim();
        }
    }

    let llmOutput: LlmAuditResponse;
    try {
      llmOutput = JSON.parse(cleanedResponseString);
    } catch (e: any) {
      console.error(`[${agentLabel}] Failed to parse LLM JSON:`, e.message, `String: "${cleanedResponseString}"`);
      toast?.add({ type: 'error', title: `${agentLabel} Response Error`, message: `Assistant response not valid JSON. Raw content shown.`, duration: 10000 });
      chatStore.updateMainContent({
        agentId: agentId.value, type: 'markdown',
        data: `### ${agentLabel} - Invalid Response\nAssistant response was not valid JSON. Raw content:\n\n---\n\n${llmResponseString.replace(/</g, '&lt;').replace(/>/g, '&gt;')}`,
        title: 'Invalid Response Format', timestamp: Date.now()
      });
      isLoadingResponse.value = false; return;
    }

    const newProblemTitle = llmOutput.problemTitle || currentProblemTitleForDisplay.value || "LC Problem Analysis";
    let shouldStartAutoplay = false;

    switch (llmOutput.updateStrategy) {
      case "new_slideshow":
      case "revise_slideshow":
        if (!llmOutput.content || typeof llmOutput.content !== 'string') {
          toast?.add({ type: 'error', title: 'Slideshow Error', message: `Missing slideshow content for "${llmOutput.updateStrategy}".` });
          chatStore.updateMainContent({
              agentId: agentId.value, type: 'markdown',
              data: `### ${agentLabel} - Content Error\nSlideshow content for strategy "${llmOutput.updateStrategy}" was missing.`,
              title: 'Slideshow Content Error', timestamp: Date.now()
          });
          break;
        }
        setupSlideshowState(llmOutput.content, newProblemTitle);
        currentAppSlideIndex.value = 0; hasNewSlideshowContentLoaded.value = true;
        shouldStartAutoplay = true;
        break;
      case "append_to_final_slide":
        if (currentSlideshowFullMarkdown.value && totalAppSlidesCount.value > 0 && llmOutput.newContent) {
          const updatedMarkdown = currentSlideshowFullMarkdown.value + (currentSlideshowFullMarkdown.value.endsWith('\n') ? '' : '\n\n---\n\n') + llmOutput.newContent;
          setupSlideshowState(updatedMarkdown, newProblemTitle);
          currentAppSlideIndex.value = totalAppSlidesCount.value > 0 ? totalAppSlidesCount.value - 1 : 0;
          hasNewSlideshowContentLoaded.value = true; isAutoplayGloballyActive.value = false; isCurrentSlidePlaying.value = false;
        } else {
          const fallbackContent = llmOutput.newContent || llmOutput.content || `Error: Append content missing for title: ${newProblemTitle}`;
          setupSlideshowState(fallbackContent, "Appended Content (Fallback)");
          currentAppSlideIndex.value = 0; hasNewSlideshowContentLoaded.value = true; shouldStartAutoplay = true;
        }
        break;
      case "no_update_needed":
        toast?.add({ type: 'info', title: `${agentLabel} Status`, message: 'No significant update to the analysis was needed.', duration: 4000 });
        if (isAutoplayGloballyActive.value && !isCurrentSlidePlaying.value && currentAppSlideIndex.value < totalAppSlidesCount.value - 1) scheduleNextSlide();
        break;
      case "clarification_needed":
        const question = llmOutput.clarification_question || "The assistant requires more details.";
        toast?.add({ type: 'warning', title: `${agentLabel} Needs Clarification`, message: question, duration: 12000 });
        chatStore.addMessage({agentId: agentId.value, role: 'assistant', content: question, timestamp: Date.now()});
        isAutoplayGloballyActive.value = false; isCurrentSlidePlaying.value = false;
        setupSlideshowState(`${currentSlideshowFullMarkdown.value}\n\n---\n\n## Clarification Needed\n\n**${agentLabel} asks:** ${question}`, newProblemTitle);
        currentAppSlideIndex.value = totalAppSlidesCount.value > 0 ? totalAppSlidesCount.value - 1 : 0;
        hasNewSlideshowContentLoaded.value = true;
        break;
      default:
        const unknownStrategy = (llmOutput as any).updateStrategy;
        toast?.add({type: 'error', title: 'Unknown Update Strategy', message: `Received: ${unknownStrategy}`});
        chatStore.updateMainContent({
            agentId: agentId.value, type: 'markdown',
            data: `### ${agentLabel} - Internal Error\nUnknown strategy: "${unknownStrategy}". JSON:\n\`\`\`json\n${cleanedResponseString}\n\`\`\``,
            title: 'Internal Processing Error', timestamp: Date.now()
        });
    }

    nextTick().then(() => {
      if (hasNewSlideshowContentLoaded.value && compactMessageRendererRef.value) {
        compactMessageRendererRef.value.navigateToSlide(currentAppSlideIndex.value);
        hasNewSlideshowContentLoaded.value = false;
      }
      if (shouldStartAutoplay && isAutoplayGloballyActive.value && totalAppSlidesCount.value > 0) scheduleNextSlide();
    });
    isLoadingResponse.value = false;
  };

  const initialize = async (passedAgentDef: IAgentDefinition) => { // Renamed agentDef to avoid conflict
    isLoadingResponse.value = false;
    await fetchSystemPrompt(); // Uses agentConfigRef from composable scope
    const existingContent = chatStore.getMainContentForAgent(agentId.value);
    if (existingContent && existingContent.type === 'compact-message-renderer-data' && typeof existingContent.data === 'string') {
      setupSlideshowState(existingContent.data, existingContent.title);
      currentAppSlideIndex.value = 0;
      nextTick().then(() => {
        compactMessageRendererRef.value?.navigateToSlide(currentAppSlideIndex.value);
        if (isAutoplayGloballyActive.value && totalAppSlidesCount.value > 0 && currentAppSlideIndex.value < totalAppSlidesCount.value -1) {
          scheduleNextSlide();
        }
      });
    } else if (!isLoadingResponse.value && !currentSlideshowFullMarkdown.value) {
      const welcomeMarkdown = `
  <div class="lc-audit-welcome-container">
    <div class="lc-audit-icon-wrapper">
      <svg class="lc-audit-main-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m5.231 13.481L15 17.25m-4.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9zm3.75 11.625a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>
    </div>
    <h2 class="lc-audit-welcome-title">${agentDisplayName.value}</h2>
    <p class="lc-audit-welcome-subtitle">${agentConfigRef.value?.description || 'Ready to analyze coding problems.'}</p>
    <p class="lc-audit-welcome-prompt">${agentConfigRef.value?.inputPlaceholder || 'Provide problem context.'}</p>
  </div>`;
      chatStore.updateMainContent({
        agentId: agentId.value, type: 'welcome', data: welcomeMarkdown,
        title: `${agentDisplayName.value} - Awaiting Problem`, timestamp: Date.now()
      });
      currentProblemTitleForDisplay.value = `${agentDisplayName.value} - Awaiting Problem`;
    }
  };

  const cleanup = () => { clearCurrentAutoplayTimer(); };

  const fetchSystemPrompt = async () => {
    const key = agentConfigRef.value?.systemPromptKey;
    const agentLabel = agentDisplayName.value;
    if (!key) {
      currentSystemPrompt.value = `ERROR: [${agentLabel}] System prompt key missing.`;
      toast?.add({ type: 'error', title: 'Agent Config Error', message: `No prompt key for ${agentLabel}.` }); return;
    }
    try {
      const response = await promptAPI.getPrompt(`${key}.md`);
      if (response && typeof response.data === 'string') {
        currentSystemPrompt.value = response.data;
      } else if (response && response.data && (response.data as any).content && typeof (response.data as any).content === 'string') {
        currentSystemPrompt.value = (response.data as any).content;
      } else {
        currentSystemPrompt.value = `ERROR: Invalid prompt data for "${key}".`;
        toast?.add({ type: 'error', title: 'Prompt Load Error', message: `Invalid prompt for "${key}".` });
      }
    } catch (e: any) {
      const errorDetails = e.response?.data?.message || e.message || 'Unknown error';
      currentSystemPrompt.value = `ERROR: Load failed for "${key}". Details: ${errorDetails}`;
      toast?.add({ type: 'error', title: 'Critical Prompt Error', message: `Failed to load prompt for "${key}".` });
    }
  };

  const processProblemContext = async (problemInput: string): Promise<void> => {
    const agentLabel = agentDisplayName.value;
    if (!problemInput.trim()) {
      toast?.add({ type: 'warning', title: 'Input Required', message: `Provide problem context for ${agentLabel}.` }); return;
    }
    if (isLoadingResponse.value) {
      toast?.add({ type: 'info', title: 'Busy', message: `${agentLabel} is already analyzing.` }); return;
    }
    if (!currentSystemPrompt.value || currentSystemPrompt.value.startsWith("ERROR:")) {
      const errorMsg = currentSystemPrompt.value.startsWith("ERROR:") ? currentSystemPrompt.value : 'System prompt unavailable.';
      toast?.add({ type: 'error', title: `${agentLabel} System Error`, message: `Cannot proceed: ${errorMsg.replace("ERROR: ", "")}`, duration: 10000 });
      chatStore.updateMainContent({
        agentId: agentId.value, type: 'markdown',
        data: `### ${agentLabel} System Error\n${errorMsg.replace("ERROR: ", "")}`,
        title: `${agentLabel} Init Failed`, timestamp: Date.now()
      }); return;
    }

    isAutoplayGloballyActive.value = true; clearCurrentAutoplayTimer(); isLoadingResponse.value = true;
    chatStore.updateMainContent({
      agentId: agentId.value, type: 'loading',
      data: `<div class="lc-audit-spinner-container mx-auto my-8"><div class="lc-audit-spinner"></div></div><p class="text-center text-base text-secondary">Analyzing: "${problemInput.substring(0, 30)}..."</p>`,
      title: `${agentLabel}: Analyzing "${problemInput.substring(0, 20)}..."`, timestamp: Date.now()
    });

    try {
      const currentSlideContentSummary = currentSlideshowFullMarkdown.value ? (currentSlideshowFullMarkdown.value.split('---SLIDE_BREAK---')[currentAppSlideIndex.value] || "").substring(0,300) + "..." : null;
      const agentContextForLLM = {
        current_problem_title: (currentProblemTitleForDisplay.value === "Problem Analysis" || currentProblemTitleForDisplay.value === `${agentLabel} Ready` || currentProblemTitleForDisplay.value.includes("Awaiting Problem")) ? null : currentProblemTitleForDisplay.value,
        current_slideshow_content_summary: currentSlideshowFullMarkdown.value ? currentSlideContentSummary : null,
        current_slide_index: totalAppSlidesCount.value > 0 ? currentAppSlideIndex.value : null,
        total_slides_in_current_show: totalAppSlidesCount.value,
        is_on_final_slide: totalAppSlidesCount.value > 0 && currentAppSlideIndex.value === totalAppSlidesCount.value - 1,
      };
      let finalSystemPrompt = currentSystemPrompt.value
        .replace(/{{LANGUAGE}}/g, voiceSettingsManager.settings?.preferredCodingLanguage || 'Python')
        .replace(/{{USER_QUERY}}/g, problemInput)
        .replace(/{{AGENT_CONTEXT_JSON}}/g, JSON.stringify(agentContextForLLM))
        .replace(/{{CONVERSATION_HISTORY}}/g, JSON.stringify(
          chatStore.getMessagesForAgent(agentId.value)
            .filter(m => m.role === 'user' && m.content).slice(-5).map(m => m.content!.substring(0, 200))
        ));

      const personaOverride = chatStore.getPersonaForAgent(agentId.value);
      const personaInstructions = personaOverride ? `## CUSTOM PERSONA CONTEXT:\n${personaOverride.trim()}` : '';
      finalSystemPrompt = finalSystemPrompt.replace(/{{ADDITIONAL_INSTRUCTIONS}}/g, personaInstructions);

      const basePayload: ChatMessagePayloadFE = {
        messages: [{ role: 'user', content: problemInput, timestamp: Date.now() }],
        mode: agentConfigRef.value.id, systemPromptOverride: finalSystemPrompt,
        userId: `lc_audit_session_${agentId.value}`,
        conversationId: chatStore.getCurrentConversationId(agentId.value) || `lcaudit-conv-${Date.now()}`,
        stream: false,
      };
      const payload = chatStore.attachPersonaToPayload(agentId.value, basePayload);
      const response = await chatAPI.sendMessage(payload);
      chatStore.syncPersonaFromResponse(agentId.value, response.data);
      if (response.data && typeof (response.data as TextResponseDataFE).content === 'string') {
        handleLlmAuditResponse((response.data as TextResponseDataFE).content!);
      } else {
        throw new Error(`${agentLabel} API response format error. Expected text content with JSON.`);
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || `${agentLabel} error.`;
      toast?.add({ type: 'error', title: `${agentLabel} Error`, message: errorMessage, duration: 10000 });
      chatStore.updateMainContent({
        agentId: agentId.value, type: 'error',
        data: `### ${agentLabel} Analysis Failed\n**Error:** *${String(errorMessage).replace(/</g, '&lt;').replace(/>/g, '&gt;')}*`,
        title: 'Analysis Failed', timestamp: Date.now()
      });
    } finally {
      isLoadingResponse.value = false;
    }
  };

  const handleSlideChangedInRenderer = (payload: { newIndex: number; totalSlides: number; navigatedManually: boolean }) => {
    currentAppSlideIndex.value = payload.newIndex;
    if (payload.navigatedManually) { isAutoplayGloballyActive.value = false; clearCurrentAutoplayTimer(); }
    else if (isAutoplayGloballyActive.value) scheduleNextSlide();
  };

  const toggleMasterAutoplay = () => {
    isAutoplayGloballyActive.value = !isAutoplayGloballyActive.value;
    if (isAutoplayGloballyActive.value) {
      if (currentAppSlideIndex.value >= totalAppSlidesCount.value - 1 && totalAppSlidesCount.value > 0) {
        currentAppSlideIndex.value = 0; compactMessageRendererRef.value?.navigateToSlide(0);
      } else scheduleNextSlide();
    } else clearCurrentAutoplayTimer();
  };

  // Watchers and Lifecycle
  watch(() => agentConfigRef.value?.systemPromptKey, (newKey, oldKey) => {
    if (newKey !== oldKey) fetchSystemPrompt();
  }, { immediate: true }); // Fetch on initial load based on config

  onMounted(() => {
    // initialize is called from View after AgentConfig is confirmed.
  });

  onUnmounted(() => { cleanup(); });

  return {
    isLoadingResponse, currentSystemPrompt, currentSlideshowFullMarkdown,
    currentProblemTitleForDisplay, slideDurationsMs, currentAppSlideIndex,
    totalAppSlidesCount, autoplayTimerId, isAutoplayGloballyActive,
    isCurrentSlidePlaying, compactMessageRendererRef,
    agentDisplayName, contentDisplayAreaId,
    initialize, cleanup, processProblemContext,
    toggleMasterAutoplay, handleSlideChangedInRenderer,
  };
}
