/**
 * Advanced Keyboard Navigation System
 * @module codex/hooks/useKeyboardNavigation
 * 
 * @remarks
 * Full keyboard control for the entire Codex:
 * - Arrow keys / WASD for navigation
 * - Tab for focus management
 * - Enter/Space for activation
 * - Escape for cancellation
 * - Vim-style navigation (j/k for up/down)
 * - Modal/sidebar/panel navigation
 * - Scroll control
 * - Focus trapping in modals
 */

import { useEffect, useRef, useCallback } from 'react'

export interface KeyboardNavigationState {
  /** Whether keyboard nav is active (disabled when in editor) */
  isActive: boolean
  /** Current focus mode */
  focusMode: 'sidebar' | 'content' | 'metadata' | 'modal' | 'none'
  /** Current focused index in lists */
  focusedIndex: number
}

export interface KeyboardNavigationHandlers {
  /** Navigate to next item */
  onNext?: () => void
  /** Navigate to previous item */
  onPrevious?: () => void
  /** Activate current item */
  onActivate?: () => void
  /** Cancel/escape current context */
  onCancel?: () => void
  /** Scroll up */
  onScrollUp?: () => void
  /** Scroll down */
  onScrollDown?: () => void
  /** Toggle fullscreen */
  onToggleFullscreen?: () => void
  /** Focus search */
  onFocusSearch?: () => void
  /** Cycle theme */
  onCycleTheme?: () => void
  /** Toggle sidebar */
  onToggleSidebar?: () => void
  /** Toggle metadata */
  onToggleMetadata?: () => void
  /** Open settings */
  onOpenSettings?: () => void
  /** Enter editor mode (disables nav) */
  onEnterEditor?: () => void
  /** Exit editor mode (enables nav) */
  onExitEditor?: () => void
}

/**
 * Comprehensive keyboard navigation hook
 * 
 * @example
 * ```tsx
 * const { isActive, setActive } = useKeyboardNavigation({
 *   onNext: () => selectNextFile(),
 *   onPrevious: () => selectPrevFile(),
 *   onActivate: () => openFile(),
 *   onScrollUp: () => scrollBy(0, -100),
 *   onScrollDown: () => scrollBy(0, 100),
 * })
 * ```
 */
