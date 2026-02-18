/**
 * Soundscape Test Mocks
 * @module __tests__/setup/soundscapeMocks
 *
 * Mock utilities for testing soundscape components and hooks
 */

import { vi } from 'vitest'
import type { ThemeName } from '@/types/theme'

// ============================================================================
// WEB AUDIO API MOCKS
// ============================================================================

/**
 * Mock AnalyserNode for audio reactivity tests
 */
export function createMockAnalyserNode(options: {
  frequencyBinCount?: number
  fillValue?: number
  randomize?: boolean
} = {}): AnalyserNode {
  const {
    frequencyBinCount = 256,
    fillValue = 128,
    randomize = false,
  } = options

  return {
    frequencyBinCount,
    fftSize: frequencyBinCount * 2,
    minDecibels: -100,
    maxDecibels: -30,
    smoothingTimeConstant: 0.8,
    getByteFrequencyData: vi.fn((array: Uint8Array) => {
      for (let i = 0; i < array.length; i++) {
        array[i] = randomize ? Math.floor(Math.random() * 255) : fillValue
      }
    }),
    getByteTimeDomainData: vi.fn((array: Uint8Array) => {
      for (let i = 0; i < array.length; i++) {
        array[i] = 128 // Silence
      }
    }),
    getFloatFrequencyData: vi.fn(),
    getFloatTimeDomainData: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
    context: {} as AudioContext,
    channelCount: 2,
    channelCountMode: 'max' as ChannelCountMode,
    channelInterpretation: 'speakers' as ChannelInterpretation,
    numberOfInputs: 1,
    numberOfOutputs: 1,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(() => true),
  } as unknown as AnalyserNode
}

/**
 * Create mock analyser with specific frequency band values
 */
export function createMockAnalyserWithBands(bands: {
  bass?: number // 0-255
  mid?: number // 0-255
  high?: number // 0-255
}): AnalyserNode {
  const { bass = 128, mid = 128, high = 128 } = bands

  return {
    frequencyBinCount: 256,
    fftSize: 512,
    minDecibels: -100,
    maxDecibels: -30,
    smoothingTimeConstant: 0.8,
    getByteFrequencyData: vi.fn((array: Uint8Array) => {
      const bassEnd = Math.floor(array.length * 0.1)
      const midEnd = Math.floor(array.length * 0.5)

      for (let i = 0; i < array.length; i++) {
        if (i < bassEnd) {
          array[i] = bass
        } else if (i < midEnd) {
          array[i] = mid
        } else {
          array[i] = high
        }
      }
    }),
    getByteTimeDomainData: vi.fn(),
    getFloatFrequencyData: vi.fn(),
    getFloatTimeDomainData: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
    context: {} as AudioContext,
    channelCount: 2,
    channelCountMode: 'max' as ChannelCountMode,
    channelInterpretation: 'speakers' as ChannelInterpretation,
    numberOfInputs: 1,
    numberOfOutputs: 1,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(() => true),
  } as unknown as AnalyserNode
}

// ============================================================================
// RAF MOCKS
// ============================================================================

/**
 * Setup requestAnimationFrame mock
 */
export function setupRAFMock() {
  let rafId = 0
  const callbacks = new Map<number, FrameRequestCallback>()

  vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => {
    rafId++
    callbacks.set(rafId, callback)
    return rafId
  }))

  vi.stubGlobal('cancelAnimationFrame', vi.fn((id: number) => {
    callbacks.delete(id)
  }))

  return {
    tick: (time: number = performance.now()) => {
      const callbacksCopy = new Map(callbacks)
      callbacks.clear()
      callbacksCopy.forEach((callback) => callback(time))
    },
    clear: () => {
      callbacks.clear()
      rafId = 0
    },
    getCallbackCount: () => callbacks.size,
  }
}

// ============================================================================
// THEME MOCKS
// ============================================================================

/**
 * All available theme names for iteration
 */
export const ALL_THEMES: ThemeName[] = [
  'light',
  'dark',
  'sepia-light',
  'sepia-dark',
  'terminal-light',
  'terminal-dark',
  'oceanic-light',
  'oceanic-dark',
]

/**
 * Mock useTheme hook from next-themes
 */
export function createMockUseTheme(theme: ThemeName = 'dark') {
  return {
    theme,
    resolvedTheme: theme,
    setTheme: vi.fn(),
    themes: ALL_THEMES,
    systemTheme: 'dark' as const,
  }
}

// ============================================================================
// REDUCED MOTION MOCK
// ============================================================================

/**
 * Mock reduced motion preference
 */
export function mockReducedMotion(prefersReducedMotion: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query === '(prefers-reduced-motion: reduce)' ? prefersReducedMotion : false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
}

// ============================================================================
// COMPONENT TEST HELPERS
// ============================================================================

/**
 * Default props for soundscape scene tests
 */
export const defaultSceneProps = {
  analyser: null,
  isPlaying: false,
  width: 400,
  height: 300,
  isDark: true,
  theme: 'dark' as ThemeName,
  reducedMotion: false,
}

/**
 * Create scene props with overrides
 */
export function createSceneProps(overrides: Partial<typeof defaultSceneProps> = {}) {
  return {
    ...defaultSceneProps,
    ...overrides,
  }
}

export {}
