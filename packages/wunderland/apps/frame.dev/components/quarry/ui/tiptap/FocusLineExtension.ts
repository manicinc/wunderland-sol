/**
 * FocusLineExtension - Tiptap extension for iA Writer-style focus highlighting
 * @module quarry/ui/tiptap/FocusLineExtension
 *
 * Adds CSS class to the current block (paragraph, heading, etc.) containing
 * the cursor, allowing other blocks to be dimmed via CSS.
 */

import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'

export interface FocusLineOptions {
  /** CSS class to add to focused block */
  focusClass?: string
  /** CSS class to add to container when focus mode is active */
  activeClass?: string
  /** Whether focus mode is enabled */
  enabled?: boolean
  /** Focus mode: paragraph or sentence */
  mode?: 'paragraph' | 'sentence'
}

export interface FocusLineStorage {
  /** Whether focus mode is enabled */
  enabled: boolean
  /** Current focus mode */
  mode: 'paragraph' | 'sentence'
}

// Declare commands for TypeScript
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    focusLine: {
      toggleFocusMode: () => ReturnType
      setFocusMode: (mode: 'paragraph' | 'sentence') => ReturnType
      enableFocusMode: () => ReturnType
      disableFocusMode: () => ReturnType
    }
  }
}

const focusLinePluginKey = new PluginKey('focusLine')

export const FocusLineExtension = Extension.create<FocusLineOptions, FocusLineStorage>({
  name: 'focusLine',

  addOptions() {
    return {
      focusClass: 'is-focused-block',
      activeClass: 'focus-mode-active',
      enabled: true,
      mode: 'paragraph',
    }
  },

  addStorage() {
    return {
      enabled: this.options.enabled ?? true,
      mode: this.options.mode ?? 'paragraph',
    }
  },

  addCommands() {
    return {
      toggleFocusMode:
        () =>
        ({ editor }) => {
          this.storage.enabled = !this.storage.enabled

          // Update the view to trigger re-rendering
          const { view } = editor
          if (view.dom.parentElement) {
            if (this.storage.enabled) {
              view.dom.parentElement.classList.add(this.options.activeClass!)
            } else {
              view.dom.parentElement.classList.remove(this.options.activeClass!)
              // Remove focus classes from all blocks
              view.dom.querySelectorAll(`.${this.options.focusClass}`).forEach((el) => {
                el.classList.remove(this.options.focusClass!)
              })
            }
          }

          return true
        },

      setFocusMode:
        (mode: 'paragraph' | 'sentence') =>
        () => {
          this.storage.mode = mode
          return true
        },

      enableFocusMode:
        () =>
        ({ editor }) => {
          this.storage.enabled = true
          const { view } = editor
          if (view.dom.parentElement) {
            view.dom.parentElement.classList.add(this.options.activeClass!)
          }
          return true
        },

      disableFocusMode:
        () =>
        ({ editor }) => {
          this.storage.enabled = false
          const { view } = editor
          if (view.dom.parentElement) {
            view.dom.parentElement.classList.remove(this.options.activeClass!)
            view.dom.querySelectorAll(`.${this.options.focusClass}`).forEach((el) => {
              el.classList.remove(this.options.focusClass!)
            })
          }
          return true
        },
    }
  },

  addProseMirrorPlugins() {
    const extension = this

    return [
      new Plugin({
        key: focusLinePluginKey,

        view() {
          return {
            update: (view) => {
              if (!extension.storage.enabled) return

              const { selection } = view.state
              const { $anchor } = selection

              // Get the current block node containing the cursor
              const blockDepth = $anchor.depth
              if (blockDepth < 1) return

              // Remove previous focus classes
              view.dom.querySelectorAll(`.${extension.options.focusClass}`).forEach((el) => {
                el.classList.remove(extension.options.focusClass!)
              })

              // Find the block-level node
              const targetPos = $anchor.before(1) // Top-level block position

              // For paragraph mode, highlight the immediate block
              if (extension.storage.mode === 'paragraph') {
                const domNode = view.nodeDOM(targetPos)

                if (domNode instanceof HTMLElement) {
                  domNode.classList.add(extension.options.focusClass!)
                }
              } else {
                // For sentence mode, we need to find the sentence boundaries
                // and apply a more granular highlight (this is harder in ProseMirror)
                // For now, fall back to paragraph mode
                const domNode = view.nodeDOM(targetPos)

                if (domNode instanceof HTMLElement) {
                  domNode.classList.add(extension.options.focusClass!)
                }
              }
            },
          }
        },
      }),
    ]
  },

  // Add global CSS for focus mode
  addGlobalAttributes() {
    return []
  },

  onCreate() {
    // Add initial active class if enabled (moved from onBeforeCreate to avoid view.dom access error)
    if (this.options.enabled && this.editor?.view?.dom?.parentElement) {
      this.editor.view.dom.parentElement.classList.add(this.options.activeClass!)
    }
  },

  onDestroy() {
    // Clean up classes
    if (this.editor?.view?.dom?.parentElement) {
      this.editor.view.dom.parentElement.classList.remove(this.options.activeClass!)
    }
  },
})

/**
 * CSS styles for focus mode
 * Add these to your global styles or component
 */
export const focusLineStyles = `
  /* Focus mode active - dim non-focused blocks */
  .focus-mode-active .ProseMirror > *:not(.is-focused-block) {
    opacity: 0.35;
    transition: opacity 200ms ease-out;
  }

  .focus-mode-active .ProseMirror > .is-focused-block {
    opacity: 1;
    transition: opacity 200ms ease-out;
  }

  /* Hover to reveal dimmed content */
  .focus-mode-active .ProseMirror > *:not(.is-focused-block):hover {
    opacity: 0.7;
  }
`

export default FocusLineExtension
