/**
 * Content Extractor Service
 * @module lib/transform/contentExtractor
 *
 * Extracts structured field values from strand content for transformation.
 * Reuses patterns from taskParser and adds more extraction capabilities.
 */

import type { SelectedStrand } from '@/components/quarry/contexts/SelectedStrandsContext'
import type {
  SupertagSchema,
  SupertagFieldDefinition,
  SupertagFieldType,
} from '@/lib/supertags/types'
import type {
  ExtractedFieldValue,
  ExtractionSource,
  ExtractionOptions,
  FieldMappingConfig,
} from './types'
import {
  detectPriority,
  parseNaturalDate,
  extractTasks,
  countCheckboxes,
} from '@/lib/planner/taskParser'
import { format } from 'date-fns'

// ============================================================================
// REGEX PATTERNS
// ============================================================================

/** Match @mention patterns like @john or @"John Doe" */
const MENTION_PATTERN = /@(?:"([^"]+)"|(\w+))/g

/** Match #hashtag patterns */
const HASHTAG_PATTERN = /#(\w+)/g

/** Match email addresses */
const EMAIL_PATTERN = /[\w.-]+@[\w.-]+\.\w+/g

/** Match URLs */
const URL_PATTERN = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/g

/** Match phone numbers (various formats) */
const PHONE_PATTERN = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g

/** Match date patterns in content (e.g., "Date: 2024-01-15") */
const DATE_LABEL_PATTERN = /(?:date|when|on|scheduled)[:\s]+([^\n,]+)/gi

/** Match attendees section */
const ATTENDEES_PATTERN = /(?:attendees?|participants?|with)[:\s]+([^\n]+)/gi

/** Match status keywords */
const STATUS_KEYWORDS: Record<string, string[]> = {
  todo: ['todo', 'to do', 'to-do', 'not started', 'pending', 'waiting'],
  in_progress: ['in progress', 'in-progress', 'working', 'started', 'doing', 'wip'],
  blocked: ['blocked', 'stuck', 'on hold', 'waiting on'],
  done: ['done', 'complete', 'completed', 'finished', 'resolved'],
  planning: ['planning', 'planned', 'draft'],
  active: ['active', 'ongoing', 'current'],
}

/** Match heading patterns */
const HEADING_PATTERN = /^#+\s+(.+)$/m

/** Match first line (for titles) */
const FIRST_LINE_PATTERN = /^(.+?)(?:\n|$)/

// ============================================================================
// MAIN EXTRACTION FUNCTION
// ============================================================================

/**
 * Extract all field values from a strand for a given schema
 */
export async function extractFieldsFromStrand(
  strand: SelectedStrand,
  schema: SupertagSchema,
  options: ExtractionOptions = {}
): Promise<Record<string, ExtractedFieldValue>> {
  const results: Record<string, ExtractedFieldValue> = {}
  const content = strand.content || ''
  const frontmatter = parseFrontmatter(content)

  for (const field of schema.fields) {
    const extracted = extractFieldValue(
      field,
      strand,
      content,
      frontmatter,
      options
    )
    results[field.name] = extracted
  }

  return results
}

/**
 * Extract a single field value based on field type and extraction config
 */
export function extractFieldValue(
  field: SupertagFieldDefinition,
  strand: SelectedStrand,
  content: string,
  frontmatter: Record<string, unknown>,
  options: ExtractionOptions = {}
): ExtractedFieldValue {
  const { name, type, defaultValue } = field

  // Try frontmatter first (highest confidence)
  if (frontmatter[name] !== undefined) {
    return {
      fieldName: name,
      value: frontmatter[name],
      confidence: 1.0,
      source: 'frontmatter',
      preview: String(frontmatter[name]),
    }
  }

  // Extract based on field type
  const extractor = getExtractorForType(type)
  const extracted = extractor(name, strand, content, field)

  // Apply default value if no extraction
  if (extracted.value === undefined && defaultValue !== undefined) {
    return {
      ...extracted,
      value: defaultValue,
      confidence: 0.5,
      source: 'manual',
      preview: String(defaultValue),
    }
  }

  return extracted
}

