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
import { createHash } from 'node:crypto';
import { DatabaseService } from '../../../database/database.service';
import { callLlm, callLlmWithProviderConfig } from '../../../core/llm/llm.factory';
import { LlmConfigService, LlmProviderId } from '../../../core/llm/llm.config.service.js';
import type { ILlmProviderConfig } from '../../../core/llm/llm.interfaces.js';
import { ragService } from '../../../integrations/rag/rag.service.js';
import { WunderlandVectorMemoryService } from './wunderland-vector-memory.service';
import { WunderlandSolService } from '../wunderland-sol/wunderland-sol.service.js';
import { CredentialsService } from '../credentials/credentials.service.js';
import {
  DEFAULT_SECURITY_PROFILE,
  DEFAULT_INFERENCE_HIERARCHY,
  DEFAULT_STEP_UP_AUTH_CONFIG,
  createWunderlandTools,
  createMemoryReadTool,
  createFeedSearchTool,
} from 'wunderland';
import type {
  WunderlandSeedConfig,
  HEXACOTraits,
  InferenceHierarchyConfig,
} from 'wunderland';
import {
  WonderlandNetwork,
  TrustEngine,
  DirectMessageRouter,
  SafetyEngine,
  AllianceEngine,
  GovernanceExecutor,
  LLMSentimentAnalyzer,
  createCreateEnclaveHandler,
  createBanAgentHandler,
} from '@wunderland/social';
import type {
  WonderlandPost,
  NewsroomConfig,
  SocialDynamicsConfig,
  StimulusEvent,
  StimulusSource,
  TipPayload,
  WorldFeedPayload,
  ExtendedBrowsingSessionRecord,
} from '@wunderland/social';

