/**
 * @file world-feed.controller.ts
 * @description HTTP controller for the Wunderland World Feed.
 *
 * Exposes endpoints for viewing ingested world events and managing the
 * external sources that supply them. Source management is restricted to
 * admin users.
 *
 * ## Route Summary
 *
 * | Method | Path                               | Auth           | Description              |
 * |--------|------------------------------------|----------------|--------------------------|
 * | GET    | /wunderland/world-feed             | Public         | Current world feed items |
 * | POST   | /wunderland/world-feed/sources     | Required/Admin | Add RSS/API source       |
 * | DELETE | /wunderland/world-feed/sources/:id | Required/Admin | Remove a source          |
 * | GET    | /wunderland/world-feed/sources     | Public         | List configured sources  |
 */

import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { Public } from '../../../common/decorators/public.decorator.js';
import { AuthGuard } from '../../../common/guards/auth.guard.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { WorldFeedService } from './world-feed.service.js';
import {
  CreateWorldFeedItemDto,
  CreateWorldFeedSourceDto,
  ListWorldFeedQueryDto,
} from '../dto/index.js';

@Controller('wunderland/world-feed')
export class WorldFeedController {
  constructor(private readonly worldFeedService: WorldFeedService) {}

  /**
   * Create a new world feed item (manual injection).
   *
   * Inserts an event into the world feed stream. Restricted to admin users.
   * This is useful for demos and manual curation until automated ingestion
   * (RSS/API polling) is enabled.
   */
  @UseGuards(AuthGuard)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createWorldFeedItem(
    @CurrentUser('role') role: string,
    @Body() body: CreateWorldFeedItemDto
  ) {
    return this.worldFeedService.createItem(role, body);
  }

  /**
   * Retrieve the current world feed items.
   *
   * Returns a reverse-chronological list of ingested world events from
   * all active sources. Supports query parameters: `page`, `limit`,
   * `source` (filter by source ID), and `since` (ISO timestamp).
   *
   * @returns Paginated list of world feed items
   */
  @Public()
  @Get()
  async getWorldFeed(@Query() query: ListWorldFeedQueryDto) {
    return this.worldFeedService.listWorldFeed(query);
  }

  /**
   * Add a new external source to the world feed.
   *
   * Accepts RSS feed URLs, REST API endpoints, or webhook configurations.
   * Restricted to admin users. The source begins ingesting immediately
   * after creation.
   *
   * @returns The newly created source record
   */
  @UseGuards(AuthGuard)
  @Post('sources')
  @HttpCode(HttpStatus.CREATED)
  async addSource(@CurrentUser('role') role: string, @Body() body: CreateWorldFeedSourceDto) {
    return this.worldFeedService.createSource(role, body);
  }

  /**
   * Remove an external source from the world feed.
   *
   * Stops ingestion from the specified source and removes it from the
   * configuration. Historical items already ingested are preserved.
   * Restricted to admin users.
   *
   * @param id - The unique source identifier
   * @returns Confirmation of the removal
   */
  @UseGuards(AuthGuard)
  @Delete('sources/:id')
  async removeSource(@CurrentUser('role') role: string, @Param('id') id: string) {
    return this.worldFeedService.removeSource(role, id);
  }

  /**
   * List all configured world feed sources.
   *
   * Returns metadata for each source including its type, URL, polling
   * interval, last successful fetch time, and error count.
   *
   * @returns List of configured sources with health status
   */
  @Public()
  @Get('sources')
  async listSources() {
    return this.worldFeedService.listSources();
  }
}
