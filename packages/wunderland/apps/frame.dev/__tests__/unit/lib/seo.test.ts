/**
 * SEO Utilities Tests
 * @module __tests__/unit/lib/seo.test
 *
 * Tests for SEO metadata generation, keywords, and structured data.
 */

import { describe, it, expect } from 'vitest'
import {
  QUARRY_PRIMARY_KEYWORDS,
  QUARRY_BRAND_KEYWORDS,
  QUARRY_SECONDARY_KEYWORDS,
  QUARRY_LONGTAIL_KEYWORDS,
  ALL_QUARRY_KEYWORDS,
  FABRIC_PRIMARY_KEYWORDS,
  generateCodexMetadata,
  generateFabricMetadata,
  generateSitemapUrls,
  generateStructuredData,
  generateOGImageUrl,
} from '@/lib/seo'

// ============================================================================
// KEYWORD ARRAYS
// ============================================================================

describe('Keyword Arrays', () => {
  describe('QUARRY_PRIMARY_KEYWORDS', () => {
    it('is a non-empty array', () => {
      expect(QUARRY_PRIMARY_KEYWORDS.length).toBeGreaterThan(0)
    })

    it('contains Quarry brand keywords', () => {
      expect(QUARRY_PRIMARY_KEYWORDS).toContain('Quarry')
      expect(QUARRY_PRIMARY_KEYWORDS).toContain('Quarry Codex')
    })

    it('all keywords are strings', () => {
      QUARRY_PRIMARY_KEYWORDS.forEach(keyword => {
        expect(typeof keyword).toBe('string')
      })
    })
  })

  describe('QUARRY_BRAND_KEYWORDS', () => {
    it('contains Frame.dev brand associations', () => {
      const hasFrameKeyword = QUARRY_BRAND_KEYWORDS.some(k => k.includes('Frame'))
      expect(hasFrameKeyword).toBe(true)
    })
  })

  describe('QUARRY_SECONDARY_KEYWORDS', () => {
    it('contains general note-taking keywords', () => {
      const hasNotesKeyword = QUARRY_SECONDARY_KEYWORDS.some(k =>
        k.includes('notes') || k.includes('knowledge')
      )
      expect(hasNotesKeyword).toBe(true)
    })
  })

  describe('QUARRY_LONGTAIL_KEYWORDS', () => {
    it('contains competitor alternative keywords', () => {
      const hasAlternative = QUARRY_LONGTAIL_KEYWORDS.some(k => k.includes('alternative'))
      expect(hasAlternative).toBe(true)
    })
  })

  describe('ALL_QUARRY_KEYWORDS', () => {
    it('combines all keyword arrays', () => {
      expect(ALL_QUARRY_KEYWORDS.length).toBe(
        QUARRY_PRIMARY_KEYWORDS.length +
        QUARRY_BRAND_KEYWORDS.length +
        QUARRY_SECONDARY_KEYWORDS.length +
        QUARRY_LONGTAIL_KEYWORDS.length
      )
    })

    it('includes keywords from all categories', () => {
      expect(ALL_QUARRY_KEYWORDS).toContain(QUARRY_PRIMARY_KEYWORDS[0])
      expect(ALL_QUARRY_KEYWORDS).toContain(QUARRY_BRAND_KEYWORDS[0])
      expect(ALL_QUARRY_KEYWORDS).toContain(QUARRY_SECONDARY_KEYWORDS[0])
      expect(ALL_QUARRY_KEYWORDS).toContain(QUARRY_LONGTAIL_KEYWORDS[0])
    })
  })

  describe('Legacy aliases', () => {
    it('FABRIC_PRIMARY_KEYWORDS equals QUARRY_PRIMARY_KEYWORDS', () => {
      expect(FABRIC_PRIMARY_KEYWORDS).toEqual(QUARRY_PRIMARY_KEYWORDS)
    })
  })
})

// ============================================================================
// generateCodexMetadata
// ============================================================================

