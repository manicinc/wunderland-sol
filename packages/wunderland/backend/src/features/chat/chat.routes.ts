/**
 * @file Chat API route handlers with integrated Context Aggregator, persistent memory, and function calling for agents.
 * @description Handles requests to the /api/chat endpoint. It uses a Context Aggregator LLM,
 * then, based on discernment, either responds directly or passes the bundle to the main
 * agent-specific LLM. Agent LLMs can now use tools/functions.
 * @version 3.1.0 - Added function calling support for main agent LLMs.
 */

import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// --- Core LLM & Config Imports ---
import { callLlm, initializeLlmServices } from '../../core/llm/llm.factory.js';
import { LlmConfigService, AgentLLMDefinition } from '../../core/llm/llm.config.service.js';
import {
  IChatMessage,
  ILlmUsage,
  IChatCompletionParams,
  ILlmResponse,
  ILlmToolCall,
} from '../../core/llm/llm.interfaces.js';

// --- Cost & Model Preference Imports ---
import { CostService } from '../../core/cost/cost.service.js';
import {
  creditAllocationService,
  type CreditContext,
} from '../../core/cost/creditAllocation.service.js';
import { creditGateService } from '../../core/cost/creditGate.service.js';
import { resolveSessionUserId } from '../../utils/session.utils.js';
import { getModelPrice, MODEL_PRICING } from '../../../config/models.config.js';

// --- Core Service Imports ---
import { llmContextAggregatorService } from '../../core/context/LLMContextAggregatorService.js';
import {
  IContextAggregatorInputSources,
  IContextBundle,
} from '../../core/context/IContextAggregatorService.js';
import { jsonFileKnowledgeBaseService } from '../../core/knowledge/JsonFileKnowledgeBaseService.js';
import { sqliteMemoryAdapter } from '../../core/memory/SqliteMemoryAdapter.js';
import { IStoredConversationTurn } from '../../core/memory/IMemoryAdapter.js';
import { conversationCompactionService } from '../../core/memory/ConversationCompactionService.js';
import { ProcessedConversationMessageBE } from '../../core/conversation/conversation.interfaces.js';
import { metapromptPresetRouter } from '../../core/prompting/MetapromptPresetRouter.js';
import {
  agentosChatAdapterEnabled,
  processAgentOSChatRequest,
} from '../../integrations/agentos/agentos.chat-adapter.js';
import { applyLongTermMemoryDefaults } from '../../integrations/agentos/agentos.memory-defaults.js';
import {
  OrganizationAuthzError,
  requireActiveOrganizationMember,
  requireOrganizationRole,
} from '../organization/organization.authz.js';
import { getOrganizationSettings } from '../organization/organization.repository.js';
import { resolveOrganizationMemorySettings } from '../organization/organization.settings.js';

const __filename = fileURLToPath(import.meta.url);
const __projectRoot = path.resolve(path.dirname(__filename), '../../../..');
dotenv.config({ path: path.join(__projectRoot, '.env') });

// Ensure core services are initialized on module load
(async () => {
  try {
    await initializeLlmServices();
    await jsonFileKnowledgeBaseService.initialize();
    await sqliteMemoryAdapter.initialize();
    console.log(
      '[ChatRoutes] Core services (LLM, KnowledgeBase, MemoryAdapter) initialized successfully.'
    );
  } catch (error) {
    console.error('[ChatRoutes] CRITICAL ERROR during core service initialization:', error);
  }
})();

// --- Constants ---
const DEFAULT_HISTORY_MESSAGES_FOR_FALLBACK_CONTEXT = parseInt(
  process.env.DEFAULT_HISTORY_MESSAGES_FOR_FALLBACK_CONTEXT || '10',
  10
);
const SESSION_COST_THRESHOLD_USD = parseFloat(process.env.COST_THRESHOLD_USD_PER_SESSION || '2.00');
const DISABLE_COST_LIMITS_CONFIG = process.env.DISABLE_COST_LIMITS === 'true';
const LLM_DEFAULT_TEMPERATURE = parseFloat(process.env.LLM_DEFAULT_TEMPERATURE || '0.7');
const LLM_DEFAULT_MAX_TOKENS = parseInt(process.env.LLM_DEFAULT_MAX_TOKENS || '2048');
/**
 * @interface ClientChatMessage
 * @description Represents the structure of a message as potentially sent by the client.
 */
interface ClientChatMessage extends IChatMessage {
  timestamp?: number;
  agentId?: string;
}

/**
 * @function detectLanguage
 * @description Detects the language of input text based on character patterns and common words
 */
