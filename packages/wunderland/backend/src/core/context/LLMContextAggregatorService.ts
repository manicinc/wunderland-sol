// File: backend/src/core/context/LLMContextAggregatorService.ts
/**
 * @file LLMContextAggregatorService.ts
 * @description Service responsible for using an LLM to aggregate various input
 * sources into a concise `IContextBundle`. This bundle is then used by downstream
 * agent LLMs to generate responses. This version uses LLM function calling
 * to ensure structured output of the context bundle.
 * @version 2.0.0 - Integrated function calling for IContextBundle generation.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { callLlm, initializeLlmServices } from '../llm/llm.factory.js';
import { IChatMessage, ILlmTool, ILlmToolCall, ILlmResponse } from '../llm/llm.interfaces.js';
import { IContextAggregatorService, IContextAggregatorInputSources, IContextBundle } from './IContextAggregatorService.js';
import { MODEL_PREFERENCES } from '../../../config/models.config.js';
import { LlmConfigService, LlmProviderId } from '../llm/llm.config.service.js';
import { contextBundleSchema } from './contextBundle.schema.js'; // Import the schema

const __filename = fileURLToPath(import.meta.url);
const __projectRoot = path.resolve(path.dirname(__filename), '../../../../'); // Adjust if structure differs

class LLMContextAggregatorServiceImpl implements IContextAggregatorService {
  private systemPrompt: string = '';
  private readonly CONTEXT_BUNDLE_FUNCTION_NAME = "createContextBundle";

  constructor() {
    this.loadSystemPrompt()
      .then(() => console.log('[LLMContextAggregatorService] Initialized and system prompt loaded.'))
      .catch(err => console.error('[LLMContextAggregatorService] CRITICAL: Failed to load system prompt on init:', err));
    // Ensure LLM services are initialized, as this service depends on callLlm
    initializeLlmServices().catch(err => console.error('[LLMContextAggregatorService] Error during dependent LLM service initialization:', err));
  }

  private async loadSystemPrompt(): Promise<void> {
    const promptPath = path.join(__projectRoot, 'prompts', 'context_aggregator_v1.md');
    try {
      this.systemPrompt = await fs.promises.readFile(promptPath, 'utf-8');
    } catch (error) {
      console.error(`[LLMContextAggregatorService] Failed to load system prompt from ${promptPath}:`, error);
      this.systemPrompt = `You are a highly efficient AI context aggregator. Your sole task is to analyze the provided input sources and synthesize a concise, structured "Context Bundle" JSON object. This bundle must contain only the most relevant information required by a downstream LLM to effectively perform its assigned task. You MUST use the "createContextBundle" function to return your analysis. Do NOT output any other text.`;
    }
  }

  /**
   * Generates an IContextBundle by processing input sources with an LLM.
   * The LLM is instructed to use a function call to produce the structured bundle.
   *
   * @param {IContextAggregatorInputSources} sources - The various input sources to aggregate.
   * @returns {Promise<IContextBundle>} The aggregated context bundle.
   * @throws {Error} If the LLM call fails or the output is not a valid context bundle.
   */
  async generateContextBundle(sources: IContextAggregatorInputSources): Promise<IContextBundle> {
    if (!this.systemPrompt) {
      await this.loadSystemPrompt(); // Ensure prompt is loaded if somehow missed
      if (!this.systemPrompt) { // Still not loaded
        throw new Error("[LLMContextAggregatorService] System prompt for context aggregator is not available.");
      }
    }

    const userQueryContent = `Analyze the following input sources and generate the Context Bundle using the 'createContextBundle' function:\n\`\`\`json\n${JSON.stringify({ userInputSources: sources }, null, 2)}\n\`\`\``;

    const messages: IChatMessage[] = [
      { role: 'system', content: this.systemPrompt },
      { role: 'user', content: userQueryContent },
    ];

    const aggregatorTool: ILlmTool = {
      type: 'function',
      function: {
        name: this.CONTEXT_BUNDLE_FUNCTION_NAME,
        description: 'Creates the structured Context Bundle from the analyzed input sources.',
        parameters: contextBundleSchema,
      },
    };

    const llmConfigService = LlmConfigService.getInstance();
    // Use utility model or a specific model defined for context aggregation
    const aggregatorModelId = MODEL_PREFERENCES.utility || 'openai/gpt-4o-mini'; 
    let providerIdFromModel: LlmProviderId | undefined;

    if (aggregatorModelId.includes('/')) {
        const parts = aggregatorModelId.split('/');
        const potentialProvider = parts[0] as LlmProviderId;
        if (Object.values(LlmProviderId).includes(potentialProvider) && llmConfigService.isProviderAvailable(potentialProvider)) {
            providerIdFromModel = potentialProvider;
        }
    }
    
    const providerIdToUse = providerIdFromModel || llmConfigService.getDefaultProviderAndModel().providerId;

    console.log(`[LLMContextAggregatorService] Calling aggregator LLM (${aggregatorModelId} via ${providerIdToUse}) with tool ${this.CONTEXT_BUNDLE_FUNCTION_NAME}.`);

    try {
      const response: ILlmResponse = await callLlm(
        messages,
        aggregatorModelId,
        {
          temperature: 0.1, // Low temperature for deterministic structured output
          max_tokens: 2048, // Allow enough tokens for the JSON bundle
          tools: [aggregatorTool],
          tool_choice: { type: "function", function: { name: this.CONTEXT_BUNDLE_FUNCTION_NAME } },
        },
        providerIdToUse, // Explicitly pass the provider ID
        sources.currentUserFocus?.metadata?.userId || 'context_aggregator_user'
      );

      if (response.toolCalls && response.toolCalls.length > 0) {
        const toolCall = response.toolCalls[0];
        if (toolCall.function.name === this.CONTEXT_BUNDLE_FUNCTION_NAME) {
          try {
            const parsedArguments = JSON.parse(toolCall.function.arguments);
            // Add/override timestamp and version just in case LLM omits or gets them wrong
            const bundle: IContextBundle = {
                ...parsedArguments,
                version: contextBundleSchema.properties.version.enum![0], // Enforce current version
                aggregatedTimestamp: new Date().toISOString(),
            };
            // Basic validation (can be expanded with a schema validator like AJV)
            if (!bundle.primaryTask || !bundle.discernmentOutcome) {
                throw new Error("Invalid context bundle structure: missing primaryTask or discernmentOutcome.");
            }
            console.log(`[LLMContextAggregatorService] Context Bundle successfully generated via function call. Discernment: ${bundle.discernmentOutcome}`);
            return bundle;
          } catch (e: any) {
            console.error('[LLMContextAggregatorService] Error parsing ContextBundle from LLM function arguments:', e.message, `Raw arguments: ${toolCall.function.arguments}`);
            throw new Error(`LLMContextAggregatorService: Failed to parse context bundle from LLM: ${e.message}`);
          }
        } else {
          throw new Error(`LLMContextAggregatorService: LLM called an unexpected tool: ${toolCall.function.name}`);
        }
      } else if (response.text) {
        // Fallback attempt: LLM might have ignored function calling and returned JSON in text
        console.warn('[LLMContextAggregatorService] LLM did not use function calling as instructed. Attempting to parse text response as JSON bundle.');
        try {
            const bundle = JSON.parse(response.text) as IContextBundle;
             if (!bundle.primaryTask || !bundle.discernmentOutcome) {
                throw new Error("Invalid context bundle structure in text response.");
            }
            console.log(`[LLMContextAggregatorService] Context Bundle successfully parsed from text response. Discernment: ${bundle.discernmentOutcome}`);
            return bundle;
        } catch (e) {
            console.error('[LLMContextAggregatorService] Failed to parse text response as ContextBundle JSON. Text response:', response.text.substring(0,500) + "...");
             throw new Error('LLMContextAggregatorService: LLM response was not a valid context bundle function call or parseable JSON text.');
        }
      } else {
        throw new Error('LLMContextAggregatorService: LLM response contained no text and no tool calls for context bundle generation.');
      }
    } catch (error: any) {
      console.error('[LLMContextAggregatorService] Error calling LLM for context aggregation:', error);
      throw new Error(`LLMContextAggregatorService: LLM call failed - ${error.message}`);
    }
  }
}

export const llmContextAggregatorService = new LLMContextAggregatorServiceImpl();