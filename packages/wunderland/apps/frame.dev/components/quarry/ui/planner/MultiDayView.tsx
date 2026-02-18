/**
 * MultiDayView Component (Calendar Kanban)
 *
 * Ellie-style multi-day column view for tasks. Shows 3-7 days as
 * horizontal columns with drag-and-drop between days.
 *
 * Features:
 * - 3-7 day horizontal columns
 * - Drag tasks between days
 * - Total estimated time per day
 * - Task rollover (incomplete tasks from past days)
 * - Quick add at top of each column
 * - Project/label colors on task cards
 *
 * @module components/quarry/ui/planner/MultiDayView
 */

'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Settings2,
  RefreshCw,
  ArrowRight,
  Clock,
  Filter,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Task, CreateTaskInput, UpdateTaskInput } from '@/lib/planner/types'
import { formatDuration } from '@/lib/planner/types'
import { DayColumn } from './DayColumn'

export interface MultiDayViewProps {
  tasks: Task[]
  onCreateTask: (input: CreateTaskInput) => Promise<Task | null>
  onUpdateTask: (id: string, updates: UpdateTaskInput) => Promise<Task | null>
  onDeleteTask?: (id: string) => Promise<boolean>
  onToggleComplete: (id: string) => Promise<Task | null>
  onTaskClick?: (task: Task) => void
  onTaskContextMenu?: (task: Task, e: React.MouseEvent) => void

  // Settings
  daysToShow?: 3 | 4 | 5 | 6 | 7
  startDate?: Date
  showCompleted?: boolean
  enableRollover?: boolean
  rolloverPosition?: 'top' | 'bottom'

  // Theming
  theme?: 'light' | 'dark'
  className?: string
}

