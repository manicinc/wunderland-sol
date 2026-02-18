/**
 * Hook for managing user preferences
 * @module codex/hooks/usePreferences
 * 
 * @remarks
 * - Stores preferences in localStorage (client-side only)
 * - Theme (light/dark/sepia light/sepia dark), font size, tree density, sidebar defaults
 * - Auto-applies theme and font size to document
 * - No tracking or server sync
 * 
 * @example
 * ```tsx
 * const { preferences, updateTheme, updateFontSize } = usePreferences()
 * 
 * <button onClick={() => updateTheme('dark')}>
 *   Dark Mode
 * </button>
 * ```
 */

import { useState, useEffect, useCallback, useLayoutEffect } from 'react'
import type { UserPreferences } from '@/lib/localStorage'
import {
  getPreferences,
  updatePreferences as savePreferences,
  resetPreferences as clearPreferences,
} from '@/lib/localStorage'

type ThemePreference = UserPreferences['theme']
const THEME_CLASSES: ThemePreference[] = ['light', 'dark', 'sepia-light', 'sepia-dark', 'terminal-light', 'terminal-dark']
const DETECTION_ORDER: ThemePreference[] = ['terminal-dark', 'terminal-light', 'sepia-dark', 'dark', 'sepia-light', 'light']

const DARK_THEMES: ThemePreference[] = ['dark', 'sepia-dark', 'terminal-dark']

const isThemePreference = (value: string | null | undefined): value is ThemePreference =>
  !!value && THEME_CLASSES.includes(value as ThemePreference)

interface UsePreferencesResult {
  /** Current preferences */
  preferences: UserPreferences
  /** Update theme */
  updateTheme: (theme: UserPreferences['theme']) => void
  /** Update font size (0.8 - 1.5) */
  updateFontSize: (size: number) => void
  /** Update tree density */
  updateTreeDensity: (density: UserPreferences['treeDensity']) => void
  /** Update default sidebar mode */
  updateDefaultSidebarMode: (mode: UserPreferences['defaultSidebarMode']) => void
  /** Update sidebar open on mobile default */
  updateSidebarOpenMobile: (open: boolean) => void
  /** Update metadata panel preferred size */
  updateMetadataPanelSize: (size: UserPreferences['metadataPanelSize']) => void
  /** Update remember scroll position preference */
  updateRememberScrollPosition: (enabled: boolean) => void
  /** Update left sidebar font size (0=xs, 1=sm, 2=base, 3=lg) */
  updateLeftSidebarFontSize: (size: number) => void
  /** Update right sidebar font size (0=xs, 1=sm, 2=base, 3=lg) */
  updateRightSidebarFontSize: (size: number) => void
  /** Update auto-transcribe voice notes preference */
  updateAutoTranscribeVoiceNotes: (enabled: boolean) => void
  /** Update sidebar collapsed state */
  updateSidebarCollapsed: (collapsed: boolean) => void
  /** Save expanded paths for session restoration */
  saveExpandedPaths: (paths: string[]) => void
  /** Update multiple preferences at once */
  updateMultiple: (updates: Partial<UserPreferences>) => void
  /** Reset to defaults */
  reset: () => void
}

/**
 * Manage user preferences with localStorage persistence
 * 
 * @remarks
 * Automatically loads preferences on mount and applies theme/font size
 * to the document. All preferences are stored client-side only.
 * 
 * @example
 * ```tsx
 * function Settings() {
 *   const { preferences, updateTheme, updateFontSize, reset } = usePreferences()
 *   
 *   return (
 *     <>
 *       <select value={preferences.theme} onChange={(e) => updateTheme(e.target.value as UserPreferences['theme'])}>
 *         <option value="light">Light</option>
 *         <option value="dark">Dark</option>
 *         <option value="sepia-light">Sepia Light</option>
 *         <option value="sepia-dark">Sepia Dark</option>
 *       </select>
 *       
 *       <input
 *         type="range"
 *         min="0.8"
 *         max="1.5"
 *         step="0.1"
 *         value={preferences.fontSize}
 *         onChange={(e) => updateFontSize(parseFloat(e.target.value))}
 *       />
 *       
 *       <button onClick={reset}>Reset to Defaults</button>
 *     </>
 *   )
 * }
 * ```
 */
function detectHostTheme(): ThemePreference | null {
  if (typeof document === 'undefined') return null
  for (const theme of DETECTION_ORDER) {
    if (document.documentElement.classList.contains(theme)) return theme
  }
  return null
}

function readExternalTheme(): ThemePreference | null {
  if (typeof window === 'undefined') return null
  try {
    const stored = window.localStorage.getItem('theme')
    if (isThemePreference(stored)) return stored
    if (stored === 'system') {
      const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches
      return prefersDark ? 'dark' : 'light'
    }
  } catch {
    // Ignore access errors (Safari private mode, etc.)
  }
  return null
}

