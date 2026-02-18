/**
 * AISuggestionExtension - Tiptap extension for inline AI ghost text suggestions
 * @module quarry/ui/tiptap/AISuggestionExtension
 *
 * Shows ghost text suggestions as you type, powered by LLM completions.
 * - Auto-triggers after configurable pause (default 500ms)
 * - Manual trigger with Ctrl+Space
 * - Tab to accept, Esc to dismiss
 * - Visual ghost text decoration
 */

import { Extension, Editor } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet, EditorView } from '@tiptap/pm/view'
import type { Node as PMNode } from '@tiptap/pm/model'
import { showAIStatus, showAIError } from '@/lib/ai/toast'

export interface AISuggestionOptions {
  /** Whether suggestions are enabled */
  enabled: boolean
  /** Debounce delay in ms before auto-triggering (300-1000) */
  triggerDelay: number
  /** Auto-trigger on pause (true) or only on Ctrl+Space (false) */
  autoTrigger: boolean
  /** Suggestion length preference */
  suggestionLength: 'short' | 'medium' | 'long'
  /** Function to generate a suggestion given context */
  getSuggestion: (context: SuggestionContext) => Promise<string | null>
  /** Called when suggestion is accepted */
  onAccept?: (text: string) => void
  /** Called when suggestion is dismissed */
  onDismiss?: () => void
  /** Called when suggestion status changes */
  onStatusChange?: (status: SuggestionStatus) => void
}

export interface SuggestionContext {
  /** Text before cursor (last ~500 chars) */
  textBefore: string
  /** Text after cursor (next ~100 chars) */
  textAfter: string
  /** Current paragraph text */
  currentParagraph: string
  /** Full document text (for broader context) */
  fullText: string
}

export type SuggestionStatus = 'idle' | 'loading' | 'showing' | 'error'

export interface AISuggestionStorage {
  /** Current suggestion text */
  suggestion: string | null
  /** Current status */
  status: SuggestionStatus
  /** Position where suggestion starts */
  suggestionPos: number
  /** Debounce timer */
  debounceTimer: ReturnType<typeof setTimeout> | null
  /** Abort controller for in-flight requests */
  abortController: AbortController | null
  /** Helper functions */
  dismissSuggestion: () => void
  scheduleAutoTrigger: (view: EditorView) => void
  triggerSuggestion: (editor: Editor) => Promise<void>
}

const aiSuggestionPluginKey = new PluginKey('aiSuggestion')

/**
 * Create ghost text decoration
 */
function createGhostDecoration(doc: PMNode, pos: number, text: string): DecorationSet {
  const widget = Decoration.widget(pos, () => {
    const span = document.createElement('span')
    span.className = 'ai-suggestion-ghost'
    span.textContent = text
    span.style.cssText = `
      color: #9ca3af;
      font-style: italic;
      opacity: 0.7;
      pointer-events: none;
      user-select: none;
    `
    return span
  }, { side: 1 })

  return DecorationSet.create(doc, [widget])
}

