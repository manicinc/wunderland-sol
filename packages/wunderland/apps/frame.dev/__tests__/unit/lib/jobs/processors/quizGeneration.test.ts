/**
 * Quiz Generation Processor Tests
 * @module __tests__/unit/lib/jobs/processors/quizGeneration.test
 *
 * Tests for quiz generation utilities including term exclusion,
 * distractor generation, difficulty determination, and question patterns.
 */

import { describe, it, expect, vi } from 'vitest'

/* ═══════════════════════════════════════════════════════════════════════════
   RE-IMPLEMENTED UTILITIES (for testing logic)
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Patterns that indicate markdown artifacts NOT real terms
 */
const EXCLUDE_TERM_PATTERNS = [
  /^use when$/i,
  /^when to use$/i,
  /^example$/i,
  /^examples?:?$/i,
  /^note$/i,
  /^notes?:?$/i,
  /^warning$/i,
  /^tip$/i,
  /^important$/i,
  /^see also$/i,
  /^related$/i,
  /^prerequisites?$/i,
  /^requirements?$/i,
  /^syntax$/i,
  /^parameters?$/i,
  /^returns?$/i,
  /^arguments?$/i,
  /^options?$/i,
  /^configuration$/i,
  /^usage$/i,
  /^installation$/i,
  /^getting started$/i,
  /^overview$/i,
  /^introduction$/i,
  /^summary$/i,
  /^conclusion$/i,
  /^references?$/i,
  /^table of contents$/i,
  /^toc$/i,
  /^default$/i,
  /^description$/i,
  /^type$/i,
  /^value$/i,
  /^name$/i,
  /^key$/i,
  /^best practices?$/i,
  /^common use cases?$/i,
  /^advantages?$/i,
  /^disadvantages?$/i,
  /^pros?$/i,
  /^cons?$/i,
  /^step \d+$/i,
  /^section \d+$/i,
  /^chapter \d+$/i,
  /^figure \d+$/i,
  /^table \d+$/i,
  /^\d+$/,
]

function shouldExcludeTerm(term: string): boolean {
  const cleaned = term.trim()
  if (cleaned.length < 3 || cleaned.length > 60) return true
  if (EXCLUDE_TERM_PATTERNS.some((p) => p.test(cleaned))) return true
  if (/^[\s\W]+$/.test(cleaned)) return true
  if (cleaned.endsWith(':')) return true
  return false
}

function getSentences(text: string): string[] {
  return text
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 20 && s.length < 300)
}

function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

type QuizDifficulty = 'easy' | 'medium' | 'hard'

function determineDifficulty(term: string, context: string): QuizDifficulty {
  const wordCount = context.split(/\s+/).length
  const termLength = term.length

  if (wordCount < 15 && termLength < 10) return 'easy'
  if (wordCount > 40 || termLength > 15) return 'hard'
  return 'medium'
}

function generateDistractors(answer: string, terms: string[], count: number = 3): string[] {
  const distractors: string[] = []
  const normalized = answer.toLowerCase().trim()

  const candidates = terms.filter((t) => {
    const n = t.toLowerCase().trim()
    return n !== normalized && n.length > 2 && Math.abs(t.length - answer.length) < answer.length
  })

  const shuffled = candidates.sort(() => Math.random() - 0.5)
  distractors.push(...shuffled.slice(0, count))

  while (distractors.length < count) {
    const generic = [
      'None of the above',
      'All of the above',
      'It depends on context',
      'This is not defined',
      'Unknown',
    ]
    const unused = generic.find((g) => !distractors.includes(g))
    if (unused) {
      distractors.push(unused)
    } else {
      break
    }
  }

  return distractors.slice(0, count)
}

function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

/* ═══════════════════════════════════════════════════════════════════════════
   TESTS
═══════════════════════════════════════════════════════════════════════════ */

