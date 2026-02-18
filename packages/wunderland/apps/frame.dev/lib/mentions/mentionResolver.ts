/**
 * Mention Resolver
 * @module lib/mentions/mentionResolver
 *
 * @description
 * Resolves @mentions to structured MentionableEntity objects.
 * Uses NLP entity extraction, database lookups, and fuzzy matching.
 *
 * Inspired by Embark's mention system for linking structured data
 * inline within text documents.
 */

import { nanoid } from 'nanoid'
import { getDatabase } from '@/lib/codexDatabase'
import {
  extractEntities,
  extractEntitiesAsync,
  type ExtractedEntities,
} from '@/lib/nlp'
import {
  type MentionableEntity,
  type MentionableEntityType,
  type MentionReference,
  type MentionSuggestion,
  type MentionAutocompleteOptions,
  type PlaceEntity,
  type DateEntity,
  type PersonEntity,
  type StrandEntity,
  type ConceptEntity,
  MENTION_PATTERNS,
  ENTITY_TYPE_ICONS,
  ENTITY_TYPE_COLORS,
} from './types'

// ============================================================================
// ENTITY RESOLUTION
// ============================================================================

/**
 * Parsed mention from content
 */
interface ParsedMentionToken {
  rawMatch: string
  mentionText: string
  typeHint?: MentionableEntityType
  position: {
    start: number
    end: number
    line: number
    column: number
  }
}

/**
 * Parse all mentions from content using all syntax patterns
 */
