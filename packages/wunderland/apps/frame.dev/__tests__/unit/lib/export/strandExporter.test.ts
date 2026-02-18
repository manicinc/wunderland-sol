/**
 * Strand Exporter Tests
 * @module __tests__/unit/lib/export/strandExporter.test
 *
 * Tests for strand export utilities and markdown processing.
 */

import { describe, it, expect } from 'vitest'
import {
  stripMarkdown,
  extractImagePaths,
  resolveAssetPath,
  extractForwardLinks,
  replaceFormulasWithResults,
  generateSchema,
  exportAsTextSync,
} from '@/lib/export/strandExporter'
import type { GitHubFile } from '@/components/quarry/types'

// ============================================================================
// stripMarkdown
// ============================================================================

describe('stripMarkdown', () => {
  it('removes frontmatter', () => {
    const md = `---
title: Test
date: 2024-01-01
---

Content here`
    const result = stripMarkdown(md)
    expect(result).not.toContain('---')
    expect(result).not.toContain('title:')
    expect(result).toContain('Content here')
  })

  it('removes code blocks', () => {
    const md = `Text before

\`\`\`javascript
const x = 5;
\`\`\`

Text after`
    const result = stripMarkdown(md)
    expect(result).not.toContain('```')
    expect(result).not.toContain('const x')
    expect(result).toContain('Text before')
    expect(result).toContain('Text after')
  })

  it('preserves inline code content', () => {
    const md = 'Use the `console.log` function'
    const result = stripMarkdown(md)
    expect(result).toBe('Use the console.log function')
  })

  it('removes image markdown but keeps alt text', () => {
    const md = 'Here is ![alt text](path/to/image.png) inline'
    const result = stripMarkdown(md)
    expect(result).toBe('Here is alt text inline')
    expect(result).not.toContain('path/to/image')
  })

  it('removes links but keeps link text', () => {
    const md = 'Check out [this link](https://example.com) for more'
    const result = stripMarkdown(md)
    expect(result).toBe('Check out this link for more')
    expect(result).not.toContain('https://')
  })

  it('removes header markers', () => {
    const md = `# Heading 1
## Heading 2
### Heading 3`
    const result = stripMarkdown(md)
    expect(result).not.toContain('#')
    expect(result).toContain('Heading 1')
    expect(result).toContain('Heading 2')
  })

  it('removes bold formatting', () => {
    const md = 'This is **bold** and __also bold__'
    const result = stripMarkdown(md)
    expect(result).toBe('This is bold and also bold')
  })

  it('removes italic formatting', () => {
    const md = 'This is *italic* and _also italic_'
    const result = stripMarkdown(md)
    expect(result).toBe('This is italic and also italic')
  })

  it('removes strikethrough', () => {
    const md = 'This is ~~deleted~~ text'
    const result = stripMarkdown(md)
    expect(result).toBe('This is deleted text')
  })

  it('removes blockquote markers', () => {
    const md = `> This is a quote
> Another line`
    const result = stripMarkdown(md)
    expect(result).not.toContain('>')
    expect(result).toContain('This is a quote')
  })

  it('removes horizontal rules', () => {
    const md = `Above

---

Below`
    const result = stripMarkdown(md)
    expect(result).toContain('Above')
    expect(result).toContain('Below')
    expect(result).not.toMatch(/^-{3,}$/m)
  })

  it('removes list markers', () => {
    const md = `- Item 1
* Item 2
+ Item 3
1. Numbered`
    const result = stripMarkdown(md)
    expect(result).not.toContain('-')
    expect(result).not.toContain('*')
    expect(result).not.toContain('+')
    expect(result).not.toContain('1.')
    expect(result).toContain('Item 1')
    expect(result).toContain('Numbered')
  })

  it('removes HTML tags', () => {
    const md = 'Text <div>with</div> HTML <br/> tags'
    const result = stripMarkdown(md)
    expect(result).not.toContain('<')
    expect(result).not.toContain('>')
  })

  it('normalizes excessive newlines', () => {
    const md = `Line 1




Line 2`
    const result = stripMarkdown(md)
    expect(result.match(/\n/g)?.length || 0).toBeLessThan(4)
  })

  it('trims whitespace', () => {
    const md = '   Content   '
    const result = stripMarkdown(md)
    expect(result).toBe('Content')
  })
})

// ============================================================================
// extractImagePaths
// ============================================================================

