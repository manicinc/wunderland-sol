/**
 * Block Database API
 *
 * CRUD operations for strand_blocks table.
 * Handles persistence of block-level tags, metadata, and summaries.
 *
 * @module lib/blockDatabase
 */

import { getDatabase } from './codexDatabase'
import { nanoid } from 'nanoid'
import type {
  BlockSummary,
  WorthinessSignals,
} from '@/components/quarry/types'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Block type in markdown
 */
export type MarkdownBlockType =
  | 'heading'
  | 'paragraph'
  | 'code'
  | 'list'
  | 'blockquote'
  | 'table'
  | 'html'

/**
 * Suggested tag with confidence and source
 */
export interface SuggestedTag {
  tag: string
  confidence: number
  /** Tag source: inline (explicit #hashtag), nlp (vocabulary), llm (AI), existing (propagated) */
  source: 'inline' | 'llm' | 'nlp' | 'existing'
  reasoning?: string
}

/**
 * Strand block stored in database
 */
export interface StrandBlock {
  /** Unique block ID (generated) */
  id: string
  /** Parent strand ID (foreign key) */
  strandId: string
  /** Parent strand path */
  strandPath: string
  /** Block identifier within strand (e.g., 'heading-introduction') */
  blockId: string
  /** Type of markdown block */
  blockType: MarkdownBlockType
  /** Heading level (1-6) if blockType is 'heading' */
  headingLevel?: number
  /** Heading slug for anchor links */
  headingSlug?: string
  /** Starting line number in source */
  startLine: number
  /** Ending line number in source */
  endLine: number
  /** Raw content of this block */
  rawContent?: string
  /** Extractive summary (direct excerpt) */
  extractiveSummary?: string
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
  /** Source file path (for imports) */
  sourceFile?: string
  /** Source URL if imported from web */
  sourceUrl?: string
  /** When the block was created */
  createdAt: string
  /** When the block was last updated */
  updatedAt: string
}

/**
 * Block search result with strand context
 */
export interface BlockSearchResult {
  block: StrandBlock
  strandTitle: string
  strandPath: string
  matchedTag: string
  snippet?: string
}

/**
 * Options for block queries
 */
export interface BlockQueryOptions {
  limit?: number
  offset?: number
  weave?: string
  loom?: string
  blockTypes?: MarkdownBlockType[]
  minWorthiness?: number
  hasSuggestedTags?: boolean
}

// ============================================================================
// DATABASE ROW TYPE
// ============================================================================

