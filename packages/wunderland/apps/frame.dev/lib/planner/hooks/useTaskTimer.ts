/**
 * useTaskTimer Hook
 *
 * Manages task timers with start/stop/pause functionality.
 * Persists timer state to database and auto-fills actual time on completion.
 *
 * @module lib/planner/hooks/useTaskTimer
 */

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { Task, UpdateTaskInput } from '../types'
import * as db from '../database'

export type TimerState = 'idle' | 'running' | 'paused'

export interface UseTaskTimerOptions {
  taskId: string
  onComplete?: (actualDuration: number) => void
  autoStartNext?: boolean
}

export interface UseTaskTimerReturn {
  // State
  state: TimerState
  elapsedMs: number
  elapsedMinutes: number
  formattedTime: string

  // Actions
  start: () => Promise<void>
  pause: () => Promise<void>
  resume: () => Promise<void>
  stop: () => Promise<number> // Returns actual duration in minutes
  reset: () => Promise<void>

  // Status
  isRunning: boolean
  isPaused: boolean
  isIdle: boolean
}

/**
 * Format milliseconds to HH:MM:SS or MM:SS
 */
export function formatTimerTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  const pad = (n: number) => n.toString().padStart(2, '0')

  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
  }
  return `${pad(minutes)}:${pad(seconds)}`
}

/**
 * Hook for managing a task timer
 */
export function useTaskTimer(options: UseTaskTimerOptions): UseTaskTimerReturn {
  const { taskId, onComplete } = options

  const [state, setState] = useState<TimerState>('idle')
  const [elapsedMs, setElapsedMs] = useState(0)
  const [startedAt, setStartedAt] = useState<Date | null>(null)
  const [accumulatedMs, setAccumulatedMs] = useState(0)

  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastTickRef = useRef<number>(Date.now())

  // Load initial state from task
  useEffect(() => {
    const loadTask = async () => {
      const task = await db.getTask(taskId)
      if (!task) return

      if (task.timerStartedAt) {
        // Timer was running - calculate elapsed time
        const startTime = new Date(task.timerStartedAt)
        const accumulated = task.timerAccumulatedMs || 0
        const nowMs = Date.now() - startTime.getTime()

        setStartedAt(startTime)
        setAccumulatedMs(accumulated)
        setElapsedMs(nowMs + accumulated)
        setState('running')
      } else if (task.timerAccumulatedMs && task.timerAccumulatedMs > 0) {
        // Timer was paused
        setAccumulatedMs(task.timerAccumulatedMs)
        setElapsedMs(task.timerAccumulatedMs)
        setState('paused')
      } else if (task.actualDuration) {
        // Timer was stopped but has recorded time
        setElapsedMs(task.actualDuration * 60 * 1000)
        setState('idle')
      }
    }

    loadTask()
  }, [taskId])

  // Timer tick
  useEffect(() => {
    if (state !== 'running') {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }

    lastTickRef.current = Date.now()

    intervalRef.current = setInterval(() => {
      const now = Date.now()
      const delta = now - lastTickRef.current
      lastTickRef.current = now

      setElapsedMs((prev) => prev + delta)
    }, 1000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [state])

  // Start timer
  const start = useCallback(async () => {
    const now = new Date()

    await db.updateTask(taskId, {
      timerStartedAt: now.toISOString(),
      timerAccumulatedMs: 0,
    })

    setStartedAt(now)
    setAccumulatedMs(0)
    setElapsedMs(0)
    setState('running')
    lastTickRef.current = Date.now()
  }, [taskId])

  // Pause timer
  const pause = useCallback(async () => {
    if (state !== 'running') return

    const currentAccumulated = elapsedMs

    await db.updateTask(taskId, {
      timerStartedAt: null,
      timerAccumulatedMs: currentAccumulated,
    })

    setAccumulatedMs(currentAccumulated)
    setStartedAt(null)
    setState('paused')
  }, [taskId, state, elapsedMs])

  // Resume timer
  const resume = useCallback(async () => {
    if (state !== 'paused') return

    const now = new Date()

    await db.updateTask(taskId, {
      timerStartedAt: now.toISOString(),
      timerAccumulatedMs: accumulatedMs,
    })

    setStartedAt(now)
    setState('running')
    lastTickRef.current = Date.now()
  }, [taskId, state, accumulatedMs])

  // Stop timer and record actual duration
  const stop = useCallback(async (): Promise<number> => {
    const actualMinutes = Math.round(elapsedMs / 60000)

    await db.updateTask(taskId, {
      timerStartedAt: null,
      timerAccumulatedMs: null,
      actualDuration: actualMinutes,
    })

    setStartedAt(null)
    setAccumulatedMs(0)
    setState('idle')

    onComplete?.(actualMinutes)

    return actualMinutes
  }, [taskId, elapsedMs, onComplete])

  // Reset timer
  const reset = useCallback(async () => {
    await db.updateTask(taskId, {
      timerStartedAt: null,
      timerAccumulatedMs: null,
      actualDuration: null,
    })

    setStartedAt(null)
    setAccumulatedMs(0)
    setElapsedMs(0)
    setState('idle')
  }, [taskId])

  return {
    state,
    elapsedMs,
    elapsedMinutes: Math.round(elapsedMs / 60000),
    formattedTime: formatTimerTime(elapsedMs),
    start,
    pause,
    resume,
    stop,
    reset,
    isRunning: state === 'running',
    isPaused: state === 'paused',
    isIdle: state === 'idle',
  }
}

/**
 * Global timer manager for tracking the active timer across tasks
 */
interface GlobalTimerState {
  activeTaskId: string | null
  listeners: Set<(taskId: string | null) => void>
}

const globalTimerState: GlobalTimerState = {
  activeTaskId: null,
  listeners: new Set(),
}

/**
 * Get the currently active timer task ID
 */
export function getActiveTimerTaskId(): string | null {
  return globalTimerState.activeTaskId
}

/**
 * Set the active timer task ID
 */
export function setActiveTimerTaskId(taskId: string | null): void {
  globalTimerState.activeTaskId = taskId
  globalTimerState.listeners.forEach((listener) => listener(taskId))
}

/**
 * Subscribe to active timer changes
 */
export function subscribeToActiveTimer(callback: (taskId: string | null) => void): () => void {
  globalTimerState.listeners.add(callback)
  return () => {
    globalTimerState.listeners.delete(callback)
  }
}

/**
 * Hook to track the globally active timer
 */
export function useActiveTimer(): {
  activeTaskId: string | null
  isActive: (taskId: string) => boolean
  setActive: (taskId: string | null) => void
} {
  const [activeTaskId, setActiveTaskIdState] = useState<string | null>(globalTimerState.activeTaskId)

  useEffect(() => {
    return subscribeToActiveTimer(setActiveTaskIdState)
  }, [])

  return {
    activeTaskId,
    isActive: useCallback((taskId: string) => activeTaskId === taskId, [activeTaskId]),
    setActive: setActiveTimerTaskId,
  }
}
