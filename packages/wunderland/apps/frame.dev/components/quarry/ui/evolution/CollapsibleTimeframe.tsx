/**
 * Collapsible Timeframe Component
 * @module components/quarry/ui/evolution/CollapsibleTimeframe
 *
 * @description
 * Extends CollapsibleSection with timeline-specific features:
 * - Period stats summary in header
 * - Event count badges by type
 * - Progress indicator bar
 * - Nested child periods support
 * - Visual timeline connector
 */

'use client'

import React, { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronRight,
  Calendar,
  FileText,
  GitCommit,
  Tag,
  Edit,
  Award,
  TrendingUp,
  Clock,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TimeframePeriod, EvolutionEvent } from '@/components/quarry/hooks/useEvolutionData'

// ============================================================================
// TYPES
// ============================================================================

export interface CollapsibleTimeframeProps {
  /** Timeframe period data */
  period: TimeframePeriod
  /** Nesting depth level */
  depth?: number
  /** Whether this period is open by default */
  defaultOpen?: boolean
  /** Dark mode */
  isDark?: boolean
  /** Called when an event is clicked */
  onEventClick?: (event: EvolutionEvent) => void
  /** Show timeline connector line */
  showConnector?: boolean
  /** Is last item in list (affects connector) */
  isLast?: boolean
}

// ============================================================================
// HELPERS
// ============================================================================

function getEventIcon(type: EvolutionEvent['type']) {
  switch (type) {
    case 'strand_created':
      return FileText
    case 'strand_updated':
      return Edit
    case 'commit':
      return GitCommit
    case 'tag_added':
      return Tag
    case 'milestone':
      return Award
    default:
      return Clock
  }
}

function getEventColor(type: EvolutionEvent['type'], isDark: boolean) {
  switch (type) {
    case 'strand_created':
      return isDark ? 'text-emerald-400' : 'text-emerald-600'
    case 'strand_updated':
      return isDark ? 'text-cyan-400' : 'text-cyan-600'
    case 'commit':
      return isDark ? 'text-violet-400' : 'text-violet-600'
    case 'tag_added':
      return isDark ? 'text-amber-400' : 'text-amber-600'
    case 'milestone':
      return isDark ? 'text-rose-400' : 'text-rose-600'
    default:
      return isDark ? 'text-zinc-400' : 'text-zinc-500'
  }
}

function getEventBgColor(type: EvolutionEvent['type'], isDark: boolean) {
  switch (type) {
    case 'strand_created':
      return isDark ? 'bg-emerald-500/20' : 'bg-emerald-100'
    case 'strand_updated':
      return isDark ? 'bg-cyan-500/20' : 'bg-cyan-100'
    case 'commit':
      return isDark ? 'bg-violet-500/20' : 'bg-violet-100'
    case 'tag_added':
      return isDark ? 'bg-amber-500/20' : 'bg-amber-100'
    case 'milestone':
      return isDark ? 'bg-rose-500/20' : 'bg-rose-100'
    default:
      return isDark ? 'bg-zinc-500/20' : 'bg-zinc-100'
  }
}

// ============================================================================
// STAT BADGE
// ============================================================================

interface StatBadgeProps {
  icon: React.ElementType
  value: number
  label: string
  isDark: boolean
  color?: string
}

function StatBadge({ icon: Icon, value, label, isDark, color }: StatBadgeProps) {
  if (value === 0) return null
  
  return (
    <div
      title={label}
      className={cn(
        'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs',
        isDark ? 'bg-zinc-700/50' : 'bg-zinc-100'
      )}
    >
      <Icon className={cn('w-3 h-3', color || (isDark ? 'text-zinc-400' : 'text-zinc-500'))} />
      <span className={isDark ? 'text-zinc-300' : 'text-zinc-600'}>{value}</span>
    </div>
  )
}

// ============================================================================
// EVENT ITEM
// ============================================================================

interface EventItemProps {
  event: EvolutionEvent
  isDark: boolean
  onClick?: () => void
  showDate?: boolean
}

