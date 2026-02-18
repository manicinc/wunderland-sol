/**
 * Embeddable Calendar View
 * @module components/quarry/views/embeddable/CalendarView
 *
 * @description
 * Embark-inspired calendar view for visualizing dates and events.
 * Displays mentions with date properties in a calendar layout.
 */

import React, { useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import type { EmbeddableViewConfig, ViewData, CalendarViewSettings } from '@/lib/views'
import type { MentionableEntity } from '@/lib/mentions/types'
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  Sun,
  Cloud,
  CloudRain,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

interface CalendarViewProps {
  config: EmbeddableViewConfig
  data: ViewData
  onItemClick?: (item: ViewData['items'][0]) => void
  className?: string
}

interface CalendarEvent {
  id: string
  label: string
  date: Date
  endDate?: Date
  allDay?: boolean
  color?: string
  icon?: string
  entity: MentionableEntity
  weather?: {
    condition: string
    temp?: number
  }
}

/**
 * Extract calendar events from view data
 */
function extractEvents(data: ViewData): CalendarEvent[] {
  const events: CalendarEvent[] = []

  for (const item of data.items) {
    const entity = item.entity as MentionableEntity
    const props = entity.properties as Record<string, unknown>

    // Check for date properties
    const dateStr = props.date ?? props.start ?? props.startDate ?? props.when
    if (!dateStr) continue

    const date = new Date(dateStr as string)
    if (isNaN(date.getTime())) continue

    const endDateStr = props.end ?? props.endDate
    let endDate: Date | undefined
    if (endDateStr) {
      const parsed = new Date(endDateStr as string)
      if (!isNaN(parsed.getTime())) {
        endDate = parsed
      }
    }

    events.push({
      id: item.id,
      label: entity.label,
      date,
      endDate,
      allDay: props.allDay as boolean | undefined,
      color: (props.color as string) || entity.color,
      icon: (props.icon as string) || entity.icon,
      entity,
      weather: props.weather as CalendarEvent['weather'],
    })
  }

  return events.sort((a, b) => a.date.getTime() - b.date.getTime())
}

/**
 * Get days in a month
 */
function getDaysInMonth(year: number, month: number): Date[] {
  const days: Date[] = []
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)

  // Add padding days from previous month
  const startPadding = firstDay.getDay()
  for (let i = startPadding - 1; i >= 0; i--) {
    const date = new Date(year, month, -i)
    days.push(date)
  }

  // Add days of current month
  for (let i = 1; i <= lastDay.getDate(); i++) {
    days.push(new Date(year, month, i))
  }

  // Add padding days for next month
  const endPadding = 42 - days.length // 6 rows * 7 days
  for (let i = 1; i <= endPadding; i++) {
    days.push(new Date(year, month + 1, i))
  }

  return days
}

/**
 * Format date for display
 */
function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

/**
 * Check if two dates are the same day
 */
function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

/**
 * Calendar View Component
 */
