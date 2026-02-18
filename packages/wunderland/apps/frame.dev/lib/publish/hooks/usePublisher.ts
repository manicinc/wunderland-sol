/**
 * usePublisher Hook
 * @module lib/publish/hooks/usePublisher
 *
 * Main React hook for the batch publishing system.
 * Provides state management and actions for publishing content.
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import type {
  PublisherPreferences,
  PublishBatch,
  ConflictInfo,
  ConflictResolution,
  BatchStrategy,
  PublishableContentType,
  UsePublisherReturn,
  BatchPublishStatus,
} from '../types'
import { PublishError } from '../types'
import { DEFAULT_PUBLISHER_PREFERENCES, PUBLISHER_PREFERENCES_KEY } from '../constants'
import {
  getBatchPublisher,
  initializeBatchPublisher,
} from '../batchPublisher'
import {
  getActiveBatch,
  getBatch,
  getTotalPendingCount,
  getRecentBatches,
} from '../publishStore'

// ============================================================================
// PREFERENCES STORAGE
// ============================================================================

/**
 * Load preferences from localStorage
 */
function loadPreferences(): PublisherPreferences {
  if (typeof window === 'undefined') {
    return DEFAULT_PUBLISHER_PREFERENCES
  }

  try {
    const stored = localStorage.getItem(PUBLISHER_PREFERENCES_KEY)
    if (stored) {
      return { ...DEFAULT_PUBLISHER_PREFERENCES, ...JSON.parse(stored) }
    }
  } catch (error) {
    console.error('[usePublisher] Failed to load preferences:', error)
  }

  return DEFAULT_PUBLISHER_PREFERENCES
}

/**
 * Save preferences to localStorage
 */
function savePreferences(preferences: PublisherPreferences): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(PUBLISHER_PREFERENCES_KEY, JSON.stringify(preferences))
  } catch (error) {
    console.error('[usePublisher] Failed to save preferences:', error)
  }
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

/**
 * Main publisher hook
 */
