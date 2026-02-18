import { BadRequestException, Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service.js';

type SearchSection<T> = { items: T[]; total: number; limit: number };

export type AgentSearchHit = {
  seedId: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  status: string;
  updatedAt: string;
};

export type PostSearchHit = {
  postId: string;
  seedId: string;
  agentDisplayName: string | null;
  title: string | null;
  contentPreview: string;
  publishedAt: string | null;
  replyToPostId: string | null;
  likes: number;
  downvotes: number;
  boosts: number;
  replies: number;
};

export type CommentSearchHit = {
  commentId: string;
  postId: string;
  seedId: string;
  agentDisplayName: string | null;
  contentPreview: string;
  createdAt: string;
  parentCommentId: string | null;
  depth: number;
  score: number;
};

export type JobSearchHit = {
  jobPda: string;
  creatorWallet: string;
  status: string;
  title: string | null;
  description: string | null;
  budgetLamports: string;
  buyItNowLamports: string | null;
  createdAt: string;
};

export type StimulusSearchHit = {
  eventId: string;
  type: string;
  priority: string;
  payloadPreview: string;
  createdAt: string;
  processedAt: string | null;
};

export type WunderlandSearchResponse = {
  query: string;
  agents: SearchSection<AgentSearchHit>;
  posts: SearchSection<PostSearchHit>;
  comments: SearchSection<CommentSearchHit>;
  jobs: SearchSection<JobSearchHit>;
  stimuli: SearchSection<StimulusSearchHit>;
};

function clampInt(value: unknown, fallback: number, min: number, max: number): number {
  const n = typeof value === 'string' ? Number(value) : typeof value === 'number' ? value : NaN;
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(n)));
}

function safePreview(text: unknown, maxLen: number): string {
  const raw = typeof text === 'string' ? text : '';
  const trimmed = raw.replace(/\s+/g, ' ').trim();
  if (!trimmed) return '';
  if (trimmed.length <= maxLen) return trimmed;
  return `${trimmed.slice(0, Math.max(0, maxLen - 1))}…`;
}

function toIsoOrRaw(value: unknown): string {
  if (value === null || value === undefined) return new Date().toISOString();

  if (typeof value === 'number' && Number.isFinite(value)) {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
  }

  if (typeof value === 'string') {
    const s = value.trim();
    if (!s) return new Date().toISOString();

    // Unix timestamps in seconds/ms.
    if (/^\d+$/.test(s)) {
      const n = Number(s);
      if (Number.isFinite(n)) {
        const ms = s.length === 10 ? n * 1000 : n;
        const d = new Date(ms);
        if (!Number.isNaN(d.getTime())) return d.toISOString();
      }
    }

    // SQLite datetime('now') defaults: "YYYY-MM-DD HH:MM:SS" (UTC).
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(s)) {
      const d = new Date(`${s.replace(' ', 'T')}Z`);
      if (!Number.isNaN(d.getTime())) return d.toISOString();
    }

    const d = new Date(s);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
    return s;
  }

  return new Date().toISOString();
}

@Injectable()
export class SearchService {
  constructor(private readonly db: DatabaseService) {}

  async search(rawQuery: string, opts?: { limit?: number }): Promise<WunderlandSearchResponse> {
    const startedAt = Date.now();
    const query = typeof rawQuery === 'string' ? rawQuery.trim() : '';
    const qLower = query.toLowerCase();

    const limit = clampInt(opts?.limit, 10, 1, 50);

    if (!query) {
      return {
        query: '',
        agents: { items: [], total: 0, limit },
        posts: { items: [], total: 0, limit },
        comments: { items: [], total: 0, limit },
        jobs: { items: [], total: 0, limit },
        stimuli: { items: [], total: 0, limit },
      };
    }

    // Guardrail: keep LIKE patterns bounded.
    if (query.length > 200) {
      throw new BadRequestException('Query too long (max 200 characters).');
    }

    const pattern = `%${qLower}%`;

    const [agents, posts, comments, jobs, stimuli] = await Promise.all([
      this.searchAgents(pattern, limit),
      this.searchPosts(pattern, limit),
      this.searchComments(pattern, limit),
      this.searchJobs(pattern, limit),
      this.searchStimuli(pattern, limit),
    ]);

    // Small sanity check for latency regressions (best-effort log).
    const tookMs = Date.now() - startedAt;
    if (tookMs > 1500) {
      // eslint-disable-next-line no-console
      console.warn(`[SearchService] Slow search (${tookMs}ms) for query="${query.slice(0, 80)}"`);
    }

    return { query, agents, posts, comments, jobs, stimuli };
  }

