/**
 * Planner Database Operations
 *
 * CRUD operations for tasks, events, and sync state.
 * Uses the central codexDatabase with IndexedDB persistence.
 *
 * @module lib/planner/database
 */

import { getDatabase } from '../codexDatabase'
import type {
  Task,
  CalendarEvent,
  CreateTaskInput,
  UpdateTaskInput,
  CreateEventInput,
  UpdateEventInput,
  SyncState,
  ChangeLogEntry,
  GoogleCalendar,
  GoogleCalendarTokens,
  Subtask,
  CreateSubtaskInput,
  UpdateSubtaskInput,
} from './types'
import { generatePlannerId } from './types'

/**
 * Generate a unique ID for subtasks
 */
function generateSubtaskId(): string {
  return `subtask_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

// ============================================================================
// TASK OPERATIONS
// ============================================================================

/**
 * Create a new task
 */
export async function createTask(input: CreateTaskInput): Promise<Task | null> {
  const db = await getDatabase()
  if (!db) return null

  const now = new Date().toISOString()
  const task: Task = {
    id: generatePlannerId('task'),
    title: input.title,
    description: input.description,
    taskType: input.taskType || 'standalone',
    strandPath: input.strandPath,
    sourceLineNumber: input.sourceLineNumber,
    checkboxText: input.checkboxText,
    status: input.status || 'pending',
    priority: input.priority || 'medium',
    dueDate: input.dueDate,
    dueTime: input.dueTime,
    duration: input.duration,
    reminderAt: input.reminderAt,
    recurrenceRule: input.recurrenceRule,
    recurrenceEndDate: input.recurrenceEndDate,
    tags: input.tags,
    project: input.project,
    syncStatus: 'local',
    localVersion: 1,
    remoteVersion: 0,
    isDeleted: false,
    createdAt: now,
    updatedAt: now,
  }

  try {
    await db.run(
      `INSERT INTO planner_tasks (
        id, title, description, task_type, strand_path, source_line_number, checkbox_text,
        status, priority, due_date, due_time, duration, reminder_at, completed_at,
        recurrence_rule, recurrence_end_date, parent_task_id, tags, project,
        google_event_id, google_calendar_id, sync_status, local_version, remote_version,
        last_synced_at, etag, is_deleted, deleted_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        task.id,
        task.title,
        task.description || null,
        task.taskType,
        task.strandPath || null,
        task.sourceLineNumber || null,
        task.checkboxText || null,
        task.status,
        task.priority,
        task.dueDate || null,
        task.dueTime || null,
        task.duration || null,
        task.reminderAt || null,
        null,
        task.recurrenceRule ? JSON.stringify(task.recurrenceRule) : null,
        task.recurrenceEndDate || null,
        null,
        task.tags ? JSON.stringify(task.tags) : null,
        task.project || null,
        null,
        null,
        task.syncStatus,
        task.localVersion,
        task.remoteVersion,
        null,
        null,
        0,
        null,
        task.createdAt,
        task.updatedAt,
      ]
    )

    // Log change for sync
    await logChange('task', task.id, 'create')

    return task
  } catch (error) {
    console.error('[PlannerDB] Failed to create task:', error)
    return null
  }
}

/**
 * Get a task by ID
 */
export async function getTask(id: string): Promise<Task | null> {
  const db = await getDatabase()
  if (!db) return null

  try {
    const rows = (await db.all('SELECT * FROM planner_tasks WHERE id = ? AND is_deleted = 0', [id])) as
      | Array<Record<string, unknown>>
      | null

    if (!rows || rows.length === 0) return null
    return rowToTask(rows[0])
  } catch (error) {
    console.error('[PlannerDB] Failed to get task:', error)
    return null
  }
}

/**
 * Get all tasks with optional filters
 */
