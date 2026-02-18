/**
 * @file tts.controller.ts
 * @description NestJS controller for text-to-speech endpoints. Delegates to
 * the existing Express route handlers via the passthrough pattern (@Req/@Res)
 * to maintain full API compatibility during the migration.
 *
 * Routes migrated:
 *   POST /tts        -> ttsApiRoutes.POST  (speech synthesis)
 *   GET  /tts/voices -> ttsApiRoutes.GET   (available voice listing)
 *
 * These endpoints use optional auth only (no strict AuthGuard) to match
 * the original Express router configuration.
 */

import { Controller, Post, Get, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { Public } from '../../common/decorators/public.decorator.js';
import * as ttsApiRoutes from '../../features/speech/tts.routes.js';

/**
 * Handles all `/tts` prefixed routes for text-to-speech operations.
 *
 * Authentication is resolved within the Express handlers themselves
 * (via `resolveSessionUserId`), so no strict {@link AuthGuard} is applied.
 */
@Public()
@Controller('tts')
export class TtsController {
  /**
   * POST /tts
   * Synthesizes speech from the provided text using the configured TTS
   * provider. Returns the audio buffer directly with appropriate headers.
   */
  @Post()
  async synthesize(@Req() req: Request, @Res() res: Response): Promise<void> {
    return ttsApiRoutes.POST(req, res);
  }

  /**
   * GET /tts/voices
   * Lists available TTS voices. Optionally filtered by provider via
   * the `providerId` query parameter.
   */
  @Get('voices')
  async listVoices(@Req() req: Request, @Res() res: Response): Promise<void> {
    return ttsApiRoutes.GET(req, res);
  }
}