describe('generateCodexMetadata', () => {
  it('generates title with Quarry suffix', () => {
    const metadata = generateCodexMetadata({
      title: 'Test Page',
      description: 'A test page',
    })

    expect(metadata.title).toBe('Test Page – Quarry')
  })

  it('includes description', () => {
    const metadata = generateCodexMetadata({
      title: 'Test',
      description: 'This is a test description',
    })

    expect(metadata.description).toBe('This is a test description')
  })

  it('generates canonical URL from path', () => {
    const metadata = generateCodexMetadata({
      title: 'Test',
      description: 'Test',
      path: 'weaves/intro',
    })

    expect(metadata.alternates?.canonical).toBe('https://frame.dev/quarry/weaves/intro')
  })

  it('strips .md extension from path', () => {
    const metadata = generateCodexMetadata({
      title: 'Test',
      description: 'Test',
      path: 'weaves/intro.md',
    })

    expect(metadata.alternates?.canonical).toBe('https://frame.dev/quarry/weaves/intro')
  })

  it('uses custom canonical URL when provided', () => {
    const metadata = generateCodexMetadata({
      title: 'Test',
      description: 'Test',
      path: 'weaves/intro',
      seo: { canonicalUrl: 'https://custom.url/page' },
    })

    expect(metadata.alternates?.canonical).toBe('https://custom.url/page')
  })

  it('generates OG image URL with title and type', () => {
    const metadata = generateCodexMetadata({
      title: 'My Page',
      description: 'Test',
      path: 'test',
      type: 'strand',
    })

    const ogImage = (metadata.openGraph?.images as any[])?.[0]?.url
    expect(ogImage).toContain('/api/og?')
    expect(ogImage).toContain('title=')
    expect(ogImage).toContain('type=strand')
  })

  it('uses custom OG image when provided', () => {
    const metadata = generateCodexMetadata({
      title: 'Test',
      description: 'Test',
      seo: { ogImage: 'https://custom.og/image.png' },
    })

    const ogImage = (metadata.openGraph?.images as any[])?.[0]?.url
    expect(ogImage).toBe('https://custom.og/image.png')
  })

  it('sets robots to index by default', () => {
    const metadata = generateCodexMetadata({
      title: 'Test',
      description: 'Test',
    })

    expect(metadata.robots).toHaveProperty('index', true)
    expect(metadata.robots).toHaveProperty('follow', true)
  })

  it('respects seo.index setting', () => {
    const metadata = generateCodexMetadata({
      title: 'Test',
      description: 'Test',
      seo: { index: false },
    })

    expect(metadata.robots).toHaveProperty('index', false)
  })

  it('respects legacy noindex flag', () => {
    const metadata = generateCodexMetadata({
      title: 'Test',
      description: 'Test',
      noindex: true,
    })

    expect(metadata.robots).toHaveProperty('index', false)
  })

  it('uses custom metaDescription when provided', () => {
    const metadata = generateCodexMetadata({
      title: 'Test',
      description: 'Original description',
      seo: { metaDescription: 'Custom meta description' },
    })

    expect(metadata.description).toBe('Custom meta description')
  })

  it('includes page tags in keywords', () => {
    const metadata = generateCodexMetadata({
      title: 'Test',
      description: 'Test',
      tags: ['typescript', 'testing'],
    })

    expect(metadata.keywords).toContain('typescript')
    expect(metadata.keywords).toContain('testing')
  })

  it('includes OpenGraph metadata', () => {
    const metadata = generateCodexMetadata({
      title: 'Test Page',
      description: 'Test description',
    })

    expect(metadata.openGraph?.type).toBe('article')
    expect(metadata.openGraph?.title).toBe('Test Page – Quarry')
    expect(metadata.openGraph?.siteName).toBe('Quarry Codex by Frame.dev')
  })

  it('includes Twitter Card metadata', () => {
    const metadata = generateCodexMetadata({
      title: 'Test',
      description: 'Test description',
    })

    expect(metadata.twitter?.card).toBe('summary_large_image')
    expect(metadata.twitter?.creator).toBe('@framersai')
  })
})

// ============================================================================
// generateFabricMetadata
// ============================================================================

