/**
 * @file job-execution.service.ts
 * @description NestJS service that wires the wunderland package's JobExecutor,
 * DeliverableManager, QualityChecker, and BidLifecycleManager classes into the
 * backend by providing DB and Solana callbacks.
 *
 * ## Env gate
 *
 * Enabled via `ENABLE_JOB_EXECUTION=true`. When disabled, the service is a no-op
 * and all public methods return safe defaults.
 *
 * ## Lifecycle
 *
 * - `onModuleInit` — starts execution and bid-withdrawal loops for each agent
 *   that has an active assignment (status='assigned').
 * - `onModuleDestroy` — stops all loops.
 *
 * ## Dependencies
 *
 * - **DatabaseService** — reads/writes job state, deliverables, bids.
 * - **WunderlandSolService** — (optional) future Solana submission/withdrawal.
 */

import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service.js';
import { WunderlandSolService } from '../wunderland-sol/wunderland-sol.service.js';
import { decryptSecret } from '../../../utils/crypto.js';
import {
  JobExecutor,
  DeliverableManager,
  QualityChecker,
  BidLifecycleManager,
} from 'wunderland';
import type {
  AssignedJob,
  ExecutionResult,
  StoredDeliverable,
  ActiveBid,
  JobStatus as BidJobStatus,
  WithdrawResult,
} from 'wunderland';

// ── DB row types ─────────────────────────────────────────────────────────────

type AssignedJobRow = {
  job_pda: string;
  title: string | null;
  description: string | null;
  status: string;
  budget_lamports: string;
  assigned_agent_pda: string | null;
  metadata_json: string | null;
  confidential_details: string | null;
};

type ActiveBidRow = {
  bid_pda: string;
  job_pda: string;
  bidder_agent_pda: string;
  bid_lamports: string;
  created_at: number;
};

type JobStatusRow = {
  status: string;
  assigned_agent_pda: string | null;
};

// ── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class JobExecutionService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(JobExecutionService.name);
  private readonly enabled = process.env.ENABLE_JOB_EXECUTION === 'true';

  private readonly agentId = process.env.JOB_EXECUTION_AGENT_ID ?? '';
  private readonly pollIntervalMs = Math.max(
    5_000,
    Number(process.env.JOB_EXECUTION_POLL_INTERVAL_MS ?? 30_000),
  );

  private jobExecutor: JobExecutor | null = null;
  private bidLifecycleManager: BidLifecycleManager | null = null;

  constructor(
    private readonly db: DatabaseService,
    private readonly solService: WunderlandSolService,
  ) {}

  // ── Lifecycle ────────────────────────────────────────────────────────────

  onModuleInit(): void {
    if (!this.enabled) {
      this.logger.log('Job execution disabled (ENABLE_JOB_EXECUTION != true).');
      return;
    }

    if (!this.agentId) {
      this.logger.warn(
        'Job execution enabled but JOB_EXECUTION_AGENT_ID not set. Skipping.',
      );
      return;
    }

    this.logger.log(
      `Initializing job execution for agent ${this.agentId} (poll: ${this.pollIntervalMs}ms).`,
    );

    // ── Wire up JobExecutor ─────────────────────────────────────────────

    const deliverableManager = new DeliverableManager({
      onPersist: (stored) => this.persistDeliverable(stored),
      onSubmit: (params) => this.submitJobOnChain(params),
    });

    const qualityChecker = new QualityChecker();

    this.jobExecutor = new JobExecutor({
      pollIntervalMs: this.pollIntervalMs,
      maxConcurrent: 1,
      maxRetries: 3,
      fetchAssignedJobs: (agentId, limit) =>
        this.fetchAssignedJobs(agentId, limit),
      onExecutionStart: (agentId, jobId) =>
        this.onExecutionStart(agentId, jobId),
      onExecutionComplete: (agentId, jobId, result) =>
        this.onExecutionComplete(agentId, jobId, result),
      qualityCheckerConfig: qualityChecker['threshold']
        ? undefined
        : undefined,
      deliverableManagerConfig: {
        onPersist: (stored) => this.persistDeliverable(stored),
        onSubmit: (params) => this.submitJobOnChain(params),
      },
    });

    this.jobExecutor.start(this.agentId);

    // ── Wire up BidLifecycleManager ─────────────────────────────────────

    this.bidLifecycleManager = new BidLifecycleManager({
      pollIntervalMs: this.pollIntervalMs,
      fetchActiveBids: (agentId) => this.fetchActiveBids(agentId),
      getJobStatus: (jobId) => this.getJobStatus(jobId),
      withdrawBid: (params) => this.withdrawBid(params),
      onBidInactive: (params) => this.onBidInactive(params),
      onWorkloadDecrement: (_agentId) => Promise.resolve(),
    });

    this.bidLifecycleManager.start(this.agentId);
  }

  onModuleDestroy(): void {
    if (this.jobExecutor) {
      this.jobExecutor.stop();
      this.jobExecutor = null;
    }
    if (this.bidLifecycleManager) {
      this.bidLifecycleManager.stop();
      this.bidLifecycleManager = null;
    }
  }

  // ── Public API ───────────────────────────────────────────────────────────

  /**
   * Returns the current execution status of both loops.
   */
  getStatus(): {
    enabled: boolean;
    agentId: string;
    executor: ReturnType<JobExecutor['getStatus']> | null;
    bidLifecycle: ReturnType<BidLifecycleManager['getStatus']> | null;
  } {
    return {
      enabled: this.enabled,
      agentId: this.agentId,
      executor: this.jobExecutor?.getStatus() ?? null,
      bidLifecycle: this.bidLifecycleManager?.getStatus() ?? null,
    };
  }

  /**
   * Manually trigger execution for a specific job PDA.
   * @returns The execution result.
   */
  async triggerExecution(jobPda: string): Promise<ExecutionResult> {
    if (!this.jobExecutor) {
      return { success: false, error: 'Job execution not enabled' };
    }

    if (!this.agentId) {
      return { success: false, error: 'No agent ID configured' };
    }

    const row = await this.db.get<AssignedJobRow>(
      `SELECT p.job_pda, p.title, p.description, p.status, p.budget_lamports, p.assigned_agent_pda, p.metadata_json,
              c.confidential_details as confidential_details
         FROM wunderland_job_postings p
         LEFT JOIN wunderland_job_confidential c ON c.job_pda = p.job_pda
        WHERE p.job_pda = ?
        LIMIT 1`,
      [jobPda],
    );

    if (!row) {
      return { success: false, error: 'Job not found' };
    }

    if (row.status !== 'assigned') {
      return {
        success: false,
        error: `Job status is "${row.status}", expected "assigned"`,
      };
    }

    if (!row.assigned_agent_pda || row.assigned_agent_pda !== this.agentId) {
      return {
        success: false,
        error: `Job is assigned to "${row.assigned_agent_pda ?? 'none'}", expected "${this.agentId}"`,
      };
    }

    const category = this.extractCategory(row.metadata_json);
    const job: AssignedJob = {
      id: row.job_pda,
      title: row.title ?? 'Untitled',
      description: row.description ?? '',
      category,
      budgetLamports: Number(row.budget_lamports),
      deadline: null,
      confidentialDetails: decryptSecret(row.confidential_details) ?? row.confidential_details,
    };

    return this.jobExecutor.executeJob(this.agentId, job);
  }

  // ── DB Callbacks: JobExecutor ────────────────────────────────────────────

  /**
   * Fetch jobs assigned to the given agent that have not yet started execution.
   */
  private async fetchAssignedJobs(
    agentId: string,
    limit: number,
  ): Promise<AssignedJob[]> {
    const rows = await this.db.all<AssignedJobRow>(
      `SELECT p.job_pda, p.title, p.description, p.status, p.budget_lamports, p.assigned_agent_pda, p.metadata_json,
              c.confidential_details as confidential_details
         FROM wunderland_job_postings p
         LEFT JOIN wunderland_job_confidential c ON c.job_pda = p.job_pda
        WHERE p.status = 'assigned'
          AND p.assigned_agent_pda = ?
          AND p.execution_started_at IS NULL
        ORDER BY p.created_at ASC
        LIMIT ?`,
      [agentId, limit],
    );

    return rows.map((row) => {
      const category = this.extractCategory(row.metadata_json);
      return {
        id: row.job_pda,
        title: row.title ?? 'Untitled',
        description: row.description ?? '',
        category,
        budgetLamports: Number(row.budget_lamports),
        deadline: null,
        confidentialDetails: decryptSecret(row.confidential_details) ?? row.confidential_details,
      };
    });
  }

  /**
   * Mark a job as started for execution.
   */
  private async onExecutionStart(
    _agentId: string,
    jobId: string,
  ): Promise<void> {
    await this.db.run(
      `UPDATE wunderland_job_postings
          SET execution_started_at = ?
        WHERE job_pda = ?`,
      [Date.now(), jobId],
    );
    this.logger.log(`Execution started for job ${jobId}.`);
  }

  /**
   * Record execution completion (success or failure).
   */
  private async onExecutionComplete(
    _agentId: string,
    jobId: string,
    result: ExecutionResult,
  ): Promise<void> {
    await this.db.run(
      `UPDATE wunderland_job_postings
          SET execution_completed_at = ?,
              execution_error = ?,
              execution_quality_score = ?,
              execution_deliverable_id = ?
        WHERE job_pda = ?`,
      [
        Date.now(),
        result.error ?? null,
        result.qualityScore ?? null,
        result.deliverableId ?? null,
        jobId,
      ],
    );

    if (result.success) {
      this.logger.log(
        `Execution completed for job ${jobId} — quality: ${result.qualityScore?.toFixed(2) ?? 'n/a'}.`,
      );
    } else {
      this.logger.warn(
        `Execution failed for job ${jobId}: ${result.error ?? 'unknown error'}.`,
      );
    }
  }

  // ── DB Callbacks: DeliverableManager ────────────────────────────────────

  /**
   * Persist a deliverable to the database.
   */
  private async persistDeliverable(stored: StoredDeliverable): Promise<void> {
    const now = Date.now();
    await this.db.run(
      `INSERT INTO wunderland_job_deliverables (
        deliverable_id, job_pda, agent_pda, deliverable_type, content,
        mime_type, content_hash, submission_hash, file_size, status,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(deliverable_id) DO UPDATE SET
        status = excluded.status,
        updated_at = excluded.updated_at`,
      [
        stored.deliverableId,
        stored.jobId,
        stored.agentId,
        stored.deliverable.type,
        stored.deliverable.content,
        stored.deliverable.mimeType ?? null,
        stored.contentHash,
        stored.submissionHash,
        stored.fileSize,
        stored.status,
        stored.createdAt,
        now,
      ],
    );
  }

  /**
   * Submit a job on-chain via the Solana service.
   */
  private async submitJobOnChain(params: {
    agentId: string;
    jobId: string;
    submissionHash: string;
  }): Promise<{ success: boolean; signature?: string; error?: string }> {
    const solStatus = this.solService.getStatus();

    if (!solStatus.enabled) {
      this.logger.debug(
        `Solana disabled — skipping on-chain submit for job ${params.jobId}.`,
      );
      return {
        success: true,
        signature: `offline-submit-${params.jobId}-${Date.now()}`,
      };
    }

    // Convert hex submission hash to Buffer (32 bytes)
    const submissionHash = Buffer.from(params.submissionHash, 'hex');

    return this.solService.submitJob({
      seedId: params.agentId,
      jobPdaAddress: params.jobId,
      submissionHash,
    });
  }

  // ── DB Callbacks: BidLifecycleManager ──────────────────────────────────

  /**
   * Fetch active bids for an agent from the DB.
   */
  private async fetchActiveBids(agentId: string): Promise<ActiveBid[]> {
    const rows = await this.db.all<ActiveBidRow>(
      `SELECT bid_pda, job_pda, bidder_agent_pda, bid_lamports, created_at
         FROM wunderland_job_bids
        WHERE bidder_agent_pda = ?
          AND status = 'active'
        ORDER BY created_at ASC`,
      [agentId],
    );

    return rows.map((row) => ({
      bidId: row.bid_pda,
      jobId: row.job_pda,
      agentId: row.bidder_agent_pda,
      amountLamports: Number(row.bid_lamports),
      createdAt: row.created_at,
    }));
  }

  /**
   * Get the current status of a job (for bid lifecycle decisions).
   */
  private async getJobStatus(jobId: string): Promise<BidJobStatus | null> {
    const row = await this.db.get<JobStatusRow>(
      `SELECT status, assigned_agent_pda
         FROM wunderland_job_postings
        WHERE job_pda = ?
        LIMIT 1`,
      [jobId],
    );

    if (!row) return null;

    return {
      status: row.status as BidJobStatus['status'],
      assignedAgent: row.assigned_agent_pda,
    };
  }

  /**
   * Withdraw a bid on-chain (if Solana enabled) and update the DB status.
   */
  private async withdrawBid(params: {
    agentId: string;
    bidId: string;
    jobId: string;
  }): Promise<WithdrawResult> {
    try {
      const solStatus = this.solService.getStatus();
      let signature: string;

      if (solStatus.enabled) {
        // Withdraw bid on-chain via Solana service
        const result = await this.solService.withdrawJobBid({
          seedId: params.agentId,
          jobPdaAddress: params.jobId,
          bidPdaAddress: params.bidId,
        });

        if (!result.success) {
          return { success: false, error: result.error };
        }

        signature = result.signature ?? `withdraw-${params.bidId}-${Date.now()}`;
      } else {
        signature = `offline-withdraw-${params.bidId}-${Date.now()}`;
      }

      // Update DB status after successful on-chain withdrawal (or when Solana is disabled)
      await this.db.run(
        `UPDATE wunderland_job_bids SET status = 'withdrawn' WHERE bid_pda = ?`,
        [params.bidId],
      );

      this.logger.log(
        `Bid ${params.bidId} withdrawn for job ${params.jobId} (sig: ${signature}).`,
      );

      return {
        success: true,
        signature,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, error: msg };
    }
  }

  /**
   * Mark a bid as inactive in the DB (job completed or cancelled).
   */
  private async onBidInactive(params: {
    agentId: string;
    bidId: string;
    jobId: string;
    reason: 'completed' | 'cancelled';
  }): Promise<void> {
    const newStatus =
      params.reason === 'completed' ? 'accepted' : 'withdrawn';
    await this.db.run(
      `UPDATE wunderland_job_bids SET status = ? WHERE bid_pda = ?`,
      [newStatus, params.bidId],
    );
  }

  // ── Helpers ────────────────────────────────────────────────────────────

  /**
   * Extract a category from the job metadata JSON.
   */
  private extractCategory(metadataJson: string | null): string {
    if (!metadataJson) return 'general';
    try {
      const metadata = JSON.parse(metadataJson) as Record<string, unknown>;
      if (typeof metadata.category === 'string') return metadata.category;
    } catch {
      // ignore
    }
    return 'general';
  }
}
