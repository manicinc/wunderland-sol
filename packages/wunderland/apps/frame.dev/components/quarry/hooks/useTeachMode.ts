/**
 * Teach Mode Hook
 *
 * Manages the Feynman Technique teaching sessions:
 * - Session lifecycle (start, message, end)
 * - Conversation history
 * - Gap analysis
 * - Database persistence
 * - XP rewards
 *
 * @module hooks/useTeachMode
 */

'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { getDatabase } from '@/lib/codexDatabase'
import type {
  StudentPersona,
  TeachSession,
  TeachMessage,
  GapReport,
} from '@/types/openstrand'
import { XP_REWARDS } from '@/types/openstrand'

// ============================================================================
// TYPES
// ============================================================================

export type TeachModeStatus =
  | 'idle'
  | 'selecting-persona'
  | 'active'
  | 'analyzing'
  | 'complete'
  | 'error'

export interface TeachModeState {
  status: TeachModeStatus
  session: TeachSession | null
  error: string | null
}

export interface UseTeachModeReturn {
  // State
  status: TeachModeStatus
  session: TeachSession | null
  messages: TeachMessage[]
  error: string | null
  isLoading: boolean

  // Actions
  startSession: (strandSlug: string, persona: StudentPersona) => Promise<void>
  sendMessage: (content: string, isVoice: boolean) => Promise<void>
  receiveStudentResponse: (content: string, gaps?: string[]) => void
  endSession: (gapReport: GapReport) => Promise<TeachSession>
  cancelSession: () => void

  // Session history
  getSessions: (strandSlug?: string) => Promise<TeachSession[]>
  getSession: (sessionId: string) => Promise<TeachSession | null>
  deleteSession: (sessionId: string) => Promise<void>

  // Stats
  getTeachingStats: () => Promise<TeachingStats>
}

export interface TeachingStats {
  totalSessions: number
  topicsCount: number
  averageCoverage: number
  totalGapsFound: number
  totalFlashcardsGenerated: number
  totalXpEarned: number
  sessionsThisWeek: number
}

// ============================================================================
// DATABASE HELPERS
// ============================================================================

async function saveSession(session: TeachSession): Promise<void> {
  const db = await getDatabase()
  if (!db) return

  await db.run(
    `INSERT INTO teach_sessions
     (id, strand_slug, persona, transcript, gap_report, coverage_score,
      duration_seconds, xp_earned, flashcards_generated, created_at, completed_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       transcript = excluded.transcript,
       gap_report = excluded.gap_report,
       coverage_score = excluded.coverage_score,
       duration_seconds = excluded.duration_seconds,
       xp_earned = excluded.xp_earned,
       flashcards_generated = excluded.flashcards_generated,
       completed_at = excluded.completed_at`,
    [
      session.id,
      session.strandSlug,
      session.persona,
      session.transcript,
      session.gapReport ? JSON.stringify(session.gapReport) : null,
      session.coverageScore,
      session.durationSeconds,
      session.xpEarned,
      session.flashcardsGenerated.length > 0
        ? JSON.stringify(session.flashcardsGenerated)
        : null,
      session.createdAt,
      session.completedAt || null,
    ]
  )
}

