/**
 * Hook for keyboard shortcuts in Codex viewer
 * @module codex/hooks/useCodexHotkeys
 *
 * @remarks
 * Keyboard shortcuts:
 * - `m` - Toggle metadata panel
 * - `/` - Focus search input
 * - `g h` - Navigate home
 * - `s` - Toggle sidebar (mobile)
 * - `b` - Toggle bookmarks panel
 * - `,` - Open preferences/settings
 * - `?` - Toggle help/info panel
 * - `e` - Toggle editor mode
 * - `k` - Toggle keyboard shortcuts modal
 * - `t` - Open today's daily note
 * - `d` - Toggle drawing mode (handwriting canvas)
 * - `Cmd+K` / `Ctrl+K` - Toggle AI Assistant
 * - `Cmd+N` / `Ctrl+N` - Create new blank strand
 * - `Cmd+Shift+N` / `Ctrl+Shift+N` - Open strand wizard
 * - `Cmd+D` / `Ctrl+D` - Quick toggle drawing mode
 * - `Cmd+E` / `Ctrl+E` - Export canvas as strand
 * - `Cmd+Shift+F` / `Ctrl+Shift+F` - Open query builder
 * - `Cmd+Shift+R` / `Ctrl+Shift+R` - Open research popover
 */

import { useEffect } from 'react'
import { HOTKEYS } from '../constants'
import type { CommandOptions } from '@/lib/plugins/types'

interface HotkeyHandlers {
  /** Handler for toggling metadata panel (default: 'm') */
  onToggleMeta?: () => void
  /** Handler for focusing search input (default: '/') */
  onFocusSearch?: () => void
  /** Handler for navigating home (default: 'g h') */
  onGoHome?: () => void
  /** Handler for toggling sidebar (default: 's') */
  onToggleSidebar?: () => void
  /** Handler for toggling bookmarks panel (default: 'b') */
  onToggleBookmarks?: () => void
  /** Handler for opening preferences (default: ',') */
  onOpenPreferences?: () => void
  /** Handler for toggling help panel (default: '?') */
  onToggleHelp?: () => void
  /** Handler for toggling editor (default: 'e') */
  onToggleEdit?: () => void
  /** Handler for toggling AI Assistant (default: 'Ctrl+K') */
  onToggleQA?: () => void
  /** Handler for toggling keyboard shortcuts modal (default: 'k') */
  onToggleShortcuts?: () => void
  /** Handler for showing keyboard help (default: '?') */
  onShowHelp?: () => void
  /** Handler for creating new blank strand (Cmd+N) */
  onNewBlank?: () => void
  /** Handler for opening strand wizard (Cmd+Shift+N) */
  onNewWizard?: () => void
  /** Handler for exporting canvas as strand (Cmd+E) */
  onExportCanvas?: () => void
  /** Handler for opening query builder (Cmd+Shift+F) */
  onOpenQueryBuilder?: () => void
  /** Handler for opening research popover (Shift+R) */
  onOpenResearch?: () => void
  /** Handler for opening today's daily note (default: 't') */
  onOpenTodayNote?: () => void
  /** Handler for toggling drawing mode (default: 'd' or Cmd+D) */
  onToggleDrawingMode?: () => void
}

/**
 * Register keyboard shortcuts for Codex viewer
 * 
 * @param handlers - Map of hotkey handlers
 * 
 * @remarks
 * - Prevents default browser behavior for registered keys
 * - Supports multi-key sequences (e.g., 'g h')
 * - Automatically cleans up on unmount
 * 
 * @example
 * ```tsx
 * // Basic usage
 * function QuarryViewer() {
 *   const [metaOpen, setMetaOpen] = useState(false)
 *   const searchRef = useRef<HTMLInputElement>(null)
 *
 *   useCodexHotkeys({
 *     onToggleMeta: () => setMetaOpen(v => !v),
 *     onFocusSearch: () => searchRef.current?.focus(),
 *     onGoHome: () => router.push('/quarry'),
 *   })
 *
 *   return <div>...</div>
 * }
 * ```
 *
 * @example
 * ```tsx
 * // With canvas export integration
 * function CodexWithCanvas() {
 *   const router = useRouter()
 *   const [exportOpen, setExportOpen] = useState(false)
 *   const { canvasHasContent } = useCanvasExport({ editor })
 *
 *   useCodexHotkeys({
 *     // Cmd+N: New blank strand
 *     onNewBlank: () => router.push('/quarry/new?mode=blank'),
 *     // Cmd+Shift+N: Open wizard
 *     onNewWizard: () => router.push('/quarry/new'),
 *     // Cmd+E: Export canvas
 *     onExportCanvas: () => {
 *       if (canvasHasContent) setExportOpen(true)
 *     },
 *   })
 *
 *   return <CanvasExportModal isOpen={exportOpen} ... />
 * }
 * ```
 */
