/**
 * Conflict Resolver Tests
 * @module __tests__/unit/lib/sync/conflictResolver.test
 *
 * Tests for sync conflict detection and resolution strategies.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  detectConflictFields,
  canAutoResolve,
  resolveConflict,
  getRecommendedStrategy,
  getConflictSummary,
  ConflictResolver,
  getConflictResolver,
} from '@/lib/sync/conflictResolver'
import type {
  SyncOperation,
  ConflictData,
  ConflictStrategy,
} from '@/lib/sync/types'

describe('conflictResolver module', () => {
  // ============================================================================
  // detectConflictFields
  // ============================================================================

  describe('detectConflictFields', () => {
    it('returns empty array for null inputs', () => {
      expect(detectConflictFields(null, null)).toEqual([])
      expect(detectConflictFields(null, { title: 'test' })).toEqual([])
      expect(detectConflictFields({ title: 'test' }, null)).toEqual([])
    })

    it('returns empty array for non-object inputs', () => {
      expect(detectConflictFields('string', 'string')).toEqual([])
      expect(detectConflictFields(123, 456)).toEqual([])
    })

    it('returns empty array when objects are identical', () => {
      const state = { title: 'Test', content: 'Hello' }
      expect(detectConflictFields(state, state)).toEqual([])
    })

    it('detects different field values', () => {
      const local = { title: 'Local Title', content: 'Same' }
      const server = { title: 'Server Title', content: 'Same' }

      const conflicts = detectConflictFields(local, server)
      expect(conflicts).toContain('title')
      expect(conflicts).not.toContain('content')
    })

    it('ignores metadata fields', () => {
      const local = { id: '1', createdAt: '2025-01-01', title: 'Test' }
      const server = { id: '2', createdAt: '2025-01-02', title: 'Test' }

      const conflicts = detectConflictFields(local, server)
      expect(conflicts).not.toContain('id')
      expect(conflicts).not.toContain('createdAt')
    })

    it('ignores updatedAt and version fields', () => {
      const local = { updatedAt: '2025-01-01', version: 1, title: 'Test' }
      const server = { updatedAt: '2025-01-02', version: 2, title: 'Test' }

      const conflicts = detectConflictFields(local, server)
      expect(conflicts).not.toContain('updatedAt')
      expect(conflicts).not.toContain('version')
    })

    it('detects multiple conflicting fields', () => {
      const local = { title: 'A', content: 'B', tags: ['x'] }
      const server = { title: 'X', content: 'Y', tags: ['z'] }

      const conflicts = detectConflictFields(local, server)
      expect(conflicts).toContain('title')
      expect(conflicts).toContain('content')
      expect(conflicts).toContain('tags')
    })

    it('detects fields present in only one object', () => {
      const local = { title: 'Test', extra: 'value' }
      const server = { title: 'Test' }

      const conflicts = detectConflictFields(local, server)
      expect(conflicts).toContain('extra')
    })

    it('compares nested objects by JSON stringify', () => {
      const local = { meta: { a: 1, b: 2 } }
      const server = { meta: { a: 1, b: 3 } }

      const conflicts = detectConflictFields(local, server)
      expect(conflicts).toContain('meta')
    })
  })

  // ============================================================================
  // canAutoResolve
  // ============================================================================

  describe('canAutoResolve', () => {
    it('returns true when no conflict fields', () => {
      const data: ConflictData = {
        localState: {},
        serverState: {},
        conflictFields: [],
        autoResolvable: false,
      }
      expect(canAutoResolve(data)).toBe(true)
    })

    it('returns true when marked autoResolvable', () => {
      const data: ConflictData = {
        localState: {},
        serverState: {},
        conflictFields: ['title', 'content'],
        autoResolvable: true,
      }
      expect(canAutoResolve(data)).toBe(true)
    })

    it('returns true for only metadata conflicts', () => {
      const data: ConflictData = {
        localState: {},
        serverState: {},
        conflictFields: ['updatedAt', 'modifiedAt', 'version', 'syncedAt'],
        autoResolvable: false,
      }
      expect(canAutoResolve(data)).toBe(true)
    })

    it('returns false for non-metadata conflicts', () => {
      const data: ConflictData = {
        localState: {},
        serverState: {},
        conflictFields: ['title'],
        autoResolvable: false,
      }
      expect(canAutoResolve(data)).toBe(false)
    })

    it('returns false for mixed metadata and non-metadata conflicts', () => {
      const data: ConflictData = {
        localState: {},
        serverState: {},
        conflictFields: ['updatedAt', 'content'],
        autoResolvable: false,
      }
      expect(canAutoResolve(data)).toBe(false)
    })
  })

  // ============================================================================
  // resolveConflict
  // ============================================================================

  describe('resolveConflict', () => {
    const createOperation = (conflictData?: ConflictData): SyncOperation => ({
      id: 'op-1',
      type: 'update',
      priority: 'normal',
      status: 'conflict',
      resourceType: 'strand',
      resourceId: 'strand-1',
      payload: {},
      createdAt: new Date().toISOString(),
      attemptCount: 1,
      conflictData,
    })

    it('requires manual review when no conflict data', () => {
      const operation = createOperation(undefined)
      const result = resolveConflict(operation, 'local-wins')

      expect(result.resolved).toBe(false)
      expect(result.requiresManualReview).toBe(true)
    })

    describe('local-wins strategy', () => {
      it('uses local state as merged state', () => {
        const operation = createOperation({
          localState: { title: 'Local' },
          serverState: { title: 'Server' },
          conflictFields: ['title'],
          autoResolvable: false,
        })

        const result = resolveConflict(operation, 'local-wins')

        expect(result.resolved).toBe(true)
        expect(result.strategy).toBe('local-wins')
        expect(result.mergedState).toEqual({ title: 'Local' })
        expect(result.requiresManualReview).toBe(false)
      })
    })

    describe('server-wins strategy', () => {
      it('uses server state as merged state', () => {
        const operation = createOperation({
          localState: { title: 'Local' },
          serverState: { title: 'Server' },
          conflictFields: ['title'],
          autoResolvable: false,
        })

        const result = resolveConflict(operation, 'server-wins')

        expect(result.resolved).toBe(true)
        expect(result.strategy).toBe('server-wins')
        expect(result.mergedState).toEqual({ title: 'Server' })
        expect(result.requiresManualReview).toBe(false)
      })
    })

    describe('newest-wins strategy', () => {
      it('uses local when local is newer', () => {
        const operation = createOperation({
          localState: { title: 'Local', updatedAt: '2025-01-15T10:00:00Z' },
          serverState: { title: 'Server', updatedAt: '2025-01-14T10:00:00Z' },
          conflictFields: ['title'],
          autoResolvable: false,
        })

        const result = resolveConflict(operation, 'newest-wins')

        expect(result.resolved).toBe(true)
        expect(result.mergedState).toEqual({ title: 'Local', updatedAt: '2025-01-15T10:00:00Z' })
      })

      it('uses server when server is newer', () => {
        const operation = createOperation({
          localState: { title: 'Local', updatedAt: '2025-01-14T10:00:00Z' },
          serverState: { title: 'Server', updatedAt: '2025-01-15T10:00:00Z' },
          conflictFields: ['title'],
          autoResolvable: false,
        })

        const result = resolveConflict(operation, 'newest-wins')

        expect(result.resolved).toBe(true)
        expect(result.mergedState).toEqual({ title: 'Server', updatedAt: '2025-01-15T10:00:00Z' })
      })

      it('uses modifiedAt as fallback timestamp', () => {
        const operation = createOperation({
          localState: { title: 'Local', modifiedAt: '2025-01-15T10:00:00Z' },
          serverState: { title: 'Server', modifiedAt: '2025-01-14T10:00:00Z' },
          conflictFields: ['title'],
          autoResolvable: false,
        })

        const result = resolveConflict(operation, 'newest-wins')
        expect(result.mergedState).toEqual({ title: 'Local', modifiedAt: '2025-01-15T10:00:00Z' })
      })

      it('uses timestamp field as fallback', () => {
        const operation = createOperation({
          localState: { title: 'Local', timestamp: '2025-01-15T10:00:00Z' },
          serverState: { title: 'Server', timestamp: '2025-01-14T10:00:00Z' },
          conflictFields: ['title'],
          autoResolvable: false,
        })

        const result = resolveConflict(operation, 'newest-wins')
        expect(result.mergedState).toEqual({ title: 'Local', timestamp: '2025-01-15T10:00:00Z' })
      })

      it('handles numeric timestamps', () => {
        const operation = createOperation({
          localState: { title: 'Local', timestamp: 1705312800000 }, // Newer
          serverState: { title: 'Server', timestamp: 1705226400000 },
          conflictFields: ['title'],
          autoResolvable: false,
        })

        const result = resolveConflict(operation, 'newest-wins')
        expect(result.mergedState).toEqual({ title: 'Local', timestamp: 1705312800000 })
      })

      it('defaults to server when no timestamps', () => {
        const operation = createOperation({
          localState: { title: 'Local' },
          serverState: { title: 'Server' },
          conflictFields: ['title'],
          autoResolvable: false,
        })

        const result = resolveConflict(operation, 'newest-wins')
        // Both return 0 timestamp, so it's not > (serverTime), defaults to server
        expect(result.mergedState).toEqual({ title: 'Server' })
      })
    })

    describe('merge strategy', () => {
      it('merges non-conflicting fields from local', () => {
        const operation = createOperation({
          localState: { title: 'Local Title', localOnly: 'value' },
          serverState: { title: 'Server Title', serverOnly: 'value' },
          conflictFields: ['title'],
          autoResolvable: false,
        })

        const result = resolveConflict(operation, 'merge')

        expect(result.resolved).toBe(true)
        const merged = result.mergedState as Record<string, unknown>
        expect(merged.localOnly).toBe('value')
        expect(merged.serverOnly).toBe('value')
      })

      it('uses newest timestamp for conflicting fields', () => {
        const operation = createOperation({
          localState: { title: 'Local', content: 'A', updatedAt: '2025-01-15T10:00:00Z' },
          serverState: { title: 'Server', content: 'B', updatedAt: '2025-01-14T10:00:00Z' },
          conflictFields: ['title', 'content'],
          autoResolvable: false,
        })

        const result = resolveConflict(operation, 'merge')
        const merged = result.mergedState as Record<string, unknown>

        // Local is newer, so local values for conflicting fields
        expect(merged.title).toBe('Local')
        expect(merged.content).toBe('A')
      })

      it('adds mergedAt timestamp', () => {
        const operation = createOperation({
          localState: { title: 'Test' },
          serverState: { title: 'Test' },
          conflictFields: [],
          autoResolvable: false,
        })

        const result = resolveConflict(operation, 'merge')
        const merged = result.mergedState as Record<string, unknown>

        expect(merged.mergedAt).toBeDefined()
        expect(merged.updatedAt).toBeDefined()
      })

      it('requires manual review when there are conflicts', () => {
        const operation = createOperation({
          localState: { title: 'Local' },
          serverState: { title: 'Server' },
          conflictFields: ['title'],
          autoResolvable: false,
        })

        const result = resolveConflict(operation, 'merge')
        expect(result.requiresManualReview).toBe(true)
      })

      it('does not require manual review when no conflicts', () => {
        const operation = createOperation({
          localState: { title: 'Same' },
          serverState: { title: 'Same' },
          conflictFields: [],
          autoResolvable: false,
        })

        const result = resolveConflict(operation, 'merge')
        expect(result.requiresManualReview).toBe(false)
      })

      it('returns unresolved for non-object states', () => {
        const operation = createOperation({
          localState: 'string',
          serverState: 'other',
          conflictFields: [],
          autoResolvable: false,
        })

        const result = resolveConflict(operation, 'merge')
        expect(result.resolved).toBe(false)
        expect(result.requiresManualReview).toBe(true)
      })

      it('returns unresolved for null states', () => {
        const operation = createOperation({
          localState: null,
          serverState: { title: 'Test' },
          conflictFields: [],
          autoResolvable: false,
        })

        const result = resolveConflict(operation, 'merge')
        expect(result.resolved).toBe(false)
      })
    })

    describe('manual strategy', () => {
      it('returns unresolved requiring manual review', () => {
        const operation = createOperation({
          localState: { title: 'Test' },
          serverState: { title: 'Test' },
          conflictFields: [],
          autoResolvable: false,
        })

        const result = resolveConflict(operation, 'manual')

        expect(result.resolved).toBe(false)
        expect(result.strategy).toBe('manual')
        expect(result.requiresManualReview).toBe(true)
      })
    })

    it('handles unknown strategy as manual', () => {
      const operation = createOperation({
        localState: { title: 'Test' },
        serverState: { title: 'Test' },
        conflictFields: [],
        autoResolvable: false,
      })

      const result = resolveConflict(operation, 'unknown' as ConflictStrategy)
      expect(result.resolved).toBe(false)
      expect(result.requiresManualReview).toBe(true)
    })
  })

  // ============================================================================
  // getRecommendedStrategy
  // ============================================================================

  describe('getRecommendedStrategy', () => {
    const createOperation = (
      type: 'create' | 'update' | 'delete',
      conflictData?: ConflictData
    ): SyncOperation => ({
      id: 'op-1',
      type,
      priority: 'normal',
      status: 'conflict',
      resourceType: 'strand',
      resourceId: 'strand-1',
      payload: {},
      createdAt: new Date().toISOString(),
      attemptCount: 1,
      conflictData,
    })

    it('returns local-wins when no conflict data', () => {
      const operation = createOperation('update', undefined)
      expect(getRecommendedStrategy(operation)).toBe('local-wins')
    })

    it('returns merge for no conflicts', () => {
      const operation = createOperation('update', {
        localState: {},
        serverState: {},
        conflictFields: [],
        autoResolvable: false,
      })
      expect(getRecommendedStrategy(operation)).toBe('merge')
    })

    it('returns newest-wins for only timestamp conflicts', () => {
      const operation = createOperation('update', {
        localState: {},
        serverState: {},
        conflictFields: ['updatedAt', 'modifiedAt'],
        autoResolvable: false,
      })
      expect(getRecommendedStrategy(operation)).toBe('newest-wins')
    })

    it('returns manual for content conflicts', () => {
      const operation = createOperation('update', {
        localState: {},
        serverState: {},
        conflictFields: ['content'],
        autoResolvable: false,
      })
      expect(getRecommendedStrategy(operation)).toBe('manual')
    })

    it('returns manual for body conflicts', () => {
      const operation = createOperation('update', {
        localState: {},
        serverState: {},
        conflictFields: ['body'],
        autoResolvable: false,
      })
      expect(getRecommendedStrategy(operation)).toBe('manual')
    })

    it('returns manual for text conflicts', () => {
      const operation = createOperation('update', {
        localState: {},
        serverState: {},
        conflictFields: ['text'],
        autoResolvable: false,
      })
      expect(getRecommendedStrategy(operation)).toBe('manual')
    })

    it('returns merge for few non-content conflicts', () => {
      const operation = createOperation('update', {
        localState: {},
        serverState: {},
        conflictFields: ['title', 'status'],
        autoResolvable: false,
      })
      expect(getRecommendedStrategy(operation)).toBe('merge')
    })

    it('returns local-wins for create operations', () => {
      const operation = createOperation('create', {
        localState: {},
        serverState: {},
        conflictFields: ['title', 'status', 'priority'],
        autoResolvable: false,
      })
      expect(getRecommendedStrategy(operation)).toBe('local-wins')
    })

    it('returns merge for update operations with many conflicts', () => {
      const operation = createOperation('update', {
        localState: {},
        serverState: {},
        conflictFields: ['title', 'status', 'priority'],
        autoResolvable: false,
      })
      expect(getRecommendedStrategy(operation)).toBe('merge')
    })

    it('returns manual for delete operations', () => {
      const operation = createOperation('delete', {
        localState: {},
        serverState: {},
        conflictFields: ['title', 'status', 'priority'],
        autoResolvable: false,
      })
      expect(getRecommendedStrategy(operation)).toBe('manual')
    })
  })

  // ============================================================================
  // getConflictSummary
  // ============================================================================

  describe('getConflictSummary', () => {
    const createOperation = (conflictData?: ConflictData): SyncOperation => ({
      id: 'op-1',
      type: 'update',
      priority: 'normal',
      status: 'conflict',
      resourceType: 'strand',
      resourceId: 'strand-1',
      payload: {},
      createdAt: new Date().toISOString(),
      attemptCount: 1,
      conflictData,
    })

    it('returns message for no conflict data', () => {
      const operation = createOperation(undefined)
      expect(getConflictSummary(operation)).toBe('No conflict data available')
    })

    it('returns message for no field conflicts', () => {
      const operation = createOperation({
        localState: {},
        serverState: {},
        conflictFields: [],
        autoResolvable: false,
      })
      expect(getConflictSummary(operation)).toBe('No field conflicts detected')
    })

    it('returns singular form for one conflict', () => {
      const operation = createOperation({
        localState: {},
        serverState: {},
        conflictFields: ['title'],
        autoResolvable: false,
      })
      expect(getConflictSummary(operation)).toBe('Conflict in field: title')
    })

    it('lists multiple fields for 2-3 conflicts', () => {
      const operation = createOperation({
        localState: {},
        serverState: {},
        conflictFields: ['title', 'content'],
        autoResolvable: false,
      })
      expect(getConflictSummary(operation)).toBe('Conflicts in fields: title, content')
    })

    it('truncates for many conflicts', () => {
      const operation = createOperation({
        localState: {},
        serverState: {},
        conflictFields: ['title', 'content', 'status', 'priority', 'tags'],
        autoResolvable: false,
      })
      const summary = getConflictSummary(operation)
      expect(summary).toContain('5 conflicting fields')
      expect(summary).toContain('...')
    })
  })

  // ============================================================================
  // ConflictResolver class
  // ============================================================================

  describe('ConflictResolver class', () => {
    let resolver: ConflictResolver

    beforeEach(() => {
      resolver = new ConflictResolver()
    })

    const createOperation = (
      id: string,
      status: 'conflict' | 'pending',
      conflictData?: ConflictData
    ): SyncOperation => ({
      id,
      type: 'update',
      priority: 'normal',
      status,
      resourceType: 'strand',
      resourceId: 'strand-1',
      payload: {},
      createdAt: new Date().toISOString(),
      attemptCount: 1,
      conflictData,
    })

    describe('setDefaultStrategy', () => {
      it('accepts different strategies', () => {
        expect(() => resolver.setDefaultStrategy('local-wins')).not.toThrow()
        expect(() => resolver.setDefaultStrategy('server-wins')).not.toThrow()
        expect(() => resolver.setDefaultStrategy('merge')).not.toThrow()
        expect(() => resolver.setDefaultStrategy('manual')).not.toThrow()
      })
    })

    describe('resolve', () => {
      it('uses provided strategy', () => {
        const operation = createOperation('op-1', 'conflict', {
          localState: { title: 'Local' },
          serverState: { title: 'Server' },
          conflictFields: ['title'],
          autoResolvable: false,
        })

        const result = resolver.resolve(operation, 'local-wins')
        expect(result.strategy).toBe('local-wins')
      })

      it('uses recommended strategy when none provided', () => {
        const operation = createOperation('op-1', 'conflict', {
          localState: { title: 'Local' },
          serverState: { title: 'Server' },
          conflictFields: [],
          autoResolvable: false,
        })

        const result = resolver.resolve(operation)
        expect(result.strategy).toBe('merge') // Recommended for no conflicts
      })
    })

    describe('resolveAll', () => {
      it('resolves only conflict status operations', () => {
        const operations = [
          createOperation('op-1', 'conflict', {
            localState: {},
            serverState: {},
            conflictFields: [],
            autoResolvable: true,
          }),
          createOperation('op-2', 'pending', undefined),
          createOperation('op-3', 'conflict', {
            localState: {},
            serverState: {},
            conflictFields: [],
            autoResolvable: true,
          }),
        ]

        const results = resolver.resolveAll(operations)

        expect(results.size).toBe(2)
        expect(results.has('op-1')).toBe(true)
        expect(results.has('op-2')).toBe(false)
        expect(results.has('op-3')).toBe(true)
      })

      it('uses provided strategy for all', () => {
        const operations = [
          createOperation('op-1', 'conflict', {
            localState: { title: 'A' },
            serverState: { title: 'B' },
            conflictFields: ['title'],
            autoResolvable: false,
          }),
        ]

        const results = resolver.resolveAll(operations, 'server-wins')

        expect(results.get('op-1')?.strategy).toBe('server-wins')
      })

      it('returns empty map for no conflict operations', () => {
        const operations = [
          createOperation('op-1', 'pending', undefined),
          createOperation('op-2', 'pending', undefined),
        ]

        const results = resolver.resolveAll(operations)
        expect(results.size).toBe(0)
      })
    })

    describe('getManualReviewRequired', () => {
      it('returns operations requiring manual review', () => {
        const operations = [
          createOperation('op-1', 'conflict', {
            localState: { content: 'A' },
            serverState: { content: 'B' },
            conflictFields: ['content'],
            autoResolvable: false,
          }),
          createOperation('op-2', 'conflict', {
            localState: {},
            serverState: {},
            conflictFields: [],
            autoResolvable: true,
          }),
        ]

        const manualReview = resolver.getManualReviewRequired(operations)

        // op-1 has content conflict which requires manual review
        expect(manualReview.length).toBeGreaterThanOrEqual(1)
        expect(manualReview.some(op => op.id === 'op-1')).toBe(true)
      })

      it('excludes non-conflict operations', () => {
        const operations = [
          createOperation('op-1', 'pending', undefined),
        ]

        const manualReview = resolver.getManualReviewRequired(operations)
        expect(manualReview).toHaveLength(0)
      })
    })
  })

  // ============================================================================
  // getConflictResolver singleton
  // ============================================================================

  describe('getConflictResolver', () => {
    it('returns singleton instance', () => {
      const resolver1 = getConflictResolver()
      const resolver2 = getConflictResolver()

      expect(resolver1).toBe(resolver2)
    })

    it('returns ConflictResolver instance', () => {
      const resolver = getConflictResolver()
      expect(resolver).toBeInstanceOf(ConflictResolver)
    })
  })

  // ============================================================================
  // Edge Cases and Deep Merge Scenarios
  // ============================================================================

  describe('edge cases', () => {
    const createOperation = (conflictData?: ConflictData): SyncOperation => ({
      id: 'op-edge',
      type: 'update',
      priority: 'normal',
      status: 'conflict',
      resourceType: 'strand',
      resourceId: 'strand-edge',
      payload: {},
      createdAt: new Date().toISOString(),
      attemptCount: 1,
      conflictData,
    })

    describe('deeply nested objects in merge', () => {
      it('merges 3+ levels deep nested objects', () => {
        const operation = createOperation({
          localState: {
            config: {
              display: {
                theme: { primary: 'blue', secondary: 'gray' }
              }
            }
          },
          serverState: {
            config: {
              display: {
                theme: { primary: 'red', accent: 'yellow' }
              }
            }
          },
          conflictFields: [],
          autoResolvable: true,
        })

        const result = resolveConflict(operation, 'merge')
        const merged = result.mergedState as Record<string, unknown>

        // Local values should be merged into server base
        expect(merged.config).toBeDefined()
      })

      it('handles arrays in nested objects (arrays are replaced, not merged)', () => {
        const operation = createOperation({
          localState: {
            meta: { tags: ['a', 'b', 'c'] }
          },
          serverState: {
            meta: { tags: ['x', 'y'] }
          },
          conflictFields: [],
          autoResolvable: true,
        })

        const result = resolveConflict(operation, 'merge')
        const merged = result.mergedState as { meta: { tags: string[] } }

        // Local array should replace server array (not merge them)
        expect(merged.meta.tags).toEqual(['a', 'b', 'c'])
      })
    })

    describe('null and undefined handling', () => {
      it('handles null values in local state', () => {
        const operation = createOperation({
          localState: { title: null, content: 'Hello' },
          serverState: { title: 'Server Title', content: 'World' },
          conflictFields: ['title', 'content'],
          autoResolvable: false,
        })

        const result = resolveConflict(operation, 'local-wins')
        const merged = result.mergedState as Record<string, unknown>

        expect(merged.title).toBeNull()
      })

      it('preserves server fields not in local', () => {
        const operation = createOperation({
          localState: { content: 'Local' },
          serverState: { title: 'Server Title', content: 'Server' },
          conflictFields: ['content'],
          autoResolvable: false,
        })

        const result = resolveConflict(operation, 'merge')
        const merged = result.mergedState as Record<string, unknown>

        // Server fields not in local should be preserved
        expect(merged.title).toBe('Server Title')
      })
    })

    describe('getTimestamp extraction', () => {
      it('handles invalid date strings', () => {
        const operation = createOperation({
          localState: { title: 'Local', updatedAt: 'not-a-date' },
          serverState: { title: 'Server', updatedAt: '2025-01-15T10:00:00Z' },
          conflictFields: ['title'],
          autoResolvable: false,
        })

        const result = resolveConflict(operation, 'newest-wins')
        // Invalid date returns NaN which becomes 0, server should win
        expect(result.mergedState).toEqual({ title: 'Server', updatedAt: '2025-01-15T10:00:00Z' })
      })

      it('prefers updatedAt over modifiedAt over timestamp', () => {
        const operation = createOperation({
          localState: {
            title: 'Local',
            updatedAt: '2025-01-16T10:00:00Z', // Newest
            modifiedAt: '2025-01-14T10:00:00Z',
            timestamp: 1705226400000,
          },
          serverState: {
            title: 'Server',
            updatedAt: '2025-01-15T10:00:00Z',
          },
          conflictFields: ['title'],
          autoResolvable: false,
        })

        const result = resolveConflict(operation, 'newest-wins')
        // Local has newer updatedAt
        expect((result.mergedState as Record<string, unknown>).title).toBe('Local')
      })
    })

    describe('detectConflictFields edge cases', () => {
      it('detects field present only in local', () => {
        const local = { title: 'Test', localOnly: 'value' }
        const server = { title: 'Test' }

        const conflicts = detectConflictFields(local, server)
        expect(conflicts).toContain('localOnly')
      })

      it('treats empty array vs non-empty array as conflict', () => {
        const local = { items: [] }
        const server = { items: ['a'] }

        const conflicts = detectConflictFields(local, server)
        expect(conflicts).toContain('items')
      })

      it('treats empty object vs non-empty object as conflict', () => {
        const local = { meta: {} }
        const server = { meta: { key: 'value' } }

        const conflicts = detectConflictFields(local, server)
        expect(conflicts).toContain('meta')
      })

      it('ignores modifiedAt field', () => {
        const local = { modifiedAt: '2025-01-01' }
        const server = { modifiedAt: '2025-01-02' }

        const conflicts = detectConflictFields(local, server)
        expect(conflicts).not.toContain('modifiedAt')
      })

      it('handles boolean vs null', () => {
        const local = { enabled: false }
        const server = { enabled: null }

        const conflicts = detectConflictFields(local, server)
        expect(conflicts).toContain('enabled')
      })

      it('handles number 0 vs empty string', () => {
        const local = { count: 0 }
        const server = { count: '' }

        const conflicts = detectConflictFields(local, server)
        expect(conflicts).toContain('count')
      })
    })

    describe('canAutoResolve edge cases', () => {
      it('returns true for only syncedAt conflict', () => {
        const data: ConflictData = {
          localState: {},
          serverState: {},
          conflictFields: ['syncedAt'],
          autoResolvable: false,
        }
        expect(canAutoResolve(data)).toBe(true)
      })
    })

    describe('getRecommendedStrategy edge cases', () => {
      it('returns manual for description conflicts', () => {
        const operation = createOperation({
          localState: {},
          serverState: {},
          conflictFields: ['description'],
          autoResolvable: false,
        })
        expect(getRecommendedStrategy(operation as SyncOperation)).toBe('manual')
      })

      it('returns manual for notes conflicts', () => {
        const operation = createOperation({
          localState: {},
          serverState: {},
          conflictFields: ['notes'],
          autoResolvable: false,
        })
        expect(getRecommendedStrategy(operation as SyncOperation)).toBe('manual')
      })

      it('handles timestamp field conflict', () => {
        const operation = createOperation({
          localState: {},
          serverState: {},
          conflictFields: ['timestamp'],
          autoResolvable: false,
        })
        expect(getRecommendedStrategy(operation as SyncOperation)).toBe('newest-wins')
      })

      it('handles syncedAt only conflict', () => {
        const operation = createOperation({
          localState: {},
          serverState: {},
          conflictFields: ['syncedAt'],
          autoResolvable: false,
        })
        expect(getRecommendedStrategy(operation as SyncOperation)).toBe('newest-wins')
      })
    })

    describe('getConflictSummary edge cases', () => {
      it('handles exactly 3 conflicts', () => {
        const operation = createOperation({
          localState: {},
          serverState: {},
          conflictFields: ['a', 'b', 'c'],
          autoResolvable: false,
        })
        const summary = getConflictSummary(operation)
        expect(summary).toBe('Conflicts in fields: a, b, c')
        expect(summary).not.toContain('...')
      })

      it('handles 4 conflicts (boundary for truncation)', () => {
        const operation = createOperation({
          localState: {},
          serverState: {},
          conflictFields: ['a', 'b', 'c', 'd'],
          autoResolvable: false,
        })
        const summary = getConflictSummary(operation)
        expect(summary).toContain('4 conflicting fields')
        expect(summary).toContain('...')
      })
    })
  })
})
