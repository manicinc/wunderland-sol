/**
 * Daily Notes System
 * @module lib/dailyNotes
 *
 * @description
 * Tana-inspired daily notes with /today command support.
 * Auto-creates daily notes in journal/daily/ weave.
 *
 * Features:
 * - Quick access to today's note via /today
 * - Auto-creation if note doesn't exist
 * - Template with date, tasks due today, quick capture sections
 * - Navigate to yesterday/tomorrow
 */

import { getDatabase } from '@/lib/codexDatabase'
import { nanoid } from 'nanoid'

// ============================================================================
// TYPES
// ============================================================================

export interface DailyNote {
  date: string // YYYY-MM-DD
  strandPath: string
  title: string
  createdAt: string
  updatedAt: string
}

export interface DailyNoteTemplate {
  title: string
  content: string
  frontmatter: Record<string, unknown>
}

// ============================================================================
// DATE UTILITIES
// ============================================================================

/**
 * Format date as YYYY-MM-DD
 */
export function formatDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Format date for display (e.g., "December 25, 2025")
 */
export function formatDateDisplay(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/**
 * Format date for title (e.g., "December 25, 2025")
 */
export function formatDateTitle(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/**
 * Parse YYYY-MM-DD to Date object
 */
export function parseDateKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split('-').map(Number)
  return new Date(year, month - 1, day)
}

/**
 * Get today's date key
 */
export function getTodayKey(): string {
  return formatDateKey(new Date())
}

/**
 * Get yesterday's date key
 */
export function getYesterdayKey(): string {
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  return formatDateKey(yesterday)
}

/**
 * Get tomorrow's date key
 */
export function getTomorrowKey(): string {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  return formatDateKey(tomorrow)
}

/**
 * Get relative date from today
 */
export function getRelativeDateKey(daysOffset: number): string {
  const date = new Date()
  date.setDate(date.getDate() + daysOffset)
  return formatDateKey(date)
}

// ============================================================================
// PATH UTILITIES
// ============================================================================

const DAILY_NOTES_WEAVE = 'journal'
const DAILY_NOTES_LOOM = 'daily'

/**
 * Get the strand path for a daily note
 * Format: weaves/journal/daily/YYYY-MM-DD
 */
export function getDailyNotePath(dateKey: string): string {
  return `weaves/${DAILY_NOTES_WEAVE}/${DAILY_NOTES_LOOM}/${dateKey}`
}

/**
 * Get today's note path
 */
export function getTodayNotePath(): string {
  return getDailyNotePath(getTodayKey())
}

/**
 * Check if a path is a daily note
 */
export function isDailyNotePath(path: string): boolean {
  return path.startsWith(`weaves/${DAILY_NOTES_WEAVE}/${DAILY_NOTES_LOOM}/`)
}

/**
 * Extract date key from daily note path
 */
export function getDateFromPath(path: string): string | null {
  const match = path.match(/weaves\/journal\/daily\/(\d{4}-\d{2}-\d{2})/)
  return match ? match[1] : null
}

// ============================================================================
// TEMPLATE GENERATION
// ============================================================================

/**
 * Generate template for a daily note
 */
export function getDailyNoteTemplate(date: Date): DailyNoteTemplate {
  const dateKey = formatDateKey(date)
  const displayDate = formatDateTitle(date)
  const weekday = date.toLocaleDateString('en-US', { weekday: 'long' })
  const now = new Date().toISOString()

  const content = `# ${displayDate}

## ${weekday} Intentions

-

## Tasks Due Today

\`\`\`query
#task due_date:${dateKey} status:!=completed @sort:priority desc
\`\`\`

## Notes



## Quick Capture

> Use this section for quick thoughts throughout the day



## Evening Reflection

**What went well today?**
-

**What could be improved?**
-

**Key insight:**


---
*Daily note created: ${now}*
`

  const frontmatter = {
    title: displayDate,
    date: dateKey,
    type: 'daily-note',
    tags: ['daily', 'journal'],
    created: now,
    updated: now,
  }

  return {
    title: displayDate,
    content,
    frontmatter,
  }
}

/**
 * Generate minimal quick capture template
 */
export function getQuickCaptureTemplate(date: Date): string {
  const timestamp = date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  })
  return `\n- [${timestamp}] `
}

// ============================================================================
// DATABASE OPERATIONS
// ============================================================================

/**
 * Initialize daily notes table
 */
export async function initDailyNotesSchema(): Promise<void> {
  const db = await getDatabase()
  if (!db) return

  await db.exec(`
    CREATE TABLE IF NOT EXISTS daily_notes (
      date TEXT PRIMARY KEY,
      strand_path TEXT NOT NULL,
      title TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `)

  await db.exec(`
    CREATE INDEX IF NOT EXISTS idx_daily_notes_path ON daily_notes(strand_path)
  `)
}

/**
 * Get daily note record by date
 */
export async function getDailyNote(dateKey: string): Promise<DailyNote | null> {
  const db = await getDatabase()
  if (!db) return null

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = await (db as any).all(
      `SELECT date, strand_path, title, created_at, updated_at
       FROM daily_notes
       WHERE date = ?`,
      [dateKey]
    ) as Array<{
      date: string
      strand_path: string
      title: string
      created_at: string
      updated_at: string
    }> | null

    if (!rows || rows.length === 0) {
      return null
    }

    const row = rows[0]
    return {
      date: row.date,
      strandPath: row.strand_path,
      title: row.title,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  } catch (error) {
    console.error('[DailyNotes] Failed to get daily note:', error)
    return null
  }
}

/**
 * Check if daily note exists
 */
