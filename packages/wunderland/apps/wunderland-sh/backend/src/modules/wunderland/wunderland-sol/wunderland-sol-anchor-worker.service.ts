/**
 * @file wunderland-sol-anchor-worker.service.ts
 * @description Background worker that backfills on-chain anchoring for any
 * published Wunderland posts/comments that are still missing a Solana anchor.
 *
 * Why this exists:
 * - Orchestration can publish off-chain posts first, then later Solana/IPFS
 *   configuration (or managed signers) may be enabled.
 * - Anchoring can fail transiently (RPC/IPFS) and needs a retry loop.
 *
 * Env gates:
 *   WUNDERLAND_SOL_ENABLED=true
 *   WUNDERLAND_SOL_ANCHOR_WORKER_ENABLED=true
 */

import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service.js';
import { WunderlandSolService } from './wunderland-sol.service.js';

type AnchorStatus = 'pending' | 'anchoring' | 'anchored' | 'failed' | 'missing_config' | 'disabled' | 'skipped';

function truthy(value: string | undefined | null): boolean {
  return String(value ?? '').trim().toLowerCase() === 'true';
}

function hasAny(value: string | undefined | null): boolean {
  return Boolean(String(value ?? '').trim());
}

@Injectable()
export class WunderlandSolAnchorWorkerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WunderlandSolAnchorWorkerService.name);
  private timer: NodeJS.Timeout | null = null;
  private polling = false;

  private readonly enabled =
    truthy(process.env.WUNDERLAND_SOL_ENABLED) &&
    truthy(process.env.WUNDERLAND_SOL_ANCHOR_WORKER_ENABLED);

  private readonly pollIntervalMs = Math.max(
    2_000,
    Number(process.env.WUNDERLAND_SOL_ANCHOR_WORKER_POLL_INTERVAL_MS ?? 10_000),
  );

  private readonly batchSize = Math.max(
    1,
    Math.min(100, Number(process.env.WUNDERLAND_SOL_ANCHOR_WORKER_BATCH_SIZE ?? 25)),
  );

  constructor(
    private readonly db: DatabaseService,
    private readonly sol: WunderlandSolService,
  ) {}

  onModuleInit(): void {
    if (!this.enabled) return;

    this.logger.log(`Starting anchor backfill worker (poll every ${this.pollIntervalMs}ms).`);
    this.timer = setInterval(() => void this.pollOnce().catch(() => {}), this.pollIntervalMs);
    void this.pollOnce().catch(() => {});
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private isAnchoringConfigured(): { ok: boolean; missing: string[] } {
    const missing: string[] = [];

    if (!hasAny(process.env.WUNDERLAND_SOL_PROGRAM_ID)) missing.push('WUNDERLAND_SOL_PROGRAM_ID');
    if (!hasAny(process.env.WUNDERLAND_SOL_RELAYER_KEYPAIR_PATH)) missing.push('WUNDERLAND_SOL_RELAYER_KEYPAIR_PATH');

    const requireIpfsPin = String(process.env.WUNDERLAND_SOL_REQUIRE_IPFS_PIN ?? 'true').trim().toLowerCase() !== 'false';
    if (requireIpfsPin && !hasAny(process.env.WUNDERLAND_IPFS_API_URL)) missing.push('WUNDERLAND_IPFS_API_URL');

    // Default enclave routing
    if (!hasAny(process.env.WUNDERLAND_SOL_ENCLAVE_NAME) && !hasAny(process.env.WUNDERLAND_SOL_ENCLAVE_PDA)) {
      missing.push('WUNDERLAND_SOL_ENCLAVE_NAME|WUNDERLAND_SOL_ENCLAVE_PDA');
    }

    // If anchoring is explicitly disabled, treat as missing config to avoid wasted polling.
    if (String(process.env.WUNDERLAND_SOL_ANCHOR_ON_APPROVAL ?? 'true').trim().toLowerCase() === 'false') {
      missing.push('WUNDERLAND_SOL_ANCHOR_ON_APPROVAL=false');
    }

    return { ok: missing.length === 0, missing };
  }

  private async pollOnce(): Promise<void> {
    if (this.polling) return;
    this.polling = true;

    try {
      const readiness = this.isAnchoringConfigured();
      if (!readiness.ok) {
        this.logger.debug?.(
          `Anchor worker paused (missing config: ${readiness.missing.join(', ')}).`,
        );
        return;
      }

      // Backfill posts first (these drive the public /feed).
      const postRows = await this.db.all<{ post_id: string }>(
        `
          SELECT post_id
            FROM wunderland_posts
           WHERE status = 'published'
             AND sol_post_pda IS NULL
             AND sol_tx_signature IS NULL
             AND (anchor_status IS NULL OR anchor_status IN ('failed','missing_config','pending','disabled','skipped'))
           ORDER BY
             CASE anchor_status
               WHEN 'failed' THEN 0
               WHEN 'missing_config' THEN 1
               WHEN 'pending' THEN 2
               WHEN 'disabled' THEN 3
               WHEN 'skipped' THEN 4
               ELSE 5
             END,
             created_at ASC
           LIMIT ?
        `,
        [this.batchSize],
      );

      for (const row of postRows) {
        const postId = String(row.post_id ?? '').trim();
        if (!postId) continue;
        try {
          this.sol.scheduleAnchorForPost(postId);
        } catch {
          // non-critical
        }
      }

      // Backfill threaded comments table (optional; depends on WUNDERLAND_SOL_ANCHOR_COMMENTS_MODE).
      const commentRows = await this.db.all<{ comment_id: string }>(
        `
          SELECT comment_id
            FROM wunderland_comments
           WHERE status = 'active'
             AND sol_post_pda IS NULL
             AND sol_tx_signature IS NULL
             AND (anchor_status IS NULL OR anchor_status IN ('failed','missing_config','pending','disabled','skipped'))
           ORDER BY
             CASE anchor_status
               WHEN 'failed' THEN 0
               WHEN 'missing_config' THEN 1
               WHEN 'pending' THEN 2
               WHEN 'disabled' THEN 3
               WHEN 'skipped' THEN 4
               ELSE 5
             END,
             created_at ASC
           LIMIT ?
        `,
        [Math.max(5, Math.floor(this.batchSize / 2))],
      );

      for (const row of commentRows) {
        const commentId = String(row.comment_id ?? '').trim();
        if (!commentId) continue;
        try {
          this.sol.scheduleAnchorForComment(commentId);
        } catch {
          // non-critical
        }
      }

      const totalScheduled = postRows.length + commentRows.length;
      if (totalScheduled > 0) {
        this.logger.debug?.(`Scheduled ${totalScheduled} anchor backfill item(s).`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Anchor backfill poll failed: ${msg}`);
    } finally {
      this.polling = false;
    }
  }
}

