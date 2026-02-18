/**
 * Mermaid Extension for TipTap Editor
 * @module quarry/ui/tiptap/extensions/MermaidExtension
 *
 * Renders mermaid diagram code blocks using the MermaidDiagram component.
 * Supports flowcharts, sequence diagrams, mindmaps, and more.
 */

import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import MermaidNodeView from './MermaidNodeView'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    mermaid: {
      /**
       * Insert a mermaid diagram block
       */
      insertMermaid: (code?: string) => ReturnType
    }
  }
}

export interface MermaidOptions {
  /** HTML attributes for the node */
  HTMLAttributes: Record<string, unknown>
}

/**
 * Default mermaid diagram code
 */
const DEFAULT_MERMAID = `flowchart TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Action]
    B -->|No| D[End]`

export const MermaidExtension = Node.create<MermaidOptions>({
  name: 'mermaid',

  group: 'block',

  atom: true, // Treat as a single unit - no inline editing

  draggable: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    }
  },

  addAttributes() {
    return {
      code: {
        default: DEFAULT_MERMAID,
        parseHTML: element => {
          // Try to get code from data attribute or text content
          return element.getAttribute('data-code') || element.textContent || DEFAULT_MERMAID
        },
        renderHTML: attributes => {
          return {
            'data-code': attributes.code,
          }
        },
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="mermaid"]',
      },
      // Also parse code blocks with mermaid language
      {
        tag: 'pre',
        preserveWhitespace: 'full',
        getAttrs: node => {
          if (node instanceof HTMLElement) {
            const codeEl = node.querySelector('code')
            const lang = codeEl?.className?.match(/language-(\w+)/)?.[1]
            if (lang === 'mermaid' || lang === 'mmd') {
              return { code: codeEl?.textContent || DEFAULT_MERMAID }
            }
          }
          return false
        },
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(
      { 'data-type': 'mermaid' },
      this.options.HTMLAttributes,
      HTMLAttributes
    )]
  },

  addNodeView() {
    return ReactNodeViewRenderer(MermaidNodeView)
  },

  addCommands() {
    return {
      insertMermaid: (code?: string) => ({ chain }) => {
        return chain()
          .insertContent({
            type: this.name,
            attrs: { code: code || DEFAULT_MERMAID },
          })
          .run()
      },
    }
  },

  addKeyboardShortcuts() {
    return {
      // Delete the node when pressing Backspace on an empty selection at the start
      Backspace: () => {
        const { selection } = this.editor.state
        const { empty, $anchor } = selection
        const isAtStart = $anchor.parentOffset === 0

        if (!empty || !isAtStart) {
          return false
        }

        // Don't delete if there's content
        const node = $anchor.node()
        if (node.type.name === this.name) {
          return this.editor.commands.deleteNode(this.name)
        }

        return false
      },
    }
  },
})

export default MermaidExtension
