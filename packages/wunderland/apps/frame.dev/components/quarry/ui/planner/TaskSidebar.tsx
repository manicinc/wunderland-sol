/**
 * TaskSidebar - Premium task list sidebar for the planner
 *
 * Features:
 * - Elegant stats dashboard with color-coded cards
 * - Organized sections: Overdue, Today, Upcoming, Completed
 * - Task cards with priority colors, time, duration, and tags
 * - Inline quick-add functionality
 * - Consistent typography with app design tokens
 *
 * @module codex/ui/planner/TaskSidebar
 */

'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { format, isToday, isBefore, startOfDay, addDays, isAfter } from 'date-fns'
import {
  Check,
  Clock,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Plus,
  AlertTriangle,
  Calendar,
  Circle,
  PanelRightClose,
  PanelRightOpen,
  FileText,
} from 'lucide-react'
import type { Task } from '@/lib/planner/types'
import { formatDuration, PRIORITY_COLORS } from '@/lib/planner/types'

interface TaskSidebarProps {
  tasks: Task[]
  selectedDate: Date
  onTaskClick?: (task: Task) => void
  onTaskToggle?: (taskId: string, completed: boolean) => void
  onAddTask?: () => void
  isLoading?: boolean
  theme?: string
}

interface TaskSectionProps {
  title: string
  tasks: Task[]
  variant: 'danger' | 'primary' | 'muted' | 'success'
  collapsed?: boolean
  onTaskClick?: (task: Task) => void
  onTaskToggle?: (taskId: string, completed: boolean) => void
  isDark: boolean
}

const sectionVariants = {
  danger: {
    headerBg: 'bg-rose-50 dark:bg-rose-900/20',
    headerText: 'text-rose-700 dark:text-rose-300',
    icon: AlertTriangle,
    iconColor: 'text-rose-500',
  },
  primary: {
    headerBg: 'bg-amber-50 dark:bg-amber-900/20',
    headerText: 'text-amber-700 dark:text-amber-300',
    icon: Calendar,
    iconColor: 'text-amber-500',
  },
  muted: {
    headerBg: 'bg-zinc-100 dark:bg-zinc-800',
    headerText: 'text-zinc-600 dark:text-zinc-400',
    icon: Clock,
    iconColor: 'text-zinc-400',
  },
  success: {
    headerBg: 'bg-emerald-50 dark:bg-emerald-900/20',
    headerText: 'text-emerald-700 dark:text-emerald-300',
    icon: Check,
    iconColor: 'text-emerald-500',
  },
}

const priorityRingColors: Record<string, string> = {
  low: 'border-emerald-400 dark:border-emerald-500',
  medium: 'border-amber-400 dark:border-amber-500',
  high: 'border-orange-400 dark:border-orange-500',
  urgent: 'border-rose-500 dark:border-rose-500',
}

