/**
 * Flashcard Generation Web Worker
 * @module public/workers/flashcard.worker
 *
 * Background worker for BERT-powered flashcard generation.
 * Extracts key concepts using embeddings and generates flashcards
 * off the main thread to prevent UI freezing.
 *
 * Features:
 * - BERT embeddings via Transformers.js (lazy loaded)
 * - NLP-based extraction using Compromise.js as fallback
 * - Semantic deduplication to avoid similar cards
 * - Multiple card types: definition, cloze, concept
 * - In-memory result caching
 * - Cancellation support
 */

import type {
  FlashcardWorkerMessage,
  FlashcardWorkerResponse,
  FlashcardTask,
  FlashcardProgress,
  FlashcardResult,
  FlashcardAlgorithm,
  FlashcardStage,
  GeneratedFlashcard,
  ExtractedConcept,
  DefinitionPattern,
  ClozeDeletion,
} from '@/lib/flashcards/workerTypes'

// ============================================================================
// WORKER STATE
// ============================================================================

let currentTaskId: string | null = null
let cancelled = false

// Simple in-memory cache for flashcards
const flashcardCache = new Map<string, { cards: GeneratedFlashcard[]; timestamp: number }>()
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000 // 7 days

// BERT model state (lazy loaded)
let bertModel: any = null
let modelLoading = false
let modelLoadError: string | null = null

// Compromise.js (lazy loaded)
let nlp: any = null

// ============================================================================
// MESSAGE HANDLER
// ============================================================================

self.addEventListener('message', async (event: MessageEvent<FlashcardWorkerMessage>) => {
  const message = event.data

  switch (message.type) {
    case 'generate':
      await handleGenerateTask(message.task)
      break

    case 'cancel':
      handleCancellation(message.taskId)
      break

    case 'preload_model':
      await preloadBertModel()
      break

    case 'clear_cache':
      flashcardCache.clear()
      postMessage({ type: 'cache_cleared' } as FlashcardWorkerResponse)
      break

    default:
      console.warn('[FlashcardWorker] Unknown message type:', message)
  }
})

// ============================================================================
// MODEL LOADING
// ============================================================================

async function preloadBertModel(): Promise<void> {
  if (bertModel || modelLoading) return

  modelLoading = true
  const startTime = Date.now()

  try {
    const { pipeline, env } = await import('@huggingface/transformers')

    env.allowLocalModels = false
    env.useBrowserCache = true

    // Load feature extraction pipeline (MiniLM-L6-v2 for 384-dim embeddings)
    bertModel = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2')

    const loadTimeMs = Date.now() - startTime
    console.log(`[FlashcardWorker] BERT model loaded in ${loadTimeMs}ms`)

    postMessage({
      type: 'model_ready',
      modelName: 'all-MiniLM-L6-v2',
      loadTimeMs,
    } as FlashcardWorkerResponse)
  } catch (error) {
    modelLoadError = error instanceof Error ? error.message : 'Unknown error'
    console.warn('[FlashcardWorker] Failed to load BERT model:', modelLoadError)
  } finally {
    modelLoading = false
  }
}

async function loadNlp(): Promise<void> {
  if (nlp) return

  try {
    const compromise = await import('compromise')
    nlp = compromise.default || compromise
  } catch (error) {
    console.warn('[FlashcardWorker] Failed to load Compromise.js:', error)
  }
}

async function getBertEmbedding(text: string): Promise<Float32Array | null> {
  if (!bertModel) {
    await preloadBertModel()
  }

  if (!bertModel) return null

  try {
    const output = await bertModel(text, { pooling: 'mean', normalize: true })
    return new Float32Array(output.data)
  } catch (error) {
    console.warn('[FlashcardWorker] Embedding failed:', error)
    return null
  }
}

// ============================================================================
// TASK HANDLER
// ============================================================================

