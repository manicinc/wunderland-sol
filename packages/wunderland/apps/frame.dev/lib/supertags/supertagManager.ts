/**
 * Supertag Manager
 * @module lib/supertags/supertagManager
 *
 * Core logic for the supertag system:
 * - Schema management (CRUD)
 * - Field value management
 * - Built-in schema initialization
 * - Query helpers
 */

import { getDatabase } from '@/lib/codexDatabase'
import { generateId } from '@/lib/utils'
import type {
  SupertagSchema,
  SupertagFieldValue,
  SupertagFieldDefinition,
  SupertaggedBlock,
  SupertagConfig,
  BuiltInSupertag,
} from './types'
import { BUILT_IN_SCHEMAS, DEFAULT_SUPERTAG_CONFIG } from './types'
import {
  evaluateFormula,
  createFormulaContext,
  type FormulaContext,
  type FormulaResult,
} from '@/lib/formulas'
import type { MentionableEntity } from '@/lib/mentions/types'

// ============================================================================
// SINGLETON STATE
// ============================================================================

let config: SupertagConfig = { ...DEFAULT_SUPERTAG_CONFIG }
let initialized = false

// ============================================================================
// TAG-TO-SUPERTAG AUTO-GENERATION
// ============================================================================

/**
 * Color palette for auto-generated tag colors
 */
const TAG_COLORS = [
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#a855f7', // purple
  '#14b8a6', // teal
  '#f43f5e', // rose
  '#84cc16', // lime
]

/**
 * Icon mapping for common tag names
 */
const TAG_ICON_MAP: Record<string, string> = {
  work: 'Briefcase',
  home: 'Home',
  important: 'Star',
  urgent: 'AlertCircle',
  idea: 'Lightbulb',
  question: 'HelpCircle',
  todo: 'CheckSquare',
  done: 'CheckCircle',
  code: 'Code',
  bug: 'Bug',
  feature: 'Sparkles',
  note: 'StickyNote',
  research: 'Search',
  review: 'Eye',
  blocked: 'Ban',
  waiting: 'Clock',
  later: 'Calendar',
  priority: 'Flag',
  starred: 'Star',
  archived: 'Archive',
  draft: 'FileEdit',
  published: 'Globe',
  private: 'Lock',
  public: 'Unlock',
  learning: 'GraduationCap',
  health: 'Heart',
  money: 'DollarSign',
  travel: 'Plane',
  food: 'UtensilsCrossed',
  shopping: 'ShoppingCart',
  email: 'Mail',
  call: 'Phone',
  meeting: 'Calendar',
  project: 'Folder',
  personal: 'User',
  team: 'Users',
}

/**
 * Generate a consistent color for a tag based on its name
 */
function generateTagColor(tagName: string): string {
  const hash = tagName.toLowerCase().split('').reduce((acc, char) => {
    return acc + char.charCodeAt(0)
  }, 0)
  return TAG_COLORS[hash % TAG_COLORS.length]
}

/**
 * Generate an icon for a tag based on common words
 */
function generateTagIcon(tagName: string): string {
  const lowerName = tagName.toLowerCase()

  // Check for exact match
  if (TAG_ICON_MAP[lowerName]) {
    return TAG_ICON_MAP[lowerName]
  }

  // Check if tag contains any known words
  for (const [word, icon] of Object.entries(TAG_ICON_MAP)) {
    if (lowerName.includes(word)) {
      return icon
    }
  }

  return 'Hash' // Default icon for tags
}

/**
 * Convert tag name to display name (title case)
 */
function tagToDisplayName(tagName: string): string {
  return tagName
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
}

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Update supertag configuration
 */
export function updateConfig(updates: Partial<SupertagConfig>): void {
  config = { ...config, ...updates }
}

/**
 * Get current configuration
 */
export function getConfig(): SupertagConfig {
  return { ...config }
}

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initialize supertag system with built-in schemas only
 * User tags remain lightweight until explicitly promoted to supertags
 */
export async function initializeSupertags(): Promise<void> {
  if (initialized) return

  const db = await getDatabase()
  if (!db) return

  try {
    // Create built-in schemas if they don't exist
    // These are the pre-defined supertags: person, meeting, task, book, etc.
    for (const [tagName, schema] of Object.entries(BUILT_IN_SCHEMAS)) {
      const existing = await getSchemaByTagName(tagName)
      if (!existing) {
        await createSchema({
          ...schema,
          tagName,
        })
      }
    }

    console.log('[SupertagManager] Initialized with built-in schemas')
    // Note: User tags are NOT auto-migrated to supertags
    // Tags remain lightweight by default and are promoted explicitly

    initialized = true
  } catch (error) {
    console.error('[SupertagManager] Failed to initialize:', error)
  }
}