export function parseAllMentions(content: string): ParsedMentionToken[] {
  const mentions: ParsedMentionToken[] = []
  const lines = content.split('\n')
  
  let lineOffset = 0
  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx]
    
    // Standard @mentions
    for (const match of line.matchAll(MENTION_PATTERNS.standard)) {
      if (match.index !== undefined) {
        mentions.push({
          rawMatch: match[0],
          mentionText: match[1],
          position: {
            start: lineOffset + match.index,
            end: lineOffset + match.index + match[0].length,
            line: lineIdx + 1,
            column: match.index + 1,
          },
        })
      }
    }
    
    // Typed @mentions (@place:coffee-shop)
    for (const match of line.matchAll(MENTION_PATTERNS.typed)) {
      if (match.index !== undefined) {
        mentions.push({
          rawMatch: match[0],
          mentionText: match[2],
          typeHint: match[1] as MentionableEntityType,
          position: {
            start: lineOffset + match.index,
            end: lineOffset + match.index + match[0].length,
            line: lineIdx + 1,
            column: match.index + 1,
          },
        })
      }
    }
    
    // Wiki-style @[[Entity Name]]
    for (const match of line.matchAll(MENTION_PATTERNS.wikiStyle)) {
      if (match.index !== undefined) {
        mentions.push({
          rawMatch: match[0],
          mentionText: match[1],
          position: {
            start: lineOffset + match.index,
            end: lineOffset + match.index + match[0].length,
            line: lineIdx + 1,
            column: match.index + 1,
          },
        })
      }
    }
    
    // Entity ID @{entity-id}
    for (const match of line.matchAll(MENTION_PATTERNS.entityId)) {
      if (match.index !== undefined) {
        mentions.push({
          rawMatch: match[0],
          mentionText: match[1],
          position: {
            start: lineOffset + match.index,
            end: lineOffset + match.index + match[0].length,
            line: lineIdx + 1,
            column: match.index + 1,
          },
        })
      }
    }
    
    lineOffset += line.length + 1
  }
  
  // Deduplicate by position
  const seen = new Set<string>()
  return mentions.filter(m => {
    const key = `${m.position.start}-${m.position.end}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/**
 * Infer entity type from mention text and context
 */
export function inferEntityType(
  mentionText: string,
  typeHint?: MentionableEntityType
): MentionableEntityType {
  if (typeHint) return typeHint
  
  const text = mentionText.toLowerCase()
  
  // Date patterns
  if (/^(today|tomorrow|yesterday|mon|tue|wed|thu|fri|sat|sun|monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/i.test(text)) {
    return 'date'
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(text) || /^\d{1,2}\/\d{1,2}(\/\d{2,4})?$/.test(text)) {
    return 'date'
  }
  if (/^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i.test(text)) {
    return 'date'
  }
  
  // Team patterns
  if (text.includes('team') || text.includes('group') || text.endsWith('-eng') || text.endsWith('-ops')) {
    return 'team'
  }
  
  // Project patterns
  if (text.includes('project') || text.startsWith('prj-') || text.startsWith('proj-')) {
    return 'project'
  }
  
  // Tag patterns (common status/priority tags)
  if (['important', 'urgent', 'todo', 'done', 'blocked', 'wip', 'review'].includes(text)) {
    return 'tag'
  }
  
  // Default to person for @mentions
  return 'person'
}

/**
 * Create a basic entity from mention text
 */
function createBasicEntity(
  mentionText: string,
  type: MentionableEntityType
): MentionableEntity {
  const now = new Date().toISOString()
  const base = {
    id: `entity-${nanoid(10)}`,
    type,
    label: formatLabel(mentionText),
    icon: ENTITY_TYPE_ICONS[type],
    color: ENTITY_TYPE_COLORS[type],
    createdAt: now,
  }
  
  switch (type) {
    case 'place':
      return { ...base, type: 'place', properties: {} } as PlaceEntity
    case 'date':
      return { ...base, type: 'date', properties: { date: resolveDateText(mentionText), isRange: false } } as DateEntity
    case 'person':
      return { ...base, type: 'person', properties: { fullName: formatLabel(mentionText) } } as PersonEntity
    case 'strand':
      return { ...base, type: 'strand', properties: { path: mentionText, title: formatLabel(mentionText) } } as StrandEntity
    case 'concept':
      return { ...base, type: 'concept', properties: {} } as ConceptEntity
    default:
      return { ...base, type: 'unknown', properties: {} }
  }
}

/**
 * Format mention text as display label
 */
function formatLabel(text: string): string {
  return text
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
}

/**
 * Resolve date text to ISO date string
 */
function resolveDateText(text: string): string {
  const lower = text.toLowerCase()
  const today = new Date()
  
  if (lower === 'today') {
    return today.toISOString().split('T')[0]
  }
  if (lower === 'tomorrow') {
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    return tomorrow.toISOString().split('T')[0]
  }
  if (lower === 'yesterday') {
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    return yesterday.toISOString().split('T')[0]
  }
  
  // Try parsing as date
  const parsed = new Date(text)
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0]
  }
  
  return today.toISOString().split('T')[0]
}

// ============================================================================
// DATABASE OPERATIONS
// ============================================================================

/**
 * Save a mentionable entity to the database
 */
export async function saveEntity(entity: MentionableEntity): Promise<boolean> {
  const db = await getDatabase()
  if (!db) return false
  
  try {
    const now = new Date().toISOString()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (db as any).run(
      `INSERT OR REPLACE INTO mentionable_entities
       (id, type, label, description, icon, color, source_strand_path, properties, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        entity.id,
        entity.type,
        entity.label,
        entity.description || null,
        entity.icon || null,
        entity.color || null,
        entity.sourceStrandPath || null,
        JSON.stringify(entity.properties),
        entity.createdAt,
        now,
      ]
    )
    return true
  } catch (error) {
    console.error('[MentionResolver] Failed to save entity:', error)
    return false
  }
}

/**
 * Get entity by ID
 */
export async function getEntityById(entityId: string): Promise<MentionableEntity | null> {
  const db = await getDatabase()
  if (!db) return null
  
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const row = await (db as any).get(
      `SELECT id, type, label, description, icon, color, source_strand_path, properties, created_at, updated_at
       FROM mentionable_entities WHERE id = ?`,
      [entityId]
    )
    
    if (!row) return null
    
    return {
      id: row.id,
      type: row.type,
      label: row.label,
      description: row.description || undefined,
      icon: row.icon || undefined,
      color: row.color || undefined,
      sourceStrandPath: row.source_strand_path || undefined,
      properties: JSON.parse(row.properties || '{}'),
      createdAt: row.created_at,
      updatedAt: row.updated_at || undefined,
    } as MentionableEntity
  } catch (error) {
    console.error('[MentionResolver] Failed to get entity:', error)
    return null
  }
}