async function handleGenerateTask(task: FlashcardTask): Promise<void> {
  currentTaskId = task.id
  cancelled = false
  const startTime = Date.now()
  let modelLoadTime = 0

  try {
    // Check cache first
    if (task.cacheKey) {
      const cached = flashcardCache.get(task.cacheKey)
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        postComplete({
          taskId: task.id,
          cards: cached.cards,
          algorithm: task.algorithm || 'bert',
          durationMs: Date.now() - startTime,
          cached: true,
        })
        return
      }
    }

    const algorithm = task.algorithm || 'bert'
    const maxCards = task.maxCards || 10

    // ─────────────────────────────────────────────────────────────────────────
    // Stage 1: Initialize
    // ─────────────────────────────────────────────────────────────────────────
    if (cancelled) return postCancelled(task.id)
    postProgress({
      taskId: task.id,
      progress: 5,
      stage: 'initializing',
      message: 'Initializing flashcard generation...',
    })

    // Load NLP library
    await loadNlp()

    // Load BERT if needed
    if (algorithm !== 'nlp' && !bertModel) {
      postProgress({
        taskId: task.id,
        progress: 10,
        stage: 'loading_model',
        message: 'Loading BERT model (first time only)...',
      })

      const modelStart = Date.now()
      await preloadBertModel()
      modelLoadTime = Date.now() - modelStart
    }

    await yieldToWorker()

    // ─────────────────────────────────────────────────────────────────────────
    // Stage 2: Chunk content semantically
    // ─────────────────────────────────────────────────────────────────────────
    if (cancelled) return postCancelled(task.id)
    postProgress({
      taskId: task.id,
      progress: 20,
      stage: 'chunking',
      message: 'Chunking content...',
    })

    const chunks = semanticChunk(task.content)
    await yieldToWorker()

    // ─────────────────────────────────────────────────────────────────────────
    // Stage 3: Extract concepts
    // ─────────────────────────────────────────────────────────────────────────
    if (cancelled) return postCancelled(task.id)
    postProgress({
      taskId: task.id,
      progress: 30,
      stage: 'extracting_concepts',
      message: 'Extracting key concepts...',
    })

    let concepts: ExtractedConcept[]
    let usedBert = false

    if (algorithm === 'bert' && bertModel) {
      concepts = await extractConceptsWithBert(chunks, task.id, task.topics)
      usedBert = true
    } else {
      concepts = extractConceptsWithNlp(task.content, task.topics)
    }

    await yieldToWorker()

    // ─────────────────────────────────────────────────────────────────────────
    // Stage 4: Generate flashcards
    // ─────────────────────────────────────────────────────────────────────────
    if (cancelled) return postCancelled(task.id)
    postProgress({
      taskId: task.id,
      progress: 60,
      stage: 'generating_cards',
      message: 'Generating flashcards...',
    })

    const cards = await generateCards(
      concepts,
      task.content,
      {
        maxCards,
        difficulty: task.difficulty || 'mixed',
        includeTags: task.includeTags ?? true,
        minConfidence: task.minConfidence ?? 0.3,
      },
      task.id
    )

    await yieldToWorker()

    // ─────────────────────────────────────────────────────────────────────────
    // Stage 5: Deduplicate
    // ─────────────────────────────────────────────────────────────────────────
    if (cancelled) return postCancelled(task.id)
    postProgress({
      taskId: task.id,
      progress: 85,
      stage: 'deduplicating',
      message: 'Removing duplicate cards...',
    })

    const { deduplicated, removed } = usedBert
      ? await deduplicateWithEmbeddings(cards)
      : deduplicateSimple(cards)

    // ─────────────────────────────────────────────────────────────────────────
    // Stage 6: Complete
    // ─────────────────────────────────────────────────────────────────────────
    const durationMs = Date.now() - startTime

    // Cache the result
    if (task.cacheKey) {
      flashcardCache.set(task.cacheKey, {
        cards: deduplicated,
        timestamp: Date.now(),
      })

      if (flashcardCache.size > 500) {
        pruneCache()
      }
    }

    postComplete({
      taskId: task.id,
      cards: deduplicated,
      concepts,
      algorithm: usedBert ? 'bert' : 'nlp',
      durationMs,
      cached: false,
      modelLoadTimeMs: modelLoadTime > 0 ? modelLoadTime : undefined,
      duplicatesRemoved: removed,
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    postError(task.id, `Flashcard generation failed: ${errorMessage}`)
  } finally {
    currentTaskId = null
  }
}

function handleCancellation(taskId: string): void {
  if (currentTaskId === taskId) {
    cancelled = true
  }
}

// ============================================================================
// CONTENT PROCESSING
// ============================================================================

/**
 * Split content into semantic chunks (paragraphs, sections)
 */
function semanticChunk(content: string): string[] {
  // Split on double newlines (paragraph boundaries)
  const paragraphs = content
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 20)

  // If we have too few paragraphs, split by sentences
  if (paragraphs.length < 3) {
    return tokenizeSentences(content).filter((s) => s.length > 30)
  }

  return paragraphs
}

