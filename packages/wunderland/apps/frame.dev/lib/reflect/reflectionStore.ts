/**
 * Reflection Store
 * @module lib/reflect/reflectionStore
 *
 * Storage and CRUD operations for reflections.
 * Extends and wraps the daily notes system.
 */

import { getDatabase } from '@/lib/codexDatabase'
import type { MoodState, SleepHours } from '@/lib/codex/mood'
import type { SyncStatus } from '@/lib/publish/types'
import {
  type Reflection,
  type ReflectionMetadata,
  type ReflectionTemplate,
  type ReflectionTemplateOptions,
  type ReflectionStreak,
  type CalendarDayMarker,
  type StoredRelationship,
  type RelationshipTag,
  type MoodTrendPoint,
  type YearSummary,
  type MonthSummary,
  type WeekSummary,
  getReflectionTimeOfDay,
  REFLECTIONS_WEAVE,
  RELATIONSHIPS_STORAGE_KEY,
  MOOD_VALUES,
} from './types'

// ============================================================================
// LAZY SCHEMA INITIALIZATION
// ============================================================================

let schemaInitialized = false
let schemaInitPromise: Promise<void> | null = null

/**
 * Ensure reflections schema is initialized (lazy, singleton)
 * Call this before any reflections query to ensure table exists
 * Note: Uses dynamic call to initReflectionsSchema to avoid circular dependency
 */
async function ensureSchemaInitialized(): Promise<void> {
  if (schemaInitialized) return
  if (schemaInitPromise) {
    await schemaInitPromise
    return
  }
  // Dynamic late-binding to avoid forward reference issue
  const initFn = initReflectionsSchemaImpl
  schemaInitPromise = initFn().then(() => {
    schemaInitialized = true
  }).catch((err) => {
    console.error('[ReflectionStore] Failed to initialize schema:', err)
    schemaInitPromise = null
  })
  await schemaInitPromise
}

// Forward declaration - actual implementation below
// eslint-disable-next-line prefer-const, @typescript-eslint/no-explicit-any
let initReflectionsSchemaImpl: () => Promise<void> = async () => {}

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
 * Format date for display (e.g., "Friday, December 27, 2024")
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
 * Format date for title (e.g., "December 27, 2024")
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
 * Get relative date key
 */
export function getRelativeDateKey(daysOffset: number): string {
  const date = new Date()
  date.setDate(date.getDate() + daysOffset)
  return formatDateKey(date)
}

/**
 * Get ISO week number (1-53)
 * Week 1 is the week containing the first Thursday of the year
 */
export function getISOWeekNumber(date: Date): number {
  const d = new Date(date.getTime())
  d.setHours(0, 0, 0, 0)
  // Set to Thursday of current week (ISO weeks start on Monday)
  d.setDate(d.getDate() + 4 - (d.getDay() || 7))
  const yearStart = new Date(d.getFullYear(), 0, 1)
  const weekNumber = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  return weekNumber
}

/**
 * Get the start and end dates for a given ISO week
 */
export function getWeekDateRange(year: number, weekNumber: number): { start: Date; end: Date } {
  // Find the first Thursday of the year
  const jan1 = new Date(year, 0, 1)
  const dayOfWeek = jan1.getDay() || 7 // Convert Sunday (0) to 7

  // First Thursday is on day (4 - dayOfWeek + 7) % 7 + 1
  const firstThursday = new Date(year, 0, 1 + ((4 - dayOfWeek + 7) % 7))

  // Week 1 starts on the Monday before the first Thursday
  const week1Start = new Date(firstThursday)
  week1Start.setDate(firstThursday.getDate() - 3)

  // Calculate the start of the requested week
  const start = new Date(week1Start)
  start.setDate(week1Start.getDate() + (weekNumber - 1) * 7)

  // End is 6 days after start (Sunday)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)

  return { start, end }
}

/**
 * Get month name from month number (1-12)
 */
export function getMonthName(month: number): string {
  const date = new Date(2000, month - 1, 1)
  return date.toLocaleString('en-US', { month: 'long' })
}

// ============================================================================
// PATH UTILITIES
// ============================================================================

/**
 * Get the strand path for a reflection
 * Format: weaves/reflections/YYYY-MM-DD
 */
export function getReflectionPath(dateKey: string): string {
  return `weaves/${REFLECTIONS_WEAVE}/${dateKey}`
}

/**
 * Get today's reflection path
 */
export function getTodayReflectionPath(): string {
  return getReflectionPath(getTodayKey())
}

/**
 * Check if a path is a reflection
 */
export function isReflectionPath(path: string): boolean {
  return path.startsWith(`weaves/${REFLECTIONS_WEAVE}/`)
}

/**
 * Extract date key from reflection path
 */
