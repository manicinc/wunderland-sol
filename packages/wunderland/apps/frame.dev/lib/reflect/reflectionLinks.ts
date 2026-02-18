/**
 * Reflection Links
 * @module lib/reflect/reflectionLinks
 *
 * Bidirectional linking system for reflections.
 * Detects and stores links between:
 * - Reflections ↔ Reflections (date references)
 * - Reflections ↔ Strands (document references)
 * - Strands ↔ Reflections (mentions in strands)
 */

import { getDatabase } from '@/lib/codexDatabase'
import { parseDateKey, formatDateKey } from './reflectionStore'

// ============================================================================
// TYPES
// ============================================================================

export type LinkSourceType = 'reflection' | 'strand'
export type LinkTargetType = 'reflection' | 'strand'

/**
 * A link between two items (reflections or strands)
 */
export interface ReflectionLink {
  id: string
  sourceType: LinkSourceType
  sourceId: string // date key for reflections, path for strands
  targetType: LinkTargetType
  targetId: string
  linkText?: string // The anchor text that created the link
  context?: string // Surrounding text for context
  createdAt: string
}

/**
 * Detected link in content (before saving to DB)
 */
export interface DetectedLink {
  type: 'reflection' | 'strand' | 'person'
  targetId: string
  text: string
  context: string
  startIndex: number
  endIndex: number
}

/**
 * Backlink - a link pointing TO an item
 */
export interface Backlink {
  sourceType: LinkSourceType
  sourceId: string
  sourceTitle?: string
  linkText?: string
  context?: string
  createdAt: string
}

// ============================================================================
// LAZY SCHEMA INITIALIZATION
// ============================================================================

let linksSchemaInitialized = false
let linksSchemaInitPromise: Promise<void> | null = null

/**
 * Ensure reflection_links schema is initialized (lazy, singleton)
 */
async function ensureLinksSchemaInitialized(): Promise<void> {
  if (linksSchemaInitialized) return
  if (linksSchemaInitPromise) {
    await linksSchemaInitPromise
    return
  }
  linksSchemaInitPromise = initReflectionLinksSchemaImpl().then(() => {
    linksSchemaInitialized = true
  }).catch((err) => {
    console.error('[ReflectionLinks] Failed to initialize schema:', err)
    linksSchemaInitPromise = null
  })
  await linksSchemaInitPromise
}

// Forward declaration
let initReflectionLinksSchemaImpl: () => Promise<void> = async () => {}

// ============================================================================
// DATABASE SCHEMA
// ============================================================================

/**
 * Initialize the reflection_links table
 */
export async function initReflectionLinksSchema(): Promise<void> {
  const db = await getDatabase()
  if (!db) return

  await db.exec(`
    CREATE TABLE IF NOT EXISTS reflection_links (
      id TEXT PRIMARY KEY,
      source_type TEXT NOT NULL,
      source_id TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      link_text TEXT,
      context TEXT,
      created_at TEXT NOT NULL
    )
  `)

  // Index for finding links FROM a source
  await db.exec(`
    CREATE INDEX IF NOT EXISTS idx_reflection_links_source
    ON reflection_links(source_type, source_id)
  `)

  // Index for finding links TO a target (backlinks)
  await db.exec(`
    CREATE INDEX IF NOT EXISTS idx_reflection_links_target
    ON reflection_links(target_type, target_id)
  `)
}

// Assign to the forward declaration for lazy initialization
initReflectionLinksSchemaImpl = initReflectionLinksSchema

// ============================================================================
// LINK CRUD OPERATIONS
// ============================================================================

/**
 * Save a link to the database
 */
