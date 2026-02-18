/**
 * Supernotes System Tests
 * @module tests/unit/supernotes/supernotes
 *
 * Tests for supernote types, validation, and card size presets.
 */

import { describe, it, expect } from 'vitest'
import {
  CARD_SIZE_PRESETS,
  DEFAULT_BADGE_CONFIG,
  SUPERNOTE_SIZE_CONSTRAINTS,
  getCardSizeDimensions,
  getCardSizeOptions,
  validateSupernoteSchema,
  validateCreateSupernoteInput,
  isSupernoteSchema,
  isSupernoteFromFrontmatter,
  isSupernoteByPath,
  extractSupernoteSchema,
  generateSupernoteFrontmatter,
  type SupernoteCardSize,
  type SupernoteSchema,
  type CreateSupernoteInput,
  type SupernoteShapeProps,
} from '@/lib/supernotes'

describe('Supernotes System', () => {
  describe('Card Size Presets (CARD_SIZE_PRESETS)', () => {
    it('should have all required card size presets', () => {
      const expectedSizes: Exclude<SupernoteCardSize, 'custom'>[] = [
        '3x5', '4x6', '5x7', 'a7', 'square', 'compact'
      ]
      
      for (const size of expectedSizes) {
        expect(CARD_SIZE_PRESETS).toHaveProperty(size)
      }
    })

    it('should have valid dimensions for each size', () => {
      for (const [size, dimensions] of Object.entries(CARD_SIZE_PRESETS)) {
        expect(dimensions).toHaveProperty('width')
        expect(dimensions).toHaveProperty('height')
        expect(dimensions).toHaveProperty('aspectRatio')
        expect(dimensions).toHaveProperty('label')
        expect(dimensions.width).toBeGreaterThan(0)
        expect(dimensions.height).toBeGreaterThan(0)
        expect(dimensions.aspectRatio).toBeGreaterThan(0)
      }
    })

    it('should have 3x5 as smallest standard index card', () => {
      const dims3x5 = CARD_SIZE_PRESETS['3x5']
      expect(dims3x5.width).toBe(320)
      expect(dims3x5.height).toBe(200)
      expect(dims3x5.label).toContain('Index Card')
    })

    it('should have increasing dimensions from 3x5 to 5x7', () => {
      const dims3x5 = CARD_SIZE_PRESETS['3x5']
      const dims4x6 = CARD_SIZE_PRESETS['4x6']
      const dims5x7 = CARD_SIZE_PRESETS['5x7']

      expect(dims4x6.width).toBeGreaterThan(dims3x5.width)
      expect(dims5x7.width).toBeGreaterThan(dims4x6.width)
      expect(dims4x6.height).toBeGreaterThan(dims3x5.height)
      expect(dims5x7.height).toBeGreaterThan(dims4x6.height)
    })

    it('should have square dimensions for square preset', () => {
      const squareDims = CARD_SIZE_PRESETS['square']
      expect(squareDims.width).toBe(squareDims.height)
      expect(squareDims.aspectRatio).toBe(1)
    })

    it('compact should be smaller than 3x5', () => {
      const compactDims = CARD_SIZE_PRESETS['compact']
      const dims3x5 = CARD_SIZE_PRESETS['3x5']
      expect(compactDims.width).toBeLessThan(dims3x5.width)
      expect(compactDims.height).toBeLessThan(dims3x5.height)
    })
  })

  describe('Default Badge Configuration', () => {
    it('should have showBadge enabled by default', () => {
      expect(DEFAULT_BADGE_CONFIG.showBadge).toBe(true)
    })

    it('should have badge position at top-right', () => {
      expect(DEFAULT_BADGE_CONFIG.badgePosition).toBe('top-right')
    })

    it('should show supertag icon by default', () => {
      expect(DEFAULT_BADGE_CONFIG.showSupertagIcon).toBe(true)
    })

    it('should have parent link enabled', () => {
      expect(DEFAULT_BADGE_CONFIG.showParentLink).toBe(true)
    })
  })

  describe('Size Constraints', () => {
    it('should have valid minimum dimensions', () => {
      expect(SUPERNOTE_SIZE_CONSTRAINTS.minWidth).toBeGreaterThan(0)
      expect(SUPERNOTE_SIZE_CONSTRAINTS.minHeight).toBeGreaterThan(0)
    })

    it('should have maximum larger than minimum', () => {
      expect(SUPERNOTE_SIZE_CONSTRAINTS.maxWidth).toBeGreaterThan(SUPERNOTE_SIZE_CONSTRAINTS.minWidth)
      expect(SUPERNOTE_SIZE_CONSTRAINTS.maxHeight).toBeGreaterThan(SUPERNOTE_SIZE_CONSTRAINTS.minHeight)
    })

    it('should have reasonable canvas limits', () => {
      // Minimum should be usable (at least 180x120)
      expect(SUPERNOTE_SIZE_CONSTRAINTS.minWidth).toBeGreaterThanOrEqual(180)
      expect(SUPERNOTE_SIZE_CONSTRAINTS.minHeight).toBeGreaterThanOrEqual(120)
      // Maximum shouldn't exceed reasonable canvas bounds
      expect(SUPERNOTE_SIZE_CONSTRAINTS.maxWidth).toBeLessThanOrEqual(800)
      expect(SUPERNOTE_SIZE_CONSTRAINTS.maxHeight).toBeLessThanOrEqual(600)
    })
  })

  describe('getCardSizeDimensions', () => {
    it('should return dimensions for standard presets', () => {
      const dims = getCardSizeDimensions('3x5')
      expect(dims.width).toBe(320)
      expect(dims.height).toBe(200)
      expect(dims.label).toContain('3×5')
    })

    it('should use custom dimensions when cardSize is custom', () => {
      const customDims = getCardSizeDimensions('custom', { width: 400, height: 300 })
      expect(customDims.width).toBe(400)
      expect(customDims.height).toBe(300)
      expect(customDims.label).toBe('Custom Size')
    })

    it('should fallback to 3x5 for custom without dimensions', () => {
      const dims = getCardSizeDimensions('custom')
      expect(dims.width).toBe(CARD_SIZE_PRESETS['3x5'].width)
      expect(dims.height).toBe(CARD_SIZE_PRESETS['3x5'].height)
    })
  })

  describe('getCardSizeOptions', () => {
    it('should return all available options', () => {
      const options = getCardSizeOptions()
      expect(options.length).toBe(7) // 6 presets + custom
    })

    it('should have value, label, and dimensions for each option', () => {
      const options = getCardSizeOptions()
      for (const option of options) {
        expect(option).toHaveProperty('value')
        expect(option).toHaveProperty('label')
        expect(option).toHaveProperty('dimensions')
      }
    })

    it('should include custom as an option', () => {
      const options = getCardSizeOptions()
      const customOption = options.find(o => o.value === 'custom')
      expect(customOption).toBeDefined()
      expect(customOption?.label).toContain('Custom')
    })
  })
})

