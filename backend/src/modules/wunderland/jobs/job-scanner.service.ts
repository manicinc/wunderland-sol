/**
 * @file job-scanner.service.ts
 * @description Runs `packages/wunderland` JobScanner + BidLifecycleManager for active agents.
 *
 * Env gate: ENABLE_JOB_SCANNING=true
 *
 * Design:
 * - Scans `/api/wunderland/jobs/scan` for open jobs
 * - Uses mood + HEXACO + (optional) RAG job memory for selectivity (Option 6C)
 * - Places on-chain bids via WunderlandSolService (payout = accepted bid; remainder refunded)
 * - Withdraws losing bids to free capacity (BidLifecycleManager)
 */

import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { DatabaseService } from '../../../database/database.service.js';
import { OrchestrationService } from '../orchestration/orchestration.service.js';
import { WunderlandVectorMemoryService } from '../orchestration/wunderland-vector-memory.service.js';
import { WunderlandSolService } from '../wunderland-sol/wunderland-sol.service.js';
import {
  BidLifecycleManager,
  JobMemoryService,
  JobScanner,
  createAgentJobState,
} from 'wunderland';
import type {
  ActiveBid,
  AgentJobState,
  AgentProfile,
  Job,
  JobEvaluationResult,
  JobStatus,
} from 'wunderland';

type AgentScannerInstance = {
  seedId: string;
  displayName: string;
  solAgentIdentityPda: string;
  scanner: JobScanner;
  bidLifecycle: BidLifecycleManager;
  state: AgentJobState;
  profile: AgentProfile;
  bidSyncTimer: NodeJS.Timeout | null;
};

function parseJsonOr<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return (JSON.parse(raw) as T) ?? fallback;
  } catch {
    return fallback;
  }
}

function normalizeHexaco(traits: any): AgentProfile['hexaco'] {
  return {
    honesty_humility: typeof traits?.honesty_humility === 'number' ? traits.honesty_humility : 0.5,
    emotionality: typeof traits?.emotionality === 'number' ? traits.emotionality : 0.5,
    extraversion: typeof traits?.extraversion === 'number' ? traits.extraversion : 0.5,
    agreeableness: typeof traits?.agreeableness === 'number' ? traits.agreeableness : 0.5,
    conscientiousness: typeof traits?.conscientiousness === 'number' ? traits.conscientiousness : 0.5,
    openness: typeof traits?.openness === 'number' ? traits.openness : 0.5,
  };
}

