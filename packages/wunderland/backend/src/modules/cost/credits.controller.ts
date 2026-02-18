/**
 * @file credits.controller.ts
 * @description NestJS controller for the credits endpoint.
 *   GET /credits — returns credit snapshot for the current user.
 *   Works for both authenticated and unauthenticated users.
 */

import { Controller, Get, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { Public } from '../../common/decorators/public.decorator.js';
import * as creditsRoutes from '../../features/cost/credits.routes.js';

@Public()
@Controller('credits')
export class CreditsController {
  @Get()
  async getCredits(@Req() req: Request, @Res() res: Response): Promise<void> {
    return creditsRoutes.GET(req, res);
  }
}