export function getDateFromPath(path: string): string | null {
  const match = path.match(new RegExp(`weaves/${REFLECTIONS_WEAVE}/(\\d{4}-\\d{2}-\\d{2})`))
  return match ? match[1] : null
}

// ============================================================================
// TEMPLATE GENERATION
// ============================================================================

/**
 * Generate template for a new reflection
 */
export function getReflectionTemplate(
  date: Date,
  options: ReflectionTemplateOptions = {}
): ReflectionTemplate {
  const dateKey = formatDateKey(date)
  const displayDate = formatDateTitle(date)
  const weekday = date.toLocaleDateString('en-US', { weekday: 'long' })
  const now = new Date().toISOString()
  const timeOfDay = options.timeOfDay || getReflectionTimeOfDay()

  // Build empty sections - the StructuredReflectionEditor provides its own placeholders
  // We just need the section headers for structure
  let sections = ''

  // Always create the structured sections for the StructuredReflectionEditor
  // Leave content empty so the editor can show its own placeholders
  sections = `## Morning Intentions


## Notes & Thoughts


## What Got Done


## Evening Reflection

`

  // Add planner section if requested
  const plannerSection = options.includePlanner ? `
## Today's Tasks

\`\`\`query
#task due_date:${dateKey} status:!=completed @sort:priority desc
\`\`\`

## Events

\`\`\`query
#event date:${dateKey} @sort:start_time asc
\`\`\`
` : ''

  // Clean template for StructuredReflectionEditor - just section headers
  // No date header or footer needed - the editor handles display
  const content = (sections + plannerSection).trim()

  const frontmatter: Record<string, unknown> = {
    title: displayDate,
    date: dateKey,
    type: 'reflection',
    tags: ['reflection'],
    created: now,
    updated: now,
  }

  if (options.mood) {
    frontmatter.mood = options.mood
  }

  return {
    title: displayDate,
    content,
    frontmatter,
  }
}

// ============================================================================
// DATABASE OPERATIONS
// ============================================================================

/**
 * Initialize reflections table
 */
export async function initReflectionsSchema(): Promise<void> {
  const db = await getDatabase()
  if (!db) return

  await db.exec(`
    CREATE TABLE IF NOT EXISTS reflections (
      date TEXT PRIMARY KEY,
      strand_path TEXT NOT NULL,
      title TEXT NOT NULL,
      metadata TEXT,
      word_count INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      content TEXT
    )
  `)

  // Add content column if it doesn't exist (migration for existing tables)
  try {
    await db.exec(`ALTER TABLE reflections ADD COLUMN content TEXT`)
  } catch {
    // Column already exists, ignore error
  }

  // Migration: Add sync_status columns for batch publishing
  const syncColumns = [
    { name: 'sync_status', definition: 'TEXT DEFAULT \'local\'' },
    { name: 'published_at', definition: 'TEXT' },
    { name: 'published_commit', definition: 'TEXT' },
    { name: 'published_content_hash', definition: 'TEXT' },
    { name: 'last_sync_attempt', definition: 'TEXT' },
    { name: 'sync_error', definition: 'TEXT' },
    { name: 'batch_id', definition: 'TEXT' },
  ]

  for (const col of syncColumns) {
    try {
      await db.exec(`ALTER TABLE reflections ADD COLUMN ${col.name} ${col.definition}`)
    } catch {
      // Column already exists, ignore error
    }
  }

  await db.exec(`
    CREATE INDEX IF NOT EXISTS idx_reflections_path ON reflections(strand_path)
  `)

  await db.exec(`
    CREATE INDEX IF NOT EXISTS idx_reflections_date ON reflections(date)
  `)

  // Index for sync status queries
  await db.exec(`
    CREATE INDEX IF NOT EXISTS idx_reflections_sync_status ON reflections(sync_status)
  `)

  // Index for batch queries
  await db.exec(`
    CREATE INDEX IF NOT EXISTS idx_reflections_batch ON reflections(batch_id)
  `)
}

// Assign to the forward declaration for lazy initialization
initReflectionsSchemaImpl = initReflectionsSchema

/**
 * Get reflection by date
 */
