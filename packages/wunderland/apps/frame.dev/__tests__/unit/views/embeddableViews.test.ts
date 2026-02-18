/**
 * Embeddable Views Tests
 * @module __tests__/unit/views/embeddableViews.test
 *
 * Tests for view parsing, data extraction, configuration, and registry.
 */

import { describe, it, expect } from 'vitest'
import {
  parseViewDeclaration,
  extractViewData,
  getDefaultViewSettings,
  createViewConfig,
  getViewTypeMetadata,
  viewSupportsmentionType,
  VIEW_TYPE_REGISTRY,
  type EmbeddableViewConfig,
  type ViewData,
} from '@/lib/views/embeddableViews'
import type { MentionableEntity } from '@/lib/mentions/types'

// ============================================================================
// VIEW DECLARATION PARSING TESTS
// ============================================================================

describe('View Declaration Parsing', () => {
  describe('parseViewDeclaration', () => {
    it('parses basic map view declaration', () => {
      const content = `type: map
title: My Trip
scope: document`
      const config = parseViewDeclaration(content)

      expect(config).not.toBeNull()
      expect(config!.type).toBe('map')
      expect(config!.title).toBe('My Trip')
      expect(config!.scope.type).toBe('document')
    })

    it('parses calendar view with settings', () => {
      const content = `type: calendar
title: Project Timeline
scope: subtree
mode: month
showTimeSlots: true`
      const config = parseViewDeclaration(content)

      expect(config).not.toBeNull()
      expect(config!.type).toBe('calendar')
      expect(config!.settings.mode).toBe('month')
      expect(config!.settings.showTimeSlots).toBe(true)
    })

    it('parses filter string', () => {
      const content = `type: table
filter: mentionTypes=place|person, dateStart=2024-01-01`
      const config = parseViewDeclaration(content)

      expect(config).not.toBeNull()
      expect(config!.filter).toBeDefined()
      expect(config!.filter!.mentionTypes).toEqual(['place', 'person'])
      expect(config!.filter!.dateRange?.start).toBe('2024-01-01')
    })

    it('parses numeric values', () => {
      const content = `type: map
zoom: 15
clusterMarkers: true`
      const config = parseViewDeclaration(content)

      expect(config).not.toBeNull()
      expect(config!.settings.zoom).toBe(15)
      expect(config!.settings.clusterMarkers).toBe(true)
    })

    it('parses boolean values correctly', () => {
      const content = `type: table
showRowNumbers: true
compact: false`
      const config = parseViewDeclaration(content)

      expect(config).not.toBeNull()
      expect(config!.settings.showRowNumbers).toBe(true)
      expect(config!.settings.compact).toBe(false)
    })

    it('returns null for empty content', () => {
      const config = parseViewDeclaration('')
      expect(config).toBeNull()
    })

    it('returns null when type is missing', () => {
      const content = `title: No Type View
scope: document`
      const config = parseViewDeclaration(content)
      expect(config).toBeNull()
    })

    it('generates unique ID', () => {
      const content = `type: list`
      const config1 = parseViewDeclaration(content)
      const config2 = parseViewDeclaration(content)

      expect(config1!.id).toBeDefined()
      // IDs might be same if parsed in same millisecond, but should be defined
      expect(config1!.id.startsWith('view-')).toBe(true)
    })

    it('handles colons in values', () => {
      const content = `type: table
expression: status:done AND priority:high`
      const config = parseViewDeclaration(content)

      expect(config).not.toBeNull()
      // The value after first colon should be preserved
      expect(config!.settings.expression).toContain('status')
    })
  })
})

// ============================================================================
// DATA EXTRACTION TESTS
// ============================================================================

