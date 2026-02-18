import { describe, expect, it } from 'vitest';
import type {
  AdapterEvent,
  AdapterEventType,
  AdapterEventListener,
  AdapterEventEmitter,
  ConnectionOpenedEvent,
  ConnectionClosedEvent,
  ConnectionErrorEvent,
  QueryStartEvent,
  QueryCompleteEvent,
  QueryErrorEvent,
  TransactionStartEvent,
  TransactionCommitEvent,
  TransactionRollbackEvent,
  PerformanceSlowQueryEvent,
  CacheHitEvent,
  CacheMissEvent,
  CacheClearEvent
} from '../src/types/events.js';

describe('Event Types', () => {
  describe('Connection Events', () => {
    it('should create connection opened event', () => {
      const event: ConnectionOpenedEvent = {
        type: 'connection:opened',
        context: {} as any, // Mock context
        timestamp: new Date()
      };

      expect(event.type).toBe('connection:opened');
      expect(event.timestamp).toBeInstanceOf(Date);
    });

    it('should create connection closed event', () => {
      const event: ConnectionClosedEvent = {
        type: 'connection:closed',
        context: {} as any,
        timestamp: new Date()
      };

      expect(event.type).toBe('connection:closed');
    });

    it('should create connection error event', () => {
      const error = new Error('Connection failed');
      const event: ConnectionErrorEvent = {
        type: 'connection:error',
        error,
        context: {} as any,
        timestamp: new Date()
      };

      expect(event.type).toBe('connection:error');
      expect(event.error).toBe(error);
      expect(event.error.message).toBe('Connection failed');
    });
  });

  describe('Query Events', () => {
    it('should create query start event with parameters', () => {
      const event: QueryStartEvent = {
        type: 'query:start',
        statement: 'SELECT * FROM users WHERE id = ?',
        parameters: [123],
        timestamp: new Date(),
        queryId: 'query-1'
      };

      expect(event.type).toBe('query:start');
      expect(event.statement).toContain('SELECT');
      expect(event.parameters).toEqual([123]);
      expect(event.queryId).toBe('query-1');
    });

    it('should create query start event without parameters', () => {
      const event: QueryStartEvent = {
        type: 'query:start',
        statement: 'SELECT COUNT(*) FROM users',
        timestamp: new Date()
      };

      expect(event.type).toBe('query:start');
      expect(event.parameters).toBeUndefined();
      expect(event.queryId).toBeUndefined();
    });

    it('should create query complete event', () => {
      const event: QueryCompleteEvent = {
        type: 'query:complete',
        statement: 'SELECT * FROM users',
        duration: 45,
        rows: 10,
        timestamp: new Date(),
        queryId: 'query-1'
      };

      expect(event.type).toBe('query:complete');
      expect(event.duration).toBe(45);
      expect(event.rows).toBe(10);
    });

    it('should create query error event', () => {
      const error = new Error('Syntax error near FROM');
      const event: QueryErrorEvent = {
        type: 'query:error',
        statement: 'SELECT * FORM users',
        error,
        duration: 2,
        timestamp: new Date(),
        queryId: 'query-2'
      };

      expect(event.type).toBe('query:error');
      expect(event.error).toBe(error);
      expect(event.duration).toBe(2);
    });
  });

  describe('Transaction Events', () => {
    it('should create transaction start event', () => {
      const event: TransactionStartEvent = {
        type: 'transaction:start',
        id: 'txn-123',
        timestamp: new Date()
      };

      expect(event.type).toBe('transaction:start');
      expect(event.id).toBe('txn-123');
    });

    it('should create transaction commit event', () => {
      const event: TransactionCommitEvent = {
        type: 'transaction:commit',
        id: 'txn-123',
        duration: 150,
        timestamp: new Date()
      };

      expect(event.type).toBe('transaction:commit');
      expect(event.duration).toBe(150);
    });

    it('should create transaction rollback event with error', () => {
      const error = new Error('Constraint violation');
      const event: TransactionRollbackEvent = {
        type: 'transaction:rollback',
        id: 'txn-123',
        error,
        timestamp: new Date()
      };

      expect(event.type).toBe('transaction:rollback');
      expect(event.error).toBe(error);
    });

    it('should create transaction rollback event without error', () => {
      const event: TransactionRollbackEvent = {
        type: 'transaction:rollback',
        id: 'txn-123',
        timestamp: new Date()
      };

      expect(event.type).toBe('transaction:rollback');
      expect(event.error).toBeUndefined();
    });
  });

  describe('Performance Events', () => {
    it('should create slow query event', () => {
      const event: PerformanceSlowQueryEvent = {
        type: 'performance:slow-query',
        statement: 'SELECT * FROM large_table WHERE complex_condition',
        duration: 5000,
        threshold: 1000,
        timestamp: new Date()
      };

      expect(event.type).toBe('performance:slow-query');
      expect(event.duration).toBe(5000);
      expect(event.threshold).toBe(1000);
      expect(event.duration).toBeGreaterThan(event.threshold);
    });
  });

  describe('Cache Events', () => {
    it('should create cache hit event', () => {
      const event: CacheHitEvent = {
        type: 'cache:hit',
        key: 'query:SELECT:users:123',
        statement: 'SELECT * FROM users WHERE id = ?',
        timestamp: new Date()
      };

      expect(event.type).toBe('cache:hit');
      expect(event.key).toBe('query:SELECT:users:123');
    });

    it('should create cache miss event', () => {
      const event: CacheMissEvent = {
        type: 'cache:miss',
        key: 'query:SELECT:users:456',
        statement: 'SELECT * FROM users WHERE id = ?',
        timestamp: new Date()
      };

      expect(event.type).toBe('cache:miss');
      expect(event.key).toBe('query:SELECT:users:456');
    });

    it('should create cache clear event', () => {
      const event: CacheClearEvent = {
        type: 'cache:clear',
        entriesCleared: 42,
        timestamp: new Date()
      };

      expect(event.type).toBe('cache:clear');
      expect(event.entriesCleared).toBe(42);
    });
  });

  describe('AdapterEventType Union', () => {
    it('should include all event types', () => {
      const validTypes: AdapterEventType[] = [
        'connection:opened',
        'connection:closed',
        'connection:error',
        'query:start',
        'query:complete',
        'query:error',
        'transaction:start',
        'transaction:commit',
        'transaction:rollback',
        'performance:slow-query',
        'cache:hit',
        'cache:miss',
        'cache:clear'
      ];

      expect(validTypes).toHaveLength(13);
      
      // Type assertion check
      const testType: AdapterEventType = 'query:complete';
      expect(testType).toBe('query:complete');
    });
  });

  describe('AdapterEvent Discriminated Union', () => {
    it('should handle all event types in switch', () => {
      const events: AdapterEvent[] = [
        { type: 'connection:opened', context: {} as any, timestamp: new Date() },
        { type: 'query:start', statement: 'SELECT 1', timestamp: new Date() },
        { type: 'cache:hit', key: 'test', statement: 'SELECT 1', timestamp: new Date() }
      ];

      events.forEach(event => {
        switch (event.type) {
          case 'connection:opened':
            expect(event.context).toBeDefined();
            break;
          case 'query:start':
            expect(event.statement).toBeDefined();
            break;
          case 'cache:hit':
            expect(event.key).toBeDefined();
            break;
          default:
            // Should never reach here with our test data
            break;
        }
      });
    });
  });

  describe('AdapterEventListener Type', () => {
    it('should accept event listener functions', () => {
      const listener: AdapterEventListener<QueryCompleteEvent> = (event) => {
        expect(event.type).toBe('query:complete');
        expect(event.duration).toBeGreaterThanOrEqual(0);
      };

      listener({
        type: 'query:complete',
        statement: 'SELECT 1',
        duration: 10,
        timestamp: new Date()
      });
    });

    it('should accept generic event listener', () => {
      const listener: AdapterEventListener = (event) => {
        expect(event.type).toBeDefined();
        expect(event.timestamp).toBeInstanceOf(Date);
      };

      listener({
        type: 'connection:opened',
        context: {} as any,
        timestamp: new Date()
      });
    });
  });

  describe('AdapterEventEmitter Interface', () => {
    it('should define all required methods', () => {
      // Mock implementation for type checking
      const mockEmitter: AdapterEventEmitter = {
        on: (eventType, listener) => {
          expect(typeof eventType).toBe('string');
          expect(typeof listener).toBe('function');
          return () => {}; // Unsubscribe function
        },
        once: (eventType, listener) => {
          expect(typeof eventType).toBe('string');
          expect(typeof listener).toBe('function');
          return () => {};
        },
        emit: (event) => {
          expect(event.type).toBeDefined();
          expect(event.timestamp).toBeInstanceOf(Date);
        },
        removeAllListeners: () => {},
        removeListeners: (eventType) => {
          expect(typeof eventType).toBe('string');
        },
        listenerCount: (eventType) => {
          expect(typeof eventType).toBe('string');
          return 0;
        }
      };

      // Test on method
      const unsubscribe = mockEmitter.on('query:start', (event) => {
        expect(event.statement).toBeDefined();
      });
      expect(typeof unsubscribe).toBe('function');

      // Test emit method
      mockEmitter.emit({
        type: 'query:complete',
        statement: 'SELECT 1',
        duration: 10,
        timestamp: new Date()
      });

      // Test listenerCount
      expect(mockEmitter.listenerCount('query:error')).toBe(0);
    });
  });
});
