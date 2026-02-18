/**
 * Illustration Presets Tests
 * @module __tests__/unit/lib/images/illustrationPresets.test
 *
 * Tests for AI illustration style presets.
 */

import { describe, it, expect } from 'vitest'
import {
  ILLUSTRATION_PRESETS,
  getIllustrationPreset,
  getAllPresetIds,
  getAllPresets,
  getPresetsByCategory,
  getPresetsForContentType,
  findPresetByKeywords,
  getDefaultPreset,
  type IllustrationPreset,
  type IllustrationArtStyle,
  type IllustrationColorTreatment,
  type IllustrationDetailLevel,
  type IllustrationCategory,
} from '@/lib/images/illustrationPresets'

// ============================================================================
// ILLUSTRATION_PRESETS
// ============================================================================

describe('ILLUSTRATION_PRESETS', () => {
  describe('structure', () => {
    it('is a non-empty object', () => {
      expect(Object.keys(ILLUSTRATION_PRESETS).length).toBeGreaterThan(0)
    })

    it('each preset has required fields', () => {
      for (const [id, preset] of Object.entries(ILLUSTRATION_PRESETS)) {
        expect(preset.id).toBe(id)
        expect(preset.name).toBeDefined()
        expect(preset.description).toBeDefined()
        expect(preset.category).toBeDefined()
        expect(preset.promptPrefix).toBeDefined()
        expect(preset.promptSuffix).toBeDefined()
        expect(preset.negativePrompt).toBeDefined()
        expect(preset.artStyle).toBeDefined()
        expect(preset.colorTreatment).toBeDefined()
        expect(preset.detailLevel).toBeDefined()
        expect(preset.defaultStrategy).toBeDefined()
        expect(preset.suitableFor).toBeDefined()
        expect(preset.preferredProvider).toBeDefined()
      }
    })
  })

  describe('valid enum values', () => {
    const validArtStyles: IllustrationArtStyle[] = [
      'line-art', 'watercolor', 'editorial', 'photorealistic',
      'minimalist', 'diagram', 'cartoon', 'pencil-sketch'
    ]

    const validColorTreatments: IllustrationColorTreatment[] = [
      'muted', 'vibrant', 'monochrome', 'duotone', 'full-color'
    ]

    const validDetailLevels: IllustrationDetailLevel[] = [
      'minimal', 'moderate', 'detailed', 'highly-detailed'
    ]

    const validCategories: IllustrationCategory[] = [
      'narrative', 'technical', 'educational', 'artistic'
    ]

    it('all presets have valid art styles', () => {
      for (const preset of Object.values(ILLUSTRATION_PRESETS)) {
        expect(validArtStyles).toContain(preset.artStyle)
      }
    })

    it('all presets have valid color treatments', () => {
      for (const preset of Object.values(ILLUSTRATION_PRESETS)) {
        expect(validColorTreatments).toContain(preset.colorTreatment)
      }
    })

    it('all presets have valid detail levels', () => {
      for (const preset of Object.values(ILLUSTRATION_PRESETS)) {
        expect(validDetailLevels).toContain(preset.detailLevel)
      }
    })

    it('all presets have valid categories', () => {
      for (const preset of Object.values(ILLUSTRATION_PRESETS)) {
        expect(validCategories).toContain(preset.category)
      }
    })
  })

  describe('provider preferences', () => {
    it('all presets have valid provider', () => {
      for (const preset of Object.values(ILLUSTRATION_PRESETS)) {
        expect(['openai', 'replicate']).toContain(preset.preferredProvider)
      }
    })

    it('replicate presets have model preference', () => {
      for (const preset of Object.values(ILLUSTRATION_PRESETS)) {
        if (preset.preferredProvider === 'replicate') {
          expect(preset.modelPreference).toBeDefined()
        }
      }
    })
  })

  describe('specific presets', () => {
    it('has line-art-editorial preset', () => {
      expect(ILLUSTRATION_PRESETS['line-art-editorial']).toBeDefined()
      expect(ILLUSTRATION_PRESETS['line-art-editorial'].artStyle).toBe('line-art')
      expect(ILLUSTRATION_PRESETS['line-art-editorial'].colorTreatment).toBe('monochrome')
    })

    it('has technical-diagram preset', () => {
      expect(ILLUSTRATION_PRESETS['technical-diagram']).toBeDefined()
      expect(ILLUSTRATION_PRESETS['technical-diagram'].category).toBe('technical')
    })

    it('has childrens-cartoon preset', () => {
      expect(ILLUSTRATION_PRESETS['childrens-cartoon']).toBeDefined()
      expect(ILLUSTRATION_PRESETS['childrens-cartoon'].colorTreatment).toBe('vibrant')
    })

    it('has photorealistic-scene preset', () => {
      expect(ILLUSTRATION_PRESETS['photorealistic-scene']).toBeDefined()
      expect(ILLUSTRATION_PRESETS['photorealistic-scene'].detailLevel).toBe('highly-detailed')
    })
  })
})

