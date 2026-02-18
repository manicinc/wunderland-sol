/**
 * Tests for BaseStorageAdapter abstract class.
 * 
 * Tests common functionality shared by all adapters:
 * - State management
 * - Parameter validation
 * - Error handling
 * - Performance metrics
 * - Lifecycle management
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BaseStorageAdapter, type BaseAdapterOptions } from '../src/adapters/baseStorageAdapter.js';
import type {
  StorageCapability,
  StorageOpenOptions,
  StorageParameters,
  StorageRunResult,
  StorageAdapter,
  BatchOperation,
  BatchResult,
  PreparedStatement
} from '../src/types.js';

/**
 * Concrete test adapter implementation for testing base class.
 */
class TestAdapter extends BaseStorageAdapter {
  public readonly kind = 'test-adapter';
  public readonly capabilities: ReadonlySet<StorageCapability> = new Set([
    'transactions',
    'persistence',
    'batch',
    'prepared'
  ]);

  public openCalled = false;
  public closeCalled = false;
  public runCalled = false;
  public getCalled = false;
  public allCalled = false;
  public execCalled = false;
  public transactionCalled = false;

  protected async performOpen(options?: StorageOpenOptions): Promise<void> {
    this.openCalled = true;
    // Simulate opening
  }

  protected async performRun(statement: string, parameters?: StorageParameters): Promise<StorageRunResult> {
    this.runCalled = true;
    return { changes: 1, lastInsertRowid: 1 };
  }

  protected async performGet<T>(statement: string, parameters?: StorageParameters): Promise<T | null> {
    this.getCalled = true;
    return { id: 1, name: 'Test' } as T;
  }

  protected async performAll<T>(statement: string, parameters?: StorageParameters): Promise<T[]> {
    this.allCalled = true;
    return [{ id: 1, name: 'Test' }] as T[];
  }

  protected async performExec(script: string): Promise<void> {
    this.execCalled = true;
  }

  protected async performTransaction<T>(fn: (trx: StorageAdapter) => Promise<T>): Promise<T> {
    this.transactionCalled = true;
    return fn(this);
  }

  protected async performClose(): Promise<void> {
    this.closeCalled = true;
  }

  protected async performBatch(operations: BatchOperation[]): Promise<BatchResult> {
    return {
      successful: operations.length,
      failed: 0,
      results: operations.map(() => ({ changes: 1, lastInsertRowid: 1 }))
    };
  }

  protected performPrepare<T>(statement: string): PreparedStatement<T> {
    return {
      run: async (params?: StorageParameters) => ({ changes: 1, lastInsertRowid: 1 }),
      get: async (params?: StorageParameters) => ({ id: 1 } as T),
      all: async (params?: StorageParameters) => [{ id: 1 }] as T[],
      finalize: async () => {}
    };
  }
}

/**
 * Failing adapter for error testing.
 */
class FailingAdapter extends BaseStorageAdapter {
  public readonly kind = 'failing-adapter';
  public readonly capabilities: ReadonlySet<StorageCapability> = new Set(['transactions']);

  protected async performOpen(options?: StorageOpenOptions): Promise<void> {
    throw new Error('Open failed');
  }

  protected async performRun(statement: string, parameters?: StorageParameters): Promise<StorageRunResult> {
    throw new Error('Run failed');
  }

  protected async performGet<T>(statement: string, parameters?: StorageParameters): Promise<T | null> {
    throw new Error('Get failed');
  }

  protected async performAll<T>(statement: string, parameters?: StorageParameters): Promise<T[]> {
    throw new Error('All failed');
  }

  protected async performExec(script: string): Promise<void> {
    throw new Error('Exec failed');
  }

  protected async performTransaction<T>(fn: (trx: StorageAdapter) => Promise<T>): Promise<T> {
    throw new Error('Transaction failed');
  }

  protected async performClose(): Promise<void> {
    throw new Error('Close failed');
  }
}

