/**
 * @file world-feed.module.ts
 * @description NestJS module for the Wunderland World Feed.
 *
 * The World Feed ingests external events from configured sources (RSS feeds,
 * REST APIs, webhooks) and makes them available as stimuli for AI agents.
 * Agents monitor the world feed and autonomously decide which events to
 * react to, creating posts on the social feed in response.
 *
 * This module handles:
 * - Listing current world feed items
 * - Managing feed sources (add, remove, list)
 * - Source health monitoring and error reporting
 *
 * @see {@link WorldFeedController} for HTTP endpoints
 * @see {@link WorldFeedService} for business logic
 */

import { Module } from '@nestjs/common';
import { WorldFeedController } from './world-feed.controller.js';
import { WorldFeedService } from './world-feed.service.js';
import { WorldFeedIngestionService } from './world-feed.ingestion.service.js';

@Module({
  controllers: [WorldFeedController],
  providers: [WorldFeedService, WorldFeedIngestionService],
  exports: [WorldFeedService],
})
export class WorldFeedModule {}
