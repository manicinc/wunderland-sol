/**
 * Summary Settings Tests
 * @module __tests__/unit/lib/settings/summarySettings.test
 *
 * Tests for summarization configuration constants and utilities.
 */

import { describe, it, expect } from 'vitest'
import {
  DEFAULT_BLOCK_VISIBILITY,
  DEFAULT_SUMMARIZATION_CONFIG,
  DEFAULT_ABSTRACTIVE_CONFIG,
  DEFAULT_SUMMARY_SETTINGS,
  FAST_SUMMARIZATION_CONFIG,
  QUALITY_SUMMARIZATION_CONFIG,
  TECHNICAL_BLOCK_VISIBILITY,
  MINIMAL_BLOCK_VISIBILITY,
  ALL_BLOCKS_VISIBILITY,
  mergeSummarizationConfig,
  mergeVisibilityConfig,
  mergeAbstractiveConfig,
  mergeSummarySettings,
  shouldShowBlockType,
  validateSummarizationConfig,
  getSummarizationPreset,
  getVisibilityPreset,
  getSummarizationPresetDescription,
  getVisibilityPresetDescription,
  getAvailableSummarizationPresets,
  getAvailableVisibilityPresets,
} from '@/lib/settings/summarySettings'

// ============================================================================
// DEFAULT_BLOCK_VISIBILITY
// ============================================================================

describe('DEFAULT_BLOCK_VISIBILITY', () => {
  it('is defined', () => {
    expect(DEFAULT_BLOCK_VISIBILITY).toBeDefined()
  })

  it('shows paragraphs by default', () => {
    expect(DEFAULT_BLOCK_VISIBILITY.showParagraphs).toBe(true)
  })

  it('shows lists by default', () => {
    expect(DEFAULT_BLOCK_VISIBILITY.showLists).toBe(true)
  })

  it('hides headings by default', () => {
    expect(DEFAULT_BLOCK_VISIBILITY.showHeadings).toBe(false)
  })

  it('hides code by default', () => {
    expect(DEFAULT_BLOCK_VISIBILITY.showCode).toBe(false)
  })

  it('shows blockquotes by default', () => {
    expect(DEFAULT_BLOCK_VISIBILITY.showBlockquotes).toBe(true)
  })

  it('hides tables by default', () => {
    expect(DEFAULT_BLOCK_VISIBILITY.showTables).toBe(false)
  })

  it('has all required properties', () => {
    expect(DEFAULT_BLOCK_VISIBILITY).toHaveProperty('showParagraphs')
    expect(DEFAULT_BLOCK_VISIBILITY).toHaveProperty('showLists')
    expect(DEFAULT_BLOCK_VISIBILITY).toHaveProperty('showHeadings')
    expect(DEFAULT_BLOCK_VISIBILITY).toHaveProperty('showCode')
    expect(DEFAULT_BLOCK_VISIBILITY).toHaveProperty('showBlockquotes')
    expect(DEFAULT_BLOCK_VISIBILITY).toHaveProperty('showTables')
  })
})

// ============================================================================
// DEFAULT_SUMMARIZATION_CONFIG
// ============================================================================

describe('DEFAULT_SUMMARIZATION_CONFIG', () => {
  it('is defined', () => {
    expect(DEFAULT_SUMMARIZATION_CONFIG).toBeDefined()
  })

  it('uses textrank algorithm', () => {
    expect(DEFAULT_SUMMARIZATION_CONFIG.algorithm).toBe('textrank')
  })

  it('has maxLength of 200', () => {
    expect(DEFAULT_SUMMARIZATION_CONFIG.maxLength).toBe(200)
  })

  it('has maxLengthPerBlock of 150', () => {
    expect(DEFAULT_SUMMARIZATION_CONFIG.maxLengthPerBlock).toBe(150)
  })

  it('has 20 textRank iterations', () => {
    expect(DEFAULT_SUMMARIZATION_CONFIG.textRankIterations).toBe(20)
  })

  it('has damping factor of 0.85', () => {
    expect(DEFAULT_SUMMARIZATION_CONFIG.dampingFactor).toBe(0.85)
  })

  it('has position bias weight of 0.2', () => {
    expect(DEFAULT_SUMMARIZATION_CONFIG.positionBiasWeight).toBe(0.2)
  })

  it('has entity density weight of 0.15', () => {
    expect(DEFAULT_SUMMARIZATION_CONFIG.entityDensityWeight).toBe(0.15)
  })

  it('uses BERT embeddings', () => {
    expect(DEFAULT_SUMMARIZATION_CONFIG.useBertEmbeddings).toBe(true)
  })

  it('has min similarity of 0.1', () => {
    expect(DEFAULT_SUMMARIZATION_CONFIG.minSimilarity).toBe(0.1)
  })

  it('weights sum to less than 1', () => {
    const sum =
      DEFAULT_SUMMARIZATION_CONFIG.positionBiasWeight +
      DEFAULT_SUMMARIZATION_CONFIG.entityDensityWeight
    expect(sum).toBeLessThanOrEqual(1)
  })
})

