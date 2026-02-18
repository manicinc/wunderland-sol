/**
 * Local Embedding Store - IndexedDB storage for dynamically generated embeddings
 * @module search/embeddingStore
 *
 * Stores embeddings for local strands that are created/edited by the user.
 * These are merged with pre-computed embeddings during search.
 */

import type { EmbeddingEntry } from './semanticSearch'

const DB_NAME = 'codex-embeddings'
const DB_VERSION = 1
const STORE_NAME = 'embeddings'

/**
 * Stored embedding with content hash for change detection
 */
export interface StoredEmbedding extends EmbeddingEntry {
  contentHash: string
  updatedAt: string
  isLocal: true // Mark as locally generated
}

/**
 * Simple hash function for content change detection
 */
export function hashContent(content: string): string {
  let hash = 0
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return hash.toString(16)
}

/**
 * Open or create the IndexedDB database
 */
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB not available'))
      return
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => {
      console.error('[EmbeddingStore] Failed to open database:', request.error)
      reject(request.error)
    }

    request.onsuccess = () => {
      resolve(request.result)
    }

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result

      // Create embeddings store if it doesn't exist
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        store.createIndex('path', 'path', { unique: false })
        store.createIndex('contentHash', 'contentHash', { unique: false })
        store.createIndex('updatedAt', 'updatedAt', { unique: false })
        console.info('[EmbeddingStore] Created embeddings store')
      }
    }
  })
}

/**
 * Save an embedding to the local store
 */
export async function saveLocalEmbedding(
  entry: Omit<StoredEmbedding, 'isLocal'>
): Promise<void> {
  try {
    const db = await openDatabase()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)

    const storedEntry: StoredEmbedding = {
      ...entry,
      isLocal: true,
    }

    return new Promise((resolve, reject) => {
      const request = store.put(storedEntry)

      request.onsuccess = () => {
        console.info(`[EmbeddingStore] Saved embedding for: ${entry.path}`)
        resolve()
      }

      request.onerror = () => {
        console.error('[EmbeddingStore] Failed to save embedding:', request.error)
        reject(request.error)
      }

      tx.oncomplete = () => db.close()
    })
  } catch (error) {
    console.error('[EmbeddingStore] saveLocalEmbedding error:', error)
    throw error
  }
}

/**
 * Get an embedding by ID (path)
 */
export async function getLocalEmbedding(id: string): Promise<StoredEmbedding | null> {
  try {
    const db = await openDatabase()
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)

    return new Promise((resolve, reject) => {
      const request = store.get(id)

      request.onsuccess = () => {
        resolve(request.result || null)
      }

      request.onerror = () => {
        console.error('[EmbeddingStore] Failed to get embedding:', request.error)
        reject(request.error)
      }

      tx.oncomplete = () => db.close()
    })
  } catch (error) {
    console.error('[EmbeddingStore] getLocalEmbedding error:', error)
    return null
  }
}

/**
 * Check if embedding needs to be regenerated based on content hash
 */
export async function needsRegeneration(id: string, contentHash: string): Promise<boolean> {
  const existing = await getLocalEmbedding(id)
  if (!existing) return true
  return existing.contentHash !== contentHash
}

/**
 * Delete an embedding by ID
 */
export async function deleteLocalEmbedding(id: string): Promise<void> {
  try {
    const db = await openDatabase()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)

    return new Promise((resolve, reject) => {
      const request = store.delete(id)

      request.onsuccess = () => {
        console.info(`[EmbeddingStore] Deleted embedding for: ${id}`)
        resolve()
      }

      request.onerror = () => {
        console.error('[EmbeddingStore] Failed to delete embedding:', request.error)
        reject(request.error)
      }

      tx.oncomplete = () => db.close()
    })
  } catch (error) {
    console.error('[EmbeddingStore] deleteLocalEmbedding error:', error)
    throw error
  }
}

/**
 * Get all local embeddings
 */
export async function getAllLocalEmbeddings(): Promise<Map<string, StoredEmbedding>> {
  try {
    const db = await openDatabase()
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)

    return new Promise((resolve, reject) => {
      const request = store.getAll()

      request.onsuccess = () => {
        const embeddings = new Map<string, StoredEmbedding>()
        for (const entry of (request.result || [])) {
          embeddings.set(entry.id, entry)
        }
        console.info(`[EmbeddingStore] Loaded ${embeddings.size} local embeddings`)
        resolve(embeddings)
      }

      request.onerror = () => {
        console.error('[EmbeddingStore] Failed to get all embeddings:', request.error)
        reject(request.error)
      }

      tx.oncomplete = () => db.close()
    })
  } catch (error) {
    console.error('[EmbeddingStore] getAllLocalEmbeddings error:', error)
    return new Map()
  }
}

/**
 * Get count of local embeddings
 */
export async function getLocalEmbeddingCount(): Promise<number> {
  try {
    const db = await openDatabase()
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)

    return new Promise((resolve, reject) => {
      const request = store.count()

      request.onsuccess = () => {
        resolve(request.result)
      }

      request.onerror = () => {
        console.error('[EmbeddingStore] Failed to count embeddings:', request.error)
        reject(request.error)
      }

      tx.oncomplete = () => db.close()
    })
  } catch (error) {
    console.error('[EmbeddingStore] getLocalEmbeddingCount error:', error)
    return 0
  }
}

/**
 * Clear all local embeddings
 */
export async function clearLocalEmbeddings(): Promise<void> {
  try {
    const db = await openDatabase()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)

    return new Promise((resolve, reject) => {
      const request = store.clear()

      request.onsuccess = () => {
        console.info('[EmbeddingStore] Cleared all local embeddings')
        resolve()
      }

      request.onerror = () => {
        console.error('[EmbeddingStore] Failed to clear embeddings:', request.error)
        reject(request.error)
      }

      tx.oncomplete = () => db.close()
    })
  } catch (error) {
    console.error('[EmbeddingStore] clearLocalEmbeddings error:', error)
    throw error
  }
}
