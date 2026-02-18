/**
 * Transform Service
 * @module lib/transform/transformService
 *
 * Orchestrates strand transformation workflows:
 * - Filter strands by tags, dates, search
 * - Extract field values from content
 * - Apply supertags with extracted values
 * - Execute post-transform actions
 */

import type { SelectedStrand } from '@/components/quarry/contexts/SelectedStrandsContext'
import type { SupertagSchema } from '@/lib/supertags/types'
import type {
  TransformConfig,
  TransformFilters,
  TransformResult,
  BatchTransformResult,
  ExtractedFieldValue,
  TransformPostAction,
  FieldMappingConfig,
} from './types'
import { extractFieldsFromStrand, suggestFieldMappings } from './contentExtractor'
import {
  getSchemaByTagName,
  getAllSchemas,
  setFieldValue,
  getResolvedFields,
} from '@/lib/supertags/supertagManager'
import { getDatabase } from '@/lib/codexDatabase'
import { generateId } from '@/lib/utils'

// ============================================================================
// MAIN TRANSFORM FUNCTIONS
// ============================================================================

/**
 * Transform strands to structured supertag data
 *
 * @param strands - Strands to transform
 * @param config - Transformation configuration
 * @returns Batch result with individual strand results
 */
export async function transformStrands(
  strands: SelectedStrand[],
  config: TransformConfig
): Promise<BatchTransformResult> {
  const startTime = performance.now()
  const results: TransformResult[] = []
  const warnings: string[] = []

  // Apply filters first
  const filteredStrands = applyFilters(strands, config.filters)

  if (filteredStrands.length === 0) {
    return {
      total: strands.length,
      successful: 0,
      failed: 0,
      skipped: strands.length,
      results: [],
      duration: performance.now() - startTime,
      warnings: ['No strands matched the filter criteria'],
    }
  }

  // Process each strand
  for (const strand of filteredStrands) {
    try {
      const result = await transformSingleStrand(strand, config)
      results.push(result)

      if (result.warnings?.length) {
        warnings.push(...result.warnings.map((w) => `${strand.title}: ${w}`))
      }
    } catch (error) {
      results.push({
        strandId: strand.id,
        strandPath: strand.path,
        strandTitle: strand.title,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        extractedValues: {},
      })
    }
  }

  const successful = results.filter((r) => r.success).length
  const failed = results.filter((r) => !r.success).length
  const skipped = strands.length - filteredStrands.length

  return {
    total: strands.length,
    successful,
    failed,
    skipped,
    results,
    duration: performance.now() - startTime,
    warnings: warnings.length > 0 ? warnings : undefined,
  }
}

/**
 * Preview transformation without applying changes
 *
 * @param strands - Strands to preview
 * @param config - Transformation configuration
 * @returns Preview results showing what would be extracted
 */
export async function previewTransformation(
  strands: SelectedStrand[],
  config: TransformConfig
): Promise<TransformResult[]> {
  const filteredStrands = applyFilters(strands, config.filters)
  const results: TransformResult[] = []

  for (const strand of filteredStrands) {
    try {
      // Extract field values without applying
      const extractedValues = await extractFieldsWithMappings(
        strand,
        config.targetSupertag,
        config.fieldMappings,
        config.extractionOptions
      )

      results.push({
        strandId: strand.id,
        strandPath: strand.path,
        strandTitle: strand.title,
        success: true,
        extractedValues,
        appliedSupertag: config.targetSupertag.tagName,
        appliedValues: Object.fromEntries(
          Object.entries(extractedValues).map(([k, v]) => [k, v.value])
        ),
      })
    } catch (error) {
      results.push({
        strandId: strand.id,
        strandPath: strand.path,
        strandTitle: strand.title,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        extractedValues: {},
      })
    }
  }

  return results
}

/**
 * Transform a single strand
 */
