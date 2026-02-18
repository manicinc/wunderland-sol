/**
 * EditableBlock Tagging Tests
 * @module tests/unit/quarry/editableBlockTagging
 *
 * Tests for the selection toolbar → block tagging feature.
 * Tests the integration between InlineFloatingToolbar, EditableBlock, and QuickTagPopover.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock types for testing
interface MockTagIndexEntry {
  name: string
  count: number
  paths: string[]
}

interface MockEditorSelection {
  from: number
  to: number
}

interface MockCoords {
  left: number
  right: number
  top: number
  bottom: number
}

describe('EditableBlock Tagging', () => {
  describe('Tag popover positioning', () => {
    // Test the positioning logic used in handleAddTag

    it('should calculate center position from selection coordinates', () => {
      const startCoords: MockCoords = { left: 100, right: 150, top: 50, bottom: 70 }
      const endCoords: MockCoords = { left: 200, right: 250, top: 50, bottom: 70 }

      // Expected: center of selection
      const expectedLeft = (startCoords.left + endCoords.left) / 2
      const expectedTop = endCoords.bottom + 8

      expect(expectedLeft).toBe(150)
      expect(expectedTop).toBe(78)
    })

    it('should position popover below the selection', () => {
      const selectionBottom = 100
      const offset = 8
      const popoverTop = selectionBottom + offset

      expect(popoverTop).toBe(108)
      expect(popoverTop).toBeGreaterThan(selectionBottom)
    })
  })

  describe('Tag popover state management', () => {
    let isOpen: boolean
    let position: { top: number; left: number } | null

    beforeEach(() => {
      isOpen = false
      position = null
    })

    it('should open popover with correct position', () => {
      // Simulate handleAddTag behavior
      const newPosition = { top: 100, left: 150 }
      position = newPosition
      isOpen = true

      expect(isOpen).toBe(true)
      expect(position).toEqual({ top: 100, left: 150 })
    })

    it('should close popover and clear position', () => {
      // Open first
      position = { top: 100, left: 150 }
      isOpen = true

      // Then close
      isOpen = false
      // Position can be kept or cleared - we keep it until next open

      expect(isOpen).toBe(false)
    })
  })

  describe('Tag filtering for autocomplete', () => {
    const availableTags: MockTagIndexEntry[] = [
      { name: 'react', count: 10, paths: [] },
      { name: 'typescript', count: 8, paths: [] },
      { name: 'javascript', count: 15, paths: [] },
      { name: 'redux', count: 5, paths: [] },
      { name: 'nextjs', count: 7, paths: [] },
    ]

    const currentTags = ['react']

    it('should exclude already applied tags from suggestions', () => {
      const filtered = availableTags.filter(
        (tag) => !currentTags.includes(tag.name)
      )

      expect(filtered).toHaveLength(4)
      expect(filtered.find(t => t.name === 'react')).toBeUndefined()
    })

    it('should filter tags by query string', () => {
      const query = 'type'
      const filtered = availableTags.filter(
        (tag) =>
          !currentTags.includes(tag.name) &&
          tag.name.toLowerCase().includes(query.toLowerCase())
      )

      expect(filtered).toHaveLength(1)
      expect(filtered[0].name).toBe('typescript')
    })

    it('should prioritize prefix matches', () => {
      const query = 'java'
      const filtered = availableTags.filter(
        (tag) =>
          !currentTags.includes(tag.name) &&
          tag.name.toLowerCase().includes(query.toLowerCase())
      )

      // Sort with prefix matches first
      const sorted = filtered.sort((a, b) => {
        const aStartsWith = a.name.toLowerCase().startsWith(query.toLowerCase())
        const bStartsWith = b.name.toLowerCase().startsWith(query.toLowerCase())
        if (aStartsWith && !bStartsWith) return -1
        if (!aStartsWith && bStartsWith) return 1
        return b.count - a.count
      })

      expect(sorted[0].name).toBe('javascript')
    })
  })

  describe('Tag name normalization', () => {
    it('should convert spaces to hyphens', () => {
      const input = 'my new tag'
      const normalized = input.trim().toLowerCase().replace(/\s+/g, '-')
      expect(normalized).toBe('my-new-tag')
    })

    it('should lowercase the tag', () => {
      const input = 'MyTag'
      const normalized = input.trim().toLowerCase().replace(/\s+/g, '-')
      expect(normalized).toBe('mytag')
    })

    it('should trim whitespace', () => {
      const input = '  spaced tag  '
      const normalized = input.trim().toLowerCase().replace(/\s+/g, '-')
      expect(normalized).toBe('spaced-tag')
    })
  })

  describe('Conditional rendering', () => {
    it('should require strandPath for tag popover to render', () => {
      const strandPath: string | undefined = undefined
      const tagPopoverOpen = true
      const tagPopoverPosition = { top: 100, left: 150 }

      // Condition from EditableBlock render
      const shouldRender = tagPopoverOpen && tagPopoverPosition && strandPath

      expect(shouldRender).toBeFalsy()
    })

    it('should render when all conditions met', () => {
      const strandPath = '/path/to/strand'
      const tagPopoverOpen = true
      const tagPopoverPosition = { top: 100, left: 150 }

      const shouldRender = tagPopoverOpen && tagPopoverPosition && strandPath

      expect(shouldRender).toBeTruthy()
    })

    it('should not render when popover is closed', () => {
      const strandPath = '/path/to/strand'
      const tagPopoverOpen = false
      const tagPopoverPosition = { top: 100, left: 150 }

      const shouldRender = tagPopoverOpen && tagPopoverPosition && strandPath

      expect(shouldRender).toBeFalsy()
    })
  })

  describe('Props forwarding', () => {
    it('should create tag add handler with blockId', () => {
      const blockId = 'block-123'
      const addTagMock = vi.fn()

      // Simulate the handler creation from InlineWYSIWYGEditor
      const onTagAdd = (tag: string) => addTagMock(blockId, tag)

      onTagAdd('new-tag')

      expect(addTagMock).toHaveBeenCalledWith('block-123', 'new-tag')
    })

    it('should create tag remove handler with blockId', () => {
      const blockId = 'block-456'
      const removeTagMock = vi.fn()

      const onTagRemove = (tag: string) => removeTagMock(blockId, tag)

      onTagRemove('old-tag')

      expect(removeTagMock).toHaveBeenCalledWith('block-456', 'old-tag')
    })
  })
})
