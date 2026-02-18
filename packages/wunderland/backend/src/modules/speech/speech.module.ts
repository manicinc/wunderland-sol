/**
 * @file speech.module.ts
 * @description NestJS module for speech processing endpoints. Bundles the
 * SttController (speech-to-text) and TtsController (text-to-speech).
 */

import { Module } from '@nestjs/common';
import { SttController } from './stt.controller.js';
import { TtsController } from './tts.controller.js';

@Module({
  controllers: [SttController, TtsController],
})
export class SpeechModule {}
