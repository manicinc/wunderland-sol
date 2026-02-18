/**
 * Template Service Unit Tests
 * @module __tests__/unit/templates/templateService
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type { LoadedTemplate, StrandTemplate, TemplateFormData, TemplatePreferences } from '@/components/quarry/templates/types'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
  }
})()

Object.defineProperty(window, 'localStorage', { value: localStorageMock })

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

// Import after mocks are set up
import {
  filterTemplates,
  getTemplatePreferences,
  saveTemplatePreferences,
  toggleFavorite,
  recordTemplateUsage,
  validateFormData,
  generateFrontmatter,
  templateCache,
  clearTemplateCache,
} from '@/components/quarry/templates/templateService'

/* ═══════════════════════════════════════════════════════════════════════════
   TEST DATA
═══════════════════════════════════════════════════════════════════════════ */

const mockTemplates: LoadedTemplate[] = [
  {
    id: 'meeting-notes',
    name: 'Meeting Notes',
    category: 'business',
    description: 'Template for meeting notes',
    shortDescription: 'Take structured meeting notes',
    difficulty: 'beginner',
    tags: ['meeting', 'notes', 'business'],
    featured: true,
    popularity: 100,
    fields: [
      { name: 'title', label: 'Title', type: 'text', required: true },
      { name: 'date', label: 'Date', type: 'date', required: true },
      { name: 'notes', label: 'Notes', type: 'textarea', required: false },
    ],
    template: '# {title}\nDate: {date}\n\n{notes}',
    path: 'business/meeting-notes.json',
    categoryMeta: { id: 'business', name: 'Business', description: '', icon: 'Briefcase', color: '#3B82F6' },
    isFavorite: false,
    useCount: 0,
  },
  {
    id: 'bug-report',
    name: 'Bug Report',
    category: 'technical',
    description: 'Template for bug reports',
    shortDescription: 'Report bugs systematically',
    difficulty: 'intermediate',
    tags: ['bug', 'issue', 'development'],
    featured: false,
    popularity: 80,
    fields: [
      { name: 'title', label: 'Title', type: 'text', required: true },
      { name: 'severity', label: 'Severity', type: 'select', required: true, options: ['Low', 'Medium', 'High'] },
      { name: 'steps', label: 'Steps', type: 'textarea', required: false },
    ],
    template: '# Bug: {title}\nSeverity: {severity}\n\n## Steps\n{steps}',
    path: 'technical/bug-report.json',
    categoryMeta: { id: 'technical', name: 'Technical', description: '', icon: 'Code', color: '#10B981' },
    isFavorite: true,
    useCount: 5,
    lastUsed: Date.now() - 86400000, // 1 day ago
  },
  {
    id: 'blog-post',
    name: 'Blog Post',
    category: 'creative',
    description: 'Template for blog articles',
    shortDescription: 'Write engaging blog posts',
    difficulty: 'advanced',
    tags: ['blog', 'writing', 'content'],
    featured: true,
    popularity: 90,
    fields: [
      { name: 'title', label: 'Title', type: 'text', required: true },
      { name: 'body', label: 'Body', type: 'textarea', required: true },
    ],
    template: '# {title}\n\n{body}',
    path: 'creative/blog-post.json',
    categoryMeta: { id: 'creative', name: 'Creative', description: '', icon: 'Palette', color: '#8B5CF6' },
    isFavorite: false,
    useCount: 10,
    lastUsed: Date.now(),
  },
]

/* ═══════════════════════════════════════════════════════════════════════════
   TEST SUITES
═══════════════════════════════════════════════════════════════════════════ */