// ============================================================================
// TYPE-SPECIFIC EXTRACTORS
// ============================================================================

type FieldExtractor = (
  fieldName: string,
  strand: SelectedStrand,
  content: string,
  field: SupertagFieldDefinition
) => ExtractedFieldValue

/**
 * Get the appropriate extractor for a field type
 */
function getExtractorForType(type: SupertagFieldType): FieldExtractor {
  const extractors: Partial<Record<SupertagFieldType, FieldExtractor>> = {
    text: extractText,
    textarea: extractTextarea,
    number: extractNumber,
    date: extractDate,
    datetime: extractDateTime,
    checkbox: extractCheckbox,
    select: extractSelect,
    multiselect: extractMultiselect,
    url: extractUrl,
    email: extractEmail,
    phone: extractPhone,
    rating: extractRating,
    progress: extractProgress,
    tags: extractTags,
    reference: extractReference,
  }

  return extractors[type] || extractGeneric
}

/**
 * Extract text field (title, name, etc.)
 */
function extractText(
  fieldName: string,
  strand: SelectedStrand,
  content: string,
  _field: SupertagFieldDefinition
): ExtractedFieldValue {
  // Common title-like fields
  if (['title', 'name', 'heading', 'subject'].includes(fieldName.toLowerCase())) {
    return extractTitle(strand, content)
  }

  // Try to find labeled content
  const labelPattern = new RegExp(`${fieldName}[:\\s]+([^\\n]+)`, 'i')
  const match = content.match(labelPattern)
  if (match) {
    return {
      fieldName,
      value: match[1].trim(),
      confidence: 0.8,
      source: 'content',
      preview: match[1].trim(),
      matchedText: match[0],
    }
  }

  return {
    fieldName,
    value: undefined,
    confidence: 0,
    source: 'content',
  }
}

/**
 * Extract textarea field (description, notes, etc.)
 */
function extractTextarea(
  fieldName: string,
  strand: SelectedStrand,
  content: string,
  _field: SupertagFieldDefinition
): ExtractedFieldValue {
  // For notes/description fields, use content after title
  if (['notes', 'description', 'body', 'content'].includes(fieldName.toLowerCase())) {
    const cleanContent = removeTitle(content)
    if (cleanContent.trim()) {
      return {
        fieldName,
        value: cleanContent.trim(),
        confidence: 0.7,
        source: 'content',
        preview: cleanContent.slice(0, 100) + (cleanContent.length > 100 ? '...' : ''),
      }
    }
  }

  // For action items, extract checkboxes
  if (['action_items', 'tasks', 'todos'].includes(fieldName.toLowerCase())) {
    const tasks = extractTasks(content)
    if (tasks.length > 0) {
      const taskList = tasks.map((t) => `- [${t.checked ? 'x' : ' '}] ${t.text}`).join('\n')
      return {
        fieldName,
        value: taskList,
        confidence: 0.9,
        source: 'content',
        preview: `${tasks.length} task(s)`,
      }
    }
  }

  // For agenda, extract bullet points
  if (['agenda', 'outline', 'topics'].includes(fieldName.toLowerCase())) {
    const bullets = extractBulletPoints(content)
    if (bullets.length > 0) {
      const bulletList = bullets.map((b) => `- ${b}`).join('\n')
      return {
        fieldName,
        value: bulletList,
        confidence: 0.8,
        source: 'content',
        preview: `${bullets.length} item(s)`,
      }
    }
  }

  return {
    fieldName,
    value: undefined,
    confidence: 0,
    source: 'content',
  }
}

/**
 * Extract number field
 */
function extractNumber(
  fieldName: string,
  _strand: SelectedStrand,
  content: string,
  _field: SupertagFieldDefinition
): ExtractedFieldValue {
  // Look for labeled numbers
  const labelPattern = new RegExp(`${fieldName}[:\\s]+(\\d+(?:\\.\\d+)?)`, 'i')
  const match = content.match(labelPattern)
  if (match) {
    const value = parseFloat(match[1])
    return {
      fieldName,
      value,
      confidence: 0.8,
      source: 'content',
      preview: String(value),
      matchedText: match[0],
    }
  }

  return {
    fieldName,
    value: undefined,
    confidence: 0,
    source: 'content',
  }
}

