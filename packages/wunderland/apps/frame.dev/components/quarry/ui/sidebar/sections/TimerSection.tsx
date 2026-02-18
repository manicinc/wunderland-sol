/**
 * Focus Timer Section
 * 
 * Sleek, feature-rich Pomodoro/Focus timer for sidebars.
 * Features:
 * - Beautiful radial progress ring
 * - Pomodoro mode (work/short-break/long-break)
 * - Simple countdown mode
 * - Session tracking
 * - Keyboard shortcuts
 * - Sound notifications
 * 
 * @module components/quarry/ui/sidebar/sections/TimerSection
 */

'use client'

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
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
  Settings2,
  Volume2,
  VolumeX,
  Zap,
  Clock,
  Flame,
  Check,
} from 'lucide-react'
import { cn } from '@/lib/utils'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

type TimerMode = 'focus' | 'pomodoro'
type PomodoroPhase = 'work' | 'short-break' | 'long-break'

interface PomodoroSettings {
  workDuration: number
  shortBreakDuration: number
  longBreakDuration: number
  sessionsUntilLongBreak: number
  autoStartBreaks: boolean
  autoStartWork: boolean
}

export interface TimerSectionProps {
  /** Whether in dark mode */
  isDark: boolean
  /** Whether expanded by default */
  defaultExpanded?: boolean
  /** Default timer duration in minutes */
  defaultMinutes?: number
  /** Maximum timer duration in minutes */
  maxMinutes?: number
  /** Callback when timer completes */
  onComplete?: () => void
  /** Section title override */
  title?: string
  /** Show Pomodoro mode toggle */
  showPomodoroMode?: boolean
}

/* ═══════════════════════════════════════════════════════════════════════════
   STORAGE
═══════════════════════════════════════════════════════════════════════════ */

const SETTINGS_KEY = 'focus-timer-settings'
const SESSIONS_KEY = 'focus-timer-sessions'

const DEFAULT_POMODORO: PomodoroSettings = {
  workDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  sessionsUntilLongBreak: 4,
  autoStartBreaks: false,
  autoStartWork: false,
}

function loadSettings(): { pomodoro: PomodoroSettings; soundEnabled: boolean; mode: TimerMode } {
  if (typeof localStorage === 'undefined') return { pomodoro: DEFAULT_POMODORO, soundEnabled: true, mode: 'focus' }
  try {
    const stored = localStorage.getItem(SETTINGS_KEY)
    const parsed = stored ? JSON.parse(stored) : {}
    return {
      pomodoro: { ...DEFAULT_POMODORO, ...parsed.pomodoro },
      soundEnabled: parsed.soundEnabled ?? true,
      mode: parsed.mode ?? 'focus',
    }
  } catch {
    return { pomodoro: DEFAULT_POMODORO, soundEnabled: true, mode: 'focus' }
  }
}

function saveSettings(settings: { pomodoro: PomodoroSettings; soundEnabled: boolean; mode: TimerMode }): void {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
}

function loadTodaySessions(): number {
  if (typeof localStorage === 'undefined') return 0
  try {
    const stored = localStorage.getItem(SESSIONS_KEY)
    if (!stored) return 0
    const data = JSON.parse(stored)
    const today = new Date().toDateString()
    return data.date === today ? data.count : 0
  } catch {
    return 0
  }
}

function saveTodaySessions(count: number): void {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(SESSIONS_KEY, JSON.stringify({
    date: new Date().toDateString(),
    count,
  }))
}

/* ═══════════════════════════════════════════════════════════════════════════
   RADIAL TIMER RING
═══════════════════════════════════════════════════════════════════════════ */

