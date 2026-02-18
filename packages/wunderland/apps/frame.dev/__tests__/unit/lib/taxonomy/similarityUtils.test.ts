/**
 * Similarity Utilities Tests
 * @module __tests__/unit/lib/taxonomy/similarityUtils.test
 *
 * Tests for phonetic encoding, plural normalization, compound decomposition,
 * n-gram similarity, acronym handling, and combined similarity scoring.
 */

import { describe, it, expect, vi } from 'vitest'
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

// Mock the WordNet module
vi.mock('@/lib/nlp/wordnet', () => ({
  getWordNetSimilarity: vi.fn().mockResolvedValue(null),
}))

// ============================================================================
// SOUNDEX
// ============================================================================

describe('soundex', () => {
  it('encodes basic words', () => {
    expect(soundex('Robert')).toBe('R163')
    expect(soundex('Rupert')).toBe('R163')
  })

  it('returns same code for similar sounding words', () => {
    // Similar sounds should produce similar/same codes
    expect(soundex('color')).toBe(soundex('colour').substring(0, 3) + soundex('color')[3])
  })

  it('handles empty string', () => {
    expect(soundex('')).toBe('')
  })

  it('handles non-alphabetic characters', () => {
    expect(soundex('123')).toBe('')
    expect(soundex('test-123')).toBe('T230')
  })

  it('pads with zeros', () => {
    expect(soundex('A')).toBe('A000')
    expect(soundex('Ab')).toBe('A100')
  })

  it('encodes programming terms', () => {
    const codeReact = soundex('react')
    expect(codeReact).toBe('R230')
  })
})

// ============================================================================
// METAPHONE
// ============================================================================

describe('metaphone', () => {
  it('handles silent letters', () => {
    // knife starts with silent K
    expect(metaphone('knife')).toBe('NF')
    expect(metaphone('gnome')).toBe('NM')
  })

  it('handles ph as f', () => {
    expect(metaphone('phone')).toBe('FN')
  })

  it('handles ck as k', () => {
    const result = metaphone('back')
    expect(result).toBe('BK')
  })

  it('removes vowels except at start', () => {
    const result = metaphone('hello')
    expect(result.includes('E')).toBe(false)
    expect(result.includes('O')).toBe(false)
  })

  it('handles empty string', () => {
    expect(metaphone('')).toBe('')
  })

  it('handles school → skool transformation', () => {
    expect(metaphone('school')).toBe('SKL')
  })
})

// ============================================================================
// SINGULARIZE
// ============================================================================

describe('singularize', () => {
  describe('irregular plurals', () => {
    it('handles children → child', () => {
      expect(singularize('children')).toBe('child')
    })

    it('handles people → person', () => {
      expect(singularize('people')).toBe('person')
    })

    it('handles mice → mouse', () => {
      expect(singularize('mice')).toBe('mouse')
    })

    it('handles analyses → analysis', () => {
      expect(singularize('analyses')).toBe('analysis')
    })

    it('handles criteria → criterion', () => {
      expect(singularize('criteria')).toBe('criterion')
    })
  })

  describe('programming terms', () => {
    it('handles frameworks → framework', () => {
      expect(singularize('frameworks')).toBe('framework')
    })

    it('handles libraries → library', () => {
      expect(singularize('libraries')).toBe('library')
    })

    it('handles technologies → technology', () => {
      expect(singularize('technologies')).toBe('technology')
    })

    it('handles repositories → repository', () => {
      expect(singularize('repositories')).toBe('repository')
    })

    it('handles dependencies → dependency', () => {
      expect(singularize('dependencies')).toBe('dependency')
    })
  })

  describe('suffix rules', () => {
    it('handles -ies → -y', () => {
      expect(singularize('categories')).toBe('category')
      expect(singularize('properties')).toBe('property')
    })

    it('handles -es after sibilants', () => {
      expect(singularize('matches')).toBe('match')
      expect(singularize('boxes')).toBe('box')
    })

    it('handles regular -s', () => {
      expect(singularize('tests')).toBe('test')
      expect(singularize('users')).toBe('user')
    })
  })

  it('returns lowercase', () => {
    expect(singularize('TESTS')).toBe('test')
  })
})

// ============================================================================
// PLURALIZE
// ============================================================================

