'use client'

/**
 * Streamlined Day View
 *
 * Premium timeline-based day planner with vertical spine layout.
 * Features animated event cards, current time indicator, and
 * end-of-day countdowns.
 *
 * @module components/quarry/ui/planner/StreamlinedDayView
 */

import { useMemo, useCallback, useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Plus,
  Settings,
  Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { TodayIcon } from '@/lib/planner/icons/PlannerIcons'
import Tooltip from '../common/Tooltip'
import { TimelineSpine } from './TimelineSpine'
import { EndOfDayCountdown, type CountdownConfig } from './EndOfDayCountdown'
import { WeekDayStrip } from './WeekDayStrip'
import { EditTimeBlockModal, type TimeBlockData } from './EditTimeBlockModal'
import { OverlappingTasksPopup } from './OverlappingTasksPopup'
import { CalendarEvent, Task } from '@/lib/planner/types'
import {
  prepareTimelineItems,
  type TimelineItem,
  type StreamlinedDayConfig,
  DEFAULT_STREAMLINED_CONFIG,
} from '@/lib/planner/timelineUtils'
import {
  getHolidaysForDate,
  getHolidayColor,
  DEFAULT_HOLIDAY_SETTINGS,
  type Holiday,
  type HolidaySettings,
} from '@/lib/planner/holidays'
import { DragDropProvider } from './DragDropProvider'
import { useSwipeGesture } from '@/components/quarry/hooks/useSwipeGesture'
import { useHaptics } from '@/components/quarry/hooks/useHaptics'

// ============================================================================
// TYPES
// ============================================================================

export interface StreamlinedDayViewProps {
  /** Current date to display */
  date: Date
  /** Calendar events */
  events: CalendarEvent[]
  /** Tasks */
  tasks: Task[]
  /** Called when date changes */
  onDateChange: (date: Date) => void
  /** Called when event is clicked */
  onEventClick?: (event: CalendarEvent) => void
  /** Called when task is clicked */
  onTaskClick?: (task: Task) => void
  /** Called when task completion is toggled */
  onTaskToggle?: (taskId: string, completed: boolean) => void
  /** Called when user wants to create at a specific time */
  onQuickCreate?: (time: Date) => void
  /** Called when a time block is saved (create or edit) */
  onTimeBlockSave?: (data: TimeBlockData) => void
  /** Called when a time block is deleted */
  onTimeBlockDelete?: (id: string) => void
  /** Called when an event is dragged to a new time */
  onEventUpdate?: (event: CalendarEvent, newStart: Date, newEnd: Date) => void
  /** Whether to enable drag-drop for events */
  enableDragDrop?: boolean
  /** Whether to show week day strip navigation */
  showWeekStrip?: boolean
  /** Timeline configuration */
  config?: Partial<StreamlinedDayConfig>
  /** Countdown configuration */
  countdownConfig?: Partial<CountdownConfig>
  /** Called when countdown config changes */
  onCountdownConfigChange?: (config: CountdownConfig) => void
  /** Available calendars for calendar picker in edit modal */
  calendars?: Array<{ id: string; name: string; color?: string }>
  /** Theme */
  theme?: 'light' | 'dark'
  /** Additional class names */
  className?: string
}

// ============================================================================
// COMPONENT
// ============================================================================

export function StreamlinedDayView({
  date,
  events,
  tasks,
  onDateChange,
  onEventClick,
  onTaskClick,
  onTaskToggle,
  onQuickCreate,
  onTimeBlockSave,
  onTimeBlockDelete,
  onEventUpdate,
  enableDragDrop = true,
  showWeekStrip = true,
  config: configOverrides,
  countdownConfig,
  onCountdownConfigChange,
  calendars = [],
  theme = 'dark',
  className,
}: StreamlinedDayViewProps) {
  const isDark = theme === 'dark'
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)

  // Edit modal state
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingTimeBlock, setEditingTimeBlock] = useState<TimeBlockData | undefined>(undefined)

  // Overlapping tasks popup state
  const [overlappingPopupOpen, setOverlappingPopupOpen] = useState(false)
  const [overlappingItems, setOverlappingItems] = useState<TimelineItem[]>([])
  const [overlappingPopupPosition, setOverlappingPopupPosition] = useState<{ x: number; y: number } | undefined>(undefined)

  // Haptic feedback
  const haptics = useHaptics()

  // Swipe gesture for day navigation
  useSwipeGesture({
    onSwipeLeft: useCallback(() => {
      const next = new Date(date)
      next.setDate(next.getDate() + 1)
      onDateChange(next)
      haptics.haptic('selection')
    }, [date, onDateChange, haptics]),
    onSwipeRight: useCallback(() => {
      const prev = new Date(date)
      prev.setDate(prev.getDate() - 1)
      onDateChange(prev)
      haptics.haptic('selection')
    }, [date, onDateChange, haptics]),
    threshold: 80,
    elementRef: scrollContainerRef,
  })

  // Merge config
  const config: StreamlinedDayConfig = useMemo(
    () => ({
      ...DEFAULT_STREAMLINED_CONFIG,
      ...configOverrides,
    }),
    [configOverrides]
  )

  // Check if selected date is today
  const isToday = useMemo(() => {
    const today = new Date()
    return (
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate()
    )
  }, [date])

  // Format date for display
  const formattedDate = useMemo(() => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    })
  }, [date])

  // Short format for mobile
  const formattedDateShort = useMemo(() => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })
  }, [date])

  // Prepare timeline items
  const timelineItems = useMemo(() => {
    return prepareTimelineItems(
      tasks,
      events,
      date,
      config.enableOverlapDetection
    )
  }, [tasks, events, date, config.enableOverlapDetection])

  // Get untimed tasks for this day (with null safety)
  const untimedTasks = useMemo(() => {
    if (!tasks || !Array.isArray(tasks)) return []
    const dateStr = date.toISOString().split('T')[0]
    return tasks.filter((task) => task.dueDate === dateStr && !task.dueTime)
  }, [tasks, date])

  // Get all-day events (with null safety)
  const allDayEvents = useMemo(() => {
    if (!events || !Array.isArray(events)) return []
    const dateStr = date.toISOString().split('T')[0]
    return events.filter((event) => {
      if (!event.allDay) return false
      const eventStart = new Date(event.startDatetime)
      const eventEnd = new Date(event.endDatetime)
      const dayStart = new Date(date)
      dayStart.setHours(0, 0, 0, 0)
      const dayEnd = new Date(date)
      dayEnd.setHours(23, 59, 59, 999)
      return eventStart <= dayEnd && eventEnd >= dayStart
    })
  }, [events, date])

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

  // Get holidays for the current date
  const holidays = useMemo<Holiday[]>(() => {
    return getHolidaysForDate(date, holidaySettings)
  }, [date, holidaySettings])

  // Navigation handlers
  const goToPrevDay = useCallback(() => {
    const prev = new Date(date)
    prev.setDate(prev.getDate() - 1)
    onDateChange(prev)
    haptics.haptic('light')
  }, [date, onDateChange, haptics])

  const goToNextDay = useCallback(() => {
    const next = new Date(date)
    next.setDate(next.getDate() + 1)
    onDateChange(next)
    haptics.haptic('light')
  }, [date, onDateChange, haptics])

  const goToToday = useCallback(() => {
    onDateChange(new Date())
    haptics.haptic('medium')
  }, [onDateChange, haptics])

  // Handle item click
  const handleItemClick = useCallback(
    (item: TimelineItem) => {
      setSelectedItemId(item.id)
      if (item.type === 'task') {
        onTaskClick?.(item.source as Task)
      } else {
        onEventClick?.(item.source as CalendarEvent)
      }
    },
    [onTaskClick, onEventClick]
  )

  // Handle item toggle
  const handleItemToggle = useCallback(
    (itemId: string, completed: boolean) => {
      onTaskToggle?.(itemId, completed)
      haptics.haptic('success')
    },
    [onTaskToggle, haptics]
  )

  // Handle slot click for quick create or edit modal
  const handleSlotClick = useCallback(
    (time: Date) => {
      if (onTimeBlockSave) {
        // Open edit modal with pre-filled time
        const dateStr = time.toISOString().split('T')[0]
        const timeStr = time.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        })
        const endTime = new Date(time)
        endTime.setHours(endTime.getHours() + 1)
        const endTimeStr = endTime.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        })

        setEditingTimeBlock({
          title: '',
          icon: 'Calendar',
          color: '#6366f1',
          isAllDay: false,
          startDate: dateStr,
          startTime: timeStr,
          endDate: dateStr,
          endTime: endTimeStr,
          recurrence: 'none',
        })
        setEditModalOpen(true)
      } else {
        onQuickCreate?.(time)
      }
    },
    [onQuickCreate, onTimeBlockSave]
  )

  // Handle overlap badge click - show overlapping items popup
  const handleOverlapClick = useCallback(
    (items: TimelineItem[], event: React.MouseEvent) => {
      setOverlappingItems(items)
      setOverlappingPopupPosition({ x: event.clientX, y: event.clientY })
      setOverlappingPopupOpen(true)
    },
    []
  )

  // Handle edit modal save
  const handleTimeBlockSave = useCallback(
    (data: TimeBlockData) => {
      onTimeBlockSave?.(data)
      setEditModalOpen(false)
      setEditingTimeBlock(undefined)
    },
    [onTimeBlockSave]
  )

  // Handle edit modal delete
  const handleTimeBlockDelete = useCallback(
    (id: string) => {
      onTimeBlockDelete?.(id)
      setEditModalOpen(false)
      setEditingTimeBlock(undefined)
    },
    [onTimeBlockDelete]
  )

  // Close overlapping popup
  const handleCloseOverlappingPopup = useCallback(() => {
    setOverlappingPopupOpen(false)
    setOverlappingItems([])
    setOverlappingPopupPosition(undefined)
  }, [])

  // Auto-scroll to current time on mount (if today)
  useEffect(() => {
    if (isToday && scrollContainerRef.current) {
      const now = new Date()
      const currentHour = now.getHours()
      const hourHeight = 80 // Same as HOUR_HEIGHT in TimelineSpine

      // Scroll to position current time in the top third
      const scrollPosition =
        (currentHour - config.dayStartHour) * hourHeight - 100

      scrollContainerRef.current.scrollTo({
        top: Math.max(0, scrollPosition),
        behavior: 'smooth',
      })
    }
  }, [isToday, config.dayStartHour])

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
        data-tutorial="planner-header"
        className={cn(
          'flex items-center justify-between px-4 py-3',
          'border-b shrink-0',
          isDark ? 'border-zinc-800 bg-zinc-900/80' : 'border-zinc-200 bg-white/80',
          'backdrop-blur-sm'
        )}
      >
        <div className="flex items-center gap-3">
          {/* Navigation arrows */}
          <div data-tutorial="nav-arrows" className="flex items-center gap-0.5">
            <Tooltip content="Previous day" shortcut="←" placement="bottom">
              <motion.button
                className={cn(
                  'p-2.5 sm:p-1.5 rounded-lg transition-colors',
                  isDark
                    ? 'hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 active:bg-zinc-700'
                    : 'hover:bg-zinc-100 text-zinc-500 hover:text-zinc-700 active:bg-zinc-200'
                )}
                onClick={goToPrevDay}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                aria-label="Previous day"
              >
                <ChevronLeft size={18} />
              </motion.button>
            </Tooltip>
            <Tooltip content="Next day" shortcut="→" placement="bottom">
              <motion.button
                className={cn(
                  'p-2.5 sm:p-1.5 rounded-lg transition-colors',
                  isDark
                    ? 'hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 active:bg-zinc-700'
                    : 'hover:bg-zinc-100 text-zinc-500 hover:text-zinc-700 active:bg-zinc-200'
                )}
                onClick={goToNextDay}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                aria-label="Next day"
              >
                <ChevronRight size={18} />
              </motion.button>
            </Tooltip>
          </div>

          {/* Date display */}
          <div className="flex items-center gap-2">
            <Calendar
              size={18}
              className={cn(
                isToday ? 'text-emerald-500' : isDark ? 'text-zinc-600' : 'text-zinc-400'
              )}
            />
            <h2
              className={cn(
                'text-lg font-semibold',
                isDark ? 'text-zinc-100' : 'text-zinc-900'
              )}
            >
              <span className="hidden sm:inline">{formattedDate}</span>
              <span className="sm:hidden">{formattedDateShort}</span>
            </h2>
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
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Today button */}
          {!isToday && (
            <Tooltip content="Jump to today" shortcut="T" placement="bottom">
              <motion.button
                data-tutorial="today-button"
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg',
                  'text-sm font-medium transition-colors',
                  isDark
                    ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                    : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'
                )}
                onClick={goToToday}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <TodayIcon size={14} />
                <span className="hidden sm:inline">Today</span>
              </motion.button>
            </Tooltip>
          )}

          {/* Quick create */}
          {onQuickCreate && (
            <Tooltip content="Create new event" shortcut="N" description="Add a new time block at the current time" placement="bottom">
              <motion.button
                data-tutorial="create-button"
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg',
                  'text-sm font-medium transition-colors',
                  'bg-emerald-600 hover:bg-emerald-500 text-white'
                )}
                onClick={() => {
                  const now = new Date()
                  now.setMinutes(Math.round(now.getMinutes() / 15) * 15, 0, 0)
                  onQuickCreate(now)
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Plus size={16} />
                <span className="hidden sm:inline">Create</span>
              </motion.button>
            </Tooltip>
          )}
        </div>
      </header>

      {/* Week Day Strip */}
      {showWeekStrip && (
        <div data-tutorial="week-strip">
          <WeekDayStrip
            selectedDate={date}
            onDateSelect={onDateChange}
            showMonthHeader
            theme={theme}
            className={cn(
              'shrink-0 border-b',
              isDark ? 'border-zinc-800' : 'border-zinc-200'
            )}
          />
        </div>
      )}

      {/* All-day events banner */}
      <AnimatePresence>
        {allDayEvents && allDayEvents.length > 0 && (
          <motion.div
            className={cn(
              'px-4 py-2 border-b shrink-0',
              isDark ? 'border-zinc-800 bg-zinc-900/50' : 'border-zinc-200 bg-white/50'
            )}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <span
                className={cn(
                  'text-xs font-medium shrink-0',
                  isDark ? 'text-zinc-500' : 'text-zinc-400'
                )}
              >
                All day:
              </span>
              {allDayEvents.map((event) => (
                <button
                  key={event.id}
                  className={cn(
                    'px-2 py-1 rounded-md text-xs font-medium shrink-0',
                    'transition-colors',
                    isDark
                      ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                      : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'
                  )}
                  style={{
                    borderLeft: `3px solid ${event.color || '#6366f1'}`,
                  }}
                  onClick={() => onEventClick?.(event)}
                >
                  {event.title}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Holiday banner */}
      <AnimatePresence>
        {holidays && holidays.length > 0 && (
          <motion.div
            className={cn(
              'px-4 py-2 border-b shrink-0',
              isDark ? 'border-zinc-800' : 'border-zinc-200'
            )}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <div className="flex items-center gap-2 flex-wrap">
              {holidays.map((holiday, index) => {
                const colors = getHolidayColor(holiday.type)
                return (
                  <div
                    key={`${holiday.date}-${index}`}
                    className={cn(
                      'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border',
                      colors.bg,
                      colors.text,
                      colors.border
                    )}
                  >
                    <Sparkles size={12} />
                    <span>{holiday.name}</span>
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Timeline content */}
      <DragDropProvider
        startHour={config.dayStartHour}
        endHour={config.dayEndHour}
        slotHeight={80}
        onEventUpdate={onEventUpdate}
      >
        <div
          ref={scrollContainerRef}
          className={cn(
            'flex-1 overflow-y-auto overflow-x-hidden',
            'px-4 py-8'
          )}
        >
          {/* Timeline with generous padding for spine positioning */}
          <div data-tutorial="timeline-spine" className="relative max-w-4xl mx-auto px-16">
            <TimelineSpine
              items={timelineItems}
              selectedItemId={selectedItemId}
              config={config}
              theme={theme}
              onItemClick={handleItemClick}
              onItemToggle={handleItemToggle}
              onSlotClick={handleSlotClick}
              enableDragDrop={enableDragDrop}
            />
          </div>

        {/* Untimed tasks section */}
        {untimedTasks.length > 0 && (
          <motion.div
            className={cn(
              'max-w-2xl mx-auto mt-8 p-4 rounded-xl border',
              isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white/50 border-zinc-200'
            )}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h3
              className={cn(
                'text-xs font-semibold uppercase tracking-wide mb-3',
                isDark ? 'text-zinc-500' : 'text-zinc-400'
              )}
            >
              Anytime Today ({untimedTasks.length})
            </h3>
            <div className="space-y-2">
              {untimedTasks.map((task) => (
                <button
                  key={task.id}
                  className={cn(
                    'w-full flex items-center gap-3 p-2 rounded-lg text-left',
                    'transition-colors',
                    isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100',
                    task.status === 'completed' && 'opacity-50'
                  )}
                  onClick={() => onTaskClick?.(task)}
                >
                  <input
                    type="checkbox"
                    checked={task.status === 'completed'}
                    onChange={(e) => {
                      e.stopPropagation()
                      onTaskToggle?.(task.id, e.target.checked)
                    }}
                    className={cn(
                      'w-4 h-4 rounded border-2',
                      'accent-emerald-500'
                    )}
                  />
                  <span
                    className={cn(
                      'text-sm',
                      task.status === 'completed' && 'line-through',
                      isDark ? 'text-zinc-300' : 'text-zinc-700'
                    )}
                  >
                    {task.title}
                  </span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
        </div>
      </DragDropProvider>

      {/* Footer with countdowns */}
      {(config.showEndOfDayCountdown ||
        config.showEndOfWorkCountdown ||
        config.showLastEventCountdown) && (
        <footer
          data-tutorial="countdown"
          className={cn(
            'border-t shrink-0',
            isDark ? 'border-zinc-800' : 'border-zinc-200'
          )}
        >
          <EndOfDayCountdown
            items={timelineItems}
            config={{
              showEndOfWork: config.showEndOfWorkCountdown,
              showMidnight: config.showEndOfDayCountdown,
              showLastEvent: config.showLastEventCountdown,
              endOfWorkHour: config.endOfWorkHour,
              ...countdownConfig,
            }}
            onConfigChange={onCountdownConfigChange}
            theme={theme}
            className="rounded-none border-0"
          />
        </footer>
      )}

      {/* Floating action button (mobile) */}
      {onQuickCreate && (
        <motion.button
          className={cn(
            'fixed bottom-24 right-4 sm:hidden',
            'w-14 h-14 rounded-full shadow-lg',
            'flex items-center justify-center',
            'bg-emerald-600 text-white',
            'z-50'
          )}
          onClick={() => {
            const now = new Date()
            now.setMinutes(Math.round(now.getMinutes() / 15) * 15, 0, 0)
            onQuickCreate(now)
          }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', delay: 0.3 }}
        >
          <Plus size={24} />
        </motion.button>
      )}

      {/* Edit Time Block Modal */}
      <EditTimeBlockModal
        isOpen={editModalOpen}
        onClose={() => {
          setEditModalOpen(false)
          setEditingTimeBlock(undefined)
        }}
        onSave={handleTimeBlockSave}
        onDelete={editingTimeBlock?.id ? () => handleTimeBlockDelete(editingTimeBlock.id!) : undefined}
        initialData={editingTimeBlock}
        calendars={calendars.map(c => ({ ...c, color: c.color || '#6366f1' }))}
        theme={theme}
      />

      {/* Overlapping Tasks Popup */}
      <OverlappingTasksPopup
        isOpen={overlappingPopupOpen}
        items={overlappingItems}
        position={overlappingPopupPosition}
        anchor="top-left"
        onItemClick={(item) => {
          handleCloseOverlappingPopup()
          handleItemClick(item)
        }}
        onItemToggle={handleItemToggle}
        onClose={handleCloseOverlappingPopup}
        theme={theme}
      />
    </div>
  )
}

export default StreamlinedDayView
