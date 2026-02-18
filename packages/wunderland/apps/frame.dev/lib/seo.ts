/**
 * SEO utilities for Quarry Codex pages
 * @module lib/seo
 * 
 * @remarks
 * - Generate OpenGraph and Twitter Card meta tags
 * - Dynamic OG images with SVG rendering
 * - Sitemap generation for all Codex pages
 * - Canonical URLs and structured data
 * - Domain-aware SEO for quarry.space and frame.dev
 * - Fabric-specific SEO keywords and branding
 */

import type { Metadata } from 'next'

// ═══════════════════════════════════════════════════════════════════════════════
// DOMAIN CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

/** Frame.dev base URL */
export const FRAME_BASE_URL = 'https://frame.dev'

/** Quarry.space base URL */
export const QUARRY_BASE_URL = 'https://quarry.space'

/**
 * Check if we're running on quarry.space domain
 * Defaults to true (quarry.space is primary domain)
 * Only returns false if explicitly set to frame.dev
 */
export function isQuarryDomain(): boolean {
  // Only frame.dev if explicitly set
  if (process.env.NEXT_PUBLIC_DOMAIN === 'frame.dev') {
    return false
  }
  // Client-side check - frame.dev explicitly
  if (typeof window !== 'undefined') {
    if (window.location.hostname === 'frame.dev' ||
        window.location.hostname === 'www.frame.dev') {
      return false
    }
  }
  // Default to quarry.space
  return true
}

/**
 * Get the current base URL based on domain
 */
export function getCurrentBaseUrl(): string {
  return isQuarryDomain() ? QUARRY_BASE_URL : FRAME_BASE_URL
}

/**
 * Get canonical URL based on domain context
 * 
 * @param path - The path (with or without /quarry prefix)
 * @param domain - Target domain ('frame' or 'quarry')
 * @returns The canonical URL for the specified domain
 * 
 * @example
 * ```ts
 * getCanonicalUrl('/quarry/landing', 'quarry') // 'https://quarry.space/landing'
 * getCanonicalUrl('/quarry/landing', 'frame') // 'https://frame.dev/quarry/landing'
 * getCanonicalUrl('/about', 'frame') // 'https://frame.dev/about'
 * ```
 */
export function getCanonicalUrl(path: string, domain: 'frame' | 'quarry' = 'frame'): string {
  if (domain === 'quarry') {
    // Remove /quarry prefix for quarry.space
    const cleanPath = path.replace(/^\/quarry/, '') || '/'
    return `${QUARRY_BASE_URL}${cleanPath}`
  }
  return `${FRAME_BASE_URL}${path}`
}

/**
 * Generate hreflang alternates for multi-domain SEO
 * 
 * @param framePath - The path on frame.dev (e.g., '/quarry/landing')
 * @returns Alternates object for Next.js metadata
 */
