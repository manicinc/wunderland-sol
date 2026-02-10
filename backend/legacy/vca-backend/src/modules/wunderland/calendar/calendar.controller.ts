/**
 * @file calendar.controller.ts
 * @description REST endpoints for Google Calendar OAuth and integration management.
 *
 * Routes:
 *   GET    /wunderland/calendar/auth      — Start OAuth flow
 *   GET    /wunderland/calendar/callback   — OAuth callback handler
 *   GET    /wunderland/calendar/status     — Check calendar connection status
 *   DELETE /wunderland/calendar/revoke     — Revoke calendar access
 */

import {
  Controller,
  Get,
  Delete,
  Query,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { AuthGuard } from '../../../common/guards/auth.guard.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { CalendarService } from './calendar.service.js';
import type { CalendarOAuthCallbackDto } from '../dto/calendar.dto.js';

@Controller('wunderland/calendar')
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  private assertPaidAccess(user: any): void {
    const status =
      (typeof user?.subscriptionStatus === 'string' && user.subscriptionStatus) ||
      (typeof user?.subscription_status === 'string' && user.subscription_status) ||
      '';
    const tier = typeof user?.tier === 'string' ? user.tier : '';
    const mode = typeof user?.mode === 'string' ? user.mode : '';
    const isPaid =
      mode === 'global' ||
      tier === 'unlimited' ||
      status === 'active' ||
      status === 'trialing' ||
      status === 'unlimited';
    if (!isPaid) {
      throw new ForbiddenException('Active paid subscription required for calendar features.');
    }
  }

  // ── Start OAuth Flow ──

  @UseGuards(AuthGuard)
  @Get('auth')
  async startOAuth(
    @CurrentUser() user: any,
    @CurrentUser('id') userId: string,
    @Query('seedId') seedId: string,
  ) {
    this.assertPaidAccess(user);
    return this.calendarService.getOAuthUrl(userId, seedId);
  }

  // ── OAuth Callback ──

  @UseGuards(AuthGuard)
  @Get('callback')
  async oauthCallback(
    @CurrentUser() user: any,
    @CurrentUser('id') userId: string,
    @Query() query: CalendarOAuthCallbackDto,
  ) {
    this.assertPaidAccess(user);
    return this.calendarService.handleOAuthCallback(userId, query.code, query.state);
  }

  // ── Connection Status ──

  @UseGuards(AuthGuard)
  @Get('status')
  async getStatus(
    @CurrentUser() user: any,
    @CurrentUser('id') userId: string,
    @Query('seedId') seedId: string,
  ) {
    this.assertPaidAccess(user);
    return this.calendarService.getCalendarStatus(userId, seedId);
  }

  // ── Revoke Access ──

  @UseGuards(AuthGuard)
  @Delete('revoke')
  async revokeAccess(
    @CurrentUser() user: any,
    @CurrentUser('id') userId: string,
    @Query('seedId') seedId: string,
  ) {
    this.assertPaidAccess(user);
    return this.calendarService.revokeAccess(userId, seedId);
  }
}
