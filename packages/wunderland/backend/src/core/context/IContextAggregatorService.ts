// File: backend/src/core/context/IContextAggregatorService.ts
/**
 * @file IContextAggregatorService.ts
 * @version 1.0.0
 * @description Interface for a service that analyzes various input sources
 * and synthesizes a concise, structured "Context Bundle" object. This bundle
 * is intended to provide the most relevant information for a downstream LLM.
 */

/**
 * Represents the structure of the input sources provided to the context aggregator.
 */
export interface IContextAggregatorInputSources {
  /**
   * Information about the current user's focus and query. (REQUIRED)
   */
  currentUserFocus: {
    /** The current query, task, or utterance from the end-user. */
    query: string;
    /** Pre-analyzed intent of the user's query (e.g., "coding_question"). Optional. */
    intent?: string;
    /** Current application mode (e.g., "coding", "diary"). Optional. */
    mode?: string;
    /** Other relevant metadata about the immediate user focus. Optional. */
    metadata?: Record<string, any>;
  };

  /**
   * Recent turns in the conversation. Optional.
   * Objects should ideally conform to `{ role: "user" | "assistant", content: string }`.
   */
  conversationHistory?: Array<{ role: string; content: string; [key: string]: any }>;

  /**
   * User-specific profile information. Optional.
   */
  userProfile?: {
    /** User-defined settings (e.g., `defaultLanguage`, `expertiseLevel`). */
    preferences?: Record<string, any>;
    /** User-provided general instructions for the AI. */
    customInstructions?: string;
    /** Summaries or keywords from previous distinct sessions or tasks. */
    pastInteractionsSummary?: string[];
    [key: string]: any; // Allow other profile fields
  };

  /**
   * Snippets of relevant documents, potentially from a RAG system. Optional.
   * Each object should contain `sourceName` (string) and `contentChunk` (string).
   */
  retrievedDocuments?: Array<{ sourceName: string; contentChunk: string; [key: string]: any }>;

  /**
   * Information about the current system state. Optional.
   */
  systemState?: {
    /** Brief description of the broader task the user is engaged in. */
    currentTaskContext?: string;
    /** Tools or capabilities currently available to the downstream LLM. */
    activeTools?: string[];
    /** Specific constraints for the downstream LLM's response. */
    responseConstraints?: string;
    /** Shared knowledge relevant to the current query, retrieved from KnowledgeBase */
    sharedKnowledgeSnippets?: Array<{ id: string; type: string; content: string; relevance?: number }>;
    [key: string]: any; // Allow other system state fields
  };
}

/**
 * Represents the structured "Context Bundle" output by the aggregator.
 * This is the JSON object structure the LLM implementing this service should return.
 */
export interface IContextBundle {
  version: string;
  aggregatedTimestamp: string; // ISO_DATETIME_STRING
  primaryTask: {
    description: string;
    derivedIntent: string;
    keyEntities: string[];
    requiredOutputFormat: string;
  };
  relevantHistorySummary: Array<{ speaker: 'user' | 'assistant' | 'system'; summary: string }>;
  pertinentUserProfileSnippets: {
    preferences?: Record<string, any>;
    customInstructionsSnippet?: string;
  };
  keyInformationFromDocuments: Array<{ source: string; snippet: string }>;
  criticalSystemContext: {
    notesForDownstreamLLM: string;
    customPersona?: string;
    [key: string]: any;
  };
  confidenceFactors: {
    clarityOfUserQuery: 'High' | 'Medium' | 'Low';
    sufficiencyOfContext: 'High' | 'Medium' | 'Low';
  };
  /**
   * Indicates if the agent should even attempt to respond, or if an action is more appropriate, or if input is noise.
   * 'RESPOND': Standard LLM textual/content response.
   * 'ACTION_ONLY': An action should be taken, no textual response needed (or minimal ack).
   * 'IGNORE': Input is likely noise or irrelevant, no response or action needed.
   * 'CLARIFY': The user's query is too ambiguous, LLM should ask for clarification.
   */
  discernmentOutcome: 'RESPOND' | 'ACTION_ONLY' | 'IGNORE' | 'CLARIFY';
}


/**
 * @interface IContextAggregatorService
 * @description Defines the contract for services that produce a Context Bundle.
 */
export interface IContextAggregatorService {
  /**
   * Analyzes the provided input sources and generates a concise Context Bundle.
   * @async
   * @param {IContextAggregatorInputSources} sources - The various input sources to analyze.
   * @param {string} [customAggregatorPrompt] - Optional custom prompt to override the default
   * aggregator prompt, allowing for dynamic adjustments to the aggregation logic.
   * @returns {Promise<IContextBundle>} A promise that resolves to the synthesized Context Bundle.
   * @throws {Error} If the aggregation process fails or the LLM returns an invalid/unparsable response.
   */
  generateContextBundle(
    sources: IContextAggregatorInputSources,
    customAggregatorPrompt?: string
  ): Promise<IContextBundle>;
}