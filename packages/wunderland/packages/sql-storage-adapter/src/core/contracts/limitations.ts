/**
 * Adapter-specific limitation definitions.
 * 
 * This module provides concrete limitation specifications for each
 * supported database adapter, enabling runtime introspection and
 * automatic constraint enforcement.
 */

import type {
  AdapterLimitations,
  ConcurrencyModel,
  PersistenceModel,
  PerformanceCharacteristics
} from './context';

/**
 * Create performance characteristics object.
 */
function createPerformanceCharacteristics(
  concurrency: ConcurrencyModel,
  persistence: PersistenceModel,
  transactionIsolation: string[],
  usesConnectionPool: boolean,
  asyncExecution: boolean
): PerformanceCharacteristics {
  return {
    concurrency,
    persistence,
    transactionIsolation,
    usesConnectionPool,
    asyncExecution
  };
}

/**
 * Limitations for better-sqlite3 adapter.
 */
export const BETTER_SQLITE3_LIMITATIONS: AdapterLimitations = {
  maxConnections: 1, // Single connection (SQLite limitation)
  maxStatementLength: 1000000, // 1MB
  maxBatchSize: undefined, // No hard limit, but memory constrained
  maxParameterSize: undefined, // Limited by available memory
  supportedDataTypes: ['INTEGER', 'REAL', 'TEXT', 'BLOB', 'NULL'],
  unsupportedFeatures: ['streaming', 'concurrent', 'json', 'arrays'],
  performanceCharacteristics: createPerformanceCharacteristics(
    'single',
    'file',
    ['SERIALIZABLE'], // SQLite only supports serializable
    false, // No connection pooling
    false  // Synchronous by default
  ),
  constraints: {
    supportsWAL: true,
    supportsInMemory: true,
    requiresFilePath: false // Can use :memory:
  }
};

/**
 * Limitations for SQL.js adapter (WebAssembly SQLite).
 */
export const SQLJS_LIMITATIONS: AdapterLimitations = {
  maxConnections: 1, // Single connection
  maxStatementLength: 1000000, // 1MB
  maxBatchSize: undefined,
  maxParameterSize: undefined,
  supportedDataTypes: ['INTEGER', 'REAL', 'TEXT', 'BLOB', 'NULL'],
  unsupportedFeatures: ['streaming', 'concurrent', 'json', 'arrays', 'wal', 'locks'],
  performanceCharacteristics: createPerformanceCharacteristics(
    'single',
    'memory', // Typically in-memory or manual file persistence
    ['SERIALIZABLE'],
    false,
    true // Async wrapper over sync WASM
  ),
  constraints: {
    supportsWAL: false,
    supportsInMemory: true,
    requiresFilePath: false,
    requiresWASM: true,
    browserCompatible: true
  }
};

/**
 * Limitations for Capacitor SQLite adapter (mobile).
 */
export const CAPACITOR_SQLITE_LIMITATIONS: AdapterLimitations = {
  maxConnections: 1, // Mobile SQLite single connection
  maxStatementLength: 1000000,
  maxBatchSize: undefined,
  maxParameterSize: undefined,
  supportedDataTypes: ['INTEGER', 'REAL', 'TEXT', 'BLOB', 'NULL'],
  unsupportedFeatures: ['streaming', 'concurrent', 'json', 'arrays'],
  performanceCharacteristics: createPerformanceCharacteristics(
    'single',
    'file',
    ['SERIALIZABLE'],
    false,
    true // Async through Capacitor bridge
  ),
  constraints: {
    supportsWAL: true,
    supportsInMemory: false, // Mobile requires file persistence
    requiresFilePath: true,
    requiresCapacitor: true,
    mobileOnly: true
  }
};

/**
 * Limitations for PostgreSQL adapter.
 */
export const POSTGRES_LIMITATIONS: AdapterLimitations = {
  maxConnections: 100, // Default pool size (configurable)
  maxStatementLength: 1073741824, // 1GB theoretical limit
  maxBatchSize: 1000, // Recommended batch size
  maxParameterSize: 1073741824, // 1GB for BYTEA/TEXT
  supportedDataTypes: [
    'INTEGER', 'BIGINT', 'SMALLINT', 'SERIAL', 'BIGSERIAL',
    'REAL', 'DOUBLE PRECISION', 'NUMERIC', 'DECIMAL',
    'TEXT', 'VARCHAR', 'CHAR', 'BYTEA',
    'BOOLEAN', 'DATE', 'TIME', 'TIMESTAMP', 'TIMESTAMPTZ',
    'JSON', 'JSONB', 'UUID', 'ARRAY', 'HSTORE', 'XML'
  ],
  unsupportedFeatures: ['wal'], // WAL is PostgreSQL-specific, not exposed as capability
  performanceCharacteristics: createPerformanceCharacteristics(
    'pooled',
    'network',
    ['READ UNCOMMITTED', 'READ COMMITTED', 'REPEATABLE READ', 'SERIALIZABLE'],
    true, // Connection pooling
    true  // Fully async
  ),
  constraints: {
    supportsWAL: false, // Not relevant for client connections
    supportsInMemory: false,
    requiresFilePath: false,
    requiresNetwork: true,
    supportsReplication: true,
    supportsPartitioning: true
  }
};

/**
 * Limitations for Supabase adapter (PostgreSQL with extensions).
 */
export const SUPABASE_LIMITATIONS: AdapterLimitations = {
  maxConnections: 15, // Supabase free tier default
  maxStatementLength: 1073741824,
  maxBatchSize: 1000,
  maxParameterSize: 1073741824,
  supportedDataTypes: [
    ...POSTGRES_LIMITATIONS.supportedDataTypes,
    'VECTOR' // pgvector extension
  ],
  unsupportedFeatures: [],
  performanceCharacteristics: createPerformanceCharacteristics(
    'pooled',
    'network',
    ['READ COMMITTED', 'REPEATABLE READ', 'SERIALIZABLE'],
    true,
    true
  ),
  constraints: {
    supportsWAL: false,
    supportsInMemory: false,
    requiresFilePath: false,
    requiresNetwork: true,
    supportsReplication: true,
    supportsPartitioning: true,
    supportsRowLevelSecurity: true,
    supportsRealtimeSubscriptions: true, // Supabase-specific
    managedService: true
  }
};

/**
 * Map adapter kinds to their limitation definitions.
 */
export const ADAPTER_LIMITATIONS_MAP = {
  'better-sqlite3': BETTER_SQLITE3_LIMITATIONS,
  'sqljs': SQLJS_LIMITATIONS,
  'capacitor': CAPACITOR_SQLITE_LIMITATIONS,
  'postgres': POSTGRES_LIMITATIONS,
  'supabase': SUPABASE_LIMITATIONS
} as const;

/**
 * Get limitations for a specific adapter kind.
 * 
 * @param kind - Adapter kind
 * @returns Adapter limitations
 */
export function getLimitationsForAdapter(
  kind: keyof typeof ADAPTER_LIMITATIONS_MAP
): AdapterLimitations {
  return ADAPTER_LIMITATIONS_MAP[kind];
}

