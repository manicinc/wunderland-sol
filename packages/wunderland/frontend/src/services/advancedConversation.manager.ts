// File: frontend/src/services/AdvancedConversationManager.ts
/**
 * @file AdvancedConversationManager.ts
 * @version 2.6.1
 * @description
 * Manages conversation history for LLMs using NLP-driven relevance scoring and selectable strategies.
 * Uses 'string-similarity' for Dice Coefficient and the 'stemmer' package for Porter Stemming.
 *
 * Core Responsibilities:
 * 1. Define and manage configurations for history selection.
 * 2. Preprocess messages for NLP analysis (custom stopword filtering, stemming).
 * 3. Score historical messages for relevance using Dice Coefficient.
 * 4. Employ various strategies to select an optimal set of messages.
 * 5. Ensure selected history adheres to token limits.
 * 6. Provide a clean API for preparing history and managing settings.
 */

import { watch, type Ref } from 'vue';
import { useStorage } from '@vueuse/core';
import { compareTwoStrings as diceCoefficient } from 'string-similarity'; // For Dice Coefficient
import { stemmer } from 'stemmer'; // Using the new 'stemmer' package

// Import raw text content from stopwords.txt
// Ensure Vite is configured for .txt?raw imports (usually default for Vite 2+)
// and you have a custom.d.ts file declaring the '*.txt' module.
import stopwordsListRaw from './stopwords.txt?raw';

/**
 * Parses raw stopwords text into a lowercase array.
 * @param {string} rawText - The raw text content of the stopwords file.
 * @returns {string[]} An array of lowercase stopwords.
 */
const parseStopwords = (rawText: string): string[] => {
  return rawText
    .split(/\r?\n/) // Split by new line
    .map(word => word.trim().toLowerCase()) // Trim whitespace and convert to lowercase
    .filter(word => word.length > 0); // Remove empty lines
};

/**
 * A list of common English stopwords, loaded from an external file and processed.
 * @type {string[]}
 */
const COMMON_ENGLISH_STOPWORDS: string[] = parseStopwords(stopwordsListRaw);
if (COMMON_ENGLISH_STOPWORDS.length < 50) { // Basic sanity check
  console.warn(
    "AdvancedConversationManager: Stopwords list appears very short or empty after loading. Check stopwords.txt and its import.",
    COMMON_ENGLISH_STOPWORDS.slice(0, 10)
  );
}

// #region CORE INTERFACES, ENUMS, AND TYPES
/**
 * @interface ProcessedConversationMessage
 * @description Represents a message after NLP preprocessing for relevance scoring.
 */
export interface ProcessedConversationMessage {
  /** Role of the message sender ('user', 'assistant', or 'system'). */
  role: 'user' | 'assistant' | 'system';
  /** The original textual content of the message. */
  content: string;
  /** Optional unique identifier for the message. */
  id?: string;
  /** Optional Unix timestamp (milliseconds) of message creation. */
  timestamp?: number;
  /** Estimated token count of the message content. */
  estimatedTokenCount?: number;
  /** Array of processed (lowercase, stemmed, stopword-filtered) tokens from the content. */
  processedTokens?: string[];
  /** Relevance score (0-1) of this message compared to a query. */
  relevanceScore?: number;
}

/**
 * @enum HistoryStrategyPreset
 * @description Defines presets for different history selection strategies.
 */
export enum HistoryStrategyPreset {
  BALANCED_HYBRID = 'balancedHybrid',
  RELEVANCE_FOCUSED = 'relevanceFocused',
  RECENT_CONVERSATION = 'recentConversation',
  MAX_CONTEXT_HYBRID = 'maxContextHybrid',
  CONCISE_RECENT = 'conciseRecent',
  SIMPLE_RECENCY = 'simpleRecency',
}

/**
 * @interface AdvancedHistoryConfig
 * @description Configuration options for the advanced history selection mechanism.
 */
