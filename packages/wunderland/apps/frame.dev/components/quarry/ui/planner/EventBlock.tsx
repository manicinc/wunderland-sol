'use client'

/**
 * Event Block Component
 *
 * Renders a calendar event in the time grid
 * @module components/quarry/ui/planner/EventBlock
 */

import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import { CalendarEvent, Task } from '@/lib/planner/types'
import { DragHandleIcon, RecurringIcon } from '@/lib/planner/icons/PlannerIcons'
import { Clock, MapPin, Users, CheckCircle2, Circle } from 'lucide-react'

// Color palette for events
const EVENT_COLORS = {
  default: {
    bg: 'bg-emerald-100 dark:bg-emerald-900/40',
    border: 'border-l-emerald-500',
    text: 'text-emerald-800 dark:text-emerald-200',
  },
  blue: {
    bg: 'bg-blue-100 dark:bg-blue-900/40',
    border: 'border-l-blue-500',
    text: 'text-blue-800 dark:text-blue-200',
  },
  purple: {
    bg: 'bg-purple-100 dark:bg-purple-900/40',
    border: 'border-l-purple-500',
    text: 'text-purple-800 dark:text-purple-200',
  },
  pink: {
    bg: 'bg-pink-100 dark:bg-pink-900/40',
    border: 'border-l-pink-500',
    text: 'text-pink-800 dark:text-pink-200',
  },
  orange: {
    bg: 'bg-orange-100 dark:bg-orange-900/40',
    border: 'border-l-orange-500',
    text: 'text-orange-800 dark:text-orange-200',
  },
  red: {
    bg: 'bg-red-100 dark:bg-red-900/40',
    border: 'border-l-red-500',
    text: 'text-red-800 dark:text-red-200',
  },
  yellow: {
    bg: 'bg-yellow-100 dark:bg-yellow-900/40',
    border: 'border-l-yellow-500',
    text: 'text-yellow-800 dark:text-yellow-200',
  },
  teal: {
    bg: 'bg-teal-100 dark:bg-teal-900/40',
    border: 'border-l-teal-500',
    text: 'text-teal-800 dark:text-teal-200',
  },
}

type EventColor = keyof typeof EVENT_COLORS

interface EventBlockProps {
  event: CalendarEvent
  onClick?: () => void
  onDragStart?: (e: React.DragEvent) => void
  style?: React.CSSProperties
  compact?: boolean
  className?: string
}

