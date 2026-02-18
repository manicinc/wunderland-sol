/**
 * Import/Export Core Types Tests
 * @module __tests__/unit/lib/import-export/core/types.test
 *
 * Tests for import/export type utilities and constants.
 */

import { describe, it, expect } from 'vitest'
import {
  PAGE_CONFIGS,
  buildDirectoryStructure,
  type FileWithMetadata,
  type DirectoryStructure,
  type ImportFormat,
  type ExportFormat,
  type ConflictResolution,
  type PageConfig,
  type ImportOptions,
  type ImportConflict,
  type ImportResult,
  type ImportError,
  type ExportOptions,
  type ExportResult,
  type ConversionProgress,
  type ConversionTask,
  type ConversionTaskType,
  type ConversionTaskProgress,
  type ConversionTaskResult,
  type GitHubPRRequest,
  type GitHubPRFile,
  type GitHubPRResult,
  type PageBreak,
  type IConverter,
} from '@/lib/import-export/core/types'

// ============================================================================
// PAGE_CONFIGS CONSTANT
// ============================================================================

describe('PAGE_CONFIGS', () => {
  describe('letter config', () => {
    it('has correct width (8.5 inches)', () => {
      expect(PAGE_CONFIGS.letter.width).toBe(8.5)
    })

    it('has correct height (11 inches)', () => {
      expect(PAGE_CONFIGS.letter.height).toBe(11)
    })

    it('has 1 inch margins', () => {
      expect(PAGE_CONFIGS.letter.marginTop).toBe(1)
      expect(PAGE_CONFIGS.letter.marginRight).toBe(1)
      expect(PAGE_CONFIGS.letter.marginBottom).toBe(1)
      expect(PAGE_CONFIGS.letter.marginLeft).toBe(1)
    })

    it('has 96 DPI', () => {
      expect(PAGE_CONFIGS.letter.dpi).toBe(96)
    })
  })

  describe('a4 config', () => {
    it('has correct width (8.27 inches)', () => {
      expect(PAGE_CONFIGS.a4.width).toBe(8.27)
    })

    it('has correct height (11.69 inches)', () => {
      expect(PAGE_CONFIGS.a4.height).toBe(11.69)
    })

    it('has 1 inch margins', () => {
      expect(PAGE_CONFIGS.a4.marginTop).toBe(1)
      expect(PAGE_CONFIGS.a4.marginRight).toBe(1)
      expect(PAGE_CONFIGS.a4.marginBottom).toBe(1)
      expect(PAGE_CONFIGS.a4.marginLeft).toBe(1)
    })

    it('has 96 DPI', () => {
      expect(PAGE_CONFIGS.a4.dpi).toBe(96)
    })
  })

  it('has only letter and a4 configs', () => {
    expect(Object.keys(PAGE_CONFIGS)).toEqual(['letter', 'a4'])
  })
})

// ============================================================================
// buildDirectoryStructure
// ============================================================================