export function usePreferences(): UsePreferencesResult {
  const [preferences, setPreferences] = useState<UserPreferences>(() => getPreferences())

  // Align Codex theme with host (Frame.dev) before the first paint to prevent flashes.
  useLayoutEffect(() => {
    const hostTheme = readExternalTheme() ?? detectHostTheme()
    if (!hostTheme) return

    setPreferences((current) => {
      if (current.theme === hostTheme) return current
      const next = { ...current, theme: hostTheme }
      savePreferences(next)
      return next
    })
  }, [])

  // React to host theme changes (Next Themes toggles) via MutationObserver + storage events.
  useEffect(() => {
    if (typeof document === 'undefined' || typeof window === 'undefined') return

    const syncFromHost = () => {
      const hostTheme = detectHostTheme()
      if (!hostTheme) return
      setPreferences((current) => {
        if (current.theme === hostTheme) return current
        const next = { ...current, theme: hostTheme }
        savePreferences(next)
        return next
      })
    }

    const observer = new MutationObserver(syncFromHost)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== 'theme') return
      syncFromHost()
    }
    window.addEventListener('storage', handleStorage)

    return () => {
      observer.disconnect()
      window.removeEventListener('storage', handleStorage)
    }
  }, [])

  // Apply theme class to document (only in Codex mode, not landing page)
  useEffect(() => {
    if (typeof document === 'undefined' || typeof window === 'undefined') return
    
    // Don't apply theme classes if we're not in the Codex viewer
    // Let ThemeProvider handle it on the landing page
    const isCodexPage = window.location.pathname.includes('/quarry')
    if (!isCodexPage) return

    const root = document.documentElement
    root.classList.remove(...THEME_CLASSES, 'dark')
    root.classList.add(preferences.theme)
    if (DARK_THEMES.includes(preferences.theme)) {
      root.classList.add('dark')
    }
  }, [preferences.theme])

  // Apply font size to document
  useEffect(() => {
    if (typeof document === 'undefined') return
    document.documentElement.style.setProperty('--codex-font-scale', preferences.fontSize.toString())
  }, [preferences.fontSize])

  const updateTheme = useCallback((theme: ThemePreference) => {
    const nextTheme = isThemePreference(theme) ? theme : 'light'
    const updated = { ...getPreferences(), theme: nextTheme }
    savePreferences(updated)
    setPreferences(updated)
  }, [])

  const updateFontSize = useCallback((fontSize: number) => {
    // Clamp between 0.8 and 1.5
    const clamped = Math.max(0.8, Math.min(1.5, fontSize))
    const updated = { ...getPreferences(), fontSize: clamped }
    savePreferences(updated)
    setPreferences(updated)
  }, [])

  const updateTreeDensity = useCallback((treeDensity: UserPreferences['treeDensity']) => {
    const updated = { ...getPreferences(), treeDensity }
    savePreferences(updated)
    setPreferences(updated)
  }, [])

  const updateDefaultSidebarMode = useCallback((defaultSidebarMode: 'tree' | 'toc' | 'tags' | 'query') => {
    const updated = { ...getPreferences(), defaultSidebarMode }
    savePreferences(updated)
    setPreferences(updated)
  }, [])

  const updateSidebarOpenMobile = useCallback((sidebarOpenMobile: boolean) => {
    const updated = { ...getPreferences(), sidebarOpenMobile }
    savePreferences(updated)
    setPreferences(updated)
  }, [])

  const updateMetadataPanelSize = useCallback((metadataPanelSize: UserPreferences['metadataPanelSize']) => {
    const updated = { ...getPreferences(), metadataPanelSize }
    savePreferences(updated)
    setPreferences(updated)
  }, [])

  const updateRememberScrollPosition = useCallback((rememberScrollPosition: boolean) => {
    const updated = { ...getPreferences(), rememberScrollPosition }
    savePreferences(updated)
    setPreferences(updated)
  }, [])

  const updateLeftSidebarFontSize = useCallback((leftSidebarFontSize: number) => {
    // Clamp between 0 and 3
    const clamped = Math.max(0, Math.min(3, leftSidebarFontSize))
    const updated = { ...getPreferences(), leftSidebarFontSize: clamped }
    savePreferences(updated)
    setPreferences(updated)
  }, [])

  const updateRightSidebarFontSize = useCallback((rightSidebarFontSize: number) => {
    // Clamp between 0 and 3
    const clamped = Math.max(0, Math.min(3, rightSidebarFontSize))
    const updated = { ...getPreferences(), rightSidebarFontSize: clamped }
    savePreferences(updated)
    setPreferences(updated)
  }, [])

  const updateAutoTranscribeVoiceNotes = useCallback((autoTranscribeVoiceNotes: boolean) => {
    const updated = { ...getPreferences(), autoTranscribeVoiceNotes }
    savePreferences(updated)
    setPreferences(updated)
  }, [])

  const updateSidebarCollapsed = useCallback((sidebarCollapsed: boolean) => {
    const updated = { ...getPreferences(), sidebarCollapsed }
    savePreferences(updated)
    setPreferences(updated)
  }, [])

  const saveExpandedPathsCallback = useCallback((paths: string[]) => {
    const updated = { ...getPreferences(), lastExpandedPaths: paths }
    savePreferences(updated)
    setPreferences(updated)
  }, [])

  const updateMultiple = useCallback((updates: Partial<UserPreferences>) => {
    const current = getPreferences()
    const next: UserPreferences = {
      ...current,
      ...updates,
    }
    if (updates.theme && !isThemePreference(updates.theme)) {
      next.theme = current.theme
    }
    savePreferences(next)
    setPreferences(next)
  }, [])

  const reset = useCallback(() => {
    clearPreferences()
    setPreferences(getPreferences())
  }, [])

  return {
    preferences,
    updateTheme,
    updateFontSize,
    updateTreeDensity,
    updateDefaultSidebarMode,
    updateSidebarOpenMobile,
    updateMetadataPanelSize,
    updateRememberScrollPosition,
    updateLeftSidebarFontSize,
    updateRightSidebarFontSize,
    updateAutoTranscribeVoiceNotes,
    updateSidebarCollapsed,
    saveExpandedPaths: saveExpandedPathsCallback,
    updateMultiple,
    reset,
  }
}

