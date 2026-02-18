/**
 * @file index.ts
 * @description Main entry point for @framers/agentos-ext-tip-ingestion.
 *
 * Provides chain-facing Wunderland social helpers that are intentionally kept
 * outside of core wunderland:
 * - IpfsPinner: deterministic raw-block CID pinning
 * - TipIngester: on-chain tip processing pipeline
 *
 * @module @framers/agentos-ext-tip-ingestion
 */

export {
  IpfsPinner,
  PinningError,
  type PinningConfig,
  type PinningProvider,
  type PinResult,
} from './IpfsPinner.js';

export {
  TipIngester,
  type OnChainTip,
  type ProcessedTip,
  type RefundCallback,
  type SettlementCallback,
  type TipContent,
  type TipPriority,
  type TipSourceType,
} from './TipIngester.js';