export function getHreflangAlternates(framePath: string): Metadata['alternates'] {
  const isQuarryPath = framePath.startsWith('/quarry')

  if (isQuarryPath) {
    const quarryPath = framePath.replace(/^\/quarry/, '') || '/'
    return {
      canonical: `${FRAME_BASE_URL}${framePath}`,
      languages: {
        'en': `${FRAME_BASE_URL}${framePath}`,
        'x-default': `${QUARRY_BASE_URL}${quarryPath}`,
      },
    }
  }

  return {
    canonical: `${FRAME_BASE_URL}${framePath}`,
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUARRY SEO KEYWORDS
// ═══════════════════════════════════════════════════════════════════════════════

/** GEO Priority Keywords - Optimized for LLM/AI citations (Generative Engine Optimization) */
export const GEO_PRIORITY_KEYWORDS = [
  'automatic second brain',
  'free notetaking app',
  'open source notetaking',
  'free PKM app',
  'open source pkm',
  'ai native notes',
  'knowledge graph free',
  'best free notion alternative',
  'open source obsidian alternative',
  'free personal knowledge management',
  'ai native notes free',
  'knowledge graph app free',
  'quarry notes',
  'quarry.space',
  'framersai',
] as const

/** Brand Keywords - For brand recognition across AI and search */
export const BRAND_KEYWORDS = [
  'quarry',
  'quarry space',
  'quarry.space',
  'frame.dev',
  'frame dev',
  'framersai',
  'FramersAI',
  'team@frame.dev',
  'automatic second brain',
  'Quarry Codex',
  'Quarry by Frame.dev',
] as const

/** Primary Quarry-branded keywords for SEO */
export const QUARRY_PRIMARY_KEYWORDS = [
  'Quarry',
  'Quarry notes',
  'Quarry AI notes',
  'Quarry notetaking',
  'Quarry PKM',
  'Quarry PKMS',
  'Quarry knowledge management',
  'Quarry notes app',
  'Quarry Codex',
  'Quarry digital garden',
] as const

/** Brand association keywords */
export const QUARRY_BRAND_KEYWORDS = [
  'Quarry by Frame',
  'Quarry by Frame.dev',
  'Quarry Frame AI',
  'Frame Quarry',
  'Frame.dev Quarry',
  'free open source Quarry',
  'Quarry open source',
  'Quarry MIT license',
] as const

/** Secondary general keywords for SEO */
export const QUARRY_SECONDARY_KEYWORDS = [
  'ai notetaking app',
  'ai notes app',
  'personal knowledge base',
  'second brain app',
  'offline notes app',
  'privacy-first notes',
  'open source notes app',
  'markdown notes app',
  'knowledge graph app',
  'ai-powered notes',
  'free pkm software',
  'offline first notes',
] as const

/** Long-tail SEO keywords */
export const QUARRY_LONGTAIL_KEYWORDS = [
  'best ai notes app 2025',
  'obsidian alternative',
  'notion alternative open source',
  'roam alternative',
  'logseq alternative',
  'private ai notes',
  'semantic search notes',
  'connected notes app',
  'digital garden app',
  'zettelkasten app',
  'pkms app',
  'free personal knowledge management',
  'offline knowledge base',
  'local first notes app',
] as const

/** All Quarry keywords combined (including GEO priority) */
export const ALL_QUARRY_KEYWORDS = [
  ...GEO_PRIORITY_KEYWORDS,
  ...BRAND_KEYWORDS,
  ...QUARRY_PRIMARY_KEYWORDS,
  ...QUARRY_BRAND_KEYWORDS,
  ...QUARRY_SECONDARY_KEYWORDS,
  ...QUARRY_LONGTAIL_KEYWORDS,
] as const

// Legacy aliases for backwards compatibility
export const FABRIC_PRIMARY_KEYWORDS = QUARRY_PRIMARY_KEYWORDS
export const FABRIC_SECONDARY_KEYWORDS = QUARRY_SECONDARY_KEYWORDS
export const FABRIC_LONGTAIL_KEYWORDS = QUARRY_LONGTAIL_KEYWORDS
export const ALL_FABRIC_KEYWORDS = ALL_QUARRY_KEYWORDS

interface CodexPageMetadata {
  /** Page title */
  title: string
  /** Page description */
  description: string
  /** File path or page slug */
  path?: string
  /** Tags/keywords */
  tags?: string[]
  /** File type (for icons) */
  type?: 'weave' | 'loom' | 'strand'
  /** Last updated date */
  lastUpdated?: string
  /** SEO controls from strand metadata */
  seo?: {
    index?: boolean
    follow?: boolean
    canonicalUrl?: string
    metaDescription?: string
    ogImage?: string
    sitemapPriority?: number
    changeFrequency?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'
  }
  /** Legacy noindex flag */
  noindex?: boolean
}

/**
 * Generate Next.js metadata for a Codex page
 * 
 * @param page - Page metadata
 * @returns Next.js Metadata object
 * 
 * @example
 * ```ts
 * export const metadata = generateCodexMetadata({
 *   title: 'Introduction to OpenStrand',
 *   description: 'Learn the basics of OpenStrand architecture',
 *   path: 'weaves/frame/openstrand-intro',
 *   tags: ['openstrand', 'architecture'],
 *   type: 'strand',
 * })
 * ```
 */
export function generateCodexMetadata(page: CodexPageMetadata): Metadata {
  const baseUrl = 'https://frame.dev'
  const fullTitle = `${page.title} – Quarry`

  // Generate clean canonical URL (without .md extension)
  const cleanPath = page.path?.replace(/\.md$/, '')
  const url = page.seo?.canonicalUrl || (cleanPath ? `${baseUrl}/quarry/${cleanPath}` : `${baseUrl}/codex`)

  // Use custom OG image if provided, otherwise generate one
  const ogImageUrl = page.seo?.ogImage || (page.path
    ? `${baseUrl}/api/og?title=${encodeURIComponent(page.title)}&type=${page.type || 'strand'}`
    : `${baseUrl}/api/og?title=${encodeURIComponent(page.title)}`)

  // Determine indexing - respect seo.index, legacy noindex, default to true
  const shouldIndex = page.seo?.index !== undefined
    ? page.seo.index
    : page.noindex !== undefined
      ? !page.noindex
      : true

  const shouldFollow = page.seo?.follow !== undefined ? page.seo.follow : true

  // Use custom meta description if provided
  const description = page.seo?.metaDescription || page.description

  // Merge page tags with default Fabric keywords
  const keywords = page.tags
    ? [...page.tags, ...FABRIC_PRIMARY_KEYWORDS.slice(0, 5)].join(', ')
    : FABRIC_PRIMARY_KEYWORDS.join(', ')

  return {
    title: fullTitle,
    description,
    keywords,
    authors: [{ name: 'Frame.dev', url: 'https://frame.dev' }],
    creator: 'Frame.dev',
    publisher: 'Frame.dev',
    // Quarry icons for consistent branding across all dynamic routes
    icons: {
      icon: [
        { url: '/quarry-icon-mono-light.svg', media: '(prefers-color-scheme: light)' },
        { url: '/quarry-icon-mono-dark.svg', media: '(prefers-color-scheme: dark)' },
      ],
      shortcut: '/quarry-icon-mono-light.svg',
      apple: '/quarry-icon-mono-light.svg',
    },
    robots: {
      index: shouldIndex,
      follow: shouldFollow,
      googleBot: {
        index: shouldIndex,
        follow: shouldFollow,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    openGraph: {
      type: 'article',
      url,
      title: fullTitle,
      description,
      siteName: 'Quarry Codex by Frame.dev',
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: page.title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      images: [ogImageUrl],
      creator: '@framersai',
    },
    alternates: {
      canonical: url,
    },
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FABRIC-SPECIFIC METADATA GENERATOR
// ═══════════════════════════════════════════════════════════════════════════════

interface FabricPageMetadata {
  /** Page title (will be appended with " | Quarry by Frame.dev") */
  title: string
  /** Page description */
  description: string
  /** Page path for canonical URL (e.g., 'about', 'faq') */
  path?: string
  /** Additional keywords to merge with defaults */
  keywords?: string[]
  /** Custom OG image URL */
  ogImage?: string
  /** Should this page be indexed? (default: true) */
  index?: boolean
}

/**
 * Generate Next.js metadata for Quarry Codex pages with optimized SEO
 * 
 * @param page - Page metadata
 * @returns Next.js Metadata object with Fabric branding and keywords
 * 
 * @example
 * ```ts
 * export const metadata = generateFabricMetadata({
 *   title: 'About Quarry Codex',
 *   description: 'Learn about Quarry Codex - your AI-powered notes app',
 *   path: 'about',
 *   keywords: ['about', 'mission'],
 * })
 * ```
 */
export function generateFabricMetadata(page: FabricPageMetadata): Metadata {
  const baseUrl = 'https://frame.dev'
  const fullTitle = `${page.title} | Quarry by Frame.dev`
  const url = page.path ? `${baseUrl}/quarry/${page.path}` : `${baseUrl}/codex`
  const ogImageUrl = page.ogImage || `${baseUrl}/og-codex.png`

  // Combine custom keywords with Fabric defaults
  const allKeywords = [
    ...(page.keywords || []),
    ...FABRIC_PRIMARY_KEYWORDS,
    ...FABRIC_SECONDARY_KEYWORDS.slice(0, 5),
  ]

  return {
    title: fullTitle,
    description: page.description,
    keywords: allKeywords.join(', '),
    authors: [{ name: 'Frame.dev', url: 'https://frame.dev' }],
    creator: 'Frame.dev',
    publisher: 'Frame.dev',
    // Quarry icons for consistent branding
    icons: {
      icon: [
        { url: '/quarry-icon-mono-light.svg', media: '(prefers-color-scheme: light)' },
        { url: '/quarry-icon-mono-dark.svg', media: '(prefers-color-scheme: dark)' },
      ],
      shortcut: '/quarry-icon-mono-light.svg',
      apple: '/quarry-icon-mono-light.svg',
    },
    robots: {
      index: page.index !== false,
      follow: true,
      googleBot: {
        index: page.index !== false,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    openGraph: {
      type: 'website',
      url,
      title: fullTitle,
      description: page.description,
      siteName: 'Quarry Codex by Frame.dev',
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: page.title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description: page.description,
      images: [ogImageUrl],
      creator: '@framersai',
    },
    alternates: {
      canonical: url,
    },
  }
}

/**
 * Generate sitemap entries for all Codex pages
 * 
 * @param tree - Knowledge tree
 * @param useCleanUrls - Use clean URLs (default: true)
 * @returns Array of sitemap URLs
 * 
 * @remarks
 * Recursively walks the knowledge tree and generates sitemap entries
 * for all pages. Priority is based on hierarchy level.
 * Respects SEO settings - excludes noindex pages.
 * 
 * @example
 * ```ts
 * const urls = generateSitemapUrls(knowledgeTree)
 * // Returns: [{ url: 'https://frame.dev/quarry/weaves/frame/intro', lastModified: '...', priority: 0.8 }]
 * ```
 */
export function generateSitemapUrls(
  tree: any[],
  baseUrl: string = 'https://frame.dev',
  useCleanUrls: boolean = true
): Array<{ url: string; lastModified?: string; changeFrequency?: string; priority?: number }> {
  const urls: Array<{ url: string; lastModified?: string; changeFrequency?: string; priority?: number }> = []

  // Add main Codex page
  urls.push({
    url: `${baseUrl}/codex`,
    changeFrequency: 'daily',
    priority: 1.0,
  })

  // Add search page
  urls.push({
    url: `${baseUrl}/quarry/search`,
    changeFrequency: 'daily',
    priority: 0.9,
  })

  // Add graph page
  urls.push({
    url: `${baseUrl}/quarry/graph`,
    changeFrequency: 'weekly',
    priority: 0.8,
  })

  const traverse = (nodes: any[], priorityMultiplier: number = 0.8) => {
    nodes.forEach((node) => {
      // Skip if marked as noindex
      const shouldIndex = node.metadata?.seo?.index !== false &&
        node.metadata?.noindex !== true

      if (!shouldIndex) return

      if (node.type === 'file' && node.path) {
        // Generate clean URL by removing .md extension
        const cleanPath = node.path.replace(/\.md$/, '')
        const url = useCleanUrls
          ? `${baseUrl}/quarry/${cleanPath}`
          : `${baseUrl}/codex?file=${node.path}`

        // Use SEO settings if available
        const changeFreq = node.metadata?.seo?.changeFrequency || 'weekly'
        const priority = node.metadata?.seo?.sitemapPriority || priorityMultiplier

        urls.push({
          url,
          lastModified: node.lastModified || node.metadata?.autoGenerated?.lastIndexed || new Date().toISOString(),
          changeFrequency: changeFreq,
          priority,
        })
      }

      if (node.children && node.children.length > 0) {
        traverse(node.children, priorityMultiplier * 0.9)
      }
    })
  }

  traverse(tree)

  return urls
}

/**
 * Generate JSON-LD structured data for a Codex page
 * 
 * @param page - Page metadata
 * @returns JSON-LD object
 * 
 * @example
 * ```tsx
 * <script
 *   type="application/ld+json"
 *   dangerouslySetInnerHTML={{ __html: JSON.stringify(generateStructuredData(pageData)) }}
 * />
 * ```
 */
export function generateStructuredData(page: CodexPageMetadata) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: page.title,
    description: page.description,
    author: {
      '@type': 'Organization',
      name: 'Frame.dev',
      url: 'https://frame.dev',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Frame.dev',
      url: 'https://frame.dev',
      logo: {
        '@type': 'ImageObject',
        url: 'https://frame.dev/frame-logo-transparent.png',
      },
    },
    datePublished: page.lastUpdated || new Date().toISOString(),
    dateModified: page.lastUpdated || new Date().toISOString(),
    keywords: page.tags?.join(', '),
  }
}

/**
 * Generate dynamic OG image URL for a Codex page
 * 
 * @param title - Page title
 * @param type - Hierarchy type
 * @returns OG image URL
 * 
 * @remarks
 * Points to API route that renders SVG with title and type badge
 * 
 * @example
 * ```ts
 * const ogImage = generateOGImageUrl('OpenStrand Architecture', 'strand')
 * // '/api/og?title=OpenStrand%20Architecture&type=strand'
 * ```
 */
export function generateOGImageUrl(title: string, type: 'weave' | 'loom' | 'strand' = 'strand'): string {
  const params = new URLSearchParams({
    title,
    type,
  })
  return `/api/og?${params.toString()}`
}

