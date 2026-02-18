/**
 * Vault Manager
 * @module lib/vault/vaultManager
 *
 * Core operations for creating, opening, and managing the local vault folder.
 * The vault is the user's external folder where markdown files are stored.
 */

import { v4 as uuidv4 } from 'uuid'
import type { VaultConfig, VaultStatus, VaultStatusResult, AppSettings } from './vaultConfig'
import {
  getStoredVaultHandle,
  storeVaultHandle,
  clearVaultHandle,
  checkVaultPermission,
  isFileSystemAccessSupported,
} from './vaultConfig'

// ============================================================================
// CONSTANTS
// ============================================================================

const VAULT_CONFIG_DIR = '.quarry'
const VAULT_CONFIG_FILE = 'vault.json'
const WEAVES_DIR = 'weaves'
const ASSETS_DIR = 'assets'

// ============================================================================
// VAULT CREATION
// ============================================================================

/**
 * Create a new vault in the given directory
 * Creates the folder structure and vault.json config file
 */
export async function createVault(
  handle: FileSystemDirectoryHandle,
  name?: string
): Promise<VaultConfig> {
  // Create .quarry directory
  const quarryDir = await handle.getDirectoryHandle(VAULT_CONFIG_DIR, { create: true })

  // Create vault config
  const config: VaultConfig = {
    version: 1,
    id: uuidv4(),
    name: name || 'My Vault',
    createdAt: new Date().toISOString(),
    lastOpenedAt: new Date().toISOString(),
  }

  // Write vault.json
  const configFile = await quarryDir.getFileHandle(VAULT_CONFIG_FILE, { create: true })
  const writable = await configFile.createWritable()
  await writable.write(JSON.stringify(config, null, 2))
  await writable.close()

  // Create weaves directory
  await handle.getDirectoryHandle(WEAVES_DIR, { create: true })

  // Create assets directory
  await handle.getDirectoryHandle(ASSETS_DIR, { create: true })

  // Create .gitignore in .quarry to ignore cache files
  try {
    const gitignoreFile = await quarryDir.getFileHandle('.gitignore', { create: true })
    const gitignoreWritable = await gitignoreFile.createWritable()
    await gitignoreWritable.write('# Quarry cache files\n*.cache\n*.tmp\n')
    await gitignoreWritable.close()
  } catch {
    // Ignore if gitignore creation fails
  }

  // Store handle for future access
  await storeVaultHandle(handle)

  return config
}

/**
 * Open an existing vault from the given directory
 * Validates the vault structure and returns the config
 */
export async function openVault(
  handle: FileSystemDirectoryHandle
): Promise<VaultConfig> {
  // Check for .quarry directory
  let quarryDir: FileSystemDirectoryHandle
  try {
    quarryDir = await handle.getDirectoryHandle(VAULT_CONFIG_DIR)
  } catch {
    throw new Error('Not a valid vault: missing .quarry directory')
  }

  // Read vault.json
  let configFile: FileSystemFileHandle
  try {
    configFile = await quarryDir.getFileHandle(VAULT_CONFIG_FILE)
  } catch {
    throw new Error('Not a valid vault: missing vault.json')
  }

  const file = await configFile.getFile()
  const text = await file.text()
  const config = JSON.parse(text) as VaultConfig

  // Validate config
  if (!config.id || !config.version) {
    throw new Error('Invalid vault.json: missing required fields')
  }

  // Update lastOpenedAt
  config.lastOpenedAt = new Date().toISOString()
  try {
    const writable = await configFile.createWritable()
    await writable.write(JSON.stringify(config, null, 2))
    await writable.close()
  } catch {
    // Ignore if update fails (might be permission issue)
  }

  // Store handle for future access
  await storeVaultHandle(handle)

  return config
}

/**
 * Get the vault config from an open vault
 */
export async function getVaultConfig(
  handle: FileSystemDirectoryHandle
): Promise<VaultConfig | null> {
  try {
    const quarryDir = await handle.getDirectoryHandle(VAULT_CONFIG_DIR)
    const configFile = await quarryDir.getFileHandle(VAULT_CONFIG_FILE)
    const file = await configFile.getFile()
    const text = await file.text()
    return JSON.parse(text) as VaultConfig
  } catch {
    return null
  }
}

/**
 * Update the vault config
 */
export async function setVaultConfig(
  handle: FileSystemDirectoryHandle,
  updates: Partial<VaultConfig>
): Promise<VaultConfig> {
  const quarryDir = await handle.getDirectoryHandle(VAULT_CONFIG_DIR)
  const configFile = await quarryDir.getFileHandle(VAULT_CONFIG_FILE)

  // Read current config
  const file = await configFile.getFile()
  const text = await file.text()
  const config = JSON.parse(text) as VaultConfig

  // Apply updates
  const updatedConfig = { ...config, ...updates }

  // Write back
  const writable = await configFile.createWritable()
  await writable.write(JSON.stringify(updatedConfig, null, 2))
  await writable.close()

  return updatedConfig
}

// ============================================================================
// VAULT STATUS
// ============================================================================

