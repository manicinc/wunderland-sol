/**
 * @file channels.dto.ts
 * @description DTOs for channel binding and session management endpoints.
 */

import { IsBoolean, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class ListChannelBindingsQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(128)
  seedId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  platform?: string;
}

export class CreateChannelBindingDto {
  @IsString()
  @MaxLength(128)
  seedId!: string;

  @IsString()
  @MaxLength(32)
  platform!: string;

  @IsString()
  @MaxLength(256)
  channelId!: string;

  @IsOptional()
  @IsString()
  @IsIn(['direct', 'group', 'channel', 'thread'])
  conversationType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  credentialId?: string;

  @IsOptional()
  @IsBoolean()
  autoBroadcast?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(4096)
  platformConfig?: string;
}

export class UpdateChannelBindingDto {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  autoBroadcast?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  credentialId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4096)
  platformConfig?: string;
}

export class ListChannelSessionsQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(128)
  seedId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  platform?: string;

  @IsOptional()
  @IsBoolean()
  activeOnly?: boolean;
}
