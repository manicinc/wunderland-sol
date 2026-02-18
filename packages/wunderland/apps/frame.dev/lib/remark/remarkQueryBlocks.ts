/**
 * Remark Query Blocks Plugin
 * @module lib/remark/remarkQueryBlocks
 *
 * @description
 * Remark plugin that transforms ```query code blocks into
 * executable query components.
 *
 * Syntax:
 * ```query
 * #task status:pending @sort:due_date
 * ```
 *
 * Options:
 * ```query mode=compact limit=5
 * #task
 * ```
 */

import { visit } from 'unist-util-visit'
import type { Plugin } from 'unified'
import type { Node, Parent } from 'unist'
import type { Code, HTML } from 'mdast'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

export interface RemarkQueryBlocksOptions {
  /** Default display mode */
  defaultMode?: 'list' | 'compact' | 'table' | 'count'
  /** Default result limit */
  defaultLimit?: number
  /** Default collapsed state */
  defaultCollapsed?: boolean
  /** Auto-refresh interval in ms */
  autoRefresh?: number
}

interface QueryBlockMeta {
  mode?: string
  limit?: number
  collapsed?: boolean
  refresh?: number
}

/* ═══════════════════════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Parse meta string from code fence
 * e.g., "mode=compact limit=5 collapsed"
 */
function parseQueryMeta(meta: string | null | undefined): QueryBlockMeta {
  if (!meta) return {}

  const result: QueryBlockMeta = {}
  const parts = meta.split(/\s+/)

  for (const part of parts) {
    if (part === 'collapsed') {
      result.collapsed = true
      continue
    }

    const [key, value] = part.split('=')
    if (key === 'mode') {
      result.mode = value
    } else if (key === 'limit') {
      result.limit = parseInt(value, 10) || undefined
    } else if (key === 'refresh') {
      result.refresh = parseInt(value, 10) || undefined
    }
  }

  return result
}

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
 * Remark plugin to transform ```query blocks into QueryBlock components
 *
 * @example
 * ```ts
 * import { unified } from 'unified'
 * import remarkParse from 'remark-parse'
 * import remarkQueryBlocks from './remarkQueryBlocks'
 *
 * const processor = unified()
 *   .use(remarkParse)
 *   .use(remarkQueryBlocks, { defaultMode: 'list' })
 * ```
 */
const remarkQueryBlocks: Plugin<[RemarkQueryBlocksOptions?]> = (options = {}) => {
  const {
    defaultMode = 'list',
    defaultLimit = 10,
    defaultCollapsed = false,
    autoRefresh = 0,
  } = options

  return (tree: Node) => {
    visit(tree, 'code', (node: Code, index: number | undefined, parent: Parent | undefined) => {
      // Only process 'query' language blocks
      if (node.lang !== 'query') return

      const query = node.value.trim()
      if (!query) return

      // Parse meta options
      const meta = parseQueryMeta(node.meta)
      const mode = meta.mode || defaultMode
      const limit = meta.limit ?? defaultLimit
      const collapsed = meta.collapsed ?? defaultCollapsed
      const refresh = meta.refresh ?? autoRefresh

      // Create HTML node with data attributes for React hydration
      // The actual React component will be rendered client-side
      const htmlNode: HTML = {
        type: 'html',
        value: `<div class="query-block" data-query="${escapeHtml(query)}" data-mode="${mode}" data-limit="${limit}" data-collapsed="${collapsed}" data-refresh="${refresh}">
  <div class="query-block-fallback">
    <span class="query-block-icon">🔍</span>
    <code class="query-block-query">${escapeHtml(query)}</code>
    <span class="query-block-loading">Loading results...</span>
  </div>
</div>`,
      }

      // Replace the code node with our HTML node
      if (parent && typeof index === 'number') {
        (parent.children as Node[])[index] = htmlNode
      }
    })
  }
}

export { remarkQueryBlocks }
export default remarkQueryBlocks

/* ═══════════════════════════════════════════════════════════════════════════
   CSS FOR FALLBACK
═══════════════════════════════════════════════════════════════════════════ */

/**
 * CSS for the fallback display (before React hydration)
 * Include this in your global styles or component
 */
export const queryBlockStyles = `
.query-block {
  margin: 1rem 0;
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  background: rgba(39, 39, 42, 0.5);
  border: 1px solid rgba(63, 63, 70, 0.5);
}

.query-block-fallback {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
}

.query-block-icon {
  opacity: 0.6;
}

.query-block-query {
  font-family: monospace;
  font-size: 0.75rem;
  color: #a1a1aa;
  flex: 1;
}

.query-block-loading {
  font-size: 0.75rem;
  color: #71717a;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
}

/* Hide fallback when React component is hydrated */
.query-block[data-hydrated="true"] .query-block-fallback {
  display: none;
}
`