export async function getTasks(filters?: {
  status?: string | string[]
  priority?: string | string[]
  strandPath?: string
  project?: string
  dueBefore?: string
  dueAfter?: string
  includeDeleted?: boolean
}): Promise<Task[]> {
  const db = await getDatabase()
  if (!db) return []

  try {
    let query = 'SELECT * FROM planner_tasks WHERE 1=1'
    const params: unknown[] = []

    if (!filters?.includeDeleted) {
      query += ' AND is_deleted = 0'
    }

    if (filters?.status) {
      const statuses = Array.isArray(filters.status) ? filters.status : [filters.status]
      query += ` AND status IN (${statuses.map(() => '?').join(',')})`
      params.push(...statuses)
    }

    if (filters?.priority) {
      const priorities = Array.isArray(filters.priority) ? filters.priority : [filters.priority]
      query += ` AND priority IN (${priorities.map(() => '?').join(',')})`
      params.push(...priorities)
    }

    if (filters?.strandPath) {
      query += ' AND strand_path = ?'
      params.push(filters.strandPath)
    }

    if (filters?.project) {
      query += ' AND project = ?'
      params.push(filters.project)
    }

    if (filters?.dueBefore) {
      query += ' AND due_date <= ?'
      params.push(filters.dueBefore)
    }

    if (filters?.dueAfter) {
      query += ' AND due_date >= ?'
      params.push(filters.dueAfter)
    }

    query += ' ORDER BY due_date ASC NULLS LAST, priority DESC, created_at DESC'

    const rows = (await db.all(query, params)) as Array<Record<string, unknown>> | null
    return (rows || []).map(rowToTask)
  } catch (error) {
    console.error('[PlannerDB] Failed to get tasks:', error)
    return []
  }
}

/**
 * Update a task
 */
export async function updateTask(id: string, input: UpdateTaskInput): Promise<Task | null> {
  const db = await getDatabase()
  if (!db) return null

  const existing = await getTask(id)
  if (!existing) return null

  const now = new Date().toISOString()
  const updates: string[] = []
  const params: unknown[] = []

  if (input.title !== undefined) {
    updates.push('title = ?')
    params.push(input.title)
  }
  if (input.description !== undefined) {
    updates.push('description = ?')
    params.push(input.description)
  }
  if (input.status !== undefined) {
    updates.push('status = ?')
    params.push(input.status)
    if (input.status === 'completed') {
      updates.push('completed_at = ?')
      params.push(now)
    }
  }
  if (input.priority !== undefined) {
    updates.push('priority = ?')
    params.push(input.priority)
  }
  if (input.dueDate !== undefined) {
    updates.push('due_date = ?')
    params.push(input.dueDate)
  }
  if (input.dueTime !== undefined) {
    updates.push('due_time = ?')
    params.push(input.dueTime)
  }
  if (input.duration !== undefined) {
    updates.push('duration = ?')
    params.push(input.duration)
  }
  if (input.reminderAt !== undefined) {
    updates.push('reminder_at = ?')
    params.push(input.reminderAt)
  }
  if (input.recurrenceRule !== undefined) {
    updates.push('recurrence_rule = ?')
    params.push(input.recurrenceRule ? JSON.stringify(input.recurrenceRule) : null)
  }
  if (input.tags !== undefined) {
    updates.push('tags = ?')
    params.push(JSON.stringify(input.tags))
  }
  if (input.project !== undefined) {
    updates.push('project = ?')
    params.push(input.project)
  }
  if (input.actualDuration !== undefined) {
    updates.push('actual_duration = ?')
    params.push(input.actualDuration)
  }
  if (input.timerStartedAt !== undefined) {
    updates.push('timer_started_at = ?')
    params.push(input.timerStartedAt)
  }
  if (input.timerAccumulatedMs !== undefined) {
    updates.push('timer_accumulated_ms = ?')
    params.push(input.timerAccumulatedMs)
  }

  // Always update version and timestamp
  updates.push('local_version = local_version + 1')
  updates.push('sync_status = ?')
  params.push('pending_sync')
  updates.push('updated_at = ?')
  params.push(now)

  if (updates.length === 0) return existing

  try {
    await db.run(`UPDATE planner_tasks SET ${updates.join(', ')} WHERE id = ?`, [...params, id])

    // Log change for sync
    await logChange('task', id, 'update', input as Record<string, unknown>)

    return getTask(id)
  } catch (error) {
    console.error('[PlannerDB] Failed to update task:', error)
    return null
  }
}

