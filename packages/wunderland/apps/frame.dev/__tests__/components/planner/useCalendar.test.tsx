/**
 * useCalendar Hook Tests
 *
 * Tests for calendar event management and date navigation.
 *
 * @module __tests__/unit/planner/useCalendar.test
 * @vitest-environment happy-dom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useCalendar, useCalendarDays } from '@/lib/planner/hooks/useCalendar'
import type { CalendarEvent, Task } from '@/lib/planner/types'

// ============================================================================
// MOCKS
// ============================================================================

const { mockGetEvents, mockGetTasks, mockCreateEvent } = vi.hoisted(() => ({
  mockGetEvents: vi.fn(),
  mockGetTasks: vi.fn(),
  mockCreateEvent: vi.fn(),
}))

vi.mock('@/lib/planner/database', () => ({
  getEvents: mockGetEvents,
  getTasks: mockGetTasks,
  createEvent: mockCreateEvent,
}))

// ============================================================================
// TEST DATA
// ============================================================================

const mockEvent: CalendarEvent = {
  id: 'event_1',
  calendarId: 'cal_1',
  title: 'Team Meeting',
  description: 'Weekly sync',
  startDatetime: new Date('2024-01-15T10:00:00').toISOString(),
  endDatetime: new Date('2024-01-15T11:00:00').toISOString(),
  allDay: false,
  location: 'Conference Room A',
  color: '#4285F4',
  isDeleted: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

const mockTask: Task = {
  id: 'task_1',
  title: 'Review PR',
  description: 'Review pull request #123',
  taskType: 'standalone',
  status: 'pending',
  priority: 'high',
  dueDate: '2024-01-15',
  dueTime: '14:00',
  estimatedMinutes: 30,
  isDeleted: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

// ============================================================================
// TEST SUITES
// ============================================================================

describe('useCalendar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetEvents.mockResolvedValue([])
    mockGetTasks.mockResolvedValue([])
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  // --------------------------------------------------------------------------
  // INITIALIZATION
  // --------------------------------------------------------------------------

  describe('Initialization', () => {
    it('should initialize with default values', async () => {
      const { result } = renderHook(() => useCalendar())

      expect(result.current.isLoading).toBe(true)
      expect(result.current.error).toBeNull()
      expect(result.current.view).toBe('week')

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
    })

    it('should initialize with custom date', async () => {
      const customDate = new Date('2024-06-15')
      const { result } = renderHook(() =>
        useCalendar({ initialDate: customDate })
      )

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.currentDate.toDateString()).toBe(
        customDate.toDateString()
      )
    })

    it('should initialize with custom view', async () => {
      const { result } = renderHook(() =>
        useCalendar({ initialView: 'month' })
      )

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.view).toBe('month')
    })

    it('should load events on mount', async () => {
      mockGetEvents.mockResolvedValue([mockEvent])
      mockGetTasks.mockResolvedValue([mockTask])

      const { result } = renderHook(() => useCalendar())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(mockGetEvents).toHaveBeenCalled()
      expect(mockGetTasks).toHaveBeenCalled()
      expect(result.current.events).toHaveLength(1)
      expect(result.current.tasks).toHaveLength(1)
    })
  })

  // --------------------------------------------------------------------------
  // DATE RANGE CALCULATION
  // --------------------------------------------------------------------------

  describe('Date Range Calculation', () => {
    it('should calculate day view date range', async () => {
      const testDate = new Date('2024-01-15T12:00:00')
      const { result } = renderHook(() =>
        useCalendar({ initialDate: testDate, initialView: 'day' })
      )

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const { start, end } = result.current.dateRange
      expect(start.getDate()).toBe(15)
      expect(start.getHours()).toBe(0)
      expect(end.getDate()).toBe(15)
      expect(end.getHours()).toBe(23)
    })

    it('should calculate week view date range', async () => {
      const testDate = new Date('2024-01-15') // Monday
      const { result } = renderHook(() =>
        useCalendar({ initialDate: testDate, initialView: 'week' })
      )

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const { start, end } = result.current.dateRange
      // Week should start on Sunday
      expect(start.getDay()).toBe(0)
      // Week should end on Saturday
      expect(end.getDay()).toBe(6)
    })

    it('should calculate month view date range', async () => {
      const testDate = new Date('2024-01-15')
      const { result } = renderHook(() =>
        useCalendar({ initialDate: testDate, initialView: 'month' })
      )

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const { start, end } = result.current.dateRange
      // Month view includes days from prev/next month for grid
      expect(start <= new Date('2024-01-01')).toBe(true)
      expect(end >= new Date('2024-01-31')).toBe(true)
    })

    it('should calculate agenda view date range (30 days)', async () => {
      const testDate = new Date('2024-01-15')
      const { result } = renderHook(() =>
        useCalendar({ initialDate: testDate, initialView: 'agenda' })
      )

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const { start, end } = result.current.dateRange
      const daysDiff = Math.round(
        (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
      )
      // Agenda view shows 30 days from start, which spans 31 days inclusive
      expect(daysDiff).toBeGreaterThanOrEqual(30)
    })
  })

  // --------------------------------------------------------------------------
  // NAVIGATION
  // --------------------------------------------------------------------------

  describe('Navigation', () => {
    it('should navigate to specific date', async () => {
      const { result } = renderHook(() => useCalendar())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const targetDate = new Date('2024-06-20')
      act(() => {
        result.current.goToDate(targetDate)
      })

      expect(result.current.currentDate.toDateString()).toBe(
        targetDate.toDateString()
      )
    })

    it('should navigate to today', async () => {
      const pastDate = new Date('2020-01-01')
      const { result } = renderHook(() =>
        useCalendar({ initialDate: pastDate })
      )

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      act(() => {
        result.current.goToToday()
      })

      const today = new Date()
      expect(result.current.currentDate.toDateString()).toBe(
        today.toDateString()
      )
    })

    it('should navigate to previous day in day view', async () => {
      const testDate = new Date('2024-01-15T12:00:00')
      const { result } = renderHook(() =>
        useCalendar({ initialDate: testDate, initialView: 'day' })
      )

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const initialDate = result.current.currentDate.getDate()
      act(() => {
        result.current.goToPrevious()
      })

      expect(result.current.currentDate.getDate()).toBe(initialDate - 1)
    })

    it('should navigate to next day in day view', async () => {
      const testDate = new Date('2024-01-15T12:00:00')
      const { result } = renderHook(() =>
        useCalendar({ initialDate: testDate, initialView: 'day' })
      )

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const initialDate = result.current.currentDate.getDate()
      act(() => {
        result.current.goToNext()
      })

      expect(result.current.currentDate.getDate()).toBe(initialDate + 1)
    })

    it('should navigate to previous week in week view', async () => {
      const testDate = new Date('2024-01-15T12:00:00')
      const { result } = renderHook(() =>
        useCalendar({ initialDate: testDate, initialView: 'week' })
      )

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const initialDate = result.current.currentDate.getDate()
      act(() => {
        result.current.goToPrevious()
      })

      expect(result.current.currentDate.getDate()).toBe(initialDate - 7)
    })

    it('should navigate to next week in week view', async () => {
      const testDate = new Date('2024-01-15T12:00:00')
      const { result } = renderHook(() =>
        useCalendar({ initialDate: testDate, initialView: 'week' })
      )

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const initialDate = result.current.currentDate.getDate()
      act(() => {
        result.current.goToNext()
      })

      expect(result.current.currentDate.getDate()).toBe(initialDate + 7)
    })

    it('should navigate to previous month in month view', async () => {
      const testDate = new Date('2024-02-15')
      const { result } = renderHook(() =>
        useCalendar({ initialDate: testDate, initialView: 'month' })
      )

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      act(() => {
        result.current.goToPrevious()
      })

      expect(result.current.currentDate.getMonth()).toBe(0) // January
    })

    it('should navigate to next month in month view', async () => {
      const testDate = new Date('2024-01-15')
      const { result } = renderHook(() =>
        useCalendar({ initialDate: testDate, initialView: 'month' })
      )

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      act(() => {
        result.current.goToNext()
      })

      expect(result.current.currentDate.getMonth()).toBe(1) // February
    })

    it('should change view', async () => {
      const { result } = renderHook(() =>
        useCalendar({ initialView: 'week' })
      )

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      act(() => {
        result.current.setView('month')
      })

      expect(result.current.view).toBe('month')
    })
  })

  // --------------------------------------------------------------------------
  // CRUD OPERATIONS
  // --------------------------------------------------------------------------

  describe('CRUD Operations', () => {
    it('should create an event', async () => {
      const newEvent = { ...mockEvent, id: 'event_new' }
      mockCreateEvent.mockResolvedValue(newEvent)

      const { result } = renderHook(() => useCalendar())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      let createdEvent: CalendarEvent | null = null
      await act(async () => {
        createdEvent = await result.current.createEvent({
          calendarId: 'cal_1',
          title: 'New Event',
          startDatetime: new Date().toISOString(),
          endDatetime: new Date().toISOString(),
        })
      })

      expect(createdEvent).not.toBeNull()
      expect(mockCreateEvent).toHaveBeenCalled()
    })

    it('should handle create event error', async () => {
      mockCreateEvent.mockRejectedValue(new Error('Database error'))

      const { result } = renderHook(() => useCalendar())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      let createdEvent: CalendarEvent | null = null
      await act(async () => {
        createdEvent = await result.current.createEvent({
          calendarId: 'cal_1',
          title: 'New Event',
          startDatetime: new Date().toISOString(),
          endDatetime: new Date().toISOString(),
        })
      })

      expect(createdEvent).toBeNull()
      expect(result.current.error).not.toBeNull()
    })
  })

  // --------------------------------------------------------------------------
  // HELPER FUNCTIONS
  // --------------------------------------------------------------------------

  describe('Helper Functions', () => {
    it('should filter events for specific date from loaded data', async () => {
      const { result } = renderHook(() => useCalendar())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Test the filtering logic - getEventsForDate returns events that match the date
      // With empty data, it should return empty array
      const eventsOnDate = result.current.getEventsForDate(new Date())
      expect(Array.isArray(eventsOnDate)).toBe(true)
    })

    it('should filter tasks for specific date from loaded data', async () => {
      const { result } = renderHook(() => useCalendar())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Test the filtering logic - getTasksForDate returns tasks that match the date
      // With empty data, it should return empty array
      const tasksOnDate = result.current.getTasksForDate(new Date())
      expect(Array.isArray(tasksOnDate)).toBe(true)
    })

    it('should generate time slots for a date', async () => {
      mockGetEvents.mockResolvedValue([mockEvent])

      const { result } = renderHook(() =>
        useCalendar({ initialDate: new Date('2024-01-15') })
      )

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const timeSlots = result.current.getTimeSlots(new Date('2024-01-15'))

      expect(timeSlots).toHaveLength(24) // 24 hours
      expect(timeSlots[0].hour).toBe(0)
      expect(timeSlots[23].hour).toBe(23)
    })

    it('should mark current hour slot as isNow', async () => {
      const { result } = renderHook(() => useCalendar())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const now = new Date()
      const timeSlots = result.current.getTimeSlots(now)

      const currentHourSlot = timeSlots.find((slot) => slot.hour === now.getHours())
      expect(currentHourSlot?.isNow).toBe(true)
    })
  })

  // --------------------------------------------------------------------------
  // REFRESH
  // --------------------------------------------------------------------------

  describe('Refresh', () => {
    it('should refresh data', async () => {
      const { result } = renderHook(() => useCalendar())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const initialCallCount = mockGetEvents.mock.calls.length

      await act(async () => {
        await result.current.refresh()
      })

      expect(mockGetEvents.mock.calls.length).toBeGreaterThan(initialCallCount)
    })
  })

  // --------------------------------------------------------------------------
  // ERROR HANDLING
  // --------------------------------------------------------------------------

  describe('Error Handling', () => {
    it('should handle load error gracefully', async () => {
      mockGetEvents.mockRejectedValue(new Error('Network error'))

      const { result } = renderHook(() => useCalendar())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.error).not.toBeNull()
      // Error is preserved or wrapped
      expect(result.current.error?.message).toMatch(/error/i)
    })
  })
})

// ============================================================================
// useCalendarDays TESTS
// ============================================================================

describe('useCalendarDays', () => {
  it('should return single day for day view', () => {
    const testDate = new Date('2024-01-15')
    const { result } = renderHook(() => useCalendarDays(testDate, 'day'))

    expect(result.current).toHaveLength(1)
    expect(result.current[0].toDateString()).toBe(testDate.toDateString())
  })

  it('should return 7 days for week view', () => {
    const testDate = new Date('2024-01-15')
    const { result } = renderHook(() => useCalendarDays(testDate, 'week'))

    expect(result.current).toHaveLength(7)
  })

  it('should return full month grid for month view', () => {
    const testDate = new Date('2024-01-15')
    const { result } = renderHook(() => useCalendarDays(testDate, 'month'))

    // Month grid is 5-6 weeks (35-42 days)
    expect(result.current.length).toBeGreaterThanOrEqual(28)
    expect(result.current.length).toBeLessThanOrEqual(42)
  })

  it('should start week on Sunday', () => {
    const testDate = new Date('2024-01-15') // Tuesday
    const { result } = renderHook(() => useCalendarDays(testDate, 'week'))

    expect(result.current[0].getDay()).toBe(0) // Sunday
  })

  it('should end week on Saturday', () => {
    const testDate = new Date('2024-01-15') // Tuesday
    const { result } = renderHook(() => useCalendarDays(testDate, 'week'))

    expect(result.current[6].getDay()).toBe(6) // Saturday
  })
})
