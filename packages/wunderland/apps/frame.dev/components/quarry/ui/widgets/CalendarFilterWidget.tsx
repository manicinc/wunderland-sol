/**
 * Calendar Filter Widget Component
 * @module codex/ui/CalendarFilterWidget
 *
 * @remarks
 * A sleek, theme-aware calendar widget for filtering strands by date.
 * Supports single date selection and date range selection.
 * Integrates with the advanced filter system.
 */

'use client'

import React, { useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  X,
  CalendarDays,
  CalendarRange,
} from 'lucide-react'
import type { DateFilter, DateIndex } from '../../types'

interface CalendarFilterWidgetProps {
  /** Current date filter value */
  value: DateFilter
  /** Change handler */
  onChange: (filter: DateFilter) => void
  /** Date index for highlighting available dates */
  dateIndex?: DateIndex
  /** Whether the calendar popup is open */
  isOpen?: boolean
  /** Toggle open/closed */
  onToggle?: () => void
  /** Compact mode for inline trigger */
  compact?: boolean
  /** Optional class name */
  className?: string
}

/** Days of the week */
const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

/** Month names */
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

/** Quick preset options */
const PRESETS = [
  { label: 'Today', getValue: () => {
    const today = new Date().toISOString().split('T')[0]
    return { mode: 'single' as const, startDate: today }
  }},
  { label: 'This Week', getValue: () => {
    const today = new Date()
    const dayOfWeek = today.getDay()
    const start = new Date(today)
    start.setDate(today.getDate() - dayOfWeek)
    const end = new Date(start)
    end.setDate(start.getDate() + 6)
    return {
      mode: 'range' as const,
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
    }
  }},
  { label: 'This Month', getValue: () => {
    const today = new Date()
    const start = new Date(today.getFullYear(), today.getMonth(), 1)
    const end = new Date(today.getFullYear(), today.getMonth() + 1, 0)
    return {
      mode: 'range' as const,
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
    }
  }},
  { label: 'Last 30 Days', getValue: () => {
    const today = new Date()
    const start = new Date(today)
    start.setDate(today.getDate() - 30)
    return {
      mode: 'range' as const,
      startDate: start.toISOString().split('T')[0],
      endDate: today.toISOString().split('T')[0],
    }
  }},
]

/**
 * Get days in a month
 */
function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

/**
 * Get the day of week for the first day of a month (0 = Sunday)
 */
function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay()
}

/**
 * Format date for display
 */