function detectLanguage(text: string): { code: string; name: string; confidence: number } {
  if (!text || text.trim().length === 0) {
    return { code: 'en', name: 'English', confidence: 0.5 };
  }

  // Character-based detection patterns
  const languagePatterns: Record<string, { pattern: RegExp; name: string }> = {
    zh: { pattern: /[\u4e00-\u9fff]{3,}/g, name: 'Chinese' },
    ja: { pattern: /[\u3040-\u309f\u30a0-\u30ff]{3,}/g, name: 'Japanese' },
    ko: { pattern: /[\uac00-\ud7af]{3,}/g, name: 'Korean' },
    ar: { pattern: /[\u0600-\u06ff]{3,}/g, name: 'Arabic' },
    he: { pattern: /[\u0590-\u05ff]{3,}/g, name: 'Hebrew' },
    ru: { pattern: /[\u0400-\u04ff]{3,}/g, name: 'Russian' },
    hi: { pattern: /[\u0900-\u097f]{3,}/g, name: 'Hindi' },
    th: { pattern: /[\u0e00-\u0e7f]{3,}/g, name: 'Thai' },
  };

  // Check character-based patterns first (more reliable)
  for (const [code, { pattern, name }] of Object.entries(languagePatterns)) {
    const matches = text.match(pattern);
    if (matches && matches.length > 0) {
      const coverage = matches.join('').length / text.length;
      if (coverage > 0.3) {
        // If 30% of text uses these characters
        return { code, name, confidence: Math.min(coverage + 0.3, 1) };
      }
    }
  }

  // Word-based detection for Latin script languages
  const wordPatterns: Record<string, { words: string[]; name: string }> = {
    es: {
      words: [
        'el',
        'la',
        'de',
        'que',
        'y',
        'en',
        'un',
        'por',
        'con',
        'para',
        'está',
        'es',
        'los',
        'las',
        'del',
        'al',
        'qué',
        'cómo',
      ],
      name: 'Spanish',
    },
    fr: {
      words: [
        'le',
        'de',
        'un',
        'et',
        'être',
        'avoir',
        'que',
        'pour',
        'dans',
        'ce',
        'il',
        'qui',
        'ne',
        'sur',
        'au',
        'avec',
        'est',
        'faire',
      ],
      name: 'French',
    },
    de: {
      words: [
        'der',
        'die',
        'und',
        'in',
        'das',
        'von',
        'zu',
        'mit',
        'sich',
        'auf',
        'ist',
        'für',
        'nicht',
        'ein',
        'eine',
        'als',
        'auch',
        'werden',
      ],
      name: 'German',
    },
    pt: {
      words: [
        'o',
        'a',
        'de',
        'para',
        'e',
        'do',
        'da',
        'em',
        'um',
        'por',
        'com',
        'não',
        'uma',
        'os',
        'ao',
        'está',
        'ser',
      ],
      name: 'Portuguese',
    },
    it: {
      words: [
        'il',
        'di',
        'che',
        'è',
        'e',
        'la',
        'a',
        'un',
        'in',
        'non',
        'si',
        'per',
        'con',
        'come',
        'una',
        'ma',
        'sono',
      ],
      name: 'Italian',
    },
    nl: {
      words: [
        'de',
        'het',
        'een',
        'van',
        'en',
        'in',
        'is',
        'op',
        'aan',
        'met',
        'voor',
        'zijn',
        'dat',
        'te',
        'er',
        'als',
        'bij',
      ],
      name: 'Dutch',
    },
  };

  const lowerText = text.toLowerCase();
  const words = lowerText.split(/\s+/);

  let bestMatch = { code: 'en', name: 'English', confidence: 0.5 };
  let highestScore = 0;

  for (const [code, { words: keywords, name }] of Object.entries(wordPatterns)) {
    let matches = 0;
    for (const keyword of keywords) {
      if (words.includes(keyword)) matches++;
    }
    const score = matches / keywords.length;
    if (score > highestScore) {
      highestScore = score;
      bestMatch = { code, name, confidence: Math.min(score * 2, 0.95) };
    }
  }

  // If we found a good match, return it
  if (highestScore > 0.2) {
    return bestMatch;
  }

  // Default to English
  return { code: 'en', name: 'English', confidence: 0.7 };
}

/**
 * @function loadPromptTemplate
 * @description Loads an agent's system prompt template.
 */
function loadPromptTemplate(templateName: string): string {
  try {
    const promptPath = path.join(__projectRoot, 'prompts', `${templateName}.md`);
    if (!fs.existsSync(promptPath)) {
      console.warn(
        `[ChatRoutes] Prompt template not found: ${promptPath}. Using universal fallback for mode "${templateName}".`
      );
      return `You are a helpful AI assistant operating in "{{MODE}}" mode.
Your primary task is to analyze the provided 'ContextBundle' and generate an appropriate response.
Current preferred programming language (if applicable): {{LANGUAGE}}.
The user is interacting in real-time. Respond clearly and accurately.
Base your response strictly on the information and directives within the provided ContextBundle.
Some agents can call tools/functions. If your persona and the user request align with a tool, call it.
{{ADDITIONAL_INSTRUCTIONS}}`;
    }
    return fs.readFileSync(promptPath, 'utf-8');
  } catch (error: any) {
    console.error(`[ChatRoutes] Error loading prompt template "${templateName}":`, error.message);
    return `You are a helpful AI assistant. Error loading specific instructions for mode '{{MODE}}'.
Analyze the provided 'ContextBundle' to understand the user's request and respond.
Current language context: {{LANGUAGE}}.
{{ADDITIONAL_INSTRUCTIONS}}`;
  }
}

/**
 * @function calculateLlmCost
 * @description Calculates LLM call cost.
 */
function calculateLlmCost(modelId: string, usage?: ILlmUsage): number {
  const promptTokens = usage?.prompt_tokens ?? 0;
  const completionTokens = usage?.completion_tokens ?? 0;
  if (promptTokens === 0 && completionTokens === 0) return 0;

  const modelPriceConfig = getModelPrice(modelId);
  if (!modelPriceConfig) {
    const defaultPricing = MODEL_PRICING['default'];
    if (defaultPricing) {
      return (
        (promptTokens / 1000) * defaultPricing.inputCostPer1K +
        (completionTokens / 1000) * defaultPricing.outputCostPer1K
      );
    }
    console.warn(
      `[ChatRoutes] Pricing not found for model "${modelId}" and no default pricing. Cost set to $0.`
    );
    return 0;
  }
  return (
    (promptTokens / 1000) * modelPriceConfig.inputCostPer1K +
    (completionTokens / 1000) * modelPriceConfig.outputCostPer1K
  );
}

/**
 * @interface ChatRequestBodyBE
 * @description Expected request body structure for /api/chat.
 */
interface ChatRequestBodyBE {
  mode: string;
  messages: ClientChatMessage[];
  processedHistory?: ProcessedConversationMessageBE[];
  language?: string;
  generateDiagram?: boolean;
  userId?: string;
  organizationId?: string | null;
  conversationId?: string;
  systemPromptOverride?: string;
  tutorMode?: boolean;
  tutorLevel?: string;
  interviewMode?: boolean;
  temperature?: number; // Allow frontend to specify temperature
  max_tokens?: number; // Allow frontend to specify max tokens
  personaOverride?: string | null; // Allow frontend to set or clear custom persona
  memoryControl?: Record<string, unknown> | null;
  // New field for tool responses from frontend
  tool_response?: {
    tool_call_id: string;
    tool_name: string; // For logging/context
    output: string; // Stringified result of the tool execution
  };
}

