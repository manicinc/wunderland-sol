// File: backend/src/core/llm/openai.llm.service.ts

/**
 * @file OpenAI LLM Service Implementation.
 * @description Provides an implementation of the ILlmService interface for interacting
 * with OpenAI's API. It uses the official OpenAI Node.js library.
 * @version 1.1.0 - Added support for tool/function calling.
 */

import OpenAI from 'openai';
import {
  IChatMessage,
  IChatCompletionParams,
  ILlmResponse,
  ILlmService,
  ILlmProviderConfig,
  ILlmUsage,
  ILlmTool,
  ILlmToolCall,
} from './llm.interfaces.js';
import { LlmProviderId } from './llm.config.service.js';

/**
 * Implements the ILlmService for the OpenAI provider.
 */
export class OpenAiLlmService implements ILlmService {
  readonly providerId = LlmProviderId.OPENAI;
  private openai: OpenAI;
  private config: ILlmProviderConfig;

  /**
   * Creates an instance of OpenAiLlmService.
   * @param {ILlmProviderConfig} config - The configuration for the OpenAI provider.
   * @throws {Error} If the API key is not provided in the configuration.
   */
  constructor(config: ILlmProviderConfig) {
    if (!config.apiKey) {
      throw new Error('OpenAI API key is required for OpenAiLlmService.');
    }
    this.config = config;
    this.openai = new OpenAI({
      apiKey: this.config.apiKey,
      baseURL: this.config.baseUrl,
    });
  }

  /**
   * Generates a chat completion using the OpenAI API.
   *
   * @param {IChatMessage[]} messages - The array of chat messages.
   * @param {string} modelId - The OpenAI model ID (e.g., "gpt-4o-mini").
   * @param {IChatCompletionParams} [params] - Optional parameters for the completion, including tools.
   * @returns {Promise<ILlmResponse>} A promise that resolves to the LLM response.
   * @throws {Error} If the API call fails.
   */
  async generateChatCompletion(
    messages: IChatMessage[],
    modelId: string,
    params?: IChatCompletionParams
  ): Promise<ILlmResponse> {
    const mappedModelId = this.mapToProviderModelId(modelId);
    try {
      const requestPayload: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming = {
        model: mappedModelId,
        messages: messages as OpenAI.Chat.ChatCompletionMessageParam[], // Cast to OpenAI's type
        temperature: params?.temperature ?? parseFloat(process.env.LLM_DEFAULT_TEMPERATURE || '0.7'),
        max_tokens: params?.max_tokens ?? parseInt(process.env.LLM_DEFAULT_MAX_TOKENS || '2048'),
        top_p: params?.top_p,
        stop: params?.stop,
        user: params?.user,
        tools: params?.tools as OpenAI.Chat.Completions.ChatCompletionTool[] | undefined, // Pass tools
        tool_choice: params?.tool_choice as OpenAI.Chat.Completions.ChatCompletionToolChoiceOption | undefined, // Pass tool_choice
      };

      // Remove undefined optional parameters to avoid API errors
      Object.keys(requestPayload).forEach(key => {
        const typedKey = key as keyof typeof requestPayload;
        if (requestPayload[typedKey] === undefined) {
          delete requestPayload[typedKey];
        }
      });
      
      console.log(`OpenAiLlmService: Calling OpenAI with model: ${mappedModelId}`);
      const response = await this.openai.chat.completions.create(requestPayload);

      const usage = response.usage
        ? {
            prompt_tokens: response.usage.prompt_tokens,
            completion_tokens: response.usage.completion_tokens,
            total_tokens: response.usage.total_tokens,
          }
        : undefined;

      const choice = response.choices[0];
      let toolCalls: ILlmToolCall[] | undefined = undefined;

      if (choice?.message?.tool_calls) {
        toolCalls = choice.message.tool_calls.map(tc => ({
          id: tc.id,
          type: tc.type,
          function: {
            name: tc.function.name,
            arguments: tc.function.arguments,
          },
        }));
      }

      return {
        text: choice?.message?.content ?? null,
        model: response.model || mappedModelId,
        usage,
        id: response.id,
        stopReason: choice?.finish_reason,
        toolCalls,
        providerResponse: response,
      };
    } catch (error: any) {
      console.error(`OpenAiLlmService: Error calling OpenAI API for model ${mappedModelId}:`, error.message);
      if (error.response?.data) {
        console.error('OpenAI API Error Details:', JSON.stringify(error.response.data, null, 2));
      }
      throw new Error(`OpenAI API request failed for model ${mappedModelId}: ${error.message}`);
    }
  }

  /**
   * Maps a generic model ID (which might include a provider prefix)
   * to an OpenAI-specific model ID.
   * @param {string} modelId - The generic model ID.
   * @returns {string} The OpenAI-specific model ID.
   */
  private mapToProviderModelId(modelId: string): string {
    if (modelId.startsWith('openai/')) {
      return modelId.replace('openai/', '');
    }
    // If no prefix, assume it's already an OpenAI model or a compatible one.
    return modelId;
  }
}