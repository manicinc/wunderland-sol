/**
 * @file AttachmentStorage.ts
 * @description Storage utilities for diary entry attachments
 * Handles localStorage-based storage with support for inline and referenced attachments
 * @version 1.0.0
 */

import type {
  DiaryAttachment,
  CanvasAttachment,
  AttachmentStorageConfig,
  AttachmentExportOptions,
  CanvasMetadata,
} from './AttachmentTypes'
import {
  DEFAULT_ATTACHMENT_CONFIG,
  generateAttachmentId,
  getMimeType,
  shouldStoreInline,
} from './AttachmentTypes'

// Storage keys
const STORAGE_KEY_PREFIX = 'diary-attachment-'
const STORAGE_INDEX_KEY = 'diary-attachments-index'

/**
 * Attachment index entry for quick lookups
 */
interface AttachmentIndexEntry {
  id: string
  entryId: string
  type: string
  createdAt: string
  size?: number
}

/**
 * Get the storage key for an attachment
 */
function getStorageKey(attachmentId: string): string {
  return `${STORAGE_KEY_PREFIX}${attachmentId}`
}

/**
 * Get attachment index from localStorage
 */
function getAttachmentIndex(): Record<string, AttachmentIndexEntry> {
  try {
    const data = localStorage.getItem(STORAGE_INDEX_KEY)
    return data ? JSON.parse(data) : {}
  } catch {
    return {}
  }
}

/**
 * Save attachment index to localStorage
 */
function saveAttachmentIndex(index: Record<string, AttachmentIndexEntry>): void {
  localStorage.setItem(STORAGE_INDEX_KEY, JSON.stringify(index))
}

/**
 * Create a new canvas attachment from tldraw data
 */
export function createCanvasAttachment(
  entryId: string,
  canvasData: string,
  options: {
    title?: string
    previewImage?: string
    svgExport?: string
  } = {}
): CanvasAttachment {
  const now = new Date().toISOString()
  const id = generateAttachmentId('canvas')

  // Parse canvas data to extract metadata
  let metadata: CanvasMetadata = {}
  try {
    const parsed = JSON.parse(canvasData)
    if (parsed.document?.store) {
      const shapes = Object.values(parsed.document.store).filter(
        (item: any) => item.typeName === 'shape'
      )
      metadata = {
        shapeCount: shapes.length,
        hasHandwriting: shapes.some((s: any) => s.type === 'draw'),
        hasText: shapes.some((s: any) => s.type === 'text'),
      }
    }
  } catch {
    // Ignore parsing errors
  }

  const attachment: CanvasAttachment = {
    id,
    type: 'canvas',
    format: 'tldraw-json',
    path: `${entryId}/.attachments/${id}.tldraw`,
    inlineData: canvasData,
    title: options.title || 'Canvas',
    createdAt: now,
    updatedAt: now,
    size: new Blob([canvasData]).size,
    mimeType: 'application/json',
    metadata,
    position: 'end',
    anchor: id,
    previewImage: options.previewImage,
    svgExport: options.svgExport,
  }

  return attachment
}

/**
 * Store an attachment in localStorage
 */
export function storeAttachment(
  entryId: string,
  attachment: DiaryAttachment,
  config: AttachmentStorageConfig = DEFAULT_ATTACHMENT_CONFIG
): DiaryAttachment {
  const key = getStorageKey(attachment.id)

  // Determine if we should store inline or as reference
  const size = attachment.size || (attachment.inlineData ? new Blob([attachment.inlineData]).size : 0)

  if (shouldStoreInline(size, config)) {
    // Store inline - data is already in the attachment
    localStorage.setItem(key, JSON.stringify(attachment))
  } else {
    // For larger files, store separately
    // In a real implementation, this would upload to cloud storage
    localStorage.setItem(key, JSON.stringify(attachment))
  }

  // Update index
  const index = getAttachmentIndex()
  index[attachment.id] = {
    id: attachment.id,
    entryId,
    type: attachment.type,
    createdAt: attachment.createdAt,
    size,
  }
  saveAttachmentIndex(index)

  return attachment
}

/**
 * Retrieve an attachment from localStorage
 */
export function getAttachment(attachmentId: string): DiaryAttachment | null {
  try {
    const key = getStorageKey(attachmentId)
    const data = localStorage.getItem(key)
    return data ? JSON.parse(data) : null
  } catch {
    return null
  }
}

/**
 * Retrieve all attachments for a diary entry
 */
export function getEntryAttachments(entryId: string): DiaryAttachment[] {
  const index = getAttachmentIndex()
  const attachmentIds = Object.values(index)
    .filter(entry => entry.entryId === entryId)
    .map(entry => entry.id)

  return attachmentIds
    .map(id => getAttachment(id))
    .filter((a): a is DiaryAttachment => a !== null)
}

/**
 * Delete an attachment from localStorage
 */
