// File: backend/src/modules/support/support.module.ts
/**
 * @file support.module.ts
 * @description NestJS module for the support ticket system.
 */

import { Module } from '@nestjs/common';
import { SupportController } from './support.controller.js';
import { SupportService } from './support.service.js';
import { AnonymizationService } from './anonymization.service.js';

@Module({
  controllers: [SupportController],
  providers: [SupportService, AnonymizationService],
  exports: [SupportService],
})
export class SupportModule {}
