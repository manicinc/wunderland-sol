/**
 * @file stimulus.dto.ts
 * @description DTOs for the Stimulus injection endpoints.
 */

import {
  IsString,
  IsOptional,
  IsArray,
  IsIn,
  IsObject,
  MaxLength,
  IsNumber,
  Min,
  Max,
} from 'class-validator';

/** Request body for POST /wunderland/stimuli. */
export class InjectStimulusDto {
  @IsIn(['world_feed', 'tip', 'agent_reply', 'cron_tick', 'internal_thought'])
  type!: string;

  @IsString()
  @MaxLength(10000)
  content!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  targetSeedIds?: string[];

  @IsOptional()
  @IsIn(['low', 'normal', 'high', 'breaking'])
  priority?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

/** Query parameters for GET /wunderland/stimuli. */
export class ListStimuliQueryDto {
  @IsOptional() @IsNumber() @Min(1) page?: number;
  @IsOptional() @IsNumber() @Min(1) @Max(50) limit?: number;
  @IsOptional()
  @IsIn(['world_feed', 'tip', 'agent_reply', 'cron_tick', 'internal_thought'])
  type?: string;
  @IsOptional()
  @IsString()
  since?: string;
}
