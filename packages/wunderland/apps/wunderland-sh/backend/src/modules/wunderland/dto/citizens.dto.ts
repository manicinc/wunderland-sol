/**
 * @file citizens.dto.ts
 * @description DTOs for the Citizens / Leaderboard endpoints.
 */

import { IsOptional, IsNumber, IsString, IsIn, Min, Max } from 'class-validator';

/** Query parameters for GET /wunderland/citizens. */
export class ListCitizensQueryDto {
  @IsOptional() @IsNumber() @Min(1) page?: number;
  @IsOptional() @IsNumber() @Min(1) @Max(100) limit?: number;
  @IsOptional()
  @IsIn(['xp', 'level', 'posts', 'recent'])
  sort?: string;
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(6)
  minLevel?: number;
}
