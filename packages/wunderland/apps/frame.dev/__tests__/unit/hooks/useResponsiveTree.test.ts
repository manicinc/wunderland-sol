/**
 * Unit tests for useResponsiveTree hook
 * Tests mobile density configurations and responsive behavior
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

// ============================================================================
// MOCKS
// ============================================================================

// Store original window properties
const originalInnerWidth = globalThis.innerWidth
const originalInnerHeight = globalThis.innerHeight
const originalMatchMedia = globalThis.matchMedia
const originalNavigator = globalThis.navigator

// Mock matchMedia
function createMockMatchMedia(overrides: Record<string, boolean> = {}) {
  return vi.fn((query: string) => {
    const defaultMatches: Record<string, boolean> = {
      '(hover: hover)': true,
      '(pointer: coarse)': false,
      '(any-pointer: fine)': true,
      '(display-mode: standalone)': false,
      ...overrides,
    }

    const matches = defaultMatches[query] ?? false
    return {
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }
  })
}

// Helper to set viewport size
function setViewport(width: number, height: number, touch = false) {
  Object.defineProperty(globalThis, 'innerWidth', { value: width, writable: true })
  Object.defineProperty(globalThis, 'innerHeight', { value: height, writable: true })

  // Mock navigator for touch detection
  Object.defineProperty(globalThis, 'navigator', {
    value: {
      userAgent: touch ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)' : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      maxTouchPoints: touch ? 5 : 0,
      platform: touch ? 'iPhone' : 'Win32',
    },
    writable: true,
  })

  // Update matchMedia for touch/hover detection
  globalThis.matchMedia = createMockMatchMedia({
    '(hover: hover)': !touch,
    '(pointer: coarse)': touch,
    '(any-pointer: fine)': !touch,
  })
}

// Import after setting up mocks
const useResponsiveTreeModule = await import('@/components/quarry/tree/hooks/useResponsiveTree')
const { useResponsiveTree, useDeviceFeatures, getResponsiveClasses } = useResponsiveTreeModule

// ============================================================================
// TESTS
// ============================================================================

describe('useResponsiveTree', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default to desktop
    setViewport(1024, 768, false)
  })

  afterEach(() => {
    // Restore original values
    Object.defineProperty(globalThis, 'innerWidth', { value: originalInnerWidth, writable: true })
    Object.defineProperty(globalThis, 'innerHeight', { value: originalInnerHeight, writable: true })
    globalThis.matchMedia = originalMatchMedia
    Object.defineProperty(globalThis, 'navigator', { value: originalNavigator, writable: true })
  })

  // ==========================================================================
  // Mobile XS Configuration
  // ==========================================================================

  describe('mobile xs configuration', () => {
    it('should return tighter spacing on extra small screens', () => {
      // Set to xs viewport (< 480px) with touch
      setViewport(375, 667, true)

      const { result } = renderHook(() => useResponsiveTree())

      // Force update to pick up viewport
      act(() => {
        globalThis.dispatchEvent(new Event('resize'))
      })

      // Check xs-specific config
      expect(result.current.breakpoints.xs).toBe(true)
      expect(result.current.device).toBe('mobile')

      // Verify tighter mobile density
      // xs + touch primary: rowHeight 40px (vs normal mobile 44px)
      expect(result.current.config.rowHeight).toBeLessThanOrEqual(40)
      // xs: indent 6px (vs normal mobile 8px)
      expect(result.current.config.indent).toBeLessThanOrEqual(8)
    })

    it('should use smaller icon size on xs screens', () => {
      setViewport(375, 667, true)

      const { result } = renderHook(() => useResponsiveTree())

      act(() => {
        globalThis.dispatchEvent(new Event('resize'))
      })

      // xs screens use w-4 h-4 icons
      expect(result.current.config.iconSize).toBe('w-4 h-4')
    })

    it('should use gap-1.5 on xs screens', () => {
      setViewport(375, 667, true)

      const { result } = renderHook(() => useResponsiveTree())

      act(() => {
        globalThis.dispatchEvent(new Event('resize'))
      })

      expect(result.current.config.gap).toBe('gap-1.5')
    })

    it('should disable drag-drop on mobile', () => {
      setViewport(375, 667, true)

      const { result } = renderHook(() => useResponsiveTree())

      act(() => {
        globalThis.dispatchEvent(new Event('resize'))
      })

      expect(result.current.config.enableDragDrop).toBe(false)
    })

    it('should enable swipe actions on mobile', () => {
      setViewport(375, 667, true)

      const { result } = renderHook(() => useResponsiveTree())

      act(() => {
        globalThis.dispatchEvent(new Event('resize'))
      })

      expect(result.current.config.showSwipeActions).toBe(true)
    })
  })

  // ==========================================================================
  // Tablet Portrait Configuration
  // ==========================================================================

  describe('tablet portrait configuration', () => {
    it('should return tighter spacing in portrait mode', () => {
      // iPad portrait (768x1024)
      setViewport(768, 1024, true)

      const { result } = renderHook(() => useResponsiveTree())

      act(() => {
        globalThis.dispatchEvent(new Event('resize'))
      })

      expect(result.current.device).toBe('tablet')
      expect(result.current.orientation).toBe('portrait')

      // Portrait tablets have tighter config
      // Portrait + touch: rowHeight 40px (vs landscape 44px)
      expect(result.current.config.rowHeight).toBeLessThanOrEqual(44)
      // Portrait: indent 8px (vs landscape 10px)
      expect(result.current.config.indent).toBeLessThanOrEqual(10)
    })

    it('should use gap-1.5 in tablet portrait', () => {
      setViewport(768, 1024, true)

      const { result } = renderHook(() => useResponsiveTree())

      act(() => {
        globalThis.dispatchEvent(new Event('resize'))
      })

      expect(result.current.config.gap).toBe('gap-1.5')
    })

    it('should maintain normal spacing in landscape', () => {
      // iPad landscape (1024x768)
      setViewport(1024, 768, true)

      const { result } = renderHook(() => useResponsiveTree())

      act(() => {
        globalThis.dispatchEvent(new Event('resize'))
      })

      expect(result.current.orientation).toBe('landscape')
      // Landscape uses standard gap
      expect(result.current.config.gap).toBe('gap-2')
    })

    it('should enable drag-drop only in landscape', () => {
      // Portrait - no drag drop
      setViewport(768, 1024, true)
      const { result: portraitResult } = renderHook(() => useResponsiveTree())
      act(() => { globalThis.dispatchEvent(new Event('resize')) })
      expect(portraitResult.current.config.enableDragDrop).toBe(false)

      // Landscape - drag drop enabled
      setViewport(1024, 768, true)
      const { result: landscapeResult } = renderHook(() => useResponsiveTree())
      act(() => { globalThis.dispatchEvent(new Event('resize')) })
      expect(landscapeResult.current.config.enableDragDrop).toBe(true)
    })

    it('should show swipe actions in portrait only', () => {
      // Portrait - swipe actions
      setViewport(768, 1024, true)
      const { result: portraitResult } = renderHook(() => useResponsiveTree())
      act(() => { globalThis.dispatchEvent(new Event('resize')) })
      expect(portraitResult.current.config.showSwipeActions).toBe(true)

      // Landscape - no swipe actions
      setViewport(1024, 768, true)
      const { result: landscapeResult } = renderHook(() => useResponsiveTree())
      act(() => { globalThis.dispatchEvent(new Event('resize')) })
      expect(landscapeResult.current.config.showSwipeActions).toBe(false)
    })
  })

  // ==========================================================================
  // Desktop Configuration
  // ==========================================================================

  describe('desktop configuration', () => {
    it('should use standard desktop sizing', () => {
      setViewport(1440, 900, false)

      const { result } = renderHook(() => useResponsiveTree())

      act(() => {
        globalThis.dispatchEvent(new Event('resize'))
      })

      expect(result.current.device).toBe('desktop')
      // Desktop uses 36-44px row height depending on touch detection
      expect(result.current.config.rowHeight).toBeGreaterThanOrEqual(36)
      expect(result.current.config.rowHeight).toBeLessThanOrEqual(44)
      expect(result.current.config.indent).toBe(10)
      expect(result.current.config.gap).toBe('gap-2')
    })

    it('should enable drag-drop on desktop', () => {
      setViewport(1440, 900, false)

      const { result } = renderHook(() => useResponsiveTree())

      act(() => {
        globalThis.dispatchEvent(new Event('resize'))
      })

      expect(result.current.config.enableDragDrop).toBe(true)
    })

    it('should show inline actions on desktop', () => {
      setViewport(1440, 900, false)

      const { result } = renderHook(() => useResponsiveTree())

      act(() => {
        globalThis.dispatchEvent(new Event('resize'))
      })

      expect(result.current.config.showInlineActions).toBe(true)
      expect(result.current.config.showSwipeActions).toBe(false)
    })
  })

  // ==========================================================================
  // Breakpoint Detection
  // ==========================================================================

  describe('breakpoint detection', () => {
    it('should detect xs breakpoint (< 480px)', () => {
      setViewport(375, 667, false)

      const { result } = renderHook(() => useResponsiveTree())

      act(() => {
        globalThis.dispatchEvent(new Event('resize'))
      })

      expect(result.current.breakpoints.xs).toBe(true)
      expect(result.current.breakpoints.sm).toBe(false)
    })

    it('should detect sm breakpoint (480-640px)', () => {
      setViewport(520, 800, false)

      const { result } = renderHook(() => useResponsiveTree())

      act(() => {
        globalThis.dispatchEvent(new Event('resize'))
      })

      expect(result.current.breakpoints.xs).toBe(false)
      expect(result.current.breakpoints.sm).toBe(true)
    })

    it('should detect lg breakpoint (768-1024px)', () => {
      setViewport(900, 600, false)

      const { result } = renderHook(() => useResponsiveTree())

      act(() => {
        globalThis.dispatchEvent(new Event('resize'))
      })

      expect(result.current.breakpoints.lg).toBe(true)
    })

    it('should detect 2xl breakpoint (>= 1280px)', () => {
      setViewport(1440, 900, false)

      const { result } = renderHook(() => useResponsiveTree())

      act(() => {
        globalThis.dispatchEvent(new Event('resize'))
      })

      expect(result.current.breakpoints['2xl']).toBe(true)
    })
  })

  // ==========================================================================
  // Touch Target Accessibility
  // ==========================================================================

  describe('touch target accessibility', () => {
    it('should maintain 44px minimum touch target on touch devices', () => {
      setViewport(375, 667, true)

      const { result } = renderHook(() => useResponsiveTree())

      act(() => {
        globalThis.dispatchEvent(new Event('resize'))
      })

      expect(result.current.config.minTouchTarget).toBe(44)
    })

    it('should allow smaller targets on non-touch devices', () => {
      setViewport(1440, 900, false)

      const { result } = renderHook(() => useResponsiveTree())

      act(() => {
        globalThis.dispatchEvent(new Event('resize'))
      })

      // Non-touch desktop can have smaller targets
      expect(result.current.config.minTouchTarget).toBeLessThanOrEqual(44)
    })
  })
})

// ============================================================================
// useDeviceFeatures Tests
// ============================================================================

describe('useDeviceFeatures', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should correctly identify mobile device', () => {
    setViewport(375, 667, true)

    const { result } = renderHook(() => useDeviceFeatures())

    act(() => {
      globalThis.dispatchEvent(new Event('resize'))
    })

    expect(result.current.isMobile).toBe(true)
    expect(result.current.isTablet).toBe(false)
    expect(result.current.isDesktop).toBe(false)
  })

  it('should correctly identify tablet device', () => {
    setViewport(768, 1024, true)

    const { result } = renderHook(() => useDeviceFeatures())

    act(() => {
      globalThis.dispatchEvent(new Event('resize'))
    })

    expect(result.current.isTablet).toBe(true)
    expect(result.current.isMobile).toBe(false)
  })

  it('should correctly identify desktop device', () => {
    setViewport(1440, 900, false)

    const { result } = renderHook(() => useDeviceFeatures())

    act(() => {
      globalThis.dispatchEvent(new Event('resize'))
    })

    expect(result.current.isDesktop).toBe(true)
    expect(result.current.supportsHover).toBe(true)
    expect(result.current.isTouchDevice).toBe(false)
  })

  it('should detect portrait vs landscape', () => {
    // Portrait
    setViewport(768, 1024, true)
    const { result: portraitResult } = renderHook(() => useDeviceFeatures())
    act(() => { globalThis.dispatchEvent(new Event('resize')) })
    expect(portraitResult.current.isPortrait).toBe(true)
    expect(portraitResult.current.isLandscape).toBe(false)

    // Landscape
    setViewport(1024, 768, true)
    const { result: landscapeResult } = renderHook(() => useDeviceFeatures())
    act(() => { globalThis.dispatchEvent(new Event('resize')) })
    expect(landscapeResult.current.isLandscape).toBe(true)
    expect(landscapeResult.current.isPortrait).toBe(false)
  })
})

// ============================================================================
// getResponsiveClasses Tests
// ============================================================================

describe('getResponsiveClasses', () => {
  it('should generate correct classes for mobile config', () => {
    const mobileConfig = {
      rowHeight: 40,
      indent: 6,
      minTouchTarget: 44,
      fontSize: 'xs' as const,
      iconSize: 'w-4 h-4',
      gap: 'gap-1.5',
      padding: 'px-2 py-1',
      enableDragDrop: false,
      showInlineActions: false,
      showSwipeActions: true,
      actionButtonSize: 'md' as const,
      containerHeight: 'calc(100vh - 140px)',
      maxVisibleDepth: 5,
    }

    const classes = getResponsiveClasses(mobileConfig)

    expect(classes.icon).toBe('w-4 h-4')
    expect(classes.text).toBe('text-xs')
    expect(classes.row).toContain('px-2 py-1')
    expect(classes.row).toContain('gap-1.5')
    expect(classes.row).toContain('min-h-[44px]')
  })

  it('should generate correct action button classes based on size', () => {
    const lgConfig = {
      rowHeight: 44,
      indent: 8,
      minTouchTarget: 44,
      fontSize: 'sm' as const,
      iconSize: 'w-5 h-5',
      gap: 'gap-2',
      padding: 'px-2.5 py-1.5',
      enableDragDrop: false,
      showInlineActions: false,
      showSwipeActions: true,
      actionButtonSize: 'lg' as const,
      containerHeight: 'calc(100vh - 140px)',
      maxVisibleDepth: 5,
    }

    const classes = getResponsiveClasses(lgConfig)

    expect(classes.actionButton).toContain('p-2.5')
    expect(classes.actionButton).toContain('min-w-[44px]')
    expect(classes.actionButton).toContain('min-h-[44px]')
  })
})
