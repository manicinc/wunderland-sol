'use client'

/**
 * Focus Page
 * @module app/quarry/focus/FocusPage
 * 
 * The ultimate productivity and focus workspace featuring:
 * - Deep focus fullscreen mode with minimal distractions
 * - Animated background slideshows matched to soundscapes
 * - Floating terminal-like widget windows
 * - Full ambience controls (sounds, music, YouTube)
 * - Pomodoro timer with project/task linking
 * - Quick capture to inbox with voice recording
 * - AI copilot integration
 * - Productivity stats and streak tracking
 * - Left sidebar with session history and quick actions
 * - Right panel with tabbed Timer/Stats/AI interface
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Maximize2,
  Minimize2,
  Moon,
  Sun,
  Settings,
  Headphones,
  Timer,
  MessageSquare,
  Plus,
  LayoutGrid,
  X,
  ChevronDown,
  Volume2,
} from 'lucide-react'
import QuarryPageLayout from '@/components/quarry/QuarryPageLayout'
import { cn } from '@/lib/utils'
import type { ThemeName } from '@/types/theme'
import { isDarkTheme, getThemeCategory } from '@/types/theme'

// Meditate-specific components
import BackgroundSlideshow from '@/components/quarry/ui/meditate/BackgroundSlideshow'
import FloatingWindowManager from '@/components/quarry/ui/meditate/FloatingWindowManager'
import MeditateToolbar, { type ToolbarPosition } from '@/components/quarry/ui/meditate/MeditateToolbar'
import DeepFocusOverlay from '@/components/quarry/ui/meditate/DeepFocusOverlay'
import StatusBar, { type StatusBarPosition } from '@/components/quarry/ui/meditate/StatusBar'
import BackgroundPicker from '@/components/quarry/ui/meditate/BackgroundPicker'
import FocusLeftSidebar from '@/components/quarry/ui/meditate/FocusLeftSidebar'
import FocusRightPanel from '@/components/quarry/ui/meditate/FocusRightPanel'

// Hooks
import { useAmbienceSounds, type SoundscapeType } from '@/lib/audio/ambienceSounds'
import { getSlideshowSettings } from '@/lib/meditate/backgroundCatalog'
import { FocusProvider, useFocusContext } from '@/lib/focus/FocusContext'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

interface FocusPageProps {
  className?: string
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

// Inner component that uses FocusContext
function FocusPageInner({ className }: FocusPageProps) {
  // Get focus context for centralized widget management
  const focusContext = useFocusContext()

  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const currentTheme = (theme || 'dark') as ThemeName
  const isDark = isDarkTheme(currentTheme)

  // Deep focus state
  const [isDeepFocus, setIsDeepFocus] = useState(false)
  const [isInteracting, setIsInteracting] = useState(false)
  const [showToolbar, setShowToolbar] = useState(true)
  
  // Nav hidden state
  const [navHidden, setNavHidden] = useState(false)
  
  // Bar visibility state
  const [statusBarHidden, setStatusBarHidden] = useState(false)
  const [statusBarPosition, setStatusBarPosition] = useState<StatusBarPosition>(() => {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('focus-statusbar-position')
      if (saved === 'top-left' || saved === 'top-center' || saved === 'top-right') {
        return saved
      }
    }
    return 'top-center'
  })
  const [toolbarHidden, setToolbarHidden] = useState(false)
  const [toolbarPosition, setToolbarPosition] = useState<ToolbarPosition>(() => {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('focus-toolbar-position')
      if (saved === 'bottom-left' || saved === 'bottom-center' || saved === 'bottom-right') {
        return saved
      }
    }
    return 'bottom-center'
  })

  // Persist status bar position
  const handleStatusBarPositionChange = useCallback((position: StatusBarPosition) => {
    setStatusBarPosition(position)
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('focus-statusbar-position', position)
    }
  }, [])

  // Persist toolbar position
  const handleToolbarPositionChange = useCallback((position: ToolbarPosition) => {
    setToolbarPosition(position)
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('focus-toolbar-position', position)
    }
  }, [])

  // Session tracking state
  const [sessionMinutes, setSessionMinutes] = useState(0)
  const [pomodorosCompleted, setPomodorosCompleted] = useState(0)
  const [streakDays, setStreakDays] = useState(0)

  // UI state for pickers
  const [showBackgroundPicker, setShowBackgroundPicker] = useState(false)

  // Load session stats from localStorage
  useEffect(() => {
    if (typeof localStorage === 'undefined') return

    try {
      const sessions = JSON.parse(localStorage.getItem('pomodoro-sessions') || '[]')
      const workSessions = sessions.filter((s: any) => s.mode === 'work')

      // Today's stats
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const todaySessions = workSessions.filter((s: any) => new Date(s.completedAt) >= today)
      const todayMinutes = Math.round(todaySessions.reduce((sum: number, s: any) => sum + s.duration, 0) / 60)

      setSessionMinutes(todayMinutes)
      setPomodorosCompleted(todaySessions.length)

      // Calculate streak
      let streak = 0
      const checkDate = new Date(today)
      while (true) {
        const dayStart = new Date(checkDate)
        const dayEnd = new Date(checkDate.getTime() + 24 * 60 * 60 * 1000)
        const hasSession = workSessions.some((s: any) => {
          const date = new Date(s.completedAt)
          return date >= dayStart && date < dayEnd
        })
        if (!hasSession && checkDate < today) break
        if (hasSession) streak++
        checkDate.setDate(checkDate.getDate() - 1)
        if (streak > 365) break
      }
      setStreakDays(streak)
    } catch {
      // Ignore errors
    }
  }, [])

  // Ambience state
  const {
    play,
    stop,
    toggle,
    isPlaying,
    soundscape,
    setSoundscape,
    getAnalyser,
    volume,
    setVolume,
  } = useAmbienceSounds()

  // Slideshow settings
  const slideshowSettings = useMemo(() => getSlideshowSettings(), [])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + Shift + F: Toggle deep focus
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'f') {
        e.preventDefault()
        setIsDeepFocus((prev) => !prev)
      }
      // Cmd/Ctrl + Shift + H: Toggle navbar
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'h') {
        e.preventDefault()
        setNavHidden((prev) => !prev)
      }
      // Escape: Exit deep focus
      if (e.key === 'Escape' && isDeepFocus) {
        setIsDeepFocus(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isDeepFocus])

  // Track interaction for background blur
  useEffect(() => {
    let timeout: NodeJS.Timeout

    const handleInteraction = () => {
      setIsInteracting(true)
      setShowToolbar(true)
      clearTimeout(timeout)
      timeout = setTimeout(() => {
        setIsInteracting(false)
        if (isDeepFocus) {
          setShowToolbar(false)
        }
      }, 3000)
    }

    if (isDeepFocus) {
      window.addEventListener('mousemove', handleInteraction)
      window.addEventListener('mousedown', handleInteraction)
      window.addEventListener('keydown', handleInteraction)
    }

    return () => {
      clearTimeout(timeout)
      window.removeEventListener('mousemove', handleInteraction)
      window.removeEventListener('mousedown', handleInteraction)
      window.removeEventListener('keydown', handleInteraction)
    }
  }, [isDeepFocus])

  // Handle navigation (for QuarryPageLayout)
  const handleNavigate = useCallback((path: string) => {
    router.push(path)
  }, [router])

  // Render content
  const renderContent = () => (
    <div className="relative w-full h-full min-h-screen overflow-hidden">
      {/* Background Slideshow */}
      <BackgroundSlideshow
        soundscape={soundscape}
        isPlaying={isPlaying}
        isInteracting={isInteracting}
        blurOnInteract={slideshowSettings.blurOnInteract}
        blurIntensity={slideshowSettings.blurIntensity}
        interval={slideshowSettings.interval}
        transition={slideshowSettings.transition}
        transitionDuration={slideshowSettings.transitionDuration}
        className="absolute inset-0"
      />

      {/* Floating Windows Container */}
      <FloatingWindowManager
        theme={currentTheme}
        isDeepFocus={isDeepFocus}
        onNavigate={handleNavigate}
        soundscape={soundscape}
        isPlaying={isPlaying}
        analyser={getAnalyser()}
        hideDock={!isDeepFocus}
      />

      {/* Deep Focus Overlay */}
      <AnimatePresence>
        {isDeepFocus && (
          <DeepFocusOverlay
            isVisible={showToolbar}
            onExit={() => setIsDeepFocus(false)}
            theme={currentTheme}
          />
        )}
      </AnimatePresence>

      {/* Status Bar (top) */}
      <AnimatePresence>
        {(!isDeepFocus || showToolbar) && (
          <StatusBar
            theme={currentTheme}
            soundscape={soundscape}
            isPlaying={isPlaying}
            sessionMinutes={sessionMinutes}
            streakDays={streakDays}
            pomodorosCompleted={pomodorosCompleted}
            isHidden={statusBarHidden}
            onToggleHidden={setStatusBarHidden}
            position={statusBarPosition}
            onPositionChange={handleStatusBarPositionChange}
          />
        )}
      </AnimatePresence>

      {/* Toolbar (bottom) */}
      <AnimatePresence>
        {(!isDeepFocus || showToolbar) && (
          <MeditateToolbar
            theme={currentTheme}
            isDeepFocus={isDeepFocus}
            onToggleDeepFocus={() => setIsDeepFocus((prev) => !prev)}
            soundscape={soundscape}
            onSoundscapeChange={setSoundscape}
            isPlaying={isPlaying}
            onTogglePlay={toggle}
            volume={volume}
            onVolumeChange={setVolume}
            onOpenTimer={() => focusContext.openWidget('pomodoro')}
            onOpenBackgrounds={() => setShowBackgroundPicker(true)}
            onOpenWidgets={() => focusContext.openWidget('clock')}
            isHidden={toolbarHidden}
            onToggleHidden={setToolbarHidden}
            position={toolbarPosition}
            onPositionChange={handleToolbarPositionChange}
          />
        )}
      </AnimatePresence>

      {/* Background Picker Modal */}
      <BackgroundPicker
        isOpen={showBackgroundPicker}
        onClose={() => setShowBackgroundPicker(false)}
        theme={currentTheme}
        soundscape={soundscape}
      />
    </div>
  )

  // Deep focus mode: render without layout
  if (isDeepFocus) {
    return (
      <div className={cn('fixed inset-0 z-[100] bg-black', className)}>
        {renderContent()}
      </div>
    )
  }

  // Handle quick capture - use context instead of events
  const handleQuickCapture = useCallback(() => {
    focusContext.openWidget('quick-capture')
  }, [focusContext])

  // Render left sidebar content
  const leftSidebarContent = (
    <FocusLeftSidebar
      theme={currentTheme}
      soundscape={soundscape}
      onSoundscapeChange={setSoundscape}
      isPlaying={isPlaying}
      onTogglePlay={toggle}
      volume={volume}
      onVolumeChange={setVolume}
      onOpenTimer={() => focusContext.openWidget('pomodoro')}
      onQuickCapture={handleQuickCapture}
    />
  )

  // Render right panel content
  const rightPanelContent = (
    <FocusRightPanel
      theme={currentTheme}
      onNavigate={handleNavigate}
      onPopOut={(tab) => {
        // Pop out widget to floating window using context
        const widgetMap: Record<string, 'pomodoro' | 'stats' | 'ai-copilot'> = {
          timer: 'pomodoro',
          stats: 'stats',
          ai: 'ai-copilot',
        }
        focusContext.openWidget(widgetMap[tab])
      }}
    />
  )

  // Normal mode: render with QuarryPageLayout with both sidebars
  return (
    <QuarryPageLayout
      theme={currentTheme}
      showRightPanel={true}
      rightPanelContent={rightPanelContent}
      leftPanelContent={leftSidebarContent}
      rightPanelWidth={280}
      leftPanelWidth={240}
      defaultRightPanelCollapsed={false}
      defaultSidebarCollapsed={false}
      hideNavbar={navHidden}
      onToggleNavbar={setNavHidden}
      className={className}
    >
      {renderContent()}
    </QuarryPageLayout>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   EXPORTED COMPONENT - Wrapped with FocusProvider
═══════════════════════════════════════════════════════════════════════════ */

export default function FocusPage({ className }: FocusPageProps) {
  return (
    <FocusProvider>
      <FocusPageInner className={className} />
    </FocusProvider>
  )
}


