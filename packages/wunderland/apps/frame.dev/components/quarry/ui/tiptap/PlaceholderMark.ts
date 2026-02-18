/**
 * PlaceholderMark Extension for Tiptap
 * @module codex/ui/tiptap/PlaceholderMark
 *
 * @description
 * Custom Tiptap mark extension for highlighting template placeholders.
 * Renders {placeholder} text with cyan background styling for visibility.
 */

import { Mark, mergeAttributes } from '@tiptap/core'

export interface PlaceholderMarkOptions {
  HTMLAttributes: Record<string, unknown>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    placeholderMark: {
      /**
       * Set a placeholder mark
       */
      setPlaceholderMark: () => ReturnType
      /**
       * Toggle a placeholder mark
       */
      togglePlaceholderMark: () => ReturnType
      /**
       * Unset a placeholder mark
       */
      unsetPlaceholderMark: () => ReturnType
    }
  }
}

export const PlaceholderMark = Mark.create<PlaceholderMarkOptions>({
  name: 'placeholderMark',

  addOptions() {
    return {
      HTMLAttributes: {},
    }
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-placeholder]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-placeholder': 'true',
        class: 'placeholder-mark',
        style: 'background-color: rgb(34 211 238 / 0.2); color: rgb(6 182 212); padding: 0 2px; border-radius: 2px; font-family: monospace;',
      }),
      0,
    ]
  },

  addCommands() {
    return {
      setPlaceholderMark:
        () =>
        ({ commands }) => {
          return commands.setMark(this.name)
        },
      togglePlaceholderMark:
        () =>
        ({ commands }) => {
          return commands.toggleMark(this.name)
        },
      unsetPlaceholderMark:
        () =>
        ({ commands }) => {
          return commands.unsetMark(this.name)
        },
    }
  },
})

export default PlaceholderMark
