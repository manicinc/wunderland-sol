/**
 * Content Formatter
 * @module lib/publish/contentFormatter
 *
 * Formats reflections, strands, and other content for GitHub publishing.
 * Handles path generation, frontmatter, and markdown formatting.
 */

import type {
  PublishableContentType,
  PublishableItem,
  FileChange,
} from './types'
import type { Reflection, ReflectionMetadata } from '@/lib/reflect/types'
import {
  hashContent,
  DEFAULT_REFLECTIONS_PATH,
  DEFAULT_STRANDS_PATH,
  DEFAULT_PROJECTS_PATH,
} from './constants'

// ============================================================================
// PATH FORMATTING
// ============================================================================

/**
 * Variables available for path templates
 */
interface PathVariables {
  year?: string
  month?: string
  day?: string
  date?: string
  weekday?: string
  weave?: string
  loom?: string
  slug?: string
  title?: string
  type?: string
  status?: string
}

/**
 * Apply path template variables
 */
export function applyPathTemplate(template: string, variables: PathVariables): string {
  let result = template

  // Replace all variables
  for (const [key, value] of Object.entries(variables)) {
    if (value !== undefined) {
      result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value)
    }
  }

  // Remove any unreplaced variables
  result = result.replace(/\{[a-z_]+\}/g, '')

  // Clean up multiple slashes
  result = result.replace(/\/+/g, '/')

  // Remove trailing slash
  result = result.replace(/\/$/, '')

  return result
}

/**
 * Generate path for a reflection
 */
export function getReflectionPath(
  dateKey: string,
  pathTemplate = DEFAULT_REFLECTIONS_PATH
): string {
  const [year, month, day] = dateKey.split('-')
  const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
  const weekday = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()

  const variables: PathVariables = {
    year,
    month,
    day,
    date: dateKey,
    weekday,
  }

  const basePath = applyPathTemplate(pathTemplate, variables)
  return `${basePath}/${dateKey}.md`
}

/**
 * Generate path for a strand
 */
export function getStrandPath(
  weave: string,
  loom: string | null | undefined,
  slug: string,
  pathTemplate = DEFAULT_STRANDS_PATH
): string {
  const variables: PathVariables = {
    weave,
    loom: loom || undefined,
    slug,
  }

  const basePath = applyPathTemplate(pathTemplate, variables)

  if (loom) {
    return `${basePath}/${loom}/${slug}.md`
  }
  return `${basePath}/${slug}.md`
}

/**
 * Generate path for a project
 */
export function getProjectPath(
  slug: string,
  title: string,
  type?: string,
  pathTemplate = DEFAULT_PROJECTS_PATH
): string {
  const variables: PathVariables = {
    slug,
    title: slugify(title),
    type: type || 'general',
  }

  const basePath = applyPathTemplate(pathTemplate, variables)
  return `${basePath}/index.md`
}

/**
 * Convert a title to a URL-safe slug
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')  // Remove non-word chars
    .replace(/[\s_-]+/g, '-')  // Replace spaces/underscores with hyphens
    .replace(/^-+|-+$/g, '')   // Remove leading/trailing hyphens
}

// ============================================================================
// FRONTMATTER FORMATTING
// ============================================================================

/**
 * Format value for YAML frontmatter
 */
function formatYamlValue(value: unknown): string {
  if (value === null || value === undefined) {
    return 'null'
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false'
  }
  if (typeof value === 'number') {
    return String(value)
  }
  if (typeof value === 'string') {
    // Check if we need to quote the string
    if (
      value.includes(':') ||
      value.includes('#') ||
      value.includes('"') ||
      value.includes("'") ||
      value.includes('\n') ||
      value.startsWith(' ') ||
      value.endsWith(' ')
    ) {
      // Use double quotes and escape internal quotes
      return `"${value.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`
    }
    return value
  }
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return '[]'
    }
    // Use flow style for simple arrays
    if (value.every(v => typeof v === 'string' && !v.includes(','))) {
      return `[${value.map(v => formatYamlValue(v)).join(', ')}]`
    }
    // Use block style for complex arrays
    return '\n' + value.map(v => `  - ${formatYamlValue(v)}`).join('\n')
  }
  if (typeof value === 'object') {
    return JSON.stringify(value)
  }
  return String(value)
}

/**
 * Generate YAML frontmatter from an object
 */
export function generateFrontmatter(data: Record<string, unknown>): string {
  const lines: string[] = ['---']

  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined && value !== null) {
      const formattedValue = formatYamlValue(value)
      if (formattedValue.startsWith('\n')) {
        lines.push(`${key}:${formattedValue}`)
      } else {
        lines.push(`${key}: ${formattedValue}`)
      }
    }
  }

  lines.push('---')
  return lines.join('\n')
}

/**
 * Parse frontmatter from markdown content
 */
