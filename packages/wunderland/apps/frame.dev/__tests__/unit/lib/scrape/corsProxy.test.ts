/**
 * Tests for CORS proxy utilities
 * @module __tests__/unit/lib/scrape/corsProxy.test
 */

import { describe, it, expect } from 'vitest'
import {
  buildProxyUrl,
  htmlToText,
  htmlToMarkdown,
  extractSiteName,
  extractHtmlMetadata,
  CORS_PROXIES,
} from '@/lib/scrape/corsProxy'

// ============================================================================
// CORS_PROXIES CONSTANT TESTS
// ============================================================================

describe('CORS_PROXIES', () => {
  it('contains at least one proxy', () => {
    expect(CORS_PROXIES.length).toBeGreaterThan(0)
  })

  it('has allorigins proxy', () => {
    const allorigins = CORS_PROXIES.find(p => p.id === 'allorigins')
    expect(allorigins).toBeDefined()
    expect(allorigins?.enabled).toBe(true)
  })

  it('has corsproxy-io proxy', () => {
    const corsproxyio = CORS_PROXIES.find(p => p.id === 'corsproxy-io')
    expect(corsproxyio).toBeDefined()
    expect(corsproxyio?.enabled).toBe(true)
  })

  it('all proxies have required fields', () => {
    for (const proxy of CORS_PROXIES) {
      expect(proxy.id).toBeDefined()
      expect(proxy.name).toBeDefined()
      expect(proxy.urlTemplate).toContain('{url}')
      expect(['json', 'text']).toContain(proxy.responseType)
      expect(typeof proxy.timeout).toBe('number')
      expect(proxy.timeout).toBeGreaterThan(0)
    }
  })
})

// ============================================================================
// buildProxyUrl TESTS
// ============================================================================

describe('buildProxyUrl', () => {
  it('builds URL with encoded target', () => {
    const proxy = {
      id: 'test',
      name: 'Test',
      urlTemplate: 'https://proxy.com/get?url={url}',
      responseType: 'json' as const,
      enabled: true,
      timeout: 10000,
    }
    const result = buildProxyUrl(proxy, 'https://example.com/page')
    expect(result).toBe('https://proxy.com/get?url=https%3A%2F%2Fexample.com%2Fpage')
  })

  it('encodes special characters in URL', () => {
    const proxy = {
      id: 'test',
      name: 'Test',
      urlTemplate: 'https://proxy.com/?{url}',
      responseType: 'text' as const,
      enabled: true,
      timeout: 10000,
    }
    const result = buildProxyUrl(proxy, 'https://example.com/search?q=hello world&sort=asc')
    expect(result).toContain('https%3A%2F%2Fexample.com%2Fsearch')
    expect(result).toContain('hello%20world')
  })

  it('works with allorigins template', () => {
    const allorigins = CORS_PROXIES.find(p => p.id === 'allorigins')!
    const result = buildProxyUrl(allorigins, 'https://example.com')
    expect(result).toContain('api.allorigins.win')
    expect(result).toContain('url=')
  })
})

// ============================================================================
// htmlToText TESTS
// ============================================================================

