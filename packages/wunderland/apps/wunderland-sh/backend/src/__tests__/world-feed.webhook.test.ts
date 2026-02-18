import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { resolveStorageAdapter } from '@framers/sql-storage-adapter';
import {
  __setAppDatabaseAdapterResolverForTests,
  closeAppDatabase,
  initializeAppDatabase,
} from '../core/database/appDatabase.js';
import { DatabaseService } from '../database/database.service.js';
import { WorldFeedService } from '../modules/wunderland/world-feed/world-feed.service.js';
import { UnauthorizedException } from '@nestjs/common';

describe('WorldFeedService — webhook ingestion', () => {
  let db: DatabaseService;
  let service: WorldFeedService;

  const sourceId = 'source_webhook_test';
  const secret = 'test-secret-123';

  let savedWebhookSecret: string | undefined;

  beforeEach(async () => {
    savedWebhookSecret = process.env.WUNDERLAND_WORLD_FEED_WEBHOOK_SECRET;
    process.env.WUNDERLAND_WORLD_FEED_WEBHOOK_SECRET = secret;

    __setAppDatabaseAdapterResolverForTests(async () =>
      resolveStorageAdapter({ priority: ['better-sqlite3'], filePath: ':memory:' })
    );

    await initializeAppDatabase();

    db = new DatabaseService();
    service = new WorldFeedService(db);

    const now = Date.now();
    await db.run(
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
        'Webhook Source',
        'webhook',
        null,
        null,
        JSON.stringify(['ai']),
        1,
        now,
      ]
    );
  });

  afterEach(async () => {
    await closeAppDatabase();
    __setAppDatabaseAdapterResolverForTests();

    if (savedWebhookSecret === undefined) delete process.env.WUNDERLAND_WORLD_FEED_WEBHOOK_SECRET;
    else process.env.WUNDERLAND_WORLD_FEED_WEBHOOK_SECRET = savedWebhookSecret;
  });

  it('ingests an item and dedupes by externalId', async () => {
    const first = await service.ingestWebhookItem(sourceId, secret, {
      title: 'Hello world',
      summary: 'A test event',
      url: 'https://example.com/event',
      category: 'ai',
    });

    expect(first.inserted).toBe(true);
    if (!first.inserted) throw new Error('Expected inserted=true');

    const row = await db.get<{ event_id: string; source_external_id: string }>(
      `
        SELECT event_id, source_external_id
          FROM wunderland_stimuli
         WHERE event_id = ?
         LIMIT 1
      `,
      [first.item.eventId]
    );

    expect(row?.event_id).toBe(first.item.eventId);
    expect(row?.source_external_id).toBeTruthy();

    const second = await service.ingestWebhookItem(sourceId, secret, {
      title: 'Hello world',
      summary: 'A test event',
      url: 'https://example.com/event',
      category: 'ai',
    });

    expect(second.inserted).toBe(false);
    if (second.inserted) throw new Error('Expected inserted=false');
    expect(second.duplicate).toBe(true);
    expect(second.externalId).toBe(row?.source_external_id);
  });

  it('rejects invalid secrets', async () => {
    await expect(
      service.ingestWebhookItem(sourceId, 'wrong-secret', {
        title: 'Nope',
      })
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});

