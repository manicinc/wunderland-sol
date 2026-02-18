'use client'

/**
 * Pomodoro Sidebar Widget
 * @module components/quarry/ui/sidebar/PomodoroSidebarWidget
 *
 * Compact, always-visible Pomodoro timer for the sidebar.
 * Can be minimized to just show time, or expanded for controls.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Timer,
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  ChevronDown,
  ChevronUp,
  Coffee,
  Brain,
  Target,
  Settings,
} from 'lucide-react'
import { cn } from '@/lib/utils'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

type PomodoroMode = 'work' | 'short-break' | 'long-break'

interface PomodoroSettings {
  workDuration: number
  shortBreakDuration: number
  longBreakDuration: number
  sessionsUntilLongBreak: number
  autoStartBreaks: boolean
  autoStartWork: boolean
  soundEnabled: boolean
}

interface PomodoroSidebarWidgetProps {
  theme?: string
  className?: string
  defaultExpanded?: boolean
}

/* ═══════════════════════════════════════════════════════════════════════════
   STORAGE
═══════════════════════════════════════════════════════════════════════════ */

const SETTINGS_KEY = 'pomodoro-settings'
const SESSIONS_KEY = 'pomodoro-sessions'

const DEFAULT_SETTINGS: PomodoroSettings = {
  workDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  sessionsUntilLongBreak: 4,
  autoStartBreaks: false,
  autoStartWork: false,
  soundEnabled: true,
}

