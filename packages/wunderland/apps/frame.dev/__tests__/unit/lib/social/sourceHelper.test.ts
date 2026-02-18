/**
 * Social Source Helper Tests
 * @module __tests__/unit/lib/social/sourceHelper.test
 *
 * Tests for social source metadata helper functions.
 */

import { describe, it, expect } from 'vitest'
import {
  extractHashtags,
  extractMentions,
  extractSocialTags,
  parseEngagementCount,
  parseEngagementFromDescription,
  buildProfileUrl,
} from '@/lib/social/sourceHelper'

// ============================================================================
// extractHashtags
// ============================================================================

describe('extractHashtags', () => {
  describe('basic extraction', () => {
    it('extracts single hashtag', () => {
      expect(extractHashtags('Hello #world')).toEqual(['#world'])
    })

    it('extracts multiple hashtags', () => {
      const result = extractHashtags('Check out #react and #typescript')
      expect(result).toContain('#react')
      expect(result).toContain('#typescript')
    })

    it('extracts hashtags at start of text', () => {
      expect(extractHashtags('#hello world')).toEqual(['#hello'])
    })

    it('extracts hashtags at end of text', () => {
      expect(extractHashtags('Hello world #goodbye')).toEqual(['#goodbye'])
    })
  })

  describe('deduplication', () => {
    it('removes duplicate hashtags', () => {
      expect(extractHashtags('#test #test #test')).toEqual(['#test'])
    })

    it('normalizes case for deduplication', () => {
      expect(extractHashtags('#Test #TEST #test')).toEqual(['#test'])
    })
  })

  describe('unicode support', () => {
    it('extracts hashtags with unicode characters', () => {
      expect(extractHashtags('#日本語 #émoji')).toContain('#日本語')
      expect(extractHashtags('#日本語 #émoji')).toContain('#émoji')
    })
  })

  describe('edge cases', () => {
    it('returns empty array for no hashtags', () => {
      expect(extractHashtags('Hello world')).toEqual([])
    })

    it('returns empty array for empty string', () => {
      expect(extractHashtags('')).toEqual([])
    })

    it('handles lone # symbol', () => {
      expect(extractHashtags('# alone')).toEqual([])
    })

    it('handles # in middle of word', () => {
      expect(extractHashtags('C#')).toEqual([])
    })
  })

  describe('special characters', () => {
    it('extracts hashtags with numbers', () => {
      expect(extractHashtags('#web3 #100DaysOfCode')).toContain('#web3')
      expect(extractHashtags('#web3 #100DaysOfCode')).toContain('#100daysofcode')
    })

    it('extracts hashtags with underscores', () => {
      expect(extractHashtags('#hello_world')).toEqual(['#hello_world'])
    })
  })
})

// ============================================================================
// extractMentions
// ============================================================================

describe('extractMentions', () => {
  describe('basic extraction', () => {
    it('extracts single mention', () => {
      expect(extractMentions('Hello @user')).toEqual(['@user'])
    })

    it('extracts multiple mentions', () => {
      const result = extractMentions('Hey @alice and @bob')
      expect(result).toContain('@alice')
      expect(result).toContain('@bob')
    })

    it('extracts mentions at start of text', () => {
      expect(extractMentions('@user said hello')).toEqual(['@user'])
    })

    it('extracts mentions at end of text', () => {
      expect(extractMentions('Thanks @user')).toEqual(['@user'])
    })
  })

  describe('deduplication', () => {
    it('removes duplicate mentions', () => {
      expect(extractMentions('@user @user @user')).toEqual(['@user'])
    })

    it('normalizes case for deduplication', () => {
      expect(extractMentions('@User @USER @user')).toEqual(['@user'])
    })
  })

  describe('unicode support', () => {
    it('extracts mentions with unicode characters', () => {
      expect(extractMentions('@日本語 @émoji')).toContain('@日本語')
      expect(extractMentions('@日本語 @émoji')).toContain('@émoji')
    })
  })

  describe('edge cases', () => {
    it('returns empty array for no mentions', () => {
      expect(extractMentions('Hello world')).toEqual([])
    })

    it('returns empty array for empty string', () => {
      expect(extractMentions('')).toEqual([])
    })

    it('handles lone @ symbol', () => {
      expect(extractMentions('@ alone')).toEqual([])
    })

    it('handles email-like patterns', () => {
      // Note: The regex will match the part after @
      const result = extractMentions('email@example.com')
      expect(result).toContain('@example')
    })
  })

  describe('special characters', () => {
    it('extracts mentions with numbers', () => {
      expect(extractMentions('@user123')).toEqual(['@user123'])
    })

    it('extracts mentions with underscores', () => {
      expect(extractMentions('@hello_world')).toEqual(['@hello_world'])
    })
  })
})

