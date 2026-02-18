/**
 * PremiumTimeGrid - Elegant paper planner time grid
 *
 * Features:
 * - 30-minute intervals with elegant grid lines
 * - Morning / Afternoon / Evening sections with color accents
 * - AM/PM labels with clean typography
 * - Beautiful even when empty (shows structure)
 * - Current time indicator
 * - Consistent with app design tokens
 *
 * @module codex/ui/planner/PremiumTimeGrid
 */

'use client'

import { useMemo, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { format, isSameDay, setHours, setMinutes } from 'date-fns'
import type { Task, CalendarEvent } from '@/lib/planner/types'
import { formatDuration } from '@/lib/planner/types'

interface PremiumTimeGridProps {
  date: Date
  tasks: Task[]
  events: CalendarEvent[]
  onSlotClick?: (date: Date, hour: number, minute: number) => void
  onTaskClick?: (task: Task) => void
  onEventClick?: (event: CalendarEvent) => void
  startHour?: number
  endHour?: number
  theme?: string
}

interface TimeSection {
  name: string
  startHour: number
  endHour: number
  accentColor: string
  bgColor: string
  textColor: string
}

const TIME_SECTIONS: TimeSection[] = [
  {
    name: 'Morning',
    startHour: 6,
    endHour: 12,
    accentColor: 'rose',
    bgColor: 'from-rose-50/50 to-transparent dark:from-rose-900/10',
    textColor: 'text-rose-400 dark:text-rose-400',
  },
  {
    name: 'Afternoon',
    startHour: 12,
    endHour: 18,
    accentColor: 'amber',
    bgColor: 'from-amber-50/50 to-transparent dark:from-amber-900/10',
    textColor: 'text-amber-500 dark:text-amber-400',
  },
  {
    name: 'Evening',
    startHour: 18,
    endHour: 24,
    accentColor: 'indigo',
    bgColor: 'from-indigo-50/50 to-transparent dark:from-indigo-900/10',
    textColor: 'text-indigo-400 dark:text-indigo-400',
  },
]

const priorityColors: Record<string, string> = {
  low: 'bg-emerald-100 dark:bg-emerald-900/40 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200',
  medium: 'bg-amber-100 dark:bg-amber-900/40 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200',
  high: 'bg-orange-100 dark:bg-orange-900/40 border-orange-300 dark:border-orange-700 text-orange-800 dark:text-orange-200',
  urgent: 'bg-rose-100 dark:bg-rose-900/40 border-rose-300 dark:border-rose-700 text-rose-800 dark:text-rose-200',
}

function formatHour(hour: number): { time: string; period: string } {
  const h = hour % 12 || 12
  const period = hour < 12 ? 'AM' : 'PM'
  return { time: `${h}:00`, period }
}

function HourBlock({
  hour,
  date,
  tasks,
  events,
  onSlotClick,
  onTaskClick,
  onEventClick,
  isDark,
  isCurrentHour,
  currentMinute,
}: {
  hour: number
  date: Date
  tasks: Task[]
  events: CalendarEvent[]
  onSlotClick?: (date: Date, hour: number, minute: number) => void
  onTaskClick?: (task: Task) => void
  onEventClick?: (event: CalendarEvent) => void
  isDark: boolean
  isCurrentHour: boolean
  currentMinute: number
}) {
  const { time, period } = formatHour(hour)

  // Get tasks/events for this hour (with null safety)
  const safeTasks = tasks && Array.isArray(tasks) ? tasks : []
  const safeEvents = events && Array.isArray(events) ? events : []

  const hourTasks = safeTasks.filter((t) => {
    if (!t.dueTime) return false
    const [h] = t.dueTime.split(':').map(Number)
    return h === hour
  })

  const hourEvents = safeEvents.filter((e) => {
    const start = new Date(e.startDatetime)
    return start.getHours() === hour
  })

  return (
    <div className="flex group">
      {/* Hour label */}
      <div className="w-16 flex-shrink-0 pr-3 text-right">
        <div
          className={`
            text-sm font-medium leading-none
            ${isDark ? 'text-zinc-400' : 'text-zinc-500'}
          `}
          style={{ fontFamily: 'var(--font-geist-mono)' }}
        >
          {time}
        </div>
        <div
          className={`
            text-[10px] uppercase tracking-wide mt-0.5
            ${isDark ? 'text-zinc-600' : 'text-zinc-400'}
          `}
          style={{ fontFamily: 'var(--font-geist-mono)' }}
        >
          {period}
        </div>
      </div>

      {/* Time slots */}
      <div className="flex-1 relative">
        {/* Current time indicator */}
        {isCurrentHour && (
          <div
            className="absolute left-0 right-0 z-20 pointer-events-none"
            style={{ top: `${(currentMinute / 60) * 100}%` }}
          >
            <div className="flex items-center">
              <div className="w-2 h-2 rounded-full bg-rose-500 -ml-1" />
              <div className="flex-1 h-0.5 bg-rose-500" />
            </div>
          </div>
        )}

        {/* Hour block with two 30-min slots */}
        <div
          className={`
            relative border-l-2 min-h-[60px]
            ${isDark ? 'border-zinc-700' : 'border-zinc-200'}
          `}
        >
          {/* First half (00-29) */}
          <div
            onClick={() => onSlotClick?.(date, hour, 0)}
            className={`
              h-[30px] border-b cursor-pointer transition-colors duration-150
              ${isDark
                ? 'border-dashed border-zinc-800 hover:bg-zinc-800/50'
                : 'border-dashed border-zinc-100 hover:bg-zinc-50'
              }
            `}
          >
            {/* Tasks/events starting in first half */}
            {hourTasks
              .filter((t) => {
                const [, m] = t.dueTime!.split(':').map(Number)
                return m < 30
              })
              .map((task) => (
                <TaskBlock
                  key={task.id}
                  task={task}
                  onClick={() => onTaskClick?.(task)}
                  isDark={isDark}
                />
              ))}
          </div>

          {/* Second half (30-59) */}
          <div
            onClick={() => onSlotClick?.(date, hour, 30)}
            className={`
              h-[30px] border-b cursor-pointer transition-colors duration-150
              ${isDark
                ? 'border-zinc-700 hover:bg-zinc-800/50'
                : 'border-zinc-200 hover:bg-zinc-50'
              }
            `}
          >
            {/* Tasks/events starting in second half */}
            {hourTasks
              .filter((t) => {
                const [, m] = t.dueTime!.split(':').map(Number)
                return m >= 30
              })
              .map((task) => (
                <TaskBlock
                  key={task.id}
                  task={task}
                  onClick={() => onTaskClick?.(task)}
                  isDark={isDark}
                />
              ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function TaskBlock({
  task,
  onClick,
  isDark,
}: {
  task: Task
  onClick?: () => void
  isDark: boolean
}) {
  const colors = priorityColors[task.priority] || priorityColors.medium
  const heightPx = task.duration ? Math.max(24, (task.duration / 30) * 30) : 24

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      onClick={(e) => {
        e.stopPropagation()
        onClick?.()
      }}
      className={`
        absolute left-1 right-1 z-10 px-2 py-1 rounded-lg border cursor-pointer
        transition-all duration-200 hover:shadow-md hover:scale-[1.02]
        ${colors}
      `}
      style={{
        height: `${heightPx}px`,
        minHeight: '24px',
      }}
    >
      <div className="flex items-start gap-1.5 overflow-hidden">
        <span className="font-medium text-xs truncate flex-1">{task.title}</span>
        {task.duration && (
          <span
            className="text-[10px] opacity-70 flex-shrink-0"
            style={{ fontFamily: 'var(--font-geist-mono)' }}
          >
            {formatDuration(task.duration)}
          </span>
        )}
      </div>
    </motion.div>
  )
}

function SectionHeader({
  section,
  isDark,
}: {
  section: TimeSection
  isDark: boolean
}) {
  return (
    <div
      className={`
        sticky top-0 z-10 py-2 px-4 mb-2
        bg-gradient-to-r ${section.bgColor}
        backdrop-blur-sm
      `}
    >
      <span
        className={`
          text-xs font-semibold uppercase tracking-[0.2em]
          ${section.textColor}
        `}
        style={{ fontFamily: 'var(--font-geist-sans)' }}
      >
        {section.name}
      </span>
    </div>
  )
}

export default function PremiumTimeGrid({
  date,
  tasks,
  events,
  onSlotClick,
  onTaskClick,
  onEventClick,
  startHour = 6,
  endHour = 22,
  theme = 'light',
}: PremiumTimeGridProps) {
  const isDark = theme.includes('dark')
  const [currentTime, setCurrentTime] = useState(new Date())

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(interval)
  }, [])

  const isToday = isSameDay(date, currentTime)
  const currentHour = currentTime.getHours()
  const currentMinute = currentTime.getMinutes()

  // Filter tasks for this date (with null safety)
  const dayTasks = useMemo(() => {
    if (!tasks || !Array.isArray(tasks)) return []
    return tasks.filter((t) => {
      if (!t.dueDate) return false
      return isSameDay(new Date(t.dueDate), date)
    })
  }, [tasks, date])

  // Filter events for this date (with null safety)
  const dayEvents = useMemo(() => {
    if (!events || !Array.isArray(events)) return []
    return events.filter((e) => {
      return isSameDay(new Date(e.startDatetime), date)
    })
  }, [events, date])

  // Generate hours array
  const hours = useMemo(() => {
    const h: number[] = []
    for (let i = startHour; i < endHour; i++) {
      h.push(i)
    }
    return h
  }, [startHour, endHour])

  // Group hours by section
  const sectionedHours = useMemo(() => {
    return TIME_SECTIONS.map((section) => ({
      section,
      hours: hours.filter((h) => h >= section.startHour && h < section.endHour),
    })).filter((s) => s.hours.length > 0)
  }, [hours])

  return (
    <div className={`
      flex-1 overflow-y-auto
      ${isDark ? 'bg-zinc-950' : 'bg-white'}
    `}>
      {/* Date header */}
      <div
        className={`
          sticky top-0 z-20 py-4 px-4 backdrop-blur-xl
          border-b
          ${isDark
            ? 'bg-zinc-950/90 border-zinc-800'
            : 'bg-white/90 border-zinc-200'
          }
        `}
      >
        <h2
          className={`
            text-xl font-semibold
            ${isDark ? 'text-zinc-100' : 'text-zinc-900'}
          `}
          style={{ fontFamily: 'var(--font-fraunces)' }}
        >
          {format(date, 'EEEE')}
        </h2>
        <p
          className={`
            text-sm mt-0.5
            ${isDark ? 'text-zinc-400' : 'text-zinc-500'}
          `}
          style={{ fontFamily: 'var(--font-geist-sans)' }}
        >
          {format(date, 'MMMM d, yyyy')}
        </p>
      </div>

      {/* Time sections */}
      <div className="py-4 px-2">
        {sectionedHours.map(({ section, hours: sectionHours }) => (
          <div key={section.name} className="mb-6">
            <SectionHeader section={section} isDark={isDark} />

            <div className="space-y-0">
              {sectionHours.map((hour) => (
                <HourBlock
                  key={hour}
                  hour={hour}
                  date={date}
                  tasks={dayTasks}
                  events={dayEvents}
                  onSlotClick={onSlotClick}
                  onTaskClick={onTaskClick}
                  onEventClick={onEventClick}
                  isDark={isDark}
                  isCurrentHour={isToday && hour === currentHour}
                  currentMinute={currentMinute}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
