/**
 * Strand Re-indexing
 *
 * Handles lazy async re-indexing of strand metadata after edits.
 * Supports both immediate lightweight updates and deferred heavy processing.
 *
 * Now integrates with the NLP pipeline for:
 * - Block-level tagging and worthiness scoring
 * - Semantic search embedding generation
 * - Tag bubbling from blocks to document level
 *
 * @module lib/jobs/reindexStrand
 */

import type { StrandMetadata, AutoTagConfig } from '@/components/quarry/types'
import type { ReindexStrandPayload, ReindexStrandResult } from './types'
import { jobQueue, registerJobProcessor } from './jobQueue'
import { hashContent } from '../search/embeddingStore'

// ============================================================================
// TYPES
// ============================================================================

export interface ReindexOptions {
  /** Whether to queue block-level re-indexing (async, slower) */
  reindexBlocks?: boolean
  /** Whether to update embeddings for semantic search (async) */
  updateEmbeddings?: boolean
  /** Whether to run tag bubbling after block re-indexing */
  runTagBubbling?: boolean
  /** Priority: 'immediate' runs sync, 'deferred' queues a job */
  priority?: 'immediate' | 'deferred'
}

// ============================================================================
// IMMEDIATE UPDATES (SYNC)
// ============================================================================

/**
 * Perform immediate metadata index updates (fast, sync)
 *
 * This updates the basic search indexes without heavy processing.
 * Called synchronously after metadata save.
 */
async function performImmediateUpdate(
  strandPath: string,
  metadata: StrandMetadata
): Promise<void> {
  // Import dynamically to avoid circular deps
  const { getDatabase } = await import('../codexDatabase')
  const db = await getDatabase()
  if (!db) {
    console.warn('[reindexStrand] Database not available for immediate update')
    return
  }

  const now = new Date().toISOString()

  // Update search-related columns
  const difficulty = typeof metadata.difficulty === 'object'
    ? (metadata.difficulty as { overall?: string }).overall
    : metadata.difficulty

  // Handle different taxonomy shapes
  const subjects = metadata.taxonomy?.subjects || []
  const topics = metadata.taxonomy?.topics || []

  // Handle tags as either string or string[]
  const tags = Array.isArray(metadata.tags)
    ? metadata.tags
    : (metadata.tags ? [metadata.tags] : [])

  try {
    await db.run(`
      UPDATE strands SET
        title = ?,
        difficulty = ?,
        status = ?,
        subjects = ?,
        topics = ?,
        tags = ?,
        last_indexed_at = ?
      WHERE path = ?
    `, [
      metadata.title || 'Untitled',
      difficulty !== undefined ? String(difficulty) : null,
      metadata.publishing?.status || 'published',
      JSON.stringify(subjects),
      JSON.stringify(topics),
      JSON.stringify(tags),
      now,
      strandPath,
    ])

    console.log('[reindexStrand] Immediate update complete:', strandPath)
  } catch (error) {
    console.error('[reindexStrand] Immediate update failed:', error)
  }
}

// ============================================================================
// DEFERRED UPDATES (ASYNC)
// ============================================================================

/**
 * Queue a deferred re-indexing job for heavy processing
 *
 * This is for operations that take longer:
 * - Block-level re-indexing
 * - Embedding updates
 * - Tag bubbling
 */
async function queueDeferredReindex(
  strandPath: string,
  options: ReindexOptions
): Promise<string | null> {
  const payload: ReindexStrandPayload = {
    strandPath,
    reindexBlocks: options.reindexBlocks ?? false,
    updateEmbeddings: options.updateEmbeddings ?? false,
    runTagBubbling: options.runTagBubbling ?? false,
  }

  const jobId = await jobQueue.enqueue('reindex-strand', payload)

  if (jobId) {
    console.log('[reindexStrand] Queued deferred job:', jobId)
  }

  return jobId
}

// ============================================================================
// JOB PROCESSOR
// ============================================================================

/**
 * Process a re-index job (called by job queue)
 *
 * This is where the actual NLP pipeline runs:
 * 1. Block processing with worthiness scoring and auto-tagging
 * 2. Semantic search embedding generation
 * 3. Tag bubbling from blocks to document level
 */
