/**
 * Validation Module Tests
 * @module __tests__/unit/lib/validation/index.test
 *
 * Tests for ContentValidator class and template generation functions.
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
// ContentValidator - validateWeave
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
      }
      const result = validator.validateWeave(weave)

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('requires slug field', () => {
      const weave: Partial<WeaveMetadata> = {
        title: 'My Weave',
        description: 'A test weave',
      }
      const result = validator.validateWeave(weave)

      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.field === 'slug')).toBe(true)
    })

    it('requires title field', () => {
      const weave: Partial<WeaveMetadata> = {
        slug: 'my-weave',
        description: 'A test weave',
      }
      const result = validator.validateWeave(weave)

      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.field === 'title')).toBe(true)
    })

    it('requires description field', () => {
      const weave: Partial<WeaveMetadata> = {
        slug: 'my-weave',
        title: 'My Weave',
      }
      const result = validator.validateWeave(weave)

      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.field === 'description')).toBe(true)
    })

    it('validates slug format (lowercase alphanumeric with hyphens)', () => {
      const weave: Partial<WeaveMetadata> = {
        slug: 'My_Invalid_Slug!',
        title: 'My Weave',
        description: 'A test weave',
      }
      const result = validator.validateWeave(weave)

      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.field === 'slug')).toBe(true)
    })

    it('accepts valid slug formats', () => {
      const validSlugs = ['my-weave', 'weave123', 'a-b-c-123']

      for (const slug of validSlugs) {
        const result = validator.validateWeave({
          slug,
          title: 'Test',
          description: 'Test',
        })
        expect(result.errors.filter((e) => e.field === 'slug')).toHaveLength(0)
      }
    })

    it('warns when no license is specified', () => {
      const weave: Partial<WeaveMetadata> = {
        slug: 'my-weave',
        title: 'My Weave',
        description: 'A test weave',
      }
      const result = validator.validateWeave(weave)

      expect(result.warnings.some((w) => w.field === 'license')).toBe(true)
    })

    it('no warning when license is specified', () => {
      const weave: Partial<WeaveMetadata> = {
        slug: 'my-weave',
        title: 'My Weave',
        description: 'A test weave',
        license: 'MIT',
      }
      const result = validator.validateWeave(weave)

      expect(result.warnings.filter((w) => w.field === 'license')).toHaveLength(0)
    })

    it('validates tags is array', () => {
      const weave = {
        slug: 'my-weave',
        title: 'My Weave',
        description: 'A test weave',
        tags: 'not-an-array' as unknown as string[],
      }
      const result = validator.validateWeave(weave)

      expect(result.errors.some((e) => e.field === 'tags')).toBe(true)
    })

    it('accepts valid tags array', () => {
      const weave: Partial<WeaveMetadata> = {
        slug: 'my-weave',
        title: 'My Weave',
        description: 'A test weave',
        tags: ['tag1', 'tag2'],
      }
      const result = validator.validateWeave(weave)

      expect(result.errors.filter((e) => e.field === 'tags')).toHaveLength(0)
    })
  })

  // ============================================================================
  // ContentValidator - validateLoom
  // ============================================================================

  describe('validateLoom', () => {
    it('validates valid loom', () => {
      const loom: Partial<LoomMetadata> = {
        slug: 'my-loom',
        title: 'My Loom',
        summary: 'A test loom',
      }
      const result = validator.validateLoom(loom)

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('requires slug field', () => {
      const loom: Partial<LoomMetadata> = {
        title: 'My Loom',
        summary: 'A test loom',
      }
      const result = validator.validateLoom(loom)

      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.field === 'slug')).toBe(true)
    })

    it('requires title field', () => {
      const loom: Partial<LoomMetadata> = {
        slug: 'my-loom',
        summary: 'A test loom',
      }
      const result = validator.validateLoom(loom)

      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.field === 'title')).toBe(true)
    })

    it('requires summary field', () => {
      const loom: Partial<LoomMetadata> = {
        slug: 'my-loom',
        title: 'My Loom',
      }
      const result = validator.validateLoom(loom)

      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.field === 'summary')).toBe(true)
    })

    it('validates ordering type', () => {
      const loom: Partial<LoomMetadata> = {
        slug: 'my-loom',
        title: 'My Loom',
        summary: 'A test loom',
        ordering: {
          type: 'invalid' as 'sequential',
          items: [],
        },
      }
      const result = validator.validateLoom(loom)

      expect(result.errors.some((e) => e.field === 'ordering.type')).toBe(true)
    })

    it('accepts valid ordering types', () => {
      const types = ['sequential', 'hierarchical', 'network'] as const

      for (const type of types) {
        const result = validator.validateLoom({
          slug: 'my-loom',
          title: 'My Loom',
          summary: 'A test loom',
          ordering: { type, items: [] },
        })
        expect(result.errors.filter((e) => e.field === 'ordering.type')).toHaveLength(0)
      }
    })

    it('validates ordering items is array', () => {
      const loom = {
        slug: 'my-loom',
        title: 'My Loom',
        summary: 'A test loom',
        ordering: {
          type: 'sequential' as const,
          items: 'not-an-array' as unknown as string[],
        },
      }
      const result = validator.validateLoom(loom)

      expect(result.errors.some((e) => e.field === 'ordering.items')).toBe(true)
    })
  })

  // ============================================================================
  // ContentValidator - validateStrand
  // ============================================================================

  describe('validateStrand', () => {
    const validUUID = '123e4567-e89b-12d3-a456-426614174000'

    it('validates valid strand', () => {
      const strand: Partial<StrandMetadata> = {
        id: validUUID,
        slug: 'my-strand',
        title: 'My Strand',
      }
      const result = validator.validateStrand(strand)

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('requires id field', () => {
      const strand: Partial<StrandMetadata> = {
        slug: 'my-strand',
        title: 'My Strand',
      }
      const result = validator.validateStrand(strand)

      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.field === 'id')).toBe(true)
    })

    it('requires slug field', () => {
      const strand: Partial<StrandMetadata> = {
        id: validUUID,
        title: 'My Strand',
      }
      const result = validator.validateStrand(strand)

      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.field === 'slug')).toBe(true)
    })

    it('requires title field', () => {
      const strand: Partial<StrandMetadata> = {
        id: validUUID,
        slug: 'my-strand',
      }
      const result = validator.validateStrand(strand)

      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.field === 'title')).toBe(true)
    })

    it('validates UUID format', () => {
      const strand: Partial<StrandMetadata> = {
        id: 'not-a-uuid',
        slug: 'my-strand',
        title: 'My Strand',
      }
      const result = validator.validateStrand(strand)

      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.field === 'id')).toBe(true)
    })

    it('validates content type', () => {
      const strand: Partial<StrandMetadata> = {
        id: validUUID,
        slug: 'my-strand',
        title: 'My Strand',
        contentType: 'invalid' as 'markdown',
      }
      const result = validator.validateStrand(strand)

      expect(result.errors.some((e) => e.field === 'contentType')).toBe(true)
    })

    it('accepts valid content types', () => {
      const types = ['markdown', 'code', 'data', 'media'] as const

      for (const contentType of types) {
        const result = validator.validateStrand({
          id: validUUID,
          slug: 'my-strand',
          title: 'My Strand',
          contentType,
        })
        expect(result.errors.filter((e) => e.field === 'contentType')).toHaveLength(0)
      }
    })

    it('validates difficulty level', () => {
      const strand: Partial<StrandMetadata> = {
        id: validUUID,
        slug: 'my-strand',
        title: 'My Strand',
        difficulty: 'invalid' as 'beginner',
      }
      const result = validator.validateStrand(strand)

      expect(result.errors.some((e) => e.field === 'difficulty')).toBe(true)
    })

    it('accepts valid difficulty levels', () => {
      const levels = ['beginner', 'intermediate', 'advanced', 'expert'] as const

      for (const difficulty of levels) {
        const result = validator.validateStrand({
          id: validUUID,
          slug: 'my-strand',
          title: 'My Strand',
          difficulty,
        })
        expect(result.errors.filter((e) => e.field === 'difficulty')).toHaveLength(0)
      }
    })

    it('warns about non-semver version', () => {
      const strand: Partial<StrandMetadata> = {
        id: validUUID,
        slug: 'my-strand',
        title: 'My Strand',
        version: 'v1',
      }
      const result = validator.validateStrand(strand)

      expect(result.warnings.some((w) => w.field === 'version')).toBe(true)
    })

    it('accepts valid semver versions', () => {
      const versions = ['1.0.0', '2.1.3', '0.0.1', '10.20.30']

      for (const version of versions) {
        const result = validator.validateStrand({
          id: validUUID,
          slug: 'my-strand',
          title: 'My Strand',
          version,
        })
        expect(result.warnings.filter((w) => w.field === 'version')).toHaveLength(0)
      }
    })

    it('validates relationships are arrays', () => {
      const strand = {
        id: validUUID,
        slug: 'my-strand',
        title: 'My Strand',
        relationships: {
          requires: 'not-an-array' as unknown as string[],
        },
      }
      const result = validator.validateStrand(strand)

      expect(result.errors.some((e) => e.field === 'relationships.requires')).toBe(true)
    })

    it('suggests adding summary', () => {
      const strand: Partial<StrandMetadata> = {
        id: validUUID,
        slug: 'my-strand',
        title: 'My Strand',
      }
      const result = validator.validateStrand(strand)

      expect(result.suggestions.some((s) => s.field === 'summary')).toBe(true)
    })

    it('suggests adding tags', () => {
      const strand: Partial<StrandMetadata> = {
        id: validUUID,
        slug: 'my-strand',
        title: 'My Strand',
      }
      const result = validator.validateStrand(strand)

      expect(result.suggestions.some((s) => s.field === 'tags')).toBe(true)
    })

    it('warns about TODO comments in content', () => {
      const strand: Partial<StrandMetadata> = {
        id: validUUID,
        slug: 'my-strand',
        title: 'My Strand',
      }
      const content = 'This is some content with a TODO: fix this later'
      const result = validator.validateStrand(strand, content)

      expect(result.warnings.some((w) => w.message.includes('TODO'))).toBe(true)
    })

    it('warns about short content', () => {
      const strand: Partial<StrandMetadata> = {
        id: validUUID,
        slug: 'my-strand',
        title: 'My Strand',
      }
      const content = 'Short content'
      const result = validator.validateStrand(strand, content)

      expect(result.warnings.some((w) => w.message.includes('short'))).toBe(true)
    })
  })

  // ============================================================================
  // ContentValidator - validateStrand ECA fields
  // ============================================================================

  describe('validateStrand ECA fields', () => {
    const validUUID = '123e4567-e89b-12d3-a456-426614174000'
    const baseStrand: Partial<StrandMetadata> = {
      id: validUUID,
      slug: 'my-strand',
      title: 'My Strand',
    }

    it('validates learningDesign objectives', () => {
      const strand = {
        ...baseStrand,
        learningDesign: {
          objectives: 'not-an-array' as unknown as [],
        },
      }
      const result = validator.validateStrand(strand)

      expect(result.errors.some((e) => e.message.includes('objectives must be an array'))).toBe(true)
    })

    it('validates objectives have description', () => {
      const strand = {
        ...baseStrand,
        learningDesign: {
          objectives: [{ bloomsLevel: 'understand' as const }],
        },
      }
      const result = validator.validateStrand(strand as Partial<StrandMetadata>)

      expect(result.errors.some((e) => e.message.includes('missing description'))).toBe(true)
    })

    it('validates blooms level', () => {
      const validLevels = ['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create']

      for (const bloomsLevel of validLevels) {
        const strand = {
          ...baseStrand,
          learningDesign: {
            objectives: [{ description: 'Test', bloomsLevel }],
          },
        }
        const result = validator.validateStrand(strand as Partial<StrandMetadata>)
        expect(result.errors.filter((e) => e.message.includes('bloomsLevel'))).toHaveLength(0)
      }
    })

    it('validates accessibility wcag level', () => {
      const validLevels = ['A', 'AA', 'AAA'] as const

      for (const wcagLevel of validLevels) {
        const strand = {
          ...baseStrand,
          accessibility: { wcagLevel },
        }
        const result = validator.validateStrand(strand)
        expect(result.errors.filter((e) => e.message.includes('wcagLevel'))).toHaveLength(0)
      }
    })

    it('validates reading level range', () => {
      const strand = {
        ...baseStrand,
        accessibility: { readingLevel: 25 },
      }
      const result = validator.validateStrand(strand)

      expect(result.errors.some((e) => e.message.includes('readingLevel'))).toBe(true)
    })

    it('validates time estimates are numbers', () => {
      const strand = {
        ...baseStrand,
        timeEstimates: { reading: 'not-a-number' as unknown as number },
      }
      const result = validator.validateStrand(strand)

      expect(result.errors.some((e) => e.message.includes('timeEstimates.reading'))).toBe(true)
    })
  })

  // ============================================================================
  // ContentValidator - reset and stats
  // ============================================================================

  describe('reset and stats', () => {
    it('resets between validations', () => {
      validator.validateStrand({}) // Generate errors

      const result = validator.validateWeave({
        slug: 'valid-slug',
        title: 'Valid',
        description: 'Valid',
      })

      // Should only have warnings (no license), not errors from previous validation
      expect(result.valid).toBe(true)
    })

    it('provides accurate stats', () => {
      const result = validator.validateStrand({})

      expect(result.stats.errorCount).toBe(result.errors.length)
      expect(result.stats.warningCount).toBe(result.warnings.length)
      expect(result.stats.suggestionCount).toBe(result.suggestions.length)
    })
  })
})

// ============================================================================
// Template Generation Functions
// ============================================================================

describe('generateStrandTemplate', () => {
  it('generates valid strand metadata', () => {
    const template = generateStrandTemplate('My Test Strand')

    expect(template.title).toBe('My Test Strand')
    expect(template.slug).toBe('my-test-strand')
    expect(template.id).toBeDefined()
    expect(template.version).toBe('1.0.0')
    expect(template.contentType).toBe('markdown')
    expect(template.difficulty).toBe('intermediate')
  })

  it('generates valid UUID for id', () => {
    const template = generateStrandTemplate('Test')
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

    expect(template.id).toMatch(uuidRegex)
  })

  it('generates unique IDs', () => {
    const template1 = generateStrandTemplate('Test')
    const template2 = generateStrandTemplate('Test')

    expect(template1.id).not.toBe(template2.id)
  })

  it('converts title to slug correctly', () => {
    const testCases = [
      { title: 'Hello World', expected: 'hello-world' },
      { title: 'Test123', expected: 'test123' },
      { title: 'Multiple   Spaces', expected: 'multiple-spaces' },
      { title: '  Trimmed  ', expected: 'trimmed' },
      { title: 'Special@#$Chars!', expected: 'special-chars' },
    ]

    for (const { title, expected } of testCases) {
      const template = generateStrandTemplate(title)
      expect(template.slug).toBe(expected)
    }
  })

  it('accepts optional fields', () => {
    const template = generateStrandTemplate('Test', {
      summary: 'A test summary',
      contentType: 'code',
      difficulty: 'advanced',
      subjects: ['programming'],
      topics: ['testing'],
      tags: ['test', 'example'],
    })

    expect(template.summary).toBe('A test summary')
    expect(template.contentType).toBe('code')
    expect(template.difficulty).toBe('advanced')
    expect(template.taxonomy?.subjects).toContain('programming')
    expect(template.taxonomy?.topics).toContain('testing')
    expect(template.tags).toContain('test')
    expect(template.tags).toContain('example')
  })

  it('includes publishing metadata', () => {
    const template = generateStrandTemplate('Test')

    expect(template.publishing).toBeDefined()
    expect(template.publishing?.created).toBeDefined()
    expect(template.publishing?.updated).toBeDefined()
    expect(template.publishing?.status).toBe('draft')
  })

  it('includes empty relationships', () => {
    const template = generateStrandTemplate('Test')

    expect(template.relationships).toBeDefined()
    expect(template.relationships?.requires).toEqual([])
    expect(template.relationships?.references).toEqual([])
    expect(template.relationships?.seeAlso).toEqual([])
  })
})

describe('generateLoomTemplate', () => {
  it('generates valid loom metadata', () => {
    const template = generateLoomTemplate('My Loom', 'A test loom summary')

    expect(template.title).toBe('My Loom')
    expect(template.slug).toBe('my-loom')
    expect(template.summary).toBe('A test loom summary')
  })

  it('defaults to sequential ordering', () => {
    const template = generateLoomTemplate('Test', 'Summary')

    expect(template.ordering?.type).toBe('sequential')
    expect(template.ordering?.items).toEqual([])
  })

  it('includes empty tags array', () => {
    const template = generateLoomTemplate('Test', 'Summary')

    expect(template.tags).toEqual([])
  })

  it('converts title to slug correctly', () => {
    const template = generateLoomTemplate('Hello World Loom', 'Summary')

    expect(template.slug).toBe('hello-world-loom')
  })
})

describe('generateWeaveTemplate', () => {
  it('generates valid weave metadata', () => {
    const template = generateWeaveTemplate('My Weave', 'A test weave description')

    expect(template.title).toBe('My Weave')
    expect(template.slug).toBe('my-weave')
    expect(template.description).toBe('A test weave description')
  })

  it('defaults to MIT license', () => {
    const template = generateWeaveTemplate('Test', 'Description')

    expect(template.license).toBe('MIT')
  })

  it('includes empty tags array', () => {
    const template = generateWeaveTemplate('Test', 'Description')

    expect(template.tags).toEqual([])
  })

  it('converts title to slug correctly', () => {
    const template = generateWeaveTemplate('Hello World Weave', 'Description')

    expect(template.slug).toBe('hello-world-weave')
  })
})

// ============================================================================
// Convenience Functions
// ============================================================================

describe('getValidator', () => {
  it('returns a ContentValidator instance', () => {
    const validator = getValidator()

    expect(validator).toBeInstanceOf(ContentValidator)
  })

  it('returns the same instance on multiple calls', () => {
    const validator1 = getValidator()
    const validator2 = getValidator()

    expect(validator1).toBe(validator2)
  })
})

describe('validateStrand (convenience function)', () => {
  it('validates strand metadata', () => {
    const result = validateStrand({
      id: '123e4567-e89b-12d3-a456-426614174000',
      slug: 'test',
      title: 'Test',
    })

    expect(result.valid).toBe(true)
  })

  it('returns errors for invalid strand', () => {
    const result = validateStrand({})

    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
  })
})

describe('validateLoom (convenience function)', () => {
  it('validates loom metadata', () => {
    const result = validateLoom({
      slug: 'test',
      title: 'Test',
      summary: 'Summary',
    })

    expect(result.valid).toBe(true)
  })

  it('returns errors for invalid loom', () => {
    const result = validateLoom({})

    expect(result.valid).toBe(false)
  })
})

describe('validateWeave (convenience function)', () => {
  it('validates weave metadata', () => {
    const result = validateWeave({
      slug: 'test',
      title: 'Test',
      description: 'Description',
    })

    expect(result.valid).toBe(true)
  })

  it('returns errors for invalid weave', () => {
    const result = validateWeave({})

    expect(result.valid).toBe(false)
  })
})

describe('isValidStrand', () => {
  it('returns true for valid strand', () => {
    const valid = isValidStrand({
      id: '123e4567-e89b-12d3-a456-426614174000',
      slug: 'test',
      title: 'Test',
    })

    expect(valid).toBe(true)
  })

  it('returns false for invalid strand', () => {
    const valid = isValidStrand({})

    expect(valid).toBe(false)
  })
})
