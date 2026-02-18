/**
 * Source Metadata Types
 * @module types/sourceMetadata
 *
 * @description
 * Type definitions for tracking strand creation source and provenance.
 * Captures where content came from, who created it, and when.
 *
 * Key distinction:
 * - **Creator**: The original author who wrote/created the content
 * - **Uploader**: The person who uploaded the content to the system
 *
 * For original content, creator === uploader
 * For scraped/uploaded content, creator may be "Unknown" until verified
 */

import type { StrandLicense } from '@/lib/strand/licenseTypes'

/**
 * Source metadata for strands
 * Tracks provenance, creation timestamps, and author information
 */
export interface SourceMetadata {
  // Source tracking
  /** How the strand was created */
  sourceType: 'manual' | 'upload' | 'scrape' | 'template' | 'canvas'

  /** Content type - markdown is default, canvas for whiteboard drawings */
  contentType?: 'markdown' | 'whiteboard' | 'mindmap'

  /** Source URL for scraped content */
  sourceUrl?: string

  /** Original filename for uploaded files */
  sourceFilename?: string

  /** Template ID for template-based creation */
  sourceTemplateId?: string

  // Timestamps
  /** ISO timestamp when strand was first created */
  createdAt: string

  /** ISO timestamp when file was uploaded or URL scraped */
  uploadedAt?: string

  /** ISO timestamp of last modification */
  lastModified?: string

  // Creator tracking (original author of the content)
  /** Creator/author name - who wrote or created the original content */
  creator: string

  /** How creator identity was determined */
  creatorType: 'git' | 'manual' | 'session' | 'scraped' | 'unknown'

  /** Whether creator was verified from metadata (scraped author, file metadata, etc.) */
  creatorVerified?: boolean

  /** If true, uploader has marked themselves as the creator */
  uploaderIsCreator?: boolean

  // Uploader tracking (person who uploaded to the system)
  /** Uploader name - who uploaded this content to the system */
  uploader?: string

  /** How uploader identity was determined */
  uploaderType?: 'git' | 'manual' | 'session'

  // Session tracking
  /** Browser session ID for creator persistence */
  sessionId?: string

  /** Optional browser fingerprint for tracking */
  browserFingerprint?: string

  // Scraped metadata (from source URL)
  /** Author extracted from scraped source */
  scrapedAuthor?: string

  /** Site/publisher name from scraped source */
  scrapedSite?: string

  // Social platform metadata
  /** Social platform ID (reddit, twitter, instagram, etc.) */
  socialPlatform?: string

  /** Post/content ID on the platform */
  socialPostId?: string

  /** Username on the platform (e.g., @username, u/username) */
  socialUsername?: string

  /** Link to the user's profile */
  socialProfileUrl?: string

  /** When the content was posted (ISO timestamp) */
  socialPostedAt?: string

  /** Engagement metrics */
  socialEngagement?: {
    likes?: number
    comments?: number
    shares?: number
    views?: number
    upvotes?: number
    retweets?: number
    saves?: number
  }

  /** Media from the post */
  socialMedia?: {
    images: string[]
    videos: string[]
    thumbnails: string[]
  }

  /** Hashtags found in the post */
  socialHashtags?: string[]

  /** User mentions found in the post */
  socialMentions?: string[]

  /** Platform-specific data (subreddit, board name, etc.) */
  socialExtra?: Record<string, unknown>

  // License detection (from scraping/upload)
  /** License detected from source (file header, meta tags, etc.) */
  detectedLicense?: StrandLicense

  /** URL to the license found in the source */
  detectedLicenseUrl?: string

  /** Confidence score for the detected license (0-1) */
  detectedLicenseConfidence?: number

  /** Raw license text found in the source */
  detectedLicenseText?: string
}

/**
 * Type guard to check if an object is valid SourceMetadata
 */
export function isSourceMetadata(obj: unknown): obj is SourceMetadata {
  if (typeof obj !== 'object' || obj === null) return false

  const sm = obj as Partial<SourceMetadata>

  return (
    typeof sm.sourceType === 'string' &&
    ['manual', 'upload', 'scrape', 'template', 'canvas'].includes(sm.sourceType) &&
    typeof sm.createdAt === 'string' &&
    typeof sm.creator === 'string' &&
    typeof sm.creatorType === 'string' &&
    ['git', 'manual', 'session', 'scraped', 'unknown'].includes(sm.creatorType)
  )
}

/**
 * Create a default SourceMetadata object for manual content creation
 * (user is both creator and uploader)
 */
export function createDefaultSourceMetadata(overrides?: Partial<SourceMetadata>): SourceMetadata {
  return {
    sourceType: 'manual',
    createdAt: new Date().toISOString(),
    creator: 'Anonymous Creator',
    creatorType: 'session',
    uploaderIsCreator: true,
    ...overrides,
  }
}

/**
 * Create SourceMetadata for uploaded content
 * (creator is unknown, uploader is tracked)
 */
export function createUploadSourceMetadata(
  uploaderName: string,
  uploaderType: 'git' | 'manual' | 'session',
  filename: string,
  overrides?: Partial<SourceMetadata>
): SourceMetadata {
  return {
    sourceType: 'upload',
    createdAt: new Date().toISOString(),
    uploadedAt: new Date().toISOString(),
    creator: 'Unknown',
    creatorType: 'unknown',
    creatorVerified: false,
    uploader: uploaderName,
    uploaderType,
    sourceFilename: filename,
    uploaderIsCreator: false,
    ...overrides,
  }
}

/**
 * Create SourceMetadata for scraped content
 * (creator is unknown until scraped, uploader is tracked)
 */
export function createScrapeSourceMetadata(
  uploaderName: string,
  uploaderType: 'git' | 'manual' | 'session',
  sourceUrl: string,
  scrapedAuthor?: string,
  scrapedSite?: string,
  overrides?: Partial<SourceMetadata>
): SourceMetadata {
  const hasScrapedAuthor = !!scrapedAuthor && scrapedAuthor !== 'Unknown'

  return {
    sourceType: 'scrape',
    createdAt: new Date().toISOString(),
    uploadedAt: new Date().toISOString(),
    sourceUrl,
    creator: hasScrapedAuthor ? scrapedAuthor : 'Unknown',
    creatorType: hasScrapedAuthor ? 'scraped' : 'unknown',
    creatorVerified: hasScrapedAuthor,
    uploader: uploaderName,
    uploaderType,
    scrapedAuthor,
    scrapedSite,
    uploaderIsCreator: false,
    ...overrides,
  }
}
