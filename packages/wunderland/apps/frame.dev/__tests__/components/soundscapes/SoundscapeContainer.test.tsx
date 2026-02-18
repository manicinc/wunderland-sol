/**
 * Tests for SoundscapeContainer Component
 * @module __tests__/components/soundscapes/SoundscapeContainer.test
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import {
  SoundscapeContainer,
  SoundscapeLoading,
  SoundscapeError,
  SoundscapePlaceholder,
} from '@/components/quarry/ui/soundscapes/shared/SoundscapeContainer'
import { ALL_THEMES } from '../../setup/soundscapeMocks'
import type { ThemeName } from '@/types/theme'

// ============================================================================
// SOUNDSCAPE CONTAINER TESTS
// ============================================================================

describe('SoundscapeContainer', () => {
  const defaultProps = {
    soundscapeType: 'rain' as const,
    children: <div data-testid="scene-content">Scene Content</div>,
  }

  describe('rendering', () => {
    it('renders children', () => {
      render(<SoundscapeContainer {...defaultProps} />)

      expect(screen.getByTestId('scene-content')).toBeInTheDocument()
    })

    it('renders with default dimensions', () => {
      const { container } = render(<SoundscapeContainer {...defaultProps} />)

      const wrapper = container.firstChild as HTMLElement
      expect(wrapper).toHaveStyle({ width: '400px' })
    })

    it('renders with custom dimensions', () => {
      const { container } = render(
        <SoundscapeContainer {...defaultProps} width={600} height={400} />
      )

      const wrapper = container.firstChild as HTMLElement
      expect(wrapper).toHaveStyle({ width: '600px', height: '400px' })
    })

    it('calculates height from aspect ratio when not provided', () => {
      const { container } = render(
        <SoundscapeContainer {...defaultProps} width={400} />
      )

      const wrapper = container.firstChild as HTMLElement
      // 4:3 aspect ratio: 400 / (4/3) = 300
      expect(wrapper).toHaveStyle({ height: '300px' })
    })
  })

  describe('playing indicator', () => {
    it('shows playing indicator when isPlaying', () => {
      render(<SoundscapeContainer {...defaultProps} isPlaying={true} />)

      expect(screen.getByText('Playing')).toBeInTheDocument()
    })

    it('hides playing indicator when not playing', () => {
      render(<SoundscapeContainer {...defaultProps} isPlaying={false} />)

      expect(screen.queryByText('Playing')).not.toBeInTheDocument()
    })

    it('hides playing indicator with reducedMotion', () => {
      render(
        <SoundscapeContainer
          {...defaultProps}
          isPlaying={true}
          reducedMotion={true}
        />
      )

      expect(screen.queryByText('Playing')).not.toBeInTheDocument()
    })
  })

  describe('click handling', () => {
    it('calls onClick when clicked', () => {
      const onClick = vi.fn()
      render(<SoundscapeContainer {...defaultProps} onClick={onClick} />)

      const container = screen.getByRole('button')
      fireEvent.click(container)

      expect(onClick).toHaveBeenCalledTimes(1)
    })

    it('calls onClick on Enter key', () => {
      const onClick = vi.fn()
      render(<SoundscapeContainer {...defaultProps} onClick={onClick} />)

      const container = screen.getByRole('button')
      fireEvent.keyDown(container, { key: 'Enter' })

      expect(onClick).toHaveBeenCalledTimes(1)
    })

    it('calls onClick on Space key', () => {
      const onClick = vi.fn()
      render(<SoundscapeContainer {...defaultProps} onClick={onClick} />)

      const container = screen.getByRole('button')
      fireEvent.keyDown(container, { key: ' ' })

      expect(onClick).toHaveBeenCalledTimes(1)
    })

    it('has cursor-pointer class when onClick provided', () => {
      const { container } = render(
        <SoundscapeContainer {...defaultProps} onClick={() => {}} />
      )

      expect(container.firstChild).toHaveClass('cursor-pointer')
    })
  })

  describe('overlay', () => {
    it('renders overlay content', () => {
      render(
        <SoundscapeContainer
          {...defaultProps}
          overlay={<div data-testid="overlay-content">Overlay</div>}
        />
      )

      expect(screen.getByTestId('overlay-content')).toBeInTheDocument()
    })
  })

  describe('theme support', () => {
    it.each(ALL_THEMES)('renders correctly with %s theme', (theme) => {
      const { container } = render(
        <SoundscapeContainer {...defaultProps} theme={theme} />
      )

      // Should render without errors
      expect(container.firstChild).toBeInTheDocument()
    })

    it('applies square corners for terminal themes', () => {
      const { container } = render(
        <SoundscapeContainer {...defaultProps} theme="terminal-dark" />
      )

      const wrapper = container.firstChild as HTMLElement
      expect(wrapper).toHaveStyle({ borderRadius: '0px' })
    })

    it('applies rounded corners for non-terminal themes', () => {
      const { container } = render(
        <SoundscapeContainer {...defaultProps} theme="dark" borderRadius={12} />
      )

      const wrapper = container.firstChild as HTMLElement
      expect(wrapper).toHaveStyle({ borderRadius: '12px' })
    })

    it('renders terminal phosphor overlay for terminal theme', () => {
      const { container } = render(
        <SoundscapeContainer {...defaultProps} theme="terminal-dark" />
      )

      // Check for phosphor overlay with screen blend mode
      const overlays = container.querySelectorAll('[style*="mix-blend-mode: screen"]')
      expect(overlays.length).toBeGreaterThan(0)
    })

    it('renders sepia filter overlay for sepia theme', () => {
      const { container } = render(
        <SoundscapeContainer {...defaultProps} theme="sepia-dark" />
      )

      // Check for sepia overlay with multiply blend mode
      const overlays = container.querySelectorAll('[style*="mix-blend-mode: multiply"]')
      expect(overlays.length).toBeGreaterThan(0)
    })

    it('handles null theme gracefully', () => {
      const { container } = render(
        <SoundscapeContainer {...defaultProps} theme={null} />
      )

      expect(container.firstChild).toBeInTheDocument()
    })

    it('handles undefined theme gracefully', () => {
      const { container } = render(
        <SoundscapeContainer {...defaultProps} theme={undefined} />
      )

      expect(container.firstChild).toBeInTheDocument()
    })
  })

  describe('soundscape types', () => {
    const soundscapeTypes = [
      'rain',
      'cafe',
      'forest',
      'ocean',
      'fireplace',
      'lofi',
      'white-noise',
      'none',
    ] as const

    it.each(soundscapeTypes)('renders with %s soundscape', (type) => {
      const { container } = render(
        <SoundscapeContainer {...defaultProps} soundscapeType={type} />
      )

      expect(container.firstChild).toBeInTheDocument()
    })
  })

  describe('glow effect', () => {
    it('shows glow when playing and showGlow is true', () => {
      const { container } = render(
        <SoundscapeContainer
          {...defaultProps}
          isPlaying={true}
          showGlow={true}
        />
      )

      // Container should have active animation state
      expect(container.firstChild).toBeInTheDocument()
    })

    it('hides glow when showGlow is false', () => {
      const { container } = render(
        <SoundscapeContainer
          {...defaultProps}
          isPlaying={true}
          showGlow={false}
        />
      )

      // Should still render but without glow
      expect(container.firstChild).toBeInTheDocument()
    })

    it('hides glow when reducedMotion is true', () => {
      const { container } = render(
        <SoundscapeContainer
          {...defaultProps}
          isPlaying={true}
          showGlow={true}
          reducedMotion={true}
        />
      )

      expect(container.firstChild).toBeInTheDocument()
    })
  })
})

// ============================================================================
// SOUNDSCAPE LOADING TESTS
// ============================================================================

describe('SoundscapeLoading', () => {
  it('renders with default dimensions', () => {
    const { container } = render(<SoundscapeLoading />)

    const wrapper = container.firstChild as HTMLElement
    expect(wrapper).toHaveStyle({ width: '400px', height: '300px' })
  })

  it('renders with custom dimensions', () => {
    const { container } = render(
      <SoundscapeLoading width={500} height={400} />
    )

    const wrapper = container.firstChild as HTMLElement
    expect(wrapper).toHaveStyle({ width: '500px', height: '400px' })
  })

  it('renders spinner', () => {
    const { container } = render(<SoundscapeLoading />)

    // Check for rotating element
    const spinner = container.querySelector('[class*="border-2"]')
    expect(spinner).toBeInTheDocument()
  })

  it.each(ALL_THEMES)('applies %s theme styling', (theme) => {
    const { container } = render(<SoundscapeLoading theme={theme} />)

    expect(container.firstChild).toBeInTheDocument()
  })

  it('applies square corners for terminal themes', () => {
    const { container } = render(<SoundscapeLoading theme="terminal-dark" />)

    expect(container.firstChild).toHaveClass('rounded-none')
  })

  it('applies rounded corners for non-terminal themes', () => {
    const { container } = render(<SoundscapeLoading theme="dark" />)

    expect(container.firstChild).toHaveClass('rounded-xl')
  })
})

// ============================================================================
// SOUNDSCAPE ERROR TESTS
// ============================================================================

describe('SoundscapeError', () => {
  it('renders with default message', () => {
    render(<SoundscapeError />)

    expect(screen.getByText('Failed to load scene')).toBeInTheDocument()
  })

  it('renders with custom message', () => {
    render(<SoundscapeError message="Custom error message" />)

    expect(screen.getByText('Custom error message')).toBeInTheDocument()
  })

  it('renders error icon', () => {
    const { container } = render(<SoundscapeError />)

    const icon = container.querySelector('svg')
    expect(icon).toBeInTheDocument()
  })

  it('renders with default dimensions', () => {
    const { container } = render(<SoundscapeError />)

    const wrapper = container.firstChild as HTMLElement
    expect(wrapper).toHaveStyle({ width: '400px', height: '300px' })
  })

  it.each(ALL_THEMES)('applies %s theme styling', (theme) => {
    const { container } = render(<SoundscapeError theme={theme} />)

    expect(container.firstChild).toBeInTheDocument()
  })
})

// ============================================================================
// SOUNDSCAPE PLACEHOLDER TESTS
// ============================================================================

describe('SoundscapePlaceholder', () => {
  it('renders with soundscape type label', () => {
    render(<SoundscapePlaceholder soundscapeType="rain" />)

    expect(screen.getByText('rain')).toBeInTheDocument()
  })

  it('renders with custom label', () => {
    render(<SoundscapePlaceholder soundscapeType="white-noise" label="Static" />)

    expect(screen.getByText('Static')).toBeInTheDocument()
  })

  it('renders music icon', () => {
    const { container } = render(<SoundscapePlaceholder soundscapeType="lofi" />)

    const icon = container.querySelector('svg')
    expect(icon).toBeInTheDocument()
  })

  it('formats hyphenated labels', () => {
    render(<SoundscapePlaceholder soundscapeType="white-noise" />)

    // Should display "white noise" instead of "white-noise"
    expect(screen.getByText('white noise')).toBeInTheDocument()
  })

  it.each(ALL_THEMES)('applies %s theme styling', (theme) => {
    const { container } = render(
      <SoundscapePlaceholder soundscapeType="cafe" theme={theme} />
    )

    expect(container.firstChild).toBeInTheDocument()
  })

  it('uses monospace font for terminal themes', () => {
    render(<SoundscapePlaceholder soundscapeType="forest" theme="terminal-dark" />)

    const label = screen.getByText('forest')
    expect(label).toHaveClass('font-mono')
  })
})
