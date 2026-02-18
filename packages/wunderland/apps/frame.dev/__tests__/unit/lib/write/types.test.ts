/**
 * Write Mode Types Tests
 * @module __tests__/unit/lib/write/types.test
 *
 * Tests for write mode type constants and templates.
 */

import { describe, it, expect } from 'vitest'
import {
  PROJECT_TEMPLATES,
  PROJECT_TYPE_LABELS,
  PROJECT_TYPE_ICONS,
  PROJECT_STATUS_LABELS,
  PROJECT_STATUS_COLORS,
  PROJECTS_STORAGE_KEY,
  WORD_COUNT_STORAGE_KEY,
  SESSIONS_STORAGE_KEY,
  WRITE_PROJECTS_WEAVE,
  type ProjectType,
  type ProjectStatus,
} from '@/lib/write/types'

// ============================================================================
// PROJECT_TYPE_LABELS
// ============================================================================

describe('PROJECT_TYPE_LABELS', () => {
  it('has label for story', () => {
    expect(PROJECT_TYPE_LABELS.story).toBe('Story')
  })

  it('has label for essay', () => {
    expect(PROJECT_TYPE_LABELS.essay).toBe('Essay')
  })

  it('has label for article', () => {
    expect(PROJECT_TYPE_LABELS.article).toBe('Article')
  })

  it('has label for poem', () => {
    expect(PROJECT_TYPE_LABELS.poem).toBe('Poem')
  })

  it('has label for script', () => {
    expect(PROJECT_TYPE_LABELS.script).toBe('Script')
  })

  it('has label for journal', () => {
    expect(PROJECT_TYPE_LABELS.journal).toBe('Journal')
  })

  it('has label for other', () => {
    expect(PROJECT_TYPE_LABELS.other).toBe('Other')
  })

  it('all labels are non-empty strings', () => {
    const types: ProjectType[] = ['story', 'essay', 'article', 'poem', 'script', 'journal', 'other']

    for (const type of types) {
      expect(typeof PROJECT_TYPE_LABELS[type]).toBe('string')
      expect(PROJECT_TYPE_LABELS[type].length).toBeGreaterThan(0)
    }
  })
})

// ============================================================================
// PROJECT_TYPE_ICONS
// ============================================================================

describe('PROJECT_TYPE_ICONS', () => {
  it('has icon for story', () => {
    expect(PROJECT_TYPE_ICONS.story).toBe('📚')
  })

  it('has icon for essay', () => {
    expect(PROJECT_TYPE_ICONS.essay).toBe('✍️')
  })

  it('has icon for article', () => {
    expect(PROJECT_TYPE_ICONS.article).toBe('📰')
  })

  it('has icon for poem', () => {
    expect(PROJECT_TYPE_ICONS.poem).toBe('🎭')
  })

  it('has icon for script', () => {
    expect(PROJECT_TYPE_ICONS.script).toBe('🎬')
  })

  it('has icon for journal', () => {
    expect(PROJECT_TYPE_ICONS.journal).toBe('📓')
  })

  it('has icon for other', () => {
    expect(PROJECT_TYPE_ICONS.other).toBe('📄')
  })

  it('all icons are defined', () => {
    const types: ProjectType[] = ['story', 'essay', 'article', 'poem', 'script', 'journal', 'other']

    for (const type of types) {
      expect(PROJECT_TYPE_ICONS[type]).toBeDefined()
    }
  })

  it('has same keys as PROJECT_TYPE_LABELS', () => {
    const labelKeys = Object.keys(PROJECT_TYPE_LABELS).sort()
    const iconKeys = Object.keys(PROJECT_TYPE_ICONS).sort()

    expect(iconKeys).toEqual(labelKeys)
  })
})

// ============================================================================
// PROJECT_STATUS_LABELS
// ============================================================================

describe('PROJECT_STATUS_LABELS', () => {
  it('has label for draft', () => {
    expect(PROJECT_STATUS_LABELS.draft).toBe('Draft')
  })

  it('has label for in_progress', () => {
    expect(PROJECT_STATUS_LABELS.in_progress).toBe('In Progress')
  })

  it('has label for editing', () => {
    expect(PROJECT_STATUS_LABELS.editing).toBe('Editing')
  })

  it('has label for complete', () => {
    expect(PROJECT_STATUS_LABELS.complete).toBe('Complete')
  })

  it('has label for archived', () => {
    expect(PROJECT_STATUS_LABELS.archived).toBe('Archived')
  })

  it('all labels are non-empty strings', () => {
    const statuses: ProjectStatus[] = ['draft', 'in_progress', 'editing', 'complete', 'archived']

    for (const status of statuses) {
      expect(typeof PROJECT_STATUS_LABELS[status]).toBe('string')
      expect(PROJECT_STATUS_LABELS[status].length).toBeGreaterThan(0)
    }
  })
})