export interface AdvancedHistoryConfig {
  /** The active history selection strategy preset. */
  strategyPreset: HistoryStrategyPreset;
  /** Target maximum token count for the context sent to the LLM. */
  maxContextTokens: number;
  /** Minimum relevance score (0-1) for a message to be considered relevant. */
  relevancyThreshold: number;
  /** Number of most recent messages to prioritize including. */
  numRecentMessagesToPrioritize: number;
  /** Maximum number of older, highly relevant messages to include. */
  numRelevantOlderMessagesToInclude: number;
  /** Number of recent messages to take for the SIMPLE_RECENCY strategy. */
  simpleRecencyMessageCount: number;
  /** Whether to filter out historical system messages from the context. */
  filterHistoricalSystemMessages: boolean;
  /** Estimated average number of characters per LLM token. */
  charsPerTokenEstimate: number;
}

/**
 * Default configuration for the AdvancedConversationManager.
 * @type {Readonly<AdvancedHistoryConfig>}
 */
export const DEFAULT_ADVANCED_HISTORY_CONFIG: Readonly<AdvancedHistoryConfig> = {
  strategyPreset: HistoryStrategyPreset.BALANCED_HYBRID,
  maxContextTokens: 3000, // Reduced from 4000 for faster processing and less repetition
  relevancyThreshold: 0.35, // Increased from 0.25 for better filtering
  numRecentMessagesToPrioritize: 6, // Reduced from 10 - last 3 exchanges only
  numRelevantOlderMessagesToInclude: 3, // Reduced from 5 - less old context
  simpleRecencyMessageCount: 12, // Reduced from 20 to match new default
  filterHistoricalSystemMessages: true,
  charsPerTokenEstimate: 3.8,
};

/**
 * @interface PrepareHistoryParams
 * @description Parameters for the `prepareHistoryForApi` method.
 */
export interface PrepareHistoryParams {
  /** All messages in the current session for the active agent. */
  allMessages: ProcessedConversationMessage[];
  /** The current user query text, used for relevance scoring. */
  currentQueryText: string;
  /** The system prompt text, used for initial token count estimation. */
  systemPrompt?: string;
  /** Optional override for parts of the advanced history configuration for this specific call. */
  configOverride?: Partial<AdvancedHistoryConfig>;
}
// #endregion

// #region NLP UTILITIES & RELEVANCE SCORER
/**
 * @interface IRelevanceScorer
 * @description Defines the contract for a relevance scoring service.
 */
interface IRelevanceScorer {
  /**
   * Preprocesses messages by tokenizing, stemming, and filtering stopwords.
   * Populates the `processedTokens` field of each message.
   * @param {ProcessedConversationMessage[]} messages - Array of messages to preprocess.
   * @returns {Promise<void>}
   */
  preprocessMessages(messages: ProcessedConversationMessage[]): Promise<void>;
  /**
   * Scores messages against a query text using Dice Coefficient.
   * Populates the `relevanceScore` field of each message.
   * @param {string} queryText - The query text to score against.
   * @param {ProcessedConversationMessage[]} messagesToScore - Array of preprocessed messages.
   * @returns {Promise<ProcessedConversationMessage[]>} The array of messages with scores.
   */
  scoreMessages(queryText: string, messagesToScore: ProcessedConversationMessage[]): Promise<ProcessedConversationMessage[]>;
}

/**
 * @class RelevanceScorer
 * @description Implements IRelevanceScorer using 'string-similarity' (Dice Coefficient) and 'stemmer' (Porter).
 */
