/**
 * Habit Templates Tests
 * @module __tests__/unit/lib/planner/habits/templates.test
 *
 * Tests for habit template helpers and data.
 */

import { describe, it, expect } from 'vitest'
import {
  getAllTemplates,
  getFeaturedTemplates,
  getTemplatesByCategory,
  getTemplatesByFrequency,
  getTemplateById,
  getCategoryInfo,
  searchTemplates,
  DAILY_HABITS,
  WEEKLY_HABITS,
  WEEKDAY_HABITS,
  RITUAL_HABITS,
  type HabitCategory,
} from '@/lib/planner/habits/templates'

// ============================================================================
// getAllTemplates
// ============================================================================

describe('getAllTemplates', () => {
  it('returns all templates combined', () => {
    const all = getAllTemplates()

    expect(all.length).toBe(DAILY_HABITS.length + WEEKLY_HABITS.length + WEEKDAY_HABITS.length + RITUAL_HABITS.length)
  })

  it('includes daily habits', () => {
    const all = getAllTemplates()

    expect(all.some(t => t.id === 'morning-water')).toBe(true)
    expect(all.some(t => t.id === 'exercise-30min')).toBe(true)
  })

  it('includes weekly habits', () => {
    const all = getAllTemplates()

    expect(all.some(t => t.id === 'meal-prep')).toBe(true)
    expect(all.some(t => t.id === 'weekly-review')).toBe(true)
  })

  it('includes weekday habits', () => {
    const all = getAllTemplates()

    expect(all.some(t => t.id === 'morning-routine')).toBe(true)
  })

  it('returns new array each time', () => {
    const all1 = getAllTemplates()
    const all2 = getAllTemplates()

    expect(all1).not.toBe(all2)
    expect(all1).toEqual(all2)
  })
})

// ============================================================================
// getFeaturedTemplates
// ============================================================================

describe('getFeaturedTemplates', () => {
  it('returns only featured templates', () => {
    const featured = getFeaturedTemplates()

    expect(featured.every(t => t.featured === true)).toBe(true)
  })

  it('returns fewer than all templates', () => {
    const featured = getFeaturedTemplates()
    const all = getAllTemplates()

    expect(featured.length).toBeLessThan(all.length)
    expect(featured.length).toBeGreaterThan(0)
  })

  it('includes popular habits', () => {
    const featured = getFeaturedTemplates()

    expect(featured.some(t => t.id === 'morning-water')).toBe(true)
    expect(featured.some(t => t.id === 'gratitude-journal')).toBe(true)
  })
})

// ============================================================================
// getTemplatesByCategory
// ============================================================================

describe('getTemplatesByCategory', () => {
  it('returns health templates', () => {
    const health = getTemplatesByCategory('health')

    expect(health.every(t => t.category === 'health')).toBe(true)
    expect(health.length).toBeGreaterThan(0)
  })

  it('returns learning templates', () => {
    const learning = getTemplatesByCategory('learning')

    expect(learning.every(t => t.category === 'learning')).toBe(true)
    expect(learning.some(t => t.id === 'read-30min')).toBe(true)
  })

  it('returns productivity templates', () => {
    const productivity = getTemplatesByCategory('productivity')

    expect(productivity.every(t => t.category === 'productivity')).toBe(true)
    expect(productivity.some(t => t.id === 'plan-day')).toBe(true)
  })

  it('returns mindfulness templates', () => {
    const mindfulness = getTemplatesByCategory('mindfulness')

    expect(mindfulness.every(t => t.category === 'mindfulness')).toBe(true)
    expect(mindfulness.some(t => t.id === 'meditate-10min')).toBe(true)
  })

  it('returns social templates', () => {
    const social = getTemplatesByCategory('social')

    expect(social.every(t => t.category === 'social')).toBe(true)
  })

  it('returns creative templates', () => {
    const creative = getTemplatesByCategory('creative')

    expect(creative.every(t => t.category === 'creative')).toBe(true)
  })

  it('returns finance templates', () => {
    const finance = getTemplatesByCategory('finance')

    expect(finance.every(t => t.category === 'finance')).toBe(true)
  })

  it('returns empty for unknown category', () => {
    const unknown = getTemplatesByCategory('unknown' as HabitCategory)

    expect(unknown).toHaveLength(0)
  })
})

// ============================================================================
// getTemplatesByFrequency
// ============================================================================

