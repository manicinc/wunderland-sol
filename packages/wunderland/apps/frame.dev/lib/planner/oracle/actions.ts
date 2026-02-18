/**
 * Oracle AI Assistant Actions
 *
 * Executes task management actions from Oracle commands.
 *
 * @module lib/planner/oracle/actions
 */

import type { Task, CreateTaskInput, UpdateTaskInput, Subtask } from '../types'
import * as db from '../database'
import {
  executeEnrichmentAction,
  type EnrichmentActionType,
  type ExtendedOracleActionType,
} from './documentEnrichment'

export type OracleActionType =
  | 'create_task'
  | 'update_task'
  | 'delete_task'
  | 'complete_task'
  | 'schedule_task'
  | 'create_subtask'
  | 'move_tasks'
  | 'timebox_day'
  | 'find_free_time'
  | 'suggest_focus'

/**
 * Enrichment action types for document enhancement
 */
export const ENRICHMENT_ACTION_TYPES: EnrichmentActionType[] = [
  'enrich_document',
  'extract_mentions',
  'suggest_tags',
  'suggest_category',
  'find_related',
  'evaluate_formula',
  'suggest_views',
  'create_mention',
  'resolve_mention',
  'analyze_document',
]

export interface OracleAction {
  type: ExtendedOracleActionType
  params: Record<string, unknown>
  confirmation: string
  requiresConfirmation: boolean
}

export interface OracleActionResult {
  success: boolean
  message: string
  data?: unknown
  error?: string
}

/**
 * Check if an action type is an enrichment action
 */
function isEnrichmentAction(type: string): type is EnrichmentActionType {
  return ENRICHMENT_ACTION_TYPES.includes(type as EnrichmentActionType)
}

/**
 * Execute an Oracle action
 */
export async function executeAction(action: OracleAction): Promise<OracleActionResult> {
  try {
    // Handle document enrichment actions
    if (isEnrichmentAction(action.type)) {
      return await executeEnrichmentAction(
        action as OracleAction & { type: EnrichmentActionType }
      )
    }

    switch (action.type) {
      case 'create_task':
        return await createTask(action.params)
      case 'update_task':
        return await updateTask(action.params)
      case 'delete_task':
        return await deleteTask(action.params)
      case 'complete_task':
        return await completeTask(action.params)
      case 'schedule_task':
        return await scheduleTask(action.params)
      case 'create_subtask':
        return await createSubtask(action.params)
      case 'move_tasks':
        return await moveTasks(action.params)
      case 'timebox_day':
        return await timeboxDay(action.params)
      case 'find_free_time':
        return await findFreeTime(action.params)
      case 'suggest_focus':
        return await suggestFocus(action.params)
      default:
        return {
          success: false,
          message: `Unknown action: ${action.type}`,
          error: 'UNKNOWN_ACTION',
        }
    }
  } catch (error) {
    return {
      success: false,
      message: `Failed to execute action: ${error instanceof Error ? error.message : 'Unknown error'}`,
      error: 'EXECUTION_ERROR',
    }
  }
}

/**
 * Create a new task
 */
async function createTask(params: Record<string, unknown>): Promise<OracleActionResult> {
  const input: CreateTaskInput = {
    title: params.title as string,
    description: params.description as string | undefined,
    dueDate: params.dueDate as string | undefined,
    dueTime: params.dueTime as string | undefined,
    duration: params.duration as number | undefined,
    priority: params.priority as CreateTaskInput['priority'],
    project: params.project as string | undefined,
    tags: params.tags as string[] | undefined,
  }

  const task = await db.createTask(input)

  if (!task) {
    return { success: false, message: 'Failed to create task', error: 'CREATE_FAILED' }
  }

  // Create subtasks if provided
  if (params.subtasks && Array.isArray(params.subtasks)) {
    for (const subtaskTitle of params.subtasks) {
      await db.createSubtask({
        parentTaskId: task.id,
        title: subtaskTitle as string,
      })
    }
  }

  return {
    success: true,
    message: `Created task "${task.title}"`,
    data: task,
  }
}

/**
 * Update an existing task
 */
async function updateTask(params: Record<string, unknown>): Promise<OracleActionResult> {
  const taskId = params.taskId as string
  if (!taskId) {
    return { success: false, message: 'Task ID required', error: 'MISSING_ID' }
  }

  const updates: UpdateTaskInput = {}
  if (params.title !== undefined) updates.title = params.title as string
  if (params.description !== undefined) updates.description = params.description as string
  if (params.dueDate !== undefined) updates.dueDate = params.dueDate as string | null
  if (params.dueTime !== undefined) updates.dueTime = params.dueTime as string | null
  if (params.duration !== undefined) updates.duration = params.duration as number | null
  if (params.priority !== undefined) updates.priority = params.priority as UpdateTaskInput['priority']
  if (params.project !== undefined) updates.project = params.project as string | null
  if (params.status !== undefined) updates.status = params.status as UpdateTaskInput['status']

  const task = await db.updateTask(taskId, updates)

  if (!task) {
    return { success: false, message: 'Failed to update task', error: 'UPDATE_FAILED' }
  }

  return {
    success: true,
    message: `Updated task "${task.title}"`,
    data: task,
  }
}

