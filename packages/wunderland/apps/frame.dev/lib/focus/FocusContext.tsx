'use client'

/**
 * Focus Context - Centralized state management for focus mode
 * @module lib/focus/FocusContext
 *
 * Provides:
 * - Widget visibility state (synced between sidebar and floating windows)
 * - Focus session tracking
 * - Analytics data collection
 */

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'

// ============================================================================
// TYPES
// ============================================================================

export type WidgetType =
  | 'pomodoro'
  | 'quick-capture'
  | 'stats'
  | 'ambience'
  | 'youtube'
  | 'clock'
  | 'ai-copilot'
  | 'tasks'
  | 'calendar'
  | 'writer'

export interface WidgetPosition {
  x: number
  y: number
}

export interface WidgetState {
  isOpen: boolean
  isMinimized: boolean
  position?: WidgetPosition
  size?: { width: number; height: number }
  zIndex: number
}

export interface FocusSessionData {
  id: string
  startedAt: Date
  endedAt?: Date
  mode: 'focus' | 'writing' | 'reading'
  writingMode?: 'wysiwyg' | 'typewriter'
  wordsWritten: number
  distractionCount: number
  soundscape?: string
  isDeepFocus: boolean
}

export interface FocusContextType {
  // Widget state
  widgets: Map<WidgetType, WidgetState>
  openWidget: (type: WidgetType, position?: WidgetPosition) => void
  closeWidget: (type: WidgetType) => void
  toggleWidget: (type: WidgetType) => void
  minimizeWidget: (type: WidgetType) => void
  restoreWidget: (type: WidgetType) => void
  isWidgetOpen: (type: WidgetType) => boolean
  bringToFront: (type: WidgetType) => void
  updateWidgetPosition: (type: WidgetType, position: WidgetPosition) => void

  // Focus session
  session: FocusSessionData | null
  startSession: (mode: FocusSessionData['mode']) => void
  endSession: () => void
  updateSession: (updates: Partial<FocusSessionData>) => void
  isInSession: boolean

  // Deep focus mode
  isDeepFocus: boolean
  setDeepFocus: (value: boolean) => void
  toggleDeepFocus: () => void

  // Distraction tracking
  recordDistraction: () => void
}

// ============================================================================
// STORAGE
// ============================================================================

const STORAGE_KEY = 'focus-widget-state'
const SESSION_STORAGE_KEY = 'focus-sessions'

function loadWidgetState(): Map<WidgetType, WidgetState> {
  if (typeof localStorage === 'undefined') return new Map()

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      return new Map(Object.entries(parsed) as [WidgetType, WidgetState][])
    }
  } catch {
    // Ignore
  }
  return new Map()
}

function saveWidgetState(widgets: Map<WidgetType, WidgetState>): void {
  if (typeof localStorage === 'undefined') return

  try {
    const obj = Object.fromEntries(widgets)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(obj))
  } catch {
    // Ignore
  }
}

function saveFocusSession(session: FocusSessionData): void {
  if (typeof localStorage === 'undefined') return

  try {
    const existing = JSON.parse(localStorage.getItem(SESSION_STORAGE_KEY) || '[]')
    existing.push({
      ...session,
      startedAt: session.startedAt.toISOString(),
      endedAt: session.endedAt?.toISOString(),
    })
    // Keep last 100 sessions
    const trimmed = existing.slice(-100)
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(trimmed))
  } catch {
    // Ignore
  }
}

// ============================================================================
// CONTEXT
// ============================================================================

const FocusContext = createContext<FocusContextType | null>(null)

export function useFocusContext() {
  const context = useContext(FocusContext)
  if (!context) {
    throw new Error('useFocusContext must be used within a FocusProvider')
  }
  return context
}

// Optional version that returns null if not in provider (for components that may be used outside focus mode)
export function useFocusContextOptional() {
  return useContext(FocusContext)
}

// ============================================================================
// PROVIDER
// ============================================================================

export interface FocusProviderProps {
  children: React.ReactNode
  initialDeepFocus?: boolean
}

