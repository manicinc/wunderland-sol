// File: backend/src/core/llm/anthropic.llm.service.ts

/**
 * @file Anthropic (Claude) LLM Service Implementation.
 * @description Implements ILlmService for the Anthropic Messages API.
 * Uses HTTP requests directly (no SDK dependency) to keep the install minimal.
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
  ILlmTool,
} from './llm.interfaces.js';
import { LlmProviderId } from './llm.config.service.js';

/**
 * Implements the ILlmService for the Anthropic Claude provider.
 */
export class AnthropicLlmService implements ILlmService {
  readonly providerId = LlmProviderId.ANTHROPIC;
  private client: AxiosInstance;
  private config: ILlmProviderConfig;

  constructor(config: ILlmProviderConfig) {
    if (!config.apiKey) {
      throw new Error('Anthropic API key is required for AnthropicLlmService.');
    }
    this.config = config;
    this.client = axios.create({
      baseURL: this.config.baseUrl || 'https://api.anthropic.com',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.apiKey,
        'anthropic-version': config.additionalHeaders?.['anthropic-version'] || '2023-06-01',
      },
    });
  }

  async generateChatCompletion(
    messages: IChatMessage[],
    modelId: string,
    params?: IChatCompletionParams,
  ): Promise<ILlmResponse> {
    const mappedModelId = this.mapToProviderModelId(modelId);

    // Anthropic requires system message to be separate from the messages array.
    let systemPrompt: string | undefined;
    const anthropicMessages: Array<{ role: 'user' | 'assistant'; content: string | any[] }> = [];

    for (const msg of messages) {
      if (msg.role === 'system') {
        systemPrompt = (systemPrompt ? systemPrompt + '\n' : '') + (msg.content || '');
        continue;
      }

      if (msg.role === 'tool' && msg.tool_call_id) {
        // Map tool results to Anthropic's format
        anthropicMessages.push({
          role: 'user',
          content: [
            {
              type: 'tool_result',
              tool_use_id: msg.tool_call_id,
              content: msg.content || '',
            },
          ],
        });
        continue;
      }

      if (msg.role === 'assistant' && msg.tool_calls?.length) {
        // Map assistant tool_calls to Anthropic's tool_use content blocks
        const content: any[] = [];
        if (msg.content) {
          content.push({ type: 'text', text: msg.content });
        }
        for (const tc of msg.tool_calls) {
          content.push({
            type: 'tool_use',
            id: tc.id,
            name: tc.function.name,
            input: JSON.parse(tc.function.arguments || '{}'),
          });
        }
        anthropicMessages.push({ role: 'assistant', content });
        continue;
      }

      const role = msg.role === 'user' ? 'user' : 'assistant';
      anthropicMessages.push({ role, content: msg.content || '' });
    }

    // Anthropic requires alternating user/assistant messages.
    // Merge consecutive same-role messages.
    const mergedMessages: typeof anthropicMessages = [];
    for (const msg of anthropicMessages) {
      const prev = mergedMessages[mergedMessages.length - 1];
      if (prev && prev.role === msg.role && typeof prev.content === 'string' && typeof msg.content === 'string') {
        prev.content = prev.content + '\n' + msg.content;
      } else {
        mergedMessages.push(msg);
      }
    }

    // Map tools to Anthropic format
    let anthropicTools: any[] | undefined;
    if (params?.tools?.length) {
      anthropicTools = params.tools.map((tool: ILlmTool) => ({
        name: tool.function.name,
        description: tool.function.description,
        input_schema: tool.function.parameters,
      }));
    }

    const payload: Record<string, any> = {
      model: mappedModelId,
      messages: mergedMessages,
      max_tokens: params?.max_tokens ?? parseInt(process.env.LLM_DEFAULT_MAX_TOKENS || '2048'),
      temperature: params?.temperature ?? parseFloat(process.env.LLM_DEFAULT_TEMPERATURE || '0.7'),
    };

    if (systemPrompt) payload.system = systemPrompt;
    if (anthropicTools?.length) payload.tools = anthropicTools;
    if (params?.top_p !== undefined) payload.top_p = params.top_p;
    if (params?.stop) payload.stop_sequences = Array.isArray(params.stop) ? params.stop : [params.stop];

    // Map tool_choice
    if (params?.tool_choice) {
      if (params.tool_choice === 'auto') {
        payload.tool_choice = { type: 'auto' };
      } else if (params.tool_choice === 'none') {
        // Omit tool_choice to let Anthropic default
      } else if (typeof params.tool_choice === 'object' && params.tool_choice.function) {
        payload.tool_choice = { type: 'tool', name: params.tool_choice.function.name };
      }
    }

    try {
      console.log(`AnthropicLlmService: Calling Anthropic with model: ${mappedModelId}`);
      const response = await this.client.post('/v1/messages', payload);
      const data = response.data;

      let text: string | null = null;
      const toolCalls: ILlmToolCall[] = [];

      for (const block of data.content || []) {
        if (block.type === 'text') {
          text = (text || '') + block.text;
        } else if (block.type === 'tool_use') {
          toolCalls.push({
            id: block.id,
            type: 'function',
            function: {
              name: block.name,
              arguments: JSON.stringify(block.input),
            },
          });
        }
      }

      return {
        text,
        model: data.model || mappedModelId,
        usage: data.usage
          ? {
              prompt_tokens: data.usage.input_tokens ?? null,
              completion_tokens: data.usage.output_tokens ?? null,
              total_tokens:
                data.usage.input_tokens != null && data.usage.output_tokens != null
                  ? data.usage.input_tokens + data.usage.output_tokens
                  : null,
            }
          : undefined,
        id: data.id,
        stopReason: data.stop_reason === 'end_turn' ? 'stop' : data.stop_reason,
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        providerResponse: data,
      };
    } catch (error: any) {
      console.error(`AnthropicLlmService: Error calling Anthropic API for model ${mappedModelId}:`, error.message);
      if (error.response?.data) {
        console.error('Anthropic API Error Details:', JSON.stringify(error.response.data, null, 2));
        const errData = error.response.data.error;
        let msg = errData?.message || error.message;
        if (error.response.status === 401) msg = `Invalid Anthropic API key. ${msg}`;
        if (error.response.status === 429) msg = `Anthropic rate limit exceeded. ${msg}`;
        throw new Error(`Anthropic API request failed for model ${mappedModelId}: ${msg}`);
      }
      throw new Error(`Anthropic API request failed for model ${mappedModelId}: ${error.message}`);
    }
  }

  private mapToProviderModelId(modelId: string): string {
    if (modelId.startsWith('anthropic/')) {
      return modelId.replace('anthropic/', '');
    }
    return modelId;
  }
}
