/**
 * Flashcard Generation Job Processor
 * @module lib/jobs/processors/flashcardGeneration
 *
 * Processor for the flashcard_generation job type.
 * Uses the BERT-powered flashcard worker for local generation.
 *
 * Pipeline:
 * 1. Load strand content (10%)
 * 2. Generate flashcards via worker (10-80%)
 * 3. Save flashcards to storage (80-95%)
 * 4. Complete (100%)
 */

import type { Job, JobResult, FlashcardJobPayload, FlashcardJobResult } from '../types'
import type { JobProcessor } from '../jobQueue'
import { getFlashcardWorkerService } from '@/lib/flashcards/flashcardWorkerService'
import { getContentStore } from '@/lib/content'

/**
 * Flashcard generation processor
 *
 * Generates flashcards locally using BERT embeddings via web worker.
 * Falls back to NLP-only mode if BERT model fails to load.
 */
export const flashcardGenerationProcessor: JobProcessor = async (
  job: Job,
  onProgress: (progress: number, message: string) => void
): Promise<JobResult> => {
  const startTime = Date.now()
  const payload = job.payload as FlashcardJobPayload
  const { strandPaths, useLLM = false, forceRegenerate = false } = payload

  const flashcardIds: string[] = []
  let totalCards = 0

  onProgress(5, 'Initializing flashcard generation...')

  // ============================================================================
  // STAGE 1: Load strand content (5-15%)
  // ============================================================================

  onProgress(10, 'Loading strand content...')

  const contentStore = getContentStore()
  await contentStore.initialize()

  const strandsContent: { path: string; title: string; content: string }[] = []

  for (let i = 0; i < strandPaths.length; i++) {
    const path = strandPaths[i]
    try {
      const strand = await contentStore.getStrand(path)
      if (strand) {
        strandsContent.push({
          path,
          title: strand.title || 'Untitled',
          content: strand.content,
        })
      }
    } catch (error) {
      console.warn(`[FlashcardProcessor] Failed to load strand: ${path}`, error)
    }

    onProgress(
      10 + (i / strandPaths.length) * 5,
      `Loading strands (${i + 1}/${strandPaths.length})...`
    )
  }

  if (strandsContent.length === 0) {
    throw new Error('No strand content found to generate flashcards from')
  }

  // ============================================================================
  // STAGE 2: Generate flashcards (15-80%)
  // ============================================================================

  onProgress(15, 'Generating flashcards...')

  const workerService = getFlashcardWorkerService()

  for (let i = 0; i < strandsContent.length; i++) {
    const { path, title, content } = strandsContent[i]
    const baseProgress = 15 + (i / strandsContent.length) * 65

    onProgress(baseProgress, `Generating flashcards for: ${title}`)

    try {
      const cards = await workerService.generate({
        content,
        title,
        algorithm: useLLM ? 'nlp' : 'bert', // If useLLM is true, use NLP (faster)
        maxCards: 10,
        difficulty: 'mixed',
        includeTags: true,
        strandPath: path,
        cacheKey: forceRegenerate ? undefined : `fc-${path}-${Date.now()}`,
        onProgress: (progress) => {
          const subProgress = baseProgress + (progress.progress / 100) * (65 / strandsContent.length)
          onProgress(subProgress, progress.message)
        },
      })

      // Store card IDs
      for (const card of cards) {
        flashcardIds.push(card.id)
      }
      totalCards += cards.length
    } catch (error) {
      console.warn(`[FlashcardProcessor] Failed to generate cards for: ${path}`, error)
    }
  }

  // ============================================================================
  // STAGE 3: Save flashcards (80-95%)
  // ============================================================================

  onProgress(80, 'Saving flashcards...')

  // TODO: Implement flashcard storage in IndexedDB
  // For now, cards are returned in the result and can be stored by the caller

  onProgress(95, 'Finalizing...')

  // ============================================================================
  // COMPLETE
  // ============================================================================

  const durationMs = Date.now() - startTime
  onProgress(100, `Generated ${totalCards} flashcards`)

  const result: FlashcardJobResult = {
    count: totalCards,
    flashcardIds,
    strandsProcessed: strandsContent.length,
  }

  return result
}
