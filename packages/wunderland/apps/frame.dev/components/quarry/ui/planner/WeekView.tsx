'use client'

/**
 * Week View Component
 *
 * 7-day grid with hour rows for comprehensive week scheduling
 * @module components/quarry/ui/planner/WeekView
 */

import { useMemo, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { CalendarEvent, Task } from '@/lib/planner/types'
import { CurrentTimeIndicator, useIsToday } from './CurrentTimeIndicator'
import { EventBlock, TaskBlock, calculateEventPosition, calculateTaskPosition } from './EventBlock'
import { AllDaySectionWeek } from './AllDaySection'
import { ChevronLeft, ChevronRight, Sparkles, Check } from 'lucide-react'
import { TodayIcon, MorningIcon, EveningIcon } from '@/lib/planner/icons/PlannerIcons'
import {
  getHolidaysForDate,
  getHolidayColor,
  DEFAULT_HOLIDAY_SETTINGS,
  type Holiday,
  type HolidaySettings,
} from '@/lib/planner/holidays'

interface WeekViewProps {
  date: Date // Any date in the target week
  events: CalendarEvent[]
  tasks: Task[]
  onDateChange: (date: Date) => void
  onDayClick?: (date: Date) => void // Click day header to go to day view
  onSlotClick?: (date: Date, hour: number, minute: number) => void
  onEventClick?: (event: CalendarEvent) => void
  onTaskClick?: (task: Task) => void
  onTaskToggle?: (taskId: string, completed: boolean) => void
  onEventDrag?: (eventId: string, newStart: Date, newEnd: Date) => void
  className?: string
}

export function WeekView({
  date,
  events: rawEvents,
  tasks: rawTasks,
  onDateChange,
  onDayClick,
  onSlotClick,
  onEventClick,
  onTaskClick,
  onTaskToggle,
  onEventDrag,
  className,
}: WeekViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const today = new Date()

  // Ensure events and tasks are always arrays (defensive coding)
  const events = Array.isArray(rawEvents) ? rawEvents : []
  const tasks = Array.isArray(rawTasks) ? rawTasks : []

  const startHour = 6
  const endHour = 23
  const slotHeight = 48 // Slightly smaller for week view

  // Calculate week dates (Sunday to Saturday)
  const weekDates = useMemo(() => {
    const startOfWeek = new Date(date)
    const day = startOfWeek.getDay()
    startOfWeek.setDate(startOfWeek.getDate() - day) // Go to Sunday

    const dates: Date[] = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek)
      d.setDate(startOfWeek.getDate() + i)
      dates.push(d)
    }
    return dates
  }, [date])

  // Generate hour slots
  const hours = useMemo(() => {
    const slots = []
    for (let h = startHour; h <= endHour; h++) {
      slots.push(h)
    }
    return slots
  }, [])

  // Navigate weeks
  const goToPrevWeek = () => {
    const prev = new Date(date)
    prev.setDate(prev.getDate() - 7)
    onDateChange(prev)
  }

  const goToNextWeek = () => {
    const next = new Date(date)
    next.setDate(next.getDate() + 7)
    onDateChange(next)
  }

  const goToToday = () => {
    onDateChange(new Date())
  }

  // Check if today is in this week
  const isTodayInWeek = useMemo(() => {
    return weekDates.some(
      (d) =>
        d.getFullYear() === today.getFullYear() &&
        d.getMonth() === today.getMonth() &&
        d.getDate() === today.getDate()
    )
  }, [weekDates, today])

  // Format week range for header
  const weekRangeLabel = useMemo(() => {
    const start = weekDates[0]
    const end = weekDates[6]

    if (start.getMonth() === end.getMonth()) {
      return `${start.toLocaleDateString('en-US', { month: 'long' })} ${start.getDate()} - ${end.getDate()}, ${start.getFullYear()}`
    } else if (start.getFullYear() === end.getFullYear()) {
      return `${start.toLocaleDateString('en-US', { month: 'short' })} ${start.getDate()} - ${end.toLocaleDateString('en-US', { month: 'short' })} ${end.getDate()}, ${start.getFullYear()}`
    } else {
      return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
    }
  }, [weekDates])

  // Get events for each day
  const eventsByDay = useMemo(() => {
    const result: Map<string, CalendarEvent[]> = new Map()

    weekDates.forEach((d) => {
      const dateStr = d.toISOString().split('T')[0]
      result.set(dateStr, [])
    })

    events.forEach((event) => {
      if (event.allDay) return // Handled separately
      const eventDate = event.startDatetime.split('T')[0]
      if (result.has(eventDate)) {
        result.get(eventDate)!.push(event)
      }
    })

    return result
  }, [events, weekDates])

  // Get tasks for each day (with specific times - shown in time grid)
  const tasksByDay = useMemo(() => {
    const result: Map<string, Task[]> = new Map()

    weekDates.forEach((d) => {
      const dateStr = d.toISOString().split('T')[0]
      result.set(dateStr, [])
    })

    tasks.forEach((task) => {
      if (!task.dueDate || !task.dueTime) return
      if (result.has(task.dueDate)) {
        result.get(task.dueDate)!.push(task)
      }
    })

    return result
  }, [tasks, weekDates])

  // Get untimed tasks for each day (without specific times - shown in header)
  const untimedTasksByDay = useMemo(() => {
    const result: Map<string, Task[]> = new Map()

    weekDates.forEach((d) => {
      const dateStr = d.toISOString().split('T')[0]
      result.set(dateStr, [])
    })

    tasks.forEach((task) => {
      if (!task.dueDate || task.dueTime) return // Only tasks WITH dueDate but WITHOUT dueTime
      if (result.has(task.dueDate)) {
        result.get(task.dueDate)!.push(task)
      }
    })

    return result
  }, [tasks, weekDates])

  // Check if there are any untimed tasks this week
  const hasUntimedTasks = useMemo(() => {
    return Array.from(untimedTasksByDay.values()).some(tasks => tasks.length > 0)
  }, [untimedTasksByDay])

  // Holiday settings from localStorage
  const holidaySettings = useMemo<HolidaySettings>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('holidaySettings')
      if (stored) {
        try {
          return JSON.parse(stored)
        } catch {
          // Fall through to default
        }
      }
    }
    return DEFAULT_HOLIDAY_SETTINGS
  }, [])

  // Get holidays for each day of the week
  const holidaysByDay = useMemo(() => {
    const result: Map<string, Holiday[]> = new Map()
    weekDates.forEach((d) => {
      const dateStr = d.toISOString().split('T')[0]
      result.set(dateStr, getHolidaysForDate(d, holidaySettings))
    })
    return result
  }, [weekDates, holidaySettings])

  // Auto-scroll to current hour on mount if today is in this week
  useEffect(() => {
    if (isTodayInWeek && containerRef.current) {
      const currentHour = today.getHours()
      if (currentHour >= startHour && currentHour <= endHour) {
        const scrollPosition = (currentHour - startHour - 1) * slotHeight
        containerRef.current.scrollTop = Math.max(0, scrollPosition)
      }
    }
  }, [isTodayInWeek, slotHeight])

  // Handle slot click
  const handleSlotClick = (dayIndex: number, hour: number, half: 'first' | 'second') => {
    if (!onSlotClick) return
    const clickDate = new Date(weekDates[dayIndex])
    clickDate.setHours(hour, half === 'first' ? 0 : 30, 0, 0)
    onSlotClick(clickDate, hour, half === 'first' ? 0 : 30)
  }

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Week Header */}
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
              onClick={goToPrevWeek}
              className={cn(
                'p-1.5 rounded-md',
                'hover:bg-stone-100 dark:hover:bg-stone-800',
                'text-stone-600 dark:text-stone-400',
                'transition-colors'
              )}
              aria-label="Previous week"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={goToNextWeek}
              className={cn(
                'p-1.5 rounded-md',
                'hover:bg-stone-100 dark:hover:bg-stone-800',
                'text-stone-600 dark:text-stone-400',
                'transition-colors'
              )}
              aria-label="Next week"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Week label */}
          <h2
            className={cn(
              'text-lg font-fraunces font-semibold',
              'text-stone-900 dark:text-stone-100'
            )}
          >
            {weekRangeLabel}
          </h2>
        </div>

        {/* Today button */}
        {!isTodayInWeek && (
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

      {/* Day headers */}
      <div
        className={cn(
          'grid grid-cols-[56px_repeat(7,1fr)]',
          'border-b border-stone-200 dark:border-stone-700',
          'bg-stone-50 dark:bg-stone-800/50'
        )}
      >
        {/* Empty corner cell */}
        <div className="border-r border-stone-200 dark:border-stone-700" />

        {/* Day headers */}
        {weekDates.map((d, i) => {
          const dateStr = d.toISOString().split('T')[0]
          const dayHolidays = holidaysByDay.get(dateStr) || []
          const isThisToday =
            d.getFullYear() === today.getFullYear() &&
            d.getMonth() === today.getMonth() &&
            d.getDate() === today.getDate()

          return (
            <button
              key={i}
              onClick={() => onDayClick?.(d)}
              className={cn(
                'py-2 text-center',
                'border-r border-stone-200 dark:border-stone-700 last:border-r-0',
                'hover:bg-stone-100 dark:hover:bg-stone-700/50',
                'transition-colors'
              )}
            >
              <div
                className={cn(
                  'text-xs font-medium',
                  isThisToday
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-stone-500 dark:text-stone-400'
                )}
              >
                {d.toLocaleDateString('en-US', { weekday: 'short' })}
              </div>
              <div
                className={cn(
                  'text-lg font-semibold mt-0.5',
                  'w-8 h-8 mx-auto rounded-full flex items-center justify-center',
                  isThisToday
                    ? 'bg-emerald-500 text-white'
                    : 'text-stone-700 dark:text-stone-200'
                )}
              >
                {d.getDate()}
              </div>
              {/* Holiday indicator */}
              {dayHolidays && dayHolidays.length > 0 && (
                <div className="mt-1 flex justify-center">
                  {dayHolidays.slice(0, 1).map((holiday, idx) => {
                    const colors = getHolidayColor(holiday.type)
                    return (
                      <div
                        key={idx}
                        className={cn(
                          'flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium',
                          colors.bg,
                          colors.text
                        )}
                        title={holiday.name}
                      >
                        <Sparkles size={10} />
                        <span className="max-w-[60px] truncate">{holiday.name}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* All-day events row */}
      <div className="grid grid-cols-[56px_repeat(7,1fr)]">
        {/* Label */}
        <div
          className={cn(
            'text-[10px] font-medium text-stone-500 dark:text-stone-400',
            'uppercase tracking-wider',
            'flex items-center justify-center',
            'border-r border-b border-stone-200 dark:border-stone-700',
            'bg-stone-50 dark:bg-stone-800/30'
          )}
        >
          All day
        </div>
        <div className="col-span-7">
          <AllDaySectionWeek
            events={events}
            weekDates={weekDates}
            onEventClick={onEventClick}
          />
        </div>
      </div>

      {/* Untimed tasks row */}
      {hasUntimedTasks && (
        <div className="grid grid-cols-[56px_repeat(7,1fr)] border-b border-stone-200 dark:border-stone-700">
          {/* Label */}
          <div
            className={cn(
              'text-[10px] font-medium text-stone-500 dark:text-stone-400',
              'uppercase tracking-wider',
              'flex items-center justify-center',
              'border-r border-stone-200 dark:border-stone-700',
              'bg-amber-50/50 dark:bg-amber-900/10'
            )}
          >
            Tasks
          </div>
          {/* Day columns */}
          {weekDates.map((d, dayIndex) => {
            const dateStr = d.toISOString().split('T')[0]
            const dayUntimedTasks = untimedTasksByDay.get(dateStr) || []

            return (
              <div
                key={dayIndex}
                className={cn(
                  'min-h-[32px] px-1 py-1',
                  'border-r border-stone-200 dark:border-stone-700 last:border-r-0',
                  'bg-amber-50/30 dark:bg-amber-900/5'
                )}
              >
                {dayUntimedTasks && dayUntimedTasks.length > 0 && (
                  <div className="space-y-0.5">
                    {dayUntimedTasks.slice(0, 3).map((task) => (
                      <UntimedTaskPill
                        key={task.id}
                        task={task}
                        onClick={() => onTaskClick?.(task)}
                        onToggle={(completed) => onTaskToggle?.(task.id, completed)}
                      />
                    ))}
                    {dayUntimedTasks.length > 3 && (
                      <div className="text-[9px] text-stone-500 dark:text-stone-400 text-center">
                        +{dayUntimedTasks.length - 3} more
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Time grid */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden"
      >
        <div className="grid grid-cols-[56px_repeat(7,1fr)] relative">
          {/* Time labels column */}
          <div className="border-r border-stone-200 dark:border-stone-700">
            {hours.map((hour) => (
              <div
                key={hour}
                className={cn(
                  'h-12 pr-2 pt-0.5',
                  'text-right text-[10px] text-stone-400 dark:text-stone-500',
                  'border-b border-stone-100 dark:border-stone-800'
                )}
              >
                {formatHour(hour)}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {weekDates.map((d, dayIndex) => {
            const dateStr = d.toISOString().split('T')[0]
            const dayEvents = eventsByDay.get(dateStr) || []
            const dayTasks = tasksByDay.get(dateStr) || []
            const isThisToday = useIsToday(d)

            return (
              <div
                key={dayIndex}
                className={cn(
                  'relative',
                  'border-r border-stone-200 dark:border-stone-700 last:border-r-0',
                  isThisToday && 'bg-emerald-50/30 dark:bg-emerald-900/10'
                )}
              >
                {/* Hour rows */}
                {hours.map((hour) => (
                  <div
                    key={hour}
                    className={cn(
                      'h-12 relative',
                      'border-b border-stone-100 dark:border-stone-800'
                    )}
                  >
                    {/* First half */}
                    <div
                      className={cn(
                        'absolute inset-x-0 top-0 h-1/2',
                        'hover:bg-stone-100/50 dark:hover:bg-stone-700/20',
                        'transition-colors cursor-pointer'
                      )}
                      onClick={() => handleSlotClick(dayIndex, hour, 'first')}
                    />
                    {/* Second half */}
                    <div
                      className={cn(
                        'absolute inset-x-0 bottom-0 h-1/2',
                        'border-t border-dashed border-stone-100 dark:border-stone-800',
                        'hover:bg-stone-100/50 dark:hover:bg-stone-700/20',
                        'transition-colors cursor-pointer'
                      )}
                      onClick={() => handleSlotClick(dayIndex, hour, 'second')}
                    />
                  </div>
                ))}

                {/* Current time indicator (only on today) */}
                {isThisToday && (
                  <CurrentTimeIndicator
                    startHour={startHour}
                    endHour={endHour}
                    slotHeight={slotHeight}
                  />
                )}

                {/* Events */}
                {dayEvents.map((event) => {
                  const position = calculateEventPosition(event, startHour, slotHeight)
                  return (
                    <EventBlock
                      key={event.id}
                      event={event}
                      onClick={() => onEventClick?.(event)}
                      compact={position.height < 30}
                      style={{
                        top: `${position.top}px`,
                        height: `${position.height}px`,
                      }}
                    />
                  )
                })}

                {/* Tasks */}
                {dayTasks.map((task) => {
                  const position = calculateTaskPosition(task, startHour, slotHeight)
                  if (!position) return null
                  return (
                    <TaskBlock
                      key={task.id}
                      task={task}
                      onClick={() => onTaskClick?.(task)}
                      onToggle={(completed) => onTaskToggle?.(task.id, completed)}
                      compact
                      style={{
                        top: `${position.top}px`,
                        height: `${position.height}px`,
                      }}
                    />
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function formatHour(hour: number): string {
  if (hour === 0) return '12 AM'
  if (hour === 12) return '12 PM'
  if (hour < 12) return `${hour} AM`
  return `${hour - 12} PM`
}

/**
 * Compact task pill for untimed tasks in week view header
 */
interface UntimedTaskPillProps {
  task: Task
  onClick?: () => void
  onToggle?: (completed: boolean) => void
}

function UntimedTaskPill({ task, onClick, onToggle }: UntimedTaskPillProps) {
  const isCompleted = task.status === 'completed'

  const priorityColors = {
    low: 'border-l-green-500 bg-green-50 dark:bg-green-900/20',
    medium: 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-900/20',
    high: 'border-l-orange-500 bg-orange-50 dark:bg-orange-900/20',
    urgent: 'border-l-red-500 bg-red-50 dark:bg-red-900/20',
  }

  return (
    <div
      className={cn(
        'flex items-center gap-1 px-1.5 py-0.5 rounded',
        'border-l-2 cursor-pointer',
        'hover:shadow-sm transition-all',
        priorityColors[task.priority],
        isCompleted && 'opacity-50'
      )}
      onClick={onClick}
    >
      <button
        onClick={(e) => {
          e.stopPropagation()
          onToggle?.(!isCompleted)
        }}
        className={cn(
          'w-3 h-3 rounded border flex-shrink-0',
          'flex items-center justify-center',
          'transition-colors',
          isCompleted
            ? 'bg-emerald-500 border-emerald-500 text-white'
            : 'border-stone-300 dark:border-stone-600 hover:border-emerald-400'
        )}
      >
        {isCompleted && <Check size={8} />}
      </button>
      <span
        className={cn(
          'text-[10px] truncate max-w-[80px]',
          'text-stone-700 dark:text-stone-300',
          isCompleted && 'line-through'
        )}
      >
        {task.title}
      </span>
    </div>
  )
}

export default WeekView