export function parseFrontmatter(content: string): {
  frontmatter: Record<string, unknown>
  body: string
} {
  const match = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/)

  if (!match) {
    return { frontmatter: {}, body: content }
  }

  try {
    // Simple YAML parsing for common cases
    const frontmatter: Record<string, unknown> = {}
    const lines = match[1].split('\n')

    for (const line of lines) {
      const colonIndex = line.indexOf(':')
      if (colonIndex > 0) {
        const key = line.slice(0, colonIndex).trim()
        let value: unknown = line.slice(colonIndex + 1).trim()
        const valueStr = value as string

        // Parse arrays
        if (valueStr.startsWith('[') && valueStr.endsWith(']')) {
          try {
            value = JSON.parse(valueStr.replace(/'/g, '"'))
          } catch {
            // Keep as string if JSON parse fails
          }
        }
        // Parse booleans
        else if (valueStr === 'true') {
          value = true
        } else if (valueStr === 'false') {
          value = false
        }
        // Parse numbers
        else if (/^-?\d+(\.\d+)?$/.test(valueStr)) {
          value = parseFloat(valueStr)
        }
        // Remove quotes
        else if (
          (valueStr.startsWith('"') && valueStr.endsWith('"')) ||
          (valueStr.startsWith("'") && valueStr.endsWith("'"))
        ) {
          value = valueStr.slice(1, -1)
        }

        frontmatter[key] = value
      }
    }

    return { frontmatter, body: match[2] }
  } catch {
    return { frontmatter: {}, body: content }
  }
}

// ============================================================================
// REFLECTION FORMATTING
// ============================================================================

/**
 * Format a reflection for GitHub publishing
 */
export function formatReflection(
  reflection: Reflection,
  options: {
    includeFrontmatter?: boolean
    pathTemplate?: string
  } = {}
): { path: string; content: string; hash: string } {
  const { includeFrontmatter = true, pathTemplate } = options

  const path = getReflectionPath(reflection.date, pathTemplate)

  // Build frontmatter
  const frontmatterData: Record<string, unknown> = {
    title: reflection.title,
    date: reflection.date,
    type: 'reflection',
    created: reflection.createdAt,
    updated: reflection.updatedAt,
  }

  // Add metadata fields
  if (reflection.metadata) {
    if (reflection.metadata.mood) {
      frontmatterData.mood = reflection.metadata.mood
    }
    if (reflection.metadata.sleepHours) {
      frontmatterData.sleep_hours = reflection.metadata.sleepHours
    }
    if (reflection.metadata.tags && reflection.metadata.tags.length > 0) {
      frontmatterData.tags = reflection.metadata.tags
    }
    if (reflection.metadata.energyLevel) {
      frontmatterData.energy_level = reflection.metadata.energyLevel
    }
    if (reflection.metadata.location) {
      frontmatterData.location = reflection.metadata.location.name
    }
    if (reflection.metadata.weather) {
      frontmatterData.weather = reflection.metadata.weather.type
    }
  }

  if (reflection.wordCount) {
    frontmatterData.word_count = reflection.wordCount
  }

  // Combine frontmatter and content
  let content: string
  if (includeFrontmatter) {
    const frontmatter = generateFrontmatter(frontmatterData)
    content = `${frontmatter}\n\n${reflection.content || ''}`
  } else {
    content = reflection.content || ''
  }

  // Ensure content ends with newline
  if (!content.endsWith('\n')) {
    content += '\n'
  }

  const hash = hashContent(content)

  return { path, content, hash }
}

// ============================================================================
// STRAND FORMATTING
// ============================================================================

/**
 * Strand data structure (subset of full strand)
 */
interface StrandData {
  id: string
  weave: string
  loom?: string | null
  title: string
  content: string
  slug?: string
  createdAt: string
  updatedAt: string
  metadata?: Record<string, unknown>
}

/**
 * Format a strand for GitHub publishing
 */
export function formatStrand(
  strand: StrandData,
  options: {
    includeFrontmatter?: boolean
    pathTemplate?: string
  } = {}
): { path: string; content: string; hash: string } {
  const { includeFrontmatter = true, pathTemplate } = options

  const slug = strand.slug || slugify(strand.title)
  const path = getStrandPath(strand.weave, strand.loom, slug, pathTemplate)

  // Build frontmatter
  const frontmatterData: Record<string, unknown> = {
    title: strand.title,
    weave: strand.weave,
    created: strand.createdAt,
    updated: strand.updatedAt,
  }

  if (strand.loom) {
    frontmatterData.loom = strand.loom
  }

  // Add custom metadata
  if (strand.metadata) {
    for (const [key, value] of Object.entries(strand.metadata)) {
      if (!frontmatterData[key]) {
        frontmatterData[key] = value
      }
    }
  }

  // Combine frontmatter and content
  let content: string
  if (includeFrontmatter) {
    const frontmatter = generateFrontmatter(frontmatterData)
    content = `${frontmatter}\n\n${strand.content || ''}`
  } else {
    content = strand.content || ''
  }

  // Ensure content ends with newline
  if (!content.endsWith('\n')) {
    content += '\n'
  }

  const hash = hashContent(content)

  return { path, content, hash }
}

// ============================================================================
// FILE CHANGE GENERATION
// ============================================================================

/**
 * Create a file change for a publishable item
 */
export function createFileChange(
  item: PublishableItem,
  action: 'create' | 'update' | 'delete' = 'update'
): FileChange {
  return {
    path: item.path,
    content: item.content,
    encoding: 'utf-8',
    action,
  }
}

/**
 * Create file changes from reflections
 */
export function createReflectionFileChanges(
  reflections: Reflection[],
  options: {
    includeFrontmatter?: boolean
    pathTemplate?: string
  } = {}
): FileChange[] {
  return reflections.map(reflection => {
    const { path, content } = formatReflection(reflection, options)

    return {
      path,
      content,
      encoding: 'utf-8' as const,
      action: reflection.publishedCommit ? 'update' : 'create',
    }
  })
}

/**
 * Create file changes from strands
 */
export function createStrandFileChanges(
  strands: StrandData[],
  options: {
    includeFrontmatter?: boolean
    pathTemplate?: string
  } = {}
): FileChange[] {
  return strands.map(strand => {
    const { path, content } = formatStrand(strand, options)

    return {
      path,
      content,
      encoding: 'utf-8' as const,
      action: 'update', // Default to update, will be overwritten if file doesn't exist
    }
  })
}

// ============================================================================
// CONTENT CONVERSION TO PUBLISHABLE ITEMS
// ============================================================================

/**
 * Convert a reflection to a publishable item
 */
export function reflectionToPublishableItem(
  reflection: Reflection,
  options: {
    includeFrontmatter?: boolean
    pathTemplate?: string
  } = {}
): PublishableItem {
  const { path, content, hash } = formatReflection(reflection, options)

  return {
    type: 'reflection',
    id: reflection.date,
    path,
    title: reflection.title,
    content,
    contentHash: hash,
    updatedAt: reflection.updatedAt,
    syncStatus: reflection.syncStatus || 'local',
    metadata: {
      mood: reflection.metadata?.mood,
      wordCount: reflection.wordCount,
    },
  }
}

/**
 * Convert a strand to a publishable item
 */
export function strandToPublishableItem(
  strand: StrandData,
  options: {
    includeFrontmatter?: boolean
    pathTemplate?: string
  } = {}
): PublishableItem {
  const { path, content, hash } = formatStrand(strand, options)

  return {
    type: 'strand',
    id: strand.id,
    path,
    title: strand.title,
    content,
    contentHash: hash,
    updatedAt: strand.updatedAt,
    syncStatus: 'local', // Will be set properly from database
    metadata: {
      weave: strand.weave,
      loom: strand.loom,
    },
  }
}

// ============================================================================
// EXPORT FORMATTING
// ============================================================================

/**
 * Format multiple items as a single combined markdown document
 */
export function formatCombinedMarkdown(
  items: PublishableItem[],
  options: {
    includeTableOfContents?: boolean
    groupBy?: 'type' | 'date' | 'none'
  } = {}
): string {
  const { includeTableOfContents = true, groupBy = 'type' } = options

  const lines: string[] = []

  // Title
  lines.push('# Export')
  lines.push('')
  lines.push(`Exported on ${new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })}`)
  lines.push('')

  // Table of contents
  if (includeTableOfContents && items.length > 0) {
    lines.push('## Contents')
    lines.push('')

    for (const item of items) {
      const anchor = slugify(item.title)
      lines.push(`- [${item.title}](#${anchor})`)
    }
    lines.push('')
    lines.push('---')
    lines.push('')
  }

  // Group items if needed
  let groupedItems: Map<string, PublishableItem[]>

  if (groupBy === 'type') {
    groupedItems = new Map()
    for (const item of items) {
      const group = item.type.charAt(0).toUpperCase() + item.type.slice(1) + 's'
      if (!groupedItems.has(group)) {
        groupedItems.set(group, [])
      }
      groupedItems.get(group)!.push(item)
    }
  } else if (groupBy === 'date') {
    groupedItems = new Map()
    for (const item of items) {
      const date = item.updatedAt.slice(0, 10) // YYYY-MM-DD
      if (!groupedItems.has(date)) {
        groupedItems.set(date, [])
      }
      groupedItems.get(date)!.push(item)
    }
  } else {
    groupedItems = new Map([['All Items', items]])
  }

  // Add items
  for (const [groupName, groupItems] of groupedItems) {
    if (groupBy !== 'none') {
      lines.push(`## ${groupName}`)
      lines.push('')
    }

    for (const item of groupItems) {
      lines.push(`### ${item.title}`)
      lines.push('')

      // Strip frontmatter from content for combined export
      const { body } = parseFrontmatter(item.content)
      lines.push(body.trim())
      lines.push('')
      lines.push('---')
      lines.push('')
    }
  }

  return lines.join('\n')
}

/**
 * Format items as JSON export
 */
export function formatJsonExport(items: PublishableItem[]): string {
  const exportData = {
    exportedAt: new Date().toISOString(),
    itemCount: items.length,
    items: items.map(item => {
      const { frontmatter, body } = parseFrontmatter(item.content)
      return {
        type: item.type,
        id: item.id,
        title: item.title,
        path: item.path,
        frontmatter,
        content: body,
        metadata: item.metadata,
        updatedAt: item.updatedAt,
      }
    }),
  }

  return JSON.stringify(exportData, null, 2)
}