interface BlockRow {
  id: string
  strand_id: string
  strand_path: string
  block_id: string
  block_type: string
  heading_level: number | null
  heading_slug: string | null
  start_line: number
  end_line: number
  raw_content: string | null
  extractive_summary: string | null
  tags: string | null
  suggested_tags: string | null
  worthiness_score: number | null
  worthiness_signals: string | null
  warrants_illustration: number
  source_file: string | null
  source_url: string | null
  created_at: string
  updated_at: string
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Convert database row to StrandBlock
 */
function rowToBlock(row: BlockRow): StrandBlock {
  return {
    id: row.id,
    strandId: row.strand_id,
    strandPath: row.strand_path,
    blockId: row.block_id,
    blockType: row.block_type as MarkdownBlockType,
    headingLevel: row.heading_level ?? undefined,
    headingSlug: row.heading_slug ?? undefined,
    startLine: row.start_line,
    endLine: row.end_line,
    rawContent: row.raw_content ?? undefined,
    extractiveSummary: row.extractive_summary ?? undefined,
    tags: row.tags ? JSON.parse(row.tags) : [],
    suggestedTags: row.suggested_tags ? JSON.parse(row.suggested_tags) : [],
    worthinessScore: row.worthiness_score ?? 0,
    worthinessSignals: row.worthiness_signals
      ? JSON.parse(row.worthiness_signals)
      : { topicShift: 0, entityDensity: 0, semanticNovelty: 0 },
    warrantsIllustration: row.warrants_illustration === 1,
    sourceFile: row.source_file ?? undefined,
    sourceUrl: row.source_url ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

/**
 * Convert StrandBlock to database parameters
 */
function blockToParams(block: Partial<StrandBlock> & { strandId: string; strandPath: string; blockId: string }): Record<string, unknown> {
  const now = new Date().toISOString()
  return {
    id: block.id || nanoid(),
    strand_id: block.strandId,
    strand_path: block.strandPath,
    block_id: block.blockId,
    block_type: block.blockType || 'paragraph',
    heading_level: block.headingLevel ?? null,
    heading_slug: block.headingSlug ?? null,
    start_line: block.startLine ?? 0,
    end_line: block.endLine ?? 0,
    raw_content: block.rawContent ?? null,
    extractive_summary: block.extractiveSummary ?? null,
    tags: JSON.stringify(block.tags || []),
    suggested_tags: JSON.stringify(block.suggestedTags || []),
    worthiness_score: block.worthinessScore ?? 0,
    worthiness_signals: JSON.stringify(
      block.worthinessSignals || { topicShift: 0, entityDensity: 0, semanticNovelty: 0 }
    ),
    warrants_illustration: block.warrantsIllustration ? 1 : 0,
    source_file: block.sourceFile ?? null,
    source_url: block.sourceUrl ?? null,
    created_at: block.createdAt || now,
    updated_at: now,
  }
}

/**
 * Convert BlockSummary to StrandBlock
 */
export function blockSummaryToStrandBlock(
  summary: BlockSummary,
  strandId: string,
  strandPath: string,
  sourceFile?: string,
  sourceUrl?: string
): Omit<StrandBlock, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    strandId,
    strandPath,
    blockId: summary.blockId,
    blockType: summary.blockType as MarkdownBlockType,
    headingLevel: summary.headingLevel,
    headingSlug: summary.headingSlug,
    startLine: summary.startLine,
    endLine: summary.endLine,
    rawContent: summary.rawContent,
    extractiveSummary: summary.extractive,
    tags: summary.tags || [],
    suggestedTags: (summary.suggestedTags || []).map((st) => ({
      tag: st.tag,
      confidence: st.confidence,
      source: st.source,
      reasoning: st.reasoning,
    })),
    worthinessScore: summary.worthinessScore || 0,
    worthinessSignals: summary.worthinessSignals || {
      topicShift: 0,
      entityDensity: 0,
      semanticNovelty: 0,
    },
    warrantsIllustration: summary.warrantsNewIllustration || false,
    sourceFile,
    sourceUrl,
  }
}

// ============================================================================
// CRUD OPERATIONS
// ============================================================================

/**
 * Upsert multiple blocks for a strand (insert or update)
 */
export async function upsertStrandBlocks(
  strandPath: string,
  blocks: Array<Omit<StrandBlock, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<void> {
  const db = await getDatabase()
  if (!db) throw new Error('Database not available')

  const now = new Date().toISOString()

  // Use a transaction for bulk insert
  await db.run('BEGIN TRANSACTION')

  try {
    for (const block of blocks) {
      const params = blockToParams({
        ...block,
        createdAt: now,
        updatedAt: now,
      })

      await db.run(
        `INSERT INTO strand_blocks (
          id, strand_id, strand_path, block_id, block_type,
          heading_level, heading_slug, start_line, end_line,
          raw_content, extractive_summary, tags, suggested_tags,
          worthiness_score, worthiness_signals, warrants_illustration,
          source_file, source_url, created_at, updated_at
        ) VALUES (
          $id, $strand_id, $strand_path, $block_id, $block_type,
          $heading_level, $heading_slug, $start_line, $end_line,
          $raw_content, $extractive_summary, $tags, $suggested_tags,
          $worthiness_score, $worthiness_signals, $warrants_illustration,
          $source_file, $source_url, $created_at, $updated_at
        )
        ON CONFLICT(strand_path, block_id) DO UPDATE SET
          block_type = excluded.block_type,
          heading_level = excluded.heading_level,
          heading_slug = excluded.heading_slug,
          start_line = excluded.start_line,
          end_line = excluded.end_line,
          raw_content = excluded.raw_content,
          extractive_summary = excluded.extractive_summary,
          tags = excluded.tags,
          suggested_tags = excluded.suggested_tags,
          worthiness_score = excluded.worthiness_score,
          worthiness_signals = excluded.worthiness_signals,
          warrants_illustration = excluded.warrants_illustration,
          source_file = excluded.source_file,
          source_url = excluded.source_url,
          updated_at = excluded.updated_at`,
        {
          $id: params.id,
          $strand_id: params.strand_id,
          $strand_path: params.strand_path,
          $block_id: params.block_id,
          $block_type: params.block_type,
          $heading_level: params.heading_level,
          $heading_slug: params.heading_slug,
          $start_line: params.start_line,
          $end_line: params.end_line,
          $raw_content: params.raw_content,
          $extractive_summary: params.extractive_summary,
          $tags: params.tags,
          $suggested_tags: params.suggested_tags,
          $worthiness_score: params.worthiness_score,
          $worthiness_signals: params.worthiness_signals,
          $warrants_illustration: params.warrants_illustration,
          $source_file: params.source_file,
          $source_url: params.source_url,
          $created_at: params.created_at,
          $updated_at: params.updated_at,
        }
      )
    }

    await db.run('COMMIT')
  } catch (error) {
    await db.run('ROLLBACK')
    throw error
  }
}

/**
 * Get all blocks for a strand
 */
export async function getStrandBlocks(strandPath: string): Promise<StrandBlock[]> {
  const db = await getDatabase()
  if (!db) return []

  const rows = (await db.all(
    `SELECT * FROM strand_blocks
     WHERE strand_path = $strand_path
     ORDER BY start_line`,
    { $strand_path: strandPath }
  )) as BlockRow[]

  return rows.map(rowToBlock)
}

/**
 * Get a single block by strand path and block ID
 */
export async function getBlockById(
  strandPath: string,
  blockId: string
): Promise<StrandBlock | null> {
  const db = await getDatabase()
  if (!db) return null

  const row = (await db.get(
    `SELECT * FROM strand_blocks
     WHERE strand_path = $strand_path AND block_id = $block_id`,
    { $strand_path: strandPath, $block_id: blockId }
  )) as BlockRow | undefined

  return row ? rowToBlock(row) : null
}

/**
 * Update tags for a specific block
 */
export async function updateBlockTags(
  strandPath: string,
  blockId: string,
  tags: string[]
): Promise<void> {
  const db = await getDatabase()
  if (!db) throw new Error('Database not available')

  await db.run(
    `UPDATE strand_blocks
     SET tags = $tags, updated_at = $updated_at
     WHERE strand_path = $strand_path AND block_id = $block_id`,
    {
      $strand_path: strandPath,
      $block_id: blockId,
      $tags: JSON.stringify(tags),
      $updated_at: new Date().toISOString(),
    }
  )
}

/**
 * Accept a suggested tag (move from suggestedTags to tags)
 */
export async function acceptSuggestedTag(
  strandPath: string,
  blockId: string,
  tag: string
): Promise<void> {
  const db = await getDatabase()
  if (!db) throw new Error('Database not available')

  const block = await getBlockById(strandPath, blockId)
  if (!block) throw new Error(`Block not found: ${strandPath}/${blockId}`)

  // Add to tags if not already present
  const newTags = block.tags.includes(tag) ? block.tags : [...block.tags, tag]

  // Remove from suggested tags
  const newSuggested = block.suggestedTags.filter((st) => st.tag !== tag)

  await db.run(
    `UPDATE strand_blocks
     SET tags = $tags, suggested_tags = $suggested_tags, updated_at = $updated_at
     WHERE strand_path = $strand_path AND block_id = $block_id`,
    {
      $strand_path: strandPath,
      $block_id: blockId,
      $tags: JSON.stringify(newTags),
      $suggested_tags: JSON.stringify(newSuggested),
      $updated_at: new Date().toISOString(),
    }
  )
}

/**
 * Reject a suggested tag (remove from suggestedTags without adding to tags)
 */
export async function rejectSuggestedTag(
  strandPath: string,
  blockId: string,
  tag: string
): Promise<void> {
  const db = await getDatabase()
  if (!db) throw new Error('Database not available')

  const block = await getBlockById(strandPath, blockId)
  if (!block) throw new Error(`Block not found: ${strandPath}/${blockId}`)

  // Remove from suggested tags
  const newSuggested = block.suggestedTags.filter((st) => st.tag !== tag)

  await db.run(
    `UPDATE strand_blocks
     SET suggested_tags = $suggested_tags, updated_at = $updated_at
     WHERE strand_path = $strand_path AND block_id = $block_id`,
    {
      $strand_path: strandPath,
      $block_id: blockId,
      $suggested_tags: JSON.stringify(newSuggested),
      $updated_at: new Date().toISOString(),
    }
  )
}

/**
 * Delete all blocks for a strand
 */
export async function deleteStrandBlocks(strandPath: string): Promise<void> {
  const db = await getDatabase()
  if (!db) throw new Error('Database not available')

  await db.run('DELETE FROM strand_blocks WHERE strand_path = $strand_path', {
    $strand_path: strandPath,
  })
}

/**
 * Delete blocks that no longer exist in the strand content
 * (orphaned blocks after content edit)
 */
export async function pruneOrphanedBlocks(
  strandPath: string,
  currentBlockIds: string[]
): Promise<number> {
  const db = await getDatabase()
  if (!db) throw new Error('Database not available')

  const placeholders = currentBlockIds.map(() => '?').join(', ')
  const result = await db.run(
    `DELETE FROM strand_blocks
     WHERE strand_path = ? AND block_id NOT IN (${placeholders})`,
    [strandPath, ...currentBlockIds]
  )

  return result.changes || 0
}

// ============================================================================
// SEARCH / QUERY OPERATIONS
// ============================================================================

/**
 * Search blocks by tag
 */
export async function searchBlocksByTag(
  tag: string,
  options: BlockQueryOptions = {}
): Promise<BlockSearchResult[]> {
  const db = await getDatabase()
  if (!db) return []

  const { limit = 50, offset = 0, weave, loom, minWorthiness } = options

  let sql = `
    SELECT sb.*, s.title as strand_title
    FROM strand_blocks sb
    JOIN strands s ON sb.strand_id = s.id
    WHERE (sb.tags LIKE $tagPattern OR sb.suggested_tags LIKE $tagPattern)
  `
  const params: Record<string, unknown> = {
    $tagPattern: `%"${tag}"%`,
    $limit: limit,
    $offset: offset,
  }

  if (weave) {
    sql += ' AND sb.strand_path LIKE $weavePath'
    params.$weavePath = `weaves/${weave}/%`
  }

  if (loom) {
    sql += ' AND sb.strand_path LIKE $loomPath'
    params.$loomPath = `%/${loom}/%`
  }

  if (minWorthiness !== undefined) {
    sql += ' AND sb.worthiness_score >= $minWorthiness'
    params.$minWorthiness = minWorthiness
  }

  sql += ' ORDER BY sb.worthiness_score DESC, sb.created_at DESC LIMIT $limit OFFSET $offset'

  const rows = (await db.all(sql, params)) as (BlockRow & { strand_title: string })[]

  return rows.map((row) => ({
    block: rowToBlock(row),
    strandTitle: row.strand_title,
    strandPath: row.strand_path,
    matchedTag: tag,
    snippet: row.extractive_summary || row.raw_content?.slice(0, 200),
  }))
}

/**
 * Full-text search across block content
 */
export async function searchBlocksFullText(
  query: string,
  options: BlockQueryOptions = {}
): Promise<BlockSearchResult[]> {
  const db = await getDatabase()
  if (!db) return []

  const { limit = 50, offset = 0, weave, blockTypes } = options

  let sql = `
    SELECT sb.*, s.title as strand_title
    FROM strand_blocks sb
    JOIN strands s ON sb.strand_id = s.id
    WHERE (sb.raw_content LIKE $queryPattern OR sb.extractive_summary LIKE $queryPattern)
  `
  const params: Record<string, unknown> = {
    $queryPattern: `%${query}%`,
    $limit: limit,
    $offset: offset,
  }

  if (weave) {
    sql += ' AND sb.strand_path LIKE $weavePath'
    params.$weavePath = `weaves/${weave}/%`
  }

  if (blockTypes && blockTypes.length > 0) {
    const typePlaceholders = blockTypes.map((_, i) => `$type${i}`).join(', ')
    sql += ` AND sb.block_type IN (${typePlaceholders})`
    blockTypes.forEach((type, i) => {
      params[`$type${i}`] = type
    })
  }

  sql += ' ORDER BY sb.worthiness_score DESC LIMIT $limit OFFSET $offset'

  const rows = (await db.all(sql, params)) as (BlockRow & { strand_title: string })[]

  return rows.map((row) => ({
    block: rowToBlock(row),
    strandTitle: row.strand_title,
    strandPath: row.strand_path,
    matchedTag: '',
    snippet: row.extractive_summary || row.raw_content?.slice(0, 200),
  }))
}

/**
 * Get all unique block tags across the codex
 */
export async function getAllBlockTags(): Promise<string[]> {
  const db = await getDatabase()
  if (!db) return []

  const rows = (await db.all('SELECT DISTINCT tags FROM strand_blocks WHERE tags IS NOT NULL')) as {
    tags: string
  }[]

  const tagSet = new Set<string>()
  for (const row of rows) {
    try {
      const tags = JSON.parse(row.tags) as string[]
      tags.forEach((tag) => tagSet.add(tag))
    } catch {
      // Skip invalid JSON
    }
  }

  return Array.from(tagSet).sort()
}

/**
 * Get block tag counts (how many blocks have each tag)
 */
export async function getBlockTagCounts(): Promise<Map<string, number>> {
  const db = await getDatabase()
  if (!db) return new Map()

  const rows = (await db.all('SELECT tags FROM strand_blocks WHERE tags IS NOT NULL')) as {
    tags: string
  }[]

  const tagCounts = new Map<string, number>()
  for (const row of rows) {
    try {
      const tags = JSON.parse(row.tags) as string[]
      for (const tag of tags) {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1)
      }
    } catch {
      // Skip invalid JSON
    }
  }

  return tagCounts
}

/**
 * Get document-level tag counts (how many documents have each tag)
 * Document tags come from the strands table frontmatter tags column
 */
export async function getDocumentTagCounts(): Promise<Map<string, number>> {
  const db = await getDatabase()
  if (!db) return new Map()

  const rows = (await db.all('SELECT tags FROM strands WHERE tags IS NOT NULL')) as {
    tags: string
  }[]

  const tagCounts = new Map<string, number>()
  for (const row of rows) {
    try {
      const tags = JSON.parse(row.tags) as string[]
      for (const tag of tags) {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1)
      }
    } catch {
      // Skip invalid JSON
    }
  }

