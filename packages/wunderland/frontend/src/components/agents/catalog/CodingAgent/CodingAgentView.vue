// File: frontend/src/components/agents/CodingAgentView.vue
/**
 * @file CodingAgentView.vue
 * @description UI component for the CodePilot (Coding Assistant) agent.
 * Features extensive session management with local storage, robust function calling simulation,
 * and a sleek, futuristic IDE/whiteboard interface. This version addresses prior TS errors.
 * @version 2.2.0 - Comprehensive TS Error Fixes, Unused Code Cleanup, and UI Wiring.
 */
<script setup lang="ts">
import { ref, computed, inject, watch, onMounted, onUnmounted, nextTick, type PropType } from 'vue';
import { useAgentStore } from '@/store/agent.store';
import { useChatStore, type MainContent } from '@/store/chat.store'; // MainContent is used
import type { IAgentDefinition, AgentId } from '@/services/agent.service';
import { voiceSettingsManager } from '@/services/voice.settings.service';
import {
  chatAPI,
  type ChatMessagePayloadFE,
  type FunctionCallResponseDataFE,
  type TextResponseDataFE, // Used for type assertion
  type ChatMessageFE,
  promptAPI
} from '@/utils/api';
import type { ToastService } from '@/services/services';
import { localStorageService, type IStorageService } from '@/services/localStorage.service';
// CompactMessageRenderer is used as the primary display mechanism for structured markdown.
import CompactMessageRenderer from '@/components/layouts/CompactMessageRenderer/CompactMessageRenderer.vue';
import {
  CodeBracketSquareIcon,   // Main agent icon
  PlusCircleIcon,        // New session/query
  TrashIcon,             // Delete session, clear all
  PencilSquareIcon,      // Edit session title
  FolderOpenIcon,        // Toggle session list
  CommandLineIcon,       // Tool modal icon, execute tool button
  DocumentDuplicateIcon, // Copy code/explanation
  CheckCircleIcon,       // Confirm edit/action
  XCircleIcon,           // Cancel edit/action
  InformationCircleIcon, // For tool modal info
  SparklesIcon           // Used in loading/empty states
  // LightBulbIcon, EyeIcon, MagnifyingGlassCircleIcon, PlayIcon, StopIcon are not used in the final template from v2.1.0
} from '@heroicons/vue/24/solid';
import { marked } from 'marked'; // Used by parseMarkdown if not relying solely on CompactMessageRenderer's internal parsing
import hljs from 'highlight.js';   // Used by parseMarkdown utility
import { generateId } from '@/utils/ids';
import type { AdvancedHistoryConfig } from '@/services/advancedConversation.manager';

/**
 * @interface CodingSession
 * @description Defines the structure for a saved coding session/snippet.
 */
interface CodingSession {
  id: string;
  title: string;
  userInputQuery: string;
  generatedCode?: string;
  explanationMarkdown: string;
  language: string;
  tags?: string[];
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  isFavorite?: boolean;
}

const CODING_SESSIONS_NAMESPACE = 'codePilotSessions_v1.1';

const props = defineProps({
  agentId: { type: String as PropType<AgentId>, required: true },
  agentConfig: { type: Object as PropType<IAgentDefinition>, required: true }
});

const emit = defineEmits<{
  (e: 'agent-event', event: { type: 'view_mounted', agentId: string, label?: string }): void;
  (e: 'request-coding-input'): void;
}>();

const agentStore = useAgentStore(); // Used for agent context
const chatStore = useChatStore();
const toast = inject<ToastService>('toast');
const storage: IStorageService = localStorageService;

// --- Core State ---
const isLoadingResponse = ref<boolean>(false);
const isProcessingLocal = ref<boolean>(false);
const currentAgentSystemPrompt = ref<string>('');
const agentDisplayName = computed(() => props.agentConfig?.label || "CodePilot");

// --- Current Interaction State ---
const currentQuery = ref<string>("");
const currentCodeSnippet = ref<string | null>(null);
const currentExplanationMarkdown = ref<string | null>(null);
const currentLanguage = ref<string>(voiceSettingsManager.settings.preferredCodingLanguage || 'python');
const currentDisplayTitle = ref<string>(`${agentDisplayName.value} - Ready`);

// --- Session Management State ---
const codingSessions = ref<CodingSession[]>([]);
const activeSessionId = ref<string | null>(null);
const showSessionListPanel = ref<boolean>(true);
const isEditingSessionTitle = ref<boolean>(false);
const sessionTitleEditBuffer = ref<string>('');
const searchTermSessions = ref<string>('');

// --- Tool Calling State ---
const pendingToolCall = ref<{ toolCallId: string; toolName: string; toolArguments: any; assistantMessageText?: string | null } | null>(null);
const showToolInteractionModal = ref<boolean>(false);
const toolResponseInput = ref<string>('');

const notifyParentProcessingState = (isProcessing: boolean): void => {
  emit('agent-event', { type: 'setProcessingState', agentId: props.agentId, payload: { isProcessing } });
};

// --- Computed Properties ---
const activeSession = computed<CodingSession | null>(() => {
  return codingSessions.value.find(s => s.id === activeSessionId.value) || null;
});

const mainContentForRenderer = computed<string>(() => { // Corrected name from mainContentToDisplay
  if (isLoadingResponse.value && !pendingToolCall.value && !chatStore.isMainContentStreaming) {
    return `## ${currentDisplayTitle.value}\n\n<div class="flex flex-col items-center justify-center h-full p-8">
               <div class="ide-spinner large"></div>
               <p class="mt-4 text-lg" style="color: var(--color-text-secondary);">Pilot is processing your request...</p>
             </div>`;
  }
  if (chatStore.isMainContentStreaming && !activeSessionId.value) {
      let streamingDisplay = currentQuery.value ? `## Responding to: ${currentQuery.value.substring(0,100)}${currentQuery.value.length > 100 ? '...' : ''}\n\n` : `## ${currentDisplayTitle.value}\n\n`;
      if (currentCodeSnippet.value) { // This implies parseAndSetCodeAndExplanation is updating these progressively
        streamingDisplay += `**Code (${currentLanguage.value}):**\n\`\`\`${currentLanguage.value}\n${currentCodeSnippet.value}\n\`\`\`\n\n`;
      }
      if (currentExplanationMarkdown.value) {
        streamingDisplay += `**Explanation:**\n${currentExplanationMarkdown.value}`;
      }
      return streamingDisplay + '▋';
  }

  if (activeSession.value) {
    let content = `# ${activeSession.value.title}\n\n`;
    if (activeSession.value.userInputQuery) {
      content += `**Original Query:**\n\`\`\`text\n${activeSession.value.userInputQuery}\n\`\`\`\n\n`;
    }
    if (activeSession.value.generatedCode) {
      content += `**Code (${activeSession.value.language}):**\n\`\`\`${activeSession.value.language}\n${activeSession.value.generatedCode}\n\`\`\`\n\n`;
    }
    content += `**Explanation:**\n${activeSession.value.explanationMarkdown}`;
    return content;
  }

  if (currentQuery.value || currentCodeSnippet.value || currentExplanationMarkdown.value) {
     let content = currentQuery.value ? `## Responding to: ${currentQuery.value.substring(0,100)}${currentQuery.value.length > 100 ? '...' : ''}\n\n` : `## ${currentDisplayTitle.value}\n\n`;
    if (currentCodeSnippet.value) {
      content += `**Code (${currentLanguage.value}):**\n\`\`\`${currentLanguage.value}\n${currentCodeSnippet.value}\n\`\`\`\n\n`;
    }
    if (currentExplanationMarkdown.value) {
      content += `**Explanation:**\n${currentExplanationMarkdown.value}`;
    }
    return content;
  }
  return `<div class="coding-agent-welcome-container">
            <div class="icon-wrapper"><CodeBracketSquareIcon class="main-icon" /></div>
            <h2 class="welcome-title">${agentDisplayName.value}</h2>
            <p class="welcome-subtitle">${props.agentConfig.description || 'Your expert AI pair programmer.'}</p>
            <p class="welcome-prompt">${props.agentConfig.inputPlaceholder || 'Ask a coding question or describe the task.'}</p>
          </div>`;
});

