/**
 * Block Processing Pipeline
 * @module lib/nlp/blockProcessor
 *
 * Orchestrates the full block processing workflow:
 * 1. Parse markdown content into blocks
 * 2. Calculate worthiness for each block
 * 3. Run auto-tagging on worthy blocks (NLP and optionally LLM)
 * 4. Process tag bubbling from blocks to document
 * 5. Persist blocks to database
 *
 * This is the main entry point for block-level processing during
 * import, on-demand tagging, and background job processing.
 */

import type {
  BlockSummary,
  AutoTagConfig,
  StrandMetadata,
  WorthinessSignals,
} from '@/components/quarry/types'
import {
  parseMarkdownBlocks,
  generateBlockExtractiveSummary,
  type ParsedBlock,
  type MarkdownBlockType,
} from './index'
import {
  calculateAllBlockWorthiness,
  DEFAULT_WORTHINESS_THRESHOLD,
  type WorthinessResult,
} from './blockWorthiness'
import {
  suggestBlockTagsNLP,
  type TagSuggestion,
  type TagContext,
  DEFAULT_AUTO_TAG_CONFIG,
} from './autoTagging'
import {
  aggregateBlockTags,
  processTagBubbling,
  type BubbledTag,
} from './tagBubbling'
import {
  upsertStrandBlocks,
  blockSummaryToStrandBlock,
  type StrandBlock,
  type SuggestedTag,
} from '../blockDatabase'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Options for block processing
 */
export interface BlockProcessingOptions {
  /** Whether to persist blocks to database (default: true) */
  persistToDb?: boolean
  /** Use LLM for intelligent tagging (default: false) */
  useLLM?: boolean
  /** Confidence threshold for accepting suggestions (default: 0.5 - auto-confirm >= 50%) */
  confidenceThreshold?: number
  /** Block worthiness threshold (default: 0.5) */
  worthinessThreshold?: number
  /** Enable tag bubbling to document (default: true) */
  enableTagBubbling?: boolean
  /** Minimum blocks for tag to bubble up (default: 3) */
  bubblingThreshold?: number
  /** Source file path for provenance tracking */
  sourceFile?: string
  /** Source URL for provenance tracking */
  sourceUrl?: string
  /** Progress callback */
  onProgress?: (stage: string, progress: number) => void
}

/**
 * Processed block with all metadata
 */
export interface ProcessedBlock {
  /** Block identifier */
  blockId: string
  /** Type of markdown block */
  blockType: MarkdownBlockType
  /** Heading level (1-6) if heading */
  headingLevel?: number
  /** Heading slug for anchor links */
  headingSlug?: string
  /** Starting line number in source */
  startLine: number
  /** Ending line number in source */
  endLine: number
  /** Raw content of this block */
  rawContent: string
  /** Extractive summary */
  extractiveSummary: string
  /** Accepted tags for this block */
  tags: string[]
  /** Auto-generated tag suggestions (pre-acceptance) */
  suggestedTags: SuggestedTag[]
  /** Combined worthiness score (0-1) */
  worthinessScore: number
  /** Individual signals used to calculate worthiness */
  worthinessSignals: WorthinessSignals
  /** Whether this block warrants an illustration */
  warrantsIllustration: boolean
  /** Explanation of worthiness/illustration decision */
  reasoning?: string
}

/**
 * Result of block processing
 */