export async function dailyNoteExists(dateKey: string): Promise<boolean> {
  const note = await getDailyNote(dateKey)
  return note !== null
}

/**
 * Save daily note record
 */
export async function saveDailyNote(note: DailyNote): Promise<void> {
  const db = await getDatabase()
  if (!db) return

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (db as any).run(
      `INSERT OR REPLACE INTO daily_notes (date, strand_path, title, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)`,
      [note.date, note.strandPath, note.title, note.createdAt, note.updatedAt]
    )
  } catch (error) {
    console.error('[DailyNotes] Failed to save daily note:', error)
  }
}

/**
 * Get or create daily note for a date
 * Returns the path to navigate to
 */
export async function getOrCreateDailyNote(dateKey: string): Promise<{
  path: string
  isNew: boolean
  template?: DailyNoteTemplate
}> {
  // Check if note already exists
  const existing = await getDailyNote(dateKey)
  if (existing) {
    return {
      path: existing.strandPath,
      isNew: false,
    }
  }

  // Generate new note
  const date = parseDateKey(dateKey)
  const template = getDailyNoteTemplate(date)
  const path = getDailyNotePath(dateKey)
  const now = new Date().toISOString()

  // Save record
  await saveDailyNote({
    date: dateKey,
    strandPath: path,
    title: template.title,
    createdAt: now,
    updatedAt: now,
  })

  return {
    path,
    isNew: true,
    template,
  }
}

/**
 * Get recent daily notes (for sidebar widget)
 */
export async function getRecentDailyNotes(limit = 7): Promise<DailyNote[]> {
  const db = await getDatabase()
  if (!db) return []

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = await (db as any).all(
      `SELECT date, strand_path, title, created_at, updated_at
       FROM daily_notes
       ORDER BY date DESC
       LIMIT ?`,
      [limit]
    ) as Array<{
      date: string
      strand_path: string
      title: string
      created_at: string
      updated_at: string
    }> | null

    if (!rows || rows.length === 0) {
      return []
    }

    return rows.map(row => ({
      date: row.date,
      strandPath: row.strand_path,
      title: row.title,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }))
  } catch (error) {
    console.error('[DailyNotes] Failed to get recent daily notes:', error)
    return []
  }
}

/**
 * Get daily notes in date range
 */
export async function getDailyNotesInRange(
  startDate: string,
  endDate: string
): Promise<DailyNote[]> {
  const db = await getDatabase()
  if (!db) return []

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = await (db as any).all(
      `SELECT date, strand_path, title, created_at, updated_at
       FROM daily_notes
       WHERE date >= ? AND date <= ?
       ORDER BY date DESC`,
      [startDate, endDate]
    ) as Array<{
      date: string
      strand_path: string
      title: string
      created_at: string
      updated_at: string
    }> | null

    if (!rows || rows.length === 0) {
      return []
    }

    return rows.map(row => ({
      date: row.date,
      strandPath: row.strand_path,
      title: row.title,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }))
  } catch (error) {
    console.error('[DailyNotes] Failed to get daily notes in range:', error)
    return []
  }
}

// ============================================================================
// COMMAND HANDLERS
// ============================================================================

export type DailyNoteCommand = '/today' | '/yesterday' | '/tomorrow' | string

/**
 * Parse daily note command and return target date key
 */
export function parseDailyNoteCommand(command: string): string | null {
  const cmd = command.toLowerCase().trim()

  if (cmd === '/today' || cmd === 'today') {
    return getTodayKey()
  }

  if (cmd === '/yesterday' || cmd === 'yesterday') {
    return getYesterdayKey()
  }

  if (cmd === '/tomorrow' || cmd === 'tomorrow') {
    return getTomorrowKey()
  }

  // Check for date format /YYYY-MM-DD
  const dateMatch = cmd.match(/^\/?(\d{4}-\d{2}-\d{2})$/)
  if (dateMatch) {
    return dateMatch[1]
  }

  // Check for relative offset like /+1 or /-3
  const offsetMatch = cmd.match(/^\/([+-]\d+)$/)
  if (offsetMatch) {
    const offset = parseInt(offsetMatch[1], 10)
    return getRelativeDateKey(offset)
  }

  return null
}

/**
 * Handle daily note navigation command
 * Returns the path to navigate to and whether to create a draft
 */
export async function handleDailyNoteCommand(command: string): Promise<{
  success: boolean
  path?: string
  isNew?: boolean
  template?: DailyNoteTemplate
  error?: string
}> {
  const dateKey = parseDailyNoteCommand(command)

  if (!dateKey) {
    return {
      success: false,
      error: `Unknown daily note command: ${command}`,
    }
  }

  try {
    const result = await getOrCreateDailyNote(dateKey)
    return {
      success: true,
      path: result.path,
      isNew: result.isNew,
      template: result.template,
    }
  } catch (error) {
    return {
      success: false,
      error: `Failed to get/create daily note: ${error}`,
    }
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  // Date utilities
  formatDateKey,
  formatDateDisplay,
  formatDateTitle,
  parseDateKey,
  getTodayKey,
  getYesterdayKey,
  getTomorrowKey,
  getRelativeDateKey,

  // Path utilities
  getDailyNotePath,
  getTodayNotePath,
  isDailyNotePath,
  getDateFromPath,

  // Template
  getDailyNoteTemplate,
  getQuickCaptureTemplate,

  // Database
  initDailyNotesSchema,
  getDailyNote,
  dailyNoteExists,
  saveDailyNote,
  getOrCreateDailyNote,
  getRecentDailyNotes,
  getDailyNotesInRange,

  // Commands
  parseDailyNoteCommand,
  handleDailyNoteCommand,
}
