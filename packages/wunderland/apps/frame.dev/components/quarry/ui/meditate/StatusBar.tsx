'use client'

/**
 * Status Bar
 * @module components/quarry/ui/meditate/StatusBar
 * 
 * Top status bar showing time, date, session stats, and system status.
 * Holographic glass styling with subtle animations.
 * Always centered with hide/expand toggle.
 */

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Clock,
  Calendar,
  Flame,
  Timer,
  Volume2,
  VolumeX,
  Wifi,
  Battery,
  Zap,
  Minus,
  GripHorizontal,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ThemeName } from '@/types/theme'
import { isDarkTheme, getThemeCategory } from '@/types/theme'
import type { SoundscapeType } from '@/lib/audio/ambienceSounds'
import { SOUNDSCAPE_INFO } from '@/lib/audio/ambienceSounds'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

export type StatusBarPosition = 'top-left' | 'top-center' | 'top-right'

export interface StatusBarProps {
  theme: ThemeName
  soundscape: SoundscapeType
  isPlaying: boolean
  sessionMinutes?: number
  streakDays?: number
  pomodorosCompleted?: number
  isHidden?: boolean
  onToggleHidden?: (hidden: boolean) => void
  /** Position for snap-to-edges */
  position?: StatusBarPosition
  onPositionChange?: (position: StatusBarPosition) => void
  className?: string
}

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

