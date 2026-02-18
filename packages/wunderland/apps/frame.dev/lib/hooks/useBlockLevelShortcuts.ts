/**
 * useBlockLevelShortcuts Hook
 * @module lib/hooks/useBlockLevelShortcuts
 *
 * Hook for registering all block-level feature keyboard shortcuts.
 * Integrates query palette, tag management, backlinks, and supertags.
 */

import { useMemo, useCallback } from 'react'
import { useKeyboardShortcuts, type KeyboardShortcut } from './useKeyboardShortcuts'

/**
 * Block-level shortcut configuration
 */
export interface BlockLevelShortcutConfig {
  openQueryPalette?: string
  addTag?: string
  openBacklinks?: string
  quickSearch?: string
  addSupertag?: string
  toggleSidebar?: string
  focusSearch?: string
  nextResult?: string
  prevResult?: string
}

/**
 * Block-level shortcut handlers
 */
export interface BlockLevelShortcutHandlers {
  onOpenQueryPalette?: () => void
  onAddTag?: () => void
  onOpenBacklinks?: () => void
  onQuickSearch?: () => void
  onAddSupertag?: () => void
  onToggleSidebar?: () => void
  onFocusSearch?: () => void
  onNextResult?: () => void
  onPrevResult?: () => void
}

/**
 * Default shortcut configuration
 */
export const DEFAULT_BLOCK_SHORTCUTS: Required<BlockLevelShortcutConfig> = {
  openQueryPalette: 'Cmd+P',
  addTag: 'Cmd+T',
  openBacklinks: 'Cmd+B',
  quickSearch: 'Cmd+K',
  addSupertag: 'Cmd+Shift+T',
  toggleSidebar: 'Cmd+\\',
  focusSearch: '/',
  nextResult: 'Cmd+J',
  prevResult: 'Cmd+Shift+J',
}

/**
 * Load shortcut configuration from localStorage
 */
function loadShortcuts(): BlockLevelShortcutConfig {
  if (typeof window === 'undefined') return DEFAULT_BLOCK_SHORTCUTS

  try {
    const saved = localStorage.getItem('codex_block_settings')
    if (saved) {
      const data = JSON.parse(saved)
      return { ...DEFAULT_BLOCK_SHORTCUTS, ...data.shortcuts }
    }
  } catch (error) {
    console.warn('Failed to load shortcuts:', error)
  }

  return DEFAULT_BLOCK_SHORTCUTS
}

/**
 * Hook for block-level keyboard shortcuts
 *
 * @example
 * ```tsx
 * useBlockLevelShortcuts({
 *   onOpenQueryPalette: () => setQueryPaletteOpen(true),
 *   onAddTag: () => openTagInput(),
 *   onOpenBacklinks: () => setBacklinksOpen(true),
 * })
 * ```
 */
export function useBlockLevelShortcuts(
  handlers: BlockLevelShortcutHandlers,
  customConfig?: Partial<BlockLevelShortcutConfig>,
  enabled: boolean = true
): void {
  const config = useMemo(() => ({
    ...loadShortcuts(),
    ...customConfig,
  }), [customConfig])

  const shortcuts = useMemo((): KeyboardShortcut[] => {
    const result: KeyboardShortcut[] = []

    if (handlers.onOpenQueryPalette && config.openQueryPalette) {
      result.push({
        key: config.openQueryPalette,
        handler: handlers.onOpenQueryPalette,
        description: 'Open query palette',
      })
    }

    if (handlers.onAddTag && config.addTag) {
      result.push({
        key: config.addTag,
        handler: handlers.onAddTag,
        description: 'Add tag to block',
      })
    }

    if (handlers.onOpenBacklinks && config.openBacklinks) {
      result.push({
        key: config.openBacklinks,
        handler: handlers.onOpenBacklinks,
        description: 'Open backlinks panel',
      })
    }

    if (handlers.onQuickSearch && config.quickSearch) {
      result.push({
        key: config.quickSearch,
        handler: handlers.onQuickSearch,
        description: 'Quick search',
      })
    }

    if (handlers.onAddSupertag && config.addSupertag) {
      result.push({
        key: config.addSupertag,
        handler: handlers.onAddSupertag,
        description: 'Add supertag to block',
      })
    }

    if (handlers.onToggleSidebar && config.toggleSidebar) {
      result.push({
        key: config.toggleSidebar,
        handler: handlers.onToggleSidebar,
        description: 'Toggle sidebar',
      })
    }

    if (handlers.onFocusSearch && config.focusSearch) {
      result.push({
        key: config.focusSearch,
        handler: handlers.onFocusSearch,
        allowInInputs: false,
        description: 'Focus search',
      })
    }

    if (handlers.onNextResult && config.nextResult) {
      result.push({
        key: config.nextResult,
        handler: handlers.onNextResult,
        description: 'Next search result',
      })
    }

    if (handlers.onPrevResult && config.prevResult) {
      result.push({
        key: config.prevResult,
        handler: handlers.onPrevResult,
        description: 'Previous search result',
      })
    }

    return result
  }, [handlers, config])

  useKeyboardShortcuts(shortcuts, enabled)
}

/**
 * Get all registered shortcuts with their descriptions
 * Useful for displaying in help dialogs or settings
 */
export function getBlockLevelShortcutsList(
  config: BlockLevelShortcutConfig = DEFAULT_BLOCK_SHORTCUTS
): Array<{ key: string; description: string }> {
  return [
    { key: config.openQueryPalette || '', description: 'Open query palette' },
    { key: config.addTag || '', description: 'Add tag to block' },
    { key: config.openBacklinks || '', description: 'Open backlinks panel' },
    { key: config.quickSearch || '', description: 'Quick search' },
    { key: config.addSupertag || '', description: 'Add supertag to block' },
    { key: config.toggleSidebar || '', description: 'Toggle sidebar' },
    { key: config.focusSearch || '', description: 'Focus search (when not in input)' },
    { key: config.nextResult || '', description: 'Next search result' },
    { key: config.prevResult || '', description: 'Previous search result' },
  ].filter(s => s.key)
}

export default useBlockLevelShortcuts
