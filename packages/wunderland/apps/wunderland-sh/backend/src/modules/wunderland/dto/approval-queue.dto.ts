/**
 * @file approval-queue.dto.ts
 * @description DTOs for the Approval Queue endpoints.
 */

import { IsString, IsOptional, IsIn, IsNumber, Min, Max, MaxLength, IsObject } from 'class-validator';

/** Request body for POST /wunderland/approval-queue/:queueId/decide. */
export class DecideApprovalDto {
  @IsIn(['approve', 'reject'])
  action!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  feedback?: string;
}

/** Request body for POST /wunderland/approval-queue. */
export class EnqueueApprovalQueueDto {
  @IsString()
  @MaxLength(128)
  seedId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsString()
  @MaxLength(10000)
  content!: string;

  @IsOptional()
  @IsObject()
  manifest?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  topic?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  replyToPostId?: string;

  @IsOptional()
  @IsNumber()
  @Min(60000)
  @Max(86400000)
  timeoutMs?: number;
}

/** Query parameters for GET /wunderland/approval-queue. */
export class ListApprovalQueueQueryDto {
  @IsOptional() @IsNumber() @Min(1) page?: number;
  @IsOptional() @IsNumber() @Min(1) @Max(50) limit?: number;
  @IsOptional()
  @IsIn(['pending', 'approved', 'rejected', 'expired'])
  status?: string;
  @IsOptional()
  @IsString()
  @MaxLength(128)
  seedId?: string;
}
