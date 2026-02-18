/**
 * Media Storage Module - IndexedDB persistent blob storage with GitHub sync
 * @module lib/storage/mediaStorage
 *
 * Provides offline-first media storage with:
 * - IndexedDB for local blob persistence
 * - Sync queue for GitHub uploads when online
 * - Strand-based asset organization
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb'

// Database schema version
const DB_VERSION = 1
const DB_NAME = 'codex-media-store'

/** Media asset types */
export type MediaType = 'photo' | 'audio' | 'drawing' | 'upload' | 'video'

/** Sync status for media assets */
export type SyncStatus = 'pending' | 'syncing' | 'synced' | 'error'

/** Stored media asset */
export interface MediaStore {
  /** Unique identifier */
  id: string
  /** Path to the strand this media belongs to */
  strandPath: string
  /** Type of media */
  type: MediaType
  /** The actual blob data */
  blob: Blob
  /** Generated filename */
  filename: string
  /** Relative path in assets folder */
  relativePath: string
  /** MIME type */
  mimeType: string
  /** File size in bytes */
  size: number
  /** Creation timestamp */
  createdAt: Date
  /** Last sync attempt */
  lastSyncAttempt?: Date
  /** Current sync status */
  syncStatus: SyncStatus
  /** Error message if sync failed */
  syncError?: string
  /** Checksum for deduplication */
  checksum?: string
}

/** Sync queue item */
export interface SyncQueueItem {
  /** Queue item ID */
  id: string
  /** Reference to media ID */
  mediaId: string
  /** Operation type */
  operation: 'upload' | 'delete'
  /** Number of retry attempts */
  retryCount: number
  /** Last attempt timestamp */
  lastAttempt?: Date
  /** Created timestamp */
  createdAt: Date
}

/** Input for storing new media */
export interface MediaAssetInput {
  type: MediaType
  blob: Blob
  filename: string
  path: string
}

/** IndexedDB schema */
interface MediaDBSchema extends DBSchema {
  media: {
    key: string
    value: MediaStore
    indexes: {
      'by-strand': string
      'by-sync-status': SyncStatus
      'by-created': Date
    }
  }
  syncQueue: {
    key: string
    value: SyncQueueItem
    indexes: {
      'by-media': string
      'by-created': Date
    }
  }
}

// Database instance (singleton)
let dbInstance: IDBPDatabase<MediaDBSchema> | null = null

/**
 * Get or create database instance
 */
async function getDB(): Promise<IDBPDatabase<MediaDBSchema>> {
  if (dbInstance) return dbInstance

  dbInstance = await openDB<MediaDBSchema>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Media store
      if (!db.objectStoreNames.contains('media')) {
        const mediaStore = db.createObjectStore('media', { keyPath: 'id' })
        mediaStore.createIndex('by-strand', 'strandPath')
        mediaStore.createIndex('by-sync-status', 'syncStatus')
        mediaStore.createIndex('by-created', 'createdAt')
      }

      // Sync queue
      if (!db.objectStoreNames.contains('syncQueue')) {
        const syncStore = db.createObjectStore('syncQueue', { keyPath: 'id' })
        syncStore.createIndex('by-media', 'mediaId')
        syncStore.createIndex('by-created', 'createdAt')
      }
    },
  })

  return dbInstance
}

/**
 * Generate a UUID
 */
function generateId(): string {
  return crypto.randomUUID()
}

/**
 * Calculate simple checksum for blob
 */
async function calculateChecksum(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer()
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16)
}

/**
 * Store a media asset in IndexedDB
 */
export async function storeMedia(
  asset: MediaAssetInput,
  strandPath: string
): Promise<MediaStore> {
  const db = await getDB()
  const id = generateId()
  const checksum = await calculateChecksum(asset.blob)

  const mediaEntry: MediaStore = {
    id,
    strandPath,
    type: asset.type,
    blob: asset.blob,
    filename: asset.filename,
    relativePath: asset.path,
    mimeType: asset.blob.type,
    size: asset.blob.size,
    createdAt: new Date(),
    syncStatus: 'pending',
    checksum,
  }

  // Store the media
  await db.put('media', mediaEntry)

  // Add to sync queue
  const queueItem: SyncQueueItem = {
    id: generateId(),
    mediaId: id,
    operation: 'upload',
    retryCount: 0,
    createdAt: new Date(),
  }
  await db.put('syncQueue', queueItem)

  return mediaEntry
}

/**
 * Get all media for a specific strand
 */
export async function getStrandMedia(strandPath: string): Promise<MediaStore[]> {
  const db = await getDB()
  return db.getAllFromIndex('media', 'by-strand', strandPath)
}

/**
 * Get a single media asset by ID
 */
export async function getMedia(id: string): Promise<MediaStore | undefined> {
  const db = await getDB()
  return db.get('media', id)
}

/**
 * Get all media with pending sync status
 */
export async function getPendingMedia(): Promise<MediaStore[]> {
  const db = await getDB()
  return db.getAllFromIndex('media', 'by-sync-status', 'pending')
}

/**
 * Mark media for deletion (adds to sync queue for remote delete)
 */
export async function deleteMedia(id: string): Promise<void> {
  const db = await getDB()

  const media = await db.get('media', id)
  if (!media) return

  // If already synced, add delete to queue
  if (media.syncStatus === 'synced') {
    const queueItem: SyncQueueItem = {
      id: generateId(),
      mediaId: id,
      operation: 'delete',
      retryCount: 0,
      createdAt: new Date(),
    }
    await db.put('syncQueue', queueItem)
  }

  // Remove from local store
  await db.delete('media', id)

  // Remove any pending upload queue items for this media
  const tx = db.transaction('syncQueue', 'readwrite')
  const index = tx.store.index('by-media')
  const cursor = await index.openCursor(id)

  while (cursor) {
    if (cursor.value.operation === 'upload') {
      await cursor.delete()
    }
    await cursor.continue()
  }
}

