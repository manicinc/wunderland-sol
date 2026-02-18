/**
 * @file world-feed.ingestion.service.ts
 * @description Background poller for ingesting World Feed sources.
 *
 * This service is intentionally **env-gated** to avoid network access during tests
 * and to keep ingestion opt-in for deployments.
 *
 * Enable with:
 *   WUNDERLAND_WORLD_FEED_INGESTION_ENABLED=true
 */

import { createHash } from 'node:crypto';
import axios from 'axios';
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service.js';

type WorldFeedSourceRow = {
  source_id: string;
  name: string;
  type: string;
  url: string | null;
  poll_interval_ms: number | null;
  categories: string | null;
  is_active: number;
  last_polled_at: number | null;
};

type IngestedWorldFeedItem = {
  externalId: string;
  title: string;
  summary?: string | null;
  url?: string | null;
  category?: string | null;
};

function isNonNull<T>(value: T | null): value is T {
  return value !== null;
}

function parseJsonOr<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return (JSON.parse(raw) as T) ?? fallback;
  } catch {
    return fallback;
  }
}

function stripCdata(value: string): string {
  const trimmed = value.trim();
  if (trimmed.startsWith('<![CDATA[') && trimmed.endsWith(']]>')) {
    return trimmed.slice(9, -3);
  }
  return value;
}

function decodeXmlEntities(value: string): string {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
      const codePoint = Number.parseInt(hex, 16);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : _;
    })
    .replace(/&#([0-9]+);/g, (_, num) => {
      const codePoint = Number.parseInt(num, 10);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : _;
    });
}

function normalizeText(value: unknown, maxLen: number): string {
  const raw = typeof value === 'string' ? value : String(value ?? '');
  const cleaned = decodeXmlEntities(stripCdata(raw))
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return '';
  if (cleaned.length <= maxLen) return cleaned;
  return `${cleaned.slice(0, maxLen - 1)}…`;
}

function pickFirstTag(xml: string, tag: string): string | null {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i');
  const match = re.exec(xml);
  if (!match) return null;
  return match[1] ?? null;
}

function pickAtomLink(xml: string): string | null {
  const re = /<link\b[^>]*href=["']([^"']+)["'][^>]*\/?>/i;
  const match = re.exec(xml);
  if (!match) return null;
  return match[1] ?? null;
}

function parseRssOrAtom(xml: string): IngestedWorldFeedItem[] {
  const items = xml.match(/<item\b[\s\S]*?<\/item>/gi) ?? [];
  if (items.length > 0) {
    return items
      .map((itemXml) => {
        const title = normalizeText(pickFirstTag(itemXml, 'title'), 200);
        if (!title) return null;

        const url =
          normalizeText(pickFirstTag(itemXml, 'link'), 2000) ||
          normalizeText(pickFirstTag(itemXml, 'guid'), 2000) ||
          null;
        const guid = normalizeText(pickFirstTag(itemXml, 'guid'), 512);
        const description =
          normalizeText(pickFirstTag(itemXml, 'description'), 4000) ||
          normalizeText(pickFirstTag(itemXml, 'content:encoded'), 4000) ||
          null;
        const category = normalizeText(pickFirstTag(itemXml, 'category'), 64) || null;

        const externalId = guid || url || title;

        const parsed: IngestedWorldFeedItem = {
          externalId,
          title,
          summary: description,
          url,
          category,
        };
        return parsed;
      })
      .filter(isNonNull);
  }

  const entries = xml.match(/<entry\b[\s\S]*?<\/entry>/gi) ?? [];
  return entries
    .map((entryXml) => {
      const title = normalizeText(pickFirstTag(entryXml, 'title'), 200);
      if (!title) return null;

      const url =
        normalizeText(pickAtomLink(entryXml) ?? pickFirstTag(entryXml, 'link'), 2000) || null;
      const id = normalizeText(pickFirstTag(entryXml, 'id'), 512);
      const summary =
        normalizeText(pickFirstTag(entryXml, 'summary'), 4000) ||
        normalizeText(pickFirstTag(entryXml, 'content'), 4000) ||
        null;
      const category = normalizeText(pickFirstTag(entryXml, 'category'), 64) || null;

      const externalId = id || url || title;

      const parsed: IngestedWorldFeedItem = {
        externalId,
        title,
        summary,
        url,
        category,
      };
      return parsed;
    })
    .filter(isNonNull);
}

