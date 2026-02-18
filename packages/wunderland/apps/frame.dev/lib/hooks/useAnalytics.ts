/**
 * useAnalytics Hook
 * @module lib/hooks/useAnalytics
 *
 * React hook for fetching and auto-refreshing analytics data.
 * Subscribes to real-time events and polls for updates.
 */

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { getAnalyticsData } from '@/lib/analytics'
import { subscribeToAnalytics } from '@/lib/analytics/analyticsEvents'
import type { TimeRange, AnalyticsData } from '@/lib/analytics/types'

// ============================================================================
// TYPES
// ============================================================================

export interface UseAnalyticsOptions {
  /** Time range for analytics data */
  timeRange: TimeRange
  /** Enable auto-refresh on events and polling */
  autoRefresh?: boolean
  /** Polling interval in milliseconds (default: 30000) */
  refreshInterval?: number
  /** Debounce event-triggered refreshes in ms (default: 1000) */
  eventDebounceMs?: number
}

export interface UseAnalyticsResult {
  /** Analytics data or null if loading */
  data: AnalyticsData | null
  /** Loading state */
  loading: boolean
  /** Refreshing state (data exists but updating) */
  refreshing: boolean
  /** Error if fetch failed */
  error: Error | null
  /** Manually trigger refresh */
  refresh: () => Promise<void>
  /** Last successful update time */
  lastUpdated: Date | null
}

// ============================================================================
// HOOK
// ============================================================================

export function useAnalytics(options: UseAnalyticsOptions): UseAnalyticsResult {
  const {
    timeRange,
    autoRefresh = true,
    refreshInterval = 30000,
    eventDebounceMs = 1000,
  } = options

  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  // Refs for debouncing and cleanup
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const isMountedRef = useRef(true)

  // Load/refresh data
  const loadData = useCallback(async (showRefreshing = false) => {
    if (!isMountedRef.current) return

    if (showRefreshing && data) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }
    setError(null)

    try {
      const analyticsData = await getAnalyticsData(timeRange)
      if (isMountedRef.current) {
        setData(analyticsData)
        setLastUpdated(new Date())
      }
    } catch (err) {
      console.error('[useAnalytics] Failed to load data:', err)
      if (isMountedRef.current) {
        setError(err instanceof Error ? err : new Error('Failed to load analytics'))
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false)
        setRefreshing(false)
      }
    }
  }, [timeRange, data])

  // Debounced refresh for event-triggered updates
  const debouncedRefresh = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    debounceTimerRef.current = setTimeout(() => {
      loadData(true)
    }, eventDebounceMs)
  }, [loadData, eventDebounceMs])

  // Initial load and time range changes
  useEffect(() => {
    isMountedRef.current = true
    loadData()

    return () => {
      isMountedRef.current = false
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [timeRange]) // Only reload when timeRange changes

  // Subscribe to real-time events
  useEffect(() => {
    if (!autoRefresh) return

    const unsubscribe = subscribeToAnalytics(() => {
      debouncedRefresh()
    })

    return unsubscribe
  }, [autoRefresh, debouncedRefresh])

  // Polling interval
  useEffect(() => {
    if (!autoRefresh || refreshInterval <= 0) return

    const intervalId = setInterval(() => {
      loadData(true)
    }, refreshInterval)

    return () => clearInterval(intervalId)
  }, [autoRefresh, refreshInterval, loadData])

  // Manual refresh function
  const refresh = useCallback(async () => {
    await loadData(true)
  }, [loadData])

  return {
    data,
    loading,
    refreshing,
    error,
    refresh,
    lastUpdated,
  }
}

// ============================================================================
// FEATURE TRACKING HOOK
// ============================================================================

export interface UseFeatureTrackingOptions {
  /** Feature name to track */
  featureName: string
  /** Whether to log duration on unmount */
  trackDuration?: boolean
}

/**
 * Hook for tracking feature usage
 * Logs feature entry/exit with duration
 */
export function useFeatureTracking(options: UseFeatureTrackingOptions): void {
  const { featureName, trackDuration = true } = options
  const startTimeRef = useRef<number>(Date.now())

  useEffect(() => {
    startTimeRef.current = Date.now()

    // Log feature entry (if audit service is available)
    console.log(`[Feature] Entered: ${featureName}`)

    return () => {
      if (trackDuration) {
        const durationMs = Date.now() - startTimeRef.current
        console.log(`[Feature] Exited: ${featureName} (${durationMs}ms)`)
      }
    }
  }, [featureName, trackDuration])
}

export default useAnalytics
