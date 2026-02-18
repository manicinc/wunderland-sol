/**
 * Session Statistics Service
 * @module lib/audio/sessionStats
 *
 * Tracks ambience listening time and writing session statistics.
 * Persists data to localStorage for cross-session tracking.
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import type { SoundscapeType } from './ambienceSounds'

// ============================================================================
// TYPES
// ============================================================================

export interface SessionStats {
  /** Total listening time per soundscape (in seconds) */
  listeningTime: Record<SoundscapeType, number>
  /** Total number of listening sessions */
  totalSessions: number
  /** Current streak (consecutive days with listening) */
  streak: number
  /** Last session date (ISO string) */
  lastSessionDate: string | null
  /** Favorite soundscape (most listened) */
  favoriteSoundscape: SoundscapeType | null
  /** Total mic input time (in seconds) */
  micInputTime: number
  /** Total time with mic enabled (in seconds) */
  totalMicSessions: number
}

export interface CurrentSessionStats {
  /** Session start time */
  startTime: number | null
  /** Current soundscape being tracked */
  currentSoundscape: SoundscapeType | null
  /** Elapsed time in current session (seconds) */
  elapsedSeconds: number
  /** Is mic currently active */
  isMicActive: boolean
  /** Mic session start time */
  micStartTime: number | null
}

// ============================================================================
// CONSTANTS
// ============================================================================

const STORAGE_KEY = 'ambience-session-stats'

const DEFAULT_STATS: SessionStats = {
  listeningTime: {
    rain: 0,
    cafe: 0,
    forest: 0,
    ocean: 0,
    fireplace: 0,
    lofi: 0,
    'white-noise': 0,
    none: 0,
  },
  totalSessions: 0,
  streak: 0,
  lastSessionDate: null,
  favoriteSoundscape: null,
  micInputTime: 0,
  totalMicSessions: 0,
}

// ============================================================================
// SERVICE CLASS
// ============================================================================

class SessionStatsService {
  private stats: SessionStats = DEFAULT_STATS
  private currentSession: CurrentSessionStats = {
    startTime: null,
    currentSoundscape: null,
    elapsedSeconds: 0,
    isMicActive: false,
    micStartTime: null,
  }
  private tickInterval: NodeJS.Timeout | null = null
  private onUpdate?: (stats: SessionStats, current: CurrentSessionStats) => void

  constructor() {
    this.loadStats()
  }

  /**
   * Load stats from localStorage
   */
  private loadStats(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        this.stats = { ...DEFAULT_STATS, ...parsed }
      }
    } catch {
      // Ignore errors
    }
  }

  /**
   * Save stats to localStorage
   */
  private saveStats(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.stats))
    } catch {
      // Ignore errors
    }
  }

  /**
   * Update streak based on last session date
   */
  private updateStreak(): void {
    const today = new Date().toISOString().split('T')[0]
    const lastDate = this.stats.lastSessionDate

    if (!lastDate) {
      this.stats.streak = 1
    } else if (lastDate === today) {
      // Same day, no change
    } else {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayStr = yesterday.toISOString().split('T')[0]

      if (lastDate === yesterdayStr) {
        // Consecutive day, increment streak
        this.stats.streak++
      } else {
        // Streak broken, reset to 1
        this.stats.streak = 1
      }
    }

    this.stats.lastSessionDate = today
  }

  /**
   * Calculate favorite soundscape
   */
  private calculateFavorite(): void {
    let maxTime = 0
    let favorite: SoundscapeType | null = null

    for (const [soundscape, time] of Object.entries(this.stats.listeningTime)) {
      if (soundscape !== 'none' && time > maxTime) {
        maxTime = time
        favorite = soundscape as SoundscapeType
      }
    }

    this.stats.favoriteSoundscape = favorite
  }

  /**
   * Start tracking a soundscape session
   */
  startSession(soundscape: SoundscapeType): void {
    if (soundscape === 'none') return

    // End any existing session
    if (this.currentSession.startTime) {
      this.endSession()
    }

    this.currentSession = {
      startTime: Date.now(),
      currentSoundscape: soundscape,
      elapsedSeconds: 0,
      isMicActive: this.currentSession.isMicActive,
      micStartTime: this.currentSession.micStartTime,
    }

    this.stats.totalSessions++
    this.updateStreak()
    this.saveStats()

    // Start tick interval
    this.startTick()
    this.notifyUpdate()
  }

  /**
   * End current session and save stats
   */
  endSession(): void {
    if (!this.currentSession.startTime || !this.currentSession.currentSoundscape) {
      return
    }

    const elapsed = Math.floor((Date.now() - this.currentSession.startTime) / 1000)
    this.stats.listeningTime[this.currentSession.currentSoundscape] += elapsed

    this.calculateFavorite()
    this.saveStats()

    this.currentSession = {
      ...this.currentSession,
      startTime: null,
      currentSoundscape: null,
      elapsedSeconds: 0,
    }

    this.stopTick()
    this.notifyUpdate()
  }

  /**
   * Start mic tracking
   */
  startMicSession(): void {
    if (!this.currentSession.isMicActive) {
      this.currentSession.isMicActive = true
      this.currentSession.micStartTime = Date.now()
      this.stats.totalMicSessions++
      this.saveStats()
      this.notifyUpdate()
    }
  }

  /**
   * End mic tracking
   */
  endMicSession(): void {
    if (this.currentSession.isMicActive && this.currentSession.micStartTime) {
      const elapsed = Math.floor((Date.now() - this.currentSession.micStartTime) / 1000)
      this.stats.micInputTime += elapsed
      this.currentSession.isMicActive = false
      this.currentSession.micStartTime = null
      this.saveStats()
      this.notifyUpdate()
    }
  }

  /**
   * Start tick interval for updating elapsed time
   */
  private startTick(): void {
    if (this.tickInterval) return

    this.tickInterval = setInterval(() => {
      if (this.currentSession.startTime) {
        this.currentSession.elapsedSeconds = Math.floor(
          (Date.now() - this.currentSession.startTime) / 1000
        )
        this.notifyUpdate()
      }
    }, 1000)
  }

  /**
   * Stop tick interval
   */
  private stopTick(): void {
    if (this.tickInterval) {
      clearInterval(this.tickInterval)
      this.tickInterval = null
    }
  }

  /**
   * Set update callback
   */
  setOnUpdate(callback: (stats: SessionStats, current: CurrentSessionStats) => void): void {
    this.onUpdate = callback
  }

  /**
   * Notify listeners of update
   */
  private notifyUpdate(): void {
    this.onUpdate?.(this.stats, this.currentSession)
  }

  /**
   * Get current stats
   */
  getStats(): SessionStats {
    return { ...this.stats }
  }

  /**
   * Get current session
   */
  getCurrentSession(): CurrentSessionStats {
    return { ...this.currentSession }
  }

  /**
   * Format time as mm:ss or hh:mm:ss
   */
  static formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  /**
   * Format total time as friendly string (e.g., "2h 30m")
   */
  static formatTotalTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)

    if (hours > 0 && mins > 0) {
      return `${hours}h ${mins}m`
    } else if (hours > 0) {
      return `${hours}h`
    } else if (mins > 0) {
      return `${mins}m`
    } else {
      return `${seconds}s`
    }
  }

  /**
   * Clear all stats (for testing/reset)
   */
  clearStats(): void {
    this.stats = DEFAULT_STATS
    this.currentSession = {
      startTime: null,
      currentSoundscape: null,
      elapsedSeconds: 0,
      isMicActive: false,
      micStartTime: null,
    }
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // Ignore
    }
    this.notifyUpdate()
  }
}