/**
 * Delete a task (soft delete)
 */
export async function deleteTask(id: string, permanent = false): Promise<boolean> {
  const db = await getDatabase()
  if (!db) return false

  try {
    if (permanent) {
      await db.run('DELETE FROM planner_tasks WHERE id = ?', [id])
    } else {
      const now = new Date().toISOString()
      await db.run(
        `UPDATE planner_tasks SET
          is_deleted = 1,
          deleted_at = ?,
          sync_status = 'pending_sync',
          local_version = local_version + 1,
          updated_at = ?
        WHERE id = ?`,
        [now, now, id]
      )
      await logChange('task', id, 'delete')
    }
    return true
  } catch (error) {
    console.error('[PlannerDB] Failed to delete task:', error)
    return false
  }
}

/**
 * Convert database row to Task object
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
    actualDuration: row.actual_duration as number | undefined,
    timerStartedAt: row.timer_started_at as string | undefined,
    timerAccumulatedMs: row.timer_accumulated_ms as number | undefined,
    reminderAt: row.reminder_at as string | undefined,
    completedAt: row.completed_at as string | undefined,
    recurrenceRule: row.recurrence_rule ? JSON.parse(row.recurrence_rule as string) : undefined,
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

// ============================================================================
// SUBTASK OPERATIONS
// ============================================================================

/**
 * Create a new subtask
 */
