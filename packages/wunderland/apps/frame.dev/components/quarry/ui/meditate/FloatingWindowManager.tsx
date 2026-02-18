'use client'

/**
 * Floating Window Manager
 * @module components/quarry/ui/meditate/FloatingWindowManager
 * 
 * Manages multiple floating windows with z-index stacking,
 * widget spawning, and persistence.
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react'
import { AnimatePresence } from 'framer-motion'
import FloatingWindow from './FloatingWindow'
import WidgetDock from './WidgetDock'
import type { ThemeName } from '@/types/theme'
import type { SoundscapeType } from '@/lib/audio/ambienceSounds'

// Widget components
import PomodoroWidget from './widgets/PomodoroWidget'
import QuickCaptureWidgetMeditate from './widgets/QuickCaptureWidgetMeditate'
import StatsWidget from './widgets/StatsWidget'
import AmbienceWidget from './widgets/AmbienceWidget'
import YouTubeWidget from './widgets/YouTubeWidget'
import ClockWidget from './widgets/ClockWidget'
import AICopilotWidget from './widgets/AICopilotWidget'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

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

export interface WindowState {
  id: string
  type: WidgetType
  title: string
  position: { x: number; y: number }
  size: { width: number; height: number }
  isMinimized: boolean
  zIndex: number
}

export interface FloatingWindowManagerProps {
  theme: ThemeName
  isDeepFocus: boolean
  onNavigate: (path: string) => void
  soundscape: SoundscapeType
  isPlaying: boolean
  analyser: AnalyserNode | null
  /** Hide the widget dock (when sidebars are visible) */
  hideDock?: boolean
}

/* ═══════════════════════════════════════════════════════════════════════════
   WIDGET DEFINITIONS
═══════════════════════════════════════════════════════════════════════════ */

export interface WidgetDefinition {
  type: WidgetType
  title: string
  icon: string
  defaultSize: { width: number; height: number }
  minSize: { width: number; height: number }
  maxSize: { width: number; height: number }
}

export const WIDGET_DEFINITIONS: Record<WidgetType, WidgetDefinition> = {
  pomodoro: {
    type: 'pomodoro',
    title: 'Pomodoro Timer',
    icon: '⏱️',
    defaultSize: { width: 320, height: 400 },
    minSize: { width: 280, height: 320 },
    maxSize: { width: 500, height: 600 },
  },
  'quick-capture': {
    type: 'quick-capture',
    title: 'Quick Capture',
    icon: '📝',
    defaultSize: { width: 350, height: 300 },
    minSize: { width: 280, height: 200 },
    maxSize: { width: 500, height: 500 },
  },
  stats: {
    type: 'stats',
    title: 'Productivity Stats',
    icon: '📊',
    defaultSize: { width: 400, height: 350 },
    minSize: { width: 300, height: 250 },
    maxSize: { width: 600, height: 500 },
  },
  ambience: {
    type: 'ambience',
    title: 'Ambience Controls',
    icon: '🎧',
    defaultSize: { width: 350, height: 400 },
    minSize: { width: 280, height: 300 },
    maxSize: { width: 500, height: 600 },
  },
  youtube: {
    type: 'youtube',
    title: 'YouTube Music',
    icon: '📺',
    defaultSize: { width: 450, height: 400 },
    minSize: { width: 350, height: 300 },
    maxSize: { width: 700, height: 600 },
  },
  clock: {
    type: 'clock',
    title: 'Clock',
    icon: '🕐',
    defaultSize: { width: 200, height: 200 },
    minSize: { width: 150, height: 150 },
    maxSize: { width: 300, height: 300 },
  },
  'ai-copilot': {
    type: 'ai-copilot',
    title: 'AI Copilot',
    icon: '✨',
    defaultSize: { width: 400, height: 500 },
    minSize: { width: 320, height: 400 },
    maxSize: { width: 600, height: 700 },
  },
  tasks: {
    type: 'tasks',
    title: 'Tasks',
    icon: '✅',
    defaultSize: { width: 320, height: 400 },
    minSize: { width: 250, height: 300 },
    maxSize: { width: 500, height: 600 },
  },
  calendar: {
    type: 'calendar',
    title: 'Calendar',
    icon: '📅',
    defaultSize: { width: 320, height: 350 },
    minSize: { width: 280, height: 300 },
    maxSize: { width: 500, height: 500 },
  },
}

