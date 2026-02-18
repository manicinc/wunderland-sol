/**
 * Social Platform Registry
 * @module lib/social/platforms
 *
 * @description
 * Registry of supported social media platforms with:
 * - URL pattern matching
 * - Brand colors and icons
 * - Metadata extraction selectors
 */

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

export interface SocialPlatform {
  /** Unique platform identifier */
  id: string
  /** Display name */
  name: string
  /** Hostname patterns for detection */
  hostPatterns: RegExp[]
  /** Lucide icon name (or 'custom' for SVG) */
  icon: string
  /** Custom SVG path (if icon is 'custom') */
  customIconPath?: string
  /** Brand color (hex) */
  color: string
  /** Light mode brand color (optional) */
  colorLight?: string
  /** URL patterns to extract post/user IDs */
  urlPatterns: {
    post: RegExp[]
    user: RegExp[]
  }
  /** Meta tag selectors for metadata extraction */
  metadataSelectors: {
    title: string[]
    author: string[]
    description: string[]
    image: string[]
    engagement?: string[]
    postedAt?: string[]
  }
  /** Platform-specific data extraction */
  extractors?: {
    /** Extract username from URL */
    username?: (url: string) => string | null
    /** Extract post ID from URL */
    postId?: (url: string) => string | null
    /** Extract additional metadata from HTML */
    customMetadata?: (html: string) => Record<string, unknown>
  }
}

export interface SocialEngagement {
  likes?: number
  comments?: number
  shares?: number
  views?: number
  upvotes?: number
  retweets?: number
  saves?: number
}

export interface SocialMedia {
  images: string[]
  videos: string[]
  thumbnails: string[]
}

export interface SocialScrapedData {
  platform: SocialPlatform
  title: string
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
  subreddit?: string
  boardName?: string
  duration?: string
  rawHtml?: string
}

/* ═══════════════════════════════════════════════════════════════════════════
   PLATFORM REGISTRY
═══════════════════════════════════════════════════════════════════════════ */

