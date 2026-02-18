/**
 * Tag Bubbling Module
 * @module lib/nlp/tagBubbling
 *
 * Aggregates block-level tags to document level when they appear
 * frequently enough across multiple blocks.
 *
 * Design Philosophy:
 * - Tags that appear in multiple blocks likely represent document themes
 * - Conservative bubbling: require threshold number of blocks
 * - Avoid duplicating existing document tags
 * - Track provenance: know which blocks contributed each tag
 */

import type { BlockSummary, AutoTagConfig } from '@/components/quarry/types'

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * A tag that has been bubbled up from block level to document level
 */
export interface BubbledTag {
  /** The tag string */
  tag: string
  /** Number of blocks containing this tag */
  blockCount: number
  /** Average confidence across blocks (if available) */
  confidence: number
  /** IDs of blocks that have this tag */
  sourceBlocks: string[]
  /** Reasoning for bubbling */
  reasoning: string
}

/**
 * Configuration for tag bubbling
 */
export interface TagBubblingConfig {
  /** Minimum number of blocks for a tag to bubble up (default: 3) */
  threshold?: number
  /** Document tags to exclude from bubbling (already at doc level) */
  excludeDocumentTags?: string[]
  /** Maximum tags to bubble up per document */
  maxBubbledTags?: number
  /** Minimum confidence for a tag to be considered */
  minConfidence?: number
}

// ═══════════════════════════════════════════════════════════════════════════
// DEFAULT CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

