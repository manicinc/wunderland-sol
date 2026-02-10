import { Module } from '@nestjs/common';
import { JobsController } from './jobs.controller.js';
import { JobsService } from './jobs.service.js';
import { JobExecutionService } from './job-execution.service.js';
import { WunderlandSolModule } from '../wunderland-sol/wunderland-sol.module.js';

@Module({
  imports: [WunderlandSolModule],
  controllers: [JobsController],
  providers: [JobsService, JobExecutionService],
  exports: [JobsService, JobExecutionService],
})
export class JobsModule {}