export const SOCIAL_PLATFORMS: SocialPlatform[] = [
  // Reddit
  {
    id: 'reddit',
    name: 'Reddit',
    hostPatterns: [/reddit\.com/i, /redd\.it/i],
    icon: 'MessageCircle',
    color: '#FF4500',
    urlPatterns: {
      post: [
        /\/r\/[\w-]+\/comments\/(\w+)/i,
        /redd\.it\/(\w+)/i,
      ],
      user: [/\/u(?:ser)?\/(\w+)/i],
    },
    metadataSelectors: {
      title: ['og:title', 'title'],
      author: ['og:author'],
      description: ['og:description', 'meta[name="description"]'],
      image: ['og:image', 'twitter:image'],
      engagement: ['og:upvotes'],
    },
    extractors: {
      username: (url) => {
        const match = url.match(/\/u(?:ser)?\/(\w+)/i)
        return match ? `u/${match[1]}` : null
      },
      postId: (url) => {
        const match = url.match(/\/comments\/(\w+)/i) || url.match(/redd\.it\/(\w+)/i)
        return match ? match[1] : null
      },
      customMetadata: (html) => {
        const subredditMatch = html.match(/\/r\/([\w-]+)/i)
        return subredditMatch ? { subreddit: subredditMatch[1] } : {}
      },
    },
  },

  // Twitter/X
  {
    id: 'twitter',
    name: 'Twitter / X',
    hostPatterns: [/twitter\.com/i, /x\.com/i],
    icon: 'Twitter',
    color: '#1DA1F2',
    colorLight: '#000000',
    urlPatterns: {
      post: [/\/status\/(\d+)/i],
      user: [/(?:twitter|x)\.com\/(\w+)(?:\/|$)/i],
    },
    metadataSelectors: {
      title: ['og:title', 'twitter:title'],
      author: ['twitter:creator', 'og:author'],
      description: ['og:description', 'twitter:description'],
      image: ['twitter:image', 'og:image'],
    },
    extractors: {
      username: (url) => {
        const match = url.match(/(?:twitter|x)\.com\/(\w+)(?:\/|$)/i)
        return match && !['home', 'search', 'explore', 'notifications', 'messages'].includes(match[1])
          ? `@${match[1]}`
          : null
      },
      postId: (url) => {
        const match = url.match(/\/status\/(\d+)/i)
        return match ? match[1] : null
      },
    },
  },

  // Instagram
  {
    id: 'instagram',
    name: 'Instagram',
    hostPatterns: [/instagram\.com/i],
    icon: 'Instagram',
    color: '#E4405F',
    urlPatterns: {
      post: [/\/p\/([A-Za-z0-9_-]+)/i, /\/reel\/([A-Za-z0-9_-]+)/i],
      user: [/instagram\.com\/([A-Za-z0-9_.]+)(?:\/|$)/i],
    },
    metadataSelectors: {
      title: ['og:title'],
      author: ['og:description'],
      description: ['og:description'],
      image: ['og:image'],
    },
    extractors: {
      username: (url) => {
        const match = url.match(/instagram\.com\/([A-Za-z0-9_.]+)(?:\/|$)/i)
        return match && !['p', 'reel', 'stories', 'explore', 'direct', 'accounts'].includes(match[1])
          ? `@${match[1]}`
          : null
      },
      postId: (url) => {
        const match = url.match(/\/(?:p|reel)\/([A-Za-z0-9_-]+)/i)
        return match ? match[1] : null
      },
    },
  },

  // Pinterest
  {
    id: 'pinterest',
    name: 'Pinterest',
    hostPatterns: [/pinterest\.com/i, /pin\.it/i],
    icon: 'Pin',
    color: '#E60023',
    urlPatterns: {
      post: [/\/pin\/(\d+)/i, /pin\.it\/(\w+)/i],
      user: [/pinterest\.com\/(\w+)(?:\/|$)/i],
    },
    metadataSelectors: {
      title: ['og:title'],
      author: ['og:author', 'pinterestapp:pinner'],
      description: ['og:description'],
      image: ['og:image'],
    },
    extractors: {
      username: (url) => {
        const match = url.match(/pinterest\.com\/(\w+)(?:\/|$)/i)
        return match && !['pin', 'search', 'today', 'ideas'].includes(match[1])
          ? match[1]
          : null
      },
      postId: (url) => {
        const match = url.match(/\/pin\/(\d+)/i) || url.match(/pin\.it\/(\w+)/i)
        return match ? match[1] : null
      },
    },
  },

  // YouTube
  {
    id: 'youtube',
    name: 'YouTube',
    hostPatterns: [/youtube\.com/i, /youtu\.be/i],
    icon: 'Youtube',
    color: '#FF0000',
    urlPatterns: {
      post: [/[?&]v=([A-Za-z0-9_-]{11})/i, /youtu\.be\/([A-Za-z0-9_-]{11})/i, /\/shorts\/([A-Za-z0-9_-]{11})/i],
      user: [/\/@?([A-Za-z0-9_-]+)/i, /\/channel\/([A-Za-z0-9_-]+)/i],
    },
    metadataSelectors: {
      title: ['og:title', 'title'],
      author: ['og:video:tag', 'author'],
      description: ['og:description'],
      image: ['og:image'],
      postedAt: ['og:video:release_date'],
    },
    extractors: {
      username: (url) => {
        const channelMatch = url.match(/\/@([A-Za-z0-9_-]+)/i)
        if (channelMatch) return `@${channelMatch[1]}`
        const idMatch = url.match(/\/channel\/([A-Za-z0-9_-]+)/i)
        return idMatch ? idMatch[1] : null
      },
      postId: (url) => {
        const vMatch = url.match(/[?&]v=([A-Za-z0-9_-]{11})/i)
        if (vMatch) return vMatch[1]
        const shortMatch = url.match(/youtu\.be\/([A-Za-z0-9_-]{11})/i)
        if (shortMatch) return shortMatch[1]
        const shortsMatch = url.match(/\/shorts\/([A-Za-z0-9_-]{11})/i)
        return shortsMatch ? shortsMatch[1] : null
      },
      customMetadata: (html) => {
        const durationMatch = html.match(/"lengthSeconds":"(\d+)"/i)
        const viewsMatch = html.match(/"viewCount":"(\d+)"/i)
        return {
          duration: durationMatch ? parseInt(durationMatch[1], 10) : undefined,
          views: viewsMatch ? parseInt(viewsMatch[1], 10) : undefined,
        }
      },
    },
  },

  // TikTok
  {
    id: 'tiktok',
    name: 'TikTok',
    hostPatterns: [/tiktok\.com/i],
    icon: 'Music',
    color: '#000000',
    colorLight: '#EE1D52',
    urlPatterns: {
      post: [/\/video\/(\d+)/i, /\/@[\w.]+\/video\/(\d+)/i],
      user: [/\/@([\w.]+)/i],
    },
    metadataSelectors: {
      title: ['og:title'],
      author: ['og:description'],
      description: ['og:description'],
      image: ['og:image'],
    },
    extractors: {
      username: (url) => {
        const match = url.match(/\/@([\w.]+)/i)
        return match ? `@${match[1]}` : null
      },
      postId: (url) => {
        const match = url.match(/\/video\/(\d+)/i)
        return match ? match[1] : null
      },
    },
  },

  // Facebook
  {
    id: 'facebook',
    name: 'Facebook',
    hostPatterns: [/facebook\.com/i, /fb\.com/i, /fb\.watch/i],
    icon: 'Facebook',
    color: '#1877F2',
    urlPatterns: {
      post: [/\/posts\/(\d+)/i, /\/photo(?:\.php)?\?fbid=(\d+)/i, /\/videos\/(\d+)/i],
      user: [/facebook\.com\/([A-Za-z0-9.]+)(?:\/|$)/i],
    },
    metadataSelectors: {
      title: ['og:title'],
      author: ['og:author', 'article:author'],
      description: ['og:description'],
      image: ['og:image'],
    },
    extractors: {
      username: (url) => {
        const match = url.match(/facebook\.com\/([A-Za-z0-9.]+)(?:\/|$)/i)
        return match && !['groups', 'pages', 'watch', 'marketplace', 'events'].includes(match[1])
          ? match[1]
          : null
      },
      postId: (url) => {
        const postMatch = url.match(/\/posts\/(\d+)/i)
        if (postMatch) return postMatch[1]
        const photoMatch = url.match(/fbid=(\d+)/i)
        if (photoMatch) return photoMatch[1]
        const videoMatch = url.match(/\/videos\/(\d+)/i)
        return videoMatch ? videoMatch[1] : null
      },
    },
  },

  // LinkedIn
  {
    id: 'linkedin',
    name: 'LinkedIn',
    hostPatterns: [/linkedin\.com/i],
    icon: 'Linkedin',
    color: '#0A66C2',
    urlPatterns: {
      post: [/\/posts\/([A-Za-z0-9_-]+)/i, /\/pulse\/([A-Za-z0-9_-]+)/i],
      user: [/\/in\/([A-Za-z0-9_-]+)/i, /\/company\/([A-Za-z0-9_-]+)/i],
    },
    metadataSelectors: {
      title: ['og:title'],
      author: ['og:author', 'author'],
      description: ['og:description'],
      image: ['og:image'],
    },
    extractors: {
      username: (url) => {
        const inMatch = url.match(/\/in\/([A-Za-z0-9_-]+)/i)
        if (inMatch) return inMatch[1]
        const companyMatch = url.match(/\/company\/([A-Za-z0-9_-]+)/i)
        return companyMatch ? companyMatch[1] : null
      },
      postId: (url) => {
        const postMatch = url.match(/\/posts\/([A-Za-z0-9_-]+)/i)
        if (postMatch) return postMatch[1]
        const pulseMatch = url.match(/\/pulse\/([A-Za-z0-9_-]+)/i)
        return pulseMatch ? pulseMatch[1] : null
      },
    },
  },

  // Mastodon (generic - will match most instances)
  {
    id: 'mastodon',
    name: 'Mastodon',
    hostPatterns: [
      /mastodon\.social/i,
      /mastodon\.online/i,
      /mstdn\.social/i,
      /fosstodon\.org/i,
      /hachyderm\.io/i,
    ],
    icon: 'MessageSquare',
    color: '#6364FF',
    urlPatterns: {
      post: [/\/@[\w]+\/(\d+)/i, /\/statuses\/(\d+)/i],
      user: [/\/@([\w]+)/i],
    },
    metadataSelectors: {
      title: ['og:title'],
      author: ['og:author', 'profile:username'],
      description: ['og:description'],
      image: ['og:image'],
    },
    extractors: {
      username: (url) => {
        const match = url.match(/\/@([\w]+)/i)
        return match ? `@${match[1]}` : null
      },
      postId: (url) => {
        const match = url.match(/\/@[\w]+\/(\d+)/i) || url.match(/\/statuses\/(\d+)/i)
        return match ? match[1] : null
      },
    },
  },

  // Threads
  {
    id: 'threads',
    name: 'Threads',
    hostPatterns: [/threads\.net/i],
    icon: 'AtSign',
    color: '#000000',
    urlPatterns: {
      post: [/\/@[\w.]+\/post\/([A-Za-z0-9_-]+)/i],
      user: [/\/@([\w.]+)/i],
    },
    metadataSelectors: {
      title: ['og:title'],
      author: ['og:description'],
      description: ['og:description'],
      image: ['og:image'],
    },
    extractors: {
      username: (url) => {
        const match = url.match(/\/@([\w.]+)/i)
        return match ? `@${match[1]}` : null
      },
      postId: (url) => {
        const match = url.match(/\/post\/([A-Za-z0-9_-]+)/i)
        return match ? match[1] : null
      },
    },
  },
]

