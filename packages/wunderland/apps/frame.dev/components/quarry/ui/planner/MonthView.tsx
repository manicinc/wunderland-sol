'use client'

/**
 * Month View Component
 *
 * Enhanced calendar grid with event previews and task indicators
 * @module components/quarry/ui/planner/MonthView
 */

import { useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import { CalendarEvent, Task } from '@/lib/planner/types'
import { ChevronLeft, ChevronRight, MoreHorizontal, Sparkles } from 'lucide-react'
import { TodayIcon } from '@/lib/planner/icons/PlannerIcons'
import {
  getHolidaysForDate,
  getHolidayColor,
  DEFAULT_HOLIDAY_SETTINGS,
  type Holiday,
  type HolidaySettings,
} from '@/lib/planner/holidays'

interface MonthViewProps {
  date: Date
  events: CalendarEvent[]
  tasks: Task[]
  selectedDates?: Date[]
  onDateChange: (date: Date) => void
  onDayClick?: (date: Date) => void
  onDayDoubleClick?: (date: Date) => void // Go to day view
  onEventClick?: (event: CalendarEvent) => void
  onTaskClick?: (task: Task) => void
  className?: string
}

// Color classes for events
const EVENT_COLORS: Record<string, string> = {
  default: 'bg-emerald-500',
  blue: 'bg-blue-500',
  purple: 'bg-purple-500',
  pink: 'bg-pink-500',
  orange: 'bg-orange-500',
  red: 'bg-red-500',
  yellow: 'bg-yellow-500',
  teal: 'bg-teal-500',
}

// Priority colors for task dots
const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-green-400',
  medium: 'bg-yellow-400',
  high: 'bg-orange-400',
  urgent: 'bg-red-400',
}

