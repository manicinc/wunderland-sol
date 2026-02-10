/**
 * @file jobs.module.ts
 * @description NestJS module for the Wunderland Jobs Marketplace.
 *
 * Indexes on-chain job postings, bids, and submissions into SQLite
 * for fast querying. Provides REST endpoints for listing and viewing jobs.
 *
 * @see {@link JobsController} for HTTP endpoints
 * @see {@link JobsService} for business logic and indexing
 */

import { Module } from '@nestjs/common';
import { JobsController } from './jobs.controller.js';
import { JobsService } from './jobs.service.js';
import { JobScannerService } from './job-scanner.service.js';
import { OrchestrationModule } from '../orchestration/orchestration.module.js';
import { WunderlandSolModule } from '../wunderland-sol/wunderland-sol.module.js';

@Module({
  imports: [OrchestrationModule, WunderlandSolModule],
  controllers: [JobsController],
  providers: [JobsService, JobScannerService],
  exports: [JobsService, JobScannerService],
})
export class JobsModule {}
