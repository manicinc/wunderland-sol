/**
 * PR Formatter
 * @module lib/publish/prFormatter
 *
 * Formats pull request titles and bodies using customizable templates.
 * Supports variable substitution for date ranges, content summaries, etc.
 */

import type {
  BatchStrategy,
  PublishableContentType,
  PublishableItem,
  FileChange,
} from './types'
import {
  formatDateRange,
  formatContentSummary,
  DEFAULT_PR_TITLE_TEMPLATE,
  DEFAULT_PR_BODY_TEMPLATE,
  PR_TITLE_VARIABLES,
  PR_BODY_VARIABLES,
} from './constants'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Context for PR template formatting
 */
export interface PRTemplateContext {
  /** Items being published */
  items: PublishableItem[]
  /** File changes for the PR */
  fileChanges: FileChange[]
  /** Batch strategy used */
  strategy: BatchStrategy
  /** Date range of content */
  dateRange?: {
    start: Date
    end: Date
  }
  /** Custom summary override */
  customSummary?: string
}

/**
 * Formatted PR info
 */
export interface FormattedPR {
  title: string
  body: string
}

// ============================================================================
// TEMPLATE FORMATTING
// ============================================================================

/**
 * Format a PR title using a template
 */
export function formatPRTitle(
  template: string,
  context: PRTemplateContext
): string {
  let result = template

  // Calculate counts by type
  const counts = countItemsByType(context.items)

  // Format date range
  const dateRangeStr = context.dateRange
    ? formatDateRange(context.dateRange.start, context.dateRange.end)
    : formatDateRange(new Date(), new Date())

  // Format summary
  const summaryStr = context.customSummary || formatContentSummary(counts)

  // Strategy label
  const strategyLabel = formatStrategyLabel(context.strategy)

  // Total count
  const totalCount = context.items.length

  // Current date
  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })

  // Replace variables
  result = result.replace(/\{date_range\}/g, dateRangeStr)
  result = result.replace(/\{summary\}/g, summaryStr)
  result = result.replace(/\{strategy\}/g, strategyLabel)
  result = result.replace(/\{count\}/g, String(totalCount))
  result = result.replace(/\{date\}/g, currentDate)

  return result.trim()
}

/**
 * Format a PR body using a template
 */
export function formatPRBody(
  template: string,
  context: PRTemplateContext,
  options: {
    includeDiffStats?: boolean
  } = {}
): string {
  const { includeDiffStats = true } = options

  let result = template

  // Calculate counts by type
  const counts = countItemsByType(context.items)

  // Format date range
  const dateRangeStr = context.dateRange
    ? formatDateRange(context.dateRange.start, context.dateRange.end)
    : formatDateRange(new Date(), new Date())

  // Strategy label
  const strategyLabel = formatStrategyLabel(context.strategy)

  // Total count
  const totalCount = context.items.length

  // Generate summary list
  const summaryList = generateSummaryList(context.items)

  // Generate file list
  const fileList = generateFileList(context.fileChanges)

  // Generate diff stats
  const diffStats = includeDiffStats
    ? generateDiffStats(context.fileChanges)
    : ''

  // Replace variables
  result = result.replace(/\{summary_list\}/g, summaryList)
  result = result.replace(/\{file_list\}/g, fileList)
  result = result.replace(/\{diff_stats\}/g, diffStats)
  result = result.replace(/\{date_range\}/g, dateRangeStr)
  result = result.replace(/\{strategy\}/g, strategyLabel)
  result = result.replace(/\{count\}/g, String(totalCount))

  return result.trim()
}

/**
 * Format both PR title and body
 */
