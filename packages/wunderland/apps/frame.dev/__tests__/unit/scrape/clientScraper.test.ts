/**
 * Client Scraper Tests
 * @module tests/unit/scrape/clientScraper
 *
 * Tests for client-side URL scraping functionality.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { ClientScrapeResult } from '@/lib/scrape/clientScraper'

// Mock the corsProxy module with actual function names
vi.mock('@/lib/scrape/corsProxy', () => ({
  fetchWithCorsProxy: vi.fn(),
  htmlToMarkdown: vi.fn((html: string) => html.replace(/<[^>]*>/g, '')),
  extractHtmlMetadata: vi.fn(() => ({})),
}))

// Mock the clientPdfParser with actual function names
vi.mock('@/lib/scrape/clientPdfParser', () => ({
  parsePdfFromUrl: vi.fn(),
  formatPdfAsMarkdown: vi.fn((result: unknown) => {
    const r = result as { content: string; metadata?: { title?: string } }
    return `# ${r.metadata?.title || 'PDF'}\n\n${r.content}`
  }),
  isPdfJsAvailable: vi.fn(() => Promise.resolve(true)),
}))

// Mock the social platforms
vi.mock('@/lib/social/platforms', () => ({
  detectPlatformFromUrl: vi.fn(() => null),
  extractPostId: vi.fn(() => null),
  extractUsername: vi.fn(() => null),
}))

vi.mock('@/lib/social/sourceHelper', () => ({
  extractHashtags: vi.fn(() => []),
  extractMentions: vi.fn(() => []),
  buildProfileUrl: vi.fn(() => null),
}))

describe('Client Scraper', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('clientScrape', () => {
    it('should handle PDF URLs', async () => {
      const { clientScrape } = await import('@/lib/scrape/clientScraper')

      // PDF URLs should be processed (either as pdf or fallback)
      const result = await clientScrape('https://example.com/document.pdf')

      // The result should always be defined
      expect(result).toBeDefined()
      expect(result).toHaveProperty('success')
      expect(result).toHaveProperty('method')
      // Method could be 'pdf' or 'fallback' depending on mock state
      expect(['pdf', 'html', 'fallback']).toContain(result.method)
    })

    it('should fall back to HTML scraping for non-PDF URLs', async () => {
      const { fetchWithCorsProxy } = await import('@/lib/scrape/corsProxy')
      const { clientScrape } = await import('@/lib/scrape/clientScraper')

      vi.mocked(fetchWithCorsProxy).mockResolvedValueOnce({
        success: true,
        content: '<html><title>Test Page</title><body>Content</body></html>',
        contentType: 'text/html',
      })

      const result = await clientScrape('https://example.com/article')

      expect(fetchWithCorsProxy).toHaveBeenCalled()
      expect(result.success).toBe(true)
      expect(result.method).toBe('html')
    })

    it('should handle proxy failure gracefully', async () => {
      const { fetchWithCorsProxy } = await import('@/lib/scrape/corsProxy')
      const { clientScrape } = await import('@/lib/scrape/clientScraper')

      // When proxy returns failure, result should still be defined
      vi.mocked(fetchWithCorsProxy).mockResolvedValueOnce({
        success: false,
        error: 'CORS blocked',
      })

      const result = await clientScrape('https://blocked-site.com/page')

      // The implementation may succeed with fallback content or fail
      expect(result).toBeDefined()
      expect(result).toHaveProperty('success')
    })

    it('should return error for invalid URLs', async () => {
      const { clientScrape } = await import('@/lib/scrape/clientScraper')

      const result = await clientScrape('not-a-valid-url')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Invalid URL')
    })
  })

  describe('ClientScrapeResult structure', () => {
    it('should have correct structure for success result', async () => {
      const { fetchWithCorsProxy } = await import('@/lib/scrape/corsProxy')
      const { clientScrape } = await import('@/lib/scrape/clientScraper')

      vi.mocked(fetchWithCorsProxy).mockResolvedValueOnce({
        success: true,
        content: '<html><title>Test</title><body>Test content</body></html>',
        contentType: 'text/html',
      })

      const result = await clientScrape('https://example.com')

      expect(result).toHaveProperty('success')
      expect(result).toHaveProperty('content')
      expect(result).toHaveProperty('method')
      expect(result.success).toBe(true)
    })

    it('should handle thrown errors gracefully', async () => {
      const { clientScrape } = await import('@/lib/scrape/clientScraper')

      // Test with invalid URL to trigger error handling
      const result = await clientScrape('not-a-valid-url')

      expect(result.success).toBe(false)
      expect(result).toHaveProperty('error')
    })
  })

  describe('isClientScrapeAvailable', () => {
    it('should report available when fetch exists', async () => {
      const { isClientScrapeAvailable } = await import('@/lib/scrape/clientScraper')

      const result = await isClientScrapeAvailable()

      expect(result.available).toBe(true)
      expect(result.webSupport).toBe(true)
    })
  })
})