function loadSettings(): PomodoroSettings {
  if (typeof localStorage === 'undefined') return DEFAULT_SETTINGS
  try {
    const stored = localStorage.getItem(SETTINGS_KEY)
    return stored ? { ...DEFAULT_SETTINGS, ...JSON.parse(stored) } : DEFAULT_SETTINGS
  } catch {
    return DEFAULT_SETTINGS
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

export default function PomodoroSidebarWidget({
  theme = 'dark',
  className,
  defaultExpanded = false,
}: PomodoroSidebarWidgetProps) {
  const isDark = theme?.includes('dark')

  // State
  const [settings] = useState<PomodoroSettings>(loadSettings)
  const [mode, setMode] = useState<PomodoroMode>('work')
  const [timeRemaining, setTimeRemaining] = useState(settings.workDuration * 60)
  const [isRunning, setIsRunning] = useState(false)
  const [completedSessions, setCompletedSessions] = useState(0)
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Get duration for mode
  const getDuration = useCallback(
    (m: PomodoroMode) => {
      switch (m) {
        case 'work':
          return settings.workDuration * 60
        case 'short-break':
          return settings.shortBreakDuration * 60
        case 'long-break':
          return settings.longBreakDuration * 60
      }
    },
    [settings]
  )

  // Timer tick
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            handleTimerComplete()
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isRunning])

  // Handle timer complete
  const handleTimerComplete = useCallback(() => {
    setIsRunning(false)

    // Play sound
    if (settings.soundEnabled) {
      playNotificationSound()
    }

    // Record session
    if (mode === 'work') {
      const newCount = completedSessions + 1
      setCompletedSessions(newCount)

      // Determine next mode
      if (newCount % settings.sessionsUntilLongBreak === 0) {
        setMode('long-break')
        setTimeRemaining(settings.longBreakDuration * 60)
      } else {
        setMode('short-break')
        setTimeRemaining(settings.shortBreakDuration * 60)
      }

      if (settings.autoStartBreaks) {
        setIsRunning(true)
      }
    } else {
      setMode('work')
      setTimeRemaining(settings.workDuration * 60)

      if (settings.autoStartWork) {
        setIsRunning(true)
      }
    }
  }, [mode, settings, completedSessions])

  // Toggle timer
  const toggleTimer = useCallback(() => {
    setIsRunning((prev) => !prev)
  }, [])

  // Reset timer
  const resetTimer = useCallback(() => {
    setIsRunning(false)
    setTimeRemaining(getDuration(mode))
  }, [mode, getDuration])

  // Skip to next
  const skipToNext = useCallback(() => {
    setIsRunning(false)
    if (mode === 'work') {
      const newCount = completedSessions + 1
      if (newCount % settings.sessionsUntilLongBreak === 0) {
        setMode('long-break')
        setTimeRemaining(settings.longBreakDuration * 60)
      } else {
        setMode('short-break')
        setTimeRemaining(settings.shortBreakDuration * 60)
      }
    } else {
      setMode('work')
      setTimeRemaining(settings.workDuration * 60)
    }
  }, [mode, completedSessions, settings])

  // Format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Progress percentage
  const progress = 1 - timeRemaining / getDuration(mode)

  // Mode colors
  const getModeColor = (m: PomodoroMode) => {
    switch (m) {
      case 'work':
        return 'text-red-400'
      case 'short-break':
        return 'text-green-400'
      case 'long-break':
        return 'text-blue-400'
    }
  }

  const getModeBgColor = (m: PomodoroMode) => {
    switch (m) {
      case 'work':
        return 'bg-red-500'
      case 'short-break':
        return 'bg-green-500'
      case 'long-break':
        return 'bg-blue-500'
    }
  }

  const getModeIcon = (m: PomodoroMode) => {
    switch (m) {
      case 'work':
        return Brain
      case 'short-break':
        return Coffee
      case 'long-break':
        return Target
    }
  }

  const ModeIcon = getModeIcon(mode)

  return (
    <div
      className={cn(
        'border-b transition-all duration-200',
        isDark ? 'border-zinc-800 bg-zinc-900/50' : 'border-zinc-200 bg-zinc-50/50',
        className
      )}
    >
      {/* Header - Always Visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          'w-full flex items-center justify-between px-3 py-2',
          'transition-colors duration-200',
          isDark ? 'hover:bg-zinc-800/50' : 'hover:bg-zinc-100/50'
        )}
      >
        <div className="flex items-center gap-2">
          <div
            className={cn(
              'w-6 h-6 rounded-md flex items-center justify-center',
              isRunning ? getModeBgColor(mode) : isDark ? 'bg-zinc-800' : 'bg-zinc-200'
            )}
          >
            <Timer
              className={cn('w-3.5 h-3.5', isRunning ? 'text-white' : getModeColor(mode))}
            />
          </div>
          <div className="flex flex-col items-start">
            <span
              className={cn(
                'text-xs font-medium',
                isDark ? 'text-zinc-400' : 'text-zinc-600'
              )}
            >
              Pomodoro
            </span>
            <span
              className={cn(
                'text-sm font-mono font-bold tabular-nums',
                isRunning ? getModeColor(mode) : isDark ? 'text-white' : 'text-zinc-900'
              )}
            >
              {formatTime(timeRemaining)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Quick play/pause without expanding */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              toggleTimer()
            }}
            className={cn(
              'w-6 h-6 rounded-md flex items-center justify-center',
              'transition-all duration-200',
              isRunning
                ? isDark
                  ? 'bg-white/10 hover:bg-white/20'
                  : 'bg-black/10 hover:bg-black/15'
                : getModeColor(mode),
              isRunning ? '' : 'bg-current/10 hover:bg-current/20'
            )}
          >
            {isRunning ? (
              <Pause className={cn('w-3 h-3', isDark ? 'text-white' : 'text-zinc-800')} />
            ) : (
              <Play className={cn('w-3 h-3 ml-0.5', getModeColor(mode))} />
            )}
          </button>

          {isExpanded ? (
            <ChevronUp
              className={cn('w-4 h-4', isDark ? 'text-zinc-500' : 'text-zinc-400')}
            />
          ) : (
            <ChevronDown
              className={cn('w-4 h-4', isDark ? 'text-zinc-500' : 'text-zinc-400')}
            />
          )}
        </div>
      </button>

      {/* Expanded Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-3">
              {/* Progress bar */}
              <div className="relative h-1.5 rounded-full overflow-hidden bg-zinc-200 dark:bg-zinc-800">
                <motion.div
                  className={cn('absolute left-0 top-0 h-full rounded-full', getModeBgColor(mode))}
                  initial={{ width: 0 }}
                  animate={{ width: `${progress * 100}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>

              {/* Mode pills */}
              <div className="flex gap-1">
                {(['work', 'short-break', 'long-break'] as PomodoroMode[]).map((m) => {
                  const Icon = getModeIcon(m)
                  const isActive = mode === m
                  return (
                    <button
                      key={m}
                      onClick={() => {
                        if (!isRunning) {
                          setMode(m)
                          setTimeRemaining(getDuration(m))
                        }
                      }}
                      disabled={isRunning}
                      className={cn(
                        'flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md text-[10px] font-medium',
                        'transition-all duration-200',
                        isActive
                          ? isDark
                            ? 'bg-white/15 text-white'
                            : 'bg-black/10 text-zinc-900'
                          : isDark
                            ? 'text-zinc-500 hover:text-zinc-400'
                            : 'text-zinc-400 hover:text-zinc-500',
                        isRunning && 'opacity-50 cursor-not-allowed'
                      )}
                    >
                      <Icon className="w-3 h-3" />
                      <span className="hidden sm:inline">
                        {m === 'work' ? 'Focus' : m === 'short-break' ? 'Short' : 'Long'}
                      </span>
                    </button>
                  )
                })}
              </div>

              {/* Controls */}
              <div className="flex items-center justify-between">
                <button
                  onClick={resetTimer}
                  className={cn(
                    'p-1.5 rounded-md transition-all duration-200',
                    isDark
                      ? 'hover:bg-white/10 text-zinc-400'
                      : 'hover:bg-black/5 text-zinc-500'
                  )}
                  title="Reset"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={skipToNext}
                  className={cn(
                    'p-1.5 rounded-md transition-all duration-200',
                    isDark
                      ? 'hover:bg-white/10 text-zinc-400'
                      : 'hover:bg-black/5 text-zinc-500'
                  )}
                  title="Skip"
                >
                  <SkipForward className="w-3.5 h-3.5" />
                </button>

                <div
                  className={cn(
                    'text-[10px] font-medium',
                    isDark ? 'text-zinc-500' : 'text-zinc-400'
                  )}
                >
                  Session {completedSessions + 1}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════════════════════ */

function playNotificationSound(): void {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)

    oscillator.frequency.value = 800
    oscillator.type = 'sine'
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5)

    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + 0.5)
  } catch {
    // Ignore audio errors
  }
}