// ============================================================================
// DEFAULT_ABSTRACTIVE_CONFIG
// ============================================================================

describe('DEFAULT_ABSTRACTIVE_CONFIG', () => {
  it('is defined', () => {
    expect(DEFAULT_ABSTRACTIVE_CONFIG).toBeDefined()
  })

  it('is enabled by default', () => {
    expect(DEFAULT_ABSTRACTIVE_CONFIG.enabled).toBe(true)
  })

  it('uses auto provider by default', () => {
    expect(DEFAULT_ABSTRACTIVE_CONFIG.defaultProvider).toBe('auto')
  })

  it('has provider order', () => {
    expect(DEFAULT_ABSTRACTIVE_CONFIG.providerOrder).toEqual(['claude', 'openai', 'openrouter'])
  })

  it('uses concise style', () => {
    expect(DEFAULT_ABSTRACTIVE_CONFIG.style).toBe('concise')
  })

  it('has max cost per document of $0.10', () => {
    expect(DEFAULT_ABSTRACTIVE_CONFIG.maxCostPerDocument).toBe(0.1)
  })

  it('shows cost warning', () => {
    expect(DEFAULT_ABSTRACTIVE_CONFIG.showCostWarning).toBe(true)
  })

  it('does not auto-generate on import', () => {
    expect(DEFAULT_ABSTRACTIVE_CONFIG.autoGenerateOnImport).toBe(false)
  })
})

// ============================================================================
// Visibility Presets
// ============================================================================

describe('TECHNICAL_BLOCK_VISIBILITY', () => {
  it('shows code', () => {
    expect(TECHNICAL_BLOCK_VISIBILITY.showCode).toBe(true)
  })

  it('shows tables', () => {
    expect(TECHNICAL_BLOCK_VISIBILITY.showTables).toBe(true)
  })

  it('shows headings', () => {
    expect(TECHNICAL_BLOCK_VISIBILITY.showHeadings).toBe(true)
  })
})

describe('MINIMAL_BLOCK_VISIBILITY', () => {
  it('only shows paragraphs', () => {
    expect(MINIMAL_BLOCK_VISIBILITY.showParagraphs).toBe(true)
    expect(MINIMAL_BLOCK_VISIBILITY.showLists).toBe(false)
    expect(MINIMAL_BLOCK_VISIBILITY.showHeadings).toBe(false)
    expect(MINIMAL_BLOCK_VISIBILITY.showCode).toBe(false)
    expect(MINIMAL_BLOCK_VISIBILITY.showBlockquotes).toBe(false)
    expect(MINIMAL_BLOCK_VISIBILITY.showTables).toBe(false)
  })
})

describe('ALL_BLOCKS_VISIBILITY', () => {
  it('shows all block types', () => {
    expect(ALL_BLOCKS_VISIBILITY.showParagraphs).toBe(true)
    expect(ALL_BLOCKS_VISIBILITY.showLists).toBe(true)
    expect(ALL_BLOCKS_VISIBILITY.showHeadings).toBe(true)
    expect(ALL_BLOCKS_VISIBILITY.showCode).toBe(true)
    expect(ALL_BLOCKS_VISIBILITY.showBlockquotes).toBe(true)
    expect(ALL_BLOCKS_VISIBILITY.showTables).toBe(true)
  })
})

// ============================================================================
// Summarization Presets
// ============================================================================

describe('FAST_SUMMARIZATION_CONFIG', () => {
  it('uses lead-first algorithm', () => {
    expect(FAST_SUMMARIZATION_CONFIG.algorithm).toBe('lead-first')
  })

  it('does not use BERT embeddings', () => {
    expect(FAST_SUMMARIZATION_CONFIG.useBertEmbeddings).toBe(false)
  })
})

