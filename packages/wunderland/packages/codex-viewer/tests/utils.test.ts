import { describe, it, expect } from 'vitest'
import { parseWikiMetadata, stripFrontmatter, isMarkdownFile } from '../src/lib/utils'

describe('Codex utils', () => {
  it('parses simple YAML frontmatter into metadata object', () => {
    const md = `---
title: "Hello World"
tags: [foo, bar]
version: "1.0.0"
---
# Content

Body text here.
`

    const metadata = parseWikiMetadata(md)

    expect(metadata.title).toBe('Hello World')
    // Current parser stores arrays as raw strings – test that behavior so we don’t regress.
    expect(metadata.tags).toBe('[foo, bar]')
    expect(metadata.version).toBe('1.0.0')
  })

  it('strips YAML frontmatter from markdown content', () => {
    const md = `---
title: "Hello World"
---
# Heading

Some content.
`
    const stripped = stripFrontmatter(md)

    expect(stripped.trim().startsWith('# Heading')).toBe(true)
    expect(stripped).not.toContain('title:')
    expect(stripped).not.toContain('---')
  })

  it('returns original content when no frontmatter is present', () => {
    const md = `# Heading

No frontmatter here.`

    const stripped = stripFrontmatter(md)
    expect(stripped).toBe(md)
  })

  it('detects markdown filenames correctly', () => {
    expect(isMarkdownFile('README.md')).toBe(true)
    expect(isMarkdownFile('guide.MD')).toBe(true)
    expect(isMarkdownFile('notes.mdx')).toBe(true)
    expect(isMarkdownFile('image.png')).toBe(false)
    expect(isMarkdownFile('script.ts')).toBe(false)
  })
})


