// File: frontend/src/components/agents/catalog/TutorAgent/useTutorAgent.ts
/**
 * @file useTutorAgent.ts
 * @description Composable for "Professor Astra" - the AI Tutor Agent.
 * Manages state, LLM interactions, V1 "Option D/T1" tool calls (quizzes, flashcards),
 * and advanced content rendering.
 * @version 1.2.1 - Further TypeScript error corrections.
 */
import { ref, computed, watch, type Ref } from 'vue';
import { useAgentStore } from '@/store/agent.store';
import { useChatStore, type MainContent, type ILlmToolCallUI } from '@/store/chat.store'; // Removed unused StoreChatMessage
import type { IAgentDefinition } from '@/services/agent.service';
import { voiceSettingsManager, type TutorLevel } from '@/services/voice.settings.service';
import {
  api, // Import base api instance for direct calls if needed (like to /prompts)
  chatAPI,
  type ChatMessagePayloadFE,
  type ChatResponseDataFE,
  type FunctionCallResponseDataFE,
  type TextResponseDataFE,
  type ChatMessageFE,
  type ILlmToolCallFE,
} from '@/utils/api';
import type { ToastService } from '@/services/services';
import { marked, type MarkedOptions } from 'marked';
import hljs from 'highlight.js';
import { themeManager } from '@/theme/ThemeManager';
import { generateId } from '@/utils/ids';

import {
  type AdvancedHistoryConfig,
  DEFAULT_TUTOR_ADVANCED_HISTORY_CONFIG,
  type CreateQuizItemToolArgs,
  type CreateFlashcardToolArgs,
  type QuizItemContent,
  type FlashcardContent,
  type QuizItemToolResult,
  type FlashcardToolResult,
  type TutorAgentComposable,
} from './TutorAgentTypes';

declare var mermaid: any;

const SVG_ICON_COPY_STRING_TUTOR = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor" class="icon-xs"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" /></svg>`;
const SVG_ICON_CHECK_STRING_TUTOR = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="icon-xs text-success-default"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>`;


