/**
 * Content Generation Service - Hybrid NLP + LLM System
 * @module lib/generation
 * 
 * @description
 * Combines static NLP tools with LLM chain-of-thought prompting
 * for intelligent content generation:
 * 
 * - Flashcard generation (cloze, basic, reversed)
 * - Quiz question generation (multiple choice, true/false, short answer)
 * - Suggested learning paths
 * - Content summaries
 * - Auto-tagging
 * 
 * Strategy: Static NLP first, LLM assistance for quality enhancement
 * 
 * @example
 * ```typescript
 * import { generateFlashcards, generateQuiz } from '@/lib/generation'
 * 
 * const cards = await generateFlashcards({
 *   content: markdownContent,
 *   strandSlug: 'react-hooks',
 *   useLLM: true,
 * })
 * ```
 */

import { z } from 'zod'
import { llm, isLLMAvailable, generateStructured } from '../llm'
import {
  extractKeywords,
  extractTechEntities,
  extractEntitiesAsync,
  generateExtractiveSummary,
  parseMarkdownBlocks,
  classifyContentType,
  analyzeReadingLevel,
  extractKeyPhrasesAsync,
} from '../nlp'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

export type FlashcardType = 'basic' | 'cloze' | 'reversed'
export type QuestionType = 'multiple_choice' | 'true_false' | 'short_answer' | 'fill_blank'
export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced'
export type GenerationSource = 'static' | 'llm' | 'hybrid' | 'multi-strand'

export interface GeneratedFlashcard {
  id: string
  type: FlashcardType
  front: string
  back: string
  hint?: string
  tags: string[]
  source: GenerationSource
  confidence: number
  sourceText?: string
}

export interface GeneratedQuestion {
  id: string
  type: QuestionType
  question: string
  answer: string
  options?: string[] // For multiple choice
  explanation?: string
  difficulty: DifficultyLevel
  tags: string[]
  source: GenerationSource
  confidence: number
}

export interface GenerationOptions {
  /** Content to generate from */
  content: string
  /** Strand slug for context */
  strandSlug?: string
  /** Strand title */
  title?: string
  /** Use LLM enhancement (requires API key) */
  useLLM?: boolean
  /** Maximum items to generate */
  maxItems?: number
  /** Target difficulty */
  difficulty?: DifficultyLevel
  /** Focus on specific tags/topics */
  focusTopics?: string[]
  /** RAG context: related content snippets for enhanced generation */
  ragContext?: RAGContext
}

/**
 * RAG (Retrieval Augmented Generation) context
 * Provides related content to improve LLM generation quality
 */
export interface RAGContext {
  /** Related content snippets from semantic search */
  relatedSnippets: Array<{
    content: string
    title: string
    path: string
    similarity: number
  }>
  /** Key concepts extracted from related content */
  relatedConcepts: string[]
  /** Connected strands */
  connectedStrands: string[]
}

