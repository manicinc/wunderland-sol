'use client'

/**
 * All-Day Events Section
 *
 * Displays all-day events at the top of day/week views
 * @module components/quarry/ui/planner/AllDaySection
 */

import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import { CalendarEvent } from '@/lib/planner/types'
import { ChevronDown, ChevronUp } from 'lucide-react'

interface AllDaySectionProps {
  events: CalendarEvent[]
  onEventClick?: (event: CalendarEvent) => void
  expanded?: boolean
  onToggleExpanded?: () => void
  maxVisible?: number
  className?: string
}

// Color mapping for all-day events
const ALL_DAY_COLORS: Record<string, string> = {
  default: 'bg-emerald-500 text-white',
  blue: 'bg-blue-500 text-white',
  purple: 'bg-purple-500 text-white',
  pink: 'bg-pink-500 text-white',
  orange: 'bg-orange-500 text-white',
  red: 'bg-red-500 text-white',
  yellow: 'bg-yellow-500 text-white',
  teal: 'bg-teal-500 text-white',
}

export function AllDaySection({
  events,
  onEventClick,
  expanded = false,
  onToggleExpanded,
  maxVisible = 2,
  className,
}: AllDaySectionProps) {
  // Guard against undefined events
  const safeEvents = events && Array.isArray(events) ? events : []

  const allDayEvents = useMemo(
    () => safeEvents.filter((e) => e.allDay),
    [safeEvents]
  )

  if (allDayEvents.length === 0) {
    return null
  }

  const visibleEvents = expanded
    ? allDayEvents
    : allDayEvents.slice(0, maxVisible)
  const hiddenCount = allDayEvents.length - maxVisible

  return (
    <div
      className={cn(
        'border-b border-stone-200 dark:border-stone-700',
        'bg-stone-50/50 dark:bg-stone-800/30',
        className
      )}
    >
      <div className="px-2 py-1.5">
        {/* Header */}
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider">
            All day
          </span>
          {hiddenCount > 0 && (
            <button
              onClick={onToggleExpanded}
              className={cn(
                'text-[10px] text-stone-500 hover:text-stone-700',
                'dark:text-stone-400 dark:hover:text-stone-200',
                'flex items-center gap-0.5'
              )}
            >
              {expanded ? (
                <>
                  <ChevronUp size={12} />
                  Show less
                </>
              ) : (
                <>
                  <ChevronDown size={12} />+{hiddenCount} more
                </>
              )}
            </button>
          )}
        </div>

        {/* Events */}
        <div className="flex flex-col gap-1">
          {visibleEvents.map((event) => (
            <AllDayEventPill
              key={event.id}
              event={event}
              onClick={() => onEventClick?.(event)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

interface AllDayEventPillProps {
  event: CalendarEvent
  onClick?: () => void
  span?: number // For week view - how many days it spans
  className?: string
}

export function AllDayEventPill({
  event,
  onClick,
  className,
}: AllDayEventPillProps) {
  const colorClass =
    ALL_DAY_COLORS[event.color || 'default'] || ALL_DAY_COLORS.default

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full px-2 py-0.5 rounded text-left',
        'text-xs font-medium truncate',
        'transition-opacity hover:opacity-80',
        colorClass,
        className
      )}
    >
      {event.title}
    </button>
  )
}

/**
 * All-Day Section for Week View
 * Handles multi-day spanning events
 */
interface AllDaySectionWeekProps {
  events: CalendarEvent[]
  weekDates: Date[]
  onEventClick?: (event: CalendarEvent) => void
  className?: string
}

export function AllDaySectionWeek({
  events,
  weekDates,
  onEventClick,
  className,
}: AllDaySectionWeekProps) {
  // Guard against undefined props
  const safeEvents = events && Array.isArray(events) ? events : []
  const safeWeekDates = weekDates && Array.isArray(weekDates) ? weekDates : []

  const allDayEvents = useMemo(
    () => safeEvents.filter((e) => e.allDay),
    [safeEvents]
  )

  // Group events by which days they appear on
  const eventsByDay = useMemo(() => {
    const result: Map<number, CalendarEvent[]> = new Map()
    safeWeekDates.forEach((_, i) => result.set(i, []))

    allDayEvents.forEach((event) => {
      const eventStart = new Date(event.startDatetime)
      const eventEnd = new Date(event.endDatetime)

      safeWeekDates.forEach((date, dayIndex) => {
        const dayStart = new Date(date)
        dayStart.setHours(0, 0, 0, 0)
        const dayEnd = new Date(date)
        dayEnd.setHours(23, 59, 59, 999)

        if (eventStart <= dayEnd && eventEnd >= dayStart) {
          result.get(dayIndex)?.push(event)
        }
      })
    })

    return result
  }, [allDayEvents, safeWeekDates])

  // Find max events in any day for consistent height (with null safety)
  const maxEvents = useMemo(() => {
    const values = Array.from(eventsByDay.values())
    if (values.length === 0) return 0
    return Math.max(...values.map((e) => e?.length ?? 0), 0)
  }, [eventsByDay])

  if (maxEvents === 0) {
    return null
  }

  return (
    <div
      className={cn(
        'grid grid-cols-7',
        'border-b border-stone-200 dark:border-stone-700',
        'bg-stone-50/50 dark:bg-stone-800/30',
        className
      )}
    >
      {safeWeekDates.map((_, dayIndex) => {
        const dayEvents = eventsByDay.get(dayIndex) || []

        return (
          <div
            key={dayIndex}
            className={cn(
              'min-h-[28px] px-0.5 py-1',
              'border-r border-stone-200 dark:border-stone-700 last:border-r-0',
              'flex flex-col gap-0.5'
            )}
          >
            {dayEvents.slice(0, 3).map((event) => (
              <button
                key={event.id}
                onClick={() => onEventClick?.(event)}
                className={cn(
                  'w-full px-1 py-0.5 rounded',
                  'text-[10px] font-medium truncate text-left',
                  'transition-opacity hover:opacity-80',
                  ALL_DAY_COLORS[event.color || 'default'] ||
                    ALL_DAY_COLORS.default
                )}
              >
                {event.title}
              </button>
            ))}
            {dayEvents.length > 3 && (
              <span className="text-[10px] text-stone-500 px-1">
                +{dayEvents.length - 3} more
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default AllDaySection
