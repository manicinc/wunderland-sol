// File: frontend/src/components/agents/catalog/SystemsDesignAgent/useSystemsDesignAgent.ts
/**
 * @file useSystemsDesignAgent.ts
 * @description Composable for "Architectron" - the AI System Design Agent.
 * Manages state, LLM interactions (streaming with diagram focus), NFR input,
 * and diagram version history.
 * @version 1.0.1 - Corrected imports, removed promptMode, ensured helper functions.
 */
import { ref, computed, watch, type Ref } from 'vue';
import { useAgentStore } from '@/store/agent.store';
import { useChatStore, type MainContent } from '@/store/chat.store'; // Removed unused StoreChatMessage
import type { IAgentDefinition } from '@/services/agent.service';
import { voiceSettingsManager } from '@/services/voice.settings.service';
import {
  api,
  chatAPI,
  type ChatMessagePayloadFE,
  type ChatMessageFE,
} from '@/utils/api';
import type { ToastService } from '@/services/services';
// import { marked } from 'marked'; // marked is used in the View component for v-html

import type { ArchitectronAgentContext, ArchitectronComposable } from './SystemsDesignTypes'; // Ensure this path is correct
import { DEFAULT_ARCHITECTRON_HISTORY_CONFIG, MAX_DIAGRAM_HISTORY_LENGTH } from './SystemsDesignTypes';
import type { AdvancedHistoryConfig } from '@/services/advancedConversation.manager';


