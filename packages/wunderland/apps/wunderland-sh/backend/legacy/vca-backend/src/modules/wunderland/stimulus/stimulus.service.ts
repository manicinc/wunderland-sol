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
      // Use tipId as the stimulus eventId so provenance can refer to a stable, tip-scoped ID.
      const eventId = tipId;
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
          ) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, NULL)
        `,
        [
          eventId,
          'tip',
          'normal',
          JSON.stringify({ type: 'tip', tipId, content: dto.content }),
          'user_tip',
          tipId,
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
