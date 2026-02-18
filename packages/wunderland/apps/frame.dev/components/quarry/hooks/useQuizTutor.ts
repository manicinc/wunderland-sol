/**
 * Quiz Tutor Hook
 * @module components/quarry/hooks/useQuizTutor
 *
 * @description
 * Provides AI-powered explanations for quiz answers with offline fallback.
 * 
 * When a user answers incorrectly:
 * 1. Tries LLM for detailed explanation
 * 2. Falls back to stored explanation from question
 * 3. Falls back to pattern-based explanation templates
 * 
 * @example
 * ```tsx
 * const { explainAnswer, isExplaining, explanation } = useQuizTutor()
 * 
 * // After wrong answer
 * const result = await explainAnswer({
 *   question: "What is React?",
 *   userAnswer: "A database",
 *   correctAnswer: "A JavaScript library for building UIs",
 *   context: "React is a declarative, component-based library..."
 * })
 * ```
 */

import { useState, useCallback } from 'react'

// ============================================================================
// TYPES
// ============================================================================

export interface ExplainAnswerInput {
  /** The quiz question */
  question: string
  /** What the user answered */
  userAnswer: string
  /** The correct answer */
  correctAnswer: string
  /** Optional question type */
  questionType?: 'multiple_choice' | 'true_false' | 'fill_blank' | 'short_answer'
  /** Optional pre-stored explanation from the question */
  storedExplanation?: string
  /** Optional source text/context */
  sourceContext?: string
  /** Optional related concepts for deeper explanation */
  relatedConcepts?: string[]
  /** Force offline mode */
  forceOffline?: boolean
}

export interface TutorExplanation {
  /** Why the correct answer is right */
  whyCorrect: string
  /** Why the user's answer is wrong (if applicable) */
  whyWrong?: string
  /** Key concepts to review */
  conceptsToReview: string[]
  /** Related topics for further study */
  relatedTopics: string[]
  /** Confidence in the explanation (0-1) */
  confidence: number
  /** Source of the explanation */
  source: 'llm' | 'stored' | 'template' | 'fallback'
  /** Whether LLM was used */
  llmUsed: boolean
}

export interface UseQuizTutorResult {
  /** Generate explanation for a wrong answer */
  explainAnswer: (input: ExplainAnswerInput) => Promise<TutorExplanation>
  /** Current explanation (if any) */
  explanation: TutorExplanation | null
  /** Whether currently generating an explanation */
  isExplaining: boolean
  /** Last error (if any) */
  error: string | null
  /** Clear the current explanation */
  clearExplanation: () => void
}

// ============================================================================
// EXPLANATION TEMPLATES
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
  short_answer: {
    whyCorrect: (correct: string) =>
      `The answer "${correct}" captures the essential concept being asked.`,
    whyWrong: (userAnswer: string, correct: string) =>
      `Your answer "${userAnswer}" doesn't fully address the question. Consider: "${correct}"`,
  },
}

// ============================================================================
// LLM EXPLANATION
// ============================================================================

async function generateLLMExplanation(input: ExplainAnswerInput): Promise<TutorExplanation | null> {
  try {
    const { isLLMAvailable, llm } = await import('@/lib/llm')
    
    if (!isLLMAvailable()) {
      return null
    }
    
    const prompt = `You are a helpful tutor explaining a quiz answer to a student.

Question: ${input.question}
Student's Answer: ${input.userAnswer}
Correct Answer: ${input.correctAnswer}
${input.sourceContext ? `\nContext from source material:\n${input.sourceContext}` : ''}

Provide a brief, encouraging explanation that:
1. Explains why the correct answer is right (2-3 sentences)
2. Explains why the student's answer is incorrect (1-2 sentences, be gentle)
3. Lists 2-3 key concepts the student should review
4. Suggests 1-2 related topics for further study

Format your response as JSON:
{
  "whyCorrect": "...",
  "whyWrong": "...",
  "conceptsToReview": ["...", "..."],
  "relatedTopics": ["...", "..."]
}`

    const result = await llm.generate({
      prompt,
      temperature: 0.7,
      maxTokens: 500,
    })

    if (!result?.raw) return null

    // Try to parse JSON from response
    try {
      // Find JSON in response
      const jsonMatch = result.raw.match(/\{[\s\S]*\}/)
      if (!jsonMatch) return null
      
      const parsed = JSON.parse(jsonMatch[0])
      
      return {
        whyCorrect: parsed.whyCorrect || '',
        whyWrong: parsed.whyWrong,
        conceptsToReview: parsed.conceptsToReview || [],
        relatedTopics: parsed.relatedTopics || [],
        confidence: 0.9,
        source: 'llm',
        llmUsed: true,
      }
    } catch {
      // If JSON parsing fails, use raw response
      return {
        whyCorrect: result.raw.slice(0, 500),
        conceptsToReview: [],
        relatedTopics: [],
        confidence: 0.6,
        source: 'llm',
        llmUsed: true,
      }
    }
  } catch (err) {
    console.warn('[useQuizTutor] LLM explanation failed:', err)
    return null
  }
}

