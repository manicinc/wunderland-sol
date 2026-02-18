/**
 * Social Platform Registry Tests
 * @module tests/unit/social/platforms
 *
 * Tests for the social platform detection and metadata extraction utilities.
 */

import { describe, it, expect } from 'vitest'
import {
  SOCIAL_PLATFORMS,
  detectPlatformFromUrl,
  extractPostId,
  extractUsername,
  getPlatformById,
  type SocialPlatform,
} from '@/lib/social/platforms'

describe('Social Platforms', () => {
  describe('SOCIAL_PLATFORMS registry', () => {
    it('should contain all expected platforms', () => {
      const platformIds = SOCIAL_PLATFORMS.map(p => p.id)

      expect(platformIds).toContain('reddit')
      expect(platformIds).toContain('twitter')
      expect(platformIds).toContain('instagram')
      expect(platformIds).toContain('pinterest')
      expect(platformIds).toContain('youtube')
      expect(platformIds).toContain('tiktok')
      expect(platformIds).toContain('facebook')
      expect(platformIds).toContain('linkedin')
      expect(platformIds).toContain('mastodon')
      expect(platformIds).toContain('threads')
    })

    it('should have valid brand colors for all platforms', () => {
      for (const platform of SOCIAL_PLATFORMS) {
        expect(platform.color).toMatch(/^#[0-9A-Fa-f]{6}$/)
        expect(platform.name).toBeTruthy()
        expect(platform.icon).toBeTruthy()
      }
    })

    it('should have host patterns for all platforms', () => {
      for (const platform of SOCIAL_PLATFORMS) {
        expect(platform.hostPatterns.length).toBeGreaterThan(0)
        expect(platform.hostPatterns[0]).toBeInstanceOf(RegExp)
      }
    })
  })

  describe('detectPlatformFromUrl', () => {
    it('should detect Reddit URLs', () => {
      const urls = [
        'https://reddit.com/r/programming/comments/abc123',
        'https://www.reddit.com/r/news',
        'https://old.reddit.com/r/test',
        'https://redd.it/abc123',
      ]

      for (const url of urls) {
        const platform = detectPlatformFromUrl(url)
        expect(platform?.id).toBe('reddit')
      }
    })

    it('should detect Twitter/X URLs', () => {
      const urls = [
        'https://twitter.com/user/status/123456',
        'https://x.com/user/status/789',
        'https://mobile.twitter.com/user',
      ]

      for (const url of urls) {
        const platform = detectPlatformFromUrl(url)
        expect(platform?.id).toBe('twitter')
      }
    })

    it('should detect Instagram URLs', () => {
      const urls = [
        'https://instagram.com/p/ABC123',
        'https://www.instagram.com/reel/XYZ789',
        'https://www.instagram.com/natgeo/',
      ]

      for (const url of urls) {
        const platform = detectPlatformFromUrl(url)
        expect(platform?.id).toBe('instagram')
      }
    })

    it('should detect Pinterest URLs', () => {
      const urls = [
        'https://pinterest.com/pin/123456',
        'https://www.pinterest.com/user/board',
        'https://pin.it/abc123',
      ]

      for (const url of urls) {
        const platform = detectPlatformFromUrl(url)
        expect(platform?.id).toBe('pinterest')
      }
    })

    it('should detect YouTube URLs', () => {
      const urls = [
        'https://youtube.com/watch?v=abc123',
        'https://www.youtube.com/shorts/xyz',
        'https://youtu.be/abc123',
        'https://m.youtube.com/watch?v=test',
      ]

      for (const url of urls) {
        const platform = detectPlatformFromUrl(url)
        expect(platform?.id).toBe('youtube')
      }
    })

    it('should detect TikTok URLs', () => {
      const urls = [
        'https://tiktok.com/@user/video/123',
        'https://www.tiktok.com/@test',
        'https://vm.tiktok.com/abc',
      ]

      for (const url of urls) {
        const platform = detectPlatformFromUrl(url)
        expect(platform?.id).toBe('tiktok')
      }
    })

    it('should detect LinkedIn URLs', () => {
      const urls = [
        'https://linkedin.com/posts/user_activity',
        'https://www.linkedin.com/in/username',
      ]

      for (const url of urls) {
        const platform = detectPlatformFromUrl(url)
        expect(platform?.id).toBe('linkedin')
      }
    })

    it('should return null for non-social URLs', () => {
      const urls = [
        'https://example.com',
        'https://github.com/user/repo',
        'https://google.com/search?q=test',
        'not-a-url',
      ]

      for (const url of urls) {
        const platform = detectPlatformFromUrl(url)
        expect(platform).toBeNull()
      }
    })

    it('should handle invalid URLs gracefully', () => {
      const platform = detectPlatformFromUrl('')
      expect(platform).toBeNull()
    })
  })

  describe('extractPostId', () => {
    it('should extract Reddit post IDs', () => {
      const url = 'https://reddit.com/r/programming/comments/abc123/title'
      const postId = extractPostId(url)
      expect(postId).toBe('abc123')
    })

    it('should extract Twitter status IDs', () => {
      const url = 'https://twitter.com/user/status/1234567890'
      const postId = extractPostId(url)
      expect(postId).toBe('1234567890')
    })

    it('should extract Instagram post IDs', () => {
      const url = 'https://instagram.com/p/CxYz123ABC'
      const postId = extractPostId(url)
      expect(postId).toBe('CxYz123ABC')
    })

    it('should extract YouTube video IDs', () => {
      const url = 'https://youtube.com/watch?v=dQw4w9WgXcQ'
      const postId = extractPostId(url)
      expect(postId).toBe('dQw4w9WgXcQ')
    })

    it('should return null for URLs without post IDs', () => {
      const url = 'https://reddit.com/r/programming'
      const postId = extractPostId(url)
      expect(postId).toBeNull()
    })
  })

  describe('extractUsername', () => {
    it('should extract Reddit usernames', () => {
      const url = 'https://reddit.com/user/testuser/submitted'
      const username = extractUsername(url)
      expect(username).toBe('u/testuser')
    })

    it('should extract Twitter usernames', () => {
      const url = 'https://twitter.com/elonmusk/status/123'
      const username = extractUsername(url)
      expect(username).toBe('@elonmusk')
    })

    it('should extract Instagram usernames', () => {
      const url = 'https://instagram.com/natgeo/p/ABC123'
      const username = extractUsername(url)
      expect(username).toBe('@natgeo')
    })

    it('should extract TikTok usernames', () => {
      const url = 'https://tiktok.com/@testuser/video/123'
      const username = extractUsername(url)
      expect(username).toBe('@testuser')
    })

    it('should return null for non-social URLs', () => {
      const username = extractUsername('https://example.com')
      expect(username).toBeNull()
    })
  })

  describe('getPlatformById', () => {
    it('should return platform for valid ID', () => {
      const reddit = getPlatformById('reddit')
      expect(reddit?.name).toBe('Reddit')
      expect(reddit?.color).toBe('#FF4500')

      const twitter = getPlatformById('twitter')
      expect(twitter?.name).toBe('Twitter / X')
    })

    it('should return null for invalid ID', () => {
      const platform = getPlatformById('nonexistent')
      expect(platform).toBeNull()
    })

    it('should be case-sensitive', () => {
      const platform = getPlatformById('Reddit')
      expect(platform).toBeNull()
    })
  })
})
