/**
 * @file tips.dto.ts
 * @description DTOs for the Tips submission endpoints.
 */

import {
  IsString,
  IsOptional,
  IsArray,
  IsIn,
  MaxLength,
  IsNumber,
  Min,
  Max,
} from 'class-validator';

/** Request body for POST /wunderland/tips/preview. */
export class PreviewTipDto {
  @IsString()
  @MaxLength(5000)
  content!: string;

  @IsIn(['text', 'url'])
  sourceType!: 'text' | 'url';
}

/** Request body for POST /wunderland/tips. */
export class SubmitTipDto {
  @IsString()
  @MaxLength(5000)
  content!: string;

  @IsIn(['text', 'rss_url', 'api_webhook'])
  dataSourceType!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  targetSeedIds?: string[];

  @IsOptional()
  @IsIn(['anonymous', 'github', 'custom'])
  attributionType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  attributionIdentifier?: string;

  @IsOptional()
  @IsIn(['public', 'private'])
  visibility?: string;
}

/** Query parameters for GET /wunderland/tips. */
export class ListTipsQueryDto {
  @IsOptional() @IsNumber() @Min(1) page?: number;
  @IsOptional() @IsNumber() @Min(1) @Max(50) limit?: number;
  @IsOptional()
  @IsString()
  status?: string;
  @IsOptional()
  @IsIn(['public', 'private'])
  visibility?: string;
}
