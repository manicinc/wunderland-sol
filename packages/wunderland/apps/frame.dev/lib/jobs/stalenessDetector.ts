/**
 * Staleness Detector
 *
 * Smart content change detection for ML jobs.
 * Determines if a strand needs reprocessing based on content hash
 * and timestamp comparisons.
 *
 * @module lib/jobs/stalenessDetector
 */

import { getStrandByPath } from '../storage/localCodex'
import { hashContent, needsRegeneration } from '../search/embeddingStore'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Reason why a strand needs (or doesn't need) reprocessing
 */
export type StalenessReason =
  | 'content_changed' // Content hash changed
  | 'never_indexed' // No last_indexed_at timestamp
  | 'not_found' // Strand not in database
  | 'embedding_stale' // Embedding hash mismatch
  | 'forced' // Force flag was set
  | 'up_to_date' // All checks passed, no reprocessing needed

/**
 * Result of staleness check
 */
export interface StalenessCheckResult {
  /** Whether the strand needs ML reprocessing */
  needsReprocessing: boolean
  /** Why reprocessing is needed (or not) */
  reason: StalenessReason
  /** Whether content hash changed */
  contentHashChanged: boolean
  /** When strand was last indexed (null if never) */
  lastIndexedAt: string | null
  /** Current content hash */
  currentContentHash: string
  /** Stored content hash (null if not found) */
  storedContentHash: string | null
  /** Additional details for debugging */
  details?: string
}

// ============================================================================
// CORE FUNCTIONS
// ============================================================================

/**
 * Check if a strand needs ML reprocessing
 *
 * Performs multiple checks in order:
 * 1. Force flag check
 * 2. Strand existence check
 * 3. Never-indexed check
 * 4. Content hash comparison
 * 5. Embedding staleness check
 *
 * @param strandPath - Path to the strand
 * @param content - Current content of the strand
 * @param options - Optional settings
 * @returns StalenessCheckResult with decision and reasoning
 */
export async function checkStrandStaleness(
  strandPath: string,
  content: string,
  options?: {
    /** Force reprocessing regardless of staleness */
    force?: boolean
    /** Skip embedding check (faster, less thorough) */
    skipEmbeddingCheck?: boolean
  }
): Promise<StalenessCheckResult> {
  const currentContentHash = hashContent(content)

  // 1. Force flag check
  if (options?.force) {
    return {
      needsReprocessing: true,
      reason: 'forced',
      contentHashChanged: false,
      lastIndexedAt: null,
      currentContentHash,
      storedContentHash: null,
      details: 'Force flag was set',
    }
  }

  // 2. Get strand from database
  let strand
  try {
    strand = await getStrandByPath(strandPath)
  } catch (error) {
    console.warn('[StalenessDetector] Failed to get strand:', error)
    return {
      needsReprocessing: true,
      reason: 'not_found',
      contentHashChanged: true,
      lastIndexedAt: null,
      currentContentHash,
      storedContentHash: null,
      details: `Error retrieving strand: ${error}`,
    }
  }

  // 3. Strand not found - needs processing
  if (!strand) {
    return {
      needsReprocessing: true,
      reason: 'not_found',
      contentHashChanged: true,
      lastIndexedAt: null,
      currentContentHash,
      storedContentHash: null,
      details: 'Strand not found in database',
    }
  }

  // 4. Never indexed - needs processing
  if (!strand.indexedAt) {
    return {
      needsReprocessing: true,
      reason: 'never_indexed',
      contentHashChanged: false,
      lastIndexedAt: null,
      currentContentHash,
      storedContentHash: strand.contentHash,
      details: 'Strand has never been indexed',
    }
  }

  // 5. Content hash comparison
  if (strand.contentHash !== currentContentHash) {
    return {
      needsReprocessing: true,
      reason: 'content_changed',
      contentHashChanged: true,
      lastIndexedAt: strand.indexedAt,
      currentContentHash,
      storedContentHash: strand.contentHash,
      details: `Hash changed: ${strand.contentHash} → ${currentContentHash}`,
    }
  }

  // 6. Embedding staleness check (optional, more thorough)
  if (!options?.skipEmbeddingCheck) {
    try {
      const embeddingStale = await needsRegeneration(strandPath, currentContentHash)
      if (embeddingStale) {
        return {
          needsReprocessing: true,
          reason: 'embedding_stale',
          contentHashChanged: false,
          lastIndexedAt: strand.indexedAt,
          currentContentHash,
          storedContentHash: strand.contentHash,
          details: 'Embedding is stale or missing',
        }
      }
    } catch (error) {
      // If embedding check fails, assume stale to be safe
      console.warn('[StalenessDetector] Embedding check failed:', error)
      return {
        needsReprocessing: true,
        reason: 'embedding_stale',
        contentHashChanged: false,
        lastIndexedAt: strand.indexedAt,
        currentContentHash,
        storedContentHash: strand.contentHash,
        details: `Embedding check error: ${error}`,
      }
    }
  }

  // All checks passed - up to date
  return {
    needsReprocessing: false,
    reason: 'up_to_date',
    contentHashChanged: false,
    lastIndexedAt: strand.indexedAt,
    currentContentHash,
    storedContentHash: strand.contentHash,
    details: 'All staleness checks passed',
  }
}

// ============================================================================
// BATCH OPERATIONS
// ============================================================================

/**
 * Check staleness for multiple strands
 *
 * @param strands - Array of {path, content} objects
 * @param options - Optional settings
 * @returns Map of path → StalenessCheckResult
 */
export async function checkBatchStaleness(
  strands: Array<{ path: string; content: string }>,
  options?: {
    force?: boolean
    skipEmbeddingCheck?: boolean
  }
): Promise<Map<string, StalenessCheckResult>> {
  const results = new Map<string, StalenessCheckResult>()

  // Run checks in parallel for better performance
  const checks = strands.map(async ({ path, content }) => {
    const result = await checkStrandStaleness(path, content, options)
    return { path, result }
  })

  const completed = await Promise.all(checks)
  for (const { path, result } of completed) {
    results.set(path, result)
  }

  return results
}

/**
 * Filter strands that need reprocessing
 *
 * @param strands - Array of {path, content} objects
 * @param options - Optional settings
 * @returns Array of strands that need reprocessing
 */
export async function filterStaleStrands(
  strands: Array<{ path: string; content: string }>,
  options?: {
    force?: boolean
    skipEmbeddingCheck?: boolean
  }
): Promise<Array<{ path: string; content: string; reason: StalenessReason }>> {
  const results = await checkBatchStaleness(strands, options)
  const stale: Array<{ path: string; content: string; reason: StalenessReason }> = []

  for (const { path, content } of strands) {
    const result = results.get(path)
    if (result?.needsReprocessing) {
      stale.push({ path, content, reason: result.reason })
    }
  }

  return stale
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Quick check if content changed (no database lookup)
 * Useful for fast early exit in save operations
 */
export function contentHashChanged(oldHash: string, newContent: string): boolean {
  return oldHash !== hashContent(newContent)
}

/**
 * Get human-readable description of staleness reason
 */
export function getStalenessReasonDescription(reason: StalenessReason): string {
  switch (reason) {
    case 'content_changed':
      return 'Content has been modified'
    case 'never_indexed':
      return 'Strand has never been processed'
    case 'not_found':
      return 'Strand not found in database'
    case 'embedding_stale':
      return 'Semantic search embedding is outdated'
    case 'forced':
      return 'Forced reprocessing requested'
    case 'up_to_date':
      return 'No changes detected'
  }
}
