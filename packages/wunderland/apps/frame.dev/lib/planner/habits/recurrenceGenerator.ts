/**
 * Recurrence Generator
 *
 * Generates task instances from RecurrenceRule definitions:
 * - Daily, weekly, monthly, yearly patterns
 * - Weekday-only scheduling
 * - Occurrence date calculation
 * - Next occurrence finding
 *
 * @module lib/planner/habits/recurrenceGenerator
 */

import type { RecurrenceRule, RecurrenceFrequency } from '../types'
import type { HabitFrequency } from './types'

// ============================================================================
// TYPES
// ============================================================================

export interface OccurrenceOptions {
  /** Start date for generating occurrences (ISO date) */
  startDate: string
  /** End date for generating occurrences (ISO date) */
  endDate: string
  /** Maximum number of occurrences to generate */
  maxOccurrences?: number
  /** Include the start date if it matches */
  includeStart?: boolean
}

export interface Occurrence {
  /** ISO date string (YYYY-MM-DD) */
  date: string
  /** Occurrence number (1-based) */
  index: number
  /** Whether this occurrence is in the past */
  isPast: boolean
  /** Whether this is today */
  isToday: boolean
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Parse ISO date string to Date object (in local timezone)
 */
function parseDate(isoDate: string): Date {
  const [year, month, day] = isoDate.split('-').map(Number)
  return new Date(year, month - 1, day)
}

/**
 * Format Date to ISO date string
 */
function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Get today's date as ISO string
 */
function getToday(): string {
  return formatDate(new Date())
}

/**
 * Check if date is a weekday (Mon-Fri)
 */
function isWeekday(date: Date): boolean {
  const day = date.getDay()
  return day !== 0 && day !== 6
}

/**
 * Add days to a date
 */
function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

/**
 * Add weeks to a date
 */
function addWeeks(date: Date, weeks: number): Date {
  return addDays(date, weeks * 7)
}

/**
 * Add months to a date
 */
function addMonths(date: Date, months: number): Date {
  const result = new Date(date)
  result.setMonth(result.getMonth() + months)
  return result
}

/**
 * Add years to a date
 */
function addYears(date: Date, years: number): Date {
  const result = new Date(date)
  result.setFullYear(result.getFullYear() + years)
  return result
}

/**
 * Check if two dates are the same day
 */
function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

// ============================================================================
// RECURRENCE RULE HELPERS
// ============================================================================

/**
 * Convert HabitFrequency to RecurrenceRule
 */
export function frequencyToRecurrenceRule(frequency: HabitFrequency): RecurrenceRule {
  switch (frequency) {
    case 'daily':
      return { frequency: 'daily', interval: 1 }
    case 'weekly':
      return { frequency: 'weekly', interval: 1 }
    case 'weekdays':
      return { frequency: 'weekly', interval: 1, byDay: [1, 2, 3, 4, 5] } // Mon-Fri
    case 'custom':
    default:
      return { frequency: 'daily', interval: 1 }
  }
}

/**
 * Convert RecurrenceRule to HabitFrequency
 */
export function recurrenceRuleToFrequency(rule: RecurrenceRule): HabitFrequency {
  // Check for weekdays pattern
  if (
    rule.frequency === 'weekly' &&
    rule.byDay &&
    rule.byDay.length === 5 &&
    [1, 2, 3, 4, 5].every((d) => rule.byDay!.includes(d))
  ) {
    return 'weekdays'
  }

  // Check for simple weekly
  if (rule.frequency === 'weekly' && (!rule.byDay || rule.byDay.length <= 1)) {
    return 'weekly'
  }

  // Check for simple daily
  if (rule.frequency === 'daily' && rule.interval === 1) {
    return 'daily'
  }

  return 'custom'
}

// ============================================================================
// OCCURRENCE GENERATION
// ============================================================================

/**
 * Check if a specific date matches a recurrence rule
 */
export function isOccurrenceDate(
  rule: RecurrenceRule,
  ruleStartDate: string,
  checkDate: string
): boolean {
  const start = parseDate(ruleStartDate)
  const check = parseDate(checkDate)

  // Can't occur before the start date
  if (check < start) return false

  // Check end date if specified
  if (rule.endDate && check > parseDate(rule.endDate)) {
    return false
  }

  const dayOfWeek = check.getDay()
  const dayOfMonth = check.getDate()
  const month = check.getMonth() + 1

  switch (rule.frequency) {
    case 'daily': {
      // Calculate days difference
      const diffTime = check.getTime() - start.getTime()
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
      return diffDays % rule.interval === 0
    }

    case 'weekly': {
      // Check byDay if specified
      if (rule.byDay && rule.byDay.length > 0) {
        if (!rule.byDay.includes(dayOfWeek)) {
          return false
        }
      } else {
        // If no byDay, must be same day of week as start
        if (dayOfWeek !== start.getDay()) {
          return false
        }
      }

      // Check interval
      const diffTime = check.getTime() - start.getTime()
      const diffWeeks = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7))
      return diffWeeks % rule.interval === 0
    }

