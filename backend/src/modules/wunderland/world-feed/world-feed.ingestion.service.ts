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
import { URL } from 'node:url';
import axios from 'axios';
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service.js';

// Puppeteer-core for headless Chromium Reddit scraping (Reddit blocks datacenter IPs).
// Uses system-installed Chromium (/usr/bin/chromium) set via PUPPETEER_EXECUTABLE_PATH env.
let puppeteer: typeof import('puppeteer-core') | null = null;
try {
  puppeteer = await import('puppeteer-core');
} catch {
  // puppeteer-core not installed — will fall back to Serper/API fetching
}

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
  dedupeHash?: string;
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

function normalizeForDedupeKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 220);
}

function normalizeUrlForDedupeKey(url: string | null | undefined): string {
  const raw = typeof url === 'string' ? url.trim() : '';
  if (!raw) return '';
  try {
    const parsed = new URL(raw);
    parsed.hash = '';
    parsed.search = '';
    return `${parsed.hostname}${parsed.pathname}`.toLowerCase();
  } catch {
    return raw.toLowerCase().replace(/[#?].*$/, '').slice(0, 256);
  }
}

function computeWorldFeedDedupeHash(item: { title: string; url?: string | null; category?: string | null }): string {
  const key = [
    normalizeForDedupeKey(item.title ?? ''),
    normalizeUrlForDedupeKey(item.url ?? null),
    normalizeForDedupeKey(String(item.category ?? '')),
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
    const enabled =
      process.env.WUNDERLAND_WORLD_FEED_INGESTION_ENABLED === 'true' ||
      process.env.WUNDERLAND_AUTONOMOUS === 'true';
    if (!enabled) {
      return;
    }

    const fixedTickMsRaw = Number(process.env.WUNDERLAND_WORLD_FEED_INGESTION_TICK_MS ?? '');
    const fixedTickMs =
      Number.isFinite(fixedTickMsRaw) && fixedTickMsRaw > 0 ? fixedTickMsRaw : null;
    if (fixedTickMs) {
      this.logger.log(`World feed ingestion enabled. Using fixed interval (${fixedTickMs}ms).`);
    } else {
      this.logger.log('World feed ingestion enabled. Using random intervals (5–25 min).');
    }

    // Immediate first tick, then schedule with jitter
    void this.tick();
    this.scheduleNextTick();
  }

  onModuleDestroy(): void {
    if (this.intervalHandle) {
      clearTimeout(this.intervalHandle);
      this.intervalHandle = null;
    }
  }

  /** Schedule the next tick with a random interval between 5 and 25 minutes. */
  private scheduleNextTick(): void {
    const fixedTickMsRaw = Number(process.env.WUNDERLAND_WORLD_FEED_INGESTION_TICK_MS ?? '');
    const fixedTickMs =
      Number.isFinite(fixedTickMsRaw) && fixedTickMsRaw > 0 ? fixedTickMsRaw : null;

    const minMs = 5 * 60_000;   // 5 minutes
    const maxMs = 25 * 60_000;  // 25 minutes
    const delayMs = fixedTickMs ?? (minMs + Math.floor(Math.random() * (maxMs - minMs)));
    if (fixedTickMs) {
      this.logger.debug(`Next world feed tick in ${(delayMs / 1000).toFixed(1)} seconds`);
    } else {
      this.logger.debug(`Next world feed tick in ${(delayMs / 60_000).toFixed(1)} minutes`);
    }
    this.intervalHandle = setTimeout(() => {
      void this.tick().finally(() => this.scheduleNextTick());
    }, delayMs);
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

      const basePollEvery = source.poll_interval_ms ?? 300000;
      // Per-source jitter: 0.7x to 1.3x of base interval
      const jitterFactor = 0.7 + Math.random() * 0.6;
      const pollEvery = Math.round(basePollEvery * jitterFactor);
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
      const isRedditSource = source.url!.includes('reddit.com');
      const fetched = isRedditSource
        ? await this.fetchRedditViaSerper(source.url!, { timeoutMs })
        : source.type === 'rss'
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

          const parsed: IngestedWorldFeedItem = {
            externalId,
            title,
            summary,
            url,
            category,
            dedupeHash: computeWorldFeedDedupeHash({ title, url, category }),
          };
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

      const dedupeWindowMs = 7 * 24 * 60 * 60 * 1000;
      const insertedCount = await this.db.transaction(async (trx) => {
        let inserted = 0;
        for (const item of items) {
          const dedupeHash =
            item.dedupeHash ?? computeWorldFeedDedupeHash({ title: item.title, url: item.url, category: item.category });
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

          const dup = await trx.get<{ event_id: string }>(
            `
              SELECT event_id
                FROM wunderland_stimuli
               WHERE type = 'world_feed'
                 AND dedupe_hash = ?
                 AND created_at >= ?
               LIMIT 1
            `,
            [dedupeHash, options.now - dedupeWindowMs],
          );
          if (dup) continue;

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
                dedupe_hash,
                source_verified,
                target_seed_ids,
                created_at,
                processed_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, NULL)
            `,
            [
              eventId,
              'world_feed',
              'normal',
              JSON.stringify(payload),
              source.source_id,
              item.externalId,
              dedupeHash,
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
      headers: {
        'User-Agent': 'WunderlandBot/1.0 (RSS feed reader; +https://wunderland.sh)',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*',
      },
    });
    const xml = typeof res.data === 'string' ? res.data : String(res.data ?? '');
    return parseRssOrAtom(xml);
  }

  /**
   * Fetch Reddit content using Puppeteer (headless Chromium) to bypass API blocks.
   * Falls back to Serper Google Search if Puppeteer/Chromium is unavailable.
   * Reddit blocks datacenter IPs for API/RSS but serves pages to real browsers.
   */
  private async fetchRedditViaSerper(
    redditUrl: string,
    options: { timeoutMs: number }
  ): Promise<IngestedWorldFeedItem[]> {
    const match = redditUrl.match(/reddit\.com\/r\/([^/.?]+)/i);
    const subreddit = match?.[1] ?? 'artificial';

    // Try Puppeteer first
    const browserResults = await this.fetchRedditViaBrowser(subreddit, options);
    if (browserResults.length > 0) return browserResults;

    // Fallback: Serper Google Search
    return this.fetchRedditViaSerperSearch(subreddit, options);
  }

  /**
   * Scrape Reddit using headless Chromium via old.reddit.com (simpler DOM).
   */
  private async fetchRedditViaBrowser(
    subreddit: string,
    options: { timeoutMs: number }
  ): Promise<IngestedWorldFeedItem[]> {
    if (!puppeteer) {
      this.logger.debug('puppeteer-core not available — skipping browser Reddit fetch');
      return [];
    }

    const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium';

    let browser: import('puppeteer-core').Browser | null = null;
    try {
      browser = await puppeteer.launch({
        executablePath,
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--single-process',
        ],
        timeout: options.timeoutMs,
      });

      const page = await browser.newPage();
      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
      );

      // Use old.reddit.com for simpler HTML structure
      await page.goto(`https://old.reddit.com/r/${subreddit}/hot`, {
        waitUntil: 'domcontentloaded',
        timeout: options.timeoutMs,
      });

      // Extract posts from old Reddit DOM
      const posts = await page.evaluate(() => {
        const things = document.querySelectorAll('#siteTable > .thing.link');
        const results: Array<{ title: string; url: string; selftext: string; score: string }> = [];
        things.forEach((el) => {
          const titleEl = el.querySelector('a.title');
          const scoreEl = el.querySelector('.score.unvoted');
          const mdEl = el.querySelector('.md');
          if (titleEl) {
            results.push({
              title: titleEl.textContent?.trim() || '',
              url: (titleEl as HTMLAnchorElement).href || '',
              selftext: mdEl?.textContent?.trim().slice(0, 300) || '',
              score: scoreEl?.textContent?.trim() || '0',
            });
          }
        });
        return results.slice(0, 25);
      });

      this.logger.log(`Puppeteer scraped ${posts.length} posts from r/${subreddit}`);

      return posts
        .filter((p) => p.title)
        .map((p) => ({
          externalId: p.url || p.title,
          title: p.title,
          summary: p.selftext || `${p.score} points on r/${subreddit}`,
          url: p.url || null,
          category: subreddit,
        }));
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Puppeteer Reddit fetch for r/${subreddit} failed: ${msg}`);
      return [];
    } finally {
      if (browser) {
        await browser.close().catch(() => {});
      }
    }
  }

  /**
   * Fallback: Fetch Reddit via Serper (Google Search API).
   */
  private async fetchRedditViaSerperSearch(
    subreddit: string,
    options: { timeoutMs: number }
  ): Promise<IngestedWorldFeedItem[]> {
    const serperKey = process.env.SERPER_API_KEY;
    if (!serperKey) {
      this.logger.warn('SERPER_API_KEY not set — no Reddit fallback available');
      return [];
    }

    const query = `site:reddit.com/r/${subreddit} -site:reddit.com/r/${subreddit}/wiki`;

    try {
      const res = await axios.post<any>(
        'https://google.serper.dev/search',
        { q: query, num: 20, tbs: 'qdr:d' },
        {
          timeout: options.timeoutMs,
          headers: {
            'X-API-KEY': serperKey,
            'Content-Type': 'application/json',
          },
        }
      );

      const organic: Array<{ title: string; snippet: string; link: string; date?: string }> =
        res.data?.organic ?? [];

      return organic
        .filter((r) => r.title && r.link)
        .map((result) => ({
          externalId: result.link,
          title: result.title.replace(/ : r\/\w+$/, '').replace(/ - Reddit$/, ''),
          summary: result.snippet || null,
          url: result.link,
          category: subreddit,
        }));
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Serper Reddit fallback for r/${subreddit} failed: ${msg}`);
      return [];
    }
  }

  private async fetchApi(
    url: string,
    options: { timeoutMs: number }
  ): Promise<IngestedWorldFeedItem[]> {
    const res = await axios.get<any>(url, {
      timeout: options.timeoutMs,
      validateStatus: (status) => status >= 200 && status < 300,
      headers: {
        'User-Agent': 'WunderlandBot/1.0 (feed reader; +https://wunderland.sh)',
        'Accept': 'application/json, */*',
      },
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
