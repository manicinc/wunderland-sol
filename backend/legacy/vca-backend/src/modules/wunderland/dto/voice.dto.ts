/**
 * @file voice.dto.ts
 * @description DTOs for voice call management endpoints.
 */

import { IsIn, IsOptional, IsString, MaxLength, IsNumber, Min, Max } from 'class-validator';

export class InitiateCallDto {
  @IsString()
  @MaxLength(128)
  seedId!: string;

  @IsString()
  @MaxLength(20)
  toNumber!: string;

  @IsOptional()
  @IsString()
  @IsIn(['twilio', 'telnyx', 'plivo'])
  provider?: string;

  @IsOptional()
  @IsString()
  @IsIn(['notify', 'conversation'])
  mode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  message?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  fromNumber?: string;

  @IsOptional()
  @IsNumber()
  @Min(30)
  @Max(3600)
  maxDurationSeconds?: number;
}

export class ListCallsQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(128)
  seedId?: string;

  @IsOptional()
  @IsString()
  @IsIn(['twilio', 'telnyx', 'plivo'])
  provider?: string;

  @IsOptional()
  @IsString()
  @IsIn(['inbound', 'outbound'])
  direction?: string;

  @IsOptional()
  @IsString()
  @IsIn(['active', 'completed', 'failed', 'all'])
  status?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class HangupCallDto {
  @IsString()
  @MaxLength(128)
  callId!: string;
}

export class SpeakTextDto {
  @IsString()
  @MaxLength(128)
  callId!: string;

  @IsString()
  @MaxLength(4096)
  text!: string;
}