export function deleteAttachment(attachmentId: string): boolean {
  try {
    const key = getStorageKey(attachmentId)
    localStorage.removeItem(key)

    // Update index
    const index = getAttachmentIndex()
    delete index[attachmentId]
    saveAttachmentIndex(index)

    return true
  } catch {
    return false
  }
}

/**
 * Delete all attachments for a diary entry
 */
export function deleteEntryAttachments(entryId: string): number {
  const attachments = getEntryAttachments(entryId)
  let deleted = 0

  attachments.forEach(attachment => {
    if (deleteAttachment(attachment.id)) {
      deleted++
    }
  })

  return deleted
}

/**
 * Update an attachment
 */
export function updateAttachment(
  attachment: DiaryAttachment
): DiaryAttachment | null {
  try {
    const existing = getAttachment(attachment.id)
    if (!existing) return null

    const updated: DiaryAttachment = {
      ...existing,
      ...attachment,
      updatedAt: new Date().toISOString(),
    }

    const key = getStorageKey(attachment.id)
    localStorage.setItem(key, JSON.stringify(updated))

    return updated
  } catch {
    return null
  }
}

/**
 * Migrate legacy canvasData to new attachment system
 */
export function migrateCanvasDataToAttachment(
  entryId: string,
  canvasData: string
): CanvasAttachment | null {
  if (!canvasData) return null

  try {
    const attachment = createCanvasAttachment(entryId, canvasData)
    storeAttachment(entryId, attachment)
    return attachment
  } catch {
    return null
  }
}

/**
 * Get canvas data from attachment (for backward compatibility)
 */
export function getCanvasDataFromAttachment(
  attachment: CanvasAttachment
): string | null {
  return attachment.inlineData || null
}

/**
 * Export attachment to different format
 */
export async function exportAttachment(
  attachment: DiaryAttachment,
  options: AttachmentExportOptions
): Promise<Blob | string | null> {
  if (attachment.type !== 'canvas') {
    // For non-canvas attachments, return the inline data or fetch from path
    return attachment.inlineData || null
  }

  const canvasAttachment = attachment as CanvasAttachment

  switch (options.format) {
    case 'png':
      // Return pre-generated PNG preview if available
      if (canvasAttachment.previewImage) {
        // Convert base64 to blob
        const base64 = canvasAttachment.previewImage.split(',')[1]
        const binary = atob(base64)
        const bytes = new Uint8Array(binary.length)
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i)
        }
        return new Blob([bytes], { type: 'image/png' })
      }
      return null

    case 'svg':
      // Return pre-generated SVG if available
      if (canvasAttachment.svgExport) {
        return new Blob([canvasAttachment.svgExport], { type: 'image/svg+xml' })
      }
      return null

    case 'markdown':
      // Generate markdown representation
      return generateCanvasMarkdown(canvasAttachment)

    default:
      return canvasAttachment.inlineData || null
  }
}

/**
 * Generate markdown representation of canvas
 */
function generateCanvasMarkdown(canvas: CanvasAttachment): string {
  const lines: string[] = []

  lines.push(`## ${canvas.title || 'Canvas'}`)
  lines.push('')

  if (canvas.previewImage) {
    lines.push(`![Canvas Preview](${canvas.previewImage})`)
    lines.push('')
  }

  if (canvas.metadata) {
    const meta = canvas.metadata as CanvasMetadata
    if (meta.shapeCount) {
      lines.push(`*${meta.shapeCount} shapes*`)
    }
    if (meta.hasHandwriting) {
      lines.push(`*Contains handwriting*`)
    }
  }

  lines.push('')
  lines.push(`<details>`)
  lines.push(`<summary>Canvas Data (tldraw JSON)</summary>`)
  lines.push('')
  lines.push('```json')
  lines.push(canvas.inlineData || '{}')
  lines.push('```')
  lines.push(`</details>`)

  return lines.join('\n')
}

/**
 * Calculate total storage used by attachments
 */
export function getAttachmentStorageStats(): {
  totalSize: number
  count: number
  byType: Record<string, { count: number; size: number }>
} {
  const index = getAttachmentIndex()
  const stats = {
    totalSize: 0,
    count: 0,
    byType: {} as Record<string, { count: number; size: number }>,
  }

  Object.values(index).forEach(entry => {
    stats.count++
    stats.totalSize += entry.size || 0

    if (!stats.byType[entry.type]) {
      stats.byType[entry.type] = { count: 0, size: 0 }
    }
    stats.byType[entry.type].count++
    stats.byType[entry.type].size += entry.size || 0
  })

  return stats
}

/**
 * Clean up orphaned attachments (attachments without valid entry references)
 */
export function cleanupOrphanedAttachments(
  validEntryIds: Set<string>
): number {
  const index = getAttachmentIndex()
  let cleaned = 0

  Object.values(index).forEach(entry => {
    if (!validEntryIds.has(entry.entryId)) {
      deleteAttachment(entry.id)
      cleaned++
    }
  })

  return cleaned
}
