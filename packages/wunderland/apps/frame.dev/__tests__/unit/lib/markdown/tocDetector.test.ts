/**
 * TOC Detector Tests
 * @module __tests__/unit/lib/markdown/tocDetector.test
 *
 * Tests for Table of Contents detection and generation.
 */

import { describe, it, expect } from 'vitest'
import {
  detectExistingTOC,
  stripExistingTOC,
  hasTOCHeading,
  generateTOC,
  ensureTOC,
} from '@/lib/markdown/tocDetector'

// ============================================================================
// detectExistingTOC
// ============================================================================

describe('detectExistingTOC', () => {
  describe('TOC heading detection', () => {
    it('detects "## Table of Contents"', () => {
      const markdown = `## Table of Contents

- [Intro](#intro)
- [Details](#details)

## Intro
Content here.`

      const result = detectExistingTOC(markdown)
      expect(result.hasTOC).toBe(true)
      expect(result.format).toBe('bullet')
    })

    it('detects "# Contents"', () => {
      const markdown = `# Contents

- [Section 1](#section-1)

# Section 1
Content.`

      const result = detectExistingTOC(markdown)
      expect(result.hasTOC).toBe(true)
    })

    it('detects "### TOC"', () => {
      const markdown = `### TOC

- [A](#a)
- [B](#b)

## A
Text.`

      const result = detectExistingTOC(markdown)
      expect(result.hasTOC).toBe(true)
    })

    it('detects "## Outline"', () => {
      const markdown = `## Outline

- [First](#first)

## First`

      const result = detectExistingTOC(markdown)
      expect(result.hasTOC).toBe(true)
    })

    it('detects "## Index"', () => {
      const markdown = `## Index

- [Entry](#entry)

## Entry`

      const result = detectExistingTOC(markdown)
      expect(result.hasTOC).toBe(true)
    })

    it('is case insensitive', () => {
      const markdown = `## TABLE OF CONTENTS

- [Item](#item)

## Item`

      const result = detectExistingTOC(markdown)
      expect(result.hasTOC).toBe(true)
    })
  })

  describe('TOC format detection', () => {
    it('detects bullet list format with hyphen', () => {
      const markdown = `## Table of Contents

- [A](#a)
- [B](#b)`

      const result = detectExistingTOC(markdown)
      expect(result.format).toBe('bullet')
    })

    it('detects bullet list format with asterisk', () => {
      const markdown = `## Table of Contents

* [A](#a)
* [B](#b)`

      const result = detectExistingTOC(markdown)
      expect(result.format).toBe('bullet')
    })

    it('detects numbered list format', () => {
      const markdown = `## Table of Contents

1. [First](#first)
2. [Second](#second)`

      const result = detectExistingTOC(markdown)
      expect(result.format).toBe('numbered')
    })
  })

  describe('TOC entries extraction', () => {
    it('extracts entries with links', () => {
      const markdown = `## Table of Contents

- [Introduction](#introduction)
- [Details](#details)

## Introduction`

      const result = detectExistingTOC(markdown)
      expect(result.entries).toHaveLength(2)
      expect(result.entries[0].text).toBe('Introduction')
      expect(result.entries[0].anchor).toBe('introduction')
      expect(result.entries[1].text).toBe('Details')
    })

    it('extracts entries without links', () => {
      const markdown = `## Table of Contents

- Introduction
- Details

## Introduction`

      const result = detectExistingTOC(markdown)
      expect(result.entries).toHaveLength(2)
      expect(result.entries[0].text).toBe('Introduction')
      expect(result.entries[0].anchor).toBeUndefined()
    })

    it('detects nested entry levels', () => {
      const markdown = `## Table of Contents

- [Top](#top)
  - [Nested](#nested)
    - [Deep](#deep)

## Top`

      const result = detectExistingTOC(markdown)
      expect(result.entries[0].level).toBe(0)
      expect(result.entries[1].level).toBe(1)
      expect(result.entries[2].level).toBe(2)
    })
  })

  describe('TOC boundaries', () => {
    it('returns start and end line numbers', () => {
      const markdown = `## Table of Contents

- [A](#a)
- [B](#b)

## A`

      const result = detectExistingTOC(markdown)
      expect(result.startLine).toBe(0)
      expect(result.endLine).toBeDefined()
    })

    it('ends TOC when hitting another heading', () => {
      const markdown = `## Table of Contents

- [A](#a)

## A

Content here.`

      const result = detectExistingTOC(markdown)
      expect(result.entries).toHaveLength(1)
    })
  })

  describe('no TOC cases', () => {
    it('returns hasTOC false when no TOC heading', () => {
      const markdown = `# My Document

Some content here.

## Section 1

More content.`

      const result = detectExistingTOC(markdown)
      expect(result.hasTOC).toBe(false)
      expect(result.format).toBe('none')
    })

    it('returns hasTOC false when TOC heading but no entries', () => {
      const markdown = `## Table of Contents

## Section 1

Content.`

      const result = detectExistingTOC(markdown)
      expect(result.hasTOC).toBe(false)
    })

    it('handles empty content', () => {
      const result = detectExistingTOC('')
      expect(result.hasTOC).toBe(false)
      expect(result.entries).toEqual([])
    })
  })
})

