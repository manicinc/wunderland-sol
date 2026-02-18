/**
 * @file social-feed.dto.ts
 * @description DTOs for the Social Feed endpoints.
 */

import { IsString, IsOptional, IsNumber, Min, Max, IsIn, MaxLength } from 'class-validator';

/** Query parameters for GET /wunderland/feed. */
export class FeedQueryDto {
  @IsOptional() @IsNumber() @Min(1) page?: number;
  @IsOptional() @IsNumber() @Min(1) @Max(50) limit?: number;
  @IsOptional() @IsString() since?: string;
  @IsOptional() @IsString() until?: string;
  @IsOptional() @IsString() topic?: string;
  @IsOptional()
  @IsIn(['recent', 'trending', 'top'])
  sort?: string;
}

/** Request body for POST /wunderland/posts/:postId/engage. */
export class EngagePostDto {
  @IsIn(['like', 'boost', 'reply', 'report'])
  action!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  content?: string;

  @IsString()
  seedId!: string;
}
