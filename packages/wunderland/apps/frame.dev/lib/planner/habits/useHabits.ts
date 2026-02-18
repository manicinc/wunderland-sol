/**
 * useHabits Hook
 *
 * Manages habits with streak tracking, completion recording,
 * and gamification integration.
 *
 * @module lib/planner/habits/useHabits
 */

'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import type { Task, CreateTaskInput, RecurrenceRule } from '../types'
import type { HabitWithStreak, HabitStreak, HabitFrequency, HabitStats, HabitCompletionResult } from './types'
import * as habitDb from './database'
import * as taskDb from '../database'
import { recordCompletion, applyCompletion, useStreakFreeze, getStreakStatus, calculateStreakBroken, getToday } from './habitStreakManager'
import { frequencyToRecurrenceRule } from './recurrenceGenerator'

// ============================================================================
// TYPES
// ============================================================================

export interface UseHabitsOptions {
  /** Include habits that were completed today */
  includeCompletedToday?: boolean
  /** Filter by category */
  category?: string
  /** Filter by frequency */
  frequency?: HabitFrequency
}

export interface UseHabitsReturn {
  // Data
  habits: HabitWithStreak[]
  todayHabits: HabitWithStreak[]
  isLoading: boolean
  error: Error | null

  // Stats
  stats: HabitStats

  // Habit CRUD
  createHabit: (input: CreateHabitInput) => Promise<HabitWithStreak | null>
  deleteHabit: (taskId: string) => Promise<boolean>

  // Completion
  completeHabit: (taskId: string) => Promise<HabitCompletionResult | null>
  uncompleteHabit: (taskId: string) => Promise<boolean>
  isCompletedToday: (taskId: string) => boolean

  // Streak management
  useFreeze: (taskId: string) => Promise<{ success: boolean; message: string }>

  // Queries
  getHabitsAtRisk: () => HabitWithStreak[]
  getTopStreaks: () => HabitWithStreak[]

  // Refresh
  refresh: () => Promise<void>
}

export interface CreateHabitInput {
  title: string
  description?: string
  frequency: HabitFrequency
  category?: string
  preferredTime?: string
  targetCount?: number
  motivation?: string
  tags?: string[]
}

// ============================================================================
// HOOK
// ============================================================================

