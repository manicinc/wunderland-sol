/**
 * @fileoverview Provider registry — metadata catalog for all supported
 * LLM / model provider extensions.
 *
 * Each entry defines the provider's metadata, default models, API base URL,
 * and secret requirements. This catalog enables OpenClaw feature parity by
 * enumerating every supported model provider in one place.
 *
 * @module @framers/agentos-extensions-registry/provider-registry
 */

import type { ExtensionInfo } from './types.js';

/**
 * Registry entry for a model provider extension.
 * Extends the base ExtensionInfo with provider-specific fields.
 */
export interface ProviderRegistryEntry extends ExtensionInfo {
  /** Unique provider identifier (e.g. 'openai', 'anthropic'). */
  providerId: string;
  /** Default model ID used for general-purpose completions. */
  defaultModel: string;
  /** Cheapest / fastest model for lightweight tasks like sentiment analysis. */
  smallModel: string;
  /** Optional default API base URL. Omitted for SDK-based providers or user-specific endpoints. */
  apiBaseUrl?: string;
}

/**
 * Full catalog of model provider extensions.
 * Ordered to match OpenClaw's models-config.providers layout.
 */
export const PROVIDER_CATALOG: ProviderRegistryEntry[] = [
  // ── Major Cloud Providers ──
  {
    packageName: '@framers/agentos-ext-provider-openai',
    name: 'provider-openai',
    category: 'integration',
    providerId: 'openai',
    displayName: 'OpenAI',
    description: 'OpenAI API — GPT-4o, GPT-4.1, o-series reasoning models.',
    requiredSecrets: ['openai.apiKey'],
    defaultPriority: 100,
    available: false,
    defaultModel: 'gpt-4o',
    smallModel: 'gpt-4o-mini',
    apiBaseUrl: 'https://api.openai.com/v1',
  },
  {
    packageName: '@framers/agentos-ext-provider-anthropic',
    name: 'provider-anthropic',
    category: 'integration',
    providerId: 'anthropic',
    displayName: 'Anthropic',
    description: 'Anthropic API — Claude Sonnet, Haiku, and Opus models.',
    requiredSecrets: ['anthropic.apiKey'],
    defaultPriority: 100,
    available: false,
    defaultModel: 'claude-sonnet-4-5-20250929',
    smallModel: 'claude-haiku-4-5-20251001',
    apiBaseUrl: 'https://api.anthropic.com',
  },
  {
    packageName: '@framers/agentos-ext-provider-ollama',
    name: 'provider-ollama',
    category: 'integration',
    providerId: 'ollama',
    displayName: 'Ollama',
    description:
      'Ollama local inference — run open-weight models (Llama, Mistral, etc.) on your own hardware.',
    requiredSecrets: [],
    defaultPriority: 90,
    available: false,
    defaultModel: 'llama3',
    smallModel: 'llama3.2:3b',
    apiBaseUrl: 'http://127.0.0.1:11434/v1',
  },
  {
    packageName: '@framers/agentos-ext-provider-bedrock',
    name: 'provider-bedrock',
    category: 'integration',
    providerId: 'bedrock',
    displayName: 'AWS Bedrock',
    description:
      'AWS Bedrock — managed access to Anthropic Claude, Meta Llama, and other foundation models via AWS SDK.',
    requiredSecrets: ['aws.accessKeyId', 'aws.secretAccessKey', 'aws.region'],
    defaultPriority: 80,
    available: false,
    defaultModel: 'anthropic.claude-sonnet',
    smallModel: 'anthropic.claude-haiku',
    // No apiBaseUrl — Bedrock uses the AWS SDK with regional endpoints.
  },
  {
    packageName: '@framers/agentos-ext-provider-gemini',
    name: 'provider-gemini',
    category: 'integration',
    providerId: 'gemini',
    displayName: 'Google Gemini',
    description: 'Google Gemini API — Gemini 2.0 Flash, Pro, and multimodal models.',
    requiredSecrets: ['gemini.apiKey'],
    defaultPriority: 90,
    available: false,
    defaultModel: 'gemini-2.0-flash',
    smallModel: 'gemini-2.0-flash-lite',
    apiBaseUrl: 'https://generativelanguage.googleapis.com',
  },

  // ── Platform-Integrated Providers ──
  {
    packageName: '@framers/agentos-ext-provider-github-copilot',
    name: 'provider-github-copilot',
    category: 'integration',
    providerId: 'github-copilot',
    displayName: 'GitHub Copilot',
    description:
      'GitHub Copilot Chat API — uses your existing Copilot subscription for model access.',
    requiredSecrets: ['github.copilotToken'],
    defaultPriority: 70,
    available: false,
    defaultModel: 'gpt-4o',
    smallModel: 'gpt-4o-mini',
    apiBaseUrl: 'https://api.githubcopilot.com',
  },
  {
    packageName: '@framers/agentos-ext-provider-cloudflare-ai',
    name: 'provider-cloudflare-ai',
    category: 'integration',
    providerId: 'cloudflare-ai',
    displayName: 'Cloudflare AI Gateway',
    description:
      'Cloudflare AI Gateway — proxy and observe requests to any upstream provider with caching and rate limiting.',
    requiredSecrets: ['cloudflare.accountId', 'cloudflare.apiToken'],
    defaultPriority: 60,
    available: false,
    defaultModel: '(configurable)',
    smallModel: '(configurable)',
    // No apiBaseUrl — user-specific Cloudflare gateway URL.
  },

  // ── Asian Market Providers ──
  {
    packageName: '@framers/agentos-ext-provider-minimax',
    name: 'provider-minimax',
    category: 'integration',
    providerId: 'minimax',
    displayName: 'Minimax',
    description: 'Minimax API — MiniMax-M2.1 and VL-01 vision-language models.',
    requiredSecrets: ['minimax.apiKey'],
    defaultPriority: 60,
    available: false,
    defaultModel: 'MiniMax-M2.1',
    smallModel: 'MiniMax-VL-01',
    apiBaseUrl: 'https://api.minimax.chat/v1',
  },
  {
    packageName: '@framers/agentos-ext-provider-qwen',
    name: 'provider-qwen',
    category: 'integration',
    providerId: 'qwen',
    displayName: 'Qwen',
    description: 'Alibaba Qwen API — Qwen-Max, Qwen-Turbo, and Qwen-VL models.',
    requiredSecrets: ['qwen.apiKey'],
    defaultPriority: 60,
    available: false,
    defaultModel: 'qwen-max',
    smallModel: 'qwen-turbo',
    apiBaseUrl: 'https://portal.qwen.ai/v1',
  },
  {
    packageName: '@framers/agentos-ext-provider-moonshot',
    name: 'provider-moonshot',
    category: 'integration',
    providerId: 'moonshot',
    displayName: 'Moonshot',
    description: 'Moonshot AI (Kimi) API — long-context models with strong multilingual support.',
    requiredSecrets: ['moonshot.apiKey'],
    defaultPriority: 60,
    available: false,
    defaultModel: 'kimi-k2.5',
    smallModel: 'kimi-k2-instant',
    apiBaseUrl: 'https://api.moonshot.ai/v1',
  },
  {
    packageName: '@framers/agentos-ext-provider-xiaomi-mimo',
    name: 'provider-xiaomi-mimo',
    category: 'integration',
    providerId: 'xiaomi-mimo',
    displayName: 'Xiaomi Mimo',
    description: 'Xiaomi Mimo API — Mimo-v2-Flash model with Anthropic-compatible endpoint.',
    requiredSecrets: ['xiaomi.apiKey'],
    defaultPriority: 50,
    available: false,
    defaultModel: 'mimo-v2-flash',
    smallModel: 'mimo-v2-flash',
    apiBaseUrl: 'https://api.xiaomimimo.com/anthropic',
  },

  // ── Aggregator / Router Providers ──
  {
    packageName: '@framers/agentos-ext-provider-venice',
    name: 'provider-venice',
    category: 'integration',
    providerId: 'venice',
    displayName: 'Venice',
    description:
      'Venice AI — privacy-focused inference with no data retention, supports open-weight models.',
    requiredSecrets: ['venice.apiKey'],
    defaultPriority: 50,
    available: false,
    defaultModel: 'venice-default',
    smallModel: 'venice-fast',
    apiBaseUrl: 'https://api.venice.ai/v1',
  },
  {
    packageName: '@framers/agentos-ext-provider-openrouter',
    name: 'provider-openrouter',
    category: 'integration',
    providerId: 'openrouter',
    displayName: 'OpenRouter',
    description:
      'OpenRouter — unified API gateway to 200+ models from multiple providers with automatic fallback.',
    requiredSecrets: ['openrouter.apiKey'],
    defaultPriority: 80,
    available: false,
    defaultModel: 'auto',
    smallModel: 'auto',
    apiBaseUrl: 'https://openrouter.ai/api/v1',
  },
];

