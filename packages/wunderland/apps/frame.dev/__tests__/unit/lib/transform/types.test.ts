/**
 * Transform Types Tests
 * @module __tests__/unit/lib/transform/types.test
 *
 * Tests for transformation workflow presets and type constants.
 */

import { describe, it, expect } from 'vitest'
import { WORKFLOW_PRESETS } from '@/lib/transform/types'

// ============================================================================
// WORKFLOW_PRESETS
// ============================================================================

describe('WORKFLOW_PRESETS', () => {
  it('is defined as an array', () => {
    expect(Array.isArray(WORKFLOW_PRESETS)).toBe(true)
  })

  it('has at least 5 presets', () => {
    expect(WORKFLOW_PRESETS.length).toBeGreaterThanOrEqual(5)
  })

  describe('preset structure', () => {
    WORKFLOW_PRESETS.forEach((preset) => {
      describe(`preset: ${preset.id}`, () => {
        it('has unique id', () => {
          expect(preset.id).toBeDefined()
          expect(typeof preset.id).toBe('string')
          expect(preset.id.length).toBeGreaterThan(0)
        })

        it('has name', () => {
          expect(preset.name).toBeDefined()
          expect(typeof preset.name).toBe('string')
          expect(preset.name.length).toBeGreaterThan(0)
        })

        it('has description', () => {
          expect(preset.description).toBeDefined()
          expect(typeof preset.description).toBe('string')
          expect(preset.description.length).toBeGreaterThan(0)
        })

        it('has targetSupertag', () => {
          expect(preset.targetSupertag).toBeDefined()
          expect(typeof preset.targetSupertag).toBe('string')
        })

        it('has defaultMappings array', () => {
          expect(Array.isArray(preset.defaultMappings)).toBe(true)
          expect(preset.defaultMappings.length).toBeGreaterThan(0)
        })
      })
    })
  })

  describe('preset IDs', () => {
    it('all IDs are unique', () => {
      const ids = WORKFLOW_PRESETS.map((p) => p.id)
      const uniqueIds = new Set(ids)
      expect(uniqueIds.size).toBe(ids.length)
    })

    it('IDs follow kebab-case convention', () => {
      WORKFLOW_PRESETS.forEach((preset) => {
        expect(preset.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
      })
    })
  })

  describe('default mappings', () => {
    WORKFLOW_PRESETS.forEach((preset) => {
      describe(`${preset.id} mappings`, () => {
        it('all mappings have fieldName', () => {
          preset.defaultMappings.forEach((mapping, index) => {
            expect(mapping.fieldName, `mapping ${index}`).toBeDefined()
            expect(typeof mapping.fieldName).toBe('string')
          })
        })

        it('all mappings have fieldType', () => {
          preset.defaultMappings.forEach((mapping, index) => {
            expect(mapping.fieldType, `mapping ${index}`).toBeDefined()
            expect(typeof mapping.fieldType).toBe('string')
          })
        })

        it('all mappings have extractionSource', () => {
          preset.defaultMappings.forEach((mapping, index) => {
            expect(mapping.extractionSource, `mapping ${index}`).toBeDefined()
          })
        })

        it('fieldNames are unique within preset', () => {
          const fieldNames = preset.defaultMappings.map((m) => m.fieldName)
          const uniqueNames = new Set(fieldNames)
          expect(uniqueNames.size).toBe(fieldNames.length)
        })
      })
    })
  })

  describe('specific presets', () => {
    describe('strands-to-tasks', () => {
      const preset = WORKFLOW_PRESETS.find((p) => p.id === 'strands-to-tasks')

      it('exists', () => {
        expect(preset).toBeDefined()
      })

      it('targets task supertag', () => {
        expect(preset?.targetSupertag).toBe('task')
      })

      it('has title mapping', () => {
        const titleMapping = preset?.defaultMappings.find((m) => m.fieldName === 'title')
        expect(titleMapping).toBeDefined()
        expect(titleMapping?.extractionSource).toBe('title')
      })

      it('has status mapping with default', () => {
        const statusMapping = preset?.defaultMappings.find((m) => m.fieldName === 'status')
        expect(statusMapping).toBeDefined()
        expect(statusMapping?.defaultValue).toBe('todo')
      })

      it('has priority mapping with default', () => {
        const priorityMapping = preset?.defaultMappings.find((m) => m.fieldName === 'priority')
        expect(priorityMapping).toBeDefined()
        expect(priorityMapping?.defaultValue).toBe('medium')
      })

      it('has icon', () => {
        expect(preset?.icon).toBe('CheckSquare')
      })
    })

    describe('strands-to-meeting', () => {
      const preset = WORKFLOW_PRESETS.find((p) => p.id === 'strands-to-meeting')

      it('exists', () => {
        expect(preset).toBeDefined()
      })

      it('targets meeting supertag', () => {
        expect(preset?.targetSupertag).toBe('meeting')
      })

      it('has attendees mapping', () => {
        const attendeesMapping = preset?.defaultMappings.find((m) => m.fieldName === 'attendees')
        expect(attendeesMapping).toBeDefined()
        expect(attendeesMapping?.fieldType).toBe('tags')
      })

      it('has icon', () => {
        expect(preset?.icon).toBe('Calendar')
      })
    })

    describe('strands-to-project', () => {
      const preset = WORKFLOW_PRESETS.find((p) => p.id === 'strands-to-project')

      it('exists', () => {
        expect(preset).toBeDefined()
      })

      it('targets project supertag', () => {
        expect(preset?.targetSupertag).toBe('project')
      })

      it('has progress mapping with default 0', () => {
        const progressMapping = preset?.defaultMappings.find((m) => m.fieldName === 'progress')
        expect(progressMapping).toBeDefined()
        expect(progressMapping?.defaultValue).toBe(0)
      })

      it('has icon', () => {
        expect(preset?.icon).toBe('Folder')
      })
    })

    describe('strands-to-idea', () => {
      const preset = WORKFLOW_PRESETS.find((p) => p.id === 'strands-to-idea')

      it('exists', () => {
        expect(preset).toBeDefined()
      })

      it('targets idea supertag', () => {
        expect(preset?.targetSupertag).toBe('idea')
      })

      it('has potential rating mapping', () => {
        const potentialMapping = preset?.defaultMappings.find((m) => m.fieldName === 'potential')
        expect(potentialMapping).toBeDefined()
        expect(potentialMapping?.fieldType).toBe('rating')
      })

      it('has icon', () => {
        expect(preset?.icon).toBe('Lightbulb')
      })
    })

    describe('strands-to-decision', () => {
      const preset = WORKFLOW_PRESETS.find((p) => p.id === 'strands-to-decision')

      it('exists', () => {
        expect(preset).toBeDefined()
      })

      it('targets decision supertag', () => {
        expect(preset?.targetSupertag).toBe('decision')
      })

      it('has stakeholders mapping', () => {
        const stakeholdersMapping = preset?.defaultMappings.find((m) => m.fieldName === 'stakeholders')
        expect(stakeholdersMapping).toBeDefined()
        expect(stakeholdersMapping?.fieldType).toBe('tags')
      })

      it('has icon', () => {
        expect(preset?.icon).toBe('GitBranch')
      })
    })
  })

  describe('extraction sources', () => {
    const validSources = ['title', 'content', 'frontmatter', 'tags', 'filename', 'manual', 'ai', 'auto']

    it('all mappings use valid extraction sources', () => {
      WORKFLOW_PRESETS.forEach((preset) => {
        preset.defaultMappings.forEach((mapping) => {
          expect(validSources).toContain(mapping.extractionSource)
        })
      })
    })
  })

  describe('field types', () => {
    const validFieldTypes = [
      'text', 'textarea', 'select', 'date', 'datetime',
      'tags', 'rating', 'progress', 'number', 'checkbox'
    ]

    it('all mappings use valid field types', () => {
      WORKFLOW_PRESETS.forEach((preset) => {
        preset.defaultMappings.forEach((mapping) => {
          expect(validFieldTypes).toContain(mapping.fieldType)
        })
      })
    })
  })
})

// ============================================================================
// Integration Tests
// ============================================================================

describe('transform types integration', () => {
  it('presets have diverse target supertags', () => {
    const supertags = WORKFLOW_PRESETS.map((p) => p.targetSupertag)
    const uniqueSupertags = new Set(supertags)
    expect(uniqueSupertags.size).toBeGreaterThanOrEqual(4)
  })

  it('presets use various extraction sources', () => {
    const sources = new Set<string>()
    WORKFLOW_PRESETS.forEach((preset) => {
      preset.defaultMappings.forEach((mapping) => {
        sources.add(mapping.extractionSource)
      })
    })
    expect(sources.size).toBeGreaterThanOrEqual(4)
  })

  it('presets use various field types', () => {
    const types = new Set<string>()
    WORKFLOW_PRESETS.forEach((preset) => {
      preset.defaultMappings.forEach((mapping) => {
        types.add(mapping.fieldType)
      })
    })
    expect(types.size).toBeGreaterThanOrEqual(5)
  })
})
