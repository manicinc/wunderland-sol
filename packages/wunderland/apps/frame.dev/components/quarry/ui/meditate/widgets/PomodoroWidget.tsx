'use client'

/**
 * Pomodoro Timer Widget
 * @module components/quarry/ui/meditate/widgets/PomodoroWidget
 * 
 * Full-featured Pomodoro timer with:
 * - Work/Break/Long Break modes
 * - Project/Task linking
 * - Session history and stats
 * - Customizable durations
 * - Sound notifications
 */

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { motion } from 'framer-motion'
import {
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  Settings,
  Coffee,
  Brain,
  Target,
  ChevronDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ThemeName } from '@/types/theme'
import { isDarkTheme, getThemeCategory } from '@/types/theme'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

type PomodoroMode = 'work' | 'short-break' | 'long-break'

interface PomodoroSettings {
  workDuration: number // minutes
  shortBreakDuration: number
  longBreakDuration: number
  sessionsUntilLongBreak: number
  autoStartBreaks: boolean
  autoStartWork: boolean
  soundEnabled: boolean
}

interface PomodoroSession {
  id: string
  mode: PomodoroMode
  duration: number // seconds actually worked
  completedAt: string
  projectId?: string
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

function saveSettings(settings: PomodoroSettings): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  }
}

