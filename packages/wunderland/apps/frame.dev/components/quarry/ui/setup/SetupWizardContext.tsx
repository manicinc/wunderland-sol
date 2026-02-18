/**
 * Setup Wizard Context
 * State management for the setup wizard
 * @module quarry/ui/setup/SetupWizardContext
 */

'use client'

import React, { createContext, useContext, useReducer, useCallback, ReactNode } from 'react'
import type {
  SetupWizardState,
  SetupWizardAction,
  WizardStep,
  GoalType,
  OrganizationMethod,
  IntegrationId,
  ImportConfig,
  ImportedData,
  ProposedStructure,
  GenerationProgress,
  GeneratedIds,
  StructureEdit,
  OrganizationPreferences,
} from './types'

// ============================================================================
// INITIAL STATE
// ============================================================================

const initialState: SetupWizardState = {
  currentStep: 'goals',
  selectedGoals: [],
  customGoals: [],
  organizationMethod: null,
  organizationPreferences: {
    createStarterStrands: true,
    includeReadme: true,
  },
  selectedIntegrations: [],
  importConfigs: {} as Record<IntegrationId, ImportConfig>,
  importedData: [],
  proposedStructure: null,
  aiReasoning: '',
  selectedTemplates: [],
  structureEdits: [],
  generationProgress: {
    phase: 'idle',
    currentPhase: 0,
    completedPhases: [],
    percentage: 0,
  },
  generatedIds: null,
  expandedSections: new Set(),
  errors: {},
  isLoading: false,
  aiSuggestionsLoading: false,
}

// ============================================================================
// REDUCER
// ============================================================================

function setupWizardReducer(
  state: SetupWizardState,
  action: SetupWizardAction
): SetupWizardState {
  switch (action.type) {
    case 'SET_STEP':
      return { ...state, currentStep: action.payload }

    case 'TOGGLE_GOAL': {
      const goals = state.selectedGoals.includes(action.payload)
        ? state.selectedGoals.filter((g) => g !== action.payload)
        : [...state.selectedGoals, action.payload]
      return { ...state, selectedGoals: goals }
    }

    case 'ADD_CUSTOM_GOAL':
      if (state.customGoals.includes(action.payload)) return state
      return { ...state, customGoals: [...state.customGoals, action.payload] }

    case 'REMOVE_CUSTOM_GOAL':
      return {
        ...state,
        customGoals: state.customGoals.filter((g) => g !== action.payload),
      }

    case 'SET_ORGANIZATION':
      return { ...state, organizationMethod: action.payload }

    case 'SET_PREFERENCES':
      return {
        ...state,
        organizationPreferences: {
          ...state.organizationPreferences,
          ...action.payload,
        },
      }

    case 'TOGGLE_INTEGRATION': {
      const integrations = state.selectedIntegrations.includes(action.payload)
        ? state.selectedIntegrations.filter((i) => i !== action.payload)
        : [...state.selectedIntegrations, action.payload]
      return { ...state, selectedIntegrations: integrations }
    }

    case 'SET_IMPORT_CONFIG':
      return {
        ...state,
        importConfigs: {
          ...state.importConfigs,
          [action.payload.id]: {
            ...state.importConfigs[action.payload.id],
            ...action.payload.config,
          },
        },
      }

    case 'ADD_IMPORTED_DATA':
      return {
        ...state,
        importedData: [...state.importedData, action.payload],
      }

    case 'SET_PROPOSED_STRUCTURE':
      return {
        ...state,
        proposedStructure: action.payload.structure,
        aiReasoning: action.payload.reasoning,
      }

    case 'TOGGLE_TEMPLATE': {
      const templates = state.selectedTemplates.includes(action.payload)
        ? state.selectedTemplates.filter((t) => t !== action.payload)
        : [...state.selectedTemplates, action.payload]
      return { ...state, selectedTemplates: templates }
    }

    case 'EDIT_STRUCTURE':
      return {
        ...state,
        structureEdits: [...state.structureEdits, action.payload],
      }

    case 'SET_GENERATION_PROGRESS':
      return {
        ...state,
        generationProgress: {
          ...state.generationProgress,
          ...action.payload,
        },
      }

    case 'SET_GENERATED_IDS':
      return { ...state, generatedIds: action.payload }

    case 'TOGGLE_SECTION': {
      const expanded = new Set(state.expandedSections)
      if (expanded.has(action.payload)) {
        expanded.delete(action.payload)
      } else {
        expanded.add(action.payload)
      }
      return { ...state, expandedSections: expanded }
    }

    case 'SET_ERROR':
      return {
        ...state,
        errors: { ...state.errors, [action.payload.key]: action.payload.message },
      }

    case 'CLEAR_ERROR': {
      const errors = { ...state.errors }
      delete errors[action.payload]
      return { ...state, errors }
    }

    case 'SET_LOADING':
      return { ...state, isLoading: action.payload }

    case 'SET_AI_LOADING':
      return { ...state, aiSuggestionsLoading: action.payload }

    case 'RESET':
      return initialState

    default:
      return state
  }
}