// ============================================================================
// PROJECT_STATUS_COLORS
// ============================================================================

describe('PROJECT_STATUS_COLORS', () => {
  it('has color classes for draft', () => {
    expect(PROJECT_STATUS_COLORS.draft).toContain('zinc')
    expect(PROJECT_STATUS_COLORS.draft).toContain('text-')
    expect(PROJECT_STATUS_COLORS.draft).toContain('bg-')
  })

  it('has color classes for in_progress', () => {
    expect(PROJECT_STATUS_COLORS.in_progress).toContain('cyan')
  })

  it('has color classes for editing', () => {
    expect(PROJECT_STATUS_COLORS.editing).toContain('amber')
  })

  it('has color classes for complete', () => {
    expect(PROJECT_STATUS_COLORS.complete).toContain('emerald')
  })

  it('has color classes for archived', () => {
    expect(PROJECT_STATUS_COLORS.archived).toContain('zinc')
  })

  it('all colors include text and background classes', () => {
    const statuses: ProjectStatus[] = ['draft', 'in_progress', 'editing', 'complete', 'archived']

    for (const status of statuses) {
      expect(PROJECT_STATUS_COLORS[status]).toMatch(/text-/)
      expect(PROJECT_STATUS_COLORS[status]).toMatch(/bg-/)
    }
  })

  it('has same keys as PROJECT_STATUS_LABELS', () => {
    const labelKeys = Object.keys(PROJECT_STATUS_LABELS).sort()
    const colorKeys = Object.keys(PROJECT_STATUS_COLORS).sort()

    expect(colorKeys).toEqual(labelKeys)
  })
})

// ============================================================================
// STORAGE KEYS
// ============================================================================

describe('Storage Keys', () => {
  it('PROJECTS_STORAGE_KEY is defined', () => {
    expect(PROJECTS_STORAGE_KEY).toBe('quarry-write-projects')
  })

  it('WORD_COUNT_STORAGE_KEY is defined', () => {
    expect(WORD_COUNT_STORAGE_KEY).toBe('quarry-write-wordcount')
  })

  it('SESSIONS_STORAGE_KEY is defined', () => {
    expect(SESSIONS_STORAGE_KEY).toBe('quarry-write-sessions')
  })

  it('WRITE_PROJECTS_WEAVE is defined', () => {
    expect(WRITE_PROJECTS_WEAVE).toBe('projects')
  })

  it('all storage keys are unique', () => {
    const keys = [PROJECTS_STORAGE_KEY, WORD_COUNT_STORAGE_KEY, SESSIONS_STORAGE_KEY]
    const uniqueKeys = new Set(keys)

    expect(uniqueKeys.size).toBe(keys.length)
  })

  it('all storage keys have consistent prefix', () => {
    expect(PROJECTS_STORAGE_KEY).toMatch(/^quarry-write-/)
    expect(WORD_COUNT_STORAGE_KEY).toMatch(/^quarry-write-/)
    expect(SESSIONS_STORAGE_KEY).toMatch(/^quarry-write-/)
  })
})

// ============================================================================
// PROJECT_TEMPLATES
// ============================================================================