export function usePublisher(): UsePublisherReturn {
  // State
  const [settings, setSettings] = useState<PublisherPreferences>(DEFAULT_PUBLISHER_PREFERENCES)
  const [pendingCount, setPendingCount] = useState(0)
  const [isPublishing, setIsPublishing] = useState(false)
  const [currentBatch, setCurrentBatch] = useState<PublishBatch | null>(null)
  const [conflicts, setConflicts] = useState<ConflictInfo[]>([])
  const [error, setError] = useState<PublishError | null>(null)
  const [status, setStatus] = useState<BatchPublishStatus | null>(null)

  // Load preferences on mount
  useEffect(() => {
    const prefs = loadPreferences()
    setSettings(prefs)

    // Initialize publisher with preferences
    initializeBatchPublisher({
      preferences: prefs,
      onStatusChange: setStatus,
    })
  }, [])

  // Load pending count on mount
  useEffect(() => {
    refreshPendingCount()
  }, [])

  // Check for active batch on mount
  useEffect(() => {
    checkActiveBatch()
  }, [])

  // ==========================================================================
  // ACTIONS
  // ==========================================================================

  /**
   * Refresh pending item count
   */
  const refreshPendingCount = useCallback(async () => {
    try {
      const count = await getTotalPendingCount()
      setPendingCount(count)
    } catch (err) {
      console.error('[usePublisher] Failed to get pending count:', err)
    }
  }, [])

  /**
   * Check for active batch
   */
  const checkActiveBatch = useCallback(async () => {
    try {
      const batch = await getActiveBatch()
      if (batch) {
        setCurrentBatch(batch)
        setIsPublishing(batch.status === 'processing')

        // Check for conflicts
        if (batch.status === 'conflict' && batch.metadata?.conflicts) {
          setConflicts(batch.metadata.conflicts as ConflictInfo[])
        }
      }
    } catch (err) {
      console.error('[usePublisher] Failed to check active batch:', err)
    }
  }, [])

  /**
   * Update settings
   */
  const updateSettings = useCallback(async (updates: Partial<PublisherPreferences>) => {
    const newSettings = { ...settings, ...updates }
    setSettings(newSettings)
    savePreferences(newSettings)

    // Update publisher instance
    const publisher = getBatchPublisher()
    publisher.updatePreferences(updates)
  }, [settings])

  /**
   * Publish now
   */
  const publishNow = useCallback(async (options?: {
    strategy?: BatchStrategy
  }): Promise<PublishBatch | null> => {
    setError(null)
    setIsPublishing(true)

    try {
      const publisher = getBatchPublisher()
      const strategy = options?.strategy || settings.batchStrategy

      // Create batch
      const batch = await publisher.createPublishBatch({
        strategy,
        contentTypes: getEnabledContentTypes(settings),
      })

      setCurrentBatch(batch)

      // Process batch
      const result = await publisher.processBatch(batch.id, {
        onProgress: (progress, message) => {
          setStatus({
            phase: 'uploading',
            progress,
            message,
          })
        },
      })

      // Check for conflicts
      if (result.status === 'conflict' && result.metadata?.conflicts) {
        setConflicts(result.metadata.conflicts as ConflictInfo[])
        setIsPublishing(false)
        return result
      }

      // Success
      setCurrentBatch(result)
      setConflicts([])
      setIsPublishing(false)

      // Refresh pending count
      await refreshPendingCount()

      return result
    } catch (err) {
      const publishError = err instanceof PublishError
        ? err
        : new PublishError(
            err instanceof Error ? err.message : 'Unknown error',
            'UNKNOWN'
          )

      setError(publishError)
      setIsPublishing(false)
      return null
    }
  }, [settings, refreshPendingCount])

  /**
   * Queue an item for publishing
   */
  const queueItem = useCallback(async (
    type: PublishableContentType,
    id: string
  ) => {
    try {
      const publisher = getBatchPublisher()
      await publisher.queueForPublish(type, id)
      await refreshPendingCount()
    } catch (err) {
      console.error('[usePublisher] Failed to queue item:', err)
    }
  }, [refreshPendingCount])

  /**
   * Remove an item from the queue
   */
  const dequeueItem = useCallback(async (
    type: PublishableContentType,
    id: string
  ) => {
    try {
      const publisher = getBatchPublisher()
      await publisher.dequeueFromPublish(type, id)
      await refreshPendingCount()
    } catch (err) {
      console.error('[usePublisher] Failed to dequeue item:', err)
    }
  }, [refreshPendingCount])

  /**
   * Resolve conflicts and continue publishing
   */
  const resolveConflicts = useCallback(async (
    resolutions: Record<string, ConflictResolution>
  ) => {
    if (!currentBatch) {
      console.error('[usePublisher] No current batch to resolve conflicts for')
      return
    }

    setError(null)
    setIsPublishing(true)

    try {
      const publisher = getBatchPublisher()

      const result = await publisher.processBatch(currentBatch.id, {
        conflictResolutions: resolutions,
        onProgress: (progress, message) => {
          setStatus({
            phase: 'uploading',
            progress,
            message,
          })
        },
      })

      setCurrentBatch(result)
      setConflicts([])
      setIsPublishing(false)

      await refreshPendingCount()
    } catch (err) {
      const publishError = err instanceof PublishError
        ? err
        : new PublishError(
            err instanceof Error ? err.message : 'Unknown error',
            'UNKNOWN'
          )

      setError(publishError)
      setIsPublishing(false)
    }
  }, [currentBatch, refreshPendingCount])

  /**
   * Cancel current publish
   */
  const cancelPublish = useCallback(async () => {
    if (!currentBatch) return

    try {
      // TODO: Implement actual cancellation via publisher
      setIsPublishing(false)
      setCurrentBatch(null)
      setConflicts([])
      setStatus(null)
    } catch (err) {
      console.error('[usePublisher] Failed to cancel publish:', err)
    }
  }, [currentBatch])

  // ==========================================================================
  // RETURN
  // ==========================================================================

  return {
    // State
    settings,
    pendingCount,
    isPublishing,
    currentBatch,
    conflicts,
    error,

    // Settings actions
    updateSettings,

    // Publishing actions
    publishNow,
    queueItem,
    dequeueItem,
    resolveConflicts,
    cancelPublish,

    // Queries
    refreshPendingCount,
  }
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Get enabled content types from settings
 */
function getEnabledContentTypes(settings: PublisherPreferences): PublishableContentType[] {
  const types: PublishableContentType[] = []

  if (settings.publishReflections) types.push('reflection')
  if (settings.publishStrands) types.push('strand')
  if (settings.publishProjects) types.push('project')

  return types
}

// ============================================================================
// ADDITIONAL HOOKS
// ============================================================================

/**
 * Hook for publish history
 */
export function usePublishHistory() {
  const [batches, setBatches] = useState<PublishBatch[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    loadHistory()
  }, [])

  const loadHistory = async () => {
    try {
      setLoading(true)
      const recent = await getRecentBatches(20)
      setBatches(recent)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load history'))
    } finally {
      setLoading(false)
    }
  }

  const refresh = useCallback(async () => {
    await loadHistory()
  }, [])

  return {
    batches,
    loading,
    error,
    refresh,
  }
}

/**
 * Hook for pending counts
 */
export function usePendingCounts() {
  const [counts, setCounts] = useState<Record<PublishableContentType, number>>({
    reflection: 0,
    strand: 0,
    project: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadCounts()
  }, [])

  const loadCounts = async () => {
    try {
      setLoading(true)
      const publisher = getBatchPublisher()
      const pendingCounts = await publisher.getPendingCounts()
      setCounts(pendingCounts)
    } catch (err) {
      console.error('[usePendingCounts] Failed to load counts:', err)
    } finally {
      setLoading(false)
    }
  }

  const refresh = useCallback(async () => {
    await loadCounts()
  }, [])

  return {
    counts,
    total: counts.reflection + counts.strand + counts.project,
    loading,
    refresh,
  }
}

export default usePublisher
