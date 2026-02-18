/**
 * @file vector-memory-backfill.service.ts
 * @description Operational one-off backfills for Wunderland vector memory.
 *
 * Primary use-case: re-ingest the last N published posts per enclave so
 * embeddings gain `enclaveId` metadata for enclave-scoped semantic retrieval.
 */

import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';
import { WunderlandVectorMemoryService } from './wunderland-vector-memory.service';

type BackfillStatus = 'idle' | 'running' | 'completed' | 'failed';

export type EnclaveEmbeddingsBackfillConfig = {
  perEnclave: number;
  enclaves?: string[];
  includeGlobal?: boolean;
  concurrency: number;
  dryRun: boolean;
};

export type EnclaveEmbeddingsBackfillState = {
  status: BackfillStatus;
  runId?: string;
  startedAt?: string;
  finishedAt?: string;
  config?: EnclaveEmbeddingsBackfillConfig;
  progress: {
    enclavesTotal: number;
    enclavesProcessed: number;
    postsQueued: number;
    postsProcessed: number;
    postsSucceeded: number;
    postsFailed: number;
  };
  lastError?: string;
};

@Injectable()
export class VectorMemoryBackfillService {
  private readonly logger = new Logger('VectorMemoryBackfillService');

  private state: EnclaveEmbeddingsBackfillState = {
    status: 'idle',
    progress: {
      enclavesTotal: 0,
      enclavesProcessed: 0,
      postsQueued: 0,
      postsProcessed: 0,
      postsSucceeded: 0,
      postsFailed: 0,
    },
  };

  constructor(
    private readonly db: DatabaseService,
    private readonly vectorMemory: WunderlandVectorMemoryService,
  ) {}

  getStatus(): EnclaveEmbeddingsBackfillState {
    return this.state;
  }

