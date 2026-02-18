'use client'

/**
 * Timeline Event Card
 *
 * Premium event/task card for the StreamlinedDayView timeline.
 * Features animated entrance, completion toggle with haptics,
 * category icons, and overlap indication.
 *
 * @module components/quarry/ui/planner/TimelineEventCard
 */

import { useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import * as Icons from 'lucide-react'
import {
  Check,
  Clock,
  MapPin,
  Users,
  AlertCircle,
  Layers,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useHaptics } from '@/components/quarry/hooks/useHaptics'
import type { TimelineItem } from '@/lib/planner/timelineUtils'
import {
  getCategoryIcon,
  getCategoryColor,
  formatTimeRange,
  formatDurationCompact,
} from '@/lib/planner/timelineUtils'

// ============================================================================
// TYPES
// ============================================================================

export interface TimelineEventCardProps {
  /** The timeline item to render */
  item: TimelineItem
  /** Visual style variant */
  variant?: 'default' | 'minimal' | 'detailed'
  /** Whether the card is currently selected */
  isSelected?: boolean
  /** Whether to show overlap indicator */
  showOverlapBadge?: boolean
  /** Animation delay for staggered entrance */
  animationDelay?: number
  /** Theme */
  theme?: 'light' | 'dark'
  /** Called when card is clicked */
  onClick?: () => void
  /** Called when completion checkbox is toggled */
  onToggleComplete?: (completed: boolean) => void
  /** Additional class names */
  className?: string
}

// ============================================================================
// ANIMATION VARIANTS
// ============================================================================

const cardVariants = {
  initial: { opacity: 0, x: -20, scale: 0.95 },
  animate: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 25,
    },
  },
  exit: {
    opacity: 0,
    x: 20,
    scale: 0.95,
    transition: { duration: 0.15 },
  },
  hover: {
    scale: 1.02,
    boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
    transition: { type: 'spring', stiffness: 400 },
  },
  tap: { scale: 0.98 },
}

const checkmarkVariants = {
  unchecked: { pathLength: 0, opacity: 0 },
  checked: {
    pathLength: 1,
    opacity: 1,
    transition: { duration: 0.25, ease: 'easeOut' },
  },
}

const pulseVariants = {
  initial: { scale: 1 },
  pulse: {
    scale: [1, 1.15, 1],
    transition: { duration: 0.3 },
  },
}

// ============================================================================
// COMPONENT
// ============================================================================