describe('QUALITY_SUMMARIZATION_CONFIG', () => {
  it('uses textrank algorithm', () => {
    expect(QUALITY_SUMMARIZATION_CONFIG.algorithm).toBe('textrank')
  })

  it('has more iterations than default', () => {
    expect(QUALITY_SUMMARIZATION_CONFIG.textRankIterations).toBeGreaterThan(
      DEFAULT_SUMMARIZATION_CONFIG.textRankIterations
    )
  })

  it('uses BERT embeddings', () => {
    expect(QUALITY_SUMMARIZATION_CONFIG.useBertEmbeddings).toBe(true)
  })
})

// ============================================================================
// mergeSummarizationConfig
// ============================================================================

describe('mergeSummarizationConfig', () => {
  it('returns defaults when no config provided', () => {
    const result = mergeSummarizationConfig()
    expect(result).toEqual(DEFAULT_SUMMARIZATION_CONFIG)
  })

  it('returns defaults when undefined provided', () => {
    const result = mergeSummarizationConfig(undefined)
    expect(result).toEqual(DEFAULT_SUMMARIZATION_CONFIG)
  })

  it('merges single property override', () => {
    const result = mergeSummarizationConfig({ maxLength: 300 })
    expect(result.maxLength).toBe(300)
    expect(result.algorithm).toBe(DEFAULT_SUMMARIZATION_CONFIG.algorithm)
  })

  it('merges multiple property overrides', () => {
    const result = mergeSummarizationConfig({
      algorithm: 'lead',
      maxLength: 500,
      useBertEmbeddings: false,
    })
    expect(result.algorithm).toBe('lead')
    expect(result.maxLength).toBe(500)
    expect(result.useBertEmbeddings).toBe(false)
  })
})

// ============================================================================
// mergeVisibilityConfig
// ============================================================================

describe('mergeVisibilityConfig', () => {
  it('returns defaults when no config provided', () => {
    const result = mergeVisibilityConfig()
    expect(result).toEqual(DEFAULT_BLOCK_VISIBILITY)
  })

  it('merges single property', () => {
    const result = mergeVisibilityConfig({ showCode: true })
    expect(result.showCode).toBe(true)
    expect(result.showParagraphs).toBe(DEFAULT_BLOCK_VISIBILITY.showParagraphs)
  })
})

// ============================================================================
// mergeAbstractiveConfig
// ============================================================================

describe('mergeAbstractiveConfig', () => {
  it('returns defaults when no config provided', () => {
    const result = mergeAbstractiveConfig()
    expect(result).toEqual(DEFAULT_ABSTRACTIVE_CONFIG)
  })

  it('merges single property', () => {
    const result = mergeAbstractiveConfig({ style: 'detailed' })
    expect(result.style).toBe('detailed')
    expect(result.defaultProvider).toBe(DEFAULT_ABSTRACTIVE_CONFIG.defaultProvider)
  })

  it('preserves provider order when provided', () => {
    const result = mergeAbstractiveConfig({ providerOrder: ['openai', 'claude'] })
    expect(result.providerOrder).toEqual(['openai', 'claude'])
  })
})

// ============================================================================
// mergeSummarySettings
// ============================================================================

describe('mergeSummarySettings', () => {
  it('returns defaults when no settings provided', () => {
    const result = mergeSummarySettings()
    expect(result).toEqual(DEFAULT_SUMMARY_SETTINGS)
  })

  it('merges partial extractive settings', () => {
    const result = mergeSummarySettings({
      extractive: { maxLength: 400 },
    })
    expect(result.extractive.maxLength).toBe(400)
    expect(result.extractive.algorithm).toBe(DEFAULT_SUMMARIZATION_CONFIG.algorithm)
    expect(result.abstractive).toEqual(DEFAULT_ABSTRACTIVE_CONFIG)
  })

  it('merges partial visibility settings', () => {
    const result = mergeSummarySettings({
      visibility: { showCode: true },
    })
    expect(result.visibility.showCode).toBe(true)
    expect(result.visibility.showParagraphs).toBe(DEFAULT_BLOCK_VISIBILITY.showParagraphs)
  })
})

// ============================================================================
// shouldShowBlockType
// ============================================================================