export async function getReflection(dateKey: string): Promise<Reflection | null> {
  await ensureSchemaInitialized()
  const db = await getDatabase()
  if (!db) return null

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = await (db as any).all(
      `SELECT date, strand_path, title, metadata, word_count, created_at, updated_at, content,
              sync_status, published_at, published_commit, published_content_hash,
              last_sync_attempt, sync_error, batch_id
       FROM reflections
       WHERE date = ?`,
      [dateKey]
    ) as Array<{
      date: string
      strand_path: string
      title: string
      metadata: string | null
      word_count: number
      created_at: string
      updated_at: string
      content: string | null
      sync_status: string | null
      published_at: string | null
      published_commit: string | null
      published_content_hash: string | null
      last_sync_attempt: string | null
      sync_error: string | null
      batch_id: string | null
    }> | null

    if (!rows || rows.length === 0) {
      return null
    }

    const row = rows[0]
    return {
      date: row.date,
      strandPath: row.strand_path,
      title: row.title,
      metadata: row.metadata ? JSON.parse(row.metadata) : {},
      wordCount: row.word_count,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      content: row.content || undefined,
      syncStatus: (row.sync_status as SyncStatus) || 'local',
      publishedAt: row.published_at || undefined,
      publishedCommit: row.published_commit || undefined,
      publishedContentHash: row.published_content_hash || undefined,
      lastSyncAttempt: row.last_sync_attempt || undefined,
      syncError: row.sync_error || undefined,
      batchId: row.batch_id || undefined,
    }
  } catch (error) {
    console.error('[ReflectionStore] Failed to get reflection:', error)
    return null
  }
}

/**
 * Check if reflection exists
 */
export async function reflectionExists(dateKey: string): Promise<boolean> {
  const reflection = await getReflection(dateKey)
  return reflection !== null
}

/**
 * Save reflection
 */
