/**
 * Analytics Events Tests
 * @module __tests__/unit/lib/analytics/analyticsEvents.test
 *
 * Tests for the analytics pub/sub event system.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  subscribeToAnalytics,
  emitAnalyticsEvent,
  emitStrandCreated,
  emitStrandUpdated,
  emitStrandDeleted,
  emitTagAdded,
  emitTagRemoved,
  emitReadingProgress,
  emitActivityLogged,
  emitCommitRecorded,
  emitSessionStarted,
  emitSessionEnded,
  emitAnalyticsEvents,
  getSubscriberCount,
  clearSubscribers,
} from '@/lib/analytics/analyticsEvents'

// ============================================================================
// Setup
// ============================================================================

beforeEach(() => {
  // Clear all subscribers before each test
  clearSubscribers()
})

// ============================================================================
// subscribeToAnalytics
// ============================================================================

describe('subscribeToAnalytics', () => {
  it('adds a subscriber', () => {
    const callback = vi.fn()
    subscribeToAnalytics(callback)
    expect(getSubscriberCount()).toBe(1)
  })

  it('returns an unsubscribe function', () => {
    const callback = vi.fn()
    const unsubscribe = subscribeToAnalytics(callback)
    expect(typeof unsubscribe).toBe('function')
  })

  it('unsubscribe removes the subscriber', () => {
    const callback = vi.fn()
    const unsubscribe = subscribeToAnalytics(callback)
    expect(getSubscriberCount()).toBe(1)
    unsubscribe()
    expect(getSubscriberCount()).toBe(0)
  })

  it('allows multiple subscribers', () => {
    subscribeToAnalytics(vi.fn())
    subscribeToAnalytics(vi.fn())
    subscribeToAnalytics(vi.fn())
    expect(getSubscriberCount()).toBe(3)
  })

  it('same callback can be added only once', () => {
    const callback = vi.fn()
    subscribeToAnalytics(callback)
    subscribeToAnalytics(callback)
    expect(getSubscriberCount()).toBe(1)
  })
})

// ============================================================================
// emitAnalyticsEvent
// ============================================================================

describe('emitAnalyticsEvent', () => {
  it('notifies all subscribers', () => {
    const callback1 = vi.fn()
    const callback2 = vi.fn()
    subscribeToAnalytics(callback1)
    subscribeToAnalytics(callback2)

    emitAnalyticsEvent('strand-created', { path: '/test' })

    expect(callback1).toHaveBeenCalledTimes(1)
    expect(callback2).toHaveBeenCalledTimes(1)
  })

  it('passes event with type', () => {
    const callback = vi.fn()
    subscribeToAnalytics(callback)

    emitAnalyticsEvent('strand-updated', {})

    const event = callback.mock.calls[0][0]
    expect(event.type).toBe('strand-updated')
  })

  it('passes event with payload', () => {
    const callback = vi.fn()
    subscribeToAnalytics(callback)

    emitAnalyticsEvent('tag-added', { tag: 'test-tag' })

    const event = callback.mock.calls[0][0]
    expect(event.payload).toEqual({ tag: 'test-tag' })
  })

  it('passes event with timestamp', () => {
    const callback = vi.fn()
    subscribeToAnalytics(callback)

    emitAnalyticsEvent('strand-deleted', {})

    const event = callback.mock.calls[0][0]
    expect(event.timestamp).toBeDefined()
    expect(typeof event.timestamp).toBe('string')
    // Should be valid ISO date string
    expect(() => new Date(event.timestamp)).not.toThrow()
  })

  it('handles empty payload', () => {
    const callback = vi.fn()
    subscribeToAnalytics(callback)

    emitAnalyticsEvent('session-started')

    const event = callback.mock.calls[0][0]
    expect(event.payload).toEqual({})
  })

  it('catches subscriber errors and continues', () => {
    const errorCallback = vi.fn(() => {
      throw new Error('Subscriber error')
    })
    const successCallback = vi.fn()

    subscribeToAnalytics(errorCallback)
    subscribeToAnalytics(successCallback)

    // Should not throw
    expect(() => emitAnalyticsEvent('strand-created', {})).not.toThrow()
    // Second callback should still be called
    expect(successCallback).toHaveBeenCalled()
  })
})

// ============================================================================
// Convenience Emitters
// ============================================================================

describe('emitStrandCreated', () => {
  it('emits strand-created event with path', () => {
    const callback = vi.fn()
    subscribeToAnalytics(callback)

    emitStrandCreated('/notes/test.md')

    const event = callback.mock.calls[0][0]
    expect(event.type).toBe('strand-created')
    expect(event.payload.path).toBe('/notes/test.md')
  })

  it('includes optional metadata', () => {
    const callback = vi.fn()
    subscribeToAnalytics(callback)

    emitStrandCreated('/notes/test.md', { title: 'Test Note' })

    const event = callback.mock.calls[0][0]
    expect(event.payload.title).toBe('Test Note')
  })
})

describe('emitStrandUpdated', () => {
  it('emits strand-updated event with path', () => {
    const callback = vi.fn()
    subscribeToAnalytics(callback)

    emitStrandUpdated('/notes/test.md')

    const event = callback.mock.calls[0][0]
    expect(event.type).toBe('strand-updated')
    expect(event.payload.path).toBe('/notes/test.md')
  })

  it('includes optional changes', () => {
    const callback = vi.fn()
    subscribeToAnalytics(callback)

    emitStrandUpdated('/notes/test.md', { field: 'content', newValue: 'updated' })

    const event = callback.mock.calls[0][0]
    expect(event.payload.field).toBe('content')
  })
})

describe('emitStrandDeleted', () => {
  it('emits strand-deleted event with path', () => {
    const callback = vi.fn()
    subscribeToAnalytics(callback)

    emitStrandDeleted('/notes/test.md')

    const event = callback.mock.calls[0][0]
    expect(event.type).toBe('strand-deleted')
    expect(event.payload.path).toBe('/notes/test.md')
  })
})

describe('emitTagAdded', () => {
  it('emits tag-added event with tag', () => {
    const callback = vi.fn()
    subscribeToAnalytics(callback)

    emitTagAdded('important')

    const event = callback.mock.calls[0][0]
    expect(event.type).toBe('tag-added')
    expect(event.payload.tag).toBe('important')
  })

  it('includes optional strandPath', () => {
    const callback = vi.fn()
    subscribeToAnalytics(callback)

    emitTagAdded('important', '/notes/test.md')

    const event = callback.mock.calls[0][0]
    expect(event.payload.strandPath).toBe('/notes/test.md')
  })
})

describe('emitTagRemoved', () => {
  it('emits tag-removed event with tag', () => {
    const callback = vi.fn()
    subscribeToAnalytics(callback)

    emitTagRemoved('obsolete')

    const event = callback.mock.calls[0][0]
    expect(event.type).toBe('tag-removed')
    expect(event.payload.tag).toBe('obsolete')
  })

  it('includes optional strandPath', () => {
    const callback = vi.fn()
    subscribeToAnalytics(callback)

    emitTagRemoved('obsolete', '/notes/test.md')

    const event = callback.mock.calls[0][0]
    expect(event.payload.strandPath).toBe('/notes/test.md')
  })
})

describe('emitReadingProgress', () => {
  it('emits reading-progress event with all parameters', () => {
    const callback = vi.fn()
    subscribeToAnalytics(callback)

    emitReadingProgress('/notes/test.md', 75, 30000)

    const event = callback.mock.calls[0][0]
    expect(event.type).toBe('reading-progress')
    expect(event.payload.strandPath).toBe('/notes/test.md')
    expect(event.payload.percentage).toBe(75)
    expect(event.payload.timeSpentMs).toBe(30000)
  })
})

describe('emitActivityLogged', () => {
  it('emits activity-logged event with type and name', () => {
    const callback = vi.fn()
    subscribeToAnalytics(callback)

    emitActivityLogged('click', 'save-button')

    const event = callback.mock.calls[0][0]
    expect(event.type).toBe('activity-logged')
    expect(event.payload.actionType).toBe('click')
    expect(event.payload.actionName).toBe('save-button')
  })

  it('includes optional target', () => {
    const callback = vi.fn()
    subscribeToAnalytics(callback)

    emitActivityLogged('navigation', 'page-view', '/notes')

    const event = callback.mock.calls[0][0]
    expect(event.payload.target).toBe('/notes')
  })
})

describe('emitCommitRecorded', () => {
  it('emits commit-recorded event with sha and message', () => {
    const callback = vi.fn()
    subscribeToAnalytics(callback)

    emitCommitRecorded('abc123', 'Initial commit')

    const event = callback.mock.calls[0][0]
    expect(event.type).toBe('commit-recorded')
    expect(event.payload.sha).toBe('abc123')
    expect(event.payload.message).toBe('Initial commit')
  })

  it('includes optional strandPath', () => {
    const callback = vi.fn()
    subscribeToAnalytics(callback)

    emitCommitRecorded('abc123', 'Update note', '/notes/test.md')

    const event = callback.mock.calls[0][0]
    expect(event.payload.strandPath).toBe('/notes/test.md')
  })
})

describe('emitSessionStarted', () => {
  it('emits session-started event with sessionId', () => {
    const callback = vi.fn()
    subscribeToAnalytics(callback)

    emitSessionStarted('session-123')

    const event = callback.mock.calls[0][0]
    expect(event.type).toBe('session-started')
    expect(event.payload.sessionId).toBe('session-123')
  })
})

describe('emitSessionEnded', () => {
  it('emits session-ended event with sessionId and duration', () => {
    const callback = vi.fn()
    subscribeToAnalytics(callback)

    emitSessionEnded('session-123', 60000)

    const event = callback.mock.calls[0][0]
    expect(event.type).toBe('session-ended')
    expect(event.payload.sessionId).toBe('session-123')
    expect(event.payload.durationMs).toBe(60000)
  })
})

// ============================================================================
// Batch Operations
// ============================================================================

describe('emitAnalyticsEvents', () => {
  it('emits multiple events', () => {
    const callback = vi.fn()
    subscribeToAnalytics(callback)

    emitAnalyticsEvents([
      { type: 'strand-created', payload: { path: '/test1' } },
      { type: 'strand-updated', payload: { path: '/test2' } },
      { type: 'tag-added', payload: { tag: 'test' } },
    ])

    expect(callback).toHaveBeenCalledTimes(3)
  })

  it('preserves event order', () => {
    const events: string[] = []
    subscribeToAnalytics((event) => events.push(event.type))

    emitAnalyticsEvents([
      { type: 'session-started' },
      { type: 'strand-created' },
      { type: 'session-ended' },
    ])

    expect(events).toEqual(['session-started', 'strand-created', 'session-ended'])
  })

  it('handles empty array', () => {
    const callback = vi.fn()
    subscribeToAnalytics(callback)

    emitAnalyticsEvents([])

    expect(callback).not.toHaveBeenCalled()
  })
})

// ============================================================================
// Utilities
// ============================================================================

describe('getSubscriberCount', () => {
  it('returns 0 when no subscribers', () => {
    expect(getSubscriberCount()).toBe(0)
  })

  it('returns correct count', () => {
    subscribeToAnalytics(vi.fn())
    subscribeToAnalytics(vi.fn())
    expect(getSubscriberCount()).toBe(2)
  })

  it('decrements on unsubscribe', () => {
    const unsubscribe = subscribeToAnalytics(vi.fn())
    subscribeToAnalytics(vi.fn())
    expect(getSubscriberCount()).toBe(2)
    unsubscribe()
    expect(getSubscriberCount()).toBe(1)
  })
})

describe('clearSubscribers', () => {
  it('removes all subscribers', () => {
    subscribeToAnalytics(vi.fn())
    subscribeToAnalytics(vi.fn())
    subscribeToAnalytics(vi.fn())
    expect(getSubscriberCount()).toBe(3)

    clearSubscribers()

    expect(getSubscriberCount()).toBe(0)
  })

  it('events are not emitted after clear', () => {
    const callback = vi.fn()
    subscribeToAnalytics(callback)

    clearSubscribers()
    emitAnalyticsEvent('strand-created', {})

    expect(callback).not.toHaveBeenCalled()
  })
})

// ============================================================================
// Integration Tests
// ============================================================================

describe('analytics events integration', () => {
  it('full workflow: subscribe, emit, unsubscribe', () => {
    const events: string[] = []
    const unsubscribe = subscribeToAnalytics((event) => {
      events.push(event.type)
    })

    emitStrandCreated('/test')
    emitTagAdded('important')

    expect(events).toEqual(['strand-created', 'tag-added'])

    unsubscribe()
    emitStrandDeleted('/test')

    // Should not receive event after unsubscribe
    expect(events).toEqual(['strand-created', 'tag-added'])
  })

  it('multiple subscribers receive same events', () => {
    const events1: string[] = []
    const events2: string[] = []

    subscribeToAnalytics((e) => events1.push(e.type))
    subscribeToAnalytics((e) => events2.push(e.type))

    emitSessionStarted('test-session')

    expect(events1).toEqual(['session-started'])
    expect(events2).toEqual(['session-started'])
  })

  it('events have consistent structure', () => {
    const callback = vi.fn()
    subscribeToAnalytics(callback)

    emitStrandCreated('/test', { extra: 'data' })
    emitTagAdded('tag', '/test')
    emitReadingProgress('/test', 50, 1000)

    for (const call of callback.mock.calls) {
      const event = call[0]
      expect(event).toHaveProperty('type')
      expect(event).toHaveProperty('payload')
      expect(event).toHaveProperty('timestamp')
    }
  })
})