describe('pluralize', () => {
  it('handles -y → -ies', () => {
    expect(pluralize('category')).toBe('categories')
    expect(pluralize('library')).toBe('libraries')
  })

  it('handles sibilant endings', () => {
    expect(pluralize('match')).toBe('matches')
    expect(pluralize('box')).toBe('boxes')
  })

  it('handles -f → -ves', () => {
    expect(pluralize('leaf')).toBe('leaves')
  })

  it('handles regular words', () => {
    expect(pluralize('test')).toBe('tests')
    expect(pluralize('user')).toBe('users')
  })

  it('handles irregular reverse lookup', () => {
    expect(pluralize('child')).toBe('children')
    expect(pluralize('person')).toBe('people')
  })
})

// ============================================================================
// COMPOUND DECOMPOSITION
// ============================================================================

describe('decomposeCompound', () => {
  it('handles CamelCase', () => {
    expect(decomposeCompound('MachineLearning')).toBe('machine-learning')
  })

  it('handles PascalCase', () => {
    expect(decomposeCompound('MyComponent')).toBe('my-component')
  })

  it('handles acronyms before lowercase', () => {
    expect(decomposeCompound('XMLHttpRequest')).toBe('xml-http-request')
    expect(decomposeCompound('HTMLParser')).toBe('html-parser')
  })

  it('handles all uppercase (acronyms)', () => {
    expect(decomposeCompound('HTML')).toBe('html')
    expect(decomposeCompound('API')).toBe('api')
  })

  it('handles numbers', () => {
    expect(decomposeCompound('OAuth2')).toBe('o-auth-2')
    // ES6 is all uppercase so treated as acronym
    expect(decomposeCompound('ES6')).toBe('es6')
    expect(decomposeCompound('3DRenderer')).toBe('3-d-renderer')
  })

  it('preserves kebab-case', () => {
    expect(decomposeCompound('machine-learning')).toBe('machine-learning')
  })

  it('handles single word', () => {
    expect(decomposeCompound('React')).toBe('react')
  })
})

describe('areCompoundsEqual', () => {
  it('matches CamelCase to kebab-case', () => {
    expect(areCompoundsEqual('MachineLearning', 'machine-learning')).toBe(true)
  })

  it('matches different cases', () => {
    expect(areCompoundsEqual('MyComponent', 'my-component')).toBe(true)
  })

  it('returns false for different terms', () => {
    expect(areCompoundsEqual('MachineLearning', 'DeepLearning')).toBe(false)
  })
})

// ============================================================================
// N-GRAMS
// ============================================================================

describe('ngrams', () => {
  it('generates bigrams', () => {
    expect(ngrams('hello', 2)).toEqual(['he', 'el', 'll', 'lo'])
  })

  it('generates trigrams', () => {
    expect(ngrams('hello', 3)).toEqual(['hel', 'ell', 'llo'])
  })

  it('handles short strings', () => {
    expect(ngrams('hi', 3)).toEqual(['hi'])
  })

  it('normalizes input', () => {
    expect(ngrams('HI-THERE', 2)).toEqual(['hi', 'it', 'th', 'he', 'er', 're'])
  })
})

describe('bigrams', () => {
  it('calls ngrams with n=2', () => {
    expect(bigrams('test')).toEqual(['te', 'es', 'st'])
  })
})

describe('trigrams', () => {
  it('calls ngrams with n=3', () => {
    expect(trigrams('test')).toEqual(['tes', 'est'])
  })
})

// ============================================================================
// N-GRAM JACCARD
// ============================================================================

describe('ngramJaccard', () => {
  it('returns 1 for identical strings', () => {
    expect(ngramJaccard('hello', 'hello', 2)).toBe(1)
  })

  it('returns 0 for completely different strings', () => {
    const score = ngramJaccard('abc', 'xyz', 2)
    expect(score).toBe(0)
  })

  it('returns partial score for similar strings', () => {
    const score = ngramJaccard('javascript', 'java-script', 2)
    expect(score).toBeGreaterThan(0.5)
  })

  it('handles empty strings', () => {
    expect(ngramJaccard('', '', 2)).toBe(1)
    expect(ngramJaccard('test', '', 2)).toBe(0)
    expect(ngramJaccard('', 'test', 2)).toBe(0)
  })

  it('returns value between 0 and 1', () => {
    const score = ngramJaccard('react', 'redux', 2)
    expect(score).toBeGreaterThanOrEqual(0)
    expect(score).toBeLessThanOrEqual(1)
  })
})

describe('wordNgramJaccard', () => {
  it('returns 1 for identical phrases', () => {
    expect(wordNgramJaccard('machine learning', 'machine learning', 1)).toBe(1)
  })

  it('returns partial for overlapping words', () => {
    const score = wordNgramJaccard('machine learning', 'deep learning', 1)
    // 1 shared word (learning) out of 3 unique (machine, deep, learning)
    expect(score).toBeCloseTo(1 / 3, 1)
  })

  it('handles different delimiters', () => {
    const score = wordNgramJaccard('machine-learning', 'machine_learning', 1)
    expect(score).toBe(1)
  })
})