class RelevanceScorer implements IRelevanceScorer {
  private tokenizerRegex: RegExp = /[^\w\s']+/g; // Removes punctuation but keeps apostrophes and word characters

  constructor() {
    console.info("RelevanceScorer: Initialized. Similarity: Dice Coefficient (string-similarity), Stemmer: Porter (stemmer package). Custom stopwords active.");
  }

  /**
   * Tokenizes text to lowercase words, removes specified punctuation, and filters stopwords.
   * @private
   * @param {string} text - The input text.
   * @returns {string[]} Array of processed (filtered, non-stemmed) tokens.
   */
  private tokenizeAndFilter(text: string): string[] {
    if (!text || typeof text !== 'string') return [];
    const tokens = text
      .toLowerCase()
      .replace(this.tokenizerRegex, " ") // Replace punctuation with space to handle word breaks
      .replace(/\s+/g, " ") // Normalize multiple spaces to single
      .trim()
      .split(/\s+/);

    return tokens.filter(token => token.length > 1 && !COMMON_ENGLISH_STOPWORDS.includes(token));
  }

  /**
   * Stems an array of tokens using the 'stemmer' package (Porter algorithm).
   * @private
   * @param {string[]} tokens - Array of tokens to stem.
   * @returns {string[]} Array of stemmed tokens.
   */
  private stemTokens(tokens: string[]): string[] {
    return tokens.map(token => stemmer(token)); // Use the imported stemmer function
  }

  /**
   * Fully processes text: tokenizes, filters stopwords, and stems.
   * @private
   * @param {string} text - Input text.
   * @returns {string[]} Array of processed (lowercase, stemmed, stopword-filtered) tokens.
   */
  private getProcessedTokens(text: string): string[] {
    const filteredTokens = this.tokenizeAndFilter(text);
    return this.stemTokens(filteredTokens);
  }

  public async preprocessMessages(messages: ProcessedConversationMessage[]): Promise<void> {
    for (const message of messages) {
      if (message.content && (!message.processedTokens || message.processedTokens.length === 0)) {
        message.processedTokens = this.getProcessedTokens(message.content);
      }
      if (typeof message.relevanceScore === 'undefined') {
        message.relevanceScore = 0; // Initialize score
      }
    }
  }

  public async scoreMessages(queryText: string, messagesToScore: ProcessedConversationMessage[]): Promise<ProcessedConversationMessage[]> {
    const queryProcessedTokens = this.getProcessedTokens(queryText);

    if (queryProcessedTokens.length === 0) {
      for (const message of messagesToScore) { message.relevanceScore = 0; }
      return messagesToScore;
    }

    const queryStringForComparison = queryProcessedTokens.join(' ');

    for (const message of messagesToScore) {
      // Ensure messages being scored are also preprocessed if not already
      if (message.content && (!message.processedTokens || message.processedTokens.length === 0)) {
        message.processedTokens = this.getProcessedTokens(message.content);
      }

      if (message.processedTokens && message.processedTokens.length > 0) {
        const messageStringForComparison = message.processedTokens.join(' ');
        message.relevanceScore = diceCoefficient(queryStringForComparison, messageStringForComparison);
      } else {
        message.relevanceScore = 0;
      }
    }
    return messagesToScore;
  }
}

/**
 * Estimates token count roughly based on character length.
 * @param {string} text - The text to estimate tokens for.
 * @param {number} charsPerToken - Average characters per token.
 * @returns {number} Estimated token count.
 */
function estimateTokensRoughly(text: string, charsPerToken: number): number {
  if (!text || typeof text !== 'string') return 0;
  // Ensure charsPerToken is a positive number to avoid division by zero or negative results
  const safeCharsPerToken = Math.max(1, charsPerToken);
  return Math.ceil(text.length / safeCharsPerToken);
}
// #endregion

// #region HISTORY SELECTION STRATEGIES
// (BaseHistoryStrategy, SimpleRecencyStrategy, RecencyStrategy, RelevanceStrategy, HybridStrategy remain structurally the same)
// They rely on the IRelevanceScorer interface, so the change of implementation within RelevanceScorer is encapsulated.

interface IHistorySelectionStrategy {
  selectMessages(params: {
    allMessages: ProcessedConversationMessage[];
    config: AdvancedHistoryConfig;
    currentQueryText: string; // Made non-optional as most strategies benefit or require it
    relevanceScorer: IRelevanceScorer; // Made non-optional
    systemPromptForTokenCount?: string;
  }): Promise<ProcessedConversationMessage[]>;
}

abstract class BaseHistoryStrategy implements IHistorySelectionStrategy {
  public abstract selectMessages(params: {
    allMessages: ProcessedConversationMessage[];
    config: AdvancedHistoryConfig;
    currentQueryText: string;
    relevanceScorer: IRelevanceScorer;
    systemPromptForTokenCount?: string;
  }): Promise<ProcessedConversationMessage[]>;