export function MultiDayView({
  tasks,
  onCreateTask,
  onUpdateTask,
  onDeleteTask,
  onToggleComplete,
  onTaskClick,
  onTaskContextMenu,
  daysToShow = 5,
  startDate,
  showCompleted = false,
  enableRollover = true,
  rolloverPosition = 'top',
  theme = 'dark',
  className,
}: MultiDayViewProps) {
  const [currentStartDate, setCurrentStartDate] = useState(() => {
    if (startDate) return startDate
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return today
  })
  const [isAnimating, setIsAnimating] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [localDaysToShow, setLocalDaysToShow] = useState(daysToShow)

  // Generate array of dates for columns
  const dates = useMemo(() => {
    const result: Date[] = []
    for (let i = 0; i < localDaysToShow; i++) {
      const date = new Date(currentStartDate)
      date.setDate(date.getDate() + i)
      result.push(date)
    }
    return result
  }, [currentStartDate, localDaysToShow])

  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  // Ensure tasks is always an array (guard for Suspense hydration)
  const safeTasks = tasks && Array.isArray(tasks) ? tasks : []

  // Get overdue tasks (tasks from before today that are incomplete)
  const overdueTasks = useMemo(() => {
    if (!enableRollover) return []
    const todayStr = today.toISOString().split('T')[0]
    return safeTasks.filter(
      (t) =>
        t.dueDate &&
        t.dueDate < todayStr &&
        t.status !== 'completed' &&
        t.status !== 'cancelled'
    )
  }, [safeTasks, today, enableRollover])

  // Group tasks by date
  const tasksByDate = useMemo(() => {
    const map: Record<string, Task[]> = {}

    // Initialize all dates
    dates.forEach((date) => {
      const dateStr = date.toISOString().split('T')[0]
      map[dateStr] = []
    })

    // Distribute tasks to their dates
    safeTasks.forEach((task) => {
      if (!task.dueDate) return
      if (!showCompleted && task.status === 'completed') return

      const dateStr = task.dueDate
      if (map[dateStr]) {
        map[dateStr].push(task)
      }
    })

    // Add overdue tasks to today if rollover is enabled
    if (enableRollover && overdueTasks.length > 0) {
      const todayStr = today.toISOString().split('T')[0]
      if (map[todayStr]) {
        const existing = map[todayStr]
        if (rolloverPosition === 'top') {
          map[todayStr] = [...overdueTasks, ...existing]
        } else {
          map[todayStr] = [...existing, ...overdueTasks]
        }
      }
    }

    return map
  }, [safeTasks, dates, showCompleted, enableRollover, overdueTasks, today, rolloverPosition])

  // Calculate total stats
  const totalStats = useMemo(() => {
    let totalTasks = 0
    let totalMinutes = 0

    Object.values(tasksByDate).forEach((dayTasks) => {
      const incomplete = dayTasks.filter((t) => t.status !== 'completed')
      totalTasks += incomplete.length
      totalMinutes += incomplete.reduce((sum, t) => sum + (t.duration || 0), 0)
    })

    return { totalTasks, totalMinutes }
  }, [tasksByDate])

  // Navigate to previous/next period
  const navigate = useCallback(
    (direction: 'prev' | 'next') => {
      setIsAnimating(true)
      setCurrentStartDate((prev) => {
        const newDate = new Date(prev)
        newDate.setDate(newDate.getDate() + (direction === 'next' ? localDaysToShow : -localDaysToShow))
        return newDate
      })
      setTimeout(() => setIsAnimating(false), 300)
    },
    [localDaysToShow]
  )

  // Go to today
  const goToToday = useCallback(() => {
    setIsAnimating(true)
    const newDate = new Date()
    newDate.setHours(0, 0, 0, 0)
    setCurrentStartDate(newDate)
    setTimeout(() => setIsAnimating(false), 300)
  }, [])

  // Move task to new date
  const handleMoveTask = useCallback(
    async (taskId: string, newDate: string) => {
      await onUpdateTask(taskId, { dueDate: newDate })
    },
    [onUpdateTask]
  )

  // Reorder tasks within a day
  const handleReorderTasks = useCallback(
    (date: string, taskIds: string[]) => {
      // For now, we don't persist order - could add sortOrder to tasks later
      console.log('[MultiDayView] Reorder tasks:', date, taskIds)
    },
    []
  )

  // Check if showing today
  const isShowingToday = useMemo(() => {
    const todayStr = today.toISOString().split('T')[0]
    return dates.some((d) => d.toISOString().split('T')[0] === todayStr)
  }, [dates, today])

  return (
    <div
      className={cn(
        'flex flex-col h-full',
        theme === 'dark' ? 'bg-zinc-950' : 'bg-white',
        className
      )}
    >
      {/* Header */}
      <div
        className={cn(
          'flex items-center justify-between px-6 py-4 border-b',
          theme === 'dark' ? 'border-zinc-800' : 'border-gray-200'
        )}
      >
        <div className="flex items-center gap-4">
          {/* Navigation */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => navigate('prev')}
              className={cn(
                'p-2 rounded-lg transition-colors',
                theme === 'dark'
                  ? 'hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                  : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'
              )}
              aria-label="Previous period"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => navigate('next')}
              className={cn(
                'p-2 rounded-lg transition-colors',
                theme === 'dark'
                  ? 'hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                  : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'
              )}
              aria-label="Next period"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Date range display */}
          <div>
            <h2
              className={cn(
                'text-lg font-semibold',
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              )}
            >
              {dates.length > 0 ? (
                <>
                  {dates[0].toLocaleDateString('en-US', { month: 'long' })}
                  {dates[0].getMonth() !== dates[dates.length - 1].getMonth() &&
                    ` - ${dates[dates.length - 1].toLocaleDateString('en-US', { month: 'long' })}`}{' '}
                  {dates[0].getFullYear()}
                </>
              ) : 'No dates'}
            </h2>
            <p
              className={cn(
                'text-xs',
                theme === 'dark' ? 'text-zinc-500' : 'text-gray-500'
              )}
            >
              {dates.length > 0 ? (
                <>
                  {dates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  {' - '}
                  {dates[dates.length - 1].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </>
              ) : ''}
            </p>
          </div>
        </div>

        {/* Stats & Actions */}
        <div className="flex items-center gap-4">
          {/* Stats */}
          <div
            className={cn(
              'flex items-center gap-4 px-4 py-2 rounded-lg',
              theme === 'dark' ? 'bg-zinc-900' : 'bg-gray-50'
            )}
          >
            <span
              className={cn(
                'text-sm',
                theme === 'dark' ? 'text-zinc-400' : 'text-gray-600'
              )}
            >
              {totalStats.totalTasks} tasks
            </span>
            {totalStats.totalMinutes > 0 && (
              <>
                <span className={cn('text-xs', theme === 'dark' ? 'text-zinc-600' : 'text-gray-300')}>
                  •
                </span>
                <span
                  className={cn(
                    'flex items-center gap-1 text-sm',
                    theme === 'dark' ? 'text-zinc-400' : 'text-gray-600'
                  )}
                >
                  <Clock className="w-3.5 h-3.5" />
                  {formatDuration(totalStats.totalMinutes)}
                </span>
              </>
            )}
          </div>

          {/* Overdue indicator */}
          {overdueTasks.length > 0 && (
            <span
              className={cn(
                'inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium',
                'bg-amber-500/20 text-amber-400'
              )}
            >
              <RefreshCw className="w-3 h-3" />
              {overdueTasks.length} rolled over
            </span>
          )}

          {/* Today button */}
          {!isShowingToday && (
            <button
              onClick={goToToday}
              className={cn(
                'flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                'bg-blue-500 text-white hover:bg-blue-600'
              )}
            >
              <Calendar className="w-4 h-4" />
              Today
            </button>
          )}

          {/* Settings */}
          <div className="relative">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={cn(
                'p-2 rounded-lg transition-colors',
                theme === 'dark'
                  ? 'hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                  : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700',
                showSettings && (theme === 'dark' ? 'bg-zinc-800' : 'bg-gray-100')
              )}
              aria-label="View settings"
            >
              <Settings2 className="w-5 h-5" />
            </button>

            {/* Settings dropdown */}
            <AnimatePresence>
              {showSettings && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={cn(
                    'absolute right-0 top-full mt-2 p-4 rounded-xl border shadow-xl z-50 min-w-[200px]',
                    theme === 'dark'
                      ? 'bg-zinc-900 border-zinc-700'
                      : 'bg-white border-gray-200'
                  )}
                >
                  <h3
                    className={cn(
                      'text-xs font-semibold uppercase tracking-wider mb-3',
                      theme === 'dark' ? 'text-zinc-500' : 'text-gray-500'
                    )}
                  >
                    Days to show
                  </h3>
                  <div className="flex gap-1">
                    {([3, 4, 5, 6, 7] as const).map((n) => (
                      <button
                        key={n}
                        onClick={() => setLocalDaysToShow(n)}
                        className={cn(
                          'w-8 h-8 rounded-lg text-sm font-medium transition-colors',
                          localDaysToShow === n
                            ? 'bg-blue-500 text-white'
                            : theme === 'dark'
                              ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        )}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Columns container */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <motion.div
          className="flex gap-4 p-6 h-full min-w-min"
          initial={false}
          animate={{
            opacity: isAnimating ? 0.5 : 1,
          }}
          transition={{ duration: 0.15 }}
        >
          {dates.map((date) => {
            const dateStr = date.toISOString().split('T')[0]
            const todayStr = today.toISOString().split('T')[0]
            const isToday = dateStr === todayStr
            const isPast = dateStr < todayStr

            return (
              <DayColumn
                key={dateStr}
                date={date}
                tasks={tasksByDate[dateStr] || []}
                isToday={isToday}
                isPast={isPast}
                onTaskClick={onTaskClick}
                onToggleComplete={async (id) => {
                  await onToggleComplete(id)
                }}
                onCreateTask={onCreateTask}
                onMoveTask={handleMoveTask}
                onReorderTasks={handleReorderTasks}
                onTaskContextMenu={onTaskContextMenu}
                showCompleted={showCompleted}
                theme={theme}
              />
            )
          })}
        </motion.div>
      </div>

      {/* Close settings on outside click */}
      {showSettings && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowSettings(false)}
        />
      )}
    </div>
  )
}

export default MultiDayView