export async function createSubtask(input: CreateSubtaskInput): Promise<Subtask | null> {
  const db = await getDatabase()
  if (!db) return null

  const now = new Date().toISOString()

  // Get the next sort order if not provided
  let sortOrder = input.sortOrder
  if (sortOrder === undefined) {
    try {
      const rows = (await db.all(
        'SELECT MAX(sort_order) as max_order FROM planner_subtasks WHERE parent_task_id = ?',
        [input.parentTaskId]
      )) as Array<{ max_order: number | null }> | null
      sortOrder = ((rows?.[0]?.max_order || 0) as number) + 1
    } catch {
      sortOrder = 0
    }
  }

  const subtask: Subtask = {
    id: generateSubtaskId(),
    parentTaskId: input.parentTaskId,
    title: input.title,
    completed: false,
    sortOrder,
    createdAt: now,
    updatedAt: now,
  }

  try {
    await db.run(
      `INSERT INTO planner_subtasks (
        id, parent_task_id, title, completed, sort_order, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        subtask.id,
        subtask.parentTaskId,
        subtask.title,
        0,
        subtask.sortOrder,
        subtask.createdAt,
        subtask.updatedAt,
      ]
    )

    return subtask
  } catch (error) {
    console.error('[PlannerDB] Failed to create subtask:', error)
    return null
  }
}

/**
 * Get subtasks for a task
 */
export async function getSubtasks(parentTaskId: string): Promise<Subtask[]> {
  const db = await getDatabase()
  if (!db) return []

  try {
    const rows = (await db.all(
      'SELECT * FROM planner_subtasks WHERE parent_task_id = ? ORDER BY sort_order ASC',
      [parentTaskId]
    )) as Array<Record<string, unknown>> | null

    return (rows || []).map(rowToSubtask)
  } catch (error) {
    console.error('[PlannerDB] Failed to get subtasks:', error)
    return []
  }
}

/**
 * Get a single subtask by ID
 */
export async function getSubtask(id: string): Promise<Subtask | null> {
  const db = await getDatabase()
  if (!db) return null

  try {
    const rows = (await db.all('SELECT * FROM planner_subtasks WHERE id = ?', [id])) as
      | Array<Record<string, unknown>>
      | null

    if (!rows || rows.length === 0) return null
    return rowToSubtask(rows[0])
  } catch (error) {
    console.error('[PlannerDB] Failed to get subtask:', error)
    return null
  }
}

/**
 * Update a subtask
 */
export async function updateSubtask(id: string, input: UpdateSubtaskInput): Promise<Subtask | null> {
  const db = await getDatabase()
  if (!db) return null

  const existing = await getSubtask(id)
  if (!existing) return null

  const now = new Date().toISOString()
  const updates: string[] = []
  const params: unknown[] = []

  if (input.title !== undefined) {
    updates.push('title = ?')
    params.push(input.title)
  }
  if (input.completed !== undefined) {
    updates.push('completed = ?')
    params.push(input.completed ? 1 : 0)
    // Track completion timestamp for accomplishments
    if (input.completed) {
      updates.push('completed_at = ?')
      params.push(now)
    } else {
      updates.push('completed_at = ?')
      params.push(null)
    }
  }
  if (input.sortOrder !== undefined) {
    updates.push('sort_order = ?')
    params.push(input.sortOrder)
  }

  updates.push('updated_at = ?')
  params.push(now)

  if (updates.length === 1) return existing // Only updated_at, no actual changes

  try {
    await db.run(`UPDATE planner_subtasks SET ${updates.join(', ')} WHERE id = ?`, [...params, id])
    return getSubtask(id)
  } catch (error) {
    console.error('[PlannerDB] Failed to update subtask:', error)
    return null
  }
}

/**
 * Delete a subtask
 */
export async function deleteSubtask(id: string): Promise<boolean> {
  const db = await getDatabase()
  if (!db) return false

  try {
    await db.run('DELETE FROM planner_subtasks WHERE id = ?', [id])
    return true
  } catch (error) {
    console.error('[PlannerDB] Failed to delete subtask:', error)
    return false
  }
}

/**
 * Delete all subtasks for a task
 */
export async function deleteSubtasksForTask(parentTaskId: string): Promise<boolean> {
  const db = await getDatabase()
  if (!db) return false

  try {
    await db.run('DELETE FROM planner_subtasks WHERE parent_task_id = ?', [parentTaskId])
    return true
  } catch (error) {
    console.error('[PlannerDB] Failed to delete subtasks for task:', error)
    return false
  }
}

/**
 * Reorder subtasks
 */
export async function reorderSubtasks(parentTaskId: string, subtaskIds: string[]): Promise<boolean> {
  const db = await getDatabase()
  if (!db) return false

  const now = new Date().toISOString()

  try {
    for (let i = 0; i < subtaskIds.length; i++) {
      await db.run(
        'UPDATE planner_subtasks SET sort_order = ?, updated_at = ? WHERE id = ? AND parent_task_id = ?',
        [i, now, subtaskIds[i], parentTaskId]
      )
    }
    return true
  } catch (error) {
    console.error('[PlannerDB] Failed to reorder subtasks:', error)
    return false
  }
}

/**
 * Toggle subtask completion
 */
export async function toggleSubtaskCompletion(id: string): Promise<Subtask | null> {
  const existing = await getSubtask(id)
  if (!existing) return null

  return updateSubtask(id, { completed: !existing.completed })
}

/**
 * Get subtask count and completion stats for a task
 */
export async function getSubtaskStats(parentTaskId: string): Promise<{ total: number; completed: number }> {
  const db = await getDatabase()
  if (!db) return { total: 0, completed: 0 }

  try {
    const rows = (await db.all(
      `SELECT
        COUNT(*) as total,
        SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) as completed
       FROM planner_subtasks
       WHERE parent_task_id = ?`,
      [parentTaskId]
    )) as Array<{ total: number; completed: number }> | null

    if (!rows || rows.length === 0) return { total: 0, completed: 0 }
    return {
      total: rows[0].total || 0,
      completed: rows[0].completed || 0,
    }
  } catch (error) {
    console.error('[PlannerDB] Failed to get subtask stats:', error)
    return { total: 0, completed: 0 }
  }
}

/**
 * Check if all subtasks are completed (for auto-complete parent feature)
 */
export async function areAllSubtasksCompleted(parentTaskId: string): Promise<boolean> {
  const stats = await getSubtaskStats(parentTaskId)
  return stats.total > 0 && stats.total === stats.completed
}

/**
 * Convert database row to Subtask object
 */
function rowToSubtask(row: Record<string, unknown>): Subtask {
  return {
    id: row.id as string,
    parentTaskId: row.parent_task_id as string,
    title: row.title as string,
    completed: (row.completed as number) === 1,
    completedAt: row.completed_at as string | undefined,
    sortOrder: row.sort_order as number,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

// ============================================================================
// EVENT OPERATIONS
// ============================================================================

/**
 * Create a new calendar event
 */
export async function createEvent(input: CreateEventInput): Promise<CalendarEvent | null> {
  const db = await getDatabase()
  if (!db) return null

  const now = new Date().toISOString()
  const event: CalendarEvent = {
    id: generatePlannerId('event'),
    title: input.title,
    description: input.description,
    location: input.location,
    startDatetime: input.startDatetime,
    endDatetime: input.endDatetime,
    allDay: input.allDay || false,
    timezone: input.timezone || 'local',
    recurrenceRule: input.recurrenceRule,
    attendees: input.attendees,
    color: input.color,
    linkedTaskId: input.linkedTaskId,
    strandPath: input.strandPath,
    syncStatus: 'local',
    localVersion: 1,
    remoteVersion: 0,
    isDeleted: false,
    createdAt: now,
    updatedAt: now,
  }

  try {
    await db.run(
      `INSERT INTO planner_events (
        id, title, description, location, start_datetime, end_datetime, all_day, timezone,
        recurrence_rule, recurrence_end_date, parent_event_id, attendees, color,
        linked_task_id, strand_path, google_event_id, google_calendar_id,
        sync_status, local_version, remote_version, last_synced_at, etag,
        is_deleted, deleted_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        event.id,
        event.title,
        event.description || null,
        event.location || null,
        event.startDatetime,
        event.endDatetime,
        event.allDay ? 1 : 0,
        event.timezone,
        event.recurrenceRule ? JSON.stringify(event.recurrenceRule) : null,
        null,
        null,
        event.attendees ? JSON.stringify(event.attendees) : null,
        event.color || null,
        event.linkedTaskId || null,
        event.strandPath || null,
        null,
        null,
        event.syncStatus,
        event.localVersion,
        event.remoteVersion,
        null,
        null,
        0,
        null,
        event.createdAt,
        event.updatedAt,
      ]
    )

    await logChange('event', event.id, 'create')

    return event
  } catch (error) {
    console.error('[PlannerDB] Failed to create event:', error)
    return null
  }
}

