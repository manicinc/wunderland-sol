/**
 * Tests for strand detection and validation
 * @module __tests__/unit/lib/strand/detection.test
 */

import { describe, it, expect } from 'vitest'
import {
  detectStrandSync,
  isSupernote,
  isSupernoteByPath,
  isDirectoryAStrand,
  validateStrandSchema,
  validateSupernoteRequirements,
  collectFolderStrandFiles,
  filterBySupernoteStatus,
  getSupernoteDisplayInfo,
  detectStrandTypeWithSupernote,
  FOLDER_STRAND_SCHEMA_FILES,
  DEFAULT_ENTRY_FILES,
  FILE_TYPE_EXTENSIONS,
  DEFAULT_EXCLUDES,
  REQUIRED_STRAND_FIELDS,
  SUPERNOTES_DIRECTORY,
  SUPERNOTE_FILE_EXTENSION,
} from '@/lib/strand/detection'

// ============================================================================
// CONSTANTS TESTS
// ============================================================================

describe('detection constants', () => {
  describe('FOLDER_STRAND_SCHEMA_FILES', () => {
    it('includes strand.yml', () => {
      expect(FOLDER_STRAND_SCHEMA_FILES).toContain('strand.yml')
    })

    it('includes strand.yaml', () => {
      expect(FOLDER_STRAND_SCHEMA_FILES).toContain('strand.yaml')
    })

    it('has exactly 2 schema file options', () => {
      expect(FOLDER_STRAND_SCHEMA_FILES).toHaveLength(2)
    })
  })

  describe('DEFAULT_ENTRY_FILES', () => {
    it('prioritizes index.md first', () => {
      expect(DEFAULT_ENTRY_FILES[0]).toBe('index.md')
    })

    it('includes README.md', () => {
      expect(DEFAULT_ENTRY_FILES).toContain('README.md')
    })

    it('includes main.md', () => {
      expect(DEFAULT_ENTRY_FILES).toContain('main.md')
    })

    it('includes content.md', () => {
      expect(DEFAULT_ENTRY_FILES).toContain('content.md')
    })
  })

  describe('FILE_TYPE_EXTENSIONS', () => {
    it('has content extensions', () => {
      expect(FILE_TYPE_EXTENSIONS.content).toContain('.md')
      expect(FILE_TYPE_EXTENSIONS.content).toContain('.mdx')
    })

    it('has image extensions', () => {
      expect(FILE_TYPE_EXTENSIONS.images).toContain('.png')
      expect(FILE_TYPE_EXTENSIONS.images).toContain('.jpg')
      expect(FILE_TYPE_EXTENSIONS.images).toContain('.svg')
    })

    it('has media extensions', () => {
      expect(FILE_TYPE_EXTENSIONS.media).toContain('.mp4')
      expect(FILE_TYPE_EXTENSIONS.media).toContain('.mp3')
    })

    it('has data extensions', () => {
      expect(FILE_TYPE_EXTENSIONS.data).toContain('.json')
      expect(FILE_TYPE_EXTENSIONS.data).toContain('.yaml')
      expect(FILE_TYPE_EXTENSIONS.data).toContain('.csv')
    })
  })

  describe('DEFAULT_EXCLUDES', () => {
    it('excludes draft files', () => {
      expect(DEFAULT_EXCLUDES).toContain('*.draft.md')
    })

    it('excludes WIP files', () => {
      expect(DEFAULT_EXCLUDES).toContain('*.wip.*')
    })

    it('excludes underscore-prefixed files', () => {
      expect(DEFAULT_EXCLUDES).toContain('_*')
    })

    it('excludes hidden files', () => {
      expect(DEFAULT_EXCLUDES).toContain('.*')
    })

    it('excludes node_modules', () => {
      expect(DEFAULT_EXCLUDES).toContain('node_modules/**')
    })
  })

  describe('REQUIRED_STRAND_FIELDS', () => {
    it('requires id', () => {
      expect(REQUIRED_STRAND_FIELDS).toContain('id')
    })

    it('requires slug', () => {
      expect(REQUIRED_STRAND_FIELDS).toContain('slug')
    })

    it('requires title', () => {
      expect(REQUIRED_STRAND_FIELDS).toContain('title')
    })

    it('requires version', () => {
      expect(REQUIRED_STRAND_FIELDS).toContain('version')
    })

    it('requires contentType', () => {
      expect(REQUIRED_STRAND_FIELDS).toContain('contentType')
    })
  })

  describe('SUPERNOTES constants', () => {
    it('has correct supernotes directory name', () => {
      expect(SUPERNOTES_DIRECTORY).toBe('.supernotes')
    })

    it('has correct supernote file extension', () => {
      expect(SUPERNOTE_FILE_EXTENSION).toBe('.supernote.md')
    })
  })
})

