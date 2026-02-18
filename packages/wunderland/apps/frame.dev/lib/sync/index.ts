/**
 * Sync Module
 * @module lib/sync
 *
 * Offline sync queue, conflict resolution, and dual sync (SQLite + Git).
 */

export * from './types'
export { SyncQueue, getSyncQueue } from './syncQueue'
export {
  ConflictResolver,
  getConflictResolver,
  resolveConflict,
  detectConflictFields,
  canAutoResolve,
  getRecommendedStrategy,
  getConflictSummary,
} from './conflictResolver'

// Dual Sync Manager (SQLite sync + Git publish)
export {
  DualSyncManager,
  getDualSyncManager,
  initializeDualSyncManager,
  resetDualSyncManager,
  extractVisibility,
  updateVisibility,
  determineSyncRoute,
  type SyncMode,
  type StrandVisibility,
  type SyncTarget,
  type SyncTargetConfig,
  type SyncRouteResult,
  type DualSyncOperation,
  type DualSyncStatus,
  type DualSyncManagerConfig,
} from './dualSyncManager'
