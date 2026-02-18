/**
 * Social Strand Creator
 * @module lib/social/strandCreator
 *
 * @description
 * Creates strands from social media imports with proper metadata.
 * Bridges SocialImportCard results to the strand creation system.
 */

import { nanoid } from 'nanoid'
import type { SourceMetadata } from '@/types/sourceMetadata'
import type { SocialPlatform, SocialEngagement, SocialMedia } from './platforms'
import { getPlatformById } from './platforms'
import { createSocialSourceMetadata, type SocialScrapeResult } from './sourceHelper'
import { getUserProfile } from '@/lib/localStorage'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

export interface SocialImportResult {
  content: string
  title: string
  metadata: {
    author?: string
    siteName?: string
    platform?: {
      id: string
      name: string
      icon: string
      color: string
    }
    postId?: string
    username?: string
    profileUrl?: string
    engagement?: SocialEngagement
    media?: SocialMedia
    hashtags?: string[]
    mentions?: string[]
    postedAt?: string
  }
}

export interface SocialStrandData {
  /** Unique strand ID */
  id: string
  /** URL-safe slug */
  slug: string
  /** Display title */
  title: string
  /** Markdown content */
  content: string
  /** Strand summary */
  summary?: string
  /** Tags derived from hashtags */
  tags: string[]
  /** Source metadata */
  sourceMetadata: SourceMetadata
  /** Original URL */
  sourceUrl: string
  /** Platform ID for filtering */
  platformId: string
  /** Scraped timestamp */
  scrapedAt: string
}

/* ═══════════════════════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Generate URL-safe slug from title
 */
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 60)
    .replace(/^-+|-+$/g, '')
    || nanoid(8)
}

/**
 * Extract summary from content
 */
function extractSummary(content: string, maxLength = 200): string {
  // Skip markdown frontmatter and headers
  const lines = content.split('\n')
  let summary = ''

  for (const line of lines) {
    const trimmed = line.trim()
    // Skip empty lines, headers, and frontmatter
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('---') || trimmed.startsWith('>')) {
      continue
    }
    summary = trimmed
    break
  }

  if (summary.length > maxLength) {
    return summary.substring(0, maxLength - 3) + '...'
  }
  return summary
}

/**
 * Convert hashtags to tags (remove # prefix)
 */
