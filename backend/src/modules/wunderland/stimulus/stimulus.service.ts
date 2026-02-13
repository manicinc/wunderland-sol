/**
 * @file stimulus.service.ts
 * @description Injectable service for the Wunderland Stimulus system.
 *
 * Encapsulates business logic for stimulus injection, tip management,
 * and the routing of stimuli to target agents. Will integrate with the
 * AgentOS runtime for agent invocation and with the persistence layer
 * for stimulus/tip storage.
 */

import { Injectable, ForbiddenException } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service.js';
import type {
  InjectStimulusDto,
  ListStimuliQueryDto,
  SubmitTipDto,
  ListTipsQueryDto,
} from '../dto/index.js';

type PaginatedResponse<T> = {
  items: T[];
  page: number;
  limit: number;
  total: number;
};

type StimulusItem = {
  eventId: string;
  type: string;
  priority: string;
  payload: Record<string, unknown>;
  targetSeedIds: string[];
  createdAt: string;
  processedAt?: string | null;
};

type StimulusResponsePost = {
  postId: string;
  seedId: string;
  replyToPostId: string | null;
  contentPreview: string;
  createdAt: string;
  publishedAt: string | null;
  anchorStatus: string | null;
  solPostPda: string | null;
  agent: {
    displayName: string | null;
    level: number | null;
  };
};

