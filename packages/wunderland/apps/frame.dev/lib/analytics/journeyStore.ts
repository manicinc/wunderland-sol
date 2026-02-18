// @ts-nocheck
/**
 * Journey Store
 * 
 * SQLite operations for the journey timeline feature.
 * Manages branches, sections, entries, and sync with strands/habits.
 * 
 * @module lib/analytics/journeyStore
 */

import { v4 as uuidv4 } from 'uuid'
import { getDatabase } from '../codexDatabase'
import type { StorageAdapter } from '@framers/sql-storage-adapter'
import type {
  JourneyBranch,
  JourneyBranchWithMeta,
  JourneyEntry,
  JourneyEntryWithMeta,
  JourneySection,
  JourneySectionWithMeta,
  JourneyPeriod,
  JourneyPeriodWithEntries,
  JourneySyncSettings,
  JourneyBranchFormData,
  JourneyEntryFormData,
  JourneySectionFormData,
  BranchColorKey,
  BranchIcon,
  EntrySourceType,
  PeriodGranularity,
  DEFAULT_SYNC_SETTINGS,
} from './journeyTypes'
import { format, startOfYear, endOfYear, startOfQuarter, endOfQuarter, startOfMonth, endOfMonth, startOfWeek, endOfWeek, parseISO, isBefore, isAfter, isWithinInterval } from 'date-fns'

// ============================================================================
// DATABASE ROW TYPES
// ============================================================================

interface BranchRow {
  id: string
  name: string
  color: string
  icon: string
  parent_id: string | null
  description: string | null
  created_at: string
  updated_at: string
  sort_order: number
  is_collapsed: number
}

interface SectionRow {
  id: string
  branch_id: string
  name: string
  start_date: string
  end_date: string
  created_at: string
  updated_at: string
  sort_order: number
  is_expanded: number
}

interface EntryRow {
  id: string
  branch_id: string
  section_id: string | null
  title: string
  content: string | null
  date: string
  source_type: string
  source_path: string | null
  created_at: string
  updated_at: string
  sort_order: number
}

interface EntryWithMetaRow extends EntryRow {
  branch_name: string
  branch_color: string
  section_name: string | null
}

// ============================================================================
// SCHEMA INITIALIZATION
// ============================================================================

const BRANCHES_TABLE = 'journey_branches'
const SECTIONS_TABLE = 'journey_sections'
const ENTRIES_TABLE = 'journey_entries'
const SETTINGS_KEY = 'journeySyncSettings'

let initialized = false

