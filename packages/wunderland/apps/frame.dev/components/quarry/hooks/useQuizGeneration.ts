/**
 * Quiz Question Generation Hook
 *
 * Generates quiz questions dynamically from strand content using NLP:
 * - Multiple choice questions from definitions/concepts
 * - True/False questions from factual statements
 * - Fill-in-the-blank (cloze) questions from key terms
 * - Persistent caching of generated quizzes
 *
 * @module hooks/useQuizGeneration
 */

'use client'

import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { parseMarkdownBlocks } from '@/lib/nlp'
import * as quizCache from '@/lib/generation/quizCache'
import type { QuizCacheStats, CachedQuiz } from '@/lib/generation/quizCache'

// ==================== Types ====================

export type QuizQuestionType = 'multiple_choice' | 'true_false' | 'fill_blank'
export type QuizDifficulty = 'easy' | 'medium' | 'hard'

/** Progress state for quiz generation */
export type GenerationProgress = {
  stage: 'idle' | 'checking_cache' | 'loading_nlp' | 'extracting_terms' | 'generating_questions' | 'caching' | 'complete'
  message: string
  percent: number
}

/** Source information for multi-strand quiz generation */
export interface QuizQuestionSource {
  strandId: string
  strandPath: string
  strandTitle: string
}

export interface QuizQuestion {
  id: string
  type: QuizQuestionType
  question: string
  options?: string[]
  answer: string
  explanation?: string
  difficulty: QuizDifficulty
  /** Source text this question was generated from */
  sourceText?: string
  /** Generation confidence (0-1) */
  confidence?: number
  /** Source strand information (for multi-strand generation) */
  source?: QuizQuestionSource
}

export interface GenerationStats {
  total: number
  multipleChoice: number
  trueFalse: number
  fillBlank: number
  skipped: number
}

export interface UseQuizGenerationOptions {
  /** Minimum content length to generate questions */
  minContentLength?: number
  /** Maximum number of questions to generate */
  maxQuestions?: number
  /** Question types to generate */
  types?: QuizQuestionType[]
  /** Default difficulty for generation */
  difficulty?: QuizDifficulty
  /** Strand slug for caching and context */
  strandSlug?: string
}

export interface CacheInfo {
  fromCache: boolean
  cacheAge?: number
  generationMethod?: string
}

/** Strand content for multi-strand generation */
export interface StrandContent {
  id: string
  path: string
  title: string
  content: string
}

export interface UseQuizGenerationReturn {
  /** Generated questions */
  questions: QuizQuestion[]
  /** Whether currently generating */
  generating: boolean
  /** Current generation progress with detailed steps */
  progress: GenerationProgress
  /** Error message if generation failed */
  error: string | null
  /** Generation statistics */
  stats: GenerationStats | null
  /** Cache information for last generation */
  cacheInfo: CacheInfo | null
  /** Cache statistics */
  cacheStats: QuizCacheStats | null
  /** Generate questions from single content */
  generate: (content: string, options?: { forceRegenerate?: boolean }) => Promise<QuizQuestion[]>
  /** Generate questions from multiple strands with source tracking */
  generateMultiStrand: (strands: StrandContent[], options?: { forceRegenerate?: boolean }) => Promise<QuizQuestion[]>
  /** Clear generated questions */
  clear: () => void
  /** Clear the quiz cache */
  clearCache: () => Promise<{ deleted: number }>
  /** Get questions by type */
  getByType: (type: QuizQuestionType) => QuizQuestion[]
  /** Get questions by difficulty */
  getByDifficulty: (difficulty: QuizDifficulty) => QuizQuestion[]
  /** Get questions by source strand */
  getBySource: (strandId: string) => QuizQuestion[]
}

// ==================== Utilities ====================

/**
 * Generate a UUID v4
 */
function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

/**
 * Patterns that indicate markdown artifacts NOT real terms
 * These should never become quiz questions
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

/**
 * Check if a term should be excluded from quiz generation
 */
