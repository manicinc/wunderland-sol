/**
 * Callout Extension for TipTap Editor
 * @module quarry/ui/tiptap/extensions/CalloutExtension
 *
 * Renders callout/admonition blocks with icons and styling.
 * Supports: tip, warning, danger, info, note, success types.
 */

import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import CalloutNodeView from './CalloutNodeView'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    callout: {
      /**
       * Insert a callout block
       */
      insertCallout: (type?: CalloutType, title?: string, content?: string) => ReturnType
      /**
       * Update callout type
       */
      setCalloutType: (type: CalloutType) => ReturnType
    }
  }
}

export type CalloutType = 'tip' | 'warning' | 'danger' | 'info' | 'note' | 'success'

export interface CalloutOptions {
  /** HTML attributes for the node */
  HTMLAttributes: Record<string, unknown>
  /** Available callout types */
  types: CalloutType[]
}

/**
 * Callout configuration with icons and colors
 */
export const CALLOUT_CONFIG: Record<CalloutType, {
  icon: string
  label: string
  lightBg: string
  darkBg: string
  border: string
}> = {
  tip: {
    icon: '💡',
    label: 'Tip',
    lightBg: 'bg-amber-50',
    darkBg: 'bg-amber-900/20',
    border: 'border-amber-500',
  },
  warning: {
    icon: '⚠️',
    label: 'Warning',
    lightBg: 'bg-yellow-50',
    darkBg: 'bg-yellow-900/20',
    border: 'border-yellow-500',
  },
  danger: {
    icon: '🚨',
    label: 'Danger',
    lightBg: 'bg-red-50',
    darkBg: 'bg-red-900/20',
    border: 'border-red-500',
  },
  info: {
    icon: 'ℹ️',
    label: 'Info',
    lightBg: 'bg-blue-50',
    darkBg: 'bg-blue-900/20',
    border: 'border-blue-500',
  },
  note: {
    icon: '📝',
    label: 'Note',
    lightBg: 'bg-zinc-50',
    darkBg: 'bg-zinc-800',
    border: 'border-zinc-400',
  },
  success: {
    icon: '✅',
    label: 'Success',
    lightBg: 'bg-green-50',
    darkBg: 'bg-green-900/20',
    border: 'border-green-500',
  },
}

export const CalloutExtension = Node.create<CalloutOptions>({
  name: 'callout',

  group: 'block',

  content: 'block+', // Can contain block content (paragraphs, lists, etc.)

  defining: true,

  draggable: true,

  addOptions() {
    return {
      HTMLAttributes: {},
      types: ['tip', 'warning', 'danger', 'info', 'note', 'success'],
    }
  },

  addAttributes() {
    return {
      type: {
        default: 'note',
        parseHTML: element => {
          return element.getAttribute('data-callout-type') || 'note'
        },
        renderHTML: attributes => {
          return {
            'data-callout-type': attributes.type,
          }
        },
      },
      title: {
        default: '',
        parseHTML: element => {
          return element.getAttribute('data-callout-title') || ''
        },
        renderHTML: attributes => {
          return {
            'data-callout-title': attributes.title,
          }
        },
      },
      collapsed: {
        default: false,
        parseHTML: element => {
          return element.getAttribute('data-collapsed') === 'true'
        },
        renderHTML: attributes => {
          return {
            'data-collapsed': attributes.collapsed ? 'true' : 'false',
          }
        },
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="callout"]',
      },
      // Also parse markdown callout syntax :::type[title]
      {
        tag: 'div.callout',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(
      { 'data-type': 'callout', class: 'callout-block' },
      this.options.HTMLAttributes,
      HTMLAttributes
    ), 0]
  },

  addNodeView() {
    return ReactNodeViewRenderer(CalloutNodeView)
  },

  addCommands() {
    return {
      insertCallout: (type = 'note', title = '', content = '') => ({ chain }) => {
        return chain()
          .insertContent({
            type: this.name,
            attrs: { type, title },
            content: content ? [{ type: 'paragraph', content: [{ type: 'text', text: content }] }] : [{ type: 'paragraph' }],
          })
          .run()
      },
      setCalloutType: (type: CalloutType) => ({ commands }) => {
        return commands.updateAttributes(this.name, { type })
      },
    }
  },

  addKeyboardShortcuts() {
    return {
      // Allow Enter to create new paragraph inside callout
      Enter: ({ editor }) => {
        const { selection } = editor.state
        const { $from } = selection

        // Check if we're inside a callout
        let depth = $from.depth
        while (depth > 0) {
          const node = $from.node(depth)
          if (node.type.name === this.name) {
            // Let default behavior handle paragraph creation
            return false
          }
          depth--
        }

        return false
      },
      // Delete empty callout on backspace
      Backspace: () => {
        const { selection } = this.editor.state
        const { empty, $anchor } = selection

        if (!empty) return false

        // Check if we're at start of first child of callout
        let depth = $anchor.depth
        while (depth > 0) {
          const node = $anchor.node(depth)
          if (node.type.name === this.name) {
            // If callout is empty or has only one empty paragraph, delete it
            if (node.content.size === 0 ||
                (node.content.childCount === 1 &&
                 node.content.firstChild?.textContent === '')) {
              return this.editor.commands.deleteNode(this.name)
            }
            break
          }
          depth--
        }

        return false
      },
    }
  },
})

export default CalloutExtension
