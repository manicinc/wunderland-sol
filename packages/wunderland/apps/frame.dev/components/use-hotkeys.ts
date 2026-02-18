/**
 * Custom hook for keyboard shortcuts in Quarry Codex
 * 
 * Supports single keys ('m', '/') and sequences ('g h', 'g g').
 * Automatically ignores events when user is typing in inputs.
 * 
 * @module use-hotkeys
 * 
 * @example
 * useHotkeys({
 *   'm': () => setMetaPanelOpen(true),
 *   '/': () => searchInputRef.current?.focus(),
 *   'g h': () => router.push('/quarry')
 * })
 */

import { useEffect } from 'react'

/**
 * Keyboard shortcut bindings
 * 
 * @param bindings - Map of key sequences to callbacks
 * @param bindings.key - Single key ('m') or sequence ('g h')
 * @param bindings.callback - Function to execute when key is pressed
 * 
 * @remarks
 * - Keys are case-insensitive
 * - Sequences are space-separated (e.g., 'g h')
 * - Automatically disabled in input/textarea/contentEditable elements
 * - Sequence buffer keeps last 2 keys only
 * 
 * @example
 * ```tsx
 * // Single key
 * useHotkeys({ 'm': () => toggleMeta() })
 * 
 * // Sequence (vim-style)
 * useHotkeys({ 'g h': () => goHome() })
 * 
 * // Multiple bindings
 * useHotkeys({
 *   'm': () => setMetaOpen(true),
 *   '/': () => focusSearch(),
 *   'g h': () => router.push('/'),
 *   'g g': () => scrollToTop()
 * })
 * ```
 */
export default function useHotkeys(bindings: Record<string, () => void>) {
  useEffect(() => {
    let sequence: string[] = []
    let timeoutId: NodeJS.Timeout | null = null

    const handler = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input/textarea
      const target = e.target as HTMLElement
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return
      }

      // Add key to sequence
      sequence.push(e.key.toLowerCase())

      // Check for matches
      const joined = sequence.join(' ')
      if (bindings[joined]) {
        e.preventDefault()
        bindings[joined]()
        sequence = []
        if (timeoutId) clearTimeout(timeoutId)
        return
      }

      // Keep only last 2 keys for sequences
      if (sequence.length > 2) {
        sequence.shift()
      }

      // Reset sequence after 1 second of inactivity
      if (timeoutId) clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        sequence = []
      }, 1000)
    }

    window.addEventListener('keydown', handler)
    return () => {
      window.removeEventListener('keydown', handler)
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [bindings])
}
