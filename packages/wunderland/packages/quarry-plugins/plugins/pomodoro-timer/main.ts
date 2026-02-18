/**
 * Pomodoro Timer Plugin for Quarry
 *
 * A simple, elegant focus timer using the Pomodoro Technique.
 * Work for 25 minutes, then take a 5-minute break.
 *
 * Features:
 * - Persistent state across widget remounts (sidebar ↔ modal)
 * - Automatic time compensation when timer is running
 * - Configurable work/break durations
 * - Session tracking
 */

import React, { useEffect, useCallback, useRef, useState } from 'react'
import { Play, Pause, RotateCcw, Coffee, Zap } from 'lucide-react'

// ============================================================================
// TYPES
// ============================================================================

type TimerMode = 'work' | 'break' | 'longBreak'

interface WidgetProps {
  api: PluginStorageAPI
  settings: Record<string, unknown>
  theme: string
  isDark: boolean
  isExpanded?: boolean
}

interface PluginStorageAPI {
  getData<T>(key: string): T | null
  setData<T>(key: string, value: T): void
  showNotice(message: string, type?: 'info' | 'success' | 'warning' | 'error'): void
  registerSidebarWidget(component: React.ComponentType<WidgetProps>): void
  registerCommand(options: { id: string; name: string; shortcut?: string; callback: () => void }): void
}

interface TimerState {
  timeLeft: number
  isRunning: boolean
  mode: TimerMode
  sessions: number
  lastTick: number
}

// ============================================================================
// PERSISTENT STATE HOOK
// ============================================================================

/**
 * Hook for persisting timer state with automatic time compensation.
 * When the widget remounts with a running timer, it calculates elapsed
 * time since lastTick and adjusts timeLeft accordingly.
 */
function usePersistentTimerState(
  api: PluginStorageAPI,
  key: string,
  initialState: TimerState
): [TimerState, (value: TimerState | ((prev: TimerState) => TimerState)) => void] {
  const hasCompensated = useRef(false)

  // Initialize with time compensation if timer was running
  const [state, setStateInternal] = useState<TimerState>(() => {
    try {
      const saved = api.getData<TimerState>(key)
      if (saved !== null) {
        // If timer was running, compensate for elapsed time
        if (saved.isRunning && saved.lastTick) {
          const elapsed = Math.floor((Date.now() - saved.lastTick) / 1000)
          const newTimeLeft = Math.max(0, saved.timeLeft - elapsed)
          hasCompensated.current = true
          return {
            ...saved,
            timeLeft: newTimeLeft,
            lastTick: Date.now(),
          }
        }
        return saved
      }
    } catch {
      // Fall through to initial state
    }
    return initialState
  })

  // Custom setState with persistence
  const setState = useCallback(
    (value: TimerState | ((prev: TimerState) => TimerState)) => {
      setStateInternal((prev) => {
        const newValue = typeof value === 'function' ? value(prev) : value
        // Always update lastTick when running
        const valueToSave = newValue.isRunning
          ? { ...newValue, lastTick: Date.now() }
          : newValue
        try {
          api.setData(key, valueToSave)
        } catch (e) {
          console.warn(`[Pomodoro] Failed to persist state:`, e)
        }
        return valueToSave
      })
    },
    [api, key]
  )

  // Persist initial state on mount if no saved value exists
  useEffect(() => {
    if (!hasCompensated.current) {
      const saved = api.getData<TimerState>(key)
      if (saved === null) {
        try {
          api.setData(key, initialState)
        } catch {
          // Ignore
        }
      }
    }
  }, [api, key, initialState])

  return [state, setState]
}

// ============================================================================
// TIMER WIDGET COMPONENT
// ============================================================================