/**
 * @route POST /api/chat
 * @description Main chat processing endpoint.
 */
export async function POST(req: Request, res: Response): Promise<void> {
  const requestTimestamp = Date.now();
  let mainAgentLlmCallCost = 0;
  let contextAggregatorLlmCallCost = 0;
  let compactionResult: Awaited<
    ReturnType<typeof conversationCompactionService.maybeCompactConversation>
  > | null = null;

  console.log('received request \n\n\n', req.body);

  try {
    const {
      mode = 'general',
      messages: currentTurnClientMessages, // Can be user message or tool response message
      processedHistory: historyFromClient,
      language = process.env.DEFAULT_LANGUAGE || 'python',
      generateDiagram = false,
      userId: userIdFromRequest,
      organizationId,
      conversationId: reqConversationId,
      systemPromptOverride,
      tutorLevel = 'intermediate',
      interviewMode: reqInterviewMode,
      tutorMode: reqTutorMode,
      temperature, // New: allow frontend to specify temperature
      max_tokens, // New: allow frontend to specify max_tokens
      personaOverride,
      memoryControl,
      tool_response, // New: handle tool response from client
    } = req.body as ChatRequestBodyBE;

    if (Array.isArray(currentTurnClientMessages)) {
      console.log(
        '[ChatRoutes][Debug] Incoming turn messages summary:',
        currentTurnClientMessages.map((msg, idx) => ({
          idx,
          role: msg.role,
          agentId: msg.agentId,
          snippet:
            typeof msg.content === 'string'
              ? `${msg.content.slice(0, 80)}${msg.content.length > 80 ? '…' : ''}`
              : null,
        }))
      );
    }

    const userContext = (req as any)?.user;
    const isAuthenticated = Boolean(userContext?.authenticated);
    const effectiveUserId = resolveSessionUserId(req, userIdFromRequest);
    const creditContext: CreditContext = {
      isAuthenticated,
      tier: userContext?.tier,
      mode: userContext?.mode,
    };
    creditAllocationService.syncProfile(effectiveUserId, creditContext);

    const orgId =
      typeof organizationId === 'string' && organizationId.trim().length > 0
        ? organizationId.trim()
        : null;
    const longTermMemory = (memoryControl as any)?.longTermMemory ?? null;
    const scopes = longTermMemory?.scopes ?? {};
    const wantsUserScope = Boolean((scopes as any)?.user);
    const wantsPersonaScope = Boolean((scopes as any)?.persona);
    const wantsOrgRead = Boolean((scopes as any)?.organization);
    const wantsOrgWrite = Boolean(longTermMemory?.shareWithOrganization);
    const wantsOrgScope = wantsOrgRead || wantsOrgWrite;
    const wantsAnyPrivilegedScope = wantsUserScope || wantsPersonaScope || wantsOrgScope;

    if ((orgId || wantsAnyPrivilegedScope) && !isAuthenticated) {
      res.status(401).json({
        message: 'Authentication required for organization/user/persona scoped memory.',
        error: 'AUTH_REQUIRED',
      });
      return;
    }

    if (wantsOrgScope && !orgId) {
      res.status(400).json({
        message: 'organizationId is required when enabling organization-scoped memory.',
        error: 'ORGANIZATION_ID_REQUIRED',
      });
      return;
    }

    if (orgId) {
      try {
        await requireActiveOrganizationMember(orgId, effectiveUserId);
        if (wantsOrgWrite) {
          await requireOrganizationRole(orgId, effectiveUserId, 'admin');
        }
      } catch (error: any) {
        if (error instanceof OrganizationAuthzError) {
          res.status(error.status).json({ message: error.message, error: error.code });
          return;
        }
        throw error;
      }
    }

    const orgMemorySettings = orgId
      ? resolveOrganizationMemorySettings(await getOrganizationSettings(orgId))
      : null;

    if (orgId && orgMemorySettings && !orgMemorySettings.enabled && wantsOrgScope) {
      res.status(403).json({
        message: 'Organization-scoped memory is disabled for this organization.',
        error: 'ORG_MEMORY_DISABLED',
      });
      return;
    }

    if (orgId && orgMemorySettings && wantsOrgWrite && !orgMemorySettings.allowWrites) {
      res.status(403).json({
        message: 'Organization-scoped memory publishing is disabled for this organization.',
        error: 'ORG_MEMORY_WRITES_DISABLED',
      });
      return;
    }

    const memoryControlWithDefaults = applyLongTermMemoryDefaults({
      memoryControl,
      organizationId: orgId,
      defaultOrganizationScope: Boolean(
        orgId && orgMemorySettings?.enabled && orgMemorySettings?.defaultRetrievalEnabled
      ),
      defaultUserScope: isAuthenticated,
      defaultPersonaScope: isAuthenticated,
    });

    const conversationId =
      reqConversationId ||
      `conv_${mode}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const currentTurnEarliestTimestamp =
      Array.isArray(currentTurnClientMessages) && currentTurnClientMessages.length > 0
        ? Math.min(...currentTurnClientMessages.map((msg) => msg.timestamp || requestTimestamp))
        : requestTimestamp;

    // --- 0. Credit Gate & Persona Persistence (always run before AgentOS short-circuit) ---
    const gateResult = creditGateService.checkLlm(effectiveUserId, creditContext);
    if (!gateResult.allowed) {
      const { error: gateError } = gateResult;
      res.status(gateError.status).json({
        message: gateError.message,
        error: gateError.code,
        ...gateError.details,
      });
      return;
    }

    if (typeof personaOverride !== 'undefined') {
      await sqliteMemoryAdapter.setConversationPersona(
        effectiveUserId,
        conversationId,
        mode,
        personaOverride,
        requestTimestamp
      );
    }

    const storedPersona = await sqliteMemoryAdapter.getConversationPersona(
      effectiveUserId,
      conversationId
    );

    // --- Persist the client's current-turn messages so the UI stays in sync even when AgentOS responds ---
    if (
      currentTurnClientMessages &&
      Array.isArray(currentTurnClientMessages) &&
      currentTurnClientMessages.length > 0
    ) {
      for (const clientMsg of currentTurnClientMessages) {
        await sqliteMemoryAdapter.storeConversationTurn(effectiveUserId, conversationId, {
          role: clientMsg.role as 'user' | 'tool',
          content: clientMsg.content,
          timestamp: clientMsg.timestamp || requestTimestamp,
          agentId: mode,
          tool_call_id: clientMsg.tool_call_id,
        });
      }
    } else if (
      !tool_response &&
      (!currentTurnClientMessages || currentTurnClientMessages.length === 0)
    ) {
      res.status(400).json({
        message: '`messages` array is required and cannot be empty if not a tool response.',
        error: 'INVALID_REQUEST_PAYLOAD',
      });
      return;
    }

    // --- 1. Optional rolling memory compaction (keeps "infinite" conversations small) ---
    // Skip when AgentOS chat adapter is enabled; it manages its own prompt construction.
    if (!agentosChatAdapterEnabled()) {
      compactionResult = await conversationCompactionService.maybeCompactConversation({
        userId: effectiveUserId,
        conversationId,
        agentId: mode,
      });
    }

    if (agentosChatAdapterEnabled()) {
      try {
        const agentosResult = await processAgentOSChatRequest({
          userId: effectiveUserId,
          organizationId,
          conversationId,
          mode,
          messages: (currentTurnClientMessages ?? []).map((clientMsg) => ({
            role: clientMsg.role,
            content: clientMsg.content ?? '',
          })),
          memoryControl: memoryControlWithDefaults ?? undefined,
        });

        res.status(200).json({
          content: agentosResult.content,
          contentPlain: agentosResult.contentPlain ?? null,
          model: agentosResult.model,
          usage: agentosResult.usage,
          conversationId: agentosResult.conversationId,
          sessionCost: null,
          costOfThisCall: null,
          persona: agentosResult.persona || storedPersona || null,
          personaLabel: agentosResult.personaLabel || null,
          metadata: agentosResult.metadata || null,
          discernment: { provider: 'agentos', mode },
        });
        return;
      } catch (agentosError: any) {
        console.error(
          '[ChatRoutes][AgentOS] Error while processing /api/chat via AgentOS:',
          agentosError
        );
        res.status(500).json({
          message: 'Failed to process the chat request via AgentOS.',
          error: 'AGENTOS_PROCESSING_FAILED',
          details:
            process.env.NODE_ENV === 'development'
              ? { error: agentosError?.message ?? 'Unknown AgentOS error' }
              : undefined,
        });
        return;
      }
    }

    // --- 2. Prepare Inputs for Context Aggregator (if not a tool response continuation) ---
    // The Context Aggregator is typically run for a new user query, not when just returning a tool's result.
    let contextBundle: IContextBundle;
    const latestUserQueryObject = currentTurnClientMessages
      ? [...currentTurnClientMessages].reverse().find((m) => m.role === 'user')
      : undefined;
    const currentUserQuery =
      latestUserQueryObject?.content ||
      (tool_response ? `Result for tool: ${tool_response.tool_name}` : 'Processing continuation.');
    console.log(
      `[ChatRoutes][Debug] Derived currentUserQuery snippet: "${typeof currentUserQuery === 'string' ? currentUserQuery.slice(0, 120) : ''}${typeof currentUserQuery === 'string' && currentUserQuery.length > 120 ? '…' : ''}"`
    );

    // If it's a tool_response, we usually skip context aggregation and go straight to the main agent LLM
    // with the tool's output. The history should include the original assistant call and the tool response.
    if (!tool_response) {
      console.log(
        `[ChatRoutes] User [${effectiveUserId}] Conv [${conversationId}] Mode [${mode}] - Preparing for Context Aggregation.`
      );
      let historyForAggregator: Array<{
        role: string;
        content: string | null;
        timestamp?: number;
        relevanceScore?: number;
      }>;

      if (historyFromClient && historyFromClient.length > 0) {
        console.log(
          `[ChatRoutes] Using pre-processed history from client (${historyFromClient.length} messages).`
        );
        historyForAggregator = historyFromClient.map((m) => ({
          role: m.role,
          content: m.content ?? '', // Ensure content is always a string
          timestamp: m.timestamp,
          relevanceScore: m.relevanceScore,
        }));
      } else {
        console.log(
          `[ChatRoutes] No pre-processed history from client. Fetching recent raw history from memory adapter.`
        );
        const afterTimestampForAggregator =
          typeof compactionResult?.summaryUptoTimestamp === 'number'
            ? compactionResult.summaryUptoTimestamp
            : undefined;
        const rawHistoricalTurns: IStoredConversationTurn[] =
          await sqliteMemoryAdapter.retrieveConversationTurns(
            effectiveUserId,
            conversationId,
            {
              limit: DEFAULT_HISTORY_MESSAGES_FOR_FALLBACK_CONTEXT,
              fetchMostRecent: true,
              beforeTimestamp: currentTurnEarliestTimestamp,
              afterTimestamp: afterTimestampForAggregator,
              preferSummariesForOlder: true,
            } // Limit includes user + assistant turns
          );
        historyForAggregator = rawHistoricalTurns.map((turn) => ({
          role: turn.role,
          content: (turn.summary || turn.content) ?? '', // Ensure content is always a string
          timestamp: turn.timestamp,
        }));
      }

      const knowledgeSnippets = await jsonFileKnowledgeBaseService
        .searchKnowledgeBase(currentUserQuery, 3)
        .then((items) =>
          items.map((it) => ({
            id: it.id,
            type: it.type,
            content: it.content.substring(0, 300) + (it.content.length > 300 ? '...' : ''),
            tags: it.tags,
            relevance: 1.0,
          }))
        );

      if (compactionResult?.summary) {
        knowledgeSnippets.unshift({
          id: 'conversation_summary',
          type: 'conversation_summary',
          content: compactionResult.summary,
          tags: ['conversation', 'summary'],
          relevance: 1.5,
        });
      }

      const aggregatorInputSources: IContextAggregatorInputSources = {
        currentUserFocus: {
          query: currentUserQuery,
          intent: mode, // Initial intent can be refined by aggregator
          mode: mode,
          metadata: {
            language,
            generateDiagramPreference: generateDiagram,
            tutorLevel,
            reqInterviewMode,
            reqTutorMode,
            persona: storedPersona || undefined,
          },
        },
        conversationHistory: historyForAggregator.map((h) => ({ ...h, content: h.content ?? '' })),
        userProfile: {
          preferences: {
            defaultLanguage: language,
            currentAgentMode: mode,
            tutorLevel,
            customPersona: storedPersona || undefined,
          },
          // customInstructions: "User prefers concise answers." // Example, load from user settings
        },
        systemState: {
          currentTaskContext: `User is interacting with the '${mode}' AI agent.${storedPersona ? ' The conversation has a custom persona override set by the user.' : ''}`,
          responseConstraints: contextBundleOutputFormatHints(mode),
          sharedKnowledgeSnippets: knowledgeSnippets,
        },
      };

      try {
        contextBundle =
          await llmContextAggregatorService.generateContextBundle(aggregatorInputSources);
        const aggregatorModelId = process.env.AGGREGATOR_LLM_MODEL_ID || 'openai/gpt-4o-mini';
        contextAggregatorLlmCallCost = 0.00015; // Placeholder for actual cost calculation
        CostService.trackCost(
          effectiveUserId,
          'llm_aggregator',
          contextAggregatorLlmCallCost,
          aggregatorModelId,
          500,
          'tokens',
          150,
          'tokens',
          { conversationId, mode, querySnippet: currentUserQuery.substring(0, 50) }
        );
        if (storedPersona) {
          contextBundle.criticalSystemContext = {
            ...(contextBundle.criticalSystemContext || {}),
            customPersona: storedPersona,
          };
        }
        console.log(
          `[ChatRoutes] Context Bundle generated. Discernment: ${contextBundle.discernmentOutcome}`
        );
        console.log('[ChatRoutes][Debug] ContextBundle primaryTask:', {
          description: contextBundle.primaryTask?.description,
          derivedIntent: contextBundle.primaryTask?.derivedIntent,
        });
      } catch (aggregatorError: any) {
        console.error(
          '[ChatRoutes] Context Aggregator Service failed:',
          aggregatorError.message,
          aggregatorError.stack
        );
        res.status(503).json({
          message:
            'Error processing your request context. The AI assistant may be temporarily unavailable. Please try again.',
          error: 'CONTEXT_AGGREGATION_FAILURE',
          details: aggregatorError.message,
        });
        return;
      }

      if (contextBundle.discernmentOutcome === 'IGNORE') {
        console.log('[ChatRoutes] Input determined as IGNORE. No agent LLM call.');
        res.status(200).json({
          content: null,
          model: 'context_aggregator_filter',
          discernment: 'IGNORE',
          message: 'Input determined as irrelevant or noise.',
          conversationId,
          persona: storedPersona || null,
        });
        return;
      }

      if (contextBundle.discernmentOutcome === 'ACTION_ONLY') {
        console.log('[ChatRoutes] Input determined as ACTION_ONLY.');
        const actionAckContent = `Okay, I'll handle that: "${contextBundle.primaryTask.description}"`;
        await sqliteMemoryAdapter.storeConversationTurn(effectiveUserId, conversationId, {
          role: 'assistant',
          content: actionAckContent,
          timestamp: Date.now(),
          agentId: mode,
          model: 'system_action',
        });
        res.status(200).json({
          content: actionAckContent,
          model: 'system_action',
          discernment: 'ACTION_ONLY',
          conversationId,
          persona: storedPersona || null,
        });
        return;
      }
    } else {
      // This IS a tool_response turn
      // Create a minimal contextBundle or bypass it for tool responses.
      // For now, let's assume the main agent needs the tool response in its history.
      // The history for the main LLM call will include the tool_response message already stored.
      contextBundle = {
        // Create a direct-pass context bundle
        version: '1.1.0',
        aggregatedTimestamp: new Date().toISOString(),
        primaryTask: {
          description: `Process tool response for ${tool_response.tool_name}.`,
          derivedIntent: 'process_tool_result',
          keyEntities: [tool_response.tool_name],
          requiredOutputFormat: '',
        },
        relevantHistorySummary: [], // History will be fetched fresh below
        pertinentUserProfileSnippets: { preferences: {}, customInstructionsSnippet: '' },
        keyInformationFromDocuments: [],
        criticalSystemContext: {
          notesForDownstreamLLM: 'Continuing after tool execution.',
          ...(storedPersona ? { customPersona: storedPersona } : {}),
        },
        confidenceFactors: { clarityOfUserQuery: 'High', sufficiencyOfContext: 'High' }, // Assuming tool call was clear
        discernmentOutcome: 'RESPOND', // Always respond after a tool call
      };
      console.log(`[ChatRoutes] Processing tool response for tool: ${tool_response.tool_name}`);
    }

    // --- 3. Prepare and Call Main Agent LLM (for RESPOND or CLARIFY, or after tool_response) ---
    const llmConfigService = LlmConfigService.getInstance();
    const agentDefinition: AgentLLMDefinition = llmConfigService.getAgentDefinitionFromMode(
      mode,
      reqInterviewMode,
      reqTutorMode
    );

    // Check if this is a transcript analysis request with system override
    const isTranscriptAnalysis = systemPromptOverride && currentUserQuery.includes('TRANSCRIPT:');

    // Detect user's language from their query
    const detectedLanguage = detectLanguage(currentUserQuery);
    console.log(
      `[ChatRoutes] Detected language: ${detectedLanguage.name} (${detectedLanguage.code}) with confidence: ${detectedLanguage.confidence}`
    );

    // Conversation context instructions to prevent repetition
    const conversationContextInstructions = `
## CONVERSATION GUIDELINES:
1. **Focus on Current Request**: Respond directly to what the user is asking now.
2. **Use Context Wisely**: Previous messages provide context but don't re-answer old questions.
3. **Natural Flow**: Maintain conversational continuity without unnecessary repetition.
4. **Be Direct**: Answer the user's current question clearly and concisely.`;

    // Language response instructions
    const languageResponseInstructions = `
## LANGUAGE RESPONSE REQUIREMENT:
**YOU MUST RESPOND IN ${detectedLanguage.name.toUpperCase()} (${detectedLanguage.code})**
- The user's message was detected as ${detectedLanguage.name}
- ALL your responses must be in this same language
- If you cannot respond in ${detectedLanguage.name}, use the most appropriate language based on the user's input
- For code examples, comments should also be in ${detectedLanguage.name} when appropriate`;

    const personaInstructionBlock = storedPersona
      ? `
## CUSTOM PERSONA CONTEXT:
${storedPersona.trim()}`
      : '';

    // Dynamic metaprompt preset routing (optionally switches base prompt + meta add-ons).
    const allowMetapromptRouting =
      !systemPromptOverride && !isTranscriptAnalysis && !reqInterviewMode && !reqTutorMode;
    const metapromptSelection = allowMetapromptRouting
      ? metapromptPresetRouter.selectPreset({
          conversationId,
          mode,
          userMessage: currentUserQuery,
          contextBundle,
          didCompact: compactionResult?.didCompact,
        })
      : {
          presetId: 'fixed',
          label: undefined,
          basePromptKey: agentDefinition.promptTemplateKey,
          addonPromptKeys: [],
          wasReviewed: false,
          reason: 'disabled',
        };

    const metapromptAddonsBlock = metapromptSelection.addonPromptKeys
      .map((addonKey) => loadPromptTemplate(addonKey).trim())
      .filter(Boolean)
      .join('\n\n');

    const rollingSummaryBlock = compactionResult?.summary
      ? `## ROLLING MEMORY SUMMARY (compressed)\n${compactionResult.summary.trim()}`
      : '';

    // Only prepare bundle instructions if we're not doing direct transcript analysis
    const bundleUsageInstructions = !isTranscriptAnalysis
      ? `
## CONTEXT BUNDLE GUIDANCE:
The provided ContextBundle contains information to help you understand and respond to the user's request:
- \`primaryTask\`: The user's current request and intent
- \`relevantHistorySummary\`: Previous conversation for context
- \`pertinentUserProfileSnippets\`: User preferences
- \`keyInformationFromDocuments\`: Relevant knowledge
- \`discernmentOutcome\`: Response type guidance

${conversationContextInstructions}

${languageResponseInstructions}`
      : '';

    const combinedAdditionalInstructions = [
      rollingSummaryBlock.trim(),
      bundleUsageInstructions.trim(),
      personaInstructionBlock.trim(),
      metapromptAddonsBlock.trim(),
    ]
      .filter(Boolean)
      .join('\n\n');

    let systemPromptForAgentLLM: string;
    if (systemPromptOverride) {
      // For transcript analysis, use the override as-is (it has specific instructions for analyzing transcripts)
      // For other overrides, append the bundle instructions
      if (isTranscriptAnalysis) {
        const transcriptExtras = [languageResponseInstructions, personaInstructionBlock.trim()]
          .filter(Boolean)
          .join('\n\n');
        systemPromptForAgentLLM =
          systemPromptOverride + (transcriptExtras ? '\n\n' + transcriptExtras : '');
      } else {
        systemPromptForAgentLLM =
          systemPromptOverride +
          (combinedAdditionalInstructions ? '\n\n' + combinedAdditionalInstructions : '');
      }
    } else {
      const promptTemplateKeyUsed =
        metapromptSelection.basePromptKey || agentDefinition.promptTemplateKey;
      const templateContent = loadPromptTemplate(promptTemplateKeyUsed);
      // Use detected language instead of default language
      systemPromptForAgentLLM = templateContent
        .replace(/{{LANGUAGE}}/g, detectedLanguage.code)
        .replace(/{{MODE}}/g, mode)
        .replace(
          /{{GENERATE_DIAGRAM}}/g,
          (
            contextBundle.primaryTask.requiredOutputFormat?.includes('diagram') || generateDiagram
          ).toString()
        )
        .replace(
          /{{TUTOR_LEVEL}}/g,
          (contextBundle.pertinentUserProfileSnippets?.preferences as any)?.expertiseLevel ||
            tutorLevel
        )
        .replace(/{{ADDITIONAL_INSTRUCTIONS}}/g, () => combinedAdditionalInstructions);
    }

    // Fetch full conversation history for the main agent, including prior tool calls and responses
    const afterTimestampForAgentHistory =
      typeof compactionResult?.summaryUptoTimestamp === 'number'
        ? compactionResult.summaryUptoTimestamp
        : undefined;
    const fullHistoryForAgent: IStoredConversationTurn[] =
      await sqliteMemoryAdapter.retrieveConversationTurns(effectiveUserId, conversationId, {
        limit: 60,
        fetchMostRecent: true,
        afterTimestamp: afterTimestampForAgentHistory,
        beforeTimestamp: tool_response ? undefined : currentTurnEarliestTimestamp,
        preferSummariesForOlder: true,
      });
    const lastStoredTurn = fullHistoryForAgent[fullHistoryForAgent.length - 1];
    console.log('[ChatRoutes][Debug] Retrieved stored history turns:', {
      count: fullHistoryForAgent.length,
      lastRole: lastStoredTurn?.role,
      lastSnippet:
        typeof lastStoredTurn?.content === 'string'
          ? `${lastStoredTurn.content.slice(0, 120)}${lastStoredTurn.content && lastStoredTurn.content.length > 120 ? '…' : ''}`
          : null,
    });

    // Map IStoredConversationTurn to IChatMessage for the LLM
    const messagesForAgentLlm: IChatMessage[] = [
      { role: 'system', content: systemPromptForAgentLLM },
      ...fullHistoryForAgent.map((turn) => {
        const msg: IChatMessage = { role: turn.role, content: turn.content };
        if (turn.tool_calls && turn.tool_calls.length > 0) {
          msg.tool_calls = turn.tool_calls as ILlmToolCall[]; // Assuming parsing from JSON is done by adapter
        }
        if (turn.role === 'tool' && turn.tool_call_id) {
          msg.tool_call_id = turn.tool_call_id;
          msg.name = turn.metadata?.tool_name; // If tool_name was stored in metadata
        }
        return msg;
      }),
    ];

    // If the current turn was a user message (not a tool response), add the appropriate message
    // If it IS a tool_response turn, the tool_response message is already in fullHistoryForAgent
    if (!tool_response) {
      // For transcript analysis, send the raw transcript directly without context bundle wrapper
      if (isTranscriptAnalysis) {
        // Add the full user message with the transcript directly
        messagesForAgentLlm.push({
          role: 'user',
          content: currentUserQuery, // This contains the full transcript
        });
      } else {
        // Regular context bundle approach for other modes
        // Extract the current query from the context bundle
        const currentQuery = contextBundle.primaryTask?.description || currentUserQuery;

        messagesForAgentLlm.push({
          role: 'user',
          content: `USER REQUEST: "${currentQuery}"

Context Bundle:
\`\`\`json
${JSON.stringify(contextBundle, null, 2)}
\`\`\`

Please respond to the USER REQUEST above. Use the context bundle for understanding but focus on answering the current request directly.`,
        });
      }
    }

    console.log(
      `[ChatRoutes] Calling Main Agent LLM (${agentDefinition.modelId}) for mode '${mode}'. Discernment: ${contextBundle.discernmentOutcome}. Tools available: ${agentDefinition.callableTools?.length || 0}`
    );
    const latestPayloadUser = [...messagesForAgentLlm].reverse().find((msg) => msg.role === 'user');
    console.log('[ChatRoutes][Debug] Final LLM payload snapshot:', {
      totalMessages: messagesForAgentLlm.length,
      latestUserSnippet:
        typeof latestPayloadUser?.content === 'string'
          ? `${latestPayloadUser.content.slice(0, 160)}${latestPayloadUser.content && latestPayloadUser.content.length > 160 ? '…' : ''}`
          : null,
    });

    const agentLlmParams: IChatCompletionParams = {
      temperature: temperature ?? LLM_DEFAULT_TEMPERATURE, // Use frontend-provided temperature if available
      max_tokens: max_tokens ?? LLM_DEFAULT_MAX_TOKENS, // Use frontend-provided max_tokens if available
      user: effectiveUserId,
      tools: agentDefinition.callableTools, // Pass agent-specific tools
      tool_choice:
        agentDefinition.callableTools && agentDefinition.callableTools.length > 0
          ? 'auto'
          : undefined, // Let LLM decide if tools are present
    };

    const agentLlmResponse: ILlmResponse = await callLlm(
      messagesForAgentLlm,
      agentDefinition.modelId,
      agentLlmParams,
      agentDefinition.providerId,
      effectiveUserId
    );
    mainAgentLlmCallCost = calculateLlmCost(agentLlmResponse.model, agentLlmResponse.usage);

    CostService.trackCost(
      effectiveUserId,
      'llm_agent',
      mainAgentLlmCallCost,
      agentLlmResponse.model,
      agentLlmResponse.usage?.prompt_tokens ?? 0,
      'tokens',
      agentLlmResponse.usage?.completion_tokens ?? 0,
      'tokens',
      {
        conversationId,
        mode,
        agentPromptTemplate: metapromptSelection.basePromptKey || agentDefinition.promptTemplateKey,
        metapromptPresetId: metapromptSelection.presetId,
        metapromptPresetReason: metapromptSelection.reason,
        discernment: contextBundle.discernmentOutcome,
        toolCallsCount: agentLlmResponse.toolCalls?.length || 0,
      }
    );
    const sessionCostDetail = CostService.getSessionCost(effectiveUserId);

    // --- 4. Handle Agent LLM Response (Text or Tool Call) ---
    if (agentLlmResponse.toolCalls && agentLlmResponse.toolCalls.length > 0) {
      // LLM wants to call one or more tools
      console.log(
        `[ChatRoutes] Agent LLM responded with ${agentLlmResponse.toolCalls.length} tool call(s).`
      );
      // Store assistant's message that contains the tool_calls
      await sqliteMemoryAdapter.storeConversationTurn(effectiveUserId, conversationId, {
        role: 'assistant',
        content: agentLlmResponse.text, // Might be null or introductory text
        timestamp: Date.now(),
        agentId: mode,
        model: agentLlmResponse.model,
        usage: agentLlmResponse.usage ? { ...agentLlmResponse.usage } : undefined,
        tool_calls: agentLlmResponse.toolCalls, // Store the tool_calls object
        metadata: { discernment: contextBundle.discernmentOutcome },
      });

      // Send tool call information to frontend
      // For simplicity, handling one tool call at a time from the backend's perspective.
      // A more robust system might handle multiple parallel tool calls.
      const firstToolCall = agentLlmResponse.toolCalls[0];
      res.status(200).json({
        type: 'function_call_data', // New MainContentType for frontend
        toolName: firstToolCall.function.name,
        toolArguments: JSON.parse(firstToolCall.function.arguments), // Parse arguments for frontend
        toolCallId: firstToolCall.id,
        // Standard fields
        model: agentLlmResponse.model,
        usage: agentLlmResponse.usage,
        sessionCost: sessionCostDetail,
        costOfThisCall: mainAgentLlmCallCost + contextAggregatorLlmCallCost,
        conversationId,
        discernment: 'TOOL_CALL_PENDING', // Special discernment state
        assistantMessageText: agentLlmResponse.text, // Send any preliminary text from assistant
        persona: storedPersona || null,
      });
    } else {
      // LLM responded with text
      const assistantResponseContent =
        agentLlmResponse.text ||
        (contextBundle.discernmentOutcome === 'CLARIFY'
          ? 'I need a bit more information. Could you clarify your request?'
          : "Sorry, I couldn't formulate a response.");

      await sqliteMemoryAdapter.storeConversationTurn(effectiveUserId, conversationId, {
        role: 'assistant',
        content: assistantResponseContent,
        timestamp: Date.now(),
        agentId: mode,
        model: agentLlmResponse.model,
        usage: agentLlmResponse.usage ? { ...agentLlmResponse.usage } : undefined,
        metadata: { discernment: contextBundle.discernmentOutcome },
      });

      res.status(200).json({
        content: assistantResponseContent,
        model: agentLlmResponse.model,
        usage: agentLlmResponse.usage,
        sessionCost: sessionCostDetail,
        costOfThisCall: mainAgentLlmCallCost + contextAggregatorLlmCallCost,
        conversationId,
        discernment: contextBundle.discernmentOutcome,
        persona: storedPersona || null,
      });
    }
  } catch (error: any) {
    console.error(
      '[ChatRoutes] Error in /api/chat POST endpoint:',
      error.message,
      error.stack ? `\nStack: ${error.stack}` : ''
    );
    if (res.headersSent) return;

    let errorMessage = 'An unexpected error occurred processing your chat request.';
    let statusCode = 500;
    let errorCode = 'INTERNAL_CHAT_ERROR';

    if (error.message?.includes('API key')) {
      errorMessage = 'AI service API key issue.';
      statusCode = 503;
      errorCode = 'API_KEY_ERROR';
    } else if (error.status === 429 || error.response?.status === 429) {
      errorMessage = 'AI service rate limit exceeded.';
      statusCode = 429;
      errorCode = 'RATE_LIMIT_EXCEEDED';
    } else if (error.message?.includes('CONTEXT_AGGREGATION_FAILURE')) {
      errorMessage = 'Failed to process request context.';
      statusCode = 503;
      errorCode = 'CONTEXT_AGGREGATION_FAILURE';
    } else if (error.response?.status) {
      statusCode = error.response.status;
      errorMessage =
        error.response.data?.error?.message || error.response.data?.message || error.message;
      errorCode = error.response.data?.error?.code || 'PROVIDER_API_ERROR';
    } else if (error.status) {
      statusCode = error.status;
      errorMessage = error.message;
      errorCode = error.code || 'INTERNAL_ERROR_WITH_STATUS';
    }

    res.status(statusCode).json({
      message: errorMessage,
      error: errorCode,
      details:
        process.env.NODE_ENV === 'development' && error.message
          ? { originalError: error.message, stack: error.stack }
          : undefined,
    });
  }
}

