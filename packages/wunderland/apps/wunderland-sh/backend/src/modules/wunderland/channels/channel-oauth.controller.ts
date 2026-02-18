/**
 * @file channel-oauth.controller.ts
 * @description REST endpoints for channel OAuth lifecycle and guided setup.
 */

import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  Req,
  UseGuards,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthGuard } from '../../../common/guards/auth.guard.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { ChannelOAuthService } from './channel-oauth.service.js';
import { ChannelOAuthCallbackDto, TelegramSetupDto } from '../dto/channel-oauth.dto.js';

@Controller('wunderland/channels/oauth')
export class ChannelOAuthController {
  constructor(private readonly oauthService: ChannelOAuthService) {}

  private assertPaidAccess(user: any): void {
    const status = user?.subscriptionStatus ?? user?.subscription_status;
    const isPaid = status === 'active' || status === 'trialing' || user?.role === 'admin';
    if (!isPaid) {
      throw new ForbiddenException('Active paid subscription required for channel management.');
    }
  }

  private assertInternalSecret(req: Request): void {
    const expected = process.env.INTERNAL_API_SECRET || '';
    if (!expected) {
      throw new ForbiddenException('Internal API secret is not configured.');
    }
    const provided = String(req.headers['x-internal-secret'] || '');
    if (!provided || provided !== expected) {
      throw new ForbiddenException('Forbidden.');
    }
  }

  @UseGuards(AuthGuard)
  @Get('slack/initiate')
  async initiateSlack(
    @CurrentUser() user: any,
    @CurrentUser('id') userId: string,
    @Query('seedId') seedId?: string
  ) {
    this.assertPaidAccess(user);
    if (!seedId) throw new BadRequestException('seedId query parameter is required.');
    return this.oauthService.initiateSlackOAuth(userId, seedId);
  }

  @UseGuards(AuthGuard)
  @Get('discord/initiate')
  async initiateDiscord(
    @CurrentUser() user: any,
    @CurrentUser('id') userId: string,
    @Query('seedId') seedId?: string
  ) {
    this.assertPaidAccess(user);
    if (!seedId) throw new BadRequestException('seedId query parameter is required.');
    return this.oauthService.initiateDiscordOAuth(userId, seedId);
  }

  @Post('slack/callback')
  async slackCallback(@Req() req: Request, @Body() body: ChannelOAuthCallbackDto) {
    this.assertInternalSecret(req);
    return this.oauthService.handleSlackCallback(body.code, body.state);
  }

  @Post('discord/callback')
  async discordCallback(@Req() req: Request, @Body() body: ChannelOAuthCallbackDto) {
    this.assertInternalSecret(req);
    return this.oauthService.handleDiscordCallback(body.code, body.state);
  }

  @UseGuards(AuthGuard)
  @Post('telegram/setup')
  async setupTelegram(
    @CurrentUser() user: any,
    @CurrentUser('id') userId: string,
    @Body() body: TelegramSetupDto
  ) {
    this.assertPaidAccess(user);
    return this.oauthService.setupTelegramBot(userId, body.seedId, body.botToken);
  }

  @UseGuards(AuthGuard)
  @Get(':platform/status')
  async getStatus(
    @CurrentUser('id') userId: string,
    @Param('platform') platform: string,
    @Query('seedId') seedId?: string
  ) {
    if (!seedId) throw new BadRequestException('seedId query parameter is required.');
    return this.oauthService.getConnectionStatus(userId, seedId, platform);
  }

  @UseGuards(AuthGuard)
  @Delete(':platform/disconnect')
  async disconnect(
    @CurrentUser() user: any,
    @CurrentUser('id') userId: string,
    @Param('platform') platform: string,
    @Query('seedId') seedId?: string
  ) {
    this.assertPaidAccess(user);
    if (!seedId) throw new BadRequestException('seedId query parameter is required.');
    return this.oauthService.disconnectChannel(userId, seedId, platform);
  }
}
