/**
 * @file channels.controller.ts
 * @description REST API for managing agent channel bindings and sessions.
 *
 * Routes:
 *   GET    /wunderland/channels                    - List bindings
 *   GET    /wunderland/channels/:bindingId         - Get binding
 *   POST   /wunderland/channels                    - Create binding
 *   PATCH  /wunderland/channels/:bindingId         - Update binding
 *   DELETE /wunderland/channels/:bindingId         - Delete binding
 *   GET    /wunderland/channels/sessions           - List sessions
 *   GET    /wunderland/channels/sessions/:sessionId - Get session
 *   GET    /wunderland/channels/stats              - Channel statistics
 */

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ForbiddenException,
} from '@nestjs/common';
import { AuthGuard } from '../../../common/guards/auth.guard.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { ChannelsService } from './channels.service.js';
import {
  CreateChannelBindingDto,
  UpdateChannelBindingDto,
  ListChannelBindingsQueryDto,
  ListChannelSessionsQueryDto,
} from '../dto/channels.dto.js';

@Controller('wunderland/channels')
export class ChannelsController {
  constructor(private readonly channelsService: ChannelsService) {}

  private assertPaidAccess(user: any): void {
    const status = user?.subscriptionStatus ?? user?.subscription_status;
    const isPaid = status === 'active' || status === 'trialing' || user?.role === 'admin';
    if (!isPaid) {
      throw new ForbiddenException('Active paid subscription required for channel management.');
    }
  }

  // ── Bindings ──

  @UseGuards(AuthGuard)
  @Get()
  async listBindings(
    @CurrentUser() user: any,
    @CurrentUser('id') userId: string,
    @Query() query: ListChannelBindingsQueryDto
  ) {
    this.assertPaidAccess(user);
    return this.channelsService.listBindings(userId, query);
  }

  @UseGuards(AuthGuard)
  @Get('stats')
  async getStats(
    @CurrentUser() user: any,
    @CurrentUser('id') userId: string,
    @Query('seedId') seedId?: string
  ) {
    this.assertPaidAccess(user);
    return this.channelsService.getChannelStats(userId, seedId);
  }

  @UseGuards(AuthGuard)
  @Get('sessions')
  async listSessions(
    @CurrentUser() user: any,
    @CurrentUser('id') userId: string,
    @Query() query: ListChannelSessionsQueryDto
  ) {
    this.assertPaidAccess(user);
    return this.channelsService.listSessions(userId, query);
  }

  @UseGuards(AuthGuard)
  @Get('sessions/:sessionId')
  async getSession(
    @CurrentUser() user: any,
    @CurrentUser('id') userId: string,
    @Param('sessionId') sessionId: string
  ) {
    this.assertPaidAccess(user);
    return this.channelsService.getSession(userId, sessionId);
  }

  @UseGuards(AuthGuard)
  @Get(':bindingId')
  async getBinding(
    @CurrentUser() user: any,
    @CurrentUser('id') userId: string,
    @Param('bindingId') bindingId: string
  ) {
    this.assertPaidAccess(user);
    return this.channelsService.getBinding(userId, bindingId);
  }

  @UseGuards(AuthGuard)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createBinding(
    @CurrentUser() user: any,
    @CurrentUser('id') userId: string,
    @Body() body: CreateChannelBindingDto
  ) {
    this.assertPaidAccess(user);
    return this.channelsService.createBinding(userId, body);
  }

  @UseGuards(AuthGuard)
  @Patch(':bindingId')
  async updateBinding(
    @CurrentUser() user: any,
    @CurrentUser('id') userId: string,
    @Param('bindingId') bindingId: string,
    @Body() body: UpdateChannelBindingDto
  ) {
    this.assertPaidAccess(user);
    return this.channelsService.updateBinding(userId, bindingId, body);
  }

  @UseGuards(AuthGuard)
  @Delete(':bindingId')
  async deleteBinding(
    @CurrentUser() user: any,
    @CurrentUser('id') userId: string,
    @Param('bindingId') bindingId: string
  ) {
    this.assertPaidAccess(user);
    return this.channelsService.deleteBinding(userId, bindingId);
  }
}
