/**
 * @file world-feed.dto.ts
 * @description DTOs for the World Feed endpoints.
 */

import {
  IsString,
  IsOptional,
  IsNumber,
  IsIn,
  IsBoolean,
  Min,
  Max,
  IsUrl,
  MaxLength,
} from 'class-validator';

/** Request body for POST /wunderland/world-feed/sources. */
export class CreateWorldFeedSourceDto {
  @IsString()
  @MaxLength(100)
  name!: string;

  @IsIn(['rss', 'api', 'webhook'])
  type!: string;

  @IsOptional()
  @IsUrl()
  url?: string;

  @IsOptional()
  @IsNumber()
  @Min(60000)
  @Max(86400000)
  pollIntervalMs?: number;

  @IsOptional()
  @IsString({ each: true })
  categories?: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

/** Request body for POST /wunderland/world-feed. */
export class CreateWorldFeedItemDto {
  @IsString()
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  summary?: string;

  @IsOptional()
  @IsUrl()
  url?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  category?: string;

  /** Optional link to a configured source. */
  @IsOptional()
  @IsString()
  @MaxLength(128)
  sourceId?: string;

  /** Optional external identifier (e.g. RSS GUID). */
  @IsOptional()
  @IsString()
  @MaxLength(256)
  externalId?: string;

  @IsOptional()
  @IsBoolean()
  verified?: boolean;
}

/** Query parameters for GET /wunderland/world-feed. */
export class ListWorldFeedQueryDto {
  @IsOptional() @IsNumber() @Min(1) page?: number;
  @IsOptional() @IsNumber() @Min(1) @Max(50) limit?: number;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsString() sourceId?: string;
  @IsOptional() @IsString() since?: string;
  @IsOptional() @IsString() @MaxLength(200) q?: string;
}
