/**
 * Source Detection - Platform detection from URLs
 * @module lib/canvas/sourceDetection
 *
 * Auto-detects source platform from URLs and extracts metadata.
 * Supported platforms: Pinterest, Instagram, Twitter/X, YouTube,
 * Medium, GitHub, Notion, and generic URLs with OG tags.
 */

/**
 * Supported platforms for source detection
 */
export type Platform =
  | 'pinterest'
  | 'instagram'
  | 'twitter'
  | 'youtube'
  | 'medium'
  | 'github'
  | 'notion'
  | 'tiktok'
  | 'linkedin'
  | 'reddit'
  | 'dribbble'
  | 'behance'
  | 'figma'
  | 'spotify'
  | 'soundcloud'
  | 'generic'

/**
 * Platform-specific source metadata
 */
export interface PlatformSourceMetadata {
  platform: Platform
  url: string
  /** Extracted content ID (pin ID, post ID, video ID, etc.) */
  contentId?: string
  /** Username/handle of content creator */
  username?: string
  /** Content title or caption */
  title?: string
  /** Content description */
  description?: string
  /** Thumbnail/preview image URL */
  thumbnailUrl?: string
  /** Embed URL if available */
  embedUrl?: string
  /** Platform-specific accent color */
  accentColor: string
  /** Platform display name */
  platformName: string
  /** Platform icon name (for lucide icons or custom) */
  iconName: string
}

/**
 * URL patterns for platform detection
 */
const PLATFORM_PATTERNS: Record<Platform, RegExp[]> = {
  pinterest: [
    /pinterest\.(com|ca|co\.uk)\/pin\/(\d+)/,
    /pin\.it\/([a-zA-Z0-9]+)/,
  ],
  instagram: [
    /instagram\.com\/(p|reel|tv)\/([a-zA-Z0-9_-]+)/,
    /instagram\.com\/([a-zA-Z0-9_.]+)\/?$/,
  ],
  twitter: [
    /(?:twitter|x)\.com\/([a-zA-Z0-9_]+)\/status\/(\d+)/,
    /(?:twitter|x)\.com\/([a-zA-Z0-9_]+)\/?$/,
  ],
  youtube: [
    /youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/,
    /youtu\.be\/([a-zA-Z0-9_-]+)/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]+)/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]+)/,
  ],
  medium: [
    /medium\.com\/@([a-zA-Z0-9_-]+)\/([a-zA-Z0-9-]+)/,
    /([a-zA-Z0-9_-]+)\.medium\.com\/([a-zA-Z0-9-]+)/,
  ],
  github: [
    /github\.com\/([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_.-]+)/,
    /gist\.github\.com\/([a-zA-Z0-9_-]+)\/([a-zA-Z0-9]+)/,
  ],
  notion: [
    /notion\.so\/([a-zA-Z0-9-]+)/,
    /notion\.site\/([a-zA-Z0-9-]+)/,
  ],
  tiktok: [
    /tiktok\.com\/@([a-zA-Z0-9_.]+)\/video\/(\d+)/,
    /tiktok\.com\/t\/([a-zA-Z0-9]+)/,
  ],
  linkedin: [
    /linkedin\.com\/posts\/([a-zA-Z0-9_-]+)/,
    /linkedin\.com\/in\/([a-zA-Z0-9_-]+)/,
  ],
  reddit: [
    /reddit\.com\/r\/([a-zA-Z0-9_]+)\/comments\/([a-zA-Z0-9]+)/,
    /redd\.it\/([a-zA-Z0-9]+)/,
  ],
  dribbble: [
    /dribbble\.com\/shots\/(\d+)/,
  ],
  behance: [
    /behance\.net\/gallery\/(\d+)/,
  ],
  figma: [
    /figma\.com\/(file|design)\/([a-zA-Z0-9]+)/,
  ],
  spotify: [
    /open\.spotify\.com\/(track|album|playlist|episode)\/([a-zA-Z0-9]+)/,
  ],
  soundcloud: [
    /soundcloud\.com\/([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_-]+)/,
  ],
  generic: [/.*/],
}

/**
 * Platform display info and accent colors
 */
export const PLATFORM_INFO: Record<Platform, { name: string; color: string; icon: string }> = {
  pinterest: { name: 'Pinterest', color: '#E60023', icon: 'pin' },
  instagram: { name: 'Instagram', color: '#E4405F', icon: 'instagram' },
  twitter: { name: 'X (Twitter)', color: '#000000', icon: 'twitter' },
  youtube: { name: 'YouTube', color: '#FF0000', icon: 'youtube' },
  medium: { name: 'Medium', color: '#000000', icon: 'book-open' },
  github: { name: 'GitHub', color: '#181717', icon: 'github' },
  notion: { name: 'Notion', color: '#000000', icon: 'file-text' },
  tiktok: { name: 'TikTok', color: '#000000', icon: 'video' },
  linkedin: { name: 'LinkedIn', color: '#0A66C2', icon: 'linkedin' },
  reddit: { name: 'Reddit', color: '#FF4500', icon: 'message-circle' },
  dribbble: { name: 'Dribbble', color: '#EA4C89', icon: 'circle' },
  behance: { name: 'Behance', color: '#1769FF', icon: 'pen-tool' },
  figma: { name: 'Figma', color: '#F24E1E', icon: 'figma' },
  spotify: { name: 'Spotify', color: '#1DB954', icon: 'music' },
  soundcloud: { name: 'SoundCloud', color: '#FF5500', icon: 'headphones' },
  generic: { name: 'Web', color: '#6B7280', icon: 'globe' },
}