describe('buildDirectoryStructure', () => {
  // Helper to create file metadata
  const createFile = (relativePath: string): FileWithMetadata => ({
    file: new File(['content'], relativePath.split('/').pop() || 'file'),
    path: relativePath,
    relativePath,
    size: 100,
    lastModified: new Date(),
  })

  describe('empty input', () => {
    it('returns root directory for empty array', () => {
      const result = buildDirectoryStructure([])

      expect(result.name).toBe('root')
      expect(result.path).toBe('')
      expect(result.type).toBe('directory')
      expect(result.children).toEqual([])
    })
  })

  describe('flat files', () => {
    it('handles single file at root', () => {
      const files = [createFile('document.md')]
      const result = buildDirectoryStructure(files)

      expect(result.children?.length).toBe(1)
      expect(result.children?.[0].name).toBe('document.md')
      expect(result.children?.[0].type).toBe('file')
      expect(result.children?.[0].file).toBeDefined()
    })

    it('handles multiple files at root', () => {
      const files = [
        createFile('a.md'),
        createFile('b.md'),
        createFile('c.md'),
      ]
      const result = buildDirectoryStructure(files)

      expect(result.children?.length).toBe(3)
      expect(result.children?.map(c => c.name)).toContain('a.md')
      expect(result.children?.map(c => c.name)).toContain('b.md')
      expect(result.children?.map(c => c.name)).toContain('c.md')
    })
  })

  describe('nested structure', () => {
    it('creates nested directories', () => {
      const files = [createFile('folder/document.md')]
      const result = buildDirectoryStructure(files)

      expect(result.children?.length).toBe(1)
      expect(result.children?.[0].name).toBe('folder')
      expect(result.children?.[0].type).toBe('directory')
      expect(result.children?.[0].children?.[0].name).toBe('document.md')
      expect(result.children?.[0].children?.[0].type).toBe('file')
    })

    it('creates deeply nested directories', () => {
      const files = [createFile('a/b/c/d/file.md')]
      const result = buildDirectoryStructure(files)

      let current = result
      const expectedPath = ['a', 'b', 'c', 'd']

      for (const part of expectedPath) {
        expect(current.children?.length).toBe(1)
        current = current.children![0]
        expect(current.name).toBe(part)
        expect(current.type).toBe('directory')
      }

      // Final file
      expect(current.children?.[0].name).toBe('file.md')
      expect(current.children?.[0].type).toBe('file')
    })

    it('preserves correct paths at each level', () => {
      const files = [createFile('docs/guides/intro.md')]
      const result = buildDirectoryStructure(files)

      const docs = result.children?.[0]
      expect(docs?.path).toBe('docs')

      const guides = docs?.children?.[0]
      expect(guides?.path).toBe('docs/guides')

      const file = guides?.children?.[0]
      expect(file?.path).toBe('docs/guides/intro.md')
    })
  })

  describe('complex structures', () => {
    it('handles multiple files in same directory', () => {
      const files = [
        createFile('folder/a.md'),
        createFile('folder/b.md'),
        createFile('folder/c.md'),
      ]
      const result = buildDirectoryStructure(files)

      const folder = result.children?.[0]
      expect(folder?.children?.length).toBe(3)
    })

    it('handles mixed files and directories', () => {
      const files = [
        createFile('README.md'),
        createFile('docs/intro.md'),
        createFile('docs/guide.md'),
        createFile('src/index.ts'),
      ]
      const result = buildDirectoryStructure(files)

      // Root has 3 children: README.md, docs/, src/
      expect(result.children?.length).toBe(3)

      const readme = result.children?.find(c => c.name === 'README.md')
      expect(readme?.type).toBe('file')

      const docs = result.children?.find(c => c.name === 'docs')
      expect(docs?.type).toBe('directory')
      expect(docs?.children?.length).toBe(2)

      const src = result.children?.find(c => c.name === 'src')
      expect(src?.type).toBe('directory')
      expect(src?.children?.length).toBe(1)
    })

    it('handles Obsidian-like vault structure', () => {
      const files = [
        createFile('Daily Notes/2025-01-01.md'),
        createFile('Daily Notes/2025-01-02.md'),
        createFile('Projects/Project A/overview.md'),
        createFile('Projects/Project A/notes.md'),
        createFile('Projects/Project B/todo.md'),
        createFile('Reference/templates/default.md'),
        createFile('README.md'),
      ]
      const result = buildDirectoryStructure(files)

      // Root should have: Daily Notes, Projects, Reference, README.md
      expect(result.children?.length).toBe(4)

      const dailyNotes = result.children?.find(c => c.name === 'Daily Notes')
      expect(dailyNotes?.children?.length).toBe(2)

      const projects = result.children?.find(c => c.name === 'Projects')
      expect(projects?.children?.length).toBe(2)

      const projectA = projects?.children?.find(c => c.name === 'Project A')
      expect(projectA?.children?.length).toBe(2)
    })
  })

  describe('file metadata preservation', () => {
    it('preserves file metadata on leaf nodes', () => {
      const originalFile = createFile('test.md')
      originalFile.size = 500
      const result = buildDirectoryStructure([originalFile])

      const fileNode = result.children?.[0]
      expect(fileNode?.file).toBeDefined()
      expect(fileNode?.file?.size).toBe(500)
      expect(fileNode?.file?.relativePath).toBe('test.md')
    })

    it('does not add file metadata to directories', () => {
      const files = [createFile('folder/file.md')]
      const result = buildDirectoryStructure(files)

      const folder = result.children?.[0]
      expect(folder?.file).toBeUndefined()
    })
  })

  describe('edge cases', () => {
    it('handles files with special characters in names', () => {
      const files = [
        createFile('folder/file with spaces.md'),
        createFile('folder/file-with-dashes.md'),
        createFile('folder/file_with_underscores.md'),
      ]
      const result = buildDirectoryStructure(files)

      const folder = result.children?.[0]
      expect(folder?.children?.length).toBe(3)
      expect(folder?.children?.map(c => c.name)).toContain('file with spaces.md')
    })

    it('handles duplicate paths (deduplicates)', () => {
      const files = [
        createFile('folder/file.md'),
        createFile('folder/file.md'), // Same path
      ]
      const result = buildDirectoryStructure(files)

      const folder = result.children?.[0]
      // Second file with same name should not create duplicate
      // (though in real usage, File objects would differ)
      expect(folder?.children?.length).toBe(1)
    })
  })
})