  protected filterSystemMessages(
    messages: ProcessedConversationMessage[],
    config: AdvancedHistoryConfig
  ): ProcessedConversationMessage[] {
    if (config.filterHistoricalSystemMessages) {
      return messages.filter(msg => msg.role !== 'system');
    }
    return messages;
  }

  protected truncateToTokenLimit(
    selectedMessages: ProcessedConversationMessage[],
    config: AdvancedHistoryConfig,
    systemPromptForTokenCount?: string
  ): ProcessedConversationMessage[] {
    let currentTokens = systemPromptForTokenCount ? estimateTokensRoughly(systemPromptForTokenCount, config.charsPerTokenEstimate) : 0;
    const result: ProcessedConversationMessage[] = [];

    // Iterate from newest to oldest to prioritize recent messages during truncation
    for (let i = selectedMessages.length - 1; i >= 0; i--) {
      const message = selectedMessages[i];
      const messageTokens = message.estimatedTokenCount || estimateTokensRoughly(message.content, config.charsPerTokenEstimate);
      if (currentTokens + messageTokens <= config.maxContextTokens) {
        result.unshift(message); // Add to the beginning to maintain chronological order
        currentTokens += messageTokens;
      } else {
        // console.warn(`[HistoryTruncation] Token limit reached. Max: ${config.maxContextTokens}, Current: ${currentTokens}, Message Skipped (tokens: ${messageTokens}): "${message.content.substring(0,30)}..."`);
        break; // Stop if adding next message exceeds limit
      }
    }
    return result; // `result` is now chronologically ordered
  }
}

class SimpleRecencyStrategy extends BaseHistoryStrategy {
  async selectMessages(params: {
    allMessages: ProcessedConversationMessage[];
    config: AdvancedHistoryConfig;
    currentQueryText: string; // Added for consistency, though not used by this simple strategy
    relevanceScorer: IRelevanceScorer; // Added for consistency
    systemPromptForTokenCount?: string;
  }): Promise<ProcessedConversationMessage[]> {
    const { allMessages, config, systemPromptForTokenCount } = params;
    const nonSystemMessages = this.filterSystemMessages(allMessages, config);
    const numMessagesToTake = Math.max(0, config.simpleRecencyMessageCount);
    let selected = nonSystemMessages.slice(-numMessagesToTake); // Takes the last N messages
    selected = this.truncateToTokenLimit(selected, config, systemPromptForTokenCount);
    return selected;
  }
}

class RecencyStrategy extends BaseHistoryStrategy {
  async selectMessages(params: {
    allMessages: ProcessedConversationMessage[];
    config: AdvancedHistoryConfig;
    currentQueryText: string;
    relevanceScorer: IRelevanceScorer;
    systemPromptForTokenCount?: string;
  }): Promise<ProcessedConversationMessage[]> {
    const { allMessages, config, systemPromptForTokenCount } = params;
    const nonSystemMessages = this.filterSystemMessages(allMessages, config);
    const numMessagesToTake = Math.max(0, config.numRecentMessagesToPrioritize);
    let selected = nonSystemMessages.slice(-numMessagesToTake);
    selected = this.truncateToTokenLimit(selected, config, systemPromptForTokenCount);
    return selected;
  }
}

class RelevanceStrategy extends BaseHistoryStrategy {
  async selectMessages(params: {
    allMessages: ProcessedConversationMessage[];
    config: AdvancedHistoryConfig;
    currentQueryText: string;
    relevanceScorer: IRelevanceScorer;
    systemPromptForTokenCount?: string;
  }): Promise<ProcessedConversationMessage[]> {
    const { allMessages, config, currentQueryText, relevanceScorer, systemPromptForTokenCount } = params;

    let historicalMessages = this.filterSystemMessages(allMessages, config);
    // Preprocessing (token estimation) is done by the manager before calling strategy.
    // Relevance scorer specific preprocessing (tokenizing, stemming) is done by scorer.
    // await relevanceScorer.preprocessMessages(historicalMessages); // Already done by manager if needed
    historicalMessages = await relevanceScorer.scoreMessages(currentQueryText, historicalMessages);

    const relevantMessages = historicalMessages
      .filter(msg => (msg.relevanceScore ?? 0) >= config.relevancyThreshold)
      .sort((a, b) => (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0) || (b.timestamp ?? 0) - (a.timestamp ?? 0));

    // Combine recent and relevant, then truncate by tokens
    const numTotalToConsider = Math.max(0, config.numRecentMessagesToPrioritize + config.numRelevantOlderMessagesToInclude);
    let selected = relevantMessages.slice(0, numTotalToConsider);
    selected.sort((a,b) => (a.timestamp ?? 0) - (b.timestamp ?? 0)); // Restore chronological order
    selected = this.truncateToTokenLimit(selected, config, systemPromptForTokenCount);
    return selected;
  }
}

class HybridStrategy extends BaseHistoryStrategy {
  async selectMessages(params: {
    allMessages: ProcessedConversationMessage[];
    config: AdvancedHistoryConfig;
    currentQueryText: string;
    relevanceScorer: IRelevanceScorer;
    systemPromptForTokenCount?: string;
  }): Promise<ProcessedConversationMessage[]> {
    const { allMessages, config, currentQueryText, relevanceScorer, systemPromptForTokenCount } = params;

    const historicalMessages = this.filterSystemMessages(allMessages, config);
    if (historicalMessages.length === 0) return [];

    // Messages are already preprocessed (token estimation, and NLP processing by scorer if needed)
    // by the manager before calling strategy. We just need to score them here.
    const scoredMessages = await relevanceScorer.scoreMessages(currentQueryText, [...historicalMessages]); // Score a copy

    const numRecent = Math.max(0, config.numRecentMessagesToPrioritize);
    // Take recent messages directly from the original chronological list (before re-sorting by score)
    const recentMessages = scoredMessages.slice(-numRecent);

    const olderMessages = scoredMessages.slice(0, -numRecent);
    const relevantOlderMessages = olderMessages
      .filter(msg => (msg.relevanceScore ?? 0) >= config.relevancyThreshold)
      .sort((a, b) => (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0)) // Sort older by relevance
      .slice(0, Math.max(0, config.numRelevantOlderMessagesToInclude));

    const combinedMessagesMap = new Map<string, ProcessedConversationMessage>();
    // Add relevant older first, then recent ones. Map ensures uniqueness by ID or composite key.
    // If a recent message was also highly relevant among older, its latest version (from recentMessages) will be preferred.
    [...relevantOlderMessages, ...recentMessages].forEach(msg => {
        const key = msg.id || `${msg.role}-${msg.timestamp}-${msg.content.substring(0,20)}`;
        combinedMessagesMap.set(key, msg); // Add or overwrite with the latest instance (recent ones come last)
    });

    let uniqueCombined = Array.from(combinedMessagesMap.values());
    uniqueCombined.sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0)); // Restore chronological order