export function TimelineEventCard({
  item,
  variant = 'default',
  isSelected = false,
  showOverlapBadge = true,
  animationDelay = 0,
  theme = 'dark',
  onClick,
  onToggleComplete,
  className,
}: TimelineEventCardProps) {
  const isDark = theme === 'dark'
  const haptics = useHaptics()

  // Get icon component
  const iconName = getCategoryIcon(item)
  const IconComponent = (Icons[iconName as keyof typeof Icons] as React.ComponentType<{ className?: string; size?: number }>) || Icons.Circle

  // Get color (may come from supertag)
  const itemColor = getCategoryColor(item)

  // Format time display
  const timeDisplay = useMemo(() => {
    return formatTimeRange(item.startTime, item.endTime)
  }, [item.startTime, item.endTime])

  const durationDisplay = useMemo(() => {
    return formatDurationCompact(item.duration)
  }, [item.duration])

  // Has overlaps?
  const overlapCount = item.overlaps?.length || 0
  const hasOverlaps = overlapCount > 0

  // Handle checkbox toggle
  const handleToggle = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      haptics.haptic('success')
      onToggleComplete?.(!item.completed)
    },
    [item.completed, onToggleComplete, haptics]
  )

  return (
    <motion.div
      data-tutorial="event-card"
      className={cn(
        'relative group',
        'rounded-xl overflow-hidden',
        'cursor-pointer select-none',
        'border transition-colors',
        isDark
          ? 'bg-zinc-900/80 backdrop-blur-sm border-zinc-800'
          : 'bg-white/90 backdrop-blur-sm border-zinc-200',
        isSelected && (isDark ? 'ring-2 ring-emerald-500/50' : 'ring-2 ring-emerald-400/50'),
        item.completed && 'opacity-60',
        className
      )}
      style={{
        borderLeftWidth: '4px',
        borderLeftColor: itemColor,
      }}
      variants={cardVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      whileHover="hover"
      whileTap="tap"
      transition={{ delay: animationDelay }}
      onClick={onClick}
      layout
    >
      {/* Content container */}
      <div className="flex items-start gap-3 p-3">
        {/* Completion checkbox (tasks only) */}
        {item.type === 'task' && (
          <motion.button
            className={cn(
              'relative flex-shrink-0 mt-0.5',
              'w-5 h-5 rounded-full border-2 transition-colors',
              'flex items-center justify-center',
              item.completed
                ? 'bg-emerald-500 border-emerald-500'
                : isDark
                  ? 'border-zinc-600 hover:border-emerald-400'
                  : 'border-zinc-300 hover:border-emerald-500'
            )}
            onClick={handleToggle}
            variants={pulseVariants}
            whileTap="pulse"
          >
            <AnimatePresence>
              {item.completed && (
                <motion.svg
                  className="w-3 h-3 text-white"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={3}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <motion.path
                    d="M5 12l5 5L20 7"
                    variants={checkmarkVariants}
                    initial="unchecked"
                    animate="checked"
                    exit="unchecked"
                  />
                </motion.svg>
              )}
            </AnimatePresence>
          </motion.button>
        )}

        {/* Category icon (events only) */}
        {item.type === 'event' && (
          <div
            className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
            style={{
              backgroundColor: `${itemColor}20`,
            }}
          >
            <span style={{ color: itemColor }} className="transition-transform group-hover:scale-110">
              <IconComponent size={16} />
            </span>
          </div>
        )}

        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* Title */}
          <h3
            className={cn(
              'font-medium text-sm leading-tight truncate',
              item.completed && 'line-through',
              isDark ? 'text-zinc-100' : 'text-zinc-900'
            )}
          >
            {item.title}
          </h3>

          {/* Time & Duration */}
          <div
            className={cn(
              'flex items-center gap-2 mt-1',
              'text-xs',
              isDark ? 'text-zinc-400' : 'text-zinc-500'
            )}
          >
            <div className="flex items-center gap-1">
              <Clock size={12} />
              <span>{timeDisplay}</span>
            </div>
            <span className="opacity-50">·</span>
            <span>{durationDisplay}</span>
          </div>

          {/* Additional info for detailed variant */}
          {variant === 'detailed' && (
            <div className={cn(
              'flex items-center gap-3 mt-2',
              'text-xs',
              isDark ? 'text-zinc-500' : 'text-zinc-400'
            )}>
              {/* Location */}
              {item.location && (
                <div className="flex items-center gap-1 truncate">
                  <MapPin size={11} />
                  <span className="truncate">{item.location}</span>
                </div>
              )}

              {/* Attendees */}
              {item.attendeesCount && item.attendeesCount > 0 && (
                <div className="flex items-center gap-1">
                  <Users size={11} />
                  <span>{item.attendeesCount}</span>
                </div>
              )}

              {/* Priority badge for tasks */}
              {item.type === 'task' && item.priority && item.priority !== 'medium' && (
                <span
                  className={cn(
                    'px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide',
                    item.priority === 'urgent' && 'bg-red-500/20 text-red-400',
                    item.priority === 'high' && 'bg-orange-500/20 text-orange-400',
                    item.priority === 'low' && 'bg-emerald-500/20 text-emerald-400'
                  )}
                >
                  {item.priority}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Category icon for tasks (right side) */}
        {item.type === 'task' && (
          <div
            className="flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center opacity-60 group-hover:opacity-100 transition-opacity"
            style={{
              backgroundColor: `${itemColor}15`,
            }}
          >
            <span style={{ color: itemColor }}>
              <IconComponent size={14} />
            </span>
          </div>
        )}
      </div>

      {/* Overlap badge */}
      {showOverlapBadge && hasOverlaps && (
        <motion.div
          className={cn(
            'absolute top-2 right-2',
            'flex items-center gap-1 px-1.5 py-0.5 rounded-full',
            'text-[10px] font-medium',
            isDark
              ? 'bg-amber-500/20 text-amber-400'
              : 'bg-amber-100 text-amber-600'
          )}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: animationDelay + 0.1, type: 'spring' }}
        >
          <Layers size={10} />
          <span>+{overlapCount}</span>
        </motion.div>
      )}

      {/* Subtle gradient overlay on hover */}
      <motion.div
        className={cn(
          'absolute inset-0 pointer-events-none',
          'opacity-0 group-hover:opacity-100 transition-opacity'
        )}
        style={{
          background: `linear-gradient(135deg, ${itemColor}08 0%, transparent 50%)`,
        }}
      />

      {/* Selection indicator */}
      {isSelected && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            boxShadow: `inset 0 0 0 2px ${itemColor}40`,
            borderRadius: 'inherit',
          }}
        />
      )}
    </motion.div>
  )
}

// ============================================================================
// MINIMAL VARIANT
// ============================================================================

export function TimelineEventCardMinimal({
  item,
  theme = 'dark',
  onClick,
  onToggleComplete,
  className,
}: Omit<TimelineEventCardProps, 'variant'>) {
  const isDark = theme === 'dark'
  const haptics = useHaptics()
  const itemColor = getCategoryColor(item)

  const handleToggle = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      haptics.haptic('light')
      onToggleComplete?.(!item.completed)
    },
    [item.completed, onToggleComplete, haptics]
  )

  return (
    <motion.div
      className={cn(
        'flex items-center gap-2 py-1.5 px-2 rounded-lg',
        'cursor-pointer transition-colors',
        isDark
          ? 'hover:bg-zinc-800/50'
          : 'hover:bg-zinc-100/50',
        item.completed && 'opacity-50',
        className
      )}
      whileHover={{ x: 4 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
    >
      {/* Color dot */}
      <div
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{ backgroundColor: itemColor }}
      />

      {/* Checkbox for tasks */}
      {item.type === 'task' && (
        <button
          className={cn(
            'w-4 h-4 rounded-full border flex-shrink-0',
            'flex items-center justify-center transition-colors',
            item.completed
              ? 'bg-emerald-500 border-emerald-500'
              : isDark
                ? 'border-zinc-600'
                : 'border-zinc-300'
          )}
          onClick={handleToggle}
        >
          {item.completed && <Check size={10} className="text-white" />}
        </button>
      )}

      {/* Title */}
      <span
        className={cn(
          'text-sm truncate flex-1',
          item.completed && 'line-through',
          isDark ? 'text-zinc-300' : 'text-zinc-700'
        )}
      >
        {item.title}
      </span>

      {/* Time */}
      <span
        className={cn(
          'text-xs flex-shrink-0',
          isDark ? 'text-zinc-500' : 'text-zinc-400'
        )}
      >
        {item.startTime.toLocaleTimeString([], {
          hour: 'numeric',
          minute: '2-digit',
        })}
      </span>
    </motion.div>
  )
}

export default TimelineEventCard