/**
 * Extract date field
 */
function extractDate(
  fieldName: string,
  _strand: SelectedStrand,
  content: string,
  _field: SupertagFieldDefinition
): ExtractedFieldValue {
  // Check for @due() annotation
  const dueMatch = content.match(/@due[:\(]([^)\s]+)\)?/i)
  if (dueMatch) {
    const parsed = parseNaturalDate(dueMatch[1])
    if (parsed) {
      return {
        fieldName,
        value: parsed,
        confidence: 0.95,
        source: 'content',
        preview: parsed,
        matchedText: dueMatch[0],
      }
    }
  }

  // Check for date labels
  for (const match of content.matchAll(DATE_LABEL_PATTERN)) {
    const parsed = parseNaturalDate(match[1].trim())
    if (parsed) {
      return {
        fieldName,
        value: parsed,
        confidence: 0.8,
        source: 'content',
        preview: parsed,
        matchedText: match[0],
      }
    }
  }

  return {
    fieldName,
    value: undefined,
    confidence: 0,
    source: 'content',
  }
}

/**
 * Extract datetime field
 */
function extractDateTime(
  fieldName: string,
  strand: SelectedStrand,
  content: string,
  field: SupertagFieldDefinition
): ExtractedFieldValue {
  // First try date extraction
  const dateResult = extractDate(fieldName, strand, content, field)
  if (dateResult.value) {
    // Add current time if only date found
    return {
      ...dateResult,
      value: `${dateResult.value}T09:00:00`,
    }
  }
  return dateResult
}

/**
 * Extract checkbox/boolean field
 */
function extractCheckbox(
  fieldName: string,
  _strand: SelectedStrand,
  content: string,
  _field: SupertagFieldDefinition
): ExtractedFieldValue {
  // Check for true/false keywords
  const lowerContent = content.toLowerCase()
  if (
    lowerContent.includes('yes') ||
    lowerContent.includes('true') ||
    lowerContent.includes('completed') ||
    lowerContent.includes('done')
  ) {
    return {
      fieldName,
      value: true,
      confidence: 0.7,
      source: 'content',
      preview: 'Yes',
    }
  }

  // Check checkbox completion ratio
  const { total, checked } = countCheckboxes(content)
  if (total > 0) {
    return {
      fieldName,
      value: checked === total,
      confidence: 0.8,
      source: 'content',
      preview: `${checked}/${total} complete`,
    }
  }

  return {
    fieldName,
    value: false,
    confidence: 0.3,
    source: 'content',
    preview: 'No',
  }
}

/**
 * Extract select field (status, priority, etc.)
 */
function extractSelect(
  fieldName: string,
  _strand: SelectedStrand,
  content: string,
  field: SupertagFieldDefinition
): ExtractedFieldValue {
  const lowerContent = content.toLowerCase()

  // Special handling for priority field
  if (fieldName.toLowerCase() === 'priority') {
    const priority = detectPriority(content)
    if (priority) {
      return {
        fieldName,
        value: priority,
        confidence: 0.85,
        source: 'content',
        preview: priority,
      }
    }
  }

  // Special handling for status field
  if (fieldName.toLowerCase() === 'status') {
    for (const [status, keywords] of Object.entries(STATUS_KEYWORDS)) {
      if (keywords.some((kw) => lowerContent.includes(kw))) {
        // Verify this is a valid option
        if (field.options?.some((opt) => opt.value === status)) {
          return {
            fieldName,
            value: status,
            confidence: 0.8,
            source: 'content',
            preview: status,
          }
        }
      }
    }
  }

  // Check for any option value in content
  if (field.options) {
    for (const option of field.options) {
      if (
        lowerContent.includes(option.value.toLowerCase()) ||
        lowerContent.includes(option.label.toLowerCase())
      ) {
        return {
          fieldName,
          value: option.value,
          confidence: 0.7,
          source: 'content',
          preview: option.label,
        }
      }
    }
  }

  return {
    fieldName,
    value: undefined,
    confidence: 0,
    source: 'content',
  }
}

