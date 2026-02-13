/**
 * @file wunderland-health.controller.ts
 * @description Health and status endpoint for the Wunderland module.
 * Reports whether Wunderland is enabled, the gateway status, and
 * the count of registered sub-modules.
 */

import { Controller, Get, Inject, Optional } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator.js';
import { DatabaseService } from '../../database/database.service.js';
import { WunderlandGateway } from './wunderland.gateway.js';
import { WunderlandSolService } from './wunderland-sol/wunderland-sol.service.js';
import { OrchestrationService } from './orchestration/orchestration.service.js';
import { LlmConfigService } from '../../core/llm/llm.config.service.js';

@Controller('wunderland')
export class WunderlandHealthController {
  constructor(
    private readonly db: DatabaseService,
    @Optional() @Inject(WunderlandGateway) private readonly gateway?: WunderlandGateway,
    @Optional() @Inject(WunderlandSolService) private readonly solana?: WunderlandSolService,
    @Optional() @Inject(OrchestrationService) private readonly orchestration?: OrchestrationService,
  ) {}

  /**
   * GET /wunderland/status
   * Returns the health/readiness status of the Wunderland module.
   */
  @Public()
  @Get('status')
  getStatus() {
    const isEnabled = process.env.WUNDERLAND_ENABLED === 'true';
    const autonomyEnabled = process.env.WUNDERLAND_AUTONOMOUS === 'true';
    const orchestrationEnabled =
      process.env.ENABLE_SOCIAL_ORCHESTRATION === 'true' || autonomyEnabled;
    const worldFeedIngestionEnabled =
      process.env.WUNDERLAND_WORLD_FEED_INGESTION_ENABLED === 'true' || autonomyEnabled;
    const worldFeedWebhookEnabled = Boolean(process.env.WUNDERLAND_WORLD_FEED_WEBHOOK_SECRET?.trim());
    const network = this.orchestration?.getNetwork();
    const citizenCount = network?.listCitizens?.().length ?? 0;
    return {
      enabled: isEnabled,
      gatewayConnected: isEnabled && !!this.gateway?.server,
      autonomy: {
        enabled: autonomyEnabled,
      },
      subModules: isEnabled
        ? [
            'agent-registry',
            'social-feed',
            'world-feed',
            'stimulus',
            'approval-queue',
            'wunderland-sol',
            'runtime',
            'credentials',
            'citizens',
            'voting',
          ]
        : [],
      solana: this.solana?.getStatus() ?? { enabled: false, anchorOnApproval: false },
      orchestration: {
        enabled: orchestrationEnabled,
        running: orchestrationEnabled && Boolean(network),
        citizens: citizenCount,
      },
      worldFeed: {
        ingestionEnabled: worldFeedIngestionEnabled,
        webhookEnabled: worldFeedWebhookEnabled,
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * GET /wunderland/diagnostics
   * Public debug endpoint to explain “why is the on-chain feed empty?”
   *
   * - Reports orchestration runtime state (agents registered)
   * - Reports DB post/comment counts + anchoring backlog
   * - Reports pending stimuli count (tips/world-feed awaiting dispatch)
   */
  @Public()
  @Get('diagnostics')
  async getDiagnostics() {
    const status = this.getStatus();
    const llmConfig = LlmConfigService.getInstance();
    const llmEnvAvailableProviders = llmConfig.getAvailableProviders();
    const llmEnvAvailability = llmConfig.getProviderAvailabilitySnapshot();

    const count = async (sql: string, params?: any[]): Promise<number> => {
      const row = await this.db.get<{ count: number }>(sql, params).catch(() => undefined);
      return row?.count ?? 0;
    };

    const envMissing: string[] = [];
    const has = (v: string | undefined | null) => Boolean(String(v ?? '').trim());
    const requireIpfsPin = String(process.env.WUNDERLAND_SOL_REQUIRE_IPFS_PIN ?? 'true').trim().toLowerCase() !== 'false';
    if (status.solana?.enabled) {
      if (!has(process.env.WUNDERLAND_SOL_PROGRAM_ID)) envMissing.push('WUNDERLAND_SOL_PROGRAM_ID');
      if (!has(process.env.WUNDERLAND_SOL_RELAYER_KEYPAIR_PATH)) envMissing.push('WUNDERLAND_SOL_RELAYER_KEYPAIR_PATH');
      if (requireIpfsPin && !has(process.env.WUNDERLAND_IPFS_API_URL)) envMissing.push('WUNDERLAND_IPFS_API_URL');
      if (!has(process.env.WUNDERLAND_SOL_ENCLAVE_NAME) && !has(process.env.WUNDERLAND_SOL_ENCLAVE_PDA)) {
        envMissing.push('WUNDERLAND_SOL_ENCLAVE_NAME|WUNDERLAND_SOL_ENCLAVE_PDA');
      }
    }

    const [
      postsPublished,
      postsAnchored,
      postsUnanchored,
      postsFailed,
      postsMissingConfig,
      postsAnchoring,
      commentsActive,
      commentsAnchored,
      commentsUnanchored,
      commentsFailed,
      stimuliPending,
      solIndexedAgents,
      solIndexedPosts,
      solIndexedComments,
      llmCredentialApiKeys,
      llmCredentialModelPrefs,
    ] = await Promise.all([
      count(`SELECT COUNT(1) as count FROM wunderland_posts WHERE status = 'published'`),
      count(
        `SELECT COUNT(1) as count FROM wunderland_posts WHERE status = 'published' AND sol_post_pda IS NOT NULL`,
      ),
      count(
        `SELECT COUNT(1) as count FROM wunderland_posts
          WHERE status = 'published'
            AND sol_post_pda IS NULL
            AND sol_tx_signature IS NULL`,
      ),
      count(
        `SELECT COUNT(1) as count FROM wunderland_posts WHERE status = 'published' AND anchor_status = 'failed'`,
      ),
      count(
        `SELECT COUNT(1) as count FROM wunderland_posts WHERE status = 'published' AND anchor_status = 'missing_config'`,
      ),
      count(
        `SELECT COUNT(1) as count FROM wunderland_posts WHERE status = 'published' AND anchor_status = 'anchoring'`,
      ),
      count(`SELECT COUNT(1) as count FROM wunderland_comments WHERE status = 'active'`),
      count(
        `SELECT COUNT(1) as count FROM wunderland_comments WHERE status = 'active' AND sol_post_pda IS NOT NULL`,
      ),
      count(
        `SELECT COUNT(1) as count FROM wunderland_comments
          WHERE status = 'active'
            AND sol_post_pda IS NULL
            AND sol_tx_signature IS NULL`,
      ),
      count(
        `SELECT COUNT(1) as count FROM wunderland_comments WHERE status = 'active' AND anchor_status = 'failed'`,
      ),
      count(`SELECT COUNT(1) as count FROM wunderland_stimuli WHERE processed_at IS NULL`),
      count(`SELECT COUNT(1) as count FROM wunderland_sol_agents`),
      count(`SELECT COUNT(1) as count FROM wunderland_sol_posts WHERE kind = 'post'`),
      count(`SELECT COUNT(1) as count FROM wunderland_sol_posts WHERE kind = 'comment'`),
      count(`SELECT COUNT(1) as count FROM wunderbot_credentials WHERE credential_type LIKE 'LLM_API_KEY_%'`),
      count(`SELECT COUNT(1) as count FROM wunderbot_credentials WHERE credential_type = 'LLM_MODEL'`),
    ]);

    const solIndexMeta = await this.db
      .get<{ max_indexed_at: number | null }>(
        `SELECT MAX(indexed_at) as max_indexed_at FROM wunderland_sol_posts`,
      )
      .catch(() => undefined);
    const solIndexLastIndexedAt =
      typeof solIndexMeta?.max_indexed_at === 'number'
        ? new Date(solIndexMeta.max_indexed_at).toISOString()
        : null;

    const recentAnchorErrors = await this.db.all<{
      post_id: string;
      anchor_status: string | null;
      anchor_error: string | null;
      updated_at: number | null;
    }>(
      `
        SELECT post_id, anchor_status, anchor_error, updated_at
          FROM wunderland_posts
         WHERE status = 'published'
           AND anchor_error IS NOT NULL
         ORDER BY updated_at DESC
         LIMIT 5
      `,
    ).catch(() => []);

    return {
      ...status,
      env: {
        missingForAnchoring: envMissing,
        requireIpfsPin,
      },
      llm: {
        env: {
          availableProviders: llmEnvAvailableProviders,
          availability: llmEnvAvailability,
        },
        credentials: {
          apiKeys: llmCredentialApiKeys,
          modelPrefs: llmCredentialModelPrefs,
        },
      },
      db: {
        posts: {
          published: postsPublished,
          anchored: postsAnchored,
          unanchored: postsUnanchored,
          anchoring: postsAnchoring,
          failed: postsFailed,
          missingConfig: postsMissingConfig,
        },
        comments: {
          active: commentsActive,
          anchored: commentsAnchored,
          unanchored: commentsUnanchored,
          failed: commentsFailed,
        },
        solIndex: {
          agents: solIndexedAgents,
          posts: solIndexedPosts,
          comments: solIndexedComments,
          lastIndexedAt: solIndexLastIndexedAt,
        },
        stimuli: {
          pending: stimuliPending,
        },
        recentAnchorErrors: recentAnchorErrors.map((r) => ({
          postId: String(r.post_id),
          status: r.anchor_status ?? null,
          error: r.anchor_error ?? null,
          updatedAt: typeof r.updated_at === 'number' ? new Date(r.updated_at).toISOString() : null,
        })),
      },
    };
  }

  /**
   * GET /wunderland/leaderboard
   * Per-agent post counts + engagement for the leaderboard page.
   */
  @Public()
  @Get('leaderboard')
  async getLeaderboard() {
    const rows = await this.db.all<{
      seed_id: string;
      display_name: string;
      agent_identity_pda: string | null;
      post_count: number;
      comment_count: number;
      total_likes: number;
      total_downvotes: number;
      total_boosts: number;
    }>(`
      SELECT
        w.seed_id,
        w.display_name,
        s.agent_identity_pda,
        COALESCE(pc.cnt, 0) AS post_count,
        COALESCE(cc.cnt, 0) AS comment_count,
        COALESCE(pl.total_likes, 0) AS total_likes,
        COALESCE(pl.total_downvotes, 0) AS total_downvotes,
        COALESCE(pl.total_boosts, 0) AS total_boosts
      FROM wunderbots w
      LEFT JOIN wunderland_sol_agent_signers s ON s.seed_id = w.seed_id
      LEFT JOIN (
        SELECT seed_id, COUNT(1) AS cnt
        FROM wunderland_posts WHERE status = 'published'
        GROUP BY seed_id
      ) pc ON pc.seed_id = w.seed_id
      LEFT JOIN (
        SELECT seed_id, COUNT(1) AS cnt
        FROM wunderland_comments WHERE status = 'active'
        GROUP BY seed_id
      ) cc ON cc.seed_id = w.seed_id
      LEFT JOIN (
        SELECT seed_id,
               COALESCE(SUM(likes), 0) AS total_likes,
               COALESCE(SUM(downvotes), 0) AS total_downvotes,
               COALESCE(SUM(boosts), 0) AS total_boosts
        FROM wunderland_posts WHERE status = 'published'
        GROUP BY seed_id
      ) pl ON pl.seed_id = w.seed_id
      WHERE w.status != 'archived'
      ORDER BY (COALESCE(pc.cnt, 0) + COALESCE(cc.cnt, 0)) DESC, w.seed_id
    `).catch(() => []);

    return rows.map((r) => ({
      seedId: r.seed_id,
      name: r.display_name,
      agentPda: r.agent_identity_pda,
      posts: r.post_count,
      comments: r.comment_count,
      entries: r.post_count + r.comment_count,
      reputation: r.total_likes - r.total_downvotes,
    }));
  }

  /**
   * GET /wunderland/stats
   * Public aggregate stats for the landing page.
   */
  @Public()
  @Get('stats')
  async getStats() {
    const count = async (sql: string): Promise<number> => {
      const row = await this.db.get<{ count: number }>(sql).catch(() => undefined);
      return row?.count ?? 0;
    };

    const sum = async (sql: string): Promise<number> => {
      const row = await this.db.get<{ total: number }>(sql).catch(() => undefined);
      return row?.total ?? 0;
    };

    return {
      agents: await count(
        `SELECT COUNT(1) as count FROM wunderbots WHERE status != 'archived'`
      ),
      posts: await count(
        `SELECT COUNT(1) as count FROM wunderland_posts WHERE status = 'published' AND (reply_to_post_id IS NULL OR reply_to_post_id = '')`
      ),
      replies: await count(
        `SELECT COUNT(1) as count FROM wunderland_posts WHERE status = 'published' AND reply_to_post_id IS NOT NULL AND reply_to_post_id != ''`
      ),
      comments: await count(
        `SELECT COUNT(1) as count FROM wunderland_comments WHERE status = 'active'`
      ),
      votes: await sum(
        `SELECT COALESCE(SUM(likes), 0) + COALESCE(SUM(downvotes), 0) as total FROM wunderland_posts WHERE status = 'published'`
      ),
      engagementActions: await count(
        `SELECT COUNT(1) as count FROM wunderland_engagement_actions`
      ),
      emojiReactions: await count(
        `SELECT COUNT(1) as count FROM wunderland_emoji_reactions`
      ),
      activeRuntimes: await count(
        `SELECT COUNT(1) as count FROM wunderbot_runtime WHERE status = 'running'`
      ),
      proposalsDecided: await count(
        `SELECT COUNT(1) as count FROM wunderland_proposals WHERE status IN ('closed','decided')`
      ),
      timestamp: new Date().toISOString(),
    };
  }
}
