import { describe, expect, it } from 'vitest';
import type {
  AdapterContext,
  AdapterLimitations,
  AdapterStatus,
  ConnectionInfo,
  ConnectionType,
  DatabaseEngine,
  AdapterKind,
  PerformanceCharacteristics,
  ConcurrencyModel,
  PersistenceModel
} from '../src/types/context.js';
import type { StorageAdapter, StorageCapability } from '../src/types.js';

describe('Context Types', () => {
  describe('ConnectionType', () => {
    it('should have valid connection type values', () => {
      const validTypes: ConnectionType[] = ['file', 'memory', 'network'];
      expect(validTypes).toHaveLength(3);
      
      const testType: ConnectionType = 'file';
      expect(testType).toBe('file');
    });
  });

  describe('DatabaseEngine', () => {
    it('should have all supported database engines', () => {
      const validEngines: DatabaseEngine[] = [
        'sqlite',
        'postgres',
        'mysql',
        'sqljs',
        'capacitor',
        'supabase'
      ];
      
      expect(validEngines).toHaveLength(6);
    });
  });

  describe('AdapterKind', () => {
    it('should match resolver adapter kinds', () => {
      const validKinds: AdapterKind[] = [
        'postgres',
        'better-sqlite3',
        'capacitor',
        'sqljs',
        'supabase'
      ];
      
      expect(validKinds).toHaveLength(5);
    });
  });

  describe('ConnectionInfo', () => {
    it('should create valid file-based connection info', () => {
      const info: ConnectionInfo = {
        type: 'file',
        engine: 'sqlite',
        version: '3.45.0',
        filePath: '/path/to/db.sqlite3',
        readOnly: false,
        connectedAt: new Date()
      };

      expect(info.type).toBe('file');
      expect(info.engine).toBe('sqlite');
      expect(info.filePath).toBeDefined();
      expect(info.host).toBeUndefined();
    });

    it('should create valid network connection info', () => {
      const info: ConnectionInfo = {
        type: 'network',
        engine: 'postgres',
        version: '16.2',
        host: 'localhost',
        database: 'myapp',
        readOnly: false,
        connectedAt: new Date()
      };

      expect(info.type).toBe('network');
      expect(info.engine).toBe('postgres');
      expect(info.host).toBe('localhost');
      expect(info.database).toBe('myapp');
      expect(info.filePath).toBeUndefined();
    });

    it('should create valid in-memory connection info', () => {
      const info: ConnectionInfo = {
        type: 'memory',
        engine: 'sqljs',
        readOnly: false
      };

      expect(info.type).toBe('memory');
      expect(info.engine).toBe('sqljs');
      expect(info.filePath).toBeUndefined();
      expect(info.host).toBeUndefined();
    });
  });

  describe('PerformanceCharacteristics', () => {
    it('should define SQLite performance characteristics', () => {
      const perf: PerformanceCharacteristics = {
        concurrency: 'single',
        persistence: 'file',
        transactionIsolation: ['SERIALIZABLE'],
        usesConnectionPool: false,
        asyncExecution: false
      };

      expect(perf.concurrency).toBe('single');
      expect(perf.persistence).toBe('file');
      expect(perf.transactionIsolation).toContain('SERIALIZABLE');
      expect(perf.usesConnectionPool).toBe(false);
    });

    it('should define PostgreSQL performance characteristics', () => {
      const perf: PerformanceCharacteristics = {
        concurrency: 'pooled',
        persistence: 'network',
        transactionIsolation: [
          'READ UNCOMMITTED',
          'READ COMMITTED',
          'REPEATABLE READ',
          'SERIALIZABLE'
        ],
        usesConnectionPool: true,
        asyncExecution: true
      };

      expect(perf.concurrency).toBe('pooled');
      expect(perf.persistence).toBe('network');
      expect(perf.transactionIsolation).toHaveLength(4);
      expect(perf.usesConnectionPool).toBe(true);
      expect(perf.asyncExecution).toBe(true);
    });
  });

  describe('AdapterLimitations', () => {
    it('should define SQLite limitations', () => {
      const limits: AdapterLimitations = {
        maxConnections: 1,
        maxStatementLength: 1000000,
        supportedDataTypes: ['INTEGER', 'REAL', 'TEXT', 'BLOB', 'NULL'],
        unsupportedFeatures: ['streaming', 'concurrent', 'json', 'arrays'],
        performanceCharacteristics: {
          concurrency: 'single',
          persistence: 'file',
          transactionIsolation: ['SERIALIZABLE'],
          usesConnectionPool: false,
          asyncExecution: false
        }
      };

      expect(limits.maxConnections).toBe(1);
      expect(limits.supportedDataTypes).toHaveLength(5);
      expect(limits.unsupportedFeatures).toContain('streaming');
    });

    it('should define PostgreSQL limitations', () => {
      const limits: AdapterLimitations = {
        maxConnections: 100,
        maxStatementLength: 1073741824,
        maxBatchSize: 1000,
        supportedDataTypes: ['INTEGER', 'TEXT', 'JSON', 'JSONB', 'ARRAY', 'UUID'],
        unsupportedFeatures: [],
        performanceCharacteristics: {
          concurrency: 'pooled',
          persistence: 'network',
          transactionIsolation: ['READ COMMITTED', 'SERIALIZABLE'],
          usesConnectionPool: true,
          asyncExecution: true
        },
        constraints: {
          supportsReplication: true,
          supportsPartitioning: true
        }
      };

      expect(limits.maxConnections).toBe(100);
      expect(limits.maxBatchSize).toBe(1000);
      expect(limits.unsupportedFeatures).toHaveLength(0);
      expect(limits.constraints).toBeDefined();
    });
  });

  describe('AdapterStatus', () => {
    it('should create healthy status', () => {
      const status: AdapterStatus = {
        healthy: true,
        connected: true,
        totalQueries: 1523,
        errors: 0,
        uptime: 3600000,
        lastQuery: new Date()
      };

      expect(status.healthy).toBe(true);
      expect(status.connected).toBe(true);
      expect(status.totalQueries).toBeGreaterThan(0);
      expect(status.errors).toBe(0);
    });

    it('should create unhealthy status with error', () => {
      const error = new Error('Connection lost');
      const status: AdapterStatus = {
        healthy: false,
        connected: false,
        totalQueries: 100,
        errors: 5,
        uptime: 300000,
        lastError: error,
        lastQuery: new Date(Date.now() - 60000)
      };

      expect(status.healthy).toBe(false);
      expect(status.connected).toBe(false);
      expect(status.lastError).toBe(error);
      expect(status.errors).toBeGreaterThan(0);
    });
  });

  describe('AdapterContext Interface', () => {
    it('should have all required readonly properties', () => {
      // This test verifies the interface structure at compile-time
      const mockAdapter: Partial<StorageAdapter> = {
        kind: 'better-sqlite3',
        capabilities: new Set<StorageCapability>(['transactions', 'batch'])
      };

      const mockContext: Partial<AdapterContext> = {
        adapter: mockAdapter as StorageAdapter,
        kind: 'better-sqlite3',
        capabilities: new Set(['transactions', 'batch']),
        isOpen: true,
        supportsSync: true,
        supportsTransactions: true,
        supportsBatch: true,
        supportsPrepared: false,
        supportsStreaming: false,
        supportsWAL: true,
        supportsJSON: false,
        supportsArrays: false,
        supportsConcurrent: false,
        supportsPersistence: true,
        connectionInfo: {
          type: 'file',
          engine: 'sqlite',
          readOnly: false
        }
      };

      expect(mockContext.kind).toBe('better-sqlite3');
      expect(mockContext.isOpen).toBe(true);
      expect(mockContext.supportsTransactions).toBe(true);
    });

    it('should have all required methods in interface', () => {
      // Type-checking test for method signatures
      const mockContext: Partial<AdapterContext> = {
        hasCapability: (capability: StorageCapability): boolean => {
          return capability === 'transactions';
        },
        requiresCapability: (capability: StorageCapability): void => {
          if (capability !== 'transactions') {
            throw new Error(`Capability ${capability} not supported`);
          }
        },
        getLimitations: (): AdapterLimitations => ({
          supportedDataTypes: [],
          unsupportedFeatures: [],
          performanceCharacteristics: {
            concurrency: 'single',
            persistence: 'file',
            transactionIsolation: [],
            usesConnectionPool: false,
            asyncExecution: false
          }
        }),
        getStatus: (): AdapterStatus => ({
          healthy: true,
          connected: true,
          totalQueries: 0,
          errors: 0,
          uptime: 0
        })
      };

      expect(typeof mockContext.hasCapability).toBe('function');
      expect(typeof mockContext.requiresCapability).toBe('function');
      expect(typeof mockContext.getLimitations).toBe('function');
      expect(typeof mockContext.getStatus).toBe('function');
    });
  });

  describe('ConcurrencyModel', () => {
    it('should have valid concurrency values', () => {
      const models: ConcurrencyModel[] = ['single', 'pooled', 'unlimited'];
      expect(models).toHaveLength(3);
    });
  });

  describe('PersistenceModel', () => {
    it('should have valid persistence values', () => {
      const models: PersistenceModel[] = ['memory', 'file', 'network'];
      expect(models).toHaveLength(3);
    });
  });
});
