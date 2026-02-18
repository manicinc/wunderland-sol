/**
 * LLM Pricing Models Tests
 * @module __tests__/unit/costs/pricingModels.test
 *
 * Tests for LLM cost calculation and pricing utilities.
 */

import { describe, it, expect } from 'vitest'
import {
  ANTHROPIC_PRICING,
  OPENAI_PRICING,
  MISTRAL_PRICING,
  OPENROUTER_PRICING,
  OLLAMA_PRICING,
  getPricing,
  calculateTokenCost,
  calculateImageCost,
  estimateTokens,
  formatCost,
  getSupportedProviders,
  getModelsForProvider,
} from '@/lib/costs/pricingModels'

// ============================================================================
// PRICING CONFIGURATION
// ============================================================================

describe('Pricing Constants', () => {
  describe('ANTHROPIC_PRICING', () => {
    it('contains Claude models', () => {
      expect(ANTHROPIC_PRICING['claude-3-5-sonnet-20241022']).toBeDefined()
      expect(ANTHROPIC_PRICING['claude-3-5-haiku-20241022']).toBeDefined()
    })

    it('has correct pricing structure', () => {
      const sonnet = ANTHROPIC_PRICING['claude-3-5-sonnet-20241022']
      expect(sonnet.type).toBe('token')
      expect(sonnet.pricing).toBeDefined()
      expect(sonnet.pricing?.input).toBeGreaterThan(0)
      expect(sonnet.pricing?.output).toBeGreaterThan(0)
    })

    it('has cached pricing for applicable models', () => {
      const sonnet = ANTHROPIC_PRICING['claude-3-5-sonnet-20241022']
      expect(sonnet.pricing?.cached).toBeDefined()
      expect(sonnet.pricing?.cached).toBeLessThan(sonnet.pricing!.input)
    })
  })

  describe('OPENAI_PRICING', () => {
    it('contains GPT models', () => {
      expect(OPENAI_PRICING['gpt-4o']).toBeDefined()
      expect(OPENAI_PRICING['gpt-4o-mini']).toBeDefined()
    })

    it('contains image generation models', () => {
      expect(OPENAI_PRICING['dall-e-3']).toBeDefined()
      expect(OPENAI_PRICING['dall-e-3'].type).toBe('image')
    })

    it('contains embedding models', () => {
      expect(OPENAI_PRICING['text-embedding-3-small']).toBeDefined()
      expect(OPENAI_PRICING['text-embedding-3-small'].pricing?.output).toBe(0)
    })
  })

  describe('MISTRAL_PRICING', () => {
    it('contains Mistral models', () => {
      expect(MISTRAL_PRICING['mistral-large-latest']).toBeDefined()
      expect(MISTRAL_PRICING['mistral-small-latest']).toBeDefined()
    })
  })

  describe('OPENROUTER_PRICING', () => {
    it('contains models from multiple providers', () => {
      expect(OPENROUTER_PRICING['anthropic/claude-3-5-sonnet']).toBeDefined()
      expect(OPENROUTER_PRICING['openai/gpt-4o']).toBeDefined()
    })
  })

  describe('OLLAMA_PRICING', () => {
    it('is free tier', () => {
      expect(OLLAMA_PRICING.type).toBe('free')
    })
  })
})

// ============================================================================
// getPricing
// ============================================================================

describe('getPricing', () => {
  describe('anthropic provider', () => {
    it('returns pricing for exact model match', () => {
      const pricing = getPricing('anthropic', 'claude-3-5-sonnet-20241022')
      expect(pricing).not.toBeNull()
      expect(pricing?.type).toBe('token')
    })

    it('handles model with date suffix', () => {
      const pricing = getPricing('anthropic', 'claude-3-5-sonnet-20241022')
      expect(pricing).not.toBeNull()
    })

    it('returns null for unknown model', () => {
      const pricing = getPricing('anthropic', 'unknown-model')
      expect(pricing).toBeNull()
    })
  })

  describe('openai provider', () => {
    it('returns pricing for GPT models', () => {
      const pricing = getPricing('openai', 'gpt-4o')
      expect(pricing).not.toBeNull()
      expect(pricing?.type).toBe('token')
    })

    it('returns pricing for image models', () => {
      const pricing = getPricing('openai', 'dall-e-3')
      expect(pricing).not.toBeNull()
      expect(pricing?.type).toBe('image')
    })
  })

  describe('mistral provider', () => {
    it('returns pricing for Mistral models', () => {
      const pricing = getPricing('mistral', 'mistral-large-latest')
      expect(pricing).not.toBeNull()
    })
  })

  describe('openrouter provider', () => {
    it('returns pricing for OpenRouter models', () => {
      const pricing = getPricing('openrouter', 'anthropic/claude-3-5-sonnet')
      expect(pricing).not.toBeNull()
    })
  })

  describe('ollama provider', () => {
    it('returns free pricing', () => {
      const pricing = getPricing('ollama', 'any-model')
      expect(pricing).not.toBeNull()
      expect(pricing?.type).toBe('free')
    })
  })
})

