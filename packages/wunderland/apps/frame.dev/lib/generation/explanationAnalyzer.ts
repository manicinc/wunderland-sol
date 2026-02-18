/**
 * Explanation Analyzer for Teach Mode
 *
 * Analyzes user explanations, generates AI student responses,
 * and creates gap reports using LLM inference.
 *
 * @module lib/generation/explanationAnalyzer
 */

import { z } from 'zod'
import type { StudentPersona, TeachMessage, GapReport } from '../../types/openstrand'
import {
  getPersonaPrompt,
  buildStudentResponsePrompt,
  buildGapAnalysisPrompt,
} from './teachModePrompts'

// ============================================================================
// TYPES
// ============================================================================

export interface StudentResponse {
  /** The student's response/question */
  content: string
  /** Potential knowledge gaps detected */
  gaps: string[]
}

export interface AnalysisResult {
  /** Full gap report */
  gapReport: GapReport
  /** Key concepts extracted from source */
  keyConcepts: string[]
}

// ============================================================================
// ZOD SCHEMAS
// ============================================================================

const StudentResponseSchema = z.object({
  question: z.string(),
  potentialGaps: z.array(z.string()).default([]),
})

const GapReportSchema = z.object({
  covered: z.array(z.string()),
  gaps: z.array(z.string()),
  suggestions: z.array(z.string()),
  coveragePercent: z.number().min(0).max(100),
})

// ============================================================================
// LLM INTEGRATION
// ============================================================================

/**
 * Call the LLM API for structured output
 * Falls back to local heuristics if API unavailable
 */
async function callLLM<T>(
  systemPrompt: string,
  userPrompt: string,
  schema: z.ZodType<T>,
  fallback: () => T
): Promise<T> {
  try {
    // Try to use the llm library
    const { llm } = await import('../llm')

    const response = await llm.generate({
      system: systemPrompt,
      prompt: userPrompt,
      schema,
      maxTokens: 1024,
      temperature: 0.7,
    })

    return response.data
  } catch (error) {
    console.warn('[ExplanationAnalyzer] LLM call failed, using fallback:', error)
    return fallback()
  }
}

// ============================================================================
// STUDENT RESPONSE GENERATION
// ============================================================================

/**
 * Generate an AI student response based on the user's explanation
 */
export async function generateStudentResponse(
  persona: StudentPersona,
  topic: string,
  userMessage: string,
  conversationHistory: TeachMessage[],
  sourceContent?: string
): Promise<StudentResponse> {
  const systemPrompt = getPersonaPrompt(persona)
  const userPrompt = buildStudentResponsePrompt(
    persona,
    topic,
    userMessage,
    conversationHistory.map(m => ({ role: m.role, content: m.content })),
    sourceContent
  )

  // Fallback function that returns schema-compatible type
  const schemaFallback = () => {
    const response = generateFallbackResponse(persona, userMessage)
    return {
      question: response.content,
      potentialGaps: response.gaps,
    }
  }

  try {
    const result = await callLLM(
      systemPrompt,
      userPrompt,
      StudentResponseSchema,
      schemaFallback
    )

    return {
      content: result.question,
      gaps: result.potentialGaps ?? [],
    }
  } catch {
    return generateFallbackResponse(persona, userMessage)
  }
}

/**
 * Generate a fallback response when LLM is unavailable
 */
function generateFallbackResponse(
  persona: StudentPersona,
  userMessage: string
): StudentResponse {
  const fallbackQuestions: Record<StudentPersona, string[]> = {
    'curious-child': [
      "But why does that happen?",
      "What does that word mean?",
      "Can you explain that more simply?",
      "Is that like something I already know?",
      "What happens next?",
    ],
    'exam-prep': [
      "What's the definition of that?",
      "Will this be on the test?",
      "What are the key steps?",
      "Can you give me an example problem?",
      "What are common mistakes to avoid?",
    ],
    'devils-advocate': [
      "But what about the opposite case?",
      "How do you know that's true?",
      "What if someone disagreed?",
      "Are there any exceptions?",
      "What evidence supports that?",
    ],
    'visual-learner': [
      "Can you give me a concrete example?",
      "What does that look like in practice?",
      "Can you draw it out?",
      "Where would I see this in real life?",
      "Can you walk me through step by step?",
    ],
    'socratic': [
      "What follows from that?",
      "How do you define that term?",
      "What assumptions are you making?",
      "Is that always the case?",
      "What would happen if...?",
    ],
  }

  const questions = fallbackQuestions[persona]
  const randomIndex = Math.floor(Math.random() * questions.length)

  // Simple gap detection heuristics
  const gaps: string[] = []
  if (userMessage.length < 50) {
    gaps.push('Explanation may be too brief')
  }
  if (!userMessage.includes('example') && !userMessage.includes('instance')) {
    gaps.push('No concrete examples provided')
  }
  if (userMessage.split('.').length < 3) {
    gaps.push('Could use more detail')
  }

  return {
    content: questions[randomIndex],
    gaps: gaps.length > 0 ? gaps : [],
  }
}