export async function saveReflection(reflection: Reflection, content?: string): Promise<void> {
  const db = await getDatabase()
  if (!db) return

  try {
    const metadataJson = JSON.stringify(reflection.metadata || {})
    const contentToSave = content ?? reflection.content ?? null

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (db as any).run(
      `INSERT OR REPLACE INTO reflections
       (date, strand_path, title, metadata, word_count, created_at, updated_at, content)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        reflection.date,
        reflection.strandPath,
        reflection.title,
        metadataJson,
        reflection.wordCount || 0,
        reflection.createdAt,
        reflection.updatedAt,
        contentToSave,
      ]
    )
  } catch (error) {
    console.error('[ReflectionStore] Failed to save reflection:', error)
  }
}

/**
 * Update reflection metadata
 */
export async function updateReflectionMetadata(
  dateKey: string,
  metadata: Partial<ReflectionMetadata>
): Promise<void> {
  const existing = await getReflection(dateKey)
  if (!existing) return

  const updatedMetadata = { ...existing.metadata, ...metadata }
  await saveReflection({
    ...existing,
    metadata: updatedMetadata,
    updatedAt: new Date().toISOString(),
  })
}

/**
 * Set mood for a reflection
 */
export async function setReflectionMood(dateKey: string, mood: MoodState): Promise<void> {
  await updateReflectionMetadata(dateKey, {
    mood,
    moodSetAt: new Date().toISOString(),
  })
}

/**
 * Set sleep for a reflection
 */
export async function setReflectionSleep(dateKey: string, sleepHours: SleepHours): Promise<void> {
  await updateReflectionMetadata(dateKey, {
    sleepHours,
    sleepSetAt: new Date().toISOString(),
  })
}

/**
 * Get or create reflection for a date
 */
export async function getOrCreateReflection(
  dateKey: string,
  options: ReflectionTemplateOptions = {}
): Promise<{
  reflection: Reflection
  isNew: boolean
  template?: ReflectionTemplate
  content: string
}> {
  const existing = await getReflection(dateKey)
  if (existing) {
    // Return existing reflection with its content
    return {
      reflection: existing,
      isNew: false,
      content: existing.content || ''
    }
  }

  const date = parseDateKey(dateKey)
  const template = getReflectionTemplate(date, options)
  const now = new Date().toISOString()

  const reflection: Reflection = {
    date: dateKey,
    strandPath: getReflectionPath(dateKey),
    title: template.title,
    metadata: options.mood ? { mood: options.mood, moodSetAt: now } : {},
    createdAt: now,
    updatedAt: now,
    content: template.content,
  }

  await saveReflection(reflection, template.content)

  return { reflection, isNew: true, template, content: template.content }
}

// ============================================================================
// QUERY OPERATIONS
// ============================================================================

/**
 * Get recent reflections
 */
export async function getRecentReflections(limit = 7): Promise<Reflection[]> {
  const db = await getDatabase()
  if (!db) return []

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    // Filter out empty reflections (word_count = 0) - these are just touched/opened but not written
    const rows = await (db as any).all(
      `SELECT date, strand_path, title, metadata, word_count, created_at, updated_at
       FROM reflections
       WHERE word_count > 0
       ORDER BY date DESC
       LIMIT ?`,
      [limit]
    ) as Array<{
      date: string
      strand_path: string
      title: string
      metadata: string | null
      word_count: number
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
      metadata: row.metadata ? JSON.parse(row.metadata) : {},
      wordCount: row.word_count,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }))
  } catch (error) {
    console.error('[ReflectionStore] Failed to get recent reflections:', error)
    return []
  }
}

/**
 * Get reflections in date range
 */
export async function getReflectionsInRange(
  startDate: string,
  endDate: string
): Promise<Reflection[]> {
  const db = await getDatabase()
  if (!db) return []

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    // Filter out empty reflections - only include those with actual content
    const rows = await (db as any).all(
      `SELECT date, strand_path, title, metadata, word_count, created_at, updated_at
       FROM reflections
       WHERE date >= ? AND date <= ? AND word_count > 0
       ORDER BY date DESC`,
      [startDate, endDate]
    ) as Array<{
      date: string
      strand_path: string
      title: string
      metadata: string | null
      word_count: number
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
      metadata: row.metadata ? JSON.parse(row.metadata) : {},
      wordCount: row.word_count,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }))
  } catch (error) {
    console.error('[ReflectionStore] Failed to get reflections in range:', error)
    return []
  }
}

/**
 * Get calendar markers for a month
 */
export async function getCalendarMarkers(
  year: number,
  month: number
): Promise<CalendarDayMarker[]> {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`

  const reflections = await getReflectionsInRange(startDate, endDate)
  const markers: CalendarDayMarker[] = []

  // Generate markers for all days in the month
  for (let day = 1; day <= lastDay; day++) {
    const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const reflection = reflections.find(r => r.date === dateKey)

    markers.push({
      date: dateKey,
      hasReflection: !!reflection,
      mood: reflection?.metadata?.mood,
      wordCount: reflection?.wordCount,
    })
  }

  return markers
}

// ============================================================================
// HIERARCHY QUERIES (Year/Month/Week Browser)
// ============================================================================

/**
 * Calculate the dominant mood from a list of reflections
 */
function calculateDominantMood(
  reflections: Array<{ metadata?: ReflectionMetadata }>
): { mood?: MoodState; avgValue?: number } {
  const moods = reflections
    .map(r => r.metadata?.mood)
    .filter((m): m is MoodState => !!m)

  if (moods.length === 0) {
    return {}
  }

  // Count mood frequencies
  const moodCounts: Partial<Record<MoodState, number>> = {}
  let totalValue = 0

  for (const mood of moods) {
    moodCounts[mood] = (moodCounts[mood] || 0) + 1
    totalValue += MOOD_VALUES[mood]
  }

  // Find most common mood
  let dominantMood: MoodState | undefined
  let maxCount = 0
  for (const [mood, count] of Object.entries(moodCounts)) {
    if (count > maxCount) {
      maxCount = count
      dominantMood = mood as MoodState
    }
  }

  return {
    mood: dominantMood,
    avgValue: totalValue / moods.length,
  }
}

/**
 * Get all years that have reflections
 */
export async function getReflectionYears(): Promise<YearSummary[]> {
  await ensureSchemaInitialized()
  const db = await getDatabase()
  if (!db) return []

  try {
    // Get all reflections grouped by year (only with content)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = await (db as any).all(
      `SELECT
        substr(date, 1, 4) as year,
        COUNT(*) as count,
        SUM(word_count) as total_words,
        GROUP_CONCAT(metadata, '|||') as all_metadata
       FROM reflections
       WHERE word_count > 0
       GROUP BY substr(date, 1, 4)
       ORDER BY year DESC`
    ) as Array<{
      year: string
      count: number
      total_words: number | null
      all_metadata: string | null
    }> | null

    if (!rows || rows.length === 0) {
      return []
    }

    return rows.map(row => {
      // Parse moods from concatenated metadata
      const metadataStrings = row.all_metadata?.split('|||') || []
      const reflectionsWithMetadata = metadataStrings
        .filter(s => s)
        .map(s => {
          try {
            return { metadata: JSON.parse(s) as ReflectionMetadata }
          } catch {
            return { metadata: {} }
          }
        })

      const { mood, avgValue } = calculateDominantMood(reflectionsWithMetadata)

      return {
        year: parseInt(row.year, 10),
        count: row.count,
        totalWords: row.total_words || 0,
        dominantMood: mood,
        avgMoodValue: avgValue,
      }
    })
  } catch (error) {
    console.error('[ReflectionStore] Failed to get reflection years:', error)
    return []
  }
}

/**
 * Get months for a specific year
 */
export async function getReflectionMonths(year: number): Promise<MonthSummary[]> {
  const db = await getDatabase()
  if (!db) return []

  try {
    const yearStr = String(year)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    // Only count reflections with content
    const rows = await (db as any).all(
      `SELECT
        substr(date, 6, 2) as month,
        COUNT(*) as count,
        SUM(word_count) as total_words,
        GROUP_CONCAT(metadata, '|||') as all_metadata
       FROM reflections
       WHERE date LIKE ? AND word_count > 0
       GROUP BY substr(date, 6, 2)
       ORDER BY month DESC`,
      [`${yearStr}-%`]
    ) as Array<{
      month: string
      count: number
      total_words: number | null
      all_metadata: string | null
    }> | null

    if (!rows || rows.length === 0) {
      return []
    }

    return rows.map(row => {
      const monthNum = parseInt(row.month, 10)

      // Parse moods from concatenated metadata
      const metadataStrings = row.all_metadata?.split('|||') || []
      const reflectionsWithMetadata = metadataStrings
        .filter(s => s)
        .map(s => {
          try {
            return { metadata: JSON.parse(s) as ReflectionMetadata }
          } catch {
            return { metadata: {} }
          }
        })

      const { mood, avgValue } = calculateDominantMood(reflectionsWithMetadata)

      return {
        year,
        month: monthNum,
        monthName: getMonthName(monthNum),
        count: row.count,
        totalWords: row.total_words || 0,
        dominantMood: mood,
        avgMoodValue: avgValue,
      }
    })
  } catch (error) {
    console.error('[ReflectionStore] Failed to get reflection months:', error)
    return []
  }
}

/**
 * Get weeks for a specific year and month
 */
export async function getReflectionWeeks(year: number, month: number): Promise<WeekSummary[]> {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`

  const reflections = await getReflectionsInRange(startDate, endDate)

  if (reflections.length === 0) {
    return []
  }

  // Group reflections by week number
  const weekMap = new Map<number, Reflection[]>()

  for (const reflection of reflections) {
    const date = parseDateKey(reflection.date)
    const weekNumber = getISOWeekNumber(date)

    if (!weekMap.has(weekNumber)) {
      weekMap.set(weekNumber, [])
    }
    weekMap.get(weekNumber)!.push(reflection)
  }

  // Build week summaries
  const weeks: WeekSummary[] = []

  for (const [weekNumber, weekReflections] of weekMap) {
    const { start, end } = getWeekDateRange(year, weekNumber)
    const { mood } = calculateDominantMood(weekReflections)

    weeks.push({
      year,
      month,
      weekNumber,
      startDate: formatDateKey(start),
      endDate: formatDateKey(end),
      count: weekReflections.length,
      reflections: weekReflections.sort((a, b) => b.date.localeCompare(a.date)),
      dominantMood: mood,
    })
  }

  // Sort weeks in descending order
  return weeks.sort((a, b) => b.weekNumber - a.weekNumber)
}

/**
 * Get reflections for a specific time period
 */
export async function getReflectionsByPeriod(
  year: number,
  month?: number,
  weekNumber?: number
): Promise<Reflection[]> {
  if (weekNumber && month) {
    // Get reflections for a specific week
    const { start, end } = getWeekDateRange(year, weekNumber)
    return getReflectionsInRange(formatDateKey(start), formatDateKey(end))
  } else if (month) {
    // Get reflections for a specific month
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const lastDay = new Date(year, month, 0).getDate()
    const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`
    return getReflectionsInRange(startDate, endDate)
  } else {
    // Get reflections for a specific year
    const startDate = `${year}-01-01`
    const endDate = `${year}-12-31`
    return getReflectionsInRange(startDate, endDate)
  }
}