describe('Supernote Validation', () => {
  describe('validateSupernoteSchema', () => {
    it('should pass for valid schema with required fields', () => {
      const validSchema: Partial<SupernoteSchema> = {
        isSupernote: true,
        primarySupertag: 'task',
        cardSize: '3x5',
      }
      
      const result = validateSupernoteSchema(validSchema)
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should fail when isSupernote is not true', () => {
      const invalidSchema = {
        isSupernote: false,
        primarySupertag: 'task',
        cardSize: '3x5',
      }
      
      const result = validateSupernoteSchema(invalidSchema as Partial<SupernoteSchema>)
      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.field === 'isSupernote')).toBe(true)
    })

    it('should fail when primarySupertag is missing', () => {
      const schemaWithoutSupertag: Partial<SupernoteSchema> = {
        isSupernote: true,
        cardSize: '3x5',
      }
      
      const result = validateSupernoteSchema(schemaWithoutSupertag)
      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.field === 'primarySupertag')).toBe(true)
    })

    it('should fail when cardSize is missing', () => {
      const schemaWithoutCardSize: Partial<SupernoteSchema> = {
        isSupernote: true,
        primarySupertag: 'idea',
      }
      
      const result = validateSupernoteSchema(schemaWithoutCardSize)
      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.field === 'cardSize')).toBe(true)
    })

    it('should require customDimensions when cardSize is custom', () => {
      const customWithoutDims: Partial<SupernoteSchema> = {
        isSupernote: true,
        primarySupertag: 'task',
        cardSize: 'custom',
      }
      
      const result = validateSupernoteSchema(customWithoutDims)
      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.field === 'customDimensions')).toBe(true)
    })

    it('should validate custom dimensions constraints', () => {
      const invalidDims: Partial<SupernoteSchema> = {
        isSupernote: true,
        primarySupertag: 'task',
        cardSize: 'custom',
        customDimensions: { width: 50, height: 50 }, // Too small
      }
      
      const result = validateSupernoteSchema(invalidDims)
      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.field.includes('customDimensions'))).toBe(true)
    })

    it('should warn when no style is specified', () => {
      const schemaWithoutStyle: Partial<SupernoteSchema> = {
        isSupernote: true,
        primarySupertag: 'task',
        cardSize: '3x5',
      }
      
      const result = validateSupernoteSchema(schemaWithoutStyle)
      expect(result.isValid).toBe(true)
      expect(result.warnings.some(w => w.toLowerCase().includes('style'))).toBe(true)
    })
  })

  describe('validateCreateSupernoteInput', () => {
    it('should pass for valid input', () => {
      const input: Partial<CreateSupernoteInput> = {
        title: 'My Task',
        primarySupertag: 'task',
      }
      
      const result = validateCreateSupernoteInput(input)
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should fail when title is missing', () => {
      const input: Partial<CreateSupernoteInput> = {
        primarySupertag: 'task',
      }
      
      const result = validateCreateSupernoteInput(input)
      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.field === 'title')).toBe(true)
    })

    it('should fail when title is too long', () => {
      const input: Partial<CreateSupernoteInput> = {
        title: 'A'.repeat(250), // Over 200 chars
        primarySupertag: 'task',
      }
      
      const result = validateCreateSupernoteInput(input)
      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.field === 'title')).toBe(true)
    })

    it('should fail when primarySupertag is missing', () => {
      const input: Partial<CreateSupernoteInput> = {
        title: 'My Task',
      }
      
      const result = validateCreateSupernoteInput(input)
      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.field === 'primarySupertag')).toBe(true)
    })

    it('should warn when content is very long', () => {
      const input: Partial<CreateSupernoteInput> = {
        title: 'My Task',
        primarySupertag: 'task',
        content: 'A'.repeat(3000), // Over 2000 chars
      }
      
      const result = validateCreateSupernoteInput(input)
      expect(result.isValid).toBe(true)
      expect(result.warnings.some(w => w.toLowerCase().includes('long'))).toBe(true)
    })
  })
})

