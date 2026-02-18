/**
 * Social Platforms Tests
 * @module __tests__/unit/lib/social/platforms.test
 *
 * Tests for social platform registry and URL detection functions.
 */

import { describe, it, expect } from 'vitest'
import {
  SOCIAL_PLATFORMS,
  detectPlatformFromUrl,
  isSocialUrl,
  getPlatformById,
  extractPostId,
  extractUsername,
  getSupportedPlatformIds,
  getPlatformDisplayInfo,
} from '@/lib/social/platforms'

// ============================================================================
// SOCIAL_PLATFORMS Constant
// ============================================================================

describe('SOCIAL_PLATFORMS', () => {
  it('contains expected platforms', () => {
    const ids = SOCIAL_PLATFORMS.map((p) => p.id)
    expect(ids).toContain('reddit')
    expect(ids).toContain('twitter')
    expect(ids).toContain('instagram')
    expect(ids).toContain('youtube')
    expect(ids).toContain('tiktok')
    expect(ids).toContain('facebook')
    expect(ids).toContain('linkedin')
    expect(ids).toContain('pinterest')
    expect(ids).toContain('mastodon')
    expect(ids).toContain('threads')
  })

  it('has unique platform IDs', () => {
    const ids = SOCIAL_PLATFORMS.map((p) => p.id)
    const uniqueIds = [...new Set(ids)]
    expect(ids.length).toBe(uniqueIds.length)
  })

  describe('each platform has required fields', () => {
    SOCIAL_PLATFORMS.forEach((platform) => {
      it(`${platform.id} has required fields`, () => {
        expect(platform.id).toBeDefined()
        expect(platform.name).toBeDefined()
        expect(platform.hostPatterns).toBeDefined()
        expect(platform.hostPatterns.length).toBeGreaterThan(0)
        expect(platform.icon).toBeDefined()
        expect(platform.color).toMatch(/^#[A-Fa-f0-9]{6}$/)
        expect(platform.urlPatterns).toBeDefined()
        expect(platform.urlPatterns.post).toBeDefined()
        expect(platform.urlPatterns.user).toBeDefined()
        expect(platform.metadataSelectors).toBeDefined()
      })
    })
  })
})

// ============================================================================
// detectPlatformFromUrl
// ============================================================================

describe('detectPlatformFromUrl', () => {
  describe('Reddit', () => {
    it('detects reddit.com URLs', () => {
      const platform = detectPlatformFromUrl('https://www.reddit.com/r/programming/comments/abc123')
      expect(platform?.id).toBe('reddit')
    })

    it('detects redd.it short URLs', () => {
      const platform = detectPlatformFromUrl('https://redd.it/abc123')
      expect(platform?.id).toBe('reddit')
    })
  })

  describe('Twitter/X', () => {
    it('detects twitter.com URLs', () => {
      const platform = detectPlatformFromUrl('https://twitter.com/user/status/123456')
      expect(platform?.id).toBe('twitter')
    })

    it('detects x.com URLs', () => {
      const platform = detectPlatformFromUrl('https://x.com/user/status/123456')
      expect(platform?.id).toBe('twitter')
    })
  })

  describe('Instagram', () => {
    it('detects instagram.com post URLs', () => {
      const platform = detectPlatformFromUrl('https://www.instagram.com/p/ABC123xyz/')
      expect(platform?.id).toBe('instagram')
    })

    it('detects instagram.com reel URLs', () => {
      const platform = detectPlatformFromUrl('https://www.instagram.com/reel/ABC123xyz/')
      expect(platform?.id).toBe('instagram')
    })
  })

  describe('YouTube', () => {
    it('detects youtube.com watch URLs', () => {
      const platform = detectPlatformFromUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
      expect(platform?.id).toBe('youtube')
    })

    it('detects youtu.be short URLs', () => {
      const platform = detectPlatformFromUrl('https://youtu.be/dQw4w9WgXcQ')
      expect(platform?.id).toBe('youtube')
    })

    it('detects youtube.com shorts URLs', () => {
      const platform = detectPlatformFromUrl('https://www.youtube.com/shorts/dQw4w9WgXcQ')
      expect(platform?.id).toBe('youtube')
    })
  })

  describe('TikTok', () => {
    it('detects tiktok.com URLs', () => {
      const platform = detectPlatformFromUrl('https://www.tiktok.com/@user/video/123456')
      expect(platform?.id).toBe('tiktok')
    })
  })

  describe('Facebook', () => {
    it('detects facebook.com URLs', () => {
      const platform = detectPlatformFromUrl('https://www.facebook.com/user/posts/123456')
      expect(platform?.id).toBe('facebook')
    })

    it('detects fb.com URLs', () => {
      const platform = detectPlatformFromUrl('https://fb.com/user')
      expect(platform?.id).toBe('facebook')
    })
  })

  describe('LinkedIn', () => {
    it('detects linkedin.com URLs', () => {
      const platform = detectPlatformFromUrl('https://www.linkedin.com/in/username')
      expect(platform?.id).toBe('linkedin')
    })

    it('detects linkedin.com post URLs', () => {
      const platform = detectPlatformFromUrl('https://www.linkedin.com/posts/post-id-123')
      expect(platform?.id).toBe('linkedin')
    })
  })

  describe('Pinterest', () => {
    it('detects pinterest.com URLs', () => {
      const platform = detectPlatformFromUrl('https://www.pinterest.com/pin/123456/')
      expect(platform?.id).toBe('pinterest')
    })

    it('detects pin.it short URLs', () => {
      const platform = detectPlatformFromUrl('https://pin.it/abc123')
      expect(platform?.id).toBe('pinterest')
    })
  })

  describe('Mastodon', () => {
    it('detects mastodon.social URLs', () => {
      const platform = detectPlatformFromUrl('https://mastodon.social/@user/123456')
      expect(platform?.id).toBe('mastodon')
    })

    it('detects fosstodon.org URLs', () => {
      const platform = detectPlatformFromUrl('https://fosstodon.org/@user/123456')
      expect(platform?.id).toBe('mastodon')
    })

    it('detects hachyderm.io URLs', () => {
      const platform = detectPlatformFromUrl('https://hachyderm.io/@user/123456')
      expect(platform?.id).toBe('mastodon')
    })
  })

  describe('Threads', () => {
    it('detects threads.net URLs', () => {
      const platform = detectPlatformFromUrl('https://www.threads.net/@user/post/abc123')
      expect(platform?.id).toBe('threads')
    })
  })

  describe('unknown URLs', () => {
    it('returns null for non-social URLs', () => {
      expect(detectPlatformFromUrl('https://example.com')).toBeNull()
      expect(detectPlatformFromUrl('https://google.com')).toBeNull()
      expect(detectPlatformFromUrl('https://github.com/user/repo')).toBeNull()
    })

    it('returns null for invalid URLs', () => {
      expect(detectPlatformFromUrl('not-a-url')).toBeNull()
      expect(detectPlatformFromUrl('')).toBeNull()
    })
  })
})

// ============================================================================
// isSocialUrl
// ============================================================================

describe('isSocialUrl', () => {
  it('returns true for social platform URLs', () => {
    expect(isSocialUrl('https://twitter.com/user')).toBe(true)
    expect(isSocialUrl('https://www.instagram.com/p/abc123')).toBe(true)
    expect(isSocialUrl('https://www.reddit.com/r/programming')).toBe(true)
    expect(isSocialUrl('https://youtu.be/abc123')).toBe(true)
  })

  it('returns false for non-social URLs', () => {
    expect(isSocialUrl('https://example.com')).toBe(false)
    expect(isSocialUrl('https://github.com/user')).toBe(false)
    expect(isSocialUrl('https://news.ycombinator.com')).toBe(false)
  })

  it('returns false for invalid URLs', () => {
    expect(isSocialUrl('not-a-url')).toBe(false)
    expect(isSocialUrl('')).toBe(false)
  })
})

// ============================================================================
// getPlatformById
// ============================================================================

describe('getPlatformById', () => {
  it('returns platform for valid ID', () => {
    const reddit = getPlatformById('reddit')
    expect(reddit?.id).toBe('reddit')
    expect(reddit?.name).toBe('Reddit')

    const twitter = getPlatformById('twitter')
    expect(twitter?.id).toBe('twitter')
    expect(twitter?.name).toBe('Twitter / X')
  })

  it('returns null for unknown ID', () => {
    expect(getPlatformById('unknown')).toBeNull()
    expect(getPlatformById('')).toBeNull()
    expect(getPlatformById('REDDIT')).toBeNull() // Case sensitive
  })
})

// ============================================================================
// extractPostId
// ============================================================================

describe('extractPostId', () => {
  describe('Reddit', () => {
    it('extracts post ID from comments URL', () => {
      expect(extractPostId('https://www.reddit.com/r/programming/comments/abc123/title')).toBe(
        'abc123'
      )
    })

    it('extracts post ID from redd.it URL', () => {
      expect(extractPostId('https://redd.it/abc123')).toBe('abc123')
    })
  })

  describe('Twitter', () => {
    it('extracts tweet ID from status URL', () => {
      expect(extractPostId('https://twitter.com/user/status/1234567890123456789')).toBe(
        '1234567890123456789'
      )
    })

    it('extracts tweet ID from x.com URL', () => {
      expect(extractPostId('https://x.com/user/status/1234567890123456789')).toBe(
        '1234567890123456789'
      )
    })
  })

  describe('Instagram', () => {
    it('extracts post ID from /p/ URL', () => {
      expect(extractPostId('https://www.instagram.com/p/CxAbCdEfGhI/')).toBe('CxAbCdEfGhI')
    })

    it('extracts post ID from /reel/ URL', () => {
      expect(extractPostId('https://www.instagram.com/reel/CxAbCdEfGhI/')).toBe('CxAbCdEfGhI')
    })
  })

  describe('YouTube', () => {
    it('extracts video ID from watch URL', () => {
      expect(extractPostId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
    })

    it('extracts video ID from youtu.be URL', () => {
      expect(extractPostId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
    })

    it('extracts video ID from shorts URL', () => {
      expect(extractPostId('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
    })
  })

  describe('TikTok', () => {
    it('extracts video ID', () => {
      expect(extractPostId('https://www.tiktok.com/@user/video/1234567890123456789')).toBe(
        '1234567890123456789'
      )
    })
  })

  describe('Facebook', () => {
    it('extracts post ID from posts URL', () => {
      expect(extractPostId('https://www.facebook.com/user/posts/123456789')).toBe('123456789')
    })

    it('extracts post ID from videos URL', () => {
      expect(extractPostId('https://www.facebook.com/user/videos/123456789')).toBe('123456789')
    })
  })

  describe('LinkedIn', () => {
    it('extracts post ID from posts URL', () => {
      expect(extractPostId('https://www.linkedin.com/posts/post-id-123')).toBe('post-id-123')
    })

    it('extracts article ID from pulse URL', () => {
      expect(extractPostId('https://www.linkedin.com/pulse/article-title-123')).toBe(
        'article-title-123'
      )
    })
  })

  describe('Pinterest', () => {
    it('extracts pin ID from pin URL', () => {
      expect(extractPostId('https://www.pinterest.com/pin/123456789/')).toBe('123456789')
    })

    it('extracts pin ID from pin.it URL', () => {
      expect(extractPostId('https://pin.it/abc123')).toBe('abc123')
    })
  })

  describe('Mastodon', () => {
    it('extracts post ID from user post URL', () => {
      expect(extractPostId('https://mastodon.social/@user/123456789')).toBe('123456789')
    })

    it('extracts post ID from statuses URL', () => {
      expect(extractPostId('https://mastodon.social/statuses/123456789')).toBe('123456789')
    })
  })

  describe('Threads', () => {
    it('extracts post ID from post URL', () => {
      expect(extractPostId('https://www.threads.net/@user/post/CxAbCdEfGhI')).toBe('CxAbCdEfGhI')
    })
  })

  describe('edge cases', () => {
    it('returns null for non-social URLs', () => {
      expect(extractPostId('https://example.com/post/123')).toBeNull()
    })

    it('returns null for invalid URLs', () => {
      expect(extractPostId('not-a-url')).toBeNull()
    })

    it('returns null for URLs without post IDs', () => {
      expect(extractPostId('https://twitter.com/user')).toBeNull()
    })
  })
})

// ============================================================================
// extractUsername
// ============================================================================

describe('extractUsername', () => {
  describe('Reddit', () => {
    it('extracts username from /u/ URL', () => {
      expect(extractUsername('https://www.reddit.com/u/username')).toBe('u/username')
    })

    it('extracts username from /user/ URL', () => {
      expect(extractUsername('https://www.reddit.com/user/username')).toBe('u/username')
    })
  })

  describe('Twitter', () => {
    it('extracts username from profile URL', () => {
      expect(extractUsername('https://twitter.com/elonmusk')).toBe('@elonmusk')
    })

    it('extracts username from x.com URL', () => {
      expect(extractUsername('https://x.com/elonmusk')).toBe('@elonmusk')
    })

    it('ignores reserved paths', () => {
      expect(extractUsername('https://twitter.com/home')).toBeNull()
      expect(extractUsername('https://twitter.com/search')).toBeNull()
      expect(extractUsername('https://twitter.com/explore')).toBeNull()
    })
  })

  describe('Instagram', () => {
    it('extracts username from profile URL', () => {
      expect(extractUsername('https://www.instagram.com/instagram/')).toBe('@instagram')
    })

    it('ignores reserved paths', () => {
      expect(extractUsername('https://www.instagram.com/p/abc123')).toBeNull()
      expect(extractUsername('https://www.instagram.com/reel/abc123')).toBeNull()
      expect(extractUsername('https://www.instagram.com/explore')).toBeNull()
    })
  })

  describe('YouTube', () => {
    it('extracts username from @ URL', () => {
      expect(extractUsername('https://www.youtube.com/@MrBeast')).toBe('@MrBeast')
    })

    it('extracts channel ID from channel URL', () => {
      expect(extractUsername('https://www.youtube.com/channel/UC-lHJZR3Gqxm24_Vd_AJ5Yw')).toBe(
        'UC-lHJZR3Gqxm24_Vd_AJ5Yw'
      )
    })
  })

  describe('TikTok', () => {
    it('extracts username from profile URL', () => {
      expect(extractUsername('https://www.tiktok.com/@username')).toBe('@username')
    })
  })

  describe('Facebook', () => {
    it('extracts username from profile URL', () => {
      expect(extractUsername('https://www.facebook.com/zuck')).toBe('zuck')
    })

    it('ignores reserved paths', () => {
      expect(extractUsername('https://www.facebook.com/groups/123')).toBeNull()
      expect(extractUsername('https://www.facebook.com/marketplace')).toBeNull()
    })
  })

  describe('LinkedIn', () => {
    it('extracts username from /in/ URL', () => {
      expect(extractUsername('https://www.linkedin.com/in/williamhgates')).toBe('williamhgates')
    })

    it('extracts company from /company/ URL', () => {
      expect(extractUsername('https://www.linkedin.com/company/microsoft')).toBe('microsoft')
    })
  })

  describe('Pinterest', () => {
    it('extracts username from profile URL', () => {
      expect(extractUsername('https://www.pinterest.com/username/')).toBe('username')
    })

    it('ignores reserved paths', () => {
      expect(extractUsername('https://www.pinterest.com/pin/123')).toBeNull()
      expect(extractUsername('https://www.pinterest.com/search')).toBeNull()
    })
  })

  describe('Mastodon', () => {
    it('extracts username from @ URL', () => {
      expect(extractUsername('https://mastodon.social/@username')).toBe('@username')
    })
  })

  describe('Threads', () => {
    it('extracts username from @ URL', () => {
      expect(extractUsername('https://www.threads.net/@zuck')).toBe('@zuck')
    })
  })

  describe('edge cases', () => {
    it('returns null for non-social URLs', () => {
      expect(extractUsername('https://example.com/user/123')).toBeNull()
    })

    it('returns null for invalid URLs', () => {
      expect(extractUsername('not-a-url')).toBeNull()
    })
  })
})

// ============================================================================
// getSupportedPlatformIds
// ============================================================================

describe('getSupportedPlatformIds', () => {
  it('returns array of platform IDs', () => {
    const ids = getSupportedPlatformIds()
    expect(Array.isArray(ids)).toBe(true)
    expect(ids.length).toBe(SOCIAL_PLATFORMS.length)
  })

  it('includes expected platforms', () => {
    const ids = getSupportedPlatformIds()
    expect(ids).toContain('reddit')
    expect(ids).toContain('twitter')
    expect(ids).toContain('instagram')
    expect(ids).toContain('youtube')
  })
})

// ============================================================================
// getPlatformDisplayInfo
// ============================================================================

describe('getPlatformDisplayInfo', () => {
  it('returns display info for valid platform', () => {
    const info = getPlatformDisplayInfo('reddit')
    expect(info).toEqual({
      name: 'Reddit',
      icon: 'MessageCircle',
      color: '#FF4500',
    })
  })

  it('returns display info for twitter', () => {
    const info = getPlatformDisplayInfo('twitter')
    expect(info).toEqual({
      name: 'Twitter / X',
      icon: 'Twitter',
      color: '#1DA1F2',
    })
  })

  it('returns display info for youtube', () => {
    const info = getPlatformDisplayInfo('youtube')
    expect(info).toEqual({
      name: 'YouTube',
      icon: 'Youtube',
      color: '#FF0000',
    })
  })

  it('returns null for unknown platform', () => {
    expect(getPlatformDisplayInfo('unknown')).toBeNull()
    expect(getPlatformDisplayInfo('')).toBeNull()
  })
})

// ============================================================================
// Platform Extractors
// ============================================================================

describe('platform extractors', () => {
  describe('Reddit extractors', () => {
    const reddit = getPlatformById('reddit')!

    it('extracts subreddit from HTML', () => {
      const html = '<a href="/r/programming">/r/programming</a>'
      const metadata = reddit.extractors?.customMetadata?.(html)
      expect(metadata?.subreddit).toBe('programming')
    })
  })

  describe('YouTube extractors', () => {
    const youtube = getPlatformById('youtube')!

    it('extracts duration and views from HTML', () => {
      const html = '{"lengthSeconds":"120","viewCount":"1000000"}'
      const metadata = youtube.extractors?.customMetadata?.(html)
      expect(metadata?.duration).toBe(120)
      expect(metadata?.views).toBe(1000000)
    })
  })
})

// ============================================================================
// Case Sensitivity
// ============================================================================

describe('case sensitivity', () => {
  it('handles uppercase URLs', () => {
    expect(detectPlatformFromUrl('HTTPS://WWW.TWITTER.COM/USER')).not.toBeNull()
    expect(detectPlatformFromUrl('https://REDDIT.com/r/test')).not.toBeNull()
  })

  it('handles mixed case URLs', () => {
    expect(detectPlatformFromUrl('https://Twitter.Com/User')).not.toBeNull()
    expect(detectPlatformFromUrl('https://YouTube.com/watch?v=abc')).not.toBeNull()
  })
})
