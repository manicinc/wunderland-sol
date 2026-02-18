/**
 * Move Processor
 * @module lib/nlp/moveProcessor
 *
 * Handles NLP re-analysis after file structure changes (moves).
 * When files are moved, their path context changes which may affect:
 * - Path-based references in content
 * - Hierarchical tag relationships
 * - Embedding proximity calculations
 */

import { getDatabase } from '@/lib/codexDatabase'
import { getContentStore } from '@/lib/content/sqliteStore'
import type { MoveOperation } from '@/components/quarry/tree/types'

// ============================================================================
// TYPES
// ============================================================================

export interface MoveProcessorOptions {
  /** Move operations that were performed */
  operations: MoveOperation[]
  /** Whether to update embeddings (expensive) */
  updateEmbeddings?: boolean
  /** Progress callback */
  onProgress?: (stage: string, processed: number, total: number) => void
}

export interface MoveProcessorResult {
  /** Whether all processing completed successfully */
  success: boolean
  /** Number of strands re-analyzed */
  strandsProcessed: number
  /** Number of blocks updated */
  blocksUpdated: number
  /** Any errors that occurred */
  errors: string[]
  /** Duration in milliseconds */
  duration: number
}

// ============================================================================
// IMPLEMENTATION
// ============================================================================

/**
 * Process move operations and trigger NLP re-analysis
 *
 * This is called after files are moved to update path references
 * and optionally re-calculate embeddings.
 */
