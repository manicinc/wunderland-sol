/**
 * Mini Calendar Widget
 *
 * Compact monthly calendar with task/event indicators.
 * @module components/quarry/dashboard/widgets/MiniCalendarWidget
 */

'use client'

import React, { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
} from 'lucide-react'
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  isSameDay,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
} from 'date-fns'
import { useTasks } from '@/lib/planner/hooks/useTasks'
import type { WidgetProps } from '../types'

export function MiniCalendarWidget({
  theme,
  size,
  onNavigate,
  compact = false,
}: WidgetProps) {
  const isDark = theme.includes('dark')
  const [currentMonth, setCurrentMonth] = useState(new Date())

  const { tasks } = useTasks({ includeCompleted: false })

  // Get days with tasks
  const daysWithTasks = useMemo(() => {
    const days = new Set<string>()
    tasks.forEach((task) => {
      if (task.dueDate) {
        days.add(task.dueDate.split('T')[0])
      }
    })
    return days
  }, [tasks])

  // Calendar days
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(currentMonth)
    const calStart = startOfWeek(monthStart)
    const calEnd = endOfWeek(monthEnd)

    return eachDayOfInterval({ start: calStart, end: calEnd })
  }, [currentMonth])

  const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

  const handleDayClick = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    onNavigate(`/quarry/plan?date=${dateStr}`)
  }

  if (compact) {
    // Ultra-compact: just show today and this month name
    return (
      <div
        className="flex items-center justify-between cursor-pointer hover:opacity-80"
        onClick={() => onNavigate('/quarry/plan')}
      >
        <div>
          <p className={`text-2xl font-bold ${isDark ? 'text-zinc-100' : 'text-zinc-800'}`}>
            {format(new Date(), 'd')}
          </p>
          <p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
            {format(new Date(), 'EEEE')}
          </p>
        </div>
        <div className="text-right">
          <p className={`text-sm font-medium ${isDark ? 'text-zinc-300' : 'text-zinc-600'}`}>
            {format(new Date(), 'MMMM')}
          </p>
          <p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
            {format(new Date(), 'yyyy')}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          className={`p-1 rounded ${isDark ? 'hover:bg-zinc-700' : 'hover:bg-zinc-100'}`}
        >
          <ChevronLeft className={`w-4 h-4 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`} />
        </button>
        <span className={`text-sm font-medium ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
          {format(currentMonth, 'MMMM yyyy')}
        </span>
        <button
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          className={`p-1 rounded ${isDark ? 'hover:bg-zinc-700' : 'hover:bg-zinc-100'}`}
        >
          <ChevronRight className={`w-4 h-4 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`} />
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1">
        {weekDays.map((day) => (
          <div
            key={day}
            className={`text-center text-[10px] font-medium py-1 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((day) => {
          const dateStr = format(day, 'yyyy-MM-dd')
          const hasTasks = daysWithTasks.has(dateStr)
          const isCurrentMonth = isSameMonth(day, currentMonth)
          const isTodayDate = isToday(day)

          return (
            <button
              key={dateStr}
              onClick={() => handleDayClick(day)}
              className={`
                relative aspect-square flex items-center justify-center rounded text-xs
                ${isCurrentMonth
                  ? isDark
                    ? 'text-zinc-200'
                    : 'text-zinc-800'
                  : isDark
                    ? 'text-zinc-600'
                    : 'text-zinc-300'
                }
                ${isTodayDate
                  ? isDark
                    ? 'bg-rose-500 text-white font-bold'
                    : 'bg-rose-500 text-white font-bold'
                  : isDark
                    ? 'hover:bg-zinc-700'
                    : 'hover:bg-zinc-100'
                }
                transition-colors
              `}
            >
              {format(day, 'd')}
              {/* Task indicator dot */}
              {hasTasks && !isTodayDate && (
                <span
                  className={`
                    absolute bottom-0.5 left-1/2 -translate-x-1/2
                    w-1 h-1 rounded-full bg-rose-500
                  `}
                />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default MiniCalendarWidget
