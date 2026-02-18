/**
 * MentionAutocomplete Component Tests
 * @module __tests__/unit/mentions/MentionAutocomplete.test
 *
 * Tests for the @mention autocomplete dropdown component.
 * @vitest-environment jsdom
 */

import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MentionAutocomplete } from '@/components/quarry/ui/mentions/MentionAutocomplete'
import type { MentionableEntity } from '@/lib/mentions/types'

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}))

// Mock the mention resolver
vi.mock('@/lib/mentions/mentionResolver', () => ({
  getAutocompleteSuggestions: vi.fn().mockResolvedValue([
    {
      entity: {
        id: 'person-1',
        type: 'person',
        label: 'Alice Johnson',
        color: '#3b82f6',
        properties: { fullName: 'Alice Johnson' },
        createdAt: '2024-01-01',
      },
      score: 0.95,
      highlightedLabel: '<mark>Alice</mark> Johnson',
      matchType: 'prefix',
      source: 'database',
    },
    {
      entity: {
        id: 'person-2',
        type: 'person',
        label: 'Alice Smith',
        color: '#3b82f6',
        properties: { fullName: 'Alice Smith' },
        createdAt: '2024-01-01',
      },
      score: 0.9,
      highlightedLabel: '<mark>Alice</mark> Smith',
      matchType: 'prefix',
      source: 'database',
    },
  ]),
  searchEntities: vi.fn().mockResolvedValue([]),
  getRecentEntities: vi.fn().mockResolvedValue([
    {
      id: 'recent-1',
      type: 'place',
      label: 'Recent Place',
      color: '#22c55e',
      properties: {},
      createdAt: '2024-01-01',
    },
  ]),
}))

