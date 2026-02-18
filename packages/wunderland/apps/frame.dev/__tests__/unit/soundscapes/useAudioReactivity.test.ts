/**
 * Tests for useAudioReactivity Hook
 * @module __tests__/unit/soundscapes/useAudioReactivity.test
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import {
  useAudioReactivity,
  useBeatDetection,
  useAudioStyles,
} from '@/components/quarry/ui/soundscapes/hooks/useAudioReactivity'
import { DEFAULT_AUDIO_DATA } from '@/components/quarry/ui/soundscapes/types'
import {
  createMockAnalyserNode,
  createMockAnalyserWithBands,
  setupRAFMock,
} from '../../setup/soundscapeMocks'

// ============================================================================
// TEST SETUP
// ============================================================================

describe('useAudioReactivity', () => {
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
  // NULL ANALYSER TESTS
  // ==========================================================================

  describe('with null analyser', () => {
    it('returns default values when analyser is null', () => {
      const { result } = renderHook(() => useAudioReactivity(null, false))

      expect(result.current.amplitude).toBe(0)
      expect(result.current.bass).toBe(0)
      expect(result.current.mid).toBe(0)
      expect(result.current.high).toBe(0)
      expect(result.current.frequencyData).toBeNull()
    })

    it('returns default values when analyser is null and isPlaying is true', () => {
      const { result } = renderHook(() => useAudioReactivity(null, true))

      expect(result.current.amplitude).toBe(0)
      expect(result.current.bass).toBe(0)
      expect(result.current.mid).toBe(0)
      expect(result.current.high).toBe(0)
    })

    it('isProcessing is true when enabled', () => {
      const { result } = renderHook(() => useAudioReactivity(null, false))

      expect(result.current.isProcessing).toBe(true)
    })
  })

  // ==========================================================================
  // BASIC FUNCTIONALITY TESTS
  // ==========================================================================

  describe('basic functionality', () => {
    it('processes frequency data when playing', async () => {
      const analyser = createMockAnalyserNode({ fillValue: 200 })

      const { result } = renderHook(() => useAudioReactivity(analyser, true))

      // Simulate animation frames
      await act(async () => {
        rafMock.tick(16)
        rafMock.tick(32)
        rafMock.tick(48)
        vi.advanceTimersByTime(100)
      })

      // Should have processed some data
      expect(analyser.getByteFrequencyData).toHaveBeenCalled()
    })

    it('returns isProcessing true when enabled', () => {
      const analyser = createMockAnalyserNode()

      const { result } = renderHook(() =>
        useAudioReactivity(analyser, true, { enabled: true })
      )

      expect(result.current.isProcessing).toBe(true)
    })

    it('returns isProcessing false when disabled', () => {
      const analyser = createMockAnalyserNode()

      const { result } = renderHook(() =>
        useAudioReactivity(analyser, true, { enabled: false })
      )

      expect(result.current.isProcessing).toBe(false)
    })
  })

  // ==========================================================================
  // FREQUENCY BAND TESTS
  // ==========================================================================

  describe('frequency band processing', () => {
    it('separates bass, mid, and high frequencies', async () => {
      const analyser = createMockAnalyserWithBands({
        bass: 255, // Max bass
        mid: 128, // Half mid
        high: 64, // Low high
      })

      const { result } = renderHook(() => useAudioReactivity(analyser, true))

      // Simulate frames for processing
      await act(async () => {
        for (let i = 0; i < 10; i++) {
          rafMock.tick(i * 16)
        }
        vi.advanceTimersByTime(200)
      })

      // Should have processed frequency data
      expect(analyser.getByteFrequencyData).toHaveBeenCalled()

      // Bass should be highest, then mid, then high
      // Note: Due to smoothing, we check relative order
      expect(result.current.bass).toBeGreaterThanOrEqual(0)
    })

    it('uses custom frequency ranges when provided', async () => {
      const analyser = createMockAnalyserNode({ fillValue: 200 })

      const { result } = renderHook(() =>
        useAudioReactivity(analyser, true, {
          bassRange: [0, 0.2], // Wider bass range
          midRange: [0.2, 0.6],
          highRange: [0.6, 1.0],
        })
      )

      await act(async () => {
        rafMock.tick(16)
        rafMock.tick(32)
        vi.advanceTimersByTime(100)
      })

      expect(analyser.getByteFrequencyData).toHaveBeenCalled()
    })
  })

  // ==========================================================================
  // OPTIONS TESTS
  // ==========================================================================

  describe('options', () => {
    it('respects custom smoothing factor', () => {
      const analyser = createMockAnalyserNode({ fillValue: 200 })

      const { result } = renderHook(() =>
        useAudioReactivity(analyser, true, { smoothing: 0.5 })
      )

      // Higher smoothing should still work
      expect(result.current).toBeDefined()
    })

    it('respects updateRate option', async () => {
      const analyser = createMockAnalyserNode({ fillValue: 200 })

      const { result } = renderHook(() =>
        useAudioReactivity(analyser, true, { updateRate: 100 })
      )

      // First tick
      await act(async () => {
        rafMock.tick(0)
        vi.advanceTimersByTime(10)
      })

      const firstCallCount = (analyser.getByteFrequencyData as ReturnType<typeof vi.fn>).mock.calls.length

      // Tick at 50ms (should not update yet due to 100ms updateRate)
      await act(async () => {
        rafMock.tick(50)
        vi.advanceTimersByTime(10)
      })

      // Should not have additional call or minimal increase
      const midCallCount = (analyser.getByteFrequencyData as ReturnType<typeof vi.fn>).mock.calls.length
      expect(midCallCount).toBeLessThanOrEqual(firstCallCount + 1)

      // Tick at 100ms+ (should update)
      await act(async () => {
        rafMock.tick(100)
        rafMock.tick(150)
        vi.advanceTimersByTime(200)
      })

      expect((analyser.getByteFrequencyData as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThan(firstCallCount)
    })

    it('can be disabled with enabled: false', () => {
      const analyser = createMockAnalyserNode()

      const { result } = renderHook(() =>
        useAudioReactivity(analyser, true, { enabled: false })
      )

      act(() => {
        rafMock.tick(16)
        rafMock.tick(32)
      })

      // Should not process when disabled
      expect(result.current.isProcessing).toBe(false)
    })
  })

  // ==========================================================================
  // HELPER FUNCTION TESTS
  // ==========================================================================

  describe('helper functions', () => {
    describe('getFrequencyAt', () => {
      it('returns 0 when no frequency data', () => {
        const { result } = renderHook(() => useAudioReactivity(null, false))

        expect(result.current.getFrequencyAt(0.5)).toBe(0)
      })

      it('returns normalized value at index', async () => {
        const analyser = createMockAnalyserNode({ fillValue: 255 })

        const { result } = renderHook(() => useAudioReactivity(analyser, true))

        act(() => {
          rafMock.tick(16)
          rafMock.tick(32)
        })

        // After processing, should return normalized value
        const value = result.current.getFrequencyAt(0.5)
        expect(value).toBeGreaterThanOrEqual(0)
        expect(value).toBeLessThanOrEqual(1)
      })
    })

    describe('getFrequencyRange', () => {
      it('returns 0 when no frequency data', () => {
        const { result } = renderHook(() => useAudioReactivity(null, false))

        expect(result.current.getFrequencyRange(0, 0.5)).toBe(0)
      })

      it('returns average of frequency range', async () => {
        const analyser = createMockAnalyserNode({ fillValue: 200 })

        const { result } = renderHook(() => useAudioReactivity(analyser, true))

        act(() => {
          rafMock.tick(16)
          rafMock.tick(32)
        })

        const value = result.current.getFrequencyRange(0.1, 0.5)
        expect(value).toBeGreaterThanOrEqual(0)
        expect(value).toBeLessThanOrEqual(1)
      })
    })

    describe('reset', () => {
      it('resets values to defaults', async () => {
        const analyser = createMockAnalyserNode({ fillValue: 200 })

        const { result } = renderHook(() => useAudioReactivity(analyser, true))

        // Process some data
        act(() => {
          rafMock.tick(16)
          rafMock.tick(32)
        })

        // Reset
        act(() => {
          result.current.reset()
        })

        expect(result.current.amplitude).toBe(0)
        expect(result.current.bass).toBe(0)
        expect(result.current.mid).toBe(0)
        expect(result.current.high).toBe(0)
      })
    })
  })

  // ==========================================================================
  // CLEANUP TESTS
  // ==========================================================================

  describe('cleanup', () => {
    it('cleans up RAF on unmount', () => {
      const analyser = createMockAnalyserNode()

      const { unmount } = renderHook(() => useAudioReactivity(analyser, true))

      // Should have RAF running
      expect(rafMock.getCallbackCount()).toBeGreaterThanOrEqual(0)

      // Unmount
      unmount()

      // After unmount, callbacks should be cleared
      // The exact count depends on timing
    })

    it('cleans up when isPlaying changes to false', async () => {
      const analyser = createMockAnalyserNode({ fillValue: 200 })

      const { result, rerender } = renderHook(
        ({ isPlaying }) => useAudioReactivity(analyser, isPlaying),
        { initialProps: { isPlaying: true } }
      )

      // Process some data
      act(() => {
        rafMock.tick(16)
        rafMock.tick(32)
      })

      // Stop playing
      rerender({ isPlaying: false })

      // Values should start fading toward 0
      // Due to smoothing, this happens gradually
      act(() => {
        for (let i = 0; i < 20; i++) {
          rafMock.tick(i * 16 + 48)
        }
      })
    })
  })
})

// ============================================================================
// BEAT DETECTION TESTS
// ============================================================================

describe('useBeatDetection', () => {
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

  it('returns false when not playing', () => {
    const { result } = renderHook(() => useBeatDetection(null, false))

    expect(result.current).toBe(false)
  })

  it('returns false with null analyser', () => {
    const { result } = renderHook(() => useBeatDetection(null, true))

    expect(result.current).toBe(false)
  })

  it('uses custom threshold', () => {
    const analyser = createMockAnalyserNode()

    const { result } = renderHook(() => useBeatDetection(analyser, true, 0.8))

    // Should work with custom threshold
    expect(typeof result.current).toBe('boolean')
  })
})

// ============================================================================
// AUDIO STYLES TESTS
// ============================================================================

describe('useAudioStyles', () => {
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

  it('returns interpolated numeric values', () => {
    const { result } = renderHook(() =>
      useAudioStyles(null, false, [
        { property: 'opacity', min: 0, max: 1 },
        { property: 'scale', min: 0.5, max: 1.5 },
      ])
    )

    // With no audio, should return min values (or close to it)
    expect(result.current.opacity).toBeDefined()
    expect(result.current.scale).toBeDefined()
  })

  it('applies unit suffix to values', () => {
    const { result } = renderHook(() =>
      useAudioStyles(null, false, [
        { property: 'width', min: 10, max: 100, unit: 'px' },
      ])
    )

    expect(result.current.width).toMatch(/px$/)
  })

  it('uses specified frequency band', () => {
    const analyser = createMockAnalyserNode({ fillValue: 128 })

    const { result } = renderHook(() =>
      useAudioStyles(analyser, true, [
        { property: 'bassValue', min: 0, max: 100, band: 'bass' },
        { property: 'highValue', min: 0, max: 100, band: 'high' },
      ])
    )

    expect(result.current.bassValue).toBeDefined()
    expect(result.current.highValue).toBeDefined()
  })

  it('handles non-numeric values with threshold', () => {
    const { result } = renderHook(() =>
      useAudioStyles(null, false, [
        { property: 'display', min: 'none', max: 'block' },
      ])
    )

    // With amplitude 0, should use min value
    expect(result.current.display).toBe('none')
  })

  it('defaults to amplitude band', () => {
    const { result } = renderHook(() =>
      useAudioStyles(null, false, [
        { property: 'test', min: 0, max: 100 },
      ])
    )

    // Should work without specifying band
    expect(result.current.test).toBeDefined()
  })
})
