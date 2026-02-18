/**
 * RAG Context Provider
 * Manages RAG scope and settings for the Ask page
 * @module quarry/ui/ask/RAGContext
 */

'use client'

import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
  ReactNode,
} from 'react'

// ============================================================================
// TYPES
// ============================================================================

export type RAGMode = 'sidebar-auto' | 'manual-pick'

export type RAGPreset = 'precise' | 'balanced' | 'broad'

export interface RAGScope {
  weaves: string[]
  looms: string[]
  strands: string[]
}

export interface RAGSettings {
  similarityThreshold: number
  maxResults: number
  minRelevanceScore: number
  includePlannerData: boolean
  recentHistoryDays: number
  temporalWeighting: boolean
  autoDetectTemporal: boolean
}

export interface RAGContextState {
  // Mode
  mode: RAGMode
  preset: RAGPreset

  // Scopes
  sidebarScope: RAGScope
  manualScope: RAGScope
  activeScope: RAGScope // Computed based on mode

  // Settings
  settings: RAGSettings

  // Status
  indexedDocCount: number
  lastIndexed: string | null
  isIndexing: boolean
  indexingProgress: number

  // Temporal
  detectedDateRange: { start: Date; end: Date } | null
  manualDateRange: { start: Date; end: Date } | null
  temporalTerms: string[]
}

export type RAGContextAction =
  | { type: 'SET_MODE'; payload: RAGMode }
  | { type: 'SET_PRESET'; payload: RAGPreset }
  | { type: 'SET_SIDEBAR_SCOPE'; payload: Partial<RAGScope> }
  | { type: 'SET_MANUAL_SCOPE'; payload: Partial<RAGScope> }
  | { type: 'ADD_TO_MANUAL_SCOPE'; payload: { type: keyof RAGScope; id: string } }
  | { type: 'REMOVE_FROM_MANUAL_SCOPE'; payload: { type: keyof RAGScope; id: string } }
  | { type: 'CLEAR_MANUAL_SCOPE' }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<RAGSettings> }
  | { type: 'SET_INDEXING_STATUS'; payload: { isIndexing: boolean; progress?: number } }
  | { type: 'SET_INDEX_INFO'; payload: { count: number; lastIndexed: string } }
  | { type: 'SET_DETECTED_DATE_RANGE'; payload: { start: Date; end: Date } | null }
  | { type: 'SET_MANUAL_DATE_RANGE'; payload: { start: Date; end: Date } | null }
  | { type: 'SET_TEMPORAL_TERMS'; payload: string[] }
  | { type: 'RESET_TEMPORAL' }

// ============================================================================
// PRESET CONFIGURATIONS
// ============================================================================

export const RAG_PRESETS: Record<RAGPreset, Partial<RAGSettings>> = {
  precise: {
    similarityThreshold: 0.85,
    maxResults: 5,
    minRelevanceScore: 0.8,
  },
  balanced: {
    similarityThreshold: 0.7,
    maxResults: 15,
    minRelevanceScore: 0.6,
  },
  broad: {
    similarityThreshold: 0.5,
    maxResults: 30,
    minRelevanceScore: 0.4,
  },
}

// ============================================================================
// INITIAL STATE
// ============================================================================

const DEFAULT_SETTINGS: RAGSettings = {
  similarityThreshold: 0.7,
  maxResults: 15,
  minRelevanceScore: 0.6,
  includePlannerData: true,
  recentHistoryDays: 14,
  temporalWeighting: true,
  autoDetectTemporal: true,
}

const initialState: RAGContextState = {
  mode: 'sidebar-auto',
  preset: 'balanced',
  sidebarScope: { weaves: [], looms: [], strands: [] },
  manualScope: { weaves: [], looms: [], strands: [] },
  activeScope: { weaves: [], looms: [], strands: [] },
  settings: DEFAULT_SETTINGS,
  indexedDocCount: 0,
  lastIndexed: null,
  isIndexing: false,
  indexingProgress: 0,
  detectedDateRange: null,
  manualDateRange: null,
  temporalTerms: [],
}