/**
 * Extract multiselect field
 */
function extractMultiselect(
  fieldName: string,
  _strand: SelectedStrand,
  content: string,
  field: SupertagFieldDefinition
): ExtractedFieldValue {
  const lowerContent = content.toLowerCase()
  const selectedValues: string[] = []

  if (field.options) {
    for (const option of field.options) {
      if (
        lowerContent.includes(option.value.toLowerCase()) ||
        lowerContent.includes(option.label.toLowerCase())
      ) {
        selectedValues.push(option.value)
      }
    }
  }

  if (selectedValues.length > 0) {
    return {
      fieldName,
      value: selectedValues,
      confidence: 0.7,
      source: 'content',
      preview: selectedValues.join(', '),
    }
  }

  return {
    fieldName,
    value: [],
    confidence: 0,
    source: 'content',
  }
}

/**
 * Extract URL field
 */
function extractUrl(
  fieldName: string,
  _strand: SelectedStrand,
  content: string,
  _field: SupertagFieldDefinition
): ExtractedFieldValue {
  const urls = content.match(URL_PATTERN)
  if (urls && urls.length > 0) {
    return {
      fieldName,
      value: urls[0],
      confidence: 0.9,
      source: 'content',
      preview: urls[0].slice(0, 50) + (urls[0].length > 50 ? '...' : ''),
      matchedText: urls[0],
    }
  }

  return {
    fieldName,
    value: undefined,
    confidence: 0,
    source: 'content',
  }
}

/**
 * Extract email field
 */
function extractEmail(
  fieldName: string,
  _strand: SelectedStrand,
  content: string,
  _field: SupertagFieldDefinition
): ExtractedFieldValue {
  const emails = content.match(EMAIL_PATTERN)
  if (emails && emails.length > 0) {
    return {
      fieldName,
      value: emails[0],
      confidence: 0.9,
      source: 'content',
      preview: emails[0],
      matchedText: emails[0],
    }
  }

  return {
    fieldName,
    value: undefined,
    confidence: 0,
    source: 'content',
  }
}

/**
 * Extract phone field
 */
function extractPhone(
  fieldName: string,
  _strand: SelectedStrand,
  content: string,
  _field: SupertagFieldDefinition
): ExtractedFieldValue {
  const phones = content.match(PHONE_PATTERN)
  if (phones && phones.length > 0) {
    return {
      fieldName,
      value: phones[0],
      confidence: 0.85,
      source: 'content',
      preview: phones[0],
      matchedText: phones[0],
    }
  }

  return {
    fieldName,
    value: undefined,
    confidence: 0,
    source: 'content',
  }
}

/**
 * Extract rating field (1-5)
 */
function extractRating(
  fieldName: string,
  _strand: SelectedStrand,
  content: string,
  _field: SupertagFieldDefinition
): ExtractedFieldValue {
  // Look for rating patterns like "Rating: 4" or "4/5" or "⭐⭐⭐⭐"
  const ratingMatch = content.match(/rating[:\s]+(\d)/i)
  if (ratingMatch) {
    const value = parseInt(ratingMatch[1], 10)
    if (value >= 1 && value <= 5) {
      return {
        fieldName,
        value,
        confidence: 0.9,
        source: 'content',
        preview: '⭐'.repeat(value),
        matchedText: ratingMatch[0],
      }
    }
  }

  // Count stars
  const starCount = (content.match(/⭐/g) || []).length
  if (starCount > 0 && starCount <= 5) {
    return {
      fieldName,
      value: starCount,
      confidence: 0.85,
      source: 'content',
      preview: '⭐'.repeat(starCount),
    }
  }

  return {
    fieldName,
    value: undefined,
    confidence: 0,
    source: 'content',
  }
}

/**
 * Extract progress field (0-100)
 */