export interface GenerationResult<T> {
  items: T[]
  source: GenerationSource
  metadata: {
    processingTime: number
    nlpConfidence: number
    llmUsed: boolean
    tokensUsed?: number
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   SCHEMAS FOR LLM STRUCTURED OUTPUT
═══════════════════════════════════════════════════════════════════════════ */

const FlashcardSchema = z.object({
  cards: z.array(z.object({
    type: z.enum(['basic', 'cloze', 'reversed']),
    front: z.string().min(10).max(500),
    back: z.string().min(1).max(500),
    hint: z.string().optional(),
    confidence: z.number().min(0).max(1),
  })),
  reasoning: z.string().optional(),
})

const QuizSchema = z.object({
  questions: z.array(z.object({
    type: z.enum(['multiple_choice', 'true_false', 'short_answer', 'fill_blank']),
    question: z.string().min(10).max(500),
    answer: z.string().min(1).max(500),
    options: z.array(z.string()).optional(),
    explanation: z.string().optional(),
    difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
    confidence: z.number().min(0).max(1),
  })),
  reasoning: z.string().optional(),
})

const SuggestionSchema = z.object({
  suggestions: z.array(z.object({
    text: z.string(),
    category: z.enum(['clarification', 'exploration', 'application', 'connection']),
    relatedTopics: z.array(z.string()).optional(),
  })),
})

/* ═══════════════════════════════════════════════════════════════════════════
   STATIC NLP GENERATION
═══════════════════════════════════════════════════════════════════════════ */

function generateId(): string {
  return `gen-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

/**
 * Generate cloze-deletion flashcards using keyword extraction
 */
async function generateClozeFromNLP(
  content: string,
  options: GenerationOptions
): Promise<GeneratedFlashcard[]> {
  const cards: GeneratedFlashcard[] = []
  const keywords = extractKeywords(content, 20)
  const sentences = content
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 30 && s.length < 300)

  for (const { word, score } of keywords.slice(0, options.maxItems || 10)) {
    // Find a sentence containing this keyword
    const sentence = sentences.find(s => 
      s.toLowerCase().includes(word.toLowerCase())
    )
    
    if (sentence) {
      // Create cloze deletion
      const clozeText = sentence.replace(
        new RegExp(`\\b${word}\\b`, 'gi'),
        '[...]'
      )
      
      cards.push({
        id: generateId(),
        type: 'cloze',
        front: clozeText,
        back: word,
        tags: ['auto-generated', 'keyword'],
        source: 'static',
        confidence: Math.min(score / 10, 0.9),
        sourceText: sentence,
      })
    }
  }

  return cards
}

/**
 * Generate basic Q&A flashcards from definitions
 */
async function generateBasicFromNLP(
  content: string,
  options: GenerationOptions
): Promise<GeneratedFlashcard[]> {
  const cards: GeneratedFlashcard[] = []
  
  // Pattern matching for definitions
  const definitionPatterns = [
    /([A-Z][a-zA-Z\s]+)\s+(?:is|are|refers to|means|describes)\s+(.+?)[.!?]/g,
    /(?:The term\s+)?["']?([^"']+)["']?\s+(?:is defined as|can be defined as)\s+(.+?)[.!?]/g,
    /([A-Za-z\s]+):\s*(.+?)(?:\.|$)/g,
  ]

  for (const pattern of definitionPatterns) {
    let match
    while ((match = pattern.exec(content)) !== null) {
      const term = match[1].trim()
      const definition = match[2].trim()

      if (term.length > 2 && term.length < 50 && definition.length > 10 && definition.length < 300) {
        cards.push({
          id: generateId(),
          type: 'basic',
          front: `What is ${term}?`,
          back: definition,
          tags: ['auto-generated', 'definition'],
          source: 'static',
          confidence: 0.75,
          sourceText: match[0],
        })
      }
      
      if (cards.length >= (options.maxItems || 10)) break
    }
    if (cards.length >= (options.maxItems || 10)) break
  }

  return cards
}

/**
 * Generate quiz questions using NLP
 */
async function generateQuestionsFromNLP(
  content: string,
  options: GenerationOptions
): Promise<GeneratedQuestion[]> {
  const questions: GeneratedQuestion[] = []
  const entities = await extractEntitiesAsync(content)
  const keywords = extractKeywords(content, 15)
  const { level: difficulty } = analyzeReadingLevel(content)
  
  // Generate true/false questions from statements
  const sentences = content
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 40 && s.length < 200)
    .filter(s => !s.includes('[') && !s.startsWith('#'))
  
  for (const sentence of sentences.slice(0, 5)) {
    questions.push({
      id: generateId(),
      type: 'true_false',
      question: `True or False: ${sentence}`,
      answer: 'True',
      explanation: 'This statement comes directly from the content.',
      difficulty,
      tags: ['auto-generated', 'true-false'],
      source: 'static',
      confidence: 0.7,
    })
  }

  // Generate fill-in-blank from keywords
  for (const { word } of keywords.slice(0, 5)) {
    const sentence = sentences.find(s => 
      s.toLowerCase().includes(word.toLowerCase())
    )
    
    if (sentence) {
      const blankSentence = sentence.replace(
        new RegExp(`\\b${word}\\b`, 'gi'),
        '_____'
      )
      
      questions.push({
        id: generateId(),
        type: 'fill_blank',
        question: `Fill in the blank: ${blankSentence}`,
        answer: word,
        difficulty,
        tags: ['auto-generated', 'fill-blank'],
        source: 'static',
        confidence: 0.65,
      })
    }
  }

  // Generate short answer from key topics
  const topics = [...entities.technologies, ...entities.concepts].slice(0, 3)
  for (const topic of topics) {
    questions.push({
      id: generateId(),
      type: 'short_answer',
      question: `Briefly explain what ${topic} is and why it's important.`,
      answer: `${topic} is a key concept discussed in this content.`,
      difficulty,
      tags: ['auto-generated', 'short-answer', topic.toLowerCase()],
      source: 'static',
      confidence: 0.6,
    })
  }

  return questions.slice(0, options.maxItems || 10)
}