export interface BlockProcessingResult {
  /** All processed blocks */
  blocks: ProcessedBlock[]
  /** Tags bubbled up to document level */
  bubbledTags: BubbledTag[]
  /** Statistics about the processing */
  stats: {
    totalBlocks: number
    worthyBlocks: number
    taggedBlocks: number
    totalSuggestedTags: number
    bubbledTagCount: number
    processingTimeMs: number
  }
  /** Method used for tagging */
  method: 'nlp' | 'llm' | 'hybrid'
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Generate a heading slug from text
 */
function generateHeadingSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

/**
 * Convert ParsedBlock to ProcessedBlock with worthiness and tags
 */
function parsedToProcessed(
  parsed: ParsedBlock,
  worthiness: WorthinessResult | undefined,
  tags: string[],
  suggestedTags: SuggestedTag[]
): ProcessedBlock {
  const extractiveSummary = generateBlockExtractiveSummary(parsed, 200)

  // Generate heading slug if it's a heading
  let headingSlug: string | undefined
  if (parsed.type === 'heading' && parsed.headingLevel) {
    headingSlug = generateHeadingSlug(parsed.content)
  }

  return {
    blockId: parsed.id,
    blockType: parsed.type,
    headingLevel: parsed.headingLevel,
    headingSlug,
    startLine: parsed.startLine,
    endLine: parsed.endLine,
    rawContent: parsed.content,
    extractiveSummary,
    tags,
    suggestedTags,
    worthinessScore: worthiness?.score ?? 0,
    worthinessSignals: worthiness?.signals ?? {
      topicShift: 0,
      entityDensity: 0,
      semanticNovelty: 0,
    },
    warrantsIllustration: worthiness?.worthy ?? false,
    reasoning: worthiness?.reasoning,
  }
}

/**
 * Convert ProcessedBlock to BlockSummary for tag bubbling
 */
function processedToBlockSummary(block: ProcessedBlock): BlockSummary {
  return {
    blockId: block.blockId,
    blockType: block.blockType,
    headingLevel: block.headingLevel,
    headingSlug: block.headingSlug,
    startLine: block.startLine,
    endLine: block.endLine,
    rawContent: block.rawContent,
    extractive: block.extractiveSummary,
    tags: block.tags,
    suggestedTags: block.suggestedTags.map((st) => ({
      tag: st.tag,
      confidence: st.confidence,
      source: st.source,
      reasoning: st.reasoning,
    })),
    worthinessScore: block.worthinessScore,
    worthinessSignals: block.worthinessSignals,
    warrantsNewIllustration: block.warrantsIllustration,
  }
}

// ============================================================================
// MAIN PIPELINE
// ============================================================================

/**
 * Process a strand's content into blocks with tags and metadata.
 * This is the main entry point for block-level processing.
 *
 * @param strandId - ID of the strand being processed
 * @param strandPath - Path to the strand
 * @param content - Raw markdown content
 * @param context - Tag context (existing tags, metadata, etc.)
 * @param options - Processing options
 * @returns Processed blocks and bubbled tags
 */
export async function processStrandBlocks(
  strandId: string,
  strandPath: string,
  content: string,
  context: TagContext,
  options: BlockProcessingOptions = {}
): Promise<BlockProcessingResult> {
  const startTime = Date.now()

  const {
    persistToDb = true,
    useLLM = false,
    confidenceThreshold = 0.5,
    worthinessThreshold = DEFAULT_WORTHINESS_THRESHOLD,
    enableTagBubbling = true,
    bubblingThreshold = 3,
    sourceFile,
    sourceUrl,
    onProgress,
  } = options

  // Merge config from context
  const config: AutoTagConfig = {
    ...DEFAULT_AUTO_TAG_CONFIG,
    ...context.config,
    useLLM,
    confidenceThreshold,
    blockWorthinessThreshold: worthinessThreshold,
    enableTagBubbling,
    tagBubblingThreshold: bubblingThreshold,
  }

  onProgress?.('Parsing markdown blocks', 10)

  // Step 1: Parse markdown into blocks
  const parsedBlocks = parseMarkdownBlocks(content)

  if (parsedBlocks.length === 0) {
    return {
      blocks: [],
      bubbledTags: [],
      stats: {
        totalBlocks: 0,
        worthyBlocks: 0,
        taggedBlocks: 0,
        totalSuggestedTags: 0,
        bubbledTagCount: 0,
        processingTimeMs: Date.now() - startTime,
      },
      method: 'nlp',
    }
  }

  onProgress?.('Calculating block worthiness', 25)

  // Step 2: Calculate worthiness for all blocks
  const documentTags = Array.isArray(context.metadata.tags)
    ? context.metadata.tags
    : context.metadata.tags
      ? [context.metadata.tags]
      : []

  const worthinessResults = await calculateAllBlockWorthiness(
    parsedBlocks,
    content,
    documentTags,
    config
  )

  onProgress?.('Auto-tagging blocks', 50)

  // Step 3: Auto-tag worthy blocks
  const processedBlocks: ProcessedBlock[] = []
  let taggedCount = 0
  let totalSuggestedCount = 0

  for (const parsed of parsedBlocks) {
    const worthiness = worthinessResults.get(parsed.id)
    const isWorthy = worthiness?.worthy ?? false

    let tags: string[] = []
    let suggestedTags: SuggestedTag[] = []

    // Only run auto-tagging on worthy blocks
    if (isWorthy && config.blockAutoTag !== false) {
      try {
        // Use NLP-based tagging (fast, offline)
        const { tags: nlpSuggestions } = suggestBlockTagsNLP(parsed, documentTags, context)

        // Split into accepted (high confidence) and suggested (lower confidence)
        for (const suggestion of nlpSuggestions) {
          if (suggestion.confidence >= confidenceThreshold) {
            // High confidence - accept immediately
            tags.push(suggestion.tag)
          } else {
            // Lower confidence - keep as suggestion for review
            suggestedTags.push({
              tag: suggestion.tag,
              confidence: suggestion.confidence,
              source: suggestion.source,
              reasoning: suggestion.reasoning,
            })
          }
        }

        if (tags.length > 0 || suggestedTags.length > 0) {
          taggedCount++
          totalSuggestedCount += suggestedTags.length
        }
      } catch (error) {
        console.warn(
          `[blockProcessor] Failed to auto-tag block ${parsed.id}:`,
          error
        )
      }
    }

    const processed = parsedToProcessed(parsed, worthiness, tags, suggestedTags)
    processedBlocks.push(processed)
  }

  onProgress?.('Processing tag bubbling', 75)

  // Step 4: Process tag bubbling
  let bubbledTags: BubbledTag[] = []

  if (enableTagBubbling && taggedCount > 0) {
    const blockSummaries = processedBlocks.map(processedToBlockSummary)

    bubbledTags = aggregateBlockTags(blockSummaries, {
      threshold: bubblingThreshold,
      excludeDocumentTags: documentTags,
      maxBubbledTags: 5,
      minConfidence: 0.5,
    })
  }

  onProgress?.('Persisting to database', 90)

  // Step 5: Persist to database
  if (persistToDb) {
    try {
      const strandBlocks = processedBlocks.map((block) =>
        blockSummaryToStrandBlock(
          processedToBlockSummary(block),
          strandId,
          strandPath,
          sourceFile,
          sourceUrl
        )
      )

      await upsertStrandBlocks(strandPath, strandBlocks)
    } catch (error) {
      console.error(
        `[blockProcessor] Failed to persist blocks for ${strandPath}:`,
        error
      )
      // Don't fail the entire operation - blocks are still returned
    }
  }

  onProgress?.('Complete', 100)

  // Calculate statistics
  const worthyBlocks = processedBlocks.filter(
    (b) => b.worthinessScore >= worthinessThreshold
  ).length

  return {
    blocks: processedBlocks,
    bubbledTags,
    stats: {
      totalBlocks: processedBlocks.length,
      worthyBlocks,
      taggedBlocks: taggedCount,
      totalSuggestedTags: totalSuggestedCount,
      bubbledTagCount: bubbledTags.length,
      processingTimeMs: Date.now() - startTime,
    },
    method: useLLM ? 'hybrid' : 'nlp',
  }
}

/**
 * Process multiple strands in batch.
 * Useful for background job processing.
 *
 * @param strands - Array of strands to process
 * @param globalContext - Shared context for all strands
 * @param options - Processing options
 * @param onProgress - Progress callback (strand index, total)
 * @returns Results for each strand
 */
export async function processStrandBlocksBatch(
  strands: Array<{
    id: string
    path: string
    content: string
    metadata: StrandMetadata
  }>,
  globalContext: Omit<TagContext, 'metadata'>,
  options: BlockProcessingOptions = {},
  onProgress?: (current: number, total: number, strandPath: string) => void
): Promise<Map<string, BlockProcessingResult>> {
  const results = new Map<string, BlockProcessingResult>()

  for (let i = 0; i < strands.length; i++) {
    const strand = strands[i]
    onProgress?.(i + 1, strands.length, strand.path)

    try {
      const context: TagContext = {
        ...globalContext,
        metadata: strand.metadata,
      }

      const result = await processStrandBlocks(
        strand.id,
        strand.path,
        strand.content,
        context,
        {
          ...options,
          // Suppress individual progress for batch processing
          onProgress: undefined,
        }
      )

      results.set(strand.path, result)
    } catch (error) {
      console.error(
        `[blockProcessor] Failed to process strand ${strand.path}:`,
        error
      )
      // Continue with other strands
    }
  }

  return results
}

/**
 * Reprocess blocks for a strand (e.g., after content edit).
 * Preserves manually accepted tags while recalculating worthiness
 * and regenerating suggestions.
 *
 * @param strandId - ID of the strand
 * @param strandPath - Path to the strand
 * @param newContent - Updated content
 * @param context - Tag context
 * @param existingBlocks - Previously processed blocks to preserve tags from
 * @param options - Processing options
 */
export async function reprocessStrandBlocks(
  strandId: string,
  strandPath: string,
  newContent: string,
  context: TagContext,
  existingBlocks: ProcessedBlock[],
  options: BlockProcessingOptions = {}
): Promise<BlockProcessingResult> {
  // Build a map of existing accepted tags by block position (line range)
  const existingTagsByRange = new Map<string, string[]>()
  for (const block of existingBlocks) {
    const key = `${block.startLine}-${block.endLine}`
    if (block.tags.length > 0) {
      existingTagsByRange.set(key, block.tags)
    }
  }

  // Process fresh
  const result = await processStrandBlocks(
    strandId,
    strandPath,
    newContent,
    context,
    {
      ...options,
      persistToDb: false, // We'll persist after merging
    }
  )

  // Merge existing accepted tags back in
  for (const block of result.blocks) {
    const key = `${block.startLine}-${block.endLine}`
    const existingTags = existingTagsByRange.get(key)
    if (existingTags) {
      // Add back existing tags that aren't already present
      for (const tag of existingTags) {
        if (!block.tags.includes(tag)) {
          block.tags.push(tag)
        }
        // Remove from suggestions if it was manually accepted before
        block.suggestedTags = block.suggestedTags.filter((st) => st.tag !== tag)
      }
    }
  }

  // Now persist with merged tags
  if (options.persistToDb !== false) {
    const strandBlocks = result.blocks.map((block) =>
      blockSummaryToStrandBlock(
        processedToBlockSummary(block),
        strandId,
        strandPath,
        options.sourceFile,
        options.sourceUrl
      )
    )

    await upsertStrandBlocks(strandPath, strandBlocks)
  }

  return result
}

/**
 * Get aggregate statistics for block processing across the codex.
 */
export interface BlockProcessingStats {
  totalStrands: number
  totalBlocks: number
  worthyBlocks: number
  taggedBlocks: number
  suggestedTags: number
  bubbledTags: number
  averageWorthiness: number
  averageBlocksPerStrand: number
}

/**
 * Aggregate results from batch processing.
 */
export function aggregateProcessingStats(
  results: Map<string, BlockProcessingResult>
): BlockProcessingStats {
  let totalBlocks = 0
  let worthyBlocks = 0
  let taggedBlocks = 0
  let suggestedTags = 0
  let bubbledTags = 0
  let totalWorthiness = 0

  for (const result of results.values()) {
    totalBlocks += result.stats.totalBlocks
    worthyBlocks += result.stats.worthyBlocks
    taggedBlocks += result.stats.taggedBlocks
    suggestedTags += result.stats.totalSuggestedTags
    bubbledTags += result.stats.bubbledTagCount

    for (const block of result.blocks) {
      totalWorthiness += block.worthinessScore
    }
  }

  return {
    totalStrands: results.size,
    totalBlocks,
    worthyBlocks,
    taggedBlocks,
    suggestedTags,
    bubbledTags,
    averageWorthiness: totalBlocks > 0 ? totalWorthiness / totalBlocks : 0,
    averageBlocksPerStrand:
      results.size > 0 ? totalBlocks / results.size : 0,
  }
}
