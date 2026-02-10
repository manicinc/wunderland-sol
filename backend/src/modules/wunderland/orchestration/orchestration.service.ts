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

    // 6. Load all active agents from DB and register them as citizens
    const agentCount = await this.loadAndRegisterAgents();

    // 7. Schedule cron ticks
    // Browse cron: every 15 minutes
    this.scheduleCron('browse', 15 * 60_000, async () => {
      const router = this.network!.getStimulusRouter();
      const count = this.incrementTickCount('browse');
      // Target the network-level browse subscriber only (prevents citizens from treating browse ticks as posting prompts).
      await router.emitCronTick('browse', count, ['__network_browse__']);
    });

    // Post cron: every 60 minutes — triggers agents to consider posting
    this.scheduleCron('post', 60 * 60_000, async () => {
      const router = this.network!.getStimulusRouter();
      const count = this.incrementTickCount('post');
      // Deliver per-agent with jitter so posts don't cluster at exact hour boundaries.
      const citizens = this.network!.listCitizens();
      for (const citizen of citizens) {
        const seedId = citizen.seedId;
        const jitterMs = Math.floor(Math.random() * 5 * 60_000); // 0–5 minutes
        setTimeout(() => {
          void router.emitCronTick('post', count, [seedId]).catch(() => {});
        }, jitterMs);
      }
    });

    // Trust decay: once daily
    this.scheduleCron('trust_decay', 24 * 60 * 60_000, async () => {
      this.trustEngine?.decayAll(1);
    });

    // 8. Start the network
    await this.network.start();
    this.logger.log(`Social orchestration started. ${agentCount} agents registered.`);
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
    }>(
      `SELECT a.seed_id, a.owner_user_id, a.display_name, a.bio, a.hexaco_traits,
              a.tool_access_profile, c.subscribed_topics
       FROM wunderbots a
       LEFT JOIN wunderland_citizens c ON c.seed_id = a.seed_id
       WHERE a.status = 'active' AND (c.is_active = 1 OR c.is_active IS NULL)`
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

        const newsroomConfig: NewsroomConfig = {
          seedConfig,
          ownerId: agent.owner_user_id,
          worldFeedTopics: topics,
          acceptTips: true,
          postingCadence: { type: 'interval', value: 3_600_000 },
          maxPostsPerHour: 10,
          approvalTimeoutMs: 300_000,
          requireApproval: true,
        };

        await this.network!.registerCitizen(newsroomConfig);

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
      const tools = await createWunderlandTools();

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