/* ═══════════════════════════════════════════════════════════════════════════
   RAG CONTEXT HELPERS
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Build RAG context section for LLM prompts
 */
function buildRAGContextSection(ragContext: RAGContext): string {
  const sections: string[] = []
  
  if (ragContext.relatedConcepts.length > 0) {
    sections.push(`RELATED CONCEPTS (from connected content):
${ragContext.relatedConcepts.slice(0, 15).join(', ')}`)
  }
  
  if (ragContext.connectedStrands.length > 0) {
    sections.push(`CONNECTED STRANDS:
${ragContext.connectedStrands.slice(0, 5).join(', ')}`)
  }
  
  if (ragContext.relatedSnippets.length > 0) {
    const snippetSummaries = ragContext.relatedSnippets
      .slice(0, 3)
      .map(s => `- "${s.title}": ${s.content.slice(0, 200)}...`)
      .join('\n')
    
    sections.push(`RELATED CONTENT CONTEXT:
${snippetSummaries}`)
  }
  
  if (sections.length === 0) return ''
  
  return `
=== RAG CONTEXT (USE FOR CROSS-TOPIC CONNECTIONS) ===
${sections.join('\n\n')}
=== END RAG CONTEXT ===
`
}

/**
 * Fetch RAG context for a piece of content using semantic search
 * This should be called before generation when RAG enhancement is desired
 */
