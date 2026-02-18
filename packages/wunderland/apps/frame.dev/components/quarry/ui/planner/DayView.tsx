'use client'

/**
 * Day View Component
 *
 * Hour-by-hour scheduling view for a single day
 * @module components/quarry/ui/planner/DayView
 */

import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import { CalendarEvent, Task } from '@/lib/planner/types'
import { TimeGrid } from './TimeGrid'
import { AllDaySection } from './AllDaySection'
import { ChevronLeft, ChevronRight, Calendar, Sparkles } from 'lucide-react'
import { TodayIcon } from '@/lib/planner/icons/PlannerIcons'
import {
  getHolidaysForDate,
  getHolidayColor,
  DEFAULT_HOLIDAY_SETTINGS,
  type Holiday,
  type HolidaySettings,
} from '@/lib/planner/holidays'

interface DayViewProps {
  date: Date
  events: CalendarEvent[]
  tasks: Task[]
  onDateChange: (date: Date) => void
  onSlotClick?: (date: Date, hour: number, minute: number) => void
  onEventClick?: (event: CalendarEvent) => void
  onTaskClick?: (task: Task) => void
  onTaskToggle?: (taskId: string, completed: boolean) => void
  onEventDrag?: (eventId: string, newStart: Date, newEnd: Date) => void
  className?: string
}

