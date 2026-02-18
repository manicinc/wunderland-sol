/**
 * Auto-Tag Settings Tests
 * @module __tests__/unit/lib/settings/autoTagSettings.test
 *
 * Tests for auto-tagging configuration utilities.
 */

import { describe, it, expect } from 'vitest'
import {
  DEFAULT_WORTHINESS_WEIGHTS,
  DEFAULT_AUTO_TAG_CONFIG,
  CONSERVATIVE_AUTO_TAG_CONFIG,
  AGGRESSIVE_AUTO_TAG_CONFIG,
  NLP_ONLY_AUTO_TAG_CONFIG,
  mergeAutoTagConfig,
  validateAutoTagConfig,
  describeAutoTagConfig,
  getPresetConfig,
  getAvailablePresets,
  getPresetDescription,
  type AutoTagPreset,
} from '@/lib/settings/autoTagSettings'

// ============================================================================
// DEFAULT_WORTHINESS_WEIGHTS
// ============================================================================

describe('DEFAULT_WORTHINESS_WEIGHTS', () => {
  it('has all required weight properties', () => {
    expect(DEFAULT_WORTHINESS_WEIGHTS).toHaveProperty('topicShift')
    expect(DEFAULT_WORTHINESS_WEIGHTS).toHaveProperty('entityDensity')
    expect(DEFAULT_WORTHINESS_WEIGHTS).toHaveProperty('semanticNovelty')
  })

  it('weights sum to 1.0', () => {
    const sum =
      DEFAULT_WORTHINESS_WEIGHTS.topicShift +
      DEFAULT_WORTHINESS_WEIGHTS.entityDensity +
      DEFAULT_WORTHINESS_WEIGHTS.semanticNovelty
    expect(sum).toBeCloseTo(1.0, 2)
  })

  it('all weights are between 0 and 1', () => {
    expect(DEFAULT_WORTHINESS_WEIGHTS.topicShift).toBeGreaterThanOrEqual(0)
    expect(DEFAULT_WORTHINESS_WEIGHTS.topicShift).toBeLessThanOrEqual(1)
    expect(DEFAULT_WORTHINESS_WEIGHTS.entityDensity).toBeGreaterThanOrEqual(0)
    expect(DEFAULT_WORTHINESS_WEIGHTS.entityDensity).toBeLessThanOrEqual(1)
    expect(DEFAULT_WORTHINESS_WEIGHTS.semanticNovelty).toBeGreaterThanOrEqual(0)
    expect(DEFAULT_WORTHINESS_WEIGHTS.semanticNovelty).toBeLessThanOrEqual(1)
  })
})

// ============================================================================
// DEFAULT_AUTO_TAG_CONFIG
// ============================================================================

describe('DEFAULT_AUTO_TAG_CONFIG', () => {
  it('has document-level settings', () => {
    expect(DEFAULT_AUTO_TAG_CONFIG.documentAutoTag).toBe(true)
    expect(DEFAULT_AUTO_TAG_CONFIG.blockAutoTag).toBe(true)
    expect(DEFAULT_AUTO_TAG_CONFIG.useLLM).toBe(true)
    expect(DEFAULT_AUTO_TAG_CONFIG.preferExistingTags).toBe(true)
  })

  it('has valid confidence threshold', () => {
    expect(DEFAULT_AUTO_TAG_CONFIG.confidenceThreshold).toBeGreaterThan(0)
    expect(DEFAULT_AUTO_TAG_CONFIG.confidenceThreshold).toBeLessThanOrEqual(1)
  })

  it('has reasonable tag limits', () => {
    expect(DEFAULT_AUTO_TAG_CONFIG.maxNewTagsPerDocument).toBeGreaterThan(0)
    expect(DEFAULT_AUTO_TAG_CONFIG.maxNewTagsPerBlock).toBeGreaterThan(0)
  })

  it('has LLM provider order', () => {
    expect(DEFAULT_AUTO_TAG_CONFIG.llmProviderOrder).toContain('claude')
    expect(DEFAULT_AUTO_TAG_CONFIG.llmProviderOrder).toContain('openai')
  })

  it('has tag bubbling settings', () => {
    expect(DEFAULT_AUTO_TAG_CONFIG.enableTagBubbling).toBe(true)
    expect(DEFAULT_AUTO_TAG_CONFIG.tagBubblingThreshold).toBeGreaterThanOrEqual(1)
  })

  it('has worthiness weights', () => {
    expect(DEFAULT_AUTO_TAG_CONFIG.worthinessWeights).toBeDefined()
  })
})

