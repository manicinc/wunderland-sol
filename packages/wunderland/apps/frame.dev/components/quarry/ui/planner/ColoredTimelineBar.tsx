'use client'

/**
 * Colored Timeline Bar
 *
 * A continuous vertical timeline bar with colored segments representing
 * scheduled events/tasks. Each segment's color matches its event color.
 *
 * @module components/quarry/ui/planner/ColoredTimelineBar
 */

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { TimelineItem } from '@/lib/planner/timelineUtils'
import { getTimelinePosition, getTimelineHeight } from '@/lib/planner/timelineUtils'

// ============================================================================
// TYPES
// ============================================================================

export interface ColoredTimelineBarProps {
  /** Timeline items to visualize */
  items: TimelineItem[]
  /** Day start hour (e.g., 6 for 6 AM) */
  dayStartHour?: number
  /** Day end hour (e.g., 22 for 10 PM) */
  dayEndHour?: number
  /** Total height of the timeline in pixels */
  totalHeight: number
  /** Current time indicator position (percentage 0-100, or null if not today) */
  currentTimePosition?: number | null
  /** Bar width in pixels */
  width?: number
  /** Show hour tick marks */
  showHourTicks?: boolean
  /** Theme */
  theme?: 'light' | 'dark'
  /** Additional class names */
  className?: string
}

interface SegmentData {
  id: string
  top: number // percentage
  height: number // percentage
  color: string
  isCompleted: boolean
  overlapsWithPrevious: boolean
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_BAR_WIDTH = 8
const SEGMENT_GAP = 2 // pixels between segments

// ============================================================================
// COMPONENT
// ============================================================================

export function ColoredTimelineBar({
  items,
  dayStartHour = 6,
  dayEndHour = 22,
  totalHeight,
  currentTimePosition,
  width = DEFAULT_BAR_WIDTH,
  showHourTicks = true,
  theme = 'light',
  className,
}: ColoredTimelineBarProps) {
  const isDark = theme === 'dark'

  // Calculate segment positions
  const segments = useMemo(() => {
    const result: SegmentData[] = []

    // Sort items by start time
    const sortedItems = [...items].sort(
      (a, b) => a.startTime.getTime() - b.startTime.getTime()
    )

    let lastEndPosition = 0

    sortedItems.forEach((item, index) => {
      const top = getTimelinePosition(item.startTime, dayStartHour, dayEndHour)
      const height = getTimelineHeight(item.duration, dayStartHour, dayEndHour)

      // Check if this segment overlaps with the previous one
      const overlapsWithPrevious = top < lastEndPosition

      result.push({
        id: item.id,
        top: Math.max(0, Math.min(100, top)),
        height: Math.max(2, Math.min(100 - top, height)), // Min 2% height for visibility
        color: item.color,
        isCompleted: item.completed,
        overlapsWithPrevious,
      })

      lastEndPosition = top + height
    })

    return result
  }, [items, dayStartHour, dayEndHour])

  // Generate hour tick positions
  const hourTicks = useMemo(() => {
    if (!showHourTicks) return []

    const ticks: { position: number; hour: number }[] = []
    for (let hour = dayStartHour; hour <= dayEndHour; hour++) {
      const position = ((hour - dayStartHour) / (dayEndHour - dayStartHour)) * 100
      ticks.push({ position, hour })
    }
    return ticks
  }, [dayStartHour, dayEndHour, showHourTicks])

  return (
    <div
      className={cn('relative', className)}
      style={{ width, height: totalHeight }}
    >
      {/* Background track */}
      <div
        className={cn(
          'absolute inset-0 rounded-full',
          isDark ? 'bg-zinc-800' : 'bg-zinc-200'
        )}
      />

      {/* Hour tick marks */}
      {showHourTicks &&
        hourTicks.map(({ position, hour }) => (
          <div
            key={hour}
            className={cn(
              'absolute left-0 right-0 h-px',
              isDark ? 'bg-zinc-700' : 'bg-zinc-300'
            )}
            style={{ top: `${position}%` }}
          />
        ))}

      {/* Colored segments */}
      {segments.map((segment, index) => (
        <motion.div
          key={segment.id}
          className={cn(
            'absolute left-0 right-0 rounded-full',
            segment.isCompleted && 'opacity-50'
          )}
          style={{
            top: `${segment.top}%`,
            height: `${segment.height}%`,
            backgroundColor: segment.color,
            // Slight offset for overlapping segments
            marginLeft: segment.overlapsWithPrevious ? 2 : 0,
            zIndex: index + 1,
          }}
          initial={{ scaleY: 0, originY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{
            type: 'spring',
            stiffness: 300,
            damping: 25,
            delay: index * 0.05,
          }}
        >
          {/* Inner glow/gradient for depth */}
          <div
            className="absolute inset-0 rounded-full opacity-30"
            style={{
              background: `linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)`,
            }}
          />
        </motion.div>
      ))}

      {/* Current time indicator */}
      {currentTimePosition !== null && currentTimePosition !== undefined && (
        <motion.div
          className="absolute left-1/2 -translate-x-1/2 z-50"
          style={{ top: `${currentTimePosition}%` }}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', delay: 0.3 }}
        >
          {/* Current time dot */}
          <div
            className={cn(
              'w-4 h-4 rounded-full -translate-x-1/2 -translate-y-1/2',
              'bg-red-500 border-2',
              isDark ? 'border-zinc-900' : 'border-white',
              'shadow-lg shadow-red-500/50'
            )}
          />
          {/* Horizontal line extending from dot */}
          <div
            className="absolute left-full top-1/2 -translate-y-1/2 w-8 h-0.5 bg-red-500"
          />
        </motion.div>
      )}

      {/* Top cap (rounded) */}
      <div
        className={cn(
          'absolute top-0 left-0 right-0 h-2 rounded-t-full',
          isDark ? 'bg-zinc-800' : 'bg-zinc-200'
        )}
      />

      {/* Bottom cap (rounded) */}
      <div
        className={cn(
          'absolute bottom-0 left-0 right-0 h-2 rounded-b-full',
          isDark ? 'bg-zinc-800' : 'bg-zinc-200'
        )}
      />
    </div>
  )
}

/**
 * Compact version for smaller displays
 */
export function ColoredTimelineBarCompact({
  items,
  dayStartHour = 6,
  dayEndHour = 22,
  height = 200,
  theme = 'light',
  className,
}: {
  items: TimelineItem[]
  dayStartHour?: number
  dayEndHour?: number
  height?: number
  theme?: 'light' | 'dark'
  className?: string
}) {
  return (
    <ColoredTimelineBar
      items={items}
      dayStartHour={dayStartHour}
      dayEndHour={dayEndHour}
      totalHeight={height}
      width={6}
      showHourTicks={false}
      theme={theme}
      className={className}
    />
  )
}

export default ColoredTimelineBar
