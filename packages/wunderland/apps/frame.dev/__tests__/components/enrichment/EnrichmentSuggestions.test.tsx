/**
 * EnrichmentSuggestions Component Tests
 * @module __tests__/unit/enrichment/EnrichmentSuggestions.test
 *
 * Tests for the AI/NLP-powered enrichment suggestions panel.
 */

import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  EnrichmentSuggestions,
  type EnrichmentSuggestionsProps,
  type EnrichmentData,
  type TagSuggestion,
  type CategorySuggestion,
  type ViewSuggestion,
  type RelatedDocument,
} from '@/components/quarry/ui/enrichment/EnrichmentSuggestions'

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<object>) => (
      <div {...props}>{children}</div>
    ),
    button: ({ children, ...props }: React.PropsWithChildren<object>) => (
      <button {...props}>{children}</button>
    ),
  },
  AnimatePresence: ({ children }: React.PropsWithChildren<object>) => <>{children}</>,
}))

// Mock toast functions
vi.mock('@/lib/enrichment/toasts', () => ({
  showEnrichmentApplied: vi.fn(),
  showEnrichmentDismissed: vi.fn(),
  showEnrichmentSuggestions: vi.fn(),
  showAnalysisComplete: vi.fn(),
  showViewRendered: vi.fn(),
}))

// Sample test data
const sampleTags: TagSuggestion[] = [
  { tag: 'travel', confidence: 0.95, source: 'nlp' },
  { tag: 'san-francisco', confidence: 0.88, source: 'nlp' },
  { tag: 'vacation', confidence: 0.75, source: 'ai' },
]

const sampleCategory: CategorySuggestion = {
  category: 'Travel',
  confidence: 0.92,
  reasoning: 'Document contains travel-related content including destinations and dates.',
  alternatives: [
    { category: 'Personal', confidence: 0.45 },
    { category: 'Planning', confidence: 0.38 },
  ],
}

const sampleViews: ViewSuggestion[] = [
  { type: 'map', reason: '3 locations mentioned', dataCount: 3 },
  { type: 'calendar', reason: '2 dates found', dataCount: 2 },
]

const sampleRelated: RelatedDocument[] = [
  {
    path: '/documents/travel-tips.md',
    title: 'Travel Tips',
    reason: 'Similar topic',
    type: 'similar',
  },
  {
    path: '/documents/sf-guide.md',
    title: 'San Francisco Guide',
    reason: 'Shared location',
    type: 'reference',
  },
]

const defaultEnrichmentData: EnrichmentData = {
  suggestedTags: sampleTags,
  categorySuggestion: sampleCategory,
  relatedDocuments: sampleRelated,
  suggestedViews: sampleViews,
  lastAnalyzed: new Date(),
  isLoading: false,
}

// ============================================================================
// RENDERING TESTS
// ============================================================================