describe('htmlToText', () => {
  describe('script and style removal', () => {
    it('removes script tags with content', () => {
      const html = '<p>Hello</p><script>alert("bad")</script><p>World</p>'
      const result = htmlToText(html)
      expect(result).not.toContain('alert')
      expect(result).toContain('Hello')
      expect(result).toContain('World')
    })

    it('removes style tags with content', () => {
      const html = '<style>.red { color: red; }</style><p>Content</p>'
      const result = htmlToText(html)
      expect(result).not.toContain('color')
      expect(result).toContain('Content')
    })

    it('removes multiline script content', () => {
      const html = `<script type="text/javascript">
        function test() {
          return 42;
        }
      </script>Text`
      const result = htmlToText(html)
      expect(result).not.toContain('function')
      expect(result).toBe('Text')
    })
  })

  describe('HTML comment removal', () => {
    it('removes HTML comments', () => {
      const html = '<p>Before</p><!-- This is a comment --><p>After</p>'
      const result = htmlToText(html)
      expect(result).not.toContain('comment')
      expect(result).toContain('Before')
      expect(result).toContain('After')
    })

    it('removes multiline comments', () => {
      const html = `<!--
        Multi-line
        comment
      -->Content`
      const result = htmlToText(html)
      expect(result).toBe('Content')
    })
  })

  describe('block element conversion', () => {
    it('converts block elements to newlines', () => {
      const html = '<p>Paragraph 1</p><p>Paragraph 2</p>'
      const result = htmlToText(html)
      expect(result).toContain('Paragraph 1')
      expect(result).toContain('\n')
      expect(result).toContain('Paragraph 2')
    })

    it('converts br tags to newlines', () => {
      const html = 'Line 1<br>Line 2<br/>Line 3'
      const result = htmlToText(html)
      expect(result).toContain('Line 1')
      expect(result).toContain('\n')
    })

    it('converts heading and div elements', () => {
      const html = '<h1>Title</h1><div>Content</div>'
      const result = htmlToText(html)
      expect(result).toContain('Title')
      expect(result).toContain('Content')
    })
  })

  describe('HTML entity decoding', () => {
    it('decodes &nbsp;', () => {
      const html = 'Hello&nbsp;World'
      const result = htmlToText(html)
      expect(result).toBe('Hello World')
    })

    it('decodes &amp;', () => {
      const html = 'Rock &amp; Roll'
      const result = htmlToText(html)
      expect(result).toBe('Rock & Roll')
    })

    it('decodes &lt; and &gt;', () => {
      const html = '1 &lt; 2 &gt; 0'
      const result = htmlToText(html)
      expect(result).toBe('1 < 2 > 0')
    })

    it('decodes &quot;', () => {
      const html = 'He said &quot;hello&quot;'
      const result = htmlToText(html)
      expect(result).toBe('He said "hello"')
    })

    it('decodes numeric entities', () => {
      const html = 'Heart: &#9829;'
      const result = htmlToText(html)
      expect(result).toBe('Heart: ♥')
    })

    it('decodes apostrophe entities', () => {
      const html = "It&#39;s working &#x27;well&#x27;"
      const result = htmlToText(html)
      expect(result).toContain("It's working")
      expect(result).toContain("'well'")
    })
  })

  describe('whitespace normalization', () => {
    it('collapses multiple newlines', () => {
      const html = '<p>One</p>\n\n\n\n<p>Two</p>'
      const result = htmlToText(html)
      expect(result).not.toMatch(/\n{3,}/)
    })

    it('collapses multiple spaces', () => {
      const html = '<p>Multiple    spaces    here</p>'
      const result = htmlToText(html)
      expect(result).not.toContain('  ')
    })

    it('trims result', () => {
      const html = '   <p>Content</p>   '
      const result = htmlToText(html)
      expect(result).toBe('Content')
    })
  })

  describe('tag removal', () => {
    it('removes all HTML tags', () => {
      const html = '<div class="container"><span id="test">Text</span></div>'
      const result = htmlToText(html)
      expect(result).not.toContain('<')
      expect(result).not.toContain('>')
      expect(result).toBe('Text')
    })

    it('removes self-closing tags', () => {
      const html = 'Before<img src="test.jpg" />After'
      const result = htmlToText(html)
      // Function removes tags without adding space
      expect(result).toBe('BeforeAfter')
    })
  })
})

// ============================================================================
// htmlToMarkdown TESTS
// ============================================================================