describe('PROJECT_TEMPLATES', () => {
  it('has at least 5 templates', () => {
    expect(PROJECT_TEMPLATES.length).toBeGreaterThanOrEqual(5)
  })

  it('all templates have required fields', () => {
    for (const template of PROJECT_TEMPLATES) {
      expect(template.id).toBeDefined()
      expect(typeof template.id).toBe('string')
      expect(template.name).toBeDefined()
      expect(typeof template.name).toBe('string')
      expect(template.description).toBeDefined()
      expect(typeof template.description).toBe('string')
      expect(template.type).toBeDefined()
      expect(template.structure).toBeDefined()
      expect(template.structure.parts).toBeDefined()
      expect(Array.isArray(template.structure.parts)).toBe(true)
    }
  })

  it('all templates have unique IDs', () => {
    const ids = PROJECT_TEMPLATES.map((t) => t.id)
    const uniqueIds = new Set(ids)

    expect(uniqueIds.size).toBe(ids.length)
  })

  describe('Novel (3-Act) template', () => {
    const novelTemplate = PROJECT_TEMPLATES.find((t) => t.id === 'novel-3act')

    it('exists', () => {
      expect(novelTemplate).toBeDefined()
    })

    it('has type story', () => {
      expect(novelTemplate?.type).toBe('story')
    })

    it('has 3 parts (acts)', () => {
      expect(novelTemplate?.structure.parts.length).toBe(3)
    })

    it('has word goal of 80000', () => {
      expect(novelTemplate?.wordGoal).toBe(80000)
    })

    it('parts have expected titles', () => {
      expect(novelTemplate?.structure.parts[0].title).toContain('Act I')
      expect(novelTemplate?.structure.parts[1].title).toContain('Act II')
      expect(novelTemplate?.structure.parts[2].title).toContain('Act III')
    })
  })

  describe('Short Story template', () => {
    const shortStoryTemplate = PROJECT_TEMPLATES.find((t) => t.id === 'short-story')

    it('exists', () => {
      expect(shortStoryTemplate).toBeDefined()
    })

    it('has type story', () => {
      expect(shortStoryTemplate?.type).toBe('story')
    })

    it('has 1 part', () => {
      expect(shortStoryTemplate?.structure.parts.length).toBe(1)
    })

    it('has word goal of 5000', () => {
      expect(shortStoryTemplate?.wordGoal).toBe(5000)
    })
  })

  describe('Essay template', () => {
    const essayTemplate = PROJECT_TEMPLATES.find((t) => t.id === 'essay-5para')

    it('exists', () => {
      expect(essayTemplate).toBeDefined()
    })

    it('has type essay', () => {
      expect(essayTemplate?.type).toBe('essay')
    })

    it('has 5 chapters (paragraphs)', () => {
      expect(essayTemplate?.structure.parts[0].chapters.length).toBe(5)
    })

    it('has word goal of 2000', () => {
      expect(essayTemplate?.wordGoal).toBe(2000)
    })
  })

  describe('Article template', () => {
    const articleTemplate = PROJECT_TEMPLATES.find((t) => t.id === 'article')

    it('exists', () => {
      expect(articleTemplate).toBeDefined()
    })

    it('has type article', () => {
      expect(articleTemplate?.type).toBe('article')
    })

    it('has 4 chapters', () => {
      expect(articleTemplate?.structure.parts[0].chapters.length).toBe(4)
    })

    it('has word goal of 1500', () => {
      expect(articleTemplate?.wordGoal).toBe(1500)
    })
  })

  describe('Screenplay template', () => {
    const screenplayTemplate = PROJECT_TEMPLATES.find((t) => t.id === 'screenplay')

    it('exists', () => {
      expect(screenplayTemplate).toBeDefined()
    })

    it('has type script', () => {
      expect(screenplayTemplate?.type).toBe('script')
    })

    it('has 3 parts (acts)', () => {
      expect(screenplayTemplate?.structure.parts.length).toBe(3)
    })

    it('has word goal of 25000', () => {
      expect(screenplayTemplate?.wordGoal).toBe(25000)
    })
  })

  describe('Blank Project template', () => {
    const blankTemplate = PROJECT_TEMPLATES.find((t) => t.id === 'blank')

    it('exists', () => {
      expect(blankTemplate).toBeDefined()
    })

    it('has type other', () => {
      expect(blankTemplate?.type).toBe('other')
    })

    it('has minimal structure', () => {
      expect(blankTemplate?.structure.parts.length).toBe(1)
      expect(blankTemplate?.structure.parts[0].chapters.length).toBe(1)
    })

    it('has no word goal', () => {
      expect(blankTemplate?.wordGoal).toBeUndefined()
    })
  })

  it('templates cover different project types', () => {
    const types = PROJECT_TEMPLATES.map((t) => t.type)
    const uniqueTypes = new Set(types)

    expect(uniqueTypes.size).toBeGreaterThanOrEqual(4)
    expect(uniqueTypes.has('story')).toBe(true)
    expect(uniqueTypes.has('essay')).toBe(true)
    expect(uniqueTypes.has('article')).toBe(true)
    expect(uniqueTypes.has('script')).toBe(true)
  })

  it('all templates have non-empty parts', () => {
    for (const template of PROJECT_TEMPLATES) {
      expect(template.structure.parts.length).toBeGreaterThan(0)

      for (const part of template.structure.parts) {
        expect(part.title).toBeDefined()
        expect(part.chapters).toBeDefined()
        expect(part.chapters.length).toBeGreaterThan(0)
      }
    }
  })

  it('all chapters have titles', () => {
    for (const template of PROJECT_TEMPLATES) {
      for (const part of template.structure.parts) {
        for (const chapter of part.chapters) {
          expect(chapter.title).toBeDefined()
          expect(typeof chapter.title).toBe('string')
          expect(chapter.title.length).toBeGreaterThan(0)
        }
      }
    }
  })
})