export async function fetchRAGContext(
  content: string,
  options: {
    maxSnippets?: number
    excludePaths?: string[]
  } = {}
): Promise<RAGContext> {
  const { maxSnippets = 5, excludePaths = [] } = options
  
  try {
    // Dynamic import to avoid circular dependency
    const { getSearchEngine } = await import('@/lib/search/engine')
    const engine = getSearchEngine()
    
    // Extract key phrases for search
    const keyPhrases = await extractKeyPhrasesAsync(content, 5)
    const searchQuery = keyPhrases.slice(0, 3).join(' ')
    
    if (!searchQuery || searchQuery.length < 10) {
      return { relatedSnippets: [], relatedConcepts: [], connectedStrands: [] }
    }
    
    // Perform semantic search
    const searchResults = await engine.search(searchQuery, {
      limit: maxSnippets + excludePaths.length,
      semantic: engine.canUseSemantic(),
    })
    
    // Filter out excluded paths and transform results
    const relatedSnippets = searchResults
      .filter(r => !excludePaths.includes(r.path))
      .slice(0, maxSnippets)
      .map(r => ({
        content: r.summary || '',
        title: r.title || r.path,
        path: r.path,
        similarity: r.combinedScore || r.bm25Score || 0,
      }))
    
    // Extract concepts from related content
    const combinedRelatedContent = relatedSnippets.map(s => s.content).join(' ')
    const relatedEntities = await extractEntitiesAsync(combinedRelatedContent)
    const relatedConcepts = [
      ...relatedEntities.concepts,
      ...relatedEntities.technologies,
      ...relatedEntities.topics,
    ].slice(0, 20)
    
    // Get connected strand titles
    const connectedStrands = relatedSnippets.map(s => s.title)
    
    return {
      relatedSnippets,
      relatedConcepts,
      connectedStrands,
    }
  } catch (error) {
    console.warn('[Generation] RAG context fetch failed:', error)
    return { relatedSnippets: [], relatedConcepts: [], connectedStrands: [] }
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   LLM CHAIN-OF-THOUGHT GENERATION
═══════════════════════════════════════════════════════════════════════════ */

const FLASHCARD_SYSTEM_PROMPT = `You are an expert educational content creator specializing in spaced repetition systems.
Your task is to generate high-quality flashcards that promote deep learning and long-term retention.

CHAIN OF THOUGHT PROCESS:
1. First, identify the key concepts, definitions, and relationships in the content
2. For each concept, determine the best flashcard type:
   - 'basic': Simple question-answer pairs for definitions and facts
   - 'cloze': Fill-in-blank for contextual learning and active recall
   - 'reversed': Answer-to-question for flexible knowledge access
3. Write clear, unambiguous questions that test understanding, not just recall
4. Ensure answers are concise but complete
5. Rate your confidence based on how testable the concept is

QUALITY CRITERIA:
- Each card should test ONE atomic concept
- Questions should be clear without additional context
- Answers should be specific and verifiable
- Avoid yes/no questions for basic cards
- Cloze deletions should remove meaningful terms, not filler words
- Include hints for complex concepts

Output your flashcards in the specified JSON format.`

const QUIZ_SYSTEM_PROMPT = `You are an expert assessment designer creating quiz questions for educational content.
Your goal is to create questions that accurately assess understanding at various difficulty levels.

CHAIN OF THOUGHT PROCESS:
1. Analyze the content for testable concepts at different cognitive levels:
   - Beginner: Recall and recognition
   - Intermediate: Application and analysis
   - Advanced: Synthesis and evaluation
2. For each concept, choose the appropriate question type:
   - 'multiple_choice': Best for testing recognition and discrimination
   - 'true_false': Good for common misconceptions and fact verification
   - 'short_answer': Tests ability to explain and articulate
   - 'fill_blank': Tests vocabulary and contextual understanding
3. Write clear questions that have definitive answers
4. For multiple choice, include plausible distractors that test understanding
5. Provide explanations that teach, not just confirm

QUALITY CRITERIA:
- Questions should be unambiguous
- All options in multiple choice should be grammatically consistent
- Avoid "all of the above" or "none of the above"
- True/false should test genuine understanding, not trick questions
- Explanations should help learners understand WHY

Output your questions in the specified JSON format.`

const SUGGESTION_SYSTEM_PROMPT = `You are an expert learning facilitator helping students explore content more deeply.
Generate thought-provoking questions that guide self-directed learning.

CATEGORIES:
- clarification: Questions to verify understanding of core concepts
- exploration: Questions that encourage deeper investigation
- application: Questions about real-world use cases
- connection: Questions that link to related topics

Generate diverse, engaging questions that spark curiosity.`

/**
 * Generate flashcards using LLM with chain-of-thought
 */
async function generateFlashcardsWithLLM(
  content: string,
  options: GenerationOptions,
  nlpCards: GeneratedFlashcard[]
): Promise<GeneratedFlashcard[]> {
  if (!isLLMAvailable()) {
    return nlpCards
  }

  const { difficulty = 'intermediate', maxItems = 10, title, strandSlug, focusTopics } = options
  
  // Build context from NLP analysis
  const entities = await extractEntitiesAsync(content)
  const summary = generateExtractiveSummary(content, 300)
  const existingTerms = nlpCards.map(c => c.back).join(', ')

  // Build RAG context section if available
  const ragSection = options.ragContext ? buildRAGContextSection(options.ragContext) : ''
  
  const prompt = `Generate ${maxItems} flashcards from the following content.

CONTENT SUMMARY:
${summary}

TITLE: ${title || 'Unknown'}
STRAND: ${strandSlug || 'general'}
TARGET DIFFICULTY: ${difficulty}
${focusTopics?.length ? `FOCUS TOPICS: ${focusTopics.join(', ')}` : ''}

KEY ENTITIES DETECTED:
- Technologies: ${entities.technologies.slice(0, 10).join(', ') || 'none'}
- Concepts: ${entities.concepts.slice(0, 10).join(', ') || 'none'}
- Topics: ${entities.topics.slice(0, 10).join(', ') || 'none'}
${ragSection}
ALREADY COVERED (avoid duplicates):
${existingTerms || 'none'}

FULL CONTENT:
${content.slice(0, 4000)}

Generate diverse, high-quality flashcards focusing on the most important concepts.
Mix card types (basic, cloze, reversed) for variety.
${options.ragContext ? 'Use the related content context to make connections and test cross-topic understanding.' : ''}`

  try {
    const result = await generateStructured(prompt, FlashcardSchema, {
      system: FLASHCARD_SYSTEM_PROMPT,
      temperature: 0.7,
      maxTokens: 2000,
    })

    return result.cards.map((card, idx) => ({
      id: generateId(),
      type: card.type,
      front: card.front,
      back: card.back,
      hint: card.hint,
      tags: ['llm-generated', difficulty, ...(focusTopics || [])],
      source: 'llm' as GenerationSource,
      confidence: card.confidence,
    }))
  } catch (error) {
    console.error('[Generation] LLM flashcard generation failed:', error)
    return []
  }
}

/**
 * Generate quiz questions using LLM with chain-of-thought
 */
async function generateQuestionsWithLLM(
  content: string,
  options: GenerationOptions,
  nlpQuestions: GeneratedQuestion[]
): Promise<GeneratedQuestion[]> {
  if (!isLLMAvailable()) {
    return nlpQuestions
  }

  const { difficulty = 'intermediate', maxItems = 10, title, strandSlug, focusTopics } = options
  
  const entities = await extractEntitiesAsync(content)
  const summary = generateExtractiveSummary(content, 300)
  const existingQuestions = nlpQuestions.map(q => q.question).join('\n')

  // Build RAG context section if available
  const ragSection = options.ragContext ? buildRAGContextSection(options.ragContext) : ''
  
  const prompt = `Generate ${maxItems} quiz questions from the following content.

CONTENT SUMMARY:
${summary}

TITLE: ${title || 'Unknown'}
STRAND: ${strandSlug || 'general'}
TARGET DIFFICULTY: ${difficulty}
${focusTopics?.length ? `FOCUS TOPICS: ${focusTopics.join(', ')}` : ''}

KEY ENTITIES:
- Technologies: ${entities.technologies.slice(0, 10).join(', ') || 'none'}
- Concepts: ${entities.concepts.slice(0, 10).join(', ') || 'none'}
${ragSection}
QUESTIONS ALREADY GENERATED (avoid similar):
${existingQuestions || 'none'}

FULL CONTENT:
${content.slice(0, 4000)}

Generate questions at the ${difficulty} level.
Include a mix of types: multiple_choice, true_false, short_answer, fill_blank.
For multiple_choice, provide exactly 4 options with one correct answer.
${options.ragContext ? 'Include some questions that test understanding of relationships between this content and related topics from the RAG context.' : ''}`

  try {
    const result = await generateStructured(prompt, QuizSchema, {
      system: QUIZ_SYSTEM_PROMPT,
      temperature: 0.7,
      maxTokens: 2500,
    })

    return result.questions.map((q, idx) => ({
      id: generateId(),
      type: q.type,
      question: q.question,
      answer: q.answer,
      options: q.options,
      explanation: q.explanation,
      difficulty: q.difficulty,
      tags: ['llm-generated', q.difficulty, ...(focusTopics || [])],
      source: 'llm' as GenerationSource,
      confidence: q.confidence,
    }))
  } catch (error) {
    console.error('[Generation] LLM quiz generation failed:', error)
    return []
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   PUBLIC API
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Generate flashcards from content using hybrid NLP + LLM approach
 */
export async function generateFlashcards(
  options: GenerationOptions
): Promise<GenerationResult<GeneratedFlashcard>> {
  const startTime = Date.now()
  const { content, useLLM = false, maxItems = 10 } = options

  // Step 1: Static NLP generation
  const [clozeCards, basicCards] = await Promise.all([
    generateClozeFromNLP(content, options),
    generateBasicFromNLP(content, options),
  ])
  
  let nlpCards = [...clozeCards, ...basicCards]
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, maxItems)

  const nlpConfidence = nlpCards.length > 0
    ? nlpCards.reduce((sum, c) => sum + c.confidence, 0) / nlpCards.length
    : 0

  // Step 2: LLM enhancement if requested and available
  let llmCards: GeneratedFlashcard[] = []
  let llmUsed = false
  let tokensUsed: number | undefined

  if (useLLM && isLLMAvailable()) {
    llmCards = await generateFlashcardsWithLLM(content, options, nlpCards)
    llmUsed = llmCards.length > 0
  }

  // Step 3: Merge and deduplicate
  const allCards = [...nlpCards, ...llmCards]
  const uniqueCards = deduplicateCards(allCards)
    .slice(0, maxItems)

  const source: GenerationSource = llmUsed 
    ? (nlpCards.length > 0 ? 'hybrid' : 'llm')
    : 'static'

  return {
    items: uniqueCards,
    source,
    metadata: {
      processingTime: Date.now() - startTime,
      nlpConfidence,
      llmUsed,
      tokensUsed,
    },
  }
}

/**
 * Generate quiz questions from content using hybrid NLP + LLM approach
 */
export async function generateQuiz(
  options: GenerationOptions
): Promise<GenerationResult<GeneratedQuestion>> {
  const startTime = Date.now()
  const { content, useLLM = false, maxItems = 10 } = options

  // Step 1: Static NLP generation
  const nlpQuestions = await generateQuestionsFromNLP(content, options)
  
  const nlpConfidence = nlpQuestions.length > 0
    ? nlpQuestions.reduce((sum, q) => sum + q.confidence, 0) / nlpQuestions.length
    : 0

  // Step 2: LLM enhancement if requested and available
  let llmQuestions: GeneratedQuestion[] = []
  let llmUsed = false

  if (useLLM && isLLMAvailable()) {
    llmQuestions = await generateQuestionsWithLLM(content, options, nlpQuestions)
    llmUsed = llmQuestions.length > 0
  }

  // Step 3: Merge and deduplicate
  const allQuestions = [...nlpQuestions, ...llmQuestions]
  const uniqueQuestions = deduplicateQuestions(allQuestions)
    .slice(0, maxItems)

  const source: GenerationSource = llmUsed 
    ? (nlpQuestions.length > 0 ? 'hybrid' : 'llm')
    : 'static'

  return {
    items: uniqueQuestions,
    source,
    metadata: {
      processingTime: Date.now() - startTime,
      nlpConfidence,
      llmUsed,
    },
  }
}

/**
 * Generate learning suggestions/prompts for a strand
 */
export async function generateSuggestions(
  options: GenerationOptions
): Promise<GenerationResult<{ text: string; category: string; relatedTopics?: string[] }>> {
  const startTime = Date.now()
  const { content, useLLM = false, maxItems = 8, title, strandSlug } = options

  // Static generation from key phrases
  const phrases = await extractKeyPhrasesAsync(content, 10)
  const entities = await extractEntitiesAsync(content)
  
  const staticSuggestions = [
    // Clarification questions
    ...phrases.slice(0, 2).map(phrase => ({
      text: `Can you explain what "${phrase}" means in this context?`,
      category: 'clarification',
    })),
    // Exploration questions
    ...entities.technologies.slice(0, 2).map(tech => ({
      text: `How does ${tech} compare to alternative approaches?`,
      category: 'exploration',
      relatedTopics: [tech],
    })),
    // Application questions
    {
      text: `What are practical use cases for the concepts discussed here?`,
      category: 'application',
    },
    // Connection questions
    ...entities.concepts.slice(0, 2).map(concept => ({
      text: `How does ${concept} relate to other topics in this domain?`,
      category: 'connection',
      relatedTopics: [concept],
    })),
  ].slice(0, maxItems)

  let llmSuggestions: Array<{ text: string; category: string; relatedTopics?: string[] }> = []
  let llmUsed = false

  if (useLLM && isLLMAvailable()) {
    try {
      const summary = generateExtractiveSummary(content, 500)
      const prompt = `Generate ${maxItems} thought-provoking questions for the following content:

TITLE: ${title || 'Unknown'}
STRAND: ${strandSlug || 'general'}

CONTENT SUMMARY:
${summary}

KEY TECHNOLOGIES: ${entities.technologies.join(', ') || 'none'}
KEY CONCEPTS: ${entities.concepts.join(', ') || 'none'}

Generate questions that encourage deeper exploration and understanding.`

      const result = await generateStructured(prompt, SuggestionSchema, {
        system: SUGGESTION_SYSTEM_PROMPT,
        temperature: 0.8,
        maxTokens: 1000,
      })

      llmSuggestions = result.suggestions
      llmUsed = true
    } catch (error) {
      console.error('[Generation] LLM suggestion generation failed:', error)
    }
  }

  const allSuggestions = [...staticSuggestions, ...llmSuggestions]
    .slice(0, maxItems)

  return {
    items: allSuggestions,
    source: llmUsed ? 'hybrid' : 'static',
    metadata: {
      processingTime: Date.now() - startTime,
      nlpConfidence: 0.7,
      llmUsed,
    },
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   UTILITIES
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Deduplicate flashcards by comparing front/back similarity
 */
function deduplicateCards(cards: GeneratedFlashcard[]): GeneratedFlashcard[] {
  const seen = new Set<string>()
  return cards.filter(card => {
    const key = `${card.front.toLowerCase().slice(0, 50)}|${card.back.toLowerCase().slice(0, 50)}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/**
 * Deduplicate questions by comparing question text similarity
 */
function deduplicateQuestions(questions: GeneratedQuestion[]): GeneratedQuestion[] {
  const seen = new Set<string>()
  return questions.filter(q => {
    const key = q.question.toLowerCase().slice(0, 50)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/**
 * Check if generation services are available
 */
export function getGenerationCapabilities(): {
  staticNLP: boolean
  llm: boolean
  providers: string[]
} {
  return {
    staticNLP: true,
    llm: isLLMAvailable(),
    providers: isLLMAvailable() ? llm.getProviders() : [],
  }
}

export default {
  generateFlashcards,
  generateQuiz,
  generateSuggestions,
  getGenerationCapabilities,
}

// Re-export cache services
export * from './contentSelectionCache'
export * from './cacheMetadataService'
















