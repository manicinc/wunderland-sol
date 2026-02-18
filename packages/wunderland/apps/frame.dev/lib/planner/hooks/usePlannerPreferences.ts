/**
 * usePlannerPreferences Hook
 *
 * Manages user preferences for the planner including:
 * - Default view (day/week/month/agenda/timeline)
 * - Work hours (start/end)
 * - Week start day
 * - Time format (12/24hr)
 * - Default event duration
 * - Default reminder time
 * - Display options
 *
 * @module lib/planner/hooks/usePlannerPreferences
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { getDatabase } from '@/lib/codexDatabase'
import type { PlannerView } from '../types'

// ============================================================================
// TYPES
// ============================================================================

export interface PlannerPreferences {
  // View settings
  defaultView: PlannerView
  weekStartsOn: 0 | 1 | 6 // 0 = Sunday, 1 = Monday, 6 = Saturday

  // Time settings
  timeFormat: '12h' | '24h'
  workDayStart: number // Hour (0-23), e.g., 9 for 9am
  workDayEnd: number // Hour (0-23), e.g., 17 for 5pm

  // Event defaults
  defaultEventDuration: number // Minutes
  defaultReminderMinutes: number // Minutes before event

  // Display options
  showWeekNumbers: boolean
  hideWeekends: boolean
  showDeclinedEvents: boolean
  compactMode: boolean

  // Notifications
  enableBrowserNotifications: boolean
  enableSoundAlerts: boolean
}

export const DEFAULT_PREFERENCES: PlannerPreferences = {
  defaultView: 'day',
  weekStartsOn: 0,
  timeFormat: '12h',
  workDayStart: 9,
  workDayEnd: 17,
  defaultEventDuration: 60,
  defaultReminderMinutes: 15,
  showWeekNumbers: false,
  hideWeekends: false,
  showDeclinedEvents: false,
  compactMode: false,
  enableBrowserNotifications: true,
  enableSoundAlerts: false,
}

export const WEEK_START_OPTIONS = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 6, label: 'Saturday' },
] as const

export const TIME_FORMAT_OPTIONS = [
  { value: '12h', label: '12-hour (1:00 PM)' },
  { value: '24h', label: '24-hour (13:00)' },
] as const

export const DEFAULT_DURATION_OPTIONS = [
  { value: 15, label: '15 minutes' },
  { value: 30, label: '30 minutes' },
  { value: 45, label: '45 minutes' },
  { value: 60, label: '1 hour' },
  { value: 90, label: '1.5 hours' },
  { value: 120, label: '2 hours' },
] as const

export const REMINDER_OPTIONS = [
  { value: 0, label: 'At time of event' },
  { value: 5, label: '5 minutes before' },
  { value: 10, label: '10 minutes before' },
  { value: 15, label: '15 minutes before' },
  { value: 30, label: '30 minutes before' },
  { value: 60, label: '1 hour before' },
  { value: 1440, label: '1 day before' },
] as const

export const VIEW_OPTIONS: { value: PlannerView; label: string }[] = [
  { value: 'day', label: 'Day View' },
  { value: 'week', label: 'Week View' },
  { value: 'month', label: 'Month View' },
  { value: 'agenda', label: 'Agenda View' },
  { value: 'timeline', label: 'Timeline View' },
]

// ============================================================================
// DATABASE OPERATIONS
// ============================================================================

async function loadPreferences(): Promise<PlannerPreferences> {
  const db = await getDatabase()
  if (!db) return DEFAULT_PREFERENCES

  try {
    const rows = await db.all<{ key: string; value: string }>(
      'SELECT key, value FROM planner_preferences'
    )

    const prefs = { ...DEFAULT_PREFERENCES }
    for (const row of rows) {
      try {
        const value = JSON.parse(row.value)
        if (row.key in prefs) {
          ;(prefs as Record<string, unknown>)[row.key] = value
        }
      } catch {
        // Skip invalid JSON
      }
    }
    return prefs
  } catch (error) {
    console.error('[PlannerPreferences] Failed to load:', error)
    return DEFAULT_PREFERENCES
  }
}

async function savePreference<K extends keyof PlannerPreferences>(
  key: K,
  value: PlannerPreferences[K]
): Promise<void> {
  const db = await getDatabase()
  if (!db) return

  try {
    await db.run(
      `INSERT INTO planner_preferences (key, value, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      [key, JSON.stringify(value), new Date().toISOString()]
    )
  } catch (error) {
    console.error('[PlannerPreferences] Failed to save:', error)
  }
}

async function saveAllPreferences(prefs: PlannerPreferences): Promise<void> {
  const db = await getDatabase()
  if (!db) return

  try {
    const now = new Date().toISOString()
    for (const [key, value] of Object.entries(prefs)) {
      await db.run(
        `INSERT INTO planner_preferences (key, value, updated_at)
         VALUES (?, ?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
        [key, JSON.stringify(value), now]
      )
    }
  } catch (error) {
    console.error('[PlannerPreferences] Failed to save all:', error)
  }
}

async function resetPreferencesToDefaults(): Promise<void> {
  const db = await getDatabase()
  if (!db) return

  try {
    await db.run('DELETE FROM planner_preferences')
  } catch (error) {
    console.error('[PlannerPreferences] Failed to reset:', error)
  }
}

// ============================================================================
// HOOK
// ============================================================================

export interface UsePlannerPreferencesReturn {
  preferences: PlannerPreferences
  isLoading: boolean

  // Update single preference
  setPreference: <K extends keyof PlannerPreferences>(
    key: K,
    value: PlannerPreferences[K]
  ) => void

  // Update multiple preferences
  setPreferences: (updates: Partial<PlannerPreferences>) => void

  // Reset to defaults
  resetToDefaults: () => void

  // Refresh from database
  refresh: () => void
}

export function usePlannerPreferences(): UsePlannerPreferencesReturn {
  const [preferences, setPreferencesState] = useState<PlannerPreferences>(DEFAULT_PREFERENCES)
  const [isLoading, setIsLoading] = useState(true)

  // Load preferences on mount
  const load = useCallback(async () => {
    setIsLoading(true)
    const prefs = await loadPreferences()
    setPreferencesState(prefs)
    setIsLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // Set single preference
  const setPreference = useCallback(
    <K extends keyof PlannerPreferences>(key: K, value: PlannerPreferences[K]) => {
      setPreferencesState((prev) => {
        const next = { ...prev, [key]: value }
        savePreference(key, value)
        return next
      })
    },
    []
  )

  // Set multiple preferences
  const setPreferences = useCallback((updates: Partial<PlannerPreferences>) => {
    setPreferencesState((prev) => {
      const next = { ...prev, ...updates }
      saveAllPreferences(next)
      return next
    })
  }, [])

  // Reset to defaults
  const resetToDefaults = useCallback(async () => {
    await resetPreferencesToDefaults()
    setPreferencesState(DEFAULT_PREFERENCES)
  }, [])

  return {
    preferences,
    isLoading,
    setPreference,
    setPreferences,
    resetToDefaults,
    refresh: load,
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Format time according to user preference
 */
export function formatTimeWithPreference(
  date: Date,
  format: '12h' | '24h'
): string {
  if (format === '24h') {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
  }
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

/**
 * Get work hours as array of hour numbers
 */
export function getWorkHours(start: number, end: number): number[] {
  const hours: number[] = []
  for (let h = start; h <= end; h++) {
    hours.push(h)
  }
  return hours
}

/**
 * Check if a given hour is within work hours
 */
export function isWorkHour(hour: number, start: number, end: number): boolean {
  return hour >= start && hour < end
}
