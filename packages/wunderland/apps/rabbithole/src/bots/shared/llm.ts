/**
 * @file llm.ts
 * @description Thin wrapper around OpenAI SDK for bot LLM calls.
 * Replaces the backend callLlm() factory with a direct OpenAI-compatible call.
 * Uses OPENAI_API_KEY (or OPENROUTER_API_KEY with base URL override).
 */

import OpenAI from 'openai';
import { BotLogger } from './logger';

const logger = new BotLogger('LLM');

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LlmResponse {
  text: string | null;
  model: string;
}

let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (client) return client;

  const openAiKey = process.env.OPENAI_API_KEY;
  const openRouterKey = process.env.OPENROUTER_API_KEY;

  if (openAiKey) {
    client = new OpenAI({ apiKey: openAiKey });
    logger.log('Using OpenAI provider.');
  } else if (openRouterKey) {
    client = new OpenAI({
      apiKey: openRouterKey,
      baseURL: 'https://openrouter.ai/api/v1',
    });
    logger.log('Using OpenRouter provider.');
  } else {
    logger.warn('No OPENAI_API_KEY or OPENROUTER_API_KEY set. LLM calls will fail.');
    client = new OpenAI({ apiKey: 'missing' });
  }

  return client;
}

function getDefaultModel(): string {
  if (process.env.LLM_MODEL) return process.env.LLM_MODEL;
  // OpenRouter models use provider/model format
  if (!process.env.OPENAI_API_KEY && process.env.OPENROUTER_API_KEY) {
    return 'openai/gpt-4o-mini';
  }
  return 'gpt-4o-mini';
}

export async function callLlm(
  messages: ChatMessage[],
  options?: { temperature?: number; max_tokens?: number },
): Promise<LlmResponse> {
  const model = getDefaultModel();

  const response = await getClient().chat.completions.create({
    model,
    messages,
    temperature: options?.temperature ?? 0.5,
    max_tokens: options?.max_tokens ?? 1024,
  });

  const choice = response.choices[0];
  return {
    text: choice?.message?.content ?? null,
    model: response.model,
  };
}
