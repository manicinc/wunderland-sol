/**
 * Event system types for adapter lifecycle and query monitoring.
 * 
 * These types enable applications to subscribe to adapter events
 * for logging, monitoring, debugging, and analytics purposes.
 */

import type { StorageParameters } from './index';
import type { AdapterContext } from './context';

/**
 * Event emitted when a connection is opened.
 */
export interface ConnectionOpenedEvent {
  type: 'connection:opened';
  context: AdapterContext;
  timestamp: Date;
}

/**
 * Event emitted when a connection is closed.
 */
export interface ConnectionClosedEvent {
  type: 'connection:closed';
  context: AdapterContext;
  timestamp: Date;
}

/**
 * Event emitted when a connection error occurs.
 */
export interface ConnectionErrorEvent {
  type: 'connection:error';
  error: Error;
  context: AdapterContext;
  timestamp: Date;
}

/**
 * Event emitted when a query starts execution.
 */
export interface QueryStartEvent {
  type: 'query:start';
  statement: string;
  parameters?: StorageParameters;
  timestamp: Date;
  queryId?: string;
}

/**
 * Event emitted when a query completes successfully.
 */
export interface QueryCompleteEvent {
  type: 'query:complete';
  statement: string;
  duration: number;
  rows?: number;
  timestamp: Date;
  queryId?: string;
}

/**
 * Event emitted when a query fails.
 */
export interface QueryErrorEvent {
  type: 'query:error';
  statement: string;
  error: Error;
  duration: number;
  timestamp: Date;
  queryId?: string;
}

/**
 * Event emitted when a transaction starts.
 */
export interface TransactionStartEvent {
  type: 'transaction:start';
  id: string;
  timestamp: Date;
}

/**
 * Event emitted when a transaction commits successfully.
 */
export interface TransactionCommitEvent {
  type: 'transaction:commit';
  id: string;
  duration: number;
  timestamp: Date;
}

/**
 * Event emitted when a transaction is rolled back.
 */
export interface TransactionRollbackEvent {
  type: 'transaction:rollback';
  id: string;
  error?: Error;
  timestamp: Date;
}

/**
 * Event emitted when a slow query is detected.
 */
export interface PerformanceSlowQueryEvent {
  type: 'performance:slow-query';
  statement: string;
  duration: number;
  threshold: number;
  timestamp: Date;
}

/**
 * Event emitted when a cache hit occurs.
 */
export interface CacheHitEvent {
  type: 'cache:hit';
  key: string;
  statement: string;
  timestamp: Date;
}

/**
 * Event emitted when a cache miss occurs.
 */
export interface CacheMissEvent {
  type: 'cache:miss';
  key: string;
  statement: string;
  timestamp: Date;
}

/**
 * Event emitted when the cache is cleared.
 */
export interface CacheClearEvent {
  type: 'cache:clear';
  entriesCleared: number;
  timestamp: Date;
}

/**
 * Union of all possible adapter events.
 */
export type AdapterEvent =
  | ConnectionOpenedEvent
  | ConnectionClosedEvent
  | ConnectionErrorEvent
  | QueryStartEvent
  | QueryCompleteEvent
  | QueryErrorEvent
  | TransactionStartEvent
  | TransactionCommitEvent
  | TransactionRollbackEvent
  | PerformanceSlowQueryEvent
  | CacheHitEvent
  | CacheMissEvent
  | CacheClearEvent;

/**
 * Extract event type from AdapterEvent discriminated union.
 */
export type AdapterEventType = AdapterEvent['type'];

/**
 * Listener function for adapter events.
 */
export type AdapterEventListener<T extends AdapterEvent = AdapterEvent> = (event: T) => void;

/**
 * Unsubscribe function returned by event listeners.
 */
export type UnsubscribeFn = () => void;

/**
 * Event emitter interface for storage adapters.
 * 
 * Provides a simple pub/sub mechanism for monitoring adapter
 * lifecycle and query execution.
 * 
 * @example
 * ```typescript
 * // Subscribe to all query errors
 * const unsubscribe = events.on('query:error', (event) => {
 *   console.error('Query failed:', event.statement, event.error);
 * });
 * 
 * // Later, unsubscribe
 * unsubscribe();
 * 
 * // Subscribe to slow queries
 * events.on('performance:slow-query', (event) => {
 *   if (event.duration > 5000) {
 *     analytics.track('very_slow_query', {
 *       statement: event.statement,
 *       duration: event.duration
 *     });
 *   }
 * });
 * ```
 */
export interface AdapterEventEmitter {
  /**
   * Subscribe to an event type.
   * 
   * @param eventType - The type of event to listen for
   * @param listener - Callback function to invoke when event occurs
   * @returns Unsubscribe function
   */
  on<T extends AdapterEventType>(
    eventType: T,
    listener: AdapterEventListener<Extract<AdapterEvent, { type: T }>>
  ): UnsubscribeFn;
  
  /**
   * Subscribe to an event type once (auto-unsubscribes after first call).
   * 
   * @param eventType - The type of event to listen for
   * @param listener - Callback function to invoke when event occurs
   * @returns Unsubscribe function
   */
  once<T extends AdapterEventType>(
    eventType: T,
    listener: AdapterEventListener<Extract<AdapterEvent, { type: T }>>
  ): UnsubscribeFn;
  
  /**
   * Emit an event to all subscribers.
   * 
   * @param event - The event to emit
   */
  emit(event: AdapterEvent): void;
  
  /**
   * Remove all event listeners.
   */
  removeAllListeners(): void;
  
  /**
   * Remove all listeners for a specific event type.
   * 
   * @param eventType - The event type to clear listeners for
   */
  removeListeners(eventType: AdapterEventType): void;
  
  /**
   * Get the number of listeners for an event type.
   * 
   * @param eventType - The event type to count listeners for
   * @returns Number of active listeners
   */
  listenerCount(eventType: AdapterEventType): number;
}

/**
 * Helper type for creating type-safe event emitter implementations.
 */
export interface EventEmitterOptions {
  /** Maximum number of listeners before warning (default: 10) */
  maxListeners?: number;
  
  /** Whether to log warnings for too many listeners */
  warnOnMaxListeners?: boolean;
}

