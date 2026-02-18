/**
 * Save Strand Metadata Tests
 * @module __tests__/unit/lib/content/saveStrandMetadata.test
 *
 * Tests for strand metadata save functionality including
 * frontmatter serialization and multi-target saving.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Create mocks using vi.hoisted
const { mockUpdateStrandMetadata, mockWriteVaultFile, mockCreateMetadataPR } = vi.hoisted(() => {
  return {
    mockUpdateStrandMetadata: vi.fn(),
    mockWriteVaultFile: vi.fn(),
    mockCreateMetadataPR: vi.fn(),
  }
})

vi.mock('@/lib/content/sqliteStore', () => ({
  updateStrandMetadata: mockUpdateStrandMetadata,
}))

vi.mock('@/lib/vault', () => ({
  writeVaultFile: mockWriteVaultFile,
}))

vi.mock('@/lib/github/createMetadataPR', () => ({
  createMetadataPR: mockCreateMetadataPR,
}))

import {
  buildMarkdownWithFrontmatter,
  determineSaveTargets,
  describeSaveTargets,
  generateMetadataDiff,
  saveStrandMetadata,
  type SaveOptions,
  type SaveTarget,
} from '@/lib/content/saveStrandMetadata'
import type { StrandMetadata, ContentSource } from '@/lib/content/types'

describe('saveStrandMetadata module', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUpdateStrandMetadata.mockResolvedValue(undefined)
    mockWriteVaultFile.mockResolvedValue(undefined)
    mockCreateMetadataPR.mockResolvedValue({
      prUrl: 'https://github.com/owner/repo/pull/1',
      branch: 'metadata-update-123',
    })
  })

  // ============================================================================
  // buildMarkdownWithFrontmatter
  // ============================================================================

  describe('buildMarkdownWithFrontmatter', () => {
    it('builds basic markdown with minimal metadata', () => {
      const metadata: StrandMetadata = {
        title: 'Test Title',
      }
      const contentBody = '# Content\n\nSome text here.'

      const result = buildMarkdownWithFrontmatter(metadata, contentBody)

      expect(result).toContain('---')
      expect(result).toContain('title: "Test Title"')
      expect(result).toContain('# Content')
      expect(result).toContain('Some text here.')
    })

    it('includes id and slug when present', () => {
      const metadata: StrandMetadata = {
        id: 'strand-123',
        slug: 'test-strand',
        title: 'Test',
      }

      const result = buildMarkdownWithFrontmatter(metadata, '')

      expect(result).toContain('id: "strand-123"')
      expect(result).toContain('slug: "test-strand"')
    })

    it('includes version when present', () => {
      const metadata: StrandMetadata = {
        title: 'Test',
        version: '1.2.0',
      }

      const result = buildMarkdownWithFrontmatter(metadata, '')

      expect(result).toContain('version: "1.2.0"')
    })

    it('includes summary', () => {
      const metadata: StrandMetadata = {
        title: 'Test',
        summary: 'A brief summary of the content.',
      }

      const result = buildMarkdownWithFrontmatter(metadata, '')

      expect(result).toContain('summary: "A brief summary of the content."')
    })

    it('escapes quotes in summary', () => {
      const metadata: StrandMetadata = {
        title: 'Test',
        summary: 'Summary with "quotes" inside',
      }

      const result = buildMarkdownWithFrontmatter(metadata, '')

      expect(result).toContain('summary: "Summary with \\"quotes\\" inside"')
    })

    it('serializes tags array', () => {
      const metadata: StrandMetadata = {
        title: 'Test',
        tags: ['typescript', 'testing', 'vitest'],
      }

      const result = buildMarkdownWithFrontmatter(metadata, '')

      expect(result).toContain('tags: ["typescript", "testing", "vitest"]')
    })

    it('handles single tag as array', () => {
      const metadata: StrandMetadata = {
        title: 'Test',
        tags: 'single-tag',
      }

      const result = buildMarkdownWithFrontmatter(metadata, '')

      expect(result).toContain('tags: ["single-tag"]')
    })

    it('includes skills array', () => {
      const metadata: StrandMetadata = {
        title: 'Test',
        skills: ['javascript', 'react', 'node'],
      }

      const result = buildMarkdownWithFrontmatter(metadata, '')

      expect(result).toContain('skills: ["javascript", "react", "node"]')
    })

    it('includes taxonomy with subjects and topics', () => {
      const metadata: StrandMetadata = {
        title: 'Test',
        taxonomy: {
          subjects: ['Programming', 'Web Development'],
          topics: ['TypeScript', 'Testing'],
        },
      }

      const result = buildMarkdownWithFrontmatter(metadata, '')

      expect(result).toContain('taxonomy:')
      expect(result).toContain('subjects: ["Programming", "Web Development"]')
      expect(result).toContain('topics: ["TypeScript", "Testing"]')
    })

    it('includes taxonomy with only subjects', () => {
      const metadata: StrandMetadata = {
        title: 'Test',
        taxonomy: {
          subjects: ['Programming'],
        },
      }

      const result = buildMarkdownWithFrontmatter(metadata, '')

      expect(result).toContain('taxonomy:')
      expect(result).toContain('subjects: ["Programming"]')
      expect(result).not.toContain('topics:')
    })

    it('skips empty taxonomy', () => {
      const metadata: StrandMetadata = {
        title: 'Test',
        taxonomy: {},
      }

      const result = buildMarkdownWithFrontmatter(metadata, '')

      expect(result).not.toContain('taxonomy:')
    })

    it('includes simple difficulty value', () => {
      const metadata: StrandMetadata = {
        title: 'Test',
        difficulty: 'intermediate',
      }

      const result = buildMarkdownWithFrontmatter(metadata, '')

      expect(result).toContain('difficulty: intermediate')
    })

    it('includes complex difficulty object', () => {
      const metadata: StrandMetadata = {
        title: 'Test',
        difficulty: {
          overall: 3,
          cognitive: 4,
          prerequisites: 2,
          conceptual: 5,
        },
      }

      const result = buildMarkdownWithFrontmatter(metadata, '')

      expect(result).toContain('difficulty:')
      expect(result).toContain('overall: 3')
      expect(result).toContain('cognitive: 4')
      expect(result).toContain('prerequisites: 2')
      expect(result).toContain('conceptual: 5')
    })

    it('includes contentType', () => {
      const metadata: StrandMetadata = {
        title: 'Test',
        contentType: 'tutorial',
      }

      const result = buildMarkdownWithFrontmatter(metadata, '')

      expect(result).toContain('contentType: "tutorial"')
    })

    it('includes relationships array format', () => {
      const metadata: StrandMetadata = {
        title: 'Test',
        relationships: [
          { type: 'prerequisite', target: '/path/to/prereq' },
          { type: 'related', target: '/path/to/related' },
        ],
      }

      const result = buildMarkdownWithFrontmatter(metadata, '')

      expect(result).toContain('relationships:')
      expect(result).toContain('type: "prerequisite"')
      expect(result).toContain('target: "/path/to/prereq"')
      expect(result).toContain('type: "related"')
    })

    it('includes relationships object format', () => {
      const metadata: StrandMetadata = {
        title: 'Test',
        relationships: {
          prerequisites: ['/path/prereq1', '/path/prereq2'],
          references: ['/path/ref1'],
          seeAlso: ['/path/seealso1'],
        },
      }

      const result = buildMarkdownWithFrontmatter(metadata, '')

      expect(result).toContain('relationships:')
      expect(result).toContain('prerequisites: ["/path/prereq1", "/path/prereq2"]')
      expect(result).toContain('references: ["/path/ref1"]')
      expect(result).toContain('seeAlso: ["/path/seealso1"]')
    })

    it('includes publishing status', () => {
      const metadata: StrandMetadata = {
        title: 'Test',
        publishing: {
          status: 'published',
          lastUpdated: '2025-01-01T00:00:00Z',
        },
      }

      const result = buildMarkdownWithFrontmatter(metadata, '')

      expect(result).toContain('publishing:')
      expect(result).toContain('status: "published"')
      expect(result).toContain('lastUpdated: "2025-01-01T00:00:00Z"')
    })

    it('includes notes as array', () => {
      const metadata: StrandMetadata = {
        title: 'Test',
        notes: ['Note 1', 'Note 2'],
      }

      const result = buildMarkdownWithFrontmatter(metadata, '')

      expect(result).toContain('notes: ["Note 1", "Note 2"]')
    })

    it('includes notes as string', () => {
      const metadata: StrandMetadata = {
        title: 'Test',
        notes: 'A single note',
      }

      const result = buildMarkdownWithFrontmatter(metadata, '')

      expect(result).toContain('notes: "A single note"')
    })

    it('includes SEO settings', () => {
      const metadata: StrandMetadata = {
        title: 'Test',
        seo: {
          index: true,
          follow: false,
          metaDescription: 'SEO description',
          canonicalUrl: 'https://example.com/page',
        },
      }

      const result = buildMarkdownWithFrontmatter(metadata, '')

      expect(result).toContain('seo:')
      expect(result).toContain('index: true')
      expect(result).toContain('follow: false')
      expect(result).toContain('metaDescription: "SEO description"')
      expect(result).toContain('canonicalUrl: "https://example.com/page"')
    })

    it('includes reader settings', () => {
      const metadata: StrandMetadata = {
        title: 'Test',
        readerSettings: {
          illustrationMode: 'enabled',
        },
      }

      const result = buildMarkdownWithFrontmatter(metadata, '')

      expect(result).toContain('readerSettings:')
      expect(result).toContain('illustrationMode: "enabled"')
    })

    it('escapes title with quotes', () => {
      const metadata: StrandMetadata = {
        title: 'Title with "quotes" inside',
      }

      const result = buildMarkdownWithFrontmatter(metadata, '')

      expect(result).toContain('title: "Title with \\"quotes\\" inside"')
    })

    it('handles empty string title', () => {
      const metadata: StrandMetadata = {
        title: '',
      }

      const result = buildMarkdownWithFrontmatter(metadata, '')

      expect(result).toContain('title: ""')
    })

    it('handles undefined title', () => {
      const metadata: StrandMetadata = {} as StrandMetadata

      const result = buildMarkdownWithFrontmatter(metadata, '')

      expect(result).toContain('title: ""')
    })

    it('properly closes frontmatter block', () => {
      const metadata: StrandMetadata = {
        title: 'Test',
      }

      const result = buildMarkdownWithFrontmatter(metadata, 'Content body')

      const lines = result.split('\n')
      expect(lines[0]).toBe('---')
      expect(lines.filter(l => l === '---').length).toBe(2)
    })

    it('separates frontmatter from content body', () => {
      const metadata: StrandMetadata = {
        title: 'Test',
      }
      const contentBody = 'This is the content.'

      const result = buildMarkdownWithFrontmatter(metadata, contentBody)

      // Should have empty line between --- and content
      expect(result).toContain('---\n\nThis is the content.')
    })
  })

  // ============================================================================
  // determineSaveTargets
  // ============================================================================

  describe('determineSaveTargets', () => {
    it('always enables database target', () => {
      const source: ContentSource = { type: 'bundled' }
      const result = determineSaveTargets(source)

      expect(result.database).toBe(true)
    })

    it('disables vault when no handle provided', () => {
      const source: ContentSource = { type: 'sqlite' }
      const result = determineSaveTargets(source, undefined)

      expect(result.vault).toBe(false)
    })

    it('enables vault for sqlite with handle', () => {
      const source: ContentSource = { type: 'sqlite' }
      const handle = {} as FileSystemDirectoryHandle
      const result = determineSaveTargets(source, handle)

      expect(result.vault).toBe(true)
    })

    it('enables vault for hybrid with handle', () => {
      const source: ContentSource = { type: 'hybrid', githubRepo: '' }
      const handle = {} as FileSystemDirectoryHandle
      const result = determineSaveTargets(source, handle)

      expect(result.vault).toBe(true)
    })

    it('enables vault for filesystem with handle', () => {
      const source: ContentSource = { type: 'filesystem' }
      const handle = {} as FileSystemDirectoryHandle
      const result = determineSaveTargets(source, handle)

      expect(result.vault).toBe(true)
    })

    it('disables vault for bundled source even with handle', () => {
      const source: ContentSource = { type: 'bundled' }
      const handle = {} as FileSystemDirectoryHandle
      const result = determineSaveTargets(source, handle)

      expect(result.vault).toBe(false)
    })

    it('enables github for github source with PAT', () => {
      const source: ContentSource = { type: 'github', githubRepo: 'owner/repo' }
      const result = determineSaveTargets(source, undefined, 'ghp_token123')

      expect(result.github).toBe(true)
    })

    it('disables github without PAT', () => {
      const source: ContentSource = { type: 'github', githubRepo: 'owner/repo' }
      const result = determineSaveTargets(source, undefined, undefined)

      expect(result.github).toBe(false)
    })

    it('disables github for non-github source', () => {
      const source: ContentSource = { type: 'sqlite' }
      const result = determineSaveTargets(source, undefined, 'ghp_token123')

      expect(result.github).toBe(false)
    })

    it('returns all targets correctly for full configuration', () => {
      const source: ContentSource = { type: 'github', githubRepo: 'owner/repo' }
      const handle = {} as FileSystemDirectoryHandle
      const result = determineSaveTargets(source, handle, 'ghp_token123')

      expect(result.database).toBe(true)
      expect(result.vault).toBe(false) // github type doesn't enable vault
      expect(result.github).toBe(true)
    })
  })

  // ============================================================================
  // describeSaveTargets
  // ============================================================================

  describe('describeSaveTargets', () => {
    it('describes database target', () => {
      const targets: SaveTarget = { database: true, vault: false, github: false }
      const result = describeSaveTargets(targets)

      expect(result).toContain('Local Database (IndexedDB)')
      expect(result).toHaveLength(1)
    })

    it('describes vault target', () => {
      const targets: SaveTarget = { database: false, vault: true, github: false }
      const result = describeSaveTargets(targets)

      expect(result).toContain('Vault Folder (filesystem)')
    })

    it('describes github target', () => {
      const targets: SaveTarget = { database: false, vault: false, github: true }
      const result = describeSaveTargets(targets)

      expect(result).toContain('GitHub (Pull Request)')
    })

    it('describes all targets when enabled', () => {
      const targets: SaveTarget = { database: true, vault: true, github: true }
      const result = describeSaveTargets(targets)

      expect(result).toHaveLength(3)
      expect(result).toContain('Local Database (IndexedDB)')
      expect(result).toContain('Vault Folder (filesystem)')
      expect(result).toContain('GitHub (Pull Request)')
    })

    it('returns empty array when nothing enabled', () => {
      const targets: SaveTarget = { database: false, vault: false, github: false }
      const result = describeSaveTargets(targets)

      expect(result).toEqual([])
    })
  })

  // ============================================================================
  // generateMetadataDiff
  // ============================================================================

  describe('generateMetadataDiff', () => {
    it('detects title changes', () => {
      const oldMeta: StrandMetadata = { title: 'Old Title' }
      const newMeta: StrandMetadata = { title: 'New Title' }

      const diff = generateMetadataDiff(oldMeta, newMeta)

      expect(diff.some(d => d.includes('Title:'))).toBe(true)
      expect(diff.some(d => d.includes('Old Title'))).toBe(true)
      expect(diff.some(d => d.includes('New Title'))).toBe(true)
    })

    it('detects summary changes', () => {
      const oldMeta: StrandMetadata = { title: 'Test', summary: 'Old summary' }
      const newMeta: StrandMetadata = { title: 'Test', summary: 'New summary' }

      const diff = generateMetadataDiff(oldMeta, newMeta)

      expect(diff).toContain('Summary updated')
    })

    it('detects tag changes', () => {
      const oldMeta: StrandMetadata = { title: 'Test', tags: ['old', 'tags'] }
      const newMeta: StrandMetadata = { title: 'Test', tags: ['new', 'tags'] }

      const diff = generateMetadataDiff(oldMeta, newMeta)

      expect(diff.some(d => d.includes('Tags:'))).toBe(true)
    })

    it('handles string vs array tags', () => {
      const oldMeta: StrandMetadata = { title: 'Test', tags: 'single' }
      const newMeta: StrandMetadata = { title: 'Test', tags: ['multiple', 'tags'] }

      const diff = generateMetadataDiff(oldMeta, newMeta)

      expect(diff.some(d => d.includes('Tags:'))).toBe(true)
    })

    it('detects subject changes', () => {
      const oldMeta: StrandMetadata = {
        title: 'Test',
        taxonomy: { subjects: ['Old Subject'] },
      }
      const newMeta: StrandMetadata = {
        title: 'Test',
        taxonomy: { subjects: ['New Subject'] },
      }

      const diff = generateMetadataDiff(oldMeta, newMeta)

      expect(diff.some(d => d.includes('Subjects:'))).toBe(true)
    })

    it('detects topic changes', () => {
      const oldMeta: StrandMetadata = {
        title: 'Test',
        taxonomy: { topics: ['Topic A'] },
      }
      const newMeta: StrandMetadata = {
        title: 'Test',
        taxonomy: { topics: ['Topic B', 'Topic C'] },
      }

      const diff = generateMetadataDiff(oldMeta, newMeta)

      expect(diff.some(d => d.includes('Topics:'))).toBe(true)
    })

    it('detects simple difficulty changes', () => {
      const oldMeta: StrandMetadata = { title: 'Test', difficulty: 'beginner' }
      const newMeta: StrandMetadata = { title: 'Test', difficulty: 'advanced' }

      const diff = generateMetadataDiff(oldMeta, newMeta)

      expect(diff.some(d => d.includes('Difficulty:'))).toBe(true)
    })

    it('detects object difficulty overall changes', () => {
      const oldMeta: StrandMetadata = {
        title: 'Test',
        difficulty: { overall: 2 },
      }
      const newMeta: StrandMetadata = {
        title: 'Test',
        difficulty: { overall: 4 },
      }

      const diff = generateMetadataDiff(oldMeta, newMeta)

      expect(diff.some(d => d.includes('Difficulty:'))).toBe(true)
    })

    it('detects publishing status changes', () => {
      const oldMeta: StrandMetadata = {
        title: 'Test',
        publishing: { status: 'draft' },
      }
      const newMeta: StrandMetadata = {
        title: 'Test',
        publishing: { status: 'published' },
      }

      const diff = generateMetadataDiff(oldMeta, newMeta)

      expect(diff.some(d => d.includes('Status:'))).toBe(true)
    })

    it('returns no changes message when nothing changed', () => {
      const metadata: StrandMetadata = {
        title: 'Test',
        summary: 'Summary',
        tags: ['tag1'],
      }

      const diff = generateMetadataDiff(metadata, { ...metadata })

      expect(diff).toContain('No significant changes detected')
    })

    it('handles undefined values in old metadata', () => {
      const oldMeta: StrandMetadata = { title: 'Test' }
      const newMeta: StrandMetadata = {
        title: 'Test',
        tags: ['new-tag'],
        taxonomy: { subjects: ['Subject'] },
        difficulty: 'intermediate',
        publishing: { status: 'draft' },
      }

      const diff = generateMetadataDiff(oldMeta, newMeta)

      expect(diff.length).toBeGreaterThan(0)
    })

    it('handles undefined values in new metadata', () => {
      const oldMeta: StrandMetadata = {
        title: 'Test',
        tags: ['old-tag'],
        taxonomy: { subjects: ['Subject'] },
        difficulty: 'intermediate',
        publishing: { status: 'draft' },
      }
      const newMeta: StrandMetadata = { title: 'Test' }

      const diff = generateMetadataDiff(oldMeta, newMeta)

      expect(diff.length).toBeGreaterThan(0)
    })
  })

  // ============================================================================
  // saveStrandMetadata
  // ============================================================================

  describe('saveStrandMetadata', () => {
    const baseOptions: SaveOptions = {
      strand: { title: 'Test Strand' },
      originalStrand: { title: 'Original' },
      contentBody: '# Content',
      strandPath: 'weaves/test/looms/loom1/strands/strand1.md',
      contentSource: { type: 'sqlite' },
    }

    it('saves to database', async () => {
      const result = await saveStrandMetadata(baseOptions)

      expect(result.savedTo).toContain('database')
      expect(mockUpdateStrandMetadata).toHaveBeenCalledWith(
        baseOptions.strandPath,
        baseOptions.strand,
        baseOptions.contentBody
      )
    })

    it('saves to vault when handle provided', async () => {
      const options: SaveOptions = {
        ...baseOptions,
        vaultHandle: {} as FileSystemDirectoryHandle,
      }

      const result = await saveStrandMetadata(options)

      expect(result.savedTo).toContain('database')
      expect(result.savedTo).toContain('vault')
      expect(mockWriteVaultFile).toHaveBeenCalled()
    })

    it('creates GitHub PR when configured', async () => {
      const options: SaveOptions = {
        ...baseOptions,
        contentSource: { type: 'github', githubRepo: 'owner/repo' },
        githubConfig: {
          owner: 'owner',
          repo: 'repo',
          branch: 'main',
          pat: 'ghp_token123',
        },
      }

      const result = await saveStrandMetadata(options)

      expect(result.savedTo).toContain('database')
      expect(result.savedTo).toContain('github')
      expect(result.prUrl).toBe('https://github.com/owner/repo/pull/1')
      expect(result.prBranch).toBe('metadata-update-123')
    })

    it('records database error', async () => {
      mockUpdateStrandMetadata.mockRejectedValueOnce(new Error('DB write failed'))

      const result = await saveStrandMetadata(baseOptions)

      expect(result.savedTo).not.toContain('database')
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].target).toBe('database')
      expect(result.errors[0].error).toBe('DB write failed')
    })

    it('records vault error', async () => {
      mockWriteVaultFile.mockRejectedValueOnce(new Error('Vault write failed'))

      const options: SaveOptions = {
        ...baseOptions,
        vaultHandle: {} as FileSystemDirectoryHandle,
      }

      const result = await saveStrandMetadata(options)

      expect(result.savedTo).toContain('database')
      expect(result.savedTo).not.toContain('vault')
      expect(result.errors.some(e => e.target === 'vault')).toBe(true)
    })

    it('records GitHub error', async () => {
      mockCreateMetadataPR.mockRejectedValueOnce(new Error('PR creation failed'))

      const options: SaveOptions = {
        ...baseOptions,
        contentSource: { type: 'github', githubRepo: 'owner/repo' },
        githubConfig: {
          owner: 'owner',
          repo: 'repo',
          branch: 'main',
          pat: 'ghp_token123',
        },
      }

      const result = await saveStrandMetadata(options)

      expect(result.savedTo).not.toContain('github')
      expect(result.errors.some(e => e.target === 'github')).toBe(true)
    })

    it('continues saving to other targets after error', async () => {
      mockUpdateStrandMetadata.mockRejectedValueOnce(new Error('DB failed'))

      const options: SaveOptions = {
        ...baseOptions,
        vaultHandle: {} as FileSystemDirectoryHandle,
      }

      const result = await saveStrandMetadata(options)

      // Should still try vault after DB fails
      expect(mockWriteVaultFile).toHaveBeenCalled()
      expect(result.errors.some(e => e.target === 'database')).toBe(true)
      expect(result.savedTo).toContain('vault')
    })

    it('skips vault for bundled source', async () => {
      const options: SaveOptions = {
        ...baseOptions,
        contentSource: { type: 'bundled' },
        vaultHandle: {} as FileSystemDirectoryHandle,
      }

      const result = await saveStrandMetadata(options)

      expect(result.savedTo).not.toContain('vault')
      expect(mockWriteVaultFile).not.toHaveBeenCalled()
    })

    it('skips GitHub without PAT', async () => {
      const options: SaveOptions = {
        ...baseOptions,
        contentSource: { type: 'github', githubRepo: 'owner/repo' },
        githubConfig: {
          owner: 'owner',
          repo: 'repo',
          branch: 'main',
          // No PAT
        },
      }

      const result = await saveStrandMetadata(options)

      expect(result.savedTo).not.toContain('github')
      expect(mockCreateMetadataPR).not.toHaveBeenCalled()
    })

    it('returns empty arrays for minimal save', async () => {
      const result = await saveStrandMetadata(baseOptions)

      expect(result.errors).toEqual([])
      expect(result.prUrl).toBeUndefined()
      expect(result.prBranch).toBeUndefined()
    })
  })
})