/**
 * Get events for a date range
 */
export async function getEvents(filters?: {
  startAfter?: string
  endBefore?: string
  includeDeleted?: boolean
}): Promise<CalendarEvent[]> {
  const db = await getDatabase()
  if (!db) return []

  try {
    let query = 'SELECT * FROM planner_events WHERE 1=1'
    const params: unknown[] = []

    if (!filters?.includeDeleted) {
      query += ' AND is_deleted = 0'
    }

    if (filters?.startAfter) {
      query += ' AND end_datetime >= ?'
      params.push(filters.startAfter)
    }

    if (filters?.endBefore) {
      query += ' AND start_datetime <= ?'
      params.push(filters.endBefore)
    }

    query += ' ORDER BY start_datetime ASC'

    const rows = (await db.all(query, params)) as Array<Record<string, unknown>> | null
    return (rows || []).map(rowToEvent)
  } catch (error) {
    console.error('[PlannerDB] Failed to get events:', error)
    return []
  }
}

/**
 * Get a single event by ID
 */
export async function getEvent(id: string): Promise<CalendarEvent | null> {
  const db = await getDatabase()
  if (!db) return null

  try {
    const rows = (await db.all('SELECT * FROM planner_events WHERE id = ? AND is_deleted = 0', [id])) as
      | Array<Record<string, unknown>>
      | null

    if (!rows || rows.length === 0) return null
    return rowToEvent(rows[0])
  } catch (error) {
    console.error('[PlannerDB] Failed to get event:', error)
    return null
  }
}

/**
 * Update an event
 */
