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
 * - `h` - Toggle highlights (opens bookmarks panel with highlights tab)
 * - `g` - Open group manager
 * - `,` - Open preferences/settings
 * - `?` - Toggle help/info panel
 */

import { useEffect } from 'react'
import { HOTKEYS } from '../constants'

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
  /** Handler for toggling highlights (default: 'h') */
  onToggleHighlights?: () => void
  /** Handler for opening group manager (default: 'g') */
  onOpenGroupManager?: () => void
  /** Handler for opening preferences (default: ',') */
  onOpenPreferences?: () => void
  /** Handler for toggling help panel (default: '?') */
  onToggleHelp?: () => void
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
 * function CodexViewer() {
 *   const [metaOpen, setMetaOpen] = useState(false)
 *   const searchRef = useRef<HTMLInputElement>(null)
 *   
 *   useCodexHotkeys({
 *     onToggleMeta: () => setMetaOpen(v => !v),
 *     onFocusSearch: () => searchRef.current?.focus(),
 *     onGoHome: () => router.push('/codex'),
 *   })
 *   
 *   return <div>...</div>
 * }
 * ```
 */
export function useCodexHotkeys(handlers: HotkeyHandlers): void {
  useEffect(() => {
    let sequenceBuffer = ''
    let sequenceTimeout: NodeJS.Timeout | null = null

    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore if user is typing in an input/textarea
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
      } else if (event.key === 'h' && handlers.onToggleHighlights) {
        event.preventDefault()
        handlers.onToggleHighlights()
        sequenceBuffer = ''
      } else if (event.key === 'g' && handlers.onOpenGroupManager) {
        event.preventDefault()
        handlers.onOpenGroupManager()
        sequenceBuffer = ''
      } else if (event.key === ',' && handlers.onOpenPreferences) {
        event.preventDefault()
        handlers.onOpenPreferences()
        sequenceBuffer = ''
      } else if (event.key === '?' && handlers.onToggleHelp) {
        event.preventDefault()
        handlers.onToggleHelp()
        sequenceBuffer = ''
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      if (sequenceTimeout) clearTimeout(sequenceTimeout)
    }
  }, [handlers])
}

