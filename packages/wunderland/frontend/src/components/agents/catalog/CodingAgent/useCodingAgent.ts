// File: frontend/src/components/agents/CodingAgent/useCodingAgent.ts
/**
 * @file useCodingAgent.ts
 * @description Main Vue composable for CodePilot (Coding Assistant) agent business logic.
 * Handles session management, LLM interactions, tool calling (simulated), and state management.
 * @version 1.1.0 - Updated to use Ref<T> in return type, simplified exports, refined tool simulation.
 */

import { ref, computed, nextTick, type Ref } from 'vue';
import { generateId } from '@/utils/ids';
// import { marked } from 'marked'; // Not used directly here, CompactMessageRenderer handles rendering
// import hljs from 'highlight.js'; // Not used directly here
import { useChatStore } from '@/store/chat.store';
import { voiceSettingsManager } from '@/services/voice.settings.service';
import { localStorageService, type IStorageService } from '@/services/localStorage.service';
import {
  chatAPI,
  promptAPI,
  type ChatMessagePayloadFE,
  type FunctionCallResponseDataFE,
  type TextResponseDataFE,
  type ChatMessageFE,
} from '@/utils/api';
import type { AdvancedHistoryConfig } from '@/services/advancedConversation.manager';
import type { IAgentDefinition } from '@/services/agent.service';
import type { ToastService } from '@/services/services';
import type {
  CodingSession,
  ToolCallRequest,
  // CodingAgentState, // Interface parts are directly implemented now
  CodingAgentComposable,
  CodingAgentConfig,
  // SessionFilterOptions, // Filtering logic primarily in SessionPanel
  ToolExecutionResult,
  CodeAnalysisResult,
  GitRepoStatus,
} from './CodingAgentTypes'; // Ensure DEFAULT_CODING_AGENT_CONFIG is imported if used from here, or defined locally
import { COMMON_DEV_KEYWORDS } from './CodingAgentTypes';

// Define default config within the composable or import it
const DEFAULT_CODING_AGENT_CONFIG_LOCAL: CodingAgentConfig = {
  defaultLanguage: 'python',
  maxSessionsInMemory: 100,
  sessionTitleTemplate: 'Coding Session - {date}',
  autoSaveSessions: false,
  storageNamespace: 'codePilotSessions_v1.1',
  maxCodeSnippetLength: 20000,
  enableSyntaxHighlighting: true,
  autoSaveInterval: 30000,
  enableCloudSync: false,
};


/**
 * @function useCodingAgent
 * @description Main composable for the CodePilot coding assistant agent.
 */