// ============================================================================
// getIllustrationPreset
// ============================================================================

describe('getIllustrationPreset', () => {
  it('returns preset by ID', () => {
    const preset = getIllustrationPreset('line-art-editorial')
    expect(preset).toBeDefined()
    expect(preset?.name).toBe('Line Art Editorial')
  })

  it('returns undefined for unknown ID', () => {
    expect(getIllustrationPreset('unknown-preset')).toBeUndefined()
  })

  it('returns correct preset properties', () => {
    const preset = getIllustrationPreset('technical-diagram')
    expect(preset?.artStyle).toBe('diagram')
    expect(preset?.category).toBe('technical')
  })
})

// ============================================================================
// getAllPresetIds
// ============================================================================

describe('getAllPresetIds', () => {
  it('returns array of preset IDs', () => {
    const ids = getAllPresetIds()
    expect(Array.isArray(ids)).toBe(true)
    expect(ids.length).toBeGreaterThan(0)
  })

  it('includes all preset IDs', () => {
    const ids = getAllPresetIds()
    expect(ids).toContain('line-art-editorial')
    expect(ids).toContain('technical-diagram')
    expect(ids).toContain('childrens-cartoon')
  })

  it('matches Object.keys of ILLUSTRATION_PRESETS', () => {
    const ids = getAllPresetIds()
    expect(ids).toEqual(Object.keys(ILLUSTRATION_PRESETS))
  })
})

// ============================================================================
// getAllPresets
// ============================================================================

describe('getAllPresets', () => {
  it('returns array of presets', () => {
    const presets = getAllPresets()
    expect(Array.isArray(presets)).toBe(true)
    expect(presets.length).toBeGreaterThan(0)
  })

  it('each item is a valid preset', () => {
    const presets = getAllPresets()
    for (const preset of presets) {
      expect(preset.id).toBeDefined()
      expect(preset.name).toBeDefined()
    }
  })

  it('count matches ILLUSTRATION_PRESETS', () => {
    const presets = getAllPresets()
    expect(presets.length).toBe(Object.keys(ILLUSTRATION_PRESETS).length)
  })
})

// ============================================================================
// getPresetsByCategory
// ============================================================================

describe('getPresetsByCategory', () => {
  it('returns narrative presets', () => {
    const presets = getPresetsByCategory('narrative')
    expect(presets.length).toBeGreaterThan(0)
    expect(presets.every(p => p.category === 'narrative')).toBe(true)
  })

  it('returns technical presets', () => {
    const presets = getPresetsByCategory('technical')
    expect(presets.length).toBeGreaterThan(0)
    expect(presets.every(p => p.category === 'technical')).toBe(true)
  })

  it('returns artistic presets', () => {
    const presets = getPresetsByCategory('artistic')
    expect(presets.length).toBeGreaterThan(0)
    expect(presets.every(p => p.category === 'artistic')).toBe(true)
  })

  it('returns empty array for nonexistent category', () => {
    const presets = getPresetsByCategory('nonexistent' as any)
    expect(presets).toEqual([])
  })
})

// ============================================================================
// getPresetsForContentType
// ============================================================================

describe('getPresetsForContentType', () => {
  it('returns presets for fiction content', () => {
    const presets = getPresetsForContentType('fiction')
    expect(presets.length).toBeGreaterThan(0)
  })

  it('returns presets for technical content', () => {
    const presets = getPresetsForContentType('technical')
    expect(presets.length).toBeGreaterThan(0)
  })

  it('returns presets for children content', () => {
    const presets = getPresetsForContentType('children')
    expect(presets.length).toBeGreaterThan(0)
  })

  it('is case-insensitive', () => {
    const lower = getPresetsForContentType('fiction')
    const upper = getPresetsForContentType('FICTION')
    expect(lower.length).toBe(upper.length)
  })

  it('returns empty for unmatched content type', () => {
    const presets = getPresetsForContentType('xyznonexistent')
    expect(presets).toEqual([])
  })
})

// ============================================================================
// findPresetByKeywords
// ============================================================================

