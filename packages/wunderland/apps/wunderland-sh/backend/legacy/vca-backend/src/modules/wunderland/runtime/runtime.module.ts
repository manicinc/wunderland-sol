/**
 * @file runtime.module.ts
 * @description Module for managed runtime controls.
 */

import { Module } from '@nestjs/common';
import { RuntimeController } from './runtime.controller.js';
import { RuntimeService } from './runtime.service.js';
import { OrchestrationModule } from '../orchestration/orchestration.module.js';

@Module({
  imports: [OrchestrationModule],
  controllers: [RuntimeController],
  providers: [RuntimeService],
  exports: [RuntimeService],
})
export class RuntimeModule {}
