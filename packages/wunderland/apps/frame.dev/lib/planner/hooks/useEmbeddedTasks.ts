/**
 * useEmbeddedTasks Hook
 *
 * Manages embedded tasks extracted from markdown checkboxes.
 * Provides two-way sync between planner UI and source markdown files.
 *
 * @module lib/planner/hooks/useEmbeddedTasks
 */

'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import {
  extractTasks,
  updateCheckboxState,
  addTaskToContent,
  removeTaskFromContent,
  type ExtractedTask,
} from '../taskParser'
import type { TaskPriority } from '../types'

export interface UseEmbeddedTasksOptions {
  /** The strand path this content belongs to */
  strandPath: string
  /** Initial markdown content */
  content: string
  /** Callback when content is modified (for saving) */
  onContentChange?: (newContent: string, strandPath: string) => void | Promise<void>
}

export interface UseEmbeddedTasksReturn {
  /** Extracted tasks from the content */
  tasks: ExtractedTask[]
  /** Whether content has unsaved changes */
  isDirty: boolean
  /** Current content (may have pending changes) */
  currentContent: string

  /** Toggle a task's checked state */
  toggleTask: (lineNumber: number) => void
  /** Add a new task */
  addTask: (text: string, options?: { priority?: TaskPriority; dueDate?: string; afterLine?: number }) => void
  /** Remove a task */
  removeTask: (lineNumber: number) => void
  /** Update task text */
  updateTaskText: (lineNumber: number, newText: string) => void

  /** Save pending changes */
  save: () => Promise<void>
  /** Discard pending changes */
  revert: () => void

  /** Refresh tasks from content */
  refresh: () => void
}

/**
 * Hook for managing embedded markdown tasks with two-way sync
 */
export function useEmbeddedTasks({
  strandPath,
  content: initialContent,
  onContentChange,
}: UseEmbeddedTasksOptions): UseEmbeddedTasksReturn {
  const [currentContent, setCurrentContent] = useState(initialContent)
  const [originalContent, setOriginalContent] = useState(initialContent)
  const [isSaving, setIsSaving] = useState(false)

  // Update when initial content changes
  useEffect(() => {
    setCurrentContent(initialContent)
    setOriginalContent(initialContent)
  }, [initialContent])

  // Extract tasks from current content
  const tasks = useMemo(() => {
    return extractTasks(currentContent)
  }, [currentContent])

  // Check if there are unsaved changes
  const isDirty = currentContent !== originalContent

  // Toggle task completion state
  const toggleTask = useCallback((lineNumber: number) => {
    setCurrentContent((prev) => {
      const task = extractTasks(prev).find((t) => t.lineNumber === lineNumber)
      if (!task) return prev
      return updateCheckboxState(prev, lineNumber, !task.checked)
    })
  }, [])

  // Add a new task
  const addTask = useCallback(
    (
      text: string,
      options?: {
        priority?: TaskPriority
        dueDate?: string
        afterLine?: number
      }
    ) => {
      setCurrentContent((prev) => {
        return addTaskToContent(prev, text, {
          priority: options?.priority,
          dueDate: options?.dueDate,
          insertAfterLine: options?.afterLine,
        })
      })
    },
    []
  )

  // Remove a task
  const removeTask = useCallback((lineNumber: number) => {
    setCurrentContent((prev) => {
      return removeTaskFromContent(prev, lineNumber)
    })
  }, [])

  // Update task text
  const updateTaskText = useCallback((lineNumber: number, newText: string) => {
    setCurrentContent((prev) => {
      const lines = prev.split('\n')
      const lineIndex = lineNumber - 1

      if (lineIndex < 0 || lineIndex >= lines.length) return prev

      const line = lines[lineIndex]
      const match = line.match(/^(\s*-\s+\[[ xX]\]\s+)(.+)$/)

      if (!match) return prev

      lines[lineIndex] = match[1] + newText
      return lines.join('\n')
    })
  }, [])

  // Save changes
  const save = useCallback(async () => {
    if (!isDirty || isSaving) return

    setIsSaving(true)
    try {
      if (onContentChange) {
        await onContentChange(currentContent, strandPath)
      }
      setOriginalContent(currentContent)
      console.log('[useEmbeddedTasks] Saved changes to', strandPath)
    } catch (error) {
      console.error('[useEmbeddedTasks] Failed to save:', error)
      throw error
    } finally {
      setIsSaving(false)
    }
  }, [currentContent, isDirty, isSaving, onContentChange, strandPath])

  // Revert changes
  const revert = useCallback(() => {
    setCurrentContent(originalContent)
  }, [originalContent])

  // Refresh tasks
  const refresh = useCallback(() => {
    // Force re-extraction by updating content reference
    setCurrentContent((prev) => prev)
  }, [])

  return {
    tasks,
    isDirty,
    currentContent,
    toggleTask,
    addTask,
    removeTask,
    updateTaskText,
    save,
    revert,
    refresh,
  }
}

/**
 * Create an ExtractedTask type from the parsed checkbox
 */
export type { ExtractedTask }