describe('extractImagePaths', () => {
  it('extracts markdown image paths', () => {
    const md = '![Alt](images/photo.png)'
    const paths = extractImagePaths(md)
    expect(paths).toContain('images/photo.png')
  })

  it('extracts multiple images', () => {
    const md = `![Image 1](path/to/img1.png)
Some text
![Image 2](path/to/img2.jpg)`
    const paths = extractImagePaths(md)
    expect(paths).toHaveLength(2)
    expect(paths).toContain('path/to/img1.png')
    expect(paths).toContain('path/to/img2.jpg')
  })

  it('extracts HTML img src', () => {
    const md = '<img src="assets/logo.png" alt="Logo">'
    const paths = extractImagePaths(md)
    expect(paths).toContain('assets/logo.png')
  })

  it('extracts HTML img with single quotes', () => {
    const md = "<img src='assets/icon.svg' alt='Icon'>"
    const paths = extractImagePaths(md)
    expect(paths).toContain('assets/icon.svg')
  })

  it('ignores external URLs', () => {
    const md = `![Local](local/image.png)
![External](https://example.com/image.png)
![HTTP](http://example.com/image.png)`
    const paths = extractImagePaths(md)
    expect(paths).toHaveLength(1)
    expect(paths).toContain('local/image.png')
    expect(paths).not.toContain('https://example.com/image.png')
  })

  it('ignores data URLs', () => {
    const md = '![Inline](data:image/png;base64,abc123)'
    const paths = extractImagePaths(md)
    expect(paths).toHaveLength(0)
  })

  it('deduplicates paths', () => {
    const md = `![First](same/image.png)
![Second](same/image.png)`
    const paths = extractImagePaths(md)
    expect(paths).toHaveLength(1)
  })

  it('handles images with title text', () => {
    const md = '![Alt](path/to/image.png "Title text")'
    const paths = extractImagePaths(md)
    expect(paths).toContain('path/to/image.png')
    expect(paths).not.toContain('"Title text"')
  })

  it('returns empty array for no images', () => {
    const md = 'Just some text without images'
    const paths = extractImagePaths(md)
    expect(paths).toEqual([])
  })
})

// ============================================================================
// resolveAssetPath
// ============================================================================

describe('resolveAssetPath', () => {
  it('handles absolute paths', () => {
    const result = resolveAssetPath('docs/guide/intro.md', '/assets/logo.png')
    expect(result).toBe('assets/logo.png')
  })

  it('resolves relative paths from strand directory', () => {
    const result = resolveAssetPath('docs/guide/intro.md', 'images/diagram.png')
    expect(result).toBe('docs/guide/images/diagram.png')
  })

  it('handles parent directory references', () => {
    const result = resolveAssetPath('docs/guide/intro.md', '../shared/image.png')
    expect(result).toBe('docs/shared/image.png')
  })

  it('handles multiple parent references', () => {
    const result = resolveAssetPath('docs/guide/deep/page.md', '../../assets/img.png')
    expect(result).toBe('docs/assets/img.png')
  })

  it('handles current directory references', () => {
    const result = resolveAssetPath('docs/page.md', './images/photo.png')
    expect(result).toBe('docs/images/photo.png')
  })

  it('handles complex relative paths', () => {
    const result = resolveAssetPath(
      'projects/web/docs/guide.md',
      '../../../shared/images/logo.png'
    )
    expect(result).toBe('shared/images/logo.png')
  })

  it('handles root-level strands', () => {
    const result = resolveAssetPath('readme.md', 'assets/banner.png')
    expect(result).toBe('assets/banner.png')
  })
})

// ============================================================================
// extractForwardLinks
// ============================================================================