function loadSessions(): PomodoroSession[] {
  if (typeof localStorage === 'undefined') return []
  try {
    const stored = localStorage.getItem(SESSIONS_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

function saveSessions(sessions: PomodoroSession[]): void {
  if (typeof localStorage !== 'undefined') {
    // Keep last 1000 sessions
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions.slice(-1000)))
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

interface PomodoroWidgetProps {
  theme: ThemeName
}

export default function PomodoroWidget({ theme }: PomodoroWidgetProps) {
  const isDark = isDarkTheme(theme)
  const themeCategory = getThemeCategory(theme)

  // State
  const [settings, setSettings] = useState<PomodoroSettings>(loadSettings)
  const [mode, setMode] = useState<PomodoroMode>('work')
  const [timeRemaining, setTimeRemaining] = useState(settings.workDuration * 60)
  const [isRunning, setIsRunning] = useState(false)
  const [completedSessions, setCompletedSessions] = useState(0)
  const [showSettings, setShowSettings] = useState(false)
  const [sessions] = useState<PomodoroSession[]>(() => loadSessions())

  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const startTimeRef = useRef<number>(0)

  // Get duration for mode
  const getDuration = useCallback((m: PomodoroMode) => {
    switch (m) {
      case 'work':
        return settings.workDuration * 60
      case 'short-break':
        return settings.shortBreakDuration * 60
      case 'long-break':
        return settings.longBreakDuration * 60
    }
  }, [settings])

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
      const session: PomodoroSession = {
        id: Date.now().toString(),
        mode,
        duration: getDuration(mode),
        completedAt: new Date().toISOString(),
      }
      const newSessions = [...sessions, session]
      saveSessions(newSessions)
      
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
      // Break complete
      setMode('work')
      setTimeRemaining(settings.workDuration * 60)
      
      if (settings.autoStartWork) {
        setIsRunning(true)
      }
    }
  }, [mode, settings, completedSessions, sessions, getDuration])

  // Toggle timer
  const toggleTimer = useCallback(() => {
    if (!isRunning) {
      startTimeRef.current = Date.now()
    }
    setIsRunning((prev) => !prev)
  }, [isRunning])

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
    <div className="flex flex-col h-full p-4">
      {/* Mode Selector */}
      <div className="flex items-center justify-center gap-2 mb-4">
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
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm',
                'transition-all duration-200',
                isActive
                  ? isDark
                    ? 'bg-white/15 text-white'
                    : 'bg-black/10 text-black'
                  : isDark
                    ? 'text-white/50 hover:text-white/70'
                    : 'text-black/50 hover:text-black/70',
                isRunning && 'opacity-50 cursor-not-allowed'
              )}
            >
              <Icon className="w-4 h-4" />
              <span className="capitalize">{m.replace('-', ' ')}</span>
            </button>
          )
        })}
      </div>

      {/* Timer Display */}
      <div className="flex-1 flex flex-col items-center justify-center">
        {/* Circular Progress with Holographic Glow */}
        <div className="relative w-48 h-48">
          {/* Glow effect behind the ring */}
          <div 
            className="absolute inset-0 rounded-full blur-xl opacity-30"
            style={{
              background: mode === 'work' 
                ? 'radial-gradient(circle, rgba(248,113,113,0.6) 0%, transparent 70%)' 
                : mode === 'short-break'
                  ? 'radial-gradient(circle, rgba(74,222,128,0.6) 0%, transparent 70%)'
                  : 'radial-gradient(circle, rgba(96,165,250,0.6) 0%, transparent 70%)',
            }}
          />
          
          <svg className="w-full h-full -rotate-90 relative z-10" viewBox="0 0 100 100">
            {/* Outer glow ring */}
            <circle
              cx="50"
              cy="50"
              r="46"
              fill="none"
              stroke={mode === 'work' ? 'rgba(248,113,113,0.2)' : mode === 'short-break' ? 'rgba(74,222,128,0.2)' : 'rgba(96,165,250,0.2)'}
              strokeWidth="1"
            />
            {/* Background circle */}
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}
              strokeWidth="8"
            />
            {/* Progress circle with gradient */}
            <defs>
              <linearGradient id={`progress-gradient-${mode}`} x1="0%" y1="0%" x2="100%" y2="100%">
                {mode === 'work' && (
                  <>
                    <stop offset="0%" stopColor="#f87171" />
                    <stop offset="50%" stopColor="#fb923c" />
                    <stop offset="100%" stopColor="#f87171" />
                  </>
                )}
                {mode === 'short-break' && (
                  <>
                    <stop offset="0%" stopColor="#4ade80" />
                    <stop offset="50%" stopColor="#34d399" />
                    <stop offset="100%" stopColor="#4ade80" />
                  </>
                )}
                {mode === 'long-break' && (
                  <>
                    <stop offset="0%" stopColor="#60a5fa" />
                    <stop offset="50%" stopColor="#818cf8" />
                    <stop offset="100%" stopColor="#60a5fa" />
                  </>
                )}
              </linearGradient>
            </defs>
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke={`url(#progress-gradient-${mode})`}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${progress * 283} 283`}
              className="transition-all duration-1000"
              style={{
                filter: 'drop-shadow(0 0 6px currentColor)',
              }}
            />
            {/* Inner highlight ring */}
            <circle
              cx="50"
              cy="50"
              r="38"
              fill="none"
              stroke={isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'}
              strokeWidth="1"
            />
          </svg>

          {/* Time display */}
          <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
            <ModeIcon className={cn('w-6 h-6 mb-2', getModeColor(mode))} style={{ filter: 'drop-shadow(0 0 8px currentColor)' }} />
            <div
              className={cn(
                'text-4xl font-mono font-bold tabular-nums',
                isDark ? 'text-white' : 'text-slate-800'
              )}
              style={{
                textShadow: isDark ? '0 0 20px rgba(255,255,255,0.3)' : 'none',
              }}
            >
              {formatTime(timeRemaining)}
            </div>
            <div className={cn(
              'text-xs mt-1 capitalize font-medium',
              isDark ? 'text-white/60' : 'text-black/60'
            )}>
              {mode.replace('-', ' ')}
            </div>
          </div>
        </div>

        {/* Controls with holographic styling */}
        <div className="flex items-center gap-4 mt-6">
          <button
            onClick={resetTimer}
            className={cn(
              'w-11 h-11 rounded-full flex items-center justify-center',
              'transition-all duration-200 border',
              isDark
                ? 'border-white/10 hover:border-white/20 hover:bg-white/10 text-white/60 hover:text-white/80'
                : 'border-black/10 hover:border-black/15 hover:bg-black/5 text-black/50 hover:text-black/70'
            )}
          >
            <RotateCcw className="w-5 h-5" />
          </button>

          <button
            onClick={toggleTimer}
            className={cn(
              'w-16 h-16 rounded-full flex items-center justify-center',
              'transition-all duration-300 border-2',
              'hover:scale-105 active:scale-95'
            )}
            style={{
              background: isRunning 
                ? (isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)')
                : mode === 'work'
                  ? 'linear-gradient(135deg, rgba(248,113,113,0.3) 0%, rgba(251,146,60,0.3) 100%)'
                  : mode === 'short-break'
                    ? 'linear-gradient(135deg, rgba(74,222,128,0.3) 0%, rgba(52,211,153,0.3) 100%)'
                    : 'linear-gradient(135deg, rgba(96,165,250,0.3) 0%, rgba(129,140,248,0.3) 100%)',
              borderColor: isRunning
                ? (isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)')
                : mode === 'work'
                  ? 'rgba(248,113,113,0.5)'
                  : mode === 'short-break'
                    ? 'rgba(74,222,128,0.5)'
                    : 'rgba(96,165,250,0.5)',
              boxShadow: isRunning
                ? 'none'
                : mode === 'work'
                  ? '0 0 20px rgba(248,113,113,0.3), inset 0 1px 0 rgba(255,255,255,0.1)'
                  : mode === 'short-break'
                    ? '0 0 20px rgba(74,222,128,0.3), inset 0 1px 0 rgba(255,255,255,0.1)'
                    : '0 0 20px rgba(96,165,250,0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
              color: isDark ? 'white' : (isRunning ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.8)'),
            }}
          >
            {isRunning ? (
              <Pause className="w-7 h-7" />
            ) : (
              <Play className="w-7 h-7 ml-1" />
            )}
          </button>

          <button
            onClick={skipToNext}
            className={cn(
              'w-11 h-11 rounded-full flex items-center justify-center',
              'transition-all duration-200 border',
              isDark
                ? 'border-white/10 hover:border-white/20 hover:bg-white/10 text-white/60 hover:text-white/80'
                : 'border-black/10 hover:border-black/15 hover:bg-black/5 text-black/50 hover:text-black/70'
            )}
          >
            <SkipForward className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Session counter */}
      <div className="flex items-center justify-between pt-4 border-t border-current/10">
        <div className={cn(
          'text-sm',
          isDark ? 'text-white/60' : 'text-black/60'
        )}>
          Sessions: <span className="font-medium">{completedSessions}</span>
        </div>
        
        <button
          onClick={() => setShowSettings(!showSettings)}
          className={cn(
            'p-2 rounded-lg transition-all duration-200',
            isDark
              ? 'hover:bg-white/10 text-white/60'
              : 'hover:bg-black/5 text-black/60'
          )}
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════════════════════ */

function playNotificationSound(): void {
  try {
    // Create a simple beep using Web Audio API
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