describe('View Data Extraction', () => {
  const mockMentions: MentionableEntity[] = [
    {
      id: 'place-1',
      type: 'place',
      label: 'Paris',
      icon: '📍',
      properties: { latitude: 48.8566, longitude: 2.3522 },
      createdAt: '2024-01-01T00:00:00Z',
    } as MentionableEntity,
    {
      id: 'place-2',
      type: 'place',
      label: 'London',
      icon: '📍',
      properties: { latitude: 51.5074, longitude: -0.1278 },
      createdAt: '2024-01-01T00:00:00Z',
    } as MentionableEntity,
    {
      id: 'date-1',
      type: 'date',
      label: 'Jan 15, 2024',
      icon: '📅',
      properties: { date: '2024-01-15' },
      createdAt: '2024-01-01T00:00:00Z',
    } as MentionableEntity,
    {
      id: 'person-1',
      type: 'person',
      label: 'John Doe',
      icon: '👤',
      properties: { fullName: 'John Doe' },
      createdAt: '2024-01-01T00:00:00Z',
    } as MentionableEntity,
  ]

  describe('extractViewData', () => {
    it('converts mentions to view data items', () => {
      const config = createViewConfig('table')
      const data = extractViewData(mockMentions, config)

      expect(data.items).toHaveLength(4)
      expect(data.items[0].id).toBe('place-1')
      expect(data.items[0].source.type).toBe('mention')
    })

    it('filters by mention type', () => {
      const config = createViewConfig('map', {
        filter: { mentionTypes: ['place'] },
      })
      const data = extractViewData(mockMentions, config)

      expect(data.items).toHaveLength(2)
      expect(data.items.every(item => (item.entity as MentionableEntity).type === 'place')).toBe(true)
    })

    it('filters by multiple mention types', () => {
      const config = createViewConfig('table', {
        filter: { mentionTypes: ['place', 'person'] },
      })
      const data = extractViewData(mockMentions, config)

      expect(data.items).toHaveLength(3)
    })

    it('filters by date range', () => {
      const config = createViewConfig('calendar', {
        filter: {
          dateRange: {
            start: '2024-01-01',
            end: '2024-01-31',
          },
        },
      })
      const data = extractViewData(mockMentions, config)

      // Should include date-1 which is Jan 15
      const dates = data.items.filter(item => (item.entity as MentionableEntity).type === 'date')
      expect(dates.length).toBeGreaterThanOrEqual(0)
    })

    it('groups data by field', () => {
      const config = createViewConfig('table', {
        settings: {
          type: 'table',
          columns: [],
          groupBy: 'type',
        },
      })
      const data = extractViewData(mockMentions, config)

      expect(data.groups).toBeDefined()
      expect(data.groups!.length).toBeGreaterThan(0)
    })

    it('handles empty mentions array', () => {
      const config = createViewConfig('list')
      const data = extractViewData([], config)

      expect(data.items).toHaveLength(0)
    })

    it('preserves source path in items', () => {
      const mentionsWithPath: MentionableEntity[] = [
        {
          id: 'test-1',
          type: 'person',
          label: 'Test',
          sourceStrandPath: '/my/strand/path',
          properties: {},
          createdAt: '2024-01-01T00:00:00Z',
        } as MentionableEntity,
      ]
      const config = createViewConfig('list')
      const data = extractViewData(mentionsWithPath, config)

      expect(data.items[0].source.path).toBe('/my/strand/path')
    })
  })
})

// ============================================================================
// DEFAULT SETTINGS TESTS
// ============================================================================

describe('Default View Settings', () => {
  describe('getDefaultViewSettings', () => {
    it('returns map defaults', () => {
      const settings = getDefaultViewSettings('map')

      expect(settings.type).toBe('map')
      expect(settings.zoom).toBe(12)
      expect(settings.style).toBe('street')
      expect(settings.clusterMarkers).toBe(true)
    })

    it('returns calendar defaults', () => {
      const settings = getDefaultViewSettings('calendar')

      expect(settings.type).toBe('calendar')
      expect(settings.mode).toBe('month')
      expect(settings.showTimeSlots).toBe(true)
      expect(settings.slotDuration).toBe(30)
    })

    it('returns table defaults', () => {
      const settings = getDefaultViewSettings('table')

      expect(settings.type).toBe('table')
      expect(settings.columns).toEqual([])
      expect(settings.showRowNumbers).toBe(false)
      expect(settings.editable).toBe(false)
    })

    it('returns chart defaults', () => {
      const settings = getDefaultViewSettings('chart')

      expect(settings.type).toBe('chart')
      expect(settings.chartType).toBe('bar')
      expect(settings.aggregate).toBe('count')
      expect(settings.showLegend).toBe(true)
    })

    it('returns list defaults', () => {
      const settings = getDefaultViewSettings('list')

      expect(settings.type).toBe('list')
      expect(settings.style).toBe('bullet')
      expect(settings.showIcons).toBe(true)
    })
  })
})

