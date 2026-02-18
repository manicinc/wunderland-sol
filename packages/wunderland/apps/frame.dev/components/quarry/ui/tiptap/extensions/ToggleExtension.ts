/**
 * Toggle Extension for TipTap Editor
 * @module quarry/ui/tiptap/extensions/ToggleExtension
 *
 * Collapsible toggle blocks (like Notion).
 * Click header to expand/collapse content.
 */

import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import ToggleNodeView from './ToggleNodeView'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    toggle: {
      /**
       * Insert a toggle block
       */
      insertToggle: (title?: string) => ReturnType
      /**
       * Toggle the open/closed state
       */
      toggleToggle: () => ReturnType
    }
  }
}

export interface ToggleOptions {
  /** HTML attributes for the node */
  HTMLAttributes: Record<string, unknown>
}

export const ToggleExtension = Node.create<ToggleOptions>({
  name: 'toggle',

  group: 'block',

  content: 'block+',

  draggable: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    }
  },

  addAttributes() {
    return {
      title: {
        default: 'Toggle',
        parseHTML: element => element.getAttribute('data-title') || 'Toggle',
        renderHTML: attributes => ({
          'data-title': attributes.title,
        }),
      },
      isOpen: {
        default: true,
        parseHTML: element => element.getAttribute('data-open') === 'true',
        renderHTML: attributes => ({
          'data-open': String(attributes.isOpen),
        }),
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="toggle"]',
      },
      // Parse details/summary elements
      {
        tag: 'details',
        getAttrs: node => {
          if (node instanceof HTMLElement) {
            const summary = node.querySelector('summary')
            return {
              title: summary?.textContent || 'Toggle',
              isOpen: node.hasAttribute('open'),
            }
          }
          return {}
        },
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(
      { 'data-type': 'toggle' },
      this.options.HTMLAttributes,
      HTMLAttributes
    ), 0]
  },

  addNodeView() {
    return ReactNodeViewRenderer(ToggleNodeView)
  },

  addCommands() {
    return {
      insertToggle: (title?: string) => ({ chain }) => {
        return chain()
          .insertContent({
            type: this.name,
            attrs: { title: title || 'Toggle', isOpen: true },
            content: [
              {
                type: 'paragraph',
              },
            ],
          })
          .run()
      },
      toggleToggle: () => ({ tr, state, dispatch }) => {
        const { selection } = state
        const node = selection.$anchor.node(-1)

        if (node?.type.name === this.name && dispatch) {
          const pos = selection.$anchor.before(-1)
          tr.setNodeMarkup(pos, undefined, {
            ...node.attrs,
            isOpen: !node.attrs.isOpen,
          })
          dispatch(tr)
          return true
        }
        return false
      },
    }
  },

  addKeyboardShortcuts() {
    return {
      // Toggle open/close with Cmd+Enter when inside toggle
      'Mod-Enter': () => this.editor.commands.toggleToggle(),
      // Delete empty toggle on Backspace
      Backspace: () => {
        const { selection } = this.editor.state
        const { empty, $anchor } = selection

        if (!empty) return false

        const node = $anchor.node(-1)
        if (node?.type.name === this.name) {
          // Check if content is empty (just one empty paragraph)
          if (node.content.size <= 2) {
            return this.editor.commands.deleteNode(this.name)
          }
        }

        return false
      },
    }
  },
})

export default ToggleExtension
