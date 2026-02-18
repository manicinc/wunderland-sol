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
import type { UserPreferences } from '../lib/localStorage'
import {
  getPreferences,
  updatePreferences as savePreferences,
  resetPreferences as clearPreferences,
} from '../lib/localStorage'

type ThemePreference = UserPreferences['theme']
const THEME_CLASSES: ThemePreference[] = ['light', 'dark', 'sepia-light', 'sepia-dark']
const DETECTION_ORDER: ThemePreference[] = ['sepia-dark', 'dark', 'sepia-light', 'light']
const DARK_THEMES: ThemePreference[] = ['dark', 'sepia-dark']

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
      return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }
  } catch {
    // Ignore storage access errors
  }
  return null
}

export function usePreferences(): UsePreferencesResult {
  const [preferences, setPreferences] = useState<UserPreferences>(() => getPreferences())

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

  // Apply theme class to document
  useEffect(() => {
    if (typeof document === 'undefined') return

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

  const updateDefaultSidebarMode = useCallback((defaultSidebarMode: 'tree' | 'toc') => {
    const updated = { ...getPreferences(), defaultSidebarMode }
    savePreferences(updated)
    setPreferences(updated)
  }, [])

  const updateSidebarOpenMobile = useCallback((sidebarOpenMobile: boolean) => {
    const updated = { ...getPreferences(), sidebarOpenMobile }
    savePreferences(updated)
    setPreferences(updated)
  }, [])

  const updateMultiple = useCallback((updates: Partial<UserPreferences>) => {
    const current = getPreferences()
    const next: UserPreferences = { ...current, ...updates }
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
    updateMultiple,
    reset,
  }
}

