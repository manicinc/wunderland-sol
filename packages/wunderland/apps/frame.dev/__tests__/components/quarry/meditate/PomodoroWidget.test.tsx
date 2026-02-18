/**
 * PomodoroWidget Component Tests
 * @module __tests__/components/quarry/meditate/PomodoroWidget.test
 *
 * Tests for the Pomodoro timer widget component.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import React from 'react'

// ============================================================================
// MOCK COMPONENT (simplified for testing without real implementation)
// ============================================================================

type PomodoroMode = 'focus' | 'shortBreak' | 'longBreak'

interface MockPomodoroWidgetProps {
  defaultExpanded?: boolean
  onComplete?: (mode: PomodoroMode, sessionsCompleted: number) => void
}

function MockPomodoroWidget({
  defaultExpanded = true,
  onComplete,
}: MockPomodoroWidgetProps) {
  const [mode, setMode] = React.useState<PomodoroMode>('focus')
  const [isRunning, setIsRunning] = React.useState(false)
  const [timeRemaining, setTimeRemaining] = React.useState(25 * 60) // 25 minutes
  const [sessionsCompleted, setSessionsCompleted] = React.useState(0)
  const [expanded, setExpanded] = React.useState(defaultExpanded)

  const durations: Record<PomodoroMode, number> = {
    focus: 25 * 60,
    shortBreak: 5 * 60,
    longBreak: 15 * 60,
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const handleStart = () => setIsRunning(true)
  const handlePause = () => setIsRunning(false)
  const handleReset = () => {
    setIsRunning(false)
    setTimeRemaining(durations[mode])
  }

  const handleModeChange = (newMode: PomodoroMode) => {
    setMode(newMode)
    setTimeRemaining(durations[newMode])
    setIsRunning(false)
  }

  const handleSkip = () => {
    if (mode === 'focus') {
      const newSessions = sessionsCompleted + 1
      setSessionsCompleted(newSessions)
      onComplete?.(mode, newSessions)
      
      const nextMode = newSessions % 4 === 0 ? 'longBreak' : 'shortBreak'
      handleModeChange(nextMode)
    } else {
      handleModeChange('focus')
    }
  }

  const progress = ((durations[mode] - timeRemaining) / durations[mode]) * 100

  return (
    <div data-testid="pomodoro-widget" className="pomodoro-widget">
      <div data-testid="pomodoro-header" onClick={() => setExpanded(!expanded)}>
        <span data-testid="mode-label">
          {mode === 'focus' ? 'Focus' : mode === 'shortBreak' ? 'Short Break' : 'Long Break'}
        </span>
        <span data-testid="time-display">{formatTime(timeRemaining)}</span>
      </div>

      {expanded && (
        <div data-testid="pomodoro-content">
          <div data-testid="progress-bar" style={{ width: `${progress}%` }} />

          <div data-testid="mode-selector">
            <button
              data-testid="mode-focus"
              onClick={() => handleModeChange('focus')}
              className={mode === 'focus' ? 'active' : ''}
            >
              Focus
            </button>
            <button
              data-testid="mode-short"
              onClick={() => handleModeChange('shortBreak')}
              className={mode === 'shortBreak' ? 'active' : ''}
            >
              Short
            </button>
            <button
              data-testid="mode-long"
              onClick={() => handleModeChange('longBreak')}
              className={mode === 'longBreak' ? 'active' : ''}
            >
              Long
            </button>
          </div>

          <div data-testid="controls">
            {isRunning ? (
              <button data-testid="pause-button" onClick={handlePause}>
                Pause
              </button>
            ) : (
              <button data-testid="start-button" onClick={handleStart}>
                Start
              </button>
            )}
            <button data-testid="reset-button" onClick={handleReset}>
              Reset
            </button>
            <button data-testid="skip-button" onClick={handleSkip}>
              Skip
            </button>
          </div>

          <div data-testid="session-count">
            Sessions: {sessionsCompleted}
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// TESTS
// ============================================================================

describe('PomodoroWidget', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders the widget', () => {
      render(<MockPomodoroWidget />)
      expect(screen.getByTestId('pomodoro-widget')).toBeInTheDocument()
    })

    it('renders time display', () => {
      render(<MockPomodoroWidget />)
      expect(screen.getByTestId('time-display')).toBeInTheDocument()
    })

    it('shows 25:00 initial time for focus mode', () => {
      render(<MockPomodoroWidget />)
      expect(screen.getByTestId('time-display')).toHaveTextContent('25:00')
    })

    it('renders mode label', () => {
      render(<MockPomodoroWidget />)
      expect(screen.getByTestId('mode-label')).toHaveTextContent('Focus')
    })
  })

  describe('Expandable State', () => {
    it('shows content when expanded', () => {
      render(<MockPomodoroWidget defaultExpanded={true} />)
      expect(screen.getByTestId('pomodoro-content')).toBeInTheDocument()
    })

    it('hides content when collapsed', () => {
      render(<MockPomodoroWidget defaultExpanded={false} />)
      expect(screen.queryByTestId('pomodoro-content')).not.toBeInTheDocument()
    })

    it('toggles expansion on header click', () => {
      render(<MockPomodoroWidget defaultExpanded={true} />)
      
      fireEvent.click(screen.getByTestId('pomodoro-header'))
      expect(screen.queryByTestId('pomodoro-content')).not.toBeInTheDocument()
      
      fireEvent.click(screen.getByTestId('pomodoro-header'))
      expect(screen.getByTestId('pomodoro-content')).toBeInTheDocument()
    })
  })

  describe('Timer Controls', () => {
    it('shows start button initially', () => {
      render(<MockPomodoroWidget />)
      expect(screen.getByTestId('start-button')).toBeInTheDocument()
    })

    it('shows pause button when running', () => {
      render(<MockPomodoroWidget />)
      fireEvent.click(screen.getByTestId('start-button'))
      expect(screen.getByTestId('pause-button')).toBeInTheDocument()
    })

    it('shows start button after pause', () => {
      render(<MockPomodoroWidget />)
      fireEvent.click(screen.getByTestId('start-button'))
      fireEvent.click(screen.getByTestId('pause-button'))
      expect(screen.getByTestId('start-button')).toBeInTheDocument()
    })

    it('reset button resets time', () => {
      render(<MockPomodoroWidget />)
      
      // Start and let it run
      fireEvent.click(screen.getByTestId('start-button'))
      
      // Reset
      fireEvent.click(screen.getByTestId('reset-button'))
      
      expect(screen.getByTestId('time-display')).toHaveTextContent('25:00')
      expect(screen.getByTestId('start-button')).toBeInTheDocument()
    })
  })

  describe('Mode Selection', () => {
    it('has focus mode selected by default', () => {
      render(<MockPomodoroWidget />)
      expect(screen.getByTestId('mode-focus')).toHaveClass('active')
    })

    it('switches to short break mode', () => {
      render(<MockPomodoroWidget />)
      fireEvent.click(screen.getByTestId('mode-short'))
      
      expect(screen.getByTestId('mode-short')).toHaveClass('active')
      expect(screen.getByTestId('mode-label')).toHaveTextContent('Short Break')
      expect(screen.getByTestId('time-display')).toHaveTextContent('05:00')
    })

    it('switches to long break mode', () => {
      render(<MockPomodoroWidget />)
      fireEvent.click(screen.getByTestId('mode-long'))
      
      expect(screen.getByTestId('mode-long')).toHaveClass('active')
      expect(screen.getByTestId('mode-label')).toHaveTextContent('Long Break')
      expect(screen.getByTestId('time-display')).toHaveTextContent('15:00')
    })

    it('switches back to focus mode', () => {
      render(<MockPomodoroWidget />)
      fireEvent.click(screen.getByTestId('mode-short'))
      fireEvent.click(screen.getByTestId('mode-focus'))
      
      expect(screen.getByTestId('mode-focus')).toHaveClass('active')
      expect(screen.getByTestId('time-display')).toHaveTextContent('25:00')
    })

    it('stops timer when mode changes', () => {
      render(<MockPomodoroWidget />)
      fireEvent.click(screen.getByTestId('start-button'))
      expect(screen.getByTestId('pause-button')).toBeInTheDocument()
      
      fireEvent.click(screen.getByTestId('mode-short'))
      expect(screen.getByTestId('start-button')).toBeInTheDocument()
    })
  })

  describe('Session Tracking', () => {
    it('shows session count', () => {
      render(<MockPomodoroWidget />)
      expect(screen.getByTestId('session-count')).toHaveTextContent('Sessions: 0')
    })

    it('increments session on skip from focus', () => {
      render(<MockPomodoroWidget />)
      fireEvent.click(screen.getByTestId('skip-button'))
      expect(screen.getByTestId('session-count')).toHaveTextContent('Sessions: 1')
    })

    it('transitions to short break after focus skip', () => {
      render(<MockPomodoroWidget />)
      fireEvent.click(screen.getByTestId('skip-button'))
      expect(screen.getByTestId('mode-label')).toHaveTextContent('Short Break')
    })

    it('transitions to focus after break skip', () => {
      render(<MockPomodoroWidget />)
      fireEvent.click(screen.getByTestId('mode-short'))
      fireEvent.click(screen.getByTestId('skip-button'))
      expect(screen.getByTestId('mode-label')).toHaveTextContent('Focus')
    })

    it('triggers long break after 4 sessions', () => {
      render(<MockPomodoroWidget />)
      
      // Complete 4 focus sessions
      for (let i = 0; i < 4; i++) {
        if (screen.getByTestId('mode-label').textContent !== 'Focus') {
          fireEvent.click(screen.getByTestId('skip-button')) // Skip break
        }
        fireEvent.click(screen.getByTestId('skip-button')) // Complete focus
      }
      
      expect(screen.getByTestId('mode-label')).toHaveTextContent('Long Break')
    })
  })

  describe('Progress Bar', () => {
    it('renders progress bar', () => {
      render(<MockPomodoroWidget />)
      expect(screen.getByTestId('progress-bar')).toBeInTheDocument()
    })

    it('progress bar starts at 0%', () => {
      render(<MockPomodoroWidget />)
      expect(screen.getByTestId('progress-bar')).toHaveStyle({ width: '0%' })
    })
  })

  describe('Callbacks', () => {
    it('calls onComplete when session is skipped', () => {
      const onComplete = vi.fn()
      render(<MockPomodoroWidget onComplete={onComplete} />)
      
      fireEvent.click(screen.getByTestId('skip-button'))
      
      expect(onComplete).toHaveBeenCalledWith('focus', 1)
    })

    it('onComplete receives correct session count', () => {
      const onComplete = vi.fn()
      render(<MockPomodoroWidget onComplete={onComplete} />)
      
      // Skip 3 focus sessions
      fireEvent.click(screen.getByTestId('skip-button'))
      fireEvent.click(screen.getByTestId('skip-button')) // Skip break
      fireEvent.click(screen.getByTestId('skip-button'))
      
      expect(onComplete).toHaveBeenLastCalledWith('focus', 2)
    })
  })
})





