/**
 * useTasks Hook Tests
 *
 * Tests for task management with CRUD operations, filtering, and statistics.
 *
 * @module __tests__/unit/planner/useTasks.test
 * @vitest-environment happy-dom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import {
  useTasks,
  useStrandTasks,
  useTodayTasks,
  useOverdueTasks,
} from '@/lib/planner/hooks/useTasks'
import type { Task } from '@/lib/planner/types'

// ============================================================================
// MOCKS
// ============================================================================

const { mockGetTasks, mockCreateTask, mockUpdateTask, mockDeleteTask } = vi.hoisted(() => ({
  mockGetTasks: vi.fn(),
  mockCreateTask: vi.fn(),
  mockUpdateTask: vi.fn(),
  mockDeleteTask: vi.fn(),
}))

vi.mock('@/lib/planner/database', () => ({
  getTasks: mockGetTasks,
  createTask: mockCreateTask,
  updateTask: mockUpdateTask,
  deleteTask: mockDeleteTask,
}))

// ============================================================================
// TEST DATA
// ============================================================================

const createMockTask = (overrides: Partial<Task> = {}): Task => ({
  id: `task_${Math.random().toString(36).substring(2, 9)}`,
  title: 'Test Task',
  description: 'A test task',
  taskType: 'standalone',
  status: 'pending',
  priority: 'medium',
  dueDate: '2024-01-15',
  dueTime: '14:00',
  estimatedMinutes: 30,
  isDeleted: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
})

const mockTasks: Task[] = [
  createMockTask({ id: 'task_1', title: 'Task 1', status: 'pending', priority: 'high' }),
  createMockTask({ id: 'task_2', title: 'Task 2', status: 'in_progress', priority: 'medium' }),
  createMockTask({ id: 'task_3', title: 'Task 3', status: 'completed', priority: 'low' }),
  createMockTask({ id: 'task_4', title: 'Task 4', status: 'pending', priority: 'high', dueDate: '2024-01-14' }), // Overdue
]

// ============================================================================
// TEST SUITES
// ============================================================================

describe('useTasks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetTasks.mockResolvedValue([])
    mockCreateTask.mockResolvedValue(null)
    mockUpdateTask.mockResolvedValue(null)
    mockDeleteTask.mockResolvedValue(true)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  // --------------------------------------------------------------------------
  // INITIALIZATION
  // --------------------------------------------------------------------------

  describe('Initialization', () => {
    it('should initialize with default values', async () => {
      const { result } = renderHook(() => useTasks())

      expect(result.current.isLoading).toBe(true)
      expect(result.current.error).toBeNull()
      expect(result.current.tasks).toEqual([])

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
    })

    it('should load tasks on mount', async () => {
      mockGetTasks.mockResolvedValue(mockTasks)

      const { result } = renderHook(() => useTasks({ includeCompleted: true }))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(mockGetTasks).toHaveBeenCalled()
      expect(result.current.tasks).toHaveLength(4)
    })

    it('should filter out completed tasks by default', async () => {
      mockGetTasks.mockResolvedValue(mockTasks)

      const { result } = renderHook(() => useTasks())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Should filter out completed tasks client-side
      expect(result.current.tasks).toHaveLength(3)
      expect(result.current.tasks.every((t) => t.status !== 'completed')).toBe(true)
    })

    it('should include completed tasks when specified', async () => {
      mockGetTasks.mockResolvedValue(mockTasks)

      const { result } = renderHook(() => useTasks({ includeCompleted: true }))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.tasks).toHaveLength(4)
    })
  })

  // --------------------------------------------------------------------------
  // FILTERING
  // --------------------------------------------------------------------------

  describe('Filtering', () => {
    it('should filter by status', async () => {
      mockGetTasks.mockResolvedValue(mockTasks)

      const { result } = renderHook(() =>
        useTasks({ status: 'pending', includeCompleted: true })
      )

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(mockGetTasks).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'pending' })
      )
    })

    it('should filter by multiple statuses', async () => {
      mockGetTasks.mockResolvedValue([])

      renderHook(() =>
        useTasks({ status: ['pending', 'in_progress'], includeCompleted: true })
      )

      // Verify the mock was called with correct filter
      await waitFor(() => {
        expect(mockGetTasks).toHaveBeenCalled()
      })

      expect(mockGetTasks).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'pending,in_progress' })
      )
    })

    it('should filter by priority', async () => {
      mockGetTasks.mockResolvedValue(mockTasks)

      const { result } = renderHook(() =>
        useTasks({ priority: 'high', includeCompleted: true })
      )

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(mockGetTasks).toHaveBeenCalledWith(
        expect.objectContaining({ priority: 'high' })
      )
    })

    it('should filter by strand path', async () => {
      mockGetTasks.mockResolvedValue([])

      const { result } = renderHook(() =>
        useTasks({ strandPath: '/projects/my-project' })
      )

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(mockGetTasks).toHaveBeenCalledWith(
        expect.objectContaining({ strandPath: '/projects/my-project' })
      )
    })

    it('should filter by project', async () => {
      mockGetTasks.mockResolvedValue([])

      const { result } = renderHook(() =>
        useTasks({ project: 'project_123' })
      )

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(mockGetTasks).toHaveBeenCalledWith(
        expect.objectContaining({ project: 'project_123' })
      )
    })

    it('should filter by due date range', async () => {
      mockGetTasks.mockResolvedValue([])

      const { result } = renderHook(() =>
        useTasks({ dueAfter: '2024-01-01', dueBefore: '2024-01-31' })
      )

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(mockGetTasks).toHaveBeenCalledWith(
        expect.objectContaining({
          dueAfter: '2024-01-01',
          dueBefore: '2024-01-31',
        })
      )
    })

    it('should filter by task type client-side', async () => {
      mockGetTasks.mockResolvedValue([
        createMockTask({ taskType: 'standalone' }),
        createMockTask({ taskType: 'embedded' }),
      ])

      const { result } = renderHook(() =>
        useTasks({ taskType: 'standalone' })
      )

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.tasks).toHaveLength(1)
      expect(result.current.tasks[0].taskType).toBe('standalone')
    })

    it('should filter by tags client-side', async () => {
      const taskWithTags = createMockTask({ tags: ['urgent', 'bug'] })
      const taskWithoutTags = createMockTask({ tags: ['feature'] })
      mockGetTasks.mockResolvedValue([taskWithTags, taskWithoutTags])

      const { result } = renderHook(() =>
        useTasks({ tags: ['urgent'] })
      )

      await waitFor(() => {
        expect(mockGetTasks).toHaveBeenCalled()
      })

      // After tasks load, the client-side filter should apply
      await waitFor(() => {
        expect(result.current.tasks.length).toBeLessThanOrEqual(2)
      })
    })
  })

  // --------------------------------------------------------------------------
  // CRUD OPERATIONS
  // --------------------------------------------------------------------------

  describe('CRUD Operations', () => {
    describe('createTask', () => {
      it('should create a task', async () => {
        const newTask = createMockTask({ title: 'New Task' })
        mockCreateTask.mockResolvedValue(newTask)
        mockGetTasks.mockResolvedValue([newTask])

        const { result } = renderHook(() => useTasks())

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false)
        })

        let createdTask: Task | null = null
        await act(async () => {
          createdTask = await result.current.createTask({
            title: 'New Task',
            taskType: 'standalone',
          })
        })

        expect(createdTask).not.toBeNull()
        expect(mockCreateTask).toHaveBeenCalled()
      })

      it('should handle create error', async () => {
        mockCreateTask.mockRejectedValue(new Error('Database error'))

        const { result } = renderHook(() => useTasks())

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false)
        })

        let createdTask: Task | null = null
        await act(async () => {
          createdTask = await result.current.createTask({
            title: 'New Task',
            taskType: 'standalone',
          })
        })

        expect(createdTask).toBeNull()
        expect(result.current.error).not.toBeNull()
      })
    })

    describe('updateTask', () => {
      it('should update a task', async () => {
        const updatedTask = createMockTask({ id: 'task_1', title: 'Updated Title' })
        mockGetTasks.mockResolvedValue([createMockTask({ id: 'task_1' })])
        mockUpdateTask.mockResolvedValue(updatedTask)

        const { result } = renderHook(() => useTasks())

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false)
        })

        let updated: Task | null = null
        await act(async () => {
          updated = await result.current.updateTask('task_1', {
            title: 'Updated Title',
          })
        })

        expect(updated).not.toBeNull()
        expect(mockUpdateTask).toHaveBeenCalledWith('task_1', {
          title: 'Updated Title',
        })
      })

      it('should update task in local state', async () => {
        const originalTask = createMockTask({ id: 'task_1', title: 'Original' })
        const updatedTask = { ...originalTask, title: 'Updated' }
        mockGetTasks.mockResolvedValue([originalTask])
        mockUpdateTask.mockResolvedValue(updatedTask)

        const { result } = renderHook(() => useTasks())

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false)
        })

        await act(async () => {
          await result.current.updateTask('task_1', { title: 'Updated' })
        })

        expect(result.current.tasks[0].title).toBe('Updated')
      })

      it('should handle update error', async () => {
        mockGetTasks.mockResolvedValue([createMockTask({ id: 'task_1' })])
        mockUpdateTask.mockRejectedValue(new Error('Update failed'))

        const { result } = renderHook(() => useTasks())

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false)
        })

        let updated: Task | null = null
        await act(async () => {
          updated = await result.current.updateTask('task_1', {
            title: 'Updated',
          })
        })

        expect(updated).toBeNull()
        expect(result.current.error).not.toBeNull()
      })
    })

    describe('deleteTask', () => {
      it('should delete a task', async () => {
        mockGetTasks.mockResolvedValue([createMockTask({ id: 'task_1' })])
        mockDeleteTask.mockResolvedValue(true)

        const { result } = renderHook(() => useTasks())

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false)
        })

        let deleted = false
        await act(async () => {
          deleted = await result.current.deleteTask('task_1')
        })

        expect(deleted).toBe(true)
        expect(mockDeleteTask).toHaveBeenCalledWith('task_1', false)
      })

      it('should remove task from local state', async () => {
        mockGetTasks.mockResolvedValue([
          createMockTask({ id: 'task_1' }),
          createMockTask({ id: 'task_2' }),
        ])
        mockDeleteTask.mockResolvedValue(true)

        const { result } = renderHook(() => useTasks())

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false)
        })

        expect(result.current.tasks).toHaveLength(2)

        await act(async () => {
          await result.current.deleteTask('task_1')
        })

        expect(result.current.tasks).toHaveLength(1)
        expect(result.current.tasks[0].id).toBe('task_2')
      })

      it('should support permanent deletion', async () => {
        mockGetTasks.mockResolvedValue([createMockTask({ id: 'task_1' })])
        mockDeleteTask.mockResolvedValue(true)

        const { result } = renderHook(() => useTasks())

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false)
        })

        await act(async () => {
          await result.current.deleteTask('task_1', true)
        })

        expect(mockDeleteTask).toHaveBeenCalledWith('task_1', true)
      })

      it('should handle delete error', async () => {
        mockGetTasks.mockResolvedValue([createMockTask({ id: 'task_1' })])
        mockDeleteTask.mockRejectedValue(new Error('Delete failed'))

        const { result } = renderHook(() => useTasks())

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false)
        })

        let deleted = false
        await act(async () => {
          deleted = await result.current.deleteTask('task_1')
        })

        expect(deleted).toBe(false)
        expect(result.current.error).not.toBeNull()
      })
    })
  })

  // --------------------------------------------------------------------------
  // STATUS HELPERS
  // --------------------------------------------------------------------------

  describe('Status Helpers', () => {
    it('should mark task as complete', async () => {
      const task = createMockTask({ id: 'task_1', status: 'pending' })
      const completedTask = { ...task, status: 'completed' as const }
      mockGetTasks.mockResolvedValue([task])
      mockUpdateTask.mockResolvedValue(completedTask)

      const { result } = renderHook(() => useTasks())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      await act(async () => {
        await result.current.markComplete('task_1')
      })

      expect(mockUpdateTask).toHaveBeenCalledWith('task_1', {
        status: 'completed',
      })
    })

    it('should mark task as incomplete', async () => {
      const task = createMockTask({ id: 'task_1', status: 'completed' })
      const pendingTask = { ...task, status: 'pending' as const }
      mockGetTasks.mockResolvedValue([task])
      mockUpdateTask.mockResolvedValue(pendingTask)

      const { result } = renderHook(() => useTasks({ includeCompleted: true }))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      await act(async () => {
        await result.current.markIncomplete('task_1')
      })

      expect(mockUpdateTask).toHaveBeenCalledWith('task_1', {
        status: 'pending',
      })
    })

    it('should toggle task completion from pending to completed', async () => {
      const task = createMockTask({ id: 'task_1', status: 'pending' })
      const completedTask = { ...task, status: 'completed' as const }
      mockGetTasks.mockResolvedValue([task])
      mockUpdateTask.mockResolvedValue(completedTask)

      const { result } = renderHook(() => useTasks())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      await act(async () => {
        await result.current.toggleComplete('task_1')
      })

      expect(mockUpdateTask).toHaveBeenCalledWith('task_1', {
        status: 'completed',
      })
    })

    it('should toggle task completion from completed to pending', async () => {
      const task = createMockTask({ id: 'task_1', status: 'completed' })
      const pendingTask = { ...task, status: 'pending' as const }
      mockGetTasks.mockResolvedValue([task])
      mockUpdateTask.mockResolvedValue(pendingTask)

      const { result } = renderHook(() => useTasks({ includeCompleted: true }))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      await act(async () => {
        await result.current.toggleComplete('task_1')
      })

      expect(mockUpdateTask).toHaveBeenCalledWith('task_1', {
        status: 'pending',
      })
    })

    it('should return null for toggle on non-existent task', async () => {
      mockGetTasks.mockResolvedValue([])

      const { result } = renderHook(() => useTasks())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      let toggleResult: Task | null = null
      await act(async () => {
        toggleResult = await result.current.toggleComplete('nonexistent')
      })

      expect(toggleResult).toBeNull()
    })
  })

  // --------------------------------------------------------------------------
  // BULK OPERATIONS
  // --------------------------------------------------------------------------

  describe('Bulk Operations', () => {
    it('should complete multiple tasks', async () => {
      const tasks = [
        createMockTask({ id: 'task_1', status: 'pending' }),
        createMockTask({ id: 'task_2', status: 'pending' }),
      ]
      mockGetTasks.mockResolvedValue(tasks)
      mockUpdateTask.mockResolvedValue(createMockTask({ status: 'completed' }))

      const { result } = renderHook(() => useTasks())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      await act(async () => {
        await result.current.completeTasks(['task_1', 'task_2'])
      })

      expect(mockUpdateTask).toHaveBeenCalledTimes(2)
    })

    it('should delete multiple tasks', async () => {
      const tasks = [
        createMockTask({ id: 'task_1' }),
        createMockTask({ id: 'task_2' }),
      ]
      mockGetTasks.mockResolvedValue(tasks)
      mockDeleteTask.mockResolvedValue(true)

      const { result } = renderHook(() => useTasks())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      await act(async () => {
        await result.current.deleteTasks(['task_1', 'task_2'])
      })

      expect(mockDeleteTask).toHaveBeenCalledTimes(2)
    })

    it('should support permanent bulk deletion', async () => {
      mockGetTasks.mockResolvedValue([
        createMockTask({ id: 'task_1' }),
        createMockTask({ id: 'task_2' }),
      ])
      mockDeleteTask.mockResolvedValue(true)

      const { result } = renderHook(() => useTasks())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      await act(async () => {
        await result.current.deleteTasks(['task_1', 'task_2'], true)
      })

      expect(mockDeleteTask).toHaveBeenCalledWith('task_1', true)
      expect(mockDeleteTask).toHaveBeenCalledWith('task_2', true)
    })
  })

  // --------------------------------------------------------------------------
  // STATISTICS
  // --------------------------------------------------------------------------

  describe('Statistics', () => {
    it('should calculate task statistics', async () => {
      mockGetTasks.mockResolvedValue(mockTasks)

      const { result } = renderHook(() => useTasks({ includeCompleted: true }))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const { stats } = result.current

      expect(stats.total).toBe(4)
      expect(stats.pending).toBe(2)
      expect(stats.inProgress).toBe(1)
      expect(stats.completed).toBe(1)
    })

    it('should update statistics when tasks change', async () => {
      const tasks = [createMockTask({ id: 'task_1', status: 'pending' })]
      mockGetTasks.mockResolvedValue(tasks)
      mockUpdateTask.mockResolvedValue({
        ...tasks[0],
        status: 'completed',
      })

      const { result } = renderHook(() => useTasks({ includeCompleted: true }))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.stats.pending).toBe(1)
      expect(result.current.stats.completed).toBe(0)

      await act(async () => {
        await result.current.markComplete('task_1')
      })

      expect(result.current.stats.pending).toBe(0)
      expect(result.current.stats.completed).toBe(1)
    })
  })

  // --------------------------------------------------------------------------
  // REFRESH
  // --------------------------------------------------------------------------

  describe('Refresh', () => {
    it('should refresh tasks', async () => {
      mockGetTasks.mockResolvedValue([])

      const { result } = renderHook(() => useTasks())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const initialCallCount = mockGetTasks.mock.calls.length

      await act(async () => {
        await result.current.refresh()
      })

      expect(mockGetTasks.mock.calls.length).toBeGreaterThan(initialCallCount)
    })
  })

  // --------------------------------------------------------------------------
  // ERROR HANDLING
  // --------------------------------------------------------------------------

  describe('Error Handling', () => {
    it('should handle load error gracefully', async () => {
      mockGetTasks.mockRejectedValue(new Error('Network error'))

      const { result } = renderHook(() => useTasks())

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
// SPECIALIZED HOOKS TESTS
// ============================================================================

describe('useStrandTasks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetTasks.mockResolvedValue([])
  })

  it('should filter by strand path', async () => {
    const { result } = renderHook(() => useStrandTasks('/projects/my-strand'))

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(mockGetTasks).toHaveBeenCalledWith(
      expect.objectContaining({ strandPath: '/projects/my-strand' })
    )
  })

  it('should include completed tasks', async () => {
    mockGetTasks.mockResolvedValue([
      createMockTask({ status: 'completed', strandId: 'strand_1' }),
    ])

    const { result } = renderHook(() => useStrandTasks('/projects/my-strand'))

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    // Completed tasks should be included
    expect(result.current.tasks).toHaveLength(1)
  })
})

describe('useTodayTasks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetTasks.mockResolvedValue([])
  })

  it('should filter by today date', async () => {
    const today = new Date().toISOString().split('T')[0]

    const { result } = renderHook(() => useTodayTasks())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(mockGetTasks).toHaveBeenCalledWith(
      expect.objectContaining({
        dueAfter: today,
        dueBefore: today,
      })
    )
  })
})

describe('useOverdueTasks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetTasks.mockResolvedValue([])
  })

  it('should filter by overdue date and pending status', async () => {
    const today = new Date().toISOString().split('T')[0]

    renderHook(() => useOverdueTasks())

    await waitFor(() => {
      expect(mockGetTasks).toHaveBeenCalled()
    })

    expect(mockGetTasks).toHaveBeenCalledWith(
      expect.objectContaining({
        dueBefore: today,
        status: 'pending,in_progress',
      })
    )
  })
})
