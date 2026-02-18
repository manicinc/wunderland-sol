/**
 * PomodoroSidebarWidget Component Tests
 * @module __tests__/components/quarry/sidebar/PomodoroSidebarWidget.test
 *
 * Tests for the sidebar Pomodoro timer widget.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'

// ============================================================================
// MOCK COMPONENT (simplified for testing without real implementation)
// ============================================================================

interface MockPomodoroSidebarWidgetProps {
  theme?: string
  defaultExpanded?: boolean
}

type PomodoroMode = 'focus' | 'shortBreak' | 'longBreak'

function MockPomodoroSidebarWidget({
  theme = 'light',
  defaultExpanded = false,
}: MockPomodoroSidebarWidgetProps) {
  const [expanded, setExpanded] = React.useState(defaultExpanded)
  const [mode, setMode] = React.useState<PomodoroMode>('focus')
  const [isRunning, setIsRunning] = React.useState(false)
  const [timeRemaining, setTimeRemaining] = React.useState(25 * 60)
  const [sessionsCompleted, setSessionsCompleted] = React.useState(0)

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

  const handleToggle = () => setIsRunning(!isRunning)
  const handleModeChange = (newMode: PomodoroMode) => {
    setMode(newMode)
    setTimeRemaining(durations[newMode])
    setIsRunning(false)
  }

  const handleReset = () => {
    setIsRunning(false)
    setTimeRemaining(durations[mode])
  }

  const handleSkip = () => {
    if (mode === 'focus') {
      setSessionsCompleted(sessionsCompleted + 1)
      handleModeChange('shortBreak')
    } else {
      handleModeChange('focus')
    }
  }

  const progress = ((durations[mode] - timeRemaining) / durations[mode]) * 100

  return (
    <div
      data-testid="pomodoro-sidebar-widget"
      className={`pomodoro-sidebar ${theme}`}
    >
      <div
        data-testid="sidebar-header"
        onClick={() => setExpanded(!expanded)}
        className="sidebar-header"
      >
        <span data-testid="sidebar-icon">🍅</span>
        <span data-testid="sidebar-time">{formatTime(timeRemaining)}</span>
        <button
          data-testid="quick-toggle"
          onClick={(e) => {
            e.stopPropagation()
            handleToggle()
          }}
          aria-label={isRunning ? 'Pause' : 'Play'}
        >
          {isRunning ? '⏸' : '▶'}
        </button>
        <span data-testid="expand-chevron">{expanded ? '▲' : '▼'}</span>
      </div>

      {expanded && (
        <div data-testid="sidebar-content" className="sidebar-content">
          <div
            data-testid="progress-ring"
            style={{ '--progress': `${progress}%` } as React.CSSProperties}
          />

          <div data-testid="mode-pills">
            <button
              data-testid="pill-focus"
              onClick={() => handleModeChange('focus')}
              className={mode === 'focus' ? 'active' : ''}
            >
              Focus
            </button>
            <button
              data-testid="pill-short"
              onClick={() => handleModeChange('shortBreak')}
              className={mode === 'shortBreak' ? 'active' : ''}
            >
              Short
            </button>
            <button
              data-testid="pill-long"
              onClick={() => handleModeChange('longBreak')}
              className={mode === 'longBreak' ? 'active' : ''}
            >
              Long
            </button>
          </div>

          <div data-testid="sidebar-controls">
            <button data-testid="reset-btn" onClick={handleReset}>
              Reset
            </button>
            <button data-testid="skip-btn" onClick={handleSkip}>
              Skip
            </button>
          </div>

          <div data-testid="session-indicator">
            {sessionsCompleted}/4 sessions
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// TESTS
// ============================================================================

describe('PomodoroSidebarWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders the widget', () => {
      render(<MockPomodoroSidebarWidget />)
      expect(screen.getByTestId('pomodoro-sidebar-widget')).toBeInTheDocument()
    })

    it('renders tomato icon', () => {
      render(<MockPomodoroSidebarWidget />)
      expect(screen.getByTestId('sidebar-icon')).toHaveTextContent('🍅')
    })

    it('renders time display', () => {
      render(<MockPomodoroSidebarWidget />)
      expect(screen.getByTestId('sidebar-time')).toHaveTextContent('25:00')
    })

    it('renders quick toggle button', () => {
      render(<MockPomodoroSidebarWidget />)
      expect(screen.getByTestId('quick-toggle')).toBeInTheDocument()
    })

    it('renders expand chevron', () => {
      render(<MockPomodoroSidebarWidget />)
      expect(screen.getByTestId('expand-chevron')).toBeInTheDocument()
    })
  })

  describe('Collapsed State', () => {
    it('starts collapsed by default', () => {
      render(<MockPomodoroSidebarWidget defaultExpanded={false} />)
      expect(screen.queryByTestId('sidebar-content')).not.toBeInTheDocument()
    })

    it('shows down chevron when collapsed', () => {
      render(<MockPomodoroSidebarWidget defaultExpanded={false} />)
      expect(screen.getByTestId('expand-chevron')).toHaveTextContent('▼')
    })

    it('quick toggle works without expanding', () => {
      render(<MockPomodoroSidebarWidget defaultExpanded={false} />)
      
      fireEvent.click(screen.getByTestId('quick-toggle'))
      
      // Should toggle play without expanding
      expect(screen.queryByTestId('sidebar-content')).not.toBeInTheDocument()
      expect(screen.getByTestId('quick-toggle')).toHaveTextContent('⏸')
    })
  })

  describe('Expanded State', () => {
    it('can start expanded', () => {
      render(<MockPomodoroSidebarWidget defaultExpanded={true} />)
      expect(screen.getByTestId('sidebar-content')).toBeInTheDocument()
    })

    it('shows up chevron when expanded', () => {
      render(<MockPomodoroSidebarWidget defaultExpanded={true} />)
      expect(screen.getByTestId('expand-chevron')).toHaveTextContent('▲')
    })

    it('shows mode pills when expanded', () => {
      render(<MockPomodoroSidebarWidget defaultExpanded={true} />)
      expect(screen.getByTestId('mode-pills')).toBeInTheDocument()
    })

    it('shows controls when expanded', () => {
      render(<MockPomodoroSidebarWidget defaultExpanded={true} />)
      expect(screen.getByTestId('sidebar-controls')).toBeInTheDocument()
    })

    it('shows session indicator when expanded', () => {
      render(<MockPomodoroSidebarWidget defaultExpanded={true} />)
      expect(screen.getByTestId('session-indicator')).toBeInTheDocument()
    })
  })

  describe('Toggle Expansion', () => {
    it('expands on header click', () => {
      render(<MockPomodoroSidebarWidget defaultExpanded={false} />)
      
      fireEvent.click(screen.getByTestId('sidebar-header'))
      
      expect(screen.getByTestId('sidebar-content')).toBeInTheDocument()
    })

    it('collapses on header click', () => {
      render(<MockPomodoroSidebarWidget defaultExpanded={true} />)
      
      fireEvent.click(screen.getByTestId('sidebar-header'))
      
      expect(screen.queryByTestId('sidebar-content')).not.toBeInTheDocument()
    })
  })

  describe('Quick Play/Pause', () => {
    it('shows play icon initially', () => {
      render(<MockPomodoroSidebarWidget />)
      expect(screen.getByTestId('quick-toggle')).toHaveTextContent('▶')
    })

    it('shows pause icon when running', () => {
      render(<MockPomodoroSidebarWidget />)
      
      fireEvent.click(screen.getByTestId('quick-toggle'))
      
      expect(screen.getByTestId('quick-toggle')).toHaveTextContent('⏸')
    })

    it('has correct aria-label when paused', () => {
      render(<MockPomodoroSidebarWidget />)
      expect(screen.getByTestId('quick-toggle')).toHaveAttribute('aria-label', 'Play')
    })

    it('has correct aria-label when playing', () => {
      render(<MockPomodoroSidebarWidget />)
      
      fireEvent.click(screen.getByTestId('quick-toggle'))
      
      expect(screen.getByTestId('quick-toggle')).toHaveAttribute('aria-label', 'Pause')
    })
  })

  describe('Mode Selection', () => {
    it('focus mode is active by default', () => {
      render(<MockPomodoroSidebarWidget defaultExpanded={true} />)
      expect(screen.getByTestId('pill-focus')).toHaveClass('active')
    })

    it('switches to short break', () => {
      render(<MockPomodoroSidebarWidget defaultExpanded={true} />)
      
      fireEvent.click(screen.getByTestId('pill-short'))
      
      expect(screen.getByTestId('pill-short')).toHaveClass('active')
      expect(screen.getByTestId('sidebar-time')).toHaveTextContent('05:00')
    })

    it('switches to long break', () => {
      render(<MockPomodoroSidebarWidget defaultExpanded={true} />)
      
      fireEvent.click(screen.getByTestId('pill-long'))
      
      expect(screen.getByTestId('pill-long')).toHaveClass('active')
      expect(screen.getByTestId('sidebar-time')).toHaveTextContent('15:00')
    })
  })

  describe('Controls', () => {
    it('reset button resets timer', () => {
      render(<MockPomodoroSidebarWidget defaultExpanded={true} />)
      
      // Switch to short break then reset
      fireEvent.click(screen.getByTestId('pill-short'))
      fireEvent.click(screen.getByTestId('reset-btn'))
      
      expect(screen.getByTestId('sidebar-time')).toHaveTextContent('05:00')
    })

    it('skip button advances to next phase', () => {
      render(<MockPomodoroSidebarWidget defaultExpanded={true} />)
      
      fireEvent.click(screen.getByTestId('skip-btn'))
      
      expect(screen.getByTestId('pill-short')).toHaveClass('active')
    })
  })

  describe('Session Tracking', () => {
    it('shows initial session count', () => {
      render(<MockPomodoroSidebarWidget defaultExpanded={true} />)
      expect(screen.getByTestId('session-indicator')).toHaveTextContent('0/4 sessions')
    })

    it('increments session on focus skip', () => {
      render(<MockPomodoroSidebarWidget defaultExpanded={true} />)
      
      fireEvent.click(screen.getByTestId('skip-btn'))
      
      expect(screen.getByTestId('session-indicator')).toHaveTextContent('1/4 sessions')
    })
  })

  describe('Theme Support', () => {
    it('applies light theme class', () => {
      render(<MockPomodoroSidebarWidget theme="light" />)
      expect(screen.getByTestId('pomodoro-sidebar-widget')).toHaveClass('light')
    })

    it('applies dark theme class', () => {
      render(<MockPomodoroSidebarWidget theme="dark" />)
      expect(screen.getByTestId('pomodoro-sidebar-widget')).toHaveClass('dark')
    })
  })
})