/* ═══════════════════════════════════════════════════════════════════════════
   UTILITIES
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Detect social platform from URL
 */
export function detectPlatformFromUrl(url: string): SocialPlatform | null {
  try {
    const parsedUrl = new URL(url)
    const hostname = parsedUrl.hostname.toLowerCase()

    for (const platform of SOCIAL_PLATFORMS) {
      for (const pattern of platform.hostPatterns) {
        if (pattern.test(hostname)) {
          return platform
        }
      }
    }

    return null
  } catch {
    return null
  }
}

/**
 * Check if URL is from a known social platform
 */
export function isSocialUrl(url: string): boolean {
  return detectPlatformFromUrl(url) !== null
}

/**
 * Get platform by ID
 */
export function getPlatformById(id: string): SocialPlatform | null {
  return SOCIAL_PLATFORMS.find((p) => p.id === id) || null
}

/**
 * Extract post ID from social URL
 */
export function extractPostId(url: string): string | null {
  const platform = detectPlatformFromUrl(url)
  if (!platform) return null

  if (platform.extractors?.postId) {
    return platform.extractors.postId(url)
  }

  for (const pattern of platform.urlPatterns.post) {
    const match = url.match(pattern)
    if (match && match[1]) {
      return match[1]
    }
  }

  return null
}

/**
 * Extract username from social URL
 */
export function extractUsername(url: string): string | null {
  const platform = detectPlatformFromUrl(url)
  if (!platform) return null

  if (platform.extractors?.username) {
    return platform.extractors.username(url)
  }

  for (const pattern of platform.urlPatterns.user) {
    const match = url.match(pattern)
    if (match && match[1]) {
      return match[1]
    }
  }

  return null
}

/**
 * Get all supported platform IDs
 */
export function getSupportedPlatformIds(): string[] {
  return SOCIAL_PLATFORMS.map((p) => p.id)
}

/**
 * Get platform display info for UI
 */
export function getPlatformDisplayInfo(platformId: string): {
  name: string
  icon: string
  color: string
} | null {
  const platform = getPlatformById(platformId)
  if (!platform) return null

  return {
    name: platform.name,
    icon: platform.icon,
    color: platform.color,
  }
}
