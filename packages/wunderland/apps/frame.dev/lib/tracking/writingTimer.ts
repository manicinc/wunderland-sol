/**
 * Writing Timer - Core Timer Logic
 * @module lib/tracking/writingTimer
 *
 * Tracks active writing/editing time with activity detection.
 * Pauses after inactivity timeout, resumes on user activity.
 */

/**
 * Writing session data
 */
export interface WritingSession {
  id: string
  strandId: string
  loomId?: string
  weaveId?: string
  startTime: string // ISO timestamp
  endTime?: string // ISO timestamp
  activeSeconds: number // Actual typing time
  totalSeconds: number // Wall clock time
  wordCount: number
  characterCount: number
  pauseCount: number // Number of times timer paused
}

/**
 * Timer configuration
 */
export interface WritingTimerConfig {
  /** Milliseconds before pausing (default: 30000 = 30s) */
  inactivityTimeout: number
  /** Milliseconds between tick updates (default: 1000 = 1s) */
  tickInterval: number
}

/**
 * Timer state
 */
export type TimerState = 'idle' | 'running' | 'paused' | 'stopped'

/**
 * Timer event listener
 */
export type TimerEventListener = (event: {
  type: 'tick' | 'pause' | 'resume' | 'stop'
  activeSeconds: number
  totalSeconds: number
  state: TimerState
}) => void

const DEFAULT_CONFIG: WritingTimerConfig = {
  inactivityTimeout: 30000, // 30 seconds
  tickInterval: 1000, // 1 second
}

/**
 * Generate unique session ID
 */