export async function processReindexJob(
  payload: ReindexStrandPayload,
  onProgress: (progress: number, message: string) => void
): Promise<ReindexStrandResult> {
  const startTime = Date.now()
  const {
    strandPath,
    reindexBlocks,
    updateEmbeddings,
    runTagBubbling,
    autoTagSettings,
  } = payload

  onProgress(5, 'Starting re-index...')

  let blocksReindexed = 0
  let blocksTagged = 0
  let tagsBubbled = 0
  let embeddingsUpdated = false

  try {
    // Step 1: Get strand data from database
    onProgress(10, 'Loading strand data...')
    const { getDatabase } = await import('../codexDatabase')
    const db = await getDatabase()

    if (!db) {
      console.warn('[reindexStrand] Database not available')
      return {
        strandPath,
        metadataUpdated: false,
        durationMs: Date.now() - startTime,
      }
    }

    // Get strand data including ID
    const row = await db.get(`
      SELECT id, frontmatter, content FROM strands WHERE path = ?
    `, [strandPath]) as { id: string; frontmatter: string; content: string } | undefined

    if (!row) {
      console.warn('[reindexStrand] Strand not found:', strandPath)
      return {
        strandPath,
        metadataUpdated: false,
        durationMs: Date.now() - startTime,
      }
    }

    // Parse metadata
    let metadata: StrandMetadata
    try {
      metadata = JSON.parse(row.frontmatter) as StrandMetadata
    } catch {
      console.warn('[reindexStrand] Failed to parse frontmatter, using defaults')
      metadata = { title: 'Untitled' }
    }

    // Step 2: Perform immediate metadata update
    onProgress(15, 'Updating metadata indexes...')
    await performImmediateUpdate(strandPath, metadata)

    // Step 3: Block-level processing with NLP pipeline
    if (reindexBlocks && row.content) {
      onProgress(20, 'Processing blocks with NLP pipeline...')

      try {
        // Dynamic import to avoid circular dependencies
        const { processStrandBlocks } = await import('../nlp/blockProcessor')
        const { DEFAULT_AUTO_TAG_CONFIG } = await import('../nlp/autoTagging')
        // TagContext type is imported for type-checking only
        type TagContext = import('../nlp/autoTagging').TagContext

        // Build tag context for the NLP pipeline
        const existingTags = Array.isArray(metadata.tags)
          ? metadata.tags
          : metadata.tags
            ? [metadata.tags]
            : []

        const context: TagContext = {
          existingTags,
          relatedTags: [],
          hierarchyTags: [],
          metadata,
          config: {
            ...DEFAULT_AUTO_TAG_CONFIG,
            useLLM: autoTagSettings?.useLLM ?? false,
            confidenceThreshold: autoTagSettings?.confidenceThreshold ?? 0.6,
          },
        }

        // Run block processing pipeline
        onProgress(30, 'Analyzing block worthiness...')
        const result = await processStrandBlocks(
          row.id,
          strandPath,
          row.content,
          context,
          {
            persistToDb: true,
            useLLM: autoTagSettings?.useLLM ?? false,
            confidenceThreshold: autoTagSettings?.confidenceThreshold ?? 0.6,
            enableTagBubbling: runTagBubbling ?? true,
            onProgress: (stage, progress) => {
              // Map inner progress to outer range (30-70%)
              const mappedProgress = 30 + Math.round((progress / 100) * 40)
              onProgress(mappedProgress, stage)
            },
          }
        )

        blocksReindexed = result.stats.totalBlocks
        blocksTagged = result.stats.taggedBlocks
        tagsBubbled = result.stats.bubbledTagCount

        console.log(
          `[reindexStrand] Block processing complete:`,
          `${blocksReindexed} blocks, ${blocksTagged} tagged, ${tagsBubbled} bubbled`
        )

        // Update document tags if bubbling produced new ones
        if (runTagBubbling && result.bubbledTags.length > 0) {
          onProgress(70, `Bubbling ${result.bubbledTags.length} tags to document...`)

          const { applyBubbledTags } = await import('../nlp/tagBubbling')
          const updatedTags = applyBubbledTags(existingTags, result.bubbledTags)

          // Update frontmatter with bubbled tags
          if (updatedTags.length > existingTags.length) {
            const updatedMetadata = { ...metadata, tags: updatedTags }
            await db.run(`
              UPDATE strands SET frontmatter = ? WHERE path = ?
            `, [JSON.stringify(updatedMetadata), strandPath])

            console.log(
              `[reindexStrand] Bubbled tags applied:`,
              result.bubbledTags.map((t) => t.tag).join(', ')
            )
          }
        }
      } catch (error) {
        console.error('[reindexStrand] Block processing failed:', error)
        // Continue with other steps even if block processing fails
      }
    }

    // Step 4: Update embeddings for semantic search
    if (updateEmbeddings && row.content) {
      onProgress(75, 'Generating semantic embeddings...')

      try {
        const { indexStrandForSearch } = await import('../search/semanticSearch')

        // Extract weave/loom from path (e.g., weaves/wiki/looms/intro/strands/welcome.md)
        const pathParts = strandPath.split('/')
        const weaveIdx = pathParts.indexOf('weaves')
        const loomIdx = pathParts.indexOf('looms')

        const embeddingMetadata = {
          title: metadata.title || 'Untitled',
          tags: Array.isArray(metadata.tags)
            ? metadata.tags
            : metadata.tags
              ? [metadata.tags]
              : [],
          weave: weaveIdx >= 0 && weaveIdx + 1 < pathParts.length
            ? pathParts[weaveIdx + 1]
            : undefined,
          loom: loomIdx >= 0 && loomIdx + 1 < pathParts.length
            ? pathParts[loomIdx + 1]
            : undefined,
        }

        embeddingsUpdated = await indexStrandForSearch(
          strandPath,
          row.content,
          embeddingMetadata
        )

        if (embeddingsUpdated) {
          console.log('[reindexStrand] Embedding updated for:', strandPath)
        }
      } catch (error) {
        console.warn('[reindexStrand] Embedding update failed:', error)
        // Non-fatal - semantic search will still work with existing embeddings
      }
    }

    // Step 5: Update indexed timestamp and content hash
    onProgress(90, 'Finalizing index...')
    const contentHash = hashContent(row.content)
    const now = new Date().toISOString()

    await db.run(`
      UPDATE strands SET
        last_indexed_at = ?,
        content_hash = ?
      WHERE path = ?
    `, [now, contentHash, strandPath])

    onProgress(100, 'Re-index complete')

    return {
      strandPath,
      metadataUpdated: true,
      blocksReindexed: reindexBlocks ? blocksReindexed : undefined,
      blocksTagged: reindexBlocks ? blocksTagged : undefined,
      tagsBubbled: runTagBubbling ? tagsBubbled : undefined,
      embeddingsUpdated: updateEmbeddings ? embeddingsUpdated : undefined,
      durationMs: Date.now() - startTime,
    }
  } catch (error) {
    console.error('[reindexStrand] Job failed:', error)
    throw error
  }
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Re-index a strand after metadata changes
 *
 * Performs immediate lightweight updates synchronously, then
 * optionally queues heavier processing as a background job.
 *
 * @param strandPath - Path to the strand file
 * @param metadata - Updated metadata
 * @param options - Re-indexing options
 * @returns Job ID if a deferred job was queued, null otherwise
 *
 * @example
 * ```ts
 * // After saving metadata
 * await reindexStrandMetadata(path, updatedMetadata, {
 *   reindexBlocks: true,  // Queue heavy processing
 *   priority: 'deferred'  // Run in background
 * })
 * ```
 */
export async function reindexStrandMetadata(
  strandPath: string,
  metadata: StrandMetadata,
  options: ReindexOptions = {}
): Promise<string | null> {
  // Always do immediate lightweight update
  await performImmediateUpdate(strandPath, metadata)

  // Check if we need to queue heavier processing
  const needsDeferred = (
    options.reindexBlocks ||
    options.updateEmbeddings ||
    options.runTagBubbling
  )

  if (needsDeferred && options.priority !== 'immediate') {
    // Queue a background job for heavy processing
    return queueDeferredReindex(strandPath, options)
  }

  // If priority is 'immediate', do everything sync (not recommended for large strands)
  if (needsDeferred && options.priority === 'immediate') {
    const payload: ReindexStrandPayload = {
      strandPath,
      reindexBlocks: options.reindexBlocks,
      updateEmbeddings: options.updateEmbeddings,
      runTagBubbling: options.runTagBubbling,
    }
    await processReindexJob(payload, () => {})
  }

  return null
}

/**
 * Register the re-index processor with the job queue
 *
 * Call this at app startup to enable re-index job processing.
 */
export function registerReindexProcessor(): void {
  registerJobProcessor('reindex-strand', async (job, onProgress) => {
    const payload = job.payload as ReindexStrandPayload
    return processReindexJob(payload, onProgress)
  })

  // Also register block-level re-indexing
  registerJobProcessor('reindex-blocks', async (job, onProgress) => {
    const payload = job.payload as ReindexStrandPayload
    return processReindexJob({
      ...payload,
      reindexBlocks: true,
    }, onProgress)
  })

  console.log('[reindexStrand] Processors registered')
}

// Alias for backwards compatibility with plural naming
export const registerReindexProcessors = registerReindexProcessor
