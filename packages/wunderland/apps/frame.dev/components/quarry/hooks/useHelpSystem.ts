/**
 * useHelpSystem Hook
 * @module codex/hooks/useHelpSystem
 *
 * @description
 * Manages the help system state including:
 * - Tour activation and progression
 * - Help panel visibility
 * - First-time user detection
 * - Content retrieval by step/field
 */

import { useState, useCallback, useEffect, useMemo } from 'react'
import type {
  HelpSystemState,
  TourState,
  HelpPanelState,
  HelpPanelSection,
  StepHelp,
  FieldHelp,
  WizardHelp,
} from '../help/HelpContent'
import { HELP_STORAGE_KEYS } from '../help/HelpContent'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

export interface UseHelpSystemOptions {
  /** Wizard help content to use */
  wizardHelp: WizardHelp
  /** Whether to auto-start tour for first-time users */
  autoStartTour?: boolean
  /** Callback when tour completes */
  onTourComplete?: () => void
}

export interface UseHelpSystemReturn {
  // Tour state
  isTourActive: boolean
  tourStep: number
  totalTourSteps: number
  startTour: () => void
  nextTourStep: () => void
  prevTourStep: () => void
  dismissTour: (dontShowAgain?: boolean) => void
  currentTourStep: WizardHelp['tourSteps'][number] | null

  // Help panel state
  isHelpPanelOpen: boolean
  toggleHelpPanel: () => void
  openHelpPanel: () => void
  closeHelpPanel: () => void
  activeSection: HelpPanelSection
  setActiveSection: (section: HelpPanelSection) => void
  searchQuery: string
  setSearchQuery: (query: string) => void

  // Content retrieval
  getStepHelp: (stepId: string) => StepHelp | null
  getFieldHelp: (stepId: string, fieldName: string) => FieldHelp | null
  currentStepHelp: StepHelp | null
  setCurrentStepId: (stepId: string | null) => void

  // User state
  isFirstTimeUser: boolean
}

/* ═══════════════════════════════════════════════════════════════════════════
   INITIAL STATE
═══════════════════════════════════════════════════════════════════════════ */

const initialTourState: TourState = {
  isActive: false,
  currentStep: 0,
  totalSteps: 0,
  tourId: null,
  dismissed: false,
}

const initialPanelState: HelpPanelState = {
  isOpen: false,
  activeSection: 'overview',
  searchQuery: '',
  currentStepId: null,
}

/* ═══════════════════════════════════════════════════════════════════════════
   STORAGE HELPERS
═══════════════════════════════════════════════════════════════════════════ */

