/**
 * Block Worthiness Calculation Module
 * @module lib/nlp/blockWorthiness
 *
 * Determines if a block is "worthy" of receiving tags based on:
 * - Topic shift: How different is the block from the document's main theme
 * - Entity density: Concentration of tech entities, concepts, acronyms
 * - Semantic novelty: How unique is this block compared to surrounding blocks
 *
 * Design Philosophy:
 * - Conservative by default: blocks must earn tags
 * - Combine multiple signals for robust decisions
 * - Avoid over-tagging: better to miss a tag than add noise
 */

import type { ParsedBlock } from './index'
import type {
  AutoTagConfig,
  WorthinessSignals,
  WorthinessResult,
  WorthinessWeights
} from '@/components/quarry/types'

// Re-export types for consumers
export type { WorthinessResult, WorthinessSignals, WorthinessWeights }
import { extractTechEntities, extractKeywords, extractNgrams, STOP_WORDS } from './index'

// ═══════════════════════════════════════════════════════════════════════════
// DEFAULT CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

export const DEFAULT_WORTHINESS_WEIGHTS: Required<WorthinessWeights> = {
  topicShift: 0.4,
  entityDensity: 0.3,
  semanticNovelty: 0.3,
}

export const DEFAULT_WORTHINESS_THRESHOLD = 0.5

// ═══════════════════════════════════════════════════════════════════════════
// TOPIC SHIFT CALCULATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Calculate how much a block's topic shifts from the document's main theme.
 * Higher score = more distinct topic = more worthy of its own tags.
 *
 * @param blockContent - The text content of the block
 * @param documentTags - Tags already assigned to the document
 * @param documentContent - Full document content for context
 * @returns Score from 0-1 where 1 = completely new topic
 */
export function calculateTopicShift(
  blockContent: string,
  documentTags: string[],
  documentContent: string
): number {
  if (!blockContent.trim() || blockContent.length < 20) {
    return 0 // Too short to have a meaningful topic
  }

  // Extract block-level keywords and entities
  const blockKeywords = extractKeywords(blockContent, 15)
  const blockEntities = extractTechEntities(blockContent)

  // Flatten entities into a set of terms
  const blockTerms = new Set<string>()
  for (const kw of blockKeywords) {
    blockTerms.add(kw.word.toLowerCase())
  }
  for (const category of Object.values(blockEntities)) {
    for (const entity of category) {
      blockTerms.add(entity.toLowerCase())
    }
  }

  // Normalize document tags for comparison
  const docTagSet = new Set(
    documentTags.map(t => t.toLowerCase().replace(/-/g, ' '))
  )

  // Count how many block terms are NOT in document tags
  let uniqueTerms = 0
  let totalTerms = 0

  for (const term of blockTerms) {
    totalTerms++
    // Check if term overlaps with any doc tag
    let matchesDocTag = false
    for (const docTag of docTagSet) {
      if (term.includes(docTag) || docTag.includes(term)) {
        matchesDocTag = true
        break
      }
    }
    if (!matchesDocTag) {
      uniqueTerms++
    }
  }

  if (totalTerms === 0) {
    return 0
  }

  // Base score: proportion of unique terms
  let score = uniqueTerms / totalTerms

  // Bonus: if block has high-value unique entities (frameworks, languages)
  const highValueCategories = ['languages', 'frameworks', 'databases', 'cloud', 'ai']
  let highValueUnique = 0

  for (const cat of highValueCategories) {
    const catEntities = blockEntities[cat] || []
    for (const entity of catEntities) {
      const entityLower = entity.toLowerCase()
      let matchesDocTag = false
      for (const docTag of docTagSet) {
        if (entityLower.includes(docTag) || docTag.includes(entityLower)) {
          matchesDocTag = true
          break
        }
      }
      if (!matchesDocTag) {
        highValueUnique++
      }
    }
  }

  // Add bonus for high-value unique entities (up to 0.3)
  score = Math.min(1, score + (highValueUnique * 0.1))

  return Math.min(1, Math.max(0, score))
}

// ═══════════════════════════════════════════════════════════════════════════
// ENTITY DENSITY CALCULATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Calculate the density of meaningful entities in a block.
 * Higher density = more information-rich = more worthy of tags.
 *
 * @param blockContent - The text content of the block
 * @returns Score from 0-1 where 1 = very entity-dense
 */
