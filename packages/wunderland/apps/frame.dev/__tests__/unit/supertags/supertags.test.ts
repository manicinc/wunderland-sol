/**
 * Supertags System Tests
 * @module tests/unit/supertags/supertags
 *
 * Tests for the supertags type system and built-in schemas.
 */

import { describe, it, expect } from 'vitest'
import {
  BUILT_IN_SCHEMAS,
  type SupertagSchema,
  type SupertagFieldDefinition,
  type SupertagFieldType,
  DEFAULT_SUPERTAG_CONFIG,
} from '@/lib/supertags/types'

describe('Supertags System', () => {
  describe('Built-in Schemas', () => {
    it('should have all required built-in schemas', () => {
      const expectedSchemas = [
        'person',
        'meeting',
        'task',
        'book',
        'article',
        'project',
        'idea',
        'question',
        'decision',
        'event',
      ]

      for (const schemaName of expectedSchemas) {
        expect(BUILT_IN_SCHEMAS).toHaveProperty(schemaName)
      }
    })

    describe('person schema', () => {
      it('should have correct structure', () => {
        const schema = BUILT_IN_SCHEMAS.person
        expect(schema.tagName).toBe('person')
        expect(schema.displayName).toBe('Person')
        expect(schema.icon).toBe('User')
        expect(schema.color).toBeDefined()
      })

      it('should have required fields', () => {
        const schema = BUILT_IN_SCHEMAS.person
        const fieldNames = schema.fields.map(f => f.name)

        expect(fieldNames).toContain('name')
        expect(fieldNames).toContain('role')
        expect(fieldNames).toContain('company')
        expect(fieldNames).toContain('email')
      })

      it('should have name as required field', () => {
        const schema = BUILT_IN_SCHEMAS.person
        const nameField = schema.fields.find(f => f.name === 'name')

        expect(nameField?.required).toBe(true)
      })

      it('should have correct field types', () => {
        const schema = BUILT_IN_SCHEMAS.person
        const emailField = schema.fields.find(f => f.name === 'email')
        const phoneField = schema.fields.find(f => f.name === 'phone')
        const linkedinField = schema.fields.find(f => f.name === 'linkedin')

        expect(emailField?.type).toBe('email')
        expect(phoneField?.type).toBe('phone')
        expect(linkedinField?.type).toBe('url')
      })
    })

    describe('task schema', () => {
      it('should have correct structure', () => {
        const schema = BUILT_IN_SCHEMAS.task
        expect(schema.tagName).toBe('task')
        expect(schema.displayName).toBe('Task')
        expect(schema.icon).toBe('CheckSquare')
      })

      it('should have status field with options', () => {
        const schema = BUILT_IN_SCHEMAS.task
        const statusField = schema.fields.find(f => f.name === 'status')

        expect(statusField?.type).toBe('select')
        expect(statusField?.options).toBeDefined()
        expect(statusField?.options?.length).toBeGreaterThan(0)
      })

      it('should have default status value', () => {
        const schema = BUILT_IN_SCHEMAS.task
        const statusField = schema.fields.find(f => f.name === 'status')

        expect(statusField?.defaultValue).toBe('todo')
      })

      it('should have priority field with options', () => {
        const schema = BUILT_IN_SCHEMAS.task
        const priorityField = schema.fields.find(f => f.name === 'priority')

        expect(priorityField?.type).toBe('select')
        expect(priorityField?.options?.map(o => o.value)).toContain('high')
        expect(priorityField?.options?.map(o => o.value)).toContain('medium')
        expect(priorityField?.options?.map(o => o.value)).toContain('low')
      })

      it('should have progress field', () => {
        const schema = BUILT_IN_SCHEMAS.task
        const progressField = schema.fields.find(f => f.name === 'progress')

        expect(progressField?.type).toBe('progress')
        expect(progressField?.defaultValue).toBe(0)
      })
    })

    describe('meeting schema', () => {
      it('should have datetime field for date', () => {
        const schema = BUILT_IN_SCHEMAS.meeting
        const dateField = schema.fields.find(f => f.name === 'date')

        expect(dateField?.type).toBe('datetime')
        expect(dateField?.required).toBe(true)
      })

      it('should have attendees field as tags', () => {
        const schema = BUILT_IN_SCHEMAS.meeting
        const attendeesField = schema.fields.find(f => f.name === 'attendees')

        expect(attendeesField?.type).toBe('tags')
      })
    })

    describe('book schema', () => {
      it('should have rating field', () => {
        const schema = BUILT_IN_SCHEMAS.book
        const ratingField = schema.fields.find(f => f.name === 'rating')

        expect(ratingField?.type).toBe('rating')
      })

      it('should have year as number field', () => {
        const schema = BUILT_IN_SCHEMAS.book
        const yearField = schema.fields.find(f => f.name === 'year')

        expect(yearField?.type).toBe('number')
      })

      it('should have status with reading options', () => {
        const schema = BUILT_IN_SCHEMAS.book
        const statusField = schema.fields.find(f => f.name === 'status')

        expect(statusField?.options?.map(o => o.value)).toContain('reading')
        expect(statusField?.options?.map(o => o.value)).toContain('finished')
        expect(statusField?.options?.map(o => o.value)).toContain('to_read')
      })
    })

    describe('project schema', () => {
      it('should have progress field', () => {
        const schema = BUILT_IN_SCHEMAS.project
        const progressField = schema.fields.find(f => f.name === 'progress')

        expect(progressField?.type).toBe('progress')
      })

      it('should have start and end date fields', () => {
        const schema = BUILT_IN_SCHEMAS.project
        const fieldNames = schema.fields.map(f => f.name)

        expect(fieldNames).toContain('start_date')
        expect(fieldNames).toContain('end_date')
      })
    })

    describe('question schema', () => {
      it('should have answered checkbox', () => {
        const schema = BUILT_IN_SCHEMAS.question
        const answeredField = schema.fields.find(f => f.name === 'answered')

        expect(answeredField?.type).toBe('checkbox')
        expect(answeredField?.defaultValue).toBe(false)
      })

      it('should have answer textarea', () => {
        const schema = BUILT_IN_SCHEMAS.question
        const answerField = schema.fields.find(f => f.name === 'answer')

        expect(answerField?.type).toBe('textarea')
      })
    })

    describe('all schemas', () => {
      it('should have unique tag names', () => {
        const tagNames = Object.values(BUILT_IN_SCHEMAS).map(s => s.tagName)
        const uniqueTagNames = [...new Set(tagNames)]

        expect(tagNames.length).toBe(uniqueTagNames.length)
      })

      it('should have valid colors', () => {
        for (const schema of Object.values(BUILT_IN_SCHEMAS)) {
          expect(schema.color).toMatch(/^#[0-9a-fA-F]{6}$/)
        }
      })

      it('should have ordered fields', () => {
        for (const schema of Object.values(BUILT_IN_SCHEMAS)) {
          const orders = schema.fields.map(f => f.order).filter(o => o !== undefined)
          const sortedOrders = [...orders].sort((a, b) => (a ?? 0) - (b ?? 0))

          expect(orders).toEqual(sortedOrders)
        }
      })

      it('should have unique field names within each schema', () => {
        for (const [key, schema] of Object.entries(BUILT_IN_SCHEMAS)) {
          const fieldNames = schema.fields.map(f => f.name)
          const uniqueFieldNames = [...new Set(fieldNames)]

          expect(fieldNames.length).toBe(uniqueFieldNames.length)
        }
      })
    })
  })

  describe('Field Types', () => {
    const validFieldTypes: SupertagFieldType[] = [
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

    it('should cover all expected field types', () => {
      // Collect all field types from built-in schemas
      const usedTypes = new Set<string>()
      for (const schema of Object.values(BUILT_IN_SCHEMAS)) {
        for (const field of schema.fields) {
          usedTypes.add(field.type)
        }
      }

      // At least these common types should be used
      expect(usedTypes).toContain('text')
      expect(usedTypes).toContain('textarea')
      expect(usedTypes).toContain('date')
      expect(usedTypes).toContain('datetime')
      expect(usedTypes).toContain('select')
      expect(usedTypes).toContain('checkbox')
      expect(usedTypes).toContain('rating')
      expect(usedTypes).toContain('progress')
      expect(usedTypes).toContain('tags')
    })
  })

  describe('Default Configuration', () => {
    it('should have enabled by default', () => {
      expect(DEFAULT_SUPERTAG_CONFIG.enabled).toBe(true)
    })

    it('should show inline fields by default', () => {
      expect(DEFAULT_SUPERTAG_CONFIG.showInlineFields).toBe(true)
    })

    it('should enable auto-suggest by default', () => {
      expect(DEFAULT_SUPERTAG_CONFIG.autoSuggest).toBe(true)
    })

    it('should allow custom schemas by default', () => {
      expect(DEFAULT_SUPERTAG_CONFIG.allowCustomSchemas).toBe(true)
    })

    it('should use compact badge mode by default', () => {
      expect(DEFAULT_SUPERTAG_CONFIG.defaultBadgeMode).toBe('compact')
    })
  })

  describe('Field Definition Structure', () => {
    it('should have all required properties', () => {
      const schema = BUILT_IN_SCHEMAS.task
      const field = schema.fields[0]

      expect(field).toHaveProperty('name')
      expect(field).toHaveProperty('label')
      expect(field).toHaveProperty('type')
    })

    it('should have valid select options structure', () => {
      const schema = BUILT_IN_SCHEMAS.task
      const statusField = schema.fields.find(f => f.name === 'status')

      expect(statusField?.options).toBeDefined()
      for (const option of statusField?.options ?? []) {
        expect(option).toHaveProperty('value')
        expect(option).toHaveProperty('label')
      }
    })

    it('should have colors for status options', () => {
      const schema = BUILT_IN_SCHEMAS.task
      const statusField = schema.fields.find(f => f.name === 'status')

      for (const option of statusField?.options ?? []) {
        expect(option.color).toBeDefined()
        expect(option.color).toMatch(/^#[0-9a-fA-F]{6}$/)
      }
    })
  })
})
