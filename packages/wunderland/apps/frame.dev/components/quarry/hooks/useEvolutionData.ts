/**
 * Evolution Data Hook
 * @module components/quarry/hooks/useEvolutionData
 *
 * Aggregates git history, strand creation, and content changes
 * into time-period-grouped data for the Evolution Timeline view.
 */

'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { getGitCommitMetrics } from '@/lib/analytics/gitAnalyticsService'
import { getAnalyticsData } from '@/lib/analytics'
import type { TimeRange, GitCommitMetrics, AnalyticsData, TimeSeriesPoint } from '@/lib/analytics/types'

// ============================================================================
// TYPES
// ============================================================================

export type ZoomLevel = 'year' | 'quarter' | 'month' | 'week'

export interface EvolutionEvent {
  /** Unique identifier */
  id: string
  /** Event date */
  date: string
  /** Event type */
  type: 'strand_created' | 'strand_updated' | 'commit' | 'tag_added' | 'milestone'
  /** Event title/description */
  title: string
  /** Associated file path */
  path?: string
  /** Additional metadata */
  metadata?: {
    additions?: number
    deletions?: number
    author?: string
    tags?: string[]
    weave?: string
  }
}

export interface TimeframePeriod {
  /** Period identifier (e.g., "2024", "2024-Q1", "2024-01", "2024-W01") */
  id: string
  /** Display label */
  label: string
  /** Period start date */
  startDate: string
  /** Period end date */
  endDate: string
  /** Events in this period */
  events: EvolutionEvent[]
  /** Summary stats for this period */
  stats: {
    strandsCreated: number
    strandsUpdated: number
    commits: number
    tagsAdded: number
    totalChanges: number
  }
  /** Child periods (for nested collapsible view) */
  children?: TimeframePeriod[]
}

export interface EvolutionData {
  /** Total strands in the system */
  totalStrands: number
  /** Total commits tracked */
  totalCommits: number
  /** Total unique tags */
  totalTags: number
  /** Date of first content */
  firstContentDate: string | null
  /** Growth rate percentage */
  growthRate: number
  /** Time series data for chart */
  timeSeries: TimeSeriesPoint[]
  /** Grouped periods based on zoom level */
  periods: TimeframePeriod[]
  /** Recent events (last 50) */
  recentEvents: EvolutionEvent[]
  /** Milestones (significant events) */
  milestones: EvolutionEvent[]
}

interface UseEvolutionDataReturn {
  data: EvolutionData | null
  loading: boolean
  error: string | null
  zoomLevel: ZoomLevel
  setZoomLevel: (level: ZoomLevel) => void
  refresh: () => Promise<void>
}

// ============================================================================
// HELPERS
// ============================================================================

function getQuarter(date: Date): number {
  return Math.floor(date.getMonth() / 3) + 1
}

function getWeekNumber(date: Date): number {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1)
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7)
}

function formatPeriodLabel(date: Date, zoomLevel: ZoomLevel): string {
  switch (zoomLevel) {
    case 'year':
      return date.getFullYear().toString()
    case 'quarter':
      return `Q${getQuarter(date)} ${date.getFullYear()}`
    case 'month':
      return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    case 'week':
      return `Week ${getWeekNumber(date)}, ${date.getFullYear()}`
  }
}

function getPeriodId(date: Date, zoomLevel: ZoomLevel): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  
  switch (zoomLevel) {
    case 'year':
      return `${year}`
    case 'quarter':
      return `${year}-Q${getQuarter(date)}`
    case 'month':
      return `${year}-${month}`
    case 'week':
      return `${year}-W${String(getWeekNumber(date)).padStart(2, '0')}`
  }
}

function getPeriodBounds(periodId: string, zoomLevel: ZoomLevel): { start: Date; end: Date } {
  const now = new Date()
  
  switch (zoomLevel) {
    case 'year': {
      const year = parseInt(periodId, 10)
      return {
        start: new Date(year, 0, 1),
        end: new Date(year, 11, 31),
      }
    }
    case 'quarter': {
      const [yearStr, quarterStr] = periodId.split('-Q')
      const year = parseInt(yearStr, 10)
      const quarter = parseInt(quarterStr, 10)
      const startMonth = (quarter - 1) * 3
      return {
        start: new Date(year, startMonth, 1),
        end: new Date(year, startMonth + 3, 0),
      }
    }
    case 'month': {
      const [yearStr, monthStr] = periodId.split('-')
      const year = parseInt(yearStr, 10)
      const month = parseInt(monthStr, 10) - 1
      return {
        start: new Date(year, month, 1),
        end: new Date(year, month + 1, 0),
      }
    }
    case 'week': {
      const [yearStr, weekStr] = periodId.split('-W')
      const year = parseInt(yearStr, 10)
      const week = parseInt(weekStr, 10)
      const jan1 = new Date(year, 0, 1)
      const dayOffset = (week - 1) * 7 - jan1.getDay()
      const start = new Date(year, 0, 1 + dayOffset)
      const end = new Date(start)
      end.setDate(end.getDate() + 6)
      return { start, end }
    }
  }
}

