/**
 * Mentions Types Tests
 * @module __tests__/unit/lib/mentions/types.test
 *
 * Tests for mention types, patterns, and entity configurations.
 */

import { describe, it, expect } from 'vitest'
import {
  MENTION_PATTERNS,
  ENTITY_TYPE_ICONS,
  ENTITY_TYPE_COLORS,
  type MentionableEntityType,
  type MentionableEntity,
  type MentionReference,
  type MentionSuggestion,
} from '@/lib/mentions/types'

// ============================================================================
// MENTION_PATTERNS
// ============================================================================

describe('MENTION_PATTERNS', () => {
  it('is defined', () => {
    expect(MENTION_PATTERNS).toBeDefined()
  })

  it('has all expected patterns', () => {
    expect(MENTION_PATTERNS).toHaveProperty('standard')
    expect(MENTION_PATTERNS).toHaveProperty('typed')
    expect(MENTION_PATTERNS).toHaveProperty('wikiStyle')
    expect(MENTION_PATTERNS).toHaveProperty('entityId')
  })

  describe('standard pattern', () => {
    it('is a regex', () => {
      expect(MENTION_PATTERNS.standard).toBeInstanceOf(RegExp)
    })

    it('matches simple mentions', () => {
      const text = '@john-smith mentioned @jane_doe'
      const matches = [...text.matchAll(MENTION_PATTERNS.standard)]
      expect(matches).toHaveLength(2)
      expect(matches[0][1]).toBe('john-smith')
      expect(matches[1][1]).toBe('jane_doe')
    })

    it('matches mention at start', () => {
      const text = '@admin said hello'
      const matches = [...text.matchAll(MENTION_PATTERNS.standard)]
      expect(matches).toHaveLength(1)
      expect(matches[0][1]).toBe('admin')
    })

    it('matches mention after space', () => {
      const text = 'Hello @user123'
      const matches = [...text.matchAll(MENTION_PATTERNS.standard)]
      expect(matches).toHaveLength(1)
      expect(matches[0][1]).toBe('user123')
    })

    it('matches mention after parenthesis', () => {
      const text = '(@mention)'
      const matches = [...text.matchAll(MENTION_PATTERNS.standard)]
      expect(matches).toHaveLength(1)
      expect(matches[0][1]).toBe('mention')
    })
  })

  describe('typed pattern', () => {
    it('is a regex', () => {
      expect(MENTION_PATTERNS.typed).toBeInstanceOf(RegExp)
    })

    it('matches typed mentions', () => {
      const text = '@place:coffee-shop and @person:john-doe'
      const matches = [...text.matchAll(MENTION_PATTERNS.typed)]
      expect(matches).toHaveLength(2)
      expect(matches[0][1]).toBe('place')
      expect(matches[0][2]).toBe('coffee-shop')
      expect(matches[1][1]).toBe('person')
      expect(matches[1][2]).toBe('john-doe')
    })

    it('matches various entity types', () => {
      const types = ['place', 'date', 'person', 'event', 'project', 'team', 'concept']
      types.forEach((type) => {
        const text = `@${type}:test-entity`
        const matches = [...text.matchAll(MENTION_PATTERNS.typed)]
        expect(matches.length).toBeGreaterThanOrEqual(1)
      })
    })
  })

  describe('wikiStyle pattern', () => {
    it('is a regex', () => {
      expect(MENTION_PATTERNS.wikiStyle).toBeInstanceOf(RegExp)
    })

    it('matches wiki-style mentions', () => {
      const text = '@[[John Smith]] and @[[Coffee Shop Downtown]]'
      const matches = [...text.matchAll(MENTION_PATTERNS.wikiStyle)]
      expect(matches).toHaveLength(2)
      expect(matches[0][1]).toBe('John Smith')
      expect(matches[1][1]).toBe('Coffee Shop Downtown')
    })

    it('matches mentions with special characters', () => {
      const text = "@[[Project: Alpha-1]]"
      const matches = [...text.matchAll(MENTION_PATTERNS.wikiStyle)]
      expect(matches).toHaveLength(1)
      expect(matches[0][1]).toBe('Project: Alpha-1')
    })
  })

  describe('entityId pattern', () => {
    it('is a regex', () => {
      expect(MENTION_PATTERNS.entityId).toBeInstanceOf(RegExp)
    })

    it('matches entity ID mentions', () => {
      const text = '@{entity-123} and @{user_456}'
      const matches = [...text.matchAll(MENTION_PATTERNS.entityId)]
      expect(matches).toHaveLength(2)
      expect(matches[0][1]).toBe('entity-123')
      expect(matches[1][1]).toBe('user_456')
    })
  })
})

