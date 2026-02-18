'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  saveStrandRating,
  getStrandRating,
  getStrandRatings,
  deleteStrandRating,
  saveLLMStrandRating,
  getLLMStrandRating,
  deleteLLMStrandRating,
  getRatingStats,
  type LocalStrandRating,
  type LocalLLMStrandRating,
} from '@/lib/storage/localCodex'
import type {
  RatingDimension,
  StrandUserRating,
  StrandLLMRating,
} from '@/types/openstrand'

// Re-export types for consumers
export type { LocalStrandRating, LocalLLMStrandRating }

/**
 * Rating statistics
 */
export interface RatingStats {
  userRatingsCount: number
  llmRatingsCount: number
  averageUserRating: number | null
  averageLLMScore: number | null
  ratedStrandsCount: number
}

/**
 * Hook state
 */
interface UseStrandRatingsState {
  userRating: LocalStrandRating | null
  llmRating: LocalLLMStrandRating | null
  dimensionRatings: LocalStrandRating[]
  isLoading: boolean
  isSaving: boolean
  error: string | null
}

/**
 * Hook for managing strand ratings (both user and LLM)
 */
export function useStrandRatings(strandId: string | undefined, strandPath: string | undefined) {
  const [state, setState] = useState<UseStrandRatingsState>({
    userRating: null,
    llmRating: null,
    dimensionRatings: [],
    isLoading: false,
    isSaving: false,
    error: null,
  })

  const isMounted = useRef(true)

  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
    }
  }, [])

  // Load ratings when strandId changes
  useEffect(() => {
    if (!strandId) {
      setState((prev) => ({
        ...prev,
        userRating: null,
        llmRating: null,
        dimensionRatings: [],
        isLoading: false,
      }))
      return
    }

    const loadRatings = async () => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }))

      try {
        const [userRating, llmRating, allRatings] = await Promise.all([
          getStrandRating(strandId), // Overall rating (no dimension)
          getLLMStrandRating(strandId),
          getStrandRatings(strandId), // All ratings including dimension ratings
        ])

        if (isMounted.current) {
          // Filter out dimension ratings from all ratings
          const dimensionRatings = allRatings.filter((r) => r.dimension !== null)

          setState({
            userRating,
            llmRating,
            dimensionRatings,
            isLoading: false,
            isSaving: false,
            error: null,
          })
        }
      } catch (err) {
        if (isMounted.current) {
          setState((prev) => ({
            ...prev,
            isLoading: false,
            error: err instanceof Error ? err.message : 'Failed to load ratings',
          }))
        }
      }
    }

    loadRatings()
  }, [strandId])

  /**
   * Set the overall user rating (1-10 scale)
   */
  const setUserRating = useCallback(
    async (rating: number, notes?: string) => {
      if (!strandId || !strandPath) return

      setState((prev) => ({ ...prev, isSaving: true, error: null }))

      try {
        const savedRating = await saveStrandRating({
          strandId,
          strandPath,
          rating: Math.max(1, Math.min(10, rating)),
          notes,
        })

        if (isMounted.current) {
          setState((prev) => ({
            ...prev,
            userRating: savedRating,
            isSaving: false,
          }))
        }

        return savedRating
      } catch (err) {
        if (isMounted.current) {
          setState((prev) => ({
            ...prev,
            isSaving: false,
            error: err instanceof Error ? err.message : 'Failed to save rating',
          }))
        }
        throw err
      }
    },
    [strandId, strandPath]
  )

  /**
   * Set a dimension-specific rating (quality, completeness, etc.)
   */
  const setDimensionRating = useCallback(
    async (dimension: RatingDimension, rating: number, notes?: string) => {
      if (!strandId || !strandPath) return

      setState((prev) => ({ ...prev, isSaving: true, error: null }))

      try {
        const savedRating = await saveStrandRating({
          strandId,
          strandPath,
          rating: Math.max(1, Math.min(10, rating)),
          dimension,
          notes,
        })

        if (isMounted.current) {
          setState((prev) => ({
            ...prev,
            dimensionRatings: [
              ...prev.dimensionRatings.filter((r) => r.dimension !== dimension),
              savedRating,
            ],
            isSaving: false,
          }))
        }

        return savedRating
      } catch (err) {
        if (isMounted.current) {
          setState((prev) => ({
            ...prev,
            isSaving: false,
            error: err instanceof Error ? err.message : 'Failed to save rating',
          }))
        }
        throw err
      }
    },
    [strandId, strandPath]
  )

  /**
   * Get rating for a specific dimension
   */
  const getDimensionRating = useCallback(
    (dimension: RatingDimension): LocalStrandRating | undefined => {
      return state.dimensionRatings.find((r) => r.dimension === dimension)
    },
    [state.dimensionRatings]
  )

  /**
   * Clear the user rating
   */
  const clearUserRating = useCallback(async () => {
    if (!state.userRating) return

    setState((prev) => ({ ...prev, isSaving: true, error: null }))

    try {
      await deleteStrandRating(state.userRating.id)

      if (isMounted.current) {
        setState((prev) => ({
          ...prev,
          userRating: null,
          isSaving: false,
        }))
      }
    } catch (err) {
      if (isMounted.current) {
        setState((prev) => ({
          ...prev,
          isSaving: false,
          error: err instanceof Error ? err.message : 'Failed to delete rating',
        }))
      }
      throw err
    }
  }, [state.userRating])

  /**
   * Clear a dimension rating
   */
  const clearDimensionRating = useCallback(
    async (dimension: RatingDimension) => {
      const dimRating = state.dimensionRatings.find((r) => r.dimension === dimension)
      if (!dimRating) return

      setState((prev) => ({ ...prev, isSaving: true, error: null }))

      try {
        await deleteStrandRating(dimRating.id)

        if (isMounted.current) {
          setState((prev) => ({
            ...prev,
            dimensionRatings: prev.dimensionRatings.filter((r) => r.dimension !== dimension),
            isSaving: false,
          }))
        }
      } catch (err) {
        if (isMounted.current) {
          setState((prev) => ({
            ...prev,
            isSaving: false,
            error: err instanceof Error ? err.message : 'Failed to delete rating',
          }))
        }
        throw err
      }
    },
    [state.dimensionRatings]
  )

  /**
   * Save LLM rating (usually called by the rating service)
   */
  const saveLLMRating = useCallback(
    async (rating: Omit<LocalLLMStrandRating, 'id' | 'createdAt' | 'updatedAt'>) => {
      setState((prev) => ({ ...prev, isSaving: true, error: null }))

      try {
        const savedRating = await saveLLMStrandRating(rating)

        if (isMounted.current) {
          setState((prev) => ({
            ...prev,
            llmRating: savedRating,
            isSaving: false,
          }))
        }

        return savedRating
      } catch (err) {
        if (isMounted.current) {
          setState((prev) => ({
            ...prev,
            isSaving: false,
            error: err instanceof Error ? err.message : 'Failed to save LLM rating',
          }))
        }
        throw err
      }
    },
    []
  )

  /**
   * Clear the LLM rating
   */
  const clearLLMRating = useCallback(async () => {
    if (!state.llmRating) return

    setState((prev) => ({ ...prev, isSaving: true, error: null }))

    try {
      await deleteLLMStrandRating(state.llmRating.id)

      if (isMounted.current) {
        setState((prev) => ({
          ...prev,
          llmRating: null,
          isSaving: false,
        }))
      }
    } catch (err) {
      if (isMounted.current) {
        setState((prev) => ({
          ...prev,
          isSaving: false,
          error: err instanceof Error ? err.message : 'Failed to delete LLM rating',
        }))
      }
      throw err
    }
  }, [state.llmRating])

  /**
   * Refresh ratings from storage
   */
  const refresh = useCallback(async () => {
    if (!strandId) return

    setState((prev) => ({ ...prev, isLoading: true, error: null }))

    try {
      const [userRating, llmRating, allRatings] = await Promise.all([
        getStrandRating(strandId),
        getLLMStrandRating(strandId),
        getStrandRatings(strandId),
      ])

      if (isMounted.current) {
        const dimensionRatings = allRatings.filter((r) => r.dimension !== null)

        setState({
          userRating,
          llmRating,
          dimensionRatings,
          isLoading: false,
          isSaving: false,
          error: null,
        })
      }
    } catch (err) {
      if (isMounted.current) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: err instanceof Error ? err.message : 'Failed to refresh ratings',
        }))
      }
    }
  }, [strandId])

  return {
    // State
    userRating: state.userRating,
    llmRating: state.llmRating,
    dimensionRatings: state.dimensionRatings,
    isLoading: state.isLoading,
    isSaving: state.isSaving,
    error: state.error,

    // User rating actions
    setUserRating,
    clearUserRating,

    // Dimension rating actions
    setDimensionRating,
    getDimensionRating,
    clearDimensionRating,

    // LLM rating actions
    saveLLMRating,
    clearLLMRating,

    // Refresh
    refresh,
  }
}

/**
 * Hook for getting global rating statistics
 */
export function useRatingStats() {
  const [stats, setStats] = useState<RatingStats | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const refresh = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await getRatingStats()
      setStats(data)
    } catch (err) {
      console.error('Failed to load rating stats:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { stats, isLoading, refresh }
}

export default useStrandRatings

