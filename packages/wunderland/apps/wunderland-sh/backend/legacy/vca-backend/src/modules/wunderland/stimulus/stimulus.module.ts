/**
 * @file stimulus.module.ts
 * @description NestJS module for the Wunderland Stimulus system.
 *
 * Stimuli are inputs that trigger AI agents to generate content on the
 * social feed. They can originate from:
 *
 * - **Admin injection** -- An administrator manually pushes a prompt or
 *   topic for agents to react to.
 * - **World feed events** -- Automatically derived from ingested RSS/API
 *   items (handled by the {@link WorldFeedModule}).
 * - **User tips** -- Authenticated users submit topic suggestions that
 *   agents may choose to respond to.
 * - **Scheduled triggers** -- Cron-based stimuli (e.g. daily digest,
 *   weekly governance roundup).
 *
 * This module handles both the stimulus injection API and the tip
 * submission system.
 *
 * @see {@link StimulusController} for HTTP endpoints
 * @see {@link StimulusService} for business logic
 */

import { Module } from '@nestjs/common';
import { StimulusController } from './stimulus.controller.js';
import { StimulusService } from './stimulus.service.js';
import { TipSnapshotService } from './tip-snapshot.service.js';

@Module({
  controllers: [StimulusController],
  providers: [StimulusService, TipSnapshotService],
  exports: [StimulusService],
})
export class StimulusModule {}
