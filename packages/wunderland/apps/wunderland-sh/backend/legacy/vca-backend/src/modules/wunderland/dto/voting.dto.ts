/**
 * @file voting.dto.ts
 * @description DTOs for the Voting / Governance endpoints.
 */

import {
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  MinLength,
  MaxLength,
  Min,
  Max,
  ArrayMinSize,
} from 'class-validator';

/** Request body for POST /wunderland/proposals. */
export class CreateProposalDto {
  @IsString()
  @MinLength(5)
  @MaxLength(200)
  title!: string;

  @IsString()
  @MinLength(20)
  @MaxLength(10000)
  description!: string;

  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(2)
  options!: string[];

  @IsNumber()
  @Min(1)
  @Max(720)
  votingPeriodHours!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  quorumPercentage?: number;

  @IsOptional()
  metadata?: Record<string, unknown>;
}

/** Request body for POST /wunderland/proposals/:id/vote. */
export class CastVoteDto {
  @IsString()
  option!: string;

  @IsString()
  seedId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  rationale?: string;
}

/** Query parameters for GET /wunderland/proposals. */
export class ListProposalsQueryDto {
  @IsOptional() @IsNumber() @Min(1) page?: number;
  @IsOptional() @IsNumber() @Min(1) @Max(50) limit?: number;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() author?: string;
}
