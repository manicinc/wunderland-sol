'use client'

/**
 * Deep Focus Overlay
 * @module components/quarry/ui/meditate/DeepFocusOverlay
 * 
 * Minimal overlay for deep focus mode with exit controls.
 * Shows on edge hover or interaction.
 */

import React from 'react'
import { motion } from 'framer-motion'
import { X, Minimize2, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ThemeName } from '@/types/theme'
import { isDarkTheme } from '@/types/theme'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

export interface DeepFocusOverlayProps {
  /** Whether overlay controls are visible */
  isVisible: boolean
  /** Exit deep focus callback */
  onExit: () => void
  /** Current theme */
  theme: ThemeName
  /** Custom className */
  className?: string
}

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

export default function DeepFocusOverlay({
  isVisible,
  onExit,
  theme,
  className,
}: DeepFocusOverlayProps) {
  const isDark = isDarkTheme(theme)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: isVisible ? 1 : 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        'fixed inset-0 pointer-events-none z-[110]',
        className
      )}
    >
      {/* Top bar - exit button */}
      <motion.div
        initial={{ y: -20 }}
        animate={{ y: isVisible ? 0 : -20 }}
        className={cn(
          'absolute top-4 right-4 pointer-events-auto',
          'flex items-center gap-2'
        )}
      >
        <button
          onClick={onExit}
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-lg',
            'backdrop-blur-md transition-all duration-200',
            isDark
              ? 'bg-white/10 hover:bg-white/20 text-white/80 hover:text-white'
              : 'bg-black/10 hover:bg-black/20 text-black/80 hover:text-black',
            'border',
            isDark ? 'border-white/10' : 'border-black/10'
          )}
        >
          <Minimize2 className="w-4 h-4" />
          <span className="text-sm font-medium">Exit Focus</span>
          <kbd className={cn(
            'px-1.5 py-0.5 rounded text-xs',
            isDark ? 'bg-white/10' : 'bg-black/10'
          )}>
            Esc
          </kbd>
        </button>
      </motion.div>

      {/* Center - Current time (subtle) */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: isVisible ? 0.6 : 0 }}
        className={cn(
          'absolute top-4 left-1/2 -translate-x-1/2',
          'pointer-events-none',
          isDark ? 'text-white' : 'text-black'
        )}
      >
        <CurrentTime />
      </motion.div>

      {/* Bottom hint - move mouse to show controls */}
      {!isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 0.4, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          className={cn(
            'absolute bottom-4 left-1/2 -translate-x-1/2',
            'text-xs pointer-events-none',
            isDark ? 'text-white/40' : 'text-black/40'
          )}
        >
          Move mouse to show controls
        </motion.div>
      )}
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   CURRENT TIME
═══════════════════════════════════════════════════════════════════════════ */

function CurrentTime() {
  const [time, setTime] = React.useState(new Date())

  React.useEffect(() => {
    const interval = setInterval(() => {
      setTime(new Date())
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex items-center gap-2 text-sm font-medium">
      <Clock className="w-4 h-4" />
      {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
    </div>
  )
}





