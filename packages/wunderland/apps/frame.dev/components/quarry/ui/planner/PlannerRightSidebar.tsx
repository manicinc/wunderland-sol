/**
 * Planner Right Sidebar
 * @module components/quarry/ui/planner/PlannerRightSidebar
 *
 * @description
 * Consolidated right sidebar for the Planner page with:
 * - Grandmaster Roman numeral analog clock at top
 * - Task stats dashboard (Done/Pending/Overdue)
 * - Categorized task sections (Overdue, Today, Upcoming, Completed)
 * - Full RetroJukebox with holographic styling at bottom
 */

'use client'

import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  isToday,
  isBefore,
  startOfDay,
  addDays,
} from 'date-fns'
import {
  Clock,
  ListTodo,
  Music,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Circle,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ClockWidget } from '@/components/quarry/dashboard/widgets/ClockWidget'
import { AmbienceSection } from '@/components/quarry/ui/sidebar/AmbienceRightSidebar'
import RetroJukebox from '@/components/quarry/ui/soundscapes/RetroJukebox'
import { useTasks } from '@/lib/planner/hooks/useTasks'
import { useAmbienceSounds } from '@/lib/audio/ambienceSounds'
import type { Task } from '@/lib/planner/types'
import type { ThemeName } from '@/types/theme'
import { isDarkTheme, getThemeCategory } from '@/types/theme'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

interface PlannerRightSidebarProps {
  theme?: ThemeName
  className?: string
}

type SectionKey = 'clock' | 'tasks' | 'jukebox'

/* ═══════════════════════════════════════════════════════════════════════════
   THEME UTILITIES
═══════════════════════════════════════════════════════════════════════════ */

function getThemeColors(theme: ThemeName) {
  const category = getThemeCategory(theme)
  const isDark = isDarkTheme(theme)

  const baseColors = {
    standard: {
      accent: 'emerald',
      bg: isDark ? 'bg-zinc-900' : 'bg-white',
      cardBg: isDark ? 'bg-zinc-800/50' : 'bg-zinc-50',
      border: isDark ? 'border-zinc-800' : 'border-zinc-200',
      text: isDark ? 'text-zinc-200' : 'text-zinc-800',
      muted: isDark ? 'text-zinc-400' : 'text-zinc-500',
      subtle: isDark ? 'text-zinc-500' : 'text-zinc-400',
      accentColor: isDark ? 'text-rose-400' : 'text-rose-600',
      accentBg: isDark ? 'bg-rose-500/10' : 'bg-rose-50',
    },
    sepia: {
      accent: 'amber',
      bg: isDark ? 'bg-stone-900' : 'bg-amber-50/80',
      cardBg: isDark ? 'bg-stone-800/50' : 'bg-amber-100/50',
      border: isDark ? 'border-stone-700' : 'border-amber-200',
      text: isDark ? 'text-stone-200' : 'text-stone-800',
      muted: isDark ? 'text-stone-400' : 'text-stone-600',
      subtle: isDark ? 'text-stone-500' : 'text-stone-400',
      accentColor: isDark ? 'text-amber-400' : 'text-amber-600',
      accentBg: isDark ? 'bg-amber-500/10' : 'bg-amber-100',
    },
    terminal: {
      accent: 'green',
      bg: isDark ? 'bg-black' : 'bg-green-50/30',
      cardBg: isDark ? 'bg-zinc-900/50' : 'bg-green-100/50',
      border: isDark ? 'border-green-900/50' : 'border-green-200',
      text: isDark ? 'text-green-100' : 'text-green-900',
      muted: isDark ? 'text-green-400' : 'text-green-600',
      subtle: isDark ? 'text-green-600' : 'text-green-500',
      accentColor: isDark ? 'text-green-400' : 'text-green-600',
      accentBg: isDark ? 'bg-green-500/10' : 'bg-green-100',
    },
    oceanic: {
      accent: 'cyan',
      bg: isDark ? 'bg-slate-900' : 'bg-cyan-50/30',
      cardBg: isDark ? 'bg-slate-800/50' : 'bg-cyan-100/50',
      border: isDark ? 'border-slate-700' : 'border-cyan-200',
      text: isDark ? 'text-slate-200' : 'text-slate-800',
      muted: isDark ? 'text-slate-400' : 'text-slate-600',
      subtle: isDark ? 'text-slate-500' : 'text-slate-400',
      accentColor: isDark ? 'text-cyan-400' : 'text-cyan-600',
      accentBg: isDark ? 'bg-cyan-500/10' : 'bg-cyan-100',
    },
  }

  return baseColors[category]
}

/* ═══════════════════════════════════════════════════════════════════════════
   COLLAPSIBLE SECTION
═══════════════════════════════════════════════════════════════════════════ */

