/**
 * Block Commands Module
 * @module quarry/ui/blockCommands
 *
 * Exports all components and utilities for the block command system.
 */

// Types
export * from './types'

// Registry
export {
  BLOCK_COMMANDS,
  BLOCK_COMMAND_CATEGORIES,
  filterCommands,
  getCommandById,
  getCommandsByCategory,
  getCategoryInfo,
} from './registry'

// Components
export { BlockCommandPalette } from './BlockCommandPalette'
export { BlockInsertHandle, BlockInsertHandleWrapper } from './BlockInsertHandle'
export { BlockDragHandle, BlockDropZone } from './BlockDragHandle'

// Modals
export { TableInsertModal, ImageInsertModal, AIGenerateModal } from './modals'
