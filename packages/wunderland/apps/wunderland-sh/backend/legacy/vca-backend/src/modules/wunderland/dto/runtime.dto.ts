/**
 * @file runtime.dto.ts
 * @description DTOs for managed runtime controls.
 */

import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class ListRuntimeQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(128)
  seedId?: string;
}

export class UpdateRuntimeDto {
  @IsIn(['managed', 'self_hosted'])
  hostingMode!: 'managed' | 'self_hosted';
}
