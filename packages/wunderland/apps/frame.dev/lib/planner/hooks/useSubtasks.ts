/**
 * useSubtasks Hook
 *
 * Manages subtasks for a parent task with CRUD operations,
 * drag-to-reorder, and auto-complete parent functionality.
 *
 * @module lib/planner/hooks/useSubtasks
 */

'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import type { Subtask, CreateSubtaskInput, UpdateSubtaskInput } from '../types'
import * as db from '../database'

export interface SubtaskStats {
  total: number
  completed: number
  percentage: number
}

export interface UseSubtasksOptions {
  parentTaskId: string
  autoCompleteParent?: boolean
  onAllCompleted?: () => void
}

export interface UseSubtasksReturn {
  // Data
  subtasks: Subtask[]
  isLoading: boolean
  error: Error | null
  stats: SubtaskStats

  // CRUD
  createSubtask: (title: string) => Promise<Subtask | null>
  updateSubtask: (id: string, input: UpdateSubtaskInput) => Promise<Subtask | null>
  deleteSubtask: (id: string) => Promise<boolean>

  // Convenience methods
  toggleSubtask: (id: string) => Promise<Subtask | null>
  reorderSubtasks: (ids: string[]) => Promise<boolean>
  clearCompleted: () => Promise<boolean>
  completeAll: () => Promise<void>
  uncompleteAll: () => Promise<void>

  // Refresh
  refresh: () => Promise<void>
}

/**
 * Hook for managing subtasks within a parent task
 */