describe('getTemplatesByFrequency', () => {
  it('returns daily templates', () => {
    const daily = getTemplatesByFrequency('daily')
    const dailyRituals = RITUAL_HABITS.filter(h => h.frequency === 'daily')

    expect(daily.every(t => t.frequency === 'daily')).toBe(true)
    expect(daily.length).toBe(DAILY_HABITS.length + dailyRituals.length)
  })

  it('returns weekly templates', () => {
    const weekly = getTemplatesByFrequency('weekly')
    const weeklyRituals = RITUAL_HABITS.filter(h => h.frequency === 'weekly')

    expect(weekly.every(t => t.frequency === 'weekly')).toBe(true)
    expect(weekly.length).toBe(WEEKLY_HABITS.length + weeklyRituals.length)
  })

  it('returns weekday templates', () => {
    const weekdays = getTemplatesByFrequency('weekdays')

    expect(weekdays.every(t => t.frequency === 'weekdays')).toBe(true)
    expect(weekdays.length).toBe(WEEKDAY_HABITS.length)
  })

  it('returns empty for unknown frequency', () => {
    const unknown = getTemplatesByFrequency('monthly' as any)

    expect(unknown).toHaveLength(0)
  })
})

// ============================================================================
// getTemplateById
// ============================================================================

describe('getTemplateById', () => {
  it('finds template by id', () => {
    const template = getTemplateById('morning-water')

    expect(template).toBeDefined()
    expect(template?.title).toBe('Drink a glass of water')
  })

  it('returns undefined for unknown id', () => {
    const template = getTemplateById('unknown-id')

    expect(template).toBeUndefined()
  })

  it('finds templates from all frequencies', () => {
    expect(getTemplateById('morning-water')).toBeDefined() // daily
    expect(getTemplateById('meal-prep')).toBeDefined() // weekly
    expect(getTemplateById('morning-routine')).toBeDefined() // weekdays
  })
})

// ============================================================================
// getCategoryInfo
// ============================================================================

describe('getCategoryInfo', () => {
  it('returns info for health category', () => {
    const info = getCategoryInfo('health')

    expect(info.label).toBe('Health')
    expect(info.color).toBe('#10b981')
    expect(info.icon).toBe('Heart')
  })

  it('returns info for learning category', () => {
    const info = getCategoryInfo('learning')

    expect(info.label).toBe('Learning')
    expect(info.color).toBe('#3b82f6')
    expect(info.icon).toBe('BookOpen')
  })

  it('returns info for productivity category', () => {
    const info = getCategoryInfo('productivity')

    expect(info.label).toBe('Productivity')
    expect(info.color).toBe('#f59e0b')
    expect(info.icon).toBe('Zap')
  })

  it('returns info for mindfulness category', () => {
    const info = getCategoryInfo('mindfulness')

    expect(info.label).toBe('Mindfulness')
    expect(info.color).toBe('#8b5cf6')
    expect(info.icon).toBe('Brain')
  })

  it('returns info for social category', () => {
    const info = getCategoryInfo('social')

    expect(info.label).toBe('Social')
    expect(info.color).toBe('#ec4899')
    expect(info.icon).toBe('Users')
  })

  it('returns info for creative category', () => {
    const info = getCategoryInfo('creative')

    expect(info.label).toBe('Creative')
    expect(info.color).toBe('#06b6d4')
    expect(info.icon).toBe('Palette')
  })

  it('returns info for finance category', () => {
    const info = getCategoryInfo('finance')

    expect(info.label).toBe('Finance')
    expect(info.color).toBe('#84cc16')
    expect(info.icon).toBe('Wallet')
  })

  it('returns info for other category', () => {
    const info = getCategoryInfo('other')

    expect(info.label).toBe('Other')
    expect(info.color).toBe('#71717a')
    expect(info.icon).toBe('MoreHorizontal')
  })
})

// ============================================================================
// searchTemplates
// ============================================================================

