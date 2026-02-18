/**
 * Summarization Config Tests
 * @module __tests__/unit/lib/config/summarizationConfig.test
 *
 * Tests for summarization configuration types and utilities.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  DEFAULT_SUMMARIZATION_CONFIG,
  ALGORITHM_DESCRIPTIONS,
  getSummarizationAlgorithm,
  isAutoSummarizeEnabled,
  isSummarizationCachingEnabled,
  getSummarizationConfig,
  isBertAvailable,
  type SummarizationAlgorithm,
  type SummarizationConfig,
} from '@/lib/config/summarizationConfig'

describe('Summarization Config', () => {
  // ============================================================================
  // SummarizationAlgorithm type
  // ============================================================================

  describe('SummarizationAlgorithm type', () => {
    it('accepts bert algorithm', () => {
      const algo: SummarizationAlgorithm = 'bert'
      expect(algo).toBe('bert')
    })

    it('accepts tfidf algorithm', () => {
      const algo: SummarizationAlgorithm = 'tfidf'
      expect(algo).toBe('tfidf')
    })

    it('accepts lead-first algorithm', () => {
      const algo: SummarizationAlgorithm = 'lead-first'
      expect(algo).toBe('lead-first')
    })
  })

  // ============================================================================
  // SummarizationConfig interface
  // ============================================================================

  describe('SummarizationConfig interface', () => {
    it('creates config with all properties', () => {
      const config: SummarizationConfig = {
        algorithm: 'bert',
        autoSummarizeOnPublish: true,
        enableCaching: true,
        maxLength: 200,
        maxLengthPerBlock: 150,
      }
      expect(config.algorithm).toBe('bert')
      expect(config.autoSummarizeOnPublish).toBe(true)
      expect(config.enableCaching).toBe(true)
      expect(config.maxLength).toBe(200)
      expect(config.maxLengthPerBlock).toBe(150)
    })

    it('creates config with tfidf algorithm', () => {
      const config: SummarizationConfig = {
        algorithm: 'tfidf',
        autoSummarizeOnPublish: false,
        enableCaching: false,
        maxLength: 100,
        maxLengthPerBlock: 50,
      }
      expect(config.algorithm).toBe('tfidf')
    })

    it('creates config with lead-first algorithm', () => {
      const config: SummarizationConfig = {
        algorithm: 'lead-first',
        autoSummarizeOnPublish: true,
        enableCaching: false,
        maxLength: 300,
        maxLengthPerBlock: 200,
      }
      expect(config.algorithm).toBe('lead-first')
    })
  })

  // ============================================================================
  // DEFAULT_SUMMARIZATION_CONFIG constant
  // ============================================================================

  describe('DEFAULT_SUMMARIZATION_CONFIG', () => {
    it('has bert as default algorithm', () => {
      expect(DEFAULT_SUMMARIZATION_CONFIG.algorithm).toBe('bert')
    })

    it('has autoSummarizeOnPublish enabled', () => {
      expect(DEFAULT_SUMMARIZATION_CONFIG.autoSummarizeOnPublish).toBe(true)
    })

    it('has caching enabled', () => {
      expect(DEFAULT_SUMMARIZATION_CONFIG.enableCaching).toBe(true)
    })

    it('has maxLength of 200', () => {
      expect(DEFAULT_SUMMARIZATION_CONFIG.maxLength).toBe(200)
    })

    it('has maxLengthPerBlock of 150', () => {
      expect(DEFAULT_SUMMARIZATION_CONFIG.maxLengthPerBlock).toBe(150)
    })

    it('has all required properties', () => {
      expect(DEFAULT_SUMMARIZATION_CONFIG).toHaveProperty('algorithm')
      expect(DEFAULT_SUMMARIZATION_CONFIG).toHaveProperty('autoSummarizeOnPublish')
      expect(DEFAULT_SUMMARIZATION_CONFIG).toHaveProperty('enableCaching')
      expect(DEFAULT_SUMMARIZATION_CONFIG).toHaveProperty('maxLength')
      expect(DEFAULT_SUMMARIZATION_CONFIG).toHaveProperty('maxLengthPerBlock')
    })
  })

  // ============================================================================
  // ALGORITHM_DESCRIPTIONS constant
  // ============================================================================

  describe('ALGORITHM_DESCRIPTIONS', () => {
    it('has description for bert algorithm', () => {
      expect(ALGORITHM_DESCRIPTIONS.bert).toBeDefined()
      expect(ALGORITHM_DESCRIPTIONS.bert.name).toBe('BERT + TextRank')
      expect(ALGORITHM_DESCRIPTIONS.bert.description).toContain('BERT')
      expect(ALGORITHM_DESCRIPTIONS.bert.tradeoffs).toContain('quality')
    })

    it('has description for tfidf algorithm', () => {
      expect(ALGORITHM_DESCRIPTIONS.tfidf).toBeDefined()
      expect(ALGORITHM_DESCRIPTIONS.tfidf.name).toBe('TF-IDF + TextRank')
      expect(ALGORITHM_DESCRIPTIONS.tfidf.description).toContain('TF-IDF')
      expect(ALGORITHM_DESCRIPTIONS.tfidf.tradeoffs).toContain('Fast')
    })

    it('has description for lead-first algorithm', () => {
      expect(ALGORITHM_DESCRIPTIONS['lead-first']).toBeDefined()
      expect(ALGORITHM_DESCRIPTIONS['lead-first'].name).toBe('Lead Sentences')
      expect(ALGORITHM_DESCRIPTIONS['lead-first'].description).toContain('first sentences')
      expect(ALGORITHM_DESCRIPTIONS['lead-first'].tradeoffs).toContain('Instant')
    })

    it('has all three algorithms', () => {
      const algorithms = Object.keys(ALGORITHM_DESCRIPTIONS)
      expect(algorithms).toContain('bert')
      expect(algorithms).toContain('tfidf')
      expect(algorithms).toContain('lead-first')
      expect(algorithms).toHaveLength(3)
    })

    it('each algorithm has name, description, and tradeoffs', () => {
      const algorithms: SummarizationAlgorithm[] = ['bert', 'tfidf', 'lead-first']
      algorithms.forEach((algo) => {
        expect(ALGORITHM_DESCRIPTIONS[algo]).toHaveProperty('name')
        expect(ALGORITHM_DESCRIPTIONS[algo]).toHaveProperty('description')
        expect(ALGORITHM_DESCRIPTIONS[algo]).toHaveProperty('tradeoffs')
        expect(typeof ALGORITHM_DESCRIPTIONS[algo].name).toBe('string')
        expect(typeof ALGORITHM_DESCRIPTIONS[algo].description).toBe('string')
        expect(typeof ALGORITHM_DESCRIPTIONS[algo].tradeoffs).toBe('string')
      })
    })
  })

  // ============================================================================
  // getSummarizationAlgorithm function
  // ============================================================================

  describe('getSummarizationAlgorithm', () => {
    const originalEnv = process.env

    beforeEach(() => {
      vi.resetModules()
      process.env = { ...originalEnv }
    })

    afterEach(() => {
      process.env = originalEnv
    })

    it('returns bert by default', () => {
      delete process.env.NEXT_PUBLIC_SUMMARIZATION_ALGORITHM
      expect(getSummarizationAlgorithm()).toBe('bert')
    })

    it('returns tfidf when set', () => {
      process.env.NEXT_PUBLIC_SUMMARIZATION_ALGORITHM = 'tfidf'
      expect(getSummarizationAlgorithm()).toBe('tfidf')
    })

    it('returns lead-first when set', () => {
      process.env.NEXT_PUBLIC_SUMMARIZATION_ALGORITHM = 'lead-first'
      expect(getSummarizationAlgorithm()).toBe('lead-first')
    })

    it('returns bert for invalid value', () => {
      process.env.NEXT_PUBLIC_SUMMARIZATION_ALGORITHM = 'invalid'
      expect(getSummarizationAlgorithm()).toBe('bert')
    })

    it('returns bert for empty string', () => {
      process.env.NEXT_PUBLIC_SUMMARIZATION_ALGORITHM = ''
      expect(getSummarizationAlgorithm()).toBe('bert')
    })
  })

  // ============================================================================
  // isAutoSummarizeEnabled function
  // ============================================================================

  describe('isAutoSummarizeEnabled', () => {
    const originalEnv = process.env

    beforeEach(() => {
      vi.resetModules()
      process.env = { ...originalEnv }
    })

    afterEach(() => {
      process.env = originalEnv
    })

    it('returns true by default', () => {
      delete process.env.NEXT_PUBLIC_AUTO_SUMMARIZE_ON_PUBLISH
      expect(isAutoSummarizeEnabled()).toBe(true)
    })

    it('returns false when explicitly disabled', () => {
      process.env.NEXT_PUBLIC_AUTO_SUMMARIZE_ON_PUBLISH = 'false'
      expect(isAutoSummarizeEnabled()).toBe(false)
    })

    it('returns true when set to true', () => {
      process.env.NEXT_PUBLIC_AUTO_SUMMARIZE_ON_PUBLISH = 'true'
      expect(isAutoSummarizeEnabled()).toBe(true)
    })

    it('returns true for any value except false', () => {
      process.env.NEXT_PUBLIC_AUTO_SUMMARIZE_ON_PUBLISH = 'yes'
      expect(isAutoSummarizeEnabled()).toBe(true)
    })
  })

  // ============================================================================
  // isSummarizationCachingEnabled function
  // ============================================================================

  describe('isSummarizationCachingEnabled', () => {
    const originalEnv = process.env

    beforeEach(() => {
      vi.resetModules()
      process.env = { ...originalEnv }
    })

    afterEach(() => {
      process.env = originalEnv
    })

    it('returns true by default', () => {
      delete process.env.NEXT_PUBLIC_SUMMARIZATION_CACHING
      expect(isSummarizationCachingEnabled()).toBe(true)
    })

    it('returns false when explicitly disabled', () => {
      process.env.NEXT_PUBLIC_SUMMARIZATION_CACHING = 'false'
      expect(isSummarizationCachingEnabled()).toBe(false)
    })

    it('returns true when set to true', () => {
      process.env.NEXT_PUBLIC_SUMMARIZATION_CACHING = 'true'
      expect(isSummarizationCachingEnabled()).toBe(true)
    })
  })

  // ============================================================================
  // getSummarizationConfig function
  // ============================================================================

  describe('getSummarizationConfig', () => {
    const originalEnv = process.env

    beforeEach(() => {
      vi.resetModules()
      process.env = { ...originalEnv }
    })

    afterEach(() => {
      process.env = originalEnv
    })

    it('returns default config when no env vars set', () => {
      delete process.env.NEXT_PUBLIC_SUMMARIZATION_ALGORITHM
      delete process.env.NEXT_PUBLIC_AUTO_SUMMARIZE_ON_PUBLISH
      delete process.env.NEXT_PUBLIC_SUMMARIZATION_CACHING

      const config = getSummarizationConfig()
      expect(config.algorithm).toBe('bert')
      expect(config.autoSummarizeOnPublish).toBe(true)
      expect(config.enableCaching).toBe(true)
    })

    it('respects algorithm env var', () => {
      process.env.NEXT_PUBLIC_SUMMARIZATION_ALGORITHM = 'tfidf'
      const config = getSummarizationConfig()
      expect(config.algorithm).toBe('tfidf')
    })

    it('respects auto summarize env var', () => {
      process.env.NEXT_PUBLIC_AUTO_SUMMARIZE_ON_PUBLISH = 'false'
      const config = getSummarizationConfig()
      expect(config.autoSummarizeOnPublish).toBe(false)
    })

    it('respects caching env var', () => {
      process.env.NEXT_PUBLIC_SUMMARIZATION_CACHING = 'false'
      const config = getSummarizationConfig()
      expect(config.enableCaching).toBe(false)
    })

    it('uses default maxLength', () => {
      const config = getSummarizationConfig()
      expect(config.maxLength).toBe(DEFAULT_SUMMARIZATION_CONFIG.maxLength)
    })

    it('uses default maxLengthPerBlock', () => {
      const config = getSummarizationConfig()
      expect(config.maxLengthPerBlock).toBe(DEFAULT_SUMMARIZATION_CONFIG.maxLengthPerBlock)
    })

    it('combines multiple env var settings', () => {
      process.env.NEXT_PUBLIC_SUMMARIZATION_ALGORITHM = 'lead-first'
      process.env.NEXT_PUBLIC_AUTO_SUMMARIZE_ON_PUBLISH = 'false'
      process.env.NEXT_PUBLIC_SUMMARIZATION_CACHING = 'false'

      const config = getSummarizationConfig()
      expect(config.algorithm).toBe('lead-first')
      expect(config.autoSummarizeOnPublish).toBe(false)
      expect(config.enableCaching).toBe(false)
    })
  })

  // ============================================================================
  // isBertAvailable function
  // ============================================================================

  describe('isBertAvailable', () => {
    it('returns false in Node.js environment', () => {
      // In test environment (Node.js), window is undefined
      expect(isBertAvailable()).toBe(false)
    })
  })

  // ============================================================================
  // Algorithm selection scenarios
  // ============================================================================

  describe('algorithm selection scenarios', () => {
    it('bert is best for quality-focused use', () => {
      const description = ALGORITHM_DESCRIPTIONS.bert
      expect(description.tradeoffs.toLowerCase()).toContain('quality')
    })

    it('tfidf is best for fast offline use', () => {
      const description = ALGORITHM_DESCRIPTIONS.tfidf
      expect(description.tradeoffs.toLowerCase()).toContain('fast')
    })

    it('lead-first is best for instant results', () => {
      const description = ALGORITHM_DESCRIPTIONS['lead-first']
      expect(description.tradeoffs.toLowerCase()).toContain('instant')
    })
  })

  // ============================================================================
  // Config validation scenarios
  // ============================================================================

  describe('config validation scenarios', () => {
    it('maxLength should be positive', () => {
      expect(DEFAULT_SUMMARIZATION_CONFIG.maxLength).toBeGreaterThan(0)
    })

    it('maxLengthPerBlock should be positive', () => {
      expect(DEFAULT_SUMMARIZATION_CONFIG.maxLengthPerBlock).toBeGreaterThan(0)
    })

    it('maxLengthPerBlock should not exceed maxLength', () => {
      expect(DEFAULT_SUMMARIZATION_CONFIG.maxLengthPerBlock).toBeLessThanOrEqual(
        DEFAULT_SUMMARIZATION_CONFIG.maxLength
      )
    })
  })
})
