/**
 * useTour - Tour state management hook
 * @module codex/ui/tour/useTour
 *
 * Manages tour state, progress, and persistence.
 * Supports multiple tour types and remembers completion status.
 */

'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'

/** Tour step definition */
export interface TourStep {
  /** Unique step identifier */
  id: string
  /** Target element selector */
  target?: string
  /** Step title */
  title: string
  /** Step description/content */
  content: string
  /** Position relative to target */
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'center'
  /** Optional action button */
  action?: {
    label: string
    onClick: () => void
  }
  /** Whether to highlight the target element */
  spotlight?: boolean
  /** Optional image/illustration */
  image?: string
}

/** Tour definition */
export interface TourDefinition {
  /** Unique tour identifier */
  id: string
  /** Tour name */
  name: string
  /** Tour description */
  description?: string
  /** Tour steps */
  steps: TourStep[]
  /** Whether to show on first visit */
  showOnFirstVisit?: boolean
  /** Version - increment to re-show tour after updates */
  version?: number
}

/** Tour state */
interface TourState {
  isActive: boolean
  currentStepIndex: number
  completedTours: Record<string, number> // tourId -> version completed
  skippedTours: string[]
  firstVisit: boolean
}

/** Storage key for tour state */
const TOUR_STORAGE_KEY = 'quarry-tour-state'

/** Default state */
const DEFAULT_STATE: TourState = {
  isActive: false,
  currentStepIndex: 0,
  completedTours: {},
  skippedTours: [],
  firstVisit: true,
}

/**
 * Load tour state from localStorage
 */
function loadTourState(): TourState {
  if (typeof window === 'undefined') return DEFAULT_STATE

  try {
    const stored = localStorage.getItem(TOUR_STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<TourState>
      return { ...DEFAULT_STATE, ...parsed, firstVisit: false }
    }
  } catch (err) {
    console.warn('Failed to load tour state:', err)
  }

  return DEFAULT_STATE
}

/**
 * Save tour state to localStorage
 */
function saveTourState(state: Partial<TourState>) {
  if (typeof window === 'undefined') return

  try {
    const current = loadTourState()
    const updated = { ...current, ...state, firstVisit: false }
    localStorage.setItem(TOUR_STORAGE_KEY, JSON.stringify(updated))
  } catch (err) {
    console.warn('Failed to save tour state:', err)
  }
}

/** Return type for the hook */
export interface UseTourReturn {
  // State
  isActive: boolean
  currentStep: TourStep | null
  currentStepIndex: number
  totalSteps: number
  progress: number
  isFirstVisit: boolean
  hasCompletedTour: (tourId: string) => boolean
  hasSkippedTour: (tourId: string) => boolean

  // Actions
  startTour: (tour: TourDefinition) => void
  nextStep: () => void
  prevStep: () => void
  goToStep: (index: number) => void
  skipTour: () => void
  completeTour: () => void
  resetTour: (tourId?: string) => void
  resetAllTours: () => void

  // Current tour info
  currentTour: TourDefinition | null
}

/**
 * Tour state management hook
 */
