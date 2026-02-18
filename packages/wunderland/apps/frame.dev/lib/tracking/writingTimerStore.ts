/**
 * Writing Timer Store - IndexedDB Persistence
 * @module lib/tracking/writingTimerStore
 *
 * Stores writing sessions and provides analytics.
 */

import type { WritingSession } from './writingTimer'

const DB_NAME = 'frame-writing-timer'
const DB_VERSION = 1
const STORE_SESSIONS = 'sessions'
const STORE_DAILY = 'daily'

/**
 * Daily writing summary
 */
export interface DailyWritingSummary {
  date: string // YYYY-MM-DD
  totalActiveSeconds: number
  totalSessions: number
  totalWordCount: number
  strandIds: string[]
}

/**
 * Strand writing statistics
 */
export interface StrandWritingStats {
  strandId: string
  totalActiveSeconds: number
  totalSessions: number
  lastSessionAt: string
  averageSessionLength: number
}

/**
 * Writing Timer Store class
 */
export class WritingTimerStore {
  private db: IDBDatabase | null = null
  private initPromise: Promise<void> | null = null

  /**
   * Initialize the database
   */
  async init(): Promise<void> {
    if (this.db) return
    if (this.initPromise) return this.initPromise

    this.initPromise = new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        console.warn('[WritingTimerStore] IndexedDB not available')
        resolve()
        return
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => {
        console.error('[WritingTimerStore] Failed to open database:', request.error)
        reject(request.error)
      }

      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // Sessions store
        if (!db.objectStoreNames.contains(STORE_SESSIONS)) {
          const sessionsStore = db.createObjectStore(STORE_SESSIONS, { keyPath: 'id' })
          sessionsStore.createIndex('strandId', 'strandId', { unique: false })
          sessionsStore.createIndex('startTime', 'startTime', { unique: false })
        }

        // Daily summaries store
        if (!db.objectStoreNames.contains(STORE_DAILY)) {
          db.createObjectStore(STORE_DAILY, { keyPath: 'date' })
        }
      }
    })

    await this.initPromise
  }

  /**
   * Save a writing session
   */
  async saveSession(session: WritingSession): Promise<void> {
    if (!this.db) return

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_SESSIONS, 'readwrite')
      const store = tx.objectStore(STORE_SESSIONS)
      const request = store.put(session)

      request.onsuccess = () => {
        // Update daily summary
        this.updateDailySummary(session).then(resolve).catch(reject)
      }
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Update daily summary with session data
   */
  private async updateDailySummary(session: WritingSession): Promise<void> {
    if (!this.db) return

    const date = session.startTime.split('T')[0]

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_DAILY, 'readwrite')
      const store = tx.objectStore(STORE_DAILY)
      const getRequest = store.get(date)

      getRequest.onsuccess = () => {
        const existing: DailyWritingSummary = getRequest.result || {
          date,
          totalActiveSeconds: 0,
          totalSessions: 0,
          totalWordCount: 0,
          strandIds: [],
        }

        existing.totalActiveSeconds += session.activeSeconds
        existing.totalSessions += 1
        existing.totalWordCount += session.wordCount

        if (!existing.strandIds.includes(session.strandId)) {
          existing.strandIds.push(session.strandId)
        }

        const putRequest = store.put(existing)
        putRequest.onsuccess = () => resolve()
        putRequest.onerror = () => reject(putRequest.error)
      }

      getRequest.onerror = () => reject(getRequest.error)
    })
  }

  /**
   * Get sessions for a strand
   */
  async getSessionsForStrand(strandId: string): Promise<WritingSession[]> {
    if (!this.db) return []

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_SESSIONS, 'readonly')
      const store = tx.objectStore(STORE_SESSIONS)
      const index = store.index('strandId')
      const request = index.getAll(strandId)

      request.onsuccess = () => resolve(request.result || [])
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Get all sessions
   */
  async getAllSessions(): Promise<WritingSession[]> {
    if (!this.db) return []

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_SESSIONS, 'readonly')
      const store = tx.objectStore(STORE_SESSIONS)
      const request = store.getAll()

      request.onsuccess = () => resolve(request.result || [])
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Get daily summary
   */
  async getDailySummary(date: string): Promise<DailyWritingSummary | null> {
    if (!this.db) return null

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_DAILY, 'readonly')
      const store = tx.objectStore(STORE_DAILY)
      const request = store.get(date)

      request.onsuccess = () => resolve(request.result || null)
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Get daily summaries for a range
   */
  async getDailySummaries(days: number = 7): Promise<DailyWritingSummary[]> {
    if (!this.db) return []

    const summaries: DailyWritingSummary[] = []
    const today = new Date()

    for (let i = 0; i < days; i++) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]

      const summary = await this.getDailySummary(dateStr)
      if (summary) {
        summaries.push(summary)
      }
    }

    return summaries
  }

  /**
   * Get writing stats for a strand
   */
  async getStrandStats(strandId: string): Promise<StrandWritingStats | null> {
    const sessions = await this.getSessionsForStrand(strandId)
    if (sessions.length === 0) return null

    const totalActiveSeconds = sessions.reduce((sum, s) => sum + s.activeSeconds, 0)
    const lastSession = sessions.sort(
      (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
    )[0]

    return {
      strandId,
      totalActiveSeconds,
      totalSessions: sessions.length,
      lastSessionAt: lastSession.startTime,
      averageSessionLength: Math.round(totalActiveSeconds / sessions.length),
    }
  }

  /**
   * Get total writing time for today
   */
  async getTodayTotal(): Promise<number> {
    const today = new Date().toISOString().split('T')[0]
    const summary = await this.getDailySummary(today)
    return summary?.totalActiveSeconds || 0
  }

  /**
   * Get total writing time for this week
   */
  async getWeekTotal(): Promise<number> {
    const summaries = await this.getDailySummaries(7)
    return summaries.reduce((sum, s) => sum + s.totalActiveSeconds, 0)
  }

  /**
   * Clear all sessions for a strand
   */
  async clearStrandSessions(strandId: string): Promise<void> {
    if (!this.db) return

    const sessions = await this.getSessionsForStrand(strandId)

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_SESSIONS, 'readwrite')
      const store = tx.objectStore(STORE_SESSIONS)

      for (const session of sessions) {
        store.delete(session.id)
      }

      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  }

  /**
   * Clear all data
   */
  async clearAll(): Promise<void> {
    if (!this.db) return

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction([STORE_SESSIONS, STORE_DAILY], 'readwrite')
      tx.objectStore(STORE_SESSIONS).clear()
      tx.objectStore(STORE_DAILY).clear()

      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  }

  /**
   * Close database connection
   */
  close(): void {
    if (this.db) {
      this.db.close()
      this.db = null
      this.initPromise = null
    }
  }
}

// Singleton instance
let storeInstance: WritingTimerStore | null = null

/**
 * Get the singleton WritingTimerStore instance
 */
export async function getWritingTimerStore(): Promise<WritingTimerStore> {
  if (!storeInstance) {
    storeInstance = new WritingTimerStore()
    await storeInstance.init()
  }
  return storeInstance
}
