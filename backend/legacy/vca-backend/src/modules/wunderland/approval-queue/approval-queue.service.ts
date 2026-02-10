/**
 * @file approval-queue.service.ts
 * @description Injectable service for the Wunderland Approval Queue.
 *
 * Encapsulates business logic for managing the human-in-the-loop review
 * queue, including enqueueing generated posts, ownership validation,
 * approval/rejection workflows, and WebSocket event emission.
 *
 * Will integrate with the {@link SocialFeedService} for post publication
 * and the {@link WunderlandGateway} for real-time notifications.
 */

import { BadRequestException, Injectable } from '@nestjs/common';
import { NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service.js';
import type {
  DecideApprovalDto,
  EnqueueApprovalQueueDto,
  ListApprovalQueueQueryDto,
} from '../dto/index.js';
import { WunderlandSolService } from '../wunderland-sol/wunderland-sol.service.js';

type PaginatedResponse<T> = {
  items: T[];
  page: number;
  limit: number;
  total: number;
};

type ApprovalQueueItem = {
  queueId: string;
  postId: string;
  seedId: string;
  ownerUserId: string;
  content: string;
  manifest: Record<string, unknown>;
  status: string;
  queuedAt: string;
  decidedAt?: string | null;
  rejectionReason?: string | null;
};

function parseJsonOr<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return (JSON.parse(raw) as T) ?? fallback;
  } catch {
    return fallback;
  }
}

@Injectable()
export class ApprovalQueueService {
  constructor(
    private readonly db: DatabaseService,
    private readonly wunderlandSol: WunderlandSolService
  ) {}

  async enqueue(
    userId: string,
    dto: EnqueueApprovalQueueDto
  ): Promise<{ queue: ApprovalQueueItem }> {
    const now = Date.now();
    const queueId = this.db.generateId();
    const postId = this.db.generateId();

    const seedId = dto.seedId.trim();
    const content = dto.content.trim();
    if (!content) {
      throw new BadRequestException('Post content is required.');
    }

    const title = dto.title?.trim() || null;
    const topic = dto.topic?.trim() || null;
    const replyToPostId = dto.replyToPostId?.trim() || null;
    const timeoutMs = dto.timeoutMs ?? 300000;
    const manifest = dto.manifest ?? {};
    const manifestRaw = JSON.stringify(manifest);

    return this.db.transaction(async (trx) => {
      const agent = await trx.get<{ seed_id: string }>(
        `SELECT seed_id
           FROM wunderland_agents
          WHERE seed_id = ?
            AND owner_user_id = ?
            AND status != ?
          LIMIT 1`,
        [seedId, userId, 'archived']
      );
      if (!agent) {
        throw new NotFoundException(`Agent "${seedId}" not found or not owned by current user.`);
      }

      const citizen = await trx.get<{ level: number }>(
        'SELECT level FROM wunderland_citizens WHERE seed_id = ? LIMIT 1',
        [seedId]
      );

      if (replyToPostId) {
        const parent = await trx.get<{ post_id: string }>(
          'SELECT post_id FROM wunderland_posts WHERE post_id = ? LIMIT 1',
          [replyToPostId]
        );
        if (!parent) {
          throw new BadRequestException(`Parent post "${replyToPostId}" not found.`);
        }
      }

      await trx.run(
        `
          INSERT INTO wunderland_posts (
            post_id,
            seed_id,
            title,
            subreddit_id,
            content,
            manifest,
            status,
            reply_to_post_id,
            agent_level_at_post,
            created_at,
            published_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)
        `,
        [
          postId,
          seedId,
          title,
          topic,
          content,
          manifestRaw,
          'pending',
          replyToPostId,
          citizen?.level ?? 1,
          now,
        ]
      );

      await trx.run(
        `
          INSERT INTO wunderland_approval_queue (
            queue_id,
            post_id,
            seed_id,
            owner_user_id,
            content,
            manifest,
            status,
            timeout_ms,
            queued_at,
            decided_at,
            rejection_reason
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL)
        `,
        [queueId, postId, seedId, userId, content, manifestRaw, 'pending', timeoutMs, now]
      );

      return {
        queue: {
          queueId,
          postId,
          seedId,
          ownerUserId: userId,
          content,
          manifest,
          status: 'pending',
          queuedAt: new Date(now).toISOString(),
          decidedAt: null,
          rejectionReason: null,
        },
      };
    });
  }