// ============================================================================
// SCHEMA MANAGEMENT
// ============================================================================

/**
 * Create a new supertag schema
 */
export async function createSchema(
  schema: Omit<SupertagSchema, 'id' | 'createdAt' | 'updatedAt'>
): Promise<SupertagSchema | null> {
  const db = await getDatabase()
  if (!db) return null

  const id = generateId('st')
  const now = new Date().toISOString()

  try {
    await db.run(
      `INSERT INTO supertag_schemas (id, tag_name, display_name, icon, color, description, fields, extends, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        schema.tagName,
        schema.displayName,
        schema.icon || null,
        schema.color || null,
        schema.description || null,
        JSON.stringify(schema.fields),
        schema.extends || null,
        now,
        now,
      ]
    )

    return {
      id,
      ...schema,
      createdAt: now,
      updatedAt: now,
    }
  } catch (error) {
    console.error('[SupertagManager] Failed to create schema:', error)
    return null
  }
}

/**
 * Update a supertag schema
 */
export async function updateSchema(
  id: string,
  updates: Partial<Omit<SupertagSchema, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<boolean> {
  const db = await getDatabase()
  if (!db) return false

  const now = new Date().toISOString()

  try {
    const setClauses: string[] = ['updated_at = ?']
    const values: unknown[] = [now]

    if (updates.tagName !== undefined) {
      setClauses.push('tag_name = ?')
      values.push(updates.tagName)
    }
    if (updates.displayName !== undefined) {
      setClauses.push('display_name = ?')
      values.push(updates.displayName)
    }
    if (updates.icon !== undefined) {
      setClauses.push('icon = ?')
      values.push(updates.icon)
    }
    if (updates.color !== undefined) {
      setClauses.push('color = ?')
      values.push(updates.color)
    }
    if (updates.description !== undefined) {
      setClauses.push('description = ?')
      values.push(updates.description)
    }
    if (updates.fields !== undefined) {
      setClauses.push('fields = ?')
      values.push(JSON.stringify(updates.fields))
    }
    if (updates.extends !== undefined) {
      setClauses.push('extends = ?')
      values.push(updates.extends)
    }

    values.push(id)

    await db.run(
      `UPDATE supertag_schemas SET ${setClauses.join(', ')} WHERE id = ?`,
      values
    )

    return true
  } catch (error) {
    console.error('[SupertagManager] Failed to update schema:', error)
    return false
  }
}

/**
 * Delete a supertag schema
 */
export async function deleteSchema(id: string): Promise<boolean> {
  const db = await getDatabase()
  if (!db) return false

  try {
    // Delete associated field values first
    await db.run('DELETE FROM supertag_field_values WHERE supertag_id = ?', [id])

    // Delete schema
    await db.run('DELETE FROM supertag_schemas WHERE id = ?', [id])

    return true
  } catch (error) {
    console.error('[SupertagManager] Failed to delete schema:', error)
    return false
  }
}

/**
 * Get a schema by ID
 */
export async function getSchema(id: string): Promise<SupertagSchema | null> {
  const db = await getDatabase()
  if (!db) return null

  try {
    const row = await db.get(
      'SELECT * FROM supertag_schemas WHERE id = ?',
      [id]
    ) as {
      id: string
      tag_name: string
      display_name: string
      icon: string | null
      color: string | null
      description: string | null
      fields: string
      extends: string | null
      created_at: string
      updated_at: string
    } | null

    if (!row) return null

    return {
      id: row.id,
      tagName: row.tag_name,
      displayName: row.display_name,
      icon: row.icon || undefined,
      color: row.color || undefined,
      description: row.description || undefined,
      fields: JSON.parse(row.fields),
      extends: row.extends || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  } catch (error) {
    console.error('[SupertagManager] Failed to get schema:', error)
    return null
  }
}

/**
 * Get a schema by tag name
 */
export async function getSchemaByTagName(tagName: string): Promise<SupertagSchema | null> {
  const db = await getDatabase()
  if (!db) return null

  try {
    const row = await db.get(
      'SELECT * FROM supertag_schemas WHERE tag_name = ?',
      [tagName]
    ) as {
      id: string
      tag_name: string
      display_name: string
      icon: string | null
      color: string | null
      description: string | null
      fields: string
      extends: string | null
      created_at: string
      updated_at: string
    } | null

    if (!row) return null

    return {
      id: row.id,
      tagName: row.tag_name,
      displayName: row.display_name,
      icon: row.icon || undefined,
      color: row.color || undefined,
      description: row.description || undefined,
      fields: JSON.parse(row.fields),
      extends: row.extends || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  } catch (error) {
    console.error('[SupertagManager] Failed to get schema by tag name:', error)
    return null
  }
}

/**
 * Get all schemas
 */
export async function getAllSchemas(): Promise<SupertagSchema[]> {
  const db = await getDatabase()
  if (!db) return []

  try {
    const rows = await db.all(
      'SELECT * FROM supertag_schemas ORDER BY display_name'
    ) as Array<{
      id: string
      tag_name: string
      display_name: string
      icon: string | null
      color: string | null
      description: string | null
      fields: string
      extends: string | null
      created_at: string
      updated_at: string
    }>

    return (rows || []).map(row => ({
      id: row.id,
      tagName: row.tag_name,
      displayName: row.display_name,
      icon: row.icon || undefined,
      color: row.color || undefined,
      description: row.description || undefined,
      fields: JSON.parse(row.fields),
      extends: row.extends || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }))
  } catch (error) {
    console.error('[SupertagManager] Failed to get all schemas:', error)
    return []
  }
}

/**
 * Get resolved fields for a schema (including inherited fields)
 */
export async function getResolvedFields(schemaId: string): Promise<SupertagFieldDefinition[]> {
  const schema = await getSchema(schemaId)
  if (!schema) return []

  let fields = [...schema.fields]

  // Recursively add parent fields
  if (schema.extends) {
    const parentSchema = await getSchemaByTagName(schema.extends)
    if (parentSchema) {
      const parentFields = await getResolvedFields(parentSchema.id)
      // Parent fields come first, then child fields (which can override)
      const childFieldNames = new Set(fields.map(f => f.name))
      fields = [
        ...parentFields.filter(f => !childFieldNames.has(f.name)),
        ...fields,
      ]
    }
  }

  // Sort by order
  return fields.sort((a, b) => (a.order ?? 999) - (b.order ?? 999))
}

// ============================================================================
// TAG-TO-SUPERTAG UNIFICATION
// ============================================================================

/**
 * Ensure a tag has an associated supertag schema
 *
 * Every tag should be a supertag with optional fields.
 * If no schema exists for the tag, create one with sensible defaults:
 * - Auto-generated icon based on tag name
 * - Auto-generated color based on tag name hash
 * - Empty fields array (user can add fields later)
 *
 * @param tagName - Tag name without # prefix
 * @returns The existing or newly created schema
 */
export async function ensureTagSchema(tagName: string): Promise<SupertagSchema | null> {
  if (!tagName || typeof tagName !== 'string') return null

  // Normalize tag name (lowercase, trim)
  const normalizedTag = tagName.trim().toLowerCase().replace(/^#/, '')
  if (!normalizedTag) return null

  // Check if schema already exists
  const existing = await getSchemaByTagName(normalizedTag)
  if (existing) return existing

  // Create new schema with sensible defaults
  const schema = await createSchema({
    tagName: normalizedTag,
    displayName: tagToDisplayName(normalizedTag),
    icon: generateTagIcon(normalizedTag),
    color: generateTagColor(normalizedTag),
    description: `Auto-created schema for #${normalizedTag}`,
    fields: [], // No required fields - user can add later
  })

  if (schema) {
    console.log(`[SupertagManager] Created schema for tag: #${normalizedTag}`)
  }

  return schema
}

