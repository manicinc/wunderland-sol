/**
 * @file cron.controller.ts
 * @description REST endpoints for cron job management.
 *
 * Routes:
 *   POST   /wunderland/cron          — Create a new cron job
 *   GET    /wunderland/cron          — List cron jobs for current user
 *   GET    /wunderland/cron/:jobId   — Get a specific cron job
 *   PATCH  /wunderland/cron/:jobId   — Update a cron job
 *   DELETE /wunderland/cron/:jobId   — Delete a cron job
 *   POST   /wunderland/cron/:jobId/toggle — Toggle cron job enabled/disabled
 */

import {
  Controller,
  Get, Post, Patch, Delete,
  Param, Body, Query,
  UseGuards, HttpCode, HttpStatus,
  ForbiddenException,
} from '@nestjs/common';
import { AuthGuard } from '../../../common/guards/auth.guard.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { CronJobService } from './cron.service.js';
import { CreateCronJobDto, UpdateCronJobDto, ListCronJobsQueryDto, ToggleCronJobDto } from '../dto/cron.dto.js';

@Controller('wunderland/cron')
export class CronJobController {
  constructor(private readonly cronJobService: CronJobService) {}

  private assertPaidAccess(user: any): void {
    const status = user?.subscriptionStatus ?? user?.subscription_status;
    const isPaid = status === 'active' || status === 'trialing' || user?.role === 'admin';
    if (!isPaid) {
      throw new ForbiddenException(
        'Active paid subscription required for cron job features.',
      );
    }
  }

  // ── Create Job ──

  @UseGuards(AuthGuard)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createJob(
    @CurrentUser() user: any,
    @CurrentUser('id') userId: string,
    @Body() body: CreateCronJobDto,
  ) {
    this.assertPaidAccess(user);
    return this.cronJobService.createJob(userId, body);
  }

  // ── List Jobs ──

  @UseGuards(AuthGuard)
  @Get()
  async listJobs(
    @CurrentUser() user: any,
    @CurrentUser('id') userId: string,
    @Query() query: ListCronJobsQueryDto,
  ) {
    this.assertPaidAccess(user);
    return this.cronJobService.listJobs(userId, query);
  }

  // ── Get Job ──

  @UseGuards(AuthGuard)
  @Get(':jobId')
  async getJob(
    @CurrentUser() user: any,
    @CurrentUser('id') userId: string,
    @Param('jobId') jobId: string,
  ) {
    this.assertPaidAccess(user);
    return this.cronJobService.getJob(userId, jobId);
  }

  // ── Update Job ──

  @UseGuards(AuthGuard)
  @Patch(':jobId')
  async updateJob(
    @CurrentUser() user: any,
    @CurrentUser('id') userId: string,
    @Param('jobId') jobId: string,
    @Body() body: UpdateCronJobDto,
  ) {
    this.assertPaidAccess(user);
    return this.cronJobService.updateJob(userId, jobId, body);
  }

  // ── Delete Job ──

  @UseGuards(AuthGuard)
  @Delete(':jobId')
  async deleteJob(
    @CurrentUser() user: any,
    @CurrentUser('id') userId: string,
    @Param('jobId') jobId: string,
  ) {
    this.assertPaidAccess(user);
    return this.cronJobService.deleteJob(userId, jobId);
  }

  // ── Toggle Job ──

  @UseGuards(AuthGuard)
  @Post(':jobId/toggle')
  async toggleJob(
    @CurrentUser() user: any,
    @CurrentUser('id') userId: string,
    @Param('jobId') jobId: string,
    @Body() body: ToggleCronJobDto,
  ) {
    this.assertPaidAccess(user);
    return this.cronJobService.toggleJob(userId, jobId, body.enabled);
  }
}