// ============================================================================
// CONTEXT
// ============================================================================

interface SetupWizardContextValue {
  state: SetupWizardState
  dispatch: React.Dispatch<SetupWizardAction>

  // Navigation
  goToStep: (step: WizardStep) => void
  nextStep: () => void
  prevStep: () => void
  canProceed: () => boolean

  // Goals
  toggleGoal: (goal: GoalType) => void
  addCustomGoal: (goal: string) => void
  removeCustomGoal: (goal: string) => void

  // Organization
  setOrganization: (method: OrganizationMethod) => void
  setPreferences: (prefs: Partial<OrganizationPreferences>) => void

  // Integrations
  toggleIntegration: (id: IntegrationId) => void
  setImportConfig: (id: IntegrationId, config: Partial<ImportConfig>) => void
  addImportedData: (data: ImportedData) => void

  // Preview
  setProposedStructure: (structure: ProposedStructure, reasoning: string) => void
  toggleTemplate: (templateId: string) => void
  editStructure: (edit: StructureEdit) => void

  // Generation
  setGenerationProgress: (progress: Partial<GenerationProgress>) => void
  setGeneratedIds: (ids: GeneratedIds) => void

  // UI
  toggleSection: (sectionId: string) => void
  setError: (key: string, message: string) => void
  clearError: (key: string) => void
  setLoading: (loading: boolean) => void
  setAILoading: (loading: boolean) => void
  reset: () => void
}

const SetupWizardContext = createContext<SetupWizardContextValue | null>(null)

// ============================================================================
// STEP ORDER
// ============================================================================

const STEP_ORDER: WizardStep[] = ['goals', 'organization', 'integrations', 'preview', 'generate']

// ============================================================================
// PROVIDER
// ============================================================================

interface SetupWizardProviderProps {
  children: ReactNode
}

