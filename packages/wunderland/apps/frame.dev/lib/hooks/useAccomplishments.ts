'use client'

/**
 * React hooks for accomplishment tracking
 * @module lib/hooks/useAccomplishments
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  getAccomplishmentsForDate,
  getAccomplishmentsForWeek,
  getAccomplishmentsForMonth,
  getAccomplishmentsInRange,
  generateWhatGotDoneMarkdown,
  subscribeToCompletions,
  type AccomplishmentItem,
  type DailyAccomplishments,
  type WeeklyAccomplishments,
  type MonthlyAccomplishments,
  type TimePeriod,
  type AccomplishmentSyncConfig,
} from '../accomplishment'

// ============================================================================
// DAILY ACCOMPLISHMENTS HOOK
// ============================================================================

export interface UseDailyAccomplishmentsResult {
  accomplishments: DailyAccomplishments | null
  loading: boolean
  error: Error | null
  refresh: () => Promise<void>
  generateMarkdown: (config?: Partial<AccomplishmentSyncConfig>) => Promise<string>
}

/**
 * Hook for daily accomplishments
 */
export function useDailyAccomplishments(date: string): UseDailyAccomplishmentsResult {
  const [accomplishments, setAccomplishments] = useState<DailyAccomplishments | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getAccomplishmentsForDate(date)
      setAccomplishments(data)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load accomplishments'))
    } finally {
      setLoading(false)
    }
  }, [date])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Subscribe to real-time updates
  useEffect(() => {
    const unsubscribe = subscribeToCompletions((event) => {
      if (event.item.completedDate === date) {
        loadData()
      }
    })
    return unsubscribe
  }, [date, loadData])

  const generateMarkdown = useCallback(
    async (config?: Partial<AccomplishmentSyncConfig>) => {
      return generateWhatGotDoneMarkdown(date, config)
    },
    [date]
  )

  return {
    accomplishments,
    loading,
    error,
    refresh: loadData,
    generateMarkdown,
  }
}

// ============================================================================
// WEEKLY ACCOMPLISHMENTS HOOK
// ============================================================================

export interface UseWeeklyAccomplishmentsResult {
  accomplishments: WeeklyAccomplishments | null
  loading: boolean
  error: Error | null
  refresh: () => Promise<void>
}

/**
 * Hook for weekly accomplishments
 */
export function useWeeklyAccomplishments(
  year: number,
  week: number
): UseWeeklyAccomplishmentsResult {
  const [accomplishments, setAccomplishments] = useState<WeeklyAccomplishments | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getAccomplishmentsForWeek(year, week)
      setAccomplishments(data)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load accomplishments'))
    } finally {
      setLoading(false)
    }
  }, [year, week])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Subscribe to real-time updates
  useEffect(() => {
    const unsubscribe = subscribeToCompletions(() => {
      // Reload on any completion since it might be in this week
      loadData()
    })
    return unsubscribe
  }, [loadData])

  return {
    accomplishments,
    loading,
    error,
    refresh: loadData,
  }
}

// ============================================================================
// MONTHLY ACCOMPLISHMENTS HOOK
// ============================================================================

export interface UseMonthlyAccomplishmentsResult {
  accomplishments: MonthlyAccomplishments | null
  loading: boolean
  error: Error | null
  refresh: () => Promise<void>
}

/**
 * Hook for monthly accomplishments
 */
export function useMonthlyAccomplishments(
  year: number,
  month: number
): UseMonthlyAccomplishmentsResult {
  const [accomplishments, setAccomplishments] = useState<MonthlyAccomplishments | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getAccomplishmentsForMonth(year, month)
      setAccomplishments(data)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load accomplishments'))
    } finally {
      setLoading(false)
    }
  }, [year, month])

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
    accomplishments,
    loading,
    error,
    refresh: loadData,
  }
}

// ============================================================================
// UNIFIED ACCOMPLISHMENTS HOOK
// ============================================================================

export interface UseAccomplishmentsOptions {
  date?: string
  period?: TimePeriod
  autoRefresh?: boolean
}

export interface UseAccomplishmentsResult {
  items: AccomplishmentItem[]
  stats: {
    total: number
    tasks: number
    subtasks: number
    habits: number
  }
  loading: boolean
  error: Error | null
  refresh: () => Promise<void>
  generateMarkdown: (config?: Partial<AccomplishmentSyncConfig>) => Promise<string>
}

/**
 * Unified hook for accomplishments with period support
 */
export function useAccomplishments(
  options: UseAccomplishmentsOptions = {}
): UseAccomplishmentsResult {
  const { date, period = 'day', autoRefresh = true } = options

  const [items, setItems] = useState<AccomplishmentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // Calculate date range based on period
  const dateRange = useMemo(() => {
    const refDate = date ? new Date(date) : new Date()

    switch (period) {
      case 'day': {
        const dateStr = refDate.toISOString().split('T')[0]
        return { start: dateStr, end: dateStr }
      }
      case 'week': {
        const day = refDate.getDay()
        const diff = refDate.getDate() - day + (day === 0 ? -6 : 1)
        const weekStart = new Date(refDate)
        weekStart.setDate(diff)
        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekStart.getDate() + 6)
        return {
          start: weekStart.toISOString().split('T')[0],
          end: weekEnd.toISOString().split('T')[0],
        }
      }
      case 'month': {
        const start = new Date(refDate.getFullYear(), refDate.getMonth(), 1)
        const end = new Date(refDate.getFullYear(), refDate.getMonth() + 1, 0)
        return {
          start: start.toISOString().split('T')[0],
          end: end.toISOString().split('T')[0],
        }
      }
      default: {
        // Fallback to day if period is unexpected
        const dateStr = refDate.toISOString().split('T')[0]
        return { start: dateStr, end: dateStr }
      }
    }
  }, [date, period])

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getAccomplishmentsInRange(dateRange.start, dateRange.end)
      setItems(data)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load accomplishments'))
    } finally {
      setLoading(false)
    }
  }, [dateRange.start, dateRange.end])

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

  const stats = useMemo(() => ({
    total: items.length,
    tasks: items.filter(i => i.type === 'task').length,
    subtasks: items.filter(i => i.type === 'subtask').length,
    habits: items.filter(i => i.type === 'habit').length,
  }), [items])

  const generateMarkdown = useCallback(
    async (config?: Partial<AccomplishmentSyncConfig>) => {
      const targetDate = date || new Date().toISOString().split('T')[0]
      return generateWhatGotDoneMarkdown(targetDate, config)
    },
    [date]
  )

  return {
    items,
    stats,
    loading,
    error,
    refresh: loadData,
    generateMarkdown,
  }
}

// ============================================================================
// TODAY SHORTHAND
// ============================================================================

/**
 * Hook for today's accomplishments (convenience)
 */
export function useTodayAccomplishments(): UseDailyAccomplishmentsResult {
  const today = useMemo(() => new Date().toISOString().split('T')[0], [])
  return useDailyAccomplishments(today)
}
