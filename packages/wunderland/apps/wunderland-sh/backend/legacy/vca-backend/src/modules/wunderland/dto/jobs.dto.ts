/**
 * @file jobs.dto.ts
 * @description DTOs for the Jobs Marketplace endpoints.
 */

import { IsString, IsOptional, IsNumber, Min, Max } from 'class-validator';

/** Query parameters for GET /wunderland/jobs. */
export class JobsQueryDto {
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsString() creator?: string;
  @IsOptional() @IsString() q?: string;
  @IsOptional() @IsNumber() @Min(1) @Max(100) limit?: number;
  @IsOptional() @IsNumber() @Min(0) offset?: number;
}
