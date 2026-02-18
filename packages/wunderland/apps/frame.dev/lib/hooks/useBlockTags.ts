/**
 * useBlockTags Hook
 * @module lib/hooks/useBlockTags
 *
 * React hook for block-level tag operations.
 * Dynamically extracts block tags from markdown content with per-strand caching.
 *
 * Data flow:
 * - Strand content → parseMarkdownBlocks → NLP suggestions → cache
 * - Cache stored in StorageManager (sql-storage-adapter)
 * - Cache invalidated on publish/edit
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import type { StrandBlock, SuggestedTag } from '@/lib/blockDatabase'
import { hasApiRoutes } from '@/lib/utils/deploymentMode'
import {
  getLocalBlocks,
  updateLocalBlockTag,
} from '@/lib/storage/blockStorage'
import { extractInlineTags, type InlineTag } from '@/lib/markdown/inlineTagExtractor'
import {
  getRejectedTagsForBlock,
  persistRejectedTag,
  isTagRejectedInStrand,
} from '@/lib/storage/tagPersistence'
import { selectBestTagsByLineCount } from '@/lib/blocks/tagSelection'
import { getStorageManager } from '@/lib/storage/StorageManager'
import { parseMarkdownBlocks, generateBlockExtractiveSummary, type ParsedBlock, type MarkdownBlockType } from '@/lib/nlp'
import {
  suggestBlockTagsNLP,
  type TagSuggestion,
  type TagContext,
  DEFAULT_AUTO_TAG_CONFIG
} from '@/lib/nlp/autoTagging'
import type { StorableBlockTagsCache } from '@/lib/storage/types'

/**
 * Simple inline worthiness calculation
 * Avoids async complexity of full worthiness calculation
 */
function calculateSimpleWorthiness(content: string, blockType: MarkdownBlockType): { score: number; signals?: Record<string, number> } {
  // Skip certain block types that rarely need tags
  if (blockType === 'table' || blockType === 'html' || blockType === 'frontmatter') {
    return { score: 0, signals: { skipped: 1 } }
  }

  // Skip very short blocks
  const contentLength = content.length
  if (contentLength < 50) {
    return { score: 0.1, signals: { tooShort: 1 } }
  }

  // Headings are valuable anchors for tags
  if (blockType === 'heading') {
    return { score: 0.7, signals: { heading: 1 } }
  }

  // Code blocks with substantial content
  if (blockType === 'code') {
    return { score: contentLength > 200 ? 0.5 : 0.3, signals: { code: 1 } }
  }

  // Calculate based on content length and line count
  const lineCount = content.split('\n').length
  let score = 0.3

  // Bonus for substantial content
  if (contentLength > 200) score += 0.2
  if (contentLength > 500) score += 0.1
  if (lineCount > 5) score += 0.1

  // Bonus for lists
  if (blockType === 'list') {
    score += 0.1
  }

  // Bonus for blockquotes (often citations or key points)
  if (blockType === 'blockquote') {
    score += 0.15
  }

  return { score: Math.min(score, 1), signals: { length: contentLength, lines: lineCount } }
}

// Memory cache for current session (per-strand)
const memoryCache = new Map<string, { blocks: StrandBlock[], contentHash: string, timestamp: number }>()
const MEMORY_CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

/**
 * Simple content hash for cache invalidation
 */
function hashContent(content: string): string {
  let hash = 0
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16)
}

/**
 * Invalidate the blocks cache for a specific strand
 * Call this after publishing/editing a strand
 */
export async function invalidateBlocksCache(strandPath?: string): Promise<void> {
  if (strandPath) {
    // Invalidate specific strand
    memoryCache.delete(strandPath)
    try {
      const storage = getStorageManager()
      await storage.invalidateBlockTagsCache(strandPath)
      console.log('[useBlockTags] Cache invalidated for', strandPath)
    } catch (error) {
      console.warn('[useBlockTags] Failed to invalidate cache:', error)
    }
  } else {
    // Invalidate all
    memoryCache.clear()
    console.log('[useBlockTags] All caches invalidated')
  }
}

/**
 * Convert ParsedBlock to cache block format
 */