/**
 * Tokenize text into sentences
 */
function tokenizeSentences(text: string): string[] {
  if (!text?.trim()) return []

  // Common abbreviations to protect
  const abbreviations = ['Mr', 'Mrs', 'Ms', 'Dr', 'Prof', 'etc', 'i\\.e', 'e\\.g']
  let processed = text
  abbreviations.forEach((abbr, i) => {
    processed = processed.replace(new RegExp(`\\b${abbr}\\.`, 'g'), `<<ABBR${i}>>`)
  })

  // Split on sentence boundaries
  const sentences = processed
    .split(/(?<=[.!?])\s+(?=[A-Z])/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)

  // Restore abbreviations
  return sentences.map((sentence) => {
    let restored = sentence
    abbreviations.forEach((abbr, i) => {
      restored = restored.replace(new RegExp(`<<ABBR${i}>>`, 'g'), `${abbr.replace('\\', '')}.`)
    })
    return restored.trim()
  })
}

// ============================================================================
// CONCEPT EXTRACTION
// ============================================================================

/**
 * Extract concepts using BERT embeddings
 */
async function extractConceptsWithBert(
  chunks: string[],
  taskId: string,
  focusTopics?: string[]
): Promise<ExtractedConcept[]> {
  const concepts: ExtractedConcept[] = []

  // First, extract NLP-based concepts as candidates
  const nlpConcepts = extractConceptsWithNlp(chunks.join('\n\n'), focusTopics)

  // Compute embeddings for each concept term
  for (let i = 0; i < nlpConcepts.length; i++) {
    if (cancelled) break

    if (i % 3 === 0) {
      postProgress({
        taskId,
        progress: 30 + (i / nlpConcepts.length) * 25,
        stage: 'computing_embeddings',
        message: `Computing embeddings (${i + 1}/${nlpConcepts.length})...`,
        currentItem: i + 1,
        totalItems: nlpConcepts.length,
      })
      await yieldToWorker()
    }

    const concept = nlpConcepts[i]
    const embedding = await getBertEmbedding(concept.term + ': ' + concept.definition)

    concepts.push({
      ...concept,
      embedding: embedding || undefined,
    })
  }

  // Sort by importance (embedding-enhanced scoring)
  return concepts.sort((a, b) => b.importance - a.importance)
}

/**
 * Extract concepts using NLP patterns (no ML required)
 */