/**
 * Get provider entries filtered by provider IDs.
 *
 * @param providerIds - Array of provider IDs to include, `'all'` for every
 *   provider, or `'none'` for an empty list. Defaults to `'all'`.
 * @returns Matching provider registry entries.
 *
 * @example
 * ```typescript
 * // Get all providers
 * const all = getProviderEntries();
 *
 * // Get specific providers
 * const subset = getProviderEntries(['openai', 'anthropic', 'ollama']);
 *
 * // Disable providers
 * const none = getProviderEntries('none');
 * ```
 */
export function getProviderEntries(
  providerIds?: string[] | 'all' | 'none'
): ProviderRegistryEntry[] {
  if (providerIds === 'none') return [];
  if (!providerIds || providerIds === 'all') return [...PROVIDER_CATALOG];
  return PROVIDER_CATALOG.filter((entry) => providerIds.includes(entry.providerId));
}

/**
 * Get a single provider entry by its provider ID.
 *
 * @param providerId - The provider identifier (e.g. 'openai', 'anthropic').
 * @returns The matching entry, or `undefined` if not found.
 *
 * @example
 * ```typescript
 * const openai = getProviderEntry('openai');
 * console.log(openai?.defaultModel); // 'gpt-4o'
 * ```
 */
export function getProviderEntry(providerId: string): ProviderRegistryEntry | undefined {
  return PROVIDER_CATALOG.find((entry) => entry.providerId === providerId);
}