const filteredSessions = computed(() => {
  if (!searchTermSessions.value.trim()) {
    return codingSessions.value;
  }
  const lowerSearchTerm = searchTermSessions.value.toLowerCase();
  return codingSessions.value.filter(session =>
    session.title.toLowerCase().includes(lowerSearchTerm) ||
    session.userInputQuery.toLowerCase().includes(lowerSearchTerm) ||
    (session.language && session.language.toLowerCase().includes(lowerSearchTerm)) ||
    (session.tags && session.tags.some(tag => tag.toLowerCase().includes(lowerSearchTerm)))
  );
});

// --- System Prompt ---
const fetchSystemPrompt = async () => {
  if (props.agentConfig.systemPromptKey) {
    try {
      const response = await promptAPI.getPrompt(`${props.agentConfig.systemPromptKey}.md`);
      currentAgentSystemPrompt.value = response.data.content || "Fallback: You are CodePilot, an expert coding assistant. Use tools for specific tasks. Structure output clearly.";
    } catch (e) {
      console.error(`[${agentDisplayName.value}] Failed to load system prompt:`, e);
      currentAgentSystemPrompt.value = "You are CodePilot. Assist with coding tasks, provide explanations, and use tools like 'analyzeCodeComplexity' or 'getGitRepoStatus' when relevant. Structure output for clarity with Markdown (use ---SLIDE_BREAK--- for sections if using CompactMessageRenderer).";
    }
  } else {
     currentAgentSystemPrompt.value = "You are CodePilot. Assist with coding tasks, provide explanations, and use tools like 'analyzeCodeComplexity' or 'getGitRepoStatus' when relevant. Structure output for clarity with Markdown (use ---SLIDE_BREAK--- for sections if using CompactMessageRenderer).";
  }
};
watch(() => props.agentConfig.systemPromptKey, fetchSystemPrompt, { immediate: true });

// --- Local Storage Session Management ---
const loadCodingSessions = async () => {
  isProcessingLocal.value = true;
  try {
    const stored = await storage.getAllItemsInNamespace<CodingSession>(CODING_SESSIONS_NAMESPACE);
    codingSessions.value = Object.values(stored).sort((a,b) => new Date(b.updatedAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    console.error(`[${agentDisplayName.value}] Error loading sessions:`, error);
    toast?.add({ type: 'error', title: 'Session Load Error', message: 'Could not load saved coding work.' });
  } finally { isProcessingLocal.value = false; }
};

watch(isLoadingResponse, (newVal) => {
  notifyParentProcessingState(newVal);
});

const saveCurrentWorkAsSession = async (titlePromptText?: string) => {
  if (!currentExplanationMarkdown.value && !currentCodeSnippet.value && !currentQuery.value) {
    toast?.add({ type: 'warning', title: 'Nothing to Save', message: 'No active work to save.' });
    return;
  }
  const newTitle = prompt(titlePromptText || "Enter a title for this coding session:", currentQuery.value.substring(0, 50) || `Coding Work ${new Date().toLocaleDateString()}`);
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
    explanationMarkdown: currentExplanationMarkdown.value || "No explanation provided.",
    language: currentLanguage.value,
    createdAt: now,
    updatedAt: now,
    tags: extractTagsFromQuery(currentQuery.value),
  };

  try {
    await storage.setItem(CODING_SESSIONS_NAMESPACE, newSession.id, newSession);
    codingSessions.value.unshift(newSession);
    activeSessionId.value = newSession.id;
    displaySavedSession(newSession.id);
    toast?.add({ type: 'success', title: 'Session Saved', message: `"${newSession.title}" saved.` });
  } catch (error) { 
    console.error("Error saving session:", error);
    toast?.add({ type: 'error', title: 'Save Error', message: 'Failed to save session.'});
  } finally { isProcessingLocal.value = false; }
};

const displaySavedSession = (sessionId: string) => {
  const session = codingSessions.value.find(s => s.id === sessionId);
  if (session) {
    activeSessionId.value = sessionId;
    currentQuery.value = session.userInputQuery;
    currentCodeSnippet.value = session.generatedCode || null;
    currentExplanationMarkdown.value = session.explanationMarkdown;
    currentLanguage.value = session.language;
    currentDisplayTitle.value = session.title;
    isEditingSessionTitle.value = false;

    chatStore.updateMainContent({
        agentId: props.agentId,
        type: 'compact-message-renderer-data',
        data: mainContentForRenderer.value,
        title: session.title,
        timestamp: new Date(session.updatedAt).getTime()
    });
  }
};

const deleteCodingSession = async (sessionId: string) => {
  if (!confirm("Are you sure you want to delete this coding session? This action cannot be undone.")) return;
  isProcessingLocal.value = true;
  try {
    await storage.removeItem(CODING_SESSIONS_NAMESPACE, sessionId);
    codingSessions.value = codingSessions.value.filter(s => s.id !== sessionId);
    if (activeSessionId.value === sessionId) {
      activeSessionId.value = null;
      clearCurrentWorkspace();
      setWelcomeContent("Session deleted. Ready for your next query.");
    }
    toast?.add({ type: 'success', title: 'Session Deleted', message: 'Coding session removed.' });
  } catch (error) { 
    console.error("Error deleting session:", error);
    toast?.add({ type: 'error', title: 'Delete Error', message: 'Failed to delete session.'});
  } finally { isProcessingLocal.value = false; }
};

const startNewCodingQuery = () => {
  activeSessionId.value = null;
  clearCurrentWorkspace();
  currentDisplayTitle.value = `${agentDisplayName.value} - New Query`;
  setWelcomeContent("Ready for your new coding query. What can I assist you with?");
  emit('request-coding-input');
};

const clearCurrentWorkspace = () => {
  currentQuery.value = "";
  currentCodeSnippet.value = null;
  currentExplanationMarkdown.value = null;
  pendingToolCall.value = null;
};

const beginEditSessionTitle = (sessionId: string) => { // This function is used by the template
  const session = codingSessions.value.find(s => s.id === sessionId);
  if (session) {
    activeSessionId.value = sessionId; 
    sessionTitleEditBuffer.value = session.title;
    isEditingSessionTitle.value = true; 
    nextTick(() => {
      // Corrected to use a more specific selector for the input if needed, or ensure unique IDs.
      // For this setup, the input is only shown for the active edited session.
      const inputElement = document.querySelector(`#session-title-editor-${session.id}`) as HTMLInputElement;
      inputElement?.focus();
    });
  }
};

const confirmEditSessionTitle = async () => { // This function is used by the template
  if (activeSession.value && sessionTitleEditBuffer.value.trim()) {
    const sessionIdx = codingSessions.value.findIndex(s => s.id === activeSessionId.value);
    if (sessionIdx !== -1) {
      const updatedSession: CodingSession = {
        ...codingSessions.value[sessionIdx],
        title: sessionTitleEditBuffer.value.trim(),
        updatedAt: new Date().toISOString(),
      };
      codingSessions.value.splice(sessionIdx, 1, updatedSession);
      codingSessions.value.sort((a,b) => new Date(b.updatedAt).getTime() - new Date(a.createdAt).getTime());
      await storage.setItem(CODING_SESSIONS_NAMESPACE, updatedSession.id, updatedSession);
      
      currentDisplayTitle.value = updatedSession.title;
      chatStore.updateMainContent({
            agentId: props.agentId, type: 'compact-message-renderer-data',
            data: mainContentForRenderer.value, title: updatedSession.title,
            timestamp: new Date(updatedSession.updatedAt).getTime()
        });
      toast?.add({type: 'success', title: 'Title Updated', message: 'Session title saved.'});
    }
  }
  isEditingSessionTitle.value = false;
  sessionTitleEditBuffer.value = '';
};

const cancelEditSessionTitle = () => { // This function is used by the template
  isEditingSessionTitle.value = false;
  sessionTitleEditBuffer.value = '';
};

const extractTagsFromQuery = (query: string): string[] => {
  const words = query.toLowerCase().match(/\b(\w{3,})\b/g) || [];
  const commonDevKeywords = ['javascript', 'python', 'java', 'c#', 'c++', 'algorithm', 'debug', 'error', 'loop', 'function', 'class', 'array', 'string', 'api', 'http', 'database', 'react', 'vue', 'angular', 'node', 'server', 'client', 'bug', 'fix', 'optimization', 'test', 'style', 'css', 'html', 'component', 'service', 'module'];
  const tags = words.filter(word => commonDevKeywords.includes(word));
  return [...new Set(tags)].slice(0, 5);
};

// --- Tool Simulation/Execution ---
const executeTool = async (toolName: string, toolArguments: any): Promise<any> => {
    toast?.add({type: 'info', title: `Executing Tool: ${toolName}`, message: `Args: ${JSON.stringify(toolArguments).substring(0,100)}...`});
    await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000));
    
    let mockOutput: Record<string, any> = { status: `Simulated execution for ${toolName}`, args: toolArguments }; // Ensure mockOutput can hold any property

    if (toolName === 'getGitRepoStatus') {
        mockOutput.branch = toolArguments.repoPath ? 'main' : 'feature/simulated';
        mockOutput.status = Math.random() > 0.5 ? 'Clean' : 'Modified files (simulated)';
        mockOutput.files = Math.random() > 0.5 ? ['src/index.ts M', 'package.json M'] : [];
        mockOutput.pathProvided = toolArguments.repoPath || 'No specific path given';
    } else if (toolName === 'analyzeCodeComplexity') {
        mockOutput.cyclomatic_complexity = Math.floor(Math.random() * 15) + 1; // Fixed property name
        mockOutput.linesOfCode = toolArguments.codeSnippet?.split('\n').length || Math.floor(Math.random() * 200) + 20;
        mockOutput.language = toolArguments.language || 'unknown';
        mockOutput.maintainabilityIndex = Math.floor(Math.random() * 40) + 60;
        mockOutput.issuesFound = Math.random() > 0.6 ? ['High nesting level detected'] : ['No major issues found'];
    } else {
        mockOutput.error = `Tool ${toolName} simulation not fully implemented.`;
    }
    return mockOutput;
};

