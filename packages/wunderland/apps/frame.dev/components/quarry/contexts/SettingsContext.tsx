/**
 * Settings Context
 *
 * Provides app-wide access to settings modal control with deep linking support.
 * Use the useSettings hook to open settings from anywhere in the app.
 *
 * @module codex/contexts/SettingsContext
 */

'use client'

import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import QuarrySettingsModal, {
  type SettingsTab,
  type IntegrationSection,
} from '../ui/quarry-core/QuarrySettingsModal'

// ============================================================================
// TYPES
// ============================================================================

export interface SettingsDeepLink {
  tab: SettingsTab
  subTab?: string
}

interface SettingsContextValue {
  /** Whether the settings modal is open */
  isOpen: boolean
  /** Current active tab */
  currentTab: SettingsTab
  /** Current active sub-tab (for nested sections) */
  currentSubTab?: string
  /** Open settings modal, optionally to a specific tab/sub-tab */
  openSettings: (link?: SettingsDeepLink) => void
  /** Close settings modal */
  closeSettings: () => void
  /** Open directly to integrations calendar */
  openCalendarSettings: () => void
  /** Open directly to API keys */
  openApiKeySettings: () => void
}

// ============================================================================
// CONTEXT
// ============================================================================

const SettingsContext = createContext<SettingsContextValue | null>(null)

// ============================================================================
// PROVIDER
// ============================================================================

interface SettingsProviderProps {
  children: ReactNode
}

export function SettingsProvider({ children }: SettingsProviderProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [currentTab, setCurrentTab] = useState<SettingsTab>('profile')
  const [currentSubTab, setCurrentSubTab] = useState<string | undefined>()

  const openSettings = useCallback((link?: SettingsDeepLink) => {
    if (link) {
      setCurrentTab(link.tab)
      setCurrentSubTab(link.subTab)
    } else {
      // Reset to default when opening without a link
      setCurrentTab('profile')
      setCurrentSubTab(undefined)
    }
    setIsOpen(true)
  }, [])

  const closeSettings = useCallback(() => {
    setIsOpen(false)
  }, [])

  const openCalendarSettings = useCallback(() => {
    openSettings({ tab: 'integrations', subTab: 'calendar' })
  }, [openSettings])

  const openApiKeySettings = useCallback(() => {
    openSettings({ tab: 'integrations', subTab: 'apikeys' })
  }, [openSettings])

  const value: SettingsContextValue = {
    isOpen,
    currentTab,
    currentSubTab,
    openSettings,
    closeSettings,
    openCalendarSettings,
    openApiKeySettings,
  }

  return (
    <SettingsContext.Provider value={value}>
      {children}
      <QuarrySettingsModal
        isOpen={isOpen}
        onClose={closeSettings}
        initialTab={currentTab}
        initialSubTab={currentSubTab}
      />
    </SettingsContext.Provider>
  )
}

// ============================================================================
// HOOK
// ============================================================================

export function useSettings(): SettingsContextValue {
  const context = useContext(SettingsContext)
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider')
  }
  return context
}

// ============================================================================
// EXPORTS
// ============================================================================

export { SettingsContext }
export type { SettingsTab, IntegrationSection }
