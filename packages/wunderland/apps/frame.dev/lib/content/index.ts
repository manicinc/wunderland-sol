/**
 * Content Management Module
 *
 * Unified exports for content layer abstraction.
 *
 * @module lib/content
 */

export * from './types'
export { SQLiteContentStore, getContentStore, initContentStore } from './sqliteStore'
export {
  FilesystemContentSource,
  getFilesystemSource,
  createBundledSource,
  createFilesystemSource,
  isFilesystemAccessSupported,
  getCurrentFilesystemSource,
  clearFilesystemSource,
  type FilesystemConfig,
  type FilesystemMode,
} from './filesystemSource'