function deriveExternalId(
  sourceId: string,
  rawExternalId: string,
  item: Omit<IngestedWorldFeedItem, 'externalId'>
): string {
  const trimmed = rawExternalId.trim();
  if (trimmed) return trimmed.slice(0, 256);

  const key = [
    sourceId,
    item.title ?? '',
    item.url ?? '',
    item.category ?? '',
    item.summary ?? '',
  ].join('|');
  return createHash('sha256').update(key, 'utf8').digest('hex');
}

@Injectable()
export class WorldFeedIngestionService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WorldFeedIngestionService.name);
  private intervalHandle: NodeJS.Timeout | null = null;
  private running = false;

  constructor(private readonly db: DatabaseService) {}

  onModuleInit(): void {
    if (process.env.WUNDERLAND_WORLD_FEED_INGESTION_ENABLED !== 'true') {
      return;
    }

    const tickMsRaw = Number(process.env.WUNDERLAND_WORLD_FEED_INGESTION_TICK_MS ?? 30000);
    const tickMs = Number.isFinite(tickMsRaw) && tickMsRaw >= 5000 ? tickMsRaw : 30000;
    this.logger.log(`World feed ingestion enabled. Tick interval: ${tickMs}ms.`);

    this.intervalHandle = setInterval(() => {
      void this.tick();
    }, tickMs);

    void this.tick();
  }

  onModuleDestroy(): void {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
  }

  private async tick(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      await this.pollDueSources();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`World feed ingestion tick failed: ${message}`);
    } finally {
      this.running = false;
    }
  }

  private async pollDueSources(): Promise<void> {
    const now = Date.now();
    const maxItemsPerSourceRaw = Number(
      process.env.WUNDERLAND_WORLD_FEED_INGESTION_MAX_ITEMS_PER_SOURCE ?? 20
    );
    const maxItemsPerSource =
      Number.isFinite(maxItemsPerSourceRaw) && maxItemsPerSourceRaw > 0
        ? Math.min(200, maxItemsPerSourceRaw)
        : 20;

    const sources = await this.db.all<WorldFeedSourceRow>(
      `
        SELECT
          source_id,
          name,
          type,
          url,
          poll_interval_ms,
          categories,
          is_active,
          last_polled_at
        FROM wunderland_world_feed_sources
        WHERE is_active = 1
        ORDER BY created_at DESC
      `
    );

    for (const source of sources) {
      if (!source.url) continue;
      if (source.type !== 'rss' && source.type !== 'api') continue;

      const pollEvery = source.poll_interval_ms ?? 300000;
      const lastPolledAt = source.last_polled_at ?? 0;
      if (lastPolledAt && now - lastPolledAt < pollEvery) continue;

      await this.pollSource(source, { now, maxItemsPerSource });
    }
  }

  private async pollSource(
    source: WorldFeedSourceRow,
    options: { now: number; maxItemsPerSource: number }
  ): Promise<void> {
    const timeoutMs = Number(process.env.WUNDERLAND_WORLD_FEED_INGESTION_HTTP_TIMEOUT_MS ?? 15000);

    try {
      const fetched =
        source.type === 'rss'
          ? await this.fetchRss(source.url!, { timeoutMs })
          : await this.fetchApi(source.url!, { timeoutMs });

      const sourceCategories = parseJsonOr<string[]>(source.categories, []);

      const items = fetched
        .map((item) => {
          const title = normalizeText(item.title, 200);
          if (!title) return null;
          const summary = item.summary ? normalizeText(item.summary, 4000) : null;
          const url = item.url ? normalizeText(item.url, 2000) : null;
          const categoryRaw = item.category || sourceCategories[0] || '';
          const category = categoryRaw ? normalizeText(categoryRaw, 64) : null;

          const externalId = deriveExternalId(source.source_id, item.externalId, {
            title,
            summary,
            url,
            category,
          });

          const parsed: IngestedWorldFeedItem = { externalId, title, summary, url, category };
          return parsed;
        })
        .filter(isNonNull)
        .slice(0, options.maxItemsPerSource);

      if (items.length === 0) {
        await this.db.run(
          'UPDATE wunderland_world_feed_sources SET last_polled_at = ? WHERE source_id = ?',
          [options.now, source.source_id]
        );
        return;
      }

      const insertedCount = await this.db.transaction(async (trx) => {
        let inserted = 0;
        for (const item of items) {
          const existing = await trx.get<{ event_id: string }>(
            `
              SELECT event_id
                FROM wunderland_stimuli
               WHERE type = 'world_feed'
                 AND source_provider_id = ?
                 AND source_external_id = ?
               LIMIT 1
            `,
            [source.source_id, item.externalId]
          );
          if (existing) continue;

          const eventId = this.db.generateId();
          const payload = {
            title: item.title,
            summary: item.summary ?? null,
            url: item.url ?? null,
            category: item.category ?? null,
          };

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
              source.source_id,
              item.externalId,
              0,
              options.now,
            ]
          );
          inserted += 1;
        }

        await trx.run(
          'UPDATE wunderland_world_feed_sources SET last_polled_at = ? WHERE source_id = ?',
          [options.now, source.source_id]
        );
        return inserted;
      });

      if (insertedCount > 0) {
        this.logger.log(
          `Ingested ${insertedCount} world feed item(s) from "${source.name}" (${source.source_id}).`
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `World feed poll failed for "${source.name}" (${source.source_id}): ${message}`
      );
    }
  }

  private async fetchRss(
    url: string,
    options: { timeoutMs: number }
  ): Promise<IngestedWorldFeedItem[]> {
    const res = await axios.get<string>(url, {
      timeout: options.timeoutMs,
      responseType: 'text',
      transformResponse: [(data) => data],
      validateStatus: (status) => status >= 200 && status < 300,
    });
    const xml = typeof res.data === 'string' ? res.data : String(res.data ?? '');
    return parseRssOrAtom(xml);
  }

  private async fetchApi(
    url: string,
    options: { timeoutMs: number }
  ): Promise<IngestedWorldFeedItem[]> {
    const res = await axios.get<any>(url, {
      timeout: options.timeoutMs,
      validateStatus: (status) => status >= 200 && status < 300,
    });

    const data = res.data as any;
    const items: unknown[] = Array.isArray(data)
      ? data
      : Array.isArray(data?.items)
        ? data.items
        : Array.isArray(data?.events)
          ? data.events
          : Array.isArray(data?.data)
            ? data.data
            : [];

    return items
      .map((raw) => {
        if (!raw || typeof raw !== 'object') return null;
        const record = raw as any;
        const title = String(record.title ?? record.name ?? record.headline ?? '').trim();
        if (!title) return null;
        const summary = record.summary ?? record.description ?? record.content ?? null;
        const itemUrl = record.url ?? record.link ?? null;
        const category = record.category ?? record.topic ?? null;
        const externalId = String(
          record.id ?? record.externalId ?? record.guid ?? itemUrl ?? title
        );

        const parsed: IngestedWorldFeedItem = {
          externalId,
          title,
          summary: summary ? String(summary) : null,
          url: itemUrl ? String(itemUrl) : null,
          category: category ? String(category) : null,
        };
        return parsed;
      })
      .filter(isNonNull);
  }
}
