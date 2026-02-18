/**
 * Supernote Strand Detection Tests
 * @module tests/unit/supernotes/strandDetection
 *
 * Tests for detecting and validating supernote strands via the strand detection system.
 */

import { describe, it, expect } from 'vitest'
import { 
  validateStrandSchema, 
  isSupernote, 
  isSupernoteByPath,
  validateSupernoteRequirements,
  filterBySupernoteStatus,
  getSupernoteDisplayInfo,
  detectStrandTypeWithSupernote,
  type StrandValidationResult,
  type SupernoteFilterMode,
} from '@/lib/strand/detection'

describe('Supernote Strand Detection', () => {
  describe('validateStrandSchema with supernote type', () => {
    it('should validate a valid supernote schema', () => {
      const validSchema = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        slug: 'my-supernote',
        title: 'My Supernote',
        version: '1.0.0',
        strandType: 'supernote',
        contentType: 'note',
        primarySupertag: 'task',
      }

      const result = validateStrandSchema(validSchema, 'supernote')
      
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should require primarySupertag or supertags array for supernotes', () => {
      const schemaWithoutSupertag = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        slug: 'my-supernote',
        title: 'My Supernote',
        version: '1.0.0',
        strandType: 'supernote',
        contentType: 'note',
        // Missing primarySupertag and supertags
      }

      const result = validateStrandSchema(schemaWithoutSupertag, 'supernote')
      
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.toLowerCase().includes('supertag'))).toBe(true)
    })

    it('should accept supertags array as alternative to primarySupertag', () => {
      const schemaWithSupertags = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        slug: 'my-supernote',
        title: 'My Supernote',
        version: '1.0.0',
        strandType: 'supernote',
        contentType: 'note',
        supertags: ['task', 'idea'],
      }

      const result = validateStrandSchema(schemaWithSupertags, 'supernote')
      
      expect(result.valid).toBe(true)
      expect(result.metadata?.primarySupertag).toBe('task')
      expect(result.metadata?.additionalSupertags).toEqual(['idea'])
    })

    it('should include primarySupertag in metadata when valid', () => {
      const validSchema = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        slug: 'task-supernote',
        title: 'Task Supernote',
        version: '1.0.0',
        strandType: 'supernote',
        contentType: 'note',
        primarySupertag: 'task',
        supernoteCardSize: '3x5',
      }

      const result = validateStrandSchema(validSchema, 'supernote')
      
      expect(result.valid).toBe(true)
      expect(result.metadata?.primarySupertag).toBe('task')
      expect(result.metadata?.supernoteCardSize).toBe('3x5')
    })

    it('should warn for invalid card size', () => {
      const schemaWithBadSize = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        slug: 'my-supernote',
        title: 'My Supernote',
        version: '1.0.0',
        strandType: 'supernote',
        contentType: 'note',
        primarySupertag: 'task',
        supernoteCardSize: 'invalid-size',
      }

      const result = validateStrandSchema(schemaWithBadSize, 'supernote')
      
      expect(result.warnings.some(w => w.toLowerCase().includes('cardsize'))).toBe(true)
    })

    it('should warn for invalid supernote style', () => {
      const schemaWithBadStyle = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        slug: 'my-supernote',
        title: 'My Supernote',
        version: '1.0.0',
        strandType: 'supernote',
        contentType: 'note',
        primarySupertag: 'task',
        supernoteStyle: 'invalid-style',
      }

      const result = validateStrandSchema(schemaWithBadStyle, 'supernote')
      
      expect(result.warnings.some(w => w.toLowerCase().includes('style'))).toBe(true)
    })

    it('should set strandType and isSupernote in metadata', () => {
      const schema = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        slug: 'my-supernote',
        title: 'My Supernote',
        version: '1.0.0',
        strandType: 'supernote',
        contentType: 'note',
        primarySupertag: 'idea',
      }

      const result = validateStrandSchema(schema, 'supernote')
      
      expect(result.metadata?.strandType).toBe('supernote')
      expect(result.metadata?.isSupernote).toBe(true)
    })
  })

  describe('Required Fields for All Strands', () => {
    it('should still require standard fields for supernotes', () => {
      const incompleteSchema = {
        // Missing id, slug, title, version, contentType
        strandType: 'supernote',
        primarySupertag: 'task',
      }

      const result = validateStrandSchema(incompleteSchema, 'supernote')
      
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('should validate UUID format for id', () => {
      const schemaWithInvalidId = {
        id: 'not-a-uuid',
        slug: 'my-supernote',
        title: 'My Supernote',
        version: '1.0.0',
        contentType: 'note',
        strandType: 'supernote',
        primarySupertag: 'task',
      }

      const result = validateStrandSchema(schemaWithInvalidId, 'supernote')
      
      expect(result.warnings.some(w => 
        w.toLowerCase().includes('uuid') || w.toLowerCase().includes('id')
      )).toBe(true)
    })

    it('should validate slug format', () => {
      const schemaWithInvalidSlug = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        slug: 'Invalid Slug With Spaces',
        title: 'My Supernote',
        version: '1.0.0',
        contentType: 'note',
        strandType: 'supernote',
        primarySupertag: 'task',
      }

      const result = validateStrandSchema(schemaWithInvalidSlug, 'supernote')
      
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.toLowerCase().includes('slug'))).toBe(true)
    })
  })

  describe('Supernote-specific Metadata', () => {
    it('should preserve supernote style in metadata', () => {
      const schema = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        slug: 'my-idea',
        title: 'My Idea',
        version: '1.0.0',
        strandType: 'supernote',
        contentType: 'note',
        primarySupertag: 'idea',
        supernoteStyle: 'minimal',
      }

      const result = validateStrandSchema(schema, 'supernote')
      
      expect(result.metadata?.supernoteStyle).toBe('minimal')
    })

    it('should include cardSize in metadata', () => {
      const schema = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        slug: 'my-task',
        title: 'My Task',
        version: '1.0.0',
        strandType: 'supernote',
        contentType: 'note',
        primarySupertag: 'task',
        cardSize: '4x6',
      }

      const result = validateStrandSchema(schema, 'supernote')
      
      expect(result.metadata?.supernoteCardSize).toBe('4x6')
    })

    it('should preserve tags in metadata', () => {
      const schema = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        slug: 'tagged-note',
        title: 'Tagged Note',
        version: '1.0.0',
        strandType: 'supernote',
        contentType: 'note',
        primarySupertag: 'task',
        tags: ['urgent', 'work', 'meeting'],
      }

      const result = validateStrandSchema(schema, 'supernote')
      
      expect(result.metadata?.tags).toEqual(['urgent', 'work', 'meeting'])
    })

    it('should include parentSupernoteId when provided', () => {
      const schema = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        slug: 'child-note',
        title: 'Child Note',
        version: '1.0.0',
        strandType: 'supernote',
        contentType: 'note',
        primarySupertag: 'task',
        parentSupernoteId: 'parent-uuid-123',
      }

      const result = validateStrandSchema(schema, 'supernote')
      
      expect(result.metadata?.parentSupernoteId).toBe('parent-uuid-123')
    })

    it('should include color override when provided', () => {
      const schema = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        slug: 'colored-note',
        title: 'Colored Note',
        version: '1.0.0',
        strandType: 'supernote',
        contentType: 'note',
        primarySupertag: 'task',
        colorOverride: '#ff5733',
      }

      const result = validateStrandSchema(schema, 'supernote')
      
      expect(result.metadata?.supernoteColorOverride).toBe('#ff5733')
    })
  })

  describe('Comparison with Other Strand Types', () => {
    it('should handle file strands differently', () => {
      const fileSchema = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        slug: 'regular-file',
        title: 'Regular File',
        version: '1.0.0',
        strandType: 'file',
        contentType: 'lesson',
      }

      const result = validateStrandSchema(fileSchema, 'file')
      
      expect(result.valid).toBe(true)
      expect(result.metadata?.strandType).toBe('file')
      // File strands don't require primarySupertag
      expect(result.errors).toHaveLength(0)
    })

    it('should handle folder strands differently', () => {
      const folderSchema = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        slug: 'folder-strand',
        title: 'Folder Strand',
        version: '1.0.0',
        strandType: 'folder',
        contentType: 'collection',
        entryFile: 'index.md',
      }

      const result = validateStrandSchema(folderSchema, 'folder')
      
      expect(result.valid).toBe(true)
      expect(result.metadata?.strandType).toBe('folder')
    })
  })
})

