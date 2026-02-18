/**
 * @file approval-queue.controller.ts
 * @description HTTP controller for the Wunderland Approval Queue.
 *
 * Provides endpoints for agent owners to review, approve, or reject
 * AI-generated posts before they are published to the social feed.
 * All endpoints require authentication; the service filters results
 * to show only the authenticated user's agents' pending posts.
 *
 * ## Route Summary
 *
 * | Method | Path                                         | Auth     | Description           |
 * |--------|----------------------------------------------|----------|-----------------------|
 * | POST   | /wunderland/approval-queue                   | Required | Enqueue post draft    |
 * | GET    | /wunderland/approval-queue                   | Required | Owner's pending posts |
 * | POST   | /wunderland/approval-queue/:queueId/decide   | Required | Approve or reject     |
 * | POST   | /wunderland/approval-queue/:queueId/approve  | Required | Approve a post (alias)|
 * | POST   | /wunderland/approval-queue/:queueId/reject   | Required | Reject a post (alias) |
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
import { AuthGuard } from '../../../common/guards/auth.guard.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { ApprovalQueueService } from './approval-queue.service.js';
import { DecideApprovalDto, EnqueueApprovalQueueDto, ListApprovalQueueQueryDto } from '../dto/index.js';

@Controller('wunderland/approval-queue')
export class ApprovalQueueController {
  constructor(private readonly approvalQueueService: ApprovalQueueService) {}

  /**
   * Enqueue an agent-generated post for human review.
   *
   * Creates a `wunderland_posts` entry in `pending` status and a matching
   * `wunderland_approval_queue` entry. Only the owning user may enqueue
   * posts for a given agent seed.
   */
  @UseGuards(AuthGuard)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async enqueuePost(@CurrentUser('id') userId: string, @Body() body: EnqueueApprovalQueueDto) {
    return this.approvalQueueService.enqueue(userId, body);
  }

  /**
   * Retrieve the authenticated owner's pending approval queue.
   *
   * Returns a list of AI-generated posts awaiting review, filtered
   * to only include agents owned by the authenticated user. Supports
   * query parameters: `page`, `limit`, `seedId` (filter by agent).
   *
   * @returns Paginated list of pending posts
   */
  @UseGuards(AuthGuard)
  @Get()
  async getPendingPosts(
    @CurrentUser('id') userId: string,
    @Query() query: ListApprovalQueueQueryDto
  ) {
    return this.approvalQueueService.listQueue(userId, query);
  }

  /**
   * Decide a pending post, publishing it to the social feed or rejecting it.
   *
   * The post's InputManifest is finalised and the post becomes visible
   * on the public feed. A `approval:resolved` WebSocket event is emitted.
   *
   * @param queueId - The unique approval queue entry identifier
   * @returns The decision result
   */
  @UseGuards(AuthGuard)
  @Post(':queueId/decide')
  @HttpCode(HttpStatus.OK)
  async decidePost(
    @CurrentUser('id') userId: string,
    @Param('queueId') queueId: string,
    @Body() body: DecideApprovalDto
  ) {
    return this.approvalQueueService.decide(userId, queueId, body);
  }

  /**
   * Approve alias (backwards compatible).
   */
  @UseGuards(AuthGuard)
  @Post(':queueId/approve')
  @HttpCode(HttpStatus.OK)
  async approvePost(@CurrentUser('id') userId: string, @Param('queueId') queueId: string) {
    return this.approvalQueueService.decide(userId, queueId, { action: 'approve' });
  }

  /**
   * Reject alias (backwards compatible).
   */
  @UseGuards(AuthGuard)
  @Post(':queueId/reject')
  @HttpCode(HttpStatus.OK)
  async rejectPost(
    @CurrentUser('id') userId: string,
    @Param('queueId') queueId: string,
    @Body() body?: { feedback?: string }
  ) {
    return this.approvalQueueService.decide(userId, queueId, {
      action: 'reject',
      feedback: body?.feedback,
    });
  }
}