describe('htmlToMarkdown', () => {
  describe('heading conversion', () => {
    it('converts h1 to #', () => {
      const html = '<h1>Heading 1</h1>'
      const result = htmlToMarkdown(html)
      expect(result).toBe('# Heading 1')
    })

    it('converts h2 to ##', () => {
      const html = '<h2>Heading 2</h2>'
      const result = htmlToMarkdown(html)
      expect(result).toBe('## Heading 2')
    })

    it('converts h3 to ###', () => {
      const html = '<h3>Heading 3</h3>'
      const result = htmlToMarkdown(html)
      expect(result).toBe('### Heading 3')
    })

    it('converts h4 to ####', () => {
      const html = '<h4>Heading 4</h4>'
      const result = htmlToMarkdown(html)
      expect(result).toBe('#### Heading 4')
    })

    it('converts h5 to #####', () => {
      const html = '<h5>Heading 5</h5>'
      const result = htmlToMarkdown(html)
      expect(result).toBe('##### Heading 5')
    })

    it('converts h6 to ######', () => {
      const html = '<h6>Heading 6</h6>'
      const result = htmlToMarkdown(html)
      expect(result).toBe('###### Heading 6')
    })
  })

  describe('paragraph and line break conversion', () => {
    it('converts closing p tags to double newlines', () => {
      const html = '<p>First</p><p>Second</p>'
      const result = htmlToMarkdown(html)
      expect(result).toContain('First\n\n')
    })

    it('converts br tags to newlines', () => {
      const html = 'Line 1<br>Line 2'
      const result = htmlToMarkdown(html)
      expect(result).toContain('Line 1\n')
    })
  })

  describe('link conversion', () => {
    it('converts links to markdown format', () => {
      const html = '<a href="https://example.com">Example</a>'
      const result = htmlToMarkdown(html)
      expect(result).toBe('[Example](https://example.com)')
    })

    it('handles links with special characters in URL', () => {
      const html = '<a href="https://example.com/page?id=123">Link</a>'
      const result = htmlToMarkdown(html)
      expect(result).toContain('[Link]')
      expect(result).toContain('example.com')
    })
  })

  describe('text formatting conversion', () => {
    it('converts strong to bold', () => {
      const html = 'This is <strong>bold</strong> text'
      const result = htmlToMarkdown(html)
      expect(result).toContain('**bold**')
    })

    it('converts b to bold', () => {
      const html = 'This is <b>bold</b> text'
      const result = htmlToMarkdown(html)
      expect(result).toContain('**bold**')
    })

    it('converts em to italic', () => {
      const html = 'This is <em>italic</em> text'
      const result = htmlToMarkdown(html)
      expect(result).toContain('*italic*')
    })

    it('converts i to italic', () => {
      const html = 'This is <i>italic</i> text'
      const result = htmlToMarkdown(html)
      expect(result).toContain('*italic*')
    })
  })

  describe('code conversion', () => {
    it('converts inline code', () => {
      const html = 'Use <code>npm install</code> command'
      const result = htmlToMarkdown(html)
      expect(result).toContain('`npm install`')
    })

    it('converts pre blocks', () => {
      const html = '<pre>const x = 1;\nconsole.log(x);</pre>'
      const result = htmlToMarkdown(html)
      expect(result).toContain('```')
    })
  })

  describe('list conversion', () => {
    it('converts list items to dashes', () => {
      const html = '<ul><li>Item 1</li><li>Item 2</li></ul>'
      const result = htmlToMarkdown(html)
      expect(result).toContain('- Item 1')
      expect(result).toContain('- Item 2')
    })

    it('removes ul/ol wrapper tags', () => {
      const html = '<ol><li>First</li><li>Second</li></ol>'
      const result = htmlToMarkdown(html)
      expect(result).not.toContain('<ol>')
      expect(result).not.toContain('</ol>')
    })
  })

  describe('blockquote conversion', () => {
    it('converts blockquotes with > prefix', () => {
      const html = '<blockquote>Quoted text</blockquote>'
      const result = htmlToMarkdown(html)
      expect(result).toContain('>')
      expect(result).toContain('Quoted text')
    })
  })

  describe('script and style removal', () => {
    it('removes script tags', () => {
      const html = '<p>Text</p><script>alert("x")</script>'
      const result = htmlToMarkdown(html)
      expect(result).not.toContain('alert')
    })

    it('removes style tags', () => {
      const html = '<style>body { color: red; }</style><p>Text</p>'
      const result = htmlToMarkdown(html)
      expect(result).not.toContain('color')
    })

    it('removes HTML comments', () => {
      const html = '<!-- comment --><p>Text</p>'
      const result = htmlToMarkdown(html)
      expect(result).not.toContain('comment')
    })
  })

  describe('entity decoding', () => {
    it('decodes HTML entities', () => {
      const html = '<p>Rock &amp; Roll</p>'
      const result = htmlToMarkdown(html)
      expect(result).toContain('Rock & Roll')
    })
  })
})

// ============================================================================
// extractSiteName TESTS
// ============================================================================