function createEventsFromAnalytics(
  analytics: AnalyticsData,
  gitMetrics: GitCommitMetrics
): EvolutionEvent[] {
  const events: EvolutionEvent[] = []

  // Add strand creation events from growth data
  for (const point of analytics.growth.strandsOverTime) {
    if (point.count > 0) {
      events.push({
        id: `strand-${point.date}`,
        date: point.date,
        type: 'strand_created',
        title: `${point.count} strand${point.count > 1 ? 's' : ''} created`,
        metadata: {},
      })
    }
  }

  // Add commit events
  for (const commit of gitMetrics.recentCommits) {
    events.push({
      id: `commit-${commit.sha}`,
      date: commit.committedAt.split('T')[0],
      type: 'commit',
      title: commit.message,
      path: commit.strandPath,
      metadata: {
        additions: commit.additions,
        deletions: commit.deletions,
        author: commit.authorName,
      },
    })
  }

  // Sort by date descending
  events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return events
}

function groupEventsIntoPeriods(
  events: EvolutionEvent[],
  timeSeries: TimeSeriesPoint[],
  zoomLevel: ZoomLevel
): TimeframePeriod[] {
  const periodsMap = new Map<string, TimeframePeriod>()

  // Group events by period
  for (const event of events) {
    const date = new Date(event.date)
    const periodId = getPeriodId(date, zoomLevel)
    
    if (!periodsMap.has(periodId)) {
      const bounds = getPeriodBounds(periodId, zoomLevel)
      periodsMap.set(periodId, {
        id: periodId,
        label: formatPeriodLabel(date, zoomLevel),
        startDate: bounds.start.toISOString().split('T')[0],
        endDate: bounds.end.toISOString().split('T')[0],
        events: [],
        stats: {
          strandsCreated: 0,
          strandsUpdated: 0,
          commits: 0,
          tagsAdded: 0,
          totalChanges: 0,
        },
      })
    }

    const period = periodsMap.get(periodId)!
    period.events.push(event)

    // Update stats
    switch (event.type) {
      case 'strand_created':
        period.stats.strandsCreated++
        break
      case 'strand_updated':
        period.stats.strandsUpdated++
        break
      case 'commit':
        period.stats.commits++
        break
      case 'tag_added':
        period.stats.tagsAdded++
        break
    }
    period.stats.totalChanges++
  }

  // Convert to array and sort by date descending
  const periods = Array.from(periodsMap.values())
  periods.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())

  // Add nested children for hierarchical display
  if (zoomLevel === 'year') {
    for (const period of periods) {
      period.children = groupEventsIntoPeriods(period.events, [], 'quarter')
    }
  } else if (zoomLevel === 'quarter') {
    for (const period of periods) {
      period.children = groupEventsIntoPeriods(period.events, [], 'month')
    }
  } else if (zoomLevel === 'month') {
    for (const period of periods) {
      period.children = groupEventsIntoPeriods(period.events, [], 'week')
    }
  }

  return periods
}

function identifyMilestones(events: EvolutionEvent[], totalStrands: number): EvolutionEvent[] {
  const milestones: EvolutionEvent[] = []
  
  // Find first event
  if (events.length > 0) {
    const firstEvent = events[events.length - 1]
    milestones.push({
      ...firstEvent,
      id: 'milestone-first',
      type: 'milestone',
      title: 'Knowledge base started',
    })
  }

  // Find milestone counts (10, 25, 50, 100, etc.)
  const milestoneThresholds = [10, 25, 50, 100, 250, 500, 1000]
  let runningCount = 0
  
  const sortedEvents = [...events].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  )

  for (const event of sortedEvents) {
    if (event.type === 'strand_created') {
      runningCount++
      
      for (const threshold of milestoneThresholds) {
        if (runningCount >= threshold && !milestones.some(m => m.id === `milestone-${threshold}`)) {
          milestones.push({
            id: `milestone-${threshold}`,
            date: event.date,
            type: 'milestone',
            title: `Reached ${threshold} strands`,
            metadata: {},
          })
        }
      }
    }
  }

  return milestones.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

// ============================================================================
// HOOK
// ============================================================================

export function useEvolutionData(): UseEvolutionDataReturn {
  const [data, setData] = useState<EvolutionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>('month')

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      // Fetch analytics data for 'all' time to get full history
      const [analytics, gitMetrics] = await Promise.all([
        getAnalyticsData('all'),
        getGitCommitMetrics('all'),
      ])

      // Create events from the analytics data
      const events = createEventsFromAnalytics(analytics, gitMetrics)

      // Find first content date
      const sortedDates = events
        .map(e => e.date)
        .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
      const firstContentDate = sortedDates[0] || null

      // Group events into periods based on zoom level
      const periods = groupEventsIntoPeriods(
        events,
        analytics.growth.strandsOverTime,
        zoomLevel
      )

      // Identify milestones
      const milestones = identifyMilestones(events, analytics.growth.totalStrands)

      // Build the evolution data
      const evolutionData: EvolutionData = {
        totalStrands: analytics.growth.totalStrands,
        totalCommits: gitMetrics.totalCommits,
        totalTags: analytics.tags.totalUniqueTags,
        firstContentDate,
        growthRate: analytics.growth.growthRate,
        timeSeries: analytics.growth.strandsOverTime,
        periods,
        recentEvents: events.slice(0, 50),
        milestones,
      }

      setData(evolutionData)
    } catch (err) {
      console.error('[useEvolutionData] Failed to fetch data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load evolution data')
    } finally {
      setLoading(false)
    }
  }, [zoomLevel])

  // Fetch on mount and when zoom level changes
  useEffect(() => {
    fetchData()
  }, [fetchData])

  return {
    data,
    loading,
    error,
    zoomLevel,
    setZoomLevel,
    refresh: fetchData,
  }
}

export default useEvolutionData

