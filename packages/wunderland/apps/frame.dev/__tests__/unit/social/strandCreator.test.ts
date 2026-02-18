/**
 * Social Strand Creator Tests
 * @module tests/unit/social/strandCreator
 *
 * Tests for creating strands from social media imports.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  createStrandFromSocialImport,
  buildSocialStrandFrontmatter,
  buildSocialStrandMarkdown,
  type SocialImportResult,
} from '@/lib/social/strandCreator'

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
vi.stubGlobal('localStorage', localStorageMock)

// Mock getUserProfile
vi.mock('@/lib/localStorage', () => ({
  getUserProfile: () => ({
    displayName: 'Test User',
  }),
}))

describe('Social Strand Creator', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.getItem.mockReturnValue(null)
  })

  const mockImportResult: SocialImportResult = {
    content: '# Test Post\n\nThis is test content from a social post.',
    title: 'Test Social Post',
    metadata: {
      author: 'testauthor',
      siteName: 'Reddit',
      platform: {
        id: 'reddit',
        name: 'Reddit',
        icon: 'MessageSquare',
        color: '#FF4500',
      },
      postId: 'abc123',
      username: 'u/testuser',
      profileUrl: 'https://reddit.com/u/testuser',
      engagement: {
        upvotes: 1500,
        comments: 42,
      },
      hashtags: ['#programming', '#javascript'],
      mentions: ['@mention1'],
      postedAt: '2024-01-15T10:00:00Z',
    },
  }

  describe('createStrandFromSocialImport', () => {
    it('should create strand data from import result', () => {
      const strandData = createStrandFromSocialImport(
        mockImportResult,
        'https://reddit.com/r/programming/comments/abc123'
      )

      expect(strandData.id).toBeTruthy()
      expect(strandData.slug).toBeTruthy()
      expect(strandData.title).toBe('Test Social Post')
      expect(strandData.content).toBe(mockImportResult.content)
      expect(strandData.platformId).toBe('reddit')
      expect(strandData.sourceUrl).toBe('https://reddit.com/r/programming/comments/abc123')
    })

    it('should convert hashtags to tags', () => {
      const strandData = createStrandFromSocialImport(
        mockImportResult,
        'https://reddit.com/r/test'
      )

      expect(strandData.tags).toContain('programming')
      expect(strandData.tags).toContain('javascript')
      expect(strandData.tags).toContain('reddit') // Platform ID added
    })

    it('should include custom tags', () => {
      const strandData = createStrandFromSocialImport(
        mockImportResult,
        'https://reddit.com/r/test',
        { customTags: ['favorite', 'reference'] }
      )

      expect(strandData.tags).toContain('favorite')
      expect(strandData.tags).toContain('reference')
    })

    it('should use custom title when provided', () => {
      const strandData = createStrandFromSocialImport(
        mockImportResult,
        'https://reddit.com/r/test',
        { customTitle: 'My Custom Title' }
      )

      expect(strandData.title).toBe('My Custom Title')
    })

    it('should create valid source metadata', () => {
      const strandData = createStrandFromSocialImport(
        mockImportResult,
        'https://reddit.com/r/test'
      )

      expect(strandData.sourceMetadata.sourceType).toBe('scrape')
      expect(strandData.sourceMetadata.socialPlatform).toBe('reddit')
      expect(strandData.sourceMetadata.socialUsername).toBe('u/testuser')
      expect(strandData.sourceMetadata.socialEngagement?.upvotes).toBe(1500)
    })

    it('should set scrapedAt timestamp', () => {
      const before = new Date().toISOString()
      const strandData = createStrandFromSocialImport(
        mockImportResult,
        'https://reddit.com/r/test'
      )
      const after = new Date().toISOString()

      expect(strandData.scrapedAt >= before).toBe(true)
      expect(strandData.scrapedAt <= after).toBe(true)
    })

    it('should generate URL-safe slug', () => {
      const importWithSpecialChars: SocialImportResult = {
        ...mockImportResult,
        title: 'Test Post: With Special Characters! @#$%',
      }

      const strandData = createStrandFromSocialImport(
        importWithSpecialChars,
        'https://reddit.com/r/test'
      )

      expect(strandData.slug).not.toContain(':')
      expect(strandData.slug).not.toContain('!')
      expect(strandData.slug).not.toContain('@')
      expect(strandData.slug).toMatch(/^[a-z0-9-]+$/)
    })
  })

  describe('buildSocialStrandFrontmatter', () => {
    it('should build valid YAML frontmatter', () => {
      const strandData = createStrandFromSocialImport(
        mockImportResult,
        'https://reddit.com/r/test'
      )
      const frontmatter = buildSocialStrandFrontmatter(strandData)

      expect(frontmatter).toContain('---')
      expect(frontmatter).toContain(`id: "${strandData.id}"`)
      expect(frontmatter).toContain(`slug: "${strandData.slug}"`)
      expect(frontmatter).toContain(`title: "${strandData.title}"`)
    })

    it('should include source metadata', () => {
      const strandData = createStrandFromSocialImport(
        mockImportResult,
        'https://reddit.com/r/test'
      )
      const frontmatter = buildSocialStrandFrontmatter(strandData)

      expect(frontmatter).toContain('source:')
      expect(frontmatter).toContain('type: "scrape"')
      expect(frontmatter).toContain('platform: "reddit"')
      expect(frontmatter).toContain('username: "u/testuser"')
    })

    it('should include tags', () => {
      const strandData = createStrandFromSocialImport(
        mockImportResult,
        'https://reddit.com/r/test'
      )
      const frontmatter = buildSocialStrandFrontmatter(strandData)

      expect(frontmatter).toContain('tags:')
    })

    it('should escape quotes in title', () => {
      const importWithQuotes: SocialImportResult = {
        ...mockImportResult,
        title: 'He said "hello" to everyone',
      }

      const strandData = createStrandFromSocialImport(
        importWithQuotes,
        'https://reddit.com/r/test'
      )
      const frontmatter = buildSocialStrandFrontmatter(strandData)

      expect(frontmatter).toContain('\\"hello\\"')
    })
  })

  describe('buildSocialStrandMarkdown', () => {
    it('should combine frontmatter and content', () => {
      const strandData = createStrandFromSocialImport(
        mockImportResult,
        'https://reddit.com/r/test'
      )
      const markdown = buildSocialStrandMarkdown(strandData)

      expect(markdown).toContain('---')
      expect(markdown).toContain(strandData.content)
    })

    it('should have proper structure', () => {
      const strandData = createStrandFromSocialImport(
        mockImportResult,
        'https://reddit.com/r/test'
      )
      const markdown = buildSocialStrandMarkdown(strandData)

      // Should start with frontmatter
      expect(markdown.startsWith('---')).toBe(true)

      // Should have double newline between frontmatter and content
      expect(markdown).toContain('---\n\n')
    })
  })
})