describe('templateService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.clear()
    clearTemplateCache()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  /* ─────────────────────────────────────────────────────────────────────────
     filterTemplates
  ─────────────────────────────────────────────────────────────────────────── */

  describe('filterTemplates', () => {
    it('returns all templates when no filters applied', () => {
      const result = filterTemplates(mockTemplates, {})
      expect(result).toHaveLength(3)
    })

    it('filters by search query (name)', () => {
      const result = filterTemplates(mockTemplates, { query: 'meeting' })
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('meeting-notes')
    })

    it('filters by search query (tags)', () => {
      const result = filterTemplates(mockTemplates, { query: 'bug' })
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('bug-report')
    })

    it('filters by search query (case insensitive)', () => {
      const result = filterTemplates(mockTemplates, { query: 'BLOG' })
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('blog-post')
    })

    it('filters by category', () => {
      const result = filterTemplates(mockTemplates, { category: 'technical' })
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('bug-report')
    })

    it('filters by difficulty', () => {
      const result = filterTemplates(mockTemplates, { difficulty: 'beginner' })
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('meeting-notes')
    })

    it('filters by tags', () => {
      const result = filterTemplates(mockTemplates, { tags: ['writing'] })
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('blog-post')
    })

    it('filters featured only', () => {
      const result = filterTemplates(mockTemplates, { featuredOnly: true })
      expect(result).toHaveLength(2)
      expect(result.map(t => t.id)).toContain('meeting-notes')
      expect(result.map(t => t.id)).toContain('blog-post')
    })

    it('filters favorites only', () => {
      const result = filterTemplates(mockTemplates, { favoritesOnly: true })
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('bug-report')
    })

    it('sorts by name', () => {
      const result = filterTemplates(mockTemplates, { sortBy: 'name' })
      expect(result[0].name).toBe('Blog Post')
      expect(result[1].name).toBe('Bug Report')
      expect(result[2].name).toBe('Meeting Notes')
    })

    it('sorts by name descending', () => {
      const result = filterTemplates(mockTemplates, { sortBy: 'name', sortOrder: 'desc' })
      expect(result[0].name).toBe('Meeting Notes')
      expect(result[2].name).toBe('Blog Post')
    })

    it('sorts by popularity', () => {
      const result = filterTemplates(mockTemplates, { sortBy: 'popularity' })
      expect(result[0].id).toBe('meeting-notes') // popularity 100
      expect(result[1].id).toBe('blog-post') // popularity 90
      expect(result[2].id).toBe('bug-report') // popularity 80
    })

    it('sorts by recent usage', () => {
      const result = filterTemplates(mockTemplates, { sortBy: 'recent' })
      expect(result[0].id).toBe('blog-post') // most recent
      expect(result[1].id).toBe('bug-report') // 1 day ago
    })

    it('sorts by difficulty', () => {
      const result = filterTemplates(mockTemplates, { sortBy: 'difficulty' })
      expect(result[0].difficulty).toBe('beginner')
      expect(result[1].difficulty).toBe('intermediate')
      expect(result[2].difficulty).toBe('advanced')
    })

    it('combines multiple filters', () => {
      const result = filterTemplates(mockTemplates, {
        query: 'post',
        category: 'creative',
        featuredOnly: true,
      })
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('blog-post')
    })
  })

  /* ─────────────────────────────────────────────────────────────────────────
     Preferences (Favorites)
  ─────────────────────────────────────────────────────────────────────────── */

  describe('favorites', () => {
    it('returns empty preferences when localStorage is empty', () => {
      const prefs = getTemplatePreferences()
      expect(prefs.favorites).toEqual([])
      expect(prefs.recent).toEqual([])
      expect(prefs.stats).toEqual({})
    })

    it('loads preferences from localStorage', () => {
      const storedPrefs: TemplatePreferences = {
        favorites: ['template-1', 'template-2'],
        recent: ['template-1'],
        stats: {
          'template-1': { templateId: 'template-1', useCount: 5, lastUsed: 1234567890, isFavorite: true },
        },
      }
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(storedPrefs))

      const prefs = getTemplatePreferences()
      expect(prefs.favorites).toEqual(['template-1', 'template-2'])
    })

    it('saves preferences to localStorage', () => {
      const prefs: TemplatePreferences = {
        favorites: ['test-template'],
        recent: [],
        stats: {},
      }

      saveTemplatePreferences(prefs)

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'codex-template-preferences',
        JSON.stringify(prefs)
      )
    })

    it('toggles favorite status on', () => {
      const result = toggleFavorite('new-template')
      expect(result).toBe(true) // now favorited
    })

    it('toggles favorite status off', () => {
      // Setup: template is already favorited
      const storedPrefs: TemplatePreferences = {
        favorites: ['existing-template'],
        recent: [],
        stats: { 'existing-template': { templateId: 'existing-template', useCount: 0, lastUsed: 0, isFavorite: true } },
      }
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(storedPrefs))

      const result = toggleFavorite('existing-template')
      expect(result).toBe(false) // now unfavorited
    })
  })

  /* ─────────────────────────────────────────────────────────────────────────
     Usage Tracking
  ─────────────────────────────────────────────────────────────────────────── */

  describe('usage tracking', () => {
    it('records template usage', () => {
      recordTemplateUsage('test-template')

      expect(localStorageMock.setItem).toHaveBeenCalled()
      const savedPrefs = JSON.parse(localStorageMock.setItem.mock.calls[0][1])
      expect(savedPrefs.recent[0]).toBe('test-template')
      expect(savedPrefs.stats['test-template'].useCount).toBe(1)
    })

    it('updates lastUsed timestamp', () => {
      const before = Date.now()
      recordTemplateUsage('test-template')
      const after = Date.now()

      const savedPrefs = JSON.parse(localStorageMock.setItem.mock.calls[0][1])
      expect(savedPrefs.stats['test-template'].lastUsed).toBeGreaterThanOrEqual(before)
      expect(savedPrefs.stats['test-template'].lastUsed).toBeLessThanOrEqual(after)
    })

    it('increments useCount', () => {
      const storedPrefs: TemplatePreferences = {
        favorites: [],
        recent: ['test-template'],
        stats: { 'test-template': { templateId: 'test-template', useCount: 5, lastUsed: 0, isFavorite: false } },
      }
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(storedPrefs))

      recordTemplateUsage('test-template')

      const savedPrefs = JSON.parse(localStorageMock.setItem.mock.calls[0][1])
      expect(savedPrefs.stats['test-template'].useCount).toBe(6)
    })

    it('maintains recent templates list (max 10)', () => {
      const storedPrefs: TemplatePreferences = {
        favorites: [],
        recent: ['t1', 't2', 't3', 't4', 't5', 't6', 't7', 't8', 't9', 't10'],
        stats: {},
      }
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(storedPrefs))

      recordTemplateUsage('new-template')

      const savedPrefs = JSON.parse(localStorageMock.setItem.mock.calls[0][1])
      expect(savedPrefs.recent).toHaveLength(10)
      expect(savedPrefs.recent[0]).toBe('new-template')
      expect(savedPrefs.recent).not.toContain('t10') // oldest removed
    })

    it('moves template to front if already in recent', () => {
      const storedPrefs: TemplatePreferences = {
        favorites: [],
        recent: ['t1', 't2', 't3'],
        stats: {},
      }
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(storedPrefs))

      recordTemplateUsage('t2')

      const savedPrefs = JSON.parse(localStorageMock.setItem.mock.calls[0][1])
      expect(savedPrefs.recent[0]).toBe('t2')
      expect(savedPrefs.recent).toHaveLength(3)
    })
  })

  /* ─────────────────────────────────────────────────────────────────────────
     Validation
  ─────────────────────────────────────────────────────────────────────────── */

  describe('validateFormData', () => {
    const template: StrandTemplate = {
      id: 'test-template',
      name: 'Test Template',
      category: 'general',
      description: 'Test',
      shortDescription: 'Test',
      difficulty: 'beginner',
      tags: [],
      featured: false,
      popularity: 0,
      fields: [
        { name: 'title', label: 'Title', type: 'text', required: true },
        { name: 'body', label: 'Body', type: 'textarea', required: false },
        {
          name: 'count',
          label: 'Count',
          type: 'number',
          required: false,
          validation: { min: 1, max: 10 },
        },
        {
          name: 'code',
          label: 'Code',
          type: 'text',
          required: false,
          validation: { pattern: '^[A-Z]{2}-\\d{4}$', patternDescription: 'Format: XX-0000' },
        },
      ],
      template: '',
    }

    it('validates required fields', () => {
      const result = validateFormData(template, { title: '', body: 'test' })
      expect(result.valid).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].field).toBe('title')
      expect(result.errors[0].type).toBe('required')
    })

    it('passes when required fields are filled', () => {
      const result = validateFormData(template, { title: 'Test Title' })
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('validates number min/max', () => {
      const result = validateFormData(template, { title: 'Test', count: 15 })
      expect(result.valid).toBe(false)
      expect(result.errors[0].field).toBe('count')
    })

    it('validates pattern regex', () => {
      const result = validateFormData(template, { title: 'Test', code: 'invalid' })
      expect(result.valid).toBe(false)
      expect(result.errors[0].field).toBe('code')
      expect(result.errors[0].message).toContain('Format: XX-0000')
    })

    it('passes pattern validation with correct format', () => {
      const result = validateFormData(template, { title: 'Test', code: 'AB-1234' })
      expect(result.valid).toBe(true)
    })

    it('returns field-level errors', () => {
      const result = validateFormData(template, {
        title: '',
        count: 0,
        code: 'bad',
      })
      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.errors.map(e => e.field)).toContain('title')
    })
  })

  /* ─────────────────────────────────────────────────────────────────────────
     Frontmatter Generation
  ─────────────────────────────────────────────────────────────────────────── */

  describe('generateFrontmatter', () => {
    const template: StrandTemplate = {
      id: 'test',
      name: 'Test',
      category: 'general',
      description: '',
      shortDescription: '',
      difficulty: 'beginner',
      tags: [],
      featured: false,
      popularity: 0,
      fields: [
        { name: 'title', label: 'Title', type: 'text', required: true },
        { name: 'tags', label: 'Tags', type: 'tags', required: false },
      ],
      template: '# {title}\n\nTags: {tags}\n\nDate: {date}',
      defaultData: { status: 'draft' },
    }

    it('generates valid YAML frontmatter', () => {
      const result = generateFrontmatter(template, { title: 'My Title', tags: ['tag1', 'tag2'] })
      expect(result.yaml).toContain('---')
      expect(result.yaml).toContain('title: "My Title"')
    })

    it('includes template metadata', () => {
      const result = generateFrontmatter(template, { title: 'Test' })
      expect(result.yaml).toContain('status: "draft"') // from defaultData
    })

    it('handles array fields', () => {
      const result = generateFrontmatter(template, { title: 'Test', tags: ['one', 'two'] })
      expect(result.yaml).toContain('tags: "one, two"')
    })

    it('replaces placeholders in content', () => {
      const result = generateFrontmatter(template, { title: 'Hello World' })
      expect(result.content).toContain('# Hello World')
    })

    it('replaces date placeholder', () => {
      const result = generateFrontmatter(template, { title: 'Test' })
      // Should contain a date in YYYY-MM-DD format
      expect(result.content).toMatch(/Date: \d{4}-\d{2}-\d{2}/)
    })

    it('escapes special characters in YAML', () => {
      const result = generateFrontmatter(template, { title: 'Test: with colon' })
      expect(result.yaml).toContain('title: "Test: with colon"')
    })
  })
})
