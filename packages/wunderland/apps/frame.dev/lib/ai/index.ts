/**
 * AI Enhancement Suite
 * @module lib/ai
 * 
 * @description
 * Central module for AI-powered features:
 * - Vision AI: Image analysis with GPT-4o/Claude
 * - RAG Pipeline: AI-enhanced search with re-ranking and synthesis
 * - Writing Assistant: Inline autocomplete while editing
 * 
 * All features are:
 * - Off by default (user must enable)
 * - Require valid API keys
 * - Fail gracefully with silent recovery
 * - Local-first (AI enhances, doesn't replace)
 */

// Types
export * from './types'

// Graceful failure utilities - import for internal use
import { getFeatureStatusInfo as _getFeatureStatusInfo } from './gracefulFailure'

// Re-export for external use
export {
  withGracefulFailure,
  recordFailure,
  recordSuccess,
  shouldDisableFeature,
  getFeatureStatusInfo,
  hasRequiredAPIKeys,
  getMissingKeyMessage,
  resetAllFailures,
  clearRecoveryTimers,
  type GracefulOptions,
} from './gracefulFailure'

// Toast notifications
export {
  showToast,
  dismissToast,
  dismissAllToasts,
  subscribeToToasts,
  showAIStatus,
  showAIError,
  showAIReady,
  showAPIKeyRequired,
  type ToastOptions,
  type ToastType,
  type ToastEvent,
} from './toast'

/* ═══════════════════════════════════════════════════════════════════════════
   FEATURE IDS
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Feature identifiers for status tracking
 */
export const AI_FEATURES = {
  VISION: 'ai-vision',
  RAG_RERANK: 'ai-rag-rerank',
  RAG_SYNTHESIZE: 'ai-rag-synthesize',
  WRITING_ASSISTANT: 'ai-writing-assistant',
  IMAGE_GENERATION: 'ai-image-generation',
} as const

export type AIFeatureId = typeof AI_FEATURES[keyof typeof AI_FEATURES]

/* ═══════════════════════════════════════════════════════════════════════════
   PREFERENCES STORAGE
═══════════════════════════════════════════════════════════════════════════ */

import { DEFAULT_AI_PREFERENCES, type AIPreferences } from './types'

const AI_PREFS_KEY = 'codex-ai-preferences'

/**
 * Get AI preferences from localStorage
 */
export function getAIPreferences(): AIPreferences {
  if (typeof window === 'undefined') {
    return DEFAULT_AI_PREFERENCES
  }

  try {
    const stored = localStorage.getItem(AI_PREFS_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      // Deep merge with defaults to handle new fields
      return {
        ...DEFAULT_AI_PREFERENCES,
        ...parsed,
        vision: {
          ...DEFAULT_AI_PREFERENCES.vision,
          ...parsed.vision,
          analysisFeatures: {
            ...DEFAULT_AI_PREFERENCES.vision.analysisFeatures,
            ...parsed.vision?.analysisFeatures,
          },
        },
        rag: { ...DEFAULT_AI_PREFERENCES.rag, ...parsed.rag },
        writingAssistant: { ...DEFAULT_AI_PREFERENCES.writingAssistant, ...parsed.writingAssistant },
        imageGeneration: { ...DEFAULT_AI_PREFERENCES.imageGeneration, ...parsed.imageGeneration },
      }
    }
  } catch (error) {
    console.warn('[AI] Failed to load preferences:', error)
  }

  return DEFAULT_AI_PREFERENCES
}

/**
 * Save AI preferences to localStorage
 */
export function saveAIPreferences(prefs: AIPreferences): void {
  if (typeof window === 'undefined') return
  
  try {
    localStorage.setItem(AI_PREFS_KEY, JSON.stringify(prefs))
    // Dispatch event for listeners
    window.dispatchEvent(new CustomEvent('ai-preferences-changed', { detail: prefs }))
  } catch (error) {
    console.warn('[AI] Failed to save preferences:', error)
  }
}

/**
 * Update a specific AI preference
 */