function extractConceptsWithNlp(content: string, focusTopics?: string[]): ExtractedConcept[] {
  const concepts: ExtractedConcept[] = []
  const seenTerms = new Set<string>()

  // 1. Extract definition patterns
  const definitions = extractDefinitions(content)
  for (const def of definitions) {
    const termLower = def.term.toLowerCase()
    if (!seenTerms.has(termLower)) {
      seenTerms.add(termLower)
      concepts.push({
        term: def.term,
        definition: def.definition,
        context: def.definition,
        importance: def.confidence,
      })
    }
  }

  // 2. Extract key terms using NLP if available
  if (nlp) {
    const doc = nlp(content)

    // Extract nouns and noun phrases
    const nouns = doc.nouns().out('array') as string[]
    const terms = doc.terms().out('array') as string[]

    // Find terms that appear frequently or are capitalized
    const termFreq = new Map<string, number>()
    for (const term of [...nouns, ...terms]) {
      const normalized = term.toLowerCase().trim()
      if (normalized.length > 2 && !seenTerms.has(normalized)) {
        termFreq.set(normalized, (termFreq.get(normalized) || 0) + 1)
      }
    }

    // Add high-frequency terms
    const sortedTerms = Array.from(termFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)

    for (const [term, freq] of sortedTerms) {
      if (!seenTerms.has(term)) {
        seenTerms.add(term)
        const context = findContextForTerm(content, term)
        if (context) {
          concepts.push({
            term: capitalizeFirst(term),
            definition: context,
            context,
            importance: Math.min(0.5 + freq * 0.1, 0.9),
          })
        }
      }
    }
  }

  // 3. Filter by focus topics if provided
  if (focusTopics && focusTopics.length > 0) {
    const topicsLower = focusTopics.map((t) => t.toLowerCase())
    return concepts.filter((c) =>
      topicsLower.some(
        (topic) =>
          c.term.toLowerCase().includes(topic) ||
          c.definition.toLowerCase().includes(topic)
      )
    )
  }

  return concepts
}

/**
 * Extract definition patterns from text
 */
function extractDefinitions(text: string): DefinitionPattern[] {
  const definitions: DefinitionPattern[] = []
  const sentences = tokenizeSentences(text)

  for (const sentence of sentences) {
    // Pattern 1: "X is a Y" / "X is the Y"
    const isAMatch = sentence.match(/^([A-Z][^.]*?)\s+(?:is|are)\s+(?:a|an|the)\s+(.+?)(?:\.|,|;|$)/i)
    if (isAMatch) {
      definitions.push({
        term: isAMatch[1].trim(),
        definition: isAMatch[2].trim(),
        confidence: 0.8,
        patternType: 'is_a',
      })
    }

    // Pattern 2: "X refers to Y"
    const refersMatch = sentence.match(/^([A-Z][^.]*?)\s+refers?\s+to\s+(.+?)(?:\.|,|;|$)/i)
    if (refersMatch) {
      definitions.push({
        term: refersMatch[1].trim(),
        definition: refersMatch[2].trim(),
        confidence: 0.85,
        patternType: 'refers_to',
      })
    }

    // Pattern 3: "X is defined as Y"
    const definedMatch = sentence.match(/^([A-Z][^.]*?)\s+(?:is|are)\s+defined\s+as\s+(.+?)(?:\.|,|;|$)/i)
    if (definedMatch) {
      definitions.push({
        term: definedMatch[1].trim(),
        definition: definedMatch[2].trim(),
        confidence: 0.9,
        patternType: 'defined_as',
      })
    }

    // Pattern 4: "X means Y"
    const meansMatch = sentence.match(/^([A-Z][^.]*?)\s+means?\s+(.+?)(?:\.|,|;|$)/i)
    if (meansMatch) {
      definitions.push({
        term: meansMatch[1].trim(),
        definition: meansMatch[2].trim(),
        confidence: 0.85,
        patternType: 'means',
      })
    }

    // Pattern 5: "Term: definition" or "Term – definition"
    const colonMatch = sentence.match(/^([A-Z][A-Za-z\s]{2,30})[:–—]\s*(.+?)(?:\.|$)/i)
    if (colonMatch && colonMatch[2].length > 10) {
      definitions.push({
        term: colonMatch[1].trim(),
        definition: colonMatch[2].trim(),
        confidence: 0.7,
        patternType: 'colon',
      })
    }
  }

  return definitions
}

