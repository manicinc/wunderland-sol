/**
 * Pricing Models Tests
 * @module __tests__/unit/lib/costs/pricingModels.test
 *
 * Tests for LLM pricing configuration and cost calculation functions.
 */

import { describe, it, expect } from 'vitest'
import {
  ANTHROPIC_PRICING,
  OPENAI_PRICING,
  MISTRAL_PRICING,
  OPENROUTER_PRICING,
  OLLAMA_PRICING,
  OPENROUTER_MARKUP,
  getPricing,
  calculateTokenCost,
  calculateImageCost,
  estimateTokens,
  formatCost,
  getSupportedProviders,
  getModelsForProvider,
  type LLMProviderName,
} from '@/lib/costs/pricingModels'

// ============================================================================
// ANTHROPIC_PRICING
// ============================================================================

describe('ANTHROPIC_PRICING', () => {
  it('is defined and non-empty', () => {
    expect(ANTHROPIC_PRICING).toBeDefined()
    expect(Object.keys(ANTHROPIC_PRICING).length).toBeGreaterThan(0)
  })

  it('includes Claude 3.5 Sonnet models', () => {
    expect(ANTHROPIC_PRICING['claude-3-5-sonnet-20241022']).toBeDefined()
    expect(ANTHROPIC_PRICING['claude-3-5-sonnet-latest']).toBeDefined()
  })

  it('includes Claude 3.5 Haiku models', () => {
    expect(ANTHROPIC_PRICING['claude-3-5-haiku-20241022']).toBeDefined()
  })

  it('includes Claude 3 Opus', () => {
    expect(ANTHROPIC_PRICING['claude-3-opus-20240229']).toBeDefined()
  })

  describe('pricing structure', () => {
    Object.entries(ANTHROPIC_PRICING).forEach(([model, pricing]) => {
      describe(`model: ${model}`, () => {
        it('has type', () => {
          expect(pricing.type).toBeDefined()
        })

        it('has lastUpdated', () => {
          expect(pricing.lastUpdated).toBeDefined()
          expect(pricing.lastUpdated).toMatch(/^\d{4}-\d{2}-\d{2}$/)
        })

        if (pricing.type === 'token') {
          it('has input and output pricing', () => {
            expect(pricing.pricing?.input).toBeDefined()
            expect(pricing.pricing?.output).toBeDefined()
          })

          it('has positive pricing values', () => {
            expect(pricing.pricing!.input).toBeGreaterThan(0)
            expect(pricing.pricing!.output).toBeGreaterThan(0)
          })
        }
      })
    })
  })

  it('Opus is more expensive than Sonnet', () => {
    const opus = ANTHROPIC_PRICING['claude-3-opus-20240229']
    const sonnet = ANTHROPIC_PRICING['claude-3-5-sonnet-20241022']
    expect(opus.pricing!.input).toBeGreaterThanOrEqual(sonnet.pricing!.input)
    expect(opus.pricing!.output).toBeGreaterThanOrEqual(sonnet.pricing!.output)
  })

  it('Haiku is cheaper than Sonnet', () => {
    const haiku = ANTHROPIC_PRICING['claude-3-5-haiku-20241022']
    const sonnet = ANTHROPIC_PRICING['claude-3-5-sonnet-20241022']
    expect(haiku.pricing!.input).toBeLessThan(sonnet.pricing!.input)
    expect(haiku.pricing!.output).toBeLessThan(sonnet.pricing!.output)
  })
})

// ============================================================================
// OPENAI_PRICING
// ============================================================================

