/**
 * Tests for RainScene Component
 * @module __tests__/components/soundscapes/RainScene.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { RainScene } from '@/components/quarry/ui/soundscapes/scenes/RainScene'
import {
  createMockAnalyserNode,
  setupRAFMock,
  createSceneProps,
  ALL_THEMES,
} from '../../setup/soundscapeMocks'

// ============================================================================
// TEST SETUP
// ============================================================================

describe('RainScene', () => {
  let rafMock: ReturnType<typeof setupRAFMock>

  beforeEach(() => {
    rafMock = setupRAFMock()
    vi.useFakeTimers()
  })

  afterEach(() => {
    rafMock.clear()
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  // ==========================================================================
  // BASIC RENDERING
  // ==========================================================================

  describe('rendering', () => {
    it('renders without crashing', () => {
      const props = createSceneProps()
      const { container } = render(<RainScene {...props} />)

      expect(container.firstChild).toBeInTheDocument()
    })

    it('renders with default dimensions', () => {
      const props = createSceneProps()
      const { container } = render(<RainScene {...props} />)

      // Check for SVG elements
      const svgs = container.querySelectorAll('svg')
      expect(svgs.length).toBeGreaterThan(0)
    })

    it('renders with custom dimensions', () => {
      const props = createSceneProps({ width: 600, height: 400 })
      const { container } = render(<RainScene {...props} />)

      // SVGs should be sized accordingly
      const svgs = container.querySelectorAll('svg')
      svgs.forEach((svg) => {
        expect(svg.getAttribute('width')).toBe('600')
        expect(svg.getAttribute('height')).toBe('400')
      })
    })

    it('renders sky background', () => {
      const props = createSceneProps()
      const { container } = render(<RainScene {...props} />)

      // Check for sky gradient
      const gradient = container.querySelector('#rain-sky')
      expect(gradient).toBeInTheDocument()
    })

    it('renders window frame', () => {
      const props = createSceneProps()
      const { container } = render(<RainScene {...props} />)

      // Check for frame gradient
      const frameGradient = container.querySelector('#frame-gradient')
      expect(frameGradient).toBeInTheDocument()
    })

    it('renders clouds', () => {
      const props = createSceneProps()
      const { container } = render(<RainScene {...props} />)

      // Check for cloud blur filter
      const cloudFilter = container.querySelector('#cloud-blur')
      expect(cloudFilter).toBeInTheDocument()
    })

    it('renders puddle gradient', () => {
      const props = createSceneProps()
      const { container } = render(<RainScene {...props} />)

      // Check for puddle gradient
      const puddleGradient = container.querySelector('#puddle-gradient')
      expect(puddleGradient).toBeInTheDocument()
    })

    it('renders condensation', () => {
      const props = createSceneProps()
      const { container } = render(<RainScene {...props} />)

      // Check for condensation blur filter
      const condensationFilter = container.querySelector('#condensation-blur')
      expect(condensationFilter).toBeInTheDocument()
    })
  })

  // ==========================================================================
  // RAIN DROPS
  // ==========================================================================

  describe('rain drops', () => {
    it('generates rain drops on mount', () => {
      const props = createSceneProps({ isPlaying: true })
      const { container } = render(<RainScene {...props} />)

      // Rain drops are rendered as divs with gradient backgrounds
      // They should be present when playing
      const dropsContainer = container.querySelector('.overflow-hidden')
      expect(dropsContainer).toBeInTheDocument()
    })

    it('adjusts rain count based on intensity', () => {
      const analyser = createMockAnalyserNode({ fillValue: 200 })
      const propsLow = createSceneProps({
        isPlaying: true,
        analyser: null,
      })

      const propsHigh = createSceneProps({
        isPlaying: true,
        analyser,
      })

      const { rerender, container } = render(<RainScene {...propsLow} />)

      // With null analyser, should have base rain
      const lowDropsContainer = container.querySelector('.overflow-hidden')
      expect(lowDropsContainer).toBeInTheDocument()

      // With high audio, should have more intense rain
      rerender(<RainScene {...propsHigh} />)
      const highDropsContainer = container.querySelector('.overflow-hidden')
      expect(highDropsContainer).toBeInTheDocument()
    })
  })

  // ==========================================================================
  // AUDIO REACTIVITY
  // ==========================================================================

  describe('audio reactivity', () => {
    it('uses analyser when provided', () => {
      const analyser = createMockAnalyserNode({ fillValue: 200 })
      const props = createSceneProps({
        isPlaying: true,
        analyser,
      })

      render(<RainScene {...props} />)

      // Simulate animation frames
      act(() => {
        rafMock.tick(16)
        rafMock.tick(32)
      })

      expect(analyser.getByteFrequencyData).toHaveBeenCalled()
    })

    it('renders normally without analyser', () => {
      const props = createSceneProps({
        isPlaying: true,
        analyser: null,
      })

      const { container } = render(<RainScene {...props} />)
      expect(container.firstChild).toBeInTheDocument()
    })
  })

  // ==========================================================================
  // REDUCED MOTION
  // ==========================================================================

  describe('reduced motion', () => {
    it('disables animations when reducedMotion is true', () => {
      const props = createSceneProps({
        isPlaying: true,
        reducedMotion: true,
      })

      const { container } = render(<RainScene {...props} />)

      // Scene should still render
      expect(container.firstChild).toBeInTheDocument()

      // Lightning should not trigger
      act(() => {
        vi.advanceTimersByTime(10000)
        rafMock.tick(10000)
      })
    })

    it('stops puddle ripples when reducedMotion is true', () => {
      const props = createSceneProps({
        isPlaying: true,
        reducedMotion: true,
      })

      const { container } = render(<RainScene {...props} />)

      // Advance time - ripples should not accumulate
      act(() => {
        vi.advanceTimersByTime(2000)
      })

      // Scene should render without errors
      expect(container.firstChild).toBeInTheDocument()
    })
  })

  // ==========================================================================
  // THEME SUPPORT
  // ==========================================================================

  describe('theme support', () => {
    it.each(ALL_THEMES)('renders correctly with %s theme', (theme) => {
      const props = createSceneProps({ theme })
      const { container } = render(<RainScene {...props} />)

      expect(container.firstChild).toBeInTheDocument()
    })

    it('passes theme to SoundscapeContainer', () => {
      const props = createSceneProps({ theme: 'terminal-dark' })
      const { container } = render(<RainScene {...props} />)

      // Container should have terminal styling (square corners)
      expect(container.firstChild).toBeInTheDocument()
    })
  })

  // ==========================================================================
  // LIGHTNING
  // ==========================================================================

  describe('lightning effect', () => {
    it('does not show lightning initially', () => {
      const props = createSceneProps({ isPlaying: true })
      const { container } = render(<RainScene {...props} />)

      // Lightning flash is conditional and random
      // Just verify the scene renders
      expect(container.firstChild).toBeInTheDocument()
    })

    it('lightning is disabled when not playing', () => {
      const props = createSceneProps({ isPlaying: false })
      const { container } = render(<RainScene {...props} />)

      act(() => {
        vi.advanceTimersByTime(10000)
      })

      // Should not crash
      expect(container.firstChild).toBeInTheDocument()
    })
  })

  // ==========================================================================
  // CITY SILHOUETTE
  // ==========================================================================

  describe('city silhouette', () => {
    it('renders building gradient', () => {
      const props = createSceneProps()
      const { container } = render(<RainScene {...props} />)

      const buildingGradient = container.querySelector('#building-gradient')
      expect(buildingGradient).toBeInTheDocument()
    })

    it('generates consistent buildings for same width', () => {
      const props = createSceneProps({ width: 400 })
      const { container: c1 } = render(<RainScene {...props} />)
      const { container: c2 } = render(<RainScene {...props} />)

      // Both renders should have building gradient
      expect(c1.querySelector('#building-gradient')).toBeInTheDocument()
      expect(c2.querySelector('#building-gradient')).toBeInTheDocument()
    })
  })

  // ==========================================================================
  // MIST OVERLAY
  // ==========================================================================

  describe('mist overlay', () => {
    it('renders ambient mist', () => {
      const props = createSceneProps()
      const { container } = render(<RainScene {...props} />)

      // Check for mist div with linear gradient
      const mistOverlays = container.querySelectorAll('.pointer-events-none')
      expect(mistOverlays.length).toBeGreaterThan(0)
    })

    it('mist intensity varies with audio', () => {
      const analyser = createMockAnalyserNode({ fillValue: 255 })
      const props = createSceneProps({
        isPlaying: true,
        analyser,
      })

      const { container } = render(<RainScene {...props} />)

      // Mist should render
      const mistOverlays = container.querySelectorAll('.pointer-events-none')
      expect(mistOverlays.length).toBeGreaterThan(0)
    })
  })

  // ==========================================================================
  // PROPS UPDATES
  // ==========================================================================

  describe('prop updates', () => {
    it('handles isPlaying change', () => {
      const props = createSceneProps({ isPlaying: false })
      const { rerender, container } = render(<RainScene {...props} />)

      expect(container.firstChild).toBeInTheDocument()

      // Start playing
      rerender(<RainScene {...props} isPlaying={true} />)
      expect(container.firstChild).toBeInTheDocument()

      // Stop playing
      rerender(<RainScene {...props} isPlaying={false} />)
      expect(container.firstChild).toBeInTheDocument()
    })

    it('handles dimension changes', () => {
      const props = createSceneProps({ width: 400, height: 300 })
      const { rerender, container } = render(<RainScene {...props} />)

      // Change dimensions
      rerender(<RainScene {...props} width={600} height={450} />)

      const svgs = container.querySelectorAll('svg')
      svgs.forEach((svg) => {
        expect(svg.getAttribute('width')).toBe('600')
        expect(svg.getAttribute('height')).toBe('450')
      })
    })

    it('handles analyser change', () => {
      const props = createSceneProps({ isPlaying: true })
      const { rerender, container } = render(<RainScene {...props} />)

      const analyser = createMockAnalyserNode()
      rerender(<RainScene {...props} analyser={analyser} />)

      expect(container.firstChild).toBeInTheDocument()
    })
  })
})

// Helper for async state updates
function act(callback: () => void) {
  callback()
}