function parsedBlockToCacheBlock(
  block: ParsedBlock,
  strandPath: string,
  worthiness: { score: number; signals?: Record<string, number> },
  suggestions: TagSuggestion[]
): StorableBlockTagsCache['blocks'][number] {
  return {
    id: block.id,
    line: block.startLine,
    endLine: block.endLine,
    type: block.type,
    headingLevel: block.headingLevel,
    headingText: block.type === 'heading' ? block.content.replace(/^#+\s*/, '') : undefined,
    tags: [],
    suggestedTags: suggestions.map(s => ({
      tag: s.tag,
      confidence: s.confidence,
      source: s.source,
      reasoning: s.reasoning,
    })),
    worthiness,
    extractiveSummary: generateBlockExtractiveSummary(block.content),
    warrantsIllustration: false,
  }
}

/**
 * Convert cache block to StrandBlock format
 * Filters out any tags that have been rejected by the user
 */
function cacheBlockToStrandBlock(
  block: StorableBlockTagsCache['blocks'][number],
  strandPath: string
): StrandBlock {
  // Get rejected tags for this block
  const rejectedTags = getRejectedTagsForBlock(strandPath, block.id)
  const rejectedTagSet = new Set(rejectedTags.map(rt => rt.tag))

  // Filter out rejected tags from accepted tags
  const filteredTags = (block.tags || []).filter(tag => !rejectedTagSet.has(tag))

  // Filter out rejected tags from suggested tags
  const filteredSuggestedTags = (block.suggestedTags || [])
    .filter(st => !rejectedTagSet.has(st.tag))
    .map(st => ({
      tag: st.tag,
      confidence: st.confidence,
      source: st.source as 'nlp' | 'llm' | 'existing' | 'user',
      reasoning: st.reasoning
    }))

  // Apply tag limits based on block size (line count as proxy)
  const lineCount = (block.endLine ?? block.line) - block.line + 1
  const limitedSuggestedTags = selectBestTagsByLineCount(filteredSuggestedTags, lineCount)

  return {
    strandPath,
    blockId: block.id,
    startLine: block.line,
    endLine: block.endLine ?? block.line,
    blockType: block.type as StrandBlock['blockType'],
    headingLevel: block.headingLevel,
    headingText: block.headingText,
    tags: filteredTags,
    suggestedTags: limitedSuggestedTags,
    worthinessScore: block.worthiness?.score ?? 0,
    worthinessSignals: block.worthiness?.signals,
    extractiveSummary: block.extractiveSummary,
    warrantsIllustration: block.warrantsIllustration ?? false,
    processedAt: new Date().toISOString(),
    autoTagged: true
  }
}

/**
 * Extract blocks from markdown content and run NLP suggestions
 */
async function extractBlocksFromContent(
  strandPath: string,
  content: string,
  strandTitle?: string
): Promise<StorableBlockTagsCache['blocks']> {
  const parsedBlocks = parseMarkdownBlocks(content)
  const cacheBlocks: StorableBlockTagsCache['blocks'] = []

  // Process each block
  for (const block of parsedBlocks) {
    // Calculate worthiness using simple inline calculation
    const worthiness = calculateSimpleWorthiness(block.content, block.type)

    // Only run NLP suggestions on worthy blocks (score >= 0.3)
    let suggestions: TagSuggestion[] = []
    if (worthiness.score >= 0.3) {
      try {
        // Build minimal TagContext for NLP suggestions
        const tagContext: TagContext = {
          existingTags: [],
          relatedTags: [],
          hierarchyTags: [],
          metadata: { title: strandTitle || '' } as any,
          config: DEFAULT_AUTO_TAG_CONFIG,
        }

        const result = suggestBlockTagsNLP(
          { content: block.content, type: block.type, headingText: block.headingText },
          [],  // documentTags
          tagContext
        )

        // Extract tags from result object, limit to top 3
        suggestions = result.tags.slice(0, 3)
      } catch (error) {
        console.warn('[useBlockTags] NLP suggestion failed for block:', block.id, error)
      }
    }

    cacheBlocks.push(parsedBlockToCacheBlock(block, strandPath, worthiness, suggestions))
  }

  return cacheBlocks
}

// ============================================================================
// TYPES
// ============================================================================

export interface UseBlockTagsOptions {
  /** Auto-fetch blocks on mount */
  autoFetch?: boolean
  /** Raw markdown content for client-side inline tag extraction */
  strandContent?: string
  /** Callback when a tag operation succeeds */
  onSuccess?: (action: string, blockId: string, tag: string) => void
  /** Callback when a tag operation fails */
  onError?: (error: Error) => void
}

export interface UseBlockTagsReturn {
  /** All blocks for the strand */
  blocks: StrandBlock[]
  /** Loading state for initial fetch */
  isLoading: boolean
  /** Error from last operation */
  error: Error | null

  /** Inline tags extracted client-side from markdown (immediate, no network) */
  inlineTags: InlineTag[]

  /** Get a block by its blockId */
  getBlockById: (blockId: string) => StrandBlock | undefined

  /** Accept a suggested tag (move to accepted) */
  acceptTag: (blockId: string, tag: string) => Promise<void>
  /** Reject a suggested tag (remove from suggestions) */
  rejectTag: (blockId: string, tag: string) => Promise<void>
  /** Add a new tag manually */
  addTag: (blockId: string, tag: string) => Promise<void>
  /** Remove an accepted tag */
  removeTag: (blockId: string, tag: string) => Promise<void>

  /** Refetch blocks from server */
  refetch: () => Promise<void>

  /** Stats about current blocks */
  stats: {
    total: number
    tagged: number
    pending: number
    worthy: number
    /** Inline tags extracted from markdown content */
    inlineCount: number
  }
}

// ============================================================================
// HOOK
// ============================================================================

export function useBlockTags(
  strandPath: string | null,
  options: UseBlockTagsOptions = {}
): UseBlockTagsReturn {
  const { autoFetch = true, strandContent, onSuccess, onError } = options

  const [blocks, setBlocks] = useState<StrandBlock[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // Extract inline tags client-side (immediate, no network)
  // Filter out any tags that have been rejected
  const inlineTags = useMemo(() => {
    if (!strandContent || !strandPath) return []
    const tags = extractInlineTags(strandContent)

    // Filter out rejected inline tags
    const filteredTags = tags.filter(tag => !isTagRejectedInStrand(strandPath, tag.tag))

    if (filteredTags.length > 0) {
      console.log('[useBlockTags] Extracted', filteredTags.length, 'inline tags client-side (filtered from', tags.length, ')')
    }
    return filteredTags
  }, [strandContent, strandPath])

  // Block lookup map for O(1) access - defensive iteration
  const blockMap = useMemo(() => {
    const map = new Map<string, StrandBlock>()
    if (blocks) {
      for (const block of blocks) {
        map.set(block.blockId, block)
      }
    }
    return map
  }, [blocks])

  // Stats - defensive array access
  const stats = useMemo(
    () => ({
      total: blocks?.length ?? 0,
      tagged: blocks?.filter((b) => (b.tags?.length ?? 0) > 0).length ?? 0,
      pending: blocks?.filter((b) => (b.suggestedTags?.length ?? 0) > 0).length ?? 0,
      worthy: blocks?.filter((b) => (b.worthinessScore ?? 0) >= 0.5).length ?? 0,
      inlineCount: inlineTags.length,
    }),
    [blocks, inlineTags]
  )

  // Track if component is mounted to avoid state updates after unmount
  const isMountedRef = useRef(true)
  useEffect(() => {
    isMountedRef.current = true
    return () => { isMountedRef.current = false }
  }, [])

  // Fetch blocks with dynamic extraction and caching
  const refetch = useCallback(async () => {
    if (!strandPath) {
      setBlocks([])
      return
    }

    // Need content for dynamic extraction
    if (!strandContent) {
      // No content available, return empty
      setBlocks([])
      return
    }

    setIsLoading(true)
    setError(null)

    const contentHash = hashContent(strandContent)

    try {
      // Step 1: Check memory cache (fastest)
      const memoryCached = memoryCache.get(strandPath)
      if (memoryCached && memoryCached.contentHash === contentHash) {
        const now = Date.now()
        if (now - memoryCached.timestamp < MEMORY_CACHE_TTL_MS) {
          console.log('[useBlockTags] Memory cache hit for', strandPath)
          if (isMountedRef.current) {
            setBlocks(memoryCached.blocks)
          }
          return
        }
      }

      // Step 2: Check StorageManager cache
      let cacheBlocks: StorableBlockTagsCache['blocks'] | null = null
      try {
        const storage = getStorageManager()
        const cached = await storage.getBlockTagsCache(strandPath)
        if (cached && cached.strandContentHash === contentHash) {
          console.log('[useBlockTags] Storage cache hit for', strandPath)
          cacheBlocks = cached.blocks
        }
      } catch (error) {
        console.warn('[useBlockTags] Storage cache check failed:', error)
      }

      // Step 3: If no cache, extract dynamically
      if (!cacheBlocks) {
        console.log('[useBlockTags] Extracting blocks dynamically for', strandPath)
        cacheBlocks = await extractBlocksFromContent(strandPath, strandContent)

        // Save to storage cache (async, don't wait)
        try {
          const storage = getStorageManager()
          storage.saveBlockTagsCache(strandPath, cacheBlocks, contentHash).catch(err => {
            console.warn('[useBlockTags] Failed to save cache:', err)
          })
        } catch {
          // Storage not available
        }
      }

      // Convert cache blocks to StrandBlocks
      const strandBlocks = cacheBlocks.map(block => cacheBlockToStrandBlock(block, strandPath))

      // Update memory cache
      memoryCache.set(strandPath, {
        blocks: strandBlocks,
        contentHash,
        timestamp: Date.now(),
      })

      // Log stats
      const blocksWithSuggestions = strandBlocks.filter(b => (b.suggestedTags?.length || 0) > 0)
      console.log(`[useBlockTags] ${strandBlocks.length} blocks, ${blocksWithSuggestions.length} with suggestions`)

      if (isMountedRef.current) {
        setBlocks(strandBlocks)
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      if (isMountedRef.current) {
        setError(error)
        onError?.(error)
        setBlocks([])
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false)
      }
    }
  }, [strandPath, strandContent, onError])

  // Auto-fetch on mount or strandPath/content change
  useEffect(() => {
    if (autoFetch && strandPath && strandContent) {
      refetch()
    }
  }, [autoFetch, strandPath, strandContent, refetch])

  // Get block by ID
  const getBlockById = useCallback(
    (blockId: string) => blockMap.get(blockId),
    [blockMap]
  )

  // Generic tag operation
  const performTagAction = useCallback(
    async (action: 'accept' | 'reject' | 'add' | 'remove', blockId: string, tag: string) => {
      if (!strandPath) {
        throw new Error('No strand path set')
      }

      // Optimistic update
      setBlocks((prev) =>
        prev.map((block) => {
          if (block.blockId !== blockId) return block

          // Safely access arrays with fallbacks
          const currentTags = block.tags || []
          const currentSuggestions = block.suggestedTags || []

          switch (action) {
            case 'accept':
              return {
                ...block,
                tags: currentTags.includes(tag) ? currentTags : [...currentTags, tag],
                suggestedTags: currentSuggestions.filter((st) => st.tag !== tag),
              }
            case 'reject':
              return {
                ...block,
                suggestedTags: currentSuggestions.filter((st) => st.tag !== tag),
              }
            case 'add':
              return {
                ...block,
                tags: currentTags.includes(tag) ? currentTags : [...currentTags, tag],
              }
            case 'remove':
              return {
                ...block,
                tags: currentTags.filter((t) => t !== tag),
              }
            default:
              return block
          }
        })
      )

      try {
        if (hasApiRoutes()) {
          // Server mode: persist to API
          const res = await fetch('/api/blocks/tags', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action, strandPath, blockId, tag }),
          })

          if (!res.ok) {
            const data = await res.json().catch(() => ({}))
            throw new Error(data.error || `Failed to ${action} tag: ${res.status}`)
          }
        } else {
          // Static export mode: persist to local storage
          await updateLocalBlockTag(strandPath, blockId, action, tag)
        }

        // Persist rejected tags so they don't reappear on reload
        if (action === 'reject' || action === 'remove') {
          await persistRejectedTag({
            tag,
            blockId,
            strandPath,
            source: action === 'reject' ? 'suggested' : 'accepted',
          })
        }

        onSuccess?.(action, blockId, tag)
      } catch (err) {
        // Revert optimistic update on error
        await refetch()
        const error = err instanceof Error ? err : new Error(String(err))
        setError(error)
        onError?.(error)
        throw error
      }
    },
    [strandPath, refetch, onSuccess, onError]
  )

  // Action methods
  const acceptTag = useCallback(
    (blockId: string, tag: string) => performTagAction('accept', blockId, tag),
    [performTagAction]
  )

  const rejectTag = useCallback(
    (blockId: string, tag: string) => performTagAction('reject', blockId, tag),
    [performTagAction]
  )

  const addTag = useCallback(
    (blockId: string, tag: string) => performTagAction('add', blockId, tag),
    [performTagAction]
  )

  const removeTag = useCallback(
    (blockId: string, tag: string) => performTagAction('remove', blockId, tag),
    [performTagAction]
  )

  return {
    blocks,
    isLoading,
    error,
    inlineTags,
    getBlockById,
    acceptTag,
    rejectTag,
    addTag,
    removeTag,
    refetch,
    stats,
  }
}

// ============================================================================
// UTILITY EXPORTS
// ============================================================================

/**
 * Check if blocks are available in cache for a strand
 */
export async function hasBlocksInCache(strandPath: string): Promise<boolean> {
  try {
    const storage = getStorageManager()
    const cached = await storage.getBlockTagsCache(strandPath)
    return cached !== null && cached.blocks.length > 0
  } catch {
    return false
  }
}

/**
 * Clear the blocks cache for all strands
 */
export function clearBlocksCache(): void {
  memoryCache.clear()
  console.log('[useBlockTags] All memory caches cleared')
}
