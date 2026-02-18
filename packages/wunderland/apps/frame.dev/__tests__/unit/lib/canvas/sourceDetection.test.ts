/**
 * Source Detection Tests
 * @module __tests__/unit/lib/canvas/sourceDetection.test
 *
 * Tests for platform detection from URLs and metadata extraction.
 */

import { describe, it, expect } from 'vitest'
import {
  detectPlatform,
  extractPlatformMetadata,
  getPlatformBadgeStyles,
  isValidUrl,
  normalizeUrl,
  PLATFORM_INFO,
  type Platform,
} from '@/lib/canvas/sourceDetection'

describe('Source Detection', () => {
  // ============================================================================
  // detectPlatform
  // ============================================================================

  describe('detectPlatform', () => {
    it('returns generic for empty string', () => {
      expect(detectPlatform('')).toBe('generic')
    })

    it('returns generic for invalid URL', () => {
      expect(detectPlatform('not-a-url')).toBe('generic')
    })

    // Pinterest
    describe('Pinterest', () => {
      it('detects pinterest.com pin URL', () => {
        expect(detectPlatform('https://pinterest.com/pin/123456789/')).toBe('pinterest')
      })

      it('detects pinterest.ca URL', () => {
        expect(detectPlatform('https://pinterest.ca/pin/123456789')).toBe('pinterest')
      })

      it('detects pinterest.co.uk URL', () => {
        expect(detectPlatform('https://pinterest.co.uk/pin/123456789')).toBe('pinterest')
      })

      it('detects pin.it short URL', () => {
        expect(detectPlatform('https://pin.it/abc123')).toBe('pinterest')
      })
    })

    // Instagram
    describe('Instagram', () => {
      it('detects instagram post URL', () => {
        expect(detectPlatform('https://instagram.com/p/ABC123xyz/')).toBe('instagram')
      })

      it('detects instagram reel URL', () => {
        expect(detectPlatform('https://instagram.com/reel/ABC123xyz')).toBe('instagram')
      })

      it('detects instagram tv URL', () => {
        expect(detectPlatform('https://instagram.com/tv/ABC123xyz')).toBe('instagram')
      })

      it('detects instagram profile URL', () => {
        expect(detectPlatform('https://instagram.com/username')).toBe('instagram')
      })
    })

    // Twitter/X
    describe('Twitter/X', () => {
      it('detects twitter status URL', () => {
        expect(detectPlatform('https://twitter.com/user/status/123456789')).toBe('twitter')
      })

      it('detects x.com status URL', () => {
        expect(detectPlatform('https://x.com/user/status/123456789')).toBe('twitter')
      })

      it('detects twitter profile URL', () => {
        expect(detectPlatform('https://twitter.com/username')).toBe('twitter')
      })

      it('detects x.com profile URL', () => {
        expect(detectPlatform('https://x.com/username')).toBe('twitter')
      })
    })

    // YouTube
    describe('YouTube', () => {
      it('detects youtube watch URL', () => {
        expect(detectPlatform('https://youtube.com/watch?v=dQw4w9WgXcQ')).toBe('youtube')
      })

      it('detects youtu.be short URL', () => {
        expect(detectPlatform('https://youtu.be/dQw4w9WgXcQ')).toBe('youtube')
      })

      it('detects youtube shorts URL', () => {
        expect(detectPlatform('https://youtube.com/shorts/ABC123xyz')).toBe('youtube')
      })

      it('detects youtube embed URL', () => {
        expect(detectPlatform('https://youtube.com/embed/dQw4w9WgXcQ')).toBe('youtube')
      })
    })

    // Medium
    describe('Medium', () => {
      it('detects medium.com article URL', () => {
        expect(detectPlatform('https://medium.com/@username/article-title-123abc')).toBe('medium')
      })

      it('detects subdomain medium URL', () => {
        expect(detectPlatform('https://username.medium.com/article-title')).toBe('medium')
      })
    })

    // GitHub
    describe('GitHub', () => {
      it('detects github repo URL', () => {
        expect(detectPlatform('https://github.com/owner/repo-name')).toBe('github')
      })

      it('detects gist URL', () => {
        expect(detectPlatform('https://gist.github.com/user/abc123')).toBe('github')
      })
    })

    // Notion
    describe('Notion', () => {
      it('detects notion.so URL', () => {
        expect(detectPlatform('https://notion.so/page-title-abc123')).toBe('notion')
      })

      it('detects notion.site URL', () => {
        expect(detectPlatform('https://notion.site/page-title-abc123')).toBe('notion')
      })
    })

    // TikTok
    describe('TikTok', () => {
      it('detects tiktok video URL', () => {
        expect(detectPlatform('https://tiktok.com/@username/video/1234567890')).toBe('tiktok')
      })

      it('detects tiktok short URL', () => {
        expect(detectPlatform('https://tiktok.com/t/abc123')).toBe('tiktok')
      })
    })

    // LinkedIn
    describe('LinkedIn', () => {
      it('detects linkedin post URL', () => {
        expect(detectPlatform('https://linkedin.com/posts/user-name-abc123')).toBe('linkedin')
      })

      it('detects linkedin profile URL', () => {
        expect(detectPlatform('https://linkedin.com/in/username')).toBe('linkedin')
      })
    })

    // Reddit
    describe('Reddit', () => {
      it('detects reddit post URL', () => {
        expect(detectPlatform('https://reddit.com/r/subreddit/comments/abc123/title')).toBe('reddit')
      })

      it('detects redd.it short URL', () => {
        expect(detectPlatform('https://redd.it/abc123')).toBe('reddit')
      })
    })

    // Dribbble
    describe('Dribbble', () => {
      it('detects dribbble shot URL', () => {
        expect(detectPlatform('https://dribbble.com/shots/123456')).toBe('dribbble')
      })
    })

    // Behance
    describe('Behance', () => {
      it('detects behance gallery URL', () => {
        expect(detectPlatform('https://behance.net/gallery/123456/title')).toBe('behance')
      })
    })

    // Figma
    describe('Figma', () => {
      it('detects figma file URL', () => {
        expect(detectPlatform('https://figma.com/file/ABC123xyz/Design')).toBe('figma')
      })

      it('detects figma design URL', () => {
        expect(detectPlatform('https://figma.com/design/ABC123xyz/Design')).toBe('figma')
      })
    })

    // Spotify
    describe('Spotify', () => {
      it('detects spotify track URL', () => {
        expect(detectPlatform('https://open.spotify.com/track/ABC123xyz')).toBe('spotify')
      })

      it('detects spotify album URL', () => {
        expect(detectPlatform('https://open.spotify.com/album/ABC123xyz')).toBe('spotify')
      })

      it('detects spotify playlist URL', () => {
        expect(detectPlatform('https://open.spotify.com/playlist/ABC123xyz')).toBe('spotify')
      })

      it('detects spotify episode URL', () => {
        expect(detectPlatform('https://open.spotify.com/episode/ABC123xyz')).toBe('spotify')
      })
    })

    // SoundCloud
    describe('SoundCloud', () => {
      it('detects soundcloud track URL', () => {
        expect(detectPlatform('https://soundcloud.com/artist-name/track-name')).toBe('soundcloud')
      })
    })

    // Case insensitivity
    it('handles uppercase URLs', () => {
      expect(detectPlatform('HTTPS://YOUTUBE.COM/WATCH?V=ABC123')).toBe('youtube')
    })

    it('handles mixed case URLs', () => {
      expect(detectPlatform('https://GitHub.Com/Owner/Repo')).toBe('github')
    })
  })

  // ============================================================================
  // extractPlatformMetadata
  // ============================================================================

  describe('extractPlatformMetadata', () => {
    it('returns base metadata for any URL', () => {
      const result = extractPlatformMetadata('https://example.com')
      expect(result.platform).toBe('generic')
      expect(result.url).toBe('https://example.com')
      expect(result.accentColor).toBeDefined()
      expect(result.platformName).toBeDefined()
      expect(result.iconName).toBeDefined()
    })

    // Pinterest
    it('extracts Pinterest pin ID', () => {
      const result = extractPlatformMetadata('https://pinterest.com/pin/123456789/')
      expect(result.platform).toBe('pinterest')
      expect(result.contentId).toBe('123456789')
    })

    // Instagram
    it('extracts Instagram post ID', () => {
      const result = extractPlatformMetadata('https://instagram.com/p/ABC123xyz/')
      expect(result.platform).toBe('instagram')
      expect(result.contentId).toBe('ABC123xyz')
    })

    it('extracts Instagram username from profile', () => {
      const result = extractPlatformMetadata('https://instagram.com/username')
      expect(result.platform).toBe('instagram')
      expect(result.username).toBe('username')
    })

    // Twitter/X
    it('extracts Twitter username and status ID', () => {
      const result = extractPlatformMetadata('https://twitter.com/elonmusk/status/123456789')
      expect(result.platform).toBe('twitter')
      expect(result.username).toBe('elonmusk')
      expect(result.contentId).toBe('123456789')
    })

    // YouTube
    it('extracts YouTube video ID from watch URL', () => {
      const result = extractPlatformMetadata('https://youtube.com/watch?v=dQw4w9WgXcQ')
      expect(result.platform).toBe('youtube')
      expect(result.contentId).toBe('dQw4w9WgXcQ')
      expect(result.thumbnailUrl).toBe('https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg')
      expect(result.embedUrl).toBe('https://www.youtube.com/embed/dQw4w9WgXcQ')
    })

    it('extracts YouTube video ID from short URL', () => {
      const result = extractPlatformMetadata('https://youtu.be/dQw4w9WgXcQ')
      expect(result.contentId).toBe('dQw4w9WgXcQ')
    })

    it('extracts YouTube video ID from shorts URL', () => {
      const result = extractPlatformMetadata('https://youtube.com/shorts/ABC123xyz')
      expect(result.contentId).toBe('ABC123xyz')
    })

    it('extracts YouTube video ID from embed URL', () => {
      const result = extractPlatformMetadata('https://youtube.com/embed/dQw4w9WgXcQ')
      expect(result.contentId).toBe('dQw4w9WgXcQ')
    })

    // GitHub
    it('extracts GitHub owner and repo', () => {
      const result = extractPlatformMetadata('https://github.com/facebook/react')
      expect(result.platform).toBe('github')
      expect(result.username).toBe('facebook')
      expect(result.contentId).toBe('react')
      expect(result.title).toBe('facebook/react')
    })

    // Spotify
    it('extracts Spotify track ID and embed URL', () => {
      const result = extractPlatformMetadata('https://open.spotify.com/track/ABC123xyz')
      expect(result.platform).toBe('spotify')
      expect(result.contentId).toBe('ABC123xyz')
      expect(result.embedUrl).toBe('https://open.spotify.com/embed/track/ABC123xyz')
    })

    it('extracts Spotify playlist embed URL', () => {
      const result = extractPlatformMetadata('https://open.spotify.com/playlist/XYZ789')
      expect(result.embedUrl).toBe('https://open.spotify.com/embed/playlist/XYZ789')
    })

    // Figma
    it('extracts Figma file ID', () => {
      const result = extractPlatformMetadata('https://figma.com/file/ABC123xyz/Design')
      expect(result.platform).toBe('figma')
      expect(result.contentId).toBe('ABC123xyz')
    })
  })

  // ============================================================================
  // PLATFORM_INFO
  // ============================================================================

  describe('PLATFORM_INFO', () => {
    const platforms: Platform[] = [
      'pinterest', 'instagram', 'twitter', 'youtube', 'medium',
      'github', 'notion', 'tiktok', 'linkedin', 'reddit',
      'dribbble', 'behance', 'figma', 'spotify', 'soundcloud', 'generic',
    ]

    it('has info for all platforms', () => {
      platforms.forEach(platform => {
        expect(PLATFORM_INFO[platform]).toBeDefined()
      })
    })

    it('each platform has name, color, and icon', () => {
      platforms.forEach(platform => {
        const info = PLATFORM_INFO[platform]
        expect(info.name).toBeDefined()
        expect(typeof info.name).toBe('string')
        expect(info.color).toBeDefined()
        expect(info.color).toMatch(/^#[0-9A-Fa-f]{6}$/)
        expect(info.icon).toBeDefined()
        expect(typeof info.icon).toBe('string')
      })
    })

    it('Pinterest has correct color', () => {
      expect(PLATFORM_INFO.pinterest.color).toBe('#E60023')
    })

    it('Instagram has correct color', () => {
      expect(PLATFORM_INFO.instagram.color).toBe('#E4405F')
    })

    it('YouTube has correct color', () => {
      expect(PLATFORM_INFO.youtube.color).toBe('#FF0000')
    })

    it('GitHub has correct color', () => {
      expect(PLATFORM_INFO.github.color).toBe('#181717')
    })

    it('Spotify has correct color', () => {
      expect(PLATFORM_INFO.spotify.color).toBe('#1DB954')
    })
  })

  // ============================================================================
  // getPlatformBadgeStyles
  // ============================================================================

  describe('getPlatformBadgeStyles', () => {
    it('returns badge styles object', () => {
      const styles = getPlatformBadgeStyles('youtube')
      expect(styles.backgroundColor).toBeDefined()
      expect(styles.textColor).toBeDefined()
      expect(styles.borderColor).toBeDefined()
    })

    it('text color matches platform color', () => {
      const styles = getPlatformBadgeStyles('youtube')
      expect(styles.textColor).toBe('#FF0000')
    })

    it('background color has opacity', () => {
      const styles = getPlatformBadgeStyles('youtube')
      expect(styles.backgroundColor).toBe('#FF000020')
    })

    it('border color has opacity', () => {
      const styles = getPlatformBadgeStyles('youtube')
      expect(styles.borderColor).toBe('#FF000040')
    })

    it('works for all platforms', () => {
      const platforms: Platform[] = ['pinterest', 'instagram', 'github', 'spotify', 'generic']
      platforms.forEach(platform => {
        const styles = getPlatformBadgeStyles(platform)
        expect(styles.backgroundColor.length).toBeGreaterThan(0)
        expect(styles.textColor.length).toBeGreaterThan(0)
        expect(styles.borderColor.length).toBeGreaterThan(0)
      })
    })
  })

  // ============================================================================
  // isValidUrl
  // ============================================================================

  describe('isValidUrl', () => {
    it('returns true for valid https URL', () => {
      expect(isValidUrl('https://example.com')).toBe(true)
    })

    it('returns true for valid http URL', () => {
      expect(isValidUrl('http://example.com')).toBe(true)
    })

    it('returns true for URL with path', () => {
      expect(isValidUrl('https://example.com/path/to/page')).toBe(true)
    })

    it('returns true for URL with query params', () => {
      expect(isValidUrl('https://example.com?foo=bar&baz=qux')).toBe(true)
    })

    it('returns true for URL with fragment', () => {
      expect(isValidUrl('https://example.com#section')).toBe(true)
    })

    it('returns true for URL with port', () => {
      expect(isValidUrl('https://example.com:8080')).toBe(true)
    })

    it('returns false for empty string', () => {
      expect(isValidUrl('')).toBe(false)
    })

    it('returns false for plain text', () => {
      expect(isValidUrl('not a url')).toBe(false)
    })

    it('returns false for URL without protocol', () => {
      expect(isValidUrl('example.com')).toBe(false)
    })

    it('returns false for just protocol', () => {
      expect(isValidUrl('https://')).toBe(false)
    })

    it('returns false for relative path', () => {
      expect(isValidUrl('/path/to/page')).toBe(false)
    })
  })

  // ============================================================================
  // normalizeUrl
  // ============================================================================

  describe('normalizeUrl', () => {
    it('adds https:// to URL without protocol', () => {
      expect(normalizeUrl('example.com')).toBe('https://example.com')
    })

    it('preserves https:// prefix', () => {
      expect(normalizeUrl('https://example.com')).toBe('https://example.com')
    })

    it('preserves http:// prefix', () => {
      expect(normalizeUrl('http://example.com')).toBe('http://example.com')
    })

    it('removes trailing slash', () => {
      expect(normalizeUrl('https://example.com/')).toBe('https://example.com')
    })

    it('trims whitespace', () => {
      expect(normalizeUrl('  https://example.com  ')).toBe('https://example.com')
    })

    it('handles path with trailing slash', () => {
      expect(normalizeUrl('https://example.com/path/')).toBe('https://example.com/path')
    })

    it('preserves query params', () => {
      expect(normalizeUrl('example.com?foo=bar')).toBe('https://example.com?foo=bar')
    })

    it('preserves fragment', () => {
      expect(normalizeUrl('example.com#section')).toBe('https://example.com#section')
    })
  })

  // ============================================================================
  // Integration tests
  // ============================================================================

  describe('integration', () => {
    it('full flow: detect, extract, and style', () => {
      const url = 'https://youtube.com/watch?v=dQw4w9WgXcQ'

      const platform = detectPlatform(url)
      expect(platform).toBe('youtube')

      const metadata = extractPlatformMetadata(url)
      expect(metadata.platform).toBe('youtube')
      expect(metadata.contentId).toBe('dQw4w9WgXcQ')

      const styles = getPlatformBadgeStyles(metadata.platform)
      expect(styles.textColor).toBe('#FF0000')
    })

    it('normalize then detect', () => {
      const rawUrl = 'github.com/facebook/react/'
      const normalized = normalizeUrl(rawUrl)
      const platform = detectPlatform(normalized)

      expect(normalized).toBe('https://github.com/facebook/react')
      expect(platform).toBe('github')
    })

    it('validate then extract', () => {
      const url = 'https://open.spotify.com/track/ABC123'

      if (isValidUrl(url)) {
        const metadata = extractPlatformMetadata(url)
        expect(metadata.platform).toBe('spotify')
        expect(metadata.contentId).toBe('ABC123')
      }
    })
  })
})