export function calculateEntityDensity(blockContent: string): number {
  if (!blockContent.trim()) {
    return 0
  }

  const wordCount = blockContent.split(/\s+/).filter(w => w.length > 0).length
  if (wordCount < 5) {
    return 0 // Too short
  }

  // Extract entities
  const entities = extractTechEntities(blockContent)

  // Count total entities across all categories
  let entityCount = 0
  for (const category of Object.values(entities)) {
    entityCount += category.length
  }

  // Extract acronyms (often meaningful in tech content)
  const acronyms = blockContent.match(/\b[A-Z]{2,8}\b/g) || []
  const meaningfulAcronyms = acronyms.filter(a =>
    !['THE', 'AND', 'FOR', 'NOT', 'BUT', 'ARE', 'WAS', 'HAS', 'HAD', 'CAN', 'ALL'].includes(a)
  )
  entityCount += meaningfulAcronyms.length * 0.5 // Half weight for acronyms

  // Calculate density (entities per 10 words)
  const density = (entityCount / wordCount) * 10

  // Normalize to 0-1 scale
  // - 0.5 entities per 10 words = low (0.2)
  // - 2 entities per 10 words = medium (0.5)
  // - 4+ entities per 10 words = high (0.8+)
  const normalizedScore = Math.min(1, density / 5)

  return Math.max(0, normalizedScore)
}

// ═══════════════════════════════════════════════════════════════════════════
// SEMANTIC NOVELTY CALCULATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Calculate semantic novelty using n-gram overlap as a proxy for semantic similarity.
 * If embeddings are provided, uses cosine distance instead (more accurate).
 *
 * @param blockContent - The text content of the block
 * @param surroundingBlocks - Content of surrounding blocks for comparison
 * @param embeddingFn - Optional function to generate embeddings
 * @returns Score from 0-1 where 1 = very novel/unique
 */
export async function calculateSemanticNovelty(
  blockContent: string,
  surroundingBlocks: string[],
  embeddingFn?: (text: string) => Promise<number[]>
): Promise<number> {
  if (!blockContent.trim() || blockContent.length < 30) {
    return 0
  }

  if (surroundingBlocks.length === 0) {
    // First block or no context - moderate novelty
    return 0.5
  }

  // If we have an embedding function, use it for more accurate similarity
  if (embeddingFn) {
    try {
      const blockEmbedding = await embeddingFn(blockContent)

      // Calculate average similarity to surrounding blocks
      let totalSimilarity = 0
      let validComparisons = 0

      for (const surrounding of surroundingBlocks) {
        if (surrounding.trim().length < 20) continue

        const surroundingEmbedding = await embeddingFn(surrounding)
        const similarity = cosineSimilarity(blockEmbedding, surroundingEmbedding)
        totalSimilarity += similarity
        validComparisons++
      }

      if (validComparisons === 0) {
        return 0.5
      }

      const avgSimilarity = totalSimilarity / validComparisons
      // Novelty = 1 - similarity (low similarity = high novelty)
      return Math.max(0, Math.min(1, 1 - avgSimilarity))
    } catch (error) {
      console.warn('[blockWorthiness] Embedding failed, falling back to n-gram overlap', error)
      // Fall through to n-gram method
    }
  }

  // Fallback: n-gram overlap method
  return calculateNgramNovelty(blockContent, surroundingBlocks)
}

/**
 * Calculate novelty using n-gram overlap (no embeddings needed)
 */
function calculateNgramNovelty(blockContent: string, surroundingBlocks: string[]): number {
  // Extract bigrams and trigrams from block
  const blockBigrams = new Set(extractNgrams(blockContent, 2).map(ng => ng.toLowerCase()))
  const blockTrigrams = new Set(extractNgrams(blockContent, 3).map(ng => ng.toLowerCase()))

  if (blockBigrams.size === 0 && blockTrigrams.size === 0) {
    return 0.5 // No n-grams extracted
  }

  // Calculate overlap with each surrounding block
  let totalOverlap = 0
  let validComparisons = 0

  for (const surrounding of surroundingBlocks) {
    if (surrounding.trim().length < 30) continue

    const surroundingBigrams = new Set(extractNgrams(surrounding, 2).map(ng => ng.toLowerCase()))
    const surroundingTrigrams = new Set(extractNgrams(surrounding, 3).map(ng => ng.toLowerCase()))

    // Calculate Jaccard similarity for bigrams and trigrams
    const bigramOverlap = jaccardSimilarity(blockBigrams, surroundingBigrams)
    const trigramOverlap = jaccardSimilarity(blockTrigrams, surroundingTrigrams)

    // Weight trigrams higher (more specific)
    const overlap = (bigramOverlap * 0.4) + (trigramOverlap * 0.6)
    totalOverlap += overlap
    validComparisons++
  }

  if (validComparisons === 0) {
    return 0.5
  }

  const avgOverlap = totalOverlap / validComparisons
  // Novelty = 1 - overlap (low overlap = high novelty)
  return Math.max(0, Math.min(1, 1 - avgOverlap))
}

/**
 * Calculate Jaccard similarity between two sets
 */
function jaccardSimilarity<T>(setA: Set<T>, setB: Set<T>): number {
  if (setA.size === 0 && setB.size === 0) return 1
  if (setA.size === 0 || setB.size === 0) return 0

  let intersection = 0
  for (const item of setA) {
    if (setB.has(item)) {
      intersection++
    }
  }

  const union = setA.size + setB.size - intersection
  return union > 0 ? intersection / union : 0
}

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0

  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }

  const magnitude = Math.sqrt(normA) * Math.sqrt(normB)
  return magnitude > 0 ? dotProduct / magnitude : 0
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN WORTHINESS CALCULATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Calculate overall block worthiness for tagging.
 * Combines topic shift, entity density, and semantic novelty.
 *
 * @param block - The parsed block to evaluate
 * @param context - Document context and configuration
 * @param embeddingFn - Optional embedding function for semantic novelty
 * @returns Worthiness result with score, signals, and reasoning
 */
