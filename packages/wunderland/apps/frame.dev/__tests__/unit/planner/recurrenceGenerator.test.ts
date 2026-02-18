/**
 * Recurrence Generator Tests
 * @module tests/unit/planner/recurrenceGenerator
 *
 * Tests for recurrence pattern generation, occurrence detection,
 * and date calculations for habits and recurring tasks.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import {
  frequencyToRecurrenceRule,
  recurrenceRuleToFrequency,
  isOccurrenceDate,
  generateOccurrences,
  getNextOccurrence,
  getPreviousOccurrence,
  countOccurrences,
  getNextWeekday,
  getWeekdaysInRange,
  describeRecurrence,
} from '@/lib/planner/habits/recurrenceGenerator'
import type { RecurrenceRule } from '@/lib/planner/types'

// ============================================================================
// FREQUENCY CONVERSION
// ============================================================================

describe('frequencyToRecurrenceRule', () => {
  it('should convert daily frequency', () => {
    const rule = frequencyToRecurrenceRule('daily')
    expect(rule.frequency).toBe('daily')
    expect(rule.interval).toBe(1)
  })

  it('should convert weekly frequency', () => {
    const rule = frequencyToRecurrenceRule('weekly')
    expect(rule.frequency).toBe('weekly')
    expect(rule.interval).toBe(1)
  })

  it('should convert weekdays frequency', () => {
    const rule = frequencyToRecurrenceRule('weekdays')
    expect(rule.frequency).toBe('weekly')
    expect(rule.interval).toBe(1)
    expect(rule.byDay).toEqual([1, 2, 3, 4, 5]) // Mon-Fri
  })

  it('should convert custom frequency to daily default', () => {
    const rule = frequencyToRecurrenceRule('custom')
    expect(rule.frequency).toBe('daily')
    expect(rule.interval).toBe(1)
  })
})

describe('recurrenceRuleToFrequency', () => {
  it('should detect weekdays pattern', () => {
    const rule: RecurrenceRule = {
      frequency: 'weekly',
      interval: 1,
      byDay: [1, 2, 3, 4, 5],
    }
    expect(recurrenceRuleToFrequency(rule)).toBe('weekdays')
  })

  it('should detect simple weekly', () => {
    const rule: RecurrenceRule = {
      frequency: 'weekly',
      interval: 1,
    }
    expect(recurrenceRuleToFrequency(rule)).toBe('weekly')
  })

  it('should detect simple daily', () => {
    const rule: RecurrenceRule = {
      frequency: 'daily',
      interval: 1,
    }
    expect(recurrenceRuleToFrequency(rule)).toBe('daily')
  })

  it('should return custom for complex patterns', () => {
    const rule: RecurrenceRule = {
      frequency: 'daily',
      interval: 3, // Every 3 days = custom
    }
    expect(recurrenceRuleToFrequency(rule)).toBe('custom')
  })
})

// ============================================================================
// OCCURRENCE DATE CHECKING
// ============================================================================

describe('isOccurrenceDate', () => {
  describe('daily recurrence', () => {
    it('should match every day for daily interval 1', () => {
      const rule: RecurrenceRule = { frequency: 'daily', interval: 1 }
      expect(isOccurrenceDate(rule, '2024-01-01', '2024-01-01')).toBe(true)
      expect(isOccurrenceDate(rule, '2024-01-01', '2024-01-02')).toBe(true)
      expect(isOccurrenceDate(rule, '2024-01-01', '2024-01-15')).toBe(true)
    })

    it('should match every other day for interval 2', () => {
      const rule: RecurrenceRule = { frequency: 'daily', interval: 2 }
      expect(isOccurrenceDate(rule, '2024-01-01', '2024-01-01')).toBe(true)
      expect(isOccurrenceDate(rule, '2024-01-01', '2024-01-02')).toBe(false)
      expect(isOccurrenceDate(rule, '2024-01-01', '2024-01-03')).toBe(true)
      expect(isOccurrenceDate(rule, '2024-01-01', '2024-01-04')).toBe(false)
    })

    it('should not match before start date', () => {
      const rule: RecurrenceRule = { frequency: 'daily', interval: 1 }
      expect(isOccurrenceDate(rule, '2024-01-15', '2024-01-10')).toBe(false)
    })
  })

  describe('weekly recurrence', () => {
    it('should match same day of week', () => {
      const rule: RecurrenceRule = { frequency: 'weekly', interval: 1 }
      // 2024-01-01 is Monday
      expect(isOccurrenceDate(rule, '2024-01-01', '2024-01-01')).toBe(true) // Monday
      expect(isOccurrenceDate(rule, '2024-01-01', '2024-01-08')).toBe(true) // Next Monday
      expect(isOccurrenceDate(rule, '2024-01-01', '2024-01-02')).toBe(false) // Tuesday
    })

    it('should match specific days with byDay', () => {
      const rule: RecurrenceRule = {
        frequency: 'weekly',
        interval: 1,
        byDay: [1, 3, 5], // Mon, Wed, Fri
      }
      // 2024-01-01 is Monday
      expect(isOccurrenceDate(rule, '2024-01-01', '2024-01-01')).toBe(true) // Monday
      expect(isOccurrenceDate(rule, '2024-01-01', '2024-01-02')).toBe(false) // Tuesday
      expect(isOccurrenceDate(rule, '2024-01-01', '2024-01-03')).toBe(true) // Wednesday
      expect(isOccurrenceDate(rule, '2024-01-01', '2024-01-04')).toBe(false) // Thursday
      expect(isOccurrenceDate(rule, '2024-01-01', '2024-01-05')).toBe(true) // Friday
    })

    it('should respect bi-weekly interval', () => {
      const rule: RecurrenceRule = { frequency: 'weekly', interval: 2 }
      // 2024-01-01 is Monday
      expect(isOccurrenceDate(rule, '2024-01-01', '2024-01-01')).toBe(true)
      expect(isOccurrenceDate(rule, '2024-01-01', '2024-01-08')).toBe(false) // Week 2
      expect(isOccurrenceDate(rule, '2024-01-01', '2024-01-15')).toBe(true) // Week 3
    })
  })

  describe('monthly recurrence', () => {
    it('should match same day of month', () => {
      const rule: RecurrenceRule = { frequency: 'monthly', interval: 1 }
      expect(isOccurrenceDate(rule, '2024-01-15', '2024-01-15')).toBe(true)
      expect(isOccurrenceDate(rule, '2024-01-15', '2024-02-15')).toBe(true)
      expect(isOccurrenceDate(rule, '2024-01-15', '2024-02-16')).toBe(false)
    })

    it('should match specific days with byMonthDay', () => {
      const rule: RecurrenceRule = {
        frequency: 'monthly',
        interval: 1,
        byMonthDay: [1, 15],
      }
      expect(isOccurrenceDate(rule, '2024-01-01', '2024-01-01')).toBe(true)
      expect(isOccurrenceDate(rule, '2024-01-01', '2024-01-15')).toBe(true)
      expect(isOccurrenceDate(rule, '2024-01-01', '2024-01-10')).toBe(false)
    })
  })

  describe('yearly recurrence', () => {
    it('should match same date each year', () => {
      const rule: RecurrenceRule = { frequency: 'yearly', interval: 1 }
      expect(isOccurrenceDate(rule, '2024-03-15', '2024-03-15')).toBe(true)
      expect(isOccurrenceDate(rule, '2024-03-15', '2025-03-15')).toBe(true)
      expect(isOccurrenceDate(rule, '2024-03-15', '2025-03-16')).toBe(false)
    })
  })

  describe('end date handling', () => {
    it('should not match after end date', () => {
      const rule: RecurrenceRule = {
        frequency: 'daily',
        interval: 1,
        endDate: '2024-01-10',
      }
      expect(isOccurrenceDate(rule, '2024-01-01', '2024-01-05')).toBe(true)
      expect(isOccurrenceDate(rule, '2024-01-01', '2024-01-10')).toBe(true)
      expect(isOccurrenceDate(rule, '2024-01-01', '2024-01-11')).toBe(false)
    })
  })
})

// ============================================================================
// OCCURRENCE GENERATION
// ============================================================================

describe('generateOccurrences', () => {
  it('should generate daily occurrences', () => {
    const rule: RecurrenceRule = { frequency: 'daily', interval: 1 }
    const occurrences = generateOccurrences(rule, '2024-01-01', {
      startDate: '2024-01-01',
      endDate: '2024-01-05',
      includeStart: true,
    })

    expect(occurrences.length).toBe(5)
    expect(occurrences[0].date).toBe('2024-01-01')
    expect(occurrences[4].date).toBe('2024-01-05')
  })

  it('should respect maxOccurrences', () => {
    const rule: RecurrenceRule = { frequency: 'daily', interval: 1 }
    const occurrences = generateOccurrences(rule, '2024-01-01', {
      startDate: '2024-01-01',
      endDate: '2024-12-31',
      maxOccurrences: 10,
      includeStart: true,
    })

    expect(occurrences.length).toBe(10)
  })

  it('should respect rule count limit', () => {
    const rule: RecurrenceRule = { frequency: 'daily', interval: 1, count: 5 }
    const occurrences = generateOccurrences(rule, '2024-01-01', {
      startDate: '2024-01-01',
      endDate: '2024-12-31',
      includeStart: true,
    })

    expect(occurrences.length).toBe(5)
  })

  it('should generate weekday occurrences', () => {
    const rule: RecurrenceRule = {
      frequency: 'weekly',
      interval: 1,
      byDay: [1, 2, 3, 4, 5], // Mon-Fri
    }
    // Week of 2024-01-01 (Monday) to 2024-01-07 (Sunday)
    const occurrences = generateOccurrences(rule, '2024-01-01', {
      startDate: '2024-01-01',
      endDate: '2024-01-07',
      includeStart: true,
    })

    expect(occurrences.length).toBe(5) // Mon, Tue, Wed, Thu, Fri
    expect(occurrences.map(o => o.date)).toEqual([
      '2024-01-01', // Mon
      '2024-01-02', // Tue
      '2024-01-03', // Wed
      '2024-01-04', // Thu
      '2024-01-05', // Fri
    ])
  })

  it('should include occurrence index', () => {
    const rule: RecurrenceRule = { frequency: 'daily', interval: 1 }
    const occurrences = generateOccurrences(rule, '2024-01-01', {
      startDate: '2024-01-01',
      endDate: '2024-01-03',
      includeStart: true,
    })

    expect(occurrences[0].index).toBe(1)
    expect(occurrences[1].index).toBe(2)
    expect(occurrences[2].index).toBe(3)
  })
})

// ============================================================================
// NEXT/PREVIOUS OCCURRENCE
// ============================================================================

describe('getNextOccurrence', () => {
  it('should find next daily occurrence', () => {
    const rule: RecurrenceRule = { frequency: 'daily', interval: 1 }
    const next = getNextOccurrence(rule, '2024-01-01', '2024-01-05')
    expect(next).toBe('2024-01-06')
  })

  it('should find next weekly occurrence', () => {
    const rule: RecurrenceRule = { frequency: 'weekly', interval: 1 }
    // 2024-01-01 is Monday, so next occurrence is 2024-01-08
    const next = getNextOccurrence(rule, '2024-01-01', '2024-01-03')
    expect(next).toBe('2024-01-08')
  })

  it('should return null if no future occurrences (rule ended)', () => {
    const rule: RecurrenceRule = {
      frequency: 'daily',
      interval: 1,
      endDate: '2024-01-10',
    }
    const next = getNextOccurrence(rule, '2024-01-01', '2024-01-15')
    expect(next).toBeNull()
  })
})

describe('getPreviousOccurrence', () => {
  it('should find previous daily occurrence', () => {
    const rule: RecurrenceRule = { frequency: 'daily', interval: 1 }
    const prev = getPreviousOccurrence(rule, '2024-01-01', '2024-01-10')
    expect(prev).toBe('2024-01-09')
  })

  it('should return null if before start date', () => {
    const rule: RecurrenceRule = { frequency: 'daily', interval: 1 }
    const prev = getPreviousOccurrence(rule, '2024-01-10', '2024-01-05')
    expect(prev).toBeNull()
  })
})

// ============================================================================
// COUNT OCCURRENCES
// ============================================================================

describe('countOccurrences', () => {
  it('should count daily occurrences', () => {
    const rule: RecurrenceRule = { frequency: 'daily', interval: 1 }
    const count = countOccurrences(rule, '2024-01-01', '2024-01-01', '2024-01-10')
    expect(count).toBe(10)
  })

  it('should count weekly occurrences', () => {
    const rule: RecurrenceRule = { frequency: 'weekly', interval: 1 }
    // 4 Mondays in January starting from Jan 1
    const count = countOccurrences(rule, '2024-01-01', '2024-01-01', '2024-01-31')
    expect(count).toBe(5) // Jan 1, 8, 15, 22, 29
  })

  it('should count weekday occurrences', () => {
    const rule: RecurrenceRule = {
      frequency: 'weekly',
      interval: 1,
      byDay: [1, 2, 3, 4, 5],
    }
    // First week of Jan 2024 (Mon-Fri)
    const count = countOccurrences(rule, '2024-01-01', '2024-01-01', '2024-01-07')
    expect(count).toBe(5)
  })
})

// ============================================================================
// WEEKDAY HELPERS
// ============================================================================

describe('getNextWeekday', () => {
  it('should get next weekday from a weekday', () => {
    // 2024-01-01 is Monday, next weekday is Tuesday
    const next = getNextWeekday('2024-01-01')
    expect(next).toBe('2024-01-02')
  })

  it('should skip weekend from Friday', () => {
    // 2024-01-05 is Friday, next weekday is Monday 2024-01-08
    const next = getNextWeekday('2024-01-05')
    expect(next).toBe('2024-01-08')
  })

  it('should skip weekend from Saturday', () => {
    // 2024-01-06 is Saturday, next weekday is Monday 2024-01-08
    const next = getNextWeekday('2024-01-06')
    expect(next).toBe('2024-01-08')
  })
})

describe('getWeekdaysInRange', () => {
  it('should return weekdays in a week', () => {
    // Mon Jan 1 to Sun Jan 7
    const weekdays = getWeekdaysInRange('2024-01-01', '2024-01-07')
    expect(weekdays.length).toBe(5)
    expect(weekdays).toEqual([
      '2024-01-01',
      '2024-01-02',
      '2024-01-03',
      '2024-01-04',
      '2024-01-05',
    ])
  })

  it('should return empty for weekend-only range', () => {
    // Sat Jan 6 to Sun Jan 7
    const weekdays = getWeekdaysInRange('2024-01-06', '2024-01-07')
    expect(weekdays.length).toBe(0)
  })
})

// ============================================================================
// DESCRIBE RECURRENCE
// ============================================================================

describe('describeRecurrence', () => {
  it('should describe daily recurrence', () => {
    expect(describeRecurrence({ frequency: 'daily', interval: 1 })).toBe('Every day')
    expect(describeRecurrence({ frequency: 'daily', interval: 3 })).toBe('Every 3 days')
  })

  it('should describe weekly recurrence', () => {
    expect(describeRecurrence({ frequency: 'weekly', interval: 1 })).toBe('Weekly')
    expect(describeRecurrence({ frequency: 'weekly', interval: 2 })).toBe('Every 2 weeks')
  })

  it('should describe weekday recurrence', () => {
    const rule: RecurrenceRule = {
      frequency: 'weekly',
      interval: 1,
      byDay: [1, 2, 3, 4, 5],
    }
    expect(describeRecurrence(rule)).toBe('Every weekday')
  })

  it('should describe weekend recurrence', () => {
    const rule: RecurrenceRule = {
      frequency: 'weekly',
      interval: 1,
      byDay: [0, 6],
    }
    expect(describeRecurrence(rule)).toBe('Every weekend')
  })

  it('should describe specific days', () => {
    const rule: RecurrenceRule = {
      frequency: 'weekly',
      interval: 1,
      byDay: [1, 3, 5],
    }
    expect(describeRecurrence(rule)).toBe('Every Monday, Wednesday, Friday')
  })

  it('should describe monthly recurrence', () => {
    expect(describeRecurrence({ frequency: 'monthly', interval: 1 })).toBe('Monthly')
    expect(describeRecurrence({ frequency: 'monthly', interval: 2 })).toBe('Every 2 months')
  })

  it('should describe yearly recurrence', () => {
    expect(describeRecurrence({ frequency: 'yearly', interval: 1 })).toBe('Yearly')
    expect(describeRecurrence({ frequency: 'yearly', interval: 2 })).toBe('Every 2 years')
  })

  it('should include end date', () => {
    const rule: RecurrenceRule = {
      frequency: 'daily',
      interval: 1,
      endDate: '2024-12-31',
    }
    expect(describeRecurrence(rule)).toContain('until 2024-12-31')
  })

  it('should include count', () => {
    const rule: RecurrenceRule = {
      frequency: 'daily',
      interval: 1,
      count: 10,
    }
    expect(describeRecurrence(rule)).toContain('10 times')
  })
})