/**
 * Check the current vault status
 * This determines what the app should show (setup wizard, main app, reconnect dialog)
 */
export async function checkVaultStatus(): Promise<VaultStatusResult> {
  // Check if File System Access API is supported
  if (!isFileSystemAccessSupported()) {
    return {
      status: 'unsupported',
      error: 'Your browser does not support the File System Access API. Please use Chrome, Edge, or Opera.',
    }
  }

  // Check for stored handle
  const handle = await getStoredVaultHandle()

  if (!handle) {
    // No handle stored - need setup
    return {
      status: 'needs-setup',
    }
  }

  // Check permission
  const permission = await checkVaultPermission(handle)

  if (permission === 'denied') {
    return {
      status: 'missing',
      error: 'Permission to access the vault was denied.',
    }
  }

  if (permission === 'prompt') {
    return {
      status: 'permission-needed',
      handle,
    }
  }

  // Permission granted - try to read config
  try {
    const config = await getVaultConfig(handle)

    if (!config) {
      return {
        status: 'missing',
        error: 'Vault folder exists but is not a valid vault.',
      }
    }

    return {
      status: 'ready',
      config,
      handle,
      path: handle.name,
    }
  } catch (error) {
    return {
      status: 'missing',
      error: error instanceof Error ? error.message : 'Failed to access vault',
    }
  }
}

// ============================================================================
// VAULT DIRECTORY OPERATIONS
// ============================================================================

/**
 * Get or create a directory within the vault
 */
export async function getVaultDirectory(
  handle: FileSystemDirectoryHandle,
  path: string,
  create = false
): Promise<FileSystemDirectoryHandle> {
  const parts = path.split('/').filter(Boolean)
  let current = handle

  for (const part of parts) {
    current = await current.getDirectoryHandle(part, { create })
  }

  return current
}

/**
 * Get the weaves directory
 */
export async function getWeavesDirectory(
  handle: FileSystemDirectoryHandle,
  create = false
): Promise<FileSystemDirectoryHandle> {
  return handle.getDirectoryHandle(WEAVES_DIR, { create })
}

/**
 * Get the assets directory
 */
export async function getAssetsDirectory(
  handle: FileSystemDirectoryHandle,
  create = false
): Promise<FileSystemDirectoryHandle> {
  return handle.getDirectoryHandle(ASSETS_DIR, { create })
}

/**
 * List all files in a directory recursively
 */
export async function listVaultFiles(
  handle: FileSystemDirectoryHandle,
  basePath = ''
): Promise<Array<{ path: string; name: string; handle: FileSystemFileHandle }>> {
  const files: Array<{ path: string; name: string; handle: FileSystemFileHandle }> = []

  // @ts-expect-error - FileSystemDirectoryHandle.values() exists but TS DOM types are incomplete
  for await (const entry of handle.values() as AsyncIterable<FileSystemHandle>) {
    const entryPath = basePath ? `${basePath}/${entry.name}` : entry.name

    if (entry.kind === 'file') {
      files.push({
        path: entryPath,
        name: entry.name,
        handle: entry as FileSystemFileHandle,
      })
    } else if (entry.kind === 'directory') {
      // Skip .quarry directory
      if (entry.name === VAULT_CONFIG_DIR) continue

      const subFiles = await listVaultFiles(entry as FileSystemDirectoryHandle, entryPath)
      files.push(...subFiles)
    }
  }

  return files
}

/**
 * Read a file from the vault
 */
export async function readVaultFile(
  handle: FileSystemDirectoryHandle,
  path: string
): Promise<string> {
  const parts = path.split('/')
  const fileName = parts.pop()!
  const dirPath = parts.join('/')

  let dir = handle
  if (dirPath) {
    dir = await getVaultDirectory(handle, dirPath)
  }

  const fileHandle = await dir.getFileHandle(fileName)
  const file = await fileHandle.getFile()
  return file.text()
}

/**
 * Write a file to the vault
 */
export async function writeVaultFile(
  handle: FileSystemDirectoryHandle,
  path: string,
  content: string
): Promise<void> {
  const parts = path.split('/')
  const fileName = parts.pop()!
  const dirPath = parts.join('/')

  let dir = handle
  if (dirPath) {
    dir = await getVaultDirectory(handle, dirPath, true)
  }

  const fileHandle = await dir.getFileHandle(fileName, { create: true })
  const writable = await fileHandle.createWritable()
  await writable.write(content)
  await writable.close()
}

/**
 * Delete a file from the vault
 */
export async function deleteVaultFile(
  handle: FileSystemDirectoryHandle,
  path: string
): Promise<void> {
  const parts = path.split('/')
  const fileName = parts.pop()!
  const dirPath = parts.join('/')

  let dir = handle
  if (dirPath) {
    dir = await getVaultDirectory(handle, dirPath)
  }

  await dir.removeEntry(fileName)
}

/**
 * Delete a directory from the vault (recursively)
 */
