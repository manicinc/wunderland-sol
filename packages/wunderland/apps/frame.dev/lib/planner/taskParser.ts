/**
 * Markdown Task Parser
 *
 * Extracts and parses tasks from markdown checkbox syntax.
 * Supports:
 * - [ ] Uncompleted task
 * - [x] or [X] Completed task
 * - Priority detection via emoji or keywords
 * - Due date extraction via @due(date) syntax
 * - Natural language date parsing
 *
 * @module lib/planner/taskParser
 */

import type { ExtractedCheckbox, TaskPriority, StrandTaskMapping } from './types'

// Re-export ExtractedCheckbox as ExtractedTask for clearer API
export type ExtractedTask = ExtractedCheckbox
import {
  parse,
  isValid,
  addDays,
  addWeeks,
  addMonths,
  nextMonday,
  nextFriday,
  startOfWeek,
  endOfWeek,
  format,
} from 'date-fns'

// ============================================================================
// REGEX PATTERNS
// ============================================================================

/**
 * Match markdown checkbox lines:
 * - Captures indent, status, and text
 * - Group 1: Leading whitespace (for indent level)
 * - Group 2: Checkbox status (space, x, or X)
 * - Group 3: Task text
 */
const CHECKBOX_PATTERN = /^(\s*)-\s+\[([ xX])\]\s+(.+)$/

/**
 * Match @due(date) or @due:date syntax
 */
const DUE_DATE_PATTERN = /@due[:\(]([^)\s]+)\)?/i

/**
 * Match @priority(level) or priority emoji
 */
const PRIORITY_PATTERN = /@priority[:\(]?(low|medium|high|urgent)\)?/i

/**
 * Priority emoji mappings
 */
const PRIORITY_EMOJI_MAP: Record<string, TaskPriority> = {
  // Red variants = urgent
  '\u{1F534}': 'urgent', // 🔴
  '\u{2757}': 'urgent', // ❗
  '\u{203C}': 'urgent', // ‼️
  '\u{1F6A8}': 'urgent', // 🚨
  // Orange variants = high
  '\u{1F7E0}': 'high', // 🟠
  '\u{1F525}': 'high', // 🔥
  '\u{26A0}': 'high', // ⚠️
  // Yellow variants = medium
  '\u{1F7E1}': 'medium', // 🟡
  '\u{2B50}': 'medium', // ⭐
  // Green variants = low
  '\u{1F7E2}': 'low', // 🟢
  '\u{2705}': 'low', // ✅
}

// ============================================================================
// EXTRACTION FUNCTIONS
// ============================================================================

/**
 * Extract all tasks from markdown content
 *
 * @param content - Markdown content to parse
 * @returns Array of extracted checkboxes with metadata
 */
export function extractTasks(content: string): ExtractedCheckbox[] {
  const lines = content.split('\n')
  const tasks: ExtractedCheckbox[] = []

  lines.forEach((line, index) => {
    const match = line.match(CHECKBOX_PATTERN)
    if (match) {
      const [, indent, status, text] = match
      const checked = status.toLowerCase() === 'x'
      const indentLevel = Math.floor(indent.length / 2)

      tasks.push({
        lineNumber: index + 1, // 1-indexed for user display
        text: cleanTaskText(text),
        checked,
        indentLevel,
        raw: line,
        priority: detectPriority(text),
        dueDate: extractDueDate(text),
      })
    }
  })

  return tasks
}

/**
 * Extract tasks and create a strand mapping
 *
 * @param content - Markdown content
 * @param strandPath - Path to the source strand
 * @returns StrandTaskMapping object
 */
export function extractStrandTasks(content: string, strandPath: string): StrandTaskMapping {
  return {
    strandPath,
    checkboxes: extractTasks(content),
    lastExtractedAt: new Date().toISOString(),
  }
}

/**
 * Clean task text by removing metadata annotations
 *
 * @param text - Raw task text
 * @returns Cleaned text without @due, @priority, etc.
 */