// ============================================================================
// CONSERVATIVE_AUTO_TAG_CONFIG
// ============================================================================

describe('CONSERVATIVE_AUTO_TAG_CONFIG', () => {
  it('has higher thresholds than default', () => {
    expect(CONSERVATIVE_AUTO_TAG_CONFIG.confidenceThreshold).toBeGreaterThan(
      DEFAULT_AUTO_TAG_CONFIG.confidenceThreshold
    )
    expect(CONSERVATIVE_AUTO_TAG_CONFIG.blockWorthinessThreshold).toBeGreaterThan(
      DEFAULT_AUTO_TAG_CONFIG.blockWorthinessThreshold
    )
  })

  it('has fewer max tags than default', () => {
    expect(CONSERVATIVE_AUTO_TAG_CONFIG.maxNewTagsPerBlock).toBeLessThanOrEqual(
      DEFAULT_AUTO_TAG_CONFIG.maxNewTagsPerBlock
    )
    expect(CONSERVATIVE_AUTO_TAG_CONFIG.maxNewTagsPerDocument).toBeLessThanOrEqual(
      DEFAULT_AUTO_TAG_CONFIG.maxNewTagsPerDocument
    )
  })

  it('has higher bubbling threshold', () => {
    expect(CONSERVATIVE_AUTO_TAG_CONFIG.tagBubblingThreshold).toBeGreaterThanOrEqual(
      DEFAULT_AUTO_TAG_CONFIG.tagBubblingThreshold
    )
  })
})

// ============================================================================
// AGGRESSIVE_AUTO_TAG_CONFIG
// ============================================================================

describe('AGGRESSIVE_AUTO_TAG_CONFIG', () => {
  it('has lower thresholds than default', () => {
    expect(AGGRESSIVE_AUTO_TAG_CONFIG.confidenceThreshold).toBeLessThan(
      DEFAULT_AUTO_TAG_CONFIG.confidenceThreshold
    )
    expect(AGGRESSIVE_AUTO_TAG_CONFIG.blockWorthinessThreshold).toBeLessThan(
      DEFAULT_AUTO_TAG_CONFIG.blockWorthinessThreshold
    )
  })

  it('has more max tags than default', () => {
    expect(AGGRESSIVE_AUTO_TAG_CONFIG.maxNewTagsPerBlock).toBeGreaterThanOrEqual(
      DEFAULT_AUTO_TAG_CONFIG.maxNewTagsPerBlock
    )
    expect(AGGRESSIVE_AUTO_TAG_CONFIG.maxNewTagsPerDocument).toBeGreaterThanOrEqual(
      DEFAULT_AUTO_TAG_CONFIG.maxNewTagsPerDocument
    )
  })

  it('has lower bubbling threshold', () => {
    expect(AGGRESSIVE_AUTO_TAG_CONFIG.tagBubblingThreshold).toBeLessThanOrEqual(
      DEFAULT_AUTO_TAG_CONFIG.tagBubblingThreshold
    )
  })
})

// ============================================================================
// NLP_ONLY_AUTO_TAG_CONFIG
// ============================================================================

describe('NLP_ONLY_AUTO_TAG_CONFIG', () => {
  it('has LLM disabled', () => {
    expect(NLP_ONLY_AUTO_TAG_CONFIG.useLLM).toBe(false)
  })

  it('still has auto-tagging enabled', () => {
    expect(NLP_ONLY_AUTO_TAG_CONFIG.documentAutoTag).toBe(true)
    expect(NLP_ONLY_AUTO_TAG_CONFIG.blockAutoTag).toBe(true)
  })
})

// ============================================================================
// mergeAutoTagConfig
// ============================================================================

