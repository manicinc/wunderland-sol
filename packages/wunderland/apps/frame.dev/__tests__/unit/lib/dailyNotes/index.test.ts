/**
 * Daily Notes Tests
 * @module __tests__/unit/lib/dailyNotes/index.test
 *
 * Tests for daily notes date utilities and path functions.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  formatDateKey,
  formatDateDisplay,
  formatDateTitle,
  parseDateKey,
  getTodayKey,
  getYesterdayKey,
  getTomorrowKey,
  getRelativeDateKey,
  getDailyNotePath,
  getTodayNotePath,
  isDailyNotePath,
  getDateFromPath,
  getDailyNoteTemplate,
  getQuickCaptureTemplate,
  parseDailyNoteCommand,
} from '@/lib/dailyNotes'

// ============================================================================
// formatDateKey
// ============================================================================

describe('formatDateKey', () => {
  it('formats date as YYYY-MM-DD', () => {
    const date = new Date(2025, 11, 25) // December 25, 2025
    expect(formatDateKey(date)).toBe('2025-12-25')
  })

  it('pads single digit months', () => {
    const date = new Date(2025, 0, 15) // January 15, 2025
    expect(formatDateKey(date)).toBe('2025-01-15')
  })

  it('pads single digit days', () => {
    const date = new Date(2025, 5, 5) // June 5, 2025
    expect(formatDateKey(date)).toBe('2025-06-05')
  })

  it('handles year boundary', () => {
    const date = new Date(2025, 0, 1) // January 1, 2025
    expect(formatDateKey(date)).toBe('2025-01-01')
  })

  it('handles end of year', () => {
    const date = new Date(2025, 11, 31) // December 31, 2025
    expect(formatDateKey(date)).toBe('2025-12-31')
  })
})

// ============================================================================
// formatDateDisplay
// ============================================================================

describe('formatDateDisplay', () => {
  it('includes weekday', () => {
    const date = new Date(2025, 11, 25) // Thursday, December 25, 2025
    const display = formatDateDisplay(date)
    expect(display).toMatch(/Thursday/i)
  })

  it('includes full month name', () => {
    const date = new Date(2025, 11, 25)
    const display = formatDateDisplay(date)
    expect(display).toMatch(/December/)
  })

  it('includes day number', () => {
    const date = new Date(2025, 11, 25)
    const display = formatDateDisplay(date)
    expect(display).toMatch(/25/)
  })

  it('includes year', () => {
    const date = new Date(2025, 11, 25)
    const display = formatDateDisplay(date)
    expect(display).toMatch(/2025/)
  })
})

// ============================================================================
// formatDateTitle
// ============================================================================

describe('formatDateTitle', () => {
  it('includes month, day, and year', () => {
    const date = new Date(2025, 11, 25)
    const title = formatDateTitle(date)
    expect(title).toMatch(/December/)
    expect(title).toMatch(/25/)
    expect(title).toMatch(/2025/)
  })

  it('does not include weekday', () => {
    const date = new Date(2025, 11, 25) // Thursday
    const title = formatDateTitle(date)
    expect(title).not.toMatch(/Thursday/i)
  })
})

// ============================================================================
// parseDateKey
// ============================================================================

describe('parseDateKey', () => {
  it('parses YYYY-MM-DD to Date', () => {
    const date = parseDateKey('2025-12-25')
    expect(date.getFullYear()).toBe(2025)
    expect(date.getMonth()).toBe(11) // December is 11
    expect(date.getDate()).toBe(25)
  })

  it('parses first day of year', () => {
    const date = parseDateKey('2025-01-01')
    expect(date.getFullYear()).toBe(2025)
    expect(date.getMonth()).toBe(0)
    expect(date.getDate()).toBe(1)
  })

  it('parses last day of year', () => {
    const date = parseDateKey('2025-12-31')
    expect(date.getFullYear()).toBe(2025)
    expect(date.getMonth()).toBe(11)
    expect(date.getDate()).toBe(31)
  })

  it('roundtrips with formatDateKey', () => {
    const original = '2025-06-15'
    const date = parseDateKey(original)
    expect(formatDateKey(date)).toBe(original)
  })
})

// ============================================================================
// getTodayKey / getYesterdayKey / getTomorrowKey
// ============================================================================

describe('date key functions with mocked time', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2025, 5, 15, 12, 0, 0)) // June 15, 2025 12:00
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('getTodayKey', () => {
    it('returns current date', () => {
      expect(getTodayKey()).toBe('2025-06-15')
    })
  })

  describe('getYesterdayKey', () => {
    it('returns previous day', () => {
      expect(getYesterdayKey()).toBe('2025-06-14')
    })
  })

  describe('getTomorrowKey', () => {
    it('returns next day', () => {
      expect(getTomorrowKey()).toBe('2025-06-16')
    })
  })

  describe('getRelativeDateKey', () => {
    it('returns today for offset 0', () => {
      expect(getRelativeDateKey(0)).toBe('2025-06-15')
    })

    it('returns tomorrow for offset +1', () => {
      expect(getRelativeDateKey(1)).toBe('2025-06-16')
    })

    it('returns yesterday for offset -1', () => {
      expect(getRelativeDateKey(-1)).toBe('2025-06-14')
    })

    it('handles week offset', () => {
      expect(getRelativeDateKey(7)).toBe('2025-06-22')
      expect(getRelativeDateKey(-7)).toBe('2025-06-08')
    })

    it('handles month boundary', () => {
      expect(getRelativeDateKey(20)).toBe('2025-07-05') // Crosses into July
    })
  })
})

// ============================================================================
// getDailyNotePath
// ============================================================================

describe('getDailyNotePath', () => {
  it('returns correct path format', () => {
    expect(getDailyNotePath('2025-12-25')).toBe('weaves/journal/daily/2025-12-25')
  })

  it('includes journal weave', () => {
    expect(getDailyNotePath('2025-01-01')).toContain('weaves/journal/')
  })

  it('includes daily loom', () => {
    expect(getDailyNotePath('2025-01-01')).toContain('/daily/')
  })
})

// ============================================================================
// getTodayNotePath
// ============================================================================

describe('getTodayNotePath', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2025, 5, 15)) // June 15, 2025
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns path for today', () => {
    expect(getTodayNotePath()).toBe('weaves/journal/daily/2025-06-15')
  })
})

// ============================================================================
// isDailyNotePath
// ============================================================================

describe('isDailyNotePath', () => {
  it('returns true for valid daily note path', () => {
    expect(isDailyNotePath('weaves/journal/daily/2025-12-25')).toBe(true)
  })

  it('returns true for path with additional segments', () => {
    expect(isDailyNotePath('weaves/journal/daily/2025-12-25#section')).toBe(true)
  })

  it('returns false for different weave', () => {
    expect(isDailyNotePath('weaves/wiki/daily/2025-12-25')).toBe(false)
  })

  it('returns false for different loom', () => {
    expect(isDailyNotePath('weaves/journal/weekly/2025-12-25')).toBe(false)
  })

  it('returns false for completely different path', () => {
    expect(isDailyNotePath('weaves/wiki/looms/intro/strands/welcome')).toBe(false)
  })

  it('returns false for empty string', () => {
    expect(isDailyNotePath('')).toBe(false)
  })
})

// ============================================================================
// getDateFromPath
// ============================================================================

describe('getDateFromPath', () => {
  it('extracts date from valid path', () => {
    expect(getDateFromPath('weaves/journal/daily/2025-12-25')).toBe('2025-12-25')
  })

  it('extracts date with additional path segments', () => {
    expect(getDateFromPath('weaves/journal/daily/2025-06-15#heading')).toBe('2025-06-15')
  })

  it('returns null for invalid path', () => {
    expect(getDateFromPath('weaves/wiki/looms/intro')).toBeNull()
  })

  it('returns null for path without date', () => {
    expect(getDateFromPath('weaves/journal/daily/')).toBeNull()
  })

  it('returns null for empty path', () => {
    expect(getDateFromPath('')).toBeNull()
  })

  it('returns null for malformed date', () => {
    expect(getDateFromPath('weaves/journal/daily/2025-1-1')).toBeNull()
  })
})

// ============================================================================
// getDailyNoteTemplate
// ============================================================================

describe('getDailyNoteTemplate', () => {
  const testDate = new Date(2025, 11, 25) // December 25, 2025

  it('returns object with title', () => {
    const template = getDailyNoteTemplate(testDate)
    expect(template.title).toBeDefined()
    expect(template.title).toContain('December')
    expect(template.title).toContain('25')
    expect(template.title).toContain('2025')
  })

  it('returns object with content', () => {
    const template = getDailyNoteTemplate(testDate)
    expect(template.content).toBeDefined()
    expect(template.content.length).toBeGreaterThan(0)
  })

  it('content includes date heading', () => {
    const template = getDailyNoteTemplate(testDate)
    expect(template.content).toContain('# December 25, 2025')
  })

  it('content includes weekday in intentions section', () => {
    const template = getDailyNoteTemplate(testDate)
    expect(template.content).toContain('Thursday') // December 25, 2025 is Thursday
    expect(template.content).toContain('Intentions')
  })

  it('content includes tasks query', () => {
    const template = getDailyNoteTemplate(testDate)
    expect(template.content).toContain('```query')
    expect(template.content).toContain('#task')
    expect(template.content).toContain('due_date:2025-12-25')
  })

  it('content includes notes section', () => {
    const template = getDailyNoteTemplate(testDate)
    expect(template.content).toContain('## Notes')
  })

  it('content includes quick capture section', () => {
    const template = getDailyNoteTemplate(testDate)
    expect(template.content).toContain('## Quick Capture')
  })

  it('content includes evening reflection section', () => {
    const template = getDailyNoteTemplate(testDate)
    expect(template.content).toContain('## Evening Reflection')
  })

  it('returns frontmatter with required fields', () => {
    const template = getDailyNoteTemplate(testDate)
    expect(template.frontmatter.title).toBeDefined()
    expect(template.frontmatter.date).toBe('2025-12-25')
    expect(template.frontmatter.type).toBe('daily-note')
    expect(template.frontmatter.tags).toContain('daily')
    expect(template.frontmatter.tags).toContain('journal')
  })
})

// ============================================================================
// getQuickCaptureTemplate
// ============================================================================

describe('getQuickCaptureTemplate', () => {
  it('includes timestamp', () => {
    const date = new Date(2025, 5, 15, 14, 30) // 2:30 PM
    const template = getQuickCaptureTemplate(date)
    expect(template).toContain('02:30')
  })

  it('starts with newline and bullet', () => {
    const date = new Date()
    const template = getQuickCaptureTemplate(date)
    expect(template).toMatch(/^\n- /)
  })

  it('ends with space for typing', () => {
    const date = new Date()
    const template = getQuickCaptureTemplate(date)
    expect(template).toMatch(/ $/)
  })
})

// ============================================================================
// parseDailyNoteCommand
// ============================================================================

describe('parseDailyNoteCommand', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2025, 5, 15)) // June 15, 2025
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('today command', () => {
    it('parses /today', () => {
      expect(parseDailyNoteCommand('/today')).toBe('2025-06-15')
    })

    it('parses today (without slash)', () => {
      expect(parseDailyNoteCommand('today')).toBe('2025-06-15')
    })

    it('is case insensitive', () => {
      expect(parseDailyNoteCommand('/TODAY')).toBe('2025-06-15')
      expect(parseDailyNoteCommand('Today')).toBe('2025-06-15')
    })
  })

  describe('yesterday command', () => {
    it('parses /yesterday', () => {
      expect(parseDailyNoteCommand('/yesterday')).toBe('2025-06-14')
    })

    it('parses yesterday (without slash)', () => {
      expect(parseDailyNoteCommand('yesterday')).toBe('2025-06-14')
    })
  })

  describe('tomorrow command', () => {
    it('parses /tomorrow', () => {
      expect(parseDailyNoteCommand('/tomorrow')).toBe('2025-06-16')
    })

    it('parses tomorrow (without slash)', () => {
      expect(parseDailyNoteCommand('tomorrow')).toBe('2025-06-16')
    })
  })

  describe('date format', () => {
    it('parses /YYYY-MM-DD', () => {
      expect(parseDailyNoteCommand('/2025-12-25')).toBe('2025-12-25')
    })

    it('parses YYYY-MM-DD (without slash)', () => {
      expect(parseDailyNoteCommand('2025-12-25')).toBe('2025-12-25')
    })
  })

  describe('relative offset', () => {
    it('parses /+1 (tomorrow)', () => {
      expect(parseDailyNoteCommand('/+1')).toBe('2025-06-16')
    })

    it('parses /-1 (yesterday)', () => {
      expect(parseDailyNoteCommand('/-1')).toBe('2025-06-14')
    })

    it('parses /+7 (next week)', () => {
      expect(parseDailyNoteCommand('/+7')).toBe('2025-06-22')
    })

    it('parses /-7 (last week)', () => {
      expect(parseDailyNoteCommand('/-7')).toBe('2025-06-08')
    })
  })

  describe('invalid commands', () => {
    it('returns null for unknown command', () => {
      expect(parseDailyNoteCommand('/unknown')).toBeNull()
    })

    it('returns null for random text', () => {
      expect(parseDailyNoteCommand('random text')).toBeNull()
    })

    it('returns null for invalid date format', () => {
      expect(parseDailyNoteCommand('/25-12-2025')).toBeNull()
    })

    it('returns null for partial date', () => {
      expect(parseDailyNoteCommand('/2025-12')).toBeNull()
    })
  })
})