async function saveMessage(sessionId: string, message: TeachMessage): Promise<void> {
  const db = await getDatabase()
  if (!db) return

  await db.run(
    `INSERT INTO teach_messages
     (id, session_id, role, content, is_voice, gaps, timestamp)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      message.id,
      sessionId,
      message.role,
      message.content,
      message.isVoice ? 1 : 0,
      message.gaps ? JSON.stringify(message.gaps) : null,
      message.timestamp,
    ]
  )
}

async function loadSession(sessionId: string): Promise<TeachSession | null> {
  const db = await getDatabase()
  if (!db) return null

  const row = await db.get(
    `SELECT * FROM teach_sessions WHERE id = ?`,
    [sessionId]
  ) as any

  if (!row) return null

  // Load messages
  const messages = await db.all(
    `SELECT * FROM teach_messages WHERE session_id = ? ORDER BY timestamp`,
    [sessionId]
  ) as any[]

  return {
    id: row.id,
    strandSlug: row.strand_slug,
    persona: row.persona as StudentPersona,
    messages: messages.map(m => ({
      id: m.id,
      role: m.role as 'user' | 'student',
      content: m.content,
      timestamp: m.timestamp,
      isVoice: m.is_voice === 1,
      gaps: m.gaps ? JSON.parse(m.gaps) : undefined,
    })),
    transcript: row.transcript || '',
    gapReport: row.gap_report ? JSON.parse(row.gap_report) : null,
    coverageScore: row.coverage_score || 0,
    durationSeconds: row.duration_seconds || 0,
    xpEarned: row.xp_earned || 0,
    flashcardsGenerated: row.flashcards_generated
      ? JSON.parse(row.flashcards_generated)
      : [],
    createdAt: row.created_at,
    completedAt: row.completed_at || undefined,
  }
}

async function loadSessions(strandSlug?: string): Promise<TeachSession[]> {
  const db = await getDatabase()
  if (!db) return []

  let rows: any[]
  if (strandSlug) {
    rows = await db.all(
      `SELECT * FROM teach_sessions WHERE strand_slug = ? ORDER BY created_at DESC`,
      [strandSlug]
    ) as any[]
  } else {
    rows = await db.all(
      `SELECT * FROM teach_sessions ORDER BY created_at DESC`
    ) as any[]
  }

  return rows.map(row => ({
    id: row.id,
    strandSlug: row.strand_slug,
    persona: row.persona as StudentPersona,
    messages: [], // Load separately if needed
    transcript: row.transcript || '',
    gapReport: row.gap_report ? JSON.parse(row.gap_report) : null,
    coverageScore: row.coverage_score || 0,
    durationSeconds: row.duration_seconds || 0,
    xpEarned: row.xp_earned || 0,
    flashcardsGenerated: row.flashcards_generated
      ? JSON.parse(row.flashcards_generated)
      : [],
    createdAt: row.created_at,
    completedAt: row.completed_at || undefined,
  }))
}

async function deleteSessionFromDb(sessionId: string): Promise<void> {
  const db = await getDatabase()
  if (!db) return

  // Messages will be deleted via CASCADE
  await db.run(`DELETE FROM teach_sessions WHERE id = ?`, [sessionId])
}

async function computeStats(): Promise<TeachingStats> {
  const db = await getDatabase()
  if (!db) {
    return {
      totalSessions: 0,
      topicsCount: 0,
      averageCoverage: 0,
      totalGapsFound: 0,
      totalFlashcardsGenerated: 0,
      totalXpEarned: 0,
      sessionsThisWeek: 0,
    }
  }

  const stats = await db.get(`
    SELECT
      COUNT(*) as total_sessions,
      COUNT(DISTINCT strand_slug) as topics_count,
      AVG(coverage_score) as avg_coverage,
      SUM(xp_earned) as total_xp
    FROM teach_sessions
    WHERE completed_at IS NOT NULL
  `) as any

  // Count sessions this week
  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)
  const weekStats = await db.get(`
    SELECT COUNT(*) as count
    FROM teach_sessions
    WHERE completed_at IS NOT NULL
    AND created_at >= ?
  `, [weekAgo.toISOString()]) as any

  // Count total gaps and flashcards (from gap_report JSON)
  const sessions = await db.all(`
    SELECT gap_report, flashcards_generated
    FROM teach_sessions
    WHERE completed_at IS NOT NULL
  `) as any[]

  let totalGaps = 0
  let totalFlashcards = 0
  for (const s of sessions) {
    if (s.gap_report) {
      const report = JSON.parse(s.gap_report) as GapReport
      totalGaps += report.gaps.length
    }
    if (s.flashcards_generated) {
      const ids = JSON.parse(s.flashcards_generated) as string[]
      totalFlashcards += ids.length
    }
  }

  return {
    totalSessions: stats?.total_sessions || 0,
    topicsCount: stats?.topics_count || 0,
    averageCoverage: stats?.avg_coverage || 0,
    totalGapsFound: totalGaps,
    totalFlashcardsGenerated: totalFlashcards,
    totalXpEarned: stats?.total_xp || 0,
    sessionsThisWeek: weekStats?.count || 0,
  }
}

// ============================================================================
// HOOK
// ============================================================================

export function useTeachMode(): UseTeachModeReturn {
  const [state, setState] = useState<TeachModeState>({
    status: 'idle',
    session: null,
    error: null,
  })
  const [isLoading, setIsLoading] = useState(false)
  const sessionStartTime = useRef<Date | null>(null)

  // Start a new teaching session
  const startSession = useCallback(async (
    strandSlug: string,
    persona: StudentPersona
  ) => {
    setIsLoading(true)
    try {
      const session: TeachSession = {
        id: uuidv4(),
        strandSlug,
        persona,
        messages: [],
        transcript: '',
        gapReport: null,
        coverageScore: 0,
        durationSeconds: 0,
        xpEarned: 0,
        flashcardsGenerated: [],
        createdAt: new Date().toISOString(),
      }

      await saveSession(session)
      sessionStartTime.current = new Date()

      setState({
        status: 'active',
        session,
        error: null,
      })
    } catch (err) {
      setState(prev => ({
        ...prev,
        status: 'error',
        error: err instanceof Error ? err.message : 'Failed to start session',
      }))
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Send a user message
  const sendMessage = useCallback(async (content: string, isVoice: boolean) => {
    if (!state.session) return

    const message: TeachMessage = {
      id: uuidv4(),
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
      isVoice,
    }

    // Update local state
    const updatedSession = {
      ...state.session,
      messages: [...state.session.messages, message],
      transcript: state.session.transcript + (state.session.transcript ? '\n\n' : '') + content,
    }

    setState(prev => ({
      ...prev,
      session: updatedSession,
    }))

    // Persist
    await saveMessage(state.session.id, message)
    await saveSession(updatedSession)
  }, [state.session])

  // Receive AI student response
  const receiveStudentResponse = useCallback((content: string, gaps?: string[]) => {
    if (!state.session) return

    const message: TeachMessage = {
      id: uuidv4(),
      role: 'student',
      content,
      timestamp: new Date().toISOString(),
      isVoice: false,
      gaps,
    }

    const updatedSession = {
      ...state.session,
      messages: [...state.session.messages, message],
    }

    setState(prev => ({
      ...prev,
      session: updatedSession,
    }))

    // Persist async (don't await)
    saveMessage(state.session.id, message).catch(console.error)
    saveSession(updatedSession).catch(console.error)
  }, [state.session])

  // End session with gap report
  const endSession = useCallback(async (gapReport: GapReport): Promise<TeachSession> => {
    if (!state.session) {
      throw new Error('No active session')
    }

    setIsLoading(true)
    setState(prev => ({ ...prev, status: 'analyzing' }))

    try {
      // Calculate duration
      const durationSeconds = sessionStartTime.current
        ? Math.floor((Date.now() - sessionStartTime.current.getTime()) / 1000)
        : 0

      // Calculate XP
      let xpEarned = XP_REWARDS.teachSessionComplete
      xpEarned += gapReport.gaps.length * XP_REWARDS.teachGapIdentified
      if (gapReport.coveragePercent >= 90) {
        xpEarned += XP_REWARDS.teachFullCoverage
      }

      const completedSession: TeachSession = {
        ...state.session,
        gapReport,
        coverageScore: gapReport.coveragePercent,
        durationSeconds,
        xpEarned,
        completedAt: new Date().toISOString(),
      }

      await saveSession(completedSession)

      setState({
        status: 'complete',
        session: completedSession,
        error: null,
      })

      return completedSession
    } catch (err) {
      setState(prev => ({
        ...prev,
        status: 'error',
        error: err instanceof Error ? err.message : 'Failed to end session',
      }))
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [state.session])

  // Cancel session without saving
  const cancelSession = useCallback(() => {
    if (state.session) {
      // Delete incomplete session
      deleteSessionFromDb(state.session.id).catch(console.error)
    }

    sessionStartTime.current = null
    setState({
      status: 'idle',
      session: null,
      error: null,
    })
  }, [state.session])

  // Get session history
  const getSessions = useCallback(async (strandSlug?: string) => {
    return loadSessions(strandSlug)
  }, [])

  // Get single session with messages
  const getSession = useCallback(async (sessionId: string) => {
    return loadSession(sessionId)
  }, [])

  // Delete a session
  const deleteSession = useCallback(async (sessionId: string) => {
    await deleteSessionFromDb(sessionId)
  }, [])

  // Get teaching stats
  const getTeachingStats = useCallback(async () => {
    return computeStats()
  }, [])

  // Update session with generated flashcard IDs
  const updateFlashcardsGenerated = useCallback(async (flashcardIds: string[]) => {
    if (!state.session) return

    const xpForFlashcards = flashcardIds.length * XP_REWARDS.teachFlashcardGenerated
    const updatedSession = {
      ...state.session,
      flashcardsGenerated: [...state.session.flashcardsGenerated, ...flashcardIds],
      xpEarned: state.session.xpEarned + xpForFlashcards,
    }

    setState(prev => ({
      ...prev,
      session: updatedSession,
    }))

    await saveSession(updatedSession)
  }, [state.session])

  return {
    // State
    status: state.status,
    session: state.session,
    messages: state.session?.messages || [],
    error: state.error,
    isLoading,

    // Actions
    startSession,
    sendMessage,
    receiveStudentResponse,
    endSession,
    cancelSession,

    // Session history
    getSessions,
    getSession,
    deleteSession,

    // Stats
    getTeachingStats,
  }
}