// ============================================================================
// extractSocialTags
// ============================================================================

describe('extractSocialTags', () => {
  it('extracts both hashtags and mentions', () => {
    const result = extractSocialTags('Hello @user #topic')
    expect(result.hashtags).toEqual(['#topic'])
    expect(result.mentions).toEqual(['@user'])
  })

  it('handles text with only hashtags', () => {
    const result = extractSocialTags('#hello #world')
    expect(result.hashtags).toContain('#hello')
    expect(result.hashtags).toContain('#world')
    expect(result.mentions).toEqual([])
  })

  it('handles text with only mentions', () => {
    const result = extractSocialTags('@alice @bob')
    expect(result.mentions).toContain('@alice')
    expect(result.mentions).toContain('@bob')
    expect(result.hashtags).toEqual([])
  })

  it('handles text with no tags', () => {
    const result = extractSocialTags('Just plain text')
    expect(result.hashtags).toEqual([])
    expect(result.mentions).toEqual([])
  })

  it('handles empty string', () => {
    const result = extractSocialTags('')
    expect(result.hashtags).toEqual([])
    expect(result.mentions).toEqual([])
  })

  it('handles complex text with multiple tags', () => {
    const result = extractSocialTags(
      'Check out @MrBeast new video #youtube #creator shoutout to @pewdiepie'
    )
    expect(result.hashtags).toContain('#youtube')
    expect(result.hashtags).toContain('#creator')
    expect(result.mentions).toContain('@mrbeast')
    expect(result.mentions).toContain('@pewdiepie')
  })
})

// ============================================================================
// parseEngagementCount
// ============================================================================

describe('parseEngagementCount', () => {
  describe('plain numbers', () => {
    it('parses plain numbers', () => {
      expect(parseEngagementCount('1000')).toBe(1000)
      expect(parseEngagementCount('42')).toBe(42)
      expect(parseEngagementCount('0')).toBe(0)
    })

    it('parses numbers with commas', () => {
      expect(parseEngagementCount('1,000')).toBe(1000)
      expect(parseEngagementCount('1,234,567')).toBe(1234567)
    })

    it('parses numbers with spaces', () => {
      expect(parseEngagementCount('1 000')).toBe(1000)
    })
  })

  describe('K suffix', () => {
    it('parses K suffix', () => {
      expect(parseEngagementCount('1K')).toBe(1000)
      expect(parseEngagementCount('1k')).toBe(1000)
      expect(parseEngagementCount('10K')).toBe(10000)
    })

    it('parses decimal K values', () => {
      expect(parseEngagementCount('1.5K')).toBe(1500)
      expect(parseEngagementCount('2.5k')).toBe(2500)
      expect(parseEngagementCount('10.5K')).toBe(10500)
    })
  })

  describe('M suffix', () => {
    it('parses M suffix', () => {
      expect(parseEngagementCount('1M')).toBe(1000000)
      expect(parseEngagementCount('1m')).toBe(1000000)
      expect(parseEngagementCount('5M')).toBe(5000000)
    })

    it('parses decimal M values', () => {
      expect(parseEngagementCount('1.5M')).toBe(1500000)
      expect(parseEngagementCount('2.3m')).toBe(2300000)
    })
  })

  describe('B suffix', () => {
    it('parses B suffix', () => {
      expect(parseEngagementCount('1B')).toBe(1000000000)
      expect(parseEngagementCount('1b')).toBe(1000000000)
    })

    it('parses decimal B values', () => {
      expect(parseEngagementCount('1.5B')).toBe(1500000000)
    })
  })

  describe('edge cases', () => {
    it('returns undefined for empty string', () => {
      expect(parseEngagementCount('')).toBeUndefined()
    })

    it('returns undefined for non-numeric string', () => {
      expect(parseEngagementCount('abc')).toBeUndefined()
      expect(parseEngagementCount('not a number')).toBeUndefined()
    })

    it('rounds to nearest integer', () => {
      expect(parseEngagementCount('1.9')).toBe(2)
      expect(parseEngagementCount('1.1')).toBe(1)
    })
  })
})