/**
 * Search entities by label (fuzzy match)
 */
export async function searchEntities(
  query: string,
  options: MentionAutocompleteOptions = {}
): Promise<MentionableEntity[]> {
  const db = await getDatabase()
  if (!db) return []
  
  const { limit = 10, types } = options
  
  try {
    let sql = `
      SELECT id, type, label, description, icon, color, source_strand_path, properties, created_at, updated_at
      FROM mentionable_entities
      WHERE label LIKE ?
    `
    const params: unknown[] = [`%${query}%`]
    
    if (types && types.length > 0) {
      sql += ` AND type IN (${types.map(() => '?').join(', ')})`
      params.push(...types)
    }
    
    sql += ` ORDER BY label ASC LIMIT ?`
    params.push(limit)
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = await (db as any).all(sql, params)
    
    if (!rows) return []
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return rows.map((row: any) => ({
      id: row.id,
      type: row.type,
      label: row.label,
      description: row.description || undefined,
      icon: row.icon || undefined,
      color: row.color || undefined,
      sourceStrandPath: row.source_strand_path || undefined,
      properties: JSON.parse(row.properties || '{}'),
      createdAt: row.created_at,
      updatedAt: row.updated_at || undefined,
    } as MentionableEntity))
  } catch (error) {
    console.error('[MentionResolver] Failed to search entities:', error)
    return []
  }
}

/**
 * Get recent entities (for autocomplete suggestions)
 */
export async function getRecentEntities(
  options: MentionAutocompleteOptions = {}
): Promise<MentionableEntity[]> {
  const db = await getDatabase()
  if (!db) return []
  
  const { limit = 10, types } = options
  
  try {
    let sql = `
      SELECT id, type, label, description, icon, color, source_strand_path, properties, created_at, updated_at
      FROM mentionable_entities
    `
    const params: unknown[] = []
    
    if (types && types.length > 0) {
      sql += ` WHERE type IN (${types.map(() => '?').join(', ')})`
      params.push(...types)
    }
    
    sql += ` ORDER BY updated_at DESC, created_at DESC LIMIT ?`
    params.push(limit)
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = await (db as any).all(sql, params)
    
    if (!rows) return []
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return rows.map((row: any) => ({
      id: row.id,
      type: row.type,
      label: row.label,
      description: row.description || undefined,
      icon: row.icon || undefined,
      color: row.color || undefined,
      sourceStrandPath: row.source_strand_path || undefined,
      properties: JSON.parse(row.properties || '{}'),
      createdAt: row.created_at,
      updatedAt: row.updated_at || undefined,
    } as MentionableEntity))
  } catch (error) {
    console.error('[MentionResolver] Failed to get recent entities:', error)
    return []
  }
}

// ============================================================================
// ENTITY EXTRACTION FROM CONTENT
// ============================================================================

/**
 * Extract mentionable entities from document content using NLP
 */