export function useSubtasks(options: UseSubtasksOptions): UseSubtasksReturn {
  const { parentTaskId, autoCompleteParent = false, onAllCompleted } = options

  const [subtasks, setSubtasks] = useState<Subtask[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // Calculate statistics (with null guard for safety)
  const safeSubtasks = subtasks ?? []
  const stats = useMemo((): SubtaskStats => {
    const total = safeSubtasks.length
    const completed = safeSubtasks.filter((s) => s.completed).length
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0

    return { total, completed, percentage }
  }, [safeSubtasks])

  // Load subtasks
  const loadSubtasks = useCallback(async () => {
    if (!parentTaskId) return

    setIsLoading(true)
    setError(null)

    try {
      const loaded = await db.getSubtasks(parentTaskId)
      setSubtasks(loaded.sort((a, b) => a.sortOrder - b.sortOrder))
    } catch (err) {
      console.error('[useSubtasks] Failed to load subtasks:', err)
      setError(err instanceof Error ? err : new Error('Failed to load subtasks'))
    } finally {
      setIsLoading(false)
    }
  }, [parentTaskId])

  // Initial load
  useEffect(() => {
    loadSubtasks()
  }, [loadSubtasks])

  // Check for all completed and trigger callback
  useEffect(() => {
    if (stats.total > 0 && stats.total === stats.completed) {
      onAllCompleted?.()
    }
  }, [stats.total, stats.completed, onAllCompleted])

  // Create subtask
  const createSubtask = useCallback(
    async (title: string): Promise<Subtask | null> => {
      if (!title.trim()) return null

      try {
        const subtask = await db.createSubtask({
          parentTaskId,
          title: title.trim(),
        })

        if (subtask) {
          setSubtasks((prev) => [...prev, subtask])
        }

        return subtask
      } catch (err) {
        console.error('[useSubtasks] Failed to create subtask:', err)
        setError(err instanceof Error ? err : new Error('Failed to create subtask'))
        return null
      }
    },
    [parentTaskId]
  )

  // Update subtask
  const updateSubtask = useCallback(
    async (id: string, input: UpdateSubtaskInput): Promise<Subtask | null> => {
      try {
        const updated = await db.updateSubtask(id, input)

        if (updated) {
          setSubtasks((prev) =>
            prev.map((s) => (s.id === id ? updated : s)).sort((a, b) => a.sortOrder - b.sortOrder)
          )
        }

        return updated
      } catch (err) {
        console.error('[useSubtasks] Failed to update subtask:', err)
        setError(err instanceof Error ? err : new Error('Failed to update subtask'))
        return null
      }
    },
    []
  )

  // Delete subtask
  const deleteSubtask = useCallback(async (id: string): Promise<boolean> => {
    try {
      const success = await db.deleteSubtask(id)

      if (success) {
        setSubtasks((prev) => prev.filter((s) => s.id !== id))
      }

      return success
    } catch (err) {
      console.error('[useSubtasks] Failed to delete subtask:', err)
      setError(err instanceof Error ? err : new Error('Failed to delete subtask'))
      return false
    }
  }, [])

  // Toggle subtask completion
  const toggleSubtask = useCallback(
    async (id: string): Promise<Subtask | null> => {
      const subtask = subtasks.find((s) => s.id === id)
      if (!subtask) return null

      return updateSubtask(id, { completed: !subtask.completed })
    },
    [subtasks, updateSubtask]
  )

  // Reorder subtasks
  const reorderSubtasks = useCallback(
    async (ids: string[]): Promise<boolean> => {
      try {
        // Optimistically update UI
        const reordered = ids
          .map((id, index) => {
            const subtask = subtasks.find((s) => s.id === id)
            return subtask ? { ...subtask, sortOrder: index } : null
          })
          .filter(Boolean) as Subtask[]

        setSubtasks(reordered)

        // Persist to database
        const success = await db.reorderSubtasks(parentTaskId, ids)

        if (!success) {
          // Revert on failure
          await loadSubtasks()
        }

        return success
      } catch (err) {
        console.error('[useSubtasks] Failed to reorder subtasks:', err)
        await loadSubtasks()
        return false
      }
    },
    [parentTaskId, subtasks, loadSubtasks]
  )

  // Clear completed subtasks
  const clearCompleted = useCallback(async (): Promise<boolean> => {
    const completed = subtasks.filter((s) => s.completed)

    try {
      await Promise.all(completed.map((s) => db.deleteSubtask(s.id)))
      setSubtasks((prev) => prev.filter((s) => !s.completed))
      return true
    } catch (err) {
      console.error('[useSubtasks] Failed to clear completed:', err)
      return false
    }
  }, [subtasks])

  // Complete all subtasks
  const completeAll = useCallback(async (): Promise<void> => {
    const incomplete = subtasks.filter((s) => !s.completed)

    try {
      const updated = await Promise.all(
        incomplete.map((s) => db.updateSubtask(s.id, { completed: true }))
      )

      setSubtasks((prev) =>
        prev.map((s) => {
          const upd = updated.find((u) => u?.id === s.id)
          return upd || s
        })
      )
    } catch (err) {
      console.error('[useSubtasks] Failed to complete all:', err)
    }
  }, [subtasks])

  // Uncomplete all subtasks
  const uncompleteAll = useCallback(async (): Promise<void> => {
    const completed = subtasks.filter((s) => s.completed)

    try {
      const updated = await Promise.all(
        completed.map((s) => db.updateSubtask(s.id, { completed: false }))
      )

      setSubtasks((prev) =>
        prev.map((s) => {
          const upd = updated.find((u) => u?.id === s.id)
          return upd || s
        })
      )
    } catch (err) {
      console.error('[useSubtasks] Failed to uncomplete all:', err)
    }
  }, [subtasks])

  return {
    subtasks,
    isLoading,
    error,
    stats,
    createSubtask,
    updateSubtask,
    deleteSubtask,
    toggleSubtask,
    reorderSubtasks,
    clearCompleted,
    completeAll,
    uncompleteAll,
    refresh: loadSubtasks,
  }
}

/**
 * Hook for getting subtask stats without loading all subtasks
 */
export function useSubtaskStats(parentTaskId: string | undefined) {
  const [stats, setStats] = useState<SubtaskStats>({ total: 0, completed: 0, percentage: 0 })
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!parentTaskId) {
      setStats({ total: 0, completed: 0, percentage: 0 })
      return
    }

    setIsLoading(true)
    db.getSubtaskStats(parentTaskId)
      .then((result) => {
        const percentage = result.total > 0 ? Math.round((result.completed / result.total) * 100) : 0
        setStats({ ...result, percentage })
      })
      .catch(console.error)
      .finally(() => setIsLoading(false))
  }, [parentTaskId])

  return { stats, isLoading }
}
