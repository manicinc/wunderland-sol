/**
 * useBlockCommands - Block command management hook
 * @module quarry/hooks/useBlockCommands
 *
 * Provides filtering, execution, and state management for
 * block commands used in the inline WYSIWYG editor.
 */

import { useCallback, useMemo, useState } from 'react'
import {
  BLOCK_COMMANDS,
  BLOCK_COMMAND_CATEGORIES,
  filterCommands,
  getCommandsByCategory,
  getCommandById,
  getCategoryInfo,
} from '../ui/blockCommands/registry'
import type {
  BlockCommand,
  BlockCommandCategory,
  BlockCommandCategoryInfo,
  BlockCommandExecuteOptions,
} from '../ui/blockCommands/types'

export interface UseBlockCommandsOptions {
  /**
   * Callback to insert markdown at a specific block index.
   * Used when inserting via the "+" button.
   */
  onInsertBlock?: (index: number, markdown: string) => void
  /**
   * Callback to insert markdown at current cursor position.
   * Used when inserting via slash commands in the editor.
   */
  onInsertAtCursor?: (markdown: string) => void
  /**
   * Callback for commands that require additional input.
   * Called with command ID when user selects a command that needs modal/dialog.
   */
  onRequiresInput?: (command: BlockCommand) => void
  /**
   * Dark theme flag
   */
  isDark?: boolean
}

export interface UseBlockCommandsReturn {
  /** All available commands */
  allCommands: BlockCommand[]
  /** All category definitions */
  categories: BlockCommandCategoryInfo[]
  /** Get category info by ID */
  getCategoryInfo: (category: BlockCommandCategory) => BlockCommandCategoryInfo
  /** Filter commands by search query */
  filterCommands: (query: string) => BlockCommand[]
  /** Get commands grouped by category */
  getCommandsByCategory: () => Map<BlockCommandCategory, BlockCommand[]>
  /** Execute a command by ID at a specific index */
  executeCommand: (commandId: string, insertIndex?: number) => boolean
  /** Execute a command directly */
  executeCommandDirect: (command: BlockCommand, insertIndex?: number) => boolean
  /** Current selected index for keyboard navigation */
  selectedIndex: number
  /** Set selected index */
  setSelectedIndex: (index: number) => void
  /** Move selection up */
  selectPrevious: (filteredCount: number) => void
  /** Move selection down */
  selectNext: (filteredCount: number) => void
  /** Reset selection to first item */
  resetSelection: () => void
}

/**
 * Hook for managing block commands
 */
export function useBlockCommands(options: UseBlockCommandsOptions = {}): UseBlockCommandsReturn {
  const {
    onInsertBlock,
    onInsertAtCursor,
    onRequiresInput,
    isDark = false,
  } = options

  // Keyboard navigation state
  const [selectedIndex, setSelectedIndex] = useState(0)

  /**
   * Execute a command
   */
  const executeCommandDirect = useCallback((
    command: BlockCommand,
    insertIndex?: number
  ): boolean => {
    // Handle commands that need additional input
    if (command.requiresInput) {
      onRequiresInput?.(command)
      return true
    }

    // Handle custom execution
    if (command.onExecute) {
      const executeOptions: BlockCommandExecuteOptions = {
        insertIndex,
        insertMarkdown: (md) => {
          if (insertIndex !== undefined && onInsertBlock) {
            onInsertBlock(insertIndex, md)
          } else if (onInsertAtCursor) {
            onInsertAtCursor(md)
          }
        },
        isDark,
        closeMenu: () => {}, // Will be overridden by caller
      }
      command.onExecute(executeOptions)
      return true
    }

    // Get markdown content
    const markdown = typeof command.markdown === 'function'
      ? command.markdown()
      : command.markdown

    if (!markdown && !command.requiresInput) {
      console.warn(`[useBlockCommands] Command ${command.id} has no markdown and no handler`)
      return false
    }

    // Insert the markdown
    if (insertIndex !== undefined && onInsertBlock) {
      onInsertBlock(insertIndex, markdown)
    } else if (onInsertAtCursor) {
      onInsertAtCursor(markdown)
    } else {
      console.warn('[useBlockCommands] No insert handler provided')
      return false
    }

    return true
  }, [onInsertBlock, onInsertAtCursor, onRequiresInput, isDark])

  /**
   * Execute a command by ID
   */
  const executeCommand = useCallback((
    commandId: string,
    insertIndex?: number
  ): boolean => {
    const command = getCommandById(commandId)
    if (!command) {
      console.warn(`[useBlockCommands] Unknown command: ${commandId}`)
      return false
    }
    return executeCommandDirect(command, insertIndex)
  }, [executeCommandDirect])

  /**
   * Keyboard navigation helpers
   */
  const selectPrevious = useCallback((filteredCount: number) => {
    setSelectedIndex(prev => (prev > 0 ? prev - 1 : filteredCount - 1))
  }, [])

  const selectNext = useCallback((filteredCount: number) => {
    setSelectedIndex(prev => (prev < filteredCount - 1 ? prev + 1 : 0))
  }, [])

  const resetSelection = useCallback(() => {
    setSelectedIndex(0)
  }, [])

  // Memoize static values
  const memoizedCategories = useMemo(() => BLOCK_COMMAND_CATEGORIES, [])

  return {
    allCommands: BLOCK_COMMANDS,
    categories: memoizedCategories,
    getCategoryInfo,
    filterCommands,
    getCommandsByCategory,
    executeCommand,
    executeCommandDirect,
    selectedIndex,
    setSelectedIndex,
    selectPrevious,
    selectNext,
    resetSelection,
  }
}

export default useBlockCommands
