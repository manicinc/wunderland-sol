/**
 * Unit tests for FavoritesSidebarSection component
 * Tests the sidebar favorites display functionality
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { FavoritesSidebarSection } from '@/components/quarry/ui/sidebar/sections/FavoritesSidebarSection'
import type { CollectionMetadata } from '@/components/quarry/types'

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => children,
}))

const mockCollection: CollectionMetadata = {
  id: 'system-favorites',
  title: 'Favorites',
  description: 'Your favorite strands',
  icon: '⭐',
  color: '#facc15',
  strandPaths: [
    'weaves/wiki/frame/getting-started.md',
    'weaves/knowledge/ai-ml/transformers.md',
    'weaves/notes/meeting-notes.md',
  ],
  viewMode: 'cards',
  isSystem: true,
  systemType: 'favorites',
  pinned: false,
  sortOrder: -1,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
}

describe('FavoritesSidebarSection', () => {
  const mockOnNavigate = vi.fn()
  const mockOnToggleExpand = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ============================================================================
  // Rendering Tests
  // ============================================================================

  describe('Rendering', () => {
    it('renders nothing when collection has no strands', () => {
      const emptyCollection = { ...mockCollection, strandPaths: [] }
      const { container } = render(
        <FavoritesSidebarSection
          collection={emptyCollection}
          onNavigate={mockOnNavigate}
          isDark={false}
        />
      )
      expect(container.firstChild).toBeNull()
    })

    it('renders favorites section header with correct title', () => {
      render(
        <FavoritesSidebarSection
          collection={mockCollection}
          onNavigate={mockOnNavigate}
          isDark={false}
        />
      )
      expect(screen.getByText('Favorites')).toBeInTheDocument()
    })

    it('renders strand count badge', () => {
      render(
        <FavoritesSidebarSection
          collection={mockCollection}
          onNavigate={mockOnNavigate}
          isDark={false}
        />
      )
      expect(screen.getByText('3')).toBeInTheDocument()
    })

    it('renders strand items with formatted names', () => {
      render(
        <FavoritesSidebarSection
          collection={mockCollection}
          onNavigate={mockOnNavigate}
          isDark={false}
          isExpanded={true}
        />
      )
      // 'getting-started.md' should become 'Getting Started'
      expect(screen.getByText('Getting Started')).toBeInTheDocument()
      // 'transformers.md' should become 'Transformers'
      expect(screen.getByText('Transformers')).toBeInTheDocument()
      // 'meeting-notes.md' should become 'Meeting Notes'
      expect(screen.getByText('Meeting Notes')).toBeInTheDocument()
    })

    it('renders parent context for strands', () => {
      render(
        <FavoritesSidebarSection
          collection={mockCollection}
          onNavigate={mockOnNavigate}
          isDark={false}
          isExpanded={true}
        />
      )
      // Parent context should show 'wiki/frame', 'knowledge/ai-ml', 'notes'
      expect(screen.getByText('wiki/frame')).toBeInTheDocument()
      expect(screen.getByText('knowledge/ai-ml')).toBeInTheDocument()
      expect(screen.getByText('notes')).toBeInTheDocument()
    })
  })

  // ============================================================================
  // Interaction Tests
  // ============================================================================

  describe('Interactions', () => {
    it('calls onNavigate when strand item is clicked', () => {
      render(
        <FavoritesSidebarSection
          collection={mockCollection}
          onNavigate={mockOnNavigate}
          isDark={false}
          isExpanded={true}
        />
      )

      fireEvent.click(screen.getByText('Getting Started'))
      expect(mockOnNavigate).toHaveBeenCalledWith('weaves/wiki/frame/getting-started.md')
    })

    it('calls onToggleExpand when header is clicked', () => {
      render(
        <FavoritesSidebarSection
          collection={mockCollection}
          onNavigate={mockOnNavigate}
          onToggleExpand={mockOnToggleExpand}
          isDark={false}
          isExpanded={true}
        />
      )

      fireEvent.click(screen.getByText('Favorites'))
      expect(mockOnToggleExpand).toHaveBeenCalled()
    })
  })

  // ============================================================================
  // MaxItems and "View All" Link Tests
  // ============================================================================

  describe('MaxItems behavior', () => {
    const manyStrandsCollection: CollectionMetadata = {
      ...mockCollection,
      strandPaths: Array.from({ length: 15 }, (_, i) => `weaves/notes/note-${i + 1}.md`),
    }

    it('limits displayed strands to maxItems', () => {
      render(
        <FavoritesSidebarSection
          collection={manyStrandsCollection}
          onNavigate={mockOnNavigate}
          isDark={false}
          isExpanded={true}
          maxItems={5}
        />
      )

      // Should only show 5 strands
      expect(screen.getByText('Note 1')).toBeInTheDocument()
      expect(screen.getByText('Note 5')).toBeInTheDocument()
      expect(screen.queryByText('Note 6')).not.toBeInTheDocument()
    })

    it('shows "View all" link when strands exceed maxItems', () => {
      render(
        <FavoritesSidebarSection
          collection={manyStrandsCollection}
          onNavigate={mockOnNavigate}
          isDark={false}
          isExpanded={true}
          maxItems={5}
        />
      )

      expect(screen.getByText('View all 15 favorites')).toBeInTheDocument()
    })

    it('does not show "View all" link when strands within maxItems', () => {
      render(
        <FavoritesSidebarSection
          collection={mockCollection}
          onNavigate={mockOnNavigate}
          isDark={false}
          isExpanded={true}
          maxItems={10}
        />
      )

      expect(screen.queryByText(/View all/)).not.toBeInTheDocument()
    })
  })

  // ============================================================================
  // Theme Tests
  // ============================================================================

  describe('Theme support', () => {
    it('applies dark mode styles when isDark is true', () => {
      const { container } = render(
        <FavoritesSidebarSection
          collection={mockCollection}
          onNavigate={mockOnNavigate}
          isDark={true}
          isExpanded={true}
        />
      )

      // Check for dark mode specific classes
      const badge = screen.getByText('3')
      expect(badge.className).toContain('bg-yellow-500/20')
      expect(badge.className).toContain('text-yellow-400')
    })

    it('applies light mode styles when isDark is false', () => {
      render(
        <FavoritesSidebarSection
          collection={mockCollection}
          onNavigate={mockOnNavigate}
          isDark={false}
          isExpanded={true}
        />
      )

      const badge = screen.getByText('3')
      expect(badge.className).toContain('bg-yellow-100')
      expect(badge.className).toContain('text-yellow-700')
    })
  })
})
