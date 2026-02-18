/**
 * Flashcards Module
 * @module lib/flashcards
 *
 * Exports flashcard generation utilities and types.
 * Supports both LLM-based and local BERT-powered generation.
 */

// Types
export * from './workerTypes'

// LLM-based generation
export {
  generateFlashcardsFromContent,
  generateFlashcardsFromGaps,
  generateFlashcardFromHighlight,
  isFlashcardGenerationAvailable,
  type Flashcard,
  type GenerateFlashcardsOptions,
} from './flashcardGenerator'

// Worker-based local generation
export {
  getFlashcardWorkerService,
  generateFlashcardsWithWorker,
  preloadFlashcardModel,
  FlashcardWorkerService,
  type GenerateWithWorkerOptions,
  type WorkerStatus,
} from './flashcardWorkerService'
