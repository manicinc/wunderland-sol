/**
 * Research Sessions Hook
 * @module lib/research/useResearchSessions
 *
 * React hook for managing research sessions.
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import type { ResearchSession, WebSearchResult } from './types'
import {
  createSession,
  getSession,
  getAllSessions,
  updateSession,
  addQueryToSession,
  addResultToSession,
  removeResultFromSession,
  updateSessionNotes,
  deleteSession,
  getRecentSessions,
} from './sessions'

interface UseResearchSessionsReturn {
  /** All sessions */
  sessions: ResearchSession[]
  /** Currently active session */
  activeSession: ResearchSession | null
  /** Loading state */
  loading: boolean
  /** Error state */
  error: string | null
  /** Create a new session */
  create: (topic: string) => Promise<ResearchSession | null>
  /** Load and activate a session */
  activate: (id: string) => Promise<void>
  /** Deactivate current session */
  deactivate: () => void
  /** Add a query to active session */
  addQuery: (query: string) => Promise<void>
  /** Save a result to active session (or specified session) */
  saveResult: (result: WebSearchResult, session?: ResearchSession) => Promise<void>
  /** Remove a result from active session (or specified session) */
  unsaveResult: (resultId: string, session?: ResearchSession) => Promise<void>
  /** Update notes for active session */
  updateNotes: (notes: string) => Promise<void>
  /** Delete a session */
  remove: (id: string) => Promise<void>
  /** Refresh sessions list */
  refresh: () => Promise<void>
}

export function useResearchSessions(): UseResearchSessionsReturn {
  const [sessions, setSessions] = useState<ResearchSession[]>([])
  const [activeSession, setActiveSession] = useState<ResearchSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  /**
   * Load all sessions
   */
  const refresh = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const all = await getRecentSessions(50)
      setSessions(all)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sessions')
    } finally {
      setLoading(false)
    }
  }, [])

  // Load sessions on mount
  useEffect(() => {
    refresh()
  }, [refresh])

  /**
   * Create a new session
   */
  const create = useCallback(async (topic: string): Promise<ResearchSession | null> => {
    try {
      setError(null)
      const session = await createSession(topic)
      setSessions(prev => [session, ...prev])
      setActiveSession(session)
      return session
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create session')
      return null
    }
  }, [])

  /**
   * Activate a session
   */
  const activate = useCallback(async (id: string) => {
    try {
      setError(null)
      const session = await getSession(id)
      if (session) {
        setActiveSession(session)
      } else {
        setError('Session not found')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load session')
    }
  }, [])

  /**
   * Deactivate current session
   */
  const deactivate = useCallback(() => {
    setActiveSession(null)
  }, [])

  /**
   * Add a query to active session
   */
  const addQuery = useCallback(async (query: string) => {
    if (!activeSession) return

    try {
      const updated = await addQueryToSession(activeSession.id, query)
      if (updated) {
        setActiveSession(updated)
        setSessions(prev =>
          prev.map(s => s.id === updated.id ? updated : s)
        )
      }
    } catch (err) {
      console.error('Failed to add query:', err)
    }
  }, [activeSession])

  /**
   * Save a result to active session (or specified session)
   */
  const saveResult = useCallback(async (result: WebSearchResult, session?: ResearchSession) => {
    const targetSession = session ?? activeSession
    if (!targetSession) return

    try {
      const updated = await addResultToSession(targetSession.id, result)
      if (updated) {
        setActiveSession(updated)
        setSessions(prev =>
          prev.map(s => s.id === updated.id ? updated : s)
        )
      }
    } catch (err) {
      console.error('Failed to save result:', err)
    }
  }, [activeSession])

  /**
   * Remove a result from active session (or specified session)
   */
  const unsaveResult = useCallback(async (resultId: string, session?: ResearchSession) => {
    const targetSession = session ?? activeSession
    if (!targetSession) return

    try {
      const updated = await removeResultFromSession(targetSession.id, resultId)
      if (updated) {
        setActiveSession(updated)
        setSessions(prev =>
          prev.map(s => s.id === updated.id ? updated : s)
        )
      }
    } catch (err) {
      console.error('Failed to unsave result:', err)
    }
  }, [activeSession])

  /**
   * Update notes for active session
   */
  const updateNotes = useCallback(async (notes: string) => {
    if (!activeSession) return

    try {
      const updated = await updateSessionNotes(activeSession.id, notes)
      if (updated) {
        setActiveSession(updated)
        setSessions(prev =>
          prev.map(s => s.id === updated.id ? updated : s)
        )
      }
    } catch (err) {
      console.error('Failed to update notes:', err)
    }
  }, [activeSession])

  /**
   * Delete a session
   */
  const remove = useCallback(async (id: string) => {
    try {
      await deleteSession(id)
      setSessions(prev => prev.filter(s => s.id !== id))
      if (activeSession?.id === id) {
        setActiveSession(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete session')
    }
  }, [activeSession])

  return {
    sessions,
    activeSession,
    loading,
    error,
    create,
    activate,
    deactivate,
    addQuery,
    saveResult,
    unsaveResult,
    updateNotes,
    remove,
    refresh,
  }
}
