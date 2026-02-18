/**
 * Transclusion Manager
 * @module lib/transclusion/transclusionManager
 *
 * Core logic for the block transclusion system:
 * - Parse and extract block references from markdown
 * - Resolve block content for rendering
 * - Track references and backlinks
 * - Handle live updates
 */

import { getDatabase } from '@/lib/codexDatabase'
import { generateId } from '@/lib/utils'
import type {
  ParsedBlockReference,
  BlockReference,
  BlockBacklink,
  ResolvedBlockContent,
  BacklinkWithContext,
  BacklinkStats,
  TransclusionEvent,
  TransclusionEventCallback,
  TransclusionConfig,
  ReferenceType,
  LinkRelationType,
} from './types'
import {
  DEFAULT_TRANSCLUSION_CONFIG,
  BLOCK_REFERENCE_PATTERNS,
  parseRelationType,
} from './types'

// ============================================================================
// SINGLETON STATE
// ============================================================================

let config: TransclusionConfig = { ...DEFAULT_TRANSCLUSION_CONFIG }
const eventListeners: Set<TransclusionEventCallback> = new Set()

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Update transclusion configuration
 */
export function updateConfig(updates: Partial<TransclusionConfig>): void {
  config = { ...config, ...updates }
}

/**
 * Get current configuration
 */
export function getConfig(): TransclusionConfig {
  return { ...config }
}

// ============================================================================
// EVENT SYSTEM
// ============================================================================

/**
 * Subscribe to transclusion events
 */
export function subscribe(callback: TransclusionEventCallback): () => void {
  eventListeners.add(callback)
  return () => eventListeners.delete(callback)
}

/**
 * Emit a transclusion event
 */
function emit(event: TransclusionEvent): void {
  eventListeners.forEach(callback => {
    try {
      callback(event)
    } catch (error) {
      console.error('[TransclusionManager] Event callback error:', error)
    }
  })
}

// ============================================================================
// PARSING
// ============================================================================

/**
 * Parse all block references from markdown content
 * 
 * Supports extended syntax:
 * - [[strand]] - Simple link
 * - [[strand#block]] - Block link
 * - [[strand::relation]] - Link with semantic relation
 * - [[strand::relation|context]] - Link with relation and context explanation
 * - [[strand#block::relation|context]] - Full block reference with relation
 */
export function parseBlockReferences(
  content: string,
  strandPath: string
): ParsedBlockReference[] {
  const references: ParsedBlockReference[] = []
  const lines = content.split('\n')
  let charOffset = 0

  for (let lineNum = 0; lineNum < lines.length; lineNum++) {
    const line = lines[lineNum]
    const pattern = new RegExp(BLOCK_REFERENCE_PATTERNS.full.source, 'g')
    let match: RegExpExecArray | null

    while ((match = pattern.exec(line)) !== null) {
      const prefix = match[1] || ''
      const targetPath = match[2].trim()
      const blockId = match[3]?.trim() || ''
      const relationTypeRaw = match[4]?.trim()
      const aliasOrContext = match[5]?.trim()

      // Determine reference type
      let type: ReferenceType = 'link'
      if (prefix === '!') type = 'embed'
      else if (prefix === '^') type = 'citation'
      else if (prefix === '=') type = 'mirror'

      // Parse relation type if present
      const relationType = parseRelationType(relationTypeRaw)
      
      // If relation type is set, the alias is actually the context
      // If no relation type, the value is a display alias
      const alias = relationType ? undefined : aliasOrContext
      const relationContext = relationType ? aliasOrContext : undefined

      // Skip self-references to the same strand without block ID
      if (targetPath === strandPath && !blockId) continue

      references.push({
        rawMatch: match[0],
        type,
        strandPath: targetPath,
        blockId,
        alias,
        relationType,
        relationContext,
        startIndex: charOffset + match.index,
        endIndex: charOffset + match.index + match[0].length,
        lineNumber: lineNum + 1,
      })
    }

    charOffset += line.length + 1 // +1 for newline
  }

  return references
}

/**
 * Extract just the block reference targets (strand paths referenced)
 */