describe('isSupernote Detection', () => {
  it('should detect isSupernote: true', () => {
    const metadata = { isSupernote: true }
    expect(isSupernote(metadata)).toBe(true)
  })

  it('should detect strandType: supernote', () => {
    const metadata = { strandType: 'supernote' }
    expect(isSupernote(metadata)).toBe(true)
  })

  it('should detect nested supernote object', () => {
    const metadata = { supernote: { isSupernote: true } }
    expect(isSupernote(metadata)).toBe(true)
  })

  it('should return false for regular strands', () => {
    const metadata = { strandType: 'file', title: 'Regular' }
    expect(isSupernote(metadata)).toBe(false)
  })

  it('should return false for null/undefined', () => {
    expect(isSupernote(null as any)).toBe(false)
    expect(isSupernote(undefined as any)).toBe(false)
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

  it('should return false for regular paths', () => {
    expect(isSupernoteByPath('weaves/ideas/regular.md')).toBe(false)
    expect(isSupernoteByPath('weaves/lesson.md')).toBe(false)
  })

  it('should handle empty/null paths', () => {
    expect(isSupernoteByPath('')).toBe(false)
  })
})

describe('validateSupernoteRequirements', () => {
  it('should pass for valid supernote with primarySupertag', () => {
    const metadata = {
      isSupernote: true,
      primarySupertag: 'task',
    }
    
    const result = validateSupernoteRequirements(metadata)
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('should pass for valid supernote with supertags array', () => {
    const metadata = {
      strandType: 'supernote',
      supertags: ['task', 'idea'],
    }
    
    const result = validateSupernoteRequirements(metadata)
    expect(result.valid).toBe(true)
  })

  it('should fail when supernote lacks any supertag', () => {
    const metadata = {
      isSupernote: true,
      // No primarySupertag or supertags
    }
    
    const result = validateSupernoteRequirements(metadata)
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.toLowerCase().includes('supertag'))).toBe(true)
  })

  it('should skip validation for non-supernotes', () => {
    const metadata = {
      strandType: 'file',
      // No supertag required
    }
    
    const result = validateSupernoteRequirements(metadata)
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })
})

describe('filterBySupernoteStatus', () => {
  const strands = [
    { id: '1', metadata: { isSupernote: true, title: 'Supernote 1' } },
    { id: '2', metadata: { strandType: 'file', title: 'Regular 1' } },
    { id: '3', metadata: { strandType: 'supernote', title: 'Supernote 2' } },
    { id: '4', metadata: { strandType: 'folder', title: 'Folder Strand' } },
  ]

  it('should return all strands when mode is "all"', () => {
    const result = filterBySupernoteStatus(strands, 'all')
    expect(result).toHaveLength(4)
  })

  it('should return only supernotes when mode is "supernotes"', () => {
    const result = filterBySupernoteStatus(strands, 'supernotes')
    expect(result).toHaveLength(2)
    expect(result.every(s => isSupernote(s.metadata))).toBe(true)
  })

  it('should return only regular strands when mode is "regular"', () => {
    const result = filterBySupernoteStatus(strands, 'regular')
    expect(result).toHaveLength(2)
    expect(result.every(s => !isSupernote(s.metadata))).toBe(true)
  })
})

describe('getSupernoteDisplayInfo', () => {
  it('should return null for non-supernotes', () => {
    const metadata = { strandType: 'file' }
    expect(getSupernoteDisplayInfo(metadata)).toBeNull()
  })

  it('should return display info for supernotes', () => {
    const metadata = {
      isSupernote: true,
      primarySupertag: 'task',
    }
    
    const info = getSupernoteDisplayInfo(metadata)
    expect(info).not.toBeNull()
    expect(info?.isSupernote).toBe(true)
    expect(info?.badgeLabel).toBe('Supernote')
    expect(info?.primarySupertag).toBe('task')
    expect(info?.icon).toBe('sticky-note')
  })

  it('should use color override when provided', () => {
    const metadata = {
      strandType: 'supernote',
      primarySupertag: 'idea',
      supernoteColorOverride: '#ff0000',
    }
    
    const info = getSupernoteDisplayInfo(metadata)
    expect(info?.badgeColor).toBe('#ff0000')
  })

  it('should use default amber color when no override', () => {
    const metadata = {
      strandType: 'supernote',
      primarySupertag: 'task',
    }
    
    const info = getSupernoteDisplayInfo(metadata)
    expect(info?.badgeColor).toBe('#f59e0b')
  })

  it('should fallback to supertags array', () => {
    const metadata = {
      strandType: 'supernote',
      supertags: ['idea', 'project'],
    }
    
    const info = getSupernoteDisplayInfo(metadata)
    expect(info?.primarySupertag).toBe('idea')
  })
})

describe('detectStrandTypeWithSupernote', () => {
  it('should detect supernote from frontmatter', () => {
    const result = detectStrandTypeWithSupernote(
      'weaves/ideas/note.md',
      ['weaves/ideas/note.md'],
      { isSupernote: true, primarySupertag: 'idea' }
    )
    
    expect(result.isStrand).toBe(true)
    expect(result.strandType).toBe('supernote')
  })

  it('should detect supernote from path convention', () => {
    const result = detectStrandTypeWithSupernote(
      'weaves/.supernotes/task.md',
      ['weaves/.supernotes/task.md']
    )
    
    expect(result.isStrand).toBe(true)
    expect(result.strandType).toBe('supernote')
  })

  it('should return file strand for regular markdown', () => {
    const result = detectStrandTypeWithSupernote(
      'weaves/lessons/intro.md',
      ['weaves/lessons/intro.md'],
      { title: 'Intro Lesson' }
    )
    
    expect(result.isStrand).toBe(true)
    expect(result.strandType).toBe('file')
  })
})