export function MonthView({
  date,
  events,
  tasks,
  selectedDates = [],
  onDateChange,
  onDayClick,
  onDayDoubleClick,
  onEventClick,
  onTaskClick,
  className,
}: MonthViewProps) {
  const today = new Date()

  // Calculate month calendar grid
  const calendarDays = useMemo(() => {
    const year = date.getFullYear()
    const month = date.getMonth()

    // First day of the month
    const firstDay = new Date(year, month, 1)
    const firstDayOfWeek = firstDay.getDay()

    // Last day of the month
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()

    // Previous month days to show
    const prevMonthLastDay = new Date(year, month, 0).getDate()

    const days: Array<{ date: Date; isCurrentMonth: boolean }> = []

    // Previous month days
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, prevMonthLastDay - i),
        isCurrentMonth: false,
      })
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        date: new Date(year, month, i),
        isCurrentMonth: true,
      })
    }

    // Next month days to fill 6 rows
    const remainingDays = 42 - days.length // 6 rows x 7 days
    for (let i = 1; i <= remainingDays; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false,
      })
    }

    return days
  }, [date])

  // Group events and tasks by date (with null safety)
  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>()

    // Guard against undefined events
    if (!events || !Array.isArray(events)) return map

    events.forEach((event) => {
      const eventStart = new Date(event.startDatetime)
      const eventEnd = new Date(event.endDatetime)

      // For multi-day events, add to each day
      const current = new Date(eventStart)
      while (current <= eventEnd) {
        const dateStr = current.toISOString().split('T')[0]
        if (!map.has(dateStr)) map.set(dateStr, [])
        map.get(dateStr)!.push(event)
        current.setDate(current.getDate() + 1)
      }
    })

    return map
  }, [events])

  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>()

    // Guard against undefined tasks
    if (!tasks || !Array.isArray(tasks)) return map

    tasks.forEach((task) => {
      if (!task.dueDate) return
      if (!map.has(task.dueDate)) map.set(task.dueDate, [])
      map.get(task.dueDate)!.push(task)
    })

    return map
  }, [tasks])

  // Holiday settings from localStorage with validation
  const holidaySettings = useMemo<HolidaySettings>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('holidaySettings')
      if (stored) {
        try {
          const parsed = JSON.parse(stored)
          // Validate the parsed object has the required structure
          if (
            parsed &&
            typeof parsed === 'object' &&
            typeof parsed.country === 'string' &&
            typeof parsed.showFederal === 'boolean' &&
            typeof parsed.showObservances === 'boolean' &&
            typeof parsed.showReligious === 'boolean' &&
            typeof parsed.showCultural === 'boolean'
          ) {
            return parsed as HolidaySettings
          }
        } catch {
          // Fall through to default
        }
      }
    }
    return DEFAULT_HOLIDAY_SETTINGS
  }, [])

  // Get holidays for each day in the calendar
  const holidaysByDate = useMemo(() => {
    const map = new Map<string, Holiday[]>()
    calendarDays.forEach(({ date: d }) => {
      const dateStr = d.toISOString().split('T')[0]
      map.set(dateStr, getHolidaysForDate(d, holidaySettings))
    })
    return map
  }, [calendarDays, holidaySettings])

  // Navigation
  const goToPrevMonth = () => {
    const prev = new Date(date)
    prev.setMonth(prev.getMonth() - 1)
    onDateChange(prev)
  }

  const goToNextMonth = () => {
    const next = new Date(date)
    next.setMonth(next.getMonth() + 1)
    onDateChange(next)
  }

  const goToToday = () => {
    onDateChange(new Date())
  }

  // Check if today is in this month
  const isTodayInMonth =
    today.getFullYear() === date.getFullYear() &&
    today.getMonth() === date.getMonth()

  // Format month for header
  const monthLabel = date.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })

  // Check if date is selected
  const isDateSelected = (d: Date) => {
    return selectedDates.some(
      (sd) =>
        sd.getFullYear() === d.getFullYear() &&
        sd.getMonth() === d.getMonth() &&
        sd.getDate() === d.getDate()
    )
  }

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Month Header */}
      <div
        className={cn(
          'flex items-center justify-between px-4 py-3',
          'border-b border-stone-200 dark:border-stone-700',
          'bg-white dark:bg-stone-900'
        )}
      >
        <div className="flex items-center gap-3">
          {/* Navigation */}
          <div className="flex items-center gap-1">
            <button
              onClick={goToPrevMonth}
              className={cn(
                'p-1.5 rounded-md',
                'hover:bg-stone-100 dark:hover:bg-stone-800',
                'text-stone-600 dark:text-stone-400',
                'transition-colors'
              )}
              aria-label="Previous month"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={goToNextMonth}
              className={cn(
                'p-1.5 rounded-md',
                'hover:bg-stone-100 dark:hover:bg-stone-800',
                'text-stone-600 dark:text-stone-400',
                'transition-colors'
              )}
              aria-label="Next month"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Month label */}
          <h2
            className={cn(
              'text-lg font-fraunces font-semibold',
              'text-stone-900 dark:text-stone-100'
            )}
          >
            {monthLabel}
          </h2>
        </div>

        {/* Today button */}
        {!isTodayInMonth && (
          <button
            onClick={goToToday}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md',
              'text-sm font-medium',
              'bg-stone-100 dark:bg-stone-800',
              'text-stone-700 dark:text-stone-300',
              'hover:bg-stone-200 dark:hover:bg-stone-700',
              'transition-colors'
            )}
          >
            <TodayIcon size={16} />
            Today
          </button>
        )}
      </div>

      {/* Day of week headers */}
      <div className="grid grid-cols-7 border-b border-stone-200 dark:border-stone-700">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div
            key={day}
            className={cn(
              'py-2 text-center text-xs font-medium',
              'text-stone-500 dark:text-stone-400',
              'bg-stone-50 dark:bg-stone-800/50'
            )}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="flex-1 grid grid-cols-7 grid-rows-6 overflow-hidden">
        {calendarDays.map(({ date: cellDate, isCurrentMonth }, i) => {
          const dateStr = cellDate.toISOString().split('T')[0]
          const cellEvents = eventsByDate.get(dateStr) || []
          const cellTasks = tasksByDate.get(dateStr) || []

          const isToday =
            cellDate.getFullYear() === today.getFullYear() &&
            cellDate.getMonth() === today.getMonth() &&
            cellDate.getDate() === today.getDate()

          const isSelected = isDateSelected(cellDate)

          const cellHolidays = holidaysByDate.get(dateStr) || []

          return (
            <MonthDayCell
              key={i}
              date={cellDate}
              isCurrentMonth={isCurrentMonth}
              isToday={isToday}
              isSelected={isSelected}
              events={cellEvents}
              tasks={cellTasks}
              holidays={cellHolidays}
              onClick={() => onDayClick?.(cellDate)}
              onDoubleClick={() => onDayDoubleClick?.(cellDate)}
              onEventClick={onEventClick}
              onTaskClick={onTaskClick}
            />
          )
        })}
      </div>
    </div>
  )
}

/**
 * Individual day cell in the month grid
 */
interface MonthDayCellProps {
  date: Date
  isCurrentMonth: boolean
  isToday: boolean
  isSelected: boolean
  events: CalendarEvent[]
  tasks: Task[]
  holidays: Holiday[]
  onClick?: () => void
  onDoubleClick?: () => void
  onEventClick?: (event: CalendarEvent) => void
  onTaskClick?: (task: Task) => void
}

