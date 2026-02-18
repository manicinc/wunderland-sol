/**
 * @file OpenTimestampsProvider.ts
 * @description Bitcoin-anchored timestamping via the OpenTimestamps protocol.
 * Creates OTS timestamps for anchor Merkle roots and submits to calendar servers.
 *
 * Proof level: `publicly-timestamped`
 * Required peer dependency: `opentimestamps`
 *
 * @module @framers/agentos-ext-anchor-providers
 */

import type { AnchorProvider, AnchorRecord, AnchorProviderResult, ProofLevel } from '@framers/agentos';
import type { BaseProviderConfig } from '../types.js';
import { resolveBaseConfig } from '../types.js';
import { hashCanonicalAnchor } from '../utils/serialization.js';

export interface OpenTimestampsProviderConfig extends BaseProviderConfig {
  /** OTS calendar server URLs. Default: public OpenTimestamps calendars. */
  calendarUrls?: string[];
}

const DEFAULT_CALENDAR_URLS = [
  'https://a.pool.opentimestamps.org',
  'https://b.pool.opentimestamps.org',
  'https://a.pool.eternitywall.com',
];

export class OpenTimestampsProvider implements AnchorProvider {
  readonly id = 'opentimestamps';
  readonly name = 'OpenTimestamps (Bitcoin)';
  readonly proofLevel: ProofLevel = 'publicly-timestamped';

  private readonly config: Required<OpenTimestampsProviderConfig>;
  private readonly baseConfig: Required<BaseProviderConfig>;

  constructor(config: OpenTimestampsProviderConfig = {}) {
    this.config = {
      calendarUrls: config.calendarUrls ?? DEFAULT_CALENDAR_URLS,
      timeoutMs: config.timeoutMs ?? 30_000,
      retries: config.retries ?? 3,
      retryDelayMs: config.retryDelayMs ?? 1_000,
    };
    this.baseConfig = resolveBaseConfig(config);
  }

  async publish(anchor: AnchorRecord): Promise<AnchorProviderResult> {
    // TODO: Implement using opentimestamps npm package
    //
    // Implementation outline:
    //   1. Compute SHA-256 of canonical anchor: hashCanonicalAnchor(anchor)
    //   2. Create a DetachedTimestampFile from the hash
    //   3. Submit to calendar servers: OpenTimestamps.stamp(detached, { calendars })
    //   4. Serialize the OTS proof to base64
    //   5. Return { success: true, externalRef: `ots:${base64Proof}`,
    //              metadata: { calendarUrls, pendingAttestation: true } }
    //
    // Note: OTS proofs are initially "pending" — they confirm after a Bitcoin block
    // includes the calendar commitment (typically 1-2 hours). A separate verification
    // step can upgrade pending proofs to confirmed.
    try {
      const _hash = await hashCanonicalAnchor(anchor);
      throw new Error(
        'OpenTimestampsProvider is not yet implemented. ' +
        'Install opentimestamps and implement the Bitcoin timestamping integration.',
      );
    } catch (e: unknown) {
      return {
        providerId: this.id,
        success: false,
        error: e instanceof Error ? e.message : String(e),
      };
    }
  }

  async verify(anchor: AnchorRecord): Promise<boolean> {
    // TODO: Deserialize OTS proof from externalRef, call OpenTimestamps.verify()
    //   Returns true if the proof is confirmed by a Bitcoin block
    if (!anchor.externalRef) return false;
    console.warn('[OpenTimestampsProvider] verify() is not yet implemented');
    return false;
  }

  async dispose(): Promise<void> {
    // No persistent resources in current implementation
  }
}