const CalendarView: React.FC<CalendarViewProps> = ({
  config,
  data,
  onItemClick,
  className,
}) => {
  const settings = config.settings as CalendarViewSettings
  const events = useMemo(() => extractEvents(data), [data])

  // Current view date
  const [viewDate, setViewDate] = useState(() => {
    if (settings.initialDate) {
      const date = new Date(settings.initialDate)
      if (!isNaN(date.getTime())) return date
    }
    // Default to first event date or today
    if (events.length > 0) return events[0].date
    return new Date()
  })

  const [mode, setMode] = useState<'month' | 'week' | 'agenda'>(
    settings.mode && settings.mode !== 'day' ? settings.mode : 'month'
  )

  const today = useMemo(() => new Date(), [])

  // Navigation
  const goToPrevious = () => {
    const newDate = new Date(viewDate)
    if (mode === 'month') {
      newDate.setMonth(newDate.getMonth() - 1)
    } else if (mode === 'week') {
      newDate.setDate(newDate.getDate() - 7)
    }
    setViewDate(newDate)
  }

  const goToNext = () => {
    const newDate = new Date(viewDate)
    if (mode === 'month') {
      newDate.setMonth(newDate.getMonth() + 1)
    } else if (mode === 'week') {
      newDate.setDate(newDate.getDate() + 7)
    }
    setViewDate(newDate)
  }

  const goToToday = () => setViewDate(new Date())

  // Get days for current month view
  const monthDays = useMemo(() => {
    return getDaysInMonth(viewDate.getFullYear(), viewDate.getMonth())
  }, [viewDate])

  // Get events for a specific day
  const getEventsForDay = (date: Date): CalendarEvent[] => {
    return events.filter(event => isSameDay(event.date, date))
  }

  // Weather icon helper
  const WeatherIcon = ({ condition }: { condition: string }) => {
    switch (condition.toLowerCase()) {
      case 'sunny':
      case 'clear':
        return <Sun className="h-3 w-3 text-yellow-500" />
      case 'cloudy':
      case 'overcast':
        return <Cloud className="h-3 w-3 text-gray-400" />
      case 'rain':
      case 'rainy':
        return <CloudRain className="h-3 w-3 text-blue-400" />
      default:
        return null
    }
  }

  // No events placeholder - Enhanced empty state
  if (events.length === 0) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center h-full min-h-[200px] p-6',
          'bg-gradient-to-br from-purple-50 to-pink-50',
          'dark:from-purple-950/30 dark:to-pink-950/30',
          'border-2 border-dashed border-purple-200 dark:border-purple-800 rounded-xl',
          className
        )}
      >
        <div className="relative mb-4">
          <div className="absolute inset-0 bg-purple-500/10 blur-xl rounded-full" />
          <Calendar className="relative h-14 w-14 text-purple-400 dark:text-purple-500" />
        </div>
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
          No events to display
        </h4>
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center max-w-xs mb-4">
          This calendar will show dates and events from your document
        </p>
        <div className="flex flex-col gap-2 text-xs text-gray-500 dark:text-gray-400 bg-white/50 dark:bg-gray-800/50 rounded-lg p-3">
          <p className="font-medium text-gray-600 dark:text-gray-300">💡 How to add events:</p>
          <ul className="space-y-1.5 list-none">
            <li className="flex items-start gap-2">
              <span className="text-purple-500">@</span>
              <span>Type <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-[10px]">@Dec 25, 2024</code> to mention a date</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-purple-500">📅</span>
              <span>Create events with <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-[10px]">date</code> or <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-[10px]">start</code> properties</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-purple-500">🗓️</span>
              <span>Use the <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-[10px]">#event</code> supertag for structured events</span>
            </li>
          </ul>
        </div>
      </div>
    )
  }

  // Agenda view
  if (mode === 'agenda') {
    return (
      <div className={cn('flex flex-col h-full', className)}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-200">
            Upcoming Events
          </h3>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setMode('month')}>
              Month
            </Button>
          </div>
        </div>

        {/* Event List */}
        <div className="flex-1 overflow-auto p-4 space-y-2">
          {events.map(event => (
            <button
              key={event.id}
              onClick={() => onItemClick?.({
                id: event.id,
                source: { type: 'mention', id: event.id },
                entity: event.entity,
              })}
              className={cn(
                'w-full flex items-center gap-3 p-3 rounded-lg',
                'bg-white dark:bg-gray-800 shadow-sm',
                'border border-gray-200 dark:border-gray-700',
                'hover:shadow-md transition-shadow',
                'text-left'
              )}
            >
              <div
                className="w-1 h-12 rounded-full"
                style={{ backgroundColor: event.color || '#8b5cf6' }}
              />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-800 dark:text-gray-100 truncate">
                  {event.label}
                </p>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Clock className="h-3 w-3" />
                  <span>{formatDate(event.date)}</span>
                  {event.weather && (
                    <>
                      <span className="text-gray-300">|</span>
                      <WeatherIcon condition={event.weather.condition} />
                      {event.weather.temp && (
                        <span>{event.weather.temp}°</span>
                      )}
                    </>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    )
  }

  // Month view (default)
  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={goToPrevious}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-200 min-w-[140px] text-center">
            {MONTHS[viewDate.getMonth()]} {viewDate.getFullYear()}
          </h3>
          <Button variant="ghost" size="sm" onClick={goToNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={goToToday}>
            Today
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setMode('agenda')}>
            Agenda
          </Button>
        </div>
      </div>

      {/* Weekday Headers */}
      <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700">
        {WEEKDAYS.map(day => (
          <div
            key={day}
            className="py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 grid grid-cols-7 auto-rows-fr overflow-hidden">
        {monthDays.map((date, index) => {
          const isCurrentMonth = date.getMonth() === viewDate.getMonth()
          const isToday = isSameDay(date, today)
          const dayEvents = getEventsForDay(date)

          return (
            <div
              key={index}
              className={cn(
                'border-r border-b border-gray-100 dark:border-gray-800 p-1',
                'min-h-[60px] overflow-hidden',
                !isCurrentMonth && 'bg-gray-50 dark:bg-gray-900/50',
              )}
            >
              <div
                className={cn(
                  'text-xs font-medium mb-1',
                  isToday && 'bg-blue-500 text-white w-5 h-5 rounded-full flex items-center justify-center',
                  !isToday && isCurrentMonth && 'text-gray-700 dark:text-gray-300',
                  !isToday && !isCurrentMonth && 'text-gray-400 dark:text-gray-600',
                )}
              >
                {date.getDate()}
              </div>

              {/* Day Events */}
              <div className="space-y-0.5 overflow-hidden">
                {dayEvents.slice(0, 2).map(event => (
                  <button
                    key={event.id}
                    onClick={() => onItemClick?.({
                      id: event.id,
                      source: { type: 'mention', id: event.id },
                      entity: event.entity,
                    })}
                    className={cn(
                      'w-full text-left px-1.5 py-0.5 rounded text-xs truncate',
                      'hover:opacity-80 transition-opacity'
                    )}
                    style={{
                      backgroundColor: event.color || '#8b5cf6',
                      color: 'white',
                    }}
                  >
                    {event.label}
                  </button>
                ))}
                {dayEvents.length > 2 && (
                  <div className="text-[10px] text-gray-400 px-1">
                    +{dayEvents.length - 2} more
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export { CalendarView }
export type { CalendarViewProps, CalendarEvent }