describe('Supernote Type Guards', () => {
  describe('isSupernoteSchema', () => {
    it('should return true for valid supernote schema', () => {
      const schema = {
        isSupernote: true,
        primarySupertag: 'task',
        cardSize: '3x5',
      }
      
      expect(isSupernoteSchema(schema)).toBe(true)
    })

    it('should return false for null/undefined', () => {
      expect(isSupernoteSchema(null)).toBe(false)
      expect(isSupernoteSchema(undefined)).toBe(false)
    })

    it('should return false when isSupernote is not true', () => {
      const schema = {
        isSupernote: false,
        primarySupertag: 'task',
      }
      
      expect(isSupernoteSchema(schema)).toBe(false)
    })

    it('should return false when primarySupertag is missing', () => {
      const schema = {
        isSupernote: true,
      }
      
      expect(isSupernoteSchema(schema)).toBe(false)
    })
  })

  describe('isSupernoteFromFrontmatter', () => {
    it('should detect isSupernote: true', () => {
      const frontmatter = { isSupernote: true }
      expect(isSupernoteFromFrontmatter(frontmatter)).toBe(true)
    })

    it('should detect strandType: supernote', () => {
      const frontmatter = { strandType: 'supernote' }
      expect(isSupernoteFromFrontmatter(frontmatter)).toBe(true)
    })

    it('should detect nested supernote object', () => {
      const frontmatter = {
        supernote: { isSupernote: true }
      }
      expect(isSupernoteFromFrontmatter(frontmatter)).toBe(true)
    })

    it('should return false for regular strands', () => {
      const frontmatter = { strandType: 'file', title: 'Regular' }
      expect(isSupernoteFromFrontmatter(frontmatter)).toBe(false)
    })
  })

  describe('isSupernoteByPath', () => {
    it('should detect .supernotes directory', () => {
      expect(isSupernoteByPath('weaves/.supernotes/task.md')).toBe(true)
      expect(isSupernoteByPath('.supernotes/idea.md')).toBe(true)
    })

    it('should detect .supernote.md extension', () => {
      expect(isSupernoteByPath('weaves/ideas/quick-idea.supernote.md')).toBe(true)
    })

    it('should return false for regular markdown files', () => {
      expect(isSupernoteByPath('weaves/ideas/regular.md')).toBe(false)
    })
  })
})