// ============================================================================
// GAP ANALYSIS
// ============================================================================

/**
 * Analyze the user's explanation and generate a gap report
 */
export async function analyzeExplanation(
  topic: string,
  userTranscript: string,
  sourceContent: string
): Promise<AnalysisResult> {
  const prompt = buildGapAnalysisPrompt(topic, userTranscript, sourceContent)

  // Fallback analysis
  const fallback = () => generateFallbackAnalysis(userTranscript, sourceContent)

  try {
    const gapReport = await callLLM(
      'You are an expert educational analyst.',
      prompt,
      GapReportSchema,
      () => fallback().gapReport
    )

    // Extract key concepts from the report
    const keyConcepts = [...gapReport.covered, ...gapReport.gaps]

    return {
      gapReport,
      keyConcepts,
    }
  } catch {
    return fallback()
  }
}

/**
 * Generate a fallback analysis when LLM is unavailable
 */
function generateFallbackAnalysis(
  userTranscript: string,
  sourceContent: string
): AnalysisResult {
  // Simple heuristic analysis
  const sourceWords = new Set(
    sourceContent
      .toLowerCase()
      .split(/\W+/)
      .filter(w => w.length > 4)
  )
  const userWords = new Set(
    userTranscript
      .toLowerCase()
      .split(/\W+/)
      .filter(w => w.length > 4)
  )

  // Find covered and missing concepts (simplified)
  const covered: string[] = []
  const gaps: string[] = []

  // Check for keyword overlap
  let matchCount = 0
  sourceWords.forEach(word => {
    if (userWords.has(word)) {
      matchCount++
    }
  })

  const coveragePercent = Math.min(
    95,
    Math.max(20, Math.round((matchCount / Math.max(sourceWords.size, 1)) * 100))
  )

  // Generate generic feedback
  if (userTranscript.length > 200) {
    covered.push('Provided substantial explanation')
  }
  if (userTranscript.includes('example') || userTranscript.includes('instance')) {
    covered.push('Included examples')
  }
  if (userTranscript.includes('because') || userTranscript.includes('therefore')) {
    covered.push('Explained causal relationships')
  }

  if (userTranscript.length < 100) {
    gaps.push('Explanation could be more detailed')
  }
  if (!userTranscript.includes('example')) {
    gaps.push('Consider adding concrete examples')
  }
  if (coveragePercent < 50) {
    gaps.push('Several key concepts may be missing')
  }

  const suggestions = [
    'Review the source material for missed concepts',
    'Try explaining to a different persona for new perspectives',
    'Practice with flashcards for gaps identified',
  ]

  return {
    gapReport: {
      covered: covered.length > 0 ? covered : ['Basic topic introduction'],
      gaps: gaps.length > 0 ? gaps : ['No major gaps detected'],
      suggestions,
      coveragePercent,
    },
    keyConcepts: [...covered, ...gaps],
  }
}

// ============================================================================
// CONCEPT EXTRACTION
// ============================================================================

/**
 * Extract key concepts from content for gap analysis
 */
export async function extractKeyConcepts(content: string): Promise<string[]> {
  // For now, use simple NLP-based extraction
  // In the future, this could use LLM for better extraction

  const sentences = content.split(/[.!?]+/)
  const concepts: string[] = []

  // Extract noun phrases (simplified)
  sentences.forEach(sentence => {
    // Look for definition patterns
    const defMatch = sentence.match(/(?:is|are|means?|refers? to)\s+(.+)/i)
    if (defMatch) {
      concepts.push(defMatch[1].trim().slice(0, 50))
    }

    // Look for key terms (capitalized words not at start)
    const terms = sentence.match(/(?<!^)\s([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g)
    if (terms) {
      terms.forEach(t => concepts.push(t.trim()))
    }
  })

  // Deduplicate and limit
  return [...new Set(concepts)].slice(0, 20)
}

// ============================================================================
// COVERAGE CALCULATION
// ============================================================================

/**
 * Calculate coverage score between explanation and source
 */
export function calculateCoverage(
  userTranscript: string,
  keyConcepts: string[]
): number {
  if (keyConcepts.length === 0) return 50

  const lowerTranscript = userTranscript.toLowerCase()
  let covered = 0

  keyConcepts.forEach(concept => {
    if (lowerTranscript.includes(concept.toLowerCase())) {
      covered++
    }
  })

  return Math.round((covered / keyConcepts.length) * 100)
}

export default {
  generateStudentResponse,
  analyzeExplanation,
  extractKeyConcepts,
  calculateCoverage,
}
