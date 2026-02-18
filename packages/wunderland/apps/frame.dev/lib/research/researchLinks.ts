/**
 * Research Links Storage
 * @module lib/research/researchLinks
 *
 * IndexedDB storage for bidirectional links between research results
 * and document strands. Enables cross-referencing and navigation
 * between research sessions and notes.
 */

import type { WebSearchResult } from './types'

// ============================================================================
// TYPES
// ============================================================================

export interface ResearchLink {
  /** Unique link ID */
  id: string
  /** Research result ID */
  resultId: string
  /** Research session ID */
  sessionId: string
  /** Linked strand/document path */
  strandPath: string
  /** Loom (vault) the strand belongs to */
  loomId: string
  /** Type of link */
  linkType: 'citation' | 'note' | 'reference' | 'related'
  /** Optional context about the link */
  context?: string
  /** Position in document (if applicable) */
  position?: {
    line?: number
    offset?: number
    blockId?: string
  }
  /** When the link was created */
  createdAt: number
  /** When the link was last updated */
  updatedAt: number
}

export interface ResearchLinkInput {
  resultId: string
  sessionId: string
  strandPath: string
  loomId: string
  linkType: ResearchLink['linkType']
  context?: string
  position?: ResearchLink['position']
}

// ============================================================================
// DATABASE CONFIGURATION
// ============================================================================

const DB_NAME = 'quarry-research-links'
const DB_VERSION = 1
const STORE_NAME = 'links'

let dbPromise: Promise<IDBDatabase> | null = null

/**
 * Initialize or get the IndexedDB database
 */
function getDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise

  dbPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not available'))
      return
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)

    request.onsuccess = () => resolve(request.result)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result

      // Create links store with indexes
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })

        // Index by result ID for finding all strands linked to a result
        store.createIndex('byResultId', 'resultId', { unique: false })

        // Index by strand path for finding all research linked to a strand
        store.createIndex('byStrandPath', 'strandPath', { unique: false })

        // Index by session ID for finding all links in a session
        store.createIndex('bySessionId', 'sessionId', { unique: false })

        // Index by loom for finding all links in a loom
        store.createIndex('byLoomId', 'loomId', { unique: false })

        // Compound index for deduplication
        store.createIndex('byResultAndStrand', ['resultId', 'strandPath'], { unique: false })
      }
    }
  })

  return dbPromise
}

/**
 * Generate a unique ID for a link
 */
