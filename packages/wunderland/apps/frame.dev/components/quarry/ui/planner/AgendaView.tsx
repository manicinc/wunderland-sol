'use client'

/**
 * Agenda View Component
 *
 * Premium list-based view of upcoming events and tasks with
 * smooth animations and refined visual design.
 *
 * @module components/quarry/ui/planner/AgendaView
 */

import { useMemo, useState, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { CalendarEvent, Task, PRIORITY_COLORS } from '@/lib/planner/types'
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  Circle,
  Download,
  Sparkles,
  CalendarDays,
  ListTodo,
  ChevronDown,
  ExternalLink,
} from 'lucide-react'
import { TodayIcon, RecurringIcon, GoogleCalendarIcon } from '@/lib/planner/icons/PlannerIcons'
import Tooltip from '../common/Tooltip'
import {
  getHolidaysForDate,
  getHolidayColor,
  DEFAULT_HOLIDAY_SETTINGS,
  type Holiday,
  type HolidaySettings,
} from '@/lib/planner/holidays'

// ============================================================================
// TYPES
// ============================================================================

interface AgendaViewProps {
  date: Date
  events: CalendarEvent[]
  tasks: Task[]
  daysToShow?: number
  onDateChange: (date: Date) => void
  onEventClick?: (event: CalendarEvent) => void
  onTaskClick?: (task: Task) => void
  onTaskToggle?: (taskId: string, completed: boolean) => void
  onExport?: (format: 'ics' | 'markdown' | 'csv' | 'text') => void
  theme?: 'light' | 'dark'
  className?: string
}

// ============================================================================
// CONSTANTS
// ============================================================================

const EVENT_COLORS: Record<string, { bg: string; border: string; text: string; glow: string }> = {
  default: {
    bg: 'bg-emerald-500/10',
    border: 'border-l-emerald-500',
    text: 'text-emerald-600 dark:text-emerald-400',
    glow: 'shadow-emerald-500/20',
  },
  blue: {
    bg: 'bg-blue-500/10',
    border: 'border-l-blue-500',
    text: 'text-blue-600 dark:text-blue-400',
    glow: 'shadow-blue-500/20',
  },
  purple: {
    bg: 'bg-purple-500/10',
    border: 'border-l-purple-500',
    text: 'text-purple-600 dark:text-purple-400',
    glow: 'shadow-purple-500/20',
  },
  pink: {
    bg: 'bg-pink-500/10',
    border: 'border-l-pink-500',
    text: 'text-pink-600 dark:text-pink-400',
    glow: 'shadow-pink-500/20',
  },
  orange: {
    bg: 'bg-orange-500/10',
    border: 'border-l-orange-500',
    text: 'text-orange-600 dark:text-orange-400',
    glow: 'shadow-orange-500/20',
  },
  red: {
    bg: 'bg-red-500/10',
    border: 'border-l-red-500',
    text: 'text-red-600 dark:text-red-400',
    glow: 'shadow-red-500/20',
  },
}

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 300, damping: 30 },
  },
}

