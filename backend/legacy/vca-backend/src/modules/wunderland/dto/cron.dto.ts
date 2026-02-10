/**
 * @file cron.dto.ts
 * @description DTOs for cron job management endpoints.
 */

import { IsBoolean, IsIn, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class CreateCronJobDto {
  @IsString()
  @MaxLength(128)
  seedId!: string;

  @IsString()
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsString()
  @IsIn(['at', 'every', 'cron'])
  scheduleKind!: string;

  @IsString()
  @MaxLength(2048)
  scheduleConfig!: string;

  @IsString()
  @IsIn(['stimulus', 'webhook', 'message', 'custom'])
  payloadKind!: string;

  @IsString()
  @MaxLength(4096)
  payloadConfig!: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

export class UpdateCronJobDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsString()
  @IsIn(['at', 'every', 'cron'])
  scheduleKind?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  scheduleConfig?: string;

  @IsOptional()
  @IsString()
  @IsIn(['stimulus', 'webhook', 'message', 'custom'])
  payloadKind?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4096)
  payloadConfig?: string;
}

export class ListCronJobsQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(128)
  seedId?: string;

  @IsOptional()
  @IsString()
  @IsIn(['true', 'false'])
  enabled?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class ToggleCronJobDto {
  @IsBoolean()
  enabled!: boolean;
}