const processFunctionCallFromLLM = async (funcCallData: FunctionCallResponseDataFE) => { // This function is used
  pendingToolCall.value = {
    toolCallId: funcCallData.toolCallId,
    toolName: funcCallData.toolName,
    toolArguments: funcCallData.toolArguments,
    assistantMessageText: funcCallData.assistantMessageText || `CodePilot wants to use the '${funcCallData.toolName}' tool.`
  };
  if (pendingToolCall.value.assistantMessageText) {
      currentExplanationMarkdown.value = (currentExplanationMarkdown.value || "") + `\n\n**Tool Request:** ${pendingToolCall.value.assistantMessageText}\n\n`;
      // Update main display to show this text before modal pops
      chatStore.updateMainContent({
        agentId: props.agentId, type: 'compact-message-renderer-data',
        data: mainContentForRenderer.value, title: currentDisplayTitle.value, timestamp: Date.now()
      });
  }
  showToolInteractionModal.value = true; 
  toolResponseInput.value = JSON.stringify(funcCallData.toolArguments, null, 2);
};

const confirmAndExecuteTool = async () => { // This function is used by the template
  if (!pendingToolCall.value) return;
  const { toolCallId, toolName, toolArguments } = pendingToolCall.value;
  let toolOutput: any;
  let userMessageForLog = `Proceeding with tool: ${toolName}.`;

  try {
    let effectiveArgs = toolArguments;
    if (toolResponseInput.value.trim()){
        try { 
            const parsedInput = JSON.parse(toolResponseInput.value);
            // If toolResponseInput is valid JSON, merge it or use it as new args
            // This logic assumes toolResponseInput, if provided, overrides initial args.
            effectiveArgs = parsedInput; 
        } catch (e) { 
            // If not valid JSON, and for specific tools, it might be a simple string input
            if (toolName === 'getGitRepoStatus') {
                effectiveArgs = { repoPath: toolResponseInput.value.trim() };
            } else {
                console.warn("Could not parse toolResponseInput as JSON, using original/default args for tool:", toolName);
            }
        }
    }
    toolOutput = await executeTool(toolName, effectiveArgs);
    userMessageForLog = `Tool '${toolName}' executed.`;
  } catch (error: any) { 
    toolOutput = { error: error.message || `Failed to execute ${toolName}.` };
    userMessageForLog = `Error processing tool: ${toolName}.`;
  }
  showToolInteractionModal.value = false;
  pendingToolCall.value = null;
  toolResponseInput.value = '';
  await sendToolResultToLLM(toolCallId, toolName, toolOutput, userMessageForLog);
};

const cancelToolCall = async () => { // This function is used by the template
    if (!pendingToolCall.value) return;
    const { toolCallId, toolName } = pendingToolCall.value;
    showToolInteractionModal.value = false;
    pendingToolCall.value = null;
    toolResponseInput.value = '';
    toast?.add({type:'info', title:'Tool Cancelled', message:`Execution of '${toolName}' cancelled by user.`});
    await sendToolResultToLLM(toolCallId, toolName, { error: 'User cancelled tool execution.' }, `User cancelled the '${toolName}' tool.`);
};

