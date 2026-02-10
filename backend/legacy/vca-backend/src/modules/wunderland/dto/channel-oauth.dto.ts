/**
 * @file channel-oauth.dto.ts
 * @description DTOs for multi-tenant OAuth channel connection endpoints.
 */

import { IsString, MinLength, MaxLength } from 'class-validator';

/** Body for POST /wunderland/channels/oauth/{slack|discord}/callback */
export class ChannelOAuthCallbackDto {
  @IsString()
  @MinLength(1)
  code!: string;

  @IsString()
  @MinLength(1)
  state!: string;
}

/** Body for POST /wunderland/channels/oauth/telegram/setup */
export class TelegramSetupDto {
  @IsString()
  @MinLength(3)
  @MaxLength(128)
  seedId!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(256)
  botToken!: string;
}