describe('OPENAI_PRICING', () => {
  it('is defined and non-empty', () => {
    expect(OPENAI_PRICING).toBeDefined()
    expect(Object.keys(OPENAI_PRICING).length).toBeGreaterThan(0)
  })

  it('includes GPT-4o models', () => {
    expect(OPENAI_PRICING['gpt-4o']).toBeDefined()
    expect(OPENAI_PRICING['gpt-4o-mini']).toBeDefined()
  })

  it('includes o1 reasoning models', () => {
    expect(OPENAI_PRICING['o1']).toBeDefined()
    expect(OPENAI_PRICING['o1-mini']).toBeDefined()
  })

  it('includes DALL-E models', () => {
    expect(OPENAI_PRICING['dall-e-3']).toBeDefined()
    expect(OPENAI_PRICING['dall-e-2']).toBeDefined()
  })

  it('includes embedding models', () => {
    expect(OPENAI_PRICING['text-embedding-3-small']).toBeDefined()
    expect(OPENAI_PRICING['text-embedding-3-large']).toBeDefined()
  })

  describe('DALL-E 3 image pricing', () => {
    const dalle3 = OPENAI_PRICING['dall-e-3']

    it('has image type', () => {
      expect(dalle3.type).toBe('image')
    })

    it('has multiple size options', () => {
      expect(dalle3.imagePricing!['1024x1024']).toBeDefined()
      expect(dalle3.imagePricing!['1792x1024']).toBeDefined()
    })

    it('has HD options', () => {
      expect(dalle3.imagePricing!['1024x1024'].hd).toBeDefined()
    })

    it('HD costs more than standard', () => {
      const size = dalle3.imagePricing!['1024x1024']
      expect(size.hd!).toBeGreaterThan(size.standard)
    })
  })

  describe('embedding models', () => {
    it('have zero output cost', () => {
      expect(OPENAI_PRICING['text-embedding-3-small'].pricing!.output).toBe(0)
      expect(OPENAI_PRICING['text-embedding-3-large'].pricing!.output).toBe(0)
    })

    it('large model costs more than small', () => {
      const small = OPENAI_PRICING['text-embedding-3-small']
      const large = OPENAI_PRICING['text-embedding-3-large']
      expect(large.pricing!.input).toBeGreaterThan(small.pricing!.input)
    })
  })
})

// ============================================================================
// MISTRAL_PRICING
// ============================================================================

describe('MISTRAL_PRICING', () => {
  it('is defined and non-empty', () => {
    expect(MISTRAL_PRICING).toBeDefined()
    expect(Object.keys(MISTRAL_PRICING).length).toBeGreaterThan(0)
  })

  it('includes Mistral Large', () => {
    expect(MISTRAL_PRICING['mistral-large-latest']).toBeDefined()
  })

  it('includes Ministral models', () => {
    expect(MISTRAL_PRICING['ministral-8b-latest']).toBeDefined()
    expect(MISTRAL_PRICING['ministral-3b-latest']).toBeDefined()
  })

  it('includes Codestral', () => {
    expect(MISTRAL_PRICING['codestral-latest']).toBeDefined()
  })

  it('smaller models are cheaper', () => {
    const large = MISTRAL_PRICING['mistral-large-latest']
    const small = MISTRAL_PRICING['ministral-3b-latest']
    expect(small.pricing!.input).toBeLessThan(large.pricing!.input)
  })
})

// ============================================================================
// OPENROUTER_PRICING
// ============================================================================

describe('OPENROUTER_PRICING', () => {
  it('is defined and non-empty', () => {
    expect(OPENROUTER_PRICING).toBeDefined()
    expect(Object.keys(OPENROUTER_PRICING).length).toBeGreaterThan(0)
  })

  it('includes Anthropic models with provider prefix', () => {
    expect(OPENROUTER_PRICING['anthropic/claude-3-5-sonnet']).toBeDefined()
  })

  it('includes OpenAI models with provider prefix', () => {
    expect(OPENROUTER_PRICING['openai/gpt-4o']).toBeDefined()
  })
})

describe('OPENROUTER_MARKUP', () => {
  it('is 1.0 (no additional markup)', () => {
    expect(OPENROUTER_MARKUP).toBe(1.0)
  })
})

// ============================================================================
// OLLAMA_PRICING
// ============================================================================

describe('OLLAMA_PRICING', () => {
  it('is type free', () => {
    expect(OLLAMA_PRICING.type).toBe('free')
  })

  it('has no pricing', () => {
    expect(OLLAMA_PRICING.pricing).toBeUndefined()
  })

  it('has lastUpdated', () => {
    expect(OLLAMA_PRICING.lastUpdated).toBeDefined()
  })
})

// ============================================================================
// getPricing
// ============================================================================