export function useKeyboardNavigation(handlers: KeyboardNavigationHandlers) {
  const isActiveRef = useRef(true)
  const scrollSpeedRef = useRef(100) // pixels per keypress

  /**
   * Check if target is an input element
   */
  const isInputElement = useCallback((target: EventTarget | null): boolean => {
    if (!target) return false
    const element = target as HTMLElement
    return (
      element.tagName === 'INPUT' ||
      element.tagName === 'TEXTAREA' ||
      element.tagName === 'SELECT' ||
      element.isContentEditable ||
      element.closest('[role="textbox"]') !== null ||
      element.closest('.ProseMirror') !== null ||
      element.closest('.tldraw') !== null
    )
  }, [])

  /**
   * Handle keyboard events
   */
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target

      // If in an input/editor, disable navigation
      if (isInputElement(target)) {
        isActiveRef.current = false
        return
      } else {
        isActiveRef.current = true
      }

      // Don't interfere with modifier keys
      if (event.ctrlKey || event.metaKey || event.altKey) {
        return
      }

      const key = event.key.toLowerCase()

      // Arrow keys & WASD navigation
      if (key === 'arrowdown' || key === 's' || key === 'j') {
        event.preventDefault()
        if (event.shiftKey) {
          // Shift + down = scroll down
          handlers.onScrollDown?.()
        } else {
          // Just down = next item
          handlers.onNext?.()
        }
      } else if (key === 'arrowup' || key === 'w' || key === 'k') {
        event.preventDefault()
        if (event.shiftKey) {
          // Shift + up = scroll up
          handlers.onScrollUp?.()
        } else {
          // Just up = previous item
          handlers.onPrevious?.()
        }
      } else if (key === 'arrowleft' || key === 'a' || key === 'h') {
        event.preventDefault()
        handlers.onToggleSidebar?.()
      } else if (key === 'arrowright' || key === 'd' || key === 'l') {
        event.preventDefault()
        handlers.onToggleMetadata?.()
      }

      // Activation keys
      else if (key === 'enter' || key === ' ') {
        if (key === ' ') event.preventDefault() // Prevent page scroll
        handlers.onActivate?.()
      }

      // Escape key
      else if (key === 'escape') {
        event.preventDefault()
        handlers.onCancel?.()
      }

      // Page Up/Down for fast scrolling
      else if (key === 'pageup') {
        event.preventDefault()
        const container = document.querySelector('.codex-content-scroll')
        if (container) {
          container.scrollBy({ top: -window.innerHeight * 0.8, behavior: 'smooth' })
        }
      } else if (key === 'pagedown') {
        event.preventDefault()
        const container = document.querySelector('.codex-content-scroll')
        if (container) {
          container.scrollBy({ top: window.innerHeight * 0.8, behavior: 'smooth' })
        }
      }

      // Home/End for document navigation
      else if (key === 'home') {
        event.preventDefault()
        const container = document.querySelector('.codex-content-scroll')
        if (container) {
          container.scrollTo({ top: 0, behavior: 'smooth' })
        }
      } else if (key === 'end') {
        event.preventDefault()
        const container = document.querySelector('.codex-content-scroll')
        if (container) {
          container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' })
        }
      }

      // Fullscreen toggle
      else if (key === 'f') {
        event.preventDefault()
        handlers.onToggleFullscreen?.()
      }

      // Theme cycle
      else if (key === 't') {
        event.preventDefault()
        handlers.onCycleTheme?.()
      }

      // Settings
      else if (key === ',') {
        event.preventDefault()
        handlers.onOpenSettings?.()
      }

      // Focus search
      else if (key === '/') {
        event.preventDefault()
        handlers.onFocusSearch?.()
      }

      // Vim-style commands with 'g'
      else if (key === 'g') {
        // Next keypress after 'g'
        const handleGCommand = (e: KeyboardEvent) => {
          const nextKey = e.key.toLowerCase()
          if (nextKey === 'g') {
            // gg = go to top
            e.preventDefault()
            const container = document.querySelector('.codex-content-scroll')
            if (container) {
              container.scrollTo({ top: 0, behavior: 'smooth' })
            }
          } else if (nextKey === 't') {
            // gt = cycle theme
            e.preventDefault()
            handlers.onCycleTheme?.()
          }
          window.removeEventListener('keydown', handleGCommand)
        }
        window.addEventListener('keydown', handleGCommand, { once: true })
        
        // Timeout to clear if no second key
        setTimeout(() => {
          window.removeEventListener('keydown', handleGCommand)
        }, 1000)
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [handlers, isInputElement])

  /**
   * Scroll helper
   */
  const scrollBy = useCallback((deltaY: number) => {
    const container = document.querySelector('.codex-content-scroll')
    if (container) {
      container.scrollBy({
        top: deltaY,
        behavior: 'smooth',
      })
    }
  }, [])

  return {
    isActive: isActiveRef.current,
    setActive: (active: boolean) => {
      isActiveRef.current = active
    },
    scrollBy,
  }
}

/**
 * Focus trap for modals
 * Keeps focus within a container
 */
export function useFocusTrap(isActive: boolean, containerRef: React.RefObject<HTMLElement>) {
  useEffect(() => {
    if (!isActive || !containerRef.current) return

    const container = containerRef.current
    const focusableElements = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )

    if (focusableElements.length === 0) return

    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]

    // Focus first element
    firstElement.focus()

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return

      if (e.shiftKey) {
        // Shift + Tab (backwards)
        if (document.activeElement === firstElement) {
          e.preventDefault()
          lastElement.focus()
        }
      } else {
        // Tab (forwards)
        if (document.activeElement === lastElement) {
          e.preventDefault()
          firstElement.focus()
        }
      }
    }

    container.addEventListener('keydown', handleTab as any)

    return () => {
      container.removeEventListener('keydown', handleTab as any)
    }
  }, [isActive, containerRef])
}

/**
 * List navigation hook
 * For navigating through lists with arrow keys
 */
export function useListNavigation(
  items: any[],
  onSelect: (index: number) => void,
  isActive: boolean = true
) {
  const selectedIndexRef = useRef(0)

  useEffect(() => {
    if (!isActive || items.length === 0) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === 'j') {
        e.preventDefault()
        selectedIndexRef.current = Math.min(selectedIndexRef.current + 1, items.length - 1)
        onSelect(selectedIndexRef.current)
      } else if (e.key === 'ArrowUp' || e.key === 'k') {
        e.preventDefault()
        selectedIndexRef.current = Math.max(selectedIndexRef.current - 1, 0)
        onSelect(selectedIndexRef.current)
      } else if (e.key === 'Home') {
        e.preventDefault()
        selectedIndexRef.current = 0
        onSelect(selectedIndexRef.current)
      } else if (e.key === 'End') {
        e.preventDefault()
        selectedIndexRef.current = items.length - 1
        onSelect(selectedIndexRef.current)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [items, onSelect, isActive])

  return {
    selectedIndex: selectedIndexRef.current,
    setSelectedIndex: (index: number) => {
      selectedIndexRef.current = Math.max(0, Math.min(index, items.length - 1))
    },
  }
}