  startEnclaveEmbeddingsBackfill(config: EnclaveEmbeddingsBackfillConfig): EnclaveEmbeddingsBackfillState {
    if (this.state.status === 'running') return this.state;

    const normalized: EnclaveEmbeddingsBackfillConfig = {
      perEnclave: Math.max(1, Math.min(2000, Math.trunc(Number(config.perEnclave ?? 200)))),
      enclaves: Array.isArray(config.enclaves)
        ? config.enclaves.map((e) => String(e).trim()).filter(Boolean).slice(0, 50)
        : undefined,
      includeGlobal: Boolean(config.includeGlobal),
      concurrency: Math.max(1, Math.min(6, Math.trunc(Number(config.concurrency ?? 2)))),
      dryRun: Boolean(config.dryRun),
    };

    const runId = `vmemb_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;

    this.state = {
      status: 'running',
      runId,
      startedAt: new Date().toISOString(),
      config: normalized,
      progress: {
        enclavesTotal: 0,
        enclavesProcessed: 0,
        postsQueued: 0,
        postsProcessed: 0,
        postsSucceeded: 0,
        postsFailed: 0,
      },
    };

    void this.runEnclaveBackfill(normalized).catch((err: any) => {
      const msg = String(err?.message ?? err);
      this.logger.error(`Enclave embeddings backfill failed: ${msg}`);
      this.state.status = 'failed';
      this.state.finishedAt = new Date().toISOString();
      this.state.lastError = msg;
    });

    return this.state;
  }

  private async runEnclaveBackfill(config: EnclaveEmbeddingsBackfillConfig): Promise<void> {
    this.logger.log(
      `Starting enclave embeddings backfill (perEnclave=${config.perEnclave}, concurrency=${config.concurrency}, dryRun=${config.dryRun}).`,
    );

    const allEnclaves = await this.db.all<{ enclave_id: string; name: string }>(
      `SELECT enclave_id, name FROM wunderland_enclaves ORDER BY name ASC`,
    );

    const selectedEnclaves = (() => {
      if (!config.enclaves || config.enclaves.length === 0) return allEnclaves;
      const wanted = new Set(config.enclaves.map((e) => e.toLowerCase()));
      return allEnclaves.filter((e) => wanted.has(String(e.enclave_id).toLowerCase()) || wanted.has(String(e.name).toLowerCase()));
    })();

    const targets: Array<{ enclaveId: string | null; enclaveName: string }> = selectedEnclaves.map((e) => ({
      enclaveId: String(e.enclave_id),
      enclaveName: String(e.name),
    }));

    if (config.includeGlobal) {
      targets.push({ enclaveId: null, enclaveName: 'feed' });
    }

    this.state.progress.enclavesTotal = targets.length;

    const toIso = (ms: number | null | undefined): string | undefined => {
      if (typeof ms !== 'number') return undefined;
      if (!Number.isFinite(ms) || ms <= 0) return undefined;
      const d = new Date(ms);
      if (Number.isNaN(d.getTime())) return undefined;
      return d.toISOString();
    };

    for (const target of targets) {
      const enclaveId = target.enclaveId;
      const enclaveName = target.enclaveName;

      const rows = await this.db.all<{
        post_id: string;
        seed_id: string;
        content: string;
        reply_to_post_id: string | null;
        created_at: number | null;
        published_at: number | null;
        enclave_id: string | null;
      }>(
        `
          SELECT post_id, seed_id, content, reply_to_post_id, created_at, published_at, enclave_id
            FROM wunderland_posts
           WHERE status = 'published'
             AND ${enclaveId ? 'enclave_id = ?' : 'enclave_id IS NULL'}
           ORDER BY COALESCE(published_at, created_at) DESC
           LIMIT ?
        `,
        enclaveId ? [enclaveId, config.perEnclave] : [config.perEnclave],
      );

      this.state.progress.postsQueued += rows.length;

      if (rows.length === 0) {
        this.state.progress.enclavesProcessed++;
        continue;
      }

      this.logger.log(
        `Backfilling ${rows.length} post(s) for enclave "${enclaveName}" (${enclaveId ?? 'global'}).`,
      );

      const inFlight = new Set<Promise<void>>();
      const enqueue = async (fn: () => Promise<void>): Promise<void> => {
        let p: Promise<void>;
        p = fn().finally(() => {
          inFlight.delete(p);
        });
        inFlight.add(p);
        if (inFlight.size >= config.concurrency) {
          await Promise.race(inFlight);
        }
      };

      for (const row of rows) {
        await enqueue(async () => {
          try {
            const postId = String(row.post_id ?? '').trim();
            const seedId = String(row.seed_id ?? '').trim();
            const content = typeof row.content === 'string' ? row.content : String(row.content ?? '');
            if (!postId || !seedId || !content.trim()) {
              this.state.progress.postsFailed++;
              return;
            }

            if (!config.dryRun) {
              await this.vectorMemory.ingestSeedPost({
                seedId,
                postId,
                content,
                replyToPostId: row.reply_to_post_id ? String(row.reply_to_post_id) : null,
                enclaveId: enclaveId ?? (row.enclave_id ? String(row.enclave_id) : null),
                createdAt: toIso(row.created_at ?? null),
                publishedAt: toIso(row.published_at ?? null) ?? null,
              });
            }

            this.state.progress.postsSucceeded++;
          } catch (err: any) {
            const msg = String(err?.message ?? err);
            this.state.lastError = msg;
            this.state.progress.postsFailed++;
            this.logger.warn(`Backfill ingest failed for post ${String(row.post_id)}: ${msg}`);
          } finally {
            this.state.progress.postsProcessed++;
          }
        });
      }

      await Promise.all([...inFlight]);
      this.state.progress.enclavesProcessed++;
    }

    this.state.status = 'completed';
    this.state.finishedAt = new Date().toISOString();
    this.logger.log(
      `Enclave embeddings backfill completed: enclaves=${this.state.progress.enclavesProcessed}/${this.state.progress.enclavesTotal}, posts=${this.state.progress.postsSucceeded} ok, ${this.state.progress.postsFailed} failed.`,
    );
  }
}

