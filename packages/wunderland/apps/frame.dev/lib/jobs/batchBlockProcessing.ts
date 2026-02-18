/**
 * Batch Block Processing
 * @module lib/jobs/batchBlockProcessing
 *
 * Provides utilities for queueing strand block processing jobs in bulk.
 * Used by:
 * - Database initialization (auto-queue stale strands)
 * - Content sync (queue synced strands)
 * - GitHub Actions (process changed files)
 * - Manual triggers (force reindex all)
 */

import { jobQueue } from './jobQueue'
import type { ReindexStrandPayload } from './types'

/**
 * Options for batch queueing
 */
export interface BatchQueueOptions {
  /** Force reprocess even if not stale */
  force?: boolean
  /** Specific paths to process (skip staleness check) */
  paths?: string[]
  /** Max strands to queue (default: 100) */
  limit?: number
  /** Whether to use LLM for tagging (default: false - NLP only) */
  useLLM?: boolean
}

/**
 * Result from batch queueing
 */
export interface BatchQueueResult {
  /** Number of jobs successfully queued */
  queued: number
  /** Number skipped (duplicates) */
  skipped: number
  /** Job IDs that were created */
  jobIds: string[]
}

/**
 * Queue stale strands for block processing
 *
 * Finds strands where `last_indexed_at` is null or older than `updated_at`
 * and enqueues them for background NLP processing.
 *
 * @param options - Batch options
 * @returns Result with counts and job IDs
 */
export async function queueStaleStrandsForProcessing(
  options?: BatchQueueOptions
): Promise<BatchQueueResult> {
  // Dynamic import to avoid circular dependencies
  const { getDatabase } = await import('../codexDatabase')
  const db = await getDatabase()

  if (!db) {
    console.warn('[batchBlockProcessing] Database not available')
    return { queued: 0, skipped: 0, jobIds: [] }
  }

  const limit = options?.limit ?? 100
  let strands: { path: string }[]

  if (options?.paths?.length) {
    // Process specific paths
    strands = options.paths.map(p => ({ path: p }))
    console.log(`[batchBlockProcessing] Processing ${strands.length} specific paths`)
  } else if (options?.force) {
    // Force process all strands
    strands = await db.all(`
      SELECT path FROM strands
      ORDER BY updated_at DESC
      LIMIT ?
    `, [limit]) as { path: string }[]
    console.log(`[batchBlockProcessing] Force processing ${strands.length} strands`)
  } else {
    // Find stale strands (not indexed or index outdated)
    strands = await db.all(`
      SELECT path FROM strands
      WHERE last_indexed_at IS NULL
         OR last_indexed_at < updated_at
      ORDER BY updated_at DESC
      LIMIT ?
    `, [limit]) as { path: string }[]
    console.log(`[batchBlockProcessing] Found ${strands.length} stale strands`)
  }

  if (strands.length === 0) {
    return { queued: 0, skipped: 0, jobIds: [] }
  }

  let queued = 0
  let skipped = 0
  const jobIds: string[] = []

  for (const strand of strands) {
    const payload: ReindexStrandPayload = {
      strandPath: strand.path,
      reindexBlocks: true,
      updateEmbeddings: true,
      runTagBubbling: true,
      autoTagSettings: {
        useLLM: options?.useLLM ?? false,
        confidenceThreshold: 0.6,
      },
    }

    const jobId = await jobQueue.enqueue('reindex-strand', payload)

    if (jobId) {
      queued++
      jobIds.push(jobId)
    } else {
      skipped++ // Duplicate job already pending
    }
  }

  console.log(
    `[batchBlockProcessing] Queued ${queued} jobs, skipped ${skipped} duplicates`
  )

  return { queued, skipped, jobIds }
}

/**
 * Queue a single strand for processing
 *
 * Convenience wrapper for queueing one strand. Used by sync handlers.
 *
 * @param strandPath - Path to the strand
 * @param options - Optional settings
 * @returns Job ID or null if duplicate
 */
export async function queueStrandProcessing(
  strandPath: string,
  options?: { useLLM?: boolean }
): Promise<string | null> {
  const payload: ReindexStrandPayload = {
    strandPath,
    reindexBlocks: true,
    updateEmbeddings: true,
    runTagBubbling: true,
    autoTagSettings: {
      useLLM: options?.useLLM ?? false,
      confidenceThreshold: 0.6,
    },
  }

  return jobQueue.enqueue('reindex-strand', payload)
}

/**
 * Get count of strands needing processing
 *
 * Useful for UI to show how many strands are stale.
 */
export async function getStaleStrandCount(): Promise<number> {
  const { getDatabase } = await import('../codexDatabase')
  const db = await getDatabase()

  if (!db) return 0

  const result = await db.get(`
    SELECT COUNT(*) as count FROM strands
    WHERE last_indexed_at IS NULL
       OR last_indexed_at < updated_at
  `) as { count: number } | undefined

  return result?.count ?? 0
}

/**
 * Mark a strand as indexed (update last_indexed_at)
 *
 * Called after successful processing.
 */
export async function markStrandIndexed(strandPath: string): Promise<void> {
  const { getDatabase } = await import('../codexDatabase')
  const db = await getDatabase()

  if (!db) return

  const now = new Date().toISOString()
  await db.run(`
    UPDATE strands SET last_indexed_at = ? WHERE path = ?
  `, [now, strandPath])
}
