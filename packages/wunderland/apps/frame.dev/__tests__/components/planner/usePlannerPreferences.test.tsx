/**
 * Tests for usePlannerPreferences Hook
 * @module __tests__/unit/planner/usePlannerPreferences.test
 *
 * Tests for the planner preferences hook including:
 * - Loading and initialization
 * - Setting individual preferences
 * - Setting multiple preferences
 * - Resetting to defaults
 * - Utility functions (time formatting, work hours)
 *
 * @vitest-environment happy-dom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'

// Use vi.hoisted to ensure mocks are available
const { mockDbAll, mockDbRun, mockGetDatabase } = vi.hoisted(() => ({
  mockDbAll: vi.fn(),
  mockDbRun: vi.fn(),
  mockGetDatabase: vi.fn(),
}))

// Mock the database module
vi.mock('@/lib/codexDatabase', () => ({
  getDatabase: mockGetDatabase,
}))

// Import after mocks are defined
import {
  usePlannerPreferences,
  DEFAULT_PREFERENCES,
  WEEK_START_OPTIONS,
  TIME_FORMAT_OPTIONS,
  DEFAULT_DURATION_OPTIONS,
  REMINDER_OPTIONS,
  VIEW_OPTIONS,
  formatTimeWithPreference,
  getWorkHours,
  isWorkHour,
  type PlannerPreferences,
} from '@/lib/planner/hooks/usePlannerPreferences'

describe('usePlannerPreferences', () => {
  const mockDb = {
    all: mockDbAll,
    run: mockDbRun,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockGetDatabase.mockResolvedValue(mockDb)
    mockDbAll.mockResolvedValue([])
    mockDbRun.mockResolvedValue({ changes: 1 })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('initialization', () => {
    it('starts with loading state', async () => {
      const { result } = renderHook(() => usePlannerPreferences())

      expect(result.current.isLoading).toBe(true)

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
    })

    it('initializes with default preferences', async () => {
      const { result } = renderHook(() => usePlannerPreferences())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.preferences).toEqual(DEFAULT_PREFERENCES)
    })

    it('loads preferences from database on mount', async () => {
      const storedPrefs = [
        { key: 'defaultView', value: JSON.stringify('week') },
        { key: 'timeFormat', value: JSON.stringify('24h') },
        { key: 'workDayStart', value: JSON.stringify(8) },
      ]
      mockDbAll.mockResolvedValueOnce(storedPrefs)

      const { result } = renderHook(() => usePlannerPreferences())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(mockDbAll).toHaveBeenCalledWith('SELECT key, value FROM planner_preferences')
      expect(result.current.preferences.defaultView).toBe('week')
      expect(result.current.preferences.timeFormat).toBe('24h')
      expect(result.current.preferences.workDayStart).toBe(8)
    })

    it('uses default preferences when database is unavailable', async () => {
      mockGetDatabase.mockResolvedValueOnce(null)

      const { result } = renderHook(() => usePlannerPreferences())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.preferences).toEqual(DEFAULT_PREFERENCES)
    })

    it('handles database errors gracefully', async () => {
      mockDbAll.mockRejectedValueOnce(new Error('Database error'))
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const { result } = renderHook(() => usePlannerPreferences())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.preferences).toEqual(DEFAULT_PREFERENCES)
      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })

    it('ignores invalid JSON in stored preferences', async () => {
      const storedPrefs = [
        { key: 'defaultView', value: 'invalid-json' },
        { key: 'timeFormat', value: JSON.stringify('24h') },
      ]
      mockDbAll.mockResolvedValueOnce(storedPrefs)

      const { result } = renderHook(() => usePlannerPreferences())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Invalid JSON should be skipped, default value used
      expect(result.current.preferences.defaultView).toBe('day')
      // Valid JSON should be parsed
      expect(result.current.preferences.timeFormat).toBe('24h')
    })

    it('ignores unknown preference keys', async () => {
      const storedPrefs = [
        { key: 'unknownKey', value: JSON.stringify('some-value') },
        { key: 'timeFormat', value: JSON.stringify('24h') },
      ]
      mockDbAll.mockResolvedValueOnce(storedPrefs)

      const { result } = renderHook(() => usePlannerPreferences())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.preferences.timeFormat).toBe('24h')
      expect((result.current.preferences as Record<string, unknown>)['unknownKey']).toBeUndefined()
    })
  })

  describe('setPreference', () => {
    it('updates a single preference', async () => {
      const { result } = renderHook(() => usePlannerPreferences())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      act(() => {
        result.current.setPreference('defaultView', 'week')
      })

      expect(result.current.preferences.defaultView).toBe('week')
    })

    it('persists preference to database', async () => {
      const { result } = renderHook(() => usePlannerPreferences())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      act(() => {
        result.current.setPreference('timeFormat', '24h')
      })

      await waitFor(() => {
        expect(mockDbRun).toHaveBeenCalledWith(
          expect.stringContaining('INSERT INTO planner_preferences'),
          expect.arrayContaining(['timeFormat', JSON.stringify('24h')])
        )
      })
    })

    it('updates work hours correctly', async () => {
      const { result } = renderHook(() => usePlannerPreferences())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      act(() => {
        result.current.setPreference('workDayStart', 7)
        result.current.setPreference('workDayEnd', 18)
      })

      expect(result.current.preferences.workDayStart).toBe(7)
      expect(result.current.preferences.workDayEnd).toBe(18)
    })

    it('updates week start day correctly', async () => {
      const { result } = renderHook(() => usePlannerPreferences())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      act(() => {
        result.current.setPreference('weekStartsOn', 1) // Monday
      })

      expect(result.current.preferences.weekStartsOn).toBe(1)
    })

    it('updates boolean preferences correctly', async () => {
      const { result } = renderHook(() => usePlannerPreferences())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      act(() => {
        result.current.setPreference('showWeekNumbers', true)
        result.current.setPreference('hideWeekends', true)
        result.current.setPreference('compactMode', true)
      })

      expect(result.current.preferences.showWeekNumbers).toBe(true)
      expect(result.current.preferences.hideWeekends).toBe(true)
      expect(result.current.preferences.compactMode).toBe(true)
    })

    it('handles database unavailability when saving', async () => {
      mockGetDatabase.mockResolvedValue(null)

      const { result } = renderHook(() => usePlannerPreferences())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Should not throw, just skip persistence
      act(() => {
        result.current.setPreference('defaultView', 'week')
      })

      expect(result.current.preferences.defaultView).toBe('week')
    })
  })

  describe('setPreferences', () => {
    it('updates multiple preferences at once', async () => {
      const { result } = renderHook(() => usePlannerPreferences())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      act(() => {
        result.current.setPreferences({
          defaultView: 'month',
          timeFormat: '24h',
          workDayStart: 8,
          workDayEnd: 18,
        })
      })

      expect(result.current.preferences.defaultView).toBe('month')
      expect(result.current.preferences.timeFormat).toBe('24h')
      expect(result.current.preferences.workDayStart).toBe(8)
      expect(result.current.preferences.workDayEnd).toBe(18)
    })

    it('preserves unmodified preferences', async () => {
      const { result } = renderHook(() => usePlannerPreferences())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const originalReminderMinutes = result.current.preferences.defaultReminderMinutes

      act(() => {
        result.current.setPreferences({
          defaultView: 'agenda',
        })
      })

      expect(result.current.preferences.defaultReminderMinutes).toBe(originalReminderMinutes)
    })

    it('persists all preferences to database', async () => {
      const { result } = renderHook(() => usePlannerPreferences())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      act(() => {
        result.current.setPreferences({
          defaultView: 'week',
          timeFormat: '24h',
        })
      })

      await waitFor(() => {
        // Should call db.run for each preference key
        expect(mockDbRun.mock.calls.length).toBeGreaterThan(0)
      })
    })
  })

  describe('resetToDefaults', () => {
    it('resets all preferences to defaults', async () => {
      const { result } = renderHook(() => usePlannerPreferences())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Modify some preferences
      act(() => {
        result.current.setPreferences({
          defaultView: 'month',
          timeFormat: '24h',
          workDayStart: 7,
        })
      })

      expect(result.current.preferences.defaultView).toBe('month')

      // Reset
      await act(async () => {
        await result.current.resetToDefaults()
      })

      expect(result.current.preferences).toEqual(DEFAULT_PREFERENCES)
    })

    it('clears preferences from database', async () => {
      const { result } = renderHook(() => usePlannerPreferences())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      await act(async () => {
        await result.current.resetToDefaults()
      })

      expect(mockDbRun).toHaveBeenCalledWith('DELETE FROM planner_preferences')
    })
  })

  describe('refresh', () => {
    it('reloads preferences from database', async () => {
      const { result } = renderHook(() => usePlannerPreferences())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Simulate database has been updated externally
      mockDbAll.mockResolvedValueOnce([
        { key: 'defaultView', value: JSON.stringify('timeline') },
      ])

      await act(async () => {
        result.current.refresh()
      })

      await waitFor(() => {
        expect(result.current.preferences.defaultView).toBe('timeline')
      })
    })

    it('sets loading state during refresh', async () => {
      const { result } = renderHook(() => usePlannerPreferences())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      let loadingDuringRefresh = false
      mockDbAll.mockImplementationOnce(async () => {
        loadingDuringRefresh = result.current.isLoading
        return []
      })

      await act(async () => {
        result.current.refresh()
      })

      // Check loading was set during the refresh
      expect(loadingDuringRefresh).toBe(true)
    })
  })
})

describe('DEFAULT_PREFERENCES', () => {
  it('has correct default values', () => {
    expect(DEFAULT_PREFERENCES.defaultView).toBe('day')
    expect(DEFAULT_PREFERENCES.weekStartsOn).toBe(0) // Sunday
    expect(DEFAULT_PREFERENCES.timeFormat).toBe('12h')
    expect(DEFAULT_PREFERENCES.workDayStart).toBe(9)
    expect(DEFAULT_PREFERENCES.workDayEnd).toBe(17)
    expect(DEFAULT_PREFERENCES.defaultEventDuration).toBe(60)
    expect(DEFAULT_PREFERENCES.defaultReminderMinutes).toBe(15)
    expect(DEFAULT_PREFERENCES.showWeekNumbers).toBe(false)
    expect(DEFAULT_PREFERENCES.hideWeekends).toBe(false)
    expect(DEFAULT_PREFERENCES.showDeclinedEvents).toBe(false)
    expect(DEFAULT_PREFERENCES.compactMode).toBe(false)
    expect(DEFAULT_PREFERENCES.enableBrowserNotifications).toBe(true)
    expect(DEFAULT_PREFERENCES.enableSoundAlerts).toBe(false)
  })
})

describe('Option constants', () => {
  describe('WEEK_START_OPTIONS', () => {
    it('includes Sunday, Monday, and Saturday', () => {
      expect(WEEK_START_OPTIONS).toHaveLength(3)
      expect(WEEK_START_OPTIONS.map(o => o.value)).toEqual([0, 1, 6])
      expect(WEEK_START_OPTIONS.map(o => o.label)).toEqual(['Sunday', 'Monday', 'Saturday'])
    })
  })

  describe('TIME_FORMAT_OPTIONS', () => {
    it('includes 12h and 24h formats', () => {
      expect(TIME_FORMAT_OPTIONS).toHaveLength(2)
      expect(TIME_FORMAT_OPTIONS.map(o => o.value)).toEqual(['12h', '24h'])
    })
  })

  describe('DEFAULT_DURATION_OPTIONS', () => {
    it('includes common duration values', () => {
      expect(DEFAULT_DURATION_OPTIONS.map(o => o.value)).toContain(15)
      expect(DEFAULT_DURATION_OPTIONS.map(o => o.value)).toContain(30)
      expect(DEFAULT_DURATION_OPTIONS.map(o => o.value)).toContain(60)
      expect(DEFAULT_DURATION_OPTIONS.map(o => o.value)).toContain(120)
    })
  })

  describe('REMINDER_OPTIONS', () => {
    it('includes common reminder times', () => {
      const values = REMINDER_OPTIONS.map(o => o.value)
      expect(values).toContain(0) // At time
      expect(values).toContain(5) // 5 min before
      expect(values).toContain(15) // 15 min before
      expect(values).toContain(60) // 1 hour before
      expect(values).toContain(1440) // 1 day before
    })
  })

  describe('VIEW_OPTIONS', () => {
    it('includes all planner views', () => {
      const values = VIEW_OPTIONS.map(o => o.value)
      expect(values).toContain('day')
      expect(values).toContain('week')
      expect(values).toContain('month')
      expect(values).toContain('agenda')
      expect(values).toContain('timeline')
    })
  })
})

describe('Utility functions', () => {
  describe('formatTimeWithPreference', () => {
    it('formats time in 12-hour format', () => {
      const date = new Date('2024-01-15T14:30:00')
      const formatted = formatTimeWithPreference(date, '12h')

      expect(formatted).toMatch(/2:30\s*PM/i)
    })

    it('formats time in 24-hour format', () => {
      const date = new Date('2024-01-15T14:30:00')
      const formatted = formatTimeWithPreference(date, '24h')

      expect(formatted).toBe('14:30')
    })

    it('handles midnight correctly in 12h format', () => {
      const date = new Date('2024-01-15T00:00:00')
      const formatted = formatTimeWithPreference(date, '12h')

      expect(formatted).toMatch(/12:00\s*AM/i)
    })

    it('handles midnight correctly in 24h format', () => {
      const date = new Date('2024-01-15T00:00:00')
      const formatted = formatTimeWithPreference(date, '24h')

      expect(formatted).toBe('00:00')
    })

    it('handles noon correctly in 12h format', () => {
      const date = new Date('2024-01-15T12:00:00')
      const formatted = formatTimeWithPreference(date, '12h')

      expect(formatted).toMatch(/12:00\s*PM/i)
    })

    it('handles noon correctly in 24h format', () => {
      const date = new Date('2024-01-15T12:00:00')
      const formatted = formatTimeWithPreference(date, '24h')

      expect(formatted).toBe('12:00')
    })
  })

  describe('getWorkHours', () => {
    it('returns array of hours from start to end', () => {
      const hours = getWorkHours(9, 17)

      expect(hours).toEqual([9, 10, 11, 12, 13, 14, 15, 16, 17])
    })

    it('handles early morning hours', () => {
      const hours = getWorkHours(5, 8)

      expect(hours).toEqual([5, 6, 7, 8])
    })

    it('handles late night hours', () => {
      const hours = getWorkHours(20, 23)

      expect(hours).toEqual([20, 21, 22, 23])
    })

    it('handles single hour range', () => {
      const hours = getWorkHours(12, 12)

      expect(hours).toEqual([12])
    })

    it('returns empty-like array when start > end', () => {
      const hours = getWorkHours(17, 9)

      // Based on the implementation, this would return empty since for loop won't run
      expect(hours).toEqual([])
    })
  })

  describe('isWorkHour', () => {
    it('returns true for hours within work hours', () => {
      expect(isWorkHour(9, 9, 17)).toBe(true)
      expect(isWorkHour(12, 9, 17)).toBe(true)
      expect(isWorkHour(16, 9, 17)).toBe(true)
    })

    it('returns false for hours outside work hours', () => {
      expect(isWorkHour(8, 9, 17)).toBe(false)
      expect(isWorkHour(17, 9, 17)).toBe(false) // end hour is exclusive
      expect(isWorkHour(18, 9, 17)).toBe(false)
    })

    it('returns false for midnight', () => {
      expect(isWorkHour(0, 9, 17)).toBe(false)
    })

    it('handles custom work hours', () => {
      expect(isWorkHour(6, 6, 14)).toBe(true)
      expect(isWorkHour(13, 6, 14)).toBe(true)
      expect(isWorkHour(5, 6, 14)).toBe(false)
    })
  })
})

describe('Type safety', () => {
  it('PlannerPreferences has all required fields', () => {
    const prefs: PlannerPreferences = DEFAULT_PREFERENCES

    // Type assertions - these will fail to compile if types are wrong
    const _view: 'day' | 'week' | 'month' | 'agenda' | 'timeline' = prefs.defaultView
    const _weekStart: 0 | 1 | 6 = prefs.weekStartsOn
    const _timeFormat: '12h' | '24h' = prefs.timeFormat
    const _workStart: number = prefs.workDayStart
    const _workEnd: number = prefs.workDayEnd
    const _duration: number = prefs.defaultEventDuration
    const _reminder: number = prefs.defaultReminderMinutes
    const _showWeek: boolean = prefs.showWeekNumbers
    const _hideWeekends: boolean = prefs.hideWeekends
    const _showDeclined: boolean = prefs.showDeclinedEvents
    const _compact: boolean = prefs.compactMode
    const _browserNotif: boolean = prefs.enableBrowserNotifications
    const _sound: boolean = prefs.enableSoundAlerts

    // If we get here, types are correct
    expect(prefs).toBeDefined()
  })
})
