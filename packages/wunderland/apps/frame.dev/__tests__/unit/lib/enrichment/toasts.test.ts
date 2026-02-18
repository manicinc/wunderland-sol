/**
 * Enrichment Toast Tests
 * @module __tests__/unit/lib/enrichment/toasts.test
 *
 * Tests for enrichment suggestion toast notifications.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock the toast module
vi.mock('@/lib/ai/toast', () => ({
  showToast: vi.fn().mockImplementation((options) => `toast-${options.id || 'default'}`),
}))

import {
  showEnrichmentSuggestions,
  showEnrichmentApplied,
  showEnrichmentDismissed,
  showAnalysisStarted,
  showAnalysisComplete,
  showEnrichmentRequiresAPI,
  showBatchEnrichmentProgress,
  showBatchEnrichmentComplete,
  showMentionsFound,
  showFormulaComputed,
  showViewRendered,
  type EnrichmentToastInfo,
} from '@/lib/enrichment/toasts'
import { showToast } from '@/lib/ai/toast'

describe('enrichment toasts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ============================================================================
  // showEnrichmentSuggestions
  // ============================================================================

  describe('showEnrichmentSuggestions', () => {
    it('shows toast for single suggestion', () => {
      const info: EnrichmentToastInfo = {
        count: 1,
        categories: ['tags'],
      }

      showEnrichmentSuggestions(info)

      expect(showToast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'subtle',
          message: expect.stringContaining('1 enrichment suggestion'),
          duration: 5000,
          position: 'bottom-right',
        })
      )
    })

    it('shows toast for multiple suggestions', () => {
      const info: EnrichmentToastInfo = {
        count: 5,
        categories: ['tags', 'categories'],
      }

      showEnrichmentSuggestions(info)

      expect(showToast).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('5 enrichment suggestions'),
        })
      )
    })

    it('includes category labels', () => {
      const info: EnrichmentToastInfo = {
        count: 3,
        categories: ['tags', 'related'],
      }

      showEnrichmentSuggestions(info)

      expect(showToast).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('tags'),
        })
      )
    })

    it('shows +more for many categories', () => {
      const info: EnrichmentToastInfo = {
        count: 10,
        categories: ['tags', 'categories', 'views', 'related'],
      }

      showEnrichmentSuggestions(info)

      expect(showToast).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('+more'),
        })
      )
    })

    it('includes view action when onView provided', () => {
      const onView = vi.fn()
      const info: EnrichmentToastInfo = {
        count: 2,
        categories: ['tags'],
        onView,
      }

      showEnrichmentSuggestions(info)

      expect(showToast).toHaveBeenCalledWith(
        expect.objectContaining({
          action: expect.objectContaining({
            label: 'View',
            onClick: onView,
          }),
        })
      )
    })

    it('uses strand path in toast ID', () => {
      const info: EnrichmentToastInfo = {
        count: 1,
        categories: ['tags'],
        strandPath: 'docs/readme.md',
      }

      showEnrichmentSuggestions(info)

      expect(showToast).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'enrichment-docs/readme.md',
        })
      )
    })

    it('uses global fallback for ID when no strand path', () => {
      const info: EnrichmentToastInfo = {
        count: 1,
        categories: ['categories'],
      }

      showEnrichmentSuggestions(info)

      expect(showToast).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'enrichment-global',
        })
      )
    })
  })

  // ============================================================================
  // showEnrichmentApplied
  // ============================================================================

  describe('showEnrichmentApplied', () => {
    it('shows success toast for applied tag', () => {
      showEnrichmentApplied('tag', 'important')

      expect(showToast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'success',
          message: 'Tag "important" applied',
          duration: 2500,
        })
      )
    })

    it('shows success toast for applied category', () => {
      showEnrichmentApplied('category', 'Projects')

      expect(showToast).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Category "Projects" applied',
        })
      )
    })

    it('shows success toast for applied view', () => {
      showEnrichmentApplied('view', 'Kanban')

      expect(showToast).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'View "Kanban" applied',
        })
      )
    })

    it('shows success toast for applied relation', () => {
      showEnrichmentApplied('relation', 'parent-of')

      expect(showToast).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Relation "parent-of" applied',
        })
      )
    })
  })

  // ============================================================================
  // showEnrichmentDismissed
  // ============================================================================

  describe('showEnrichmentDismissed', () => {
    it('shows singular message for one dismissal', () => {
      showEnrichmentDismissed(1)

      expect(showToast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'subtle',
          message: 'Suggestion dismissed',
          duration: 2000,
        })
      )
    })

    it('shows plural message for multiple dismissals', () => {
      showEnrichmentDismissed(5)

      expect(showToast).toHaveBeenCalledWith(
        expect.objectContaining({
          message: '5 suggestions dismissed',
        })
      )
    })

    it('defaults to 1 when no count provided', () => {
      showEnrichmentDismissed()

      expect(showToast).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Suggestion dismissed',
        })
      )
    })
  })

  // ============================================================================
  // showAnalysisStarted
  // ============================================================================

  describe('showAnalysisStarted', () => {
    it('shows persistent analyzing toast', () => {
      showAnalysisStarted('MyDocument.md')

      expect(showToast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'subtle',
          message: '🔍 Analyzing "MyDocument.md"...',
          duration: 0,
          id: 'analysis-MyDocument.md',
        })
      )
    })
  })

  // ============================================================================
  // showAnalysisComplete
  // ============================================================================

  describe('showAnalysisComplete', () => {
    it('shows completion with suggestions found', () => {
      showAnalysisComplete('Doc.md', 5)

      expect(showToast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'success',
          message: '✅ Analysis complete: 5 suggestions found',
          duration: 4000,
          id: 'analysis-Doc.md',
        })
      )
    })

    it('shows singular form for one suggestion', () => {
      showAnalysisComplete('Doc.md', 1)

      expect(showToast).toHaveBeenCalledWith(
        expect.objectContaining({
          message: '✅ Analysis complete: 1 suggestion found',
        })
      )
    })

    it('shows no suggestions message', () => {
      showAnalysisComplete('Doc.md', 0)

      expect(showToast).toHaveBeenCalledWith(
        expect.objectContaining({
          message: '✅ Analysis complete: No suggestions',
        })
      )
    })

    it('includes view action when suggestions and onView provided', () => {
      const onView = vi.fn()
      showAnalysisComplete('Doc.md', 3, onView)

      expect(showToast).toHaveBeenCalledWith(
        expect.objectContaining({
          action: expect.objectContaining({
            label: 'View',
            onClick: onView,
          }),
        })
      )
    })

    it('does not include action when no suggestions', () => {
      const onView = vi.fn()
      showAnalysisComplete('Doc.md', 0, onView)

      expect(showToast).toHaveBeenCalledWith(
        expect.objectContaining({
          action: undefined,
        })
      )
    })
  })

  // ============================================================================
  // showEnrichmentRequiresAPI
  // ============================================================================

  describe('showEnrichmentRequiresAPI', () => {
    it('shows API configuration prompt', () => {
      showEnrichmentRequiresAPI()

      expect(showToast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'subtle',
          message: '🔑 Configure API keys to enable smart suggestions',
          duration: 5000,
          id: 'enrichment-api-required',
        })
      )
    })

    it('includes settings action', () => {
      showEnrichmentRequiresAPI()

      expect(showToast).toHaveBeenCalledWith(
        expect.objectContaining({
          action: expect.objectContaining({
            label: 'Settings',
          }),
        })
      )
    })
  })

  // ============================================================================
  // showBatchEnrichmentProgress
  // ============================================================================

  describe('showBatchEnrichmentProgress', () => {
    it('shows progress percentage', () => {
      showBatchEnrichmentProgress(5, 10)

      expect(showToast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'subtle',
          message: '📊 Processing documents: 5/10 (50%)',
          duration: 0,
          id: 'batch-enrichment-progress',
        })
      )
    })

    it('rounds percentage', () => {
      showBatchEnrichmentProgress(1, 3)

      expect(showToast).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('33%'),
        })
      )
    })

    it('shows 100% when complete', () => {
      showBatchEnrichmentProgress(10, 10)

      expect(showToast).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('100%'),
        })
      )
    })
  })

  // ============================================================================
  // showBatchEnrichmentComplete
  // ============================================================================

  describe('showBatchEnrichmentComplete', () => {
    it('shows completion summary', () => {
      showBatchEnrichmentComplete(10, 25)

      expect(showToast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'success',
          message: '✨ Analyzed 10 documents, found 25 suggestions',
          duration: 6000,
          id: 'batch-enrichment-progress',
        })
      )
    })

    it('includes dashboard action when provided', () => {
      const onViewDashboard = vi.fn()
      showBatchEnrichmentComplete(5, 10, onViewDashboard)

      expect(showToast).toHaveBeenCalledWith(
        expect.objectContaining({
          action: expect.objectContaining({
            label: 'Dashboard',
            onClick: onViewDashboard,
          }),
        })
      )
    })

    it('does not include action when no callback', () => {
      showBatchEnrichmentComplete(5, 10)

      expect(showToast).toHaveBeenCalledWith(
        expect.objectContaining({
          action: undefined,
        })
      )
    })
  })

  // ============================================================================
  // showMentionsFound
  // ============================================================================

  describe('showMentionsFound', () => {
    it('returns empty string for zero mentions', () => {
      const result = showMentionsFound(0)
      expect(result).toBe('')
      expect(showToast).not.toHaveBeenCalled()
    })

    it('shows singular for one mention', () => {
      showMentionsFound(1)

      expect(showToast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'subtle',
          message: '📍 1 mention detected',
          duration: 2000,
          id: 'mentions-detected',
        })
      )
    })

    it('shows plural for multiple mentions', () => {
      showMentionsFound(5)

      expect(showToast).toHaveBeenCalledWith(
        expect.objectContaining({
          message: '📍 5 mentions detected',
        })
      )
    })
  })

  // ============================================================================
  // showFormulaComputed
  // ============================================================================

  describe('showFormulaComputed', () => {
    it('shows computed number result', () => {
      showFormulaComputed('Total', 1234)

      expect(showToast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'subtle',
          message: '🔢 Total: 1,234',
          duration: 2500,
        })
      )
    })

    it('shows computed string result', () => {
      showFormulaComputed('Status', 'Active')

      expect(showToast).toHaveBeenCalledWith(
        expect.objectContaining({
          message: '🔢 Status: Active',
        })
      )
    })

    it('handles non-primitive results', () => {
      showFormulaComputed('Data', { value: 123 })

      expect(showToast).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Data:'),
        })
      )
    })
  })

  // ============================================================================
  // showViewRendered
  // ============================================================================

  describe('showViewRendered', () => {
    it('shows singular for one item', () => {
      showViewRendered('Table', 1)

      expect(showToast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'subtle',
          message: '📊 Table view: 1 item',
          duration: 2000,
        })
      )
    })

    it('shows plural for multiple items', () => {
      showViewRendered('Kanban', 15)

      expect(showToast).toHaveBeenCalledWith(
        expect.objectContaining({
          message: '📊 Kanban view: 15 items',
        })
      )
    })
  })

  // ============================================================================
  // Type exports
  // ============================================================================

  describe('type exports', () => {
    it('EnrichmentToastInfo type is valid', () => {
      const info: EnrichmentToastInfo = {
        strandPath: '/docs/test.md',
        count: 3,
        categories: ['tags', 'views'],
        onView: () => {},
      }

      expect(info.count).toBe(3)
      expect(info.categories).toHaveLength(2)
    })
  })
})
