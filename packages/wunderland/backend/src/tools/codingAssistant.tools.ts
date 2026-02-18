/**
 * @file backend/src/core/llm/tools/codingAssistant.tools.ts
 * @description Defines tool schemas for the Coding Assistant agent ("CodePilot").
 * These schemas describe the functions the Coding Assistant LLM can request to be called.
 * @version 1.0.0
 */

import { ILlmTool } from "../core/llm/llm.interfaces";
/**
 * @const GenerateCodeSnippetSchema
 * @description JSON Schema for the `generateCodeSnippet` tool.
 * This tool allows the LLM to request generation of a code snippet based on a description.
 */
export const GenerateCodeSnippetSchema: ILlmTool = {
  type: 'function',
  function: {
    name: 'generateCodeSnippet',
    description: 'Generates a code snippet in a specified language based on a natural language description and optional requirements.',
    parameters: {
      type: 'object',
      properties: {
        language: {
          type: 'string',
          description: 'The programming language for the code snippet (e.g., "python", "javascript", "java").',
        },
        description: {
          type: 'string',
          description: 'A detailed natural language description of what the code snippet should do.',
        },
        requirements: {
          type: 'array',
          description: 'Optional list of specific requirements or constraints for the code snippet (e.g., "must be recursive", "avoid using external libraries").',
          items: {
            type: 'string',
          },
        },
        expectedInput: {
            type: 'string',
            description: 'Optional: Example or description of the expected input for the snippet.'
        },
        expectedOutput: {
            type: 'string',
            description: 'Optional: Example or description of the expected output from the snippet.'
        }
      },
      required: ['language', 'description'],
    },
  },
};

/**
 * @const ExplainCodeSegmentSchema
 * @description JSON Schema for the `explainCodeSegment` tool.
 * This tool allows the LLM to request an explanation for a given piece of code.
 */
export const ExplainCodeSegmentSchema: ILlmTool = {
  type: 'function',
  function: {
    name: 'explainCodeSegment',
    description: 'Provides a detailed explanation of a given code segment, including its purpose, logic, and potential improvements or complexities.',
    parameters: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          description: 'The actual code segment to be explained.',
        },
        language: {
          type: 'string',
          description: 'The programming language of the code segment.',
        },
        focusArea: {
          type: 'string',
          description: 'Optional: A specific area or aspect of the code to focus the explanation on (e.g., "time complexity", "a particular function call", "error handling strategy").',
        },
        explanationDepth: {
            type: 'string',
            description: 'Optional: Desired depth of explanation (e.g., "high-level overview", "detailed line-by-line", "beginner-friendly").',
            enum: ["high-level overview", "detailed line-by-line", "beginner-friendly", "expert-concise"]
        }
      },
      required: ['code', 'language'],
    },
  },
};

/**
 * @const DebugCodeErrorSchema
 * @description JSON Schema for the `debugCodeError` tool.
 * This tool allows the LLM to request help in debugging code based on an error message.
 */
export const DebugCodeErrorSchema: ILlmTool = {
    type: 'function',
    function: {
        name: 'debugCodeError',
        description: 'Analyzes provided code and an error message/log to identify the cause of the error and suggest potential fixes or debugging steps.',
        parameters: {
            type: 'object',
            properties: {
                code: {
                    type: 'string',
                    description: 'The source code that produced the error.'
                },
                errorLog: {
                    type: 'string',
                    description: 'The full error message, stack trace, or log output.'
                },
                language: {
                    type: 'string',
                    description: 'The programming language of the code.'
                },
                contextDescription: {
                    type: 'string',
                    description: 'Optional: Brief description of what the code is trying to achieve or the context in which the error occurred.'
                }
            },
            required: ['code', 'errorLog', 'language']
        }
    }
};

/**
 * @const CodingAssistantAgentTools
 * @description An array of all tool schemas available to the Coding Assistant agent.
 * This would be referenced by the LlmConfigService.
 */
export const CodingAssistantAgentTools: ILlmTool[] = [
  GenerateCodeSnippetSchema,
  ExplainCodeSegmentSchema,
  DebugCodeErrorSchema,
];

// To make these usable in LlmConfigService, ensure CodingAssistantAgentTools is exported and then imported in LlmConfigService.
// In LlmConfigService, inside `loadAgentToolDefinitions()`:
// import { CodingAssistantAgentTools } from './tools/codingAssistant.tools';
// this.agentToolDefinitions.set('coding', CodingAssistantAgentTools);