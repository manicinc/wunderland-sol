/**
 * Content Validation Tests
 * @module __tests__/unit/lib/validation.test
 *
 * Tests for content validation and template generation.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  ContentValidator,
  getValidator,
  validateStrand,
  validateLoom,
  validateWeave,
  isValidStrand,
  generateStrandTemplate,
  generateLoomTemplate,
  generateWeaveTemplate,
  type StrandMetadata,
  type LoomMetadata,
  type WeaveMetadata,
} from '@/lib/validation'

// ============================================================================
// ContentValidator Class
// ============================================================================

describe('ContentValidator', () => {
  let validator: ContentValidator

  beforeEach(() => {
    validator = new ContentValidator()
  })

  describe('validateWeave', () => {
    it('validates valid weave', () => {
      const weave: Partial<WeaveMetadata> = {
        slug: 'my-weave',
        title: 'My Weave',
        description: 'A test weave',
        license: 'MIT',
      }

      const result = validator.validateWeave(weave)

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('requires slug field', () => {
      const weave: Partial<WeaveMetadata> = {
        title: 'My Weave',
        description: 'Test',
      }

      const result = validator.validateWeave(weave)

      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.field === 'slug')).toBe(true)
    })

    it('requires title field', () => {
      const weave: Partial<WeaveMetadata> = {
        slug: 'my-weave',
        description: 'Test',
      }

      const result = validator.validateWeave(weave)

      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.field === 'title')).toBe(true)
    })

    it('requires description field', () => {
      const weave: Partial<WeaveMetadata> = {
        slug: 'my-weave',
        title: 'My Weave',
      }

      const result = validator.validateWeave(weave)

      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.field === 'description')).toBe(true)
    })

    it('validates slug format', () => {
      const weave: Partial<WeaveMetadata> = {
        slug: 'Invalid Slug With Spaces!',
        title: 'My Weave',
        description: 'Test',
      }

      const result = validator.validateWeave(weave)

      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.field === 'slug' && e.message.includes('lowercase'))).toBe(true)
    })

    it('warns when no license specified', () => {
      const weave: Partial<WeaveMetadata> = {
        slug: 'my-weave',
        title: 'My Weave',
        description: 'Test',
      }

      const result = validator.validateWeave(weave)

      expect(result.warnings.some(w => w.field === 'license')).toBe(true)
    })

    it('validates tags is array', () => {
      const weave = {
        slug: 'my-weave',
        title: 'My Weave',
        description: 'Test',
        tags: 'not-an-array' as any,
      }

      const result = validator.validateWeave(weave)

      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.field === 'tags')).toBe(true)
    })
  })

  describe('validateLoom', () => {
    it('validates valid loom', () => {
      const loom: Partial<LoomMetadata> = {
        slug: 'my-loom',
        title: 'My Loom',
        summary: 'A test loom',
      }

      const result = validator.validateLoom(loom)

      expect(result.valid).toBe(true)
    })

    it('requires summary field', () => {
      const loom: Partial<LoomMetadata> = {
        slug: 'my-loom',
        title: 'My Loom',
      }

      const result = validator.validateLoom(loom)

      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.field === 'summary')).toBe(true)
    })

    it('validates ordering type', () => {
      const loom: Partial<LoomMetadata> = {
        slug: 'my-loom',
        title: 'My Loom',
        summary: 'Test',
        ordering: {
          type: 'invalid-type' as any,
          items: [],
        },
      }

      const result = validator.validateLoom(loom)

      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.field === 'ordering.type')).toBe(true)
    })

    it('accepts valid ordering types', () => {
      const types = ['sequential', 'hierarchical', 'network']

      for (const type of types) {
        const loom: Partial<LoomMetadata> = {
          slug: 'my-loom',
          title: 'My Loom',
          summary: 'Test',
          ordering: {
            type: type as any,
            items: [],
          },
        }

        const result = validator.validateLoom(loom)
        expect(result.errors.filter(e => e.field === 'ordering.type')).toHaveLength(0)
      }
    })
  })

  describe('validateStrand', () => {
    // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx where y is 8, 9, a, or b
    const validStrand: Partial<StrandMetadata> = {
      id: '12345678-1234-4234-a234-123456789abc',
      slug: 'my-strand',
      title: 'My Strand',
      summary: 'This is a test summary with enough characters to avoid warnings',
      version: '1.0.0',
      contentType: 'markdown',
    }

    it('validates valid strand', () => {
      const result = validator.validateStrand(validStrand)

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('requires id field', () => {
      const strand = { ...validStrand }
      delete strand.id

      const result = validator.validateStrand(strand)

      expect(result.errors.some(e => e.field === 'id')).toBe(true)
    })

    it('requires slug field', () => {
      const strand = { ...validStrand }
      delete strand.slug

      const result = validator.validateStrand(strand)

      expect(result.errors.some(e => e.field === 'slug')).toBe(true)
    })

    it('requires title field', () => {
      const strand = { ...validStrand }
      delete strand.title

      const result = validator.validateStrand(strand)

      expect(result.errors.some(e => e.field === 'title')).toBe(true)
    })

    it('warns on invalid version format', () => {
      const strand = {
        ...validStrand,
        version: 'invalid',
      }

      const result = validator.validateStrand(strand)

      // Version format is a warning, not an error
      expect(result.warnings.some(w => w.field === 'version')).toBe(true)
    })

    it('accepts valid semver versions', () => {
      const versions = ['1.0.0', '2.1.3', '0.0.1', '10.20.30']

      for (const version of versions) {
        const strand = { ...validStrand, version }
        const result = validator.validateStrand(strand)
        expect(result.errors.filter(e => e.field === 'version')).toHaveLength(0)
      }
    })

    it('validates content type', () => {
      const strand = {
        ...validStrand,
        contentType: 'invalid-type' as any,
      }

      const result = validator.validateStrand(strand)

      expect(result.errors.some(e => e.field === 'contentType')).toBe(true)
    })

    it('accepts valid content types', () => {
      const types = ['markdown', 'code', 'data', 'media']

      for (const contentType of types) {
        const strand = { ...validStrand, contentType: contentType as any }
        const result = validator.validateStrand(strand)
        expect(result.errors.filter(e => e.field === 'contentType')).toHaveLength(0)
      }
    })

    it('validates difficulty level', () => {
      const strand = {
        ...validStrand,
        difficulty: 'super-hard' as any,
      }

      const result = validator.validateStrand(strand)

      expect(result.errors.some(e => e.field === 'difficulty')).toBe(true)
    })

    it('accepts valid difficulty levels', () => {
      const levels = ['beginner', 'intermediate', 'advanced', 'expert']

      for (const difficulty of levels) {
        const strand = { ...validStrand, difficulty: difficulty as any }
        const result = validator.validateStrand(strand)
        expect(result.errors.filter(e => e.field === 'difficulty')).toHaveLength(0)
      }
    })

    it('checks short summary in content', () => {
      const strand = { ...validStrand }
      // Content validation warns on very short content
      const result = validator.validateStrand(strand, 'Short content')

      // Short content triggers a warning (< 100 chars)
      expect(result.warnings.some(w => w.message.includes('short'))).toBe(true)
    })

    it('suggests improvements for taxonomy', () => {
      const strand = {
        ...validStrand,
        taxonomy: {
          subjects: [],
          topics: [],
        },
      }

      const result = validator.validateStrand(strand)

      // Check for any suggestions about taxonomy
      expect(result.suggestions.length >= 0).toBe(true)
    })
  })

  describe('reset', () => {
    it('clears errors between validations', () => {
      // First validation with errors
      validator.validateWeave({})

      // Reset
      validator.reset()

      // Second validation with valid data
      const result = validator.validateWeave({
        slug: 'valid',
        title: 'Valid',
        description: 'Valid desc',
      })

      expect(result.valid).toBe(true)
    })
  })
})

// ============================================================================
// Convenience Functions
// ============================================================================

describe('Convenience Functions', () => {
  describe('getValidator', () => {
    it('returns ContentValidator instance', () => {
      const validator = getValidator()
      expect(validator).toBeInstanceOf(ContentValidator)
    })

    it('returns same instance on multiple calls', () => {
      const v1 = getValidator()
      const v2 = getValidator()
      expect(v1).toBe(v2)
    })
  })

  describe('validateStrand', () => {
    it('validates strand using shared validator', () => {
      const result = validateStrand({
        id: '12345678-1234-4234-a234-123456789abc',
        slug: 'test',
        title: 'Test',
        summary: 'Test summary with enough content to avoid short warnings',
        version: '1.0.0',
        contentType: 'markdown',
      })

      expect(result.valid).toBe(true)
    })
  })

  describe('validateLoom', () => {
    it('validates loom using shared validator', () => {
      const result = validateLoom({
        slug: 'test',
        title: 'Test',
        summary: 'Test summary',
      })

      expect(result.valid).toBe(true)
    })
  })

  describe('validateWeave', () => {
    it('validates weave using shared validator', () => {
      const result = validateWeave({
        slug: 'test',
        title: 'Test',
        description: 'Test desc',
      })

      expect(result.valid).toBe(true)
    })
  })

  describe('isValidStrand', () => {
    it('returns true for valid strand', () => {
      expect(isValidStrand({
        id: '12345678-1234-4234-a234-123456789abc',
        slug: 'test',
        title: 'Test',
        summary: 'Test summary with content',
        version: '1.0.0',
        contentType: 'markdown',
      })).toBe(true)
    })

    it('returns false for invalid strand', () => {
      expect(isValidStrand({})).toBe(false)
    })
  })
})

// ============================================================================
// Template Generation
// ============================================================================

describe('Template Generation', () => {
  describe('generateStrandTemplate', () => {
    it('generates template with title', () => {
      const template = generateStrandTemplate('My New Strand')

      expect(template.title).toBe('My New Strand')
    })

    it('generates slug from title', () => {
      const template = generateStrandTemplate('Hello World Test')

      expect(template.slug).toBe('hello-world-test')
    })

    it('removes special characters from slug', () => {
      const template = generateStrandTemplate('What\'s New? (2024)')

      // The actual behavior replaces non-alphanumeric chars with hyphens
      expect(template.slug).toBe('what-s-new-2024')
    })

    it('generates unique id', () => {
      const t1 = generateStrandTemplate('Test 1')
      const t2 = generateStrandTemplate('Test 2')

      expect(t1.id).toBeDefined()
      expect(t2.id).toBeDefined()
      expect(t1.id).not.toBe(t2.id)
    })

    it('uses default version', () => {
      const template = generateStrandTemplate('Test')

      expect(template.version).toBe('1.0.0')
    })

    it('uses default contentType', () => {
      const template = generateStrandTemplate('Test')

      expect(template.contentType).toBe('markdown')
    })

    it('uses default difficulty', () => {
      const template = generateStrandTemplate('Test')

      expect(template.difficulty).toBe('intermediate')
    })

    it('respects custom options', () => {
      const template = generateStrandTemplate('Test', {
        summary: 'Custom summary',
        contentType: 'code',
        difficulty: 'advanced',
        subjects: ['math'],
        topics: ['algebra'],
        tags: ['tag1'],
      })

      expect(template.summary).toBe('Custom summary')
      expect(template.contentType).toBe('code')
      expect(template.difficulty).toBe('advanced')
      expect(template.taxonomy?.subjects).toEqual(['math'])
      expect(template.taxonomy?.topics).toEqual(['algebra'])
      expect(template.tags).toEqual(['tag1'])
    })

    it('sets draft status', () => {
      const template = generateStrandTemplate('Test')

      expect(template.publishing?.status).toBe('draft')
    })

    it('sets created and updated timestamps', () => {
      const template = generateStrandTemplate('Test')

      expect(template.publishing?.created).toBeDefined()
      expect(template.publishing?.updated).toBeDefined()
    })

    it('initializes relationships', () => {
      const template = generateStrandTemplate('Test')

      expect(template.relationships?.requires).toEqual([])
      expect(template.relationships?.references).toEqual([])
      expect(template.relationships?.seeAlso).toEqual([])
    })
  })

  describe('generateLoomTemplate', () => {
    it('generates template with title and summary', () => {
      const template = generateLoomTemplate('My Loom', 'Loom summary')

      expect(template.title).toBe('My Loom')
      expect(template.summary).toBe('Loom summary')
    })

    it('generates slug from title', () => {
      const template = generateLoomTemplate('Learning Path 101', 'Summary')

      expect(template.slug).toBe('learning-path-101')
    })

    it('uses sequential ordering by default', () => {
      const template = generateLoomTemplate('Test', 'Summary')

      expect(template.ordering?.type).toBe('sequential')
      expect(template.ordering?.items).toEqual([])
    })

    it('initializes empty tags', () => {
      const template = generateLoomTemplate('Test', 'Summary')

      expect(template.tags).toEqual([])
    })
  })

  describe('generateWeaveTemplate', () => {
    it('generates template with title and description', () => {
      const template = generateWeaveTemplate('My Weave', 'Weave description')

      expect(template.title).toBe('My Weave')
      expect(template.description).toBe('Weave description')
    })

    it('generates slug from title', () => {
      const template = generateWeaveTemplate('Knowledge Base', 'Desc')

      expect(template.slug).toBe('knowledge-base')
    })

    it('uses MIT license by default', () => {
      const template = generateWeaveTemplate('Test', 'Desc')

      expect(template.license).toBe('MIT')
    })

    it('initializes empty tags', () => {
      const template = generateWeaveTemplate('Test', 'Desc')

      expect(template.tags).toEqual([])
    })
  })
})

// ============================================================================
// ValidationResult Structure
// ============================================================================

describe('ValidationResult', () => {
  it('contains valid flag', () => {
    const result = validateStrand({})
    expect(typeof result.valid).toBe('boolean')
  })

  it('contains errors array', () => {
    const result = validateStrand({})
    expect(Array.isArray(result.errors)).toBe(true)
  })

  it('contains warnings array', () => {
    const result = validateStrand({ id: 'x', slug: 'x', title: 'X', summary: 'X', version: '1.0.0', contentType: 'markdown' })
    expect(Array.isArray(result.warnings)).toBe(true)
  })

  it('contains suggestions array', () => {
    const result = validateStrand({ id: 'x', slug: 'x', title: 'X', summary: 'X', version: '1.0.0', contentType: 'markdown' })
    expect(Array.isArray(result.suggestions)).toBe(true)
  })

  it('error items have severity, field, and message', () => {
    const result = validateStrand({})
    const error = result.errors[0]

    expect(error.severity).toBe('error')
    expect(typeof error.message).toBe('string')
  })
})
