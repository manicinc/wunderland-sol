/**
 * @file agent-registry.dto.ts
 * @description DTOs for the Agent Registry endpoints with class-validator decorations.
 */

import {
  IsString,
  IsOptional,
  IsObject,
  IsArray,
  MinLength,
  MaxLength,
  IsBoolean,
  IsNumber,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

/** HEXACO personality trait values (0.0 to 1.0). */
export class HEXACOTraitsDto {
  @IsNumber() @Min(0) @Max(1) honesty!: number;
  @IsNumber() @Min(0) @Max(1) emotionality!: number;
  @IsNumber() @Min(0) @Max(1) extraversion!: number;
  @IsNumber() @Min(0) @Max(1) agreeableness!: number;
  @IsNumber() @Min(0) @Max(1) conscientiousness!: number;
  @IsNumber() @Min(0) @Max(1) openness!: number;
}

/** Security pipeline configuration. */
export class SecurityConfigDto {
  @IsBoolean() preLlmClassifier!: boolean;
  @IsBoolean() dualLlmAuditor!: boolean;
  @IsBoolean() outputSigning!: boolean;
  @IsOptional() @IsString() storagePolicy?: string;
}

/** Request body for POST /wunderland/agents. */
export class RegisterAgentDto {
  @IsString()
  @MinLength(3)
  @MaxLength(64)
  seedId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  displayName!: string;

  @IsString()
  @MaxLength(500)
  bio!: string;

  @IsString()
  @MinLength(10)
  systemPrompt!: string;

  @ValidateNested()
  @Type(() => HEXACOTraitsDto)
  personality!: HEXACOTraitsDto;

  @ValidateNested()
  @Type(() => SecurityConfigDto)
  security!: SecurityConfigDto;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  capabilities?: string[];

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  toolAccessProfile?: string; // 'social-citizen' | 'social-observer' | 'social-creative' | 'assistant' | 'unrestricted'
}

/** Request body for PATCH /wunderland/agents/:seedId. */
export class UpdateAgentDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  displayName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;

  @IsOptional()
  @IsString()
  @MinLength(10)
  systemPrompt?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => HEXACOTraitsDto)
  personality?: HEXACOTraitsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => SecurityConfigDto)
  security?: SecurityConfigDto;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  capabilities?: string[];

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  toolAccessProfile?: string; // 'social-citizen' | 'social-observer' | 'social-creative' | 'assistant' | 'unrestricted'

  @IsOptional()
  @IsString()
  @MaxLength(500)
  avatarUrl?: string;

  @IsOptional()
  @IsObject()
  inferenceHierarchy?: {
    routerModel?: { providerId: string; modelId: string; maxTokens?: number; temperature?: number };
    primaryModel?: { providerId: string; modelId: string; maxTokens?: number; temperature?: number };
    auditorModel?: { providerId: string; modelId: string; maxTokens?: number; temperature?: number };
  };
}

/** Query parameters for GET /wunderland/agents. */
export class ListAgentsQueryDto {
  @IsOptional() @IsNumber() @Min(1) page?: number;
  @IsOptional() @IsNumber() @Min(1) @Max(100) limit?: number;
  @IsOptional() @IsString() capability?: string;
  @IsOptional() @IsString() status?: string;
}
