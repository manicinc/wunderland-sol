/**
 * Remark Mentions Plugin
 * @module lib/remark/remarkMentions
 *
 * @description
 * Remark plugin that transforms @mentions into interactive components.
 *
 * Syntax: @john-smith, @team-name, @project-x
 */

import { visit } from 'unist-util-visit'
import type { Plugin } from 'unified'
import type { Node, Parent } from 'unist'
import type { Text, HTML } from 'mdast'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

export interface RemarkMentionsOptions {
  /** Pattern to match mentions (default: @word-chars) */
  pattern?: RegExp
}

/* ═══════════════════════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════════════════════ */

// Match @mentions - word characters, hyphens, and underscores
// Must be preceded by whitespace or start of string
const MENTION_PATTERN = /(?:^|[\s\(\[\{])(@([a-zA-Z][a-zA-Z0-9_-]*))/g

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
 * Remark plugin to transform @mentions into MentionBadge components
 */
const remarkMentions: Plugin<[RemarkMentionsOptions?]> = (options = {}) => {
  const pattern = options.pattern || MENTION_PATTERN

  return (tree: Node) => {
    visit(tree, 'text', (node: Text, index: number | undefined, parent: Parent | undefined) => {
      if (!parent || typeof index !== 'number') return

      const text = node.value
      const matches: Array<{ start: number; end: number; mention: string; fullMatch: string }> = []

      // Find all mentions in the text
      let match
      // Reset lastIndex for global regex
      pattern.lastIndex = 0

      while ((match = pattern.exec(text)) !== null) {
        const fullMatch = match[1] // The @mention including @
        const mention = match[2]   // Just the name without @
        const start = match.index + (match[0].length - match[1].length)

        matches.push({
          start,
          end: start + fullMatch.length,
          mention,
          fullMatch,
        })
      }

      if (matches.length === 0) return

      // Build new nodes array, splitting text around mentions
      const newNodes: Node[] = []
      let lastIndex = 0

      for (const m of matches) {
        // Add text before this mention
        if (m.start > lastIndex) {
          newNodes.push({
            type: 'text',
            value: text.slice(lastIndex, m.start),
          } as Text)
        }

        // Add the mention as HTML with data attributes
        newNodes.push({
          type: 'html',
          value: `<span class="mention-badge" data-mention="${escapeHtml(m.mention)}">@${escapeHtml(m.mention)}</span>`,
        } as HTML)

        lastIndex = m.end
      }

      // Add remaining text after last mention
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

export { remarkMentions }
export default remarkMentions

/* ═══════════════════════════════════════════════════════════════════════════
   CSS FOR FALLBACK
═══════════════════════════════════════════════════════════════════════════ */

/**
 * CSS for the fallback display (before React hydration)
 */
export const mentionStyles = `
.mention-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.125rem 0.375rem;
  margin: 0 0.125rem;
  border-radius: 9999px;
  font-size: 0.875rem;
  font-weight: 500;
  background: rgba(59, 130, 246, 0.15);
  color: rgb(96, 165, 250);
  cursor: pointer;
  transition: background-color 0.2s;
}

.mention-badge:hover {
  background: rgba(59, 130, 246, 0.25);
}
`
