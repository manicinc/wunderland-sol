/**
 * Unit tests for Storage Hooks System
 * 
 * @module @framers/sql-storage-adapter/tests/hooks
 */

import { describe, it, expect, vi } from 'vitest';
import {
  combineHooks,
  filterHooks,
  generateOperationId,
  type StorageHooks,
  type QueryContext,
  type WriteContext,
  type TransactionContext,
} from '../src/core/contracts/hooks';

describe('Storage Hooks', () => {
  describe('generateOperationId', () => {
    it('should generate a valid UUID v4 format', () => {
      const id = generateOperationId();
      
      // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(id).toMatch(uuidRegex);
    });
    
    it('should generate unique IDs', () => {
      const ids = new Set<string>();
      
      for (let i = 0; i < 100; i++) {
        ids.add(generateOperationId());
      }
      
      expect(ids.size).toBe(100);
    });
  });
  
  describe('combineHooks', () => {
    it('should combine multiple onBeforeQuery hooks', async () => {
      const calls: string[] = [];
      
      const hook1: StorageHooks = {
        onBeforeQuery: async (ctx) => {
          calls.push('hook1');
          return ctx;
        },
      };
      
      const hook2: StorageHooks = {
        onBeforeQuery: async (ctx) => {
          calls.push('hook2');
          return ctx;
        },
      };
      
      const combined = combineHooks(hook1, hook2);
      const context: QueryContext = {
        operationId: 'test',
        operation: 'get',
        startTime: Date.now(),
        adapterKind: 'test',
        statement: 'SELECT 1',
      };
      
      await combined.onBeforeQuery!(context);
      
      expect(calls).toEqual(['hook1', 'hook2']);
    });
    
    it('should abort on undefined return from onBeforeQuery', async () => {
      const calls: string[] = [];
      
      const hook1: StorageHooks = {
        onBeforeQuery: async () => {
          calls.push('hook1');
          return undefined; // Abort
        },
      };
      
      const hook2: StorageHooks = {
        onBeforeQuery: async (ctx) => {
          calls.push('hook2');
          return ctx;
        },
      };
      
      const combined = combineHooks(hook1, hook2);
      const context: QueryContext = {
        operationId: 'test',
        operation: 'get',
        startTime: Date.now(),
        adapterKind: 'test',
        statement: 'SELECT 1',
      };
      
      const result = await combined.onBeforeQuery!(context);
      
      expect(calls).toEqual(['hook1']);
      expect(result).toBeUndefined();
    });
    
    it('should pass modified context through chain', async () => {
      const hook1: StorageHooks = {
        onBeforeQuery: async (ctx) => {
          return { ...ctx, statement: ctx.statement + ' -- hook1' };
        },
      };
      
      const hook2: StorageHooks = {
        onBeforeQuery: async (ctx) => {
          return { ...ctx, statement: ctx.statement + ' -- hook2' };
        },
      };
      
      const combined = combineHooks(hook1, hook2);
      const context: QueryContext = {
        operationId: 'test',
        operation: 'get',
        startTime: Date.now(),
        adapterKind: 'test',
        statement: 'SELECT 1',
      };
      
      const result = await combined.onBeforeQuery!(context);
      
      expect(result?.statement).toBe('SELECT 1 -- hook1 -- hook2');
    });
    
    it('should combine onAfterQuery hooks and transform results', async () => {
      const hook1: StorageHooks = {
        onAfterQuery: async (ctx, result) => {
          return { ...result as object, transformed1: true };
        },
      };
      
      const hook2: StorageHooks = {
        onAfterQuery: async (ctx, result) => {
          return { ...result as object, transformed2: true };
        },
      };
      
      const combined = combineHooks(hook1, hook2);
      const context: QueryContext = {
        operationId: 'test',
        operation: 'get',
        startTime: Date.now(),
        adapterKind: 'test',
        statement: 'SELECT 1',
      };
      
      const result = await combined.onAfterQuery!(context, { original: true });
      
      expect(result).toEqual({
        original: true,
        transformed1: true,
        transformed2: true,
      });
    });
    
    it('should combine onBeforeWrite hooks', async () => {
      const calls: string[] = [];
      
      const hook1: StorageHooks = {
        onBeforeWrite: async (ctx) => {
          calls.push('write1');
          return ctx;
        },
      };
      
      const hook2: StorageHooks = {
        onBeforeWrite: async (ctx) => {
          calls.push('write2');
          return ctx;
        },
      };
      
      const combined = combineHooks(hook1, hook2);
      const context: WriteContext = {
        operationId: 'test',
        operation: 'run',
        startTime: Date.now(),
        adapterKind: 'test',
        statement: 'INSERT INTO test VALUES (1)',
      };
      
      await combined.onBeforeWrite!(context);
      
      expect(calls).toEqual(['write1', 'write2']);
    });
    
    it('should combine onAfterWrite hooks', async () => {
      const calls: string[] = [];
      
      const hook1: StorageHooks = {
        onAfterWrite: async () => {
          calls.push('after1');
        },
      };
      
      const hook2: StorageHooks = {
        onAfterWrite: async () => {
          calls.push('after2');
        },
      };
      
      const combined = combineHooks(hook1, hook2);
      const context: WriteContext = {
        operationId: 'test',
        operation: 'run',
        startTime: Date.now(),
        adapterKind: 'test',
        statement: 'INSERT INTO test VALUES (1)',
      };
      
      await combined.onAfterWrite!(context, { changes: 1 });
      
      expect(calls).toEqual(['after1', 'after2']);
    });
    
    it('should combine onError hooks', async () => {
      const hook1: StorageHooks = {
        onError: async (err) => {
          return new Error(`hook1: ${err.message}`);
        },
      };
      
      const hook2: StorageHooks = {
        onError: async (err) => {
          return new Error(`hook2: ${err.message}`);
        },
      };
      
      const combined = combineHooks(hook1, hook2);
      const context: QueryContext = {
        operationId: 'test',
        operation: 'get',
        startTime: Date.now(),
        adapterKind: 'test',
        statement: 'SELECT 1',
      };
      
      const result = await combined.onError!(new Error('original'), context);
      
      expect(result?.message).toBe('hook2: hook1: original');
    });
    
    it('should suppress error when onError returns undefined', async () => {
      const hook1: StorageHooks = {
        onError: async () => {
          return undefined; // Suppress
        },
      };
      
      const hook2: StorageHooks = {
        onError: async (err) => {
          return err; // Would normally transform
        },
      };
      
      const combined = combineHooks(hook1, hook2);
      const context: QueryContext = {
        operationId: 'test',
        operation: 'get',
        startTime: Date.now(),
        adapterKind: 'test',
        statement: 'SELECT 1',
      };
      
      const result = await combined.onError!(new Error('original'), context);
      
      expect(result).toBeUndefined();
    });
    
    it('should combine transaction hooks', async () => {
      const calls: string[] = [];
      
      const hook1: StorageHooks = {
        onBeforeTransaction: async (ctx) => {
          calls.push('before1');
          return ctx;
        },
        onAfterTransaction: async () => {
          calls.push('after1');
        },
      };
      
      const hook2: StorageHooks = {
        onBeforeTransaction: async (ctx) => {
          calls.push('before2');
          return ctx;
        },
        onAfterTransaction: async () => {
          calls.push('after2');
        },
      };
      
      const combined = combineHooks(hook1, hook2);
      const context: TransactionContext = {
        operationId: 'test',
        operation: 'transaction',
        startTime: Date.now(),
        adapterKind: 'test',
      };
      
      await combined.onBeforeTransaction!(context);
      await combined.onAfterTransaction!(context);
      
      expect(calls).toEqual(['before1', 'before2', 'after1', 'after2']);
    });
    
    it('should handle empty hooks array', () => {
      const combined = combineHooks();
      
      expect(combined.onBeforeQuery).toBeDefined();
      expect(combined.onAfterQuery).toBeDefined();
    });
    
    it('should handle hooks with missing methods', async () => {
      const hook1: StorageHooks = {
        onBeforeQuery: async (ctx) => ctx,
      };
      
      const hook2: StorageHooks = {
        // No onBeforeQuery
      };
      
      const combined = combineHooks(hook1, hook2);
      const context: QueryContext = {
        operationId: 'test',
        operation: 'get',
        startTime: Date.now(),
        adapterKind: 'test',
        statement: 'SELECT 1',
      };
      
      const result = await combined.onBeforeQuery!(context);
      
      expect(result).toEqual(context);
    });
  });
  
  describe('filterHooks', () => {
    it('should only run hooks for specified operations', async () => {
      const calls: string[] = [];
      
      const hooks: StorageHooks = {
        onBeforeQuery: async (ctx) => {
          calls.push(`query:${ctx.operation}`);
          return ctx;
        },
        onBeforeWrite: async (ctx) => {
          calls.push(`write:${ctx.operation}`);
          return ctx;
        },
      };
      
      const filtered = filterHooks(['get'], hooks);
      
      // Should run for 'get'
      const getContext: QueryContext = {
        operationId: 'test',
        operation: 'get',
        startTime: Date.now(),
        adapterKind: 'test',
        statement: 'SELECT 1',
      };
      await filtered.onBeforeQuery!(getContext);
      
      // Should not run for 'all'
      const allContext: QueryContext = {
        operationId: 'test',
        operation: 'all',
        startTime: Date.now(),
        adapterKind: 'test',
        statement: 'SELECT * FROM test',
      };
      await filtered.onBeforeQuery!(allContext);
      
      expect(calls).toEqual(['query:get']);
    });
    
    it('should filter write hooks by operation', async () => {
      const calls: string[] = [];
      
      const hooks: StorageHooks = {
        onBeforeWrite: async (ctx) => {
          calls.push(`write:${ctx.operation}`);
          return ctx;
        },
      };
      
      const filtered = filterHooks(['run'], hooks);
      
      const runContext: WriteContext = {
        operationId: 'test',
        operation: 'run',
        startTime: Date.now(),
        adapterKind: 'test',
        statement: 'INSERT INTO test VALUES (1)',
      };
      await filtered.onBeforeWrite!(runContext);
      
      const batchContext: WriteContext = {
        operationId: 'test',
        operation: 'batch',
        startTime: Date.now(),
        adapterKind: 'test',
        statement: 'INSERT INTO test VALUES (2)',
      };
      await filtered.onBeforeWrite!(batchContext);
      
      expect(calls).toEqual(['write:run']);
    });
    
    it('should return undefined for undefined hook methods', () => {
      const hooks: StorageHooks = {};
      const filtered = filterHooks(['get'], hooks);
      
      expect(filtered.onBeforeQuery).toBeUndefined();
      expect(filtered.onAfterQuery).toBeUndefined();
    });
    
    it('should allow multiple operations', async () => {
      const calls: string[] = [];
      
      const hooks: StorageHooks = {
        onBeforeQuery: async (ctx) => {
          calls.push(ctx.operation);
          return ctx;
        },
      };
      
      const filtered = filterHooks(['get', 'all'], hooks);
      
      const getContext: QueryContext = {
        operationId: 'test',
        operation: 'get',
        startTime: Date.now(),
        adapterKind: 'test',
        statement: 'SELECT 1',
      };
      
      const allContext: QueryContext = {
        operationId: 'test',
        operation: 'all',
        startTime: Date.now(),
        adapterKind: 'test',
        statement: 'SELECT *',
      };
      
      const execContext: QueryContext = {
        operationId: 'test',
        operation: 'exec',
        startTime: Date.now(),
        adapterKind: 'test',
        statement: 'CREATE TABLE test (id INT)',
      };
      
      await filtered.onBeforeQuery!(getContext);
      await filtered.onBeforeQuery!(allContext);
      await filtered.onBeforeQuery!(execContext);
      
      expect(calls).toEqual(['get', 'all']);
    });
  });
  
  describe('Hook Context Types', () => {
    it('should allow metadata in QueryContext', () => {
      const context: QueryContext = {
        operationId: 'test',
        operation: 'get',
        startTime: Date.now(),
        adapterKind: 'test',
        statement: 'SELECT 1',
        metadata: {
          isRagQuery: true,
          queryEmbedding: [0.1, 0.2, 0.3],
        },
      };
      
      expect(context.metadata?.isRagQuery).toBe(true);
      expect(context.metadata?.queryEmbedding).toEqual([0.1, 0.2, 0.3]);
    });
    
    it('should allow metadata in WriteContext', () => {
      const context: WriteContext = {
        operationId: 'test',
        operation: 'run',
        startTime: Date.now(),
        adapterKind: 'test',
        statement: 'INSERT INTO docs (content) VALUES (?)',
        parameters: ['Test content'],
        metadata: {
          embedding: [0.1, 0.2, 0.3],
          generateEmbedding: true,
        },
      };
      
      expect(context.metadata?.embedding).toEqual([0.1, 0.2, 0.3]);
      expect(context.metadata?.generateEmbedding).toBe(true);
    });
    
    it('should track transaction outcome', () => {
      const context: TransactionContext = {
        operationId: 'test',
        operation: 'transaction',
        startTime: Date.now(),
        adapterKind: 'test',
        outcome: 'committed',
        operationCount: 5,
      };
      
      expect(context.outcome).toBe('committed');
      expect(context.operationCount).toBe(5);
    });
    
    it('should track affected tables', () => {
      const queryContext: QueryContext = {
        operationId: 'test',
        operation: 'all',
        startTime: Date.now(),
        adapterKind: 'test',
        statement: 'SELECT * FROM users JOIN orders ON users.id = orders.user_id',
        affectedTables: ['users', 'orders'],
      };
      
      expect(queryContext.affectedTables).toEqual(['users', 'orders']);
    });
  });
});



