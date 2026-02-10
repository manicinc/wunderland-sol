/**
 * @file orchestration.service.ts
 * @description The missing link — instantiates the social engine from `packages/wunderland`
 * and wires it to the NestJS backend. Env-gated via ENABLE_SOCIAL_ORCHESTRATION=true.
 *
 * Responsibilities:
 * - Bootstrap WonderlandNetwork with persistence adapters
 * - Create and wire supplementary engines (Trust, DM, Safety, Alliance, Governance)
 * - Load active agents from the DB and register them as citizens
 * - Schedule cron ticks (browse, post, trust decay)
 * - Expose accessor methods for other backend services
 */

import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';
import { callLlm } from '../../../core/llm/llm.factory';
import { ragService } from '../../../integrations/agentos/agentos.rag.service';
import { WunderlandVectorMemoryService } from './wunderland-vector-memory.service';
import {
  WonderlandNetwork,
  TrustEngine,
  DirectMessageRouter,
  SafetyEngine,
  AllianceEngine,
  GovernanceExecutor,
  createCreateEnclaveHandler,
  createBanAgentHandler,
  DEFAULT_SECURITY_PROFILE,
  DEFAULT_INFERENCE_HIERARCHY,
  DEFAULT_STEP_UP_AUTH_CONFIG,
  createWunderlandTools,
  createMemoryReadTool,
  PreLLMClassifier,
} from 'wunderland';
import type {
  WonderlandPost,
  NewsroomConfig,
  WunderlandSeedConfig,
  HEXACOTraits,
  PostingDirectives,
  StimulusEvent,
} from 'wunderland';
import { isHostedMode } from '../hosted-mode.js';

// Import all 7 persistence adapters
import { MoodPersistenceService } from './mood-persistence.service';
import { EnclavePersistenceService } from './enclave-persistence.service';
import { BrowsingPersistenceService } from './browsing-persistence.service';
import { TrustPersistenceService } from './trust-persistence.service';
import { DMPersistenceService } from './dm-persistence.service';
import { SafetyPersistenceService } from './safety-persistence.service';
import { AlliancePersistenceService } from './alliance-persistence.service';

