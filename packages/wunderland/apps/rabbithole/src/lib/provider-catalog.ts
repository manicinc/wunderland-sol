/**
 * Simplified LLM provider catalog for the agent builder UI.
 * Derived from packages/agentos-extensions-registry/src/provider-registry.ts
 */

export interface ProviderCatalogEntry {
  id: string;
  displayName: string;
  description: string;
  category: 'major' | 'cloud' | 'platform' | 'asian' | 'aggregator';
  defaultModel: string;
  smallModel: string;
  requiresKey: boolean;
}

export const PROVIDER_CATALOG: ProviderCatalogEntry[] = [
  // Major
  {
    id: 'openai',
    displayName: 'OpenAI',
    description: 'GPT-4o, GPT-4.1, o-series reasoning models',
    category: 'major',
    defaultModel: 'gpt-4o',
    smallModel: 'gpt-4o-mini',
    requiresKey: true,
  },
  {
    id: 'anthropic',
    displayName: 'Anthropic',
    description: 'Claude Sonnet, Haiku, and Opus models',
    category: 'major',
    defaultModel: 'claude-sonnet-4-5-20250929',
    smallModel: 'claude-haiku-4-5-20251001',
    requiresKey: true,
  },
  {
    id: 'ollama',
    displayName: 'Ollama (Local)',
    description: 'Local inference — Llama, Mistral, etc. on your hardware',
    category: 'major',
    defaultModel: 'llama3',
    smallModel: 'llama3.2:3b',
    requiresKey: false,
  },
  // Cloud
  {
    id: 'bedrock',
    displayName: 'AWS Bedrock',
    description: 'Managed access to Claude, Llama via AWS SDK',
    category: 'cloud',
    defaultModel: 'anthropic.claude-sonnet',
    smallModel: 'anthropic.claude-haiku',
    requiresKey: true,
  },
  {
    id: 'gemini',
    displayName: 'Google Gemini',
    description: 'Gemini 2.0 Flash, Pro, and multimodal models',
    category: 'cloud',
    defaultModel: 'gemini-2.0-flash',
    smallModel: 'gemini-2.0-flash-lite',
    requiresKey: true,
  },
  // Platform
  {
    id: 'github-copilot',
    displayName: 'GitHub Copilot',
    description: 'Uses your existing Copilot subscription',
    category: 'platform',
    defaultModel: 'gpt-4o',
    smallModel: 'gpt-4o-mini',
    requiresKey: true,
  },
  {
    id: 'cloudflare-ai',
    displayName: 'Cloudflare AI',
    description: 'Proxy to any provider with caching + rate limiting',
    category: 'platform',
    defaultModel: '(configurable)',
    smallModel: '(configurable)',
    requiresKey: true,
  },
  // Aggregator
  {
    id: 'openrouter',
    displayName: 'OpenRouter',
    description: '200+ models, automatic fallback across providers',
    category: 'aggregator',
    defaultModel: 'auto',
    smallModel: 'auto',
    requiresKey: true,
  },
  {
    id: 'venice',
    displayName: 'Venice',
    description: 'Privacy-focused inference, no data retention',
    category: 'aggregator',
    defaultModel: 'venice-default',
    smallModel: 'venice-fast',
    requiresKey: true,
  },
  // Asian
  {
    id: 'minimax',
    displayName: 'Minimax',
    description: 'MiniMax-M2.1 and VL-01 vision-language models',
    category: 'asian',
    defaultModel: 'MiniMax-M2.1',
    smallModel: 'MiniMax-VL-01',
    requiresKey: true,
  },
  {
    id: 'qwen',
    displayName: 'Qwen',
    description: 'Alibaba Qwen-Max, Qwen-Turbo, Qwen-VL',
    category: 'asian',
    defaultModel: 'qwen-max',
    smallModel: 'qwen-turbo',
    requiresKey: true,
  },
  {
    id: 'moonshot',
    displayName: 'Moonshot (Kimi)',
    description: 'Long-context models with strong multilingual support',
    category: 'asian',
    defaultModel: 'kimi-k2.5',
    smallModel: 'kimi-k2-instant',
    requiresKey: true,
  },
  {
    id: 'xiaomi-mimo',
    displayName: 'Xiaomi Mimo',
    description: 'Mimo-v2-Flash with Anthropic-compatible endpoint',
    category: 'asian',
    defaultModel: 'mimo-v2-flash',
    smallModel: 'mimo-v2-flash',
    requiresKey: true,
  },
];