// ============================================================================
// calculateTokenCost
// ============================================================================

describe('calculateTokenCost', () => {
  it('calculates cost based on token counts', () => {
    const cost = calculateTokenCost(
      'anthropic',
      'claude-3-5-sonnet-20241022',
      1000,
      500,
      0
    )
    expect(cost).toBeGreaterThan(0)
  })

  it('returns 0 for free providers', () => {
    const cost = calculateTokenCost('ollama', 'llama3', 1000, 500)
    expect(cost).toBe(0)
  })

  it('handles cached tokens with discounted rate', () => {
    const noCacheCost = calculateTokenCost(
      'anthropic',
      'claude-3-5-sonnet-20241022',
      10000,
      1000,
      0
    )
    const withCacheCost = calculateTokenCost(
      'anthropic',
      'claude-3-5-sonnet-20241022',
      10000,
      1000,
      5000
    )
    expect(withCacheCost).toBeLessThan(noCacheCost)
  })

  it('returns 0 for unknown model', () => {
    const cost = calculateTokenCost('anthropic', 'unknown-model', 1000, 500)
    expect(cost).toBe(0)
  })
})

// ============================================================================
// calculateImageCost
// ============================================================================

describe('calculateImageCost', () => {
  it('calculates cost for DALL-E 3 standard', () => {
    const cost = calculateImageCost('openai', 'dall-e-3', '1024x1024', 'standard', 1)
    expect(cost).toBe(0.04)
  })

  it('calculates cost for DALL-E 3 HD', () => {
    const cost = calculateImageCost('openai', 'dall-e-3', '1024x1024', 'hd', 1)
    expect(cost).toBe(0.08)
  })

  it('multiplies by count', () => {
    const singleCost = calculateImageCost('openai', 'dall-e-3', '1024x1024', 'standard', 1)
    const tripleCost = calculateImageCost('openai', 'dall-e-3', '1024x1024', 'standard', 3)
    expect(tripleCost).toBe(singleCost * 3)
  })

  it('returns 0 for non-image models', () => {
    const cost = calculateImageCost('openai', 'gpt-4o', '1024x1024', 'standard', 1)
    expect(cost).toBe(0)
  })
})

// ============================================================================
// estimateTokens
// ============================================================================

describe('estimateTokens', () => {
  it('estimates ~4 characters per token', () => {
    const text = 'Hello world'
    const tokens = estimateTokens(text)
    expect(tokens).toBe(3)
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
  it('formats zero cost', () => {
    expect(formatCost(0)).toBe('$0.00')
  })

  it('formats very small costs', () => {
    expect(formatCost(0.0001)).toBe('$0.000100')
  })

  it('formats small costs', () => {
    expect(formatCost(0.005)).toBe('$0.0050')
  })

  it('formats large costs', () => {
    expect(formatCost(100.5)).toBe('$100.50')
  })
})

// ============================================================================
// getSupportedProviders
// ============================================================================

describe('getSupportedProviders', () => {
  it('returns all provider names', () => {
    const providers = getSupportedProviders()
    expect(providers).toContain('anthropic')
    expect(providers).toContain('openai')
    expect(providers).toContain('ollama')
  })
})

// ============================================================================
// getModelsForProvider
// ============================================================================

describe('getModelsForProvider', () => {
  it('returns Anthropic models', () => {
    const models = getModelsForProvider('anthropic')
    expect(models.length).toBeGreaterThan(0)
    expect(models.some(m => m.includes('claude'))).toBe(true)
  })

  it('returns OpenAI models', () => {
    const models = getModelsForProvider('openai')
    expect(models.length).toBeGreaterThan(0)
    expect(models.some(m => m.includes('gpt'))).toBe(true)
  })

  it('returns wildcard for Ollama', () => {
    const models = getModelsForProvider('ollama')
    expect(models).toContain('*')
  })

  it('returns empty array for unknown provider', () => {
    const models = getModelsForProvider('unknown' as any)
    expect(models).toEqual([])
  })
})
