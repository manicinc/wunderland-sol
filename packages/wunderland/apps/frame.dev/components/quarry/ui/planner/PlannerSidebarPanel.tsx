'use client'

/**
 * PlannerSidebarPanel Component
 *
 * Left sidebar panel for planner mode showing actionable items:
 * - Daily notes widget
 * - Daily check-in widget
 * - Mini calendar with event indicators
 * - Today's focus with tasks and events
 * - Quick add functionality with full task editor
 * - Task stats and mood analytics
 *
 * Note: Clock & Ambience moved to right sidebar only.
 *
 * @module components/quarry/ui/PlannerSidebarPanel
 */

import { useState, useMemo, useCallback } from 'react'
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  isToday,
  addMonths,
  subMonths,
} from 'date-fns'
import {
  ChevronLeft,
  ChevronRight,
  ListTodo,
  Plus,
  Circle,
  CheckCircle2,
  Play,
  Sparkles,
  FileText,
  Loader2,
} from 'lucide-react'
import { AnimatePresence } from 'framer-motion'
import { useTasks } from '@/lib/planner/hooks/useTasks'
import { useStrandTags } from '@/lib/planner/useStrandTags'
import { importTasksFromStrand } from '@/lib/planner/importFromStrand'
import {
  getHolidaysForDate,
  getHolidayColor,
  DEFAULT_HOLIDAY_SETTINGS,
  type HolidaySettings,
  type Holiday,
} from '@/lib/planner/holidays'
import type { Task, CreateTaskInput, UpdateTaskInput } from '@/lib/planner/types'
import InlineTaskEditor from './InlineTaskEditor'
import DailyNoteWidget from '../widgets/DailyNoteWidget'
import DailyCheckInWidget from '../widgets/DailyCheckInWidget'
import MoodSleepAnalytics from '../mood/MoodSleepAnalytics'

interface PlannerSidebarPanelProps {
  theme?: string
  onNavigateToStrand?: (path: string) => void
  className?: string
}

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

const PRIORITY_COLORS = {
  low: 'text-green-500',
  medium: 'text-yellow-500',
  high: 'text-orange-500',
  urgent: 'text-red-500',
}

const STATUS_COLORS = {
  pending: 'text-zinc-400',
  in_progress: 'text-blue-500',
  completed: 'text-emerald-500',
  cancelled: 'text-zinc-400',
}