export const AISuggestionExtension = Extension.create<AISuggestionOptions, AISuggestionStorage>({
  name: 'aiSuggestion',

  addOptions() {
    return {
      enabled: false,
      triggerDelay: 500,
      autoTrigger: true,
      suggestionLength: 'medium',
      getSuggestion: async () => null,
      onAccept: undefined,
      onDismiss: undefined,
      onStatusChange: undefined,
    }
  },

  addStorage() {
    const storage: AISuggestionStorage = {
      suggestion: null,
      status: 'idle',
      suggestionPos: 0,
      debounceTimer: null,
      abortController: null,
      // These will be set in onCreate
      dismissSuggestion: () => {},
      scheduleAutoTrigger: () => {},
      triggerSuggestion: async () => {},
    }
    return storage
  },

  onCreate() {
    const extension = this

    // Dismiss suggestion helper
    this.storage.dismissSuggestion = () => {
      // Cancel any pending request
      if (extension.storage.abortController) {
        extension.storage.abortController.abort()
        extension.storage.abortController = null
      }

      // Clear timer
      if (extension.storage.debounceTimer) {
        clearTimeout(extension.storage.debounceTimer)
        extension.storage.debounceTimer = null
      }

      // Clear suggestion
      const hadSuggestion = extension.storage.suggestion !== null
      extension.storage.suggestion = null
      extension.storage.status = 'idle'

      if (hadSuggestion) {
        extension.options.onDismiss?.()
        extension.options.onStatusChange?.('idle')
      }
    }

    // Schedule auto-trigger helper
    this.storage.scheduleAutoTrigger = (view: EditorView) => {
      // Clear existing timer
      if (extension.storage.debounceTimer) {
        clearTimeout(extension.storage.debounceTimer)
      }

      // Schedule new trigger
      extension.storage.debounceTimer = setTimeout(() => {
        extension.storage.triggerSuggestion(extension.editor)
      }, extension.options.triggerDelay)
    }

    // Trigger suggestion helper
    this.storage.triggerSuggestion = async (editor: Editor) => {
      if (!extension.options.enabled) return

      // Cancel any in-flight request
      if (extension.storage.abortController) {
        extension.storage.abortController.abort()
      }

      // Get context from editor
      const { state } = editor.view
      const { selection, doc } = state
      const { $from } = selection

      // Get text before cursor (last 500 chars)
      const textBeforePos = Math.max(0, $from.pos - 500)
      const textBefore = doc.textBetween(textBeforePos, $from.pos, '\n')

      // Get text after cursor (next 100 chars)
      const textAfterEnd = Math.min(doc.content.size, $from.pos + 100)
      const textAfter = doc.textBetween($from.pos, textAfterEnd, '\n')

      // Get current paragraph
      const currentParagraph = $from.parent.textContent

      // Full document text
      const fullText = doc.textContent

      // Build context
      const context: SuggestionContext = {
        textBefore,
        textAfter,
        currentParagraph,
        fullText,
      }

      // Update status
      extension.storage.status = 'loading'
      extension.storage.suggestionPos = $from.pos
      extension.options.onStatusChange?.('loading')

      // Create abort controller
      extension.storage.abortController = new AbortController()

      try {
        const suggestion = await extension.options.getSuggestion(context)

        // Check if we were aborted
        if (extension.storage.abortController?.signal.aborted) {
          return
        }

        if (suggestion && suggestion.trim()) {
          extension.storage.suggestion = suggestion
          extension.storage.status = 'showing'
          extension.options.onStatusChange?.('showing')

          // Force editor view update
          if (editor.view) {
            editor.view.dispatch(editor.view.state.tr)
          }
        } else {
          extension.storage.status = 'idle'
          extension.options.onStatusChange?.('idle')
        }
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          console.error('AI suggestion error:', error)
          extension.storage.status = 'error'
          extension.options.onStatusChange?.('error')
          showAIError('Could not generate suggestion')
        }
      } finally {
        extension.storage.abortController = null
      }
    }
  },

  onDestroy() {
    // Cleanup timers and requests
    if (this.storage.debounceTimer) {
      clearTimeout(this.storage.debounceTimer)
    }
    if (this.storage.abortController) {
      this.storage.abortController.abort()
    }
  },

  addKeyboardShortcuts() {
    return {
      // Tab to accept suggestion
      Tab: ({ editor }) => {
        if (this.storage.suggestion && this.storage.status === 'showing') {
          const { suggestionPos, suggestion } = this.storage

          // Insert the suggestion text
          editor
            .chain()
            .focus()
            .insertContentAt(suggestionPos, suggestion)
            .run()

          // Clear suggestion
          this.storage.suggestion = null
          this.storage.status = 'idle'
          this.options.onAccept?.(suggestion)
          this.options.onStatusChange?.('idle')

          // Show subtle toast feedback
          showAIStatus('Suggestion accepted', { duration: 1500 })

          return true
        }
        return false
      },

      // Escape to dismiss
      Escape: () => {
        if (this.storage.suggestion || this.storage.status === 'loading') {
          this.storage.dismissSuggestion()
          return true
        }
        return false
      },

      // Ctrl+Space to manually trigger
      'Mod-Space': ({ editor }) => {
        if (!this.options.enabled) return false

        this.storage.triggerSuggestion(editor)
        return true
      },
    }
  },

  addProseMirrorPlugins() {
    const extension = this

    return [
      new Plugin({
        key: aiSuggestionPluginKey,

        state: {
          init() {
            return { decorations: DecorationSet.empty }
          },

          apply(tr, _prev) {
            // Update decorations based on suggestion state
            if (extension.storage.suggestion && extension.storage.status === 'showing') {
              return {
                decorations: createGhostDecoration(
                  tr.doc,
                  extension.storage.suggestionPos,
                  extension.storage.suggestion
                ),
              }
            }

            return { decorations: DecorationSet.empty }
          },
        },

        props: {
          decorations(state) {
            const pluginState = aiSuggestionPluginKey.getState(state)
            return pluginState?.decorations || DecorationSet.empty
          },

          handleTextInput(view, _from, _to, _text) {
            // Clear any existing suggestion on typing
            if (extension.storage.suggestion) {
              extension.storage.dismissSuggestion()
            }

            // Schedule auto-trigger if enabled
            if (extension.options.enabled && extension.options.autoTrigger) {
              extension.storage.scheduleAutoTrigger(view)
            }

            return false
          },

          handleKeyDown(_view, event) {
            // Any movement key clears suggestion
            if (extension.storage.suggestion) {
              const clearKeys = [
                'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
                'Home', 'End', 'PageUp', 'PageDown',
              ]
              if (clearKeys.includes(event.key)) {
                extension.storage.dismissSuggestion()
              }
            }

            return false
          },
        },
      }),
    ]
  },
})

export default AISuggestionExtension