/**
 * Get all pending sync queue items
 */
export async function getPendingSyncs(): Promise<SyncQueueItem[]> {
  const db = await getDB()
  return db.getAll('syncQueue')
}

/**
 * Update sync status for a media asset
 */
export async function updateSyncStatus(
  id: string,
  status: SyncStatus,
  error?: string
): Promise<void> {
  const db = await getDB()
  const media = await db.get('media', id)

  if (!media) return

  media.syncStatus = status
  media.lastSyncAttempt = new Date()
  if (error) {
    media.syncError = error
  } else {
    delete media.syncError
  }

  await db.put('media', media)
}

/**
 * Remove item from sync queue after successful sync
 */
export async function removeSyncQueueItem(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('syncQueue', id)
}

/**
 * Increment retry count for a sync queue item
 */
export async function incrementRetryCount(id: string): Promise<void> {
  const db = await getDB()
  const item = await db.get('syncQueue', id)

  if (!item) return

  item.retryCount++
  item.lastAttempt = new Date()
  await db.put('syncQueue', item)
}

/**
 * Process sync queue - upload/delete pending items to GitHub
 * @param uploadFn - Function to upload blob to GitHub
 * @param deleteFn - Function to delete file from GitHub
 */
export async function processSyncQueue(
  uploadFn: (blob: Blob, path: string) => Promise<boolean>,
  deleteFn: (path: string) => Promise<boolean>
): Promise<{ uploaded: number; deleted: number; failed: number }> {
  const db = await getDB()
  const queue = await getPendingSyncs()

  let uploaded = 0
  let deleted = 0
  let failed = 0

  for (const item of queue) {
    // Skip if too many retries
    if (item.retryCount >= 3) {
      continue
    }

    try {
      if (item.operation === 'upload') {
        const media = await getMedia(item.mediaId)
        if (!media) {
          // Media was deleted, remove queue item
          await removeSyncQueueItem(item.id)
          continue
        }

        await updateSyncStatus(media.id, 'syncing')
        const success = await uploadFn(media.blob, media.relativePath)

        if (success) {
          await updateSyncStatus(media.id, 'synced')
          await removeSyncQueueItem(item.id)
          uploaded++
        } else {
          await updateSyncStatus(media.id, 'error', 'Upload failed')
          await incrementRetryCount(item.id)
          failed++
        }
      } else if (item.operation === 'delete') {
        const media = await getMedia(item.mediaId)
        const path = media?.relativePath || ''

        if (path) {
          const success = await deleteFn(path)
          if (success) {
            await removeSyncQueueItem(item.id)
            deleted++
          } else {
            await incrementRetryCount(item.id)
            failed++
          }
        } else {
          // No path, just remove queue item
          await removeSyncQueueItem(item.id)
        }
      }
    } catch (error) {
      console.error('[mediaStorage] Sync error:', error)
      await incrementRetryCount(item.id)
      failed++
    }
  }

  return { uploaded, deleted, failed }
}

/**
 * Find orphaned media (referenced in DB but not in markdown content)
 */
export async function findOrphanedMedia(
  strandPath: string,
  markdownContent: string
): Promise<MediaStore[]> {
  const strandMedia = await getStrandMedia(strandPath)

  return strandMedia.filter(media => {
    // Check if the asset path is referenced in the content
    const isReferenced =
      markdownContent.includes(media.relativePath) ||
      markdownContent.includes(media.filename) ||
      markdownContent.includes(`./${media.relativePath}`)

    return !isReferenced
  })
}

/**
 * Cleanup orphaned media for a strand
 */
export async function cleanupOrphanedMedia(
  strandPath: string,
  markdownContent: string
): Promise<number> {
  const orphans = await findOrphanedMedia(strandPath, markdownContent)

  for (const orphan of orphans) {
    await deleteMedia(orphan.id)
  }

  return orphans.length
}

/**
 * Get total storage usage
 */
export async function getStorageStats(): Promise<{
  totalSize: number
  mediaCount: number
  pendingCount: number
  syncedCount: number
}> {
  const db = await getDB()
  const allMedia = await db.getAll('media')
  const pending = allMedia.filter(m => m.syncStatus === 'pending')
  const synced = allMedia.filter(m => m.syncStatus === 'synced')

  return {
    totalSize: allMedia.reduce((sum, m) => sum + m.size, 0),
    mediaCount: allMedia.length,
    pendingCount: pending.length,
    syncedCount: synced.length,
  }
}

/**
 * Clear all media for a strand
 */
export async function clearStrandMedia(strandPath: string): Promise<void> {
  const strandMedia = await getStrandMedia(strandPath)

  for (const media of strandMedia) {
    await deleteMedia(media.id)
  }
}

/**
 * Export media to data URL (for markdown embedding)
 */
export async function mediaToDataUrl(id: string): Promise<string | null> {
  const media = await getMedia(id)
  if (!media) return null

  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(media.blob)
  })
}

export default {
  storeMedia,
  getMedia,
  getStrandMedia,
  getPendingMedia,
  deleteMedia,
  getPendingSyncs,
  processSyncQueue,
  updateSyncStatus,
  findOrphanedMedia,
  cleanupOrphanedMedia,
  getStorageStats,
  clearStrandMedia,
  mediaToDataUrl,
}