// ============================================================================
// ENTITY_TYPE_ICONS
// ============================================================================

describe('ENTITY_TYPE_ICONS', () => {
  it('is defined', () => {
    expect(ENTITY_TYPE_ICONS).toBeDefined()
  })

  it('has all entity types', () => {
    const entityTypes: MentionableEntityType[] = [
      'place',
      'date',
      'person',
      'strand',
      'event',
      'project',
      'team',
      'concept',
      'tag',
      'unknown',
    ]
    entityTypes.forEach((type) => {
      expect(ENTITY_TYPE_ICONS).toHaveProperty(type)
    })
  })

  it('place has MapPin icon', () => {
    expect(ENTITY_TYPE_ICONS.place).toBe('MapPin')
  })

  it('date has Calendar icon', () => {
    expect(ENTITY_TYPE_ICONS.date).toBe('Calendar')
  })

  it('person has User icon', () => {
    expect(ENTITY_TYPE_ICONS.person).toBe('User')
  })

  it('strand has FileText icon', () => {
    expect(ENTITY_TYPE_ICONS.strand).toBe('FileText')
  })

  it('event has CalendarDays icon', () => {
    expect(ENTITY_TYPE_ICONS.event).toBe('CalendarDays')
  })

  it('project has Folder icon', () => {
    expect(ENTITY_TYPE_ICONS.project).toBe('Folder')
  })

  it('team has Users icon', () => {
    expect(ENTITY_TYPE_ICONS.team).toBe('Users')
  })

  it('concept has Lightbulb icon', () => {
    expect(ENTITY_TYPE_ICONS.concept).toBe('Lightbulb')
  })

  it('tag has Tag icon', () => {
    expect(ENTITY_TYPE_ICONS.tag).toBe('Tag')
  })

  it('unknown has HelpCircle icon', () => {
    expect(ENTITY_TYPE_ICONS.unknown).toBe('HelpCircle')
  })

  it('all values are non-empty strings', () => {
    Object.values(ENTITY_TYPE_ICONS).forEach((icon) => {
      expect(typeof icon).toBe('string')
      expect(icon.length).toBeGreaterThan(0)
    })
  })
})

// ============================================================================
// ENTITY_TYPE_COLORS
// ============================================================================

describe('ENTITY_TYPE_COLORS', () => {
  it('is defined', () => {
    expect(ENTITY_TYPE_COLORS).toBeDefined()
  })

  it('has all entity types', () => {
    const entityTypes: MentionableEntityType[] = [
      'place',
      'date',
      'person',
      'strand',
      'event',
      'project',
      'team',
      'concept',
      'tag',
      'unknown',
    ]
    entityTypes.forEach((type) => {
      expect(ENTITY_TYPE_COLORS).toHaveProperty(type)
    })
  })

  it('place has emerald color', () => {
    expect(ENTITY_TYPE_COLORS.place).toBe('#10B981')
  })

  it('date has indigo color', () => {
    expect(ENTITY_TYPE_COLORS.date).toBe('#6366F1')
  })

  it('person has blue color', () => {
    expect(ENTITY_TYPE_COLORS.person).toBe('#3B82F6')
  })

  it('strand has violet color', () => {
    expect(ENTITY_TYPE_COLORS.strand).toBe('#8B5CF6')
  })

  it('event has amber color', () => {
    expect(ENTITY_TYPE_COLORS.event).toBe('#F59E0B')
  })

  it('project has pink color', () => {
    expect(ENTITY_TYPE_COLORS.project).toBe('#EC4899')
  })

  it('team has teal color', () => {
    expect(ENTITY_TYPE_COLORS.team).toBe('#14B8A6')
  })

  it('concept has orange color', () => {
    expect(ENTITY_TYPE_COLORS.concept).toBe('#F97316')
  })

  it('tag has slate color', () => {
    expect(ENTITY_TYPE_COLORS.tag).toBe('#64748B')
  })

  it('unknown has gray color', () => {
    expect(ENTITY_TYPE_COLORS.unknown).toBe('#94A3B8')
  })

  it('all values are valid hex colors', () => {
    const hexColorPattern = /^#[0-9A-Fa-f]{6}$/
    Object.values(ENTITY_TYPE_COLORS).forEach((color) => {
      expect(color).toMatch(hexColorPattern)
    })
  })

  it('all colors are unique', () => {
    const colors = Object.values(ENTITY_TYPE_COLORS)
    const uniqueColors = new Set(colors)
    expect(uniqueColors.size).toBe(colors.length)
  })
})

