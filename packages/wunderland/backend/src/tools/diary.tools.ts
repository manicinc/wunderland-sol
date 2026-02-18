/**
 * @file backend/src/core/llm/tools/diary.tools.ts
 * @description Defines tool schemas for the Interactive Diary agent ("Echo").
 * @version 1.0.0
 */

import { ILlmTool } from '../core/llm/llm.interfaces.js';
/**
 * @const SuggestDiaryMetadataSchema
 * @description JSON Schema for the `suggestDiaryMetadata` tool.
 * This tool allows the LLM to suggest a title, tags, and mood for a diary entry
 * based on the conversation leading up to it.
 */
export const SuggestDiaryMetadataSchema: ILlmTool = {
  type: 'function',
  function: {
    name: 'suggestDiaryMetadata',
    description: 'Suggests metadata (title, tags, mood) for a new diary entry based on the preceding conversation or user input. This is called before the final entry is structured by the LLM.',
    parameters: {
      type: 'object',
      properties: {
        tentativeTitle: {
          type: 'string',
          description: 'A suggested concise title for the diary entry. Should capture the main theme.',
        },
        suggestedTags: {
          type: 'array',
          description: 'An array of 2-5 relevant keyword tags for the entry (e.g., "work", "reflection", "idea", "challenge", "gratitude").',
          items: {
            type: 'string',
          },
        //   minItems: 1,
        //   maxItems: 5,
        },
        mood: {
          type: 'string',
          description: 'Optional: A single word or short phrase describing the overall mood conveyed in the entry (e.g., "Happy", "Reflective", "Frustrated", "Hopeful").',
        },
        briefSummary: {
            type: 'string',
            description: 'A very brief (1-2 sentence) summary of the core content discussed for the entry, to confirm understanding before full generation.'
        }
      },
      required: ['tentativeTitle', 'suggestedTags', 'briefSummary'],
    },
  },
};

/**
 * @const DiaryAgentTools
 * @description An array of all tool schemas available to the Diary agent.
 */
export const DiaryAgentTools: ILlmTool[] = [
  SuggestDiaryMetadataSchema,
];