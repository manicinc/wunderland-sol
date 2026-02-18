/**
 * Supertags Types Tests
 * @module __tests__/unit/lib/supertags/types.test
 *
 * Tests for supertag type constants and built-in schemas.
 */

import { describe, it, expect } from 'vitest'
import {
  BUILT_IN_SCHEMAS,
  DEFAULT_SUPERTAG_CONFIG,
  type BuiltInSupertag,
  type SupertagFieldType,
} from '@/lib/supertags/types'

// ============================================================================
// BUILT_IN_SCHEMAS
// ============================================================================

describe('BUILT_IN_SCHEMAS', () => {
  const schemaKeys: BuiltInSupertag[] = [
    'person',
    'meeting',
    'task',
    'habit',
    'book',
    'article',
    'project',
    'idea',
    'question',
    'decision',
    'event',
  ]

  describe('schema count', () => {
    it('has 11 built-in schemas', () => {
      expect(Object.keys(BUILT_IN_SCHEMAS)).toHaveLength(11)
    })

    it('has all expected schema keys', () => {
      for (const key of schemaKeys) {
        expect(BUILT_IN_SCHEMAS[key]).toBeDefined()
      }
    })
  })

  describe('common schema properties', () => {
    it('all schemas have tagName', () => {
      for (const key of schemaKeys) {
        const schema = BUILT_IN_SCHEMAS[key]
        expect(schema.tagName).toBeDefined()
        expect(typeof schema.tagName).toBe('string')
        expect(schema.tagName.length).toBeGreaterThan(0)
      }
    })

    it('all schemas have displayName', () => {
      for (const key of schemaKeys) {
        const schema = BUILT_IN_SCHEMAS[key]
        expect(schema.displayName).toBeDefined()
        expect(typeof schema.displayName).toBe('string')
      }
    })

    it('all schemas have icon', () => {
      for (const key of schemaKeys) {
        const schema = BUILT_IN_SCHEMAS[key]
        expect(schema.icon).toBeDefined()
        expect(typeof schema.icon).toBe('string')
      }
    })

    it('all schemas have color', () => {
      for (const key of schemaKeys) {
        const schema = BUILT_IN_SCHEMAS[key]
        expect(schema.color).toBeDefined()
        expect(schema.color).toMatch(/^#[0-9a-f]{6}$/i)
      }
    })

    it('all schemas have description', () => {
      for (const key of schemaKeys) {
        const schema = BUILT_IN_SCHEMAS[key]
        expect(schema.description).toBeDefined()
        expect(typeof schema.description).toBe('string')
      }
    })

    it('all schemas have at least one field', () => {
      for (const key of schemaKeys) {
        const schema = BUILT_IN_SCHEMAS[key]
        expect(schema.fields).toBeDefined()
        expect(Array.isArray(schema.fields)).toBe(true)
        expect(schema.fields.length).toBeGreaterThan(0)
      }
    })

    it('all fields have required properties', () => {
      for (const key of schemaKeys) {
        const schema = BUILT_IN_SCHEMAS[key]
        for (const field of schema.fields) {
          expect(field.name).toBeDefined()
          expect(typeof field.name).toBe('string')
          expect(field.label).toBeDefined()
          expect(typeof field.label).toBe('string')
          expect(field.type).toBeDefined()
        }
      }
    })

    it('all fields have order defined', () => {
      for (const key of schemaKeys) {
        const schema = BUILT_IN_SCHEMAS[key]
        for (const field of schema.fields) {
          expect(typeof field.order).toBe('number')
        }
      }
    })
  })

  describe('person schema', () => {
    const person = BUILT_IN_SCHEMAS.person

    it('has correct tagName', () => {
      expect(person.tagName).toBe('person')
    })

    it('has correct displayName', () => {
      expect(person.displayName).toBe('Person')
    })

    it('uses User icon', () => {
      expect(person.icon).toBe('User')
    })

    it('has blue color', () => {
      expect(person.color).toBe('#3b82f6')
    })

    it('has 7 fields', () => {
      expect(person.fields).toHaveLength(7)
    })

    it('name field is required', () => {
      const nameField = person.fields.find((f) => f.name === 'name')
      expect(nameField?.required).toBe(true)
      expect(nameField?.type).toBe('text')
    })

    it('has email field with email type', () => {
      const emailField = person.fields.find((f) => f.name === 'email')
      expect(emailField?.type).toBe('email')
    })

    it('has phone field with phone type', () => {
      const phoneField = person.fields.find((f) => f.name === 'phone')
      expect(phoneField?.type).toBe('phone')
    })

    it('has linkedin field with url type', () => {
      const linkedinField = person.fields.find((f) => f.name === 'linkedin')
      expect(linkedinField?.type).toBe('url')
    })
  })

  describe('meeting schema', () => {
    const meeting = BUILT_IN_SCHEMAS.meeting

    it('has correct tagName', () => {
      expect(meeting.tagName).toBe('meeting')
    })

    it('uses Calendar icon', () => {
      expect(meeting.icon).toBe('Calendar')
    })

    it('has violet color', () => {
      expect(meeting.color).toBe('#8b5cf6')
    })

    it('has 6 fields', () => {
      expect(meeting.fields).toHaveLength(6)
    })

    it('title and date are required', () => {
      const titleField = meeting.fields.find((f) => f.name === 'title')
      const dateField = meeting.fields.find((f) => f.name === 'date')
      expect(titleField?.required).toBe(true)
      expect(dateField?.required).toBe(true)
    })

    it('date field uses datetime type', () => {
      const dateField = meeting.fields.find((f) => f.name === 'date')
      expect(dateField?.type).toBe('datetime')
    })

    it('attendees field uses tags type', () => {
      const attendeesField = meeting.fields.find((f) => f.name === 'attendees')
      expect(attendeesField?.type).toBe('tags')
    })
  })

  describe('task schema', () => {
    const task = BUILT_IN_SCHEMAS.task

    it('has correct tagName', () => {
      expect(task.tagName).toBe('task')
    })

    it('uses CheckSquare icon', () => {
      expect(task.icon).toBe('CheckSquare')
    })

    it('has emerald color', () => {
      expect(task.color).toBe('#10b981')
    })

    it('has 7 fields', () => {
      expect(task.fields).toHaveLength(7)
    })

    it('status field has 4 options', () => {
      const statusField = task.fields.find((f) => f.name === 'status')
      expect(statusField?.type).toBe('select')
      expect(statusField?.options).toHaveLength(4)
      expect(statusField?.defaultValue).toBe('todo')
    })

    it('status options include todo, in_progress, blocked, done', () => {
      const statusField = task.fields.find((f) => f.name === 'status')
      const values = statusField?.options?.map((o) => o.value)
      expect(values).toContain('todo')
      expect(values).toContain('in_progress')
      expect(values).toContain('blocked')
      expect(values).toContain('done')
    })

    it('priority field has 3 options', () => {
      const priorityField = task.fields.find((f) => f.name === 'priority')
      expect(priorityField?.type).toBe('select')
      expect(priorityField?.options).toHaveLength(3)
      expect(priorityField?.defaultValue).toBe('medium')
    })

    it('progress field uses progress type', () => {
      const progressField = task.fields.find((f) => f.name === 'progress')
      expect(progressField?.type).toBe('progress')
      expect(progressField?.defaultValue).toBe(0)
    })
  })

  describe('habit schema', () => {
    const habit = BUILT_IN_SCHEMAS.habit

    it('has correct tagName', () => {
      expect(habit.tagName).toBe('habit')
    })

    it('uses Flame icon', () => {
      expect(habit.icon).toBe('Flame')
    })

    it('has orange color', () => {
      expect(habit.color).toBe('#f97316')
    })

    it('frequency field has 4 options', () => {
      const frequencyField = habit.fields.find((f) => f.name === 'frequency')
      expect(frequencyField?.options).toHaveLength(4)
      expect(frequencyField?.defaultValue).toBe('daily')
    })

    it('category field has 8 options', () => {
      const categoryField = habit.fields.find((f) => f.name === 'category')
      expect(categoryField?.options).toHaveLength(8)
    })

    it('has streak tracking fields (hidden)', () => {
      const currentStreak = habit.fields.find((f) => f.name === 'current_streak')
      const longestStreak = habit.fields.find((f) => f.name === 'longest_streak')
      expect(currentStreak?.hidden).toBe(true)
      expect(longestStreak?.hidden).toBe(true)
      expect(currentStreak?.defaultValue).toBe(0)
      expect(longestStreak?.defaultValue).toBe(0)
    })

    it('target_count has validation', () => {
      const targetField = habit.fields.find((f) => f.name === 'target_count')
      expect(targetField?.validation?.min).toBe(1)
      expect(targetField?.validation?.max).toBe(100)
    })
  })

  describe('book schema', () => {
    const book = BUILT_IN_SCHEMAS.book

    it('has correct tagName', () => {
      expect(book.tagName).toBe('book')
    })

    it('uses Book icon', () => {
      expect(book.icon).toBe('Book')
    })

    it('has amber color', () => {
      expect(book.color).toBe('#f59e0b')
    })

    it('has rating field', () => {
      const ratingField = book.fields.find((f) => f.name === 'rating')
      expect(ratingField?.type).toBe('rating')
    })

    it('status field has 4 reading states', () => {
      const statusField = book.fields.find((f) => f.name === 'status')
      const values = statusField?.options?.map((o) => o.value)
      expect(values).toContain('to_read')
      expect(values).toContain('reading')
      expect(values).toContain('finished')
      expect(values).toContain('abandoned')
    })
  })

  describe('project schema', () => {
    const project = BUILT_IN_SCHEMAS.project

    it('has correct tagName', () => {
      expect(project.tagName).toBe('project')
    })

    it('uses Folder icon', () => {
      expect(project.icon).toBe('Folder')
    })

    it('has pink color', () => {
      expect(project.color).toBe('#ec4899')
    })

    it('status field has 5 options', () => {
      const statusField = project.fields.find((f) => f.name === 'status')
      expect(statusField?.options).toHaveLength(5)
    })

    it('has date fields for start and end', () => {
      const startDate = project.fields.find((f) => f.name === 'start_date')
      const endDate = project.fields.find((f) => f.name === 'end_date')
      expect(startDate?.type).toBe('date')
      expect(endDate?.type).toBe('date')
    })
  })

  describe('idea schema', () => {
    const idea = BUILT_IN_SCHEMAS.idea

    it('has correct tagName', () => {
      expect(idea.tagName).toBe('idea')
    })

    it('uses Lightbulb icon', () => {
      expect(idea.icon).toBe('Lightbulb')
    })

    it('has yellow color', () => {
      expect(idea.color).toBe('#fbbf24')
    })

    it('has potential rating field', () => {
      const potentialField = idea.fields.find((f) => f.name === 'potential')
      expect(potentialField?.type).toBe('rating')
    })

    it('status options include raw, exploring, validated, rejected', () => {
      const statusField = idea.fields.find((f) => f.name === 'status')
      const values = statusField?.options?.map((o) => o.value)
      expect(values).toContain('raw')
      expect(values).toContain('exploring')
      expect(values).toContain('validated')
      expect(values).toContain('rejected')
    })
  })

  describe('question schema', () => {
    const question = BUILT_IN_SCHEMAS.question

    it('has correct tagName', () => {
      expect(question.tagName).toBe('question')
    })

    it('uses HelpCircle icon', () => {
      expect(question.icon).toBe('HelpCircle')
    })

    it('has purple color', () => {
      expect(question.color).toBe('#a855f7')
    })

    it('has answered checkbox field', () => {
      const answeredField = question.fields.find((f) => f.name === 'answered')
      expect(answeredField?.type).toBe('checkbox')
      expect(answeredField?.defaultValue).toBe(false)
    })
  })

  describe('decision schema', () => {
    const decision = BUILT_IN_SCHEMAS.decision

    it('has correct tagName', () => {
      expect(decision.tagName).toBe('decision')
    })

    it('uses GitBranch icon', () => {
      expect(decision.icon).toBe('GitBranch')
    })

    it('has teal color', () => {
      expect(decision.color).toBe('#14b8a6')
    })

    it('has stakeholders tags field', () => {
      const stakeholdersField = decision.fields.find((f) => f.name === 'stakeholders')
      expect(stakeholdersField?.type).toBe('tags')
    })

    it('status options include proposed, approved, implemented, deprecated', () => {
      const statusField = decision.fields.find((f) => f.name === 'status')
      const values = statusField?.options?.map((o) => o.value)
      expect(values).toContain('proposed')
      expect(values).toContain('approved')
      expect(values).toContain('implemented')
      expect(values).toContain('deprecated')
    })
  })

  describe('event schema', () => {
    const event = BUILT_IN_SCHEMAS.event

    it('has correct tagName', () => {
      expect(event.tagName).toBe('event')
    })

    it('uses CalendarDays icon', () => {
      expect(event.icon).toBe('CalendarDays')
    })

    it('has rose color', () => {
      expect(event.color).toBe('#f43f5e')
    })

    it('name and date are required', () => {
      const nameField = event.fields.find((f) => f.name === 'name')
      const dateField = event.fields.find((f) => f.name === 'date')
      expect(nameField?.required).toBe(true)
      expect(dateField?.required).toBe(true)
    })

    it('has location field', () => {
      const locationField = event.fields.find((f) => f.name === 'location')
      expect(locationField?.type).toBe('text')
    })
  })

  describe('article schema', () => {
    const article = BUILT_IN_SCHEMAS.article

    it('has correct tagName', () => {
      expect(article.tagName).toBe('article')
    })

    it('uses FileText icon', () => {
      expect(article.icon).toBe('FileText')
    })

    it('has cyan color', () => {
      expect(article.color).toBe('#06b6d4')
    })

    it('has url field with url type', () => {
      const urlField = article.fields.find((f) => f.name === 'url')
      expect(urlField?.type).toBe('url')
    })
  })

  describe('schema colors are unique', () => {
    it('all schemas have unique colors', () => {
      const colors = schemaKeys.map((key) => BUILT_IN_SCHEMAS[key].color)
      const uniqueColors = new Set(colors)
      expect(uniqueColors.size).toBe(colors.length)
    })
  })

  describe('schema icons are unique', () => {
    it('all schemas have unique icons', () => {
      const icons = schemaKeys.map((key) => BUILT_IN_SCHEMAS[key].icon)
      const uniqueIcons = new Set(icons)
      expect(uniqueIcons.size).toBe(icons.length)
    })
  })
})

// ============================================================================
// DEFAULT_SUPERTAG_CONFIG
// ============================================================================

describe('DEFAULT_SUPERTAG_CONFIG', () => {
  it('has enabled set to true', () => {
    expect(DEFAULT_SUPERTAG_CONFIG.enabled).toBe(true)
  })

  it('has showInlineFields set to true', () => {
    expect(DEFAULT_SUPERTAG_CONFIG.showInlineFields).toBe(true)
  })

  it('has autoSuggest set to true', () => {
    expect(DEFAULT_SUPERTAG_CONFIG.autoSuggest).toBe(true)
  })

  it('has allowCustomSchemas set to true', () => {
    expect(DEFAULT_SUPERTAG_CONFIG.allowCustomSchemas).toBe(true)
  })

  it('has defaultBadgeMode set to compact', () => {
    expect(DEFAULT_SUPERTAG_CONFIG.defaultBadgeMode).toBe('compact')
  })

  it('all boolean fields are booleans', () => {
    expect(typeof DEFAULT_SUPERTAG_CONFIG.enabled).toBe('boolean')
    expect(typeof DEFAULT_SUPERTAG_CONFIG.showInlineFields).toBe('boolean')
    expect(typeof DEFAULT_SUPERTAG_CONFIG.autoSuggest).toBe('boolean')
    expect(typeof DEFAULT_SUPERTAG_CONFIG.allowCustomSchemas).toBe('boolean')
  })
})

// ============================================================================
// Field Type Coverage
// ============================================================================

describe('field type coverage', () => {
  const allFieldTypes: SupertagFieldType[] = [
    'text',
    'textarea',
    'number',
    'date',
    'datetime',
    'checkbox',
    'select',
    'multiselect',
    'url',
    'email',
    'phone',
    'rating',
    'progress',
    'reference',
    'tags',
    'image',
    'color',
    'formula',
  ]

  it('built-in schemas use most common field types', () => {
    const usedTypes = new Set<string>()

    for (const key of Object.keys(BUILT_IN_SCHEMAS) as BuiltInSupertag[]) {
      for (const field of BUILT_IN_SCHEMAS[key].fields) {
        usedTypes.add(field.type)
      }
    }

    // Should use at least 10 of the 18 field types
    expect(usedTypes.size).toBeGreaterThanOrEqual(10)

    // Should definitely include these common ones
    expect(usedTypes.has('text')).toBe(true)
    expect(usedTypes.has('textarea')).toBe(true)
    expect(usedTypes.has('select')).toBe(true)
    expect(usedTypes.has('date')).toBe(true)
    expect(usedTypes.has('datetime')).toBe(true)
    expect(usedTypes.has('tags')).toBe(true)
    expect(usedTypes.has('rating')).toBe(true)
    expect(usedTypes.has('progress')).toBe(true)
  })
})
