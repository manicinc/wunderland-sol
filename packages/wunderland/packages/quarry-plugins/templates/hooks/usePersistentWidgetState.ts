/**
 * Persistent Widget State Hook
 *
 * Provides state that persists across widget remounts (e.g., when expanding
 * to full-page modal and closing). Uses the plugin API's localStorage-based
 * storage to maintain state between instances.
 *
 * @module hooks/usePersistentWidgetState
 */

import { useState, useEffect, useCallback, useRef } from 'react'

/**
 * Plugin API type (minimal interface for storage)
 */
interface PluginStorageAPI {
  getData<T>(key: string): T | null
  setData<T>(key: string, value: T): void
}

/**
 * Hook for persisting widget state across remounts
 *
 * @param api - Plugin API instance with getData/setData methods
 * @param key - Unique key for this state (scoped to plugin)
 * @param initialValue - Default value if no saved state exists
 * @returns Tuple of [state, setState] similar to useState
 *
 * @example
 * ```tsx
 * function MyWidget({ api }: WidgetProps) {
 *   const [count, setCount] = usePersistentWidgetState(api, 'count', 0)
 *
 *   return (
 *     <button onClick={() => setCount(c => c + 1)}>
 *       Clicked {count} times
 *     </button>
 *   )
 * }
 * ```
 */
export function usePersistentWidgetState<T>(
  api: PluginStorageAPI,
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  // Track if this is the initial mount to avoid unnecessary writes
  const isInitialMount = useRef(true)

  // Initialize state from localStorage if available
  const [state, setStateInternal] = useState<T>(() => {
    try {
      const saved = api.getData<T>(key)
      return saved !== null ? saved : initialValue
    } catch {
      return initialValue
    }
  })

  // Custom setState that also persists to storage
  const setState = useCallback(
    (value: T | ((prev: T) => T)) => {
      setStateInternal((prev) => {
        const newValue = typeof value === 'function' ? (value as (prev: T) => T)(prev) : value
        // Persist immediately on state change
        try {
          api.setData(key, newValue)
        } catch (e) {
          console.warn(`[usePersistentWidgetState] Failed to persist state for key "${key}":`, e)
        }
        return newValue
      })
    },
    [api, key]
  )

  // Persist initial value on first mount if no saved value exists
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      const saved = api.getData<T>(key)
      if (saved === null) {
        try {
          api.setData(key, initialValue)
        } catch {
          // Ignore persistence errors on initial mount
        }
      }
    }
  }, [api, key, initialValue])

  return [state, setState]
}

/**
 * Hook for persisting timer state with automatic time compensation
 *
 * Handles the case where a timer is running when the widget unmounts,
 * compensating for elapsed time on remount.
 *
 * @param api - Plugin API instance
 * @param key - Unique key for timer state
 * @param initialState - Default timer state
 * @returns Tuple of [state, setState] with time compensation
 *
 * @example
 * ```tsx
 * function TimerWidget({ api }: WidgetProps) {
 *   const [timer, setTimer] = usePersistentTimerState(api, 'timer', {
 *     timeLeft: 25 * 60,
 *     isRunning: false,
 *     lastTick: Date.now(),
 *   })
 *
 *   // Timer will automatically compensate for time elapsed while unmounted
 * }
 * ```
 */
export interface TimerState {
  timeLeft: number
  isRunning: boolean
  lastTick: number
  [key: string]: unknown
}

export function usePersistentTimerState<T extends TimerState>(
  api: PluginStorageAPI,
  key: string,
  initialState: T
): [T, (value: T | ((prev: T) => T)) => void] {
  const hasCompensated = useRef(false)

  // Initialize with time compensation if timer was running
  const [state, setStateInternal] = useState<T>(() => {
    try {
      const saved = api.getData<T>(key)
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
    (value: T | ((prev: T) => T)) => {
      setStateInternal((prev) => {
        const newValue = typeof value === 'function' ? (value as (prev: T) => T)(prev) : value
        // Always update lastTick when running
        const valueToSave = newValue.isRunning
          ? { ...newValue, lastTick: Date.now() }
          : newValue
        try {
          api.setData(key, valueToSave)
        } catch (e) {
          console.warn(`[usePersistentTimerState] Failed to persist state for key "${key}":`, e)
        }
        return valueToSave
      })
    },
    [api, key]
  )

  // Persist initial state on mount
  useEffect(() => {
    if (!hasCompensated.current) {
      const saved = api.getData<T>(key)
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

export default usePersistentWidgetState