interface CollapsibleSectionProps {
  icon: LucideIcon
  label: string
  colors: ReturnType<typeof getThemeColors>
  isExpanded: boolean
  onToggle: () => void
  children: React.ReactNode
  badge?: string | number
  noPadding?: boolean
}

function CollapsibleSection({
  icon: Icon,
  label,
  colors,
  isExpanded,
  onToggle,
  children,
  badge,
  noPadding = false,
}: CollapsibleSectionProps) {
  return (
    <div className={cn('border-b', colors.border)}>
      <button
        onClick={onToggle}
        className={cn(
          'w-full flex items-center justify-between px-3 py-2 transition-colors',
          'hover:bg-black/5 dark:hover:bg-white/5'
        )}
      >
        <div className="flex items-center gap-2">
          <Icon className={cn('w-3.5 h-3.5', colors.muted)} />
          <span className={cn('text-xs font-medium', colors.text)}>{label}</span>
          {badge !== undefined && (
            <span className={cn(
              'text-[10px] px-1.5 py-0.5 rounded-full font-medium',
              colors.accentBg,
              colors.accentColor
            )}>
              {badge}
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className={cn('w-3.5 h-3.5', colors.subtle)} />
        ) : (
          <ChevronDown className={cn('w-3.5 h-3.5', colors.subtle)} />
        )}
      </button>
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className={noPadding ? '' : 'px-2 pb-2'}>
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   TASK SECTION (Overdue, Today, Upcoming, Completed)
═══════════════════════════════════════════════════════════════════════════ */

const PRIORITY_COLORS: Record<string, string> = {
  low: 'border-emerald-400 dark:border-emerald-500',
  medium: 'border-amber-400 dark:border-amber-500',
  high: 'border-orange-400 dark:border-orange-500',
  urgent: 'border-rose-500 dark:border-rose-500',
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
    icon: CheckCircle2,
    iconColor: 'text-emerald-500',
  },
}

interface TaskCategoryProps {
  title: string
  tasks: Task[]
  variant: 'danger' | 'primary' | 'muted' | 'success'
  defaultCollapsed?: boolean
  onTaskToggle: (taskId: string) => void
  isDark: boolean
}

function TaskCategory({
  title,
  tasks,
  variant,
  defaultCollapsed = false,
  onTaskToggle,
  isDark,
}: TaskCategoryProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed)
  const config = sectionVariants[variant]
  const Icon = config.icon

  if (!tasks || tasks.length === 0) return null

  return (
    <div className="mb-2">
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className={cn(
          'w-full flex items-center gap-1.5 px-2 py-1.5 rounded-md mb-1 transition-colors',
          config.headerBg,
          config.headerText
        )}
      >
        <Icon className={cn('w-3 h-3', config.iconColor)} />
        <span className="text-[10px] font-semibold uppercase tracking-wider flex-1 text-left">
          {title}
        </span>
        <span className="text-[10px] font-bold">{tasks.length}</span>
        {isCollapsed ? (
          <ChevronRight className="w-3 h-3" />
        ) : (
          <ChevronDown className="w-3 h-3" />
        )}
      </button>

      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="space-y-1 overflow-hidden"
          >
            {tasks.map((task) => {
              const isCompleted = task.status === 'completed'
              return (
                <div
                  key={task.id}
                  onClick={() => onTaskToggle(task.id)}
                  className={cn(
                    'flex items-start gap-2 p-1.5 rounded-md cursor-pointer transition-colors',
                    isDark ? 'hover:bg-zinc-800/50' : 'hover:bg-zinc-100'
                  )}
                >
                  <div className={cn(
                    'flex-shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center mt-0.5',
                    isCompleted ? 'bg-emerald-500 border-emerald-500' : PRIORITY_COLORS[task.priority]
                  )}>
                    {isCompleted && <CheckCircle2 className="w-2.5 h-2.5 text-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      'text-xs leading-tight truncate',
                      isCompleted ? 'line-through text-zinc-400 dark:text-zinc-500' : isDark ? 'text-zinc-200' : 'text-zinc-800'
                    )}>
                      {task.title}
                    </p>
                    {task.dueTime && (
                      <p className={cn('text-[10px]', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
                        {task.dueTime}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   FULL TASKS WIDGET WITH STATS
═══════════════════════════════════════════════════════════════════════════ */

function FullTasksWidget({ colors, isDark }: { colors: ReturnType<typeof getThemeColors>; isDark: boolean }) {
  const { tasks, isLoading, toggleComplete } = useTasks({ includeCompleted: true })

  // Categorize tasks
  const { overdue, today, upcoming, completed, stats } = useMemo(() => {
    const now = new Date()
    const todayStart = startOfDay(now)
    const weekEnd = addDays(todayStart, 7)

    const overdueTasks: Task[] = []
    const todayTasks: Task[] = []
    const upcomingTasks: Task[] = []
    const completedTasks: Task[] = []

    let pendingCount = 0
    let overdueCount = 0
    let completedCount = 0

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

    // Sort by time
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
      completed: completedTasks.slice(0, 5),
      stats: { pending: pendingCount, overdue: overdueCount, completed: completedCount },
    }
  }, [tasks])

  if (isLoading) {
    return (
      <div className={cn('flex items-center justify-center py-6', colors.subtle)}>
        <div className="w-4 h-4 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {/* Stats Dashboard - Compact */}
      <div className="grid grid-cols-3 gap-1.5 mb-3">
        <div className={cn('p-2 rounded-lg text-center', isDark ? 'bg-emerald-900/20' : 'bg-emerald-50')}>
          <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{stats.completed}</div>
          <div className="text-[9px] uppercase tracking-wider font-medium text-emerald-600/70 dark:text-emerald-400/70">Done</div>
        </div>
        <div className={cn('p-2 rounded-lg text-center', isDark ? 'bg-amber-900/20' : 'bg-amber-50')}>
          <div className="text-lg font-bold text-amber-600 dark:text-amber-400">{stats.pending}</div>
          <div className="text-[9px] uppercase tracking-wider font-medium text-amber-600/70 dark:text-amber-400/70">Pending</div>
        </div>
        <div className={cn('p-2 rounded-lg text-center', isDark ? 'bg-rose-900/20' : 'bg-rose-50')}>
          <div className="text-lg font-bold text-rose-600 dark:text-rose-400">{stats.overdue}</div>
          <div className="text-[9px] uppercase tracking-wider font-medium text-rose-600/70 dark:text-rose-400/70">Overdue</div>
        </div>
      </div>

      {/* Task Categories */}
      <div className="max-h-[300px] overflow-y-auto">
        <TaskCategory
          title="Overdue"
          tasks={overdue}
          variant="danger"
          onTaskToggle={toggleComplete}
          isDark={isDark}
        />
        <TaskCategory
          title="Today"
          tasks={today}
          variant="primary"
          onTaskToggle={toggleComplete}
          isDark={isDark}
        />
        <TaskCategory
          title="Upcoming"
          tasks={upcoming}
          variant="muted"
          defaultCollapsed={overdue.length > 0 || today.length > 3}
          onTaskToggle={toggleComplete}
          isDark={isDark}
        />
        <TaskCategory
          title="Completed"
          tasks={completed}
          variant="success"
          defaultCollapsed
          onTaskToggle={toggleComplete}
          isDark={isDark}
        />
      </div>

      {/* Empty state */}
      {tasks.length === 0 && (
        <div className={cn('text-center py-4', colors.subtle)}>
          <Circle className="w-6 h-6 mx-auto mb-1 opacity-50" />
          <p className="text-xs">No tasks yet</p>
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

export default function PlannerRightSidebar({
  theme = 'dark',
  className,
}: PlannerRightSidebarProps) {
  const isDark = isDarkTheme(theme)
  const colors = getThemeColors(theme)

  // Section expanded states
  const [expandedSections, setExpandedSections] = useState<Record<SectionKey, boolean>>({
    clock: true,
    tasks: true,
    jukebox: true,
  })

  // Ambience sounds hook - only need isPlaying for the badge indicator
  const { isPlaying } = useAmbienceSounds()

  const toggleSection = (key: SectionKey) => {
    setExpandedSections((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  return (
    <div className={cn('flex flex-col h-full overflow-y-auto', className)}>
      {/* Clock Section - Grandmaster Roman Numeral Style */}
      <CollapsibleSection
        icon={Clock}
        label="Clock"
        colors={colors}
        isExpanded={expandedSections.clock}
        onToggle={() => toggleSection('clock')}
      >
        <div className="flex justify-center py-2">
          <ClockWidget
            theme={theme}
            size="medium"
            compact={false}
            onNavigate={() => {}} // ClockWidget doesn't use navigation
          />
        </div>
      </CollapsibleSection>

      {/* Tasks Section - Main content */}
      <CollapsibleSection
        icon={ListTodo}
        label="Tasks"
        colors={colors}
        isExpanded={expandedSections.tasks}
        onToggle={() => toggleSection('tasks')}
      >
        <FullTasksWidget colors={colors} isDark={isDark} />
      </CollapsibleSection>

      {/* Jukebox Section - Full controls with jukebox, visualization, and mic */}
      <CollapsibleSection
        icon={Music}
        label="Ambience"
        colors={colors}
        isExpanded={expandedSections.jukebox}
        onToggle={() => toggleSection('jukebox')}
        badge={isPlaying ? '●' : undefined}
      >
        <AmbienceSection theme={theme} />
      </CollapsibleSection>

      {/* Spacer - fills remaining space */}
      <div className="flex-1 min-h-[10px]" />
    </div>
  )
}
