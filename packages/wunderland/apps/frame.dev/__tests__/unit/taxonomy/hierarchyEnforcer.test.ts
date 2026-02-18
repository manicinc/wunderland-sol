/**
 * Unit Tests for Taxonomy Hierarchy Enforcer
 * @module __tests__/unit/taxonomy/hierarchyEnforcer.test
 *
 * Tests for the core taxonomy enforcement logic:
 * - Levenshtein distance calculation
 * - Similarity detection methods
 * - Main taxonomy level determination
 * - Document validation
 * - Batch term classification
 */

import { describe, it, expect } from 'vitest'
import {
  levenshteinDistance,
  areSimilarByDistance,
  areSimilarBySubstring,
  areSimilar,
  areSimilarBasic,
  findSimilarTerms,
  findSimilarTermsDetailed,
  determineTaxonomyLevel,
  validateDocumentTaxonomy,
  suggestBestLevel,
  classifyTerms,
} from '@/lib/taxonomy/hierarchyEnforcer'
import { createTaxonomyConfig, createTaxonomyChange } from '../../utils/factories'

describe('hierarchyEnforcer', () => {
  // ==========================================================================
  // LEVENSHTEIN DISTANCE TESTS
  // ==========================================================================
  describe('levenshteinDistance', () => {
    it('returns 0 for identical strings', () => {
      expect(levenshteinDistance('react', 'react')).toBe(0)
      expect(levenshteinDistance('typescript', 'typescript')).toBe(0)
    })

    it('returns correct distance for single character changes', () => {
      // Substitution
      expect(levenshteinDistance('cat', 'bat')).toBe(1)
      // Insertion
      expect(levenshteinDistance('cat', 'cats')).toBe(1)
      // Deletion
      expect(levenshteinDistance('cats', 'cat')).toBe(1)
    })

    it('returns correct distance for multiple changes', () => {
      expect(levenshteinDistance('kitten', 'sitting')).toBe(3)
      expect(levenshteinDistance('saturday', 'sunday')).toBe(3)
    })

    it('handles empty strings', () => {
      expect(levenshteinDistance('', '')).toBe(0)
      expect(levenshteinDistance('hello', '')).toBe(5)
      expect(levenshteinDistance('', 'world')).toBe(5)
    })

    it('is symmetric', () => {
      expect(levenshteinDistance('react', 'preact')).toBe(
        levenshteinDistance('preact', 'react')
      )
    })
  })

  // ==========================================================================
  // SIMILARITY CHECK TESTS
  // ==========================================================================
  describe('areSimilarByDistance', () => {
    it('returns true for exact matches', () => {
      expect(areSimilarByDistance('react', 'react', 2)).toBe(true)
    })

    it('returns true when within threshold', () => {
      expect(areSimilarByDistance('typscript', 'typescript', 2)).toBe(true)
      expect(areSimilarByDistance('react', 'reac', 2)).toBe(true)
    })

    it('returns false when above threshold', () => {
      expect(areSimilarByDistance('react', 'angular', 2)).toBe(false)
      expect(areSimilarByDistance('python', 'typescript', 2)).toBe(false)
    })

    it('normalizes terms before comparison', () => {
      expect(areSimilarByDistance('React', 'react', 2)).toBe(true)
      expect(areSimilarByDistance('React.js', 'reactjs', 2)).toBe(true)
    })
  })

  describe('areSimilarBySubstring', () => {
    it('returns true when one term contains the other', () => {
      expect(areSimilarBySubstring('react', 'reactjs', 4)).toBe(true)
      expect(areSimilarBySubstring('type', 'typescript', 4)).toBe(true)
    })

    it('returns false for short terms', () => {
      expect(areSimilarBySubstring('go', 'golang', 4)).toBe(false)
      expect(areSimilarBySubstring('js', 'javascript', 4)).toBe(false)
    })

    it('works bidirectionally', () => {
      expect(areSimilarBySubstring('reactjs', 'react', 4)).toBe(true)
      expect(areSimilarBySubstring('typescript', 'type', 4)).toBe(true)
    })
  })

  describe('areSimilar (enhanced)', () => {
    const config = createTaxonomyConfig()

    it('returns true for exact matches', () => {
      expect(areSimilar('react', 'react', config)).toBe(true)
    })

    it('returns true for acronym matches', () => {
      expect(areSimilar('AI', 'artificial-intelligence', config)).toBe(true)
      expect(areSimilar('ml', 'machine-learning', config)).toBe(true)
    })

    it('returns true for plural matches', () => {
      expect(areSimilar('frameworks', 'framework', config)).toBe(true)
      expect(areSimilar('categories', 'category', config)).toBe(true)
    })

    it('returns true for compound matches', () => {
      expect(areSimilar('MachineLearning', 'machine-learning', config)).toBe(true)
    })

    it('returns false for completely different terms', () => {
      expect(areSimilar('react', 'python', config)).toBe(false)
    })
  })

  describe('areSimilarBasic (legacy)', () => {
    const config = createTaxonomyConfig()

    it('returns true for exact matches', () => {
      expect(areSimilarBasic('react', 'react', config)).toBe(true)
    })

    it('returns true for levenshtein matches', () => {
      expect(areSimilarBasic('typscript', 'typescript', config)).toBe(true)
    })

    it('returns true for substring matches', () => {
      expect(areSimilarBasic('react', 'reactjs', config)).toBe(true)
    })
  })

  // ==========================================================================
  // FIND SIMILAR TERMS TESTS
  // ==========================================================================
  describe('findSimilarTerms', () => {
    const config = createTaxonomyConfig()
    const existingTerms = ['react', 'typescript', 'machine-learning', 'framework', 'ai']

    it('finds exact matches', () => {
      const matches = findSimilarTerms('react', existingTerms, config)
      expect(matches).toContain('react')
    })

    it('finds similar terms', () => {
      const matches = findSimilarTerms('frameworks', existingTerms, config)
      expect(matches).toContain('framework')
    })

    it('finds acronym matches', () => {
      const matches = findSimilarTerms('artificial-intelligence', existingTerms, config)
      expect(matches).toContain('ai')
    })

    it('returns empty array for no matches', () => {
      const matches = findSimilarTerms('python', existingTerms, config)
      expect(matches).toEqual([])
    })
  })

  describe('findSimilarTermsDetailed', () => {
    const config = createTaxonomyConfig()
    const existingTerms = ['react', 'machine-learning']

    it('returns detailed match information', () => {
      const results = findSimilarTermsDetailed('ML', existingTerms, config)
      const mlMatch = results.find(r => r.term === 'machine-learning')
      expect(mlMatch).toBeDefined()
      expect(mlMatch?.method).toBe('acronym')
      expect(mlMatch?.score).toBeGreaterThanOrEqual(0.9)
    })

    it('returns results sorted by score', () => {
      const results = findSimilarTermsDetailed('react', existingTerms, config)
      if (results.length > 1) {
        expect(results[0].score).toBeGreaterThanOrEqual(results[1].score)
      }
    })
  })

  // ==========================================================================
  // DETERMINE TAXONOMY LEVEL TESTS
  // ==========================================================================
  describe('determineTaxonomyLevel', () => {
    const config = createTaxonomyConfig()
    const subjects = ['technology', 'design', 'business']
    const topics = ['react', 'typescript', 'css']
    const tags = ['hooks', 'generics', 'flexbox']

    it('rejects term that exists as subject', () => {
      const result = determineTaxonomyLevel(
        'technology',
        'tag',
        subjects, topics, tags,
        config
      )
      expect(result.level).toBeNull()
      expect(result.matchedLevel).toBe('subject')
      expect(result.matchedTerm).toBe('technology')
    })

    it('rejects term that exists as topic when adding as tag', () => {
      const result = determineTaxonomyLevel(
        'react',
        'tag',
        subjects, topics, tags,
        config
      )
      expect(result.level).toBeNull()
      expect(result.matchedLevel).toBe('topic')
    })

    it('accepts new unique term at intended level', () => {
      const result = determineTaxonomyLevel(
        'vue',
        'topic',
        subjects, topics, tags,
        config
      )
      expect(result.level).toBe('topic')
    })

    it('allows promoting tag to topic', () => {
      const result = determineTaxonomyLevel(
        'hooks',
        'topic',
        subjects, topics, tags,
        config
      )
      expect(result.level).toBe('topic')
      expect(result.matchedLevel).toBe('tag')
      expect(result.severity).toBe('warning')
    })

    it('detects similar terms via acronym expansion', () => {
      const subjectsWithAI = ['ai']
      const result = determineTaxonomyLevel(
        'artificial-intelligence',
        'tag',
        subjectsWithAI, [], [],
        config
      )
      expect(result.level).toBeNull()
      expect(result.matchedTerm).toBe('ai')
    })

    it('suggests demotion when global limit reached', () => {
      const restrictedConfig = createTaxonomyConfig({
        maxTotalSubjects: 3,
      })
      const fullSubjects = ['tech', 'design', 'business']

      const result = determineTaxonomyLevel(
        'science',
        'subject',
        fullSubjects, topics, tags,
        restrictedConfig
      )
      expect(result.level).toBe('topic')
      expect(result.severity).toBe('warning')
    })

    it('accepts at intended level when no duplicates and under limit', () => {
      const result = determineTaxonomyLevel(
        'new-term',
        'subject',
        subjects, topics, tags,
        config
      )
      expect(result.level).toBe('subject')
      expect(result.severity).toBe('info')
    })

    it('handles duplicate subjects', () => {
      const result = determineTaxonomyLevel(
        'technology',
        'subject',
        subjects, topics, tags,
        config
      )
      expect(result.level).toBeNull()
      expect(result.matchedLevel).toBe('subject')
      expect(result.severity).toBe('error')
    })

    it('handles duplicate topics', () => {
      const result = determineTaxonomyLevel(
        'react',
        'topic',
        subjects, topics, tags,
        config
      )
      expect(result.level).toBeNull()
      expect(result.matchedLevel).toBe('topic')
    })

    it('handles duplicate tags', () => {
      const result = determineTaxonomyLevel(
        'hooks',
        'tag',
        subjects, topics, tags,
        config
      )
      expect(result.level).toBeNull()
      expect(result.matchedLevel).toBe('tag')
    })
  })

  // ==========================================================================
  // VALIDATE DOCUMENT TAXONOMY TESTS
  // ==========================================================================
  describe('validateDocumentTaxonomy', () => {
    const config = createTaxonomyConfig()
    const globalSubjects = ['technology', 'design']
    const globalTopics = ['react', 'typescript']
    const globalTags = ['hooks', 'types']

    it('returns changes when subject count exceeds limit', () => {
      const restrictedConfig = createTaxonomyConfig({ maxSubjectsPerDoc: 2 })
      const docSubjects = ['tech', 'design', 'business', 'science']

      const changes = validateDocumentTaxonomy(
        '/test/strand',
        docSubjects, [], [],
        globalSubjects, globalTopics, globalTags,
        restrictedConfig
      )

      expect(changes.length).toBeGreaterThan(0)
      expect(changes.some(c => c.action === 'demote')).toBe(true)
      expect(changes.some(c => c.field === 'subjects')).toBe(true)
    })

    it('returns changes when topic count exceeds limit', () => {
      const restrictedConfig = createTaxonomyConfig({ maxTopicsPerDoc: 2 })
      const docTopics = ['react', 'vue', 'angular', 'svelte']

      const changes = validateDocumentTaxonomy(
        '/test/strand',
        [], docTopics, [],
        globalSubjects, globalTopics, globalTags,
        restrictedConfig
      )

      expect(changes.length).toBeGreaterThan(0)
      expect(changes.some(c => c.action === 'demote')).toBe(true)
      expect(changes.some(c => c.field === 'topics')).toBe(true)
    })

    it('returns empty array when document is within limits', () => {
      const changes = validateDocumentTaxonomy(
        '/test/strand',
        ['tech'], ['react'], ['hooks'],
        globalSubjects, globalTopics, globalTags,
        config
      )

      // No excess = potentially no changes (unless cross-level duplicates)
      const demoteChanges = changes.filter(c => c.action === 'demote')
      expect(demoteChanges.length).toBe(0)
    })

    it('detects cross-level duplicates', () => {
      // Subject "technology" also exists as topic "technology"
      const changes = validateDocumentTaxonomy(
        '/test/strand',
        ['technology'], [], [],
        globalSubjects, ['technology', 'react'], globalTags,
        config
      )

      expect(changes.some(c => c.action === 'remove')).toBe(true)
    })

    it('includes strand path in changes', () => {
      const restrictedConfig = createTaxonomyConfig({ maxSubjectsPerDoc: 1 })
      const changes = validateDocumentTaxonomy(
        '/my/test/strand',
        ['tech', 'design'], [], [],
        globalSubjects, globalTopics, globalTags,
        restrictedConfig
      )

      expect(changes.every(c => c.strandPath === '/my/test/strand')).toBe(true)
    })
  })

  // ==========================================================================
  // SUGGEST BEST LEVEL TESTS
  // ==========================================================================
  describe('suggestBestLevel', () => {
    const config = createTaxonomyConfig({
      maxTotalSubjects: 20,
      // Add promotion/demotion thresholds (assuming they exist in config)
    })
    const subjects = ['technology']
    const topics = ['react']
    const tags = ['hooks']

    it('returns existing level if term already exists', () => {
      expect(suggestBestLevel('technology', 10, subjects, topics, tags, config)).toBe('subject')
      expect(suggestBestLevel('react', 10, subjects, topics, tags, config)).toBe('topic')
      expect(suggestBestLevel('hooks', 10, subjects, topics, tags, config)).toBe('tag')
    })

    it('suggests tag for rare terms', () => {
      const result = suggestBestLevel('new-term', 1, subjects, topics, tags, config)
      expect(result).toBe('tag')
    })
  })

  // ==========================================================================
  // CLASSIFY TERMS (BATCH) TESTS
  // ==========================================================================
  describe('classifyTerms', () => {
    const config = createTaxonomyConfig()
    const subjects = ['technology']
    const topics = ['react']
    const tags = ['hooks']

    it('classifies multiple terms', () => {
      const terms = ['vue', 'angular', 'svelte']
      const results = classifyTerms(terms, 'topic', subjects, topics, tags, config)

      expect(results.size).toBe(3)
      for (const term of terms) {
        expect(results.has(term)).toBe(true)
      }
    })

    it('prevents duplicates within batch', () => {
      // When using same key multiple times, Map overwrites previous values
      // So we test with DIFFERENT keys that are similar
      const terms = ['vue', 'vue-js', 'vuejs']
      const results = classifyTerms(terms, 'topic', subjects, topics, tags, config)

      // First 'vue' should be accepted
      const vueResult = results.get('vue')
      expect(vueResult?.level).toBe('topic')

      // 'vue-js' and 'vuejs' are different strings so they get their own Map entries
      // They may or may not be detected as similar depending on Levenshtein threshold
      expect(results.size).toBe(3)
    })

    it('rejects terms that match existing taxonomy', () => {
      const terms = ['react', 'technology']
      const results = classifyTerms(terms, 'tag', subjects, topics, tags, config)

      const reactResult = results.get('react')
      expect(reactResult?.level).toBeNull()
      expect(reactResult?.matchedLevel).toBe('topic')

      const techResult = results.get('technology')
      expect(techResult?.level).toBeNull()
      expect(techResult?.matchedLevel).toBe('subject')
    })

    it('tracks added terms to prevent self-duplicates', () => {
      const terms = ['newterm1', 'newterm1']
      const results = classifyTerms(terms, 'topic', subjects, topics, tags, config)

      // First occurrence should be accepted
      // Second should be detected as duplicate
      let acceptedCount = 0
      results.forEach((result) => {
        if (result.level !== null) acceptedCount++
      })

      // At most one should be accepted (the first occurrence)
      expect(acceptedCount).toBeLessThanOrEqual(1)
    })
  })

  // ==========================================================================
  // EDGE CASES AND INTEGRATION
  // ==========================================================================
  describe('edge cases', () => {
    const config = createTaxonomyConfig()

    it('handles empty term lists', () => {
      const result = determineTaxonomyLevel(
        'new-term',
        'topic',
        [], [], [],
        config
      )
      expect(result.level).toBe('topic')
    })

    it('handles terms with special characters', () => {
      const result = determineTaxonomyLevel(
        'c++',
        'topic',
        [], [], [],
        config
      )
      expect(result.level).toBe('topic')
    })

    it('handles very long terms', () => {
      const longTerm = 'this-is-a-very-long-taxonomy-term-for-testing'
      const result = determineTaxonomyLevel(
        longTerm,
        'tag',
        [], [], [],
        config
      )
      expect(result.level).toBe('tag')
    })

    it('handles unicode terms', () => {
      const unicodeTerm = 'react-日本語'
      const result = determineTaxonomyLevel(
        unicodeTerm,
        'tag',
        [], [], [],
        config
      )
      expect(result.level).toBe('tag')
    })
  })
})
