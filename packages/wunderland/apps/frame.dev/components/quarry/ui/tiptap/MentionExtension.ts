/**
 * MentionExtension - Tiptap extension for "@" mention triggering
 * @module quarry/ui/tiptap/MentionExtension
 *
 * Detects "@" typed and opens mention autocomplete.
 * Tracks characters typed after "@" as search query.
 * Renders mention nodes as styled chips when resolved.
 */

import { Extension, Mark, Node } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

// ============================================================================
// MENTION TRIGGER EXTENSION
// ============================================================================

export interface MentionTriggerOptions {
  /** Called when mention is activated (@ detected) */
  onActivate: (coords: { x: number; y: number }, query: string) => void
  /** Called when mention is deactivated */
  onDeactivate: () => void
  /** Called when the query (text after "@") changes */
  onQueryChange: (query: string) => void
  /** Character to trigger the menu (default: "@") */
  triggerChar?: string
  /** Minimum characters before triggering autocomplete */
  minQueryLength?: number
}

export interface MentionTriggerStorage {
  /** Whether mention mode is active */
  isActive: boolean
  /** Current query string (text after "@") */
  query: string
  /** Position where "@" was typed */
  startPos: number
}

const mentionTriggerPluginKey = new PluginKey('mentionTrigger')

export const MentionTriggerExtension = Extension.create<MentionTriggerOptions, MentionTriggerStorage>({
  name: 'mentionTrigger',

  addOptions() {
    return {
      onActivate: () => {},
      onDeactivate: () => {},
      onQueryChange: () => {},
      triggerChar: '@',
      minQueryLength: 0,
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
        key: mentionTriggerPluginKey,

        state: {
          init: () => ({
            isActive: false,
            query: '',
            startPos: 0,
          }),

          apply(tr, prev, oldState, newState) {
            // If selection changed or document changed, check mention state
            if (!tr.docChanged && !tr.selectionSet) {
              return prev
            }

            const { selection } = newState
            const { $from } = selection

            // If mention mode is active
            if (prev.isActive) {
              // Check if cursor moved outside the mention area
              if ($from.pos < prev.startPos) {
                extension.storage.isActive = false
                extension.options.onDeactivate()
                return { ...prev, isActive: false, query: '' }
              }

              // Extract query (text between "@" and cursor)
              const fullText = $from.parent.textContent
              const triggerIndex = fullText.lastIndexOf(extension.options.triggerChar!, $from.parentOffset)

              if (triggerIndex === -1) {
                // @ was deleted
                extension.storage.isActive = false
                extension.options.onDeactivate()
                return { ...prev, isActive: false, query: '' }
              }

              const query = fullText.slice(triggerIndex + 1, $from.parentOffset)

              // Check if there's a space - ends the mention
              if (query.includes(' ')) {
                extension.storage.isActive = false
                extension.options.onDeactivate()
                return { ...prev, isActive: false, query: '' }
              }

              // Update query
              if (query !== prev.query) {
                extension.storage.query = query
                extension.options.onQueryChange(query)
              }

              return { ...prev, query }
            }

            // Check for new @ trigger
            const { triggerChar = '@' } = extension.options

            // Look at the character just typed
            if (tr.docChanged) {
              const inserted = tr.steps.some(step => {
                const stepMap = step.getMap()
                let hasInsert = false
                stepMap.forEach((oldStart, oldEnd, newStart, newEnd) => {
                  if (newEnd > newStart) hasInsert = true
                })
                return hasInsert
              })

              if (inserted) {
                const text = $from.parent.textContent
                const offset = $from.parentOffset

                // Check if @ was just typed
                if (text.charAt(offset - 1) === triggerChar) {
                  // Check if @ is at line start or after whitespace
                  const charBefore = offset > 1 ? text.charAt(offset - 2) : ''
                  const validTrigger = charBefore === '' || /\s/.test(charBefore)

                  if (validTrigger) {
                    extension.storage.isActive = true
                    extension.storage.query = ''
                    extension.storage.startPos = $from.pos

                    // Get coordinates for dropdown positioning
                    return { isActive: true, query: '', startPos: $from.pos }
                  }
                }
              }
            }

            return prev
          },
        },

        view(editorView) {
          return {
            update(view, prevState) {
              const state = mentionTriggerPluginKey.getState(view.state) as MentionTriggerStorage
              const prevPluginState = mentionTriggerPluginKey.getState(prevState) as MentionTriggerStorage | undefined

              // Just activated
              if (state.isActive && !prevPluginState?.isActive) {
                const { selection } = view.state
                const coords = view.coordsAtPos(selection.$from.pos)
                extension.options.onActivate(
                  { x: coords.left, y: coords.bottom + 8 },
                  state.query
                )
              }
            },
          }
        },
      }),
    ]
  },

  addKeyboardShortcuts() {
    return {
      // Escape to cancel mention mode
      Escape: () => {
        if (this.storage.isActive) {
          this.storage.isActive = false
          this.options.onDeactivate()
          return true
        }
        return false
      },
    }
  },
})