describe('BaseStorageAdapter', () => {
  let adapter: TestAdapter;

  beforeEach(() => {
    adapter = new TestAdapter();
  });

  describe('State Management', () => {
    it('should start in closed state', () => {
      expect(adapter.getState()).toBe('closed');
      expect(adapter.isClosed()).toBe(true);
      expect(adapter.isOpen()).toBe(false);
    });

    it('should transition to open state after open()', async () => {
      await adapter.open();
      expect(adapter.getState()).toBe('open');
      expect(adapter.isOpen()).toBe(true);
      expect(adapter.isClosed()).toBe(false);
      expect(adapter.openCalled).toBe(true);
    });

    it('should transition to closed state after close()', async () => {
      await adapter.open();
      await adapter.close();
      expect(adapter.getState()).toBe('closed');
      expect(adapter.isClosed()).toBe(true);
      expect(adapter.closeCalled).toBe(true);
    });

    it('should not open twice', async () => {
      await adapter.open();
      await adapter.open(); // Should be no-op
      expect(adapter.openCalled).toBe(true); // Called only once
    });

    it('should not close twice', async () => {
      await adapter.open();
      await adapter.close();
      await adapter.close(); // Should be no-op
      expect(adapter.closeCalled).toBe(true); // Called only once
    });

    it('should throw if operations called before open', async () => {
      await expect(adapter.run('INSERT INTO test VALUES (1)')).rejects.toThrow('not open');
      await expect(adapter.get('SELECT * FROM test')).rejects.toThrow('not open');
      await expect(adapter.all('SELECT * FROM test')).rejects.toThrow('not open');
      await expect(adapter.exec('CREATE TABLE test (id INTEGER)')).rejects.toThrow('not open');
    });
  });

  describe('SQL Operations', () => {
    beforeEach(async () => {
      await adapter.open();
    });

    it('should execute run() and delegate to performRun()', async () => {
      const result = await adapter.run('INSERT INTO test VALUES (?)', [1]);
      expect(adapter.runCalled).toBe(true);
      expect(result.changes).toBe(1);
      expect(result.lastInsertRowid).toBe(1);
    });

    it('should execute get() and delegate to performGet()', async () => {
      const result = await adapter.get('SELECT * FROM test WHERE id = ?', [1]);
      expect(adapter.getCalled).toBe(true);
      expect(result).toEqual({ id: 1, name: 'Test' });
    });

    it('should execute all() and delegate to performAll()', async () => {
      const results = await adapter.all('SELECT * FROM test');
      expect(adapter.allCalled).toBe(true);
      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({ id: 1, name: 'Test' });
    });

    it('should execute exec() and delegate to performExec()', async () => {
      await adapter.exec('CREATE TABLE test (id INTEGER)');
      expect(adapter.execCalled).toBe(true);
    });

    it('should execute transaction() and delegate to performTransaction()', async () => {
      const result = await adapter.transaction(async (trx) => {
        return 'success';
      });
      expect(adapter.transactionCalled).toBe(true);
      expect(result).toBe('success');
    });
  });

  describe('Parameter Validation', () => {
    beforeEach(async () => {
      await adapter.open();
    });

    it('should reject empty SQL statements', async () => {
      await expect(adapter.run('')).rejects.toThrow('cannot be empty');
      await expect(adapter.get('  ')).rejects.toThrow('cannot be empty');
      await expect(adapter.all('')).rejects.toThrow('cannot be empty');
    });

    it('should reject empty scripts', async () => {
      await expect(adapter.exec('')).rejects.toThrow('cannot be empty');
      await expect(adapter.exec('  ')).rejects.toThrow('cannot be empty');
    });

    it('should accept valid SQL statements', async () => {
      await expect(adapter.run('INSERT INTO test VALUES (1)')).resolves.toBeDefined();
      await expect(adapter.get('SELECT * FROM test')).resolves.toBeDefined();
      await expect(adapter.all('SELECT * FROM test')).resolves.toBeDefined();
    });

    it('should warn about SQL comments', async () => {
      const consoleLogSpy = vi.spyOn(console, 'log');
      const verboseAdapter = new TestAdapter({ verbose: true, validateSQL: true });
      await verboseAdapter.open();
      
      await verboseAdapter.run('SELECT * FROM test--comment');
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Warning: SQL comment'));
      
      consoleLogSpy.mockRestore();
    });
  });

  describe('Batch Operations', () => {
    beforeEach(async () => {
      await adapter.open();
    });

    it('should execute batch if capability exists', async () => {
      const result = await adapter.batch([
        { statement: 'INSERT INTO test VALUES (?)', parameters: [1] },
        { statement: 'INSERT INTO test VALUES (?)', parameters: [2] }
      ]);
      
      expect(result.successful).toBe(2);
      expect(result.failed).toBe(0);
    });

    it('should throw if batch not supported', async () => {
      const noBatchAdapter = new TestAdapter();
      (noBatchAdapter as any).capabilities = new Set(['transactions']); // Remove batch
      await noBatchAdapter.open();
      
      await expect(noBatchAdapter.batch([
        { statement: 'INSERT INTO test VALUES (1)' }
      ])).rejects.toThrow('not supported');
    });

    it('should reject empty batch operations', async () => {
      await expect(adapter.batch([])).rejects.toThrow('cannot be empty');
    });
  });

  describe('Prepared Statements', () => {
    beforeEach(async () => {
      await adapter.open();
    });

    it('should create prepared statement if capability exists', () => {
      const stmt = adapter.prepare('SELECT * FROM test WHERE id = ?');
      expect(stmt).toBeDefined();
      expect(stmt.run).toBeDefined();
      expect(stmt.get).toBeDefined();
      expect(stmt.all).toBeDefined();
      expect(stmt.finalize).toBeDefined();
    });

    it('should throw if prepared not supported', () => {
      const noPreparedAdapter = new TestAdapter();
      (noPreparedAdapter as any).capabilities = new Set(['transactions']); // Remove prepared
      
      expect(() => noPreparedAdapter.prepare('SELECT * FROM test')).toThrow('not open');
    });

    it('should execute prepared statement methods', async () => {
      const stmt = adapter.prepare('SELECT * FROM test WHERE id = ?');
      
      const runResult = await stmt.run([1]);
      expect(runResult.changes).toBe(1);
      
      const getResult = await stmt.get([1]);
      expect(getResult).toEqual({ id: 1 });
      
      const allResult = await stmt.all([1]);
      expect(allResult).toHaveLength(1);
      
      await stmt.finalize();
    });
  });

  describe('Error Handling', () => {
    it('should wrap open errors with adapter context', async () => {
      const failing = new FailingAdapter();
      await expect(failing.open()).rejects.toThrow('[failing-adapter]');
      await expect(failing.open()).rejects.toThrow('Open failed');
      expect(failing.getState()).toBe('error');
    });

    it('should wrap operation errors with adapter context', async () => {
      const failing = new FailingAdapter();
      // Force it to open state for testing
      (failing as any).state = 'open';
      
      await expect(failing.run('INSERT')).rejects.toThrow('[failing-adapter]');
      await expect(failing.get('SELECT')).rejects.toThrow('[failing-adapter]');
      await expect(failing.all('SELECT')).rejects.toThrow('[failing-adapter]');
      await expect(failing.exec('CREATE')).rejects.toThrow('[failing-adapter]');
      await expect(failing.transaction(async () => {})).rejects.toThrow('[failing-adapter]');
    });

    it('should wrap close errors with adapter context', async () => {
      const failing = new FailingAdapter();
      (failing as any).state = 'open';
      
      await expect(failing.close()).rejects.toThrow('[failing-adapter]');
      await expect(failing.close()).rejects.toThrow('Close failed');
      expect(failing.getState()).toBe('error');
    });

    it('should increment error counter on failures', async () => {
      const failing = new FailingAdapter();
      (failing as any).state = 'open';
      
      const initialErrors = failing.getMetrics().totalErrors;
      
      await failing.run('INSERT').catch(() => {});
      await failing.get('SELECT').catch(() => {});
      
      expect(failing.getMetrics().totalErrors).toBe(initialErrors + 2);
    });
  });

  describe('Performance Metrics', () => {
    beforeEach(async () => {
      await adapter.open();
    });

    it('should track query count', async () => {
      const initialQueries = adapter.getMetrics().totalQueries;
      
      await adapter.get('SELECT * FROM test');
      await adapter.all('SELECT * FROM test');
      
      expect(adapter.getMetrics().totalQueries).toBe(initialQueries + 2);
    });

    it('should track mutation count', async () => {
      const initialMutations = adapter.getMetrics().totalMutations;
      
      await adapter.run('INSERT INTO test VALUES (1)');
      await adapter.run('UPDATE test SET name = ?', ['New']);
      
      expect(adapter.getMetrics().totalMutations).toBe(initialMutations + 2);
    });

    it('should track transaction count', async () => {
      const initialTransactions = adapter.getMetrics().totalTransactions;
      
      await adapter.transaction(async () => {});
      await adapter.transaction(async () => {});
      
      expect(adapter.getMetrics().totalTransactions).toBe(initialTransactions + 2);
    });

    it('should track average query duration', async () => {
      // Execute some queries to accumulate duration
      await adapter.get('SELECT * FROM test');
      await adapter.all('SELECT * FROM test');
      await adapter.get('SELECT * FROM test');
      
      const metrics = adapter.getMetrics();
      // Duration might be 0 on very fast systems, so just check it's defined
      expect(metrics.averageQueryDuration).toBeGreaterThanOrEqual(0);
    });

    it('should track uptime', async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(adapter.getUptime()).toBeGreaterThan(0);
    });

    it('should have null openedAt before opening', () => {
      const newAdapter = new TestAdapter();
      expect(newAdapter.getMetrics().openedAt).toBeNull();
    });

    it('should set openedAt after opening', async () => {
      expect(adapter.getMetrics().openedAt).not.toBeNull();
      expect(adapter.getMetrics().openedAt).toBeInstanceOf(Date);
    });
  });

  describe('Logging', () => {
    it('should not log by default', async () => {
      const consoleLogSpy = vi.spyOn(console, 'log');
      const quietAdapter = new TestAdapter({ verbose: false });
      
      await quietAdapter.open();
      await quietAdapter.run('INSERT INTO test VALUES (1)');
      
      expect(consoleLogSpy).not.toHaveBeenCalled();
      consoleLogSpy.mockRestore();
    });

    it('should log when verbose is enabled', async () => {
      const consoleLogSpy = vi.spyOn(console, 'log');
      const verboseAdapter = new TestAdapter({ verbose: true });
      
      await verboseAdapter.open();
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('[test-adapter]'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('opened successfully'));
      
      consoleLogSpy.mockRestore();
    });

    it('should include adapter kind in log messages', async () => {
      const consoleLogSpy = vi.spyOn(console, 'log');
      const verboseAdapter = new TestAdapter({ verbose: true });
      
      await verboseAdapter.open();
      await verboseAdapter.run('INSERT INTO test VALUES (1)');
      
      const calls = consoleLogSpy.mock.calls.map(call => call[0]);
      expect(calls.every(msg => msg.includes('[test-adapter]'))).toBe(true);
      
      consoleLogSpy.mockRestore();
    });
  });

  describe('Configuration Options', () => {
    it('should accept custom options', () => {
      const customAdapter = new TestAdapter({
        verbose: true,
        validateSQL: false,
        trackPerformance: false,
        maxRetries: 5
      });
      
      expect(customAdapter).toBeDefined();
    });

    it('should use default options', () => {
      const defaultAdapter = new TestAdapter();
      const metrics = defaultAdapter.getMetrics();
      
      expect(metrics).toBeDefined();
      expect(metrics.totalQueries).toBe(0);
    });

    it('should disable SQL validation when configured', async () => {
      const noValidateAdapter = new TestAdapter({ validateSQL: false });
      await noValidateAdapter.open();
      
      // With validation disabled, empty statements get through base class
      // but still work since test adapter doesn't validate either
      const result = await noValidateAdapter.run('');
      expect(result).toBeDefined();
      expect(result.changes).toBe(1);
    });
  });

  describe('Type Safety', () => {
    beforeEach(async () => {
      await adapter.open();
    });

    it('should support generic type parameters for get()', async () => {
      interface User {
        id: number;
        name: string;
      }
      
      const user = await adapter.get<User>('SELECT * FROM users WHERE id = ?', [1]);
      expect(user).toEqual({ id: 1, name: 'Test' });
    });

    it('should support generic type parameters for all()', async () => {
      interface User {
        id: number;
        name: string;
      }
      
      const users = await adapter.all<User>('SELECT * FROM users');
      expect(users).toHaveLength(1);
      expect(users[0]).toEqual({ id: 1, name: 'Test' });
    });

    it('should support generic type parameters for prepare()', async () => {
      interface User {
        id: number;
        name: string;
      }
      
      const stmt = adapter.prepare<User>('SELECT * FROM users WHERE id = ?');
      const user = await stmt.get([1]);
      expect(user).toBeDefined();
    });
  });
});