const sendToolResultToLLM = async (toolCallId: string, toolName: string, output: any, userMessageText: string) => {
  isLoadingResponse.value = true;
  currentDisplayTitle.value = `Processing response after ${toolName}`;
  chatStore.setMainContentStreaming(true, `## ${currentDisplayTitle.value}\n<div class="coding-agent-spinner-container mx-auto my-4"><div class="coding-agent-spinner"></div></div>\n\nSending result of '${toolName}' back to ${agentDisplayName.value}...`);
  clearCurrentWorkspaceForStreaming();

  chatStore.addMessage({ role: 'user', content: userMessageText, agentId: props.agentId, timestamp: Date.now() -1 });

  try {
    if (!currentAgentSystemPrompt.value) await fetchSystemPrompt();
    const preferredLang = currentLanguage.value;
    const personaOverrideForTool = chatStore.getPersonaForAgent(props.agentId);
    const baseToolInstructions = `The tool '${toolName}' has been executed. Its output is provided. Continue assisting the user with their original query: "${currentQuery.value}". Structure your response with clear code blocks and explanations.`;
    const combinedToolInstructions = [baseToolInstructions, personaOverrideForTool?.trim()].filter(Boolean).join('\n\n');

    let finalSystemPrompt = currentAgentSystemPrompt.value
      .replace(/{{LANGUAGE}}/g, preferredLang)
      .replace(/{{AGENT_CONTEXT_JSON}}/g, JSON.stringify({ currentQuery: currentQuery.value, preferredLanguage: preferredLang, lastToolCall: toolName }))
      .replace(/{{ADDITIONAL_INSTRUCTIONS}}/g, combinedToolInstructions);

    const historyConfig: Partial<AdvancedHistoryConfig> = { numRecentMessagesToPrioritize: 15 };
    const processedHistory = await chatStore.getHistoryForApi(props.agentId, `Result for ${toolName}`, finalSystemPrompt, historyConfig);
    
    const allMessagesFromStore = chatStore.getMessagesForAgent(props.agentId);
    const assistantMsgWithToolCall = allMessagesFromStore.find(msg => msg.tool_calls?.some(tc => tc.id === toolCallId));

    const messagesForLlm: ChatMessageFE[] = [
        {role: 'system', content: finalSystemPrompt},
        ...processedHistory.map(m => ({...m, role: m.role as ChatMessageFE['role']})),
    ];
    if (assistantMsgWithToolCall && !messagesForLlm.find(m => m.content === assistantMsgWithToolCall.content && m.role === 'assistant')) {
      // Ensure the message that asked for the tool call is in history for context
      // This logic might need refinement to ensure it's placed correctly chronologically
      // For now, this assumes getHistoryForApi handles order and content well.
    }
    messagesForLlm.push({
        role: 'tool',
        tool_call_id: toolCallId,
        name: toolName,
        content: JSON.stringify(output),
    });
    
    const basePayload: ChatMessagePayloadFE = {
      messages: messagesForLlm,
      mode: props.agentConfig.id,
      language: preferredLang,
      userId: 'frontend_user_codepilot_tool_resp',
      conversationId: chatStore.getCurrentConversationId(props.agentId),
      stream: true,
    };
    const payload = chatStore.attachPersonaToPayload(props.agentId, basePayload);

    let accumulatedContent = "";
    chatStore.clearStreamingMainContent();

    const finalResponse = await chatAPI.sendMessageStream(
      payload,
      (chunk) => { 
        accumulatedContent += chunk;
        parseAndSetCodeAndExplanation(accumulatedContent, true);
        chatStore.updateMainContent({
            agentId: props.agentId, type: 'compact-message-renderer-data',
            data: mainContentForRenderer.value, title: currentDisplayTitle.value, timestamp: Date.now()
        });
      },
      () => { 
        isLoadingResponse.value = false;
        chatStore.setMainContentStreaming(false);
        const finalContent = accumulatedContent.trim();
        parseAndSetCodeAndExplanation(finalContent);
        chatStore.addMessage({ role: 'assistant', content: finalContent, agentId: props.agentId, model: 'CodePilot LLM (after tool)' });
        chatStore.updateMainContent({
            agentId: props.agentId, type: 'compact-message-renderer-data',
            data: mainContentForRenderer.value, title: currentDisplayTitle.value, timestamp: Date.now()
        });
      },
      (error) => { 
        isLoadingResponse.value = false; chatStore.setMainContentStreaming(false);
        parseAndSetCodeAndExplanation(`### Error\nStream error after tool: ${error.message}`);
        toast?.add({type: 'error', title: 'Stream Error After Tool', message: error.message});
      }
    );
    chatStore.syncPersonaFromResponse(props.agentId, finalResponse);
  } catch (error: any) {
    isLoadingResponse.value = false; chatStore.setMainContentStreaming(false);
    const errorMessage = error.response?.data?.message || error.message || 'An error occurred sending tool result.';
    parseAndSetCodeAndExplanation(`### API Error After Tool\n${errorMessage}`);
    toast?.add({ type: 'error', title: `Tool Response Error`, message: errorMessage });
  }
};

const handleCodingQuery = async (text: string): Promise<void> => {
  if (!text.trim() || isLoadingResponse.value) return;

  currentQuery.value = text;
  activeSessionId.value = null;
  clearCurrentWorkspace();
  currentDisplayTitle.value = `Responding to: ${text.substring(0, 40)}...`;

  chatStore.addMessage({ role: 'user', content: text, agentId: props.agentId, timestamp: Date.now() });
  isLoadingResponse.value = true;
  chatStore.setMainContentStreaming(true, `## ${currentDisplayTitle.value}\n<div class="coding-agent-spinner-container mx-auto my-4"><div class="coding-agent-spinner"></div></div>\n\n${agentDisplayName.value} is analyzing your query...`);
  
  try {
    if (!currentAgentSystemPrompt.value) await fetchSystemPrompt();
    const preferredLang = voiceSettingsManager.settings.preferredCodingLanguage || 'python';
    currentLanguage.value = preferredLang;

    const personaOverride = chatStore.getPersonaForAgent(props.agentId);
    const baseInstructions = 'Provide comprehensive coding assistance. Structure explanations clearly. Use code blocks for all code. If the user\'s query implies a need for external data or complex analysis not possible through text alone (like checking a live git repo status or deep static code analysis), use a function call to `getGitRepoStatus` or `analyzeCodeComplexity`. Otherwise, respond directly.';
    const combinedAdditionalInstructions = [baseInstructions, personaOverride?.trim()].filter(Boolean).join('\n\n');

    let finalSystemPrompt = currentAgentSystemPrompt.value
      .replace(/{{LANGUAGE}}/g, preferredLang)
      .replace(/{{USER_QUERY}}/g, text)
      .replace(/{{AGENT_CONTEXT_JSON}}/g, JSON.stringify({ currentQuery: text, preferredLanguage: preferredLang }))
      .replace(/{{ADDITIONAL_INSTRUCTIONS}}/g, combinedAdditionalInstructions);
    
    const historyConfig: Partial<AdvancedHistoryConfig> = { numRecentMessagesToPrioritize: 10 };
    const processedHistory = await chatStore.getHistoryForApi(props.agentId, text, finalSystemPrompt, historyConfig);

    const messagesForLlm: ChatMessageFE[] = [
        {role: 'system', content: finalSystemPrompt},
        ...processedHistory.map(m => ({...m, role: m.role as ChatMessageFE['role']})),
        {role: 'user', content: text, timestamp: Date.now()}
    ];
    
    const basePayload: ChatMessagePayloadFE = {
      messages: messagesForLlm,
      mode: props.agentConfig.id,
      language: preferredLang,
      userId: 'frontend_user_codepilot_q',
      conversationId: chatStore.getCurrentConversationId(props.agentId),
      stream: false, // Changed to false to robustly handle initial tool call from LLM
    };
    
    const payload = chatStore.attachPersonaToPayload(props.agentId, basePayload);
    const response = await chatAPI.sendMessage(payload);
    chatStore.syncPersonaFromResponse(props.agentId, response.data);
    const responseData = response.data as FunctionCallResponseDataFE | TextResponseDataFE;

    if (responseData.type === 'function_call_data') {
        isLoadingResponse.value = false; 
        chatStore.setMainContentStreaming(false);
        chatStore.addMessage({
            role: 'assistant',
            content: responseData.assistantMessageText || `Requesting tool: ${responseData.toolName}`,
            agentId: props.agentId,
            model: responseData.model,
            tool_calls: [{ id: responseData.toolCallId, type: 'function', function: { name: responseData.toolName, arguments: JSON.stringify(responseData.toolArguments) } }],
            timestamp: Date.now(),
        });
        await processFunctionCallFromLLM(responseData);
    } else { 
        const finalContent = responseData.content || "Could not process the request.";
        parseAndSetCodeAndExplanation(finalContent);
        
        chatStore.addMessage({
            role: 'assistant', content: finalContent, agentId: props.agentId,
            model: responseData.model, usage: responseData.usage, timestamp: Date.now(),
        });
        chatStore.updateMainContent({
            agentId: props.agentId,
            type: 'compact-message-renderer-data',
            data: mainContentForRenderer.value,
            title: currentDisplayTitle.value,
            timestamp: Date.now()
        });
        isLoadingResponse.value = false;
        chatStore.setMainContentStreaming(false);
    }

  } catch (error: any) { 
    isLoadingResponse.value = false;
    chatStore.setMainContentStreaming(false);
    const errorMessage = error.response?.data?.message || error.message || 'An error occurred.';
    parseAndSetCodeAndExplanation(`### API Error\n${errorMessage}`);
    toast?.add({ type: 'error', title: `${agentDisplayName.value} Error`, message: errorMessage });
  }
};