export async function processMoveOperations(
  options: MoveProcessorOptions
): Promise<MoveProcessorResult> {
  const startTime = Date.now()
  const { operations, updateEmbeddings = false, onProgress } = options

  const result: MoveProcessorResult = {
    success: true,
    strandsProcessed: 0,
    blocksUpdated: 0,
    errors: [],
    duration: 0,
  }

  if (operations.length === 0) {
    result.duration = Date.now() - startTime
    return result
  }

  const db = await getDatabase()
  if (!db) {
    result.success = false
    result.errors.push('Database not available')
    result.duration = Date.now() - startTime
    return result
  }

  try {
    // Stage 1: Collect affected strand IDs
    onProgress?.('Collecting affected strands', 0, operations.length)

    const affectedStrandIds = new Set<string>()
    const pathMappings = new Map<string, string>() // old path -> new path

    for (const op of operations) {
      pathMappings.set(op.sourcePath, op.destPath)

      if (op.nodeType === 'file') {
        // Direct strand move
        const rows = await db.all(
          `SELECT id FROM strands WHERE path = ?`,
          [op.destPath] // Use new path since SQLite already updated
        ) as Array<{ id: string }>

        if (rows && rows.length > 0) {
          affectedStrandIds.add(rows[0].id)
        }
      } else {
        // Directory move - get all strands under new path
        const rows = await db.all(
          `SELECT id FROM strands WHERE path LIKE ?`,
          [op.destPath + '%']
        ) as Array<{ id: string }>

        for (const row of rows) {
          affectedStrandIds.add(row.id)
        }
      }
    }

    const strandIds = Array.from(affectedStrandIds)
    if (strandIds.length === 0) {
      result.duration = Date.now() - startTime
      return result
    }

    // Stage 2: Update path references in content
    onProgress?.('Updating path references', 0, strandIds.length)

    for (let i = 0; i < strandIds.length; i++) {
      const strandId = strandIds[i]

      try {
        // Get strand content
        const rows = await db.all(
          `SELECT id, path, content FROM strands WHERE id = ?`,
          [strandId]
        ) as Array<{ id: string; path: string; content: string }>

        if (rows && rows.length > 0) {
          const strand = rows[0]
          let updatedContent = strand.content
          let contentChanged = false

          // Replace old path references with new paths
          for (const [oldPath, newPath] of pathMappings) {
            if (updatedContent.includes(oldPath)) {
              updatedContent = updatedContent.replaceAll(oldPath, newPath)
              contentChanged = true
            }
          }

          // Update content if changed
          if (contentChanged) {
            await db.run(
              `UPDATE strands SET content = ?, updated_at = ? WHERE id = ?`,
              [updatedContent, new Date().toISOString(), strandId]
            )
          }

          result.strandsProcessed++
        }

        onProgress?.('Updating path references', i + 1, strandIds.length)
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error'
        result.errors.push(`Strand ${strandId}: ${errorMsg}`)
      }
    }

    // Stage 3: Update block paths
    onProgress?.('Updating block records', 0, strandIds.length)

    for (const [oldPath, newPath] of pathMappings) {
      try {
        // Update strand_blocks table
        const updateResult = await db.run(
          `UPDATE strand_blocks SET strand_path = ? WHERE strand_path = ?`,
          [newPath, oldPath]
        )

        if (updateResult && typeof (updateResult as { changes?: number }).changes === 'number') {
          result.blocksUpdated += (updateResult as { changes: number }).changes
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error'
        result.errors.push(`Blocks for ${oldPath}: ${errorMsg}`)
      }
    }

    // Stage 4: Update embeddings if requested (expensive operation)
    if (updateEmbeddings && strandIds.length > 0) {
      onProgress?.('Updating embeddings', 0, strandIds.length)

      try {
        // Mark strands for re-embedding
        // The actual embedding update would be done by a background job
        const placeholders = strandIds.map(() => '?').join(', ')
        await db.run(
          `UPDATE strands SET last_indexed_at = NULL WHERE id IN (${placeholders})`,
          strandIds
        )

        console.log(`[MoveProcessor] Marked ${strandIds.length} strands for re-embedding`)
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error'
        result.errors.push(`Embeddings: ${errorMsg}`)
      }
    }

    result.success = result.errors.length === 0
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    result.success = false
    result.errors.push(`Processing failed: ${errorMsg}`)
  }

  result.duration = Date.now() - startTime
  console.log(`[MoveProcessor] Completed in ${result.duration}ms:`, result)

  return result
}

/**
 * Queue move operations for background processing
 *
 * For large moves, this queues the NLP work to be done
 * asynchronously rather than blocking the UI.
 */
export async function queueMoveProcessing(
  operations: MoveOperation[]
): Promise<{ queued: boolean; jobId?: string }> {
  if (operations.length === 0) {
    return { queued: false }
  }

  // Store in pending_jobs table for background processing
  const db = await getDatabase()
  if (!db) {
    return { queued: false }
  }

  const jobId = `move-${Date.now()}-${Math.random().toString(36).slice(2)}`

  try {
    await db.run(
      `INSERT INTO pending_jobs (id, type, payload, status, created_at)
       VALUES (?, 'move_processing', ?, 'pending', ?)`,
      [jobId, JSON.stringify(operations), new Date().toISOString()]
    )

    console.log(`[MoveProcessor] Queued job ${jobId} with ${operations.length} operations`)
    return { queued: true, jobId }
  } catch (error) {
    // Table might not exist - fallback to immediate processing
    console.warn('[MoveProcessor] Failed to queue job, processing immediately:', error)
    await processMoveOperations({ operations })
    return { queued: false }
  }
}

/**
 * Check if path references in content need updating
 *
 * Utility to detect if strand content contains references
 * to paths that were moved.
 */
export function detectPathReferences(
  content: string,
  operations: MoveOperation[]
): Array<{ oldPath: string; newPath: string; count: number }> {
  const references: Array<{ oldPath: string; newPath: string; count: number }> = []

  for (const op of operations) {
    const regex = new RegExp(escapeRegExp(op.sourcePath), 'g')
    const matches = content.match(regex)

    if (matches && matches.length > 0) {
      references.push({
        oldPath: op.sourcePath,
        newPath: op.destPath,
        count: matches.length,
      })
    }
  }

  return references
}

/**
 * Escape special regex characters in a string
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