// ============================================================================
// parseEngagementFromDescription
// ============================================================================

describe('parseEngagementFromDescription', () => {
  describe('likes', () => {
    it('extracts likes count', () => {
      const result = parseEngagementFromDescription('1.5K likes', 'twitter')
      expect(result.likes).toBe(1500)
    })

    it('extracts likes with heart emoji', () => {
      const result = parseEngagementFromDescription('500 ❤️', 'instagram')
      expect(result.likes).toBe(500)
    })

    it('extracts likes with heart symbol', () => {
      const result = parseEngagementFromDescription('1K ♥', 'facebook')
      expect(result.likes).toBe(1000)
    })
  })

  describe('comments', () => {
    it('extracts comments count', () => {
      const result = parseEngagementFromDescription('200 comments', 'facebook')
      expect(result.comments).toBe(200)
    })

    it('extracts comments with emoji', () => {
      const result = parseEngagementFromDescription('50 💬', 'instagram')
      expect(result.comments).toBe(50)
    })
  })

  describe('shares', () => {
    it('extracts shares count', () => {
      const result = parseEngagementFromDescription('100 shares', 'facebook')
      expect(result.shares).toBe(100)
    })

    it('extracts retweets', () => {
      const result = parseEngagementFromDescription('500 retweets', 'twitter')
      expect(result.shares).toBe(500)
    })

    it('extracts shares with emoji', () => {
      const result = parseEngagementFromDescription('1K 🔁', 'twitter')
      expect(result.shares).toBe(1000)
    })
  })

  describe('views', () => {
    it('extracts views count', () => {
      const result = parseEngagementFromDescription('1M views', 'youtube')
      expect(result.views).toBe(1000000)
    })

    it('extracts views with emoji', () => {
      const result = parseEngagementFromDescription('500K 👁', 'tiktok')
      expect(result.views).toBe(500000)
    })
  })

  describe('upvotes', () => {
    it('extracts upvotes count', () => {
      const result = parseEngagementFromDescription('5K upvotes', 'reddit')
      expect(result.upvotes).toBe(5000)
    })

    it('extracts upvotes with emoji', () => {
      const result = parseEngagementFromDescription('1000 ⬆', 'reddit')
      expect(result.upvotes).toBe(1000)
    })
  })

  describe('saves', () => {
    it('extracts saves count', () => {
      const result = parseEngagementFromDescription('200 saves', 'pinterest')
      expect(result.saves).toBe(200)
    })

    it('extracts saves with emoji', () => {
      const result = parseEngagementFromDescription('50 📌', 'pinterest')
      expect(result.saves).toBe(50)
    })
  })

  describe('multiple metrics', () => {
    it('extracts multiple engagement metrics', () => {
      const result = parseEngagementFromDescription('10K likes 500 comments 1K shares', 'facebook')
      expect(result.likes).toBe(10000)
      expect(result.comments).toBe(500)
      expect(result.shares).toBe(1000)
    })
  })

  describe('edge cases', () => {
    it('returns empty object for no engagement', () => {
      const result = parseEngagementFromDescription('Just a description', 'twitter')
      expect(result).toEqual({})
    })

    it('returns empty object for empty string', () => {
      const result = parseEngagementFromDescription('', 'twitter')
      expect(result).toEqual({})
    })
  })
})

