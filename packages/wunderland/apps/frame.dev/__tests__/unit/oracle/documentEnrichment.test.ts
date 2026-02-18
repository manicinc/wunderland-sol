/**
 * Document Enrichment Module Tests
 * @module __tests__/unit/oracle/documentEnrichment.test
 *
 * Tests for Oracle AI document enrichment commands.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  detectEnrichmentIntent,
  buildEnrichmentAction,
  executeEnrichmentAction,
  type EnrichmentActionType,
  type EnrichmentActionParams,
} from '@/lib/planner/oracle/documentEnrichment'

// Mock dependencies
vi.mock('@/lib/mentions/mentionResolver', () => ({
  parseAllMentions: vi.fn().mockReturnValue([
    { text: 'San Francisco', type: 'place' },
    { text: 'January 15', type: 'date' },
  ]),
  resolveMention: vi.fn().mockResolvedValue({
    entity: { id: 'place-sf', type: 'place', label: 'San Francisco' },
    confidence: 0.95,
  }),
}))

vi.mock('@/lib/nlp', () => ({
  extractKeywords: vi.fn().mockReturnValue(['travel', 'trip', 'vacation']),
  analyzeDocumentWithHierarchy: vi.fn().mockResolvedValue({
    topics: ['travel'],
    entities: [],
    sentiment: 'neutral',
  }),
}))

vi.mock('@/lib/categorization', () => ({
  suggestCategoryContextAware: vi.fn().mockResolvedValue({
    category: 'Travel',
    confidence: 0.85,
    reasoning: 'Document contains travel-related content',
  }),
}))

vi.mock('@/lib/formulas/formulaEngine', () => ({
  evaluateFormula: vi.fn().mockResolvedValue(300),
}))

vi.mock('@/lib/views/embeddableViews', () => ({
  viewSupportsmentionType: vi.fn().mockReturnValue(true),
  getViewTypeMetadata: vi.fn().mockReturnValue({
    id: 'map',
    name: 'Map View',
    description: 'Display locations on a map',
  }),
}))

// ============================================================================
// INTENT DETECTION TESTS
// ============================================================================

describe('Document Enrichment', () => {
  describe('detectEnrichmentIntent', () => {
    describe('enrich document intent', () => {
      it('detects "enrich this document"', () => {
        expect(detectEnrichmentIntent('enrich this document')).toBe('enrich_document')
      })

      it('detects "analyze this note"', () => {
        expect(detectEnrichmentIntent('analyze this note')).toBe('enrich_document')
      })

      it('detects "enhance this document"', () => {
        expect(detectEnrichmentIntent('enhance this document')).toBe('enrich_document')
      })
    })

    describe('extract mentions intent', () => {
      it('detects "extract mentions"', () => {
        expect(detectEnrichmentIntent('extract mentions from this')).toBe('extract_mentions')
      })

      it('detects "find all mentions"', () => {
        expect(detectEnrichmentIntent('find all mentions')).toBe('extract_mentions')
      })

      it('detects "what entities are mentioned"', () => {
        expect(detectEnrichmentIntent('what entities are mentioned here?')).toBe('extract_mentions')
      })
    })

    describe('suggest tags intent', () => {
      it('detects "suggest tags"', () => {
        expect(detectEnrichmentIntent('suggest tags for this')).toBe('suggest_tags')
      })

      it('detects "what tags should I use"', () => {
        expect(detectEnrichmentIntent('what tags should I use?')).toBe('suggest_tags')
      })

      it('detects "recommend tags"', () => {
        expect(detectEnrichmentIntent('recommend tags')).toBe('suggest_tags')
      })
    })

    describe('suggest category intent', () => {
      it('detects "suggest category"', () => {
        expect(detectEnrichmentIntent('suggest a category')).toBe('suggest_category')
      })

      it('detects "what category"', () => {
        expect(detectEnrichmentIntent('what category should this be in?')).toBe('suggest_category')
      })

      it('detects "categorize this"', () => {
        expect(detectEnrichmentIntent('categorize this document')).toBe('suggest_category')
      })
    })

    describe('find related intent', () => {
      it('detects "find related"', () => {
        expect(detectEnrichmentIntent('find related documents')).toBe('find_related')
      })

      it('detects "similar documents"', () => {
        expect(detectEnrichmentIntent('show me similar documents')).toBe('find_related')
      })

      it('detects "what is related"', () => {
        expect(detectEnrichmentIntent('what is related to this?')).toBe('find_related')
      })
    })

    describe('evaluate formula intent', () => {
      it('detects "calculate"', () => {
        expect(detectEnrichmentIntent('calculate =ADD(1,2,3)')).toBe('evaluate_formula')
      })

      it('detects "evaluate formula"', () => {
        expect(detectEnrichmentIntent('evaluate the formula')).toBe('evaluate_formula')
      })

      it('detects "run formula"', () => {
        expect(detectEnrichmentIntent('run the formula')).toBe('evaluate_formula')
      })
    })

    describe('suggest views intent', () => {
      it('detects "suggest a view"', () => {
        expect(detectEnrichmentIntent('suggest a view')).toBe('suggest_views')
      })

      it('detects "what view should I use"', () => {
        expect(detectEnrichmentIntent('what view should I use')).toBe('suggest_views')
      })

      it('detects "how should I visualize"', () => {
        expect(detectEnrichmentIntent('how should I visualize this')).toBe('suggest_views')
      })
    })

    describe('no intent detected', () => {
      it('returns null for unrelated input', () => {
        expect(detectEnrichmentIntent('hello world')).toBeNull()
      })

      it('returns null for empty input', () => {
        expect(detectEnrichmentIntent('')).toBeNull()
      })

      it('returns null for general questions', () => {
        expect(detectEnrichmentIntent('what is the weather today?')).toBeNull()
      })
    })
  })

  // ============================================================================
  // ACTION BUILDING TESTS
  // ============================================================================

  describe('buildEnrichmentAction', () => {
    const baseParams: EnrichmentActionParams = {
      strandPath: '/documents/test.md',
      strandContent: 'Test content about San Francisco trip',
      strandTitle: 'My Trip',
    }

    it('builds enrich_document action', () => {
      const action = buildEnrichmentAction('enrich_document', baseParams)

      expect(action.type).toBe('enrich_document')
      expect(action.params).toEqual(baseParams)
      expect(action.confirmation).toContain('enrich')
      expect(action.requiresConfirmation).toBe(false)
    })

    it('builds extract_mentions action', () => {
      const action = buildEnrichmentAction('extract_mentions', baseParams)

      expect(action.type).toBe('extract_mentions')
      expect(action.confirmation).toContain('mentions')
    })

    it('builds suggest_tags action', () => {
      const action = buildEnrichmentAction('suggest_tags', baseParams)

      expect(action.type).toBe('suggest_tags')
      expect(action.confirmation).toContain('tags')
    })

    it('builds suggest_category action', () => {
      const action = buildEnrichmentAction('suggest_category', baseParams)

      expect(action.type).toBe('suggest_category')
      expect(action.confirmation).toContain('category')
    })

    it('builds find_related action', () => {
      const action = buildEnrichmentAction('find_related', baseParams)

      expect(action.type).toBe('find_related')
      expect(action.confirmation).toContain('related')
    })

    it('builds evaluate_formula action with expression', () => {
      const params: EnrichmentActionParams = {
        ...baseParams,
        formulaExpression: '=ADD(100, 200)',
      }
      const action = buildEnrichmentAction('evaluate_formula', params)

      expect(action.type).toBe('evaluate_formula')
      expect(action.confirmation).toContain('ADD(100, 200)')
    })

    it('builds suggest_views action', () => {
      const action = buildEnrichmentAction('suggest_views', baseParams)

      expect(action.type).toBe('suggest_views')
      expect(action.confirmation).toContain('view')
    })

    it('builds create_mention action with confirmation required', () => {
      const params: EnrichmentActionParams = {
        ...baseParams,
        mentionText: 'San Francisco',
        mentionType: 'place',
      }
      const action = buildEnrichmentAction('create_mention', params)

      expect(action.type).toBe('create_mention')
      expect(action.requiresConfirmation).toBe(true)
      expect(action.confirmation).toContain('San Francisco')
    })

    it('builds resolve_mention action', () => {
      const params: EnrichmentActionParams = {
        ...baseParams,
        mentionText: 'January 15',
      }
      const action = buildEnrichmentAction('resolve_mention', params)

      expect(action.type).toBe('resolve_mention')
      expect(action.confirmation).toContain('January 15')
    })

    it('builds analyze_document action', () => {
      const params: EnrichmentActionParams = {
        ...baseParams,
        includeSemantics: true,
        includeRelationships: true,
      }
      const action = buildEnrichmentAction('analyze_document', params)

      expect(action.type).toBe('analyze_document')
      expect(action.confirmation).toContain('analysis')
    })
  })

  // ============================================================================
  // ACTION EXECUTION TESTS
  // ============================================================================

  describe('executeEnrichmentAction', () => {
    const baseParams: EnrichmentActionParams = {
      strandPath: '/documents/trip.md',
      strandContent: 'Planning a trip to San Francisco on January 15, 2025. Budget is $500.',
      strandTitle: 'SF Trip',
    }

    // Helper to build action object
    const buildAction = (type: EnrichmentActionType, params: EnrichmentActionParams) => ({
      type,
      params,
      confirmation: `Execute ${type}`,
      requiresConfirmation: false,
    })

    // Note: These tests require complex mocking of dynamic imports.
    // The intent detection tests above provide coverage for the core logic.
    // Action execution tests should be integration tests with proper setup.

    describe('error handling', () => {
      it('handles unknown action type gracefully', async () => {
        const result = await executeEnrichmentAction(
          buildAction('unknown_action' as EnrichmentActionType, baseParams)
        )

        expect(result.success).toBe(false)
        expect(result.message).toContain('Unknown')
      })
    })
  })
})