// ============================================================================
// stripExistingTOC
// ============================================================================

describe('stripExistingTOC', () => {
  it('removes TOC section from markdown', () => {
    const markdown = `# Title

## Table of Contents

- [Intro](#intro)
- [Details](#details)

## Intro

Introduction text.`

    const result = stripExistingTOC(markdown)
    expect(result).not.toContain('Table of Contents')
    expect(result).not.toContain('[Intro](#intro)')
    expect(result).toContain('# Title')
    expect(result).toContain('## Intro')
    expect(result).toContain('Introduction text.')
  })

  it('cleans up extra blank lines', () => {
    const markdown = `# Title


## Table of Contents

- [A](#a)


## Section A

Content.`

    const result = stripExistingTOC(markdown)
    expect(result).not.toContain('Table of Contents')
    expect(result).toContain('# Title')
    expect(result).toContain('## Section A')
  })

  it('returns original content when no TOC', () => {
    const markdown = `# Title

## Section 1

Content here.`

    const result = stripExistingTOC(markdown)
    expect(result).toBe(markdown)
  })

  it('handles content with only TOC', () => {
    const markdown = `## Table of Contents

- [A](#a)
- [B](#b)`

    const result = stripExistingTOC(markdown)
    expect(result.trim()).toBe('')
  })
})

// ============================================================================
// hasTOCHeading
// ============================================================================

describe('hasTOCHeading', () => {
  it('returns true for Table of Contents heading', () => {
    expect(hasTOCHeading('## Table of Contents')).toBe(true)
  })

  it('returns true for Contents heading', () => {
    expect(hasTOCHeading('# Contents')).toBe(true)
  })

  it('returns true for TOC heading', () => {
    expect(hasTOCHeading('## TOC')).toBe(true)
  })

  it('returns true for Outline heading', () => {
    expect(hasTOCHeading('### Outline')).toBe(true)
  })

  it('returns true for Index heading', () => {
    expect(hasTOCHeading('## Index')).toBe(true)
  })

  it('is case insensitive', () => {
    expect(hasTOCHeading('## TABLE OF CONTENTS')).toBe(true)
    expect(hasTOCHeading('## table of contents')).toBe(true)
  })

  it('returns false when no TOC heading', () => {
    expect(hasTOCHeading('# Introduction')).toBe(false)
    expect(hasTOCHeading('Regular text')).toBe(false)
  })

  it('finds TOC heading in multiline content', () => {
    const content = `# Title

Some intro text.

## Table of Contents

- [A](#a)`

    expect(hasTOCHeading(content)).toBe(true)
  })
})

