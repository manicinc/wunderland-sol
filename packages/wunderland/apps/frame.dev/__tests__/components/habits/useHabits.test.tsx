/**
 * Component Tests for useHabits Hook
 * @module __tests__/unit/habits/useHabits.test
 *
 * Tests for the habits hook including:
 * - Loading and initialization
 * - CRUD operations (create, delete)
 * - Completion and uncomplete functionality
 * - Streak freezing
 * - Stats calculation
 *
 * @vitest-environment happy-dom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import type { HabitStreak, HabitWithStreak } from '@/lib/planner/habits/types'

// Use vi.hoisted to ensure these are available when mocks are created
const {
  mockGetHabitsWithStreaks,
  mockCreateHabitStreak,
  mockUpdateHabitStreak,
  mockDeleteHabitStreak,
  mockGetOrCreateStreak,
  mockGetHabitStreak,
  mockCreateTask,
  mockDeleteTask,
  mockGetTask,
} = vi.hoisted(() => ({
  mockGetHabitsWithStreaks: vi.fn(),
  mockCreateHabitStreak: vi.fn(),
  mockUpdateHabitStreak: vi.fn(),
  mockDeleteHabitStreak: vi.fn(),
  mockGetOrCreateStreak: vi.fn(),
  mockGetHabitStreak: vi.fn(),
  mockCreateTask: vi.fn(),
  mockDeleteTask: vi.fn(),
  mockGetTask: vi.fn(),
}))

// Mock habit database module
vi.mock('@/lib/planner/habits/database', () => ({
  getHabitsWithStreaks: mockGetHabitsWithStreaks,
  createHabitStreak: mockCreateHabitStreak,
  updateHabitStreak: mockUpdateHabitStreak,
  deleteHabitStreak: mockDeleteHabitStreak,
  getOrCreateStreak: mockGetOrCreateStreak,
  getHabitStreak: mockGetHabitStreak,
}))

// Mock task database module
vi.mock('@/lib/planner/database', () => ({
  createTask: mockCreateTask,
  deleteTask: mockDeleteTask,
  getTask: mockGetTask,
}))

// Import after mocks are defined
import { useHabits, useHabit, useHabitStreak } from '@/lib/planner/habits/useHabits'

// Helper to get today's date in local time (matching library implementation)
function getToday(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Helper to get date N days ago in local time
function daysAgo(n: number): string {
  const date = new Date()
  date.setDate(date.getDate() - n)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Mock data factory
function createMockStreak(overrides: Partial<HabitStreak> = {}): HabitStreak {
  return {
    id: 'streak_test-1',
    taskId: 'task_test-1',
    currentStreak: 5,
    longestStreak: 10,
    completionHistory: [daysAgo(2), daysAgo(1)],
    streakFreezesRemaining: 1,
    totalCompletions: 20,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    ...overrides,
  }
}

function createMockHabit(overrides: Partial<HabitWithStreak> = {}): HabitWithStreak {
  return {
    id: 'task_habit-1',
    title: 'Morning Exercise',
    description: 'Exercise for 30 minutes',
    taskType: 'standalone',
    status: 'pending',
    priority: 'medium',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    isDeleted: false,
    tags: ['habit'],
    streak: createMockStreak({ taskId: 'task_habit-1' }),
    frequency: 'daily',
    targetCount: 1,
    recurrenceRule: { frequency: 'daily', interval: 1 },
    ...overrides,
  }
}

describe('useHabits', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset mock implementations
    mockGetHabitsWithStreaks.mockResolvedValue([])
    mockCreateHabitStreak.mockImplementation((taskId: string) =>
      Promise.resolve(createMockStreak({ taskId, id: `streak_${taskId}` }))
    )
    mockUpdateHabitStreak.mockResolvedValue(true)
    mockDeleteHabitStreak.mockResolvedValue(true)
    mockCreateTask.mockImplementation((input: any) =>
      Promise.resolve({
        id: `task_${Date.now()}`,
        ...input,
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isDeleted: false,
      })
    )
    mockDeleteTask.mockResolvedValue(true)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('initialization', () => {
    it('starts with loading state', async () => {
      const { result } = renderHook(() => useHabits())

      expect(result.current.isLoading).toBe(true)
      expect(result.current.habits).toEqual([])

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
    })

    it('loads habits on mount', async () => {
      const mockHabits = [createMockHabit()]
      mockGetHabitsWithStreaks.mockResolvedValueOnce(mockHabits)

      const { result } = renderHook(() => useHabits())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(mockGetHabitsWithStreaks).toHaveBeenCalled()
      expect(result.current.habits).toHaveLength(1)
    })

    it('initializes with empty habits array', async () => {
      const { result } = renderHook(() => useHabits())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.habits).toEqual([])
      expect(result.current.error).toBeNull()
    })

    it('handles errors gracefully', async () => {
      mockGetHabitsWithStreaks.mockRejectedValueOnce(new Error('Database error'))

      const { result } = renderHook(() => useHabits())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.error).toBeDefined()
      expect(result.current.habits).toEqual([])
    })
  })

  describe('filtering', () => {
    it('filters by category', async () => {
      const habits = [
        createMockHabit({ id: 'habit-1', tags: ['habit', 'health'] }),
        createMockHabit({ id: 'habit-2', tags: ['habit', 'learning'] }),
      ]
      mockGetHabitsWithStreaks.mockResolvedValueOnce(habits)

      const { result } = renderHook(() => useHabits({ category: 'health' }))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.habits).toHaveLength(1)
      expect(result.current.habits[0].tags).toContain('health')
    })

    it('filters by frequency', async () => {
      const habits = [
        createMockHabit({ id: 'habit-1', frequency: 'daily' }),
        createMockHabit({ id: 'habit-2', frequency: 'weekly' }),
      ]
      mockGetHabitsWithStreaks.mockResolvedValueOnce(habits)

      const { result } = renderHook(() => useHabits({ frequency: 'daily' }))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.habits).toHaveLength(1)
      expect(result.current.habits[0].frequency).toBe('daily')
    })
  })

  describe('createHabit', () => {
    it('creates a new habit with streak', async () => {
      const { result } = renderHook(() => useHabits())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      let newHabit: HabitWithStreak | null = null
      await act(async () => {
        newHabit = await result.current.createHabit({
          title: 'Read 30 minutes',
          frequency: 'daily',
          category: 'learning',
        })
      })

      expect(newHabit).not.toBeNull()
      expect(mockCreateTask).toHaveBeenCalled()
      expect(mockCreateHabitStreak).toHaveBeenCalled()
      expect(result.current.habits).toHaveLength(1)
    })

    it('adds habit tag automatically', async () => {
      const { result } = renderHook(() => useHabits())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      await act(async () => {
        await result.current.createHabit({
          title: 'Meditate',
          frequency: 'daily',
        })
      })

      expect(mockCreateTask).toHaveBeenCalledWith(
        expect.objectContaining({
          tags: expect.arrayContaining(['habit']),
        })
      )
    })

    it('returns null on failure', async () => {
      mockCreateTask.mockResolvedValueOnce(null)

      const { result } = renderHook(() => useHabits())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      let newHabit: HabitWithStreak | null = null
      await act(async () => {
        newHabit = await result.current.createHabit({
          title: 'Test Habit',
          frequency: 'daily',
        })
      })

      expect(newHabit).toBeNull()
    })

    it('cleans up task if streak creation fails', async () => {
      mockCreateHabitStreak.mockResolvedValueOnce(null)

      const { result } = renderHook(() => useHabits())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      await act(async () => {
        await result.current.createHabit({
          title: 'Test Habit',
          frequency: 'daily',
        })
      })

      expect(mockDeleteTask).toHaveBeenCalled()
    })
  })

  describe('deleteHabit', () => {
    it('deletes habit and streak', async () => {
      const mockHabits = [createMockHabit({ id: 'habit-to-delete' })]
      mockGetHabitsWithStreaks.mockResolvedValueOnce(mockHabits)

      const { result } = renderHook(() => useHabits())

      await waitFor(() => {
        expect(result.current.habits).toHaveLength(1)
      })

      await act(async () => {
        await result.current.deleteHabit('habit-to-delete')
      })

      expect(mockDeleteHabitStreak).toHaveBeenCalledWith('habit-to-delete')
      expect(mockDeleteTask).toHaveBeenCalledWith('habit-to-delete', true)
      expect(result.current.habits).toHaveLength(0)
    })

    it('returns true on success', async () => {
      const mockHabits = [createMockHabit({ id: 'habit-1' })]
      mockGetHabitsWithStreaks.mockResolvedValueOnce(mockHabits)

      const { result } = renderHook(() => useHabits())

      await waitFor(() => {
        expect(result.current.habits).toHaveLength(1)
      })

      let success = false
      await act(async () => {
        success = await result.current.deleteHabit('habit-1')
      })

      expect(success).toBe(true)
    })
  })

  describe('completeHabit', () => {
    it('increments streak on completion', async () => {
      const mockHabits = [
        createMockHabit({
          id: 'habit-1',
          streak: createMockStreak({
            taskId: 'habit-1',
            currentStreak: 3,
            lastCompletedDate: daysAgo(1),
          }),
        }),
      ]
      mockGetHabitsWithStreaks.mockResolvedValueOnce(mockHabits)

      const { result } = renderHook(() => useHabits())

      await waitFor(() => {
        expect(result.current.habits).toHaveLength(1)
      })

      let completionResult: any = null
      await act(async () => {
        completionResult = await result.current.completeHabit('habit-1')
      })

      expect(completionResult).not.toBeNull()
      expect(completionResult.newStreak).toBe(4)
      expect(mockUpdateHabitStreak).toHaveBeenCalled()
    })

    it('updates local state immediately', async () => {
      const mockHabits = [
        createMockHabit({
          id: 'habit-1',
          streak: createMockStreak({
            taskId: 'habit-1',
            currentStreak: 5,
            lastCompletedDate: daysAgo(1),
          }),
        }),
      ]
      mockGetHabitsWithStreaks.mockResolvedValueOnce(mockHabits)

      const { result } = renderHook(() => useHabits())

      await waitFor(() => {
        expect(result.current.habits).toHaveLength(1)
      })

      await act(async () => {
        await result.current.completeHabit('habit-1')
      })

      expect(result.current.habits[0].streak.currentStreak).toBe(6)
    })

    it('returns null for non-existent habit', async () => {
      const { result } = renderHook(() => useHabits())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      let completionResult: any = null
      await act(async () => {
        completionResult = await result.current.completeHabit('nonexistent')
      })

      expect(completionResult).toBeNull()
    })

    it('detects already completed today', async () => {
      const mockHabits = [
        createMockHabit({
          id: 'habit-1',
          streak: createMockStreak({
            taskId: 'habit-1',
            currentStreak: 5,
            lastCompletedDate: getToday(),
            completionHistory: [getToday()],
          }),
        }),
      ]
      mockGetHabitsWithStreaks.mockResolvedValueOnce(mockHabits)

      const { result } = renderHook(() => useHabits())

      await waitFor(() => {
        expect(result.current.habits).toHaveLength(1)
      })

      let completionResult: any = null
      await act(async () => {
        completionResult = await result.current.completeHabit('habit-1')
      })

      expect(completionResult.alreadyCompleted).toBe(true)
    })
  })

  describe('uncompleteHabit', () => {
    it('removes today from completion history', async () => {
      const today = getToday()
      const mockHabits = [
        createMockHabit({
          id: 'habit-1',
          streak: createMockStreak({
            taskId: 'habit-1',
            currentStreak: 5,
            lastCompletedDate: today,
            completionHistory: [daysAgo(2), daysAgo(1), today],
            totalCompletions: 5,
          }),
        }),
      ]
      mockGetHabitsWithStreaks.mockResolvedValueOnce(mockHabits)

      const { result } = renderHook(() => useHabits())

      await waitFor(() => {
        expect(result.current.habits).toHaveLength(1)
      })

      await act(async () => {
        await result.current.uncompleteHabit('habit-1')
      })

      expect(result.current.habits[0].streak.currentStreak).toBe(4)
      expect(result.current.habits[0].streak.completionHistory).not.toContain(today)
    })

    it('returns false when not completed today', async () => {
      const mockHabits = [
        createMockHabit({
          id: 'habit-1',
          streak: createMockStreak({
            taskId: 'habit-1',
            lastCompletedDate: daysAgo(1),
          }),
        }),
      ]
      mockGetHabitsWithStreaks.mockResolvedValueOnce(mockHabits)

      const { result } = renderHook(() => useHabits())

      await waitFor(() => {
        expect(result.current.habits).toHaveLength(1)
      })

      let success = false
      await act(async () => {
        success = await result.current.uncompleteHabit('habit-1')
      })

      expect(success).toBe(false)
    })
  })

  describe('isCompletedToday', () => {
    it('returns true when completed today', async () => {
      const mockHabits = [
        createMockHabit({
          id: 'habit-1',
          streak: createMockStreak({
            lastCompletedDate: getToday(),
          }),
        }),
      ]
      mockGetHabitsWithStreaks.mockResolvedValueOnce(mockHabits)

      const { result } = renderHook(() => useHabits())

      await waitFor(() => {
        expect(result.current.habits).toHaveLength(1)
      })

      expect(result.current.isCompletedToday('habit-1')).toBe(true)
    })

    it('returns false when not completed today', async () => {
      const mockHabits = [
        createMockHabit({
          id: 'habit-1',
          streak: createMockStreak({
            lastCompletedDate: daysAgo(1),
          }),
        }),
      ]
      mockGetHabitsWithStreaks.mockResolvedValueOnce(mockHabits)

      const { result } = renderHook(() => useHabits())

      await waitFor(() => {
        expect(result.current.habits).toHaveLength(1)
      })

      expect(result.current.isCompletedToday('habit-1')).toBe(false)
    })

    it('returns false for non-existent habit', async () => {
      const { result } = renderHook(() => useHabits())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.isCompletedToday('nonexistent')).toBe(false)
    })
  })

  describe('useFreeze', () => {
    it('activates streak freeze', async () => {
      const mockHabits = [
        createMockHabit({
          id: 'habit-1',
          streak: createMockStreak({
            taskId: 'habit-1',
            streakFreezesRemaining: 1,
            currentStreak: 5,
            lastCompletedDate: daysAgo(2),
          }),
        }),
      ]
      mockGetHabitsWithStreaks.mockResolvedValueOnce(mockHabits)

      const { result } = renderHook(() => useHabits())

      await waitFor(() => {
        expect(result.current.habits).toHaveLength(1)
      })

      let freezeResult: any = null
      await act(async () => {
        freezeResult = await result.current.useFreeze('habit-1')
      })

      expect(freezeResult.success).toBe(true)
      expect(result.current.habits[0].streak.streakFreezesRemaining).toBe(0)
      expect(result.current.habits[0].streak.freezeActiveUntil).toBeDefined()
    })

    it('fails when no freezes remaining', async () => {
      const mockHabits = [
        createMockHabit({
          id: 'habit-1',
          streak: createMockStreak({
            streakFreezesRemaining: 0,
          }),
        }),
      ]
      mockGetHabitsWithStreaks.mockResolvedValueOnce(mockHabits)

      const { result } = renderHook(() => useHabits())

      await waitFor(() => {
        expect(result.current.habits).toHaveLength(1)
      })

      let freezeResult: any = null
      await act(async () => {
        freezeResult = await result.current.useFreeze('habit-1')
      })

      expect(freezeResult.success).toBe(false)
      expect(freezeResult.message).toContain('No streak freezes')
    })
  })

  describe('stats', () => {
    it('calculates stats correctly', async () => {
      const mockHabits = [
        createMockHabit({
          id: 'habit-1',
          streak: createMockStreak({
            currentStreak: 5,
            longestStreak: 10,
            totalCompletions: 50,
            lastCompletedDate: getToday(),
          }),
        }),
        createMockHabit({
          id: 'habit-2',
          streak: createMockStreak({
            currentStreak: 3,
            longestStreak: 15,
            totalCompletions: 30,
            lastCompletedDate: daysAgo(1),
          }),
        }),
      ]
      mockGetHabitsWithStreaks.mockResolvedValueOnce(mockHabits)

      const { result } = renderHook(() => useHabits())

      await waitFor(() => {
        expect(result.current.habits).toHaveLength(2)
      })

      expect(result.current.stats.totalHabits).toBe(2)
      expect(result.current.stats.activeStreaks).toBe(2)
      expect(result.current.stats.totalCompletions).toBe(80)
      expect(result.current.stats.longestEverStreak).toBe(15)
      expect(result.current.stats.completedToday).toBe(1)
    })

    it('handles empty habits array', async () => {
      const { result } = renderHook(() => useHabits())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.stats.totalHabits).toBe(0)
      expect(result.current.stats.activeStreaks).toBe(0)
      expect(result.current.stats.averageStreak).toBe(0)
    })
  })

  describe('getHabitsAtRisk', () => {
    it('returns habits in grace period with active streaks', async () => {
      const mockHabits = [
        createMockHabit({
          id: 'habit-1',
          streak: createMockStreak({
            currentStreak: 5,
            lastCompletedDate: daysAgo(2), // In grace period (2 days ago for daily)
          }),
        }),
        createMockHabit({
          id: 'habit-2',
          streak: createMockStreak({
            currentStreak: 10,
            lastCompletedDate: getToday(), // Not at risk
          }),
        }),
      ]
      mockGetHabitsWithStreaks.mockResolvedValueOnce(mockHabits)

      const { result } = renderHook(() => useHabits())

      await waitFor(() => {
        expect(result.current.habits).toHaveLength(2)
      })

      const atRisk = result.current.getHabitsAtRisk()
      expect(atRisk).toHaveLength(1)
      expect(atRisk[0].id).toBe('habit-1')
    })
  })

  describe('getTopStreaks', () => {
    it('returns habits sorted by streak descending', async () => {
      const mockHabits = [
        createMockHabit({
          id: 'habit-1',
          streak: createMockStreak({ currentStreak: 3 }),
        }),
        createMockHabit({
          id: 'habit-2',
          streak: createMockStreak({ currentStreak: 10 }),
        }),
        createMockHabit({
          id: 'habit-3',
          streak: createMockStreak({ currentStreak: 7 }),
        }),
      ]
      mockGetHabitsWithStreaks.mockResolvedValueOnce(mockHabits)

      const { result } = renderHook(() => useHabits())

      await waitFor(() => {
        expect(result.current.habits).toHaveLength(3)
      })

      const topStreaks = result.current.getTopStreaks()
      expect(topStreaks[0].streak.currentStreak).toBe(10)
      expect(topStreaks[1].streak.currentStreak).toBe(7)
      expect(topStreaks[2].streak.currentStreak).toBe(3)
    })

    it('limits to top 5', async () => {
      const mockHabits = Array.from({ length: 10 }, (_, i) =>
        createMockHabit({
          id: `habit-${i}`,
          streak: createMockStreak({ currentStreak: i + 1 }),
        })
      )
      mockGetHabitsWithStreaks.mockResolvedValueOnce(mockHabits)

      const { result } = renderHook(() => useHabits())

      await waitFor(() => {
        expect(result.current.habits).toHaveLength(10)
      })

      const topStreaks = result.current.getTopStreaks()
      expect(topStreaks).toHaveLength(5)
    })

    it('excludes habits with zero streak', async () => {
      const mockHabits = [
        createMockHabit({
          id: 'habit-1',
          streak: createMockStreak({ currentStreak: 0 }),
        }),
        createMockHabit({
          id: 'habit-2',
          streak: createMockStreak({ currentStreak: 5 }),
        }),
      ]
      mockGetHabitsWithStreaks.mockResolvedValueOnce(mockHabits)

      const { result } = renderHook(() => useHabits())

      await waitFor(() => {
        expect(result.current.habits).toHaveLength(2)
      })

      const topStreaks = result.current.getTopStreaks()
      expect(topStreaks).toHaveLength(1)
      expect(topStreaks[0].id).toBe('habit-2')
    })
  })

  describe('refresh', () => {
    it('reloads habits from database', async () => {
      const initialHabits = [createMockHabit({ id: 'habit-1' })]
      const updatedHabits = [
        createMockHabit({ id: 'habit-1' }),
        createMockHabit({ id: 'habit-2' }),
      ]

      mockGetHabitsWithStreaks
        .mockResolvedValueOnce(initialHabits)
        .mockResolvedValueOnce(updatedHabits)

      const { result } = renderHook(() => useHabits())

      await waitFor(() => {
        expect(result.current.habits).toHaveLength(1)
      })

      await act(async () => {
        await result.current.refresh()
      })

      expect(result.current.habits).toHaveLength(2)
      expect(mockGetHabitsWithStreaks).toHaveBeenCalledTimes(2)
    })
  })

  describe('todayHabits', () => {
    it('returns daily habits', async () => {
      const mockHabits = [
        createMockHabit({ id: 'habit-1', frequency: 'daily' }),
      ]
      mockGetHabitsWithStreaks.mockResolvedValueOnce(mockHabits)

      const { result } = renderHook(() => useHabits())

      await waitFor(() => {
        expect(result.current.habits).toHaveLength(1)
      })

      expect(result.current.todayHabits).toHaveLength(1)
    })

    it('filters weekday habits based on current day', async () => {
      const mockHabits = [
        createMockHabit({ id: 'habit-1', frequency: 'weekdays' }),
      ]
      mockGetHabitsWithStreaks.mockResolvedValueOnce(mockHabits)

      const { result } = renderHook(() => useHabits())

      await waitFor(() => {
        expect(result.current.habits).toHaveLength(1)
      })

      const dayOfWeek = new Date().getDay()
      const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5

      if (isWeekday) {
        expect(result.current.todayHabits).toHaveLength(1)
      } else {
        expect(result.current.todayHabits).toHaveLength(0)
      }
    })
  })
})

describe('useHabit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetTask.mockResolvedValue(null)
    mockGetOrCreateStreak.mockResolvedValue(null)
  })

  it('returns null when taskId is null', async () => {
    const { result } = renderHook(() => useHabit(null))

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.habit).toBeNull()
  })

  it('loads habit and streak for valid taskId', async () => {
    const mockTask = {
      id: 'task-1',
      title: 'Test Habit',
      recurrenceRule: { frequency: 'daily', interval: 1 },
      dueTime: '08:00',
    }
    const mockStreak = createMockStreak({ taskId: 'task-1' })

    mockGetTask.mockResolvedValueOnce(mockTask)
    mockGetOrCreateStreak.mockResolvedValueOnce(mockStreak)

    const { result } = renderHook(() => useHabit('task-1'))

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.habit).not.toBeNull()
    expect(result.current.habit?.title).toBe('Test Habit')
    expect(result.current.habit?.frequency).toBe('daily')
  })

  it('infers weekdays frequency from recurrence rule', async () => {
    const mockTask = {
      id: 'task-1',
      title: 'Weekday Habit',
      recurrenceRule: { frequency: 'weekly', interval: 1, byDay: [1, 2, 3, 4, 5] },
    }
    const mockStreak = createMockStreak({ taskId: 'task-1' })

    mockGetTask.mockResolvedValueOnce(mockTask)
    mockGetOrCreateStreak.mockResolvedValueOnce(mockStreak)

    const { result } = renderHook(() => useHabit('task-1'))

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.habit?.frequency).toBe('weekdays')
  })
})

describe('useHabitStreak', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetHabitStreak.mockResolvedValue(null)
  })

  it('returns null when taskId is null', async () => {
    const { result } = renderHook(() => useHabitStreak(null))

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.streak).toBeNull()
  })

  it('loads streak for valid taskId', async () => {
    const mockStreak = createMockStreak({ taskId: 'task-1' })
    mockGetHabitStreak.mockResolvedValueOnce(mockStreak)

    const { result } = renderHook(() => useHabitStreak('task-1'))

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.streak).not.toBeNull()
    expect(result.current.streak?.currentStreak).toBe(5)
  })
})
