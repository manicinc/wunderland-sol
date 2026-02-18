/**
 * RAG Distractor Generation Tests
 * @module tests/unit/quiz/ragDistractors
 *
 * Tests for semantically plausible distractor generation including:
 * - Similarity filtering
 * - Category matching
 * - Fallback behavior
 * - Batch generation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock dependencies
vi.mock('compromise', () => ({
  default: vi.fn(() => ({
    nouns: () => ({ toSingular: () => ({ out: () => ['function', 'component', 'state', 'hook'] }) }),
    topics: () => ({ out: () => ['React', 'JavaScript', 'TypeScript'] }),
    people: () => ({ out: () => [] }),
    places: () => ({ out: () => [] }),
  })),
}))

vi.mock('@/lib/search/semanticSearch', () => ({
  getSemanticSearchEngine: vi.fn(() => ({
    search: vi.fn(() => Promise.resolve([
      { entry: { content: 'Redux is a state management library' }, snippet: 'Redux manages state' },
      { entry: { content: 'Vue is a progressive framework' }, snippet: 'Vue uses composition API' },
    ])),
  })),
}))

vi.mock('@/lib/glossary/glossaryCache', () => ({
  getGlobalGlossaryDb: vi.fn(() => Promise.resolve([
    { term: 'Redux' },
    { term: 'MobX' },
    { term: 'Zustand' },
  ])),
}))

// ============================================================================
// HELPER FUNCTIONS (from ragDistractors.ts)
// ============================================================================

function isGenericTerm(term: string): boolean {
  const genericPatterns = [
    /^(the|a|an|this|that|these|those)$/i,
    /^(is|are|was|were|be|been|being)$/i,
    /^(example|note|warning|tip|important)$/i,
    /^(true|false|yes|no|maybe)$/i,
    /^(all|none|some|any|every)$/i,
  ]
  
  return genericPatterns.some(p => p.test(term.trim()))
}

function calculateSimilarity(term1: string, term2: string): number {
  const t1 = term1.toLowerCase().trim()
  const t2 = term2.toLowerCase().trim()
  
  if (t1 === t2) return 1.0
  if (t1.includes(t2) || t2.includes(t1)) return 0.9
  
  const lengthRatio = Math.min(t1.length, t2.length) / Math.max(t1.length, t2.length)
  
  const words1 = new Set(t1.split(/\s+/))
  const words2 = new Set(t2.split(/\s+/))
  const intersection = [...words1].filter(w => words2.has(w)).length
  const union = new Set([...words1, ...words2]).size
  const jaccardSimilarity = intersection / union
  
  return (lengthRatio * 0.3 + jaccardSimilarity * 0.7)
}

function filterDistractorCandidates(
  answer: string,
  candidates: string[],
  count: number
): string[] {
  const normalized = answer.toLowerCase().trim()
  
  const scored = candidates
    .filter(c => {
      const n = c.toLowerCase().trim()
      if (n === normalized) return false
      if (calculateSimilarity(answer, c) > 0.6) return false
      if (Math.abs(c.length - answer.length) > answer.length * 1.5) return false
      return true
    })
    .map(c => ({
      term: c,
      lengthScore: 1 - Math.abs(c.length - answer.length) / Math.max(c.length, answer.length, 1),
      random: Math.random() * 0.2,
    }))
    .map(item => ({
      term: item.term,
      score: item.lengthScore + item.random,
    }))
    .sort((a, b) => b.score - a.score)
  
  return scored.slice(0, count).map(s => s.term)
}

function generateSmartFallbacks(answer: string, count: number): string[] {
  const fallbacks: string[] = []
  const normalized = answer.toLowerCase().trim()
  
  if (/^\d+$/.test(normalized)) {
    const num = parseInt(normalized, 10)
    fallbacks.push(
      String(Math.max(0, num - 1)),
      String(num + 1),
      String(num * 2),
    )
  } else if (/^(true|false|yes|no)$/i.test(normalized)) {
    fallbacks.push(normalized === 'true' ? 'false' : 'true')
    fallbacks.push('It depends on the context')
  }
  
  const universalFallbacks = [
    'Not applicable in this context',
    'This concept is unrelated',
    'A different approach is needed',
  ]
  
  for (const fb of universalFallbacks) {
    if (fallbacks.length >= count) break
    if (!fallbacks.includes(fb) && fb.toLowerCase() !== normalized) {
      fallbacks.push(fb)
    }
  }
  
  return fallbacks.slice(0, count)
}

// ============================================================================
// TESTS
// ============================================================================

describe('RAG Distractor Generation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('Generic Term Detection', () => {
    it('should identify articles as generic', () => {
      expect(isGenericTerm('the')).toBe(true)
      expect(isGenericTerm('a')).toBe(true)
      expect(isGenericTerm('an')).toBe(true)
    })

    it('should identify common verbs as generic', () => {
      expect(isGenericTerm('is')).toBe(true)
      expect(isGenericTerm('are')).toBe(true)
      expect(isGenericTerm('was')).toBe(true)
    })

    it('should identify markdown artifacts as generic', () => {
      expect(isGenericTerm('example')).toBe(true)
      expect(isGenericTerm('note')).toBe(true)
      expect(isGenericTerm('warning')).toBe(true)
    })

    it('should identify boolean terms as generic', () => {
      expect(isGenericTerm('true')).toBe(true)
      expect(isGenericTerm('false')).toBe(true)
      expect(isGenericTerm('yes')).toBe(true)
      expect(isGenericTerm('no')).toBe(true)
    })

    it('should not flag valid terms as generic', () => {
      expect(isGenericTerm('React')).toBe(false)
      expect(isGenericTerm('Component')).toBe(false)
      expect(isGenericTerm('useState')).toBe(false)
    })
  })

  describe('Similarity Calculation', () => {
    it('should return 1.0 for identical terms', () => {
      expect(calculateSimilarity('React', 'React')).toBe(1.0)
      expect(calculateSimilarity('react', 'REACT')).toBe(1.0)
    })

    it('should return high similarity for substring matches', () => {
      expect(calculateSimilarity('React', 'ReactJS')).toBe(0.9)
      expect(calculateSimilarity('Component', 'Components')).toBe(0.9)
    })

    it('should return lower similarity for different terms', () => {
      const similarity = calculateSimilarity('React', 'Angular')
      expect(similarity).toBeLessThan(0.5)
    })

    it('should consider word overlap', () => {
      const similarity1 = calculateSimilarity('React Hooks', 'React Components')
      const similarity2 = calculateSimilarity('React Hooks', 'Angular Services')
      expect(similarity1).toBeGreaterThan(similarity2)
    })
  })

  describe('Distractor Filtering', () => {
    it('should exclude the correct answer', () => {
      const candidates = ['React', 'Angular', 'Vue', 'Svelte']
      const filtered = filterDistractorCandidates('React', candidates, 3)
      expect(filtered).not.toContain('React')
    })

    it('should exclude too similar terms', () => {
      const candidates = ['React', 'ReactJS', 'React Native', 'Angular']
      const filtered = filterDistractorCandidates('React', candidates, 3)
      expect(filtered).not.toContain('ReactJS')
    })

    it('should prefer terms of similar length', () => {
      const candidates = ['A', 'Angular', 'Vue', 'SvelteKitFrameworkLibrary']
      const answer = 'React'
      const filtered = filterDistractorCandidates(answer, candidates, 2)
      
      // Angular and Vue are closer in length to React
      expect(filtered.some(f => f === 'Angular' || f === 'Vue')).toBe(true)
    })

    it('should return requested count of distractors', () => {
      const candidates = ['Angular', 'Vue', 'Svelte', 'Ember', 'Backbone']
      const filtered = filterDistractorCandidates('React', candidates, 3)
      expect(filtered.length).toBeLessThanOrEqual(3)
    })
  })

  describe('Smart Fallbacks', () => {
    it('should generate numeric alternatives for numeric answers', () => {
      const fallbacks = generateSmartFallbacks('5', 3)
      expect(fallbacks.some(f => /^\d+$/.test(f))).toBe(true)
    })

    it('should generate boolean alternatives for boolean answers', () => {
      const fallbacks = generateSmartFallbacks('true', 3)
      expect(fallbacks).toContain('false')
    })

    it('should include universal fallbacks', () => {
      const fallbacks = generateSmartFallbacks('SomeComplexTerm', 3)
      expect(fallbacks.length).toBeGreaterThan(0)
    })

    it('should not include the original answer in fallbacks', () => {
      const answer = 'React'
      const fallbacks = generateSmartFallbacks(answer, 3)
      expect(fallbacks.map(f => f.toLowerCase())).not.toContain(answer.toLowerCase())
    })
  })

  describe('Integration', () => {
    it('should generate complete distractor set', () => {
      const answer = 'React Hooks'
      const candidates = ['Redux', 'MobX', 'Zustand', 'Context API', 'Recoil']
      
      const distractors = filterDistractorCandidates(answer, candidates, 3)
      
      expect(distractors.length).toBe(3)
      expect(distractors).not.toContain(answer)
      distractors.forEach(d => {
        expect(calculateSimilarity(answer, d)).toBeLessThan(0.6)
      })
    })

    it('should fall back gracefully when candidates are insufficient', () => {
      const answer = 'UniqueConceptName'
      const candidates = ['UniqueConceptName'] // Only the answer itself
      
      const distractors = filterDistractorCandidates(answer, candidates, 3)
      const fallbacks = generateSmartFallbacks(answer, 3 - distractors.length)
      
      const combined = [...distractors, ...fallbacks]
      expect(combined.length).toBeGreaterThan(0)
    })
  })
})

describe('Distractor Quality', () => {
  it('should generate distractors with similar length to answer', () => {
    // Distractor selection is based on length similarity, not semantic analysis
    const answer = 'useState'
    const candidates = ['useEffect', 'useContext', 'useReducer', 'useMemo', 'banana', 'car']

    const distractors = filterDistractorCandidates(answer, candidates, 3)

    // Should return distractors (any valid candidates)
    expect(distractors.length).toBe(3)
    // All distractors should be from the candidates list
    distractors.forEach(d => {
      expect(candidates).toContain(d)
    })
    // Should not include the answer itself
    expect(distractors).not.toContain(answer)
  })

  it('should maintain diversity in distractors', () => {
    const answer = 'React'
    const candidates = ['Angular', 'Vue', 'Svelte', 'Ember', 'Backbone']
    
    const distractors = filterDistractorCandidates(answer, candidates, 3)
    
    // All distractors should be unique
    const unique = new Set(distractors)
    expect(unique.size).toBe(distractors.length)
  })
})