export async function saveLink(link: ReflectionLink): Promise<void> {
  await ensureLinksSchemaInitialized()
  const db = await getDatabase()
  if (!db) return

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (db as any).run(
      `INSERT OR REPLACE INTO reflection_links
       (id, source_type, source_id, target_type, target_id, link_text, context, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        link.id,
        link.sourceType,
        link.sourceId,
        link.targetType,
        link.targetId,
        link.linkText || null,
        link.context || null,
        link.createdAt,
      ]
    )
  } catch (error) {
    console.error('[ReflectionLinks] Failed to save link:', error)
  }
}

/**
 * Delete all links from a source
 */
export async function deleteLinksFromSource(
  sourceType: LinkSourceType,
  sourceId: string
): Promise<void> {
  const db = await getDatabase()
  if (!db) return

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (db as any).run(
      `DELETE FROM reflection_links WHERE source_type = ? AND source_id = ?`,
      [sourceType, sourceId]
    )
  } catch (error) {
    console.error('[ReflectionLinks] Failed to delete links:', error)
  }
}

/**
 * Get all links FROM a source
 */
export async function getLinksFromSource(
  sourceType: LinkSourceType,
  sourceId: string
): Promise<ReflectionLink[]> {
  await ensureLinksSchemaInitialized()
  const db = await getDatabase()
  if (!db) return []

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = await (db as any).all(
      `SELECT id, source_type, source_id, target_type, target_id, link_text, context, created_at
       FROM reflection_links
       WHERE source_type = ? AND source_id = ?
       ORDER BY created_at DESC`,
      [sourceType, sourceId]
    ) as Array<{
      id: string
      source_type: string
      source_id: string
      target_type: string
      target_id: string
      link_text: string | null
      context: string | null
      created_at: string
    }> | null

    if (!rows || rows.length === 0) return []

    return rows.map(row => ({
      id: row.id,
      sourceType: row.source_type as LinkSourceType,
      sourceId: row.source_id,
      targetType: row.target_type as LinkTargetType,
      targetId: row.target_id,
      linkText: row.link_text || undefined,
      context: row.context || undefined,
      createdAt: row.created_at,
    }))
  } catch (error) {
    console.error('[ReflectionLinks] Failed to get links:', error)
    return []
  }
}

/**
 * Get all backlinks TO a target
 */
export async function getBacklinks(
  targetType: LinkTargetType,
  targetId: string
): Promise<Backlink[]> {
  await ensureLinksSchemaInitialized()
  const db = await getDatabase()
  if (!db) return []

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = await (db as any).all(
      `SELECT source_type, source_id, link_text, context, created_at
       FROM reflection_links
       WHERE target_type = ? AND target_id = ?
       ORDER BY created_at DESC`,
      [targetType, targetId]
    ) as Array<{
      source_type: string
      source_id: string
      link_text: string | null
      context: string | null
      created_at: string
    }> | null

    if (!rows || rows.length === 0) return []

    return rows.map(row => ({
      sourceType: row.source_type as LinkSourceType,
      sourceId: row.source_id,
      linkText: row.link_text || undefined,
      context: row.context || undefined,
      createdAt: row.created_at,
    }))
  } catch (error) {
    console.error('[ReflectionLinks] Failed to get backlinks:', error)
    return []
  }
}

// ============================================================================
// LINK DETECTION
// ============================================================================

/**
 * Date reference patterns
 */
const DATE_PATTERNS = [
  // Explicit dates: "December 25, 2024" or "Dec 25, 2024"
  /\b(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})?\b/gi,
  // ISO dates: "2024-12-25"
  /\b(\d{4})-(\d{2})-(\d{2})\b/g,
  // Relative dates
  /\b(yesterday|today|tomorrow)\b/gi,
  /\b(last|next)\s+(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|week|month)\b/gi,
]

/**
 * Strand/wiki link patterns
 * Matches [[link]] and [[link|display text]]
 */
const WIKI_LINK_PATTERN = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g

/**
 * Person mention pattern
 * Matches @handle
 */
const PERSON_PATTERN = /@(\w+)/g

/**
 * Parse a date string to a date key
 */
function parseDateReference(match: string, referenceDate: Date = new Date()): string | null {
  const text = match.toLowerCase().trim()

  // Relative dates
  if (text === 'today') {
    return formatDateKey(referenceDate)
  }
  if (text === 'yesterday') {
    const date = new Date(referenceDate)
    date.setDate(date.getDate() - 1)
    return formatDateKey(date)
  }
  if (text === 'tomorrow') {
    const date = new Date(referenceDate)
    date.setDate(date.getDate() + 1)
    return formatDateKey(date)
  }

  // "last week", "last Monday", etc.
  if (text.startsWith('last ')) {
    const part = text.substring(5)
    const date = new Date(referenceDate)

    if (part === 'week') {
      date.setDate(date.getDate() - 7)
      return formatDateKey(date)
    }

    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    const targetDay = dayNames.indexOf(part)
    if (targetDay !== -1) {
      const currentDay = date.getDay()
      const diff = (currentDay - targetDay + 7) % 7 || 7
      date.setDate(date.getDate() - diff)
      return formatDateKey(date)
    }
  }

  // Try to parse explicit dates
  const monthNames: Record<string, number> = {
    january: 0, jan: 0,
    february: 1, feb: 1,
    march: 2, mar: 2,
    april: 3, apr: 3,
    may: 4,
    june: 5, jun: 5,
    july: 6, jul: 6,
    august: 7, aug: 7,
    september: 8, sep: 8, sept: 8,
    october: 9, oct: 9,
    november: 10, nov: 10,
    december: 11, dec: 11,
  }

  // Match "December 25, 2024" or "Dec 25"
  const explicitMatch = match.match(/\b(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})?\b/i)
  if (explicitMatch) {
    const monthName = explicitMatch[1].toLowerCase()
    const day = parseInt(explicitMatch[2], 10)
    const year = explicitMatch[3] ? parseInt(explicitMatch[3], 10) : referenceDate.getFullYear()
    const month = monthNames[monthName]

    if (month !== undefined && day >= 1 && day <= 31) {
      const date = new Date(year, month, day)
      return formatDateKey(date)
    }
  }

  // ISO date: "2024-12-25"
  const isoMatch = match.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (isoMatch) {
    return match
  }

  return null
}

/**
 * Get surrounding context for a match
 */
function getContext(content: string, startIndex: number, endIndex: number, contextLength = 50): string {
  const start = Math.max(0, startIndex - contextLength)
  const end = Math.min(content.length, endIndex + contextLength)

  let context = content.substring(start, end).trim()

  // Add ellipsis if truncated
  if (start > 0) context = '...' + context
  if (end < content.length) context = context + '...'

  return context
}

/**
 * Detect all links in content
 */
export function detectLinks(content: string, referenceDate: Date = new Date()): DetectedLink[] {
  const links: DetectedLink[] = []
  const seenTargets = new Set<string>()

  // Detect date references
  for (const pattern of DATE_PATTERNS) {
    let match
    pattern.lastIndex = 0 // Reset regex state

    while ((match = pattern.exec(content)) !== null) {
      const dateKey = parseDateReference(match[0], referenceDate)
      if (dateKey && !seenTargets.has(`reflection:${dateKey}`)) {
        seenTargets.add(`reflection:${dateKey}`)
        links.push({
          type: 'reflection',
          targetId: dateKey,
          text: match[0],
          context: getContext(content, match.index, match.index + match[0].length),
          startIndex: match.index,
          endIndex: match.index + match[0].length,
        })
      }
    }
  }

  // Detect wiki-style links [[strand-title]]
  let wikiMatch
  WIKI_LINK_PATTERN.lastIndex = 0

  while ((wikiMatch = WIKI_LINK_PATTERN.exec(content)) !== null) {
    const targetPath = wikiMatch[1].trim()
    const displayText = wikiMatch[2]?.trim() || targetPath

    if (!seenTargets.has(`strand:${targetPath}`)) {
      seenTargets.add(`strand:${targetPath}`)
      links.push({
        type: 'strand',
        targetId: targetPath,
        text: displayText,
        context: getContext(content, wikiMatch.index, wikiMatch.index + wikiMatch[0].length),
        startIndex: wikiMatch.index,
        endIndex: wikiMatch.index + wikiMatch[0].length,
      })
    }
  }

  // Detect person mentions @handle
  let personMatch
  PERSON_PATTERN.lastIndex = 0

  while ((personMatch = PERSON_PATTERN.exec(content)) !== null) {
    const handle = personMatch[1]
    if (!seenTargets.has(`person:${handle}`)) {
      seenTargets.add(`person:${handle}`)
      links.push({
        type: 'person',
        targetId: handle,
        text: personMatch[0],
        context: getContext(content, personMatch.index, personMatch.index + personMatch[0].length),
        startIndex: personMatch.index,
        endIndex: personMatch.index + personMatch[0].length,
      })
    }
  }

  return links.sort((a, b) => a.startIndex - b.startIndex)
}

/**
 * Update links for a reflection
 * Detects links in content and updates the database
 */
export async function updateReflectionLinks(
  dateKey: string,
  content: string
): Promise<DetectedLink[]> {
  // Initialize schema if needed
  await initReflectionLinksSchema()

  // Detect links in content
  const referenceDate = parseDateKey(dateKey)
  const detectedLinks = detectLinks(content, referenceDate)

  // Delete existing links from this reflection
  await deleteLinksFromSource('reflection', dateKey)

  // Save new links
  const now = new Date().toISOString()
  for (const link of detectedLinks) {
    // Skip person mentions (handled separately by relationship system)
    if (link.type === 'person') continue

    await saveLink({
      id: `${dateKey}:${link.type}:${link.targetId}`,
      sourceType: 'reflection',
      sourceId: dateKey,
      targetType: link.type as LinkTargetType,
      targetId: link.targetId,
      linkText: link.text,
      context: link.context,
      createdAt: now,
    })
  }

  return detectedLinks
}

/**
 * Update links for a strand
 */
export async function updateStrandLinks(
  strandPath: string,
  content: string
): Promise<DetectedLink[]> {
  // Initialize schema if needed
  await initReflectionLinksSchema()

  // Detect links in content
  const detectedLinks = detectLinks(content)

  // Delete existing links from this strand
  await deleteLinksFromSource('strand', strandPath)

  // Save new links
  const now = new Date().toISOString()
  for (const link of detectedLinks) {
    // Skip person mentions
    if (link.type === 'person') continue

    await saveLink({
      id: `${strandPath}:${link.type}:${link.targetId}`,
      sourceType: 'strand',
      sourceId: strandPath,
      targetType: link.type as LinkTargetType,
      targetId: link.targetId,
      linkText: link.text,
      context: link.context,
      createdAt: now,
    })
  }

  return detectedLinks
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  // Schema
  initReflectionLinksSchema,

  // CRUD
  saveLink,
  deleteLinksFromSource,
  getLinksFromSource,
  getBacklinks,

  // Detection
  detectLinks,
  updateReflectionLinks,
  updateStrandLinks,
}