export function useCodexHotkeys(
  handlers: HotkeyHandlers,
  pluginCommands: Array<{ pluginId: string; options: CommandOptions }> = []
): void {
  useEffect(() => {
    let sequenceBuffer = ''
    let sequenceTimeout: NodeJS.Timeout | null = null

    // Helper function to match plugin shortcuts
    const matchShortcut = (
      event: KeyboardEvent,
      shortcut: string,
      isMac: boolean
    ): boolean => {
      const parts = shortcut.toLowerCase().split('+')
      let needsMod = false
      let needsShift = false
      let needsAlt = false
      let key = ''

      for (const part of parts) {
        if (part === 'mod' || part === 'cmd' || part === 'ctrl') {
          needsMod = true
        } else if (part === 'shift') {
          needsShift = true
        } else if (part === 'alt' || part === 'option') {
          needsAlt = true
        } else {
          key = part
        }
      }

      const cmdOrCtrl = isMac ? event.metaKey : event.ctrlKey

      return (
        event.key.toLowerCase() === key &&
        (!needsMod || cmdOrCtrl) &&
        (!needsShift || event.shiftKey) &&
        (!needsAlt || event.altKey)
      )
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
      const cmdOrCtrl = isMac ? event.metaKey : event.ctrlKey

      // Handle Cmd/Ctrl shortcuts that work everywhere (even in inputs)
      if (cmdOrCtrl) {
        // Cmd+N: New blank strand
        if (event.key === 'n' && !event.shiftKey && handlers.onNewBlank) {
          event.preventDefault()
          handlers.onNewBlank()
          return
        }
        // Cmd+Shift+N: Open strand wizard
        if (event.key === 'N' && event.shiftKey && handlers.onNewWizard) {
          event.preventDefault()
          handlers.onNewWizard()
          return
        }
        // Cmd+E: Export canvas
        if (event.key === 'e' && !event.shiftKey && handlers.onExportCanvas) {
          event.preventDefault()
          handlers.onExportCanvas()
          return
        }
        // Cmd+Shift+F: Open query builder
        if (event.key === 'F' && event.shiftKey && handlers.onOpenQueryBuilder) {
          event.preventDefault()
          handlers.onOpenQueryBuilder()
          return
        }
        // Cmd+Shift+R: Open research popover
        if (event.key === 'R' && event.shiftKey && handlers.onOpenResearch) {
          event.preventDefault()
          handlers.onOpenResearch()
          return
        }
        // Ctrl+K: Toggle AI panel
        if (event.key === 'k' && handlers.onToggleQA) {
          event.preventDefault()
          handlers.onToggleQA()
          return
        }
        // Cmd+D: Quick toggle drawing mode
        if (event.key === 'd' && !event.shiftKey && handlers.onToggleDrawingMode) {
          event.preventDefault()
          handlers.onToggleDrawingMode()
          return
        }
      }

      // Ignore if user is typing in an input/textarea (for non-Cmd shortcuts)
      const target = event.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        // Exception: allow '/' to focus search even from inputs
        if (event.key === '/' && handlers.onFocusSearch) {
          event.preventDefault()
          handlers.onFocusSearch()
        }
        return
      }

      // Build sequence buffer for multi-key shortcuts
      sequenceBuffer += event.key
      
      // Clear sequence after 1 second of inactivity
      if (sequenceTimeout) clearTimeout(sequenceTimeout)
      sequenceTimeout = setTimeout(() => {
        sequenceBuffer = ''
      }, 1000)

      // Check for matches
      if (sequenceBuffer === HOTKEYS.TOGGLE_META && handlers.onToggleMeta) {
        event.preventDefault()
        handlers.onToggleMeta()
        sequenceBuffer = ''
      } else if (sequenceBuffer === HOTKEYS.FOCUS_SEARCH && handlers.onFocusSearch) {
        event.preventDefault()
        handlers.onFocusSearch()
        sequenceBuffer = ''
      } else if (sequenceBuffer === HOTKEYS.GO_HOME && handlers.onGoHome) {
        event.preventDefault()
        handlers.onGoHome()
        sequenceBuffer = ''
      } else if (sequenceBuffer === HOTKEYS.TOGGLE_SIDEBAR && handlers.onToggleSidebar) {
        event.preventDefault()
        handlers.onToggleSidebar()
        sequenceBuffer = ''
      } else if (event.key === 'b' && handlers.onToggleBookmarks) {
        event.preventDefault()
        handlers.onToggleBookmarks()
        sequenceBuffer = ''
      } else if (event.key === ',' && handlers.onOpenPreferences) {
        event.preventDefault()
        handlers.onOpenPreferences()
        sequenceBuffer = ''
      } else if (event.key === '?' && handlers.onToggleHelp) {
        event.preventDefault()
        handlers.onToggleHelp()
        sequenceBuffer = ''
      } else if (event.key === 'e' && !cmdOrCtrl && handlers.onToggleEdit) {
        event.preventDefault()
        handlers.onToggleEdit()
        sequenceBuffer = ''
      } else if (!cmdOrCtrl && event.key === 'k' && handlers.onToggleShortcuts) {
        event.preventDefault()
        handlers.onToggleShortcuts()
        sequenceBuffer = ''
      } else if (event.key === 't' && handlers.onOpenTodayNote) {
        event.preventDefault()
        handlers.onOpenTodayNote()
        sequenceBuffer = ''
      } else if (event.key === 'd' && !cmdOrCtrl && handlers.onToggleDrawingMode) {
        event.preventDefault()
        handlers.onToggleDrawingMode()
        sequenceBuffer = ''
      }

      // Quarry Plugin System: Check plugin commands (after built-ins, so built-ins win)
      for (const { pluginId, options } of pluginCommands) {
        if (options.shortcut && matchShortcut(event, options.shortcut, isMac)) {
          event.preventDefault()
          try {
            options.callback()
          } catch (error) {
            console.error(`[Plugin:${pluginId}] Command error:`, error)
          }
          sequenceBuffer = ''
          return
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      if (sequenceTimeout) clearTimeout(sequenceTimeout)
    }
  }, [handlers, pluginCommands])
}
