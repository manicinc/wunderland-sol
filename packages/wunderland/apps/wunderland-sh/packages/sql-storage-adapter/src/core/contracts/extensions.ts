/**
 * Extended types for advanced adapter features.
 * These types are used by adapters that provide additional functionality
 * beyond the core StorageAdapter interface.
 */

import type { BatchOperation as CoreBatchOperation } from './index';

/**
 * Performance metrics for monitoring adapter usage.
 */
export interface PerformanceMetrics {
  totalQueries: number;
  totalDuration: number;
  averageDuration: number;
  cacheHits?: number;
  cacheMisses?: number;
  slowQueries?: Array<{
    query: string;
    duration: number;
    timestamp: Date;
  }>;
}

/**
 * Options for streaming large result sets.
 */
export interface StreamOptions {
  batchSize?: number;
  highWaterMark?: number;
}

/**
 * Database migration definition.
 */
export interface Migration {
  id: string;
  version: number;
  up: string;
  down?: string;
  description?: string;
  appliedAt?: Date;
}

/**
 * Extended batch operation with additional metadata.
 * Used by adapters that support richer batch operation semantics.
 */
export interface ExtendedBatchOperation extends CoreBatchOperation {
  type?: 'insert' | 'update' | 'delete';
  table?: string;
  values?: Record<string, unknown> | Array<Record<string, unknown>>;
  where?: Record<string, unknown>;
}

/**
 * Extended storage adapter interface for advanced features.
 */
export interface StorageAdapterExtensions {
  /**
   * Apply database migrations.
   */
  migrate?(migrations: Migration[]): Promise<void>;

  /**
   * Get migration status.
   */
  getMigrationStatus?(): Promise<Migration[]>;

  /**
   * Get performance metrics.
   */
  getMetrics?(): PerformanceMetrics;

  /**
   * Stream large result sets.
   */
  stream?<T>(
    statement: string,
    parameters?: unknown,
    options?: StreamOptions
  ): AsyncIterableIterator<T>;
}

// Re-export core types for convenience
export type { BatchOperation } from './index';
export type { BatchResult } from './index';