function sha256HexUtf8(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

function backendPort(): number {
  const raw = process.env.PORT ?? process.env.WUNDERLAND_BACKEND_PORT ?? '';
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 3001;
}

@Injectable()
export class JobScannerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(JobScannerService.name);

  private readonly enabled = process.env.ENABLE_JOB_SCANNING === 'true';
  private readonly maxAgents = Math.max(1, Math.min(250, Number(process.env.JOB_SCANNING_MAX_AGENTS ?? 50)));
  private readonly baseIntervalMs = Math.max(
    7_500,
    Number(process.env.JOB_SCANNING_BASE_INTERVAL_MS ?? 30_000),
  );
  private readonly bidSyncIntervalMs = Math.max(
    7_500,
    Number(process.env.JOB_SCANNING_BID_SYNC_INTERVAL_MS ?? 30_000),
  );
  private readonly maxActiveBids = Math.max(
    1,
    Math.min(25, Number(process.env.JOB_SCANNING_MAX_ACTIVE_BIDS ?? 5)),
  );

  private readonly jobsApiUrl =
    process.env.WUNDERLAND_JOBS_API_URL?.trim() ||
    `http://localhost:${backendPort()}/api/wunderland/jobs/scan`;

  private readonly scanners = new Map<string, AgentScannerInstance>();
  private jobMemoryService: JobMemoryService | null = null;

  constructor(
    private readonly db: DatabaseService,
    private readonly orchestration: OrchestrationService,
    private readonly vectorMemory: WunderlandVectorMemoryService,
    private readonly solService: WunderlandSolService,
  ) {}

  onModuleInit(): void {
    if (!this.enabled) {
      this.logger.log('Job scanning disabled (ENABLE_JOB_SCANNING != true).');
      return;
    }

    // Run async init in background so we don't block NestJS startup.
    void this.initInBackground();
  }

  async onModuleDestroy(): Promise<void> {
    for (const instance of this.scanners.values()) {
      try {
        instance.scanner.stop();
      } catch {
        // ignore
      }
      try {
        instance.bidLifecycle.stop();
      } catch {
        // ignore
      }
      if (instance.bidSyncTimer) {
        clearInterval(instance.bidSyncTimer);
        instance.bidSyncTimer = null;
      }
      try {
        await this.saveAgentJobState(instance.seedId, instance.state);
      } catch {
        // ignore
      }
    }
    this.scanners.clear();
  }

  private async initInBackground(): Promise<void> {
    try {
      // Optional: enable RAG bonus for job evaluation.
      try {
        const rag = await this.vectorMemory.getRetrievalAugmentor();
        if (rag) {
          this.jobMemoryService = new JobMemoryService(rag as any);
          this.logger.log('JobMemoryService enabled (RAG).');
        }
      } catch (err) {
        this.logger.warn(`JobMemoryService disabled: ${String((err as any)?.message ?? err)}`);
        this.jobMemoryService = null;
      }

      // Wait briefly for social orchestration to boot and provide MoodEngine.
      // This keeps job bidding behavior consistent with each agent's mood/personality.
      const waitStart = Date.now();
      while (!this.orchestration.getNetwork()?.getMoodEngine() && Date.now() - waitStart < 60_000) {
        await new Promise((resolve) => setTimeout(resolve, 1_000));
      }

      await this.startScannersForActiveAgents();
      this.logger.log(`Job scanning enabled for ${this.scanners.size} agent(s).`);
    } catch (err) {
      this.logger.error(`Job scanning init failed: ${String((err as any)?.message ?? err)}`);
    }
  }

  private async startScannersForActiveAgents(): Promise<void> {
    const agents = await this.db.all<{
      seed_id: string;
      display_name: string;
      hexaco_traits: string;
      level: number | null;
      global_reputation: number | null;
    }>(
      `
        SELECT
          b.seed_id,
          b.display_name,
          b.hexaco_traits,
          c.level as level,
          r.global_reputation as global_reputation
        FROM wunderbots b
        LEFT JOIN wunderland_citizens c ON c.seed_id = b.seed_id
        LEFT JOIN wunderland_reputations r ON r.seed_id = b.seed_id
        WHERE b.status = 'active'
        LIMIT ?
      `,
      [this.maxAgents],
    );

    for (const agent of agents) {
      const seedId = String(agent.seed_id ?? '').trim();
      if (!seedId) continue;
      if (this.scanners.has(seedId)) continue;

      try {
        await this.startScannerForAgent({
          seedId,
          displayName: String(agent.display_name ?? seedId),
          hexacoTraits: parseJsonOr(agent.hexaco_traits, {}),
          level: typeof agent.level === 'number' && Number.isFinite(agent.level) ? agent.level : 1,
          reputation100: (() => {
            const rep = typeof agent.global_reputation === 'number' ? agent.global_reputation : 0.5;
            const normalized = Number.isFinite(rep) ? Math.max(0, Math.min(1, rep)) : 0.5;
            return Math.round(normalized * 100);
          })(),
        });
      } catch (err) {
        this.logger.warn(`Failed to start scanner for "${seedId}": ${String((err as any)?.message ?? err)}`);
      }
    }
  }

  private async startScannerForAgent(agent: {
    seedId: string;
    displayName: string;
    hexacoTraits: any;
    level: number;
    reputation100: number;
  }): Promise<void> {
    const solAgentIdentityPda = await this.solService.getManagedAgentIdentityPda(agent.seedId);
    if (!solAgentIdentityPda) {
      this.logger.warn(`Skipping job scanner for ${agent.seedId} (missing Solana agent mapping).`);
      return;
    }

    const moodEngine = this.orchestration.getNetwork()?.getMoodEngine();
    if (!moodEngine) {
      this.logger.warn(`Skipping job scanner for ${agent.seedId} (MoodEngine not available).`);
      return;
    }

    const state = await this.loadOrCreateAgentJobState(agent.seedId, agent.level, agent.reputation100);

    const profile: AgentProfile = {
      seedId: agent.seedId,
      level: agent.level,
      reputation: agent.reputation100,
      hexaco: normalizeHexaco(agent.hexacoTraits),
      completedJobs: state.totalJobsCompleted,
      averageRating: 0,
    };

    const scanner = new JobScanner(
      {
        jobsApiUrl: this.jobsApiUrl,
        baseIntervalMs: this.baseIntervalMs,
        startupJitterMs: 30_000,
        enableAdaptivePolling: true,
        maxActiveBids: this.maxActiveBids,
        onBidDecision: async (job: Job, evaluation: JobEvaluationResult) => {
          await this.handleBidDecision(agent.seedId, scanner, job, evaluation, state);
        },
      },
      moodEngine,
      agent.seedId,
      this.jobMemoryService ?? undefined,
    );

    // Seed active bids so the scanner doesn't exceed capacity after restart.
    try {
      const activeJobIds = await this.fetchActiveBidJobIds(solAgentIdentityPda);
      scanner.setActiveBids(activeJobIds);
    } catch {
      // ignore
    }

    const bidLifecycle = new BidLifecycleManager({
      pollIntervalMs: this.baseIntervalMs,
      fetchActiveBids: async (agentId) => this.fetchActiveBids(agentId),
      getJobStatus: async (jobId) => this.getJobStatus(jobId),
      withdrawBid: async (params) => this.withdrawBid(agent.seedId, params),
      onBidInactive: async (params) => {
        scanner.markBidInactive(params.jobId);
      },
      onWorkloadDecrement: async () => Promise.resolve(),
    });

    // Periodic sync: reconcile active bids with the indexed on-chain state.
    const bidSyncTimer = setInterval(() => {
      void (async () => {
        const activeJobIds = await this.fetchActiveBidJobIds(solAgentIdentityPda);
        scanner.setActiveBids(activeJobIds);
      })().catch(() => {});
    }, this.bidSyncIntervalMs);

    scanner.start(profile, state);
    bidLifecycle.start(solAgentIdentityPda);

    this.scanners.set(agent.seedId, {
      seedId: agent.seedId,
      displayName: agent.displayName,
      solAgentIdentityPda,
      scanner,
      bidLifecycle,
      state,
      profile,
      bidSyncTimer,
    });

    this.logger.log(`Started JobScanner for ${agent.seedId} (${agent.displayName})`);
  }

  private async handleBidDecision(
    seedId: string,
    scanner: JobScanner,
    job: Job,
    evaluation: JobEvaluationResult,
    state: AgentJobState,
  ): Promise<void> {
    // Determine bid amount.
    const bidLamports = (() => {
      if (evaluation.useBuyItNow && typeof job.buyItNowLamports === 'number' && job.buyItNowLamports > 0) {
        return BigInt(Math.trunc(job.buyItNowLamports));
      }
      const recommended = evaluation.recommendedBidAmount ?? 0;
      return BigInt(Math.max(0, Math.trunc(recommended)));
    })();

    if (bidLamports <= 0n) {
      scanner.markBidInactive(job.id);
      return;
    }

    const bidMessage = JSON.stringify({
      v: 1,
      type: 'job_bid',
      seedId,
      jobPda: job.id,
      bidLamports: bidLamports.toString(),
      useBuyItNow: Boolean(evaluation.useBuyItNow),
      score: Number(evaluation.jobScore.toFixed(3)),
      reasoning: evaluation.reasoning,
      createdAt: Date.now(),
    });
    const messageHashHex = sha256HexUtf8(bidMessage);

    const res = await this.solService.placeJobBid({
      seedId,
      jobPdaAddress: job.id,
      bidLamports,
      messageHashHex,
    });

    if (!res.success) {
      this.logger.warn(`Bid failed: agent=${seedId} job=${job.id} error=${res.error ?? 'unknown'}`);
      // Free capacity; keep "already bid" memory to avoid thrashing.
      scanner.markBidInactive(job.id);
      return;
    }

    this.logger.log(
      `Bid placed: agent=${seedId} job=${job.id} bid=${bidLamports.toString()} (sig: ${res.signature})`,
    );

    // Best-effort persist job state after a bid decision.
    try {
      await this.saveAgentJobState(seedId, state);
    } catch {
      // ignore
    }
  }

  // ── Bid lifecycle callbacks ─────────────────────────────────────────────

  private async fetchActiveBidJobIds(agentIdentityPda: string): Promise<string[]> {
    const rows = await this.db.all<{ job_pda: string }>(
      `SELECT job_pda FROM wunderland_job_bids WHERE bidder_agent_pda = ? AND status = 'active'`,
      [agentIdentityPda],
    );
    return rows.map((r) => String(r.job_pda)).filter(Boolean);
  }

  private async fetchActiveBids(agentIdentityPda: string): Promise<ActiveBid[]> {
    const rows = await this.db.all<{
      bid_pda: string;
      job_pda: string;
      bidder_agent_pda: string;
      bid_lamports: string;
      created_at: number;
    }>(
      `
        SELECT bid_pda, job_pda, bidder_agent_pda, bid_lamports, created_at
          FROM wunderland_job_bids
         WHERE bidder_agent_pda = ?
           AND status = 'active'
         ORDER BY created_at DESC
         LIMIT 50
      `,
      [agentIdentityPda],
    );

    return rows.map((row) => ({
      bidId: row.bid_pda,
      jobId: row.job_pda,
      agentId: row.bidder_agent_pda,
      amountLamports: Number(row.bid_lamports),
      createdAt: row.created_at,
    }));
  }

  private async getJobStatus(jobPda: string): Promise<JobStatus | null> {
    const row = await this.db.get<{ status: string; assigned_agent_pda: string | null }>(
      `SELECT status, assigned_agent_pda FROM wunderland_job_postings WHERE job_pda = ? LIMIT 1`,
      [jobPda],
    );
    if (!row) return null;

    const status = String(row.status ?? 'open') as JobStatus['status'];
    return {
      status,
      assignedAgent: row.assigned_agent_pda,
    };
  }

  private async withdrawBid(seedId: string, params: { agentId: string; bidId: string; jobId: string }) {
    const res = await this.solService.withdrawJobBid({
      seedId,
      jobPdaAddress: params.jobId,
      bidPdaAddress: params.bidId,
    });
    return res.success ? { success: true, signature: res.signature } : { success: false, error: res.error };
  }

  // ── Job state persistence ───────────────────────────────────────────────

  private async loadOrCreateAgentJobState(
    seedId: string,
    level: number,
    reputation100: number,
  ): Promise<AgentJobState> {
    const row = await this.db.get<{
      active_job_count: number;
      bandwidth: number;
      min_acceptable_rate_per_hour: number;
      preferred_categories: string | null;
      recent_outcomes: string | null;
      risk_tolerance: number;
      total_jobs_evaluated: number;
      total_jobs_bid_on: number;
      total_jobs_completed: number;
      success_rate: number;
    }>(
      `SELECT
          active_job_count,
          bandwidth,
          min_acceptable_rate_per_hour,
          preferred_categories,
          recent_outcomes,
          risk_tolerance,
          total_jobs_evaluated,
          total_jobs_bid_on,
          total_jobs_completed,
          success_rate
        FROM wunderbot_job_states
        WHERE seed_id = ?
        LIMIT 1`,
      [seedId],
    );

    if (row) {
      return {
        seedId,
        activeJobCount: row.active_job_count ?? 0,
        bandwidth: row.bandwidth ?? 1.0,
        minAcceptableRatePerHour: row.min_acceptable_rate_per_hour ?? 0.02,
        preferredCategories: new Map(parseJsonOr(row.preferred_categories, [])),
        recentOutcomes: parseJsonOr(row.recent_outcomes, []),
        riskTolerance: row.risk_tolerance ?? 0.5,
        totalJobsEvaluated: row.total_jobs_evaluated ?? 0,
        totalJobsBidOn: row.total_jobs_bid_on ?? 0,
        totalJobsCompleted: row.total_jobs_completed ?? 0,
        successRate: row.success_rate ?? 0,
      };
    }

    return createAgentJobState(seedId, level, reputation100);
  }

  private async saveAgentJobState(seedId: string, state: AgentJobState): Promise<void> {
    const now = Date.now();
    await this.db.run(
      `
        INSERT INTO wunderbot_job_states (
          seed_id,
          active_job_count,
          bandwidth,
          min_acceptable_rate_per_hour,
          preferred_categories,
          recent_outcomes,
          risk_tolerance,
          total_jobs_evaluated,
          total_jobs_bid_on,
          total_jobs_completed,
          success_rate,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(seed_id) DO UPDATE SET
          active_job_count = excluded.active_job_count,
          bandwidth = excluded.bandwidth,
          min_acceptable_rate_per_hour = excluded.min_acceptable_rate_per_hour,
          preferred_categories = excluded.preferred_categories,
          recent_outcomes = excluded.recent_outcomes,
          risk_tolerance = excluded.risk_tolerance,
          total_jobs_evaluated = excluded.total_jobs_evaluated,
          total_jobs_bid_on = excluded.total_jobs_bid_on,
          total_jobs_completed = excluded.total_jobs_completed,
          success_rate = excluded.success_rate,
          updated_at = excluded.updated_at
      `,
      [
        seedId,
        state.activeJobCount,
        state.bandwidth,
        state.minAcceptableRatePerHour,
        JSON.stringify(Array.from(state.preferredCategories.entries())),
        JSON.stringify(state.recentOutcomes),
        state.riskTolerance,
        state.totalJobsEvaluated,
        state.totalJobsBidOn,
        state.totalJobsCompleted,
        state.successRate,
        now,
        now,
      ],
    );
  }
}
