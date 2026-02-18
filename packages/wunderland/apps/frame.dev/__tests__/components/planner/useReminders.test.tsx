/**
 * Tests for useReminders Hook
 * @module __tests__/unit/planner/useReminders.test
 *
 * Tests for the reminders hook including:
 * - Loading and initialization
 * - Creating and deleting reminders
 * - Checking due reminders
 * - Notification permission handling
 * - Helper functions
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

// Mock Notification API
const mockNotification = vi.fn()
const mockNotificationInstance = {
  close: vi.fn(),
  onclick: null as (() => void) | null,
}

// Mock the global Notification
Object.defineProperty(global, 'Notification', {
  value: Object.assign(mockNotification, {
    permission: 'default',
    requestPermission: vi.fn().mockResolvedValue('granted'),
  }),
  writable: true,
  configurable: true,
})

mockNotification.mockImplementation(() => mockNotificationInstance)

// Mock AudioContext
const mockOscillator = {
  connect: vi.fn(),
  frequency: { value: 0 },
  type: 'sine',
  start: vi.fn(),
  stop: vi.fn(),
}

const mockGainNode = {
  connect: vi.fn(),
  gain: {
    setValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
  },
}

const mockAudioContext = {
  createOscillator: vi.fn().mockReturnValue(mockOscillator),
  createGain: vi.fn().mockReturnValue(mockGainNode),
  destination: {},
  currentTime: 0,
}

Object.defineProperty(global, 'AudioContext', {
  value: vi.fn().mockImplementation(() => mockAudioContext),
  writable: true,
  configurable: true,
})

// Import after mocks are defined
import {
  useReminders,
  REMINDER_INTERVALS,
  type Reminder,
} from '@/lib/planner/hooks/useReminders'

// Helper to create mock reminder data
function createMockReminder(overrides: Partial<Reminder> = {}): Reminder {
  return {
    id: `reminder_${Date.now()}_test`,
    eventId: 'event_1',
    remindAt: new Date(Date.now() + 60000), // 1 minute from now
    reminderType: 'notification',
    minutesBefore: 15,
    isSent: false,
    createdAt: new Date(),
    ...overrides,
  }
}

// Helper to create DB row format
function createMockDbRow(reminder: Partial<Reminder> = {}) {
  const r = createMockReminder(reminder)
  return {
    id: r.id,
    event_id: r.eventId || null,
    task_id: r.taskId || null,
    remind_at: r.remindAt.toISOString(),
    reminder_type: r.reminderType,
    minutes_before: r.minutesBefore,
    is_sent: r.isSent ? 1 : 0,
    sent_at: r.sentAt?.toISOString() || null,
    created_at: r.createdAt.toISOString(),
  }
}

describe('useReminders', () => {
  const mockDb = {
    all: mockDbAll,
    run: mockDbRun,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockGetDatabase.mockResolvedValue(mockDb)
    mockDbAll.mockResolvedValue([])
    mockDbRun.mockResolvedValue({ changes: 1 })

    // Reset Notification permission
    Object.defineProperty(Notification, 'permission', {
      value: 'default',
      writable: true,
      configurable: true,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('initialization', () => {
    it('starts with loading state', async () => {
      const { result } = renderHook(() => useReminders())

      expect(result.current.isLoading).toBe(true)

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
    })

    it('initializes with empty reminders array', async () => {
      const { result } = renderHook(() => useReminders())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.reminders).toEqual([])
    })

    it('loads reminders from database on mount', async () => {
      const mockReminders = [
        createMockDbRow({ id: 'reminder_1' }),
        createMockDbRow({ id: 'reminder_2' }),
      ]
      mockDbAll.mockResolvedValueOnce(mockReminders)

      const { result } = renderHook(() => useReminders())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(mockDbAll).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM event_reminders')
      )
      expect(result.current.reminders).toHaveLength(2)
    })

    it('handles database errors gracefully', async () => {
      mockDbAll.mockRejectedValueOnce(new Error('Database error'))
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const { result } = renderHook(() => useReminders())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.reminders).toEqual([])
      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })

    it('uses default notification permission', async () => {
      const { result } = renderHook(() => useReminders())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.notificationPermission).toBe('default')
    })

    it('reflects granted notification permission', async () => {
      Object.defineProperty(Notification, 'permission', {
        value: 'granted',
        writable: true,
        configurable: true,
      })

      const { result } = renderHook(() => useReminders())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.notificationPermission).toBe('granted')
    })
  })

  describe('createReminder', () => {
    it('creates a reminder and returns it', async () => {
      const { result } = renderHook(() => useReminders())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const eventTime = new Date(Date.now() + 3600000) // 1 hour from now
      let createdReminder: Reminder | null = null

      await act(async () => {
        createdReminder = await result.current.createReminder(
          {
            eventId: 'event_123',
            minutesBefore: 15,
            reminderType: 'notification',
          },
          eventTime
        )
      })

      expect(createdReminder).not.toBeNull()
      expect(createdReminder!.eventId).toBe('event_123')
      expect(createdReminder!.minutesBefore).toBe(15)
    })

    it('inserts reminder into database', async () => {
      const { result } = renderHook(() => useReminders())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const eventTime = new Date(Date.now() + 3600000)

      await act(async () => {
        await result.current.createReminder(
          {
            eventId: 'event_123',
            minutesBefore: 30,
          },
          eventTime
        )
      })

      expect(mockDbRun).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO event_reminders'),
        expect.arrayContaining(['event_123', null, expect.any(String)])
      )
    })

    it('calculates remind_at time correctly', async () => {
      const { result } = renderHook(() => useReminders())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const eventTime = new Date('2024-01-15T14:00:00Z')

      await act(async () => {
        await result.current.createReminder(
          {
            eventId: 'event_123',
            minutesBefore: 15, // Should be 13:45
          },
          eventTime
        )
      })

      // Check that the remindAt is 15 minutes before eventTime
      const insertCall = mockDbRun.mock.calls.find((call) =>
        call[0].includes('INSERT INTO event_reminders')
      )
      const remindAtArg = insertCall?.[1]?.[2]
      if (remindAtArg) {
        const remindAtDate = new Date(remindAtArg)
        expect(remindAtDate.getTime()).toBe(eventTime.getTime() - 15 * 60 * 1000)
      }
    })

    it('creates reminder with task ID instead of event ID', async () => {
      const { result } = renderHook(() => useReminders())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      await act(async () => {
        await result.current.createReminder(
          {
            taskId: 'task_456',
            minutesBefore: 10,
          },
          new Date(Date.now() + 3600000)
        )
      })

      expect(mockDbRun).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO event_reminders'),
        expect.arrayContaining([null, 'task_456'])
      )
    })

    it('returns null when database is unavailable', async () => {
      mockGetDatabase.mockResolvedValue(null)

      const { result } = renderHook(() => useReminders())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      let createdReminder: Reminder | null = null
      await act(async () => {
        createdReminder = await result.current.createReminder(
          { eventId: 'event_123', minutesBefore: 15 },
          new Date()
        )
      })

      expect(createdReminder).toBeNull()
    })
  })

  describe('deleteReminder', () => {
    it('deletes reminder from database', async () => {
      const mockReminders = [createMockDbRow({ id: 'reminder_to_delete' })]
      mockDbAll.mockResolvedValueOnce(mockReminders)

      const { result } = renderHook(() => useReminders())

      await waitFor(() => {
        expect(result.current.reminders).toHaveLength(1)
      })

      let success = false
      await act(async () => {
        success = await result.current.deleteReminder('reminder_to_delete')
      })

      expect(success).toBe(true)
      expect(mockDbRun).toHaveBeenCalledWith(
        'DELETE FROM event_reminders WHERE id = ?',
        ['reminder_to_delete']
      )
    })

    it('refreshes reminders after deletion', async () => {
      const mockReminders = [createMockDbRow({ id: 'reminder_1' })]
      mockDbAll.mockResolvedValueOnce(mockReminders).mockResolvedValueOnce([])

      const { result } = renderHook(() => useReminders())

      await waitFor(() => {
        expect(result.current.reminders).toHaveLength(1)
      })

      await act(async () => {
        await result.current.deleteReminder('reminder_1')
      })

      expect(mockDbAll).toHaveBeenCalledTimes(2)
    })

    it('returns false when database is unavailable', async () => {
      mockGetDatabase.mockResolvedValue(null)

      const { result } = renderHook(() => useReminders())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      let success = false
      await act(async () => {
        success = await result.current.deleteReminder('some_id')
      })

      expect(success).toBe(false)
    })
  })

  describe('deleteRemindersForEvent', () => {
    it('deletes all reminders for an event', async () => {
      const { result } = renderHook(() => useReminders())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      await act(async () => {
        await result.current.deleteRemindersForEvent('event_123')
      })

      expect(mockDbRun).toHaveBeenCalledWith(
        'DELETE FROM event_reminders WHERE event_id = ?',
        ['event_123']
      )
    })
  })

  describe('deleteRemindersForTask', () => {
    it('deletes all reminders for a task', async () => {
      const { result } = renderHook(() => useReminders())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      await act(async () => {
        await result.current.deleteRemindersForTask('task_456')
      })

      expect(mockDbRun).toHaveBeenCalledWith(
        'DELETE FROM event_reminders WHERE task_id = ?',
        ['task_456']
      )
    })
  })

  describe('requestPermission', () => {
    it('requests notification permission', async () => {
      Object.defineProperty(Notification, 'permission', {
        value: 'default',
        writable: true,
        configurable: true,
      })
      ;(Notification.requestPermission as ReturnType<typeof vi.fn>).mockResolvedValueOnce('granted')

      const { result } = renderHook(() => useReminders())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      let permission: string = 'default'
      await act(async () => {
        permission = await result.current.requestPermission()
      })

      expect(permission).toBe('granted')
      expect(result.current.notificationPermission).toBe('granted')
    })

    it('returns denied when already denied', async () => {
      Object.defineProperty(Notification, 'permission', {
        value: 'denied',
        writable: true,
        configurable: true,
      })

      const { result } = renderHook(() => useReminders())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      let permission: string = 'default'
      await act(async () => {
        permission = await result.current.requestPermission()
      })

      expect(permission).toBe('denied')
    })

    it('returns granted when already granted', async () => {
      Object.defineProperty(Notification, 'permission', {
        value: 'granted',
        writable: true,
        configurable: true,
      })

      const { result } = renderHook(() => useReminders())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      let permission: string = 'default'
      await act(async () => {
        permission = await result.current.requestPermission()
      })

      expect(permission).toBe('granted')
    })
  })

  describe('getRemindersForEvent', () => {
    it('returns reminders for specific event', async () => {
      const mockReminders = [
        createMockDbRow({ id: 'r1', eventId: 'event_1' }),
        createMockDbRow({ id: 'r2', eventId: 'event_2' }),
        createMockDbRow({ id: 'r3', eventId: 'event_1' }),
      ]
      mockDbAll.mockResolvedValueOnce(mockReminders)

      const { result } = renderHook(() => useReminders())

      await waitFor(() => {
        expect(result.current.reminders).toHaveLength(3)
      })

      const eventReminders = result.current.getRemindersForEvent('event_1')
      expect(eventReminders).toHaveLength(2)
      expect(eventReminders.every((r) => r.eventId === 'event_1')).toBe(true)
    })

    it('returns empty array when no reminders for event', async () => {
      const { result } = renderHook(() => useReminders())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const eventReminders = result.current.getRemindersForEvent('nonexistent')
      expect(eventReminders).toEqual([])
    })
  })

  describe('getRemindersForTask', () => {
    it('returns reminders for specific task', async () => {
      const mockReminders = [
        createMockDbRow({ id: 'r1', taskId: 'task_1', eventId: undefined }),
        createMockDbRow({ id: 'r2', eventId: 'event_1', taskId: undefined }),
        createMockDbRow({ id: 'r3', taskId: 'task_1', eventId: undefined }),
      ]
      mockDbAll.mockResolvedValueOnce(mockReminders)

      const { result } = renderHook(() => useReminders())

      await waitFor(() => {
        expect(result.current.reminders).toHaveLength(3)
      })

      const taskReminders = result.current.getRemindersForTask('task_1')
      expect(taskReminders).toHaveLength(2)
      expect(taskReminders.every((r) => r.taskId === 'task_1')).toBe(true)
    })
  })

  describe('getPendingReminders', () => {
    it('returns only unsent reminders', async () => {
      const mockReminders = [
        createMockDbRow({ id: 'r1', isSent: false }),
        createMockDbRow({ id: 'r2', isSent: true }),
        createMockDbRow({ id: 'r3', isSent: false }),
      ]
      mockDbAll.mockResolvedValueOnce(mockReminders)

      const { result } = renderHook(() => useReminders())

      await waitFor(() => {
        expect(result.current.reminders).toHaveLength(3)
      })

      const pending = result.current.getPendingReminders()
      expect(pending).toHaveLength(2)
      expect(pending.every((r) => !r.isSent)).toBe(true)
    })
  })

  describe('refresh', () => {
    it('reloads reminders from database', async () => {
      mockDbAll.mockResolvedValueOnce([]).mockResolvedValueOnce([
        createMockDbRow({ id: 'new_reminder' }),
      ])

      const { result } = renderHook(() => useReminders())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.reminders).toHaveLength(0)

      await act(async () => {
        await result.current.refresh()
      })

      expect(result.current.reminders).toHaveLength(1)
    })
  })

  describe('reminder checking', () => {
    it('uses default check interval of 30 seconds', async () => {
      const setIntervalSpy = vi.spyOn(global, 'setInterval')

      const { result } = renderHook(() => useReminders())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 30000)
    })

    it('uses custom check interval when provided', async () => {
      const setIntervalSpy = vi.spyOn(global, 'setInterval')

      const { result } = renderHook(() => useReminders({ checkInterval: 60000 }))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 60000)
    })

    it('clears interval on unmount', async () => {
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval')

      const { result, unmount } = renderHook(() => useReminders())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      unmount()

      expect(clearIntervalSpy).toHaveBeenCalled()
    })
  })
})

describe('REMINDER_INTERVALS', () => {
  it('includes all expected intervals', () => {
    const values = REMINDER_INTERVALS.map((i) => i.value)

    expect(values).toContain(0) // At time
    expect(values).toContain(5) // 5 min
    expect(values).toContain(10) // 10 min
    expect(values).toContain(15) // 15 min
    expect(values).toContain(30) // 30 min
    expect(values).toContain(60) // 1 hour
    expect(values).toContain(120) // 2 hours
    expect(values).toContain(1440) // 1 day
    expect(values).toContain(10080) // 1 week
  })

  it('has label for each interval', () => {
    REMINDER_INTERVALS.forEach((interval) => {
      expect(interval.label).toBeDefined()
      expect(typeof interval.label).toBe('string')
      expect(interval.label.length).toBeGreaterThan(0)
    })
  })

  it('is sorted by value ascending', () => {
    for (let i = 1; i < REMINDER_INTERVALS.length; i++) {
      expect(REMINDER_INTERVALS[i].value).toBeGreaterThan(
        REMINDER_INTERVALS[i - 1].value
      )
    }
  })
})

describe('Reminder type safety', () => {
  it('Reminder has all required fields', () => {
    const reminder: Reminder = createMockReminder()

    expect(typeof reminder.id).toBe('string')
    expect(reminder.remindAt instanceof Date).toBe(true)
    expect(['notification', 'sound', 'both']).toContain(reminder.reminderType)
    expect(typeof reminder.minutesBefore).toBe('number')
    expect(typeof reminder.isSent).toBe('boolean')
    expect(reminder.createdAt instanceof Date).toBe(true)
  })

  it('Optional fields can be undefined', () => {
    const reminder = createMockReminder({
      eventId: undefined,
      taskId: undefined,
      sentAt: undefined,
    })

    expect(reminder.eventId).toBeUndefined()
    expect(reminder.taskId).toBeUndefined()
    expect(reminder.sentAt).toBeUndefined()
  })
})