export function extractReferencedPaths(content: string): string[] {
  const paths = new Set<string>()
  const pattern = new RegExp(BLOCK_REFERENCE_PATTERNS.full.source, 'g')
  let match: RegExpExecArray | null

  while ((match = pattern.exec(content)) !== null) {
    paths.add(match[2].trim())
  }

  return Array.from(paths)
}

// ============================================================================
// DATABASE OPERATIONS
// ============================================================================

/**
 * Store a block reference
 */
export async function createReference(
  sourceBlockId: string,
  sourceStrandPath: string,
  targetStrandPath: string,
  targetPosition: number,
  referenceType: ReferenceType
): Promise<BlockReference | null> {
  const db = await getDatabase()
  if (!db) return null

  const id = generateId('ref')
  const now = new Date().toISOString()

  try {
    await db.run(
      `INSERT INTO block_references (id, source_block_id, source_strand_path, target_strand_path, target_position, reference_type, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, sourceBlockId, sourceStrandPath, targetStrandPath, targetPosition, referenceType, now]
    )

    const reference: BlockReference = {
      id,
      sourceBlockId,
      sourceStrandPath,
      targetStrandPath,
      targetPosition,
      referenceType,
      createdAt: now,
    }

    emit({
      type: 'reference:created',
      strandPath: targetStrandPath,
      blockId: sourceBlockId,
      referenceId: id,
      timestamp: now,
    })

    return reference
  } catch (error) {
    console.error('[TransclusionManager] Failed to create reference:', error)
    return null
  }
}

/**
 * Delete a block reference
 */
export async function deleteReference(referenceId: string): Promise<boolean> {
  const db = await getDatabase()
  if (!db) return false

  try {
    // Get reference info for event
    const ref = await db.get(
      'SELECT target_strand_path, source_block_id FROM block_references WHERE id = ?',
      [referenceId]
    ) as { target_strand_path: string; source_block_id: string } | null

    await db.run('DELETE FROM block_references WHERE id = ?', [referenceId])

    if (ref) {
      emit({
        type: 'reference:deleted',
        strandPath: ref.target_strand_path,
        blockId: ref.source_block_id,
        referenceId,
        timestamp: new Date().toISOString(),
      })
    }

    return true
  } catch (error) {
    console.error('[TransclusionManager] Failed to delete reference:', error)
    return false
  }
}

/**
 * Get all references from a strand
 */
export async function getReferencesFromStrand(
  strandPath: string
): Promise<BlockReference[]> {
  const db = await getDatabase()
  if (!db) return []

  try {
    const rows = await db.all(
      `SELECT * FROM block_references WHERE source_strand_path = ?`,
      [strandPath]
    ) as Array<{
      id: string
      source_block_id: string
      source_strand_path: string
      target_strand_path: string
      target_position: number
      reference_type: string
      created_at: string
    }>

    return (rows || []).map(row => ({
      id: row.id,
      sourceBlockId: row.source_block_id,
      sourceStrandPath: row.source_strand_path,
      targetStrandPath: row.target_strand_path,
      targetPosition: row.target_position,
      referenceType: row.reference_type as ReferenceType,
      createdAt: row.created_at,
    }))
  } catch (error) {
    console.error('[TransclusionManager] Failed to get references:', error)
    return []
  }
}

/**
 * Get all references to a strand
 */
export async function getReferencesToStrand(
  strandPath: string
): Promise<BlockReference[]> {
  const db = await getDatabase()
  if (!db) return []

  try {
    const rows = await db.all(
      `SELECT * FROM block_references WHERE target_strand_path = ?`,
      [strandPath]
    ) as Array<{
      id: string
      source_block_id: string
      source_strand_path: string
      target_strand_path: string
      target_position: number
      reference_type: string
      created_at: string
    }>

    return (rows || []).map(row => ({
      id: row.id,
      sourceBlockId: row.source_block_id,
      sourceStrandPath: row.source_strand_path,
      targetStrandPath: row.target_strand_path,
      targetPosition: row.target_position,
      referenceType: row.reference_type as ReferenceType,
      createdAt: row.created_at,
    }))
  } catch (error) {
    console.error('[TransclusionManager] Failed to get references:', error)
    return []
  }
}

// ============================================================================
// BACKLINKS
// ============================================================================

/**
 * Create a backlink entry
 */
export async function createBacklink(
  blockId: string,
  referencingStrandPath: string,
  referencingBlockId?: string,
  contextSnippet?: string
): Promise<BlockBacklink | null> {
  const db = await getDatabase()
  if (!db) return null

  const id = generateId('bl')
  const now = new Date().toISOString()

  try {
    await db.run(
      `INSERT INTO block_backlinks (id, block_id, referencing_strand_path, referencing_block_id, context_snippet, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, blockId, referencingStrandPath, referencingBlockId || null, contextSnippet || null, now]
    )

    const backlink: BlockBacklink = {
      id,
      blockId,
      referencingStrandPath,
      referencingBlockId,
      contextSnippet,
      createdAt: now,
    }

    emit({
      type: 'backlink:created',
      strandPath: referencingStrandPath,
      blockId,
      timestamp: now,
    })

    return backlink
  } catch (error) {
    console.error('[TransclusionManager] Failed to create backlink:', error)
    return null
  }
}