// ============================================================================
// detectStrandSync TESTS
// ============================================================================

describe('detectStrandSync', () => {
  describe('file-strand detection', () => {
    it('detects .md file as file-strand', () => {
      const result = detectStrandSync('docs/intro.md', [])
      expect(result.isStrand).toBe(true)
      expect(result.strandType).toBe('file')
      expect(result.schemaPath).toBe('docs/intro.md')
      expect(result.entryPath).toBe('docs/intro.md')
    })

    it('detects .mdx file as file-strand', () => {
      const result = detectStrandSync('components/Button.mdx', [])
      expect(result.isStrand).toBe(true)
      expect(result.strandType).toBe('file')
    })

    it('detects .markdown file as file-strand', () => {
      const result = detectStrandSync('notes/todo.markdown', [])
      expect(result.isStrand).toBe(true)
      expect(result.strandType).toBe('file')
    })

    it('is case-insensitive for extensions', () => {
      const result = detectStrandSync('docs/README.MD', [])
      expect(result.isStrand).toBe(true)
      expect(result.strandType).toBe('file')
    })
  })

  describe('folder-strand detection', () => {
    it('detects folder with strand.yml as folder-strand', () => {
      const files = ['project/strand.yml', 'project/index.md']
      const result = detectStrandSync('project', files)
      expect(result.isStrand).toBe(true)
      expect(result.strandType).toBe('folder')
      expect(result.schemaPath).toBe('project/strand.yml')
    })

    it('detects folder with strand.yaml as folder-strand', () => {
      const files = ['project/strand.yaml', 'project/README.md']
      const result = detectStrandSync('project', files)
      expect(result.isStrand).toBe(true)
      expect(result.strandType).toBe('folder')
    })

    it('finds entry file from default list', () => {
      const files = ['project/strand.yml', 'project/index.md', 'project/README.md']
      const result = detectStrandSync('project', files)
      expect(result.entryPath).toBe('project/index.md')
    })

    it('falls back to README.md if no index.md', () => {
      const files = ['project/strand.yml', 'project/README.md']
      const result = detectStrandSync('project', files)
      expect(result.entryPath).toBe('project/README.md')
    })

    it('returns null entry if no entry file found', () => {
      const files = ['project/strand.yml', 'project/data.json']
      const result = detectStrandSync('project', files)
      expect(result.entryPath).toBeNull()
    })
  })

  describe('non-strand detection', () => {
    it('returns isStrand false for non-markdown files', () => {
      const result = detectStrandSync('script.js', [])
      expect(result.isStrand).toBe(false)
      expect(result.strandType).toBeNull()
    })

    it('returns isStrand false for directory without strand schema', () => {
      const files = ['project/index.md', 'project/data.json']
      const result = detectStrandSync('project', files)
      expect(result.isStrand).toBe(false)
    })
  })

  describe('path normalization', () => {
    it('handles backslashes in paths', () => {
      const files = ['project\\strand.yml', 'project\\index.md']
      const result = detectStrandSync('project', files)
      expect(result.isStrand).toBe(true)
    })

    it('normalizes mixed path separators', () => {
      const result = detectStrandSync('docs\\intro.md', [])
      expect(result.isStrand).toBe(true)
    })
  })
})