// ============================================================================
// MENTION NODE - For rendering resolved mentions as chips
// ============================================================================

export interface MentionNodeOptions {
  /** HTML tag for the mention (default: span) */
  HTMLAttributes: Record<string, string>
  /** Render function for custom mention display */
  renderLabel?: (node: { attrs: MentionAttributes }) => string
  /** Click handler for mention chips */
  onClick?: (entityId: string, entityType: string) => void
}

export interface MentionAttributes {
  id: string
  label: string
  type: string
  color?: string
}

export const MentionNode = Node.create<MentionNodeOptions>({
  name: 'mention',
  group: 'inline',
  inline: true,
  selectable: true,
  atom: true,

  addOptions() {
    return {
      HTMLAttributes: {
        class: 'mention-chip',
      },
      renderLabel: ({ attrs }) => `@${attrs.label}`,
      onClick: undefined,
    }
  },

  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: element => element.getAttribute('data-id'),
        renderHTML: attributes => ({ 'data-id': attributes.id }),
      },
      label: {
        default: null,
        parseHTML: element => element.getAttribute('data-label'),
        renderHTML: attributes => ({ 'data-label': attributes.label }),
      },
      type: {
        default: 'unknown',
        parseHTML: element => element.getAttribute('data-type'),
        renderHTML: attributes => ({ 'data-type': attributes.type }),
      },
      color: {
        default: '#3b82f6',
        parseHTML: element => element.getAttribute('data-color'),
        renderHTML: attributes => ({ 'data-color': attributes.color }),
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-mention]',
      },
    ]
  },

  renderHTML({ node, HTMLAttributes }) {
    const label = this.options.renderLabel?.({ attrs: node.attrs as MentionAttributes }) ?? `@${node.attrs.label}`
    
    return [
      'span',
      {
        ...this.options.HTMLAttributes,
        ...HTMLAttributes,
        'data-mention': '',
        style: `
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 2px 8px;
          margin: 0 2px;
          border-radius: 12px;
          background-color: ${node.attrs.color}20;
          color: ${node.attrs.color};
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          user-select: none;
        `.replace(/\s+/g, ' ').trim(),
      },
      label,
    ]
  },

  addNodeView() {
    return ({ node, editor }) => {
      const dom = document.createElement('span')
      dom.className = 'mention-chip'
      dom.setAttribute('data-mention', '')
      dom.setAttribute('data-id', node.attrs.id)
      dom.setAttribute('data-type', node.attrs.type)
      dom.setAttribute('data-label', node.attrs.label)
      
      const color = node.attrs.color || '#3b82f6'
      dom.style.cssText = `
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 2px 8px;
        margin: 0 2px;
        border-radius: 12px;
        background-color: ${color}20;
        color: ${color};
        font-size: 0.875rem;
        font-weight: 500;
        cursor: pointer;
        user-select: none;
      `.replace(/\s+/g, ' ').trim()

      // Icon based on type
      const iconSvg = getMentionIcon(node.attrs.type)
      if (iconSvg) {
        const iconSpan = document.createElement('span')
        iconSpan.innerHTML = iconSvg
        iconSpan.style.cssText = 'display: inline-flex; width: 14px; height: 14px;'
        dom.appendChild(iconSpan)
      }

      const label = document.createElement('span')
      label.textContent = node.attrs.label
      dom.appendChild(label)

      // Click handler
      if (this.options.onClick) {
        dom.addEventListener('click', () => {
          this.options.onClick?.(node.attrs.id, node.attrs.type)
        })
      }

      return {
        dom,
        update: (updatedNode) => {
          if (updatedNode.type !== node.type) return false
          label.textContent = updatedNode.attrs.label
          return true
        },
      }
    }
  },
})

// Helper function to get SVG icon based on mention type
function getMentionIcon(type: string): string {
  const icons: Record<string, string> = {
    person: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/></svg>',
    place: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>',
    date: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>',
    event: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/><path d="m9 16 2 2 4-4"/></svg>',
    strand: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>',
    project: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>',
    tag: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z"/><path d="M7 7h.01"/></svg>',
  }
  return icons[type] || icons.tag
}

// ============================================================================
// HELPER: Delete mention query (similar to slash command)
// ============================================================================

export function deleteMentionQuery(editor: any): void {
  const state = mentionTriggerPluginKey.getState(editor.state) as MentionTriggerStorage | undefined
  if (state?.isActive) {
    const { from } = editor.state.selection
    const deleteFrom = state.startPos - 1 // Include the @
    editor.chain().focus().deleteRange({ from: deleteFrom, to: from }).run()
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export { mentionTriggerPluginKey }