// Singleton instance
let sessionStatsService: SessionStatsService | null = null

export function getSessionStatsService(): SessionStatsService {
  if (!sessionStatsService) {
    sessionStatsService = new SessionStatsService()
  }
  return sessionStatsService
}

// ============================================================================
// REACT HOOK
// ============================================================================

export interface UseSessionStatsReturn {
  /** All-time stats */
  stats: SessionStats
  /** Current session info */
  currentSession: CurrentSessionStats
  /** Total listening time across all soundscapes */
  totalListeningTime: number
  /** Formatted current session time */
  currentSessionTime: string
  /** Formatted total time */
  formattedTotalTime: string
  /** Start a listening session */
  startSession: (soundscape: SoundscapeType) => void
  /** End current session */
  endSession: () => void
  /** Start mic session */
  startMicSession: () => void
  /** End mic session */
  endMicSession: () => void
  /** Clear all stats */
  clearStats: () => void
}

export function useSessionStats(): UseSessionStatsReturn {
  const serviceRef = useRef<SessionStatsService | null>(null)
  const [stats, setStats] = useState<SessionStats>(DEFAULT_STATS)
  const [currentSession, setCurrentSession] = useState<CurrentSessionStats>({
    startTime: null,
    currentSoundscape: null,
    elapsedSeconds: 0,
    isMicActive: false,
    micStartTime: null,
  })

  useEffect(() => {
    const service = getSessionStatsService()
    serviceRef.current = service

    // Load initial state
    setStats(service.getStats())
    setCurrentSession(service.getCurrentSession())

    // Subscribe to updates
    service.setOnUpdate((newStats, newSession) => {
      setStats(newStats)
      setCurrentSession(newSession)
    })

    return () => {
      service.setOnUpdate(() => {})
    }
  }, [])

  const startSession = useCallback((soundscape: SoundscapeType) => {
    serviceRef.current?.startSession(soundscape)
  }, [])

  const endSession = useCallback(() => {
    serviceRef.current?.endSession()
  }, [])

  const startMicSession = useCallback(() => {
    serviceRef.current?.startMicSession()
  }, [])

  const endMicSession = useCallback(() => {
    serviceRef.current?.endMicSession()
  }, [])

  const clearStats = useCallback(() => {
    serviceRef.current?.clearStats()
  }, [])

  const totalListeningTime = Object.values(stats.listeningTime).reduce((a, b) => a + b, 0)

  return {
    stats,
    currentSession,
    totalListeningTime,
    currentSessionTime: SessionStatsService.formatTime(currentSession.elapsedSeconds),
    formattedTotalTime: SessionStatsService.formatTotalTime(totalListeningTime),
    startSession,
    endSession,
    startMicSession,
    endMicSession,
    clearStats,
  }
}

export { SessionStatsService }