function generateLinkId(): string {
  return `rl_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

// ============================================================================
// CRUD OPERATIONS
// ============================================================================

/**
 * Create a new research link
 */
export async function createResearchLink(input: ResearchLinkInput): Promise<ResearchLink> {
  const db = await getDB()
  const now = Date.now()

  const link: ResearchLink = {
    id: generateLinkId(),
    ...input,
    createdAt: now,
    updatedAt: now,
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const request = store.add(link)

    request.onsuccess = () => {
      dispatchLinkEvent('created', link)
      resolve(link)
    }
    request.onerror = () => reject(request.error)
  })
}

/**
 * Get a link by ID
 */
export async function getResearchLink(id: string): Promise<ResearchLink | null> {
  const db = await getDB()

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const request = store.get(id)

    request.onsuccess = () => resolve(request.result || null)
    request.onerror = () => reject(request.error)
  })
}

/**
 * Update a research link
 */
export async function updateResearchLink(
  id: string,
  updates: Partial<Omit<ResearchLink, 'id' | 'createdAt'>>
): Promise<ResearchLink | null> {
  const db = await getDB()
  const existing = await getResearchLink(id)
  if (!existing) return null

  const updated: ResearchLink = {
    ...existing,
    ...updates,
    updatedAt: Date.now(),
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const request = store.put(updated)

    request.onsuccess = () => {
      dispatchLinkEvent('updated', updated)
      resolve(updated)
    }
    request.onerror = () => reject(request.error)
  })
}

/**
 * Delete a research link
 */
export async function deleteResearchLink(id: string): Promise<boolean> {
  const db = await getDB()
  const existing = await getResearchLink(id)
  if (!existing) return false

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const request = store.delete(id)

    request.onsuccess = () => {
      dispatchLinkEvent('deleted', existing)
      resolve(true)
    }
    request.onerror = () => reject(request.error)
  })
}

// ============================================================================
// QUERY OPERATIONS
// ============================================================================

/**
 * Get all strands linked to a research result
 */
export async function getLinkedStrands(resultId: string): Promise<ResearchLink[]> {
  const db = await getDB()

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const index = store.index('byResultId')
    const request = index.getAll(resultId)

    request.onsuccess = () => resolve(request.result || [])
    request.onerror = () => reject(request.error)
  })
}

/**
 * Get all research linked to a strand
 */
export async function getLinkedResearch(strandPath: string): Promise<ResearchLink[]> {
  const db = await getDB()

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const index = store.index('byStrandPath')
    const request = index.getAll(strandPath)

    request.onsuccess = () => resolve(request.result || [])
    request.onerror = () => reject(request.error)
  })
}

/**
 * Get all links in a session
 */
export async function getSessionLinks(sessionId: string): Promise<ResearchLink[]> {
  const db = await getDB()

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const index = store.index('bySessionId')
    const request = index.getAll(sessionId)

    request.onsuccess = () => resolve(request.result || [])
    request.onerror = () => reject(request.error)
  })
}

/**
 * Get all links in a loom
 */
export async function getLoomLinks(loomId: string): Promise<ResearchLink[]> {
  const db = await getDB()

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const index = store.index('byLoomId')
    const request = index.getAll(loomId)

    request.onsuccess = () => resolve(request.result || [])
    request.onerror = () => reject(request.error)
  })
}

/**
 * Check if a result is linked to a strand
 */
export async function isLinked(resultId: string, strandPath: string): Promise<boolean> {
  const db = await getDB()

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const index = store.index('byResultAndStrand')
    const request = index.get([resultId, strandPath])

    request.onsuccess = () => resolve(!!request.result)
    request.onerror = () => reject(request.error)
  })
}

/**
 * Get all links (for analytics)
 */
export async function getAllLinks(): Promise<ResearchLink[]> {
  const db = await getDB()

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const request = store.getAll()

    request.onsuccess = () => resolve(request.result || [])
    request.onerror = () => reject(request.error)
  })
}

// ============================================================================
// BULK OPERATIONS
// ============================================================================

/**
 * Link a result to a strand (convenience function)
 */
export async function linkResultToStrand(
  result: WebSearchResult,
  sessionId: string,
  strandPath: string,
  loomId: string,
  options: {
    linkType?: ResearchLink['linkType']
    context?: string
    position?: ResearchLink['position']
  } = {}
): Promise<ResearchLink> {
  // Check if already linked
  const existing = await getLinkedStrands(result.id)
  const alreadyLinked = existing.find(l => l.strandPath === strandPath)
  if (alreadyLinked) {
    // Update existing link
    return (await updateResearchLink(alreadyLinked.id, {
      context: options.context,
      position: options.position,
    })) || alreadyLinked
  }

  // Create new link
  return createResearchLink({
    resultId: result.id,
    sessionId,
    strandPath,
    loomId,
    linkType: options.linkType || 'reference',
    context: options.context,
    position: options.position,
  })
}

/**
 * Unlink a result from a strand
 */
export async function unlinkResultFromStrand(
  resultId: string,
  strandPath: string
): Promise<boolean> {
  const links = await getLinkedStrands(resultId)
  const link = links.find(l => l.strandPath === strandPath)
  if (!link) return false

  return deleteResearchLink(link.id)
}

/**
 * Delete all links for a session
 */
export async function deleteSessionLinks(sessionId: string): Promise<number> {
  const links = await getSessionLinks(sessionId)
  let deleted = 0

  for (const link of links) {
    if (await deleteResearchLink(link.id)) {
      deleted++
    }
  }

  return deleted
}

/**
 * Delete all links for a strand
 */
export async function deleteStrandLinks(strandPath: string): Promise<number> {
  const links = await getLinkedResearch(strandPath)
  let deleted = 0

  for (const link of links) {
    if (await deleteResearchLink(link.id)) {
      deleted++
    }
  }

  return deleted
}

// ============================================================================
// EVENTS
// ============================================================================

/**
 * Dispatch a custom event for link changes
 */
function dispatchLinkEvent(
  type: 'created' | 'updated' | 'deleted',
  link: ResearchLink
): void {
  if (typeof window === 'undefined') return

  window.dispatchEvent(
    new CustomEvent('research-link-changed', {
      detail: { type, link },
    })
  )
}

// ============================================================================
// HOOKS SUPPORT
// ============================================================================

/**
 * Subscribe to link changes
 */
export function onLinkChange(
  callback: (event: { type: 'created' | 'updated' | 'deleted'; link: ResearchLink }) => void
): () => void {
  if (typeof window === 'undefined') return () => {}

  const handler = (e: CustomEvent) => callback(e.detail)
  window.addEventListener('research-link-changed' as any, handler as EventListener)

  return () => {
    window.removeEventListener('research-link-changed' as any, handler as EventListener)
  }
}
