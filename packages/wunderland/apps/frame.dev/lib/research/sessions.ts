/**
 * Research Sessions Storage
 * @module lib/research/sessions
 *
 * Persists research sessions in IndexedDB for cross-session continuity.
 */

import type { ResearchSession, WebSearchResult } from './types'

const DB_NAME = 'quarry-research'
const DB_VERSION = 2 // Bumped for tags support
const STORE_NAME = 'sessions'
const LINKS_STORE_NAME = 'session-links'

let dbPromise: Promise<IDBDatabase> | null = null

/**
 * Open IndexedDB connection
 */
function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise

  dbPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('IndexedDB not available'))
      return
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      const oldVersion = event.oldVersion

      // Create sessions store (v1)
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        store.createIndex('updatedAt', 'updatedAt', { unique: false })
        store.createIndex('topic', 'topic', { unique: false })
      }

      // Upgrade to v2: Add tags index and links store
      if (oldVersion < 2) {
        // Add tags index with multiEntry
        const tx = (event.target as IDBOpenDBRequest).transaction
        if (tx) {
          const store = tx.objectStore(STORE_NAME)
          if (!store.indexNames.contains('tags')) {
            store.createIndex('tags', 'tags', { unique: false, multiEntry: true })
          }
          if (!store.indexNames.contains('parentSessionId')) {
            store.createIndex('parentSessionId', 'parentSessionId', { unique: false })
          }
        }

        // Create session links store
        if (!db.objectStoreNames.contains(LINKS_STORE_NAME)) {
          const linksStore = db.createObjectStore(LINKS_STORE_NAME, { keyPath: 'id' })
          linksStore.createIndex('sourceSessionId', 'sourceSessionId', { unique: false })
          linksStore.createIndex('targetSessionId', 'targetSessionId', { unique: false })
          linksStore.createIndex('createdAt', 'createdAt', { unique: false })
        }
      }
    }
  })

  return dbPromise
}

/**
 * Generate a unique session ID
 */
function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
}

/**
 * Options for creating a new research session
 */
interface CreateSessionOptions {
  /** Initial query */
  query?: string
  /** Parent session ID for branched sessions */
  parentSessionId?: string
  /** Initial tags */
  tags?: string[]
}

/**
 * Create a new research session
 */
export async function createSession(
  topic: string,
  options: CreateSessionOptions = {}
): Promise<ResearchSession> {
  const db = await openDB()
  const now = Date.now()

  const session: ResearchSession = {
    id: generateSessionId(),
    topic,
    query: options.query || topic,
    queries: options.query ? [options.query] : [],
    savedResults: [],
    notes: '',
    createdAt: now,
    updatedAt: now,
    tags: options.tags || [],
    linkedSessions: [],
    parentSessionId: options.parentSessionId,
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const request = store.add(session)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(session)
  })
}

/**
 * Get a session by ID
 */
export async function getSession(id: string): Promise<ResearchSession | null> {
  const db = await openDB()

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const request = store.get(id)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result || null)
  })
}

/**
 * Get all sessions, sorted by updatedAt (most recent first)
 */
export async function getAllSessions(): Promise<ResearchSession[]> {
  const db = await openDB()

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const index = store.index('updatedAt')
    const request = index.openCursor(null, 'prev')
    const sessions: ResearchSession[] = []

    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const cursor = request.result
      if (cursor) {
        sessions.push(cursor.value)
        cursor.continue()
      } else {
        resolve(sessions)
      }
    }
  })
}

/**
 * Update a session
 */
export async function updateSession(
  id: string,
  updates: Partial<Omit<ResearchSession, 'id' | 'createdAt'>>
): Promise<ResearchSession | null> {
  const db = await openDB()
  const existing = await getSession(id)

  if (!existing) return null

  const updated: ResearchSession = {
    ...existing,
    ...updates,
    updatedAt: Date.now(),
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const request = store.put(updated)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(updated)
  })
}

/**
 * Add a query to a session
 */
export async function addQueryToSession(id: string, query: string): Promise<ResearchSession | null> {
  const session = await getSession(id)
  if (!session) return null

  // Don't add duplicate consecutive queries
  if (session.queries[session.queries.length - 1] === query) {
    return session
  }

  return updateSession(id, {
    queries: [...session.queries, query],
  })
}

/**
 * Add a saved result to a session
 */
export async function addResultToSession(
  id: string,
  result: WebSearchResult
): Promise<ResearchSession | null> {
  const session = await getSession(id)
  if (!session) return null

  // Don't add duplicate results
  if (session.savedResults.some(r => r.id === result.id)) {
    return session
  }

  return updateSession(id, {
    savedResults: [...session.savedResults, result],
  })
}

/**
 * Remove a saved result from a session
 */
export async function removeResultFromSession(
  id: string,
  resultId: string
): Promise<ResearchSession | null> {
  const session = await getSession(id)
  if (!session) return null

  return updateSession(id, {
    savedResults: session.savedResults.filter(r => r.id !== resultId),
  })
}

/**
 * Update session notes
 */
export async function updateSessionNotes(id: string, notes: string): Promise<ResearchSession | null> {
  return updateSession(id, { notes })
}

/**
 * Delete a session
 */
export async function deleteSession(id: string): Promise<boolean> {
  const db = await openDB()

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const request = store.delete(id)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(true)
  })
}

/**
 * Clear all sessions
 */
export async function clearAllSessions(): Promise<void> {
  const db = await openDB()

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const request = store.clear()

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve()
  })
}

/**
 * Get recent sessions (last 10)
 */
export async function getRecentSessions(limit: number = 10): Promise<ResearchSession[]> {
  const all = await getAllSessions()
  return all.slice(0, limit)
}

/**
 * Search sessions by topic
 */
export async function searchSessions(searchTerm: string): Promise<ResearchSession[]> {
  const all = await getAllSessions()
  const term = searchTerm.toLowerCase()

  return all.filter(session =>
    session.topic.toLowerCase().includes(term) ||
    session.queries.some(q => q.toLowerCase().includes(term))
  )
}