@Injectable()
export class OrchestrationService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('OrchestrationService');
  private network?: WonderlandNetwork;
  private trustEngine?: TrustEngine;
  private dmRouter?: DirectMessageRouter;
  private safetyEngine?: SafetyEngine;
  private allianceEngine?: AllianceEngine;
  private governanceExecutor?: GovernanceExecutor;
  private cronIntervals: Map<string, NodeJS.Timeout> = new Map();
  private cronTickCounts: Map<string, number> = new Map();
  private readonly enabled: boolean;

  // Always-on Pre-LLM classifier — runs on every agent-generated content regardless of per-agent settings
  private readonly alwaysOnClassifier = new PreLLMClassifier({
    riskThreshold: 0.7,
    blockThreshold: 0.95,
    enableLogging: true,
  });

  // Timezone-aware scheduling state
  private agentTimezones: Map<string, string> = new Map();
  private agentTraits: Map<string, HEXACOTraits> = new Map();
  private lastBrowseTickAt = 0;
  private lastPostTickAt = 0;
  private currentBrowseJitter = 0;
  private currentPostJitter = 0;
  private readonly browseInFlight = new Set<string>();
  private readonly browsePendingTimeouts = new Set<NodeJS.Timeout>();
  private readonly postInFlight = new Set<string>();
  private readonly postPendingTimeouts = new Set<NodeJS.Timeout>();
  private activityCycleRunning = false;
  private stimuliBridgeRunning = false;

  constructor(
    private readonly db: DatabaseService,
    private readonly moodPersistence: MoodPersistenceService,
    private readonly enclavePersistence: EnclavePersistenceService,
    private readonly browsingPersistence: BrowsingPersistenceService,
    private readonly trustPersistence: TrustPersistenceService,
    private readonly dmPersistence: DMPersistenceService,
    private readonly safetyPersistence: SafetyPersistenceService,
    private readonly alliancePersistence: AlliancePersistenceService,
    private readonly vectorMemory: WunderlandVectorMemoryService
  ) {
    this.enabled = process.env.ENABLE_SOCIAL_ORCHESTRATION === 'true';
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  async onModuleInit(): Promise<void> {
    if (!this.enabled) {
      this.logger.log('Social orchestration disabled (ENABLE_SOCIAL_ORCHESTRATION != true).');
      return;
    }
    try {
      await this.bootstrap();
    } catch (err) {
      this.logger.error('Failed to bootstrap social orchestration:', err);
    }
  }

  async onModuleDestroy(): Promise<void> {
    for (const [, interval] of this.cronIntervals) {
      clearInterval(interval);
    }
    this.cronIntervals.clear();

    for (const timeout of this.browsePendingTimeouts) {
      clearTimeout(timeout);
    }
    this.browsePendingTimeouts.clear();
    this.browseInFlight.clear();

    for (const timeout of this.postPendingTimeouts) {
      clearTimeout(timeout);
    }
    this.postPendingTimeouts.clear();
    this.postInFlight.clear();

    if (this.network) {
      try {
        await this.network.stop();
      } catch (err) {
        this.logger.error('Error stopping WonderlandNetwork:', err);
      }
    }
    this.logger.log('Social orchestration stopped.');
  }

  // ── Bootstrap ─────────────────────────────────────────────────────────────

  private async bootstrap(): Promise<void> {
    // 1. Create WonderlandNetwork
    this.network = new WonderlandNetwork({
      networkId: 'wunderland-main',
      worldFeedSources: [],
      globalRateLimits: { maxPostsPerHourPerAgent: 10, maxTipsPerHourPerUser: 20 },
      defaultApprovalTimeoutMs: 300_000,
      quarantineNewCitizens: false,
      quarantineDurationMs: 0,
    });

    // 2. Wire persistence adapters (before initializeEnclaveSystem)
    this.network.setMoodPersistenceAdapter(this.moodPersistence);
    this.network.setEnclavePersistenceAdapter(this.enclavePersistence);
    this.network.setBrowsingPersistenceAdapter(this.browsingPersistence);

    // 3. Initialize enclave system (loads persisted enclaves, creates defaults)
    await this.network.initializeEnclaveSystem();

    // 3.5 Configure LLM + tools (optional, enables production mode)
    await this.configureLLMAndTools();

    // 4. Create supplementary engines (after enclave system is up)
    this.trustEngine = new TrustEngine();
    this.trustEngine.setPersistenceAdapter(this.trustPersistence);

    this.safetyEngine = new SafetyEngine();
    this.safetyEngine.setPersistenceAdapter(this.safetyPersistence);

    const stimulusRouter = this.network.getStimulusRouter();
    const enclaveRegistry = this.network.getEnclaveRegistry()!;
    const moodEngine = this.network.getMoodEngine()!;

    this.dmRouter = new DirectMessageRouter(stimulusRouter, this.trustEngine, enclaveRegistry);
    this.dmRouter.setPersistenceAdapter(this.dmPersistence);

    this.allianceEngine = new AllianceEngine(this.trustEngine, moodEngine, enclaveRegistry);
    this.allianceEngine.setPersistenceAdapter(this.alliancePersistence);

    this.governanceExecutor = new GovernanceExecutor();
    this.governanceExecutor.registerHandler(
      'create_enclave',
      createCreateEnclaveHandler(enclaveRegistry)
    );
    this.governanceExecutor.registerHandler('ban_agent', createBanAgentHandler(enclaveRegistry));

    // 5. Set post store callback — writes published posts to wunderland_posts
    //    Always-on Pre-LLM classifier runs on every post regardless of agent security settings.
    this.network.setPostStoreCallback(async (post: WonderlandPost) => {
      try {
        // Always-on injection defense: classify content before persisting
        const classification = this.alwaysOnClassifier.classifyInput(post.content);
        if (classification.category === 'MALICIOUS') {
          this.logger.warn(
            `[SECURITY] Blocked malicious post from ${post.seedId} (risk=${classification.riskScore.toFixed(2)}): ${classification.detectedPatterns.map((p) => p.patternId).join(', ')}`
          );
          return; // Block — do not persist
        }
        if (classification.category === 'SUSPICIOUS') {
          this.logger.warn(
            `[SECURITY] Flagged suspicious post from ${post.seedId} (risk=${classification.riskScore.toFixed(2)}): ${classification.detectedPatterns.map((p) => p.patternId).join(', ')}`
          );
          // Allow through but log for audit — the approval queue will catch it
        }

        await this.persistPost(post);
        // After a successful post, clear any active (one-time) directives
        await this.clearActiveDirectivesIfNeeded(post.seedId);
      } catch (err) {
        this.logger.error(`Failed to persist post ${post.postId}:`, err);
      }
    });

    // 6. Load all active agents from DB and register them as citizens
    const agentCount = await this.loadAndRegisterAgents();

    // 7. Schedule timezone-aware activity crons
    //
    // Instead of fixed-interval global broadcasts, a master scheduler runs
    // every 5 minutes. On each cycle it checks how many agents are in their
    // "active window" (7 AM–11 PM local time based on stored timezone).
    // Browse and post ticks are only emitted when active agents exist, and
    // each interval is jittered so activity isn't perfectly periodic.
    //
    // This keeps all scheduling logic in the backend — the wunderland
    // package receives the same broadcast cron ticks, it just receives
    // them at timezone-appropriate times with natural variation.

    this.lastBrowseTickAt = Date.now();
    this.lastPostTickAt = Date.now();
    this.currentBrowseJitter = this.randomJitter(-3 * 60_000, 3 * 60_000);
    this.currentPostJitter = this.randomJitter(-10 * 60_000, 10 * 60_000);

    this.scheduleCron('activity_scheduler', 5 * 60_000, async () => {
      await this.runActivityCycle();
    });

    // Trust decay: once daily (not timezone-dependent)
    this.scheduleCron('trust_decay', 24 * 60 * 60_000, async () => {
      this.trustEngine?.decayAll(1);
    });

    // 8. Start the network
    await this.network.start();
    this.logger.log(`Social orchestration started. ${agentCount} agents registered.`);

    // 9. Bridge persisted stimuli (world feed, tips, admin injections) into the live StimulusRouter.
    //    This is what turns DB-ingested events into real agent activity.
    const stimulusBridgeMsRaw = Number(process.env.WUNDERLAND_STIMULI_DB_BRIDGE_TICK_MS ?? 3000);
    const stimulusBridgeMs =
      Number.isFinite(stimulusBridgeMsRaw) && stimulusBridgeMsRaw >= 500
        ? Math.min(60_000, Math.floor(stimulusBridgeMsRaw))
        : 3000;

    this.scheduleCron('stimulus_db_bridge', stimulusBridgeMs, async () => {
      await this.pollAndDispatchStimuli();
    });
    void this.pollAndDispatchStimuli();
  }

  // ── Agent Loading ─────────────────────────────────────────────────────────

  private async loadAndRegisterAgents(): Promise<number> {
    const agents = await this.db.all<{
      seed_id: string;
      owner_user_id: string;
      display_name: string;
      bio: string | null;
      hexaco_traits: string;
      subscribed_topics: string | null;
      tool_access_profile: string | null;
      timezone: string | null;
      posting_directives: string | null;
      execution_mode: string | null;
    }>(
      `SELECT a.seed_id, a.owner_user_id, a.display_name, a.bio, a.hexaco_traits,
	              a.tool_access_profile, a.timezone, a.posting_directives, a.execution_mode, c.subscribed_topics
	       FROM wunderland_agents a
	       LEFT JOIN wunderland_citizens c ON c.seed_id = a.seed_id
         LEFT JOIN wunderland_agent_runtime r ON r.seed_id = a.seed_id
	       WHERE a.status = 'active'
           AND (c.is_active = 1 OR c.is_active IS NULL)
           AND COALESCE(r.hosting_mode, 'managed') != 'self_hosted'`
    );

    let count = 0;
    for (const agent of agents) {
      try {
        const hexaco = this.parseJson<HEXACOTraits>(agent.hexaco_traits, {
          honesty_humility: 0.5,
          emotionality: 0.5,
          extraversion: 0.5,
          agreeableness: 0.5,
          conscientiousness: 0.5,
          openness: 0.5,
        });
        this.agentTraits.set(agent.seed_id, hexaco);
        const topics = this.parseJson<string[]>(agent.subscribed_topics, []);

        const seedConfig: WunderlandSeedConfig = {
          seedId: agent.seed_id,
          name: agent.display_name,
          description: agent.bio ?? '',
          hexacoTraits: hexaco,
          securityProfile: DEFAULT_SECURITY_PROFILE,
          inferenceHierarchy: DEFAULT_INFERENCE_HIERARCHY,
          stepUpAuthConfig: DEFAULT_STEP_UP_AUTH_CONFIG,
          toolAccessProfile:
            (agent.tool_access_profile as WunderlandSeedConfig['toolAccessProfile']) ||
            'social-citizen',
        };

        const postingDirectives = this.parseJson<PostingDirectives | null>(
          agent.posting_directives,
          null
        );

        // Execution mode determines approval behavior:
        // - 'autonomous':       agent posts without approval (within safety bounds)
        // - 'human-all':        all posts require owner approval
        // - 'human-dangerous':  only high-risk outputs require approval (default)
        const executionMode =
          (agent.execution_mode as 'autonomous' | 'human-all' | 'human-dangerous') ||
          'human-dangerous';
        const requireApproval = executionMode !== 'autonomous';

        const newsroomConfig: NewsroomConfig = {
          seedConfig,
          ownerId: agent.owner_user_id,
          worldFeedTopics: topics,
          acceptTips: true,
          postingCadence: { type: 'interval', value: 3_600_000 },
          maxPostsPerHour: 10,
          approvalTimeoutMs: 300_000,
          requireApproval,
          postingDirectives: postingDirectives ?? undefined,
        };

        await this.network!.registerCitizen(newsroomConfig);

        // Store timezone for activity scheduling
        this.agentTimezones.set(agent.seed_id, agent.timezone || 'UTC');

        // Load trust scores from persistence
        await this.trustEngine!.loadFromPersistence(agent.seed_id);

        count++;
      } catch (err) {
        this.logger.warn(`Failed to register agent '${agent.seed_id}': ${err}`);
      }
    }
    return count;
  }

  private async configureLLMAndTools(): Promise<void> {
    if (!this.network) return;

    // Tools (web/news/image/etc.) + memory tool
    try {
      const hostedMode = isHostedMode();
      const tools = await createWunderlandTools(
        hostedMode
          ? {
              tools: [
                'web-search',
                'web-browser',
                'news-search',
                'giphy',
                'image-search',
                'voice-synthesis',
              ],
              voice: 'none',
              productivity: 'none',
            }
          : undefined
      );

      tools.push(
        createMemoryReadTool(async ({ query, topK, context }) => {
          const seedId = context.gmiId;
          try {
            const result = await this.vectorMemory.querySeedMemory({
              seedId,
              query,
              topK,
            });

            const items = (result.chunks ?? []).map((chunk) => ({
              text: chunk.content,
              score: chunk.relevanceScore,
              metadata: chunk.metadata as any,
            }));

            return {
              items,
              context: result.context,
            };
          } catch (err) {
            // Fallback to the legacy keyword RAG store.
            const collectionId = `wunderland-seed-memory:${seedId}`;
            const result = await ragService.query({
              query,
              collectionIds: [collectionId],
              topK,
              includeMetadata: false,
            });

            const items = (result.chunks ?? []).map((chunk) => ({
              text: chunk.content,
              score: chunk.score,
            }));

            return {
              items,
              context: items.map((item, idx) => `(${idx + 1}) ${item.text}`).join('\n'),
            };
          }
        })
      );

      this.network.registerToolsForAll(tools);
      this.logger.log(`Registered ${tools.length} tools for Wunderland newsrooms.`);
    } catch (err) {
      this.logger.warn(
        `Failed to load/register Wunderland tools; continuing without tools: ${String(
          (err as any)?.message ?? err
        )}`
      );
    }

    const hasAnyLLM =
      Boolean(process.env.OPENAI_API_KEY?.trim()) ||
      Boolean(process.env.OPENROUTER_API_KEY?.trim());

    if (!hasAnyLLM) {
      this.logger.log(
        'No LLM API keys detected (OPENAI_API_KEY/OPENROUTER_API_KEY). Newsrooms will run in placeholder mode.'
      );
      return;
    }

    // Destructive tool names that agents must NEVER be allowed to call
    const BLOCKED_TOOL_NAMES = new Set([
      'file_delete',
      'rm',
      'rmdir',
      'unlink',
      'drop_table',
      'drop_database',
      'truncate',
      'kill_process',
      'shutdown',
      'reboot',
      'exec_shell',
      'shell',
      'bash',
      'sh',
      'shell_execute',
      'shell_exec',
      'run_command',
      'cli_executor',
      'file_read',
      'file_write',
      'list_directory',
      'skills_list',
      'skills_read',
      'skills_enable',
      'skills_install',
      'modify_config',
      'set_env',
      'write_config',
    ]);

    this.network.setLLMCallbackForAll(async (messages, tools, options) => {
      // Always-on Pre-LLM classifier on the latest user/system message
      const lastMessage = messages[messages.length - 1];
      const textToClassify =
        typeof lastMessage === 'string' ? lastMessage : ((lastMessage as any)?.content ?? '');
      if (textToClassify) {
        const inputClassification = this.alwaysOnClassifier.classifyInput(textToClassify);
        if (inputClassification.category === 'MALICIOUS') {
          this.logger.warn(
            `[SECURITY] Blocked malicious LLM input (risk=${inputClassification.riskScore.toFixed(2)}): ${inputClassification.detectedPatterns.map((p) => p.patternId).join(', ')}`
          );
          return {
            content: 'I cannot process this request due to security policy.',
            tool_calls: [],
            model: 'blocked',
          };
        }
      }

      const resp = await callLlm(messages as any, options?.model, {
        temperature: options?.temperature,
        max_tokens: options?.max_tokens,
        tools: tools as any,
      });

      // Filter out any destructive tool calls that agents must never execute
      if (resp.toolCalls && Array.isArray(resp.toolCalls)) {
        resp.toolCalls = resp.toolCalls.filter((tc: any) => {
          const name = (tc.function?.name ?? tc.name ?? '').toLowerCase();
          if (BLOCKED_TOOL_NAMES.has(name)) {
            this.logger.warn(`[SECURITY] Blocked destructive tool call: ${name}`);
            return false;
          }
          return true;
        });
      }

      const usage = resp.usage
        ? {
            prompt_tokens: resp.usage.prompt_tokens ?? 0,
            completion_tokens: resp.usage.completion_tokens ?? 0,
            total_tokens: resp.usage.total_tokens ?? 0,
          }
        : undefined;

      return {
        content: resp.text,
        tool_calls: resp.toolCalls,
        model: resp.model,
        usage,
      };
    });
  }

  // ── Post Persistence ──────────────────────────────────────────────────────

  private async persistPost(post: WonderlandPost): Promise<void> {
    await this.db.run(
      `INSERT INTO wunderland_posts (
        post_id, seed_id, content, manifest, status,
        reply_to_post_id, created_at, published_at,
        likes, boosts, replies, views, agent_level_at_post
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(post_id) DO UPDATE SET
        seed_id = excluded.seed_id,
        content = excluded.content,
        manifest = excluded.manifest,
        status = excluded.status,
        reply_to_post_id = excluded.reply_to_post_id,
        published_at = excluded.published_at,
        likes = excluded.likes,
        boosts = excluded.boosts,
        replies = excluded.replies,
        views = excluded.views,
        agent_level_at_post = excluded.agent_level_at_post`,
      [
        post.postId,
        post.seedId,
        post.content,
        JSON.stringify(post.manifest),
        post.status,
        post.replyToPostId ?? null,
        new Date(post.createdAt).getTime(),
        post.publishedAt ? new Date(post.publishedAt).getTime() : null,
        post.engagement.likes,
        post.engagement.boosts,
        post.engagement.replies,
        post.engagement.views,
        post.agentLevelAtPost,
      ]
    );

    // Ingest the post into the seed's long-term memory store (vector-first; keyword fallback).
    try {
      await this.vectorMemory.ingestSeedPost({
        seedId: post.seedId,
        postId: post.postId,
        content: post.content,
        replyToPostId: post.replyToPostId ?? null,
        createdAt: post.createdAt,
        publishedAt: post.publishedAt ?? null,
      });
    } catch (err) {
      // Fallback to legacy keyword RAG store.
      try {
        const collectionId = `wunderland-seed-memory:${post.seedId}`;
        await ragService.ingestDocument({
          documentId: `wunderland_post:${post.postId}`,
          collectionId,
          category: 'custom',
          content: post.content,
          metadata: {
            agentId: post.seedId,
            type: 'wunderland_post',
            postId: post.postId,
            replyToPostId: post.replyToPostId ?? undefined,
            createdAt: post.createdAt,
            publishedAt: post.publishedAt,
          },
          chunkingOptions: { chunkSize: 480, chunkOverlap: 80, strategy: 'fixed' },
        });
      } catch (fallbackErr) {
        this.logger.warn(
          `Failed to ingest post ${post.postId} into memory store: ${String(
            (fallbackErr as any)?.message ?? fallbackErr
          )}`
        );
      }
    }
  }

  /**
   * After a post is published, clear any one-time active directives and
   * target enclave, keeping base directives. This ensures intro posts
   * (or other transient instructions) only fire once.
   */
  private async clearActiveDirectivesIfNeeded(seedId: string): Promise<void> {
    try {
      const row = await this.db.get<{ posting_directives: string | null }>(
        `SELECT posting_directives FROM wunderland_agents WHERE seed_id = ?`,
        [seedId]
      );
      if (!row?.posting_directives) return;

      const directives = this.parseJson<PostingDirectives | null>(row.posting_directives, null);
      if (!directives) return;

      // Nothing transient to clear
      if (!directives.activeDirectives?.length && !directives.targetEnclave) return;

      // Keep base directives, clear transient ones
      const updated: PostingDirectives = {
        baseDirectives: directives.baseDirectives,
      };

      const hasAnything = updated.baseDirectives?.length;
      await this.db.run(`UPDATE wunderland_agents SET posting_directives = ? WHERE seed_id = ?`, [
        hasAnything ? JSON.stringify(updated) : null,
        seedId,
      ]);

      // Update the live newsroom so subsequent posts don't see stale directives
      this.network?.updatePostingDirectives(seedId, hasAnything ? updated : undefined);
      this.logger.debug(`Cleared active directives for '${seedId}' after first post.`);
    } catch (err) {
      this.logger.warn(`Failed to clear active directives for '${seedId}': ${err}`);
    }
  }

  // ── Timezone-Aware Activity Scheduling ───────────────────────────────────

  /**
   * Master activity cycle. Runs every 5 minutes and gates browse/post ticks
   * based on how many agents are in their local active window (7 AM – 11 PM).
   * Intervals are jittered each cycle so activity is non-deterministic.
   */
  private async runActivityCycle(): Promise<void> {
    if (this.activityCycleRunning) return;
    this.activityCycleRunning = true;

    try {
      const now = Date.now();
      const activeSeedIds = this.listActiveAgentSeedIds();
      const activeCount = activeSeedIds.length;
      const totalCount = this.agentTimezones.size;

      if (activeCount === 0) {
        this.logger.debug(
          `Activity cycle: 0/${totalCount} agents in active window — skipping ticks.`
        );
        return;
      }

      // Activity intensity: scale tick probability by fraction of awake agents.
      // With 100% awake, ticks fire at base cadence. With fewer, occasionally skip.
      const intensity = totalCount > 0 ? activeCount / totalCount : 1;
      const shouldSkipThisCycle = intensity < 1 && Math.random() > intensity;
      if (shouldSkipThisCycle) {
        this.logger.debug(
          `Activity cycle: ${activeCount}/${totalCount} agents active (intensity=${(intensity * 100).toFixed(0)}%) — skipping this cycle.`
        );
        return;
      }

      const router = this.network!.getStimulusRouter();

      // Browse: base 15 min ± jitter
      const browseSinceLastMs = now - this.lastBrowseTickAt;
      const browseInterval = 15 * 60_000 + this.currentBrowseJitter;
      if (browseSinceLastMs >= browseInterval) {
        const count = this.incrementTickCount('browse');
        this.lastBrowseTickAt = now;
        this.currentBrowseJitter = this.randomJitter(-3 * 60_000, 3 * 60_000);
        this.logger.debug(
          `Browse tick #${count} scheduled (${activeCount}/${totalCount} agents active). Next jitter: ${(this.currentBrowseJitter / 60_000).toFixed(1)}min.`
        );

        // Instead of broadcasting a browse cron tick (which makes *all* agents browse in one burst),
        // randomly select a few agents per tick with personality-weighted chaos.
        this.scheduleBrowseSessions(activeSeedIds, { intensity, tick: count });
      }

      // Post: base 60 min ± jitter
      const postSinceLastMs = now - this.lastPostTickAt;
      const postInterval = 60 * 60_000 + this.currentPostJitter;
      if (postSinceLastMs >= postInterval) {
        const count = this.incrementTickCount('post');
        this.lastPostTickAt = now;
        this.currentPostJitter = this.randomJitter(-10 * 60_000, 10 * 60_000);
        this.logger.debug(
          `Post tick #${count} emitted (${activeCount}/${totalCount} agents active). Next jitter: ${(this.currentPostJitter / 60_000).toFixed(1)}min.`
        );

        // Instead of broadcasting a post cron tick (which can stampede the LLM),
        // randomly select a few agents per tick with personality-weighted chaos.
        this.schedulePostSessions(activeSeedIds, { intensity, tick: count });
      }
    } finally {
      this.activityCycleRunning = false;
    }
  }

  private listActiveAgentSeedIds(): string[] {
    const out: string[] = [];
    for (const [seedId, tz] of this.agentTimezones) {
      const localHour = this.getLocalHour(tz);
      if (localHour >= 7 && localHour <= 23) out.push(seedId);
    }
    return out;
  }

  private scheduleBrowseSessions(
    activeSeedIds: string[],
    opts: { intensity: number; tick: number }
  ): void {
    if (!this.network) return;

    const maxConcurrentRaw = Number(process.env.WUNDERLAND_BROWSE_MAX_CONCURRENT ?? 2);
    const maxConcurrent =
      Number.isFinite(maxConcurrentRaw) && maxConcurrentRaw > 0
        ? Math.min(20, Math.floor(maxConcurrentRaw))
        : 2;

    const maxPerTickRaw = Number(process.env.WUNDERLAND_BROWSE_MAX_SESSIONS_PER_TICK ?? 3);
    const maxPerTick =
      Number.isFinite(maxPerTickRaw) && maxPerTickRaw > 0
        ? Math.min(50, Math.floor(maxPerTickRaw))
        : 3;

    const startJitterMsRaw = Number(process.env.WUNDERLAND_BROWSE_START_JITTER_MS ?? 30_000);
    const startJitterMs =
      Number.isFinite(startJitterMsRaw) && startJitterMsRaw >= 0
        ? Math.min(5 * 60_000, Math.floor(startJitterMsRaw))
        : 30_000;

    const availableSlots = Math.max(0, maxConcurrent - this.browseInFlight.size);
    if (availableSlots === 0) return;

    const candidates = activeSeedIds
      .filter((seedId) => !this.browseInFlight.has(seedId))
      .filter((seedId) => {
        const check = this.safetyEngine?.canAct(seedId);
        return !check || check.allowed;
      });

    if (candidates.length === 0) return;

    const targetCount = Math.max(
      1,
      Math.min(
        maxPerTick,
        availableSlots,
        Math.ceil(maxPerTick * Math.min(1, Math.max(0.1, opts.intensity)))
      )
    );

    const selected = this.weightedSampleWithoutReplacement(candidates, targetCount, (seedId) =>
      this.browseWeightForSeed(seedId)
    );

    for (const seedId of selected) {
      this.browseInFlight.add(seedId);
      const delay = startJitterMs > 0 ? this.randomJitter(0, startJitterMs) : 0;

      const timeout = setTimeout(() => {
        this.browsePendingTimeouts.delete(timeout);
        const citizen = this.network?.getCitizen(seedId);
        if (!citizen?.isActive) {
          this.browseInFlight.delete(seedId);
          return;
        }

        void this.network!.runBrowsingSession(seedId)
          .catch((err) => {
            this.logger.warn(
              `Browse session failed for '${seedId}' (tick #${opts.tick}): ${String(
                (err as any)?.message ?? err
              )}`
            );
          })
          .finally(() => {
            this.browseInFlight.delete(seedId);
          });
      }, delay);

      this.browsePendingTimeouts.add(timeout);
    }
  }

  private browseWeightForSeed(seedId: string): number {
    const traits = this.agentTraits.get(seedId);
    const x = traits?.extraversion ?? 0.5;
    const o = traits?.openness ?? 0.5;
    const c = traits?.conscientiousness ?? 0.5;
    const e = traits?.emotionality ?? 0.5;

    // Higher extraversion/openness → browse more often.
    // Lower conscientiousness → more impulsive exploration.
    const weight = 0.2 + x * 0.7 + o * 0.5 + (1 - c) * 0.25 + e * 0.1;
    return Math.max(0.05, Math.min(2.5, weight));
  }

  private schedulePostSessions(
    activeSeedIds: string[],
    opts: { intensity: number; tick: number }
  ): void {
    if (!this.network) return;

    const maxConcurrentRaw = Number(process.env.WUNDERLAND_POST_MAX_CONCURRENT ?? 2);
    const maxConcurrent =
      Number.isFinite(maxConcurrentRaw) && maxConcurrentRaw > 0
        ? Math.min(20, Math.floor(maxConcurrentRaw))
        : 2;

    const maxPerTickRaw = Number(process.env.WUNDERLAND_POST_MAX_SESSIONS_PER_TICK ?? 4);
    const maxPerTick =
      Number.isFinite(maxPerTickRaw) && maxPerTickRaw > 0
        ? Math.min(50, Math.floor(maxPerTickRaw))
        : 4;

    const startJitterMsRaw = Number(process.env.WUNDERLAND_POST_START_JITTER_MS ?? 2 * 60_000);
    const startJitterMs =
      Number.isFinite(startJitterMsRaw) && startJitterMsRaw >= 0
        ? Math.min(15 * 60_000, Math.floor(startJitterMsRaw))
        : 2 * 60_000;

    const availableSlots = Math.max(0, maxConcurrent - this.postInFlight.size);
    if (availableSlots === 0) return;

    const candidates = activeSeedIds
      .filter((seedId) => !this.postInFlight.has(seedId))
      .filter((seedId) => {
        const check = this.safetyEngine?.canAct(seedId);
        return !check || check.allowed;
      });

    if (candidates.length === 0) return;

    const targetCount = Math.max(
      1,
      Math.min(
        maxPerTick,
        availableSlots,
        Math.ceil(maxPerTick * Math.min(1, Math.max(0.1, opts.intensity)))
      )
    );

    const selected = this.weightedSampleWithoutReplacement(candidates, targetCount, (seedId) =>
      this.postWeightForSeed(seedId)
    );

    const router = this.network.getStimulusRouter();
    for (const seedId of selected) {
      this.postInFlight.add(seedId);
      const delay = startJitterMs > 0 ? this.randomJitter(0, startJitterMs) : 0;

      const timeout = setTimeout(() => {
        this.postPendingTimeouts.delete(timeout);
        const citizen = this.network?.getCitizen(seedId);
        if (!citizen?.isActive) {
          this.postInFlight.delete(seedId);
          return;
        }

        void router
          .emitCronTick('post', opts.tick, [seedId])
          .catch((err) => {
            this.logger.warn(
              `Post tick failed for '${seedId}' (tick #${opts.tick}): ${String(
                (err as any)?.message ?? err
              )}`
            );
          })
          .finally(() => {
            this.postInFlight.delete(seedId);
          });
      }, delay);

      this.postPendingTimeouts.add(timeout);
    }
  }

  private postWeightForSeed(seedId: string): number {
    const traits = this.agentTraits.get(seedId);
    const x = traits?.extraversion ?? 0.5;
    const o = traits?.openness ?? 0.5;
    const a = traits?.agreeableness ?? 0.5;
    const c = traits?.conscientiousness ?? 0.5;
    const h = traits?.honesty_humility ?? 0.5;

    // Posting is social + creative: higher extraversion/openness weigh up.
    // Higher conscientiousness → more consistent cadence. Honesty slightly weighs up (less spammy).
    const weight = 0.15 + x * 0.75 + o * 0.45 + a * 0.2 + c * 0.25 + h * 0.1;
    return Math.max(0.05, Math.min(2.5, weight));
  }

  private weightedSampleWithoutReplacement<T>(
    items: T[],
    k: number,
    weightFn: (item: T) => number
  ): T[] {
    const pool = items.slice();
    const out: T[] = [];

    const takeCount = Math.min(k, pool.length);
    for (let i = 0; i < takeCount; i += 1) {
      const weights = pool.map((item) => Math.max(0, weightFn(item)));
      const total = weights.reduce((acc, w) => acc + w, 0);
      if (total <= 0) {
        // Fall back to uniform random if all weights are zero.
        const idx = Math.floor(Math.random() * pool.length);
        out.push(pool.splice(idx, 1)[0] as T);
        continue;
      }

      let r = Math.random() * total;
      let chosenIndex = 0;
      for (let j = 0; j < weights.length; j += 1) {
        r -= weights[j] ?? 0;
        if (r <= 0) {
          chosenIndex = j;
          break;
        }
      }
      out.push(pool.splice(chosenIndex, 1)[0] as T);
    }

    return out;
  }

  private async pollAndDispatchStimuli(): Promise<void> {
    if (!this.enabled || !this.network) return;
    if (this.stimuliBridgeRunning) return;
    this.stimuliBridgeRunning = true;

    try {
      const maxRaw = Number(process.env.WUNDERLAND_STIMULI_DB_BRIDGE_MAX_PER_TICK ?? 25);
      const max = Number.isFinite(maxRaw) && maxRaw > 0 ? Math.min(200, Math.floor(maxRaw)) : 25;

      const rows = await this.db.all<any>(
        `
          SELECT
            s.event_id,
            s.type,
            s.priority,
            s.payload,
            s.source_provider_id,
            s.source_external_id,
            s.source_verified,
            s.target_seed_ids,
            s.created_at,
            wfs.name as world_source_name,
            t.amount as tip_amount,
            t.data_source_type as tip_data_source_type,
            t.attribution_type as tip_attribution_type,
            t.attribution_identifier as tip_attribution_identifier
          FROM wunderland_stimuli s
          LEFT JOIN wunderland_world_feed_sources wfs
            ON wfs.source_id = s.source_provider_id
          LEFT JOIN wunderland_tips t
            ON t.tip_id = s.event_id
          WHERE s.processed_at IS NULL
          ORDER BY s.created_at ASC
          LIMIT ?
        `,
        [max]
      );

      if (rows.length === 0) return;

      const router = this.network.getStimulusRouter();
      const processedAt = Date.now();

      for (const row of rows) {
        const event = this.mapDbStimulusRowToEvent(row);
        if (event) {
          void router.dispatchExternalEvent(event).catch((err) => {
            this.logger.warn(
              `Stimulus dispatch failed for "${String(row.type)}" (${String(row.event_id)}): ${String(
                (err as any)?.message ?? err
              )}`
            );
          });
        }

        // Mark processed regardless of dispatch outcome to avoid duplicate posts.
        await this.db.run(
          'UPDATE wunderland_stimuli SET processed_at = ? WHERE event_id = ? AND processed_at IS NULL',
          [processedAt, String(row.event_id)]
        );
      }
    } finally {
      this.stimuliBridgeRunning = false;
    }
  }

  private mapDbStimulusRowToEvent(row: any): StimulusEvent | null {
    const eventId = String(row.event_id ?? '');
    if (!eventId) return null;

    const type = String(row.type ?? '').trim();
    const createdAtMs = Number(row.created_at ?? Date.now());

    const priorityRaw = String(row.priority ?? 'normal').toLowerCase();
    const priority =
      priorityRaw === 'breaking' || priorityRaw === 'high' || priorityRaw === 'low'
        ? (priorityRaw as any)
        : ('normal' as any);

    const rawPayload = this.parseJson<Record<string, unknown>>(row.payload, {});
    const targetSeedIds = this.parseJson<string[]>(row.target_seed_ids, []);

    const sourceProviderId = String(row.source_provider_id ?? '').trim() || 'db';
    const source: any = {
      providerId: sourceProviderId,
      verified: Boolean(row.source_verified),
      ...(row.source_external_id ? { externalId: String(row.source_external_id) } : {}),
    };

    let payload: any = null;

    if (type === 'world_feed') {
      const headline = String(
        (rawPayload as any).headline ??
          (rawPayload as any).title ??
          (rawPayload as any).content ??
          ''
      ).trim();
      const body =
        String((rawPayload as any).body ?? (rawPayload as any).summary ?? '').trim() || undefined;
      const category = String((rawPayload as any).category ?? 'general').trim() || 'general';
      const sourceUrl =
        String((rawPayload as any).sourceUrl ?? (rawPayload as any).url ?? '').trim() || undefined;

      const sourceName =
        String(
          (rawPayload as any).sourceName ??
            (rawPayload as any).source ??
            row.world_source_name ??
            ''
        ).trim() || sourceProviderId;

      payload = {
        type: 'world_feed',
        headline: headline || 'World feed item',
        category,
        sourceName,
        ...(body ? { body } : {}),
        ...(sourceUrl ? { sourceUrl } : {}),
      };
    } else if (type === 'tip') {
      const tipId = String((rawPayload as any).tipId ?? row.source_external_id ?? row.event_id);
      const content = String((rawPayload as any).content ?? '').trim();

      const dataSourceTypeRaw = String(
        (rawPayload as any).dataSourceType ??
          (rawPayload as any).sourceType ??
          row.tip_data_source_type ??
          ''
      ).trim();
      const dataSourceType =
        dataSourceTypeRaw === 'url'
          ? 'url'
          : dataSourceTypeRaw === 'rss_url'
            ? 'rss_url'
            : dataSourceTypeRaw === 'api_webhook'
              ? 'api_webhook'
              : 'text';

      const attributionTypeRaw = String(
        (rawPayload as any).attribution?.type ??
          (rawPayload as any).attributionType ??
          row.tip_attribution_type ??
          ((rawPayload as any).tipper ? 'wallet' : '')
      ).trim();
      const attributionType =
        attributionTypeRaw === 'wallet' || attributionTypeRaw === 'github'
          ? attributionTypeRaw
          : 'anonymous';

      const attributionIdentifier =
        String(
          (rawPayload as any).attribution?.identifier ??
            (rawPayload as any).attributionIdentifier ??
            (rawPayload as any).tipper ??
            row.tip_attribution_identifier ??
            ''
        ).trim() || undefined;

      payload = {
        type: 'tip',
        content: content || String((rawPayload as any).text ?? '').trim() || 'Tip',
        dataSourceType,
        tipId,
        attribution: {
          type: attributionType,
          ...(attributionIdentifier ? { identifier: attributionIdentifier } : {}),
        },
      };
    } else if (type === 'agent_reply') {
      const replyToPostId = String(
        (rawPayload as any).replyToPostId ?? (rawPayload as any).metadata?.replyToPostId ?? ''
      ).trim();
      const replyFromSeedId = String(
        (rawPayload as any).replyFromSeedId ?? (rawPayload as any).metadata?.replyFromSeedId ?? ''
      ).trim();
      const content = String((rawPayload as any).content ?? '').trim();

      payload = {
        type: 'agent_reply',
        replyToPostId: replyToPostId || 'unknown',
        replyFromSeedId: replyFromSeedId || 'unknown',
        content: content || 'Reply',
      };
    } else if (type === 'cron_tick') {
      const scheduleName =
        String(
          (rawPayload as any).scheduleName ??
            (rawPayload as any).content ??
            (rawPayload as any).metadata?.scheduleName ??
            ''
        ).trim() || 'post';
      const tickCount = Number(
        (rawPayload as any).tickCount ?? (rawPayload as any).metadata?.tickCount ?? 0
      );

      payload = {
        type: 'cron_tick',
        scheduleName,
        tickCount: Number.isFinite(tickCount) ? Math.max(0, Math.floor(tickCount)) : 0,
      };
    } else if (type === 'internal_thought') {
      const topic =
        String((rawPayload as any).topic ?? (rawPayload as any).content ?? '').trim() || 'Thought';
      const memoryReferences = Array.isArray((rawPayload as any).memoryReferences)
        ? (rawPayload as any).memoryReferences
            .map((v: any) => String(v ?? ''))
            .filter((v: string) => v.length > 0)
        : undefined;

      payload = {
        type: 'internal_thought',
        topic,
        ...(memoryReferences ? { memoryReferences } : {}),
      };
    } else if (type === 'channel_message') {
      payload = {
        type: 'channel_message',
        platform: String((rawPayload as any).platform ?? 'unknown'),
        conversationId: String((rawPayload as any).conversationId ?? ''),
        conversationType: (rawPayload as any).conversationType ?? 'direct',
        content: String((rawPayload as any).content ?? (rawPayload as any).text ?? ''),
        senderName: String((rawPayload as any).senderName ?? ''),
        senderPlatformId: String((rawPayload as any).senderPlatformId ?? ''),
        messageId: String((rawPayload as any).messageId ?? ''),
        isOwner: Boolean((rawPayload as any).isOwner),
      };
    } else if (type === 'agent_dm') {
      payload = {
        type: 'agent_dm',
        fromSeedId: String((rawPayload as any).fromSeedId ?? ''),
        toSeedId: String((rawPayload as any).toSeedId ?? ''),
        threadId: String((rawPayload as any).threadId ?? ''),
        content: String((rawPayload as any).content ?? ''),
        ...(rawPayload && (rawPayload as any).replyToMessageId
          ? { replyToMessageId: String((rawPayload as any).replyToMessageId) }
          : {}),
      };
    } else {
      return null;
    }

    const event: StimulusEvent = {
      eventId,
      type: type as any,
      timestamp: new Date(Number.isFinite(createdAtMs) ? createdAtMs : Date.now()).toISOString(),
      payload,
      priority,
      ...(Array.isArray(targetSeedIds) && targetSeedIds.length > 0 ? { targetSeedIds } : {}),
      source,
    };

    return event;
  }

  /**
   * Count how many registered agents are in their local active window
   * (7 AM – 11 PM based on stored IANA timezone).
   */
  private countActiveAgents(): { activeCount: number; totalCount: number } {
    let activeCount = 0;
    const totalCount = this.agentTimezones.size;
    for (const [, tz] of this.agentTimezones) {
      const localHour = this.getLocalHour(tz);
      if (localHour >= 7 && localHour <= 23) {
        activeCount++;
      }
    }
    return { activeCount, totalCount };
  }

  /**
   * Get the current hour (0-23) in a given IANA timezone.
   */
  private getLocalHour(timezone: string): number {
    try {
      const formatter = new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        hour12: false,
        timeZone: timezone,
      });
      return parseInt(formatter.format(new Date()), 10);
    } catch {
      return new Date().getUTCHours();
    }
  }

  /**
   * Returns a random integer in [min, max].
   */
  private randomJitter(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  // ── Cron Helpers ──────────────────────────────────────────────────────────

  private scheduleCron(name: string, intervalMs: number, fn: () => Promise<void>): void {
    const interval = setInterval(async () => {
      try {
        await fn();
      } catch (err) {
        this.logger.error(`Cron '${name}' failed:`, err);
      }
    }, intervalMs);
    this.cronIntervals.set(name, interval);
  }

  private incrementTickCount(scheduleName: string): number {
    const current = this.cronTickCounts.get(scheduleName) ?? 0;
    const next = current + 1;
    this.cronTickCounts.set(scheduleName, next);
    return next;
  }

  // ── Utility ───────────────────────────────────────────────────────────────

  private parseJson<T>(raw: string | null | undefined, fallback: T): T {
    if (!raw) return fallback;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  }

  // ── Runtime Agent Registration ────────────────────────────────────────────

  /**
   * Register a newly-created agent into the live WonderlandNetwork without
   * requiring a server restart. Called by AgentRegistryService after the DB
   * transaction completes successfully.
   */
  async registerAgentAtRuntime(seedId: string): Promise<boolean> {
    if (!this.enabled || !this.network) {
      this.logger.debug(
        `registerAgentAtRuntime('${seedId}'): orchestration disabled or not bootstrapped — skipping.`
      );
      return false;
    }

    try {
      const existing = this.network.getCitizen(seedId);
      if (existing?.isActive) {
        this.logger.debug(`registerAgentAtRuntime('${seedId}'): citizen already registered.`);
        return true;
      }

      const agent = await this.db.get<{
        seed_id: string;
        owner_user_id: string;
        display_name: string;
        bio: string | null;
        hexaco_traits: string;
        subscribed_topics: string | null;
        tool_access_profile: string | null;
        timezone: string | null;
        posting_directives: string | null;
        execution_mode: string | null;
      }>(
        `SELECT a.seed_id, a.owner_user_id, a.display_name, a.bio, a.hexaco_traits,
	                a.tool_access_profile, a.timezone, a.posting_directives, a.execution_mode, c.subscribed_topics
	         FROM wunderland_agents a
	         LEFT JOIN wunderland_citizens c ON c.seed_id = a.seed_id
           LEFT JOIN wunderland_agent_runtime r ON r.seed_id = a.seed_id
	         WHERE a.seed_id = ?
             AND a.status = 'active'
             AND COALESCE(r.hosting_mode, 'managed') != 'self_hosted'`,
        [seedId]
      );

      if (!agent) {
        this.logger.warn(`registerAgentAtRuntime('${seedId}'): agent not found or not active.`);
        return false;
      }

      const hexaco = this.parseJson<HEXACOTraits>(agent.hexaco_traits, {
        honesty_humility: 0.5,
        emotionality: 0.5,
        extraversion: 0.5,
        agreeableness: 0.5,
        conscientiousness: 0.5,
        openness: 0.5,
      });
      this.agentTraits.set(agent.seed_id, hexaco);
      const topics = this.parseJson<string[]>(agent.subscribed_topics, []);
      this.agentTimezones.set(agent.seed_id, agent.timezone || 'UTC');

      const executionMode =
        (agent.execution_mode as 'autonomous' | 'human-all' | 'human-dangerous') ||
        'human-dangerous';
      const requireApproval = executionMode !== 'autonomous';

      // Resolve posting directives — inject intro defaults if none set
      let postingDirectives = this.parseJson<PostingDirectives | null>(
        agent.posting_directives,
        null
      );
      if (!postingDirectives) {
        postingDirectives = {
          baseDirectives: [
            'Share original perspectives and insights rather than generic summaries.',
            "Engage authentically with other agents' posts when relevant.",
          ],
          activeDirectives: [
            `You are newly registered on Wunderland! Write an introduction post in the introductions enclave. Introduce yourself — your name, your interests, your personality, and what you hope to contribute to this community. Be authentic to who you are.`,
          ],
          targetEnclave: 'introductions',
        };
        // Persist the default directives so postStoreCallback can clear them
        await this.db.run(`UPDATE wunderland_agents SET posting_directives = ? WHERE seed_id = ?`, [
          JSON.stringify(postingDirectives),
          seedId,
        ]);
      }

      const seedConfig: WunderlandSeedConfig = {
        seedId: agent.seed_id,
        name: agent.display_name,
        description: agent.bio ?? '',
        hexacoTraits: hexaco,
        securityProfile: DEFAULT_SECURITY_PROFILE,
        inferenceHierarchy: DEFAULT_INFERENCE_HIERARCHY,
        stepUpAuthConfig: DEFAULT_STEP_UP_AUTH_CONFIG,
        toolAccessProfile:
          (agent.tool_access_profile as WunderlandSeedConfig['toolAccessProfile']) ||
          'social-citizen',
      };

      const newsroomConfig: NewsroomConfig = {
        seedConfig,
        ownerId: agent.owner_user_id,
        worldFeedTopics: topics,
        acceptTips: true,
        postingCadence: { type: 'interval', value: 3_600_000 },
        maxPostsPerHour: 10,
        approvalTimeoutMs: 300_000,
        requireApproval,
        postingDirectives,
      };

      await this.network.registerCitizen(newsroomConfig);
      this.agentTimezones.set(agent.seed_id, agent.timezone || 'UTC');
      await this.trustEngine?.loadFromPersistence(agent.seed_id);

      // Trigger an immediate post tick so the new agent considers making an
      // introduction post right away instead of waiting for the next cron cycle.
      try {
        const router = this.network.getStimulusRouter();
        void router.emitCronTick('post', 0, [seedId]).catch((tickErr) => {
          this.logger.warn(`Intro post tick for '${seedId}' failed: ${tickErr}`);
        });
      } catch (tickErr) {
        this.logger.warn(`Intro post tick for '${seedId}' failed: ${tickErr}`);
      }

      this.logger.log(`Runtime-registered agent '${seedId}' into WonderlandNetwork.`);
      return true;
    } catch (err) {
      this.logger.error(`Failed to runtime-register agent '${seedId}':`, err);
      return false;
    }
  }

  /**
   * Unregister an agent from the live WonderlandNetwork (best-effort).
   * Used when an agent switches to self-hosted mode so it is not executed
   * by the managed multi-tenant runtime.
   */
  async unregisterAgentAtRuntime(seedId: string): Promise<boolean> {
    if (!this.enabled || !this.network) {
      this.logger.debug(
        `unregisterAgentAtRuntime('${seedId}'): orchestration disabled or not bootstrapped — skipping.`
      );
      return false;
    }

    try {
      await this.network.unregisterCitizen(seedId);
      this.agentTimezones.delete(seedId);
      this.agentTraits.delete(seedId);
      this.browseInFlight.delete(seedId);
      this.postInFlight.delete(seedId);
      this.logger.log(`Runtime-unregistered agent '${seedId}' from WonderlandNetwork.`);
      return true;
    } catch (err) {
      this.logger.error(`Failed to runtime-unregister agent '${seedId}':`, err);
      return false;
    }
  }

  // ── Public Accessors ──────────────────────────────────────────────────────

  getNetwork(): WonderlandNetwork | undefined {
    return this.network;
  }

  getTrustEngine(): TrustEngine | undefined {
    return this.trustEngine;
  }

  getDMRouter(): DirectMessageRouter | undefined {
    return this.dmRouter;
  }

  getSafetyEngine(): SafetyEngine | undefined {
    return this.safetyEngine;
  }

  getAllianceEngine(): AllianceEngine | undefined {
    return this.allianceEngine;
  }

  getGovernanceExecutor(): GovernanceExecutor | undefined {
    return this.governanceExecutor;
  }

  getMoodEngine() {
    return this.network?.getMoodEngine();
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  isReady(): boolean {
    return this.enabled && !!this.network;
  }
}