export function useSystemsDesignAgent(
  agentConfigRef: Ref<IAgentDefinition>,
  toastInstance?: ToastService,
): ArchitectronComposable {
  const agentStore = useAgentStore();
  const chatStore = useChatStore();
  const toast = toastInstance;
  const agentId = computed<string>(() => agentConfigRef.value.id);

  const isLoadingResponse = ref<boolean>(false);
  const currentSystemPrompt = ref<string>('');
  const currentDiagramMermaidCode = ref<string>('');
  const diagramHistory = ref<string[]>([]);
  const currentHistoryDiagramIndex = ref<number>(-1);
  const nfrInputText = ref<string>('');
  const advancedHistoryConfig = ref<AdvancedHistoryConfig>({ ...DEFAULT_ARCHITECTRON_HISTORY_CONFIG });
  const isDiagramExplainable = ref<boolean>(false);

  const agentDisplayName = computed<string>(() => agentConfigRef.value.label || "Architectron");
  const mainContentToDisplay = computed<MainContent | null>(() => chatStore.getMainContentForAgent(agentId.value));

  const canShowPreviousDiagram = computed<boolean>(() => {
    if (currentHistoryDiagramIndex.value === -1) {
      return diagramHistory.value.length > 0;
    }
    return currentHistoryDiagramIndex.value > 0;
  });

  const canShowNextDiagram = computed<boolean>(() => {
    return currentHistoryDiagramIndex.value !== -1 && currentHistoryDiagramIndex.value < diagramHistory.value.length - 1;
  });

  const extractMermaidCode = (markdownText: string | undefined): string | undefined => {
    if (typeof markdownText !== 'string') return undefined;
    const mermaidRegex = /```mermaid\s*([\s\S]*?)\s*```/;
    const match = markdownText.match(mermaidRegex);
    return match?.[1]?.trim();
  };

  const _updateDiagramState = (newDiagramCode: string | undefined) => {
    if (newDiagramCode && newDiagramCode !== currentDiagramMermaidCode.value) {
      if (currentDiagramMermaidCode.value) {
        diagramHistory.value.unshift(currentDiagramMermaidCode.value);
        if (diagramHistory.value.length > MAX_DIAGRAM_HISTORY_LENGTH) {
          diagramHistory.value.pop();
        }
      }
      currentDiagramMermaidCode.value = newDiagramCode;
      currentHistoryDiagramIndex.value = -1;
      agentStore.updateAgentContext({
        agentId: agentId.value, // Pass agentId for context update
        current_diagram_mermaid_code: newDiagramCode
      } as ArchitectronAgentContext & { agentId: string });
      isDiagramExplainable.value = true;
    }
    isDiagramExplainable.value = !!currentDiagramMermaidCode.value;
  };

  const _fetchSystemPrompt = async () => {
    const key = agentConfigRef.value.systemPromptKey;
    if (key) {
      try {
        const response = await api.get(`/prompts/${key}.md`);
        currentSystemPrompt.value = response.data as string;
      } catch (e) {
        console.error(`[${agentDisplayName.value}] Failed to load system prompt: ${key}.md`, e);
        currentSystemPrompt.value = "You are Architectron, a System Design AI. Default prompt: Design systems collaboratively...";
        toast?.add({type: 'error', title: 'Prompt Load Error', message: 'Could not load Architectron instructions.'});
      }
    } else {
      currentSystemPrompt.value = "You are Architectron, a System Design AI. Default prompt: Design systems collaboratively...";
    }
  };
  
  // Define _updateChatStoreMainContent before it's used if it was the cause of "Cannot find name"
  // Though it's not directly called in this file, it's good practice if it were an internal helper.
  // For this composable, direct updates to chatStore.updateMainContent are used.

  const initialize = async (agentDef: IAgentDefinition): Promise<void> => {
    isLoadingResponse.value = false;
    // agentConfigRef.value = agentDef; // Props handle this reactivity
    await _fetchSystemPrompt();

    const existingContext = agentStore.getAgentContext(agentId.value) as ArchitectronAgentContext;
    if (existingContext) {
      currentDiagramMermaidCode.value = existingContext.current_diagram_mermaid_code || '';
      nfrInputText.value = existingContext.non_functional_requirements || '';
    }
    isDiagramExplainable.value = !!currentDiagramMermaidCode.value;

    if (!mainContentToDisplay.value?.data || mainContentToDisplay.value?.title === `${agentDisplayName.value} Ready`) {
      const welcomeMarkdown = `
  <div class="architectron-welcome-container" style="text-align: center; padding: 2rem;">
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width: 4rem; height: 4rem; margin: 0 auto 1rem auto; color: hsl(var(--agent-architectron-accent-hue, 240), var(--agent-architectron-accent-saturation, 65%), var(--agent-architectron-accent-lightness, 55%)); filter: drop-shadow(0 0 12px hsla(var(--agent-architectron-accent-hue, 240), var(--agent-architectron-accent-saturation, 65%), var(--agent-architectron-accent-lightness, 55%), 0.6));">
      <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h12M3.75 3h-1.5m1.5 0h16.5M3.75 3V1.5M12.75 3v11.25A2.25 2.25 0 0 1 10.5 16.5H6M12.75 3h1.5m-1.5 0h7.5M12.75 3V1.5M6 16.5h12M6 16.5H4.5M20.25 16.5H18M18 16.5l.75-3.75M18 16.5l-.75 3.75M18 16.5l2.25-.75M18 16.5l-2.25.75M6 16.5l.75-3.75M6 16.5l-.75 3.75M6 16.5l2.25-.75M6 16.5l-2.25.75" />
    </svg>
    <h2 style="font-size: 1.75rem; font-weight: bold; margin-bottom: 0.5rem; color: hsl(var(--agent-architectron-accent-hue, 240), var(--agent-architectron-accent-saturation, 65%), calc(var(--agent-architectron-accent-lightness, 55%) + 25%));">${agentDisplayName.value}: System Design Assistant</h2>
    <p style="margin-bottom: 1.25rem; color: var(--text-secondary-dark); max-width: 600px; margin-left:auto; margin-right:auto;">${agentConfigRef.value.description || 'Ready to collaboratively design and diagram complex systems.'}</p>
    <p style="font-style: italic; color: var(--text-muted-dark);">${agentConfigRef.value.inputPlaceholder || 'Describe the system you want to design, or the problem to solve.'}</p>
  </div>`;
      chatStore.updateMainContent({
          agentId: agentId.value, type: 'markdown', data: welcomeMarkdown,
          title: `${agentDisplayName.value} Ready`, timestamp: Date.now()
      });
    }
    chatStore.ensureMainContentForAgent(agentId.value);
  };

  const cleanup = (): void => {
    agentStore.updateAgentContext({
        agentId: agentId.value,
        current_diagram_mermaid_code: currentDiagramMermaidCode.value,
        non_functional_requirements: nfrInputText.value,
    } as ArchitectronAgentContext & { agentId: string });
    console.log(`[${agentDisplayName.value}] Cleanup complete.`);
  };

  const handleNewUserInput = async (text: string): Promise<void> => {
    if (!text.trim() || isLoadingResponse.value) return;
    const currentAgentIdStr = agentId.value;

    chatStore.addMessage({
      role: 'user', content: text,
      timestamp: Date.now(), agentId: currentAgentIdStr,
    });
    isLoadingResponse.value = true;
    currentHistoryDiagramIndex.value = -1;

    const currentDesignTitle = mainContentToDisplay.value?.title?.replace(/Processing...|Ready/g, "").trim() || "System Design";
    const loadingMessage = `## ${currentDesignTitle}\n\nArchitectron is evolving the design based on: *"${text.substring(0, 50)}..."*\n\n<div class="flex justify-center items-center p-8 architectron-spinner-container"><div class="architectron-spinner"></div><span class="ml-3 text-slate-400 dark:text-slate-500">Architecting...</span></div>`;
    chatStore.updateMainContent({
      agentId: currentAgentIdStr, type: 'markdown', data: loadingMessage,
      title: `Processing: ${text.substring(0, 30)}...`, timestamp: Date.now()
    });
    chatStore.setMainContentStreaming(true, loadingMessage);

    try {
      const agentContextForLLM: ArchitectronAgentContext = {
        current_diagram_mermaid_code: currentDiagramMermaidCode.value,
        non_functional_requirements: nfrInputText.value || "Not specified by user yet. Please ask if relevant.",
        current_design_focus: (agentStore.getAgentContext(currentAgentIdStr) as ArchitectronAgentContext)?.current_design_focus || "Overall System",
      };

      const personaOverride = chatStore.getPersonaForAgent(currentAgentIdStr);
      const baseInstructions = agentConfigRef.value.id === 'explain_diagram'
        ? 'Focus on explaining the provided diagram from the AGENT_CONTEXT_JSON.'
        : 'Focus on iterative design, diagram updates, and structured explanations.';
      const combinedInstructions = [baseInstructions, personaOverride?.trim()].filter(Boolean).join('\n\n');

      const finalSystemPrompt = currentSystemPrompt.value
        .replace(/{{LANGUAGE}}/g, voiceSettingsManager.settings.preferredCodingLanguage || 'any')
        .replace(/{{RECENT_TOPICS_SUMMARY}}/gi, (agentStore.getAgentContext(currentAgentIdStr) as ArchitectronAgentContext)?.current_design_focus || "the previous state of the design")
        .replace(/{{GENERATE_DIAGRAM}}/g, "true")
        .replace(/{{AGENT_CONTEXT_JSON}}/g, JSON.stringify(agentContextForLLM))
        .replace(/{{ADDITIONAL_INSTRUCTIONS}}/g, combinedInstructions);
        // Note: agentConfigRef.value.id is used for mode, not promptMode

      const historyForAPI = await chatStore.getHistoryForApi(
        currentAgentIdStr, text, finalSystemPrompt, advancedHistoryConfig.value
      );
      
      const messagesToSend: ChatMessageFE[] = [...historyForAPI]; // historyForAPI should include the system prompt as first message if using advanced manager logic properly
      if (messagesToSend.length === 0 || messagesToSend[0].role !== 'system') {
        messagesToSend.unshift({ role: 'system', content: finalSystemPrompt });
      } else {
        messagesToSend[0].content = finalSystemPrompt;
      }
       if (messagesToSend[messagesToSend.length-1]?.content !== text || messagesToSend[messagesToSend.length-1]?.role !== 'user') {
         messagesToSend.push({role: 'user', content: text, timestamp: Date.now(), agentId: currentAgentIdStr});
      }

      const basePayload: ChatMessagePayloadFE = {
        messages: messagesToSend,
        mode: agentConfigRef.value.id, // Use agent's ID as the mode
        language: voiceSettingsManager.settings.preferredCodingLanguage,
        generateDiagram: true,
        userId: 'frontend_user_architectron',
        conversationId: chatStore.getCurrentConversationId(currentAgentIdStr),
        stream: true,
      };
      const payload = chatStore.attachPersonaToPayload(currentAgentIdStr, basePayload);

      let accumulatedContent = "";
      chatStore.clearStreamingMainContent();

      const finalResponse = await chatAPI.sendMessageStream(
          payload,
          (chunk) => {
              accumulatedContent += chunk;
              chatStore.appendStreamingMainContent(chunk);
              chatStore.updateMainContent({
                  agentId: currentAgentIdStr,
                  type: agentConfigRef.value.capabilities?.usesCompactRenderer ? 'compact-message-renderer-data' : 'markdown',
                  data: accumulatedContent,
                  title: `Architectron's Design: Iteration on "${text.substring(0,25)}..."`,
                  timestamp: Date.now(),
              });
          },
          () => { // onStreamEnd
              isLoadingResponse.value = false;
              chatStore.setMainContentStreaming(false);
              const finalContent = accumulatedContent.trim();

              if (!finalContent) {
                  chatStore.updateMainContent({
                      agentId: currentAgentIdStr, type: 'markdown',
                      data: mainContentToDisplay.value?.data?.replace(/## .*Architecting.../s, "Ready for next design input.") || "How can we refine the design?",
                      title: `${agentDisplayName.value} Ready`, timestamp: Date.now()
                  });
                  toast?.add({type: 'info', title: 'Architectron', message: 'No new content generated.'});
                  return;
              }

              chatStore.updateMainContent({
                agentId: currentAgentIdStr,
                type: agentConfigRef.value.capabilities?.usesCompactRenderer ? 'compact-message-renderer-data' : 'markdown',
                data: finalContent,
                title: `Architectron's Design: Iteration on "${text.substring(0,25)}..."`,
                timestamp: Date.now(),
              });

              chatStore.addMessage({
                  role: 'assistant',
                  content: finalContent,
                  timestamp: Date.now(), agentId: currentAgentIdStr,
              });

              const newDiagram = extractMermaidCode(finalContent);
              _updateDiagramState(newDiagram);
          },
          (error) => { // onStreamError
              console.error(`[${agentDisplayName.value}] Stream error:`, error);
              const errMsg = error.message || "Architectron had an issue updating the design.";
              toast?.add({ type: 'error', title: `${agentDisplayName.value} Error`, message: errMsg });
              chatStore.addMessage({ role: 'error', content: `Sorry, I encountered an issue: ${errMsg}`, agentId: currentAgentIdStr });
              chatStore.updateMainContent({
                  agentId: currentAgentIdStr, type: 'markdown',
                  data: `### Error Updating Design\n\n*${errMsg.replace(/</g, '&lt;').replace(/>/g, '&gt;')}*`,
                  title: 'Design Error', timestamp: Date.now()
              });
              isLoadingResponse.value = false;
              chatStore.setMainContentStreaming(false);
          }
      );
      chatStore.syncPersonaFromResponse(currentAgentIdStr, finalResponse);

    } catch (error: any) {
      console.error(`[${agentDisplayName.value}] Chat API setup error:`, error);
      const errMsg = error.response?.data?.message || error.message || 'An error occurred with Architectron.';
      toast?.add({ type: 'error', title: `${agentDisplayName.value} Error`, message: errMsg });
      chatStore.addMessage({ role: 'error', content: `Sorry, I encountered an issue: ${errMsg}`, agentId: currentAgentIdStr });
      chatStore.updateMainContent({
          agentId: currentAgentIdStr, type: 'markdown',
          data: `### Error Updating Design\n\n*${errMsg.replace(/</g, '&lt;').replace(/>/g, '&gt;')}*`,
          title: 'Design Error', timestamp: Date.now()
      });
      isLoadingResponse.value = false;
      chatStore.setMainContentStreaming(false);
    }
  };

  const explainCurrentDiagram = async (): Promise<void> => {
    if (!currentDiagramMermaidCode.value) {
      toast?.add({ type: 'info', title: 'No Diagram', message: 'There is no current diagram to explain.' });
      return;
    }
    const query = `Please provide a detailed explanation of the following Mermaid diagram. Describe its components, their relationships, the overall data flow, and the design rationale it represents.

Diagram:
\`\`\`mermaid
${currentDiagramMermaidCode.value}
\`\`\`
`;
    agentStore.updateAgentContext({
        agentId: agentId.value,
        current_design_focus: "Explaining Current Diagram"
    } as ArchitectronAgentContext & { agentId: string });
    await handleNewUserInput(query);
  };

  const _displayDiagramFromHistory = (diagramCode: string) => {
    // Update the main diagram display area directly without a full LLM roundtrip for just viewing.
    // The LLM is invoked if the user then decides to iterate from this historical point.
    currentDiagramMermaidCode.value = diagramCode; // Set this as the "active" diagram for context
    isDiagramExplainable.value = true;

    const historyVersion = diagramHistory.value.findIndex(d => d === diagramCode);
    const displayVersion = historyVersion !== -1 ? diagramHistory.value.length - historyVersion : 'Selected Historical';

    const contentForDisplay = `# Historical Diagram (Version ${displayVersion})\n\nThis is a previous version of the system diagram. You can ask me to explain it, or use the chat to iterate from this version.\n\n\`\`\`mermaid\n${diagramCode}\n\`\`\`\n\nTo resume designing from the latest version, click "Show Latest Diagram".`;

    chatStore.updateMainContent({
      agentId: agentId.value,
      type: 'markdown',
      data: contentForDisplay,
      title: `Historical Diagram - Version ${displayVersion}`,
      timestamp: Date.now(),
    });
    // When a historical diagram is shown, update the agent context
    // so the LLM knows this is the current point of reference if user types next.
    agentStore.updateAgentContext({
        agentId: agentId.value,
        current_diagram_mermaid_code: diagramCode,
        current_design_focus: `Reviewing historical diagram version ${displayVersion}`
    } as ArchitectronAgentContext & { agentId: string });
  };

  const showPreviousDiagram = (): void => {
    if (!canShowPreviousDiagram.value) return;
    if (currentHistoryDiagramIndex.value === -1) {
      if (diagramHistory.value.length > 0) {
        currentHistoryDiagramIndex.value = 0;
      } else return; // No history
    } else if (currentHistoryDiagramIndex.value > 0) {
      currentHistoryDiagramIndex.value--;
    }
    _displayDiagramFromHistory(diagramHistory.value[currentHistoryDiagramIndex.value]);
  };

  const showNextDiagram = (): void => {
    if (!canShowNextDiagram.value) return;
    if (currentHistoryDiagramIndex.value < diagramHistory.value.length - 1) {
      currentHistoryDiagramIndex.value++;
      _displayDiagramFromHistory(diagramHistory.value[currentHistoryDiagramIndex.value]);
    }
  };
  
  const showLatestDiagram = (): void => {
    if (currentHistoryDiagramIndex.value !== -1) { // Only if viewing history
      currentHistoryDiagramIndex.value = -1;
      // Find the latest diagram. This should be the one that *was* live before history navigation.
      // Or, if history was just built up, the latest live one might be in agentStore or implicitly the one before history viewing started.
      // For simplicity, assume the "live" currentDiagramMermaidCode was updated correctly by LLM responses.
      const liveDiagram = (agentStore.getAgentContext(agentId.value) as ArchitectronAgentContext)?.current_diagram_mermaid_code || diagramHistory.value[0] || "";

      if (liveDiagram) {
         _displayDiagramFromHistory(liveDiagram); // Re-display the live one as if it's historical to trigger description
         currentDiagramMermaidCode.value = liveDiagram; // Ensure this is set as the current one
         toast?.add({type: 'info', title: 'Live Diagram', message: 'Now viewing the latest version of the diagram.'});
      } else {
         toast?.add({type: 'info', title: 'Live Diagram', message: 'No current live diagram available. Please generate one.'});
         chatStore.updateMainContent({
            agentId: agentId.value, type: 'markdown',
            data: "## Latest Design\nNo active diagram. Please continue designing.",
            title: `${agentDisplayName.value} - Latest`, timestamp: Date.now(),
         });
      }
       isDiagramExplainable.value = !!currentDiagramMermaidCode.value;
    }
  };

  const updateNfrInput = (text: string): void => {
    nfrInputText.value = text;
    agentStore.updateAgentContext({
        agentId: agentId.value,
        non_functional_requirements: text
    } as ArchitectronAgentContext & { agentId: string });
  };

  watch(() => (agentStore.getAgentContext(agentId.value) as ArchitectronAgentContext)?.current_diagram_mermaid_code, (newCode) => {
    if (newCode && newCode !== currentDiagramMermaidCode.value && currentHistoryDiagramIndex.value === -1) {
      // External update while on "live" view
      if(currentDiagramMermaidCode.value) { // Add old live to history
        diagramHistory.value.unshift(currentDiagramMermaidCode.value);
        if (diagramHistory.value.length > MAX_DIAGRAM_HISTORY_LENGTH) diagramHistory.value.pop();
      }
      currentDiagramMermaidCode.value = newCode as string;
      isDiagramExplainable.value = true;
    }
  });

  return {
    isLoadingResponse, currentSystemPrompt, currentDiagramMermaidCode,
    diagramHistory, currentHistoryDiagramIndex, nfrInputText,
    advancedHistoryConfig, isDiagramExplainable,
    agentDisplayName, mainContentToDisplay, canShowPreviousDiagram, canShowNextDiagram,
    initialize, cleanup, handleNewUserInput, explainCurrentDiagram,
    showPreviousDiagram, showNextDiagram, showLatestDiagram,
    updateNfrInput, extractMermaidCode,
  };
}
