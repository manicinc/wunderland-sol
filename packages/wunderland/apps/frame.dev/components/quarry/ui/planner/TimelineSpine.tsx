'use client'

/**
 * Timeline Spine
 *
 * The central vertical timeline visualization for StreamlinedDayView.
 * Features hour markers, current time indicator, and positioned event cards.
 *
 * @module components/quarry/ui/planner/TimelineSpine
 */

import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sun, Moon, Sunrise, Sunset, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import Tooltip from '../common/Tooltip'
import { TimelineEventCard, TimelineEventCardMinimal } from './TimelineEventCard'
import { DraggableEvent, ResizeHandle } from './DragDropProvider'
import type { CalendarEvent } from '@/lib/planner/types'
import type { TimelineItem, StreamlinedDayConfig } from '@/lib/planner/timelineUtils'
import {
  getTimelinePosition,
  getTimelineHeight,
  getOverlapIndex,
  detectOverlaps,
  DEFAULT_STREAMLINED_CONFIG,
} from '@/lib/planner/timelineUtils'

// ============================================================================
// TYPES
// ============================================================================

export interface TimelineSpineProps {
  /** Items to display on the timeline */
  items: TimelineItem[]
  /** Currently selected item ID */
  selectedItemId?: string | null
  /** Timeline configuration */
  config?: Partial<StreamlinedDayConfig>
  /** Theme */
  theme?: 'light' | 'dark'
  /** Called when an item is clicked */
  onItemClick?: (item: TimelineItem) => void
  /** Called when task completion is toggled */
  onItemToggle?: (itemId: string, completed: boolean) => void
  /** Called when clicking empty timeline slot */
  onSlotClick?: (time: Date) => void
  /** Enable drag-drop for events */
  enableDragDrop?: boolean
  /** Additional class names */
  className?: string
}

// ============================================================================
// CONSTANTS
// ============================================================================

const HOUR_HEIGHT = 80 // Pixels per hour
const SPINE_WIDTH = 4
const CARD_MARGIN = 12

// Day phase icons and labels
const DAY_PHASES = {
  morning: { icon: Sunrise, label: 'Morning', color: '#f59e0b' },
  midday: { icon: Sun, label: 'Midday', color: '#eab308' },
  afternoon: { icon: Sunset, label: 'Afternoon', color: '#f97316' },
  evening: { icon: Moon, label: 'Evening', color: '#6366f1' },
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getHourLabel(hour: number): string {
  if (hour === 0 || hour === 24) return '12 AM'
  if (hour === 12) return '12 PM'
  if (hour < 12) return `${hour} AM`
  return `${hour - 12} PM`
}

function getDayPhase(hour: number): keyof typeof DAY_PHASES {
  if (hour >= 5 && hour < 12) return 'morning'
  if (hour >= 12 && hour < 14) return 'midday'
  if (hour >= 14 && hour < 18) return 'afternoon'
  return 'evening'
}

// ============================================================================
// CURRENT TIME INDICATOR
// ============================================================================

interface CurrentTimeIndicatorProps {
  dayStartHour: number
  dayEndHour: number
  theme: 'light' | 'dark'
}

function CurrentTimeIndicatorLine({
  dayStartHour,
  dayEndHour,
  theme,
}: CurrentTimeIndicatorProps) {
  const [now, setNow] = useState(new Date())
  const isDark = theme === 'dark'

  // Update every minute
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(interval)
  }, [])

  const currentHour = now.getHours()

  // Hide if outside display range
  if (currentHour < dayStartHour || currentHour > dayEndHour) {
    return null
  }

  const position = getTimelinePosition(now, dayStartHour, dayEndHour)

  return (
    <div
      className="absolute left-0 right-0 z-30 pointer-events-none"
      style={{ top: `${position}%` }}
    >
      {/* Time label */}
      <div className="absolute -left-2 -translate-x-full -translate-y-1/2 flex items-center gap-1">
        <span
          className={cn(
            'text-[10px] font-semibold px-1.5 py-0.5 rounded',
            'bg-red-500 text-white shadow-sm shadow-red-500/30'
          )}
        >
          {now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
        </span>
      </div>

      {/* Pulsing dot */}
      <motion.div
        className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-red-500 shadow-lg shadow-red-500/50"
        animate={{ scale: [1, 1.3, 1] }}
        transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
      />

      {/* Line extending from spine */}
      <div
        className={cn(
          'absolute left-1/2 right-0 h-[2px]',
          'bg-gradient-to-r from-red-500 to-transparent'
        )}
        style={{ transform: 'translateY(-50%)' }}
      />

      {/* Line extending to the left */}
      <div
        className={cn(
          'absolute right-1/2 left-0 h-[2px]',
          'bg-gradient-to-l from-red-500 to-transparent'
        )}
        style={{ transform: 'translateY(-50%)' }}
      />
    </div>
  )
}