function shouldExcludeTerm(term: string): boolean {
  const cleaned = term.trim()
  if (cleaned.length < 3 || cleaned.length > 60) return true
  if (EXCLUDE_TERM_PATTERNS.some(p => p.test(cleaned))) return true
  // Exclude pure punctuation or whitespace
  if (/^[\s\W]+$/.test(cleaned)) return true
  // Exclude terms ending with colon (likely section headers)
  if (cleaned.endsWith(':')) return true
  return false
}

/**
 * Extract text content from markdown, filtering out code blocks and frontmatter
 */
function extractTextFromMarkdown(content: string): string {
  const blocks = parseMarkdownBlocks(content)

  // Only include paragraph, heading, and list blocks (skip code, tables, etc.)
  const textBlocks = blocks
    .filter(b => b.type === 'paragraph' || b.type === 'heading' || b.type === 'list')
    .map(b => b.content)

  return textBlocks.join('\n\n')
}

/**
 * Get sentences from text content
 */
function getSentences(text: string): string[] {
  return text
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 20 && s.length < 300) // Filter reasonable length
}

/**
 * Extract key terms using NLP (similar to flashcard generation)
 */
async function extractKeyTerms(text: string): Promise<{
  terms: string[]
  definitions: Array<{ term: string; definition: string }>
}> {
  const terms: string[] = []
  const definitions: Array<{ term: string; definition: string }> = []

  try {
    // Dynamic import for Compromise.js
    const nlp = (await import('compromise')).default
    const doc = nlp(text)

    // Extract topics, people, places
    const topics = doc.topics().out('array') as string[]
    const people = doc.people().out('array') as string[]
    const places = doc.places().out('array') as string[]
    const nouns = doc.nouns().toSingular().out('array') as string[]

    // Combine and deduplicate, prioritizing specificity
    // IMPORTANT: Filter out markdown artifacts using shouldExcludeTerm
    const allTerms = [...new Set([...topics, ...people, ...places, ...nouns.slice(0, 20)])]
      .filter(t => t.length >= 3 && t.length <= 50)
      .filter(t => !shouldExcludeTerm(t))

    terms.push(...allTerms)

    // Extract definitions using patterns
    const definitionPatterns = [
      /([A-Z][a-zA-Z\s]+)\s+(?:is|are|refers to|means|describes)\s+(.+?)[.!?]/g,
      /(?:The term\s+)?["']?([^"']+)["']?\s+(?:is defined as|can be defined as)\s+(.+?)[.!?]/g,
      /\*\*([^*]+)\*\*[:\s]+(.+?)[.!?]/g,
    ]

    for (const pattern of definitionPatterns) {
      let match
      pattern.lastIndex = 0
      while ((match = pattern.exec(text)) !== null) {
        const term = match[1].trim()
        const definition = match[2].trim()
        // IMPORTANT: Filter out markdown artifacts
        if (term.length >= 3 && term.length <= 50 && definition.length >= 10 && !shouldExcludeTerm(term)) {
          definitions.push({ term, definition })
        }
      }
    }

  } catch (err) {
    console.warn('[useQuizGeneration] NLP extraction failed:', err)
    // Fallback: extract capitalized terms
    const capitalizedWords = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) || []
    terms.push(
      ...[...new Set(capitalizedWords)]
        .filter(t => !shouldExcludeTerm(t))
        .slice(0, 15)
    )
  }

  return { terms, definitions }
}

/**
 * Generate plausible distractors for multiple choice questions
 * Uses RAG-powered generation when available, falls back to local terms
 */
function generateDistractors(answer: string, terms: string[], count: number = 3): string[] {
  // Import the sync version for immediate use
  // RAG-powered async version is used in generateMultipleChoiceAsync
  const { generateDistractorsSync } = require('@/lib/generation/ragDistractors')
  return generateDistractorsSync(answer, terms, count)
}

/**
 * Generate distractors with RAG (async version for better quality)
 */
async function generateDistractorsWithRAG(
  answer: string, 
  content: string, 
  terms: string[], 
  count: number = 3
): Promise<string[]> {
  try {
    const { generateRAGDistractors } = await import('@/lib/generation/ragDistractors')
    const result = await generateRAGDistractors({
      answer,
      content,
      count,
    })
    return result.distractors
  } catch (err) {
    console.warn('[useQuizGeneration] RAG distractors failed, using sync fallback:', err)
    return generateDistractors(answer, terms, count)
  }
}

