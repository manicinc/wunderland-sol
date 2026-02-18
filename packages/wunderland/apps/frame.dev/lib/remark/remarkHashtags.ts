/**
 * Remark Hashtags Plugin
 * @module lib/remark/remarkHashtags
 *
 * @description
 * Remark plugin that transforms #hashtags into styled inline badges.
 * Works with the showBlockTags preference to toggle visibility.
 *
 * Syntax: #react, #typescript, #machine-learning
 */

import { visit } from 'unist-util-visit'
import type { Plugin } from 'unified'
import type { Node, Parent } from 'unist'
import type { Text, HTML } from 'mdast'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

export interface RemarkHashtagsOptions {
    /** Whether to show hashtags (controlled by showBlockTags preference) */
    enabled?: boolean
    /** Custom class for the hashtag badge */
    className?: string
    /** Callback when a hashtag is clicked (encoded in data attribute) */
    onClick?: (tag: string) => void
}

/* ═══════════════════════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════════════════════ */

// Match #hashtags - word characters, hyphens, and slashes
// Must be preceded by whitespace or start of string
// Exclude markdown headings (##, ###, etc at line start)
const HASHTAG_PATTERN = /(?:^|[\s\(\[\{])#([a-zA-Z][a-zA-Z0-9_/-]*)/g

// Skip these - they're markdown heading level indicators
const HEADING_PATTERNS = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6'])

/**
 * Escape HTML entities
 */
function escapeHtml(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;')
}

/* ═══════════════════════════════════════════════════════════════════════════
   PLUGIN
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Remark plugin to transform #hashtags into inline badges
 */
const remarkHashtags: Plugin<[RemarkHashtagsOptions?]> = (options = {}) => {
    const { enabled = true, className = 'inline-hashtag' } = options

    return (tree: Node) => {
        // If hashtags are disabled, don't transform
        if (!enabled) return

        visit(tree, 'text', (node: Text, index: number | undefined, parent: Parent | undefined) => {
            if (!parent || typeof index !== 'number') return

            const text = node.value
            const matches: Array<{ start: number; end: number; tag: string; fullMatch: string }> = []

            // Find all hashtags in the text
            let match
            // Reset lastIndex for global regex
            HASHTAG_PATTERN.lastIndex = 0

            while ((match = HASHTAG_PATTERN.exec(text)) !== null) {
                const tag = match[1].toLowerCase()
                const fullMatch = `#${match[1]}`

                // Skip markdown heading patterns
                if (HEADING_PATTERNS.has(tag)) continue

                const start = match.index + (match[0].length - fullMatch.length)

                matches.push({
                    start,
                    end: start + fullMatch.length,
                    tag,
                    fullMatch,
                })
            }

            if (matches.length === 0) return

            // Build new nodes array, splitting text around hashtags
            const newNodes: Node[] = []
            let lastIndex = 0

            for (const m of matches) {
                // Add text before this hashtag
                if (m.start > lastIndex) {
                    newNodes.push({
                        type: 'text',
                        value: text.slice(lastIndex, m.start),
                    } as Text)
                }

                // Add the hashtag as styled HTML badge
                newNodes.push({
                    type: 'html',
                    value: `<span class="${className}" data-tag="${escapeHtml(m.tag)}" role="button" tabindex="0">#${escapeHtml(m.tag)}</span>`,
                } as HTML)

                lastIndex = m.end
            }

            // Add remaining text after last hashtag
            if (lastIndex < text.length) {
                newNodes.push({
                    type: 'text',
                    value: text.slice(lastIndex),
                } as Text)
            }

            // Replace the original text node with our new nodes
            parent.children.splice(index, 1, ...newNodes)

            // Skip the nodes we just added
            return index + newNodes.length
        })
    }
}

export { remarkHashtags }
export default remarkHashtags

/* ═══════════════════════════════════════════════════════════════════════════
   CSS STYLES
═══════════════════════════════════════════════════════════════════════════ */

/**
 * CSS for hashtag badges
 * Add to globals.css or import where needed
 */
export const hashtagStyles = `
/* Inline hashtag badges - visible by default */
.inline-hashtag {
  display: inline-flex;
  align-items: center;
  padding: 0.125rem 0.5rem;
  margin: 0 0.125rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
  background: rgba(6, 182, 212, 0.15);
  color: rgb(34, 211, 238);
  cursor: pointer;
  transition: all 0.2s;
  text-decoration: none;
}

.inline-hashtag:hover {
  background: rgba(6, 182, 212, 0.25);
  transform: scale(1.02);
}

.inline-hashtag:focus {
  outline: 2px solid rgba(6, 182, 212, 0.5);
  outline-offset: 1px;
}

/* Light mode */
@media (prefers-color-scheme: light) {
  .inline-hashtag {
    background: rgba(6, 182, 212, 0.1);
    color: rgb(14, 116, 144);
  }
  
  .inline-hashtag:hover {
    background: rgba(6, 182, 212, 0.2);
  }
}

/* Dark theme override (class-based) */
.dark .inline-hashtag {
  background: rgba(6, 182, 212, 0.15);
  color: rgb(34, 211, 238);
}

.dark .inline-hashtag:hover {
  background: rgba(6, 182, 212, 0.25);
}

/* Hidden state - when showBlockTags is false */
.hide-hashtags .inline-hashtag {
  display: none;
}
`
