/**
 * KanbanBoard
 *
 * Main Kanban board container component
 * Orchestrates columns, drag-drop, and filtering
 *
 * @module components/quarry/ui/planner/KanbanView/KanbanBoard
 */

'use client'

import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import type { Task, TaskStatus, CreateTaskInput, UpdateTaskInput } from '@/lib/planner/types'
import { cn } from '@/lib/utils'
import { useKanbanBoard, type KanbanFilters } from './useKanbanBoard'
import { KanbanColumn } from './KanbanColumn'
import { KanbanHeader } from './KanbanHeader'

// ============================================================================
// TYPES
// ============================================================================

export interface KanbanBoardProps {
  tasks: Task[]
  onUpdateTask: (id: string, updates: UpdateTaskInput) => Promise<Task | null>
  onCreateTask?: (input: CreateTaskInput) => Promise<Task | null>
  onTaskClick?: (task: Task) => void
  onTaskToggle?: (taskId: string, completed?: boolean) => void
  initialFilters?: KanbanFilters
  showCancelled?: boolean
  theme?: 'light' | 'dark'
  className?: string
}

// ============================================================================
// COMPONENT
// ============================================================================

export function KanbanBoard({
  tasks,
  onUpdateTask,
  onCreateTask,
  onTaskClick,
  onTaskToggle,
  initialFilters = { showCompleted: true, showCancelled: false },
  showCancelled = false,
  theme = 'dark',
  className,
}: KanbanBoardProps) {
  const isDark = theme === 'dark'

  // Use the kanban board hook
  const {
    columns,
    stats,
    moveTask,
    isMoving,
    filters,
    setFilters,
    groupBy,
    setGroupBy,
  } = useKanbanBoard({
    tasks,
    updateTask: onUpdateTask,
    filters: {
      ...initialFilters,
      showCancelled,
    },
  })

  // Handle task click
  const handleTaskClick = useCallback((task: Task) => {
    onTaskClick?.(task)
  }, [onTaskClick])

  // Handle task toggle
  const handleTaskToggle = useCallback(async (taskId: string) => {
    if (onTaskToggle) {
      onTaskToggle(taskId)
    } else {
      // Default toggle behavior
      const task = tasks.find(t => t.id === taskId)
      if (task) {
        const newStatus = task.status === 'completed' ? 'pending' : 'completed'
        await onUpdateTask(taskId, { status: newStatus })
      }
    }
  }, [tasks, onTaskToggle, onUpdateTask])

  // Handle create task
  const handleCreateTask = useCallback(() => {
    if (onCreateTask) {
      onCreateTask({
        title: 'New Task',
        status: 'pending',
        priority: 'medium',
      })
    }
  }, [onCreateTask])

  // Handle filter changes
  const handleFilterChange = useCallback((newFilters: KanbanFilters) => {
    setFilters(newFilters)
  }, [setFilters])

  return (
    <div
      className={cn(
        'flex flex-col h-full overflow-hidden',
        isDark ? 'bg-zinc-950' : 'bg-zinc-50',
        className
      )}
    >
      {/* Header */}
      <KanbanHeader
        stats={stats}
        filters={filters}
        onFilterChange={handleFilterChange}
        groupBy={groupBy}
        onGroupByChange={setGroupBy}
        onAddTask={onCreateTask ? handleCreateTask : undefined}
        theme={theme}
      />

      {/* Board container */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden px-6 py-4">
        <motion.div
          className="flex gap-4 h-full min-w-max mx-auto w-fit"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        >
          {columns.map((column) => (
            <KanbanColumn
              key={column.id}
              status={column.id}
              label={column.label}
              tasks={column.tasks}
              onTaskMove={moveTask}
              onTaskClick={handleTaskClick}
              onToggleComplete={handleTaskToggle}
              onCreateTask={column.id === 'pending' && onCreateTask ? handleCreateTask : undefined}
              theme={theme}
            />
          ))}
        </motion.div>
      </div>

      {/* Loading overlay */}
      {isMoving && (
        <motion.div
          className="absolute inset-0 bg-black/10 flex items-center justify-center pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </motion.div>
      )}
    </div>
  )
}