describe('shouldShowBlockType', () => {
  it('returns correct value for paragraph', () => {
    expect(shouldShowBlockType('paragraph', DEFAULT_BLOCK_VISIBILITY)).toBe(true)
    expect(shouldShowBlockType('paragraph', MINIMAL_BLOCK_VISIBILITY)).toBe(true)
  })

  it('returns correct value for heading', () => {
    expect(shouldShowBlockType('heading', DEFAULT_BLOCK_VISIBILITY)).toBe(false)
    expect(shouldShowBlockType('heading', TECHNICAL_BLOCK_VISIBILITY)).toBe(true)
  })

  it('returns correct value for code', () => {
    expect(shouldShowBlockType('code', DEFAULT_BLOCK_VISIBILITY)).toBe(false)
    expect(shouldShowBlockType('code', TECHNICAL_BLOCK_VISIBILITY)).toBe(true)
  })

  it('returns correct value for list', () => {
    expect(shouldShowBlockType('list', DEFAULT_BLOCK_VISIBILITY)).toBe(true)
    expect(shouldShowBlockType('list', MINIMAL_BLOCK_VISIBILITY)).toBe(false)
  })

  it('returns correct value for blockquote', () => {
    expect(shouldShowBlockType('blockquote', DEFAULT_BLOCK_VISIBILITY)).toBe(true)
  })

  it('returns correct value for table', () => {
    expect(shouldShowBlockType('table', DEFAULT_BLOCK_VISIBILITY)).toBe(false)
    expect(shouldShowBlockType('table', TECHNICAL_BLOCK_VISIBILITY)).toBe(true)
  })

  it('defaults to paragraph behavior for unknown types', () => {
    expect(shouldShowBlockType('unknown', DEFAULT_BLOCK_VISIBILITY)).toBe(true)
    expect(shouldShowBlockType('custom-block', MINIMAL_BLOCK_VISIBILITY)).toBe(true)
  })
})

// ============================================================================
// validateSummarizationConfig
// ============================================================================

describe('validateSummarizationConfig', () => {
  it('validates empty config as valid', () => {
    const result = validateSummarizationConfig({})
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('validates default config as valid', () => {
    const result = validateSummarizationConfig(DEFAULT_SUMMARIZATION_CONFIG)
    expect(result.valid).toBe(true)
  })

  describe('maxLength validation', () => {
    it('rejects maxLength < 10', () => {
      const result = validateSummarizationConfig({ maxLength: 5 })
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('maxLength must be at least 10 characters')
    })

    it('accepts maxLength >= 10', () => {
      const result = validateSummarizationConfig({ maxLength: 10 })
      expect(result.valid).toBe(true)
    })
  })

  describe('dampingFactor validation', () => {
    it('rejects negative damping factor', () => {
      const result = validateSummarizationConfig({ dampingFactor: -0.1 })
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('dampingFactor must be between 0 and 1')
    })

    it('rejects damping factor > 1', () => {
      const result = validateSummarizationConfig({ dampingFactor: 1.5 })
      expect(result.valid).toBe(false)
    })

    it('accepts valid damping factor', () => {
      expect(validateSummarizationConfig({ dampingFactor: 0 }).valid).toBe(true)
      expect(validateSummarizationConfig({ dampingFactor: 0.85 }).valid).toBe(true)
      expect(validateSummarizationConfig({ dampingFactor: 1 }).valid).toBe(true)
    })
  })

  describe('weight validation', () => {
    it('rejects negative positionBiasWeight', () => {
      const result = validateSummarizationConfig({ positionBiasWeight: -0.1 })
      expect(result.valid).toBe(false)
    })

    it('rejects negative entityDensityWeight', () => {
      const result = validateSummarizationConfig({ entityDensityWeight: -0.1 })
      expect(result.valid).toBe(false)
    })

    it('rejects weights that sum to > 1', () => {
      const result = validateSummarizationConfig({
        positionBiasWeight: 0.6,
        entityDensityWeight: 0.5,
      })
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.includes('must not exceed 1'))).toBe(true)
    })
  })

  describe('textRankIterations validation', () => {
    it('rejects iterations < 1', () => {
      const result = validateSummarizationConfig({ textRankIterations: 0 })
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('textRankIterations must be at least 1')
    })

    it('accepts iterations >= 1', () => {
      expect(validateSummarizationConfig({ textRankIterations: 1 }).valid).toBe(true)
      expect(validateSummarizationConfig({ textRankIterations: 100 }).valid).toBe(true)
    })
  })
})

