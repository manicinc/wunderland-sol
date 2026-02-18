/**
 * useKanbanBoard Hook
 *
 * State management for the Kanban board view
 * Handles grouping, filtering, and task movement
 *
 * @module components/quarry/ui/planner/KanbanView/useKanbanBoard
 */

'use client'

import { useMemo, useCallback, useState } from 'react'
import type { Task, TaskStatus, TaskPriority, UpdateTaskInput } from '@/lib/planner/types'
import { isTaskOverdue, isTaskDueToday } from '@/lib/planner/types'

// ============================================================================
// TYPES
// ============================================================================

export type GroupBy = 'status' | 'priority' | 'project'

export interface KanbanFilters {
  project?: string
  priority?: TaskPriority[]
  tags?: string[]
  showCompleted?: boolean
  showCancelled?: boolean
}

export interface KanbanStats {
  total: number
  byStatus: Record<TaskStatus, number>
  overdue: number
  dueToday: number
}

export interface KanbanColumn {
  id: TaskStatus
  label: string
  tasks: Task[]
  count: number
}

export interface UseKanbanBoardOptions {
  tasks: Task[]
  updateTask: (id: string, updates: UpdateTaskInput) => Promise<Task | null>
  filters?: KanbanFilters
  groupBy?: GroupBy
}

export interface UseKanbanBoardReturn {
  // Columns
  columns: KanbanColumn[]

  // Stats
  stats: KanbanStats

  // Actions
  moveTask: (taskId: string, newStatus: TaskStatus) => Promise<void>
  reorderTasks: (status: TaskStatus, taskIds: string[]) => void

  // State
  isMoving: boolean
  movingTaskId: string | null
  error: Error | null

  // Filters
  filters: KanbanFilters
  setFilters: (filters: KanbanFilters) => void
  groupBy: GroupBy
  setGroupBy: (groupBy: GroupBy) => void
}

// ============================================================================
// CONSTANTS
// ============================================================================

const STATUS_ORDER: TaskStatus[] = ['pending', 'in_progress', 'completed', 'cancelled']

const STATUS_LABELS: Record<TaskStatus, string> = {
  pending: 'To Do',
  in_progress: 'In Progress',
  completed: 'Done',
  cancelled: 'Cancelled',
}

// ============================================================================
// HOOK
// ============================================================================

export function useKanbanBoard({
  tasks,
  updateTask,
  filters: initialFilters = {},
  groupBy: initialGroupBy = 'status',
}: UseKanbanBoardOptions): UseKanbanBoardReturn {
  // Local state
  const [isMoving, setIsMoving] = useState(false)
  const [movingTaskId, setMovingTaskId] = useState<string | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [filters, setFilters] = useState<KanbanFilters>(initialFilters)
  const [groupBy, setGroupBy] = useState<GroupBy>(initialGroupBy)

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      // Filter by deleted
      if (task.isDeleted) return false

      // Filter by completed
      if (!filters.showCompleted && task.status === 'completed') return false

      // Filter by cancelled
      if (!filters.showCancelled && task.status === 'cancelled') return false

      // Filter by project
      if (filters.project && task.project !== filters.project) return false

      // Filter by priority
      if (filters.priority?.length && !filters.priority.includes(task.priority)) return false

      // Filter by tags
      if (filters.tags?.length) {
        const taskTags = task.tags ?? []
        if (!filters.tags.some(tag => taskTags.includes(tag))) return false
      }

      return true
    })
  }, [tasks, filters])

  // Group tasks into columns
  const columns = useMemo((): KanbanColumn[] => {
    const statusMap = new Map<TaskStatus, Task[]>()

    // Initialize all statuses
    STATUS_ORDER.forEach(status => {
      statusMap.set(status, [])
    })

    // Group tasks by status
    filteredTasks.forEach(task => {
      const list = statusMap.get(task.status) ?? []
      list.push(task)
      statusMap.set(task.status, list)
    })

    // Sort tasks within each column by priority and due date
    statusMap.forEach((taskList) => {
      taskList.sort((a, b) => {
        // Priority order: urgent > high > medium > low
        const priorityOrder: Record<TaskPriority, number> = { urgent: 0, high: 1, medium: 2, low: 3 }
        const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority]
        if (priorityDiff !== 0) return priorityDiff

        // Due date: earlier first
        if (a.dueDate && b.dueDate) {
          return a.dueDate.localeCompare(b.dueDate)
        }
        if (a.dueDate) return -1
        if (b.dueDate) return 1

        // Fall back to creation date
        return a.createdAt.localeCompare(b.createdAt)
      })
    })

    // Build columns array
    return STATUS_ORDER
      .filter(status => {
        // Always show pending and in_progress
        if (status === 'pending' || status === 'in_progress') return true
        // Show completed if enabled
        if (status === 'completed') return filters.showCompleted
        // Show cancelled if enabled
        if (status === 'cancelled') return filters.showCancelled
        return true
      })
      .map(status => ({
        id: status,
        label: STATUS_LABELS[status],
        tasks: statusMap.get(status) ?? [],
        count: statusMap.get(status)?.length ?? 0,
      }))
  }, [filteredTasks, filters.showCompleted, filters.showCancelled])

  // Calculate stats
  const stats = useMemo((): KanbanStats => {
    const byStatus: Record<TaskStatus, number> = {
      pending: 0,
      in_progress: 0,
      completed: 0,
      cancelled: 0,
    }

    let overdue = 0
    let dueToday = 0

    filteredTasks.forEach(task => {
      byStatus[task.status]++
      if (isTaskOverdue(task)) overdue++
      if (isTaskDueToday(task)) dueToday++
    })

    return {
      total: filteredTasks.length,
      byStatus,
      overdue,
      dueToday,
    }
  }, [filteredTasks])

  // Move task to a new status
  const moveTask = useCallback(async (taskId: string, newStatus: TaskStatus) => {
    setIsMoving(true)
    setMovingTaskId(taskId)
    setError(null)

    try {
      await updateTask(taskId, { status: newStatus })
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to move task')
      setError(error)
      console.error('[useKanbanBoard] Move failed:', error)
    } finally {
      setIsMoving(false)
      setMovingTaskId(null)
    }
  }, [updateTask])

  // Reorder tasks within a column (future feature - would need backend support)
  const reorderTasks = useCallback((_status: TaskStatus, _taskIds: string[]) => {
    // This would require a sort_order field in the database
    // For now, we just rely on priority/date sorting
    console.log('[useKanbanBoard] Reorder not yet implemented')
  }, [])

  return {
    columns,
    stats,
    moveTask,
    reorderTasks,
    isMoving,
    movingTaskId,
    error,
    filters,
    setFilters,
    groupBy,
    setGroupBy,
  }
}
