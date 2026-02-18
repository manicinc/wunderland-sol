/**
 * Client-Side URL Scraper Orchestrator
 * @module lib/scrape/clientScraper
 *
 * Orchestrates client-side URL scraping for static deployments.
 * Routes requests to appropriate handlers based on URL type:
 * - PDF files → clientPdfParser (PDF.js)
 * - Web pages → corsProxy + HTML parsing
 *
 * Returns the same format as /api/scrape for consistency.
 */

import {
  fetchWithCorsProxy,
  htmlToMarkdown,
  extractHtmlMetadata,
} from './corsProxy'
import {
  parsePdfFromUrl,
  formatPdfAsMarkdown,
  isPdfJsAvailable,
} from './clientPdfParser'
import {
  detectPlatformFromUrl,
  extractPostId,
  extractUsername,
} from '@/lib/social/platforms'
import {
  extractHashtags,
  extractMentions,
  buildProfileUrl,
} from '@/lib/social/sourceHelper'

/** Result from client-side scraping */
export interface ClientScrapeResult {
  success: boolean
  content?: string
  title?: string
  metadata?: {
    author?: string
    siteName?: string
    pageCount?: number
    platform?: {
      id: string
      name: string
      icon: string
      color: string
    }
    postId?: string | null
    username?: string | null
    profileUrl?: string
    hashtags?: string[]
    mentions?: string[]
  }
  error?: string
  /** Which method was used */
  method?: 'pdf' | 'html' | 'fallback'
}

/**
 * Detect if URL points to a PDF file
 */
function isPdfUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    const pathname = parsed.pathname.toLowerCase()
    
    // Check file extension
    if (pathname.endsWith('.pdf')) {
      return true
    }

    // Check common PDF delivery patterns
    if (pathname.includes('/pdf/') || pathname.includes('/download/')) {
      return true
    }

    return false
  } catch {
    return false
  }
}

/**
 * Parse hostname from URL for site name
 */
function extractSiteName(url: string): string {
  try {
    const parsed = new URL(url)
    // Remove 'www.' prefix
    return parsed.hostname.replace(/^www\./, '')
  } catch {
    return 'Unknown'
  }
}

/**
 * Scrape a web page through CORS proxy
 */
async function scrapeWebPage(url: string): Promise<ClientScrapeResult> {
  const proxyResult = await fetchWithCorsProxy(url)

  if (!proxyResult.success || !proxyResult.content) {
    return {
      success: false,
      error: proxyResult.error || 'Failed to fetch page',
      method: 'html',
    }
  }

  const html = proxyResult.content

  // Extract metadata from HTML
  const metadata = extractHtmlMetadata(html)

  // Convert HTML to markdown
  const markdownContent = htmlToMarkdown(html)

  // Build the full content with header
  const title = metadata.title || extractSiteName(url)
  let content = `# ${title}\n\n`

  if (metadata.author) {
    content += `> **Author:** ${metadata.author}\n\n`
  }
  content += `> **Source:** [${url}](${url})\n\n---\n\n`
  content += markdownContent

  // Detect social platform
  const platform = detectPlatformFromUrl(url)
  let socialMetadata: ClientScrapeResult['metadata'] = {
    author: metadata.author,
    siteName: metadata.siteName || extractSiteName(url),
  }

  if (platform) {
    const postId = extractPostId(url)
    const username = extractUsername(url)
    const profileUrl = username ? (buildProfileUrl(platform.id, username) ?? undefined) : undefined

    // Extract hashtags and mentions from content
    const hashtags = extractHashtags(markdownContent)
    const mentions = extractMentions(markdownContent)

    socialMetadata = {
      ...socialMetadata,
      platform: {
        id: platform.id,
        name: platform.name,
        icon: platform.icon,
        color: platform.color,
      },
      postId: postId ?? undefined,
      username: username ?? undefined,
      profileUrl,
      hashtags: hashtags.length > 0 ? hashtags : undefined,
      mentions: mentions.length > 0 ? mentions : undefined,
    }
  }

  return {
    success: true,
    content,
    title,
    metadata: socialMetadata,
    method: 'html',
  }
}

/**
 * Scrape a PDF file using PDF.js
 */
async function scrapePdf(url: string): Promise<ClientScrapeResult> {
  // Check if PDF.js is available
  const pdfJsReady = await isPdfJsAvailable()
  
  if (!pdfJsReady) {
    return {
      success: false,
      error: 'PDF.js is not available. Please install pdfjs-dist.',
      method: 'pdf',
    }
  }

  const result = await parsePdfFromUrl(url)

  if (!result.success) {
    return {
      success: false,
      error: result.error || 'Failed to parse PDF',
      method: 'pdf',
    }
  }

  // Format as markdown
  const content = formatPdfAsMarkdown(result, url)

  return {
    success: true,
    content,
    title: result.title || url.split('/').pop()?.replace('.pdf', '') || 'PDF Document',
    metadata: {
      author: result.author,
      siteName: extractSiteName(url),
      pageCount: result.pageCount,
    },
    method: 'pdf',
  }
}

/**
 * Create a fallback placeholder when scraping completely fails
 */
function createFallbackContent(url: string, error: string): ClientScrapeResult {
  const content = `# Content from ${url}

> **Source:** [${url}](${url})

---

<!-- Failed to scrape content automatically. -->
<!-- Error: ${error} -->

<!-- Please paste the content below manually: -->

`

  return {
    success: true, // Return success with placeholder so UI continues
    content,
    title: url.split('/').pop() || 'Imported Content',
    metadata: {
      siteName: extractSiteName(url),
    },
    method: 'fallback',
  }
}

/**
 * Main client-side scraping function
 *
 * Automatically detects URL type and routes to appropriate handler:
 * - PDF files → PDF.js parser
 * - Web pages → CORS proxy + HTML parser
 *
 * Falls back to a placeholder on complete failure.
 *
 * @param url - The URL to scrape
 * @returns ClientScrapeResult with content or error
 *
 * @example
 * ```typescript
 * const result = await clientScrape('https://example.com/doc.pdf')
 * if (result.success) {
 *   setContent(result.content)
 *   setTitle(result.title)
 * }
 * ```
 */
export async function clientScrape(url: string): Promise<ClientScrapeResult> {
  // Validate URL
  try {
    new URL(url)
  } catch {
    return {
      success: false,
      error: 'Invalid URL format',
    }
  }

  try {
    // Route based on URL type
    if (isPdfUrl(url)) {
      const result = await scrapePdf(url)
      
      if (result.success) {
        return result
      }
      
      // PDF scraping failed, try as web page in case URL serves HTML
      const webResult = await scrapeWebPage(url)
      
      if (webResult.success) {
        return webResult
      }
      
      // Both failed, return PDF error and fallback
      return createFallbackContent(url, result.error || 'Unknown PDF error')
    }

    // Treat as web page
    const result = await scrapeWebPage(url)
    
    if (result.success) {
      return result
    }

    // Web scraping failed, return fallback
    return createFallbackContent(url, result.error || 'Unknown error')
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return createFallbackContent(url, errorMessage)
  }
}

/**
 * Check if client-side scraping is available
 * Tests if required dependencies are loaded
 */
export async function isClientScrapeAvailable(): Promise<{
  available: boolean
  pdfSupport: boolean
  webSupport: boolean
}> {
  const pdfSupport = await isPdfJsAvailable()
  
  // Web scraping (CORS proxy) is always available if we have fetch
  const webSupport = typeof fetch !== 'undefined'

  return {
    available: pdfSupport || webSupport,
    pdfSupport,
    webSupport,
  }
}

