// File: backend/src/core/llm/ollama.llm.service.ts

/**
 * @file Ollama LLM Service Implementation.
 * @description Implements ILlmService for a local Ollama instance using
 * the OpenAI-compatible /v1/chat/completions endpoint.
 * @version 1.0.0
 */

import axios, { AxiosInstance } from 'axios';
import {
  IChatMessage,
  IChatCompletionParams,
  ILlmResponse,
  ILlmService,
  ILlmProviderConfig,
  ILlmToolCall,
} from './llm.interfaces.js';
import { LlmProviderId } from './llm.config.service.js';

/**
 * Implements the ILlmService for a local Ollama instance.
 * Uses Ollama's OpenAI-compatible endpoint at /v1/chat/completions.
 */
export class OllamaLlmService implements ILlmService {
  readonly providerId = LlmProviderId.OLLAMA;
  private client: AxiosInstance;
  private config: ILlmProviderConfig;

  constructor(config: ILlmProviderConfig) {
    if (!config.baseUrl) {
      throw new Error('Ollama base URL is required for OllamaLlmService.');
    }
    this.config = config;
    this.client = axios.create({
      baseURL: this.config.baseUrl,
      headers: { 'Content-Type': 'application/json' },
      timeout: 120_000, // Ollama can be slow on first load
    });
  }

  async generateChatCompletion(
    messages: IChatMessage[],
    modelId: string,
    params?: IChatCompletionParams,
  ): Promise<ILlmResponse> {
    const mappedModelId = this.mapToProviderModelId(modelId);

    const payload: Record<string, any> = {
      model: mappedModelId,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content || '',
        ...(m.tool_calls ? { tool_calls: m.tool_calls } : {}),
        ...(m.tool_call_id ? { tool_call_id: m.tool_call_id } : {}),
      })),
      temperature: params?.temperature ?? parseFloat(process.env.LLM_DEFAULT_TEMPERATURE || '0.7'),
      stream: false,
    };

    if (params?.max_tokens) payload.max_tokens = params.max_tokens;
    if (params?.top_p !== undefined) payload.top_p = params.top_p;
    if (params?.stop) payload.stop = params.stop;

    // Pass tools if model supports function calling (llama3.1+, qwen2.5+, etc.)
    if (params?.tools?.length) {
      payload.tools = params.tools;
      if (params.tool_choice) payload.tool_choice = params.tool_choice;
    }

    // Remove undefined keys
    Object.keys(payload).forEach((key) => {
      if (payload[key] === undefined) delete payload[key];
    });

    try {
      console.log(`OllamaLlmService: Calling Ollama with model: ${mappedModelId}`);
      const response = await this.client.post('/v1/chat/completions', payload);
      const data = response.data;

      const choice = data.choices?.[0];
      let toolCalls: ILlmToolCall[] | undefined;

      if (choice?.message?.tool_calls) {
        toolCalls = choice.message.tool_calls.map((tc: any) => ({
          id: tc.id || `ollama-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          type: 'function' as const,
          function: {
            name: tc.function.name,
            arguments: typeof tc.function.arguments === 'string' ? tc.function.arguments : JSON.stringify(tc.function.arguments),
          },
        }));
      }

      return {
        text: choice?.message?.content ?? null,
        model: data.model || mappedModelId,
        usage: data.usage
          ? {
              prompt_tokens: data.usage.prompt_tokens ?? null,
              completion_tokens: data.usage.completion_tokens ?? null,
              total_tokens: data.usage.total_tokens ?? null,
            }
          : undefined,
        id: data.id || `ollama-${Date.now()}`,
        stopReason: choice?.finish_reason ?? 'stop',
        toolCalls,
        providerResponse: data,
      };
    } catch (error: any) {
      // Check if Ollama is reachable
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        throw new Error(
          `Ollama is not reachable at ${this.config.baseUrl}. Ensure Ollama is running: ollama serve`,
        );
      }

      console.error(`OllamaLlmService: Error calling Ollama for model ${mappedModelId}:`, error.message);
      if (error.response?.data) {
        console.error('Ollama Error Details:', JSON.stringify(error.response.data, null, 2));
        const msg = error.response.data.error || error.message;
        throw new Error(`Ollama request failed for model ${mappedModelId}: ${msg}`);
      }
      throw new Error(`Ollama request failed for model ${mappedModelId}: ${error.message}`);
    }
  }

  private mapToProviderModelId(modelId: string): string {
    if (modelId.startsWith('ollama/')) {
      return modelId.replace('ollama/', '');
    }
    return modelId;
  }
}