function formatDateShort(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/**
 * Calendar Filter Widget
 *
 * @example
 * ```tsx
 * <CalendarFilterWidget
 *   value={dateFilter}
 *   onChange={setDateFilter}
 *   dateIndex={dateIndex}
 *   compact
 * />
 * ```
 */
export default function CalendarFilterWidget({
  value,
  onChange,
  dateIndex,
  isOpen: controlledIsOpen,
  onToggle,
  compact = false,
  className = '',
}: CalendarFilterWidgetProps) {
  // Local open state if not controlled
  const [localIsOpen, setLocalIsOpen] = useState(false)
  const isOpen = controlledIsOpen ?? localIsOpen
  const toggleOpen = onToggle ?? (() => setLocalIsOpen(prev => !prev))

  // Calendar navigation state
  const [viewYear, setViewYear] = useState(() => {
    if (value.startDate) {
      return parseInt(value.startDate.substring(0, 4), 10)
    }
    return new Date().getFullYear()
  })
  const [viewMonth, setViewMonth] = useState(() => {
    if (value.startDate) {
      return parseInt(value.startDate.substring(5, 7), 10) - 1
    }
    return new Date().getMonth()
  })

  // Range selection state
  const [rangeStart, setRangeStart] = useState<string | null>(null)
  const [isSelectingRange, setIsSelectingRange] = useState(false)

  // Set of dates that have content
  const availableDates = useMemo(() => {
    if (!dateIndex) return new Set<string>()
    return new Set(dateIndex.entries.map(e => e.date))
  }, [dateIndex])

  // Navigate months
  const goToPrevMonth = useCallback(() => {
    if (viewMonth === 0) {
      setViewMonth(11)
      setViewYear(prev => prev - 1)
    } else {
      setViewMonth(prev => prev - 1)
    }
  }, [viewMonth])

  const goToNextMonth = useCallback(() => {
    if (viewMonth === 11) {
      setViewMonth(0)
      setViewYear(prev => prev + 1)
    } else {
      setViewMonth(prev => prev + 1)
    }
  }, [viewMonth])

  // Handle date click
  const handleDateClick = useCallback((dateStr: string) => {
    if (isSelectingRange) {
      if (!rangeStart) {
        // First click - start the range
        setRangeStart(dateStr)
      } else {
        // Second click - complete the range
        const start = rangeStart < dateStr ? rangeStart : dateStr
        const end = rangeStart < dateStr ? dateStr : rangeStart
        onChange({ mode: 'range', startDate: start, endDate: end })
        setRangeStart(null)
        setIsSelectingRange(false)
      }
    } else {
      // Single date selection
      onChange({ mode: 'single', startDate: dateStr })
    }
  }, [isSelectingRange, rangeStart, onChange])

  // Toggle range mode
  const toggleRangeMode = useCallback(() => {
    setIsSelectingRange(prev => !prev)
    setRangeStart(null)
  }, [])

  // Clear filter
  const clearFilter = useCallback(() => {
    onChange({ mode: 'none' })
    setRangeStart(null)
    setIsSelectingRange(false)
  }, [onChange])

  // Apply preset
  const applyPreset = useCallback((preset: typeof PRESETS[0]) => {
    onChange(preset.getValue())
  }, [onChange])

  // Check if a date is in the current selection
  const isDateSelected = useCallback((dateStr: string): boolean => {
    if (value.mode === 'none') return false
    if (value.mode === 'single') return dateStr === value.startDate
    if (value.mode === 'range' && value.startDate && value.endDate) {
      return dateStr >= value.startDate && dateStr <= value.endDate
    }
    return false
  }, [value])

  // Check if a date is the start/end of range
  const isRangeEdge = useCallback((dateStr: string): 'start' | 'end' | null => {
    if (value.mode !== 'range') return null
    if (dateStr === value.startDate) return 'start'
    if (dateStr === value.endDate) return 'end'
    return null
  }, [value])

  // Generate calendar grid
  const calendarDays = useMemo(() => {
    const daysInMonth = getDaysInMonth(viewYear, viewMonth)
    const firstDay = getFirstDayOfMonth(viewYear, viewMonth)
    const days: Array<{ date: string; day: number; isCurrentMonth: boolean }> = []

    // Previous month padding
    const prevMonth = viewMonth === 0 ? 11 : viewMonth - 1
    const prevYear = viewMonth === 0 ? viewYear - 1 : viewYear
    const daysInPrevMonth = getDaysInMonth(prevYear, prevMonth)
    for (let i = firstDay - 1; i >= 0; i--) {
      const day = daysInPrevMonth - i
      const date = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      days.push({ date, day, isCurrentMonth: false })
    }

    // Current month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      days.push({ date, day, isCurrentMonth: true })
    }

    // Next month padding
    const nextMonth = viewMonth === 11 ? 0 : viewMonth + 1
    const nextYear = viewMonth === 11 ? viewYear + 1 : viewYear
    const remaining = 42 - days.length // 6 rows × 7 days
    for (let day = 1; day <= remaining; day++) {
      const date = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      days.push({ date, day, isCurrentMonth: false })
    }

    return days
  }, [viewYear, viewMonth])

  // Compact trigger button
  const triggerButton = (
    <button
      onClick={toggleOpen}
      className={`
        flex items-center gap-1 px-1.5 py-0.5 rounded border transition-all duration-200
        ${value.mode !== 'none'
          ? 'bg-cyan-100 dark:bg-cyan-900/30 border-cyan-300 dark:border-cyan-700 text-cyan-700 dark:text-cyan-300'
          : 'border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
        }
        focus:outline-none focus:ring-1 focus:ring-cyan-500
      `}
      title={value.mode === 'none' ? 'Filter by date' : 'Date filter active'}
      aria-label="Toggle date filter"
      aria-expanded={isOpen}
    >
      <Calendar className="w-3 h-3" />
      {value.mode !== 'none' && (
        <span className="text-[9px] font-medium">
          {value.mode === 'single' && value.startDate
            ? formatDateShort(value.startDate)
            : value.mode === 'range' && value.startDate && value.endDate
            ? `${formatDateShort(value.startDate)} - ${formatDateShort(value.endDate)}`
            : 'Date'
          }
        </span>
      )}
    </button>
  )

  if (compact && !isOpen) {
    return <div className={className}>{triggerButton}</div>
  }

  // When not in compact mode, always show calendar inline (no popup behavior)
  const showCalendar = !compact || isOpen

  return (
    <div className={`relative ${className}`}>
      {compact && triggerButton}

      <AnimatePresence>
        {showCalendar && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
            className={`
              ${compact ? 'absolute top-full left-0 mt-1 z-50' : ''}
              bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-700
              shadow-lg p-3 min-w-[280px]
            `}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={goToPrevMonth}
                  className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                  aria-label="Previous month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100 min-w-[120px] text-center">
                  {MONTHS[viewMonth]} {viewYear}
                </span>
                <button
                  onClick={goToNextMonth}
                  className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                  aria-label="Next month"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={toggleRangeMode}
                  className={`
                    p-1 rounded transition-colors
                    ${isSelectingRange
                      ? 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400'
                      : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500'
                    }
                  `}
                  title={isSelectingRange ? 'Single date mode' : 'Range mode'}
                  aria-pressed={isSelectingRange}
                >
                  {isSelectingRange ? <CalendarRange className="w-4 h-4" /> : <CalendarDays className="w-4 h-4" />}
                </button>
                {value.mode !== 'none' && (
                  <button
                    onClick={clearFilter}
                    className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-zinc-500 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                    title="Clear date filter"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Range selection hint */}
            {isSelectingRange && (
              <div className="text-[10px] text-cyan-600 dark:text-cyan-400 mb-2 text-center">
                {rangeStart
                  ? `Select end date (from ${formatDateShort(rangeStart)})`
                  : 'Select start date'
                }
              </div>
            )}

            {/* Days header */}
            <div className="grid grid-cols-7 gap-0.5 mb-1">
              {DAYS.map(day => (
                <div
                  key={day}
                  className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 text-center py-1"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-0.5">
              {calendarDays.map(({ date, day, isCurrentMonth }) => {
                const isSelected = isDateSelected(date)
                const hasContent = availableDates.has(date)
                const edge = isRangeEdge(date)
                const isToday = date === new Date().toISOString().split('T')[0]
                const isRangeStart = rangeStart === date

                return (
                  <button
                    key={date}
                    onClick={() => handleDateClick(date)}
                    disabled={!isCurrentMonth && !hasContent}
                    className={`
                      relative w-8 h-8 text-xs rounded transition-all duration-150
                      focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:ring-offset-1
                      ${!isCurrentMonth
                        ? 'text-zinc-300 dark:text-zinc-600'
                        : 'text-zinc-700 dark:text-zinc-300'
                      }
                      ${isSelected
                        ? edge === 'start'
                          ? 'bg-cyan-500 text-white rounded-l-full rounded-r-none'
                          : edge === 'end'
                          ? 'bg-cyan-500 text-white rounded-r-full rounded-l-none'
                          : value.mode === 'single'
                          ? 'bg-cyan-500 text-white'
                          : 'bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300 rounded-none'
                        : ''
                      }
                      ${isRangeStart ? 'ring-2 ring-cyan-500' : ''}
                      ${isToday && !isSelected ? 'font-bold text-cyan-600 dark:text-cyan-400' : ''}
                      ${!isSelected && isCurrentMonth ? 'hover:bg-zinc-100 dark:hover:bg-zinc-800' : ''}
                    `}
                  >
                    {day}
                    {/* Content indicator dot */}
                    {hasContent && !isSelected && (
                      <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-emerald-500" />
                    )}
                  </button>
                )
              })}
            </div>

            {/* Quick presets */}
            <div className="flex flex-wrap gap-1 mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-700">
              {PRESETS.map(preset => (
                <button
                  key={preset.label}
                  onClick={() => applyPreset(preset)}
                  className="px-2 py-1 text-[10px] rounded bg-zinc-100 dark:bg-zinc-800
                    text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700
                    transition-colors"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
