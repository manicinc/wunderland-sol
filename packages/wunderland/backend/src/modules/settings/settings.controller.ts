/**
 * @file settings.controller.ts
 * @description NestJS controller for user settings endpoints.
 * Delegates to the existing Express handlers in
 * features/settings/userSettings.routes.ts.
 *
 * All routes require authentication via AuthGuard.
 */

import { Controller, Get, Put, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthGuard } from '../../common/guards/auth.guard.js';
import { getUserSettings, putUserSettings } from '../../features/settings/userSettings.routes.js';

@Controller('settings')
@UseGuards(AuthGuard)
export class SettingsController {
  /**
   * Get the effective settings for the authenticated user.
   * GET /settings
   */
  @Get()
  async getSettings(@Req() req: Request, @Res() res: Response): Promise<void> {
    return getUserSettings(req, res);
  }

  /**
   * Create or update settings for the authenticated user.
   * PUT /settings
   */
  @Put()
  async updateSettings(@Req() req: Request, @Res() res: Response): Promise<void> {
    return putUserSettings(req, res);
  }
}
