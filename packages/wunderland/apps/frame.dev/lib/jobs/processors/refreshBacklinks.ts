/**
 * Refresh Backlinks Job Processor
 * @module lib/jobs/processors/refreshBacklinks
 *
 * Handles cascade invalidation for dependency-aware caching.
 * When a strand is updated, this processor refreshes the backlink
 * context snippets in all notes that reference the updated strand.
 *
 * This ensures backlinks stay fresh without full re-indexing.
 */

import type { Job, JobResult, RefreshBacklinksPayload, RefreshBacklinksResult } from '../types'
import type { JobProcessor } from '../jobQueue'

// ============================================================================
// CONSTANTS
// ============================================================================

/** Maximum number of backlinks to refresh per job (rate limiting) */
const MAX_BACKLINKS_PER_JOB = 50

/** Maximum context snippet length in characters */
const MAX_CONTEXT_LENGTH = 200

/** Maximum cascade depth to prevent infinite loops */
const MAX_CASCADE_DEPTH = 2

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Extract a context snippet around a reference in the content
 */
function extractContextSnippet(content: string, targetPath: string): string {
  // Look for wikilinks like [[target]] or [[target|alias]]
  const targetName = targetPath.split('/').pop()?.replace('.md', '') || targetPath
  const patterns = [
    new RegExp(`\\[\\[${escapeRegex(targetName)}(\\|[^\\]]+)?\\]\\]`, 'i'),
    new RegExp(`\\[\\[${escapeRegex(targetPath)}(\\|[^\\]]+)?\\]\\]`, 'i'),
    new RegExp(`\\[${escapeRegex(targetName)}\\]\\([^)]+\\)`, 'i'),
  ]

  for (const pattern of patterns) {
    const match = content.match(pattern)
    if (match && match.index !== undefined) {
      // Extract surrounding context
      const start = Math.max(0, match.index - 80)
      const end = Math.min(content.length, match.index + match[0].length + 80)
      let snippet = content.slice(start, end)

      // Trim to sentence boundaries if possible
      if (start > 0) snippet = '...' + snippet
      if (end < content.length) snippet = snippet + '...'

      // Truncate if too long
      if (snippet.length > MAX_CONTEXT_LENGTH) {
        snippet = snippet.slice(0, MAX_CONTEXT_LENGTH - 3) + '...'
      }

      return snippet.trim()
    }
  }

  return ''
}

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// ============================================================================
// PROCESSOR
// ============================================================================

/**
 * Refresh backlinks processor
 *
 * Queries for all notes that reference the changed strand,
 * then updates their backlink context snippets.
 */
