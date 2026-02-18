/**
 * Block Tagging Job Processor
 * @module lib/jobs/processors/blockTagging
 *
 * Processes block tagging jobs using the NLP block processing pipeline.
 * Handles both single-strand and bulk tagging operations.
 *
 * Workflow:
 * 1. Load strands from specified paths
 * 2. Build tag context from taxonomy
 * 3. Process blocks using NLP pipeline (with optional LLM enhancement)
 * 4. Calculate worthiness and generate tag suggestions
 * 5. Optionally bubble tags up to document level
 * 6. Persist results and return statistics
 */

import type { Job, JobResult } from '../types'
import type { BlockTaggingJobPayload, BlockTaggingJobResult } from '../types'
import type { JobProcessor } from '../jobQueue'
import type { TagContext } from '@/lib/nlp/autoTagging'
import {
  processStrandBlocksBatch,
  aggregateProcessingStats,
  type BlockProcessingOptions,
} from '@/lib/nlp/blockProcessor'
import { getLocalCodexDb } from '@/lib/storage/localCodex'

/**
 * Block tagging processor
 *
 * Processes strands to extract blocks, calculate worthiness,
 * and generate tag suggestions using NLP (and optionally LLM).
 */
export const blockTaggingProcessor: JobProcessor = async (
  job: Job,
  onProgress: (progress: number, message: string) => void
): Promise<JobResult> => {
  const payload = job.payload as BlockTaggingJobPayload
  const {
    strandPaths,
    useLLM = false,
    recalculateWorthiness = false,
    confidenceThreshold = 0.6,
    enableBubbling = true,
    blockTypes,
    minWorthinessScore = 0.5,
  } = payload

  onProgress(0, 'Initializing block tagging...')

  const db = await getLocalCodexDb()

  // Track results
  const errors: string[] = []
  const warnings: string[] = []

  onProgress(5, 'Loading strands...')

  // Load strands from database
  const strands: Array<{
    id: string
    path: string
    content: string
    metadata: {
      title?: string
      tags?: string[]
      subjects?: string[]
      topics?: string[]
      [key: string]: unknown
    }
  }> = []

  for (const path of strandPaths) {
    try {
      const strand = await db.get(
        'SELECT id, path, content, metadata, title FROM strands WHERE path = ?',
        [path]
      ) as { id: string; path: string; content: string; metadata: string; title: string } | null

      if (strand) {
        const metadata = strand.metadata ? JSON.parse(strand.metadata) : {}
        strands.push({
          id: strand.id,
          path: strand.path,
          content: strand.content,
          metadata: {
            title: strand.title,
            ...metadata,
          },
        })
      } else {
        warnings.push(`Strand not found: ${path}`)
      }
    } catch (error) {
      errors.push(`Failed to load strand ${path}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  if (strands.length === 0) {
    throw new Error('No valid strands found to process')
  }

  onProgress(10, `Loaded ${strands.length} strands, building context...`)

  // Build global tag context from taxonomy
  const globalContext = await buildTagContext(db)

  onProgress(15, `Processing ${strands.length} strands...`)

  // Configure processing options
  const options: BlockProcessingOptions = {
    persistToDb: true,
    useLLM,
    confidenceThreshold,
    worthinessThreshold: minWorthinessScore,
    enableTagBubbling: enableBubbling,
    bubblingThreshold: 3,
  }

  // Process strands in batch
  const results = await processStrandBlocksBatch(
    strands,
    globalContext,
    options,
    (current, total, strandPath) => {
      // Map 15-90% progress to batch processing
      const progress = 15 + Math.round((current / total) * 75)
      onProgress(progress, `Processing ${current}/${total}: ${strandPath.split('/').pop()}`)
    }
  )

  onProgress(90, 'Aggregating results...')

  // Aggregate statistics
  const stats = aggregateProcessingStats(results)

  // Calculate detailed breakdowns
  const blockTypeBreakdown: Record<string, number> = {}
  const tagSourceBreakdown = { nlp: 0, llm: 0, existing: 0 }
  let totalWorthiness = 0
  let worthinessCount = 0

  for (const result of results.values()) {
    for (const block of result.blocks) {
      // Block type breakdown
      const type = block.blockType
      blockTypeBreakdown[type] = (blockTypeBreakdown[type] || 0) + 1

      // Worthiness tracking
      if (block.worthinessScore > 0) {
        totalWorthiness += block.worthinessScore
        worthinessCount++
      }

      // Tag source breakdown
      for (const suggestedTag of block.suggestedTags) {
        if (suggestedTag.source === 'llm') {
          tagSourceBreakdown.llm++
        } else if (suggestedTag.source === 'existing') {
          tagSourceBreakdown.existing++
        } else {
          tagSourceBreakdown.nlp++
        }
      }

      // Count accepted tags as NLP (they came from high-confidence NLP suggestions)
      tagSourceBreakdown.nlp += block.tags.length
    }
  }

  // Handle bubbled tags - update strand metadata if needed
  if (enableBubbling) {
    onProgress(92, 'Processing tag bubbling...')

    for (const [path, result] of results) {
      if (result.bubbledTags.length > 0) {
        try {
          // Get current strand metadata
          const strand = await db.get(
            'SELECT metadata FROM strands WHERE path = ?',
            [path]
          ) as { metadata: string } | null

          if (strand) {
            const metadata = strand.metadata ? JSON.parse(strand.metadata) : {}
            const existingTags = Array.isArray(metadata.tags) ? metadata.tags : []

            // Add bubbled tags that don't already exist
            const newTags = result.bubbledTags
              .filter(bt => !existingTags.includes(bt.tag))
              .map(bt => bt.tag)

            if (newTags.length > 0) {
              const updatedTags = [...existingTags, ...newTags]
              metadata.tags = updatedTags

              await db.run(
                'UPDATE strands SET metadata = ?, updated_at = ? WHERE path = ?',
                [JSON.stringify(metadata), new Date().toISOString(), path]
              )
            }
          }
        } catch (error) {
          warnings.push(`Failed to bubble tags for ${path}: ${error instanceof Error ? error.message : String(error)}`)
        }
      }
    }
  }

  onProgress(100, 'Block tagging complete')

  // Build result
  const jobResult: BlockTaggingJobResult = {
    strandsProcessed: stats.totalStrands,
    blocksProcessed: stats.totalBlocks,
    blocksTagged: stats.taggedBlocks,
    suggestedTags: stats.suggestedTags,
    bubbledTags: stats.bubbledTags,
    worthyBlocks: stats.worthyBlocks,
    avgWorthinessScore: worthinessCount > 0 ? totalWorthiness / worthinessCount : 0,
    blockTypeBreakdown,
    tagSourceBreakdown,
    errors: errors.length > 0 ? errors : undefined,
    warnings: warnings.length > 0 ? warnings : undefined,
  }

  return jobResult
}

/**
 * Build tag context from the taxonomy tables
 */
async function buildTagContext(db: any): Promise<Omit<TagContext, 'metadata'>> {
  // Load existing taxonomy for context
  const tags: string[] = []

  try {
    // Load tags from the tags table
    const tagRows = await db.all(
      'SELECT name FROM tags ORDER BY name'
    ) as Array<{ name: string }>
    for (const row of tagRows || []) {
      tags.push(row.name)
    }

    // Also include subjects and topics as potential tags for context
    const subjectRows = await db.all(
      'SELECT name FROM subjects ORDER BY name'
    ) as Array<{ name: string }>
    for (const row of subjectRows || []) {
      if (!tags.includes(row.name)) {
        tags.push(row.name)
      }
    }

    const topicRows = await db.all(
      'SELECT name FROM topics ORDER BY name'
    ) as Array<{ name: string }>
    for (const row of topicRows || []) {
      if (!tags.includes(row.name)) {
        tags.push(row.name)
      }
    }
  } catch (error) {
    console.warn('[blockTagging] Failed to load taxonomy, using empty context:', error)
  }

  return {
    existingTags: tags,
    relatedTags: [], // Will be populated per-strand if needed
    hierarchyTags: [], // Will be populated per-strand if needed
    config: {
      blockAutoTag: true,
      useLLM: false, // Will be overridden by options
      confidenceThreshold: 0.6,
    },
  }
}

/**
 * Bulk block tagging processor
 *
 * Same as blockTaggingProcessor but optimized for large batches.
 * Processes strands in chunks to avoid memory issues.
 */
export const bulkBlockTaggingProcessor: JobProcessor = async (
  job: Job,
  onProgress: (progress: number, message: string) => void
): Promise<JobResult> => {
  const payload = job.payload as BlockTaggingJobPayload
  const { strandPaths } = payload

  // For very large batches, process in chunks
  const CHUNK_SIZE = 50
  const chunks: string[][] = []

  for (let i = 0; i < strandPaths.length; i += CHUNK_SIZE) {
    chunks.push(strandPaths.slice(i, i + CHUNK_SIZE))
  }

  onProgress(0, `Processing ${strandPaths.length} strands in ${chunks.length} chunks...`)

  // Aggregate results across chunks
  const aggregatedResult: BlockTaggingJobResult = {
    strandsProcessed: 0,
    blocksProcessed: 0,
    blocksTagged: 0,
    suggestedTags: 0,
    bubbledTags: 0,
    worthyBlocks: 0,
    avgWorthinessScore: 0,
    blockTypeBreakdown: {},
    tagSourceBreakdown: { nlp: 0, llm: 0, existing: 0 },
    errors: [],
    warnings: [],
  }

  let totalWorthiness = 0
  let worthinessCount = 0

  for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
    const chunk = chunks[chunkIndex]
    const chunkStart = (chunkIndex / chunks.length) * 100
    const chunkEnd = ((chunkIndex + 1) / chunks.length) * 100

    // Create a modified job for this chunk
    const chunkJob: Job = {
      ...job,
      payload: {
        ...payload,
        strandPaths: chunk,
      },
    }

    try {
      const chunkResult = await blockTaggingProcessor(
        chunkJob,
        (progress, message) => {
          // Map chunk progress to overall progress
          const overallProgress = chunkStart + (progress / 100) * (chunkEnd - chunkStart)
          onProgress(
            Math.round(overallProgress),
            `Chunk ${chunkIndex + 1}/${chunks.length}: ${message}`
          )
        }
      ) as BlockTaggingJobResult

      // Aggregate results
      aggregatedResult.strandsProcessed += chunkResult.strandsProcessed
      aggregatedResult.blocksProcessed += chunkResult.blocksProcessed
      aggregatedResult.blocksTagged += chunkResult.blocksTagged
      aggregatedResult.suggestedTags += chunkResult.suggestedTags
      aggregatedResult.bubbledTags += chunkResult.bubbledTags
      aggregatedResult.worthyBlocks += chunkResult.worthyBlocks

      // Aggregate worthiness for averaging
      if (chunkResult.avgWorthinessScore > 0) {
        totalWorthiness += chunkResult.avgWorthinessScore * chunkResult.worthyBlocks
        worthinessCount += chunkResult.worthyBlocks
      }

      // Merge block type breakdown
      for (const [type, count] of Object.entries(chunkResult.blockTypeBreakdown)) {
        aggregatedResult.blockTypeBreakdown[type] =
          (aggregatedResult.blockTypeBreakdown[type] || 0) + count
      }

      // Merge tag source breakdown
      aggregatedResult.tagSourceBreakdown.nlp += chunkResult.tagSourceBreakdown.nlp
      aggregatedResult.tagSourceBreakdown.llm += chunkResult.tagSourceBreakdown.llm
      aggregatedResult.tagSourceBreakdown.existing += chunkResult.tagSourceBreakdown.existing

      // Collect errors and warnings
      if (chunkResult.errors) {
        aggregatedResult.errors!.push(...chunkResult.errors)
      }
      if (chunkResult.warnings) {
        aggregatedResult.warnings!.push(...chunkResult.warnings)
      }
    } catch (error) {
      aggregatedResult.errors!.push(
        `Chunk ${chunkIndex + 1} failed: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  // Calculate final average worthiness
  aggregatedResult.avgWorthinessScore = worthinessCount > 0 ? totalWorthiness / worthinessCount : 0

  // Clean up empty arrays
  if (aggregatedResult.errors!.length === 0) {
    aggregatedResult.errors = undefined
  }
  if (aggregatedResult.warnings!.length === 0) {
    aggregatedResult.warnings = undefined
  }

  onProgress(100, 'Bulk block tagging complete')

  return aggregatedResult
}