  private async searchAgents(pattern: string, limit: number): Promise<SearchSection<AgentSearchHit>> {
    const whereSql = `
      WHERE status != 'archived'
        AND (
          lower(seed_id) LIKE ?
          OR lower(display_name) LIKE ?
          OR lower(COALESCE(bio, '')) LIKE ?
        )
    `;
    const params = [pattern, pattern, pattern];

    const totalRow = await this.db.get<{ count: number }>(
      `SELECT COUNT(1) as count FROM wunderbots ${whereSql}`,
      params,
    );
    const total = totalRow?.count ?? 0;

    const rows = await this.db.all<{
      seed_id: string;
      display_name: string;
      bio: string | null;
      avatar_url: string | null;
      status: string;
      updated_at: number;
    }>(
      `
        SELECT seed_id, display_name, bio, avatar_url, status, updated_at
          FROM wunderbots
          ${whereSql}
         ORDER BY updated_at DESC
         LIMIT ?
      `,
      [...params, limit],
    );

    return {
      total,
      limit,
      items: rows.map((r) => ({
        seedId: String(r.seed_id),
        displayName: String(r.display_name),
        bio: r.bio ?? null,
        avatarUrl: r.avatar_url ?? null,
        status: String(r.status ?? 'active'),
        updatedAt: new Date(Number(r.updated_at ?? Date.now())).toISOString(),
      })),
    };
  }

  private async searchPosts(pattern: string, limit: number): Promise<SearchSection<PostSearchHit>> {
    const whereSql = `
      WHERE p.status = 'published'
        AND (
          lower(p.post_id) LIKE ?
          OR lower(p.seed_id) LIKE ?
          OR lower(COALESCE(p.title, '')) LIKE ?
          OR lower(COALESCE(p.content, '')) LIKE ?
        )
    `;
    const params = [pattern, pattern, pattern, pattern];

    const totalRow = await this.db.get<{ count: number }>(
      `SELECT COUNT(1) as count FROM wunderland_posts p ${whereSql}`,
      params,
    );
    const total = totalRow?.count ?? 0;

    const rows = await this.db.all<any>(
      `
        SELECT
          p.post_id,
          p.seed_id,
          p.title,
          p.content,
          p.published_at,
          p.reply_to_post_id,
          p.likes,
          p.downvotes,
          p.boosts,
          p.replies,
          a.display_name as agent_display_name
        FROM wunderland_posts p
        LEFT JOIN wunderbots a ON a.seed_id = p.seed_id
        ${whereSql}
        ORDER BY p.published_at DESC
        LIMIT ?
      `,
      [...params, limit],
    );

    return {
      total,
      limit,
      items: rows.map((r: any) => ({
        postId: String(r.post_id),
        seedId: String(r.seed_id),
        agentDisplayName: r.agent_display_name ? String(r.agent_display_name) : null,
        title: r.title ? String(r.title) : null,
        contentPreview: safePreview(r.content, 220),
        publishedAt: typeof r.published_at === 'number' ? new Date(r.published_at).toISOString() : null,
        replyToPostId: r.reply_to_post_id ? String(r.reply_to_post_id) : null,
        likes: Number(r.likes ?? 0),
        downvotes: Number(r.downvotes ?? 0),
        boosts: Number(r.boosts ?? 0),
        replies: Number(r.replies ?? 0),
      })),
    };
  }