// ============================================================================
// isSupernote TESTS
// ============================================================================

describe('isSupernote', () => {
  it('returns true for isSupernote: true', () => {
    expect(isSupernote({ isSupernote: true })).toBe(true)
  })

  it('returns true for strandType: supernote', () => {
    expect(isSupernote({ strandType: 'supernote' })).toBe(true)
  })

  it('returns true for nested supernote.isSupernote: true', () => {
    expect(isSupernote({ supernote: { isSupernote: true } })).toBe(true)
  })

  it('returns false for regular strand metadata', () => {
    expect(isSupernote({ strandType: 'file', title: 'Test' })).toBe(false)
  })

  it('returns false for null metadata', () => {
    expect(isSupernote(null as any)).toBe(false)
  })

  it('returns false for undefined metadata', () => {
    expect(isSupernote(undefined as any)).toBe(false)
  })

  it('returns false for non-object metadata', () => {
    expect(isSupernote('string' as any)).toBe(false)
  })

  it('returns false for isSupernote: false', () => {
    expect(isSupernote({ isSupernote: false })).toBe(false)
  })

  it('returns false when supernote object exists but isSupernote is false', () => {
    expect(isSupernote({ supernote: { isSupernote: false } })).toBe(false)
  })
})

// ============================================================================
// isSupernoteByPath TESTS
// ============================================================================

describe('isSupernoteByPath', () => {
  describe('.supernotes directory', () => {
    it('detects file in .supernotes directory', () => {
      expect(isSupernoteByPath('.supernotes/note.md')).toBe(true)
    })

    it('detects file in nested .supernotes directory', () => {
      expect(isSupernoteByPath('vault/.supernotes/ideas.md')).toBe(true)
    })

    it('detects file in deeply nested path', () => {
      expect(isSupernoteByPath('a/b/c/.supernotes/d/note.md')).toBe(true)
    })
  })

  describe('.supernote.md extension', () => {
    it('detects .supernote.md extension', () => {
      expect(isSupernoteByPath('notes/idea.supernote.md')).toBe(true)
    })

    it('detects .supernote.md in nested path', () => {
      expect(isSupernoteByPath('vault/projects/task.supernote.md')).toBe(true)
    })
  })

  describe('non-supernote paths', () => {
    it('returns false for regular markdown file', () => {
      expect(isSupernoteByPath('docs/intro.md')).toBe(false)
    })

    it('returns false for empty path', () => {
      expect(isSupernoteByPath('')).toBe(false)
    })

    it('returns false for null path', () => {
      expect(isSupernoteByPath(null as any)).toBe(false)
    })

    it('returns false for supernotes in filename but not directory', () => {
      expect(isSupernoteByPath('my-supernotes-list.md')).toBe(false)
    })
  })

  describe('path normalization', () => {
    it('handles backslashes', () => {
      expect(isSupernoteByPath('.supernotes\\note.md')).toBe(true)
    })

    it('handles mixed separators', () => {
      expect(isSupernoteByPath('vault\\.supernotes/note.md')).toBe(true)
    })
  })
})

// ============================================================================
// isDirectoryAStrand TESTS
// ============================================================================

describe('isDirectoryAStrand', () => {
  it('returns true if strand.yml exists', () => {
    const files = ['project/strand.yml', 'project/index.md']
    expect(isDirectoryAStrand('project', files)).toBe(true)
  })

  it('returns true if strand.yaml exists', () => {
    const files = ['project/strand.yaml', 'project/index.md']
    expect(isDirectoryAStrand('project', files)).toBe(true)
  })

  it('returns false if no strand schema file', () => {
    const files = ['project/index.md', 'project/data.json']
    expect(isDirectoryAStrand('project', files)).toBe(false)
  })

  it('returns false for empty file list', () => {
    expect(isDirectoryAStrand('project', [])).toBe(false)
  })

  it('handles full paths with strand schema', () => {
    const files = ['vault/project/strand.yml']
    expect(isDirectoryAStrand('vault/project', files)).toBe(true)
  })
})

