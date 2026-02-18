/**
 * Quiz Generation Job Processor
 * @module lib/jobs/processors/quizGeneration
 *
 * Processor for the quiz_generation job type.
 * Generates quiz questions using NLP extraction from strand content.
 *
 * Pipeline:
 * 1. Check cache (5-10%)
 * 2. Load strand content (10-20%)
 * 3. Extract key terms and patterns via NLP (20-50%)
 * 4. Generate questions (50-85%)
 * 5. Save to cache (85-95%)
 * 6. Complete (100%)
 */

import type { Job, JobResult, QuizJobPayload, QuizJobResult } from '../types'
import type { JobProcessor } from '../jobQueue'
import { getContentStore } from '@/lib/content'
import * as quizCache from '@/lib/generation/quizCache'
import type { CachedQuiz, CachedQuizQuestion, QuizQuestionSource } from '@/lib/generation/quizCache'
import { parseMarkdownBlocks } from '@/lib/nlp'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

type QuizQuestionType = 'multiple_choice' | 'true_false' | 'fill_blank'
type QuizDifficulty = 'easy' | 'medium' | 'hard'

interface QuizQuestion {
  id: string
  type: QuizQuestionType
  question: string
  options?: string[]
  answer: string
  explanation?: string
  difficulty: QuizDifficulty
  sourceText?: string
  confidence?: number
  source?: QuizQuestionSource
}

/* ═══════════════════════════════════════════════════════════════════════════
   UTILITIES
═══════════════════════════════════════════════════════════════════════════ */

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
  if (EXCLUDE_TERM_PATTERNS.some(p => p.test(cleaned))) return true
  if (/^[\s\W]+$/.test(cleaned)) return true
  if (cleaned.endsWith(':')) return true
  return false
}

function extractTextFromMarkdown(content: string): string {
  const blocks = parseMarkdownBlocks(content)
  const textBlocks = blocks
    .filter(b => b.type === 'paragraph' || b.type === 'heading' || b.type === 'list')
    .map(b => b.content)
  return textBlocks.join('\n\n')
}

function getSentences(text: string): string[] {
  return text
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 20 && s.length < 300)
}

async function extractKeyTerms(text: string): Promise<{
  terms: string[]
  definitions: Array<{ term: string; definition: string }>
}> {
  const terms: string[] = []
  const definitions: Array<{ term: string; definition: string }> = []

  try {
    const nlp = (await import('compromise')).default
    const doc = nlp(text)

    const topics = doc.topics().out('array') as string[]
    const people = doc.people().out('array') as string[]
    const places = doc.places().out('array') as string[]
    const nouns = doc.nouns().toSingular().out('array') as string[]

    const allTerms = [...new Set([...topics, ...people, ...places, ...nouns.slice(0, 20)])]
      .filter(t => t.length >= 3 && t.length <= 50)
      .filter(t => !shouldExcludeTerm(t))

    terms.push(...allTerms)

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
        if (term.length >= 3 && term.length <= 50 && definition.length >= 10 && !shouldExcludeTerm(term)) {
          definitions.push({ term, definition })
        }
      }
    }
  } catch (err) {
    console.warn('[QuizProcessor] NLP extraction failed:', err)
    const capitalizedWords = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) || []
    terms.push(
      ...[...new Set(capitalizedWords)]
        .filter(t => !shouldExcludeTerm(t))
        .slice(0, 15)
    )
  }

  return { terms, definitions }
}

