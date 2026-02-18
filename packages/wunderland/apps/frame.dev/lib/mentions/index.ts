/**
 * @Mentions System
 * @module lib/mentions
 *
 * @description
 * Tana-inspired @mentions for referencing people and entities.
 * Integrates with the transclusion system for backlink tracking.
 *
 * Syntax: @john-smith, @team-name, @project-x
 *
 * Features:
 * - Parse @mentions from content
 * - Store mention references in database
 * - Link mentions to #person supertags
 * - Track all mentions of an entity
 */

import { getDatabase } from '@/lib/codexDatabase'
import { nanoid } from 'nanoid'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Entity types that can be mentioned
 */
export type MentionEntityType =
  | 'person'     // @john-smith - links to #person supertag
  | 'team'       // @engineering - team/group
  | 'project'    // @project-x - project reference
  | 'tag'        // @important - acts like inline tag
  | 'unknown'    // Unresolved mention

/**
 * Parsed mention from content
 */
export interface ParsedMention {
  /** Full match string (e.g., "@john-smith") */
  rawMatch: string
  /** Mention text without @ prefix */
  mentionText: string
  /** Start position in source text */
  startIndex: number
  /** End position in source text */
  endIndex: number
  /** Line number in source */
  lineNumber: number
}

/**
 * Mention record stored in database
 */
export interface Mention {
  /** Unique mention ID */
  id: string
  /** Source block that contains the mention */
  sourceBlockId?: string
  /** Source strand path */
  sourceStrandPath: string
  /** Mention text (e.g., "john-smith") */
  mentionText: string
  /** Resolved entity ID (if linked to supertag) */
  entityId?: string
  /** Entity type */
  entityType?: MentionEntityType
  /** Context snippet around the mention */
  contextSnippet?: string
  /** Line number in source */
  lineNumber?: number
  /** When the mention was created */
  createdAt: string
}

/**
 * Entity with all its mentions
 */
export interface MentionedEntity {
  /** Entity identifier (mention text) */
  mentionText: string
  /** Entity type */
  entityType: MentionEntityType
  /** Number of times mentioned */
  mentionCount: number
  /** All strands that mention this entity */
  mentioningStrands: string[]
  /** Recent mentions with context */
  recentMentions: Mention[]
}

// ============================================================================
// PARSING
// ============================================================================

/**
 * Regex pattern for @mentions
 * Matches: @username, @team-name, @project_x
 * Does not match: email@domain.com (preceded by non-space)
 */
