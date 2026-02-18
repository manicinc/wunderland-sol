/**
 * Habit Database Operations
 *
 * CRUD operations for habit streaks using the central codexDatabase.
 * Integrates with the planner_tasks table for habit task management.
 *
 * @module lib/planner/habits/database
 */

import { v4 as uuidv4 } from 'uuid'
import { getDatabase } from '../../codexDatabase'
import type { HabitStreak, HabitStats, HabitFrequency, HabitWithStreak } from './types'
import type { Task } from '../types'
import { getTask } from '../database'
import { createInitialStreak, calculateHabitStats, getStreakStatus } from './habitStreakManager'

// ============================================================================
// STREAK CRUD OPERATIONS
// ============================================================================

/**
 * Create a streak record for a habit task
 */
export async function createHabitStreak(taskId: string): Promise<HabitStreak | null> {
  const db = await getDatabase()
  if (!db) return null

  const streak = createInitialStreak(taskId)

  try {
    await db.run(
      `INSERT INTO habit_streaks (
        id, task_id, current_streak, longest_streak, last_completed_date,
        completion_history, streak_freezes_remaining, freeze_active_until,
        total_completions, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        streak.id,
        streak.taskId,
        streak.currentStreak,
        streak.longestStreak,
        streak.lastCompletedDate || null,
        JSON.stringify(streak.completionHistory),
        streak.streakFreezesRemaining,
        streak.freezeActiveUntil || null,
        streak.totalCompletions,
        streak.createdAt,
        streak.updatedAt,
      ]
    )

    return streak
  } catch (error) {
    console.error('[HabitDB] Failed to create streak:', error)
    return null
  }
}

/**
 * Get streak for a habit task
 */
export async function getHabitStreak(taskId: string): Promise<HabitStreak | null> {
  const db = await getDatabase()
  if (!db) return null

  try {
    const rows = (await db.all('SELECT * FROM habit_streaks WHERE task_id = ?', [taskId])) as
      | Array<Record<string, unknown>>
      | null

    if (!rows || rows.length === 0) return null
    return rowToStreak(rows[0])
  } catch (error) {
    console.error('[HabitDB] Failed to get streak:', error)
    return null
  }
}

/**
 * Get streak by streak ID
 */
export async function getHabitStreakById(id: string): Promise<HabitStreak | null> {
  const db = await getDatabase()
  if (!db) return null

  try {
    const rows = (await db.all('SELECT * FROM habit_streaks WHERE id = ?', [id])) as
      | Array<Record<string, unknown>>
      | null

    if (!rows || rows.length === 0) return null
    return rowToStreak(rows[0])
  } catch (error) {
    console.error('[HabitDB] Failed to get streak by ID:', error)
    return null
  }
}

/**
 * Get all habit streaks
 */
export async function getAllHabitStreaks(): Promise<HabitStreak[]> {
  const db = await getDatabase()
  if (!db) return []

  try {
    const rows = (await db.all(
      'SELECT * FROM habit_streaks ORDER BY current_streak DESC, total_completions DESC'
    )) as Array<Record<string, unknown>> | null

    return (rows || []).map(rowToStreak)
  } catch (error) {
    console.error('[HabitDB] Failed to get all streaks:', error)
    return []
  }
}

/**
 * Update a habit streak
 */
export async function updateHabitStreak(
  taskId: string,
  updates: Partial<HabitStreak>
): Promise<HabitStreak | null> {
  const db = await getDatabase()
  if (!db) return null

  const existing = await getHabitStreak(taskId)
  if (!existing) return null

  const now = new Date().toISOString()
  const setClauses: string[] = []
  const params: unknown[] = []

  if (updates.currentStreak !== undefined) {
    setClauses.push('current_streak = ?')
    params.push(updates.currentStreak)
  }
  if (updates.longestStreak !== undefined) {
    setClauses.push('longest_streak = ?')
    params.push(updates.longestStreak)
  }
  if (updates.lastCompletedDate !== undefined) {
    setClauses.push('last_completed_date = ?')
    params.push(updates.lastCompletedDate)
  }
  if (updates.completionHistory !== undefined) {
    setClauses.push('completion_history = ?')
    params.push(JSON.stringify(updates.completionHistory))
  }
  if (updates.streakFreezesRemaining !== undefined) {
    setClauses.push('streak_freezes_remaining = ?')
    params.push(updates.streakFreezesRemaining)
  }
  if (updates.freezeActiveUntil !== undefined) {
    setClauses.push('freeze_active_until = ?')
    params.push(updates.freezeActiveUntil || null)
  }
  if (updates.totalCompletions !== undefined) {
    setClauses.push('total_completions = ?')
    params.push(updates.totalCompletions)
  }

  // Always update timestamp
  setClauses.push('updated_at = ?')
  params.push(now)

  if (setClauses.length === 0) return existing

  try {
    await db.run(
      `UPDATE habit_streaks SET ${setClauses.join(', ')} WHERE task_id = ?`,
      [...params, taskId]
    )

    return getHabitStreak(taskId)
  } catch (error) {
    console.error('[HabitDB] Failed to update streak:', error)
    return null
  }
}

/**
 * Delete a habit streak
 */
export async function deleteHabitStreak(taskId: string): Promise<boolean> {
  const db = await getDatabase()
  if (!db) return false

  try {
    await db.run('DELETE FROM habit_streaks WHERE task_id = ?', [taskId])
    return true
  } catch (error) {
    console.error('[HabitDB] Failed to delete streak:', error)
    return false
  }
}

/**
 * Get or create streak for a task
 */
export async function getOrCreateStreak(taskId: string): Promise<HabitStreak | null> {
  const existing = await getHabitStreak(taskId)
  if (existing) return existing
  return createHabitStreak(taskId)
}

// ============================================================================
// HABIT TASK QUERIES
// ============================================================================

/**
 * Get all tasks that are habits (have #habit tag)
 */
export async function getHabitTasks(): Promise<Task[]> {
  const db = await getDatabase()
  if (!db) return []

  try {
    // Tasks with #habit in their tags JSON array
    const rows = (await db.all(
      `SELECT * FROM planner_tasks
       WHERE is_deleted = 0
       AND (tags LIKE '%"habit"%' OR tags LIKE '%"#habit"%')
       ORDER BY due_time ASC NULLS LAST, title ASC`
    )) as Array<Record<string, unknown>> | null

    return (rows || []).map(rowToTask)
  } catch (error) {
    console.error('[HabitDB] Failed to get habit tasks:', error)
    return []
  }
}

/**
 * Get habits with their streak data
 */
export async function getHabitsWithStreaks(): Promise<HabitWithStreak[]> {
  const habits = await getHabitTasks()
  const habitsWithStreaks: HabitWithStreak[] = []

  for (const habit of habits) {
    const streak = await getOrCreateStreak(habit.id)
    if (streak) {
      habitsWithStreaks.push({
        ...habit,
        streak,
        frequency: inferFrequencyFromTask(habit),
        targetCount: 1,
        preferredTime: habit.dueTime,
      })
    }
  }

  return habitsWithStreaks
}

/**
 * Get today's habits (due today or recurring habits that apply today)
 */
export async function getTodayHabits(): Promise<HabitWithStreak[]> {
  const today = new Date().toISOString().split('T')[0]
  const allHabits = await getHabitsWithStreaks()

  // Filter to habits that should be done today
  return allHabits.filter((habit) => {
    // If it has a due date, check if it's today
    if (habit.dueDate) {
      return habit.dueDate === today
    }

    // For recurring habits without specific due date, check recurrence
    if (habit.recurrenceRule) {
      // Daily habits are always due
      if (habit.recurrenceRule.frequency === 'daily') {
        return true
      }

      // Weekly habits - check byDay
      if (habit.recurrenceRule.frequency === 'weekly' && habit.recurrenceRule.byDay) {
        const dayOfWeek = new Date().getDay()
        return habit.recurrenceRule.byDay.includes(dayOfWeek)
      }

      return true // Default to showing recurring habits
    }

    return false
  })
}

/**
 * Get habits completed today
 */
export async function getCompletedTodayHabits(): Promise<HabitWithStreak[]> {
  const today = new Date().toISOString().split('T')[0]
  const allHabits = await getHabitsWithStreaks()

  return allHabits.filter((habit) => habit.streak.lastCompletedDate === today)
}

// ============================================================================
// STATS QUERIES
// ============================================================================

/**
 * Get aggregated habit statistics
 */
export async function getHabitStats(): Promise<HabitStats> {
  const streaks = await getAllHabitStreaks()
  const habits = await getHabitTasks()

  return calculateHabitStats(streaks, habits.length)
}

/**
 * Get top streaks
 */
export async function getTopStreaks(limit: number = 5): Promise<HabitStreak[]> {
  const db = await getDatabase()
  if (!db) return []

  try {
    const rows = (await db.all(
      `SELECT * FROM habit_streaks
       WHERE current_streak > 0
       ORDER BY current_streak DESC
       LIMIT ?`,
      [limit]
    )) as Array<Record<string, unknown>> | null

    return (rows || []).map(rowToStreak)
  } catch (error) {
    console.error('[HabitDB] Failed to get top streaks:', error)
    return []
  }
}

/**
 * Get habits at risk (in grace period)
 */
export async function getHabitsAtRisk(): Promise<HabitWithStreak[]> {
  const allHabits = await getHabitsWithStreaks()

  return allHabits.filter((habit) => {
    const status = getStreakStatus(habit.streak, habit.frequency)
    return status.inGracePeriod && status.currentStreak > 0
  })
}

/**
 * Get habits with broken streaks (that had a streak)
 */
export async function getHabitsNeedingRecovery(): Promise<HabitWithStreak[]> {
  const allHabits = await getHabitsWithStreaks()

  return allHabits.filter((habit) => {
    const status = getStreakStatus(habit.streak, habit.frequency)
    return !status.isActive && habit.streak.longestStreak > 0
  })
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Convert database row to HabitStreak
 */
function rowToStreak(row: Record<string, unknown>): HabitStreak {
  return {
    id: row.id as string,
    taskId: row.task_id as string,
    currentStreak: row.current_streak as number,
    longestStreak: row.longest_streak as number,
    lastCompletedDate: row.last_completed_date as string | undefined,
    completionHistory: row.completion_history
      ? JSON.parse(row.completion_history as string)
      : [],
    streakFreezesRemaining: row.streak_freezes_remaining as number,
    freezeActiveUntil: row.freeze_active_until as string | undefined,
    totalCompletions: row.total_completions as number,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

/**
 * Convert database row to Task (simplified version for habits)
 */
function rowToTask(row: Record<string, unknown>): Task {
  return {
    id: row.id as string,
    title: row.title as string,
    description: row.description as string | undefined,
    taskType: row.task_type as Task['taskType'],
    strandPath: row.strand_path as string | undefined,
    sourceLineNumber: row.source_line_number as number | undefined,
    checkboxText: row.checkbox_text as string | undefined,
    status: row.status as Task['status'],
    priority: row.priority as Task['priority'],
    dueDate: row.due_date as string | undefined,
    dueTime: row.due_time as string | undefined,
    duration: row.duration as number | undefined,
    reminderAt: row.reminder_at as string | undefined,
    completedAt: row.completed_at as string | undefined,
    recurrenceRule: row.recurrence_rule
      ? JSON.parse(row.recurrence_rule as string)
      : undefined,
    recurrenceEndDate: row.recurrence_end_date as string | undefined,
    parentTaskId: row.parent_task_id as string | undefined,
    tags: row.tags ? JSON.parse(row.tags as string) : undefined,
    project: row.project as string | undefined,
    googleEventId: row.google_event_id as string | undefined,
    googleCalendarId: row.google_calendar_id as string | undefined,
    syncStatus: row.sync_status as Task['syncStatus'],
    localVersion: row.local_version as number,
    remoteVersion: row.remote_version as number,
    lastSyncedAt: row.last_synced_at as string | undefined,
    etag: row.etag as string | undefined,
    isDeleted: (row.is_deleted as number) === 1,
    deletedAt: row.deleted_at as string | undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

/**
 * Infer habit frequency from task recurrence rule
 */
function inferFrequencyFromTask(task: Task): HabitFrequency {
  if (!task.recurrenceRule) {
    return 'daily' // Default
  }

  const rule = task.recurrenceRule

  // Check for weekdays pattern
  if (
    rule.frequency === 'weekly' &&
    rule.byDay &&
    rule.byDay.length === 5 &&
    [1, 2, 3, 4, 5].every((d) => rule.byDay!.includes(d))
  ) {
    return 'weekdays'
  }

  // Simple mappings
  if (rule.frequency === 'daily' && rule.interval === 1) {
    return 'daily'
  }

  if (rule.frequency === 'weekly') {
    return 'weekly'
  }

  return 'custom'
}

// ============================================================================
// BATCH OPERATIONS
// ============================================================================

/**
 * Initialize streaks for existing habit tasks that don't have streaks
 */
export async function initializeMissingStreaks(): Promise<number> {
  const habits = await getHabitTasks()
  let created = 0

  for (const habit of habits) {
    const existing = await getHabitStreak(habit.id)
    if (!existing) {
      const streak = await createHabitStreak(habit.id)
      if (streak) created++
    }
  }

  return created
}

/**
 * Clean up orphaned streaks (streaks for deleted tasks)
 */
export async function cleanupOrphanedStreaks(): Promise<number> {
  const db = await getDatabase()
  if (!db) return 0

  try {
    // Delete streaks where the task no longer exists or is deleted
    const result = await db.run(
      `DELETE FROM habit_streaks
       WHERE task_id NOT IN (
         SELECT id FROM planner_tasks WHERE is_deleted = 0
       )`
    )
    return (result as unknown as { changes?: number })?.changes || 0
  } catch (error) {
    console.error('[HabitDB] Failed to cleanup orphaned streaks:', error)
    return 0
  }
}