const parseAndSetCodeAndExplanation = (markdownText: string, isStreamingUpdate: boolean = false) => {
    const codeBlockRegex = /```(?:([a-zA-Z0-9_#.+-]+)\n)?([\s\S]*?)```/gm;
    let firstCodeBlockMatch = codeBlockRegex.exec(markdownText); // Get first match to determine primary code
    
    if (firstCodeBlockMatch) {
        currentLanguage.value = firstCodeBlockMatch[1] || 'plaintext';
        currentCodeSnippet.value = firstCodeBlockMatch[2].trim();
        
        // Attempt to separate explanation from code. This is a simple heuristic.
        // It assumes explanation is primarily before the first significant code block,
        // or if nothing is before, then after.
        const firstBlockStartIndex = markdownText.indexOf(firstCodeBlockMatch[0]);
        const firstBlockEndIndex = firstBlockStartIndex + firstCodeBlockMatch[0].length;

        const textBefore = markdownText.substring(0, firstBlockStartIndex).trim();
        const textAfter = markdownText.substring(firstBlockEndIndex).trim();
        
        // If there's substantial text before, assume it's the primary explanation.
        // Otherwise, if there's text after, use that.
        // If both are minimal, the entire content might be mostly code with little explanation.
        if (textBefore.length > 50 || !textAfter) { // Arbitrary length to prefer pre-code text
            currentExplanationMarkdown.value = textBefore + (textAfter ? `\n\n${textAfter}` : ""); // Concatenate if both exist
        } else {
            currentExplanationMarkdown.value = textAfter + (textBefore ? `\n\n${textBefore}` : "");
        }
        if(!currentExplanationMarkdown.value?.trim() && !isStreamingUpdate){
            currentExplanationMarkdown.value = "Code snippet provided.";
        }

    } else {
        currentCodeSnippet.value = null;
        currentExplanationMarkdown.value = markdownText;
    }

    if (!isStreamingUpdate) {
        currentDisplayTitle.value = currentQuery.value.substring(0,30) || "Coding Response";
    }
};

const clearCurrentWorkspaceForStreaming = () => {
    currentCodeSnippet.value = ""; // Initialize for potential streaming accumulation if parsed differently
    currentExplanationMarkdown.value = ""; 
};

const setWelcomeContent = (message?: string) => {
  const welcomeMarkdown = `
<div class="coding-agent-welcome-container">
  <div class="icon-wrapper"><CodeBracketSquareIcon class="main-icon" /></div>
  <h2 class="welcome-title">${agentDisplayName.value}</h2>
  <p class="welcome-subtitle">${props.agentConfig.description || 'Your expert AI pair programmer.'}</p>
  <p class="welcome-prompt">${message || props.agentConfig.inputPlaceholder || 'Ask a coding question or describe the task.'}</p>
</div>`;
  // This will be rendered via mainContentForRenderer now
  currentQuery.value = "";
  currentCodeSnippet.value = null;
  currentExplanationMarkdown.value = welcomeMarkdown; // Set it as explanation for initial display
  currentDisplayTitle.value = `${agentDisplayName.value} - Ready`;

  // Also update the store if CompactMessageRenderer is driven by it directly
  chatStore.updateMainContent({
    agentId: props.agentId, type: 'compact-message-renderer-data', // Assuming it uses this type
    data: mainContentForRenderer.value, // This will now include the welcome markdown
    title: currentDisplayTitle.value, timestamp: Date.now()
  });
};

const copyToClipboard = async (text: string | null, type: 'Code' | 'Explanation') => {
  if (!text) { 
    toast?.add({type: 'warning', title: 'Nothing to Copy', message: `${type} is empty.`});
    return; 
  }
  try {
    await navigator.clipboard.writeText(text);
    toast?.add({type: 'success', title: 'Copied', message: `${type} copied.`});
  } catch (err) { 
    console.error(`Failed to copy ${type.toLowerCase()}:`, err);
    toast?.add({type: 'error', title: 'Copy Failed', message: `Could not copy ${type.toLowerCase()}.`});
  }
};

const parseMarkdown = (md: string | null): string => { // Used for v-html display of mainContentForRenderer
  if (!md) return '';
  const renderer = new marked.Renderer();
  renderer.code = (code, language) => {
    const validLanguage = hljs.getLanguage(language || '') ? language : 'plaintext';
    const highlightedCode = hljs.highlight(code, { language: validLanguage || 'plaintext', ignoreIllegals: true }).value;
    // The copy button here is for direct v-html. CompactMessageRenderer might have its own.
    // Unique ID for button to avoid conflicts if multiple code blocks.
    const buttonId = `copy-btn-${generateId()}`;
    const rawCodeForButton = encodeURIComponent(code); // encode for attribute

    // The onclick for this button needs to be handled carefully due to v-html.
    // A better approach for v-html is to add event listeners after rendering,
    // or use Vue components for code blocks if interactivity is complex.
    // For simplicity, this inline onclick calls a global function or a method exposed to window.
    // window.vcaCopyToClipboard = copyToClipboard; // Expose to global (not ideal)

    // Simplified button, actual copying would need more robust handling if inside v-html
     return `<div class="code-block-wrapper-dynamic">
                <div class="code-block-header-dynamic">
                    <span class="code-block-language-dynamic">${validLanguage}</span>
                     <button class="btn-icon-futuristic smallest code-copy-button-dynamic" title="Copy code" data-code="${rawCodeForButton}">
                        <DocumentDuplicateIcon class="w-3.5 h-3.5"/>
                    </button>
                </div>
                <pre><code class="hljs language-${validLanguage}">${highlightedCode}</code></pre>
            </div>`;
  };
  return marked.parse(md, { renderer, breaks: true, gfm: true });
};

// Add event listeners for dynamically created copy buttons
const setupDynamicCopyButtons = () => {
    const workspacePanel = document.querySelector('.coding-workspace-panel');
    if(workspacePanel) {
        workspacePanel.addEventListener('click', async (event) => {
            const target = event.target as HTMLElement;
            const button = target.closest('.code-copy-button-dynamic') as HTMLButtonElement;
            if(button && button.dataset.code) {
                try {
                    const codeToCopy = decodeURIComponent(button.dataset.code);
                    await navigator.clipboard.writeText(codeToCopy);
                    toast?.add({type: 'success', title: 'Copied', message: 'Code copied to clipboard.'});
                    // Optional: change button text/icon temporarily
                    const originalIcon = button.innerHTML;
                    button.innerHTML = `<CheckCircleIcon class="w-3.5 h-3.5 text-success-default"/>`;
                    setTimeout(() => { button.innerHTML = originalIcon; }, 2000);
                } catch (err) {
                    toast?.add({type: 'error', title: 'Copy Failed', message: 'Could not copy code.'});
                }
            }
        });
    }
};


onMounted(async () => {
  emit('agent-event', { type: 'view_mounted', agentId: props.agentId, label: agentDisplayName.value });
  await fetchSystemPrompt();
  await loadCodingSessions();
  if (!activeSessionId.value && codingSessions.value.length > 0) {
     setWelcomeContent();
  } else if (!activeSessionId.value) {
    setWelcomeContent();
  } else {
    // If activeSessionId was restored (e.g., from a persisted store for agentStore)
    const restoredSession = codingSessions.value.find(s => s.id === activeSessionId.value);
    if (restoredSession) displaySavedSession(activeSessionId.value);
    else setWelcomeContent(); // Fallback if restored ID not found
  }
  setupDynamicCopyButtons();
});

onUnmounted(() => {
    notifyParentProcessingState(false);
    // Clean up global event listeners if any were added for dynamic buttons, though the current one is delegated.
});

defineExpose({ handleCodingQuery, handleNewUserInput: handleCodingQuery, processProblemContext: handleCodingQuery, processNewMeetingInput: handleCodingQuery });

</script>

