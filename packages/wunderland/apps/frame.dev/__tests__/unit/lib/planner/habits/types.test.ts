/**
 * Habit Types Tests
 * @module __tests__/unit/lib/planner/habits/types.test
 *
 * Tests for habit type constants and labels.
 */

import { describe, it, expect } from 'vitest'
import {
  HABIT_FREQUENCY_LABELS,
  HABIT_FREQUENCY_COLORS,
  GRACE_PERIODS,
  HABIT_ACHIEVEMENT_IDS,
  type HabitFrequency,
} from '@/lib/planner/habits/types'

// ============================================================================
// HABIT_FREQUENCY_LABELS
// ============================================================================

describe('HABIT_FREQUENCY_LABELS', () => {
  it('has label for daily', () => {
    expect(HABIT_FREQUENCY_LABELS.daily).toBe('Every day')
  })

  it('has label for weekly', () => {
    expect(HABIT_FREQUENCY_LABELS.weekly).toBe('Once a week')
  })

  it('has label for weekdays', () => {
    expect(HABIT_FREQUENCY_LABELS.weekdays).toBe('Weekdays only')
  })

  it('has label for custom', () => {
    expect(HABIT_FREQUENCY_LABELS.custom).toBe('Custom schedule')
  })

  it('has labels for all frequencies', () => {
    const frequencies: HabitFrequency[] = ['daily', 'weekly', 'weekdays', 'custom']

    for (const freq of frequencies) {
      expect(HABIT_FREQUENCY_LABELS[freq]).toBeDefined()
      expect(typeof HABIT_FREQUENCY_LABELS[freq]).toBe('string')
    }
  })
})

// ============================================================================
// HABIT_FREQUENCY_COLORS
// ============================================================================

describe('HABIT_FREQUENCY_COLORS', () => {
  it('has color for daily (green)', () => {
    expect(HABIT_FREQUENCY_COLORS.daily).toBe('#22c55e')
  })

  it('has color for weekly (blue)', () => {
    expect(HABIT_FREQUENCY_COLORS.weekly).toBe('#3b82f6')
  })

  it('has color for weekdays (purple)', () => {
    expect(HABIT_FREQUENCY_COLORS.weekdays).toBe('#8b5cf6')
  })

  it('has color for custom (gray)', () => {
    expect(HABIT_FREQUENCY_COLORS.custom).toBe('#71717a')
  })

  it('all colors are valid hex codes', () => {
    const hexPattern = /^#[0-9a-fA-F]{6}$/

    for (const color of Object.values(HABIT_FREQUENCY_COLORS)) {
      expect(color).toMatch(hexPattern)
    }
  })

  it('has colors for all frequencies', () => {
    const frequencies: HabitFrequency[] = ['daily', 'weekly', 'weekdays', 'custom']

    for (const freq of frequencies) {
      expect(HABIT_FREQUENCY_COLORS[freq]).toBeDefined()
    }
  })
})

// ============================================================================
// GRACE_PERIODS
// ============================================================================

describe('GRACE_PERIODS', () => {
  it('has 1 day grace for daily habits', () => {
    expect(GRACE_PERIODS.daily).toBe(1)
  })

  it('has 3 days grace for weekly habits', () => {
    expect(GRACE_PERIODS.weekly).toBe(3)
  })

  it('has 1 day grace for weekday habits', () => {
    expect(GRACE_PERIODS.weekdays).toBe(1)
  })

  it('has 2 days grace for custom habits', () => {
    expect(GRACE_PERIODS.custom).toBe(2)
  })

  it('all grace periods are positive integers', () => {
    for (const period of Object.values(GRACE_PERIODS)) {
      expect(period).toBeGreaterThan(0)
      expect(Number.isInteger(period)).toBe(true)
    }
  })

  it('has grace periods for all frequencies', () => {
    const frequencies: HabitFrequency[] = ['daily', 'weekly', 'weekdays', 'custom']

    for (const freq of frequencies) {
      expect(GRACE_PERIODS[freq]).toBeDefined()
    }
  })

  it('weekly has longest grace period', () => {
    expect(GRACE_PERIODS.weekly).toBeGreaterThan(GRACE_PERIODS.daily)
    expect(GRACE_PERIODS.weekly).toBeGreaterThan(GRACE_PERIODS.weekdays)
    expect(GRACE_PERIODS.weekly).toBeGreaterThan(GRACE_PERIODS.custom)
  })
})

// ============================================================================
// HABIT_ACHIEVEMENT_IDS
// ============================================================================

describe('HABIT_ACHIEVEMENT_IDS', () => {
  it('has FIRST_HABIT achievement', () => {
    expect(HABIT_ACHIEVEMENT_IDS.FIRST_HABIT).toBe('first-habit')
  })

  it('has STREAK_3 achievement', () => {
    expect(HABIT_ACHIEVEMENT_IDS.STREAK_3).toBe('habit-streak-3')
  })

  it('has STREAK_7 achievement', () => {
    expect(HABIT_ACHIEVEMENT_IDS.STREAK_7).toBe('habit-streak-7')
  })

  it('has STREAK_30 achievement', () => {
    expect(HABIT_ACHIEVEMENT_IDS.STREAK_30).toBe('habit-streak-30')
  })

  it('has PERFECT_WEEK achievement', () => {
    expect(HABIT_ACHIEVEMENT_IDS.PERFECT_WEEK).toBe('perfect-week')
  })

  it('has HABIT_BUILDER achievement', () => {
    expect(HABIT_ACHIEVEMENT_IDS.HABIT_BUILDER).toBe('habit-builder')
  })

  it('has PHOENIX_RISE achievement', () => {
    expect(HABIT_ACHIEVEMENT_IDS.PHOENIX_RISE).toBe('phoenix-rise')
  })

  it('all achievement IDs are unique', () => {
    const ids = Object.values(HABIT_ACHIEVEMENT_IDS)
    const uniqueIds = new Set(ids)

    expect(uniqueIds.size).toBe(ids.length)
  })

  it('all achievement IDs are kebab-case strings', () => {
    const kebabPattern = /^[a-z]+(-[a-z0-9]+)*$/

    for (const id of Object.values(HABIT_ACHIEVEMENT_IDS)) {
      expect(id).toMatch(kebabPattern)
    }
  })

  it('streak achievements follow naming pattern', () => {
    expect(HABIT_ACHIEVEMENT_IDS.STREAK_3).toContain('streak')
    expect(HABIT_ACHIEVEMENT_IDS.STREAK_7).toContain('streak')
    expect(HABIT_ACHIEVEMENT_IDS.STREAK_30).toContain('streak')
  })
})
