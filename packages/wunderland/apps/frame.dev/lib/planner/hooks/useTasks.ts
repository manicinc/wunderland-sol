/**
 * useTasks Hook
 *
 * Manages tasks with support for standalone, linked, and embedded types.
 * Provides CRUD operations, filtering, and statistics.
 *
 * @module lib/planner/hooks/useTasks
 */

'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import type { Task, CreateTaskInput, UpdateTaskInput, TaskStatus, TaskPriority, TaskType } from '../types'
import { isTaskOverdue, isTaskDueToday } from '../types'
import * as db from '../database'

export interface UseTasksOptions {
  status?: TaskStatus | TaskStatus[]
  priority?: TaskPriority | TaskPriority[]
  taskType?: TaskType | TaskType[]
  strandPath?: string
  project?: string
  tags?: string[]
  dueBefore?: string
  dueAfter?: string
  includeCompleted?: boolean
  includeDeleted?: boolean
}

export interface TaskStats {
  total: number
  pending: number
  inProgress: number
  completed: number
  overdue: number
  dueToday: number
}

export interface UseTasksReturn {
  // Data
  tasks: Task[]
  isLoading: boolean
  error: Error | null

  // CRUD
  createTask: (input: CreateTaskInput) => Promise<Task | null>
  updateTask: (id: string, input: UpdateTaskInput) => Promise<Task | null>
  deleteTask: (id: string, permanent?: boolean) => Promise<boolean>

  // Status helpers
  markComplete: (id: string) => Promise<Task | null>
  markIncomplete: (id: string) => Promise<Task | null>
  toggleComplete: (id: string) => Promise<Task | null>

  // Bulk operations
  completeTasks: (ids: string[]) => Promise<void>
  deleteTasks: (ids: string[], permanent?: boolean) => Promise<void>

  // Refresh
  refresh: () => Promise<void>

  // Statistics
  stats: TaskStats
}

/**
 * Hook for managing planner tasks
 */
