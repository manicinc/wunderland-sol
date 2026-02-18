// File: backend/src/core/conversation/conversation.interfaces.ts
/**
 * @file backend/src/core/conversation/conversation.interfaces.ts
 * @version 1.0.0
 * @description Defines interfaces and enums related to conversation message processing
 * and history management strategies. These types are primarily derived from frontend's
 * AdvancedConversationManager for backend understanding of potential data structures
 * or configurations related to conversation history.
 *
 * These types are intended for backend consumption and do not imply that the
 * backend implements the frontend's AdvancedConversationManager logic.
 */

/**
 * @interface ProcessedConversationMessageBE
 * @description Represents a conversation message that may have undergone NLP processing
 * and relevance scoring. "BE" suffix indicates Backend-consumed type.
 * This structure allows the backend to understand messages potentially enriched by
 * the frontend's AdvancedConversationManager.
 */
export interface ProcessedConversationMessageBE {
  /**
   * The role of the entity that produced the message.
   * @type {'user' | 'assistant' | 'system'}
   */
  role: 'user' | 'assistant' | 'system';

  /**
   * The textual content of the message.
   * @type {string}
   */
  content: string;

  /**
   * Optional unique identifier for the message.
   * @type {string}
   * @optional
   */
  id?: string;

  /**
   * Optional Unix timestamp (in milliseconds) when the message was created.
   * @type {number}
   * @optional
   */
  timestamp?: number;

  /**
   * Optional estimated token count for the message content.
   * @type {number}
   * @optional
   */
  estimatedTokenCount?: number;

  /**
   * Optional array of processed (e.g., stemmed, stopword-removed) tokens from the content.
   * @type {string[]}
   * @optional
   */
  processedTokens?: string[];

  /**
   * Optional relevance score, typically assigned relative to a current query.
   * @type {number}
   * @optional
   */
  relevanceScore?: number;
}

/**
 * @enum HistoryStrategyPresetBE
 * @description Enumerates presets for conversation history selection strategies.
 * This allows the backend to understand or log the strategy used by the frontend
 * if this information is passed along. "BE" suffix indicates Backend-consumed type.
 */
export enum HistoryStrategyPresetBE {
  BALANCED_HYBRID = 'balancedHybrid',
  RELEVANCE_FOCUSED = 'relevanceFocused',
  RECENT_CONVERSATION = 'recentConversation',
  MAX_CONTEXT_HYBRID = 'maxContextHybrid',
  CONCISE_RECENT = 'conciseRecent',
  SIMPLE_RECENCY = 'simpleRecency',
}

/**
 * @interface AdvancedHistoryConfigBE
 * @description Defines the configuration structure for advanced conversation history management.
 * The backend might receive or log this configuration. "BE" suffix indicates Backend-consumed type.
 */
export interface AdvancedHistoryConfigBE {
  /**
   * The active strategy preset dictating how history is selected.
   * @type {HistoryStrategyPresetBE}
   */
  strategyPreset: HistoryStrategyPresetBE;

  /**
   * The maximum number of estimated tokens allowed for the context sent to the LLM.
   * @type {number}
   */
  maxContextTokens: number;

  /**
   * The minimum relevance score a message must have to be considered "relevant"
   * in relevance-based strategies.
   * @type {number}
   * @example 0.25 (scores typically range from 0 to 1)
   */
  relevancyThreshold: number;

  /**
   * The number of most recent messages to always prioritize including in the context,
   * subject to token limits.
   * @type {number}
   */
  numRecentMessagesToPrioritize: number;

  /**
   * In hybrid/relevance strategies, the number of highly relevant older messages
   * to consider including in addition to recent messages.
   * @type {number}
   */
  numRelevantOlderMessagesToInclude: number;

  /**
   * In the SIMPLE_RECENCY strategy, this is the fixed number of messages to retrieve.
   * @type {number}
   */
  simpleRecencyMessageCount: number;

  /**
   * Whether to filter out 'system' role messages from the historical context
   * before selection (the current system prompt is usually added separately).
   * @type {boolean}
   */
  filterHistoricalSystemMessages: boolean;

  /**
   * An estimate of how many characters, on average, constitute one "token"
   * for the LLM being used. Used for rough token count estimations.
   * @type {number}
   * @example 3.8
   */
  charsPerTokenEstimate: number;
}

/**
 * @interface PrepareHistoryParamsBE
 * @description Describes parameters for a history preparation process.
 * This is included for completeness if the backend ever needed to understand
 * the inputs to such a process. "BE" suffix indicates Backend-consumed type.
 * It's unlikely the backend would directly use this to *call* the frontend manager.
 */
export interface PrepareHistoryParamsBE {
  /**
   * The complete list of all messages in the current conversation session.
   * @type {ProcessedConversationMessageBE[]}
   */
  allMessages: ProcessedConversationMessageBE[];

  /**
   * The current user query or text input that the history should be relevant to.
   * @type {string}
   */
  currentQueryText: string;

  /**
   * The main system prompt that will be sent to the LLM along with the history.
   * Used for token budgeting.
   * @type {string}
   * @optional
   */
  systemPrompt?: string;

  /**
   * Allows overriding parts of the active AdvancedHistoryConfigBE for this specific preparation.
   * @type {Partial<AdvancedHistoryConfigBE>}
   * @optional
   */
  configOverride?: Partial<AdvancedHistoryConfigBE>;
}