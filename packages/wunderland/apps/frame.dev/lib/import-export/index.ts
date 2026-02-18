/**
 * Import/Export System
 * @module lib/import-export
 *
 * Main entry point for the import/export system.
 * Exports all public APIs and handles initialization.
 */

// Core managers
export { getImportManager, resetImportManager } from './core/ImportManager'
export { getExportManager, resetExportManager } from './core/ExportManager'

// Types
export type * from './core/types'

// Worker pool
export { getWorkerPool, resetWorkerPool } from './workers/workerPool'

// Progress utilities
export { ProgressAggregator, createBatchProgressAggregator, createPhaseProgressAggregator } from './utils/progressAggregator'

// Job processors
export { processImportJob, processExportJob, createImportProcessor, createExportProcessor } from './jobProcessors'

// Converters
export { ObsidianConverter } from './converters/markdown/ObsidianConverter'
export { NotionConverter } from './converters/notion/NotionConverter'
export { GoogleDocsConverter } from './converters/google/GoogleDocsConverter'
export { DocxGenerator } from './converters/document/DocxGenerator'
export { EvernoteConverter } from './converters/evernote/EvernoteConverter'

// Google OAuth
export { getGoogleOAuthClient, resetGoogleOAuthClient } from './converters/google/GoogleOAuthClient'
export { getGoogleDriveClient, resetGoogleDriveClient } from './converters/google/GoogleDriveClient'

// ============================================================================
// INITIALIZATION
// ============================================================================

import { registerJobProcessor } from '@/lib/jobs/jobQueue'
import { createImportProcessor, createExportProcessor } from './jobProcessors'
import { ObsidianConverter } from './converters/markdown/ObsidianConverter'
import { NotionConverter } from './converters/notion/NotionConverter'
import { GoogleDocsConverter } from './converters/google/GoogleDocsConverter'
import { DocxGenerator } from './converters/document/DocxGenerator'
import { EvernoteConverter } from './converters/evernote/EvernoteConverter'
import { getImportManager } from './core/ImportManager'
import { getExportManager } from './core/ExportManager'

/**
 * Initialize the import/export system
 * Registers job processors and converters
 */
export function initializeImportExport(): void {
  console.log('[ImportExport] Initializing import/export system...')

  // Register import processors
  registerJobProcessor('import-obsidian', createImportProcessor('obsidian'))
  registerJobProcessor('import-notion', createImportProcessor('notion'))
  registerJobProcessor('import-google-docs', createImportProcessor('google-docs'))
  registerJobProcessor('import-markdown', createImportProcessor('markdown'))
  registerJobProcessor('import-evernote', createImportProcessor('evernote'))

  // Register export processors
  registerJobProcessor('export-pdf', createExportProcessor('pdf'))
  registerJobProcessor('export-docx', createExportProcessor('docx'))
  registerJobProcessor('export-markdown', createExportProcessor('markdown'))
  registerJobProcessor('export-json', createExportProcessor('json'))

  // Register converters with managers
  const importManager = getImportManager()
  const exportManager = getExportManager()

  // Import converters
  const obsidianConverter = new ObsidianConverter()
  importManager.registerConverter('obsidian', obsidianConverter)
  importManager.registerConverter('markdown', obsidianConverter) // Obsidian handles generic markdown too

  importManager.registerConverter('notion', new NotionConverter())
  importManager.registerConverter('google-docs', new GoogleDocsConverter())
  importManager.registerConverter('evernote', new EvernoteConverter())

  // Export converters
  exportManager.registerConverter('markdown', obsidianConverter) // Use Obsidian for markdown export
  exportManager.registerConverter('docx', new DocxGenerator())

  console.log('[ImportExport] System initialized successfully')
  console.log('[ImportExport] Registered converters:')
  console.log('  - Obsidian (import/export)')
  console.log('  - Notion (import)')
  console.log('  - Google Docs (import)')
  console.log('  - Evernote (import)')
  console.log('  - DOCX (export)')
}