export function useTasks(options: UseTasksOptions = {}): UseTasksReturn {
  const [tasks, setTasks] = useState<Task[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // Destructure options for stable dependencies
  const {
    status,
    priority,
    strandPath,
    project,
    dueBefore,
    dueAfter,
    includeDeleted,
    taskType,
    tags,
    includeCompleted,
  } = options

  // Build filter object for database query with granular dependencies
  const filters = useMemo(() => {
    const f: Parameters<typeof db.getTasks>[0] = {}

    if (status) {
      f.status = Array.isArray(status) ? status.join(',') : status
    }

    if (priority) {
      f.priority = Array.isArray(priority) ? priority.join(',') : priority
    }

    if (strandPath) {
      f.strandPath = strandPath
    }

    if (project) {
      f.project = project
    }

    if (dueBefore) {
      f.dueBefore = dueBefore
    }

    if (dueAfter) {
      f.dueAfter = dueAfter
    }

    if (includeDeleted) {
      f.includeDeleted = true
    }

    return f
  }, [status, priority, strandPath, project, dueBefore, dueAfter, includeDeleted])

  // Load tasks
  const loadTasks = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      let loadedTasks = await db.getTasks(filters)

      // Apply additional client-side filters
      if (taskType) {
        const types = Array.isArray(taskType) ? taskType : [taskType]
        loadedTasks = loadedTasks.filter((t) => types.includes(t.taskType))
      }

      if (tags && tags.length > 0) {
        loadedTasks = loadedTasks.filter((t) => t.tags?.some((tag) => tags?.includes(tag)))
      }

      if (!includeCompleted) {
        loadedTasks = loadedTasks.filter((t) => t.status !== 'completed')
      }

      setTasks(loadedTasks)
    } catch (err) {
      console.error('[useTasks] Failed to load tasks:', err)
      setError(err instanceof Error ? err : new Error('Failed to load tasks'))
    } finally {
      setIsLoading(false)
    }
  }, [filters, taskType, tags, includeCompleted])

  // Initial load
  useEffect(() => {
    loadTasks()
  }, [loadTasks])

  // Create task
  const createTask = useCallback(
    async (input: CreateTaskInput): Promise<Task | null> => {
      try {
        const task = await db.createTask(input)
        if (task) {
          await loadTasks() // Refresh list
        }
        return task
      } catch (err) {
        console.error('[useTasks] Failed to create task:', err)
        setError(err instanceof Error ? err : new Error('Failed to create task'))
        return null
      }
    },
    [loadTasks]
  )

  // Update task
  const updateTask = useCallback(
    async (id: string, input: UpdateTaskInput): Promise<Task | null> => {
      try {
        const task = await db.updateTask(id, input)
        if (task) {
          setTasks((prev) => prev.map((t) => (t.id === id ? task : t)))
        }
        return task
      } catch (err) {
        console.error('[useTasks] Failed to update task:', err)
        setError(err instanceof Error ? err : new Error('Failed to update task'))
        return null
      }
    },
    []
  )

  // Delete task
  const deleteTask = useCallback(
    async (id: string, permanent = false): Promise<boolean> => {
      try {
        const success = await db.deleteTask(id, permanent)
        if (success) {
          setTasks((prev) => prev.filter((t) => t.id !== id))
        }
        return success
      } catch (err) {
        console.error('[useTasks] Failed to delete task:', err)
        setError(err instanceof Error ? err : new Error('Failed to delete task'))
        return false
      }
    },
    []
  )

  // Mark complete
  const markComplete = useCallback(
    async (id: string): Promise<Task | null> => {
      return updateTask(id, { status: 'completed' })
    },
    [updateTask]
  )

  // Mark incomplete
  const markIncomplete = useCallback(
    async (id: string): Promise<Task | null> => {
      return updateTask(id, { status: 'pending' })
    },
    [updateTask]
  )

  // Toggle complete
  const toggleComplete = useCallback(
    async (id: string): Promise<Task | null> => {
      const task = tasks.find((t) => t.id === id)
      if (!task) return null

      if (task.status === 'completed') {
        return markIncomplete(id)
      } else {
        return markComplete(id)
      }
    },
    [tasks, markComplete, markIncomplete]
  )

  // Bulk complete
  const completeTasks = useCallback(
    async (ids: string[]): Promise<void> => {
      await Promise.all(ids.map((id) => markComplete(id)))
    },
    [markComplete]
  )

  // Bulk delete
  const deleteTasks = useCallback(
    async (ids: string[], permanent = false): Promise<void> => {
      await Promise.all(ids.map((id) => deleteTask(id, permanent)))
    },
    [deleteTask]
  )

  // Calculate statistics (with null guard for safety)
  const safeTasks = tasks ?? []
  const stats = useMemo((): TaskStats => {
    const pending = safeTasks.filter((t) => t.status === 'pending').length
    const inProgress = safeTasks.filter((t) => t.status === 'in_progress').length
    const completed = safeTasks.filter((t) => t.status === 'completed').length
    const overdue = safeTasks.filter((t) => isTaskOverdue(t)).length
    const dueToday = safeTasks.filter((t) => isTaskDueToday(t)).length

    return {
      total: safeTasks.length,
      pending,
      inProgress,
      completed,
      overdue,
      dueToday,
    }
  }, [safeTasks])

  return {
    tasks,
    isLoading,
    error,
    createTask,
    updateTask,
    deleteTask,
    markComplete,
    markIncomplete,
    toggleComplete,
    completeTasks,
    deleteTasks,
    refresh: loadTasks,
    stats,
  }
}

/**
 * Hook for tasks related to a specific strand
 */
export function useStrandTasks(strandPath: string | undefined) {
  return useTasks({
    strandPath,
    includeCompleted: true,
  })
}

/**
 * Hook for today's tasks
 */
export function useTodayTasks() {
  const today = new Date().toISOString().split('T')[0]

  return useTasks({
    dueAfter: today,
    dueBefore: today,
    includeCompleted: false,
  })
}

/**
 * Hook for overdue tasks
 */
export function useOverdueTasks() {
  const today = new Date().toISOString().split('T')[0]

  return useTasks({
    dueBefore: today,
    status: ['pending', 'in_progress'],
    includeCompleted: false,
  })
}
