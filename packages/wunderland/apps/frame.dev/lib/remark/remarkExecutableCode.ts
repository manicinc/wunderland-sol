/**
 * Remark plugin to parse executable code blocks
 * Detects code fences with `exec` attribute and adds execution metadata
 * @module remark/remarkExecutableCode
 */

import { visit } from 'unist-util-visit'
import type { Root, Code } from 'mdast'
import { normalizeLanguage } from '../execution/types'

/**
 * Configuration for executable code parsing
 */
interface ExecutableCodeOptions {
  /** Attribute to detect (default: 'exec') */
  execAttribute?: string
  /** Languages allowed to execute (default: all supported) */
  allowedLanguages?: string[]
}

const DEFAULT_OPTIONS: ExecutableCodeOptions = {
  execAttribute: 'exec',
  allowedLanguages: ['javascript', 'typescript', 'python', 'bash', 'go', 'rust', 'js', 'ts', 'py', 'sh'],
}

/**
 * Remark plugin to parse executable code blocks
 *
 * @remarks
 * Detects code fences with `exec` in the meta string and adds
 * data attributes for the ExecutableCodeBlock component.
 *
 * @example
 * Input markdown:
 * ```typescript exec
 * console.log("Hello!");
 * ```
 *
 * Adds to node.data.hProperties:
 * - data-executable="true"
 * - data-language="typescript"
 * - data-exec-id="exec-0"
 */
export function remarkExecutableCode(options: ExecutableCodeOptions = {}) {
  const config = { ...DEFAULT_OPTIONS, ...options }
  let execCounter = 0

  return function transformer(tree: Root) {
    // Reset counter for each document
    execCounter = 0

    visit(tree, 'code', (node: Code) => {
      // Check if meta contains the exec attribute
      if (!node.meta?.includes(config.execAttribute!)) {
        return
      }

      // Get the language
      const lang = node.lang?.toLowerCase() || ''

      // Normalize the language
      const normalizedLang = normalizeLanguage(lang)

      // Check if language is allowed
      if (!config.allowedLanguages!.includes(lang) && !normalizedLang) {
        return
      }

      // Generate unique execution ID
      const execId = `exec-${execCounter++}`

      // Add data attributes for the component
      // Use a special class prefix that react-markdown will pass through
      // Format: language-{lang} exec-{id}
      node.data = {
        ...node.data,
        hName: 'code',
        hProperties: {
          ...(node.data?.hProperties as Record<string, unknown> || {}),
          'data-executable': 'true',
          'data-language': normalizedLang || lang,
          'data-exec-id': execId,
          'data-meta': node.meta,
          // Include exec info in className since react-markdown passes this through
          className: `language-${lang} executable exec-id-${execId}`,
        },
      }
    })
  }
}

/**
 * Parse output blocks from executed code
 * These are rendered specially as execution results
 */
export function remarkExecutionOutput() {
  return function transformer(tree: Root) {
    visit(tree, 'code', (node: Code, index, parent) => {
      if (node.lang !== 'output') return
      if (!parent || index === undefined) return

      // Check for exec-meta comment following the output block
      const nextNode = parent.children[index + 1]
      let meta: Record<string, unknown> = {}

      if (nextNode && nextNode.type === 'html') {
        const htmlNode = nextNode as { type: 'html'; value: string }
        const metaMatch = htmlNode.value.match(/<!--\s*exec-meta:\s*(\{.*?\})\s*-->/)
        if (metaMatch) {
          try {
            meta = JSON.parse(metaMatch[1])
          } catch {
            // Invalid JSON, ignore
          }
        }
      }

      // Mark as output block
      node.data = {
        ...node.data,
        hName: 'code',
        hProperties: {
          ...(node.data?.hProperties as Record<string, unknown> || {}),
          'data-output': 'true',
          'data-exec-lang': (meta.lang as string) || 'unknown',
          'data-exec-timestamp': (meta.timestamp as string) || '',
          'data-exec-duration': (meta.duration as number) || 0,
          'data-exec-success': (meta.success as boolean) ?? true,
          className: 'language-output',
        },
      }
    })
  }
}

export default remarkExecutableCode
