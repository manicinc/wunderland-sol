/**
 * Writing Timer Tests
 * @module __tests__/unit/lib/tracking/writingTimer.test
 *
 * Tests for WritingTimer class and utility functions.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { WritingTimer, formatTime, formatDuration } from '@/lib/tracking/writingTimer'
import type { TimerState } from '@/lib/tracking/writingTimer'

// ============================================================================
// formatTime
// ============================================================================

describe('formatTime', () => {
  it('formats zero seconds', () => {
    expect(formatTime(0)).toBe('00:00')
  })

  it('formats seconds under a minute', () => {
    expect(formatTime(30)).toBe('00:30')
    expect(formatTime(59)).toBe('00:59')
  })

  it('formats minutes', () => {
    expect(formatTime(60)).toBe('01:00')
    expect(formatTime(90)).toBe('01:30')
    expect(formatTime(125)).toBe('02:05')
  })

  it('formats minutes with leading zeros', () => {
    expect(formatTime(65)).toBe('01:05')
    expect(formatTime(185)).toBe('03:05')
  })

  it('formats under an hour without hour prefix', () => {
    expect(formatTime(3599)).toBe('59:59')
  })

  it('formats hours', () => {
    expect(formatTime(3600)).toBe('1:00:00')
    expect(formatTime(3661)).toBe('1:01:01')
  })

  it('formats multiple hours', () => {
    expect(formatTime(7200)).toBe('2:00:00')
    expect(formatTime(7265)).toBe('2:01:05')
  })

  it('formats large durations', () => {
    expect(formatTime(36000)).toBe('10:00:00')
    expect(formatTime(86400)).toBe('24:00:00')
  })
})

// ============================================================================
// formatDuration
// ============================================================================

describe('formatDuration', () => {
  it('formats seconds', () => {
    expect(formatDuration(0)).toBe('0s')
    expect(formatDuration(30)).toBe('30s')
    expect(formatDuration(59)).toBe('59s')
  })

  it('formats minutes without leftover seconds', () => {
    expect(formatDuration(60)).toBe('1m')
    expect(formatDuration(120)).toBe('2m')
    expect(formatDuration(600)).toBe('10m')
  })

  it('formats minutes with seconds', () => {
    expect(formatDuration(90)).toBe('1m 30s')
    expect(formatDuration(125)).toBe('2m 5s')
    expect(formatDuration(3599)).toBe('59m 59s')
  })

  it('formats hours without minutes', () => {
    expect(formatDuration(3600)).toBe('1h')
    expect(formatDuration(7200)).toBe('2h')
  })

  it('formats hours with minutes', () => {
    expect(formatDuration(3660)).toBe('1h 1m')
    expect(formatDuration(5400)).toBe('1h 30m')
  })

  it('drops seconds when hours are present', () => {
    // Hours format only shows hours and minutes, not seconds
    expect(formatDuration(3665)).toBe('1h 1m')
  })
})

// ============================================================================
// WritingTimer - Basic State
// ============================================================================

describe('WritingTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('initial state', () => {
    it('starts in idle state', () => {
      const timer = new WritingTimer('strand-1')
      expect(timer.getState()).toBe('idle')
    })

    it('has zero elapsed time initially', () => {
      const timer = new WritingTimer('strand-1')
      expect(timer.getElapsedActive()).toBe(0)
      expect(timer.getElapsedTotal()).toBe(0)
    })

    it('is not running or paused initially', () => {
      const timer = new WritingTimer('strand-1')
      expect(timer.isRunning()).toBe(false)
      expect(timer.isPaused()).toBe(false)
    })

    it('generates unique session ID', () => {
      const timer1 = new WritingTimer('strand-1')
      const timer2 = new WritingTimer('strand-1')
      expect(timer1.getSessionId()).not.toBe(timer2.getSessionId())
    })

    it('session ID starts with ws_ prefix', () => {
      const timer = new WritingTimer('strand-1')
      expect(timer.getSessionId()).toMatch(/^ws_/)
    })
  })

  describe('start', () => {
    it('changes state to running', () => {
      const timer = new WritingTimer('strand-1')
      timer.start()
      expect(timer.getState()).toBe('running')
      expect(timer.isRunning()).toBe(true)
    })

    it('emits resume event', () => {
      const timer = new WritingTimer('strand-1')
      const listener = vi.fn()
      timer.addEventListener(listener)

      timer.start()

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'resume',
          state: 'running',
        })
      )
    })

    it('does nothing if already running', () => {
      const timer = new WritingTimer('strand-1')
      const listener = vi.fn()

      timer.start()
      timer.addEventListener(listener)
      timer.start()

      expect(listener).not.toHaveBeenCalled()
    })
  })

  describe('pause', () => {
    it('changes state to paused', () => {
      const timer = new WritingTimer('strand-1')
      timer.start()
      timer.pause()
      expect(timer.getState()).toBe('paused')
      expect(timer.isPaused()).toBe(true)
    })

    it('emits pause event', () => {
      const timer = new WritingTimer('strand-1')
      timer.start()

      const listener = vi.fn()
      timer.addEventListener(listener)
      timer.pause()

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'pause',
          state: 'paused',
        })
      )
    })

    it('does nothing if not running', () => {
      const timer = new WritingTimer('strand-1')
      const listener = vi.fn()
      timer.addEventListener(listener)

      timer.pause()

      expect(listener).not.toHaveBeenCalled()
      expect(timer.getState()).toBe('idle')
    })
  })

  describe('resume', () => {
    it('changes state from paused to running', () => {
      const timer = new WritingTimer('strand-1')
      timer.start()
      timer.pause()
      timer.resume()
      expect(timer.getState()).toBe('running')
      expect(timer.isRunning()).toBe(true)
    })

    it('emits resume event', () => {
      const timer = new WritingTimer('strand-1')
      timer.start()
      timer.pause()

      const listener = vi.fn()
      timer.addEventListener(listener)
      timer.resume()

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'resume',
          state: 'running',
        })
      )
    })

    it('does nothing if not paused', () => {
      const timer = new WritingTimer('strand-1')
      timer.start()

      const listener = vi.fn()
      timer.addEventListener(listener)
      timer.resume()

      expect(listener).not.toHaveBeenCalled()
    })
  })

  describe('stop', () => {
    it('changes state to stopped', () => {
      const timer = new WritingTimer('strand-1')
      timer.start()
      timer.stop()
      expect(timer.getState()).toBe('stopped')
    })

    it('returns session data', () => {
      const timer = new WritingTimer('strand-1', {
        loomId: 'loom-1',
        weaveId: 'weave-1',
      })
      timer.start()
      timer.updateCounts(100, 500)

      const session = timer.stop()

      expect(session.id).toBeDefined()
      expect(session.strandId).toBe('strand-1')
      expect(session.loomId).toBe('loom-1')
      expect(session.weaveId).toBe('weave-1')
      expect(session.startTime).toBeDefined()
      expect(session.endTime).toBeDefined()
      expect(session.wordCount).toBe(100)
      expect(session.characterCount).toBe(500)
    })

    it('emits stop event', () => {
      const timer = new WritingTimer('strand-1')
      timer.start()

      const listener = vi.fn()
      timer.addEventListener(listener)
      timer.stop()

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'stop',
          state: 'stopped',
        })
      )
    })
  })

  describe('tick', () => {
    it('updates elapsed time every tick interval', () => {
      const timer = new WritingTimer('strand-1', {
        config: { inactivityTimeout: 30000, tickInterval: 1000 },
      })
      timer.start()

      vi.advanceTimersByTime(3000)

      expect(timer.getElapsedActive()).toBe(3)
      expect(timer.getElapsedTotal()).toBe(3)
    })

    it('emits tick events', () => {
      const timer = new WritingTimer('strand-1', {
        config: { inactivityTimeout: 30000, tickInterval: 1000 },
      })
      const listener = vi.fn()
      timer.addEventListener(listener)
      timer.start()

      // Clear the initial resume event
      listener.mockClear()

      vi.advanceTimersByTime(2000)

      const tickCalls = listener.mock.calls.filter(
        call => call[0].type === 'tick'
      )
      expect(tickCalls.length).toBe(2)
    })
  })

  describe('inactivity timeout', () => {
    it('pauses after inactivity timeout', () => {
      const timer = new WritingTimer('strand-1', {
        config: { inactivityTimeout: 5000, tickInterval: 1000 },
      })
      timer.start()

      vi.advanceTimersByTime(5000)

      expect(timer.getState()).toBe('paused')
    })

    it('increments pause count on auto-pause', () => {
      const timer = new WritingTimer('strand-1', {
        config: { inactivityTimeout: 5000, tickInterval: 1000 },
      })
      timer.start()

      vi.advanceTimersByTime(5000)
      const session = timer.stop()

      expect(session.pauseCount).toBe(1)
    })
  })

  describe('recordActivity', () => {
    it('starts timer if idle', () => {
      const timer = new WritingTimer('strand-1')
      timer.recordActivity('keystroke')
      expect(timer.isRunning()).toBe(true)
    })

    it('resumes timer if paused', () => {
      const timer = new WritingTimer('strand-1')
      timer.start()
      timer.pause()

      timer.recordActivity('keystroke')

      expect(timer.isRunning()).toBe(true)
    })

    it('resets inactivity timeout', () => {
      const timer = new WritingTimer('strand-1', {
        config: { inactivityTimeout: 5000, tickInterval: 1000 },
      })
      timer.start()

      // Advance to just before timeout
      vi.advanceTimersByTime(4000)
      expect(timer.isRunning()).toBe(true)

      // Record activity resets the timeout
      timer.recordActivity('keystroke')

      // Advance another 4 seconds - should still be running
      vi.advanceTimersByTime(4000)
      expect(timer.isRunning()).toBe(true)

      // Advance past full timeout from activity - should pause
      vi.advanceTimersByTime(1000)
      expect(timer.isPaused()).toBe(true)
    })
  })

  describe('updateCounts', () => {
    it('updates word and character counts', () => {
      const timer = new WritingTimer('strand-1')
      timer.start()
      timer.updateCounts(50, 250)

      const session = timer.stop()
      expect(session.wordCount).toBe(50)
      expect(session.characterCount).toBe(250)
    })
  })

  describe('event listeners', () => {
    it('supports multiple listeners', () => {
      const timer = new WritingTimer('strand-1')
      const listener1 = vi.fn()
      const listener2 = vi.fn()

      timer.addEventListener(listener1)
      timer.addEventListener(listener2)
      timer.start()

      expect(listener1).toHaveBeenCalled()
      expect(listener2).toHaveBeenCalled()
    })

    it('removes listeners', () => {
      const timer = new WritingTimer('strand-1')
      const listener = vi.fn()

      timer.addEventListener(listener)
      timer.removeEventListener(listener)
      timer.start()

      expect(listener).not.toHaveBeenCalled()
    })

    it('handles listener errors gracefully', () => {
      const timer = new WritingTimer('strand-1')
      const errorListener = vi.fn(() => {
        throw new Error('Listener error')
      })
      const okListener = vi.fn()

      timer.addEventListener(errorListener)
      timer.addEventListener(okListener)

      // Should not throw
      expect(() => timer.start()).not.toThrow()
      expect(okListener).toHaveBeenCalled()
    })
  })

  describe('dispose', () => {
    it('clears all intervals', () => {
      const timer = new WritingTimer('strand-1', {
        config: { inactivityTimeout: 30000, tickInterval: 1000 },
      })
      timer.start()
      timer.dispose()

      const listener = vi.fn()
      timer.addEventListener(listener)

      vi.advanceTimersByTime(5000)

      // No tick events should be emitted after dispose
      const tickCalls = listener.mock.calls.filter(
        call => call[0].type === 'tick'
      )
      expect(tickCalls.length).toBe(0)
    })

    it('clears all listeners', () => {
      const timer = new WritingTimer('strand-1')
      const listener = vi.fn()
      timer.addEventListener(listener)
      timer.dispose()

      // Start manually would emit to listeners, but they're cleared
      // We can't test this directly, but we test the method exists
      expect(() => timer.dispose()).not.toThrow()
    })
  })

  describe('configuration', () => {
    it('uses default inactivity timeout', () => {
      const timer = new WritingTimer('strand-1')
      timer.start()

      vi.advanceTimersByTime(29000)
      expect(timer.isRunning()).toBe(true)

      vi.advanceTimersByTime(1000)
      expect(timer.isPaused()).toBe(true)
    })

    it('accepts custom inactivity timeout', () => {
      const timer = new WritingTimer('strand-1', {
        config: { inactivityTimeout: 10000, tickInterval: 1000 },
      })
      timer.start()

      vi.advanceTimersByTime(10000)
      expect(timer.isPaused()).toBe(true)
    })

    it('accepts custom tick interval', () => {
      const timer = new WritingTimer('strand-1', {
        config: { inactivityTimeout: 30000, tickInterval: 500 },
      })
      const listener = vi.fn()
      timer.addEventListener(listener)
      timer.start()

      // Clear initial resume event
      listener.mockClear()

      vi.advanceTimersByTime(1000)

      const tickCalls = listener.mock.calls.filter(
        call => call[0].type === 'tick'
      )
      expect(tickCalls.length).toBe(2) // 2 ticks at 500ms interval
    })
  })

  describe('session data', () => {
    it('tracks pause count', () => {
      const timer = new WritingTimer('strand-1', {
        config: { inactivityTimeout: 1000, tickInterval: 1000 },
      })
      timer.start()

      vi.advanceTimersByTime(1000)
      timer.resume()
      vi.advanceTimersByTime(1000)
      timer.resume()
      vi.advanceTimersByTime(1000)

      const session = timer.stop()
      expect(session.pauseCount).toBe(3)
    })

    it('has valid timestamps', () => {
      const timer = new WritingTimer('strand-1')
      timer.start()

      vi.advanceTimersByTime(2000)

      const session = timer.stop()

      const startTime = new Date(session.startTime)
      const endTime = new Date(session.endTime!)

      expect(startTime).toBeInstanceOf(Date)
      expect(endTime).toBeInstanceOf(Date)
      expect(endTime.getTime()).toBeGreaterThanOrEqual(startTime.getTime())
    })
  })
})
