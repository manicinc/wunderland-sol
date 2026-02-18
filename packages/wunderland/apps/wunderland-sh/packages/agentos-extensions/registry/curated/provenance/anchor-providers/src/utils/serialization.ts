/**
 * @file serialization.ts
 * @description Deterministic serialization for anchor records before external publishing.
 */

import type { AnchorRecord } from '@framers/agentos';
import { createHash } from 'crypto';

/**
 * Serialize an AnchorRecord to a canonical JSON string with sorted keys.
 * Ensures all providers hash/publish the same byte representation.
 */
export function canonicalizeAnchor(anchor: AnchorRecord): string {
  const canonical = {
    eventCount: anchor.eventCount,
    id: anchor.id,
    merkleRoot: anchor.merkleRoot,
    sequenceFrom: anchor.sequenceFrom,
    sequenceTo: anchor.sequenceTo,
    signature: anchor.signature,
    timestamp: anchor.timestamp,
  };
  return JSON.stringify(canonical);
}

/**
 * Compute a SHA-256 hex digest of the canonical anchor representation.
 * Used by providers as the hash to publish externally.
 */
export async function hashCanonicalAnchor(anchor: AnchorRecord): Promise<string> {
  const canonical = canonicalizeAnchor(anchor);
  return createHash('sha256').update(canonical, 'utf8').digest('hex');
}