describe('extractForwardLinks', () => {
  const allFiles: GitHubFile[] = [
    { name: 'intro.md', path: 'docs/intro.md', type: 'file', sha: '' },
    { name: 'advanced.md', path: 'docs/advanced.md', type: 'file', sha: '' },
    { name: 'api.md', path: 'reference/api.md', type: 'file', sha: '' },
  ]

  it('extracts links to existing files', () => {
    const md = 'See [Introduction](docs/intro.md) for details'
    const links = extractForwardLinks(md, allFiles)
    expect(links).toHaveLength(1)
    expect(links[0].path).toBe('docs/intro.md')
    expect(links[0].name).toBe('intro')
    expect(links[0].type).toBe('forwardlink')
  })

  it('extracts multiple links', () => {
    const md = `Check [Intro](docs/intro.md) and [Advanced](docs/advanced.md)`
    const links = extractForwardLinks(md, allFiles)
    expect(links).toHaveLength(2)
  })

  it('ignores external links', () => {
    const md = '[Google](https://google.com)'
    const links = extractForwardLinks(md, allFiles)
    expect(links).toHaveLength(0)
  })

  it('ignores http links', () => {
    const md = '[Example](http://example.com)'
    const links = extractForwardLinks(md, allFiles)
    expect(links).toHaveLength(0)
  })

  it('ignores anchor links', () => {
    const md = '[Section](#section-name)'
    const links = extractForwardLinks(md, allFiles)
    expect(links).toHaveLength(0)
  })

  it('adds .md extension if missing', () => {
    const md = '[Intro](docs/intro)'
    const links = extractForwardLinks(md, allFiles)
    expect(links).toHaveLength(1)
    expect(links[0].path).toBe('docs/intro.md')
  })

  it('strips hash and query params', () => {
    const md = '[API Reference](reference/api.md#methods?version=2)'
    const links = extractForwardLinks(md, allFiles)
    expect(links).toHaveLength(1)
    expect(links[0].path).toBe('reference/api.md')
  })

  it('ignores links to non-existent files', () => {
    const md = '[Missing](docs/nonexistent.md)'
    const links = extractForwardLinks(md, allFiles)
    expect(links).toHaveLength(0)
  })

  it('returns empty array for no links', () => {
    const md = 'Just plain text'
    const links = extractForwardLinks(md, allFiles)
    expect(links).toEqual([])
  })
})

// ============================================================================
// replaceFormulasWithResults
// ============================================================================

describe('replaceFormulasWithResults', () => {
  it('replaces formula block with result', () => {
    const content = 'Before\n\n```formula\n=SUM(1, 2)\n```\n\nAfter'
    const formulas = [
      {
        original: '```formula\n=SUM(1, 2)\n```',
        expression: '=SUM(1, 2)',
        result: 3,
      }
    ]
    const result = replaceFormulasWithResults(content, formulas)
    expect(result).toContain('3')
    expect(result).not.toContain('```formula')
    expect(result).toContain('Before')
    expect(result).toContain('After')
  })

  it('includes field name when provided', () => {
    const content = '```formula:total\n=SUM(1, 2, 3)\n```'
    const formulas = [
      {
        original: '```formula:total\n=SUM(1, 2, 3)\n```',
        fieldName: 'total',
        expression: '=SUM(1, 2, 3)',
        result: 6,
      }
    ]
    const result = replaceFormulasWithResults(content, formulas)
    expect(result).toContain('**total:**')
    expect(result).toContain('6')
  })

  it('shows error message for failed formulas', () => {
    const content = '```formula\n=INVALID()\n```'
    const formulas = [
      {
        original: '```formula\n=INVALID()\n```',
        expression: '=INVALID()',
        result: null,
        error: 'Unknown function',
      }
    ]
    const result = replaceFormulasWithResults(content, formulas)
    expect(result).toContain('[Error: Unknown function]')
  })

  it('replaces inline formulas', () => {
    const content = 'The sum is =SUM(1, 2) here'
    const formulas = [
      {
        original: '=SUM(1, 2)',
        expression: '=SUM(1, 2)',
        result: 3,
      }
    ]
    const result = replaceFormulasWithResults(content, formulas)
    expect(result).toBe('The sum is 3 here')
  })

  it('adds formula comment for blocks', () => {
    const content = '```formula\n=COUNT(items)\n```'
    const formulas = [
      {
        original: '```formula\n=COUNT(items)\n```',
        expression: '=COUNT(items)',
        result: 5,
      }
    ]
    const result = replaceFormulasWithResults(content, formulas)
    expect(result).toContain('<!-- Formula: =COUNT(items) -->')
  })

  it('handles boolean results', () => {
    const content = '=IF(true, 1, 0)'
    const formulas = [
      {
        original: '=IF(true, 1, 0)',
        expression: '=IF(true, 1, 0)',
        result: true,
      }
    ]
    const result = replaceFormulasWithResults(content, formulas)
    expect(result).toBe('Yes')
  })

  it('handles array results', () => {
    const content = '=ITEMS()'
    const formulas = [
      {
        original: '=ITEMS()',
        expression: '=ITEMS()',
        result: ['a', 'b', 'c'],
      }
    ]
    const result = replaceFormulasWithResults(content, formulas)
    expect(result).toBe('a, b, c')
  })
})

// ============================================================================
// generateSchema
// ============================================================================