    const selected = this.truncateToTokenLimit(uniqueCombined, config, systemPromptForTokenCount);
    return selected;
  }
}
// #endregion

// #region ADVANCED CONVERSATION MANAGER
/**
 * @class AdvancedConversationManager
 * @description Manages advanced conversation history selection with configurable strategies and NLP.
 */
export class AdvancedConversationManager {
  public readonly config: Ref<AdvancedHistoryConfig>;
  private relevanceScorer: IRelevanceScorer;

  constructor(
    initialConfigOverride?: Partial<AdvancedHistoryConfig>,
    customRelevanceScorer?: IRelevanceScorer
  ) {
    const storageKey = 'vcaAdvancedHistoryConfig_v2.6.1'; // Updated version for new NLP stack
    let fullyFormedInitialConfig = { ...DEFAULT_ADVANCED_HISTORY_CONFIG, ...initialConfigOverride };
    const storedConfigStr = typeof window !== 'undefined' ? localStorage.getItem(storageKey) : null;

    if (storedConfigStr) {
        try {
            const parsedStoredConfig = JSON.parse(storedConfigStr) as Partial<AdvancedHistoryConfig>;
            // Ensure all keys from default are present, overriding with stored values
            fullyFormedInitialConfig = { ...DEFAULT_ADVANCED_HISTORY_CONFIG, ...parsedStoredConfig, ...initialConfigOverride };
        } catch (e) {
            console.error(`AdvancedConversationManager: Error parsing stored config from key '${storageKey}'. Using defaults. Error:`, e);
            // Fallback to defaults merged with programmatic override
            fullyFormedInitialConfig = { ...DEFAULT_ADVANCED_HISTORY_CONFIG, ...initialConfigOverride };
        }
    }

    this.config = useStorage<AdvancedHistoryConfig>(
      storageKey,
      fullyFormedInitialConfig,
      typeof window !== 'undefined' ? localStorage : undefined,
      { mergeDefaults: true } // Merges defaults with stored values, good for adding new settings later
    );

    this.relevanceScorer = customRelevanceScorer || new RelevanceScorer();

    watch(
      this.config,
      (newConfig) => {
        console.log('AdvancedConversationManager: History config updated', JSON.parse(JSON.stringify(newConfig)));
      },
      { deep: true }
    );
    console.log('AdvancedConversationManager: Initialized with config:', JSON.parse(JSON.stringify(this.config.value)));
  }

