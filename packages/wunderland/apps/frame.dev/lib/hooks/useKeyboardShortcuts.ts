/**
 * useKeyboardShortcuts Hook
 * @module lib/hooks/useKeyboardShortcuts
 *
 * Generic hook for handling keyboard shortcuts with support for
 * modifier keys, multiple shortcuts, and custom keybindings.
 */

import { useEffect, useCallback, useRef } from 'react'

/**
 * Keyboard shortcut configuration
 */
export interface KeyboardShortcut {
  /** Shortcut string (e.g., "Cmd+K", "Ctrl+Shift+P") */
  key: string
  /** Handler function */
  handler: (e: KeyboardEvent) => void
  /** Whether to prevent default behavior */
  preventDefault?: boolean
  /** Whether to stop propagation */
  stopPropagation?: boolean
  /** Only trigger when specific element types are focused */
  allowInInputs?: boolean
  /** Optional description for UI display */
  description?: string
}

/**
 * Parse a shortcut string into its components
 */
function parseShortcut(shortcut: string): {
  metaKey: boolean
  ctrlKey: boolean
  altKey: boolean
  shiftKey: boolean
  key: string
} {
  const parts = shortcut.split('+').map(p => p.trim().toLowerCase())

  return {
    metaKey: parts.includes('cmd') || parts.includes('meta'),
    ctrlKey: parts.includes('ctrl') || parts.includes('control'),
    altKey: parts.includes('alt') || parts.includes('option'),
    shiftKey: parts.includes('shift'),
    key: parts.find(p =>
      !['cmd', 'meta', 'ctrl', 'control', 'alt', 'option', 'shift'].includes(p)
    ) || '',
  }
}

/**
 * Check if a keyboard event matches a shortcut
 */
function matchesShortcut(
  e: KeyboardEvent,
  shortcut: ReturnType<typeof parseShortcut>
): boolean {
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0

  // On Mac, Cmd is metaKey. On Windows/Linux, treat Cmd as Ctrl
  const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey

  const expectedModifiers =
    (shortcut.metaKey ? cmdOrCtrl : !cmdOrCtrl || shortcut.ctrlKey) &&
    (shortcut.ctrlKey ? e.ctrlKey : !e.ctrlKey || shortcut.metaKey) &&
    shortcut.altKey === e.altKey &&
    shortcut.shiftKey === e.shiftKey

  const keyMatches = e.key.toLowerCase() === shortcut.key

  return expectedModifiers && keyMatches
}

/**
 * Check if the event target is an input element
 */
function isInputElement(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false

  const tagName = target.tagName.toLowerCase()
  if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') {
    return true
  }

  return target.isContentEditable
}

/**
 * Hook for registering keyboard shortcuts
 *
 * @example
 * ```tsx
 * useKeyboardShortcuts([
 *   { key: 'Cmd+K', handler: () => openSearch() },
 *   { key: 'Cmd+Shift+P', handler: () => openCommandPalette() },
 * ])
 * ```
 */
export function useKeyboardShortcuts(
  shortcuts: KeyboardShortcut[],
  enabled: boolean = true
): void {
  const shortcutsRef = useRef(shortcuts)
  shortcutsRef.current = shortcuts

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Skip if disabled
    if (!enabled) return

    for (const shortcut of shortcutsRef.current) {
      const parsed = parseShortcut(shortcut.key)

      if (matchesShortcut(e, parsed)) {
        // Check if we should allow in inputs
        if (!shortcut.allowInInputs && isInputElement(e.target)) {
          continue
        }

        // Handle the shortcut
        if (shortcut.preventDefault !== false) {
          e.preventDefault()
        }
        if (shortcut.stopPropagation) {
          e.stopPropagation()
        }

        shortcut.handler(e)
        return
      }
    }
  }, [enabled])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
}

/**
 * Format a shortcut string for display
 * Converts "Cmd+K" to "⌘K" on Mac or "Ctrl+K" on Windows
 */
export function formatShortcut(shortcut: string): string {
  const isMac = typeof navigator !== 'undefined' &&
    navigator.platform.toUpperCase().indexOf('MAC') >= 0

  if (isMac) {
    return shortcut
      .replace(/Cmd\+/gi, '⌘')
      .replace(/Ctrl\+/gi, '⌃')
      .replace(/Alt\+/gi, '⌥')
      .replace(/Shift\+/gi, '⇧')
  } else {
    return shortcut
      .replace(/Cmd\+/gi, 'Ctrl+')
      .replace(/Meta\+/gi, 'Win+')
      .replace(/Option\+/gi, 'Alt+')
  }
}

export default useKeyboardShortcuts