/**
 * Get backlinks for a block
 */
export async function getBacklinksForBlock(
  blockId: string
): Promise<BlockBacklink[]> {
  const db = await getDatabase()
  if (!db) return []

  try {
    const rows = await db.all(
      `SELECT * FROM block_backlinks WHERE block_id = ? ORDER BY created_at DESC`,
      [blockId]
    ) as Array<{
      id: string
      block_id: string
      referencing_strand_path: string
      referencing_block_id: string | null
      context_snippet: string | null
      created_at: string
    }>

    return (rows || []).map(row => ({
      id: row.id,
      blockId: row.block_id,
      referencingStrandPath: row.referencing_strand_path,
      referencingBlockId: row.referencing_block_id || undefined,
      contextSnippet: row.context_snippet || undefined,
      createdAt: row.created_at,
    }))
  } catch (error) {
    console.error('[TransclusionManager] Failed to get backlinks:', error)
    return []
  }
}

/**
 * Get backlinks for a strand (all blocks in the strand)
 */
export async function getBacklinksForStrand(
  strandPath: string
): Promise<BacklinkWithContext[]> {
  const db = await getDatabase()
  if (!db) return []

  try {
    const rows = await db.all(
      `SELECT
        bl.*,
        sb.block_type,
        sb.raw_content as block_content,
        s.title as source_title,
        s.path as source_path,
        w.slug as weave_slug,
        l.slug as loom_slug
       FROM block_backlinks bl
       JOIN strand_blocks target_sb ON target_sb.id = bl.block_id
       LEFT JOIN strand_blocks sb ON sb.id = bl.referencing_block_id
       LEFT JOIN strands s ON s.path = bl.referencing_strand_path
       LEFT JOIN weaves w ON w.id = s.weave_id
       LEFT JOIN looms l ON l.id = s.loom_id
       WHERE target_sb.strand_path = ?
       ORDER BY bl.created_at DESC`,
      [strandPath]
    ) as Array<{
      id: string
      block_id: string
      referencing_strand_path: string
      referencing_block_id: string | null
      context_snippet: string | null
      created_at: string
      block_type: string | null
      block_content: string | null
      source_title: string | null
      source_path: string | null
      weave_slug: string | null
      loom_slug: string | null
    }>

    return (rows || []).map(row => ({
      backlink: {
        id: row.id,
        blockId: row.block_id,
        referencingStrandPath: row.referencing_strand_path,
        referencingBlockId: row.referencing_block_id || undefined,
        contextSnippet: row.context_snippet || undefined,
        createdAt: row.created_at,
      },
      sourceStrand: {
        path: row.source_path || row.referencing_strand_path,
        title: row.source_title || 'Unknown',
        weave: row.weave_slug || undefined,
        loom: row.loom_slug || undefined,
      },
      sourceBlock: row.referencing_block_id ? {
        blockId: row.referencing_block_id,
        blockType: row.block_type || 'paragraph',
        content: row.block_content || '',
      } : undefined,
      referencedAt: row.created_at,
    }))
  } catch (error) {
    console.error('[TransclusionManager] Failed to get backlinks for strand:', error)
    return []
  }
}

