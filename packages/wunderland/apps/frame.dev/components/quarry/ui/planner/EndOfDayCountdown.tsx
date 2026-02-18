'use client'

/**
 * End of Day Countdown
 *
 * Premium countdown component showing time remaining until:
 * - End of work (configurable hour)
 * - Midnight
 * - Last scheduled event
 *
 * Features live updates, configurable visibility, and elegant typography.
 *
 * @module components/quarry/ui/planner/EndOfDayCountdown
 */

import { useEffect, useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Clock,
  Briefcase,
  Moon,
  CalendarCheck,
  Settings,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import Tooltip from '../common/Tooltip'
import type { TimelineItem } from '@/lib/planner/timelineUtils'

// ============================================================================
// TYPES
// ============================================================================

export interface CountdownConfig {
  showEndOfWork: boolean
  showMidnight: boolean
  showLastEvent: boolean
  endOfWorkHour: number // 0-23, default 18 (6 PM)
}

export interface EndOfDayCountdownProps {
  /** Items to calculate last event from */
  items?: TimelineItem[]
  /** Countdown configuration */
  config?: Partial<CountdownConfig>
  /** Called when config changes */
  onConfigChange?: (config: CountdownConfig) => void
  /** Compact mode (single line) */
  compact?: boolean
  /** Theme */
  theme?: 'light' | 'dark'
  /** Additional class names */
  className?: string
}

interface CountdownData {
  hours: number
  minutes: number
  seconds: number
  total: number // total seconds remaining
  isPast: boolean
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_CONFIG: CountdownConfig = {
  showEndOfWork: true,
  showMidnight: true,
  showLastEvent: true,
  endOfWorkHour: 18, // 6 PM
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function calculateCountdown(targetTime: Date): CountdownData {
  const now = new Date()
  const diff = targetTime.getTime() - now.getTime()

  if (diff <= 0) {
    return { hours: 0, minutes: 0, seconds: 0, total: 0, isPast: true }
  }

  const totalSeconds = Math.floor(diff / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  return { hours, minutes, seconds, total: totalSeconds, isPast: false }
}

function formatCountdown(countdown: CountdownData, compact = false): string {
  if (countdown.isPast) return '0:00:00'

  const { hours, minutes, seconds } = countdown

  if (compact) {
    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m ${seconds}s`
  }

  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${hours}:${pad(minutes)}:${pad(seconds)}`
}

function getEndOfWorkTime(hour: number): Date {
  const now = new Date()
  const target = new Date(now)
  target.setHours(hour, 0, 0, 0)

  // If we're past end of work, it's for tomorrow
  if (now >= target) {
    target.setDate(target.getDate() + 1)
  }

  return target
}

function getMidnightTime(): Date {
  const now = new Date()
  const target = new Date(now)
  target.setDate(target.getDate() + 1)
  target.setHours(0, 0, 0, 0)
  return target
}

function getLastEventTime(items: TimelineItem[]): Date | null {
  if (!items || items.length === 0) return null

  const now = new Date()
  const futureItems = items.filter((item) => item.endTime > now)

  if (futureItems.length === 0) return null

  const lastItem = futureItems.reduce((latest, item) =>
    item.endTime > latest.endTime ? item : latest
  )

  return lastItem.endTime
}

// ============================================================================
// COUNTDOWN SEGMENT
// ============================================================================

interface CountdownSegmentProps {
  icon: LucideIcon
  label: string
  countdown: CountdownData
  color: string
  compact?: boolean
  theme: 'light' | 'dark'
  onToggleVisibility?: () => void
}

function CountdownSegment({
  icon: Icon,
  label,
  countdown,
  color,
  compact,
  theme,
  onToggleVisibility,
}: CountdownSegmentProps) {
  const isDark = theme === 'dark'

  return (
    <motion.div
      className={cn(
        'relative group',
        compact ? 'flex items-center gap-2' : 'flex flex-col items-center'
      )}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
    >
      {/* Icon */}
      <div
        className={cn(
          'flex items-center justify-center rounded-lg',
          compact ? 'w-6 h-6' : 'w-10 h-10 mb-1'
        )}
        style={{
          backgroundColor: `${color}15`,
        }}
      >
        <span style={{ color }}>
          <Icon size={compact ? 14 : 18} />
        </span>
      </div>

      {/* Content */}
      <div className={compact ? 'flex items-baseline gap-1.5' : 'text-center'}>
        {/* Label */}
        <span
          className={cn(
            compact ? 'text-xs' : 'text-[10px] uppercase tracking-wide mb-0.5',
            isDark ? 'text-zinc-500' : 'text-zinc-400'
          )}
        >
          {label}
        </span>

        {/* Time */}
        <span
          className={cn(
            'font-mono font-semibold tabular-nums',
            compact ? 'text-sm' : 'text-lg',
            countdown.isPast && 'opacity-50',
            isDark ? 'text-zinc-100' : 'text-zinc-900'
          )}
        >
          {formatCountdown(countdown, compact)}
        </span>
      </div>

      {/* Visibility toggle on hover */}
      {onToggleVisibility && !compact && (
        <Tooltip content={`Hide ${label}`} placement="top">
          <button
            className={cn(
              'absolute -top-1 -right-1',
              'w-5 h-5 rounded-full',
              'flex items-center justify-center',
              'opacity-0 group-hover:opacity-100 transition-opacity',
              isDark
                ? 'bg-zinc-800 hover:bg-zinc-700'
                : 'bg-zinc-200 hover:bg-zinc-300'
            )}
            onClick={onToggleVisibility}
          >
            <EyeOff
              size={10}
              className={isDark ? 'text-zinc-400' : 'text-zinc-500'}
            />
          </button>
        </Tooltip>
      )}
    </motion.div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function EndOfDayCountdown({
  items = [],
  config: configOverrides,
  onConfigChange,
  compact = false,
  theme = 'dark',
  className,
}: EndOfDayCountdownProps) {
  const isDark = theme === 'dark'

  // Merge config
  const [config, setConfig] = useState<CountdownConfig>({
    ...DEFAULT_CONFIG,
    ...configOverrides,
  })

  // Update config when overrides change
  useEffect(() => {
    if (configOverrides) {
      setConfig((prev) => ({ ...prev, ...configOverrides }))
    }
  }, [configOverrides])

  // Settings panel state
  const [showSettings, setShowSettings] = useState(false)

  // Countdown states
  const [endOfWorkCountdown, setEndOfWorkCountdown] = useState<CountdownData>({
    hours: 0,
    minutes: 0,
    seconds: 0,
    total: 0,
    isPast: false,
  })
  const [midnightCountdown, setMidnightCountdown] = useState<CountdownData>({
    hours: 0,
    minutes: 0,
    seconds: 0,
    total: 0,
    isPast: false,
  })
  const [lastEventCountdown, setLastEventCountdown] = useState<CountdownData>({
    hours: 0,
    minutes: 0,
    seconds: 0,
    total: 0,
    isPast: false,
  })

  // Last event time
  const lastEventTime = useMemo(() => getLastEventTime(items), [items])

  // Update countdowns every second
  useEffect(() => {
    const update = () => {
      setEndOfWorkCountdown(calculateCountdown(getEndOfWorkTime(config.endOfWorkHour)))
      setMidnightCountdown(calculateCountdown(getMidnightTime()))

      if (lastEventTime) {
        setLastEventCountdown(calculateCountdown(lastEventTime))
      } else {
        setLastEventCountdown({ hours: 0, minutes: 0, seconds: 0, total: 0, isPast: true })
      }
    }

    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [config.endOfWorkHour, lastEventTime])

  // Toggle visibility handlers
  const toggleEndOfWork = useCallback(() => {
    const newConfig = { ...config, showEndOfWork: !config.showEndOfWork }
    setConfig(newConfig)
    onConfigChange?.(newConfig)
  }, [config, onConfigChange])

  const toggleMidnight = useCallback(() => {
    const newConfig = { ...config, showMidnight: !config.showMidnight }
    setConfig(newConfig)
    onConfigChange?.(newConfig)
  }, [config, onConfigChange])

  const toggleLastEvent = useCallback(() => {
    const newConfig = { ...config, showLastEvent: !config.showLastEvent }
    setConfig(newConfig)
    onConfigChange?.(newConfig)
  }, [config, onConfigChange])

  // Count visible countdowns
  const visibleCount = [
    config.showEndOfWork,
    config.showMidnight,
    config.showLastEvent && lastEventTime,
  ].filter(Boolean).length

  if (visibleCount === 0 && !showSettings) {
    return null
  }

  return (
    <div
      className={cn(
        'relative',
        compact
          ? 'flex items-center gap-4 px-3 py-2'
          : 'flex flex-col px-4 py-3',
        isDark ? 'bg-zinc-900/50' : 'bg-zinc-50/50',
        'backdrop-blur-sm rounded-xl border',
        isDark ? 'border-zinc-800' : 'border-zinc-200',
        className
      )}
    >
      {/* Header with settings toggle */}
      {!compact && (
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Clock
              size={14}
              className={isDark ? 'text-zinc-500' : 'text-zinc-400'}
            />
            <span
              className={cn(
                'text-xs font-medium',
                isDark ? 'text-zinc-400' : 'text-zinc-500'
              )}
            >
              Time Remaining
            </span>
          </div>

          <Tooltip
            content={showSettings ? 'Close settings' : 'Countdown settings'}
            description="Configure which countdowns to display"
            placement="left"
          >
            <button
              className={cn(
                'p-1 rounded-md transition-colors',
                isDark
                  ? 'hover:bg-zinc-800 text-zinc-500'
                  : 'hover:bg-zinc-200 text-zinc-400'
              )}
              onClick={() => setShowSettings(!showSettings)}
            >
              {showSettings ? (
                <ChevronUp size={14} />
              ) : (
                <Settings size={14} />
              )}
            </button>
          </Tooltip>
        </div>
      )}

      {/* Settings panel */}
      <AnimatePresence>
        {showSettings && !compact && (
          <motion.div
            className={cn(
              'mb-3 p-2 rounded-lg',
              isDark ? 'bg-zinc-800/50' : 'bg-zinc-100/50'
            )}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <div className="space-y-2">
              {/* End of work toggle */}
              <button
                className={cn(
                  'w-full flex items-center justify-between px-2 py-1.5 rounded-md',
                  'transition-colors text-sm',
                  isDark ? 'hover:bg-zinc-700/50' : 'hover:bg-zinc-200/50'
                )}
                onClick={toggleEndOfWork}
              >
                <div className="flex items-center gap-2">
                  <Briefcase size={14} className="text-emerald-500" />
                  <span className={isDark ? 'text-zinc-300' : 'text-zinc-700'}>
                    End of Work ({config.endOfWorkHour}:00)
                  </span>
                </div>
                {config.showEndOfWork ? (
                  <Eye size={14} className="text-emerald-500" />
                ) : (
                  <EyeOff
                    size={14}
                    className={isDark ? 'text-zinc-600' : 'text-zinc-400'}
                  />
                )}
              </button>

              {/* Midnight toggle */}
              <button
                className={cn(
                  'w-full flex items-center justify-between px-2 py-1.5 rounded-md',
                  'transition-colors text-sm',
                  isDark ? 'hover:bg-zinc-700/50' : 'hover:bg-zinc-200/50'
                )}
                onClick={toggleMidnight}
              >
                <div className="flex items-center gap-2">
                  <Moon size={14} className="text-indigo-500" />
                  <span className={isDark ? 'text-zinc-300' : 'text-zinc-700'}>
                    Midnight
                  </span>
                </div>
                {config.showMidnight ? (
                  <Eye size={14} className="text-emerald-500" />
                ) : (
                  <EyeOff
                    size={14}
                    className={isDark ? 'text-zinc-600' : 'text-zinc-400'}
                  />
                )}
              </button>

              {/* Last event toggle */}
              <button
                className={cn(
                  'w-full flex items-center justify-between px-2 py-1.5 rounded-md',
                  'transition-colors text-sm',
                  isDark ? 'hover:bg-zinc-700/50' : 'hover:bg-zinc-200/50',
                  !lastEventTime && 'opacity-50 cursor-not-allowed'
                )}
                onClick={toggleLastEvent}
                disabled={!lastEventTime}
              >
                <div className="flex items-center gap-2">
                  <CalendarCheck size={14} className="text-amber-500" />
                  <span className={isDark ? 'text-zinc-300' : 'text-zinc-700'}>
                    Last Event
                  </span>
                </div>
                {config.showLastEvent && lastEventTime ? (
                  <Eye size={14} className="text-emerald-500" />
                ) : (
                  <EyeOff
                    size={14}
                    className={isDark ? 'text-zinc-600' : 'text-zinc-400'}
                  />
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Countdown segments */}
      <div
        className={cn(
          compact
            ? 'flex items-center gap-6'
            : 'grid gap-4',
          !compact && visibleCount === 3 && 'grid-cols-3',
          !compact && visibleCount === 2 && 'grid-cols-2',
          !compact && visibleCount === 1 && 'grid-cols-1'
        )}
      >
        <AnimatePresence mode="popLayout">
          {/* End of Work */}
          {config.showEndOfWork && (
            <CountdownSegment
              key="endOfWork"
              icon={Briefcase}
              label={compact ? 'Work' : 'End of Work'}
              countdown={endOfWorkCountdown}
              color="#10b981" // emerald
              compact={compact}
              theme={theme}
              onToggleVisibility={toggleEndOfWork}
            />
          )}

          {/* Midnight */}
          {config.showMidnight && (
            <CountdownSegment
              key="midnight"
              icon={Moon}
              label="Midnight"
              countdown={midnightCountdown}
              color="#6366f1" // indigo
              compact={compact}
              theme={theme}
              onToggleVisibility={toggleMidnight}
            />
          )}

          {/* Last Event */}
          {config.showLastEvent && lastEventTime && (
            <CountdownSegment
              key="lastEvent"
              icon={CalendarCheck}
              label={compact ? 'Done' : 'Last Event'}
              countdown={lastEventCountdown}
              color="#f59e0b" // amber
              compact={compact}
              theme={theme}
              onToggleVisibility={toggleLastEvent}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Compact settings button */}
      {compact && (
        <Tooltip content="Countdown settings" placement="left">
          <button
            className={cn(
              'ml-auto p-1 rounded-md transition-colors',
              isDark
                ? 'hover:bg-zinc-800 text-zinc-500'
                : 'hover:bg-zinc-200 text-zinc-400'
            )}
            onClick={() => setShowSettings(!showSettings)}
          >
            <Settings size={14} />
          </button>
        </Tooltip>
      )}
    </div>
  )
}

export default EndOfDayCountdown