/**
 * Provides hints for the 'requiredOutputFormat' field in the ContextBundle.
 */
function contextBundleOutputFormatHints(mode: string): string {
  switch (mode.toLowerCase()) {
    case 'coding':
    case 'codingassistant':
      return 'Markdown with code blocks (specify language), explanations. Optional: Mermaid for algorithms/data_structures.';
    case 'systemdesigner':
    case 'system_design':
      return 'Detailed Markdown explanations with embedded Mermaid for architecture. Use headings.';
    case 'tutor':
      return 'Structured Markdown (headings or ---SLIDE_BREAK---), examples. Optional: Mermaid for concepts. Guiding questions for chat. Can call createQuizItem or createFlashcard tools.';
    case 'diary':
      return 'Empathetic chat leading to structured Markdown diary entry (## Title, Date, Tags, Content).';
    case 'meeting':
    case 'businessmeeting':
      return 'Structured Markdown meeting summary (Overview, Key Points, Decisions, Action Items table).';
    case 'codinginterviewer':
      return 'Problem statements & feedback in structured Markdown (headings or ---SLIDE_BREAK---). Conversational Q&A. Can call generateCodingProblem or evaluateSolution tools.';
    default:
      return 'Clear, concise, well-formatted Markdown. Use lists/bullets if appropriate.';
  }
}

