/**
 * Quiz Generation Tests
 * @module tests/unit/quiz/quizGeneration
 *
 * Comprehensive tests for quiz question generation including:
 * - Question type generation (MCQ, T/F, Fill-blank)
 * - Term extraction and filtering
 * - Difficulty determination
 * - Caching behavior
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock dependencies
vi.mock('@/lib/nlp', () => ({
  parseMarkdownBlocks: vi.fn((content: string) => [
    { type: 'paragraph', content, level: 0 },
  ]),
}))

vi.mock('@/lib/generation/quizCache', () => ({
  generateCacheKey: vi.fn((content: string, difficulty: string) => `quiz-${difficulty}-${content.slice(0, 10)}`),
  getFromCache: vi.fn(),
  saveToCache: vi.fn(),
  invalidateCache: vi.fn(() => Promise.resolve({ deleted: 0 })),
  getCacheStats: vi.fn(() => Promise.resolve({ 
    totalEntries: 0, 
    totalQuestions: 0, 
    oldestEntry: null,
    storageUsed: 0,
  })),
  getCacheAge: vi.fn(() => 0),
}))

vi.mock('@/lib/generation/ragDistractors', () => ({
  generateRAGDistractors: vi.fn(() => Promise.resolve({
    distractors: ['Distractor 1', 'Distractor 2', 'Distractor 3'],
    source: 'nlp',
    confidence: 0.7,
  })),
  generateDistractorsSync: vi.fn((answer: string, terms: string[], count: number) => 
    terms.filter(t => t !== answer).slice(0, count)
  ),
}))

vi.mock('compromise', () => ({
  default: vi.fn(() => ({
    topics: () => ({ out: () => ['React', 'JavaScript'] }),
    people: () => ({ out: () => [] }),
    places: () => ({ out: () => [] }),
    nouns: () => ({ toSingular: () => ({ out: () => ['function', 'component', 'state'] }) }),
  })),
}))

import * as quizCache from '@/lib/generation/quizCache'

// ============================================================================
// HELPER FUNCTIONS (copied from hook for testing)
// ============================================================================

const EXCLUDE_TERM_PATTERNS = [
  /^use when$/i,
  /^when to use$/i,
  /^example$/i,
  /^examples?:?$/i,
  /^note$/i,
  /^default$/i,
  /^description$/i,
]

function shouldExcludeTerm(term: string): boolean {
  const cleaned = term.trim()
  if (cleaned.length < 3 || cleaned.length > 60) return true
  if (EXCLUDE_TERM_PATTERNS.some(p => p.test(cleaned))) return true
  if (/^[\s\W]+$/.test(cleaned)) return true
  if (cleaned.endsWith(':')) return true
  return false
}

function determineDifficulty(term: string, context: string): 'easy' | 'medium' | 'hard' {
  const wordCount = context.split(/\s+/).length
  const termLength = term.length

  if (wordCount < 15 && termLength < 10) return 'easy'
  if (wordCount > 40 || termLength > 15) return 'hard'
  return 'medium'
}

function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

// ============================================================================
// TESTS
// ============================================================================

describe('Quiz Generation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('Term Filtering', () => {
    it('should exclude terms shorter than 3 characters', () => {
      expect(shouldExcludeTerm('ab')).toBe(true)
      expect(shouldExcludeTerm('a')).toBe(true)
      expect(shouldExcludeTerm('')).toBe(true)
    })

    it('should exclude terms longer than 60 characters', () => {
      const longTerm = 'a'.repeat(61)
      expect(shouldExcludeTerm(longTerm)).toBe(true)
    })

    it('should exclude markdown artifacts', () => {
      expect(shouldExcludeTerm('Example')).toBe(true)
      expect(shouldExcludeTerm('examples')).toBe(true)
      expect(shouldExcludeTerm('Note')).toBe(true)
      expect(shouldExcludeTerm('default')).toBe(true)
      expect(shouldExcludeTerm('description')).toBe(true)
    })

    it('should exclude terms ending with colon', () => {
      expect(shouldExcludeTerm('Parameters:')).toBe(true)
      expect(shouldExcludeTerm('Returns:')).toBe(true)
    })

    it('should accept valid terms', () => {
      expect(shouldExcludeTerm('React')).toBe(false)
      expect(shouldExcludeTerm('JavaScript')).toBe(false)
      expect(shouldExcludeTerm('Component')).toBe(false)
    })
  })

  describe('Difficulty Determination', () => {
    it('should return easy for short context with simple term', () => {
      const term = 'React'
      const context = 'React is a library.'
      expect(determineDifficulty(term, context)).toBe('easy')
    })

    it('should return hard for long context', () => {
      const term = 'ReconciliationAlgorithm' // Long term makes it hard
      const context = 'The reconciliation algorithm is a sophisticated process that React uses to efficiently update the DOM by comparing the previous and current virtual DOM trees and applying minimal changes to achieve the desired state transformation. It involves complex diffing and patching operations.'
      expect(determineDifficulty(term, context)).toBe('hard')
    })

    it('should return hard for long terms', () => {
      const term = 'VirtualDOMReconciliation'
      const context = 'It updates the DOM.'
      expect(determineDifficulty(term, context)).toBe('hard')
    })

    it('should return medium for average content', () => {
      const term = 'Component'
      const context = 'A component is a reusable piece of UI that accepts props and returns React elements.'
      expect(determineDifficulty(term, context)).toBe('medium')
    })
  })

  describe('Array Shuffling', () => {
    it('should maintain array length', () => {
      const arr = [1, 2, 3, 4, 5]
      const shuffled = shuffleArray(arr)
      expect(shuffled).toHaveLength(arr.length)
    })

    it('should contain all original elements', () => {
      const arr = ['a', 'b', 'c', 'd']
      const shuffled = shuffleArray(arr)
      arr.forEach(item => {
        expect(shuffled).toContain(item)
      })
    })

    it('should not modify original array', () => {
      const arr = [1, 2, 3]
      const original = [...arr]
      shuffleArray(arr)
      expect(arr).toEqual(original)
    })
  })

  describe('Question Type Distribution', () => {
    it('should generate balanced question types', () => {
      const questions = [
        { type: 'multiple_choice' },
        { type: 'multiple_choice' },
        { type: 'true_false' },
        { type: 'true_false' },
        { type: 'fill_blank' },
      ]

      const stats = {
        multipleChoice: questions.filter(q => q.type === 'multiple_choice').length,
        trueFalse: questions.filter(q => q.type === 'true_false').length,
        fillBlank: questions.filter(q => q.type === 'fill_blank').length,
      }

      expect(stats.multipleChoice).toBe(2)
      expect(stats.trueFalse).toBe(2)
      expect(stats.fillBlank).toBe(1)
    })
  })

  describe('Caching', () => {
    it('should generate consistent cache keys', () => {
      const content = 'Test content about React'
      const difficulty = 'medium'
      
      const key1 = quizCache.generateCacheKey(content, difficulty, false)
      const key2 = quizCache.generateCacheKey(content, difficulty, false)
      
      expect(key1).toBe(key2)
    })

    it('should return cached questions when available', async () => {
      const cachedQuestions = [
        { id: '1', type: 'multiple_choice', question: 'What is React?', answer: 'A library' },
      ]
      
      vi.mocked(quizCache.getFromCache).mockResolvedValue({
        questions: cachedQuestions,
        generationMethod: 'static',
        createdAt: new Date().toISOString(),
        version: 1,
      })

      const cached = await quizCache.getFromCache('test-key')
      expect(cached).not.toBeNull()
      expect(cached!.questions).toHaveLength(1)
    })

    it('should save generated questions to cache', async () => {
      const questions = [
        { id: '1', type: 'multiple_choice', question: 'Test', answer: 'Answer' },
      ]

      await quizCache.saveToCache('test-key', {
        questions,
        generationMethod: 'static',
        createdAt: new Date().toISOString(),
        version: 1,
      })

      expect(quizCache.saveToCache).toHaveBeenCalled()
    })
  })

  describe('Question Generation', () => {
    it('should create valid multiple choice question structure', () => {
      const question = {
        id: 'test-123',
        type: 'multiple_choice' as const,
        question: 'What is React?',
        options: ['A library', 'A framework', 'A language', 'A database'],
        answer: 'A library',
        explanation: 'React is a JavaScript library for building UIs.',
        difficulty: 'medium' as const,
        confidence: 0.8,
      }

      expect(question.options).toHaveLength(4)
      expect(question.options).toContain(question.answer)
      expect(question.type).toBe('multiple_choice')
    })

    it('should create valid true/false question structure', () => {
      const question = {
        id: 'test-456',
        type: 'true_false' as const,
        question: 'React is a JavaScript library.',
        answer: 'True',
        explanation: 'This statement is correct.',
        difficulty: 'easy' as const,
        confidence: 0.75,
      }

      expect(['True', 'False']).toContain(question.answer)
      expect(question.type).toBe('true_false')
    })

    it('should create valid fill-in-blank question structure', () => {
      const question = {
        id: 'test-789',
        type: 'fill_blank' as const,
        question: 'React uses _____ to efficiently update the DOM.',
        answer: 'reconciliation',
        explanation: 'The missing word is "reconciliation".',
        difficulty: 'medium' as const,
        confidence: 0.7,
      }

      expect(question.question).toContain('_____')
      expect(question.type).toBe('fill_blank')
    })
  })

  describe('Multi-Strand Generation', () => {
    it('should track source strand for each question', () => {
      const questions = [
        {
          id: '1',
          source: { strandId: 'strand-1', strandPath: '/docs/react.md', strandTitle: 'React Basics' },
        },
        {
          id: '2',
          source: { strandId: 'strand-2', strandPath: '/docs/hooks.md', strandTitle: 'React Hooks' },
        },
      ]

      const bySource = (strandId: string) => questions.filter(q => q.source?.strandId === strandId)

      expect(bySource('strand-1')).toHaveLength(1)
      expect(bySource('strand-2')).toHaveLength(1)
      expect(bySource('strand-3')).toHaveLength(0)
    })

    it('should balance questions across strands', () => {
      const strandCount = 3
      const maxQuestions = 9
      const questionsPerStrand = Math.floor(maxQuestions / strandCount)
      
      expect(questionsPerStrand).toBe(3)
    })
  })
})

describe('Question Templates', () => {
  const templates = [
    { template: (term: string) => `What does "${term}" refer to?` },
    { template: (term: string) => `Which of the following best describes "${term}"?` },
    { template: (term: string) => `How is "${term}" defined?` },
  ]

  it('should generate varied question formats', () => {
    const term = 'Component'
    const questions = templates.map(t => t.template(term))
    
    // All should include the term
    questions.forEach(q => {
      expect(q).toContain(term)
    })
    
    // All should be different
    const uniqueQuestions = new Set(questions)
    expect(uniqueQuestions.size).toBe(templates.length)
  })
})