export const DEFAULT_BUBBLING_CONFIG: Required<TagBubblingConfig> = {
  threshold: 3,
  excludeDocumentTags: [],
  maxBubbledTags: 5,
  minConfidence: 0.5,
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Aggregate block-level tags and identify candidates for document-level bubbling.
 *
 * @param blockSummaries - Block summaries with tags
 * @param config - Bubbling configuration
 * @returns Array of tags that should bubble up to document level
 */
export function aggregateBlockTags(
  blockSummaries: BlockSummary[],
  config: TagBubblingConfig = {}
): BubbledTag[] {
  const fullConfig = { ...DEFAULT_BUBBLING_CONFIG, ...config }

  // Build a map of tag -> block occurrences
  const tagOccurrences = new Map<string, {
    blocks: string[]
    confidences: number[]
  }>()

  // Normalize excluded tags for comparison
  const excludedSet = new Set(
    fullConfig.excludeDocumentTags.map(t => t.toLowerCase())
  )

  // Collect all tags from blocks
  for (const block of blockSummaries) {
    const blockTags = block.tags || []
    const suggestedTags = block.suggestedTags || []

    // Process accepted tags
    for (const tag of blockTags) {
      const normalizedTag = tag.toLowerCase()

      // Skip if already at document level
      if (excludedSet.has(normalizedTag)) continue

      const existing = tagOccurrences.get(normalizedTag) || { blocks: [], confidences: [] }
      existing.blocks.push(block.blockId)
      existing.confidences.push(1.0) // Accepted tags have full confidence
      tagOccurrences.set(normalizedTag, existing)
    }

    // Also consider high-confidence suggested tags (not yet accepted)
    for (const suggested of suggestedTags) {
      if (suggested.confidence < fullConfig.minConfidence) continue

      const normalizedTag = suggested.tag.toLowerCase()
      if (excludedSet.has(normalizedTag)) continue

      const existing = tagOccurrences.get(normalizedTag) || { blocks: [], confidences: [] }
      // Don't double-count if already added from accepted tags
      if (!existing.blocks.includes(block.blockId)) {
        existing.blocks.push(block.blockId)
        existing.confidences.push(suggested.confidence)
        tagOccurrences.set(normalizedTag, existing)
      }
    }
  }

  // Filter to tags meeting the threshold
  const bubbledTags: BubbledTag[] = []

  for (const [tag, data] of tagOccurrences) {
    if (data.blocks.length >= fullConfig.threshold) {
      // Calculate average confidence
      const avgConfidence = data.confidences.reduce((a, b) => a + b, 0) / data.confidences.length

      bubbledTags.push({
        tag,
        blockCount: data.blocks.length,
        confidence: avgConfidence,
        sourceBlocks: data.blocks,
        reasoning: `Appears in ${data.blocks.length} blocks (threshold: ${fullConfig.threshold})`,
      })
    }
  }

  // Sort by block count (most common first), then by confidence
  bubbledTags.sort((a, b) => {
    if (b.blockCount !== a.blockCount) {
      return b.blockCount - a.blockCount
    }
    return b.confidence - a.confidence
  })

  // Limit to maxBubbledTags
  return bubbledTags.slice(0, fullConfig.maxBubbledTags)
}

/**
 * Apply bubbled tags to document tag array, avoiding duplicates.
 *
 * @param documentTags - Current document-level tags
 * @param bubbledTags - Tags to bubble up
 * @returns Updated document tags array
 */
export function applyBubbledTags(
  documentTags: string[],
  bubbledTags: BubbledTag[]
): string[] {
  const existingSet = new Set(documentTags.map(t => t.toLowerCase()))
  const result = [...documentTags]

  for (const bubbled of bubbledTags) {
    const normalizedTag = bubbled.tag.toLowerCase()
    if (!existingSet.has(normalizedTag)) {
      result.push(bubbled.tag)
      existingSet.add(normalizedTag)
    }
  }

  return result
}

/**
 * Check if a specific tag should bubble up based on block occurrences.
 *
 * @param tag - The tag to check
 * @param blockSummaries - Block summaries to search
 * @param threshold - Minimum block count
 * @returns Whether the tag should bubble up
 */
export function shouldTagBubble(
  tag: string,
  blockSummaries: BlockSummary[],
  threshold: number = DEFAULT_BUBBLING_CONFIG.threshold
): boolean {
  const normalizedTag = tag.toLowerCase()
  let count = 0

  for (const block of blockSummaries) {
    const blockTags = (block.tags || []).map(t => t.toLowerCase())
    if (blockTags.includes(normalizedTag)) {
      count++
      if (count >= threshold) {
        return true
      }
    }
  }

  return false
}

/**
 * Get bubbling statistics for a document.
 *
 * @param blockSummaries - Block summaries with tags
 * @param documentTags - Current document tags
 * @returns Statistics about tag distribution
 */
export function getBubblingStats(
  blockSummaries: BlockSummary[],
  documentTags: string[]
): {
  totalBlockTags: number
  uniqueBlockTags: number
  candidatesForBubbling: number
  alreadyAtDocLevel: number
} {
  const docTagSet = new Set(documentTags.map(t => t.toLowerCase()))
  const allBlockTags: string[] = []
  const uniqueBlockTags = new Set<string>()

  for (const block of blockSummaries) {
    for (const tag of (block.tags || [])) {
      allBlockTags.push(tag)
      uniqueBlockTags.add(tag.toLowerCase())
    }
  }

  // Count tags appearing 3+ times (default threshold)
  const tagCounts = new Map<string, number>()
  for (const tag of allBlockTags) {
    const normalized = tag.toLowerCase()
    tagCounts.set(normalized, (tagCounts.get(normalized) || 0) + 1)
  }

  let candidatesForBubbling = 0
  let alreadyAtDocLevel = 0

  for (const [tag, count] of tagCounts) {
    if (count >= 3) {
      if (docTagSet.has(tag)) {
        alreadyAtDocLevel++
      } else {
        candidatesForBubbling++
      }
    }
  }

  return {
    totalBlockTags: allBlockTags.length,
    uniqueBlockTags: uniqueBlockTags.size,
    candidatesForBubbling,
    alreadyAtDocLevel,
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// INTEGRATION HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Process tag bubbling as part of the auto-tagging pipeline.
 *
 * @param blockSummaries - Block summaries after tagging
 * @param documentTags - Current document tags
 * @param config - Auto-tag configuration
 * @returns Bubbled tags and updated document tags
 */
export function processTagBubbling(
  blockSummaries: BlockSummary[],
  documentTags: string[],
  config?: AutoTagConfig
): {
  bubbledTags: BubbledTag[]
  updatedDocumentTags: string[]
  applied: boolean
} {
  // Check if bubbling is enabled
  if (config && config.enableTagBubbling === false) {
    return {
      bubbledTags: [],
      updatedDocumentTags: documentTags,
      applied: false,
    }
  }

  const bubblingConfig: TagBubblingConfig = {
    threshold: config?.tagBubblingThreshold ?? DEFAULT_BUBBLING_CONFIG.threshold,
    excludeDocumentTags: documentTags,
  }

  const bubbledTags = aggregateBlockTags(blockSummaries, bubblingConfig)

  if (bubbledTags.length === 0) {
    return {
      bubbledTags: [],
      updatedDocumentTags: documentTags,
      applied: false,
    }
  }

  const updatedDocumentTags = applyBubbledTags(documentTags, bubbledTags)

  return {
    bubbledTags,
    updatedDocumentTags,
    applied: true,
  }
}

/**
 * Create a summary of bubbling results for logging/display.
 */
export function formatBubblingResults(bubbledTags: BubbledTag[]): string {
  if (bubbledTags.length === 0) {
    return 'No tags bubbled up to document level.'
  }

  const lines = [`Bubbled ${bubbledTags.length} tag(s) to document level:`]

  for (const tag of bubbledTags) {
    lines.push(
      `  - "${tag.tag}" (${tag.blockCount} blocks, ${(tag.confidence * 100).toFixed(0)}% confidence)`
    )
  }

  return lines.join('\n')
}