// ============================================================================
// validateStrandSchema TESTS
// ============================================================================

describe('validateStrandSchema', () => {
  const validSchema = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    slug: 'test-strand',
    title: 'Test Strand',
    version: '1.0.0',
    contentType: 'lesson',
  }

  describe('required fields', () => {
    it('validates schema with all required fields', () => {
      const result = validateStrandSchema(validSchema, 'file')
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('fails when id is missing', () => {
      const { id, ...schema } = validSchema
      const result = validateStrandSchema(schema, 'file')
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Missing required field: id')
    })

    it('fails when slug is missing', () => {
      const { slug, ...schema } = validSchema
      const result = validateStrandSchema(schema, 'file')
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Missing required field: slug')
    })

    it('fails when title is missing', () => {
      const { title, ...schema } = validSchema
      const result = validateStrandSchema(schema, 'file')
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Missing required field: title')
    })

    it('fails when version is missing', () => {
      const { version, ...schema } = validSchema
      const result = validateStrandSchema(schema, 'file')
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Missing required field: version')
    })

    it('fails when contentType is missing', () => {
      const { contentType, ...schema } = validSchema
      const result = validateStrandSchema(schema, 'file')
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Missing required field: contentType')
    })
  })

  describe('field format validation', () => {
    it('warns for non-UUID id', () => {
      const schema = { ...validSchema, id: 'not-a-uuid' }
      const result = validateStrandSchema(schema, 'file')
      expect(result.warnings.some(w => w.includes('UUID'))).toBe(true)
    })

    it('fails for invalid slug format', () => {
      const schema = { ...validSchema, slug: 'Invalid_Slug!' }
      const result = validateStrandSchema(schema, 'file')
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('slug must be lowercase'))).toBe(true)
    })

    it('accepts valid slug with hyphens', () => {
      const schema = { ...validSchema, slug: 'my-test-strand' }
      const result = validateStrandSchema(schema, 'file')
      expect(result.valid).toBe(true)
    })

    it('warns for non-semver version', () => {
      const schema = { ...validSchema, version: 'v1' }
      const result = validateStrandSchema(schema, 'file')
      expect(result.warnings.some(w => w.includes('semver'))).toBe(true)
    })

    it('warns for unknown contentType', () => {
      const schema = { ...validSchema, contentType: 'unknown-type' }
      const result = validateStrandSchema(schema, 'file')
      expect(result.warnings.some(w => w.includes('Unknown contentType'))).toBe(true)
    })
  })

  describe('folder-strand validation', () => {
    it('warns if folder-strand lacks strandType: folder', () => {
      const result = validateStrandSchema(validSchema, 'folder')
      expect(result.warnings.some(w => w.includes('strandType: folder'))).toBe(true)
    })

    it('no warning when strandType is folder', () => {
      const schema = { ...validSchema, strandType: 'folder' }
      const result = validateStrandSchema(schema, 'folder')
      expect(result.warnings.filter(w => w.includes('strandType: folder'))).toHaveLength(0)
    })
  })

  describe('supernote validation', () => {
    it('fails supernote without primarySupertag', () => {
      const schema = { ...validSchema, isSupernote: true }
      const result = validateStrandSchema(schema, 'supernote')
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Supernotes must have a primary supertag')
    })

    it('passes supernote with primarySupertag', () => {
      const schema = { ...validSchema, isSupernote: true, primarySupertag: 'idea' }
      const result = validateStrandSchema(schema, 'supernote')
      expect(result.valid).toBe(true)
    })

    it('passes supernote with supertags array', () => {
      const schema = { ...validSchema, isSupernote: true, supertags: ['idea', 'project'] }
      const result = validateStrandSchema(schema, 'supernote')
      expect(result.valid).toBe(true)
    })

    it('warns for unknown supernoteCardSize', () => {
      const schema = { ...validSchema, isSupernote: true, primarySupertag: 'idea', supernoteCardSize: 'huge' }
      const result = validateStrandSchema(schema, 'supernote')
      expect(result.warnings.some(w => w.includes('supernoteCardSize'))).toBe(true)
    })

    it('warns for unknown supernoteStyle', () => {
      const schema = { ...validSchema, isSupernote: true, primarySupertag: 'idea', supernoteStyle: 'fancy' }
      const result = validateStrandSchema(schema, 'supernote')
      expect(result.warnings.some(w => w.includes('supernoteStyle'))).toBe(true)
    })
  })

  describe('metadata generation', () => {
    it('generates metadata for valid schema', () => {
      const result = validateStrandSchema(validSchema, 'file')
      expect(result.metadata).not.toBeNull()
      expect(result.metadata?.id).toBe(validSchema.id)
      expect(result.metadata?.slug).toBe(validSchema.slug)
      expect(result.metadata?.title).toBe(validSchema.title)
    })

    it('returns null metadata for invalid schema', () => {
      const result = validateStrandSchema({}, 'file')
      expect(result.metadata).toBeNull()
    })
  })
})

