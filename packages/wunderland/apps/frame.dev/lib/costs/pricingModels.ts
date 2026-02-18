/**
 * LLM Pricing Configuration
 * @module lib/costs/pricingModels
 *
 * Centralized pricing for all LLM providers.
 * Prices are per 1M tokens unless otherwise noted.
 *
 * All data is stored locally - nothing is sent to external servers.
 *
 * @note Pricing updated as of December 2024. Update regularly.
 */

// ============================================================================
// TYPES
// ============================================================================

export interface TokenPricing {
  /** USD per 1M input tokens */
  input: number
  /** USD per 1M output tokens */
  output: number
  /** USD per 1M cached input tokens (Anthropic/OpenAI) */
  cached?: number
}

export interface ImagePricing {
  [size: string]: {
    standard: number
    hd?: number
  }
}

export interface ModelPricing {
  type: 'token' | 'image' | 'free'
  pricing?: TokenPricing
  imagePricing?: ImagePricing
  lastUpdated: string
}

export type LLMProviderName = 'anthropic' | 'openai' | 'openrouter' | 'mistral' | 'ollama'

// ============================================================================
// ANTHROPIC CLAUDE PRICING (as of Dec 2024)
// https://www.anthropic.com/pricing
// ============================================================================

export const ANTHROPIC_PRICING: Record<string, ModelPricing> = {
  // Claude 3.5 Opus (latest)
  'claude-opus-4-5-20251101': {
    type: 'token',
    pricing: { input: 15.00, output: 75.00, cached: 1.875 },
    lastUpdated: '2024-12-01',
  },
  // Claude 3.5 Sonnet
  'claude-sonnet-4-20250514': {
    type: 'token',
    pricing: { input: 3.00, output: 15.00, cached: 0.30 },
    lastUpdated: '2024-12-01',
  },
  'claude-3-5-sonnet-20241022': {
    type: 'token',
    pricing: { input: 3.00, output: 15.00, cached: 0.30 },
    lastUpdated: '2024-12-01',
  },
  'claude-3-5-sonnet-latest': {
    type: 'token',
    pricing: { input: 3.00, output: 15.00, cached: 0.30 },
    lastUpdated: '2024-12-01',
  },
  // Claude 3.5 Haiku
  'claude-3-5-haiku-20241022': {
    type: 'token',
    pricing: { input: 0.80, output: 4.00, cached: 0.08 },
    lastUpdated: '2024-12-01',
  },
  'claude-3-5-haiku-latest': {
    type: 'token',
    pricing: { input: 0.80, output: 4.00, cached: 0.08 },
    lastUpdated: '2024-12-01',
  },
  // Claude 3 (legacy)
  'claude-3-opus-20240229': {
    type: 'token',
    pricing: { input: 15.00, output: 75.00, cached: 1.875 },
    lastUpdated: '2024-12-01',
  },
  'claude-3-sonnet-20240229': {
    type: 'token',
    pricing: { input: 3.00, output: 15.00 },
    lastUpdated: '2024-12-01',
  },
  'claude-3-haiku-20240307': {
    type: 'token',
    pricing: { input: 0.25, output: 1.25 },
    lastUpdated: '2024-12-01',
  },
}

// ============================================================================
// OPENAI PRICING (as of Dec 2024)
// https://openai.com/pricing
// ============================================================================

