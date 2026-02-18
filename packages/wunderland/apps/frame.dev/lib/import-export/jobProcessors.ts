/**
 * Import/Export Job Processors
 * @module lib/import-export/jobProcessors
 *
 * Job processor functions for the import/export system.
 * These integrate with the job queue to handle async import/export operations.
 */

import type { Job, ImportJobPayload, ExportJobPayload, ImportJobResult, ExportJobResult } from '@/lib/jobs/types'
import { getImportManager } from './core/ImportManager'
import { getExportManager } from './core/ExportManager'

// ============================================================================
// IMPORT PROCESSORS
// ============================================================================

/**
 * Process import job
 */
export async function processImportJob(
  job: Job<ImportJobPayload, ImportJobResult>,
  onProgress: (progress: number, message: string) => void
): Promise<ImportJobResult> {
  const { source, files, googleFolderId, targetWeave, conflictResolution, preserveStructure, importUserData, options } =
    job.payload

  const importManager = getImportManager()

  // Determine input based on source
  let input: File | Blob | string | null = null

  if (source === 'google-docs') {
    if (!googleFolderId) {
      throw new Error('Google Drive folder ID is required for Google Docs import')
    }
    input = googleFolderId
  } else if (files && files.length > 0) {
    input = files[0] // Use first file (converters handle multiple files internally)
  } else {
    throw new Error('No input provided for import')
  }

  // Perform import
  const result = await importManager.import(input, {
    format: source,
    targetWeave,
    conflictResolution,
    preserveStructure,
    importUserData,
    onProgress: (current, total, message) => {
      const progressPercent = Math.round((current / total) * 100)
      onProgress(progressPercent, message || `Importing... (${current}/${total})`)
    },
    formatOptions: options,
  })

  if (!result.success) {
    throw new Error(result.errors?.[0]?.message || 'Import failed')
  }

  return {
    strandsImported: result.statistics.strandsImported,
    strandsSkipped: result.statistics.strandsSkipped,
    conflictsResolved: result.statistics.strandsConflicted,
    assetsImported: result.statistics.assetsImported,
    strandIds: result.strandIds,
    errors: result.errors?.map(e => e.message),
    warnings: result.warnings,
  }
}

// ============================================================================
// EXPORT PROCESSORS
// ============================================================================

/**
 * Process export job
 */
export async function processExportJob(
  job: Job<ExportJobPayload, ExportJobResult>,
  onProgress: (progress: number, message: string) => void
): Promise<ExportJobResult> {
  const { format, strandPaths, weaves, includeMetadata, includeUserData, pageSize, includeTOC, options } =
    job.payload

  const exportManager = getExportManager()

  // Perform export
  const result = await exportManager.export({
    format,
    strandPaths,
    weaves,
    includeMetadata,
    includeUserData,
    onProgress: (current, total, message) => {
      const progressPercent = Math.round((current / total) * 100)
      onProgress(progressPercent, message || `Exporting... (${current}/${total})`)
    },
    formatOptions: {
      pagination: pageSize,
      includeTOC,
      ...options,
    },
  })

  if (!result.success) {
    throw new Error(result.errors?.[0] || 'Export failed')
  }

  return {
    strandsExported: result.statistics.strandsExported,
    assetsExported: result.statistics.assetsExported,
    totalSizeBytes: result.statistics.totalSizeBytes,
    filename: result.filename,
    errors: result.errors,
  }
}

// ============================================================================
// PROCESSOR FACTORY
// ============================================================================

/**
 * Create processor function for import job type
 */
export function createImportProcessor(
  source: 'obsidian' | 'notion' | 'google-docs' | 'markdown' | 'evernote'
) {
  return async (
    job: Job,
    onProgress: (progress: number, message: string) => void
  ) => {
    // Ensure payload has correct source
    const payload = job.payload as ImportJobPayload
    if (payload.source !== source) {
      payload.source = source
    }

    return processImportJob(job as Job<ImportJobPayload, ImportJobResult>, onProgress)
  }
}

/**
 * Create processor function for export job type
 */
export function createExportProcessor(
  format: 'pdf' | 'docx' | 'markdown' | 'json'
) {
  return async (
    job: Job,
    onProgress: (progress: number, message: string) => void
  ) => {
    // Ensure payload has correct format
    const payload = job.payload as ExportJobPayload
    if (payload.format !== format) {
      payload.format = format
    }

    return processExportJob(job as Job<ExportJobPayload, ExportJobResult>, onProgress)
  }
}