describe('mergeAutoTagConfig', () => {
  it('returns defaults when no config provided', () => {
    const result = mergeAutoTagConfig()
    expect(result).toEqual(DEFAULT_AUTO_TAG_CONFIG)
  })

  it('returns defaults when empty config provided', () => {
    const result = mergeAutoTagConfig({})
    expect(result.confidenceThreshold).toBe(DEFAULT_AUTO_TAG_CONFIG.confidenceThreshold)
  })

  it('overrides specific values', () => {
    const result = mergeAutoTagConfig({ confidenceThreshold: 0.8 })
    expect(result.confidenceThreshold).toBe(0.8)
    expect(result.blockWorthinessThreshold).toBe(DEFAULT_AUTO_TAG_CONFIG.blockWorthinessThreshold)
  })

  it('merges worthiness weights', () => {
    const result = mergeAutoTagConfig({
      worthinessWeights: { topicShift: 0.5 },
    })
    expect(result.worthinessWeights.topicShift).toBe(0.5)
    expect(result.worthinessWeights.entityDensity).toBe(DEFAULT_WORTHINESS_WEIGHTS.entityDensity)
  })

  it('preserves llm provider order when provided', () => {
    const result = mergeAutoTagConfig({
      llmProviderOrder: ['openai', 'claude'],
    })
    expect(result.llmProviderOrder).toEqual(['openai', 'claude'])
  })

  it('uses default llm provider order when not provided', () => {
    const result = mergeAutoTagConfig({})
    expect(result.llmProviderOrder).toEqual(DEFAULT_AUTO_TAG_CONFIG.llmProviderOrder)
  })

  it('returns new object (not reference)', () => {
    const result = mergeAutoTagConfig()
    expect(result).not.toBe(DEFAULT_AUTO_TAG_CONFIG)
  })
})

// ============================================================================
// validateAutoTagConfig
// ============================================================================