// ============================================================================
// generateTOC
// ============================================================================

describe('generateTOC', () => {
  it('generates TOC from headings', () => {
    const markdown = `# Document Title

## Introduction

Some text.

## Details

More text.

## Conclusion

Final text.`

    const toc = generateTOC(markdown)
    expect(toc).toContain('## Table of Contents')
    expect(toc).toContain('[Introduction](#introduction)')
    expect(toc).toContain('[Details](#details)')
    expect(toc).toContain('[Conclusion](#conclusion)')
  })

  it('respects minLevel option', () => {
    const markdown = `# Title

## Section

### Subsection`

    const toc = generateTOC(markdown, { minLevel: 2 })
    expect(toc).toContain('[Section](#section)')
    expect(toc).toContain('[Subsection](#subsection)')
    expect(toc).not.toContain('[Title](#title)')
  })

  it('respects maxLevel option', () => {
    const markdown = `# Title

## Section

### Subsection

#### Deep`

    const toc = generateTOC(markdown, { maxLevel: 2 })
    expect(toc).toContain('[Title](#title)')
    expect(toc).toContain('[Section](#section)')
    expect(toc).not.toContain('[Subsection](#subsection)')
    expect(toc).not.toContain('[Deep](#deep)')
  })

  it('generates bullet format by default', () => {
    const markdown = `## Section 1

## Section 2`

    const toc = generateTOC(markdown)
    expect(toc).toContain('- [Section 1]')
    expect(toc).toContain('- [Section 2]')
  })

  it('generates numbered format when specified', () => {
    const markdown = `## Section 1

## Section 2`

    const toc = generateTOC(markdown, { format: 'numbered' })
    expect(toc).toContain('1. [Section 1]')
    expect(toc).toContain('1. [Section 2]')
  })

  it('creates proper indentation for nested headings', () => {
    const markdown = `## Level 2

### Level 3

#### Level 4`

    const toc = generateTOC(markdown, { minLevel: 2, maxLevel: 4 })
    // Level 2 at base, Level 3 indented once, Level 4 indented twice
    expect(toc).toMatch(/^- \[Level 2\]/m)
    expect(toc).toMatch(/^\s{2}- \[Level 3\]/m)
    expect(toc).toMatch(/^\s{4}- \[Level 4\]/m)
  })

  it('strips markdown formatting from heading text', () => {
    const markdown = `## **Bold** Heading

## *Italic* Text

## \`Code\` Section`

    const toc = generateTOC(markdown)
    expect(toc).toContain('[Bold Heading]')
    expect(toc).toContain('[Italic Text]')
    expect(toc).toContain('[Code Section]')
    expect(toc).not.toContain('**')
    expect(toc).not.toContain('*')
    expect(toc).not.toContain('`')
  })

  it('strips links from heading text', () => {
    const markdown = `## See [This Link](https://example.com)`

    const toc = generateTOC(markdown)
    expect(toc).toContain('[See This Link]')
    expect(toc).not.toContain('https://example.com')
  })

  it('ignores headings inside code blocks', () => {
    const markdown = `## Real Heading

\`\`\`
## Code Comment
\`\`\`

## Another Heading`

    const toc = generateTOC(markdown)
    expect(toc).toContain('[Real Heading]')
    expect(toc).toContain('[Another Heading]')
    expect(toc).not.toContain('[Code Comment]')
  })

  it('excludes TOC headings themselves', () => {
    const markdown = `## Table of Contents

- [A](#a)

## Real Section`

    const toc = generateTOC(markdown)
    expect(toc).toContain('[Real Section]')
    expect(toc).not.toMatch(/\[Table of Contents\]\(#table/)
  })

  it('returns empty string when no headings', () => {
    const markdown = `Just some paragraph text.

No headings here.`

    const toc = generateTOC(markdown)
    expect(toc).toBe('')
  })

  it('generates slugs correctly', () => {
    const markdown = `## Hello World

## Special & Characters!

## Multiple   Spaces`

    const toc = generateTOC(markdown)
    expect(toc).toContain('#hello-world')
    expect(toc).toContain('#special-characters')
    expect(toc).toContain('#multiple-spaces')
  })
})

// ============================================================================
// ensureTOC
// ============================================================================

describe('ensureTOC', () => {
  it('does not add TOC if already exists', () => {
    const markdown = `# Document

## Table of Contents

- [Section](#section)

## Section

Content.`

    const result = ensureTOC(markdown)
    expect(result).toBe(markdown)
  })

  it('adds TOC when none exists', () => {
    const markdown = `# Document

## Section 1

Content.

## Section 2

More content.`

    const result = ensureTOC(markdown)
    expect(result).toContain('## Table of Contents')
    expect(result).toContain('[Section 1]')
    expect(result).toContain('[Section 2]')
  })

  it('inserts TOC after frontmatter', () => {
    const markdown = `---
title: My Doc
---

# Document

## Section

Content.`

    const result = ensureTOC(markdown)
    const lines = result.split('\n')
    const frontmatterEnd = lines.findIndex((l, i) => i > 0 && l.trim() === '---')
    const tocStart = lines.findIndex(l => l.includes('Table of Contents'))

    expect(tocStart).toBeGreaterThan(frontmatterEnd)
  })

  it('inserts TOC after first H1', () => {
    const markdown = `# Main Title

## Section 1

Content.`

    const result = ensureTOC(markdown)
    const lines = result.split('\n')
    const h1Index = lines.findIndex(l => l.startsWith('# '))
    const tocIndex = lines.findIndex(l => l.includes('Table of Contents'))

    expect(tocIndex).toBeGreaterThan(h1Index)
  })

  it('returns original when no headings to list', () => {
    const markdown = `Just some text.

No headings at all.`

    const result = ensureTOC(markdown)
    expect(result).toBe(markdown)
  })

  it('passes options to generateTOC', () => {
    const markdown = `# Title

## Section

### Subsection`

    const result = ensureTOC(markdown, { minLevel: 2, maxLevel: 2 })
    expect(result).toContain('[Section]')
    expect(result).not.toContain('[Subsection]')
    expect(result).not.toContain('[Title]')
  })

  it('uses specified format', () => {
    const markdown = `# Doc

## A

## B`

    const result = ensureTOC(markdown, { format: 'numbered' })
    expect(result).toContain('1. [')
  })
})

// ============================================================================
// Edge Cases
// ============================================================================

describe('Edge Cases', () => {
  it('handles very long headings', () => {
    const longHeading = 'A'.repeat(200)
    const markdown = `## ${longHeading}`

    const toc = generateTOC(markdown)
    expect(toc).toContain(`[${longHeading}]`)
  })

  it('handles special characters in headings', () => {
    const markdown = `## C++ Programming

## C# Basics

## What's New?`

    const toc = generateTOC(markdown)
    expect(toc).toContain('[C++ Programming]')
    expect(toc).toContain('[C# Basics]')
    expect(toc).toContain("[What's New?]")
  })

  it('handles unicode in headings', () => {
    const markdown = `## Hello World

## Привет мир

## Emoji `

    const toc = generateTOC(markdown)
    expect(toc).toContain('[Hello World]')
  })

  it('handles empty lines in TOC', () => {
    const markdown = `## Table of Contents

- [A](#a)

- [B](#b)

## A`

    const result = detectExistingTOC(markdown)
    expect(result.entries).toHaveLength(2)
  })

  it('handles mixed bullet styles in existing TOC', () => {
    const markdown = `## Table of Contents

- [First](#first)
* [Second](#second)

## First`

    const result = detectExistingTOC(markdown)
    expect(result.entries).toHaveLength(2)
    expect(result.format).toBe('bullet')
  })
})
