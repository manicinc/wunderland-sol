/**
 * Research Preferences Hook
 * @module lib/research/useResearchPreferences
 *
 * React hook for accessing and updating research preferences with
 * automatic reactivity to storage changes.
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  type ResearchPreferences,
  getResearchPreferences,
  saveResearchPreferences,
  resetResearchPreferences,
  getDefaultResearchPreferences,
  getSearchProviderKey,
  saveSearchProviderKey,
  removeSearchProviderKey,
  getConfiguredSearchProviders,
} from './preferences'
import type { SearchProvider } from './types'

// ============================================================================
// TYPES
// ============================================================================

export interface UseResearchPreferencesResult {
  /** Current preferences */
  prefs: ResearchPreferences
  /** Whether preferences are loading */
  loading: boolean
  /** Update one or more preferences */
  update: (updates: Partial<ResearchPreferences>) => void
  /** Reset all preferences to defaults */
  reset: () => void
  /** Get default preferences */
  defaults: ResearchPreferences
}

export interface UseSearchProviderKeysResult {
  /** Configured provider IDs */
  configuredProviders: SearchProvider[]
  /** Loading state */
  loading: boolean
  /** Get API key for a provider */
  getKey: (provider: SearchProvider) => string | null
  /** Save API key for a provider */
  saveKey: (provider: SearchProvider, key: string) => void
  /** Remove API key for a provider */
  removeKey: (provider: SearchProvider) => void
  /** Refresh configured providers list */
  refresh: () => void
}

// ============================================================================
// PREFERENCES HOOK
// ============================================================================

/**
 * Hook for managing research preferences
 */
export function useResearchPreferences(): UseResearchPreferencesResult {
  const [prefs, setPrefs] = useState<ResearchPreferences>(getDefaultResearchPreferences())
  const [loading, setLoading] = useState(true)

  // Load preferences on mount
  useEffect(() => {
    setPrefs(getResearchPreferences())
    setLoading(false)
  }, [])

  // Listen for changes from other tabs/components
  useEffect(() => {
    const handleChange = (event: CustomEvent<ResearchPreferences>) => {
      setPrefs(event.detail)
    }

    window.addEventListener(
      'research-preferences-changed' as any,
      handleChange as EventListener
    )

    return () => {
      window.removeEventListener(
        'research-preferences-changed' as any,
        handleChange as EventListener
      )
    }
  }, [])

  const update = useCallback((updates: Partial<ResearchPreferences>) => {
    saveResearchPreferences(updates)
    setPrefs((current) => ({ ...current, ...updates }))
  }, [])

  const reset = useCallback(() => {
    resetResearchPreferences()
    setPrefs(getDefaultResearchPreferences())
  }, [])

  return {
    prefs,
    loading,
    update,
    reset,
    defaults: getDefaultResearchPreferences(),
  }
}

// ============================================================================
// SEARCH PROVIDER KEYS HOOK
// ============================================================================

/**
 * Hook for managing search provider API keys
 */
export function useSearchProviderKeys(): UseSearchProviderKeysResult {
  const [configuredProviders, setConfiguredProviders] = useState<SearchProvider[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(() => {
    setConfiguredProviders(getConfiguredSearchProviders())
  }, [])

  // Load on mount
  useEffect(() => {
    refresh()
    setLoading(false)
  }, [refresh])

  // Listen for key changes
  useEffect(() => {
    const handleChange = () => {
      refresh()
    }

    window.addEventListener('search-keys-changed', handleChange)
    return () => window.removeEventListener('search-keys-changed', handleChange)
  }, [refresh])

  const getKey = useCallback((provider: SearchProvider) => {
    return getSearchProviderKey(provider)
  }, [])

  const saveKey = useCallback((provider: SearchProvider, key: string) => {
    saveSearchProviderKey(provider, key)
    refresh()
  }, [refresh])

  const removeKey = useCallback((provider: SearchProvider) => {
    removeSearchProviderKey(provider)
    refresh()
  }, [refresh])

  return {
    configuredProviders,
    loading,
    getKey,
    saveKey,
    removeKey,
    refresh,
  }
}
