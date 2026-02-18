/**
 * @file contextBundle.schema.ts
 * @description JSON Schema definition for the IContextBundle interface.
 * This schema is used to instruct the LLM Context Aggregator to output data
 * in a structured format via function calling.
 * @version 1.0.0
 */

import { ILlmToolFunctionParameters } from '../llm/llm.interfaces';

export const contextBundleSchema: ILlmToolFunctionParameters = {
  type: "object",
  properties: {
    version: {
      type: "string",
      description: "Version of the context bundle schema.",
      enum: ["1.1.0"] // Current version
    },
    aggregatedTimestamp: {
      type: "string",
      description: "ISO 8601 timestamp of when the bundle was aggregated."
    },
    primaryTask: {
      type: "object",
      description: "Core details about the user's immediate goal.",
      properties: {
        description: {
          type: "string",
          description: "Concise restatement of the user's immediate goal, task, or query."
        },
        derivedIntent: {
          type: "string",
          description: "The LLM's refined understanding of the user's intent, possibly more granular than any input intent."
        },
        keyEntities: {
          type: "array",
          description: "List of key entities or terms extracted from the user's query relevant to the task.",
          items: { type: "string" }
        },
        requiredOutputFormat: {
          type: "string",
          description: "A brief hint if a specific output format for the main agent is implied or constrained by the user's query or system state (e.g., 'code_block_python', 'mermaid_diagram', 'bullet_list', 'empathetic_diary_response', 'quiz_item_json'). Empty string if not applicable."
        }
      },
      required: ["description", "derivedIntent", "keyEntities", "requiredOutputFormat"]
    },
    relevantHistorySummary: {
      type: "array",
      description: "Ultra-concise summaries of the most relevant (max 3-5) past conversation turns that provide crucial context for the current query. Chronological order (oldest first).",
      items: {
        type: "object",
        properties: {
          speaker: { type: "string", enum: ["user", "assistant"] },
          summary: { type: "string", description: "Very brief summary of the turn's content." }
        },
        required: ["speaker", "summary"]
      }
    },
    pertinentUserProfileSnippets: {
      type: "object",
      description: "Snippets from the user's profile that are directly relevant to the current query.",
      properties: {
        preferences: {
          type: "object",
          description: "Key-value pairs of user preferences relevant to the task (e.g., defaultLanguage, expertiseLevel, preferredUnitSystem). Only include if highly relevant.",
          properties: {},
          // All properties are strings, but property names are dynamic.
        },
        customInstructionsSnippet: {
          type: "string",
          description: "The single most relevant sentence or phrase from general custom instructions, if applicable to the current query. Empty string if not."
        }
      },
      required: ["preferences", "customInstructionsSnippet"]
    },
    keyInformationFromDocuments: {
      type: "array",
      description: "Highly relevant excerpts (max 2-3) from external documents (RAG) that directly address the current query.",
      items: {
        type: "object",
        properties: {
          source: { type: "string", description: "Name or identifier of the document source." },
          snippet: { type: "string", description: "The most impactful sentence or phrase." },
          relevance: { type: "number", description: "Relevance score if provided by RAG (0.0-1.0)." }
        },
        required: ["source", "snippet"]
      }
    },
    keyInformationFromSharedKnowledge: {
      type: "array",
      description: "Highly relevant excerpts (max 1-2) from the shared knowledge base that directly address the current query.",
      items: {
        type: "object",
        properties: {
          sourceId: { type: "string", description: "ID of the knowledge item." },
          knowledgeType: { type: "string", description: "Type of the knowledge item." },
          snippet: { type: "string", description: "The most impactful sentence or phrase." },
          relevance: { type: "number", description: "Relevance score if provided (0.0-1.0)." }
        },
        required: ["sourceId", "knowledgeType", "snippet"]
      }
    },
    criticalSystemContext: {
      type: "object",
      description: "Crucial system-derived context or directives for the downstream LLM.",
      properties: {
        notesForDownstreamLLM: {
          type: "string",
          description: "Absolutely critical, brief instructions or observations (max 1-2 short sentences) derived from system state or overall analysis (e.g., 'User is a beginner programmer', 'Focus on scalability aspects', 'User seems frustrated, use empathetic tone', 'Query context requires accessing financial data tool'). Empty string if no critical notes."
        }
      },
      required: ["notesForDownstreamLLM"]
    },
    confidenceFactors: {
      type: "object",
      description: "LLM's assessment of the input quality.",
      properties: {
        clarityOfUserQuery: {
          type: "string",
          enum: ["High", "Medium", "Low", "Very Low"],
          description: "Confidence in understanding the user's raw query."
        },
        sufficiencyOfContext: {
          type: "string",
          enum: ["High", "Medium", "Low", "Very Low"],
          description: "Confidence that the provided context (history, docs, etc.) is sufficient for the downstream LLM."
        }
      },
      required: ["clarityOfUserQuery", "sufficiencyOfContext"]
    },
    discernmentOutcome: {
      type: "string",
      description: "The final decision on how to proceed with the user's query based on all analyzed inputs.",
      enum: ["RESPOND", "ACTION_ONLY", "IGNORE", "CLARIFY"]
    }
  },
  required: [
    "version",
    "aggregatedTimestamp",
    "primaryTask",
    "relevantHistorySummary",
    "pertinentUserProfileSnippets",
    "keyInformationFromDocuments",
    "keyInformationFromSharedKnowledge",
    "criticalSystemContext",
    "confidenceFactors",
    "discernmentOutcome"
  ]
};