describe('generateFabricMetadata', () => {
  it('generates title with Quarry by Frame.dev suffix', () => {
    const metadata = generateFabricMetadata({
      title: 'About',
      description: 'About page',
    })

    expect(metadata.title).toBe('About | Quarry by Frame.dev')
  })

  it('generates canonical URL from path', () => {
    const metadata = generateFabricMetadata({
      title: 'FAQ',
      description: 'FAQ page',
      path: 'faq',
    })

    expect(metadata.alternates?.canonical).toBe('https://frame.dev/quarry/faq')
  })

  it('uses default OG image when not provided', () => {
    const metadata = generateFabricMetadata({
      title: 'Test',
      description: 'Test',
    })

    const ogImage = (metadata.openGraph?.images as any[])?.[0]?.url
    expect(ogImage).toBe('https://frame.dev/og-codex.png')
  })

  it('merges custom keywords with defaults', () => {
    const metadata = generateFabricMetadata({
      title: 'Test',
      description: 'Test',
      keywords: ['custom', 'keywords'],
    })

    expect(metadata.keywords).toContain('custom')
    expect(metadata.keywords).toContain('keywords')
    expect(metadata.keywords).toContain('Quarry') // From defaults
  })

  it('sets index to true by default', () => {
    const metadata = generateFabricMetadata({
      title: 'Test',
      description: 'Test',
    })

    expect(metadata.robots).toHaveProperty('index', true)
  })

  it('respects index: false setting', () => {
    const metadata = generateFabricMetadata({
      title: 'Test',
      description: 'Test',
      index: false,
    })

    expect(metadata.robots).toHaveProperty('index', false)
  })

  it('sets OpenGraph type to website', () => {
    const metadata = generateFabricMetadata({
      title: 'Test',
      description: 'Test',
    })

    expect(metadata.openGraph?.type).toBe('website')
  })
})

// ============================================================================
// generateSitemapUrls
// ============================================================================

describe('generateSitemapUrls', () => {
  it('includes main Codex page', () => {
    const urls = generateSitemapUrls([])

    const codexPage = urls.find(u => u.url.includes('/codex'))
    expect(codexPage).toBeDefined()
    expect(codexPage?.priority).toBe(1.0)
  })

  it('includes search page', () => {
    const urls = generateSitemapUrls([])

    const searchPage = urls.find(u => u.url.includes('/search'))
    expect(searchPage).toBeDefined()
  })

  it('includes graph page', () => {
    const urls = generateSitemapUrls([])

    const graphPage = urls.find(u => u.url.includes('/graph'))
    expect(graphPage).toBeDefined()
  })

  it('generates URLs for file nodes', () => {
    const tree = [
      { type: 'file', path: 'weaves/intro.md' },
      { type: 'file', path: 'weaves/guide.md' },
    ]
    const urls = generateSitemapUrls(tree)

    expect(urls.some(u => u.url.includes('/weaves/intro'))).toBe(true)
    expect(urls.some(u => u.url.includes('/weaves/guide'))).toBe(true)
  })

  it('generates clean URLs without .md extension', () => {
    const tree = [
      { type: 'file', path: 'test/page.md' },
    ]
    const urls = generateSitemapUrls(tree)

    const pageUrl = urls.find(u => u.url.includes('/test/page'))
    expect(pageUrl?.url).not.toContain('.md')
  })

  it('uses custom baseUrl', () => {
    const tree = [
      { type: 'file', path: 'test.md' },
    ]
    const urls = generateSitemapUrls(tree, 'https://custom.domain')

    expect(urls.some(u => u.url.startsWith('https://custom.domain'))).toBe(true)
  })

  it('skips noindex pages', () => {
    const tree = [
      { type: 'file', path: 'public.md' },
      { type: 'file', path: 'private.md', metadata: { noindex: true } },
    ]
    const urls = generateSitemapUrls(tree)

    expect(urls.some(u => u.url.includes('/public'))).toBe(true)
    expect(urls.some(u => u.url.includes('/private'))).toBe(false)
  })

  it('skips pages with seo.index: false', () => {
    const tree = [
      { type: 'file', path: 'hidden.md', metadata: { seo: { index: false } } },
    ]
    const urls = generateSitemapUrls(tree)

    expect(urls.some(u => u.url.includes('/hidden'))).toBe(false)
  })

  it('traverses nested children', () => {
    const tree = [
      {
        type: 'folder',
        children: [
          { type: 'file', path: 'nested/child.md' },
        ],
      },
    ]
    const urls = generateSitemapUrls(tree)

    expect(urls.some(u => u.url.includes('/nested/child'))).toBe(true)
  })

  it('uses SEO settings for changeFrequency', () => {
    const tree = [
      { type: 'file', path: 'daily.md', metadata: { seo: { changeFrequency: 'daily' } } },
    ]
    const urls = generateSitemapUrls(tree)

    const page = urls.find(u => u.url.includes('/daily'))
    expect(page?.changeFrequency).toBe('daily')
  })

  it('uses SEO settings for sitemapPriority', () => {
    const tree = [
      { type: 'file', path: 'important.md', metadata: { seo: { sitemapPriority: 0.95 } } },
    ]
    const urls = generateSitemapUrls(tree)

    const page = urls.find(u => u.url.includes('/important'))
    expect(page?.priority).toBe(0.95)
  })

  it('uses legacy URLs when useCleanUrls is false', () => {
    const tree = [
      { type: 'file', path: 'test.md' },
    ]
    const urls = generateSitemapUrls(tree, 'https://frame.dev', false)

    const page = urls.find(u => u.url.includes('test'))
    expect(page?.url).toContain('?file=')
  })
})