export const refreshBacklinksProcessor: JobProcessor = async (
  job: Job,
  onProgress: (progress: number, message: string) => void
): Promise<JobResult> => {
  const payload = job.payload as RefreshBacklinksPayload
  const { strandPath, triggerStrandPath, depth = 0 } = payload

  const startTime = Date.now()
  const affectedStrands: string[] = []
  let backlinksRefreshed = 0

  onProgress(0, 'Loading database...')

  // Dynamic import to avoid circular dependencies
  const { getDatabase } = await import('@/lib/codexDatabase')
  const db = await getDatabase()

  if (!db) {
    console.warn('[refreshBacklinks] Database not available')
    return {
      strandPath,
      backlinksRefreshed: 0,
      affectedStrands: [],
      durationMs: Date.now() - startTime,
    } as RefreshBacklinksResult
  }

  onProgress(10, 'Querying backlinks...')

  try {
    // Find all blocks in the updated strand
    const strandBlocks = await db.all(`
      SELECT id FROM strand_blocks WHERE strand_path = ?
    `, [strandPath]) as Array<{ id: string }>

    if (strandBlocks.length === 0) {
      onProgress(100, 'No blocks found in strand')
      return {
        strandPath,
        backlinksRefreshed: 0,
        affectedStrands: [],
        durationMs: Date.now() - startTime,
      } as RefreshBacklinksResult
    }

    const blockIds = strandBlocks.map(b => b.id)
    const placeholders = blockIds.map(() => '?').join(',')

    // Find all backlinks pointing to these blocks
    const backlinks = await db.all(`
      SELECT
        bl.id,
        bl.block_id,
        bl.referencing_strand_path,
        bl.referencing_block_id,
        bl.context_snippet
      FROM block_backlinks bl
      WHERE bl.block_id IN (${placeholders})
      AND bl.referencing_strand_path != ?
      LIMIT ?
    `, [...blockIds, triggerStrandPath, MAX_BACKLINKS_PER_JOB]) as Array<{
      id: string
      block_id: string
      referencing_strand_path: string
      referencing_block_id: string | null
      context_snippet: string | null
    }>

    if (backlinks.length === 0) {
      onProgress(100, 'No backlinks to refresh')
      return {
        strandPath,
        backlinksRefreshed: 0,
        affectedStrands: [],
        durationMs: Date.now() - startTime,
      } as RefreshBacklinksResult
    }

    onProgress(20, `Refreshing ${backlinks.length} backlinks...`)

    // Group by referencing strand for efficiency
    const strandGroups = new Map<string, typeof backlinks>()
    for (const bl of backlinks) {
      const group = strandGroups.get(bl.referencing_strand_path) || []
      group.push(bl)
      strandGroups.set(bl.referencing_strand_path, group)
    }

    const totalGroups = strandGroups.size
    let processedGroups = 0

    for (const [referencingPath, groupBacklinks] of strandGroups) {
      // Skip if this is the trigger strand (prevent loops)
      if (referencingPath === triggerStrandPath) continue

      try {
        // Get the referencing strand's content
        const strand = await db.get(`
          SELECT content FROM strands WHERE path = ?
        `, [referencingPath]) as { content: string } | undefined

        if (!strand) continue

        // Update context snippets for each backlink
        for (const bl of groupBacklinks) {
          const newContext = extractContextSnippet(strand.content, strandPath)

          // Only update if context changed
          if (newContext && newContext !== bl.context_snippet) {
            await db.run(`
              UPDATE block_backlinks
              SET context_snippet = ?
              WHERE id = ?
            `, [newContext, bl.id])

            backlinksRefreshed++
          }
        }

        if (!affectedStrands.includes(referencingPath)) {
          affectedStrands.push(referencingPath)
        }
      } catch (error) {
        console.warn(`[refreshBacklinks] Failed to update backlinks for ${referencingPath}:`, error)
      }

      processedGroups++
      const progress = 20 + Math.floor((processedGroups / totalGroups) * 70)
      onProgress(progress, `Updated ${processedGroups}/${totalGroups} strands`)
    }

    // If we're within cascade depth limit, we could queue cascade jobs
    // for the affected strands. But for now, we only update context snippets
    // and don't recursively cascade (depth > 0 is reserved for future use).

    onProgress(100, `Refreshed ${backlinksRefreshed} backlinks across ${affectedStrands.length} strands`)

    return {
      strandPath,
      backlinksRefreshed,
      affectedStrands,
      durationMs: Date.now() - startTime,
    } as RefreshBacklinksResult

  } catch (error) {
    console.error('[refreshBacklinks] Job failed:', error)
    throw error
  }
}

// ============================================================================
// CASCADE UTILITY
// ============================================================================

/**
 * Queue cascade backlink refresh jobs for all notes referencing a strand
 *
 * Call this after saving strand metadata to ensure related notes
 * have their backlink context snippets refreshed.
 *
 * @param strandPath - The path of the strand that was updated
 * @param options - Configuration options
 */
export async function queueCascadeBacklinkRefresh(
  strandPath: string,
  options: {
    /** Skip cascade (e.g., during bulk imports) */
    skipCascade?: boolean
  } = {}
): Promise<string | null> {
  if (options.skipCascade) {
    console.log('[cascadeBacklinks] Skipping cascade for:', strandPath)
    return null
  }

  // Dynamic import to avoid circular dependencies
  const { jobQueue } = await import('../jobQueue')
  const { getDatabase } = await import('@/lib/codexDatabase')

  const db = await getDatabase()
  if (!db) {
    console.warn('[cascadeBacklinks] Database not available')
    return null
  }

  // Check if there are any backlinks pointing to this strand
  const hasBacklinks = await db.get(`
    SELECT 1 FROM block_backlinks bl
    JOIN strand_blocks sb ON bl.block_id = sb.id
    WHERE sb.strand_path = ?
    LIMIT 1
  `, [strandPath])

  if (!hasBacklinks) {
    console.log('[cascadeBacklinks] No backlinks found for:', strandPath)
    return null
  }

  // Queue the refresh job
  const payload: RefreshBacklinksPayload = {
    strandPath,
    triggerStrandPath: strandPath,
    depth: 0,
  }

  const jobId = await jobQueue.enqueue('refresh-backlinks', payload)
  console.log('[cascadeBacklinks] Queued refresh job:', jobId, 'for:', strandPath)

  return jobId
}

// ============================================================================
// REGISTRATION
// ============================================================================

/**
 * Register the refresh backlinks processor with the job queue
 */
export function registerRefreshBacklinksProcessor(): void {
  // Dynamic import to avoid circular dependencies
  import('../jobQueue').then(({ registerJobProcessor }) => {
    registerJobProcessor('refresh-backlinks', refreshBacklinksProcessor)
    console.log('[refreshBacklinks] Processor registered')
  })
}