// ============================================================================
// HOUR MARKER
// ============================================================================

interface HourMarkerProps {
  hour: number
  position: number // percentage
  isCurrentHour: boolean
  theme: 'light' | 'dark'
  onSlotClick?: (time: Date) => void
}

function HourMarker({
  hour,
  position,
  isCurrentHour,
  theme,
  onSlotClick,
}: HourMarkerProps) {
  const isDark = theme === 'dark'
  const phase = getDayPhase(hour)
  const PhaseIcon = DAY_PHASES[phase].icon

  // Show phase icons at key hours
  const showPhaseIcon = hour === 6 || hour === 12 || hour === 18 || hour === 22

  const handleClick = useCallback(() => {
    if (onSlotClick) {
      const time = new Date()
      time.setHours(hour, 0, 0, 0)
      onSlotClick(time)
    }
  }, [hour, onSlotClick])

  return (
    <div
      className={cn(
        'absolute left-0 right-0 flex items-center',
        onSlotClick && 'cursor-pointer group'
      )}
      style={{ top: `${position}%` }}
      onClick={handleClick}
    >
      {/* Hour label */}
      <div
        className={cn(
          'absolute -left-2 -translate-x-full -translate-y-1/2',
          'text-xs font-medium w-12 text-right pr-2',
          isCurrentHour
            ? 'text-red-500 font-semibold'
            : isDark
              ? 'text-zinc-500'
              : 'text-zinc-400'
        )}
      >
        {getHourLabel(hour)}
      </div>

      {/* Tick mark on spine */}
      <div
        className={cn(
          'absolute left-1/2 -translate-x-1/2 -translate-y-1/2',
          'w-2 h-2 rounded-full transition-colors',
          isCurrentHour
            ? 'bg-red-500'
            : isDark
              ? 'bg-zinc-700 group-hover:bg-zinc-600'
              : 'bg-zinc-300 group-hover:bg-zinc-400'
        )}
      />

      {/* Phase icon at key hours */}
      {showPhaseIcon && (
        <Tooltip
          content={DAY_PHASES[phase].label}
          description={`${getHourLabel(hour)} marks the start of ${DAY_PHASES[phase].label.toLowerCase()}`}
          placement="right"
        >
          <div
            className={cn(
              'absolute right-0 translate-x-full -translate-y-1/2 ml-3',
              'px-2 py-1 rounded-full',
              isDark ? 'bg-zinc-800/50' : 'bg-zinc-100/50'
            )}
          >
            <PhaseIcon
              size={14}
              style={{ color: DAY_PHASES[phase].color }}
            />
          </div>
        </Tooltip>
      )}

      {/* Horizontal grid line */}
      <div
        className={cn(
          'absolute left-1/2 right-0 h-px opacity-20',
          'group-hover:opacity-40 transition-opacity',
          isDark ? 'bg-zinc-600' : 'bg-zinc-300'
        )}
        style={{ transform: 'translateY(-50%)' }}
      />

      {/* Quick add button on hover */}
      {onSlotClick && (
        <Tooltip
          content={`Add event at ${getHourLabel(hour)}`}
          description="Click to create a new event"
          placement="left"
        >
          <motion.div
            className={cn(
              'absolute right-4 -translate-y-1/2',
              'w-6 h-6 rounded-full',
              'flex items-center justify-center',
              'opacity-0 group-hover:opacity-100 transition-opacity',
              isDark
                ? 'bg-emerald-600 hover:bg-emerald-500'
                : 'bg-emerald-500 hover:bg-emerald-400'
            )}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <Plus size={14} className="text-white" />
          </motion.div>
        </Tooltip>
      )}
    </div>
  )
}