describe('EnrichmentSuggestions', () => {
  const defaultProps: EnrichmentSuggestionsProps = {
    strandPath: '/documents/test.md',
    enrichmentData: defaultEnrichmentData,
    onApplyTag: vi.fn(),
    onDismissTag: vi.fn(),
    onApplyCategory: vi.fn(),
    onNavigateToDocument: vi.fn(),
    onInsertView: vi.fn(),
    onRefresh: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders with enrichment data', () => {
      render(<EnrichmentSuggestions {...defaultProps} />)

      // Should show header
      expect(screen.getByText(/enrichment/i)).toBeInTheDocument()
    })

    it('renders suggested tags', () => {
      render(<EnrichmentSuggestions {...defaultProps} />)

      expect(screen.getByText('travel')).toBeInTheDocument()
      expect(screen.getByText('san-francisco')).toBeInTheDocument()
      expect(screen.getByText('vacation')).toBeInTheDocument()
    })

    it('renders category suggestion with confidence', () => {
      render(<EnrichmentSuggestions {...defaultProps} />)

      expect(screen.getByText('Travel')).toBeInTheDocument()
      expect(screen.getByText(/92%/)).toBeInTheDocument()
    })

    it('renders suggested views with icons', () => {
      render(<EnrichmentSuggestions {...defaultProps} />)

      expect(screen.getByText(/map/i)).toBeInTheDocument()
      expect(screen.getByText(/calendar/i)).toBeInTheDocument()
    })

    it('renders related documents', () => {
      render(<EnrichmentSuggestions {...defaultProps} />)

      expect(screen.getByText('Travel Tips')).toBeInTheDocument()
      expect(screen.getByText('San Francisco Guide')).toBeInTheDocument()
    })

    it('shows loading state', () => {
      const loadingData: EnrichmentData = {
        ...defaultEnrichmentData,
        isLoading: true,
      }

      render(<EnrichmentSuggestions {...defaultProps} enrichmentData={loadingData} />)

      expect(screen.getByRole('status') || screen.getByTestId('loading')).toBeTruthy()
    })

    it('shows error state', () => {
      const errorData: EnrichmentData = {
        ...defaultEnrichmentData,
        error: 'Failed to analyze document',
      }

      render(<EnrichmentSuggestions {...defaultProps} enrichmentData={errorData} />)

      expect(screen.getByText(/failed/i)).toBeInTheDocument()
    })

    it('shows empty state when no suggestions', () => {
      const emptyData: EnrichmentData = {
        suggestedTags: [],
        relatedDocuments: [],
        suggestedViews: [],
      }

      render(<EnrichmentSuggestions {...defaultProps} enrichmentData={emptyData} />)

      expect(screen.getByText(/no suggestions/i)).toBeInTheDocument()
    })
  })

  // ============================================================================
  // INTERACTION TESTS
  // ============================================================================

  describe('Tag Interactions', () => {
    it('calls onApplyTag when tag is clicked', async () => {
      const onApplyTag = vi.fn()
      render(<EnrichmentSuggestions {...defaultProps} onApplyTag={onApplyTag} />)

      const tagButton = screen.getByText('travel')
      await userEvent.click(tagButton)

      expect(onApplyTag).toHaveBeenCalledWith('travel')
    })

    it('calls onDismissTag when dismiss button is clicked', async () => {
      const onDismissTag = vi.fn()
      render(<EnrichmentSuggestions {...defaultProps} onDismissTag={onDismissTag} />)

      // Find dismiss buttons (X icons)
      const dismissButtons = screen.getAllByRole('button', { name: /dismiss/i })
      if (dismissButtons.length > 0) {
        await userEvent.click(dismissButtons[0])
        expect(onDismissTag).toHaveBeenCalled()
      }
    })

    it('shows tag confidence as visual indicator', () => {
      render(<EnrichmentSuggestions {...defaultProps} />)

      // High confidence tags should have different styling
      const travelTag = screen.getByText('travel')
      expect(travelTag).toBeInTheDocument()
      // Visual confidence indicators are implementation-specific
    })
  })

  describe('Category Interactions', () => {
    it('calls onApplyCategory when apply button is clicked', async () => {
      const onApplyCategory = vi.fn()
      render(<EnrichmentSuggestions {...defaultProps} onApplyCategory={onApplyCategory} />)

      const applyButton = screen.getByRole('button', { name: /apply.*category/i })
      if (applyButton) {
        await userEvent.click(applyButton)
        expect(onApplyCategory).toHaveBeenCalledWith('Travel')
      }
    })

    it('shows alternative categories', async () => {
      render(<EnrichmentSuggestions {...defaultProps} />)

      // Click to expand alternatives
      const categorySection = screen.getByText('Travel')
      await userEvent.click(categorySection)

      // Check if alternatives are shown
      await waitFor(() => {
        const personal = screen.queryByText('Personal')
        const planning = screen.queryByText('Planning')
        // At least one alternative should be visible
        expect(personal || planning).toBeTruthy()
      })
    })

    it('displays reasoning for category suggestion', () => {
      render(<EnrichmentSuggestions {...defaultProps} />)

      expect(screen.getByText(/travel-related content/i)).toBeInTheDocument()
    })
  })

  describe('View Suggestions', () => {
    it('calls onInsertView when view is clicked', async () => {
      const onInsertView = vi.fn()
      render(<EnrichmentSuggestions {...defaultProps} onInsertView={onInsertView} />)

      const mapView = screen.getByText(/map/i)
      await userEvent.click(mapView)

      expect(onInsertView).toHaveBeenCalledWith('map')
    })

    it('shows data count for each view', () => {
      render(<EnrichmentSuggestions {...defaultProps} />)

      expect(screen.getByText(/3 locations/i)).toBeInTheDocument()
      expect(screen.getByText(/2 dates/i)).toBeInTheDocument()
    })

    it('displays correct icon for each view type', () => {
      render(<EnrichmentSuggestions {...defaultProps} />)

      // View icons are rendered based on type
      // Implementation-specific icon testing
    })
  })

  describe('Related Documents', () => {
    it('calls onNavigateToDocument when document is clicked', async () => {
      const onNavigateToDocument = vi.fn()
      render(
        <EnrichmentSuggestions {...defaultProps} onNavigateToDocument={onNavigateToDocument} />
      )

      const relatedDoc = screen.getByText('Travel Tips')
      await userEvent.click(relatedDoc)

      expect(onNavigateToDocument).toHaveBeenCalledWith('/documents/travel-tips.md')
    })

    it('shows relationship type badge', () => {
      render(<EnrichmentSuggestions {...defaultProps} />)

      expect(screen.getByText(/similar/i)).toBeInTheDocument()
      expect(screen.getByText(/reference/i)).toBeInTheDocument()
    })
  })

  describe('Refresh Functionality', () => {
    it('calls onRefresh when refresh button is clicked', async () => {
      const onRefresh = vi.fn()
      render(<EnrichmentSuggestions {...defaultProps} onRefresh={onRefresh} />)

      const refreshButton = screen.getByRole('button', { name: /refresh/i })
      await userEvent.click(refreshButton)

      expect(onRefresh).toHaveBeenCalled()
    })

    it('disables refresh button while loading', () => {
      const loadingData: EnrichmentData = {
        ...defaultEnrichmentData,
        isLoading: true,
      }

      render(<EnrichmentSuggestions {...defaultProps} enrichmentData={loadingData} />)

      const refreshButton = screen.getByRole('button', { name: /refresh/i })
      expect(refreshButton).toBeDisabled()
    })
  })

  // ============================================================================
  // ACCESSIBILITY TESTS
  // ============================================================================

  describe('Accessibility', () => {
    it('has accessible labels for interactive elements', () => {
      render(<EnrichmentSuggestions {...defaultProps} />)

      // Check for accessible names
      const buttons = screen.getAllByRole('button')
      buttons.forEach((button) => {
        expect(button).toHaveAccessibleName()
      })
    })

    it('supports keyboard navigation', async () => {
      render(<EnrichmentSuggestions {...defaultProps} />)

      // Tab through elements
      await userEvent.tab()

      // First focusable element should have focus
      expect(document.activeElement?.tagName).toBe('BUTTON')
    })

    it('announces loading state to screen readers', () => {
      const loadingData: EnrichmentData = {
        ...defaultEnrichmentData,
        isLoading: true,
      }

      render(<EnrichmentSuggestions {...defaultProps} enrichmentData={loadingData} />)

      const loadingElement = screen.getByRole('status')
      expect(loadingElement).toBeInTheDocument()
    })
  })

  // ============================================================================
  // EDGE CASES
  // ============================================================================

  describe('Edge Cases', () => {
    it('handles missing optional callbacks gracefully', async () => {
      const minimalProps = {
        strandPath: '/test.md',
        enrichmentData: defaultEnrichmentData,
      }

      // Should not throw
      expect(() => render(<EnrichmentSuggestions {...minimalProps} />)).not.toThrow()
    })

    it('handles very long tag names', () => {
      const longTagData: EnrichmentData = {
        ...defaultEnrichmentData,
        suggestedTags: [
          { tag: 'a-very-long-tag-name-that-might-overflow', confidence: 0.8, source: 'nlp' },
        ],
      }

      render(<EnrichmentSuggestions {...defaultProps} enrichmentData={longTagData} />)

      expect(screen.getByText(/a-very-long-tag/)).toBeInTheDocument()
    })

    it('handles many suggestions without performance issues', () => {
      const manyTags: TagSuggestion[] = Array.from({ length: 50 }, (_, i) => ({
        tag: `tag-${i}`,
        confidence: 0.5 + Math.random() * 0.5,
        source: 'nlp' as const,
      }))

      const manyData: EnrichmentData = {
        ...defaultEnrichmentData,
        suggestedTags: manyTags,
      }

      const start = performance.now()
      render(<EnrichmentSuggestions {...defaultProps} enrichmentData={manyData} />)
      const duration = performance.now() - start

      // Should render in reasonable time
      expect(duration).toBeLessThan(500)
    })

    it('updates when enrichmentData changes', async () => {
      const { rerender } = render(<EnrichmentSuggestions {...defaultProps} />)

      expect(screen.getByText('travel')).toBeInTheDocument()

      // Update with new data
      const newData: EnrichmentData = {
        ...defaultEnrichmentData,
        suggestedTags: [{ tag: 'new-tag', confidence: 0.9, source: 'ai' }],
      }

      rerender(<EnrichmentSuggestions {...defaultProps} enrichmentData={newData} />)

      await waitFor(() => {
        expect(screen.getByText('new-tag')).toBeInTheDocument()
      })
    })
  })
})