export function updateAIPreference<K extends keyof AIPreferences>(
  feature: K,
  updates: Partial<AIPreferences[K]>
): AIPreferences {
  const current = getAIPreferences()
  const updated: AIPreferences = {
    ...current,
    [feature]: {
      ...current[feature],
      ...updates,
    },
  }
  saveAIPreferences(updated)
  return updated
}

/**
 * Subscribe to AI preference changes
 */
export function subscribeToAIPreferences(
  callback: (prefs: AIPreferences) => void
): () => void {
  if (typeof window === 'undefined') return () => {}
  
  const handler = (e: CustomEvent<AIPreferences>) => callback(e.detail)
  window.addEventListener('ai-preferences-changed', handler as EventListener)
  return () => window.removeEventListener('ai-preferences-changed', handler as EventListener)
}

/* ═══════════════════════════════════════════════════════════════════════════
   HOOKS (React)
═══════════════════════════════════════════════════════════════════════════ */

import { useState, useEffect, useCallback } from 'react'

/**
 * React hook for AI preferences
 */
export function useAIPreferences(): [
  AIPreferences,
  (feature: keyof AIPreferences, updates: Partial<AIPreferences[keyof AIPreferences]>) => void
] {
  const [prefs, setPrefs] = useState<AIPreferences>(DEFAULT_AI_PREFERENCES)
  
  useEffect(() => {
    // Load initial preferences
    setPrefs(getAIPreferences())
    
    // Subscribe to changes
    return subscribeToAIPreferences(setPrefs)
  }, [])
  
  const updatePrefs = useCallback(<K extends keyof AIPreferences>(
    feature: K,
    updates: Partial<AIPreferences[K]>
  ) => {
    const updated = updateAIPreference(feature, updates)
    setPrefs(updated)
  }, [])
  
  return [prefs, updatePrefs]
}

/**
 * React hook for a specific AI feature status
 */
export function useAIFeatureStatus(featureId: AIFeatureId): {
  status: import('./types').AIFeatureStatus
  isAvailable: boolean
  isWorking: boolean
  error?: string
} {
  const [prefs] = useAIPreferences()
  const [statusInfo, setStatusInfo] = useState<import('./types').AIStatusInfo>({ status: 'disabled' })

  useEffect(() => {
    // Determine which preference controls this feature
    let enabled = false
    switch (featureId) {
      case AI_FEATURES.VISION:
        enabled = prefs.vision.enabled
        break
      case AI_FEATURES.RAG_RERANK:
        enabled = prefs.rag.enabled && prefs.rag.rerank
        break
      case AI_FEATURES.RAG_SYNTHESIZE:
        enabled = prefs.rag.enabled && prefs.rag.synthesize
        break
      case AI_FEATURES.WRITING_ASSISTANT:
        enabled = prefs.writingAssistant.enabled
        break
      case AI_FEATURES.IMAGE_GENERATION:
        enabled = prefs.imageGeneration.enabled
        break
    }

    setStatusInfo(_getFeatureStatusInfo(featureId, enabled))
  }, [featureId, prefs])

  return {
    status: statusInfo.status,
    isAvailable: statusInfo.status === 'ready',
    isWorking: statusInfo.status === 'working',
    error: statusInfo.lastError,
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   SELECTION ACTIONS
═══════════════════════════════════════════════════════════════════════════ */

export {
  type SelectionAction,
  type SelectionActionOptions,
  type SelectionActionResult,
  SELECTION_ACTIONS,
  performSelectionAction,
  streamSelectionAction,
  getActionPrompt,
} from './selectionActions'

/* ═══════════════════════════════════════════════════════════════════════════
   DOCUMENT VISUALIZER
═══════════════════════════════════════════════════════════════════════════ */

export {
  type VisualizationMode,
  type VisualizationType,
  type VisualizationRequest,
  type VisualizationItem,
  type KeyConcept,
  type VisualizationResult,
  type PictureBookPage,
  VISUALIZATION_STYLES,
  extractKeyConceptsForVisualization,
  generateParagraphIllustration,
  generateVisualizationsForDocument,
  generateVisualizationItem,
  splitIntoPictureBookPages,
  generatePictureBookImages,
  suggestVisualizationStyle,
} from './documentVisualizer'



