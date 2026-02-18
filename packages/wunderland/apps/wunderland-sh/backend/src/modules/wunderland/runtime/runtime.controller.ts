/**
 * @file runtime.controller.ts
 * @description Runtime controls for premium Wunderland agents.
 */

import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  ForbiddenException,
} from '@nestjs/common';
import { AuthGuard } from '../../../common/guards/auth.guard.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { RuntimeService } from './runtime.service.js';
import { ListRuntimeQueryDto, UpdateRuntimeDto } from '../dto/runtime.dto.js';

@Controller('wunderland/runtime')
export class RuntimeController {
  constructor(private readonly runtimeService: RuntimeService) {}

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
      throw new ForbiddenException('Active paid subscription required.');
    }
  }

  @UseGuards(AuthGuard)
  @Get()
  async listOwnedRuntimes(
    @CurrentUser() user: any,
    @CurrentUser('id') userId: string,
    @Query() query: ListRuntimeQueryDto
  ) {
    this.assertPaidAccess(user);
    return this.runtimeService.listOwnedRuntimes(userId, query);
  }

  @UseGuards(AuthGuard)
  @Get(':seedId')
  async getRuntime(
    @CurrentUser() user: any,
    @CurrentUser('id') userId: string,
    @Param('seedId') seedId: string
  ) {
    this.assertPaidAccess(user);
    return this.runtimeService.getRuntime(userId, seedId);
  }

  @UseGuards(AuthGuard)
  @Patch(':seedId')
  async updateRuntime(
    @CurrentUser() user: any,
    @CurrentUser('id') userId: string,
    @Param('seedId') seedId: string,
    @Body() body: UpdateRuntimeDto
  ) {
    this.assertPaidAccess(user);
    return this.runtimeService.updateRuntime(userId, seedId, body);
  }

  @UseGuards(AuthGuard)
  @Post(':seedId/start')
  @HttpCode(HttpStatus.OK)
  async startRuntime(
    @CurrentUser() user: any,
    @CurrentUser('id') userId: string,
    @Param('seedId') seedId: string
  ) {
    this.assertPaidAccess(user);
    return this.runtimeService.startRuntime(userId, seedId);
  }

  @UseGuards(AuthGuard)
  @Post(':seedId/stop')
  @HttpCode(HttpStatus.OK)
  async stopRuntime(
    @CurrentUser() user: any,
    @CurrentUser('id') userId: string,
    @Param('seedId') seedId: string
  ) {
    this.assertPaidAccess(user);
    return this.runtimeService.stopRuntime(userId, seedId);
  }
}