const MENTION_PATTERN = /(?<=^|[\s\(\[\{])@([a-zA-Z][a-zA-Z0-9_-]*)/g

/**
 * Parse all @mentions from content
 */
export function parseMentions(content: string): ParsedMention[] {
  const mentions: ParsedMention[] = []
  const lines = content.split('\n')

  let offset = 0
  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx]
    const lineMatches = line.matchAll(MENTION_PATTERN)

    for (const match of lineMatches) {
      if (match.index !== undefined) {
        mentions.push({
          rawMatch: match[0],
          mentionText: match[1],
          startIndex: offset + match.index,
          endIndex: offset + match.index + match[0].length,
          lineNumber: lineIdx + 1,
        })
      }
    }

    offset += line.length + 1 // +1 for newline
  }

  return mentions
}

/**
 * Extract context snippet around a mention
 */
export function extractMentionContext(
  content: string,
  mention: ParsedMention,
  contextLength = 50
): string {
  const start = Math.max(0, mention.startIndex - contextLength)
  const end = Math.min(content.length, mention.endIndex + contextLength)

  let snippet = content.substring(start, end)

  // Trim to word boundaries
  if (start > 0) {
    const firstSpace = snippet.indexOf(' ')
    if (firstSpace > 0 && firstSpace < contextLength / 2) {
      snippet = '...' + snippet.substring(firstSpace + 1)
    } else {
      snippet = '...' + snippet
    }
  }

  if (end < content.length) {
    const lastSpace = snippet.lastIndexOf(' ')
    if (lastSpace > snippet.length - contextLength / 2) {
      snippet = snippet.substring(0, lastSpace) + '...'
    } else {
      snippet = snippet + '...'
    }
  }

  return snippet.replace(/\n/g, ' ')
}

/**
 * Infer entity type from mention text
 */
export function inferEntityType(mentionText: string): MentionEntityType {
  const text = mentionText.toLowerCase()

  // Check for common team patterns
  if (text.includes('team') || text.includes('group') || text.endsWith('-eng') || text.endsWith('-ops')) {
    return 'team'
  }

  // Check for project patterns
  if (text.includes('project') || text.includes('initiative') || text.startsWith('prj-')) {
    return 'project'
  }

  // Check for tag-like patterns
  if (text === 'important' || text === 'urgent' || text === 'todo' || text === 'followup') {
    return 'tag'
  }

  // Default to person
  return 'person'
}

// ============================================================================
// DATABASE OPERATIONS
// ============================================================================

/**
 * Save a mention to the database
 */
export async function saveMention(mention: Omit<Mention, 'id' | 'createdAt'>): Promise<string | null> {
  const db = await getDatabase()
  if (!db) return null

  const id = nanoid()
  const now = new Date().toISOString()

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (db as any).run(
      `INSERT INTO mentions (id, source_block_id, source_strand_path, mention_text, entity_id, entity_type, context_snippet, line_number, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        mention.sourceBlockId || null,
        mention.sourceStrandPath,
        mention.mentionText,
        mention.entityId || null,
        mention.entityType || null,
        mention.contextSnippet || null,
        mention.lineNumber || null,
        now,
      ]
    )

    return id
  } catch (error) {
    console.error('[Mentions] Failed to save mention:', error)
    return null
  }
}

/**
 * Get all mentions in a strand
 */
export async function getMentionsInStrand(strandPath: string): Promise<Mention[]> {
  const db = await getDatabase()
  if (!db) return []

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = await (db as any).all(
      `SELECT id, source_block_id, source_strand_path, mention_text, entity_id, entity_type, context_snippet, line_number, created_at
       FROM mentions
       WHERE source_strand_path = ?
       ORDER BY line_number ASC`,
      [strandPath]
    ) as Array<{
      id: string
      source_block_id: string | null
      source_strand_path: string
      mention_text: string
      entity_id: string | null
      entity_type: string | null
      context_snippet: string | null
      line_number: number | null
      created_at: string
    }> | null

    if (!rows) return []

    return rows.map(row => ({
      id: row.id,
      sourceBlockId: row.source_block_id || undefined,
      sourceStrandPath: row.source_strand_path,
      mentionText: row.mention_text,
      entityId: row.entity_id || undefined,
      entityType: (row.entity_type as MentionEntityType) || undefined,
      contextSnippet: row.context_snippet || undefined,
      lineNumber: row.line_number || undefined,
      createdAt: row.created_at,
    }))
  } catch (error) {
    console.error('[Mentions] Failed to get mentions in strand:', error)
    return []
  }
}

/**
 * Get all mentions of an entity (by mention text)
 */
export async function getMentionsOfEntity(mentionText: string): Promise<Mention[]> {
  const db = await getDatabase()
  if (!db) return []

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = await (db as any).all(
      `SELECT id, source_block_id, source_strand_path, mention_text, entity_id, entity_type, context_snippet, line_number, created_at
       FROM mentions
       WHERE LOWER(mention_text) = LOWER(?)
       ORDER BY created_at DESC`,
      [mentionText]
    ) as Array<{
      id: string
      source_block_id: string | null
      source_strand_path: string
      mention_text: string
      entity_id: string | null
      entity_type: string | null
      context_snippet: string | null
      line_number: number | null
      created_at: string
    }> | null

    if (!rows) return []

    return rows.map(row => ({
      id: row.id,
      sourceBlockId: row.source_block_id || undefined,
      sourceStrandPath: row.source_strand_path,
      mentionText: row.mention_text,
      entityId: row.entity_id || undefined,
      entityType: (row.entity_type as MentionEntityType) || undefined,
      contextSnippet: row.context_snippet || undefined,
      lineNumber: row.line_number || undefined,
      createdAt: row.created_at,
    }))
  } catch (error) {
    console.error('[Mentions] Failed to get mentions of entity:', error)
    return []
  }
}

/**
 * Get all mentioned entities with counts
 */
export async function getAllMentionedEntities(limit = 50): Promise<MentionedEntity[]> {
  const db = await getDatabase()
  if (!db) return []

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = await (db as any).all(
      `SELECT
         mention_text,
         entity_type,
         COUNT(*) as mention_count,
         GROUP_CONCAT(DISTINCT source_strand_path) as strands
       FROM mentions
       GROUP BY LOWER(mention_text)
       ORDER BY mention_count DESC
       LIMIT ?`,
      [limit]
    ) as Array<{
      mention_text: string
      entity_type: string | null
      mention_count: number
      strands: string
    }> | null

    if (!rows) return []

    return rows.map(row => ({
      mentionText: row.mention_text,
      entityType: (row.entity_type as MentionEntityType) || inferEntityType(row.mention_text),
      mentionCount: row.mention_count,
      mentioningStrands: row.strands ? row.strands.split(',') : [],
      recentMentions: [],
    }))
  } catch (error) {
    console.error('[Mentions] Failed to get mentioned entities:', error)
    return []
  }
}

/**
 * Delete all mentions for a strand (for re-indexing)
 */
export async function deleteMentionsForStrand(strandPath: string): Promise<void> {
  const db = await getDatabase()
  if (!db) return

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (db as any).run(
      'DELETE FROM mentions WHERE source_strand_path = ?',
      [strandPath]
    )
  } catch (error) {
    console.error('[Mentions] Failed to delete mentions:', error)
  }
}

/**
 * Index all mentions in a strand's content
 */
export async function indexMentionsInContent(
  strandPath: string,
  content: string,
  blockId?: string
): Promise<number> {
  // Delete existing mentions for this strand
  await deleteMentionsForStrand(strandPath)

  // Parse new mentions
  const parsed = parseMentions(content)
  let indexed = 0

  for (const mention of parsed) {
    const saved = await saveMention({
      sourceBlockId: blockId,
      sourceStrandPath: strandPath,
      mentionText: mention.mentionText,
      entityType: inferEntityType(mention.mentionText),
      contextSnippet: extractMentionContext(content, mention),
      lineNumber: mention.lineNumber,
    })

    if (saved) indexed++
  }

  return indexed
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  // Parsing
  parseMentions,
  extractMentionContext,
  inferEntityType,

  // Database
  saveMention,
  getMentionsInStrand,
  getMentionsOfEntity,
  getAllMentionedEntities,
  deleteMentionsForStrand,
  indexMentionsInContent,
}