// ============================================================================
// REDUCER
// ============================================================================

function computeActiveScope(state: RAGContextState): RAGScope {
  return state.mode === 'sidebar-auto' ? state.sidebarScope : state.manualScope
}

function ragContextReducer(
  state: RAGContextState,
  action: RAGContextAction
): RAGContextState {
  let newState: RAGContextState

  switch (action.type) {
    case 'SET_MODE':
      newState = { ...state, mode: action.payload }
      break

    case 'SET_PRESET':
      newState = {
        ...state,
        preset: action.payload,
        settings: { ...state.settings, ...RAG_PRESETS[action.payload] },
      }
      break

    case 'SET_SIDEBAR_SCOPE':
      newState = {
        ...state,
        sidebarScope: { ...state.sidebarScope, ...action.payload },
      }
      break

    case 'SET_MANUAL_SCOPE':
      newState = {
        ...state,
        manualScope: { ...state.manualScope, ...action.payload },
      }
      break

    case 'ADD_TO_MANUAL_SCOPE': {
      const { type, id } = action.payload
      const current = state.manualScope[type]
      if (!current.includes(id)) {
        newState = {
          ...state,
          manualScope: {
            ...state.manualScope,
            [type]: [...current, id],
          },
        }
      } else {
        return state
      }
      break
    }

    case 'REMOVE_FROM_MANUAL_SCOPE': {
      const { type, id } = action.payload
      newState = {
        ...state,
        manualScope: {
          ...state.manualScope,
          [type]: state.manualScope[type].filter((item) => item !== id),
        },
      }
      break
    }

    case 'CLEAR_MANUAL_SCOPE':
      newState = {
        ...state,
        manualScope: { weaves: [], looms: [], strands: [] },
      }
      break

    case 'UPDATE_SETTINGS':
      newState = {
        ...state,
        settings: { ...state.settings, ...action.payload },
      }
      break

    case 'SET_INDEXING_STATUS':
      newState = {
        ...state,
        isIndexing: action.payload.isIndexing,
        indexingProgress: action.payload.progress ?? state.indexingProgress,
      }
      break

    case 'SET_INDEX_INFO':
      newState = {
        ...state,
        indexedDocCount: action.payload.count,
        lastIndexed: action.payload.lastIndexed,
      }
      break

    case 'SET_DETECTED_DATE_RANGE':
      newState = { ...state, detectedDateRange: action.payload }
      break

    case 'SET_MANUAL_DATE_RANGE':
      newState = { ...state, manualDateRange: action.payload }
      break

    case 'SET_TEMPORAL_TERMS':
      newState = { ...state, temporalTerms: action.payload }
      break

    case 'RESET_TEMPORAL':
      newState = {
        ...state,
        detectedDateRange: null,
        manualDateRange: null,
        temporalTerms: [],
      }
      break

    default:
      return state
  }

  // Recompute active scope
  newState.activeScope = computeActiveScope(newState)
  return newState
}

// ============================================================================
// CONTEXT
// ============================================================================

interface RAGContextValue {
  state: RAGContextState
  dispatch: React.Dispatch<RAGContextAction>

  // Mode
  setMode: (mode: RAGMode) => void
  setPreset: (preset: RAGPreset) => void

  // Scope
  setSidebarScope: (scope: Partial<RAGScope>) => void
  setManualScope: (scope: Partial<RAGScope>) => void
  addToManualScope: (type: keyof RAGScope, id: string) => void
  removeFromManualScope: (type: keyof RAGScope, id: string) => void
  clearManualScope: () => void

  // Settings
  updateSettings: (settings: Partial<RAGSettings>) => void

  // Temporal
  setDetectedDateRange: (range: { start: Date; end: Date } | null) => void
  setManualDateRange: (range: { start: Date; end: Date } | null) => void
  setTemporalTerms: (terms: string[]) => void
  resetTemporal: () => void

  // Computed
  getScopeCount: () => number
  getEffectiveDateRange: () => { start: Date; end: Date } | null
}

const RAGContext = createContext<RAGContextValue | null>(null)

// ============================================================================
// PROVIDER
// ============================================================================