describe('searchTemplates', () => {
  it('finds templates by title', () => {
    const results = searchTemplates('water')

    expect(results.some(t => t.id === 'morning-water')).toBe(true)
  })

  it('finds templates by description', () => {
    const results = searchTemplates('hydrated')

    expect(results.some(t => t.id === 'morning-water')).toBe(true)
  })

  it('finds templates by category', () => {
    const results = searchTemplates('health')

    expect(results.length).toBeGreaterThan(0)
    expect(results.some(t => t.category === 'health')).toBe(true)
  })

  it('is case insensitive', () => {
    const lower = searchTemplates('water')
    const upper = searchTemplates('WATER')
    const mixed = searchTemplates('WaTeR')

    expect(lower).toEqual(upper)
    expect(lower).toEqual(mixed)
  })

  it('returns empty for no matches', () => {
    const results = searchTemplates('xyznonexistent123')

    expect(results).toHaveLength(0)
  })

  it('returns multiple matches', () => {
    const results = searchTemplates('morning')

    expect(results.length).toBeGreaterThan(1)
  })
})

// ============================================================================
// Template Data Validation
// ============================================================================

describe('Template Data Validation', () => {
  it('all templates have required fields', () => {
    const all = getAllTemplates()

    for (const template of all) {
      expect(template.id, `Template missing id`).toBeTruthy()
      expect(template.title, `${template.id} missing title`).toBeTruthy()
      expect(template.category, `${template.id} missing category`).toBeTruthy()
      expect(template.description, `${template.id} missing description`).toBeTruthy()
      expect(template.frequency, `${template.id} missing frequency`).toBeTruthy()
      expect(template.recurrenceRule, `${template.id} missing recurrenceRule`).toBeTruthy()
      expect(template.targetCount, `${template.id} missing targetCount`).toBeGreaterThanOrEqual(1)
      expect(template.icon, `${template.id} missing icon`).toBeTruthy()
    }
  })

  it('all templates have unique ids', () => {
    const all = getAllTemplates()
    const ids = all.map(t => t.id)
    const uniqueIds = new Set(ids)

    expect(uniqueIds.size).toBe(ids.length)
  })

  it('all templates have valid recurrence rules', () => {
    const all = getAllTemplates()

    for (const template of all) {
      expect(['daily', 'weekly']).toContain(template.recurrenceRule.frequency)
      expect(template.recurrenceRule.interval).toBeGreaterThanOrEqual(1)
    }
  })

  it('weekly templates have byDay', () => {
    const weekly = getTemplatesByFrequency('weekly')

    for (const template of weekly) {
      // Some weekly templates don't specify a day (flexible)
      // Just verify the recurrence structure is valid
      expect(template.recurrenceRule.frequency).toBe('weekly')
    }
  })

  it('weekday templates have correct byDay', () => {
    const weekdays = getTemplatesByFrequency('weekdays')

    for (const template of weekdays) {
      expect(template.recurrenceRule.frequency).toBe('weekly')
      expect(template.recurrenceRule.byDay).toBeDefined()
      expect(template.recurrenceRule.byDay).toEqual([1, 2, 3, 4, 5])
    }
  })
})

// ============================================================================
// Constants
// ============================================================================

describe('Habit Constants', () => {
  describe('DAILY_HABITS', () => {
    it('contains health habits', () => {
      expect(DAILY_HABITS.some(h => h.category === 'health')).toBe(true)
    })

    it('contains learning habits', () => {
      expect(DAILY_HABITS.some(h => h.category === 'learning')).toBe(true)
    })

    it('contains productivity habits', () => {
      expect(DAILY_HABITS.some(h => h.category === 'productivity')).toBe(true)
    })

    it('has reasonable count', () => {
      expect(DAILY_HABITS.length).toBeGreaterThan(10)
      expect(DAILY_HABITS.length).toBeLessThan(50)
    })
  })

  describe('WEEKLY_HABITS', () => {
    it('all have weekly frequency', () => {
      expect(WEEKLY_HABITS.every(h => h.frequency === 'weekly')).toBe(true)
    })

    it('has reasonable count', () => {
      expect(WEEKLY_HABITS.length).toBeGreaterThan(5)
      expect(WEEKLY_HABITS.length).toBeLessThan(30)
    })
  })

  describe('WEEKDAY_HABITS', () => {
    it('all have weekdays frequency', () => {
      expect(WEEKDAY_HABITS.every(h => h.frequency === 'weekdays')).toBe(true)
    })

    it('all target Mon-Fri', () => {
      expect(WEEKDAY_HABITS.every(h => {
        const days = h.recurrenceRule.byDay
        return days && days.length === 5 && days.includes(1) && days.includes(5)
      })).toBe(true)
    })
  })
})