/**
 * Search reflections by content
 */
export async function searchReflections(query: string, limit = 50): Promise<Reflection[]> {
  const db = await getDatabase()
  if (!db || !query.trim()) return []

  try {
    const searchTerm = `%${query.toLowerCase()}%`
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    // Only search reflections with content
    const rows = await (db as any).all(
      `SELECT date, strand_path, title, metadata, word_count, created_at, updated_at, content
       FROM reflections
       WHERE word_count > 0 AND (LOWER(content) LIKE ? OR LOWER(title) LIKE ?)
       ORDER BY date DESC
       LIMIT ?`,
      [searchTerm, searchTerm, limit]
    ) as Array<{
      date: string
      strand_path: string
      title: string
      metadata: string | null
      word_count: number
      created_at: string
      updated_at: string
      content: string | null
    }> | null

    if (!rows || rows.length === 0) {
      return []
    }

    return rows.map(row => ({
      date: row.date,
      strandPath: row.strand_path,
      title: row.title,
      metadata: row.metadata ? JSON.parse(row.metadata) : {},
      wordCount: row.word_count,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      content: row.content || undefined,
    }))
  } catch (error) {
    console.error('[ReflectionStore] Failed to search reflections:', error)
    return []
  }
}

// ============================================================================
// ANALYTICS
// ============================================================================

/**
 * Get reflection streak
 */