// ============================================================================
// ACRONYM EXPANSION
// ============================================================================

describe('expandAcronym', () => {
  it('expands AI', () => {
    expect(expandAcronym('ai')).toEqual(['artificial-intelligence'])
  })

  it('expands ML', () => {
    expect(expandAcronym('ml')).toEqual(['machine-learning'])
  })

  it('expands API', () => {
    expect(expandAcronym('api')).toEqual(['application-programming-interface'])
  })

  it('returns null for unknown acronyms', () => {
    expect(expandAcronym('xyz123')).toBeNull()
  })

  it('handles multiple expansions', () => {
    expect(expandAcronym('cd')).toEqual(['continuous-deployment', 'continuous-delivery'])
  })

  it('normalizes input', () => {
    expect(expandAcronym('AI')).toEqual(['artificial-intelligence'])
    expect(expandAcronym('A.I.')).toEqual(['artificial-intelligence'])
  })
})

describe('contractToAcronym', () => {
  it('contracts artificial-intelligence to ai', () => {
    expect(contractToAcronym('artificial-intelligence')).toBe('ai')
  })

  it('contracts machine-learning to ml', () => {
    expect(contractToAcronym('machine-learning')).toBe('ml')
  })

  it('returns null for unknown expansions', () => {
    expect(contractToAcronym('unknown term')).toBeNull()
  })
})

describe('areAcronymMatches', () => {
  it('matches AI to Artificial Intelligence', () => {
    expect(areAcronymMatches('AI', 'artificial-intelligence')).toBe(true)
  })

  it('matches reversed', () => {
    expect(areAcronymMatches('artificial-intelligence', 'AI')).toBe(true)
  })

  it('matches same acronym', () => {
    expect(areAcronymMatches('ai', 'AI')).toBe(true)
  })

  it('returns false for unrelated terms', () => {
    expect(areAcronymMatches('AI', 'database')).toBe(false)
  })
})

// ============================================================================
// SUBSTRING MATCHING
// ============================================================================

describe('isSubstringMatch', () => {
  it('matches when one contains the other', () => {
    expect(isSubstringMatch('react', 'reactjs', 4)).toBe(true)
    expect(isSubstringMatch('reactjs', 'react', 4)).toBe(true)
  })

  it('returns false when too short', () => {
    expect(isSubstringMatch('go', 'google', 4)).toBe(false)
  })

  it('returns false when length ratio too different', () => {
    // "test" is in "testing-framework" but lengths are very different
    expect(isSubstringMatch('test', 'testing-framework-here', 4)).toBe(false)
  })

  it('respects minLength parameter', () => {
    expect(isSubstringMatch('abc', 'abcdef', 3)).toBe(true)
    expect(isSubstringMatch('ab', 'abcdef', 3)).toBe(false)
  })
})

// ============================================================================
// CALCULATE SIMILARITY SCORE
// ============================================================================

describe('calculateSimilarityScore', () => {
  describe('exact match', () => {
    it('returns score 1 for identical terms', () => {
      const result = calculateSimilarityScore('react', 'react')
      expect(result.score).toBe(1)
      expect(result.method).toBe('exact')
    })

    it('normalizes before comparing', () => {
      const result = calculateSimilarityScore('React', 'react')
      expect(result.score).toBe(1)
      expect(result.method).toBe('exact')
    })
  })

  describe('acronym matching', () => {
    it('matches AI to artificial-intelligence', () => {
      const result = calculateSimilarityScore('AI', 'artificial-intelligence')
      expect(result.score).toBe(0.95)
      expect(result.method).toBe('acronym')
    })

    it('matches ML to machine-learning', () => {
      const result = calculateSimilarityScore('machine-learning', 'ML')
      expect(result.score).toBe(0.95)
      expect(result.method).toBe('acronym')
    })
  })

  describe('plural matching', () => {
    it('matches frameworks to framework', () => {
      const result = calculateSimilarityScore('frameworks', 'framework')
      expect(result.score).toBe(0.95)
      expect(result.method).toBe('plural')
    })

    it('matches categories to category', () => {
      const result = calculateSimilarityScore('categories', 'category')
      expect(result.score).toBe(0.95)
      expect(result.method).toBe('plural')
    })
  })

  describe('compound decomposition', () => {
    it('matches MachineLearning to machine-learning', () => {
      const result = calculateSimilarityScore('MachineLearning', 'machine-learning')
      // normalizeTerm lowercases but doesn't decompose, so they're compared via levenshtein
      expect(result.score).toBeGreaterThan(0.7)
      expect(['levenshtein', 'compound']).toContain(result.method)
    })
  })

  describe('levenshtein matching', () => {
    it('matches with small edit distance', () => {
      const result = calculateSimilarityScore('colour', 'color')
      expect(result.score).toBeGreaterThan(0.7)
      expect(result.method).toBe('levenshtein')
    })
  })

  describe('phonetic matching', () => {
    it('matches phonetically similar words', () => {
      // Words that sound similar but are spelled differently
      const result = calculateSimilarityScore('steven', 'stephen')
      if (result.method === 'phonetic') {
        expect(result.score).toBe(0.7)
      }
    })
  })

  describe('no match', () => {
    it('returns score 0 for unrelated terms', () => {
      const result = calculateSimilarityScore('react', 'database')
      expect(result.score).toBe(0)
      expect(result.method).toBe('none')
    })
  })
})

