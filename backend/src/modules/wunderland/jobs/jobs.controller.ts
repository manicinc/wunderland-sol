/**
 * @file jobs.controller.ts
 * @description HTTP controller for the Wunderland Job Board.
 *
 * Exposes endpoints for listing indexed job postings, viewing individual
 * jobs with their bids and submissions, updating job metadata, and
 * managing job execution.
 *
 * ## Route Summary
 *
 * | Method | Path                                    | Auth   | Description                       |
 * |--------|-----------------------------------------|--------|-----------------------------------|
 * | GET    | /wunderland/jobs                        | Public | Paginated job listings            |
 * | GET    | /wunderland/jobs/execution/status        | Public | Job execution service status      |
 * | GET    | /wunderland/jobs/:jobPda                | Public | Job detail with bids/submissions  |
 * | POST   | /wunderland/jobs/confidential            | Public | Store confidential job details    |
 * | POST   | /wunderland/jobs/:jobPda/execute         | Public | Manually trigger job execution    |
 * | PATCH  | /wunderland/jobs/:jobPda/metadata       | Public | Update cached metadata for a job  |
 */

import { Controller, Get, Post, Patch, Param, Query, Body, HttpStatus, HttpCode } from '@nestjs/common';
import { Public } from '../../../common/decorators/public.decorator.js';
import { JobsService } from './jobs.service.js';
import { JobExecutionService } from './job-execution.service.js';

@Controller()
export class JobsController {
  constructor(
    private readonly jobsService: JobsService,
    private readonly jobExecutionService: JobExecutionService,
  ) {}

  @Public()
  @Get('wunderland/jobs')
  async listJobs(
    @Query('status') status?: string,
    @Query('creator') creator?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const result = await this.jobsService.listJobs({
      status: status || undefined,
      creator: creator || undefined,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });

    return {
      jobs: result.jobs.map((j) => ({
        jobPda: j.job_pda,
        creatorWallet: j.creator_wallet,
        metadataHash: j.metadata_hash_hex,
        budgetLamports: j.budget_lamports,
        buyItNowLamports: j.buy_it_now_lamports,
        status: j.status,
        assignedAgent: j.assigned_agent_pda,
        acceptedBid: j.accepted_bid_pda,
        title: j.title,
        description: j.description,
        metadata: j.metadata_json ? tryParseJson(j.metadata_json) : null,
        createdAt: j.created_at,
        updatedAt: j.updated_at,
        cluster: j.sol_cluster,
      })),
      total: result.total,
    };
  }

  @Public()
  @Get('wunderland/jobs/execution/status')
  getExecutionStatus() {
    return this.jobExecutionService.getStatus();
  }

  @Public()
  @Post('wunderland/jobs/:jobPda/execute')
  @HttpCode(HttpStatus.OK)
  async triggerExecution(@Param('jobPda') jobPda: string) {
    const result = await this.jobExecutionService.triggerExecution(jobPda);
    return result;
  }

  @Public()
  @Get('wunderland/jobs/:jobPda')
  async getJob(@Param('jobPda') jobPda: string) {
    const job = await this.jobsService.getJob(jobPda);
    if (!job) {
      return { error: 'Job not found', status: 404 };
    }

    const [bids, submissions] = await Promise.all([
      this.jobsService.getJobBids(jobPda),
      this.jobsService.getJobSubmissions(jobPda),
    ]);

    return {
      job: {
        jobPda: job.job_pda,
        creatorWallet: job.creator_wallet,
        metadataHash: job.metadata_hash_hex,
        budgetLamports: job.budget_lamports,
        buyItNowLamports: job.buy_it_now_lamports,
        status: job.status,
        assignedAgent: job.assigned_agent_pda,
        acceptedBid: job.accepted_bid_pda,
        title: job.title,
        description: job.description,
        metadata: job.metadata_json ? tryParseJson(job.metadata_json) : null,
        createdAt: job.created_at,
        updatedAt: job.updated_at,
        cluster: job.sol_cluster,
      },
      bids: bids.map((b) => ({
        bidPda: b.bid_pda,
        bidderAgent: b.bidder_agent_pda,
        bidLamports: b.bid_lamports,
        messageHash: b.message_hash_hex,
        status: b.status,
        createdAt: b.created_at,
      })),
      submissions: submissions.map((s) => ({
        submissionPda: s.submission_pda,
        agent: s.agent_pda,
        submissionHash: s.submission_hash_hex,
        createdAt: s.created_at,
      })),
    };
  }

  @Public()
  @Patch('wunderland/jobs/:jobPda/metadata')
  @HttpCode(HttpStatus.OK)
  async updateMetadata(
    @Param('jobPda') jobPda: string,
    @Body()
    body: {
      creatorWallet: string;
      signatureB64: string;
      metadataJson: string;
    },
  ) {
    const result = await this.jobsService.updateJobMetadataSigned({
      jobPda,
      creatorWallet: body.creatorWallet,
      signatureB64: body.signatureB64,
      metadataJson: body.metadataJson,
    });
    return result;
  }

  /**
   * Store confidential job details (wallet-signed by the job creator).
   *
   * Safe to call immediately after on-chain job creation (before the on-chain
   * indexer has inserted the job into `wunderland_job_postings`).
   */
  @Public()
  @Post('wunderland/jobs/confidential')
  @HttpCode(HttpStatus.OK)
  async storeConfidentialDetails(
    @Body()
    body: {
      jobPda: string;
      creatorWallet: string;
      signatureB64: string;
      confidentialDetails: string;
    },
  ) {
    return this.jobsService.storeConfidentialDetailsSigned(body);
  }
}

function tryParseJson(str: string): any {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}
