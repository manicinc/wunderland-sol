/**
 * TodayTasksWidget
 *
 * Dashboard widget showing today's tasks with progress indicator.
 *
 * @module components/quarry/ui/planner/widgets/TodayTasksWidget
 */

'use client'

import { useMemo, memo, useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, Circle, Clock, ChevronRight, ChevronDown, Sunrise, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Task } from '@/lib/planner/types'
import { formatDuration } from '@/lib/planner/types'
import { getProjectColor, getProjectName } from '@/lib/planner/projects'

export interface TodayTasksWidgetProps {
  tasks: Task[]
  onTaskClick?: (task: Task) => void
  onToggleComplete?: (taskId: string) => void
  onViewAll?: () => void
  maxTasks?: number
  theme?: 'light' | 'dark'
  className?: string
  /** Whether to allow collapsing the widget */
  collapsible?: boolean
  /** Default collapsed state */
  defaultCollapsed?: boolean
  /** Storage key for persisting collapsed state */
  storageKey?: string
}

const COLLAPSED_STORAGE_PREFIX = 'today-tasks-collapsed:'

function TodayTasksWidgetComponent({
  tasks,
  onTaskClick,
  onToggleComplete,
  onViewAll,
  maxTasks = 5,
  theme = 'dark',
  className,
  collapsible = false,
  defaultCollapsed = false,
  storageKey = 'default',
}: TodayTasksWidgetProps) {
  const today = new Date().toISOString().split('T')[0]

  // Collapsed state with localStorage persistence
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed)

  // Load collapsed state from localStorage on mount
  useEffect(() => {
    if (!collapsible) return
    try {
      const stored = localStorage.getItem(`${COLLAPSED_STORAGE_PREFIX}${storageKey}`)
      if (stored !== null) {
        setIsCollapsed(stored === 'true')
      }
    } catch {
      // Ignore localStorage errors
    }
  }, [collapsible, storageKey])

  // Persist collapsed state to localStorage
  const toggleCollapsed = () => {
    const newState = !isCollapsed
    setIsCollapsed(newState)
    try {
      localStorage.setItem(`${COLLAPSED_STORAGE_PREFIX}${storageKey}`, String(newState))
    } catch {
      // Ignore localStorage errors
    }
  }

  const todayTasks = useMemo(() => {
    return tasks.filter((t) => t.dueDate === today)
  }, [tasks, today])

  const stats = useMemo(() => {
    const completed = todayTasks.filter((t) => t.status === 'completed').length
    const total = todayTasks.length
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0
    const totalMinutes = todayTasks
      .filter((t) => t.status !== 'completed')
      .reduce((sum, t) => sum + (t.duration || 0), 0)

    return { completed, total, percentage, totalMinutes }
  }, [todayTasks])

  const displayTasks = todayTasks
    .filter((t) => t.status !== 'completed')
    .slice(0, maxTasks)

  return (
    <div
      className={cn(
        'rounded-xl border p-4',
        theme === 'dark'
          ? 'bg-zinc-900/50 border-zinc-800'
          : 'bg-white border-gray-200',
        className
      )}
    >
      {/* Header */}
      <div className={cn('flex items-center justify-between', !isCollapsed && 'mb-4')}>
        <button
          onClick={collapsible ? toggleCollapsed : undefined}
          className={cn(
            'flex items-center gap-2',
            collapsible && 'cursor-pointer hover:opacity-80 transition-opacity'
          )}
          disabled={!collapsible}
        >
          {collapsible && (
            <motion.div
              animate={{ rotate: isCollapsed ? -90 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown
                className={cn(
                  'w-4 h-4',
                  theme === 'dark' ? 'text-zinc-500' : 'text-gray-400'
                )}
              />
            </motion.div>
          )}
          <Sunrise
            className={cn(
              'w-5 h-5',
              theme === 'dark' ? 'text-amber-400' : 'text-amber-500'
            )}
          />
          <h3
            className={cn(
              'font-semibold',
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            )}
          >
            Today
          </h3>
          {isCollapsed && stats.total > 0 && (
            <span
              className={cn(
                'text-xs px-1.5 py-0.5 rounded-full',
                theme === 'dark' ? 'bg-zinc-700 text-zinc-300' : 'bg-gray-100 text-gray-600'
              )}
            >
              {stats.completed}/{stats.total}
            </span>
          )}
        </button>
        {!isCollapsed && onViewAll && (
          <button
            onClick={onViewAll}
            className={cn(
              'flex items-center gap-1 text-xs transition-colors',
              theme === 'dark'
                ? 'text-zinc-500 hover:text-zinc-300'
                : 'text-gray-400 hover:text-gray-600'
            )}
          >
            View all
            <ChevronRight className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Collapsible content */}
      <AnimatePresence initial={false}>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            {/* Progress bar */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1.5">
                <span
                  className={cn(
                    'text-xs',
                    theme === 'dark' ? 'text-zinc-400' : 'text-gray-500'
                  )}
                >
                  {stats.completed} of {stats.total} completed
                </span>
                <span
                  className={cn(
                    'text-xs font-medium tabular-nums',
                    stats.percentage === 100
                      ? 'text-emerald-400'
                      : theme === 'dark'
                        ? 'text-zinc-300'
                        : 'text-gray-700'
                  )}
                >
                  {stats.percentage}%
                </span>
              </div>
              <div
                className={cn(
                  'h-2 rounded-full overflow-hidden',
                  theme === 'dark' ? 'bg-zinc-800' : 'bg-gray-100'
                )}
              >
                <motion.div
                  className="h-full bg-emerald-500 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${stats.percentage}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                />
              </div>
              {stats.totalMinutes > 0 && (
                <p
                  className={cn(
                    'flex items-center gap-1 text-xs mt-1.5',
                    theme === 'dark' ? 'text-zinc-500' : 'text-gray-400'
                  )}
                >
                  <Clock className="w-3 h-3" />
                  {formatDuration(stats.totalMinutes)} remaining
                </p>
              )}
            </div>

            {/* Task list */}
            <div className="space-y-2">
              {displayTasks.length === 0 ? (
                <div
                  className={cn(
                    'text-center py-4',
                    theme === 'dark' ? 'text-zinc-500' : 'text-gray-400'
                  )}
                >
                  {stats.total === 0 ? (
                    <p className="text-sm">No tasks scheduled for today</p>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                      <p className="text-sm">All done for today!</p>
                    </div>
                  )}
                </div>
              ) : (
                displayTasks.map((task) => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    onToggle={() => onToggleComplete?.(task.id)}
                    onClick={() => onTaskClick?.(task)}
                    theme={theme}
                  />
                ))
              )}

              {todayTasks.length > maxTasks && (
                <button
                  onClick={onViewAll}
                  className={cn(
                    'w-full flex items-center justify-center gap-1 py-2 text-xs transition-colors rounded-lg',
                    theme === 'dark'
                      ? 'text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300'
                      : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'
                  )}
                >
                  +{todayTasks.length - maxTasks} more tasks
                  <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function TaskItem({
  task,
  onToggle,
  onClick,
  theme,
}: {
  task: Task
  onToggle: () => void
  onClick: () => void
  theme: 'light' | 'dark'
}) {
  const projectColor = getProjectColor(task.project)
  const isCompleted = task.status === 'completed'

  return (
    <div
      className={cn(
        'group flex items-center gap-2 py-2 px-2 rounded-lg transition-colors cursor-pointer',
        theme === 'dark' ? 'hover:bg-zinc-800/50' : 'hover:bg-gray-50'
      )}
      onClick={onClick}
    >
      <button
        onClick={(e) => {
          e.stopPropagation()
          onToggle()
        }}
        className={cn(
          'flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all',
          isCompleted
            ? 'bg-emerald-500 border-emerald-500'
            : theme === 'dark'
              ? 'border-zinc-600 hover:border-zinc-500'
              : 'border-gray-300 hover:border-gray-400'
        )}
      >
        {isCompleted && (
          <CheckCircle2 className="w-3 h-3 text-white" />
        )}
      </button>

      <div className="flex-1 min-w-0">
        <p
          className={cn(
            'text-sm truncate',
            isCompleted && 'line-through',
            theme === 'dark' ? 'text-zinc-200' : 'text-gray-800'
          )}
        >
          {task.title}
        </p>
      </div>

      {task.duration && (
        <span
          className={cn(
            'text-xs tabular-nums',
            theme === 'dark' ? 'text-zinc-500' : 'text-gray-400'
          )}
        >
          {formatDuration(task.duration)}
        </span>
      )}

      {task.project && (
        <div
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: projectColor }}
        />
      )}
    </div>
  )
}

export const TodayTasksWidget = memo(TodayTasksWidgetComponent)
export default TodayTasksWidget