describe('Supernote Schema Extraction', () => {
  describe('extractSupernoteSchema', () => {
    it('should extract from direct isSupernote format', () => {
      const frontmatter = {
        isSupernote: true,
        primarySupertag: 'task',
        cardSize: '4x6',
        supernoteStyle: 'paper',
      }
      
      const schema = extractSupernoteSchema(frontmatter)
      expect(schema).not.toBeNull()
      expect(schema?.isSupernote).toBe(true)
      expect(schema?.primarySupertag).toBe('task')
      expect(schema?.cardSize).toBe('4x6')
      expect(schema?.style).toBe('paper')
    })

    it('should extract from strandType format with supertags array', () => {
      const frontmatter = {
        strandType: 'supernote',
        supertags: ['idea', 'project'],
        cardSize: '3x5',
      }
      
      const schema = extractSupernoteSchema(frontmatter)
      expect(schema).not.toBeNull()
      expect(schema?.primarySupertag).toBe('idea')
      expect(schema?.additionalSupertags).toEqual(['project'])
    })

    it('should return null for invalid supernote format', () => {
      const frontmatter = {
        strandType: 'supernote',
        // Missing supertags
      }
      
      const schema = extractSupernoteSchema(frontmatter)
      expect(schema).toBeNull()
    })

    it('should extract from nested supernote object', () => {
      const frontmatter = {
        supernote: {
          isSupernote: true,
          primarySupertag: 'book',
          cardSize: '5x7',
        }
      }
      
      const schema = extractSupernoteSchema(frontmatter)
      expect(schema).not.toBeNull()
      expect(schema?.primarySupertag).toBe('book')
    })
  })

  describe('generateSupernoteFrontmatter', () => {
    it('should generate valid frontmatter', () => {
      const input: CreateSupernoteInput = {
        title: 'My Task',
        primarySupertag: 'task',
      }
      
      const frontmatter = generateSupernoteFrontmatter(input)
      
      expect(frontmatter.title).toBe('My Task')
      expect(frontmatter.strandType).toBe('supernote')
      expect(frontmatter.isSupernote).toBe(true)
      expect(frontmatter.primarySupertag).toBe('task')
      expect(frontmatter.cardSize).toBe('3x5') // Default
      expect(frontmatter.supernoteStyle).toBe('paper') // Default
      expect(frontmatter.createdAt).toBeDefined()
      expect(frontmatter.updatedAt).toBeDefined()
    })

    it('should respect provided options', () => {
      const input: CreateSupernoteInput = {
        title: 'My Idea',
        primarySupertag: 'idea',
        cardSize: '4x6',
        style: 'minimal',
        tags: ['important', 'work'],
      }
      
      const frontmatter = generateSupernoteFrontmatter(input)
      
      expect(frontmatter.cardSize).toBe('4x6')
      expect(frontmatter.supernoteStyle).toBe('minimal')
      expect(frontmatter.tags).toEqual(['important', 'work'])
    })

    it('should include parentSupernoteId when provided', () => {
      const input: CreateSupernoteInput = {
        title: 'Sub-task',
        primarySupertag: 'task',
        parentSupernoteId: 'parent-123',
      }
      
      const frontmatter = generateSupernoteFrontmatter(input)
      
      expect(frontmatter.parentSupernoteId).toBe('parent-123')
    })
  })
})

describe('Supernote Canvas Integration', () => {
  describe('SupernoteShapeProps interface', () => {
    it('should define required canvas props', () => {
      const shapeProps: SupernoteShapeProps = {
        w: 320,
        h: 200,
        supernoteId: 'canvas-note-1',
        strandPath: 'weaves/notes/idea.md',
        title: 'Test Note',
        contentPreview: 'Preview text...',
        primarySupertag: 'idea',
        supertagSchemaId: 'schema-idea',
        supertagColor: '#f59e0b',
        fieldValues: { status: 'raw' },
        visibleFields: ['status'],
        tags: ['test'],
        style: 'paper',
        cardSize: '3x5',
        isEditing: false,
        isExpanded: false,
        isHighlighted: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      expect(shapeProps.w).toBeGreaterThan(0)
      expect(shapeProps.h).toBeGreaterThan(0)
      expect(shapeProps.supernoteId).toBeDefined()
      expect(shapeProps.primarySupertag).toBeDefined()
      expect(shapeProps.style).toBe('paper')
    })

    it('should support parent supernote reference', () => {
      const shapeProps: Partial<SupernoteShapeProps> = {
        parentSupernote: {
          id: 'parent-123',
          title: 'Parent Note',
          path: 'weaves/parent.md',
        }
      }

      expect(shapeProps.parentSupernote?.id).toBe('parent-123')
    })

    it('should support stats for collaboration', () => {
      const shapeProps: Partial<SupernoteShapeProps> = {
        stats: {
          likes: 5,
          comments: 3,
          contributors: 2,
          views: 100,
        }
      }

      expect(shapeProps.stats?.likes).toBe(5)
    })
  })
})
