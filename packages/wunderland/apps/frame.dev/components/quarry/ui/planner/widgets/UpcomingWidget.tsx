/**
 * UpcomingWidget
 *
 * Dashboard widget showing upcoming tasks and deadlines.
 *
 * @module components/quarry/ui/planner/widgets/UpcomingWidget
 */

'use client'

import { useMemo, memo } from 'react'
import { CalendarDays, Clock, AlertTriangle, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Task } from '@/lib/planner/types'
import { formatDuration, isTaskOverdue } from '@/lib/planner/types'
import { getProjectColor } from '@/lib/planner/projects'

export interface UpcomingWidgetProps {
  tasks: Task[]
  onTaskClick?: (task: Task) => void
  onViewAll?: () => void
  daysAhead?: number
  maxTasks?: number
  theme?: 'light' | 'dark'
  className?: string
}

function UpcomingWidgetComponent({
  tasks,
  onTaskClick,
  onViewAll,
  daysAhead = 7,
  maxTasks = 5,
  theme = 'dark',
  className,
}: UpcomingWidgetProps) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const upcoming = useMemo(() => {
    const endDate = new Date(today)
    endDate.setDate(endDate.getDate() + daysAhead)

    return tasks
      .filter((t) => {
        if (!t.dueDate || t.status === 'completed') return false
        const dueDate = new Date(t.dueDate)
        return dueDate > today && dueDate <= endDate
      })
      .sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''))
      .slice(0, maxTasks)
  }, [tasks, today, daysAhead, maxTasks])

  const overdue = useMemo(() => {
    return tasks.filter((t) => isTaskOverdue(t))
  }, [tasks])

  const formatRelativeDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const diffDays = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays === 1) return 'Tomorrow'
    if (diffDays <= 7) return `In ${diffDays} days`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

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
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CalendarDays
            className={cn(
              'w-5 h-5',
              theme === 'dark' ? 'text-blue-400' : 'text-blue-500'
            )}
          />
          <h3
            className={cn(
              'font-semibold',
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            )}
          >
            Upcoming
          </h3>
        </div>
        {onViewAll && (
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

      {/* Overdue warning */}
      {overdue.length > 0 && (
        <div
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-lg mb-3',
            'bg-red-500/10 text-red-400'
          )}
        >
          <AlertTriangle className="w-4 h-4" />
          <span className="text-sm font-medium">
            {overdue.length} overdue task{overdue.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* Upcoming list */}
      <div className="space-y-2">
        {upcoming.length === 0 ? (
          <div
            className={cn(
              'text-center py-4',
              theme === 'dark' ? 'text-zinc-500' : 'text-gray-400'
            )}
          >
            <p className="text-sm">No upcoming tasks this week</p>
          </div>
        ) : (
          upcoming.map((task) => (
            <div
              key={task.id}
              onClick={() => onTaskClick?.(task)}
              className={cn(
                'flex items-center gap-3 py-2 px-2 rounded-lg transition-colors cursor-pointer',
                theme === 'dark' ? 'hover:bg-zinc-800/50' : 'hover:bg-gray-50'
              )}
            >
              {/* Project color */}
              <div
                className="w-1 h-8 rounded-full flex-shrink-0"
                style={{ backgroundColor: getProjectColor(task.project) }}
              />

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    'text-sm truncate',
                    theme === 'dark' ? 'text-zinc-200' : 'text-gray-800'
                  )}
                >
                  {task.title}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span
                    className={cn(
                      'text-xs',
                      theme === 'dark' ? 'text-zinc-500' : 'text-gray-400'
                    )}
                  >
                    {task.dueDate && formatRelativeDate(task.dueDate)}
                  </span>
                  {task.duration && (
                    <>
                      <span className={cn('text-xs', theme === 'dark' ? 'text-zinc-700' : 'text-gray-300')}>
                        •
                      </span>
                      <span
                        className={cn(
                          'flex items-center gap-0.5 text-xs',
                          theme === 'dark' ? 'text-zinc-500' : 'text-gray-400'
                        )}
                      >
                        <Clock className="w-2.5 h-2.5" />
                        {formatDuration(task.duration)}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Priority indicator */}
              {task.priority === 'urgent' && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-500/20 text-red-400">
                  Urgent
                </span>
              )}
              {task.priority === 'high' && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-orange-500/20 text-orange-400">
                  High
                </span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export const UpcomingWidget = memo(UpcomingWidgetComponent)
export default UpcomingWidget
