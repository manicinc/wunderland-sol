/**
 * TOC Detector
 * @module lib/markdown/tocDetector
 *
 * Utilities for detecting existing Table of Contents sections in markdown.
 * Used to prevent duplicate TOC generation when importing/processing content.
 */

export interface TOCDetectionResult {
  /** Whether a TOC was detected */
  hasTOC: boolean
  /** Line number where TOC starts (0-indexed) */
  startLine?: number
  /** Line number where TOC ends (0-indexed) */
  endLine?: number
  /** Format of the TOC */
  format: 'bullet' | 'numbered' | 'none'
  /** Extracted TOC entries */
  entries: TOCEntry[]
}

export interface TOCEntry {
  /** Text of the entry */
  text: string
  /** Anchor/link target */
  anchor?: string
  /** Indentation level (0-based) */
  level: number
}

/** Common TOC heading patterns */
const TOC_HEADING_PATTERNS = [
  /^#{1,3}\s+table\s+of\s+contents?\s*$/i,
  /^#{1,3}\s+contents?\s*$/i,
  /^#{1,3}\s+toc\s*$/i,
  /^#{1,3}\s+outline\s*$/i,
  /^#{1,3}\s+index\s*$/i,
]

/** Link patterns in TOC entries */
const LINK_PATTERN = /\[([^\]]+)\]\(#([^)]+)\)/

/**
 * Detect if markdown content has an existing Table of Contents
 */
export function detectExistingTOC(markdown: string): TOCDetectionResult {
  const lines = markdown.split('\n')
  let tocStartLine: number | undefined
  let tocEndLine: number | undefined
  let format: 'bullet' | 'numbered' | 'none' = 'none'
  const entries: TOCEntry[] = []

  // Find TOC heading
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()

    // Check if this line is a TOC heading
    const isTOCHeading = TOC_HEADING_PATTERNS.some(pattern => pattern.test(line))

    if (isTOCHeading) {
      tocStartLine = i

      // Parse TOC entries starting from next line
      let j = i + 1

      // Skip empty lines after heading
      while (j < lines.length && lines[j].trim() === '') {
        j++
      }

      // Parse list items
      while (j < lines.length) {
        const entryLine = lines[j]
        const trimmed = entryLine.trim()

        // Check if still in list
        if (trimmed === '') {
          // Empty line might end TOC, but check if more list items follow
          if (j + 1 < lines.length) {
            const nextLine = lines[j + 1].trim()
            if (!nextLine.startsWith('-') && !nextLine.startsWith('*') && !/^\d+\./.test(nextLine)) {
              tocEndLine = j - 1
              break
            }
          }
          j++
          continue
        }

        // Check for bullet list
        if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
          if (format === 'none') format = 'bullet'

          const indent = entryLine.search(/\S/)
          const level = Math.floor(indent / 2)
          const content = trimmed.replace(/^[-*]\s*/, '')

          const linkMatch = content.match(LINK_PATTERN)
          if (linkMatch) {
            entries.push({
              text: linkMatch[1],
              anchor: linkMatch[2],
              level,
            })
          } else {
            entries.push({
              text: content,
              level,
            })
          }
          j++
          continue
        }

        // Check for numbered list
        const numMatch = trimmed.match(/^(\d+)\.\s*(.+)$/)
        if (numMatch) {
          if (format === 'none') format = 'numbered'

          const indent = entryLine.search(/\S/)
          const level = Math.floor(indent / 3)
          const content = numMatch[2]

          const linkMatch = content.match(LINK_PATTERN)
          if (linkMatch) {
            entries.push({
              text: linkMatch[1],
              anchor: linkMatch[2],
              level,
            })
          } else {
            entries.push({
              text: content,
              level,
            })
          }
          j++
          continue
        }

        // If we hit a heading or other content, TOC is done
        if (trimmed.startsWith('#')) {
          tocEndLine = j - 1
          break
        }

        // Unknown line format - TOC probably ended
        tocEndLine = j - 1
        break
      }

      // If we reached end of file
      if (tocEndLine === undefined) {
        tocEndLine = lines.length - 1
      }

      break
    }
  }

  return {
    hasTOC: tocStartLine !== undefined && entries.length > 0,
    startLine: tocStartLine,
    endLine: tocEndLine,
    format,
    entries,
  }
}

