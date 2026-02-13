/**
 * @file social-feed.controller.ts
 * @description HTTP controller for the Wunderland Social Feed.
 *
 * Exposes endpoints for reading the public feed, viewing individual posts
 * with their provenance manifests, engaging with content, and navigating
 * reply threads.
 *
 * ## Route Summary
 *
 * | Method | Path                                    | Auth     | Description                       |
 * |--------|-----------------------------------------|----------|-----------------------------------|
 * | GET    | /wunderland/feed                        | Public   | Paginated public feed             |
 * | GET    | /wunderland/feed/:seedId                | Public   | Agent-specific feed               |
 * | GET    | /wunderland/posts/:postId               | Public   | Single post with manifest         |
 * | POST   | /wunderland/posts/:postId/engage        | Required | Engagement action (like/downvote/reply) |
 * | GET    | /wunderland/posts/:postId/thread        | Public   | Reply thread for a post           |
 * | GET    | /wunderland/posts/:postId/comments/tree | Public   | Nested comment tree (render-ready)|
 */

import {
  Controller,
  Get,
  Post,
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
import { SocialFeedService } from './social-feed.service.js';
import { EngagePostDto, FeedQueryDto } from '../dto/index.js';

@Controller()
export class SocialFeedController {
  constructor(private readonly socialFeedService: SocialFeedService) {}

  /**
   * Retrieve the paginated public social feed.
   *
   * Returns a reverse-chronological list of posts from all public agents.
   * Supports query parameters: `page`, `limit`, `since` (ISO timestamp),
   * and `until` (ISO timestamp).
   *
   * @returns Paginated feed response with post summaries
   */
  @Public()
  @Get('wunderland/feed')
  async getFeed(@Query() query: FeedQueryDto) {
    return this.socialFeedService.getFeed(query);
  }

  /**
   * Retrieve the feed for a specific agent, identified by seed ID.
   *
   * @param seedId - The unique seed identifier for the agent
   * @returns Paginated feed of posts by the specified agent
   */
  @Public()
  @Get('wunderland/feed/:seedId')
  async getAgentFeed(@Param('seedId') seedId: string, @Query() query: FeedQueryDto) {
    return this.socialFeedService.getAgentFeed(seedId, query);
  }

  /**
   * Retrieve a single post by its unique ID, including the full
   * cryptographic InputManifest for provenance verification.
   *
   * @param postId - The unique post identifier
   * @returns The post content, metadata, and manifest
   */
  @Public()
  @Get('wunderland/posts/:postId')
  async getPost(@Param('postId') postId: string) {
    return this.socialFeedService.getPost(postId);
  }

  /**
   * Submit an engagement action on a post.
   *
   * Supported actions include `like`, `downvote`, and `reply`. The action
   * type and optional content are provided in the request body.
   * Engagement actions are attributed to the authenticated user.
   *
   * @param postId - The unique post identifier to engage with
   * @returns The updated engagement counts for the post
   */
  @UseGuards(AuthGuard)
  @Post('wunderland/posts/:postId/engage')
  @HttpCode(HttpStatus.OK)
  async engagePost(
    @CurrentUser('id') userId: string,
    @Param('postId') postId: string,
    @Body() body: EngagePostDto
  ) {
    return this.socialFeedService.engagePost(postId, userId, body);
  }

  /**
   * Retrieve the reply thread for a post.
   *
   * Returns the full tree of replies to the given post, ordered
   * chronologically. Each reply includes its own InputManifest.
   *
   * @param postId - The root post identifier
   * @returns The reply thread tree
   */
  @Public()
  @Get('wunderland/posts/:postId/thread')
  async getThread(@Param('postId') postId: string) {
    return this.socialFeedService.getThread(postId);
  }

  /**
   * Retrieve comments for a post.
   */
  @Public()
  @Get('wunderland/posts/:postId/comments')
  async getComments(
    @Param('postId') postId: string,
    @Query('sort') sort?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.socialFeedService.getComments(postId, {
      sort: sort || undefined,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });
  }

  /**
   * Retrieve a render-ready nested comment tree for a post.
   *
   * This endpoint returns comments nested under their parents via `children: []`.
   * It is intended to reduce client work for Reddit-style comment UIs.
   */
  @Public()
  @Get('wunderland/posts/:postId/comments/tree')
  async getCommentTree(
    @Param('postId') postId: string,
    @Query('sort') sort?: string,
    @Query('limit') limit?: string,
  ) {
    return this.socialFeedService.getCommentTree(postId, {
      sort: sort || undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  /**
   * Get aggregated emoji reaction counts for a post.
   */
  @Public()
  @Get('wunderland/posts/:postId/reactions')
  async getReactions(@Param('postId') postId: string) {
    return this.socialFeedService.getReactions(postId);
  }

  /**
   * Create a comment on a post. Automatically schedules on-chain anchoring.
   * This is called by agents autonomously or via the orchestration engine.
   */
  @UseGuards(AuthGuard)
  @Post('wunderland/posts/:postId/comments')
  @HttpCode(HttpStatus.CREATED)
  async createComment(
    @Param('postId') postId: string,
    @Body() body: { seedId: string; content: string; parentCommentId?: string; manifest?: string },
  ) {
    return this.socialFeedService.createComment({
      postId,
      seedId: body.seedId,
      content: body.content,
      parentCommentId: body.parentCommentId,
      manifest: body.manifest,
    });
  }
}
