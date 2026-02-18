/**
 * Research Preferences Storage
 * @module lib/research/preferences
 *
 * Manages user preferences for research functionality including
 * default citation style, auto-enrichment, cache settings, and provider priority.
 */

import type { CitationStyle } from './citationFormatter'
import type { SearchProvider } from './types'

// ============================================================================
// TYPES
// ============================================================================

export interface ResearchPreferences {
  /** Default citation style for formatting */
  defaultCitationStyle: CitationStyle
  /** Whether to auto-fetch paper metadata from Semantic Scholar */
  autoEnrichEnabled: boolean
  /** Search result cache duration in milliseconds */
  cacheDurationMs: number
  /** Search provider priority order */
  providerPriority: SearchProvider[]
  /** SearXNG custom instance URL (optional) */
  searxngInstanceUrl?: string
  /** Last updated timestamp */
  updatedAt: number
}

// ============================================================================
// CONSTANTS
// ============================================================================

const PREFERENCES_KEY = 'quarry-research-preferences'

const DEFAULT_PREFERENCES: ResearchPreferences = {
  defaultCitationStyle: 'apa',
  autoEnrichEnabled: true,
  cacheDurationMs: 5 * 60 * 1000, // 5 minutes
  providerPriority: ['brave', 'serper', 'duckduckgo'],
  updatedAt: 0,
}

// Cache duration options in milliseconds
export const CACHE_DURATION_OPTIONS = [
  { label: '1 minute', value: 1 * 60 * 1000 },
  { label: '5 minutes', value: 5 * 60 * 1000 },
  { label: '15 minutes', value: 15 * 60 * 1000 },
  { label: '30 minutes', value: 30 * 60 * 1000 },
  { label: '1 hour', value: 60 * 60 * 1000 },
  { label: 'Never cache', value: 0 },
] as const

// ============================================================================
// STORAGE FUNCTIONS
// ============================================================================

/**
 * Get current research preferences
 */
export function getResearchPreferences(): ResearchPreferences {
  if (typeof window === 'undefined') {
    return { ...DEFAULT_PREFERENCES }
  }

  try {
    const stored = localStorage.getItem(PREFERENCES_KEY)
    if (!stored) {
      return { ...DEFAULT_PREFERENCES }
    }

    const parsed = JSON.parse(stored) as Partial<ResearchPreferences>
    return {
      ...DEFAULT_PREFERENCES,
      ...parsed,
    }
  } catch (error) {
    console.warn('[ResearchPreferences] Failed to load preferences:', error)
    return { ...DEFAULT_PREFERENCES }
  }
}

/**
 * Save research preferences
 */
export function saveResearchPreferences(prefs: Partial<ResearchPreferences>): void {
  if (typeof window === 'undefined') return

  try {
    const current = getResearchPreferences()
    const updated: ResearchPreferences = {
      ...current,
      ...prefs,
      updatedAt: Date.now(),
    }

    localStorage.setItem(PREFERENCES_KEY, JSON.stringify(updated))

    // Dispatch event for reactivity
    window.dispatchEvent(
      new CustomEvent('research-preferences-changed', {
        detail: updated,
      })
    )
  } catch (error) {
    console.error('[ResearchPreferences] Failed to save preferences:', error)
  }
}

/**
 * Reset research preferences to defaults
 */
export function resetResearchPreferences(): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.removeItem(PREFERENCES_KEY)

    window.dispatchEvent(
      new CustomEvent('research-preferences-changed', {
        detail: DEFAULT_PREFERENCES,
      })
    )
  } catch (error) {
    console.error('[ResearchPreferences] Failed to reset preferences:', error)
  }
}

/**
 * Get default preferences (for reference)
 */
export function getDefaultResearchPreferences(): ResearchPreferences {
  return { ...DEFAULT_PREFERENCES }
}

// ============================================================================
// SEARCH PROVIDER KEY FUNCTIONS (migrated from search.ts for centralization)
// ============================================================================

/**
 * Get API key for a search provider
 */
export function getSearchProviderKey(provider: SearchProvider): string | null {
  if (typeof window === 'undefined') return null

  try {
    return localStorage.getItem(`quarry-search-${provider}-key`)
  } catch {
    return null
  }
}

/**
 * Save API key for a search provider
 */
export function saveSearchProviderKey(provider: SearchProvider, key: string): void {
  if (typeof window === 'undefined') return

  localStorage.setItem(`quarry-search-${provider}-key`, key)
  window.dispatchEvent(
    new CustomEvent('search-keys-changed', { detail: { provider } })
  )
}

/**
 * Remove API key for a search provider
 */
export function removeSearchProviderKey(provider: SearchProvider): void {
  if (typeof window === 'undefined') return

  localStorage.removeItem(`quarry-search-${provider}-key`)
  window.dispatchEvent(
    new CustomEvent('search-keys-changed', { detail: { provider } })
  )
}

/**
 * Check which search providers have API keys configured
 */
export function getConfiguredSearchProviders(): SearchProvider[] {
  const configured: SearchProvider[] = ['duckduckgo', 'semanticscholar'] // Always available

  if (getSearchProviderKey('brave')) configured.push('brave')
  if (getSearchProviderKey('serper')) configured.push('serper')
  if (getSearchProviderKey('searchapi')) configured.push('searchapi')
  if (getSearchProviderKey('google-cse')) configured.push('google-cse')

  return configured
}
