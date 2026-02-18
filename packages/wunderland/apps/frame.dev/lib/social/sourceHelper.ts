/**
 * Social Source Helper
 * @module lib/social/sourceHelper
 *
 * @description
 * Helper functions for creating SourceMetadata from social platform scrapes.
 */

import type { SourceMetadata } from '@/types/sourceMetadata'
import type { SocialPlatform, SocialScrapedData, SocialEngagement, SocialMedia } from './platforms'
import { detectPlatformFromUrl, extractPostId, extractUsername } from './platforms'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

export interface SocialScrapeResult {
  platform: SocialPlatform
  title: string
  content: string
  description?: string
  author?: string
  username?: string
  profileUrl?: string
  postId?: string
  postedAt?: string
  engagement?: SocialEngagement
  media?: SocialMedia
  hashtags?: string[]
  mentions?: string[]
  extra?: Record<string, unknown>
}

/* ═══════════════════════════════════════════════════════════════════════════
   METADATA CREATION
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Create SourceMetadata for content scraped from a social platform
 */
export function createSocialSourceMetadata(
  scrapeResult: SocialScrapeResult,
  sourceUrl: string,
  uploaderName: string,
  uploaderType: 'git' | 'manual' | 'session' = 'session',
  overrides?: Partial<SourceMetadata>
): SourceMetadata {
  const hasAuthor = !!scrapeResult.author && scrapeResult.author !== 'Unknown'

  return {
    // Base fields
    sourceType: 'scrape',
    createdAt: new Date().toISOString(),
    uploadedAt: new Date().toISOString(),
    sourceUrl,

    // Creator info
    creator: hasAuthor ? scrapeResult.author! : 'Unknown',
    creatorType: hasAuthor ? 'scraped' : 'unknown',
    creatorVerified: hasAuthor,
    uploaderIsCreator: false,

    // Uploader info
    uploader: uploaderName,
    uploaderType,

    // Scraped metadata
    scrapedAuthor: scrapeResult.author,
    scrapedSite: scrapeResult.platform.name,

    // Social platform fields
    socialPlatform: scrapeResult.platform.id,
    socialPostId: scrapeResult.postId,
    socialUsername: scrapeResult.username,
    socialProfileUrl: scrapeResult.profileUrl,
    socialPostedAt: scrapeResult.postedAt,
    socialEngagement: scrapeResult.engagement,
    socialMedia: scrapeResult.media,
    socialHashtags: scrapeResult.hashtags,
    socialMentions: scrapeResult.mentions,
    socialExtra: scrapeResult.extra,

    // Overrides
    ...overrides,
  }
}

/**
 * Create SourceMetadata from a URL and scraped HTML
 * Convenience function that detects platform and extracts metadata
 */
export function createSocialSourceMetadataFromUrl(
  url: string,
  scrapedData: {
    title: string
    content: string
    author?: string
    description?: string
    image?: string
  },
  uploaderName: string,
  uploaderType: 'git' | 'manual' | 'session' = 'session'
): SourceMetadata | null {
  const platform = detectPlatformFromUrl(url)
  if (!platform) return null

  const postId = extractPostId(url)
  const username = extractUsername(url)

  const scrapeResult: SocialScrapeResult = {
    platform,
    title: scrapedData.title,
    content: scrapedData.content,
    description: scrapedData.description,
    author: scrapedData.author,
    username: username || undefined,
    postId: postId || undefined,
    media: scrapedData.image
      ? { images: [scrapedData.image], videos: [], thumbnails: [] }
      : undefined,
  }

  return createSocialSourceMetadata(scrapeResult, url, uploaderName, uploaderType)
}

/* ═══════════════════════════════════════════════════════════════════════════
   HASHTAG & MENTION EXTRACTION
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Extract hashtags from text
 */