function MonthDayCell({
  date,
  isCurrentMonth,
  isToday,
  isSelected,
  events,
  tasks,
  holidays,
  onClick,
  onDoubleClick,
  onEventClick,
  onTaskClick,
}: MonthDayCellProps) {
  const [showMore, setShowMore] = useState(false)

  // Max visible items (events + indication of tasks)
  const safeEvents = events ?? []
  const safeTasks = tasks ?? []
  const maxVisible = (holidays?.length ?? 0) > 0 ? 2 : 3
  const visibleEvents = safeEvents.slice(0, maxVisible)
  const hiddenCount = safeEvents.length - maxVisible
  const incompleteTasks = safeTasks.filter((t) => t.status !== 'completed')

  return (
    <div
      className={cn(
        'min-h-[100px] p-1 relative',
        'border-r border-b border-stone-200 dark:border-stone-700',
        'last:border-r-0',
        'hover:bg-stone-50 dark:hover:bg-stone-800/30',
        'transition-colors cursor-pointer',
        !isCurrentMonth && 'bg-stone-50/50 dark:bg-stone-800/20'
      )}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
    >
      {/* Date number */}
      <div className="flex items-center justify-between mb-1">
        <span
          className={cn(
            'w-7 h-7 flex items-center justify-center rounded-full',
            'text-sm font-medium',
            isToday && 'bg-emerald-500 text-white',
            isSelected && !isToday && 'bg-emerald-100 dark:bg-emerald-900/40',
            !isToday &&
              !isSelected &&
              (isCurrentMonth
                ? 'text-stone-700 dark:text-stone-200'
                : 'text-stone-400 dark:text-stone-500')
          )}
        >
          {date.getDate()}
        </span>

        {/* Task count indicator */}
        {incompleteTasks.length > 0 && (
          <div
            className={cn(
              'flex items-center gap-0.5 px-1.5 py-0.5 rounded-full',
              'bg-stone-100 dark:bg-stone-700/50',
              'text-[10px] font-medium text-stone-600 dark:text-stone-300'
            )}
          >
            {incompleteTasks.length}
          </div>
        )}
      </div>

      {/* Holiday badges */}
      {holidays && holidays.length > 0 && (
        <div className="space-y-0.5 mb-0.5">
          {holidays.slice(0, 1).map((holiday, idx) => {
            const colors = getHolidayColor(holiday.type)
            return (
              <div
                key={idx}
                className={cn(
                  'w-full px-1 py-0.5 rounded',
                  'text-[10px] font-medium truncate',
                  'flex items-center gap-0.5',
                  colors.bg,
                  colors.text
                )}
                title={holiday.name}
              >
                <Sparkles size={10} className="flex-shrink-0" />
                <span className="truncate">{holiday.name}</span>
              </div>
            )
          })}
        </div>
      )}

      {/* Event previews */}
      <div className="space-y-0.5">
        {visibleEvents.map((event) => (
          <button
            key={event.id}
            onClick={(e) => {
              e.stopPropagation()
              onEventClick?.(event)
            }}
            className={cn(
              'w-full px-1 py-0.5 rounded text-left',
              'text-[10px] font-medium truncate text-white',
              'transition-opacity hover:opacity-80',
              EVENT_COLORS[event.color || 'default'] || EVENT_COLORS.default
            )}
          >
            {event.allDay ? event.title : `${formatTime(event.startDatetime)} ${event.title}`}
          </button>
        ))}

        {/* More events indicator */}
        {hiddenCount > 0 && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              setShowMore(true)
            }}
            className={cn(
              'w-full px-1 py-0.5 rounded text-left',
              'text-[10px] font-medium',
              'text-stone-500 dark:text-stone-400',
              'hover:bg-stone-100 dark:hover:bg-stone-700/50',
              'flex items-center gap-0.5'
            )}
          >
            <MoreHorizontal size={10} />+{hiddenCount} more
          </button>
        )}
      </div>

      {/* Task priority dots */}
      {incompleteTasks.length > 0 && (
        <div className="absolute bottom-1 left-1 right-1 flex gap-0.5 flex-wrap">
          {incompleteTasks.slice(0, 5).map((task) => (
            <div
              key={task.id}
              className={cn(
                'w-1.5 h-1.5 rounded-full',
                PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.medium
              )}
              title={task.title}
            />
          ))}
          {incompleteTasks.length > 5 && (
            <span className="text-[8px] text-stone-400">
              +{incompleteTasks.length - 5}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

function formatTime(datetime: string): string {
  const date = new Date(datetime)
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

export default MonthView
