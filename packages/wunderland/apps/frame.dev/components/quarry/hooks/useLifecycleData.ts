/**
 * useLifecycleData Hook
 * 
 * React hook for fetching and managing strand lifecycle data.
 * Aggregates lifecycle stats, strands by stage, at-risk alerts,
 * and resurface suggestions.
 * 
 * @module components/quarry/hooks/useLifecycleData
 */

'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  getAllLifecycles,
  getLifecyclesByStage,
  getAtRiskStrands,
  getResurfaceSuggestions,
  getLifecycleStats,
  getLifecycleTimeSeries,
  recalculateAllLifecycles,
  resurfaceStrand,
  recordLifecycleEvent,
  createRitualSession,
  completeRitualSession,
  getRecentRitualSessions,
} from '@/lib/analytics/lifecycleStore'
import type {
  StrandLifecycleWithMeta,
  LifecycleSettings,
  LifecycleStage,
  LifecycleStats,
  LifecycleTimeSeriesPoint,
  ResurfaceSuggestion,
  RitualSession,
  RitualPromptData,
  LifecycleEventType,
  DEFAULT_LIFECYCLE_SETTINGS,
} from '@/lib/analytics/lifecycleTypes'

// ============================================================================
// TYPES
// ============================================================================

export interface UseLifecycleDataOptions {
  /** Custom lifecycle settings (uses defaults if not provided) */
  settings?: LifecycleSettings
  /** Auto-refresh interval in ms (0 to disable) */
  refreshInterval?: number
  /** Whether to fetch on mount */
  fetchOnMount?: boolean
}

export interface UseLifecycleDataReturn {
  // Data
  allStrands: StrandLifecycleWithMeta[]
  freshStrands: StrandLifecycleWithMeta[]
  activeStrands: StrandLifecycleWithMeta[]
  fadedStrands: StrandLifecycleWithMeta[]
  atRiskStrands: StrandLifecycleWithMeta[]
  resurfaceSuggestions: ResurfaceSuggestion[]
  stats: LifecycleStats | null
  timeSeries: LifecycleTimeSeriesPoint[]
  recentRituals: RitualSession[]

  // Loading states
  loading: boolean
  error: string | null

  // Settings
  settings: LifecycleSettings

  // Actions
  refresh: () => Promise<void>
  recalculate: () => Promise<void>
  resurface: (strandPath: string) => Promise<void>
  recordEvent: (strandPath: string, eventType: LifecycleEventType) => Promise<void>
  startRitual: (type: 'morning' | 'evening') => Promise<RitualSession | null>
  completeRitual: (
    sessionId: string,
    data: Partial<Pick<RitualSession, 'reviewedStrands' | 'intentions' | 'reflections' | 'connectionsFormed'>>
  ) => Promise<void>
  getRitualPromptData: (type: 'morning' | 'evening') => RitualPromptData
}

// ============================================================================
// DEFAULT SETTINGS (re-exported for convenience)
// ============================================================================

const DEFAULT_SETTINGS: LifecycleSettings = {
  freshThresholdDays: 7,
  fadeThresholdDays: 30,
  engagementWeight: 0.3,
  autoResurface: true,
  ritualReminders: true,
  resurfaceLimit: 5,
}

// ============================================================================
// HOOK
// ============================================================================

