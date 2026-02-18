
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Generate a unique ID with optional prefix
 */
export function generateId(prefix = 'id'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

/**
 * Minimum length for tags, subjects, topics
 * Tags with fewer characters are filtered out
 */
export const MIN_TAG_LENGTH = 2

/**
 * Normalize and validate tags from various input formats
 * - Handles string or string[] input
 * - Splits comma-separated strings
 * - Trims whitespace
 * - Lowercases (optional)
 * - Filters out empty and short tags (< MIN_TAG_LENGTH)
 */
export function normalizeTags(
  tags: string | string[] | undefined | null,
  options: { lowercase?: boolean; minLength?: number } = {}
): string[] {
  const { lowercase = true, minLength = MIN_TAG_LENGTH } = options

  if (!tags) return []

  // Convert to array
  let tagArray: string[]
  if (typeof tags === 'string') {
    // Split by comma
    tagArray = tags.split(',')
  } else if (Array.isArray(tags)) {
    tagArray = tags
  } else {
    return []
  }

  // Process each tag
  return tagArray
    .map(t => {
      const trimmed = String(t).trim()
      return lowercase ? trimmed.toLowerCase() : trimmed
    })
    .filter(t => t.length >= minLength)
}

/**
 * Parse tags from unknown metadata value
 * Handles edge cases like numbers, objects, undefined
 */
export function parseTags(
  tags: unknown,
  options: { lowercase?: boolean; minLength?: number } = {}
): string[] {
  if (!tags) return []

  if (typeof tags === 'string') {
    return normalizeTags(tags, options)
  }

  if (Array.isArray(tags)) {
    return normalizeTags(
      tags.map(t => String(t)),
      options
    )
  }

  // Single value that's not string/array - convert to string
  if (typeof tags === 'number' || typeof tags === 'boolean') {
    const str = String(tags)
    return str.length >= (options.minLength ?? MIN_TAG_LENGTH) ? [str] : []
  }

  return []
}