/**
 * Remove existing TOC from markdown content
 */
export function stripExistingTOC(markdown: string): string {
  const result = detectExistingTOC(markdown)

  if (!result.hasTOC || result.startLine === undefined || result.endLine === undefined) {
    return markdown
  }

  const lines = markdown.split('\n')

  // Remove TOC lines
  const before = lines.slice(0, result.startLine)
  const after = lines.slice(result.endLine + 1)

  // Clean up extra blank lines
  while (before.length > 0 && before[before.length - 1].trim() === '') {
    before.pop()
  }
  while (after.length > 0 && after[0].trim() === '') {
    after.shift()
  }

  return [...before, '', ...after].join('\n')
}

/**
 * Check if content has a TOC heading (simpler check)
 */
export function hasTOCHeading(markdown: string): boolean {
  const lines = markdown.split('\n')
  return lines.some(line =>
    TOC_HEADING_PATTERNS.some(pattern => pattern.test(line.trim()))
  )
}

/**
 * Generate a TOC from headings in markdown
 */
export function generateTOC(markdown: string, options?: {
  minLevel?: number
  maxLevel?: number
  format?: 'bullet' | 'numbered'
}): string {
  const { minLevel = 1, maxLevel = 3, format = 'bullet' } = options || {}

  const lines = markdown.split('\n')
  const headings: { text: string; level: number; slug: string }[] = []

  let inCodeBlock = false

  for (const line of lines) {
    // Track code blocks
    if (line.trim().startsWith('```')) {
      inCodeBlock = !inCodeBlock
      continue
    }

    if (inCodeBlock) continue

    // Match headings
    const match = line.match(/^(#{1,6})\s+(.+)$/)
    if (match) {
      const level = match[1].length
      if (level >= minLevel && level <= maxLevel) {
        const text = match[2]
          .replace(/\*\*(.*?)\*\*/g, '$1')
          .replace(/\*(.*?)\*/g, '$1')
          .replace(/`(.*?)`/g, '$1')
          .replace(/\[(.*?)\]\(.*?\)/g, '$1')
          .trim()

        const slug = text
          .toLowerCase()
          .replace(/[^\w\s-]/g, '')
          .replace(/\s+/g, '-')

        // Skip TOC headings themselves
        if (!TOC_HEADING_PATTERNS.some(p => p.test(line.trim()))) {
          headings.push({ text, level, slug })
        }
      }
    }
  }

  if (headings.length === 0) return ''

  const tocLines = ['## Table of Contents', '']

  for (const heading of headings) {
    const indent = '  '.repeat(heading.level - minLevel)
    const prefix = format === 'numbered' ? '1.' : '-'
    tocLines.push(`${indent}${prefix} [${heading.text}](#${heading.slug})`)
  }

  tocLines.push('')

  return tocLines.join('\n')
}

/**
 * Insert TOC after frontmatter if it doesn't exist
 */
export function ensureTOC(markdown: string, options?: Parameters<typeof generateTOC>[1]): string {
  const result = detectExistingTOC(markdown)

  if (result.hasTOC) {
    return markdown
  }

  const toc = generateTOC(markdown, options)

  if (!toc) return markdown

  // Find where to insert (after frontmatter and first heading)
  const lines = markdown.split('\n')
  let insertIndex = 0

  // Skip frontmatter
  if (lines[0]?.trim() === '---') {
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim() === '---') {
        insertIndex = i + 1
        break
      }
    }
  }

  // Skip to after first H1 if present
  for (let i = insertIndex; i < lines.length; i++) {
    if (lines[i].trim().startsWith('# ')) {
      insertIndex = i + 1
      break
    }
  }

  // Skip any blank lines
  while (insertIndex < lines.length && lines[insertIndex].trim() === '') {
    insertIndex++
  }

  const before = lines.slice(0, insertIndex)
  const after = lines.slice(insertIndex)

  return [...before, '', toc, ...after].join('\n')
}