function TaskCard({
  task,
  onToggle,
  onClick,
  isDark,
}: {
  task: Task
  onToggle?: (completed: boolean) => void
  onClick?: () => void
  isDark: boolean
}) {
  const isCompleted = task.status === 'completed'

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className={`
        group p-3 rounded-xl transition-all duration-200 cursor-pointer
        ${isDark
          ? 'bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50 hover:border-zinc-600'
          : 'bg-white hover:bg-zinc-50 border border-zinc-200 hover:border-zinc-300 shadow-sm hover:shadow-md'
        }
      `}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        {/* Checkbox with priority ring */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            onToggle?.(!isCompleted)
          }}
          className={`
            flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center
            transition-all duration-200
            ${isCompleted
              ? 'bg-emerald-500 border-emerald-500'
              : priorityRingColors[task.priority]
            }
            ${!isCompleted && 'hover:bg-opacity-20 hover:bg-current'}
          `}
        >
          {isCompleted && <Check className="w-3 h-3 text-white" />}
        </button>

        <div className="flex-1 min-w-0">
          {/* Title */}
          <div className={`
            font-medium text-sm leading-tight
            ${isCompleted
              ? 'line-through text-zinc-400 dark:text-zinc-500'
              : isDark ? 'text-zinc-100' : 'text-zinc-900'
            }
          `}>
            {task.title}
          </div>

          {/* Time + Duration row */}
          {(task.dueTime || task.duration) && (
            <div className="flex items-center gap-2 mt-1.5">
              {task.dueTime && (
                <div className={`flex items-center gap-1 text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                  <Clock className="w-3 h-3" />
                  <span style={{ fontFamily: 'var(--font-geist-mono)' }}>{task.dueTime}</span>
                </div>
              )}
              {task.duration && (
                <span
                  className={`
                    px-1.5 py-0.5 rounded text-[10px] font-medium
                    ${isDark ? 'bg-zinc-700 text-zinc-300' : 'bg-zinc-100 text-zinc-600'}
                  `}
                  style={{ fontFamily: 'var(--font-geist-mono)' }}
                >
                  {formatDuration(task.duration)}
                </span>
              )}
            </div>
          )}

          {/* Tags */}
          {task.tags && task.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {task.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className={`
                    px-1.5 py-0.5 rounded-full text-[10px] font-medium
                    ${isDark
                      ? 'bg-blue-900/30 text-blue-300'
                      : 'bg-blue-100 text-blue-700'
                    }
                  `}
                >
                  #{tag}
                </span>
              ))}
              {task.tags.length > 3 && (
                <span className={`text-[10px] ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                  +{task.tags.length - 3}
                </span>
              )}
            </div>
          )}

          {/* Strand link indicator */}
          {task.strandPath ? (
            <div className={`flex items-center gap-1.5 mt-2 text-[10px] font-medium ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
              <FileText className="w-3 h-3" />
              <span className="truncate" title={task.strandPath}>
                {task.strandPath.split('/').pop()} →
              </span>
            </div>
          ) : task.taskType === 'standalone' && (
            <div className={`flex items-center gap-1 mt-2 text-[10px] ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>
              <span>Standalone task</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

function TaskSection({
  title,
  tasks,
  variant,
  collapsed: initialCollapsed = false,
  onTaskClick,
  onTaskToggle,
  isDark,
}: TaskSectionProps) {
  const [isCollapsed, setIsCollapsed] = useState(initialCollapsed)
  const config = sectionVariants[variant]
  const Icon = config.icon

  if (!tasks || tasks.length === 0) return null

  return (
    <div className="mb-4">
      {/* Section header */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className={`
          w-full flex items-center gap-2 px-3 py-2 rounded-lg mb-2
          ${config.headerBg} ${config.headerText}
          transition-colors duration-200
        `}
      >
        <Icon className={`w-4 h-4 ${config.iconColor}`} />
        <span
          className="text-xs font-semibold uppercase tracking-wider flex-1 text-left"
          style={{ fontFamily: 'var(--font-geist-sans)' }}
        >
          {title}
        </span>
        <span
          className="text-xs font-bold"
          style={{ fontFamily: 'var(--font-geist-mono)' }}
        >
          {tasks.length}
        </span>
        {isCollapsed ? (
          <ChevronRight className="w-4 h-4" />
        ) : (
          <ChevronDown className="w-4 h-4" />
        )}
      </button>

      {/* Tasks */}
      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-2 overflow-hidden"
          >
            {tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                isDark={isDark}
                onClick={() => onTaskClick?.(task)}
                onToggle={(completed) => onTaskToggle?.(task.id, completed)}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function TaskSidebar({
  tasks,
  selectedDate,
  onTaskClick,
  onTaskToggle,
  onAddTask,
  isLoading,
  theme = 'light',
}: TaskSidebarProps) {
  const isDark = theme.includes('dark')
  const [isExpanded, setIsExpanded] = useState(true)

  // Categorize tasks with null safety
  const { overdue, today, upcoming, completed, stats } = useMemo(() => {
    const now = new Date()
    const todayStart = startOfDay(now)
    const tomorrowStart = addDays(todayStart, 1)
    const weekEnd = addDays(todayStart, 7)

    const overdueTasks: Task[] = []
    const todayTasks: Task[] = []
    const upcomingTasks: Task[] = []
    const completedTasks: Task[] = []

    let pendingCount = 0
    let overdueCount = 0
    let completedCount = 0

    // Guard against undefined tasks
    if (!tasks || !Array.isArray(tasks)) {
      return {
        overdue: [],
        today: [],
        upcoming: [],
        completed: [],
        stats: { pending: 0, overdue: 0, completed: 0 },
      }
    }

    tasks.forEach((task) => {
      if (task.status === 'completed') {
        completedTasks.push(task)
        completedCount++
        return
      }

      if (task.status === 'cancelled') return

      pendingCount++

      if (!task.dueDate) {
        // No due date - show in upcoming
        upcomingTasks.push(task)
        return
      }

      const dueDate = new Date(task.dueDate)
      if (task.dueTime) {
        const [hours, minutes] = task.dueTime.split(':').map(Number)
        dueDate.setHours(hours, minutes)
      } else {
        dueDate.setHours(23, 59, 59)
      }

      if (isBefore(dueDate, now) && !isToday(dueDate)) {
        overdueTasks.push(task)
        overdueCount++
      } else if (isToday(new Date(task.dueDate))) {
        todayTasks.push(task)
      } else if (isBefore(new Date(task.dueDate), weekEnd)) {
        upcomingTasks.push(task)
      } else {
        upcomingTasks.push(task)
      }
    })

    // Sort by time within each group
    const sortByTime = (a: Task, b: Task) => {
      if (!a.dueTime && !b.dueTime) return 0
      if (!a.dueTime) return 1
      if (!b.dueTime) return -1
      return a.dueTime.localeCompare(b.dueTime)
    }

    todayTasks.sort(sortByTime)
    upcomingTasks.sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return 0
      if (!a.dueDate) return 1
      if (!b.dueDate) return -1
      return a.dueDate.localeCompare(b.dueDate) || sortByTime(a, b)
    })

    return {
      overdue: overdueTasks,
      today: todayTasks,
      upcoming: upcomingTasks,
      completed: completedTasks.slice(0, 5), // Show only recent completed
      stats: { pending: pendingCount, overdue: overdueCount, completed: completedCount },
    }
  }, [tasks])

  return (
    <motion.aside
      initial={false}
      animate={{ width: isExpanded ? 320 : 56 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className={`
        flex-shrink-0 flex flex-col h-full overflow-hidden
        border-l transition-colors duration-200
        ${isDark
          ? 'bg-gradient-to-b from-zinc-900 to-zinc-950 border-zinc-800'
          : 'bg-gradient-to-b from-white to-zinc-50 border-zinc-200'
        }
      `}
    >
      {/* Header */}
      <div className={`px-3 py-3 border-b flex items-center gap-2 ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
        {/* Expand/Collapse Button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={`
            flex-shrink-0 p-1.5 rounded-lg transition-all duration-200
            ${isDark
              ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
              : 'text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100'
            }
          `}
          title={isExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          {isExpanded ? (
            <PanelRightOpen className="w-4 h-4" />
          ) : (
            <PanelRightClose className="w-4 h-4" />
          )}
        </button>

        <AnimatePresence mode="wait">
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.15 }}
              className="flex-1 min-w-0"
            >
              <h2
                className={`text-lg font-semibold truncate ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}
                style={{ fontFamily: 'var(--font-fraunces)' }}
              >
                Today's Tasks
              </h2>
              <p
                className={`text-xs mt-0.5 truncate ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}
                style={{ fontFamily: 'var(--font-geist-sans)' }}
              >
                {format(selectedDate, 'EEEE, MMMM d')}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence mode="wait">
        {isExpanded ? (
          <motion.div
            key="expanded-content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="flex flex-col flex-1 overflow-hidden"
          >
            {/* Stats Dashboard */}
            <div className={`p-4 border-b ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
              <div className="grid grid-cols-3 gap-2">
                {/* Completed */}
                <div className={`
                  p-3 rounded-xl text-center
                  ${isDark ? 'bg-emerald-900/20' : 'bg-emerald-50'}
                `}>
                  <div
                    className="text-2xl font-bold text-emerald-600 dark:text-emerald-400"
                    style={{ fontFamily: 'var(--font-geist-mono)' }}
                  >
                    {stats.completed}
                  </div>
                  <div
                    className="text-[10px] uppercase tracking-wider font-semibold text-emerald-600/70 dark:text-emerald-400/70"
                    style={{ fontFamily: 'var(--font-geist-sans)' }}
                  >
                    Done
                  </div>
                </div>

                {/* Pending */}
                <div className={`
                  p-3 rounded-xl text-center
                  ${isDark ? 'bg-amber-900/20' : 'bg-amber-50'}
                `}>
                  <div
                    className="text-2xl font-bold text-amber-600 dark:text-amber-400"
                    style={{ fontFamily: 'var(--font-geist-mono)' }}
                  >
                    {stats.pending}
                  </div>
                  <div
                    className="text-[10px] uppercase tracking-wider font-semibold text-amber-600/70 dark:text-amber-400/70"
                    style={{ fontFamily: 'var(--font-geist-sans)' }}
                  >
                    Pending
                  </div>
                </div>

                {/* Overdue */}
                <div className={`
                  p-3 rounded-xl text-center
                  ${isDark ? 'bg-rose-900/20' : 'bg-rose-50'}
                `}>
                  <div
                    className="text-2xl font-bold text-rose-600 dark:text-rose-400"
                    style={{ fontFamily: 'var(--font-geist-mono)' }}
                  >
                    {stats.overdue}
                  </div>
                  <div
                    className="text-[10px] uppercase tracking-wider font-semibold text-rose-600/70 dark:text-rose-400/70"
                    style={{ fontFamily: 'var(--font-geist-sans)' }}
                  >
                    Overdue
                  </div>
                </div>
              </div>
            </div>

            {/* Task Sections */}
            <div className="flex-1 overflow-y-auto p-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-6 h-6 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <>
                  <TaskSection
                    title="Overdue"
                    tasks={overdue}
                    variant="danger"
                    onTaskClick={onTaskClick}
                    onTaskToggle={onTaskToggle}
                    isDark={isDark}
                  />
                  <TaskSection
                    title="Today"
                    tasks={today}
                    variant="primary"
                    onTaskClick={onTaskClick}
                    onTaskToggle={onTaskToggle}
                    isDark={isDark}
                  />
                  <TaskSection
                    title="Upcoming"
                    tasks={upcoming}
                    variant="muted"
                    collapsed={overdue.length > 0 || today.length > 3}
                    onTaskClick={onTaskClick}
                    onTaskToggle={onTaskToggle}
                    isDark={isDark}
                  />
                  <TaskSection
                    title="Completed"
                    tasks={completed}
                    variant="success"
                    collapsed
                    onTaskClick={onTaskClick}
                    onTaskToggle={onTaskToggle}
                    isDark={isDark}
                  />

                  {/* Empty state */}
                  {tasks.length === 0 && (
                    <div className="text-center py-12">
                      <Circle className={`w-12 h-12 mx-auto mb-3 ${isDark ? 'text-zinc-700' : 'text-zinc-300'}`} />
                      <p className={`text-sm ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                        No tasks yet
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Quick Add Button */}
            <div className={`p-3 border-t ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
              <button
                onClick={onAddTask}
                className={`
                  w-full flex items-center justify-center gap-2 py-2.5 rounded-xl
                  border-2 border-dashed transition-all duration-200
                  ${isDark
                    ? 'border-zinc-700 text-zinc-400 hover:border-rose-500/50 hover:text-rose-400 hover:bg-rose-900/10'
                    : 'border-zinc-300 text-zinc-500 hover:border-rose-400 hover:text-rose-500 hover:bg-rose-50'
                  }
                `}
              >
                <Plus className="w-4 h-4" />
                <span
                  className="text-sm font-medium"
                  style={{ fontFamily: 'var(--font-geist-sans)' }}
                >
                  Add Task
                </span>
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="collapsed-content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="flex-1 flex flex-col items-center py-4 gap-4"
          >
            {/* Mini stats when collapsed */}
            <div className="flex flex-col items-center gap-3">
              <div className={`
                w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold
                ${isDark ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-100 text-emerald-600'}
              `}>
                {stats.completed}
              </div>
              <div className={`
                w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold
                ${isDark ? 'bg-amber-900/30 text-amber-400' : 'bg-amber-100 text-amber-600'}
              `}>
                {stats.pending}
              </div>
              {stats.overdue > 0 && (
                <div className={`
                  w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold
                  ${isDark ? 'bg-rose-900/30 text-rose-400' : 'bg-rose-100 text-rose-600'}
                `}>
                  {stats.overdue}
                </div>
              )}
            </div>

            {/* Collapsed Add Button */}
            <button
              onClick={onAddTask}
              className={`
                w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200
                ${isDark
                  ? 'text-zinc-500 hover:text-rose-400 hover:bg-rose-900/20'
                  : 'text-zinc-400 hover:text-rose-500 hover:bg-rose-50'
                }
              `}
              title="Add Task"
            >
              <Plus className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.aside>
  )
}