export function extractHashtags(text: string): string[] {
  const matches = text.match(/#[\w\u0080-\uFFFF]+/g) || []
  return [...new Set(matches.map((tag) => tag.toLowerCase()))]
}

/**
 * Extract @mentions from text
 */
export function extractMentions(text: string): string[] {
  const matches = text.match(/@[\w\u0080-\uFFFF]+/g) || []
  return [...new Set(matches.map((mention) => mention.toLowerCase()))]
}

/**
 * Extract hashtags and mentions from content
 */
export function extractSocialTags(text: string): { hashtags: string[]; mentions: string[] } {
  return {
    hashtags: extractHashtags(text),
    mentions: extractMentions(text),
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   ENGAGEMENT PARSING
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Parse engagement count string (e.g., "1.2K", "5M")
 */
export function parseEngagementCount(str: string): number | undefined {
  if (!str) return undefined

  const cleanStr = str.replace(/[,\s]/g, '').toLowerCase()

  const suffixMultipliers: Record<string, number> = {
    k: 1000,
    m: 1000000,
    b: 1000000000,
  }

  for (const [suffix, multiplier] of Object.entries(suffixMultipliers)) {
    if (cleanStr.endsWith(suffix)) {
      const num = parseFloat(cleanStr.slice(0, -1))
      return isNaN(num) ? undefined : Math.round(num * multiplier)
    }
  }

  const num = parseFloat(cleanStr)
  return isNaN(num) ? undefined : Math.round(num)
}

/**
 * Parse engagement from OG/meta description
 * Many platforms embed engagement in description text
 */
export function parseEngagementFromDescription(
  description: string,
  platformId: string
): Partial<SocialEngagement> {
  const engagement: Partial<SocialEngagement> = {}

  // Common patterns
  const patterns = [
    { regex: /(\d+(?:\.\d+)?[KMB]?)\s*(?:likes?|❤️|♥)/i, key: 'likes' as const },
    { regex: /(\d+(?:\.\d+)?[KMB]?)\s*(?:comments?|💬)/i, key: 'comments' as const },
    { regex: /(\d+(?:\.\d+)?[KMB]?)\s*(?:shares?|retweets?|🔁)/i, key: 'shares' as const },
    { regex: /(\d+(?:\.\d+)?[KMB]?)\s*(?:views?|👁)/i, key: 'views' as const },
    { regex: /(\d+(?:\.\d+)?[KMB]?)\s*(?:upvotes?|⬆)/i, key: 'upvotes' as const },
    { regex: /(\d+(?:\.\d+)?[KMB]?)\s*(?:saves?|📌)/i, key: 'saves' as const },
  ]

  for (const { regex, key } of patterns) {
    const match = description.match(regex)
    if (match) {
      const count = parseEngagementCount(match[1])
      if (count !== undefined) {
        engagement[key] = count
      }
    }
  }

  return engagement
}

/* ═══════════════════════════════════════════════════════════════════════════
   URL UTILITIES
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Build profile URL from platform and username
 */
export function buildProfileUrl(platformId: string, username: string): string | null {
  // Strip @ prefix or u/ prefix (not both as a character class)
  const cleanUsername = username.replace(/^@/, '').replace(/^u\//, '')

  const templates: Record<string, string> = {
    reddit: `https://reddit.com/u/${cleanUsername}`,
    twitter: `https://twitter.com/${cleanUsername}`,
    instagram: `https://instagram.com/${cleanUsername}`,
    pinterest: `https://pinterest.com/${cleanUsername}`,
    youtube: `https://youtube.com/@${cleanUsername}`,
    tiktok: `https://tiktok.com/@${cleanUsername}`,
    facebook: `https://facebook.com/${cleanUsername}`,
    linkedin: `https://linkedin.com/in/${cleanUsername}`,
    threads: `https://threads.net/@${cleanUsername}`,
  }

  return templates[platformId] || null
}

/**
 * Check if SourceMetadata has social platform info
 */
export function hasSocialMetadata(metadata: SourceMetadata): boolean {
  return !!metadata.socialPlatform
}

/**
 * Get social display info from SourceMetadata
 */
export function getSocialDisplayInfo(metadata: SourceMetadata): {
  platformId: string
  platformName: string
  username?: string
  postId?: string
  engagement?: SocialEngagement
} | null {
  if (!metadata.socialPlatform) return null

  // Import at runtime to avoid circular dependency
  const { getPlatformById } = require('./platforms')
  const platform = getPlatformById(metadata.socialPlatform)

  return {
    platformId: metadata.socialPlatform,
    platformName: platform?.name || metadata.socialPlatform,
    username: metadata.socialUsername,
    postId: metadata.socialPostId,
    engagement: metadata.socialEngagement,
  }
}
