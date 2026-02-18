/**
 * Accomplishment Service
 * @module lib/accomplishment/accomplishmentService
 *
 * Queries and aggregates completed tasks, subtasks, and habits
 * for accomplishment tracking and reflection integration.
 */

import { getDatabase } from '../codexDatabase'
import type {
  AccomplishmentItem,
  AccomplishmentStats,
  DailyAccomplishments,
  WeeklyAccomplishments,
  MonthlyAccomplishments,
  TimeSeriesPoint,
  AccomplishmentSyncConfig,
  TaskCompletionStreak,
  AccomplishmentQueryOptions,
  AccomplishmentCallback,
  AccomplishmentCompletedEvent,
} from './types'
import { DEFAULT_SYNC_CONFIG } from './types'

// ============================================================================
// DATE UTILITIES
// ============================================================================

/**
 * Get today's date in YYYY-MM-DD format
 */
function getToday(): string {
  return new Date().toISOString().split('T')[0]
}

/**
 * Get the start of the current week (Monday)
 */
function getWeekStart(date: Date = new Date()): string {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  return d.toISOString().split('T')[0]
}

/**
 * Get the end of the current week (Sunday)
 */
function getWeekEnd(date: Date = new Date()): string {
  const start = new Date(getWeekStart(date))
  start.setDate(start.getDate() + 6)
  return start.toISOString().split('T')[0]
}

/**
 * Get the start of the current month
 */
