/**
 * CORS Proxy Utility for Client-Side URL Fetching
 * @module lib/scrape/corsProxy
 *
 * Provides multiple fallback CORS proxies for fetching content from
 * external URLs in static deployments (GitHub Pages, etc.) where
 * server-side API routes are not available.
 *
 * Features:
 * - Multiple proxy fallback for reliability
 * - Automatic failover on errors
 * - Rate limiting awareness
 * - HTML-to-text conversion utilities
 */

/** CORS proxy configuration */
export interface CorsProxyConfig {
  /** Proxy identifier */
  id: string
  /** Display name */
  name: string
  /** URL template with {url} placeholder */
  urlTemplate: string
  /** Expected response format */
  responseType: 'json' | 'text'
  /** JSON path to content (for json responseType) */
  contentPath?: string
  /** Whether this proxy is currently enabled */
  enabled: boolean
  /** Request timeout in ms */
  timeout: number
}

/** Result from a proxy fetch attempt */
export interface ProxyFetchResult {
  success: boolean
  content?: string
  contentType?: string
  error?: string
  proxyUsed?: string
}

/**
 * Available CORS proxy services
 * These are free public services - please respect their terms of use
 */
export const CORS_PROXIES: CorsProxyConfig[] = [
  {
    id: 'allorigins',
    name: 'AllOrigins',
    urlTemplate: 'https://api.allorigins.win/get?url={url}',
    responseType: 'json',
    contentPath: 'contents',
    enabled: true,
    timeout: 15000,
  },
  {
    id: 'corsproxy-io',
    name: 'CorsProxy.io',
    urlTemplate: 'https://corsproxy.io/?{url}',
    responseType: 'text',
    enabled: true,
    timeout: 15000,
  },
  {
    id: 'cors-anywhere-herokuapp',
    name: 'CORS Anywhere (Heroku)',
    // Note: This requires requesting temporary access at the demo page
    urlTemplate: 'https://cors-anywhere.herokuapp.com/{url}',
    responseType: 'text',
    enabled: false, // Disabled by default as it requires manual access
    timeout: 15000,
  },
]

/**
 * Build the proxied URL for a given proxy config
 */
export function buildProxyUrl(proxy: CorsProxyConfig, targetUrl: string): string {
  return proxy.urlTemplate.replace('{url}', encodeURIComponent(targetUrl))
}

/**
 * Extract content from proxy response based on config
 */
function extractContent(proxy: CorsProxyConfig, response: unknown): string | null {
  if (proxy.responseType === 'text') {
    return typeof response === 'string' ? response : null
  }

  if (proxy.responseType === 'json' && proxy.contentPath && typeof response === 'object' && response !== null) {
    const paths = proxy.contentPath.split('.')
    let value: unknown = response
    for (const path of paths) {
      if (typeof value === 'object' && value !== null && path in value) {
        value = (value as Record<string, unknown>)[path]
      } else {
        return null
      }
    }
    return typeof value === 'string' ? value : null
  }

  return null
}

/**
 * Fetch content through a single proxy
 */
async function fetchViaProxy(
  proxy: CorsProxyConfig,
  targetUrl: string
): Promise<ProxyFetchResult> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), proxy.timeout)

  try {
    const proxyUrl = buildProxyUrl(proxy, targetUrl)
    
    const response = await fetch(proxyUrl, {
      signal: controller.signal,
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      return {
        success: false,
        error: `Proxy returned ${response.status}: ${response.statusText}`,
        proxyUsed: proxy.id,
      }
    }

    const contentType = response.headers.get('content-type') || ''
    let content: string | null = null

    if (proxy.responseType === 'json') {
      const json = await response.json()
      content = extractContent(proxy, json)
    } else {
      content = await response.text()
    }

    if (!content) {
      return {
        success: false,
        error: 'Could not extract content from proxy response',
        proxyUsed: proxy.id,
      }
    }

    return {
      success: true,
      content,
      contentType,
      proxyUsed: proxy.id,
    }
  } catch (error: unknown) {
    clearTimeout(timeoutId)
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const isAbort = error instanceof Error && error.name === 'AbortError'
    
    return {
      success: false,
      error: isAbort ? `Timeout after ${proxy.timeout}ms` : errorMessage,
      proxyUsed: proxy.id,
    }
  }
}

/**
 * Fetch content through CORS proxies with automatic failover
 *
 * Tries each enabled proxy in order until one succeeds.
 * Returns the content from the first successful proxy.
 *
 * @param targetUrl - The URL to fetch
 * @param options - Optional configuration
 * @returns ProxyFetchResult with content or error
 *
 * @example
 * ```typescript
 * const result = await fetchWithCorsProxy('https://example.com/article')
 * if (result.success) {
 *   console.log('Fetched content:', result.content)
 * }
 * ```
 */
