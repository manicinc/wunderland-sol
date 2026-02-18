/**
 * Tag Selection Utility
 * @module lib/blocks/tagSelection
 *
 * Limits the number of suggested tags per block based on:
 * - Block size (word count)
 * - Tag confidence scores
 * - Uniqueness bonuses
 *
 * Prevents tag overload while keeping the most valuable suggestions.
 */

import type { SuggestedTag } from '@/lib/blockDatabase'

// ============================================================================
// CONFIGURATION
// ============================================================================

export interface TagLimitConfig {
  /** Word count threshold for "small" blocks */
  smallBlockWordCount: number
  /** Word count threshold for "medium" blocks (above = large) */
  mediumBlockWordCount: number
  /** Max tags for small blocks */
  smallBlockMaxTags: number
  /** Max tags for medium blocks */
  mediumBlockMaxTags: number
  /** Max tags for large blocks */
  largeBlockMaxTags: number
  /** Minimum confidence to include a tag (0-1) */
  minConfidence: number
}

const DEFAULT_LIMITS: TagLimitConfig = {
  smallBlockWordCount: 100,
  mediumBlockWordCount: 500,
  smallBlockMaxTags: 3,
  mediumBlockMaxTags: 5,
  largeBlockMaxTags: 8,
  minConfidence: 0.4, // 40% - filter out low confidence
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Count words in a text string
 */
export function countWords(text: string): number {
  if (!text) return 0
  return text.trim().split(/\s+/).filter(Boolean).length
}

/**
 * Determine max tags based on block content size
 */
export function getMaxTagsForBlockSize(
  wordCount: number,
  config: TagLimitConfig = DEFAULT_LIMITS
): number {
  if (wordCount < config.smallBlockWordCount) {
    return config.smallBlockMaxTags
  }
  if (wordCount < config.mediumBlockWordCount) {
    return config.mediumBlockMaxTags
  }
  return config.largeBlockMaxTags
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Select the best tags from a list, limited by block size and quality thresholds
 *
 * @param allTags - All suggested tags for a block
 * @param blockContent - The text content of the block (for word count)
 * @param config - Optional config overrides
 * @returns Filtered and sorted tags, limited to appropriate count
 */
export function selectBestTags(
  allTags: SuggestedTag[],
  blockContent?: string,
  config: TagLimitConfig = DEFAULT_LIMITS
): SuggestedTag[] {
  if (!allTags || allTags.length === 0) {
    return []
  }

  // 1. Filter by minimum confidence
  const qualifiedTags = allTags.filter(
    (tag) => (tag.confidence ?? 0) >= config.minConfidence
  )

  // 2. Sort by confidence (highest first)
  const sortedTags = [...qualifiedTags].sort((a, b) => {
    const scoreA = a.confidence ?? 0
    const scoreB = b.confidence ?? 0
    return scoreB - scoreA
  })

  // 3. Determine max tags based on block size
  const wordCount = blockContent ? countWords(blockContent) : 0
  const maxTags = getMaxTagsForBlockSize(wordCount, config)

  // 4. Return top N tags
  return sortedTags.slice(0, maxTags)
}

/**
 * Select best tags using block line count as a size proxy
 * (when full content isn't available, estimate from line span)
 *
 * @param allTags - All suggested tags
 * @param lineCount - Number of lines in the block
 * @param config - Optional config overrides
 */
export function selectBestTagsByLineCount(
  allTags: SuggestedTag[],
  lineCount: number,
  config: TagLimitConfig = DEFAULT_LIMITS
): SuggestedTag[] {
  if (!allTags || allTags.length === 0) {
    return []
  }

  // Estimate: ~10 words per line on average
  const estimatedWordCount = lineCount * 10

  // 1. Filter by minimum confidence
  const qualifiedTags = allTags.filter(
    (tag) => (tag.confidence ?? 0) >= config.minConfidence
  )

  // 2. Sort by confidence (highest first)
  const sortedTags = [...qualifiedTags].sort((a, b) => {
    const scoreA = a.confidence ?? 0
    const scoreB = b.confidence ?? 0
    return scoreB - scoreA
  })

  // 3. Determine max tags based on estimated size
  const maxTags = getMaxTagsForBlockSize(estimatedWordCount, config)

  // 4. Return top N tags
  return sortedTags.slice(0, maxTags)
}
