/**
 * @file system.module.ts
 * @description NestJS module for system-level endpoints: health, LLM status,
 * storage status, prompt serving, and test diagnostics.
 */

import { Module } from '@nestjs/common';
import {
  HealthController,
  SystemController,
  PromptsController,
  TestController,
} from './system.controller.js';

@Module({
  controllers: [HealthController, SystemController, PromptsController, TestController],
})
export class SystemModule {}
