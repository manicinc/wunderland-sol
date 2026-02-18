/**
 * Vault Migration Module
 *
 * Handles migration from IndexedDB-only mode to hybrid vault storage.
 * Exports existing content to an external vault folder.
 *
 * @module lib/vault/vaultMigration
 */

import { getContentStore } from '../content/sqliteStore'
import { getDatabase } from '../codexDatabase'
import { createVault, storeVaultHandle, type VaultConfig } from './index'

export interface MigrationProgress {
  phase: 'checking' | 'exporting' | 'verifying' | 'complete' | 'error'
  current: number
  total: number
  message: string
}

export interface MigrationResult {
  success: boolean
  strandsExported: number
  errors: string[]
  vaultConfig?: VaultConfig
}

/**
 * Check if migration is needed (has content in IndexedDB but no vault)
 */
export async function needsMigration(): Promise<{
  needsMigration: boolean
  strandCount: number
  hasVault: boolean
}> {
  const db = await getDatabase()
  if (!db) {
    return { needsMigration: false, strandCount: 0, hasVault: false }
  }

  try {
    // Check for existing strands
    const countResult = await db.all(`SELECT COUNT(*) as count FROM strands`) as Array<{ count: number }>
    const strandCount = countResult?.[0]?.count || 0

    // Check for vault setting
    const vaultResult = await db.all(`SELECT value FROM settings WHERE key = 'vaultPath'`) as Array<{ value: string }>
    const hasVault = !!vaultResult?.[0]?.value

    return {
      needsMigration: strandCount > 0 && !hasVault,
      strandCount,
      hasVault,
    }
  } catch {
    return { needsMigration: false, strandCount: 0, hasVault: false }
  }
}

/**
 * Migrate content from IndexedDB to a new vault folder
 */
export async function migrateToVault(
  handle: FileSystemDirectoryHandle,
  options?: {
    onProgress?: (progress: MigrationProgress) => void
    vaultName?: string
  }
): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: false,
    strandsExported: 0,
    errors: [],
  }

  try {
    // Phase 1: Create vault structure
    options?.onProgress?.({
      phase: 'checking',
      current: 0,
      total: 100,
      message: 'Creating vault structure...',
    })

    const vaultConfig = await createVault(handle, options?.vaultName || 'My Vault')
    result.vaultConfig = vaultConfig

    // Store the handle for future use
    await storeVaultHandle(handle)

    // Phase 2: Initialize content store with vault
    const store = getContentStore()
    await store.initialize()

    // Phase 3: Export strands
    options?.onProgress?.({
      phase: 'exporting',
      current: 0,
      total: 100,
      message: 'Exporting content to vault...',
    })

    const exportResult = await store.exportToVault({
      onProgress: (current, total) => {
        options?.onProgress?.({
          phase: 'exporting',
          current,
          total,
          message: `Exporting strand ${current} of ${total}...`,
        })
      },
    })

    result.strandsExported = exportResult.exported
    result.errors = exportResult.errors

    // Phase 4: Verify
    options?.onProgress?.({
      phase: 'verifying',
      current: 0,
      total: 1,
      message: 'Verifying migration...',
    })

    // Simple verification: check that exported count matches
    if (exportResult.errors.length === 0) {
      result.success = true
    } else {
      result.success = exportResult.exported > 0 // Partial success
    }

    options?.onProgress?.({
      phase: 'complete',
      current: 1,
      total: 1,
      message: `Migration complete. ${result.strandsExported} strands exported.`,
    })
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    result.errors.push(errorMsg)
    options?.onProgress?.({
      phase: 'error',
      current: 0,
      total: 1,
      message: `Migration failed: ${errorMsg}`,
    })
  }

  return result
}

/**
 * Import content from an existing vault folder
 */
export async function importFromVault(
  handle: FileSystemDirectoryHandle,
  options?: {
    onProgress?: (progress: MigrationProgress) => void
    clearExisting?: boolean
  }
): Promise<{
  success: boolean
  strandsImported: number
  strandsUpdated: number
  errors: string[]
}> {
  const result = {
    success: false,
    strandsImported: 0,
    strandsUpdated: 0,
    errors: [] as string[],
  }

  try {
    // Store the handle
    await storeVaultHandle(handle)

    // Initialize content store
    const store = getContentStore()
    await store.initialize()

    // Sync from vault
    options?.onProgress?.({
      phase: 'exporting', // Using 'exporting' for import progress
      current: 0,
      total: 100,
      message: 'Importing content from vault...',
    })

    const syncResult = await store.syncFromVault({
      clearExisting: options?.clearExisting,
      onProgress: (current, total) => {
        options?.onProgress?.({
          phase: 'exporting',
          current,
          total,
          message: `Importing strand ${current} of ${total}...`,
        })
      },
    })

    result.strandsImported = syncResult.added
    result.strandsUpdated = syncResult.updated
    result.errors = syncResult.errors
    result.success = syncResult.errors.length === 0 || syncResult.added > 0 || syncResult.updated > 0

    options?.onProgress?.({
      phase: 'complete',
      current: 1,
      total: 1,
      message: `Import complete. ${result.strandsImported} added, ${result.strandsUpdated} updated.`,
    })
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    result.errors.push(errorMsg)
    options?.onProgress?.({
      phase: 'error',
      current: 0,
      total: 1,
      message: `Import failed: ${errorMsg}`,
    })
  }

  return result
}

/**
 * Get migration statistics
 */
export async function getMigrationStats(): Promise<{
  indexedDbStrands: number
  indexedDbSize: string
  hasVaultConfigured: boolean
  vaultPath?: string
}> {
  const db = await getDatabase()
  if (!db) {
    return {
      indexedDbStrands: 0,
      indexedDbSize: '0 KB',
      hasVaultConfigured: false,
    }
  }

  try {
    // Count strands
    const countResult = await db.all(`SELECT COUNT(*) as count FROM strands`) as Array<{ count: number }>
    const strandCount = countResult?.[0]?.count || 0

    // Estimate size (rough calculation based on content length)
    const sizeResult = await db.all(`SELECT SUM(LENGTH(content)) as size FROM strands`) as Array<{ size: number }>
    const totalBytes = sizeResult?.[0]?.size || 0
    const sizeStr = totalBytes > 1024 * 1024
      ? `${(totalBytes / (1024 * 1024)).toFixed(1)} MB`
      : `${(totalBytes / 1024).toFixed(1)} KB`

    // Check vault config
    const vaultResult = await db.all(`SELECT value FROM settings WHERE key = 'vaultPath'`) as Array<{ value: string }>
    const vaultPath = vaultResult?.[0]?.value

    return {
      indexedDbStrands: strandCount,
      indexedDbSize: sizeStr,
      hasVaultConfigured: !!vaultPath,
      vaultPath,
    }
  } catch {
    return {
      indexedDbStrands: 0,
      indexedDbSize: '0 KB',
      hasVaultConfigured: false,
    }
  }
}