function generateSessionId(): string {
  return `ws_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

/**
 * Writing Timer class
 *
 * Tracks active writing time with automatic pause on inactivity.
 * Activity is detected through recordActivity() calls.
 */
export class WritingTimer {
  private sessionId: string
  private strandId: string
  private loomId?: string
  private weaveId?: string
  private config: WritingTimerConfig

  private state: TimerState = 'idle'
  private startTime: Date | null = null
  private activeMs: number = 0
  private totalMs: number = 0
  private lastActivityTime: Date | null = null
  private lastTickTime: Date | null = null

  private tickIntervalId: ReturnType<typeof setInterval> | null = null
  private inactivityTimeoutId: ReturnType<typeof setTimeout> | null = null

  private wordCount: number = 0
  private characterCount: number = 0
  private pauseCount: number = 0

  private listeners: Set<TimerEventListener> = new Set()

  constructor(
    strandId: string,
    options?: {
      loomId?: string
      weaveId?: string
      config?: Partial<WritingTimerConfig>
    }
  ) {
    this.sessionId = generateSessionId()
    this.strandId = strandId
    this.loomId = options?.loomId
    this.weaveId = options?.weaveId
    this.config = { ...DEFAULT_CONFIG, ...options?.config }
  }

  /**
   * Start the timer
   */
  start(): void {
    if (this.state === 'running') return

    this.state = 'running'
    this.startTime = this.startTime || new Date()
    this.lastActivityTime = new Date()
    this.lastTickTime = new Date()

    this.startTickInterval()
    this.resetInactivityTimeout()

    this.emit('resume')
  }

  /**
   * Pause the timer
   */
  pause(): void {
    if (this.state !== 'running') return

    this.state = 'paused'
    this.pauseCount++
    this.clearIntervals()

    this.emit('pause')
  }

  /**
   * Resume from pause
   */
  resume(): void {
    if (this.state !== 'paused') return

    this.state = 'running'
    this.lastTickTime = new Date()
    this.startTickInterval()
    this.resetInactivityTimeout()

    this.emit('resume')
  }

  /**
   * Stop the timer and return session data
   */
  stop(): WritingSession {
    this.state = 'stopped'
    this.clearIntervals()

    const session: WritingSession = {
      id: this.sessionId,
      strandId: this.strandId,
      loomId: this.loomId,
      weaveId: this.weaveId,
      startTime: this.startTime?.toISOString() || new Date().toISOString(),
      endTime: new Date().toISOString(),
      activeSeconds: Math.floor(this.activeMs / 1000),
      totalSeconds: Math.floor(this.totalMs / 1000),
      wordCount: this.wordCount,
      characterCount: this.characterCount,
      pauseCount: this.pauseCount,
    }

    this.emit('stop')

    return session
  }

  /**
   * Record user activity (call on keydown, mousemove, scroll)
   */
  recordActivity(type?: 'keystroke' | 'mouse' | 'scroll'): void {
    this.lastActivityTime = new Date()

    // Resume if paused
    if (this.state === 'paused') {
      this.resume()
    }

    // Start if idle
    if (this.state === 'idle') {
      this.start()
    }

    // Reset inactivity timeout
    this.resetInactivityTimeout()
  }

  /**
   * Update word and character counts
   */
  updateCounts(wordCount: number, characterCount: number): void {
    this.wordCount = wordCount
    this.characterCount = characterCount
  }

  /**
   * Get elapsed active time in seconds
   */
  getElapsedActive(): number {
    return Math.floor(this.activeMs / 1000)
  }

  /**
   * Get elapsed total time in seconds
   */
  getElapsedTotal(): number {
    return Math.floor(this.totalMs / 1000)
  }

  /**
   * Get current timer state
   */
  getState(): TimerState {
    return this.state
  }

  /**
   * Check if timer is running
   */
  isRunning(): boolean {
    return this.state === 'running'
  }

  /**
   * Check if timer is paused
   */
  isPaused(): boolean {
    return this.state === 'paused'
  }

  /**
   * Get session ID
   */
  getSessionId(): string {
    return this.sessionId
  }

  /**
   * Add event listener
   */
  addEventListener(listener: TimerEventListener): void {
    this.listeners.add(listener)
  }

  /**
   * Remove event listener
   */
  removeEventListener(listener: TimerEventListener): void {
    this.listeners.delete(listener)
  }

  /**
   * Dispose of timer resources
   */
  dispose(): void {
    this.clearIntervals()
    this.listeners.clear()
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PRIVATE METHODS
  // ─────────────────────────────────────────────────────────────────────────

  private startTickInterval(): void {
    if (this.tickIntervalId) return

    this.tickIntervalId = setInterval(() => {
      this.tick()
    }, this.config.tickInterval)
  }

  private tick(): void {
    if (this.state !== 'running') return

    const now = new Date()
    const elapsed = now.getTime() - (this.lastTickTime?.getTime() || now.getTime())

    this.activeMs += elapsed
    this.totalMs += elapsed
    this.lastTickTime = now

    this.emit('tick')
  }

  private resetInactivityTimeout(): void {
    if (this.inactivityTimeoutId) {
      clearTimeout(this.inactivityTimeoutId)
    }

    this.inactivityTimeoutId = setTimeout(() => {
      if (this.state === 'running') {
        this.pause()
      }
    }, this.config.inactivityTimeout)
  }

  private clearIntervals(): void {
    if (this.tickIntervalId) {
      clearInterval(this.tickIntervalId)
      this.tickIntervalId = null
    }
    if (this.inactivityTimeoutId) {
      clearTimeout(this.inactivityTimeoutId)
      this.inactivityTimeoutId = null
    }
  }

  private emit(type: 'tick' | 'pause' | 'resume' | 'stop'): void {
    const event = {
      type,
      activeSeconds: this.getElapsedActive(),
      totalSeconds: this.getElapsedTotal(),
      state: this.state,
    }

    for (const listener of this.listeners) {
      try {
        listener(event)
      } catch (e) {
        console.error('[WritingTimer] Error in listener:', e)
      }
    }
  }
}

/**
 * Format seconds as mm:ss or hh:mm:ss
 */
export function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }
  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

/**
 * Format seconds as human-readable duration
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`
  }
  if (seconds < 3600) {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`
  }
  const hours = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
}
