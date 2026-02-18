/**
 * Recurrence Generator Tests
 * @module tests/unit/habits/recurrenceGenerator
 *
 * Tests for RFC 5545 recurrence rule generation and occurrence calculation.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  frequencyToRecurrenceRule,
  recurrenceRuleToFrequency,
  isOccurrenceDate,
  generateOccurrences,
  getNextOccurrence,
  getPreviousOccurrence,
  isTodayOccurrence,
  countOccurrences,
  getNextWeekday,
  getWeekdaysInRange,
  describeRecurrence,
} from '@/lib/planner/habits/recurrenceGenerator'
import type { RecurrenceRule } from '@/lib/planner/types'
import type { HabitFrequency } from '@/lib/planner/habits/types'

// Helper to get date string N days from a base date
function daysFromDate(baseDate: string, days: number): string {
  const [year, month, day] = baseDate.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  date.setDate(date.getDate() + days)
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// Helper to get today's date
function getToday(): string {
  // Use local time to match the library's getToday() implementation
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Helper to get day of week for a date string (0=Sunday, 6=Saturday)
function getDayOfWeek(dateStr: string): number {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day).getDay()
}

describe('Recurrence Generator', () => {
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

    it('should convert weekdays frequency with byDay', () => {
      const rule = frequencyToRecurrenceRule('weekdays')

      expect(rule.frequency).toBe('weekly')
      expect(rule.interval).toBe(1)
      expect(rule.byDay).toEqual([1, 2, 3, 4, 5])
    })

    it('should treat custom as daily', () => {
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

    it('should return custom for complex rules', () => {
      const rule: RecurrenceRule = {
        frequency: 'daily',
        interval: 3, // Every 3 days is custom
      }

      expect(recurrenceRuleToFrequency(rule)).toBe('custom')
    })

    it('should return custom for monthly', () => {
      const rule: RecurrenceRule = {
        frequency: 'monthly',
        interval: 1,
      }

      expect(recurrenceRuleToFrequency(rule)).toBe('custom')
    })
  })

  describe('isOccurrenceDate', () => {
    const startDate = '2024-01-01' // Monday

    describe('daily rules', () => {
      it('should match every day for interval 1', () => {
        const rule: RecurrenceRule = { frequency: 'daily', interval: 1 }

        expect(isOccurrenceDate(rule, startDate, '2024-01-01')).toBe(true)
        expect(isOccurrenceDate(rule, startDate, '2024-01-02')).toBe(true)
        expect(isOccurrenceDate(rule, startDate, '2024-01-10')).toBe(true)
      })

      it('should match every other day for interval 2', () => {
        const rule: RecurrenceRule = { frequency: 'daily', interval: 2 }

        expect(isOccurrenceDate(rule, startDate, '2024-01-01')).toBe(true)
        expect(isOccurrenceDate(rule, startDate, '2024-01-02')).toBe(false)
        expect(isOccurrenceDate(rule, startDate, '2024-01-03')).toBe(true)
      })

      it('should not match dates before start', () => {
        const rule: RecurrenceRule = { frequency: 'daily', interval: 1 }

        expect(isOccurrenceDate(rule, startDate, '2023-12-31')).toBe(false)
      })
    })

    describe('weekly rules', () => {
      it('should match same day of week', () => {
        const rule: RecurrenceRule = { frequency: 'weekly', interval: 1 }
        // startDate is Monday, so should match every Monday

        expect(isOccurrenceDate(rule, startDate, '2024-01-01')).toBe(true) // Monday
        expect(isOccurrenceDate(rule, startDate, '2024-01-08')).toBe(true) // Monday
        expect(isOccurrenceDate(rule, startDate, '2024-01-02')).toBe(false) // Tuesday
      })

      it('should match byDay patterns', () => {
        const rule: RecurrenceRule = {
          frequency: 'weekly',
          interval: 1,
          byDay: [1, 3, 5], // Mon, Wed, Fri
        }

        expect(isOccurrenceDate(rule, startDate, '2024-01-01')).toBe(true) // Monday
        expect(isOccurrenceDate(rule, startDate, '2024-01-02')).toBe(false) // Tuesday
        expect(isOccurrenceDate(rule, startDate, '2024-01-03')).toBe(true) // Wednesday
        expect(isOccurrenceDate(rule, startDate, '2024-01-05')).toBe(true) // Friday
      })

      it('should respect bi-weekly interval', () => {
        const rule: RecurrenceRule = { frequency: 'weekly', interval: 2 }

        expect(isOccurrenceDate(rule, startDate, '2024-01-01')).toBe(true) // Week 0
        expect(isOccurrenceDate(rule, startDate, '2024-01-08')).toBe(false) // Week 1
        expect(isOccurrenceDate(rule, startDate, '2024-01-15')).toBe(true) // Week 2
      })
    })

    describe('monthly rules', () => {
      it('should match same day of month', () => {
        const rule: RecurrenceRule = { frequency: 'monthly', interval: 1 }

        expect(isOccurrenceDate(rule, startDate, '2024-01-01')).toBe(true)
        expect(isOccurrenceDate(rule, startDate, '2024-02-01')).toBe(true)
        expect(isOccurrenceDate(rule, startDate, '2024-01-15')).toBe(false)
      })

      it('should match byMonthDay patterns', () => {
        const rule: RecurrenceRule = {
          frequency: 'monthly',
          interval: 1,
          byMonthDay: [1, 15],
        }

        expect(isOccurrenceDate(rule, startDate, '2024-01-01')).toBe(true)
        expect(isOccurrenceDate(rule, startDate, '2024-01-15')).toBe(true)
        expect(isOccurrenceDate(rule, startDate, '2024-01-10')).toBe(false)
      })
    })

    describe('yearly rules', () => {
      it('should match same day and month each year', () => {
        const rule: RecurrenceRule = { frequency: 'yearly', interval: 1 }

        expect(isOccurrenceDate(rule, startDate, '2024-01-01')).toBe(true)
        expect(isOccurrenceDate(rule, startDate, '2025-01-01')).toBe(true)
        expect(isOccurrenceDate(rule, startDate, '2024-06-01')).toBe(false)
      })

      it('should match byMonth patterns', () => {
        const rule: RecurrenceRule = {
          frequency: 'yearly',
          interval: 1,
          byMonth: [1, 7], // January and July
          byMonthDay: [1],
        }

        expect(isOccurrenceDate(rule, startDate, '2024-01-01')).toBe(true)
        expect(isOccurrenceDate(rule, startDate, '2024-07-01')).toBe(true)
        expect(isOccurrenceDate(rule, startDate, '2024-03-01')).toBe(false)
      })
    })

    describe('end date handling', () => {
      it('should not match after end date', () => {
        const rule: RecurrenceRule = {
          frequency: 'daily',
          interval: 1,
          endDate: '2024-01-10',
        }

        expect(isOccurrenceDate(rule, startDate, '2024-01-05')).toBe(true)
        expect(isOccurrenceDate(rule, startDate, '2024-01-10')).toBe(true)
        expect(isOccurrenceDate(rule, startDate, '2024-01-11')).toBe(false)
      })
    })
  })

  describe('generateOccurrences', () => {
    const startDate = '2024-01-01' // Monday

    it('should generate daily occurrences', () => {
      const rule: RecurrenceRule = { frequency: 'daily', interval: 1 }

      const occurrences = generateOccurrences(rule, startDate, {
        startDate: '2024-01-01',
        endDate: '2024-01-07',
        includeStart: true,
      })

      expect(occurrences).toHaveLength(7)
      expect(occurrences[0].date).toBe('2024-01-01')
      expect(occurrences[6].date).toBe('2024-01-07')
    })

    it('should generate weekly occurrences', () => {
      const rule: RecurrenceRule = { frequency: 'weekly', interval: 1 }

      const occurrences = generateOccurrences(rule, startDate, {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        includeStart: true,
      })

      expect(occurrences.length).toBeGreaterThanOrEqual(4) // At least 4 Mondays
      occurrences.forEach((occ) => {
        expect(getDayOfWeek(occ.date)).toBe(1) // All should be Monday
      })
    })

    it('should generate weekday occurrences', () => {
      const rule: RecurrenceRule = {
        frequency: 'weekly',
        interval: 1,
        byDay: [1, 2, 3, 4, 5],
      }

      const occurrences = generateOccurrences(rule, startDate, {
        startDate: '2024-01-01',
        endDate: '2024-01-07',
        includeStart: true,
      })

      // Should have 5 weekdays in this range (Mon-Fri)
      expect(occurrences).toHaveLength(5)
      occurrences.forEach((occ) => {
        const day = getDayOfWeek(occ.date)
        expect(day).toBeGreaterThanOrEqual(1)
        expect(day).toBeLessThanOrEqual(5)
      })
    })

    it('should respect maxOccurrences limit', () => {
      const rule: RecurrenceRule = { frequency: 'daily', interval: 1 }

      const occurrences = generateOccurrences(rule, startDate, {
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        maxOccurrences: 10,
        includeStart: true,
      })

      expect(occurrences).toHaveLength(10)
    })

    it('should exclude start date when includeStart is false', () => {
      const rule: RecurrenceRule = { frequency: 'daily', interval: 1 }

      const occurrences = generateOccurrences(rule, startDate, {
        startDate: '2024-01-01',
        endDate: '2024-01-05',
        includeStart: false,
      })

      expect(occurrences[0].date).toBe('2024-01-02')
    })

    it('should mark isPast and isToday correctly', () => {
      const rule: RecurrenceRule = { frequency: 'daily', interval: 1 }
      const today = getToday()

      const occurrences = generateOccurrences(rule, '2020-01-01', {
        startDate: daysFromDate(today, -2),
        endDate: daysFromDate(today, 2),
        includeStart: true,
      })

      const todayOcc = occurrences.find((o) => o.date === today)
      expect(todayOcc?.isToday).toBe(true)
      expect(todayOcc?.isPast).toBe(false)

      const pastOcc = occurrences.find((o) => o.date === daysFromDate(today, -1))
      expect(pastOcc?.isPast).toBe(true)

      const futureOcc = occurrences.find((o) => o.date === daysFromDate(today, 1))
      expect(futureOcc?.isPast).toBe(false)
      expect(futureOcc?.isToday).toBe(false)
    })

    it('should respect count limit in rule', () => {
      const rule: RecurrenceRule = { frequency: 'daily', interval: 1, count: 5 }

      const occurrences = generateOccurrences(rule, startDate, {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        includeStart: true,
      })

      expect(occurrences).toHaveLength(5)
    })
  })

  describe('getNextOccurrence', () => {
    it('should find next daily occurrence', () => {
      const rule: RecurrenceRule = { frequency: 'daily', interval: 1 }
      const today = getToday()

      const next = getNextOccurrence(rule, '2020-01-01', today)

      expect(next).toBe(daysFromDate(today, 1))
    })

    it('should find next weekly occurrence', () => {
      const rule: RecurrenceRule = { frequency: 'weekly', interval: 1 }
      const startDate = '2024-01-01' // Monday

      const next = getNextOccurrence(rule, startDate, '2024-01-02')

      expect(next).toBe('2024-01-08') // Next Monday
    })

    it('should return null if no occurrence in 2 years', () => {
      const rule: RecurrenceRule = {
        frequency: 'daily',
        interval: 1,
        endDate: '2020-01-10',
      }

      const next = getNextOccurrence(rule, '2020-01-01', '2024-01-01')

      expect(next).toBeNull()
    })
  })

  describe('getPreviousOccurrence', () => {
    it('should find previous daily occurrence', () => {
      const rule: RecurrenceRule = { frequency: 'daily', interval: 1 }
      const today = getToday()

      const prev = getPreviousOccurrence(rule, '2020-01-01', today)

      expect(prev).toBe(daysFromDate(today, -1))
    })

    it('should find previous weekly occurrence', () => {
      const rule: RecurrenceRule = { frequency: 'weekly', interval: 1 }
      const startDate = '2024-01-01' // Monday

      const prev = getPreviousOccurrence(rule, startDate, '2024-01-10')

      expect(prev).toBe('2024-01-08') // Previous Monday
    })

    it('should return null if no previous occurrence', () => {
      const rule: RecurrenceRule = { frequency: 'daily', interval: 1 }
      const startDate = '2024-01-15'

      const prev = getPreviousOccurrence(rule, startDate, '2024-01-10')

      expect(prev).toBeNull()
    })
  })

  describe('isTodayOccurrence', () => {
    it('should return true for daily rule', () => {
      const rule: RecurrenceRule = { frequency: 'daily', interval: 1 }

      expect(isTodayOccurrence(rule, '2020-01-01')).toBe(true)
    })

    it('should check weekday for weekly rule', () => {
      const today = getToday()
      const todayDow = getDayOfWeek(today)
      const rule: RecurrenceRule = {
        frequency: 'weekly',
        interval: 1,
        byDay: [todayDow],
      }

      expect(isTodayOccurrence(rule, '2020-01-01')).toBe(true)
    })
  })

  describe('countOccurrences', () => {
    it('should count daily occurrences correctly', () => {
      const rule: RecurrenceRule = { frequency: 'daily', interval: 1 }

      const count = countOccurrences(rule, '2024-01-01', '2024-01-01', '2024-01-31')

      expect(count).toBe(31)
    })

    it('should count weekly occurrences', () => {
      const rule: RecurrenceRule = { frequency: 'weekly', interval: 1 }

      const count = countOccurrences(rule, '2024-01-01', '2024-01-01', '2024-01-31')

      expect(count).toBe(5) // 5 Mondays in Jan 2024
    })

    it('should count weekday occurrences', () => {
      const rule: RecurrenceRule = {
        frequency: 'weekly',
        interval: 1,
        byDay: [1, 2, 3, 4, 5],
      }

      const count = countOccurrences(rule, '2024-01-01', '2024-01-01', '2024-01-07')

      expect(count).toBe(5) // Mon-Fri
    })
  })

  describe('getNextWeekday', () => {
    it('should skip Saturday to Monday', () => {
      // 2024-01-06 is a Saturday
      const next = getNextWeekday('2024-01-06')

      expect(next).toBe('2024-01-08') // Monday
    })

    it('should skip Sunday to Monday', () => {
      // 2024-01-07 is a Sunday
      const next = getNextWeekday('2024-01-07')

      expect(next).toBe('2024-01-08') // Monday
    })

    it('should return next day for weekday', () => {
      // 2024-01-03 is a Wednesday
      const next = getNextWeekday('2024-01-03')

      expect(next).toBe('2024-01-04') // Thursday
    })

    it('should skip Friday to Monday', () => {
      // 2024-01-05 is a Friday
      const next = getNextWeekday('2024-01-05')

      expect(next).toBe('2024-01-08') // Monday
    })
  })

  describe('getWeekdaysInRange', () => {
    it('should return only weekdays', () => {
      // 2024-01-01 (Mon) to 2024-01-07 (Sun)
      const weekdays = getWeekdaysInRange('2024-01-01', '2024-01-07')

      expect(weekdays).toHaveLength(5)
      expect(weekdays).toContain('2024-01-01') // Monday
      expect(weekdays).toContain('2024-01-02') // Tuesday
      expect(weekdays).toContain('2024-01-03') // Wednesday
      expect(weekdays).toContain('2024-01-04') // Thursday
      expect(weekdays).toContain('2024-01-05') // Friday
      expect(weekdays).not.toContain('2024-01-06') // Saturday
      expect(weekdays).not.toContain('2024-01-07') // Sunday
    })

    it('should return empty array for weekend-only range', () => {
      const weekdays = getWeekdaysInRange('2024-01-06', '2024-01-07')

      expect(weekdays).toHaveLength(0)
    })
  })

  describe('describeRecurrence', () => {
    it('should describe daily rule', () => {
      const rule: RecurrenceRule = { frequency: 'daily', interval: 1 }

      expect(describeRecurrence(rule)).toBe('Every day')
    })

    it('should describe every N days', () => {
      const rule: RecurrenceRule = { frequency: 'daily', interval: 3 }

      expect(describeRecurrence(rule)).toBe('Every 3 days')
    })

    it('should describe weekdays', () => {
      const rule: RecurrenceRule = {
        frequency: 'weekly',
        interval: 1,
        byDay: [1, 2, 3, 4, 5],
      }

      expect(describeRecurrence(rule)).toBe('Every weekday')
    })

    it('should describe weekends', () => {
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

    it('should describe simple weekly', () => {
      const rule: RecurrenceRule = { frequency: 'weekly', interval: 1 }

      expect(describeRecurrence(rule)).toBe('Weekly')
    })

    it('should describe bi-weekly', () => {
      const rule: RecurrenceRule = { frequency: 'weekly', interval: 2 }

      expect(describeRecurrence(rule)).toBe('Every 2 weeks')
    })

    it('should describe monthly', () => {
      const rule: RecurrenceRule = { frequency: 'monthly', interval: 1 }

      expect(describeRecurrence(rule)).toBe('Monthly')
    })

    it('should describe monthly with specific day', () => {
      const rule: RecurrenceRule = {
        frequency: 'monthly',
        interval: 1,
        byMonthDay: [15],
      }

      expect(describeRecurrence(rule)).toContain('15')
    })

    it('should describe yearly', () => {
      const rule: RecurrenceRule = { frequency: 'yearly', interval: 1 }

      expect(describeRecurrence(rule)).toBe('Yearly')
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
        count: 30,
      }

      expect(describeRecurrence(rule)).toContain('30 times')
    })
  })
})
