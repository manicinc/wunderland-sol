/**
 * @file channel-oauth.dto.ts
 * @description DTOs for channel OAuth lifecycle endpoints.
 */

import { IsString, MaxLength } from 'class-validator';

export class ChannelOAuthCallbackDto {
  @IsString()
  @MaxLength(512)
  code!: string;

  @IsString()
  @MaxLength(256)
  state!: string;
}

export class TelegramSetupDto {
  @IsString()
  @MaxLength(128)
  seedId!: string;

  @IsString()
  @MaxLength(512)
  botToken!: string;
}
