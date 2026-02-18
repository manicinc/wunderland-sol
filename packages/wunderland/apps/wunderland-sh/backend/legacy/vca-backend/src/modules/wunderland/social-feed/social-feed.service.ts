/**
 * @file social-feed.service.ts
 * @description Injectable service for the Wunderland Social Feed.
 *
 * Encapsulates business logic for feed retrieval, post storage,
 * engagement tracking, and reply thread management. Will be wired
 * to the AgentOS provenance layer for InputManifest validation
 * and to a persistence layer for post storage.
 */

import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service.js';
import { PostNotFoundException } from '../wunderland.exceptions.js';
import type { FeedQueryDto, EngagePostDto } from '../dto/index.js';

@Injectable()
export class SocialFeedService {
  constructor(private readonly db: DatabaseService) {}

  async getFeed(query: FeedQueryDto = {}) {
    return this.getFeedInternal({ ...query });
  }

  async getAgentFeed(seedId: string, query: FeedQueryDto = {}) {
    return this.getFeedInternal({ ...query, seedId });
  }

  async getPost(postId: string) {
    const row = await this.db.get<any>(
      `
        SELECT
          p.*,
          a.display_name as agent_display_name,
          a.avatar_url as agent_avatar_url,
          a.provenance_enabled as agent_provenance_enabled,
          c.level as agent_level,
          c.xp as agent_xp
        FROM wunderland_posts p
        LEFT JOIN wunderland_agents a ON a.seed_id = p.seed_id
        LEFT JOIN wunderland_citizens c ON c.seed_id = p.seed_id
        WHERE p.post_id = ? LIMIT 1
      `,
      [postId]
    );

    if (!row) throw new PostNotFoundException(postId);

    return {
      post: this.mapPost(row),
    };
  }

  async getThread(postId: string) {
    const root = await this.db.get<{ post_id: string }>(
      'SELECT post_id FROM wunderland_posts WHERE post_id = ? LIMIT 1',
      [postId]
    );
    if (!root) throw new PostNotFoundException(postId);

    const replies = await this.db.all<any>(
      `
        SELECT
          p.*,
          a.display_name as agent_display_name,
          a.avatar_url as agent_avatar_url,
          a.provenance_enabled as agent_provenance_enabled,
          c.level as agent_level
        FROM wunderland_posts p
        LEFT JOIN wunderland_agents a ON a.seed_id = p.seed_id
        LEFT JOIN wunderland_citizens c ON c.seed_id = p.seed_id
        WHERE p.reply_to_post_id = ?
        ORDER BY p.created_at ASC
      `,
      [postId]
    );

    return {
      postId,
      replies: replies.map((row) => this.mapPost(row)),
      total: replies.length,
    };
  }

  async engagePost(postId: string, userId: string, dto: EngagePostDto) {
    const now = Date.now();
    const post = await this.db.get<{
      post_id: string;
      likes: number;
      boosts: number;
      replies: number;
    }>('SELECT post_id, likes, boosts, replies FROM wunderland_posts WHERE post_id = ? LIMIT 1', [
      postId,
    ]);
    if (!post) throw new PostNotFoundException(postId);

    // Ensure actor seed exists and belongs to the current user (prevents arbitrary spoofing).
    const actor = await this.db.get<{ seed_id: string }>(
      'SELECT seed_id FROM wunderland_agents WHERE seed_id = ? AND owner_user_id = ? AND status != ? LIMIT 1',
      [dto.seedId, userId, 'archived']
    );
    if (!actor) {
      return {
        postId,
        applied: false,
        reason: `Agent "${dto.seedId}" not found or not owned by current user.`,
      };
    }

    const actionId = this.db.generateId();
    await this.db.run(
      `
        INSERT INTO wunderland_engagement_actions (
          action_id, post_id, actor_seed_id, type, payload, timestamp
        ) VALUES (?, ?, ?, ?, ?, ?)
      `,
      [
        actionId,
        postId,
        dto.seedId,
        dto.action,
        dto.content ? JSON.stringify({ content: dto.content }) : null,
        now,
      ]
    );

    if (dto.action === 'like') {
      await this.db.run('UPDATE wunderland_posts SET likes = likes + 1 WHERE post_id = ?', [
        postId,
      ]);
    } else if (dto.action === 'boost') {
      await this.db.run('UPDATE wunderland_posts SET boosts = boosts + 1 WHERE post_id = ?', [
        postId,
      ]);
    } else if (dto.action === 'reply') {
      await this.db.run('UPDATE wunderland_posts SET replies = replies + 1 WHERE post_id = ?', [
        postId,
      ]);
    } else if (dto.action === 'report') {
      // no counter today; stored as an engagement action only
    }

    const updated = await this.db.get<{ likes: number; boosts: number; replies: number }>(
      'SELECT likes, boosts, replies FROM wunderland_posts WHERE post_id = ? LIMIT 1',
      [postId]
    );

    return {
      postId,
      applied: true,
      actionId,
      counts: updated ?? { likes: post.likes, boosts: post.boosts, replies: post.replies },
      timestamp: new Date(now).toISOString(),
    };
  }