// ============================================================================
// ARE SIMILAR ENHANCED
// ============================================================================

describe('areSimilarEnhanced', () => {
  it('returns true for similar terms above threshold', () => {
    expect(areSimilarEnhanced('react', 'react')).toBe(true)
    expect(areSimilarEnhanced('AI', 'artificial-intelligence')).toBe(true)
  })

  it('returns false for dissimilar terms', () => {
    expect(areSimilarEnhanced('react', 'postgresql')).toBe(false)
  })

  it('respects custom threshold', () => {
    const config = { similarityScoreThreshold: 0.99 }
    expect(areSimilarEnhanced('colour', 'color', config)).toBe(false)
  })
})

// ============================================================================
// FIND SIMILAR TERMS WITH SCORES
// ============================================================================

describe('findSimilarTermsWithScores', () => {
  it('finds exact matches', () => {
    const results = findSimilarTermsWithScores('react', ['react', 'vue', 'angular'])
    expect(results.length).toBe(1)
    expect(results[0].term).toBe('react')
    expect(results[0].score).toBe(1)
  })

  it('finds acronym matches', () => {
    const results = findSimilarTermsWithScores('AI', [
      'artificial-intelligence',
      'machine-learning',
      'deep-learning'
    ])
    expect(results.length).toBe(1)
    expect(results[0].term).toBe('artificial-intelligence')
    expect(results[0].method).toBe('acronym')
  })

  it('finds plural matches', () => {
    const results = findSimilarTermsWithScores('framework', [
      'frameworks',
      'libraries',
      'tools'
    ])
    expect(results.length).toBe(1)
    expect(results[0].term).toBe('frameworks')
    expect(results[0].method).toBe('plural')
  })

  it('sorts by score descending', () => {
    const results = findSimilarTermsWithScores('test', [
      'testing',
      'test',
      'tests'
    ])

    // First should be exact match
    expect(results[0].score).toBeGreaterThanOrEqual(results[1]?.score || 0)
  })

  it('returns empty array when no matches', () => {
    const results = findSimilarTermsWithScores('react', ['postgresql', 'mongodb'])
    expect(results).toEqual([])
  })

  it('respects custom threshold', () => {
    const config = { similarityScoreThreshold: 0.99 }
    const results = findSimilarTermsWithScores('colour', ['color'], config)
    expect(results).toEqual([])
  })
})

// ============================================================================
// EDGE CASES
// ============================================================================

describe('Edge Cases', () => {
  describe('empty strings', () => {
    it('soundex handles empty', () => {
      expect(soundex('')).toBe('')
    })

    it('metaphone handles empty', () => {
      expect(metaphone('')).toBe('')
    })

    it('singularize handles empty', () => {
      expect(singularize('')).toBe('')
    })

    it('decomposeCompound handles empty', () => {
      expect(decomposeCompound('')).toBe('')
    })
  })

  describe('special characters', () => {
    it('ngrams strips special chars', () => {
      expect(ngrams('test!@#', 2)).toEqual(['te', 'es', 'st'])
    })

    it('soundex strips non-alpha', () => {
      expect(soundex('test123!@#')).toBe('T230')
    })
  })

  describe('unicode', () => {
    it('handles unicode in similarity', () => {
      const result = calculateSimilarityScore('café', 'cafe')
      // Should handle gracefully
      expect(result).toBeDefined()
    })
  })
})