export function SetupWizardProvider({ children }: SetupWizardProviderProps) {
  const [state, dispatch] = useReducer(setupWizardReducer, initialState)

  // Navigation
  const goToStep = useCallback((step: WizardStep) => {
    dispatch({ type: 'SET_STEP', payload: step })
  }, [])

  const nextStep = useCallback(() => {
    const currentIndex = STEP_ORDER.indexOf(state.currentStep)
    if (currentIndex < STEP_ORDER.length - 1) {
      dispatch({ type: 'SET_STEP', payload: STEP_ORDER[currentIndex + 1] })
    }
  }, [state.currentStep])

  const prevStep = useCallback(() => {
    const currentIndex = STEP_ORDER.indexOf(state.currentStep)
    if (currentIndex > 0) {
      dispatch({ type: 'SET_STEP', payload: STEP_ORDER[currentIndex - 1] })
    }
  }, [state.currentStep])

  const canProceed = useCallback(() => {
    switch (state.currentStep) {
      case 'goals':
        return state.selectedGoals.length > 0 || state.customGoals.length > 0
      case 'organization':
        return state.organizationMethod !== null
      case 'integrations':
        return true // Optional step
      case 'preview':
        return state.proposedStructure !== null
      case 'generate':
        return state.generationProgress.phase === 'complete'
      default:
        return false
    }
  }, [state])

  // Goals
  const toggleGoal = useCallback((goal: GoalType) => {
    dispatch({ type: 'TOGGLE_GOAL', payload: goal })
  }, [])

  const addCustomGoal = useCallback((goal: string) => {
    dispatch({ type: 'ADD_CUSTOM_GOAL', payload: goal })
  }, [])

  const removeCustomGoal = useCallback((goal: string) => {
    dispatch({ type: 'REMOVE_CUSTOM_GOAL', payload: goal })
  }, [])

  // Organization
  const setOrganization = useCallback((method: OrganizationMethod) => {
    dispatch({ type: 'SET_ORGANIZATION', payload: method })
  }, [])

  const setPreferences = useCallback((prefs: Partial<OrganizationPreferences>) => {
    dispatch({ type: 'SET_PREFERENCES', payload: prefs })
  }, [])

  // Integrations
  const toggleIntegration = useCallback((id: IntegrationId) => {
    dispatch({ type: 'TOGGLE_INTEGRATION', payload: id })
  }, [])

  const setImportConfig = useCallback((id: IntegrationId, config: Partial<ImportConfig>) => {
    dispatch({ type: 'SET_IMPORT_CONFIG', payload: { id, config } })
  }, [])

  const addImportedData = useCallback((data: ImportedData) => {
    dispatch({ type: 'ADD_IMPORTED_DATA', payload: data })
  }, [])

  // Preview
  const setProposedStructure = useCallback(
    (structure: ProposedStructure, reasoning: string) => {
      dispatch({ type: 'SET_PROPOSED_STRUCTURE', payload: { structure, reasoning } })
    },
    []
  )

  const toggleTemplate = useCallback((templateId: string) => {
    dispatch({ type: 'TOGGLE_TEMPLATE', payload: templateId })
  }, [])

  const editStructure = useCallback((edit: StructureEdit) => {
    dispatch({ type: 'EDIT_STRUCTURE', payload: edit })
  }, [])

  // Generation
  const setGenerationProgress = useCallback((progress: Partial<GenerationProgress>) => {
    dispatch({ type: 'SET_GENERATION_PROGRESS', payload: progress })
  }, [])

  const setGeneratedIds = useCallback((ids: GeneratedIds) => {
    dispatch({ type: 'SET_GENERATED_IDS', payload: ids })
  }, [])

  // UI
  const toggleSection = useCallback((sectionId: string) => {
    dispatch({ type: 'TOGGLE_SECTION', payload: sectionId })
  }, [])

  const setError = useCallback((key: string, message: string) => {
    dispatch({ type: 'SET_ERROR', payload: { key, message } })
  }, [])

  const clearError = useCallback((key: string) => {
    dispatch({ type: 'CLEAR_ERROR', payload: key })
  }, [])

  const setLoading = useCallback((loading: boolean) => {
    dispatch({ type: 'SET_LOADING', payload: loading })
  }, [])

  const setAILoading = useCallback((loading: boolean) => {
    dispatch({ type: 'SET_AI_LOADING', payload: loading })
  }, [])

  const reset = useCallback(() => {
    dispatch({ type: 'RESET' })
  }, [])

  const value: SetupWizardContextValue = {
    state,
    dispatch,
    goToStep,
    nextStep,
    prevStep,
    canProceed,
    toggleGoal,
    addCustomGoal,
    removeCustomGoal,
    setOrganization,
    setPreferences,
    toggleIntegration,
    setImportConfig,
    addImportedData,
    setProposedStructure,
    toggleTemplate,
    editStructure,
    setGenerationProgress,
    setGeneratedIds,
    toggleSection,
    setError,
    clearError,
    setLoading,
    setAILoading,
    reset,
  }

  return (
    <SetupWizardContext.Provider value={value}>{children}</SetupWizardContext.Provider>
  )
}

// ============================================================================
// HOOK
// ============================================================================

export function useSetupWizard() {
  const context = useContext(SetupWizardContext)
  if (!context) {
    throw new Error('useSetupWizard must be used within a SetupWizardProvider')
  }
  return context
}

export { STEP_ORDER }
