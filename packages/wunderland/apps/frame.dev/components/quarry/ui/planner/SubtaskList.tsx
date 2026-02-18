/**
 * SubtaskList Component
 *
 * Displays and manages subtasks for a parent task with:
 * - Inline editing
 * - Drag-to-reorder
 * - Progress indicator
 * - Quick add input
 *
 * @module components/quarry/ui/planner/SubtaskList
 */

'use client'

import { useState, useCallback, useRef, useEffect, memo } from 'react'
import { motion, AnimatePresence, Reorder } from 'framer-motion'
import {
  Check,
  Plus,
  Trash2,
  GripVertical,
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
  CheckCircle2,
  Circle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSubtasks } from '@/lib/planner/hooks/useSubtasks'
import type { Subtask } from '@/lib/planner/types'

export interface SubtaskListProps {
  parentTaskId: string
  theme?: 'light' | 'dark'
  compact?: boolean
  showProgress?: boolean
  collapsible?: boolean
  defaultCollapsed?: boolean
  onAllCompleted?: () => void
  className?: string
}

function SubtaskListComponent({
  parentTaskId,
  theme = 'dark',
  compact = false,
  showProgress = true,
  collapsible = true,
  defaultCollapsed = false,
  onAllCompleted,
  className,
}: SubtaskListProps) {
  const {
    subtasks,
    isLoading,
    stats,
    createSubtask,
    updateSubtask,
    deleteSubtask,
    toggleSubtask,
    reorderSubtasks,
    clearCompleted,
  } = useSubtasks({
    parentTaskId,
    onAllCompleted,
  })

  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed)
  const [isAddingSubtask, setIsAddingSubtask] = useState(false)
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const editInputRef = useRef<HTMLInputElement>(null)

  // Focus input when adding
  useEffect(() => {
    if (isAddingSubtask && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isAddingSubtask])

  // Focus edit input
  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus()
      editInputRef.current.select()
    }
  }, [editingId])

  const handleAddSubtask = useCallback(async () => {
    if (!newSubtaskTitle.trim()) return

    await createSubtask(newSubtaskTitle.trim())
    setNewSubtaskTitle('')
    // Keep adding mode open for quick multi-add
    inputRef.current?.focus()
  }, [newSubtaskTitle, createSubtask])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleAddSubtask()
    } else if (e.key === 'Escape') {
      setNewSubtaskTitle('')
      setIsAddingSubtask(false)
    }
  }

  const handleEditKeyDown = (e: React.KeyboardEvent, subtask: Subtask) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (editingTitle.trim() && editingTitle !== subtask.title) {
        updateSubtask(subtask.id, { title: editingTitle.trim() })
      }
      setEditingId(null)
    } else if (e.key === 'Escape') {
      setEditingId(null)
      setEditingTitle('')
    }
  }

  const startEditing = (subtask: Subtask) => {
    setEditingId(subtask.id)
    setEditingTitle(subtask.title)
  }

  const handleReorder = useCallback(
    (newOrder: Subtask[]) => {
      reorderSubtasks(newOrder.map((s) => s.id))
    },
    [reorderSubtasks]
  )

  if (isLoading) {
    return (
      <div
        className={cn(
          'py-4 text-center text-sm',
          theme === 'dark' ? 'text-zinc-500' : 'text-gray-400'
        )}
      >
        Loading subtasks...
      </div>
    )
  }

  return (
    <div className={cn('space-y-2', className)}>
      {/* Header with progress */}
      {(showProgress || collapsible) && (
        <div className="flex items-center justify-between">
          <button
            onClick={() => collapsible && setIsCollapsed(!isCollapsed)}
            className={cn(
              'flex items-center gap-2 text-sm font-medium',
              collapsible && 'hover:opacity-80 cursor-pointer',
              theme === 'dark' ? 'text-zinc-300' : 'text-gray-700'
            )}
            disabled={!collapsible}
          >
            {collapsible && (
              isCollapsed ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronUp className="w-4 h-4" />
              )
            )}
            <span>Subtasks</span>
            {stats.total > 0 && (
              <span
                className={cn(
                  'text-xs px-1.5 py-0.5 rounded',
                  theme === 'dark' ? 'bg-zinc-800 text-zinc-400' : 'bg-gray-100 text-gray-500'
                )}
              >
                {stats.completed}/{stats.total}
              </span>
            )}
          </button>

          {showProgress && stats.total > 0 && (
            <div className="flex items-center gap-2">
              {/* Progress bar */}
              <div
                className={cn(
                  'w-20 h-1.5 rounded-full overflow-hidden',
                  theme === 'dark' ? 'bg-zinc-800' : 'bg-gray-200'
                )}
              >
                <motion.div
                  className="h-full bg-emerald-500 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${stats.percentage}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <span
                className={cn(
                  'text-xs tabular-nums',
                  theme === 'dark' ? 'text-zinc-500' : 'text-gray-400'
                )}
              >
                {stats.percentage}%
              </span>
            </div>
          )}
        </div>
      )}

      {/* Subtask list */}
      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="space-y-1">
              {/* Reorderable list */}
              {subtasks.length > 0 && (
                <Reorder.Group
                  axis="y"
                  values={subtasks}
                  onReorder={handleReorder}
                  className="space-y-1"
                >
                  {subtasks.map((subtask) => (
                    <Reorder.Item
                      key={subtask.id}
                      value={subtask}
                      className="touch-none"
                    >
                      <motion.div
                        layout
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, height: 0 }}
                        className={cn(
                          'group flex items-center gap-2 rounded-lg transition-colors',
                          compact ? 'py-1 px-1' : 'py-2 px-2',
                          theme === 'dark'
                            ? 'hover:bg-zinc-800/50'
                            : 'hover:bg-gray-50'
                        )}
                      >
                        {/* Drag handle */}
                        <div
                          className={cn(
                            'cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-50 transition-opacity',
                            theme === 'dark' ? 'text-zinc-500' : 'text-gray-400'
                          )}
                        >
                          <GripVertical className="w-3 h-3" />
                        </div>

                        {/* Checkbox */}
                        <button
                          onClick={() => toggleSubtask(subtask.id)}
                          className={cn(
                            'flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all',
                            subtask.completed
                              ? 'bg-emerald-500 border-emerald-500'
                              : theme === 'dark'
                                ? 'border-zinc-600 hover:border-zinc-500'
                                : 'border-gray-300 hover:border-gray-400'
                          )}
                        >
                          {subtask.completed && (
                            <Check className="w-3 h-3 text-white" />
                          )}
                        </button>

                        {/* Title / Edit input */}
                        {editingId === subtask.id ? (
                          <input
                            ref={editInputRef}
                            type="text"
                            value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            onKeyDown={(e) => handleEditKeyDown(e, subtask)}
                            onBlur={() => {
                              if (editingTitle.trim() && editingTitle !== subtask.title) {
                                updateSubtask(subtask.id, { title: editingTitle.trim() })
                              }
                              setEditingId(null)
                            }}
                            className={cn(
                              'flex-1 bg-transparent text-sm border-b focus:outline-none',
                              theme === 'dark'
                                ? 'text-white border-zinc-600 focus:border-blue-500'
                                : 'text-gray-900 border-gray-300 focus:border-blue-500'
                            )}
                          />
                        ) : (
                          <span
                            onClick={() => startEditing(subtask)}
                            className={cn(
                              'flex-1 text-sm cursor-text',
                              subtask.completed && 'line-through',
                              subtask.completed
                                ? theme === 'dark'
                                  ? 'text-zinc-500'
                                  : 'text-gray-400'
                                : theme === 'dark'
                                  ? 'text-zinc-200'
                                  : 'text-gray-900'
                            )}
                          >
                            {subtask.title}
                          </span>
                        )}

                        {/* Delete button */}
                        <button
                          onClick={() => deleteSubtask(subtask.id)}
                          className={cn(
                            'flex-shrink-0 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity',
                            theme === 'dark'
                              ? 'hover:bg-zinc-700 text-zinc-500 hover:text-red-400'
                              : 'hover:bg-gray-200 text-gray-400 hover:text-red-500'
                          )}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </motion.div>
                    </Reorder.Item>
                  ))}
                </Reorder.Group>
              )}

              {/* Add subtask input */}
              {isAddingSubtask ? (
                <div className="flex items-center gap-2 py-2 px-2">
                  <div className="w-3" /> {/* Spacer for drag handle */}
                  <div
                    className={cn(
                      'w-5 h-5 rounded-full border-2 flex-shrink-0',
                      theme === 'dark' ? 'border-zinc-700' : 'border-gray-200'
                    )}
                  />
                  <input
                    ref={inputRef}
                    type="text"
                    value={newSubtaskTitle}
                    onChange={(e) => setNewSubtaskTitle(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Add a subtask..."
                    className={cn(
                      'flex-1 bg-transparent text-sm focus:outline-none',
                      theme === 'dark'
                        ? 'text-white placeholder:text-zinc-600'
                        : 'text-gray-900 placeholder:text-gray-400'
                    )}
                  />
                  <button
                    onClick={() => {
                      setNewSubtaskTitle('')
                      setIsAddingSubtask(false)
                    }}
                    className={cn(
                      'text-xs px-2 py-1 rounded',
                      theme === 'dark'
                        ? 'text-zinc-500 hover:text-zinc-300'
                        : 'text-gray-400 hover:text-gray-600'
                    )}
                  >
                    Done
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsAddingSubtask(true)}
                  className={cn(
                    'flex items-center gap-2 w-full py-2 px-2 rounded-lg text-sm transition-colors',
                    theme === 'dark'
                      ? 'text-zinc-500 hover:bg-zinc-800/50 hover:text-zinc-300'
                      : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'
                  )}
                >
                  <div className="w-3" /> {/* Spacer for drag handle alignment */}
                  <Plus className="w-4 h-4" />
                  Add subtask
                </button>
              )}

              {/* Clear completed button */}
              {stats.completed > 0 && (
                <button
                  onClick={clearCompleted}
                  className={cn(
                    'flex items-center gap-2 w-full py-1.5 px-2 rounded text-xs transition-colors',
                    theme === 'dark'
                      ? 'text-zinc-600 hover:text-zinc-400'
                      : 'text-gray-400 hover:text-gray-600'
                  )}
                >
                  <div className="w-3" />
                  <CheckCircle2 className="w-3 h-3" />
                  Clear {stats.completed} completed
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export const SubtaskList = memo(SubtaskListComponent)
export default SubtaskList

/**
 * Compact progress indicator for task cards
 */
export function SubtaskProgress({
  total,
  completed,
  theme = 'dark',
}: {
  total: number
  completed: number
  theme?: 'light' | 'dark'
}) {
  if (total === 0) return null

  const percentage = Math.round((completed / total) * 100)
  const isAllComplete = completed === total

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center gap-0.5">
        {isAllComplete ? (
          <CheckCircle2
            className={cn(
              'w-3 h-3',
              theme === 'dark' ? 'text-emerald-400' : 'text-emerald-500'
            )}
          />
        ) : (
          <Circle
            className={cn(
              'w-3 h-3',
              theme === 'dark' ? 'text-zinc-500' : 'text-gray-400'
            )}
          />
        )}
        <span
          className={cn(
            'text-[10px] tabular-nums',
            isAllComplete
              ? theme === 'dark'
                ? 'text-emerald-400'
                : 'text-emerald-500'
              : theme === 'dark'
                ? 'text-zinc-500'
                : 'text-gray-500'
          )}
        >
          {completed}/{total}
        </span>
      </div>
    </div>
  )
}
