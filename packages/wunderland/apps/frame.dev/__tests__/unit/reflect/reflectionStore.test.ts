/**
 * Tests for Reflection Store
 * @module __tests__/unit/reflect/reflectionStore.test
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  formatDateKey,
  formatDateDisplay,
  formatDateTitle,
  parseDateKey,
  getTodayKey,
  getRelativeDateKey,
  getReflectionPath,
  getTodayReflectionPath,
  isReflectionPath,
  getDateFromPath,
  getReflectionTemplate,
} from '@/lib/reflect/reflectionStore'
import { REFLECTIONS_WEAVE } from '@/lib/reflect/types'

describe('Date utilities', () => {
  describe('formatDateKey', () => {
    it('formats date as YYYY-MM-DD', () => {
      const date = new Date(2024, 11, 27) // December 27, 2024
      expect(formatDateKey(date)).toBe('2024-12-27')
    })

    it('pads single digit months and days', () => {
      const date = new Date(2024, 0, 5) // January 5, 2024
      expect(formatDateKey(date)).toBe('2024-01-05')
    })
  })

  describe('formatDateDisplay', () => {
    it('formats date with weekday and full date', () => {
      const date = new Date(2024, 11, 27) // December 27, 2024
      const display = formatDateDisplay(date)
      expect(display).toContain('Friday')
      expect(display).toContain('December')
      expect(display).toContain('27')
      expect(display).toContain('2024')
    })
  })

  describe('formatDateTitle', () => {
    it('formats date without weekday', () => {
      const date = new Date(2024, 11, 27) // December 27, 2024
      const title = formatDateTitle(date)
      expect(title).not.toContain('Friday')
      expect(title).toContain('December')
      expect(title).toContain('27')
      expect(title).toContain('2024')
    })
  })

  describe('parseDateKey', () => {
    it('parses YYYY-MM-DD to Date object', () => {
      const date = parseDateKey('2024-12-27')
      expect(date.getFullYear()).toBe(2024)
      expect(date.getMonth()).toBe(11) // 0-indexed
      expect(date.getDate()).toBe(27)
    })

    it('handles start of month', () => {
      const date = parseDateKey('2024-01-01')
      expect(date.getFullYear()).toBe(2024)
      expect(date.getMonth()).toBe(0)
      expect(date.getDate()).toBe(1)
    })
  })

  describe('getTodayKey', () => {
    it('returns current date in YYYY-MM-DD format', () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2024-12-27T10:00:00'))

      expect(getTodayKey()).toBe('2024-12-27')

      vi.useRealTimers()
    })
  })

  describe('getRelativeDateKey', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2024-12-27T10:00:00'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('returns yesterday with offset -1', () => {
      expect(getRelativeDateKey(-1)).toBe('2024-12-26')
    })

    it('returns tomorrow with offset 1', () => {
      expect(getRelativeDateKey(1)).toBe('2024-12-28')
    })

    it('returns today with offset 0', () => {
      expect(getRelativeDateKey(0)).toBe('2024-12-27')
    })

    it('handles week offset', () => {
      expect(getRelativeDateKey(-7)).toBe('2024-12-20')
      expect(getRelativeDateKey(7)).toBe('2025-01-03')
    })
  })
})

describe('Path utilities', () => {
  describe('getReflectionPath', () => {
    it('generates correct path format', () => {
      const path = getReflectionPath('2024-12-27')
      expect(path).toBe(`weaves/${REFLECTIONS_WEAVE}/2024-12-27`)
    })
  })

  describe('getTodayReflectionPath', () => {
    it('returns path for today', () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2024-12-27T10:00:00'))

      expect(getTodayReflectionPath()).toBe(`weaves/${REFLECTIONS_WEAVE}/2024-12-27`)

      vi.useRealTimers()
    })
  })

  describe('isReflectionPath', () => {
    it('returns true for valid reflection paths', () => {
      expect(isReflectionPath(`weaves/${REFLECTIONS_WEAVE}/2024-12-27`)).toBe(true)
      expect(isReflectionPath(`weaves/${REFLECTIONS_WEAVE}/2024-01-01`)).toBe(true)
    })

    it('returns false for non-reflection paths', () => {
      expect(isReflectionPath('weaves/journal/daily/2024-12-27')).toBe(false)
      expect(isReflectionPath('weaves/projects/my-project')).toBe(false)
    })
  })

  describe('getDateFromPath', () => {
    it('extracts date key from valid path', () => {
      const dateKey = getDateFromPath(`weaves/${REFLECTIONS_WEAVE}/2024-12-27`)
      expect(dateKey).toBe('2024-12-27')
    })

    it('returns null for invalid paths', () => {
      expect(getDateFromPath('weaves/journal/daily/2024-12-27')).toBeNull()
      expect(getDateFromPath('invalid-path')).toBeNull()
    })
  })
})

describe('Template generation', () => {
  describe('getReflectionTemplate', () => {
    it('generates template with correct title', () => {
      const date = new Date(2024, 11, 27)
      const template = getReflectionTemplate(date)

      expect(template.title).toContain('December')
      expect(template.title).toContain('27')
      expect(template.title).toContain('2024')
    })

    it('generates template with standard reflection sections', () => {
      const date = new Date(2024, 11, 27)
      const template = getReflectionTemplate(date, { timeOfDay: 'morning' })

      // Template always includes these sections for the StructuredReflectionEditor
      expect(template.content).toContain('Morning Intentions')
      expect(template.content).toContain('Notes & Thoughts')
      expect(template.content).toContain('What Got Done')
      expect(template.content).toContain('Evening Reflection')
    })

    it('generates same sections regardless of timeOfDay option', () => {
      const date = new Date(2024, 11, 27)
      const morningTemplate = getReflectionTemplate(date, { timeOfDay: 'morning' })
      const eveningTemplate = getReflectionTemplate(date, { timeOfDay: 'evening' })

      // Both templates have the same section structure
      expect(morningTemplate.content).toContain('Morning Intentions')
      expect(eveningTemplate.content).toContain('Morning Intentions')
      expect(morningTemplate.content).toContain('Evening Reflection')
      expect(eveningTemplate.content).toContain('Evening Reflection')
    })

    it('accepts options but uses standard template structure', () => {
      const date = new Date(2024, 11, 27)
      // includeGratitude is accepted but template structure is fixed
      const template = getReflectionTemplate(date, { includeGratitude: true })

      // Template uses the standard structure
      expect(template.content).toContain('Morning Intentions')
      expect(template.content).toContain('Evening Reflection')
    })

    it('includes planner section when requested', () => {
      const date = new Date(2024, 11, 27)
      const template = getReflectionTemplate(date, { includePlanner: true })

      expect(template.content).toContain('Tasks')
      expect(template.content).toContain('Events')
      expect(template.content).toContain('#task')
    })

    it('sets correct frontmatter', () => {
      const date = new Date(2024, 11, 27)
      const template = getReflectionTemplate(date)

      expect(template.frontmatter.type).toBe('reflection')
      expect(template.frontmatter.date).toBe('2024-12-27')
      expect(template.frontmatter.tags).toContain('reflection')
    })

    it('includes mood in frontmatter when provided', () => {
      const date = new Date(2024, 11, 27)
      const template = getReflectionTemplate(date, { mood: 'focused' })

      expect(template.frontmatter.mood).toBe('focused')
    })
  })
})