// ============================================================================
// Preset Functions
// ============================================================================

describe('getSummarizationPreset', () => {
  it('returns default preset', () => {
    expect(getSummarizationPreset('default')).toEqual(DEFAULT_SUMMARIZATION_CONFIG)
  })

  it('returns fast preset', () => {
    expect(getSummarizationPreset('fast')).toEqual(FAST_SUMMARIZATION_CONFIG)
  })

  it('returns quality preset', () => {
    expect(getSummarizationPreset('quality')).toEqual(QUALITY_SUMMARIZATION_CONFIG)
  })

  it('returns copy not reference', () => {
    const preset1 = getSummarizationPreset('default')
    const preset2 = getSummarizationPreset('default')
    preset1.maxLength = 999
    expect(preset2.maxLength).toBe(DEFAULT_SUMMARIZATION_CONFIG.maxLength)
  })
})

describe('getVisibilityPreset', () => {
  it('returns default preset', () => {
    expect(getVisibilityPreset('default')).toEqual(DEFAULT_BLOCK_VISIBILITY)
  })

  it('returns minimal preset', () => {
    expect(getVisibilityPreset('minimal')).toEqual(MINIMAL_BLOCK_VISIBILITY)
  })

  it('returns technical preset', () => {
    expect(getVisibilityPreset('technical')).toEqual(TECHNICAL_BLOCK_VISIBILITY)
  })

  it('returns all preset', () => {
    expect(getVisibilityPreset('all')).toEqual(ALL_BLOCKS_VISIBILITY)
  })
})

describe('getAvailableSummarizationPresets', () => {
  it('returns array of presets', () => {
    const presets = getAvailableSummarizationPresets()
    expect(Array.isArray(presets)).toBe(true)
    expect(presets.length).toBeGreaterThan(0)
  })

  it('includes expected presets', () => {
    const presets = getAvailableSummarizationPresets()
    expect(presets).toContain('default')
    expect(presets).toContain('fast')
    expect(presets).toContain('quality')
    expect(presets).toContain('offline')
  })
})

describe('getAvailableVisibilityPresets', () => {
  it('returns array of presets', () => {
    const presets = getAvailableVisibilityPresets()
    expect(Array.isArray(presets)).toBe(true)
  })

  it('includes expected presets', () => {
    const presets = getAvailableVisibilityPresets()
    expect(presets).toContain('default')
    expect(presets).toContain('minimal')
    expect(presets).toContain('technical')
    expect(presets).toContain('all')
  })
})

describe('getSummarizationPresetDescription', () => {
  it('returns description for each preset', () => {
    const presets = getAvailableSummarizationPresets()
    presets.forEach((preset) => {
      const desc = getSummarizationPresetDescription(preset)
      expect(typeof desc).toBe('string')
      expect(desc.length).toBeGreaterThan(0)
    })
  })
})

describe('getVisibilityPresetDescription', () => {
  it('returns description for each preset', () => {
    const presets = getAvailableVisibilityPresets()
    presets.forEach((preset) => {
      const desc = getVisibilityPresetDescription(preset)
      expect(typeof desc).toBe('string')
      expect(desc.length).toBeGreaterThan(0)
    })
  })
})

// ============================================================================
// Integration Tests
// ============================================================================

describe('summarySettings integration', () => {
  it('all summarization presets pass validation', () => {
    const presets = getAvailableSummarizationPresets()
    presets.forEach((preset) => {
      const config = getSummarizationPreset(preset)
      const result = validateSummarizationConfig(config)
      expect(result.valid, `${preset} should be valid`).toBe(true)
    })
  })

  it('DEFAULT_SUMMARY_SETTINGS has consistent structure', () => {
    expect(DEFAULT_SUMMARY_SETTINGS.extractive).toEqual(DEFAULT_SUMMARIZATION_CONFIG)
    expect(DEFAULT_SUMMARY_SETTINGS.abstractive).toEqual(DEFAULT_ABSTRACTIVE_CONFIG)
    expect(DEFAULT_SUMMARY_SETTINGS.visibility).toEqual(DEFAULT_BLOCK_VISIBILITY)
  })

  it('merge then validate workflow', () => {
    const userConfig = { maxLength: 500, dampingFactor: 0.9 }
    const merged = mergeSummarizationConfig(userConfig)
    const validation = validateSummarizationConfig(merged)
    expect(validation.valid).toBe(true)
  })
})
