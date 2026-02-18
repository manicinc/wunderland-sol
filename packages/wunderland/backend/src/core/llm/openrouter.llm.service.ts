// File: backend/src/core/llm/openrouter.llm.service.ts

/**
 * @file OpenRouter LLM Service Implementation.
 * @description Provides an implementation of the ILlmService interface for interacting
 * with the OpenRouter API, which acts as a gateway to various LLM providers.
 * @version 1.1.0 - Added support for tool/function calling (passed through).
 */

import axios, { AxiosInstance } from 'axios';
import {
  IChatMessage,
  IChatCompletionParams,
  ILlmResponse,
  ILlmService,
  ILlmProviderConfig,
  ILlmUsage,
  ILlmTool,
  ILlmToolCall
} from './llm.interfaces.js';
import { LlmProviderId } from './llm.config.service.js';

/**
 * Implements the ILlmService for the OpenRouter provider.
 * OpenRouter often passes through OpenAI-compatible parameters, including tool_calls.
 */
export class OpenRouterLlmService implements ILlmService {
  readonly providerId = LlmProviderId.OPENROUTER;
  private apiClient: AxiosInstance;
  private config: ILlmProviderConfig;

  /**
   * Creates an instance of OpenRouterLlmService.
   * @param {ILlmProviderConfig} config - The configuration for the OpenRouter provider.
   * @throws {Error} If the API key or base URL is not provided.
   */
  constructor(config: ILlmProviderConfig) {
    if (!config.apiKey) {
      throw new Error('OpenRouter API key is required for OpenRouterLlmService.');
    }
    if (!config.baseUrl) {
      throw new Error('OpenRouter base URL is required for OpenRouterLlmService.');
    }
    this.config = config;
    this.apiClient = axios.create({
      baseURL: this.config.baseUrl,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
        ...(this.config.additionalHeaders || {}),
      },
    });
  }

  /**
   * Generates a chat completion using the OpenRouter API.
   *
   * @param {IChatMessage[]} messages - The array of chat messages.
   * @param {string} modelId - The OpenRouter model ID (e.g., "openai/gpt-4o-mini", "anthropic/claude-3-haiku").
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
      const payload: Record<string, any> = { // Use Record<string, any> for flexibility with OpenRouter
        model: mappedModelId,
        messages,
        temperature: params?.temperature ?? parseFloat(process.env.LLM_DEFAULT_TEMPERATURE || '0.7'),
        max_tokens: params?.max_tokens ?? parseInt(process.env.LLM_DEFAULT_MAX_TOKENS || '2048'),
        top_p: params?.top_p,
        stop: params?.stop,
        user: params?.user,
        stream: params?.stream ?? false, // OpenRouter supports stream, though we default to non-streamed here
        // Pass tool parameters if present (OpenRouter passes these to compatible models like OpenAI's)
        tools: params?.tools,
        tool_choice: params?.tool_choice,
      };
      
      // Remove undefined optional parameters
      Object.keys(payload).forEach(key => {
        if (payload[key] === undefined) {
          delete payload[key];
        }
      });

      console.log(`OpenRouterLlmService: Calling OpenRouter with model: ${mappedModelId}`);
      const response = await this.apiClient.post('/chat/completions', payload);

      const responseData = response.data;
      const usage = responseData.usage
        ? {
            prompt_tokens: responseData.usage.prompt_tokens,
            completion_tokens: responseData.usage.completion_tokens,
            total_tokens: responseData.usage.total_tokens,
          }
        : undefined;

      const choice = responseData.choices[0];
      let toolCalls: ILlmToolCall[] | undefined = undefined;

      // OpenRouter passes through OpenAI's tool_calls structure
      if (choice?.message?.tool_calls) {
        toolCalls = choice.message.tool_calls.map((tc: any) => ({ // Use 'any' for tc if OpenRouter's exact type is unknown
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
        model: responseData.model || mappedModelId,
        usage,
        id: responseData.id,
        stopReason: choice?.finish_reason,
        toolCalls,
        providerResponse: responseData,
      };
    } catch (error: any) {
      console.error(`OpenRouterLlmService: Error calling OpenRouter API for model ${mappedModelId}:`, error.message);
      if (error.response?.data) {
        console.error('OpenRouter API Error Details:', JSON.stringify(error.response.data, null, 2));
          const errorData = error.response.data.error;
        let specificMessage = errorData?.message || error.message;
        if (error.response.status === 401) specificMessage = `Invalid OpenRouter API key. ${specificMessage}`;
        if (error.response.status === 402) specificMessage = `OpenRouter Insufficient Funds. ${specificMessage}`;
        throw new Error(`OpenRouter API request failed for model ${mappedModelId}: ${specificMessage}`);
      }
      throw new Error(`OpenRouter API request failed for model ${mappedModelId}: ${error.message}`);
    }
  }

  /**
   * Maps a generic model ID to an OpenRouter-compatible model ID.
   * Ensures provider prefix if not present (e.g., "gpt-4o-mini" -> "openai/gpt-4o-mini").
   * @param {string} modelId - The generic model ID.
   * @returns {string} The OpenRouter-compatible model ID.
   */
  private mapToProviderModelId(modelId: string): string {
    if (!modelId.includes('/')) {
      console.warn(`OpenRouterLlmService: Model ID "${modelId}" does not have a provider prefix. Assuming "openai/${modelId}".`);
      return `openai/${modelId}`;
    }
    return modelId;
  }
}