  async listQueue(
    userId: string,
    query: ListApprovalQueueQueryDto = {}
  ): Promise<PaginatedResponse<ApprovalQueueItem>> {
    const page = Math.max(1, Number(query.page ?? 1));
    const limit = Math.min(50, Math.max(1, Number(query.limit ?? 25)));
    const offset = (page - 1) * limit;

    const where: string[] = ['owner_user_id = ?'];
    const params: Array<string | number> = [userId];

    if (query.status) {
      where.push('status = ?');
      params.push(query.status);
    }

    if (query.seedId) {
      where.push('seed_id = ?');
      params.push(query.seedId);
    }

    const whereSql = `WHERE ${where.join(' AND ')}`;

    const totalRow = await this.db.get<{ count: number }>(
      `SELECT COUNT(1) as count FROM wunderland_approval_queue ${whereSql}`,
      params
    );
    const total = totalRow?.count ?? 0;

    const rows = await this.db.all<any>(
      `
        SELECT
          queue_id,
          post_id,
          seed_id,
          owner_user_id,
          content,
          manifest,
          status,
          queued_at,
          decided_at,
          rejection_reason
        FROM wunderland_approval_queue
        ${whereSql}
        ORDER BY queued_at DESC
        LIMIT ? OFFSET ?
      `,
      [...params, limit, offset]
    );

    return {
      items: rows.map((row) => ({
        queueId: String(row.queue_id),
        postId: String(row.post_id),
        seedId: String(row.seed_id),
        ownerUserId: String(row.owner_user_id),
        content: String(row.content ?? ''),
        manifest: parseJsonOr<Record<string, unknown>>(row.manifest, {}),
        status: String(row.status ?? 'pending'),
        queuedAt: new Date(Number(row.queued_at ?? Date.now())).toISOString(),
        decidedAt: row.decided_at ? new Date(Number(row.decided_at)).toISOString() : null,
        rejectionReason: row.rejection_reason ?? null,
      })),
      page,
      limit,
      total,
    };
  }

  async decide(userId: string, queueId: string, dto: DecideApprovalDto) {
    const now = Date.now();
    let approvedPostId: string | null = null;

    const result = await this.db.transaction(async (trx) => {
      const entry = await trx.get<any>(
        'SELECT * FROM wunderland_approval_queue WHERE queue_id = ? AND owner_user_id = ? LIMIT 1',
        [queueId, userId]
      );
      if (!entry) throw new NotFoundException(`Approval queue entry "${queueId}" not found.`);

      if (entry.status !== 'pending') {
        return {
          queueId,
          status: entry.status,
          decidedAt: entry.decided_at ? new Date(Number(entry.decided_at)).toISOString() : null,
        };
      }

      if (dto.action === 'approve') {
        await trx.run(
          'UPDATE wunderland_approval_queue SET status = ?, decided_at = ?, rejection_reason = NULL WHERE queue_id = ?',
          ['approved', now, queueId]
        );
        await trx.run(
          `
            UPDATE wunderland_posts
               SET status = 'published',
                   content = COALESCE(?, content),
                   manifest = COALESCE(?, manifest),
                   published_at = COALESCE(published_at, ?)
             WHERE post_id = ?
          `,
          [entry.content ?? null, entry.manifest ?? null, now, entry.post_id]
        );
        await trx.run(
          'UPDATE wunderland_citizens SET total_posts = total_posts + 1 WHERE seed_id = ?',
          [entry.seed_id]
        );
        const postRow = await trx.get<{ reply_to_post_id: string | null }>(
          'SELECT reply_to_post_id FROM wunderland_posts WHERE post_id = ? LIMIT 1',
          [entry.post_id]
        );
        if (postRow?.reply_to_post_id) {
          await trx.run('UPDATE wunderland_posts SET replies = replies + 1 WHERE post_id = ?', [
            postRow.reply_to_post_id,
          ]);
        }
        approvedPostId = String(entry.post_id);
        return {
          queueId,
          action: 'approve',
          status: 'approved',
          decidedAt: new Date(now).toISOString(),
        };
      }

      await trx.run(
        'UPDATE wunderland_approval_queue SET status = ?, decided_at = ?, rejection_reason = ? WHERE queue_id = ?',
        ['rejected', now, dto.feedback ?? null, queueId]
      );
      await trx.run(`UPDATE wunderland_posts SET status = 'rejected' WHERE post_id = ?`, [
        entry.post_id,
      ]);

      return {
        queueId,
        action: 'reject',
        status: 'rejected',
        decidedAt: new Date(now).toISOString(),
      };
    });

    if (result?.status === 'approved' && approvedPostId) {
      this.wunderlandSol.scheduleAnchorForPost(approvedPostId);
    }

    return result;
  }
}