describe('generateSchema', () => {
  const baseOptions = {
    filePath: 'docs/guide/intro.md',
    fileName: 'intro.md',
    content: '# Introduction',
    metadata: {
      title: 'Introduction',
    },
  }

  it('includes strand path info', () => {
    const schema = generateSchema(baseOptions)
    expect(schema).toContain('docs/guide/intro.md')
    expect(schema).toContain('intro')
  })

  it('includes metadata title', () => {
    const schema = generateSchema(baseOptions)
    expect(schema).toContain('title: Introduction')
  })

  it('uses filename when no title', () => {
    const options = {
      ...baseOptions,
      metadata: {},
    }
    const schema = generateSchema(options)
    expect(schema).toContain('title: intro')
  })

  it('includes description when present', () => {
    const options = {
      ...baseOptions,
      metadata: {
        ...baseOptions.metadata,
        description: 'A guide introduction',
      },
    }
    const schema = generateSchema(options)
    expect(schema).toContain('description: A guide introduction')
  })

  it('includes tags when present', () => {
    const options = {
      ...baseOptions,
      metadata: {
        ...baseOptions.metadata,
        tags: ['guide', 'intro'],
      },
    }
    const schema = generateSchema(options)
    expect(schema).toContain('taxonomy:')
    expect(schema).toContain('- guide')
    expect(schema).toContain('- intro')
  })

  it('includes author when present', () => {
    const options = {
      ...baseOptions,
      metadata: {
        ...baseOptions.metadata,
        author: 'John Doe',
      },
    }
    const schema = generateSchema(options)
    expect(schema).toContain('attribution:')
    expect(schema).toContain('author: John Doe')
  })

  it('includes timestamps', () => {
    const options = {
      ...baseOptions,
      metadata: {
        ...baseOptions.metadata,
        date: '2024-01-15',
      },
    }
    const schema = generateSchema(options)
    expect(schema).toContain('created:')
    expect(schema).toContain('modified:')
  })
})

// ============================================================================
// exportAsTextSync
// ============================================================================

describe('exportAsTextSync', () => {
  it('strips markdown from content', () => {
    const options = {
      filePath: 'test.md',
      fileName: 'test.md',
      content: '# Title\n\nSome **bold** text',
      metadata: {},
    }
    const result = exportAsTextSync(options)
    expect(result).toBe('Title\n\nSome bold text')
  })

  it('removes code blocks', () => {
    const options = {
      filePath: 'test.md',
      fileName: 'test.md',
      content: 'Text\n\n```js\ncode\n```\n\nMore',
      metadata: {},
    }
    const result = exportAsTextSync(options)
    expect(result).not.toContain('```')
    expect(result).not.toContain('code')
  })

  it('preserves link text', () => {
    const options = {
      filePath: 'test.md',
      fileName: 'test.md',
      content: 'Check [the docs](http://example.com)',
      metadata: {},
    }
    const result = exportAsTextSync(options)
    expect(result).toContain('the docs')
    expect(result).not.toContain('http://')
  })
})

// ============================================================================
// Edge Cases
// ============================================================================

describe('Edge Cases', () => {
  it('stripMarkdown handles empty string', () => {
    expect(stripMarkdown('')).toBe('')
  })

  it('stripMarkdown handles only frontmatter', () => {
    const md = `---
title: Test
---`
    expect(stripMarkdown(md)).toBe('')
  })

  it('extractImagePaths handles empty string', () => {
    expect(extractImagePaths('')).toEqual([])
  })

  it('resolveAssetPath handles empty asset path', () => {
    const result = resolveAssetPath('docs/file.md', '')
    expect(result).toBe('docs')
  })

  it('extractForwardLinks handles empty allFiles', () => {
    const links = extractForwardLinks('[Link](file.md)', [])
    expect(links).toEqual([])
  })

  it('replaceFormulasWithResults handles empty formulas array', () => {
    const content = 'No formulas here'
    const result = replaceFormulasWithResults(content, [])
    expect(result).toBe('No formulas here')
  })

  it('stripMarkdown handles nested formatting', () => {
    const md = '***bold italic*** and ___also___'
    const result = stripMarkdown(md)
    expect(result).toContain('bold italic')
    expect(result).not.toContain('*')
    expect(result).not.toContain('_')
  })

  it('extractImagePaths handles mixed formats', () => {
    const md = `
![md](img1.png)
<img src="img2.png" />
<img src='img3.png'>
`
    const paths = extractImagePaths(md)
    expect(paths).toHaveLength(3)
  })
})