export function useHabits(options: UseHabitsOptions = {}): UseHabitsReturn {
  const [habits, setHabits] = useState<HabitWithStreak[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const { category, frequency } = options

  // Load habits
  const loadHabits = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      let loadedHabits = await habitDb.getHabitsWithStreaks()

      // Apply filters
      if (category) {
        loadedHabits = loadedHabits.filter((h) => {
          // Category is stored in tags as the supertag field value
          return h.tags?.includes(category)
        })
      }

      if (frequency) {
        loadedHabits = loadedHabits.filter((h) => h.frequency === frequency)
      }

      setHabits(loadedHabits)
    } catch (err) {
      console.error('[useHabits] Failed to load habits:', err)
      setError(err instanceof Error ? err : new Error('Failed to load habits'))
    } finally {
      setIsLoading(false)
    }
  }, [category, frequency])

  // Initial load
  useEffect(() => {
    loadHabits()
  }, [loadHabits])

  // Today's habits
  const todayHabits = useMemo(() => {
    const today = getToday()
    const dayOfWeek = new Date().getDay()

    return habits.filter((habit) => {
      // Check if habit applies today based on frequency
      if (habit.frequency === 'daily') return true
      if (habit.frequency === 'weekdays') return dayOfWeek >= 1 && dayOfWeek <= 5
      if (habit.frequency === 'weekly') {
        // Weekly habits: check byDay in recurrence rule
        if (habit.recurrenceRule?.byDay) {
          return habit.recurrenceRule.byDay.includes(dayOfWeek)
        }
        // Default to the day the habit was created
        return true
      }
      return true
    })
  }, [habits])

  // Stats
  const stats = useMemo((): HabitStats => {
    const today = getToday()
    let totalCompletions = 0
    let totalCurrentStreak = 0
    let bestStreak = 0
    let activeStreaks = 0
    let habitsAtRisk = 0
    let completedToday = 0

    for (const habit of habits) {
      totalCompletions += habit.streak.totalCompletions
      totalCurrentStreak += habit.streak.currentStreak
      if (habit.streak.longestStreak > bestStreak) {
        bestStreak = habit.streak.longestStreak
      }
      if (habit.streak.currentStreak > 0) {
        activeStreaks++
      }

      const status = getStreakStatus(habit.streak, habit.frequency)
      if (status.inGracePeriod && status.currentStreak > 0) {
        habitsAtRisk++
      }

      if (habit.streak.lastCompletedDate === today) {
        completedToday++
      }
    }

    return {
      totalHabits: habits.length,
      activeStreaks,
      totalCompletions,
      averageStreak: habits.length > 0 ? Math.round(totalCurrentStreak / habits.length) : 0,
      longestCurrentStreak: Math.max(...habits.map((h) => h.streak.currentStreak), 0),
      longestEverStreak: bestStreak,
      habitsAtRisk,
      completedToday,
      totalToday: todayHabits.length,
    }
  }, [habits, todayHabits])

  // Create a new habit
  const createHabit = useCallback(async (input: CreateHabitInput): Promise<HabitWithStreak | null> => {
    try {
      const recurrenceRule = frequencyToRecurrenceRule(input.frequency)

      // Create the task with #habit tag
      const taskInput: CreateTaskInput = {
        title: input.title,
        description: input.description,
        taskType: 'standalone',
        priority: 'medium',
        dueTime: input.preferredTime,
        recurrenceRule,
        tags: ['habit', ...(input.tags || []), ...(input.category ? [input.category] : [])],
      }

      const task = await taskDb.createTask(taskInput)
      if (!task) return null

      // Create streak record
      const streak = await habitDb.createHabitStreak(task.id)
      if (!streak) {
        // Cleanup task if streak creation fails
        await taskDb.deleteTask(task.id, true)
        return null
      }

      const habitWithStreak: HabitWithStreak = {
        ...task,
        streak,
        frequency: input.frequency,
        targetCount: input.targetCount || 1,
        preferredTime: input.preferredTime,
      }

      // Update local state
      setHabits((prev) => [...prev, habitWithStreak])

      return habitWithStreak
    } catch (err) {
      console.error('[useHabits] Failed to create habit:', err)
      setError(err instanceof Error ? err : new Error('Failed to create habit'))
      return null
    }
  }, [])

  // Delete habit
  const deleteHabit = useCallback(async (taskId: string): Promise<boolean> => {
    try {
      // Delete streak first (cascade should handle this, but be explicit)
      await habitDb.deleteHabitStreak(taskId)

      // Delete the task
      const success = await taskDb.deleteTask(taskId, true)
      if (success) {
        setHabits((prev) => prev.filter((h) => h.id !== taskId))
      }
      return success
    } catch (err) {
      console.error('[useHabits] Failed to delete habit:', err)
      return false
    }
  }, [])

  // Complete habit
  const completeHabit = useCallback(async (taskId: string): Promise<HabitCompletionResult | null> => {
    try {
      const habit = habits.find((h) => h.id === taskId)
      if (!habit) return null

      // Record completion in streak manager
      const result = recordCompletion(habit.streak, habit.frequency)
      const updatedStreak = applyCompletion(habit.streak, result)

      // Update database
      await habitDb.updateHabitStreak(taskId, updatedStreak)

      // Update local state
      setHabits((prev) =>
        prev.map((h) =>
          h.id === taskId
            ? { ...h, streak: { ...h.streak, ...updatedStreak } }
            : h
        )
      )

      return result
    } catch (err) {
      console.error('[useHabits] Failed to complete habit:', err)
      return null
    }
  }, [habits])

  // Uncomplete habit (undo completion)
  const uncompleteHabit = useCallback(async (taskId: string): Promise<boolean> => {
    try {
      const habit = habits.find((h) => h.id === taskId)
      if (!habit) return false

      const today = getToday()

      // Only allow uncompleting if it was completed today
      if (habit.streak.lastCompletedDate !== today) {
        return false
      }

      // Remove today from completion history
      const newHistory = habit.streak.completionHistory.filter((d) => d !== today)

      // Recalculate streak
      const newStreak = newHistory.length > 0 ? habit.streak.currentStreak - 1 : 0

      const updates: Partial<HabitStreak> = {
        currentStreak: Math.max(0, newStreak),
        completionHistory: newHistory,
        lastCompletedDate: newHistory[newHistory.length - 1] || undefined,
        totalCompletions: habit.streak.totalCompletions - 1,
      }

      await habitDb.updateHabitStreak(taskId, updates)

      setHabits((prev) =>
        prev.map((h) =>
          h.id === taskId
            ? { ...h, streak: { ...h.streak, ...updates } }
            : h
        )
      )

      return true
    } catch (err) {
      console.error('[useHabits] Failed to uncomplete habit:', err)
      return false
    }
  }, [habits])

  // Check if habit is completed today
  const isCompletedToday = useCallback((taskId: string): boolean => {
    const habit = habits.find((h) => h.id === taskId)
    if (!habit) return false

    const today = getToday()
    return habit.streak.lastCompletedDate === today
  }, [habits])

  // Use streak freeze
  const useFreeze = useCallback(async (taskId: string): Promise<{ success: boolean; message: string }> => {
    try {
      const habit = habits.find((h) => h.id === taskId)
      if (!habit) {
        return { success: false, message: 'Habit not found' }
      }

      const result = useStreakFreeze(habit.streak)
      if (result.success) {
        await habitDb.updateHabitStreak(taskId, result.updatedStreak)

        setHabits((prev) =>
          prev.map((h) =>
            h.id === taskId
              ? { ...h, streak: { ...h.streak, ...result.updatedStreak } }
              : h
          )
        )
      }

      return { success: result.success, message: result.message }
    } catch (err) {
      console.error('[useHabits] Failed to use freeze:', err)
      return { success: false, message: 'Failed to use streak freeze' }
    }
  }, [habits])

  // Get habits at risk (in grace period)
  const getHabitsAtRisk = useCallback((): HabitWithStreak[] => {
    return habits.filter((habit) => {
      const status = getStreakStatus(habit.streak, habit.frequency)
      return status.inGracePeriod && status.currentStreak > 0
    })
  }, [habits])

  // Get top streaks
  const getTopStreaks = useCallback((): HabitWithStreak[] => {
    return [...habits]
      .filter((h) => h.streak.currentStreak > 0)
      .sort((a, b) => b.streak.currentStreak - a.streak.currentStreak)
      .slice(0, 5)
  }, [habits])

  return {
    habits,
    todayHabits,
    isLoading,
    error,
    stats,
    createHabit,
    deleteHabit,
    completeHabit,
    uncompleteHabit,
    isCompletedToday,
    useFreeze,
    getHabitsAtRisk,
    getTopStreaks,
    refresh: loadHabits,
  }
}

