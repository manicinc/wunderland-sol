/**
 * URL Scraping API
 * @module api/scrape
 *
 * GET /api/scrape?url=<encoded-url>
 *
 * Fetches content from a URL and returns it as markdown.
 * Supports:
 * - PDF files: Extracts text using pdf-parse
 * - Web pages: Extracts main content as text
 * - Social media: Enhanced metadata for Reddit, Twitter, Instagram, etc.
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  detectPlatformFromUrl,
  extractPostId,
  extractUsername,
  type SocialPlatform,
} from '@/lib/social/platforms'
import {
  extractHashtags,
  extractMentions,
  parseEngagementFromDescription,
  buildProfileUrl,
} from '@/lib/social/sourceHelper'
import {
  detectLicenseFromHTML,
  detectLicenseFromContent,
  type LicenseDetectionResult,
} from '@/lib/strand/licenseDetector'

// Use Node.js runtime for pdf-parse
export const runtime = 'nodejs'
export const maxDuration = 60

/**
 * GET /api/scrape
 *
 * Fetches and parses content from a URL
 *
 * @example
 * ```typescript
 * const response = await fetch('/api/scrape?url=' + encodeURIComponent('https://example.com/doc.pdf'))
 * const { content, title } = await response.json()
 * ```
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const url = searchParams.get('url')

    if (!url) {
      return NextResponse.json(
        { error: 'URL parameter is required' },
        { status: 400 }
      )
    }

    // Validate URL
    let parsedUrl: URL
    try {
      parsedUrl = new URL(url)
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      )
    }

    // Fetch the URL content
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; FabricCodex/1.0; +https://frame.dev)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,application/pdf,*/*;q=0.8',
      },
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch URL: ${response.status} ${response.statusText}` },
        { status: 502 }
      )
    }

    const contentType = response.headers.get('content-type') || ''

    // Handle PDF files
    if (contentType.includes('application/pdf') || url.toLowerCase().endsWith('.pdf')) {
      const pdfParse = (await import('pdf-parse')).default
      const buffer = Buffer.from(await response.arrayBuffer())

      try {
        const pdfData = await pdfParse(buffer)

        // Extract title from PDF metadata or URL
        const title = pdfData.info?.Title ||
                     parsedUrl.pathname.split('/').pop()?.replace('.pdf', '') ||
                     'Untitled PDF'

        // Convert PDF text to markdown
        let content = `# ${title}\n\n`

        if (pdfData.info?.Author) {
          content += `> **Author:** ${pdfData.info.Author}\n\n`
        }

        content += `> **Source:** [${url}](${url})\n\n---\n\n`

        // Clean up the text - split into paragraphs
        const text = pdfData.text
          .replace(/\r\n/g, '\n')
          .replace(/\n{3,}/g, '\n\n')
          .trim()

        content += text

        return NextResponse.json({
          content,
          title,
          metadata: {
            pageCount: pdfData.numpages,
            author: pdfData.info?.Author,
            subject: pdfData.info?.Subject,
          }
        })
      } catch (pdfError: any) {
        return NextResponse.json(
          { error: `Failed to parse PDF: ${pdfError.message}` },
          { status: 500 }
        )
      }
    }

    // Handle HTML pages
    const html = await response.text()

    // Extract author from various meta tags
    const extractMetaContent = (patterns: RegExp[]): string | undefined => {
      for (const pattern of patterns) {
        const match = html.match(pattern)
        if (match && match[1]) {
          return match[1].trim()
        }
      }
      return undefined
    }

    // Try multiple author meta patterns
    const author = extractMetaContent([
      /<meta[^>]*name=["']author["'][^>]*content=["']([^"']+)["']/i,
      /<meta[^>]*content=["']([^"']+)["'][^>]*name=["']author["']/i,
      /<meta[^>]*property=["']og:author["'][^>]*content=["']([^"']+)["']/i,
      /<meta[^>]*property=["']article:author["'][^>]*content=["']([^"']+)["']/i,
      /<meta[^>]*name=["']DC\.creator["'][^>]*content=["']([^"']+)["']/i,
      /<meta[^>]*name=["']twitter:creator["'][^>]*content=["']([^"']+)["']/i,
      /<a[^>]*rel=["']author["'][^>]*>([^<]+)<\/a>/i,
    ])

    // Try to extract site name
    const siteName = extractMetaContent([
      /<meta[^>]*property=["']og:site_name["'][^>]*content=["']([^"']+)["']/i,
      /<meta[^>]*name=["']application-name["'][^>]*content=["']([^"']+)["']/i,
    ]) || parsedUrl.hostname

    // Simple HTML to text extraction
    // Remove scripts, styles, and get text content
    let text = html
      // Remove script tags
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      // Remove style tags
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      // Remove HTML comments
      .replace(/<!--[\s\S]*?-->/g, '')
      // Convert headings to markdown
      .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
      .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
      .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
      .replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n\n')
      .replace(/<h5[^>]*>(.*?)<\/h5>/gi, '##### $1\n\n')
      .replace(/<h6[^>]*>(.*?)<\/h6>/gi, '###### $1\n\n')
      // Convert paragraphs to double newlines
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<br\s*\/?>/gi, '\n')
      // Convert links
      .replace(/<a[^>]*href=["']([^"']*)["'][^>]*>(.*?)<\/a>/gi, '[$2]($1)')
      // Convert bold and italic
      .replace(/<(strong|b)[^>]*>(.*?)<\/(strong|b)>/gi, '**$2**')
      .replace(/<(em|i)[^>]*>(.*?)<\/(em|i)>/gi, '*$2*')
      // Convert lists
      .replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n')
      // Remove remaining HTML tags
      .replace(/<[^>]+>/g, '')
      // Decode HTML entities
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      // Clean up whitespace
      .replace(/\n{3,}/g, '\n\n')
      .trim()

    // Extract title from HTML
    const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i)
    const title = titleMatch ? titleMatch[1].trim() : parsedUrl.hostname

    // Prepend source info with author if available
    let header = `# ${title}\n\n`
    if (author) {
      header += `> **Author:** ${author}\n\n`
    }
    header += `> **Source:** [${url}](${url})\n\n---\n\n`

    const content = header + text

    // Detect social platform
    const platform = detectPlatformFromUrl(url)
    const postId = platform ? extractPostId(url) : null
    const username = platform ? extractUsername(url) : null

    // Extract social-specific metadata
    let socialMetadata: Record<string, unknown> = {}
    if (platform) {
      // Extract OG image for social media
      const ogImage = extractMetaContent([
        /<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i,
        /<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i,
        /<meta[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i,
      ])

      // Extract video thumbnail
      const videoImage = extractMetaContent([
        /<meta[^>]*property=["']og:video:thumbnail["'][^>]*content=["']([^"']+)["']/i,
        /<meta[^>]*property=["']og:video:secure_url["'][^>]*content=["']([^"']+)["']/i,
      ])

      // Extract posted date
      const postedAt = extractMetaContent([
        /<meta[^>]*property=["']article:published_time["'][^>]*content=["']([^"']+)["']/i,
        /<meta[^>]*property=["']og:video:release_date["'][^>]*content=["']([^"']+)["']/i,
        /<meta[^>]*name=["']date["'][^>]*content=["']([^"']+)["']/i,
      ])

      // Extract hashtags and mentions from description
      const description = extractMetaContent([
        /<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i,
        /<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i,
      ]) || ''

      const hashtags = extractHashtags(text + ' ' + description)
      const mentions = extractMentions(text + ' ' + description)
      const engagement = parseEngagementFromDescription(description, platform.id)

      // Build profile URL
      const profileUrl = username ? buildProfileUrl(platform.id, username) : undefined

      // Run custom extractors if available
      let customData: Record<string, unknown> = {}
      if (platform.extractors?.customMetadata) {
        customData = platform.extractors.customMetadata(html)
      }

      socialMetadata = {
        platform: {
          id: platform.id,
          name: platform.name,
          icon: platform.icon,
          color: platform.color,
        },
        postId,
        username,
        profileUrl,
        engagement: Object.keys(engagement).length > 0 ? engagement : undefined,
        media: ogImage || videoImage ? {
          images: ogImage ? [ogImage] : [],
          videos: [],
          thumbnails: videoImage ? [videoImage] : [],
        } : undefined,
        hashtags: hashtags.length > 0 ? hashtags : undefined,
        mentions: mentions.length > 0 ? mentions : undefined,
        postedAt,
        ...customData,
      }
    }

    // Detect license from HTML metadata and content
    let detectedLicense: LicenseDetectionResult | null = null

    // First try HTML meta tags (most reliable)
    detectedLicense = detectLicenseFromHTML(html)

    // If not found in HTML, try content analysis
    if (!detectedLicense) {
      detectedLicense = detectLicenseFromContent(text)
    }

    return NextResponse.json({
      content,
      title,
      metadata: {
        author,
        siteName,
        ...socialMetadata,
        // Add license detection result
        detectedLicense: detectedLicense ? {
          license: detectedLicense.license,
          confidence: detectedLicense.confidence,
          source: detectedLicense.source,
          licenseUrl: detectedLicense.licenseUrl,
          reasoning: detectedLicense.reasoning,
        } : undefined,
      }
    })

  } catch (error: any) {
    console.error('Scrape error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to scrape URL' },
      { status: 500 }
    )
  }
}