// ============================================================================
// TIMELINE SPINE COMPONENT
// ============================================================================

export function TimelineSpine({
  items,
  selectedItemId,
  config: configOverrides,
  theme = 'dark',
  onItemClick,
  onItemToggle,
  onSlotClick,
  enableDragDrop = false,
  className,
}: TimelineSpineProps) {
  const isDark = theme === 'dark'
  const containerRef = useRef<HTMLDivElement>(null)

  // Merge config with defaults
  const config: StreamlinedDayConfig = useMemo(
    () => ({
      ...DEFAULT_STREAMLINED_CONFIG,
      ...configOverrides,
    }),
    [configOverrides]
  )

  // Current hour for highlighting
  const [currentHour, setCurrentHour] = useState(new Date().getHours())

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentHour(new Date().getHours())
    }, 60000)
    return () => clearInterval(interval)
  }, [])

  // Detect overlaps if enabled
  const overlaps = useMemo(() => {
    if (!config.enableOverlapDetection) return new Map<string, string[]>()
    return detectOverlaps(items)
  }, [items, config.enableOverlapDetection])

  // Apply overlaps to items
  const itemsWithOverlaps = useMemo(() => {
    return items.map((item) => ({
      ...item,
      overlaps: overlaps.get(item.id),
    }))
  }, [items, overlaps])

  // Generate hour markers
  const hourMarkers = useMemo(() => {
    const markers = []
    for (let hour = config.dayStartHour; hour <= config.dayEndHour; hour++) {
      const position = getTimelinePosition(
        new Date(0, 0, 0, hour, 0),
        config.dayStartHour,
        config.dayEndHour
      )
      markers.push({
        hour,
        position,
        isCurrentHour: hour === currentHour,
      })
    }
    return markers
  }, [config.dayStartHour, config.dayEndHour, currentHour])

  // Calculate card positions
  const positionedItems = useMemo(() => {
    return itemsWithOverlaps.map((item) => {
      const top = getTimelinePosition(
        item.startTime,
        config.dayStartHour,
        config.dayEndHour
      )
      const height = getTimelineHeight(
        item.duration,
        config.dayStartHour,
        config.dayEndHour
      )
      const overlapIndex = getOverlapIndex(item.id, overlaps, items)
      const overlapOffset = overlapIndex * 8 // px offset for staggering

      return {
        ...item,
        style: {
          top: `${top}%`,
          height: `${Math.max(height, 4)}%`, // Min 4% height
          marginLeft: overlapOffset,
        },
      }
    })
  }, [itemsWithOverlaps, config.dayStartHour, config.dayEndHour, overlaps, items])

  // Handle item toggle
  const handleItemToggle = useCallback(
    (itemId: string, completed: boolean) => {
      onItemToggle?.(itemId, completed)
    },
    [onItemToggle]
  )

  // Calculate total height based on hours
  const totalHours = config.dayEndHour - config.dayStartHour
  const totalHeight = totalHours * HOUR_HEIGHT

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative w-full',
        className
      )}
      style={{ height: totalHeight }}
    >
      {/* Central spine track */}
      <div
        className={cn(
          'absolute left-1/2 top-0 bottom-0 -translate-x-1/2',
          'rounded-full',
          isDark ? 'bg-zinc-800' : 'bg-zinc-200'
        )}
        style={{ width: SPINE_WIDTH }}
      >
        {/* Gradient overlay for depth */}
        <div
          className="absolute inset-0 rounded-full opacity-50"
          style={{
            background: isDark
              ? 'linear-gradient(180deg, rgba(99,102,241,0.3) 0%, rgba(16,185,129,0.3) 50%, rgba(99,102,241,0.3) 100%)'
              : 'linear-gradient(180deg, rgba(99,102,241,0.2) 0%, rgba(16,185,129,0.2) 50%, rgba(99,102,241,0.2) 100%)',
          }}
        />
      </div>

      {/* Day boundary icons */}
      <Tooltip
        content="Day Start"
        description={`Your day view starts at ${getHourLabel(config.dayStartHour)}`}
        placement="right"
      >
        <div className="absolute left-1/2 -translate-x-1/2 -top-8">
          <div
            className={cn(
              'w-10 h-10 rounded-full flex items-center justify-center',
              isDark ? 'bg-zinc-800' : 'bg-zinc-100'
            )}
          >
            <Sun size={20} className="text-amber-500" />
          </div>
        </div>
      </Tooltip>

      <Tooltip
        content="Day End"
        description={`Your day view ends at ${getHourLabel(config.dayEndHour)}`}
        placement="right"
      >
        <div className="absolute left-1/2 -translate-x-1/2 -bottom-8">
          <div
            className={cn(
              'w-10 h-10 rounded-full flex items-center justify-center',
              isDark ? 'bg-zinc-800' : 'bg-zinc-100'
            )}
          >
            <Moon size={20} className="text-indigo-400" />
          </div>
        </div>
      </Tooltip>

      {/* Hour markers */}
      {hourMarkers.map((marker) => (
        <HourMarker
          key={marker.hour}
          hour={marker.hour}
          position={marker.position}
          isCurrentHour={marker.isCurrentHour}
          theme={theme}
          onSlotClick={onSlotClick}
        />
      ))}

      {/* Current time indicator */}
      <CurrentTimeIndicatorLine
        dayStartHour={config.dayStartHour}
        dayEndHour={config.dayEndHour}
        theme={theme}
      />

      {/* Event/Task cards */}
      <AnimatePresence mode="popLayout">
        {positionedItems.map((item, index) => {
          // Alternate cards left and right of spine
          const isLeft = index % 2 === 0
          // Check if item is an event (can be dragged)
          const isEvent = item.type === 'event'
          const canDrag = enableDragDrop && isEvent

          const cardContent = config.cardStyle === 'minimal' ? (
            <TimelineEventCardMinimal
              item={item}
              theme={theme}
              onClick={() => onItemClick?.(item)}
              onToggleComplete={(completed) =>
                handleItemToggle(item.id, completed)
              }
              className="h-full"
            />
          ) : (
            <div className="relative h-full">
              <TimelineEventCard
                item={item}
                variant="detailed"
                isSelected={selectedItemId === item.id}
                showOverlapBadge={config.enableOverlapDetection}
                animationDelay={index * 0.05}
                theme={theme}
                onClick={() => onItemClick?.(item)}
                onToggleComplete={(completed) =>
                  handleItemToggle(item.id, completed)
                }
                className="h-full"
              />
              {/* Resize handles for events */}
              {canDrag && (
                <>
                  <ResizeHandle
                    event={item.source as CalendarEvent}
                    position="top"
                  />
                  <ResizeHandle
                    event={item.source as CalendarEvent}
                    position="bottom"
                  />
                </>
              )}
            </div>
          )

          return (
            <motion.div
              key={item.id}
              className={cn(
                'absolute z-10',
                isLeft ? 'right-1/2 pr-6' : 'left-1/2 pl-6',
                'w-[45%]'
              )}
              style={{
                top: item.style.top,
                height: item.style.height,
                marginLeft: isLeft ? undefined : item.style.marginLeft,
                marginRight: isLeft ? item.style.marginLeft : undefined,
              }}
              initial={{ opacity: 0, x: isLeft ? 20 : -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: isLeft ? 20 : -20 }}
              transition={{
                type: 'spring',
                stiffness: 300,
                damping: 25,
                delay: index * 0.05,
              }}
            >
              {canDrag ? (
                <DraggableEvent event={item.source as CalendarEvent}>
                  {cardContent}
                </DraggableEvent>
              ) : (
                cardContent
              )}
            </motion.div>
          )
        })}
      </AnimatePresence>

      {/* Empty state hint */}
      {(!items || items.length === 0) && (
        <div
          className={cn(
            'absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2',
            'text-center',
            isDark ? 'text-zinc-600' : 'text-zinc-400'
          )}
        >
          <p className="text-sm">No events or tasks scheduled</p>
          <p className="text-xs mt-1 opacity-70">
            Click a time slot to create one
          </p>
        </div>
      )}
    </div>
  )
}

export default TimelineSpine