export async function extractEntitiesFromContent(
  content: string,
  strandPath?: string
): Promise<MentionableEntity[]> {
  const entities: MentionableEntity[] = []
  const now = new Date().toISOString()
  
  // Use async entity extraction for better results
  let extracted: ExtractedEntities
  try {
    extracted = await extractEntitiesAsync(content)
  } catch {
    // Fallback to sync version
    extracted = extractEntities(content)
  }
  
  // Convert extracted people to PersonEntities
  for (const person of extracted.people) {
    entities.push({
      id: `person-${nanoid(10)}`,
      type: 'person',
      label: person,
      icon: ENTITY_TYPE_ICONS.person,
      color: ENTITY_TYPE_COLORS.person,
      sourceStrandPath: strandPath,
      properties: {
        fullName: person,
      },
      createdAt: now,
    } as PersonEntity)
  }
  
  // Convert locations to PlaceEntities
  for (const location of extracted.locations) {
    entities.push({
      id: `place-${nanoid(10)}`,
      type: 'place',
      label: location,
      icon: ENTITY_TYPE_ICONS.place,
      color: ENTITY_TYPE_COLORS.place,
      sourceStrandPath: strandPath,
      properties: {
        city: location,
      },
      createdAt: now,
    } as PlaceEntity)
  }
  
  // Convert dates to DateEntities
  for (const date of extracted.dates) {
    entities.push({
      id: `date-${nanoid(10)}`,
      type: 'date',
      label: date,
      icon: ENTITY_TYPE_ICONS.date,
      color: ENTITY_TYPE_COLORS.date,
      sourceStrandPath: strandPath,
      properties: {
        date: resolveDateText(date),
        isRange: false,
        naturalLanguage: date,
      },
      createdAt: now,
    } as DateEntity)
  }
  
  // Convert technologies/concepts
  for (const tech of extracted.technologies.slice(0, 10)) {
    entities.push({
      id: `concept-${nanoid(10)}`,
      type: 'concept',
      label: tech,
      icon: ENTITY_TYPE_ICONS.concept,
      color: ENTITY_TYPE_COLORS.concept,
      sourceStrandPath: strandPath,
      properties: {
        category: 'technology',
      },
      createdAt: now,
    } as ConceptEntity)
  }
  
  return entities
}

// ============================================================================
// MENTION RESOLUTION
// ============================================================================

/**
 * Resolve a mention to an entity
 */
export async function resolveMention(
  mentionText: string,
  typeHint?: MentionableEntityType
): Promise<{ entity: MentionableEntity; confidence: number }> {
  const type = inferEntityType(mentionText, typeHint)
  
  // Try to find existing entity in database
  const existing = await searchEntities(mentionText, { limit: 1, types: [type] })
  if (existing.length > 0) {
    return { entity: existing[0], confidence: 0.9 }
  }
  
  // Create new entity
  const entity = createBasicEntity(mentionText, type)
  await saveEntity(entity)
  
  return { entity, confidence: 0.5 }
}

/**
 * Resolve all mentions in content
 */
export async function resolveAllMentions(
  content: string,
  strandPath: string
): Promise<MentionReference[]> {
  const parsed = parseAllMentions(content)
  const references: MentionReference[] = []
  
  for (const mention of parsed) {
    const { entity, confidence } = await resolveMention(
      mention.mentionText,
      mention.typeHint
    )
    
    // Extract context snippet
    const contextStart = Math.max(0, mention.position.start - 30)
    const contextEnd = Math.min(content.length, mention.position.end + 30)
    const contextSnippet = content.substring(contextStart, contextEnd).replace(/\n/g, ' ')
    
    references.push({
      id: `ref-${nanoid(10)}`,
      mentionSyntax: mention.rawMatch,
      entityId: entity.id,
      entityType: entity.type,
      sourceStrandPath: strandPath,
      position: mention.position,
      contextSnippet,
      autoResolved: true,
      resolutionConfidence: confidence,
      createdAt: new Date().toISOString(),
    })
  }
  
  return references
}

// ============================================================================
// AUTOCOMPLETE
// ============================================================================

/**
 * Get autocomplete suggestions for a mention query
 */
export async function getAutocompleteSuggestions(
  query: string,
  options: MentionAutocompleteOptions = {}
): Promise<MentionSuggestion[]> {
  const { limit = 10, types, minScore = 0.3 } = options
  const suggestions: MentionSuggestion[] = []
  
  // Search existing entities
  const entities = await searchEntities(query, { limit: limit * 2, types })
  
  for (const entity of entities) {
    const score = calculateMatchScore(query, entity.label)
    if (score >= minScore) {
      suggestions.push({
        entity,
        score,
        highlightedLabel: highlightMatch(entity.label, query),
        matchType: score === 1 ? 'exact' : score > 0.8 ? 'prefix' : 'fuzzy',
        source: 'database',
      })
    }
  }
  
  // Add recent entities if query is short
  if (query.length <= 2) {
    const recent = await getRecentEntities({ limit: 5, types })
    for (const entity of recent) {
      if (!suggestions.some(s => s.entity.id === entity.id)) {
        suggestions.push({
          entity,
          score: 0.3,
          highlightedLabel: entity.label,
          matchType: 'fuzzy',
          source: 'recent',
        })
      }
    }
  }
  
  // Sort by score and limit
  return suggestions
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}