function RadialTimerRing({
  progress,
  size = 140,
  strokeWidth = 6,
  color,
  isDark,
  children,
}: {
  progress: number
  size?: number
  strokeWidth?: number
  color: string
  isDark: boolean
  children?: React.ReactNode
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference * (1 - progress)

  return (
    <div className="relative" style={{ width: size, height: size }}>
      {/* Background ring */}
      <svg className="absolute inset-0" width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}
          strokeWidth={strokeWidth}
        />
      </svg>

      {/* Progress ring */}
      <svg
        className="absolute inset-0 -rotate-90"
        width={size}
        height={size}
      >
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex items-center justify-center">
        {children}
      </div>

      {/* Tick marks */}
      <svg className="absolute inset-0 opacity-30" width={size} height={size}>
        {[0, 15, 30, 45].map((minute) => {
          const angle = (minute / 60) * 360 - 90
          const rad = (angle * Math.PI) / 180
          const innerR = radius - 8
          const outerR = radius - 4
          const x1 = size / 2 + innerR * Math.cos(rad)
          const y1 = size / 2 + innerR * Math.sin(rad)
          const x2 = size / 2 + outerR * Math.cos(rad)
          const y2 = size / 2 + outerR * Math.sin(rad)
          return (
            <line
              key={minute}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={isDark ? 'white' : 'black'}
              strokeWidth={1.5}
            />
          )
        })}
      </svg>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

export function TimerSection({
  isDark,
  defaultExpanded = true,
  defaultMinutes = 15,
  maxMinutes = 60,
  onComplete,
  title = 'Focus Timer',
  showPomodoroMode = true,
}: TimerSectionProps) {
  // Load persisted settings
  const [savedSettings, setSavedSettings] = useState(() => loadSettings())
  const [todaySessions, setTodaySessions] = useState(() => loadTodaySessions())

  // State
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)
  const [showSettings, setShowSettings] = useState(false)
  const [timerMode, setTimerMode] = useState<TimerMode>(savedSettings.mode)
  const [pomodoroPhase, setPomodoroPhase] = useState<PomodoroPhase>('work')
  const [pomodoroSettings, setPomodoroSettings] = useState<PomodoroSettings>(savedSettings.pomodoro)
  const [soundEnabled, setSoundEnabled] = useState(savedSettings.soundEnabled)

  // Timer state
  const [focusDuration, setFocusDuration] = useState(defaultMinutes)
  const [timeRemaining, setTimeRemaining] = useState(defaultMinutes * 60)
  const [isRunning, setIsRunning] = useState(false)
  const [completedPomodoros, setCompletedPomodoros] = useState(0)

  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const startTimeRef = useRef<number | null>(null)

  // Derived values
  const totalDuration = useMemo(() => {
    if (timerMode === 'focus') return focusDuration * 60
    switch (pomodoroPhase) {
      case 'work': return pomodoroSettings.workDuration * 60
      case 'short-break': return pomodoroSettings.shortBreakDuration * 60
      case 'long-break': return pomodoroSettings.longBreakDuration * 60
    }
  }, [timerMode, focusDuration, pomodoroPhase, pomodoroSettings])

  const progress = 1 - timeRemaining / totalDuration

  // Phase colors
  const phaseColor = useMemo(() => {
    if (timerMode === 'focus') return '#3b82f6' // blue
    switch (pomodoroPhase) {
      case 'work': return '#ef4444' // red
      case 'short-break': return '#22c55e' // green
      case 'long-break': return '#6366f1' // indigo
    }
  }, [timerMode, pomodoroPhase])

  const phaseIcon = useMemo(() => {
    if (timerMode === 'focus') return Zap
    switch (pomodoroPhase) {
      case 'work': return Brain
      case 'short-break': return Coffee
      case 'long-break': return Target
    }
  }, [timerMode, pomodoroPhase])

  const PhaseIcon = phaseIcon

  // Save settings when they change
  useEffect(() => {
    saveSettings({ pomodoro: pomodoroSettings, soundEnabled, mode: timerMode })
  }, [pomodoroSettings, soundEnabled, timerMode])

  // Timer tick
  useEffect(() => {
    if (isRunning) {
      startTimeRef.current = Date.now()
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
    if (soundEnabled) {
      playNotificationSound()
    }

    // Update sessions
    const newSessions = todaySessions + 1
    setTodaySessions(newSessions)
    saveTodaySessions(newSessions)

    // Callback
    onComplete?.()

    if (timerMode === 'pomodoro') {
      if (pomodoroPhase === 'work') {
        const newCount = completedPomodoros + 1
        setCompletedPomodoros(newCount)

        // Determine next phase
        if (newCount % pomodoroSettings.sessionsUntilLongBreak === 0) {
          setPomodoroPhase('long-break')
          setTimeRemaining(pomodoroSettings.longBreakDuration * 60)
        } else {
          setPomodoroPhase('short-break')
          setTimeRemaining(pomodoroSettings.shortBreakDuration * 60)
        }

        if (pomodoroSettings.autoStartBreaks) {
          setIsRunning(true)
        }
      } else {
        setPomodoroPhase('work')
        setTimeRemaining(pomodoroSettings.workDuration * 60)

        if (pomodoroSettings.autoStartWork) {
          setIsRunning(true)
        }
      }
    } else {
      // Reset focus timer
      setTimeRemaining(focusDuration * 60)
    }
  }, [timerMode, pomodoroPhase, pomodoroSettings, completedPomodoros, focusDuration, soundEnabled, todaySessions, onComplete])

  // Toggle timer
  const toggleTimer = useCallback(() => {
    setIsRunning((prev) => !prev)
  }, [])

  // Reset timer
  const resetTimer = useCallback(() => {
    setIsRunning(false)
    if (timerMode === 'focus') {
      setTimeRemaining(focusDuration * 60)
    } else {
      setTimeRemaining(
        pomodoroPhase === 'work'
          ? pomodoroSettings.workDuration * 60
          : pomodoroPhase === 'short-break'
            ? pomodoroSettings.shortBreakDuration * 60
            : pomodoroSettings.longBreakDuration * 60
      )
    }
  }, [timerMode, focusDuration, pomodoroPhase, pomodoroSettings])

  // Skip to next (pomodoro only)
  const skipToNext = useCallback(() => {
    if (timerMode !== 'pomodoro') return
    setIsRunning(false)

    if (pomodoroPhase === 'work') {
      const newCount = completedPomodoros + 1
      if (newCount % pomodoroSettings.sessionsUntilLongBreak === 0) {
        setPomodoroPhase('long-break')
        setTimeRemaining(pomodoroSettings.longBreakDuration * 60)
      } else {
        setPomodoroPhase('short-break')
        setTimeRemaining(pomodoroSettings.shortBreakDuration * 60)
      }
    } else {
      setPomodoroPhase('work')
      setTimeRemaining(pomodoroSettings.workDuration * 60)
    }
  }, [timerMode, pomodoroPhase, completedPomodoros, pomodoroSettings])

  // Change focus duration
  const handleDurationChange = useCallback((mins: number) => {
    setFocusDuration(mins)
    if (!isRunning) {
      setTimeRemaining(mins * 60)
    }
  }, [isRunning])

  // Change pomodoro phase manually
  const handlePhaseChange = useCallback((phase: PomodoroPhase) => {
    if (isRunning) return
    setPomodoroPhase(phase)
    setTimeRemaining(
      phase === 'work'
        ? pomodoroSettings.workDuration * 60
        : phase === 'short-break'
          ? pomodoroSettings.shortBreakDuration * 60
          : pomodoroSettings.longBreakDuration * 60
    )
  }, [isRunning, pomodoroSettings])

  // Switch timer mode
  const handleModeSwitch = useCallback((mode: TimerMode) => {
    if (isRunning) return
    setTimerMode(mode)
    if (mode === 'focus') {
      setTimeRemaining(focusDuration * 60)
    } else {
      setPomodoroPhase('work')
      setTimeRemaining(pomodoroSettings.workDuration * 60)
    }
  }, [isRunning, focusDuration, pomodoroSettings])

  // Format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      if (e.key === ' ' && e.ctrlKey) {
        e.preventDefault()
        toggleTimer()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [toggleTimer])

  return (
    <div
      className={cn(
        'border-b transition-all duration-200',
        isDark ? 'border-zinc-800' : 'border-zinc-200'
      )}
    >
      {/* Header */}
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
              'w-6 h-6 rounded-md flex items-center justify-center transition-colors',
              isRunning
                ? 'bg-gradient-to-br from-blue-500 to-cyan-500'
                : isDark ? 'bg-zinc-800' : 'bg-zinc-200'
            )}
          >
            <Timer className={cn('w-3.5 h-3.5', isRunning ? 'text-white' : isDark ? 'text-zinc-400' : 'text-zinc-600')} />
          </div>
          <span className={cn('text-sm font-medium', isDark ? 'text-zinc-300' : 'text-zinc-700')}>
            {title}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Mini timer display when collapsed */}
          {!isExpanded && (
            <span className={cn(
              'text-xs font-mono tabular-nums',
              isRunning ? 'text-blue-400' : isDark ? 'text-zinc-500' : 'text-zinc-400'
            )}>
              {formatTime(timeRemaining)}
            </span>
          )}

          {isExpanded ? (
            <ChevronUp className={cn('w-4 h-4', isDark ? 'text-zinc-500' : 'text-zinc-400')} />
          ) : (
            <ChevronDown className={cn('w-4 h-4', isDark ? 'text-zinc-500' : 'text-zinc-400')} />
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
            <div className="px-3 pb-4 space-y-4">
              {/* Mode Toggle */}
              {showPomodoroMode && (
                <div className="flex gap-1 p-1 rounded-lg bg-zinc-100 dark:bg-zinc-800/50">
                  <button
                    onClick={() => handleModeSwitch('focus')}
                    disabled={isRunning}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-all',
                      timerMode === 'focus'
                        ? 'bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-sm'
                        : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300',
                      isRunning && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    <Clock className="w-3 h-3" />
                    Focus
                  </button>
                  <button
                    onClick={() => handleModeSwitch('pomodoro')}
                    disabled={isRunning}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-all',
                      timerMode === 'pomodoro'
                        ? 'bg-white dark:bg-zinc-700 text-red-600 dark:text-red-400 shadow-sm'
                        : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300',
                      isRunning && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    <Brain className="w-3 h-3" />
                    Pomodoro
                  </button>
                </div>
              )}

              {/* Radial Timer */}
              <div className="flex justify-center">
                <RadialTimerRing
                  progress={progress}
                  size={160}
                  strokeWidth={8}
                  color={phaseColor}
                  isDark={isDark}
                >
                  <div className="flex flex-col items-center">
                    <span className={cn(
                      'text-3xl font-mono font-bold tabular-nums tracking-tight',
                      isDark ? 'text-white' : 'text-zinc-900'
                    )}>
                      {formatTime(timeRemaining)}
                    </span>
                    <span className={cn(
                      'text-[10px] font-medium uppercase tracking-wider mt-0.5',
                      isDark ? 'text-zinc-500' : 'text-zinc-400'
                    )}>
                      {timerMode === 'focus'
                        ? `${focusDuration} min`
                        : pomodoroPhase === 'work'
                          ? 'Focus'
                          : pomodoroPhase === 'short-break'
                            ? 'Short Break'
                            : 'Long Break'
                      }
                    </span>
                  </div>
                </RadialTimerRing>
              </div>

              {/* Play/Pause Button */}
              <div className="flex justify-center">
                <motion.button
                  onClick={toggleTimer}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={cn(
                    'w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all',
                    isRunning
                      ? 'bg-zinc-700 hover:bg-zinc-600'
                      : 'bg-gradient-to-br from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600'
                  )}
                >
                  {isRunning ? (
                    <Pause className="w-6 h-6 text-white" />
                  ) : (
                    <Play className="w-6 h-6 text-white ml-0.5" />
                  )}
                </motion.button>
              </div>

              {/* Pomodoro Phase Pills */}
              {timerMode === 'pomodoro' && (
                <div className="flex gap-1">
                  {(['work', 'short-break', 'long-break'] as PomodoroPhase[]).map((phase) => {
                    const Icon = phase === 'work' ? Brain : phase === 'short-break' ? Coffee : Target
                    const isActive = pomodoroPhase === phase
                    const color = phase === 'work' ? 'red' : phase === 'short-break' ? 'green' : 'indigo'

                    return (
                      <button
                        key={phase}
                        onClick={() => handlePhaseChange(phase)}
                        disabled={isRunning}
                        className={cn(
                          'flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md text-[10px] font-medium transition-all',
                          isActive
                            ? `bg-${color}-500/20 text-${color}-${isDark ? '400' : '600'} ring-1 ring-${color}-500/30`
                            : isDark
                              ? 'text-zinc-500 hover:text-zinc-400 hover:bg-zinc-800'
                              : 'text-zinc-400 hover:text-zinc-500 hover:bg-zinc-100',
                          isRunning && 'opacity-50 cursor-not-allowed'
                        )}
                        style={isActive ? {
                          backgroundColor: `${phase === 'work' ? '#ef4444' : phase === 'short-break' ? '#22c55e' : '#6366f1'}20`,
                          color: phase === 'work' ? '#f87171' : phase === 'short-break' ? '#4ade80' : '#818cf8',
                        } : undefined}
                      >
                        <Icon className="w-3 h-3" />
                        {phase === 'work' ? 'Focus' : phase === 'short-break' ? 'Short' : 'Long'}
                      </button>
                    )
                  })}
                </div>
              )}

              {/* Focus Duration Slider */}
              {timerMode === 'focus' && !isRunning && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className={isDark ? 'text-zinc-500' : 'text-zinc-400'}>Duration</span>
                    <span className={cn('font-medium', isDark ? 'text-zinc-300' : 'text-zinc-600')}>
                      {focusDuration} min
                    </span>
                  </div>
                  <input
                    type="range"
                    min={5}
                    max={maxMinutes}
                    step={5}
                    value={focusDuration}
                    onChange={(e) => handleDurationChange(parseInt(e.target.value))}
                    className={cn(
                      'w-full h-1.5 rounded-full appearance-none cursor-pointer',
                      isDark ? 'bg-zinc-700' : 'bg-zinc-200',
                      '[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-md'
                    )}
                  />
                  <div className="flex justify-between text-[10px] text-zinc-500">
                    <span>5m</span>
                    <span>{maxMinutes}m</span>
                  </div>
                </div>
              )}

              {/* Controls Row */}
              <div className="flex items-center justify-between pt-2 border-t border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center gap-1">
                  <button
                    onClick={resetTimer}
                    className={cn(
                      'p-1.5 rounded-md transition-all',
                      isDark ? 'hover:bg-zinc-800 text-zinc-500' : 'hover:bg-zinc-100 text-zinc-400'
                    )}
                    title="Reset (R)"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>

                  {timerMode === 'pomodoro' && (
                    <button
                      onClick={skipToNext}
                      className={cn(
                        'p-1.5 rounded-md transition-all',
                        isDark ? 'hover:bg-zinc-800 text-zinc-500' : 'hover:bg-zinc-100 text-zinc-400'
                      )}
                      title="Skip"
                    >
                      <SkipForward className="w-4 h-4" />
                    </button>
                  )}

                  <button
                    onClick={() => setSoundEnabled(!soundEnabled)}
                    className={cn(
                      'p-1.5 rounded-md transition-all',
                      soundEnabled
                        ? isDark ? 'text-blue-400 hover:bg-blue-500/10' : 'text-blue-500 hover:bg-blue-50'
                        : isDark ? 'hover:bg-zinc-800 text-zinc-500' : 'hover:bg-zinc-100 text-zinc-400'
                    )}
                    title={soundEnabled ? 'Sound on' : 'Sound off'}
                  >
                    {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                  </button>
                </div>

                {/* Session Counter */}
                <div className="flex items-center gap-2">
                  {timerMode === 'pomodoro' && (
                    <div className="flex items-center gap-1">
                      {Array.from({ length: pomodoroSettings.sessionsUntilLongBreak }).map((_, i) => (
                        <div
                          key={i}
                          className={cn(
                            'w-2 h-2 rounded-full transition-colors',
                            i < completedPomodoros % pomodoroSettings.sessionsUntilLongBreak
                              ? 'bg-red-500'
                              : isDark ? 'bg-zinc-700' : 'bg-zinc-300'
                          )}
                        />
                      ))}
                    </div>
                  )}

                  <div className={cn(
                    'flex items-center gap-1 text-[10px] font-medium',
                    isDark ? 'text-zinc-500' : 'text-zinc-400'
                  )}>
                    <Flame className="w-3 h-3 text-orange-500" />
                    <span>{todaySessions} today</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default TimerSection

/* ═══════════════════════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════════════════════ */

function playNotificationSound(): void {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()

    // Create a pleasant chime sound
    const playTone = (freq: number, delay: number, duration: number) => {
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)

      oscillator.frequency.value = freq
      oscillator.type = 'sine'
      const startTime = audioContext.currentTime + delay
      gainNode.gain.setValueAtTime(0, startTime)
      gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.02)
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration)
      oscillator.start(startTime)
      oscillator.stop(startTime + duration)
    }

    // Play a pleasant three-note chime
    playTone(523.25, 0, 0.3)      // C5
    playTone(659.25, 0.15, 0.3)   // E5
    playTone(783.99, 0.3, 0.5)    // G5
  } catch {
    // Ignore audio errors
  }
}