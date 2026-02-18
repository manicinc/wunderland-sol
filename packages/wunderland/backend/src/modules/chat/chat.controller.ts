/**
 * @file chat.controller.ts
 * @description NestJS controllers for chat and diagram endpoints. Delegates to
 * the existing Express route handlers via the passthrough pattern (@Req/@Res)
 * to maintain full API compatibility during the migration.
 *
 * Routes migrated:
 *   POST /chat           -> chatApiRoutes.POST
 *   POST /chat/persona   -> chatApiRoutes.POST_PERSONA
 *   POST /chat/detect-language -> postDetectLanguage
 *   POST /diagram        -> chatApiRoutes.POST  (shared handler)
 *
 * All chat routes use optional auth only (no strict AuthGuard) to match
 * the original Express router configuration.
 */

import { Controller, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { Public } from '../../common/decorators/public.decorator.js';
import * as chatApiRoutes from '../../features/chat/chat.routes.js';
import { postDetectLanguage } from '../../features/chat/language.routes.js';

/**
 * Handles all `/chat` prefixed routes.
 *
 * These endpoints rely on optional authentication resolved within the
 * Express handlers themselves (via `resolveSessionUserId`), so no strict
 * {@link AuthGuard} is applied.
 */
@Public()
@Controller('chat')
export class ChatController {
  /**
   * POST /chat
   * Main chat completion endpoint. Processes user messages through the
   * Context Aggregator and agent LLM pipeline.
   */
  @Post()
  async chat(@Req() req: Request, @Res() res: Response): Promise<void> {
    return chatApiRoutes.POST(req, res);
  }

  /**
   * POST /chat/persona
   * Sets or clears a custom persona override for a conversation.
   */
  @Post('persona')
  async setPersona(@Req() req: Request, @Res() res: Response): Promise<void> {
    return chatApiRoutes.POST_PERSONA(req, res);
  }

  /**
   * POST /chat/detect-language
   * Detects the predominant language of a conversation snippet using an LLM.
   */
  @Post('detect-language')
  async detectLanguage(@Req() req: Request, @Res() res: Response): Promise<void> {
    return postDetectLanguage(req, res);
  }
}

/**
 * Handles the `/diagram` route.
 *
 * The diagram endpoint shares the same underlying handler as the main chat
 * endpoint (`chatApiRoutes.POST`) in the original Express router.
 */
@Public()
@Controller('diagram')
export class DiagramController {
  /**
   * POST /diagram
   * Generates a diagram from a textual description. Uses the same handler
   * as `POST /chat` in the original Express configuration.
   */
  @Post()
  async createDiagram(@Req() req: Request, @Res() res: Response): Promise<void> {
    return chatApiRoutes.POST(req, res);
  }
}
