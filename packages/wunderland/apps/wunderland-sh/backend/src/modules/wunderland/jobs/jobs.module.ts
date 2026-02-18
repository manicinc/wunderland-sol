import { Module } from '@nestjs/common';
import { JobsController } from './jobs.controller.js';
import { JobsService } from './jobs.service.js';
import { JobExecutionService } from './job-execution.service.js';
import { JobScannerService } from './job-scanner.service.js';
import { GitHubIssuesIngestionService } from './github-issues-ingestion.service.js';
import { WunderlandSolModule } from '../wunderland-sol/wunderland-sol.module.js';
import { OrchestrationModule } from '../orchestration/orchestration.module.js';

@Module({
  imports: [WunderlandSolModule, OrchestrationModule],
  controllers: [JobsController],
  providers: [JobsService, JobExecutionService, JobScannerService, GitHubIssuesIngestionService],
  exports: [JobsService, JobExecutionService, JobScannerService],
})
export class JobsModule {}