export const OPENAI_PRICING: Record<string, ModelPricing> = {
  // GPT-4o
  'gpt-4o': {
    type: 'token',
    pricing: { input: 2.50, output: 10.00, cached: 1.25 },
    lastUpdated: '2024-12-01',
  },
  'gpt-4o-2024-11-20': {
    type: 'token',
    pricing: { input: 2.50, output: 10.00, cached: 1.25 },
    lastUpdated: '2024-12-01',
  },
  'gpt-4o-mini': {
    type: 'token',
    pricing: { input: 0.15, output: 0.60, cached: 0.075 },
    lastUpdated: '2024-12-01',
  },
  'gpt-4o-mini-2024-07-18': {
    type: 'token',
    pricing: { input: 0.15, output: 0.60, cached: 0.075 },
    lastUpdated: '2024-12-01',
  },
  // GPT-4 Turbo
  'gpt-4-turbo': {
    type: 'token',
    pricing: { input: 10.00, output: 30.00 },
    lastUpdated: '2024-12-01',
  },
  'gpt-4-turbo-preview': {
    type: 'token',
    pricing: { input: 10.00, output: 30.00 },
    lastUpdated: '2024-12-01',
  },
  // o1 reasoning models
  'o1': {
    type: 'token',
    pricing: { input: 15.00, output: 60.00, cached: 7.50 },
    lastUpdated: '2024-12-01',
  },
  'o1-preview': {
    type: 'token',
    pricing: { input: 15.00, output: 60.00, cached: 7.50 },
    lastUpdated: '2024-12-01',
  },
  'o1-mini': {
    type: 'token',
    pricing: { input: 3.00, output: 12.00, cached: 1.50 },
    lastUpdated: '2024-12-01',
  },
  // DALL-E 3
  'dall-e-3': {
    type: 'image',
    imagePricing: {
      '1024x1024': { standard: 0.04, hd: 0.08 },
      '1792x1024': { standard: 0.08, hd: 0.12 },
      '1024x1792': { standard: 0.08, hd: 0.12 },
    },
    lastUpdated: '2024-12-01',
  },
  // DALL-E 2
  'dall-e-2': {
    type: 'image',
    imagePricing: {
      '1024x1024': { standard: 0.02 },
      '512x512': { standard: 0.018 },
      '256x256': { standard: 0.016 },
    },
    lastUpdated: '2024-12-01',
  },
  // Embeddings
  'text-embedding-3-small': {
    type: 'token',
    pricing: { input: 0.02, output: 0 },
    lastUpdated: '2024-12-01',
  },
  'text-embedding-3-large': {
    type: 'token',
    pricing: { input: 0.13, output: 0 },
    lastUpdated: '2024-12-01',
  },
}

// ============================================================================
// MISTRAL PRICING (as of Dec 2024)
// https://mistral.ai/technology/#pricing
// ============================================================================

export const MISTRAL_PRICING: Record<string, ModelPricing> = {
  'mistral-large-latest': {
    type: 'token',
    pricing: { input: 2.00, output: 6.00 },
    lastUpdated: '2024-12-01',
  },
  'mistral-large-2411': {
    type: 'token',
    pricing: { input: 2.00, output: 6.00 },
    lastUpdated: '2024-12-01',
  },
  'pixtral-large-latest': {
    type: 'token',
    pricing: { input: 2.00, output: 6.00 },
    lastUpdated: '2024-12-01',
  },
  'ministral-8b-latest': {
    type: 'token',
    pricing: { input: 0.10, output: 0.10 },
    lastUpdated: '2024-12-01',
  },
  'ministral-3b-latest': {
    type: 'token',
    pricing: { input: 0.04, output: 0.04 },
    lastUpdated: '2024-12-01',
  },
  'mistral-small-latest': {
    type: 'token',
    pricing: { input: 0.20, output: 0.60 },
    lastUpdated: '2024-12-01',
  },
  'codestral-latest': {
    type: 'token',
    pricing: { input: 0.30, output: 0.90 },
    lastUpdated: '2024-12-01',
  },
  'mistral-embed': {
    type: 'token',
    pricing: { input: 0.10, output: 0 },
    lastUpdated: '2024-12-01',
  },
}

// ============================================================================
// OPENROUTER (Pass-through with markup)
// https://openrouter.ai/docs#models
// ============================================================================

/** OpenRouter adds a ~5% markup on base prices */
export const OPENROUTER_MARKUP = 1.0 // No additional markup on reported prices

// OpenRouter model pricing (some popular ones)
export const OPENROUTER_PRICING: Record<string, ModelPricing> = {
  'anthropic/claude-3-5-sonnet': {
    type: 'token',
    pricing: { input: 3.00, output: 15.00 },
    lastUpdated: '2024-12-01',
  },
  'anthropic/claude-3-haiku': {
    type: 'token',
    pricing: { input: 0.25, output: 1.25 },
    lastUpdated: '2024-12-01',
  },
  'openai/gpt-4o': {
    type: 'token',
    pricing: { input: 2.50, output: 10.00 },
    lastUpdated: '2024-12-01',
  },
  'openai/gpt-4o-mini': {
    type: 'token',
    pricing: { input: 0.15, output: 0.60 },
    lastUpdated: '2024-12-01',
  },
  'google/gemini-pro': {
    type: 'token',
    pricing: { input: 0.125, output: 0.375 },
    lastUpdated: '2024-12-01',
  },
  'meta-llama/llama-3.1-70b-instruct': {
    type: 'token',
    pricing: { input: 0.35, output: 0.40 },
    lastUpdated: '2024-12-01',
  },
}

// ============================================================================
// OLLAMA (Local - Free)
// ============================================================================