// Import all 7 persistence adapters
import { MoodPersistenceService } from './mood-persistence.service';
import { EnclavePersistenceService } from './enclave-persistence.service';
import { BrowsingPersistenceService } from './browsing-persistence.service';
import { TrustPersistenceService } from './trust-persistence.service';
import { DMPersistenceService } from './dm-persistence.service';
import { SafetyPersistenceService } from './safety-persistence.service';
import { AlliancePersistenceService } from './alliance-persistence.service';
import { PromptEvolutionPersistenceService } from './prompt-evolution-persistence.service';
import { ActivityFeedService } from '../activity-feed/activity-feed.service.js';

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
  private readonly routingLastSelectedByCategoryAtMs: Map<string, number> = new Map();
  private readonly routingLastSelectedBySourceAtMs: Map<string, number> = new Map();

  constructor(
    private readonly db: DatabaseService,
    private readonly credentials: CredentialsService,
    private readonly moodPersistence: MoodPersistenceService,
    private readonly enclavePersistence: EnclavePersistenceService,
    private readonly browsingPersistence: BrowsingPersistenceService,
    private readonly trustPersistence: TrustPersistenceService,
    private readonly dmPersistence: DMPersistenceService,
    private readonly safetyPersistence: SafetyPersistenceService,
    private readonly alliancePersistence: AlliancePersistenceService,
    private readonly promptEvolutionPersistence: PromptEvolutionPersistenceService,
    private readonly vectorMemory: WunderlandVectorMemoryService,
    private readonly wunderlandSol: WunderlandSolService,
    private readonly activityFeed: ActivityFeedService,
  ) {
    this.enabled =
      process.env.ENABLE_SOCIAL_ORCHESTRATION === 'true' ||
      process.env.WUNDERLAND_AUTONOMOUS === 'true';
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
    const networkId = 'wunderland-main';
    const socialDynamics = await this.loadSocialDynamicsConfig(networkId);
    this.network = new WonderlandNetwork({
      networkId,
      worldFeedSources: [],
      globalRateLimits: { maxPostsPerHourPerAgent: 10, maxTipsPerHourPerUser: 20 },
      defaultApprovalTimeoutMs: 300_000,
      quarantineNewCitizens: false,
      quarantineDurationMs: 0,
      socialDynamics,
    });

    const enableBehaviorTelemetryLogs = /^(1|true|yes)$/i.test(
      String(process.env.WUNDERLAND_LOG_BEHAVIOR_TELEMETRY ?? '').trim(),
    );
    if (enableBehaviorTelemetryLogs) {
      this.network.onTelemetryUpdate((event) => {
        if (event.type === 'voice_profile') {
          if (event.switchedArchetype) {
            this.logger.log(
              `[voice-switch] seed=${event.seedId} ${event.previousArchetype ?? 'none'} -> ${event.archetype} (${event.stimulusType}/${event.stimulusPriority})`,
            );
          }
          return;
        }
        if (event.type === 'mood_drift') {
          if (event.drift >= 0.08) {
            this.logger.debug(
              `[mood-drift] seed=${event.seedId} drift=${event.drift.toFixed(3)} source=${event.source} trigger=${event.trigger}`,
            );
          }
          return;
        }
        if (event.type === 'engagement_impact') {
          this.logger.debug(
            `[engagement-impact] seed=${event.seedId} action=${event.action} dv=${event.delta.valence.toFixed(3)} da=${event.delta.arousal.toFixed(3)} dd=${event.delta.dominance.toFixed(3)}`,
          );
        }
      });
      this.logger.log('Behavior telemetry logging enabled (WUNDERLAND_LOG_BEHAVIOR_TELEMETRY=true).');
    }

    // 2. Wire persistence adapters (before initializeEnclaveSystem)
    this.network.setMoodPersistenceAdapter(this.moodPersistence);
    this.network.setEnclavePersistenceAdapter(this.enclavePersistence);
    this.network.setBrowsingPersistenceAdapter(this.browsingPersistence);
    this.network.setActivityPersistenceAdapter(this.activityFeed);

    // 3. Initialize enclave system (loads persisted enclaves, creates defaults)
    await this.network.initializeEnclaveSystem();

    // 3.1 Wire prompt evolution persistence (after initializeEnclaveSystem creates the engine)
    const promptEvolution = this.network.getPromptEvolution();
    if (promptEvolution) {
      promptEvolution.setPersistenceAdapter(this.promptEvolutionPersistence);
    }

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

	    // 5c. Set engagement store callback — writes votes/boosts/views to DB
	    this.network.setEngagementStoreCallback(async ({ postId, actorSeedId, actionType }) => {
	      try {
          const now = Date.now();

          if (actionType === 'like' || actionType === 'downvote') {
            const desired = actionType === 'like' ? 1 : -1;

            const voteResult = await this.db.transaction(async (trx) => {
              const existing = await trx.get<{ direction: number }>(
                `
                  SELECT direction
                    FROM wunderland_content_votes
                   WHERE entity_type = ?
                     AND entity_id = ?
                     AND voter_seed_id = ?
                   LIMIT 1
                `,
                ['post', postId, actorSeedId],
              );

              const prevDirection = typeof existing?.direction === 'number' ? existing.direction : 0;
              if (prevDirection === desired) {
                return { applied: false, actionId: null as string | null };
              }

              await trx.run(
                `
                  INSERT INTO wunderland_content_votes (
                    entity_type, entity_id, voter_seed_id, direction, created_at
                  ) VALUES (?, ?, ?, ?, datetime('now'))
                  ON CONFLICT(entity_type, entity_id, voter_seed_id)
                  DO UPDATE SET direction = excluded.direction, created_at = datetime('now')
                `,
                ['post', postId, actorSeedId, desired],
              );

              if (prevDirection === 0) {
                await trx.run(
                  actionType === 'like'
                    ? 'UPDATE wunderland_posts SET likes = likes + 1 WHERE post_id = ?'
                    : 'UPDATE wunderland_posts SET downvotes = downvotes + 1 WHERE post_id = ?',
                  [postId],
                );
              } else if (prevDirection === -desired) {
                await trx.run(
                  actionType === 'like'
                    ? `UPDATE wunderland_posts
                          SET likes = likes + 1,
                              downvotes = CASE WHEN downvotes > 0 THEN downvotes - 1 ELSE 0 END
                        WHERE post_id = ?`
                    : `UPDATE wunderland_posts
                          SET downvotes = downvotes + 1,
                              likes = CASE WHEN likes > 0 THEN likes - 1 ELSE 0 END
                        WHERE post_id = ?`,
                  [postId],
                );
              }

              const actionId = `eng-${now}-${Math.random().toString(36).slice(2, 8)}`;
              await trx.run(
                `INSERT INTO wunderland_engagement_actions (
                  action_id, post_id, actor_seed_id, type, payload, timestamp
                ) VALUES (?, ?, ?, ?, NULL, ?)`,
                [actionId, postId, actorSeedId, actionType, now],
              );

              return { applied: true, actionId };
            });

            if (!voteResult.applied) return;
          } else {
            const actionId = `eng-${now}-${Math.random().toString(36).slice(2, 8)}`;
            await this.db.run(
              `INSERT INTO wunderland_engagement_actions (
                action_id, post_id, actor_seed_id, type, payload, timestamp
              ) VALUES (?, ?, ?, ?, NULL, ?)`,
              [actionId, postId, actorSeedId, actionType, now],
            );

            if (actionType === 'boost') {
              await this.db.run('UPDATE wunderland_posts SET boosts = boosts + 1 WHERE post_id = ?', [postId]);
            } else if (actionType === 'view') {
              await this.db.run('UPDATE wunderland_posts SET views = views + 1 WHERE post_id = ?', [postId]);
            }
          }

        // Update TrustEngine from engagement (so routing + DM gating reflects real interactions).
        // Note: TrustEngine records directional trust (actor -> author).
        if (this.trustEngine && this.network && (actionType === 'like' || actionType === 'downvote' || actionType === 'boost')) {
          const post = this.network.getPost(postId);
          const authorSeedId = post?.seedId;
          if (authorSeedId && authorSeedId !== actorSeedId) {
            const actorTraits = this.network.getCitizen(actorSeedId)?.personality;
            const interaction =
              actionType === 'like' ? 'upvote'
              : actionType === 'downvote' ? 'downvote'
              : 'boost';
            this.trustEngine.recordInteraction(actorSeedId, authorSeedId, interaction, actorTraits);
          }
        }

        // Best-effort on-chain vote bridging (optional; gated by WUNDERLAND_SOL_VOTING_ENABLED).
        // Maps: like => +1, downvote => -1. (Views/boosts remain off-chain.)
	        if (actionType === 'like' || actionType === 'downvote') {
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

	        // Off-chain amplify routing (bots-only): when an agent boosts a post,
	        // re-surface it to a small set of other agents at higher priority.
	        if (actionType === 'boost') {
	          void this.dispatchAmplifyVisibility({ postId, boosterSeedId: actorSeedId }).catch(() => {});
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
        likes: number; downvotes: number; boosts: number; replies: number; views: number;
        agent_level_at_post: number;
      }>(
        `SELECT post_id, seed_id, content, manifest, status, reply_to_post_id,
                created_at, published_at, likes, downvotes, boosts, replies, views, agent_level_at_post
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
        engagement: { likes: row.likes ?? 0, downvotes: row.downvotes ?? 0, boosts: row.boosts ?? 0, replies: row.replies ?? 0, views: row.views ?? 0 },
        agentLevelAtPost: row.agent_level_at_post ?? 0,
      }));
      this.network.preloadPosts(posts as any);
      this.logger.log(`Preloaded ${posts.length} existing posts for browsing engagement.`);
    } catch (err) {
      this.logger.warn(`Failed to preload posts: ${String((err as any)?.message ?? err)}`);
    }

    // 7. Schedule cron ticks
    // Browse cron: random interval 2-12 minutes (agents browse enclaves, upvote/downvote, react)
    const scheduleNextBrowse = () => {
      const delayMs = (2 + Math.random() * 10) * 60_000; // 2-12 min
      const timeout = setTimeout(async () => {
        try {
          const router = this.network!.getStimulusRouter();
          const count = this.incrementTickCount('browse');
          await router.emitCronTick('browse', count, ['__network_browse__']);
        } catch (err) {
          this.logger.error(`Cron 'browse' failed:`, err);
        }
        scheduleNextBrowse(); // reschedule with new random interval
      }, delayMs);
      this.cronIntervals.set('browse', timeout as unknown as ReturnType<typeof setInterval>);
    };
    scheduleNextBrowse();

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

	  private async selectTargetsForStimulus(opts: {
	    type: 'world_feed' | 'tip';
	    priority: StimulusEvent['priority'];
	    payload: any;
      sourceProviderId?: string;
	  }): Promise<string[]> {
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

    const category = opts.type === 'world_feed' ? String(opts.payload?.category ?? '').trim().toLowerCase() : '';
    const sourceProviderId = String(opts.sourceProviderId ?? '').trim();

    // RAG-based routing: find agents whose prior posts are most similar to this stimulus.
    const stimulusText = (() => {
      if (opts.type === 'tip') {
        return String(
          opts.payload?.content ??
          opts.payload?.title ??
          opts.payload?.topic ??
          opts.payload?.prompt ??
          ''
        ).trim();
      }
      const headline = String(
        opts.payload?.title ??
        opts.payload?.headline ??
        opts.payload?.content ??
        opts.payload?.summary ??
        ''
      ).trim();
      const body = String(opts.payload?.summary ?? opts.payload?.body ?? '').trim();
      const cat = category ? `Category: ${category}` : '';
      return [headline, body, cat].filter(Boolean).join('\n');
    })();

    const ragBySeed = new Map<string, number>();
    if (stimulusText) {
      try {
        const affinities = await this.vectorMemory.querySeedAffinities({
          query: stimulusText,
          topK: 80,
          maxSeeds: 25,
        });
        for (const a of affinities) {
          if (a?.seedId) ragBySeed.set(String(a.seedId), Number(a.score ?? 0));
        }
      } catch {
        // Best-effort: routing still works without vector memory.
      }
    }

    const scored = citizens
      .filter((c) => c.isActive)
      .map((c) => {
        const seedId = c.seedId;
        let score = Math.random();

        if (opts.type === 'world_feed') {
          const topics = Array.isArray(c.subscribedTopics) ? c.subscribedTopics : [];
          const topicMatch = category
            ? topics.some((t) => String(t ?? '').trim().toLowerCase() === category)
            : false;
          if (topicMatch) score += 1.25;
          else if (topics.length === 0) score += 0.15; // generalist
          else score -= 0.4; // off-topic
        }

        const mood = moodEngine?.getMoodLabel(seedId) ?? 'bored';
        if (mood === 'excited' || mood === 'engaged' || mood === 'curious') score += 0.35;
        if (mood === 'bored') score -= 0.15;

        // RAG affinity boost (0..~1): prefer agents with nearby memory.
        const rag = ragBySeed.get(seedId);
        if (typeof rag === 'number' && Number.isFinite(rag) && rag > 0) {
          score += Math.max(0, Math.min(1, rag)) * 0.8;
        }

        // Diversity penalties: avoid hammering the same agent with the same category/source.
        if (opts.type === 'world_feed') {
          if (category) {
            const key = `${seedId}::cat::${category}`;
            const lastCat = this.routingLastSelectedByCategoryAtMs.get(key) ?? 0;
            const sinceCat = lastCat > 0 ? now - lastCat : Number.POSITIVE_INFINITY;
            if (sinceCat < 20 * 60_000) score -= 0.35;
            else if (sinceCat < 60 * 60_000) score -= 0.15;
          }
          if (sourceProviderId) {
            const key = `${seedId}::src::${sourceProviderId}`;
            const lastSrc = this.routingLastSelectedBySourceAtMs.get(key) ?? 0;
            const sinceSrc = lastSrc > 0 ? now - lastSrc : Number.POSITIVE_INFINITY;
            if (sinceSrc < 30 * 60_000) score -= 0.25;
            else if (sinceSrc < 90 * 60 * 1000) score -= 0.10;
          }
        }

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
      if (opts.type === 'world_feed') {
        if (category) {
          this.routingLastSelectedByCategoryAtMs.set(`${seedId}::cat::${category}`, now);
        }
        if (sourceProviderId) {
          this.routingLastSelectedBySourceAtMs.set(`${seedId}::src::${sourceProviderId}`, now);
        }
      }
    }
	    return chosen;
	  }

	  private async dispatchAmplifyVisibility(opts: { postId: string; boosterSeedId: string }): Promise<void> {
	    if (!this.network) return;

	    const postId = String(opts.postId ?? '').trim();
	    const boosterSeedId = String(opts.boosterSeedId ?? '').trim();
	    if (!postId || !boosterSeedId) return;

	    const row = await this.db.get<{ post_id: string; seed_id: string; content: string }>(
	      'SELECT post_id, seed_id, content FROM wunderland_posts WHERE post_id = ? LIMIT 1',
	      [postId],
	    );
	    if (!row?.post_id || !row.seed_id) return;

	    const authorSeedId = String(row.seed_id).trim();
	    const content = typeof row.content === 'string' ? row.content : '';
	    if (!content.trim()) return;

	    // Candidate recipients: active + allowed to act, excluding the author + booster.
	    const safety = this.network.getSafetyEngine();
	    const activeCandidates = this.network
	      .listCitizens()
	      .filter((c) => c.isActive)
	      .map((c) => c.seedId)
	      .filter((seedId) => seedId !== authorSeedId && seedId !== boosterSeedId)
	      .filter((seedId) => safety.canAct(seedId).allowed);

	    if (activeCandidates.length === 0) return;

	    const now = Date.now();
	    const recentlySelectedPenaltyCutoffMs = 15 * 60_000;
	    const recentlySelected = (seedId: string): boolean => {
	      const last = this.routingLastSelectedAtMs.get(seedId) ?? 0;
	      return last > 0 && now - last < recentlySelectedPenaltyCutoffMs;
	    };

	    // Prefer RAG-relevant agents when vector memory is available; otherwise random sample.
	    let ranked: string[] = [];
	    try {
	      const affinities = await this.vectorMemory.querySeedAffinities({
	        query: content.slice(0, 1200),
	        topK: 120,
	        maxSeeds: 30,
	      });
	      ranked = affinities
	        .map((a) => String(a.seedId))
	        .filter((seedId) => activeCandidates.includes(seedId));
	    } catch {
	      ranked = [];
	    }

	    const pool = ranked.length > 0 ? ranked : [...activeCandidates].sort(() => Math.random() - 0.5);
	    const targets: string[] = [];

	    for (const seedId of pool) {
	      if (targets.length >= 3) break;
	      if (recentlySelected(seedId)) continue;
	      targets.push(seedId);
	    }

	    // If everything was recently selected, fall back to the top of the pool.
	    if (targets.length === 0) {
	      for (const seedId of pool) {
	        if (targets.length >= 2) break;
	        targets.push(seedId);
	      }
	    }

	    if (targets.length === 0) return;
	    for (const seedId of targets) {
	      this.routingLastSelectedAtMs.set(seedId, now);
	    }

	    // High priority increases the chance that the observer decides to respond,
	    // but agents can still stay silent (urge gating applies).
	    await this.network.getStimulusRouter().emitPostPublished(
	      { postId, seedId: authorSeedId, content: content.slice(0, 600) },
	      targets,
	      'high',
	    );
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
            dedupe_hash,
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

      const { syntheticRows, consumedEventIds } = await this.synthesizeWorldFeedStimuli(rows);
      const dispatchRows = [...rows, ...syntheticRows].filter((row) => {
        const eventId = String(row?.event_id ?? '');
        return eventId ? !consumedEventIds.has(eventId) : false;
      });

      if (dispatchRows.length === 0) return;

      const router = this.network.getStimulusRouter();

      for (const row of dispatchRows) {
        const eventId = String(row.event_id ?? '');
        if (!eventId) continue;

        const rawTargets = this.parseJson<string[] | null>(row.target_seed_ids, null);
        const targetSeedIds =
          rawTargets && rawTargets.length > 0
            ? rawTargets
            : await this.selectTargetsForStimulus({
                type: row.type === 'world_feed' ? 'world_feed' : 'tip',
                priority: this.normalizePriority(row.priority),
                payload: this.parseJson(row.payload, {}),
                sourceProviderId: row.source_provider_id ? String(row.source_provider_id) : undefined,
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

  // ── World Feed Synthesis (cluster/digest) ─────────────────────────────────

  /**
   * Combine low-signal per-item world feed stimuli into multi-source bundles.
   *
   * This prevents agents from reacting "one-by-one" and encourages synthesis:
   * - story clusters (same event across multiple sources)
   * - category digests (multiple unrelated items in one category)
   *
   * Returns synthetic stimulus rows to dispatch immediately, and a set of raw
   * stimulus eventIds that were consumed (and marked processed).
   */
  private async synthesizeWorldFeedStimuli(rows: any[]): Promise<{
    syntheticRows: any[];
    consumedEventIds: Set<string>;
  }> {
    const consumedEventIds = new Set<string>();
    const syntheticRows: any[] = [];

    const candidates = rows.filter((row) => {
      const type = String(row?.type ?? '').trim();
      if (type !== 'world_feed') return false;

      const sourceProviderId = String(row?.source_provider_id ?? '').trim().toLowerCase();
      // Never re-synthesize synthetic stimuli; just dispatch them.
      if (sourceProviderId === 'world_feed_cluster' || sourceProviderId === 'world_feed_digest') return false;

      return true;
    });

    if (candidates.length < 2) return { syntheticRows, consumedEventIds };

    const STOPWORDS = new Set<string>([
      'the', 'a', 'an', 'and', 'or', 'but', 'if', 'then', 'else',
      'of', 'to', 'in', 'on', 'for', 'with', 'from', 'by', 'as', 'at', 'into', 'over', 'under',
      'is', 'are', 'was', 'were', 'be', 'been', 'being',
      'this', 'that', 'these', 'those', 'it', 'its', 'their', 'his', 'her', 'they', 'them', 'we', 'you', 'i',
      'after', 'before', 'during', 'amid', 'amidst', 'while', 'when', 'who', 'whom', 'what', 'where', 'why', 'how',
      'news', 'report', 'reports', 'says', 'say', 'said', 'update', 'live',
    ]);

    const tokenize = (text: string): string[] => {
      const raw = String(text ?? '').toLowerCase();
      const cleaned = raw
        .replace(/https?:\/\/\S+/g, ' ')
        .replace(/[^a-z0-9]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (!cleaned) return [];
      return cleaned
        .split(' ')
        .map((t) => t.trim())
        .filter((t) => t.length >= 3 && !STOPWORDS.has(t))
        .slice(0, 18);
    };

    const toTokenSet = (tokens: string[]): Set<string> => new Set(tokens);

    const jaccard = (a: Set<string>, b: Set<string>): { score: number; intersection: number } => {
      if (a.size === 0 || b.size === 0) return { score: 0, intersection: 0 };
      let intersection = 0;
      for (const t of a) if (b.has(t)) intersection += 1;
      const union = a.size + b.size - intersection;
      return { score: union > 0 ? intersection / union : 0, intersection };
    };

    type Parsed = {
      row: any;
      eventId: string;
      title: string;
      summary: string;
      url: string | null;
      category: string;
      sourceName: string;
      dedupeHash: string;
      tokens: Set<string>;
    };

    const parsed: Parsed[] = candidates
      .map((row) => {
        const eventId = String(row?.event_id ?? '').trim();
        if (!eventId) return null;

        const payload = this.parseJson<Record<string, unknown>>(row?.payload, {});
        const title = String((payload as any)?.title ?? (payload as any)?.headline ?? '').trim();
        if (!title) return null;

        const summary = String((payload as any)?.summary ?? (payload as any)?.body ?? '').trim();
        const urlRaw = String((payload as any)?.url ?? (payload as any)?.sourceUrl ?? '').trim();
        const url = urlRaw ? urlRaw : null;
        const category = String((payload as any)?.category ?? 'general').trim() || 'general';

        const sourceName = String(row?.source_provider_id ?? (payload as any)?.sourceName ?? 'world_feed').trim() || 'world_feed';
        const dedupeHash = String(row?.dedupe_hash ?? '').trim() || createHash('sha256').update(title + '|' + (url ?? '')).digest('hex');

        const tokens = toTokenSet(tokenize(title));

        const item: Parsed = {
          row,
          eventId,
          title: title.slice(0, 220),
          summary: summary.slice(0, 1200),
          url,
          category: category.slice(0, 80),
          sourceName: sourceName.slice(0, 80),
          dedupeHash,
          tokens,
        };
        return item;
      })
      .filter((v): v is Parsed => Boolean(v));

    if (parsed.length < 2) return { syntheticRows, consumedEventIds };

    type Cluster = { items: Parsed[]; repTokens: Set<string> };
    const clusters: Cluster[] = [];

    for (const item of parsed) {
      let bestIdx = -1;
      let bestScore = 0;
      let bestIntersection = 0;

      for (let i = 0; i < clusters.length; i += 1) {
        const c = clusters[i]!;
        const sim = jaccard(item.tokens, c.repTokens);
        if (sim.score > bestScore) {
          bestScore = sim.score;
          bestIntersection = sim.intersection;
          bestIdx = i;
        }
      }

      // Heuristic: require both a decent Jaccard and a minimum shared token count.
      if (bestIdx >= 0 && bestScore >= 0.44 && bestIntersection >= 3) {
        clusters[bestIdx]!.items.push(item);
      } else {
        clusters.push({ items: [item], repTokens: item.tokens });
      }
    }

    const storyClusters = clusters
      .filter((c) => c.items.length >= 2)
      .sort((a, b) => b.items.length - a.items.length)
      .slice(0, 4);

    const consumedByStory = new Set<string>();
    for (const c of storyClusters) for (const item of c.items) consumedByStory.add(item.eventId);

    const leftovers = parsed.filter((p) => !consumedByStory.has(p.eventId));

    // Category digests reduce remaining per-item noise.
    const byCategory = new Map<string, Parsed[]>();
    for (const item of leftovers) {
      const cat = String(item.category ?? 'general').trim().toLowerCase() || 'general';
      const list = byCategory.get(cat) ?? [];
      list.push(item);
      byCategory.set(cat, list);
    }

    const digestGroups = [...byCategory.entries()]
      .map(([category, items]) => ({ category, items }))
      .filter((g) => g.items.length >= 4)
      .sort((a, b) => b.items.length - a.items.length)
      .slice(0, 2);

    const now = Date.now();
    const lookbackMs = 48 * 60 * 60 * 1000;

    try {
      await this.db.transaction(async (trx) => {
        const insertSynthetic = async (opts: {
          sourceProviderId: 'world_feed_cluster' | 'world_feed_digest';
          priority: 'high' | 'normal' | 'low';
          title: string;
          body: string;
          category: string;
          url: string | null;
          sources: Parsed[];
        }): Promise<void> => {
          const sourceEventIds = opts.sources.map((s) => s.eventId).sort();
          const dedupeKey = sourceEventIds
            .map((id) => {
              const source = opts.sources.find((s) => s.eventId === id);
              return source?.dedupeHash ?? id;
            })
            .join('|');
          const dedupeHash = createHash('sha256').update(`${opts.sourceProviderId}|${dedupeKey}`, 'utf8').digest('hex');

          const existing = await trx.get<{ event_id: string }>(
            `
              SELECT event_id
                FROM wunderland_stimuli
               WHERE type = 'world_feed'
                 AND source_provider_id = ?
                 AND dedupe_hash = ?
                 AND created_at >= ?
               LIMIT 1
            `,
            [opts.sourceProviderId, dedupeHash, now - lookbackMs],
          );

          // Mark source rows processed regardless; otherwise they will spam agents.
          for (const item of opts.sources) {
            consumedEventIds.add(item.eventId);
            await trx.run(
              'UPDATE wunderland_stimuli SET processed_at = ? WHERE event_id = ? AND processed_at IS NULL',
              [now, item.eventId],
            );
          }

          if (existing?.event_id) return;

          const eventId = this.db.generateId();
          const payload = {
            kind: opts.sourceProviderId === 'world_feed_cluster' ? 'cluster' : 'digest',
            title: opts.title,
            summary: opts.body,
            url: opts.url,
            category: opts.category,
            sourceEventIds,
            sources: opts.sources.slice(0, 10).map((s) => ({
              title: s.title,
              url: s.url,
              sourceName: s.sourceName,
              category: s.category,
              eventId: s.eventId,
            })),
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
              opts.priority,
              JSON.stringify(payload),
              opts.sourceProviderId,
              `synthetic:${dedupeHash}`,
              dedupeHash,
              0,
              now,
            ],
          );

          syntheticRows.push({
            event_id: eventId,
            type: 'world_feed',
            priority: opts.priority,
            payload: JSON.stringify(payload),
            source_provider_id: opts.sourceProviderId,
            source_external_id: `synthetic:${dedupeHash}`,
            dedupe_hash: dedupeHash,
            source_verified: 0,
            target_seed_ids: null,
            created_at: now,
          });
        };

        for (const cluster of storyClusters) {
          const sources = cluster.items.slice(0, 6);
          const title = (() => {
            const candidates = [...sources].sort((a, b) => a.title.length - b.title.length);
            return (candidates[Math.floor(candidates.length / 2)]?.title ?? sources[0]!.title).slice(0, 220);
          })();

          const category = (() => {
            const counts = new Map<string, number>();
            for (const s of sources) {
              const key = String(s.category ?? 'general').trim().toLowerCase() || 'general';
              counts.set(key, (counts.get(key) ?? 0) + 1);
            }
            const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
            return (sorted[0]?.[0] ?? 'general').slice(0, 80);
          })();

          const body = (() => {
            const lines: string[] = [];
            lines.push(`Multi-source signal (${sources.length} sources). Synthesize the common thread and any disagreements.`);
            lines.push(`Sources:`);
            for (const s of sources) {
              const url = s.url ? ` ${s.url}` : '';
              lines.push(`- [${s.sourceName}] ${s.title}${url}`);
            }
            lines.push(`Suggested: use memory_read + feed_search, then optionally fact_check/research_aggregate for extra context. For a related clip: web_search "site:youtube.com ${title.slice(0, 70)}".`);
            return lines.join('\n').slice(0, 3800);
          })();

          await insertSynthetic({
            sourceProviderId: 'world_feed_cluster',
            priority: sources.length >= 4 ? 'high' : 'normal',
            title,
            body,
            category,
            url: sources[0]?.url ?? null,
            sources: cluster.items,
          });
        }

        for (const digest of digestGroups) {
          const sources = digest.items.slice(0, 6);
          const title = `World digest: ${digest.category} (${sources.length} items)`.slice(0, 220);
          const body = (() => {
            const lines: string[] = [];
            lines.push(`Digest prompt: pick 1–2 items and connect them to ongoing discourse (don’t spam).`);
            lines.push(`Items:`);
            for (const s of sources) {
              const url = s.url ? ` ${s.url}` : '';
              lines.push(`- [${s.sourceName}] ${s.title}${url}`);
            }
            lines.push(`Suggested: memory_read + feed_search, then optionally add a GIF/image and one YouTube link.`);
            return lines.join('\n').slice(0, 3800);
          })();

          await insertSynthetic({
            sourceProviderId: 'world_feed_digest',
            priority: 'normal',
            title,
            body,
            category: digest.category.slice(0, 80),
            url: null,
            sources: digest.items,
          });
        }
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.debug(`World feed synthesis skipped: ${message}`);
      return { syntheticRows: [], consumedEventIds: new Set() };
    }

    return { syntheticRows, consumedEventIds };
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

  private safeJsonParse<T>(value: string | null): T | null {
    if (!value) return null;
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }

  private buildRuntimeProviderConfig(providerId: LlmProviderId, apiKey?: string): ILlmProviderConfig {
    if (providerId === LlmProviderId.OPENAI) {
      return {
        providerId,
        apiKey,
        baseUrl: process.env.OPENAI_API_BASE_URL || 'https://api.openai.com/v1',
        defaultModel: process.env.MODEL_PREF_OPENAI_DEFAULT || 'gpt-4o-mini',
      };
    }
    if (providerId === LlmProviderId.OPENROUTER) {
      return {
        providerId,
        apiKey,
        baseUrl: process.env.OPENROUTER_API_BASE_URL || 'https://openrouter.ai/api/v1',
        defaultModel: process.env.MODEL_PREF_OPENROUTER_DEFAULT || 'openai/gpt-4o-mini',
        additionalHeaders: {
          'HTTP-Referer': process.env.APP_URL || `http://localhost:${process.env.PORT || 3001}`,
          'X-Title': process.env.APP_NAME || 'Wunderland',
        },
      };
    }
    if (providerId === LlmProviderId.ANTHROPIC) {
      return {
        providerId,
        apiKey,
        baseUrl: process.env.ANTHROPIC_API_BASE_URL || 'https://api.anthropic.com/v1',
        defaultModel: process.env.MODEL_PREF_ANTHROPIC_DEFAULT || 'claude-3-haiku-20240307',
        additionalHeaders: { 'anthropic-version': '2023-06-01' },
      };
    }
    if (providerId === LlmProviderId.OLLAMA) {
      return {
        providerId,
        apiKey: undefined,
        baseUrl: process.env.OLLAMA_BASE_URL,
        defaultModel: process.env.MODEL_PREF_OLLAMA_DEFAULT || 'llama3:latest',
      };
    }
    return { providerId, apiKey };
  }

  private normalizeOpenRouterModel(model: string): string {
    const trimmed = model.trim();
    if (!trimmed) return trimmed;
    if (trimmed.toLowerCase() === 'auto') return 'openrouter/auto';
    return trimmed;
  }

  private async resolveAgentLlmFromCredentials(ownerUserId: string, seedId: string): Promise<{
    modelOverride?: string;
    runtimeProviderConfig?: ILlmProviderConfig;
  }> {
    const out: { modelOverride?: string; runtimeProviderConfig?: ILlmProviderConfig } = {};
    try {
      const vals = await this.credentials.getDecryptedValuesByType(ownerUserId, seedId, [
        'LLM_MODEL',
        'LLM_API_KEY_OPENAI',
        'LLM_API_KEY_OPENROUTER',
        'LLM_API_KEY_ANTHROPIC',
      ]);

      const openAiKey = vals.LLM_API_KEY_OPENAI?.trim() || null;
      const openRouterKey = vals.LLM_API_KEY_OPENROUTER?.trim() || null;
      const anthropicKey = vals.LLM_API_KEY_ANTHROPIC?.trim() || null;

      const modelPrefRaw = vals.LLM_MODEL;
      const parsed = this.safeJsonParse<any>(modelPrefRaw);
      const prefProvider =
        typeof parsed?.provider === 'string' ? parsed.provider.trim().toLowerCase() : '';
      const prefModel = typeof parsed?.model === 'string' ? parsed.model.trim() : '';

      const desiredProvider =
        prefProvider === 'openai'
          ? LlmProviderId.OPENAI
          : prefProvider === 'openrouter'
            ? LlmProviderId.OPENROUTER
            : prefProvider === 'anthropic'
              ? LlmProviderId.ANTHROPIC
              : prefProvider === 'ollama'
                ? LlmProviderId.OLLAMA
                : null;

      // Model override (applies even if we end up using env keys).
      if (desiredProvider && prefModel) {
        out.modelOverride =
          desiredProvider === LlmProviderId.OPENROUTER ? this.normalizeOpenRouterModel(prefModel) : prefModel;
      }

      // Runtime key routing (agent-specific API keys)
      if (desiredProvider === LlmProviderId.OPENROUTER && openRouterKey) {
        out.runtimeProviderConfig = this.buildRuntimeProviderConfig(LlmProviderId.OPENROUTER, openRouterKey);
        return out;
      }

      if (desiredProvider === LlmProviderId.OPENAI && openAiKey) {
        out.runtimeProviderConfig = this.buildRuntimeProviderConfig(LlmProviderId.OPENAI, openAiKey);
        return out;
      }

      if (desiredProvider === LlmProviderId.ANTHROPIC && anthropicKey) {
        out.runtimeProviderConfig = this.buildRuntimeProviderConfig(LlmProviderId.ANTHROPIC, anthropicKey);
        return out;
      }

      // If they selected OpenAI/Anthropic but only provided an OpenRouter key, route via OpenRouter.
      if (desiredProvider === LlmProviderId.OPENAI && openRouterKey) {
        out.runtimeProviderConfig = this.buildRuntimeProviderConfig(LlmProviderId.OPENROUTER, openRouterKey);
        if (prefModel && !out.modelOverride) {
          out.modelOverride = `openai/${prefModel}`;
        } else if (out.modelOverride && !out.modelOverride.includes('/')) {
          out.modelOverride = `openai/${out.modelOverride}`;
        }
        return out;
      }

      if (desiredProvider === LlmProviderId.ANTHROPIC && openRouterKey) {
        out.runtimeProviderConfig = this.buildRuntimeProviderConfig(LlmProviderId.OPENROUTER, openRouterKey);
        if (prefModel && !out.modelOverride) {
          out.modelOverride = `anthropic/${prefModel}`;
        } else if (out.modelOverride && !out.modelOverride.includes('/')) {
          out.modelOverride = `anthropic/${out.modelOverride}`;
        }
        return out;
      }

      // No explicit preference: if they at least stored an OpenRouter/OpenAI/Anthropic key, use it.
      if (openRouterKey) {
        out.runtimeProviderConfig = this.buildRuntimeProviderConfig(LlmProviderId.OPENROUTER, openRouterKey);
        return out;
      }
      if (openAiKey) {
        out.runtimeProviderConfig = this.buildRuntimeProviderConfig(LlmProviderId.OPENAI, openAiKey);
        return out;
      }
      if (anthropicKey) {
        out.runtimeProviderConfig = this.buildRuntimeProviderConfig(LlmProviderId.ANTHROPIC, anthropicKey);
        return out;
      }

      return out;
    } catch {
      return out;
    }
  }

  private async loadSocialDynamicsConfig(networkId: string): Promise<SocialDynamicsConfig | undefined> {
    const defaults: SocialDynamicsConfig = {
      pairwiseInfluenceDamping: {
        enabled: true,
        halfLifeMs: 12 * 60 * 60 * 1000,
        suppressionThreshold: 0.02,
        minWeight: 0.05,
        scoreSlope: 0.06,
        streakSlope: 0.10,
        actionImpact: {
          like: 0.8,
          downvote: 0.8,
          boost: 1.0,
          reply: 0.6,
          view: 0.02,
          report: 0.8,
          emoji_reaction: 0.3,
        },
      },
    };

    // Always return a usable config; fall back to defaults on parse/IO errors.
    let parsed: SocialDynamicsConfig | undefined;
    try {
      const row = await this.db.get<{ config_json: string | null }>(
        `SELECT config_json
           FROM wunderland_social_dynamics_configs
          WHERE network_id = ?
          LIMIT 1`,
        [networkId],
      );
      if (row?.config_json) {
        const maybe = this.safeJsonParse<unknown>(row.config_json);
        if (maybe && typeof maybe === 'object') {
          parsed = maybe as SocialDynamicsConfig;
        }
      }
    } catch (err) {
      this.logger.warn(
        `Failed to load social dynamics config for network '${networkId}': ${String(
          (err as any)?.message ?? err,
        )}`,
      );
    }

    const effective = parsed ?? defaults;

    // Backfill defaults (best-effort) so operators can tune without redeploying.
    try {
      const now = Date.now();
      const configJson = JSON.stringify(effective);
      const hash = createHash('sha256').update(configJson).digest('hex');
      await this.db.run(
        `INSERT INTO wunderland_social_dynamics_configs (
          network_id, config_json, config_hash, updated_by_user_id, created_at, updated_at
        ) VALUES (?, ?, ?, NULL, ?, ?)
        ON CONFLICT(network_id) DO NOTHING`,
        [networkId, configJson, hash, now, now],
      );
    } catch {
      // non-critical
    }

    return effective;
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
        const llmPref = await this.resolveAgentLlmFromCredentials(agent.owner_user_id, agent.seed_id);

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

        if (llmPref.runtimeProviderConfig && llmPref.modelOverride && seedConfig.inferenceHierarchy?.primaryModel) {
          seedConfig.inferenceHierarchy.primaryModel.modelId = llmPref.modelOverride;
        }

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

        if (llmPref.runtimeProviderConfig) {
          this.network!.setLLMCallbackForCitizen(agent.seed_id, async (messages, tools, options) => {
            const effectiveModel = llmPref.modelOverride || options?.model;
            const resp = await callLlmWithProviderConfig(messages as any, effectiveModel, {
              temperature: options?.temperature,
              max_tokens: options?.max_tokens,
              tools: tools as any,
            }, llmPref.runtimeProviderConfig!, agent.owner_user_id);

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

      tools.push(
        createFeedSearchTool(async ({ query, topK, threadPostId, enclave, sinceHours, context }) => {
          const seedId = context.gmiId;
          const q = typeof query === 'string' ? query.trim() : '';
          if (!q) return { items: [], context: '' };

          const maxItems = Math.max(1, Math.min(20, topK));
          const sinceHoursRaw = typeof sinceHours === 'number' ? sinceHours : Number(sinceHours);
          const sinceMs =
            Number.isFinite(sinceHoursRaw) && sinceHoursRaw > 0
              ? Date.now() - Math.max(0, Math.min(8760, sinceHoursRaw)) * 60 * 60 * 1000
              : null;

          const seenPostIds = new Set<string>();
          const items: Array<{ text: string; score?: number; metadata?: Record<string, unknown> }> = [];

          const addItem = (item: { text: string; score?: number; metadata?: Record<string, unknown> }): void => {
            if (items.length >= maxItems) return;
            const postIdRaw = item?.metadata && typeof (item.metadata as any).postId === 'string'
              ? String((item.metadata as any).postId).trim()
              : '';
            if (postIdRaw) {
              if (seenPostIds.has(postIdRaw)) return;
              seenPostIds.add(postIdRaw);
            }

            if (!item.text?.trim()) return;
            items.push(item);
          };

          const resolveEnclaveId = async (hint: string): Promise<string | null> => {
            const raw = typeof hint === 'string' ? hint.trim() : '';
            if (!raw) return null;
            try {
              const row = await this.db.get<{ enclave_id: string }>(
                'SELECT enclave_id FROM wunderland_enclaves WHERE enclave_id = ? OR name = ? LIMIT 1',
                [raw, raw],
              );
              return row?.enclave_id ? String(row.enclave_id) : null;
            } catch {
              return null;
            }
          };

          const resolveThreadRoot = async (
            hint: string,
          ): Promise<{ postId: string; enclaveId: string | null } | null> => {
            const raw = typeof hint === 'string' ? hint.trim() : '';
            if (!raw) return null;

            const getNode = async (
              id: string,
            ): Promise<{ post_id: string; reply_to_post_id: string | null; enclave_id: string | null } | null> => {
              try {
                const row = await this.db.get<{ post_id: string; reply_to_post_id: string | null; enclave_id: string | null }>(
                  `SELECT post_id, reply_to_post_id, enclave_id
                   FROM wunderland_posts
                   WHERE post_id = ? OR sol_post_pda = ?
                   LIMIT 1`,
                  [id, id],
                );
                return row?.post_id ? row : null;
              } catch {
                return null;
              }
            };

            let current = await getNode(raw);
            if (!current) return null;

            const seen = new Set<string>();
            for (let i = 0; i < 10; i++) {
              const parentId = current.reply_to_post_id ? String(current.reply_to_post_id).trim() : '';
              if (!parentId) break;
              if (seen.has(parentId)) break;
              seen.add(parentId);

              const parent = await getNode(parentId);
              if (!parent) break;
              current = parent;
            }

            return { postId: String(current.post_id), enclaveId: current.enclave_id ? String(current.enclave_id) : null };
          };

          // Tier 1: thread context (root + replies), if provided.
          let inferredEnclaveId: string | null = null;
          const threadHint = typeof threadPostId === 'string' ? threadPostId.trim() : '';
          if (threadHint) {
            const root = await resolveThreadRoot(threadHint);
            if (root?.postId) {
              inferredEnclaveId = root.enclaveId ?? null;

              const threadRows: Array<{
                post_id: string;
                seed_id: string;
                content: string;
                reply_to_post_id: string | null;
                published_at: number | null;
                created_at: number | null;
                display_name: string | null;
              }> = [];

              // Always include the root.
              try {
                const rootRow = await this.db.get<{
                  post_id: string;
                  seed_id: string;
                  content: string;
                  reply_to_post_id: string | null;
                  published_at: number | null;
                  created_at: number | null;
                  display_name: string | null;
                }>(
                  `
                    SELECT
                      p.post_id,
                      p.seed_id,
                      p.content,
                      p.reply_to_post_id,
                      p.published_at,
                      p.created_at,
                      b.display_name
                    FROM wunderland_posts p
                    LEFT JOIN wunderbots b ON b.seed_id = p.seed_id
                    WHERE p.status = 'published'
                      AND p.post_id = ?
                    LIMIT 1
                  `,
                  [root.postId],
                );
                if (rootRow?.post_id) {
                  threadRows.push(rootRow);
                }
              } catch {
                // non-critical
              }

              // Breadth-first gather descendants (replies-to-replies), bounded.
              const maxThreadPosts = 18;
              const frontier: string[] = [root.postId];
              const threadPostIds = new Set<string>([root.postId]);
              let depth = 0;
              while (frontier.length > 0 && threadPostIds.size < maxThreadPosts && depth < 6) {
                const batch = frontier.splice(0, 12);
                const placeholders = batch.map(() => '?').join(',');
                try {
                  const rows = await this.db.all<{
                    post_id: string;
                    seed_id: string;
                    content: string;
                    reply_to_post_id: string | null;
                    published_at: number | null;
                    created_at: number | null;
                    display_name: string | null;
                  }>(
                    `
                      SELECT
                        p.post_id,
                        p.seed_id,
                        p.content,
                        p.reply_to_post_id,
                        p.published_at,
                        p.created_at,
                        b.display_name
                      FROM wunderland_posts p
                      LEFT JOIN wunderbots b ON b.seed_id = p.seed_id
                      WHERE p.status = 'published'
                        AND p.reply_to_post_id IN (${placeholders})
                      ORDER BY COALESCE(p.published_at, p.created_at) DESC
                      LIMIT ?
                    `,
                    [...batch, maxThreadPosts - threadPostIds.size],
                  );

                  const next: string[] = [];
                  for (const r of rows) {
                    const pid = r?.post_id ? String(r.post_id) : '';
                    if (!pid) continue;
                    if (threadPostIds.has(pid)) continue;

                    const tsMs = Number(r.published_at ?? r.created_at ?? 0);
                    if (sinceMs && Number.isFinite(tsMs) && tsMs > 0 && tsMs < sinceMs) continue;

                    threadPostIds.add(pid);
                    threadRows.push(r);
                    next.push(pid);
                  }

                  frontier.push(...next);
                } catch {
                  // non-critical
                }

                depth++;
              }

              // Add in chronological order for coherence.
              threadRows.sort((a, b) => {
                const at = Number(a.published_at ?? a.created_at ?? 0);
                const bt = Number(b.published_at ?? b.created_at ?? 0);
                return at - bt;
              });

              const trimmedThreadRows = (() => {
                if (threadRows.length <= maxItems) return threadRows;
                const rootIdx = threadRows.findIndex((r) => String(r.post_id) === root.postId);
                const rootRow = rootIdx >= 0 ? threadRows[rootIdx]! : threadRows[0]!;
                const rest = rootIdx >= 0 ? threadRows.filter((_, i) => i !== rootIdx) : threadRows.slice(1);
                const tail = rest.slice(-Math.max(0, maxItems - 1));
                return [rootRow, ...tail];
              })();

              for (const r of trimmedThreadRows) {
                const text = String(r.content ?? '').replace(/\s+/g, ' ').trim().slice(0, 520);
                if (!text) continue;
                addItem({
                  text,
                  score: undefined,
                  metadata: {
                    tier: 'thread',
                    seedId: String(r.seed_id),
                    postId: String(r.post_id),
                    replyToPostId: r.reply_to_post_id ? String(r.reply_to_post_id) : '',
                    agentDisplayName: r.display_name ? String(r.display_name) : '',
                    publishedAt: r.published_at ? new Date(Number(r.published_at)).toISOString() : '',
                  },
                });
              }
            }
          }

          // Tier 2: enclave-scoped keyword search, if provided (or inferred from thread).
          const explicitEnclave = typeof enclave === 'string' ? enclave.trim() : '';
          const enclaveId = (explicitEnclave ? await resolveEnclaveId(explicitEnclave) : null) ?? inferredEnclaveId;

          const qLower = q.toLowerCase().replace(/\s+/g, ' ').trim();
          const tokens = qLower
            .split(' ')
            .map((t) => t.trim())
            .filter((t) => t.length >= 4)
            .slice(0, 5);

          const whereParts: string[] = [];
          const params: any[] = [];
          const addLike = (fieldSql: string, term: string) => {
            whereParts.push(`lower(${fieldSql}) LIKE ?`);
            params.push(`%${term}%`);
          };

          if (tokens.length === 0) {
            addLike('p.content', qLower.slice(0, 80));
          } else {
            for (const t of tokens) addLike('p.content', t);
          }

          const whereSql = whereParts.length > 0 ? `(${whereParts.join(' OR ')})` : '1=1';
          const max = Math.max(1, Math.min(20, maxItems));

          if (enclaveId && items.length < maxItems) {
            const limit = Math.max(1, Math.min(20, Math.max(4, Math.trunc(maxItems * 1.5))));

            const rows = await this.db.all<{
              post_id: string;
              seed_id: string;
              content: string;
              reply_to_post_id: string | null;
              published_at: number | null;
              display_name: string | null;
            }>(
              `
                SELECT
                  p.post_id,
                  p.seed_id,
                  p.content,
                  p.reply_to_post_id,
                  p.published_at,
                  b.display_name
                FROM wunderland_posts p
                LEFT JOIN wunderbots b ON b.seed_id = p.seed_id
                WHERE p.status = 'published'
                  AND p.enclave_id = ?
                  AND p.seed_id != ?
                  AND ${whereSql}
                  ${sinceMs ? 'AND COALESCE(p.published_at, p.created_at) >= ?' : ''}
                ORDER BY COALESCE(p.published_at, p.created_at) DESC
                LIMIT ?
              `,
              [enclaveId, seedId, ...params, ...(sinceMs ? [sinceMs] : []), limit],
            );

            for (const r of rows) {
              if (items.length >= maxItems) break;
              const text = String(r.content ?? '').replace(/\s+/g, ' ').trim().slice(0, 520);
              if (!text) continue;
              addItem({
                text,
                score: undefined,
                metadata: {
                  tier: 'enclave',
                  enclaveId,
                  seedId: String(r.seed_id),
                  postId: String(r.post_id),
                  replyToPostId: r.reply_to_post_id ? String(r.reply_to_post_id) : '',
                  agentDisplayName: r.display_name ? String(r.display_name) : '',
                  publishedAt: r.published_at ? new Date(Number(r.published_at)).toISOString() : '',
                },
              });
            }
          }

          // Tier 3: global semantic search (cross-seed) for fill.
          if (items.length < maxItems) {
            try {
              const result = await this.vectorMemory.queryNetworkPosts({
                query: q,
                topK: Math.max(1, Math.min(120, maxItems * 12)),
                excludeSeedId: seedId,
                ...(explicitEnclave && enclaveId ? { enclaveId } : {}),
              });

              for (const chunk of (result.chunks ?? []) as any[]) {
                if (items.length >= maxItems) break;

                const text = String(chunk?.content ?? '').trim();
                if (!text) continue;

                const metadata = (chunk?.metadata ?? {}) as any;
                const postId = typeof metadata?.postId === 'string' ? String(metadata.postId).trim() : '';
                if (postId && seenPostIds.has(postId)) continue;

                if (sinceMs) {
                  const tsRaw =
                    (typeof metadata?.publishedAt === 'string' && metadata.publishedAt) ||
                    (typeof metadata?.createdAt === 'string' && metadata.createdAt) ||
                    '';
                  const tsMs = tsRaw ? Date.parse(String(tsRaw)) : NaN;
                  if (Number.isFinite(tsMs) && tsMs > 0 && tsMs < sinceMs) continue;
                }

                addItem({
                  text,
                  score:
                    typeof chunk?.relevanceScore === 'number'
                      ? chunk.relevanceScore
                      : typeof chunk?.score === 'number'
                        ? chunk.score
                        : undefined,
                  metadata: {
                    tier: 'network',
                    ...(metadata as any),
                  },
                });
              }
            } catch {
              // non-critical; fall back to keyword SQL below
            }
          }

          // Final fallback: global keyword SQL.
          if (items.length < maxItems) {
            const rows = await this.db.all<{
              post_id: string;
              seed_id: string;
              content: string;
              reply_to_post_id: string | null;
              published_at: number | null;
              display_name: string | null;
            }>(
              `
                SELECT
                  p.post_id,
                  p.seed_id,
                  p.content,
                  p.reply_to_post_id,
                  p.published_at,
                  b.display_name
                FROM wunderland_posts p
                LEFT JOIN wunderbots b ON b.seed_id = p.seed_id
                WHERE p.status = 'published'
                  AND p.seed_id != ?
                  AND ${whereSql}
                  ${sinceMs ? 'AND COALESCE(p.published_at, p.created_at) >= ?' : ''}
                ORDER BY COALESCE(p.published_at, p.created_at) DESC
                LIMIT ?
              `,
              [seedId, ...params, ...(sinceMs ? [sinceMs] : []), max],
            );

            for (const r of rows) {
              if (items.length >= maxItems) break;
              const text = String(r.content ?? '').replace(/\s+/g, ' ').trim().slice(0, 520);
              if (!text) continue;
              addItem({
                text,
                score: undefined,
                metadata: {
                  tier: 'keyword',
                  seedId: String(r.seed_id),
                  postId: String(r.post_id),
                  replyToPostId: r.reply_to_post_id ? String(r.reply_to_post_id) : '',
                  agentDisplayName: r.display_name ? String(r.display_name) : '',
                  publishedAt: r.published_at ? new Date(Number(r.published_at)).toISOString() : '',
                },
              });
            }
          }

          const contextLines = items.map((item, idx) => {
            const m = item.metadata as any;
            const who = m.agentDisplayName ? `${m.agentDisplayName} (${m.seedId})` : String(m.seedId);
            const pid = m.postId ? ` postId=${m.postId}` : '';
            const tier = m.tier ? ` [${String(m.tier)}]` : '';
            return `(${idx + 1})${tier} ${who}:${pid} ${item.text}`;
          });

          return {
            items,
            context: contextLines.join('\n').slice(0, 4000),
          };
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

    const availableProviders = LlmConfigService.getInstance().getAvailableProviders();
    if (availableProviders.length === 0) {
      this.logger.log(
        'No LLM providers detected (OPENAI_API_KEY / OPENROUTER_API_KEY / ANTHROPIC_API_KEY / OLLAMA_BASE_URL). Newsrooms will stay silent (no placeholder filler posts).'
      );
      return;
    }

    const disableSentiment = /^(1|true|yes)$/i.test(
      String(process.env.WUNDERLAND_DISABLE_LLM_SENTIMENT ?? '').trim(),
    );
    if (!disableSentiment) {
      const moodModel = String(process.env.WUNDERLAND_MOOD_ANALYZER_MODEL ?? '').trim() || undefined;
      const analyzer = new LLMSentimentAnalyzer({
        invoker: async (prompt: string): Promise<string> => {
          const resp = await callLlm(
            [
              { role: 'system', content: 'You are a strict JSON API. Return only valid JSON.' } as any,
              { role: 'user', content: prompt } as any,
            ],
            moodModel,
            { temperature: 0.1, max_tokens: 220 },
          );
          return String(resp.text ?? '').trim();
        },
        fallbackToKeyword: true,
        cacheTtlMs: 120_000,
        maxConcurrency: 2,
      });
      this.network.setLLMSentimentAnalyzer(analyzer);
      this.logger.log(
        `Stimulus mood-impact analyzer enabled${moodModel ? ` (model=${moodModel})` : ''}.`,
      );
    } else {
      this.logger.log('Stimulus mood-impact analyzer disabled via WUNDERLAND_DISABLE_LLM_SENTIMENT.');
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

    // Resolve enclave slug (e.g. "creative-chaos") to UUID enclave_id
    const enclaveSlug = (post as any).enclave ?? null;
    let enclaveId: string | null = null;
    if (enclaveSlug) {
      try {
        const row = await this.db.get<{ enclave_id: string }>(
          'SELECT enclave_id FROM wunderland_enclaves WHERE name = ? LIMIT 1',
          [enclaveSlug],
        );
        enclaveId = row?.enclave_id ?? null;
      } catch { /* non-critical */ }
    }

    await this.db.run(
      `INSERT INTO wunderland_posts (
        post_id, seed_id, content, manifest, status,
        reply_to_post_id, created_at, published_at,
        likes, downvotes, boosts, replies, views, agent_level_at_post,
        stimulus_type, stimulus_event_id, stimulus_source_provider_id, stimulus_timestamp,
        enclave_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(post_id) DO UPDATE SET
        seed_id = excluded.seed_id,
        content = excluded.content,
        manifest = excluded.manifest,
        status = excluded.status,
        reply_to_post_id = excluded.reply_to_post_id,
        published_at = excluded.published_at,
        likes = excluded.likes,
        downvotes = excluded.downvotes,
        boosts = excluded.boosts,
        replies = excluded.replies,
        views = excluded.views,
        agent_level_at_post = excluded.agent_level_at_post,
        stimulus_type = excluded.stimulus_type,
        stimulus_event_id = excluded.stimulus_event_id,
        stimulus_source_provider_id = excluded.stimulus_source_provider_id,
        stimulus_timestamp = excluded.stimulus_timestamp,
        enclave_id = excluded.enclave_id`,
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
        post.engagement.downvotes,
        post.engagement.boosts,
        post.engagement.replies,
        post.engagement.views,
        post.agentLevelAtPost,
        stimulusType,
        stimulusEventId,
        stimulusSourceProviderId,
        stimulusTimestamp,
        enclaveId,
      ]
    );

    // Emit activity event for post publication.
    const isReply = !!post.replyToPostId;
    try {
      await this.activityFeed.recordEvent(
        isReply ? 'comment_published' : 'post_published',
        post.seedId,
        null,
        'post',
        post.postId,
        enclaveSlug,
        isReply ? `replied in e/${enclaveSlug ?? 'feed'}` : `posted in e/${enclaveSlug ?? 'feed'}`,
        { contentPreview: post.content?.slice(0, 80) },
      );
    } catch { /* non-critical */ }

    // Increment parent post replies counter when persisting a reply.
    if (post.replyToPostId) {
      await this.db.run(
        'UPDATE wunderland_posts SET replies = replies + 1 WHERE post_id = ?',
        [post.replyToPostId]
      );

      // Trust update: replying is a (usually positive) engagement signal.
      // Direction: replier -> parent author.
      if (this.trustEngine && this.network) {
        try {
          const parent = await this.db.get<{ seed_id: string }>(
            'SELECT seed_id FROM wunderland_posts WHERE post_id = ? LIMIT 1',
            [post.replyToPostId],
          );
          const parentSeedId = parent?.seed_id ? String(parent.seed_id) : '';
          if (parentSeedId && parentSeedId !== post.seedId) {
            const replierTraits = this.network.getCitizen(post.seedId)?.personality;
            this.trustEngine.recordInteraction(post.seedId, parentSeedId, 'reply', replierTraits);
          }
        } catch {
          // non-critical
        }
      }
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
        enclaveId,
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
            enclaveId: enclaveId ?? undefined,
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

  async getLastBrowsingSessionExtended(
    seedId: string,
  ): Promise<{ sessionId: string; record: ExtendedBrowsingSessionRecord } | null> {
    const row = await this.db.get<{
      session_id: string;
      seed_id: string;
      enclaves_visited: string;
      posts_read: number;
      comments_written: number;
      votes_cast: number;
      emoji_reactions: number;
      episodic_json?: string | null;
      reasoning_traces_json?: string | null;
      started_at: number;
      finished_at: number;
    }>(
      `SELECT session_id, seed_id, enclaves_visited, posts_read, comments_written, votes_cast, emoji_reactions,
              episodic_json, reasoning_traces_json, started_at, finished_at
         FROM wunderland_browsing_sessions
        WHERE seed_id = ?
        ORDER BY finished_at DESC
        LIMIT 1`,
      [seedId],
    );

    if (!row?.session_id) return null;

    const record: ExtendedBrowsingSessionRecord = {
      seedId: String(row.seed_id),
      enclavesVisited: JSON.parse(String(row.enclaves_visited || '[]')) as string[],
      postsRead: Number(row.posts_read ?? 0),
      commentsWritten: Number(row.comments_written ?? 0),
      votesCast: Number(row.votes_cast ?? 0),
      emojiReactions: Number(row.emoji_reactions ?? 0),
      startedAt: new Date(Number(row.started_at ?? Date.now())).toISOString(),
      finishedAt: new Date(Number(row.finished_at ?? Date.now())).toISOString(),
    };

    try {
      if (row.episodic_json) record.episodic = JSON.parse(String(row.episodic_json));
    } catch {
      // ignore invalid JSON
    }
    try {
      if (row.reasoning_traces_json) record.reasoningTraces = JSON.parse(String(row.reasoning_traces_json));
    } catch {
      // ignore invalid JSON
    }

    return { sessionId: String(row.session_id), record };
  }

  async getEpisodicMemory(seedId: string, opts?: { moodLabel?: string; minSalience?: number; limit?: number }) {
    return this.browsingPersistence.loadEpisodicMemory?.(seedId, opts) ?? [];
  }

  isEnabled(): boolean {
    return this.enabled;
  }
}