  private async getFeedInternal(query: FeedQueryDto & { seedId?: string }) {
    const page = Math.max(1, Number(query.page ?? 1));
    const limit = Math.min(50, Math.max(1, Number(query.limit ?? 10)));
    const offset = (page - 1) * limit;

    const where: string[] = ["p.status = 'published'"];
    const params: Array<string | number> = [];

    if (query.seedId) {
      where.push('p.seed_id = ?');
      params.push(query.seedId);
    }

    if (query.since) {
      const ms = Date.parse(query.since);
      if (!Number.isNaN(ms)) {
        where.push('p.published_at >= ?');
        params.push(ms);
      }
    }

    if (query.until) {
      const ms = Date.parse(query.until);
      if (!Number.isNaN(ms)) {
        where.push('p.published_at <= ?');
        params.push(ms);
      }
    }

    if (query.topic && query.topic !== 'all') {
      where.push('p.subreddit_id = ?');
      params.push(query.topic);
    }

    const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    const totalRow = await this.db.get<{ count: number }>(
      `SELECT COUNT(1) as count FROM wunderland_posts p ${whereSql}`,
      params
    );
    const total = totalRow?.count ?? 0;

    const sort = query.sort ?? 'recent';
    const orderSql =
      sort === 'top'
        ? 'ORDER BY p.likes DESC, p.boosts DESC, p.published_at DESC'
        : sort === 'trending'
          ? 'ORDER BY (p.likes + (p.boosts * 2) + (p.replies * 3)) DESC, p.published_at DESC'
          : 'ORDER BY p.published_at DESC';

    const rows = await this.db.all<any>(
      `
        SELECT
          p.*,
          a.display_name as agent_display_name,
          a.avatar_url as agent_avatar_url,
          a.provenance_enabled as agent_provenance_enabled,
          c.level as agent_level
        FROM wunderland_posts p
        LEFT JOIN wunderland_agents a ON a.seed_id = p.seed_id
        LEFT JOIN wunderland_citizens c ON c.seed_id = p.seed_id
        ${whereSql}
        ${orderSql}
        LIMIT ? OFFSET ?
      `,
      [...params, limit, offset]
    );

    return {
      items: rows.map((row) => this.mapPost(row)),
      page,
      limit,
      total,
    };
  }

  private mapPost(row: any) {
    const publishedAtMs = typeof row.published_at === 'number' ? row.published_at : null;
    const createdAtMs = typeof row.created_at === 'number' ? row.created_at : publishedAtMs;
    return {
      postId: String(row.post_id),
      seedId: String(row.seed_id),
      title: row.title ?? null,
      content: String(row.content ?? ''),
      manifest: this.parseJson(row.manifest, {}),
      status: String(row.status ?? 'unknown'),
      replyToPostId: row.reply_to_post_id ?? null,
      topic: row.subreddit_id ?? null,
      proof: {
        anchorStatus: row.anchor_status ?? null,
        anchorError: row.anchor_error ?? null,
        anchoredAt:
          typeof row.anchored_at === 'number' ? new Date(row.anchored_at).toISOString() : null,
        contentHashHex: row.content_hash_hex ?? null,
        manifestHashHex: row.manifest_hash_hex ?? null,
        contentCid: row.content_cid ?? null,
        manifestCid: row.manifest_cid ?? null,
        solana: {
          cluster: row.sol_cluster ?? null,
          programId: row.sol_program_id ?? null,
          enclavePda: row.sol_enclave_pda ?? null,
          postPda: row.sol_post_pda ?? null,
          txSignature: row.sol_tx_signature ?? null,
          entryIndex:
            typeof row.sol_entry_index === 'number'
              ? Number(row.sol_entry_index)
              : row.sol_entry_index
                ? Number(row.sol_entry_index)
                : null,
        },
      },
      counts: {
        likes: Number(row.likes ?? 0),
        boosts: Number(row.boosts ?? 0),
        replies: Number(row.replies ?? 0),
        views: Number(row.views ?? 0),
      },
      createdAt: createdAtMs ? new Date(createdAtMs).toISOString() : new Date().toISOString(),
      publishedAt: publishedAtMs ? new Date(publishedAtMs).toISOString() : null,
      agent: {
        seedId: String(row.seed_id),
        displayName: row.agent_display_name ?? null,
        avatarUrl: row.agent_avatar_url ?? null,
        level: row.agent_level ? Number(row.agent_level) : null,
        provenanceEnabled: Boolean(row.agent_provenance_enabled),
      },
    };
  }

  private parseJson(raw: unknown, fallback: any) {
    if (typeof raw !== 'string') return fallback;
    if (!raw.trim()) return fallback;
    try {
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  }
}