/**
 * Get backlink statistics for a block
 */
export async function getBacklinkStats(blockId: string): Promise<BacklinkStats> {
  const db = await getDatabase()
  if (!db) return { total: 0, uniqueStrands: 0, byType: { link: 0, embed: 0, citation: 0, mirror: 0 } }

  try {
    // Get total count
    const countResult = await db.get(
      `SELECT COUNT(*) as total FROM block_backlinks WHERE block_id = ?`,
      [blockId]
    ) as { total: number } | null

    // Get unique strands count
    const uniqueResult = await db.get(
      `SELECT COUNT(DISTINCT referencing_strand_path) as unique_strands FROM block_backlinks WHERE block_id = ?`,
      [blockId]
    ) as { unique_strands: number } | null

    // Get counts by reference type from the references table
    const typeResults = await db.all(
      `SELECT reference_type, COUNT(*) as count
       FROM block_references br
       JOIN block_backlinks bl ON br.source_block_id = bl.referencing_block_id
       WHERE bl.block_id = ?
       GROUP BY reference_type`,
      [blockId]
    ) as Array<{ reference_type: string; count: number }>

    const byType: Record<ReferenceType, number> = { link: 0, embed: 0, citation: 0, mirror: 0 }
    for (const row of typeResults || []) {
      if (row.reference_type in byType) {
        byType[row.reference_type as ReferenceType] = row.count
      }
    }

    return {
      total: countResult?.total || 0,
      uniqueStrands: uniqueResult?.unique_strands || 0,
      byType,
    }
  } catch (error) {
    console.error('[TransclusionManager] Failed to get backlink stats:', error)
    return { total: 0, uniqueStrands: 0, byType: { link: 0, embed: 0, citation: 0, mirror: 0 } }
  }
}

// ============================================================================
// CONTENT RESOLUTION
// ============================================================================

/**
 * Resolve block content for rendering
 */
export async function resolveBlockContent(
  strandPath: string,
  blockId: string
): Promise<ResolvedBlockContent | null> {
  const db = await getDatabase()
  if (!db) return null

  try {
    const row = await db.get(
      `SELECT
        sb.block_id,
        sb.block_type,
        sb.raw_content,
        sb.extractive_summary,
        sb.heading_level,
        sb.tags,
        sb.strand_path,
        s.title as strand_title,
        sb.updated_at
       FROM strand_blocks sb
       JOIN strands s ON s.id = sb.strand_id
       WHERE sb.strand_path = ? AND sb.block_id = ?`,
      [strandPath, blockId]
    ) as {
      block_id: string
      block_type: string
      raw_content: string | null
      extractive_summary: string | null
      heading_level: number | null
      tags: string | null
      strand_path: string
      strand_title: string
      updated_at: string
    } | null

    if (!row) {
      return {
        blockId,
        blockType: 'paragraph',
        content: `[Block not found: ${strandPath}#${blockId}]`,
        tags: [],
        strandPath,
        strandTitle: 'Unknown',
        exists: false,
        updatedAt: new Date().toISOString(),
      }
    }

    return {
      blockId: row.block_id,
      blockType: row.block_type,
      content: row.raw_content || '',
      summary: row.extractive_summary || undefined,
      headingLevel: row.heading_level || undefined,
      tags: row.tags ? JSON.parse(row.tags) : [],
      strandPath: row.strand_path,
      strandTitle: row.strand_title,
      exists: true,
      updatedAt: row.updated_at,
    }
  } catch (error) {
    console.error('[TransclusionManager] Failed to resolve block content:', error)
    return null
  }
}

/**
 * Resolve multiple blocks at once (batch operation)
 */