function getMonthStart(date: Date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`
}

/**
 * Get the end of the current month
 */
function getMonthEnd(date: Date = new Date()): string {
  const d = new Date(date.getFullYear(), date.getMonth() + 1, 0)
  return d.toISOString().split('T')[0]
}

/**
 * Get ISO week number
 */
function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

/**
 * Parse time from ISO datetime
 */
function extractTime(datetime: string): string {
  const parts = datetime.split('T')
  if (parts.length > 1) {
    return parts[1].slice(0, 5) // HH:MM
  }
  return ''
}

// ============================================================================
// QUERY FUNCTIONS
// ============================================================================

/**
 * Get completed tasks for a date range
 */
async function getCompletedTasks(startDate: string, endDate: string): Promise<AccomplishmentItem[]> {
  const db = await getDatabase()
  if (!db) return []

  try {
    const rows = await db.all(
      `SELECT id, title, completed_at, project, tags
       FROM planner_tasks
       WHERE status = 'completed'
         AND date(completed_at) >= date(?)
         AND date(completed_at) <= date(?)
         AND is_deleted = 0
       ORDER BY completed_at ASC`,
      [startDate, endDate]
    ) as Array<{
      id: string
      title: string
      completed_at: string
      project: string | null
      tags: string | null
    }> | null

    return (rows || []).map(row => ({
      id: row.id,
      type: 'task' as const,
      title: row.title,
      completedAt: row.completed_at,
      completedDate: row.completed_at.split('T')[0],
      completedTime: extractTime(row.completed_at),
      taskId: row.id,
      project: row.project || undefined,
      tags: row.tags ? JSON.parse(row.tags) : undefined,
    }))
  } catch (error) {
    console.error('[AccomplishmentService] Failed to get completed tasks:', error)
    return []
  }
}

/**
 * Get completed subtasks for a date range
 */
async function getCompletedSubtasks(startDate: string, endDate: string): Promise<AccomplishmentItem[]> {
  const db = await getDatabase()
  if (!db) return []

  try {
    const rows = await db.all(
      `SELECT s.id, s.title, s.completed_at, s.parent_task_id, t.title as parent_title, t.project, t.tags
       FROM planner_subtasks s
       JOIN planner_tasks t ON s.parent_task_id = t.id
       WHERE s.completed = 1
         AND s.completed_at IS NOT NULL
         AND date(s.completed_at) >= date(?)
         AND date(s.completed_at) <= date(?)
         AND t.is_deleted = 0
       ORDER BY s.completed_at ASC`,
      [startDate, endDate]
    ) as Array<{
      id: string
      title: string
      completed_at: string
      parent_task_id: string
      parent_title: string
      project: string | null
      tags: string | null
    }> | null

    return (rows || []).map(row => ({
      id: row.id,
      type: 'subtask' as const,
      title: row.title,
      completedAt: row.completed_at,
      completedDate: row.completed_at.split('T')[0],
      completedTime: extractTime(row.completed_at),
      taskId: row.id,
      parentTaskId: row.parent_task_id,
      parentTaskTitle: row.parent_title,
      project: row.project || undefined,
      tags: row.tags ? JSON.parse(row.tags) : undefined,
    }))
  } catch (error) {
    console.error('[AccomplishmentService] Failed to get completed subtasks:', error)
    return []
  }
}

/**
 * Get habit completions for a date range
 */
async function getHabitCompletions(startDate: string, endDate: string): Promise<AccomplishmentItem[]> {
  const db = await getDatabase()
  if (!db) return []

  try {
    // Get all habits with their streaks
    const rows = await db.all(
      `SELECT hs.id, hs.task_id, hs.current_streak, hs.completion_history,
              t.title, t.project, t.tags
       FROM habit_streaks hs
       JOIN planner_tasks t ON hs.task_id = t.id
       WHERE t.is_deleted = 0`,
      []
    ) as Array<{
      id: string
      task_id: string
      current_streak: number
      completion_history: string | null
      title: string
      project: string | null
      tags: string | null
    }> | null

    const items: AccomplishmentItem[] = []

    for (const row of rows || []) {
      // Parse completion history (array of YYYY-MM-DD dates)
      const history: string[] = row.completion_history
        ? JSON.parse(row.completion_history)
        : []

      // Filter to completions within the date range
      for (const completionDate of history) {
        if (completionDate >= startDate && completionDate <= endDate) {
          items.push({
            id: `habit_${row.task_id}_${completionDate}`,
            type: 'habit',
            title: row.title,
            completedAt: `${completionDate}T00:00:00.000Z`,
            completedDate: completionDate,
            taskId: row.task_id,
            project: row.project || undefined,
            tags: row.tags ? JSON.parse(row.tags) : undefined,
            habitStreak: row.current_streak,
            isHabitCompletion: true,
          })
        }
      }
    }

    // Sort by date
    items.sort((a, b) => a.completedAt.localeCompare(b.completedAt))
    return items
  } catch (error) {
    console.error('[AccomplishmentService] Failed to get habit completions:', error)
    return []
  }
}

// ============================================================================
// MAIN QUERY FUNCTIONS
// ============================================================================

/**
 * Get all accomplishments for a date range
 */
export async function getAccomplishmentsInRange(
  startDate: string,
  endDate: string,
  options?: AccomplishmentQueryOptions
): Promise<AccomplishmentItem[]> {
  const [tasks, subtasks, habits] = await Promise.all([
    options?.types?.includes('task') === false ? [] : getCompletedTasks(startDate, endDate),
    options?.types?.includes('subtask') === false ? [] : getCompletedSubtasks(startDate, endDate),
    options?.habitsOnly !== false && options?.types?.includes('habit') !== false
      ? getHabitCompletions(startDate, endDate)
      : [],
  ])

  let items = [...tasks, ...subtasks, ...habits]

  // Apply filters
  if (options?.project) {
    items = items.filter(item => item.project === options.project)
  }
  if (options?.tags?.length) {
    items = items.filter(item =>
      item.tags?.some(tag => options.tags!.includes(tag))
    )
  }

  // Sort
  if (options?.sortOrder === 'asc') {
    items.sort((a, b) => a.completedAt.localeCompare(b.completedAt))
  } else {
    items.sort((a, b) => b.completedAt.localeCompare(a.completedAt))
  }

  // Pagination
  if (options?.offset) {
    items = items.slice(options.offset)
  }
  if (options?.limit) {
    items = items.slice(0, options.limit)
  }

  return items
}

/**
 * Get accomplishments for a specific date
 */
export async function getAccomplishmentsForDate(date: string): Promise<DailyAccomplishments> {
  const items = await getAccomplishmentsInRange(date, date)

  const stats = {
    total: items.length,
    tasks: items.filter(i => i.type === 'task').length,
    subtasks: items.filter(i => i.type === 'subtask').length,
    habits: items.filter(i => i.type === 'habit').length,
  }

  return {
    date,
    items,
    stats,
    reflectionSynced: false, // TODO: Check reflection sync status
  }
}

/**
 * Get accomplishments for a week
 */
export async function getAccomplishmentsForWeek(
  year: number,
  week: number
): Promise<WeeklyAccomplishments> {
  // Calculate week start/end from ISO week
  const jan1 = new Date(year, 0, 1)
  const daysToFirstMonday = (8 - jan1.getDay()) % 7
  const firstMonday = new Date(year, 0, 1 + daysToFirstMonday)
  const weekStart = new Date(firstMonday)
  weekStart.setDate(firstMonday.getDate() + (week - 1) * 7)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)

  const startDate = weekStart.toISOString().split('T')[0]
  const endDate = weekEnd.toISOString().split('T')[0]

  // Get all items for the week
  const allItems = await getAccomplishmentsInRange(startDate, endDate)

  // Group by day
  const dayMap = new Map<string, AccomplishmentItem[]>()
  for (let d = new Date(weekStart); d <= weekEnd; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0]
    dayMap.set(dateStr, [])
  }

  for (const item of allItems) {
    const dayItems = dayMap.get(item.completedDate) || []
    dayItems.push(item)
    dayMap.set(item.completedDate, dayItems)
  }

  const days: DailyAccomplishments[] = Array.from(dayMap.entries()).map(([date, items]) => ({
    date,
    items,
    stats: {
      total: items.length,
      tasks: items.filter(i => i.type === 'task').length,
      subtasks: items.filter(i => i.type === 'subtask').length,
      habits: items.filter(i => i.type === 'habit').length,
    },
    reflectionSynced: false,
  }))

  const stats = await getAccomplishmentStats('week', startDate)

  return {
    year,
    week,
    startDate,
    endDate,
    days,
    stats,
  }
}

/**
 * Get accomplishments for a month
 */
export async function getAccomplishmentsForMonth(
  year: number,
  month: number
): Promise<MonthlyAccomplishments> {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

  // Get all items for the month
  const allItems = await getAccomplishmentsInRange(startDate, endDate)

  // Group by day
  const dayMap = new Map<string, AccomplishmentItem[]>()
  for (let day = 1; day <= lastDay; day++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    dayMap.set(dateStr, [])
  }

  for (const item of allItems) {
    const dayItems = dayMap.get(item.completedDate) || []
    dayItems.push(item)
    dayMap.set(item.completedDate, dayItems)
  }

  const days: DailyAccomplishments[] = Array.from(dayMap.entries()).map(([date, items]) => ({
    date,
    items,
    stats: {
      total: items.length,
      tasks: items.filter(i => i.type === 'task').length,
      subtasks: items.filter(i => i.type === 'subtask').length,
      habits: items.filter(i => i.type === 'habit').length,
    },
    reflectionSynced: false,
  }))

  const stats = await getAccomplishmentStats('month', startDate)

  return {
    year,
    month,
    days,
    stats,
  }
}

// ============================================================================
// STATS FUNCTIONS
// ============================================================================

/**
 * Get accomplishment statistics for a time period
 */
export async function getAccomplishmentStats(
  period: 'day' | 'week' | 'month',
  referenceDate?: string
): Promise<AccomplishmentStats> {
  const today = getToday()
  const date = referenceDate ? new Date(referenceDate) : new Date()

  let startDate: string
  let endDate: string

  switch (period) {
    case 'day':
      startDate = endDate = referenceDate || today
      break
    case 'week':
      startDate = getWeekStart(date)
      endDate = getWeekEnd(date)
      break
    case 'month':
      startDate = getMonthStart(date)
      endDate = getMonthEnd(date)
      break
  }

  const items = await getAccomplishmentsInRange(startDate, endDate)

  // Calculate by project
  const projectCounts = new Map<string, number>()
  for (const item of items) {
    if (item.project) {
      projectCounts.set(item.project, (projectCounts.get(item.project) || 0) + 1)
    }
  }

  // Calculate by tag
  const tagCounts = new Map<string, number>()
  for (const item of items) {
    for (const tag of item.tags || []) {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1)
    }
  }

  // Find peak day
  const dayCounts = new Map<string, number>()
  for (const item of items) {
    dayCounts.set(item.completedDate, (dayCounts.get(item.completedDate) || 0) + 1)
  }

  let peakDay: { date: string; count: number } | null = null
  Array.from(dayCounts.entries()).forEach(([dateStr, count]) => {
    if (!peakDay || count > peakDay.count) {
      peakDay = { date: dateStr, count }
    }
  })

  // Get streak info
  const streakInfo = await getTaskCompletionStreak()

  // Calculate today/week/month counts
  const todayItems = await getAccomplishmentsInRange(today, today)
  const weekStart = getWeekStart()
  const weekEnd = getWeekEnd()
  const weekItems = await getAccomplishmentsInRange(weekStart, weekEnd)
  const monthStart = getMonthStart()
  const monthEnd = getMonthEnd()
  const monthItems = await getAccomplishmentsInRange(monthStart, monthEnd)

  // Calculate days in period for average
  const start = new Date(startDate)
  const end = new Date(endDate)
  const daysInPeriod = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1

  return {
    totalCompleted: items.length,
    tasksCompleted: items.filter(i => i.type === 'task').length,
    subtasksCompleted: items.filter(i => i.type === 'subtask').length,
    habitCompletions: items.filter(i => i.type === 'habit').length,
    completedToday: todayItems.length,
    completedThisWeek: weekItems.length,
    completedThisMonth: monthItems.length,
    taskCompletionStreak: streakInfo.current,
    longestTaskStreak: streakInfo.longest,
    averagePerDay: daysInPeriod > 0 ? Math.round((items.length / daysInPeriod) * 10) / 10 : 0,
    peakDay,
    byProject: Array.from(projectCounts.entries())
      .map(([project, count]) => ({ project, count }))
      .sort((a, b) => b.count - a.count),
    byTag: Array.from(tagCounts.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count),
  }
}

/**
 * Get task completion streak info
 */
export async function getTaskCompletionStreak(): Promise<TaskCompletionStreak> {
  const db = await getDatabase()
  if (!db) {
    return { current: 0, longest: 0, daysUntilBreak: 1, lastCompletionDate: null, streakDates: [] }
  }

  try {
    // Get all dates with at least one completion (tasks or subtasks)
    const rows = await db.all(
      `SELECT DISTINCT date(completed_at) as date FROM (
        SELECT completed_at FROM planner_tasks WHERE status = 'completed' AND is_deleted = 0 AND completed_at IS NOT NULL
        UNION ALL
        SELECT completed_at FROM planner_subtasks WHERE completed = 1 AND completed_at IS NOT NULL
      ) ORDER BY date DESC`,
      []
    ) as Array<{ date: string }> | null

    if (!rows || rows.length === 0) {
      return { current: 0, longest: 0, daysUntilBreak: 1, lastCompletionDate: null, streakDates: [] }
    }

    const dates = rows.map(r => r.date)
    const today = getToday()

    // Calculate current streak
    let currentStreak = 0
    let streakDates: string[] = []
    let checkDate = new Date(today)

    // Check if we completed something today or yesterday (to continue streak)
    const hasToday = dates.includes(today)
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().split('T')[0]
    const hasYesterday = dates.includes(yesterdayStr)

    if (!hasToday && !hasYesterday) {
      // Streak is broken
      return {
        current: 0,
        longest: calculateLongestStreak(dates),
        daysUntilBreak: 1,
        lastCompletionDate: dates[0] || null,
        streakDates: [],
      }
    }

    // Start counting from the most recent completion
    if (!hasToday) {
      checkDate = new Date(yesterdayStr)
    }

    while (true) {
      const dateStr = checkDate.toISOString().split('T')[0]
      if (dates.includes(dateStr)) {
        currentStreak++
        streakDates.push(dateStr)
        checkDate.setDate(checkDate.getDate() - 1)
      } else {
        break
      }
    }

    return {
      current: currentStreak,
      longest: Math.max(currentStreak, calculateLongestStreak(dates)),
      daysUntilBreak: hasToday ? 1 : 0,
      lastCompletionDate: dates[0] || null,
      streakDates,
    }
  } catch (error) {
    console.error('[AccomplishmentService] Failed to get completion streak:', error)
    return { current: 0, longest: 0, daysUntilBreak: 1, lastCompletionDate: null, streakDates: [] }
  }
}

/**
 * Calculate longest streak from sorted dates
 */
function calculateLongestStreak(dates: string[]): number {
  if (dates.length === 0) return 0

  let longest = 1
  let current = 1

  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(dates[i - 1])
    const curr = new Date(dates[i])
    const diffDays = Math.round((prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays === 1) {
      current++
      longest = Math.max(longest, current)
    } else {
      current = 1
    }
  }

  return longest
}

/**
 * Get completion trend over time
 */
export async function getCompletionTrend(days: number): Promise<TimeSeriesPoint[]> {
  const endDate = getToday()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days + 1)
  const startStr = startDate.toISOString().split('T')[0]

  const items = await getAccomplishmentsInRange(startStr, endDate)

  // Group by date
  const dayMap = new Map<string, { tasks: number; subtasks: number; habits: number }>()

  // Initialize all days
  for (let d = new Date(startDate); d <= new Date(endDate); d.setDate(d.getDate() + 1)) {
    dayMap.set(d.toISOString().split('T')[0], { tasks: 0, subtasks: 0, habits: 0 })
  }

  // Count items
  for (const item of items) {
    const day = dayMap.get(item.completedDate)
    if (day) {
      if (item.type === 'task') day.tasks++
      else if (item.type === 'subtask') day.subtasks++
      else if (item.type === 'habit') day.habits++
    }
  }

  return Array.from(dayMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, counts]) => ({
      date,
      count: counts.tasks + counts.subtasks + counts.habits,
      tasks: counts.tasks,
      subtasks: counts.subtasks,
      habits: counts.habits,
    }))
}

// ============================================================================
// REFLECTION INTEGRATION
// ============================================================================

/**
 * Generate markdown for "What Got Done" section
 */
export async function generateWhatGotDoneMarkdown(
  date: string,
  config: Partial<AccomplishmentSyncConfig> = {}
): Promise<string> {
  const mergedConfig = { ...DEFAULT_SYNC_CONFIG, ...config }
  const daily = await getAccomplishmentsForDate(date)

  if (daily.items.length === 0) {
    return ''
  }

  // Filter based on config
  let items = daily.items
  if (!mergedConfig.includeSubtasks) {
    items = items.filter(i => i.type !== 'subtask')
  }
  if (!mergedConfig.includeHabits) {
    items = items.filter(i => i.type !== 'habit')
  }

  if (items.length === 0) {
    return ''
  }

  const lines: string[] = []

  if (mergedConfig.groupByProject) {
    // Group by project
    const byProject = new Map<string, AccomplishmentItem[]>()
    const noProject: AccomplishmentItem[] = []

    for (const item of items) {
      if (item.project) {
        const projectItems = byProject.get(item.project) || []
        projectItems.push(item)
        byProject.set(item.project, projectItems)
      } else {
        noProject.push(item)
      }
    }

    // Output grouped items
    Array.from(byProject.entries()).forEach(([project, projectItems]) => {
      lines.push(`**${project}**`)
      for (const item of projectItems) {
        lines.push(formatItem(item, mergedConfig))
      }
      lines.push('')
    })

    if (noProject.length > 0) {
      if (byProject.size > 0) {
        lines.push('**Other**')
      }
      for (const item of noProject) {
        lines.push(formatItem(item, mergedConfig))
      }
    }
  } else {
    // Flat list
    for (const item of items) {
      lines.push(formatItem(item, mergedConfig))
    }
  }

  return lines.join('\n').trim()
}

/**
 * Format a single accomplishment item
 */
function formatItem(item: AccomplishmentItem, config: AccomplishmentSyncConfig): string {
  let prefix: string
  switch (config.markdownFormat) {
    case 'checklist':
      prefix = '- [x]'
      break
    case 'numbered':
      prefix = '1.'
      break
    default:
      prefix = '-'
  }

  let text = `${prefix} ${item.title}`

  // Add type indicator for subtasks and habits
  if (item.type === 'subtask' && item.parentTaskTitle) {
    text += ` _(subtask of ${item.parentTaskTitle})_`
  } else if (item.type === 'habit' && item.habitStreak) {
    text += ` 🔥 ${item.habitStreak}`
  }

  // Add timestamp if configured
  if (config.showTimestamps && item.completedTime) {
    text += ` @ ${item.completedTime}`
  }

  return text
}

// ============================================================================
// EVENT SUBSCRIPTION
// ============================================================================

const subscribers = new Set<AccomplishmentCallback>()

/**
 * Subscribe to completion events
 */
export function subscribeToCompletions(callback: AccomplishmentCallback): () => void {
  subscribers.add(callback)
  return () => subscribers.delete(callback)
}

/**
 * Emit a completion event (called from planner when task/subtask completes)
 */
export function emitCompletionEvent(item: AccomplishmentItem): void {
  const event: AccomplishmentCompletedEvent = {
    item,
    timestamp: new Date().toISOString(),
  }

  Array.from(subscribers).forEach((callback) => {
    try {
      callback(event)
    } catch (error) {
      console.error('[AccomplishmentService] Subscriber error:', error)
    }
  })
}