export function useCodingAgent(
  agentConfigRef: Ref<IAgentDefinition>, // Changed to Ref to be reactive if agentConfig can change
  toast?: ToastService,
  initialComposableConfig?: Partial<CodingAgentConfig>
): CodingAgentComposable {

  // ============================
  // REACTIVE STATE
  // ============================

  const currentQuery = ref<string>('');
  const currentCodeSnippet = ref<string | null>(null);
  const currentExplanationMarkdown = ref<string | null>(null);
  const currentLanguage = ref<string>(voiceSettingsManager.settings.preferredCodingLanguage || DEFAULT_CODING_AGENT_CONFIG_LOCAL.defaultLanguage);
  const currentDisplayTitle = ref<string>('');

  const codingSessions = ref<CodingSession[]>([]);
  const activeSessionId = ref<string | null>(null);
  const showSessionListPanel = ref<boolean>(true); // Default to true for better discoverability
  const searchTermSessions = ref<string>('');

  const isEditingSessionTitle = ref<boolean>(false);
  const sessionTitleEditBuffer = ref<string>('');

  const isLoadingResponse = ref<boolean>(false); // For LLM responses
  const isProcessingLocal = ref<boolean>(false); // For local operations like saving/loading sessions

  const pendingToolCall = ref<ToolCallRequest | null>(null);
  const showToolInteractionModal = ref<boolean>(false);
  const toolResponseInput = ref<string>(''); // User input for tool arguments if they want to modify

  const currentAgentSystemPrompt = ref<string>('');

  const composableConfig = ref<CodingAgentConfig>({
    ...DEFAULT_CODING_AGENT_CONFIG_LOCAL,
    ...initialComposableConfig,
  });

  const storage: IStorageService = localStorageService;
  const chatStore = useChatStore();

  // ============================
  // COMPUTED PROPERTIES
  // ============================

  const agentDisplayName = computed(() => agentConfigRef.value?.label || 'CodePilot');

  const activeSession = computed<CodingSession | null>(() => {
    if (!activeSessionId.value) return null;
    return codingSessions.value.find(s => s.id === activeSessionId.value) || null;
  });

  const filteredSessions = computed(() => { // Basic filtering, can be enhanced in SessionPanel
    let sessions = [...codingSessions.value];
    if (searchTermSessions.value.trim()) {
      const searchTerm = searchTermSessions.value.toLowerCase();
      sessions = sessions.filter(session =>
        session.title.toLowerCase().includes(searchTerm) ||
        session.userInputQuery.toLowerCase().includes(searchTerm) ||
        session.language.toLowerCase().includes(searchTerm) ||
        (session.tags && session.tags.some(tag => tag.toLowerCase().includes(searchTerm)))
      );
    }
    sessions.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    return sessions;
  });

  const mainContentForRenderer = computed<string>(() => {
    if (isLoadingResponse.value && !pendingToolCall.value && !chatStore.isMainContentStreaming) {
      return _generateLoadingContent();
    }
    if (chatStore.isMainContentStreaming && !activeSessionId.value && !pendingToolCall.value) {
      return _generateStreamingContent();
    }
    if (pendingToolCall.value?.status === 'executing') {
        return _generateToolProcessingContent(pendingToolCall.value.toolName, 'Executing tool...');
    }
    if (activeSession.value) {
      return _generateSessionContent(activeSession.value);
    }
    if (currentQuery.value || currentCodeSnippet.value || currentExplanationMarkdown.value) {
      return _generateCurrentWorkContent();
    }
    return _generateWelcomeContent();
  });

  // ============================
  // LIFECYCLE & INITIALIZATION
  // ============================

  async function initialize(agentDefToInitWith: IAgentDefinition): Promise<void> {
    // agentConfigRef is now passed in, so we assume it's already set by the parent
    // This initialize function is more about setting up the composable's internal state
    try {
      isProcessingLocal.value = true;
      currentDisplayTitle.value = `${agentDisplayName.value || 'CodePilot'} - Ready`;
      currentLanguage.value = voiceSettingsManager.settings.preferredCodingLanguage || composableConfig.value.defaultLanguage;

      await _fetchSystemPrompt();
      await loadCodingSessions(); // This will set codingSessions.value

      // Restore or set initial view state
      if (activeSessionId.value) { // If an active session ID was persisted/restored
        const restoredSession = codingSessions.value.find(s => s.id === activeSessionId.value);
        if (restoredSession) {
          displaySavedSession(activeSessionId.value);
        } else {
          activeSessionId.value = null; // Invalid persisted ID
          setWelcomeContent();
        }
      } else {
         setWelcomeContent();
      }
    } catch (error) {
      console.error(`[${agentDisplayName.value}] Initialization error:`, error);
      toast?.add({ type: 'error', title: 'Initialization Error', message: `Failed to initialize ${agentDisplayName.value}.` });
      setWelcomeContent('Error initializing. Please try reloading.');
    } finally {
      isProcessingLocal.value = false;
    }
  }

  async function cleanup(): Promise<void> {
    // Placeholder for any cleanup logic if needed (e.g., unsubscribing from global events)
    console.log(`[${agentDisplayName.value}] Cleanup called.`);
  }

  // ============================
  // SESSION MANAGEMENT
  // ============================

  async function loadCodingSessions(): Promise<void> {
    isProcessingLocal.value = true;
    try {
      const stored = await storage.getAllItemsInNamespace<CodingSession>(composableConfig.value.storageNamespace);
      codingSessions.value = Object.values(stored).sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime() // Show newest first
      );
    } catch (error) {
      console.error(`[${agentDisplayName.value}] Error loading sessions:`, error);
      toast?.add({ type: 'error', title: 'Session Load Error', message: 'Could not load saved coding work.' });
    } finally {
      isProcessingLocal.value = false;
    }
  }

  async function saveCurrentWorkAsSession(titlePromptText?: string): Promise<void> {
    if (!_hasCurrentWork()) {
      toast?.add({ type: 'info', title: 'Nothing to Save', message: 'No active work to save as a session.' });
      return;
    }

    const suggestedTitle = currentDisplayTitle.value.startsWith('Responding to:') || currentDisplayTitle.value.endsWith('Ready')
        ? currentQuery.value.substring(0, 50) || `Coding Work - ${new Date().toLocaleDateString()}`
        : currentDisplayTitle.value;

    const newTitle = window.prompt(
      titlePromptText || 'Enter a title for this coding session:',
      suggestedTitle
    );

    if (!newTitle || !newTitle.trim()) {
      toast?.add({ type: 'info', title: 'Save Cancelled', message: 'Session not saved.' });
      return;
    }

    isProcessingLocal.value = true;
    const now = new Date().toISOString();
    const newSession: CodingSession = {
      id: generateId(),
      title: newTitle.trim(),
      userInputQuery: currentQuery.value,
      generatedCode: currentCodeSnippet.value || undefined,
      explanationMarkdown: currentExplanationMarkdown.value || 'No explanation provided.',
      language: currentLanguage.value,
      createdAt: now,
      updatedAt: now,
      tags: _extractTagsFromQuery(currentQuery.value),
      version: '1.0',
    };

    try {
      await storage.setItem(composableConfig.value.storageNamespace, newSession.id, newSession);
      codingSessions.value.unshift(newSession); // Add to the beginning of the list
      activeSessionId.value = newSession.id;
      _updateMainContentForSession(newSession);
      toast?.add({ type: 'success', title: 'Session Saved', message: `"${newSession.title}" has been saved.` });
    } catch (error) {
      console.error(`[${agentDisplayName.value}] Error saving session:`, error);
      toast?.add({ type: 'error', title: 'Save Error', message: 'Failed to save the session.' });
    } finally {
      isProcessingLocal.value = false;
    }
  }

  function displaySavedSession(sessionId: string): void {
    const session = codingSessions.value.find(s => s.id === sessionId);
    if (!session) {
      console.warn(`[${agentDisplayName.value}] Session ${sessionId} not found for display.`);
      toast?.add({type: 'warning', title: 'Session Not Found', message: 'Could not display the selected session.'});
      return;
    }

    activeSessionId.value = sessionId;
    currentQuery.value = session.userInputQuery; // Restore query for context
    currentCodeSnippet.value = session.generatedCode || null;
    currentExplanationMarkdown.value = session.explanationMarkdown;
    currentLanguage.value = session.language;
    currentDisplayTitle.value = session.title;
    isEditingSessionTitle.value = false; // Ensure edit mode is off
    _updateMainContentForSession(session);
    chatStore.setMainContentStreaming(false); // Ensure streaming is off
  }

  async function deleteCodingSession(sessionId: string): Promise<void> {
    // Confirmation should ideally be handled in the UI component calling this
    isProcessingLocal.value = true;
    try {
      await storage.removeItem(composableConfig.value.storageNamespace, sessionId);
      codingSessions.value = codingSessions.value.filter(s => s.id !== sessionId);
      if (activeSessionId.value === sessionId) {
        activeSessionId.value = null;
        clearCurrentWorkspace(); // Clears query, code, explanation
        setWelcomeContent('Session deleted. Ready for your next query.');
      }
      toast?.add({ type: 'success', title: 'Session Deleted', message: 'The coding session has been removed.' });
    } catch (error) {
      console.error(`[${agentDisplayName.value}] Error deleting session ${sessionId}:`, error);
      toast?.add({ type: 'error', title: 'Delete Error', message: 'Failed to delete the session.' });
    } finally {
      isProcessingLocal.value = false;
    }
  }

  function startNewCodingQuery(): void {
    activeSessionId.value = null;
    clearCurrentWorkspace();
    setWelcomeContent(); // This sets a generic welcome/ready state
    chatStore.setMainContentStreaming(false);
  }

  function clearCurrentWorkspace(): void {
    currentQuery.value = '';
    currentCodeSnippet.value = null;
    currentExplanationMarkdown.value = null;
    currentDisplayTitle.value = ''; // Will be reset by setWelcomeContent or new query
    // pendingToolCall is cleared when a tool interaction finishes or is cancelled
  }

  // ============================
  // SESSION EDITING
  // ============================

  function beginEditSessionTitle(sessionId: string): void {
    const session = codingSessions.value.find(s => s.id === sessionId);
    if (!session) return;

    activeSessionId.value = sessionId; // Ensure this session is "active" for context, even if not fully displayed
    sessionTitleEditBuffer.value = session.title;
    isEditingSessionTitle.value = true;

    nextTick(() => {
      const inputElement = document.getElementById(`session-title-editor-${sessionId}`);
      inputElement?.focus();
    });
  }

  async function confirmEditSessionTitle(): Promise<void> {
    if (!activeSessionId.value || !sessionTitleEditBuffer.value.trim()) {
      cancelEditSessionTitle();
      return;
    }

    const sessionIndex = codingSessions.value.findIndex(s => s.id === activeSessionId.value);
    if (sessionIndex === -1) {
      cancelEditSessionTitle();
      return;
    }

    const updatedSession = {
      ...codingSessions.value[sessionIndex],
      title: sessionTitleEditBuffer.value.trim(),
      updatedAt: new Date().toISOString(),
    };

    isProcessingLocal.value = true;
    try {
      await storage.setItem(composableConfig.value.storageNamespace, updatedSession.id, updatedSession);
      codingSessions.value.splice(sessionIndex, 1, updatedSession);
      // Re-sort if necessary, or rely on display component sorting
      codingSessions.value.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

      if (activeSession.value && activeSession.value.id === updatedSession.id) {
        currentDisplayTitle.value = updatedSession.title;
         _updateMainContentForSession(updatedSession); // Refresh displayed content
      }
      toast?.add({ type: 'success', title: 'Title Updated', message: 'Session title has been saved.' });
    } catch (error) {
      console.error(`[${agentDisplayName.value}] Error updating session title:`, error);
      toast?.add({ type: 'error', title: 'Update Error', message: 'Failed to update session title.' });
    } finally {
      isProcessingLocal.value = false;
      cancelEditSessionTitle(); // Reset editing state
    }
  }

  function cancelEditSessionTitle(): void {
    isEditingSessionTitle.value = false;
    sessionTitleEditBuffer.value = '';
    // No need to reset activeSessionId here if it was only set for editing context
  }

  // ============================
  // QUERY PROCESSING & LLM INTERACTION
  // ============================

  async function handleCodingQuery(text: string): Promise<void> {
    if (!text.trim()) {
        toast?.add({ type: 'warning', title: 'Empty Query', message: 'Please enter a coding question or task.' });
        return;
    }
    if (isLoadingResponse.value) {
        toast?.add({ type: 'info', title: 'Processing', message: 'Please wait for the current response to complete.' });
        return;
    }

    activeSessionId.value = null; // Start a new "work" session, not tied to a saved one
    currentQuery.value = text;
    _clearCurrentWorkForNewResponse();
    currentDisplayTitle.value = `Responding to: ${text.substring(0, 40)}...`;
    isLoadingResponse.value = true;
    chatStore.setMainContentStreaming(true, _generateLoadingContent());

    // Add user message to chat store immediately
    chatStore.addMessage({
      role: 'user',
      content: text,
      agentId: agentConfigRef.value.id,
      timestamp: Date.now()
    });

    try {
      if (!currentAgentSystemPrompt.value) await _fetchSystemPrompt();

      const preferredLang = voiceSettingsManager.settings.preferredCodingLanguage || composableConfig.value.defaultLanguage;
      currentLanguage.value = preferredLang; // Set current language for this interaction

      const finalSystemPrompt = _buildSystemPrompt(text, preferredLang);
      const historyConfig: Partial<AdvancedHistoryConfig> = { numRecentMessagesToPrioritize: 8 };
      const processedHistory = await chatStore.getHistoryForApi(agentConfigRef.value.id, text, finalSystemPrompt, historyConfig);

      const messagesForLlm: ChatMessageFE[] = [
        { role: 'system', content: finalSystemPrompt },
        ...processedHistory.map(m => ({ ...m, role: m.role as ChatMessageFE['role'] })), // Ensure role is correctly typed
        // The user's current message 'text' is already added to chatStore, processedHistory will include it if relevant
      ];
       // If processedHistory does not include the latest user message (e.g. if it's too short to be context), add it
      if (!messagesForLlm.find(m => m.role === 'user' && m.content === text)) {
        messagesForLlm.push({ role: 'user', content: text, timestamp: Date.now() });
      }


      const basePayload: ChatMessagePayloadFE = {
        messages: messagesForLlm,
        mode: agentConfigRef.value.id, // Use the actual agent ID for the API mode
        language: preferredLang,
        userId: `frontend_user_${agentConfigRef.value.id}`,
        conversationId: chatStore.getCurrentConversationId(agentConfigRef.value.id),
        stream: true, // Always stream for coding agent for better UX
        // Assuming tools are defined in the agentConfig or backend knows them by mode
        // tools: agentConfigRef.value.capabilities?.tools || []
      };
      const payload = chatStore.attachPersonaToPayload(agentConfigRef.value.id, basePayload);

      let accumulatedContent = '';
      let inCodeBlock = false;
      let currentBlockLanguage = '';

      const finalResponse = await chatAPI.sendMessageStream(
        payload,
        (chunk) => { // onChunk
          accumulatedContent += chunk;
          // Basic parsing for streaming: if it looks like a code block, treat it as code
          // More sophisticated parsing can be done in parseAndSetCodeAndExplanation
          if (chunk.includes('```')) {
            inCodeBlock = !inCodeBlock;
            if (inCodeBlock) {
                const langMatch = chunk.match(/```(\w+)?/);
                currentBlockLanguage = langMatch && langMatch[1] ? langMatch[1] : preferredLang;
            }
          }
          if (inCodeBlock || chunk.includes('```')) { // If we are in a code block or just entered/exited
            currentCodeSnippet.value = (currentCodeSnippet.value || "") + chunk;
          } else {
            currentExplanationMarkdown.value = (currentExplanationMarkdown.value || "") + chunk;
          }
          chatStore.updateMainContent({ // Update the main content view reactively
            agentId: agentConfigRef.value.id,
            type: 'compact-message-renderer-data', // Assuming CompactMessageRenderer can handle this structure
            data: _generateStreamingContent(), // Use the computed that structures code and explanation
            title: currentDisplayTitle.value,
            timestamp: Date.now()
          });
        },
        () => { // onComplete
          isLoadingResponse.value = false;
          chatStore.setMainContentStreaming(false);
          const finalContent = accumulatedContent.trim();
          parseAndSetCodeAndExplanation(finalContent); // Final parse of the complete content

          chatStore.addMessage({ // Add the complete assistant message
            role: 'assistant',
            content: finalContent,
            agentId: agentConfigRef.value.id,
            model: 'CodePilot-LLM', // Placeholder for actual model name if available
            timestamp: Date.now()
          });
          _updateMainContentFromCurrentWork(); // Update one last time with fully parsed content
        },
        (error) => { // onError
          _handleQueryError(error, "streaming");
        }
      );
      chatStore.syncPersonaFromResponse(agentConfigRef.value.id, finalResponse);

    } catch (error: any) {
      _handleQueryError(error, "setup");
    }
  }


  function parseAndSetCodeAndExplanation(markdownText: string, isStreamingUpdate: boolean = false): void {
    // More robustly find the first major code block
    const codeBlockRegex = /```(?:([a-zA-Z0-9_#.+-]+)\n)?([\s\S]*?)```/m; // Removed 'g' for first match
    const match = codeBlockRegex.exec(markdownText);

    let tempCode: string | null = null;
    let tempExplanation: string | null = null;
    let tempLang: string | null = null;

    if (match) {
      tempLang = match[1] || currentLanguage.value || composableConfig.value.defaultLanguage; // Fallback language
      tempCode = match[2].trim();

      // Explanation is text before and after the first main code block
      const beforeCode = markdownText.substring(0, match.index).trim();
      const afterCode = markdownText.substring(match.index + match[0].length).trim();

      if (beforeCode && afterCode) {
        tempExplanation = `${beforeCode}\n\n${afterCode}`;
      } else if (beforeCode) {
        tempExplanation = beforeCode;
      } else if (afterCode) {
        tempExplanation = afterCode;
      } else {
        tempExplanation = isStreamingUpdate ? null : "Code provided."; // Default explanation if only code exists
      }
    } else {
      // No code block found, assume all text is explanation
      tempExplanation = markdownText.trim();
      tempCode = null;
      // tempLang = currentLanguage.value; // Keep current language or set to plaintext
    }

    if (!isStreamingUpdate || tempCode) { // Only update code if new code is found or not streaming
        currentCodeSnippet.value = tempCode;
    }
    if (!isStreamingUpdate || tempExplanation) { // Only update explanation if new explanation is found or not streaming
        currentExplanationMarkdown.value = tempExplanation;
    }
    if (tempLang) {
        currentLanguage.value = tempLang;
    }


    if (!isStreamingUpdate) {
      currentDisplayTitle.value = currentQuery.value.substring(0, 50) || 'Coding Response';
      _updateMainContentFromCurrentWork();
    }
  }

  // ============================
  // TOOL INTERACTIONS (SIMULATED)
  // ============================

  async function processFunctionCallFromLLM(funcCallData: FunctionCallResponseDataFE): Promise<void> {
    // This is called if the LLM responds with a tool_call request.
    // For CodePilot, we are currently handling tools client-side or simulating.
    // This function would set up the pendingToolCall state.
    // The actual prompt structure for CodePilot in `prompts/coding.md` encourages text output with code,
    // rather than explicit tool calls FOR code gen/explanation *from* the LLM.
    // It *does* mention tool usage like `generateCodeSnippet`. If the backend returns this, this func handles it.

    isLoadingResponse.value = false; // LLM part is done, now tool
    chatStore.setMainContentStreaming(false);

    pendingToolCall.value = {
      toolCallId: funcCallData.toolCallId,
      toolName: funcCallData.toolName,
      toolArguments: funcCallData.toolArguments,
      assistantMessageText: funcCallData.assistantMessageText || `${agentDisplayName.value} wants to use the '${funcCallData.toolName}' tool.`,
      requestedAt: Date.now(),
      status: 'pending'
    };

    // Add assistant's message (that requested the tool) to chat log
    chatStore.addMessage({
        role: 'assistant',
        content: pendingToolCall.value.assistantMessageText ?? null,
        agentId: agentConfigRef.value.id,
        model: funcCallData.model, // Assuming model info is in funcCallData
        tool_calls: [{
            id: funcCallData.toolCallId,
            type: 'function', // Assuming 'function' type for now
            function: { name: funcCallData.toolName, arguments: JSON.stringify(funcCallData.toolArguments) }
        }],
        timestamp: Date.now() -1 // Slightly before tool execution log
    });


    // Update UI to show tool request info
    const toolRequestInfo = `**Tool Request: ${pendingToolCall.value.assistantMessageText}**\nTool: \`${pendingToolCall.value.toolName}\`\nArguments: \`\`\`json\n${JSON.stringify(pendingToolCall.value.toolArguments, null, 2)}\n\`\`\``;
    currentExplanationMarkdown.value = (currentExplanationMarkdown.value || "") + "\n\n" + toolRequestInfo;
    _updateMainContentFromCurrentWork();


    // Show modal for user to confirm/modify (optional) and execute
    toolResponseInput.value = JSON.stringify(funcCallData.toolArguments, null, 2);
    showToolInteractionModal.value = true;
  }

  async function confirmAndExecuteTool(): Promise<void> {
    if (!pendingToolCall.value) return;
    const toolCall = pendingToolCall.value;
    toolCall.status = 'executing';

    // Update UI to show tool is executing
    currentDisplayTitle.value = `Executing tool: ${toolCall.toolName}`;
    _updateMainContentForToolExecution(toolCall.toolName, 'Executing...');


    let modifiedArgs = toolCall.toolArguments;
    try {
      if (toolResponseInput.value) {
        modifiedArgs = JSON.parse(toolResponseInput.value);
      }
    } catch (e) {
      toast?.add({type: 'error', title: 'Argument Error', message: 'Invalid JSON format for tool arguments. Using original.'});
      // Keep original args
    }

    const result = await executeTool(toolCall.toolName, modifiedArgs);
    toolCall.status = result.success ? 'completed' : 'failed';

    showToolInteractionModal.value = false;
    await sendToolResultToLLM(toolCall.toolCallId, toolCall.toolName, result.output, `Executed tool ${toolCall.toolName}.`);
    pendingToolCall.value = null; // Clear after sending
  }

  async function cancelToolCall(): Promise<void> {
    if (!pendingToolCall.value) return;
    const toolCall = pendingToolCall.value;
    toolCall.status = 'cancelled';
    showToolInteractionModal.value = false;

    toast?.add({ type: 'info', title: 'Tool Cancelled', message: `Execution of '${toolCall.toolName}' was cancelled.` });
    await sendToolResultToLLM(toolCall.toolCallId, toolCall.toolName, { error: "User cancelled tool execution." }, `User cancelled tool ${toolCall.toolName}.`);
    pendingToolCall.value = null;
  }

  async function executeTool(toolName: string, toolArguments: any): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    // Simulate client-side tool execution
    console.log(`[${agentDisplayName.value}] Simulating execution of tool: ${toolName} with args:`, toolArguments);
    toast?.add({ type: 'info', title: `Executing: ${toolName}`, message: `Args: ${JSON.stringify(toolArguments).substring(0,50)}...`});

    // SIMULATION LOGIC
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1500)); // Simulate network delay/processing

    let output: any;
    let success = true;
    let errorMsg: string | undefined;

    // Simplified simulation based on tool name
    switch (toolName) {
        case 'generateCodeSnippet':
            output = {
                code: `// Simulated ${toolArguments.language || 'code'} for: ${toolArguments.description}\nconsole.log("Hello from ${toolName}!");`,
                notes: "This is a simulated snippet.",
            };
            break;
        case 'explainCodeSegment':
            output = {
                explanation: `Simulated explanation for code: ${String(toolArguments.code).substring(0, 30)}...\nLanguage: ${toolArguments.language}. Focus: ${toolArguments.focusArea || 'general'}.`,
                details: "The code appears to perform a standard operation (simulated).",
            };
            break;
        case 'debugCodeError':
            output = {
                analysis: `Simulated debugging for error: ${toolArguments.errorMessage}.\nCode: ${String(toolArguments.code).substring(0,30)}...`,
                suggestions: ["Check for null values (simulated).", "Verify loop boundaries (simulated)."],
            };
            break;
        case 'getGitRepoStatus': // Keep client-side simulation
            output = _simulateGitRepoStatus(toolArguments);
            break;
        case 'analyzeCodeComplexity': // Keep client-side simulation
            output = _simulateCodeComplexityAnalysis(toolArguments);
            break;
        default:
            output = { message: `Simulated generic output for ${toolName}.` };
            // success = false; // Uncomment if unknown tools should be errors
            // errorMsg = `Tool '${toolName}' is not fully simulated client-side.`;
            // toast?.add({type: 'warning', title: 'Unknown Tool', message: errorMsg});
            break;
    }

    return {
      success,
      output,
      error: errorMsg,
      executionTimeMs: Date.now() - startTime,
      metadata: { simulated: true }
    };
  }

  async function sendToolResultToLLM(toolCallId: string, toolName: string, output: any, userMessageText: string): Promise<void> {
    isLoadingResponse.value = true;
    currentDisplayTitle.value = `Processing result from ${toolName}...`;
    _clearCurrentWorkForNewResponse();
    chatStore.setMainContentStreaming(true, _generateToolProcessingContent(toolName, 'Sending result to LLM...'));


    // Add a "tool" role message to the chat store.
    // The userMessageText is a human-readable summary for the user's side of the chat log if needed,
    // but the actual message sent to LLM will be the tool role message.
     chatStore.addMessage({
        role: 'tool',
        tool_call_id: toolCallId,
        name: toolName,
        content: JSON.stringify(output),
        agentId: agentConfigRef.value.id,
        timestamp: Date.now()
    });
     // Optionally add a user-facing message about the tool execution
     if(userMessageText && !chatStore.getMessagesForAgent(agentConfigRef.value.id).some(m => m.content === userMessageText && m.role === 'user')) {
        chatStore.addMessage({
            role: 'user', // Or 'system' if it's more of a system notification
            content: userMessageText,
            agentId: agentConfigRef.value.id,
            timestamp: Date.now() -1 // slightly before the tool response
        });
    }


    try {
      if (!currentAgentSystemPrompt.value) await _fetchSystemPrompt();

      const preferredLang = currentLanguage.value;
      const finalSystemPrompt = _buildSystemPromptForToolResponse(toolName, preferredLang);

      const historyConfig: Partial<AdvancedHistoryConfig> = { numRecentMessagesToPrioritize: 10 };
      // History for API should now include the previous assistant message with tool_calls and the new tool message
      const processedHistory = await chatStore.getHistoryForApi(agentConfigRef.value.id, userMessageText, finalSystemPrompt, historyConfig);

      const messagesForLlm: ChatMessageFE[] = [
        { role: 'system', content: finalSystemPrompt },
        ...processedHistory.map(m => ({ ...m, role: m.role as ChatMessageFE['role'] })),
        // Ensure the actual tool result message is the last one if not already included by getHistoryForApi
      ];
      if (!messagesForLlm.find(m => m.role === 'tool' && m.tool_call_id === toolCallId)) {
        messagesForLlm.push({
            role: 'tool',
            tool_call_id: toolCallId,
            name: toolName,
            content: JSON.stringify(output),
        });
      }


      const basePayload: ChatMessagePayloadFE = {
        messages: messagesForLlm,
        mode: agentConfigRef.value.id,
        language: preferredLang,
        userId: `frontend_user_${agentConfigRef.value.id}_tool`,
        conversationId: chatStore.getCurrentConversationId(agentConfigRef.value.id),
        stream: true,
      };
      const payload = chatStore.attachPersonaToPayload(agentConfigRef.value.id, basePayload);

      let accumulatedContent = '';
      // currentCodeSnippet.value = ""; // Reset before streaming new response
      // currentExplanationMarkdown.value = "";

      const finalResponse = await chatAPI.sendMessageStream(
        payload,
        (chunk) => {
          accumulatedContent += chunk;
          parseAndSetCodeAndExplanation(accumulatedContent, true); // Update reactively
          chatStore.updateMainContent({
            agentId: agentConfigRef.value.id,
            type: 'compact-message-renderer-data',
            data: mainContentForRenderer.value,
            title: currentDisplayTitle.value,
            timestamp: Date.now()
          });
        },
        () => {
          isLoadingResponse.value = false;
          chatStore.setMainContentStreaming(false);
          const finalContent = accumulatedContent.trim();
          parseAndSetCodeAndExplanation(finalContent);
          chatStore.addMessage({
            role: 'assistant',
            content: finalContent,
            agentId: agentConfigRef.value.id,
            model: 'CodePilot-LLM-ToolResponse',
            timestamp: Date.now()
          });
          _updateMainContentFromCurrentWork();
        },
        (error) => _handleQueryError(error, "tool_response_streaming")
      );
      chatStore.syncPersonaFromResponse(agentConfigRef.value.id, finalResponse);

    } catch (error: any) {
      _handleQueryError(error, "tool_response_setup");
    }
  }


  // ============================
  // UTILITY & HELPER METHODS
  // ============================

  async function copyToClipboard(text: string | null, type: 'Code' | 'Explanation'): Promise<void> {
    if (!text) {
      toast?.add({ type: 'warning', title: 'Nothing to Copy', message: `${type} content is empty.` });
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      toast?.add({ type: 'success', title: `${type} Copied`, message: `${type} has been copied to your clipboard.` });
    } catch (err) {
      console.error(`[${agentDisplayName.value}] Failed to copy ${type.toLowerCase()}:`, err);
      toast?.add({ type: 'error', title: 'Copy Failed', message: `Could not copy ${type.toLowerCase()} to clipboard.` });
    }
  }

  function setWelcomeContent(message?: string): void {
    clearCurrentWorkspace(); // Clear previous query, code, explanation
    currentDisplayTitle.value = `${agentDisplayName.value} - Ready`;
    // The actual welcome message is now primarily generated by mainContentForRenderer
    // when no other content is available. This function just ensures the state is clean.
    _updateMainContentFromCurrentWork(); // This will trigger mainContentForRenderer to show welcome
  }


  function updateDisplayTitle(title: string): void {
    currentDisplayTitle.value = title;
     _updateMainContentFromCurrentWork(); // Reflect title change in the main display
  }


  // --- Internal Helpers ---
  function _hasCurrentWork(): boolean {
    return !!(currentQuery.value || currentCodeSnippet.value || currentExplanationMarkdown.value);
  }

  function _clearCurrentWorkForNewResponse(): void {
    currentCodeSnippet.value = null;
    currentExplanationMarkdown.value = null;
    // currentQuery is set by the new query, displayTitle will be updated
  }

  function _extractTagsFromQuery(query: string): string[] {
    const words = query.toLowerCase().match(/\b(\w{3,})\b/g) || [];
    const tags = new Set<string>();
    const devKeywordsSet = new Set(COMMON_DEV_KEYWORDS);

    words.forEach(word => {
      if (devKeywordsSet.has(word as typeof COMMON_DEV_KEYWORDS[number])) {
        tags.add(word);
      }
    });
    return Array.from(tags).slice(0, 5); // Limit to 5 tags
  }

  async function _fetchSystemPrompt(): Promise<void> {
    const key = agentConfigRef.value?.systemPromptKey;
    if (!key) {
      console.warn(`[${agentDisplayName.value}] No systemPromptKey defined for agent. Using default.`);
      currentAgentSystemPrompt.value = _getDefaultSystemPrompt();
      return;
    }
    try {
      const response = await promptAPI.getPrompt(`${key}.md`);
      currentAgentSystemPrompt.value = response.data.content || _getDefaultSystemPrompt();
    } catch (error) {
      console.error(`[${agentDisplayName.value}] Failed to load system prompt "${key}.md":`, error);
      currentAgentSystemPrompt.value = _getDefaultSystemPrompt();
      toast?.add({ type: 'warning', title: 'System Prompt Error', message: `Could not load specific instructions for ${agentDisplayName.value}. Using defaults.`});
    }
  }

  function _getDefaultSystemPrompt(): string {
    return "You are CodePilot, an expert coding assistant. Provide clear, runnable code examples in the requested language, along with detailed explanations. Structure complex answers for clarity. If asked to generate, explain, or debug code, do so directly. Use Markdown for formatting. Be ready to use tools if explicitly necessary for tasks like file system operations or complex data analysis, but prioritize direct coding assistance.";
  }

  function _buildSystemPrompt(queryText: string, lang: string): string {
    // Simple replacement, can be more sophisticated
    const personaOverride = chatStore.getPersonaForAgent(agentConfigRef.value.id);
    const baseInstructions = "Focus on providing runnable code and clear explanations. Use markdown code blocks for all code. If a diagram would clarify an algorithm or data structure, consider generating a Mermaid diagram if {{GENERATE_DIAGRAM}} is true.";
    const combinedInstructions = [baseInstructions, personaOverride?.trim()].filter(Boolean).join('\n\n');

    return (currentAgentSystemPrompt.value || _getDefaultSystemPrompt())
      .replace(/{{LANGUAGE}}/g, lang)
      .replace(/{{USER_QUERY}}/g, queryText.substring(0, 200)) // Limit query length in prompt
      .replace(/{{AGENT_CONTEXT_JSON}}/g, JSON.stringify({ currentQuery: queryText.substring(0,100), preferredLanguage: lang }))
      .replace(/{{ADDITIONAL_INSTRUCTIONS}}/g, combinedInstructions);
  }

 function _buildSystemPromptForToolResponse(toolNameUsed: string, lang: string): string {
    const personaOverride = chatStore.getPersonaForAgent(agentConfigRef.value.id);
    const baseInstructions = `The tool '${toolNameUsed}' has just been executed. Its output is provided in the next message. Based on this output and the original query ("${currentQuery.value.substring(0,100)}..."), provide a comprehensive response to the user. Ensure code is runnable and explanations are clear.`;
    const combinedInstructions = [baseInstructions, personaOverride?.trim()].filter(Boolean).join('\n\n');

    return (currentAgentSystemPrompt.value || _getDefaultSystemPrompt())
      .replace(/{{LANGUAGE}}/g, lang)
      .replace(/{{USER_QUERY}}/g, currentQuery.value.substring(0, 200))
      .replace(/{{AGENT_CONTEXT_JSON}}/g, JSON.stringify({ currentQuery: currentQuery.value.substring(0,100), preferredLanguage: lang, lastToolCall: toolNameUsed }))
      .replace(/{{ADDITIONAL_INSTRUCTIONS}}/g, combinedInstructions);
  }

  // --- Content Generation for mainContentForRenderer ---
  function _generateLoadingContent(): string {
    return `## ${currentDisplayTitle.value || 'Processing...'}\n\n<div class="flex flex-col items-center justify-center h-64"><div class="coding-agent-spinner large"></div><p class="mt-3 text-sm text-gray-500">CodePilot is analyzing your request...</p></div>`;
  }

  function _generateStreamingContent(): string {
    let content = `## ${currentDisplayTitle.value || 'Receiving response...'}\n\n`;
    if (currentQuery.value && !activeSessionId.value) { // Only show query if it's for new work, not a loaded session title
        content += `**Query:**\n\`\`\`text\n${currentQuery.value}\n\`\`\`\n\n`;
    }
    if (currentCodeSnippet.value) {
      content += `**Code (${currentLanguage.value}):**\n\`\`\`${currentLanguage.value}\n${currentCodeSnippet.value}\n\`\`\`\n\n`;
    }
    if (currentExplanationMarkdown.value) {
      content += `**Explanation:**\n${currentExplanationMarkdown.value}`;
    }
    return content + '▋'; // Blinking cursor effect
  }

  function _generateSessionContent(session: CodingSession): string {
    let content = `# ${session.title}\n\n`;
    content += `**Language:** ${session.language}\n`;
    content += `**Saved:** ${new Date(session.updatedAt).toLocaleString()}\n\n`;
    if(session.tags && session.tags.length > 0) {
        content += `**Tags:** ${session.tags.join(', ')}\n\n`;
    }
    content += `**Original Query:**\n\`\`\`text\n${session.userInputQuery}\n\`\`\`\n\n`;
    if (session.generatedCode) {
      content += `**Code (${session.language}):**\n\`\`\`${session.language}\n${session.generatedCode}\n\`\`\`\n\n`;
    }
    content += `**Explanation:**\n${session.explanationMarkdown}`;
    return content;
  }

  function _generateCurrentWorkContent(): string {
    let content = `## ${currentDisplayTitle.value || 'Current Work'}\n\n`;
     if (currentQuery.value) {
        content += `**Query:**\n\`\`\`text\n${currentQuery.value}\n\`\`\`\n\n`;
    }
    if (currentCodeSnippet.value) {
      content += `**Code (${currentLanguage.value}):**\n\`\`\`${currentLanguage.value}\n${currentCodeSnippet.value}\n\`\`\`\n\n`;
    }
    if (currentExplanationMarkdown.value) {
      content += `**Explanation:**\n${currentExplanationMarkdown.value}`;
    }
    if (!currentCodeSnippet.value && !currentExplanationMarkdown.value && !currentQuery.value) { // Should not happen if called correctly
        return _generateWelcomeContent();
    }
    return content;
  }

  function _generateWelcomeContent(): string {
    return `<div class="text-center p-8">
                <h2 class="text-xl font-semibold mb-2">${agentDisplayName.value} - Ready</h2>
                <p class="text-sm text-gray-600">${agentConfigRef.value?.inputPlaceholder || 'Ask a coding question, request debugging, or paste code for explanation.'}</p>
            </div>`;
  }

  function _generateToolProcessingContent(toolName: string, statusMessage: string): string {
    return `## Executing Tool: ${toolName}\n\n<div class="flex flex-col items-center justify-center h-64"><div class="coding-agent-spinner large"></div><p class="mt-3 text-sm text-gray-500">${statusMessage}</p></div>`;
  }


  function _updateMainContentFromCurrentWork(): void {
    chatStore.updateMainContent({
        agentId: agentConfigRef.value.id,
        type: 'compact-message-renderer-data', // Or your specific type for rendering
        data: mainContentForRenderer.value, // This will re-evaluate based on current state
        title: currentDisplayTitle.value,
        timestamp: Date.now()
    });
  }
 function _updateMainContentForSession(session: CodingSession): void {
    chatStore.updateMainContent({
        agentId: agentConfigRef.value.id,
        type: 'compact-message-renderer-data',
        data: _generateSessionContent(session), // Use the specific session generator
        title: session.title,
        timestamp: new Date(session.updatedAt).getTime()
    });
  }

  function _updateMainContentForToolExecution(toolName: string, status: string): void {
    chatStore.updateMainContent({
        agentId: agentConfigRef.value.id,
        type: 'compact-message-renderer-data',
        data: _generateToolProcessingContent(toolName, status),
        title: `Tool: ${toolName} - ${status}`,
        timestamp: Date.now()
    });
  }


  function _handleQueryError(error: any, stage: "setup" | "streaming" | "tool_response_setup" | "tool_response_streaming"): void {
    isLoadingResponse.value = false;
    chatStore.setMainContentStreaming(false);
    const errorMessage = error.response?.data?.message || error.message || `An error occurred during ${stage}.`;
    console.error(`[${agentDisplayName.value}] Error at stage ${stage}:`, error);

    // Update UI with error
    parseAndSetCodeAndExplanation(`### Error\nSorry, I encountered an issue at stage: ${stage}.\n\n**Details:**\n\`\`\`\n${errorMessage}\n\`\`\``);
    _updateMainContentFromCurrentWork();

    toast?.add({ type: 'error', title: `${agentDisplayName.value} Error`, message: errorMessage, duration: 7000 });

    // Add error message to chat log for history
     chatStore.addMessage({
      role: 'error', // Or 'system' with an error prefix
      content: `Error during ${stage}: ${errorMessage}`,
      agentId: agentConfigRef.value.id,
      timestamp: Date.now()
    });
  }


  // --- Simulated Tool Implementations ---
  function _simulateGitRepoStatus(args: { repoPath?: string }): GitRepoStatus {
    return {
      branch: args.repoPath ? 'main' : 'feature/simulated',
      status: Math.random() > 0.5 ? 'Clean' : 'Modified files (simulated)',
      files: Math.random() > 0.5 ? ['src/index.ts M', 'package.json A'] : [],
      pathProvided: args.repoPath || 'Current directory (simulated)',
      isClean: Math.random() > 0.5,
      commitStatus: { ahead: Math.floor(Math.random() * 3), behind: Math.floor(Math.random() * 2) }
    };
  }

  function _simulateCodeComplexityAnalysis(args: { codeSnippet?: string, language?: string }): CodeAnalysisResult {
    const lines = args.codeSnippet?.split('\n').length || Math.floor(Math.random() * 100) + 10;
    const randomFactor = Math.random();
    return {
      language: args.language || currentLanguage.value,
      linesOfCode: lines,
      cyclomaticComplexity: Math.floor(randomFactor * 10) + 1,
      maintainabilityIndex: Math.floor(randomFactor * 50) + 50,
      issuesFound: randomFactor < 0.3 ? ['Potential off-by-one error (simulated).', 'Consider refactoring complex logic (simulated).'] : ['No major issues found (simulated).'],
      difficultyLevel: randomFactor < 0.2 ? 'beginner' : randomFactor < 0.6 ? 'intermediate' : 'advanced',
      suggestions: ['Add more comments for clarity (simulated).', 'Write unit tests for critical functions (simulated).']
    };
  }


  // Expose state and methods
  return {
    currentQuery,
    currentCodeSnippet,
    currentExplanationMarkdown,
    currentLanguage,
    currentDisplayTitle,
    codingSessions,
    activeSessionId,
    showSessionListPanel,
    searchTermSessions,
    isEditingSessionTitle,
    sessionTitleEditBuffer,
    isLoadingResponse,
    isProcessingLocal,
    pendingToolCall,
    showToolInteractionModal,
    toolResponseInput,
    currentAgentSystemPrompt,

    agentDisplayName,
    activeSession,
    filteredSessions,
    mainContentForRenderer,

    initialize,
    cleanup,
    loadCodingSessions,
    saveCurrentWorkAsSession,
    displaySavedSession,
    deleteCodingSession,
    startNewCodingQuery,
    clearCurrentWorkspace,
    beginEditSessionTitle,
    confirmEditSessionTitle,
    cancelEditSessionTitle,
    handleCodingQuery,
    parseAndSetCodeAndExplanation,
    processFunctionCallFromLLM,
    confirmAndExecuteTool,
    cancelToolCall,
    executeTool,
    sendToolResultToLLM,
    copyToClipboard,
    setWelcomeContent,
    updateDisplayTitle,
  };
}

export default useCodingAgent;
