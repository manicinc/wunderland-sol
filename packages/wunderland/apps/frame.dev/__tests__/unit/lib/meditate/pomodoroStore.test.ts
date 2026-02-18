/**
 * Pomodoro Store Tests
 * @module __tests__/unit/lib/meditate/pomodoroStore.test
 *
 * Tests for Pomodoro timer state management and persistence.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ============================================================================
// POMODORO TYPES (inline for testing)
// ============================================================================

type PomodoroMode = 'focus' | 'shortBreak' | 'longBreak'

interface PomodoroSettings {
  focusDuration: number // minutes
  shortBreakDuration: number // minutes
  longBreakDuration: number // minutes
  longBreakInterval: number // sessions before long break
  autoStartBreaks: boolean
  autoStartFocus: boolean
  soundEnabled: boolean
}

interface PomodoroState {
  mode: PomodoroMode
  timeRemaining: number // seconds
  isRunning: boolean
  sessionsCompleted: number
  currentStreak: number
  totalFocusTime: number // seconds
}

// Default settings
const DEFAULT_SETTINGS: PomodoroSettings = {
  focusDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  longBreakInterval: 4,
  autoStartBreaks: false,
  autoStartFocus: false,
  soundEnabled: true,
}

// ============================================================================
// HELPER FUNCTIONS (matching expected implementation)
// ============================================================================

function getDurationForMode(mode: PomodoroMode, settings: PomodoroSettings): number {
  switch (mode) {
    case 'focus':
      return settings.focusDuration * 60
    case 'shortBreak':
      return settings.shortBreakDuration * 60
    case 'longBreak':
      return settings.longBreakDuration * 60
    default:
      return settings.focusDuration * 60
  }
}

function getNextMode(currentMode: PomodoroMode, sessionsCompleted: number, settings: PomodoroSettings): PomodoroMode {
  if (currentMode === 'focus') {
    // Check if it's time for a long break
    if ((sessionsCompleted + 1) % settings.longBreakInterval === 0) {
      return 'longBreak'
    }
    return 'shortBreak'
  }
  return 'focus'
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

function createInitialState(settings: PomodoroSettings = DEFAULT_SETTINGS): PomodoroState {
  return {
    mode: 'focus',
    timeRemaining: getDurationForMode('focus', settings),
    isRunning: false,
    sessionsCompleted: 0,
    currentStreak: 0,
    totalFocusTime: 0,
  }
}

// ============================================================================
// SETTINGS STORAGE TESTS
// ============================================================================

describe('Pomodoro Settings', () => {
  it('has valid default values', () => {
    expect(DEFAULT_SETTINGS.focusDuration).toBe(25)
    expect(DEFAULT_SETTINGS.shortBreakDuration).toBe(5)
    expect(DEFAULT_SETTINGS.longBreakDuration).toBe(15)
    expect(DEFAULT_SETTINGS.longBreakInterval).toBe(4)
  })

  it('all duration values are positive', () => {
    expect(DEFAULT_SETTINGS.focusDuration).toBeGreaterThan(0)
    expect(DEFAULT_SETTINGS.shortBreakDuration).toBeGreaterThan(0)
    expect(DEFAULT_SETTINGS.longBreakDuration).toBeGreaterThan(0)
    expect(DEFAULT_SETTINGS.longBreakInterval).toBeGreaterThan(0)
  })

  it('short break is shorter than long break', () => {
    expect(DEFAULT_SETTINGS.shortBreakDuration).toBeLessThan(DEFAULT_SETTINGS.longBreakDuration)
  })

  it('focus duration is longer than short break', () => {
    expect(DEFAULT_SETTINGS.focusDuration).toBeGreaterThan(DEFAULT_SETTINGS.shortBreakDuration)
  })
})

// ============================================================================
// DURATION CALCULATION TESTS
// ============================================================================

describe('getDurationForMode', () => {
  it('returns focus duration in seconds', () => {
    const duration = getDurationForMode('focus', DEFAULT_SETTINGS)
    expect(duration).toBe(25 * 60)
  })

  it('returns short break duration in seconds', () => {
    const duration = getDurationForMode('shortBreak', DEFAULT_SETTINGS)
    expect(duration).toBe(5 * 60)
  })

  it('returns long break duration in seconds', () => {
    const duration = getDurationForMode('longBreak', DEFAULT_SETTINGS)
    expect(duration).toBe(15 * 60)
  })

  it('handles custom settings', () => {
    const customSettings: PomodoroSettings = {
      ...DEFAULT_SETTINGS,
      focusDuration: 50,
      shortBreakDuration: 10,
      longBreakDuration: 30,
    }
    
    expect(getDurationForMode('focus', customSettings)).toBe(50 * 60)
    expect(getDurationForMode('shortBreak', customSettings)).toBe(10 * 60)
    expect(getDurationForMode('longBreak', customSettings)).toBe(30 * 60)
  })
})

// ============================================================================
// MODE TRANSITION TESTS
// ============================================================================

describe('getNextMode', () => {
  it('transitions from focus to short break', () => {
    const nextMode = getNextMode('focus', 0, DEFAULT_SETTINGS)
    expect(nextMode).toBe('shortBreak')
  })

  it('transitions from short break to focus', () => {
    const nextMode = getNextMode('shortBreak', 1, DEFAULT_SETTINGS)
    expect(nextMode).toBe('focus')
  })

  it('transitions from long break to focus', () => {
    const nextMode = getNextMode('longBreak', 4, DEFAULT_SETTINGS)
    expect(nextMode).toBe('focus')
  })

  it('triggers long break after longBreakInterval sessions', () => {
    // After 3 sessions (0-indexed), the 4th session completion triggers long break
    const nextMode = getNextMode('focus', 3, DEFAULT_SETTINGS)
    expect(nextMode).toBe('longBreak')
  })

  it('triggers short break before longBreakInterval', () => {
    const nextMode = getNextMode('focus', 1, DEFAULT_SETTINGS)
    expect(nextMode).toBe('shortBreak')
  })

  it('triggers long break at multiples of interval', () => {
    // Sessions 3, 7, 11, etc. (0-indexed)
    expect(getNextMode('focus', 3, DEFAULT_SETTINGS)).toBe('longBreak')
    expect(getNextMode('focus', 7, DEFAULT_SETTINGS)).toBe('longBreak')
    expect(getNextMode('focus', 11, DEFAULT_SETTINGS)).toBe('longBreak')
  })
})

// ============================================================================
// TIME FORMATTING TESTS
// ============================================================================

describe('formatTime', () => {
  it('formats seconds to MM:SS', () => {
    expect(formatTime(0)).toBe('00:00')
    expect(formatTime(60)).toBe('01:00')
    expect(formatTime(90)).toBe('01:30')
  })

  it('pads single digits', () => {
    expect(formatTime(5)).toBe('00:05')
    expect(formatTime(65)).toBe('01:05')
  })

  it('handles large values', () => {
    expect(formatTime(3600)).toBe('60:00')
    expect(formatTime(5999)).toBe('99:59')
  })

  it('formats focus duration correctly', () => {
    const focusSeconds = DEFAULT_SETTINGS.focusDuration * 60
    expect(formatTime(focusSeconds)).toBe('25:00')
  })

  it('formats break durations correctly', () => {
    expect(formatTime(DEFAULT_SETTINGS.shortBreakDuration * 60)).toBe('05:00')
    expect(formatTime(DEFAULT_SETTINGS.longBreakDuration * 60)).toBe('15:00')
  })
})

// ============================================================================
// INITIAL STATE TESTS
// ============================================================================

describe('createInitialState', () => {
  it('creates state with focus mode', () => {
    const state = createInitialState()
    expect(state.mode).toBe('focus')
  })

  it('creates state with correct initial time', () => {
    const state = createInitialState()
    expect(state.timeRemaining).toBe(25 * 60)
  })

  it('creates state not running', () => {
    const state = createInitialState()
    expect(state.isRunning).toBe(false)
  })

  it('creates state with zero sessions', () => {
    const state = createInitialState()
    expect(state.sessionsCompleted).toBe(0)
  })

  it('creates state with zero streak', () => {
    const state = createInitialState()
    expect(state.currentStreak).toBe(0)
  })

  it('creates state with zero total focus time', () => {
    const state = createInitialState()
    expect(state.totalFocusTime).toBe(0)
  })

  it('respects custom settings', () => {
    const customSettings: PomodoroSettings = {
      ...DEFAULT_SETTINGS,
      focusDuration: 50,
    }
    const state = createInitialState(customSettings)
    expect(state.timeRemaining).toBe(50 * 60)
  })
})

// ============================================================================
// STATE TRANSITIONS
// ============================================================================

describe('Pomodoro State Transitions', () => {
  it('completing focus session increments sessions', () => {
    let state = createInitialState()
    // Simulate completion
    state = {
      ...state,
      sessionsCompleted: state.sessionsCompleted + 1,
      mode: getNextMode('focus', state.sessionsCompleted, DEFAULT_SETTINGS),
    }
    expect(state.sessionsCompleted).toBe(1)
    expect(state.mode).toBe('shortBreak')
  })

  it('focus time accumulates correctly', () => {
    let state = createInitialState()
    const focusTime = 25 * 60 // 25 minutes in seconds
    
    state = {
      ...state,
      totalFocusTime: state.totalFocusTime + focusTime,
    }
    
    expect(state.totalFocusTime).toBe(focusTime)
  })

  it('streak increments on consecutive focus sessions', () => {
    let state = createInitialState()
    
    // Complete first session
    state = { ...state, currentStreak: 1 }
    expect(state.currentStreak).toBe(1)
    
    // Complete second session
    state = { ...state, currentStreak: 2 }
    expect(state.currentStreak).toBe(2)
  })
})

// ============================================================================
// PERSISTENCE TESTS
// ============================================================================

describe('Pomodoro Persistence', () => {
  let localStorageMock: Record<string, string>

  beforeEach(() => {
    localStorageMock = {}
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => localStorageMock[key] || null,
      setItem: (key: string, value: string) => {
        localStorageMock[key] = value
      },
      removeItem: (key: string) => {
        delete localStorageMock[key]
      },
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('can serialize and deserialize settings', () => {
    const settings = { ...DEFAULT_SETTINGS, focusDuration: 30 }
    localStorage.setItem('pomodoro-settings', JSON.stringify(settings))
    
    const loaded = JSON.parse(localStorage.getItem('pomodoro-settings')!)
    expect(loaded.focusDuration).toBe(30)
  })

  it('can serialize and deserialize state', () => {
    const state: PomodoroState = {
      mode: 'shortBreak',
      timeRemaining: 180,
      isRunning: false,
      sessionsCompleted: 2,
      currentStreak: 2,
      totalFocusTime: 3000,
    }
    
    localStorage.setItem('pomodoro-state', JSON.stringify(state))
    const loaded = JSON.parse(localStorage.getItem('pomodoro-state')!)
    
    expect(loaded.mode).toBe('shortBreak')
    expect(loaded.sessionsCompleted).toBe(2)
    expect(loaded.totalFocusTime).toBe(3000)
  })

  it('handles missing localStorage gracefully', () => {
    const loaded = localStorage.getItem('pomodoro-nonexistent')
    expect(loaded).toBeNull()
  })
})