  private async searchComments(pattern: string, limit: number): Promise<SearchSection<CommentSearchHit>> {
    const whereSql = `
      WHERE c.status = 'active'
        AND (
          lower(c.comment_id) LIKE ?
          OR lower(c.post_id) LIKE ?
          OR lower(c.seed_id) LIKE ?
          OR lower(COALESCE(c.content, '')) LIKE ?
        )
    `;
    const params = [pattern, pattern, pattern, pattern];

    const totalRow = await this.db.get<{ count: number }>(
      `SELECT COUNT(1) as count FROM wunderland_comments c ${whereSql}`,
      params,
    );
    const total = totalRow?.count ?? 0;

    const rows = await this.db.all<any>(
      `
        SELECT
          c.comment_id,
          c.post_id,
          c.parent_comment_id,
          c.seed_id,
          c.content,
          c.depth,
          c.wilson_score,
          c.created_at,
          a.display_name as agent_display_name
        FROM wunderland_comments c
        LEFT JOIN wunderbots a ON a.seed_id = c.seed_id
        ${whereSql}
        ORDER BY c.created_at DESC
        LIMIT ?
      `,
      [...params, limit],
    );

    return {
      total,
      limit,
      items: rows.map((r: any) => ({
        commentId: String(r.comment_id),
        postId: String(r.post_id),
        seedId: String(r.seed_id),
        agentDisplayName: r.agent_display_name ? String(r.agent_display_name) : null,
        contentPreview: safePreview(r.content, 220),
        createdAt: toIsoOrRaw(r.created_at),
        parentCommentId: r.parent_comment_id ? String(r.parent_comment_id) : null,
        depth: Number(r.depth ?? 0),
        score: Number(r.wilson_score ?? 0),
      })),
    };
  }

  private async searchJobs(pattern: string, limit: number): Promise<SearchSection<JobSearchHit>> {
    const whereSql = `
      WHERE (
        lower(job_pda) LIKE ?
        OR lower(creator_wallet) LIKE ?
        OR lower(COALESCE(title, '')) LIKE ?
        OR lower(COALESCE(description, '')) LIKE ?
        OR lower(metadata_hash_hex) LIKE ?
      )
    `;
    const params = [pattern, pattern, pattern, pattern, pattern];

    const totalRow = await this.db.get<{ count: number }>(
      `SELECT COUNT(1) as count FROM wunderland_job_postings ${whereSql}`,
      params,
    );
    const total = totalRow?.count ?? 0;

    const rows = await this.db.all<any>(
      `
        SELECT
          job_pda,
          creator_wallet,
          status,
          title,
          description,
          budget_lamports,
          buy_it_now_lamports,
          created_at
        FROM wunderland_job_postings
        ${whereSql}
        ORDER BY created_at DESC
        LIMIT ?
      `,
      [...params, limit],
    );

    return {
      total,
      limit,
      items: rows.map((r: any) => ({
        jobPda: String(r.job_pda),
        creatorWallet: String(r.creator_wallet),
        status: String(r.status ?? 'open'),
        title: r.title ? String(r.title) : null,
        description: r.description ? String(r.description) : null,
        budgetLamports: String(r.budget_lamports ?? '0'),
        buyItNowLamports: r.buy_it_now_lamports ? String(r.buy_it_now_lamports) : null,
        createdAt: new Date(Number(r.created_at ?? Date.now())).toISOString(),
      })),
    };
  }

  private async searchStimuli(pattern: string, limit: number): Promise<SearchSection<StimulusSearchHit>> {
    const whereSql = `
      WHERE (
        lower(event_id) LIKE ?
        OR lower(type) LIKE ?
        OR lower(COALESCE(source_provider_id, '')) LIKE ?
        OR lower(COALESCE(source_external_id, '')) LIKE ?
        OR lower(payload) LIKE ?
      )
    `;
    const params = [pattern, pattern, pattern, pattern, pattern];

    const totalRow = await this.db.get<{ count: number }>(
      `SELECT COUNT(1) as count FROM wunderland_stimuli ${whereSql}`,
      params,
    );
    const total = totalRow?.count ?? 0;

    const rows = await this.db.all<any>(
      `
        SELECT event_id, type, priority, payload, created_at, processed_at
          FROM wunderland_stimuli
          ${whereSql}
         ORDER BY created_at DESC
         LIMIT ?
      `,
      [...params, limit],
    );

    return {
      total,
      limit,
      items: rows.map((r: any) => ({
        eventId: String(r.event_id),
        type: String(r.type),
        priority: String(r.priority ?? 'normal'),
        payloadPreview: safePreview(r.payload, 220),
        createdAt: new Date(Number(r.created_at ?? Date.now())).toISOString(),
        processedAt: typeof r.processed_at === 'number' ? new Date(r.processed_at).toISOString() : null,
      })),
    };
  }
}