export default function StatusBar({
  theme,
  soundscape,
  isPlaying,
  sessionMinutes = 0,
  streakDays = 0,
  pomodorosCompleted = 0,
  isHidden = false,
  onToggleHidden,
  position = 'top-center',
  onPositionChange,
  className,
}: StatusBarProps) {
  const isDark = isDarkTheme(theme)
  const themeCategory = getThemeCategory(theme)
  const [time, setTime] = useState(new Date())
  const [isDragging, setIsDragging] = useState(false)

  // Update time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setTime(new Date())
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  // Format time
  const timeString = time.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  })
  const dateString = time.toLocaleDateString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  })

  // Get accent color based on theme
  const accentColor = getAccentColor(themeCategory, isDark)

  // Handle drag end - snap to nearest position based on screen location
  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: { point: { x: number; y: number } }) => {
    setIsDragging(false)

    // Get viewport width and calculate snap zones (thirds of screen)
    const vw = window.innerWidth
    const cursorX = info.point.x

    // Determine snap position based on where cursor is on screen
    let newPosition: StatusBarPosition
    if (cursorX < vw * 0.33) {
      newPosition = 'top-left'
    } else if (cursorX > vw * 0.67) {
      newPosition = 'top-right'
    } else {
      newPosition = 'top-center'
    }

    if (newPosition !== position) {
      onPositionChange?.(newPosition)
    }
  }

  // Get position classes based on current position
  const getPositionClasses = () => {
    switch (position) {
      case 'top-left':
        return 'left-4'
      case 'top-right':
        return 'right-4'
      default:
        return 'left-1/2 -translate-x-1/2'
    }
  }

  // Expand button when hidden - floating minimal icon always on top
  if (isHidden) {
    return (
      <motion.button
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -20, opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={() => onToggleHidden?.(false)}
        className={cn(
          'fixed top-3 left-1/2 -translate-x-1/2 z-[200]',
          'w-8 h-8 rounded-full flex items-center justify-center',
          'backdrop-blur-xl border transition-all duration-200',
          'hover:scale-110 active:scale-95',
          isDark
            ? 'bg-zinc-900/70 border-white/15 text-white/70 hover:text-white hover:border-purple-500/50'
            : 'bg-white/80 border-black/10 text-slate-500 hover:text-slate-800 hover:border-purple-400/50',
          className
        )}
        style={{
          boxShadow: isDark
            ? '0 4px 20px rgba(0,0,0,0.4), 0 0 20px rgba(139,92,246,0.15)'
            : '0 4px 20px rgba(0,0,0,0.15)',
        }}
        title="Show status bar"
      >
        <GripHorizontal className="w-4 h-4" />
      </motion.button>
    )
  }

  return (
    <motion.div
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -20, opacity: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.3}
      onDragStart={() => setIsDragging(true)}
      onDragEnd={handleDragEnd}
      whileDrag={{ scale: 1.02, cursor: 'grabbing' }}
      className={cn(
        'fixed top-4 z-[200]',
        getPositionClasses(),
        isDragging ? 'cursor-grabbing' : 'cursor-grab',
        className
      )}
    >
      <div
        className={cn(
          'flex items-center gap-3 px-3 py-1.5 rounded-full',
          'backdrop-blur-3xl',
          'border',
          'transition-all duration-300'
        )}
        style={{
          background: isDark
            ? 'linear-gradient(135deg, rgba(15,15,30,0.45) 0%, rgba(30,20,45,0.4) 50%, rgba(20,15,35,0.45) 100%)'
            : 'linear-gradient(135deg, rgba(255,255,255,0.55) 0%, rgba(248,250,252,0.5) 50%, rgba(255,255,255,0.55) 100%)',
          borderColor: isDark
            ? 'rgba(139,92,246,0.2)'
            : 'rgba(0,0,0,0.06)',
          boxShadow: isDark
            ? `0 0 30px rgba(139,92,246,0.1), 0 4px 16px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.05)`
            : `0 4px 16px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.6)`,
        }}
      >
        {/* Time & Date */}
        <div className="flex items-center gap-2">
          <div className={cn(
            'flex items-center gap-1.5',
            isDark ? 'text-white' : 'text-slate-800'
          )}>
            <Clock className="w-3.5 h-3.5 opacity-60" />
            <span className="text-sm font-medium tabular-nums">{timeString}</span>
          </div>
          <div className={cn(
            'flex items-center gap-1.5',
            isDark ? 'text-white/60' : 'text-slate-500'
          )}>
            <Calendar className="w-3.5 h-3.5 opacity-60" />
            <span className="text-xs">{dateString}</span>
          </div>
        </div>

        {/* Divider */}
        <div
          className="w-px h-4"
          style={{
            background: isDark
              ? 'linear-gradient(180deg, transparent, rgba(139,92,246,0.4), transparent)'
              : 'linear-gradient(180deg, transparent, rgba(0,0,0,0.15), transparent)'
          }}
        />

        {/* Session Stats */}
        <div className="flex items-center gap-3">
          {/* Focus Time */}
          <div className={cn(
            'flex items-center gap-1',
            isDark ? 'text-cyan-400' : 'text-cyan-600'
          )}>
            <Timer className="w-3.5 h-3.5" />
            <span className="text-xs font-medium tabular-nums">
              {formatMinutes(sessionMinutes)}
            </span>
          </div>

          {/* Pomodoros */}
          <div className={cn(
            'flex items-center gap-1',
            isDark ? 'text-rose-400' : 'text-rose-500'
          )}>
            <Zap className="w-3.5 h-3.5" />
            <span className="text-xs font-medium tabular-nums">
              {pomodorosCompleted}
            </span>
          </div>

          {/* Streak */}
          {streakDays > 0 && (
            <div className={cn(
              'flex items-center gap-1',
              isDark ? 'text-amber-400' : 'text-amber-500'
            )}>
              <Flame className="w-3.5 h-3.5" />
              <span className="text-xs font-medium tabular-nums">
                {streakDays}d
              </span>
            </div>
          )}
        </div>

        {/* Divider */}
        <div
          className="w-px h-4"
          style={{
            background: isDark
              ? 'linear-gradient(180deg, transparent, rgba(139,92,246,0.4), transparent)'
              : 'linear-gradient(180deg, transparent, rgba(0,0,0,0.15), transparent)'
          }}
        />

        {/* Soundscape Indicator */}
        <div className={cn(
          'flex items-center gap-2',
          isDark ? 'text-white/70' : 'text-slate-600'
        )}>
          {isPlaying ? (
            <>
              <Volume2 className="w-3.5 h-3.5" style={{ color: accentColor }} />
              <span className="text-xs">
                {SOUNDSCAPE_INFO[soundscape]?.emoji} {soundscape.replace('-', ' ')}
              </span>
              {/* Audio visualizer dots */}
              <div className="flex items-end gap-0.5 h-3">
                {[0.6, 1, 0.4, 0.8, 0.5].map((height, i) => (
                  <motion.div
                    key={i}
                    className="w-0.5 rounded-full"
                    style={{ backgroundColor: accentColor }}
                    animate={{
                      height: [`${height * 12}px`, `${height * 4}px`, `${height * 12}px`],
                    }}
                    transition={{
                      duration: 0.8,
                      repeat: Infinity,
                      delay: i * 0.1,
                      ease: 'easeInOut',
                    }}
                  />
                ))}
              </div>
            </>
          ) : (
            <>
              <VolumeX className="w-3.5 h-3.5 opacity-50" />
              <span className="text-xs opacity-50">Paused</span>
            </>
          )}
        </div>

        {/* Hide Button */}
        <button
          onClick={() => onToggleHidden?.(true)}
          className={cn(
            'ml-1 p-1 rounded-full transition-all duration-200',
            'hover:scale-110 active:scale-95',
            isDark
              ? 'text-white/40 hover:text-white hover:bg-white/10'
              : 'text-slate-400 hover:text-slate-700 hover:bg-black/5'
          )}
          title="Hide status bar"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Holographic shimmer effect */}
      <div
        className="absolute inset-0 rounded-full pointer-events-none overflow-hidden"
        style={{
          background: isDark
            ? 'linear-gradient(90deg, transparent 0%, rgba(139,92,246,0.1) 50%, transparent 100%)'
            : 'linear-gradient(90deg, transparent 0%, rgba(99,102,241,0.05) 50%, transparent 100%)',
          animation: 'shimmer 3s ease-in-out infinite',
        }}
      />

      {/* CSS for shimmer animation */}
      <style jsx>{`
        @keyframes shimmer {
          0%, 100% { transform: translateX(-100%); opacity: 0; }
          50% { transform: translateX(100%); opacity: 1; }
        }
      `}</style>
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════════════════════ */

function formatMinutes(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`
  }
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours}h ${mins}m`
}

function getAccentColor(category: string, isDark: boolean): string {
  switch (category) {
    case 'terminal':
      return isDark ? '#22c55e' : '#f59e0b'
    case 'sepia':
      return '#d4a574'
    case 'oceanic':
      return isDark ? '#22d3ee' : '#0e7490'
    default:
      return isDark ? '#a78bfa' : '#8b5cf6'
  }
}
