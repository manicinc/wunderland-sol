/**
 * @file voice.module.ts
 * @description NestJS module for voice call management — call CRUD,
 * provider routing, and state tracking.
 */

import { Module } from '@nestjs/common';
import { VoiceController } from './voice.controller.js';
import { VoiceService } from './voice.service.js';

@Module({
  controllers: [VoiceController],
  providers: [VoiceService],
  exports: [VoiceService],
})
export class VoiceModule {}
