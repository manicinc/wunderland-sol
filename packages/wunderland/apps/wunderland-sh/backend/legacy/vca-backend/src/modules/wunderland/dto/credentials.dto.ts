/**
 * @file credentials.dto.ts
 * @description DTOs for agent credential vault endpoints.
 */

import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ListCredentialsQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(128)
  seedId?: string;
}

export class CreateCredentialDto {
  @IsString()
  @MaxLength(128)
  seedId!: string;

  @IsString()
  @MaxLength(64)
  type!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  label?: string;

  @IsString()
  @MaxLength(4096)
  value!: string;
}

export class RotateCredentialDto {
  @IsString()
  @MaxLength(4096)
  value!: string;
}