export async function getReflectionStreak(): Promise<ReflectionStreak> {
  const db = await getDatabase()
  if (!db) {
    return { current: 0, longest: 0, thisWeek: 0, thisMonth: 0, total: 0 }
  }

  try {
    // Get all reflection dates (only those with content - word_count > 0)
    // Empty reflections (touched but not written) don't count toward streak
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = await (db as any).all(
      `SELECT date FROM reflections WHERE word_count > 0 ORDER BY date DESC`
    ) as Array<{ date: string }> | null

    if (!rows || rows.length === 0) {
      return { current: 0, longest: 0, thisWeek: 0, thisMonth: 0, total: 0 }
    }

    const dates = new Set(rows.map(r => r.date))
    const today = getTodayKey()
    const todayDate = new Date()

    // Calculate current streak
    let current = 0
    let checkDate = new Date()
    while (true) {
      const dateKey = formatDateKey(checkDate)
      if (dates.has(dateKey)) {
        current++
        checkDate.setDate(checkDate.getDate() - 1)
      } else if (current === 0 && dateKey === today) {
        // Allow today to be missing (haven't reflected yet today)
        checkDate.setDate(checkDate.getDate() - 1)
      } else {
        break
      }
    }

    // Calculate longest streak
    let longest = 0
    let streakCount = 0
    const sortedDates = Array.from(dates).sort().reverse()

    for (let i = 0; i < sortedDates.length; i++) {
      if (i === 0) {
        streakCount = 1
      } else {
        const prevDate = parseDateKey(sortedDates[i - 1])
        const currDate = parseDateKey(sortedDates[i])
        const diffDays = Math.floor((prevDate.getTime() - currDate.getTime()) / (1000 * 60 * 60 * 24))

        if (diffDays === 1) {
          streakCount++
        } else {
          longest = Math.max(longest, streakCount)
          streakCount = 1
        }
      }
    }
    longest = Math.max(longest, streakCount)

    // This week
    const weekStart = new Date(todayDate)
    weekStart.setDate(weekStart.getDate() - weekStart.getDay())
    let thisWeek = 0
    for (const dateStr of dates) {
      const date = parseDateKey(dateStr)
      if (date >= weekStart && date <= todayDate) {
        thisWeek++
      }
    }

    // This month
    const monthStart = new Date(todayDate.getFullYear(), todayDate.getMonth(), 1)
    let thisMonth = 0
    for (const dateStr of dates) {
      const date = parseDateKey(dateStr)
      if (date >= monthStart && date <= todayDate) {
        thisMonth++
      }
    }

    return {
      current,
      longest,
      thisWeek,
      thisMonth,
      total: dates.size,
    }
  } catch (error) {
    console.error('[ReflectionStore] Failed to get streak:', error)
    return { current: 0, longest: 0, thisWeek: 0, thisMonth: 0, total: 0 }
  }
}

/**
 * Get mood trend for the last N days
 */
export async function getMoodTrend(days = 30): Promise<MoodTrendPoint[]> {
  const today = new Date()
  const startDate = new Date(today)
  startDate.setDate(startDate.getDate() - days)

  const reflections = await getReflectionsInRange(
    formatDateKey(startDate),
    formatDateKey(today)
  )

  const points: MoodTrendPoint[] = []
  for (let i = 0; i <= days; i++) {
    const date = new Date(startDate)
    date.setDate(date.getDate() + i)
    const dateKey = formatDateKey(date)

    const reflection = reflections.find(r => r.date === dateKey)
    const mood = reflection?.metadata?.mood

    points.push({
      date: dateKey,
      mood,
      moodValue: mood ? MOOD_VALUES[mood] : undefined,
    })
  }

  return points
}

// ============================================================================
// RELATIONSHIP TRACKING
// ============================================================================

/**
 * Get all stored relationships
 */
