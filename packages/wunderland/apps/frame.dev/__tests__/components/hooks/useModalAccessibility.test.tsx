/**
 * Tests for useModalAccessibility hook
 * @module __tests__/unit/hooks/useModalAccessibility.test
 */

import { renderHook, act } from '@testing-library/react'
import { useModalAccessibility } from '@/components/quarry/hooks/useModalAccessibility'

describe('useModalAccessibility', () => {
  let originalOverflow: string
  let originalPaddingRight: string

  beforeEach(() => {
    // Store original body styles
    originalOverflow = document.body.style.overflow
    originalPaddingRight = document.body.style.paddingRight
  })

  afterEach(() => {
    // Restore body styles
    document.body.style.overflow = originalOverflow
    document.body.style.paddingRight = originalPaddingRight
    // Clean up any lingering event listeners by unmounting
  })

  describe('return values', () => {
    it('should return backdropRef, contentRef, modalProps, and handleBackdropClick', () => {
      const onClose = jest.fn()
      const { result } = renderHook(() =>
        useModalAccessibility({
          isOpen: true,
          onClose,
        })
      )

      expect(result.current.backdropRef).toBeDefined()
      expect(result.current.contentRef).toBeDefined()
      expect(result.current.modalProps).toBeDefined()
      expect(result.current.handleBackdropClick).toBeDefined()
    })

    it('should have correct modalProps', () => {
      const onClose = jest.fn()
      const { result } = renderHook(() =>
        useModalAccessibility({
          isOpen: true,
          onClose,
          modalId: 'test-modal',
        })
      )

      expect(result.current.modalProps).toEqual({
        role: 'dialog',
        'aria-modal': true,
        'aria-labelledby': 'test-modal-title',
        tabIndex: -1,
      })
    })

    it('should generate a modalId if not provided', () => {
      const onClose = jest.fn()
      const { result } = renderHook(() =>
        useModalAccessibility({
          isOpen: true,
          onClose,
        })
      )

      expect(result.current.modalProps['aria-labelledby']).toMatch(/^modal-\w+-title$/)
    })
  })

  describe('escape key handling', () => {
    it('should call onClose when Escape is pressed and modal is open', () => {
      const onClose = jest.fn()
      renderHook(() =>
        useModalAccessibility({
          isOpen: true,
          onClose,
          closeOnEscape: true,
        })
      )

      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
        document.dispatchEvent(event)
      })

      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('should not call onClose when modal is closed', () => {
      const onClose = jest.fn()
      renderHook(() =>
        useModalAccessibility({
          isOpen: false,
          onClose,
          closeOnEscape: true,
        })
      )

      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
        document.dispatchEvent(event)
      })

      expect(onClose).not.toHaveBeenCalled()
    })

    it('should not call onClose when closeOnEscape is false', () => {
      const onClose = jest.fn()
      renderHook(() =>
        useModalAccessibility({
          isOpen: true,
          onClose,
          closeOnEscape: false,
        })
      )

      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
        document.dispatchEvent(event)
      })

      expect(onClose).not.toHaveBeenCalled()
    })
  })

  describe('body scroll lock', () => {
    it('should lock body scroll when modal is open and lockScroll is true', () => {
      const onClose = jest.fn()
      renderHook(() =>
        useModalAccessibility({
          isOpen: true,
          onClose,
          lockScroll: true,
        })
      )

      expect(document.body.style.overflow).toBe('hidden')
    })

    it('should not lock body scroll when lockScroll is false', () => {
      const onClose = jest.fn()
      document.body.style.overflow = ''
      
      renderHook(() =>
        useModalAccessibility({
          isOpen: true,
          onClose,
          lockScroll: false,
        })
      )

      expect(document.body.style.overflow).toBe('')
    })

    it('should restore body scroll when modal closes', () => {
      const onClose = jest.fn()
      document.body.style.overflow = 'auto'
      
      const { rerender } = renderHook(
        ({ isOpen }) =>
          useModalAccessibility({
            isOpen,
            onClose,
            lockScroll: true,
          }),
        { initialProps: { isOpen: true } }
      )

      expect(document.body.style.overflow).toBe('hidden')

      rerender({ isOpen: false })

      expect(document.body.style.overflow).toBe('auto')
    })
  })

  describe('backdrop click handling', () => {
    it('should call onClose when backdrop is clicked and closeOnClickOutside is true', () => {
      const onClose = jest.fn()
      const { result } = renderHook(() =>
        useModalAccessibility({
          isOpen: true,
          onClose,
          closeOnClickOutside: true,
        })
      )

      const mockEvent = {
        target: { id: 'backdrop' },
        currentTarget: { id: 'backdrop' },
        preventDefault: jest.fn(),
        stopPropagation: jest.fn(),
      } as unknown as React.MouseEvent

      act(() => {
        result.current.handleBackdropClick(mockEvent)
      })

      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('should not call onClose when content is clicked', () => {
      const onClose = jest.fn()
      const { result } = renderHook(() =>
        useModalAccessibility({
          isOpen: true,
          onClose,
          closeOnClickOutside: true,
        })
      )

      const backdropElement = { id: 'backdrop' }
      const contentElement = { id: 'content' }

      const mockEvent = {
        target: contentElement,
        currentTarget: backdropElement,
        preventDefault: jest.fn(),
        stopPropagation: jest.fn(),
      } as unknown as React.MouseEvent

      act(() => {
        result.current.handleBackdropClick(mockEvent)
      })

      expect(onClose).not.toHaveBeenCalled()
    })

    it('should not call onClose when closeOnClickOutside is false', () => {
      const onClose = jest.fn()
      const { result } = renderHook(() =>
        useModalAccessibility({
          isOpen: true,
          onClose,
          closeOnClickOutside: false,
        })
      )

      const mockEvent = {
        target: { id: 'backdrop' },
        currentTarget: { id: 'backdrop' },
        preventDefault: jest.fn(),
        stopPropagation: jest.fn(),
      } as unknown as React.MouseEvent

      act(() => {
        result.current.handleBackdropClick(mockEvent)
      })

      expect(onClose).not.toHaveBeenCalled()
    })
  })

  describe('defaults', () => {
    it('should have sensible defaults', () => {
      const onClose = jest.fn()
      
      renderHook(() =>
        useModalAccessibility({
          isOpen: true,
          onClose,
          // Not passing optional props, relying on defaults
        })
      )

      // Default closeOnEscape = true
      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
        document.dispatchEvent(event)
      })
      expect(onClose).toHaveBeenCalledTimes(1)

      // Default lockScroll = true
      expect(document.body.style.overflow).toBe('hidden')
    })
  })
})

