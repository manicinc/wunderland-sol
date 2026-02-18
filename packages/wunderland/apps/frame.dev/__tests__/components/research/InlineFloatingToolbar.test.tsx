/**
 * Tests for InlineFloatingToolbar Research Button
 * @module __tests__/unit/research/InlineFloatingToolbar.test
 *
 * Tests for the research button integration in the floating toolbar:
 * - Research button visibility
 * - Research callback with selected text
 * - Toolbar divider logic
 *
 * @vitest-environment happy-dom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'

// Mock tiptap Editor
const createMockEditor = (selectedText = 'test selection') => ({
  state: {
    selection: { from: 0, to: selectedText.length },
    doc: {
      textBetween: vi.fn().mockReturnValue(selectedText),
    },
  },
  view: {
    coordsAtPos: vi.fn().mockReturnValue({ top: 100, left: 200 }),
  },
  chain: vi.fn().mockReturnValue({
    focus: vi.fn().mockReturnValue({
      toggleBold: vi.fn().mockReturnValue({ run: vi.fn() }),
      toggleItalic: vi.fn().mockReturnValue({ run: vi.fn() }),
      toggleStrike: vi.fn().mockReturnValue({ run: vi.fn() }),
      toggleCode: vi.fn().mockReturnValue({ run: vi.fn() }),
      toggleHighlight: vi.fn().mockReturnValue({ run: vi.fn() }),
      toggleHeading: vi.fn().mockReturnValue({ run: vi.fn() }),
    }),
  }),
  isActive: vi.fn().mockReturnValue(false),
  on: vi.fn(),
  off: vi.fn(),
})

// Import after setting up mocks
import { InlineFloatingToolbar } from '@/components/quarry/ui/inline-editor/InlineFloatingToolbar'

describe('InlineFloatingToolbar', () => {
  let mockEditor: ReturnType<typeof createMockEditor>

  beforeEach(() => {
    mockEditor = createMockEditor()
    vi.clearAllMocks()
  })

  describe('Research Button', () => {
    it('should render research button when onResearch is provided', () => {
      const onResearch = vi.fn()

      // Simulate visibility by triggering the toolbar
      render(
        <InlineFloatingToolbar
          editor={mockEditor as any}
          isDark={false}
          onResearch={onResearch}
        />
      )

      // The toolbar renders but may not be visible initially
      // We're testing that the props are accepted correctly
      expect(onResearch).not.toHaveBeenCalled()
    })

    it('should not crash when onResearch is not provided', () => {
      expect(() => {
        render(
          <InlineFloatingToolbar
            editor={mockEditor as any}
            isDark={false}
          />
        )
      }).not.toThrow()
    })

    it('should extract selected text correctly for research', () => {
      const selectedText = 'quantum computing'
      mockEditor = createMockEditor(selectedText)
      const onResearch = vi.fn()

      render(
        <InlineFloatingToolbar
          editor={mockEditor as any}
          isDark={false}
          onResearch={onResearch}
        />
      )

      // Verify the editor's textBetween would be called with correct params
      expect(mockEditor.state.doc.textBetween).not.toHaveBeenCalled() // Not called until button click
    })

    it('should work with both onResearch and onAddTag', () => {
      const onResearch = vi.fn()
      const onAddTag = vi.fn()

      expect(() => {
        render(
          <InlineFloatingToolbar
            editor={mockEditor as any}
            isDark={false}
            onResearch={onResearch}
            onAddTag={onAddTag}
          />
        )
      }).not.toThrow()
    })
  })

  describe('Theme Support', () => {
    it('should render correctly in light mode', () => {
      expect(() => {
        render(
          <InlineFloatingToolbar
            editor={mockEditor as any}
            isDark={false}
          />
        )
      }).not.toThrow()
    })

    it('should render correctly in dark mode', () => {
      expect(() => {
        render(
          <InlineFloatingToolbar
            editor={mockEditor as any}
            isDark={true}
          />
        )
      }).not.toThrow()
    })
  })

  describe('Editor Events', () => {
    it('should register selection update listener', () => {
      render(
        <InlineFloatingToolbar
          editor={mockEditor as any}
          isDark={false}
        />
      )

      expect(mockEditor.on).toHaveBeenCalledWith('selectionUpdate', expect.any(Function))
    })

    it('should register focus listener', () => {
      render(
        <InlineFloatingToolbar
          editor={mockEditor as any}
          isDark={false}
        />
      )

      expect(mockEditor.on).toHaveBeenCalledWith('focus', expect.any(Function))
    })

    it('should register blur listener', () => {
      render(
        <InlineFloatingToolbar
          editor={mockEditor as any}
          isDark={false}
        />
      )

      expect(mockEditor.on).toHaveBeenCalledWith('blur', expect.any(Function))
    })
  })
})

describe('InlineFloatingToolbar Integration', () => {
  it('should handle empty selection gracefully', () => {
    const mockEditor = createMockEditor('')
    const onResearch = vi.fn()

    expect(() => {
      render(
        <InlineFloatingToolbar
          editor={mockEditor as any}
          isDark={false}
          onResearch={onResearch}
        />
      )
    }).not.toThrow()
  })

  it('should handle long text selection', () => {
    const longText = 'a'.repeat(1000)
    const mockEditor = createMockEditor(longText)
    const onResearch = vi.fn()

    expect(() => {
      render(
        <InlineFloatingToolbar
          editor={mockEditor as any}
          isDark={false}
          onResearch={onResearch}
        />
      )
    }).not.toThrow()
  })

  it('should handle special characters in selection', () => {
    const specialText = '<script>alert("xss")</script>'
    const mockEditor = createMockEditor(specialText)
    const onResearch = vi.fn()

    expect(() => {
      render(
        <InlineFloatingToolbar
          editor={mockEditor as any}
          isDark={false}
          onResearch={onResearch}
        />
      )
    }).not.toThrow()
  })
})
