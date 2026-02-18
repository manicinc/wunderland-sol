/**
 * Conflict Resolver
 * @module lib/publish/conflictResolver
 *
 * Detects and resolves conflicts between local content and remote GitHub content.
 * Supports multiple resolution strategies including keep-local, keep-remote, merge, and skip.
 */

import type {
  ConflictInfo,
  ConflictResolution,
  ConflictResolutionResult,
  PublishableContentType,
  PublishableItem,
} from './types'
import { hashContent } from './constants'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Remote file info from GitHub
 */
export interface RemoteFileInfo {
  path: string
  sha: string
  content: string
  encoding: 'utf-8' | 'base64'
  lastModified?: string
}

/**
 * Conflict check result
 */
export interface ConflictCheckResult {
  hasConflict: boolean
  conflict?: ConflictInfo
  remoteContent?: string
  remoteSha?: string
}

// ============================================================================
// CONFLICT DETECTION
// ============================================================================

/**
 * Check if a local item conflicts with a remote file
 */
export function checkConflict(
  localItem: PublishableItem,
  remoteFile: RemoteFileInfo | null
): ConflictCheckResult {
  // No remote file = no conflict (will be created)
  if (!remoteFile) {
    return { hasConflict: false }
  }

  // Decode remote content if base64
  let remoteContent = remoteFile.content
  if (remoteFile.encoding === 'base64') {
    try {
      remoteContent = atob(remoteFile.content)
    } catch {
      // If decoding fails, assume conflict to be safe
      return {
        hasConflict: true,
        conflict: {
          contentType: localItem.type,
          contentId: localItem.id,
          contentPath: localItem.path,
          localHash: localItem.contentHash,
          remoteHash: remoteFile.sha,
          localContent: localItem.content,
          remoteContent: undefined,
          localUpdatedAt: localItem.updatedAt,
          remoteUpdatedAt: remoteFile.lastModified,
        },
        remoteSha: remoteFile.sha,
      }
    }
  }

  // Calculate remote content hash
  const remoteHash = hashContent(remoteContent)

  // If hashes match, no conflict
  if (localItem.contentHash === remoteHash) {
    return { hasConflict: false, remoteContent, remoteSha: remoteFile.sha }
  }

  // If local was previously published with a different hash, it's a conflict
  // (both local and remote have changed since last sync)
  return {
    hasConflict: true,
    conflict: {
      contentType: localItem.type,
      contentId: localItem.id,
      contentPath: localItem.path,
      localHash: localItem.contentHash,
      remoteHash,
      localContent: localItem.content,
      remoteContent,
      localUpdatedAt: localItem.updatedAt,
      remoteUpdatedAt: remoteFile.lastModified,
    },
    remoteContent,
    remoteSha: remoteFile.sha,
  }
}

/**
 * Check multiple items for conflicts
 */
export function checkConflicts(
  localItems: PublishableItem[],
  remoteFiles: Map<string, RemoteFileInfo>
): ConflictInfo[] {
  const conflicts: ConflictInfo[] = []

  for (const item of localItems) {
    const remoteFile = remoteFiles.get(item.path) || null
    const result = checkConflict(item, remoteFile)

    if (result.hasConflict && result.conflict) {
      conflicts.push(result.conflict)
    }
  }

  return conflicts
}

// ============================================================================
// CONFLICT RESOLUTION
// ============================================================================

/**
 * Resolve a conflict using the specified strategy
 */
export function resolveConflict(
  conflict: ConflictInfo,
  resolution: ConflictResolution
): ConflictResolutionResult {
  try {
    switch (resolution) {
      case 'keep-local':
        return {
          contentId: conflict.contentId,
          resolution,
          resolvedContent: conflict.localContent,
          success: true,
        }

      case 'keep-remote':
        return {
          contentId: conflict.contentId,
          resolution,
          resolvedContent: conflict.remoteContent,
          success: true,
        }

      case 'merge':
        const mergeResult = attemptMerge(conflict.localContent, conflict.remoteContent)
        if (mergeResult.success) {
          return {
            contentId: conflict.contentId,
            resolution,
            resolvedContent: mergeResult.content,
            success: true,
          }
        } else {
          return {
            contentId: conflict.contentId,
            resolution,
            success: false,
            error: mergeResult.error || 'Automatic merge failed',
          }
        }

      case 'skip':
        return {
          contentId: conflict.contentId,
          resolution,
          success: true,
        }

      default:
        return {
          contentId: conflict.contentId,
          resolution,
          success: false,
          error: `Unknown resolution strategy: ${resolution}`,
        }
    }
  } catch (error) {
    return {
      contentId: conflict.contentId,
      resolution,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during resolution',
    }
  }
}

/**
 * Resolve multiple conflicts
 */
