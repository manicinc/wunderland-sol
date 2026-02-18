/**
 * Aggregated type exports for scenarios where consumers import from
 * "@framers/sql-storage-adapter/types". Ensures Node's specifier
 * resolution finds an index module alongside the compiled artifacts.
 * 
 * @packageDocumentation
 * @module @framers/sql-storage-adapter/types
 * 
 * @remarks
 * This module re-exports all public types from the sql-storage-adapter package.
 * Import from here when you only need types without runtime code.
 * 
 * @example
 * ```typescript
 * import type { 
 *   StorageAdapter, 
 *   PerformanceConfig, 
 *   StorageHooks 
 * } from '@framers/sql-storage-adapter/types';
 * ```
 */

export * from '../core/contracts';
export * from '../core/contracts/context';
export * from '../core/contracts/events';
export * from '../core/contracts/extensions';
export * from '../core/contracts/limitations';
export * from '../core/contracts/performance';
export * from '../core/contracts/hooks';
