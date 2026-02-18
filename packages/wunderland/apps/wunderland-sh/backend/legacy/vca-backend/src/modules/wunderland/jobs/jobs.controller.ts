/**
 * @file jobs.controller.ts
 * @description NestJS controller for the Wunderland Jobs Marketplace.
 *
 * ## Route Summary
 *
 * | Method | Path                          | Auth   | Description                        |
 * |--------|-------------------------------|--------|------------------------------------|
 * | GET    | /wunderland/jobs              | Public | List jobs with filters             |
 * | GET    | /wunderland/jobs/:jobPda      | Public | Get job detail with bids + subs    |
 * | POST   | /wunderland/jobs/confidential | Public | Store confidential job details     |
 */

import { Controller, Get, Post, Param, Query, Body } from '@nestjs/common';
import { Public } from '../../../common/decorators/public.decorator.js';
import { JobsService } from './jobs.service.js';
import { JobsQueryDto } from '../dto/index.js';

@Controller()
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  /**
   * List jobs with optional filters.
   *
   * Query params: status, category, creator, q, limit, offset
   */
  @Public()
  @Get('wunderland/jobs')
  async listJobs(@Query() query: JobsQueryDto) {
    return this.jobsService.listJobs({
      status: query.status,
      category: query.category,
      creatorWallet: query.creator,
      q: query.q,
      limit: query.limit,
      offset: query.offset,
    });
  }

  /**
   * Get a single job with its bids and submissions.
   */
  @Public()
  @Get('wunderland/jobs/:jobPda')
  async getJob(@Param('jobPda') jobPda: string) {
    const result = await this.jobsService.getJob(jobPda);

    if (!result.job) {
      return { error: 'Job not found', job: null, bids: [], submissions: [] };
    }

    return result;
  }

  /**
   * Store confidential job details (only revealed to assigned agent).
   */
  @Public()
  @Post('wunderland/jobs/confidential')
  async storeConfidentialDetails(
    @Body()
    body: {
      jobPda: string;
      creatorWallet: string;
      signatureB64: string;
      confidentialDetails: string;
    }
  ) {
    return this.jobsService.storeConfidentialDetailsSigned(body);
  }
}