  return tagCounts
}

/**
 * Get all document-level tags (from strands table)
 */
export async function getAllDocumentTags(): Promise<string[]> {
  const db = await getDatabase()
  if (!db) return []

  const rows = (await db.all('SELECT DISTINCT tags FROM strands WHERE tags IS NOT NULL')) as {
    tags: string
  }[]

  const tagSet = new Set<string>()
  for (const row of rows) {
    try {
      const tags = JSON.parse(row.tags) as string[]
      tags.forEach((tag) => tagSet.add(tag))
    } catch {
      // Skip invalid JSON
    }
  }

  return Array.from(tagSet).sort()
}

/**
 * Get combined tag statistics showing which tags exist at doc and/or block level
 */
export interface TagLevelInfo {
  tag: string
  docCount: number
  blockCount: number
  level: 'doc' | 'block' | 'both'
}

export async function getTagLevelStats(): Promise<TagLevelInfo[]> {
  const [docCounts, blockCounts] = await Promise.all([
    getDocumentTagCounts(),
    getBlockTagCounts(),
  ])

  // Combine all unique tags
  const allTags = new Set([...docCounts.keys(), ...blockCounts.keys()])

  const stats: TagLevelInfo[] = []
  for (const tag of allTags) {
    const docCount = docCounts.get(tag) || 0
    const blockCount = blockCounts.get(tag) || 0
    const level = docCount > 0 && blockCount > 0 ? 'both' 
                : docCount > 0 ? 'doc' 
                : 'block'
    stats.push({ tag, docCount, blockCount, level })
  }

  // Sort by total count descending
  return stats.sort((a, b) => (b.docCount + b.blockCount) - (a.docCount + a.blockCount))
}

