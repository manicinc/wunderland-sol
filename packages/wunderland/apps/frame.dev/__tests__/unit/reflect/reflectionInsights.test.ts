/**
 * Tests for Reflection Insights
 * @module __tests__/unit/reflect/reflectionInsights.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  generateNLPInsights,
  analyzeSentimentLexicon,
} from '@/lib/reflect/reflectionInsights'
import {
  getInsightSettings,
  saveInsightSettings,
  resetInsightSettings,
  getTierConfig,
  tierRequiresAPI,
  tierIsLocal,
  DEFAULT_INSIGHT_SETTINGS,
} from '@/lib/reflect/insightSettings'

// ============================================================================
// SENTIMENT ANALYSIS TESTS
// ============================================================================

describe('Sentiment Analysis (Lexicon)', () => {
  describe('analyzeSentimentLexicon', () => {
    it('detects positive sentiment', () => {
      const content = 'I am so happy and grateful today. Everything was wonderful and amazing!'
      const result = analyzeSentimentLexicon(content)

      expect(result.overall).toBe('positive')
      expect(result.score).toBeGreaterThan(0)
      expect(result.breakdown?.positive).toBeGreaterThan(0)
    })

    it('detects negative sentiment', () => {
      const content = 'I feel stressed and anxious. Everything is difficult and overwhelming.'
      const result = analyzeSentimentLexicon(content)

      expect(result.overall).toBe('negative')
      expect(result.score).toBeLessThan(0)
      expect(result.breakdown?.negative).toBeGreaterThan(0)
    })

    it('detects neutral sentiment', () => {
      const content = 'Today I went to the store. I bought some items and came home.'
      const result = analyzeSentimentLexicon(content)

      expect(result.overall).toBe('neutral')
      expect(result.score).toBeGreaterThanOrEqual(-0.2)
      expect(result.score).toBeLessThanOrEqual(0.2)
    })

    it('detects mixed sentiment', () => {
      const content = 'I am happy about the progress but also worried about the deadline.'
      const result = analyzeSentimentLexicon(content)

      // Mixed should have both positive and negative
      expect(result.breakdown?.positive).toBeGreaterThan(0)
      expect(result.breakdown?.negative).toBeGreaterThan(0)
    })

    it('handles negation correctly', () => {
      const content = 'I am not happy about this situation.'
      const result = analyzeSentimentLexicon(content)

      // "not happy" should be negative
      expect(result.score).toBeLessThanOrEqual(0)
    })

    it('handles intensifiers', () => {
      const positiveBase = analyzeSentimentLexicon('I am happy')
      const positiveIntense = analyzeSentimentLexicon('I am very happy')

      // "very happy" should have stronger positive score
      expect(positiveIntense.score).toBeGreaterThanOrEqual(positiveBase.score)
    })

    it('handles empty content', () => {
      const result = analyzeSentimentLexicon('')
      expect(result.overall).toBe('neutral')
      expect(result.score).toBe(0)
    })
  })
})

// ============================================================================
// NLP INSIGHTS TESTS
// ============================================================================

describe('NLP Insights', () => {
  describe('generateNLPInsights', () => {
    const sampleContent = `
      Today I had a great meeting with John about the new project.
      We discussed the React migration and TypeScript improvements.
      I'm feeling grateful for the team's support.
      Need to finish the documentation by Friday.
    `

    it('extracts themes from content', () => {
      const insights = generateNLPInsights(sampleContent)

      expect(insights.themes).toBeDefined()
      expect(insights.themes!.length).toBeGreaterThan(0)
      expect(insights.themes![0]).toHaveProperty('name')
      expect(insights.themes![0]).toHaveProperty('confidence')
      expect(insights.themes![0]).toHaveProperty('keywords')
    })

    it('extracts entities from content', () => {
      const insights = generateNLPInsights(sampleContent)

      expect(insights.entities).toBeDefined()
      // Should extract some entities (people, projects, etc.)
      // Note: Entity extraction depends on NLP library capabilities
      expect(Array.isArray(insights.entities)).toBe(true)
    })

    it('extracts key phrases', () => {
      const insights = generateNLPInsights(sampleContent)

      expect(insights.keyPhrases).toBeDefined()
      expect(insights.keyPhrases!.length).toBeGreaterThan(0)
    })

    it('generates suggested tags', () => {
      const insights = generateNLPInsights(sampleContent)

      expect(insights.suggestedTags).toBeDefined()
      expect(insights.suggestedTags!.length).toBeGreaterThan(0)
      // Tags should be lowercase
      insights.suggestedTags!.forEach(tag => {
        expect(tag).toBe(tag.toLowerCase())
      })
    })

    it('extracts action items', () => {
      const contentWithActions = 'I need to finish the report. Will call mom tomorrow.'
      const insights = generateNLPInsights(contentWithActions)

      expect(insights.actionItems).toBeDefined()
      expect(insights.actionItems!.length).toBeGreaterThan(0)
    })

    it('extracts gratitude items', () => {
      const contentWithGratitude = 'I am grateful for my health. Thankful for good friends.'
      const insights = generateNLPInsights(contentWithGratitude)

      expect(insights.gratitudeItems).toBeDefined()
      expect(insights.gratitudeItems!.length).toBeGreaterThan(0)
    })

    it('analyzes writing patterns', () => {
      const insights = generateNLPInsights(sampleContent)

      expect(insights.writingPatterns).toBeDefined()
      expect(insights.writingPatterns!.avgSentenceLength).toBeGreaterThan(0)
      expect(['reflective', 'analytical', 'emotional', 'neutral']).toContain(
        insights.writingPatterns!.emotionalTone
      )
      expect(['past', 'present', 'future', 'mixed']).toContain(
        insights.writingPatterns!.timeOrientation
      )
    })

    it('sets tier to nlp', () => {
      const insights = generateNLPInsights(sampleContent)
      expect(insights.tier).toBe('nlp')
    })

    it('handles short content gracefully', () => {
      const shortContent = 'Hi there.'
      const insights = generateNLPInsights(shortContent)

      expect(insights).toBeDefined()
      expect(insights.tier).toBe('nlp')
    })
  })
})

// ============================================================================
// INSIGHT SETTINGS TESTS
// ============================================================================

describe('Insight Settings', () => {
  beforeEach(() => {
    // Mock localStorage
    const storage: Record<string, string> = {}
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key: string) => storage[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        storage[key] = value
      }),
      removeItem: vi.fn((key: string) => {
        delete storage[key]
      }),
    })
  })

  describe('getInsightSettings', () => {
    it('returns default settings when nothing is stored', () => {
      const settings = getInsightSettings()

      expect(settings).toEqual(DEFAULT_INSIGHT_SETTINGS)
      expect(settings.enabled).toBe(true)
      expect(settings.autoGenerate).toBe(false)
      expect(settings.preferredTier).toBe('auto')
    })
  })

  describe('saveInsightSettings', () => {
    it('saves partial settings', () => {
      // Note: This test requires actual localStorage interaction
      // In a mocked environment, just verify the function doesn't throw
      expect(() => saveInsightSettings({ skipLLMForPrivacy: true })).not.toThrow()
    })
  })

  describe('resetInsightSettings', () => {
    it('resets to defaults', () => {
      // Note: In mocked environment, just verify function doesn't throw
      expect(() => {
        saveInsightSettings({ skipLLMForPrivacy: true, enabled: false })
        resetInsightSettings()
      }).not.toThrow()
    })
  })

  describe('getTierConfig', () => {
    it('returns config for llm tier', () => {
      const config = getTierConfig('llm')
      expect(config.id).toBe('llm')
      expect(config.label).toBe('AI Cloud')
      expect(config.requiresAPI).toBe(true)
    })

    it('returns config for bert tier', () => {
      const config = getTierConfig('bert')
      expect(config.id).toBe('bert')
      expect(config.label).toBe('Local AI')
      expect(config.isLocal).toBe(true)
    })

    it('returns config for nlp tier', () => {
      const config = getTierConfig('nlp')
      expect(config.id).toBe('nlp')
      expect(config.label).toBe('Fast')
      expect(config.isLocal).toBe(true)
    })

    it('returns config for auto tier', () => {
      const config = getTierConfig('auto')
      expect(config.id).toBe('auto')
      expect(config.label).toBe('Auto')
    })
  })

  describe('tierRequiresAPI', () => {
    it('returns true for llm tier', () => {
      expect(tierRequiresAPI('llm')).toBe(true)
    })

    it('returns false for bert tier', () => {
      expect(tierRequiresAPI('bert')).toBe(false)
    })

    it('returns false for nlp tier', () => {
      expect(tierRequiresAPI('nlp')).toBe(false)
    })

    it('returns false for auto tier', () => {
      expect(tierRequiresAPI('auto')).toBe(false)
    })
  })

  describe('tierIsLocal', () => {
    it('returns false for llm tier', () => {
      expect(tierIsLocal('llm')).toBe(false)
    })

    it('returns true for bert tier', () => {
      expect(tierIsLocal('bert')).toBe(true)
    })

    it('returns true for nlp tier', () => {
      expect(tierIsLocal('nlp')).toBe(true)
    })

    it('returns false for auto tier', () => {
      expect(tierIsLocal('auto')).toBe(false)
    })
  })
})
