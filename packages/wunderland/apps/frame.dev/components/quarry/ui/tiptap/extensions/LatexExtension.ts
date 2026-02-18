/**
 * LaTeX Math Extension for TipTap Editor
 * @module quarry/ui/tiptap/extensions/LatexExtension
 *
 * Renders mathematical equations using KaTeX.
 * Supports both inline ($...$) and block ($$...$$) math.
 */

import { Node, mergeAttributes, InputRule } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import LatexNodeView from './LatexNodeView'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    latex: {
      /**
       * Insert an inline LaTeX equation
       */
      insertLatexInline: (formula?: string) => ReturnType
      /**
       * Insert a block LaTeX equation
       */
      insertLatexBlock: (formula?: string) => ReturnType
    }
  }
}

export interface LatexOptions {
  /** HTML attributes for the node */
  HTMLAttributes: Record<string, unknown>
}

/**
 * Default LaTeX formulas
 */
const DEFAULT_INLINE = 'E = mc^2'
const DEFAULT_BLOCK = '\\int_0^\\infty e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}'

/**
 * Inline LaTeX Extension
 * Renders inline math with $...$
 */
export const LatexInlineExtension = Node.create<LatexOptions>({
  name: 'latexInline',

  group: 'inline',

  inline: true,

  atom: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    }
  },

  addAttributes() {
    return {
      formula: {
        default: DEFAULT_INLINE,
        parseHTML: element => {
          return element.getAttribute('data-formula') || element.textContent || DEFAULT_INLINE
        },
        renderHTML: attributes => {
          return {
            'data-formula': attributes.formula,
          }
        },
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-type="latex-inline"]',
      },
      // Parse inline math syntax $...$
      {
        tag: 'span.katex',
        getAttrs: node => {
          // Skip block katex
          if ((node as HTMLElement).closest('.katex-display')) return false
          return {}
        },
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(
      { 'data-type': 'latex-inline', class: 'latex-inline' },
      this.options.HTMLAttributes,
      HTMLAttributes
    )]
  },

  addNodeView() {
    return ReactNodeViewRenderer(LatexNodeView)
  },

  addCommands() {
    return {
      insertLatexInline: (formula?: string) => ({ chain }) => {
        return chain()
          .insertContent({
            type: this.name,
            attrs: { formula: formula || DEFAULT_INLINE },
          })
          .run()
      },
      insertLatexBlock: () => () => false, // Handled by block extension
    }
  },

  addInputRules() {
    return [
      // Match $...$ but not $$...$$
      new InputRule({
        find: /(?<!\$)\$([^$]+)\$$/,
        handler: ({ state, range, match }) => {
          const formula = match[1]
          if (!formula) return null

          const { tr } = state
          const start = range.from
          const end = range.to

          tr.replaceWith(start, end, this.type.create({ formula }))
        },
      }),
    ]
  },
})

/**
 * Block LaTeX Extension
 * Renders display math with $$...$$
 */
export const LatexBlockExtension = Node.create<LatexOptions>({
  name: 'latexBlock',

  group: 'block',

  atom: true,

  draggable: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    }
  },

  addAttributes() {
    return {
      formula: {
        default: DEFAULT_BLOCK,
        parseHTML: element => {
          return element.getAttribute('data-formula') || element.textContent || DEFAULT_BLOCK
        },
        renderHTML: attributes => {
          return {
            'data-formula': attributes.formula,
          }
        },
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="latex-block"]',
      },
      {
        tag: '.katex-display',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(
      { 'data-type': 'latex-block', class: 'latex-block' },
      this.options.HTMLAttributes,
      HTMLAttributes
    )]
  },

  addNodeView() {
    return ReactNodeViewRenderer(LatexNodeView)
  },

  addCommands() {
    return {
      insertLatexInline: () => () => false, // Handled by inline extension
      insertLatexBlock: (formula?: string) => ({ chain }) => {
        return chain()
          .insertContent({
            type: this.name,
            attrs: { formula: formula || DEFAULT_BLOCK },
          })
          .run()
      },
    }
  },

  addInputRules() {
    return [
      // Match $$...$$
      new InputRule({
        find: /\$\$([^$]+)\$\$$/,
        handler: ({ state, range, match }) => {
          const formula = match[1]
          if (!formula) return null

          const { tr } = state
          const start = range.from
          const end = range.to

          tr.replaceWith(start, end, this.type.create({ formula }))
        },
      }),
    ]
  },

  addKeyboardShortcuts() {
    return {
      Backspace: () => {
        const { selection } = this.editor.state
        const { empty, $anchor } = selection
        const isAtStart = $anchor.parentOffset === 0

        if (!empty || !isAtStart) {
          return false
        }

        const node = $anchor.node()
        if (node.type.name === this.name) {
          return this.editor.commands.deleteNode(this.name)
        }

        return false
      },
    }
  },
})

export default LatexBlockExtension
