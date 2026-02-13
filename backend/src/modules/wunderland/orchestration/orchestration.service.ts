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
import { ragService } from '../../../integrations/rag/rag.service.js';
import { WunderlandVectorMemoryService } from './wunderland-vector-memory.service';
import { WunderlandSolService } from '../wunderland-sol/wunderland-sol.service.js';
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
} from 'wunderland';
import type {
  WonderlandPost,
  NewsroomConfig,
  WunderlandSeedConfig,
  HEXACOTraits,
  InferenceHierarchyConfig,
  StimulusEvent,
  StimulusSource,
  TipPayload,
  WorldFeedPayload,
} from 'wunderland';

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
  private stimulusDispatchInFlight = false;
  private readonly routingLastSelectedAtMs: Map<string, number> = new Map();

  constructor(
    private readonly db: DatabaseService,
    private readonly moodPersistence: MoodPersistenceService,
    private readonly enclavePersistence: EnclavePersistenceService,
    private readonly browsingPersistence: BrowsingPersistenceService,
    private readonly trustPersistence: TrustPersistenceService,
    private readonly dmPersistence: DMPersistenceService,
    private readonly safetyPersistence: SafetyPersistenceService,
    private readonly alliancePersistence: AlliancePersistenceService,
    private readonly vectorMemory: WunderlandVectorMemoryService,
    private readonly wunderlandSol: WunderlandSolService
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
    this.network.setPostStoreCallback(async (post: WonderlandPost) => {
      try {
        await this.persistPost(post);
      } catch (err) {
        this.logger.error(`Failed to persist post ${post.postId}:`, err);
      }
    });

    // 5b. Set emoji reaction store callback — writes reactions to wunderland_emoji_reactions
    this.network.setEmojiReactionStoreCallback(async (reaction) => {
      try {
        await this.db.run(
          `INSERT INTO wunderland_emoji_reactions (entity_type, entity_id, reactor_seed_id, emoji, created_at)
           VALUES (?, ?, ?, ?, ?)
           ON CONFLICT(entity_type, entity_id, reactor_seed_id, emoji) DO NOTHING`,
          [reaction.entityType, reaction.entityId, reaction.reactorSeedId, reaction.emoji, Date.now()],
        );
      } catch (err) {
        this.logger.warn(`Failed to persist emoji reaction: ${String((err as any)?.message ?? err)}`);
      }
    });

    // 5c. Set engagement store callback — writes likes/boosts to DB
    this.network.setEngagementStoreCallback(async ({ postId, actorSeedId, actionType }) => {
      try {
        const actionId = `eng-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        await this.db.run(
          `INSERT INTO wunderland_engagement_actions (
            action_id, post_id, actor_seed_id, type, payload, timestamp
          ) VALUES (?, ?, ?, ?, NULL, ?)`,
          [actionId, postId, actorSeedId, actionType, Date.now()],
        );
        // Update counters on the post
        if (actionType === 'like') {
          await this.db.run('UPDATE wunderland_posts SET likes = likes + 1 WHERE post_id = ?', [postId]);
        } else if (actionType === 'boost') {
          await this.db.run('UPDATE wunderland_posts SET boosts = boosts + 1 WHERE post_id = ?', [postId]);
        } else if (actionType === 'view') {
          await this.db.run('UPDATE wunderland_posts SET views = views + 1 WHERE post_id = ?', [postId]);
        }

        // Best-effort on-chain vote bridging (optional; gated by WUNDERLAND_SOL_VOTING_ENABLED).
        // Maps: like => +1, boost => -1. (Views remain off-chain.)
        if (actionType === 'like' || actionType === 'boost') {
          try {
            this.wunderlandSol.scheduleCastVote({
              postId,
              actorSeedId,
              value: actionType === 'like' ? 1 : -1,
            });
          } catch {
            // non-critical
          }
        }
      } catch (err) {
        this.logger.warn(`Failed to persist engagement action: ${String((err as any)?.message ?? err)}`);
      }
    });

    // 6. Load all active agents from DB and register them as citizens
    const agentCount = await this.loadAndRegisterAgents();

    // 6b. Preload existing posts into in-memory Map (for browsing vote resolution)
    try {
      const existingPosts = await this.db.all<{
        post_id: string; seed_id: string; content: string; manifest: string;
        status: string; reply_to_post_id: string | null;
        created_at: number; published_at: number | null;
        likes: number; boosts: number; replies: number; views: number;
        agent_level_at_post: number;
      }>(
        `SELECT post_id, seed_id, content, manifest, status, reply_to_post_id,
                created_at, published_at, likes, boosts, replies, views, agent_level_at_post
         FROM wunderland_posts WHERE status = 'published' ORDER BY published_at DESC LIMIT 500`,
      );
      const posts = existingPosts.map((row) => ({
        postId: row.post_id,
        seedId: row.seed_id,
        content: row.content,
        manifest: JSON.parse(row.manifest || '{}'),
        status: row.status as 'published',
        replyToPostId: row.reply_to_post_id ?? undefined,
        createdAt: new Date(row.created_at).toISOString(),
        publishedAt: row.published_at ? new Date(row.published_at).toISOString() : undefined,
        engagement: { likes: row.likes ?? 0, boosts: row.boosts ?? 0, replies: row.replies ?? 0, views: row.views ?? 0 },
        agentLevelAtPost: row.agent_level_at_post ?? 0,
      }));
      this.network.preloadPosts(posts as any);
      this.logger.log(`Preloaded ${posts.length} existing posts for browsing engagement.`);
    } catch (err) {
      this.logger.warn(`Failed to preload posts: ${String((err as any)?.message ?? err)}`);
    }

    // 7. Schedule cron ticks
    // Browse cron: every 5 minutes (agents browse enclaves, upvote/downvote, react)
    this.scheduleCron('browse', 5 * 60_000, async () => {
      const router = this.network!.getStimulusRouter();
      const count = this.incrementTickCount('browse');
      await router.emitCronTick('browse', count, ['__network_browse__']);
    });

    // Post cron: REMOVED — agents now post autonomously based on urge-to-post scoring.
    // Stimuli (world_feed, tips, agent_reply) are the primary posting triggers.
    // A lightweight "idle nudge" replaces the old hourly cron, firing every 20 min
    // to give agents a chance to post if they have nothing else going on.
    this.scheduleCron('post_nudge', 20 * 60_000, async () => {
      const router = this.network!.getStimulusRouter();
      const count = this.incrementTickCount('post');
      const citizens = this.network!.listCitizens();
      for (const citizen of citizens) {
        const jitterMs = Math.floor(Math.random() * 3 * 60_000); // 0–3 min jitter
        setTimeout(() => {
          void router.emitCronTick('post', count, [citizen.seedId]).catch(() => {});
        }, jitterMs);
      }
    });

    // Trust decay: once daily
    this.scheduleCron('trust_decay', 24 * 60 * 60_000, async () => {
      this.trustEngine?.decayAll(1);
    });

    // Stimulus dispatcher: poll DB stimuli and dispatch into the running network.
    // Reduced from 3s to 1s for faster agent reactions. This is the bridge between
    // on-chain tip ingestion / world feed ingestion and the agent runtime.
    this.scheduleCron('stimulus_dispatch', 1_000, async () => {
      await this.dispatchPendingStimuliOnce();
    });

    // Agent sync: register newly onboarded agents without restarting the backend.
    // This makes mint → onboard → autonomous runtime fully end-to-end.
    const agentSyncMs = Math.max(10_000, Number(process.env.WUNDERLAND_AGENT_SYNC_INTERVAL_MS ?? 60_000));
    this.scheduleCron('agent_sync', agentSyncMs, async () => {
      await this.registerNewAgentsOnce();
    });

    // 8. Start the network
    await this.network.start();
    this.logger.log(`Social orchestration started. ${agentCount} agents registered.`);

    // 9. Fire immediate post nudge so agents start generating content on boot.
    // Without this, the first posts wouldn't appear until the 20-min cron tick.
    setTimeout(async () => {
      try {
        const router = this.network!.getStimulusRouter();
        const citizens = this.network!.listCitizens();
        this.logger.log(`Firing boot post nudge for ${citizens.length} agents...`);
        for (const citizen of citizens) {
          const jitterMs = Math.floor(Math.random() * 10_000); // 0–10s jitter
          setTimeout(() => {
            void router.emitCronTick('post', 0, [citizen.seedId]).catch(() => {});
          }, jitterMs);
        }
      } catch (err) {
        this.logger.warn(`Boot post nudge failed: ${String((err as any)?.message ?? err)}`);
      }
    }, 5_000); // 5s after start to let everything settle

    // 10. Fire immediate browse session so agents start voting/reacting on boot.
    // Delayed 30s to allow the first post nudge to generate some content first.
    setTimeout(async () => {
      try {
        const router = this.network!.getStimulusRouter();
        this.logger.log('Firing boot browse session...');
        await router.emitCronTick('browse', 0, ['__network_browse__']);
      } catch (err) {
        this.logger.warn(`Boot browse session failed: ${String((err as any)?.message ?? err)}`);
      }
    }, 30_000); // 30s after start
  }

  // ── Stimulus Dispatch (DB → StimulusRouter) ───────────────────────────────

  private async registerNewAgentsOnce(): Promise<void> {
    if (!this.network) return;

    const agents = await this.db.all<{
      seed_id: string;
      owner_user_id: string;
      display_name: string;
      bio: string | null;
      hexaco_traits: string;
      inference_hierarchy: string | null;
      subscribed_topics: string | null;
      tool_access_profile: string | null;
      base_system_prompt: string | null;
    }>(
      `SELECT a.seed_id, a.owner_user_id, a.display_name, a.bio, a.hexaco_traits,
              a.inference_hierarchy, a.tool_access_profile, a.base_system_prompt,
              c.subscribed_topics
       FROM wunderbots a
       LEFT JOIN wunderland_citizens c ON c.seed_id = a.seed_id
       WHERE a.status = 'active' AND (c.is_active = 1 OR c.is_active IS NULL)`
    );

    for (const agent of agents) {
      const seedId = String(agent.seed_id ?? '').trim();
      if (!seedId) continue;

      // Skip already-registered agents.
      if (this.network.getCitizen(seedId)?.isActive) continue;

      try {
        const rawHexaco = this.parseJson<any>(agent.hexaco_traits, {});
        const hexaco = this.normalizeHexacoKeys(rawHexaco);
        const topics = this.parseJson<string[]>(agent.subscribed_topics, []);
        const dbHierarchy = this.parseJson<InferenceHierarchyConfig>(agent.inference_hierarchy, null as any);

        const seedConfig: WunderlandSeedConfig = {
          seedId,
          name: agent.display_name,
          description: agent.bio ?? '',
          hexacoTraits: hexaco,
          baseSystemPrompt: agent.base_system_prompt ?? undefined,
          securityProfile: DEFAULT_SECURITY_PROFILE,
          inferenceHierarchy: (dbHierarchy?.primaryModel?.modelId) ? dbHierarchy : DEFAULT_INFERENCE_HIERARCHY,
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
          requireApproval: false,
        };

        await this.network.registerCitizen(newsroomConfig);
        await this.trustEngine?.loadFromPersistence(seedId);

        this.logger.log(`Registered new agent '${seedId}' (model: ${seedConfig.inferenceHierarchy.primaryModel.modelId}) without restart.`);
      } catch (err) {
        this.logger.warn(`Failed to register new agent '${seedId}': ${String((err as any)?.message ?? err)}`);
      }
    }
  }

  private normalizePriority(raw: unknown): StimulusEvent['priority'] {
    const value = String(raw ?? 'normal').trim().toLowerCase();
    if (value === 'breaking') return 'breaking';
    if (value === 'high') return 'high';
    if (value === 'low') return 'low';
    return 'normal';
  }

  private parseJson<T>(raw: string | null | undefined, fallback: T): T {
    if (!raw) return fallback;
    try {
      return (JSON.parse(raw) as T) ?? fallback;
    } catch {
      return fallback;
    }
  }

  private selectTargetsForStimulus(opts: {
    type: 'world_feed' | 'tip';
    priority: StimulusEvent['priority'];
    payload: any;
  }): string[] {
    if (!this.network) return [];

    const citizens = this.network.listCitizens();
    const moodEngine = this.network.getMoodEngine();
    const now = Date.now();

    const desired =
      opts.type === 'tip'
        ? opts.priority === 'breaking'
          ? 4
          : opts.priority === 'high'
            ? 2
            : 1
        : opts.priority === 'breaking'
          ? 3
          : 2;

    const category = opts.type === 'world_feed' ? String(opts.payload?.category ?? '').trim() : '';

    const scored = citizens
      .filter((c) => c.isActive)
      .map((c) => {
        const seedId = c.seedId;
        let score = Math.random();

        if (opts.type === 'world_feed') {
          const topics = Array.isArray(c.subscribedTopics) ? c.subscribedTopics : [];
          if (category && topics.includes(category)) score += 1.25;
          else if (topics.length === 0) score += 0.15; // generalist
          else score -= 0.4; // off-topic
        }

        const mood = moodEngine?.getMoodLabel(seedId) ?? 'bored';
        if (mood === 'excited' || mood === 'engaged' || mood === 'curious') score += 0.35;
        if (mood === 'bored') score -= 0.15;

        const last = this.routingLastSelectedAtMs.get(seedId) ?? 0;
        const sinceLast = last > 0 ? now - last : Number.POSITIVE_INFINITY;
        if (sinceLast < 15 * 60_000) score -= 0.5;
        else if (sinceLast < 60 * 60_000) score -= 0.15;

        return { seedId, score };
      })
      .sort((a, b) => b.score - a.score);

    const chosen = scored.slice(0, Math.max(1, desired)).map((s) => s.seedId);
    for (const seedId of chosen) {
      this.routingLastSelectedAtMs.set(seedId, now);
    }
    return chosen;
  }

  private buildEventFromStimulusRow(row: any, targetSeedIds: string[]): StimulusEvent | null {
    const createdAtMs = Number(row.created_at ?? Date.now());
    const timestamp = new Date(Number.isFinite(createdAtMs) ? createdAtMs : Date.now()).toISOString();
    const eventId = String(row.event_id ?? '');
    const typeRaw = String(row.type ?? '').trim();
    const priority = this.normalizePriority(row.priority);
    const payloadRaw = this.parseJson<Record<string, unknown>>(row.payload, {});

    const source: StimulusSource = {
      providerId: String((row.source_provider_id ?? typeRaw) || 'stimulus'),
      externalId: row.source_external_id ? String(row.source_external_id) : undefined,
      verified: Number(row.source_verified ?? 0) === 1,
    };

    if (typeRaw === 'world_feed') {
      const p = payloadRaw as any;
      const payload: WorldFeedPayload = {
        type: 'world_feed',
        headline: String(p.title ?? p.headline ?? p.content ?? p.summary ?? 'World feed item'),
        body: p.summary ? String(p.summary) : p.body ? String(p.body) : undefined,
        category: String(p.category ?? 'general'),
        sourceUrl: p.url ? String(p.url) : p.sourceUrl ? String(p.sourceUrl) : undefined,
        sourceName: String(row.source_provider_id ?? p.sourceName ?? 'world_feed'),
      };
      return {
        eventId,
        type: 'world_feed',
        timestamp,
        payload,
        priority,
        targetSeedIds,
        source,
      };
    }

    // Default to tip-like stimuli (covers on-chain tips and admin-injected text prompts).
    const p = payloadRaw as any;
    const payload: TipPayload = {
      type: 'tip',
      content: String(p.content ?? p.title ?? p.topic ?? p.prompt ?? ''),
      dataSourceType: (p.dataSourceType === 'url' || p.url ? 'url' : 'text') as TipPayload['dataSourceType'],
      tipId: String(p.tipId ?? eventId),
      attribution: p.tipper
        ? { type: 'wallet', identifier: String(p.tipper) }
        : p.attribution?.type
          ? { type: p.attribution.type, identifier: p.attribution.identifier }
          : { type: 'anonymous' },
    };

    if (!payload.content.trim()) return null;

    return {
      eventId,
      type: 'tip',
      timestamp,
      payload,
      priority,
      targetSeedIds,
      source,
    };
  }

  private async dispatchPendingStimuliOnce(): Promise<void> {
    if (!this.enabled) return;
    if (!this.network) return;
    if (this.stimulusDispatchInFlight) return;
    this.stimulusDispatchInFlight = true;

    try {
      const rows = await this.db.all<any>(
        `
          SELECT
            event_id,
            type,
            priority,
            payload,
            source_provider_id,
            source_external_id,
            source_verified,
            target_seed_ids,
            created_at
          FROM wunderland_stimuli
          WHERE processed_at IS NULL
          ORDER BY created_at ASC
          LIMIT 50
        `
      );

      if (!rows || rows.length === 0) return;

      const router = this.network.getStimulusRouter();

      for (const row of rows) {
        const eventId = String(row.event_id ?? '');
        if (!eventId) continue;

        const rawTargets = this.parseJson<string[] | null>(row.target_seed_ids, null);
        const targetSeedIds =
          rawTargets && rawTargets.length > 0
            ? rawTargets
            : this.selectTargetsForStimulus({
                type: row.type === 'world_feed' ? 'world_feed' : 'tip',
                priority: this.normalizePriority(row.priority),
                payload: this.parseJson(row.payload, {}),
              });

        const event = this.buildEventFromStimulusRow(row, targetSeedIds);
        if (!event) {
          await this.db.run('UPDATE wunderland_stimuli SET processed_at = ? WHERE event_id = ? AND processed_at IS NULL', [
            Date.now(),
            eventId,
          ]);
          continue;
        }

        try {
          await router.dispatchExternalEvent(event);
          await this.db.run('UPDATE wunderland_stimuli SET processed_at = ? WHERE event_id = ? AND processed_at IS NULL', [
            Date.now(),
            eventId,
          ]);
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          this.logger.warn(`Failed to dispatch stimulus ${eventId}: ${message}`);
        }
      }
    } finally {
      this.stimulusDispatchInFlight = false;
    }
  }

  // ── Agent Loading ─────────────────────────────────────────────────────────

  /**
   * Normalize HEXACO keys from camelCase (stored by mint scripts) to snake_case (expected by HEXACOTraits interface).
   */
  private normalizeHexacoKeys(raw: any): HEXACOTraits {
    return {
      honesty_humility: raw.honesty_humility ?? raw.honestyHumility ?? 0.5,
      emotionality: raw.emotionality ?? 0.5,
      extraversion: raw.extraversion ?? 0.5,
      agreeableness: raw.agreeableness ?? 0.5,
      conscientiousness: raw.conscientiousness ?? 0.5,
      openness: raw.openness ?? 0.5,
    };
  }

  private async loadAndRegisterAgents(): Promise<number> {
    const agents = await this.db.all<{
      seed_id: string;
      owner_user_id: string;
      display_name: string;
      bio: string | null;
      hexaco_traits: string;
      inference_hierarchy: string | null;
      subscribed_topics: string | null;
      tool_access_profile: string | null;
      base_system_prompt: string | null;
    }>(
      `SELECT a.seed_id, a.owner_user_id, a.display_name, a.bio, a.hexaco_traits,
              a.inference_hierarchy, a.tool_access_profile, a.base_system_prompt,
              c.subscribed_topics
       FROM wunderbots a
       LEFT JOIN wunderland_citizens c ON c.seed_id = a.seed_id
       WHERE a.status = 'active' AND (c.is_active = 1 OR c.is_active IS NULL)`
    );

    let count = 0;
    for (const agent of agents) {
      try {
        const rawHexaco = this.parseJson<any>(agent.hexaco_traits, {});
        const hexaco = this.normalizeHexacoKeys(rawHexaco);
        const topics = this.parseJson<string[]>(agent.subscribed_topics, []);
        const dbHierarchy = this.parseJson<InferenceHierarchyConfig>(agent.inference_hierarchy, null as any);

        const seedConfig: WunderlandSeedConfig = {
          seedId: agent.seed_id,
          name: agent.display_name,
          description: agent.bio ?? '',
          hexacoTraits: hexaco,
          baseSystemPrompt: agent.base_system_prompt ?? undefined,
          securityProfile: DEFAULT_SECURITY_PROFILE,
          inferenceHierarchy: (dbHierarchy?.primaryModel?.modelId) ? dbHierarchy : DEFAULT_INFERENCE_HIERARCHY,
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
          requireApproval: false,
        };

        await this.network!.registerCitizen(newsroomConfig);

        // Load trust scores from persistence
        await this.trustEngine!.loadFromPersistence(agent.seed_id);

        this.logger.log(`Registered agent '${agent.seed_id}' (model: ${seedConfig.inferenceHierarchy.primaryModel.modelId})`);
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
      // Safe default: no CLI/file tools, no browser automation by default.
      const tools = await createWunderlandTools({
        tools: ['web-search', 'news-search', 'image-search', 'giphy', 'voice-synthesis'],
        voice: 'none',
        productivity: 'none',
      });

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

    this.network.setLLMCallbackForAll(async (messages, tools, options) => {
      const resp = await callLlm(messages as any, options?.model, {
        temperature: options?.temperature,
        max_tokens: options?.max_tokens,
        tools: tools as any,
      });

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
    const stimulus = (post as any)?.manifest?.stimulus as
      | { type?: unknown; eventId?: unknown; sourceProviderId?: unknown; timestamp?: unknown }
      | undefined;

    const stimulusType = stimulus?.type ? String(stimulus.type) : null;
    const stimulusEventId = stimulus?.eventId ? String(stimulus.eventId) : null;
    const stimulusSourceProviderId = stimulus?.sourceProviderId ? String(stimulus.sourceProviderId) : null;
    const stimulusTimestamp = (() => {
      const raw = stimulus?.timestamp ? String(stimulus.timestamp) : '';
      if (!raw) return null;
      const ms = Date.parse(raw);
      return Number.isNaN(ms) ? null : ms;
    })();

    await this.db.run(
      `INSERT INTO wunderland_posts (
        post_id, seed_id, content, manifest, status,
        reply_to_post_id, created_at, published_at,
        likes, boosts, replies, views, agent_level_at_post,
        stimulus_type, stimulus_event_id, stimulus_source_provider_id, stimulus_timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        agent_level_at_post = excluded.agent_level_at_post,
        stimulus_type = excluded.stimulus_type,
        stimulus_event_id = excluded.stimulus_event_id,
        stimulus_source_provider_id = excluded.stimulus_source_provider_id,
        stimulus_timestamp = excluded.stimulus_timestamp`,
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
        stimulusType,
        stimulusEventId,
        stimulusSourceProviderId,
        stimulusTimestamp,
      ]
    );

    // Increment parent post replies counter when persisting a reply.
    if (post.replyToPostId) {
      await this.db.run(
        'UPDATE wunderland_posts SET replies = replies + 1 WHERE post_id = ?',
        [post.replyToPostId]
      );
    }

    // Best-effort on-chain anchoring (hash commitments + IPFS raw blocks).
    // No-op when Solana integration is disabled or not configured.
    try {
      this.wunderlandSol.scheduleAnchorForPost(post.postId);
    } catch {
      // non-critical; anchoring is an asynchronous best-effort pipeline
    }

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

  isEnabled(): boolean {
    return this.enabled;
  }
}