export async function deleteVaultDirectory(
  handle: FileSystemDirectoryHandle,
  path: string
): Promise<void> {
  const parts = path.split('/')
  const dirName = parts.pop()!
  const parentPath = parts.join('/')

  let parentDir = handle
  if (parentPath) {
    parentDir = await getVaultDirectory(handle, parentPath)
  }

  await parentDir.removeEntry(dirName, { recursive: true })
}

// ============================================================================
// MOVE OPERATIONS (for drag-and-drop tree)
// ============================================================================

/**
 * Move a file within the vault
 * Copies content to new location, then deletes original
 */
export async function moveVaultFile(
  handle: FileSystemDirectoryHandle,
  sourcePath: string,
  destPath: string
): Promise<void> {
  // Read source file
  const content = await readVaultFile(handle, sourcePath)

  // Write to destination
  await writeVaultFile(handle, destPath, content)

  // Delete source
  await deleteVaultFile(handle, sourcePath)

  console.log('[VaultManager] Moved file:', sourcePath, '→', destPath)
}

/**
 * Move a directory within the vault
 * Recursively copies all contents to new location, then deletes original
 */
export async function moveVaultDirectory(
  handle: FileSystemDirectoryHandle,
  sourcePath: string,
  destPath: string
): Promise<void> {
  // Get source directory
  const sourceDir = await getVaultDirectory(handle, sourcePath)

  // Create destination directory
  await getVaultDirectory(handle, destPath, true)

  // Copy all contents recursively
  await copyDirectoryContents(handle, sourceDir, sourcePath, destPath)

  // Delete source directory
  await deleteVaultDirectory(handle, sourcePath)

  console.log('[VaultManager] Moved directory:', sourcePath, '→', destPath)
}

/**
 * Helper: Copy all contents from source to destination
 */
async function copyDirectoryContents(
  rootHandle: FileSystemDirectoryHandle,
  sourceDir: FileSystemDirectoryHandle,
  sourcePath: string,
  destPath: string
): Promise<void> {
  // @ts-expect-error - FileSystemDirectoryHandle.values() exists but TS DOM types are incomplete
  for await (const entry of sourceDir.values() as AsyncIterable<FileSystemHandle>) {
    const sourceEntryPath = `${sourcePath}/${entry.name}`
    const destEntryPath = `${destPath}/${entry.name}`

    if (entry.kind === 'file') {
      // Copy file
      const content = await readVaultFile(rootHandle, sourceEntryPath)
      await writeVaultFile(rootHandle, destEntryPath, content)
    } else if (entry.kind === 'directory') {
      // Create subdirectory and recurse
      await getVaultDirectory(rootHandle, destEntryPath, true)
      await copyDirectoryContents(
        rootHandle,
        entry as FileSystemDirectoryHandle,
        sourceEntryPath,
        destEntryPath
      )
    }
  }
}

/**
 * Batch move operation for multiple files/directories
 * Used by the drag-and-drop tree when reorganizing content
 */
export async function batchMoveVaultItems(
  handle: FileSystemDirectoryHandle,
  operations: Array<{
    type: 'move'
    sourcePath: string
    destPath: string
    name: string
    nodeType: 'file' | 'dir'
    timestamp: number
  }>
): Promise<{ success: boolean; movedCount: number; errors: string[] }> {
  const errors: string[] = []
  let movedCount = 0

  // Sort operations to handle parent directories before children
  // This prevents trying to move items from deleted directories
  const sortedOps = [...operations].sort((a, b) => {
    // Process directories before files
    if (a.nodeType !== b.nodeType) {
      return a.nodeType === 'dir' ? -1 : 1
    }
    // Process shorter paths first (parent directories)
    return a.sourcePath.split('/').length - b.sourcePath.split('/').length
  })

  for (const op of sortedOps) {
    try {
      if (op.nodeType === 'file') {
        await moveVaultFile(handle, op.sourcePath, op.destPath)
      } else {
        await moveVaultDirectory(handle, op.sourcePath, op.destPath)
      }
      movedCount++
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      errors.push(`${op.sourcePath}: ${errorMsg}`)
      console.error('[VaultManager] Move failed:', op.sourcePath, error)
    }
  }

  return {
    success: errors.length === 0,
    movedCount,
    errors,
  }
}

// ============================================================================
// DIRECTORY PICKER
// ============================================================================

/**
 * Show the directory picker to let user choose a vault location
 */
export async function showVaultPicker(): Promise<FileSystemDirectoryHandle | null> {
  if (!isFileSystemAccessSupported()) {
    throw new Error('File System Access API is not supported')
  }

  try {
    const handle = await (window as any).showDirectoryPicker({
      mode: 'readwrite',
      startIn: 'documents',
    })
    return handle
  } catch (error) {
    // User cancelled or error
    if (error instanceof Error && error.name === 'AbortError') {
      return null // User cancelled
    }
    throw error
  }
}

/**
 * Disconnect from the vault (clear stored handle)
 */
export async function disconnectVault(): Promise<void> {
  await clearVaultHandle()
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  VAULT_CONFIG_DIR,
  VAULT_CONFIG_FILE,
  WEAVES_DIR,
  ASSETS_DIR,
}