export async function resolveBlocksBatch(
  references: Array<{ strandPath: string; blockId: string }>
): Promise<Map<string, ResolvedBlockContent>> {
  const results = new Map<string, ResolvedBlockContent>()

  // Resolve in parallel
  await Promise.all(
    references.map(async ref => {
      const key = `${ref.strandPath}#${ref.blockId}`
      const content = await resolveBlockContent(ref.strandPath, ref.blockId)
      if (content) {
        results.set(key, content)
      }
    })
  )

  return results
}

// ============================================================================
// SYNCHRONIZATION
// ============================================================================

/**
 * Sync references for a strand (called after content changes)
 */
export async function syncReferencesForStrand(
  strandPath: string,
  content: string
): Promise<{ created: number; deleted: number }> {
  const db = await getDatabase()
  if (!db) return { created: 0, deleted: 0 }

  try {
    // Parse current references
    const parsedRefs = parseBlockReferences(content, strandPath)

    // Get existing references
    const existingRefs = await getReferencesFromStrand(strandPath)

    // Find references to create (in parsed but not in existing)
    const existingSet = new Set(
      existingRefs.map(r => `${r.targetStrandPath}#${r.sourceBlockId}`)
    )
    const toCreate = parsedRefs.filter(
      p => !existingSet.has(`${p.strandPath}#${p.blockId}`)
    )

    // Find references to delete (in existing but not in parsed)
    const parsedSet = new Set(
      parsedRefs.map(p => `${p.strandPath}#${p.blockId}`)
    )
    const toDelete = existingRefs.filter(
      e => !parsedSet.has(`${e.targetStrandPath}#${e.sourceBlockId}`)
    )

    // Create new references
    let created = 0
    for (const ref of toCreate) {
      const result = await createReference(
        ref.blockId,
        strandPath,
        ref.strandPath,
        ref.startIndex,
        ref.type
      )
      if (result) created++
    }

    // Delete old references
    let deleted = 0
    for (const ref of toDelete) {
      if (await deleteReference(ref.id)) deleted++
    }

    // Update backlinks if auto-update is enabled
    if (config.autoUpdateBacklinks && (created > 0 || deleted > 0)) {
      await rebuildBacklinksForStrand(strandPath)
    }

    return { created, deleted }
  } catch (error) {
    console.error('[TransclusionManager] Failed to sync references:', error)
    return { created: 0, deleted: 0 }
  }
}

/**
 * Rebuild backlinks for a strand
 */
export async function rebuildBacklinksForStrand(strandPath: string): Promise<void> {
  const db = await getDatabase()
  if (!db) return

  try {
    // Delete existing backlinks where this strand is the referencing strand
    await db.run(
      'DELETE FROM block_backlinks WHERE referencing_strand_path = ?',
      [strandPath]
    )

    // Get all references from this strand
    const refs = await getReferencesFromStrand(strandPath)

    // Create backlinks for each reference
    for (const ref of refs) {
      // Find the target block
      const targetBlock = await db.get(
        `SELECT id FROM strand_blocks WHERE strand_path = ? AND block_id = ?`,
        [ref.targetStrandPath, ref.sourceBlockId]
      ) as { id: string } | null

      if (targetBlock) {
        // Get context snippet from source
        const sourceBlock = await db.get(
          `SELECT raw_content FROM strand_blocks WHERE id = ?`,
          [ref.sourceBlockId]
        ) as { raw_content: string } | null

        const contextSnippet = sourceBlock?.raw_content?.slice(0, 150) || undefined

        await createBacklink(
          targetBlock.id,
          strandPath,
          ref.sourceBlockId,
          contextSnippet
        )
      }
    }
  } catch (error) {
    console.error('[TransclusionManager] Failed to rebuild backlinks:', error)
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  DEFAULT_TRANSCLUSION_CONFIG,
  BLOCK_REFERENCE_PATTERNS,
  VALID_RELATION_TYPES,
  isValidRelationType,
  parseRelationType,
} from './types'

export type {
  ParsedBlockReference,
  BlockReference,
  BlockBacklink,
  ResolvedBlockContent,
  BacklinkWithContext,
  BacklinkStats,
  TransclusionConfig,
  TransclusionEvent,
  ReferenceType,
  LinkRelationType,
} from './types'
