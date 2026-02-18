/**
 * Writing Timer Hook
 * @module components/quarry/hooks/useWritingTimer
 *
 * React hook for integrating the writing timer with components.
 * Handles activity detection, state management, and persistence.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  WritingTimer,
  type TimerState,
  type WritingSession,
  formatTime,
} from '@/lib/tracking/writingTimer'
import { getWritingTimerStore } from '@/lib/tracking/writingTimerStore'

export interface UseWritingTimerOptions {
  /** Strand ID */
  strandId: string
  /** Loom ID (optional) */
  loomId?: string
  /** Weave ID (optional) */
  weaveId?: string
  /** Inactivity timeout in ms (default: 30000) */
  inactivityTimeout?: number
  /** Auto-start on first activity (default: true) */
  autoStart?: boolean
  /** Attach to editor element for activity detection */
  editorRef?: React.RefObject<HTMLElement>
}

export interface UseWritingTimerReturn {
  /** Active writing time in seconds */
  activeTime: number
  /** Total elapsed time in seconds */
  totalTime: number
  /** Formatted active time (mm:ss) */
  activeTimeFormatted: string
  /** Formatted total time (mm:ss) */
  totalTimeFormatted: string
  /** Current timer state */
  state: TimerState
  /** Is timer running */
  isRunning: boolean
  /** Is timer paused */
  isPaused: boolean
  /** Number of pauses */
  pauseCount: number
  /** Start the timer */
  start: () => void
  /** Pause the timer */
  pause: () => void
  /** Resume the timer */
  resume: () => void
  /** Stop and save the session */
  stop: () => Promise<WritingSession>
  /** Reset without saving */
  reset: () => void
  /** Record activity (call on user interaction) */
  recordActivity: () => void
  /** Update word/character counts */
  updateCounts: (wordCount: number, characterCount: number) => void
}

/**
 * Hook for tracking writing time in an editor
 */
export function useWritingTimer(
  options: UseWritingTimerOptions
): UseWritingTimerReturn {
  const {
    strandId,
    loomId,
    weaveId,
    inactivityTimeout = 30000,
    autoStart = true,
    editorRef,
  } = options

  const timerRef = useRef<WritingTimer | null>(null)
  const [activeTime, setActiveTime] = useState(0)
  const [totalTime, setTotalTime] = useState(0)
  const [state, setState] = useState<TimerState>('idle')
  const [pauseCount, setPauseCount] = useState(0)

  // Initialize timer
  useEffect(() => {
    const timer = new WritingTimer(strandId, {
      loomId,
      weaveId,
      config: { inactivityTimeout },
    })

    timer.addEventListener((event) => {
      setActiveTime(event.activeSeconds)
      setTotalTime(event.totalSeconds)
      setState(event.state)

      if (event.type === 'pause') {
        setPauseCount((prev) => prev + 1)
      }
    })

    timerRef.current = timer

    return () => {
      timer.dispose()
    }
  }, [strandId, loomId, weaveId, inactivityTimeout])

  // Attach activity listeners to editor
  useEffect(() => {
    if (!editorRef?.current) return

    const editor = editorRef.current
    const handleActivity = () => {
      timerRef.current?.recordActivity()
    }

    // Keyboard events
    editor.addEventListener('keydown', handleActivity)
    editor.addEventListener('keypress', handleActivity)

    // Mouse events (only movement within editor)
    editor.addEventListener('mousemove', handleActivity)

    // Scroll events
    editor.addEventListener('scroll', handleActivity)

    // Touch events for mobile
    editor.addEventListener('touchstart', handleActivity)

    return () => {
      editor.removeEventListener('keydown', handleActivity)
      editor.removeEventListener('keypress', handleActivity)
      editor.removeEventListener('mousemove', handleActivity)
      editor.removeEventListener('scroll', handleActivity)
      editor.removeEventListener('touchstart', handleActivity)
    }
  }, [editorRef])

  const start = useCallback(() => {
    timerRef.current?.start()
  }, [])

  const pause = useCallback(() => {
    timerRef.current?.pause()
  }, [])

  const resume = useCallback(() => {
    timerRef.current?.resume()
  }, [])

  const stop = useCallback(async (): Promise<WritingSession> => {
    const session = timerRef.current?.stop() || {
      id: '',
      strandId,
      startTime: new Date().toISOString(),
      activeSeconds: activeTime,
      totalSeconds: totalTime,
      wordCount: 0,
      characterCount: 0,
      pauseCount,
    }

    // Save to store
    try {
      const store = await getWritingTimerStore()
      await store.saveSession(session)
    } catch (e) {
      console.error('[useWritingTimer] Failed to save session:', e)
    }

    return session
  }, [strandId, activeTime, totalTime, pauseCount])

  const reset = useCallback(() => {
    timerRef.current?.dispose()
    timerRef.current = new WritingTimer(strandId, {
      loomId,
      weaveId,
      config: { inactivityTimeout },
    })

    timerRef.current.addEventListener((event) => {
      setActiveTime(event.activeSeconds)
      setTotalTime(event.totalSeconds)
      setState(event.state)
    })

    setActiveTime(0)
    setTotalTime(0)
    setState('idle')
    setPauseCount(0)
  }, [strandId, loomId, weaveId, inactivityTimeout])

  const recordActivity = useCallback(() => {
    timerRef.current?.recordActivity()
  }, [])

  const updateCounts = useCallback((wordCount: number, characterCount: number) => {
    timerRef.current?.updateCounts(wordCount, characterCount)
  }, [])

  return {
    activeTime,
    totalTime,
    activeTimeFormatted: formatTime(activeTime),
    totalTimeFormatted: formatTime(totalTime),
    state,
    isRunning: state === 'running',
    isPaused: state === 'paused',
    pauseCount,
    start,
    pause,
    resume,
    stop,
    reset,
    recordActivity,
    updateCounts,
  }
}

export default useWritingTimer