  public updateConfig(configUpdate: Partial<AdvancedHistoryConfig>): void {
    this.config.value = { ...this.config.value, ...configUpdate };
  }

  public setHistoryStrategyPreset(preset: HistoryStrategyPreset): void {
    let newConfigPartial: Partial<AdvancedHistoryConfig> = { ...DEFAULT_ADVANCED_HISTORY_CONFIG, strategyPreset: preset };
    // Apply preset-specific values if they differ from DEFAULT_ADVANCED_HISTORY_CONFIG
    switch (preset) {
      case HistoryStrategyPreset.RELEVANCE_FOCUSED:
        newConfigPartial.relevancyThreshold = 0.35;
        newConfigPartial.numRecentMessagesToPrioritize = 4;
        newConfigPartial.numRelevantOlderMessagesToInclude = 10;
        break;
      case HistoryStrategyPreset.RECENT_CONVERSATION:
        newConfigPartial.relevancyThreshold = 0.15; // Slightly higher than default for pure recency
        newConfigPartial.numRecentMessagesToPrioritize = 20;
        newConfigPartial.numRelevantOlderMessagesToInclude = 0;
        break;
      case HistoryStrategyPreset.MAX_CONTEXT_HYBRID:
        newConfigPartial.maxContextTokens = 7500; // Example for larger context model
        newConfigPartial.relevancyThreshold = 0.20;
        newConfigPartial.numRecentMessagesToPrioritize = 12;
        newConfigPartial.numRelevantOlderMessagesToInclude = 8;
        break;
      case HistoryStrategyPreset.CONCISE_RECENT:
        newConfigPartial.maxContextTokens = 1500;
        newConfigPartial.numRecentMessagesToPrioritize = 6;
        newConfigPartial.numRelevantOlderMessagesToInclude = 0;
        break;
      case HistoryStrategyPreset.SIMPLE_RECENCY:
        // Uses simpleRecencyMessageCount from current config or default
        newConfigPartial.simpleRecencyMessageCount = this.config.value.simpleRecencyMessageCount || DEFAULT_ADVANCED_HISTORY_CONFIG.simpleRecencyMessageCount;
        break;
      case HistoryStrategyPreset.BALANCED_HYBRID:
      default:
        // Uses values from DEFAULT_ADVANCED_HISTORY_CONFIG for this preset
        newConfigPartial = { ...DEFAULT_ADVANCED_HISTORY_CONFIG, strategyPreset: HistoryStrategyPreset.BALANCED_HYBRID };
        break;
    }
    this.updateConfig(newConfigPartial);
  }

