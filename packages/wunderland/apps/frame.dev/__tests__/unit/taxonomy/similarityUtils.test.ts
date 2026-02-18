/**
 * Unit Tests for Similarity Utils
 * @module __tests__/unit/taxonomy/similarityUtils.test
 *
 * Tests for all NLP-based similarity detection functions:
 * - Soundex (phonetic encoding)
 * - Metaphone (phonetic encoding)
 * - Singularize/Pluralize
 * - Compound decomposition
 * - N-gram Jaccard similarity
 * - Acronym expansion
 * - Combined similarity scoring
 */

import { describe, it, expect } from 'vitest'
import {
  soundex,
  metaphone,
  singularize,
  pluralize,
  decomposeCompound,
  areCompoundsEqual,
  ngrams,
  bigrams,
  trigrams,
  ngramJaccard,
  wordNgramJaccard,
  expandAcronym,
  contractToAcronym,
  areAcronymMatches,
  isSubstringMatch,
  calculateSimilarityScore,
  areSimilarEnhanced,
  findSimilarTermsWithScores,
} from '@/lib/taxonomy/similarityUtils'
import { createTaxonomyConfig } from '../../utils/factories'

describe('similarityUtils', () => {
  // ==========================================================================
  // SOUNDEX TESTS
  // ==========================================================================
  describe('soundex', () => {
    it('returns same code for similar sounding words', () => {
      // Classic soundex test cases
      expect(soundex('color')).toBe(soundex('colour'))
      expect(soundex('smith')).toBe(soundex('smyth'))
      expect(soundex('robert')).toBe(soundex('rupert'))
    })

    it('returns different codes for distinct words', () => {
      expect(soundex('react')).not.toBe(soundex('angular'))
      expect(soundex('python')).not.toBe(soundex('javascript'))
      expect(soundex('database')).not.toBe(soundex('server'))
    })

    it('handles empty and short strings', () => {
      expect(soundex('')).toBe('')
      expect(soundex('a')).toBe('A000')
      expect(soundex('ab')).toBe('A100')
    })

    it('produces 4-character codes', () => {
      expect(soundex('algorithm')).toHaveLength(4)
      expect(soundex('x')).toHaveLength(4)
      expect(soundex('supercalifragilistic')).toHaveLength(4)
    })

    it('starts with uppercase first letter', () => {
      expect(soundex('react')[0]).toBe('R')
      expect(soundex('javascript')[0]).toBe('J')
      expect(soundex('Python')[0]).toBe('P')
    })
  })

  // ==========================================================================
  // METAPHONE TESTS
  // ==========================================================================
  describe('metaphone', () => {
    it('handles common phonetic transformations', () => {
      // ph → f
      expect(metaphone('phone')).toBe(metaphone('fone'))
      // gh → g
      expect(metaphone('ghost').includes('G')).toBe(true)
      // kn → n
      expect(metaphone('knight').startsWith('N')).toBe(true)
    })

    it('removes vowels except at start', () => {
      const result = metaphone('algorithm')
      // Should have fewer characters due to vowel removal
      expect(result.length).toBeLessThan('algorithm'.length)
    })

    it('handles empty strings', () => {
      expect(metaphone('')).toBe('')
    })
  })

  // ==========================================================================
  // SINGULARIZE TESTS
  // ==========================================================================
  describe('singularize', () => {
    it('converts regular plurals to singular', () => {
      expect(singularize('frameworks')).toBe('framework')
      expect(singularize('components')).toBe('component')
      expect(singularize('tests')).toBe('test')
    })

    it('handles -ies plurals', () => {
      expect(singularize('categories')).toBe('category')
      expect(singularize('properties')).toBe('property')
      expect(singularize('libraries')).toBe('library')
    })

    it('handles -es plurals', () => {
      expect(singularize('boxes')).toBe('box')
      expect(singularize('matches')).toBe('match')
      expect(singularize('caches')).toBe('cache')
    })

    it('handles irregular plurals', () => {
      expect(singularize('children')).toBe('child')
      expect(singularize('people')).toBe('person')
      expect(singularize('analyses')).toBe('analysis')
      expect(singularize('criteria')).toBe('criterion')
    })

    it('preserves already singular words', () => {
      expect(singularize('component')).toBe('component')
      expect(singularize('test')).toBe('test')
    })
  })

  // ==========================================================================
  // PLURALIZE TESTS
  // ==========================================================================
  describe('pluralize', () => {
    it('adds -s for regular words', () => {
      expect(pluralize('test')).toBe('tests')
      expect(pluralize('component')).toBe('components')
    })

    it('adds -ies for -y endings', () => {
      expect(pluralize('category')).toBe('categories')
      expect(pluralize('property')).toBe('properties')
    })

    it('adds -es for -ch, -sh, -x, -z endings', () => {
      expect(pluralize('box')).toBe('boxes')
      expect(pluralize('match')).toBe('matches')
    })

    it('handles irregular plurals', () => {
      expect(pluralize('child')).toBe('children')
      expect(pluralize('person')).toBe('people')
    })
  })

  // ==========================================================================
  // COMPOUND DECOMPOSITION TESTS
  // ==========================================================================
  describe('decomposeCompound', () => {
    it('splits CamelCase to kebab-case', () => {
      expect(decomposeCompound('MachineLearning')).toBe('machine-learning')
      expect(decomposeCompound('artificialIntelligence')).toBe('artificial-intelligence')
      expect(decomposeCompound('ReactComponent')).toBe('react-component')
    })

    it('handles acronyms in compound words', () => {
      expect(decomposeCompound('XMLParser')).toBe('xml-parser')
      expect(decomposeCompound('HTMLElement')).toBe('html-element')
      expect(decomposeCompound('HTTPRequest')).toBe('http-request')
    })

    it('handles numbers in compound words', () => {
      expect(decomposeCompound('OAuth2')).toBe('o-auth-2')
      // ES6 is treated as all-uppercase acronym (including digits) and just lowercased
      expect(decomposeCompound('ES6')).toBe('es6')
      // Test number splitting with mixed case
      expect(decomposeCompound('Web3App')).toBe('web-3-app')
    })

    it('preserves already kebab-case strings', () => {
      expect(decomposeCompound('machine-learning')).toBe('machine-learning')
      expect(decomposeCompound('test-component')).toBe('test-component')
    })

    it('handles all-uppercase acronyms', () => {
      expect(decomposeCompound('API')).toBe('api')
      expect(decomposeCompound('HTML')).toBe('html')
    })
  })

  describe('areCompoundsEqual', () => {
    it('matches camelCase with kebab-case', () => {
      expect(areCompoundsEqual('MachineLearning', 'machine-learning')).toBe(true)
      expect(areCompoundsEqual('ReactComponent', 'react-component')).toBe(true)
    })

    it('returns false for different terms', () => {
      expect(areCompoundsEqual('MachineLearning', 'deep-learning')).toBe(false)
    })
  })

  // ==========================================================================
  // N-GRAM TESTS
  // ==========================================================================
  describe('ngrams', () => {
    it('generates correct n-grams', () => {
      expect(ngrams('hello', 2)).toEqual(['he', 'el', 'll', 'lo'])
      expect(ngrams('hello', 3)).toEqual(['hel', 'ell', 'llo'])
    })

    it('handles strings shorter than n', () => {
      expect(ngrams('ab', 3)).toEqual(['ab'])
      expect(ngrams('a', 2)).toEqual(['a'])
    })

    it('normalizes input', () => {
      // Should remove non-alphanumeric and lowercase
      expect(ngrams('Hello!', 2)).toEqual(['he', 'el', 'll', 'lo'])
    })
  })

  describe('bigrams', () => {
    it('generates 2-grams', () => {
      expect(bigrams('test')).toEqual(['te', 'es', 'st'])
    })
  })

  describe('trigrams', () => {
    it('generates 3-grams', () => {
      expect(trigrams('test')).toEqual(['tes', 'est'])
    })
  })

  describe('ngramJaccard', () => {
    it('returns 1.0 for identical strings', () => {
      expect(ngramJaccard('react', 'react', 2)).toBe(1.0)
    })

    it('returns high score for similar strings', () => {
      const score = ngramJaccard('javascript', 'java-script', 2)
      expect(score).toBeGreaterThan(0.5)
    })

    it('returns low score for different strings', () => {
      const score = ngramJaccard('react', 'angular', 2)
      expect(score).toBeLessThan(0.3)
    })

    it('handles empty strings', () => {
      expect(ngramJaccard('', '', 2)).toBe(1)
      expect(ngramJaccard('test', '', 2)).toBe(0)
      expect(ngramJaccard('', 'test', 2)).toBe(0)
    })
  })

  describe('wordNgramJaccard', () => {
    it('calculates word-level similarity', () => {
      const score = wordNgramJaccard('machine learning', 'deep learning', 1)
      expect(score).toBeCloseTo(1/3, 2) // 1 shared word out of 3 unique
    })

    it('returns 1.0 for identical phrases', () => {
      expect(wordNgramJaccard('machine learning', 'machine learning', 1)).toBe(1.0)
    })
  })

  // ==========================================================================
  // ACRONYM TESTS
  // ==========================================================================
  describe('expandAcronym', () => {
    it('expands known acronyms', () => {
      expect(expandAcronym('ai')).toContain('artificial-intelligence')
      expect(expandAcronym('ml')).toContain('machine-learning')
      expect(expandAcronym('nlp')).toContain('natural-language-processing')
      expect(expandAcronym('api')).toContain('application-programming-interface')
    })

    it('returns null for unknown acronyms', () => {
      expect(expandAcronym('xyz')).toBeNull()
      expect(expandAcronym('unknown')).toBeNull()
    })

    it('handles uppercase input', () => {
      expect(expandAcronym('AI')).toContain('artificial-intelligence')
      expect(expandAcronym('ML')).toContain('machine-learning')
    })
  })

  describe('contractToAcronym', () => {
    it('finds acronym for known expansions', () => {
      expect(contractToAcronym('artificial-intelligence')).toBe('ai')
      expect(contractToAcronym('machine-learning')).toBe('ml')
    })

    it('returns null for unknown terms', () => {
      expect(contractToAcronym('unknown-term')).toBeNull()
    })
  })

  describe('areAcronymMatches', () => {
    it('matches acronym to expansion', () => {
      expect(areAcronymMatches('AI', 'artificial-intelligence')).toBe(true)
      expect(areAcronymMatches('ml', 'machine-learning')).toBe(true)
    })

    it('matches expansion to acronym', () => {
      expect(areAcronymMatches('artificial-intelligence', 'AI')).toBe(true)
    })

    it('returns true for exact matches', () => {
      expect(areAcronymMatches('react', 'react')).toBe(true)
    })

    it('returns false for unrelated terms', () => {
      expect(areAcronymMatches('AI', 'machine-learning')).toBe(false)
    })
  })

  // ==========================================================================
  // SUBSTRING MATCHING TESTS
  // ==========================================================================
  describe('isSubstringMatch', () => {
    it('detects substring relationships with similar lengths', () => {
      // react (5) vs reactjs (7) - ratio 5/7 ≈ 0.71 > 0.5 ✓
      expect(isSubstringMatch('react', 'reactjs', 4)).toBe(true)
      // script (6) vs typescript (10) - ratio 6/10 = 0.6 > 0.5 ✓
      expect(isSubstringMatch('script', 'typescript', 4)).toBe(true)
    })

    it('rejects short substrings', () => {
      expect(isSubstringMatch('go', 'google', 4)).toBe(false)
      expect(isSubstringMatch('js', 'javascript', 4)).toBe(false)
    })

    it('rejects very different length strings (ratio < 0.5)', () => {
      // test (4) vs verylongstringtest (18) - ratio 4/18 ≈ 0.22 < 0.5 ✗
      expect(isSubstringMatch('test', 'verylongstringtest', 4)).toBe(false)
      // type (4) vs typescript (10) - ratio 4/10 = 0.4 < 0.5 ✗
      expect(isSubstringMatch('type', 'typescript', 4)).toBe(false)
    })

    it('works bidirectionally', () => {
      expect(isSubstringMatch('reactjs', 'react', 4)).toBe(true)
    })
  })

  // ==========================================================================
  // COMBINED SIMILARITY SCORING TESTS
  // ==========================================================================
  describe('calculateSimilarityScore', () => {
    const config = createTaxonomyConfig()

    it('returns 1.0 for exact matches', () => {
      const result = calculateSimilarityScore('react', 'react', config)
      expect(result.score).toBe(1.0)
      expect(result.method).toBe('exact')
    })

    it('detects acronym matches', () => {
      const result = calculateSimilarityScore('AI', 'artificial-intelligence', config)
      expect(result.score).toBeGreaterThanOrEqual(0.9)
      expect(result.method).toBe('acronym')
    })

    it('detects plural matches', () => {
      const result = calculateSimilarityScore('frameworks', 'framework', config)
      expect(result.score).toBeGreaterThanOrEqual(0.9)
      expect(result.method).toBe('plural')
    })

    it('detects compound decomposition matches', () => {
      // Note: normalizeTerm() lowercases before decomposeCompound is called,
      // so CamelCase → kebab comparison is handled by levenshtein (1 edit: hyphen)
      const result = calculateSimilarityScore('MachineLearning', 'machine-learning', config)
      expect(result.score).toBeGreaterThanOrEqual(0.7)
      // 'machinelearning' vs 'machine-learning' has edit distance 1 (hyphen)
      expect(result.method).toBe('levenshtein')
    })

    it('detects compound matches via areCompoundsEqual', () => {
      // Use areCompoundsEqual directly for raw compound comparison
      expect(areCompoundsEqual('MachineLearning', 'machine-learning')).toBe(true)
      expect(areCompoundsEqual('ReactComponent', 'react-component')).toBe(true)
    })

    it('detects levenshtein matches', () => {
      const result = calculateSimilarityScore('typscript', 'typescript', config)
      expect(result.score).toBeGreaterThanOrEqual(0.7)
      expect(result.method).toBe('levenshtein')
    })

    it('detects phonetic matches', () => {
      const result = calculateSimilarityScore('color', 'colour', config)
      // Either levenshtein or phonetic depending on edit distance
      expect(result.score).toBeGreaterThanOrEqual(0.7)
    })

    it('returns 0 for completely different terms', () => {
      const result = calculateSimilarityScore('react', 'python', config)
      expect(result.score).toBe(0)
      expect(result.method).toBe('none')
    })

    it('respects config flags', () => {
      const restrictedConfig = createTaxonomyConfig({
        enableAcronymExpansion: false,
        enablePluralNormalization: false,
        enableCompoundDecomposition: false,
        enablePhoneticMatching: false,
        enableNgramMatching: false,
      })

      // With all features disabled, should only match exact or levenshtein
      const acronymResult = calculateSimilarityScore('AI', 'artificial-intelligence', restrictedConfig)
      expect(acronymResult.method).not.toBe('acronym')
    })
  })

  describe('areSimilarEnhanced', () => {
    const config = createTaxonomyConfig()

    it('returns true for similar terms above threshold', () => {
      expect(areSimilarEnhanced('react', 'react', config)).toBe(true)
      expect(areSimilarEnhanced('AI', 'artificial-intelligence', config)).toBe(true)
    })

    it('returns false for dissimilar terms', () => {
      expect(areSimilarEnhanced('react', 'angular', config)).toBe(false)
    })

    it('respects custom threshold', () => {
      const highThreshold = createTaxonomyConfig({ similarityScoreThreshold: 0.99 })
      expect(areSimilarEnhanced('AI', 'artificial-intelligence', highThreshold)).toBe(false)
    })
  })

  describe('findSimilarTermsWithScores', () => {
    const config = createTaxonomyConfig()
    const existingTerms = ['react', 'typescript', 'machine-learning', 'framework']

    it('finds similar terms in a list', () => {
      const results = findSimilarTermsWithScores('AI', ['ai', 'artificial-intelligence', 'react'], config)
      expect(results.length).toBeGreaterThan(0)
      expect(results[0].score).toBeGreaterThanOrEqual(0.9)
    })

    it('returns results sorted by score (highest first)', () => {
      const results = findSimilarTermsWithScores('frameworks', existingTerms, config)
      if (results.length > 1) {
        expect(results[0].score).toBeGreaterThanOrEqual(results[1].score)
      }
    })

    it('includes method information', () => {
      // MachineLearning normalized to 'machinelearning', compared with 'machine-learning'
      // The match is via levenshtein (1 edit for hyphen) not compound
      const results = findSimilarTermsWithScores('MachineLearning', existingTerms, config)
      const match = results.find(r => r.term === 'machine-learning')
      expect(match?.method).toBe('levenshtein')
    })

    it('returns empty array for no matches', () => {
      const results = findSimilarTermsWithScores('python', existingTerms, config)
      expect(results).toEqual([])
    })
  })
})