// ============================================================================
// ADDITIONAL HOOKS
// ============================================================================

/**
 * Hook for a single habit
 */
export function useHabit(taskId: string | null) {
  const [habit, setHabit] = useState<HabitWithStreak | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!taskId) {
      setHabit(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)

    Promise.all([
      taskDb.getTask(taskId),
      habitDb.getOrCreateStreak(taskId),
    ]).then(([task, streak]) => {
      if (task && streak) {
        // Infer frequency from recurrence rule
        let frequency: HabitFrequency = 'daily'
        if (task.recurrenceRule) {
          if (
            task.recurrenceRule.frequency === 'weekly' &&
            task.recurrenceRule.byDay?.length === 5
          ) {
            frequency = 'weekdays'
          } else if (task.recurrenceRule.frequency === 'weekly') {
            frequency = 'weekly'
          }
        }

        setHabit({
          ...task,
          streak,
          frequency,
          targetCount: 1,
          preferredTime: task.dueTime,
        })
      }
      setIsLoading(false)
    }).catch((err) => {
      console.error('[useHabit] Failed to load habit:', err)
      setIsLoading(false)
    })
  }, [taskId])

  return { habit, isLoading }
}

/**
 * Hook for habit streak only
 */
export function useHabitStreak(taskId: string | null) {
  const [streak, setStreak] = useState<HabitStreak | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!taskId) {
      setStreak(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    habitDb.getHabitStreak(taskId).then((s) => {
      setStreak(s)
      setIsLoading(false)
    }).catch(() => {
      setIsLoading(false)
    })
  }, [taskId])

  return { streak, isLoading }
}
