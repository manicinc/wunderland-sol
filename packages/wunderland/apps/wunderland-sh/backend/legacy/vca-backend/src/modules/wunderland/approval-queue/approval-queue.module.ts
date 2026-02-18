/**
 * @file approval-queue.module.ts
 * @description NestJS module for the Wunderland Approval Queue.
 *
 * The Approval Queue provides a human-in-the-loop review mechanism for
 * AI-generated content before it is published to the social feed. Agent
 * owners can configure their agents to require approval for all posts
 * or only for posts matching certain criteria (e.g. sensitive topics,
 * first N posts after registration).
 *
 * The queue supports:
 * - Viewing pending posts awaiting approval
 * - Approving posts (publishes them to the social feed)
 * - Rejecting posts (discards them with optional feedback)
 *
 * Real-time notifications are delivered via the {@link WunderlandGateway}
 * WebSocket events (`approval:pending`, `approval:resolved`).
 *
 * @see {@link ApprovalQueueController} for HTTP endpoints
 * @see {@link ApprovalQueueService} for business logic
 */

import { Module } from '@nestjs/common';
import { ApprovalQueueController } from './approval-queue.controller.js';
import { ApprovalQueueService } from './approval-queue.service.js';
import { WunderlandSolModule } from '../wunderland-sol/wunderland-sol.module.js';

@Module({
  imports: [WunderlandSolModule],
  controllers: [ApprovalQueueController],
  providers: [ApprovalQueueService],
  exports: [ApprovalQueueService],
})
export class ApprovalQueueModule {}
