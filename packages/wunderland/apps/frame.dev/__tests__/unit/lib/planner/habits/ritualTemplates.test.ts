/**
 * Ritual Templates Tests
 * @module __tests__/unit/lib/planner/habits/ritualTemplates.test
 *
 * Tests for ritual habit templates and helper functions.
 */

import { describe, it, expect } from 'vitest'
import {
  getAllTemplates,
  getRitualTemplates,
  isRitualTemplate,
  getTemplateById,
  getTemplatesByCategory,
  getCategoryInfo,
  RITUAL_HABITS,
  type HabitTemplate,
} from '@/lib/planner/habits/templates'

// ============================================================================
// Ritual Templates Tests
// ============================================================================

describe('Ritual Templates', () => {
  describe('RITUAL_HABITS constant', () => {
    it('contains morning setup ritual', () => {
      const morning = RITUAL_HABITS.find(t => t.id === 'ritual-morning-setup')
      expect(morning).toBeDefined()
      expect(morning?.title).toBe('Morning Setup')
      expect(morning?.category).toBe('ritual')
      expect(morning?.surfacesNotes).toBe(true)
      expect(morning?.ritualType).toBe('morning')
    })

    it('contains evening reflection ritual', () => {
      const evening = RITUAL_HABITS.find(t => t.id === 'ritual-evening-reflection')
      expect(evening).toBeDefined()
      expect(evening?.title).toBe('Evening Reflection')
      expect(evening?.category).toBe('ritual')
      expect(evening?.surfacesNotes).toBe(true)
      expect(evening?.ritualType).toBe('evening')
    })

    it('contains weekly review ritual', () => {
      const weekly = RITUAL_HABITS.find(t => t.id === 'ritual-weekly-review')
      expect(weekly).toBeDefined()
      expect(weekly?.frequency).toBe('weekly')
      expect(weekly?.surfacesNotes).toBe(true)
    })

    it('all ritual templates have surfacesNotes flag', () => {
      for (const template of RITUAL_HABITS) {
        expect(template.surfacesNotes).toBe(true)
      }
    })

    it('all ritual templates have category ritual', () => {
      for (const template of RITUAL_HABITS) {
        expect(template.category).toBe('ritual')
      }
    })

    it('ritual templates have appropriate icons', () => {
      const morning = RITUAL_HABITS.find(t => t.id === 'ritual-morning-setup')
      const evening = RITUAL_HABITS.find(t => t.id === 'ritual-evening-reflection')
      
      expect(morning?.icon).toBe('Sunrise')
      expect(evening?.icon).toBe('Sunset')
    })
  })

  describe('getRitualTemplates', () => {
    it('returns only templates with surfacesNotes flag', () => {
      const rituals = getRitualTemplates()
      
      for (const template of rituals) {
        expect(template.surfacesNotes).toBe(true)
      }
    })

    it('includes all RITUAL_HABITS templates', () => {
      const rituals = getRitualTemplates()
      
      for (const ritual of RITUAL_HABITS) {
        expect(rituals.some(t => t.id === ritual.id)).toBe(true)
      }
    })

    it('returns non-empty array', () => {
      const rituals = getRitualTemplates()
      expect(rituals.length).toBeGreaterThan(0)
    })
  })

  describe('isRitualTemplate', () => {
    it('returns true for ritual templates', () => {
      const morning = getTemplateById('ritual-morning-setup')
      expect(morning).toBeDefined()
      expect(isRitualTemplate(morning!)).toBe(true)
    })

    it('returns false for non-ritual templates', () => {
      const exercise = getTemplateById('exercise-30min')
      if (exercise) {
        expect(isRitualTemplate(exercise)).toBe(false)
      }
    })

    it('returns false for templates without surfacesNotes', () => {
      const mockTemplate: HabitTemplate = {
        id: 'test',
        title: 'Test',
        category: 'health',
        description: 'Test template',
        frequency: 'daily',
        recurrenceRule: { frequency: 'daily', interval: 1 },
        targetCount: 1,
        icon: 'Test',
      }
      expect(isRitualTemplate(mockTemplate)).toBe(false)
    })

    it('returns true for templates with surfacesNotes true', () => {
      const mockTemplate: HabitTemplate = {
        id: 'test',
        title: 'Test',
        category: 'ritual',
        description: 'Test template',
        frequency: 'daily',
        recurrenceRule: { frequency: 'daily', interval: 1 },
        targetCount: 1,
        icon: 'Test',
        surfacesNotes: true,
      }
      expect(isRitualTemplate(mockTemplate)).toBe(true)
    })
  })

  describe('getTemplatesByCategory for rituals', () => {
    it('returns ritual templates for ritual category', () => {
      const ritualTemplates = getTemplatesByCategory('ritual')
      
      expect(ritualTemplates.length).toBeGreaterThan(0)
      for (const template of ritualTemplates) {
        expect(template.category).toBe('ritual')
      }
    })

    it('includes morning and evening rituals', () => {
      const ritualTemplates = getTemplatesByCategory('ritual')
      
      const ids = ritualTemplates.map(t => t.id)
      expect(ids).toContain('ritual-morning-setup')
      expect(ids).toContain('ritual-evening-reflection')
    })
  })

  describe('getCategoryInfo for rituals', () => {
    it('returns correct info for ritual category', () => {
      const info = getCategoryInfo('ritual')
      
      expect(info.label).toBe('Rituals')
      expect(info.icon).toBe('Sparkles')
      expect(info.color).toBe('#14b8a6') // teal
    })
  })

  describe('getAllTemplates includes rituals', () => {
    it('includes ritual templates in all templates', () => {
      const allTemplates = getAllTemplates()
      
      for (const ritual of RITUAL_HABITS) {
        expect(allTemplates.some(t => t.id === ritual.id)).toBe(true)
      }
    })
  })
})