<template>
  <div class="coding-agent-view">
    <div class="coding-header">
      <div class="header-title-group">
        <CodeBracketSquareIcon class="header-icon" />
        <span class="header-title" :title="agentDisplayName">{{ agentDisplayName }}</span>
         <span v-if="activeSession" class="header-subtitle truncate" :title="activeSession.title">
          | {{ activeSession.title }}
        </span>
        <span v-else-if="currentQuery" class="header-subtitle truncate" :title="currentQuery">
          | Query: {{ currentQuery.substring(0,30) }}...
        </span>
      </div>
      <div class="header-actions">
        <button @click="showSessionListPanel = !showSessionListPanel" class="btn-futuristic-toggle btn-sm" title="Toggle Saved Sessions">
          <FolderOpenIcon class="btn-icon-sm" />
          <span>{{ showSessionListPanel ? 'Hide' : 'Show' }} Sessions ({{ filteredSessions.length }})</span>
        </button>
        <button @click="startNewCodingQuery" class="btn-futuristic-primary btn-sm" title="Start New Coding Query">
          <PlusCircleIcon class="btn-icon-sm"/> New Query
        </button>
      </div>
    </div>

    <div class="coding-main-layout">
      <transition name="slide-fade-left-coding">
        <div v-if="showSessionListPanel" class="session-list-panel-coding">
          <div class="panel-header">
            <h3 class="panel-title">Coding Sessions</h3>
            <input 
                type="search" 
                v-model="searchTermSessions" 
                placeholder="Search sessions..." 
                class="form-input-futuristic small search-sessions-input"
            />
          </div>
           <div class="panel-actions">
             <button @click="() => { if(confirm('Delete all saved sessions? This cannot be undone.')) { storage.clearNamespace(CODING_SESSIONS_NAMESPACE).then(loadCodingSessions); } }" 
              class="btn-futuristic-danger btn-xs w-full" title="Delete All Sessions" v-if="codingSessions.length > 0">
              <TrashIcon class="btn-icon-xs"/> Clear All Sessions
            </button>
           </div>
          <div class="session-list-scroll-area">
            <div v-if="isProcessingLocal && filteredSessions.length === 0" class="list-loading-state">
              <div class="coding-agent-spinner small"></div><span class="ml-2 text-xs">Loading...</span>
            </div>
            <p v-if="!isProcessingLocal && filteredSessions.length === 0 && !searchTermSessions" class="list-empty-state">
              No saved sessions yet. <br/>Use "Save Current Work" to keep your progress!
            </p>
             <p v-if="!isProcessingLocal && filteredSessions.length === 0 && searchTermSessions" class="list-empty-state">
              No sessions match '{{ searchTermSessions }}'.
            </p>
            <div
              v-for="session in filteredSessions" :key="session.id"
              @click="displaySavedSession(session.id)"
              class="session-item" :class="{ 'active': activeSessionId === session.id }"
            >
              <CodeBracketSquareIcon class="item-icon" :class="`lang-icon-${session.language.toLowerCase()}`"/>
              <div class="item-details">
                 <input 
                    v-if="isEditingSessionTitle && activeSessionId === session.id" 
                    type="text" 
                    :id="`session-title-editor-${session.id}`"
                    v-model="sessionTitleEditBuffer" 
                    @keyup.enter="confirmEditSessionTitle()" 
                    @keyup.esc="cancelEditSessionTitle()"
                    @blur="confirmEditSessionTitle()"
                    @click.stop 
                    class="form-input-futuristic small inline-title-editor"
                />
                <span v-else class="item-title truncate" :title="session.title" @dblclick="beginEditSessionTitle(session.id)">{{ session.title }}</span>
                <div class="item-meta">
                  <span class="item-lang-tag">{{ session.language }}</span>
                  <span>{{ new Date(session.updatedAt).toLocaleDateString([], {month:'short', day:'numeric'}) }}</span>
                </div>
                 <div v-if="session.tags && session.tags.length" class="item-tags">
                    <span v-for="tag in session.tags" :key="tag" class="tag-chip">{{tag}}</span>
                </div>
              </div>
              <div class="item-actions">
                  <button @click.stop="beginEditSessionTitle(session.id)" class="btn-icon-futuristic smallest" title="Edit Title"> <PencilSquareIcon class="w-3.5 h-3.5"/> </button>
                  <button @click.stop="deleteCodingSession(session.id)" class="btn-icon-futuristic smallest danger-hover" title="Delete Session"> <TrashIcon class="w-3.5 h-3.5"/> </button>
              </div>
            </div>
          </div>
        </div>
      </transition>

      <div class="coding-workspace-panel">
         <div v-if="isLoadingResponse && !mainContentForRenderer && !chatStore.isMainContentStreaming" class="loading-overlay-futuristic">
            <div class="spinner-futuristic large"></div>
            <p class="loading-text-futuristic">{{ agentDisplayName }} is thinking...</p>
        </div>
        
        <div 
            v-if="mainContentForRenderer"
            class="prose-futuristic coding-prose-content main-display-area" 
            v-html="parseMarkdown(mainContentForRenderer)">
        </div>
         <div v-else-if="!isLoadingResponse" class="coding-agent-welcome-container">
            </div>

        <div v-if="!activeSessionId && (currentCodeSnippet || currentExplanationMarkdown)" class="workspace-action-bar">
            <button @click="saveCurrentWorkAsSession()" class="btn-futuristic-primary btn-sm" title="Save current work as a session">
                <PlusCircleIcon class="btn-icon-sm"/> Save Current Work
            </button>
            <button v-if="currentCodeSnippet" @click="copyToClipboard(currentCodeSnippet, 'Code')" class="btn-futuristic-outline btn-sm" title="Copy Code">
                <DocumentDuplicateIcon class="btn-icon-sm"/> Copy Code
            </button>
             <button v-if="currentExplanationMarkdown" @click="copyToClipboard(currentExplanationMarkdown, 'Explanation')" class="btn-futuristic-outline btn-sm" title="Copy Explanation">
                <DocumentDuplicateIcon class="btn-icon-sm"/> Copy Explanation
            </button>
        </div>
         <div v-else-if="activeSession" class="workspace-action-bar">
             <span class="text-xs opacity-70 italic">Viewing: {{ activeSession.title }}</span>
             <button v-if="activeSession.generatedCode" @click="copyToClipboard(activeSession.generatedCode, 'Code')" class="btn-futuristic-outline btn-sm" title="Copy Code">
                <DocumentDuplicateIcon class="btn-icon-sm"/> Copy Code
            </button>
             <button v-if="activeSession.explanationMarkdown" @click="copyToClipboard(activeSession.explanationMarkdown, 'Explanation')" class="btn-futuristic-outline btn-sm" title="Copy Explanation">
                <DocumentDuplicateIcon class="btn-icon-sm"/> Copy Explanation
            </button>
         </div>
      </div>
    </div>

    <transition name="modal-fade-futuristic">
        <div v-if="showToolInteractionModal && pendingToolCall" class="modal-backdrop-futuristic" @click.self="cancelToolCall">
            <div class="modal-content-futuristic tool-interaction-modal">
                <div class="modal-header-futuristic">
                    <h3 class="modal-title-futuristic"><CommandLineIcon class="w-5 h-5 mr-2"/>Tool Call: {{ pendingToolCall.toolName }}</h3>
                    <button @click="cancelToolCall" class="btn-modal-close-futuristic">&times;</button>
                </div>
                <div class="modal-body-futuristic">
                    <p class="tool-modal-info" v-if="pendingToolCall.assistantMessageText">
                        <InformationCircleIcon class="w-4 h-4 mr-1.5 inline-block align-text-bottom"/>
                        {{ pendingToolCall.assistantMessageText }}
                    </p>
                    <label class="form-label mt-3">Tool Arguments (JSON) - Modify if needed for simulation:</label>
                    <textarea
                        v-model="toolResponseInput"
                        class="form-input-futuristic code-font h-32"
                        placeholder="Arguments for the tool (JSON format)."
                    ></textarea>
                     <p class="text-xs mt-1" style="color: var(--color-text-muted);">
                        For simulation, you can modify arguments or proceed.
                    </p>
                </div>
                <div class="modal-footer-futuristic">
                    <button @click="cancelToolCall" class="btn-futuristic-secondary btn-sm">Cancel Tool</button>
                    <button @click="confirmAndExecuteTool" class="btn-futuristic-primary btn-sm">
                        <CommandLineIcon class="btn-icon-sm"/> Execute {{pendingToolCall.toolName}} (Simulated)
                    </button>
                </div>
            </div>
        </div>
    </transition>
  </div>