function EventItem({ event, isDark, onClick, showDate = true }: EventItemProps) {
  const Icon = getEventIcon(event.type)
  const color = getEventColor(event.type, isDark)
  const bgColor = getEventBgColor(event.type, isDark)

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-start gap-3 p-2 rounded-lg text-left transition-colors',
        isDark ? 'hover:bg-zinc-700/50' : 'hover:bg-zinc-50'
      )}
    >
      {/* Icon */}
      <div className={cn('w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0', bgColor)}>
        <Icon className={cn('w-3.5 h-3.5', color)} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={cn(
          'text-sm font-medium truncate',
          isDark ? 'text-zinc-200' : 'text-zinc-800'
        )}>
          {event.title}
        </p>
        {event.path && (
          <p className={cn(
            'text-xs truncate mt-0.5',
            isDark ? 'text-zinc-500' : 'text-zinc-400'
          )}>
            {event.path}
          </p>
        )}
        {event.metadata && (event.metadata.additions !== undefined || event.metadata.deletions !== undefined) && (
          <div className="flex items-center gap-2 mt-1">
            {event.metadata.additions !== undefined && event.metadata.additions > 0 && (
              <span className="text-xs text-emerald-500">+{event.metadata.additions}</span>
            )}
            {event.metadata.deletions !== undefined && event.metadata.deletions > 0 && (
              <span className="text-xs text-red-500">-{event.metadata.deletions}</span>
            )}
          </div>
        )}
      </div>

      {/* Date */}
      {showDate && (
        <time className={cn(
          'text-xs flex-shrink-0',
          isDark ? 'text-zinc-500' : 'text-zinc-400'
        )}>
          {new Date(event.date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          })}
        </time>
      )}
    </button>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function CollapsibleTimeframe({
  period,
  depth = 0,
  defaultOpen = false,
  isDark = false,
  onEventClick,
  showConnector = true,
  isLast = false,
}: CollapsibleTimeframeProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const hasChildren = period.children && period.children.length > 0
  const hasEvents = period.events.length > 0
  const hasContent = hasChildren || hasEvents

  // Calculate activity level for visual indicator (0-4 scale)
  const activityLevel = Math.min(4, Math.floor(Math.log2(period.stats.totalChanges + 1)))

  const handleToggle = useCallback(() => {
    if (hasContent) {
      setIsOpen(prev => !prev)
    }
  }, [hasContent])

  // Animation variants
  const contentVariants = {
    open: {
      height: 'auto',
      opacity: 1,
      transition: {
        height: { duration: 0.3, ease: [0.4, 0, 0.2, 1] },
        opacity: { duration: 0.2, delay: 0.1 },
      },
    },
    closed: {
      height: 0,
      opacity: 0,
      transition: {
        height: { duration: 0.3, ease: [0.4, 0, 0.2, 1] },
        opacity: { duration: 0.1 },
      },
    },
  }

  const chevronVariants = {
    open: { rotate: 90 },
    closed: { rotate: 0 },
  }

  // Indent based on depth
  const indentPadding = depth * 16

  return (
    <div className="relative">
      {/* Timeline connector line */}
      {showConnector && !isLast && (
        <div
          className={cn(
            'absolute left-4 top-8 bottom-0 w-0.5',
            isDark ? 'bg-zinc-700' : 'bg-zinc-200'
          )}
          style={{ marginLeft: indentPadding }}
        />
      )}

      {/* Header */}
      <button
        type="button"
        onClick={handleToggle}
        disabled={!hasContent}
        aria-expanded={isOpen}
        className={cn(
          'w-full flex items-center gap-3 py-2 px-3 text-left transition-colors rounded-lg',
          hasContent ? 'cursor-pointer' : 'cursor-default',
          isDark ? 'hover:bg-zinc-800/50' : 'hover:bg-zinc-50'
        )}
        style={{ paddingLeft: 12 + indentPadding }}
      >
        {/* Timeline dot */}
        <div className={cn(
          'relative w-2.5 h-2.5 rounded-full flex-shrink-0 z-10',
          activityLevel === 0 && (isDark ? 'bg-zinc-600' : 'bg-zinc-300'),
          activityLevel === 1 && 'bg-emerald-500/50',
          activityLevel === 2 && 'bg-emerald-500/70',
          activityLevel === 3 && 'bg-emerald-500',
          activityLevel >= 4 && 'bg-emerald-400 ring-2 ring-emerald-400/30'
        )}>
          {/* Pulse for high activity */}
          {activityLevel >= 3 && (
            <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-50" />
          )}
        </div>

        {/* Chevron */}
        {hasContent && (
          <motion.div
            variants={chevronVariants}
            initial={false}
            animate={isOpen ? 'open' : 'closed'}
            transition={{ duration: 0.2 }}
          >
            <ChevronRight className={cn(
              'w-4 h-4 flex-shrink-0',
              isDark ? 'text-zinc-500' : 'text-zinc-400'
            )} />
          </motion.div>
        )}

        {/* Label */}
        <span className={cn(
          'flex-1 font-medium',
          depth === 0 ? 'text-base' : 'text-sm',
          isDark ? 'text-zinc-200' : 'text-zinc-800'
        )}>
          {period.label}
        </span>

        {/* Stats Badges */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <StatBadge
            icon={FileText}
            value={period.stats.strandsCreated}
            label="Strands created"
            isDark={isDark}
            color={isDark ? 'text-emerald-400' : 'text-emerald-600'}
          />
          <StatBadge
            icon={GitCommit}
            value={period.stats.commits}
            label="Commits"
            isDark={isDark}
            color={isDark ? 'text-violet-400' : 'text-violet-600'}
          />
          <StatBadge
            icon={Tag}
            value={period.stats.tagsAdded}
            label="Tags added"
            isDark={isDark}
            color={isDark ? 'text-amber-400' : 'text-amber-600'}
          />
        </div>
      </button>

      {/* Content */}
      <AnimatePresence initial={false}>
        {isOpen && hasContent && (
          <motion.div
            initial="closed"
            animate="open"
            exit="closed"
            variants={contentVariants}
            className="overflow-hidden"
          >
            <div className="pt-1 pb-2" style={{ paddingLeft: 24 + indentPadding }}>
              {/* Nested child periods */}
              {hasChildren && (
                <div className="space-y-1 mb-2">
                  {period.children!.map((child, index) => (
                    <CollapsibleTimeframe
                      key={child.id}
                      period={child}
                      depth={depth + 1}
                      isDark={isDark}
                      onEventClick={onEventClick}
                      showConnector={showConnector}
                      isLast={index === period.children!.length - 1}
                    />
                  ))}
                </div>
              )}

              {/* Direct events (only show if no children or at deepest level) */}
              {!hasChildren && hasEvents && (
                <div className={cn(
                  'space-y-0.5 rounded-lg p-2',
                  isDark ? 'bg-zinc-800/30' : 'bg-zinc-50/50'
                )}>
                  {period.events.slice(0, 10).map((event) => (
                    <EventItem
                      key={event.id}
                      event={event}
                      isDark={isDark}
                      onClick={() => onEventClick?.(event)}
                    />
                  ))}
                  {period.events.length > 10 && (
                    <p className={cn(
                      'text-xs text-center py-2',
                      isDark ? 'text-zinc-500' : 'text-zinc-400'
                    )}>
                      +{period.events.length - 10} more events
                    </p>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default CollapsibleTimeframe

