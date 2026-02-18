/**
 * Source Detection Tests
 * @module __tests__/unit/canvas/sourceDetection
 *
 * Tests for platform detection and URL metadata extraction
 */

import { describe, it, expect } from 'vitest'
import {
  detectPlatform,
  extractPlatformMetadata,
  getPlatformBadgeStyles,
  isValidUrl,
  normalizeUrl,
  type Platform,
} from '@/lib/canvas/sourceDetection'

describe('sourceDetection', () => {
  describe('detectPlatform', () => {
    it('should detect Pinterest URLs', () => {
      expect(detectPlatform('https://pinterest.com/pin/123456')).toBe('pinterest')
      expect(detectPlatform('https://www.pinterest.com/pin/987654321')).toBe('pinterest')
      expect(detectPlatform('https://pinterest.ca/pin/123')).toBe('pinterest')
      expect(detectPlatform('https://pin.it/abc123')).toBe('pinterest')
    })

    it('should detect Instagram URLs', () => {
      expect(detectPlatform('https://instagram.com/p/ABC123')).toBe('instagram')
      expect(detectPlatform('https://www.instagram.com/reel/XYZ789')).toBe('instagram')
      expect(detectPlatform('https://instagram.com/tv/video123')).toBe('instagram')
      expect(detectPlatform('https://instagram.com/username')).toBe('instagram')
    })

    it('should detect Twitter/X URLs', () => {
      expect(detectPlatform('https://twitter.com/user/status/123456')).toBe('twitter')
      expect(detectPlatform('https://x.com/user/status/789012')).toBe('twitter')
      expect(detectPlatform('https://twitter.com/username')).toBe('twitter')
    })

    it('should detect YouTube URLs', () => {
      expect(detectPlatform('https://youtube.com/watch?v=dQw4w9WgXcQ')).toBe('youtube')
      expect(detectPlatform('https://youtu.be/dQw4w9WgXcQ')).toBe('youtube')
      expect(detectPlatform('https://youtube.com/shorts/abc123')).toBe('youtube')
      expect(detectPlatform('https://youtube.com/embed/xyz789')).toBe('youtube')
    })

    it('should detect Medium URLs', () => {
      expect(detectPlatform('https://medium.com/@user/article-title-123')).toBe('medium')
      expect(detectPlatform('https://user.medium.com/my-article-456')).toBe('medium')
    })

    it('should detect GitHub URLs', () => {
      expect(detectPlatform('https://github.com/user/repo')).toBe('github')
      expect(detectPlatform('https://gist.github.com/user/abc123')).toBe('github')
    })

    it('should detect Notion URLs', () => {
      expect(detectPlatform('https://notion.so/page-id-123')).toBe('notion')
      expect(detectPlatform('https://notion.site/my-page')).toBe('notion')
    })

    it('should detect TikTok URLs', () => {
      expect(detectPlatform('https://tiktok.com/@user/video/123456')).toBe('tiktok')
      expect(detectPlatform('https://tiktok.com/t/abc123')).toBe('tiktok')
    })

    it('should detect LinkedIn URLs', () => {
      expect(detectPlatform('https://linkedin.com/posts/user-activity-123')).toBe('linkedin')
      expect(detectPlatform('https://linkedin.com/in/username')).toBe('linkedin')
    })

    it('should detect Reddit URLs', () => {
      expect(detectPlatform('https://reddit.com/r/subreddit/comments/abc123')).toBe('reddit')
      expect(detectPlatform('https://redd.it/abc123')).toBe('reddit')
    })

    it('should detect Dribbble URLs', () => {
      expect(detectPlatform('https://dribbble.com/shots/123456')).toBe('dribbble')
    })

    it('should detect Behance URLs', () => {
      expect(detectPlatform('https://behance.net/gallery/123456')).toBe('behance')
    })

    it('should detect Figma URLs', () => {
      expect(detectPlatform('https://figma.com/file/abc123')).toBe('figma')
      expect(detectPlatform('https://figma.com/design/xyz789')).toBe('figma')
    })

    it('should detect Spotify URLs', () => {
      expect(detectPlatform('https://open.spotify.com/track/abc123')).toBe('spotify')
      expect(detectPlatform('https://open.spotify.com/album/xyz789')).toBe('spotify')
      expect(detectPlatform('https://open.spotify.com/playlist/123abc')).toBe('spotify')
    })

    it('should detect SoundCloud URLs', () => {
      expect(detectPlatform('https://soundcloud.com/artist/track-name')).toBe('soundcloud')
    })

    it('should return generic for unknown URLs', () => {
      expect(detectPlatform('https://example.com/page')).toBe('generic')
      expect(detectPlatform('https://random-site.org/article')).toBe('generic')
      expect(detectPlatform('')).toBe('generic')
    })
  })

  describe('extractPlatformMetadata', () => {
    it('should extract Pinterest pin ID', () => {
      const metadata = extractPlatformMetadata('https://pinterest.com/pin/123456789')

      expect(metadata.platform).toBe('pinterest')
      expect(metadata.contentId).toBe('123456789')
      expect(metadata.platformName).toBe('Pinterest')
      expect(metadata.accentColor).toBe('#E60023')
      expect(metadata.iconName).toBe('pin')
    })

    it('should extract Instagram post data', () => {
      const metadata = extractPlatformMetadata('https://instagram.com/p/ABC123xyz')

      expect(metadata.platform).toBe('instagram')
      expect(metadata.contentId).toBe('ABC123xyz')
      expect(metadata.platformName).toBe('Instagram')
      expect(metadata.accentColor).toBe('#E4405F')
    })

    it('should extract Instagram username', () => {
      const metadata = extractPlatformMetadata('https://instagram.com/cool_user')

      expect(metadata.platform).toBe('instagram')
      expect(metadata.username).toBe('cool_user')
    })

    it('should extract Twitter/X post data', () => {
      const metadata = extractPlatformMetadata('https://twitter.com/elonmusk/status/123456789')

      expect(metadata.platform).toBe('twitter')
      expect(metadata.username).toBe('elonmusk')
      expect(metadata.contentId).toBe('123456789')
      expect(metadata.platformName).toBe('X (Twitter)')
    })

    it('should extract YouTube video ID and generate thumbnail', () => {
      const metadata = extractPlatformMetadata('https://youtube.com/watch?v=dQw4w9WgXcQ')

      expect(metadata.platform).toBe('youtube')
      expect(metadata.contentId).toBe('dQw4w9WgXcQ')
      expect(metadata.thumbnailUrl).toBe('https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg')
      expect(metadata.embedUrl).toBe('https://www.youtube.com/embed/dQw4w9WgXcQ')
    })

    it('should extract YouTube shorts video ID', () => {
      const metadata = extractPlatformMetadata('https://youtube.com/shorts/abc123')

      expect(metadata.contentId).toBe('abc123')
      expect(metadata.embedUrl).toContain('abc123')
    })

    it('should extract GitHub repo data', () => {
      const metadata = extractPlatformMetadata('https://github.com/facebook/react')

      expect(metadata.platform).toBe('github')
      expect(metadata.username).toBe('facebook')
      expect(metadata.contentId).toBe('react')
      expect(metadata.title).toBe('facebook/react')
    })

    it('should extract Spotify track data', () => {
      const metadata = extractPlatformMetadata('https://open.spotify.com/track/abc123xyz')

      expect(metadata.platform).toBe('spotify')
      expect(metadata.contentId).toBe('abc123xyz')
      expect(metadata.embedUrl).toBe('https://open.spotify.com/embed/track/abc123xyz')
    })

    it('should extract Figma file ID', () => {
      const metadata = extractPlatformMetadata('https://figma.com/file/abc123xyz')

      expect(metadata.platform).toBe('figma')
      expect(metadata.contentId).toBe('abc123xyz')
    })

    it('should handle generic URLs', () => {
      const metadata = extractPlatformMetadata('https://example.com/page')

      expect(metadata.platform).toBe('generic')
      expect(metadata.platformName).toBe('Web')
      expect(metadata.accentColor).toBe('#6B7280')
      expect(metadata.iconName).toBe('globe')
    })
  })

  describe('getPlatformBadgeStyles', () => {
    it('should return correct colors for Pinterest', () => {
      const styles = getPlatformBadgeStyles('pinterest')

      expect(styles.backgroundColor).toContain('#E60023')
      expect(styles.textColor).toBe('#E60023')
      expect(styles.borderColor).toContain('#E60023')
    })

    it('should return correct colors for YouTube', () => {
      const styles = getPlatformBadgeStyles('youtube')

      expect(styles.textColor).toBe('#FF0000')
    })

    it('should return correct colors for Spotify', () => {
      const styles = getPlatformBadgeStyles('spotify')

      expect(styles.textColor).toBe('#1DB954')
    })

    it('should return opacity values in background and border', () => {
      const styles = getPlatformBadgeStyles('instagram')

      // Background should have 20 (0.125 opacity in hex)
      expect(styles.backgroundColor).toMatch(/#[0-9A-Fa-f]{6}20/)
      // Border should have 40 (0.25 opacity in hex)
      expect(styles.borderColor).toMatch(/#[0-9A-Fa-f]{6}40/)
    })
  })

  describe('isValidUrl', () => {
    it('should return true for valid URLs', () => {
      expect(isValidUrl('https://example.com')).toBe(true)
      expect(isValidUrl('http://test.org/path')).toBe(true)
      expect(isValidUrl('https://sub.domain.com/path?query=1')).toBe(true)
    })

    it('should return false for invalid URLs', () => {
      expect(isValidUrl('not-a-url')).toBe(false)
      expect(isValidUrl('example.com')).toBe(false)
      expect(isValidUrl('')).toBe(false)
      // Note: 'ftp:/missing-slash' is actually parsed as valid by URL API
      expect(isValidUrl('://no-protocol')).toBe(false)
    })
  })

  describe('normalizeUrl', () => {
    it('should add https:// if protocol is missing', () => {
      expect(normalizeUrl('example.com')).toBe('https://example.com')
      expect(normalizeUrl('www.test.org/path')).toBe('https://www.test.org/path')
    })

    it('should preserve existing http:// protocol', () => {
      expect(normalizeUrl('http://example.com')).toBe('http://example.com')
    })

    it('should preserve existing https:// protocol', () => {
      expect(normalizeUrl('https://example.com')).toBe('https://example.com')
    })

    it('should remove trailing slashes', () => {
      expect(normalizeUrl('https://example.com/')).toBe('https://example.com')
      expect(normalizeUrl('example.com/')).toBe('https://example.com')
    })

    it('should trim whitespace', () => {
      expect(normalizeUrl('  https://example.com  ')).toBe('https://example.com')
    })
  })
})
