/**
 * Planner Widget
 *
 * Embedded planner view for the dashboard center.
 * Shows a compact version of the full planner with day/week toggle.
 * @module components/quarry/dashboard/widgets/PlannerWidget
 */

'use client'

import React, { useState, useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  CalendarDays,
  Plus,
  ChevronLeft,
  ChevronRight,
  Check,
  Clock,
  AlertCircle,
  Maximize2,
} from 'lucide-react'
import {
  format,
  isToday,
  isTomorrow,
  isPast,
  addDays,
  subDays,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
} from 'date-fns'
import { useTasks } from '@/lib/planner/hooks/useTasks'
import type { Task } from '@/lib/planner/types'
import type { WidgetProps } from '../types'

type ViewMode = 'day' | 'week'

export function PlannerWidget({
  theme,
  size,
  onNavigate,
  compact = false,
}: WidgetProps) {
  const isDark = theme.includes('dark')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<ViewMode>('day')

  const { tasks, toggleComplete } = useTasks({ includeCompleted: true })

  // Filter tasks for current view
  const viewTasks = useMemo(() => {
    if (viewMode === 'day') {
      const dateStr = format(currentDate, 'yyyy-MM-dd')
      return tasks.filter((t) => t.dueDate?.startsWith(dateStr))
    } else {
      const weekStart = startOfWeek(currentDate)
      const weekEnd = endOfWeek(currentDate)
      return tasks.filter((t) => {
        if (!t.dueDate) return false
        const taskDate = new Date(t.dueDate)
        return taskDate >= weekStart && taskDate <= weekEnd
      })
    }
  }, [tasks, currentDate, viewMode])

  // Group tasks by status
  const { pending, completed, overdue } = useMemo(() => {
    const now = new Date()
    const pending: Task[] = []
    const completed: Task[] = []
    const overdue: Task[] = []

    viewTasks.forEach((task) => {
      if (task.status === 'completed') {
        completed.push(task)
      } else if (task.dueDate && isPast(new Date(task.dueDate)) && !isToday(new Date(task.dueDate))) {
        overdue.push(task)
      } else {
        pending.push(task)
      }
    })

    return { pending, completed, overdue }
  }, [viewTasks])

  // Navigation
  const handlePrev = () => {
    setCurrentDate(viewMode === 'day' ? subDays(currentDate, 1) : subDays(currentDate, 7))
  }

  const handleNext = () => {
    setCurrentDate(viewMode === 'day' ? addDays(currentDate, 1) : addDays(currentDate, 7))
  }

  const handleToday = () => {
    setCurrentDate(new Date())
  }

  const handleTaskToggle = async (taskId: string) => {
    await toggleComplete(taskId)
  }

  // Compact mode for small widget sizes
  if (compact || size === 'small') {
    return (
      <div
        className="flex flex-col h-full cursor-pointer"
        onClick={() => onNavigate('/quarry/plan')}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-rose-500" />
            <span className={`text-sm font-medium ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
              Today
            </span>
          </div>
          <span className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
            {format(new Date(), 'MMM d')}
          </span>
        </div>
        <div className="flex-1 flex items-center justify-center gap-6">
          <div className="text-center">
            <p className={`text-2xl font-bold ${isDark ? 'text-zinc-100' : 'text-zinc-800'}`}>
              {pending.length}
            </p>
            <p className={`text-[10px] uppercase tracking-wide ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
              pending
            </p>
          </div>
          {overdue.length > 0 && (
            <div className="text-center">
              <p className="text-2xl font-bold text-rose-500">{overdue.length}</p>
              <p className={`text-[10px] uppercase tracking-wide text-rose-400`}>
                overdue
              </p>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Week days for week view
  const weekDays = useMemo(() => {
    if (viewMode !== 'week') return []
    const weekStart = startOfWeek(currentDate)
    const weekEnd = endOfWeek(currentDate)
    return eachDayOfInterval({ start: weekStart, end: weekEnd })
  }, [currentDate, viewMode])

  // Tasks grouped by day for week view
  const tasksByDay = useMemo(() => {
    if (viewMode !== 'week') return new Map<string, Task[]>()
    const map = new Map<string, Task[]>()
    viewTasks.forEach((task) => {
      if (task.dueDate) {
        const dateKey = task.dueDate.split('T')[0]
        const existing = map.get(dateKey) || []
        map.set(dateKey, [...existing, task])
      }
    })
    return map
  }, [viewTasks, viewMode])

  return (
    <div className="flex flex-col h-full">
      {/* Controls - no duplicate header since WidgetWrapper already shows title */}
      <div className="flex items-center justify-between mb-3">
        {/* View Toggle */}
        <div className={`flex rounded-md p-0.5 ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}`}>
          <button
            onClick={() => setViewMode('day')}
            className={`px-2 py-0.5 text-[10px] font-medium rounded transition-colors ${
              viewMode === 'day'
                ? isDark
                  ? 'bg-zinc-700 text-zinc-100'
                  : 'bg-white text-zinc-800 shadow-sm'
                : isDark
                  ? 'text-zinc-400'
                  : 'text-zinc-500'
            }`}
          >
            Day
          </button>
          <button
            onClick={() => setViewMode('week')}
            className={`px-2 py-0.5 text-[10px] font-medium rounded transition-colors ${
              viewMode === 'week'
                ? isDark
                  ? 'bg-zinc-700 text-zinc-100'
                  : 'bg-white text-zinc-800 shadow-sm'
                : isDark
                  ? 'text-zinc-400'
                  : 'text-zinc-500'
            }`}
          >
            Week
          </button>
        </div>

        {/* Expand button */}
        <button
          onClick={() => onNavigate('/quarry/plan')}
          className={`p-1 rounded ${isDark ? 'hover:bg-zinc-700' : 'hover:bg-zinc-100'}`}
          title="Open full planner"
        >
          <Maximize2 className={`w-3.5 h-3.5 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`} />
        </button>
      </div>

      {/* Date Navigation */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={handlePrev}
          className={`p-1 rounded ${isDark ? 'hover:bg-zinc-700' : 'hover:bg-zinc-100'}`}
        >
          <ChevronLeft className={`w-4 h-4 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`} />
        </button>

        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
            {viewMode === 'day'
              ? isToday(currentDate)
                ? 'Today'
                : isTomorrow(currentDate)
                  ? 'Tomorrow'
                  : format(currentDate, 'EEE, MMM d')
              : `Week of ${format(startOfWeek(currentDate), 'MMM d')}`
            }
          </span>
          {!isToday(currentDate) && viewMode === 'day' && (
            <button
              onClick={handleToday}
              className={`text-[10px] px-1.5 py-0.5 rounded ${
                isDark ? 'bg-zinc-700 text-zinc-300' : 'bg-zinc-100 text-zinc-600'
              }`}
            >
              Today
            </button>
          )}
        </div>

        <button
          onClick={handleNext}
          className={`p-1 rounded ${isDark ? 'hover:bg-zinc-700' : 'hover:bg-zinc-100'}`}
        >
          <ChevronRight className={`w-4 h-4 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto space-y-1">
        {viewMode === 'day' ? (
          // Day View - Task List
          <>
            {overdue.length > 0 && (
              <div className="mb-2">
                <p className={`text-[10px] uppercase tracking-wide mb-1 text-rose-500`}>
                  Overdue ({overdue.length})
                </p>
                {overdue.slice(0, 2).map((task) => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    isDark={isDark}
                    onToggle={handleTaskToggle}
                    isOverdue
                  />
                ))}
              </div>
            )}

            {pending.length > 0 ? (
              pending.slice(0, 5).map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  isDark={isDark}
                  onToggle={handleTaskToggle}
                />
              ))
            ) : completed.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <CalendarDays className={`w-8 h-8 mb-2 ${isDark ? 'text-zinc-700' : 'text-zinc-300'}`} />
                <p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                  No tasks for this day
                </p>
              </div>
            ) : null}

            {completed.length > 0 && (
              <div className="mt-2 pt-2 border-t border-dashed border-zinc-200 dark:border-zinc-700">
                <p className={`text-[10px] uppercase tracking-wide mb-1 ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>
                  Done ({completed.length})
                </p>
                {completed.slice(0, 2).map((task) => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    isDark={isDark}
                    onToggle={handleTaskToggle}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          // Week View - Mini Week Grid
          <div className="grid grid-cols-7 gap-1">
            {weekDays.map((day) => {
              const dateStr = format(day, 'yyyy-MM-dd')
              const dayTasks = tasksByDay.get(dateStr) || []
              const pendingCount = dayTasks.filter((t) => t.status !== 'completed').length
              const isCurrentDay = isToday(day)

              return (
                <div
                  key={dateStr}
                  onClick={() => {
                    setCurrentDate(day)
                    setViewMode('day')
                  }}
                  className={`
                    flex flex-col items-center p-1.5 rounded-lg cursor-pointer
                    transition-colors
                    ${isCurrentDay
                      ? 'bg-rose-500 text-white'
                      : isDark
                        ? 'hover:bg-zinc-800'
                        : 'hover:bg-zinc-100'
                    }
                  `}
                >
                  <span className={`text-[10px] font-medium ${
                    isCurrentDay ? 'text-white' : isDark ? 'text-zinc-500' : 'text-zinc-400'
                  }`}>
                    {format(day, 'EEE')}
                  </span>
                  <span className={`text-sm font-bold ${
                    isCurrentDay ? 'text-white' : isDark ? 'text-zinc-200' : 'text-zinc-800'
                  }`}>
                    {format(day, 'd')}
                  </span>
                  {pendingCount > 0 && (
                    <span className={`
                      text-[9px] px-1 rounded-full mt-0.5
                      ${isCurrentDay
                        ? 'bg-white/20 text-white'
                        : 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400'
                      }
                    `}>
                      {pendingCount}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Add Task Button */}
      <button
        onClick={() => onNavigate('/quarry/plan?action=add')}
        className={`
          mt-2 w-full flex items-center justify-center gap-1.5 py-2 rounded-lg
          text-xs font-medium transition-colors
          ${isDark
            ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
            : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-600'
          }
        `}
      >
        <Plus className="w-3.5 h-3.5" />
        Add Task
      </button>
    </div>
  )
}

// Task Item Component
function TaskItem({
  task,
  isDark,
  onToggle,
  isOverdue = false,
}: {
  task: Task
  isDark: boolean
  onToggle: (id: string) => void
  isOverdue?: boolean
}) {
  const isCompleted = task.status === 'completed'

  return (
    <motion.div
      className={`
        flex items-center gap-2 p-2 rounded-lg group
        ${isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-50'}
      `}
      whileHover={{ x: 2 }}
    >
      <button
        onClick={(e) => {
          e.stopPropagation()
          onToggle(task.id)
        }}
        className={`
          w-4 h-4 rounded-full border-2 flex-shrink-0
          flex items-center justify-center transition-colors
          ${isCompleted
            ? 'bg-emerald-500 border-emerald-500 text-white'
            : isOverdue
              ? 'border-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20'
              : isDark
                ? 'border-zinc-600 hover:border-zinc-400'
                : 'border-zinc-300 hover:border-zinc-400'
          }
        `}
      >
        {isCompleted && <Check className="w-2.5 h-2.5" />}
      </button>

      <div className="flex-1 min-w-0">
        <p className={`
          text-xs truncate
          ${isCompleted
            ? 'line-through text-zinc-400'
            : isOverdue
              ? 'text-rose-600 dark:text-rose-400'
              : isDark
                ? 'text-zinc-200'
                : 'text-zinc-800'
          }
        `}>
          {task.title}
        </p>
      </div>

      {task.dueTime && (
        <span className={`
          text-[10px] flex items-center gap-0.5
          ${isDark ? 'text-zinc-500' : 'text-zinc-400'}
        `}>
          <Clock className="w-2.5 h-2.5" />
          {task.dueTime}
        </span>
      )}

      {isOverdue && !isCompleted && (
        <AlertCircle className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />
      )}
    </motion.div>
  )
}

export default PlannerWidget
