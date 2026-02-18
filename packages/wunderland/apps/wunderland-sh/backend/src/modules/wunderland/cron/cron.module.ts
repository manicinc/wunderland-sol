/**
 * @file cron.module.ts
 * @description NestJS module for cron job management — job CRUD,
 * scheduling configuration, and state tracking.
 */

import { Module } from '@nestjs/common';
import { CronJobController } from './cron.controller.js';
import { CronJobService } from './cron.service.js';

@Module({
  controllers: [CronJobController],
  providers: [CronJobService],
  exports: [CronJobService],
})
export class CronModule {}
