/**
 * Supernote Validation
 * @module lib/supernotes/validation
 *
 * Validation utilities for supernotes, ensuring they meet requirements
 * (primarily: must have at least one supertag).
 */

import type {
  SupernoteSchema,
  Supernote,
  CreateSupernoteInput,
  SupernoteCardSize,
} from './types'
import { CARD_SIZE_PRESETS } from './types'
import { getSchemaByTagName } from '@/lib/supertags/supertagManager'

// ============================================================================
// VALIDATION ERRORS
// ============================================================================

export interface SupernoteValidationError {
  field: string
  message: string
  code: 'REQUIRED' | 'INVALID' | 'NOT_FOUND' | 'CONSTRAINT'
}

export interface SupernoteValidationResult {
  isValid: boolean
  errors: SupernoteValidationError[]
  warnings: string[]
}

// ============================================================================
// CORE VALIDATION
// ============================================================================

/**
 * Validate that a supernote has all required fields
 */
export function validateSupernoteSchema(
  schema: Partial<SupernoteSchema>
): SupernoteValidationResult {
  const errors: SupernoteValidationError[] = []
  const warnings: string[] = []

  // isSupernote must be true
  if (schema.isSupernote !== true) {
    errors.push({
      field: 'isSupernote',
      message: 'Supernote schema must have isSupernote: true',
      code: 'REQUIRED',
    })
  }

  // primarySupertag is required
  if (!schema.primarySupertag || schema.primarySupertag.trim() === '') {
    errors.push({
      field: 'primarySupertag',
      message: 'Supernotes must have a primary supertag',
      code: 'REQUIRED',
    })
  }

  // cardSize is required
  if (!schema.cardSize) {
    errors.push({
      field: 'cardSize',
      message: 'Card size is required',
      code: 'REQUIRED',
    })
  }

  // If custom size, dimensions must be provided
  if (schema.cardSize === 'custom') {
    if (!schema.customDimensions) {
      errors.push({
        field: 'customDimensions',
        message: 'Custom dimensions required when cardSize is "custom"',
        code: 'REQUIRED',
      })
    } else {
      if (schema.customDimensions.width < 100 || schema.customDimensions.width > 800) {
        errors.push({
          field: 'customDimensions.width',
          message: 'Width must be between 100 and 800 pixels',
          code: 'CONSTRAINT',
        })
      }
      if (schema.customDimensions.height < 80 || schema.customDimensions.height > 600) {
        errors.push({
          field: 'customDimensions.height',
          message: 'Height must be between 80 and 600 pixels',
          code: 'CONSTRAINT',
        })
      }
    }
  }

  // Warn if no style specified
  if (!schema.style) {
    warnings.push('No style specified, will use default "paper" style')
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Validate supernote creation input
 */
export function validateCreateSupernoteInput(
  input: Partial<CreateSupernoteInput>
): SupernoteValidationResult {
  const errors: SupernoteValidationError[] = []
  const warnings: string[] = []

  // Title is required
  if (!input.title || input.title.trim() === '') {
    errors.push({
      field: 'title',
      message: 'Title is required',
      code: 'REQUIRED',
    })
  } else if (input.title.length > 200) {
    errors.push({
      field: 'title',
      message: 'Title must be 200 characters or less',
      code: 'CONSTRAINT',
    })
  }

  // Primary supertag is required
  if (!input.primarySupertag || input.primarySupertag.trim() === '') {
    errors.push({
      field: 'primarySupertag',
      message: 'A supertag is required for supernotes',
      code: 'REQUIRED',
    })
  }

  // Content length warning (supernotes should be concise)
  if (input.content && input.content.length > 2000) {
    warnings.push(
      'Content is quite long for a supernote. Consider using a regular strand for detailed content.'
    )
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Validate that a supertag exists in the system
 */
export async function validateSupertagExists(
  tagName: string
): Promise<SupernoteValidationResult> {
  const errors: SupernoteValidationError[] = []
  const warnings: string[] = []

  try {
    const schema = await getSchemaByTagName(tagName)
    if (!schema) {
      errors.push({
        field: 'primarySupertag',
        message: `Supertag "${tagName}" not found. Create it first or choose an existing one.`,
        code: 'NOT_FOUND',
      })
    }
  } catch (error) {
    errors.push({
      field: 'primarySupertag',
      message: `Failed to validate supertag: ${error}`,
      code: 'INVALID',
    })
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  }
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Check if a strand schema indicates it's a supernote
 */
export function isSupernoteSchema(schema: unknown): schema is SupernoteSchema {
  if (!schema || typeof schema !== 'object') return false
  const s = schema as Record<string, unknown>
  return s.isSupernote === true && typeof s.primarySupertag === 'string'
}

/**
 * Check if strand frontmatter indicates a supernote
 */
export function isSupernoteFromFrontmatter(
  frontmatter: Record<string, unknown>
): boolean {
  return (
    frontmatter.isSupernote === true ||
    frontmatter.strandType === 'supernote' ||
    (typeof frontmatter.supernote === 'object' && 
     frontmatter.supernote !== null &&
     (frontmatter.supernote as Record<string, unknown>).isSupernote === true)
  )
}

/**
 * Check if a strand path looks like a supernote (by convention)
 * Supernotes are stored in a special directory or have a marker in filename
 */
export function isSupernoteByPath(path: string): boolean {
  // Supernotes stored in .supernotes/ directory
  if (path.includes('/.supernotes/') || path.startsWith('.supernotes/')) {
    return true
  }
  // Or files with .supernote.md extension
  if (path.endsWith('.supernote.md')) {
    return true
  }
  return false
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get card dimensions for a given size preset
 */
export function getCardDimensions(
  cardSize: SupernoteCardSize,
  customDimensions?: { width: number; height: number }
): { width: number; height: number } {
  if (cardSize === 'custom' && customDimensions) {
    return customDimensions
  }

  const preset = CARD_SIZE_PRESETS[cardSize as keyof typeof CARD_SIZE_PRESETS]
  
  if (!preset) {
    // Default to 3x5
    return { width: 320, height: 200 }
  }
  
  return { width: preset.width, height: preset.height }
}

/**
 * Extract supernote schema from strand frontmatter
 */
export function extractSupernoteSchema(
  frontmatter: Record<string, unknown>
): SupernoteSchema | null {
  // Check various frontmatter formats
  
  // Format 1: Direct supernote fields
  if (frontmatter.isSupernote === true && frontmatter.primarySupertag) {
    return {
      isSupernote: true,
      primarySupertag: frontmatter.primarySupertag as string,
      additionalSupertags: frontmatter.additionalSupertags as string[] | undefined,
      cardSize: (frontmatter.cardSize as SupernoteCardSize) || '3x5',
      customDimensions: frontmatter.customDimensions as { width: number; height: number } | undefined,
      style: frontmatter.supernoteStyle as SupernoteSchema['style'],
      parentSupernoteId: frontmatter.parentSupernoteId as string | undefined,
      colorOverride: frontmatter.colorOverride as string | undefined,
    }
  }
  
  // Format 2: strandType: 'supernote' with supertags array
  if (frontmatter.strandType === 'supernote') {
    const supertags = frontmatter.supertags as string[] | undefined
    if (!supertags || supertags.length === 0) {
      return null // Invalid: supernote without supertag
    }
    return {
      isSupernote: true,
      primarySupertag: supertags[0],
      additionalSupertags: supertags.slice(1),
      cardSize: (frontmatter.cardSize as SupernoteCardSize) || '3x5',
      customDimensions: frontmatter.customDimensions as { width: number; height: number } | undefined,
      style: frontmatter.supernoteStyle as SupernoteSchema['style'],
      parentSupernoteId: frontmatter.parentSupernoteId as string | undefined,
      colorOverride: frontmatter.colorOverride as string | undefined,
    }
  }
  
  // Format 3: Nested supernote object
  if (typeof frontmatter.supernote === 'object' && frontmatter.supernote !== null) {
    const sn = frontmatter.supernote as Record<string, unknown>
    if (sn.isSupernote === true && sn.primarySupertag) {
      return sn as unknown as SupernoteSchema
    }
  }
  
  return null
}

/**
 * Generate frontmatter for a new supernote
 */
export function generateSupernoteFrontmatter(
  input: CreateSupernoteInput
): Record<string, unknown> {
  return {
    title: input.title,
    strandType: 'supernote',
    isSupernote: true,
    primarySupertag: input.primarySupertag,
    cardSize: input.cardSize || '3x5',
    supernoteStyle: input.style || 'paper',
    tags: input.tags || [],
    ...(input.parentSupernoteId && { parentSupernoteId: input.parentSupernoteId }),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