const cardVariants = {
  hidden: { opacity: 0, x: -20, scale: 0.95 },
  visible: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: { type: 'spring', stiffness: 400, damping: 30 },
  },
  hover: {
    scale: 1.02,
    transition: { type: 'spring', stiffness: 400, damping: 25 },
  },
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function AgendaView({
  date,
  events,
  tasks,
  daysToShow = 14,
  onDateChange,
  onEventClick,
  onTaskClick,
  onTaskToggle,
  onExport,
  theme = 'dark',
  className,
}: AgendaViewProps) {
  const isDark = theme === 'dark'
  const [showExportMenu, setShowExportMenu] = useState(false)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const today = new Date()

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

  // Generate array of dates to display
  const agendaDates = useMemo(() => {
    const dates: Date[] = []
    for (let i = 0; i < daysToShow; i++) {
      const d = new Date(date)
      d.setDate(d.getDate() + i)
      dates.push(d)
    }
    return dates
  }, [date, daysToShow])

  // Group events and tasks by date (with null safety)
  const itemsByDate = useMemo(() => {
    const map = new Map<string, { events: CalendarEvent[]; tasks: Task[]; holidays: Holiday[] }>()

    agendaDates.forEach((d) => {
      const dateStr = d.toISOString().split('T')[0]
      const holidays = getHolidaysForDate(d, holidaySettings)
      map.set(dateStr, { events: [], tasks: [], holidays })
    })

    // Guard against undefined events
    if (events && Array.isArray(events)) {
      events.forEach((event) => {
        const eventDate = event.startDatetime.split('T')[0]
        if (map.has(eventDate)) {
          map.get(eventDate)!.events.push(event)
        }
      })
    }

    // Guard against undefined tasks
    if (tasks && Array.isArray(tasks)) {
      tasks.forEach((task) => {
        if (task.dueDate && map.has(task.dueDate)) {
          map.get(task.dueDate)!.tasks.push(task)
        }
      })
    }

    map.forEach((items) => {
      items.events.sort((a, b) => {
        if (a.allDay && !b.allDay) return -1
        if (!a.allDay && b.allDay) return 1
        return new Date(a.startDatetime).getTime() - new Date(b.startDatetime).getTime()
      })

      items.tasks.sort((a, b) => {
        const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 }
        const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority]
        if (priorityDiff !== 0) return priorityDiff
        if (a.dueTime && b.dueTime) return a.dueTime.localeCompare(b.dueTime)
        if (a.dueTime) return -1
        if (b.dueTime) return 1
        return 0
      })
    })

    return map
  }, [events, tasks, agendaDates, holidaySettings])

  // Navigation
  const goToPrev = useCallback(() => {
    const prev = new Date(date)
    prev.setDate(prev.getDate() - 7)
    onDateChange(prev)
  }, [date, onDateChange])

  const goToNext = useCallback(() => {
    const next = new Date(date)
    next.setDate(next.getDate() + 7)
    onDateChange(next)
  }, [date, onDateChange])

  const goToToday = useCallback(() => {
    onDateChange(new Date())
  }, [onDateChange])

  // Check if today is visible (with null safety for Suspense hydration)
  const isTodayVisible = useMemo(() => {
    if (!agendaDates || agendaDates.length === 0) return false
    return agendaDates.some(
      (d) =>
        d.getFullYear() === today.getFullYear() &&
        d.getMonth() === today.getMonth() &&
        d.getDate() === today.getDate()
    )
  }, [agendaDates, today])

  // Format date range for header
  const dateRangeLabel = useMemo(() => {
    if (!agendaDates || agendaDates.length === 0) {
      return 'No dates'
    }
    const start = agendaDates[0]
    const end = agendaDates[agendaDates.length - 1]

    if (start.getMonth() === end.getMonth()) {
      return `${start.toLocaleDateString('en-US', { month: 'long' })} ${start.getDate()} - ${end.getDate()}, ${start.getFullYear()}`
    }
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
  }, [agendaDates])

  // Count total items
  const totalItems = useMemo(() => {
    let eventCount = 0
    let taskCount = 0
    itemsByDate.forEach((items) => {
      eventCount += items?.events?.length ?? 0
      taskCount += items?.tasks?.length ?? 0
    })
    return { events: eventCount, tasks: taskCount }
  }, [itemsByDate])

  // Close export menu on click outside
  useEffect(() => {
    if (!showExportMenu) return
    const handler = () => setShowExportMenu(false)
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [showExportMenu])

  return (
    <div
      className={cn(
        'flex flex-col h-full overflow-hidden',
        isDark ? 'bg-zinc-950' : 'bg-zinc-50',
        className
      )}
    >
      {/* Header */}
      <header
        className={cn(
          'flex items-center justify-between px-4 py-3',
          'border-b shrink-0',
          isDark ? 'border-zinc-800 bg-zinc-900/80' : 'border-zinc-200 bg-white/80',
          'backdrop-blur-sm'
        )}
      >
        <div className="flex items-center gap-3">
          {/* Navigation arrows */}
          <div className="flex items-center gap-0.5">
            <Tooltip content="Previous week" shortcut="←" placement="bottom">
              <motion.button
                className={cn(
                  'p-1.5 rounded-lg transition-colors',
                  isDark
                    ? 'hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                    : 'hover:bg-zinc-100 text-zinc-500 hover:text-zinc-700'
                )}
                onClick={goToPrev}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                aria-label="Previous week"
              >
                <ChevronLeft size={18} />
              </motion.button>
            </Tooltip>
            <Tooltip content="Next week" shortcut="→" placement="bottom">
              <motion.button
                className={cn(
                  'p-1.5 rounded-lg transition-colors',
                  isDark
                    ? 'hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                    : 'hover:bg-zinc-100 text-zinc-500 hover:text-zinc-700'
                )}
                onClick={goToNext}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                aria-label="Next week"
              >
                <ChevronRight size={18} />
              </motion.button>
            </Tooltip>
          </div>

          {/* Date range label */}
          <div className="flex items-center gap-2">
            <CalendarDays
              size={18}
              className={cn(isDark ? 'text-zinc-500' : 'text-zinc-400')}
            />
            <h2
              className={cn(
                'text-lg font-semibold',
                isDark ? 'text-zinc-100' : 'text-zinc-900'
              )}
            >
              {dateRangeLabel}
            </h2>
          </div>

          {/* Item counts */}
          <div className="hidden sm:flex items-center gap-3 ml-3">
            {totalItems.events > 0 && (
              <span
                className={cn(
                  'flex items-center gap-1 text-xs',
                  isDark ? 'text-zinc-500' : 'text-zinc-400'
                )}
              >
                <Calendar size={12} />
                {totalItems.events} event{totalItems.events !== 1 ? 's' : ''}
              </span>
            )}
            {totalItems.tasks > 0 && (
              <span
                className={cn(
                  'flex items-center gap-1 text-xs',
                  isDark ? 'text-zinc-500' : 'text-zinc-400'
                )}
              >
                <ListTodo size={12} />
                {totalItems.tasks} task{totalItems.tasks !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Export button */}
          {onExport && (
            <div className="relative">
              <Tooltip content="Export agenda" placement="bottom">
                <motion.button
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowExportMenu(!showExportMenu)
                  }}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg',
                    'text-sm font-medium transition-colors',
                    isDark
                      ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                      : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'
                  )}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Download size={14} />
                  <span className="hidden sm:inline">Export</span>
                  <ChevronDown size={12} />
                </motion.button>
              </Tooltip>

              <AnimatePresence>
                {showExportMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    className={cn(
                      'absolute right-0 top-full mt-2 z-50',
                      'rounded-xl shadow-xl py-1.5 min-w-[140px]',
                      'border',
                      isDark
                        ? 'bg-zinc-900 border-zinc-800'
                        : 'bg-white border-zinc-200'
                    )}
                  >
                    {[
                      { format: 'ics', label: 'Calendar (.ics)' },
                      { format: 'markdown', label: 'Markdown' },
                      { format: 'csv', label: 'Spreadsheet (.csv)' },
                      { format: 'text', label: 'Plain Text' },
                    ].map(({ format, label }) => (
                      <button
                        key={format}
                        onClick={() => {
                          onExport(format as 'ics' | 'markdown' | 'csv' | 'text')
                          setShowExportMenu(false)
                        }}
                        className={cn(
                          'w-full px-3 py-2 text-left text-sm',
                          'transition-colors flex items-center gap-2',
                          isDark
                            ? 'hover:bg-zinc-800 text-zinc-300'
                            : 'hover:bg-zinc-100 text-zinc-700'
                        )}
                      >
                        <ExternalLink size={12} className="opacity-50" />
                        {label}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Today button */}
          {!isTodayVisible && (
            <Tooltip content="Jump to today" shortcut="T" placement="bottom">
              <motion.button
                onClick={goToToday}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg',
                  'text-sm font-medium transition-colors',
                  isDark
                    ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                    : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'
                )}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <TodayIcon size={14} />
                <span className="hidden sm:inline">Today</span>
              </motion.button>
            </Tooltip>
          )}
        </div>
      </header>

      {/* Agenda list */}
      <motion.div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="max-w-3xl mx-auto py-4 px-4">
          {agendaDates.map((agendaDate, index) => {
            const dateStr = agendaDate.toISOString().split('T')[0]
            const items = itemsByDate.get(dateStr)!
            const hasItems =
              (items?.events?.length ?? 0) > 0 || (items?.tasks?.length ?? 0) > 0 || (items?.holidays?.length ?? 0) > 0

            const isToday =
              agendaDate.getFullYear() === today.getFullYear() &&
              agendaDate.getMonth() === today.getMonth() &&
              agendaDate.getDate() === today.getDate()

            const isPast =
              agendaDate < new Date(today.getFullYear(), today.getMonth(), today.getDate())

            if (!hasItems && isPast) return null

            return (
              <motion.div key={dateStr} variants={itemVariants}>
                <AgendaDaySection
                  date={agendaDate}
                  isToday={isToday}
                  isPast={isPast}
                  events={items.events}
                  tasks={items.tasks}
                  holidays={items.holidays}
                  onEventClick={onEventClick}
                  onTaskClick={onTaskClick}
                  onTaskToggle={onTaskToggle}
                  theme={theme}
                  isFirst={index === 0}
                />
              </motion.div>
            )
          })}

          {/* Empty state */}
          {totalItems.events === 0 && totalItems.tasks === 0 && (
            <motion.div
              className={cn(
                'flex flex-col items-center justify-center py-16 px-8',
                'text-center'
              )}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
            >
              <div
                className={cn(
                  'w-20 h-20 rounded-2xl flex items-center justify-center mb-4',
                  isDark ? 'bg-zinc-800/50' : 'bg-zinc-100'
                )}
              >
                <CalendarDays
                  size={40}
                  className={cn(isDark ? 'text-zinc-600' : 'text-zinc-400')}
                />
              </div>
              <h3
                className={cn(
                  'text-lg font-semibold mb-2',
                  isDark ? 'text-zinc-300' : 'text-zinc-700'
                )}
              >
                Your agenda is clear
              </h3>
              <p
                className={cn(
                  'text-sm max-w-xs',
                  isDark ? 'text-zinc-500' : 'text-zinc-500'
                )}
              >
                No events or tasks scheduled for the next {daysToShow} days.
                Enjoy your free time!
              </p>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  )
}

// ============================================================================
// DAY SECTION
// ============================================================================

interface AgendaDaySectionProps {
  date: Date
  isToday: boolean
  isPast: boolean
  events: CalendarEvent[]
  tasks: Task[]
  holidays: Holiday[]
  onEventClick?: (event: CalendarEvent) => void
  onTaskClick?: (task: Task) => void
  onTaskToggle?: (taskId: string, completed: boolean) => void
  theme?: 'light' | 'dark'
  isFirst?: boolean
}

function AgendaDaySection({
  date,
  isToday,
  isPast,
  events = [],
  tasks = [],
  holidays = [],
  onEventClick,
  onTaskClick,
  onTaskToggle,
  theme = 'dark',
  isFirst = false,
}: AgendaDaySectionProps) {
  const isDark = theme === 'dark'
  const hasItems = (events?.length ?? 0) > 0 || (tasks?.length ?? 0) > 0

  return (
    <div
      className={cn(
        'mb-6',
        isPast && !isToday && 'opacity-60'
      )}
    >
      {/* Date header */}
      <div className="flex items-center gap-3 mb-3">
        {/* Date circle */}
        <motion.div
          className={cn(
            'relative w-12 h-12 rounded-xl flex flex-col items-center justify-center',
            'shadow-sm',
            isToday
              ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-emerald-500/30'
              : isDark
                ? 'bg-zinc-800 border border-zinc-700'
                : 'bg-white border border-zinc-200'
          )}
          whileHover={{ scale: 1.05 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        >
          <span
            className={cn(
              'text-[10px] font-semibold uppercase tracking-wider leading-tight',
              !isToday && (isDark ? 'text-zinc-500' : 'text-zinc-400')
            )}
          >
            {date.toLocaleDateString('en-US', { weekday: 'short' })}
          </span>
          <span
            className={cn(
              'text-lg font-bold leading-tight',
              !isToday && (isDark ? 'text-zinc-200' : 'text-zinc-800')
            )}
          >
            {date.getDate()}
          </span>
          {isToday && (
            <motion.div
              className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full border-2 border-zinc-950"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
            />
          )}
        </motion.div>

        {/* Date info */}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'text-sm font-medium',
                isToday
                  ? 'text-emerald-500'
                  : isDark
                    ? 'text-zinc-300'
                    : 'text-zinc-700'
              )}
            >
              {date.toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
            {isToday && (
              <span
                className={cn(
                  'px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide',
                  'bg-emerald-500/20 text-emerald-400'
                )}
              >
                Today
              </span>
            )}
          </div>

          {/* Holidays */}
          {holidays && holidays.length > 0 && (
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              {holidays.map((holiday, idx) => {
                const colors = getHolidayColor(holiday.type)
                return (
                  <span
                    key={`${holiday.date}-${idx}`}
                    className={cn(
                      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full',
                      'text-[10px] font-medium border',
                      colors.bg,
                      colors.text,
                      colors.border
                    )}
                  >
                    <Sparkles size={10} />
                    {holiday.name}
                  </span>
                )
              })}
            </div>
          )}
        </div>

        {/* Item count */}
        {hasItems && (
          <div
            className={cn(
              'text-xs',
              isDark ? 'text-zinc-600' : 'text-zinc-400'
            )}
          >
            {(events?.length || 0) + (tasks?.length || 0)} item{(events?.length || 0) + (tasks?.length || 0) !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Items */}
      {hasItems ? (
        <div className="space-y-2 pl-15">
          <AnimatePresence>
            {/* Events */}
            {events.map((event, idx) => (
              <motion.div
                key={event.id}
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                whileHover="hover"
                transition={{ delay: idx * 0.05 }}
              >
                <AgendaEventItem
                  event={event}
                  onClick={() => onEventClick?.(event)}
                  theme={theme}
                />
              </motion.div>
            ))}

            {/* Tasks */}
            {tasks.map((task, idx) => (
              <motion.div
                key={task.id}
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                whileHover="hover"
                transition={{ delay: ((events?.length || 0) + idx) * 0.05 }}
              >
                <AgendaTaskItem
                  task={task}
                  onClick={() => onTaskClick?.(task)}
                  onToggle={(completed) => onTaskToggle?.(task.id, completed)}
                  theme={theme}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <div
          className={cn(
            'pl-15 py-2 text-sm italic',
            isDark ? 'text-zinc-600' : 'text-zinc-400'
          )}
        >
          No scheduled items
        </div>
      )}
    </div>
  )
}

// ============================================================================
// EVENT ITEM
// ============================================================================

interface AgendaEventItemProps {
  event: CalendarEvent
  onClick?: () => void
  theme?: 'light' | 'dark'
}

function AgendaEventItem({ event, onClick, theme = 'dark' }: AgendaEventItemProps) {
  const isDark = theme === 'dark'
  const colors = EVENT_COLORS[event.color || 'default'] || EVENT_COLORS.default

  const timeLabel = event.allDay
    ? 'All day'
    : `${formatTime(event.startDatetime)} - ${formatTime(event.endDatetime)}`

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left px-4 py-3 rounded-xl',
        'border-l-4 transition-all duration-200',
        'group',
        isDark
          ? 'bg-zinc-900/50 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700'
          : 'bg-white hover:bg-zinc-50 border border-zinc-200 hover:border-zinc-300',
        colors.border,
        'hover:shadow-lg',
        colors.glow
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div
            className={cn(
              'font-medium truncate group-hover:text-opacity-100',
              colors.text
            )}
          >
            {event.title}
          </div>

          <div
            className={cn(
              'flex items-center gap-3 mt-1.5 text-xs',
              isDark ? 'text-zinc-500' : 'text-zinc-500'
            )}
          >
            <div className="flex items-center gap-1">
              <Clock size={12} />
              {timeLabel}
            </div>

            {event.location && (
              <div className="flex items-center gap-1 truncate">
                <MapPin size={12} />
                <span className="truncate">{event.location}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {event.recurrenceRule && (
            <RecurringIcon
              size={14}
              className={cn(isDark ? 'text-zinc-600' : 'text-zinc-400')}
            />
          )}
          {event.googleEventId && <GoogleCalendarIcon size={14} />}
        </div>
      </div>
    </button>
  )
}

// ============================================================================
// TASK ITEM
// ============================================================================

interface AgendaTaskItemProps {
  task: Task
  onClick?: () => void
  onToggle?: (completed: boolean) => void
  theme?: 'light' | 'dark'
}

function AgendaTaskItem({ task, onClick, onToggle, theme = 'dark' }: AgendaTaskItemProps) {
  const isDark = theme === 'dark'
  const isCompleted = task.status === 'completed'
  const priorityColors = PRIORITY_COLORS[task.priority]

  return (
    <div
      className={cn(
        'flex items-start gap-3 px-4 py-3 rounded-xl',
        'transition-all duration-200 cursor-pointer group',
        isDark
          ? 'bg-zinc-900/50 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700'
          : 'bg-white hover:bg-zinc-50 border border-zinc-200 hover:border-zinc-300',
        'hover:shadow-lg',
        isCompleted && 'opacity-50'
      )}
      onClick={onClick}
    >
      {/* Checkbox */}
      <motion.button
        onClick={(e) => {
          e.stopPropagation()
          onToggle?.(!isCompleted)
        }}
        className="mt-0.5 flex-shrink-0"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        {isCompleted ? (
          <CheckCircle2 size={20} className="text-emerald-500" />
        ) : (
          <Circle
            size={20}
            className={cn(
              'transition-colors',
              isDark
                ? 'text-zinc-600 hover:text-emerald-500'
                : 'text-zinc-400 hover:text-emerald-500'
            )}
          />
        )}
      </motion.button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div
          className={cn(
            'font-medium',
            isDark ? 'text-zinc-200' : 'text-zinc-800',
            isCompleted && 'line-through text-zinc-500'
          )}
        >
          {task.title}
        </div>

        <div className="flex items-center gap-2 mt-1.5">
          {/* Priority badge */}
          <span
            className={cn(
              'px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide',
              priorityColors.bg,
              priorityColors.text
            )}
          >
            {task.priority}
          </span>

          {/* Due time */}
          {task.dueTime && (
            <span
              className={cn(
                'flex items-center gap-1 text-xs',
                isDark ? 'text-zinc-500' : 'text-zinc-500'
              )}
            >
              <Clock size={12} />
              {formatDueTime(task.dueTime)}
            </span>
          )}

          {/* Duration */}
          {task.duration && (
            <span
              className={cn(
                'text-xs',
                isDark ? 'text-zinc-600' : 'text-zinc-400'
              )}
            >
              {task.duration >= 60 ? `${Math.floor(task.duration / 60)}h${task.duration % 60 ? ` ${task.duration % 60}m` : ''}` : `${task.duration}m`}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// HELPERS
// ============================================================================

function formatTime(datetime: string): string {
  return new Date(datetime).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatDueTime(time: string): string {
  const [hours, minutes] = time.split(':').map(Number)
  const date = new Date()
  date.setHours(hours, minutes)
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

export default AgendaView