export function useTutorAgent(
  agentConfigRef: Ref<IAgentDefinition>,
  toastInstance?: ToastService,
): TutorAgentComposable {

  const agentStore = useAgentStore();
  const chatStore = useChatStore();
  const agentId = computed<string>(() => agentConfigRef.value.id);
  const toast = toastInstance;

  const isLoadingResponse = ref<boolean>(false);
  const currentSystemPrompt = ref<string>('');
  const currentTutorLevel = ref<TutorLevel>(
    (agentStore.getAgentContext(agentId.value)?.tutorLevel as TutorLevel) ||
    (voiceSettingsManager.settings?.defaultTutorLevel as TutorLevel) ||
    'intermediate'
  );
  const showLevelSelector = ref<boolean>(false);
  const levelSelectorRef = ref<HTMLElement | null>(null);
  const pendingToolCallInfo = ref<{
    toolCallId: string;
    toolName: string;
    assistantMessageText?: string | null;
  } | null>(null);
  const advancedHistoryConfig = ref<AdvancedHistoryConfig>({ ...DEFAULT_TUTOR_ADVANCED_HISTORY_CONFIG });

  const activeQuizItem = ref<QuizItemContent | null>(null);
  const activeFlashcard = ref<FlashcardContent | null>(null);

  const agentDisplayName = computed<string>(() => agentConfigRef.value.label || "Professor Astra");
  const mainContentDisplayAreaId = computed<string>(() => `${agentId.value}-main-content-display-tutor`);

  let _callTutorLLM: (
    actionHint: string, // Removed userInputOrContent
    messagesForLlm: ChatMessageFE[],
    toolChoiceOverride?: "auto" | "none" | { type: "function"; function: { name: string; } }
  ) => Promise<ChatResponseDataFE | null>;

  // Defined early for use in _handleLLMError and other places
  const mainContentToDisplay = computed<MainContent | null>(() => {
    const currentAgentIdVal = agentId.value;
    if (!currentAgentIdVal) return null;
    return chatStore.getMainContentForAgent(currentAgentIdVal);
  });

  const _updateChatStoreMainContent = (customMarkdown?: string, isCurrentlyStreaming: boolean = false) => {
    const currentAgentIdStr = agentId.value;
    const baseMarkdown = customMarkdown !== undefined
        ? customMarkdown
        : (mainContentToDisplay.value?.data as string || '');

    const title = mainContentToDisplay.value?.title || `${agentDisplayName.value} Ready`;

    chatStore.setMainContentStreaming(isCurrentlyStreaming);
    const content: MainContent = {
        agentId: currentAgentIdStr, type: 'markdown',
        data: baseMarkdown + (isCurrentlyStreaming ? "▋" : ""),
        title: title,
        timestamp: Date.now(),
    };
    chatStore.updateMainContent(content);
  };

  const _handleLLMError = (error: any, actionHint?: string) => {
    isLoadingResponse.value = false;
    chatStore.setMainContentStreaming(false);
    const errorMessage = error.response?.data?.message || error.message || `An error occurred with ${agentDisplayName.value} (Action: ${actionHint}).`;
    console.error(`[${agentDisplayName.value}] LLM Error (Action: ${actionHint}):`, error);
    toast?.add({ type: 'error', title: `${agentDisplayName.value} Error`, message: errorMessage });
    const currentAgentIdStr = agentId.value;
    if (['chat_response', 'tool_response_continuation'].includes(actionHint || '')) {
      chatStore.addMessage({ role: 'error', content: `Sorry, I encountered a problem. Please try again.`, agentId: currentAgentIdStr });
    }
    _updateChatStoreMainContent(undefined, false); // Update with current state after error
  };

  const _getRecentTopicsSummaryForPrompt = (): string => {
    const currentAgentIdStr = agentId.value;
    const agentMessages = chatStore.getMessagesForAgent(currentAgentIdStr);
    const userTopics = agentMessages
      .filter(m => m.role === 'user' && m.content && m.content.trim().length > 5 && !m.content.toLowerCase().startsWith("please adjust"))
      .slice(-5).map(m => m.content!.length > 40 ? m.content!.substring(0, 40) + "..." : m.content!)
      .filter((value, index, self) => self.indexOf(value) === index).slice(-2);
    if (userTopics.length === 0) return "a new topic";
    if (userTopics.length === 1) return `our discussion on "${userTopics[0]}"`;
    return `our discussions on "${userTopics.join('" and "')}"`;
  };

  const _sendToolResultToLLM = async (toolCallId: string, toolName: string, result: QuizItemToolResult | FlashcardToolResult) => {
    const currentAgentIdStr = agentId.value;
    isLoadingResponse.value = true;

    const toolResponseMessage: ChatMessageFE = {
      role: 'tool',
      tool_call_id: toolCallId,
      name: toolName,
      content: JSON.stringify(result),
    };
    chatStore.addMessage({ ...toolResponseMessage, agentId: currentAgentIdStr, timestamp: Date.now() });

    const messagesForLlm = await chatStore.getHistoryForApi(currentAgentIdStr, '', currentSystemPrompt.value, advancedHistoryConfig.value);

    const llmResponseData = await _callTutorLLM(
      "tool_response_continuation", // actionHint
      messagesForLlm
    );

    isLoadingResponse.value = false;
    pendingToolCallInfo.value = null;

    if (llmResponseData) {
      const nextAssistantMessageText = (llmResponseData as TextResponseDataFE).content ?? (llmResponseData as FunctionCallResponseDataFE).assistantMessageText ?? null;
      const nextToolCalls = (llmResponseData as TextResponseDataFE).tool_calls ||
                           ((llmResponseData as FunctionCallResponseDataFE).toolName ? [{
                               id: (llmResponseData as FunctionCallResponseDataFE).toolCallId,
                               type: 'function' as 'function',
                               function: {
                                   name: (llmResponseData as FunctionCallResponseDataFE).toolName,
                                   arguments: JSON.stringify((llmResponseData as FunctionCallResponseDataFE).toolArguments)
                               }
                           }] : undefined);

      chatStore.addMessage({
        role: 'assistant',
        content: nextAssistantMessageText,
        agentId: currentAgentIdStr,
        model: llmResponseData.model,
        timestamp: Date.now(),
        tool_calls: nextToolCalls as ILlmToolCallUI[] | undefined,
      });

      // Update active tools based on LLM's response to the tool result
      activeQuizItem.value = null; // Clear quiz after LLM processes its result
      activeFlashcard.value = null; // Clear flashcard

      if (nextToolCalls && nextToolCalls.length > 0) {
        await _processToolCallsInternal(nextToolCalls as ILlmToolCallFE[], nextAssistantMessageText);
      } else if (nextAssistantMessageText) {
        _updateChatStoreMainContent(nextAssistantMessageText, false);
      }
    }
  };

  const _processToolCallsInternal = async (toolCalls: ILlmToolCallFE[], assistantMessageText: string | null) => {
    if (toolCalls && toolCalls.length > 0) {
      const toolCall = toolCalls[0]; // Process one tool call for V1 simplicity
      pendingToolCallInfo.value = {
        toolCallId: toolCall.id,
        toolName: toolCall.function.name,
        assistantMessageText: assistantMessageText,
      };
      const toolArgs = JSON.parse(toolCall.function.arguments);

      console.log(`[${agentDisplayName.value}] LLM TOOL CALL REQUESTED: ${toolCall.function.name}`, toolArgs);
      activeQuizItem.value = null; // Clear previous active tools
      activeFlashcard.value = null;

      if (toolCall.function.name === 'createQuizItem') {
        activeQuizItem.value = {
          ...(toolArgs as CreateQuizItemToolArgs),
          tool_call_id: toolCall.id,
          isAnswered: false,
        };
      } else if (toolCall.function.name === 'createFlashcard') {
        activeFlashcard.value = {
          ...(toolArgs as CreateFlashcardToolArgs),
          tool_call_id: toolCall.id,
          isFlipped: false,
        };
      } else {
        toast?.add({ type: 'warning', title: 'Unknown Tool', message: `Tool "${toolCall.function.name}" received but not handled by frontend.` });
        // For an unknown tool, send a result indicating it's not implemented.
        // Use FlashcardToolResult structure as a generic way to pass an error or status.
        const errorResult: FlashcardToolResult = { reviewed: false, status: `Error: Tool '${toolCall.function.name}' not implemented by frontend.`, error: "Tool not implemented" };
        await _sendToolResultToLLM(toolCall.id, toolCall.function.name, errorResult);
        return;
      }
      _updateChatStoreMainContent(assistantMessageText || `Professor Astra has prepared a ${toolCall.function.name === 'createQuizItem' ? 'quiz' : 'flashcard'} for you.`, false);
    }
  };

  _callTutorLLM = async (
    actionHint: string, // Removed userInputOrContent
    messagesForLlm: ChatMessageFE[],
    toolChoiceOverride?: "auto" | "none" | { type: "function"; function: { name: string; } }
  ): Promise<ChatResponseDataFE | null> => {
    isLoadingResponse.value = true;
    const currentAgentIdStr = agentId.value;

    if (!currentSystemPrompt.value) await fetchSystemPrompt();

    const recentTopicsSummary = _getRecentTopicsSummaryForPrompt();
    const generateDiagrams = agentConfigRef.value.capabilities?.canGenerateDiagrams && (voiceSettingsManager.settings?.generateDiagrams ?? false);

      const personaOverride = chatStore.getPersonaForAgent(currentAgentIdStr);
      const baseInstructions = `Key Directives: Use Socratic method for chat replies. Structure main content for clarity (like slides). Adapt to ${currentTutorLevel.value}. Use tools like \`createQuizItem\` or \`createFlashcard\` when pedagogically appropriate. Explain concepts clearly with Markdown. If helpful, provide Mermaid diagrams in \`\`\`mermaid blocks.`;
      const combinedInstructions = [baseInstructions, personaOverride?.trim()].filter(Boolean).join('\n\n');

      const finalSystemPrompt = currentSystemPrompt.value
        .replace(/{{LANGUAGE}}/g, voiceSettingsManager.settings?.preferredCodingLanguage || 'general')
        .replace(/{{MODE}}/g, currentAgentIdStr)
        .replace(/{{TUTOR_LEVEL}}/g, currentTutorLevel.value)
        .replace(/{{RECENT_TOPICS_SUMMARY}}/gi, recentTopicsSummary)
        .replace(/{{GENERATE_DIAGRAM}}/g, String(generateDiagrams))
        .replace(/{{AGENT_CONTEXT_JSON}}/g, JSON.stringify(agentStore.getAgentContext(currentAgentIdStr) || { tutorLevel: currentTutorLevel.value }))
        .replace(/{{ADDITIONAL_INSTRUCTIONS}}/g, combinedInstructions);

    const messagesToSend: ChatMessageFE[] = [...messagesForLlm];
    if (messagesToSend.length > 0 && messagesToSend[0].role === 'system') {
        messagesToSend[0].content = finalSystemPrompt;
    } else {
        messagesToSend.unshift({ role: 'system', content: finalSystemPrompt });
    }

    const basePayload: ChatMessagePayloadFE = {
        messages: messagesToSend,
        mode: `${currentAgentIdStr}-${actionHint}`,
        language: voiceSettingsManager.settings?.preferredCodingLanguage,
        generateDiagram: generateDiagrams,
        userId: `tutor_user_${generateId()}`,
        conversationId: chatStore.getCurrentConversationId(currentAgentIdStr),
        tutorMode: true,
        tutorLevel: currentTutorLevel.value,
        stream: false,
        tool_choice: toolChoiceOverride || "auto",
    };
    const payload = chatStore.attachPersonaToPayload(currentAgentIdStr, basePayload);

    try {
      const response = await chatAPI.sendMessage(payload);
      chatStore.syncPersonaFromResponse(currentAgentIdStr, response.data);
      return response.data;
    } catch (error: any) {
      _handleLLMError(error, actionHint);
      return null;
    } finally {
      isLoadingResponse.value = false;
    }
  };

  const fetchSystemPrompt = async (): Promise<void> => {
    const promptKey = agentConfigRef.value.systemPromptKey || 'tutor';
    if (promptKey) {
      try {
        const response = await api.get(`/prompts/${promptKey}.md`); // Use base 'api' instance
        currentSystemPrompt.value = response.data as string;
      } catch (e) {
        console.error(`[${agentDisplayName.value}] Error loading prompt '${promptKey}.md':`, e);
        currentSystemPrompt.value = "You are Professor Astra, an AI Tutor...";
        toast?.add({ type: 'warning', title: 'Prompt Load Error', message: `Could not load custom instructions. Using default.`});
      }
    } else {
      currentSystemPrompt.value = "You are Professor Astra, an AI Tutor...";
    }
  };

  const setTutorLevel = (level: TutorLevel): void => {
    if (currentTutorLevel.value === level) return;
    const oldLevel = currentTutorLevel.value;
    currentTutorLevel.value = level;
    showLevelSelector.value = false;
    const currentAgentIdStr = agentId.value;
    agentStore.updateAgentContext({ agentId: currentAgentIdStr, tutorLevel: level });
    voiceSettingsManager.updateSetting('defaultTutorLevel', level);
    toast?.add({type: 'info', title: 'Tutor Level Updated', message: `${agentDisplayName.value} will now teach at the ${level} level.`, duration: 3500});

    const currentContent = mainContentToDisplay.value;
    if (oldLevel && level !== oldLevel && currentContent?.data && !currentContent.title?.includes(`${agentDisplayName.value} Ready`)) {
      const currentTopic = currentContent.title?.replace(/(Professor Astra on: |Processing:|Ready$)/i, "").trim() || 'the current topic';
      handleNewUserInput(`I've changed my learning preference to ${level}. Please adjust your explanation for our discussion on "${currentTopic}".`);
    }
  };

  const handleNewUserInput = async (text: string): Promise<void> => {
    if (!text.trim()) return;
    const currentAgentIdStr = agentId.value;

    activeQuizItem.value = null;
    activeFlashcard.value = null;
    pendingToolCallInfo.value = null;

    chatStore.addMessage({
      role: 'user',
      content: text,
      agentId: currentAgentIdStr,
      timestamp: Date.now()
    });

    isLoadingResponse.value = true;
    chatStore.setMainContentStreaming(true);
    const currentTopicTitle = text.substring(0, 40).trim() || "current lesson";
    const thinkingData = `## ${currentTopicTitle}\n\n${agentDisplayName.value} is preparing your lesson...\n<div class="professor-astra-spinner-container mx-auto my-6"><div class="professor-astra-spinner"></div></div>`;
    chatStore.updateMainContent({
        agentId: currentAgentIdStr, type: 'markdown', data: thinkingData,
        title: `Processing: ${currentTopicTitle}...`, timestamp: Date.now()
    });

    const messagesForLlm = await chatStore.getHistoryForApi(currentAgentIdStr, text, currentSystemPrompt.value, advancedHistoryConfig.value);
    const llmResponseData = await _callTutorLLM("chat_response", messagesForLlm);

    isLoadingResponse.value = false;
    chatStore.setMainContentStreaming(false);

    if (llmResponseData) {
      const assistantMessageText = (llmResponseData as TextResponseDataFE).content ?? (llmResponseData as FunctionCallResponseDataFE).assistantMessageText ?? null;
      const toolCallsFromResp = (llmResponseData as TextResponseDataFE).tool_calls ||
                       ((llmResponseData as FunctionCallResponseDataFE).toolName ? [{
                           id: (llmResponseData as FunctionCallResponseDataFE).toolCallId,
                           type: 'function' as 'function',
                           function: {
                               name: (llmResponseData as FunctionCallResponseDataFE).toolName,
                               arguments: JSON.stringify((llmResponseData as FunctionCallResponseDataFE).toolArguments)
                           }
                       }] : undefined);

      chatStore.addMessage({
        role: 'assistant',
        content: assistantMessageText,
        agentId: currentAgentIdStr,
        model: llmResponseData.model,
        timestamp: Date.now(),
        tool_calls: toolCallsFromResp as ILlmToolCallUI[] | undefined,
      });

      if (toolCallsFromResp && toolCallsFromResp.length > 0) {
        await _processToolCallsInternal(toolCallsFromResp as ILlmToolCallFE[], assistantMessageText);
      } else if (assistantMessageText) {
        _updateChatStoreMainContent(assistantMessageText, false);
      } else {
        _updateChatStoreMainContent("Professor Astra is considering your input.", false);
      }
    }
    _updateChatStoreMainContent(mainContentToDisplay.value?.data as string || '', false);
  };

  const submitQuizAnswer = async (answer: string | number): Promise<void> => {
    if (!activeQuizItem.value || !pendingToolCallInfo.value ) {
      toast?.add({ type: 'error', title: 'No Active Quiz', message: 'Cannot submit answer.' });
      return;
    }
    const quizResult: QuizItemToolResult = { userAnswered: true };
    if (typeof answer === 'number' && activeQuizItem.value.options[answer]) {
      quizResult.selectedOptionIndex = answer;
      quizResult.selectedOptionText = activeQuizItem.value.options[answer].text;
    } else if (typeof answer === 'string') {
      quizResult.userShortAnswer = answer;
    }

    activeQuizItem.value.isAnswered = true;
    activeQuizItem.value.userAnswer = answer;
    // _updateChatStoreMainContent(mainContentToDisplay.value?.data as string || '', false); // Refresh UI

    await _sendToolResultToLLM(pendingToolCallInfo.value.toolCallId, 'createQuizItem', quizResult);
  };

  const acknowledgeFlashcard = async (): Promise<void> => {
    if (!activeFlashcard.value || !pendingToolCallInfo.value) {
      toast?.add({ type: 'error', title: 'No Active Flashcard', message: 'Cannot acknowledge.' });
      return;
    }
    const flashcardResult: FlashcardToolResult = {
      reviewed: true,
      status: `User reviewed flashcard: ${activeFlashcard.value.frontContent.substring(0,30)}...`
    };
    await _sendToolResultToLLM(pendingToolCallInfo.value.toolCallId, 'createFlashcard', flashcardResult);
  };

  // highlight.js and marked setup
  const highlightFn = (code: string, lang: string | undefined): string => {
    const language = lang && hljs.getLanguage(lang) ? lang : 'plaintext';
    try {
        return hljs.highlight(code, { language, ignoreIllegals: true }).value;
    } catch (error) { // Use a generic error type
        console.warn(`Highlight.js error for lang ${lang}:`, error);
        return hljs.highlight(code, { language: 'plaintext', ignoreIllegals: true }).value; // Fallback
    }
  };

  const markedOptions: MarkedOptions & { highlight?: (code: string, lang: string | undefined) => string } = {
    breaks: true,
    gfm: true,
    pedantic: false,
    highlight: highlightFn,
  };
  marked.setOptions(markedOptions);

  const tutorMarkedRenderer = new marked.Renderer();
  tutorMarkedRenderer.code = (code: string, infostring: string | undefined): string => {
    const lang = (infostring || '').match(/\S*/)?.[0];
    if (lang === 'mermaid') {
      const uniqueId = `mermaid-${generateId()}`;
      return `<div id="${uniqueId}" class="mermaid" data-mermaid-code="${encodeURIComponent(code)}">${code.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>`;
    }
    const languageToUse = lang || 'plaintext';
    const highlightedHtml = hljs.getLanguage(languageToUse)
      ? hljs.highlight(code, { language: languageToUse, ignoreIllegals: true }).value
      : hljs.highlightAuto(code).value;
    return enhanceCodeBlockHTML(highlightedHtml, languageToUse, code);
  };

  const renderMarkdownForTutorView = (
    content: string | null,
    quizItemToRender?: QuizItemContent | null,
    flashcardItemToRender?: FlashcardContent | null
  ): string => {
    let markdownString = content || '';
    if (!markdownString && !quizItemToRender && !flashcardItemToRender && !isLoadingResponse.value) {
        const agentDef = agentConfigRef.value;
        const placeholder = agentDef.inputPlaceholder || `What would you like to learn about with ${agentDisplayName.value}?`;
        return `<div class="tutor-empty-state"><p class="empty-state-text">${placeholder}</p></div>`;
    }
    try {
      return marked.parse(markdownString, { renderer: tutorMarkedRenderer });
    } catch (e) {
      console.error(`[${agentDisplayName.value}] Markdown error:`, e);
      return `<p class="text-error-default">Content rendering error.</p>`;
    }
  };

  function enhanceCodeBlockHTML(highlightedCodeHtml: string, lang: string, rawCode: string): string {
    const langDisplay = lang || 'code';
    return `
      <div class="enhanced-code-block-ephemeral" data-lang="${langDisplay}" data-raw-code="${encodeURIComponent(rawCode)}">
        <div class="code-header-ephemeral"><span class="code-language-tag-ephemeral">${langDisplay}</span><button class="copy-code-button-placeholder btn-icon-futuristic btn-xs" title="Copy code" aria-label="Copy code snippet">${SVG_ICON_COPY_STRING_TUTOR}</button></div>
        <pre><code class="language-${langDisplay} hljs">${highlightedCodeHtml}</code></pre>
      </div>`;
  }

  const addAllCopyButtonListenersToCodeBlocks = (containerElement: HTMLElement): void => {
    containerElement.querySelectorAll('button.copy-code-button-placeholder').forEach(buttonEl => {
      const button = buttonEl as HTMLElement; if (button.dataset.listenerAttached === 'true') return;
      const wrapper = button.closest('.enhanced-code-block-ephemeral'); if (!wrapper) return;
      const rawCode = decodeURIComponent((wrapper as HTMLElement).dataset.rawCode || '');
      button.addEventListener('click', async (ev) => {
        ev.stopPropagation();
        try {
          await navigator.clipboard.writeText(rawCode); button.innerHTML = SVG_ICON_CHECK_STRING_TUTOR;
          setTimeout(() => { button.innerHTML = SVG_ICON_COPY_STRING_TUTOR; }, 2000);
        } catch (err) {
          console.warn("Failed to copy code to clipboard:", err);
          button.textContent = 'Error'; setTimeout(() => { button.innerHTML = SVG_ICON_COPY_STRING_TUTOR; }, 2000);
        }
      });
      button.dataset.listenerAttached = 'true';
    });
  };

  const initializeMermaidTheme = () => {
    if (typeof mermaid !== 'undefined' && mermaid.initialize) {
      try {
        mermaid.initialize({ startOnLoad: false, theme: themeManager.getCurrentTheme().value?.isDark ? 'dark' : 'default' });
      } catch (e) { console.error("Mermaid initialization error:", e); }
    }
  };
  watch(() => themeManager.getCurrentTheme().value?.isDark, () => initializeMermaidTheme(), { immediate: true });

  const initialize = async (agentDef: IAgentDefinition): Promise<void> => {
    isLoadingResponse.value = true;
    agentConfigRef.value = agentDef;
    await fetchSystemPrompt();
    const currentAgentIdStr = agentId.value;
    currentTutorLevel.value = (agentStore.getAgentContext(currentAgentIdStr)?.tutorLevel as TutorLevel) || voiceSettingsManager.settings.defaultTutorLevel || 'intermediate';
    initializeMermaidTheme();
    activeQuizItem.value = null;
    activeFlashcard.value = null;
    isLoadingResponse.value = false;
    _updateChatStoreMainContent(mainContentToDisplay.value?.data as string || '', false);
  };

  const cleanup = (): void => {
    console.log(`[${agentDisplayName.value}] Cleanup called.`);
    activeQuizItem.value = null;
    activeFlashcard.value = null;
  };

  return {
    isLoadingResponse, currentSystemPrompt, currentTutorLevel, showLevelSelector, levelSelectorRef,
    pendingToolCall: pendingToolCallInfo,
    advancedHistoryConfig,
    agentDisplayName, mainContentDisplayAreaId, mainContentToDisplay,
    activeQuizItem,
    activeFlashcard,
    initialize, cleanup, fetchSystemPrompt, setTutorLevel, handleNewUserInput,
    renderMarkdownForTutorView, addAllCopyButtonListenersToCodeBlocks, enhanceCodeBlockHTML,
    handleClickOutsideLevelSelector: (event: MouseEvent) => {
        if (levelSelectorRef.value && !levelSelectorRef.value.contains(event.target as Node)) {
            showLevelSelector.value = false;
        }
    },
    submitQuizAnswer,
    acknowledgeFlashcard,
  };
}