export function FocusProvider({ children, initialDeepFocus = false }: FocusProviderProps) {
  // Widget state
  const [widgets, setWidgets] = useState<Map<WidgetType, WidgetState>>(() => loadWidgetState())
  const [maxZIndex, setMaxZIndex] = useState(100)

  // Focus session state
  const [session, setSession] = useState<FocusSessionData | null>(null)
  const [isDeepFocus, setIsDeepFocus] = useState(initialDeepFocus)

  // Track distraction (tab visibility changes)
  const wasVisibleRef = useRef(true)

  // Save widget state on change
  useEffect(() => {
    saveWidgetState(widgets)
  }, [widgets])

  // Track page visibility for distraction counting
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && wasVisibleRef.current && session) {
        // User switched away from tab during session
        recordDistraction()
      }
      wasVisibleRef.current = !document.hidden
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [session])

  // Listen for widget open events (backward compatibility)
  useEffect(() => {
    const handleOpenWidget = (e: CustomEvent<string>) => {
      const widgetType = e.detail as WidgetType
      openWidget(widgetType)
    }

    window.addEventListener('open-widget', handleOpenWidget as EventListener)
    return () => window.removeEventListener('open-widget', handleOpenWidget as EventListener)
  }, [])

  // Widget actions
  const openWidget = useCallback((type: WidgetType, position?: WidgetPosition) => {
    // Update local state
    setWidgets(prev => {
      const newWidgets = new Map(prev)
      const existing = newWidgets.get(type)
      const newZIndex = maxZIndex + 1
      setMaxZIndex(newZIndex)

      newWidgets.set(type, {
        isOpen: true,
        isMinimized: false,
        position: position ?? existing?.position,
        size: existing?.size,
        zIndex: newZIndex,
      })
      return newWidgets
    })

    // Dispatch event for FloatingWindowManager to spawn the widget
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('open-widget', { detail: type }))
    }
  }, [maxZIndex])

  const closeWidget = useCallback((type: WidgetType) => {
    setWidgets(prev => {
      const newWidgets = new Map(prev)
      const existing = newWidgets.get(type)
      if (existing) {
        newWidgets.set(type, { ...existing, isOpen: false })
      }
      return newWidgets
    })
  }, [])

  const toggleWidget = useCallback((type: WidgetType) => {
    const widget = widgets.get(type)
    if (widget?.isOpen) {
      closeWidget(type)
    } else {
      openWidget(type)
    }
  }, [widgets, openWidget, closeWidget])

  const minimizeWidget = useCallback((type: WidgetType) => {
    setWidgets(prev => {
      const newWidgets = new Map(prev)
      const existing = newWidgets.get(type)
      if (existing) {
        newWidgets.set(type, { ...existing, isMinimized: true })
      }
      return newWidgets
    })
  }, [])

  const restoreWidget = useCallback((type: WidgetType) => {
    setWidgets(prev => {
      const newWidgets = new Map(prev)
      const existing = newWidgets.get(type)
      if (existing) {
        newWidgets.set(type, { ...existing, isMinimized: false })
      }
      return newWidgets
    })
  }, [])

  const isWidgetOpen = useCallback((type: WidgetType) => {
    return widgets.get(type)?.isOpen ?? false
  }, [widgets])

  const bringToFront = useCallback((type: WidgetType) => {
    setWidgets(prev => {
      const newWidgets = new Map(prev)
      const existing = newWidgets.get(type)
      if (existing) {
        const newZIndex = maxZIndex + 1
        setMaxZIndex(newZIndex)
        newWidgets.set(type, { ...existing, zIndex: newZIndex })
      }
      return newWidgets
    })
  }, [maxZIndex])

  const updateWidgetPosition = useCallback((type: WidgetType, position: WidgetPosition) => {
    setWidgets(prev => {
      const newWidgets = new Map(prev)
      const existing = newWidgets.get(type)
      if (existing) {
        newWidgets.set(type, { ...existing, position })
      }
      return newWidgets
    })
  }, [])

  // Session actions
  const startSession = useCallback((mode: FocusSessionData['mode']) => {
    const newSession: FocusSessionData = {
      id: crypto.randomUUID(),
      startedAt: new Date(),
      mode,
      wordsWritten: 0,
      distractionCount: 0,
      isDeepFocus,
    }
    setSession(newSession)
  }, [isDeepFocus])

  const endSession = useCallback(() => {
    if (session) {
      const completedSession = {
        ...session,
        endedAt: new Date(),
      }
      saveFocusSession(completedSession)
      setSession(null)
    }
  }, [session])

  const updateSession = useCallback((updates: Partial<FocusSessionData>) => {
    setSession(prev => prev ? { ...prev, ...updates } : null)
  }, [])

  const recordDistraction = useCallback(() => {
    setSession(prev => prev ? { ...prev, distractionCount: prev.distractionCount + 1 } : null)
  }, [])

  const toggleDeepFocus = useCallback(() => {
    setIsDeepFocus(prev => !prev)
  }, [])

  const value: FocusContextType = {
    widgets,
    openWidget,
    closeWidget,
    toggleWidget,
    minimizeWidget,
    restoreWidget,
    isWidgetOpen,
    bringToFront,
    updateWidgetPosition,
    session,
    startSession,
    endSession,
    updateSession,
    isInSession: session !== null,
    isDeepFocus,
    setDeepFocus: setIsDeepFocus,
    toggleDeepFocus,
    recordDistraction,
  }

  return (
    <FocusContext.Provider value={value}>
      {children}
    </FocusContext.Provider>
  )
}

export default FocusContext
