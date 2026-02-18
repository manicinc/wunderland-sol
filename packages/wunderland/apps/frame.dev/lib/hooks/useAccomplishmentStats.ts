'use client'

/**
 * React hooks for accomplishment statistics
 * @module lib/hooks/useAccomplishmentStats
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  getAccomplishmentStats,
  getTaskCompletionStreak,
  getCompletionTrend,
  subscribeToCompletions,
  type AccomplishmentStats,
  type TaskCompletionStreak,
  type TimeSeriesPoint,
  type TimePeriod,
} from '../accomplishment'

// ============================================================================
// STATS HOOK
// ============================================================================

export interface UseAccomplishmentStatsOptions {
  period: TimePeriod
  date?: string
  autoRefresh?: boolean
}

export interface UseAccomplishmentStatsResult {
  stats: AccomplishmentStats | null
  loading: boolean
  error: Error | null
  refresh: () => Promise<void>
}

/**
 * Hook for accomplishment statistics
 */
export function useAccomplishmentStats(
  options: UseAccomplishmentStatsOptions
): UseAccomplishmentStatsResult {
  const { period, date, autoRefresh = true } = options

  const [stats, setStats] = useState<AccomplishmentStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getAccomplishmentStats(period, date)
      setStats(data)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load stats'))
    } finally {
      setLoading(false)
    }
  }, [period, date])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Subscribe to real-time updates
  useEffect(() => {
    if (!autoRefresh) return

    const unsubscribe = subscribeToCompletions(() => {
      loadData()
    })
    return unsubscribe
  }, [autoRefresh, loadData])

  return {
    stats,
    loading,
    error,
    refresh: loadData,
  }
}

// ============================================================================
// STREAK HOOK
// ============================================================================

export interface UseTaskCompletionStreakResult {
  streak: TaskCompletionStreak | null
  loading: boolean
  error: Error | null
  refresh: () => Promise<void>
  isActiveToday: boolean
  isAtRisk: boolean
}

/**
 * Hook for task completion streak
 */
export function useTaskCompletionStreak(): UseTaskCompletionStreakResult {
  const [streak, setStreak] = useState<TaskCompletionStreak | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getTaskCompletionStreak()
      setStreak(data)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load streak'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Subscribe to real-time updates
  useEffect(() => {
    const unsubscribe = subscribeToCompletions(() => {
      loadData()
    })
    return unsubscribe
  }, [loadData])

  // Derived state
  const isActiveToday = useMemo(() => {
    if (!streak) return false
    const today = new Date().toISOString().split('T')[0]
    return (streak.streakDates ?? []).includes(today)
  }, [streak])

  const isAtRisk = useMemo(() => {
    if (!streak) return false
    return streak.current > 0 && streak.daysUntilBreak === 0
  }, [streak])

  return {
    streak,
    loading,
    error,
    refresh: loadData,
    isActiveToday,
    isAtRisk,
  }
}

// ============================================================================
// TREND HOOK
// ============================================================================

export interface UseCompletionTrendOptions {
  days?: number
  autoRefresh?: boolean
}

export interface UseCompletionTrendResult {
  trend: TimeSeriesPoint[]
  loading: boolean
  error: Error | null
  refresh: () => Promise<void>
  totalInPeriod: number
  averagePerDay: number
  bestDay: TimeSeriesPoint | null
}

/**
 * Hook for completion trend over time
 */
export function useCompletionTrend(
  options: UseCompletionTrendOptions = {}
): UseCompletionTrendResult {
  const { days = 30, autoRefresh = true } = options

  const [trend, setTrend] = useState<TimeSeriesPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getCompletionTrend(days)
      setTrend(data)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load trend'))
    } finally {
      setLoading(false)
    }
  }, [days])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Subscribe to real-time updates
  useEffect(() => {
    if (!autoRefresh) return

    const unsubscribe = subscribeToCompletions(() => {
      loadData()
    })
    return unsubscribe
  }, [autoRefresh, loadData])

  // Derived stats
  const totalInPeriod = useMemo(() => {
    return trend.reduce((sum, point) => sum + point.count, 0)
  }, [trend])

  const averagePerDay = useMemo(() => {
    if (trend.length === 0) return 0
    return Math.round((totalInPeriod / trend.length) * 10) / 10
  }, [trend, totalInPeriod])

  const bestDay = useMemo(() => {
    if (trend.length === 0) return null
    return trend.reduce((best, point) =>
      point.count > best.count ? point : best
    , trend[0])
  }, [trend])

  return {
    trend,
    loading,
    error,
    refresh: loadData,
    totalInPeriod,
    averagePerDay,
    bestDay,
  }
}

// ============================================================================
// QUICK STATS HOOK
// ============================================================================

export interface QuickStats {
  today: number
  week: number
  month: number
  streak: number
  longestStreak: number
}

export interface UseQuickStatsResult {
  stats: QuickStats | null
  loading: boolean
  error: Error | null
  refresh: () => Promise<void>
}

/**
 * Hook for quick overview stats (today, week, month, streak)
 */
export function useQuickStats(): UseQuickStatsResult {
  const [stats, setStats] = useState<QuickStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch all stats in parallel
      const [dayStats, weekStats, monthStats, streakData] = await Promise.all([
        getAccomplishmentStats('day'),
        getAccomplishmentStats('week'),
        getAccomplishmentStats('month'),
        getTaskCompletionStreak(),
      ])

      setStats({
        today: dayStats.totalCompleted,
        week: weekStats.totalCompleted,
        month: monthStats.totalCompleted,
        streak: streakData.current,
        longestStreak: streakData.longest,
      })
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load quick stats'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Subscribe to real-time updates
  useEffect(() => {
    const unsubscribe = subscribeToCompletions(() => {
      loadData()
    })
    return unsubscribe
  }, [loadData])

  return {
    stats,
    loading,
    error,
    refresh: loadData,
  }
}