export default function PlannerSidebarPanel({
  theme = 'light',
  onNavigateToStrand,
  className = '',
}: PlannerSidebarPanelProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)

  // Database hooks
  const { tasks, isLoading, createTask, updateTask, deleteTask, toggleComplete, stats } = useTasks({
    includeCompleted: true,
  })
  const { tags: availableTags } = useStrandTags()

  // Holiday settings from localStorage
  const holidaySettings = useMemo<HolidaySettings>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('holidaySettings')
      if (stored) {
        try {
          return JSON.parse(stored)
        } catch {
          return DEFAULT_HOLIDAY_SETTINGS
        }
      }
    }
    return DEFAULT_HOLIDAY_SETTINGS
  }, [])

  const isDark = theme.includes('dark')
  const isTerminal = theme.includes('terminal')
  const isSepia = theme.includes('sepia')
  const isOceanic = theme.includes('oceanic')

  // Theme accent colors
  const accentColor = isOceanic
    ? 'text-cyan-500'
    : isTerminal
      ? 'text-green-500'
      : 'text-rose-500'

  const accentBg = isOceanic
    ? 'bg-cyan-500'
    : isTerminal
      ? 'bg-green-500'
      : 'bg-rose-500'

  const accentBgLight = isOceanic
    ? 'bg-cyan-500/20'
    : isTerminal
      ? 'bg-green-500/20'
      : 'bg-rose-500/20'

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(currentDate)
    const calendarStart = startOfWeek(monthStart)
    const calendarEnd = endOfWeek(monthEnd)

    return eachDayOfInterval({ start: calendarStart, end: calendarEnd })
  }, [currentDate])

  // Navigate months
  const goToPrevMonth = useCallback(() => {
    setCurrentDate((d) => subMonths(d, 1))
  }, [])

  const goToNextMonth = useCallback(() => {
    setCurrentDate((d) => addMonths(d, 1))
  }, [])

  const goToToday = useCallback(() => {
    setCurrentDate(new Date())
    setSelectedDate(new Date())
  }, [])

  // Handle task save (create or update)
  const handleSaveTask = useCallback(async (input: CreateTaskInput | UpdateTaskInput) => {
    if (editingTask) {
      await updateTask(editingTask.id, input as UpdateTaskInput)
      setEditingTask(null)
    } else {
      await createTask({
        ...input,
        dueDate: input.dueDate || format(selectedDate, 'yyyy-MM-dd'),
      } as CreateTaskInput)
      setShowQuickAdd(false)
    }
  }, [editingTask, updateTask, createTask, selectedDate])

  // Handle task delete
  const handleDeleteTask = useCallback(async (taskId: string) => {
    await deleteTask(taskId)
    setEditingTask(null)
  }, [deleteTask])

  // Handle import from strand
  const handleImportFromStrand = useCallback(async (strandPath: string) => {
    const result = await importTasksFromStrand(strandPath, {
      uncheckedOnly: true,
      defaultDueDate: format(selectedDate, 'yyyy-MM-dd'),
    })

    if (result.imported > 0) {
      // Refresh tasks to show newly imported ones
      // The useTasks hook should auto-refresh, but we can force it
      console.log(`[Planner] Imported ${result.imported} tasks from ${strandPath}`)
    }

    if (result.errors.length > 0) {
      console.warn('[Planner] Import errors:', result.errors)
    }
  }, [selectedDate])

  // Handle task click - toggle or edit
  const handleTaskClick = useCallback((task: Task, e: React.MouseEvent) => {
    if (e.shiftKey) {
      // Shift+click to edit
      setEditingTask(task)
    } else {
      // Regular click to toggle
      toggleComplete(task.id)
    }
  }, [toggleComplete])

  // Filter today's tasks
  const todaysTasks = useMemo(() => {
    if (!tasks || !Array.isArray(tasks)) return []
    const todayStr = format(new Date(), 'yyyy-MM-dd')
    return tasks.filter((t) => t.dueDate === todayStr)
  }, [tasks])

  // Get tasks for a specific day (for calendar dots)
  const getTasksForDay = useCallback((day: Date) => {
    if (!tasks || !Array.isArray(tasks)) return []
    const dayStr = format(day, 'yyyy-MM-dd')
    return tasks.filter((t) => t.dueDate === dayStr)
  }, [tasks])

  // Get holidays for a specific day
  const getHolidaysForDay = useCallback((day: Date): Holiday[] => {
    return getHolidaysForDate(day, holidaySettings)
  }, [holidaySettings])

  // Get today's holidays
  const todaysHolidays = useMemo(() => {
    return getHolidaysForDate(new Date(), holidaySettings)
  }, [holidaySettings])

  // Status icon component
  const StatusIcon = ({ status }: { status: Task['status'] }) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-emerald-500" />
      case 'in_progress':
        return <Play className="w-4 h-4 text-blue-500" />
      default:
        return <Circle className="w-4 h-4" />
    }
  }

  return (
    <div className={`flex flex-col h-full ${className}`}>

      {/* Daily Notes Widget */}
      <div className={`p-3 border-b ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
        <DailyNoteWidget
          theme={isDark ? 'dark' : 'light'}
          onNavigate={(path, isNew, template) => {
            if (onNavigateToStrand) {
              onNavigateToStrand(path)
            }
          }}
          compact
        />
      </div>

      {/* Daily Check-In Widget */}
      <div className={`p-3 border-b ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
        <DailyCheckInWidget
          theme={isDark ? 'dark' : 'light'}
          compact
        />
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* Mini Calendar */}
        <div className={`p-3 border-b ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={goToPrevMonth}
              className={`p-1 rounded ${isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100'}`}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2">
              <span className={`text-sm font-medium ${isDark ? 'text-zinc-200' : 'text-zinc-700'} ${isSepia ? 'font-serif' : ''}`}>
                {format(currentDate, 'MMMM yyyy')}
              </span>
              <button
                onClick={goToToday}
                className={`text-[10px] px-1.5 py-0.5 rounded ${accentBgLight} ${accentColor}`}
              >
                Today
              </button>
            </div>
            <button
              onClick={goToNextMonth}
              className={`p-1 rounded ${isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100'}`}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-0.5 mb-1">
            {WEEKDAYS.map((day) => (
              <div
                key={day}
                className={`text-center text-[10px] font-medium py-0.5 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-0.5">
            {calendarDays.map((day) => {
              const isCurrentMonth = isSameMonth(day, currentDate)
              const isTodayDate = isToday(day)
              const isSelected = isSameDay(day, selectedDate)
              const dayTasks = getTasksForDay(day)
              const dayHolidays = getHolidaysForDay(day)
              const hasEvents = dayTasks.length > 0
              const hasHoliday = dayHolidays.length > 0
              const hasOverdue = dayTasks.some((t) => t.status === 'pending' && new Date(t.dueDate!) < new Date())
              const holidayColor = hasHoliday ? getHolidayColor(dayHolidays[0].type) : null

              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelectedDate(day)}
                  title={hasHoliday ? dayHolidays.map(h => h.name).join(', ') : undefined}
                  className={`
                    aspect-square flex flex-col items-center justify-center text-xs rounded transition-colors relative
                    ${isCurrentMonth ? '' : 'opacity-40'}
                    ${isSelected ? `${accentBg} text-white` : isTodayDate ? accentBgLight : ''}
                    ${!isSelected && (isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100')}
                  `}
                >
                  <span className={isSepia && !isSelected ? 'font-serif' : ''}>{format(day, 'd')}</span>
                  {(hasEvents || hasHoliday) && !isSelected && (
                    <div className="flex gap-0.5 mt-0.5">
                      {hasHoliday && (
                        <span className={`w-1 h-1 rounded-full ${holidayColor?.text.replace('text-', 'bg-')}`} />
                      )}
                      {hasEvents && (
                        <span className={`w-1 h-1 rounded-full ${hasOverdue ? 'bg-rose-500' : accentBg}`} />
                      )}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Today's Focus */}
        <div className="p-3">
          <div className="flex items-center justify-between mb-3">
            <h3 className={`text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
              <Sparkles className="w-3 h-3" />
              Today&apos;s Focus
            </h3>
            <button
              onClick={() => setShowQuickAdd(true)}
              className={`p-1 rounded-md transition-colors ${isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100'} ${accentColor}`}
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Today's Holidays */}
          {todaysHolidays.length > 0 && (
            <div className="mb-3 space-y-1">
              {todaysHolidays.map((holiday) => {
                const colors = getHolidayColor(holiday.type)
                return (
                  <div
                    key={holiday.name}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded-lg ${colors.bg} ${isDark ? 'bg-opacity-20' : ''}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${colors.text.replace('text-', 'bg-')}`} />
                    <span className={`text-xs font-medium ${colors.text}`}>
                      {holiday.name}
                    </span>
                    <span className={`text-[10px] ml-auto ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                      {holiday.type}
                    </span>
                  </div>
                )
              })}
            </div>
          )}

          {/* Quick Add / Edit Task - Using InlineTaskEditor */}
          <AnimatePresence>
            {(showQuickAdd || editingTask) && (
              <div className="mb-3">
                <InlineTaskEditor
                  task={editingTask}
                  initialDate={selectedDate}
                  availableTags={availableTags}
                  onSave={handleSaveTask}
                  onCancel={() => {
                    setShowQuickAdd(false)
                    setEditingTask(null)
                  }}
                  onDelete={editingTask ? handleDeleteTask : undefined}
                  onNavigateToStrand={onNavigateToStrand}
                  onImportFromStrand={handleImportFromStrand}
                  theme={theme}
                  showStatusButtons={true}
                />
              </div>
            )}
          </AnimatePresence>

          {/* Loading state */}
          {isLoading && (
            <div className={`flex items-center justify-center py-4 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          )}

          {/* Tasks list */}
          {!isLoading && todaysTasks.length > 0 ? (
            <div className="space-y-1">
              {todaysTasks.map((task) => (
                <div
                  key={task.id}
                  onClick={(e) => handleTaskClick(task, e)}
                  className={`
                    flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors group
                    ${task.status === 'completed' ? 'opacity-60' : ''}
                    ${isDark ? 'hover:bg-zinc-800/50' : 'hover:bg-zinc-50'}
                  `}
                  title="Click to toggle, Shift+Click to edit"
                >
                  <StatusIcon status={task.status} />
                  <div className="flex-1 min-w-0">
                    <span
                      className={`text-xs block truncate ${
                        task.status === 'completed' ? 'line-through' : ''
                      } ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}
                    >
                      {task.title}
                    </span>
                    {task.strandPath && (
                      <span className={`text-[10px] flex items-center gap-1 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                        <FileText className="w-2.5 h-2.5" />
                        {task.strandPath.split('/').pop()}
                      </span>
                    )}
                  </div>
                  {task.tags && task.tags.length > 0 && (
                    <div className="flex gap-0.5">
                      {task.tags.slice(0, 2).map((tag) => (
                        <span
                          key={tag}
                          className={`text-[9px] px-1 py-0.5 rounded ${isDark ? 'bg-zinc-700 text-zinc-400' : 'bg-zinc-200 text-zinc-500'}`}
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : !isLoading ? (
            <div className={`text-center py-4 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
              <ListTodo className="w-6 h-6 mx-auto mb-1 opacity-50" />
              <p className="text-xs">No tasks for today</p>
              <p className="text-[10px] mt-0.5">Click + to add one</p>
            </div>
          ) : null}
        </div>

        {/* Stats */}
        <div className={`px-3 pb-3`}>
          <div className={`flex items-center justify-around p-2 rounded-lg ${isDark ? 'bg-zinc-800/50' : 'bg-zinc-50'}`}>
            <div className="text-center">
              <div className={`text-sm font-semibold ${isDark ? 'text-zinc-200' : 'text-zinc-700'}`}>
                {stats.pending}
              </div>
              <div className={`text-[10px] ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>Pending</div>
            </div>
            <div className={`w-px h-8 ${isDark ? 'bg-zinc-700' : 'bg-zinc-200'}`} />
            <div className="text-center">
              <div className="text-sm font-semibold text-blue-500">
                {stats.inProgress}
              </div>
              <div className={`text-[10px] ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>Active</div>
            </div>
            <div className={`w-px h-8 ${isDark ? 'bg-zinc-700' : 'bg-zinc-200'}`} />
            <div className="text-center">
              <div className={`text-sm font-semibold text-emerald-500`}>
                {stats.completed}
              </div>
              <div className={`text-[10px] ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>Done</div>
            </div>
          </div>
        </div>

        {/* Mood & Sleep Analytics */}
        <div className="px-3 pb-3">
          <MoodSleepAnalytics
            theme={isDark ? 'dark' : 'light'}
            days={7}
            compact
          />
        </div>
      </div>

    </div>
  )
}