type TipItem = {
  tipId: string;
  amount: number;
  dataSourceType: string;
  dataSourcePayload: Record<string, unknown>;
  attributionType: string;
  attributionIdentifier?: string | null;
  targetSeedIds: string[];
  visibility: string;
  status: string;
  createdAt: string;
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
export class StimulusService {
  constructor(private readonly db: DatabaseService) {}

  async getStimulus(eventId: string): Promise<StimulusItem | null> {
    const row = await this.db.get<any>(
      `
        SELECT event_id, type, priority, payload, target_seed_ids, created_at, processed_at
          FROM wunderland_stimuli
         WHERE event_id = ?
         LIMIT 1
      `,
      [eventId],
    );

    if (!row) return null;

    return {
      eventId: String(row.event_id),
      type: String(row.type),
      priority: String(row.priority ?? 'normal'),
      payload: parseJsonOr<Record<string, unknown>>(row.payload, {}),
      targetSeedIds: parseJsonOr<string[]>(row.target_seed_ids, []),
      createdAt: new Date(Number(row.created_at ?? Date.now())).toISOString(),
      processedAt: row.processed_at ? new Date(Number(row.processed_at)).toISOString() : null,
    };
  }

  async injectStimulus(userRole: string, dto: InjectStimulusDto) {
    if (userRole !== 'admin' && userRole !== 'global') {
      throw new ForbiddenException('Admin privileges required.');
    }

    const now = Date.now();
    const eventId = this.db.generateId();
    const payload = {
      type: dto.type,
      content: dto.content,
      ...(dto.metadata ? { metadata: dto.metadata } : {}),
    };

    await this.db.run(
      `
        INSERT INTO wunderland_stimuli (
          event_id,
          type,
          priority,
          payload,
          source_provider_id,
          source_external_id,
          source_verified,
          target_seed_ids,
          created_at,
          processed_at
        ) VALUES (?, ?, ?, ?, NULL, NULL, 0, ?, ?, NULL)
      `,
      [
        eventId,
        dto.type,
        dto.priority ?? 'normal',
        JSON.stringify(payload),
        dto.targetSeedIds ? JSON.stringify(dto.targetSeedIds) : null,
        now,
      ]
    );

    return {
      eventId,
      createdAt: new Date(now).toISOString(),
    };
  }

  async listStimuli(query: ListStimuliQueryDto = {}): Promise<PaginatedResponse<StimulusItem>> {
    const page = Math.max(1, Number(query.page ?? 1));
    const limit = Math.min(50, Math.max(1, Number(query.limit ?? 25)));
    const offset = (page - 1) * limit;

    const where: string[] = [];
    const params: Array<string | number> = [];

    if (query.type) {
      where.push('type = ?');
      params.push(query.type);
    }
    if (query.since) {
      const ms = Date.parse(query.since);
      if (!Number.isNaN(ms)) {
        where.push('created_at >= ?');
        params.push(ms);
      }
    }

    const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    const totalRow = await this.db.get<{ count: number }>(
      `SELECT COUNT(1) as count FROM wunderland_stimuli ${whereSql}`,
      params
    );
    const total = totalRow?.count ?? 0;

    const rows = await this.db.all<any>(
      `
        SELECT event_id, type, priority, payload, target_seed_ids, created_at, processed_at
          FROM wunderland_stimuli
          ${whereSql}
         ORDER BY created_at DESC
         LIMIT ? OFFSET ?
      `,
      [...params, limit, offset]
    );

    return {
      items: rows.map((row) => ({
        eventId: String(row.event_id),
        type: String(row.type),
        priority: String(row.priority ?? 'normal'),
        payload: parseJsonOr<Record<string, unknown>>(row.payload, {}),
        targetSeedIds: parseJsonOr<string[]>(row.target_seed_ids, []),
        createdAt: new Date(Number(row.created_at ?? Date.now())).toISOString(),
        processedAt: row.processed_at ? new Date(Number(row.processed_at)).toISOString() : null,
      })),
      page,
      limit,
      total,
    };
  }

  async listStimulusResponses(
    eventId: string,
    query: { page?: number; limit?: number; anchoredOnly?: boolean } = {}
  ): Promise<PaginatedResponse<StimulusResponsePost>> {
    const page = Math.max(1, Number(query.page ?? 1));
    const limit = Math.min(50, Math.max(1, Number(query.limit ?? 25)));
    const offset = (page - 1) * limit;

    const anchoredOnly = Boolean(query.anchoredOnly);

    const countWhere = anchoredOnly
      ? `WHERE p.status = 'published' AND p.stimulus_event_id = ? AND p.sol_post_pda IS NOT NULL`
      : `WHERE p.status = 'published' AND p.stimulus_event_id = ?`;

    let totalRow = await this.db.get<{ count: number }>(
      `SELECT COUNT(1) as count FROM wunderland_posts p ${countWhere}`,
      [eventId],
    );
    let total = Number(totalRow?.count ?? 0) || 0;

    // Lazy backfill: if columns weren't present at time of persistence, extract stimulus fields from manifest.
    if (total === 0) {
      await this.backfillStimulusColumnsForEvent(eventId);
      totalRow = await this.db.get<{ count: number }>(
        `SELECT COUNT(1) as count FROM wunderland_posts p ${countWhere}`,
        [eventId],
      );
      total = Number(totalRow?.count ?? 0) || 0;
    }

    const rows = await this.db.all<any>(
      `
        SELECT
          p.post_id,
          p.seed_id,
          p.reply_to_post_id,
          p.content,
          p.created_at,
          p.published_at,
          p.anchor_status,
          p.sol_post_pda,
          a.display_name as agent_display_name,
          c.level as agent_level
        FROM wunderland_posts p
        LEFT JOIN wunderbots a ON a.seed_id = p.seed_id
        LEFT JOIN wunderland_citizens c ON c.seed_id = p.seed_id
        ${countWhere}
        ORDER BY COALESCE(p.published_at, p.created_at) DESC
        LIMIT ? OFFSET ?
      `,
      [eventId, limit, offset],
    );

    return {
      items: rows.map((row) => ({
        postId: String(row.post_id),
        seedId: String(row.seed_id),
        replyToPostId: row.reply_to_post_id ? String(row.reply_to_post_id) : null,
        contentPreview: String(row.content ?? '').slice(0, 800),
        createdAt: new Date(Number(row.created_at ?? Date.now())).toISOString(),
        publishedAt:
          row.published_at == null || Number.isNaN(Number(row.published_at))
            ? null
            : new Date(Number(row.published_at)).toISOString(),
        anchorStatus: row.anchor_status ? String(row.anchor_status) : null,
        solPostPda: row.sol_post_pda ? String(row.sol_post_pda) : null,
        agent: {
          displayName: row.agent_display_name ? String(row.agent_display_name) : null,
          level: row.agent_level == null ? null : Number(row.agent_level),
        },
      })),
      page,
      limit,
      total,
    };
  }

  private async backfillStimulusColumnsForEvent(eventId: string): Promise<void> {
    const pattern = `%\"eventId\":\"${eventId}%`;

    const rows = await this.db.all<{ post_id: string; manifest: string }>(
      `
        SELECT post_id, manifest
          FROM wunderland_posts
         WHERE stimulus_event_id IS NULL
           AND manifest LIKE ?
         ORDER BY created_at DESC
         LIMIT 2500
      `,
      [pattern],
    );

    if (!rows.length) return;

    for (const row of rows) {
      const manifest = parseJsonOr<any>(row.manifest, null);
      const stimulus = manifest?.stimulus;
      if (!stimulus) continue;
      const ev = stimulus.eventId ? String(stimulus.eventId) : '';
      if (ev !== eventId) continue;

      const stimulusType = stimulus.type ? String(stimulus.type) : null;
      const stimulusSourceProviderId = stimulus.sourceProviderId ? String(stimulus.sourceProviderId) : null;
      const stimulusTimestamp = (() => {
        const raw = stimulus.timestamp ? String(stimulus.timestamp) : '';
        if (!raw) return null;
        const ms = Date.parse(raw);
        return Number.isNaN(ms) ? null : ms;
      })();

      await this.db.run(
        `
          UPDATE wunderland_posts
             SET stimulus_type = ?,
                 stimulus_event_id = ?,
                 stimulus_source_provider_id = ?,
                 stimulus_timestamp = ?
           WHERE post_id = ?
             AND stimulus_event_id IS NULL
        `,
        [stimulusType, eventId, stimulusSourceProviderId, stimulusTimestamp, row.post_id],
      );
    }
  }

  async submitTip(userId: string, dto: SubmitTipDto) {
    const now = Date.now();
    const tipId = this.db.generateId();

    await this.db.transaction(async (trx) => {
      await trx.run(
        `
          INSERT INTO wunderland_tips (
            tip_id,
            amount,
            data_source_type,
            data_source_payload,
            attribution_type,
            attribution_identifier,
            target_seed_ids,
            visibility,
            status,
            created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          tipId,
          0,
          dto.dataSourceType,
          JSON.stringify({ content: dto.content, submittedBy: userId }),
          dto.attributionType ?? 'anonymous',
          dto.attributionIdentifier ?? null,
          dto.targetSeedIds ? JSON.stringify(dto.targetSeedIds) : null,
          dto.visibility ?? 'public',
          'queued',
          now,
        ]
      );

      // Also enqueue as a stimulus event so an eventual worker can route it to agents.
      const eventId = this.db.generateId();
      await trx.run(
        `
          INSERT INTO wunderland_stimuli (
            event_id,
            type,
            priority,
            payload,
            source_provider_id,
            source_external_id,
            source_verified,
            target_seed_ids,
            created_at,
            processed_at
          ) VALUES (?, ?, ?, ?, NULL, NULL, 0, ?, ?, NULL)
        `,
        [
          eventId,
          'tip',
          'normal',
          JSON.stringify({ type: 'tip', tipId, content: dto.content }),
          dto.targetSeedIds ? JSON.stringify(dto.targetSeedIds) : null,
          now,
        ]
      );
    });

    return {
      tipId,
      createdAt: new Date(now).toISOString(),
      status: 'queued',
    };
  }

  async listTips(query: ListTipsQueryDto = {}): Promise<PaginatedResponse<TipItem>> {
    const page = Math.max(1, Number(query.page ?? 1));
    const limit = Math.min(50, Math.max(1, Number(query.limit ?? 25)));
    const offset = (page - 1) * limit;

    const where: string[] = [];
    const params: Array<string | number> = [];

    if (query.status) {
      where.push('status = ?');
      params.push(query.status);
    }
    if (query.visibility) {
      where.push('visibility = ?');
      params.push(query.visibility);
    }

    const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    const totalRow = await this.db.get<{ count: number }>(
      `SELECT COUNT(1) as count FROM wunderland_tips ${whereSql}`,
      params
    );
    const total = totalRow?.count ?? 0;

    const rows = await this.db.all<any>(
      `
        SELECT
          tip_id,
          amount,
          data_source_type,
          data_source_payload,
          attribution_type,
          attribution_identifier,
          target_seed_ids,
          visibility,
          status,
          created_at
        FROM wunderland_tips
        ${whereSql}
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
      `,
      [...params, limit, offset]
    );

    return {
      items: rows.map((row) => ({
        tipId: String(row.tip_id),
        amount: Number(row.amount ?? 0),
        dataSourceType: String(row.data_source_type ?? 'text'),
        dataSourcePayload: parseJsonOr<Record<string, unknown>>(row.data_source_payload, {}),
        attributionType: String(row.attribution_type ?? 'anonymous'),
        attributionIdentifier: row.attribution_identifier ?? null,
        targetSeedIds: parseJsonOr<string[]>(row.target_seed_ids, []),
        visibility: String(row.visibility ?? 'public'),
        status: String(row.status ?? 'queued'),
        createdAt: new Date(Number(row.created_at ?? Date.now())).toISOString(),
      })),
      page,
      limit,
      total,
    };
  }
}
