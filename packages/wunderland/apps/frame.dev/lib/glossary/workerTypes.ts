/**
 * Glossary Worker Types
 * @module lib/glossary/workerTypes
 *
 * Shared types for glossary web worker communication.
 */

import type { GenerationMethod, GlossaryTerm } from './glossaryCache'

// ============================================================================
// TASK TYPES
// ============================================================================

/**
 * Task sent to the glossary worker
 */
export interface GlossaryTask {
  /** Unique task ID */
  id: string
  /** Content to process */
  content: string
  /** Generation method to use */
  method: GenerationMethod
  /** Maximum terms to generate */
  maxTerms: number
  /** Skip expensive NER for large docs */
  fastMode?: boolean
  /** Enable semantic deduplication */
  semanticDedup?: boolean
}

/**
 * Progress update from worker
 */
export interface GlossaryProgress {
  taskId: string
  /** Progress percentage (0-100) */
  progress: number
  /** Current processing stage */
  stage: GlossaryStage
  /** Human-readable message */
  message: string
  /** Terms found so far */
  termsFound: number
}

/**
 * Processing stages
 */
export type GlossaryStage =
  | 'initializing'
  | 'extracting_tech'
  | 'extracting_acronyms'
  | 'extracting_entities'
  | 'extracting_keywords'
  | 'deduplicating'
  | 'complete'

/**
 * Result from worker
 */
export interface GlossaryWorkerResult {
  taskId: string
  terms: GlossaryTerm[]
  method: GenerationMethod
  generationTimeMs: number
}

// ============================================================================
// MESSAGE TYPES
// ============================================================================

/**
 * Messages sent TO the worker
 */
export type GlossaryWorkerMessage =
  | { type: 'generate'; task: GlossaryTask }
  | { type: 'cancel'; taskId: string }

/**
 * Messages sent FROM the worker
 */
export type GlossaryWorkerResponse =
  | { type: 'progress'; data: GlossaryProgress }
  | { type: 'complete'; data: GlossaryWorkerResult }
  | { type: 'error'; taskId: string; error: string }

// ============================================================================
// JOB PAYLOAD (for job queue integration)
// ============================================================================

/**
 * Extended payload for glossary generation jobs
 */
export interface GlossaryGenerationPayload {
  /** Path to the strand being processed */
  strandPath: string
  /** Content to generate glossary from */
  content: string
  /** Generation method */
  method: GenerationMethod
  /** Maximum terms */
  maxTerms: number
  /** Force regeneration (bypass cache) */
  forceRegenerate?: boolean
  /** Skip expensive operations */
  fastMode?: boolean
}

/**
 * Result from glossary generation job
 */
export interface GlossaryGenerationResult {
  /** Generated terms */
  terms: GlossaryTerm[]
  /** Method used */
  method: GenerationMethod
  /** Whether result was from cache */
  cached: boolean
  /** Generation time in milliseconds */
  generationTimeMs: number
  /** Number of terms generated */
  count: number
}