// ============================================================================
// Type Definition Tests
// ============================================================================

describe('MentionableEntityType', () => {
  it('includes all expected types', () => {
    const types: MentionableEntityType[] = [
      'place',
      'date',
      'person',
      'strand',
      'event',
      'project',
      'team',
      'tag',
      'concept',
      'unknown',
    ]
    expect(types).toHaveLength(10)
  })
})

describe('MentionReference structure', () => {
  it('can represent a mention reference', () => {
    const ref: MentionReference = {
      id: 'ref-1',
      mentionSyntax: '@john-smith',
      entityId: 'person-123',
      entityType: 'person',
      sourceStrandPath: '/documents/notes.md',
      position: {
        start: 10,
        end: 21,
        line: 1,
        column: 10,
      },
      autoResolved: true,
      createdAt: new Date().toISOString(),
    }
    expect(ref.entityType).toBe('person')
    expect(ref.autoResolved).toBe(true)
  })

  it('supports optional fields', () => {
    const ref: MentionReference = {
      id: 'ref-2',
      mentionSyntax: '@unknown',
      entityId: null,
      entityType: 'unknown',
      sourceStrandPath: '/doc.md',
      position: { start: 0, end: 8, line: 1, column: 0 },
      autoResolved: false,
      createdAt: new Date().toISOString(),
      sourceBlockId: 'block-1',
      contextSnippet: 'The @unknown mentioned...',
      resolutionConfidence: 0.5,
    }
    expect(ref.entityId).toBeNull()
    expect(ref.resolutionConfidence).toBe(0.5)
  })
})

describe('MentionSuggestion structure', () => {
  it('can represent a suggestion', () => {
    const suggestion: MentionSuggestion = {
      entity: {
        id: 'person-1',
        type: 'person',
        label: 'John Smith',
        createdAt: new Date().toISOString(),
        properties: {
          fullName: 'John Smith',
          email: 'john@example.com',
        },
      },
      score: 0.95,
      highlightedLabel: '<b>John</b> Smith',
      matchType: 'prefix',
      source: 'database',
    }
    expect(suggestion.score).toBe(0.95)
    expect(suggestion.matchType).toBe('prefix')
  })

  it('supports all match types', () => {
    const matchTypes: MentionSuggestion['matchType'][] = [
      'exact',
      'prefix',
      'fuzzy',
      'semantic',
    ]
    expect(matchTypes).toHaveLength(4)
  })

  it('supports all source types', () => {
    const sources: MentionSuggestion['source'][] = [
      'recent',
      'document',
      'database',
      'external',
    ]
    expect(sources).toHaveLength(4)
  })
})

// ============================================================================
// Integration Tests
// ============================================================================

describe('mentions types integration', () => {
  it('icons and colors have same keys', () => {
    const iconKeys = Object.keys(ENTITY_TYPE_ICONS).sort()
    const colorKeys = Object.keys(ENTITY_TYPE_COLORS).sort()
    expect(iconKeys).toEqual(colorKeys)
  })

  it('can use entity type to look up icon and color', () => {
    const entityType: MentionableEntityType = 'place'
    const icon = ENTITY_TYPE_ICONS[entityType]
    const color = ENTITY_TYPE_COLORS[entityType]
    expect(icon).toBe('MapPin')
    expect(color).toBe('#10B981')
  })

  it('all patterns are global regexes', () => {
    Object.values(MENTION_PATTERNS).forEach((pattern) => {
      expect(pattern.flags).toContain('g')
    })
  })
})