describe('findPresetByKeywords', () => {
  it('finds preset for technical keywords', () => {
    const preset = findPresetByKeywords(['technical', 'diagram', 'architecture'])
    expect(preset).toBeDefined()
    expect(preset?.id).toBe('technical-diagram')
  })

  it('finds preset for children keywords', () => {
    const preset = findPresetByKeywords(['children', 'playful', 'colorful'])
    expect(preset).toBeDefined()
    expect(preset?.id).toBe('childrens-cartoon')
  })

  it('finds preset for noir keywords', () => {
    const preset = findPresetByKeywords(['noir', 'dark', 'thriller'])
    expect(preset).toBeDefined()
    expect(preset?.id).toBe('noir-graphic-novel')
  })

  it('finds preset for sketch keywords', () => {
    const preset = findPresetByKeywords(['sketch', 'hand-drawn', 'journal'])
    expect(preset).toBeDefined()
    expect(preset?.id).toBe('pencil-sketch')
  })

  it('finds preset for minimalist keywords', () => {
    const preset = findPresetByKeywords(['minimal', 'concept', 'abstract'])
    expect(preset).toBeDefined()
    expect(preset?.id).toBe('minimalist-symbolic')
  })

  it('returns null for no matching keywords', () => {
    const preset = findPresetByKeywords(['xyznonexistent', 'abcunknown'])
    expect(preset).toBeNull()
  })

  it('handles empty keywords', () => {
    const preset = findPresetByKeywords([])
    expect(preset).toBeNull()
  })

  it('is case-insensitive', () => {
    const preset1 = findPresetByKeywords(['TECHNICAL', 'DIAGRAM'])
    const preset2 = findPresetByKeywords(['technical', 'diagram'])
    expect(preset1?.id).toBe(preset2?.id)
  })

  it('returns best match when multiple could match', () => {
    // Should return highest scoring match
    const preset = findPresetByKeywords(['editorial', 'clean', 'professional'])
    expect(preset).toBeDefined()
  })
})

// ============================================================================
// getDefaultPreset
// ============================================================================

describe('getDefaultPreset', () => {
  it('returns line-art-editorial as default', () => {
    const preset = getDefaultPreset()
    expect(preset.id).toBe('line-art-editorial')
  })

  it('returns valid preset', () => {
    const preset = getDefaultPreset()
    expect(preset.name).toBeDefined()
    expect(preset.promptPrefix).toBeDefined()
    expect(preset.category).toBeDefined()
  })

  it('returns same preset as getIllustrationPreset', () => {
    const defaultPreset = getDefaultPreset()
    const explicitPreset = getIllustrationPreset('line-art-editorial')
    expect(defaultPreset).toEqual(explicitPreset)
  })
})

// ============================================================================
// Prompt quality checks
// ============================================================================

describe('Prompt Quality', () => {
  it('all presets have non-empty prompts', () => {
    for (const preset of getAllPresets()) {
      expect(preset.promptPrefix.length).toBeGreaterThan(10)
      expect(preset.promptSuffix.length).toBeGreaterThan(10)
      expect(preset.negativePrompt.length).toBeGreaterThan(5)
    }
  })

  it('negative prompts contain relevant exclusions', () => {
    const lineArt = getIllustrationPreset('line-art-editorial')
    expect(lineArt?.negativePrompt).toContain('color')

    const technical = getIllustrationPreset('technical-diagram')
    expect(technical?.negativePrompt).toContain('artistic')

    const photorealistic = getIllustrationPreset('photorealistic-scene')
    expect(photorealistic?.negativePrompt).toContain('cartoon')
  })

  it('prompt suffix provides meaningful guidance', () => {
    for (const preset of getAllPresets()) {
      // Suffix should be substantial (more than just a few words)
      expect(preset.promptSuffix.length).toBeGreaterThan(20)
      // Should contain descriptive terms
      expect(preset.promptSuffix.split(' ').length).toBeGreaterThan(3)
    }
  })
})

// ============================================================================
// suitableFor mapping
// ============================================================================

describe('suitableFor mapping', () => {
  it('all presets have at least one suitable content type', () => {
    for (const preset of getAllPresets()) {
      expect(preset.suitableFor.length).toBeGreaterThan(0)
    }
  })

  it('narrative presets are suitable for fiction', () => {
    const narrative = getPresetsByCategory('narrative')
    for (const preset of narrative) {
      const hasFiction = preset.suitableFor.some(s => s.includes('fiction'))
      expect(hasFiction).toBe(true)
    }
  })

  it('technical presets are suitable for technical content', () => {
    const technical = getPresetsByCategory('technical')
    for (const preset of technical) {
      const hasTechnical = preset.suitableFor.some(s => s.includes('technical'))
      expect(hasTechnical).toBe(true)
    }
  })
})

// ============================================================================
// Strategy validation
// ============================================================================

describe('Strategy validation', () => {
  it('all presets have valid default strategy', () => {
    const validStrategies = ['seed', 'reference', 'style-transfer']
    for (const preset of getAllPresets()) {
      expect(validStrategies).toContain(preset.defaultStrategy)
    }
  })

  it('consistent presets use seed strategy', () => {
    // Line art and minimalist tend to use seed for consistency
    const lineArt = getIllustrationPreset('line-art-editorial')
    expect(lineArt?.defaultStrategy).toBe('seed')

    const minimalist = getIllustrationPreset('minimalist-symbolic')
    expect(minimalist?.defaultStrategy).toBe('seed')
  })

  it('artistic presets may use reference strategy', () => {
    const watercolor = getIllustrationPreset('muted-watercolor')
    expect(['reference', 'seed']).toContain(watercolor?.defaultStrategy)
  })
})