describe('Quiz Generation Utilities', () => {
  describe('shouldExcludeTerm', () => {
    describe('length validation', () => {
      it('should exclude terms shorter than 3 characters', () => {
        expect(shouldExcludeTerm('ab')).toBe(true)
        expect(shouldExcludeTerm('a')).toBe(true)
        expect(shouldExcludeTerm('')).toBe(true)
      })

      it('should exclude terms longer than 60 characters', () => {
        const longTerm = 'a'.repeat(61)
        expect(shouldExcludeTerm(longTerm)).toBe(true)
      })

      it('should accept terms within valid length range', () => {
        expect(shouldExcludeTerm('abc')).toBe(false)
        expect(shouldExcludeTerm('Valid Term')).toBe(false)
        expect(shouldExcludeTerm('a'.repeat(60))).toBe(false)
      })
    })

    describe('markdown artifact exclusion', () => {
      it('should exclude "example" variations', () => {
        expect(shouldExcludeTerm('example')).toBe(true)
        expect(shouldExcludeTerm('Example')).toBe(true)
        expect(shouldExcludeTerm('EXAMPLE')).toBe(true)
        expect(shouldExcludeTerm('examples')).toBe(true)
        expect(shouldExcludeTerm('Examples:')).toBe(true)
      })

      it('should exclude "note" variations', () => {
        expect(shouldExcludeTerm('note')).toBe(true)
        expect(shouldExcludeTerm('Note')).toBe(true)
        expect(shouldExcludeTerm('notes')).toBe(true)
        expect(shouldExcludeTerm('Notes:')).toBe(true)
      })

      it('should exclude section markers', () => {
        expect(shouldExcludeTerm('Overview')).toBe(true)
        expect(shouldExcludeTerm('Introduction')).toBe(true)
        expect(shouldExcludeTerm('Summary')).toBe(true)
        expect(shouldExcludeTerm('Conclusion')).toBe(true)
        expect(shouldExcludeTerm('References')).toBe(true)
      })

      it('should exclude numbered sections', () => {
        expect(shouldExcludeTerm('Step 1')).toBe(true)
        expect(shouldExcludeTerm('Step 42')).toBe(true)
        expect(shouldExcludeTerm('Section 3')).toBe(true)
        expect(shouldExcludeTerm('Chapter 5')).toBe(true)
        expect(shouldExcludeTerm('Figure 12')).toBe(true)
        expect(shouldExcludeTerm('Table 7')).toBe(true)
      })

      it('should exclude pure numbers', () => {
        expect(shouldExcludeTerm('123')).toBe(true)
        expect(shouldExcludeTerm('456789')).toBe(true)
      })

      it('should exclude documentation keywords', () => {
        expect(shouldExcludeTerm('Prerequisites')).toBe(true)
        expect(shouldExcludeTerm('Requirements')).toBe(true)
        expect(shouldExcludeTerm('Parameters')).toBe(true)
        expect(shouldExcludeTerm('Arguments')).toBe(true)
        expect(shouldExcludeTerm('Returns')).toBe(true)
        expect(shouldExcludeTerm('Syntax')).toBe(true)
        expect(shouldExcludeTerm('Configuration')).toBe(true)
        expect(shouldExcludeTerm('Installation')).toBe(true)
      })

      it('should exclude comparison terms', () => {
        expect(shouldExcludeTerm('Advantages')).toBe(true)
        expect(shouldExcludeTerm('Disadvantages')).toBe(true)
        expect(shouldExcludeTerm('Pros')).toBe(true)
        expect(shouldExcludeTerm('Cons')).toBe(true)
      })
    })

    describe('special character handling', () => {
      it('should exclude terms that are only whitespace and symbols', () => {
        expect(shouldExcludeTerm('   ')).toBe(true)
        expect(shouldExcludeTerm('---')).toBe(true)
        expect(shouldExcludeTerm('***')).toBe(true)
        expect(shouldExcludeTerm('###')).toBe(true)
      })

      it('should exclude terms ending with colon', () => {
        expect(shouldExcludeTerm('Term:')).toBe(true)
        expect(shouldExcludeTerm('Definition:')).toBe(true)
      })
    })

    describe('valid terms', () => {
      it('should accept valid technical terms', () => {
        expect(shouldExcludeTerm('JavaScript')).toBe(false)
        expect(shouldExcludeTerm('Machine Learning')).toBe(false)
        expect(shouldExcludeTerm('Neural Network')).toBe(false)
        expect(shouldExcludeTerm('API Gateway')).toBe(false)
        expect(shouldExcludeTerm('Kubernetes')).toBe(false)
      })

      it('should accept valid concept names', () => {
        expect(shouldExcludeTerm('Photosynthesis')).toBe(false)
        expect(shouldExcludeTerm('Mitochondria')).toBe(false)
        expect(shouldExcludeTerm('Quantum Computing')).toBe(false)
      })
    })
  })

  describe('getSentences', () => {
    it('should split text on sentence-ending punctuation', () => {
      const text =
        'This is a sentence that is long enough to be valid. Here is another one that should work! And here is a third sentence that is also valid?'
      const sentences = getSentences(text)
      expect(sentences.length).toBe(3)
    })

    it('should filter out sentences shorter than 20 characters', () => {
      const text = 'Short. This is a much longer sentence that should be included.'
      const sentences = getSentences(text)
      expect(sentences.length).toBe(1)
      expect(sentences[0]).toContain('longer sentence')
    })

    it('should filter out sentences longer than 300 characters', () => {
      const longSentence = 'a '.repeat(200) // Creates 400 character sentence
      const normalSentence = 'This is a normal length sentence that should be valid for testing purposes'
      const text = `${longSentence}. ${normalSentence}.`
      const sentences = getSentences(text)
      expect(sentences.length).toBe(1)
      // The split removes the trailing period, so compare without it
      expect(sentences[0]).toBe(normalSentence)
    })

    it('should trim whitespace from sentences', () => {
      const text = '  This sentence has leading and trailing spaces  . Another normal sentence here.'
      const sentences = getSentences(text)
      expect(sentences[0]).not.toMatch(/^\s/)
      expect(sentences[0]).not.toMatch(/\s$/)
    })

    it('should handle multiple consecutive punctuation marks', () => {
      const text = 'What is this about?! Here is a valid sentence with enough characters.'
      const sentences = getSentences(text)
      expect(sentences.length).toBeGreaterThanOrEqual(1)
    })

    it('should return empty array for empty text', () => {
      expect(getSentences('')).toEqual([])
    })

    it('should return empty array for text with only short sentences', () => {
      const text = 'Short. Too brief. Not enough.'
      expect(getSentences(text)).toEqual([])
    })
  })

  describe('shuffleArray', () => {
    it('should return array of same length', () => {
      const original = [1, 2, 3, 4, 5]
      const shuffled = shuffleArray(original)
      expect(shuffled.length).toBe(original.length)
    })

    it('should contain all original elements', () => {
      const original = [1, 2, 3, 4, 5]
      const shuffled = shuffleArray(original)
      expect(shuffled.sort()).toEqual(original.sort())
    })

    it('should not modify original array', () => {
      const original = [1, 2, 3, 4, 5]
      const copy = [...original]
      shuffleArray(original)
      expect(original).toEqual(copy)
    })

    it('should handle empty array', () => {
      expect(shuffleArray([])).toEqual([])
    })

    it('should handle single element array', () => {
      expect(shuffleArray([1])).toEqual([1])
    })

    it('should work with string arrays', () => {
      const original = ['a', 'b', 'c', 'd']
      const shuffled = shuffleArray(original)
      expect(shuffled.sort()).toEqual(original.sort())
    })

    it('should work with object arrays', () => {
      const original = [{ id: 1 }, { id: 2 }, { id: 3 }]
      const shuffled = shuffleArray(original)
      expect(shuffled.length).toBe(3)
      const ids = shuffled.map((o) => o.id).sort()
      expect(ids).toEqual([1, 2, 3])
    })
  })

  describe('determineDifficulty', () => {
    describe('easy difficulty', () => {
      it('should return easy for short term with few words', () => {
        const term = 'API' // 3 chars < 10
        const context = 'API stands for' // 3 words < 15
        expect(determineDifficulty(term, context)).toBe('easy')
      })

      it('should return easy for simple concept with brief context', () => {
        const term = 'Variable' // 8 chars < 10
        const context = 'A variable stores data in memory' // 6 words < 15
        expect(determineDifficulty(term, context)).toBe('easy')
      })
    })

    describe('medium difficulty', () => {
      it('should return medium for moderate term and context', () => {
        const term = 'Polymorphism' // 12 chars (between 10 and 15)
        const context =
          'Polymorphism allows objects to be treated as instances of their parent class while maintaining their specific behaviors' // ~18 words
        expect(determineDifficulty(term, context)).toBe('medium')
      })

      it('should return medium for short term with moderate context', () => {
        const term = 'Class' // 5 chars < 10
        const context =
          'A class is a blueprint for creating objects that share common properties and methods in object-oriented programming languages' // ~18 words
        expect(determineDifficulty(term, context)).toBe('medium')
      })
    })

    describe('hard difficulty', () => {
      it('should return hard for long term', () => {
        const term = 'Electroencephalogram' // 20 chars > 15
        const context = 'A medical test that measures brain activity'
        expect(determineDifficulty(term, context)).toBe('hard')
      })

      it('should return hard for context with many words', () => {
        const term = 'REST'
        const context =
          'Representational State Transfer is an architectural style for designing networked applications ' +
          'that relies on stateless client-server communication using standard HTTP methods for creating scalable web services ' +
          'that can be easily consumed by various client applications across different platforms and programming languages' // > 40 words
        expect(determineDifficulty(term, context)).toBe('hard')
      })
    })
  })

  describe('generateDistractors', () => {
    it('should return requested number of distractors', () => {
      const answer = 'JavaScript'
      const terms = ['TypeScript', 'Python', 'Ruby', 'Go', 'Rust']
      const distractors = generateDistractors(answer, terms, 3)
      expect(distractors.length).toBe(3)
    })

    it('should not include the answer in distractors', () => {
      const answer = 'JavaScript'
      const terms = ['JavaScript', 'TypeScript', 'Python', 'Ruby', 'Go']
      const distractors = generateDistractors(answer, terms, 3)
      expect(distractors).not.toContain('JavaScript')
    })

    it('should use generic fallbacks when not enough terms', () => {
      const answer = 'JavaScript'
      const terms = ['TypeScript'] // Only 1 valid distractor
      const distractors = generateDistractors(answer, terms, 3)
      expect(distractors.length).toBe(3)
      // Should contain generic options
      const genericOptions = ['None of the above', 'All of the above', 'It depends on context', 'This is not defined', 'Unknown']
      const hasGeneric = distractors.some((d) => genericOptions.includes(d))
      expect(hasGeneric).toBe(true)
    })

    it('should filter out terms that are too different in length', () => {
      const answer = 'API' // 3 chars
      // Terms with very different lengths should be excluded
      const terms = ['ApplicationProgrammingInterface', 'REST', 'HTTP', 'SDK'] // First one is too long
      const distractors = generateDistractors(answer, terms, 3)
      expect(distractors).not.toContain('ApplicationProgrammingInterface')
    })

    it('should handle empty terms array', () => {
      const answer = 'JavaScript'
      const distractors = generateDistractors(answer, [], 3)
      expect(distractors.length).toBe(3)
      // All should be generic fallbacks
    })

    it('should handle case-insensitive answer matching', () => {
      const answer = 'JavaScript'
      const terms = ['javascript', 'JAVASCRIPT', 'TypeScript', 'Python']
      const distractors = generateDistractors(answer, terms, 3)
      expect(distractors.map((d) => d.toLowerCase())).not.toContain('javascript')
    })

    it('should exclude very short terms', () => {
      const answer = 'Test'
      const terms = ['ab', 'A', '', 'Valid']
      const distractors = generateDistractors(answer, terms, 2)
      expect(distractors).not.toContain('ab')
      expect(distractors).not.toContain('A')
      expect(distractors).not.toContain('')
    })
  })

  describe('generateId', () => {
    it('should generate UUID v4 format', () => {
      const id = generateId()
      const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
      expect(id).toMatch(uuidV4Regex)
    })

    it('should have version 4 indicator', () => {
      const id = generateId()
      expect(id.charAt(14)).toBe('4')
    })

    it('should have valid variant bits', () => {
      const id = generateId()
      const variantChar = id.charAt(19)
      expect(['8', '9', 'a', 'b']).toContain(variantChar)
    })

    it('should generate unique IDs', () => {
      const ids = new Set()
      for (let i = 0; i < 100; i++) {
        ids.add(generateId())
      }
      expect(ids.size).toBe(100)
    })
  })

  describe('EXCLUDE_TERM_PATTERNS', () => {
    describe('instruction patterns', () => {
      it('should match "use when" and "when to use"', () => {
        expect(EXCLUDE_TERM_PATTERNS.some((p) => p.test('use when'))).toBe(true)
        expect(EXCLUDE_TERM_PATTERNS.some((p) => p.test('when to use'))).toBe(true)
        expect(EXCLUDE_TERM_PATTERNS.some((p) => p.test('Use When'))).toBe(true)
      })

      it('should match warning and tip indicators', () => {
        expect(EXCLUDE_TERM_PATTERNS.some((p) => p.test('warning'))).toBe(true)
        expect(EXCLUDE_TERM_PATTERNS.some((p) => p.test('tip'))).toBe(true)
        expect(EXCLUDE_TERM_PATTERNS.some((p) => p.test('important'))).toBe(true)
      })
    })

    describe('reference patterns', () => {
      it('should match "see also" and "related"', () => {
        expect(EXCLUDE_TERM_PATTERNS.some((p) => p.test('see also'))).toBe(true)
        expect(EXCLUDE_TERM_PATTERNS.some((p) => p.test('related'))).toBe(true)
      })

      it('should match table of contents variations', () => {
        expect(EXCLUDE_TERM_PATTERNS.some((p) => p.test('table of contents'))).toBe(true)
        expect(EXCLUDE_TERM_PATTERNS.some((p) => p.test('toc'))).toBe(true)
        expect(EXCLUDE_TERM_PATTERNS.some((p) => p.test('TOC'))).toBe(true)
      })
    })

    describe('generic label patterns', () => {
      it('should match single-word labels', () => {
        expect(EXCLUDE_TERM_PATTERNS.some((p) => p.test('default'))).toBe(true)
        expect(EXCLUDE_TERM_PATTERNS.some((p) => p.test('description'))).toBe(true)
        expect(EXCLUDE_TERM_PATTERNS.some((p) => p.test('type'))).toBe(true)
        expect(EXCLUDE_TERM_PATTERNS.some((p) => p.test('value'))).toBe(true)
        expect(EXCLUDE_TERM_PATTERNS.some((p) => p.test('name'))).toBe(true)
        expect(EXCLUDE_TERM_PATTERNS.some((p) => p.test('key'))).toBe(true)
      })
    })

    describe('best practices patterns', () => {
      it('should match best practice variations', () => {
        expect(EXCLUDE_TERM_PATTERNS.some((p) => p.test('best practice'))).toBe(true)
        expect(EXCLUDE_TERM_PATTERNS.some((p) => p.test('best practices'))).toBe(true)
        expect(EXCLUDE_TERM_PATTERNS.some((p) => p.test('common use case'))).toBe(true)
        expect(EXCLUDE_TERM_PATTERNS.some((p) => p.test('common use cases'))).toBe(true)
      })
    })
  })

  describe('Question Template Patterns', () => {
    const questionTemplates = [
      { template: (term: string) => `What does "${term}" refer to?`, explanation: (term: string, def: string) => `"${term}" refers to: ${def}` },
      { template: (term: string) => `Which of the following best describes "${term}"?`, explanation: (term: string, def: string) => `The best description of "${term}" is: ${def}` },
      { template: (term: string) => `How is "${term}" defined?`, explanation: (term: string, def: string) => `"${term}" is defined as: ${def}` },
      { template: (term: string) => `What is the meaning of "${term}"?`, explanation: (term: string, def: string) => `"${term}" means: ${def}` },
      { template: (term: string) => `"${term}" can best be understood as:`, explanation: (term: string, def: string) => `"${term}" is understood as: ${def}` },
    ]

    it('should generate valid questions with terms', () => {
      const term = 'Machine Learning'
      for (const { template } of questionTemplates) {
        const question = template(term)
        expect(question).toContain('Machine Learning')
        expect(question.length).toBeGreaterThan(0)
      }
    })

    it('should generate valid explanations with terms and definitions', () => {
      const term = 'API'
      const definition = 'Application Programming Interface'
      for (const { explanation } of questionTemplates) {
        const exp = explanation(term, definition)
        expect(exp).toContain('API')
        expect(exp).toContain('Application Programming Interface')
      }
    })

    it('should include term in quotes for clarity', () => {
      const term = 'Variable'
      for (const { template } of questionTemplates) {
        const question = template(term)
        expect(question).toContain(`"${term}"`)
      }
    })
  })

  describe('Factual Pattern Matching', () => {
    const factualPatterns = [
      /(.+?)\s+(?:is|are|was|were)\s+(.+)/i,
      /(.+?)\s+(?:can|could|will|would)\s+(.+)/i,
      /(.+?)\s+(?:has|have|had)\s+(.+)/i,
    ]

    it('should match "is/are" sentences', () => {
      const sentence1 = 'JavaScript is a programming language'
      const sentence2 = 'Arrays are data structures'
      expect(factualPatterns[0].test(sentence1)).toBe(true)
      expect(factualPatterns[0].test(sentence2)).toBe(true)
    })

    it('should match "can/could/will/would" sentences', () => {
      const sentence1 = 'Functions can be passed as arguments'
      const sentence2 = 'This method will return a promise'
      expect(factualPatterns[1].test(sentence1)).toBe(true)
      expect(factualPatterns[1].test(sentence2)).toBe(true)
    })

    it('should match "has/have/had" sentences', () => {
      const sentence1 = 'Objects have properties'
      const sentence2 = 'The class has a constructor'
      expect(factualPatterns[2].test(sentence1)).toBe(true)
      expect(factualPatterns[2].test(sentence2)).toBe(true)
    })

    it('should extract subject and predicate', () => {
      const sentence = 'JavaScript is a dynamic programming language'
      const match = sentence.match(factualPatterns[0])
      expect(match).not.toBeNull()
      expect(match![1]).toBe('JavaScript')
      expect(match![2]).toBe('a dynamic programming language')
    })
  })

  describe('Definition Extraction Patterns', () => {
    const definitionPatterns = [
      /([A-Z][a-zA-Z\s]+)\s+(?:is|are|refers to|means|describes)\s+(.+?)[.!?]/g,
      /(?:The term\s+)?["']?([^"']+)["']?\s+(?:is defined as|can be defined as)\s+(.+?)[.!?]/g,
      /\*\*([^*]+)\*\*[:\s]+(.+?)[.!?]/g,
    ]

    it('should match "X is/means/refers to Y" pattern', () => {
      const text = 'Machine Learning refers to the study of algorithms.'
      definitionPatterns[0].lastIndex = 0
      const match = definitionPatterns[0].exec(text)
      expect(match).not.toBeNull()
      expect(match![1]).toBe('Machine Learning')
    })

    it('should match "is defined as" pattern', () => {
      const text = 'The term "API" is defined as Application Programming Interface.'
      definitionPatterns[1].lastIndex = 0
      const match = definitionPatterns[1].exec(text)
      expect(match).not.toBeNull()
    })

    it('should match bold markdown definitions', () => {
      const text = '**REST**: An architectural style for APIs.'
      definitionPatterns[2].lastIndex = 0
      const match = definitionPatterns[2].exec(text)
      expect(match).not.toBeNull()
      expect(match![1]).toBe('REST')
    })

    it('should handle multiple definitions in same text', () => {
      const text =
        'API refers to Application Programming Interface. SDK means Software Development Kit. REST describes a web architecture style.'
      definitionPatterns[0].lastIndex = 0
      const matches: RegExpExecArray[] = []
      let match
      while ((match = definitionPatterns[0].exec(text)) !== null) {
        matches.push(match)
      }
      expect(matches.length).toBeGreaterThanOrEqual(2)
    })
  })
})
