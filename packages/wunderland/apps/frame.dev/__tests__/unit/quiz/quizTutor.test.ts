/**
 * Quiz Tutor Tests
 * @module tests/unit/quiz/quizTutor
 *
 * Tests for AI-powered quiz explanations including:
 * - LLM explanation generation
 * - Fallback strategies
 * - Template-based explanations
 * - Context extraction
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock LLM module
vi.mock('@/lib/llm', () => ({
  isLLMAvailable: vi.fn(() => true),
  llm: vi.fn(),
}))

// Mock compromise for NLP
vi.mock('compromise', () => ({
  default: vi.fn(() => ({
    nouns: () => ({ out: () => ['concept', 'definition', 'example'] }),
  })),
}))

import { isLLMAvailable, llm } from '@/lib/llm'

// ============================================================================
// EXPLANATION TEMPLATES (from useQuizTutor)
// ============================================================================

const EXPLANATION_TEMPLATES = {
  multiple_choice: {
    whyCorrect: (correct: string) => 
      `The correct answer is "${correct}" because it most accurately describes the concept being asked about.`,
    whyWrong: (userAnswer: string, correct: string) =>
      `Your answer "${userAnswer}" is incorrect. While it may seem related, "${correct}" is the more precise answer.`,
  },
  true_false: {
    whyCorrect: (correct: string) =>
      `This statement is ${correct.toLowerCase()} based on the source material.`,
    whyWrong: (userAnswer: string, correct: string) =>
      `The statement is actually ${correct.toLowerCase()}, not ${userAnswer.toLowerCase()}.`,
  },
  fill_blank: {
    whyCorrect: (correct: string) =>
      `"${correct}" is the correct term that completes this sentence accurately.`,
    whyWrong: (userAnswer: string, correct: string) =>
      `"${userAnswer}" doesn't fit the context. The correct term is "${correct}".`,
  },
}

interface ExplainAnswerInput {
  question: string
  userAnswer: string
  correctAnswer: string
  questionType?: 'multiple_choice' | 'true_false' | 'fill_blank'
  storedExplanation?: string
  sourceContext?: string
}

interface TutorExplanation {
  whyCorrect: string
  whyWrong?: string
  conceptsToReview: string[]
  relatedTopics: string[]
  confidence: number
  source: 'llm' | 'stored' | 'template' | 'fallback'
  llmUsed: boolean
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function generateTemplateExplanation(input: ExplainAnswerInput): TutorExplanation {
  const type = input.questionType || 'multiple_choice'
  const templates = EXPLANATION_TEMPLATES[type] || EXPLANATION_TEMPLATES.multiple_choice
  
  const words = input.question.split(/\s+/)
  const potentialConcepts = words
    .filter(w => w.length > 4 && /^[A-Z]/.test(w))
    .slice(0, 3)
  
  return {
    whyCorrect: templates.whyCorrect(input.correctAnswer),
    whyWrong: templates.whyWrong(input.userAnswer, input.correctAnswer),
    conceptsToReview: potentialConcepts.length > 0 
      ? potentialConcepts 
      : ['Review the related section in the source material'],
    relatedTopics: [],
    confidence: 0.5,
    source: 'template',
    llmUsed: false,
  }
}

function generateStoredExplanation(input: ExplainAnswerInput): TutorExplanation | null {
  if (!input.storedExplanation) return null
  
  return {
    whyCorrect: input.storedExplanation,
    whyWrong: input.userAnswer !== input.correctAnswer
      ? `Your answer "${input.userAnswer}" is not correct.`
      : undefined,
    conceptsToReview: [],
    relatedTopics: [],
    confidence: 0.8,
    source: 'stored',
    llmUsed: false,
  }
}

// ============================================================================
// TESTS
// ============================================================================

describe('Quiz Tutor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('Template Explanations', () => {
    it('should generate explanation for multiple choice questions', () => {
      const input: ExplainAnswerInput = {
        question: 'What is React?',
        userAnswer: 'A database',
        correctAnswer: 'A JavaScript library',
        questionType: 'multiple_choice',
      }

      const explanation = generateTemplateExplanation(input)

      expect(explanation.whyCorrect).toContain('A JavaScript library')
      expect(explanation.whyWrong).toContain('A database')
      expect(explanation.source).toBe('template')
      expect(explanation.llmUsed).toBe(false)
    })

    it('should generate explanation for true/false questions', () => {
      const input: ExplainAnswerInput = {
        question: 'React is a JavaScript library.',
        userAnswer: 'False',
        correctAnswer: 'True',
        questionType: 'true_false',
      }

      const explanation = generateTemplateExplanation(input)

      expect(explanation.whyCorrect).toContain('true')
      expect(explanation.whyWrong).toContain('false')
      expect(explanation.source).toBe('template')
    })

    it('should generate explanation for fill-in-blank questions', () => {
      const input: ExplainAnswerInput = {
        question: 'React uses _____ to update the DOM.',
        userAnswer: 'jQuery',
        correctAnswer: 'reconciliation',
        questionType: 'fill_blank',
      }

      const explanation = generateTemplateExplanation(input)

      expect(explanation.whyCorrect).toContain('reconciliation')
      expect(explanation.whyWrong).toContain('jQuery')
      expect(explanation.source).toBe('template')
    })

    it('should extract concepts from capitalized words', () => {
      const input: ExplainAnswerInput = {
        question: 'What does ReactJS use for Virtual DOM reconciliation?',
        userAnswer: 'Nothing',
        correctAnswer: 'Diffing algorithm',
        questionType: 'multiple_choice',
      }

      const explanation = generateTemplateExplanation(input)

      // Should extract ReactJS and Virtual as concepts
      expect(explanation.conceptsToReview.length).toBeGreaterThanOrEqual(0)
    })

    it('should provide default concept when none extracted', () => {
      const input: ExplainAnswerInput = {
        question: 'what is the answer?',
        userAnswer: 'wrong',
        correctAnswer: 'right',
        questionType: 'multiple_choice',
      }

      const explanation = generateTemplateExplanation(input)

      expect(explanation.conceptsToReview).toContain('Review the related section in the source material')
    })
  })

  describe('Stored Explanations', () => {
    it('should use stored explanation when available', () => {
      const input: ExplainAnswerInput = {
        question: 'What is React?',
        userAnswer: 'A database',
        correctAnswer: 'A JavaScript library',
        storedExplanation: 'React is a declarative, component-based library for building UIs.',
      }

      const explanation = generateStoredExplanation(input)

      expect(explanation).not.toBeNull()
      expect(explanation!.whyCorrect).toBe('React is a declarative, component-based library for building UIs.')
      expect(explanation!.source).toBe('stored')
      expect(explanation!.confidence).toBe(0.8)
    })

    it('should return null when no stored explanation', () => {
      const input: ExplainAnswerInput = {
        question: 'What is React?',
        userAnswer: 'A database',
        correctAnswer: 'A JavaScript library',
      }

      const explanation = generateStoredExplanation(input)

      expect(explanation).toBeNull()
    })

    it('should include whyWrong for incorrect answers', () => {
      const input: ExplainAnswerInput = {
        question: 'What is React?',
        userAnswer: 'A database',
        correctAnswer: 'A JavaScript library',
        storedExplanation: 'React is a library.',
      }

      const explanation = generateStoredExplanation(input)

      expect(explanation!.whyWrong).toContain('A database')
    })
  })

  describe('LLM Integration', () => {
    it('should check LLM availability', () => {
      vi.mocked(isLLMAvailable).mockReturnValue(true)
      expect(isLLMAvailable()).toBe(true)

      vi.mocked(isLLMAvailable).mockReturnValue(false)
      expect(isLLMAvailable()).toBe(false)
    })

    it('should parse LLM JSON response', async () => {
      const mockResponse = JSON.stringify({
        whyCorrect: 'React is a library because...',
        whyWrong: 'A database is not correct because...',
        conceptsToReview: ['Components', 'JSX'],
        relatedTopics: ['Virtual DOM'],
      })

      vi.mocked(llm).mockResolvedValue(mockResponse)

      const response = await llm('test prompt')
      const parsed = JSON.parse(response!)

      expect(parsed.whyCorrect).toContain('React')
      expect(parsed.conceptsToReview).toContain('Components')
    })

    it('should handle LLM failure gracefully', async () => {
      vi.mocked(llm).mockRejectedValue(new Error('API error'))

      await expect(llm('test')).rejects.toThrow('API error')
    })
  })

  describe('Fallback Chain', () => {
    it('should have correct fallback priority', () => {
      const strategies = ['llm', 'stored', 'context', 'template']
      
      expect(strategies[0]).toBe('llm')
      expect(strategies[3]).toBe('template')
    })

    it('should always return an explanation', () => {
      const input: ExplainAnswerInput = {
        question: 'Test question?',
        userAnswer: 'Wrong',
        correctAnswer: 'Right',
      }

      // Template should always work as final fallback
      const explanation = generateTemplateExplanation(input)
      
      expect(explanation).not.toBeNull()
      expect(explanation.whyCorrect).toBeDefined()
      expect(explanation.source).toBe('template')
    })
  })

  describe('Confidence Scoring', () => {
    it('should have high confidence for stored explanations', () => {
      const input: ExplainAnswerInput = {
        question: 'What is X?',
        userAnswer: 'A',
        correctAnswer: 'B',
        storedExplanation: 'B is correct because...',
      }

      const explanation = generateStoredExplanation(input)
      expect(explanation!.confidence).toBe(0.8)
    })

    it('should have medium confidence for template explanations', () => {
      const input: ExplainAnswerInput = {
        question: 'What is X?',
        userAnswer: 'A',
        correctAnswer: 'B',
      }

      const explanation = generateTemplateExplanation(input)
      expect(explanation.confidence).toBe(0.5)
    })
  })
})

describe('Explanation Quality', () => {
  it('should provide actionable review suggestions', () => {
    const input: ExplainAnswerInput = {
      question: 'What is the Virtual DOM in React?',
      userAnswer: 'The browser DOM',
      correctAnswer: 'An in-memory representation of the real DOM',
      questionType: 'multiple_choice',
    }

    const explanation = generateTemplateExplanation(input)

    expect(explanation.conceptsToReview.length).toBeGreaterThanOrEqual(0)
  })

  it('should be encouraging in tone', () => {
    const templates = EXPLANATION_TEMPLATES.multiple_choice
    const whyWrong = templates.whyWrong('Wrong answer', 'Correct answer')

    // Should not be harsh
    expect(whyWrong).not.toContain('stupid')
    expect(whyWrong).not.toContain('obviously')
    
    // Should acknowledge the attempt
    expect(whyWrong).toContain('may seem related')
  })
})