function getStorageItem(key: string): string | null {
  if (typeof window === 'undefined') return null
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function setStorageItem(key: string, value: string): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(key, value)
  } catch {
    // Ignore storage errors
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   HOOK
═══════════════════════════════════════════════════════════════════════════ */

export function useHelpSystem({
  wizardHelp,
  autoStartTour = true,
  onTourComplete,
}: UseHelpSystemOptions): UseHelpSystemReturn {
  // Tour state
  const [tourState, setTourState] = useState<TourState>(() => ({
    ...initialTourState,
    totalSteps: wizardHelp.tourSteps.length,
    tourId: wizardHelp.id,
  }))

  // Panel state
  const [panelState, setPanelState] = useState<HelpPanelState>(initialPanelState)

  // First time user detection
  const [isFirstTimeUser, setIsFirstTimeUser] = useState(false)

  // Check for first-time user on mount
  useEffect(() => {
    const hasVisited = getStorageItem(HELP_STORAGE_KEYS.FIRST_TIME_USER)
    const tourDismissed = getStorageItem(HELP_STORAGE_KEYS.TOUR_DISMISSED)

    if (!hasVisited) {
      setIsFirstTimeUser(true)
      setStorageItem(HELP_STORAGE_KEYS.FIRST_TIME_USER, 'true')

      // Auto-start tour if enabled and not dismissed
      if (autoStartTour && !tourDismissed) {
        setTourState((prev) => ({ ...prev, isActive: true }))
      }
    }
  }, [autoStartTour])

  // Check for panel collapsed state
  useEffect(() => {
    const collapsed = getStorageItem(HELP_STORAGE_KEYS.PANEL_COLLAPSED)
    if (collapsed === 'true') {
      setPanelState((prev) => ({ ...prev, isOpen: false }))
    }
  }, [])

  // ═══════════════════════════════════════════════════════════════════════════
  // TOUR CONTROLS
  // ═══════════════════════════════════════════════════════════════════════════

  const startTour = useCallback(() => {
    setTourState((prev) => ({
      ...prev,
      isActive: true,
      currentStep: 0,
    }))
  }, [])

  const nextTourStep = useCallback(() => {
    setTourState((prev) => {
      const nextStep = prev.currentStep + 1
      if (nextStep >= prev.totalSteps) {
        // Tour complete
        onTourComplete?.()
        return { ...prev, isActive: false, currentStep: 0 }
      }
      return { ...prev, currentStep: nextStep }
    })
  }, [onTourComplete])

  const prevTourStep = useCallback(() => {
    setTourState((prev) => ({
      ...prev,
      currentStep: Math.max(0, prev.currentStep - 1),
    }))
  }, [])

  const dismissTour = useCallback((dontShowAgain = false) => {
    setTourState((prev) => ({
      ...prev,
      isActive: false,
      dismissed: dontShowAgain,
    }))

    if (dontShowAgain) {
      setStorageItem(HELP_STORAGE_KEYS.TOUR_DISMISSED, 'true')
    }
  }, [])

  const currentTourStep = useMemo(() => {
    if (!tourState.isActive) return null
    return wizardHelp.tourSteps[tourState.currentStep] || null
  }, [tourState.isActive, tourState.currentStep, wizardHelp.tourSteps])

  // ═══════════════════════════════════════════════════════════════════════════
  // PANEL CONTROLS
  // ═══════════════════════════════════════════════════════════════════════════

  const toggleHelpPanel = useCallback(() => {
    setPanelState((prev) => {
      const newOpen = !prev.isOpen
      setStorageItem(HELP_STORAGE_KEYS.PANEL_COLLAPSED, String(!newOpen))
      return { ...prev, isOpen: newOpen }
    })
  }, [])

  const openHelpPanel = useCallback(() => {
    setPanelState((prev) => ({ ...prev, isOpen: true }))
    setStorageItem(HELP_STORAGE_KEYS.PANEL_COLLAPSED, 'false')
  }, [])

  const closeHelpPanel = useCallback(() => {
    setPanelState((prev) => ({ ...prev, isOpen: false }))
    setStorageItem(HELP_STORAGE_KEYS.PANEL_COLLAPSED, 'true')
  }, [])

  const setActiveSection = useCallback((section: HelpPanelSection) => {
    setPanelState((prev) => ({ ...prev, activeSection: section }))
  }, [])

  const setSearchQuery = useCallback((query: string) => {
    setPanelState((prev) => ({ ...prev, searchQuery: query }))
  }, [])

  const setCurrentStepId = useCallback((stepId: string | null) => {
    setPanelState((prev) => ({ ...prev, currentStepId: stepId }))
  }, [])

  // ═══════════════════════════════════════════════════════════════════════════
  // CONTENT RETRIEVAL
  // ═══════════════════════════════════════════════════════════════════════════

  const getStepHelp = useCallback(
    (stepId: string): StepHelp | null => {
      return wizardHelp.steps.find((s) => s.id === stepId) || null
    },
    [wizardHelp.steps]
  )

  const getFieldHelp = useCallback(
    (stepId: string, fieldName: string): FieldHelp | null => {
      const step = getStepHelp(stepId)
      if (!step?.fields) return null
      return step.fields.find((f) => f.name === fieldName) || null
    },
    [getStepHelp]
  )

  const currentStepHelp = useMemo(() => {
    if (!panelState.currentStepId) return null
    return getStepHelp(panelState.currentStepId)
  }, [panelState.currentStepId, getStepHelp])

  // ═══════════════════════════════════════════════════════════════════════════
  // RETURN
  // ═══════════════════════════════════════════════════════════════════════════

  return {
    // Tour
    isTourActive: tourState.isActive,
    tourStep: tourState.currentStep,
    totalTourSteps: tourState.totalSteps,
    startTour,
    nextTourStep,
    prevTourStep,
    dismissTour,
    currentTourStep,

    // Panel
    isHelpPanelOpen: panelState.isOpen,
    toggleHelpPanel,
    openHelpPanel,
    closeHelpPanel,
    activeSection: panelState.activeSection,
    setActiveSection,
    searchQuery: panelState.searchQuery,
    setSearchQuery,

    // Content
    getStepHelp,
    getFieldHelp,
    currentStepHelp,
    setCurrentStepId,

    // User
    isFirstTimeUser,
  }
}

export default useHelpSystem
