/**
 * TOC Detector Tests
 * @module __tests__/unit/markdown/tocDetector.test
 *
 * Tests for Table of Contents detection, generation, and manipulation.
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
  describe('detecting TOC headings', () => {
    it('detects "Table of Contents" heading', () => {
      const md = `## Table of Contents
- [Intro](#intro)
- [Details](#details)
`
      const result = detectExistingTOC(md)
      expect(result.hasTOC).toBe(true)
      expect(result.startLine).toBe(0)
      expect(result.entries.length).toBe(2)
    })

    it('detects "Contents" heading', () => {
      const md = `# Contents
- Item 1
- Item 2`
      const result = detectExistingTOC(md)
      expect(result.hasTOC).toBe(true)
    })

    it('detects "TOC" heading', () => {
      const md = `## TOC
- [First](#first)`
      const result = detectExistingTOC(md)
      expect(result.hasTOC).toBe(true)
    })

    it('detects "Outline" heading', () => {
      const md = `### Outline
- [Section](#section)`
      const result = detectExistingTOC(md)
      expect(result.hasTOC).toBe(true)
    })

    it('detects "Index" heading', () => {
      const md = `## Index
- [Topic](#topic)`
      const result = detectExistingTOC(md)
      expect(result.hasTOC).toBe(true)
    })

    it('is case-insensitive', () => {
      const md = `## TABLE OF CONTENTS
- [Item](#item)`
      const result = detectExistingTOC(md)
      expect(result.hasTOC).toBe(true)
    })

    it('returns hasTOC false when no TOC heading', () => {
      const md = `# Introduction
Some content here.`
      const result = detectExistingTOC(md)
      expect(result.hasTOC).toBe(false)
      expect(result.entries.length).toBe(0)
    })
  })

  describe('parsing bullet format', () => {
    it('parses bullet list with dash', () => {
      const md = `## Table of Contents
- [First](#first)
- [Second](#second)`
      const result = detectExistingTOC(md)
      expect(result.format).toBe('bullet')
      expect(result.entries).toHaveLength(2)
      expect(result.entries[0].text).toBe('First')
      expect(result.entries[0].anchor).toBe('first')
    })

    it('parses bullet list with asterisk', () => {
      const md = `## Contents
* Item A
* Item B`
      const result = detectExistingTOC(md)
      expect(result.format).toBe('bullet')
      expect(result.entries).toHaveLength(2)
    })

    it('handles nested bullets by level', () => {
      const md = `## Table of Contents
- [Parent](#parent)
  - [Child](#child)
    - [Grandchild](#grandchild)`
      const result = detectExistingTOC(md)
      expect(result.entries).toHaveLength(3)
      expect(result.entries[0].level).toBe(0)
      expect(result.entries[1].level).toBe(1)
      expect(result.entries[2].level).toBe(2)
    })

    it('handles entries without links', () => {
      const md = `## Contents
- Introduction
- Main Content
- Conclusion`
      const result = detectExistingTOC(md)
      expect(result.entries[0].text).toBe('Introduction')
      expect(result.entries[0].anchor).toBeUndefined()
    })
  })

  describe('parsing numbered format', () => {
    it('parses numbered list', () => {
      const md = `## Table of Contents
1. [First](#first)
2. [Second](#second)`
      const result = detectExistingTOC(md)
      expect(result.format).toBe('numbered')
      expect(result.entries).toHaveLength(2)
    })

    it('handles numbered entries without links', () => {
      const md = `## Contents
1. Introduction
2. Body
3. Conclusion`
      const result = detectExistingTOC(md)
      expect(result.entries).toHaveLength(3)
      expect(result.entries[1].text).toBe('Body')
    })
  })

  describe('detecting TOC boundaries', () => {
    it('stops at new heading', () => {
      const md = `## Table of Contents
- [Intro](#intro)
- [Details](#details)

# Main Content
Actual content here.`
      const result = detectExistingTOC(md)
      expect(result.entries).toHaveLength(2)
      expect(result.endLine).toBeDefined()
    })

    it('handles empty lines within TOC', () => {
      const md = `## Contents
- Item 1

- Item 2`
      const result = detectExistingTOC(md)
      expect(result.hasTOC).toBe(true)
    })

    it('detects end at non-list content', () => {
      const md = `## Table of Contents
- [A](#a)
- [B](#b)

Some paragraph text here.`
      const result = detectExistingTOC(md)
      expect(result.entries).toHaveLength(2)
    })

    it('skips empty lines after heading', () => {
      const md = `## Contents

- [Item](#item)`
      const result = detectExistingTOC(md)
      expect(result.hasTOC).toBe(true)
      expect(result.entries).toHaveLength(1)
    })
  })

  describe('edge cases', () => {
    it('handles empty string', () => {
      const result = detectExistingTOC('')
      expect(result.hasTOC).toBe(false)
      expect(result.format).toBe('none')
    })

    it('requires entries for hasTOC to be true', () => {
      const md = `## Table of Contents

# Main Content`
      const result = detectExistingTOC(md)
      expect(result.hasTOC).toBe(false)
    })
  })
})

// ============================================================================
// stripExistingTOC
// ============================================================================

describe('stripExistingTOC', () => {
  it('removes TOC section from markdown', () => {
    const md = `# Title

## Table of Contents
- [Intro](#intro)
- [Details](#details)

## Intro
Content here.`
    const result = stripExistingTOC(md)
    expect(result).not.toContain('Table of Contents')
    expect(result).not.toContain('[Intro](#intro)')
    expect(result).toContain('## Intro')
    expect(result).toContain('Content here.')
  })

  it('returns original markdown if no TOC', () => {
    const md = `# Title

Some content.`
    const result = stripExistingTOC(md)
    expect(result).toBe(md)
  })

  it('cleans up extra blank lines', () => {
    const md = `# Title


## Contents
- Item

Content`
    const result = stripExistingTOC(md)
    expect(result).not.toContain('Contents')
    expect(result).toContain('Content')
  })

  it('preserves content before TOC', () => {
    const md = `# Title

Some intro text.

## Contents
- [A](#a)

## Section A
Details.`
    const result = stripExistingTOC(md)
    expect(result).toContain('# Title')
    expect(result).toContain('Some intro text.')
    expect(result).toContain('## Section A')
  })
})

// ============================================================================
// hasTOCHeading
// ============================================================================

describe('hasTOCHeading', () => {
  it('returns true for Table of Contents heading', () => {
    expect(hasTOCHeading('## Table of Contents\n- Item')).toBe(true)
  })

  it('returns true for Contents heading', () => {
    expect(hasTOCHeading('# Contents\n- Item')).toBe(true)
  })

  it('returns true for TOC heading', () => {
    expect(hasTOCHeading('### TOC\n- Item')).toBe(true)
  })

  it('returns true for Outline heading', () => {
    expect(hasTOCHeading('## Outline\n- Item')).toBe(true)
  })

  it('returns true for Index heading', () => {
    expect(hasTOCHeading('## Index\n- Item')).toBe(true)
  })

  it('returns false when no TOC heading', () => {
    expect(hasTOCHeading('# Introduction\nSome text.')).toBe(false)
  })

  it('returns false for empty string', () => {
    expect(hasTOCHeading('')).toBe(false)
  })

  it('is case-insensitive', () => {
    expect(hasTOCHeading('## TABLE OF CONTENTS')).toBe(true)
    expect(hasTOCHeading('## table of contents')).toBe(true)
  })
})

// ============================================================================
// generateTOC
// ============================================================================

describe('generateTOC', () => {
  describe('basic generation', () => {
    it('generates TOC from headings', () => {
      const md = `# Title

## Introduction
Content.

## Details
More content.`
      const toc = generateTOC(md)
      expect(toc).toContain('## Table of Contents')
      expect(toc).toContain('[Introduction](#introduction)')
      expect(toc).toContain('[Details](#details)')
    })

    it('returns empty string when no headings', () => {
      const md = 'Just some text without headings.'
      expect(generateTOC(md)).toBe('')
    })

    it('skips TOC headings themselves', () => {
      const md = `## Table of Contents
- Existing TOC

## Real Section`
      const toc = generateTOC(md)
      expect(toc).not.toContain('[Table of Contents]')
      expect(toc).toContain('[Real Section]')
    })
  })

  describe('level filtering', () => {
    it('respects minLevel option', () => {
      const md = `# Title
## Section
### Subsection`
      const toc = generateTOC(md, { minLevel: 2 })
      expect(toc).not.toContain('[Title]')
      expect(toc).toContain('[Section]')
      expect(toc).toContain('[Subsection]')
    })

    it('respects maxLevel option', () => {
      const md = `# Title
## Section
### Subsection
#### Deep`
      const toc = generateTOC(md, { maxLevel: 2 })
      expect(toc).toContain('[Title]')
      expect(toc).toContain('[Section]')
      expect(toc).not.toContain('[Subsection]')
    })

    it('uses minLevel and maxLevel together', () => {
      const md = `# H1
## H2
### H3
#### H4`
      const toc = generateTOC(md, { minLevel: 2, maxLevel: 3 })
      expect(toc).not.toContain('[H1]')
      expect(toc).toContain('[H2]')
      expect(toc).toContain('[H3]')
      expect(toc).not.toContain('[H4]')
    })
  })

  describe('format option', () => {
    it('uses bullet format by default', () => {
      const md = `## Section One
## Section Two`
      const toc = generateTOC(md)
      expect(toc).toContain('- [Section One]')
      expect(toc).toContain('- [Section Two]')
    })

    it('supports numbered format', () => {
      const md = `## Section One
## Section Two`
      const toc = generateTOC(md, { format: 'numbered' })
      expect(toc).toContain('1. [Section One]')
      expect(toc).toContain('1. [Section Two]')
    })
  })

  describe('slug generation', () => {
    it('converts heading to lowercase slug', () => {
      const md = `## My Section Title`
      const toc = generateTOC(md)
      expect(toc).toContain('#my-section-title')
    })

    it('removes special characters from slug', () => {
      const md = `## What's New? (2024)`
      const toc = generateTOC(md)
      expect(toc).toContain('#whats-new-2024')
    })

    it('handles multiple spaces', () => {
      const md = `## Section   With   Spaces`
      const toc = generateTOC(md)
      expect(toc).toContain('#section-with-spaces')
    })
  })

  describe('stripping markdown formatting', () => {
    it('strips bold formatting from heading text', () => {
      const md = `## **Important** Section`
      const toc = generateTOC(md)
      expect(toc).toContain('[Important Section]')
      expect(toc).not.toContain('**')
    })

    it('strips italic formatting from heading text', () => {
      const md = `## *Emphasized* Content`
      const toc = generateTOC(md)
      expect(toc).toContain('[Emphasized Content]')
      expect(toc).not.toContain('*')
    })

    it('strips code formatting from heading text', () => {
      const md = `## The \`config\` File`
      const toc = generateTOC(md)
      expect(toc).toContain('[The config File]')
      expect(toc).not.toContain('`')
    })

    it('strips links from heading text', () => {
      const md = `## Using [React](https://react.dev)`
      const toc = generateTOC(md)
      expect(toc).toContain('[Using React]')
      expect(toc).not.toContain('https')
    })
  })

  describe('code block handling', () => {
    it('ignores headings inside code blocks', () => {
      const md = `## Real Section

\`\`\`markdown
## Fake Heading in Code
\`\`\`

## Another Real Section`
      const toc = generateTOC(md)
      expect(toc).toContain('[Real Section]')
      expect(toc).toContain('[Another Real Section]')
      expect(toc).not.toContain('[Fake Heading in Code]')
    })
  })

  describe('indentation', () => {
    it('indents based on heading level', () => {
      const md = `## Level 2
### Level 3`
      const toc = generateTOC(md, { minLevel: 2 })
      const lines = toc.split('\n')
      const level2Line = lines.find(l => l.includes('[Level 2]'))
      const level3Line = lines.find(l => l.includes('[Level 3]'))
      expect(level2Line?.startsWith('-')).toBe(true)
      expect(level3Line?.startsWith('  -')).toBe(true)
    })
  })
})

// ============================================================================
// ensureTOC
// ============================================================================

describe('ensureTOC', () => {
  it('adds TOC when none exists', () => {
    const md = `# Title

## Section One
Content.`
    const result = ensureTOC(md)
    expect(result).toContain('## Table of Contents')
    expect(result).toContain('[Section One]')
  })

  it('does not add duplicate TOC', () => {
    const md = `# Title

## Table of Contents
- [Existing](#existing)

## Existing
Content.`
    const result = ensureTOC(md)
    const tocCount = (result.match(/## Table of Contents/g) || []).length
    expect(tocCount).toBe(1)
  })

  it('inserts TOC after frontmatter', () => {
    const md = `---
title: My Doc
---

# Title

## Section`
    const result = ensureTOC(md)
    expect(result.indexOf('---')).toBeLessThan(result.indexOf('## Table of Contents'))
    expect(result.indexOf('## Table of Contents')).toBeLessThan(result.indexOf('## Section'))
  })

  it('inserts TOC after first H1', () => {
    const md = `# Main Title

## First Section`
    const result = ensureTOC(md)
    const lines = result.split('\n')
    const h1Index = lines.findIndex(l => l.startsWith('# '))
    const tocIndex = lines.findIndex(l => l.includes('Table of Contents'))
    expect(tocIndex).toBeGreaterThan(h1Index)
  })

  it('returns original markdown if no headings to generate TOC', () => {
    const md = `Just some text.`
    const result = ensureTOC(md)
    expect(result).toBe(md)
  })

  it('passes options to generateTOC', () => {
    const md = `# Title
## Section`
    const result = ensureTOC(md, { minLevel: 2, format: 'numbered' })
    expect(result).toContain('1. [Section]')
    expect(result).not.toContain('[Title]')
  })
})