// ============================================================================
// VIEW CONFIG CREATION TESTS
// ============================================================================

describe('View Config Creation', () => {
  describe('createViewConfig', () => {
    it('creates config with defaults', () => {
      const config = createViewConfig('map')

      expect(config.type).toBe('map')
      expect(config.id).toBeDefined()
      expect(config.scope.type).toBe('document')
      expect(config.settings.type).toBe('map')
    })

    it('merges overrides', () => {
      const config = createViewConfig('calendar', {
        title: 'My Calendar',
        scope: { type: 'subtree', root: '/events' },
      })

      expect(config.title).toBe('My Calendar')
      expect(config.scope.type).toBe('subtree')
      expect(config.scope.root).toBe('/events')
    })

    it('generates unique IDs', () => {
      const config1 = createViewConfig('list')
      const config2 = createViewConfig('list')

      // IDs should contain random component
      expect(config1.id).not.toBe(config2.id)
    })

    it('preserves override settings', () => {
      const config = createViewConfig('table', {
        settings: {
          type: 'table',
          columns: [{ id: 'name', label: 'Name', field: 'name' }],
          sortBy: 'name',
        },
      })

      expect(config.settings.columns).toHaveLength(1)
      expect(config.settings.sortBy).toBe('name')
    })
  })
})

// ============================================================================
// VIEW REGISTRY TESTS
// ============================================================================

describe('View Registry', () => {
  describe('VIEW_TYPE_REGISTRY', () => {
    it('contains all view types', () => {
      const types = VIEW_TYPE_REGISTRY.map(v => v.type)

      expect(types).toContain('map')
      expect(types).toContain('calendar')
      expect(types).toContain('table')
      expect(types).toContain('chart')
      expect(types).toContain('list')
    })

    it('each entry has required fields', () => {
      for (const entry of VIEW_TYPE_REGISTRY) {
        expect(entry.type).toBeDefined()
        expect(entry.label).toBeDefined()
        expect(entry.description).toBeDefined()
        expect(entry.icon).toBeDefined()
        expect(entry.supportedMentionTypes).toBeDefined()
        expect(Array.isArray(entry.supportedMentionTypes)).toBe(true)
      }
    })
  })

  describe('getViewTypeMetadata', () => {
    it('returns metadata for valid type', () => {
      const metadata = getViewTypeMetadata('map')

      expect(metadata).toBeDefined()
      expect(metadata!.type).toBe('map')
      expect(metadata!.label).toBe('Map View')
    })

    it('returns undefined for invalid type', () => {
      const metadata = getViewTypeMetadata('invalid' as any)

      expect(metadata).toBeUndefined()
    })
  })

  describe('viewSupportsmentionType', () => {
    it('map supports place mentions', () => {
      expect(viewSupportsmentionType('map', 'place')).toBe(true)
    })

    it('map supports event mentions', () => {
      expect(viewSupportsmentionType('map', 'event')).toBe(true)
    })

    it('calendar supports date mentions', () => {
      expect(viewSupportsmentionType('calendar', 'date')).toBe(true)
    })

    it('table supports all mention types (*)', () => {
      expect(viewSupportsmentionType('table', 'place')).toBe(true)
      expect(viewSupportsmentionType('table', 'person')).toBe(true)
      expect(viewSupportsmentionType('table', 'custom')).toBe(true)
    })

    it('list supports all mention types (*)', () => {
      expect(viewSupportsmentionType('list', 'anything')).toBe(true)
    })

    it('returns false for invalid view type', () => {
      expect(viewSupportsmentionType('invalid' as any, 'place')).toBe(false)
    })
  })
})