function PomodoroWidget({ api, settings, isDark, isExpanded }: WidgetProps) {
  // Get durations from settings
  const workDuration = (settings.workDuration as number || 25) * 60
  const breakDuration = (settings.breakDuration as number || 5) * 60
  const longBreakDuration = (settings.longBreakDuration as number || 15) * 60
  const autoStartBreaks = settings.autoStartBreaks as boolean ?? true
  const soundEnabled = settings.soundEnabled as boolean ?? true

  // Persistent timer state - survives widget remounts
  const [timer, setTimer] = usePersistentTimerState(api, 'timerState', {
    timeLeft: workDuration,
    isRunning: false,
    mode: 'work',
    sessions: 0,
    lastTick: Date.now(),
  })

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Format time as mm:ss
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Get duration for a mode
  const getDuration = useCallback(
    (m: TimerMode) => {
      switch (m) {
        case 'work':
          return workDuration
        case 'break':
          return breakDuration
        case 'longBreak':
          return longBreakDuration
      }
    },
    [workDuration, breakDuration, longBreakDuration]
  )

  // Play notification sound
  const playSound = useCallback(() => {
    if (!soundEnabled) return
    try {
      // Simple beep sound
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQ==')
      audio.volume = 0.5
      audio.play().catch(() => {})
    } catch {}
  }, [soundEnabled])

  // Handle timer completion
  const handleComplete = useCallback(() => {
    playSound()

    if (timer.mode === 'work') {
      const newSessions = timer.sessions + 1
      const isLongBreak = newSessions % 4 === 0

      setTimer((prev) => ({
        ...prev,
        sessions: newSessions,
        mode: isLongBreak ? 'longBreak' : 'break',
        timeLeft: isLongBreak ? longBreakDuration : breakDuration,
        isRunning: autoStartBreaks,
        lastTick: Date.now(),
      }))

      api?.showNotice(
        isLongBreak ? 'Great work! Time for a long break.' : 'Work session complete! Take a short break.',
        'success'
      )
    } else {
      setTimer((prev) => ({
        ...prev,
        mode: 'work',
        timeLeft: workDuration,
        isRunning: false,
        lastTick: Date.now(),
      }))
      api?.showNotice('Break over! Ready for another session?', 'info')
    }
  }, [timer.mode, timer.sessions, playSound, autoStartBreaks, workDuration, breakDuration, longBreakDuration, api, setTimer])

  // Timer tick effect
  useEffect(() => {
    if (timer.isRunning && timer.timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimer((prev) => {
          const newTimeLeft = prev.timeLeft - 1
          return {
            ...prev,
            timeLeft: newTimeLeft,
            lastTick: Date.now(),
          }
        })
      }, 1000)
    } else if (timer.timeLeft === 0 && timer.isRunning) {
      handleComplete()
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [timer.isRunning, timer.timeLeft, handleComplete, setTimer])

  // Toggle timer
  const toggle = () => {
    setTimer((prev) => ({
      ...prev,
      isRunning: !prev.isRunning,
      lastTick: Date.now(),
    }))
  }

  // Reset timer
  const reset = () => {
    setTimer((prev) => ({
      ...prev,
      isRunning: false,
      timeLeft: getDuration(prev.mode),
      lastTick: Date.now(),
    }))
  }

  // Switch mode
  const switchMode = (newMode: TimerMode) => {
    setTimer((prev) => ({
      ...prev,
      isRunning: false,
      mode: newMode,
      timeLeft: getDuration(newMode),
      lastTick: Date.now(),
    }))
  }

  // Calculate progress
  const progress = 1 - timer.timeLeft / getDuration(timer.mode)

  // Responsive sizing for expanded modal
  const circleSize = isExpanded ? 'w-48 h-48' : 'w-32 h-32'
  const circleDimension = isExpanded ? 96 : 64
  const circleRadius = isExpanded ? 84 : 56
  const circumference = 2 * Math.PI * circleRadius

  return (
    <div className={`pomodoro-widget ${isExpanded ? 'p-8' : 'p-4'}`}>
      {/* Mode Tabs */}
      <div className={`flex gap-1 ${isExpanded ? 'mb-8 justify-center' : 'mb-4'}`}>
        {(['work', 'break', 'longBreak'] as TimerMode[]).map((m) => (
          <button
            key={m}
            onClick={() => switchMode(m)}
            className={`
              ${isExpanded ? 'px-4 py-2 text-sm' : 'flex-1 px-2 py-1 text-[10px]'}
              font-medium rounded transition-colors
              ${timer.mode === m
                ? m === 'work'
                  ? 'bg-red-500 text-white'
                  : 'bg-green-500 text-white'
                : isDark
                  ? 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
              }
            `}
          >
            {m === 'work' && <Zap className={`${isExpanded ? 'w-4 h-4' : 'w-3 h-3'} inline mr-1`} />}
            {(m === 'break' || m === 'longBreak') && <Coffee className={`${isExpanded ? 'w-4 h-4' : 'w-3 h-3'} inline mr-1`} />}
            {m === 'work' ? 'Work' : m === 'break' ? 'Break' : 'Long Break'}
          </button>
        ))}
      </div>

      {/* Timer Display */}
      <div className={`relative flex justify-center ${isExpanded ? 'mb-8' : 'mb-4'}`}>
        <svg className={`${circleSize} transform -rotate-90`}>
          <circle
            cx={circleDimension}
            cy={circleDimension}
            r={circleRadius}
            fill="none"
            strokeWidth={isExpanded ? 12 : 8}
            className={isDark ? 'stroke-zinc-700' : 'stroke-zinc-200'}
          />
          <circle
            cx={circleDimension}
            cy={circleDimension}
            r={circleRadius}
            fill="none"
            strokeWidth={isExpanded ? 12 : 8}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - progress)}
            className={timer.mode === 'work' ? 'stroke-red-500' : 'stroke-green-500'}
            style={{ transition: 'stroke-dashoffset 0.5s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`${isExpanded ? 'text-5xl' : 'text-3xl'} font-mono font-bold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
            {formatTime(timer.timeLeft)}
          </span>
          <span className={`${isExpanded ? 'text-sm' : 'text-[10px]'} uppercase ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
            {timer.mode === 'work' ? 'Focus Time' : timer.mode === 'break' ? 'Short Break' : 'Long Break'}
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex justify-center gap-2">
        <button
          onClick={toggle}
          className={`
            flex items-center justify-center rounded-full
            ${isExpanded ? 'w-16 h-16' : 'w-12 h-12'}
            ${timer.isRunning
              ? 'bg-orange-500 hover:bg-orange-600'
              : timer.mode === 'work'
                ? 'bg-red-500 hover:bg-red-600'
                : 'bg-green-500 hover:bg-green-600'
            }
            text-white transition-colors
          `}
        >
          {timer.isRunning ? (
            <Pause className={isExpanded ? 'w-7 h-7' : 'w-5 h-5'} />
          ) : (
            <Play className={`${isExpanded ? 'w-7 h-7' : 'w-5 h-5'} ml-0.5`} />
          )}
        </button>
        <button
          onClick={reset}
          className={`
            flex items-center justify-center rounded-full
            ${isExpanded ? 'w-14 h-14' : 'w-10 h-10'}
            ${isDark
              ? 'bg-zinc-700 hover:bg-zinc-600 text-zinc-300'
              : 'bg-zinc-200 hover:bg-zinc-300 text-zinc-600'
            }
            transition-colors
          `}
        >
          <RotateCcw className={isExpanded ? 'w-5 h-5' : 'w-4 h-4'} />
        </button>
      </div>

      {/* Session Counter */}
      <div className={`text-center ${isExpanded ? 'mt-8 text-base' : 'mt-4 text-xs'} ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
        Sessions completed: <span className="font-semibold">{timer.sessions}</span>
      </div>

      {/* Expanded view: additional info */}
      {isExpanded && (
        <div className={`mt-6 pt-6 border-t ${isDark ? 'border-zinc-700' : 'border-zinc-200'}`}>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className={`text-2xl font-bold ${isDark ? 'text-red-400' : 'text-red-500'}`}>
                {Math.floor(workDuration / 60)}m
              </div>
              <div className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>Work</div>
            </div>
            <div>
              <div className={`text-2xl font-bold ${isDark ? 'text-green-400' : 'text-green-500'}`}>
                {Math.floor(breakDuration / 60)}m
              </div>
              <div className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>Break</div>
            </div>
            <div>
              <div className={`text-2xl font-bold ${isDark ? 'text-blue-400' : 'text-blue-500'}`}>
                {Math.floor(longBreakDuration / 60)}m
              </div>
              <div className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>Long Break</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// PLUGIN CLASS
// ============================================================================

class FabricPlugin {
  manifest: any
  api: any
  context: any

  async onLoad() {}
  async onUnload() {}
  onSettingsChange?(settings: Record<string, unknown>): void

  protected log(message: string) {
    console.log(`[${this.manifest?.name}] ${message}`)
  }

  protected success(message: string) {
    this.api?.showNotice(message, 'success')
  }
}

class PomodoroTimerPlugin extends FabricPlugin {
  async onLoad() {
    this.api.registerSidebarWidget(PomodoroWidget)

    this.api.registerCommand({
      id: 'pomodoro:start',
      name: 'Start Pomodoro Timer',
      shortcut: 'mod+shift+p',
      callback: () => {
        this.api.showNotice('Use the sidebar widget to control the timer', 'info')
      },
    })

    this.log('Pomodoro Timer loaded!')
  }

  async onUnload() {
    this.log('Pomodoro Timer unloaded')
  }
}

export default PomodoroTimerPlugin