export function useLifecycleData(
  options: UseLifecycleDataOptions = {}
): UseLifecycleDataReturn {
  const {
    settings = DEFAULT_SETTINGS,
    refreshInterval = 0,
    fetchOnMount = true,
  } = options

  // State
  const [allStrands, setAllStrands] = useState<StrandLifecycleWithMeta[]>([])
  const [atRiskStrands, setAtRiskStrands] = useState<StrandLifecycleWithMeta[]>([])
  const [resurfaceSuggestions, setResurfaceSuggestions] = useState<ResurfaceSuggestion[]>([])
  const [stats, setStats] = useState<LifecycleStats | null>(null)
  const [timeSeries, setTimeSeries] = useState<LifecycleTimeSeriesPoint[]>([])
  const [recentRituals, setRecentRituals] = useState<RitualSession[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Derived data - group strands by stage
  const freshStrands = useMemo(
    () => allStrands.filter(s => s.stage === 'fresh'),
    [allStrands]
  )

  const activeStrands = useMemo(
    () => allStrands.filter(s => s.stage === 'active'),
    [allStrands]
  )

  const fadedStrands = useMemo(
    () => allStrands.filter(s => s.stage === 'faded'),
    [allStrands]
  )

  // Fetch all data
  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const [
        strandsData,
        atRiskData,
        suggestionsData,
        statsData,
        timeSeriesData,
        ritualsData,
      ] = await Promise.all([
        getAllLifecycles(settings),
        getAtRiskStrands(settings),
        getResurfaceSuggestions(settings),
        getLifecycleStats(settings),
        getLifecycleTimeSeries(30),
        getRecentRitualSessions(10),
      ])

      setAllStrands(strandsData)
      setAtRiskStrands(atRiskData)
      setResurfaceSuggestions(suggestionsData)
      setStats(statsData)
      setTimeSeries(timeSeriesData)
      setRecentRituals(ritualsData)
    } catch (err) {
      console.error('[useLifecycleData] Failed to fetch data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load lifecycle data')
    } finally {
      setLoading(false)
    }
  }, [settings])

  // Recalculate all lifecycles (batch update)
  const recalculate = useCallback(async () => {
    setLoading(true)
    try {
      await recalculateAllLifecycles(settings)
      await refresh()
    } catch (err) {
      console.error('[useLifecycleData] Failed to recalculate:', err)
      setError(err instanceof Error ? err.message : 'Failed to recalculate lifecycles')
    } finally {
      setLoading(false)
    }
  }, [settings, refresh])

  // Resurface a strand
  const resurface = useCallback(async (strandPath: string) => {
    try {
      await resurfaceStrand(strandPath, settings)
      await refresh()
    } catch (err) {
      console.error('[useLifecycleData] Failed to resurface:', err)
      setError(err instanceof Error ? err.message : 'Failed to resurface strand')
    }
  }, [settings, refresh])

  // Record a lifecycle event
  const recordEvent = useCallback(async (
    strandPath: string,
    eventType: LifecycleEventType
  ) => {
    try {
      await recordLifecycleEvent(strandPath, eventType, undefined, settings)
      // Don't refresh on every event for performance - caller can refresh if needed
    } catch (err) {
      console.error('[useLifecycleData] Failed to record event:', err)
    }
  }, [settings])

  // Start a ritual session
  const startRitual = useCallback(async (type: 'morning' | 'evening') => {
    try {
      const session = await createRitualSession(type)
      if (session) {
        setRecentRituals(prev => [session, ...prev])
      }
      return session
    } catch (err) {
      console.error('[useLifecycleData] Failed to start ritual:', err)
      setError(err instanceof Error ? err.message : 'Failed to start ritual')
      return null
    }
  }, [])

  // Complete a ritual session
  const completeRitual = useCallback(async (
    sessionId: string,
    data: Partial<Pick<RitualSession, 'reviewedStrands' | 'intentions' | 'reflections' | 'connectionsFormed'>>
  ) => {
    try {
      const completed = await completeRitualSession(sessionId, data)
      if (completed) {
        setRecentRituals(prev => 
          prev.map(s => s.id === sessionId ? completed : s)
        )
        // Refresh to update lifecycle states for reviewed strands
        await refresh()
      }
    } catch (err) {
      console.error('[useLifecycleData] Failed to complete ritual:', err)
      setError(err instanceof Error ? err.message : 'Failed to complete ritual')
    }
  }, [refresh])

  // Get ritual prompt data for morning/evening rituals
  const getRitualPromptData = useCallback((type: 'morning' | 'evening'): RitualPromptData => {
    // Get today's strands (for evening ritual)
    const today = new Date().toISOString().split('T')[0]
    const todayStrands = allStrands.filter(s => 
      s.lastAccessedAt.startsWith(today)
    )

    // Fading strands worth revisiting
    const fadingStrands = resurfaceSuggestions.map(s => s.strand).slice(0, 5)

    // Relevant strands for morning - recently active with good engagement
    const relevantStrands = activeStrands
      .filter(s => s.engagementScore > 50)
      .slice(0, 5)

    // Suggested connections - find strands that might relate
    // (Simplified - in a real implementation, this would use embeddings/tags)
    const suggestedConnections: RitualPromptData['suggestedConnections'] = []

    return {
      type,
      relevantStrands,
      fadingStrands,
      todayStrands,
      suggestedConnections,
    }
  }, [allStrands, activeStrands, resurfaceSuggestions])

  // Initial fetch
  useEffect(() => {
    if (fetchOnMount) {
      refresh()
    }
  }, [fetchOnMount, refresh])

  // Auto-refresh interval
  useEffect(() => {
    if (refreshInterval <= 0) return

    const interval = setInterval(refresh, refreshInterval)
    return () => clearInterval(interval)
  }, [refreshInterval, refresh])

  return {
    // Data
    allStrands,
    freshStrands,
    activeStrands,
    fadedStrands,
    atRiskStrands,
    resurfaceSuggestions,
    stats,
    timeSeries,
    recentRituals,

    // Loading states
    loading,
    error,

    // Settings
    settings,

    // Actions
    refresh,
    recalculate,
    resurface,
    recordEvent,
    startRitual,
    completeRitual,
    getRitualPromptData,
  }
}

// ============================================================================
// CONVENIENCE HOOKS
// ============================================================================

/**
 * Hook for just lifecycle stats
 */
export function useLifecycleStats(settings?: LifecycleSettings) {
  const [stats, setStats] = useState<LifecycleStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getLifecycleStats(settings)
      .then(setStats)
      .finally(() => setLoading(false))
  }, [settings])

  return { stats, loading }
}

/**
 * Hook for strands by specific stage
 */
export function useLifecycleStage(
  stage: LifecycleStage,
  settings?: LifecycleSettings
) {
  const [strands, setStrands] = useState<StrandLifecycleWithMeta[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getLifecyclesByStage(stage, settings)
      .then(setStrands)
      .finally(() => setLoading(false))
  }, [stage, settings])

  return { strands, loading }
}

/**
 * Hook for resurface suggestions
 */
export function useResurfaceSuggestions(settings?: LifecycleSettings) {
  const [suggestions, setSuggestions] = useState<ResurfaceSuggestion[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getResurfaceSuggestions(settings)
      .then(setSuggestions)
      .finally(() => setLoading(false))
  }, [settings])

  return { suggestions, loading }
}