/**
 * Detect platform from URL
 */
export function detectPlatform(url: string): Platform {
  if (!url) return 'generic'

  // Normalize URL
  const normalizedUrl = url.toLowerCase().trim()

  // Check each platform's patterns
  for (const [platform, patterns] of Object.entries(PLATFORM_PATTERNS)) {
    if (platform === 'generic') continue
    for (const pattern of patterns) {
      if (pattern.test(normalizedUrl)) {
        return platform as Platform
      }
    }
  }

  return 'generic'
}

/**
 * Extract metadata from URL based on platform
 */
export function extractPlatformMetadata(url: string): PlatformSourceMetadata {
  const platform = detectPlatform(url)
  const info = PLATFORM_INFO[platform]

  const baseMetadata: PlatformSourceMetadata = {
    platform,
    url,
    accentColor: info.color,
    platformName: info.name,
    iconName: info.icon,
  }

  // Platform-specific extraction
  switch (platform) {
    case 'pinterest': {
      const match = url.match(/pin\/(\d+)/)
      if (match) {
        baseMetadata.contentId = match[1]
      }
      break
    }
    case 'instagram': {
      const postMatch = url.match(/\/(p|reel|tv)\/([a-zA-Z0-9_-]+)/)
      if (postMatch) {
        baseMetadata.contentId = postMatch[2]
      }
      const userMatch = url.match(/instagram\.com\/([a-zA-Z0-9_.]+)\/?$/)
      if (userMatch) {
        baseMetadata.username = userMatch[1]
      }
      break
    }
    case 'twitter': {
      const match = url.match(/\/([a-zA-Z0-9_]+)\/status\/(\d+)/)
      if (match) {
        baseMetadata.username = match[1]
        baseMetadata.contentId = match[2]
      }
      break
    }
    case 'youtube': {
      const watchMatch = url.match(/watch\?v=([a-zA-Z0-9_-]+)/)
      const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]+)/)
      const shortsMatch = url.match(/shorts\/([a-zA-Z0-9_-]+)/)
      const embedMatch = url.match(/embed\/([a-zA-Z0-9_-]+)/)

      const videoId = watchMatch?.[1] || shortMatch?.[1] || shortsMatch?.[1] || embedMatch?.[1]
      if (videoId) {
        baseMetadata.contentId = videoId
        baseMetadata.thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
        baseMetadata.embedUrl = `https://www.youtube.com/embed/${videoId}`
      }
      break
    }
    case 'github': {
      const repoMatch = url.match(/github\.com\/([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_.-]+)/)
      if (repoMatch) {
        baseMetadata.username = repoMatch[1]
        baseMetadata.contentId = repoMatch[2]
        baseMetadata.title = `${repoMatch[1]}/${repoMatch[2]}`
      }
      break
    }
    case 'spotify': {
      const match = url.match(/\/(track|album|playlist|episode)\/([a-zA-Z0-9]+)/)
      if (match) {
        baseMetadata.contentId = match[2]
        baseMetadata.embedUrl = `https://open.spotify.com/embed/${match[1]}/${match[2]}`
      }
      break
    }
    case 'figma': {
      const match = url.match(/\/(file|design)\/([a-zA-Z0-9]+)/)
      if (match) {
        baseMetadata.contentId = match[2]
      }
      break
    }
  }

  return baseMetadata
}

/**
 * Get platform badge color with opacity
 */
export function getPlatformBadgeStyles(platform: Platform): {
  backgroundColor: string
  textColor: string
  borderColor: string
} {
  const info = PLATFORM_INFO[platform]

  return {
    backgroundColor: `${info.color}20`,
    textColor: info.color,
    borderColor: `${info.color}40`,
  }
}

/**
 * Check if URL is valid
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

/**
 * Normalize URL (add https if missing, clean up)
 */
export function normalizeUrl(url: string): string {
  let normalized = url.trim()

  // Add protocol if missing
  if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
    normalized = `https://${normalized}`
  }

  // Remove trailing slash
  normalized = normalized.replace(/\/$/, '')

  return normalized
}

export default {
  detectPlatform,
  extractPlatformMetadata,
  getPlatformBadgeStyles,
  isValidUrl,
  normalizeUrl,
  PLATFORM_INFO,
}
