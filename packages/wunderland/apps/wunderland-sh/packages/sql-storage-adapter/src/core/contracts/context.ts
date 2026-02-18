/**
 * Runtime context and introspection types for storage adapters.
 * 
 * These types enable runtime inspection of adapter capabilities,
 * connection state, and performance characteristics without requiring
 * developers to manually check capability flags.
 */

import type { StorageAdapter, StorageCapability } from './index';
import type { PerformanceMetrics } from './extensions';

/**
 * Type of database connection.
 */
export type ConnectionType = 'file' | 'memory' | 'network';

/**
 * Database engine identifier.
 */
export type DatabaseEngine = 'sqlite' | 'postgres' | 'mysql' | 'sqljs' | 'capacitor' | 'supabase' | 'electron';

/**
 * Adapter identifier used by the resolver.
 */
export type AdapterKind =
  | 'postgres'
  | 'better-sqlite3'
  | 'capacitor'
  | 'sqljs'
  | 'indexeddb'
  | 'supabase'
  | 'electron-main'
  | 'electron-renderer';

/**
 * Information about the current database connection.
 */
export interface ConnectionInfo {
  /** Type of connection (file-based, in-memory, or network) */
  type: ConnectionType;
  
  /** Database engine being used */
  engine: DatabaseEngine;
  
  /** Engine version (if available) */
  version?: string;
  
  /** File path for file-based databases */
  filePath?: string;
  
  /** Host for network databases */
  host?: string;
  
  /** Database name for network databases */
  database?: string;
  
  /** Whether the connection is read-only */
  readOnly: boolean;
  
  /** When the connection was established */
  connectedAt?: Date;
}

/**
 * Concurrency model supported by the adapter.
 */
export type ConcurrencyModel = 'single' | 'pooled' | 'unlimited';

/**
 * Persistence model of the adapter.
 */
export type PersistenceModel = 'memory' | 'file' | 'network';

/**
 * Performance characteristics of an adapter.
 */
export interface PerformanceCharacteristics {
  /** Concurrency model */
  concurrency: ConcurrencyModel;
  
  /** Persistence model */
  persistence: PersistenceModel;
  
  /** Supported transaction isolation levels */
  transactionIsolation: string[];
  
  /** Whether the adapter uses connection pooling */
  usesConnectionPool: boolean;
  
  /** Whether queries are executed asynchronously */
  asyncExecution: boolean;
}

/**
 * Adapter-specific limitations and constraints.
 */
export interface AdapterLimitations {
  /** Maximum number of concurrent connections (if applicable) */
  maxConnections?: number;
  
  /** Maximum length of a single SQL statement (in bytes/characters) */
  maxStatementLength?: number;
  
  /** Maximum number of operations in a single batch */
  maxBatchSize?: number;
  
  /** Maximum size of a single parameter value (in bytes) */
  maxParameterSize?: number;
  
  /** Data types supported by this adapter */
  supportedDataTypes: string[];
  
  /** Features that are explicitly not supported */
  unsupportedFeatures: string[];
  
  /** Performance characteristics */
  performanceCharacteristics: PerformanceCharacteristics;
  
  /** Additional adapter-specific constraints */
  constraints?: Record<string, unknown>;
}

/**
 * Current health and status of the adapter.
 */
export interface AdapterStatus {
  /** Whether the adapter is functioning correctly */
  healthy: boolean;
  
  /** Whether the adapter is currently connected */
  connected: boolean;
  
  /** Last error encountered (if any) */
  lastError?: Error;
  
  /** Timestamp of last successful query */
  lastQuery?: Date;
  
  /** Total number of queries executed */
  totalQueries: number;
  
  /** Total number of errors encountered */
  errors: number;
  
  /** Time since adapter was opened (in milliseconds) */
  uptime: number;
  
  /** Performance metrics (if available) */
  metrics?: PerformanceMetrics;
}

/**
 * Runtime context providing introspection into the current adapter.
 * 
 * This interface provides a high-level API for querying adapter
 * capabilities, connection state, and performance without requiring
 * manual capability flag checking.
 * 
 * @example
 * ```typescript
 * const context = adapter.context;
 * 
 * // Simple boolean checks
 * if (context.supportsBatch) {
 *   await adapter.batch(operations);
 * }
 * 
 * // Get detailed status
 * const status = context.getStatus();
 * console.log(`Healthy: ${status.healthy}, Queries: ${status.totalQueries}`);
 * 
 * // Get limitations
 * const limits = context.getLimitations();
 * console.log(`Max batch size: ${limits.maxBatchSize}`);
 * ```
 */
export interface AdapterContext {
  // ===== Immutable State =====
  
  /** Reference to the underlying adapter */
  readonly adapter: StorageAdapter;
  
  /** Adapter kind identifier */
  readonly kind: AdapterKind;
  
  /** Set of capabilities supported by this adapter */
  readonly capabilities: ReadonlySet<StorageCapability>;
  
  /** Whether the adapter is currently open/connected */
  readonly isOpen: boolean;
  
  // ===== Convenience Capability Flags =====
  
  /** Whether the adapter supports synchronous operations */
  readonly supportsSync: boolean;
  
  /** Whether the adapter supports ACID transactions */
  readonly supportsTransactions: boolean;
  
  /** Whether the adapter supports batch operations */
  readonly supportsBatch: boolean;
  
  /** Whether the adapter supports prepared statements */
  readonly supportsPrepared: boolean;
  
  /** Whether the adapter supports streaming results */
  readonly supportsStreaming: boolean;
  
  /** Whether the adapter supports Write-Ahead Logging */
  readonly supportsWAL: boolean;
  
  /** Whether the adapter supports native JSON operations */
  readonly supportsJSON: boolean;
  
  /** Whether the adapter supports array data types */
  readonly supportsArrays: boolean;
  
  /** Whether the adapter supports concurrent connections */
  readonly supportsConcurrent: boolean;
  
  /** Whether the adapter persists data across restarts */
  readonly supportsPersistence: boolean;
  
  /** Information about the current connection */
  readonly connectionInfo: ConnectionInfo;
  
  // ===== Methods =====
  
  /**
   * Check if a specific capability is supported.
   * 
   * @param capability - The capability to check
   * @returns True if the capability is supported
   * 
   * @example
   * ```typescript
   * if (context.hasCapability('streaming')) {
   *   // Use streaming API
   * }
   * ```
   */
  hasCapability(capability: StorageCapability): boolean;
  
  /**
   * Require a specific capability, throwing an error if not supported.
   * 
   * @param capability - The required capability
   * @throws {Error} If the capability is not supported
   * 
   * @example
   * ```typescript
   * context.requiresCapability('transactions');
   * // Safe to use transactions now
   * await adapter.transaction(async (trx) => { ... });
   * ```
   */
  requiresCapability(capability: StorageCapability): void;
  
  /**
   * Get detailed limitations and constraints for this adapter.
   * 
   * @returns Adapter-specific limitations
   * 
   * @example
   * ```typescript
   * const limits = context.getLimitations();
   * if (operations.length > limits.maxBatchSize) {
   *   // Split into chunks
   * }
   * ```
   */
  getLimitations(): AdapterLimitations;
  
  /**
   * Get current health and status information.
   * 
   * @returns Current adapter status
   * 
   * @example
   * ```typescript
   * const status = context.getStatus();
   * if (!status.healthy) {
   *   logger.error('Database unhealthy', status.lastError);
   * }
   * ```
   */
  getStatus(): AdapterStatus;
}