async function transformSingleStrand(
  strand: SelectedStrand,
  config: TransformConfig
): Promise<TransformResult> {
  const warnings: string[] = []

  // Extract field values using mappings
  const extractedValues = await extractFieldsWithMappings(
    strand,
    config.targetSupertag,
    config.fieldMappings,
    config.extractionOptions
  )

  // Check for low-confidence extractions
  for (const [fieldName, extracted] of Object.entries(extractedValues)) {
    if (extracted.confidence < 0.5 && extracted.value !== undefined) {
      warnings.push(`Low confidence (${Math.round(extracted.confidence * 100)}%) for field: ${fieldName}`)
    }
  }

  // Skip application if preview only
  if (config.previewOnly) {
    return {
      strandId: strand.id,
      strandPath: strand.path,
      strandTitle: strand.title,
      success: true,
      extractedValues,
      appliedSupertag: config.targetSupertag.tagName,
      appliedValues: Object.fromEntries(
        Object.entries(extractedValues).map(([k, v]) => [k, v.value])
      ),
      warnings: warnings.length > 0 ? warnings : undefined,
    }
  }

  // Apply supertag with extracted values
  const appliedValues = Object.fromEntries(
    Object.entries(extractedValues)
      .filter(([, v]) => v.value !== undefined)
      .map(([k, v]) => [k, v.value])
  )

  const applied = await applySupertagToStrand(
    strand,
    config.targetSupertag,
    appliedValues
  )

  if (!applied) {
    return {
      strandId: strand.id,
      strandPath: strand.path,
      strandTitle: strand.title,
      success: false,
      error: 'Failed to apply supertag',
      extractedValues,
    }
  }

  // Execute post-actions
  const executedActions: TransformPostAction[] = []
  for (const action of config.postActions) {
    try {
      await executePostAction(strand, action)
      executedActions.push(action)
    } catch (error) {
      warnings.push(`Failed to execute action ${action.type}: ${error}`)
    }
  }

  return {
    strandId: strand.id,
    strandPath: strand.path,
    strandTitle: strand.title,
    success: true,
    extractedValues,
    appliedSupertag: config.targetSupertag.tagName,
    appliedValues,
    executedActions,
    warnings: warnings.length > 0 ? warnings : undefined,
  }
}

// ============================================================================
// FILTER FUNCTIONS
// ============================================================================

/**
 * Apply filters to strand selection
 */
export function applyFilters(
  strands: SelectedStrand[],
  filters: TransformFilters
): SelectedStrand[] {
  let result = [...strands]

  // Filter by tags
  if (filters.tags && filters.tags.length > 0) {
    result = filterByTags(result, filters.tags, filters.tagMatchMode || 'any')
  }

  // Filter by search query
  if (filters.searchQuery) {
    result = filterBySearch(result, filters.searchQuery)
  }

  // Filter by excluded paths
  if (filters.excludePaths && filters.excludePaths.length > 0) {
    result = result.filter(
      (s) => !filters.excludePaths!.some((p) => s.path.startsWith(p))
    )
  }

  // Filter by status (requires content parsing)
  if (filters.status && filters.status.length > 0) {
    result = filterByStatus(result, filters.status)
  }

  // Filter by difficulty
  if (filters.difficulty && filters.difficulty.length > 0) {
    result = filterByDifficulty(result, filters.difficulty)
  }

  return result
}

/**
 * Filter strands by tags
 */
