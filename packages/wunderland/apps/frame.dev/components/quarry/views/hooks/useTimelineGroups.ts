/**
 * useTimelineGroups Hook
 *
 * Groups strands by time period for timeline view.
 * @module components/quarry/views/hooks/useTimelineGroups
 */

'use client'

import { useMemo, useCallback, useState } from 'react'
import {
  isToday,
  isYesterday,
  isThisWeek,
  isThisMonth,
  startOfDay,
  parseISO,
} from 'date-fns'
import type { StrandWithPath, TimelineGroup, TimelinePeriod } from '../types'

interface UseTimelineGroupsOptions {
  /** Initially collapsed groups */
  initialCollapsed?: TimelinePeriod[]
  /** Callback when groups change */
  onCollapsedChange?: (collapsed: TimelinePeriod[]) => void
}

interface UseTimelineGroupsReturn {
  /** Grouped strands */
  groups: TimelineGroup[]
  /** Collapsed group periods */
  collapsedGroups: TimelinePeriod[]
  /** Toggle group collapsed state */
  toggleGroup: (period: TimelinePeriod) => void
  /** Check if group is collapsed */
  isCollapsed: (period: TimelinePeriod) => boolean
}

/**
 * Get the time period for a date
 */
function getTimePeriod(dateStr: string | undefined): TimelinePeriod {
  if (!dateStr) return 'older'

  try {
    const date = parseISO(dateStr)

    if (isToday(date)) return 'today'
    if (isYesterday(date)) return 'yesterday'
    if (isThisWeek(date)) return 'this-week'
    if (isThisMonth(date)) return 'this-month'
    return 'older'
  } catch {
    return 'older'
  }
}

/**
 * Get display label for period
 */
function getPeriodLabel(period: TimelinePeriod): string {
  switch (period) {
    case 'today':
      return 'Today'
    case 'yesterday':
      return 'Yesterday'
    case 'this-week':
      return 'This Week'
    case 'this-month':
      return 'This Month'
    case 'older':
      return 'Older'
    default:
      return period
  }
}

/**
 * Period order for sorting
 */
const PERIOD_ORDER: TimelinePeriod[] = ['today', 'yesterday', 'this-week', 'this-month', 'older']

/**
 * Hook for grouping strands by time period
 */
export function useTimelineGroups(
  strands: StrandWithPath[],
  options: UseTimelineGroupsOptions = {}
): UseTimelineGroupsReturn {
  const { initialCollapsed = [], onCollapsedChange } = options

  const [collapsedGroups, setCollapsedGroups] = useState<TimelinePeriod[]>(initialCollapsed)

  // Group strands by period
  const groups = useMemo((): TimelineGroup[] => {
    const groupMap = new Map<TimelinePeriod, StrandWithPath[]>()

    // Initialize all periods
    PERIOD_ORDER.forEach((period) => {
      groupMap.set(period, [])
    })

    // Group strands
    strands.forEach((strand) => {
      const period = getTimePeriod(strand.lastModified)
      const group = groupMap.get(period) || []
      group.push(strand)
      groupMap.set(period, group)
    })

    // Sort strands within each group by date (newest first)
    groupMap.forEach((groupStrands) => {
      groupStrands.sort((a, b) => {
        const aDate = a.lastModified ? new Date(a.lastModified).getTime() : 0
        const bDate = b.lastModified ? new Date(b.lastModified).getTime() : 0
        return bDate - aDate
      })
    })

    // Convert to array, filter empty groups
    return PERIOD_ORDER.map((period) => ({
      label: getPeriodLabel(period),
      period,
      strands: groupMap.get(period) || [],
      isCollapsed: collapsedGroups.includes(period),
    })).filter((group) => group.strands.length > 0)
  }, [strands, collapsedGroups])

  const toggleGroup = useCallback((period: TimelinePeriod) => {
    setCollapsedGroups((prev) => {
      const newCollapsed = prev.includes(period)
        ? prev.filter((p) => p !== period)
        : [...prev, period]
      onCollapsedChange?.(newCollapsed)
      return newCollapsed
    })
  }, [onCollapsedChange])

  const isCollapsed = useCallback((period: TimelinePeriod) => {
    return collapsedGroups.includes(period)
  }, [collapsedGroups])

  return {
    groups,
    collapsedGroups,
    toggleGroup,
    isCollapsed,
  }
}

export default useTimelineGroups
