/**
 * Insight Settings Tests
 * @module __tests__/unit/lib/reflect/insightSettings.test
 *
 * Tests for insight generation user preferences and tier helpers.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  getInsightSettings,
  saveInsightSettings,
  resetInsightSettings,
  getTierConfig,
  tierRequiresAPI,
  tierIsLocal,
  TIER_DISPLAY_CONFIG,
  DEFAULT_INSIGHT_SETTINGS,
  type TierDisplayConfig,
} from '@/lib/reflect/insightSettings'
import type { InsightSettings, InsightTier } from '@/lib/reflect/types'

// Mock localStorage
let mockStorage: Record<string, string>

describe('Insight Settings', () => {
  beforeEach(() => {
    vi.resetModules()
    mockStorage = {}

    const mockLocalStorage = {
      getItem: (key: string) => mockStorage[key] ?? null,
      setItem: (key: string, value: string) => {
        mockStorage[key] = value
      },
      removeItem: (key: string) => {
        delete mockStorage[key]
      },
      clear: () => {
        mockStorage = {}
      },
    }

    vi.stubGlobal('localStorage', mockLocalStorage)
    vi.stubGlobal('window', { location: { origin: 'http://localhost:3000' } })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  // ============================================================================
  // DEFAULT_INSIGHT_SETTINGS
  // ============================================================================

  describe('DEFAULT_INSIGHT_SETTINGS', () => {
    it('has correct default values', () => {
      expect(DEFAULT_INSIGHT_SETTINGS.enabled).toBe(true)
      expect(DEFAULT_INSIGHT_SETTINGS.autoGenerate).toBe(false)
      expect(DEFAULT_INSIGHT_SETTINGS.preferredTier).toBe('auto')
      expect(DEFAULT_INSIGHT_SETTINGS.skipLLMForPrivacy).toBe(false)
      expect(DEFAULT_INSIGHT_SETTINGS.includeActionItems).toBe(true)
      expect(DEFAULT_INSIGHT_SETTINGS.includeGratitude).toBe(true)
      expect(DEFAULT_INSIGHT_SETTINGS.includeWritingPatterns).toBe(true)
      expect(DEFAULT_INSIGHT_SETTINGS.maxCostPerMonth).toBeUndefined()
    })
  })

  // ============================================================================
  // TIER_DISPLAY_CONFIG
  // ============================================================================

  describe('TIER_DISPLAY_CONFIG', () => {
    it('has 4 tier configurations', () => {
      expect(TIER_DISPLAY_CONFIG.length).toBe(4)
    })

    it('includes auto tier', () => {
      const autoTier = TIER_DISPLAY_CONFIG.find((t) => t.id === 'auto')
      expect(autoTier).toBeDefined()
      expect(autoTier?.label).toBe('Auto')
    })

    it('includes llm tier', () => {
      const llmTier = TIER_DISPLAY_CONFIG.find((t) => t.id === 'llm')
      expect(llmTier).toBeDefined()
      expect(llmTier?.requiresAPI).toBe(true)
      expect(llmTier?.isLocal).toBe(false)
    })

    it('includes bert tier', () => {
      const bertTier = TIER_DISPLAY_CONFIG.find((t) => t.id === 'bert')
      expect(bertTier).toBeDefined()
      expect(bertTier?.requiresAPI).toBe(false)
      expect(bertTier?.isLocal).toBe(true)
    })

    it('includes nlp tier', () => {
      const nlpTier = TIER_DISPLAY_CONFIG.find((t) => t.id === 'nlp')
      expect(nlpTier).toBeDefined()
      expect(nlpTier?.requiresAPI).toBe(false)
      expect(nlpTier?.isLocal).toBe(true)
    })

    it('all tiers have required properties', () => {
      TIER_DISPLAY_CONFIG.forEach((tier) => {
        expect(tier.id).toBeDefined()
        expect(tier.label).toBeDefined()
        expect(tier.description).toBeDefined()
        expect(tier.icon).toBeDefined()
        expect(tier.color).toBeDefined()
        expect(typeof tier.requiresAPI).toBe('boolean')
        expect(typeof tier.isLocal).toBe('boolean')
      })
    })
  })

  // ============================================================================
  // TierDisplayConfig type
  // ============================================================================

  describe('TierDisplayConfig type', () => {
    it('can create valid config', () => {
      const config: TierDisplayConfig = {
        id: 'auto',
        label: 'Automatic',
        description: 'Chooses best available',
        icon: 'sparkles',
        color: 'purple',
        requiresAPI: false,
        isLocal: false,
      }

      expect(config.id).toBe('auto')
      expect(config.icon).toBe('sparkles')
    })

    it('supports all icon types', () => {
      const icons: TierDisplayConfig['icon'][] = ['cloud', 'cpu', 'zap', 'sparkles']
      icons.forEach((icon) => {
        const config: TierDisplayConfig = {
          id: 'auto',
          label: 'Test',
          description: 'Test',
          icon,
          color: 'blue',
          requiresAPI: false,
          isLocal: false,
        }
        expect(config.icon).toBe(icon)
      })
    })
  })

  // ============================================================================
  // getInsightSettings
  // ============================================================================

  describe('getInsightSettings', () => {
    it('returns defaults when no stored settings', () => {
      const settings = getInsightSettings()
      expect(settings).toEqual(DEFAULT_INSIGHT_SETTINGS)
    })

    it('returns stored settings', () => {
      mockStorage['codex-insight-settings'] = JSON.stringify({
        enabled: false,
        autoGenerate: true,
      })

      const settings = getInsightSettings()
      expect(settings.enabled).toBe(false)
      expect(settings.autoGenerate).toBe(true)
      // Other fields should still have defaults
      expect(settings.preferredTier).toBe('auto')
    })

    it('merges with defaults for partial storage', () => {
      mockStorage['codex-insight-settings'] = JSON.stringify({
        preferredTier: 'llm',
      })

      const settings = getInsightSettings()
      expect(settings.preferredTier).toBe('llm')
      expect(settings.enabled).toBe(true) // Default
      expect(settings.includeActionItems).toBe(true) // Default
    })

    it('handles invalid JSON gracefully', () => {
      mockStorage['codex-insight-settings'] = 'not-valid-json'

      const settings = getInsightSettings()
      expect(settings).toEqual(DEFAULT_INSIGHT_SETTINGS)
    })

    it('returns defaults in SSR mode', async () => {
      vi.stubGlobal('window', undefined)
      vi.resetModules()

      const { getInsightSettings: getSettings } = await import('@/lib/reflect/insightSettings')
      const settings = getSettings()
      expect(settings).toEqual(DEFAULT_INSIGHT_SETTINGS)
    })
  })

  // ============================================================================
  // saveInsightSettings
  // ============================================================================

  describe('saveInsightSettings', () => {
    it('saves settings to localStorage', () => {
      saveInsightSettings({ enabled: false })

      const stored = JSON.parse(mockStorage['codex-insight-settings'])
      expect(stored.enabled).toBe(false)
    })

    it('merges with existing settings', () => {
      saveInsightSettings({ enabled: false })
      saveInsightSettings({ autoGenerate: true })

      const stored = JSON.parse(mockStorage['codex-insight-settings'])
      expect(stored.enabled).toBe(false)
      expect(stored.autoGenerate).toBe(true)
    })

    it('can save all settings', () => {
      saveInsightSettings({
        enabled: false,
        autoGenerate: true,
        preferredTier: 'bert',
        skipLLMForPrivacy: true,
        includeActionItems: false,
        includeGratitude: false,
        includeWritingPatterns: false,
        maxCostPerMonth: 5,
      })

      const stored = JSON.parse(mockStorage['codex-insight-settings'])
      expect(stored.preferredTier).toBe('bert')
      expect(stored.maxCostPerMonth).toBe(5)
    })

    it('does not throw in SSR mode', async () => {
      vi.stubGlobal('window', undefined)
      vi.resetModules()

      const { saveInsightSettings: save } = await import('@/lib/reflect/insightSettings')
      expect(() => save({ enabled: false })).not.toThrow()
    })
  })

  // ============================================================================
  // resetInsightSettings
  // ============================================================================

  describe('resetInsightSettings', () => {
    it('removes stored settings', () => {
      mockStorage['codex-insight-settings'] = JSON.stringify({ enabled: false })

      resetInsightSettings()

      expect(mockStorage['codex-insight-settings']).toBeUndefined()
    })

    it('getInsightSettings returns defaults after reset', () => {
      saveInsightSettings({ enabled: false, preferredTier: 'nlp' })
      resetInsightSettings()

      const settings = getInsightSettings()
      expect(settings).toEqual(DEFAULT_INSIGHT_SETTINGS)
    })

    it('does not throw in SSR mode', async () => {
      vi.stubGlobal('window', undefined)
      vi.resetModules()

      const { resetInsightSettings: reset } = await import('@/lib/reflect/insightSettings')
      expect(() => reset()).not.toThrow()
    })
  })

  // ============================================================================
  // getTierConfig
  // ============================================================================

  describe('getTierConfig', () => {
    it('returns config for auto tier', () => {
      const config = getTierConfig('auto')
      expect(config.id).toBe('auto')
      expect(config.label).toBe('Auto')
    })

    it('returns config for llm tier', () => {
      const config = getTierConfig('llm')
      expect(config.id).toBe('llm')
      expect(config.requiresAPI).toBe(true)
    })

    it('returns config for bert tier', () => {
      const config = getTierConfig('bert')
      expect(config.id).toBe('bert')
      expect(config.isLocal).toBe(true)
    })

    it('returns config for nlp tier', () => {
      const config = getTierConfig('nlp')
      expect(config.id).toBe('nlp')
      expect(config.isLocal).toBe(true)
    })

    it('returns fallback for unknown tier', () => {
      const config = getTierConfig('unknown' as any)
      expect(config).toBeDefined()
      expect(config.id).toBe('auto') // Falls back to first config
    })
  })

  // ============================================================================
  // tierRequiresAPI
  // ============================================================================

  describe('tierRequiresAPI', () => {
    it('returns false for auto', () => {
      expect(tierRequiresAPI('auto')).toBe(false)
    })

    it('returns true for llm', () => {
      expect(tierRequiresAPI('llm')).toBe(true)
    })

    it('returns false for bert', () => {
      expect(tierRequiresAPI('bert')).toBe(false)
    })

    it('returns false for nlp', () => {
      expect(tierRequiresAPI('nlp')).toBe(false)
    })
  })

  // ============================================================================
  // tierIsLocal
  // ============================================================================

  describe('tierIsLocal', () => {
    it('returns false for auto', () => {
      expect(tierIsLocal('auto')).toBe(false)
    })

    it('returns false for llm', () => {
      expect(tierIsLocal('llm')).toBe(false)
    })

    it('returns true for bert', () => {
      expect(tierIsLocal('bert')).toBe(true)
    })

    it('returns true for nlp', () => {
      expect(tierIsLocal('nlp')).toBe(true)
    })
  })

  // ============================================================================
  // InsightSettings type (from types.ts)
  // ============================================================================

  describe('InsightSettings type', () => {
    it('can create full settings object', () => {
      const settings: InsightSettings = {
        enabled: true,
        autoGenerate: false,
        preferredTier: 'auto',
        skipLLMForPrivacy: false,
        includeActionItems: true,
        includeGratitude: true,
        includeWritingPatterns: true,
        maxCostPerMonth: 10,
      }

      expect(settings.enabled).toBe(true)
      expect(settings.maxCostPerMonth).toBe(10)
    })

    it('supports all tier values', () => {
      const tiers: (InsightTier | 'auto')[] = ['auto', 'llm', 'bert', 'nlp']
      tiers.forEach((tier) => {
        const settings: InsightSettings = {
          ...DEFAULT_INSIGHT_SETTINGS,
          preferredTier: tier,
        }
        expect(settings.preferredTier).toBe(tier)
      })
    })
  })
})