export function EventBlock({
  event,
  onClick,
  onDragStart,
  style,
  compact = false,
  className,
}: EventBlockProps) {
  const color = (event.color as EventColor) || 'default'
  const colorStyles = EVENT_COLORS[color] || EVENT_COLORS.default

  const startTime = useMemo(() => {
    const date = new Date(event.startDatetime)
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  }, [event.startDatetime])

  const endTime = useMemo(() => {
    const date = new Date(event.endDatetime)
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  }, [event.endDatetime])

  const hasAttendees = event.attendees && event.attendees.length > 0
  const hasLocation = !!event.location
  const isRecurring = !!event.recurrenceRule
  const isFromGoogle = !!event.googleEventId

  return (
    <div
      className={cn(
        'absolute left-1 right-1 rounded-lg overflow-hidden',
        'border-l-[3px] cursor-pointer',
        'transition-all duration-150',
        'hover:shadow-md hover:z-10',
        'group',
        colorStyles.bg,
        colorStyles.border,
        className
      )}
      style={style}
      onClick={onClick}
      draggable={!!onDragStart}
      onDragStart={onDragStart}
    >
      {/* Drag handle (visible on hover) */}
      {onDragStart && (
        <div
          className={cn(
            'absolute top-0 right-0 p-0.5',
            'opacity-0 group-hover:opacity-100',
            'transition-opacity cursor-grab active:cursor-grabbing'
          )}
        >
          <DragHandleIcon size={12} className="text-stone-400" />
        </div>
      )}

      <div className="p-1.5 h-full flex flex-col">
        {/* Title */}
        <div
          className={cn(
            'font-medium truncate',
            compact ? 'text-[10px]' : 'text-xs',
            colorStyles.text
          )}
        >
          {event.title}
        </div>

        {/* Time (if not compact) */}
        {!compact && (
          <div
            className={cn(
              'flex items-center gap-1 text-[10px] mt-0.5',
              'text-stone-500 dark:text-stone-400'
            )}
          >
            <Clock size={10} />
            <span>
              {startTime} - {endTime}
            </span>
          </div>
        )}

        {/* Additional info (if space allows) */}
        {!compact && (
          <div className="flex items-center gap-2 mt-auto pt-1">
            {hasLocation && (
              <div
                className="flex items-center gap-0.5 text-[10px] text-stone-500 dark:text-stone-400 truncate"
                title={event.location}
              >
                <MapPin size={10} className="flex-shrink-0" />
                <span className="truncate">{event.location}</span>
              </div>
            )}

            {hasAttendees && (
              <div className="flex items-center gap-0.5 text-[10px] text-stone-500 dark:text-stone-400">
                <Users size={10} />
                <span>{event.attendees?.length ?? 0}</span>
              </div>
            )}

            {isRecurring && (
              <RecurringIcon size={10} className="text-stone-400" />
            )}

            {isFromGoogle && (
              <div
                className="w-2 h-2 rounded-full bg-blue-500"
                title="Synced from Google Calendar"
              />
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Task Block Component - for tasks with due times
 */
interface TaskBlockProps {
  task: Task
  onClick?: () => void
  onToggle?: (completed: boolean) => void
  style?: React.CSSProperties
  compact?: boolean
  className?: string
}

export function TaskBlock({
  task,
  onClick,
  onToggle,
  style,
  compact = false,
  className,
}: TaskBlockProps) {
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
        'absolute left-1 right-1 rounded-md overflow-hidden',
        'border-l-[3px] cursor-pointer',
        'transition-all duration-150',
        'hover:shadow-md hover:z-10',
        priorityColors[task.priority],
        isCompleted && 'opacity-60',
        className
      )}
      style={style}
      onClick={onClick}
    >
      <div className="p-1.5 h-full flex items-start gap-1.5">
        {/* Checkbox */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            onToggle?.(!isCompleted)
          }}
          className="flex-shrink-0 mt-0.5"
        >
          {isCompleted ? (
            <CheckCircle2
              size={compact ? 12 : 14}
              className="text-emerald-500"
            />
          ) : (
            <Circle
              size={compact ? 12 : 14}
              className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-300"
            />
          )}
        </button>

        {/* Title */}
        <div
          className={cn(
            'font-medium truncate flex-1',
            compact ? 'text-[10px]' : 'text-xs',
            'text-stone-700 dark:text-stone-200',
            isCompleted && 'line-through'
          )}
        >
          {task.title}
        </div>
      </div>
    </div>
  )
}

/**
 * Calculate event position in the time grid
 */
export function calculateEventPosition(
  event: CalendarEvent,
  startHour: number,
  slotHeight: number
): { top: number; height: number } {
  const start = new Date(event.startDatetime)
  const end = new Date(event.endDatetime)

  const startMinutes = start.getHours() * 60 + start.getMinutes()
  const endMinutes = end.getHours() * 60 + end.getMinutes()

  const startOffset = startMinutes - startHour * 60
  const duration = endMinutes - startMinutes

  const top = (startOffset / 60) * slotHeight
  const height = Math.max((duration / 60) * slotHeight, 20) // Minimum 20px height

  return { top, height }
}

/**
 * Calculate task position in the time grid
 */
export function calculateTaskPosition(
  task: Task,
  startHour: number,
  slotHeight: number
): { top: number; height: number } | null {
  if (!task.dueTime) return null

  const [hours, minutes] = task.dueTime.split(':').map(Number)
  const taskMinutes = hours * 60 + minutes
  const startOffset = taskMinutes - startHour * 60

  const top = (startOffset / 60) * slotHeight
  // Use task duration if set, otherwise default to 30 minutes
  const durationMinutes = task.duration || 30
  const height = Math.max((durationMinutes / 60) * slotHeight, 20) // Minimum 20px height

  return { top, height }
}

export default EventBlock