export async function fetchWithCorsProxy(
  targetUrl: string,
  options?: {
    /** Specific proxies to try (by id) */
    proxies?: string[]
    /** Override timeout for all proxies */
    timeout?: number
  }
): Promise<ProxyFetchResult> {
  // Get enabled proxies, optionally filtered by specific IDs
  let proxiesToTry = CORS_PROXIES.filter(p => p.enabled)
  
  if (options?.proxies) {
    proxiesToTry = proxiesToTry.filter(p => options.proxies!.includes(p.id))
  }

  if (proxiesToTry.length === 0) {
    return {
      success: false,
      error: 'No CORS proxies available',
    }
  }

  const errors: string[] = []

  for (const proxy of proxiesToTry) {
    const proxyConfig = options?.timeout 
      ? { ...proxy, timeout: options.timeout }
      : proxy

    const result = await fetchViaProxy(proxyConfig, targetUrl)
    
    if (result.success) {
      return result
    }

    errors.push(`${proxy.name}: ${result.error}`)
  }

  return {
    success: false,
    error: `All proxies failed:\n${errors.join('\n')}`,
  }
}

/**
 * Convert HTML content to plain text
 * Simple extraction without full DOM parsing
 */
export function htmlToText(html: string): string {
  return html
    // Remove script and style tags with content
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    // Remove HTML comments
    .replace(/<!--[\s\S]*?-->/g, '')
    // Convert common block elements to newlines
    .replace(/<\/?(p|div|br|h[1-6]|li|tr)[^>]*>/gi, '\n')
    // Remove all remaining HTML tags
    .replace(/<[^>]+>/g, '')
    // Decode common HTML entities
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
    // Clean up whitespace
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+/g, ' ')
    .trim()
}

/**
 * Convert HTML to Markdown (basic conversion)
 * For more sophisticated conversion, use a dedicated library
 */
export function htmlToMarkdown(html: string): string {
  return html
    // Remove script and style tags
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    // Remove comments
    .replace(/<!--[\s\S]*?-->/g, '')
    // Convert headings
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
    .replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n\n')
    .replace(/<h5[^>]*>(.*?)<\/h5>/gi, '##### $1\n\n')
    .replace(/<h6[^>]*>(.*?)<\/h6>/gi, '###### $1\n\n')
    // Convert paragraphs
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    // Convert links
    .replace(/<a[^>]*href=["']([^"']*)["'][^>]*>(.*?)<\/a>/gi, '[$2]($1)')
    // Convert bold and italic
    .replace(/<(strong|b)[^>]*>(.*?)<\/(strong|b)>/gi, '**$2**')
    .replace(/<(em|i)[^>]*>(.*?)<\/(em|i)>/gi, '*$2*')
    // Convert code
    .replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`')
    .replace(/<pre[^>]*>(.*?)<\/pre>/gis, '```\n$1\n```\n\n')
    // Convert lists
    .replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n')
    .replace(/<\/?[ou]l[^>]*>/gi, '\n')
    // Convert blockquotes
    .replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gis, (_, content) => {
      return content.split('\n').map((line: string) => `> ${line}`).join('\n') + '\n\n'
    })
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
}

/**
 * Extract site name (hostname) from a URL
 */
export function extractSiteName(url: string): string | undefined {
  if (!url) return undefined
  try {
    const parsed = new URL(url)
    // Return hostname without port
    return parsed.hostname
  } catch {
    return undefined
  }
}

/**
 * Convert HTML to Markdown - alias for htmlToMarkdown
 */
export const convertHtmlToMarkdown = htmlToMarkdown

/**
 * Extract metadata from HTML content
 */
export function extractHtmlMetadata(html: string): {
  title?: string
  description?: string
  author?: string
  siteName?: string
  image?: string
} {
  const metadata: ReturnType<typeof extractHtmlMetadata> = {}

  // Extract title
  const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i)
  if (titleMatch) {
    metadata.title = titleMatch[1].replace(/&[^;]+;/g, ' ').trim()
  }

  // Helper to extract meta content
  const extractMeta = (patterns: RegExp[]): string | undefined => {
    for (const pattern of patterns) {
      const match = html.match(pattern)
      if (match?.[1]) {
        return match[1].replace(/&[^;]+;/g, ' ').trim()
      }
    }
    return undefined
  }

  // Extract description
  metadata.description = extractMeta([
    /<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i,
    /<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i,
    /<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i,
  ])

  // Extract author
  metadata.author = extractMeta([
    /<meta[^>]*name=["']author["'][^>]*content=["']([^"']+)["']/i,
    /<meta[^>]*property=["']article:author["'][^>]*content=["']([^"']+)["']/i,
  ])

  // Extract site name
  metadata.siteName = extractMeta([
    /<meta[^>]*property=["']og:site_name["'][^>]*content=["']([^"']+)["']/i,
  ])

  // Extract image
  metadata.image = extractMeta([
    /<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i,
    /<meta[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i,
  ])

  return metadata
}