/**
 * Ensure multiple tags have schemas (batch operation)
 */
export async function ensureTagSchemas(tagNames: string[]): Promise<Map<string, SupertagSchema | null>> {
  const results = new Map<string, SupertagSchema | null>()

  for (const tagName of tagNames) {
    const schema = await ensureTagSchema(tagName)
    results.set(tagName, schema)
  }

  return results
}

/**
 * Migrate all existing tags to supertags
 *
 * Scans strands and planner_tasks tables for all unique tags
 * and creates supertag schemas for any that don't have one.
 */
export async function migrateExistingTags(): Promise<{ migrated: number; skipped: number; errors: string[] }> {
  const db = await getDatabase()
  if (!db) return { migrated: 0, skipped: 0, errors: ['Database not available'] }

  const errors: string[] = []
  const uniqueTags = new Set<string>()

  try {
    // Collect tags from strands table
    const strandRows = await db.all(`
      SELECT tags FROM strands
      WHERE tags IS NOT NULL AND tags != '[]'
    `) as Array<{ tags: string }> | null

    if (strandRows) {
      for (const row of strandRows) {
        try {
          const tags = JSON.parse(row.tags)
          if (Array.isArray(tags)) {
            tags.forEach((tag: string) => {
              if (typeof tag === 'string' && tag.trim()) {
                uniqueTags.add(tag.trim().toLowerCase().replace(/^#/, ''))
              }
            })
          }
        } catch {
          // Skip invalid JSON
        }
      }
    }

    // Collect tags from planner_tasks table
    const taskRows = await db.all(`
      SELECT tags FROM planner_tasks
      WHERE tags IS NOT NULL AND tags != '[]'
    `) as Array<{ tags: string }> | null

    if (taskRows) {
      for (const row of taskRows) {
        try {
          const tags = JSON.parse(row.tags)
          if (Array.isArray(tags)) {
            tags.forEach((tag: string) => {
              if (typeof tag === 'string' && tag.trim()) {
                uniqueTags.add(tag.trim().toLowerCase().replace(/^#/, ''))
              }
            })
          }
        } catch {
          // Skip invalid JSON
        }
      }
    }

    console.log(`[SupertagManager] Found ${uniqueTags.size} unique tags to migrate`)

    let migrated = 0
    let skipped = 0

    // Create schemas for each unique tag
    for (const tag of uniqueTags) {
      try {
        const existing = await getSchemaByTagName(tag)
        if (existing) {
          skipped++
          continue
        }

        const schema = await ensureTagSchema(tag)
        if (schema) {
          migrated++
        } else {
          errors.push(`Failed to create schema for: ${tag}`)
        }
      } catch (err) {
        errors.push(`Error processing tag ${tag}: ${err}`)
      }
    }

    console.log(`[SupertagManager] Migration complete: ${migrated} created, ${skipped} already existed`)
    return { migrated, skipped, errors }
  } catch (error) {
    console.error('[SupertagManager] Migration failed:', error)
    return { migrated: 0, skipped: 0, errors: [`Migration failed: ${error}`] }
  }
}

/**
 * Get a tag's schema info (icon and color)
 * Returns defaults if no schema exists
 */
export async function getTagSchemaInfo(tagName: string): Promise<{ icon: string; color: string; hasSchema: boolean }> {
  const normalized = tagName.trim().toLowerCase().replace(/^#/, '')
  const schema = await getSchemaByTagName(normalized)

  if (schema) {
    return {
      icon: schema.icon || 'Hash',
      color: schema.color || generateTagColor(normalized),
      hasSchema: true,
    }
  }

  // Return generated defaults
  return {
    icon: generateTagIcon(normalized),
    color: generateTagColor(normalized),
    hasSchema: false,
  }
}

/**
 * Get all tags with their schema info
 */
export async function getAllTagsWithSchemas(): Promise<Array<{
  tagName: string
  displayName: string
  icon: string
  color: string
  hasFields: boolean
  usageCount: number
}>> {
  const db = await getDatabase()
  if (!db) return []

  try {
    // Get all schemas (normalize keys to lowercase for consistent comparison)
    const schemas = await getAllSchemas()
    const schemaMap = new Map(schemas.map(s => [s.tagName.toLowerCase(), s]))

    // Get tag usage counts
    const tagCounts = new Map<string, number>()

    const strandRows = await db.all(`
      SELECT tags FROM strands WHERE tags IS NOT NULL AND tags != '[]'
    `) as Array<{ tags: string }> | null

    if (strandRows) {
      for (const row of strandRows) {
        try {
          const tags = JSON.parse(row.tags)
          if (Array.isArray(tags)) {
            tags.forEach((tag: string) => {
              if (typeof tag === 'string' && tag.trim()) {
                const normalized = tag.trim().toLowerCase().replace(/^#/, '')
                tagCounts.set(normalized, (tagCounts.get(normalized) || 0) + 1)
              }
            })
          }
        } catch {
          // Skip invalid JSON
        }
      }
    }

    // Also get tags from planner_tasks
    const taskRows = await db.all(`
      SELECT tags FROM planner_tasks WHERE tags IS NOT NULL AND tags != '[]'
    `) as Array<{ tags: string }> | null

    if (taskRows) {
      for (const row of taskRows) {
        try {
          const tags = JSON.parse(row.tags)
          if (Array.isArray(tags)) {
            tags.forEach((tag: string) => {
              if (typeof tag === 'string' && tag.trim()) {
                const normalized = tag.trim().toLowerCase().replace(/^#/, '')
                tagCounts.set(normalized, (tagCounts.get(normalized) || 0) + 1)
              }
            })
          }
        } catch {
          // Skip invalid JSON
        }
      }
    }

    // Also get tags from strand_blocks (block-level tags)
    const blockRows = await db.all(`
      SELECT tags FROM strand_blocks WHERE tags IS NOT NULL AND tags != '[]'
    `) as Array<{ tags: string }> | null

    if (blockRows) {
      for (const row of blockRows) {
        try {
          const tags = JSON.parse(row.tags)
          if (Array.isArray(tags)) {
            tags.forEach((tag: string) => {
              if (typeof tag === 'string' && tag.trim()) {
                const normalized = tag.trim().toLowerCase().replace(/^#/, '')
                tagCounts.set(normalized, (tagCounts.get(normalized) || 0) + 1)
              }
            })
          }
        } catch {
          // Skip invalid JSON
        }
      }
    }

    // Combine schemas and usage counts
    const allTags: Array<{
      tagName: string
      displayName: string
      icon: string
      color: string
      hasFields: boolean
      usageCount: number
    }> = []

    // Add all schemas
    for (const schema of schemas) {
      allTags.push({
        tagName: schema.tagName,
        displayName: schema.displayName,
        icon: schema.icon || 'Hash',
        color: schema.color || generateTagColor(schema.tagName),
        hasFields: schema.fields.length > 0,
        usageCount: tagCounts.get(schema.tagName.toLowerCase()) || 0,
      })
    }

    // Add any tags that don't have schemas yet
    for (const [tag, count] of tagCounts) {
      if (!schemaMap.has(tag)) {
        allTags.push({
          tagName: tag,
          displayName: tagToDisplayName(tag),
          icon: generateTagIcon(tag),
          color: generateTagColor(tag),
          hasFields: false,
          usageCount: count,
        })
      }
    }

    // Sort by usage count (most used first)
    return allTags.sort((a, b) => b.usageCount - a.usageCount)
  } catch (error) {
    console.error('[SupertagManager] Failed to get tags with schemas:', error)
    return []
  }
}

// ============================================================================
// FIELD VALUE MANAGEMENT
// ============================================================================

/**
 * Set a field value for a block
 */
export async function setFieldValue(
  blockId: string,
  supertagId: string,
  fieldName: string,
  value: unknown
): Promise<SupertagFieldValue | null> {
  const db = await getDatabase()
  if (!db) return null

  const id = generateId('fv')
  const now = new Date().toISOString()

  try {
    // Upsert - update if exists, insert if not
    await db.run(
      `INSERT INTO supertag_field_values (id, block_id, supertag_id, field_name, field_value, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(block_id, supertag_id, field_name) DO UPDATE SET
         field_value = excluded.field_value,
         updated_at = excluded.updated_at`,
      [id, blockId, supertagId, fieldName, JSON.stringify(value), now, now]
    )

    return {
      id,
      blockId,
      supertagId,
      fieldName,
      fieldValue: value,
      createdAt: now,
      updatedAt: now,
    }
  } catch (error) {
    console.error('[SupertagManager] Failed to set field value:', error)
    return null
  }
}

/**
 * Get field values for a block
 */
export async function getFieldValues(
  blockId: string,
  supertagId?: string
): Promise<Record<string, unknown>> {
  const db = await getDatabase()
  if (!db) return {}

  try {
    let query = 'SELECT field_name, field_value FROM supertag_field_values WHERE block_id = ?'
    const params: unknown[] = [blockId]

    if (supertagId) {
      query += ' AND supertag_id = ?'
      params.push(supertagId)
    }

    const rows = await db.all(query, params) as Array<{
      field_name: string
      field_value: string
    }>

    const values: Record<string, unknown> = {}
    for (const row of rows || []) {
      try {
        values[row.field_name] = JSON.parse(row.field_value)
      } catch {
        values[row.field_name] = row.field_value
      }
    }

    return values
  } catch (error) {
    console.error('[SupertagManager] Failed to get field values:', error)
    return {}
  }
}

/**
 * Delete all field values for a block
 */
export async function deleteFieldValues(
  blockId: string,
  supertagId?: string
): Promise<boolean> {
  const db = await getDatabase()
  if (!db) return false

  try {
    let query = 'DELETE FROM supertag_field_values WHERE block_id = ?'
    const params: unknown[] = [blockId]

    if (supertagId) {
      query += ' AND supertag_id = ?'
      params.push(supertagId)
    }

    await db.run(query, params)
    return true
  } catch (error) {
    console.error('[SupertagManager] Failed to delete field values:', error)
    return false
  }
}

// ============================================================================
// BLOCK QUERIES
// ============================================================================

/**
 * Get all blocks with a specific supertag
 */
export async function getBlocksWithSupertag(
  tagName: string,
  options?: {
    limit?: number
    offset?: number
    orderBy?: string
    orderDir?: 'asc' | 'desc'
  }
): Promise<SupertaggedBlock[]> {
  const db = await getDatabase()
  if (!db) return []

  const schema = await getSchemaByTagName(tagName)
  if (!schema) return []

  const limit = options?.limit ?? 50
  const offset = options?.offset ?? 0
  const orderBy = options?.orderBy ?? 'created_at'
  const orderDir = options?.orderDir ?? 'desc'

  try {
    // Get blocks that have field values for this supertag
    const rows = await db.all(
      `SELECT DISTINCT sb.id as block_id, sb.strand_path
       FROM strand_blocks sb
       JOIN supertag_field_values sfv ON sfv.block_id = sb.id
       WHERE sfv.supertag_id = ?
       ORDER BY sb.${orderBy} ${orderDir}
       LIMIT ? OFFSET ?`,
      [schema.id, limit, offset]
    ) as Array<{ block_id: string; strand_path: string }>

    const blocks: SupertaggedBlock[] = []

    for (const row of rows || []) {
      const values = await getFieldValues(row.block_id, schema.id)
      blocks.push({
        blockId: row.block_id,
        strandPath: row.strand_path,
        supertag: schema,
        values,
      })
    }

    return blocks
  } catch (error) {
    console.error('[SupertagManager] Failed to get blocks with supertag:', error)
    return []
  }
}

/**
 * Search blocks by field value
 */
export async function searchByFieldValue(
  tagName: string,
  fieldName: string,
  value: unknown,
  operator: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'contains' = '='
): Promise<SupertaggedBlock[]> {
  const db = await getDatabase()
  if (!db) return []

  const schema = await getSchemaByTagName(tagName)
  if (!schema) return []

  try {
    const valueStr = JSON.stringify(value)

    let whereClause: string
    switch (operator) {
      case '=':
        whereClause = 'sfv.field_value = ?'
        break
      case '!=':
        whereClause = 'sfv.field_value != ?'
        break
      case '>':
        whereClause = 'CAST(sfv.field_value AS REAL) > CAST(? AS REAL)'
        break
      case '<':
        whereClause = 'CAST(sfv.field_value AS REAL) < CAST(? AS REAL)'
        break
      case '>=':
        whereClause = 'CAST(sfv.field_value AS REAL) >= CAST(? AS REAL)'
        break
      case '<=':
        whereClause = 'CAST(sfv.field_value AS REAL) <= CAST(? AS REAL)'
        break
      case 'contains':
        whereClause = 'sfv.field_value LIKE ?'
        break
      default:
        whereClause = 'sfv.field_value = ?'
    }

    const searchValue = operator === 'contains' ? `%${value}%` : valueStr

    const rows = await db.all(
      `SELECT DISTINCT sb.id as block_id, sb.strand_path
       FROM strand_blocks sb
       JOIN supertag_field_values sfv ON sfv.block_id = sb.id
       WHERE sfv.supertag_id = ?
         AND sfv.field_name = ?
         AND ${whereClause}`,
      [schema.id, fieldName, searchValue]
    ) as Array<{ block_id: string; strand_path: string }>

    const blocks: SupertaggedBlock[] = []

    for (const row of rows || []) {
      const values = await getFieldValues(row.block_id, schema.id)
      blocks.push({
        blockId: row.block_id,
        strandPath: row.strand_path,
        supertag: schema,
        values,
      })
    }

    return blocks
  } catch (error) {
    console.error('[SupertagManager] Failed to search by field value:', error)
    return []
  }
}

/**
 * Apply a supertag to a block
 */
export async function applySupertag(
  blockId: string,
  strandPath: string,
  tagName: string,
  initialValues?: Record<string, unknown>
): Promise<boolean> {
  const schema = await getSchemaByTagName(tagName)
  if (!schema) return false

  const db = await getDatabase()
  if (!db) return false

  try {
    // Get resolved fields (including inherited)
    const fields = await getResolvedFields(schema.id)

    // Set default values for all fields
    for (const field of fields) {
      const value = initialValues?.[field.name] ?? field.defaultValue ?? null
      if (value !== null) {
        await setFieldValue(blockId, schema.id, field.name, value)
      }
    }

    // Update block tags to include the supertag
    const block = await db.get(
      'SELECT tags FROM strand_blocks WHERE id = ?',
      [blockId]
    ) as { tags: string } | null

    if (block) {
      const existingTags = block.tags ? JSON.parse(block.tags) : []
      if (!existingTags.includes(`#${tagName}`)) {
        existingTags.push(`#${tagName}`)
        await db.run(
          'UPDATE strand_blocks SET tags = ?, updated_at = ? WHERE id = ?',
          [JSON.stringify(existingTags), new Date().toISOString(), blockId]
        )
      }
    }

    return true
  } catch (error) {
    console.error('[SupertagManager] Failed to apply supertag:', error)
    return false
  }
}

/**
 * Remove a supertag from a block
 */
export async function removeSupertag(
  blockId: string,
  tagName: string
): Promise<boolean> {
  const schema = await getSchemaByTagName(tagName)
  if (!schema) return false

  const db = await getDatabase()
  if (!db) return false

  try {
    // Delete field values
    await deleteFieldValues(blockId, schema.id)

    // Remove from block tags
    const block = await db.get(
      'SELECT tags FROM strand_blocks WHERE id = ?',
      [blockId]
    ) as { tags: string } | null

    if (block) {
      const existingTags = block.tags ? JSON.parse(block.tags) : []
      const filteredTags = existingTags.filter((t: string) => t !== `#${tagName}`)
      await db.run(
        'UPDATE strand_blocks SET tags = ?, updated_at = ? WHERE id = ?',
        [JSON.stringify(filteredTags), new Date().toISOString(), blockId]
      )
    }

    return true
  } catch (error) {
    console.error('[SupertagManager] Failed to remove supertag:', error)
    return false
  }
}

// ============================================================================
// FORMULA EVALUATION
// ============================================================================

/**
 * Evaluate a formula field for a block
 *
 * Formula fields are computed dynamically based on other field values,
 * mentions in the document, and sibling blocks.
 *
 * @param blockId - Block containing the formula field
 * @param supertagId - Supertag schema ID
 * @param fieldName - Name of the formula field
 * @param formula - Formula expression to evaluate
 * @param options - Additional context for evaluation
 */
export async function evaluateFormulaField(
  blockId: string,
  supertagId: string,
  fieldName: string,
  formula: string,
  options?: {
    strandPath?: string
    mentions?: MentionableEntity[]
    siblings?: Array<{ blockId: string; path: string; fields: Record<string, unknown> }>
    settings?: Record<string, unknown>
  }
): Promise<FormulaResult> {
  // Get existing field values for context
  const fields = await getFieldValues(blockId, supertagId)

  // Create formula context
  const context = createFormulaContext({
    currentBlockId: blockId,
    currentStrandPath: options?.strandPath || '',
    fields,
    mentions: options?.mentions || [],
    siblings: options?.siblings || [],
    settings: options?.settings || {},
  })

  // Evaluate the formula
  const result = await evaluateFormula(formula, context)

  // If successful, optionally cache the computed value
  if (result.success && result.value !== undefined) {
    // Store computed value with a special prefix to indicate it's computed
    await setFieldValue(blockId, supertagId, `_computed_${fieldName}`, {
      value: result.value,
      evaluatedAt: new Date().toISOString(),
      formula,
    })
  }

  return result
}

/**
 * Evaluate all formula fields for a block
 *
 * @param blockId - Block to evaluate formulas for
 * @param strandPath - Path to the strand containing the block
 * @param options - Additional context
 */
export async function evaluateAllFormulas(
  blockId: string,
  strandPath: string,
  options?: {
    mentions?: MentionableEntity[]
    siblings?: Array<{ blockId: string; path: string; fields: Record<string, unknown> }>
    settings?: Record<string, unknown>
  }
): Promise<Record<string, FormulaResult>> {
  const db = await getDatabase()
  if (!db) return {}

  const results: Record<string, FormulaResult> = {}

  try {
    // Get all supertags applied to this block
    const fieldValueRows = await db.all(
      `SELECT DISTINCT supertag_id FROM supertag_field_values WHERE block_id = ?`,
      [blockId]
    ) as Array<{ supertag_id: string }>

    for (const row of fieldValueRows || []) {
      const schema = await getSchema(row.supertag_id)
      if (!schema) continue

      // Get resolved fields including inherited ones
      const fields = await getResolvedFields(schema.id)

      // Find formula fields
      const formulaFields = fields.filter(f => f.type === 'formula' && f.formula)

      for (const field of formulaFields) {
        if (field.formula) {
          const result = await evaluateFormulaField(
            blockId,
            schema.id,
            field.name,
            field.formula,
            {
              strandPath,
              mentions: options?.mentions,
              siblings: options?.siblings,
              settings: options?.settings,
            }
          )
          results[`${schema.tagName}.${field.name}`] = result
        }
      }
    }

    return results
  } catch (error) {
    console.error('[SupertagManager] Failed to evaluate all formulas:', error)
    return results
  }
}

/**
 * Get computed values for a block (previously evaluated formulas)
 *
 * @param blockId - Block to get computed values for
 * @param supertagId - Optional: filter by specific supertag
 */
export async function getComputedValues(
  blockId: string,
  supertagId?: string
): Promise<Record<string, { value: unknown; evaluatedAt: string; formula: string }>> {
  const db = await getDatabase()
  if (!db) return {}

  try {
    let query = `SELECT field_name, field_value FROM supertag_field_values 
                 WHERE block_id = ? AND field_name LIKE '_computed_%'`
    const params: unknown[] = [blockId]

    if (supertagId) {
      query += ' AND supertag_id = ?'
      params.push(supertagId)
    }

    const rows = await db.all(query, params) as Array<{
      field_name: string
      field_value: string
    }>

    const computed: Record<string, { value: unknown; evaluatedAt: string; formula: string }> = {}

    for (const row of rows || []) {
      const fieldName = row.field_name.replace('_computed_', '')
      try {
        computed[fieldName] = JSON.parse(row.field_value)
      } catch {
        // Skip invalid JSON
      }
    }

    return computed
  } catch (error) {
    console.error('[SupertagManager] Failed to get computed values:', error)
    return {}
  }
}

/**
 * Create a formula context for a block
 *
 * This is useful when you want to manually evaluate formulas with
 * full context from the block and its surrounding document.
 */
export async function createBlockFormulaContext(
  blockId: string,
  supertagId: string,
  strandPath: string,
  options?: {
    mentions?: MentionableEntity[]
    siblings?: Array<{ blockId: string; path: string; fields: Record<string, unknown> }>
    settings?: Record<string, unknown>
  }
): Promise<FormulaContext> {
  const fields = await getFieldValues(blockId, supertagId)

  return createFormulaContext({
    currentBlockId: blockId,
    currentStrandPath: strandPath,
    fields,
    mentions: options?.mentions || [],
    siblings: options?.siblings || [],
    settings: options?.settings || {},
  })
}

/**
 * Add a formula field to an existing supertag schema
 *
 * @param schemaId - Schema to add field to
 * @param fieldDef - Field definition including formula
 */
export async function addFormulaField(
  schemaId: string,
  fieldDef: {
    name: string
    label: string
    formula: string
    description?: string
  }
): Promise<boolean> {
  const schema = await getSchema(schemaId)
  if (!schema) return false

  // Add the new formula field
  const newField: SupertagFieldDefinition = {
    name: fieldDef.name,
    label: fieldDef.label,
    type: 'formula',
    formula: fieldDef.formula,
    description: fieldDef.description,
    required: false, // Formula fields are never required (they're computed)
    order: schema.fields.length,
  }

  const updatedFields = [...schema.fields, newField]

  return updateSchema(schemaId, { fields: updatedFields })
}

/**
 * Validate a formula expression
 *
 * Checks if the formula syntax is valid without actually evaluating it.
 *
 * @param formula - Formula expression to validate
 * @returns Validation result with any errors
 */
export async function validateFormula(formula: string): Promise<{
  valid: boolean
  error?: string
  dependencies?: string[]
}> {
  try {
    const { parseFormula } = await import('@/lib/formulas')
    const parsed = parseFormula(formula)

    return {
      valid: true,
      dependencies: parsed.dependencies,
    }
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Unknown parsing error',
    }
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  BUILT_IN_SCHEMAS,
  DEFAULT_SUPERTAG_CONFIG,
} from './types'

export type {
  SupertagSchema,
  SupertagFieldValue,
  SupertagFieldDefinition,
  SupertaggedBlock,
  SupertagConfig,
  SupertagFieldType,
  BuiltInSupertag,
} from './types'
