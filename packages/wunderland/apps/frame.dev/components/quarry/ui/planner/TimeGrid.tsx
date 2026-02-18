'use client'

/**
 * Time Grid Component
 *
 * Shared hour-by-hour grid used by day and week views
 * @module components/quarry/ui/planner/TimeGrid
 */

import { useMemo, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { CalendarEvent, Task } from '@/lib/planner/types'
import { CurrentTimeIndicator, useIsToday } from './CurrentTimeIndicator'
import { EventBlock, TaskBlock, calculateEventPosition, calculateTaskPosition } from './EventBlock'
import { MorningIcon, EveningIcon } from '@/lib/planner/icons/PlannerIcons'

export interface TimeGridProps {
  date: Date
  events: CalendarEvent[]
  tasks: Task[]
  startHour?: number // Default 6 (6 AM)
  endHour?: number // Default 23 (11 PM)
  slotHeight?: number // Height per hour in px
  showTimeLabels?: boolean
  showMorningEvening?: boolean
  onSlotClick?: (date: Date, hour: number, minute: number) => void
  onSlotSelect?: (start: Date, end: Date) => void
  onEventClick?: (event: CalendarEvent) => void
  onTaskClick?: (task: Task) => void
  onTaskToggle?: (taskId: string, completed: boolean) => void
  onEventDrag?: (eventId: string, newStart: Date, newEnd: Date) => void
  className?: string
}

export function TimeGrid({
  date,
  events,
  tasks,
  startHour = 6,
  endHour = 23,
  slotHeight = 60,
  showTimeLabels = true,
  showMorningEvening = true,
  onSlotClick,
  onSlotSelect,
  onEventClick,
  onTaskClick,
  onTaskToggle,
  onEventDrag,
  className,
}: TimeGridProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const isToday = useIsToday(date)

  // Generate hour slots
  const hours = useMemo(() => {
    const slots = []
    for (let h = startHour; h <= endHour; h++) {
      slots.push(h)
    }
    return slots
  }, [startHour, endHour])

  // Filter events for this specific date (with null safety)
  const dayEvents = useMemo(() => {
    if (!events || !Array.isArray(events)) return []
    const dateStr = date.toISOString().split('T')[0]
    return events.filter((event) => {
      if (event.allDay) return false // All-day handled separately
      const eventDate = event.startDatetime.split('T')[0]
      return eventDate === dateStr
    })
  }, [events, date])

  // Filter tasks for this specific date with due times (with null safety)
  const dayTasks = useMemo(() => {
    if (!tasks || !Array.isArray(tasks)) return []
    const dateStr = date.toISOString().split('T')[0]
    return tasks.filter((task) => {
      return task.dueDate === dateStr && task.dueTime
    })
  }, [tasks, date])

  // Auto-scroll to current hour on mount if today
  useEffect(() => {
    if (isToday && containerRef.current) {
      const now = new Date()
      const currentHour = now.getHours()
      if (currentHour >= startHour && currentHour <= endHour) {
        const scrollPosition = (currentHour - startHour - 1) * slotHeight
        containerRef.current.scrollTop = Math.max(0, scrollPosition)
      }
    }
  }, [isToday, startHour, endHour, slotHeight])

  // Handle slot click
  const handleSlotClick = (hour: number, half: 'first' | 'second') => {
    if (!onSlotClick) return
    const clickDate = new Date(date)
    clickDate.setHours(hour, half === 'first' ? 0 : 30, 0, 0)
    onSlotClick(clickDate, hour, half === 'first' ? 0 : 30)
  }

  // Morning ends at noon (12)
  const morningEnd = 12
  const totalHours = endHour - startHour + 1

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative flex-1 overflow-y-auto',
        'pl-1 sm:pl-0', // Mobile left padding to prevent time label clipping
        className
      )}
    >
      {/* Morning/Evening section headers */}
      {showMorningEvening && (
        <>
          {/* Morning header */}
          {startHour < morningEnd && (
            <div
              className={cn(
                'sticky top-0 z-30 flex items-center gap-1.5 sm:gap-2 px-1.5 sm:px-2 py-1 sm:py-1.5',
                'bg-gradient-to-r from-amber-50 to-orange-50/50',
                'dark:from-amber-900/20 dark:to-orange-900/10',
                'border-b border-amber-200/50 dark:border-amber-800/30'
              )}
            >
              <MorningIcon size={14} className="sm:w-4 sm:h-4" />
              <span className="text-[10px] sm:text-xs font-medium text-amber-700 dark:text-amber-300">
                Morning
              </span>
              <span className="hidden sm:inline text-[10px] text-amber-600/70 dark:text-amber-400/70">
                6 AM - 12 PM
              </span>
            </div>
          )}
        </>
      )}

      {/* Time grid container */}
      <div className="relative">
        {/* Current time indicator */}
        {isToday && (
          <CurrentTimeIndicator
            startHour={startHour}
            endHour={endHour}
            slotHeight={slotHeight}
          />
        )}

        {/* Hour rows */}
        {hours.map((hour, index) => {
          const isAtNoon = hour === morningEnd

          return (
            <div key={hour}>
              {/* Evening header at noon */}
              {showMorningEvening && isAtNoon && (
                <div
                  className={cn(
                    'sticky z-30 flex items-center gap-1.5 sm:gap-2 px-1.5 sm:px-2 py-1 sm:py-1.5',
                    'bg-gradient-to-r from-indigo-50 to-purple-50/50',
                    'dark:from-indigo-900/20 dark:to-purple-900/10',
                    'border-b border-indigo-200/50 dark:border-indigo-800/30'
                  )}
                  style={{ top: showMorningEvening && startHour < morningEnd ? '28px' : '0' }}
                >
                  <EveningIcon size={14} className="sm:w-4 sm:h-4" />
                  <span className="text-[10px] sm:text-xs font-medium text-indigo-700 dark:text-indigo-300">
                    <span className="sm:hidden">PM</span>
                    <span className="hidden sm:inline">Afternoon & Evening</span>
                  </span>
                  <span className="hidden sm:inline text-[10px] text-indigo-600/70 dark:text-indigo-400/70">
                    12 PM - 11 PM
                  </span>
                </div>
              )}

              {/* Hour row */}
              <div
                className={cn(
                  'relative flex',
                  'border-b border-stone-200/50 dark:border-stone-700/50'
                )}
                style={{ height: `${slotHeight}px` }}
              >
                {/* Time label */}
                {showTimeLabels && (
                  <div
                    className={cn(
                      'flex-shrink-0 w-10 sm:w-14 min-w-[40px] sm:min-w-[56px] pr-1 sm:pr-2 pt-0.5',
                      'text-right text-[10px] sm:text-xs text-stone-500 dark:text-stone-400'
                    )}
                  >
                    {formatHour(hour)}
                  </div>
                )}

                {/* Hour slot */}
                <div className="flex-1 relative">
                  {/* First half (0-29 min) */}
                  <div
                    className={cn(
                      'absolute inset-x-0 top-0 h-1/2',
                      'hover:bg-stone-100/50 dark:hover:bg-stone-800/30',
                      'transition-colors cursor-pointer'
                    )}
                    onClick={() => handleSlotClick(hour, 'first')}
                  />

                  {/* Second half (30-59 min) */}
                  <div
                    className={cn(
                      'absolute inset-x-0 bottom-0 h-1/2',
                      'border-t border-dashed border-stone-200/50 dark:border-stone-700/30',
                      'hover:bg-stone-100/50 dark:hover:bg-stone-800/30',
                      'transition-colors cursor-pointer'
                    )}
                    onClick={() => handleSlotClick(hour, 'second')}
                  />
                </div>
              </div>
            </div>
          )
        })}

        {/* Events overlay - offset by time label width (40px mobile, 56px desktop) */}
        <div
          className={cn(
            'absolute inset-y-0 right-0 pointer-events-none',
            showTimeLabels ? 'left-10 sm:left-14' : 'left-0'
          )}
        >
          {/* Render events */}
          {dayEvents.map((event) => {
            const position = calculateEventPosition(event, startHour, slotHeight)
            return (
              <div
                key={event.id}
                className="pointer-events-auto"
                style={{
                  position: 'absolute',
                  top: `${position.top}px`,
                  height: `${position.height}px`,
                  left: 0,
                  right: 0,
                }}
              >
                <EventBlock
                  event={event}
                  onClick={() => onEventClick?.(event)}
                  compact={position.height < 40}
                  style={{ height: '100%' }}
                />
              </div>
            )
          })}

          {/* Render tasks with due times */}
          {dayTasks.map((task) => {
            const position = calculateTaskPosition(task, startHour, slotHeight)
            if (!position) return null
            return (
              <div
                key={task.id}
                className="pointer-events-auto"
                style={{
                  position: 'absolute',
                  top: `${position.top}px`,
                  height: `${position.height}px`,
                  left: 0,
                  right: 0,
                }}
              >
                <TaskBlock
                  task={task}
                  onClick={() => onTaskClick?.(task)}
                  onToggle={(completed) => onTaskToggle?.(task.id, completed)}
                  compact
                  style={{ height: '100%' }}
                />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/**
 * Format hour to display string
 */
function formatHour(hour: number): string {
  if (hour === 0) return '12 AM'
  if (hour === 12) return '12 PM'
  if (hour < 12) return `${hour} AM`
  return `${hour - 12} PM`
}

export default TimeGrid