/* ═══════════════════════════════════════════════════════════════════════════
   STORAGE
═══════════════════════════════════════════════════════════════════════════ */

const STORAGE_KEY = 'meditate-windows'

function loadWindows(): WindowState[] {
  if (typeof localStorage === 'undefined') return getDefaultWindows()
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch {
    // Ignore
  }
  return getDefaultWindows()
}

function saveWindows(windows: WindowState[]): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(windows))
  } catch {
    // Ignore
  }
}

function getDefaultWindows(): WindowState[] {
  // Get viewport dimensions (with fallbacks for SSR)
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1400
  const vh = typeof window !== 'undefined' ? window.innerHeight : 900

  return [
    // Clock - top left, compact
    {
      id: 'clock-default',
      type: 'clock',
      title: 'Clock',
      position: { x: 40, y: 40 },
      size: { width: 200, height: 220 },
      isMinimized: false,
      zIndex: 10,
    },
    // Pomodoro Timer - left side, prominent
    {
      id: 'pomodoro-default',
      type: 'pomodoro',
      title: 'Pomodoro Timer',
      position: { x: 40, y: 280 },
      size: { width: 320, height: 420 },
      isMinimized: false,
      zIndex: 11,
    },
    // Stats - top right area
    {
      id: 'stats-default',
      type: 'stats',
      title: 'Productivity Stats',
      position: { x: Math.max(400, vw - 440), y: 40 },
      size: { width: 400, height: 340 },
      isMinimized: false,
      zIndex: 12,
    },
    // Quick Capture - right side, below stats
    {
      id: 'capture-default',
      type: 'quick-capture',
      title: 'Quick Capture',
      position: { x: Math.max(420, vw - 400), y: 400 },
      size: { width: 360, height: 280 },
      isMinimized: false,
      zIndex: 13,
    },
  ]
}

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

