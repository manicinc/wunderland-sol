/**
 * CORS Proxy Utility Tests
 * @module tests/unit/scrape/corsProxy
 *
 * Tests for client-side CORS proxy utilities and HTML parsing.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  convertHtmlToMarkdown,
  extractSiteName,
} from '@/lib/scrape/corsProxy'

describe('CORS Proxy Utilities', () => {
  describe('convertHtmlToMarkdown', () => {
    it('should convert headings to markdown', () => {
      const html = '<h1>Title</h1><h2>Subtitle</h2><h3>Section</h3>'
      const markdown = convertHtmlToMarkdown(html)

      expect(markdown).toContain('# Title')
      expect(markdown).toContain('## Subtitle')
      expect(markdown).toContain('### Section')
    })

    it('should convert paragraphs to double newlines', () => {
      const html = '<p>First paragraph</p><p>Second paragraph</p>'
      const markdown = convertHtmlToMarkdown(html)

      expect(markdown).toContain('First paragraph')
      expect(markdown).toContain('Second paragraph')
    })

    it('should convert links to markdown format', () => {
      const html = '<a href="https://example.com">Example Link</a>'
      const markdown = convertHtmlToMarkdown(html)

      expect(markdown).toContain('[Example Link](https://example.com)')
    })

    it('should convert bold and italic text', () => {
      const html = '<strong>Bold</strong> and <em>Italic</em> text'
      const markdown = convertHtmlToMarkdown(html)

      expect(markdown).toContain('**Bold**')
      expect(markdown).toContain('*Italic*')
    })

    it('should convert list items', () => {
      const html = '<ul><li>Item 1</li><li>Item 2</li></ul>'
      const markdown = convertHtmlToMarkdown(html)

      expect(markdown).toContain('- Item 1')
      expect(markdown).toContain('- Item 2')
    })

    it('should remove script tags', () => {
      const html = '<p>Content</p><script>alert("xss")</script><p>More</p>'
      const markdown = convertHtmlToMarkdown(html)

      expect(markdown).not.toContain('script')
      expect(markdown).not.toContain('alert')
      expect(markdown).toContain('Content')
      expect(markdown).toContain('More')
    })

    it('should remove style tags', () => {
      const html = '<style>.class { color: red; }</style><p>Content</p>'
      const markdown = convertHtmlToMarkdown(html)

      expect(markdown).not.toContain('style')
      expect(markdown).not.toContain('color')
      expect(markdown).toContain('Content')
    })

    it('should decode HTML entities', () => {
      const html = '<p>&amp; &lt; &gt; &quot; &#39;</p>'
      const markdown = convertHtmlToMarkdown(html)

      expect(markdown).toContain('&')
      expect(markdown).toContain('<')
      expect(markdown).toContain('>')
      expect(markdown).toContain('"')
      expect(markdown).toContain("'")
    })

    it('should handle br tags as newlines', () => {
      const html = 'Line 1<br>Line 2<br />Line 3'
      const markdown = convertHtmlToMarkdown(html)

      expect(markdown).toContain('Line 1')
      expect(markdown).toContain('Line 2')
      expect(markdown).toContain('Line 3')
    })

    it('should clean up excessive whitespace', () => {
      const html = '<p>Text</p>\n\n\n\n<p>More text</p>'
      const markdown = convertHtmlToMarkdown(html)

      // Should not have more than 2 consecutive newlines
      expect(markdown).not.toMatch(/\n{3,}/)
    })
  })

  describe('extractSiteName', () => {
    it('should extract hostname from valid URL', () => {
      const siteName = extractSiteName('https://www.example.com/path/to/page')
      expect(siteName).toBe('www.example.com')
    })

    it('should handle URLs without www', () => {
      const siteName = extractSiteName('https://example.com/article')
      expect(siteName).toBe('example.com')
    })

    it('should handle URLs with ports', () => {
      const siteName = extractSiteName('http://localhost:3000/page')
      expect(siteName).toBe('localhost')
    })

    it('should return undefined for invalid URLs', () => {
      const siteName = extractSiteName('not-a-valid-url')
      expect(siteName).toBeUndefined()
    })

    it('should return undefined for empty string', () => {
      const siteName = extractSiteName('')
      expect(siteName).toBeUndefined()
    })

    it('should handle various protocols', () => {
      expect(extractSiteName('https://secure.site.com')).toBe('secure.site.com')
      expect(extractSiteName('http://plain.site.com')).toBe('plain.site.com')
    })
  })
})