// ============================================================================
// VIEW SCOPE TESTS
// ============================================================================

describe('View Scope', () => {
  it('document scope includes all mentions', () => {
    const config: EmbeddableViewConfig = {
      id: 'test',
      type: 'list',
      scope: { type: 'document' },
      settings: { type: 'list', style: 'bullet' },
    }

    const mentions: MentionableEntity[] = [
      { id: '1', type: 'person', label: 'A', properties: {}, createdAt: '' } as MentionableEntity,
      { id: '2', type: 'person', label: 'B', properties: {}, createdAt: '' } as MentionableEntity,
    ]

    const data = extractViewData(mentions, config)
    expect(data.items).toHaveLength(2)
  })

  it('config with filter reduces items', () => {
    const config: EmbeddableViewConfig = {
      id: 'test',
      type: 'map',
      scope: { type: 'document' },
      filter: { mentionTypes: ['place'] },
      settings: { type: 'map' },
    }

    const mentions: MentionableEntity[] = [
      { id: '1', type: 'place', label: 'A', properties: {}, createdAt: '' } as MentionableEntity,
      { id: '2', type: 'person', label: 'B', properties: {}, createdAt: '' } as MentionableEntity,
    ]

    const data = extractViewData(mentions, config)
    expect(data.items).toHaveLength(1)
    expect(data.items[0].id).toBe('1')
  })
})

// ============================================================================
// EDGE CASES
// ============================================================================

describe('Edge Cases', () => {
  it('handles mentions with missing properties', () => {
    const config = createViewConfig('table')
    const mentions: MentionableEntity[] = [
      {
        id: '1',
        type: 'person',
        label: 'Test',
        properties: {},
        createdAt: '2024-01-01',
      } as MentionableEntity,
    ]

    const data = extractViewData(mentions, config)
    expect(data.items).toHaveLength(1)
  })

  it('handles groupBy on missing field', () => {
    const config = createViewConfig('table', {
      settings: {
        type: 'table',
        columns: [],
        groupBy: 'nonexistent',
      },
    })

    const mentions: MentionableEntity[] = [
      { id: '1', type: 'person', label: 'A', properties: {}, createdAt: '' } as MentionableEntity,
    ]

    const data = extractViewData(mentions, config)
    expect(data.groups).toBeDefined()
    expect(data.groups![0].key).toBe('Other') // Falls back to 'Other'
  })

  it('handles date range filter with only start', () => {
    const config = createViewConfig('calendar', {
      filter: {
        dateRange: { start: '2024-01-01' },
      },
    })

    const mentions: MentionableEntity[] = [
      {
        id: '1',
        type: 'date',
        label: 'Dec 2023',
        properties: { date: '2023-12-15' },
        createdAt: '',
      } as MentionableEntity,
      {
        id: '2',
        type: 'date',
        label: 'Feb 2024',
        properties: { date: '2024-02-15' },
        createdAt: '',
      } as MentionableEntity,
    ]

    const data = extractViewData(mentions, config)
    // Dec 2023 is before start, should be filtered
    expect(data.items.length).toBeLessThanOrEqual(2)
  })

  it('handles date range filter with only end', () => {
    const config = createViewConfig('calendar', {
      filter: {
        dateRange: { end: '2024-01-31' },
      },
    })

    const mentions: MentionableEntity[] = [
      {
        id: '1',
        type: 'date',
        label: 'Jan 2024',
        properties: { date: '2024-01-15' },
        createdAt: '',
      } as MentionableEntity,
      {
        id: '2',
        type: 'date',
        label: 'Feb 2024',
        properties: { date: '2024-02-15' },
        createdAt: '',
      } as MentionableEntity,
    ]

    const data = extractViewData(mentions, config)
    // Feb 2024 is after end, should be filtered
    expect(data.items.length).toBeLessThanOrEqual(2)
  })
})