export async function updateEvent(id: string, input: UpdateEventInput): Promise<CalendarEvent | null> {
  const db = await getDatabase()
  if (!db) return null

  const existing = await getEvent(id)
  if (!existing) return null

  const now = new Date().toISOString()
  const updates: string[] = []
  const params: unknown[] = []

  if (input.title !== undefined) {
    updates.push('title = ?')
    params.push(input.title)
  }
  if (input.description !== undefined) {
    updates.push('description = ?')
    params.push(input.description)
  }
  if (input.location !== undefined) {
    updates.push('location = ?')
    params.push(input.location)
  }
  if (input.startDatetime !== undefined) {
    updates.push('start_datetime = ?')
    params.push(input.startDatetime)
  }
  if (input.endDatetime !== undefined) {
    updates.push('end_datetime = ?')
    params.push(input.endDatetime)
  }
  if (input.allDay !== undefined) {
    updates.push('all_day = ?')
    params.push(input.allDay ? 1 : 0)
  }
  if (input.timezone !== undefined) {
    updates.push('timezone = ?')
    params.push(input.timezone)
  }
  if (input.recurrenceRule !== undefined) {
    updates.push('recurrence_rule = ?')
    params.push(input.recurrenceRule ? JSON.stringify(input.recurrenceRule) : null)
  }
  if (input.recurrenceEndDate !== undefined) {
    updates.push('recurrence_end_date = ?')
    params.push(input.recurrenceEndDate)
  }
  if (input.attendees !== undefined) {
    updates.push('attendees = ?')
    params.push(input.attendees ? JSON.stringify(input.attendees) : null)
  }
  if (input.color !== undefined) {
    updates.push('color = ?')
    params.push(input.color)
  }
  if (input.linkedTaskId !== undefined) {
    updates.push('linked_task_id = ?')
    params.push(input.linkedTaskId)
  }
  if (input.strandPath !== undefined) {
    updates.push('strand_path = ?')
    params.push(input.strandPath)
  }

  // Always update version and timestamp
  updates.push('local_version = local_version + 1')
  updates.push('sync_status = ?')
  params.push('pending_sync')
  updates.push('updated_at = ?')
  params.push(now)

  if (updates.length === 0) return existing

  try {
    await db.run(`UPDATE planner_events SET ${updates.join(', ')} WHERE id = ?`, [...params, id])

    // Log change for sync
    await logChange('event', id, 'update', input as Record<string, unknown>)

    return getEvent(id)
  } catch (error) {
    console.error('[PlannerDB] Failed to update event:', error)
    return null
  }
}

/**
 * Delete an event (soft delete)
 */
export async function deleteEvent(id: string, permanent = false): Promise<boolean> {
  const db = await getDatabase()
  if (!db) return false

  try {
    if (permanent) {
      await db.run('DELETE FROM planner_events WHERE id = ?', [id])
    } else {
      const now = new Date().toISOString()
      await db.run(
        `UPDATE planner_events SET
          is_deleted = 1,
          deleted_at = ?,
          sync_status = 'pending_sync',
          local_version = local_version + 1,
          updated_at = ?
        WHERE id = ?`,
        [now, now, id]
      )
      await logChange('event', id, 'delete')
    }
    return true
  } catch (error) {
    console.error('[PlannerDB] Failed to delete event:', error)
    return false
  }
}

/**
 * Convert database row to CalendarEvent object
 */
