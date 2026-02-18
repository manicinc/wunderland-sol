/**
 * Remark plugin to strip control flags from rendered markdown
 * @module lib/remark/remarkStripControlFlags
 * 
 * @remarks
 * Removes inline control directives like:
 * - skip_ai: true
 * - skip_index: true
 * - manual_tags: true
 * 
 * These are stored in frontmatter metadata but sometimes leak into body.
 * This plugin strips them from the AST before rendering.
 */

import { visit } from 'unist-util-visit'
import type { Root, Paragraph, Text } from 'mdast'

const CONTROL_FLAG_PATTERN = /^(skip_ai|skip_index|manual_tags|auto_tags|ai_enhance):\s*(true|false)/i

/**
 * Remark plugin to remove control flag lines from markdown
 */
export function remarkStripControlFlags() {
  return (tree: Root) => {
    visit(tree, 'paragraph', (node: Paragraph, index, parent) => {
      if (!parent || typeof index !== 'number') return

      // Check if paragraph contains only a control flag
      if (node.children.length === 1 && node.children[0].type === 'text') {
        const text = (node.children[0] as Text).value.trim()
        
        if (CONTROL_FLAG_PATTERN.test(text)) {
          // Remove this paragraph node
          parent.children.splice(index, 1)
          return ['skip', index]
        }
      }

      // Also handle multi-line cases where control flags are mixed with text
      const filteredChildren = node.children.filter((child) => {
        if (child.type === 'text') {
          const lines = child.value.split('\n')
          const cleanLines = lines.filter((line) => !CONTROL_FLAG_PATTERN.test(line.trim()))
          
          if (cleanLines.length === 0) return false
          if (cleanLines.length !== lines.length) {
            // Update the text node with cleaned lines
            child.value = cleanLines.join('\n')
          }
        }
        return true
      })

      if (filteredChildren.length === 0) {
        // Remove empty paragraph
        parent.children.splice(index, 1)
        return ['skip', index]
      }

      node.children = filteredChildren
    })
  }
}

