'use client'

/**
 * Widget Dock
 * @module components/quarry/ui/meditate/WidgetDock
 * 
 * Dock for spawning new widgets and restoring minimized windows.
 * Located at the left side of the screen.
 */

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus,
  Timer,
  Mic,
  BarChart3,
  Headphones,
  Youtube,
  Clock,
  Sparkles,
  CheckSquare,
  Calendar,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ThemeName } from '@/types/theme'
import { isDarkTheme } from '@/types/theme'
import type { WidgetType, WindowState, WIDGET_DEFINITIONS } from './FloatingWindowManager'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

export interface WidgetDockProps {
  theme: ThemeName
  minimizedWindows: WindowState[]
  onSpawnWidget: (type: WidgetType) => void
  onRestoreWindow: (id: string) => void
}

/* ═══════════════════════════════════════════════════════════════════════════
   WIDGET ICONS
═══════════════════════════════════════════════════════════════════════════ */

const WIDGET_ICONS: Record<WidgetType, React.ElementType> = {
  pomodoro: Timer,
  'quick-capture': Mic,
  stats: BarChart3,
  ambience: Headphones,
  youtube: Youtube,
  clock: Clock,
  'ai-copilot': Sparkles,
  tasks: CheckSquare,
  calendar: Calendar,
}

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

export default function WidgetDock({
  theme,
  minimizedWindows,
  onSpawnWidget,
  onRestoreWindow,
}: WidgetDockProps) {
  const isDark = isDarkTheme(theme)
  const [isExpanded, setIsExpanded] = useState(false)

  const availableWidgets: WidgetType[] = [
    'pomodoro',
    'quick-capture',
    'stats',
    'ambience',
    'youtube',
    'clock',
    'ai-copilot',
  ]

  return (
    <motion.div
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className={cn(
        'fixed left-4 top-1/2 -translate-y-1/2 z-[90]',
        'flex flex-col items-center gap-2'
      )}
    >
      {/* Dock container */}
      <div
        className={cn(
          'flex flex-col items-center gap-1.5 p-2 rounded-2xl',
          'backdrop-blur-xl shadow-2xl',
          isDark
            ? 'bg-zinc-900/80 border border-white/10'
            : 'bg-white/80 border border-black/10'
        )}
      >
        {/* Add widget button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center',
            'transition-all duration-200',
            isExpanded
              ? isDark
                ? 'bg-purple-500/30 text-purple-400'
                : 'bg-purple-500/20 text-purple-600'
              : isDark
                ? 'hover:bg-white/10 text-white/70'
                : 'hover:bg-black/5 text-black/70'
          )}
          title="Add Widget"
        >
          <Plus className={cn(
            'w-5 h-5 transition-transform duration-200',
            isExpanded && 'rotate-45'
          )} />
        </button>

        {/* Divider */}
        <div className={cn(
          'w-6 h-px',
          isDark ? 'bg-white/10' : 'bg-black/10'
        )} />

        {/* Minimized windows */}
        {minimizedWindows.map((window) => {
          const Icon = WIDGET_ICONS[window.type]
          return (
            <button
              key={window.id}
              onClick={() => onRestoreWindow(window.id)}
              className={cn(
                'w-10 h-10 rounded-xl flex items-center justify-center',
                'transition-all duration-200',
                isDark
                  ? 'hover:bg-white/10 text-white/70 hover:text-white'
                  : 'hover:bg-black/5 text-black/70 hover:text-black',
                'relative'
              )}
              title={`Restore ${window.title}`}
            >
              <Icon className="w-5 h-5" />
              {/* Minimized indicator */}
              <div className={cn(
                'absolute bottom-1 left-1/2 -translate-x-1/2',
                'w-1 h-1 rounded-full',
                isDark ? 'bg-yellow-400' : 'bg-yellow-500'
              )} />
            </button>
          )
        })}
      </div>

      {/* Widget picker popup */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, x: -10, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -10, scale: 0.95 }}
            className={cn(
              'absolute left-full ml-3 top-0',
              'p-3 rounded-xl backdrop-blur-xl shadow-2xl',
              isDark
                ? 'bg-zinc-900/95 border border-white/10'
                : 'bg-white/95 border border-black/10'
            )}
          >
            <div className="grid grid-cols-3 gap-2 min-w-[200px]">
              {availableWidgets.map((type) => {
                const Icon = WIDGET_ICONS[type]
                const label = type.replace('-', ' ').replace(/^\w/, (c) => c.toUpperCase())
                
                return (
                  <button
                    key={type}
                    onClick={() => {
                      onSpawnWidget(type)
                      setIsExpanded(false)
                    }}
                    className={cn(
                      'flex flex-col items-center gap-1 p-3 rounded-lg',
                      'transition-all duration-200',
                      isDark
                        ? 'hover:bg-white/10 text-white/70 hover:text-white'
                        : 'hover:bg-black/5 text-black/70 hover:text-black'
                    )}
                  >
                    <Icon className="w-6 h-6" />
                    <span className="text-[10px] font-medium text-center leading-tight">
                      {label}
                    </span>
                  </button>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}