/**
 * Calculate match score between query and label
 */
function calculateMatchScore(query: string, label: string): number {
  const q = query.toLowerCase()
  const l = label.toLowerCase()
  
  // Exact match
  if (q === l) return 1
  
  // Prefix match
  if (l.startsWith(q)) return 0.9
  
  // Contains match
  if (l.includes(q)) return 0.7
  
  // Word boundary match
  const words = l.split(/[\s-_]+/)
  if (words.some(w => w.startsWith(q))) return 0.8
  
  // Fuzzy match (simple character overlap)
  let overlap = 0
  for (const char of q) {
    if (l.includes(char)) overlap++
  }
  return (overlap / q.length) * 0.5
}

/**
 * Highlight matching portion of label
 */
function highlightMatch(label: string, query: string): string {
  const q = query.toLowerCase()
  const l = label.toLowerCase()
  const idx = l.indexOf(q)
  
  if (idx === -1) return label
  
  return (
    label.substring(0, idx) +
    `<mark>${label.substring(idx, idx + query.length)}</mark>` +
    label.substring(idx + query.length)
  )
}

// ============================================================================
// DATABASE SCHEMA
// ============================================================================

/**
 * SQL to create mentionable_entities table
 */
export const MENTIONABLE_ENTITIES_SCHEMA = `
  CREATE TABLE IF NOT EXISTS mentionable_entities (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    label TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    color TEXT,
    source_strand_path TEXT,
    properties TEXT DEFAULT '{}',
    created_at TEXT NOT NULL,
    updated_at TEXT
  );
  
  CREATE INDEX IF NOT EXISTS idx_mentionable_entities_type ON mentionable_entities(type);
  CREATE INDEX IF NOT EXISTS idx_mentionable_entities_label ON mentionable_entities(label);
  CREATE INDEX IF NOT EXISTS idx_mentionable_entities_source ON mentionable_entities(source_strand_path);
`

/**
 * SQL to create mention_references table
 */
export const MENTION_REFERENCES_SCHEMA = `
  CREATE TABLE IF NOT EXISTS mention_references (
    id TEXT PRIMARY KEY,
    mention_syntax TEXT NOT NULL,
    entity_id TEXT,
    entity_type TEXT NOT NULL,
    source_strand_path TEXT NOT NULL,
    source_block_id TEXT,
    position_start INTEGER NOT NULL,
    position_end INTEGER NOT NULL,
    position_line INTEGER NOT NULL,
    position_column INTEGER NOT NULL,
    context_snippet TEXT,
    auto_resolved INTEGER DEFAULT 1,
    resolution_confidence REAL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (entity_id) REFERENCES mentionable_entities(id)
  );
  
  CREATE INDEX IF NOT EXISTS idx_mention_refs_entity ON mention_references(entity_id);
  CREATE INDEX IF NOT EXISTS idx_mention_refs_strand ON mention_references(source_strand_path);
`

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  // Parsing
  parseAllMentions,
  inferEntityType,
  
  // Database
  saveEntity,
  getEntityById,
  searchEntities,
  getRecentEntities,
  
  // Extraction
  extractEntitiesFromContent,
  
  // Resolution
  resolveMention,
  resolveAllMentions,
  
  // Autocomplete
  getAutocompleteSuggestions,
  
  // Schema
  MENTIONABLE_ENTITIES_SCHEMA,
  MENTION_REFERENCES_SCHEMA,
}




