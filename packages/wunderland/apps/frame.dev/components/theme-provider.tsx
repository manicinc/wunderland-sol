'use client'

import * as React from 'react'
import { ThemeProvider as NextThemesProvider, useTheme } from 'next-themes'
import { type ThemeProviderProps } from 'next-themes/dist/types'

/**
 * Dark theme variants that should trigger Tailwind's dark: utilities
 */
const DARK_THEMES = ['dark', 'sepia-dark', 'terminal-dark', 'oceanic-dark']

/**
 * All valid theme names for class management
 */
const ALL_THEMES = ['light', 'dark', 'sepia-light', 'sepia-dark', 'terminal-light', 'terminal-dark', 'oceanic-light', 'oceanic-dark']

/**
 * Syncs theme classes on <html> based on the active theme.
 * - Adds 'dark' class for dark variants (for Tailwind dark: utilities)
 * - Adds theme-specific class (e.g., 'oceanic-dark') for CSS overrides
 */
function DarkModeSync() {
  const { resolvedTheme } = useTheme()

  React.useEffect(() => {
    const html = document.documentElement
    const isDark = resolvedTheme ? DARK_THEMES.includes(resolvedTheme) : false

    // Handle dark class
    if (isDark) {
      html.classList.add('dark')
    } else {
      html.classList.remove('dark')
    }

    // Remove all theme classes first
    ALL_THEMES.forEach(t => html.classList.remove(t))

    // Add current theme class for theme-specific CSS overrides
    if (resolvedTheme && ALL_THEMES.includes(resolvedTheme)) {
      html.classList.add(resolvedTheme)
    }
  }, [resolvedTheme])

  return null
}

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider {...props}>
      <DarkModeSync />
      {children}
    </NextThemesProvider>
  )
}
