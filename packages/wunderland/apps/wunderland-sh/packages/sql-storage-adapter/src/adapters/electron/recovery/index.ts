/**
 * Recovery Module for Electron SQL Storage Adapter.
 *
 * Provides database health monitoring, WAL management,
 * corruption detection, and automatic repair capabilities.
 *
 * @packageDocumentation
 */

export {
  WalCheckpointManager,
  createWalCheckpointManager,
  type WalCheckpointConfig,
  type CheckpointStrategy,
  type CheckpointResult,
  type WalStatus,
} from './walCheckpoint';

export {
  CorruptionDetector,
  createCorruptionDetector,
  type CorruptionDetectorConfig,
  type IntegrityCheckLevel,
  type IntegrityCheckResult,
  type CorruptionIssue,
  type RepairStrategy,
  type RepairResult,
} from './corruptionDetector';
