/**
 * SlashCommandExtension - Tiptap extension for "/" command triggering
 * @module quarry/ui/tiptap/SlashCommandExtension
 *
 * Detects "/" typed at line start or after space and opens command palette.
 * Tracks characters typed after "/" as filter query.
 */

import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'

export interface SlashCommandOptions {
  /** Called when slash command is activated */
  onActivate: (coords: { x: number; y: number }) => void
  /** Called when slash command is deactivated */
  onDeactivate: () => void
  /** Called when the query (text after "/") changes */
  onQueryChange: (query: string) => void
  /** Called when a command is selected (Enter pressed) */
  onSelect: () => void
  /** Character to trigger the menu (default: "/") */
  triggerChar?: string
}

export interface SlashCommandStorage {
  /** Whether slash mode is active */
  isActive: boolean
  /** Current query string (text after "/") */
  query: string
  /** Position where "/" was typed */
  startPos: number
}

const slashCommandPluginKey = new PluginKey('slashCommand')

export const SlashCommandExtension = Extension.create<SlashCommandOptions, SlashCommandStorage>({
  name: 'slashCommand',

  addOptions() {
    return {
      onActivate: () => {},
      onDeactivate: () => {},
      onQueryChange: () => {},
      onSelect: () => {},
      triggerChar: '/',
    }
  },

  addStorage() {
    return {
      isActive: false,
      query: '',
      startPos: 0,
    }
  },

  addProseMirrorPlugins() {
    const extension = this

    return [
      new Plugin({
        key: slashCommandPluginKey,

        state: {
          init: () => ({
            isActive: false,
            query: '',
            startPos: 0,
          }),

          apply(tr, prev, oldState, newState) {
            // If selection changed or document changed, check slash state
            if (!tr.docChanged && !tr.selectionSet) {
              return prev
            }

            const { selection } = newState
            const { $from } = selection

            // If slash mode is active
            if (prev.isActive) {
              // Check if cursor moved outside the slash command area
              if ($from.pos < prev.startPos) {
                extension.storage.isActive = false
                extension.options.onDeactivate()
                return { ...prev, isActive: false, query: '' }
              }

              // Extract query (text between "/" and cursor)
              const fullText = $from.parent.textContent
              const slashIndex = fullText.lastIndexOf(extension.options.triggerChar!, $from.parentOffset)

              if (slashIndex === -1) {
                // Slash was deleted
                extension.storage.isActive = false
                extension.options.onDeactivate()
                return { ...prev, isActive: false, query: '' }
              }

              const query = fullText.slice(slashIndex + 1, $from.parentOffset)

              // Check for space in query (deactivates)
              if (query.includes(' ')) {
                extension.storage.isActive = false
                extension.options.onDeactivate()
                return { ...prev, isActive: false, query: '' }
              }

              extension.storage.query = query
              extension.options.onQueryChange(query)

              return { ...prev, query }
            }

            return prev
          },
        },

        props: {
          handleTextInput(view, from, _to, text) {
            // Check if "/" is being typed
            if (text === extension.options.triggerChar) {
              const { $from } = view.state.selection
              const textBefore = $from.parent.textContent.slice(0, $from.parentOffset)

              // Only activate if at line start or after whitespace
              if (textBefore.length === 0 || /\s$/.test(textBefore)) {
                // Get cursor coordinates for positioning the menu
                const coords = view.coordsAtPos(from)

                extension.storage.isActive = true
                extension.storage.startPos = from + 1 // Position after "/"
                extension.storage.query = ''

                extension.options.onActivate({
                  x: coords.left,
                  y: coords.bottom + 4,
                })

                return false // Let the "/" be inserted
              }
            }

            return false
          },

          handleKeyDown(view, event) {
            if (!extension.storage.isActive) return false

            // Escape to cancel
            if (event.key === 'Escape') {
              event.preventDefault()
              extension.storage.isActive = false
              extension.options.onDeactivate()
              return true
            }

            // Enter to select (will be handled by palette)
            if (event.key === 'Enter') {
              event.preventDefault()
              extension.options.onSelect()
              return true
            }

            // Arrow keys for navigation (handled by palette)
            if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
              event.preventDefault()
              return true
            }

            return false
          },
        },
      }),
    ]
  },
})

/**
 * Helper to deactivate slash command mode and delete the query
 */
export function deleteSlashQuery(
  editor: { state: { selection: { $from: { parent: { textContent: string }; parentOffset: number; start: () => number } } }; view: { dispatch: (tr: unknown) => void }; chain: () => { deleteRange: (range: { from: number; to: number }) => { run: () => void } } },
  storage: SlashCommandStorage,
  triggerChar: string,
  onDeactivate: () => void
): boolean {
  if (!storage.isActive) return false

  const { $from } = editor.state.selection
  const textContent = $from.parent.textContent
  const slashIndex = textContent.lastIndexOf(triggerChar, $from.parentOffset)

  if (slashIndex !== -1) {
    const blockStart = $from.start()
    const deleteFrom = blockStart + slashIndex
    const deleteTo = blockStart + $from.parentOffset

    editor.chain().deleteRange({ from: deleteFrom, to: deleteTo }).run()

    storage.isActive = false
    storage.query = ''
    onDeactivate()

    return true
  }

  return false
}

export default SlashCommandExtension
