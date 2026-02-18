/**
 * Search Settings - Persisted configuration for semantic search
 * @module lib/search/searchSettings
 */

import { settingsStorage } from '@/lib/storage'

const SEARCH_SETTINGS_KEY = 'search_settings'

export interface SearchSettings {
  /** Minimum similarity threshold (0-1, default 0.1) */
  minThreshold: number
  /** Search mode preference */
  preferredMode: 'semantic' | 'lexical' | 'auto'
  /** Show low-confidence results */
  showLowConfidence: boolean
}

const DEFAULT_SETTINGS: SearchSettings = {
  minThreshold: 0.1,
  preferredMode: 'auto',
  showLowConfidence: true,
}

/**
 * Load search settings from storage
 */
export async function loadSearchSettings(): Promise<SearchSettings> {
  try {
    const stored = await settingsStorage.get<SearchSettings>(SEARCH_SETTINGS_KEY, DEFAULT_SETTINGS)
    return { ...DEFAULT_SETTINGS, ...stored }
  } catch (error) {
    console.warn('[SearchSettings] Failed to load settings:', error)
    return DEFAULT_SETTINGS
  }
}

/**
 * Save search settings to storage
 */
export async function saveSearchSettings(settings: Partial<SearchSettings>): Promise<boolean> {
  try {
    const current = await loadSearchSettings()
    const updated = { ...current, ...settings }
    await settingsStorage.set(SEARCH_SETTINGS_KEY, updated)
    
    // Emit event for listeners
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('search-settings-changed', { detail: updated }))
    }
    
    return true
  } catch (error) {
    console.error('[SearchSettings] Failed to save settings:', error)
    return false
  }
}

/**
 * React hook for search settings
 */
export function useSearchSettings() {
  const [settings, setSettings] = React.useState<SearchSettings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    loadSearchSettings().then((s) => {
      setSettings(s)
      setLoading(false)
    })

    // Listen for changes from other components
    const handleChange = (e: CustomEvent<SearchSettings>) => {
      setSettings(e.detail)
    }
    
    window.addEventListener('search-settings-changed', handleChange as EventListener)
    return () => window.removeEventListener('search-settings-changed', handleChange as EventListener)
  }, [])

  const updateSettings = React.useCallback(async (updates: Partial<SearchSettings>) => {
    const newSettings = { ...settings, ...updates }
    setSettings(newSettings)
    await saveSearchSettings(updates)
  }, [settings])

  return { settings, updateSettings, loading }
}

// Import React for the hook
import React from 'react'

