/**
 * Block Command Types
 * @module quarry/ui/blockCommands/types
 *
 * Type definitions for the block command system used by
 * the "+" insert handle and "/" slash commands.
 */

import type { LucideIcon } from 'lucide-react'

/**
 * Categories for organizing block commands
 */
export type BlockCommandCategory = 'basic' | 'content' | 'advanced' | 'dynamic' | 'ai'

/**
 * Category metadata for UI display
 */
export interface BlockCommandCategoryInfo {
  id: BlockCommandCategory
  name: string
  icon: LucideIcon
  priority: number // Lower = shown first
}

/**
 * A block command represents an insertable block type
 */
export interface BlockCommand {
  /** Unique identifier */
  id: string
  /** Display name */
  name: string
  /** Short description shown in menu */
  description: string
  /** Keywords for fuzzy search (in addition to name) */
  keywords: string[]
  /** Icon component */
  icon: LucideIcon
  /** Category for grouping */
  category: BlockCommandCategory
  /** Optional keyboard shortcut hint */
  shortcut?: string
  /**
   * Markdown to insert.
   * Can be a string or function that returns string.
   * Function variant used for commands that need dynamic content.
   */
  markdown: string | (() => string)
  /**
   * If true, opens a modal/dialog for additional input
   * (e.g., table dimensions, image upload, AI prompt)
   */
  requiresInput?: boolean
  /**
   * Custom handler for commands that need special behavior.
   * If provided, markdown is ignored and this is called instead.
   */
  onExecute?: (options: BlockCommandExecuteOptions) => void | Promise<void>
}

/**
 * Options passed to custom command handlers
 */
export interface BlockCommandExecuteOptions {
  /** Index to insert at (for "+" button mode) */
  insertIndex?: number
  /** Editor instance (for slash command mode) */
  editor?: any // Tiptap Editor type
  /** Callback to insert markdown at position */
  insertMarkdown: (markdown: string) => void
  /** Theme for styling modals */
  isDark: boolean
  /** Close the command palette */
  closeMenu: () => void
}

/**
 * Props for the command palette component
 */
export interface BlockCommandPaletteProps {
  /** Whether palette is open */
  isOpen: boolean
  /** Position to render at */
  position: { x: number; y: number }
  /** Current filter query (from slash command or search input) */
  query: string
  /** Called when query changes (for "+" mode with search input) */
  onQueryChange?: (query: string) => void
  /** Called when a command is selected */
  onSelect: (command: BlockCommand) => void
  /** Called to close the palette */
  onClose: () => void
  /** Dark theme */
  isDark: boolean
  /**
   * Mode affects UI slightly:
   * - 'insert': Shows search input, for "+" button
   * - 'slash': No search input, query comes from editor
   */
  mode: 'insert' | 'slash'
}

/**
 * Props for the block insert handle ("+" button)
 */
export interface BlockInsertHandleProps {
  /** Block index to insert before */
  blockIndex: number
  /** Called when handle is clicked - includes block index for convenience */
  onOpenMenu: (blockIndex: number, position: { x: number; y: number }) => void
  /** Dark theme */
  isDark: boolean
  /** Whether the handle should be visible (hover state managed externally or internally) */
  forceVisible?: boolean
}

/**
 * State for slash command extension
 */
export interface SlashCommandState {
  /** Whether slash command mode is active */
  active: boolean
  /** Position where "/" was typed */
  startPos: number
  /** Current query (text after "/") */
  query: string
  /** Coordinates for positioning menu */
  coords: { x: number; y: number } | null
}
