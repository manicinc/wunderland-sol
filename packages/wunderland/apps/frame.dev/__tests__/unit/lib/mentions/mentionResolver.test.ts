/**
 * Mention Resolver Tests
 * @module __tests__/unit/lib/mentions/mentionResolver.test
 *
 * Tests for @mention parsing, type inference, and entity creation.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  parseAllMentions,
  inferEntityType,
} from '@/lib/mentions/mentionResolver'
import {
  MENTION_PATTERNS,
  ENTITY_TYPE_ICONS,
  ENTITY_TYPE_COLORS,
} from '@/lib/mentions/types'

// Mock database
vi.mock('@/lib/codexDatabase', () => ({
  getDatabase: vi.fn(() => Promise.resolve(null)),
}))

// Mock NLP
vi.mock('@/lib/nlp', () => ({
  extractEntities: vi.fn(() => ({
    people: [],
    locations: [],
    dates: [],
    technologies: [],
    organizations: [],
    topics: [],
  })),
  extractEntitiesAsync: vi.fn(() => Promise.resolve({
    people: [],
    locations: [],
    dates: [],
    technologies: [],
    organizations: [],
    topics: [],
  })),
}))

// ============================================================================
// MENTION_PATTERNS
// ============================================================================

describe('MENTION_PATTERNS', () => {
  describe('standard pattern', () => {
    it('matches basic @mentions', () => {
      const content = 'Hello @john-doe how are you?'
      const matches = [...content.matchAll(MENTION_PATTERNS.standard)]

      expect(matches.length).toBe(1)
      expect(matches[0][1]).toBe('john-doe')
    })

    it('matches @mentions at start of line', () => {
      const content = '@alice is here'
      const matches = [...content.matchAll(MENTION_PATTERNS.standard)]

      expect(matches.length).toBe(1)
      expect(matches[0][1]).toBe('alice')
    })

    it('matches multiple @mentions', () => {
      const content = '@alice and @bob went to see @charlie'
      const matches = [...content.matchAll(MENTION_PATTERNS.standard)]

      expect(matches.length).toBe(3)
      expect(matches.map(m => m[1])).toEqual(['alice', 'bob', 'charlie'])
    })

    it('matches mentions with underscores', () => {
      const content = 'Contact @john_smith_jr for details'
      const matches = [...content.matchAll(MENTION_PATTERNS.standard)]

      expect(matches.length).toBe(1)
      expect(matches[0][1]).toBe('john_smith_jr')
    })

    it('matches mentions with numbers', () => {
      const content = 'User @user123 signed up'
      const matches = [...content.matchAll(MENTION_PATTERNS.standard)]

      expect(matches.length).toBe(1)
      expect(matches[0][1]).toBe('user123')
    })

    it('does not match mentions starting with number', () => {
      const content = 'Value @123abc is invalid'
      const matches = [...content.matchAll(MENTION_PATTERNS.standard)]

      expect(matches.length).toBe(0)
    })

    it('matches mentions in parentheses', () => {
      const content = '(by @author)'
      const matches = [...content.matchAll(MENTION_PATTERNS.standard)]

      expect(matches.length).toBe(1)
      expect(matches[0][1]).toBe('author')
    })

    it('matches mentions in brackets', () => {
      const content = '[see @reference]'
      const matches = [...content.matchAll(MENTION_PATTERNS.standard)]

      expect(matches.length).toBe(1)
      expect(matches[0][1]).toBe('reference')
    })
  })

  describe('typed pattern', () => {
    it('matches typed @place: mentions', () => {
      const content = 'Meeting at @place:coffee-shop'
      const matches = [...content.matchAll(MENTION_PATTERNS.typed)]

      expect(matches.length).toBe(1)
      expect(matches[0][1]).toBe('place')
      expect(matches[0][2]).toBe('coffee-shop')
    })

    it('matches typed @date: mentions', () => {
      const content = 'Due @date:tomorrow'
      const matches = [...content.matchAll(MENTION_PATTERNS.typed)]

      expect(matches.length).toBe(1)
      expect(matches[0][1]).toBe('date')
      expect(matches[0][2]).toBe('tomorrow')
    })

    it('matches typed @person: mentions', () => {
      const content = 'Assign to @person:john-doe'
      const matches = [...content.matchAll(MENTION_PATTERNS.typed)]

      expect(matches.length).toBe(1)
      expect(matches[0][1]).toBe('person')
      expect(matches[0][2]).toBe('john-doe')
    })

    it('matches typed @event: mentions', () => {
      const content = 'Related to @event:team-meeting'
      const matches = [...content.matchAll(MENTION_PATTERNS.typed)]

      expect(matches.length).toBe(1)
      expect(matches[0][1]).toBe('event')
      expect(matches[0][2]).toBe('team-meeting')
    })

    it('matches typed @project: mentions', () => {
      const content = 'Part of @project:website-redesign'
      const matches = [...content.matchAll(MENTION_PATTERNS.typed)]

      expect(matches.length).toBe(1)
      expect(matches[0][1]).toBe('project')
      expect(matches[0][2]).toBe('website-redesign')
    })

    it('matches typed @team: mentions', () => {
      const content = 'Owned by @team:engineering'
      const matches = [...content.matchAll(MENTION_PATTERNS.typed)]

      expect(matches.length).toBe(1)
      expect(matches[0][1]).toBe('team')
      expect(matches[0][2]).toBe('engineering')
    })

    it('matches typed @concept: mentions', () => {
      const content = 'About @concept:machine-learning'
      const matches = [...content.matchAll(MENTION_PATTERNS.typed)]

      expect(matches.length).toBe(1)
      expect(matches[0][1]).toBe('concept')
      expect(matches[0][2]).toBe('machine-learning')
    })
  })

  describe('wikiStyle pattern', () => {
    it('matches @[[Entity Name]] syntax', () => {
      const content = 'See @[[John Smith]] for details'
      const matches = [...content.matchAll(MENTION_PATTERNS.wikiStyle)]

      expect(matches.length).toBe(1)
      expect(matches[0][1]).toBe('John Smith')
    })

    it('matches wiki style with special characters', () => {
      const content = 'At @[[Coffee & Co.]]'
      const matches = [...content.matchAll(MENTION_PATTERNS.wikiStyle)]

      expect(matches.length).toBe(1)
      expect(matches[0][1]).toBe('Coffee & Co.')
    })

    it('matches multiple wiki style mentions', () => {
      const content = '@[[Alice]] and @[[Bob]] met at @[[Central Park]]'
      const matches = [...content.matchAll(MENTION_PATTERNS.wikiStyle)]

      expect(matches.length).toBe(3)
      expect(matches.map(m => m[1])).toEqual(['Alice', 'Bob', 'Central Park'])
    })
  })

  describe('entityId pattern', () => {
    it('matches @{entity-id} syntax', () => {
      const content = 'Reference @{abc123} here'
      const matches = [...content.matchAll(MENTION_PATTERNS.entityId)]

      expect(matches.length).toBe(1)
      expect(matches[0][1]).toBe('abc123')
    })

    it('matches entity IDs with dashes and underscores', () => {
      const content = 'Entity @{entity-id_123}'
      const matches = [...content.matchAll(MENTION_PATTERNS.entityId)]

      expect(matches.length).toBe(1)
      expect(matches[0][1]).toBe('entity-id_123')
    })
  })
})

// ============================================================================
// ENTITY_TYPE_ICONS
// ============================================================================

describe('ENTITY_TYPE_ICONS', () => {
  it('has icons for all entity types', () => {
    expect(ENTITY_TYPE_ICONS.place).toBe('MapPin')
    expect(ENTITY_TYPE_ICONS.date).toBe('Calendar')
    expect(ENTITY_TYPE_ICONS.person).toBe('User')
    expect(ENTITY_TYPE_ICONS.strand).toBe('FileText')
    expect(ENTITY_TYPE_ICONS.event).toBe('CalendarDays')
    expect(ENTITY_TYPE_ICONS.project).toBe('Folder')
    expect(ENTITY_TYPE_ICONS.team).toBe('Users')
    expect(ENTITY_TYPE_ICONS.concept).toBe('Lightbulb')
    expect(ENTITY_TYPE_ICONS.tag).toBe('Tag')
    expect(ENTITY_TYPE_ICONS.unknown).toBe('HelpCircle')
  })
})

// ============================================================================
// ENTITY_TYPE_COLORS
// ============================================================================

describe('ENTITY_TYPE_COLORS', () => {
  it('has colors for all entity types', () => {
    expect(ENTITY_TYPE_COLORS.place).toBe('#10B981')
    expect(ENTITY_TYPE_COLORS.date).toBe('#6366F1')
    expect(ENTITY_TYPE_COLORS.person).toBe('#3B82F6')
    expect(ENTITY_TYPE_COLORS.strand).toBe('#8B5CF6')
    expect(ENTITY_TYPE_COLORS.event).toBe('#F59E0B')
    expect(ENTITY_TYPE_COLORS.project).toBe('#EC4899')
    expect(ENTITY_TYPE_COLORS.team).toBe('#14B8A6')
    expect(ENTITY_TYPE_COLORS.concept).toBe('#F97316')
    expect(ENTITY_TYPE_COLORS.tag).toBe('#64748B')
    expect(ENTITY_TYPE_COLORS.unknown).toBe('#94A3B8')
  })

  it('all colors are valid hex colors', () => {
    for (const color of Object.values(ENTITY_TYPE_COLORS)) {
      expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/)
    }
  })
})

// ============================================================================
// parseAllMentions
// ============================================================================

describe('parseAllMentions', () => {
  it('parses standard mentions', () => {
    const content = 'Hello @john how are you?'
    const mentions = parseAllMentions(content)

    expect(mentions.length).toBe(1)
    expect(mentions[0].mentionText).toBe('john')
    expect(mentions[0].rawMatch).toBe('@john')
  })

  it('returns correct positions', () => {
    const content = 'Hello @john'
    const mentions = parseAllMentions(content)

    expect(mentions[0].position.start).toBe(6)
    expect(mentions[0].position.end).toBe(11)
    expect(mentions[0].position.line).toBe(1)
    expect(mentions[0].position.column).toBe(7)
  })

  it('handles multiline content', () => {
    const content = 'Line 1\n@alice on line 2\nLine 3 with @bob'
    const mentions = parseAllMentions(content)

    expect(mentions.length).toBe(2)
    expect(mentions[0].mentionText).toBe('alice')
    expect(mentions[0].position.line).toBe(2)
    expect(mentions[1].mentionText).toBe('bob')
    expect(mentions[1].position.line).toBe(3)
  })

  it('parses typed mentions with type hint', () => {
    const content = 'Meeting at @place:office'
    const mentions = parseAllMentions(content)

    // Both standard (@place) and typed (@place:office) patterns match
    // The typed one has the type hint
    const typedMention = mentions.find(m => m.typeHint === 'place')
    expect(typedMention).toBeDefined()
    expect(typedMention?.mentionText).toBe('office')
  })

  it('parses wiki-style mentions', () => {
    const content = 'See @[[John Smith]] for info'
    const mentions = parseAllMentions(content)

    expect(mentions.length).toBe(1)
    expect(mentions[0].mentionText).toBe('John Smith')
  })

  it('parses entity ID mentions', () => {
    const content = 'Reference @{entity-123}'
    const mentions = parseAllMentions(content)

    expect(mentions.length).toBe(1)
    expect(mentions[0].mentionText).toBe('entity-123')
  })

  it('deduplicates overlapping matches', () => {
    // Standard and typed patterns might overlap in some edge cases
    const content = '@alice @place:office'
    const mentions = parseAllMentions(content)

    // Each should be unique
    const positions = mentions.map(m => `${m.position.start}-${m.position.end}`)
    const uniquePositions = [...new Set(positions)]
    expect(positions.length).toBe(uniquePositions.length)
  })

  it('handles empty content', () => {
    const mentions = parseAllMentions('')
    expect(mentions).toEqual([])
  })

  it('handles content with no mentions', () => {
    const mentions = parseAllMentions('Hello world, no mentions here.')
    expect(mentions).toEqual([])
  })

  it('parses multiple mention types in same content', () => {
    const content = '@alice visited @place:office and met @[[Bob Smith]]'
    const mentions = parseAllMentions(content)

    // Note: @place:office matches both standard (@place) and typed patterns
    expect(mentions.length).toBeGreaterThanOrEqual(3)
    expect(mentions.some(m => m.mentionText === 'alice')).toBe(true)
    expect(mentions.some(m => m.mentionText === 'office' && m.typeHint === 'place')).toBe(true)
    expect(mentions.some(m => m.mentionText === 'Bob Smith')).toBe(true)
  })
})

// ============================================================================
// inferEntityType
// ============================================================================

describe('inferEntityType', () => {
  it('returns type hint when provided', () => {
    expect(inferEntityType('anything', 'place')).toBe('place')
    expect(inferEntityType('anything', 'person')).toBe('person')
    expect(inferEntityType('anything', 'event')).toBe('event')
  })

  describe('date inference', () => {
    it('infers date for day names', () => {
      expect(inferEntityType('today')).toBe('date')
      expect(inferEntityType('tomorrow')).toBe('date')
      expect(inferEntityType('yesterday')).toBe('date')
      expect(inferEntityType('monday')).toBe('date')
      expect(inferEntityType('tuesday')).toBe('date')
      expect(inferEntityType('wednesday')).toBe('date')
      expect(inferEntityType('thursday')).toBe('date')
      expect(inferEntityType('friday')).toBe('date')
      expect(inferEntityType('saturday')).toBe('date')
      expect(inferEntityType('sunday')).toBe('date')
    })

    it('infers date for abbreviated day names', () => {
      expect(inferEntityType('mon')).toBe('date')
      expect(inferEntityType('tue')).toBe('date')
      expect(inferEntityType('wed')).toBe('date')
      expect(inferEntityType('thu')).toBe('date')
      expect(inferEntityType('fri')).toBe('date')
      expect(inferEntityType('sat')).toBe('date')
      expect(inferEntityType('sun')).toBe('date')
    })

    it('infers date for ISO format', () => {
      expect(inferEntityType('2024-01-15')).toBe('date')
      expect(inferEntityType('2024-12-31')).toBe('date')
    })

    it('infers date for US format', () => {
      expect(inferEntityType('1/15')).toBe('date')
      expect(inferEntityType('12/31/2024')).toBe('date')
      expect(inferEntityType('01/15/24')).toBe('date')
    })

    it('infers date for month names', () => {
      expect(inferEntityType('january-15')).toBe('date')
      expect(inferEntityType('feb-20')).toBe('date')
      expect(inferEntityType('march-1')).toBe('date')
    })

    it('is case insensitive', () => {
      expect(inferEntityType('TODAY')).toBe('date')
      expect(inferEntityType('Monday')).toBe('date')
      expect(inferEntityType('TOMORROW')).toBe('date')
    })
  })

  describe('team inference', () => {
    it('infers team for team patterns', () => {
      expect(inferEntityType('team-alpha')).toBe('team')
      expect(inferEntityType('design-team')).toBe('team')
      expect(inferEntityType('my-group')).toBe('team')
    })

    it('infers team for engineering suffixes', () => {
      expect(inferEntityType('frontend-eng')).toBe('team')
      expect(inferEntityType('backend-ops')).toBe('team')
    })
  })

  describe('project inference', () => {
    it('infers project for project patterns', () => {
      expect(inferEntityType('project-alpha')).toBe('project')
      expect(inferEntityType('prj-website')).toBe('project')
      expect(inferEntityType('proj-redesign')).toBe('project')
    })
  })

  describe('tag inference', () => {
    it('infers tag for common status tags', () => {
      expect(inferEntityType('important')).toBe('tag')
      expect(inferEntityType('urgent')).toBe('tag')
      expect(inferEntityType('todo')).toBe('tag')
      expect(inferEntityType('done')).toBe('tag')
      expect(inferEntityType('blocked')).toBe('tag')
      expect(inferEntityType('wip')).toBe('tag')
      expect(inferEntityType('review')).toBe('tag')
    })
  })

  describe('person default', () => {
    it('defaults to person for unmatched patterns', () => {
      expect(inferEntityType('john-doe')).toBe('person')
      expect(inferEntityType('alice')).toBe('person')
      expect(inferEntityType('bob-smith-jr')).toBe('person')
    })
  })
})

// ============================================================================
// Edge Cases
// ============================================================================

describe('Edge Cases', () => {
  it('handles mentions at end of content', () => {
    const content = 'Contact @support'
    const mentions = parseAllMentions(content)

    expect(mentions.length).toBe(1)
    expect(mentions[0].mentionText).toBe('support')
  })

  it('handles consecutive mentions', () => {
    const content = '@alice @bob @charlie'
    const mentions = parseAllMentions(content)

    expect(mentions.length).toBe(3)
  })

  it('handles mentions in markdown formatting', () => {
    // Standard pattern requires whitespace/bracket before @
    // So ** and * don't count as valid prefixes
    const content = '** @bold-mention** and * @italic-mention*'
    const mentions = parseAllMentions(content)

    expect(mentions.length).toBe(2)
  })

  it('handles very long mention text', () => {
    const longName = 'a'.repeat(100)
    const content = `Contact @${longName}`
    const mentions = parseAllMentions(content)

    expect(mentions.length).toBe(1)
    expect(mentions[0].mentionText).toBe(longName)
  })

  it('handles unicode in wiki-style mentions', () => {
    const content = '@[[José García]]'
    const mentions = parseAllMentions(content)

    expect(mentions.length).toBe(1)
    expect(mentions[0].mentionText).toBe('José García')
  })

  it('handles newlines correctly', () => {
    const content = '@first\n\n@second\n\n\n@third'
    const mentions = parseAllMentions(content)

    expect(mentions.length).toBe(3)
    expect(mentions[0].position.line).toBe(1)
    expect(mentions[1].position.line).toBe(3)
    expect(mentions[2].position.line).toBe(6)
  })
})