/**
 * Find context sentence for a term
 */
function findContextForTerm(content: string, term: string): string | null {
  const sentences = tokenizeSentences(content)
  const termLower = term.toLowerCase()

  for (const sentence of sentences) {
    if (sentence.toLowerCase().includes(termLower)) {
      // Prefer sentences that look like definitions
      if (sentence.match(/\b(is|are|refers?|means?|defined)\b/i)) {
        return sentence
      }
    }
  }

  // Fallback to first mention
  for (const sentence of sentences) {
    if (sentence.toLowerCase().includes(termLower)) {
      return sentence
    }
  }

  return null
}

// ============================================================================
// CARD GENERATION
// ============================================================================

interface GenerateOptions {
  maxCards: number
  difficulty: 'easy' | 'medium' | 'hard' | 'mixed'
  includeTags: boolean
  minConfidence: number
}

async function generateCards(
  concepts: ExtractedConcept[],
  fullContent: string,
  options: GenerateOptions,
  taskId: string
): Promise<GeneratedFlashcard[]> {
  const cards: GeneratedFlashcard[] = []
  const filteredConcepts = concepts.filter((c) => c.importance >= options.minConfidence)

  for (let i = 0; i < filteredConcepts.length && cards.length < options.maxCards; i++) {
    if (cancelled) break

    if (i % 2 === 0) {
      postProgress({
        taskId,
        progress: 60 + (i / filteredConcepts.length) * 20,
        stage: 'generating_cards',
        message: `Generating cards (${i + 1}/${filteredConcepts.length})...`,
        currentItem: i + 1,
        totalItems: filteredConcepts.length,
      })
      await yieldToWorker()
    }

    const concept = filteredConcepts[i]

    // Generate definition card
    const defCard = generateDefinitionCard(concept, options, cards.length)
    if (defCard) cards.push(defCard)

    // Generate cloze card if we have room
    if (cards.length < options.maxCards) {
      const clozeCard = generateClozeCard(concept, options, cards.length)
      if (clozeCard) cards.push(clozeCard)
    }
  }

  return cards
}

function generateDefinitionCard(
  concept: ExtractedConcept,
  options: GenerateOptions,
  index: number
): GeneratedFlashcard | null {
  if (!concept.term || !concept.definition) return null

  // Create question from term
  const questionTypes = [
    `What is ${concept.term}?`,
    `Define: ${concept.term}`,
    `Explain the concept of ${concept.term}`,
  ]
  const front = questionTypes[index % questionTypes.length]

  // Ensure definition is a complete thought
  let back = concept.definition
  if (!back.endsWith('.') && !back.endsWith('!') && !back.endsWith('?')) {
    back += '.'
  }

  const difficulty = options.difficulty === 'mixed'
    ? determineDifficulty(concept)
    : options.difficulty

  return {
    id: `fc-${Date.now()}-${index}`,
    front,
    back: capitalizeFirst(back),
    difficulty,
    confidence: concept.importance,
    method: 'definition',
    sourceText: concept.context,
    tags: options.includeTags ? extractTags(concept) : undefined,
  }
}

function generateClozeCard(
  concept: ExtractedConcept,
  options: GenerateOptions,
  index: number
): GeneratedFlashcard | null {
  if (!concept.context || concept.context.length < 20) return null

  // Create cloze deletion by blanking out the term
  const termRegex = new RegExp(`\\b${escapeRegex(concept.term)}\\b`, 'gi')
  if (!termRegex.test(concept.context)) return null

  const clozeText = concept.context.replace(termRegex, '_____')

  // Skip if the cloze is too similar to the original
  if (clozeText === concept.context) return null

  const difficulty = options.difficulty === 'mixed'
    ? determineDifficulty(concept)
    : options.difficulty

  return {
    id: `fc-cloze-${Date.now()}-${index}`,
    front: `Fill in the blank:\n\n${clozeText}`,
    back: concept.term,
    difficulty,
    confidence: concept.importance * 0.9,
    method: 'cloze',
    sourceText: concept.context,
    tags: options.includeTags ? ['cloze', ...extractTags(concept)] : undefined,
  }
}