// ============================================================================
// generateStructuredData
// ============================================================================

describe('generateStructuredData', () => {
  it('returns Article schema type', () => {
    const data = generateStructuredData({
      title: 'Test Article',
      description: 'Test description',
    })

    expect(data['@context']).toBe('https://schema.org')
    expect(data['@type']).toBe('Article')
  })

  it('includes headline and description', () => {
    const data = generateStructuredData({
      title: 'My Article',
      description: 'Article description',
    })

    expect(data.headline).toBe('My Article')
    expect(data.description).toBe('Article description')
  })

  it('includes Frame.dev as author', () => {
    const data = generateStructuredData({
      title: 'Test',
      description: 'Test',
    })

    expect(data.author['@type']).toBe('Organization')
    expect(data.author.name).toBe('Frame.dev')
  })

  it('includes publisher with logo', () => {
    const data = generateStructuredData({
      title: 'Test',
      description: 'Test',
    })

    expect(data.publisher['@type']).toBe('Organization')
    expect(data.publisher.logo['@type']).toBe('ImageObject')
  })

  it('uses lastUpdated for dates', () => {
    const data = generateStructuredData({
      title: 'Test',
      description: 'Test',
      lastUpdated: '2024-06-15T12:00:00Z',
    })

    expect(data.datePublished).toBe('2024-06-15T12:00:00Z')
    expect(data.dateModified).toBe('2024-06-15T12:00:00Z')
  })

  it('includes tags as keywords', () => {
    const data = generateStructuredData({
      title: 'Test',
      description: 'Test',
      tags: ['typescript', 'testing', 'seo'],
    })

    expect(data.keywords).toBe('typescript, testing, seo')
  })
})

// ============================================================================
// generateOGImageUrl
// ============================================================================

describe('generateOGImageUrl', () => {
  it('generates URL with title parameter', () => {
    const url = generateOGImageUrl('My Page Title')

    expect(url).toContain('/api/og?')
    expect(url).toContain('title=My+Page+Title')
  })

  it('uses strand type by default', () => {
    const url = generateOGImageUrl('Test')

    expect(url).toContain('type=strand')
  })

  it('includes specified type', () => {
    const url = generateOGImageUrl('Test', 'weave')
    expect(url).toContain('type=weave')

    const loomUrl = generateOGImageUrl('Test', 'loom')
    expect(loomUrl).toContain('type=loom')
  })

  it('encodes special characters in title', () => {
    const url = generateOGImageUrl('Hello & Goodbye')

    expect(url).toContain('title=Hello+%26+Goodbye')
  })

  it('handles empty title', () => {
    const url = generateOGImageUrl('')

    expect(url).toContain('title=')
  })
})