function rowToEvent(row: Record<string, unknown>): CalendarEvent {
  return {
    id: row.id as string,
    title: row.title as string,
    description: row.description as string | undefined,
    location: row.location as string | undefined,
    startDatetime: row.start_datetime as string,
    endDatetime: row.end_datetime as string,
    allDay: (row.all_day as number) === 1,
    timezone: row.timezone as string,
    recurrenceRule: row.recurrence_rule ? JSON.parse(row.recurrence_rule as string) : undefined,
    recurrenceEndDate: row.recurrence_end_date as string | undefined,
    parentEventId: row.parent_event_id as string | undefined,
    attendees: row.attendees ? JSON.parse(row.attendees as string) : undefined,
    color: row.color as string | undefined,
    linkedTaskId: row.linked_task_id as string | undefined,
    strandPath: row.strand_path as string | undefined,
    googleEventId: row.google_event_id as string | undefined,
    googleCalendarId: row.google_calendar_id as string | undefined,
    syncStatus: row.sync_status as CalendarEvent['syncStatus'],
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

// ============================================================================
// CHANGE LOG OPERATIONS
// ============================================================================

/**
 * Log a change for offline sync
 */
async function logChange(
  entityType: 'task' | 'event',
  entityId: string,
  operation: 'create' | 'update' | 'delete',
  fieldChanges?: Record<string, unknown>
): Promise<void> {
  const db = await getDatabase()
  if (!db) return

  try {
    // Get the next sequence number
    const rows = (await db.all('SELECT MAX(sequence_number) as max_seq FROM planner_change_log')) as
      | Array<{ max_seq: number | null }>
      | null
    const nextSeq = ((rows?.[0]?.max_seq || 0) as number) + 1

    await db.run(
      `INSERT INTO planner_change_log (
        id, entity_type, entity_id, operation, field_changes,
        sync_status, sync_attempts, sequence_number, created_at
      ) VALUES (?, ?, ?, ?, ?, 'pending', 0, ?, ?)`,
      [
        generatePlannerId('change'),
        entityType,
        entityId,
        operation,
        fieldChanges ? JSON.stringify(fieldChanges) : null,
        nextSeq,
        new Date().toISOString(),
      ]
    )
  } catch (error) {
    console.error('[PlannerDB] Failed to log change:', error)
  }
}

/**
 * Get pending changes for sync
 */
export async function getPendingChanges(): Promise<ChangeLogEntry[]> {
  const db = await getDatabase()
  if (!db) return []

  try {
    const rows = (await db.all(
      `SELECT * FROM planner_change_log
       WHERE sync_status = 'pending'
       ORDER BY sequence_number ASC`
    )) as Array<Record<string, unknown>> | null

    return (rows || []).map((row) => ({
      id: row.id as string,
      entityType: row.entity_type as 'task' | 'event',
      entityId: row.entity_id as string,
      operation: row.operation as 'create' | 'update' | 'delete',
      fieldChanges: row.field_changes ? JSON.parse(row.field_changes as string) : undefined,
      syncStatus: row.sync_status as ChangeLogEntry['syncStatus'],
      syncAttempts: row.sync_attempts as number,
      lastSyncAttemptAt: row.last_sync_attempt_at as string | undefined,
      syncError: row.sync_error as string | undefined,
      sequenceNumber: row.sequence_number as number,
      createdAt: row.created_at as string,
    }))
  } catch (error) {
    console.error('[PlannerDB] Failed to get pending changes:', error)
    return []
  }
}

/**
 * Mark a change as synced
 */
export async function markChangeSynced(id: string): Promise<boolean> {
  const db = await getDatabase()
  if (!db) return false

  try {
    await db.run(`UPDATE planner_change_log SET sync_status = 'synced' WHERE id = ?`, [id])
    return true
  } catch {
    return false
  }
}

// ============================================================================
// OAUTH TOKEN OPERATIONS
// ============================================================================

/**
 * Save OAuth tokens (encrypted)
 */
export async function saveOAuthTokens(tokens: GoogleCalendarTokens): Promise<boolean> {
  const db = await getDatabase()
  if (!db) return false

  const now = new Date().toISOString()

  try {
    // In production, these should be encrypted using apiKeyStorage pattern
    await db.run(
      `INSERT INTO planner_oauth_tokens (
        id, provider, encrypted_access_token, encrypted_refresh_token,
        expires_at, scope, token_type, user_email, user_id,
        selected_calendars, primary_calendar_id, created_at, updated_at, last_used_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        encrypted_access_token = excluded.encrypted_access_token,
        encrypted_refresh_token = excluded.encrypted_refresh_token,
        expires_at = excluded.expires_at,
        scope = excluded.scope,
        user_email = excluded.user_email,
        user_id = excluded.user_id,
        updated_at = excluded.updated_at,
        last_used_at = excluded.last_used_at`,
      [
        'google_calendar',
        'google',
        tokens.accessToken, // Should be encrypted in production
        tokens.refreshToken || null,
        tokens.expiresAt,
        tokens.scope,
        tokens.tokenType,
        tokens.userEmail || null,
        tokens.userId || null,
        null,
        null,
        now,
        now,
        now,
      ]
    )
    return true
  } catch (error) {
    console.error('[PlannerDB] Failed to save OAuth tokens:', error)
    return false
  }
}

/**
 * Get OAuth tokens
 */
export async function getOAuthTokens(): Promise<GoogleCalendarTokens | null> {
  const db = await getDatabase()
  if (!db) return null

  try {
    const rows = (await db.all('SELECT * FROM planner_oauth_tokens WHERE id = ?', ['google_calendar'])) as
      | Array<Record<string, unknown>>
      | null

    if (!rows || rows.length === 0) return null

    const row = rows[0]
    return {
      accessToken: row.encrypted_access_token as string,
      refreshToken: row.encrypted_refresh_token as string | undefined,
      expiresAt: row.expires_at as number,
      scope: row.scope as string,
      tokenType: row.token_type as string,
      userEmail: row.user_email as string | undefined,
      userId: row.user_id as string | undefined,
    }
  } catch (error) {
    console.error('[PlannerDB] Failed to get OAuth tokens:', error)
    return null
  }
}

/**
 * Delete OAuth tokens (sign out)
 */
export async function deleteOAuthTokens(): Promise<boolean> {
  const db = await getDatabase()
  if (!db) return false

  try {
    await db.run('DELETE FROM planner_oauth_tokens WHERE id = ?', ['google_calendar'])
    return true
  } catch {
    return false
  }
}

// ============================================================================
// CALENDAR LIST OPERATIONS
// ============================================================================

/**
 * Save Google calendars
 */
export async function saveCalendars(calendars: GoogleCalendar[]): Promise<boolean> {
  const db = await getDatabase()
  if (!db) return false

  const now = new Date().toISOString()

  try {
    for (const cal of calendars) {
      await db.run(
        `INSERT INTO planner_calendars (
          id, google_calendar_id, name, description, color,
          is_primary, is_selected, access_role, last_synced_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(google_calendar_id) DO UPDATE SET
          name = excluded.name,
          description = excluded.description,
          color = excluded.color,
          is_primary = excluded.is_primary,
          access_role = excluded.access_role,
          last_synced_at = excluded.last_synced_at,
          updated_at = excluded.updated_at`,
        [
          cal.id,
          cal.googleCalendarId,
          cal.name,
          cal.description || null,
          cal.color || null,
          cal.isPrimary ? 1 : 0,
          cal.isSelected ? 1 : 0,
          cal.accessRole,
          cal.lastSyncedAt || null,
          now,
          now,
        ]
      )
    }
    return true
  } catch (error) {
    console.error('[PlannerDB] Failed to save calendars:', error)
    return false
  }
}

/**
 * Get saved calendars
 */
export async function getCalendars(): Promise<GoogleCalendar[]> {
  const db = await getDatabase()
  if (!db) return []

  try {
    const rows = (await db.all('SELECT * FROM planner_calendars ORDER BY is_primary DESC, name ASC')) as
      | Array<Record<string, unknown>>
      | null

    return (rows || []).map((row) => ({
      id: row.id as string,
      googleCalendarId: row.google_calendar_id as string,
      name: row.name as string,
      description: row.description as string | undefined,
      color: row.color as string | undefined,
      isPrimary: (row.is_primary as number) === 1,
      isSelected: (row.is_selected as number) === 1,
      accessRole: row.access_role as GoogleCalendar['accessRole'],
      lastSyncedAt: row.last_synced_at as string | undefined,
    }))
  } catch (error) {
    console.error('[PlannerDB] Failed to get calendars:', error)
    return []
  }
}

/**
 * Toggle calendar selection
 */
export async function toggleCalendarSelection(googleCalendarId: string, selected: boolean): Promise<boolean> {
  const db = await getDatabase()
  if (!db) return false

  try {
    await db.run(`UPDATE planner_calendars SET is_selected = ?, updated_at = ? WHERE google_calendar_id = ?`, [
      selected ? 1 : 0,
      new Date().toISOString(),
      googleCalendarId,
    ])
    return true
  } catch {
    return false
  }
}
