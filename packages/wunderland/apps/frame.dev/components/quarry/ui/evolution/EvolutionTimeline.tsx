/**
 * Evolution Timeline Component
 * @module components/quarry/ui/evolution/EvolutionTimeline
 *
 * @description
 * Main timeline visualization showing chronological PKM evolution.
 * Supports multiple zoom levels and nested collapsible timeframes.
 */

'use client'

import React, { useState, useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  Clock,
  ChevronUp,
  ChevronDown,
  Filter,
  Maximize2,
  Calendar,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { CollapsibleTimeframe } from './CollapsibleTimeframe'
import type { TimeframePeriod, EvolutionEvent, ZoomLevel } from '@/components/quarry/hooks/useEvolutionData'

// ============================================================================
// TYPES
// ============================================================================

export interface EvolutionTimelineProps {
  /** Grouped period data */
  periods: TimeframePeriod[]
  /** Current zoom level */
  zoomLevel: ZoomLevel
  /** Dark mode */
  isDark?: boolean
  /** Called when an event is clicked */
  onEventClick?: (event: EvolutionEvent) => void
  /** Maximum height before scrolling */
  maxHeight?: number | string
  /** Show expand all / collapse all controls */
  showControls?: boolean
  /** Compact mode for sidebar/widget usage */
  compact?: boolean
  /** Filter event types */
  eventTypeFilter?: EvolutionEvent['type'][]
}

// ============================================================================
// FILTER OPTIONS
// ============================================================================

const EVENT_TYPE_FILTERS: { id: EvolutionEvent['type'] | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'strand_created', label: 'Created' },
  { id: 'strand_updated', label: 'Updated' },
  { id: 'commit', label: 'Commits' },
  { id: 'tag_added', label: 'Tags' },
  { id: 'milestone', label: 'Milestones' },
]

// ============================================================================
// TIMELINE HEADER
// ============================================================================

interface TimelineHeaderProps {
  periodCount: number
  eventCount: number
  isDark: boolean
  onExpandAll: () => void
  onCollapseAll: () => void
  activeFilter: EvolutionEvent['type'] | 'all'
  onFilterChange: (filter: EvolutionEvent['type'] | 'all') => void
  compact: boolean
}

