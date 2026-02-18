import { describe, expect, it } from 'vitest';
import {
  BETTER_SQLITE3_LIMITATIONS,
  SQLJS_LIMITATIONS,
  CAPACITOR_SQLITE_LIMITATIONS,
  POSTGRES_LIMITATIONS,
  SUPABASE_LIMITATIONS,
  ADAPTER_LIMITATIONS_MAP,
  getLimitationsForAdapter
} from '../src/core/contracts/limitations.js';

describe('Adapter Limitations', () => {
  describe('BETTER_SQLITE3_LIMITATIONS', () => {
    it('should define SQLite characteristics correctly', () => {
      expect(BETTER_SQLITE3_LIMITATIONS.maxConnections).toBe(1);
      expect(BETTER_SQLITE3_LIMITATIONS.performanceCharacteristics.concurrency).toBe('single');
      expect(BETTER_SQLITE3_LIMITATIONS.performanceCharacteristics.persistence).toBe('file');
      expect(BETTER_SQLITE3_LIMITATIONS.performanceCharacteristics.usesConnectionPool).toBe(false);
    });

    it('should list supported data types', () => {
      const types = BETTER_SQLITE3_LIMITATIONS.supportedDataTypes;
      expect(types).toContain('INTEGER');
      expect(types).toContain('REAL');
      expect(types).toContain('TEXT');
      expect(types).toContain('BLOB');
      expect(types).toContain('NULL');
      expect(types).toHaveLength(5);
    });

    it('should list unsupported features', () => {
      const unsupported = BETTER_SQLITE3_LIMITATIONS.unsupportedFeatures;
      expect(unsupported).toContain('streaming');
      expect(unsupported).toContain('concurrent');
      expect(unsupported).toContain('json');
      expect(unsupported).toContain('arrays');
    });

    it('should have SQLite-specific constraints', () => {
      const constraints = BETTER_SQLITE3_LIMITATIONS.constraints;
      expect(constraints?.supportsWAL).toBe(true);
      expect(constraints?.supportsInMemory).toBe(true);
      expect(constraints?.requiresFilePath).toBe(false);
    });

    it('should support only SERIALIZABLE isolation', () => {
      const isolation = BETTER_SQLITE3_LIMITATIONS.performanceCharacteristics.transactionIsolation;
      expect(isolation).toEqual(['SERIALIZABLE']);
    });
  });

  describe('SQLJS_LIMITATIONS', () => {
    it('should define SQL.js characteristics correctly', () => {
      expect(SQLJS_LIMITATIONS.maxConnections).toBe(1);
      expect(SQLJS_LIMITATIONS.performanceCharacteristics.concurrency).toBe('single');
      expect(SQLJS_LIMITATIONS.performanceCharacteristics.persistence).toBe('memory');
      expect(SQLJS_LIMITATIONS.performanceCharacteristics.asyncExecution).toBe(true);
    });

    it('should include WAL in unsupported features', () => {
      const unsupported = SQLJS_LIMITATIONS.unsupportedFeatures;
      expect(unsupported).toContain('wal');
      expect(unsupported).toContain('locks');
      expect(unsupported).toContain('streaming');
    });

    it('should have WebAssembly constraints', () => {
      const constraints = SQLJS_LIMITATIONS.constraints;
      expect(constraints?.requiresWASM).toBe(true);
      expect(constraints?.browserCompatible).toBe(true);
      expect(constraints?.supportsWAL).toBe(false);
    });

    it('should support same data types as SQLite', () => {
      expect(SQLJS_LIMITATIONS.supportedDataTypes).toEqual(
        BETTER_SQLITE3_LIMITATIONS.supportedDataTypes
      );
    });
  });

  describe('CAPACITOR_SQLITE_LIMITATIONS', () => {
    it('should define mobile SQLite characteristics', () => {
      expect(CAPACITOR_SQLITE_LIMITATIONS.maxConnections).toBe(1);
      expect(CAPACITOR_SQLITE_LIMITATIONS.performanceCharacteristics.concurrency).toBe('single');
      expect(CAPACITOR_SQLITE_LIMITATIONS.performanceCharacteristics.persistence).toBe('file');
      expect(CAPACITOR_SQLITE_LIMITATIONS.performanceCharacteristics.asyncExecution).toBe(true);
    });

    it('should have mobile-specific constraints', () => {
      const constraints = CAPACITOR_SQLITE_LIMITATIONS.constraints;
      expect(constraints?.requiresCapacitor).toBe(true);
      expect(constraints?.mobileOnly).toBe(true);
      expect(constraints?.supportsInMemory).toBe(false);
      expect(constraints?.requiresFilePath).toBe(true);
    });

    it('should support WAL on mobile', () => {
      expect(CAPACITOR_SQLITE_LIMITATIONS.constraints?.supportsWAL).toBe(true);
    });
  });

  describe('POSTGRES_LIMITATIONS', () => {
    it('should define PostgreSQL characteristics correctly', () => {
      expect(POSTGRES_LIMITATIONS.maxConnections).toBe(100);
      expect(POSTGRES_LIMITATIONS.maxBatchSize).toBe(1000);
      expect(POSTGRES_LIMITATIONS.performanceCharacteristics.concurrency).toBe('pooled');
      expect(POSTGRES_LIMITATIONS.performanceCharacteristics.persistence).toBe('network');
      expect(POSTGRES_LIMITATIONS.performanceCharacteristics.usesConnectionPool).toBe(true);
      expect(POSTGRES_LIMITATIONS.performanceCharacteristics.asyncExecution).toBe(true);
    });

    it('should support rich data types', () => {
      const types = POSTGRES_LIMITATIONS.supportedDataTypes;
      expect(types).toContain('JSON');
      expect(types).toContain('JSONB');
      expect(types).toContain('UUID');
      expect(types).toContain('ARRAY');
      expect(types).toContain('BYTEA');
      expect(types.length).toBeGreaterThan(10);
    });

    it('should support all standard transaction isolation levels', () => {
      const isolation = POSTGRES_LIMITATIONS.performanceCharacteristics.transactionIsolation;
      expect(isolation).toContain('READ UNCOMMITTED');
      expect(isolation).toContain('READ COMMITTED');
      expect(isolation).toContain('REPEATABLE READ');
      expect(isolation).toContain('SERIALIZABLE');
      expect(isolation).toHaveLength(4);
    });

    it('should have no unsupported features', () => {
      expect(POSTGRES_LIMITATIONS.unsupportedFeatures).toEqual(['wal']);
    });

    it('should have advanced database constraints', () => {
      const constraints = POSTGRES_LIMITATIONS.constraints;
      expect(constraints?.requiresNetwork).toBe(true);
      expect(constraints?.supportsReplication).toBe(true);
      expect(constraints?.supportsPartitioning).toBe(true);
    });
  });

  describe('SUPABASE_LIMITATIONS', () => {
    it('should extend PostgreSQL limitations', () => {
      expect(SUPABASE_LIMITATIONS.maxBatchSize).toBe(1000);
      expect(SUPABASE_LIMITATIONS.performanceCharacteristics.concurrency).toBe('pooled');
      expect(SUPABASE_LIMITATIONS.performanceCharacteristics.persistence).toBe('network');
    });

    it('should have lower max connections (free tier)', () => {
      expect(SUPABASE_LIMITATIONS.maxConnections).toBe(15);
      expect(SUPABASE_LIMITATIONS.maxConnections).toBeLessThan(POSTGRES_LIMITATIONS.maxConnections!);
    });

    it('should support pgvector extension', () => {
      const types = SUPABASE_LIMITATIONS.supportedDataTypes;
      expect(types).toContain('VECTOR');
      expect(types.length).toBeGreaterThan(POSTGRES_LIMITATIONS.supportedDataTypes.length);
    });

    it('should have Supabase-specific features', () => {
      const constraints = SUPABASE_LIMITATIONS.constraints;
      expect(constraints?.supportsRowLevelSecurity).toBe(true);
      expect(constraints?.supportsRealtimeSubscriptions).toBe(true);
      expect(constraints?.managedService).toBe(true);
    });

    it('should support fewer isolation levels than raw PostgreSQL', () => {
      const isolation = SUPABASE_LIMITATIONS.performanceCharacteristics.transactionIsolation;
      expect(isolation).toContain('READ COMMITTED');
      expect(isolation).toContain('SERIALIZABLE');
      expect(isolation).toHaveLength(3);
    });
  });

  describe('ADAPTER_LIMITATIONS_MAP', () => {
    it('should contain all adapter kinds', () => {
      const keys = Object.keys(ADAPTER_LIMITATIONS_MAP);
      expect(keys).toContain('better-sqlite3');
      expect(keys).toContain('sqljs');
      expect(keys).toContain('capacitor');
      expect(keys).toContain('postgres');
      expect(keys).toContain('supabase');
      expect(keys).toHaveLength(5);
    });

    it('should map to correct limitation objects', () => {
      expect(ADAPTER_LIMITATIONS_MAP['better-sqlite3']).toBe(BETTER_SQLITE3_LIMITATIONS);
      expect(ADAPTER_LIMITATIONS_MAP['sqljs']).toBe(SQLJS_LIMITATIONS);
      expect(ADAPTER_LIMITATIONS_MAP['capacitor']).toBe(CAPACITOR_SQLITE_LIMITATIONS);
      expect(ADAPTER_LIMITATIONS_MAP['postgres']).toBe(POSTGRES_LIMITATIONS);
      expect(ADAPTER_LIMITATIONS_MAP['supabase']).toBe(SUPABASE_LIMITATIONS);
    });
  });

  describe('getLimitationsForAdapter', () => {
    it('should return correct limitations for each adapter', () => {
      expect(getLimitationsForAdapter('better-sqlite3')).toBe(BETTER_SQLITE3_LIMITATIONS);
      expect(getLimitationsForAdapter('sqljs')).toBe(SQLJS_LIMITATIONS);
      expect(getLimitationsForAdapter('capacitor')).toBe(CAPACITOR_SQLITE_LIMITATIONS);
      expect(getLimitationsForAdapter('postgres')).toBe(POSTGRES_LIMITATIONS);
      expect(getLimitationsForAdapter('supabase')).toBe(SUPABASE_LIMITATIONS);
    });

    it('should return different objects for different adapters', () => {
      const sqliteLimits = getLimitationsForAdapter('better-sqlite3');
      const postgresLimits = getLimitationsForAdapter('postgres');
      
      expect(sqliteLimits).not.toBe(postgresLimits);
      expect(sqliteLimits.maxConnections).not.toBe(postgresLimits.maxConnections);
    });
  });

  describe('Performance Characteristics Comparison', () => {
    it('should show SQLite adapters as single-threaded', () => {
      expect(BETTER_SQLITE3_LIMITATIONS.performanceCharacteristics.concurrency).toBe('single');
      expect(SQLJS_LIMITATIONS.performanceCharacteristics.concurrency).toBe('single');
      expect(CAPACITOR_SQLITE_LIMITATIONS.performanceCharacteristics.concurrency).toBe('single');
    });

    it('should show PostgreSQL adapters as pooled', () => {
      expect(POSTGRES_LIMITATIONS.performanceCharacteristics.concurrency).toBe('pooled');
      expect(SUPABASE_LIMITATIONS.performanceCharacteristics.concurrency).toBe('pooled');
    });

    it('should show correct persistence models', () => {
      expect(BETTER_SQLITE3_LIMITATIONS.performanceCharacteristics.persistence).toBe('file');
      expect(SQLJS_LIMITATIONS.performanceCharacteristics.persistence).toBe('memory');
      expect(POSTGRES_LIMITATIONS.performanceCharacteristics.persistence).toBe('network');
    });

    it('should show correct async execution flags', () => {
      expect(BETTER_SQLITE3_LIMITATIONS.performanceCharacteristics.asyncExecution).toBe(false);
      expect(SQLJS_LIMITATIONS.performanceCharacteristics.asyncExecution).toBe(true);
      expect(POSTGRES_LIMITATIONS.performanceCharacteristics.asyncExecution).toBe(true);
    });
  });

  describe('Data Type Support Comparison', () => {
    it('should show SQLite adapters with same basic types', () => {
      const sqliteTypes = ['INTEGER', 'REAL', 'TEXT', 'BLOB', 'NULL'];
      expect(BETTER_SQLITE3_LIMITATIONS.supportedDataTypes).toEqual(sqliteTypes);
      expect(SQLJS_LIMITATIONS.supportedDataTypes).toEqual(sqliteTypes);
      expect(CAPACITOR_SQLITE_LIMITATIONS.supportedDataTypes).toEqual(sqliteTypes);
    });

    it('should show PostgreSQL with advanced types', () => {
      const pgTypes = POSTGRES_LIMITATIONS.supportedDataTypes;
      expect(pgTypes).toContain('JSON');
      expect(pgTypes).toContain('JSONB');
      expect(pgTypes).toContain('UUID');
      expect(pgTypes).toContain('ARRAY');
      expect(pgTypes.length).toBeGreaterThan(5);
    });

    it('should show Supabase with all PostgreSQL types plus extensions', () => {
      const supabaseTypes = SUPABASE_LIMITATIONS.supportedDataTypes;
      const pgTypes = POSTGRES_LIMITATIONS.supportedDataTypes;
      
      // Should include all Postgres types
      pgTypes.forEach(type => {
        expect(supabaseTypes).toContain(type);
      });
      
      // Plus pgvector
      expect(supabaseTypes).toContain('VECTOR');
    });
  });
});
