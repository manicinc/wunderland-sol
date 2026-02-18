/**
 * @file RekorProvider.ts
 * @description Sigstore Rekor transparency log anchor provider.
 * Publishes anchor Merkle roots as hashedrekord entries to Rekor.
 *
 * Proof level: `publicly-auditable`
 * Required peer dependency: `sigstore`
 *
 * @module @framers/agentos-ext-anchor-providers
 */

import type { AnchorProvider, AnchorRecord, AnchorProviderResult, ProofLevel } from '@framers/agentos';
import type { BaseProviderConfig } from '../types.js';
import { resolveBaseConfig } from '../types.js';
import { hashCanonicalAnchor } from '../utils/serialization.js';

export interface RekorProviderConfig extends BaseProviderConfig {
  /** Rekor server URL. Default: 'https://rekor.sigstore.dev'. */
  serverUrl?: string;
}

const DEFAULT_SERVER_URL = 'https://rekor.sigstore.dev';

export class RekorProvider implements AnchorProvider {
  readonly id = 'rekor';
  readonly name = 'Sigstore Rekor Transparency Log';
  readonly proofLevel: ProofLevel = 'publicly-auditable';

  private readonly config: Required<RekorProviderConfig>;
  private readonly baseConfig: Required<BaseProviderConfig>;

  constructor(config: RekorProviderConfig = {}) {
    this.config = {
      serverUrl: config.serverUrl ?? DEFAULT_SERVER_URL,
      timeoutMs: config.timeoutMs ?? 30_000,
      retries: config.retries ?? 3,
      retryDelayMs: config.retryDelayMs ?? 1_000,
    };
    this.baseConfig = resolveBaseConfig(config);
  }

  async publish(anchor: AnchorRecord): Promise<AnchorProviderResult> {
    // TODO: Implement using sigstore SDK or direct HTTP to Rekor API
    //
    // Implementation outline:
    //   1. Compute SHA-256 hash of canonical anchor: hashCanonicalAnchor(anchor)
    //   2. Create a hashedrekord entry:
    //      POST ${serverUrl}/api/v1/log/entries
    //      Body: { kind: 'hashedrekord', apiVersion: '0.0.1',
    //              spec: { data: { hash: { algorithm: 'sha256', value: anchorHash } },
    //                      signature: { content: anchor.signature, publicKey: { content: ... } } } }
    //   3. Parse response for log index and entry UUID
    //   4. Return { success: true, externalRef: `rekor:${logIndex}:${entryUUID}`,
    //              metadata: { logIndex, serverUrl, inclusionProof } }
    try {
      const _hash = await hashCanonicalAnchor(anchor);
      throw new Error(
        'RekorProvider is not yet implemented. ' +
        'Install sigstore SDK and implement the Rekor transparency log integration.',
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
    // TODO: Retrieve entry from Rekor by externalRef and verify inclusion proof
    //   GET ${serverUrl}/api/v1/log/entries/${entryUUID}
    //   Verify inclusion proof against the transparency log root
    if (!anchor.externalRef) return false;
    console.warn('[RekorProvider] verify() is not yet implemented');
    return false;
  }

  async dispose(): Promise<void> {
    // No persistent resources in current implementation
  }
}