export default function FloatingWindowManager({
  theme,
  isDeepFocus,
  onNavigate,
  soundscape,
  isPlaying,
  analyser,
  hideDock = false,
}: FloatingWindowManagerProps) {
  const [windows, setWindows] = useState<WindowState[]>(() => loadWindows())
  const [nextZIndex, setNextZIndex] = useState(100)

  // Save windows on change
  const updateWindows = useCallback((updater: (prev: WindowState[]) => WindowState[]) => {
    setWindows((prev) => {
      const next = updater(prev)
      saveWindows(next)
      return next
    })
  }, [])

  // Focus window (bring to front)
  const focusWindow = useCallback((id: string) => {
    setNextZIndex((prev) => prev + 1)
    updateWindows((prev) =>
      prev.map((w) =>
        w.id === id ? { ...w, zIndex: nextZIndex + 1 } : w
      )
    )
  }, [nextZIndex, updateWindows])

  // Close window
  const closeWindow = useCallback((id: string) => {
    updateWindows((prev) => prev.filter((w) => w.id !== id))
  }, [updateWindows])

  // Minimize window
  const minimizeWindow = useCallback((id: string) => {
    updateWindows((prev) =>
      prev.map((w) =>
        w.id === id ? { ...w, isMinimized: true } : w
      )
    )
  }, [updateWindows])

  // Restore window
  const restoreWindow = useCallback((id: string) => {
    setNextZIndex((prev) => prev + 1)
    updateWindows((prev) =>
      prev.map((w) =>
        w.id === id ? { ...w, isMinimized: false, zIndex: nextZIndex + 1 } : w
      )
    )
  }, [nextZIndex, updateWindows])

  // Update window position
  const updatePosition = useCallback((id: string, position: { x: number; y: number }) => {
    updateWindows((prev) =>
      prev.map((w) =>
        w.id === id ? { ...w, position } : w
      )
    )
  }, [updateWindows])

  // Update window size
  const updateSize = useCallback((id: string, size: { width: number; height: number }) => {
    updateWindows((prev) =>
      prev.map((w) =>
        w.id === id ? { ...w, size } : w
      )
    )
  }, [updateWindows])

  // Spawn new window (or focus existing)
  const spawnWindow = useCallback((type: WidgetType) => {
    // Check if a window of this type already exists - if so, focus it
    const existing = windows.find((w) => w.type === type && !w.isMinimized)
    if (existing) {
      focusWindow(existing.id)
      return
    }

    // Check if minimized - if so, restore it
    const minimized = windows.find((w) => w.type === type && w.isMinimized)
    if (minimized) {
      restoreWindow(minimized.id)
      return
    }

    const def = WIDGET_DEFINITIONS[type]
    const existingCount = windows.filter((w) => w.type === type).length
    const offset = existingCount * 30

    const newWindow: WindowState = {
      id: `${type}-${Date.now()}`,
      type,
      title: def.title,
      position: { x: 100 + offset, y: 100 + offset },
      size: def.defaultSize,
      isMinimized: false,
      zIndex: nextZIndex + 1,
    }

    setNextZIndex((prev) => prev + 1)
    updateWindows((prev) => [...prev, newWindow])
  }, [windows, nextZIndex, updateWindows, focusWindow, restoreWindow])

  // Listen for open-widget events from other components
  useEffect(() => {
    const handleOpenWidget = (e: CustomEvent<string>) => {
      const widgetType = e.detail as WidgetType
      if (WIDGET_DEFINITIONS[widgetType]) {
        spawnWindow(widgetType)
      }
    }

    window.addEventListener('open-widget', handleOpenWidget as EventListener)
    return () => {
      window.removeEventListener('open-widget', handleOpenWidget as EventListener)
    }
  }, [spawnWindow])

  // Get focused window ID
  const focusedWindowId = useMemo(() => {
    const visible = windows.filter((w) => !w.isMinimized)
    if (visible.length === 0) return null
    return visible.reduce((a, b) => (a.zIndex > b.zIndex ? a : b)).id
  }, [windows])

  // Render widget content
  const renderWidgetContent = useCallback((type: WidgetType) => {
    switch (type) {
      case 'pomodoro':
        return <PomodoroWidget theme={theme} />
      case 'quick-capture':
        return <QuickCaptureWidgetMeditate theme={theme} onNavigate={onNavigate} />
      case 'stats':
        return <StatsWidget theme={theme} />
      case 'ambience':
        return (
          <AmbienceWidget
            theme={theme}
            soundscape={soundscape}
            isPlaying={isPlaying}
            analyser={analyser}
          />
        )
      case 'youtube':
        return <YouTubeWidget theme={theme} />
      case 'clock':
        return <ClockWidget theme={theme} />
      case 'ai-copilot':
        return <AICopilotWidget theme={theme} onNavigate={onNavigate} />
      default:
        return <div className="p-4 text-center opacity-50">Widget not implemented</div>
    }
  }, [theme, soundscape, isPlaying, analyser, onNavigate])

  return (
    <>
      {/* Floating Windows */}
      <AnimatePresence>
        {windows.map((window) => {
          if (window.isMinimized) return null
          const def = WIDGET_DEFINITIONS[window.type]
          
          return (
            <FloatingWindow
              key={window.id}
              id={window.id}
              title={window.title}
              icon={<span>{def.icon}</span>}
              initialPosition={window.position}
              initialSize={window.size}
              minSize={def.minSize}
              maxSize={def.maxSize}
              isFocused={window.id === focusedWindowId}
              isMinimized={window.isMinimized}
              theme={theme}
              zIndex={window.zIndex}
              onClose={() => closeWindow(window.id)}
              onMinimize={() => minimizeWindow(window.id)}
              onFocus={() => focusWindow(window.id)}
              onPositionChange={(pos) => updatePosition(window.id, pos)}
              onSizeChange={(size) => updateSize(window.id, size)}
            >
              {renderWidgetContent(window.type)}
            </FloatingWindow>
          )
        })}
      </AnimatePresence>

      {/* Widget Dock - hidden when sidebars are visible */}
      {!hideDock && (
        <WidgetDock
          theme={theme}
          minimizedWindows={windows.filter((w) => w.isMinimized)}
          onSpawnWidget={spawnWindow}
          onRestoreWindow={restoreWindow}
        />
      )}
    </>
  )
}


