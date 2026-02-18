/**
 * Analytics Events System
 * @module lib/analytics/analyticsEvents
 *
 * Pub/sub event system for real-time analytics updates.
 * Components can subscribe to receive updates when analytics data changes.
 */

import type { AnalyticsEventType, AnalyticsEvent } from './types'

// ============================================================================
// SUBSCRIBER MANAGEMENT
// ============================================================================

type AnalyticsCallback = (event: AnalyticsEvent) => void

const subscribers = new Set<AnalyticsCallback>()

/**
 * Subscribe to analytics events
 * @returns Unsubscribe function
 */
export function subscribeToAnalytics(callback: AnalyticsCallback): () => void {
  subscribers.add(callback)
  return () => {
    subscribers.delete(callback)
  }
}

/**
 * Emit an analytics event to all subscribers
 */
export function emitAnalyticsEvent(
  type: AnalyticsEventType,
  payload: Record<string, unknown> = {}
): void {
  const event: AnalyticsEvent = {
    type,
    payload,
    timestamp: new Date().toISOString(),
  }

  // Log in development
  if (process.env.NODE_ENV === 'development') {
    console.log('[Analytics Event]', type, payload)
  }

  // Notify all subscribers
  subscribers.forEach((callback) => {
    try {
      callback(event)
    } catch (error) {
      console.error('[Analytics] Subscriber error:', error)
    }
  })
}

// ============================================================================
// CONVENIENCE EMITTERS
// ============================================================================

/**
 * Emit strand created event
 */
export function emitStrandCreated(path: string, metadata?: Record<string, unknown>): void {
  emitAnalyticsEvent('strand-created', { path, ...metadata })
}

/**
 * Emit strand updated event
 */
export function emitStrandUpdated(path: string, changes?: Record<string, unknown>): void {
  emitAnalyticsEvent('strand-updated', { path, ...changes })
}

/**
 * Emit strand deleted event
 */
export function emitStrandDeleted(path: string): void {
  emitAnalyticsEvent('strand-deleted', { path })
}

/**
 * Emit tag added event
 */
export function emitTagAdded(tag: string, strandPath?: string): void {
  emitAnalyticsEvent('tag-added', { tag, strandPath })
}

/**
 * Emit tag removed event
 */
export function emitTagRemoved(tag: string, strandPath?: string): void {
  emitAnalyticsEvent('tag-removed', { tag, strandPath })
}

/**
 * Emit reading progress event
 */
export function emitReadingProgress(
  strandPath: string,
  percentage: number,
  timeSpentMs: number
): void {
  emitAnalyticsEvent('reading-progress', { strandPath, percentage, timeSpentMs })
}

/**
 * Emit activity logged event
 */
export function emitActivityLogged(
  actionType: string,
  actionName: string,
  target?: string
): void {
  emitAnalyticsEvent('activity-logged', { actionType, actionName, target })
}

/**
 * Emit commit recorded event
 */
export function emitCommitRecorded(sha: string, message: string, strandPath?: string): void {
  emitAnalyticsEvent('commit-recorded', { sha, message, strandPath })
}

/**
 * Emit session started event
 */
export function emitSessionStarted(sessionId: string): void {
  emitAnalyticsEvent('session-started', { sessionId })
}

/**
 * Emit session ended event
 */
export function emitSessionEnded(sessionId: string, durationMs: number): void {
  emitAnalyticsEvent('session-ended', { sessionId, durationMs })
}

// ============================================================================
// BATCH OPERATIONS
// ============================================================================

/**
 * Emit multiple events in batch
 */
export function emitAnalyticsEvents(
  events: Array<{ type: AnalyticsEventType; payload?: Record<string, unknown> }>
): void {
  for (const { type, payload } of events) {
    emitAnalyticsEvent(type, payload || {})
  }
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Get current subscriber count (for debugging)
 */
export function getSubscriberCount(): number {
  return subscribers.size
}

/**
 * Clear all subscribers (for testing)
 */
export function clearSubscribers(): void {
  subscribers.clear()
}
