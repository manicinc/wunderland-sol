/**
 * Electron Vault Adapter
 * @module lib/vault/electronVault
 *
 * Provides vault file operations for Electron using IPC file system access.
 * This bypasses the File System Access API and uses Node.js fs directly.
 */

import * as path from 'path'

// ============================================================================
// TYPES
// ============================================================================

export interface ElectronVaultStatus {
  isElectron: boolean
  vaultPath: string | null
  vaultName: string
  firstLaunchCompleted: boolean
  electronVaultInitialized: boolean
}

// ============================================================================
// DETECTION
// ============================================================================

/**
 * Check if we're running in Electron with vault support
 */
export function isElectronWithVault(): boolean {
  if (typeof window === 'undefined') return false
  return !!(window as any).electronAPI?.vault
}

/**
 * Get Electron vault status
 */
export async function getElectronVaultStatus(): Promise<ElectronVaultStatus | null> {
  if (!isElectronWithVault()) return null

  try {
    return await (window as any).electronAPI.vault.getStatus()
  } catch {
    return null
  }
}

// ============================================================================
// FILE OPERATIONS
// ============================================================================

/**
 * Read a file from the Electron vault
 */
export async function readElectronVaultFile(
  vaultPath: string,
  relativePath: string
): Promise<string | null> {
  if (!isElectronWithVault()) return null

  try {
    const fullPath = path.join(vaultPath, relativePath)
    const content = await (window as any).electronAPI.fs.readFile(fullPath)
    return content
  } catch (error) {
    console.warn('[ElectronVault] Failed to read file:', relativePath, error)
    return null
  }
}

/**
 * Write a file to the Electron vault
 */
export async function writeElectronVaultFile(
  vaultPath: string,
  relativePath: string,
  content: string
): Promise<boolean> {
  if (!isElectronWithVault()) return false

  try {
    const fullPath = path.join(vaultPath, relativePath)
    
    // Ensure directory exists
    const dirPath = path.dirname(fullPath)
    await (window as any).electronAPI.fs.mkdir(dirPath)
    
    // Write file
    await (window as any).electronAPI.fs.writeFile(fullPath, content)
    return true
  } catch (error) {
    console.warn('[ElectronVault] Failed to write file:', relativePath, error)
    return false
  }
}

/**
 * Check if a file exists in the Electron vault
 */
export async function existsInElectronVault(
  vaultPath: string,
  relativePath: string
): Promise<boolean> {
  if (!isElectronWithVault()) return false

  try {
    const fullPath = path.join(vaultPath, relativePath)
    return await (window as any).electronAPI.fs.exists(fullPath)
  } catch {
    return false
  }
}

/**
 * Delete a file from the Electron vault
 */
export async function deleteElectronVaultFile(
  vaultPath: string,
  relativePath: string
): Promise<boolean> {
  if (!isElectronWithVault()) return false

  try {
    const fullPath = path.join(vaultPath, relativePath)
    await (window as any).electronAPI.fs.delete(fullPath)
    return true
  } catch (error) {
    console.warn('[ElectronVault] Failed to delete file:', relativePath, error)
    return false
  }
}

/**
 * List files in a directory in the Electron vault
 */
export async function listElectronVaultDir(
  vaultPath: string,
  relativePath: string
): Promise<{ name: string; isDirectory: boolean }[] | null> {
  if (!isElectronWithVault()) return null

  try {
    const fullPath = path.join(vaultPath, relativePath)
    return await (window as any).electronAPI.fs.readDir(fullPath)
  } catch {
    return null
  }
}

/**
 * Recursively list all markdown files in the Electron vault
 */
export async function listAllElectronVaultFiles(
  vaultPath: string,
  relativePath: string = 'weaves'
): Promise<string[]> {
  if (!isElectronWithVault()) return []

  const files: string[] = []

  async function scanDir(dirPath: string): Promise<void> {
    const entries = await listElectronVaultDir(vaultPath, dirPath)
    if (!entries) return

    for (const entry of entries) {
      const entryPath = dirPath ? `${dirPath}/${entry.name}` : entry.name

      if (entry.isDirectory) {
        // Skip hidden directories
        if (entry.name.startsWith('.')) continue
        await scanDir(entryPath)
      } else if (entry.name.endsWith('.md')) {
        files.push(entryPath)
      }
    }
  }

  await scanDir(relativePath)
  return files
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  isElectronWithVault,
  getElectronVaultStatus,
  readElectronVaultFile,
  writeElectronVaultFile,
  existsInElectronVault,
  deleteElectronVaultFile,
  listElectronVaultDir,
  listAllElectronVaultFiles,
}

