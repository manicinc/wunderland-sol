/**
 * useDashboardConfig Hook
 *
 * Manages dashboard configuration persistence with custom preset support.
 * @module components/quarry/dashboard/hooks/useDashboardConfig
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import type { DashboardConfig, WidgetLayout, WidgetId, CustomPreset } from '../types'
import { DEFAULT_DASHBOARD_CONFIG, DASHBOARD_CONFIG_KEY } from '../types'

/** Maximum number of custom presets allowed */
const MAX_CUSTOM_PRESETS = 5

interface UseDashboardConfigReturn {
  /** Current config */
  config: DashboardConfig
  /** Loading state */
  isLoading: boolean
  /** Update layout for a widget */
  updateLayout: (id: WidgetId, updates: Partial<WidgetLayout>) => void
  /** Update all layouts */
  setLayouts: (layouts: WidgetLayout[]) => void
  /** Toggle widget visibility */
  toggleWidget: (id: WidgetId) => void
  /** Toggle welcome sidebar */
  toggleWelcomeSidebar: () => void
  /** Toggle replace homepage */
  toggleReplaceHomepage: () => void
  /** Reset to defaults */
  resetToDefaults: () => void
  /** Get visible widgets */
  visibleWidgets: WidgetLayout[]
  /** Get hidden widgets */
  hiddenWidgets: WidgetLayout[]
  /** Save current layout as custom preset */
  saveCurrentAsPreset: (name: string) => boolean
  /** Delete a custom preset */
  deleteCustomPreset: (id: string) => void
  /** Apply a custom preset */
  applyCustomPreset: (id: string) => void
  /** Custom presets */
  customPresets: CustomPreset[]
  /** Check if can save more presets */
  canSaveMorePresets: boolean
}

/**
 * Load config from localStorage
 */
function loadConfig(): DashboardConfig {
  if (typeof window === 'undefined') return DEFAULT_DASHBOARD_CONFIG

  try {
    const stored = localStorage.getItem(DASHBOARD_CONFIG_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      // Merge with defaults to handle new widgets
      return {
        ...DEFAULT_DASHBOARD_CONFIG,
        ...parsed,
        layouts: mergeLayouts(DEFAULT_DASHBOARD_CONFIG.layouts, parsed.layouts || []),
      }
    }
  } catch (e) {
    console.error('[useDashboardConfig] Failed to load config:', e)
  }

  return DEFAULT_DASHBOARD_CONFIG
}

/**
 * Merge saved layouts with defaults (handles new widgets)
 */
function mergeLayouts(defaults: WidgetLayout[], saved: WidgetLayout[]): WidgetLayout[] {
  const savedMap = new Map(saved.map((l) => [l.id, l]))

  return defaults.map((defaultLayout) => {
    const savedLayout = savedMap.get(defaultLayout.id)
    return savedLayout ? { ...defaultLayout, ...savedLayout } : defaultLayout
  })
}

/**
 * Save config to localStorage
 */
function saveConfig(config: DashboardConfig): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(DASHBOARD_CONFIG_KEY, JSON.stringify({
      ...config,
      updatedAt: new Date().toISOString(),
    }))
  } catch (e) {
    console.error('[useDashboardConfig] Failed to save config:', e)
  }
}

/**
 * Hook for managing dashboard configuration
 */
export function useDashboardConfig(): UseDashboardConfigReturn {
  const [config, setConfig] = useState<DashboardConfig>(DEFAULT_DASHBOARD_CONFIG)
  const [isLoading, setIsLoading] = useState(true)

  // Load config on mount
  useEffect(() => {
    setConfig(loadConfig())
    setIsLoading(false)
  }, [])

  // Save config when it changes
  useEffect(() => {
    if (!isLoading) {
      saveConfig(config)
    }
  }, [config, isLoading])

  const updateLayout = useCallback((id: WidgetId, updates: Partial<WidgetLayout>) => {
    setConfig((prev) => ({
      ...prev,
      layouts: prev.layouts.map((layout) =>
        layout.id === id ? { ...layout, ...updates } : layout
      ),
    }))
  }, [])

  const setLayouts = useCallback((layouts: WidgetLayout[]) => {
    setConfig((prev) => ({
      ...prev,
      layouts,
    }))
  }, [])

  const toggleWidget = useCallback((id: WidgetId) => {
    setConfig((prev) => ({
      ...prev,
      layouts: prev.layouts.map((layout) =>
        layout.id === id ? { ...layout, visible: !layout.visible } : layout
      ),
    }))
  }, [])

  const toggleWelcomeSidebar = useCallback(() => {
    setConfig((prev) => ({
      ...prev,
      showWelcomeSidebar: !prev.showWelcomeSidebar,
    }))
  }, [])

  const toggleReplaceHomepage = useCallback(() => {
    setConfig((prev) => ({
      ...prev,
      replaceHomepage: !prev.replaceHomepage,
    }))
  }, [])

  const resetToDefaults = useCallback(() => {
    setConfig((prev) => ({
      ...DEFAULT_DASHBOARD_CONFIG,
      customPresets: prev.customPresets, // Preserve custom presets
    }))
  }, [])

  const saveCurrentAsPreset = useCallback((name: string): boolean => {
    const currentPresets = config.customPresets || []

    if (currentPresets.length >= MAX_CUSTOM_PRESETS) {
      return false
    }

    const newPreset: CustomPreset = {
      id: `custom-${Date.now()}`,
      name: name.trim() || `My Layout ${currentPresets.length + 1}`,
      layouts: config.layouts.map((l) => ({ ...l })), // Deep copy
      createdAt: new Date().toISOString(),
    }

    setConfig((prev) => ({
      ...prev,
      customPresets: [...(prev.customPresets || []), newPreset],
    }))

    return true
  }, [config.layouts, config.customPresets])

  const deleteCustomPreset = useCallback((id: string) => {
    setConfig((prev) => ({
      ...prev,
      customPresets: (prev.customPresets || []).filter((p) => p.id !== id),
    }))
  }, [])

  const applyCustomPreset = useCallback((id: string) => {
    const preset = (config.customPresets || []).find((p) => p.id === id)
    if (preset) {
      setConfig((prev) => ({
        ...prev,
        layouts: preset.layouts.map((l) => ({ ...l })), // Deep copy
      }))
    }
  }, [config.customPresets])

  const visibleWidgets = config.layouts.filter((l) => l.visible)
  const hiddenWidgets = config.layouts.filter((l) => !l.visible)
  const customPresets = config.customPresets || []
  const canSaveMorePresets = customPresets.length < MAX_CUSTOM_PRESETS

  return {
    config,
    isLoading,
    updateLayout,
    setLayouts,
    toggleWidget,
    toggleWelcomeSidebar,
    toggleReplaceHomepage,
    resetToDefaults,
    visibleWidgets,
    hiddenWidgets,
    saveCurrentAsPreset,
    deleteCustomPreset,
    applyCustomPreset,
    customPresets,
    canSaveMorePresets,
  }
}

export default useDashboardConfig
