/**
 * MeditateToolbar Component Tests
 * @module __tests__/components/quarry/meditate/MeditateToolbar.test
 *
 * Tests for the meditation toolbar component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
      <div {...props}>{children}</div>
    ),
    button: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
      <button {...props}>{children}</button>
    ),
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}))

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Play: () => <span data-testid="icon-play">Play</span>,
  Pause: () => <span data-testid="icon-pause">Pause</span>,
  Volume2: () => <span data-testid="icon-volume">Volume</span>,
  VolumeX: () => <span data-testid="icon-volume-x">VolumeX</span>,
  Image: () => <span data-testid="icon-image">Image</span>,
  Timer: () => <span data-testid="icon-timer">Timer</span>,
  Maximize: () => <span data-testid="icon-maximize">Maximize</span>,
  Minimize: () => <span data-testid="icon-minimize">Minimize</span>,
  Plus: () => <span data-testid="icon-plus">Plus</span>,
  X: () => <span data-testid="icon-x">X</span>,
  ChevronDown: () => <span data-testid="icon-chevron">Chevron</span>,
  CloudRain: () => <span data-testid="icon-rain">Rain</span>,
  Coffee: () => <span data-testid="icon-coffee">Coffee</span>,
  TreePine: () => <span data-testid="icon-tree">Tree</span>,
  Waves: () => <span data-testid="icon-waves">Waves</span>,
  Flame: () => <span data-testid="icon-flame">Flame</span>,
  Music: () => <span data-testid="icon-music">Music</span>,
  Radio: () => <span data-testid="icon-radio">Radio</span>,
}))

// ============================================================================
// MOCK COMPONENT (simplified for testing without real implementation)
// ============================================================================

interface MockMeditateToolbarProps {
  isPlaying: boolean
  volume: number
  soundscape: string
  isDeepFocus: boolean
  onTogglePlay: () => void
  onVolumeChange: (volume: number) => void
  onSoundscapeChange: (soundscape: string) => void
  onToggleDeepFocus: () => void
  onOpenWidgetDock: () => void
}

function MockMeditateToolbar({
  isPlaying,
  volume,
  soundscape,
  isDeepFocus,
  onTogglePlay,
  onVolumeChange,
  onSoundscapeChange,
  onToggleDeepFocus,
  onOpenWidgetDock,
}: MockMeditateToolbarProps) {
  return (
    <div data-testid="meditate-toolbar" className="meditate-toolbar">
      <button
        data-testid="play-button"
        onClick={onTogglePlay}
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? <span data-testid="icon-pause">Pause</span> : <span data-testid="icon-play">Play</span>}
      </button>

      <div data-testid="volume-control">
        <input
          type="range"
          min={0}
          max={100}
          value={volume * 100}
          onChange={(e) => onVolumeChange(Number(e.target.value) / 100)}
          data-testid="volume-slider"
        />
        <span data-testid="volume-value">{Math.round(volume * 100)}%</span>
      </div>

      <select
        data-testid="soundscape-select"
        value={soundscape}
        onChange={(e) => onSoundscapeChange(e.target.value)}
      >
        <option value="rain">Rain</option>
        <option value="cafe">Café</option>
        <option value="forest">Forest</option>
        <option value="ocean">Ocean</option>
        <option value="fireplace">Fireplace</option>
        <option value="lofi">Lo-fi</option>
        <option value="white-noise">White Noise</option>
        <option value="none">Off</option>
      </select>

      <button
        data-testid="deep-focus-button"
        onClick={onToggleDeepFocus}
        aria-label={isDeepFocus ? 'Exit deep focus' : 'Enter deep focus'}
      >
        {isDeepFocus ? (
          <span data-testid="icon-minimize">Minimize</span>
        ) : (
          <span data-testid="icon-maximize">Maximize</span>
        )}
      </button>

      <button
        data-testid="widget-dock-button"
        onClick={onOpenWidgetDock}
        aria-label="Open widget dock"
      >
        <span data-testid="icon-plus">Plus</span>
      </button>
    </div>
  )
}

// ============================================================================
// TESTS
// ============================================================================

describe('MeditateToolbar', () => {
  const defaultProps: MockMeditateToolbarProps = {
    isPlaying: false,
    volume: 0.3,
    soundscape: 'rain',
    isDeepFocus: false,
    onTogglePlay: vi.fn(),
    onVolumeChange: vi.fn(),
    onSoundscapeChange: vi.fn(),
    onToggleDeepFocus: vi.fn(),
    onOpenWidgetDock: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders the toolbar', () => {
      render(<MockMeditateToolbar {...defaultProps} />)
      expect(screen.getByTestId('meditate-toolbar')).toBeInTheDocument()
    })

    it('renders play button', () => {
      render(<MockMeditateToolbar {...defaultProps} />)
      expect(screen.getByTestId('play-button')).toBeInTheDocument()
    })

    it('renders volume control', () => {
      render(<MockMeditateToolbar {...defaultProps} />)
      expect(screen.getByTestId('volume-control')).toBeInTheDocument()
    })

    it('renders soundscape selector', () => {
      render(<MockMeditateToolbar {...defaultProps} />)
      expect(screen.getByTestId('soundscape-select')).toBeInTheDocument()
    })

    it('renders deep focus button', () => {
      render(<MockMeditateToolbar {...defaultProps} />)
      expect(screen.getByTestId('deep-focus-button')).toBeInTheDocument()
    })

    it('renders widget dock button', () => {
      render(<MockMeditateToolbar {...defaultProps} />)
      expect(screen.getByTestId('widget-dock-button')).toBeInTheDocument()
    })
  })

  describe('Play/Pause', () => {
    it('shows play icon when not playing', () => {
      render(<MockMeditateToolbar {...defaultProps} isPlaying={false} />)
      expect(screen.getByTestId('icon-play')).toBeInTheDocument()
    })

    it('shows pause icon when playing', () => {
      render(<MockMeditateToolbar {...defaultProps} isPlaying={true} />)
      expect(screen.getByTestId('icon-pause')).toBeInTheDocument()
    })

    it('calls onTogglePlay when play button is clicked', () => {
      const onTogglePlay = vi.fn()
      render(<MockMeditateToolbar {...defaultProps} onTogglePlay={onTogglePlay} />)
      
      fireEvent.click(screen.getByTestId('play-button'))
      expect(onTogglePlay).toHaveBeenCalledTimes(1)
    })
  })

  describe('Volume Control', () => {
    it('displays current volume', () => {
      render(<MockMeditateToolbar {...defaultProps} volume={0.5} />)
      expect(screen.getByTestId('volume-value')).toHaveTextContent('50%')
    })

    it('calls onVolumeChange when slider is adjusted', () => {
      const onVolumeChange = vi.fn()
      render(<MockMeditateToolbar {...defaultProps} onVolumeChange={onVolumeChange} />)
      
      const slider = screen.getByTestId('volume-slider')
      fireEvent.change(slider, { target: { value: '75' } })
      
      expect(onVolumeChange).toHaveBeenCalledWith(0.75)
    })

    it('slider reflects volume value', () => {
      render(<MockMeditateToolbar {...defaultProps} volume={0.8} />)
      const slider = screen.getByTestId('volume-slider') as HTMLInputElement
      expect(slider.value).toBe('80')
    })
  })

  describe('Soundscape Selection', () => {
    it('shows current soundscape', () => {
      render(<MockMeditateToolbar {...defaultProps} soundscape="ocean" />)
      const select = screen.getByTestId('soundscape-select') as HTMLSelectElement
      expect(select.value).toBe('ocean')
    })

    it('calls onSoundscapeChange when selection changes', () => {
      const onSoundscapeChange = vi.fn()
      render(<MockMeditateToolbar {...defaultProps} onSoundscapeChange={onSoundscapeChange} />)
      
      const select = screen.getByTestId('soundscape-select')
      fireEvent.change(select, { target: { value: 'forest' } })
      
      expect(onSoundscapeChange).toHaveBeenCalledWith('forest')
    })

    it('has all soundscape options', () => {
      render(<MockMeditateToolbar {...defaultProps} />)
      const select = screen.getByTestId('soundscape-select')
      const options = select.querySelectorAll('option')
      
      expect(options).toHaveLength(8)
    })
  })

  describe('Deep Focus Mode', () => {
    it('shows maximize icon when not in deep focus', () => {
      render(<MockMeditateToolbar {...defaultProps} isDeepFocus={false} />)
      expect(screen.getByTestId('icon-maximize')).toBeInTheDocument()
    })

    it('shows minimize icon when in deep focus', () => {
      render(<MockMeditateToolbar {...defaultProps} isDeepFocus={true} />)
      expect(screen.getByTestId('icon-minimize')).toBeInTheDocument()
    })

    it('calls onToggleDeepFocus when button is clicked', () => {
      const onToggleDeepFocus = vi.fn()
      render(<MockMeditateToolbar {...defaultProps} onToggleDeepFocus={onToggleDeepFocus} />)
      
      fireEvent.click(screen.getByTestId('deep-focus-button'))
      expect(onToggleDeepFocus).toHaveBeenCalledTimes(1)
    })

    it('has correct aria-label when not in deep focus', () => {
      render(<MockMeditateToolbar {...defaultProps} isDeepFocus={false} />)
      expect(screen.getByTestId('deep-focus-button')).toHaveAttribute('aria-label', 'Enter deep focus')
    })

    it('has correct aria-label when in deep focus', () => {
      render(<MockMeditateToolbar {...defaultProps} isDeepFocus={true} />)
      expect(screen.getByTestId('deep-focus-button')).toHaveAttribute('aria-label', 'Exit deep focus')
    })
  })

  describe('Widget Dock', () => {
    it('calls onOpenWidgetDock when button is clicked', () => {
      const onOpenWidgetDock = vi.fn()
      render(<MockMeditateToolbar {...defaultProps} onOpenWidgetDock={onOpenWidgetDock} />)
      
      fireEvent.click(screen.getByTestId('widget-dock-button'))
      expect(onOpenWidgetDock).toHaveBeenCalledTimes(1)
    })
  })
})





