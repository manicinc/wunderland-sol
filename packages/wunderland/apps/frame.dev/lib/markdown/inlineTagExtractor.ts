/**
 * Client-side inline hashtag extractor
 * Parses markdown content for #hashtags immediately (no network, no async)
 */

const INLINE_TAG_PATTERN = /#([a-zA-Z][a-zA-Z0-9_/-]*)/g

// Markdown heading patterns to skip (e.g., ##h2 would match #h2)
const HEADING_PATTERNS = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6'])

export interface InlineTag {
  tag: string
  confidence: 1.0
  source: 'inline'
  lineNumber?: number
  blockId?: string
}

/**
 * Extract inline #hashtags from markdown content
 * Returns immediately - no async, no network
 *
 * @example
 * extractInlineTags('Learn #react and #typescript')
 * // Returns: [{ tag: 'react', ... }, { tag: 'typescript', ... }]
 */
export function extractInlineTags(content: string): InlineTag[] {
  if (!content || typeof content !== 'string') return []

  const tags: InlineTag[] = []
  const seen = new Set<string>()

  // Split by lines to get line numbers
  const lines = content.split('\n')

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Skip lines that are just markdown headings (# Heading)
    if (/^#{1,6}\s/.test(line.trim())) {
      // Still extract hashtags from heading content, just not the heading syntax itself
    }

    // Reset regex state for global pattern
    INLINE_TAG_PATTERN.lastIndex = 0

    let match
    while ((match = INLINE_TAG_PATTERN.exec(line)) !== null) {
      const tag = match[1].toLowerCase()

      // Skip markdown heading patterns (h1-h6) and already seen tags
      if (HEADING_PATTERNS.has(tag) || seen.has(tag)) continue

      seen.add(tag)
      tags.push({
        tag,
        confidence: 1.0,
        source: 'inline',
        lineNumber: i + 1
      })
    }
  }

  return tags
}

/**
 * Extract unique tag names only (for quick display)
 */
export function extractInlineTagNames(content: string): string[] {
  return extractInlineTags(content).map(t => t.tag)
}

/**
 * Extract tags grouped by block ID
 * Requires pre-parsed block boundaries
 */
export function extractInlineTagsPerBlock(
  content: string,
  blocks: Array<{ id: string; startLine: number; endLine: number }>
): Map<string, InlineTag[]> {
  const allTags = extractInlineTags(content)
  const blockTags = new Map<string, InlineTag[]>()

  for (const tag of allTags) {
    // Find which block this tag belongs to
    const block = blocks.find(b =>
      tag.lineNumber !== undefined &&
      tag.lineNumber >= b.startLine &&
      tag.lineNumber <= b.endLine
    )

    if (block) {
      const existing = blockTags.get(block.id) || []
      existing.push({ ...tag, blockId: block.id })
      blockTags.set(block.id, existing)
    }
  }

  return blockTags
}

/**
 * Check if content has any inline tags (quick check)
 */
export function hasInlineTags(content: string): boolean {
  if (!content) return false
  INLINE_TAG_PATTERN.lastIndex = 0
  return INLINE_TAG_PATTERN.test(content)
}