function hashtagsToTags(hashtags?: string[]): string[] {
  if (!hashtags) return []
  return hashtags.map(tag => tag.replace(/^#/, '').toLowerCase())
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN FUNCTIONS
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Create strand data from a social media import
 *
 * @example
 * ```typescript
 * const strandData = createStrandFromSocialImport(scrapeResult, url)
 * // Now save strandData to your database
 * ```
 */
export function createStrandFromSocialImport(
  importResult: SocialImportResult,
  sourceUrl: string,
  options?: {
    customTitle?: string
    customTags?: string[]
    parentPath?: string
  }
): SocialStrandData {
  const profile = getUserProfile()
  const uploaderName = profile.displayName || 'Traveler'

  const platformId = importResult.metadata.platform?.id || 'unknown'
  const platform = getPlatformById(platformId)

  // Build title
  const title = options?.customTitle || importResult.title

  // Build tags from hashtags + platform + custom
  const tags = [
    ...hashtagsToTags(importResult.metadata.hashtags),
    platformId,
    ...(options?.customTags || []),
  ].filter((v, i, a) => a.indexOf(v) === i) // Dedupe

  // Create social-aware source metadata
  const scrapeResult: SocialScrapeResult = {
    platform: platform!,
    title: importResult.title,
    content: importResult.content,
    description: extractSummary(importResult.content),
    author: importResult.metadata.author,
    username: importResult.metadata.username,
    profileUrl: importResult.metadata.profileUrl,
    postId: importResult.metadata.postId,
    postedAt: importResult.metadata.postedAt,
    engagement: importResult.metadata.engagement,
    media: importResult.metadata.media,
    hashtags: importResult.metadata.hashtags,
    mentions: importResult.metadata.mentions,
  }

  const sourceMetadata = createSocialSourceMetadata(
    scrapeResult,
    sourceUrl,
    uploaderName,
    'session'
  )

  return {
    id: nanoid(),
    slug: generateSlug(title),
    title,
    content: importResult.content,
    summary: extractSummary(importResult.content),
    tags,
    sourceMetadata,
    sourceUrl,
    platformId,
    scrapedAt: new Date().toISOString(),
  }
}

/**
 * Build frontmatter for a social strand
 */
export function buildSocialStrandFrontmatter(strandData: SocialStrandData): string {
  const lines: string[] = ['---']

  lines.push(`id: "${strandData.id}"`)
  lines.push(`slug: "${strandData.slug}"`)
  lines.push(`title: "${strandData.title.replace(/"/g, '\\"')}"`)

  if (strandData.summary) {
    lines.push(`summary: "${strandData.summary.replace(/"/g, '\\"')}"`)
  }

  if (strandData.tags.length > 0) {
    lines.push(`tags: [${strandData.tags.map(t => `"${t}"`).join(', ')}]`)
  }

  // Source metadata as nested object
  lines.push('source:')
  lines.push(`  type: "${strandData.sourceMetadata.sourceType}"`)
  lines.push(`  url: "${strandData.sourceUrl}"`)
  if (strandData.sourceMetadata.creator) {
    lines.push(`  creator: "${strandData.sourceMetadata.creator}"`)
  }
  if (strandData.sourceMetadata.socialPlatform) {
    lines.push(`  platform: "${strandData.sourceMetadata.socialPlatform}"`)
  }
  if (strandData.sourceMetadata.socialUsername) {
    lines.push(`  username: "${strandData.sourceMetadata.socialUsername}"`)
  }
  if (strandData.sourceMetadata.socialPostedAt) {
    lines.push(`  postedAt: "${strandData.sourceMetadata.socialPostedAt}"`)
  }

  lines.push(`createdAt: "${strandData.scrapedAt}"`)
  lines.push('---')

  return lines.join('\n')
}

/**
 * Build complete markdown file content for a social strand
 */
export function buildSocialStrandMarkdown(strandData: SocialStrandData): string {
  const frontmatter = buildSocialStrandFrontmatter(strandData)

  // The content already includes a header, so just combine
  return `${frontmatter}\n\n${strandData.content}`
}

/**
 * Get strands imported from social platforms from localStorage
 */
export function getSocialImportHistory(): SocialStrandData[] {
  if (typeof window === 'undefined') return []

  try {
    const stored = localStorage.getItem('codex-social-imports')
    if (!stored) return []
    return JSON.parse(stored)
  } catch {
    return []
  }
}

/**
 * Add a strand to social import history
 */
export function addToSocialImportHistory(strandData: SocialStrandData): void {
  if (typeof window === 'undefined') return

  try {
    const history = getSocialImportHistory()
    // Avoid duplicates by URL
    const filtered = history.filter(s => s.sourceUrl !== strandData.sourceUrl)
    const updated = [strandData, ...filtered].slice(0, 100) // Keep last 100
    localStorage.setItem('codex-social-imports', JSON.stringify(updated))
  } catch (error) {
    console.error('Failed to save social import history:', error)
  }
}

/**
 * Remove a strand from social import history
 */
export function removeFromSocialImportHistory(strandId: string): void {
  if (typeof window === 'undefined') return

  try {
    const history = getSocialImportHistory()
    const updated = history.filter(s => s.id !== strandId)
    localStorage.setItem('codex-social-imports', JSON.stringify(updated))
  } catch (error) {
    console.error('Failed to update social import history:', error)
  }
}

/**
 * Get social import stats by platform
 */
export function getSocialImportStats(): Record<string, number> {
  const history = getSocialImportHistory()
  const stats: Record<string, number> = {}

  for (const strand of history) {
    stats[strand.platformId] = (stats[strand.platformId] || 0) + 1
  }

  return stats
}
