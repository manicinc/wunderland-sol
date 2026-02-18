/**
 * Planner Types Tests
 * @module __tests__/unit/lib/planner/types.test
 *
 * Tests for planner type constants and utility functions.
 */

import { describe, it, expect } from 'vitest'
import {
  PRIORITY_COLORS,
  STATUS_LABELS,
  DURATION_OPTIONS,
  formatDuration,
  type TaskStatus,
  type TaskPriority,
} from '@/lib/planner/types'

// ============================================================================
// PRIORITY_COLORS
// ============================================================================

describe('PRIORITY_COLORS', () => {
  it('has colors for low priority', () => {
    expect(PRIORITY_COLORS.low).toBeDefined()
    expect(PRIORITY_COLORS.low.bg).toContain('green')
    expect(PRIORITY_COLORS.low.text).toBeDefined()
    expect(PRIORITY_COLORS.low.border).toBeDefined()
  })

  it('has colors for medium priority', () => {
    expect(PRIORITY_COLORS.medium).toBeDefined()
    expect(PRIORITY_COLORS.medium.bg).toContain('yellow')
    expect(PRIORITY_COLORS.medium.text).toBeDefined()
    expect(PRIORITY_COLORS.medium.border).toBeDefined()
  })

  it('has colors for high priority', () => {
    expect(PRIORITY_COLORS.high).toBeDefined()
    expect(PRIORITY_COLORS.high.bg).toContain('orange')
    expect(PRIORITY_COLORS.high.text).toBeDefined()
    expect(PRIORITY_COLORS.high.border).toBeDefined()
  })

  it('has colors for urgent priority', () => {
    expect(PRIORITY_COLORS.urgent).toBeDefined()
    expect(PRIORITY_COLORS.urgent.bg).toContain('red')
    expect(PRIORITY_COLORS.urgent.text).toBeDefined()
    expect(PRIORITY_COLORS.urgent.border).toBeDefined()
  })

  it('all priorities have consistent structure', () => {
    const priorities: TaskPriority[] = ['low', 'medium', 'high', 'urgent']

    for (const priority of priorities) {
      const colors = PRIORITY_COLORS[priority]
      expect(typeof colors.bg).toBe('string')
      expect(typeof colors.text).toBe('string')
      expect(typeof colors.border).toBe('string')
    }
  })

  it('includes dark mode variants', () => {
    const priorities: TaskPriority[] = ['low', 'medium', 'high', 'urgent']

    for (const priority of priorities) {
      const colors = PRIORITY_COLORS[priority]
      expect(colors.bg).toContain('dark:')
      expect(colors.text).toContain('dark:')
      expect(colors.border).toContain('dark:')
    }
  })
})

// ============================================================================
// STATUS_LABELS
// ============================================================================

describe('STATUS_LABELS', () => {
  it('has label for pending', () => {
    expect(STATUS_LABELS.pending).toBe('To Do')
  })

  it('has label for in_progress', () => {
    expect(STATUS_LABELS.in_progress).toBe('In Progress')
  })

  it('has label for completed', () => {
    expect(STATUS_LABELS.completed).toBe('Done')
  })

  it('has label for cancelled', () => {
    expect(STATUS_LABELS.cancelled).toBe('Cancelled')
  })

  it('has labels for all statuses', () => {
    const statuses: TaskStatus[] = ['pending', 'in_progress', 'completed', 'cancelled']

    for (const status of statuses) {
      expect(STATUS_LABELS[status]).toBeDefined()
      expect(typeof STATUS_LABELS[status]).toBe('string')
      expect(STATUS_LABELS[status].length).toBeGreaterThan(0)
    }
  })
})

// ============================================================================
// DURATION_OPTIONS
// ============================================================================

describe('DURATION_OPTIONS', () => {
  it('includes common short durations', () => {
    const values = DURATION_OPTIONS.map(opt => opt.value)

    expect(values).toContain(5)
    expect(values).toContain(10)
    expect(values).toContain(15)
    expect(values).toContain(30)
  })

  it('includes hour-long durations', () => {
    const values = DURATION_OPTIONS.map(opt => opt.value)

    expect(values).toContain(60)
    expect(values).toContain(90)
    expect(values).toContain(120)
  })

  it('includes multi-hour durations', () => {
    const values = DURATION_OPTIONS.map(opt => opt.value)

    expect(values).toContain(180) // 3 hours
    expect(values).toContain(240) // 4 hours
    expect(values).toContain(480) // 8 hours
  })

  it('is sorted by value ascending', () => {
    const values = DURATION_OPTIONS.map(opt => opt.value)
    const sorted = [...values].sort((a, b) => a - b)

    expect(values).toEqual(sorted)
  })

  it('all options have value and label', () => {
    for (const option of DURATION_OPTIONS) {
      expect(option.value).toBeDefined()
      expect(typeof option.value).toBe('number')
      expect(option.label).toBeDefined()
      expect(typeof option.label).toBe('string')
    }
  })

  it('labels contain time units', () => {
    for (const option of DURATION_OPTIONS) {
      expect(option.label).toMatch(/min|hour/)
    }
  })

  it('all values are positive', () => {
    for (const option of DURATION_OPTIONS) {
      expect(option.value).toBeGreaterThan(0)
    }
  })

  it('has expected number of options', () => {
    expect(DURATION_OPTIONS.length).toBeGreaterThanOrEqual(10)
  })
})

// ============================================================================
// formatDuration
// ============================================================================

describe('formatDuration', () => {
  describe('minutes only', () => {
    it('formats 5 minutes', () => {
      expect(formatDuration(5)).toBe('5m')
    })

    it('formats 15 minutes', () => {
      expect(formatDuration(15)).toBe('15m')
    })

    it('formats 30 minutes', () => {
      expect(formatDuration(30)).toBe('30m')
    })

    it('formats 45 minutes', () => {
      expect(formatDuration(45)).toBe('45m')
    })

    it('formats 59 minutes', () => {
      expect(formatDuration(59)).toBe('59m')
    })
  })

  describe('hours only', () => {
    it('formats 1 hour', () => {
      expect(formatDuration(60)).toBe('1h')
    })

    it('formats 2 hours', () => {
      expect(formatDuration(120)).toBe('2h')
    })

    it('formats 3 hours', () => {
      expect(formatDuration(180)).toBe('3h')
    })

    it('formats 8 hours', () => {
      expect(formatDuration(480)).toBe('8h')
    })

    it('formats 24 hours', () => {
      expect(formatDuration(1440)).toBe('24h')
    })
  })

  describe('hours and minutes', () => {
    it('formats 1 hour 30 minutes', () => {
      expect(formatDuration(90)).toBe('1h 30m')
    })

    it('formats 1 hour 15 minutes', () => {
      expect(formatDuration(75)).toBe('1h 15m')
    })

    it('formats 2 hours 15 minutes', () => {
      expect(formatDuration(135)).toBe('2h 15m')
    })

    it('formats 3 hours 45 minutes', () => {
      expect(formatDuration(225)).toBe('3h 45m')
    })

    it('formats 1 hour 1 minute', () => {
      expect(formatDuration(61)).toBe('1h 1m')
    })
  })

  describe('edge cases', () => {
    it('formats 0 minutes', () => {
      expect(formatDuration(0)).toBe('0m')
    })

    it('formats 1 minute', () => {
      expect(formatDuration(1)).toBe('1m')
    })

    it('handles large values', () => {
      expect(formatDuration(2880)).toBe('48h') // 2 days
    })
  })
})
