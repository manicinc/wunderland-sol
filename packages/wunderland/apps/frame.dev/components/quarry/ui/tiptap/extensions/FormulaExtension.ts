/**
 * Formula Extension for TipTap Editor
 * @module quarry/ui/tiptap/extensions/FormulaExtension
 *
 * Renders Embark-inspired formula blocks with live evaluation.
 * Syntax: ```formula
 * =ADD(1, 2)
 * ```
 *
 * Supports:
 * - 50+ built-in functions (math, string, date, aggregate, travel)
 * - @mention references
 * - Field references
 * - Arithmetic operations
 */

import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import FormulaNodeView from './FormulaNodeView'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    formula: {
      /**
       * Insert a formula block
       */
      insertFormula: (expression?: string) => ReturnType
    }
  }
}

export interface FormulaOptions {
  /** HTML attributes for the node */
  HTMLAttributes: Record<string, unknown>
}

/**
 * Default formula expression
 */
const DEFAULT_FORMULA = '=ADD(1, 2)'

export const FormulaExtension = Node.create<FormulaOptions>({
  name: 'formula',

  group: 'block',

  atom: true, // Treat as a single unit

  draggable: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    }
  },

  addAttributes() {
    return {
      expression: {
        default: DEFAULT_FORMULA,
        parseHTML: element => {
          return element.getAttribute('data-expression') || element.textContent || DEFAULT_FORMULA
        },
        renderHTML: attributes => {
          return {
            'data-expression': attributes.expression,
          }
        },
      },
      // Context fields for formula evaluation
      fields: {
        default: {},
        parseHTML: element => {
          const fieldsAttr = element.getAttribute('data-fields')
          if (fieldsAttr) {
            try {
              return JSON.parse(fieldsAttr)
            } catch {
              return {}
            }
          }
          return {}
        },
        renderHTML: attributes => {
          return {
            'data-fields': JSON.stringify(attributes.fields || {}),
          }
        },
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="formula"]',
      },
      // Parse code blocks with formula language
      {
        tag: 'pre',
        preserveWhitespace: 'full',
        getAttrs: node => {
          if (node instanceof HTMLElement) {
            const codeEl = node.querySelector('code')
            const lang = codeEl?.className?.match(/language-(\w+)/)?.[1]
            if (lang === 'formula') {
              return { expression: codeEl?.textContent || DEFAULT_FORMULA }
            }
          }
          return false
        },
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(
      { 'data-type': 'formula', class: 'formula-block' },
      this.options.HTMLAttributes,
      HTMLAttributes
    )]
  },

  addNodeView() {
    return ReactNodeViewRenderer(FormulaNodeView)
  },

  addCommands() {
    return {
      insertFormula: (expression?: string) => ({ chain }) => {
        return chain()
          .insertContent({
            type: this.name,
            attrs: { expression: expression || DEFAULT_FORMULA },
          })
          .run()
      },
    }
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

export default FormulaExtension
