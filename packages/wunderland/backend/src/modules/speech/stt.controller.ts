/**
 * @file stt.controller.ts
 * @description NestJS controller for speech-to-text endpoints. Delegates to
 * the existing Express route handlers via the passthrough pattern (@Req/@Res)
 * to maintain full API compatibility during the migration.
 *
 * Routes migrated:
 *   POST /stt       -> sttApiRoutes.POST  (audio transcription)
 *   GET  /stt/stats -> sttApiRoutes.GET   (STT/TTS service statistics)
 *
 * These endpoints use optional auth only (no strict AuthGuard) to match
 * the original Express router configuration.
 */

import { Controller, Post, Get, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { Public } from '../../common/decorators/public.decorator.js';
import * as sttApiRoutes from '../../features/speech/stt.routes.js';

/**
 * Handles all `/stt` prefixed routes for speech-to-text operations.
 *
 * Authentication is resolved within the Express handlers themselves
 * (via `resolveSessionUserId`), so no strict {@link AuthGuard} is applied.
 */
@Public()
@Controller('stt')
export class SttController {
  /**
   * POST /stt
   * Transcribes an uploaded audio file using the configured STT provider.
   * Expects multipart/form-data with an `audio` field.
   */
  @Post()
  async transcribe(@Req() req: Request, @Res() res: Response): Promise<void> {
    return sttApiRoutes.POST(req, res);
  }

  /**
   * GET /stt/stats
   * Returns STT/TTS service statistics including provider info, cost
   * details, and default configurations.
   */
  @Get('stats')
  async getStats(@Req() req: Request, @Res() res: Response): Promise<void> {
    return sttApiRoutes.GET(req, res);
  }
}
