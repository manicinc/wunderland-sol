/**
 * @file chat.store.ts
 * @description Pinia store for managing chat messages, main content display,
 * conversation history, and streaming state across different AI agents.
 * @version 1.4.7 - Corrected AgentId type usage and removed unused imports.
 */
import { defineStore } from 'pinia';
import { ref, computed, readonly } from 'vue'; // Removed nextTick
import { type AgentId, agentService, type IAgentDefinition } from '@/services/agent.service';
import {
  advancedConversationManager,
  type ProcessedConversationMessage as AdvProcessedMessage,
  type AdvancedHistoryConfig,
  DEFAULT_ADVANCED_HISTORY_CONFIG // Assuming this is correctly exported
} from '@/services/advancedConversation.manager';
import {
  conversationManager as simpleConversationManager,
  type ConversationMessage as SimpleManagerMessage
} from '@/services/conversation.manager';
import { voiceSettingsManager } from '@/services/voice.settings.service';
import { chatAPI, type ChatMessageFE, type ProcessedHistoryMessageFE, type ILlmToolCallFE as ApiLlmToolCall, type ChatMessagePayloadFE } from '@/utils/api';
import type { WorkflowInstanceFE, WorkflowEventFE, WorkflowProgressUpdateFE, WorkflowUpdateEventDetail } from '@/types/workflow';
import type { AgencySnapshotFE, AgencyUpdateEventDetail } from '@/types/agency';
import type { RagRetrievedChunkFE } from '@/utils/api';

export interface ILlmToolCallUI extends ApiLlmToolCall {}

/**
 * RAG retrieval context associated with a message.
 * Stores the chunks that were retrieved to provide context for a response.
 */
export interface MessageRagContext {
  /** The query that triggered retrieval */
  query: string;
  /** Retrieved chunks with content and scores */
  chunks: RagRetrievedChunkFE[];
  /** Total results found (may be more than returned) */
  totalResults: number;
  /** Processing time in milliseconds */
  processingTimeMs?: number;
  /** Timestamp when retrieval occurred */
  retrievedAt: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'error' | 'tool';
  content: string | null;
  timestamp: number;
  agentId: AgentId;
  isError?: boolean;
  model?: string;
  usage?: { prompt_tokens: number | null; completion_tokens: number | null; total_tokens: number | null };
  estimatedTokenCount?: number;
  processedTokens?: string[];
  relevanceScore?: number;
  tool_calls?: ILlmToolCallUI[];
  tool_call_id?: string;
  name?: string;
}

export interface MainContent {
  agentId: AgentId;
  type:
    | 'markdown' | 'structured-json' | 'diagram' | 'compact-message-renderer-data'
    | 'function_call_data' | 'custom-component' | 'welcome' | 'loading' | 'error'
    | 'diary-entry-viewer';
  data: any;
  title?: string;
  timestamp: number;
  isAwaitingTts?: boolean;
}