function extractProgress(
  fieldName: string,
  _strand: SelectedStrand,
  content: string,
  _field: SupertagFieldDefinition
): ExtractedFieldValue {
  // Calculate from checkbox completion
  const { total, checked } = countCheckboxes(content)
  if (total > 0) {
    const progress = Math.round((checked / total) * 100)
    return {
      fieldName,
      value: progress,
      confidence: 0.9,
      source: 'content',
      preview: `${progress}%`,
    }
  }

  // Look for explicit progress
  const progressMatch = content.match(/progress[:\s]+(\d+)%?/i)
  if (progressMatch) {
    const value = parseInt(progressMatch[1], 10)
    if (value >= 0 && value <= 100) {
      return {
        fieldName,
        value,
        confidence: 0.85,
        source: 'content',
        preview: `${value}%`,
        matchedText: progressMatch[0],
      }
    }
  }

  return {
    fieldName,
    value: 0,
    confidence: 0.3,
    source: 'content',
    preview: '0%',
  }
}

/**
 * Extract tags field
 */
function extractTags(
  fieldName: string,
  strand: SelectedStrand,
  content: string,
  _field: SupertagFieldDefinition
): ExtractedFieldValue {
  const tags: string[] = []

  // Use strand's existing tags
  if (strand.tags && strand.tags.length > 0) {
    tags.push(...strand.tags)
  }

  // Extract hashtags from content
  for (const match of content.matchAll(HASHTAG_PATTERN)) {
    const tag = match[1]
    if (!tags.includes(tag)) {
      tags.push(tag)
    }
  }

  // For attendees field, extract @mentions
  if (['attendees', 'participants', 'people'].includes(fieldName.toLowerCase())) {
    for (const match of content.matchAll(MENTION_PATTERN)) {
      const person = match[1] || match[2]
      if (!tags.includes(person)) {
        tags.push(person)
      }
    }

    // Also check for attendees section
    for (const match of content.matchAll(ATTENDEES_PATTERN)) {
      const people = match[1].split(/[,;]/).map((p) => p.trim()).filter(Boolean)
      for (const person of people) {
        if (!tags.includes(person)) {
          tags.push(person)
        }
      }
    }
  }

  if (tags.length > 0) {
    return {
      fieldName,
      value: tags,
      confidence: tags.length > 0 ? 0.8 : 0,
      source: strand.tags?.length ? 'tags' : 'content',
      preview: tags.join(', '),
    }
  }

  return {
    fieldName,
    value: [],
    confidence: 0,
    source: 'content',
  }
}

/**
 * Extract reference field
 */
function extractReference(
  fieldName: string,
  _strand: SelectedStrand,
  content: string,
  _field: SupertagFieldDefinition
): ExtractedFieldValue {
  // Look for wiki-style links [[Reference]]
  const wikiLinkMatch = content.match(/\[\[([^\]]+)\]\]/)
  if (wikiLinkMatch) {
    return {
      fieldName,
      value: wikiLinkMatch[1],
      confidence: 0.9,
      source: 'content',
      preview: wikiLinkMatch[1],
      matchedText: wikiLinkMatch[0],
    }
  }

  return {
    fieldName,
    value: undefined,
    confidence: 0,
    source: 'content',
  }
}

/**
 * Generic extractor fallback
 */