function filterByTags(
  strands: SelectedStrand[],
  tags: string[],
  matchMode: 'any' | 'all' | 'none'
): SelectedStrand[] {
  const normalizedTags = tags.map((t) => t.toLowerCase().replace(/^#/, ''))

  return strands.filter((strand) => {
    const strandTags = (strand.tags || []).map((t) =>
      t.toLowerCase().replace(/^#/, '')
    )

    switch (matchMode) {
      case 'any':
        return normalizedTags.some((t) => strandTags.includes(t))
      case 'all':
        return normalizedTags.every((t) => strandTags.includes(t))
      case 'none':
        return !normalizedTags.some((t) => strandTags.includes(t))
      default:
        return true
    }
  })
}

/**
 * Filter strands by search query
 */
function filterBySearch(
  strands: SelectedStrand[],
  query: string
): SelectedStrand[] {
  const lowerQuery = query.toLowerCase()

  return strands.filter((strand) => {
    const searchable = [
      strand.title,
      strand.content || '',
      ...(strand.tags || []),
      ...(strand.subjects || []),
      ...(strand.topics || []),
    ]
      .join(' ')
      .toLowerCase()

    return searchable.includes(lowerQuery)
  })
}

/**
 * Filter strands by status from frontmatter
 */
function filterByStatus(
  strands: SelectedStrand[],
  statuses: ('draft' | 'published' | 'archived')[]
): SelectedStrand[] {
  return strands.filter((strand) => {
    // Check frontmatter for status
    const content = strand.content || ''
    const statusMatch = content.match(/^---[\s\S]*?status:\s*(\w+)[\s\S]*?---/m)
    if (statusMatch) {
      return statuses.includes(statusMatch[1].toLowerCase() as 'draft' | 'published' | 'archived')
    }
    // Default to draft if no status
    return statuses.includes('draft')
  })
}

/**
 * Filter strands by difficulty from frontmatter
 */
function filterByDifficulty(
  strands: SelectedStrand[],
  difficulties: ('beginner' | 'intermediate' | 'advanced')[]
): SelectedStrand[] {
  return strands.filter((strand) => {
    const content = strand.content || ''
    const diffMatch = content.match(/^---[\s\S]*?difficulty:\s*(\w+)[\s\S]*?---/m)
    if (diffMatch) {
      return difficulties.includes(
        diffMatch[1].toLowerCase() as 'beginner' | 'intermediate' | 'advanced'
      )
    }
    return false
  })
}

// ============================================================================
// EXTRACTION HELPERS
// ============================================================================

/**
 * Extract fields using custom mappings
 */
async function extractFieldsWithMappings(
  strand: SelectedStrand,
  schema: SupertagSchema,
  mappings: FieldMappingConfig[],
  options?: TransformConfig['extractionOptions']
): Promise<Record<string, ExtractedFieldValue>> {
  // First do automatic extraction
  const autoExtracted = await extractFieldsFromStrand(strand, schema, options)

  // Apply custom mappings
  for (const mapping of mappings) {
    if (mapping.skip) {
      delete autoExtracted[mapping.fieldName]
      continue
    }

    // Manual value override
    if (mapping.manualValue !== undefined) {
      autoExtracted[mapping.fieldName] = {
        fieldName: mapping.fieldName,
        value: mapping.manualValue,
        confidence: 1.0,
        source: 'manual',
        preview: String(mapping.manualValue),
      }
      continue
    }

    // Apply default if no value extracted
    if (
      (autoExtracted[mapping.fieldName]?.value === undefined ||
        autoExtracted[mapping.fieldName]?.confidence < 0.3) &&
      mapping.defaultValue !== undefined
    ) {
      autoExtracted[mapping.fieldName] = {
        fieldName: mapping.fieldName,
        value: mapping.defaultValue,
        confidence: 0.5,
        source: 'manual',
        preview: String(mapping.defaultValue),
      }
    }
  }

  return autoExtracted
}

// ============================================================================
// SUPERTAG APPLICATION
// ============================================================================

/**
 * Apply supertag to a strand
 * Creates field values and updates strand metadata
 */
async function applySupertagToStrand(
  strand: SelectedStrand,
  schema: SupertagSchema,
  values: Record<string, unknown>
): Promise<boolean> {
  const db = await getDatabase()
  if (!db) return false

  try {
    // Get or create a block ID for this strand
    const blockId = await getOrCreateStrandBlock(strand)
    if (!blockId) return false

    // Get resolved fields
    const fields = await getResolvedFields(schema.id)

    // Set field values
    for (const field of fields) {
      const value = values[field.name] ?? field.defaultValue ?? null
      if (value !== null && value !== undefined) {
        await setFieldValue(blockId, schema.id, field.name, value)
      }
    }

    // Update strand tags to include supertag
    await updateStrandTags(strand.path, schema.tagName, 'add')

    return true
  } catch (error) {
    console.error('[TransformService] Failed to apply supertag:', error)
    return false
  }
}

/**
 * Get or create a block ID for a strand
 */
async function getOrCreateStrandBlock(strand: SelectedStrand): Promise<string | null> {
  const db = await getDatabase()
  if (!db) return null

  try {
    // Check if block exists
    const existing = await db.get(
      'SELECT id FROM strand_blocks WHERE strand_path = ? AND block_type = ?',
      [strand.path, 'root']
    ) as { id: string } | null

    if (existing) return existing.id

    // Create new block
    const id = generateId('sb')
    const now = new Date().toISOString()

    await db.run(
      `INSERT INTO strand_blocks (id, strand_path, block_type, content, tags, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, strand.path, 'root', strand.content || '', JSON.stringify(strand.tags || []), now, now]
    )

    return id
  } catch (error) {
    console.error('[TransformService] Failed to get/create strand block:', error)
    return null
  }
}

/**
 * Update strand tags (add or remove)
 */
async function updateStrandTags(
  strandPath: string,
  tag: string,
  action: 'add' | 'remove'
): Promise<boolean> {
  const db = await getDatabase()
  if (!db) return false

  try {
    const strand = await db.get(
      'SELECT tags FROM strands WHERE path = ?',
      [strandPath]
    ) as { tags: string } | null

    if (!strand) return false

    let tags: string[] = []
    try {
      tags = JSON.parse(strand.tags || '[]')
    } catch {
      tags = []
    }

    const normalizedTag = `#${tag.replace(/^#/, '')}`

    if (action === 'add' && !tags.includes(normalizedTag)) {
      tags.push(normalizedTag)
    } else if (action === 'remove') {
      tags = tags.filter((t) => t !== normalizedTag)
    }

    await db.run(
      'UPDATE strands SET tags = ?, updated_at = ? WHERE path = ?',
      [JSON.stringify(tags), new Date().toISOString(), strandPath]
    )

    return true
  } catch (error) {
    console.error('[TransformService] Failed to update strand tags:', error)
    return false
  }
}

// ============================================================================
// POST-ACTIONS
// ============================================================================

/**
 * Execute a post-transform action
 */
async function executePostAction(
  strand: SelectedStrand,
  action: TransformPostAction
): Promise<void> {
  const db = await getDatabase()
  if (!db) return

  switch (action.type) {
    case 'addTag':
      await updateStrandTags(strand.path, action.tag, 'add')
      break

    case 'removeTag':
      await updateStrandTags(strand.path, action.tag, 'remove')
      break

    case 'setStatus':
      await updateStrandStatus(strand.path, action.status)
      break

    case 'archive':
      await updateStrandStatus(strand.path, 'archived')
      break

    case 'moveTo':
      // Moving strands requires file system operations
      console.warn('[TransformService] moveTo action not yet implemented')
      break

    case 'link':
      // Create a link relationship between strands
      console.warn('[TransformService] link action not yet implemented')
      break
  }
}

/**
 * Update strand status in frontmatter
 */
async function updateStrandStatus(
  strandPath: string,
  status: 'draft' | 'published' | 'archived'
): Promise<boolean> {
  const db = await getDatabase()
  if (!db) return false

  try {
    await db.run(
      'UPDATE strands SET status = ?, updated_at = ? WHERE path = ?',
      [status, new Date().toISOString(), strandPath]
    )
    return true
  } catch (error) {
    console.error('[TransformService] Failed to update strand status:', error)
    return false
  }
}

// ============================================================================
// BATCH OPERATIONS
// ============================================================================

/**
 * Batch apply supertag to multiple strands
 *
 * @param strands - Strands to apply supertag to
 * @param tagName - Supertag to apply
 * @param defaultValues - Default values for all strands
 * @returns Batch result
 */
export async function batchApplySupertag(
  strands: SelectedStrand[],
  tagName: string,
  defaultValues?: Record<string, unknown>
): Promise<BatchTransformResult> {
  const startTime = performance.now()
  const schema = await getSchemaByTagName(tagName)

  if (!schema) {
    return {
      total: strands.length,
      successful: 0,
      failed: strands.length,
      skipped: 0,
      results: strands.map((s) => ({
        strandId: s.id,
        strandPath: s.path,
        strandTitle: s.title,
        success: false,
        error: `Schema not found for tag: ${tagName}`,
        extractedValues: {},
      })),
      duration: performance.now() - startTime,
    }
  }

  const results: TransformResult[] = []

  for (const strand of strands) {
    try {
      // Extract fields from content
      const extractedValues = await extractFieldsFromStrand(strand, schema)

      // Merge with default values
      const appliedValues = {
        ...defaultValues,
        ...Object.fromEntries(
          Object.entries(extractedValues)
            .filter(([, v]) => v.value !== undefined && v.confidence >= 0.3)
            .map(([k, v]) => [k, v.value])
        ),
      }

      // Apply supertag
      const success = await applySupertagToStrand(strand, schema, appliedValues)

      results.push({
        strandId: strand.id,
        strandPath: strand.path,
        strandTitle: strand.title,
        success,
        error: success ? undefined : 'Failed to apply supertag',
        extractedValues,
        appliedSupertag: schema.tagName,
        appliedValues: success ? appliedValues : undefined,
      })
    } catch (error) {
      results.push({
        strandId: strand.id,
        strandPath: strand.path,
        strandTitle: strand.title,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        extractedValues: {},
      })
    }
  }

  const successful = results.filter((r) => r.success).length

  return {
    total: strands.length,
    successful,
    failed: strands.length - successful,
    skipped: 0,
    results,
    duration: performance.now() - startTime,
  }
}

/**
 * Batch remove supertag from multiple strands
 */
export async function batchRemoveSupertag(
  strands: SelectedStrand[],
  tagName: string
): Promise<{ successful: number; failed: number }> {
  let successful = 0
  let failed = 0

  for (const strand of strands) {
    const result = await updateStrandTags(strand.path, tagName, 'remove')
    if (result) {
      successful++
    } else {
      failed++
    }
  }

  return { successful, failed }
}

// ============================================================================
// UTILITY EXPORTS
// ============================================================================

/**
 * Get all available supertag schemas for transformation
 */
export async function getAvailableSupertagSchemas(): Promise<SupertagSchema[]> {
  return getAllSchemas()
}

/**
 * Get suggested field mappings for a schema
 */
export function getSuggestedMappings(
  schema: SupertagSchema,
  sampleStrands: SelectedStrand[]
): FieldMappingConfig[] {
  return suggestFieldMappings(schema, sampleStrands)
}

/**
 * Create a default transform config for a schema
 */
export function createDefaultTransformConfig(
  schema: SupertagSchema,
  strands: SelectedStrand[]
): TransformConfig {
  return {
    targetSupertag: schema,
    fieldMappings: suggestFieldMappings(schema, strands),
    filters: {},
    postActions: [],
    previewOnly: true,
  }
}