describe('getPricing', () => {
  describe('Anthropic provider', () => {
    it('returns pricing for exact model match', () => {
      const pricing = getPricing('anthropic', 'claude-3-5-sonnet-20241022')
      expect(pricing).toBeDefined()
      expect(pricing!.type).toBe('token')
    })

    it('returns null for unknown model', () => {
      const pricing = getPricing('anthropic', 'unknown-model-xyz')
      expect(pricing).toBeNull()
    })
  })

  describe('OpenAI provider', () => {
    it('returns pricing for GPT-4o', () => {
      const pricing = getPricing('openai', 'gpt-4o')
      expect(pricing).toBeDefined()
      expect(pricing!.type).toBe('token')
    })

    it('returns pricing for DALL-E 3', () => {
      const pricing = getPricing('openai', 'dall-e-3')
      expect(pricing).toBeDefined()
      expect(pricing!.type).toBe('image')
    })
  })

  describe('Ollama provider', () => {
    it('returns free pricing for any model', () => {
      const pricing = getPricing('ollama', 'llama3:latest')
      expect(pricing).toBeDefined()
      expect(pricing!.type).toBe('free')
    })
  })

  describe('unknown provider', () => {
    it('returns null for unsupported provider', () => {
      const pricing = getPricing('unknown' as LLMProviderName, 'model')
      expect(pricing).toBeNull()
    })
  })
})

// ============================================================================
// calculateTokenCost
// ============================================================================

describe('calculateTokenCost', () => {
  describe('basic calculations', () => {
    it('calculates cost for 1M tokens', () => {
      const cost = calculateTokenCost('openai', 'gpt-4o', 1_000_000, 1_000_000)
      expect(cost).toBe(2.5 + 10.0)
    })

    it('calculates cost for fractional tokens', () => {
      const cost = calculateTokenCost('openai', 'gpt-4o', 1000, 1000)
      expect(cost).toBeCloseTo(0.0025 + 0.01, 6)
    })

    it('returns 0 for free providers', () => {
      const cost = calculateTokenCost('ollama', 'llama3', 1_000_000, 1_000_000)
      expect(cost).toBe(0)
    })

    it('returns 0 for unknown models', () => {
      const cost = calculateTokenCost('anthropic', 'unknown-model', 1000, 1000)
      expect(cost).toBe(0)
    })
  })

  describe('cached tokens', () => {
    it('applies cached token pricing when available', () => {
      const withCache = calculateTokenCost('openai', 'gpt-4o', 1_000_000, 0, 500_000)
      const withoutCache = calculateTokenCost('openai', 'gpt-4o', 1_000_000, 0, 0)
      expect(withCache).toBeLessThan(withoutCache)
    })
  })

  describe('zero inputs', () => {
    it('returns 0 for zero tokens', () => {
      const cost = calculateTokenCost('openai', 'gpt-4o', 0, 0)
      expect(cost).toBe(0)
    })

    it('handles output-only calls', () => {
      const cost = calculateTokenCost('openai', 'gpt-4o', 0, 1_000_000)
      expect(cost).toBe(10.0)
    })

    it('handles input-only calls', () => {
      const cost = calculateTokenCost('openai', 'gpt-4o', 1_000_000, 0)
      expect(cost).toBe(2.5)
    })
  })
})

// ============================================================================
// calculateImageCost
// ============================================================================

describe('calculateImageCost', () => {
  describe('DALL-E 3', () => {
    it('calculates standard 1024x1024 cost', () => {
      const cost = calculateImageCost('openai', 'dall-e-3', '1024x1024', 'standard', 1)
      expect(cost).toBe(0.04)
    })

    it('calculates HD 1024x1024 cost', () => {
      const cost = calculateImageCost('openai', 'dall-e-3', '1024x1024', 'hd', 1)
      expect(cost).toBe(0.08)
    })

    it('calculates cost for multiple images', () => {
      const cost = calculateImageCost('openai', 'dall-e-3', '1024x1024', 'standard', 5)
      expect(cost).toBe(0.04 * 5)
    })
  })

  describe('edge cases', () => {
    it('returns 0 for non-image models', () => {
      const cost = calculateImageCost('openai', 'gpt-4o', '1024x1024', 'standard', 1)
      expect(cost).toBe(0)
    })

    it('returns 0 for unknown models', () => {
      const cost = calculateImageCost('openai', 'unknown-model', '1024x1024', 'standard', 1)
      expect(cost).toBe(0)
    })
  })
})