function TimelineHeader({
  periodCount,
  eventCount,
  isDark,
  onExpandAll,
  onCollapseAll,
  activeFilter,
  onFilterChange,
  compact,
}: TimelineHeaderProps) {
  const [showFilters, setShowFilters] = useState(false)

  if (compact) return null

  return (
    <div className={cn(
      'flex items-center justify-between px-4 py-3 border-b',
      isDark ? 'border-zinc-700' : 'border-zinc-200'
    )}>
      <div className="flex items-center gap-3">
        <span className={cn(
          'text-xs',
          isDark ? 'text-zinc-400' : 'text-zinc-500'
        )}>
          {periodCount} periods · {eventCount} events
        </span>
      </div>

      <div className="flex items-center gap-2">
        {/* Filter Toggle */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            'p-1.5 rounded transition-colors',
            showFilters
              ? isDark ? 'bg-zinc-700 text-zinc-200' : 'bg-zinc-200 text-zinc-700'
              : isDark ? 'hover:bg-zinc-700 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-500'
          )}
          title="Filter events"
        >
          <Filter className="w-4 h-4" />
        </button>

        {/* Expand/Collapse */}
        <button
          onClick={onExpandAll}
          className={cn(
            'p-1.5 rounded transition-colors',
            isDark ? 'hover:bg-zinc-700 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-500'
          )}
          title="Expand all"
        >
          <ChevronDown className="w-4 h-4" />
        </button>
        <button
          onClick={onCollapseAll}
          className={cn(
            'p-1.5 rounded transition-colors',
            isDark ? 'hover:bg-zinc-700 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-500'
          )}
          title="Collapse all"
        >
          <ChevronUp className="w-4 h-4" />
        </button>
      </div>

      {/* Filters Dropdown */}
      {showFilters && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className={cn(
            'absolute right-4 top-12 z-20 p-2 rounded-lg border shadow-lg',
            isDark ? 'bg-zinc-800 border-zinc-700' : 'bg-white border-zinc-200'
          )}
        >
          <div className="space-y-1">
            {EVENT_TYPE_FILTERS.map((filter) => (
              <button
                key={filter.id}
                onClick={() => {
                  onFilterChange(filter.id)
                  setShowFilters(false)
                }}
                className={cn(
                  'w-full px-3 py-1.5 text-left text-sm rounded transition-colors',
                  activeFilter === filter.id
                    ? isDark ? 'bg-zinc-700 text-zinc-200' : 'bg-zinc-100 text-zinc-900'
                    : isDark ? 'hover:bg-zinc-700/50 text-zinc-300' : 'hover:bg-zinc-50 text-zinc-600'
                )}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  )
}

// ============================================================================
// EMPTY STATE
// ============================================================================

function TimelineEmpty({ isDark }: { isDark: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <Calendar className={cn(
        'w-12 h-12 mb-4',
        isDark ? 'text-zinc-600' : 'text-zinc-300'
      )} />
      <p className={cn(
        'text-sm font-medium mb-1',
        isDark ? 'text-zinc-300' : 'text-zinc-700'
      )}>
        No activity in this time range
      </p>
      <p className={cn(
        'text-xs',
        isDark ? 'text-zinc-500' : 'text-zinc-400'
      )}>
        Events will appear as you create and update strands
      </p>
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function EvolutionTimeline({
  periods,
  zoomLevel,
  isDark = false,
  onEventClick,
  maxHeight = 600,
  showControls = true,
  compact = false,
  eventTypeFilter,
}: EvolutionTimelineProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [activeFilter, setActiveFilter] = useState<EvolutionEvent['type'] | 'all'>('all')

  // Filter periods and events based on active filter
  const filteredPeriods = useMemo(() => {
    if (activeFilter === 'all' && !eventTypeFilter?.length) {
      return periods
    }

    const filterTypes = activeFilter !== 'all' 
      ? [activeFilter] 
      : eventTypeFilter || []

    if (filterTypes.length === 0) {
      return periods
    }

    return periods.map((period) => ({
      ...period,
      events: period.events.filter((e) => filterTypes.includes(e.type)),
      children: period.children?.map((child) => ({
        ...child,
        events: child.events.filter((e) => filterTypes.includes(e.type)),
        children: child.children?.map((grandchild) => ({
          ...grandchild,
          events: grandchild.events.filter((e) => filterTypes.includes(e.type)),
        })),
      })),
    })).filter((p) => 
      p.events.length > 0 || 
      (p.children?.some((c) => c.events.length > 0 || c.children?.some((gc) => gc.events.length > 0)))
    )
  }, [periods, activeFilter, eventTypeFilter])

  // Calculate total event count
  const totalEventCount = useMemo(() => {
    let count = 0
    for (const period of filteredPeriods) {
      count += period.events.length
      if (period.children) {
        for (const child of period.children) {
          count += child.events.length
          if (child.children) {
            for (const grandchild of child.children) {
              count += grandchild.events.length
            }
          }
        }
      }
    }
    return count
  }, [filteredPeriods])

  // Expand/collapse all handlers
  const handleExpandAll = useCallback(() => {
    const allIds = new Set<string>()
    const collectIds = (p: TimeframePeriod) => {
      allIds.add(p.id)
      p.children?.forEach(collectIds)
    }
    filteredPeriods.forEach(collectIds)
    setExpandedIds(allIds)
  }, [filteredPeriods])

  const handleCollapseAll = useCallback(() => {
    setExpandedIds(new Set())
  }, [])

  // Empty state
  if (filteredPeriods.length === 0) {
    return <TimelineEmpty isDark={isDark} />
  }

  return (
    <div className="relative">
      {/* Header Controls */}
      {showControls && (
        <TimelineHeader
          periodCount={filteredPeriods.length}
          eventCount={totalEventCount}
          isDark={isDark}
          onExpandAll={handleExpandAll}
          onCollapseAll={handleCollapseAll}
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          compact={compact}
        />
      )}

      {/* Timeline Content */}
      <div
        className={cn(
          'overflow-y-auto',
          compact ? 'p-2' : 'p-4'
        )}
        style={{ maxHeight: typeof maxHeight === 'number' ? `${maxHeight}px` : maxHeight }}
      >
        <div className="space-y-1">
          {filteredPeriods.map((period, index) => (
            <CollapsibleTimeframe
              key={period.id}
              period={period}
              depth={0}
              defaultOpen={index === 0}
              isDark={isDark}
              onEventClick={onEventClick}
              showConnector={!compact}
              isLast={index === filteredPeriods.length - 1}
            />
          ))}
        </div>
      </div>

      {/* Scroll shadow indicators */}
      <div
        className={cn(
          'absolute bottom-0 left-0 right-0 h-8 pointer-events-none',
          'bg-gradient-to-t',
          isDark ? 'from-zinc-800/80' : 'from-white/80',
          'to-transparent'
        )}
      />
    </div>
  )
}

export default EvolutionTimeline