/**
 * Delete a task
 */
async function deleteTask(params: Record<string, unknown>): Promise<OracleActionResult> {
  const taskId = params.taskId as string
  if (!taskId) {
    return { success: false, message: 'Task ID required', error: 'MISSING_ID' }
  }

  const task = await db.getTask(taskId)
  const success = await db.deleteTask(taskId)

  if (!success) {
    return { success: false, message: 'Failed to delete task', error: 'DELETE_FAILED' }
  }

  return {
    success: true,
    message: `Deleted task "${task?.title || taskId}"`,
  }
}

/**
 * Complete a task
 */
async function completeTask(params: Record<string, unknown>): Promise<OracleActionResult> {
  const taskId = params.taskId as string
  if (!taskId) {
    return { success: false, message: 'Task ID required', error: 'MISSING_ID' }
  }

  const task = await db.updateTask(taskId, { status: 'completed' })

  if (!task) {
    return { success: false, message: 'Failed to complete task', error: 'UPDATE_FAILED' }
  }

  return {
    success: true,
    message: `Completed task "${task.title}"`,
    data: task,
  }
}

/**
 * Schedule a task for a specific date/time
 */
async function scheduleTask(params: Record<string, unknown>): Promise<OracleActionResult> {
  const taskId = params.taskId as string
  if (!taskId) {
    return { success: false, message: 'Task ID required', error: 'MISSING_ID' }
  }

  const updates: UpdateTaskInput = {}
  if (params.dueDate) updates.dueDate = params.dueDate as string
  if (params.dueTime) updates.dueTime = params.dueTime as string

  const task = await db.updateTask(taskId, updates)

  if (!task) {
    return { success: false, message: 'Failed to schedule task', error: 'UPDATE_FAILED' }
  }

  return {
    success: true,
    message: `Scheduled "${task.title}" for ${task.dueDate}${task.dueTime ? ` at ${task.dueTime}` : ''}`,
    data: task,
  }
}

/**
 * Create a subtask
 */
async function createSubtask(params: Record<string, unknown>): Promise<OracleActionResult> {
  const parentTaskId = params.parentTaskId as string
  const title = params.title as string

  if (!parentTaskId || !title) {
    return { success: false, message: 'Parent task ID and title required', error: 'MISSING_PARAMS' }
  }

  const subtask = await db.createSubtask({ parentTaskId, title })

  if (!subtask) {
    return { success: false, message: 'Failed to create subtask', error: 'CREATE_FAILED' }
  }

  return {
    success: true,
    message: `Added subtask "${title}"`,
    data: subtask,
  }
}

/**
 * Move multiple tasks to a new date
 */
async function moveTasks(params: Record<string, unknown>): Promise<OracleActionResult> {
  const taskIds = params.taskIds as string[]
  const toDate = params.toDate as string

  if (!taskIds || taskIds.length === 0 || !toDate) {
    return { success: false, message: 'Task IDs and target date required', error: 'MISSING_PARAMS' }
  }

  const results = await Promise.all(
    taskIds.map((id) => db.updateTask(id, { dueDate: toDate }))
  )

  const successCount = results.filter(Boolean).length

  return {
    success: successCount > 0,
    message: `Moved ${successCount} of ${taskIds.length} task(s) to ${toDate}`,
    data: { moved: successCount, total: taskIds.length },
  }
}

/**
 * Create a timeboxed schedule for a day
 */
async function timeboxDay(params: Record<string, unknown>): Promise<OracleActionResult> {
  const date = (params.date as string) || new Date().toISOString().split('T')[0]
  const startHour = (params.startHour as number) || 9
  const endHour = (params.endHour as number) || 17

  // Get tasks for the day
  const tasks = await db.getTasks({
    dueAfter: date,
    dueBefore: date,
    status: 'pending',
  })

  if (tasks.length === 0) {
    return {
      success: true,
      message: `No tasks to schedule for ${date}`,
      data: { schedule: [] },
    }
  }

  // Sort by priority (urgent > high > medium > low)
  const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 }
  const sortedTasks = [...tasks].sort((a, b) =>
    priorityOrder[a.priority] - priorityOrder[b.priority]
  )

  // Create schedule
  const schedule: Array<{ taskId: string; title: string; startTime: string; endTime: string }> = []
  let currentMinutes = startHour * 60

  for (const task of sortedTasks) {
    const duration = task.duration || 30 // Default 30 min if no estimate
    const startTime = `${Math.floor(currentMinutes / 60).toString().padStart(2, '0')}:${(currentMinutes % 60).toString().padStart(2, '0')}`
    currentMinutes += duration
    const endTime = `${Math.floor(currentMinutes / 60).toString().padStart(2, '0')}:${(currentMinutes % 60).toString().padStart(2, '0')}`

    // Don't schedule past end hour
    if (currentMinutes > endHour * 60) break

    schedule.push({
      taskId: task.id,
      title: task.title,
      startTime,
      endTime,
    })

    // Update task with scheduled time
    await db.updateTask(task.id, { dueTime: startTime })

    // Add 5 min buffer
    currentMinutes += 5
  }

  return {
    success: true,
    message: `Created schedule with ${schedule.length} time blocks for ${date}`,
    data: { date, schedule },
  }
}