export function formatPR(
  context: PRTemplateContext,
  options: {
    titleTemplate?: string
    bodyTemplate?: string
    includeDiffStats?: boolean
  } = {}
): FormattedPR {
  const {
    titleTemplate = DEFAULT_PR_TITLE_TEMPLATE,
    bodyTemplate = DEFAULT_PR_BODY_TEMPLATE,
    includeDiffStats = true,
  } = options

  return {
    title: formatPRTitle(titleTemplate, context),
    body: formatPRBody(bodyTemplate, context, { includeDiffStats }),
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Count items by content type
 */
function countItemsByType(
  items: PublishableItem[]
): Record<string, number> {
  const counts: Record<string, number> = {
    reflections: 0,
    strands: 0,
    projects: 0,
  }

  for (const item of items) {
    switch (item.type) {
      case 'reflection':
        counts.reflections++
        break
      case 'strand':
        counts.strands++
        break
      case 'project':
        counts.projects++
        break
    }
  }

  return counts
}

/**
 * Format strategy as human-readable label
 */
function formatStrategyLabel(strategy: BatchStrategy): string {
  switch (strategy) {
    case 'daily':
      return 'Daily'
    case 'weekly':
      return 'Weekly'
    case 'monthly':
      return 'Monthly'
    case 'all-pending':
      return 'All Pending'
    case 'manual':
      return 'Manual'
    default:
      return strategy
  }
}

/**
 * Generate bullet list summary of changes
 */
function generateSummaryList(items: PublishableItem[]): string {
  // Group by type
  const grouped = new Map<PublishableContentType, PublishableItem[]>()

  for (const item of items) {
    if (!grouped.has(item.type)) {
      grouped.set(item.type, [])
    }
    grouped.get(item.type)!.push(item)
  }

  const lines: string[] = []

  // Reflections
  const reflections = grouped.get('reflection') || []
  if (reflections.length > 0) {
    lines.push(`**Reflections** (${reflections.length})`)
    for (const item of reflections.slice(0, 5)) {
      lines.push(`- ${item.title}`)
    }
    if (reflections.length > 5) {
      lines.push(`- _...and ${reflections.length - 5} more_`)
    }
    lines.push('')
  }

  // Strands
  const strands = grouped.get('strand') || []
  if (strands.length > 0) {
    lines.push(`**Strands** (${strands.length})`)
    for (const item of strands.slice(0, 5)) {
      const weave = (item.metadata?.weave as string) || ''
      lines.push(`- ${item.title}${weave ? ` (${weave})` : ''}`)
    }
    if (strands.length > 5) {
      lines.push(`- _...and ${strands.length - 5} more_`)
    }
    lines.push('')
  }

  // Projects
  const projects = grouped.get('project') || []
  if (projects.length > 0) {
    lines.push(`**Projects** (${projects.length})`)
    for (const item of projects.slice(0, 5)) {
      lines.push(`- ${item.title}`)
    }
    if (projects.length > 5) {
      lines.push(`- _...and ${projects.length - 5} more_`)
    }
    lines.push('')
  }

  return lines.join('\n').trim()
}

/**
 * Generate file list for PR body
 */
function generateFileList(fileChanges: FileChange[]): string {
  if (fileChanges.length === 0) {
    return '_No files changed_'
  }

  const lines: string[] = []

  // Group by directory
  const byDirectory = new Map<string, FileChange[]>()

  for (const change of fileChanges) {
    const parts = change.path.split('/')
    const dir = parts.slice(0, -1).join('/') || '/'

    if (!byDirectory.has(dir)) {
      byDirectory.set(dir, [])
    }
    byDirectory.get(dir)!.push(change)
  }

  // Sort directories
  const sortedDirs = Array.from(byDirectory.keys()).sort()

  for (const dir of sortedDirs) {
    const changes = byDirectory.get(dir)!
    lines.push(`\`${dir}/\``)

    for (const change of changes) {
      const filename = change.path.split('/').pop() || change.path
      const actionIcon = getActionIcon(change.action)
      lines.push(`- ${actionIcon} \`${filename}\``)
    }
    lines.push('')
  }

  return lines.join('\n').trim()
}

/**
 * Get icon for file action
 */
function getActionIcon(action: 'create' | 'update' | 'delete'): string {
  switch (action) {
    case 'create':
      return '+'
    case 'update':
      return '~'
    case 'delete':
      return '-'
    default:
      return '*'
  }
}

/**
 * Generate diff stats summary
 */
function generateDiffStats(fileChanges: FileChange[]): string {
  if (fileChanges.length === 0) {
    return ''
  }

  let additions = 0
  let deletions = 0
  let creates = 0
  let updates = 0
  let deletes = 0

  for (const change of fileChanges) {
    switch (change.action) {
      case 'create':
        creates++
        additions += (change.content.match(/\n/g) || []).length + 1
        break
      case 'update':
        updates++
        // Approximate: count lines as additions (can't know actual diff without original)
        additions += (change.content.match(/\n/g) || []).length + 1
        break
      case 'delete':
        deletes++
        deletions++
        break
    }
  }

  const parts: string[] = []

  if (creates > 0) {
    parts.push(`${creates} file${creates === 1 ? '' : 's'} created`)
  }
  if (updates > 0) {
    parts.push(`${updates} file${updates === 1 ? '' : 's'} updated`)
  }
  if (deletes > 0) {
    parts.push(`${deletes} file${deletes === 1 ? '' : 's'} deleted`)
  }

  const stats: string[] = []
  if (additions > 0) {
    stats.push(`+${additions} lines`)
  }
  if (deletions > 0) {
    stats.push(`-${deletions} lines`)
  }

  if (parts.length === 0) {
    return ''
  }

  let result = parts.join(', ')
  if (stats.length > 0) {
    result += ` (${stats.join(', ')})`
  }

  return `_${result}_`
}

// ============================================================================
// TEMPLATE VALIDATION
// ============================================================================

/**
 * Validate a PR title template
 */
export function validateTitleTemplate(template: string): {
  valid: boolean
  errors: string[]
  warnings: string[]
} {
  const errors: string[] = []
  const warnings: string[] = []

  // Check for empty template
  if (!template.trim()) {
    errors.push('Template cannot be empty')
    return { valid: false, errors, warnings }
  }

  // Check for unknown variables
  const variablePattern = /\{(\w+)\}/g
  let match
  while ((match = variablePattern.exec(template)) !== null) {
    const variable = match[1]
    if (!PR_TITLE_VARIABLES.includes(variable as typeof PR_TITLE_VARIABLES[number])) {
      warnings.push(`Unknown variable: {${variable}}`)
    }
  }

  // Check for reasonable length
  if (template.length > 200) {
    warnings.push('Template is quite long; PR titles may be truncated')
  }

  return { valid: errors.length === 0, errors, warnings }
}

/**
 * Validate a PR body template
 */
export function validateBodyTemplate(template: string): {
  valid: boolean
  errors: string[]
  warnings: string[]
} {
  const errors: string[] = []
  const warnings: string[] = []

  // Check for empty template
  if (!template.trim()) {
    errors.push('Template cannot be empty')
    return { valid: false, errors, warnings }
  }

  // Check for unknown variables
  const variablePattern = /\{(\w+)\}/g
  let match
  while ((match = variablePattern.exec(template)) !== null) {
    const variable = match[1]
    if (!PR_BODY_VARIABLES.includes(variable as typeof PR_BODY_VARIABLES[number])) {
      warnings.push(`Unknown variable: {${variable}}`)
    }
  }

  // Check for essential sections
  if (!template.includes('{summary_list}')) {
    warnings.push('Template does not include {summary_list}')
  }
  if (!template.includes('{file_list}')) {
    warnings.push('Template does not include {file_list}')
  }

  return { valid: errors.length === 0, errors, warnings }
}

/**
 * Get available variables for PR templates
 */
export function getAvailableVariables(): {
  title: Array<{ variable: string; description: string; example: string }>
  body: Array<{ variable: string; description: string; example: string }>
} {
  return {
    title: [
      { variable: 'date_range', description: 'Date range of content', example: 'Dec 23-29, 2024' },
      { variable: 'summary', description: 'Content type summary', example: '5 reflections, 2 strands' },
      { variable: 'strategy', description: 'Batch strategy used', example: 'Weekly' },
      { variable: 'count', description: 'Total item count', example: '7' },
      { variable: 'date', description: 'Current date', example: 'Dec 29, 2024' },
    ],
    body: [
      { variable: 'summary_list', description: 'Bullet list of changes', example: '**Reflections** (5)\\n- Dec 23...' },
      { variable: 'file_list', description: 'List of files changed', example: '`reflections/`\\n- + `2024-12-23.md`' },
      { variable: 'diff_stats', description: 'Change statistics', example: '_3 files created (+150 lines)_' },
      { variable: 'date_range', description: 'Date range of content', example: 'Dec 23-29, 2024' },
      { variable: 'strategy', description: 'Batch strategy used', example: 'Weekly' },
      { variable: 'count', description: 'Total item count', example: '7' },
    ],
  }
}

// ============================================================================
// COMMIT MESSAGE FORMATTING
// ============================================================================

/**
 * Generate a commit message for direct commits
 */
export function formatCommitMessage(
  context: PRTemplateContext,
  options: {
    detailed?: boolean
  } = {}
): string {
  const { detailed = false } = options

  const counts = countItemsByType(context.items)
  const summary = formatContentSummary(counts)

  // Build commit message
  const lines: string[] = []

  // First line: summary
  if (context.dateRange) {
    const dateRange = formatDateRange(context.dateRange.start, context.dateRange.end)
    lines.push(`Publish: ${dateRange} - ${summary}`)
  } else {
    lines.push(`Publish: ${summary}`)
  }

  // Add details if requested
  if (detailed && context.items.length > 0) {
    lines.push('')
    lines.push('Changes:')

    for (const item of context.items.slice(0, 10)) {
      lines.push(`- ${item.type}: ${item.title}`)
    }

    if (context.items.length > 10) {
      lines.push(`- ...and ${context.items.length - 10} more`)
    }
  }

  return lines.join('\n')
}