// ============================================================================
// TYPE CHECKS (compile-time verification)
// ============================================================================

describe('Type Definitions', () => {
  describe('ImportFormat', () => {
    it('includes all expected import formats', () => {
      const formats: ImportFormat[] = [
        'obsidian',
        'notion',
        'google-docs',
        'markdown',
        'json',
        'github',
        'evernote',
      ]
      expect(formats.length).toBe(7)
    })
  })

  describe('ExportFormat', () => {
    it('includes all expected export formats', () => {
      const formats: ExportFormat[] = [
        'markdown',
        'pdf',
        'docx',
        'json',
        'txt',
        'fabric-zip',
      ]
      expect(formats.length).toBe(6)
    })
  })

  describe('ConflictResolution', () => {
    it('includes all expected resolution strategies', () => {
      const resolutions: ConflictResolution[] = [
        'keep-existing',
        'use-incoming',
        'merge',
        'skip',
        'rename-incoming',
      ]
      expect(resolutions.length).toBe(5)
    })
  })

  describe('PageConfig', () => {
    it('has all required properties', () => {
      const config: PageConfig = {
        width: 8.5,
        height: 11,
        marginTop: 1,
        marginRight: 1,
        marginBottom: 1,
        marginLeft: 1,
        dpi: 96,
      }
      expect(Object.keys(config)).toHaveLength(7)
    })
  })

  describe('ImportOptions', () => {
    it('creates minimal options', () => {
      const options: ImportOptions = {
        format: 'obsidian',
        conflictResolution: 'skip',
        preserveStructure: true,
      }
      expect(options.format).toBe('obsidian')
      expect(options.conflictResolution).toBe('skip')
      expect(options.preserveStructure).toBe(true)
    })

    it('creates options with target weave', () => {
      const options: ImportOptions = {
        format: 'notion',
        conflictResolution: 'merge',
        preserveStructure: false,
        targetWeave: 'weave-123',
      }
      expect(options.targetWeave).toBe('weave-123')
    })

    it('creates options with format-specific settings', () => {
      const options: ImportOptions = {
        format: 'obsidian',
        conflictResolution: 'replace',
        preserveStructure: true,
        formatOptions: {
          convertWikiLinks: true,
          preserveObsidianTags: true,
          importAttachments: false,
        },
      }
      expect(options.formatOptions?.convertWikiLinks).toBe(true)
      expect(options.formatOptions?.preserveObsidianTags).toBe(true)
    })

    it('supports all conflict resolution strategies', () => {
      const strategies: ImportOptions['conflictResolution'][] = [
        'replace',
        'merge',
        'skip',
        'ask',
      ]
      expect(strategies).toHaveLength(4)
    })
  })

  describe('ImportConflict', () => {
    it('creates strand conflict', () => {
      const conflict: ImportConflict = {
        type: 'strand',
        path: 'documents/note.md',
        existingId: 'strand-existing',
        incomingId: 'strand-incoming',
        existingTitle: 'Existing Note',
        incomingTitle: 'Incoming Note',
        existingModified: '2025-01-01T00:00:00Z',
        incomingModified: '2025-01-02T00:00:00Z',
      }
      expect(conflict.type).toBe('strand')
      expect(conflict.path).toBe('documents/note.md')
    })

    it('creates conflict with content', () => {
      const conflict: ImportConflict = {
        type: 'strand',
        path: 'note.md',
        existingId: 'e1',
        incomingId: 'i1',
        existingTitle: 'Title',
        incomingTitle: 'Title',
        existingModified: '2025-01-01',
        incomingModified: '2025-01-02',
        existingContent: 'Old content',
        incomingContent: 'New content',
      }
      expect(conflict.existingContent).toBe('Old content')
      expect(conflict.incomingContent).toBe('New content')
    })

    it('supports loom and weave types', () => {
      const loomConflict: ImportConflict = {
        type: 'loom',
        path: 'folder',
        existingId: 'l1',
        incomingId: 'l2',
        existingTitle: 'Folder',
        incomingTitle: 'Folder',
        existingModified: '2025-01-01',
        incomingModified: '2025-01-02',
      }
      expect(loomConflict.type).toBe('loom')

      const weaveConflict: ImportConflict = {
        type: 'weave',
        path: 'vault',
        existingId: 'w1',
        incomingId: 'w2',
        existingTitle: 'Vault',
        incomingTitle: 'Vault',
        existingModified: '2025-01-01',
        incomingModified: '2025-01-02',
      }
      expect(weaveConflict.type).toBe('weave')
    })
  })

  describe('ImportResult', () => {
    it('creates successful result', () => {
      const result: ImportResult = {
        success: true,
        statistics: {
          strandsImported: 100,
          strandsSkipped: 5,
          strandsConflicted: 2,
          assetsImported: 50,
          errors: 0,
        },
        strandIds: ['s1', 's2', 's3'],
        duration: 5000,
      }
      expect(result.success).toBe(true)
      expect(result.statistics.strandsImported).toBe(100)
      expect(result.strandIds).toHaveLength(3)
    })

    it('creates failed result with errors', () => {
      const result: ImportResult = {
        success: false,
        statistics: {
          strandsImported: 0,
          strandsSkipped: 0,
          strandsConflicted: 0,
          assetsImported: 0,
          errors: 3,
        },
        strandIds: [],
        errors: [
          { type: 'parse', message: 'Invalid markdown' },
          { type: 'validation', message: 'Missing title' },
        ],
        duration: 1000,
      }
      expect(result.success).toBe(false)
      expect(result.errors).toHaveLength(2)
    })

    it('includes warnings', () => {
      const result: ImportResult = {
        success: true,
        statistics: {
          strandsImported: 10,
          strandsSkipped: 0,
          strandsConflicted: 0,
          assetsImported: 0,
          errors: 0,
        },
        strandIds: ['s1'],
        warnings: ['Some images could not be imported'],
        duration: 2000,
      }
      expect(result.warnings).toHaveLength(1)
    })
  })

  describe('ImportError', () => {
    it('creates parse error', () => {
      const error: ImportError = {
        type: 'parse',
        message: 'Invalid YAML frontmatter',
        file: 'notes/broken.md',
        line: 5,
      }
      expect(error.type).toBe('parse')
      expect(error.line).toBe(5)
    })

    it('creates error with details', () => {
      const error: ImportError = {
        type: 'validation',
        message: 'Schema validation failed',
        details: { field: 'title', expected: 'string', got: 'number' },
      }
      expect(error.details).toBeDefined()
    })

    it('supports all error types', () => {
      const types: ImportError['type'][] = [
        'parse',
        'convert',
        'write',
        'conflict',
        'validation',
      ]
      expect(types).toHaveLength(5)
    })
  })

  describe('ExportOptions', () => {
    it('creates minimal options', () => {
      const options: ExportOptions = {
        format: 'markdown',
        includeMetadata: true,
      }
      expect(options.format).toBe('markdown')
      expect(options.includeMetadata).toBe(true)
    })

    it('creates options with strand paths', () => {
      const options: ExportOptions = {
        format: 'pdf',
        includeMetadata: false,
        strandPaths: ['/docs/intro', '/docs/guide'],
      }
      expect(options.strandPaths).toHaveLength(2)
    })

    it('creates options with PDF settings', () => {
      const options: ExportOptions = {
        format: 'pdf',
        includeMetadata: true,
        formatOptions: {
          pagination: 'letter',
          includeTOC: true,
          includePageNumbers: true,
          orientation: 'portrait',
          fontSize: 12,
          fontFamily: 'Arial',
        },
      }
      expect(options.formatOptions?.pagination).toBe('letter')
      expect(options.formatOptions?.includeTOC).toBe(true)
    })

    it('creates options with markdown settings', () => {
      const options: ExportOptions = {
        format: 'markdown',
        includeMetadata: true,
        formatOptions: {
          includeAssets: true,
          frontmatterStyle: 'yaml',
          wikiLinks: false,
        },
      }
      expect(options.formatOptions?.frontmatterStyle).toBe('yaml')
    })
  })

  describe('ExportResult', () => {
    it('creates successful result', () => {
      const result: ExportResult = {
        success: true,
        filename: 'export-2025-01-01.zip',
        statistics: {
          strandsExported: 50,
          assetsExported: 25,
          totalSizeBytes: 1024 * 1024,
        },
        duration: 3000,
      }
      expect(result.success).toBe(true)
      expect(result.filename).toContain('.zip')
      expect(result.statistics.totalSizeBytes).toBe(1024 * 1024)
    })

    it('creates result with blob', () => {
      const result: ExportResult = {
        success: true,
        blob: new Blob(['content'], { type: 'application/zip' }),
        filename: 'export.zip',
        statistics: {
          strandsExported: 1,
          assetsExported: 0,
          totalSizeBytes: 7,
        },
        duration: 100,
      }
      expect(result.blob).toBeDefined()
    })

    it('creates failed result', () => {
      const result: ExportResult = {
        success: false,
        filename: '',
        statistics: {
          strandsExported: 0,
          assetsExported: 0,
          totalSizeBytes: 0,
        },
        errors: ['Failed to generate PDF'],
        duration: 500,
      }
      expect(result.success).toBe(false)
      expect(result.errors).toHaveLength(1)
    })
  })

  describe('ConversionProgress', () => {
    it('creates parsing progress', () => {
      const progress: ConversionProgress = {
        phase: 'parsing',
        current: 10,
        total: 100,
        message: 'Reading files...',
      }
      expect(progress.phase).toBe('parsing')
      expect(progress.current).toBe(10)
    })

    it('creates progress with bytes', () => {
      const progress: ConversionProgress = {
        phase: 'converting',
        current: 50,
        total: 100,
        bytesProcessed: 1024 * 512,
        estimatedTotalBytes: 1024 * 1024,
      }
      expect(progress.bytesProcessed).toBe(1024 * 512)
    })

    it('supports all phases', () => {
      const phases: ConversionProgress['phase'][] = [
        'parsing',
        'converting',
        'validating',
        'writing',
        'complete',
      ]
      expect(phases).toHaveLength(5)
    })
  })

  describe('ConversionTask', () => {
    it('creates import task', () => {
      const task: ConversionTask = {
        id: 'task-123',
        type: 'import-obsidian',
        input: new Blob(['content']),
        options: { format: 'obsidian' },
      }
      expect(task.type).toBe('import-obsidian')
    })

    it('creates export task', () => {
      const task: ConversionTask = {
        id: 'task-456',
        type: 'export-pdf',
        input: [],
        options: { format: 'pdf' },
      }
      expect(task.type).toBe('export-pdf')
    })

    it('supports all task types', () => {
      const types: ConversionTaskType[] = [
        'import-obsidian',
        'import-notion',
        'import-google-docs',
        'export-pdf',
        'export-docx',
        'export-markdown',
      ]
      expect(types).toHaveLength(6)
    })
  })

  describe('ConversionTaskProgress', () => {
    it('creates progress update', () => {
      const progress: ConversionTaskProgress = {
        taskId: 'task-123',
        progress: 75,
        message: 'Converting files...',
        currentFile: 'notes/document.md',
      }
      expect(progress.taskId).toBe('task-123')
      expect(progress.progress).toBe(75)
      expect(progress.currentFile).toBe('notes/document.md')
    })
  })

  describe('ConversionTaskResult', () => {
    it('creates successful result', () => {
      const result: ConversionTaskResult = {
        taskId: 'task-123',
        success: true,
        statistics: {
          itemsProcessed: 100,
          itemsFailed: 0,
          totalSizeBytes: 5000,
        },
      }
      expect(result.success).toBe(true)
      expect(result.statistics?.itemsProcessed).toBe(100)
    })

    it('creates failed result', () => {
      const result: ConversionTaskResult = {
        taskId: 'task-456',
        success: false,
        errors: [{ type: 'parse', message: 'Invalid file' }],
        warnings: ['Some images skipped'],
      }
      expect(result.success).toBe(false)
      expect(result.errors).toHaveLength(1)
    })
  })

  describe('GitHubPRRequest', () => {
    it('creates PR request', () => {
      const request: GitHubPRRequest = {
        branch: 'feature/import-docs',
        files: [
          { path: 'docs/guide.md', content: '# Guide' },
        ],
        commitMessage: 'docs: add guide',
        prTitle: 'Add documentation guide',
        prBody: 'This PR adds a documentation guide.',
      }
      expect(request.branch).toBe('feature/import-docs')
      expect(request.files).toHaveLength(1)
    })
  })

  describe('GitHubPRFile', () => {
    it('creates file with UTF-8', () => {
      const file: GitHubPRFile = {
        path: 'docs/readme.md',
        content: '# Readme',
        encoding: 'utf-8',
      }
      expect(file.encoding).toBe('utf-8')
    })

    it('creates file with base64', () => {
      const file: GitHubPRFile = {
        path: 'images/logo.png',
        content: 'iVBORw0KGgo=',
        encoding: 'base64',
      }
      expect(file.encoding).toBe('base64')
    })

    it('creates file without encoding', () => {
      const file: GitHubPRFile = {
        path: 'test.md',
        content: 'content',
      }
      expect(file.encoding).toBeUndefined()
    })
  })

  describe('GitHubPRResult', () => {
    it('creates successful result', () => {
      const result: GitHubPRResult = {
        success: true,
        prUrl: 'https://github.com/owner/repo/pull/123',
        branchName: 'feature/docs',
      }
      expect(result.success).toBe(true)
      expect(result.prUrl).toContain('/pull/')
    })

    it('creates failed result', () => {
      const result: GitHubPRResult = {
        success: false,
        error: 'Permission denied',
      }
      expect(result.success).toBe(false)
      expect(result.error).toBe('Permission denied')
    })
  })

  describe('PageBreak', () => {
    it('creates natural page break', () => {
      const pageBreak: PageBreak = {
        index: 1,
        offsetPx: 1056,
        reason: 'natural',
      }
      expect(pageBreak.reason).toBe('natural')
    })

    it('creates forced page break', () => {
      const pageBreak: PageBreak = {
        index: 2,
        offsetPx: 2112,
        reason: 'forced',
      }
      expect(pageBreak.reason).toBe('forced')
    })

    it('creates section page break', () => {
      const pageBreak: PageBreak = {
        index: 3,
        offsetPx: 3168,
        reason: 'section',
      }
      expect(pageBreak.reason).toBe('section')
    })
  })

  describe('FileWithMetadata', () => {
    it('creates file with all metadata', () => {
      const fileWithMeta: FileWithMetadata = {
        file: new File(['content'], 'test.md'),
        path: '/documents/test.md',
        relativePath: 'documents/test.md',
        size: 1024,
        lastModified: new Date('2025-01-01'),
      }
      expect(fileWithMeta.path).toBe('/documents/test.md')
      expect(fileWithMeta.size).toBe(1024)
    })
  })

  describe('DirectoryStructure', () => {
    it('creates file node', () => {
      const node: DirectoryStructure = {
        name: 'document.md',
        path: 'docs/document.md',
        type: 'file',
      }
      expect(node.type).toBe('file')
      expect(node.children).toBeUndefined()
    })

    it('creates directory node with children', () => {
      const node: DirectoryStructure = {
        name: 'docs',
        path: 'docs',
        type: 'directory',
        children: [
          { name: 'readme.md', path: 'docs/readme.md', type: 'file' },
        ],
      }
      expect(node.type).toBe('directory')
      expect(node.children).toHaveLength(1)
    })
  })
})