function generateDistractors(answer: string, terms: string[], count: number = 3): string[] {
  const distractors: string[] = []
  const normalized = answer.toLowerCase().trim()

  const candidates = terms.filter(t => {
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
    const unused = generic.find(g => !distractors.includes(g))
    if (unused) {
      distractors.push(unused)
    } else {
      break
    }
  }

  return distractors.slice(0, count)
}

function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function determineDifficulty(term: string, context: string): QuizDifficulty {
  const wordCount = context.split(/\s+/).length
  const termLength = term.length

  if (wordCount < 15 && termLength < 10) return 'easy'
  if (wordCount > 40 || termLength > 15) return 'hard'
  return 'medium'
}

/* ═══════════════════════════════════════════════════════════════════════════
   QUESTION GENERATORS
═══════════════════════════════════════════════════════════════════════════ */

const questionTemplates = [
  { template: (term: string) => `What does "${term}" refer to?`, explanation: (term: string, def: string) => `"${term}" refers to: ${def}` },
  { template: (term: string) => `Which of the following best describes "${term}"?`, explanation: (term: string, def: string) => `The best description of "${term}" is: ${def}` },
  { template: (term: string) => `How is "${term}" defined?`, explanation: (term: string, def: string) => `"${term}" is defined as: ${def}` },
  { template: (term: string) => `What is the meaning of "${term}"?`, explanation: (term: string, def: string) => `"${term}" means: ${def}` },
  { template: (term: string) => `"${term}" can best be understood as:`, explanation: (term: string, def: string) => `"${term}" is understood as: ${def}` },
]

function generateMultipleChoice(
  definitions: Array<{ term: string; definition: string }>,
  terms: string[],
  source?: QuizQuestionSource
): QuizQuestion[] {
  const questions: QuizQuestion[] = []
  let templateIndex = 0

  for (const { term, definition } of definitions.slice(0, 5)) {
    if (shouldExcludeTerm(term)) continue

    const distractors = generateDistractors(definition, terms.map(t => t), 3)
    const options = shuffleArray([definition, ...distractors])

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
      source,
    })
  }

  return questions
}

function generateTrueFalse(
  sentences: string[],
  terms: string[],
  source?: QuizQuestionSource
): QuizQuestion[] {
  const questions: QuizQuestion[] = []

  const factualPatterns = [
    /(.+?)\s+(?:is|are|was|were)\s+(.+)/i,
    /(.+?)\s+(?:can|could|will|would)\s+(.+)/i,
    /(.+?)\s+(?:has|have|had)\s+(.+)/i,
  ]

  for (const sentence of sentences.slice(0, 8)) {
    for (const pattern of factualPatterns) {
      const match = sentence.match(pattern)
      if (match) {
        questions.push({
          id: generateId(),
          type: 'true_false',
          question: sentence.endsWith('.') ? sentence : `${sentence}.`,
          answer: 'True',
          explanation: 'This statement is accurate based on the source material.',
          difficulty: determineDifficulty(match[1], sentence),
          sourceText: sentence,
          confidence: 0.75,
          source,
        })

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
              source,
            })
          }
        }
        break
      }
    }

    if (questions.length >= 4) break
  }

  return questions
}

function generateFillBlank(
  sentences: string[],
  terms: string[],
  source?: QuizQuestionSource
): QuizQuestion[] {
  const questions: QuizQuestion[] = []
  const usedTerms = new Set<string>()

  for (const term of terms.slice(0, 10)) {
    if (usedTerms.has(term.toLowerCase())) continue

    const sentence = sentences.find(s =>
      s.toLowerCase().includes(term.toLowerCase()) &&
      s.length > term.length + 20
    )

    if (sentence) {
      const clozeText = sentence.replace(
        new RegExp(`\\b${term}\\b`, 'gi'),
        '_____'
      )

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
        source,
      })

      usedTerms.add(term.toLowerCase())

      if (questions.length >= 4) break
    }
  }

  return questions
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN PROCESSOR
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Quiz generation processor
 *
 * Generates quiz questions using NLP extraction from strand content.
 * Supports multiple choice, true/false, and fill-in-the-blank questions.
 */
