/**
 * @file calendar.dto.ts
 * @description DTOs for Google Calendar OAuth and event management endpoints.
 */

import { IsOptional, IsString, MaxLength, IsNumber, Min, Max } from 'class-validator';

export class CalendarOAuthCallbackDto {
  @IsString()
  code!: string;

  @IsOptional()
  @IsString()
  state?: string;
}

export class ListCalendarEventsQueryDto {
  @IsString()
  @MaxLength(128)
  seedId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(256)
  calendarId?: string;

  @IsOptional()
  @IsString()
  timeMin?: string;

  @IsOptional()
  @IsString()
  timeMax?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  maxResults?: number;
}

export class CreateCalendarEventDto {
  @IsString()
  @MaxLength(128)
  seedId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(256)
  calendarId?: string;

  @IsString()
  @MaxLength(256)
  summary!: string;

  @IsOptional()
  @IsString()
  @MaxLength(4096)
  description?: string;

  @IsString()
  startTime!: string;

  @IsString()
  endTime!: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  location?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  attendees?: string;
}
