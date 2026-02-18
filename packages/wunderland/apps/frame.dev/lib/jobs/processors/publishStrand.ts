/**
 * Publish Strand Job Processor
 * @module lib/jobs/processors/publishStrand
 *
 * Writes strand content to the vault folder and updates the database.
 * This is the "Publish" action that makes drafts persistent.
 *
 * Pipeline:
 * 1. Write content to vault via File System API (40%)
 * 2. Update database indexes (80%)
 * 3. Complete (100%)
 *
 * Note: Full NLP pipeline (tagging, worthiness, bubbling) can be triggered
 * separately via the block-tagging or reindex-strand job types after publish.
 */

import type { Job, JobResult, PublishStrandPayload, PublishStrandResult } from '../types'
import type { JobProcessor } from '../jobQueue'
import { getStoredVaultHandle } from '@/lib/vault/vaultConfig'
import { writeVaultFile } from '@/lib/vault/vaultManager'
import { saveStrand } from '@/lib/storage/localCodex'

/**
 * Publish strand processor
 *
 * Workflow:
 * 1. Get vault handle from storage
 * 2. Write content to vault folder
 * 3. Update database indexes
 * 4. Return result with statistics
 */
export const publishStrandProcessor: JobProcessor = async (
  job: Job,
  onProgress: (progress: number, message: string) => void
): Promise<JobResult> => {
  const startTime = Date.now()
  const payload = job.payload as PublishStrandPayload
  const {
    strandPath,
    content,
    metadata,
    dryRun = false,
  } = payload

  const warnings: string[] = []
  let vaultWritten = false

  onProgress(5, 'Initializing publish workflow...')

  // ============================================================================
  // STAGE 1: Write to vault (10-40%)
  // ============================================================================

  if (!dryRun) {
    onProgress(10, 'Writing to vault folder...')

    const vaultHandle = await getStoredVaultHandle()

    if (vaultHandle) {
      try {
        // Reconstruct full markdown with frontmatter
        const fullContent = reconstructMarkdown(content, metadata)
        await writeVaultFile(vaultHandle, strandPath, fullContent)
        vaultWritten = true
        onProgress(40, 'Vault write complete')
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        warnings.push(`Vault write failed: ${errorMessage}`)
        onProgress(40, 'Vault write failed, continuing with database...')
      }
    } else {
      warnings.push('No vault folder configured, skipping vault write')
      onProgress(40, 'No vault configured, saving to database only...')
    }
  } else {
    onProgress(40, 'Dry run mode, skipping vault write...')
  }

  // ============================================================================
  // STAGE 2: Update database indexes (40-90%)
  // ============================================================================

  onProgress(50, 'Updating database indexes...')

  try {
    // Save/update strand in database
    await saveStrand({
      path: strandPath,
      title: (metadata.title as string) || extractTitle(content),
      content,
      frontmatter: JSON.stringify(metadata),
    })

    onProgress(90, 'Database updated')
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    warnings.push(`Database update failed: ${errorMessage}`)
  }

  // ============================================================================
  // COMPLETE
  // ============================================================================

  const durationMs = Date.now() - startTime
  onProgress(100, 'Publish complete')

  const result: PublishStrandResult = {
    strandPath,
    vaultWritten,
    blocksProcessed: 0,
    tagsGenerated: 0,
    bubbledTags: [],
    embeddingsUpdated: false,
    durationMs,
    warnings: warnings.length > 0 ? warnings : undefined,
  }

  return result
}

/**
 * Reconstruct full markdown file with frontmatter
 */
function reconstructMarkdown(content: string, metadata: Record<string, unknown>): string {
  // Build frontmatter
  const frontmatterLines = ['---']

  for (const [key, value] of Object.entries(metadata)) {
    if (value === undefined || value === null) continue

    if (Array.isArray(value)) {
      frontmatterLines.push(`${key}:`)
      for (const item of value) {
        frontmatterLines.push(`  - ${JSON.stringify(item)}`)
      }
    } else if (typeof value === 'object') {
      frontmatterLines.push(`${key}: ${JSON.stringify(value)}`)
    } else if (typeof value === 'string' && value.includes('\n')) {
      frontmatterLines.push(`${key}: |`)
      for (const line of value.split('\n')) {
        frontmatterLines.push(`  ${line}`)
      }
    } else {
      frontmatterLines.push(`${key}: ${JSON.stringify(value)}`)
    }
  }

  frontmatterLines.push('---')
  frontmatterLines.push('')

  return frontmatterLines.join('\n') + content
}

/**
 * Extract title from content (first heading or first line)
 */
function extractTitle(content: string): string {
  const lines = content.split('\n')

  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.startsWith('# ')) {
      return trimmed.slice(2).trim()
    }
    if (trimmed.length > 0) {
      return trimmed.slice(0, 60) + (trimmed.length > 60 ? '...' : '')
    }
  }

  return 'Untitled'
}