/**
 * Get blocks with pending suggested tags (for review)
 */
export async function getBlocksWithSuggestedTags(
  options: BlockQueryOptions = {}
): Promise<StrandBlock[]> {
  const db = await getDatabase()
  if (!db) return []

  const { limit = 100, offset = 0, weave, minWorthiness } = options

  let sql = `
    SELECT * FROM strand_blocks
    WHERE suggested_tags IS NOT NULL
      AND suggested_tags != '[]'
  `
  const params: Record<string, unknown> = {
    $limit: limit,
    $offset: offset,
  }

  if (weave) {
    sql += ' AND strand_path LIKE $weavePath'
    params.$weavePath = `weaves/${weave}/%`
  }

  if (minWorthiness !== undefined) {
    sql += ' AND worthiness_score >= $minWorthiness'
    params.$minWorthiness = minWorthiness
  }

  sql += ' ORDER BY worthiness_score DESC, created_at DESC LIMIT $limit OFFSET $offset'

  const rows = (await db.all(sql, params)) as BlockRow[]
  return rows.map(rowToBlock)
}

/**
 * Get worthy blocks (for illustration/tagging prioritization)
 */
export async function getWorthyBlocks(
  threshold: number = 0.5,
  options: BlockQueryOptions = {}
): Promise<StrandBlock[]> {
  const db = await getDatabase()
  if (!db) return []

  const { limit = 100, offset = 0, weave, blockTypes } = options

  let sql = `
    SELECT * FROM strand_blocks
    WHERE worthiness_score >= $threshold
  `
  const params: Record<string, unknown> = {
    $threshold: threshold,
    $limit: limit,
    $offset: offset,
  }

  if (weave) {
    sql += ' AND strand_path LIKE $weavePath'
    params.$weavePath = `weaves/${weave}/%`
  }

  if (blockTypes && blockTypes.length > 0) {
    const typePlaceholders = blockTypes.map((_, i) => `$type${i}`).join(', ')
    sql += ` AND block_type IN (${typePlaceholders})`
    blockTypes.forEach((type, i) => {
      params[`$type${i}`] = type
    })
  }

  sql += ' ORDER BY worthiness_score DESC LIMIT $limit OFFSET $offset'

  const rows = (await db.all(sql, params)) as BlockRow[]
  return rows.map(rowToBlock)
}