function determineDifficulty(concept: ExtractedConcept): 'easy' | 'medium' | 'hard' {
  // More complex definitions = harder
  const wordCount = concept.definition.split(/\s+/).length

  if (wordCount < 10) return 'easy'
  if (wordCount < 25) return 'medium'
  return 'hard'
}

function extractTags(concept: ExtractedConcept): string[] {
  const tags: string[] = []

  // Extract potential tags from term and definition
  if (nlp) {
    const doc = nlp(concept.term + ' ' + concept.definition)
    const topics = doc.topics().out('array') as string[]
    tags.push(...topics.slice(0, 3))
  }

  return tags
}

// ============================================================================
// DEDUPLICATION
// ============================================================================

async function deduplicateWithEmbeddings(
  cards: GeneratedFlashcard[]
): Promise<{ deduplicated: GeneratedFlashcard[]; removed: number }> {
  if (cards.length <= 1) {
    return { deduplicated: cards, removed: 0 }
  }

  const embeddings: Float32Array[] = []
  const deduplicated: GeneratedFlashcard[] = []
  const similarityThreshold = 0.85

  for (const card of cards) {
    const embedding = await getBertEmbedding(card.front + ' ' + card.back)
    if (!embedding) {
      deduplicated.push(card)
      continue
    }

    // Check similarity with existing cards
    let isDuplicate = false
    for (let i = 0; i < embeddings.length; i++) {
      const similarity = cosineSimilarity(embedding, embeddings[i])
      if (similarity > similarityThreshold) {
        isDuplicate = true
        break
      }
    }

    if (!isDuplicate) {
      deduplicated.push(card)
      embeddings.push(embedding)
    }
  }

  return {
    deduplicated,
    removed: cards.length - deduplicated.length,
  }
}

function deduplicateSimple(
  cards: GeneratedFlashcard[]
): { deduplicated: GeneratedFlashcard[]; removed: number } {
  const seen = new Set<string>()
  const deduplicated: GeneratedFlashcard[] = []

  for (const card of cards) {
    const key = card.front.toLowerCase().replace(/\s+/g, ' ').trim()
    if (!seen.has(key)) {
      seen.add(key)
      deduplicated.push(card)
    }
  }

  return {
    deduplicated,
    removed: cards.length - deduplicated.length,
  }
}

function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length) return 0

  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB)
  return denominator === 0 ? 0 : dotProduct / denominator
}

// ============================================================================
// HELPERS
// ============================================================================

function yieldToWorker(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

function pruneCache(): void {
  const now = Date.now()
  const entries = Array.from(flashcardCache.entries())
    .filter(([_, v]) => now - v.timestamp < CACHE_TTL)
    .sort((a, b) => b[1].timestamp - a[1].timestamp)
    .slice(0, 250)

  flashcardCache.clear()
  entries.forEach(([k, v]) => flashcardCache.set(k, v))
}

function capitalizeFirst(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// ============================================================================
// MESSAGE SENDERS
// ============================================================================

function postProgress(data: FlashcardProgress): void {
  const message: FlashcardWorkerResponse = { type: 'progress', data }
  self.postMessage(message)
}

function postComplete(data: FlashcardResult): void {
  const message: FlashcardWorkerResponse = { type: 'complete', data }
  self.postMessage(message)
}

function postError(taskId: string, error: string): void {
  const message: FlashcardWorkerResponse = { type: 'error', taskId, error }
  self.postMessage(message)
}

function postCancelled(taskId: string): void {
  postError(taskId, 'Task cancelled by user')
}

// ============================================================================
// WORKER INITIALIZATION
// ============================================================================

console.log('[FlashcardWorker] Initialized and ready')