export function resolveConflicts(
  conflicts: ConflictInfo[],
  resolutions: Record<string, ConflictResolution>
): ConflictResolutionResult[] {
  return conflicts.map(conflict => {
    const resolution = resolutions[conflict.contentId] || 'skip'
    return resolveConflict(conflict, resolution)
  })
}

// ============================================================================
// MERGE STRATEGIES
// ============================================================================

interface MergeResult {
  success: boolean
  content?: string
  error?: string
}

/**
 * Attempt to automatically merge local and remote content
 * Uses a simple line-based merge strategy
 */
function attemptMerge(
  localContent: string,
  remoteContent: string | undefined
): MergeResult {
  if (!remoteContent) {
    // No remote content to merge with
    return { success: true, content: localContent }
  }

  // Parse frontmatter from both versions
  const localParts = splitFrontmatter(localContent)
  const remoteParts = splitFrontmatter(remoteContent)

  // Merge frontmatter (prefer local values, but include remote-only keys)
  const mergedFrontmatter = mergeFrontmatter(
    localParts.frontmatter,
    remoteParts.frontmatter
  )

  // Try to merge content bodies
  const bodyMergeResult = mergeContentBodies(localParts.body, remoteParts.body)

  if (!bodyMergeResult.success) {
    return bodyMergeResult
  }

  // Reconstruct the document
  let mergedContent = ''
  if (mergedFrontmatter) {
    mergedContent = `---\n${mergedFrontmatter}\n---\n\n`
  }
  mergedContent += bodyMergeResult.content

  return { success: true, content: mergedContent }
}

/**
 * Split content into frontmatter and body
 */
function splitFrontmatter(content: string): {
  frontmatter: string
  body: string
} {
  const match = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/)

  if (!match) {
    return { frontmatter: '', body: content }
  }

  return { frontmatter: match[1], body: match[2] }
}

/**
 * Merge two frontmatter sections
 * Prefers local values but includes remote-only keys
 */
function mergeFrontmatter(
  localFrontmatter: string,
  remoteFrontmatter: string
): string {
  if (!localFrontmatter && !remoteFrontmatter) {
    return ''
  }
  if (!remoteFrontmatter) {
    return localFrontmatter
  }
  if (!localFrontmatter) {
    return remoteFrontmatter
  }

  // Parse frontmatter lines into key-value pairs
  const localMap = parseFrontmatterToMap(localFrontmatter)
  const remoteMap = parseFrontmatterToMap(remoteFrontmatter)

  // Merge: local values take precedence, but include remote-only keys
  const mergedMap = new Map(localMap)
  for (const [key, value] of remoteMap) {
    if (!mergedMap.has(key)) {
      mergedMap.set(key, value)
    }
  }

  // Reconstruct frontmatter
  const lines: string[] = []
  for (const [key, value] of mergedMap) {
    lines.push(`${key}: ${value}`)
  }

  return lines.join('\n')
}

/**
 * Parse frontmatter into a Map
 */
function parseFrontmatterToMap(frontmatter: string): Map<string, string> {
  const map = new Map<string, string>()
  const lines = frontmatter.split('\n')

  for (const line of lines) {
    const colonIndex = line.indexOf(':')
    if (colonIndex > 0) {
      const key = line.slice(0, colonIndex).trim()
      const value = line.slice(colonIndex + 1).trim()
      map.set(key, value)
    }
  }

  return map
}

/**
 * Merge content bodies using a simple strategy
 */
function mergeContentBodies(
  localBody: string,
  remoteBody: string
): MergeResult {
  // If bodies are identical, no merge needed
  if (localBody.trim() === remoteBody.trim()) {
    return { success: true, content: localBody }
  }

  // Split into sections (by ## headers)
  const localSections = splitIntoSections(localBody)
  const remoteSections = splitIntoSections(remoteBody)

  // If section structure matches, try section-by-section merge
  if (localSections.length === remoteSections.length) {
    const mergedSections: string[] = []

    for (let i = 0; i < localSections.length; i++) {
      const localSection = localSections[i]
      const remoteSection = remoteSections[i]

      // If section headers match, prefer local content (user's edits)
      if (getSectionHeader(localSection) === getSectionHeader(remoteSection)) {
        mergedSections.push(localSection)
      } else {
        // Section structure differs - can't auto-merge
        return {
          success: false,
          error: 'Content structure differs between versions',
        }
      }
    }

    return { success: true, content: mergedSections.join('\n\n') }
  }

  // Different number of sections - can't auto-merge
  // Fall back to keeping local (user's edits take precedence)
  return {
    success: true,
    content: localBody,
  }
}

/**
 * Split content into sections by ## headers
 */