export function useTour(): UseTourReturn {
  const [state, setState] = useState<TourState>(DEFAULT_STATE)
  const [currentTour, setCurrentTour] = useState<TourDefinition | null>(null)

  // Load state on mount
  useEffect(() => {
    const loaded = loadTourState()
    setState(loaded)
  }, [])

  // Current step
  const currentStep = useMemo(() => {
    if (!currentTour || !state.isActive) return null
    return currentTour.steps[state.currentStepIndex] || null
  }, [currentTour, state.isActive, state.currentStepIndex])

  // Progress percentage
  const progress = useMemo(() => {
    if (!currentTour || currentTour.steps.length === 0) return 0
    return ((state.currentStepIndex + 1) / currentTour.steps.length) * 100
  }, [currentTour, state.currentStepIndex])

  // Start a tour
  const startTour = useCallback((tour: TourDefinition) => {
    setCurrentTour(tour)
    setState((prev) => ({
      ...prev,
      isActive: true,
      currentStepIndex: 0,
    }))
  }, [])

  // Go to next step
  const nextStep = useCallback(() => {
    if (!currentTour) return

    setState((prev) => {
      const nextIndex = prev.currentStepIndex + 1
      if (nextIndex >= currentTour.steps.length) {
        // Tour complete
        const newCompleted = {
          ...prev.completedTours,
          [currentTour.id]: currentTour.version || 1,
        }
        saveTourState({ completedTours: newCompleted })
        return {
          ...prev,
          isActive: false,
          currentStepIndex: 0,
          completedTours: newCompleted,
        }
      }
      return { ...prev, currentStepIndex: nextIndex }
    })
  }, [currentTour])

  // Go to previous step
  const prevStep = useCallback(() => {
    setState((prev) => ({
      ...prev,
      currentStepIndex: Math.max(0, prev.currentStepIndex - 1),
    }))
  }, [])

  // Go to specific step
  const goToStep = useCallback((index: number) => {
    if (!currentTour) return
    setState((prev) => ({
      ...prev,
      currentStepIndex: Math.max(0, Math.min(index, currentTour.steps.length - 1)),
    }))
  }, [currentTour])

  // Skip tour
  const skipTour = useCallback(() => {
    if (!currentTour) return

    const skipped = [...state.skippedTours, currentTour.id]
    saveTourState({ skippedTours: skipped })

    setState((prev) => ({
      ...prev,
      isActive: false,
      currentStepIndex: 0,
      skippedTours: skipped,
    }))
    setCurrentTour(null)
  }, [currentTour, state.skippedTours])

  // Complete tour
  const completeTour = useCallback(() => {
    if (!currentTour) return

    const completed = {
      ...state.completedTours,
      [currentTour.id]: currentTour.version || 1,
    }
    saveTourState({ completedTours: completed })

    setState((prev) => ({
      ...prev,
      isActive: false,
      currentStepIndex: 0,
      completedTours: completed,
    }))
    setCurrentTour(null)
  }, [currentTour, state.completedTours])

  // Reset a specific tour (to show again)
  const resetTour = useCallback((tourId?: string) => {
    if (!tourId && !currentTour) return

    const id = tourId || currentTour?.id
    if (!id) return

    setState((prev) => {
      const newCompleted = { ...prev.completedTours }
      delete newCompleted[id]
      const newSkipped = prev.skippedTours.filter((t) => t !== id)

      saveTourState({ completedTours: newCompleted, skippedTours: newSkipped })

      return {
        ...prev,
        completedTours: newCompleted,
        skippedTours: newSkipped,
      }
    })
  }, [currentTour])

  // Reset all tours
  const resetAllTours = useCallback(() => {
    localStorage.removeItem(TOUR_STORAGE_KEY)
    setState({ ...DEFAULT_STATE, firstVisit: true })
    setCurrentTour(null)
  }, [])

  // Check if tour is completed
  const hasCompletedTour = useCallback(
    (tourId: string): boolean => {
      return tourId in state.completedTours
    },
    [state.completedTours]
  )

  // Check if tour is skipped
  const hasSkippedTour = useCallback(
    (tourId: string): boolean => {
      return state.skippedTours.includes(tourId)
    },
    [state.skippedTours]
  )

  return {
    // State
    isActive: state.isActive,
    currentStep,
    currentStepIndex: state.currentStepIndex,
    totalSteps: currentTour?.steps.length || 0,
    progress,
    isFirstVisit: state.firstVisit,
    hasCompletedTour,
    hasSkippedTour,

    // Actions
    startTour,
    nextStep,
    prevStep,
    goToStep,
    skipTour,
    completeTour,
    resetTour,
    resetAllTours,

    // Current tour
    currentTour,
  }
}

export default useTour
