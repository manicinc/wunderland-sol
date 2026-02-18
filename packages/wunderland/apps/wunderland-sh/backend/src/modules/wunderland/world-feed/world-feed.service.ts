/**
 * @file world-feed.service.ts
 * @description Injectable service for the Wunderland World Feed.
 *
 * Encapsulates business logic for world event ingestion, source management,
 * and feed item retrieval. Will integrate with RSS parsing libraries,
 * HTTP polling schedulers, and the persistence layer.
 */

import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service.js';
import type {
  CreateWorldFeedItemDto,
  CreateWorldFeedSourceDto,
  ListWorldFeedQueryDto,
} from '../dto/index.js';

type PaginatedResponse<T> = {
  items: T[];
  page: number;
  limit: number;
  total: number;
};

type WorldFeedItem = {
  eventId: string;
  sourceId?: string | null;
  title: string;
  summary?: string | null;
  url?: string | null;
  category?: string | null;
  createdAt: string;
};

type WorldFeedSource = {
  sourceId: string;
  name: string;
  type: string;
  url?: string | null;
  pollIntervalMs?: number | null;
  categories?: string[];
  isActive: boolean;
  lastPolledAt?: string | null;
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

function deriveWebhookExternalId(
  sourceId: string,
  dto: Pick<CreateWorldFeedItemDto, 'externalId' | 'title' | 'summary' | 'url' | 'category'>
): string {
  const provided = dto.externalId?.trim() ?? '';
  if (provided) return provided.slice(0, 256);

  const key = [
    sourceId,
    dto.title ?? '',
    dto.url ?? '',
    dto.category ?? '',
    dto.summary ?? '',
  ].join('|');
  return createHash('sha256').update(key, 'utf8').digest('hex');
}

@Injectable()
export class WorldFeedService {
  constructor(private readonly db: DatabaseService) {}

  async createItem(
    userRole: string,
    dto: CreateWorldFeedItemDto
  ): Promise<{ item: WorldFeedItem }> {
    if (userRole !== 'admin' && userRole !== 'global') {
      throw new ForbiddenException('Admin privileges required.');
    }

    const now = Date.now();
    const eventId = this.db.generateId();
    const sourceId = dto.sourceId?.trim() || null;
    const externalId = dto.externalId?.trim() || null;

    if (sourceId) {
      const exists = await this.db.get<{ source_id: string }>(
        'SELECT source_id FROM wunderland_world_feed_sources WHERE source_id = ? LIMIT 1',
        [sourceId]
      );
      if (!exists) {
        throw new NotFoundException(`World feed source "${sourceId}" not found.`);
      }
    }

    const payload = {
      title: dto.title,
      summary: dto.summary ?? null,
      url: dto.url ?? null,
      category: dto.category ?? null,
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
        ) VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, NULL)
      `,
      [
        eventId,
        'world_feed',
        'normal',
        JSON.stringify(payload),
        sourceId,
        externalId,
        dto.verified ? 1 : 0,
        now,
      ]
    );

    return {
      item: {
        eventId,
        sourceId,
        title: dto.title,
        summary: dto.summary ?? null,
        url: dto.url ?? null,
        category: dto.category ?? null,
        createdAt: new Date(now).toISOString(),
      },
    };
  }

  async ingestWebhookItem(
    sourceIdRaw: string,
    secret: string | undefined,
    dto: CreateWorldFeedItemDto
  ): Promise<
    | { inserted: true; item: WorldFeedItem }
    | { inserted: false; duplicate: true; externalId: string }
  > {
    const expectedSecret = process.env.WUNDERLAND_WORLD_FEED_WEBHOOK_SECRET;
    if (!expectedSecret) {
      // Treat as disabled; avoid leaking whether the source exists.
      throw new NotFoundException();
    }

    if (!secret || secret !== expectedSecret) {
      throw new UnauthorizedException('Invalid webhook secret.');
    }

    const sourceId = sourceIdRaw.trim();
    if (!sourceId) {
      throw new BadRequestException('sourceId is required.');
    }

    const source = await this.db.get<{
      source_id: string;
      type: string;
      categories: string | null;
      is_active: number;
    }>(
      `
        SELECT source_id, type, categories, is_active
          FROM wunderland_world_feed_sources
         WHERE source_id = ?
         LIMIT 1
      `,
      [sourceId]
    );

    if (!source) {
      throw new NotFoundException(`World feed source "${sourceId}" not found.`);
    }
    if (String(source.type) !== 'webhook') {
      throw new BadRequestException(`World feed source "${sourceId}" is not a webhook source.`);
    }
    if (!Boolean(source.is_active)) {
      throw new ForbiddenException(`World feed source "${sourceId}" is inactive.`);
    }

    const sourceCategories = parseJsonOr<string[]>(source.categories, []);
    const category = dto.category?.trim() || sourceCategories[0] || undefined;

    const externalId = deriveWebhookExternalId(sourceId, {
      externalId: dto.externalId,
      title: dto.title,
      summary: dto.summary,
      url: dto.url,
      category,
    });

    const existing = await this.db.get<{ event_id: string }>(
      `
        SELECT event_id
          FROM wunderland_stimuli
         WHERE type = 'world_feed'
           AND source_provider_id = ?
           AND source_external_id = ?
         LIMIT 1
      `,
      [sourceId, externalId]
    );
    if (existing) {
      return { inserted: false, duplicate: true, externalId };
    }

    const now = Date.now();
    const eventId = this.db.generateId();
    const payload = {
      title: dto.title,
      summary: dto.summary ?? null,
      url: dto.url ?? null,
      category: category ?? null,
    };

    await this.db.transaction(async (trx) => {
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
          ) VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, NULL)
        `,
        [
          eventId,
          'world_feed',
          'normal',
          JSON.stringify(payload),
          sourceId,
          externalId,
          1,
          now,
        ]
      );

      await trx.run(
        'UPDATE wunderland_world_feed_sources SET last_polled_at = ? WHERE source_id = ?',
        [now, sourceId]
      );
    });

    return {
      inserted: true,
      item: {
        eventId,
        sourceId,
        title: dto.title,
        summary: dto.summary ?? null,
        url: dto.url ?? null,
        category,
        createdAt: new Date(now).toISOString(),
      },
    };
  }

  async listWorldFeed(
    query: ListWorldFeedQueryDto = {}
  ): Promise<PaginatedResponse<WorldFeedItem>> {
    const page = Math.max(1, Number(query.page ?? 1));
    const limit = Math.min(50, Math.max(1, Number(query.limit ?? 20)));
    const offset = (page - 1) * limit;

    const where: string[] = ["type = 'world_feed'"];
    const params: Array<string | number> = [];

    if (query.sourceId) {
      where.push('source_provider_id = ?');
      params.push(query.sourceId);
    }
    if (query.since) {
      const ms = Date.parse(query.since);
      if (!Number.isNaN(ms)) {
        where.push('created_at >= ?');
        params.push(ms);
      }
    }
    if (query.category) {
      where.push('payload LIKE ?');
      params.push(`%"category":"${query.category}"%`);
    }
    if (query.q) {
      where.push('payload LIKE ?');
      params.push(`%${query.q.replace(/[%_]/g, '\\$&')}%`);
    }

    const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    const totalRow = await this.db.get<{ count: number }>(
      `SELECT COUNT(1) as count FROM wunderland_stimuli ${whereSql}`,
      params
    );
    const total = totalRow?.count ?? 0;

    const rows = await this.db.all<any>(
      `
        SELECT event_id, source_provider_id, payload, created_at
          FROM wunderland_stimuli
          ${whereSql}
         ORDER BY created_at DESC
         LIMIT ? OFFSET ?
      `,
      [...params, limit, offset]
    );

    return {
      items: rows.map((row) => {
        const payload = parseJsonOr<any>(row.payload, {});
        return {
          eventId: String(row.event_id),
          sourceId: row.source_provider_id ?? null,
          title: String(payload.title ?? payload.content ?? payload.summary ?? 'World feed item'),
          summary: payload.summary ?? null,
          url: payload.url ?? null,
          category: payload.category ?? null,
          createdAt: new Date(Number(row.created_at ?? Date.now())).toISOString(),
        };
      }),
      page,
      limit,
      total,
    };
  }

  async listSources(): Promise<{ items: WorldFeedSource[] }> {
    const rows = await this.db.all<any>(
      `
        SELECT
          source_id,
          name,
          type,
          url,
          poll_interval_ms,
          categories,
          is_active,
          last_polled_at,
          created_at
        FROM wunderland_world_feed_sources
        ORDER BY created_at DESC
      `
    );

    return {
      items: rows.map((row) => ({
        sourceId: String(row.source_id),
        name: String(row.name ?? ''),
        type: String(row.type ?? ''),
        url: row.url ?? null,
        pollIntervalMs: row.poll_interval_ms ?? null,
        categories: parseJsonOr<string[]>(row.categories, []),
        isActive: Boolean(row.is_active),
        lastPolledAt: row.last_polled_at
          ? new Date(Number(row.last_polled_at)).toISOString()
          : null,
        createdAt: new Date(Number(row.created_at ?? Date.now())).toISOString(),
      })),
    };
  }

  async createSource(
    userRole: string,
    dto: CreateWorldFeedSourceDto
  ): Promise<{ source: WorldFeedSource }> {
    if (userRole !== 'admin' && userRole !== 'global') {
      throw new ForbiddenException('Admin privileges required.');
    }

    const now = Date.now();
    const sourceId = this.db.generateId();

    await this.db.run(
      `
        INSERT INTO wunderland_world_feed_sources (
          source_id,
          name,
          type,
          url,
          poll_interval_ms,
          categories,
          is_active,
          last_polled_at,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?)
      `,
      [
        sourceId,
        dto.name,
        dto.type,
        dto.url ?? null,
        dto.pollIntervalMs ?? 300000,
        dto.categories ? JSON.stringify(dto.categories) : JSON.stringify([]),
        dto.isActive === false ? 0 : 1,
        now,
      ]
    );

    const row = await this.db.get<any>(
      'SELECT * FROM wunderland_world_feed_sources WHERE source_id = ? LIMIT 1',
      [sourceId]
    );

    return {
      source: {
        sourceId,
        name: String(row?.name ?? dto.name),
        type: String(row?.type ?? dto.type),
        url: row?.url ?? dto.url ?? null,
        pollIntervalMs: row?.poll_interval_ms ?? dto.pollIntervalMs ?? 300000,
        categories: parseJsonOr<string[]>(row?.categories, dto.categories ?? []),
        isActive: Boolean(row?.is_active ?? 1),
        lastPolledAt: row?.last_polled_at
          ? new Date(Number(row.last_polled_at)).toISOString()
          : null,
        createdAt: row?.created_at
          ? new Date(Number(row.created_at)).toISOString()
          : new Date(now).toISOString(),
      },
    };
  }

  async removeSource(
    userRole: string,
    sourceId: string
  ): Promise<{ sourceId: string; removed: boolean }> {
    if (userRole !== 'admin' && userRole !== 'global') {
      throw new ForbiddenException('Admin privileges required.');
    }
    await this.db.run('DELETE FROM wunderland_world_feed_sources WHERE source_id = ?', [sourceId]);
    return { sourceId, removed: true };
  }
}
