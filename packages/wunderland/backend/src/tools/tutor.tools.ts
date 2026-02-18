/**
 * @file backend/src/core/llm/tools/tutor.tools.ts
 * @description Defines tool schemas for the Interactive Tutor agent ("Professor Astra").
 * These schemas describe the functions the Tutor LLM can request to be called.
 * @version 1.0.0
 */

import { ILlmTool } from "../core/llm/llm.interfaces";

/**
 * @const CreateQuizItemSchema
 * @description JSON Schema for the `createQuizItem` tool.
 * This tool allows the LLM to generate a multiple-choice quiz item.
 */
export const CreateQuizItemSchema: ILlmTool = {
  type: 'function',
  function: {
    name: 'createQuizItem',
    description: 'Generates a single multiple-choice quiz item, including the question, options, the correct answer index, and an optional explanation for the answer.',
    parameters: {
      type: 'object',
      properties: {
        question: {
          type: 'string',
          description: 'The quiz question text.',
        },
        options: {
          type: 'array',
          description: 'An array of strings representing the choices for the quiz item. Typically 2 to 5 options.',
          items: {
            type: 'string',
          },
        //   minItems: 2,
        },
        correctAnswerIndex: {
          type: 'integer',
          description: 'The 0-based index of the correct answer in the `options` array.',
        },
        explanation: {
          type: 'string',
          description: 'An optional brief explanation for why the correct answer is right, or why other options are wrong.',
        },
        topic: {
            type: 'string',
            description: 'The general topic or subject of the quiz item (e.g., "JavaScript Basics", "Photosynthesis").',
        }
      },
      required: ['question', 'options', 'correctAnswerIndex', 'topic'],
    },
  },
};

/**
 * @const CreateFlashcardSchema
 * @description JSON Schema for the `createFlashcard` tool.
 * This tool allows the LLM to generate content for a two-sided flashcard.
 */
export const CreateFlashcardSchema: ILlmTool = {
  type: 'function',
  function: {
    name: 'createFlashcard',
    description: 'Generates content for a two-sided flashcard, including front content (e.g., a term or question) and back content (e.g., a definition or answer).',
    parameters: {
      type: 'object',
      properties: {
        frontContent: {
          type: 'string',
          description: 'The content for the front of the flashcard (e.g., a term, concept, or question).',
        },
        backContent: {
          type: 'string',
          description: 'The content for the back of the flashcard (e.g., the definition, answer, or explanation).',
        },
        topic: {
          type: 'string',
          description: 'The general topic or subject of the flashcard (e.g., "Calculus Formulas", "Historical Figures").',
        },
        difficulty: {
            type: 'string',
            description: 'Optional difficulty level for the flashcard (e.g., "Easy", "Medium", "Hard").',
            enum: ['Easy', 'Medium', 'Hard']
        }
      },
      required: ['frontContent', 'backContent', 'topic'],
    },
  },
};

/**
 * @const TutorAgentTools
 * @description An array of all tool schemas available to the Tutor agent.
 * This would be referenced by the LlmConfigService.
 */
export const TutorAgentTools: ILlmTool[] = [
  CreateQuizItemSchema,
  CreateFlashcardSchema,
];