    case 'monthly': {
      // Check byMonthDay if specified
      if (rule.byMonthDay && rule.byMonthDay.length > 0) {
        if (!rule.byMonthDay.includes(dayOfMonth)) {
          return false
        }
      } else {
        // If no byMonthDay, must be same day of month as start
        if (dayOfMonth !== start.getDate()) {
          return false
        }
      }

      // Check interval
      const monthsDiff =
        (check.getFullYear() - start.getFullYear()) * 12 +
        (check.getMonth() - start.getMonth())
      return monthsDiff % rule.interval === 0 && monthsDiff >= 0
    }

    case 'yearly': {
      // Check byMonth if specified
      if (rule.byMonth && rule.byMonth.length > 0) {
        if (!rule.byMonth.includes(month)) {
          return false
        }
      } else {
        // If no byMonth, must be same month as start
        if (month !== start.getMonth() + 1) {
          return false
        }
      }

      // Check byMonthDay if specified
      if (rule.byMonthDay && rule.byMonthDay.length > 0) {
        if (!rule.byMonthDay.includes(dayOfMonth)) {
          return false
        }
      } else {
        // If no byMonthDay, must be same day of month as start
        if (dayOfMonth !== start.getDate()) {
          return false
        }
      }

      // Check interval
      const yearsDiff = check.getFullYear() - start.getFullYear()
      return yearsDiff % rule.interval === 0 && yearsDiff >= 0
    }

    default:
      return false
  }
}

/**
 * Generate occurrences within a date range
 */
export function generateOccurrences(
  rule: RecurrenceRule,
  ruleStartDate: string,
  options: OccurrenceOptions
): Occurrence[] {
  const occurrences: Occurrence[] = []
  const today = getToday()
  const todayDate = parseDate(today)

  const startDate = parseDate(options.startDate)
  const endDate = parseDate(options.endDate)
  const ruleStart = parseDate(ruleStartDate)
  const maxCount = options.maxOccurrences ?? 365

  // Determine actual start based on rule start and requested range
  let current = ruleStart > startDate ? ruleStart : startDate

  // If not including start, move to next potential occurrence
  if (!options.includeStart && isSameDay(current, startDate)) {
    current = addDays(current, 1)
  }

  let index = 1

  // Limit iterations to prevent infinite loops
  const maxIterations = 1000
  let iterations = 0

  while (current <= endDate && occurrences.length < maxCount && iterations < maxIterations) {
    iterations++

    const dateStr = formatDate(current)

    // Check if this date is an occurrence
    if (isOccurrenceDate(rule, ruleStartDate, dateStr)) {
      // Check count limit if specified
      if (rule.count && index > rule.count) {
        break
      }

      occurrences.push({
        date: dateStr,
        index,
        isPast: current < todayDate,
        isToday: isSameDay(current, todayDate),
      })
      index++
    }

    // Move to next potential date based on frequency
    switch (rule.frequency) {
      case 'daily':
        current = addDays(current, 1)
        break
      case 'weekly':
        // If byDay is specified, check each day of the week
        if (rule.byDay && rule.byDay.length > 1) {
          current = addDays(current, 1)
        } else {
          current = addDays(current, 1)
        }
        break
      case 'monthly':
        // If byMonthDay is specified with multiple days, check each day
        if (rule.byMonthDay && rule.byMonthDay.length > 1) {
          current = addDays(current, 1)
        } else {
          current = addDays(current, 1)
        }
        break
      case 'yearly':
        current = addDays(current, 1)
        break
      default:
        current = addDays(current, 1)
    }
  }

  return occurrences
}

/**
 * Get the next occurrence after a given date
 */
export function getNextOccurrence(
  rule: RecurrenceRule,
  ruleStartDate: string,
  afterDate: string = getToday()
): string | null {
  // Look up to 2 years ahead
  const after = parseDate(afterDate)
  const endDate = addYears(after, 2)

  const occurrences = generateOccurrences(rule, ruleStartDate, {
    startDate: formatDate(addDays(after, 1)),
    endDate: formatDate(endDate),
    maxOccurrences: 1,
    includeStart: true,
  })

  return occurrences.length > 0 ? occurrences[0].date : null
}

/**
 * Get the previous occurrence before a given date
 */