export async function POST_PERSONA(req: Request, res: Response): Promise<void> {
  try {
    const { agentId, conversationId, persona, userId } = req.body as {
      agentId?: string;
      conversationId?: string;
      persona?: string | null;
      userId?: string;
    };

    if (!agentId || !conversationId) {
      res.status(400).json({ message: 'agentId and conversationId are required.' });
      return;
    }

    const effectiveUserId = resolveSessionUserId(req, userId);
    const userContext = (req as any)?.user;
    const creditContext: CreditContext = {
      isAuthenticated: Boolean(userContext),
      tier: userContext?.tier,
      mode: userContext?.mode,
    };
    creditAllocationService.syncProfile(effectiveUserId, creditContext);
    const timestamp = Date.now();

    await sqliteMemoryAdapter.setConversationPersona(
      effectiveUserId,
      conversationId,
      agentId,
      typeof persona === 'string' ? persona : null,
      timestamp
    );

    const storedPersona = await sqliteMemoryAdapter.getConversationPersona(
      effectiveUserId,
      conversationId
    );

    res.status(200).json({
      persona: storedPersona || null,
      agentId,
      conversationId,
    });
  } catch (error: any) {
    console.error('[ChatRoutes] Error updating persona:', error.message, error.stack || '');
    res.status(500).json({
      message: 'Failed to update persona.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}