// ============================================================================
// STATISTICS
// ============================================================================

/**
 * Get block statistics for the codex
 */
export async function getBlockStatistics(): Promise<{
  totalBlocks: number
  taggedBlocks: number
  worthyBlocks: number
  blocksWithSuggestions: number
  blocksByType: Record<MarkdownBlockType, number>
  averageWorthiness: number
}> {
  const db = await getDatabase()
  if (!db) {
    return {
      totalBlocks: 0,
      taggedBlocks: 0,
      worthyBlocks: 0,
      blocksWithSuggestions: 0,
      blocksByType: {} as Record<MarkdownBlockType, number>,
      averageWorthiness: 0,
    }
  }

  const [total, tagged, worthy, withSuggestions, avgWorth, typeStats] = await Promise.all([
    db.get('SELECT COUNT(*) as count FROM strand_blocks') as Promise<{ count: number }>,
    db.get(
      "SELECT COUNT(*) as count FROM strand_blocks WHERE tags IS NOT NULL AND tags != '[]'"
    ) as Promise<{ count: number }>,
    db.get('SELECT COUNT(*) as count FROM strand_blocks WHERE worthiness_score >= 0.5') as Promise<{
      count: number
    }>,
    db.get(
      "SELECT COUNT(*) as count FROM strand_blocks WHERE suggested_tags IS NOT NULL AND suggested_tags != '[]'"
    ) as Promise<{ count: number }>,
    db.get('SELECT AVG(worthiness_score) as avg FROM strand_blocks') as Promise<{ avg: number }>,
    db.all('SELECT block_type, COUNT(*) as count FROM strand_blocks GROUP BY block_type') as Promise<
      { block_type: string; count: number }[]
    >,
  ])

  const blocksByType: Record<string, number> = {}
  for (const row of typeStats || []) {
    blocksByType[row.block_type] = row.count
  }

  return {
    totalBlocks: total?.count || 0,
    taggedBlocks: tagged?.count || 0,
    worthyBlocks: worthy?.count || 0,
    blocksWithSuggestions: withSuggestions?.count || 0,
    blocksByType: blocksByType as Record<MarkdownBlockType, number>,
    averageWorthiness: avgWorth?.avg || 0,
  }
}