interface RAGProviderProps {
  children: ReactNode
}

export function RAGProvider({ children }: RAGProviderProps) {
  const [state, dispatch] = useReducer(ragContextReducer, initialState)

  // Mode
  const setMode = useCallback((mode: RAGMode) => {
    dispatch({ type: 'SET_MODE', payload: mode })
  }, [])

  const setPreset = useCallback((preset: RAGPreset) => {
    dispatch({ type: 'SET_PRESET', payload: preset })
  }, [])

  // Scope
  const setSidebarScope = useCallback((scope: Partial<RAGScope>) => {
    dispatch({ type: 'SET_SIDEBAR_SCOPE', payload: scope })
  }, [])

  const setManualScope = useCallback((scope: Partial<RAGScope>) => {
    dispatch({ type: 'SET_MANUAL_SCOPE', payload: scope })
  }, [])

  const addToManualScope = useCallback((type: keyof RAGScope, id: string) => {
    dispatch({ type: 'ADD_TO_MANUAL_SCOPE', payload: { type, id } })
  }, [])

  const removeFromManualScope = useCallback((type: keyof RAGScope, id: string) => {
    dispatch({ type: 'REMOVE_FROM_MANUAL_SCOPE', payload: { type, id } })
  }, [])

  const clearManualScope = useCallback(() => {
    dispatch({ type: 'CLEAR_MANUAL_SCOPE' })
  }, [])

  // Settings
  const updateSettings = useCallback((settings: Partial<RAGSettings>) => {
    dispatch({ type: 'UPDATE_SETTINGS', payload: settings })
  }, [])

  // Temporal
  const setDetectedDateRange = useCallback(
    (range: { start: Date; end: Date } | null) => {
      dispatch({ type: 'SET_DETECTED_DATE_RANGE', payload: range })
    },
    []
  )

  const setManualDateRange = useCallback(
    (range: { start: Date; end: Date } | null) => {
      dispatch({ type: 'SET_MANUAL_DATE_RANGE', payload: range })
    },
    []
  )

  const setTemporalTerms = useCallback((terms: string[]) => {
    dispatch({ type: 'SET_TEMPORAL_TERMS', payload: terms })
  }, [])

  const resetTemporal = useCallback(() => {
    dispatch({ type: 'RESET_TEMPORAL' })
  }, [])

  // Computed
  const getScopeCount = useCallback(() => {
    const scope = state.activeScope
    return scope.weaves.length + scope.looms.length + scope.strands.length
  }, [state.activeScope])

  const getEffectiveDateRange = useCallback(() => {
    // Manual range takes precedence
    if (state.manualDateRange) return state.manualDateRange
    // Otherwise use detected range if temporal detection is enabled
    if (state.settings.autoDetectTemporal && state.detectedDateRange) {
      return state.detectedDateRange
    }
    return null
  }, [state.manualDateRange, state.detectedDateRange, state.settings.autoDetectTemporal])

  // Load settings from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('quarry-rag-settings')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        dispatch({ type: 'UPDATE_SETTINGS', payload: parsed })
      } catch (e) {
        console.error('[RAGContext] Failed to load settings:', e)
      }
    }
  }, [])

  // Save settings to localStorage
  useEffect(() => {
    localStorage.setItem('quarry-rag-settings', JSON.stringify(state.settings))
  }, [state.settings])

  const value: RAGContextValue = {
    state,
    dispatch,
    setMode,
    setPreset,
    setSidebarScope,
    setManualScope,
    addToManualScope,
    removeFromManualScope,
    clearManualScope,
    updateSettings,
    setDetectedDateRange,
    setManualDateRange,
    setTemporalTerms,
    resetTemporal,
    getScopeCount,
    getEffectiveDateRange,
  }

  return <RAGContext.Provider value={value}>{children}</RAGContext.Provider>
}

// ============================================================================
// HOOK
// ============================================================================

export function useRAGContext() {
  const context = useContext(RAGContext)
  if (!context) {
    throw new Error('useRAGContext must be used within a RAGProvider')
  }
  return context
}
