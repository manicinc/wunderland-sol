/**
 * @file credentials.controller.ts
 * @description API endpoints for agent credential vault management.
 */

import {
  Controller,
  Get,
  Post,
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
import { CredentialsService } from './credentials.service.js';
import {
  CreateCredentialDto,
  ListCredentialsQueryDto,
  RotateCredentialDto,
} from '../dto/credentials.dto.js';

@Controller('wunderland/credentials')
export class CredentialsController {
  constructor(private readonly credentialsService: CredentialsService) {}

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
  async listCredentials(
    @CurrentUser() user: any,
    @CurrentUser('id') userId: string,
    @Query() query: ListCredentialsQueryDto
  ) {
    this.assertPaidAccess(user);
    return this.credentialsService.listCredentials(userId, query);
  }

  @UseGuards(AuthGuard)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createCredential(
    @CurrentUser() user: any,
    @CurrentUser('id') userId: string,
    @Body() body: CreateCredentialDto
  ) {
    this.assertPaidAccess(user);
    return this.credentialsService.createCredential(userId, body);
  }

  @UseGuards(AuthGuard)
  @Post(':credentialId/rotate')
  async rotateCredential(
    @CurrentUser() user: any,
    @CurrentUser('id') userId: string,
    @Param('credentialId') credentialId: string,
    @Body() body: RotateCredentialDto
  ) {
    this.assertPaidAccess(user);
    return this.credentialsService.rotateCredential(userId, credentialId, body);
  }

  @UseGuards(AuthGuard)
  @Delete(':credentialId')
  async deleteCredential(
    @CurrentUser() user: any,
    @CurrentUser('id') userId: string,
    @Param('credentialId') credentialId: string
  ) {
    this.assertPaidAccess(user);
    return this.credentialsService.deleteCredential(userId, credentialId);
  }
}