// ============================================================================
// STORED EXPLANATION
// ============================================================================

function generateStoredExplanation(input: ExplainAnswerInput): TutorExplanation | null {
  if (!input.storedExplanation) return null
  
  return {
    whyCorrect: input.storedExplanation,
    whyWrong: input.userAnswer !== input.correctAnswer
      ? `Your answer "${input.userAnswer}" is not correct.`
      : undefined,
    conceptsToReview: input.relatedConcepts || [],
    relatedTopics: [],
    confidence: 0.8,
    source: 'stored',
    llmUsed: false,
  }
}

// ============================================================================
// TEMPLATE EXPLANATION
// ============================================================================

function generateTemplateExplanation(input: ExplainAnswerInput): TutorExplanation {
  const type = input.questionType || 'multiple_choice'
  const templates = EXPLANATION_TEMPLATES[type] || EXPLANATION_TEMPLATES.multiple_choice
  
  // Extract potential concepts from the question
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

// ============================================================================
// CONTEXT-ENHANCED EXPLANATION
// ============================================================================

async function generateContextExplanation(input: ExplainAnswerInput): Promise<TutorExplanation | null> {
  if (!input.sourceContext) return null
  
  try {
    // Use NLP to extract key points from context
    const nlp = (await import('compromise')).default
    const doc = nlp(input.sourceContext)
    
    // Extract sentences containing the correct answer
    const sentences = input.sourceContext.split(/[.!?]+/)
    const relevantSentences = sentences.filter(s => 
      s.toLowerCase().includes(input.correctAnswer.toLowerCase().slice(0, 20))
    ).slice(0, 2)
    
    // Extract key terms
    const nouns = doc.nouns().out('array') as string[]
    const concepts = [...new Set(nouns)]
      .filter(n => n.length > 3)
      .slice(0, 3)
    
    return {
      whyCorrect: relevantSentences.length > 0
        ? `Based on the source: ${relevantSentences[0].trim()}`
        : `The answer "${input.correctAnswer}" is correct based on the content.`,
      whyWrong: `Your answer "${input.userAnswer}" doesn't match what the source material states.`,
      conceptsToReview: concepts,
      relatedTopics: [],
      confidence: 0.7,
      source: 'fallback',
      llmUsed: false,
    }
  } catch (err) {
    console.warn('[useQuizTutor] Context explanation failed:', err)
    return null
  }
}

// ============================================================================
// MAIN HOOK
// ============================================================================

export function useQuizTutor(): UseQuizTutorResult {
  const [explanation, setExplanation] = useState<TutorExplanation | null>(null)
  const [isExplaining, setIsExplaining] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const explainAnswer = useCallback(async (input: ExplainAnswerInput): Promise<TutorExplanation> => {
    setIsExplaining(true)
    setError(null)
    
    try {
      let result: TutorExplanation | null = null
      
      // Strategy 1: Try LLM (if online and available)
      if (!input.forceOffline) {
        result = await generateLLMExplanation(input)
        if (result) {
          setExplanation(result)
          return result
        }
      }
      
      // Strategy 2: Use stored explanation
      result = generateStoredExplanation(input)
      if (result) {
        setExplanation(result)
        return result
      }
      
      // Strategy 3: Use context-based explanation
      result = await generateContextExplanation(input)
      if (result) {
        setExplanation(result)
        return result
      }
      
      // Strategy 4: Fall back to templates
      result = generateTemplateExplanation(input)
      setExplanation(result)
      return result
      
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to generate explanation'
      setError(errorMsg)
      
      // Return template as fallback even on error
      const fallback = generateTemplateExplanation(input)
      setExplanation(fallback)
      return fallback
      
    } finally {
      setIsExplaining(false)
    }
  }, [])

  const clearExplanation = useCallback(() => {
    setExplanation(null)
    setError(null)
  }, [])

  return {
    explainAnswer,
    explanation,
    isExplaining,
    error,
    clearExplanation,
  }
}

export default useQuizTutor

