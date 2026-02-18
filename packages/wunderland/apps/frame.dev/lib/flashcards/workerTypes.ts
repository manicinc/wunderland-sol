/**
 * Flashcard Worker Types
 * @module lib/flashcards/workerTypes
 *
 * Type definitions for the flashcard generation web worker.
 * Defines message protocols for main thread ↔ worker communication.
 */

// ============================================================================
// ALGORITHM TYPES
// ============================================================================

/**
 * Flashcard generation algorithm
 * - 'bert': BERT embeddings for semantic concept detection (default)
 * - 'nlp': Compromise.js NLP for keyword extraction (faster, no ML)
 * - 'hybrid': NLP first, BERT enhancement (balanced)
 */
export type FlashcardAlgorithm = 'bert' | 'nlp' | 'hybrid'

/**
 * Card difficulty level
 */
export type FlashcardDifficulty = 'easy' | 'medium' | 'hard'

/**
 * Stages of flashcard generation
 */
export type FlashcardStage =
  | 'initializing'
  | 'loading_model'
  | 'chunking'
  | 'computing_embeddings'
  | 'extracting_concepts'
  | 'generating_cards'
  | 'deduplicating'
  | 'complete'

// ============================================================================
// FLASHCARD TYPES
// ============================================================================

/**
 * A generated flashcard
 */
export interface GeneratedFlashcard {
  id: string
  front: string
  back: string
  difficulty: FlashcardDifficulty
  tags?: string[]
  /** Source text this card was generated from */
  sourceText?: string
  /** Confidence score 0-1 */
  confidence: number
  /** How the card was generated */
  method: 'definition' | 'cloze' | 'concept' | 'question'
}

/**
 * A semantic concept extracted from content
 */
export interface ExtractedConcept {
  term: string
  definition: string
  context: string
  embedding?: Float32Array
  importance: number
}

// ============================================================================
// TASK TYPES
// ============================================================================

/**
 * Flashcard generation task
 */
export interface FlashcardTask {
  /** Unique task identifier */
  id: string
  /** Content to generate flashcards from */
  content: string
  /** Optional title for context */
  title?: string
  /** Algorithm to use */
  algorithm?: FlashcardAlgorithm
  /** Maximum number of cards to generate */
  maxCards?: number
  /** Target difficulty distribution */
  difficulty?: FlashcardDifficulty | 'mixed'
  /** Focus on specific topics */
  topics?: string[]
  /** Include tags on generated cards */
  includeTags?: boolean
  /** Cache key for result caching */
  cacheKey?: string
  /** Strand path for context */
  strandPath?: string
  /** Minimum confidence threshold (0-1) */
  minConfidence?: number
}

/**
 * Result from flashcard generation
 */
export interface FlashcardResult {
  /** Task ID this result belongs to */
  taskId: string
  /** Generated flashcards */
  cards: GeneratedFlashcard[]
  /** Extracted concepts (for debugging/display) */
  concepts?: ExtractedConcept[]
  /** Algorithm that was used */
  algorithm: FlashcardAlgorithm
  /** Time taken in milliseconds */
  durationMs: number
  /** Whether the result was from cache */
  cached: boolean
  /** Model load time if applicable */
  modelLoadTimeMs?: number
  /** Number of cards filtered out by deduplication */
  duplicatesRemoved?: number
}

/**
 * Progress update during flashcard generation
 */
export interface FlashcardProgress {
  taskId: string
  /** Progress percentage 0-100 */
  progress: number
  /** Current stage */
  stage: FlashcardStage
  /** Human-readable message */
  message: string
  /** Current item being processed */
  currentItem?: number
  /** Total items to process */
  totalItems?: number
}

// ============================================================================
// WORKER MESSAGES
// ============================================================================

/**
 * Messages sent TO the worker
 */
export type FlashcardWorkerMessage =
  | { type: 'generate'; task: FlashcardTask }
  | { type: 'cancel'; taskId: string }
  | { type: 'preload_model' }
  | { type: 'clear_cache' }

/**
 * Messages sent FROM the worker
 */
export type FlashcardWorkerResponse =
  | { type: 'progress'; data: FlashcardProgress }
  | { type: 'complete'; data: FlashcardResult }
  | { type: 'error'; taskId: string; error: string }
  | { type: 'model_ready'; modelName: string; loadTimeMs: number }
  | { type: 'cache_cleared' }

// ============================================================================
// HELPER TYPES
// ============================================================================

/**
 * Definition pattern for NLP extraction
 */
export interface DefinitionPattern {
  term: string
  definition: string
  confidence: number
  patternType: 'is_a' | 'refers_to' | 'defined_as' | 'means' | 'colon'
}

/**
 * Cloze deletion candidate
 */
export interface ClozeDeletion {
  sentence: string
  term: string
  clozeText: string
  importance: number
}
