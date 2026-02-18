/**
 * @file WormSnapshotProvider.ts
 * @description S3 Object Lock / WORM storage anchor provider.
 * Publishes anchor records to an S3 bucket with Object Lock governance/compliance retention.
 *
 * Proof level: `externally-archived`
 * Required peer dependency: `@aws-sdk/client-s3`
 *
 * @module @framers/agentos-ext-anchor-providers
 */

import type { AnchorProvider, AnchorRecord, AnchorProviderResult, ProofLevel } from '@framers/agentos';
import type { BaseProviderConfig } from '../types.js';
import { resolveBaseConfig } from '../types.js';
import { canonicalizeAnchor } from '../utils/serialization.js';

export interface WormSnapshotProviderConfig extends BaseProviderConfig {
  /** S3 bucket name (must have Object Lock enabled). */
  bucket: string;
  /** S3 region. */
  region: string;
  /** Key prefix for anchor objects. Default: 'provenance/anchors/'. */
  keyPrefix?: string;
  /** Retention period in days. Default: 365. */
  retentionDays?: number;
  /** Retention mode: 'GOVERNANCE' or 'COMPLIANCE'. Default: 'GOVERNANCE'. */
  retentionMode?: 'GOVERNANCE' | 'COMPLIANCE';
}

export class WormSnapshotProvider implements AnchorProvider {
  readonly id = 'worm-snapshot';
  readonly name = 'WORM Snapshot (S3 Object Lock)';
  readonly proofLevel: ProofLevel = 'externally-archived';

  private readonly config: WormSnapshotProviderConfig;
  private readonly baseConfig: Required<BaseProviderConfig>;

  constructor(config: WormSnapshotProviderConfig) {
    this.config = {
      keyPrefix: 'provenance/anchors/',
      retentionDays: 365,
      retentionMode: 'GOVERNANCE',
      ...config,
    };
    this.baseConfig = resolveBaseConfig(config);
  }

  async publish(anchor: AnchorRecord): Promise<AnchorProviderResult> {
    // TODO: Implement using @aws-sdk/client-s3
    //
    // Implementation outline:
    //   1. Import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
    //   2. Create S3Client with region from config
    //   3. Serialize anchor via canonicalizeAnchor()
    //   4. PutObject with:
    //      - Bucket: this.config.bucket
    //      - Key: `${this.config.keyPrefix}${anchor.id}.json`
    //      - Body: canonical JSON
    //      - ContentType: 'application/json'
    //      - ObjectLockMode: this.config.retentionMode
    //      - ObjectLockRetainUntilDate: now + retentionDays
    //   5. Return { success: true, externalRef: `s3://${bucket}/${key}` }
    try {
      const _canonical = canonicalizeAnchor(anchor);
      throw new Error(
        'WormSnapshotProvider is not yet implemented. ' +
        'Install @aws-sdk/client-s3 and implement the S3 Object Lock integration.',
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
    // TODO: Implement using HeadObject to check object exists and retention is active
    if (!anchor.externalRef) return false;
    console.warn('[WormSnapshotProvider] verify() is not yet implemented');
    return false;
  }
}