async function initSchema(db: StorageAdapter): Promise<void> {
  if (initialized) return

  await db.exec(`
    -- Branches table
    CREATE TABLE IF NOT EXISTS ${BRANCHES_TABLE} (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT 'teal',
      icon TEXT NOT NULL DEFAULT 'folder',
      parent_id TEXT,
      description TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_collapsed INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (parent_id) REFERENCES ${BRANCHES_TABLE}(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_branches_parent ON ${BRANCHES_TABLE}(parent_id);

    -- Sections table
    CREATE TABLE IF NOT EXISTS ${SECTIONS_TABLE} (
      id TEXT PRIMARY KEY,
      branch_id TEXT NOT NULL,
      name TEXT NOT NULL,
      date_range TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_collapsed INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (branch_id) REFERENCES ${BRANCHES_TABLE}(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_sections_branch ON ${SECTIONS_TABLE}(branch_id);

    -- Entries table
    CREATE TABLE IF NOT EXISTS ${ENTRIES_TABLE} (
      id TEXT PRIMARY KEY,
      branch_id TEXT NOT NULL,
      section_id TEXT,
      title TEXT NOT NULL,
      content TEXT NOT NULL DEFAULT '',
      date TEXT NOT NULL,
      source_type TEXT NOT NULL DEFAULT 'custom',
      source_path TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (branch_id) REFERENCES ${BRANCHES_TABLE}(id) ON DELETE CASCADE,
      FOREIGN KEY (section_id) REFERENCES ${SECTIONS_TABLE}(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_entries_branch ON ${ENTRIES_TABLE}(branch_id);
    CREATE INDEX IF NOT EXISTS idx_entries_section ON ${ENTRIES_TABLE}(section_id);
    CREATE INDEX IF NOT EXISTS idx_entries_date ON ${ENTRIES_TABLE}(date);
    CREATE INDEX IF NOT EXISTS idx_entries_source ON ${ENTRIES_TABLE}(source_type, source_path);
  `)

  initialized = true
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function generateId(): string {
  return uuidv4()
}

function getNow(): string {
  return new Date().toISOString()
}

function getToday(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

function createSnippet(content: string, maxLength = 100): string {
  const stripped = content
    .replace(/#+\s/g, '')
    .replace(/\*\*/g, '')
    .replace(/\n+/g, ' ')
    .trim()
  
  if (stripped.length <= maxLength) return stripped
  return stripped.slice(0, maxLength).trim() + '...'
}

// ============================================================================
// BRANCH OPERATIONS
// ============================================================================

export async function createBranch(data: JourneyBranchFormData): Promise<JourneyBranch | null> {
  const db = await getDatabase()
  if (!db) return null
  await initSchema(db)

  const now = getNow()
  const id = generateId()

  // Get max sort order for new branch
  const maxOrder = await db.all<{ next_order: number }>(
    `SELECT COALESCE(MAX(sort_order), -1) + 1 as next_order FROM ${BRANCHES_TABLE} WHERE parent_id IS ?`,
    [data.parentId]
  )
  const sortOrder = maxOrder[0]?.next_order ?? 0

  const branch: JourneyBranch = {
    id,
    name: data.name,
    color: data.color,
    icon: data.icon,
    parentId: data.parentId,
    description: data.description,
    createdAt: now,
    updatedAt: now,
    sortOrder,
    isCollapsed: false,
  }

  await db.run(
    `INSERT INTO ${BRANCHES_TABLE} (id, name, color, icon, parent_id, description, created_at, updated_at, sort_order, is_collapsed)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [branch.id, branch.name, branch.color, branch.icon, branch.parentId, branch.description, branch.createdAt, branch.updatedAt, branch.sortOrder, branch.isCollapsed ? 1 : 0]
  )

  return branch
}

export async function updateBranch(id: string, data: Partial<JourneyBranchFormData>): Promise<boolean> {
  const db = await getDatabase()
  if (!db) return false
  await initSchema(db)

  const updates: string[] = []
  const values: unknown[] = []

  if (data.name !== undefined) {
    updates.push('name = ?')
    values.push(data.name)
  }
  if (data.color !== undefined) {
    updates.push('color = ?')
    values.push(data.color)
  }
  if (data.icon !== undefined) {
    updates.push('icon = ?')
    values.push(data.icon)
  }
  if (data.parentId !== undefined) {
    updates.push('parent_id = ?')
    values.push(data.parentId)
  }
  if (data.description !== undefined) {
    updates.push('description = ?')
    values.push(data.description)
  }

  if (updates.length === 0) return true

  updates.push('updated_at = ?')
  values.push(getNow())
  values.push(id)

  await db.run(
    `UPDATE ${BRANCHES_TABLE} SET ${updates.join(', ')} WHERE id = ?`,
    values
  )

  return true
}

export async function deleteBranch(id: string): Promise<boolean> {
  const db = await getDatabase()
  if (!db) return false
  await initSchema(db)

  await db.run(`DELETE FROM ${BRANCHES_TABLE} WHERE id = ?`, [id])
  return true
}

export async function getBranch(id: string): Promise<JourneyBranch | null> {
  const db = await getDatabase()
  if (!db) return null
  await initSchema(db)

  const results = await db.all<BranchRow>(`SELECT * FROM ${BRANCHES_TABLE} WHERE id = ?`, [id])
  if (results.length === 0) return null

  const row = results[0]
  return {
    id: row.id,
    name: row.name,
    color: row.color as BranchColorKey,
    icon: row.icon as BranchIcon,
    parentId: row.parent_id,
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    sortOrder: row.sort_order,
    isCollapsed: Boolean(row.is_collapsed),
  }
}

export async function getAllBranches(): Promise<JourneyBranch[]> {
  const db = await getDatabase()
  if (!db) return []
  await initSchema(db)

  const results = await db.all(`SELECT * FROM ${BRANCHES_TABLE} ORDER BY sort_order ASC`)
  
  return results.map(row => ({
    id: row.id,
    name: row.name,
    color: row.color as BranchColorKey,
    icon: row.icon as BranchIcon,
    parentId: row.parent_id,
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    sortOrder: row.sort_order,
    isCollapsed: Boolean(row.is_collapsed),
  }))
}

export async function getBranchesWithMeta(): Promise<JourneyBranchWithMeta[]> {
  const db = await getDatabase()
  if (!db) return []
  await initSchema(db)

  const branches = await getAllBranches()
  const entryCounts = await db.all(
    `SELECT branch_id, COUNT(*) as count, MIN(date) as min_date, MAX(date) as max_date 
     FROM ${ENTRIES_TABLE} GROUP BY branch_id`
  )

  const countMap = new Map(entryCounts.map(r => [r.branch_id, { count: r.count, min: r.min_date, max: r.max_date }]))

  // Build tree structure
  const branchMap = new Map<string, JourneyBranchWithMeta>()
  const rootBranches: JourneyBranchWithMeta[] = []

  // First pass: create all branch nodes
  for (const branch of branches) {
    const meta = countMap.get(branch.id)
    branchMap.set(branch.id, {
      ...branch,
      entryCount: meta?.count ?? 0,
      childBranches: [],
      dateRange: meta ? { start: meta.min, end: meta.max } : null,
    })
  }

  // Second pass: build tree
  for (const branch of branches) {
    const node = branchMap.get(branch.id)!
    if (branch.parentId) {
      const parent = branchMap.get(branch.parentId)
      if (parent) {
        parent.childBranches.push(node)
      } else {
        rootBranches.push(node)
      }
    } else {
      rootBranches.push(node)
    }
  }

  return rootBranches
}

export async function toggleBranchCollapse(id: string): Promise<boolean> {
  const db = await getDatabase()
  if (!db) return false
  await initSchema(db)

  await db.run(
    `UPDATE ${BRANCHES_TABLE} SET is_collapsed = NOT is_collapsed, updated_at = ? WHERE id = ?`,
    [getNow(), id]
  )
  return true
}

// ============================================================================
// SECTION OPERATIONS
// ============================================================================

export async function createSection(data: JourneySectionFormData): Promise<JourneySection | null> {
  const db = await getDatabase()
  if (!db) return null
  await initSchema(db)

  const id = generateId()

  const maxOrder = await db.all<{ next_order: number }>(
    `SELECT COALESCE(MAX(sort_order), -1) + 1 as next_order FROM ${SECTIONS_TABLE} WHERE branch_id = ?`,
    [data.branchId]
  )
  const sortOrder = maxOrder[0]?.next_order ?? 0

  const section: JourneySection = {
    id,
    branchId: data.branchId,
    name: data.name,
    dateRange: data.dateRange,
    sortOrder,
    isCollapsed: false,
  }

  await db.run(
    `INSERT INTO ${SECTIONS_TABLE} (id, branch_id, name, date_range, sort_order, is_collapsed)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [section.id, section.branchId, section.name, section.dateRange, section.sortOrder, 0]
  )

  return section
}

export async function getSectionsForBranch(branchId: string): Promise<JourneySectionWithMeta[]> {
  const db = await getDatabase()
  if (!db) return []
  await initSchema(db)

  const sections = await db.all<SectionRow & { entry_count: number }>(
    `SELECT s.*, COUNT(e.id) as entry_count
     FROM ${SECTIONS_TABLE} s
     LEFT JOIN ${ENTRIES_TABLE} e ON e.section_id = s.id
     WHERE s.branch_id = ?
     GROUP BY s.id
     ORDER BY s.sort_order ASC`,
    [branchId]
  )

  const result: JourneySectionWithMeta[] = []

  for (const row of sections) {
    const entries = await getEntriesForSection(row.id)
    result.push({
      id: row.id,
      branchId: row.branch_id,
      name: row.name,
      dateRange: row.date_range,
      sortOrder: row.sort_order,
      isCollapsed: Boolean(row.is_collapsed),
      entryCount: row.entry_count,
      entries,
    })
  }

  return result
}

export async function deleteSection(id: string): Promise<boolean> {
  const db = await getDatabase()
  if (!db) return false
  await initSchema(db)

  await db.run(`DELETE FROM ${SECTIONS_TABLE} WHERE id = ?`, [id])
  return true
}

// ============================================================================
// ENTRY OPERATIONS
// ============================================================================

export async function createEntry(data: JourneyEntryFormData, sourceType: EntrySourceType = 'custom', sourcePath: string | null = null): Promise<JourneyEntry | null> {
  const db = await getDatabase()
  if (!db) return null
  await initSchema(db)

  const now = getNow()
  const id = generateId()

  const maxOrder = await db.all<{ next_order: number }>(
    `SELECT COALESCE(MAX(sort_order), -1) + 1 as next_order FROM ${ENTRIES_TABLE} WHERE branch_id = ? AND section_id IS ?`,
    [data.branchId, data.sectionId]
  )
  const sortOrder = maxOrder[0]?.next_order ?? 0

  const entry: JourneyEntry = {
    id,
    branchId: data.branchId,
    sectionId: data.sectionId,
    title: data.title,
    content: data.content,
    date: data.date,
    sourceType,
    sourcePath,
    createdAt: now,
    updatedAt: now,
    sortOrder,
  }

  await db.run(
    `INSERT INTO ${ENTRIES_TABLE} (id, branch_id, section_id, title, content, date, source_type, source_path, created_at, updated_at, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [entry.id, entry.branchId, entry.sectionId, entry.title, entry.content, entry.date, entry.sourceType, entry.sourcePath, entry.createdAt, entry.updatedAt, entry.sortOrder]
  )

  return entry
}

export async function updateEntry(id: string, data: Partial<JourneyEntryFormData>): Promise<boolean> {
  const db = await getDatabase()
  if (!db) return false
  await initSchema(db)

  const updates: string[] = []
  const values: unknown[] = []

  if (data.branchId !== undefined) {
    updates.push('branch_id = ?')
    values.push(data.branchId)
  }
  if (data.sectionId !== undefined) {
    updates.push('section_id = ?')
    values.push(data.sectionId)
  }
  if (data.title !== undefined) {
    updates.push('title = ?')
    values.push(data.title)
  }
  if (data.content !== undefined) {
    updates.push('content = ?')
    values.push(data.content)
  }
  if (data.date !== undefined) {
    updates.push('date = ?')
    values.push(data.date)
  }

  if (updates.length === 0) return true

  updates.push('updated_at = ?')
  values.push(getNow())
  values.push(id)

  await db.run(
    `UPDATE ${ENTRIES_TABLE} SET ${updates.join(', ')} WHERE id = ?`,
    values
  )

  return true
}

export async function deleteEntry(id: string): Promise<boolean> {
  const db = await getDatabase()
  if (!db) return false
  await initSchema(db)

  await db.run(`DELETE FROM ${ENTRIES_TABLE} WHERE id = ?`, [id])
  return true
}

export async function getEntry(id: string): Promise<JourneyEntryWithMeta | null> {
  const db = await getDatabase()
  if (!db) return null
  await initSchema(db)

  const results = await db.all<EntryWithMetaRow>(
    `SELECT e.*, b.name as branch_name, b.color as branch_color, s.name as section_name
     FROM ${ENTRIES_TABLE} e
     LEFT JOIN ${BRANCHES_TABLE} b ON b.id = e.branch_id
     LEFT JOIN ${SECTIONS_TABLE} s ON s.id = e.section_id
     WHERE e.id = ?`,
    [id]
  )

  if (results.length === 0) return null

  const row = results[0]
  return {
    id: row.id,
    branchId: row.branch_id,
    sectionId: row.section_id,
    title: row.title,
    content: row.content,
    date: row.date,
    sourceType: row.source_type as EntrySourceType,
    sourcePath: row.source_path,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    sortOrder: row.sort_order,
    snippet: createSnippet(row.content),
    branchName: row.branch_name,
    branchColor: row.branch_color as BranchColorKey,
    sectionName: row.section_name,
  }
}

export async function getEntriesForSection(sectionId: string): Promise<JourneyEntryWithMeta[]> {
  const db = await getDatabase()
  if (!db) return []
  await initSchema(db)

  const results = await db.all<EntryWithMetaRow>(
    `SELECT e.*, b.name as branch_name, b.color as branch_color, s.name as section_name
     FROM ${ENTRIES_TABLE} e
     LEFT JOIN ${BRANCHES_TABLE} b ON b.id = e.branch_id
     LEFT JOIN ${SECTIONS_TABLE} s ON s.id = e.section_id
     WHERE e.section_id = ?
     ORDER BY e.date ASC, e.sort_order ASC`,
    [sectionId]
  )

  return results.map(row => ({
    id: row.id,
    branchId: row.branch_id,
    sectionId: row.section_id,
    title: row.title,
    content: row.content,
    date: row.date,
    sourceType: row.source_type as EntrySourceType,
    sourcePath: row.source_path,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    sortOrder: row.sort_order,
    snippet: createSnippet(row.content),
    branchName: row.branch_name,
    branchColor: row.branch_color as BranchColorKey,
    sectionName: row.section_name,
  }))
}

export async function getEntriesForBranch(branchId: string): Promise<JourneyEntryWithMeta[]> {
  const db = await getDatabase()
  if (!db) return []
  await initSchema(db)

  const results = await db.all<EntryWithMetaRow>(
    `SELECT e.*, b.name as branch_name, b.color as branch_color, s.name as section_name
     FROM ${ENTRIES_TABLE} e
     LEFT JOIN ${BRANCHES_TABLE} b ON b.id = e.branch_id
     LEFT JOIN ${SECTIONS_TABLE} s ON s.id = e.section_id
     WHERE e.branch_id = ?
     ORDER BY e.date ASC, e.sort_order ASC`,
    [branchId]
  )

  return results.map(row => ({
    id: row.id,
    branchId: row.branch_id,
    sectionId: row.section_id,
    title: row.title,
    content: row.content,
    date: row.date,
    sourceType: row.source_type as EntrySourceType,
    sourcePath: row.source_path,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    sortOrder: row.sort_order,
    snippet: createSnippet(row.content),
    branchName: row.branch_name,
    branchColor: row.branch_color as BranchColorKey,
    sectionName: row.section_name,
  }))
}

export async function getAllEntries(filters?: {
  branchIds?: string[]
  dateRange?: { start: string; end: string }
  searchQuery?: string
}): Promise<JourneyEntryWithMeta[]> {
  const db = await getDatabase()
  if (!db) return []
  await initSchema(db)

  let query = `
    SELECT e.*, b.name as branch_name, b.color as branch_color, s.name as section_name
    FROM ${ENTRIES_TABLE} e
    LEFT JOIN ${BRANCHES_TABLE} b ON b.id = e.branch_id
    LEFT JOIN ${SECTIONS_TABLE} s ON s.id = e.section_id
    WHERE 1=1
  `
  const params: unknown[] = []

  if (filters?.branchIds && filters.branchIds.length > 0) {
    query += ` AND e.branch_id IN (${filters.branchIds.map(() => '?').join(', ')})`
    params.push(...filters.branchIds)
  }

  if (filters?.dateRange) {
    query += ` AND e.date >= ? AND e.date <= ?`
    params.push(filters.dateRange.start, filters.dateRange.end)
  }

  if (filters?.searchQuery) {
    query += ` AND (e.title LIKE ? OR e.content LIKE ?)`
    const searchPattern = `%${filters.searchQuery}%`
    params.push(searchPattern, searchPattern)
  }

  query += ` ORDER BY e.date DESC, e.sort_order ASC`

  const results = await db.all<EntryWithMetaRow>(query, params)

  return results.map(row => ({
    id: row.id,
    branchId: row.branch_id,
    sectionId: row.section_id,
    title: row.title,
    content: row.content,
    date: row.date,
    sourceType: row.source_type as EntrySourceType,
    sourcePath: row.source_path,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    sortOrder: row.sort_order,
    snippet: createSnippet(row.content),
    branchName: row.branch_name,
    branchColor: row.branch_color as BranchColorKey,
    sectionName: row.section_name,
  }))
}

// ============================================================================
// PERIOD OPERATIONS (for chronological view)
// ============================================================================

export async function getEntriesByPeriod(granularity: PeriodGranularity = 'year'): Promise<JourneyPeriodWithEntries[]> {
  const entries = await getAllEntries()
  if (entries.length === 0) return []

  const periodMap = new Map<string, JourneyPeriodWithEntries>()

  for (const entry of entries) {
    const date = parseISO(entry.date)
    let periodId: string
    let label: string
    let startDate: Date
    let endDate: Date

    switch (granularity) {
      case 'year':
        periodId = format(date, 'yyyy')
        label = periodId
        startDate = startOfYear(date)
        endDate = endOfYear(date)
        break
      case 'quarter':
        const q = Math.ceil((date.getMonth() + 1) / 3)
        periodId = `${format(date, 'yyyy')}-Q${q}`
        label = `Q${q} ${format(date, 'yyyy')}`
        startDate = startOfQuarter(date)
        endDate = endOfQuarter(date)
        break
      case 'month':
        periodId = format(date, 'yyyy-MM')
        label = format(date, 'MMMM yyyy')
        startDate = startOfMonth(date)
        endDate = endOfMonth(date)
        break
      case 'week':
        periodId = format(startOfWeek(date), 'yyyy-MM-dd')
        label = `Week of ${format(startOfWeek(date), 'MMM d, yyyy')}`
        startDate = startOfWeek(date)
        endDate = endOfWeek(date)
        break
    }

    if (!periodMap.has(periodId)) {
      periodMap.set(periodId, {
        id: periodId,
        label,
        granularity,
        startDate: format(startDate, 'yyyy-MM-dd'),
        endDate: format(endDate, 'yyyy-MM-dd'),
        entryCount: 0,
        isCollapsed: false,
        entries: [],
      })
    }

    const period = periodMap.get(periodId)!
    period.entries.push(entry)
    period.entryCount++
  }

  // Sort periods in descending order (most recent first)
  return Array.from(periodMap.values()).sort((a, b) => b.startDate.localeCompare(a.startDate))
}

// ============================================================================
// SYNC SETTINGS
// ============================================================================

export async function getSyncSettings(): Promise<JourneySyncSettings> {
  const db = await getDatabase()
  if (!db) return DEFAULT_SYNC_SETTINGS
  await initSchema(db)

  const result = await db.all<{ value: string }>(`SELECT value FROM settings WHERE key = ?`, [SETTINGS_KEY])
  if (result.length > 0) {
    try {
      return { ...DEFAULT_SYNC_SETTINGS, ...JSON.parse(result[0].value) }
    } catch {
      return DEFAULT_SYNC_SETTINGS
    }
  }
  return DEFAULT_SYNC_SETTINGS
}

export async function updateSyncSettings(settings: Partial<JourneySyncSettings>): Promise<void> {
  const db = await getDatabase()
  if (!db) return
  await initSchema(db)

  const current = await getSyncSettings()
  const updated = { ...current, ...settings }

  await db.run(
    `INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`,
    [SETTINGS_KEY, JSON.stringify(updated)]
  )
}

// ============================================================================
// SYNC FROM EXTERNAL SOURCES
// ============================================================================

/**
 * Sync entries from strands based on tags
 * This creates/updates entries for strands that match the tag-to-branch mapping
 */
export async function syncFromStrands(
  strands: Array<{ path: string; title: string; createdAt: string; tags: string[]; content?: string }>
): Promise<{ created: number; updated: number }> {
  const settings = await getSyncSettings()
  if (!settings.strand.enabled) return { created: 0, updated: 0 }

  const db = await getDatabase()
  if (!db) return { created: 0, updated: 0 }
  await initSchema(db)

  let created = 0
  let updated = 0

  for (const strand of strands) {
    // Skip if excluded
    if (strand.tags.some(t => settings.strand.excludeTags.includes(t))) continue

    // Find matching branch
    let branchId: string | null = null
    for (const tag of strand.tags) {
      if (settings.strand.tagToBranchMapping[tag]) {
        branchId = settings.strand.tagToBranchMapping[tag]
        break
      }
    }
    branchId = branchId ?? settings.strand.defaultBranchId
    if (!branchId) continue

    // Check if entry already exists
    const existing = await db.all<{ id: string }>(
      `SELECT id FROM ${ENTRIES_TABLE} WHERE source_type = 'strand' AND source_path = ?`,
      [strand.path]
    )

    if (existing.length > 0) {
      // Update existing entry
      await db.run(
        `UPDATE ${ENTRIES_TABLE} SET title = ?, content = ?, updated_at = ? WHERE id = ?`,
        [strand.title, strand.content ?? '', getNow(), existing[0].id]
      )
      updated++
    } else {
      // Create new entry
      await createEntry(
        {
          branchId,
          sectionId: null,
          title: strand.title,
          content: strand.content ?? '',
          date: strand.createdAt.split('T')[0],
        },
        'strand',
        strand.path
      )
      created++
    }
  }

  await updateSyncSettings({ lastSyncAt: getNow() })
  return { created, updated }
}

/**
 * Sync entries from ritual completions
 */
export async function syncFromRituals(
  rituals: Array<{ id: string; ritualType: string; date: string; intentions?: string; reflections?: string }>
): Promise<{ created: number; updated: number }> {
  const settings = await getSyncSettings()
  if (!settings.habit.enabled || !settings.habit.includeRituals) return { created: 0, updated: 0 }
  if (!settings.habit.ritualBranchId) return { created: 0, updated: 0 }

  const db = await getDatabase()
  if (!db) return { created: 0, updated: 0 }
  await initSchema(db)

  let created = 0
  let updated = 0

  for (const ritual of rituals) {
    const title = ritual.ritualType.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    let content = ''
    if (ritual.intentions) content += `**Intentions:** ${ritual.intentions}\n\n`
    if (ritual.reflections) content += `**Reflections:** ${ritual.reflections}`

    const existing = await db.all<{ id: string }>(
      `SELECT id FROM ${ENTRIES_TABLE} WHERE source_type = 'ritual' AND source_path = ?`,
      [ritual.id]
    )

    if (existing.length > 0) {
      await db.run(
        `UPDATE ${ENTRIES_TABLE} SET title = ?, content = ?, updated_at = ? WHERE id = ?`,
        [title, content.trim(), getNow(), existing[0].id]
      )
      updated++
    } else {
      await createEntry(
        {
          branchId: settings.habit.ritualBranchId,
          sectionId: null,
          title,
          content: content.trim(),
          date: ritual.date,
        },
        'ritual',
        ritual.id
      )
      created++
    }
  }

  await updateSyncSettings({ lastSyncAt: getNow() })
  return { created, updated }
}