/**
 * Shuffle array (Fisher-Yates)
 */
function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

/**
 * Determine question difficulty based on term/content complexity
 */
function determineDifficulty(term: string, context: string): QuizDifficulty {
  const wordCount = context.split(/\s+/).length
  const termLength = term.length

  // Short context with simple term = easy
  if (wordCount < 15 && termLength < 10) return 'easy'

  // Long context with complex term = hard
  if (wordCount > 40 || termLength > 15) return 'hard'

  return 'medium'
}

// ==================== Main Hook ====================

const INITIAL_PROGRESS: GenerationProgress = {
  stage: 'idle',
  message: '',
  percent: 0,
}

/**
 * Yield to the main thread to keep UI responsive
 */
function yieldToMain(): Promise<void> {
  return new Promise(resolve => {
    if ('scheduler' in window && 'yield' in (window.scheduler as any)) {
      // Use scheduler.yield if available (Chrome 115+)
      (window.scheduler as any).yield().then(resolve)
    } else if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(() => resolve(), { timeout: 16 })
    } else {
      setTimeout(resolve, 0)
    }
  })
}

export function useQuizGeneration(options: UseQuizGenerationOptions = {}): UseQuizGenerationReturn {
  const {
    minContentLength = 100,
    maxQuestions = 10,
    types = ['multiple_choice', 'true_false', 'fill_blank'],
    difficulty = 'medium',
  } = options

  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [generating, setGenerating] = useState(false)
  const [progress, setProgress] = useState<GenerationProgress>(INITIAL_PROGRESS)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<GenerationStats | null>(null)
  const [cacheInfo, setCacheInfo] = useState<CacheInfo | null>(null)
  const [cacheStats, setCacheStats] = useState<QuizCacheStats | null>(null)
  
  // Abort controller for cancelling generation
  const abortRef = useRef<AbortController | null>(null)

  // Load cache stats on mount
  useEffect(() => {
    quizCache.getCacheStats().then(setCacheStats).catch(console.error)
  }, [])

  /**
   * Question templates for variety - not just "What is X?"
   */
  const questionTemplates = [
    { template: (term: string) => `What does "${term}" refer to?`, explanation: (term: string, def: string) => `"${term}" refers to: ${def}` },
    { template: (term: string) => `Which of the following best describes "${term}"?`, explanation: (term: string, def: string) => `The best description of "${term}" is: ${def}` },
    { template: (term: string) => `How is "${term}" defined?`, explanation: (term: string, def: string) => `"${term}" is defined as: ${def}` },
    { template: (term: string) => `What is the meaning of "${term}"?`, explanation: (term: string, def: string) => `"${term}" means: ${def}` },
    { template: (term: string) => `"${term}" can best be understood as:`, explanation: (term: string, def: string) => `"${term}" is understood as: ${def}` },
  ]

  /**
   * Generate multiple choice questions from definitions (sync version)
   */
  const generateMultipleChoice = useCallback((
    definitions: Array<{ term: string; definition: string }>,
    terms: string[]
  ): QuizQuestion[] => {
    const questions: QuizQuestion[] = []
    let templateIndex = 0

    for (const { term, definition } of definitions.slice(0, 5)) {
      // Skip if term is a markdown artifact
      if (shouldExcludeTerm(term)) continue

      const distractors = generateDistractors(definition, terms.map(t => t), 3)
      const options = shuffleArray([definition, ...distractors])

      // Use varied question templates
      const { template, explanation } = questionTemplates[templateIndex % questionTemplates.length]
      templateIndex++

      questions.push({
        id: generateId(),
        type: 'multiple_choice',
        question: template(term),
        options,
        answer: definition,
        explanation: explanation(term, definition),
        difficulty: determineDifficulty(term, definition),
        sourceText: `${term}: ${definition}`,
        confidence: 0.8,
      })
    }

    return questions
  }, [])
  
  /**
   * Generate multiple choice questions with RAG-powered distractors (async version)
   * Produces higher quality distractors by searching related content
   */
  const generateMultipleChoiceWithRAG = useCallback(async (
    definitions: Array<{ term: string; definition: string }>,
    terms: string[],
    fullContent: string
  ): Promise<QuizQuestion[]> => {
    const questions: QuizQuestion[] = []
    let templateIndex = 0

    for (const { term, definition } of definitions.slice(0, 5)) {
      // Skip if term is a markdown artifact
      if (shouldExcludeTerm(term)) continue

      // Use RAG-powered distractors for better quality
      const distractors = await generateDistractorsWithRAG(
        definition, 
        fullContent, 
        terms.map(t => t), 
        3
      )
      const options = shuffleArray([definition, ...distractors])

      // Use varied question templates
      const { template, explanation } = questionTemplates[templateIndex % questionTemplates.length]
      templateIndex++

      questions.push({
        id: generateId(),
        type: 'multiple_choice',
        question: template(term),
        options,
        answer: definition,
        explanation: explanation(term, definition),
        difficulty: determineDifficulty(term, definition),
        sourceText: `${term}: ${definition}`,
        confidence: 0.85, // Higher confidence with RAG
      })
    }

    return questions
  }, [])

  /**
   * Generate true/false questions from factual statements
   */
  const generateTrueFalse = useCallback((
    sentences: string[],
    terms: string[]
  ): QuizQuestion[] => {
    const questions: QuizQuestion[] = []

    // Find sentences that make factual claims
    const factualPatterns = [
      /(.+?)\s+(?:is|are|was|were)\s+(.+)/i,
      /(.+?)\s+(?:can|could|will|would)\s+(.+)/i,
      /(.+?)\s+(?:has|have|had)\s+(.+)/i,
    ]

    for (const sentence of sentences.slice(0, 8)) {
      for (const pattern of factualPatterns) {
        const match = sentence.match(pattern)
        if (match) {
          // Create a true question
          questions.push({
            id: generateId(),
            type: 'true_false',
            question: sentence.endsWith('.') ? sentence : `${sentence}.`,
            answer: 'True',
            explanation: 'This statement is accurate based on the source material.',
            difficulty: determineDifficulty(match[1], sentence),
            sourceText: sentence,
            confidence: 0.75,
          })

          // Optionally create a false version by negating (if we have enough terms)
          if (questions.length < 4 && terms.length > 3) {
            const wrongTerm = terms.find(t =>
              !sentence.toLowerCase().includes(t.toLowerCase()) && t.length > 3
            )
            if (wrongTerm && match[1]) {
              const falseSentence = sentence.replace(match[1], wrongTerm)
              questions.push({
                id: generateId(),
                type: 'true_false',
                question: falseSentence.endsWith('.') ? falseSentence : `${falseSentence}.`,
                answer: 'False',
                explanation: `This statement is incorrect. The original text refers to "${match[1]}", not "${wrongTerm}".`,
                difficulty: 'medium',
                sourceText: sentence,
                confidence: 0.65,
              })
            }
          }
          break // Only one question per sentence
        }
      }

      if (questions.length >= 4) break
    }

    return questions
  }, [])

  /**
   * Generate fill-in-the-blank (cloze) questions
   */
  const generateFillBlank = useCallback((
    sentences: string[],
    terms: string[]
  ): QuizQuestion[] => {
    const questions: QuizQuestion[] = []
    const usedTerms = new Set<string>()

    for (const term of terms.slice(0, 10)) {
      if (usedTerms.has(term.toLowerCase())) continue

      // Find a sentence containing this term
      const sentence = sentences.find(s =>
        s.toLowerCase().includes(term.toLowerCase()) &&
        s.length > term.length + 20
      )

      if (sentence) {
        // Create cloze deletion
        const clozeText = sentence.replace(
          new RegExp(`\\b${term}\\b`, 'gi'),
          '_____'
        )

        // Skip if the cloze is just the blank
        if (clozeText.trim() === '_____' || clozeText.length < 20) continue

        questions.push({
          id: generateId(),
          type: 'fill_blank',
          question: clozeText,
          answer: term,
          explanation: `The missing word is "${term}".`,
          difficulty: determineDifficulty(term, sentence),
          sourceText: sentence,
          confidence: 0.7,
        })

        usedTerms.add(term.toLowerCase())

        if (questions.length >= 4) break
      }
    }

    return questions
  }, [])

  /**
   * Main generation function with caching support and progressive UI updates
   */
  const generate = useCallback(async (
    content: string,
    genOptions: { forceRegenerate?: boolean } = {}
  ): Promise<QuizQuestion[]> => {
    const { forceRegenerate = false } = genOptions

    // Cancel any in-progress generation
    if (abortRef.current) {
      abortRef.current.abort()
    }
    abortRef.current = new AbortController()
    const signal = abortRef.current.signal

    if (content.length < minContentLength) {
      setError(`Content too short (minimum ${minContentLength} characters)`)
      return []
    }

    setGenerating(true)
    setError(null)
    setStats(null)

    // Step 1: Check cache
    setProgress({ stage: 'checking_cache', message: 'Checking cache...', percent: 5 })
    await yieldToMain()

    // Generate cache key
    const cacheKey = quizCache.generateCacheKey(content, difficulty, false)

    // Check cache first (unless force regenerate)
    if (!forceRegenerate) {
      const cached = await quizCache.getFromCache(cacheKey)
      if (cached) {
        console.log('[QuizGeneration] Cache hit')
        setCacheInfo({
          fromCache: true,
          cacheAge: quizCache.getCacheAge(cached.createdAt),
          generationMethod: cached.generationMethod
        })

        // Convert cached questions to local QuizQuestion type
        const cachedQuestions: QuizQuestion[] = cached.questions.map(q => ({
          id: q.id,
          type: q.type,
          question: q.question,
          options: q.options,
          answer: q.answer,
          explanation: q.explanation,
          difficulty: q.difficulty,
          sourceText: q.sourceText,
          confidence: q.confidence,
        }))

        setQuestions(cachedQuestions)
        setStats({
          total: cachedQuestions.length,
          multipleChoice: cachedQuestions.filter(q => q.type === 'multiple_choice').length,
          trueFalse: cachedQuestions.filter(q => q.type === 'true_false').length,
          fillBlank: cachedQuestions.filter(q => q.type === 'fill_blank').length,
          skipped: 0,
        })
        setProgress({ stage: 'complete', message: 'Loaded from cache!', percent: 100 })
        setGenerating(false)

        // Update cache stats
        quizCache.getCacheStats().then(setCacheStats).catch(console.error)

        return cachedQuestions
      }
    }

    // Cache miss - generate fresh
    console.log('[QuizGeneration] Generating fresh')
    setCacheInfo({ fromCache: false })

    try {
      // Step 2: Load NLP library
      setProgress({ stage: 'loading_nlp', message: 'Loading language model...', percent: 15 })
      await yieldToMain()
      
      if (signal.aborted) return []

      // Step 3: Extract text from markdown
      setProgress({ stage: 'extracting_terms', message: 'Analyzing content...', percent: 30 })
      await yieldToMain()
      
      const textContent = extractTextFromMarkdown(content)

      if (textContent.length < minContentLength) {
        setError('Not enough text content after filtering')
        setGenerating(false)
        setProgress(INITIAL_PROGRESS)
        return []
      }

      if (signal.aborted) return []

      // Step 4: Extract key terms and definitions (this is the slow NLP part)
      setProgress({ stage: 'extracting_terms', message: 'Extracting key terms...', percent: 45 })
      await yieldToMain()
      
      const { terms, definitions } = await extractKeyTerms(textContent)
      await yieldToMain()
      
      if (signal.aborted) return []

      setProgress({ stage: 'extracting_terms', message: 'Finding sentence patterns...', percent: 55 })
      await yieldToMain()
      
      const sentences = getSentences(textContent)

      if (terms.length === 0 && definitions.length === 0) {
        setError('Unable to extract meaningful content for questions')
        setGenerating(false)
        setProgress(INITIAL_PROGRESS)
        return []
      }

      if (signal.aborted) return []

      // Step 5: Generate questions (with yields between types)
      setProgress({ stage: 'generating_questions', message: 'Creating multiple choice questions...', percent: 65 })
      await yieldToMain()

      const allQuestions: QuizQuestion[] = []

      // Generate each question type if enabled
      if (types.includes('multiple_choice') && definitions.length > 0) {
        // Use RAG-powered distractors for better quality MCQs
        const mcQuestions = await generateMultipleChoiceWithRAG(definitions, terms, textContent)
        allQuestions.push(...mcQuestions)
        await yieldToMain()
      }

      if (signal.aborted) return []

      setProgress({ stage: 'generating_questions', message: 'Creating true/false questions...', percent: 75 })
      await yieldToMain()

      if (types.includes('true_false') && sentences.length > 0) {
        allQuestions.push(...generateTrueFalse(sentences, terms))
        await yieldToMain()
      }

      if (signal.aborted) return []

      setProgress({ stage: 'generating_questions', message: 'Creating fill-in-blank questions...', percent: 85 })
      await yieldToMain()

      if (types.includes('fill_blank') && terms.length > 0) {
        allQuestions.push(...generateFillBlank(sentences, terms))
        await yieldToMain()
      }

      if (signal.aborted) return []

      // Limit and shuffle
      const finalQuestions = shuffleArray(allQuestions).slice(0, maxQuestions)

      // Calculate stats
      const generationStats: GenerationStats = {
        total: finalQuestions.length,
        multipleChoice: finalQuestions.filter(q => q.type === 'multiple_choice').length,
        trueFalse: finalQuestions.filter(q => q.type === 'true_false').length,
        fillBlank: finalQuestions.filter(q => q.type === 'fill_blank').length,
        skipped: allQuestions.length - finalQuestions.length,
      }

      // Step 6: Save to cache
      setProgress({ stage: 'caching', message: 'Saving to cache...', percent: 95 })
      await yieldToMain()

      if (finalQuestions.length > 0) {
        const cacheData: CachedQuiz = {
          questions: finalQuestions.map(q => ({
            id: q.id,
            type: q.type,
            question: q.question,
            options: q.options,
            answer: q.answer,
            explanation: q.explanation,
            difficulty: q.difficulty,
            sourceText: q.sourceText,
            confidence: q.confidence,
          })),
          generationMethod: 'static',
          createdAt: new Date().toISOString(),
          version: 1
        }

        await quizCache.saveToCache(cacheKey, cacheData)
        console.log(`[QuizGeneration] Cached ${finalQuestions.length} questions`)

        // Update cache stats
        quizCache.getCacheStats().then(setCacheStats).catch(console.error)
      }

      setProgress({ stage: 'complete', message: `Generated ${finalQuestions.length} questions!`, percent: 100 })
      setQuestions(finalQuestions)
      setStats(generationStats)
      setGenerating(false)

      return finalQuestions
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate questions'
      setError(message)
      setGenerating(false)
      setProgress(INITIAL_PROGRESS)
      return []
    }
  }, [minContentLength, maxQuestions, types, difficulty, generateMultipleChoice, generateTrueFalse, generateFillBlank])

  /**
   * Clear generated questions
   */
  const clear = useCallback(() => {
    // Abort any in-progress generation
    if (abortRef.current) {
      abortRef.current.abort()
    }
    setQuestions([])
    setStats(null)
    setError(null)
    setCacheInfo(null)
    setProgress(INITIAL_PROGRESS)
    setGenerating(false)
  }, [])

  /**
   * Clear the quiz cache
   */
  const clearCache = useCallback(async () => {
    const result = await quizCache.invalidateCache()
    console.log(`[QuizGeneration] Cleared ${result.deleted} cache entries`)
    setCacheStats(await quizCache.getCacheStats())
    return result
  }, [])

  /**
   * Get questions filtered by type
   */
  const getByType = useCallback((type: QuizQuestionType): QuizQuestion[] => {
    return questions.filter(q => q.type === type)
  }, [questions])

  /**
   * Get questions filtered by difficulty
   */
  const getByDifficulty = useCallback((difficulty: QuizDifficulty): QuizQuestion[] => {
    return questions.filter(q => q.difficulty === difficulty)
  }, [questions])

  /**
   * Get questions filtered by source strand
   */
  const getBySource = useCallback((strandId: string): QuizQuestion[] => {
    return questions.filter(q => q.source?.strandId === strandId)
  }, [questions])

  /**
   * Generate questions from a single strand with source tracking (internal helper)
   */
  const generateFromStrand = useCallback(async (
    strand: StrandContent,
    allTerms: string[]
  ): Promise<QuizQuestion[]> => {
    const textContent = extractTextFromMarkdown(strand.content)
    if (textContent.length < minContentLength) return []

    const { terms, definitions } = await extractKeyTerms(textContent)
    const sentences = getSentences(textContent)

    const strandQuestions: QuizQuestion[] = []
    const source: QuizQuestionSource = {
      strandId: strand.id,
      strandPath: strand.path,
      strandTitle: strand.title,
    }

    // Generate each question type if enabled
    if (types.includes('multiple_choice') && definitions.length > 0) {
      const mcQuestions = generateMultipleChoice(definitions, [...terms, ...allTerms])
      strandQuestions.push(...mcQuestions.map(q => ({ ...q, source })))
    }

    if (types.includes('true_false') && sentences.length > 0) {
      const tfQuestions = generateTrueFalse(sentences, terms)
      strandQuestions.push(...tfQuestions.map(q => ({ ...q, source })))
    }

    if (types.includes('fill_blank') && terms.length > 0) {
      const fbQuestions = generateFillBlank(sentences, terms)
      strandQuestions.push(...fbQuestions.map(q => ({ ...q, source })))
    }

    return strandQuestions
  }, [types, minContentLength, generateMultipleChoice, generateTrueFalse, generateFillBlank])

  /**
   * Generate questions from multiple strands with source tracking
   */
  const generateMultiStrand = useCallback(async (
    strands: StrandContent[],
    genOptions: { forceRegenerate?: boolean } = {}
  ): Promise<QuizQuestion[]> => {
    const { forceRegenerate = false } = genOptions

    // Cancel any in-progress generation
    if (abortRef.current) {
      abortRef.current.abort()
    }
    abortRef.current = new AbortController()
    const signal = abortRef.current.signal

    if (strands.length === 0) {
      setError('No strands provided for generation')
      return []
    }

    setGenerating(true)
    setError(null)
    setStats(null)
    setCacheInfo({ fromCache: false })

    try {
      // Step 1: Check cache for combined content
      setProgress({ stage: 'checking_cache', message: 'Checking cache...', percent: 5 })
      await yieldToMain()

      // Create cache key from combined strand IDs
      const combinedKey = strands.map(s => s.id).sort().join('|')
      const cacheKey = quizCache.generateCacheKey(combinedKey, difficulty, true)

      if (!forceRegenerate) {
        const cached = await quizCache.getFromCache(cacheKey)
        if (cached) {
          console.log('[QuizGeneration] Multi-strand cache hit')
          setCacheInfo({
            fromCache: true,
            cacheAge: quizCache.getCacheAge(cached.createdAt),
            generationMethod: cached.generationMethod
          })

          const cachedQuestions: QuizQuestion[] = cached.questions.map(q => ({
            id: q.id,
            type: q.type,
            question: q.question,
            options: q.options,
            answer: q.answer,
            explanation: q.explanation,
            difficulty: q.difficulty,
            sourceText: q.sourceText,
            confidence: q.confidence,
            source: q.source as QuizQuestionSource | undefined,
          }))

          setQuestions(cachedQuestions)
          setStats({
            total: cachedQuestions.length,
            multipleChoice: cachedQuestions.filter(q => q.type === 'multiple_choice').length,
            trueFalse: cachedQuestions.filter(q => q.type === 'true_false').length,
            fillBlank: cachedQuestions.filter(q => q.type === 'fill_blank').length,
            skipped: 0,
          })
          setProgress({ stage: 'complete', message: 'Loaded from cache!', percent: 100 })
          setGenerating(false)
          quizCache.getCacheStats().then(setCacheStats).catch(console.error)
          return cachedQuestions
        }
      }

      // Step 2: Load NLP library
      setProgress({ stage: 'loading_nlp', message: 'Loading language model...', percent: 10 })
      await yieldToMain()

      if (signal.aborted) return []

      // Step 3: First pass - extract all terms for cross-pollination
      setProgress({ stage: 'extracting_terms', message: 'Analyzing content from all strands...', percent: 20 })
      await yieldToMain()

      const allTerms: string[] = []
      for (const strand of strands) {
        const text = extractTextFromMarkdown(strand.content)
        const { terms } = await extractKeyTerms(text)
        allTerms.push(...terms)
        await yieldToMain()
        if (signal.aborted) return []
      }

      // Step 4: Generate questions from each strand
      const allQuestions: QuizQuestion[] = []
      const strandCount = strands.length
      
      for (let i = 0; i < strandCount; i++) {
        const strand = strands[i]
        const progressPercent = 30 + Math.floor((i / strandCount) * 50)
        
        setProgress({
          stage: 'generating_questions',
          message: `Processing "${strand.title}" (${i + 1}/${strandCount})...`,
          percent: progressPercent
        })
        await yieldToMain()

        if (signal.aborted) return []

        const strandQuestions = await generateFromStrand(strand, allTerms)
        allQuestions.push(...strandQuestions)
        await yieldToMain()
      }

      if (signal.aborted) return []

      // Step 5: Balance and limit questions
      setProgress({ stage: 'generating_questions', message: 'Balancing questions across strands...', percent: 85 })
      await yieldToMain()

      // Balance: take proportionally from each strand, prioritize diversity
      const strandQuestionMap = new Map<string, QuizQuestion[]>()
      for (const q of allQuestions) {
        const strandId = q.source?.strandId || 'unknown'
        if (!strandQuestionMap.has(strandId)) {
          strandQuestionMap.set(strandId, [])
        }
        strandQuestionMap.get(strandId)!.push(q)
      }

      const questionsPerStrand = Math.max(2, Math.floor(maxQuestions / strandCount))
      const finalQuestions: QuizQuestion[] = []
      
      for (const [, questions] of strandQuestionMap) {
        const shuffled = shuffleArray(questions)
        finalQuestions.push(...shuffled.slice(0, questionsPerStrand))
      }

      // Shuffle final questions and limit
      const limitedQuestions = shuffleArray(finalQuestions).slice(0, maxQuestions)

      // Calculate stats
      const generationStats: GenerationStats = {
        total: limitedQuestions.length,
        multipleChoice: limitedQuestions.filter(q => q.type === 'multiple_choice').length,
        trueFalse: limitedQuestions.filter(q => q.type === 'true_false').length,
        fillBlank: limitedQuestions.filter(q => q.type === 'fill_blank').length,
        skipped: allQuestions.length - limitedQuestions.length,
      }

      // Step 6: Save to cache
      setProgress({ stage: 'caching', message: 'Saving to cache...', percent: 95 })
      await yieldToMain()

      if (limitedQuestions.length > 0) {
        const cacheData: CachedQuiz = {
          questions: limitedQuestions.map(q => ({
            id: q.id,
            type: q.type,
            question: q.question,
            options: q.options,
            answer: q.answer,
            explanation: q.explanation,
            difficulty: q.difficulty,
            sourceText: q.sourceText,
            confidence: q.confidence,
            source: q.source,
          })),
          generationMethod: 'multi-strand',
          createdAt: new Date().toISOString(),
          version: 1
        }

        await quizCache.saveToCache(cacheKey, cacheData)
        console.log(`[QuizGeneration] Cached ${limitedQuestions.length} multi-strand questions from ${strandCount} strands`)
        quizCache.getCacheStats().then(setCacheStats).catch(console.error)
      }

      setProgress({ 
        stage: 'complete', 
        message: `Generated ${limitedQuestions.length} questions from ${strandCount} strands!`, 
        percent: 100 
      })
      setQuestions(limitedQuestions)
      setStats(generationStats)
      setGenerating(false)

      return limitedQuestions
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate questions'
      setError(message)
      setGenerating(false)
      setProgress(INITIAL_PROGRESS)
      return []
    }
  }, [difficulty, maxQuestions, generateFromStrand])

  return {
    questions,
    generating,
    progress,
    error,
    stats,
    cacheInfo,
    cacheStats,
    generate,
    generateMultiStrand,
    clear,
    clearCache,
    getByType,
    getByDifficulty,
    getBySource,
  }
}

export default useQuizGeneration