describe('extractSiteName', () => {
  it('extracts hostname from HTTP URL', () => {
    expect(extractSiteName('http://example.com/page')).toBe('example.com')
  })

  it('extracts hostname from HTTPS URL', () => {
    expect(extractSiteName('https://www.example.com/path')).toBe('www.example.com')
  })

  it('extracts hostname without path', () => {
    expect(extractSiteName('https://docs.github.com')).toBe('docs.github.com')
  })

  it('removes port from hostname', () => {
    expect(extractSiteName('http://localhost:3000/api')).toBe('localhost')
  })

  it('handles URLs with query strings', () => {
    expect(extractSiteName('https://search.example.com/search?q=test')).toBe('search.example.com')
  })

  it('returns undefined for empty string', () => {
    expect(extractSiteName('')).toBeUndefined()
  })

  it('returns undefined for invalid URL', () => {
    expect(extractSiteName('not-a-url')).toBeUndefined()
  })

  it('returns undefined for null/undefined', () => {
    expect(extractSiteName(undefined as any)).toBeUndefined()
    expect(extractSiteName(null as any)).toBeUndefined()
  })
})

// ============================================================================
// extractHtmlMetadata TESTS
// ============================================================================

describe('extractHtmlMetadata', () => {
  describe('title extraction', () => {
    it('extracts title from title tag', () => {
      const html = '<html><head><title>Page Title</title></head></html>'
      const result = extractHtmlMetadata(html)
      expect(result.title).toBe('Page Title')
    })

    it('handles title with HTML entities', () => {
      const html = '<title>Rock &amp; Roll</title>'
      const result = extractHtmlMetadata(html)
      expect(result.title).toBe('Rock   Roll')  // Entity replaced with space
    })
  })

  describe('description extraction', () => {
    it('extracts description from name="description"', () => {
      const html = '<meta name="description" content="This is the description">'
      const result = extractHtmlMetadata(html)
      expect(result.description).toBe('This is the description')
    })

    it('extracts description from og:description', () => {
      const html = '<meta property="og:description" content="OG Description">'
      const result = extractHtmlMetadata(html)
      expect(result.description).toBe('OG Description')
    })

    it('prefers name="description" over og:description', () => {
      const html = `
        <meta name="description" content="Meta Description">
        <meta property="og:description" content="OG Description">
      `
      const result = extractHtmlMetadata(html)
      expect(result.description).toBe('Meta Description')
    })
  })

  describe('author extraction', () => {
    it('extracts author from name="author"', () => {
      const html = '<meta name="author" content="John Doe">'
      const result = extractHtmlMetadata(html)
      expect(result.author).toBe('John Doe')
    })

    it('extracts author from article:author', () => {
      const html = '<meta property="article:author" content="Jane Smith">'
      const result = extractHtmlMetadata(html)
      expect(result.author).toBe('Jane Smith')
    })
  })

  describe('site name extraction', () => {
    it('extracts site name from og:site_name', () => {
      const html = '<meta property="og:site_name" content="My Website">'
      const result = extractHtmlMetadata(html)
      expect(result.siteName).toBe('My Website')
    })
  })

  describe('image extraction', () => {
    it('extracts image from og:image', () => {
      const html = '<meta property="og:image" content="https://example.com/image.jpg">'
      const result = extractHtmlMetadata(html)
      expect(result.image).toBe('https://example.com/image.jpg')
    })

    it('extracts image from twitter:image', () => {
      const html = '<meta name="twitter:image" content="https://example.com/twitter.jpg">'
      const result = extractHtmlMetadata(html)
      expect(result.image).toBe('https://example.com/twitter.jpg')
    })
  })

  describe('edge cases', () => {
    it('returns empty object for HTML without metadata', () => {
      const html = '<html><body><p>Just content</p></body></html>'
      const result = extractHtmlMetadata(html)
      expect(result).toEqual({})
    })

    it('handles meta tags with content before name', () => {
      const html = '<meta content="Description here" name="description">'
      const result = extractHtmlMetadata(html)
      expect(result.description).toBe('Description here')
    })

    it('handles single quotes in attributes', () => {
      const html = "<meta name='description' content='Single quotes'>"
      const result = extractHtmlMetadata(html)
      expect(result.description).toBe('Single quotes')
    })
  })
})