export const OLLAMA_PRICING: ModelPricing = {
  type: 'free',
  lastUpdated: '2024-12-01',
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Find closest matching model in a pricing table
 * Handles model version suffixes
 */
function findClosestModel(model: string, pricing: Record<string, ModelPricing>): string | null {
  // Direct match
  if (pricing[model]) return model

  // Try without date suffix (e.g., "claude-3-5-sonnet-20241022" -> "claude-3-5-sonnet")
  const baseModel = model.replace(/-\d{8}$/, '')
  if (pricing[baseModel]) return baseModel

  // Try with "-latest" suffix
  const latestModel = `${baseModel}-latest`
  if (pricing[latestModel]) return latestModel

  // Try prefix matching
  for (const key of Object.keys(pricing)) {
    if (model.startsWith(key) || key.startsWith(model)) {
      return key
    }
  }

  return null
}

/**
 * Get pricing for a specific provider and model
 */
export function getPricing(provider: LLMProviderName, model: string): ModelPricing | null {
  switch (provider) {
    case 'anthropic': {
      const key = findClosestModel(model, ANTHROPIC_PRICING)
      return key ? ANTHROPIC_PRICING[key] : null
    }
    case 'openai': {
      const key = findClosestModel(model, OPENAI_PRICING)
      return key ? OPENAI_PRICING[key] : null
    }
    case 'mistral': {
      const key = findClosestModel(model, MISTRAL_PRICING)
      return key ? MISTRAL_PRICING[key] : null
    }
    case 'openrouter': {
      const key = findClosestModel(model, OPENROUTER_PRICING)
      return key ? OPENROUTER_PRICING[key] : null
    }
    case 'ollama':
      return OLLAMA_PRICING
    default:
      return null
  }
}

/**
 * Calculate token cost for an API call
 * @returns Cost in USD
 */
export function calculateTokenCost(
  provider: LLMProviderName,
  model: string,
  promptTokens: number,
  completionTokens: number,
  cachedTokens = 0
): number {
  const pricing = getPricing(provider, model)
  if (!pricing || pricing.type === 'free') return 0
  if (pricing.type !== 'token' || !pricing.pricing) return 0

  const { input, output, cached } = pricing.pricing

  // Calculate costs (prices are per 1M tokens)
  const inputCost = ((promptTokens - cachedTokens) / 1_000_000) * input
  const outputCost = (completionTokens / 1_000_000) * output
  const cachedCost = cached ? (cachedTokens / 1_000_000) * cached : 0

  let total = inputCost + outputCost + cachedCost

  // Apply OpenRouter markup if applicable
  if (provider === 'openrouter') {
    total *= OPENROUTER_MARKUP
  }

  return total
}

/**
 * Calculate image generation cost
 * @returns Cost in USD
 */
export function calculateImageCost(
  provider: LLMProviderName,
  model: string,
  size: string,
  quality: 'standard' | 'hd' = 'standard',
  count = 1
): number {
  const pricing = getPricing(provider, model)
  if (!pricing || pricing.type !== 'image' || !pricing.imagePricing) return 0

  const sizePricing = pricing.imagePricing[size]
  if (!sizePricing) {
    // Try to find closest size
    const sizes = Object.keys(pricing.imagePricing)
    if (sizes.length === 0) return 0
    const fallbackPricing = pricing.imagePricing[sizes[0]]
    return (quality === 'hd' && fallbackPricing.hd ? fallbackPricing.hd : fallbackPricing.standard) * count
  }

  const unitCost = quality === 'hd' && sizePricing.hd ? sizePricing.hd : sizePricing.standard
  return unitCost * count
}

/**
 * Estimate token count from text (rough approximation)
 * ~4 characters per token for English text
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

/**
 * Format cost for display
 */
export function formatCost(cost: number): string {
  if (cost === 0) return '$0.00'
  if (cost < 0.001) return `$${cost.toFixed(6)}`
  if (cost < 0.01) return `$${cost.toFixed(4)}`
  if (cost < 1) return `$${cost.toFixed(3)}`
  return `$${cost.toFixed(2)}`
}

/**
 * Get all supported providers
 */
export function getSupportedProviders(): LLMProviderName[] {
  return ['anthropic', 'openai', 'openrouter', 'mistral', 'ollama']
}

/**
 * Get all models for a provider
 */
export function getModelsForProvider(provider: LLMProviderName): string[] {
  switch (provider) {
    case 'anthropic':
      return Object.keys(ANTHROPIC_PRICING)
    case 'openai':
      return Object.keys(OPENAI_PRICING)
    case 'mistral':
      return Object.keys(MISTRAL_PRICING)
    case 'openrouter':
      return Object.keys(OPENROUTER_PRICING)
    case 'ollama':
      return ['*'] // Any local model
    default:
      return []
  }
}