function extractGeneric(
  fieldName: string,
  _strand: SelectedStrand,
  content: string,
  _field: SupertagFieldDefinition
): ExtractedFieldValue {
  // Try to find labeled content
  const labelPattern = new RegExp(`${fieldName}[:\\s]+([^\\n]+)`, 'i')
  const match = content.match(labelPattern)
  if (match) {
    return {
      fieldName,
      value: match[1].trim(),
      confidence: 0.6,
      source: 'content',
      preview: match[1].trim(),
      matchedText: match[0],
    }
  }

  return {
    fieldName,
    value: undefined,
    confidence: 0,
    source: 'content',
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Extract title from strand
 */
export function extractTitle(
  strand: SelectedStrand,
  content: string
): ExtractedFieldValue {
  // Use strand title if available
  if (strand.title) {
    return {
      fieldName: 'title',
      value: strand.title,
      confidence: 1.0,
      source: 'title',
      preview: strand.title,
    }
  }

  // Try to extract from heading
  const headingMatch = content.match(HEADING_PATTERN)
  if (headingMatch) {
    return {
      fieldName: 'title',
      value: headingMatch[1].trim(),
      confidence: 0.9,
      source: 'content',
      preview: headingMatch[1].trim(),
      matchedText: headingMatch[0],
    }
  }

  // Use first line
  const firstLineMatch = content.match(FIRST_LINE_PATTERN)
  if (firstLineMatch) {
    return {
      fieldName: 'title',
      value: firstLineMatch[1].trim(),
      confidence: 0.7,
      source: 'content',
      preview: firstLineMatch[1].trim(),
    }
  }

  // Extract from path
  const pathParts = strand.path.split('/')
  const filename = pathParts[pathParts.length - 1]
  const nameWithoutExt = filename.replace(/\.(md|mdx|txt)$/, '')
  return {
    fieldName: 'title',
    value: nameWithoutExt,
    confidence: 0.5,
    source: 'filename',
    preview: nameWithoutExt,
  }
}

/**
 * Parse YAML frontmatter from content
 */
export function parseFrontmatter(content: string): Record<string, unknown> {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/)
  if (!frontmatterMatch) return {}

  const frontmatterText = frontmatterMatch[1]
  const result: Record<string, unknown> = {}

  // Simple YAML parsing (key: value)
  for (const line of frontmatterText.split('\n')) {
    const match = line.match(/^(\w+):\s*(.+)$/)
    if (match) {
      const [, key, value] = match
      // Parse arrays [item1, item2]
      if (value.startsWith('[') && value.endsWith(']')) {
        result[key] = value
          .slice(1, -1)
          .split(',')
          .map((v) => v.trim())
      }
      // Parse booleans
      else if (value === 'true') result[key] = true
      else if (value === 'false') result[key] = false
      // Parse numbers
      else if (!isNaN(Number(value))) result[key] = Number(value)
      // String value
      else result[key] = value.replace(/^["']|["']$/g, '')
    }
  }

  return result
}

/**
 * Remove title/heading from content for body extraction
 */
function removeTitle(content: string): string {
  // Remove frontmatter
  let cleaned = content.replace(/^---\n[\s\S]*?\n---\n?/, '')
  // Remove first heading
  cleaned = cleaned.replace(/^#+\s+.+\n?/, '')
  return cleaned.trim()
}

/**
 * Extract bullet points from content
 */
function extractBulletPoints(content: string): string[] {
  const bullets: string[] = []
  const lines = content.split('\n')

  for (const line of lines) {
    // Match bullet points (-, *, •) but not checkboxes
    const bulletMatch = line.match(/^\s*[-*•]\s+(?!\[[ xX]\])(.+)$/)
    if (bulletMatch) {
      bullets.push(bulletMatch[1].trim())
    }
  }

  return bullets
}

/**
 * Suggest field mappings based on schema and sample strands
 */
export function suggestFieldMappings(
  schema: SupertagSchema,
  sampleStrands: SelectedStrand[]
): FieldMappingConfig[] {
  return schema.fields.map((field) => {
    // Determine best extraction source based on field name and type
    let extractionSource: ExtractionSource | 'auto' = 'auto'

    // Title-like fields
    if (['title', 'name', 'heading', 'subject'].includes(field.name.toLowerCase())) {
      extractionSource = 'title'
    }
    // Content body fields
    else if (['notes', 'description', 'body', 'content', 'summary'].includes(field.name.toLowerCase())) {
      extractionSource = 'content'
    }
    // Date fields often in frontmatter
    else if (field.type === 'date' || field.type === 'datetime') {
      extractionSource = 'auto' // Check both frontmatter and content
    }
    // Tags usually from strand tags
    else if (field.name.toLowerCase() === 'tags' || field.type === 'tags') {
      extractionSource = 'tags'
    }

    return {
      fieldName: field.name,
      fieldType: field.type,
      extractionSource,
      defaultValue: field.defaultValue,
    }
  })
}