export function getStoredRelationships(): StoredRelationship[] {
  if (typeof window === 'undefined') return []

  try {
    const stored = localStorage.getItem(RELATIONSHIPS_STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

/**
 * Save relationships
 */
function saveRelationships(relationships: StoredRelationship[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(RELATIONSHIPS_STORAGE_KEY, JSON.stringify(relationships))
}

/**
 * Track a relationship mention
 */
export function trackRelationshipMention(tag: RelationshipTag): void {
  const relationships = getStoredRelationships()
  const now = new Date().toISOString()

  const existing = relationships.find(r => r.handle === tag.handle)
  if (existing) {
    existing.lastMentioned = now
    existing.mentionCount++
    if (tag.name && !existing.name) existing.name = tag.name
    if (tag.category && !existing.category) existing.category = tag.category
  } else {
    relationships.push({
      ...tag,
      firstMentioned: now,
      lastMentioned: now,
      mentionCount: 1,
    })
  }

  saveRelationships(relationships)
}

/**
 * Get relationship suggestions based on history
 */
export function getRelationshipSuggestions(prefix: string): StoredRelationship[] {
  const relationships = getStoredRelationships()
  const normalized = prefix.toLowerCase().replace('@', '')

  return relationships
    .filter(r =>
      r.handle.toLowerCase().includes(normalized) ||
      (r.name && r.name.toLowerCase().includes(normalized))
    )
    .sort((a, b) => b.mentionCount - a.mentionCount)
    .slice(0, 10)
}

// ============================================================================
// SYNC STATUS OPERATIONS
// ============================================================================

/**
 * Update sync status for a reflection
 */
export async function updateReflectionSyncStatus(
  dateKey: string,
  status: SyncStatus,
  meta?: {
    publishedAt?: string
    publishedCommit?: string
    publishedContentHash?: string
    lastSyncAttempt?: string
    syncError?: string
    batchId?: string
  }
): Promise<void> {
  const db = await getDatabase()
  if (!db) return

  try {
    const updates: string[] = ['sync_status = ?']
    const params: (string | null)[] = [status]

    if (meta?.publishedAt !== undefined) {
      updates.push('published_at = ?')
      params.push(meta.publishedAt)
    }
    if (meta?.publishedCommit !== undefined) {
      updates.push('published_commit = ?')
      params.push(meta.publishedCommit)
    }
    if (meta?.publishedContentHash !== undefined) {
      updates.push('published_content_hash = ?')
      params.push(meta.publishedContentHash)
    }
    if (meta?.lastSyncAttempt !== undefined) {
      updates.push('last_sync_attempt = ?')
      params.push(meta.lastSyncAttempt)
    }
    if (meta?.syncError !== undefined) {
      updates.push('sync_error = ?')
      params.push(meta.syncError)
    }
    if (meta?.batchId !== undefined) {
      updates.push('batch_id = ?')
      params.push(meta.batchId)
    }

    params.push(dateKey)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (db as any).run(
      `UPDATE reflections SET ${updates.join(', ')} WHERE date = ?`,
      params
    )
  } catch (error) {
    console.error('[ReflectionStore] Failed to update sync status:', error)
  }
}

/**
 * Get reflections pending for publishing
 */
export async function getPendingReflections(): Promise<Reflection[]> {
  const db = await getDatabase()
  if (!db) return []

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = await (db as any).all(
      `SELECT date, strand_path, title, metadata, word_count, created_at, updated_at, content,
              sync_status, published_at, published_commit, published_content_hash,
              last_sync_attempt, sync_error, batch_id
       FROM reflections
       WHERE sync_status IN ('pending', 'local', 'modified', 'failed')
       ORDER BY date DESC`
    ) as Array<{
      date: string
      strand_path: string
      title: string
      metadata: string | null
      word_count: number
      created_at: string
      updated_at: string
      content: string | null
      sync_status: string | null
      published_at: string | null
      published_commit: string | null
      published_content_hash: string | null
      last_sync_attempt: string | null
      sync_error: string | null
      batch_id: string | null
    }> | null

    if (!rows || rows.length === 0) {
      return []
    }

    return rows.map(row => ({
      date: row.date,
      strandPath: row.strand_path,
      title: row.title,
      metadata: row.metadata ? JSON.parse(row.metadata) : {},
      wordCount: row.word_count,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      content: row.content || undefined,
      syncStatus: (row.sync_status as SyncStatus) || 'local',
      publishedAt: row.published_at || undefined,
      publishedCommit: row.published_commit || undefined,
      publishedContentHash: row.published_content_hash || undefined,
      lastSyncAttempt: row.last_sync_attempt || undefined,
      syncError: row.sync_error || undefined,
      batchId: row.batch_id || undefined,
    }))
  } catch (error) {
    console.error('[ReflectionStore] Failed to get pending reflections:', error)
    return []
  }
}

/**
 * Get reflections by sync status
 */
export async function getReflectionsBySyncStatus(status: SyncStatus): Promise<Reflection[]> {
  const db = await getDatabase()
  if (!db) return []

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = await (db as any).all(
      `SELECT date, strand_path, title, metadata, word_count, created_at, updated_at, content,
              sync_status, published_at, published_commit, published_content_hash,
              last_sync_attempt, sync_error, batch_id
       FROM reflections
       WHERE sync_status = ?
       ORDER BY date DESC`,
      [status]
    ) as Array<{
      date: string
      strand_path: string
      title: string
      metadata: string | null
      word_count: number
      created_at: string
      updated_at: string
      content: string | null
      sync_status: string | null
      published_at: string | null
      published_commit: string | null
      published_content_hash: string | null
      last_sync_attempt: string | null
      sync_error: string | null
      batch_id: string | null
    }> | null

    if (!rows || rows.length === 0) {
      return []
    }

    return rows.map(row => ({
      date: row.date,
      strandPath: row.strand_path,
      title: row.title,
      metadata: row.metadata ? JSON.parse(row.metadata) : {},
      wordCount: row.word_count,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      content: row.content || undefined,
      syncStatus: (row.sync_status as SyncStatus) || 'local',
      publishedAt: row.published_at || undefined,
      publishedCommit: row.published_commit || undefined,
      publishedContentHash: row.published_content_hash || undefined,
      lastSyncAttempt: row.last_sync_attempt || undefined,
      syncError: row.sync_error || undefined,
      batchId: row.batch_id || undefined,
    }))
  } catch (error) {
    console.error('[ReflectionStore] Failed to get reflections by sync status:', error)
    return []
  }
}

/**
 * Bulk update sync status for multiple reflections
 */
export async function bulkUpdateReflectionSyncStatus(
  dateKeys: string[],
  status: SyncStatus,
  meta?: {
    batchId?: string
    lastSyncAttempt?: string
  }
): Promise<void> {
  const db = await getDatabase()
  if (!db || dateKeys.length === 0) return

  try {
    const placeholders = dateKeys.map(() => '?').join(', ')
    const updates: string[] = ['sync_status = ?']
    const baseParams: (string | null)[] = [status]

    if (meta?.batchId !== undefined) {
      updates.push('batch_id = ?')
      baseParams.push(meta.batchId)
    }
    if (meta?.lastSyncAttempt !== undefined) {
      updates.push('last_sync_attempt = ?')
      baseParams.push(meta.lastSyncAttempt)
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (db as any).run(
      `UPDATE reflections SET ${updates.join(', ')} WHERE date IN (${placeholders})`,
      [...baseParams, ...dateKeys]
    )
  } catch (error) {
    console.error('[ReflectionStore] Failed to bulk update sync status:', error)
  }
}

/**
 * Mark reflection as modified (when content changes after sync)
 */
export async function markReflectionModified(dateKey: string): Promise<void> {
  const reflection = await getReflection(dateKey)
  if (!reflection) return

  // Only mark as modified if it was previously synced
  if (reflection.syncStatus === 'synced') {
    await updateReflectionSyncStatus(dateKey, 'modified')
  }
}

/**
 * Get count of reflections by sync status
 */
export async function getReflectionSyncCounts(): Promise<Record<SyncStatus, number>> {
  const db = await getDatabase()
  if (!db) {
    return {
      local: 0,
      pending: 0,
      syncing: 0,
      synced: 0,
      modified: 0,
      conflict: 0,
      failed: 0,
    }
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = await (db as any).all(
      `SELECT COALESCE(sync_status, 'local') as status, COUNT(*) as count
       FROM reflections
       GROUP BY COALESCE(sync_status, 'local')`
    ) as Array<{ status: string; count: number }> | null

    const counts: Record<SyncStatus, number> = {
      local: 0,
      pending: 0,
      syncing: 0,
      synced: 0,
      modified: 0,
      conflict: 0,
      failed: 0,
    }

    if (rows) {
      for (const row of rows) {
        if (row.status in counts) {
          counts[row.status as SyncStatus] = row.count
        }
      }
    }

    return counts
  } catch (error) {
    console.error('[ReflectionStore] Failed to get sync counts:', error)
    return {
      local: 0,
      pending: 0,
      syncing: 0,
      synced: 0,
      modified: 0,
      conflict: 0,
      failed: 0,
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
  getRelativeDateKey,
  getISOWeekNumber,
  getWeekDateRange,
  getMonthName,

  // Path utilities
  getReflectionPath,
  getTodayReflectionPath,
  isReflectionPath,
  getDateFromPath,

  // Templates
  getReflectionTemplate,

  // Database
  initReflectionsSchema,
  getReflection,
  reflectionExists,
  saveReflection,
  updateReflectionMetadata,
  setReflectionMood,
  setReflectionSleep,
  getOrCreateReflection,

  // Queries
  getRecentReflections,
  getReflectionsInRange,
  getCalendarMarkers,

  // Hierarchy queries
  getReflectionYears,
  getReflectionMonths,
  getReflectionWeeks,
  getReflectionsByPeriod,
  searchReflections,

  // Analytics
  getReflectionStreak,
  getMoodTrend,

  // Relationships
  getStoredRelationships,
  trackRelationshipMention,
  getRelationshipSuggestions,

  // Sync status
  updateReflectionSyncStatus,
  getPendingReflections,
  getReflectionsBySyncStatus,
  bulkUpdateReflectionSyncStatus,
  markReflectionModified,
  getReflectionSyncCounts,
}