export const quizGenerationProcessor: JobProcessor = async (
  job: Job,
  onProgress: (progress: number, message: string) => void
): Promise<JobResult> => {
  const startTime = Date.now()
  const payload = job.payload as QuizJobPayload
  const {
    strandPaths,
    questionCount = 10,
    questionTypes = ['multiple_choice', 'true_false', 'fill_blank'],
  } = payload

  onProgress(0, 'Initializing quiz generation...')

  // ============================================================================
  // STAGE 1: Check cache (0-10%)
  // ============================================================================

  onProgress(5, 'Checking cache...')

  // Generate cache key from sorted strand paths for order-independence
  const sortedPaths = [...strandPaths].sort()
  const cacheKey = quizCache.generateCacheKey(sortedPaths.join('|'), 'medium', true)

  const cached = await quizCache.getFromCache(cacheKey)
  if (cached) {
    onProgress(100, 'Loaded from cache')
    console.log(`[QuizProcessor] Cache hit: ${cached.questions.length} questions`)

    const result: QuizJobResult = {
      count: cached.questions.length,
      questionIds: cached.questions.map(q => q.id),
    }
    return result
  }

  // ============================================================================
  // STAGE 2: Load strand content (10-20%)
  // ============================================================================

  onProgress(10, 'Loading strand content...')

  const contentStore = getContentStore()
  await contentStore.initialize()

  const strandsContent: { id: string; path: string; title: string; content: string }[] = []

  for (let i = 0; i < strandPaths.length; i++) {
    const path = strandPaths[i]
    try {
      const strand = await contentStore.getStrand(path)
      if (strand) {
        strandsContent.push({
          id: strand.id || path,
          path,
          title: strand.title || 'Untitled',
          content: strand.content,
        })
      }
    } catch (error) {
      console.warn(`[QuizProcessor] Failed to load strand: ${path}`, error)
    }

    onProgress(
      10 + (i / strandPaths.length) * 10,
      `Loading strands (${i + 1}/${strandPaths.length})...`
    )
  }

  if (strandsContent.length === 0) {
    throw new Error('No strand content found to generate quiz from')
  }

  // ============================================================================
  // STAGE 3: Extract terms (20-50%)
  // ============================================================================

  onProgress(20, 'Extracting key terms...')

  // First pass: collect all terms for cross-pollination
  const allTerms: string[] = []

  for (let i = 0; i < strandsContent.length; i++) {
    const strand = strandsContent[i]
    const textContent = extractTextFromMarkdown(strand.content)

    if (textContent.length < 100) continue

    const { terms } = await extractKeyTerms(textContent)
    allTerms.push(...terms)

    onProgress(
      20 + (i / strandsContent.length) * 30,
      `Analyzing: ${strand.title} (${i + 1}/${strandsContent.length})...`
    )
  }

  // ============================================================================
  // STAGE 4: Generate questions (50-85%)
  // ============================================================================

  onProgress(50, 'Generating questions...')

  const allQuestions: QuizQuestion[] = []

  for (let i = 0; i < strandsContent.length; i++) {
    const strand = strandsContent[i]
    const baseProgress = 50 + (i / strandsContent.length) * 35

    onProgress(baseProgress, `Generating questions for: ${strand.title}`)

    const textContent = extractTextFromMarkdown(strand.content)
    if (textContent.length < 100) continue

    const { terms, definitions } = await extractKeyTerms(textContent)
    const sentences = getSentences(textContent)

    const source: QuizQuestionSource = {
      strandId: strand.id,
      strandPath: strand.path,
      strandTitle: strand.title,
    }

    // Generate each question type if enabled
    if (questionTypes.includes('multiple_choice') && definitions.length > 0) {
      allQuestions.push(...generateMultipleChoice(definitions, [...terms, ...allTerms], source))
    }

    if (questionTypes.includes('true_false') && sentences.length > 0) {
      allQuestions.push(...generateTrueFalse(sentences, terms, source))
    }

    if (questionTypes.includes('fill_blank') && terms.length > 0) {
      allQuestions.push(...generateFillBlank(sentences, terms, source))
    }
  }

  // Balance and limit questions
  const strandQuestionMap = new Map<string, QuizQuestion[]>()
  for (const q of allQuestions) {
    const strandId = q.source?.strandId || 'unknown'
    if (!strandQuestionMap.has(strandId)) {
      strandQuestionMap.set(strandId, [])
    }
    strandQuestionMap.get(strandId)!.push(q)
  }

  const questionsPerStrand = Math.max(2, Math.floor(questionCount / strandsContent.length))
  const balancedQuestions: QuizQuestion[] = []

  for (const [, questions] of strandQuestionMap) {
    const shuffled = shuffleArray(questions)
    balancedQuestions.push(...shuffled.slice(0, questionsPerStrand))
  }

  // Final shuffle and limit
  const finalQuestions = shuffleArray(balancedQuestions).slice(0, questionCount)

  // ============================================================================
  // STAGE 5: Save to cache (85-95%)
  // ============================================================================

  onProgress(85, 'Saving to cache...')

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
        source: q.source,
      } as CachedQuizQuestion)),
      generationMethod: 'multi-strand',
      createdAt: new Date().toISOString(),
      version: 1,
    }

    await quizCache.saveToCache(cacheKey, cacheData)
    console.log(`[QuizProcessor] Cached ${finalQuestions.length} questions from ${strandsContent.length} strands`)
  }

  // ============================================================================
  // COMPLETE
  // ============================================================================

  const durationMs = Date.now() - startTime
  onProgress(100, `Generated ${finalQuestions.length} questions in ${Math.round(durationMs / 1000)}s`)

  const result: QuizJobResult = {
    count: finalQuestions.length,
    questionIds: finalQuestions.map(q => q.id),
  }

  return result
}
