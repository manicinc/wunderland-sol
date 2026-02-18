'use client'

/**
 * Focus Right Panel
 * @module components/quarry/ui/meditate/FocusRightPanel
 * 
 * Right sidebar panel for the Focus/Meditate page featuring:
 * - Tabbed interface: Timer | Stats | AI Copilot
 * - Embedded widgets (can be popped out to floating)
 * - Persistent tab selection
 */

import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Timer,
  BarChart3,
  Sparkles,
  ExternalLink,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ThemeName } from '@/types/theme'
import { isDarkTheme } from '@/types/theme'

// Lazy load heavy widgets
const PomodoroWidget = lazy(() => import('./widgets/PomodoroWidget'))
const StatsWidget = lazy(() => import('./widgets/StatsWidget'))
const AICopilotWidget = lazy(() => import('./widgets/AICopilotWidget'))

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

type PanelTab = 'timer' | 'stats' | 'ai'

interface FocusRightPanelProps {
  theme: ThemeName
  onPopOut?: (tab: PanelTab) => void
  onNavigate?: (path: string) => void
  className?: string
}

const TABS: { id: PanelTab; label: string; icon: React.ElementType }[] = [
  { id: 'timer', label: 'Timer', icon: Timer },
  { id: 'stats', label: 'Stats', icon: BarChart3 },
  { id: 'ai', label: 'AI', icon: Sparkles },
]

const STORAGE_KEY = 'focus-right-panel-tab'

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

export default function FocusRightPanel({
  theme,
  onPopOut,
  onNavigate,
  className,
}: FocusRightPanelProps) {
  const isDark = isDarkTheme(theme)
  const [activeTab, setActiveTab] = useState<PanelTab>('timer')

  // Load saved tab preference
  useEffect(() => {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved && ['timer', 'stats', 'ai'].includes(saved)) {
        setActiveTab(saved as PanelTab)
      }
    }
  }, [])

  // Save tab preference
  const handleTabChange = useCallback((tab: PanelTab) => {
    setActiveTab(tab)
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, tab)
    }
  }, [])

  // Handle navigation for AI widget
  const handleNavigate = useCallback((path: string) => {
    if (onNavigate) {
      onNavigate(path)
    } else if (typeof window !== 'undefined') {
      window.location.href = path
    }
  }, [onNavigate])

  // Loading fallback
  const LoadingFallback = (
    <div className="flex items-center justify-center h-48">
      <Loader2 className={cn(
        'w-6 h-6 animate-spin',
        isDark ? 'text-zinc-500' : 'text-zinc-400'
      )} />
    </div>
  )

  return (
    <div className={cn(
      'flex flex-col h-full overflow-hidden',
      isDark ? 'bg-zinc-900/50' : 'bg-zinc-50/50',
      className
    )}>
      {/* Tab Header */}
      <div className={cn(
        'flex-shrink-0 flex items-center gap-1 px-2 py-2 border-b',
        isDark ? 'border-zinc-800 bg-zinc-900/80' : 'border-zinc-200 bg-white/80'
      )}>
        {TABS.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id

          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium transition-all',
                isActive
                  ? isDark
                    ? 'bg-zinc-700/80 text-white'
                    : 'bg-zinc-200 text-zinc-900'
                  : isDark
                    ? 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
                    : 'text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100'
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          )
        })}

        {/* Pop-out button */}
        {onPopOut && (
          <button
            onClick={() => onPopOut(activeTab)}
            className={cn(
              'p-2 rounded-lg transition-colors',
              isDark
                ? 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'
                : 'text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100'
            )}
            title="Pop out to floating window"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="h-full overflow-auto"
          >
            <Suspense fallback={LoadingFallback}>
              {activeTab === 'timer' && (
                <div className="p-2">
                  <PomodoroWidget theme={theme} />
                </div>
              )}
              {activeTab === 'stats' && (
                <div className="h-full">
                  <StatsWidget theme={theme} />
                </div>
              )}
              {activeTab === 'ai' && (
                <div className="h-full">
                  <AICopilotWidget theme={theme} onNavigate={handleNavigate} />
                </div>
              )}
            </Suspense>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Panel Footer - contextual help */}
      <div className={cn(
        'flex-shrink-0 px-3 py-2 border-t',
        isDark ? 'border-zinc-800' : 'border-zinc-200'
      )}>
        <div className={cn(
          'text-[10px] text-center',
          isDark ? 'text-zinc-600' : 'text-zinc-400'
        )}>
          {activeTab === 'timer' && 'Press Space to start/pause timer'}
          {activeTab === 'stats' && 'Track your productivity over time'}
          {activeTab === 'ai' && 'Ask AI for focus tips and motivation'}
        </div>
      </div>
    </div>
  )
}