/**
 * Find free time slots
 */
async function findFreeTime(params: Record<string, unknown>): Promise<OracleActionResult> {
  const date = (params.date as string) || new Date().toISOString().split('T')[0]
  const duration = (params.duration as number) || 60 // Default looking for 1 hour
  const startHour = (params.startHour as number) || 9
  const endHour = (params.endHour as number) || 17

  // Get events and scheduled tasks for the day
  const tasks = await db.getTasks({
    dueAfter: date,
    dueBefore: date,
  })

  // Build busy time blocks
  const busyBlocks: Array<{ start: number; end: number }> = []

  for (const task of tasks) {
    if (task.dueTime && task.duration) {
      const [hours, minutes] = task.dueTime.split(':').map(Number)
      const start = hours * 60 + minutes
      const end = start + task.duration
      busyBlocks.push({ start, end })
    }
  }

  // Sort by start time
  busyBlocks.sort((a, b) => a.start - b.start)

  // Find free slots
  const freeSlots: Array<{ start: string; end: string; duration: number }> = []
  let currentMinutes = startHour * 60

  for (const block of busyBlocks) {
    if (block.start > currentMinutes) {
      const gapDuration = block.start - currentMinutes
      if (gapDuration >= duration) {
        freeSlots.push({
          start: `${Math.floor(currentMinutes / 60).toString().padStart(2, '0')}:${(currentMinutes % 60).toString().padStart(2, '0')}`,
          end: `${Math.floor(block.start / 60).toString().padStart(2, '0')}:${(block.start % 60).toString().padStart(2, '0')}`,
          duration: gapDuration,
        })
      }
    }
    currentMinutes = Math.max(currentMinutes, block.end)
  }

  // Check for time at the end of day
  if (currentMinutes < endHour * 60) {
    const gapDuration = endHour * 60 - currentMinutes
    if (gapDuration >= duration) {
      freeSlots.push({
        start: `${Math.floor(currentMinutes / 60).toString().padStart(2, '0')}:${(currentMinutes % 60).toString().padStart(2, '0')}`,
        end: `${endHour.toString().padStart(2, '0')}:00`,
        duration: gapDuration,
      })
    }
  }

  return {
    success: true,
    message: `Found ${freeSlots.length} free slot(s) of at least ${duration} minutes on ${date}`,
    data: { date, freeSlots },
  }
}

/**
 * Suggest what to focus on next
 */
async function suggestFocus(params: Record<string, unknown>): Promise<OracleActionResult> {
  const today = new Date().toISOString().split('T')[0]

  // Get overdue tasks
  const allTasks = await db.getTasks({ status: 'pending' })
  const overdueTasks = allTasks.filter((t) => t.dueDate && t.dueDate < today)
  const todayTasks = allTasks.filter((t) => t.dueDate === today)
  const urgentTasks = allTasks.filter((t) => t.priority === 'urgent')

  let suggestion: Task | null = null
  let reason = ''

  // Priority: Urgent > Overdue > Today > Highest priority
  if (urgentTasks.length > 0) {
    suggestion = urgentTasks[0]
    reason = 'This is marked as urgent priority'
  } else if (overdueTasks.length > 0) {
    suggestion = overdueTasks.sort((a, b) =>
      (a.dueDate || '').localeCompare(b.dueDate || '')
    )[0]
    reason = 'This task is overdue and should be completed'
  } else if (todayTasks.length > 0) {
    // Sort today's tasks by priority
    const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 }
    suggestion = todayTasks.sort((a, b) =>
      priorityOrder[a.priority] - priorityOrder[b.priority]
    )[0]
    reason = 'This is the highest priority task for today'
  } else if (allTasks.length > 0) {
    // Get next upcoming task
    const upcoming = allTasks
      .filter((t) => t.dueDate)
      .sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''))

    if (upcoming.length > 0) {
      suggestion = upcoming[0]
      reason = `This is due on ${suggestion.dueDate}`
    }
  }

  if (!suggestion) {
    return {
      success: true,
      message: 'No pending tasks found. Great job staying on top of things!',
      data: { suggestion: null, stats: { overdue: 0, today: 0, urgent: 0, total: 0 } },
    }
  }

  return {
    success: true,
    message: `Focus on: "${suggestion.title}" - ${reason}`,
    data: {
      suggestion,
      reason,
      stats: {
        overdue: overdueTasks.length,
        today: todayTasks.length,
        urgent: urgentTasks.length,
        total: allTasks.length,
      },
    },
  }
}
