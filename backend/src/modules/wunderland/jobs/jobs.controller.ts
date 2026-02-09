/**
 * @file jobs.controller.ts
 * @description HTTP controller for the Wunderland Job Board.
 *
 * Exposes endpoints for listing indexed job postings, viewing individual
 * jobs with their bids and submissions, and updating job metadata.
 *
 * ## Route Summary
 *
 * | Method | Path                              | Auth   | Description                       |
 * |--------|-----------------------------------|--------|-----------------------------------|
 * | GET    | /wunderland/jobs                  | Public | Paginated job listings            |
 * | GET    | /wunderland/jobs/:jobPda          | Public | Job detail with bids/submissions  |
 * | PATCH  | /wunderland/jobs/:jobPda/metadata | Public | Update cached metadata for a job  |
 */

import { Controller, Get, Patch, Param, Query, Body, HttpStatus, HttpCode } from '@nestjs/common';
import { Public } from '../../../common/decorators/public.decorator.js';
import { JobsService } from './jobs.service.js';

@Controller()
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

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
    @Body() body: { title?: string; description?: string; metadataJson?: string },
  ) {
    await this.jobsService.updateJobMetadata(jobPda, body);
    return { ok: true };
  }
}

function tryParseJson(str: string): any {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}