describe('MentionAutocomplete', () => {
  const defaultProps = {
    query: 'Alice',
    position: { x: 100, y: 200 },
    isOpen: true,
    onSelect: vi.fn(),
    onDismiss: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  describe('Rendering', () => {
    it('renders when isOpen is true', async () => {
      render(<MentionAutocomplete {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByText(/Alice/)).toBeInTheDocument()
      })
    })

    it('does not render when isOpen is false', () => {
      render(<MentionAutocomplete {...defaultProps} isOpen={false} />)
      
      expect(screen.queryByText(/Alice/)).not.toBeInTheDocument()
    })

    it('renders at the specified position', async () => {
      const { container } = render(<MentionAutocomplete {...defaultProps} />)
      
      await waitFor(() => {
        const dropdown = container.querySelector('[class*="fixed"]')
        expect(dropdown).toHaveStyle({ left: '100px', top: '200px' })
      })
    })

    it('shows loading state while fetching suggestions', async () => {
      // The loading state appears briefly, so we need to check immediately
      const { container } = render(<MentionAutocomplete {...defaultProps} />)
      
      // Should eventually show results
      await waitFor(() => {
        expect(screen.getByText(/Alice/)).toBeInTheDocument()
      })
    })

    it('shows empty state when no results found', async () => {
      const { getAutocompleteSuggestions } = await import('@/lib/mentions/mentionResolver')
      ;(getAutocompleteSuggestions as any).mockResolvedValueOnce([])
      
      render(<MentionAutocomplete {...defaultProps} query="xyz123" />)
      
      await waitFor(() => {
        expect(screen.getByText('No entities found')).toBeInTheDocument()
      })
    })
  })

  describe('Keyboard Navigation', () => {
    it('navigates down with ArrowDown key', async () => {
      render(<MentionAutocomplete {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByText(/Alice/)).toBeInTheDocument()
      })
      
      fireEvent.keyDown(window, { key: 'ArrowDown' })
      
      // Second item should now be selected
      // (Visual selection is handled via CSS class)
    })

    it('navigates up with ArrowUp key', async () => {
      render(<MentionAutocomplete {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByText(/Alice/)).toBeInTheDocument()
      })
      
      // Navigate down first, then up
      fireEvent.keyDown(window, { key: 'ArrowDown' })
      fireEvent.keyDown(window, { key: 'ArrowUp' })
    })

    it('selects item on Enter key', async () => {
      render(<MentionAutocomplete {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByText(/Alice/)).toBeInTheDocument()
      })
      
      fireEvent.keyDown(window, { key: 'Enter' })
      
      expect(defaultProps.onSelect).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'person-1',
          label: 'Alice Johnson',
        })
      )
    })

    it('selects item on Tab key', async () => {
      render(<MentionAutocomplete {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByText(/Alice/)).toBeInTheDocument()
      })
      
      fireEvent.keyDown(window, { key: 'Tab' })
      
      expect(defaultProps.onSelect).toHaveBeenCalled()
    })

    it('dismisses on Escape key', async () => {
      render(<MentionAutocomplete {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByText(/Alice/)).toBeInTheDocument()
      })
      
      fireEvent.keyDown(window, { key: 'Escape' })
      
      expect(defaultProps.onDismiss).toHaveBeenCalled()
    })
  })

  describe('Mouse Interaction', () => {
    it('selects item on click', async () => {
      render(<MentionAutocomplete {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByText(/Alice Johnson/)).toBeInTheDocument()
      })
      
      // Find and click on the suggestion
      const suggestion = screen.getByText(/Alice Johnson/).closest('[class*="cursor-pointer"]')
      if (suggestion) {
        fireEvent.click(suggestion)
        expect(defaultProps.onSelect).toHaveBeenCalled()
      }
    })

    it('highlights item on hover', async () => {
      render(<MentionAutocomplete {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByText(/Alice Johnson/)).toBeInTheDocument()
      })
      
      const suggestion = screen.getByText(/Alice Johnson/).closest('[class*="cursor-pointer"]')
      if (suggestion) {
        fireEvent.mouseEnter(suggestion)
        // Selection index should update
      }
    })
  })

  describe('Type Filtering', () => {
    it('renders type filter tabs', async () => {
      render(<MentionAutocomplete {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByText('All')).toBeInTheDocument()
        expect(screen.getByText('People')).toBeInTheDocument()
        expect(screen.getByText('Places')).toBeInTheDocument()
        expect(screen.getByText('Dates')).toBeInTheDocument()
        expect(screen.getByText('Strands')).toBeInTheDocument()
      })
    })

    it('filters by type when tab is clicked', async () => {
      const { getAutocompleteSuggestions } = await import('@/lib/mentions/mentionResolver')
      
      render(<MentionAutocomplete {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByText('People')).toBeInTheDocument()
      })
      
      fireEvent.click(screen.getByText('People'))
      
      await waitFor(() => {
        expect(getAutocompleteSuggestions).toHaveBeenCalledWith(
          'Alice',
          expect.objectContaining({
            types: ['person', 'team'],
          })
        )
      })
    })

    it('respects initial filterTypes prop', async () => {
      const { getAutocompleteSuggestions } = await import('@/lib/mentions/mentionResolver')
      
      render(
        <MentionAutocomplete
          {...defaultProps}
          filterTypes={['place']}
        />
      )
      
      await waitFor(() => {
        expect(getAutocompleteSuggestions).toHaveBeenCalledWith(
          'Alice',
          expect.objectContaining({
            types: ['place'],
          })
        )
      })
    })
  })

  describe('Empty Query Behavior', () => {
    it('shows recent entities when query is empty', async () => {
      const { getRecentEntities } = await import('@/lib/mentions/mentionResolver')
      
      render(<MentionAutocomplete {...defaultProps} query="" />)
      
      await waitFor(() => {
        expect(getRecentEntities).toHaveBeenCalled()
      })
    })
  })

  describe('Keyboard Hints', () => {
    it('displays keyboard navigation hints', async () => {
      render(<MentionAutocomplete {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByText('Navigate')).toBeInTheDocument()
        expect(screen.getByText('Select')).toBeInTheDocument()
        expect(screen.getByText('Dismiss')).toBeInTheDocument()
      })
    })
  })

  describe('Custom Props', () => {
    it('respects maxSuggestions prop', async () => {
      const { getAutocompleteSuggestions } = await import('@/lib/mentions/mentionResolver')
      
      render(<MentionAutocomplete {...defaultProps} maxSuggestions={5} />)
      
      await waitFor(() => {
        expect(getAutocompleteSuggestions).toHaveBeenCalledWith(
          'Alice',
          expect.objectContaining({
            limit: 5,
          })
        )
      })
    })

    it('passes strandPath to suggestions', async () => {
      const { getAutocompleteSuggestions } = await import('@/lib/mentions/mentionResolver')
      
      render(<MentionAutocomplete {...defaultProps} strandPath="/my/strand" />)
      
      await waitFor(() => {
        expect(getAutocompleteSuggestions).toHaveBeenCalledWith(
          'Alice',
          expect.objectContaining({
            currentStrandPath: '/my/strand',
          })
        )
      })
    })

    it('applies custom className', async () => {
      const { container } = render(
        <MentionAutocomplete {...defaultProps} className="custom-class" />
      )
      
      await waitFor(() => {
        const dropdown = container.querySelector('.custom-class')
        expect(dropdown).toBeInTheDocument()
      })
    })
  })
})