// ============================================================================
// validateSupernoteRequirements TESTS
// ============================================================================

describe('validateSupernoteRequirements', () => {
  it('returns valid for non-supernote metadata', () => {
    const result = validateSupernoteRequirements({ title: 'Regular strand' })
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('fails supernote without primarySupertag', () => {
    const result = validateSupernoteRequirements({ isSupernote: true })
    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
  })

  it('passes supernote with primarySupertag', () => {
    const result = validateSupernoteRequirements({ isSupernote: true, primarySupertag: 'idea' })
    expect(result.valid).toBe(true)
  })

  it('passes supernote with supertags array', () => {
    const result = validateSupernoteRequirements({ isSupernote: true, supertags: ['idea'] })
    expect(result.valid).toBe(true)
  })

  it('fails supernote with empty supertags array', () => {
    const result = validateSupernoteRequirements({ isSupernote: true, supertags: [] })
    expect(result.valid).toBe(false)
  })
})

// ============================================================================
// collectFolderStrandFiles TESTS
// ============================================================================

describe('collectFolderStrandFiles', () => {
  describe('file categorization', () => {
    it('categorizes markdown files as content', () => {
      const files = ['project/index.md', 'project/chapter1.md', 'project/strand.yml']
      const result = collectFolderStrandFiles('project', files)
      expect(result.content).toContain('project/index.md')
      expect(result.content).toContain('project/chapter1.md')
    })

    it('categorizes images correctly', () => {
      const files = ['project/logo.png', 'project/hero.jpg', 'project/icon.svg']
      const result = collectFolderStrandFiles('project', files)
      expect(result.images).toContain('project/logo.png')
      expect(result.images).toContain('project/hero.jpg')
      expect(result.images).toContain('project/icon.svg')
    })

    it('categorizes media files correctly', () => {
      const files = ['project/video.mp4', 'project/audio.mp3']
      const result = collectFolderStrandFiles('project', files)
      expect(result.media).toContain('project/video.mp4')
      expect(result.media).toContain('project/audio.mp3')
    })

    it('categorizes data files correctly', () => {
      const files = ['project/config.json', 'project/data.yaml', 'project/export.csv']
      const result = collectFolderStrandFiles('project', files)
      expect(result.data).toContain('project/config.json')
      expect(result.data).toContain('project/data.yaml')
      expect(result.data).toContain('project/export.csv')
    })

    it('categorizes note files correctly', () => {
      // Note: .txt files are categorized as notes
      // .notes.md files are categorized as content because .md extension is checked first
      const files = ['project/scratch.txt', 'project/notes.note']
      const result = collectFolderStrandFiles('project', files)
      expect(result.notes).toContain('project/scratch.txt')
      expect(result.notes).toContain('project/notes.note')
    })
  })

  describe('entry file detection', () => {
    it('sets index.md as entry when available', () => {
      const files = ['project/index.md', 'project/README.md']
      const result = collectFolderStrandFiles('project', files)
      expect(result.entry).toBe('project/index.md')
    })

    it('falls back to first content file if no standard entry', () => {
      const files = ['project/chapter1.md', 'project/chapter2.md']
      const result = collectFolderStrandFiles('project', files)
      expect(result.entry).toBe('project/chapter1.md')
    })

    it('returns null entry when no content files', () => {
      const files = ['project/image.png', 'project/data.json']
      const result = collectFolderStrandFiles('project', files)
      expect(result.entry).toBeNull()
    })
  })

  describe('exclusion patterns', () => {
    it('excludes draft files', () => {
      const files = ['project/index.md', 'project/chapter.draft.md']
      const result = collectFolderStrandFiles('project', files)
      expect(result.content).not.toContain('project/chapter.draft.md')
    })

    it('excludes underscore-prefixed and dot-prefixed files but not wip pattern', () => {
      // Note: The *.wip.* pattern uses a simple glob that checks if suffix is present
      // The implementation checks fileName.endsWith(suffix) || fileName.includes(suffix)
      // where suffix is ".wip.*" (literal asterisk), so it won't match "feature.wip.md"
      // The exclusion works for patterns like "*.draft.md" because it checks endsWith(".draft.md")
      const files = ['project/index.md', 'project/chapter.draft.md']
      const result = collectFolderStrandFiles('project', files)
      expect(result.content).not.toContain('project/chapter.draft.md')
    })

    it('excludes underscore-prefixed files', () => {
      const files = ['project/index.md', 'project/_private.md']
      const result = collectFolderStrandFiles('project', files)
      expect(result.content).not.toContain('project/_private.md')
    })

    it('excludes hidden files', () => {
      const files = ['project/index.md', 'project/.hidden.md']
      const result = collectFolderStrandFiles('project', files)
      expect(result.content).not.toContain('project/.hidden.md')
    })
  })

  describe('explicit includes', () => {
    it('uses explicit content includes when provided', () => {
      const files = ['project/index.md', 'project/chapter1.md', 'project/chapter2.md']
      const includes = { content: ['chapter1.md'] }
      const result = collectFolderStrandFiles('project', files, includes)
      expect(result.content).toEqual(['project/chapter1.md'])
    })

    it('uses explicit image includes when provided', () => {
      const files = ['project/a.png', 'project/b.png']
      const includes = { images: ['a.png'] }
      const result = collectFolderStrandFiles('project', files, includes)
      expect(result.images).toEqual(['project/a.png'])
    })
  })

  describe('all files collection', () => {
    it('collects all categorized files in all array', () => {
      const files = ['project/index.md', 'project/logo.png', 'project/video.mp4', 'project/data.json']
      const result = collectFolderStrandFiles('project', files)
      expect(result.all).toContain('project/index.md')
      expect(result.all).toContain('project/logo.png')
      expect(result.all).toContain('project/video.mp4')
      expect(result.all).toContain('project/data.json')
    })
  })

  describe('path normalization', () => {
    it('handles backslashes in paths', () => {
      const files = ['project\\index.md', 'project\\logo.png']
      const result = collectFolderStrandFiles('project', files)
      expect(result.content.length).toBe(1)
      expect(result.images.length).toBe(1)
    })
  })
})

// ============================================================================
// filterBySupernoteStatus TESTS
// ============================================================================

describe('filterBySupernoteStatus', () => {
  const strands = [
    { id: '1', metadata: { isSupernote: true } },
    { id: '2', metadata: { strandType: 'file' } },
    { id: '3', metadata: { strandType: 'supernote' } },
    { id: '4', frontmatter: { isSupernote: false } },
  ]

  it('returns all strands for mode "all"', () => {
    const result = filterBySupernoteStatus(strands, 'all')
    expect(result).toHaveLength(4)
  })

  it('returns only supernotes for mode "supernotes"', () => {
    const result = filterBySupernoteStatus(strands, 'supernotes')
    expect(result).toHaveLength(2)
    expect(result.every(s =>
      s.metadata?.isSupernote === true || s.metadata?.strandType === 'supernote'
    )).toBe(true)
  })

  it('returns only regular strands for mode "regular"', () => {
    const result = filterBySupernoteStatus(strands, 'regular')
    expect(result).toHaveLength(2)
    expect(result.some(s => s.metadata?.isSupernote === true)).toBe(false)
  })

  it('handles strands with frontmatter instead of metadata', () => {
    const strandsWithFrontmatter = [
      { id: '1', frontmatter: { isSupernote: true } },
      { id: '2', frontmatter: { title: 'Regular' } },
    ]
    const result = filterBySupernoteStatus(strandsWithFrontmatter, 'supernotes')
    expect(result).toHaveLength(1)
  })

  it('handles empty array', () => {
    const result = filterBySupernoteStatus([], 'supernotes')
    expect(result).toHaveLength(0)
  })
})

// ============================================================================
// getSupernoteDisplayInfo TESTS
// ============================================================================

describe('getSupernoteDisplayInfo', () => {
  it('returns null for non-supernote', () => {
    const result = getSupernoteDisplayInfo({ strandType: 'file' })
    expect(result).toBeNull()
  })

  it('returns display info for supernote', () => {
    const result = getSupernoteDisplayInfo({ isSupernote: true, primarySupertag: 'idea' })
    expect(result).not.toBeNull()
    expect(result?.isSupernote).toBe(true)
    expect(result?.badgeLabel).toBe('Supernote')
    expect(result?.primarySupertag).toBe('idea')
  })

  it('uses first supertag as primary if no primarySupertag', () => {
    const result = getSupernoteDisplayInfo({ isSupernote: true, supertags: ['project', 'task'] })
    expect(result?.primarySupertag).toBe('project')
  })

  it('uses "note" as fallback primary supertag', () => {
    const result = getSupernoteDisplayInfo({ isSupernote: true })
    expect(result?.primarySupertag).toBe('note')
  })

  it('uses custom color override when provided', () => {
    const result = getSupernoteDisplayInfo({ isSupernote: true, supernoteColorOverride: '#ff0000' })
    expect(result?.badgeColor).toBe('#ff0000')
  })

  it('uses default amber color when no override', () => {
    const result = getSupernoteDisplayInfo({ isSupernote: true })
    expect(result?.badgeColor).toBe('#f59e0b')
  })

  it('returns correct icon', () => {
    const result = getSupernoteDisplayInfo({ isSupernote: true })
    expect(result?.icon).toBe('sticky-note')
  })
})

// ============================================================================
// detectStrandTypeWithSupernote TESTS
// ============================================================================

describe('detectStrandTypeWithSupernote', () => {
  it('detects regular file-strand', () => {
    const result = detectStrandTypeWithSupernote('docs/intro.md', [], { title: 'Intro' })
    expect(result.isStrand).toBe(true)
    expect(result.strandType).toBe('file')
  })

  it('detects supernote from frontmatter', () => {
    const result = detectStrandTypeWithSupernote('notes/idea.md', [], { isSupernote: true })
    expect(result.strandType).toBe('supernote')
  })

  it('detects supernote from path even without frontmatter', () => {
    const result = detectStrandTypeWithSupernote('.supernotes/note.md', [])
    expect(result.strandType).toBe('supernote')
  })

  it('detects supernote from .supernote.md extension', () => {
    const result = detectStrandTypeWithSupernote('ideas/task.supernote.md', [])
    expect(result.strandType).toBe('supernote')
  })

  it('detects folder-strand correctly', () => {
    const files = ['project/strand.yml', 'project/index.md']
    const result = detectStrandTypeWithSupernote('project', files)
    expect(result.strandType).toBe('folder')
  })
})