export const useChatStore = defineStore('chat', () => {
  const messageHistory = ref<ChatMessage[]>([]);
  const mainAgentContents = ref<Record<string, MainContent | null>>({});
  const conversationIds = ref<Record<string, string>>({});
  const agentPersonas = ref<Record<string, string>>({});
  const isMainContentStreaming = ref(false);
  const streamingMainContentText = ref('');
  const ttsPendingMap = ref<Record<string, boolean>>({});
  const workflowInstances = ref<Record<string, WorkflowInstanceFE>>({});
  const workflowEvents = ref<Record<string, WorkflowEventFE[]>>({});
  const workflowByConversation = ref<Record<string, string>>({});
  const agencySessions = ref<Record<string, AgencySnapshotFE>>({});
  const agencyByConversation = ref<Record<string, string>>({});
  const languageDetectionSessionKey = 'vca_language_detection_complete_v1';
  const languageDetectionInFlight = ref(false);
  
  /** RAG retrieval context keyed by message ID */
  const ragContextByMessage = ref<Record<string, MessageRagContext>>({});

  const history = computed(() => readonly(messageHistory.value));
  
  const getCurrentMainContentDataForAgent = (activeAgentId?: AgentId): MainContent | null => {
    if (!activeAgentId) return null;
    return mainAgentContents.value[activeAgentId] || null;
  };

  const getMainContentForAgent = (agentId: AgentId): MainContent | null => mainAgentContents.value[agentId] || null;
  const getMessagesForAgent = (agentId: AgentId): ChatMessage[] => messageHistory.value.filter(msg => msg.agentId === agentId);

  const getCurrentConversationId = (agentId: AgentId): string => {
    if (!conversationIds.value[agentId]) {
      conversationIds.value[agentId] = `conv-${agentId}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    }
    return conversationIds.value[agentId];
  };

  const getExistingConversationId = (agentId: AgentId): string | null => conversationIds.value[agentId] ?? null;

  const hasCompletedLanguageDetection = (): boolean => {
    if (typeof window === 'undefined') return true;
    return sessionStorage.getItem(languageDetectionSessionKey) === 'true';
  };

  const markLanguageDetectionComplete = (): void => {
    if (typeof window === 'undefined') return;
    sessionStorage.setItem(languageDetectionSessionKey, 'true');
  };

  const maybeDetectConversationLanguage = async (agentId: AgentId): Promise<void> => {
    if (typeof window === 'undefined') return;
    if (languageDetectionInFlight.value) return;
    if (hasCompletedLanguageDetection()) return;

    const recentMessages = messageHistory.value
      .filter((msg) => msg.agentId === agentId && (msg.role === 'user' || msg.role === 'assistant'))
      .slice(-6)
      .map((msg) => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content || '',
      }))
      .filter((entry) => entry.content.trim().length > 0);

    if (recentMessages.length === 0) {
      return;
    }

    languageDetectionInFlight.value = true;
    try {
      const { data } = await chatAPI.detectLanguage(recentMessages);
      if (data?.language) {
        voiceSettingsManager.handleDetectedSpeechLanguage(data.language);
        voiceSettingsManager.handleDetectedResponseLanguage(data.language);
      }
      markLanguageDetectionComplete();
    } catch (error) {
      console.warn('[ChatStore] Language detection failed:', error);
      markLanguageDetectionComplete();
    } finally {
      languageDetectionInFlight.value = false;
    }
  };

  function setTtsPending(agentId: AgentId, pending: boolean): void {
    const current = !!ttsPendingMap.value[agentId];
    if (pending === current) {
      if (pending) {
        return;
      }
      if (!pending && !current) {
        return;
      }
    }

    if (pending) {
      ttsPendingMap.value = { ...ttsPendingMap.value, [agentId]: true };
    } else if (ttsPendingMap.value[agentId]) {
      const { [agentId]: _removed, ...rest } = ttsPendingMap.value;
      ttsPendingMap.value = rest;
    }

    if (mainAgentContents.value[agentId]) {
      mainAgentContents.value[agentId] = {
        ...mainAgentContents.value[agentId]!,
        isAwaitingTts: pending,
      };
    }
  }

  function addMessage(messageData: Omit<ChatMessage, 'id' | 'timestamp'> & { timestamp?: number, id?: string }): ChatMessage {
    const fullMessage: ChatMessage = {
      id: messageData.id || `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      timestamp: messageData.timestamp || Date.now(),
      role: messageData.role,
      content: messageData.content,
      agentId: messageData.agentId,
      isError: messageData.isError ?? false,
      model: messageData.model,
      usage: messageData.usage,
      estimatedTokenCount: messageData.estimatedTokenCount,
      processedTokens: messageData.processedTokens,
      relevanceScore: messageData.relevanceScore,
      tool_calls: messageData.tool_calls,
      tool_call_id: messageData.tool_call_id,
      name: messageData.name,
    };
    messageHistory.value.push(fullMessage);
    if (
      fullMessage.role === 'assistant' &&
      typeof fullMessage.content === 'string' &&
      fullMessage.content.trim().length > 0 &&
      voiceSettingsManager.settings.autoPlayTts
    ) {
      setTtsPending(fullMessage.agentId, true);
      void (async () => {
        try {
          await voiceSettingsManager.speakText(fullMessage.content as string);
        } catch (error) {
          console.error('[ChatStore] Error during TTS playback:', error);
        } finally {
          setTtsPending(fullMessage.agentId, false);
        }
      })();
    }
    if (fullMessage.role === 'user') {
      void maybeDetectConversationLanguage(fullMessage.agentId);
    }
    return fullMessage;
  }

  function applyTtsState(content: MainContent): MainContent {
    return {
      ...content,
      isAwaitingTts: !!ttsPendingMap.value[content.agentId],
    };
  }

  function updateMainContent(content: MainContent): void {
    mainAgentContents.value[content.agentId] = applyTtsState(content);
  }

  function clearMainContentForAgent(agentId: AgentId): void {
    if (mainAgentContents.value[agentId]) {
      mainAgentContents.value[agentId] = null;
    }
    if (ttsPendingMap.value[agentId]) {
      const { [agentId]: _removed, ...rest } = ttsPendingMap.value;
      ttsPendingMap.value = rest;
    }
  }

  function ensureMainContentForAgent(agentId: AgentId): void {
    if (!mainAgentContents.value[agentId]) {
      const agentDef = agentService.getAgentById(agentId);
      if (agentDef) {
        const placeholder = agentDef.inputPlaceholder || 'How can I assist you?';
        let welcomeData = `## Welcome to ${agentDef.label}!\n${agentDef.description}\n\n${placeholder}`;
        let welcomeType: MainContent['type'] = 'welcome';
        
        if (agentId === 'diary_agent') { // Corrected: Use the canonical AgentId
          welcomeType = 'diary-entry-viewer';
          welcomeData = "Select an entry to view, or start a new one. Your thoughts are saved locally.";
        }
        updateMainContent({
          agentId: agentDef.id, type: welcomeType, data: welcomeData,
          title: `${agentDef.label} Ready`, timestamp: Date.now(),
        });
      }
    }
  }

  /**
   * Set RAG retrieval context for a specific message.
   * @param messageId - The ID of the message to associate context with
   * @param context - The RAG retrieval context
   */
  function setRagContextForMessage(messageId: string, context: Omit<MessageRagContext, 'retrievedAt'>): void {
    ragContextByMessage.value = {
      ...ragContextByMessage.value,
      [messageId]: {
        ...context,
        retrievedAt: Date.now(),
      },
    };
  }

  /**
   * Get RAG retrieval context for a specific message.
   * @param messageId - The ID of the message
   * @returns The RAG context if available, otherwise null
   */
  function getRagContextForMessage(messageId: string): MessageRagContext | null {
    return ragContextByMessage.value[messageId] ?? null;
  }

  /**
   * Clear RAG context for a specific message or all messages for an agent.
   * @param messageIdOrAgentId - Message ID or Agent ID to clear context for
   * @param isAgentId - If true, clears all RAG context for messages from this agent
   */
  function clearRagContext(messageIdOrAgentId?: string, isAgentId = false): void {
    if (!messageIdOrAgentId) {
      ragContextByMessage.value = {};
      return;
    }

    if (isAgentId) {
      // Clear RAG context for all messages belonging to this agent
      const agentMessages = messageHistory.value
        .filter(msg => msg.agentId === messageIdOrAgentId)
        .map(msg => msg.id);
      
      const updatedContext = { ...ragContextByMessage.value };
      for (const msgId of agentMessages) {
        delete updatedContext[msgId];
      }
      ragContextByMessage.value = updatedContext;
    } else {
      // Clear RAG context for a specific message
      if (ragContextByMessage.value[messageIdOrAgentId]) {
        const { [messageIdOrAgentId]: _removed, ...rest } = ragContextByMessage.value;
        ragContextByMessage.value = rest;
      }
    }
  }

  function clearAgentData(agentId?: AgentId | null): void {
    if (agentId) {
      const conversationId = conversationIds.value[agentId];
      // Clear RAG context for this agent's messages before clearing message history
      clearRagContext(agentId, true);
      messageHistory.value = messageHistory.value.filter(msg => msg.agentId !== agentId);
      clearMainContentForAgent(agentId);
      if (conversationId) {
        const workflowsByConversation = { ...workflowByConversation.value };
        const workflowId = workflowsByConversation[conversationId];
        delete workflowsByConversation[conversationId];
        workflowByConversation.value = workflowsByConversation;
        if (workflowId) {
          const workflowSnapshot = { ...workflowInstances.value };
          delete workflowSnapshot[workflowId];
          workflowInstances.value = workflowSnapshot;
          const workflowEventHistory = { ...workflowEvents.value };
          delete workflowEventHistory[workflowId];
          workflowEvents.value = workflowEventHistory;
        }
        if (agencyByConversation.value[conversationId]) {
          const updatedAgencyMap = { ...agencyByConversation.value };
          const agencyId = updatedAgencyMap[conversationId];
          delete updatedAgencyMap[conversationId];
          agencyByConversation.value = updatedAgencyMap;
          if (agencyId) {
            const updatedAgencies = { ...agencySessions.value };
            delete updatedAgencies[agencyId];
            agencySessions.value = updatedAgencies;
          }
        }
      }
      delete conversationIds.value[agentId];
      if (agentPersonas.value[agentId]) {
        const updated = { ...agentPersonas.value };
        delete updated[agentId];
        agentPersonas.value = updated;
      }
      setTtsPending(agentId, false);
    } else {
      messageHistory.value = [];
      mainAgentContents.value = {};
      conversationIds.value = {};
      agentPersonas.value = {};
      ttsPendingMap.value = {};
      workflowInstances.value = {};
      workflowEvents.value = {};
      workflowByConversation.value = {};
      agencySessions.value = {};
      agencyByConversation.value = {};
      ragContextByMessage.value = {};
    }
  }
  function clearAllAgentData(): void { clearAgentData(); }
  
  function clearAgentChatLogIfChanging(): void {
    // console.log(`[ChatStore] clearAgentChatLogIfChanging called.`);
  }

  async function getHistoryForApi(
    agentId: AgentId, currentQueryText: string, systemPromptText: string,
    configOverride?: Partial<AdvancedHistoryConfig>,
    additionalCurrentTurnMessages: ChatMessage[] = []
  ): Promise<ProcessedHistoryMessageFE[]> {
    const useAdvanced = voiceSettingsManager.settings.useAdvancedMemory;
    const validRolesForHistory: Array<ChatMessage['role']> = ['user', 'assistant', 'system', 'tool'];
    
    const agentMessagesFromStore: ChatMessage[] = getMessagesForAgent(agentId)
        .filter(m => validRolesForHistory.includes(m.role));
    
    const allMessagesForProcessing: ChatMessage[] = [
        ...agentMessagesFromStore, 
        ...additionalCurrentTurnMessages.filter(m => validRolesForHistory.includes(m.role))
    ].sort((a, b) => a.timestamp - b.timestamp);

    let selectedHistoryForManager: AdvProcessedMessage[];

    if (useAdvanced) {
      const messagesForAdvManager: AdvProcessedMessage[] = allMessagesForProcessing.map(m => ({
        role: m.role as 'user' | 'assistant' | 'system', // 'tool' role may need specific handling if AdvManager expects it
        content: m.content || '',
        timestamp: m.timestamp,
        id: m.id,
        estimatedTokenCount: m.estimatedTokenCount,
        processedTokens: m.processedTokens,
        relevanceScore: m.relevanceScore,
      }));
      // Use the imported DEFAULT_ADVANCED_HISTORY_CONFIG or ensure it's correctly defined
      const baseConfig = advancedConversationManager.getHistoryConfig() || DEFAULT_ADVANCED_HISTORY_CONFIG;
      const effectiveConfig: AdvancedHistoryConfig = { ...baseConfig, ...(configOverride || {}), };
      selectedHistoryForManager = await advancedConversationManager.prepareHistoryForApi(
        messagesForAdvManager, currentQueryText, systemPromptText, effectiveConfig
      );
    } else {
      const messagesForSimpleManager: SimpleManagerMessage[] = allMessagesForProcessing
        .filter(m => m.role === 'user' || m.role === 'assistant' || m.role === 'system')
        .map(m => ({
          role: m.role as 'user' | 'assistant' | 'system',
          content: m.content || '',
          timestamp: m.timestamp,
      }));
      // Use voice settings for history count if available
      const historyCountToUse = configOverride?.simpleRecencyMessageCount ??
        voiceSettingsManager.settings.maxHistoryMessages ??
        simpleConversationManager.getHistoryMessageCount();
      const simpleSelected = simpleConversationManager.prepareHistoryForApi(messagesForSimpleManager, historyCountToUse);
      selectedHistoryForManager = simpleSelected.map(m => ({
        role: m.role, content: m.content, timestamp: m.timestamp,
        id: `simple-${m.timestamp}-${Math.random().toString(16).slice(2)}`,
        estimatedTokenCount: undefined, processedTokens: undefined, relevanceScore: undefined,
      }));
    }

    return selectedHistoryForManager.map(m => ({
      id: m.id,
      role: m.role as ChatMessageFE['role'], 
      content: m.content,
      timestamp: m.timestamp,
      estimatedTokenCount: m.estimatedTokenCount,
      processedTokens: m.processedTokens,
      relevanceScore: m.relevanceScore,
      // tool_calls, tool_call_id, name are usually not part of ProcessedHistoryMessageFE for API context
    }));
  }

  function setMainContentStreaming(isStreaming: boolean, initialText: string = ''): void {
    isMainContentStreaming.value = isStreaming;
    if (isStreaming) {
      streamingMainContentText.value = initialText;
    }
  }
  function appendStreamingMainContent(chunk: string): void {
    if (isMainContentStreaming.value) {
      streamingMainContentText.value += chunk;
    }
  }
  function clearStreamingMainContent(): void {
    streamingMainContentText.value = '';
  }

  function getPersonaForAgent(agentId: AgentId): string | null {
    return agentPersonas.value[agentId] ?? null;
  }

  function setPersonaForAgent(agentId: AgentId, persona: string | null): void {
    const normalized = persona?.trim() || '';
    if (normalized) {
      if (agentPersonas.value[agentId] !== normalized) {
        agentPersonas.value = { ...agentPersonas.value, [agentId]: normalized };
      }
    } else if (agentPersonas.value[agentId]) {
      const updated = { ...agentPersonas.value };
      delete updated[agentId];
      agentPersonas.value = updated;
    }
  }

  function attachPersonaToPayload(agentId: AgentId, payload: ChatMessagePayloadFE): ChatMessagePayloadFE {
    const persona = getPersonaForAgent(agentId);
    return {
      ...payload,
      agentId,
      personaOverride: persona ?? null,
    };
  }

  function syncPersonaFromResponse(agentId: AgentId, response?: { persona?: string | null }): void {
    if (!response || !Object.prototype.hasOwnProperty.call(response, 'persona')) return;
    setPersonaForAgent(agentId, response.persona ?? null);
  }

  const applyWorkflowUpdate = (update: WorkflowProgressUpdateFE): void => {
    const instance = update.workflow;
    workflowInstances.value = { ...workflowInstances.value, [instance.workflowId]: instance };
    if (instance.conversationId) {
      workflowByConversation.value = {
        ...workflowByConversation.value,
        [instance.conversationId]: instance.workflowId,
      };
    }
    if (update.recentEvents?.length) {
      const existing = workflowEvents.value[instance.workflowId] ?? [];
      const merged = [...existing, ...update.recentEvents];
      workflowEvents.value = {
        ...workflowEvents.value,
        [instance.workflowId]: merged.slice(-50),
      };
    }
  };

  const applyAgencyUpdate = (snapshot: AgencySnapshotFE): void => {
    agencySessions.value = { ...agencySessions.value, [snapshot.agencyId]: snapshot };
    if (snapshot.conversationId) {
      agencyByConversation.value = {
        ...agencyByConversation.value,
        [snapshot.conversationId]: snapshot.agencyId,
      };
    }
  };

  const getWorkflowForConversation = (conversationId: string | null | undefined): WorkflowInstanceFE | null => {
    if (!conversationId) return null;
    const workflowId = workflowByConversation.value[conversationId];
    return workflowId ? workflowInstances.value[workflowId] ?? null : null;
  };

  const getAgencyForConversation = (conversationId: string | null | undefined): AgencySnapshotFE | null => {
    if (!conversationId) return null;
    const agencyId = agencyByConversation.value[conversationId];
    return agencyId ? agencySessions.value[agencyId] ?? null : null;
  };

  const getWorkflowEventsForWorkflow = (workflowId: string | null | undefined): WorkflowEventFE[] => {
    if (!workflowId) return [];
    return workflowEvents.value[workflowId] ?? [];
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('vca:workflow-update', (event: Event) => {
      const detail = (event as CustomEvent<WorkflowUpdateEventDetail>).detail;
      if (detail?.workflow) {
        applyWorkflowUpdate(detail.workflow);
      }
    });
    window.addEventListener('vca:agency-update', (event: Event) => {
      const detail = (event as CustomEvent<AgencyUpdateEventDetail>).detail;
      if (detail?.agency) {
        applyAgencyUpdate(detail.agency);
      }
    });
  }

  return {
    messageHistory: history,
    mainAgentContents: readonly(mainAgentContents),
    isMainContentStreaming: readonly(isMainContentStreaming),
    streamingMainContentText: readonly(streamingMainContentText),
    agentPersonas: readonly(agentPersonas),
    ragContextByMessage: readonly(ragContextByMessage),
    getCurrentMainContentDataForAgent,
    getMainContentForAgent,
    getMessagesForAgent,
    getCurrentConversationId,
    addMessage,
    updateMainContent,
    clearAgentData,
    clearAllAgentData,
    getHistoryForApi,
    setMainContentStreaming,
    appendStreamingMainContent,
    clearStreamingMainContent,
    clearMainContentForAgent,
    ensureMainContentForAgent,
    clearAgentChatLogIfChanging,
    getPersonaForAgent,
    setPersonaForAgent,
    attachPersonaToPayload,
    syncPersonaFromResponse,
    getExistingConversationId,
    getWorkflowForConversation,
    getWorkflowEventsForWorkflow,
    getAgencyForConversation,
    isAgentAwaitingTts: (agentId: AgentId) => !!ttsPendingMap.value[agentId],
    // RAG context management
    setRagContextForMessage,
    getRagContextForMessage,
    clearRagContext,
  };
});