function splitIntoSections(content: string): string[] {
  const sections: string[] = []
  const lines = content.split('\n')
  let currentSection: string[] = []

  for (const line of lines) {
    if (line.startsWith('## ') && currentSection.length > 0) {
      sections.push(currentSection.join('\n'))
      currentSection = [line]
    } else {
      currentSection.push(line)
    }
  }

  if (currentSection.length > 0) {
    sections.push(currentSection.join('\n'))
  }

  return sections
}

/**
 * Get the header of a section
 */
function getSectionHeader(section: string): string {
  const firstLine = section.split('\n')[0]
  if (firstLine.startsWith('## ')) {
    return firstLine.slice(3).trim()
  }
  return ''
}

// ============================================================================
// CONFLICT DISPLAY HELPERS
// ============================================================================

/**
 * Generate a simple diff display between two versions
 */
export function generateDiffDisplay(
  localContent: string,
  remoteContent: string
): string {
  const localLines = localContent.split('\n')
  const remoteLines = remoteContent.split('\n')

  const output: string[] = []
  const maxLines = Math.max(localLines.length, remoteLines.length)

  output.push('```diff')
  output.push('--- Local')
  output.push('+++ Remote')
  output.push('')

  for (let i = 0; i < maxLines; i++) {
    const localLine = localLines[i] ?? ''
    const remoteLine = remoteLines[i] ?? ''

    if (localLine === remoteLine) {
      output.push(`  ${localLine}`)
    } else if (!localLines[i]) {
      output.push(`+ ${remoteLine}`)
    } else if (!remoteLines[i]) {
      output.push(`- ${localLine}`)
    } else {
      output.push(`- ${localLine}`)
      output.push(`+ ${remoteLine}`)
    }
  }

  output.push('```')

  return output.join('\n')
}

/**
 * Get a summary of the conflict for display
 */
export function getConflictSummary(conflict: ConflictInfo): {
  type: string
  path: string
  localPreview: string
  remotePreview: string
  recommendation: ConflictResolution
} {
  const typeLabel = conflict.contentType.charAt(0).toUpperCase() + conflict.contentType.slice(1)

  // Get preview of content (first 100 chars of body)
  const localPreview = getContentPreview(conflict.localContent)
  const remotePreview = conflict.remoteContent
    ? getContentPreview(conflict.remoteContent)
    : '(No remote content)'

  // Recommend based on timestamps if available
  let recommendation: ConflictResolution = 'keep-local'
  if (conflict.localUpdatedAt && conflict.remoteUpdatedAt) {
    const localTime = new Date(conflict.localUpdatedAt).getTime()
    const remoteTime = new Date(conflict.remoteUpdatedAt).getTime()
    recommendation = localTime > remoteTime ? 'keep-local' : 'keep-remote'
  }

  return {
    type: typeLabel,
    path: conflict.contentPath,
    localPreview,
    remotePreview,
    recommendation,
  }
}

/**
 * Get a preview of content
 */
function getContentPreview(content: string, maxLength = 100): string {
  // Remove frontmatter
  const { body } = splitFrontmatter(content)

  // Get first meaningful line
  const lines = body.trim().split('\n').filter(l => l.trim() && !l.startsWith('#'))
  const firstLine = lines[0] || ''

  if (firstLine.length <= maxLength) {
    return firstLine
  }

  return firstLine.slice(0, maxLength - 3) + '...'
}

// ============================================================================
// AUTO-RESOLUTION HELPERS
// ============================================================================

/**
 * Check if a conflict can be auto-resolved
 */
export function canAutoResolve(conflict: ConflictInfo): boolean {
  // Can auto-resolve if:
  // 1. Only frontmatter differs (content body is same)
  // 2. Only one side has changes

  if (!conflict.remoteContent) {
    return true // No remote = just create
  }

  const localParts = splitFrontmatter(conflict.localContent)
  const remoteParts = splitFrontmatter(conflict.remoteContent)

  // If bodies are identical, we can auto-merge frontmatter
  if (localParts.body.trim() === remoteParts.body.trim()) {
    return true
  }

  return false
}

/**
 * Attempt auto-resolution of a conflict
 */
export function tryAutoResolve(conflict: ConflictInfo): ConflictResolutionResult {
  if (!canAutoResolve(conflict)) {
    return {
      contentId: conflict.contentId,
      resolution: 'skip',
      success: false,
      error: 'Conflict requires manual resolution',
    }
  }

  // Attempt merge
  return resolveConflict(conflict, 'merge')
}

/**
 * Get conflicts that require manual resolution
 */
export function getManualConflicts(conflicts: ConflictInfo[]): ConflictInfo[] {
  return conflicts.filter(c => !canAutoResolve(c))
}

/**
 * Get conflicts that can be auto-resolved
 */
export function getAutoResolvableConflicts(conflicts: ConflictInfo[]): ConflictInfo[] {
  return conflicts.filter(c => canAutoResolve(c))
}
