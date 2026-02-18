/**
 * @file cost.controller.ts
 * @description NestJS controller for cost tracking endpoints. Delegates to
 * the existing Express route handlers via the passthrough pattern (@Req/@Res)
 * to maintain full API compatibility during the migration.
 *
 * Routes migrated:
 *   GET  /cost -> costApiRoutes.GET   (retrieve session cost details)
 *   POST /cost -> costApiRoutes.POST  (reset session cost or global cost)
 *
 * Both endpoints require authentication via {@link AuthGuard}.
 */

import { Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthGuard } from '../../common/guards/auth.guard.js';
import * as costApiRoutes from '../../features/cost/cost.routes.js';

/**
 * Handles all `/cost` prefixed routes for session and global cost management.
 *
 * All endpoints require authentication via {@link AuthGuard} to match
 * the original Express router configuration.
 */
@UseGuards(AuthGuard)
@Controller('cost')
export class CostController {
  /**
   * GET /cost
   * Returns current session cost details including per-service breakdown,
   * global monthly cost, and threshold status.
   */
  @Get()
  async getCost(@Req() req: Request, @Res() res: Response): Promise<void> {
    return costApiRoutes.GET(req, res);
  }

  /**
   * POST /cost
   * Performs cost management actions. Supported actions:
   * - `reset`: Resets session cost for the target user.
   * - `reset_global`: Resets global monthly cost (development only).
   */
  @Post()
  async postCost(@Req() req: Request, @Res() res: Response): Promise<void> {
    return costApiRoutes.POST(req, res);
  }
}
