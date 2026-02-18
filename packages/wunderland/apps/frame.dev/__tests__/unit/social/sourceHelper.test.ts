/**
 * Social Source Helper Tests
 * @module tests/unit/social/sourceHelper
 *
 * Tests for social metadata extraction and source helper utilities.
 */

import { describe, it, expect } from 'vitest'
import {
  extractHashtags,
  extractMentions,
  extractSocialTags,
  parseEngagementCount,
  parseEngagementFromDescription,
  buildProfileUrl,
  hasSocialMetadata,
} from '@/lib/social/sourceHelper'
import type { SourceMetadata } from '@/types/sourceMetadata'

describe('Social Source Helper', () => {
  describe('extractHashtags', () => {
    it('should extract hashtags from text', () => {
      const text = 'Check out #programming and #typescript! Great #resources'
      const hashtags = extractHashtags(text)

      expect(hashtags).toContain('#programming')
      expect(hashtags).toContain('#typescript')
      expect(hashtags).toContain('#resources')
      expect(hashtags).toHaveLength(3)
    })

    it('should lowercase hashtags', () => {
      const text = '#JavaScript #REACT #NextJS'
      const hashtags = extractHashtags(text)

      expect(hashtags).toContain('#javascript')
      expect(hashtags).toContain('#react')
      expect(hashtags).toContain('#nextjs')
    })

    it('should deduplicate hashtags', () => {
      const text = '#test #TEST #Test'
      const hashtags = extractHashtags(text)

      expect(hashtags).toHaveLength(1)
      expect(hashtags[0]).toBe('#test')
    })

    it('should handle unicode hashtags', () => {
      const text = '#日本語 #한국어 #émoji'
      const hashtags = extractHashtags(text)

      expect(hashtags.length).toBeGreaterThan(0)
    })

    it('should return empty array for text without hashtags', () => {
      const text = 'No hashtags here'
      const hashtags = extractHashtags(text)

      expect(hashtags).toEqual([])
    })
  })

  describe('extractMentions', () => {
    it('should extract @mentions from text', () => {
      const text = 'Thanks @john and @jane for the help!'
      const mentions = extractMentions(text)

      expect(mentions).toContain('@john')
      expect(mentions).toContain('@jane')
      expect(mentions).toHaveLength(2)
    })

    it('should lowercase mentions', () => {
      const text = '@UserOne @USERTWO @UserThree'
      const mentions = extractMentions(text)

      expect(mentions).toContain('@userone')
      expect(mentions).toContain('@usertwo')
      expect(mentions).toContain('@userthree')
    })

    it('should deduplicate mentions', () => {
      const text = '@user @USER @User'
      const mentions = extractMentions(text)

      expect(mentions).toHaveLength(1)
    })

    it('should return empty array for text without mentions', () => {
      const mentions = extractMentions('No mentions here')
      expect(mentions).toEqual([])
    })
  })

  describe('extractSocialTags', () => {
    it('should extract both hashtags and mentions', () => {
      const text = '@user posted about #topic with @friend #related'
      const { hashtags, mentions } = extractSocialTags(text)

      expect(hashtags).toContain('#topic')
      expect(hashtags).toContain('#related')
      expect(mentions).toContain('@user')
      expect(mentions).toContain('@friend')
    })
  })

  describe('parseEngagementCount', () => {
    it('should parse plain numbers', () => {
      expect(parseEngagementCount('1234')).toBe(1234)
      expect(parseEngagementCount('500')).toBe(500)
    })

    it('should parse K suffix', () => {
      expect(parseEngagementCount('1.5K')).toBe(1500)
      expect(parseEngagementCount('2k')).toBe(2000)
      expect(parseEngagementCount('10K')).toBe(10000)
    })

    it('should parse M suffix', () => {
      expect(parseEngagementCount('1.2M')).toBe(1200000)
      expect(parseEngagementCount('5m')).toBe(5000000)
    })

    it('should parse B suffix', () => {
      expect(parseEngagementCount('1B')).toBe(1000000000)
      expect(parseEngagementCount('2.5b')).toBe(2500000000)
    })

    it('should handle commas and spaces', () => {
      expect(parseEngagementCount('1,234')).toBe(1234)
      expect(parseEngagementCount('1 234')).toBe(1234)
    })

    it('should return undefined for invalid input', () => {
      expect(parseEngagementCount('')).toBeUndefined()
      expect(parseEngagementCount('abc')).toBeUndefined()
    })
  })

  describe('parseEngagementFromDescription', () => {
    it('should extract likes from description', () => {
      const description = '500 likes, 20 comments'
      const engagement = parseEngagementFromDescription(description, 'instagram')

      expect(engagement.likes).toBe(500)
      expect(engagement.comments).toBe(20)
    })

    it('should extract views', () => {
      const description = '1.5M views on this video'
      const engagement = parseEngagementFromDescription(description, 'youtube')

      expect(engagement.views).toBe(1500000)
    })

    it('should extract upvotes', () => {
      const description = '2.5K upvotes in this thread'
      const engagement = parseEngagementFromDescription(description, 'reddit')

      expect(engagement.upvotes).toBe(2500)
    })

    it('should extract shares/retweets', () => {
      const description = '100 retweets, 500 likes'
      const engagement = parseEngagementFromDescription(description, 'twitter')

      expect(engagement.shares).toBe(100)
      expect(engagement.likes).toBe(500)
    })

    it('should handle emoji indicators', () => {
      // Format: number followed by emoji (e.g., "1.2K ❤️")
      const description = '1.2K ❤️, 50 💬'
      const engagement = parseEngagementFromDescription(description, 'instagram')

      expect(engagement.likes).toBe(1200)
      expect(engagement.comments).toBe(50)
    })

    it('should return empty object for no matches', () => {
      const engagement = parseEngagementFromDescription('Just text here', 'twitter')
      expect(Object.keys(engagement)).toHaveLength(0)
    })
  })

  describe('buildProfileUrl', () => {
    it('should build Reddit profile URL', () => {
      const url = buildProfileUrl('reddit', 'testuser')
      expect(url).toBe('https://reddit.com/u/testuser')
    })

    it('should build Twitter profile URL', () => {
      const url = buildProfileUrl('twitter', '@username')
      expect(url).toBe('https://twitter.com/username')
    })

    it('should build Instagram profile URL', () => {
      const url = buildProfileUrl('instagram', 'user')
      expect(url).toBe('https://instagram.com/user')
    })

    it('should build YouTube profile URL', () => {
      const url = buildProfileUrl('youtube', 'channel')
      expect(url).toBe('https://youtube.com/@channel')
    })

    it('should build TikTok profile URL', () => {
      const url = buildProfileUrl('tiktok', '@creator')
      expect(url).toBe('https://tiktok.com/@creator')
    })

    it('should strip @ and u/ prefixes', () => {
      expect(buildProfileUrl('twitter', '@user')).toBe('https://twitter.com/user')
      expect(buildProfileUrl('reddit', 'u/user')).toBe('https://reddit.com/u/user')
    })

    it('should return null for unknown platforms', () => {
      const url = buildProfileUrl('unknown', 'user')
      expect(url).toBeNull()
    })
  })

  describe('hasSocialMetadata', () => {
    it('should return true for metadata with socialPlatform', () => {
      const metadata: SourceMetadata = {
        sourceType: 'scrape',
        createdAt: new Date().toISOString(),
        creator: 'test',
        creatorType: 'scraped',
        socialPlatform: 'reddit',
      }

      expect(hasSocialMetadata(metadata)).toBe(true)
    })

    it('should return false for metadata without socialPlatform', () => {
      const metadata: SourceMetadata = {
        sourceType: 'manual',
        createdAt: new Date().toISOString(),
        creator: 'test',
        creatorType: 'session',
      }

      expect(hasSocialMetadata(metadata)).toBe(false)
    })
  })
})