export async function calculateBlockWorthiness(
  block: ParsedBlock,
  context: {
    documentContent: string
    documentTags: string[]
    surroundingBlocks: ParsedBlock[]
    config?: AutoTagConfig
  },
  embeddingFn?: (text: string) => Promise<number[]>
): Promise<WorthinessResult> {
  const weights = {
    ...DEFAULT_WORTHINESS_WEIGHTS,
    ...context.config?.worthinessWeights,
  }

  const threshold = context.config?.blockWorthinessThreshold ?? DEFAULT_WORTHINESS_THRESHOLD

  // Skip certain block types that rarely need tags
  if (block.type === 'table' || block.type === 'html') {
    return {
      score: 0,
      signals: { topicShift: 0, entityDensity: 0, semanticNovelty: 0 },
      worthy: false,
      reasoning: `Block type "${block.type}" is not typically tagged`,
    }
  }

  // Skip very short blocks
  if (block.content.length < 50) {
    return {
      score: 0,
      signals: { topicShift: 0, entityDensity: 0, semanticNovelty: 0 },
      worthy: false,
      reasoning: 'Block is too short for meaningful tagging',
    }
  }

  // Calculate individual signals
  const topicShift = calculateTopicShift(
    block.content,
    context.documentTags,
    context.documentContent
  )

  const entityDensity = calculateEntityDensity(block.content)

  const surroundingContent = context.surroundingBlocks.map(b => b.content)
  const semanticNovelty = await calculateSemanticNovelty(
    block.content,
    surroundingContent,
    embeddingFn
  )

  const signals: WorthinessSignals = {
    topicShift,
    entityDensity,
    semanticNovelty,
  }

  // Calculate weighted score
  const score =
    (signals.topicShift * weights.topicShift) +
    (signals.entityDensity * weights.entityDensity) +
    (signals.semanticNovelty * weights.semanticNovelty)

  const worthy = score >= threshold

  // Generate reasoning
  const reasons: string[] = []

  if (topicShift >= 0.5) {
    reasons.push('introduces new topics')
  } else if (topicShift >= 0.3) {
    reasons.push('some topic variation')
  }

  if (entityDensity >= 0.5) {
    reasons.push('entity-rich content')
  } else if (entityDensity >= 0.25) {
    reasons.push('moderate entity density')
  }

  if (semanticNovelty >= 0.6) {
    reasons.push('semantically distinct')
  } else if (semanticNovelty >= 0.4) {
    reasons.push('somewhat novel')
  }

  const reasoning = worthy
    ? `Block worthy (score: ${score.toFixed(2)}): ${reasons.join(', ') || 'meets threshold'}`
    : `Block not worthy (score: ${score.toFixed(2)}): ${reasons.length > 0 ? reasons.join(', ') : 'below threshold'}`

  return {
    score,
    signals,
    worthy,
    reasoning,
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// BATCH PROCESSING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Calculate worthiness for all blocks in a document.
 * Processes blocks in order, using previous blocks as context.
 *
 * @param blocks - All parsed blocks in the document
 * @param documentContent - Full document content
 * @param documentTags - Document-level tags
 * @param config - Auto-tag configuration
 * @param embeddingFn - Optional embedding function
 * @returns Map of blockId to worthiness result
 */
export async function calculateAllBlockWorthiness(
  blocks: ParsedBlock[],
  documentContent: string,
  documentTags: string[],
  config?: AutoTagConfig,
  embeddingFn?: (text: string) => Promise<number[]>
): Promise<Map<string, WorthinessResult>> {
  const results = new Map<string, WorthinessResult>()

  // Process blocks with sliding window of surrounding context
  const contextWindow = 3 // Number of blocks before/after to consider

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i]

    // Get surrounding blocks (before and after)
    const startIdx = Math.max(0, i - contextWindow)
    const endIdx = Math.min(blocks.length, i + contextWindow + 1)
    const surroundingBlocks = [
      ...blocks.slice(startIdx, i),
      ...blocks.slice(i + 1, endIdx),
    ]

    const result = await calculateBlockWorthiness(
      block,
      {
        documentContent,
        documentTags,
        surroundingBlocks,
        config,
      },
      embeddingFn
    )

    results.set(block.id, result)
  }

  return results
}

/**
 * Filter blocks to only those worthy of tagging
 */
export function filterWorthyBlocks(
  blocks: ParsedBlock[],
  worthinessResults: Map<string, WorthinessResult>
): ParsedBlock[] {
  return blocks.filter(block => {
    const result = worthinessResults.get(block.id)
    return result?.worthy ?? false
  })
}