export function DayView({
  date,
  events,
  tasks,
  onDateChange,
  onSlotClick,
  onEventClick,
  onTaskClick,
  onTaskToggle,
  onEventDrag,
  className,
}: DayViewProps) {
  // Navigate to previous day
  const goToPrevDay = () => {
    const prev = new Date(date)
    prev.setDate(prev.getDate() - 1)
    onDateChange(prev)
  }

  // Navigate to next day
  const goToNextDay = () => {
    const next = new Date(date)
    next.setDate(next.getDate() + 1)
    onDateChange(next)
  }

  // Navigate to today
  const goToToday = () => {
    onDateChange(new Date())
  }

  // Check if selected date is today
  const isToday = useMemo(() => {
    const today = new Date()
    return (
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate()
    )
  }, [date])

  // Format date for display
  const formattedDate = useMemo(() => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }, [date])

  // Get day-specific events (with null safety)
  const dayEvents = useMemo(() => {
    if (!events || !Array.isArray(events)) return []
    const dateStr = date.toISOString().split('T')[0]
    return events.filter((event) => {
      const eventStart = new Date(event.startDatetime)
      const eventDate = eventStart.toISOString().split('T')[0]
      // For all-day events, also check if it spans this date
      if (event.allDay) {
        const eventEnd = new Date(event.endDatetime)
        const dayStart = new Date(date)
        dayStart.setHours(0, 0, 0, 0)
        const dayEnd = new Date(date)
        dayEnd.setHours(23, 59, 59, 999)
        return eventStart <= dayEnd && eventEnd >= dayStart
      }
      return eventDate === dateStr
    })
  }, [events, date])

  // Get day-specific tasks (with null safety)
  const dayTasks = useMemo(() => {
    if (!tasks || !Array.isArray(tasks)) return []
    const dateStr = date.toISOString().split('T')[0]
    return tasks.filter((task) => task.dueDate === dateStr)
  }, [tasks, date])

  // Tasks without specific time (show at bottom)
  const untimedTasks = useMemo(
    () => dayTasks.filter((task) => !task.dueTime),
    [dayTasks]
  )

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

  // Get holidays for the current date
  const holidays = useMemo<Holiday[]>(() => {
    return getHolidaysForDate(date, holidaySettings)
  }, [date, holidaySettings])

  return (
    <div className={cn('flex flex-col h-full min-w-0', className)}>
      {/* Day Header */}
      <div
        className={cn(
          'flex items-center justify-between px-2 sm:px-4 py-2 sm:py-3',
          'border-b border-stone-200 dark:border-stone-700',
          'bg-white dark:bg-stone-900',
          'flex-shrink-0'
        )}
      >
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {/* Navigation */}
          <div className="flex items-center gap-1">
            <button
              onClick={goToPrevDay}
              className={cn(
                'p-1.5 rounded-md',
                'hover:bg-stone-100 dark:hover:bg-stone-800',
                'text-stone-600 dark:text-stone-400',
                'transition-colors'
              )}
              aria-label="Previous day"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={goToNextDay}
              className={cn(
                'p-1.5 rounded-md',
                'hover:bg-stone-100 dark:hover:bg-stone-800',
                'text-stone-600 dark:text-stone-400',
                'transition-colors'
              )}
              aria-label="Next day"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Date display */}
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <Calendar
              size={16}
              className={cn(
                'flex-shrink-0 sm:w-[18px] sm:h-[18px]',
                isToday
                  ? 'text-emerald-500'
                  : 'text-stone-400 dark:text-stone-500'
              )}
            />
            <h2
              className={cn(
                'text-sm sm:text-lg font-fraunces font-semibold truncate',
                'text-stone-900 dark:text-stone-100'
              )}
            >
              {formattedDate}
            </h2>
            {isToday && (
              <span
                className={cn(
                  'px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium flex-shrink-0',
                  'bg-emerald-100 text-emerald-700',
                  'dark:bg-emerald-900/30 dark:text-emerald-400'
                )}
              >
                Today
              </span>
            )}
          </div>
        </div>

        {/* Today button (only if not on today) */}
        {!isToday && (
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

      {/* Holiday banner */}
      {holidays && holidays.length > 0 && (
        <div
          className={cn(
            'px-2 sm:px-4 py-1.5 sm:py-2 border-b shrink-0',
            'border-stone-200 dark:border-stone-700'
          )}
        >
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            {holidays.map((holiday, index) => {
              const colors = getHolidayColor(holiday.type)
              return (
                <div
                  key={`${holiday.date}-${index}`}
                  className={cn(
                    'flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium border',
                    colors.bg,
                    colors.text,
                    colors.border
                  )}
                >
                  <Sparkles size={10} className="sm:w-3 sm:h-3" />
                  <span className="truncate max-w-[120px] sm:max-w-none">{holiday.name}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* All-day events */}
      <AllDaySection events={dayEvents} onEventClick={onEventClick} />

      {/* Time grid */}
      <TimeGrid
        date={date}
        events={dayEvents}
        tasks={dayTasks}
        startHour={6}
        endHour={23}
        slotHeight={60}
        showTimeLabels
        showMorningEvening
        onSlotClick={onSlotClick}
        onEventClick={onEventClick}
        onTaskClick={onTaskClick}
        onTaskToggle={onTaskToggle}
        onEventDrag={onEventDrag}
      />

      {/* Untimed tasks section */}
      {untimedTasks.length > 0 && (
        <div
          className={cn(
            'px-2 sm:px-4 py-2 sm:py-3 flex-shrink-0',
            'border-t border-stone-200 dark:border-stone-700',
            'bg-stone-50 dark:bg-stone-800/50'
          )}
        >
          <h3 className="text-[10px] sm:text-xs font-medium text-stone-500 dark:text-stone-400 mb-1.5 sm:mb-2">
            Tasks for today ({untimedTasks.length})
          </h3>
          <div className="space-y-1 sm:space-y-1.5">
            {untimedTasks.map((task) => (
              <UntimedTaskItem
                key={task.id}
                task={task}
                onClick={() => onTaskClick?.(task)}
                onToggle={(completed) => onTaskToggle?.(task.id, completed)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Untimed Task Item
 */
interface UntimedTaskItemProps {
  task: Task
  onClick?: () => void
  onToggle?: (completed: boolean) => void
}

function UntimedTaskItem({ task, onClick, onToggle }: UntimedTaskItemProps) {
  const isCompleted = task.status === 'completed'

  const priorityClasses = {
    low: 'border-l-green-500',
    medium: 'border-l-yellow-500',
    high: 'border-l-orange-500',
    urgent: 'border-l-red-500',
  }

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-2 py-1.5',
        'bg-white dark:bg-stone-900 rounded-md',
        'border-l-[3px] cursor-pointer',
        'hover:shadow-sm transition-shadow',
        priorityClasses[task.priority],
        isCompleted && 'opacity-60'
      )}
      onClick={onClick}
    >
      <button
        onClick={(e) => {
          e.stopPropagation()
          onToggle?.(!isCompleted)
        }}
        className={cn(
          'w-4 h-4 rounded border flex-shrink-0',
          'flex items-center justify-center',
          'transition-colors',
          isCompleted
            ? 'bg-emerald-500 border-emerald-500 text-white'
            : 'border-stone-300 dark:border-stone-600 hover:border-emerald-500'
        )}
      >
        {isCompleted && (
          <svg
            viewBox="0 0 12 12"
            className="w-3 h-3"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M2.5 6l2.5 2.5 4.5-4.5" />
          </svg>
        )}
      </button>
      <span
        className={cn(
          'text-sm truncate',
          'text-stone-700 dark:text-stone-300',
          isCompleted && 'line-through'
        )}
      >
        {task.title}
      </span>
    </div>
  )
}

export default DayView
