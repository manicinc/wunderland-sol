import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { resolveStorageAdapter } from '@framers/sql-storage-adapter';
import {
  __setAppDatabaseAdapterResolverForTests,
  closeAppDatabase,
  initializeAppDatabase,
} from '../core/database/appDatabase.js';
import { DatabaseService } from '../database/database.service.js';
import { SearchService } from '../modules/wunderland/search/search.service.js';

describe('SearchService', () => {
  let db: DatabaseService;
  let service: SearchService;

  beforeEach(async () => {
    __setAppDatabaseAdapterResolverForTests(async () =>
      resolveStorageAdapter({ priority: ['better-sqlite3'], filePath: ':memory:' })
    );

    await initializeAppDatabase();
    db = new DatabaseService();
    service = new SearchService(db);

    const now = Date.now();

    // FK requirement: wunderbots.owner_user_id -> app_users.id
    await db.run(
      `
        INSERT INTO app_users (
          id,
          email,
          password_hash,
          subscription_status,
          subscription_tier,
          is_active,
          created_at,
          updated_at,
          metadata
        ) VALUES (?, ?, ?, 'none', 'metered', 1, ?, ?, ?)
      `,
      [
        'user-1',
        'test@example.com',
        'hash',
        now,
        now,
        JSON.stringify({ mode: 'test' }),
      ],
    );

    await db.run(
      `
        INSERT INTO wunderbots (
          seed_id,
          owner_user_id,
          display_name,
          bio,
          avatar_url,
          hexaco_traits,
          security_profile,
          inference_hierarchy,
          step_up_auth_config,
          base_system_prompt,
          allowed_tool_ids,
          toolset_manifest_json,
          toolset_hash,
          genesis_event_id,
          public_key,
          storage_policy,
          sealed_at,
          provenance_enabled,
          status,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, NULL, ?, ?, ?, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'sealed', NULL, 1, 'active', ?, ?)
      `,
      [
        'AgentPda111',
        'user-1',
        'Hello Agent',
        'I write about hello world.',
        JSON.stringify({ honestyHumility: 0.5, emotionality: 0.5, extraversion: 0.5, agreeableness: 0.5, conscientiousness: 0.5, openness: 0.5 }),
        JSON.stringify({}),
        JSON.stringify({}),
        now,
        now,
      ],
    );

    await db.run(
      `
        INSERT INTO wunderland_posts (
          post_id,
          seed_id,
          content,
          manifest,
          status,
          reply_to_post_id,
          agent_level_at_post,
          likes,
          downvotes,
          boosts,
          replies,
          views,
          created_at,
          published_at
        ) VALUES (?, ?, ?, ?, 'published', NULL, 1, 0, 0, 0, 0, 0, ?, ?)
      `,
      [
        'PostPda111',
        'AgentPda111',
        'Hello from a post body.',
        JSON.stringify({ stimulus: { type: 'world_feed', eventId: 'evt-1' } }),
        now,
        now,
      ],
    );

    await db.run(
      `
        INSERT INTO wunderland_comments (
          comment_id,
          post_id,
          parent_comment_id,
          seed_id,
          content,
          depth,
          path,
          status,
          upvotes,
          downvotes,
          wilson_score,
          child_count,
          created_at,
          content_hash_hex,
          manifest_hash_hex,
          content_cid,
          manifest_cid,
          anchor_status,
          anchor_error,
          anchored_at,
          sol_cluster,
          sol_program_id,
          sol_post_pda,
          sol_tx_signature
        ) VALUES (?, ?, NULL, ?, ?, 0, '0', 'active', 0, 0, 0.5, 0, ?, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL)
      `,
      [
        'Comment111',
        'PostPda111',
        'AgentPda111',
        'A comment that says hello.',
        now,
      ],
    );

    await db.run(
      `
        INSERT INTO wunderland_job_postings (
          job_pda,
          creator_wallet,
          job_nonce,
          metadata_hash_hex,
          budget_lamports,
          buy_it_now_lamports,
          status,
          assigned_agent_pda,
          accepted_bid_pda,
          created_at,
          updated_at,
          sol_cluster,
          metadata_json,
          title,
          description,
          indexed_at
        ) VALUES (?, ?, '1', '00', '1000', NULL, 'open', NULL, NULL, ?, ?, 'devnet', NULL, ?, ?, ?)
      `,
      [
        'JobPda111',
        'Creator111',
        now,
        now,
        'Hello Job',
        'A job description mentioning hello.',
        now,
      ],
    );

    await db.run(
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
        ) VALUES (?, 'tip', 'normal', ?, NULL, NULL, 0, NULL, ?, NULL)
      `,
      [
        'Stimulus111',
        JSON.stringify({ type: 'tip', content: 'hello from stimulus payload' }),
        now,
      ],
    );
  });

  afterEach(async () => {
    await closeAppDatabase();
    __setAppDatabaseAdapterResolverForTests();
  });

  it('returns results across sections', async () => {
    const res = await service.search('hello', { limit: 5 });

    expect(res.query).toBe('hello');
    expect(res.agents.total).toBeGreaterThanOrEqual(1);
    expect(res.posts.total).toBeGreaterThanOrEqual(1);
    expect(res.comments.total).toBeGreaterThanOrEqual(1);
    expect(res.jobs.total).toBeGreaterThanOrEqual(1);
    expect(res.stimuli.total).toBeGreaterThanOrEqual(1);

    expect(res.agents.items[0]?.displayName).toContain('Hello');
    expect(res.posts.items[0]?.contentPreview.toLowerCase()).toContain('hello');
    expect(res.comments.items[0]?.contentPreview.toLowerCase()).toContain('hello');
    expect(res.jobs.items[0]?.title).toContain('Hello');
    expect(res.stimuli.items[0]?.payloadPreview.toLowerCase()).toContain('hello');
  });

  it('returns empty sections for empty query', async () => {
    const res = await service.search('', { limit: 5 });
    expect(res.query).toBe('');
    expect(res.agents.total).toBe(0);
    expect(res.posts.total).toBe(0);
    expect(res.comments.total).toBe(0);
    expect(res.jobs.total).toBe(0);
    expect(res.stimuli.total).toBe(0);
  });
});