</template>


<style lang="scss" scoped>
@use 'sass:math';
@use '@/styles/abstracts/variables' as var;
@use '@/styles/abstracts/mixins' as mixins;

// Component-specific CSS variables using global theme vars as defaults
.coding-agent-view {
  --coding-accent-h: var(--color-accent-primary-h, #{var.$default-color-accent-primary-h});
  --coding-accent-s: var(--color-accent-primary-s, #{var.$default-color-accent-primary-s});
  --coding-accent-l: var(--color-accent-primary-l, #{var.$default-color-accent-primary-l});
  
  --coding-bg-h: var(--color-bg-primary-h, #{var.$default-color-bg-primary-h});
  --coding-bg-s: var(--color-bg-primary-s, #{var.$default-color-bg-primary-s});
  --coding-bg-l: calc(var(--color-bg-primary-l, #{var.$default-color-bg-primary-l}) - 7%); // Darker IDE base

  color: var(--color-text-primary); // Global theme text color
  // ... (Rest of the styles from v2.1.0) ...
  @apply flex flex-col h-full w-full overflow-hidden;
  background-color: hsl(var(--coding-bg-h), var(--coding-bg-s), var(--coding-bg-l));
  background-image: 
    linear-gradient(hsla(var(--coding-accent-h), var(--coding-accent-s), var(--coding-accent-l), 0.025) 0.5px, transparent 0.5px),
    linear-gradient(90deg, hsla(var(--coding-accent-h), var(--coding-accent-s), var(--coding-accent-l), 0.025) 0.5px, transparent 0.5px),
    radial-gradient(circle at top left, hsla(var(--coding-accent-h), var(--coding-accent-s), var(--coding-accent-l), 0.05), transparent 40%),
    radial-gradient(circle at bottom right, hsla(var(--coding-accent-h), calc(var(--coding-accent-s) + 10%), calc(var(--coding-accent-l) - 5%), 0.07), transparent 50%);
  background-size: 22px 22px, 22px 22px, cover, cover;
}

.coding-header {
  @apply flex items-center justify-between p-2.5 px-4 border-b shadow-lg backdrop-blur-sm z-10 shrink-0;
  background-color: hsla(var(--coding-bg-h), var(--coding-bg-s), calc(var(--coding-bg-l) + 5%), 0.9);
  border-bottom-color: hsla(var(--coding-accent-h), var(--coding-accent-s), var(--coding-accent-l), 0.3);
  
  .header-title-group { @apply flex items-center gap-2.5 min-w-0; }
  .header-icon {
    @apply w-6 h-6 shrink-0;
    color: hsl(var(--coding-accent-h), var(--coding-accent-s), var(--coding-accent-l));
    filter: drop-shadow(0 0 6px hsla(var(--coding-accent-h), var(--coding-accent-s), var(--coding-accent-l), 0.6));
  }
  .header-title { @apply font-semibold text-base lg:text-lg tracking-wide truncate; color: var(--color-text-primary); }
  .header-subtitle { @apply text-xs lg:text-sm ml-1.5 hidden md:inline truncate opacity-70; color: var(--color-text-muted); }
  .header-actions { @apply flex items-center gap-2; }
}

.coding-main-layout {
  @apply flex-grow flex flex-row overflow-hidden;
  & > .session-list-panel-coding + .coding-workspace-panel {
    border-left: 1px solid hsla(var(--coding-accent-h), var(--coding-accent-s), var(--coding-accent-l), 0.12);
  }
}

.session-list-panel-coding {
  @apply w-full lg:w-[320px] xl:w-[380px] p-3 flex flex-col shrink-0; // Adjusted width
  background-color: hsla(var(--coding-bg-h), var(--coding-bg-s), calc(var(--coding-bg-l) + 3%), 0.96);
  border-right: 1px solid hsla(var(--coding-accent-h), var(--coding-accent-s), var(--coding-accent-l), 0.2);
  @include mixins.custom-scrollbar(
    $thumb-color-var-prefix: '--coding-accent', $thumb-base-alpha: 0.3, $thumb-hover-alpha: 0.5,
    $track-color-var-prefix: '--coding-bg', $track_alpha: 0.1,
    $fb-thumb-h: var.$default-color-accent-primary-h, $fb-thumb-s: var.$default-color-accent-primary-s, $fb-thumb-l: var.$default-color-accent-primary-l,
    $fb-track-h: var.$default-color-bg-primary-h, $fb-track-s: var.$default-color-bg-primary-s, $fb-track-l: var.$default-color-bg-primary-l
  );

  .panel-header {
    @apply flex justify-between items-center mb-2 pb-2 border-b;
    border-bottom-color: hsla(var(--coding-accent-h), var(--coding-accent-s), var(--coding-accent-l), 0.2);
  }
  .panel-title { @apply text-sm font-semibold; color: var(--color-text-secondary); }
  .search-sessions-input { @apply text-xs py-1 mt-1 mb-1; max-width: 150px; margin-left: auto; background-color: hsla(var(--coding-bg-h), var(--coding-bg-s), calc(var(--coding-bg-l) + 10%), 0.8); border-color: hsla(var(--coding-accent-h),var(--coding-accent-s),var(--coding-accent-l),0.2)}
  .panel-actions { @apply mt-1 mb-2; }
  .session-list-scroll-area { @apply flex-grow overflow-y-auto space-y-1.5 pr-0.5; }
  .list-loading-state, .list-empty-state {
    @apply flex items-center justify-center text-xs h-16 opacity-60; color: var(--color-text-muted);
  }
}

.session-item {
  @apply p-2.5 rounded-md cursor-pointer transition-all duration-150 ease-out border flex justify-between items-center text-left;
  background-color: hsla(var(--coding-bg-h), var(--coding-bg-s), calc(var(--coding-bg-l) + 6%), 0.6);
  border-color: hsla(var(--coding-accent-h), var(--coding-accent-s), var(--coding-accent-l), 0.12);
  &:hover {
    background-color: hsla(var(--coding-accent-h), var(--coding-accent-s), var(--coding-accent-l), 0.15);
    border-color: hsla(var(--coding-accent-h), var(--coding-accent-s), var(--coding-accent-l), 0.4);
  }
  &.active {
    background-color: hsla(var(--coding-accent-h), var(--coding-accent-s), var(--coding-accent-l), 0.25);
    border-color: hsl(var(--coding-accent-h), var(--coding-accent-s), var(--coding-accent-l));
    .item-title { color: hsl(var(--coding-accent-h), var(--coding-accent-s), calc(var(--coding-accent-l) + 15%)); }
  }
  .item-icon { @apply w-4 h-4 opacity-70 shrink-0 mr-2; color: hsl(var(--coding-accent-h), var(--coding-accent-s), var(--coding-accent-l)); }
  .item-details { @apply flex-grow min-w-0; }
  .item-title { @apply text-sm font-medium truncate block; color: var(--color-text-primary); }
  .item-meta { @apply text-[0.7rem] opacity-70 block mt-0.5; color: var(--color-text-muted); }
  .item-lang-tag { @apply px-1.5 py-0.5 text-[0.65rem] rounded-sm mr-1.5; background-color: hsla(var(--coding-accent-h), var(--coding-accent-s), var(--coding-accent-l), 0.2); color: hsl(var(--coding-accent-h), var(--coding-accent-s), calc(var(--coding-accent-l) + 20%));}
  .item-tags { 
    @apply mt-1 flex flex-wrap gap-1;
    .tag-chip { @apply px-1.5 py-0.5 text-[0.6rem] rounded; background-color: hsla(var(--coding-bg-h), var(--coding-bg-s), calc(var(--coding-bg-l) + 10%), 0.7); color: var(--color-text-muted); }
  }
  .item-actions { @apply flex gap-1 shrink-0 ml-2; }
}
.session-title-editor-inline { // For inline title editing in session list
    @apply p-1.5 mt-1 mb-1 border rounded-md flex gap-1 items-center w-full; // Ensure it takes width
    border-color: hsla(var(--coding-accent-h), var(--coding-accent-s), var(--coding-accent-l), 0.3);
    background-color: hsla(var(--coding-bg-h), var(--coding-bg-s), calc(var(--coding-bg-l) + 10%), 0.8);
    input.small { padding: 0.3rem 0.5rem; font-size: 0.8rem; flex-grow: 1; background-color: transparent; border: none; color: var(--color-text-primary); }
}


.coding-workspace-panel {
  @apply flex-grow relative min-h-0 flex flex-col overflow-hidden;
  background-color: hsl(var(--coding-bg-h), var(--coding-bg-s), var(--coding-bg-l));
}

.main-display-area { 
    @apply flex-grow overflow-y-auto;
     @include mixins.custom-scrollbar(
      $thumb-color-var-prefix: '--coding-accent', $thumb-base-alpha: 0.4, $thumb-hover-alpha: 0.6,
      $track-color-var-prefix: '--coding-bg', $track_alpha: 0.1,
      $fb-thumb-h: var.$default-color-accent-primary-h, $fb-thumb-s: var.$default-color-accent-primary-s, $fb-thumb-l: var.$default-color-accent-primary-l,
      $fb-track-h: var.$default-color-bg-primary-h, $fb-track-s: var.$default-color-bg-primary-s, $fb-track-l: var.$default-color-bg-primary-l
    );
}

.coding-compact-renderer { /* For when CompactMessageRenderer is used directly */
  @apply h-full w-full;
}
.prose-futuristic.coding-prose-content { // Applied to the v-html wrapper or :deep within CompactMessageRenderer
    font-size: var(--font-size-base); 
    line-height: var(--line-height-base);
    color: var(--color-text-primary);
    padding: 1rem;
    @media (min-width: var.$breakpoint-md) { padding: 1.5rem; }

    :deep(h1), :deep(h2), :deep(h3), :deep(h4) {
      @apply font-semibold tracking-tight border-b pb-2 mb-4;
      color: hsl(var(--coding-accent-h), var(--coding-accent-s), calc(var(--coding-accent-l) + 15%));
      border-bottom-color: hsla(var(--coding-accent-h), var(--coding-accent-s), var(--coding-accent-l), 0.3);
    }
    :deep(h1) { @apply text-xl md:text-2xl; } :deep(h2) { @apply text-lg md:text-xl; } :deep(h3) { @apply text-base md:text-lg; }

    :deep(p), :deep(li) { @apply my-3 leading-relaxed; color: var(--color-text-secondary); }
    :deep(ul), :deep(ol) { @apply pl-5; }
    :deep(a) { color: hsl(var(--coding-accent-h), var(--coding-accent-s), var(--coding-accent-l)); @apply hover:underline font-medium; }
    :deep(strong) { color: var(--color-text-primary); font-weight: 600; }
    
    // Dynamic Code Block Styling (applied by parseMarkdown)
    :deep(.code-block-wrapper-dynamic) {
        @apply relative bg-slate-800 dark:bg-black/60 rounded-lg my-4 shadow-lg overflow-hidden; // Darker for contrast
        border: 1px solid hsla(var(--coding-accent-h), var(--coding-accent-s), var(--coding-accent-l), 0.25);
    }
    :deep(.code-block-header-dynamic) {
        @apply flex justify-between items-center px-3 py-1.5 bg-slate-700/60 dark:bg-slate-800/70 text-xs;
        border-bottom: 1px solid hsla(var(--coding-accent-h), var(--coding-accent-s), var(--coding-accent-l), 0.2);
        color: var(--color-text-muted);
    }
    :deep(.code-block-language-dynamic) { @apply font-mono uppercase tracking-wider; }
    :deep(button.code-copy-button-dynamic) { 
        @apply p-1 transition-colors duration-150 text-muted bg-transparent border-none;
        svg { @apply w-3.5 h-3.5; }
    }
    :deep(.code-block-wrapper-dynamic pre) {
      @apply p-0 m-0; // Pre itself has no padding if header exists
      code.hljs { 
        display: block; padding: 1rem; 
        overflow-x: auto;
        background: transparent !important; 
        color: var(--color-text-code-block, #{var.$default-color-text-code-block-l});
        @include mixins.custom-scrollbar($thumb-color-var-prefix: '--coding-accent', $thumb-base-alpha: 0.3, $thumb-hover-alpha: 0.5, $track-color-var-prefix: '--coding-bg', $track_alpha: 0.05, $width: 5px, $fb-track-h: var.$default-color-bg-code-block-h, $fb-track-s: var.$default-color-bg-code-block-s, $fb-track-l: var.$default-color-bg-code-block-l);
      }
    }
    :deep(code:not(pre code)) {
      @apply px-1.5 py-0.5 rounded text-xs;
      background-color: hsla(var(--coding-accent-h), var(--coding-accent-s), var(--coding-accent-l), 0.12);
      color: hsl(var(--coding-accent-h), var(--coding-accent-s), calc(var(--coding-accent-l) + 25%));
      border: 1px solid hsla(var(--coding-accent-h), var(--coding-accent-s), var(--coding-accent-l), 0.18);
      font-family: var(--font-family-mono);
    }
}

.coding-agent-welcome-container { /* ... (styles from previous response) ... */ }
.workspace-action-bar { /* ... (styles from previous response) ... */ }
.tool-interaction-modal { /* ... (styles from previous response) ... */ }
.coding-agent-spinner-container { /* ... (styles from previous response) ... */ }
.coding-agent-spinner { /* ... (styles from previous response) ... */ }

.btn-futuristic-primary, .btn-futuristic-secondary, .btn-futuristic-outline, .btn-futuristic-danger, .btn-futuristic-toggle, .btn-icon-futuristic, .form-input-futuristic,
.modal-backdrop-futuristic, .modal-content-futuristic, .modal-header-futuristic, .modal-title-futuristic, .btn-modal-close-futuristic, .modal-body-futuristic, .modal-footer-futuristic {
  // Assuming these are defined globally or in a shared stylesheet
  // For this component to be self-contained for styling, they'd be here or @imported
  // Example from previous response for .btn-futuristic-primary:
  // @extend .btn-futuristic-base; (if base exists)
  // background-color: hsla(var(--coding-accent-h), var(--coding-accent-s), var(--coding-accent-l), 0.8);
  // ... (full definition)
}
.btn-sm { @apply py-1.5 px-2.5 text-xs; }
.btn-xs { @apply py-1 px-2 text-xs; }
.btn-icon-sm { @apply w-4 h-4 mr-1.5; }
.btn-icon-xs { @apply w-3.5 h-3.5 mr-1; }
.form-input-futuristic.small { @apply text-xs py-1 px-2; }

.slide-fade-left-coding-enter-active,
.slide-fade-left-coding-leave-active {
  transition: opacity 0.3s var(--ease-out-quad), transform 0.35s var(--ease-out-cubic);
  max-width: 380px;
}
.slide-fade-left-coding-enter-from,
.slide-fade-left-coding-leave-to {
  opacity: 0;
  transform: translateX(-100%);
  max-width: 380px;
}
.text-error-default { color: var(--color-error-text, red); }
.code-font { font-family: var(--font-family-mono); }

@keyframes subtlePulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: var(--opacity-pulse, 0.9); transform: scale(var(--scale-pulse, 1.03)); }
}
</style>

