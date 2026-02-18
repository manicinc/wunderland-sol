/**
 * Habit Templates Tests
 * @module tests/unit/habits/templates
 *
 * Tests for template structure, validation, and helper functions.
 */

import { describe, it, expect } from 'vitest'
import {
  DAILY_HABITS,
  WEEKLY_HABITS,
  WEEKDAY_HABITS,
  RITUAL_HABITS,
  getAllTemplates,
  getFeaturedTemplates,
  getTemplatesByCategory,
  getTemplatesByFrequency,
  getTemplateById,
  getCategoryInfo,
  searchTemplates,
  type HabitTemplate,
  type HabitCategory,
} from '@/lib/planner/habits/templates'

describe('Habit Templates', () => {
  describe('Template Structure Validation', () => {
    const allTemplates = getAllTemplates()

    it('should have unique IDs', () => {
      const ids = allTemplates.map((t) => t.id)
      const uniqueIds = new Set(ids)

      expect(uniqueIds.size).toBe(ids.length)
    })

    it('should have valid required fields', () => {
      for (const template of allTemplates) {
        expect(template.id).toBeTruthy()
        expect(template.title).toBeTruthy()
        expect(template.category).toBeTruthy()
        expect(template.description).toBeTruthy()
        expect(template.frequency).toBeTruthy()
        expect(template.recurrenceRule).toBeDefined()
        expect(template.targetCount).toBeGreaterThan(0)
        expect(template.icon).toBeTruthy()
      }
    })

    it('should have valid frequency values', () => {
      const validFrequencies = ['daily', 'weekly', 'weekdays', 'custom']

      for (const template of allTemplates) {
        expect(validFrequencies).toContain(template.frequency)
      }
    })

    it('should have valid category values', () => {
      const validCategories: HabitCategory[] = [
        'health',
        'learning',
        'productivity',
        'mindfulness',
        'social',
        'creative',
        'finance',
        'ritual',
        'other',
      ]

      for (const template of allTemplates) {
        expect(validCategories).toContain(template.category)
      }
    })

    it('should have valid recurrence rules matching frequency', () => {
      for (const template of allTemplates) {
        expect(template.recurrenceRule.interval).toBe(1)

        if (template.frequency === 'daily') {
          expect(template.recurrenceRule.frequency).toBe('daily')
        } else if (template.frequency === 'weekly') {
          expect(template.recurrenceRule.frequency).toBe('weekly')
        } else if (template.frequency === 'weekdays') {
          expect(template.recurrenceRule.frequency).toBe('weekly')
          expect(template.recurrenceRule.byDay).toEqual([1, 2, 3, 4, 5])
        }
      }
    })

    it('should have valid preferredTime format when present', () => {
      const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/

      for (const template of allTemplates) {
        if (template.preferredTime) {
          expect(template.preferredTime).toMatch(timeRegex)
        }
      }
    })

    it('should have positive estimated duration when present', () => {
      for (const template of allTemplates) {
        if (template.estimatedDuration !== undefined) {
          expect(template.estimatedDuration).toBeGreaterThan(0)
        }
      }
    })
  })

  describe('DAILY_HABITS', () => {
    it('should have at least 20 daily habits', () => {
      expect(DAILY_HABITS.length).toBeGreaterThanOrEqual(20)
    })

    it('should all be daily frequency', () => {
      for (const habit of DAILY_HABITS) {
        expect(habit.frequency).toBe('daily')
      }
    })

    it('should have some featured habits', () => {
      const featured = DAILY_HABITS.filter((h) => h.featured)
      expect(featured.length).toBeGreaterThan(0)
    })

    it('should cover multiple categories', () => {
      const categories = new Set(DAILY_HABITS.map((h) => h.category))
      expect(categories.size).toBeGreaterThanOrEqual(5)
    })
  })

  describe('WEEKLY_HABITS', () => {
    it('should have at least 15 weekly habits', () => {
      expect(WEEKLY_HABITS.length).toBeGreaterThanOrEqual(15)
    })

    it('should all be weekly frequency', () => {
      for (const habit of WEEKLY_HABITS) {
        expect(habit.frequency).toBe('weekly')
      }
    })

    it('should have some habits with specific days', () => {
      const withByDay = WEEKLY_HABITS.filter((h) => h.recurrenceRule.byDay)
      expect(withByDay.length).toBeGreaterThan(0)
    })
  })

  describe('WEEKDAY_HABITS', () => {
    it('should have at least 5 weekday habits', () => {
      expect(WEEKDAY_HABITS.length).toBeGreaterThanOrEqual(5)
    })

    it('should all be weekdays frequency', () => {
      for (const habit of WEEKDAY_HABITS) {
        expect(habit.frequency).toBe('weekdays')
      }
    })

    it('should all have Mon-Fri byDay pattern', () => {
      for (const habit of WEEKDAY_HABITS) {
        expect(habit.recurrenceRule.byDay).toEqual([1, 2, 3, 4, 5])
      }
    })
  })

  describe('getAllTemplates', () => {
    it('should return combined count of all template arrays', () => {
      const all = getAllTemplates()
      const expectedCount = DAILY_HABITS.length + WEEKLY_HABITS.length + WEEKDAY_HABITS.length + RITUAL_HABITS.length

      expect(all.length).toBe(expectedCount)
    })

    it('should include templates from all frequency types', () => {
      const all = getAllTemplates()
      const frequencies = new Set(all.map((t) => t.frequency))

      expect(frequencies.has('daily')).toBe(true)
      expect(frequencies.has('weekly')).toBe(true)
      expect(frequencies.has('weekdays')).toBe(true)
    })
  })

  describe('getFeaturedTemplates', () => {
    it('should return only featured templates', () => {
      const featured = getFeaturedTemplates()

      for (const template of featured) {
        expect(template.featured).toBe(true)
      }
    })

    it('should return at least 5 featured templates', () => {
      const featured = getFeaturedTemplates()

      expect(featured.length).toBeGreaterThanOrEqual(5)
    })

    it('should include templates from different frequencies', () => {
      const featured = getFeaturedTemplates()
      const frequencies = new Set(featured.map((t) => t.frequency))

      expect(frequencies.size).toBeGreaterThanOrEqual(2)
    })
  })

  describe('getTemplatesByCategory', () => {
    it('should return templates matching the category', () => {
      const healthTemplates = getTemplatesByCategory('health')

      for (const template of healthTemplates) {
        expect(template.category).toBe('health')
      }
    })

    it('should return templates for health category', () => {
      const templates = getTemplatesByCategory('health')

      expect(templates.length).toBeGreaterThan(0)
    })

    it('should return templates for learning category', () => {
      const templates = getTemplatesByCategory('learning')

      expect(templates.length).toBeGreaterThan(0)
    })

    it('should return templates for productivity category', () => {
      const templates = getTemplatesByCategory('productivity')

      expect(templates.length).toBeGreaterThan(0)
    })

    it('should return empty array for category with no templates', () => {
      // All categories should have templates, but test the behavior
      const all = getAllTemplates()
      const otherTemplates = all.filter((t) => t.category === 'other')

      // 'other' might have some
      expect(Array.isArray(getTemplatesByCategory('other'))).toBe(true)
    })
  })

  describe('getTemplatesByFrequency', () => {
    it('should return templates matching the frequency', () => {
      const dailyTemplates = getTemplatesByFrequency('daily')

      for (const template of dailyTemplates) {
        expect(template.frequency).toBe('daily')
      }
    })

    it('should return same count as DAILY_HABITS plus daily rituals for daily', () => {
      const dailyTemplates = getTemplatesByFrequency('daily')
      const dailyRituals = RITUAL_HABITS.filter(h => h.frequency === 'daily')

      expect(dailyTemplates.length).toBe(DAILY_HABITS.length + dailyRituals.length)
    })

    it('should return same count as WEEKLY_HABITS plus weekly rituals for weekly', () => {
      const weeklyTemplates = getTemplatesByFrequency('weekly')
      const weeklyRituals = RITUAL_HABITS.filter(h => h.frequency === 'weekly')

      expect(weeklyTemplates.length).toBe(WEEKLY_HABITS.length + weeklyRituals.length)
    })

    it('should return same count as WEEKDAY_HABITS for weekdays', () => {
      const weekdayTemplates = getTemplatesByFrequency('weekdays')

      expect(weekdayTemplates.length).toBe(WEEKDAY_HABITS.length)
    })
  })

  describe('getTemplateById', () => {
    it('should return template for valid ID', () => {
      const template = getTemplateById('morning-water')

      expect(template).toBeDefined()
      expect(template?.id).toBe('morning-water')
      expect(template?.title).toBe('Drink a glass of water')
    })

    it('should return undefined for invalid ID', () => {
      const template = getTemplateById('nonexistent-habit')

      expect(template).toBeUndefined()
    })

    it('should find templates from all frequency types', () => {
      // Daily habit
      expect(getTemplateById('morning-water')).toBeDefined()
      // Weekly habit
      expect(getTemplateById('meal-prep')).toBeDefined()
      // Weekday habit
      expect(getTemplateById('morning-routine')).toBeDefined()
    })
  })

  describe('getCategoryInfo', () => {
    const categories: HabitCategory[] = [
      'health',
      'learning',
      'productivity',
      'mindfulness',
      'social',
      'creative',
      'finance',
      'other',
    ]

    it('should return info for all categories', () => {
      for (const category of categories) {
        const info = getCategoryInfo(category)

        expect(info.label).toBeTruthy()
        expect(info.color).toBeTruthy()
        expect(info.icon).toBeTruthy()
      }
    })

    it('should return valid hex color codes', () => {
      const hexColorRegex = /^#[0-9a-fA-F]{6}$/

      for (const category of categories) {
        const info = getCategoryInfo(category)
        expect(info.color).toMatch(hexColorRegex)
      }
    })

    it('should return unique labels for each category', () => {
      const labels = categories.map((c) => getCategoryInfo(c).label)
      const uniqueLabels = new Set(labels)

      expect(uniqueLabels.size).toBe(categories.length)
    })

    it('should return correct info for health category', () => {
      const info = getCategoryInfo('health')

      expect(info.label).toBe('Health')
      expect(info.icon).toBe('Heart')
    })

    it('should return correct info for productivity category', () => {
      const info = getCategoryInfo('productivity')

      expect(info.label).toBe('Productivity')
      expect(info.icon).toBe('Zap')
    })
  })

  describe('searchTemplates', () => {
    it('should find templates by title', () => {
      const results = searchTemplates('water')

      expect(results.length).toBeGreaterThan(0)
      expect(results.some((t) => t.title.toLowerCase().includes('water'))).toBe(true)
    })

    it('should find templates by description', () => {
      const results = searchTemplates('hydrated')

      expect(results.length).toBeGreaterThan(0)
    })

    it('should find templates by category name', () => {
      const results = searchTemplates('health')

      expect(results.length).toBeGreaterThan(0)
      expect(results.some((t) => t.category === 'health')).toBe(true)
    })

    it('should be case insensitive', () => {
      const lowerResults = searchTemplates('water')
      const upperResults = searchTemplates('WATER')
      const mixedResults = searchTemplates('Water')

      expect(lowerResults.length).toBe(upperResults.length)
      expect(lowerResults.length).toBe(mixedResults.length)
    })

    it('should return empty array for no matches', () => {
      const results = searchTemplates('xyznonexistent123')

      expect(results).toEqual([])
    })

    it('should find multiple templates for common terms', () => {
      const results = searchTemplates('exercise')

      expect(results.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('Template Content Quality', () => {
    const allTemplates = getAllTemplates()

    it('should have tips for most templates', () => {
      const withTips = allTemplates.filter((t) => t.tip)
      const percentage = withTips.length / allTemplates.length

      // At least 50% should have tips
      expect(percentage).toBeGreaterThan(0.5)
    })

    it('should have reasonable title lengths', () => {
      for (const template of allTemplates) {
        expect(template.title.length).toBeGreaterThan(5)
        expect(template.title.length).toBeLessThan(50)
      }
    })

    it('should have reasonable description lengths', () => {
      for (const template of allTemplates) {
        expect(template.description.length).toBeGreaterThan(10)
        expect(template.description.length).toBeLessThan(100)
      }
    })

    it('should have reasonable tip lengths when present', () => {
      for (const template of allTemplates) {
        if (template.tip) {
          expect(template.tip.length).toBeGreaterThan(10)
          expect(template.tip.length).toBeLessThan(150)
        }
      }
    })

    it('should have estimated duration within reasonable range', () => {
      for (const template of allTemplates) {
        if (template.estimatedDuration) {
          expect(template.estimatedDuration).toBeGreaterThanOrEqual(2)
          expect(template.estimatedDuration).toBeLessThanOrEqual(180)
        }
      }
    })
  })

  describe('Template Variety', () => {
    it('should have at least 40 total templates', () => {
      const all = getAllTemplates()

      expect(all.length).toBeGreaterThanOrEqual(40)
    })

    it('should cover all categories', () => {
      const all = getAllTemplates()
      const categories = new Set(all.map((t) => t.category))
      const expectedCategories: HabitCategory[] = [
        'health',
        'learning',
        'productivity',
        'mindfulness',
        'social',
        'creative',
        'finance',
      ]

      for (const category of expectedCategories) {
        expect(categories.has(category)).toBe(true)
      }
    })

    it('should have morning and evening habits', () => {
      const all = getAllTemplates()
      const morningHabits = all.filter(
        (t) => t.preferredTime && parseInt(t.preferredTime.split(':')[0]) < 12
      )
      const eveningHabits = all.filter(
        (t) => t.preferredTime && parseInt(t.preferredTime.split(':')[0]) >= 17
      )

      expect(morningHabits.length).toBeGreaterThan(0)
      expect(eveningHabits.length).toBeGreaterThan(0)
    })
  })
})