  private getActiveStrategy(effectiveConfig: AdvancedHistoryConfig): IHistorySelectionStrategy {
    const preset = effectiveConfig.strategyPreset;
    switch (preset) {
      case HistoryStrategyPreset.RELEVANCE_FOCUSED: return new RelevanceStrategy();
      case HistoryStrategyPreset.RECENT_CONVERSATION:
      case HistoryStrategyPreset.CONCISE_RECENT: return new RecencyStrategy();
      case HistoryStrategyPreset.SIMPLE_RECENCY: return new SimpleRecencyStrategy();
      case HistoryStrategyPreset.BALANCED_HYBRID:
      case HistoryStrategyPreset.MAX_CONTEXT_HYBRID:
      default: return new HybridStrategy();
    }
  }

  private async ensureMessagesAreProcessed(messages: ProcessedConversationMessage[], effectiveConfig: AdvancedHistoryConfig): Promise<void> {
    for (const message of messages) {
      if (typeof message.estimatedTokenCount !== 'number' || isNaN(message.estimatedTokenCount)) {
        message.estimatedTokenCount = estimateTokensRoughly(message.content, effectiveConfig.charsPerTokenEstimate);
      }
    }
    // Preprocess for relevance scoring (tokenizing, stemming, etc.)
    // This is now done by the RelevanceScorer instance itself.
    await this.relevanceScorer.preprocessMessages(messages);
  }

  public async prepareHistoryForApi(
    allSessionMessages: ProcessedConversationMessage[],
    currentQueryText: string,
    systemPromptText?: string,
    configOverride?: Partial<AdvancedHistoryConfig>
  ): Promise<ProcessedConversationMessage[]> {
    const effectiveConfig: AdvancedHistoryConfig = { ...this.config.value, ...(configOverride || {}) };
    // Deep clone to avoid mutating original store messages, especially their processedTokens/scores
    const workingMessages: ProcessedConversationMessage[] = JSON.parse(JSON.stringify(allSessionMessages));

    // This will populate/update `processedTokens` and initialize `relevanceScore`
    await this.ensureMessagesAreProcessed(workingMessages, effectiveConfig);

    const activeStrategy = this.getActiveStrategy(effectiveConfig);

    const selectedContextMessages = await activeStrategy.selectMessages({
      allMessages: workingMessages,
      config: effectiveConfig,
      currentQueryText: currentQueryText,
      relevanceScorer: this.relevanceScorer,
      systemPromptForTokenCount: systemPromptText,
    });

    console.log(`AdvancedConversationManager: Selected ${selectedContextMessages.length} messages for LLM context using preset '${effectiveConfig.strategyPreset}'. Total tokens estimated around ${selectedContextMessages.reduce((sum, msg) => sum + (msg.estimatedTokenCount || 0), 0)} (excluding system prompt).`);
    return selectedContextMessages;
  }

  public getHistoryConfig(): Readonly<AdvancedHistoryConfig> {
    return JSON.parse(JSON.stringify(this.config.value));
  }

  public getAvailablePresets(): HistoryStrategyPreset[] {
    return Object.values(HistoryStrategyPreset);
  }

  public clearHistory(actualClearanceCallback?: () => void): void {
    console.log('AdvancedConversationManager: clearHistory() called.');
    if (actualClearanceCallback && typeof actualClearanceCallback === 'function') {
      actualClearanceCallback();
      console.log('AdvancedConversationManager: actualClearanceCallback executed.');
    } else {
      console.warn('AdvancedConversationManager: No actualClearanceCallback provided.');
    }
  }

  public getDefaultConfig(): Readonly<AdvancedHistoryConfig> {
    return JSON.parse(JSON.stringify(DEFAULT_ADVANCED_HISTORY_CONFIG));
  }
}
// #endregion

/** Singleton instance of the AdvancedConversationManager. */
export const advancedConversationManager = new AdvancedConversationManager();