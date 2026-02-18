'use client'

/**
 * Week Day Strip
 *
 * Horizontal week navigation showing MON-SUN with dates,
 * TODAY badge on current day, and tap-to-select functionality.
 *
 * @module components/quarry/ui/planner/WeekDayStrip
 */

import { useMemo, useCallback } from 'react'
import { motion } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import Tooltip from '../common/Tooltip'

// ============================================================================
// TYPES
// ============================================================================

export interface WeekDayStripProps {
  /** Currently selected date */
  selectedDate: Date
  /** Called when a day is selected */
  onDateSelect: (date: Date) => void
  /** Show month/year header above week strip */
  showMonthHeader?: boolean
  /** Called when month header is clicked */
  onMonthClick?: () => void
  /** Theme */
  theme?: 'light' | 'dark'
  /** Additional class names */
  className?: string
}

interface DayInfo {
  date: Date
  dayOfWeek: string // MON, TUE, etc.
  dayNumber: number
  monthName?: string // Only shown if different from previous day
  isToday: boolean
  isSelected: boolean
  isPast: boolean
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DAY_NAMES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
const DAY_NAMES_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

// ============================================================================
// HELPERS
// ============================================================================

function getWeekDays(centerDate: Date): DayInfo[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Get the start of the week (Monday)
  const startOfWeek = new Date(centerDate)
  const dayOfWeek = startOfWeek.getDay()
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek // Monday = 0, Sunday = 6
  startOfWeek.setDate(startOfWeek.getDate() + diff)
  startOfWeek.setHours(0, 0, 0, 0)

  const days: DayInfo[] = []
  let prevMonth = -1

  for (let i = 0; i < 7; i++) {
    const date = new Date(startOfWeek)
    date.setDate(startOfWeek.getDate() + i)

    const currentMonth = date.getMonth()
    const showMonth = currentMonth !== prevMonth
    prevMonth = currentMonth

    days.push({
      date,
      dayOfWeek: DAY_NAMES[date.getDay()],
      dayNumber: date.getDate(),
      monthName: showMonth
        ? date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()
        : undefined,
      isToday:
        date.getFullYear() === today.getFullYear() &&
        date.getMonth() === today.getMonth() &&
        date.getDate() === today.getDate(),
      isSelected:
        date.getFullYear() === centerDate.getFullYear() &&
        date.getMonth() === centerDate.getMonth() &&
        date.getDate() === centerDate.getDate(),
      isPast: date < today,
    })
  }

  return days
}

// ============================================================================
// COMPONENT
// ============================================================================

export function WeekDayStrip({
  selectedDate,
  onDateSelect,
  showMonthHeader = true,
  onMonthClick,
  theme = 'light',
  className,
}: WeekDayStripProps) {
  const isDark = theme === 'dark'

  // Generate week days
  const weekDays = useMemo(() => getWeekDays(selectedDate), [selectedDate])

  // Format month/year header
  const monthYearHeader = useMemo(() => {
    return selectedDate.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    })
  }, [selectedDate])

  // Handle day click
  const handleDayClick = useCallback(
    (date: Date) => {
      onDateSelect(date)
    },
    [onDateSelect]
  )

  return (
    <div
      className={cn(
        'w-full',
        isDark ? 'bg-zinc-900' : 'bg-white',
        className
      )}
    >
      {/* Month/Year Header */}
      {showMonthHeader && (
        <Tooltip
          content={onMonthClick ? 'Open Calendar' : monthYearHeader}
          description={onMonthClick ? 'Click to open month view' : undefined}
          placement="bottom"
        >
          <button
            className={cn(
              'w-full flex items-center justify-between px-4 py-3',
              'transition-colors',
              onMonthClick && (isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-50')
            )}
            onClick={onMonthClick}
            disabled={!onMonthClick}
          >
            <h2
              className={cn(
                'text-2xl font-bold',
                isDark ? 'text-zinc-100' : 'text-zinc-900'
              )}
            >
              {monthYearHeader}
            </h2>
            {onMonthClick && (
              <ChevronDown
                size={20}
                className={isDark ? 'text-zinc-400' : 'text-zinc-500'}
              />
            )}
          </button>
        </Tooltip>
      )}

      {/* Week Day Strip */}
      <div className="flex items-stretch justify-between px-2 pb-3">
        {weekDays.map((day, index) => (
          <Tooltip
            key={day.date.toISOString()}
            content={day.date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            description={day.isToday ? 'Today' : day.isPast ? 'Past date' : 'Click to view this day'}
            placement="bottom"
          >
            <motion.button
              className={cn(
                'flex-1 flex flex-col items-center py-3 sm:py-2 mx-0.5 rounded-xl',
                'transition-colors relative min-w-[44px]',
                day.isSelected
                  ? isDark
                    ? 'bg-red-600 active:bg-red-700'
                    : 'bg-red-500 active:bg-red-600'
                  : isDark
                    ? 'hover:bg-zinc-800 active:bg-zinc-700'
                    : 'hover:bg-zinc-100 active:bg-zinc-200'
              )}
              onClick={() => handleDayClick(day.date)}
              whileTap={{ scale: 0.95 }}
            >
              {/* Day of week */}
              <span
                className={cn(
                  'text-[10px] sm:text-xs font-medium tracking-wide',
                  day.isSelected
                    ? 'text-white/80'
                    : day.isPast
                      ? isDark
                        ? 'text-zinc-500'
                        : 'text-zinc-500'
                      : isDark
                        ? 'text-zinc-400'
                        : 'text-zinc-500'
                )}
              >
                {day.dayOfWeek}
              </span>

              {/* Day number */}
              <span
                className={cn(
                  'text-lg font-semibold mt-0.5',
                  day.isSelected
                    ? 'text-white'
                    : day.isToday
                      ? 'text-red-500'
                      : day.isPast
                        ? isDark
                          ? 'text-zinc-500'
                          : 'text-zinc-500'
                        : isDark
                          ? 'text-zinc-200'
                          : 'text-zinc-800'
                )}
              >
                {day.dayNumber}
              </span>

              {/* Month indicator (when crossing month boundary) */}
              {day.monthName && (
                <span
                  className={cn(
                    'text-[8px] font-medium mt-0.5',
                    day.isSelected
                      ? 'text-white/70'
                      : isDark
                        ? 'text-zinc-500'
                        : 'text-zinc-400'
                  )}
                >
                  {day.monthName}
                </span>
              )}

              {/* TODAY badge */}
              {day.isToday && (
                <motion.span
                  className={cn(
                    'absolute -bottom-1 left-1/2 -translate-x-1/2',
                    'px-1.5 py-0.5 rounded text-[8px] font-bold',
                    day.isSelected
                      ? 'bg-white/20 text-white'
                      : 'bg-red-500 text-white'
                  )}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', delay: index * 0.02 }}
                >
                  TODAY
                </motion.span>
              )}
            </motion.button>
          </Tooltip>
        ))}
      </div>

      {/* Collapse indicator */}
      <div className="flex justify-center pb-2">
        <div
          className={cn(
            'w-8 h-1 rounded-full',
            isDark ? 'bg-zinc-700' : 'bg-zinc-300'
          )}
        />
      </div>
    </div>
  )
}

export default WeekDayStrip