// ============================================================================
// estimateTokens
// ============================================================================

describe('estimateTokens', () => {
  it('estimates ~4 characters per token', () => {
    expect(estimateTokens('test')).toBe(1)
    expect(estimateTokens('testing!')).toBe(2)
  })

  it('rounds up for partial tokens', () => {
    expect(estimateTokens('abc')).toBe(1)
  })

  it('handles empty string', () => {
    expect(estimateTokens('')).toBe(0)
  })

  it('handles long text', () => {
    const text = 'a'.repeat(1000)
    expect(estimateTokens(text)).toBe(250)
  })
})

// ============================================================================
// formatCost
// ============================================================================

describe('formatCost', () => {
  it('formats $0 as $0.00', () => {
    expect(formatCost(0)).toBe('$0.00')
  })

  it('formats very small amounts with 6 decimals', () => {
    expect(formatCost(0.0001)).toBe('$0.000100')
  })

  it('formats small amounts with 4 decimals', () => {
    expect(formatCost(0.005)).toBe('$0.0050')
  })

  it('formats medium amounts with 3 decimals', () => {
    expect(formatCost(0.123)).toBe('$0.123')
  })

  it('formats large amounts with 2 decimals', () => {
    expect(formatCost(1.234)).toBe('$1.23')
    expect(formatCost(100)).toBe('$100.00')
  })
})

// ============================================================================
// getSupportedProviders
// ============================================================================

describe('getSupportedProviders', () => {
  it('returns array of providers', () => {
    const providers = getSupportedProviders()
    expect(Array.isArray(providers)).toBe(true)
    expect(providers.length).toBeGreaterThan(0)
  })

  it('includes all major providers', () => {
    const providers = getSupportedProviders()
    expect(providers).toContain('anthropic')
    expect(providers).toContain('openai')
    expect(providers).toContain('openrouter')
    expect(providers).toContain('mistral')
    expect(providers).toContain('ollama')
  })

  it('returns exactly 5 providers', () => {
    const providers = getSupportedProviders()
    expect(providers).toHaveLength(5)
  })
})

// ============================================================================
// getModelsForProvider
// ============================================================================

describe('getModelsForProvider', () => {
  it('returns Anthropic models', () => {
    const models = getModelsForProvider('anthropic')
    expect(models.length).toBeGreaterThan(0)
    expect(models).toContain('claude-3-5-sonnet-20241022')
  })

  it('returns OpenAI models', () => {
    const models = getModelsForProvider('openai')
    expect(models.length).toBeGreaterThan(0)
    expect(models).toContain('gpt-4o')
    expect(models).toContain('dall-e-3')
  })

  it('returns wildcard for Ollama', () => {
    const models = getModelsForProvider('ollama')
    expect(models).toEqual(['*'])
  })

  it('returns empty array for unknown provider', () => {
    const models = getModelsForProvider('unknown' as LLMProviderName)
    expect(models).toEqual([])
  })
})

// ============================================================================
// Integration Tests
// ============================================================================

describe('pricing models integration', () => {
  it('all provider models have valid pricing', () => {
    const providers = getSupportedProviders()
    providers.forEach((provider) => {
      if (provider === 'ollama') return

      const models = getModelsForProvider(provider)
      models.forEach((model) => {
        const pricing = getPricing(provider, model)
        expect(pricing, `${provider}/${model}`).toBeDefined()
      })
    })
  })

  it('cost calculation chain works correctly', () => {
    const text = 'This is a test message for the LLM.'
    const estimatedTokens = estimateTokens(text)
    const cost = calculateTokenCost('openai', 'gpt-4o-mini', estimatedTokens, estimatedTokens * 2)
    const formatted = formatCost(cost)

    expect(formatted).toMatch(/^\$/)
    expect(cost).toBeGreaterThan(0)
  })
})