// ============================================================================
// Ritual Template Structure Tests
// ============================================================================

describe('Ritual Template Structure', () => {
  it('morning ritual has correct preferred time', () => {
    const morning = getTemplateById('ritual-morning-setup')
    expect(morning?.preferredTime).toBe('08:00')
  })

  it('evening ritual has correct preferred time', () => {
    const evening = getTemplateById('ritual-evening-reflection')
    expect(evening?.preferredTime).toBe('20:00')
  })

  it('rituals have estimated duration', () => {
    const morning = getTemplateById('ritual-morning-setup')
    const evening = getTemplateById('ritual-evening-reflection')
    
    expect(morning?.estimatedDuration).toBeDefined()
    expect(evening?.estimatedDuration).toBeDefined()
    expect(morning?.estimatedDuration).toBeGreaterThan(0)
    expect(evening?.estimatedDuration).toBeGreaterThan(0)
  })

  it('rituals have recurrence rules', () => {
    const morning = getTemplateById('ritual-morning-setup')
    const evening = getTemplateById('ritual-evening-reflection')
    
    expect(morning?.recurrenceRule).toBeDefined()
    expect(morning?.recurrenceRule.frequency).toBe('daily')
    expect(evening?.recurrenceRule).toBeDefined()
    expect(evening?.recurrenceRule.frequency).toBe('daily')
  })

  it('weekly ritual has weekly recurrence', () => {
    const weekly = getTemplateById('ritual-weekly-review')
    
    expect(weekly?.recurrenceRule.frequency).toBe('weekly')
    expect(weekly?.recurrenceRule.byDay).toContain('SU')
  })

  it('rituals have tips', () => {
    const morning = getTemplateById('ritual-morning-setup')
    const evening = getTemplateById('ritual-evening-reflection')
    
    expect(morning?.tip).toBeDefined()
    expect(morning?.tip?.length).toBeGreaterThan(0)
    expect(evening?.tip).toBeDefined()
    expect(evening?.tip?.length).toBeGreaterThan(0)
  })

  it('featured rituals are marked', () => {
    const morning = getTemplateById('ritual-morning-setup')
    const evening = getTemplateById('ritual-evening-reflection')
    
    expect(morning?.featured).toBe(true)
    expect(evening?.featured).toBe(true)
  })
})

// ============================================================================
// Ritual Type Tests
// ============================================================================

describe('Ritual Types', () => {
  it('morning ritual has ritualType morning', () => {
    const morning = getTemplateById('ritual-morning-setup')
    expect(morning?.ritualType).toBe('morning')
  })

  it('evening ritual has ritualType evening', () => {
    const evening = getTemplateById('ritual-evening-reflection')
    expect(evening?.ritualType).toBe('evening')
  })

  it('weekly ritual may not have ritualType', () => {
    const weekly = getTemplateById('ritual-weekly-review')
    // Weekly rituals don't need morning/evening type
    expect(weekly?.ritualType).toBeUndefined()
  })

  it('only morning and evening have ritualType', () => {
    const rituals = getRitualTemplates()
    const withType = rituals.filter(t => t.ritualType !== undefined)
    
    for (const template of withType) {
      expect(['morning', 'evening']).toContain(template.ritualType)
    }
  })
})