// ============================================================================
// buildProfileUrl
// ============================================================================

describe('buildProfileUrl', () => {
  describe('Reddit', () => {
    it('builds profile URL', () => {
      expect(buildProfileUrl('reddit', 'username')).toBe('https://reddit.com/u/username')
    })

    it('strips u/ prefix', () => {
      expect(buildProfileUrl('reddit', 'u/username')).toBe('https://reddit.com/u/username')
    })
  })

  describe('Twitter', () => {
    it('builds profile URL', () => {
      expect(buildProfileUrl('twitter', 'elonmusk')).toBe('https://twitter.com/elonmusk')
    })

    it('strips @ prefix', () => {
      expect(buildProfileUrl('twitter', '@elonmusk')).toBe('https://twitter.com/elonmusk')
    })
  })

  describe('Instagram', () => {
    it('builds profile URL', () => {
      expect(buildProfileUrl('instagram', 'instagram')).toBe('https://instagram.com/instagram')
    })

    it('strips @ prefix', () => {
      expect(buildProfileUrl('instagram', '@instagram')).toBe('https://instagram.com/instagram')
    })
  })

  describe('YouTube', () => {
    it('builds profile URL with @ prefix', () => {
      expect(buildProfileUrl('youtube', 'MrBeast')).toBe('https://youtube.com/@MrBeast')
    })
  })

  describe('TikTok', () => {
    it('builds profile URL with @ prefix', () => {
      expect(buildProfileUrl('tiktok', 'username')).toBe('https://tiktok.com/@username')
    })
  })

  describe('Facebook', () => {
    it('builds profile URL', () => {
      expect(buildProfileUrl('facebook', 'zuck')).toBe('https://facebook.com/zuck')
    })
  })

  describe('LinkedIn', () => {
    it('builds profile URL', () => {
      expect(buildProfileUrl('linkedin', 'williamhgates')).toBe(
        'https://linkedin.com/in/williamhgates'
      )
    })
  })

  describe('Pinterest', () => {
    it('builds profile URL', () => {
      expect(buildProfileUrl('pinterest', 'username')).toBe('https://pinterest.com/username')
    })
  })

  describe('Threads', () => {
    it('builds profile URL with @ prefix', () => {
      expect(buildProfileUrl('threads', 'zuck')).toBe('https://threads.net/@zuck')
    })
  })

  describe('edge cases', () => {
    it('returns null for unknown platform', () => {
      expect(buildProfileUrl('unknown', 'user')).toBeNull()
    })

    it('returns null for empty platform', () => {
      expect(buildProfileUrl('', 'user')).toBeNull()
    })
  })
})

// ============================================================================
// Integration Tests
// ============================================================================

describe('social helper integration', () => {
  it('extracts all social metadata from tweet-like text', () => {
    const text =
      'Just released my new project! Check it out @github #opensource #coding Thanks @community'
    const tags = extractSocialTags(text)

    expect(tags.hashtags).toContain('#opensource')
    expect(tags.hashtags).toContain('#coding')
    expect(tags.mentions).toContain('@github')
    expect(tags.mentions).toContain('@community')
  })

  it('parses complex engagement description', () => {
    const description = 'Video has 1.2M views, 50K likes, 2.5K comments, and 500 shares'
    const engagement = parseEngagementFromDescription(description, 'youtube')

    expect(engagement.views).toBe(1200000)
    expect(engagement.likes).toBe(50000)
    expect(engagement.comments).toBe(2500)
    expect(engagement.shares).toBe(500)
  })
})