export function getPreviousOccurrence(
  rule: RecurrenceRule,
  ruleStartDate: string,
  beforeDate: string = getToday()
): string | null {
  const before = parseDate(beforeDate)
  const start = parseDate(ruleStartDate)

  // Look back up to 2 years
  const lookbackStart = addYears(before, -2)
  const effectiveStart = lookbackStart > start ? lookbackStart : start

  const occurrences = generateOccurrences(rule, ruleStartDate, {
    startDate: formatDate(effectiveStart),
    endDate: formatDate(addDays(before, -1)),
    maxOccurrences: 800, // Support 2 years of daily occurrences (~730 days)
    includeStart: true,
  })

  return occurrences.length > 0 ? occurrences[occurrences.length - 1].date : null
}

/**
 * Check if today is an occurrence date for a rule
 */
export function isTodayOccurrence(rule: RecurrenceRule, ruleStartDate: string): boolean {
  return isOccurrenceDate(rule, ruleStartDate, getToday())
}

/**
 * Count occurrences between two dates
 */
export function countOccurrences(
  rule: RecurrenceRule,
  ruleStartDate: string,
  startDate: string,
  endDate: string
): number {
  const occurrences = generateOccurrences(rule, ruleStartDate, {
    startDate,
    endDate,
    includeStart: true,
  })
  return occurrences.length
}

// ============================================================================
// WEEKDAY HELPERS
// ============================================================================

/**
 * Get the next weekday from a date (Mon-Fri)
 */
export function getNextWeekday(fromDate: string = getToday()): string {
  let current = parseDate(fromDate)

  // Move to next day first
  current = addDays(current, 1)

  // Skip weekends
  while (!isWeekday(current)) {
    current = addDays(current, 1)
  }

  return formatDate(current)
}

/**
 * Get all weekdays in a date range
 */
export function getWeekdaysInRange(startDate: string, endDate: string): string[] {
  const weekdays: string[] = []
  let current = parseDate(startDate)
  const end = parseDate(endDate)

  while (current <= end) {
    if (isWeekday(current)) {
      weekdays.push(formatDate(current))
    }
    current = addDays(current, 1)
  }

  return weekdays
}

// ============================================================================
// DISPLAY HELPERS
// ============================================================================

/**
 * Get human-readable description of a recurrence rule
 */
export function describeRecurrence(rule: RecurrenceRule): string {
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ]

  let description = ''
  const interval = rule.interval

  switch (rule.frequency) {
    case 'daily':
      description = interval === 1 ? 'Every day' : `Every ${interval} days`
      break

    case 'weekly':
      if (rule.byDay && rule.byDay.length > 0) {
        if (rule.byDay.length === 5 && [1, 2, 3, 4, 5].every((d) => rule.byDay!.includes(d))) {
          description = interval === 1 ? 'Every weekday' : `Every ${interval} weeks on weekdays`
        } else if (rule.byDay.length === 2 && [0, 6].every((d) => rule.byDay!.includes(d))) {
          description = interval === 1 ? 'Every weekend' : `Every ${interval} weeks on weekends`
        } else {
          const days = rule.byDay.map((d) => dayNames[d]).join(', ')
          description = interval === 1 ? `Every ${days}` : `Every ${interval} weeks on ${days}`
        }
      } else {
        description = interval === 1 ? 'Weekly' : `Every ${interval} weeks`
      }
      break

    case 'monthly':
      if (rule.byMonthDay && rule.byMonthDay.length > 0) {
        const days = rule.byMonthDay.join(', ')
        description =
          interval === 1
            ? `Monthly on the ${days}${getOrdinalSuffix(rule.byMonthDay[0])}`
            : `Every ${interval} months on the ${days}${getOrdinalSuffix(rule.byMonthDay[0])}`
      } else {
        description = interval === 1 ? 'Monthly' : `Every ${interval} months`
      }
      break

    case 'yearly':
      if (rule.byMonth && rule.byMonth.length > 0) {
        const months = rule.byMonth.map((m) => monthNames[m - 1]).join(', ')
        description = interval === 1 ? `Yearly in ${months}` : `Every ${interval} years in ${months}`
      } else {
        description = interval === 1 ? 'Yearly' : `Every ${interval} years`
      }
      break
  }

  if (rule.endDate) {
    description += ` until ${rule.endDate}`
  }

  if (rule.count) {
    description += `, ${rule.count} times`
  }

  return description
}

/**
 * Get ordinal suffix for a number (1st, 2nd, 3rd, etc.)
 */
function getOrdinalSuffix(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return s[(v - 20) % 10] || s[v] || s[0]
}