export function cleanTaskText(text: string): string {
  return text
    .replace(DUE_DATE_PATTERN, '')
    .replace(PRIORITY_PATTERN, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Detect priority from task text
 *
 * @param text - Task text to analyze
 * @returns Detected priority or undefined
 */
export function detectPriority(text: string): TaskPriority | undefined {
  // Check for priority annotation
  const priorityMatch = text.match(PRIORITY_PATTERN)
  if (priorityMatch) {
    return priorityMatch[1].toLowerCase() as TaskPriority
  }

  // Check for priority emojis
  for (const [emoji, priority] of Object.entries(PRIORITY_EMOJI_MAP)) {
    if (text.includes(emoji)) {
      return priority
    }
  }

  // Check for keyword-based priority (case insensitive)
  const lowerText = text.toLowerCase()
  if (lowerText.includes('urgent') || lowerText.includes('asap') || lowerText.includes('critical')) {
    return 'urgent'
  }
  if (lowerText.includes('important') || lowerText.includes('high priority')) {
    return 'high'
  }

  return undefined
}

/**
 * Extract due date from task text
 *
 * @param text - Task text containing @due annotation
 * @returns ISO date string or undefined
 */
export function extractDueDate(text: string): string | undefined {
  const match = text.match(DUE_DATE_PATTERN)
  if (!match) return undefined

  const dateStr = match[1].trim()
  return parseNaturalDate(dateStr)
}

/**
 * Parse natural language date strings
 *
 * Supports:
 * - ISO dates: 2024-01-15
 * - US dates: 01/15/2024, 1/15/24
 * - Relative: today, tomorrow, next week, next month
 * - Days: monday, tuesday, etc.
 * - Shortcuts: mon, tue, wed, etc.
 *
 * @param dateStr - Date string to parse
 * @returns ISO date string (YYYY-MM-DD) or undefined
 */
export function parseNaturalDate(dateStr: string): string | undefined {
  const now = new Date()
  const lower = dateStr.toLowerCase().trim()

  // Handle relative dates
  switch (lower) {
    case 'today':
      return format(now, 'yyyy-MM-dd')
    case 'tomorrow':
      return format(addDays(now, 1), 'yyyy-MM-dd')
    case 'yesterday':
      return format(addDays(now, -1), 'yyyy-MM-dd')
    case 'next week':
    case 'nextweek':
      return format(addWeeks(now, 1), 'yyyy-MM-dd')
    case 'next month':
    case 'nextmonth':
      return format(addMonths(now, 1), 'yyyy-MM-dd')
    case 'this weekend':
    case 'weekend':
      return format(endOfWeek(now), 'yyyy-MM-dd')
    case 'end of week':
    case 'eow':
      return format(nextFriday(now), 'yyyy-MM-dd')
    case 'start of week':
    case 'sow':
      return format(startOfWeek(addWeeks(now, 1)), 'yyyy-MM-dd')
  }

  // Handle day names
  const dayMap: Record<string, () => Date> = {
    monday: () => nextMonday(now),
    mon: () => nextMonday(now),
    tuesday: () => addDays(nextMonday(now), 1),
    tue: () => addDays(nextMonday(now), 1),
    wednesday: () => addDays(nextMonday(now), 2),
    wed: () => addDays(nextMonday(now), 2),
    thursday: () => addDays(nextMonday(now), 3),
    thu: () => addDays(nextMonday(now), 3),
    friday: () => nextFriday(now),
    fri: () => nextFriday(now),
    saturday: () => addDays(nextFriday(now), 1),
    sat: () => addDays(nextFriday(now), 1),
    sunday: () => addDays(nextFriday(now), 2),
    sun: () => addDays(nextFriday(now), 2),
  }

  if (dayMap[lower]) {
    return format(dayMap[lower](), 'yyyy-MM-dd')
  }

  // Handle "+Xd" or "+Xw" format
  const relativeMatch = lower.match(/^\+(\d+)([dwm])$/)
  if (relativeMatch) {
    const amount = parseInt(relativeMatch[1], 10)
    const unit = relativeMatch[2]
    switch (unit) {
      case 'd':
        return format(addDays(now, amount), 'yyyy-MM-dd')
      case 'w':
        return format(addWeeks(now, amount), 'yyyy-MM-dd')
      case 'm':
        return format(addMonths(now, amount), 'yyyy-MM-dd')
    }
  }

  // Try parsing as ISO date (YYYY-MM-DD)
  const isoDate = parse(dateStr, 'yyyy-MM-dd', now)
  if (isValid(isoDate)) {
    return format(isoDate, 'yyyy-MM-dd')
  }

  // Try parsing as US date (MM/DD/YYYY or M/D/YYYY)
  const usDate = parse(dateStr, 'M/d/yyyy', now)
  if (isValid(usDate)) {
    return format(usDate, 'yyyy-MM-dd')
  }

  // Try parsing as short US date (MM/DD/YY or M/D/YY)
  const shortUsDate = parse(dateStr, 'M/d/yy', now)
  if (isValid(shortUsDate)) {
    return format(shortUsDate, 'yyyy-MM-dd')
  }

  // Try parsing as European date (DD.MM.YYYY)
  const euDate = parse(dateStr, 'd.M.yyyy', now)
  if (isValid(euDate)) {
    return format(euDate, 'yyyy-MM-dd')
  }

  return undefined
}

// ============================================================================
// MARKDOWN UPDATE FUNCTIONS
// ============================================================================

/**
 * Update a checkbox state in markdown content
 *
 * @param content - Original markdown content
 * @param lineNumber - 1-indexed line number of the checkbox
 * @param checked - New checked state
 * @returns Updated markdown content
 */
export function updateCheckboxState(content: string, lineNumber: number, checked: boolean): string {
  const lines = content.split('\n')
  const lineIndex = lineNumber - 1 // Convert to 0-indexed

  if (lineIndex < 0 || lineIndex >= lines.length) {
    console.warn(`[TaskParser] Line ${lineNumber} out of bounds`)
    return content
  }

  const line = lines[lineIndex]
  const match = line.match(CHECKBOX_PATTERN)

  if (!match) {
    console.warn(`[TaskParser] Line ${lineNumber} is not a checkbox`)
    return content
  }

  // Replace the checkbox status
  const newStatus = checked ? 'x' : ' '
  lines[lineIndex] = line.replace(/\[([ xX])\]/, `[${newStatus}]`)

  return lines.join('\n')
}

/**
 * Add a new task checkbox to markdown content
 *
 * @param content - Original markdown content
 * @param text - Task text
 * @param options - Additional options (priority, dueDate, insertAfterLine)
 * @returns Updated markdown content
 */
export function addTaskToContent(
  content: string,
  text: string,
  options: {
    priority?: TaskPriority
    dueDate?: string
    insertAfterLine?: number
    indent?: number
  } = {}
): string {
  const { priority, dueDate, insertAfterLine, indent = 0 } = options
  const lines = content.split('\n')

  // Build the task line
  let taskLine = `${' '.repeat(indent * 2)}- [ ] ${text}`

  // Add priority emoji if specified
  if (priority) {
    const priorityEmoji: Record<TaskPriority, string> = {
      urgent: '\u{1F534}', // 🔴
      high: '\u{1F7E0}', // 🟠
      medium: '\u{1F7E1}', // 🟡
      low: '\u{1F7E2}', // 🟢
    }
    taskLine = `${' '.repeat(indent * 2)}- [ ] ${priorityEmoji[priority]} ${text}`
  }

  // Add due date annotation if specified
  if (dueDate) {
    taskLine += ` @due(${dueDate})`
  }

  // Insert the task
  if (insertAfterLine !== undefined && insertAfterLine >= 0 && insertAfterLine <= lines.length) {
    lines.splice(insertAfterLine, 0, taskLine)
  } else {
    // Append to end
    lines.push(taskLine)
  }

  return lines.join('\n')
}

/**
 * Remove a task checkbox from markdown content
 *
 * @param content - Original markdown content
 * @param lineNumber - 1-indexed line number to remove
 * @returns Updated markdown content
 */
export function removeTaskFromContent(content: string, lineNumber: number): string {
  const lines = content.split('\n')
  const lineIndex = lineNumber - 1

  if (lineIndex < 0 || lineIndex >= lines.length) {
    return content
  }

  lines.splice(lineIndex, 1)
  return lines.join('\n')
}

/**
 * Update task text in markdown content
 *
 * @param content - Original markdown content
 * @param lineNumber - 1-indexed line number
 * @param newText - New task text (without checkbox prefix)
 * @returns Updated markdown content
 */
export function updateTaskText(content: string, lineNumber: number, newText: string): string {
  const lines = content.split('\n')
  const lineIndex = lineNumber - 1

  if (lineIndex < 0 || lineIndex >= lines.length) {
    return content
  }

  const line = lines[lineIndex]
  const match = line.match(CHECKBOX_PATTERN)

  if (!match) {
    return content
  }

  const [, indent, status] = match
  lines[lineIndex] = `${indent}- [${status}] ${newText}`

  return lines.join('\n')
}

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Check if a line is a valid checkbox
 *
 * @param line - Line to check
 * @returns true if line is a checkbox
 */
export function isCheckboxLine(line: string): boolean {
  return CHECKBOX_PATTERN.test(line)
}

/**
 * Get the checkbox status from a line
 *
 * @param line - Line to check
 * @returns 'checked' | 'unchecked' | null
 */
export function getCheckboxStatus(line: string): 'checked' | 'unchecked' | null {
  const match = line.match(CHECKBOX_PATTERN)
  if (!match) return null
  return match[2].toLowerCase() === 'x' ? 'checked' : 'unchecked'
}

/**
 * Count total checkboxes in content
 *
 * @param content - Markdown content
 * @returns Object with total, checked, and unchecked counts
 */
export function countCheckboxes(content: string): { total: number; checked: number; unchecked: number } {
  const tasks = extractTasks(content)
  const checked = tasks.filter((t) => t.checked).length
  return {
    total: tasks.length,
    checked,
    unchecked: tasks.length - checked,
  }
}