describe('validateAutoTagConfig', () => {
  describe('valid configurations', () => {
    it('validates empty config', () => {
      const result = validateAutoTagConfig({})
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('validates default config', () => {
      const result = validateAutoTagConfig(DEFAULT_AUTO_TAG_CONFIG)
      expect(result.valid).toBe(true)
    })

    it('validates threshold at boundary', () => {
      expect(validateAutoTagConfig({ confidenceThreshold: 0 }).valid).toBe(true)
      expect(validateAutoTagConfig({ confidenceThreshold: 1 }).valid).toBe(true)
    })
  })

  describe('invalid thresholds', () => {
    it('rejects confidence threshold > 1', () => {
      const result = validateAutoTagConfig({ confidenceThreshold: 1.5 })
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('confidenceThreshold must be between 0 and 1')
    })

    it('rejects confidence threshold < 0', () => {
      const result = validateAutoTagConfig({ confidenceThreshold: -0.1 })
      expect(result.valid).toBe(false)
    })

    it('rejects block worthiness threshold > 1', () => {
      const result = validateAutoTagConfig({ blockWorthinessThreshold: 2 })
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('blockWorthinessThreshold must be between 0 and 1')
    })
  })

  describe('invalid max values', () => {
    it('rejects negative maxNewTagsPerBlock', () => {
      const result = validateAutoTagConfig({ maxNewTagsPerBlock: -1 })
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('maxNewTagsPerBlock must be non-negative')
    })

    it('rejects negative maxNewTagsPerDocument', () => {
      const result = validateAutoTagConfig({ maxNewTagsPerDocument: -5 })
      expect(result.valid).toBe(false)
    })

    it('rejects tagBubblingThreshold < 1', () => {
      const result = validateAutoTagConfig({ tagBubblingThreshold: 0 })
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('tagBubblingThreshold must be at least 1')
    })

    it('allows zero max tags', () => {
      const result = validateAutoTagConfig({ maxNewTagsPerBlock: 0 })
      expect(result.valid).toBe(true)
    })
  })

  describe('worthiness weights validation', () => {
    it('warns if weights do not sum to 1', () => {
      const result = validateAutoTagConfig({
        worthinessWeights: {
          topicShift: 0.5,
          entityDensity: 0.5,
          semanticNovelty: 0.5,
        },
      })
      expect(result.valid).toBe(false)
      expect(result.errors[0]).toContain('worthinessWeights should sum to 1.0')
    })

    it('accepts weights summing to 1', () => {
      const result = validateAutoTagConfig({
        worthinessWeights: {
          topicShift: 0.4,
          entityDensity: 0.3,
          semanticNovelty: 0.3,
        },
      })
      expect(result.valid).toBe(true)
    })

    it('accepts partial weights summing to 0 (no validation if sum is 0)', () => {
      const result = validateAutoTagConfig({
        worthinessWeights: { topicShift: 0 },
      })
      expect(result.valid).toBe(true)
    })
  })

  describe('LLM provider validation', () => {
    it('accepts valid providers', () => {
      const result = validateAutoTagConfig({
        llmProviderOrder: ['claude', 'openai', 'openrouter'],
      })
      expect(result.valid).toBe(true)
    })

    it('rejects invalid providers', () => {
      const result = validateAutoTagConfig({
        llmProviderOrder: ['invalid-provider' as any],
      })
      expect(result.valid).toBe(false)
      expect(result.errors[0]).toContain('Invalid LLM provider')
    })
  })

  describe('multiple errors', () => {
    it('collects all errors', () => {
      const result = validateAutoTagConfig({
        confidenceThreshold: -1,
        blockWorthinessThreshold: 2,
        maxNewTagsPerBlock: -5,
      })
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBe(3)
    })
  })
})

// ============================================================================
// describeAutoTagConfig
// ============================================================================

describe('describeAutoTagConfig', () => {
  it('describes enabled config', () => {
    const desc = describeAutoTagConfig(DEFAULT_AUTO_TAG_CONFIG)
    expect(desc).toContain('enabled')
    expect(desc).toContain('Block tagging')
    expect(desc).toContain('LLM')
  })

  it('describes disabled config', () => {
    const desc = describeAutoTagConfig({
      ...DEFAULT_AUTO_TAG_CONFIG,
      documentAutoTag: false,
    })
    expect(desc).toContain('disabled')
  })

  it('shows LLM provider order when enabled', () => {
    const desc = describeAutoTagConfig(DEFAULT_AUTO_TAG_CONFIG)
    expect(desc).toContain('claude')
  })

  it('shows tag bubbling info', () => {
    const desc = describeAutoTagConfig(DEFAULT_AUTO_TAG_CONFIG)
    expect(desc).toContain('bubbling')
  })

  it('returns multiline string', () => {
    const desc = describeAutoTagConfig(DEFAULT_AUTO_TAG_CONFIG)
    expect(desc.split('\n').length).toBeGreaterThan(1)
  })
})

// ============================================================================
// getPresetConfig
// ============================================================================

describe('getPresetConfig', () => {
  it('returns default preset', () => {
    const config = getPresetConfig('default')
    expect(config.confidenceThreshold).toBe(DEFAULT_AUTO_TAG_CONFIG.confidenceThreshold)
  })

  it('returns conservative preset', () => {
    const config = getPresetConfig('conservative')
    expect(config.confidenceThreshold).toBe(CONSERVATIVE_AUTO_TAG_CONFIG.confidenceThreshold)
  })

  it('returns aggressive preset', () => {
    const config = getPresetConfig('aggressive')
    expect(config.confidenceThreshold).toBe(AGGRESSIVE_AUTO_TAG_CONFIG.confidenceThreshold)
  })

  it('returns nlp-only preset', () => {
    const config = getPresetConfig('nlp-only')
    expect(config.useLLM).toBe(false)
  })

  it('returns disabled preset', () => {
    const config = getPresetConfig('disabled')
    expect(config.documentAutoTag).toBe(false)
    expect(config.blockAutoTag).toBe(false)
  })

  it('returns new object each time', () => {
    const config1 = getPresetConfig('default')
    const config2 = getPresetConfig('default')
    expect(config1).not.toBe(config2)
  })
})

// ============================================================================
// getAvailablePresets
// ============================================================================

describe('getAvailablePresets', () => {
  it('returns array of preset names', () => {
    const presets = getAvailablePresets()
    expect(Array.isArray(presets)).toBe(true)
    expect(presets.length).toBeGreaterThan(0)
  })

  it('includes all known presets', () => {
    const presets = getAvailablePresets()
    expect(presets).toContain('default')
    expect(presets).toContain('conservative')
    expect(presets).toContain('aggressive')
    expect(presets).toContain('nlp-only')
    expect(presets).toContain('disabled')
  })

  it('returns exactly 5 presets', () => {
    expect(getAvailablePresets()).toHaveLength(5)
  })
})

// ============================================================================
// getPresetDescription
// ============================================================================

describe('getPresetDescription', () => {
  it('returns description for each preset', () => {
    for (const preset of getAvailablePresets()) {
      const desc = getPresetDescription(preset as AutoTagPreset)
      expect(desc).toBeDefined()
      expect(desc.length).toBeGreaterThan(0)
    }
  })

  it('returns meaningful descriptions', () => {
    expect(getPresetDescription('default')).toContain('Balanced')
    expect(getPresetDescription('conservative')).toContain('Fewer')
    expect(getPresetDescription('aggressive')).toContain('More')
    expect(getPresetDescription('nlp-only')).toContain('offline')
    expect(getPresetDescription('disabled')).toContain('disabled')
  })
})
