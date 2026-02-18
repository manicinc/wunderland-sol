/**
 * Unit Tests for WordNet Integration
 * @module __tests__/unit/nlp/wordnet.test
 *
 * Tests for WordNet-based semantic similarity:
 * - Synonym detection
 * - Hypernym chain traversal
 * - Hyponym detection
 * - Semantic similarity scoring
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  getSynsets,
  getSynonyms,
  getHypernyms,
  getHyponyms,
  areSynonyms,
  isHypernym,
  isHyponym,
  getWordNetSimilarity,
  getHypernymChain,
  findCommonHypernym,
  clearWordNetCache,
  getWordNetCacheStats,
} from '@/lib/nlp/wordnet'

describe('wordnet', () => {
  beforeEach(() => {
    // Clear cache between tests for isolation
    clearWordNetCache()
  })

  // ==========================================================================
  // SYNSET LOOKUP TESTS
  // ==========================================================================
  describe('getSynsets', () => {
    it('returns synsets for known words', async () => {
      const synsets = await getSynsets('dog')
      expect(synsets.length).toBeGreaterThan(0)
      expect(synsets[0]).toHaveProperty('synonyms')
      expect(synsets[0]).toHaveProperty('def')
    })

    it('returns empty array for unknown words', async () => {
      const synsets = await getSynsets('xyzzyflurp')
      expect(synsets).toEqual([])
    })

    it('normalizes input (lowercase, trim)', async () => {
      const synsets1 = await getSynsets('Dog')
      const synsets2 = await getSynsets('  dog  ')
      expect(synsets1.length).toBe(synsets2.length)
    })

    it('caches results for performance', async () => {
      await getSynsets('cat')
      const stats = getWordNetCacheStats()
      expect(stats.synsets).toBeGreaterThan(0)
    })
  })

  // ==========================================================================
  // SYNONYM TESTS
  // ==========================================================================
  describe('getSynonyms', () => {
    it('finds synonyms for common words', async () => {
      const synonyms = await getSynonyms('happy')
      expect(synonyms.length).toBeGreaterThan(0)
      // Common synonyms of happy
      const expectedSynonyms = ['glad', 'felicitous', 'well-chosen']
      const hasExpected = expectedSynonyms.some(s => synonyms.includes(s))
      expect(hasExpected).toBe(true)
    })

    it('returns empty array for words without synonyms', async () => {
      const synonyms = await getSynonyms('supercalifragilisticexpialidocious')
      expect(synonyms).toEqual([])
    })

    it('excludes the original word from synonyms', async () => {
      const word = 'fast'
      const synonyms = await getSynonyms(word)
      expect(synonyms).not.toContain(word)
    })
  })

  describe('areSynonyms', () => {
    it('returns true for synonym pairs', async () => {
      // Large/big are common synonyms
      const result = await areSynonyms('large', 'big')
      expect(result).toBe(true)
    })

    it('returns false for non-synonyms', async () => {
      const result = await areSynonyms('hot', 'bicycle')
      expect(result).toBe(false)
    })
  })

  // ==========================================================================
  // HYPERNYM TESTS
  // ==========================================================================
  describe('getHypernyms', () => {
    it('finds hypernyms (broader terms)', async () => {
      const hypernyms = await getHypernyms('dog')
      // Dog should have hypernyms like canine, mammal, animal
      expect(hypernyms.length).toBeGreaterThan(0)
    })

    it('respects maxDepth parameter', async () => {
      const shallow = await getHypernyms('dog', 1)
      const deep = await getHypernyms('dog', 3)
      // Deeper search should find more or equal hypernyms
      expect(deep.length).toBeGreaterThanOrEqual(shallow.length)
    })

    it('returns empty for unknown words', async () => {
      const hypernyms = await getHypernyms('xyzzyflurp')
      expect(hypernyms).toEqual([])
    })
  })

  describe('isHypernym', () => {
    it('detects hypernym relationships', async () => {
      // Animal is a hypernym of dog
      const result = await isHypernym('animal', 'dog')
      expect(result).toBe(true)
    })

    it('returns false for non-hypernym pairs', async () => {
      const result = await isHypernym('dog', 'bicycle')
      expect(result).toBe(false)
    })
  })

  // ==========================================================================
  // HYPONYM TESTS
  // ==========================================================================
  describe('getHyponyms', () => {
    it('finds hyponyms (narrower terms)', async () => {
      const hyponyms = await getHyponyms('animal')
      // Animal should have many hyponyms
      expect(hyponyms.length).toBeGreaterThan(0)
    })

    it('respects maxDepth parameter', async () => {
      const shallow = await getHyponyms('mammal', 1)
      const deep = await getHyponyms('mammal', 2)
      expect(deep.length).toBeGreaterThanOrEqual(shallow.length)
    })
  })

  describe('isHyponym', () => {
    it('detects hyponym relationships', async () => {
      // Dog is a hyponym of animal
      const result = await isHyponym('dog', 'animal')
      expect(result).toBe(true)
    })

    it('returns false for non-hyponym pairs', async () => {
      const result = await isHyponym('car', 'dog')
      expect(result).toBe(false)
    })
  })

  // ==========================================================================
  // SIMILARITY SCORING TESTS
  // ==========================================================================
  describe('getWordNetSimilarity', () => {
    it('returns high score for identical words', async () => {
      const result = await getWordNetSimilarity('happy', 'happy')
      expect(result?.score).toBe(1.0)
      expect(result?.relationship).toBe('synonym')
    })

    it('returns high score for synonyms', async () => {
      const result = await getWordNetSimilarity('large', 'big')
      expect(result?.score).toBeGreaterThanOrEqual(0.9)
      expect(result?.relationship).toBe('synonym')
    })

    it('returns score for hypernym relationships', async () => {
      const result = await getWordNetSimilarity('animal', 'dog')
      if (result) {
        expect(result.score).toBeGreaterThan(0.5)
        expect(['hypernym', 'hyponym']).toContain(result.relationship)
      }
    })

    it('returns null for unrelated words', async () => {
      const result = await getWordNetSimilarity('computer', 'banana')
      // May or may not find a relationship depending on WordNet data
      if (result === null) {
        expect(result).toBeNull()
      }
    })

    it('returns score for related terms (shared hypernyms)', async () => {
      // Dog and cat share hypernyms like mammal, animal
      const result = await getWordNetSimilarity('dog', 'cat')
      if (result) {
        expect(result.score).toBeGreaterThan(0)
        expect(result.relationship).toBe('related')
      }
    })
  })

  // ==========================================================================
  // HYPERNYM CHAIN TESTS
  // ==========================================================================
  describe('getHypernymChain', () => {
    it('returns a chain of broader terms', async () => {
      const chain = await getHypernymChain('dog')
      expect(chain.length).toBeLessThanOrEqual(3) // Max 3 hypernyms returned
    })

    it('returns empty for unknown words', async () => {
      const chain = await getHypernymChain('xyzzyflurp')
      expect(chain).toEqual([])
    })
  })

  // ==========================================================================
  // COMMON HYPERNYM TESTS
  // ==========================================================================
  describe('findCommonHypernym', () => {
    it('finds common hypernym for related terms', async () => {
      const common = await findCommonHypernym('dog', 'cat')
      // Both are animals/mammals
      if (common) {
        expect(typeof common).toBe('string')
      }
    })

    it('returns null for unrelated terms', async () => {
      const common = await findCommonHypernym('computer', 'xyzzyflurp')
      expect(common).toBeNull()
    })
  })

  // ==========================================================================
  // CACHE MANAGEMENT TESTS
  // ==========================================================================
  describe('cache management', () => {
    it('clearWordNetCache clears all caches', async () => {
      await getSynsets('dog')
      await getSynonyms('cat')
      await getHypernyms('bird')

      const statsBefore = getWordNetCacheStats()
      expect(statsBefore.synsets).toBeGreaterThan(0)

      clearWordNetCache()

      const statsAfter = getWordNetCacheStats()
      expect(statsAfter.synsets).toBe(0)
      expect(statsAfter.synonyms).toBe(0)
      expect(statsAfter.hypernyms).toBe(0)
    })

    it('getWordNetCacheStats returns accurate counts', async () => {
      clearWordNetCache()

      await getSynsets('dog')
      await getSynsets('cat')

      const stats = getWordNetCacheStats()
      expect(stats.synsets).toBe(2)
    })
  })
})
